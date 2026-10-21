// Small 3D props drawn by the same hi-bit renderer as GOLEM and NOVA
// (pixel-gl.js), so they have the same lighting, outline and ramps (Isaac
// 2026-10-21: the flat 2D chains and drones looked cheap next to them).
// Each prop is rendered once into a sprite sheet of angles; abilities then
// stamp the frames on a "raw" effects layer (no second pixel pass).
//   link:  a spectral chain link (glowing violet), 16 angles x 2 twists (face / edge)
//   drone: GOLEM's mini drone (his armour, a red eye), 16 headings x 2 rotor frames
//   hook:  a three-pronged grappling hook (steel and orange), 16 angles
//   shard: the chain's spear tip, a violet crystal, 16 angles
//   missile: GOLEM's missile (steel, orange band, red nose, fins), 16 angles
import { PixelGL } from "./pixel-gl.js";

const MODEL = `
uniform vec2 uRes; uniform float uKind, uAng, uTwist, uFrame, uView;
float gm; float gGlow; float gEye;
float sdLink(vec3 p, float le, float r1, float r2){ vec3 q = vec3(p.x, max(abs(p.y) - le, 0.), p.z); return length(vec2(length(q.xy) - r1, q.z)) - r2; }
float map(vec3 p){
  gm = 0.; gGlow = 1e5; gEye = 1e5;
  if (uKind < .5) {                       // chain link, long axis along x
    vec3 q = p; q.yz = R(uTwist) * q.yz;
    float d = sdLink(q.yxz, .13, .11, .042);
    gm = 1.; gGlow = d; return d;
  }
  if (uKind < 1.5) {                      // drone: a squat armoured pod with a red eye and two rotors
    vec3 q = p; q.xz = R(uTwist) * q.xz;
    float body = sdRBox(q, vec3(.3, .12, .22), .07);
    body = smin(body, length(q - vec3(0., .1, 0.)) - .17, .06);
    float frame = sdBox(q - vec3(0., -.02, 0.), vec3(.33, .025, .25));
    float d = body; gm = 2.;
    if (frame < d) { d = frame; gm = 3.; }
    vec3 e = q - vec3(-.3, .0, 0.);
    float eye = length(e) - .09; gEye = eye;
    if (eye < d) { d = eye; gm = 4.; }
    for (int s = -1; s <= 1; s += 2) {
      vec3 r = q - vec3(.05, .14, .32*float(s));
      float pod = sdCylY(r, .07, .05);
      float blade = sdCylY(r - vec3(0., .07, 0.), .2, .006);
      blade = max(blade, -(abs(sin(atan(r.z, r.x)*2. + uFrame*1.57)) - .55));   // two blades, turning
      if (pod < d) { d = pod; gm = 3.; }
      if (blade < d) { d = blade; gm = 2.; }
    }
    float gun = sdCap(q, vec3(-.25, -.12, 0.), vec3(-.45, -.15, 0.), .03);
    if (gun < d) { d = gun; gm = 3.; }
    return d;
  }
  if (uKind < 2.5) {                      // grappling hook pointing along +x
    float shaft = sdCap(p, vec3(-.32, 0., 0.), vec3(.12, 0., 0.), .045);
    float ring = sdTorZ(p.yzx - vec3(0., 0., -.37), .06, .018);
    float d = min(shaft, ring); gm = 5.;
    for (int i = 0; i < 3; i++) {
      float a = float(i)*2.094 + .4;
      vec3 q = p - vec3(.12, 0., 0.); q.yz = R(a) * q.yz;
      float prong = sdCapT(q, vec3(0.), vec3(-.02, .2, 0.), .04, .03);
      prong = min(prong, sdCapT(q, vec3(-.02, .2, 0.), vec3(-.14, .27, 0.), .03, .008));
      if (prong < d) { d = prong; gm = 6.; }
    }
    float tip = sdCapT(p, vec3(.12, 0., 0.), vec3(.24, 0., 0.), .05, .005);
    if (tip < d) { d = tip; gm = 6.; }
    return d;
  }
  if (uKind > 3.5) {                      // GOLEM's missile pointing along +x: a steel body, an orange band, a red nose, four fins
    float d = sdCap(p, vec3(-.27, 0., 0.), vec3(.16, 0., 0.), .068); gm = 5.;
    float band = sdCylY(p.yxz - vec3(0., .1, 0.), .074, .025);
    if (band < d) { d = band; gm = 6.; }
    float nose = sdCapT(p, vec3(.16, 0., 0.), vec3(.33, 0., 0.), .068, .008);
    if (nose < d) { d = nose; gm = 4.; }
    for (int i = 0; i < 4; i++) {
      vec3 q = p; q.yz = R(float(i)*1.5708 + .785 + uFrame) * q.yz;
      float fin = sdBox(q - vec3(-.23, .1, 0.), vec3(.06, .055, .007));
      if (fin < d) { d = fin; gm = 3.; }
    }
    return d;
  }
  // a crystal spear tip pointing along +x
  vec3 q = p; q.yz = R(uFrame) * q.yz;
  float d = max(sdOct(vec3(q.x*.55, q.y, q.z), .1), -q.x - .05);
  gm = 1.; gGlow = d; return d;
}
vec3 nrm(vec3 p){ const vec2 k = vec2(1., -1.)*.002; return normalize(k.xyy*map(p + k.xyy) + k.yyx*map(p + k.yyx) + k.yxy*map(p + k.yxy) + k.xxx*map(p + k.xxx)); }
out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  uv = R(uAng) * uv;
  vec3 ro = vec3(uv, -3.), rd = vec3(0., 0., 1.);
  // a three-quarter view from slightly above
  mat2 pitch = R(-.45);
  ro.yz = pitch * ro.yz; rd.yz = pitch * rd.yz;
  float t = 0., m = 0., minGlow = 1e5, minEye = 1e5;
  for (int i = 0; i < 90; i++) {
    float d = map(ro + rd*t);
    minGlow = min(minGlow, gGlow); minEye = min(minEye, gEye);
    if (d < .002) { m = gm; break; }
    t += d*.85; if (t > 7.) break;
  }
  float halo = uKind < .5 || (uKind > 2.5 && uKind < 3.5) ? exp(-max(minGlow, 0.)*18.)*.75 : 0.;
  float eyeGlow = exp(-max(minEye, 0.)*22.)*.8;
  if (m == 0.) { o = vec4(eyeGlow, 0., 1., halo); return; }
  vec3 p = ro + rd*t, n = nrm(p);
  vec3 L = normalize(vec3(-.55, .8, -.5));
  float key = max(dot(n, L), 0.), spec = pow(max(dot(reflect(-L, n), -rd), 0.), 16.);
  float sh = .1 + .62*key + .35*spec + .12*max(dot(n, -rd), 0.);
  if (m == 1.) sh = .35 + .45*key + .4*spec;   // spectral metal: brighter, glowing from inside
  if (m == 4.) sh = .75 + .25*spec;            // the eye
  o = vec4(clamp(sh, 0., 1.), m/16., t/7., halo);
}`;

// Materials: 1 spectral violet, 2 GOLEM armour, 3 dark frame, 4 red eye, 5 steel, 6 hot orange.
const PALETTES = [
  ["#1c0a3a", "#3a1a78", "#6232c8", "#9461f0", "#c9a8ff", "#f6ecff"],
  ["#141b20", "#24313a", "#3a4c56", "#57707a", "#7f99a1", "#b8ccd0"],
  ["#0e0b10", "#1a1519", "#2a2229", "#3b3139", "#53464f", "#6f6169"],
  ["#3a0606", "#7a0d0d", "#c41a1a", "#ff3a3a", "#ff8a8a", "#ffe0e0"],
  ["#1a1d22", "#2e333b", "#4a525e", "#6e7887", "#a2acba", "#e2e8ef"],
  ["#3a1804", "#743007", "#b8540c", "#ec8a1c", "#ffc04a", "#fff0b8"],
];
// glow colours: [violet halo x3, red eye x3]
const GLOW = ["#5a24a8", "#8a4dff", "#d6bcff", "#7a0d0d", "#ff3a3a", "#ffb0b0"];
const KINDS = { link: [0, 22, 0.62], drone: [1, 44, 1.1], hook: [2, 30, 0.8], shard: [3, 22, 0.55], missile: [4, 26, 0.85] };   // id, frame px, view

let cache = null;
// The sprite sheets: sheets[kind][variant][angle] = a canvas.
export function propSprites() {
  if (cache) return cache;
  cache = {};
  const c = document.createElement("canvas");
  let gl;
  try { gl = new PixelGL(c, { model: MODEL, palettes: PALETTES, glow: GLOW, extra: ["#cfd6e2", "#ffffff", "#07050c"] }); }
  catch { return (cache = null); }
  for (const [name, [id, size, view]] of Object.entries(KINDS)) {
    gl.resize(size, size);
    const variants = name === "link" ? [0, Math.PI / 2] : name === "drone" ? [0, 1] : [0];
    cache[name] = variants.map((v) => Array.from({ length: 16 }, (_, a) => {
      // links and drones turn in the picture plane by angle; drones also face their heading
      const ang = name === "drone" ? 0 : (a / 16) * Math.PI * (name === "link" ? 1 : 2);
      const u = { uKind: id, uAng: -ang, uTwist: name === "link" ? v : name === "drone" ? (a / 16) * Math.PI * 2 : 0, uFrame: name === "drone" ? v : 0, uView: view };
      gl.draw(u, { uTime: 0, uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: 0, uShadowX: 0, uPlume: [0, 0, 0, 0] });
      const f = document.createElement("canvas"); f.width = size; f.height = size;
      f.getContext("2d").drawImage(c, 0, 0);
      return f;
    }));
  }
  gl.gl.getExtension("WEBGL_lose_context")?.loseContext();
  return cache;
}

// Stamp a sprite centred at (x, y). angle picks the nearest pre-rendered frame
// (links repeat every half turn); scale in stage px per sprite px.
export function stamp(g, frames, x, y, angle = 0, scale = 1, period = Math.PI * 2) {
  // (screen angles grow clockwise, the frames anticlockwise)
  const a = -angle, n = frames.length, i = ((Math.round(((a % period) + period) % period / period * n)) % n + n) % n, f = frames[i];
  const w = f.width * scale;
  g.drawImage(f, Math.round(x - w / 2), Math.round(y - w / 2), Math.round(w), Math.round(w));
}
