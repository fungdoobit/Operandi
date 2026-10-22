// GOLEM in hi-bit pixel art, modelled on Isaac's reference (2026-10-20): a wide
// armoured crab-hull with a stepped dome on its deck, missile-pod holes and
// back horns, an amber grid-patterned core eye, a dark ribbed jaw, a thruster
// underneath, spiky segmented arms ending in a huge claw (left) and a cannon
// (right), and blue ice crystals growing over the armour.
// The model is GLSL distance functions; poses are a handful of numbers tweened in JS.
import { PixelGL } from "./pixel-gl.js";
import { battleTime } from "../battle-time.js";

// Materials: 1 armour, 2 dark frame, 3 core (glows), 4 ice crystal, 5 crystal node (glows), 6 orange lights.
const PALETTES = [
  ["#0b0f13", "#162027", "#24323a", "#384b54", "#566d76", "#8ca2a9"],
  ["#09070b", "#140f13", "#211a1f", "#30252c", "#45363f", "#5e4b55"],
  ["#140202", "#4a0806", "#9a150c", "#e83416", "#ff8a3a", "#ffe2b0"],
  ["#07122a", "#0e2348", "#183a6a", "#285a90", "#5486b8", "#a2c6e2"],
  ["#3a0606", "#7a0d0a", "#c41a12", "#ff3a24", "#ff9a7a", "#ffe6dc"],
  ["#240404", "#580808", "#a0120e", "#e8261a", "#ff6a4a", "#ffd2c4"],
];
// 2026-10-22 (Isaac: "much more threatening"): red-hot eye, red warning lights and nodes, darker armour and ice.
const GLOW = ["#8a0d06", "#ff3a14", "#ffb08a", "#7a0d0a", "#ff3a24", "#ffb0a0"];
const EXTRA = ["#c9d3dc", "#ffffff", "#0b0910"]; // exhaust grey, exhaust white, outline

// Shared with the JS that finds points on him (keep in step with the GLSL).
const SH = [1.12, -0.1, 0.05]; // shoulder, in body space (x mirrored per arm)
const EL = [0.66, 0, 0];        // elbow, in shoulder space
const OFF = [-0.45, -0.2];     // camera offset (GOLEM sits right of centre: room to reach left)

const MODEL = `
uniform vec2 uRes; uniform float uTime, uYaw, uPitch, uView, uLift, uTilt, uLook;
uniform vec4 uBody;  // lean, bob, lunge, core flare
uniform vec4 uClaw;  // shoulder, elbow, forearm pitch, thumb open
uniform vec4 uCan;   // shoulder, elbow, forearm pitch, charge
float gm; float gCore; float gNode; vec3 gLp; vec3 gCp;
void U(inout float d, float nd, float m, vec3 lp){ if (nd < d) { d = nd; gm = m; gLp = lp; } }
const vec3 SH = vec3(${SH.join(",")});
const vec3 EL = vec3(${EL.join(",")});

void node(inout float d, vec3 p, vec3 c){ float n = length(p - c) - .045; U(d, n, 5., p); gNode = min(gNode, n); }

// Upper arm: shoulder ball, three spiky dark segments, an armour plate on top.
void arm(vec3 q, inout float d){
  U(d, length(q) - .22, 2., q);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec3 s = q - vec3(.15 + fk*.18, 0., 0.);
    U(d, sdRBox(s, vec3(.085, .18 - .015*fk, .18 - .015*fk), .06), 2., s);
    U(d, sdCapT(s, vec3(0., .1, .03), vec3(.06, .27 - .03*fk, .12), .05, .0), 2., s);
  }
  U(d, sdRBox(q - vec3(.33, .13, -.03), vec3(.28, .06, .18), .045), 1., q);
  node(d, q, vec3(.36, .16, -.12));
  U(d, length(q - EL) - .18, 2., q);
}

// Left forearm: a huge armoured gauntlet tapering to a pointed claw, with a thumb hook.
void claw(vec3 e, inout float d){
  U(d, sdRBox(e - vec3(0., -.24, 0.), vec3(.34, .26, .33), .12), 1., e);
  U(d, sdCylY(e - vec3(0., -.53, 0.), .32, .05), 2., e);
  vec3 b = e - vec3(0., -.58, 0.);
  b.z *= 1.15;
  float blade = sdCapT(b, vec3(0.), vec3(-.06, -.9, -.06), .32, .06);
  blade = smin(blade, sdCapT(b, vec3(-.06, -.88, -.06), vec3(.16, -1.16, -.04), .07, .005), .05);   // the tip hooks inward
  blade = max(blade, -sdBox(b - vec3(-.02, -.5, -.3), vec3(.4, .014, .07)));   // plate seams
  blade = max(blade, -sdBox(b - vec3(-.03, -.25, -.3), vec3(.4, .014, .07)));
  U(d, blade, 1., b);
  vec3 t = b - vec3(.24, .06, 0.); t.xy = R(-uClaw.w) * t.xy;
  U(d, sdCapT(t, vec3(0.), vec3(.22, -.38, -.04), .12, .045), 1., t);
  U(d, sdCapT(t, vec3(.22, -.38, -.04), vec3(.08, -.66, -.06), .045, .005), 1., t);
  node(d, b, vec3(-.15, -.12, -.3)); node(d, e, vec3(.12, -.3, -.36)); node(d, e, vec3(-.2, -.12, -.36));
}

// Right forearm: a big cannon (bore at the end) with a hook blade underneath.
void cannon(vec3 e, inout float d){
  U(d, sdCylY(e - vec3(0., -.42, 0.), .33, .42), 1., e);
  for (int k = 0; k < 2; k++) U(d, sdCylY(e - vec3(0., -.18 - float(k)*.36, 0.), .37, .035), 2., e);
  float muzzle = sdCylY(e - vec3(0., -.92, 0.), .34, .09);
  muzzle = max(muzzle, -sdCylY(e - vec3(0., -1.02, 0.), .22, .5));
  U(d, muzzle, 2., e);
  U(d, sdCylY(e - vec3(0., -.82, 0.), .26, .02), 2., e);
  U(d, sdCapT(e, vec3(.26, -.6, -.05), vec3(.5, -1.08, -.14), .1, .04), 1., e);
  U(d, sdCapT(e, vec3(.5, -1.08, -.14), vec3(.3, -1.3, -.16), .04, .005), 1., e);
  float shot = length(e - vec3(0., -.98, 0.)) - .17*uCan.w;
  U(d, shot, 3., e);
  gCore = min(gCore, length(e - vec3(0., -1.02, 0.)) - .05 - .18*uCan.w);
  node(d, e, vec3(-.2, -.36, -.28)); node(d, e, vec3(.22, -.66, -.26));
}

float map(vec3 p){
  gm = 0.; gCore = 1e5; gNode = 1e5;
  float d = 1e5;
  p.xz = R(uYaw) * p.xz; p.yz = R(uPitch) * p.yz;
  p.y -= uBody.y + uLift; p.x -= uBody.z;
  p.xy = R(uBody.x) * p.xy; p.yz = R(uTilt) * p.yz;
  if (sdBox(p - vec3(0., -.4, 0.), vec3(2.6, 2.3, 1.6)) > .3) return 1.;
  vec3 P = p;      // arms use the unstretched space
  p.x /= 1.22;     // the hull is built narrow and stretched wide
  vec3 a = vec3(abs(p.x), p.yz);

  // hull: a wide trapezoid, chamfered at the corners; upper armour slab overhangs a darker lower half
  float hull = extrude(sdTrap(p.xy, .62, 1., .32), p.z, .55);
  hull = max(hull, (a.x - p.z - 1.28)*.7071);
  hull = max(hull, (a.x + p.z - 1.4)*.7071);
  float upper = max(hull, .06 - p.y);
  upper = max(upper, -sdBox(vec3(a.x - .42, p.y - .32, p.z), vec3(.012, .03, .6)));     // deck seams
  upper = max(upper, -sdBox(vec3(p.x, p.y - .17, p.z + .55), vec3(1., .012, .03)));      // front band seam
  vec3 c = p - vec3(0., -.1, -.53);
  float lower = max(extrude(sdTrap(p.xy, .58, .95, .32), p.z + .03, .5), p.y - .06);
  lower = max(lower, -(length(vec3(c.x/1.3, c.y, c.z)) - .21));                        // core socket
  // missile pods: three holes through each wing
  vec3 w = vec3(a.x - .72, p.y - .37, p.z - .03);
  float wing = sdRBox(w, vec3(.27, .05, .44), .03);
  for (int k = 0; k < 3; k++) {
    vec3 h = w - vec3(k == 2 ? .01 : (k == 0 ? -.09 : .11), 0., k == 2 ? -.02 : .2);
    float hole = sdCylY(h - vec3(0., -.05, 0.), .07, .16);
    wing = max(wing, -hole); upper = max(upper, -hole);
  }
  U(d, upper, 1., p); U(d, lower, 2., p); U(d, wing, 1., p);
  // centre plate and the stepped, pointed dome
  U(d, sdRBox(p - vec3(0., .36, .02), vec3(.38, .06, .5), .04), 1., p);
  for (int k = 0; k < 4; k++) {
    float fk = float(k), rx = .34 - fk*.07, rz = .42 - fk*.085;
    vec3 q = p - vec3(0., .43 + fk*.045, .02 + fk*.03);
    q.z += abs(q.x)*.55;
    float dk = sdCylY(vec3(q.x/rx, q.y, q.z/rz)*.36, .36, .022)*min(rx, rz)/.36;
    U(d, dk, 1., p);
  }
  // horns along the back and at the outer corners
  for (int k = 0; k < 2; k++) {
    float x = .6 + float(k)*.32;
    vec3 m = vec3(x + .05, .55, .5);
    U(d, sdCapT(a, vec3(x, .36, .38), m, .08, .04), 2., a);
    U(d, sdCapT(a, m, m + vec3(.1, .2, -.06), .04, .0), 2., a);
  }
  U(d, sdCapT(a, vec3(.98, .3, -.05), vec3(1.26, .48, .02), .07, .0), 2., a);
  U(d, sdCapT(a, vec3(1., .34, -.3), vec3(1.18, .56, -.42), .05, .0), 2., a);
  // core: ellipse socket ring and the amber orb
  U(d, sdTorZ(vec3(c.x/1.3, c.y, c.z + .01), .205, .04), 2., c);
  float orb = (length(vec3(c.x/1.3, c.y, c.z + .03)) - .185)*.8;
  U(d, orb, 3., c); gCore = min(gCore, orb); gCp = c;
  // orange lights: slot above the core, two side lamps, vent slits
  U(d, sdBox(p - vec3(0., .14, -.555), vec3(.022, .05, .02)), 6., p);
  U(d, length(vec3(a.x - .44, p.y + .02, p.z + .53)) - .045, 6., a);
  vec3 vs = vec3(a.x - .66, p.y - .1, p.z + .565);
  U(d, sdBox(vs, vec3(.07, .014, .02)), 6., vs);
  U(d, sdBox(vs - vec3(.0, -.05, 0.), vec3(.07, .014, .02)), 6., vs);
  // crystal nodes on the hull
  node(d, a, vec3(.56, .43, -.3)); node(d, a, vec3(.88, .3, -.15)); node(d, a, vec3(.3, -.04, -.55));
  node(d, a, vec3(.72, -.12, -.33)); node(d, a, vec3(.2, .39, .3)); node(d, a, vec3(.62, .17, -.56));
  // jaw: dark block with grille slits, mandible plates either side
  vec3 j = p - vec3(0., -.42, -.33);
  float jaw = sdRBox(j, vec3(.34, .09, .16), .04);
  vec3 jj = j; jj.y = mod(jj.y + .025, .05) - .025;
  if (abs(j.y) < .07) jaw = max(jaw, -sdBox(jj - vec3(0., 0., -.16), vec3(.26, .01, .03)));
  U(d, jaw, 2., j);
  vec3 mn = vec3(a.x - .42, p.y + .36, p.z + .36); mn.xy = R(.5) * mn.xy;
  U(d, sdRBox(mn, vec3(.14, .06, .12), .04), 2., mn);
  // hip block with two pods, thruster nozzle underneath
  vec3 h = p - vec3(0., -.62, -.02);
  U(d, sdRBox(h, vec3(.3, .13, .24), .05), 2., h);
  vec3 pd = vec3(a.x - .36, p.y + .66, p.z + .05);
  U(d, sdRBox(pd, vec3(.08, .13, .13), .04), 1., pd);
  U(d, sdRBox(pd - vec3(.02, -.14, -.02), vec3(.1, .04, .16), .03), 2., pd);
  U(d, max(sdCylY(p - vec3(0., -.79, -.02), .16, .05), -sdCylY(p - vec3(0., -.85, -.02), .1, .05)), 2., p);
  // arms (both built outward along +x, the left one mirrored)
  p = P;
  vec3 q = vec3(-p.x, p.yz) - SH;
  q.xy = R(-uClaw.x) * q.xy;
  arm(q, d);
  vec3 e = q - EL; e.xy = R(-uClaw.y) * e.xy; e.yz = R(-uClaw.z) * e.yz;
  claw(e, d);
  q = p - SH;
  q.xy = R(-uCan.x) * q.xy;
  arm(q, d);
  e = q - EL; e.xy = R(-uCan.y) * e.xy; e.yz = R(-uCan.z) * e.yz;
  cannon(e, d);
  return d;
}

vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.)*.002;
  return normalize(k.xyy*map(p + k.xyy) + k.yyx*map(p + k.yyx) + k.yxy*map(p + k.yxy) + k.xxx*map(p + k.xxx));
}

out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  vec3 ro = vec3(uv.x + ${OFF[0].toFixed(2)}, uv.y + ${OFF[1].toFixed(2)}, -6.), rd = vec3(0., 0., 1.);
  float t = 0., minCore = 1e5, minNode = 1e5, m = 0.;
  for (int i = 0; i < 120; i++) {
    float d = map(ro + rd*t);
    minCore = min(minCore, gCore); minNode = min(minNode, gNode);
    if (d < .0025) { m = gm; break; }
    t += d*.8;
    if (t > 12.) break;
  }
  float glow = clamp(exp(-max(minCore, 0.)*12.)*(.45 + .6*uBody.w), 0., 1.);
  float nglow = exp(-max(minNode, 0.)*30.)*.28;
  if (m == 0.) { o = vec4(nglow, 0., 1., glow); return; }
  vec3 p = ro + rd*t;
  map(p); m = gm; vec3 lp = gLp, cp = gCp;
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(-.55, .8, -.5)), Rm = normalize(vec3(.9, .3, .3));
  float key = max(dot(n, L), 0.);
  float ao = clamp(map(p + n*.06)/.06, 0., 1.)*.5 + clamp(map(p + n*.16)/.16, 0., 1.)*.5;
  float spec = pow(max(dot(reflect(-L, n), -rd), 0.), 14.);
  float sh;
  if (m == 3.) {
    // amber eye: hot centre fading to a deep edge, a honeycomb grid, a glint
    // a red-hot iris with a black slit pupil that follows the teammate (uLook)
    // and narrows when he flares up
    vec2 e2 = vec2(cp.x/1.3, cp.y)/.185, q = e2 - vec2(uLook*.3, 0.);
    float r = length(q);
    sh = .98 - .5*r*r + .12*uBody.w + .07*sin(atan(q.y, q.x)*13. + r*6.);
    if (r > .58 && r < .7) sh -= .45;                                  // the dark ring round the iris
    float pw = max(.05, .15 - .045*clamp(uBody.w, 0., 2.));
    if (q.x*q.x/(pw*pw) + q.y*q.y/.4 < 1.) sh = .0;                   // the slit
    else if (q.x*q.x/((pw + .07)*(pw + .07)) + q.y*q.y/.5 < 1.) sh = min(sh, .95) + .1;   // a hot rim round it
    if (length(e2 - vec2(-.42, .42)) < .1) sh = 1.;
  }
  else if (m == 5.) { float f = max(dot(n, normalize(vec3(-.4, .5, -1.))), 0.); sh = .12 + .3*f + .12*sin(uTime*2.4 + p.x*9.); }   // dim embers, pulsing
  else if (m == 6.) sh = .7 + .2*uBody.w + .1*max(dot(n, -rd), 0.);
  else {
    sh = .07 + .62*key*mix(.55, 1., ao) + .3*spec + .1*ao + .1*max(dot(n, Rm), 0.);
    // ice crystals growing over the armour in patches
    float ice = vnoise(lp*4. + 7.)*.7 + vnoise(lp*12. + 3.)*.3;
    // cracks in the armour leaking red light
    float ck = abs(vnoise(lp*vec3(5., 2.6, 5.) + 11.) - .5) + abs(vnoise(lp*9. + 4.) - .5)*.35;
    if (m == 1. && ck < .045 && vnoise(lp*2.2 + 1.) > .4) { m = 6.; sh = .75 + .25*sin(uTime*3. + lp.x*8.)*.5; }
    else if (ice > .74) { m = 4.; sh = .3 + .4*key + .25*vnoise(floor(lp*18.)) + .35*spec + (ice > .79 ? .12 : 0.); }
    // the core lights the metal right around it
    else if (gCore < .07 && cp.y > -.1) { m = 6.; sh = .3 + .5*(1. - gCore/.07); }
  }
  o = vec4(clamp(sh, 0., 1.), m/16., t/12., glow);
}`;

const EASE = {
  lin: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

// ca/ce/cp: claw shoulder, elbow, forearm pitch; cg thumb open. na/ne/np, charge: cannon.
export const REST = { lean: 0, bob: 0, lunge: 0, tilt: 0, flare: 0, ca: -0.85, ce: 0.95, cp: 0.25, cg: 0, na: -0.85, ne: 0.95, np: 0.85, charge: 0, thrust: 0.55, yaw: 0.22 };

const HUNCH = 0.14, LEAN = 0.05;   // his menacing stance (2026-10-22)
const rot = (a, b, t) => { const c = Math.cos(t), s = Math.sin(t); return [c * a - s * b, s * a + c * b]; };

export class PixelGolem {
  // host: element the canvas goes in. w,h: art pixels. px: screen px per art pixel.
  constructor(host, { w = 416, h = 384, px = 2, view = 4.8 } = {}) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "px-golem";
    Object.assign(this.canvas.style, { width: w * px + "px", height: h * px + "px", imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.canvas.width = w; this.canvas.height = h;
    this.gl = new PixelGL(this.canvas, { model: MODEL, palettes: PALETTES, glow: GLOW, extra: EXTRA });
    this.view = view;
    this.pose = { ...REST };
    this.fxv = { flash: 0, block: 1, glitch: 0 };
    this.tweens = [];
    this.at = 0; this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.render();
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
  rest(ms = 600) { return this.to({ ...REST }, ms, "io"); }
  loop(now) {
    if (!this.canvas.isConnected) return; // removed from the page: stop
    const frame = now - this.last, raw = Math.min(frame, 50); this.last = now;
    // If frames run slow (a weaker graphics chip), draw him every other frame:
    // 30 fps pixel art still looks right and keeps the rest of the page smooth.
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
    const s = this.at / 1000, P = this.pose;
    // idle hover on top of the pose
    const bob = Math.sin(s * 1.6) * 0.04 + P.bob, sway = Math.sin(s * 1.6 - 0.8);
    this.u = {
      // a constant hunch over the teammate, and the eye's slit following him with little darting moves
      uTime: s, uYaw: P.yaw, uPitch: 0.38, uView: this.view, uLift: 0.12, uTilt: P.tilt + HUNCH,
      uLook: -0.55 + 0.18 * Math.sin(s * 0.9) * Math.sin(s * 2.3) + 0.12 * Math.sign(Math.sin(s * 0.37)),
      uBody: [P.lean + LEAN + Math.sin(s * 0.8) * 0.012, bob, P.lunge, P.flare + 0.15 * Math.sin(s * 3.1)],
      uClaw: [P.ca + sway * 0.03, P.ce - sway * 0.04, P.cp, P.cg],
      uCan: [P.na - sway * 0.03, P.ne + sway * 0.04, P.np, P.charge],
    };
    const noz = this.toCanvas([0, -0.84, -0.02]), mid = this.toCanvas([0, -0.84, 0]);
    const flick = 0.85 + 0.15 * Math.sin(s * 40);
    this.gl.draw(this.u, {
      uTime: s, uFlash: this.fxv.flash, uBlock: this.fxv.block, uGlitch: this.fxv.glitch,
      uShadow: 1 - bob * 1.5, uShadowX: mid[0] / this.canvas.width,
      uPlume: [noz[0] / this.canvas.width, noz[1] / this.canvas.height, 0.028 + 0.012 * P.thrust, P.thrust * flick],
    });
  }

  // ---- finding points on him (mirrors the GLSL transforms, run backwards) ----
  // L: a point in body space, or in a forearm's space when part is "claw"/"cannon".
  toCanvas(L, part) {
    const u = this.u; let [x, y, z] = L;
    if (part) {
      const A = part === "claw" ? u.uClaw : u.uCan, sg = part === "claw" ? -1 : 1;
      [y, z] = rot(y, z, A[2]); [x, y] = rot(x, y, A[1]);
      x += EL[0]; y += EL[1]; z += EL[2];
      [x, y] = rot(x, y, A[0]);
      x = sg * (x + SH[0]); y += SH[1]; z += SH[2];
    }
    [y, z] = rot(y, z, -u.uTilt); [x, y] = rot(x, y, -u.uBody[0]);
    x += u.uBody[2]; y += u.uBody[1] + u.uLift;
    [y, z] = rot(y, z, -u.uPitch); [x, z] = rot(x, z, -u.uYaw);
    const H = this.canvas.height, W = this.canvas.width;
    return [(x - OFF[0]) * H / this.view + W / 2, (y - OFF[1]) * H / this.view + H / 2];
  }
  // Named points in page coordinates: core, claw (tip), muzzle, thruster.
  point(name) {
    const at = { core: [[0, -0.1, -0.6]], claw: [[-0.06, -1.5, -0.05], "claw"], muzzle: [[0, -1.05, 0], "cannon"], thruster: [[0, -0.84, -0.02]] }[name];
    return this.pagePoint(...at);
  }
  // Any point on him (body space, or a forearm's space) in page coordinates.
  pagePoint(L, part) {
    const [fx, fy] = this.toCanvas(L, part);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + fx * r.width / this.canvas.width, y: r.top + (this.canvas.height - fy) * r.height / this.canvas.height };
  }
  // The same, in CSS pixels inside the canvas (ignores the battle camera).
  localPoint(L, part) {
    const [fx, fy] = this.toCanvas(L, part), k = this.canvas.clientWidth / this.canvas.width;
    return { x: fx * k, y: (this.canvas.height - fy) * k };
  }

  // ---- reactions ----
  async hurt({ crit = false } = {}) {
    this.fxv.flash = 1; this.to({ flash: 0 }, crit ? 340 : 240, "lin", this.fxv);
    this.fxv.glitch = 1; this.to({ glitch: 0 }, crit ? 600 : 400, "lin", this.fxv);
    await this.to({ lean: crit ? 0.24 : 0.14, lunge: crit ? 0.22 : 0.12, flare: -0.4, bob: 0.06 }, 90, "out");
    await this.to({ lean: 0, lunge: 0, flare: 0, bob: 0 }, 560, "back");
  }
  // Transition in: big blocks resolve down to the full-density pixels.
  async resolve(ms = 900, from = 48) {
    this.fxv.block = from;
    this.render();   // draw the blocky first frame now, not one frame late
    await this.to({ block: 1 }, ms, "out", this.fxv);
  }
}
