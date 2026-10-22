// Module 2's grassland enemies and Module 3's Bone Legion (PRD Addendum K).
// See enemy-px.js for what a model gives. All face left (-x), toward the
// teammate; the camera sits at -z, so -z is the side we see.

const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---- Fangsnake: a rearing venomous serpent ----
// A thick olive body coiled on the ground rises in an S-curve to a flared
// hood and a wedge-shaped head with glowing slit eyes. Dark diamonds run down
// its back over a pale banded belly. It strikes from a coil with its jaws
// wide open (long fangs dripping venom) and spits venom from the same mouth.
const snakeHead = (P) => {
  const lu = (P.atk || 0) * (1 - 0.75 * (P.open || 0)), w = (P.wind || 0) * (1 - 0.5 * (P.open || 0));
  let h = mix3([-0.4, 1.5, -0.05], [0.12, 1.32, 0.0], w);
  return mix3(h, [-1.02, 0.86, -0.1], lu);
};
export const snake = {
  name: "Fangsnake", w: 250, h: 190, ground: 0, offX: -0.02, scale: 0.34, pitch: 0.16,
  palettes: [
    ["#0b1408", "#1a2a10", "#2e4318", "#4a6022", "#6e8030", "#9aa648"],   // 1 scales: dark green / olive
    ["#2a2a14", "#4e4c26", "#7a7640", "#a6a062", "#ccc68c", "#eee8b8"],   // 2 belly, pale
    ["#3a2600", "#7a5200", "#c08a00", "#f0c400", "#fff060", "#ffffd0"],   // 3 eyes (yellow glow)
    ["#14040a", "#2e0a14", "#4e1420", "#74202e", "#a03444", "#c85a64"],   // 4 mouth, tongue
    ["#2a2418", "#56503c", "#8a846a", "#bcb89c", "#e2dec8", "#fbfaf0"],   // 5 fangs
    ["#0e2a06", "#2a6010", "#54a018", "#8ade2a", "#c6ff6a", "#f0ffc8"],   // 6 venom
  ],
  glow: ["#2a6010", "#8ade2a", "#e2ffa0", "#7a5200", "#f0c400", "#fff8b0"],
  anchors: {
    core: [0.12, 0.62, 0],
    weapon: (P) => { const h = snakeHead(P); return [h[0] - 0.2, h[1] - 0.03, h[2]]; },
    muzzle: (P) => { const h = snakeHead(P); return [h[0] - 0.22, h[1] - 0.04, h[2]]; },
    head: (P) => snakeHead(P), feet: [0.1, 0, 0],
  },
  idle: (t) => ({ bob: Math.sin(t * 1.8) * 0.012 }),
  glsl: `
vec3 B0, B1, B2, B3;
vec3 bz(float t){ float u = 1. - t; return u*u*u*B0 + 3.*u*u*t*B1 + 3.*u*t*t*B2 + t*t*t*B3; }
// a body segment that also returns where along it we are and the angle round it (0 = belly)
float bseg(vec3 p, vec3 a, vec3 b, float ra, float rb, out vec2 uv){
  vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.);
  vec3 v = pa - ba*h, t = normalize(ba);
  vec3 f = normalize(vec3(-1., -.5, 0.) - t*dot(t, vec3(-1., -.5, 0.)));
  uv = vec2(h, atan(dot(v, cross(t, f)), dot(v, f)));
  return length(v) - mix(ra, rb, h);
}
#define UH(dd, nd, mm, ll) U(dd, (nd)*1.3, mm, ll)
float map(vec3 p){
  float d = 1e5;
  float lu = ATK*(1. - .75*OPEN), w = WIND*(1. - .5*OPEN);
  float jaw = clamp(max(max(OPEN*1.4, ATK*.95*(1. - .5*OPEN)), WIND*.35), 0., 1.);
  vec3 H = mix(vec3(-.4, 1.5, -.05), vec3(.12, 1.32, 0.), w);
  H = mix(H, vec3(-1.02, .86, -.1), lu);
  H += vec3(.03*sin(T*1.3), .025*sin(T*2.1), .035*sin(T*.9))*(1. - lu);
  B0 = vec3(.2, .26, .02);
  B1 = vec3(-.6 + .1*w - .1*lu, .5 - .06*lu, -.03);
  B2 = vec3(.62 + .3*w - .1*lu, 1.0 + .1*w - .25*lu, .04);
  B3 = H + vec3(.17, -.06, 0.);
  // ---- the coils on the ground (bounded) ----
  vec3 c = p - vec3(.22, 0., .06);
  if (sdBox(c - vec3(0., .3, 0.), vec3(.62, .38, .62)) < .1) {
    float br = .006*sin(T*1.8);
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      vec3 cq = c - vec3(.04*fk, .13 + .22*fk, -.02*fk);
      cq.yz = R(.07 - .16*fk) * cq.yz;
      float Rr = .38 - .14*fk, rr = .15 - .02*fk + br;
      float a = atan(cq.z, cq.x);
      vec2 tq = vec2(length(cq.xz) - Rr, cq.y);
      float tor = length(tq) - rr;
      U(d, tor, 1., vec3(a*Rr*1.4 + fk*2., atan(tq.x, -tq.y), 0.));
    }
    // the tail, slithering out in front
    vec2 uv;
    vec3 t0 = vec3(-.1, .1, -.32), t1 = vec3(-.55, .06, -.42 + .04*sin(T*2.)), t2 = vec3(-.78, .04, -.3 + .06*sin(T*2.6));
    float tl = bseg(c, t0, t1, .1, .055, uv); U(d, tl, 1., vec3(uv.x*.5 + 5., uv.y, 0.));
    tl = bseg(c, t1, t2, .055, .012, uv); U(d, tl, 1., vec3(uv.x*.3 + 5.5, uv.y, 0.));
  }
  // ---- the rearing body: an S-curve from the coil to the head ----
  vec3 prev = bz(0.);
  for (int i = 1; i <= 8; i++) {
    float t = float(i)/8.;
    vec3 nx = bz(t);
    vec2 uv;
    float r0 = mix(.165, .1, (t - 1./8.)), r1 = mix(.165, .1, t);
    float sg = bseg(p, prev, nx, r0, r1, uv);
    U(d, sg, 1., vec3((float(i - 1) + uv.x)*.3, uv.y, 0.));
    prev = nx;
  }
  // ---- the hood: a flared shield round the neck ----
  vec3 hc = bz(.74), tn = normalize(bz(.82) - bz(.66));
  vec3 fw = normalize(vec3(-1., 0., -.15) - tn*dot(tn, vec3(-1., 0., -.15)));
  vec3 sd = cross(tn, fw);
  vec3 hq = p - hc - fw*.02;
  vec3 hl = vec3(dot(hq, fw), dot(hq, tn), dot(hq, sd));
  float flare = 1. + .25*OPEN + .15*WIND;
  float hs = .4*flare;
  hl.x += .7*hl.z*hl.z;   // curved back like a cupped shield
  float hood = (length(hl/vec3(.05, .27 + .03*flare, hs)) - 1.)*.045;
  hood = max(hood, hl.y - .2);   // flat-topped under the head
  hood += .003*sin(atan(hl.z, hl.y)*7.);   // ribbed edge
  U(d, hood, hl.x < -.004 ? 2. : 1., vec3(hl.y, hl.z, 7.));
  // ---- the head: a wedge with a hinged lower jaw ----
  vec3 q = (p - H)/1.3;
  q.xy = R(-.15*lu + .1*w) * q.xy;
  vec3 uq = q; uq.xy = R(.3*jaw) * uq.xy;   // upper jaw tips up a little
  float up = (length(uq/vec3(.23, .09, .125)) - 1.)*.085;
  up = smin(up, (length((uq - vec3(.07, .03, 0.))/vec3(.13, .07, .135)) - 1.)*.07, .04);   // swollen venom glands
  up = max(up, -uq.y - .012);
  up += .004*vnoise(uq*40.);
  UH(d, up, 1., vec3(uq.x*2. + 9., uq.z > 0. ? 3. : -3., 1.));
  // brow ridges over the eyes: an angry slant
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 e = uq - vec3(-.07, .045, .088*fs);
    UH(d, sdCapT(e, vec3(.05, .045, .0*fs), vec3(-.07, .022, .0*fs), .018, .01), 1., vec3(9., 3., 1.));
    float eye = (length(e/vec3(.04, .024, .026)) - 1.)*.024;
    UH(d, eye, 3., e); E(eye*1.3);
  }
  // the mouth: dark gums and the lower jaw
  vec3 lq = q - vec3(.12, -.012, 0.); lq.xy = R(-.95*jaw) * lq.xy; lq += vec3(.12, 0., 0.);
  float lo = (length((lq - vec3(-.02, -.02, 0.))/vec3(.21, .045, .1)) - 1.)*.045;
  lo = max(lo, lq.y - .012);
  UH(d, lo, 2., vec3(lq.x*2. + 9., -3., 2.));
  if (jaw > .05) {
    float gum = (length((q - vec3(.03, -.03, 0.))/vec3(.15, .03 + .07*jaw, .085)) - 1.)*.04;
    UH(d, gum, 4., q);
    // fangs: long, curved back, folded up when the mouth is shut
    for (int s = -1; s <= 1; s += 2) {
      float fs = float(s);
      vec3 f0 = vec3(-.15, -.01, .042*fs), f1 = f0 + vec3(.02 - .04*jaw, -.03 - .1*jaw, .004*fs), f2 = f1 + vec3(.03, -.03*jaw, 0.);
      float fg = min(sdCapT(uq, f0, f1, .016, .009), sdCapT(uq, f1, f2, .009, .001));
      UH(d, fg, 5., uq);
      G((length(uq - f2) - .01 + .03*(1. - jaw))*1.3);
    }
  }
  // the forked tongue, flicking out every so often
  float fl = smoothstep(.0, .1, sin(T*1.7)*.5 + .5 - .62) * (.6 + .4*sin(T*22.));
  fl = max(fl, ATK*.6);
  if (fl > .02) {
    vec3 t0 = vec3(-.16, -.02, 0.), t1 = t0 + vec3(-.16*fl, -.02*sin(T*30.)*fl, 0.);
    float tg = sdCap(q, t0, t1, .011);
    tg = min(tg, sdCapT(q, t1, t1 + vec3(-.06, .03, .025)*fl, .009, .002));
    tg = min(tg, sdCapT(q, t1, t1 + vec3(-.06, -.02, -.03)*fl, .009, .002));
    UH(d, tg, 4., q);
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1. && lp.z < .5) {   // body scales: lp = (along, angle round, 0)
    float ang = lp.y;
    if (abs(ang) < .95) {   // the pale belly with its wide scutes
      m = 2.;
      return sh*(.82 + .22*step(.28, fract(lp.x*11.))) + .04;
    }
    float back = (3.14159 - abs(ang));
    vec2 dm = vec2(fract(lp.x*2.6) - .5, back*.32);
    float dia = abs(dm.x) + abs(dm.y);
    vec2 cell = vec2(lp.x*26., ang*3.2); cell.x += .5*floor(cell.y);
    float sc = fract(cell.x);
    sh = sh*(.86 + .16*sc);
    if (dia < .2) return sh*.42;
    if (dia < .27) return sh*1.18 + .08;
    if (back > 1.3 && abs(fract(lp.x*2.6 + .5) - .5) < .07) return sh*.6;   // side bars
    return sh;
  }
  if (m == 1. && lp.z > .5 && lp.z < 1.5) {   // head scales: big plates
    float pl = vnoise(p*26.);
    return sh*(.8 + .3*pl) - .03;
  }
  if (m == 2. && lp.z > 6.5) {   // the hood's face: dark eye-bars
    float r = length(vec2(lp.x + .02, abs(lp.y) - .12));
    if (abs(r - .06) < .022) return sh*.35;
    return sh*(.85 + .2*step(.5, fract(lp.x*18.)));
  }
  if (m == 3.) {   // slit pupils
    if (abs(lp.x + .002) < .008 && abs(lp.y) < .02) { return .08; }
    return .65 + .35*sh;
  }
  if (m == 5.) return sh + .15;
  return sh;
}`,
};

// ---- Webspinner: a huge hairy spider ----
// A bristling dark body on eight jointed legs (knees high above it), a
// cluster of red eyes over big hooked fangs, and a swollen abdomen with a
// glowing ember marking. It rears up its front legs and lunges to bite, and
// swings its abdomen up over its back to shoot webs from its spinnerets.
const spiderTilt = (P) => clamp((P.open || 0) / 0.6, 0, 1) * 1.25;
export const spider = {
  name: "Webspinner", w: 270, h: 160, ground: 0, offX: 0.05, scale: 0.3, pitch: 0.3,
  palettes: [
    ["#08060a", "#141016", "#221a20", "#33262c", "#4a363a", "#624a48"],   // 1 body, legs: hairy black-brown
    ["#0c080a", "#1a1214", "#2c1e1e", "#402c28", "#584036", "#725646"],   // 2 abdomen
    ["#3a0400", "#7a1000", "#c02c00", "#ff5a10", "#ff9a40", "#ffe0a0"],   // 3 eyes, marking (red-orange glow)
    ["#1c1410", "#3a2a20", "#5e4632", "#866648", "#ae8a62", "#d4b088"],   // 4 leg bands
    ["#050304", "#140a0c", "#2a1216", "#4a1e22", "#7a3036", "#b05058"],   // 5 fangs: glossy
  ],
  glow: ["#7a1000", "#ff5a10", "#ffc070", "#7a1000", "#ff5a10", "#ffd090"],
  anchors: {
    core: [0.08, 0.55, 0],
    weapon: (P) => [-0.52 - 0.3 * (P.atk || 0), 0.3 + 0.15 * (P.wind || 0), 0],
    muzzle: (P) => {
      const a = spiderTilt(P), px = 0.08, py = 0.55, tx = 0.8 - px, ty = 0.58 - py;
      const c = Math.cos(a), s = Math.sin(a);
      return [px + c * tx - s * ty, py + s * tx + c * ty, 0];
    },
    head: [-0.38, 0.62, 0], feet: [0, 0, 0],
  },
  idle: (t) => ({ bob: Math.sin(t * 2.6) * 0.01, walkT: Math.sin(t * 0.7) * 0.04 }),
  glsl: `
float RB;   // the rear-up angle
vec3 toWorld(vec3 v){ vec3 o = v - vec3(.3, .2, 0.); o.xy = R(-RB) * o.xy; return o + vec3(.3, .2, 0.); }
float map(vec3 p){
  float d = 1e5;
  float bw = WIND*clamp(1. - OPEN*1.7, 0., 1.);
  RB = .32*bw - .12*ATK;
  vec3 q = p;
  q.x += .22*ATK;   // the lunge
  q.y -= .02*sin(T*2.6);
  vec3 o = q - vec3(.3, .2, 0.); o.xy = R(RB) * o.xy; q = o + vec3(.3, .2, 0.);
  float hair = .012*vnoise(p*38.) + .006*vnoise(p*90.);
  // ---- cephalothorax ----
  vec3 cq = q - vec3(-.2, .5, 0.);
  float ce = (length(cq/vec3(.27, .16, .22)) - 1.)*.16;
  ce = smin(ce, (length((cq - vec3(-.1, .07, 0.))/vec3(.15, .1, .14)) - 1.)*.1, .05);   // the raised head
  U(d, ce + hair, 1., cq);
  // eight eyes in a cluster
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    for (int k = 0; k < 4; k++) {
      vec3 ep = k == 0 ? vec3(-.38, .62, .045) : k == 1 ? vec3(-.33, .67, .085) : k == 2 ? vec3(-.27, .63, .13) : vec3(-.27, .7, .04);
      float er = k == 0 ? .042 : k == 1 ? .03 : k == 2 ? .026 : .022;
      ep.z *= fs;
      float e = length(q - ep) - er;
      U(d, e, 3., (q - ep)/er); E(e);
    }
  }
  // chelicerae and fangs
  float fo = max(OPEN*.6, max(ATK, bw*.6));
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 a = vec3(-.4, .48, .075*fs), b = vec3(-.5, .28, (.085 + .05*fo)*fs);
    U(d, sdCapT(q, a, b, .075, .05) + hair*.8, 1., q);
    vec3 f1 = b + vec3(.0, -.08, -.03*fs + .04*fo*fs), f2 = f1 + vec3(.07 - .06*fo, -.02, -.05*fs);
    float fg = min(sdCapT(q, b + vec3(0., .02, 0.), f1, .032, .02), sdCapT(q, f1, f2, .02, .002));
    U(d, fg, 5., q);
    // pedipalps
    vec3 pa = vec3(-.42, .42, .14*fs), pb = vec3(-.6, .38 + .05*sin(T*3. + fs), .2*fs), pc = vec3(-.66, .2 + .06*bw, .2*fs);
    U(d, min(sdCapT(q, pa, pb, .04, .03), sdCapT(q, pb, pc, .03, .025)) + hair, 1., q);
  }
  // ---- abdomen, swung up over the back to shoot ----
  vec3 aq = q - vec3(.08, .55, 0.);
  float tilt = smoothstep(0., .6, OPEN)*1.25;
  aq.xy = R(-tilt) * aq.xy;
  float br = .015*sin(T*2.2);
  float ab = (length((aq - vec3(.36, .06, 0.))/vec3(.44 + br, .36 + br, .38 + br)) - 1.)*.36;
  ab = smin(ab, sdCapT(aq, vec3(-.02, 0., 0.), vec3(.12, .03, 0.), .06, .1), .05);   // pedicel
  U(d, ab + hair, 2., aq);
  // spinnerets
  vec3 sp = aq - vec3(.76, .02, 0.);
  for (int s = -1; s <= 1; s += 2) U(d, sdCapT(sp, vec3(-.04, 0., .03*float(s)), vec3(.05, -.02, .045*float(s)), .035, .015), 5., sp);
  if (OPEN > .05) G(length(sp - vec3(.07, -.02, 0.)) - .02 - .03*OPEN);
  // ---- eight jointed legs ----
  vec3 lb = p - vec3(.22*ATK*0. , 0., 0.);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float an = i == 0 ? .5 : i == 1 ? 1.15 : i == 2 ? 1.85 : 2.45;
      float ln = i == 0 ? 1.12 : i == 1 ? .98 : i == 2 ? .92 : 1.06;
      vec3 dir = vec3(-cos(an), 0., sin(an)*fs);
      vec3 root = toWorld(vec3(-.2, .5, 0.) + dir*vec3(.2, 0., .16));
      root.x -= .22*ATK;
      float ph = WALK*6.283 + 3.1416*(fi + (s > 0 ? 1. : 0.));
      vec3 foot = vec3(-.2, 0., 0.) + dir*ln*vec3(1., 0., .85);
      foot.x += .09*cos(ph); foot.y += max(0., sin(ph))*.13;
      foot += vec3(.012*sin(T*5. + fi*1.7 + fs), 0., 0.);
      if (i == 0) {   // the front legs rear up, then stab down on the strike
        foot = mix(foot, root + vec3(-.4, .45 + .06*sin(T*6. + fs), .1*fs), bw);
        foot = mix(foot, vec3(-.2, 0., 0.) + dir*1.15 + vec3(-.3, 0., 0.), ATK*(1. - bw));
      }
      vec3 knee = mix(root, foot, .32) + vec3(0., .5*ln, 0.) + dir*vec3(.0, 0., .04);
      if (i == 0) knee += vec3(.0, .12*bw, 0.);
      vec3 ank = foot + vec3(0., .2, 0.) - dir*.06;
      vec3 l = p;
      float lg = sdCapT(l, root, knee, .055, .045);
      lg = min(lg, sdCapT(l, knee, ank, .045, .03));
      float lt = sdCapT(l, ank, foot, .03, .012);
      U(d, lg + hair*.9, 1., vec3(length(l - knee), 0., 2.));
      U(d, lt + hair*.6, 4., vec3(length(l - foot), 0., 2.));
    }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  float fur = vnoise(p*vec3(60., 22., 60.));
  if (m == 2.) {
    // the ember marking: a chevron spine and a burning spot, on top of the abdomen
    vec3 a = lp - vec3(.36, .06, 0.);
    if (a.y > .05) {
      float ch = abs(fract((a.x + abs(a.z)*1.1)*3.6 + .1) - .5);
      float band = abs(a.z) - (.16 - a.x*.18);
      float spot = length(vec2(a.x + .12, a.z)) - .085;
      if ((ch < .1 && band < 0. && a.x > -.2 && a.x < .35) || spot < 0. || (abs(a.z) < .018 && a.x < .3)) {
        m = 3.; return .55 + .25*sin(T*3. - a.x*8.)*.5 + .3*n.y;
      }
      if ((ch < .16 && band < .03 && a.x > -.24 && a.x < .38) || spot < .025) return sh*.35;
    }
    return sh*(.75 + .4*fur);
  }
  if (m == 1. && lp.z > 1.5) {   // legs: pale bands at the joints
    if (abs(fract(lp.x*3.2) - .5) > .4) { m = 4.; return sh*(.8 + .3*fur); }
    return sh*(.7 + .5*fur);
  }
  if (m == 3.) return .45 + .55*max(0., -lp.x*.5 + lp.y*.4 - lp.z*.3) + .1*sh;   // glossy eyes
  if (m == 5.) return sh*1.1 + .1;
  if (m == 1.) return sh*(.7 + .5*fur);
  return sh;
}`,
};
