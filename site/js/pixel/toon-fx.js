// Cel-shaded battle effects on the GPU: fire, smoke and void shadow
// (Isaac 2026-10-21: the canvas-drawn fire and hands looked amateur; his
// references are anime game VFX with hard colour bands and living edges).
//
// How it works, in two steps every frame:
//   1. Abilities "paint" soft amounts into a small field canvas, one channel each:
//        red = heat (fire), green = smoke, blue = void (NOVA's shadow).
//      Overlapping puffs add up, so many round puffs melt into one billowing shape.
//   2. A shader reads the field and turns each amount into flat colour bands
//      (white-hot core, yellow, orange, red; dark smoke with a glowing rim;
//      black shadow with a purple rim). Scrolling noise bends the edges and the
//      band lines, so fire licks upward, smoke boils, and shadow edges crawl.
//      As an amount fades, the noise eats holes in it: that is the dissolve.
// It is drawn at the battle's pixel density with crisp pixels, so it sits with
// GOLEM, NOVA and the arena, and runs on battle time (hit-stop freezes it).
import { battleTime } from "../battle-time.js";

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uF; uniform vec2 uRes; uniform float uT, uS, uQ; uniform int uPal;   // uPal 0 fire, 1 water, 2 blood (Kaela)
out vec4 o;
const float B4[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
float bayer(vec2 p){ ivec2 q = ivec2(p); return (B4[(q.y&3)*4+(q.x&3)]+.5)/16.; }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ return .55*vn(p) + .3*vn(p*2.03+7.1) + .15*vn(p*4.07+3.3); }
vec3 F(vec2 p){ return texture(uF, p/uRes).rgb; }
vec3 hex(float r, float g, float b){ return vec3(r,g,b)/255.; }
void main(){
  vec2 p = uQ > 1. ? (floor(gl_FragCoord.xy / uQ) + .5) * uQ : gl_FragCoord.xy;   // uQ > 1: chunkier pixels, for harder pixel-art edges
  vec2 q = p / uS;                       // stage px, so the look doesn't change with the art size
  float t = floor(uT*15.)/15.;           // the noise moves on fifteens, a hand-drawn snap
  float d = bayer(p);
  vec4 col = vec4(0.);

  // ---- fire ----
  vec2 wf = vec2(fbm(q*.045+vec2(0.,-t*2.4)), fbm(q*.045+vec2(5.2,-t*2.4))) - .5;
  float heat = F(p + wf*vec2(9.,13.)*uS).r;
  float hn = heat + (vn(q*.09+vec2(0.,-t*3.2))-.5)*.2*smoothstep(0.,.35,heat)*(1.-.6*smoothstep(.6,1.,heat));
  float gw = 0.;                          // wide heat, for the glow and smoke rims
  for (int i = 0; i < 8; i++){ float a = float(i)*.785; gw += F(p + vec2(cos(a),sin(a))*10.*uS).r; }
  gw = gw/8.;
  if (hn > .2) {
    if (uPal == 1) col = vec4(hn > .97 ? hex(255.,255.,255.) : hn > .8 ? hex(214.,246.,255.) : hn > .55 ? hex(132.,214.,255.)
             : hn > .36 ? hex(58.,156.,238.) : hn > .27 ? hex(34.,92.,196.) : hex(20.,50.,128.), 1.);
    else if (uPal == 2) col = vec4(hn > .97 ? hex(255.,244.,240.) : hn > .8 ? hex(255.,176.,160.) : hn > .55 ? hex(255.,104.,88.)
             : hn > .36 ? hex(224.,52.,48.) : hn > .27 ? hex(168.,24.,36.) : hex(96.,10.,22.), 1.);
    else col = vec4(hn > .97 ? hex(255.,252.,236.) : hn > .8 ? hex(255.,236.,150.) : hn > .55 ? hex(255.,196.,58.)
             : hn > .36 ? hex(255.,128.,28.) : hn > .27 ? hex(236.,64.,26.) : hex(160.,26.,20.), 1.);
  } else if (gw > .05 && min(.55, gw*2.2) > d) col = vec4(uPal == 1 ? hex(18.,48.,116.) : uPal == 2 ? hex(90.,8.,20.) : hex(120.,26.,14.), 1.);   // dithered glow

  // ---- smoke (over the fire) ----
  vec2 ws = vec2(fbm(q*.03+vec2(t*.3,-t*.9)), fbm(q*.03+vec2(3.1,-t*.9))) - .5;
  float s = F(p + ws*12.*uS).g;
  float sn = s + (vn(q*.075+vec2(0.,-t*1.1))-.5)*.32*smoothstep(0.,.45,s);
  if (sn > .34) {
    float lit = max(gw, heat*.8);
    if (uPal == 1) lit = 0.;   // water: no glowing rims
    vec3 c = sn > .8 ? hex(26.,13.,16.) : sn > .53 ? hex(44.,24.,26.)
           : sn > .43 ? (lit > .14 ? hex(172.,46.,22.) : hex(60.,32.,32.))
           : lit > .2 ? hex(255.,140.,40.) : lit > .08 ? hex(204.,72.,26.) : hex(78.,44.,44.);
    col = vec4(c, 1.);
  }

  // ---- void shadow (NOVA) ----
  vec2 wv = vec2(fbm(q*.05+vec2(0.,-t*1.3)), fbm(q*.05+vec2(9.,-t*1.3))) - .5;
  vec2 pv = p + wv*3.*uS;
  float v = F(pv).b;
  float vv = v + (vn(q*.13+vec2(0.,-t*2.))-.5)*.14;
  if (vv > .5) {
    float vw = 0.;                        // how deep inside the shape we are, for a rim of light
    for (int i = 0; i < 8; i++){ float a = float(i)*.785; vw += F(pv + vec2(cos(a),sin(a))*2.6*uS).b; }
    vw = vw/8.;
    vec3 c = hex(8.,4.,14.);
    float vein = abs(fbm(q*.07+vec2(0.,-t*.6))-.5);
    if (vein < .012) c = hex(34.,14.,62.);              // faint veins crawling inside
    if (vw < .66) c = hex(122.,62.,224.);
    if (vv < .57 || vw < .5) c = hex(214.,180.,255.);   // the bright edge
    col = vec4(c, 1.);
  } else if (vv > .17 && (vv-.17)/.33*.75 > d) {
    col = vec4(vv > .36 ? hex(96.,44.,176.) : hex(58.,24.,112.), 1.);   // dithered haze and wisps
  }
  o = vec4(col.rgb*col.a, col.a);
}`;


// Compile the shader and set up a full-screen triangle on canvas c, storing
// the handles on o (o.gl, o.prog, o.tex, o.u).
function setupGL(o, c, opts) {
  const gl = o.gl = c.getContext("webgl2", { premultipliedAlpha: true, antialias: false, ...opts });
  if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const pr = o.prog = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    o.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, o.tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    o.u = Object.fromEntries(["uF", "uRes", "uT", "uS", "uQ", "uPal"].map((n) => [n, gl.getUniformLocation(pr, n)]));
    return true;

}

// Draw the field (already painted on the 2D canvas `field`) through the shader.
function renderField(o, field, w, h, time, s, pal) {
  const gl = o.gl;
  gl.viewport(0, 0, w, h);
  gl.useProgram(o.prog);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);
  gl.uniform1i(o.u.uF, 0); gl.uniform2f(o.u.uRes, w, h); gl.uniform1f(o.u.uT, time); gl.uniform1f(o.u.uS, s); gl.uniform1f(o.u.uQ, o.chunk || 1); gl.uniform1i(o.u.uPal, pal);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// A still picture painted with the same pen and shader (the ability cards'
// art). draw(pen, w, h) paints in art pixels; scale shrinks the noise and edge
// wobble to suit a small picture. Returns a 2D canvas.
let still = null;
export function toonStill(w, h, draw, { scale = 0.45, time = 1.3, palette = "fire" } = {}) {
  if (!still) {
    still = { canvas: document.createElement("canvas"), field: document.createElement("canvas") };
    still.f = still.field.getContext("2d");
    still.pen = new Pen(still.f);
    still.ok = setupGL(still, still.canvas, { preserveDrawingBuffer: true });
  }
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  if (!still.ok) return out;
  still.canvas.width = still.field.width = w; still.canvas.height = still.field.height = h;
  const f = still.f;
  f.globalCompositeOperation = "source-over"; f.setTransform(1, 0, 0, 1, 0, 0);
  f.fillStyle = "#000"; f.fillRect(0, 0, w, h);
  f.globalCompositeOperation = "lighter";
  f.save(); draw(still.pen, w, h); f.restore();
  renderField(still, still.field, w, h, time, scale, { water: 1, blood: 2 }[palette] || 0);
  out.getContext("2d").drawImage(still.canvas, 0, 0);
  return out;
}

const CH = { heat: "255,0,0", smoke: "0,255,0", void: "0,0,255" };

export class ToonFX {
  constructor(world, { z = 7, before = null, palette = "fire" } = {}) {
    this.world = world;
    this.pal = { water: 1, blood: 2 }[palette] || 0;
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none", zIndex: z });
    if (before) world.insertBefore(this.canvas, before); else world.append(this.canvas);
    this.field = document.createElement("canvas");
    this.f = this.field.getContext("2d");
    this.pen = new Pen(this.f);
    this.actors = [];
    this.time = 0;
    this.last = performance.now();
    this.ok = this.initGL();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initGL() { return setupGL(this, this.canvas, {}); }

  get w() { return this.world.clientWidth; }
  get w() { return this.world.clientWidth; }
  get h() { return this.world.clientHeight; }

  // Same shape as PixelFX: draw(pen, k, t, a) every frame, in stage pixels.
  add(actor) {
    return new Promise((done) => {
      actor.t = 0; actor.done = done;
      this.actors.push(actor);
    });
  }
  wait(ms) { return this.add({ dur: ms, draw() {} }); }

  loop(now) {
    if (!this.world.isConnected) return;
    requestAnimationFrame(this.loop);
    const real = Math.min(50, now - this.last);
    this.last = now;
    const d = battleTime.step(now, real);
    this.time += d;
    const W = this.w, H = this.h, gl = this.gl;
    if (!W || !H || !this.ok) return;
    const HA = Math.min(440, Math.round(H)), wa = Math.max(64, Math.round((W / H) * HA));
    if (this.canvas.width !== wa || this.canvas.height !== HA) { this.canvas.width = this.field.width = wa; this.canvas.height = this.field.height = HA; }
    if (!this.actors.length) {
      if (this.dirty) { gl.viewport(0, 0, wa, HA); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); this.dirty = false; }
      return;
    }
    this.acc = (this.acc || 0) + real;
    for (const a of this.actors) a.t += d;
    if (this.acc < 30 && !this.actors.some((a) => a.t >= a.dur)) return;
    this.acc = 0;
    const f = this.f, s = HA / H;
    f.globalCompositeOperation = "source-over"; f.setTransform(1, 0, 0, 1, 0, 0);
    f.fillStyle = "#000"; f.fillRect(0, 0, wa, HA);
    f.globalCompositeOperation = "lighter";
    this.actors = this.actors.filter((a) => {
      const k = Math.min(1, a.t / a.dur);
      f.save(); f.setTransform(s, 0, 0, s, 0, 0);
      a.draw(this.pen, k, a.t, a);
      f.restore();
      if (k >= 1) { a.done(); return false; }
      return true;
    });
    renderField(this, this.field, wa, HA, this.time / 1000, s, this.pal);
    this.dirty = true;
  }
}

// What abilities paint with. Amounts are 0..1 and add up where shapes overlap.
//   heat: about .2 is the faint red edge, .5 orange, .75 yellow, .95 white-hot
//   smoke: above about .35 shows, the edge glows when there is heat nearby
//   void: above .5 is solid shadow with a purple rim, .2 to .5 is a dithered haze
class Pen {
  constructor(g) { this.g = g; }
  rgba(ch, a) { return `rgba(${CH[ch]},${Math.max(0, Math.min(1, a))})`; }
  // A soft round puff. hollow 0..1 empties the middle (smoke breaking into rings).
  puff(ch, x, y, r, amt = 1, hollow = 0) {
    if (r <= 0.3 || amt <= 0.01) return;
    const g = this.g, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, this.rgba(ch, amt * (1 - hollow)));
    gr.addColorStop(0.45, this.rgba(ch, amt * (hollow ? 1 : 0.86)));
    gr.addColorStop(0.75, this.rgba(ch, amt * 0.5));
    gr.addColorStop(1, this.rgba(ch, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // A squashed puff (pools on the floor, a ring seen from the side).
  oval(ch, x, y, rx, ry, amt = 1, hollow = 0) {
    const g = this.g; g.save(); g.translate(x, y); g.scale(1, ry / rx); this.puff(ch, 0, 0, rx, amt, hollow); g.restore();
  }
  // A flat, solid fill of any path (build it in fn(g)).
  fill(ch, amt, fn) { const g = this.g; g.fillStyle = this.rgba(ch, amt); g.beginPath(); fn(g); g.fill(); }
  // A round-capped line through points with a fixed width.
  line(ch, pts, w, amt = 1) {
    const g = this.g; g.strokeStyle = this.rgba(ch, amt); g.lineWidth = w; g.lineCap = g.lineJoin = "round";
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  // A tapering limb: round-capped pieces getting thinner from w0 to w1.
  limb(ch, pts, w0, w1, amt = 1) {
    const g = this.g; g.strokeStyle = this.rgba(ch, amt); g.lineCap = "round";
    for (let i = 1; i < pts.length; i++) {
      g.lineWidth = w0 + (w1 - w0) * (i / (pts.length - 1));
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
  }
  // A flame tongue standing up from (x, y): w wide, h tall, leaning and hooking at the tip.
  flame(x, y, w, h, amt = 1, lean = 0, hook = 0) {
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      this.puff("heat", x + lean * h * u + hook * h * u ** 3, y - h * u, w * (1 - u * 0.78), amt * (1 - u * 0.3));
    }
  }
}

// ---------------------------------------------------------------- explosion ----
// The shared cel explosion (Isaac's explosion reference video), for every
// fighter: a star-flash, then billowing puffs with a white-hot middle, dark
// smoke spots blooming inside them, the fire sinking to glowing rims under the
// smoke, and the smoke breaking into rings and strands as it fades.
// kind "fire" (orange) or "void" (black and purple). size 1 is about 120 px across.
export function explode(toon, x, y, { size = 1, kind = "fire", dur = 1500, up = 1, star = true } = {}) {
  const R = 60 * size, n = 11;
  const puffs = Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996 + Math.random() * 0.5, d = i === 0 ? 0 : 0.3 + Math.random() * 0.6;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.85 - 0.1, r: 0.38 + Math.random() * 0.26, delay: i * 0.008 };
  });
  const spots = puffs.map((p, i) => ({ dx: p.dx * 1.05 + (Math.random() - 0.5) * 0.3, dy: p.dy - 0.15, r: p.r * (0.45 + Math.random() * 0.3), delay: 0.1 + i * 0.012 }));
  const embers = Array.from({ length: 9 }, (_, i) => ({ a: -Math.PI / 2 + (i / 8 - 0.5) * 3.4 + Math.random() * 0.3, v: 2.2 + Math.random() * 1.6, r: 2.5 + Math.random() * 2 }));
  const ch = kind === "void" ? "void" : "heat";
  return toon.add({ dur, draw(pen, k) {
    const ms = k * dur, rise = (ms / 1000) * R * 0.55 * up;
    // the star-flash at the very start
    if (star && ms < 90) {
      const f = ms < 30 ? ms / 30 : 1 - (ms - 30) / 60, r = R * 1.5 * f;
      pen.fill(ch, 1, (g) => { for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.22 : r * (i % 4 ? 0.7 : 1); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); });
    }
    // the fireball: puffs swell out fast, the heat sinking from white to red
    for (const p of puffs) {
      const u = Math.max(0, k - p.delay), grow = 1 - (1 - Math.min(1, u / 0.16)) ** 3;
      if (grow <= 0) continue;
      const px = x + p.dx * R * grow, py = y + p.dy * R * grow - rise * 0.6 + R * 0.08, r = p.r * R * (0.55 + 0.45 * grow) * (1 + u * 0.35);
      if (kind === "void") {   // shadow: puffs that hollow out into rings and strands, with a haze round them
        pen.puff("void", px, py, r * (1 - u * 0.3), Math.max(0, 1.3 - u * 2.4), Math.min(0.9, Math.max(0, (u - 0.08) / 0.3)));
        pen.puff("void", px, py, r * 1.5, 0.32 * (1 - u));
      } else pen.puff(ch, px, py, r, Math.max(0, 1.02 - u * 1.4));
    }
    if (kind === "void") return;
    // smoke spots bloom inside it, grow over it, then break into rings and fade
    for (const p of spots) {
      const u = Math.max(0, k - p.delay), grow = Math.min(1, u / 0.35);
      if (grow <= 0) continue;
      const amt = Math.min(1, u / 0.06) * (1 - Math.max(0, (u - 0.3) / 0.5));
      const hollow = Math.min(0.95, Math.max(0, (u - 0.22) / 0.4));
      pen.puff("smoke", x + p.dx * R * (0.9 + u * 0.5), y + p.dy * R * (0.9 + u * 0.4) - rise, p.r * R * (0.5 + 0.75 * grow), amt, hollow);
    }
    // chunks of fire flung out, falling
    for (const e of embers) {
      if (ms > 900) break;
      const tt = ms / 1000, ex = x + Math.cos(e.a) * e.v * R * tt * 1.6, ey = y + Math.sin(e.a) * e.v * R * tt * 1.6 + 260 * tt * tt;
      pen.puff("heat", ex, ey, e.r * size * 2.2, 1 - ms / 900);
    }
  } });
}
