// The planets NOVA pulls out of her portals (Planetfall), drawn by the same
// hi-bit renderer as GOLEM and NOVA (pixel-gl.js): lit from the upper left so
// each has a shadowed crescent, with a dithered atmosphere halo and an outline.
// Each is rendered once into 16 spin frames; abilities stamp the frames with
// props-px.js stamp() on a raw sprite layer.
//   venus: swirling cream cloud bands     mars: rust red, dark plains, an ice cap
//   uranus: cyan, its near-vertical rings  jupiter: turbulent bands, the Great Red Spot
import { PixelGL } from "./pixel-gl.js";

const MODEL = `
uniform vec2 uRes; uniform float uKind, uSpin, uView;
float fbm2(vec3 p){ return .55*vnoise(p) + .3*vnoise(p*2.1 + 7.) + .15*vnoise(p*4.3 + 3.); }
out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  float r2 = dot(uv, uv);
  // Uranus's rings: a tilted plane, almost edge-on and almost upright
  float ringT = 1e5, ringD = 0.;
  if (uKind > 1.5 && uKind < 2.5) {
    vec3 rn = normalize(vec3(.96, .12, .26)), ro = vec3(uv, -5.);
    float t = -dot(ro, rn) / rn.z; vec3 p = ro + vec3(0., 0., t); ringD = length(p);
    if (ringD > 1.42 && ringD < 1.95 && fract(ringD*9.) > .25) ringT = t;
  }
  float sphT = r2 < 1. ? 5. - sqrt(1. - r2) : 1e5;
  if (sphT > 1e4 && ringT > 1e4) {
    float halo = r2 >= 1. ? exp(-(sqrt(r2) - 1.)*9.)*.9 : 0.;
    o = vec4(0., 0., 1., halo); return;
  }
  if (ringT < sphT) {   // the ring, in front of the planet or beside it
    float sh = .45 + .35*fract(ringD*3.7) + .15*sin(ringD*40.);
    if (r2 < 1. && ringT > 5.) sh *= .4;
    o = vec4(clamp(sh, 0., 1.), 6./16., .6, 0.); return;
  }
  vec3 n = vec3(uv, -sqrt(1. - r2));
  vec3 L = normalize(vec3(-.85, .5, -.3));
  float key = dot(n, L);
  float sh = .02 + 1.05*smoothstep(-.05, .9, key) + .14*pow(1. - abs(n.z), 3.)*step(.1, key);
  // surface coordinates: tip the axis, then spin
  float roll = uKind > 1.5 && uKind < 2.5 ? 1.45 : uKind > 2.5 ? -.08 : .15;
  vec3 q = n; q.xy = R(roll) * q.xy; q.xz = R(uSpin) * q.xz;
  float lat = q.y, lon = atan(q.z, q.x);
  float m = 1.;
  if (uKind < .5) {                                    // Venus
    float w = fbm2(vec3(lon*1.6, lat*7. + fbm2(q*3.)*2.2, 1.));
    m = w > .58 ? 8. : 1.; sh += (w - .5)*.25;
  } else if (uKind < 1.5) {                            // Mars
    float pl = fbm2(q*3.2 + 5.), cr = vnoise(q*14.);
    m = abs(lat) > .86 ? 4. : pl > .6 ? 3. : 2.;
    sh += (cr - .5)*.18;
  } else if (uKind < 2.5) {                            // Uranus
    m = 5.; sh += .06*sin(lat*9.) + (fbm2(q*2.) - .5)*.12;
  } else {                                             // Jupiter
    float la = lat + .07*fbm2(vec3(lon*2.5, lat*9., 2.)) - .035;
    float b = sin(la*15.);
    m = b > .35 ? 1. : b > -.25 ? 8. : 7.;
    if (abs(b) < .07) m = 3.;
    vec2 sp = vec2((lon - .9)*1.2, (lat + .36)*3.4);   // the Great Red Spot
    float spd = length(sp);
    if (spd < .5) { m = spd < .32 ? 7. : 8.; sh += .1*sin(spd*30. + atan(sp.y, sp.x)*2.); }
    sh += (fbm2(vec3(lon*4., la*30., 4.)) - .5)*.22;
  }
  o = vec4(clamp(sh, 0., 1.), m/16., .5 + n.z*.02, 0.);
}`;

const PALETTES = [
  ["#2a2014", "#5a4630", "#8f7650", "#c4aa7a", "#e8d6a8", "#fff6dc"],   // 1 cream
  ["#2a0d06", "#5a1d0c", "#8f3416", "#c4532a", "#e6814c", "#ffb88a"],   // 2 rust
  ["#120806", "#24120c", "#3a1f14", "#54301f", "#6e432d", "#8a5a40"],   // 3 dark brown
  ["#4a5a6a", "#7d8fa2", "#aebfd0", "#d8e4ee", "#f2f7fb", "#ffffff"],   // 4 ice
  ["#062a36", "#0d4a5c", "#1a7488", "#34a2b4", "#6ccbd6", "#b8f0f4"],   // 5 cyan
  ["#1c2228", "#333d48", "#52606e", "#7a8a98", "#a8b6c2", "#d6e0e8"],   // 6 ring
  ["#2e0c04", "#5c1a08", "#93300e", "#c9501c", "#ee7c36", "#ffb070"],   // 7 orange-red
  ["#241a10", "#4a3620", "#775a34", "#a6814e", "#cfac72", "#f0d8a2"],   // 8 tan
];
// id, canvas px, view (sets the planet's size in its canvas), halo colours
const KINDS = {
  venus: [0, 100, 2.35, ["#6a5a2a", "#b89a50", "#f0dc9a"]],
  mars: [1, 92, 2.35, ["#5a1a0a", "#a8401c", "#f08a5a"]],
  uranus: [2, 190, 4.6, ["#0d4a5c", "#34a2b4", "#b8f0f4"]],
  jupiter: [3, 240, 2.25, ["#5c2a0c", "#c9703a", "#ffd8a0"]],
};

let cache;
export function planetSprites() {
  if (cache !== undefined) return cache;
  const c = document.createElement("canvas");
  let gl;
  try { gl = new PixelGL(c, { model: MODEL, palettes: PALETTES, glow: ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000"], extra: ["#cfd6e2", "#ffffff", "#0a0608"] }); }
  catch (e) { console.error(e); return (cache = null); }
  cache = {};
  for (const [name, [id, size, view, halo]] of Object.entries(KINDS)) {
    gl.resize(size, size);
    halo.forEach((hex, k) => { const n = parseInt(hex.slice(1), 16); gl.glow.set([(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], k * 3); });
    cache[name] = Array.from({ length: 16 }, (_, f) => {
      gl.draw({ uKind: id, uSpin: (f / 16) * Math.PI * 2, uView: view }, { uTime: 0, uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: 0, uShadowX: 0, uPlume: [0, 0, 0, 0] });
      const out = document.createElement("canvas"); out.width = size; out.height = size;
      out.getContext("2d").drawImage(c, 0, 0);
      return out;
    });
    // the planet's radius in its canvas, for hit tests and placement
    cache[name].r = size / view;
  }
  gl.gl.getExtension("WEBGL_lose_context")?.loseContext();
  return cache;
}

// The current spin frame for a planet at time t (ms); spin = frames per second.
export const spinFrame = (frames, t, spin = 8) => frames[Math.floor((t / 1000) * spin) % frames.length];
