// GOLEM in hi-bit pixel art. The model is built in GLSL from boxes, capsules,
// cylinders and crystals, with grooves, vents and bolts cut in. Poses are a
// handful of numbers (lean, arm angles, claw grip...) tweened in JS.
import { PixelGL } from "./pixel-gl.js";
import { battleTime } from "../battle-time.js";

// Materials: 1 armour, 2 dark frame, 3 core (glows), 4 crystal (glows), 5 wire, 6 hazard paint.
const PALETTES = [
  ["#121722", "#1f2735", "#323d50", "#4c5b73", "#74869f", "#b3c2d3"],
  ["#0a0c11", "#141821", "#20252f", "#2f3542", "#465063", "#6b7588"],
  ["#5a1a06", "#a8350b", "#e85f10", "#ff9b2b", "#ffd36b", "#fff7d6"],
  ["#0a3546", "#0f6e88", "#18b0c8", "#50e2ee", "#b4fbff", "#ffffff"],
  ["#08090d", "#12141b", "#1d2029", "#2b303c", "#414859", "#626c80"],
  ["#3a2008", "#6b3c0d", "#a86419", "#d9902b", "#f2c25a", "#fff0b0"],
];
const GLOW = ["#ff7a1a", "#ffb347", "#fff0c0", "#18b0c8", "#50e2ee", "#d8fdff"];

const MODEL = `
uniform vec2 uRes; uniform float uTime, uYaw, uPitch, uView, uLift;
uniform vec4 uBody;  // lean, bob, lunge, core flare
uniform vec4 uClaw;  // shoulder, elbow, grip open, wrist
uniform vec4 uCan;   // shoulder, elbow, charge, recoil
uniform vec4 uWire;  // sway amount, lag x, lag y, crystal spin
float gm; float gCore; float gCrys; vec3 gCp;
void U(inout float d, float nd, float m){ if (nd < d) { d = nd; gm = m; } }

float wires(vec3 p, inout float d){
  float best = 1e5;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 a = vec3(-.33 + fi*.11, -.72, -.04 + .1*sin(fi*2.1));
    float L = .85 + .45*hash1(fi*7.13);
    vec3 prev = a;
    for (int k = 1; k <= 4; k++) {
      float s = float(k)/4.;
      vec3 b = a + vec3(
        (sin(uTime*1.3 + fi*1.7 + s*2.)*.09*uWire.x + uWire.y + .05*sin(fi*3.))*s*s,
        -L*s + uWire.z*s*s,
        .06*sin(uTime*.9 + fi)*s);
      best = min(best, sdCapT(p, prev, b, .038 - .006*float(k-1), .032 - .006*float(k-1)));
      prev = b;
    }
    // plug on the end, some with a spark of glitch light
    U(d, sdCylY(p - prev + vec3(0., .03, 0.), .042, .05), 2.);
    U(d, sdCylY(p - prev + vec3(0., .01, 0.), .046, .012), 6.);
    float tip = length(p - prev + vec3(0., .09, 0.)) - .018;
    if (mod(fi, 3.) < 1.) { U(d, tip, 4.); gCrys = min(gCrys, tip); }
  }
  return best;
}

float clawArm(vec3 p, inout float d){
  vec3 q = p - vec3(-.8, .32, 0.);
  U(d, length(q) - .17, 2.);
  q.xy = R(uClaw.x) * q.xy;
  U(d, sdCap(q, vec3(0.), vec3(0., -.5, 0.), .09), 2.);
  U(d, sdRBox(q - vec3(0., -.22, 0.), vec3(.15, .19, .15), .06), 1.);
  vec3 e = q - vec3(0., -.52, 0.);
  U(d, length(e) - .12, 2.);
  e.xy = R(uClaw.y) * e.xy;
  U(d, sdRBox(e - vec3(0., -.3, 0.), vec3(.165, .29, .175), .07), 1.);
  U(d, sdRBox(e - vec3(0., -.1, 0.), vec3(.178, .035, .186), .03), 6.);
  U(d, sdCap(e, vec3(.19, -.05, 0.), vec3(.19, -.45, 0.), .035), 2.); // piston
  vec3 h = e - vec3(0., -.64, 0.);
  h.xy = R(uClaw.w) * h.xy;
  U(d, sdRBox(h, vec3(.15, .09, .16), .04), 2.);
  U(d, sdRBox(h - vec3(0., .05, 0.), vec3(.17, .035, .18), .03), 1.);
  for (int k = 0; k < 3; k++) {
    float th = float(k)*2.094 + .4;
    vec3 dir = vec3(cos(th), 0., sin(th));
    vec3 b = dir*.11 + vec3(0., -.05, 0.);
    vec3 m = b + normalize(dir*uClaw.z + vec3(0., -1., 0.))*.3;
    vec3 t = m + normalize(-dir*.75 + vec3(0., -1., 0.))*.26;
    U(d, sdCapT(h, b, m, .065, .05), 1.);
    U(d, sdCapT(h, m, t, .048, .01), 1.);
    U(d, sdCapT(h, m + (t-m)*.55, t, .03, .008), 6.);
    U(d, length(h - m) - .058, 2.);
  }
  return d;
}

float cannonArm(vec3 p, inout float d){
  vec3 q = p - vec3(.8, .32, 0.);
  U(d, length(q) - .17, 2.);
  q.xy = R(-uCan.x) * q.xy;
  U(d, sdCap(q, vec3(0.), vec3(0., -.5, 0.), .09), 2.);
  U(d, sdRBox(q - vec3(0., -.22, 0.), vec3(.15, .19, .15), .06), 1.);
  vec3 e = q - vec3(0., -.52, 0.);
  U(d, length(e) - .12, 2.);
  e.xy = R(-uCan.y) * e.xy;
  e.y -= uCan.w;
  U(d, sdCylY(e - vec3(0., -.36, 0.), .19, .34), 1.);
  for (int k = 0; k < 3; k++) U(d, sdCylY(e - vec3(0., -.16 - float(k)*.15, 0.), .225, .022), 2.);
  U(d, sdCylY(e - vec3(0., -.36, 0.) - vec3(0., 0., 0.), .2, .012) , 6.);
  float muzzle = sdCylY(e - vec3(0., -.78, 0.), .13, .09);
  muzzle = max(muzzle, -sdCylY(e - vec3(0., -.84, 0.), .075, .12));
  U(d, muzzle, 2.);
  float shot = length(e - vec3(0., -.8, 0.)) - .07*uCan.z;
  U(d, shot, 3.);
  gCore = min(gCore, length(e - vec3(0., -.86, 0.)) - .05 - .12*uCan.z);
  return d;
}

float map(vec3 p){
  gm = 0.; gCore = 1e5; gCrys = 1e5;
  float d = 1e5;
  // camera turn (GOLEM faces a little to the left, towards the teammate)
  p.xz = R(uYaw) * p.xz; p.yz = R(uPitch) * p.yz;
  // floating crystals (outside the body, they don't lean with him)
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 c = vec3(i == 0 ? -1.2 : i == 1 ? 1.25 : 1.3, i == 0 ? .8 : i == 1 ? 1.02 : -.75, i == 2 ? .5 : .2);
    c.y += .06*sin(uTime*1.7 + fi*2.) + uBody.y*.6;
    vec3 q = p - c;
    q.xz = R(uTime*.8*uWire.w + fi) * q.xz;
    q.y /= 1.9;
    float k = sdOct(q, .11 + .03*fi) * 1.;
    U(d, k, 4.); gCrys = min(gCrys, k);
  }
  // body space: bob, lunge, lean
  p.y -= uBody.y + uLift; p.x -= uBody.z;
  p.xy = R(uBody.x) * p.xy;
  // quick bounding box so empty pixels stay cheap
  if (sdBox(p - vec3(0., -.55, 0.), vec3(2.3, 2.3, 1.4)) > .3) return min(d, 1.);
  // torso frame (dark) and armour plates
  vec3 t = p; t.x *= 1. - .12*t.y;
  U(d, sdRBox(t, vec3(.58, .5, .4), .14), 2.);
  vec3 c = p - vec3(0., .05, -.12);
  float plate = sdRBox(c, vec3(.5, .42, .34), .08);
  plate = max(plate, -(length(c.xy - vec2(0., .03)) - .27));                      // hole for the core
  plate = max(plate, -sdBox(c - vec3(0., -.24, -.34), vec3(.6, .013, .04)));       // panel groove
  plate = max(plate, -sdBox(vec3(abs(c.x) - .33, c.y + .05, c.z + .34), vec3(.013, .35, .04)));
  U(d, plate, 1.);
  for (int k = 0; k < 4; k++) {
    vec2 b = vec2(k < 2 ? -.42 : .42, mod(float(k), 2.) < 1. ? .36 : -.33);
    U(d, length(c - vec3(b, -.42)) - .032, 2.);
  }
  // hazard stripes along the chest plate's lower edge
  vec3 hz = c - vec3(0., -.37, -.34);
  float stripes = sdBox(hz, vec3(.32, .035, .03));
  stripes = max(stripes, -(abs(mod(hz.x + hz.y + 1., .1) - .05) - .022));
  U(d, stripes, 6.);
  // shoulders (pauldrons) with a paint band
  vec3 s = p; s.x = abs(s.x); s -= vec3(.66, .44, .0); s.xy = R(-.38) * s.xy;
  U(d, sdRBox(s, vec3(.31, .2, .36), .1), 1.);
  U(d, sdRBox(s - vec3(0., .15, 0.), vec3(.325, .04, .375), .04), 6.);
  U(d, sdRBox(s - vec3(.12, .02, -.36), vec3(.12, .1, .02), .02), 2.);
  U(d, sdRBox(s - vec3(.1, -.2, 0.), vec3(.27, .07, .33), .05), 1.);          // lower layer
  U(d, length(vec3(s.x - .24, s.y - .06, abs(s.z) - .3)) - .03, 2.);           // bolts
  // abdomen: ribbed plates between chest and hips
  vec3 ab = p - vec3(0., -.5, -.3);
  ab.y = mod(ab.y + .05, .1) - .05;
  if (p.y < -.4 && p.y > -.62) U(d, sdRBox(ab, vec3(.34 + .04*(p.y + .5), .036, .06), .02), 1.);
  // side vents on the torso
  vec3 sv = p; sv.x = abs(sv.x); sv -= vec3(.6, -.1, -.1);
  float vents = sdRBox(sv, vec3(.06, .2, .2), .03);
  vec3 sl = sv; sl.y = mod(sl.y + .03, .06) - .03;
  vents = max(vents, -sdBox(sl - vec3(.06, 0., 0.), vec3(.03, .012, .16)));
  U(d, vents, 2.);
  // collar plate over the top of the chest
  vec3 cl = p - vec3(0., .44, -.3); cl.yz = R(.5) * cl.yz;
  U(d, sdRBox(cl, vec3(.36, .05, .12), .04), 1.);
  // top dome with vent slots
  vec3 h = p - vec3(0., .48, .06);
  float dome = max(length(h) - .33, -h.y - .02);
  vec3 v = h; v.x = mod(v.x + .05, .1) - .05;
  if (abs(h.x) < .2) dome = max(dome, -sdBox(v - vec3(0., .25, -.15), vec3(.018, .1, .25)));
  U(d, dome, 1.);
  // back exhaust stacks
  vec3 x = p; x.x = abs(x.x); x -= vec3(.3, .55, .36);
  U(d, sdCylY(x, .08, .3), 2.);
  U(d, sdCylY(x - vec3(0., .3, 0.), .1, .04), 1.);
  // core housing ring and the faceted core
  vec3 cp = p - vec3(0., .08, -.5);
  U(d, sdTorZ(cp, .215, .055), 2.);
  float gem = length(cp) - .17;
  U(d, gem, 3.); gCore = min(gCore, gem); gCp = cp;
  // glitch crystals growing out of the right shoulder
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 q = p - vec3(.72 + fi*.09, .7 + .04*fi - fi*fi*.02, -.1 + fi*.08);
    q.xy = R(.5 - fi*.45) * q.xy;
    q.y /= 2.2 - fi*.4;
    float k = sdOct(q, .06 - fi*.012);
    U(d, k, 4.); gCrys = min(gCrys, k);
  }
  // hip block and front skirt
  U(d, sdRBox(p - vec3(0., -.62, .02), vec3(.42, .14, .32), .08), 2.);
  vec3 sk = p - vec3(0., -.66, -.22); sk.yz = R(-.25) * sk.yz;
  U(d, sdRBox(sk, vec3(.3, .14, .05), .04), 1.);
  // arms and wires
  clawArm(p, d);
  cannonArm(p, d);
  if (p.y < -.6) U(d, wires(p, d), 5.);
  return d;
}

vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.)*.0015;
  return normalize(k.xyy*map(p + k.xyy) + k.yyx*map(p + k.yyx) + k.yxy*map(p + k.yxy) + k.xxx*map(p + k.xxx));
}

out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  vec3 ro = vec3(uv.x - .12, uv.y - .45, -5.), rd = vec3(0., 0., 1.);
  float t = 0., minCore = 1e5, minCrys = 1e5, m = 0.;
  for (int i = 0; i < 110; i++) {
    float d = map(ro + rd*t);
    minCore = min(minCore, gCore); minCrys = min(minCrys, gCrys);
    if (d < .0025) { m = gm; break; }
    t += d*.85;
    if (t > 10.) break;
  }
  float glow = clamp(exp(-max(minCore, 0.)*13.)*(.5 + .6*uBody.w), 0., 1.);
  float cglow = exp(-max(minCrys, 0.)*24.)*.55;
  if (m == 0.) { o = vec4(cglow, 0., 1., glow); return; }
  vec3 p = ro + rd*t;
  map(p); m = gm;
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(-.6, .75, -.55)), Rm = normalize(vec3(.95, .25, .4));
  float key = max(dot(n, L), 0.);
  float ao = clamp(map(p + n*.06)/.06, 0., 1.)*.5 + clamp(map(p + n*.16)/.16, 0., 1.)*.5;
  float spec = pow(max(dot(reflect(-L, n), -rd), 0.), 14.);
  float sh;
  if (m == 3.) {
    // glowing eye: hot centre, rings out to a deep orange edge, a small glint
    float r = length(gCp.xy)/.17;
    sh = 1.02 - .75*r*r + .15*uBody.w;
    if (length(gCp.xy - vec2(-.06, .07)) < .035) sh = 1.;
  }
  else if (m == 4.) sh = .35 + .65*(.5 + .5*dot(n, normalize(vec3(-.5, .8, -.6))));
  else sh = .08 + .62*key*mix(.55, 1., ao) + .32*spec + .1*ao;
  sh += .12*max(dot(n, Rm), 0.)*(m == 3. || m == 4. ? 0. : 1.);   // cool fill from the crystals' side
  // the core lights up the metal around it in orange
  if (m == 1. || m == 2.) {
    float spill = clamp(1. - gCore/.16, 0., 1.)*(.6 + .4*uBody.w);
    if (spill > .45) { m = 6.; sh = .25 + .55*spill; }
  }
  o = vec4(clamp(sh, 0., 1.), m/16., t/10., glow);
}`;

const EASE = {
  lin: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

const REST = { lean: 0, bob: 0, lunge: 0, flare: 0, cs: 0.32, ce: -0.5, cg: 0.55, cw: 0, ns: 0.25, ne: 0.95, charge: 0, recoil: 0, yaw: -0.42 };

export class PixelGolem {
  // host: element the canvas goes in. w,h: art pixels. px: screen px per art pixel.
  constructor(host, { w = 340, h = 400, px = 2, view = 4.5 } = {}) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "px-golem";
    Object.assign(this.canvas.style, { width: w * px + "px", height: h * px + "px", imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.canvas.width = w; this.canvas.height = h;
    this.gl = new PixelGL(this.canvas, { model: MODEL, palettes: PALETTES, glow: GLOW });
    this.view = view;
    this.pose = { ...REST };
    this.fxv = { flash: 0, block: 1, glitch: 0, impact: [0.2, 0.06, 0] };
    this.tweens = [];
    this.at = 0; this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  setPx(px) { this.canvas.style.width = this.canvas.width * px + "px"; this.canvas.style.height = this.canvas.height * px + "px"; }
  // Tween pose (or fx) values to `to` over ms of battle time.
  to(to, ms, ease = "io", obj = this.pose) {
    return new Promise((done) => {
      const from = {}; for (const k in to) from[k] = obj[k];
      this.tweens.push({ obj, from, to, ms, t: 0, ease: EASE[ease], done });
    });
  }
  wait(ms) { return this.to({}, ms); }
  loop(now) {
    const raw = Math.min(now - this.last, 50); this.last = now;
    const dt = battleTime.step(now, raw);
    this.at += dt;
    this.tweens = this.tweens.filter((tw) => {
      tw.t = Math.min(tw.t + dt, tw.ms);
      const k = tw.ms ? tw.ease(tw.t / tw.ms) : 1;
      for (const n in tw.to) {
        const a = tw.from[n], b = tw.to[n];
        tw.obj[n] = Array.isArray(b) ? b.map((v, i) => a[i] + (v - a[i]) * k) : a + (b - a) * k;
      }
      if (tw.t >= tw.ms) { tw.done(); return false; }
      return true;
    });
    this.render();
    requestAnimationFrame(this.loop);
  }
  render() {
    const s = this.at / 1000, P = this.pose;
    // idle breathing on top of the pose
    const bob = Math.sin(s * 1.6) * 0.045 + P.bob, sway = Math.sin(s * 1.6 - 0.8);
    this.gl.draw({
      uTime: s, uYaw: P.yaw, uPitch: -0.16, uView: this.view, uLift: 0.06,
      uBody: [P.lean + Math.sin(s * 0.8) * 0.015, bob, P.lunge, P.flare + 0.15 * Math.sin(s * 3.1)],
      uClaw: [P.cs + sway * 0.04, P.ce - sway * 0.05, P.cg, P.cw],
      uCan: [P.ns - sway * 0.04, P.ne + sway * 0.04, P.charge, P.recoil],
      uWire: [1, -P.lunge * 0.35 - P.lean * 0.4, -bob * 0.4 + Math.abs(P.lunge) * 0.15, 1],
    }, {
      uTime: s, uFlash: this.fxv.flash, uBlock: this.fxv.block, uGlitch: this.fxv.glitch,
      uShadow: 1 - bob * 1.5, uShadowX: 0.5 + P.lunge * 0.12, uImpact: this.fxv.impact,
    });
  }

  // ---- moves ----
  async hurt() {
    this.fxv.flash = 1; this.to({ flash: 0 }, 260, "lin", this.fxv);
    this.fxv.glitch = 1; this.to({ glitch: 0 }, 420, "lin", this.fxv);
    await this.to({ lean: 0.16, lunge: 0.12, flare: -0.4 }, 90, "out");
    await this.to({ lean: 0, lunge: 0, flare: 0 }, 520, "back");
  }
  // Claw slam: rear up and cock the claw behind the head, hang, then smash down
  // towards the teammate. onHit fires on contact (hit-stop, shake, etc.).
  async slam({ onHit } = {}) {
    const P = this.pose;
    await this.to({ lean: 0.22, bob: 0.1, lunge: 0.12, cs: 2.5, ce: 0.9, cg: 1.25, cw: 0.5, ns: 0.6, ne: 1.3, flare: 0.9 }, 520, "out");
    await this.to({ lean: 0.27, bob: 0.13, cs: 2.75, ce: 1.25 }, 260, "lin");      // the hang before the strike
    await this.to({ lean: -0.3, bob: -0.32, lunge: -0.42, cs: 0.75, ce: -0.15, cg: 0.2, cw: -0.25, ns: 0.15, ne: 0.6 }, 120, "in");
    this.fxv.impact = [0.2, 0.11, 0.001];
    this.to({ impact: [0.2, 0.11, 1] }, 520, "out", this.fxv);
    battleTime.hitstop(110);
    onHit && onHit();
    await this.to({ bob: -0.36, lunge: -0.45 }, 140, "out");
    await this.wait(240);
    await this.to({ ...REST, yaw: P.yaw }, 700, "io");
    this.fxv.impact = [0.2, 0.11, 0];
  }
  // Transition in: big blocks resolve down to the full-density pixels.
  async resolve(ms = 900, from = 48) {
    this.fxv.block = from;
    await this.to({ block: 1 }, ms, "out", this.fxv);
  }
}
