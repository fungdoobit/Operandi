// Hi-bit pixel renderer. A character is a 3D shape written as a distance
// function (GLSL). We draw it in two passes at a small internal size:
//   1. "model" pass: march rays into the shape and work out, per pixel, how lit
//      it is, which material it is and how far away it is.
//   2. "pixel" pass: turn that into pixel art: a fixed colour ramp per
//      material, ordered (Bayer) dithering, outlines and inner lines.
// The canvas is then scaled up with crisp (nearest-neighbour) pixels, so each
// art pixel is only 2 or so screen pixels: dense, not chunky.

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

// Shared helpers every model shader gets in front of its own code.
export const SDF_LIB = `
mat2 R(float a){ float c=cos(a), s=sin(a); return mat2(c,s,-s,c); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b-r) - r; }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
float sdCapT(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-mix(ra,rb,h); }
float sdCylY(vec3 p, float r, float h){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.)+length(max(d,0.)); }
float sdOct(vec3 p, float s){ p=abs(p); return (p.x+p.y+p.z-s)*0.57735; }
float sdTorZ(vec3 p, float r, float t){ vec2 q=vec2(length(p.xy)-r, p.z); return length(q)-t; }
float smin(float a, float b, float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float hash1(float n){ return fract(sin(n)*43758.5453); }
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); float n=i.x+i.y*57.+i.z*113.;
  return mix(mix(mix(hash1(n),hash1(n+1.),f.x), mix(hash1(n+57.),hash1(n+58.),f.x), f.y),
             mix(mix(hash1(n+113.),hash1(n+114.),f.x), mix(hash1(n+170.),hash1(n+171.),f.x), f.y), f.z); }
// 2D trapezoid (bottom half-width r1, top half-width r2, half-height he), then extruded along z.
float sdTrap(vec2 p, float r1, float r2, float he){
  vec2 k1=vec2(r2,he), k2=vec2(r2-r1,2.*he); p.x=abs(p.x);
  vec2 ca=vec2(p.x-min(p.x,(p.y<0.)?r1:r2), abs(p.y)-he);
  vec2 cb=p-k1+k2*clamp(dot(k1-p,k2)/dot(k2,k2),0.,1.);
  float s=(cb.x<0. && ca.y<0.) ? -1. : 1.;
  return s*sqrt(min(dot(ca,ca),dot(cb,cb))); }
float extrude(float d2, float z, float h){ vec2 w=vec2(d2, abs(z)-h); return min(max(w.x,w.y),0.)+length(max(w,0.)); }
`;

// Pass 2, shared by every character. Model output per pixel:
// r = shade 0..1 (crystal glow where empty), g = material/16, b = depth 0..1, a = core glow 0..1.
const PIXEL = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform vec3 uPal[64]; uniform vec3 uGlowCol[6];
uniform float uFlash, uBlock, uGlitch, uTime, uShadow, uShadowX, uFlat;   // uFlat: the flat 2D style (Addendum M)
uniform vec4 uPlume; // thruster exhaust: x, y (0..1 of canvas), half-width, strength
out vec4 o;
const float B4[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
float bayer(ivec2 p){ return (B4[(p.y&3)*4+(p.x&3)]+.5)/16.; }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
vec4 at(ivec2 p){ return texelFetch(uTex, clamp(p, ivec2(0), ivec2(uRes)-1), 0); }
int matOf(vec4 t){ return int(t.g*16.+.5) & 15; }   // up to 8 materials (NOVA uses 8)
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  // Transition: snap to big blocks while uBlock > 1.
  if (uBlock > 1.) p = ivec2((floor(gl_FragCoord.xy/uBlock)+.5)*uBlock);
  // Glitch: some rows slide sideways for a frame.
  float row = floor(float(p.y)/3.);
  if (uGlitch > 0. && h2(vec2(row, floor(uTime*18.))) < uGlitch*.35) p.x += int((h2(vec2(row*1.7, floor(uTime*18.)))-.5)*16.);
  vec4 t = at(p); int m = matOf(t); float d = uFlat > 0. ? .5 : bayer(p);   // flat: no dithering
  if (uFlat > 0.) {
    // flat: no lone pixels. A pixel at most one of its 4 neighbours agrees with takes the
    // texel of a neighbour whose material another neighbour shares (cracks and lights only
    // show where they're 2+ px wide, like hand-drawn pixel art).
    vec4 nb[4] = vec4[4](at(p+ivec2(1,0)), at(p-ivec2(1,0)), at(p+ivec2(0,1)), at(p-ivec2(0,1)));
    int same = 0; for (int k = 0; k < 4; k++) if (matOf(nb[k]) == m) same++;
    if (same <= 1) for (int k = 0; k < 4; k++) {
      int mk = matOf(nb[k]), agree = 0;
      for (int j = 0; j < 4; j++) if (matOf(nb[j]) == mk) agree++;
      if (mk != m && agree >= 2) { t = nb[k]; m = mk; break; }
    }
  }
  if (m == 0) {
    // Outline: a background pixel touching the model.
    bool edge = matOf(at(p+ivec2(1,0)))>0 || matOf(at(p-ivec2(1,0)))>0 || matOf(at(p+ivec2(0,1)))>0 || matOf(at(p-ivec2(0,1)))>0;
    if (edge) { o = vec4(uPal[63], 1.); return; }
    // Glow halos: core (a) and crystals (r), three dithered steps each.
    for (int k = 0; k < 2; k++) {
      float g = k == 0 ? t.a : t.r;
      float lv = g*3. + (d-.5)*.45;
      if (lv > 2.) { o = vec4(uGlowCol[k*3+2], .8); return; }
      if (lv > 1.) { o = vec4(uGlowCol[k*3+1], .5); return; }
      if (lv > .5) { o = vec4(uGlowCol[k*3], .28); return; }
    }
    vec2 uv = gl_FragCoord.xy/uRes;
    // Thruster exhaust: a flickering white plume that widens and thins out downward.
    if (uPlume.w > 0.) {
      float dy = uPlume.y - uv.y;
      if (dy > 0.) {
        float len = .16*uPlume.w*(.85 + .15*h2(vec2(floor(uTime*30.), 1.)));
        float wdt = uPlume.z*(1. + dy*4.);
        float k = max(1. - abs(uv.x - uPlume.x)/wdt, 0.)*max(1. - dy/len, 0.);
        k = k > 0. ? k + (h2(vec2(gl_FragCoord.xy) + floor(uTime*30.)) - .5)*.35 : -1.;
        if (k + (d-.5)*.6 > .55) { o = vec4(uPal[62], 1.); return; }
        if (k + (d-.5)*.6 > .25) { o = vec4(uPal[61], .75); return; }
      }
    }
    // Ground shadow under the floating body, dithered at the edge.
    vec2 s = (uv - vec2(uShadowX, .045)) / vec2(.26, .028);
    float sh = 1. - length(s);
    if (uShadow > 0. && sh*uShadow + (d-.5)*.5 > .15) { o = vec4(0.,0.,0.,.45); return; }
    o = vec4(0.); return;
  }
  float sh = t.r;
  // Inner lines: a big jump in depth to a neighbour darkens two ramp steps.
  float dz = max(abs(at(p+ivec2(1,0)).b - t.b), abs(at(p+ivec2(0,1)).b - t.b));
  int nm = max(matOf(at(p+ivec2(1,0))), matOf(at(p+ivec2(0,1))));
  float idx = floor(clamp(sh*6. + (d-.5)*.9, 0., 5.99));
  if (uFlat > 0.) idx = sh < .34 ? 1. : sh < .66 ? 2. : sh < .9 ? 3. : 4.;   // flat: shadow, base, light, and a thin rim where it's brightest
  if (dz > .025 && m != 3 && m != 4) idx = uFlat > 0. ? 0. : max(idx-2., 0.);   // flat: inner lines in the darkest tone
  vec3 c = uPal[(m-1)*6 + int(idx)];
  if (uFlash > 0. && (d < uFlash)) c = vec3(1.);
  o = vec4(c, 1.);
}`;

export class PixelGL {
  // model: GLSL defining `vec4 render(vec2 fragCoord)` (see golem-px.js).
  // palettes: up to 8 ramps of 6 hex colours, then [dust, dust light, outline].
  constructor(canvas, { model, uniforms, palettes, glow, extra = ["#cfd6e2", "#ffffff", "#07080c"] }) {
    this.canvas = canvas;
    const gl = (this.gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false, alpha: true, preserveDrawingBuffer: true }));
    if (!gl) throw new Error("WebGL2 not available");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const head = "#version 300 es\nprecision highp float;\n";
    this.model = this.program(head + SDF_LIB + model);
    this.pixel = this.program(PIXEL.replace("#version 300 es\n", "#version 300 es\n"));
    this.names = uniforms;
    const pal = new Float32Array(64 * 3);
    const put = (i, hex) => { const n = parseInt(hex.slice(1), 16); pal.set([(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], i * 3); };
    palettes.forEach((ramp, r) => ramp.forEach((hex, k) => put(r * 6 + k, hex)));
    extra.forEach((hex, k) => put(61 + k, hex));
    this.pal = pal;
    this.glow = new Float32Array(18);
    glow.forEach((hex, k) => { const n = parseInt(hex.slice(1), 16); this.glow.set([(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], k * 3); });
    this.resize(canvas.width, canvas.height);
  }
  program(fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src.split("\n").map((l, i) => i + 1 + ": " + l).join("\n"));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "a"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.loc = (n) => (p.cache ||= {})[n] ??= gl.getUniformLocation(p, n);
    return p;
  }
  resize(w, h) {
    const gl = this.gl;
    this.canvas.width = w; this.canvas.height = h;
    this.tex && gl.deleteTexture(this.tex);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    this.fbo ||= gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
  }
  // u: model uniforms by name (numbers or arrays); px: pixel-pass settings.
  draw(u, px) {
    const gl = this.gl, w = this.canvas.width, h = this.canvas.height;
    const set = (prog, name, v) => {
      const l = prog.loc(name); if (!l) return;
      if (typeof v === "number") gl.uniform1f(l, v);
      else [, gl.uniform1fv, gl.uniform2fv, gl.uniform3fv, gl.uniform4fv][v.length].call(gl, l, v);
    };
    gl.viewport(0, 0, w, h);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // Pass 1
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.useProgram(this.model);
    set(this.model, "uRes", [w, h]);
    for (const k in u) set(this.model, k, u[k]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Pass 2
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pixel);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.pixel.loc("uTex"), 0);
    gl.uniform3fv(this.pixel.loc("uPal[0]"), this.pal);
    gl.uniform3fv(this.pixel.loc("uGlowCol[0]"), this.glow);
    set(this.pixel, "uRes", [w, h]);
    for (const k in px) set(this.pixel, k, px[k]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
