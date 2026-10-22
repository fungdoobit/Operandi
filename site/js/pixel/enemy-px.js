// Small enemies (PRD Addendum K) in hi-bit pixel art, drawn by the same
// renderer as GOLEM and NOVA (pixel-gl.js): a 3D distance-function model per
// enemy, lit, outlined and turned into pixel art.
//
// Each enemy model (pixel/enemy-models/*.js) gives:
//   name, w, h        canvas size in art pixels (1 art px = 1 design px; 80 px = 1 model unit)
//   ground            model y of its feet (it stands on the floor), or fly: true (it hovers)
//   palettes, glow    up to 8 colour ramps (materials 1..8), 6 glow colours
//                     (0-2: emissive parts drawn with G(), 3-5: eyes drawn with E())
//   glsl              `float map(vec3 p)`, built facing LEFT (-x, toward the teammate),
//                     using U(d, nd, material, localPos), G(nd) and E(nd). It may also
//                     define `float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh)`.
//                     Animation inputs: T (seconds), ATK (the strike, 0..1), WIND
//                     (the wind-up, 0..1), WALK (a walk cycle phase), HURT (0..1),
//                     OPEN (wings / jaws / spell, 0..1).
//                     Material 3 is special: it gets no inner lines (eyes, glowing bits).
//   anchors           named model points: core (always), weapon, muzzle, head, feet.
//                     A value can be a function of the pose (a weapon that swings).
//   idle(t, P)        optional extra idle motion: returns pose offsets
//   yaw, pitch        optional camera angles (default -0.6: a three-quarter view, the
//                     face turned toward both the teammate and us; pitch 0.25)
//
// PixelEnemy has the same interface as PixelGolem (to, rest, hurt, point,
// pagePoint, toCanvas, fxv, canvas...), so every teammate ability works on it.
import { PixelGL } from "./pixel-gl.js";
import { battleTime } from "../battle-time.js";
import { ENEMY_MODELS } from "./enemy-models/index.js";

export const PX_PER_UNIT = 80;

function shaderFor(def) {
  const ground = def.fly ? 0 : def.ground ?? 0;
  return `
uniform vec2 uRes, uOff; uniform float uTime, uView, uYaw, uPitch;
uniform vec4 uBody;  // lean, bob, lunge, glow
uniform vec4 uAct;   // atk, wind, walk, hurt
uniform vec4 uAct2;  // squash, open
float gm; float gGlow; float gEye; vec3 gLp;
void U(inout float d, float nd, float m, vec3 lp){ if (nd < d) { d = nd; gm = m; gLp = lp; } }
void G(float nd){ gGlow = min(gGlow, nd); }
void E(float nd){ gEye = min(gEye, nd); }
#define T uTime
#define ATK uAct.x
#define WIND uAct.y
#define WALK uAct.z
#define HURT uAct.w
#define OPEN uAct2.y
const float GROUND = ${ground.toFixed(3)};
${def.glsl}
${/shadeOf/.test(def.glsl) ? "" : "float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){ return sh; }"}
float scene(vec3 p){
  gm = 0.; gGlow = 1e5; gEye = 1e5;
  p.xz = R(uYaw) * p.xz; p.yz = R(uPitch) * p.yz;
  p.y -= uBody.y; p.x -= uBody.z;
  // lean and squash pivot on the feet
  p.y -= GROUND; p.xy = R(uBody.x) * p.xy;
  float sy = 1. - uAct2.x*.28, sx = 1. + uAct2.x*.18;
  p.y /= sy; p.xz /= sx;
  p.y += GROUND;
  return map(p) * min(sy, sx);
}
vec3 nrm(vec3 p){ const vec2 k = vec2(1., -1.)*.002; return normalize(k.xyy*scene(p + k.xyy) + k.yyx*scene(p + k.yyx) + k.yxy*scene(p + k.yxy) + k.xxx*scene(p + k.xxx)); }
out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  vec3 ro = vec3(uv + uOff, -6.), rd = vec3(0., 0., 1.);
  float t = 0., m = 0., minG = 1e5, minE = 1e5;
  for (int i = 0; i < 110; i++) {
    float d = scene(ro + rd*t);
    minG = min(minG, gGlow); minE = min(minE, gEye);
    if (d < .0025) { m = gm; break; }
    t += d*.8;
    if (t > 12.) break;
  }
  float glow = clamp(exp(-max(minG, 0.)*14.)*(.35 + .5*uBody.w), 0., 1.);
  float eglow = exp(-max(minE, 0.)*26.)*.6;
  if (m == 0.) { o = vec4(eglow, 0., 1., glow); return; }
  vec3 p = ro + rd*t;
  scene(p); m = gm; vec3 lp = gLp;
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(-.55, .8, -.5)), Rm = normalize(vec3(.9, .3, .3));
  float key = max(dot(n, L), 0.);
  float ao = clamp(scene(p + n*.05)/.05, 0., 1.)*.5 + clamp(scene(p + n*.14)/.14, 0., 1.)*.5;
  float spec = pow(max(dot(reflect(-L, n), -rd), 0.), 14.);
  float sh = .07 + .64*key*mix(.55, 1., ao) + .22*spec + .1*ao + .12*max(dot(n, Rm), 0.);
  if (m == 3.) sh = .55 + .45*max(dot(n, -rd), 0.);
  sh = shadeOf(m, p, n, lp, sh);
  o = vec4(clamp(sh, 0., 1.), m/16., t/12., glow);
}`;
}

const EASE = {
  lin: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};
export const ENEMY_REST = { lean: 0, bob: 0, lunge: 0, tilt: 0, flare: 0, atk: 0, wind: 0, walk: 0, hurt: 0, squash: 0, open: 0, yaw: 0 };
const rot = (a, b, t) => { const c = Math.cos(t), s = Math.sin(t); return [c * a - s * b, s * a + c * b]; };

export class PixelEnemy {
  constructor(host, kind) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "px-enemy";
    Object.assign(this.canvas.style, { imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.fxv = { flash: 0, block: 1, glitch: 0 };
    this.tweens = [];
    this.at = 0; this.last = performance.now();
    this.setKind(kind);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // Become another enemy (the next wave). The canvas keeps its WebGL context.
  setKind(kind) {
    const def = ENEMY_MODELS[kind];
    if (!def) throw new Error("No enemy model: " + kind);
    this.kind = kind; this.def = def;
    this.canvas.width = def.w; this.canvas.height = def.h;
    this.setPx(this.pxScale || 1);
    this.gl = new PixelGL(this.canvas, { model: shaderFor(def), palettes: def.palettes, glow: def.glow, extra: def.extra || ["#cfd6e2", "#ffffff", "#0a080c"] });
    this.view = def.h / PX_PER_UNIT;
    // the feet sit just above the bottom edge of the canvas (where the pixel pass draws the ground shadow)
    const ground = def.fly ? (def.hover ?? -0.4) : def.ground ?? 0;
    this.off = [def.offX ?? 0, ground + this.view * 0.44];
    this.pose = { ...ENEMY_REST };
    this.tweens = [];
    this.fxv.flash = 0; this.fxv.glitch = 0;
    this.render();
  }
  setPx(px) { this.pxScale = px; this.canvas.style.width = this.canvas.width * px + "px"; this.canvas.style.height = this.canvas.height * px + "px"; }
  // How far the feet are above the canvas's bottom edge, in art px.
  get footPx() { return this.canvas.height * 0.06; }

  to(to, ms, ease = "io", obj = this.pose) {
    return new Promise((done) => {
      const from = {}; for (const k in to) from[k] = obj[k] ?? 0;
      this.tweens.push({ obj, from, to, ms, t: 0, ease: EASE[ease] || EASE.io, done });
    });
  }
  wait(ms) { return this.to({}, ms); }
  rest(ms = 600) { return this.to({ ...ENEMY_REST }, ms, "io"); }

  loop(now) {
    if (!this.canvas.isConnected) return;
    const frame = now - this.last, raw = Math.min(frame, 50); this.last = now;
    this.avg = (this.avg ?? 16) * 0.95 + Math.min(frame, 100) * 0.05;
    if (this.avg > 24) this.half = true; else if (this.avg < 17) this.half = false;
    this.skip = this.half && !this.skip;
    const dt = battleTime.step(now, raw);
    this.at += dt;
    this.tweens = this.tweens.filter((tw) => {
      tw.t = Math.min(tw.t + dt, tw.ms);
      const k = tw.ms ? tw.ease(tw.t / tw.ms) : 1;
      for (const n in tw.to) tw.obj[n] = tw.from[n] + (tw.to[n] - tw.from[n]) * k;
      if (tw.t >= tw.ms) { tw.done(); return false; }
      return true;
    });
    if (!this.skip) this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    const s = this.at / 1000, P = this.pose, def = this.def;
    const idle = def.idle ? def.idle(s, P) : { bob: Math.sin(s * 2.2) * 0.02 };
    const v = (k) => (P[k] || 0) + (idle[k] || 0);
    this.u = {
      uTime: s, uView: this.view, uOff: this.off, uYaw: (def.yaw ?? -0.6) + v("yaw"), uPitch: def.pitch ?? 0.25,
      uBody: [v("lean") + v("tilt") * 0.5, v("bob"), v("lunge"), v("flare")],
      uAct: [v("atk"), v("wind"), v("walk") + (idle.walkT || 0), v("hurt")],
      uAct2: [v("squash"), v("open"), 0, 0],
    };
    const core = this.toCanvasRaw(this.anchor("core"));
    this.gl.draw(this.u, {
      uTime: s, uFlash: this.fxv.flash, uBlock: this.fxv.block, uGlitch: this.fxv.glitch,
      uShadow: def.fly ? 0.55 - v("bob") * 0.8 : 1, uShadowX: core[0] / this.canvas.width, uPlume: [0, 0, 0, 0],
    });
  }

  anchor(name) {
    const a = this.def.anchors[name] ?? this.def.anchors.core;
    return typeof a === "function" ? a(this.pose) : a;
  }
  // A model point to canvas pixels (y up), mirroring the shader's transforms.
  toCanvasRaw([x, y, z]) {
    const u = this.u, g = this.def.fly ? 0 : this.def.ground ?? 0, sq = u.uAct2[0];
    y -= g; x *= 1 + sq * 0.18; z *= 1 + sq * 0.18; y *= 1 - sq * 0.28;
    [x, y] = rot(x, y, -u.uBody[0]);
    y += g;
    x += u.uBody[2]; y += u.uBody[1];
    [y, z] = rot(y, z, -u.uPitch); [x, z] = rot(x, z, -u.uYaw);
    const H = this.canvas.height, W = this.canvas.width;
    return [(x - this.off[0]) * H / this.view + W / 2, (y - this.off[1]) * H / this.view + H / 2];
  }
  // GOLEM-compatible: abilities pass points in GOLEM's body space (his hull is
  // about 2.6 wide), or a point on his claw / cannon. On a small enemy those
  // become its weapon or head, and body points shrink to its size.
  toCanvas(L, part) {
    if (part) return this.toCanvasRaw(this.anchor(part === "claw" ? "weapon" : part === "cannon" ? "muzzle" : part));
    const c = this.anchor("core"), k = this.def.scale ?? 0.35;
    return this.toCanvasRaw([c[0] + L[0] * k, c[1] + (L[1] + 0.1) * k, c[2] + L[2] * k]);
  }
  point(name) {
    const map = { claw: "weapon", muzzle: "muzzle", thruster: "feet" };
    return this.pagePointRaw(this.anchor(map[name] || name));
  }
  pagePointRaw(M) {
    const [fx, fy] = this.toCanvasRaw(M), r = this.canvas.getBoundingClientRect();
    return { x: r.left + fx * r.width / this.canvas.width, y: r.top + (this.canvas.height - fy) * r.height / this.canvas.height };
  }
  pagePoint(L, part) {
    const [fx, fy] = this.toCanvas(L, part), r = this.canvas.getBoundingClientRect();
    return { x: r.left + fx * r.width / this.canvas.width, y: r.top + (this.canvas.height - fy) * r.height / this.canvas.height };
  }
  localPoint(L, part) {
    const [fx, fy] = this.toCanvas(L, part), k = this.canvas.clientWidth / this.canvas.width;
    return { x: fx * k, y: (this.canvas.height - fy) * k };
  }

  async hurt({ crit = false } = {}) {
    this.fxv.flash = 1; this.to({ flash: 0 }, crit ? 340 : 240, "lin", this.fxv);
    this.fxv.glitch = crit ? 0.8 : 0.4; this.to({ glitch: 0 }, 300, "lin", this.fxv);
    await this.to({ lean: crit ? -0.3 : -0.18, lunge: crit ? 0.18 : 0.1, hurt: 1, squash: 0.25 }, 90, "out");
    await this.to({ lean: 0, lunge: 0, hurt: 0, squash: 0 }, 520, "back");
  }
  async resolve(ms = 800, from = 40) {
    this.fxv.block = from;
    this.render();
    await this.to({ block: 1 }, ms, "out", this.fxv);
  }
  // Defeated: knocked back and over, glitching, then it breaks up into big pixel blocks and fades.
  async die() {
    this.fxv.flash = 1; this.to({ flash: 0 }, 400, "lin", this.fxv);
    this.fxv.glitch = 1; this.to({ glitch: 0.4 }, 600, "lin", this.fxv);
    await this.to({ lean: -0.55, lunge: 0.35, hurt: 1, squash: 0.45, bob: this.def.fly ? -0.5 : 0 }, 420, "out");
    this.to({ block: 26 }, 650, "in", this.fxv);
    await this.canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 150, fill: "forwards" }).finished.catch(() => {});
  }
  // Back after a defeat (a fresh fight).
  revive() { this.canvas.getAnimations().forEach((a) => a.cancel()); this.fxv.block = 1; this.fxv.glitch = 0; this.pose = { ...ENEMY_REST }; }
}

// The enemy wearing PixelBoss's interface (figure with a .boss-core marker,
// dome, hit, defeat, win), so the shared choreography works on it.
export class EnemyFoe {
  constructor({ model, fx, figure, name }) {
    this.golem = model; this.fx = fx; this.figure = figure;
    this.b = { name };
    this.coreEl = document.createElement("div");
    this.coreEl.className = "boss-core";
    Object.assign(this.coreEl.style, { position: "absolute", width: "2px", height: "2px", pointerEvents: "none" });
    figure.append(this.coreEl);
    this.dome = { childElementCount: 0 };
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }
  tick() {
    if (!this.coreEl.isConnected) return;
    const [x, y] = this.golem.toCanvasRaw(this.golem.anchor("core")), k = this.golem.canvas.clientWidth / this.golem.canvas.width;
    this.coreEl.style.left = x * k + "px"; this.coreEl.style.top = (this.golem.canvas.height - y) * k + "px";
    requestAnimationFrame(this.tick);
  }
  hit({ crit = false } = {}) { this.golem.hurt({ crit }); }
  buildDome() {} breakDome() {} charge() {} special() {}
  defeat() { return this.golem.die(); }
  win() { const g = this.golem; g.to({ open: 1, bob: 0.08, flare: 1.5 }, 300, "out").then(() => this.fx.wait(900)).then(() => g.rest(500)); }
}
