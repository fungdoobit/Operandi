// DRAFTS, round 4 (Isaac 2026-10-29: "still not there yet, give me more drafts, more variations"). A kit of parts instead of
// one-off characters, so the variations are many and easy to mix: 8 hood shapes x 2 faces x 3 bodies x accessories, each
// numbered draft one combination in its own colours. Isaac can point at parts ("the hood of 4 with the face of 7").
// Same renderer, lighting, haze, eyes and size as NOVA (see kin-px.js). Not in the game: a design preview (variants.html).
//
// Parts (GLSL #defines):
//   HOOD 0 loose        1 pointed wizard tip   2 long gnome tail with a pom-pom   3 cat ears   4 floppy bunny ears
//        5 horns        6 fur-ruffed parka      7 deep monk's hood with a peak (the eyes lower, in its shadow)
//   FACE 0 dark void with NOVA's glowing eyes   1 a pale face with dark eyes and blush
//   BODY 0 NOVA's ragged cloak   1 a smooth bell robe with mittens   2 a robe with sleeves and mittens
//   accessories: A_SCARF A_SATCHEL A_LANTERN A_STAFF A_BOOK A_BELL A_GOGGLES A_CLASP A_ORB A_FURHEM A_FOXMASK
// Materials: 1 grey (unused), 2 the dark inside of the hood, 3 eyes, 4 glow, 5 metal, 6 cloth, 7 accent (scarf, mittens,
// bag, book cover, mask marks), 8 light (skin, mask, fur, horns, pages).
import { PixelGL } from "../../site/js/pixel/pixel-gl.js";

const C = {
  brown: ["#1e120a", "#34200f", "#4e3218", "#6e4a26", "#946838", "#bc8e56"],
  leather: ["#1a0e08", "#2e1a0e", "#4a2c16", "#6a4222", "#8e5c32", "#b47e4a"],
  red: ["#3a0a12", "#6e1422", "#a82434", "#d8444a", "#f27a70", "#ffc0b0"],
  indigo: ["#0e0a24", "#1a1440", "#2a2062", "#3c3088", "#5446b0", "#7466d4"],
  gold: ["#4a3000", "#7e5808", "#b88a1a", "#e2b83a", "#fade7a", "#fff8d0"],
  green: ["#0e2a10", "#1c4a1a", "#2e7028", "#46983a", "#72c254", "#b8ec8c"],
  orange: ["#4a1e06", "#7e3a10", "#b45e1e", "#e08838", "#f6b46a", "#ffe0b4"],
  cream: ["#5a4a3c", "#8a7460", "#b8a084", "#dcc8aa", "#f2e4cc", "#fffaf0"],
  white: ["#6a7a8a", "#98a6b4", "#c4cfda", "#e2e9f0", "#f4f8fb", "#ffffff"],
  pink: ["#4a0a1a", "#7e1430", "#b42444", "#e04460", "#f6809a", "#ffc4d0"],
  lavender: ["#2a2040", "#463862", "#665488", "#8a76ae", "#b29ed2", "#dcd0f2"],
  crimson: ["#2a0408", "#4e0a12", "#7a121e", "#a8202c", "#d03a40", "#f06a66"],
  charcoal: ["#141418", "#22222a", "#34343e", "#484856", "#626274", "#848498"],
  teal: ["#06282c", "#0c444a", "#146670", "#228a94", "#40b0b8", "#7cd8dc"],
  sand: ["#3a2c1a", "#5c4628", "#806440", "#a6865c", "#ccac80", "#ecd4ac"],
  navy: ["#060a18", "#0e1630", "#18244a", "#243668", "#344c8c", "#4a68b0"],
  pine: ["#04201c", "#08342e", "#0e4c44", "#16665c", "#24867a", "#40aa9c"],
  mustard: ["#3e2a00", "#6a4c06", "#9a7210", "#c89a20", "#e8c048", "#fae28e"],
  skin: ["#6a4a40", "#9a7060", "#c49a84", "#e4c0a6", "#f6dcc6", "#fff2e6"],
  bone: ["#4a4236", "#7a6e5a", "#b4a88a", "#e0d6bc", "#f4eedc", "#fffdf6"],
  steel: ["#1a1c22", "#2c3038", "#444a56", "#646c7c", "#929cae", "#e6ecf6"],
  silver: ["#2a2e3a", "#4a5060", "#6e7688", "#98a0b4", "#c4cadc", "#f0f2fa"],
  grey: ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
  void: ["#020204", "#040408", "#07070c", "#0a0a12", "#0e0e18", "#12121e"],
  eyeWhite: ["#a8b0c8", "#c8d0e4", "#e2e8f6", "#f2f6ff", "#fafcff", "#ffffff"],
  eyeDark: ["#0a0a14", "#10101e", "#161628", "#1c1c32", "#24243e", "#2c2c4a"],
  eyeRed: ["#a03020", "#c84a30", "#e87050", "#fca080", "#ffd0c0", "#ffffff"],
  eyeGold: ["#a07010", "#c89020", "#e6b23a", "#f6d470", "#fff0b0", "#ffffff"],
  eyeCyan: ["#2a7a8a", "#40a6b8", "#6ad0de", "#a0eef6", "#d4fcff", "#ffffff"],
  glowGold: ["#5a3c00", "#9a6c06", "#d4a01a", "#f6cc4a", "#fff09a", "#fffde8"],
  glowCyan: ["#0a3a5a", "#16649a", "#2a9ad0", "#5ccaf0", "#a8ecff", "#effcff"],
  glowViolet: ["#2e0f5c", "#4f1f98", "#7838d0", "#a066f0", "#cba2ff", "#f3e6ff"],
  glowRed: ["#4a0606", "#8a1010", "#c82418", "#f0502a", "#ff9060", "#ffd8c0"],
  glowGreen: ["#1a3a06", "#2e6a0c", "#4c9c16", "#7cce2a", "#b8f26a", "#f0ffd0"],
  glowPink: ["#4a0f2a", "#842048", "#bc3a6a", "#e46a94", "#f8a8c4", "#ffe4ee"],
};
// eye glow (3) then haze (3)
const G = {
  white: ["#5a6488", "#b8c2e4", "#f6f8ff"], none: ["#3a2a24", "#6a4e40", "#9a7a66"], red: ["#7a2010", "#e86a40", "#ffe0d0"],
  gold: ["#7a5410", "#e8b040", "#fff4cc"], cyan: ["#1a6a7a", "#5ad0e0", "#e0ffff"],
  hGold: ["#5a3c08", "#b88a20", "#f0d070"], hViolet: ["#2c1258", "#5a2aa6", "#9a62ea"], hRed: ["#4a0808", "#9a1e18", "#e8603a"],
  hCyan: ["#0a3a56", "#1e74a4", "#6ac4ec"], hGreen: ["#1a3a10", "#3c8a1e", "#9ade5a"], hPink: ["#4a1a3a", "#a04a7a", "#f0a0c8"],
  hGrey: ["#1a1a22", "#3a3a48", "#6a6a7c"], hWarm: ["#4a2a08", "#a06420", "#f0b060"], hTeal: ["#06343a", "#1a7a80", "#6ad6cc"],
};

export const VARIANTS = [
  { n: 1, label: "Wanderer", parts: "loose hood, dark face, ragged cloak, long red scarf", hood: 0, face: 0, body: 0, acc: ["SCARF"],
    pal: { cloth: "brown", acc: "red", light: "bone", eyes: "eyeWhite", glow: "glowGold", metal: "gold" }, glow: [...G.white, ...G.hWarm] },
  { n: 2, label: "Apprentice", parts: "pointed wizard hood, dark face, sleeved robe with red mittens, a floating red spellbook with glowing runes", hood: 1, face: 0, body: 2, acc: ["BOOK"],
    pal: { cloth: "indigo", acc: "red", light: "cream", eyes: "eyeGold", glow: "glowViolet", metal: "gold" }, glow: [...G.gold, ...G.hViolet] },
  { n: 3, label: "Explorer", parts: "long gnome hood with a pom-pom, pale face, smooth robe with mittens, a leather satchel", hood: 2, face: 1, body: 1, acc: ["SATCHEL"],
    pal: { cloth: "green", acc: "leather", light: "skin", eyes: "eyeDark", glow: "glowGreen", metal: "gold" }, glow: [...G.none, ...G.hGreen] },
  { n: 4, label: "Kitty", parts: "cat-eared hood, pale face with blush, smooth robe with pink mittens, a bow and a gold bell", hood: 3, face: 1, body: 1, acc: ["BELL"],
    pal: { cloth: "cream", acc: "pink", light: "skin", eyes: "eyeDark", glow: "glowPink", metal: "gold" }, glow: [...G.none, ...G.hPink] },
  { n: 5, label: "Moon Bunny", parts: "floppy bunny-eared hood, dark face, sleeved robe, a silver lantern of blue fire", hood: 4, face: 0, body: 2, acc: ["LANTERN"],
    pal: { cloth: "lavender", acc: "pink", light: "white", eyes: "eyeCyan", glow: "glowCyan", metal: "silver" }, glow: [...G.cyan, ...G.hCyan] },
  { n: 6, label: "Imp", parts: "horned hood, dark face with red eyes, ragged cloak, a glowing gem clasp", hood: 5, face: 0, body: 0, acc: ["CLASP"],
    pal: { cloth: "crimson", acc: "gold", light: "bone", eyes: "eyeRed", glow: "glowRed", metal: "gold" }, glow: [...G.red, ...G.hRed] },
  { n: 7, label: "Snowpuff", parts: "fur-ruffed parka hood, dark face, smooth robe with a fur hem and red mittens", hood: 6, face: 0, body: 1, acc: ["FURHEM"],
    pal: { cloth: "teal", acc: "red", light: "white", eyes: "eyeWhite", glow: "glowCyan", metal: "silver" }, glow: [...G.white, ...G.hCyan] },
  { n: 8, label: "Monk", parts: "deep monk's hood with a peak (eyes low in its shadow), ragged cloak, a wooden staff with a glowing gem", hood: 7, face: 0, body: 0, acc: ["STAFF"],
    pal: { cloth: "sand", acc: "brown", light: "bone", eyes: "eyeGold", glow: "glowGold", metal: "gold" }, glow: [...G.gold, ...G.hGold] },
  { n: 9, label: "Tinker", parts: "loose hood with brass goggles, dark face, smooth robe with leather mittens, a satchel", hood: 0, face: 0, body: 1, acc: ["GOGGLES", "SATCHEL"],
    pal: { cloth: "orange", acc: "leather", light: "bone", eyes: "eyeGold", glow: "glowGold", metal: "gold" }, glow: [...G.gold, ...G.hWarm] },
  { n: 10, label: "Seer", parts: "pointed wizard hood, dark face, sleeved robe with gold mittens, a gem clasp and a floating crystal ball", hood: 1, face: 0, body: 2, acc: ["CLASP", "ORB"],
    pal: { cloth: "navy", acc: "gold", light: "white", eyes: "eyeCyan", glow: "glowCyan", metal: "gold" }, glow: [...G.cyan, ...G.hCyan] },
  { n: 11, label: "Fox Mask", parts: "fox-eared hood, dark face with red eyes, ragged cloak, a red scarf, a white fox mask worn on the side of the hood", hood: 3, face: 0, body: 0, acc: ["SCARF", "FOXMASK"],
    pal: { cloth: "charcoal", acc: "red", light: "bone", eyes: "eyeRed", glow: "glowRed", metal: "gold" }, glow: [...G.red, ...G.hGrey] },
  { n: 12, label: "Lamplighter", parts: "long gnome hood with a pom-pom, dark face, ragged cloak, an orange scarf and a brass lantern", hood: 2, face: 0, body: 0, acc: ["SCARF", "LANTERN"],
    pal: { cloth: "pine", acc: "orange", light: "bone", eyes: "eyeGold", glow: "glowGold", metal: "gold" }, glow: [...G.gold, ...G.hWarm] },
];

const model = (v) => `
#define HOOD ${v.hood}
#define FACE ${v.face}
#define BODY ${v.body}
${v.acc.map((a) => "#define A_" + a).join("\n")}
uniform vec2 uRes; uniform float uTime, uYaw, uView, uBlink, uBob, uSway, uMood, uEnergy;
float gm; float gEye; float gMagic;
void U(inout float d, float nd, float m){ if (nd < d) { d = nd; gm = m; } }
void glowU(inout float d, float nd, float m){ U(d, nd, m); gMagic = min(gMagic, nd); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.)/k1; }
float fbm(vec3 p){ return vnoise(p)*.6 + vnoise(p*2.1 + 4.)*.3 + vnoise(p*4.3 + 9.)*.1; }
// NOVA's eyes, exactly (mood: 0 idle, 1 happy, 2 angry, 3 sad, 4 sleepy)
float eye1(vec3 q, vec3 r, float s){
  vec3 rb = vec3(r.x, r.y*uBlink*(uMood == 4. ? .14 : 1.), r.z);
  if (uMood == 4.) q.y += r.y*.25;
  float e = sdEll(q, rb);
  if (uMood == 1.) e = max(e, -sdEll(q + vec3(0., r.y*1.02, 0.), r*vec3(1.6, 1.05, 2.)));
  if (uMood == 2.) e = max(e, (q.y + s*q.x*.95 - r.y*.3)*.7);
  if (uMood == 3.) e = max(e, (q.y - s*q.x*.7 - r.y*.45)*.7);
  return e;
}
void eyes(inout float d, vec3 p, vec3 a, vec3 b, vec3 r){
  float e = min(eye1(p - a, r, 1.), eye1(p - b, r*vec3(1.08, 1.04, 1.), -1.));
  U(d, e, 3.); gEye = min(gEye, e);
}
// NOVA's ragged cloak
float cloak(vec3 p, float top, float bot, float r0, float r1){
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(top - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(top - s.y, 0.), 2.);
  float ry = mix(r0, r1, clamp((top - s.y)/(top - bot), 0., 1.));
  float c = (length(vec2(s.x, s.z*1.3)) - ry)*.7;
  float jag = .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3);
  return max(c, max(s.y - top - .02, (bot + jag) - s.y));
}

float map(vec3 p){
  gm = 0.; gEye = 1e5; gMagic = 1e5;
  float d = 1e5;
  p.y -= uBob;
  p.xz = R(uYaw) * p.xz;
  if (sdBox(p - vec3(0., .2, 0.), vec3(1.6, 1.9, 1.4)) > .3) return 1.;
  vec3 c = vec3(0., .48, 0.), q = p - c;
  float fz = (fbm(p*14.) - .5)*.04;   // fluff, for fur
  // ---- the hood: a big loose shell over the shoulders with soft folds, a deep opening, its inside dark ----
  float ha = atan(q.x, q.z);
  float outer = sdEll(q - vec3(0., 0., .08), vec3(.56, .52, .54)) + .022*sin(ha*6. + 1.)*smoothstep(.2, -.45, q.y);
#if HOOD == 7
  vec3 oc = vec3(0., -.17, -.5); float orad = .36; float eyeY = -.08;
#else
  vec3 oc = vec3(0., -.06, -.5); float orad = .38; float eyeY = 0.;
#endif
  float open = length(q - oc) - orad;
  float hood = max(outer, -open), inner = -open > outer ? 1. : 0.;
  float rim = max(abs(open) - .035, outer - .03);
  float extra = 1e5;   // more of the hood, in the cloth
#if HOOD == 1
  { vec3 t0 = c + vec3(0., .4, .25), t1 = t0 + vec3(.04, .32, .14), t2 = t1 + vec3(.2 + .03*sin(uTime*1.5), .1, .1);
    extra = min(sdCapT(p, t0, t1, .22, .1), sdCapT(p, t1, t2, .1, .02)); }
#elif HOOD == 2
  { float sw = .04*sin(uTime*1.3);
    vec3 t0 = c + vec3(0., .42, .16), t1 = c + vec3(.08, .74, .26), t2 = c + vec3(.4 + sw, .74, .3), t3 = c + vec3(.62 + sw*1.5, .46, .28);
    extra = min(min(sdCapT(p, t0, t1, .22, .15), sdCapT(p, t1, t2, .15, .1)), sdCapT(p, t2, t3, .1, .06));
    U(d, length(p - t3 - vec3(.02, -.1, 0.)) - .13 + fz, 8.); }
#elif HOOD == 3
  { vec3 e = vec3(abs(p.x), p.yz) - c; float tw = .02*sin(uTime*2. + step(0., p.x)*2.);
    extra = sdCapT(e, vec3(.25, .4, .06), vec3(.4 + tw, .76, .1), .18, .0);
    U(d, sdCapT(e - vec3(0., 0., -.08), vec3(.26, .45, .02), vec3(.39 + tw, .7, .06), .09, .0), 7.); }
#elif HOOD == 4
  { vec3 e = vec3(abs(p.x), p.yz) - c; float fl = .05*sin(uTime*1.7 + step(0., p.x)*1.5);
    vec3 k = vec3(1., 1., 2.2), ez = e*k;
    vec3 e0 = vec3(.2, .4, .1)*k, e1 = vec3(.3, .84, .12)*k, e2 = vec3(.56, .9 + fl, .14)*k, e3 = vec3(.74, .66 + fl*2., .14)*k;
    extra = min(min(sdCapT(ez, e0, e1, .13, .13), sdCapT(ez, e1, e2, .13, .12)), sdCapT(ez, e2, e3, .12, .06))/2.2;
    U(d, (sdCapT(ez + vec3(0., 0., .1), e0 + vec3(.02, .06, 0.), e1, .06, .06))/2.2, 7.); }
#elif HOOD == 5
  { vec3 e = vec3(abs(p.x), p.yz) - c;
    vec3 h0 = vec3(.32, .3, .04), h1 = vec3(.54, .44, .04), h2 = vec3(.62, .72, 0.), h3 = vec3(.48, .9, -.04);
    U(d, min(min(sdCapT(e, h0, h1, .1, .085), sdCapT(e, h1, h2, .085, .055)), sdCapT(e, h2, h3, .055, .008)), 8.); }
#elif HOOD == 6
  { U(d, max(abs(open - .11) - .06, outer - .06) + fz*1.2, 8.); }
#elif HOOD == 7
  { extra = sdCapT(p, c + vec3(0., .3, -.26), c + vec3(0., .2, -.62), .14, .0); }
#endif
  // ---- the body ----
#if BODY == 0
  float body = cloak(p, .2, -.76, .24, .64);
#else
  vec3 s = p; s.x += uSway*max(-s.y, 0.) + sin(s.y*2. + uTime*1.3)*.03*max(.2 - s.y, 0.);
  float ry = mix(.26, .62, clamp((.2 - s.y)/.95, 0., 1.));
  float body = max((length(vec2(s.x, s.z*1.25)) - ry)*.7, max(s.y - .22, -.74 + .03*sin(atan(s.z, s.x)*5. + uTime) - s.y));
#endif
  float cloth = smin(smin(hood, extra, .08), body, .08);
  U(d, cloth, inner > .5 && hood < cloth + .015 ? 2. : 6.);
#if BODY == 1
  for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.; U(d, length(p - vec3(.46*sx, -.26 + .04*sin(uTime*2.2 + sx), -.2)) - .1, 7.); }
#elif BODY == 2
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1. : 1.;
    vec3 hp = vec3(.12*sx, -.33 + .02*sin(uTime*2.), -.46);
    U(d, sdCapT(p, vec3(.3*sx, .02, -.08), hp + vec3(.05*sx, .04, .08), .1, .15), 6.);   // the sleeve, wide at the cuff
    U(d, length(p - hp) - .1, 7.);                                                       // the mitten poking out
  }
#endif
  // ---- the face ----
  U(d, sdEll(p - vec3(0., .2, .02), vec3(.3, .18, .27)), 2.);   // the shadow under the face
  vec3 fc = c + vec3(0., -.02, .04);
#if FACE == 0
  U(d, length(p - fc) - .34, 2.);
  eyes(d, p, c + vec3(-.13, eyeY, -.27), c + vec3(.12, eyeY, -.27), vec3(.075, .12, .06));
#elif FACE == 1
  fc = c + vec3(0., -.04, -.03);
  U(d, length(p - fc) - .34, 8.);
  eyes(d, p, c + vec3(-.12, eyeY - .01, -.34), c + vec3(.11, eyeY - .01, -.34), vec3(.06, .09, .05));
  U(d, sdEll(vec3(abs(p.x), p.yz) - vec3(.2, c.y - .12, -.3), vec3(.055, .028, .02)), 7.);   // blush
#endif
  // ---- accessories ----
#ifdef A_SCARF
  { float sc = length(vec2(length(q.xz) - .5 - .02*sin(ha*5.), (q.y + .36)*1.15)) - .1;
    for (int k = 0; k < 2; k++) {
      float sx = k == 0 ? 1. : .55, ph = float(k)*1.7;
      vec3 prev = vec3(.24, .12, .36);
      for (int j = 1; j <= 4; j++) {
        float w = float(j)/4.;
        vec3 nx = vec3(.24 + .5*w*sx, .12 - .2*w*w + .06*sin(uTime*6. - w*5. + ph)*w, .36 + .3*w);
        sc = min(sc, sdCapT(p, prev, nx, .07 - .02*w, .065 - .02*w));
        prev = nx;
      }
    }
    U(d, sc, 7.); }
#endif
#ifdef A_SATCHEL
  { vec3 sp = p - vec3(0., -.12, 0.); sp.xy = R(.5) * sp.xy;
    U(d, length(vec2(length(sp.xz*vec2(1., 1.2)) - .44, sp.y)) - .028, 7.);                 // the strap across the body
    vec3 bp = p - vec3(.4, -.4, -.24); bp.xz = R(.6) * bp.xz;
    U(d, sdRBox(bp, vec3(.13, .1, .05), .03), 7.);
    U(d, sdRBox(bp - vec3(0., .055, -.035), vec3(.14, .06, .02), .02), 7.);                  // the flap
    U(d, length(bp - vec3(0., .01, -.065)) - .026, 5.); }                                     // the buckle
#endif
#ifdef A_LANTERN
  { vec3 lq = p - vec3(.7, -.3 + .05*sin(uTime*1.6), -.08); lq.xy = R(.15*sin(uTime*1.2)) * lq.xy;
    float lan = min(sdEll(lq - vec3(0., .16, 0.), vec3(.12, .05, .12)), sdBox(lq - vec3(0., -.15, 0.), vec3(.11, .02, .11)));
    for (int k = 0; k < 4; k++) { vec2 cn = vec2(k < 2 ? -.09 : .09, k % 2 == 0 ? -.09 : .09); lan = min(lan, sdCapT(lq, vec3(cn.x, -.14, cn.y), vec3(cn.x, .14, cn.y), .018, .018)); }
    lan = min(lan, sdTorZ(lq - vec3(0., .24, 0.), .06, .016));
    U(d, lan, 5.);
    glowU(d, sdEll(lq - vec3(0., -.03 + .01*sin(uTime*11.), 0.), vec3(.05, .09 + .015*sin(uTime*13.), .05)), 4.); }
#endif
#ifdef A_STAFF
  { vec3 sq = p - vec3(.66, -.05 + .04*sin(uTime*1.4), -.06); sq.xy = R(.08*sin(uTime*1.1)) * sq.xy;
    U(d, sdCapT(sq, vec3(0., -.62, 0.), vec3(0., .5, 0.), .032, .04), 7.); U(d, sdTorZ(sq - vec3(0., .6, 0.), .1, .03), 5.);
    glowU(d, sdOct(sq - vec3(0., .6, 0.), .08 + .01*sin(uTime*3.)), 4.); }
#endif
#ifdef A_BOOK
  { vec3 bq = p - vec3(-.6, -.06 + .05*sin(uTime*1.5), -.16); bq.xz = R(-.5) * bq.xz; bq.yz = R(-.35) * bq.yz; bq.xy = R(.08*sin(uTime)) * bq.xy;
    float cover = 1e5, pages = 1e5, lines = 1e5;
    for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.; vec3 pp = bq; pp.xz = R(sx*.32) * pp.xz;
      cover = min(cover, sdBox(pp - vec3(.17*sx, 0., .03), vec3(.18, .23, .016)));
      pages = min(pages, sdBox(pp - vec3(.155*sx, 0., .0), vec3(.15, .2, .02)));
      for (int j = 0; j < 3; j++) lines = min(lines, sdBox(pp - vec3(.15*sx, .1 - float(j)*.09, -.02), vec3(.09, .012, .006))); }
    U(d, cover, 7.); U(d, pages, 8.); glowU(d, lines, 4.);
    for (int k = 0; k < 3; k++) { float ph = fract(uTime*.45 + float(k)/3.);
      glowU(d, sdOct(p - vec3(-.6 + (float(k) - 1.)*.1, .12 + ph*.5, -.22), .055*(1. - ph*.6)), 4.); } }
#endif
#ifdef A_BELL
  { U(d, min(sdEll(p - vec3(-.07, .04, -.33), vec3(.07, .045, .03)), sdEll(p - vec3(.07, .04, -.33), vec3(.07, .045, .03))), 7.);
    U(d, length(p - vec3(0., -.04, -.34)) - .065, 5.); }
#endif
#ifdef A_GOGGLES
  { vec3 gq = q - vec3(0., .3, .08);
    U(d, max(length(vec2(length(gq.xz*vec2(1., .97)) - .47, gq.y*1.4)) - .03, gq.z - .1), 7.);
    for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.;
      vec3 l = q - vec3(.16*sx, .36, -.34); l.yz = R(-.75) * l.yz;
      U(d, sdTorZ(l, .11, .035), 5.); glowU(d, sdEll(l, vec3(.1, .1, .03)), 4.); } }
#endif
#ifdef A_FOXMASK
  { vec3 mq = (p - (c + vec3(-.42, .12, -.3)))/1.3; mq.xz = R(-.55) * mq.xz; mq.xy = R(.3) * mq.xy;   // worn on the side of the hood, facing out
    float mk = sdEll(mq, vec3(.16, .19, .07));
    mk = smin(mk, sdCapT(mq, vec3(0., -.04, -.03), vec3(0., -.12, -.13), .07, .025), .03);             // the snout
    for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.;
      mk = smin(mk, sdCapT(mq, vec3(.09*sx, .12, 0.), vec3(.14*sx, .27, .01), .06, .0), .02); }         // ears
    U(d, mk*1.3, 8.);
    for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.;
      U(d, sdCapT(mq, vec3(.04*sx, .05, -.06), vec3(.11*sx, .08, -.05), .022, .016)*1.3, 2.);               // eye slits
      U(d, sdCapT(mq, vec3(.06*sx, -.03, -.065), vec3(.12*sx, -.08, -.04), .016, .01)*1.3, 7.);             // red cheek marks
      U(d, sdCapT(mq, vec3(.1*sx, .14, -.03), vec3(.13*sx, .23, -.02), .022, .0)*1.3, 7.); }                // red inner ears
    U(d, (length(mq - vec3(0., -.13, -.15)) - .028)*1.3, 2.); }                                                 // the nose
#endif
#ifdef A_CLASP
  { vec3 cq = p - vec3(0., .02, -.34);
    U(d, sdTorZ(cq, .075, .02), 5.); glowU(d, sdOct(cq, .065), 4.); }
#endif
#ifdef A_ORB
  { vec3 oq = p - vec3(-.66, .08 + .05*sin(uTime*1.3), -.1);
    glowU(d, length(oq) - .17, 4.);
    U(d, sdTorZ(vec3(oq.x, oq.z, oq.y + .18), .1, .03), 5.); }
#endif
#ifdef A_FURHEM
  { U(d, max(body - .016 + fz, p.y + .58), 8.); }
#endif
  return d;
}

vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.)*.002;
  return normalize(k.xyy*map(p + k.xyy) + k.yyx*map(p + k.yyx) + k.yxy*map(p + k.yxy) + k.xxx*map(p + k.xxx));
}
// NOVA's own lighting and haze, exactly
out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  vec3 ro = vec3(uv.x, uv.y + .1, -5.), rd = vec3(0., 0., 1.);
  float t = 0., m = 0., minD = 1e5, minEye = 1e5, minMagic = 1e5;
  for (int i = 0; i < 110; i++) {
    float d = map(ro + rd*t);
    minD = min(minD, d); minEye = min(minEye, gEye); minMagic = min(minMagic, gMagic);
    if (d < .003) { m = gm; break; }
    t += d*.65;
    if (t > 10.) break;
  }
  float eyeGlow = exp(-max(minEye, 0.)*13.)*.55;
  float magic = exp(-max(minMagic, 0.)*16.)*.6;
  if (m == 0.) {
    vec2 q = uv*3.2 + vec2(0., -uTime*.55);
    float n = fbm(vec3(q, uTime*.25));
    float gas = exp(-max(minD, 0.)*5.)*(.2 + .95*n);
    vec2 cell = floor(vec2(gl_FragCoord.x, gl_FragCoord.y - uTime*14.)/2.);
    if (hash1(cell.x*17.3 + cell.y*91.7) > .993 && gas > .18) gas = 1.;
    o = vec4(max(gas, magic), 0., 1., eyeGlow); return;
  }
  vec3 p = ro + rd*t;
  map(p); m = gm;
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(-.5, .7, -.6));
  float key = max(dot(n, L), 0.);
  float rim = pow(1. - max(dot(n, -rd), 0.), 2.4);
  float back = max(dot(n, normalize(vec3(.7, .3, .5))), 0.);
  float sh;
  if (m == 3.) sh = .86 + .14*key;
  else if (m == 4.) sh = .55 + .35*key + .15*sin(uTime*9. + p.y*14.);
  else if (m == 5.) sh = .12 + .4*key + .45*pow(max(dot(reflect(-L, n), -rd), 0.), 10.) + .35*rim;
  else if (m == 2.) sh = .05 + .2*rim;
  else if (m >= 6.) sh = .14 + .62*key + .22*rim;
  else { sh = .05 + .2*key + .55*rim*(.4 + .6*back); sh += .3*exp(-max(gEye, 0.)*10.); }
  o = vec4(clamp(sh, 0., 1.), m/16., t/10., eyeGlow);
}`;

const MOODS = { idle: { id: 0, energy: 1, bob: 1.5, amp: 0.05 }, happy: { id: 1, energy: 1.2, bob: 3.2, amp: 0.07, hop: true }, angry: { id: 2, energy: 1.6, bob: 2.4, amp: 0.035 }, sad: { id: 3, energy: 0.55, bob: 0.9, amp: 0.03, sink: -0.06 }, sleepy: { id: 4, energy: 0.45, bob: 0.7, amp: 0.025, sink: -0.04 } };

// One draft on a canvas, drawn like NovaMate draws NOVA (107 x 113 art px, view 4.79). px: CSS px per art px.
export class PixelVariant {
  constructor(host, v, { px = 3, w = 107, h = 113, view = 4.79 } = {}) {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, { width: w * px + "px", height: h * px + "px", imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.canvas.width = w; this.canvas.height = h;
    const P = v.pal, palettes = [C.grey, C.void, C[P.eyes], C[P.glow], C[P.metal], C[P.cloth], C[P.acc], C[P.light]];
    this.gl = new PixelGL(this.canvas, { model: model(v), palettes, glow: v.glow, extra: ["#cfd6e2", "#ffffff", "#0a0810"] });
    this.view = view; this.yaw = 0.25; this.m = MOODS.idle; this.t0 = performance.now() - Math.random() * 4000; this.nextBlink = 2;
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  setMood(name) { this.m = MOODS[name] || MOODS.idle; }
  loop(now) {
    if (!this.canvas.isConnected) return;
    const s = (now - this.t0) / 1000, m = this.m, wv = s * m.bob;
    if (s > this.nextBlink + 0.16) this.nextBlink = s + 2.5 + Math.random() * 3;
    const bob = (m.hop ? Math.abs(Math.sin(wv)) * m.amp * 1.6 - m.amp * 0.4 : Math.sin(wv) * m.amp) + (m.sink ?? 0);
    this.gl.draw({ uTime: s, uYaw: this.yaw, uView: this.view, uBlink: m.id === 4 ? 1 : s > this.nextBlink ? 0.1 : 1, uBob: bob, uSway: 0, uMood: m.id, uEnergy: m.energy },
      { uTime: s, uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: 0, uShadowX: 0.5, uPlume: [0, 0, 0, 0] });
    requestAnimationFrame(this.loop);
  }
}
