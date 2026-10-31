// Playtime's island (PRD Addendum O): one level's island in hi-bit pixel art, drawn by the model pass of NOVA's and
// GOLEM's renderer (pixel-gl.js), seen from a camera you can turn all the way round. The island's shader is written
// from the level's map, so every level has its own shape. NOVA, her heading arrow and the island's small life
// (fireflies, butterflies) are drawn INTO the island's picture with a depth test, so a tree in front hides them.
import { PixelGL, SDF_LIB } from "../pixel/pixel-gl.js";
import { PixelNova } from "../pixel/nova-px.js";

export const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]];   // east, north, west, south (north is away from the camera)
const TYPE = { " ": 0, ".": 1, "=": 2, "~": 3, "#": 4, "H": 5 };
const TOP = { 0: 0, 1: 0, 2: .05, 3: -.12, 4: .5, 5: 1 };
const PROP = { T: 1, R: 2, B: 3, P: 4 };

export const PIX_PALETTES = [
  ["#16301f", "#22492a", "#336a32", "#4b8c3a", "#73b146", "#b2df62"],   // 1 grass
  ["#26242f", "#3c3946", "#57535f", "#77727e", "#9c97a0", "#cfcac8"],   // 2 stone
  ["#5a3a0a", "#8a5a10", "#c48a18", "#eab42a", "#ffd75a", "#fff4b0"],   // 3 Bit gold (and yellow flowers)
  ["#0b1a48", "#11307a", "#1b4bb0", "#2e72de", "#5ea2f2", "#c4e8ff"],   // 4 water
  ["#0f2a1d", "#173f28", "#235a31", "#367c3a", "#56a046", "#94cc62"],   // 5 leaves
  ["#24160f", "#3a2417", "#53351f", "#70492b", "#90613b", "#b48356"],   // 6 wood and roots
  ["#1b1220", "#2b1b2a", "#422a34", "#5f3c40", "#81564d", "#a97a63"],   // 7 earth
  ["#161624", "#252538", "#38384f", "#4f4f69", "#6d6d88", "#9696b0"],   // 8 rock
  ["#2b5aa8", "#5a8fd8", "#8fbdf0", "#c2e2ff", "#e6f4ff", "#ffffff"],   // 9 foam, spray (and white flowers)
  ["#1d0f3a", "#3a1f6e", "#5c35a8", "#8a5ae0", "#b994ff", "#efe3ff"],   // 10 switch crystals (and violet flowers)
];
// glows: the Bits (gold), then a lit switch's crystal (violet)
export const PIX_GLOW = ["#5a3c0e", "#c08a20", "#ffe08a", "#2e0f5c", "#7838d0", "#cba2ff"];
export const PIX_EXTRA = ["#9fb0ff", "#ffffff", "#06060f"];
const PIXEL_PASS = { uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: 0, uShadowX: .5, uFlat: 0, uPlume: [0, 0, 0, 0] };

// A seeded hash, so an island's details (lobes, roots, flowers) are the same every time you open its level.
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ================================================================ the level as the island reads it
export function levelGrid(layout) {
  const W = layout.ground[0].length, H = layout.ground.length;
  const map = [], props = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    map.push(TYPE[layout.ground[z][x]] ?? 0);
    props.push(PROP[layout.things[z][x]] ?? 0);
  }
  const at = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? 0 : map[z * W + x]);
  return { W, H, map, props, at, top: (x, z) => TOP[at(x, z)], prop: (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? 0 : props[z * W + x]) };
}
// Water on the island's edge pours off it: the side with the most edge water, and the run of water along it.
function findFall(G) {
  const sides = [
    { out: [1, 0], cells: (i) => [G.W - 1, i], n: G.H }, { out: [-1, 0], cells: (i) => [0, i], n: G.H },
    { out: [0, 1], cells: (i) => [i, G.H - 1], n: G.W }, { out: [0, -1], cells: (i) => [i, 0], n: G.W },
  ];
  let best = null;
  for (const s of sides) {
    const wet = [];
    for (let i = 0; i < s.n; i++) { const [x, z] = s.cells(i); if (G.at(x, z) === 3) wet.push(i); }
    if (wet.length && (!best || wet.length > best.wet.length)) best = { ...s, wet };
  }
  if (!best) return null;
  const a = Math.min(...best.wet), b = Math.max(...best.wet), mid = (a + b) / 2;
  const [mx, mz] = best.cells(mid), ox = (G.W - 1) / 2, oz = (G.H - 1) / 2;
  return { o: [mx - ox + best.out[0] * .5, mz - oz + best.out[1] * .5], out: best.out, along: [-best.out[1], best.out[0]], hw: (b - a + 1) / 2 - .07 };
}

// ================================================================ the island's shader, written for one level
const f = (x) => (Number.isInteger(x) ? x + "." : String(+x.toFixed(4)));
function worldGLSL(G) {
  const ox = (G.W - 1) / 2, oz = (G.H - 1) / 2, hw = G.W / 2, hh = G.H / 2, fall = findFall(G);
  // the rock hanging under the island: a big lobe in the middle and a few smaller ones, leaning and lumpy
  const R = Math.min(G.W, G.H);
  const lobes = [[0, 0, R * .3, 4.4 + R * .25, hash(G.W * 7 + G.H) - .5, hash(G.H * 3) - .5]];
  for (let i = 0; i < 6; i++) {   // round the edge, bulging out under it, each its own size and length
    const a = i * 1.047 + hash(i + G.W) * .6, rr = .3 + hash(i * 9 + 3) * .1;
    lobes.push([Math.cos(a) * G.W * rr, Math.sin(a) * G.H * rr, .45 + hash(i * 5 + 1) * .4, 1.6 + hash(i * 13 + 2) * 1.8, hash(i + 40) - .5, hash(i + 50) - .5]);
  }
  const lobeCode = lobes.map(([x, z, r, dep, lx, lz]) =>
    `  lb = smin(lb, sdCapT(q, vec3(${f(x)}, -1.1, ${f(z)}), vec3(${f(x + lx * 1.1)}, ${f(-dep)}, ${f(z + lz * 1.1)}), ${f(r)}, .08), .8);`).join("\n");
  return `
uniform float uTime; uniform vec4 uNova; uniform vec4 uBits[8]; uniform int uNBits; uniform vec4 uSw[8]; uniform int uNSw;
const int GW = ${G.W}, GH = ${G.H};
const vec2 OFF = vec2(${f(ox)}, ${f(oz)});
const int MAPG[${G.W * G.H}] = int[${G.W * G.H}](${G.map.join(",")});
const int PROPG[${G.W * G.H}] = int[${G.W * G.H}](${G.props.join(",")});
${fall ? `#define FALL 1
const vec2 FALL_O = vec2(${f(fall.o[0])}, ${f(fall.o[1])}), FALL_OUT = vec2(${f(fall.out[0])}, ${f(fall.out[1])}), FALL_ALONG = vec2(${f(fall.along[0])}, ${f(fall.along[1])});
const float FALL_HW = ${f(fall.hw)};` : ""}
float gm; float gCoin; float gGem;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
int cellAt(ivec2 c){ return (c.x < 0 || c.y < 0 || c.x >= GW || c.y >= GH) ? 0 : MAPG[c.y*GW + c.x]; }
int propAt(ivec2 c){ return (c.x < 0 || c.y < 0 || c.x >= GW || c.y >= GH) ? 0 : PROPG[c.y*GW + c.x]; }
float topOf(int t){ return t == 4 ? .5 : t == 5 ? 1. : t == 2 ? .05 : t == 3 ? -.12 : 0.; }
bool edgeCell(ivec2 c){ return cellAt(c + ivec2(1, 0)) == 0 || cellAt(c - ivec2(1, 0)) == 0 || cellAt(c + ivec2(0, 1)) == 0 || cellAt(c - ivec2(0, 1)) == 0; }
void Un(inout float d, float nd, float m){ if (nd < d) { d = nd; gm = m; } }
vec3 cellPos(ivec2 c){ return vec3(float(c.x) - OFF.x, 0., float(c.y) - OFF.y); }
// One square of the island: boxes that meet without seams, so the sides read as one cliff. The grass hangs over the
// top of the cliff in a ragged fringe.
void tile(inout float d, vec3 p, ivec2 c){
  int t = cellAt(c); if (t == 0) return;
  float top = topOf(t), bot = -.62;
  vec3 q = p - cellPos(c) - vec3(0., (top + bot)*.5, 0.);
  float nd = sdBox(q, vec3(.5, (top - bot)*.5, .5));
  float fringe = top - .08 - .09*vnoise(vec3(p.x*11., p.z*11., 3.)) - .05*vnoise(vec3(p.x*27., p.z*27., 7.));
  float m = t == 2 ? 2. : t == 3 ? (p.y > top - .04 ? 4. : 7.) : (p.y > fringe ? 1. : 7.);
  Un(d, nd, m);
}
// What stands on a square: trees that sway, pines, rocks, bushes; on bare grass, a few tufts.
void prop(inout float d, vec3 p, ivec2 c){
  int k = propAt(c), t = cellAt(c);
  vec3 q = p - cellPos(c) - vec3(0., topOf(t), 0.);
  float hc = h21(vec2(c));
  if (k == 0) {
    if (t != 1 && t != 4 && t != 5) return;
    for (int i = 0; i < 2; i++) {   // grass tufts
      vec2 o = vec2(h21(vec2(c) + float(i)*7.3), h21(vec2(c) + float(i)*3.1 + 9.)) - .5;
      if (h21(vec2(c) + float(i)*11.) < .35) continue;
      vec3 b = q - vec3(o.x*.72, 0., o.y*.72);
      float sw = sin(uTime*2.2 + hc*9. + float(i))*.025;
      float tf = min(sdCapT(b, vec3(0.), vec3(-.05 + sw, .15, .01), .035, 0.), sdCapT(b, vec3(.02, 0., 0.), vec3(.07 + sw, .12, -.02), .03, 0.));
      tf = min(tf, sdCapT(b, vec3(0., 0., .02), vec3(sw, .18, .05), .03, 0.));
      Un(d, tf, 1.);
    }
    return;
  }
  if (k == 1) {   // a round tree, its crown swaying
    Un(d, sdCapT(q, vec3(0.), vec3(0., .5, 0.), .1, .065), 6.);
    vec3 s = q; float sway = sin(uTime*1.3 + hc*6.)*.03*s.y; s.x += sway; s.z += sway*.6;
    float lv = length(s - vec3(0., .74, 0.)) - .36;
    lv = smin(lv, length(s - vec3(.1, 1.02, -.04)) - .25, .14);
    lv = smin(lv, length(s - vec3(-.16, .86, .12)) - .22, .1);
    Un(d, lv + (vnoise(s*8.) - .5)*.07, 5.);
  } else if (k == 4) {   // a pine: three tiers, swaying a little
    Un(d, sdCapT(q, vec3(0.), vec3(0., .35, 0.), .08, .06), 6.);
    vec3 s = q; s.x += sin(uTime*1.1 + hc*5.)*.025*s.y;
    float pn = 1e5;
    for (int i = 0; i < 3; i++) { float fi = float(i); pn = min(pn, sdCapT(s, vec3(0., .25 + fi*.26, 0.), vec3(0., .7 + fi*.26, 0.), .36 - fi*.08, .0)); }
    Un(d, pn + (vnoise(s*12.) - .5)*.04, 5.);
  } else if (k == 2) {
    vec3 r = q - vec3(0., .13, 0.); r.xz = R(.6 + hc*2.)*r.xz;
    Un(d, sdRBox(r, vec3(.24, .15, .2), .08) + (vnoise(q*9.) - .5)*.04, 8.);
  } else {
    float b = smin(length(q - vec3(-.08, .14, 0.)) - .2, length(q - vec3(.14, .11, .07)) - .15, .08);
    Un(d, b + (vnoise(q*11.) - .5)*.05, 5.);
  }
}
// Under squares on the island's edge: a root and a leafy vine hanging over the cliff, swaying.
void roots(inout float d, vec3 p, ivec2 c){
  if (cellAt(c) == 0 || !edgeCell(c)) return;
  vec3 cp = cellPos(c);
  vec2 od = vec2(0.);
  if (cellAt(c + ivec2(1, 0)) == 0) od = vec2(1., 0.); else if (cellAt(c - ivec2(1, 0)) == 0) od = vec2(-1., 0.);
  else if (cellAt(c + ivec2(0, 1)) == 0) od = vec2(0., 1.); else od = vec2(0., -1.);
  vec2 side = vec2(-od.y, od.x);
  for (int i = 0; i < 2; i++) {
    float fi = float(i), h = h21(vec2(c) + fi*17.3);
    if (h < .45) continue;
    float along = (h21(vec2(c) + fi*5.7) - .5)*.8, len = .35 + h*.85;
    vec3 a = cp + vec3(od.x*.47 + side.x*along, -.25 - fi*.12, od.y*.47 + side.y*along);
    float sw = sin(uTime*(1.1 + h) + h*20.)*.08;
    vec3 m = a + vec3(od.x*.08 + sw*.5, -len*.55, od.y*.08 + sw*.3), b = a + vec3(od.x*.03 + sw, -len, od.y*.03 + sw*.6);
    float r = min(sdCapT(p, a, m, .04, .03), sdCapT(p, m, b, .03, .008));
    Un(d, r, i == 0 ? 6. : 5.);
  }
}
// Bits: gold coins spinning over their squares.
void coins(inout float d, vec3 p){
  for (int i = 0; i < 8; i++) {
    if (i >= uNBits) break;
    vec4 b = uBits[i]; if (b.w < .01) continue;
    vec3 q = p - b.xyz; if (dot(q, q) > .5) { d = min(d, length(q) - .5); continue; }
    q.xz = R(uTime*2.2 + float(i)*2.)*q.xz;
    vec2 e = vec2(length(q.xy) - .2*b.w, abs(q.z) - .045*b.w);
    float cd = min(max(e.x, e.y), 0.) + length(max(e, 0.)) - .02*b.w;
    gCoin = min(gCoin, cd); Un(d, cd, 3.);
  }
}
// Switches: a stone plate with a crystal floating over it, dark when off and lit violet when on.
void switches(inout float d, vec3 p){
  for (int i = 0; i < 8; i++) {
    if (i >= uNSw) break;
    vec4 s = uSw[i]; vec3 q = p - s.xyz;
    if (dot(q, q) > 1.) { d = min(d, length(q) - .9); continue; }
    vec2 pl = vec2(length(q.xz) - .3, abs(q.y - .02) - .035);
    Un(d, min(max(pl.x, pl.y), 0.) + length(max(pl, 0.)) - .015, 2.);
    vec3 g = q - vec3(0., .36 + sin(uTime*2. + float(i))*.04*(.4 + s.w), 0.);
    g.xz = R(uTime*(.6 + s.w*1.4))*g.xz;
    float gem = sdOct(g*vec3(1., .62, 1.), .12);
    if (s.w > .5) gGem = min(gGem, gem);
    Un(d, gem, 10.);
  }
}
// The waterfall: it arcs out over the lip, ripples and wobbles as it falls, and breaks up at the bottom in a splash.
#ifdef FALL
const vec3 SPLASH = vec3(.38, -3.78, 0.);   // in the fall's own frame (out, up, along)
void splash(inout float d, vec3 q){
  q -= SPLASH;
  float bound = length((q - vec3(.2, .35, 0.))/vec3(1.15, .95, FALL_HW + .8));
  if (bound > 1.) { d = min(d, (bound - 1.)*.95 + .02); return; }
  float fo = 1e5;
  for (int j = 0; j < 5; j++) {
    float fj = float(j), zz = (fj - 2.)/2.*(FALL_HW - .1);
    vec3 c = vec3(.04*sin(uTime*3. + fj), sin(uTime*6. + fj*1.9)*.035, zz);
    fo = smin(fo, length(q - c) - (.2 + .05*sin(uTime*5. + fj*1.7)), .16);
  }
  fo += (vnoise(vec3(q.x*7., q.y*7. - uTime*3., q.z*7.)) - .5)*.08;
  Un(d, max(fo, -q.y - .12), 9.);
  for (int i = 0; i < 14; i++) {
    float fi = float(i), h = fract(sin(fi*12.9898)*43758.5453), h2 = fract(sin(fi*78.233)*12543.21);
    float ph = fract(uTime*.95 + h);
    vec3 v = vec3(.25 + h2*.75, .9 + h*.8, (h2 - .5)*1.1);
    if (i % 4 == 0) v.x = -v.x*.5;
    vec3 at = vec3(0., .02, (fract(h*7.31) - .5)*2.*FALL_HW) + vec3(v.x*ph, v.y*ph - 2.1*ph*ph, v.z*ph);
    Un(d, length(q - at) - .08*(1. - ph*.6), 9.);
  }
}
void waterfall(inout float d, vec3 p){
  vec2 rel = p.xz - FALL_O;
  vec3 q = vec3(dot(rel, FALL_OUT), p.y, dot(rel, FALL_ALONG));
  float wy = clamp(-q.y - .1, 0., 4.);
  if (q.x > -.4 && q.x < 1.4 && q.y < .2 && q.y > -4.3 && abs(q.z) < FALL_HW + .4) {
    float xc = .02 + .2*sqrt(wy) + (vnoise(vec3(q.z*5., q.y*2.2 + uTime*6., 0.)) - .5)*.07;
    float hz = FALL_HW - wy*.03 + (vnoise(vec3(wy*2.6 - uTime*5.5, sign(q.z)*7., 1.)) - .5)*.16;
    float bottom = -3.55 - vnoise(vec3(q.z*6., uTime*3.5, 2.))*.35;
    vec3 w = vec3(q.x - xc, q.y - (bottom - .1)*.5, q.z);
    Un(d, sdBox(w, vec3(.04 + wy*.018, (-.1 - bottom)*.5, max(hz, .1)))*.7, 4.);
  } else d = min(d, max(max(-.4 - q.x, q.x - 1.4), max(max(q.y - .2, -4.3 - q.y), abs(q.z) - FALL_HW - .4)) + .05);
  splash(d, q);
}
#endif
// The rock under the island: earth under the squares, then lumpy lobes that hang and lean, crumbling at the tips.
// The rock carries on straight down from the cliff, then draws in towards a point the deeper it goes (an upside-down
// hill), leaning and lumpy, with lobes hanging off it; ledges and grit on its face.
float base(vec3 p){
  float t = max(-p.y - .62, 0.), k = clamp(t/3.6, 0., 1.);
  vec3 q = p; q.xz += (vec2(vnoise(p*.8), vnoise(p*.8 + 9.)) - .5)*1.3*k;
  float shrink = t*.2 + t*t*.085, rr = min(.12 + t*.4, ${f(Math.min(hw, hh) - .05)});
  vec2 bq = abs(q.xz) - vec2(${f(hw)}, ${f(hh)}) + shrink + rr;
  float body = length(max(bq, 0.)) + min(max(bq.x, bq.y), 0.) - rr;
  float lb = 1e5;
${lobeCode}
  body = smin(body, lb, .6);
  body += (vnoise(p*1.2)*.55 + vnoise(vec3(p.x*2.2, p.y*5., p.z*2.2))*.3 + vnoise(p*6.5)*.15 - .5)*(.12 + .75*k);
  return max(body, p.y + .6)*.55;
}
float map(vec3 p){
  gm = 0.; float d = 1e5;
  vec2 g = p.xz + OFF; ivec2 c = ivec2(floor(g + .5)); ivec2 n = c + ivec2(g.x > float(c.x) ? 1 : -1, g.y > float(c.y) ? 1 : -1);
  if (p.y < 2.4 && p.y > -2.5) {
    if (p.y > -1.) {
      tile(d, p, c); tile(d, p, ivec2(n.x, c.y)); tile(d, p, ivec2(c.x, n.y)); tile(d, p, n);
      prop(d, p, c); prop(d, p, ivec2(n.x, c.y)); prop(d, p, ivec2(c.x, n.y)); prop(d, p, n);
    }
    if (p.y < -.2) { roots(d, p, c); roots(d, p, ivec2(n.x, c.y)); roots(d, p, ivec2(c.x, n.y)); roots(d, p, n); }
    // Only these four squares were checked. Anything in another square is at least as far as the edge of these four,
    // and nothing lies off the island's squares, so never step further than that (or a ray can land inside a tree).
    vec2 lo = vec2(min(c, n)) - .5, hi = vec2(max(c, n)) + .5;
    // (roots and the grass fringe hang a little past the island's edge, hence the .15)
    float edge = min(min(g.x - lo.x, hi.x - g.x), min(g.y - lo.y, hi.y - g.y)), grid = max(abs(p.x) - ${f(hw)}, abs(p.z) - ${f(hh)}) - .15;
    d = min(d, max(edge, grid) + .02);
  } else d = min(abs(p.y - 2.4), abs(p.y + 2.5)) + .05;
  float y = -p.y;
  Un(d, base(p), y > 1.5 + vnoise(p*1.7)*.8 ? 8. : 7.);
  // little rocks drifting under the island
  for (int i = 0; i < 3; i++) {
    float fi = float(i), a = uTime*.12 + fi*2.1;
    vec3 rp = vec3(cos(a)*(1.9 + fi*.5), -4.4 - fi*.45 + sin(uTime*.5 + fi)*.15, sin(a)*(1.6 + fi*.4));
    vec3 rq = p - rp; if (dot(rq, rq) > 1.) { d = min(d, length(rq) - .8); continue; }
    rq.xy = R(uTime*.3 + fi)*rq.xy;
    Un(d, sdOct(rq*vec3(1., 1.3, 1.), .17 + fi*.04) + (vnoise(rq*9.) - .5)*.05, 8.);
  }
#ifdef FALL
  waterfall(d, p);
#endif
  coins(d, p); switches(d, p);
  return d;
}
vec3 nrm(vec3 p){ vec2 e = vec2(.002, -.002);
  return normalize(e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) + e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx)); }
float shadow(vec3 ro, vec3 rd){ float r = 1., t = .03;
  for (int i = 0; i < 28; i++) { float h = map(ro + rd*t); r = min(r, 9.*h/t); t += clamp(h, .03, .3); if (r < .02 || t > 6.) break; } return clamp(r, 0., 1.); }
float ao(vec3 p, vec3 n){ float o = 0., s = 1.; for (int i = 1; i <= 4; i++) { float h = .05*float(i); o += (h - map(p + n*h))*s; s *= .6; } return clamp(1. - 2.4*o, 0., 1.); }
float detail(vec3 p, vec3 n, float m){
  float v = 0.;
  if (m == 1. && n.y > .6) {   // the lawn: grass texture, and every other square a shade lighter, so the squares read
    v += (vnoise(p*vec3(11., 1., 11.)) - .5)*.22 + (vnoise(p*31.) - .5)*.1;
    vec2 g = floor(p.xz + OFF + .5); v += mod(g.x + g.y, 2.) < .5 ? .04 : -.03;
  }
  if (m == 2. && n.y > .6) { vec2 f = fract((p.xz + OFF + .5)*2.); float s = min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)); v += s < .07 ? -.28 : (vnoise(p*14.) - .5)*.12; }
  if (m == 7.) v += sin(p.y*20. + vnoise(p*3.)*5.)*.07 + (vnoise(p*13.) - .5)*.12;
  if (m == 8.) v += (vnoise(p*7.) - .5)*.25;
  if (m == 5.) v += (vnoise(p*16.) - .5)*.25;
  return v;
}
float novaShade(vec3 p, vec3 n){ if (uNova.w <= 0. || n.y < .5) return 1.; float r = length(p.xz - uNova.xz); return 1. - .5*uNova.w*smoothstep(.34, .08, r); }
`;
}

function modelGLSL(G) {
  return `
uniform vec2 uRes;
${worldGLSL(G)}
uniform vec3 uCT, uCR, uCU, uCF; uniform float uScale;
const vec3 L = normalize(vec3(-.35, .85, .5));
out vec4 o;
void main(){
  vec2 q = (gl_FragCoord.xy - .5*uRes)/uScale;
  vec3 ro = uCT + uCR*q.x + uCU*q.y - uCF*24., rd = uCF;
  gCoin = 1e5; gGem = 1e5;
  float t = 0.; bool hit = false;
  for (int i = 0; i < 200; i++) { float d = map(ro + rd*t); if (d < .0025) { hit = true; break; } t += max(d*.85, .003); if (t > 48.) break; }
  float glow = exp(-max(gCoin, 0.)*9.), gem = exp(-max(gGem, 0.)*8.);
  if (!hit) { o = vec4(gem*.8, 0., 0., glow*.9); return; }
  vec3 p = ro + rd*t; float m = gm; vec3 n = nrm(p);
  float dif = max(dot(n, L), 0.)*shadow(p + n*.01, L);
  float sh = .14 + .62*dif + .24*ao(p, n)*(.55 + .45*n.y) + detail(p, n, m);
  if (m == 1. && n.y > .6) {   // flowers in the lawn: white, yellow and violet, never on a square with something on it
    vec2 fc = floor(p.xz*8.), cc = floor(p.xz + OFF + .5);
    float fh = h21(fc + 3.7);
    if (fh > .955 && propAt(ivec2(cc)) == 0 && cellAt(ivec2(cc)) == 1) {
      float which = h21(fc + 9.1); m = which < .4 ? 9. : which < .75 ? 3. : 10.;
      sh = .62 + .3*dif;
    }
  }
  if (m == 4.) {
    if (n.y > .5) {
#ifdef FALL
      float lip = dot(p.xz - FALL_O, FALL_OUT);
      sh = .42 + (vnoise(vec3((lip - uTime*.7)*5., dot(p.xz, FALL_ALONG)*7., uTime*.6)) - .5)*.42 + dif*.22 + .22*smoothstep(-.4, 0., lip);
#else
      sh = .45 + (vnoise(vec3(p.xz*6., uTime*1.2)) - .5)*.4 + dif*.25;
#endif
    } else {
      float wy2 = -p.y - .1, along = 0.;
#ifdef FALL
      along = dot(p.xz - FALL_O, FALL_ALONG);
#endif
      float s1 = vnoise(vec3(along*8., p.y*.7 + uTime*4.8, 0.)), s2 = vnoise(vec3(along*15. + 3., p.y*1.6 + uTime*7.5, 1.));
      sh = .26 + .42*s1 + .28*smoothstep(.6, .78, s2) + .32*smoothstep(.45, 0., wy2) + .3*smoothstep(2.9, 3.6, wy2) + .12*dif;
    }
  }
  if (m == 9.) sh = max(sh, .58 + .3*dif + .12*n.y + (vnoise(p*14. + uTime*2.) - .5)*.18);
  if (m == 3.) {
    float best = 1e5; vec4 b = vec4(0.);
    for (int i = 0; i < 8; i++) { if (i >= uNBits) break; float dd = length(p - uBits[i].xyz); if (dd < best) { best = dd; b = uBits[i]; } }
    float rr = best/max(b.w, .01);
    if (best < .5) sh = .36 + .5*dif + (rr > .16 ? .22 : rr < .07 ? .14 : 0.);
  }
  if (m == 10.) {   // a switch's crystal: dim when off, bright when on
    float on = 0.;
    for (int i = 0; i < 8; i++) { if (i >= uNSw) break; if (length(p - uSw[i].xyz) < .7) on = uSw[i].w; }
    if (on > 0. || dot(n, L) > -2.) sh = mix(.22 + .35*dif, .72 + .28*dif, on);
  }
  sh *= novaShade(p, n);
  o = vec4(clamp(sh, 0., 1.), m/16., clamp(t/48., 0., 1.), 0.);
}`;
}

// ================================================================ the composite: NOVA, the arrow and the island's life
// Runs in the island's own WebGL context right after it is drawn: copies the finished island, then lays the heading
// arrow, the fireflies and butterflies, and NOVA's picture over it, pixel for pixel, except where the island's surface
// is nearer the camera than they are (the model pass keeps each pixel's depth).
const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uWorld, uModel, uNova, uArrow; uniform vec2 uRes; uniform vec4 uNovaRect; uniform float uNovaT, uArrowT, uTime;
uniform vec4 uCrit[16]; uniform int uNCrit;
out vec4 o;
vec4 over(vec4 a, vec4 b){ float k = a.a + b.a*(1. - a.a); return k < 1e-4 ? vec4(0.) : vec4((a.rgb*a.a + b.rgb*b.a*(1. - a.a))/k, k); }
const float B4[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 w = texelFetch(uWorld, p, 0), m = texelFetch(uModel, p, 0);
  bool solid = (int(m.g*16. + .5) & 15) > 0; float wt = m.b*48.;
  vec4 a = texelFetch(uArrow, ivec2(p.x, int(uRes.y) - 1 - p.y), 0);
  if (a.a > 0. && !(solid && wt < uArrowT - .3)) w = over(a, w);
  // the island's life: x, y (art px from the bottom left), depth, kind (0 firefly, 1-3 butterfly colours) + phase
  for (int i = 0; i < 16; i++) {
    if (i >= uNCrit) break;
    vec4 c = uCrit[i]; vec2 d = gl_FragCoord.xy - c.xy;
    if (abs(d.x) > 4. || abs(d.y) > 4. || (solid && wt < c.z - .25)) continue;
    float kind = floor(c.w), ph = fract(c.w);
    if (kind < .5) {   // a firefly: a bright point in a dithered glow that pulses
      float pulse = .5 + .5*sin(uTime*3. + ph*40.), r = length(d), bay = (B4[(p.y & 3)*4 + (p.x & 3)] + .5)/16.;
      if (r < .8) w = vec4(mix(vec3(.85, 1., .55), vec3(1.), pulse), 1.);
      else if (r < 2.6 && pulse*(1. - r/2.6) > bay*.9) w = over(vec4(.7, .95, .35, .6), w);
    } else {           // a butterfly: a dark body, two wings that open and close
      float flap = abs(sin(uTime*14. + ph*30.)), wingW = floor(flap*2.6 + .5);
      vec3 col = kind < 1.5 ? vec3(1., .98, .9) : kind < 2.5 ? vec3(1., .82, .3) : vec3(.78, .6, 1.);
      vec2 q = floor(d + .5);
      if (q.x == 0. && q.y >= -1. && q.y <= 0.) w = vec4(.12, .08, .16, 1.);
      else if (abs(q.x) >= 1. && abs(q.x) <= wingW && q.y >= -1. && q.y <= 1. - step(1.5, abs(q.x))) w = vec4(col*(q.y < 0. ? .8 : 1.), 1.);
    }
  }
  ivec2 q = p - ivec2(uNovaRect.xy);
  if (q.x >= 0 && q.y >= 0 && q.x < int(uNovaRect.z) && q.y < int(uNovaRect.w)) {
    vec4 n = texelFetch(uNova, ivec2(q.x, int(uNovaRect.w) - 1 - q.y), 0);
    if (n.a > 0. && !(solid && wt < uNovaT - .4)) w = over(n, w);
  }
  o = w;
}`;

// ================================================================ small maths
export const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); } };
const basisFrom = (fwd) => { const F = v3.norm(fwd), Rr = v3.norm(v3.cross(F, [0, 1, 0])); return { F, R: Rr, U: v3.cross(Rr, F) }; };

// ================================================================ the island on the page
// yaw + spin: where the camera sits round the island (it starts front-right); pitch: how far it looks down.
export const cam = { yaw: Math.PI / 4, spin: 0, pitch: Math.PI / 6, vs: 0, target: null, pitchT: null, drag: null, auto: false };
export const N = { x: 0, z: 0, y: 0, dir: 0, yaw: 0, lean: 0, hideArrow: false, rect: null, depth: 0, arrowDepth: 0 };
// CSS px per art pixel: 1.8 normally (Isaac 2026-10-31: 2 was a bit heavy, 10% finer), 2.7 on slow devices
export const ART = { normal: 1.8, slow: 2.7 };
export const view = { time: 0, WW: 1, WH: 1, art: ART.normal, scale: 30, target: [0, -1.55, 0] };
let G = null, pix = null, comp = null, nova = null, els = null, critters = [];
export let bits = [], sws = [];   // what the island shows: [{x, z, s, lift}], [{x, z, on}]
const NOVA_ART = { w: 64, h: 76 };

const camBasis = () => { const y = cam.yaw + cam.spin, p = cam.pitch; return basisFrom([-Math.sin(y) * Math.cos(p), -Math.sin(p), -Math.cos(y) * Math.cos(p)]); };
// a point on the island to CSS px in the island's pane
export function project(p) {
  const B = camBasis(), d = v3.sub(p, view.target), k = view.scale * view.art;
  return [view.WW / 2 + v3.dot(d, B.R) * k, view.WH / 2 - v3.dot(d, B.U) * k];
}
const depthOf = (p) => v3.dot(v3.sub(p, view.target), camBasis().F) + 24;
export const topAt = (x, z) => (G ? G.top(x, z) : 0);
export const cellPos = (x, z) => [x - (G.W - 1) / 2, z - (G.H - 1) / 2];

export function initIsland({ world, pixCv, dirCv, novaHost }) {
  els = { world, pixCv, dirCv, novaHost };
  nova = new PixelNova(novaHost, { kind: "mooncloak", w: NOVA_ART.w, h: NOVA_ART.h, px: 2, view: 3.6, shadow: false });
  nova.bill = 1;   // her ring faces the camera as she turns (nova-px.js)
  return nova;
}

// A new level: a new island shader, and the Bits and switches in their places.
export function loadIsland(layout) {
  G = levelGrid(layout);
  const model = modelGLSL(G);
  if (!pix) pix = new PixelGL(els.pixCv, { model, palettes: PIX_PALETTES, glow: PIX_GLOW, extra: PIX_EXTRA });
  else { const old = pix.model; pix.model = pix.program("#version 300 es\nprecision highp float;\n" + SDF_LIB + model); pix.gl.deleteProgram(old); }
  bits = layout.bits.map(([x, z]) => ({ x, z, s: 1, lift: 0 }));
  sws = layout.switches.map(([x, z, on]) => ({ x, z, on: on ? 1 : 0, start: on ? 1 : 0 }));
  critters = makeCritters();
  fit();
}
export function resetIsland(layout) {
  const [x, z, dir] = layout.start;
  Object.assign(N, { x, z, y: 0, dir, yaw: dir * Math.PI / 2, lean: 0, hideArrow: false });
  bits.forEach((b) => Object.assign(b, { s: 1, lift: 0 }));
  sws.forEach((s) => (s.on = s.start));
}
// how big the island is drawn: the whole island, its rock and its trees fit the pane at any turn of the camera
function fit() {
  if (!G) return;
  const spanX = (G.W + G.H) * .707 + 2.1, spanY = (G.W + G.H) * .354 + 7.2;
  view.scale = Math.max(6, Math.min(view.WW / view.art / spanX, view.WH / view.art / spanY));
}
export function sizeIsland() {
  const r = els.world.getBoundingClientRect(); view.WW = r.width; view.WH = r.height;
  const w = Math.max(32, Math.round(view.WW / view.art)), h = Math.max(32, Math.round(view.WH / view.art));
  if (pix) pix.resize(w, h);
  els.dirCv.width = w; els.dirCv.height = h;
  fit();
}
// slower devices get bigger art pixels (ART.slow instead of ART.normal): a little chunkier, less than half the work
export function setArtPixel(px) { if (px !== view.art) { view.art = px; sizeIsland(); } }

// The island's small life: fireflies drifting round the trees and the island's edge, butterflies over the lawn.
function makeCritters() {
  const out = [], spots = [], lawn = [];
  for (let z = 0; z < G.H; z++) for (let x = 0; x < G.W; x++) {
    if (G.prop(x, z) === 1 || G.prop(x, z) === 4) spots.push([x, z]);
    if (G.at(x, z) === 1 && !G.prop(x, z)) lawn.push([x, z]);
  }
  for (let i = 0; i < 7; i++) {
    const s = spots.length ? spots[i % spots.length] : [hash(i) * G.W, hash(i + 9) * G.H];
    out.push({ kind: 0, at: cellPos(s[0], s[1]), top: G.top(Math.round(s[0]), Math.round(s[1])), r: .5 + hash(i * 3) * .5, h: .5 + hash(i * 5) * .9, ph: hash(i * 7), sp: .3 + hash(i * 11) * .4 });
  }
  for (let i = 0; i < Math.min(3, lawn.length); i++) {
    const s = lawn[Math.floor(hash(i * 13 + 2) * lawn.length)];
    out.push({ kind: 1 + (i % 3), at: cellPos(s[0], s[1]), top: G.top(s[0], s[1]), r: .6 + hash(i * 17) * .5, h: .3, ph: hash(i * 19), sp: .5 + hash(i * 23) * .3 });
  }
  return out;
}
function critterUniforms() {
  const arr = new Float32Array(64), t = view.time, H = els.pixCv.height;
  critters.forEach((c, i) => {
    const a = t * c.sp + c.ph * 6.28;
    const p = c.kind === 0
      ? [c.at[0] + Math.cos(a) * c.r, c.top + c.h + Math.sin(a * 1.7) * .25, c.at[1] + Math.sin(a * .8) * c.r]
      : [c.at[0] + Math.sin(a * 1.3) * c.r, c.top + .25 + Math.abs(Math.sin(a * 3.1)) * .3, c.at[1] + Math.cos(a * .9) * c.r * .8];
    const s = project(p);
    arr.set([Math.round(s[0] / view.art) + .5, H - Math.round(s[1] / view.art) - .5, depthOf(p), c.kind + c.ph * .99], i * 4);
  });
  return arr;
}

// ----- NOVA: placed for the composite (her own canvas renders her; the island shows her) -----
function placeNova() {
  const top = Math.max(G.top(Math.floor(N.x + .5), Math.floor(N.z + .5)), G.top(Math.round(N.x), Math.round(N.z)));
  const [cx, cz] = cellPos(N.x, N.z), P = [cx, top + .62 + N.y, cz], s = project(P);
  const ua = view.scale, wantH = Math.round(ua * 2.3), wantW = Math.round(ua * 1.9);
  if (Math.abs(wantH - NOVA_ART.h) > 2) { NOVA_ART.h = wantH; NOVA_ART.w = wantW; nova.gl.resize(wantW, wantH); }
  nova.view = NOVA_ART.h / (ua * .54);
  N.rect = [Math.round(s[0] / view.art - NOVA_ART.w / 2), Math.round(s[1] / view.art - NOVA_ART.h * .56), NOVA_ART.w, NOVA_ART.h];
  N.depth = depthOf(P);
  // she turns to face where she goes, as seen from the camera
  const B = camBasis(), fw = [Math.cos(N.yaw), 0, -Math.sin(N.yaw)];
  nova.yaw = -Math.atan2(v3.dot(fw, B.R), -v3.dot(fw, B.F));
  nova.sway = N.lean;
}
// the purple arrow on the tile ahead of her: where her next move() goes (it turns as she turns)
function drawHeading() {
  const cv = els.dirCv, g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
  if (N.hideArrow) return;
  const fw = [Math.cos(N.yaw), 0, -Math.sin(N.yaw)];
  const ax = Math.round(N.x + fw[0]), az = Math.round(N.z + fw[2]);
  const top = (G.at(ax, az) ? G.top(ax, az) : G.top(Math.round(N.x), Math.round(N.z))) + .012;
  const [cx, cz] = cellPos(N.x, N.z);
  const at = (a) => { const q = project([cx + fw[0] * a, top, cz + fw[2] * a]); return [q[0] / view.art, q[1] / view.art]; };
  N.arrowDepth = depthOf([cx + fw[0] * .95, top, cz + fw[2] * .95]);
  const C = at(.95), A = at(1.25), len = Math.hypot(A[0] - C[0], A[1] - C[1]) || 1, d = [(A[0] - C[0]) / len, (A[1] - C[1]) / len], n = [-d[1], d[0]];
  const P = (u, v) => [C[0] + d[0] * u + n[0] * v, C[1] + d[1] * u + n[1] * v];
  const s0 = P(-8, -1.1), s1 = P(-8, 1.1), s2 = P(3, 1.1), s3 = P(3, -1.1), tip = P(9, 0), h1 = P(2, 4.6), h2 = P(2, -4.6);
  const tris = [[s0, s1, s2], [s0, s2, s3], [tip, h1, h2]];
  const xs = [s0, s1, tip, h1, h2].map((p) => p[0]), ys = [s0, s1, tip, h1, h2].map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)) - 2, x1 = Math.ceil(Math.max(...xs)) + 2, y0 = Math.floor(Math.min(...ys)) - 2, y1 = Math.ceil(Math.max(...ys)) + 2;
  const inTri = (px, py, [a, b, c]) => { const e = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
    const P2 = [px, py], d1 = e(P2, a, b), d2 = e(P2, b, c), d3 = e(P2, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const W = x1 - x0 + 1, mask = new Uint8Array(W * (y1 - y0 + 1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tris.some((t) => inTri(x + .5, y + .5, t))) mask[(y - y0) * W + (x - x0)] = 1;
  const on = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && mask[(y - y0) * W + (x - x0)];
  const glow = .5 + .5 * Math.sin(view.time * 3);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (on(x, y)) { g.fillStyle = on(x, y - 1) ? (glow > .5 ? "#cba2ff" : "#a066f0") : "#f3e6ff"; g.fillRect(x, y, 1, 1); }
    else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) { g.fillStyle = "#2e0f5c"; g.fillRect(x, y, 1, 1); }
  }
}

function makeComposite() {
  const gl = pix.gl;
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }"));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, COMP_FS)); gl.bindAttribLocation(pr, 0, "a"); gl.linkProgram(pr);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); return t; };
  const loc = {}; const L = (n) => (n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(pr, n)));
  return { pr, L, world: tex(), nova: tex(), arrow: tex() };
}
function composite() {
  const gl = pix.gl, c = comp ||= makeComposite(), w = els.pixCv.width, h = els.pixCv.height;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.world); gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, w, h, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, c.nova); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nova.canvas);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, c.arrow); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, els.dirCv);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pix.tex);
  gl.useProgram(c.pr); gl.viewport(0, 0, w, h);
  [["uWorld", 0], ["uModel", 1], ["uNova", 2], ["uArrow", 3]].forEach(([n, u]) => gl.uniform1i(c.L(n), u));
  const [x, y, rw, rh] = N.rect || [0, 0, 0, 0];
  gl.uniform2f(c.L("uRes"), w, h); gl.uniform4f(c.L("uNovaRect"), x, h - y - rh, rw, rh);
  gl.uniform1f(c.L("uNovaT"), N.depth); gl.uniform1f(c.L("uArrowT"), N.arrowDepth); gl.uniform1f(c.L("uTime"), view.time);
  gl.uniform4fv(c.L("uCrit[0]"), critterUniforms()); gl.uniform1i(c.L("uNCrit"), critters.length);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.activeTexture(gl.TEXTURE0);
}

// where each Bit floats (x, y, z, size) and each switch sits (x, y, z, on), for the shader
export function bitPos(b) { const [x, z] = cellPos(b.x, b.z); return [x, G.top(b.x, b.z) + .46 + Math.sin(view.time * 2 + b.x) * .05 + b.lift, z, b.s]; }
export function drawIsland() {
  if (!G || !pix) return;
  const B = camBasis(), gl = pix.gl;
  const bitArr = new Float32Array(32), swArr = new Float32Array(32);
  bits.slice(0, 8).forEach((b, i) => bitArr.set(bitPos(b), i * 4));
  sws.slice(0, 8).forEach((s, i) => { const [x, z] = cellPos(s.x, s.z); swArr.set([x, G.top(s.x, s.z) + .01, z, s.on], i * 4); });
  const [nx, nz] = cellPos(N.x, N.z), top = G.top(Math.round(N.x), Math.round(N.z));
  // arrays the generic uniform setter can't size: set on the model program first (uniforms stay on a program)
  gl.useProgram(pix.model);
  const L = (n) => pix.model.loc(n);
  gl.uniform4fv(L("uBits[0]"), bitArr); gl.uniform1i(L("uNBits"), Math.min(8, bits.length));
  gl.uniform4fv(L("uSw[0]"), swArr); gl.uniform1i(L("uNSw"), Math.min(8, sws.length));
  pix.draw({ uTime: view.time, uNova: [nx, top, nz, 1 - Math.min(1, N.y * 2)], uCT: view.target, uCR: B.R, uCU: B.U, uCF: B.F, uScale: view.scale }, { uTime: view.time, ...PIXEL_PASS });
  placeNova(); drawHeading(); composite();
}

// ----- the camera: drag the island to turn it all the way round (and tilt it); let go and it coasts, then settles
// on the nearest 45 degrees (where the pixel tiles line up best). The buttons turn it a quarter, or back to the start.
const STEP = Math.PI / 4, TAU = Math.PI * 2, near45 = (a) => Math.round(a / STEP) * STEP;
export function wireCamera({ onDragStart } = {}) {
  const world = els.world;
  world.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button, .card, .bar, .camctl, a")) return;
    Object.assign(cam, { drag: { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }, vs: 0, target: null, pitchT: null, auto: false });
    world.setPointerCapture(e.pointerId); world.classList.add("dragging"); onDragStart?.();
  });
  world.addEventListener("pointermove", (e) => {
    const d = cam.drag; if (!d || e.pointerId !== d.id) return;
    const now = performance.now(), dx = e.clientX - d.x, dy = e.clientY - d.y, dts = Math.max(.008, (now - d.t) / 1000);
    const k = 2.4 / Math.max(320, world.clientWidth);   // a drag across the whole pane turns it about 140 degrees
    cam.spin -= dx * k; cam.vs = cam.vs * .5 + (-dx * k / dts) * .5;
    cam.pitch = Math.max(.3, Math.min(1, cam.pitch + dy * .004));
    Object.assign(d, { x: e.clientX, y: e.clientY, t: now });
  });
  const end = (e) => {
    const d = cam.drag; if (!d || e.pointerId !== d.id) return;
    if (performance.now() - d.t > 90) cam.vs = 0;   // held still before letting go: no coasting
    cam.drag = null; world.classList.remove("dragging");
  };
  world.addEventListener("pointerup", end); world.addEventListener("pointercancel", end);
}
export const turnCamera = (quarters) => { cam.auto = false; cam.vs = 0; cam.target = near45(cam.target ?? cam.yaw + cam.spin) + quarters * Math.PI / 2; };
export const resetCamera = () => { const t = cam.yaw + cam.spin; cam.auto = false; cam.vs = 0; cam.target = cam.yaw + Math.round((t - cam.yaw) / TAU) * TAU; cam.pitchT = Math.PI / 6; };
export function stepCamera(dt) {
  if (cam.pitchT != null) { cam.pitch += (cam.pitchT - cam.pitch) * Math.min(1, dt * 6); if (Math.abs(cam.pitchT - cam.pitch) < .002) cam.pitchT = null; }
  if (cam.drag || cam.auto) return;
  const total = cam.yaw + cam.spin;
  if (Math.abs(cam.vs) > .45) { cam.spin += cam.vs * dt; cam.vs *= Math.exp(-3.5 * dt); return; }
  cam.vs = 0;
  if (cam.target == null) cam.target = near45(total);
  cam.spin += (cam.target - total) * Math.min(1, dt * 7);
}
// the win: one slow lap round the island, from wherever you are looking (returns a stop function)
export function lapCamera(tween, ease) {
  const s0 = cam.spin; cam.auto = true; cam.vs = 0;
  return tween(3600, (k) => { if (cam.auto) cam.spin = s0 + ease(k) * TAU; }).then(() => { if (cam.auto) { cam.auto = false; cam.target = near45(cam.yaw + cam.spin); } });
}
// NOVA's moods, but floating: her "happy" bob is a hop, so it is swapped for her calm float (Isaac: she floats)
export function moodOf(n, name) { n.setMood(name); if (n.m.hop) n.m = { ...n.m, hop: false, bob: 1.6, amp: .05 }; }
export const novaOf = () => nova;
