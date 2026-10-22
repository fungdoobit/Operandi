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
  B2 = vec3(.5 + .3*w - .1*lu, .95 + .1*w - .25*lu, .04);
  B3 = H + vec3(.1 - .02*lu, -.2 + .1*lu, 0.);
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
  vec3 hc = bz(.8), tn = normalize(normalize(bz(.88) - bz(.72)) + vec3(0., 1.2, 0.));
  vec3 fw = normalize(vec3(-1., 0., -.15) - tn*dot(tn, vec3(-1., 0., -.15)));
  vec3 sd = cross(tn, fw);
  vec3 hq = p - hc - fw*.02;
  vec3 hl = vec3(dot(hq, fw), dot(hq, tn), dot(hq, sd));
  float flare = 1. + .25*OPEN + .15*WIND;
  float hs = .4*flare;
  hl.x += .7*hl.z*hl.z;   // curved back like a cupped shield
  float hood = (length(hl/vec3(.05, .27 + .03*flare, hs*(.45 + .55*smoothstep(-.3, .08, hl.y)))) - 1.)*.04;
  hood = max(hood, hl.y - .2);   // flat-topped under the head
  hood += .003*sin(atan(hl.z, hl.y)*7.);   // ribbed edge
  U(d, hood, hl.x > .004 ? 2. : 1., vec3(hl.y, hl.z, 7.));
  // ---- the head: a wedge with a hinged lower jaw ----
  vec3 q = (p - H)/1.3;
  q.xy = R(-.15*lu + .1*w) * q.xy;
  vec3 uq = q; uq.xy = R(.3*jaw) * uq.xy;   // upper jaw tips up a little
  float up = (length(uq/vec3(.23, .1, .1 + .06*smoothstep(-.2, .12, uq.x))) - 1.)*.09;   // a viper's wedge, wide at the back
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
    vec2 dm = vec2(fract(lp.x*2.6) - .5, back*.26);
    float dia = abs(dm.x) + abs(dm.y);
    vec2 cell = vec2(lp.x*26., ang*3.2); cell.x += .5*floor(cell.y);
    float sc = fract(cell.x);
    sh = sh*(.86 + .16*sc);
    if (dia < .22) return sh*.3;
    if (dia < .3) return sh*1.25 + .1;
    if (back > 1.3 && abs(fract(lp.x*2.6 + .5) - .5) < .07) return sh*.6;   // side bars
    return sh;
  }
  if (m == 1. && lp.z > .5 && lp.z < 1.5) {   // head scales: big plates
    float pl = vnoise(p*26.);
    return sh*(.8 + .3*pl) - .03;
  }
  if (m == 2. && lp.z > 6.5) {   // the hood's face: dark eye-bars
    if (abs(lp.y) > .2 - .1*smoothstep(-.05, -.3, lp.x)) { m = 1.; return sh*.75; }
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
  float hair = .014*vnoise(p*38.) + .01*vnoise(p*90.);
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
      float er = k == 0 ? .05 : k == 1 ? .035 : k == 2 ? .028 : .024;
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
    if (a.y > -.08) {
      float ch = abs(fract((a.x + abs(a.z)*1.1)*3.6 + .1) - .5);
      float band = abs(a.z) - (.22 - a.x*.2);
      float spot = length(vec2(a.x + .14, a.z)) - .1;
      if ((ch < .1 && band < 0. && a.x > -.24 && a.x < .4) || spot < 0. || (abs(a.z) < .02 && a.x < .36)) {
        m = 3.; return .55 + .25*sin(T*3. - a.x*8.)*.5 + .3*n.y;
      }
      if ((ch < .17 && band < .04 && a.x > -.28 && a.x < .42) || spot < .03) return sh*.3;
    }
    // faint ember veins cracking the sides
    float v = abs(vnoise(a*vec3(5., 9., 5.) + 4.) - .5);
    if (v < .025 && a.y > -.25) { m = 3.; return .3 + .2*sin(T*2. + a.x*6.); }
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

// ---- Sludge Snail: a mutated giant snail ----
// A huge cracked spiral shell, split by glowing toxic seams and overgrown with
// jagged green crystals, carried on a slimy grey-green foot that oozes as it
// moves. Eye stalks sway over a dripping maw lined with rasping teeth. It
// pulls into its shell to wind up, then slams forward; it spits slime.
export const snail = {
  name: "Sludge Snail", w: 270, h: 200, ground: 0, offX: 0.0, scale: 0.42, pitch: 0.2,
  palettes: [
    ["#0c120e", "#1c2820", "#2e3e32", "#465a48", "#62785e", "#86a07c"],   // 1 body: slimy grey-green
    ["#140e0a", "#2a1e16", "#443022", "#5e4632", "#7c6248", "#9c8266"],   // 2 shell: dull brown stone
    ["#1a3a04", "#3e7a0a", "#6eb814", "#a6ec2a", "#d8ff70", "#f8ffd0"],   // 3 toxic glow: eyes, seams
    ["#100408", "#24080e", "#3e1018", "#5a1c22", "#7a2c30", "#9e4444"],   // 4 maw
    ["#2a2a1a", "#4a4a30", "#706c4c", "#9a9470", "#c4bc98", "#e8e2c4"],   // 5 teeth
    ["#06200e", "#0e4420", "#1a7036", "#2aa052", "#5cd27a", "#b8ffc8"],   // 6 crystals
  ],
  glow: ["#1a5a10", "#6eb814", "#d8ff70", "#3e7a0a", "#a6ec2a", "#f0ffb0"],
  anchors: {
    core: [0.1, 0.65, 0],
    weapon: (P) => [-0.95 - 0.3 * (P.atk || 0) + 0.3 * (P.wind || 0), 0.32, -0.05],
    muzzle: (P) => [-1.0 - 0.15 * (P.atk || 0) + 0.25 * (P.wind || 0) * (1 - (P.open || 0)), 0.34, -0.05],
    head: [-0.85, 0.6, -0.05], feet: [0, 0, 0],
  },
  idle: (t) => ({ bob: Math.sin(t * 1.6) * 0.01 }),
  glsl: `
float crystal(vec3 p, vec3 base, vec3 dir, float len, float w){
  vec3 q = p - base;
  vec3 up = normalize(dir), sd = normalize(cross(up, vec3(0., 0., 1.) + vec3(.3, 0., 0.))), fw = cross(sd, up);
  q = vec3(dot(q, sd), dot(q, up), dot(q, fw));
  q.y -= len*.5;
  vec3 a = abs(q);
  float hex = max(a.x*.866 + a.z*.5, a.z) - w*(1. - smoothstep(len*.15, len*.5, q.y));
  return max(hex, a.y - len*.5)*.8;
}
float map(vec3 p){
  float d = 1e5;
  float wn = WIND*(1. - .7*OPEN);          // pulled into the shell
  float lu = ATK*(1. - .6*OPEN);           // the slam forward
  float ext = -.32*wn + .32*lu;            // how far the head reaches out
  // ---- the foot / body, oozing along the ground ----
  vec3 b = p;
  float ooze = .02*vnoise(p*9. + vec3(0., -T*.8, T*.3)) + .008*vnoise(p*25.);
  vec3 h0 = vec3(.6, .12, 0.), h1 = vec3(-.45 - ext*.6, .2, -.03), h2 = vec3(-.78 - ext, .38 + .03*sin(T*1.6) - .1*wn, -.05);
  float body = sdCapT(b, h0, h1, .13, .22);
  body = smin(body, sdCapT(b, h1, h2, .22, .2), .12);
  // a skirt of slime spreading at the base
  body = smin(body, sdCapT(b, vec3(.7, .02, 0.), vec3(-.55 - ext*.6, .03, -.03), .07, .15), .1);
  body = max(body, -b.y);
  // the maw: a dark hole in the front of the head, opening wide
  vec3 mq = b - h2 - vec3(-.18, -.08, 0.);
  float mo = clamp(OPEN*1.2 + lu*.6, 0., 1.);
  float maw = (length(mq/vec3(.08, .03 + .07*mo, .09 + .03*mo)) - 1.)*.05;
  float bd = max(body + ooze, -maw);
  U(d, bd, -maw > body - .01 ? 4. : 1., b);
  if (mo > .05) {
    for (int i = 0; i < 5; i++) {   // a ring of rasping teeth
      float a = float(i)*1.2566 + .6;
      vec3 tp = vec3(-.02, cos(a)*(.035 + .065*mo), sin(a)*(.07 + .03*mo));
      U(d, sdCapT(mq, tp, tp*.4 + vec3(-.03, 0., 0.), .016, .002), 5., mq);
    }
  }
  // drool strands hanging from the maw
  for (int i = 0; i < 3; i++) {
    float fi = float(i), ph = fract(T*.35 + fi*.37);
    vec3 s0 = h2 + vec3(-.2 + .04*fi, -.14, -.06 + .06*fi);
    float ln = .06 + .22*ph + .1*mo;
    float dr = sdCapT(b, s0, s0 + vec3(.0, -ln, 0.), .022, .012);
    dr = smin(dr, length(b - s0 - vec3(0., -ln, 0.)) - .026*(1. - ph*.4), .03);
    U(d, dr, 1., b);
    G(dr + .03);
  }
  // eye stalks with glowing eyes, and two short feelers
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 e0 = h2 + vec3(-.02, .14, .08*fs);
    float sl = 1. - .75*wn;
    vec3 e1 = e0 + vec3(-.12 + .06*sin(T*1.3 + fs), .42*sl, .1*fs + .04*sin(T*1.7 + fs*2.));
    vec3 em = mix(e0, e1, .5) + vec3(.05, .02, 0.);
    float st = min(sdCapT(b, e0, em, .055, .04), sdCapT(b, em, e1, .04, .03));
    U(d, st + ooze*.4, 1., b);
    vec3 eq = b - e1 - normalize(e1 - em)*.03;
    float eye = length(eq) - .055*(.6 + .4*sl);
    U(d, eye, 3., eq); E(eye);
    vec3 f0 = h2 + vec3(-.16, -.02, .12*fs);
    U(d, sdCapT(b, f0, f0 + vec3(-.14, -.1 + .03*sin(T*2. + fs), .06*fs), .04, .015), 1., b);
  }
  // ---- the shell (bounded) ----
  vec3 sq = p - vec3(.2 + .05*wn - .08*lu, .8 - .03*wn, .05);
  if (sdBox(sq, vec3(.95, .95, .6)) < .2) {
    sq.xy = R(-.25 - .1*lu + .15*wn) * sq.xy;
    float r = length(sq.xy), a = atan(sq.y, sq.x);
    float u = (log(max(r, .02)/.08)/.13 - a)/6.2832;
    float k = fract(u);
    float groove = 1. - smoothstep(0., .1, min(k, 1. - k));
    float sh = (length(sq/vec3(.74, .72, .44)) - 1.)*.44;
    sh += .045*groove - .022*sin(k*3.1416);
    sh += .06*exp(-r*r*14.)*smoothstep(.1, .4, abs(sq.z));   // the sunken centre of the spiral
    sh += .012*vnoise(sq*14.) + .006*vnoise(sq*40.);
    U(d, sh, 2., vec3(u, sq.z, r));
    // toxic crystals bursting out of the shell
    float cr = crystal(sq, vec3(-.1, .62, -.1), vec3(-.2, 1., -.3), .42, .085);
    cr = min(cr, crystal(sq, vec3(.12, .62, .1), vec3(.25, 1., .1), .32, .07));
    cr = min(cr, crystal(sq, vec3(.38, .5, -.18), vec3(.7, .8, -.4), .38, .075));
    cr = min(cr, crystal(sq, vec3(-.32, .56, -.22), vec3(-.6, .9, -.5), .24, .055));
    cr = min(cr, crystal(sq, vec3(.55, .28, .05), vec3(1., .3, .1), .26, .06));
    U(d, cr, 6., sq);
    G(cr + .04);
    // swollen glowing boils
    float bo = length(sq - vec3(.0, .3, -.4)) - .07;
    bo = min(bo, length(sq - vec3(.42, .12, -.32)) - .055);
    bo = min(bo, length(sq - vec3(-.3, .2, -.36)) - .045);
    U(d, bo, 3., sq);
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 2.) {   // shell: growth lines, ridges, glowing cracks
    float k = fract(lp.x);
    float lines = .85 + .15*sin(lp.x*6.2832*6.);
    if (min(k, 1. - k) < .04) return sh*.35;
    float cr = abs(vnoise(p*vec3(5., 6., 5.) + 2.) - .5) + .3*abs(vnoise(p*14.) - .5);
    if (cr < .03) { m = 3.; return .55 + .35*(sin(T*2.5 + p.y*8.)*.5 + .5); }
    if (cr < .055) return sh*.45;
    return sh*lines*(.85 + .25*vnoise(p*20.));
  }
  if (m == 1.) {   // wet, mottled slime
    float mt = vnoise(p*7. + vec3(0., T*.3, 0.));
    float wet = pow(max(dot(reflect(normalize(vec3(.55, -.8, .5)), n), vec3(0., 0., -1.)), 0.), 20.);
    return sh*(.75 + .35*mt) + .35*wet;
  }
  if (m == 6.) return sh*.8 + .25*pow(max(n.y, 0.), 2.) + .1;
  if (m == 3.) return .55 + .45*max(dot(n, normalize(vec3(-.5, .5, -.7))), 0.);
  return sh;
}`,
};

// ---- Bone Legion: a squad of three skeleton warriors ----
// Bleached, cracked bones under rusty dented helmets and ragged crimson
// wraps, each with a round shield and a curved scimitar, cold blue fire in
// the eye sockets. The leader stands in front; two more flank him behind.
// They raise their blades together and slash one after another.
export const skeleton = {
  name: "Bone Legion", w: 290, h: 210, ground: 0, offX: 0.0, scale: 0.3, pitch: 0.18,
  palettes: [
    ["#1e1a14", "#3e382c", "#6a6250", "#9a9178", "#c8c0a4", "#ece6d2"],   // 1 bone
    ["#140a06", "#2e160c", "#4e2a14", "#74401e", "#9a5e2c", "#c08448"],   // 2 rusty iron
    ["#002a3a", "#005a78", "#0aa0c8", "#40d8ff", "#a0f0ff", "#f0ffff"],   // 3 eye fire
    ["#050404", "#0e0a0a", "#1a1414", "#261e1c", "#342824", "#40322c"],   // 4 hollows
    ["#160608", "#300c10", "#4e1418", "#6e2020", "#8c3428", "#a85038"],   // 5 cloth
    ["#14100a", "#2c2214", "#48381e", "#66502a", "#86683a", "#a8864e"],   // 6 shield wood
    ["#1a1c20", "#353a40", "#565c64", "#7c848c", "#a8b0b6", "#d8dee2"],   // 7 blade steel
  ],
  glow: ["#005a78", "#40d8ff", "#c0f8ff", "#005a78", "#40d8ff", "#d0faff"],
  anchors: {
    core: [-0.05, 0.85, -0.2],
    weapon: (P) => {
      const a = clamp((P.atk || 0) / 0.6, 0, 1), w = (P.wind || 0) * (1 - a);
      let h = mix3([-0.3, 0.88, -0.48], [0.05, 1.68, -0.44], w);
      h = mix3(h, [-0.58, 0.82, -0.46], a);
      return [h[0] - 0.25 * (1 - w), h[1] + 0.1, h[2]];
    },
    muzzle: [-0.5, 1.0, -0.2],
    head: [-0.06, 1.45, -0.2], feet: [0, 0, 0],
  },
  idle: (t) => ({ bob: Math.sin(t * 2.0) * 0.008 }),
  glsl: `
// one skeleton warrior, standing at the origin facing -x, about 1.55 tall.
// ph: its own time offset; at, wd: its own strike and wind-up.
void warrior(inout float d, vec3 p, float ph, float at, float wd, float wk){
  if (sdBox(p - vec3(-.18, 1., 0.), vec3(.95, 1.15, .5)) > .25) { d = min(d, sdBox(p - vec3(-.18, 1., 0.), vec3(.95, 1.15, .5))); return; }
  float t = T + ph;
  float br = .012*sin(t*2.1);
  vec3 q = p;
  // lean into the slash, back on the wind-up
  q.y -= .02*wd; q.xy = R(.12*wd - .22*at) * (q.xy - vec2(0., .1)) + vec2(0., .1);
  float cr = .006*vnoise(p*30.);
  // legs: hip, knee, ankle; a running stride when walking
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    float st = sin(WALK*6.283 + fs*1.57 + ph);
    vec3 hip = vec3(0., .74 - .03*wk, .09*fs);
    vec3 ft = vec3(fs < 0. ? -.2 : .2, .03, .13*fs);
    ft.x += .18*st*wk; ft.y += max(0., cos(WALK*6.283 + fs*1.57 + ph))*.1*wk;
    vec3 kn = mix(hip, ft, .5) + vec3(-.08, .02, 0.);
    float lg = min(sdCapT(p, hip, kn, .038, .03), sdCapT(p, kn, ft + vec3(0., .04, 0.), .03, .024));
    lg = min(lg, length(p - kn) - .042);
    lg = min(lg, sdCapT(p, ft + vec3(.03, .03, 0.), ft + vec3(-.11, 0., 0.), .03, .02));
    U(d, lg + cr, 1., p);
  }
  // pelvis, spine, ribs
  U(d, sdRBox(q - vec3(0., .78, 0.), vec3(.07, .06, .13), .04) + cr, 1., q);
  U(d, sdCapT(q, vec3(.03, .8, 0.), vec3(.02, 1.3, 0.), .03, .026) + cr, 1., q);
  vec3 rq = q - vec3(-.02, 1.08, 0.);
  float cage = abs(length(rq/vec3(.14 + br, .19, .17 + br)) - 1.)*.14 - .014;
  cage = max(cage, abs(fract(rq.y*14. + .5) - .5)*.07 - .016);   // separate ribs
  cage = max(cage, rq.y - .16); cage = max(cage, -rq.y - .19);
  cage = max(cage, -(rq.x + .12 - abs(rq.z)*.3));               // open at the front
  U(d, cage + cr, 1., rq);
  U(d, sdCapT(q, vec3(-.12, 1.2, 0.), vec3(-.13, .96, 0.), .02, .012), 1., q);   // sternum
  // ragged cloth wraps round the hips and a sash over the chest
  vec3 cq = q - vec3(0., .66, 0.);
  float sk = sdCapT(cq, vec3(0., .14, 0.), vec3(0., -.12, 0.), .15, .2);
  sk = max(abs(sk) - .012, -cq.y - .14 - .1*vnoise(cq*vec3(30., 1., 30.)) + .04*sin(t*2. + cq.x*12.));
  sk = max(sk, cq.y - .14);
  U(d, sk, 5., cq);
  float sash = sdCapT(q, vec3(.0, 1.26, .15), vec3(-.12, .82, -.14), .045, .04);
  sash = max(sash, -sdCapT(q, vec3(.0, 1.26, .15), vec3(-.12, .82, -.14), .0, .0) - .06);
  U(d, sash, 5., q);
  // skull with a dented rusty helmet and a hanging jaw
  vec3 hq = q - vec3(-.04, 1.43 + br*.5, 0.);
  hq.xy = R(.08*sin(t*1.3) - .15*at) * hq.xy;
  float sk2 = (length(hq/vec3(.12, .12, .105)) - 1.)*.105;
  sk2 = smin(sk2, sdRBox(hq - vec3(-.06, -.07, 0.), vec3(.05, .04, .065), .03), .04);
  // the eye sockets: dark hollows with blue fire inside
  float so = 1e5;
  for (int s = -1; s <= 1; s += 2) so = min(so, length((hq - vec3(-.11, -.02, .045*float(s)))/vec3(.8, 1., 1.)) - .034);
  U(d, max(sk2 + cr, -so), -so > sk2 - .006 ? 4. : 1., hq);
  for (int s = -1; s <= 1; s += 2) {
    vec3 e = hq - vec3(-.1, -.02, .045*float(s));
    float eye = length(e) - .014 - .004*sin(t*9. + float(s));
    U(d, eye, 3., e); E(eye - .01);
  }
  vec3 jq = hq - vec3(-.04, -.11, 0.); jq.xy = R(-.25*at - .1*wd - .05*sin(t*1.7)) * jq.xy;
  U(d, sdRBox(jq - vec3(-.03, -.02, 0.), vec3(.05, .018, .06), .015) + cr, 1., jq);
  for (int i = -1; i <= 1; i++) U(d, sdBox(hq - vec3(-.12, -.095, .025*float(i)), vec3(.01, .014, .008)), 1., hq);   // teeth
  vec3 hm = hq - vec3(.0, .03, 0.);
  float helm = abs(length(hm/vec3(.145, .13, .13)) - 1.)*.13 - .012;
  helm = max(helm, -hm.y + .0);
  helm = min(helm, sdCylY(hm - vec3(0., .005, 0.), .16, .008));      // brim
  helm = min(helm, sdCapT(hm, vec3(.0, .12, 0.), vec3(.03, .23, 0.), .02, .004));   // spike
  helm = min(helm, sdBox(hm - vec3(-.14, -.04, 0.), vec3(.008, .06, .012)));   // nose guard
  helm += .008*vnoise(hm*24.);
  U(d, helm, 2., hm);
  // sword arm (near side): raised on the wind-up, slashes down
  vec3 sh = vec3(.0, 1.24, -.19);
  vec3 hd = mix(vec3(-.28, .9, -.28), vec3(.05, 1.66, -.24), wd);
  hd = mix(hd, vec3(-.56, .84, -.26), at);
  vec3 el = (sh + hd)*.5 + vec3(.1, -.1 + .1*wd, -.06);
  U(d, min(sdCapT(q, sh, el, .03, .024), sdCapT(q, el, hd, .024, .02)) + cr, 1., q);
  U(d, min(length(q - el) - .032, length(q - sh) - .045), 1., q);
  // the scimitar: a curved blade in the arm's swing plane
  float ba = mix(mix(.75, 2.5, wd), -.55, at);
  vec3 bq = q - hd;
  bq.xy = R(-ba) * bq.xy;   // blade runs along -x in bq
  float u = -bq.x;
  float cv = .14*(u/.62)*(u/.62);
  float wdt = mix(.022, .045, smoothstep(.1, .5, u))*(1. - smoothstep(.5, .66, u)) + .004;
  float bl = max(abs(bq.y - cv) - wdt, abs(u - .34) - .32);
  bl = max(bl, abs(bq.z) - .008);
  U(d, bl*.8, 7., vec3(u, bq.y - cv, wdt));
  U(d, sdBox(bq - vec3(.0, .0, 0.), vec3(.012, .05, .016)), 2., bq);   // crossguard
  U(d, sdCap(bq, vec3(.0, 0., 0.), vec3(.1, 0., 0.), .016), 5., bq);   // grip
  // shield arm (far side): a round rusty shield held forward
  vec3 sh2 = vec3(.02, 1.24, .19);
  vec3 hd2 = vec3(-.22, 1.0 + .08*wd, .2) + vec3(-.04*at, 0., 0.);
  vec3 el2 = (sh2 + hd2)*.5 + vec3(.05, -.1, .05);
  U(d, min(sdCapT(q, sh2, el2, .03, .024), sdCapT(q, el2, hd2, .024, .02)) + cr, 1., q);
  vec3 sq = q - hd2 - vec3(-.05, 0., .02);
  sq.xz = R(.35) * sq.xz;
  float shd = sdCylY(sq.yxz, .2, .02) - .01;
  shd = smin(shd, length(sq - vec3(-.02, 0., 0.)) - .055, .02);   // the boss
  shd += .005*vnoise(sq*30.);
  U(d, shd, length(sq.yz) > .17 || length(sq.yz) < .06 ? 2. : 6., sq);
}
float map(vec3 p){
  float d = 1e5;
  float a0 = smoothstep(0., .6, ATK), a1 = smoothstep(.2, .8, ATK), a2 = smoothstep(.4, 1., ATK);
  float wk = smoothstep(0., .3, abs(sin(WALK*3.1416)));
  // two behind, a little smaller, then the leader in front
  vec3 p1 = (p - vec3(.42, 0., .42)) / .9;
  p1.xz = R(.12) * p1.xz;
  warrior(d, p1, 1.7, a1, WIND*(1. - a1), wk);
  vec3 p2 = (p - vec3(-.32, 0., .55)) / .86;
  p2.xz = R(-.1) * p2.xz;
  warrior(d, p2, 3.1, a2, WIND*(1. - a2), wk);
  d *= .86;
  vec3 p0 = p - vec3(-.05, 0., -.2);
  warrior(d, p0, 0., a0, WIND*(1. - a0), wk);
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {   // bleached bone: grime in the hollows, hairline cracks
    float c = abs(vnoise(p*vec3(14., 22., 14.)) - .5);
    if (c < .02) return sh*.4;
    return sh*(.82 + .25*vnoise(p*18.)) - .04*(1. - n.y);
  }
  if (m == 2.) {   // rusty iron, pitted
    float r = vnoise(p*16.) + .5*vnoise(p*40.);
    return sh*(.7 + .35*r) + (r > 1.1 ? .12 : 0.);
  }
  if (m == 5.) return sh*(.8 + .3*vnoise(p*vec3(40., 6., 40.)));   // frayed cloth threads
  if (m == 7.) {   // the blade: a bright edge, a rusty spine
    if (lp.y < -lp.z*.4) return sh*1.2 + .25;
    if (vnoise(p*22.) > .7) { m = 2.; return sh; }
    return sh;
  }
  if (m == 6.) return sh*(.75 + .3*step(.5, fract(p.y*20. + p.x*3.)));   // planks
  return sh;
}`,
};
