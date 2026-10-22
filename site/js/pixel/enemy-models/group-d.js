// Enemies of Modules 6-8 (PRD Addendum K): the Murk Swamp's Bog Witch and Hex
// Wizard, the Scorched Wastes' Chrome Reaper and Rust Gunner, and the Fallen
// Keep's Fallen Knight. See enemy-px.js for what a model gives. All face left
// (-x), toward the teammate; the camera sits at -z, so -z is the side we see.

// Shared GLSL helpers (each model compiles its own shader, so each gets a copy).
const LIB = `
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.)/max(k1, 1e-4); }
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719)))*43758.5453); }
`;

// Pose helpers shared by the GLSL and the anchors (keep in step).
const mix3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---- Bog Witch ----
// A hunched crone floating over the bog: layered tattered robes (murky purple,
// a mossy green shawl, the hem rotted to mud), a crooked tall hat with a wide
// drooping brim, long grey hair, a gaunt hook-nosed face with glowing violet
// eyes and a crooked grin, and long bony fingers. The near hand dangles a
// bubbling violet flask (the muzzle): WIND winds it back over her head, ATK
// throws it; for the beam (OPEN) both clawed hands rise.
const witchHand = (P) => {
  const ra = sstep(0.7, 0.95, P.open || 0), thr = (P.wind || 0) * (1 - ra), atk = P.atk || 0;
  let h = [-0.44, 0.6, -0.28];
  h = h.map((v, i) => v + ([0.12, 1.48, -0.34][i] - [-0.44, 0.6, -0.28][i]) * thr + ([-0.66, 1.0, -0.22][i] - [-0.44, 0.6, -0.28][i]) * atk * (1 - ra));
  h = h.map((v, i) => v + ([-0.8, 1.0, -0.4][i] - [-0.44, 0.6, -0.28][i]) * ra + [-0.14, 0, 0][i] * atk * ra);
  return h.map((v) => v * 1.18);
};
export const witch = {
  name: "Bog Witch", w: 220, h: 224, fly: true, hover: -0.22, scale: 0.34, pitch: 0.14, offX: -0.08,
  palettes: [
    ["#0c0610", "#1c0e24", "#2e1838", "#44234e", "#5e3468", "#7e4c88"],   // 1 robe (murky purple)
    ["#080c06", "#141c0e", "#223018", "#324422", "#485c30", "#647a44"],   // 2 shawl, bog mud
    ["#1a0630", "#4a1488", "#8a3ae0", "#b878ff", "#e0c0ff", "#ffffff"],   // 3 violet glow (eyes, potion)
    ["#141814", "#2a302a", "#46504a", "#68726a", "#8c968c", "#b4bcae"],   // 4 skin (grey-green, gaunt)
    ["#141416", "#2c2c30", "#4a4a50", "#6c6c74", "#93939a", "#c4c4c8"],   // 5 hair (grey)
    ["#060408", "#0e0a12", "#1a1420", "#28202e", "#3a2e42", "#504058"],   // 6 hat
    ["#0a0806", "#1a140e", "#2e2418", "#463624", "#5e4a30", "#7a6240"],   // 7 cork, flask glass, teeth
  ],
  glow: ["#3a0e70", "#9a4cff", "#e8d0ff", "#3a0e70", "#a860ff", "#f0e0ff"],
  anchors: {
    core: [0, 0.75, 0], head: [-0.39, 1.25, 0], feet: [0, 0, 0],
    muzzle: (P) => { const h = witchHand(P); return (P.open || 0) > 0.8 ? [h[0] - 0.08, h[1], h[2] + 0.1] : [h[0] - 0.02, h[1] + (-0.14 + 0.3 * (P.wind || 0) * (1 - sstep(0.7, 0.95, P.open || 0))), h[2]]; },
    weapon: (P) => witchHand(P),
  },
  idle: (t) => ({ bob: Math.sin(t * 1.6) * 0.035, lean: Math.sin(t * 0.9) * 0.025 }),
  glsl: LIB + `
vec3 hand(float ra, float thr){
  vec3 r = vec3(-.44, .6, -.28);
  vec3 h = r + (vec3(.12, 1.48, -.34) - r)*thr + (vec3(-.66, 1., -.22) - r)*ATK*(1. - ra);
  return h + (vec3(-.8, 1.0, -.4) - r)*ra + vec3(-.14, 0., 0.)*ATK*ra;
}
float map(vec3 p){
  float d = 1e5;
  if (sdBox(p - vec3(-.1, .95, 0.), vec3(.95, 1.2, .7)) > .2) return sdBox(p - vec3(-.1, .95, 0.), vec3(.95, 1.2, .7));
  float ra = smoothstep(.7, .95, OPEN), thr = WIND*(1. - ra);
  vec3 q = p/1.18;
  q.xy = R(-.12*ATK + .14*thr - .05*ra) * q.xy;
  // the robe: a hunched cone, rotting into ragged tendrils at the hem
  float ang = atan(q.z, q.x);
  vec3 rq = q; rq.z *= 1.12;
  rq.x -= .3*pow(1. - smoothstep(0., .55, q.y), 2.) + .04*sin(T*1.5 + q.y*5.)*(1. - smoothstep(0., .5, q.y));   // the hem trails behind her
  float robe = smin(sdCapT(rq, vec3(.06, .02, 0.), vec3(-.03, .6, 0.), .36, .23), sdCapT(rq, vec3(-.03, .6, 0.), vec3(-.13, .97, 0.), .23, .17), .08);
  robe += .018*sin(ang*9. + q.y*4.) + .02*vnoise(q*9.);
  float tw = ang*4.5 + .6*sin(T*1.3 + q.y*3.);
  float hem = .26*(1. - pow(abs(cos(tw)), 6.)) + .07*vnoise(vec3(ang*7., T*.7, 1.)) - .04;   // long ragged tendrils
  robe = max(robe, hem - q.y);
  U(d, robe, 1., q);
  // the shawl: a second, mossy layer over the shoulders with a jagged edge
  float sh = smin(sdCapT(rq, vec3(-.05, .5, 0.), vec3(-.14, 1., 0.), .29, .22), sdEll(rq - vec3(-.12, 1.0, 0.), vec3(.22, .12, .25)), .06);
  sh += .02*vnoise(q*12.);
  sh = max(sh, .47 + .14*abs(sin(ang*2.5 + 1.)) + .07*vnoise(vec3(ang*6., 2., 0.)) - q.y);
  U(d, sh, 2., q);
  // head, hunched forward and down
  vec3 hc = vec3(-.33, 1.06, 0.);
  vec3 h = q - hc; h.xy = R(.25) * h.xy;
  U(d, sdCapT(q, vec3(-.15, .98, 0.), hc + vec3(.04, -.02, 0.), .08, .06), 4., q);
  U(d, sdEll(q - vec3(-.02, 1.0, 0.), vec3(.2, .16, .22)) + .015*vnoise(q*14.), 2., q);   // the hump
  float head = sdEll(h, vec3(.12, .15, .11));
  head = smin(head, sdCapT(h, vec3(-.04, -.07, 0.), vec3(-.13, -.2, 0.), .055, .012), .04);   // a long pointed chin
  head = smin(head, sdCapT(h, vec3(-.1, .01, 0.), vec3(-.2, -.06, 0.), .034, .012), .02);     // the hooked nose
  head = smin(head, sdCapT(h, vec3(-.2, -.06, 0.), vec3(-.19, -.11, 0.), .013, .004), .01);
  // a wide crooked grin cut into the face
  vec3 mq = h - vec3(-.1, -.075, 0.);
  float grin = sdBox(mq - vec3(0., 3.5*mq.z*mq.z, 0.), vec3(.04, .012, .085));
  float headc = max(head, -grin);
  U(d, headc, -grin > head - .006 ? 7. : 4., h);
  for (int i = -2; i <= 2; i++) {   // jagged teeth
    vec3 tq = mq - vec3(-.025, .012 + 3.5*pow(float(i)*.032, 2.), float(i)*.032);
    U(d, sdCapT(tq, vec3(0.), vec3(0., -.02, 0.), .01, .0), 7., tq);
  }
  // glowing violet eyes under a heavy brow
  for (int s = -1; s <= 1; s += 2) {
    vec3 e = h - vec3(-.095, .035, .055*float(s));
    float eye = sdEll(e, vec3(.032, .026, .036));
    eye = max(eye, dot(e, normalize(vec3(.3, 1., -.7*float(s)))) - .004);
    U(d, eye, 3., e); E(eye - .01);
  }
  // long grey hair hanging from under the hat
  float bx1 = sdBox(q - vec3(-.12, .85, 0.), vec3(.3, .4, .32)); if (bx1 >= .1) d = min(d, bx1); else {
    for (int i = 0; i < 6; i++) {
      float fi = float(i), z = -.13 + fi*.052;
      vec3 a = hc + vec3(.03, .06, z*.9);
      vec3 b = vec3(-.02 + .12*abs(z)*4., .5 - .07*mod(fi, 2.), z*2.6) + vec3(.03*sin(T*1.4 + fi), 0., 0.);
      vec3 hq = q + vec3(0., 0., .01*sin(q.y*30. + fi));
      U(d, sdCapT(hq, a, b, .045, .012) + .006*sin(hq.y*60. + fi*2.), 5., hq);
    }
  }
  // the crooked hat: a wide drooping brim and a tall bent cone
  vec3 b = h - vec3(.03, .13, 0.); b.xy = R(.1) * b.xy;
  float br = length(b.xz), ba = atan(b.z, b.x);
  float brim = sdCylY(b + vec3(0., .07*smoothstep(.1, .3, br) + .015*sin(ba*5.), 0.), .36 + .03*sin(ba*4. + 1.), .012);
  U(d, brim - .004, 6., b);
  vec3 c0 = vec3(.0, 0., 0.), c1 = vec3(.05, .32, 0.), c2 = vec3(.2, .52, 0.), c3 = vec3(.4, .55 + .02*sin(T*1.2), .02);
  float cone = sdCapT(b, c0, c1, .15, .09);
  cone = smin(cone, sdCapT(b, c1, c2, .09, .05), .03);
  cone = smin(cone, sdCapT(b, c2, c3, .05, .008), .02);
  cone += .008*vnoise(b*25.);
  U(d, cone, 6., b);
  U(d, sdCapT(b, vec3(0., .035, 0.), vec3(.012, .07, 0.), .148, .135), 2., b);   // a mossy band
  // arms: tattered sleeves and long bony fingers
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 S = vec3(-.15, .9, .2*fs);
    vec3 H = fs < 0. ? hand(ra, thr) : vec3(-.5, .74, .24) + (vec3(-.76, 1.18, .3) - vec3(-.5, .74, .24))*ra + vec3(-.12, 0., 0.)*ATK*ra;
    vec3 El = mix(S, H, .5) + vec3(.06, -.12, .08*fs);
    U(d, sdCapT(q, S, El, .06, .045), 1., q);
    float sl = sdCapT(q, El, H, .045, .1);
    sl = max(sl, dot(q - H, normalize(H - El)) + .03 - .025*sin(atan(q.z - H.z, q.y - H.y)*5.));
    U(d, sl, 1., q);
    U(d, sdEll(q - H, vec3(.04, .03, .035)), 4., q);
    vec3 dir = normalize(H - El);
    for (int f = 0; f < 4; f++) {
      float ff = float(f) - 1.5;
      vec3 f0 = H + vec3(-.02, .0, ff*.02);
      vec3 f1, f2;
      if (fs < 0. && ra < .5) { f1 = f0 + vec3(-.05, -.03, ff*.012); f2 = f1 + vec3(.02, -.06, 0.); }   // gripping the flask
      else { f1 = f0 + dir*.08 + vec3(-.02, ff*.025, ff*.03); f2 = f1 + dir*.06 + vec3(-.01, -.05, ff*.01); }
      U(d, sdCapT(q, f0, f1, .013, .009), 4., q);
      U(d, sdCapT(q, f1, f2, .009, .002), 4., q);
    }
  }
  // the bubbling flask, hanging from the near hand
  vec3 F = hand(ra, thr) + vec3(-.02, -.12 + .25*thr, 0.);
  vec3 fq = q - F;
  float flask = length(fq) - .075;
  U(d, flask, 3., fq); G(flask);
  U(d, sdCylY(fq - vec3(0., .08, 0.), .026, .04), 7., fq);
  U(d, sdCylY(fq - vec3(0., .125, 0.), .03, .012), 7., fq);
  for (int i = 0; i < 3; i++) {
    float k = fract(T*.9 + float(i)*.33);
    vec3 bq = fq - vec3(.02*sin(k*9. + float(i)), .14 + k*.18, 0.);
    float bub = length(bq) - .022*(1. - k);
    U(d, bub, 3., bq); G(bub);
  }
  return d*1.18;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1. || m == 2.) {
    float nz = vnoise(lp*14.);
    if (m == 1. && lp.y < .2 + .14*vnoise(lp*6.)) m = 2.;   // the hem soaked in bog mud
    if (vnoise(lp*5. + 4.) > .72) sh -= .12;                // patches
    return sh*.9 + .1*nz - .04;
  }
  if (m == 6.) return sh + .12*vnoise(lp*18.) - .06;
  if (m == 4.) return sh*.95 + .08*vnoise(lp*30.);
  return sh;
}`,
};

// ---- Hex Wizard ----
// A tall dark sorcerer in a deep indigo hooded robe trimmed with glowing blue
// runes. Under the pointed hood there is only darkness and two blue eyes. His
// near hand grips a gnarled staff whose clawed head holds a floating, spinning
// crystal (the muzzle); his far hand floats an open spellbook with glowing
// pages, and a broken rune ring circles him. WIND draws the staff back, ATK
// thrusts it at the teammate; for the fireball rain (OPEN) he lifts it overhead.
const wizStaff = (P) => {
  const rk = sstep(0.7, 0.95, P.open || 0), w = (P.wind || 0) * (1 - rk), at = (P.atk || 0) * (1 - rk);
  const H0 = [-0.56, 0.95, -0.32];
  let H = H0.map((v, i) => v + ([-0.22, 1.08, -0.3][i] - v) * w + ([-0.6, 1.12, -0.3][i] - v) * at + ([-0.3, 1.62, -0.28][i] - v) * rk);
  const a = 0.08 + (-0.5 - 0.08) * w + (0.8 - 0.08) * at + (0.12 - 0.08) * rk;
  return [H[0] - Math.sin(a) * 1.22, H[1] + Math.cos(a) * 1.22, H[2]];
};
export const wizard = {
  name: "Hex Wizard", w: 230, h: 270, ground: 0, scale: 0.36, pitch: 0.14, offX: -0.18,
  palettes: [
    ["#06070e", "#0c0f1e", "#151a30", "#1f2644", "#2c365c", "#3e4a78"],   // 1 robe (deep indigo)
    ["#040408", "#090a12", "#10121e", "#181b2c", "#22263c", "#2e3450"],   // 2 hood lining, mantle
    ["#04223a", "#0a4a7a", "#1a7ec4", "#4ab8ff", "#a8e2ff", "#ffffff"],   // 3 blue glow (eyes, runes, crystal)
    ["#0e0906", "#1e140c", "#342214", "#4c341e", "#664828", "#866034"],   // 4 staff wood
    ["#2a2418", "#4e4430", "#76684a", "#a08e66", "#c6b48a", "#e8dab4"],   // 5 pages
    ["#100506", "#22090c", "#3a1014", "#561a1e", "#74282a", "#94403a"],   // 6 tome leather
    ["#000000", "#020204", "#04050a", "#080a12", "#0c0e18", "#12141e"],   // 7 the dark under the hood
    ["#141210", "#2c2620", "#4a4034", "#6e604c", "#988870", "#c8b898"],   // 8 old bronze
  ],
  glow: ["#0a3a6a", "#2a90ff", "#bfe8ff", "#0a3a6a", "#3aa8ff", "#d8f2ff"],
  anchors: {
    core: [0, 0.8, 0], head: [-0.15, 1.55, 0], feet: [0, 0, 0],
    muzzle: (P) => wizStaff(P), weapon: (P) => wizStaff(P),
  },
  idle: (t) => ({ bob: Math.sin(t * 1.9) * 0.01, lean: Math.sin(t * 0.8) * 0.02 }),
  glsl: LIB + `
float map(vec3 p){
  float d = 1e5;
  float bb = sdBox(p - vec3(-.3, 1.3, 0.), vec3(1.2, 1.5, .8));
  if (bb > .2) return bb;
  float rk = smoothstep(.7, .95, OPEN), w = WIND*(1. - rk), at = ATK*(1. - rk);
  vec3 q = p;
  q.xy = R(.1*w - .1*at - .04*rk) * q.xy;
  float ang = atan(q.z, q.x);
  // the robe: a long cone, folds, a ragged hem on the floor
  vec3 rq = q; rq.z *= 1.15;
  float robe = smin(sdCapT(rq, vec3(.05, .05, 0.), vec3(-.04, .8, 0.), .42, .27), sdCapT(rq, vec3(-.04, .8, 0.), vec3(-.06, 1.28, 0.), .27, .22), .1);
  robe += .02*sin(ang*8. + q.y*2.) + .012*vnoise(q*10.);
  robe = max(robe, -q.y + .05*vnoise(vec3(ang*6., 0., 0.)) * (1. - smoothstep(-.2, .2, -q.x)));
  U(d, robe, 1., q);
  // a heavy ragged mantle over the shoulders
  float man = sdEll(rq - vec3(-.05, 1.22, 0.), vec3(.32, .2, .36));
  man = max(man, .98 + .1*abs(sin(ang*3.5)) + .05*vnoise(vec3(ang*8., 1., 0.)) - q.y);
  U(d, man + .01*vnoise(q*14.), 2., q);
  // the hood: a big pointed cowl with a dark opening
  vec3 h = q - vec3(-.1, 1.5, 0.);
  float hood = sdEll(h, vec3(.2, .23, .2));
  hood = smin(hood, sdCapT(h, vec3(.04, .05, 0.), vec3(.24, .36, 0.), .14, .01), .08);
  hood = smin(hood, sdEll(h - vec3(.04, -.16, 0.), vec3(.24, .1, .26)), .06);
  float open = sdEll(h - vec3(-.17, -.04, 0.), vec3(.14, .17, .13));
  hood = max(hood, -open);
  U(d, hood, 2., h);
  // nothing in there but darkness and two eyes
  U(d, sdEll(h - vec3(-.02, -.04, 0.), vec3(.14, .16, .14)), 7., h);
  for (int s = -1; s <= 1; s += 2) {
    vec3 e = h - vec3(-.15, -.01, .052*float(s));
    float eye = sdEll(e, vec3(.02, .018, .03));
    eye = max(eye, dot(e, normalize(vec3(.3, 1., -.6*float(s)))) - .002);
    U(d, eye, 3., e); E(eye - .012);
  }
  // the staff: gnarled wood, a clawed bronze head and a floating crystal
  vec3 H = vec3(-.56, .95, -.32);
  H += (vec3(-.22, 1.08, -.3) - H)*w + (vec3(-.6, 1.12, -.3) - vec3(-.56, .95, -.32))*at + (vec3(-.3, 1.62, -.28) - vec3(-.56, .95, -.32))*rk;
  float a = .08 + (-.5 - .08)*w + (.8 - .08)*at + (.12 - .08)*rk;
  vec3 dir = vec3(-sin(a), cos(a), 0.);
  vec3 sq = q - H;
  float staff = sdCapT(sq, -dir*.95, dir*.95, .028, .036) + .012*vnoise(sq*28.);
  staff = smin(staff, length(sq - dir*.5) - .045, .03);   // a knot
  U(d, staff, 4., sq);
  vec3 top = dir*.98;
  for (int i = 0; i < 3; i++) {   // three bronze claws cupping the crystal
    float fa = float(i)*2.094 + .5;
    vec3 side = vec3(cos(a), sin(a), 0.)*cos(fa) + vec3(0., 0., 1.)*sin(fa);
    vec3 k1 = top + side*.09 + dir*.08, k2 = top + side*.06 + dir*.26;
    U(d, sdCapT(sq, top, k1, .025, .018), 8., sq);
    U(d, sdCapT(sq, k1, k2, .018, .004), 8., sq);
  }
  U(d, length(sq - top) - .045, 8., sq);
  vec3 cq = sq - dir*(1.22 + .02*sin(T*2.5));
  cq.xz = R(T*1.6) * cq.xz;
  float cry = sdOct(cq*vec3(1., .55, 1.), .1)*.6;
  U(d, cry, 3., cq); G(cry - .02);
  // hands: the staff hand and the book hand
  U(d, sdCapT(q, vec3(-.1, 1.18, -.24), H + vec3(.03, 0., .02), .07, .1), 1., q);   // the near sleeve
  U(d, sdEll(sq - vec3(0., 0., 0.), vec3(.05, .07, .05)), 2., sq);
  vec3 B = vec3(-.46, 1.02 + .03*sin(T*2.1) + .25*rk, .34);
  U(d, sdCapT(q, vec3(-.1, 1.18, .24), B + vec3(.12, -.14, -.02), .07, .1), 1., q);   // the far sleeve
  // the floating spellbook, open; pages flutter as he casts
  vec3 bq = q - B; bq.xy = R(-.35) * bq.xy;
  float oa = .35 + .5*OPEN + .1*sin(T*3.);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 lq = bq; lq.yz = R(fs*oa) * lq.yz;
    lq.z -= fs*.08;
    U(d, sdBox(lq, vec3(.11, .012, .08)) - .004, 6., lq);
    U(d, sdBox(lq - vec3(0., .016, 0.), vec3(.1, .008, .075)), 5., lq);
  }
  // a broken rune ring circling him
  vec3 rr = q - vec3(-.02, .72 + .04*sin(T*1.3), 0.);
  rr.yz = R(-.45) * rr.yz; rr.xy = R(.2) * rr.xy; rr.xz = R(T*.7) * rr.xz;
  float ring = length(vec2(length(rr.xz) - .62, rr.y*.6)) - .016;
  ring = max(ring, -(abs(fract(atan(rr.z, rr.x)*1.27) - .5) - .12));
  U(d, ring, 3., rr); G(ring);
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1. || m == 2.) {
    // glowing runes: a band along the hem, down the robe's front and round the hood's rim
    float ang = atan(lp.z, lp.x);
    float glow = .55 + .3*sin(T*2. + lp.y*8.);
    // the hem band: two thin lines with glyphs between them
    if (m == 1. && lp.y < .2) {
      float v = (lp.y - .05)/.1, u = ang*14.;
      if (abs(v - .5) > .62 && abs(v - .5) < .78) { m = 3.; return glow; }
      if (v > 0. && v < 1.) {
        vec2 c = vec2(floor(u), 0.), f = vec2(fract(u), v);
        float h1 = hash1(c.x*7.1), h2 = hash1(c.x*3.3 + 5.);
        bool g = (abs(f.x - .5) < .14 && h1 > .3) || (abs(f.y - .5) < .14 && h2 > .5) || (abs(f.x - f.y) < .13 && h1 < .5);
        if (g && f.x > .15 && f.x < .85) { m = 3.; return glow; }
      }
    }
    // a line of glyphs down the robe's front
    float fa = abs(abs(ang) - 3.14159);
    if (m == 1. && fa < .16 && lp.y > .2 && lp.y < 1.2) {
      vec2 c = vec2(0., floor(lp.y*14.)), f = vec2(fa/.16, fract(lp.y*14.));
      float h1 = hash1(c.y*7.1), h2 = hash1(c.y*3.3 + 5.);
      bool g = (f.x < .18) || (abs(f.y - .5) < .13 && h2 > .4 && f.x < .8) || (abs(f.x - .5) < .12 && h1 > .5 && f.y > .2 && f.y < .8);
      if (g) { m = 3.; return glow; }
    }
    // the hood's rim
    if (m == 2. && length(lp) < .3 && lp.x < -.1) {
      float e = sdEll(lp - vec3(-.17, -.04, 0.), vec3(.14, .17, .13));
      if (e > -.0 && e < .02) { m = 3.; return glow; }
    }
    return sh*.92 + .08*vnoise(lp*16.);
  }
  if (m == 5.) return sh*.8 + (hash1(floor(lp.x*60.) + floor(lp.z*30.)*7.) > .7 ? -.25 : .1);
  if (m == 4.) return sh + .1*vnoise(lp*vec3(40., 8., 40.)) - .05;
  return sh;
}`,
};

// ---- Chrome Reaper ----
// A tall chrome endoskeleton out of the wastes, hunched forward like a hunter on
// bent knees: polished steel bones with a hydraulic piston beside each one,
// black cables down the spine, an open ribcage around a red reactor core, an
// angular skull with a bladed crest, a heavy toothed jaw and two red optics.
// A long burnt coat hangs in tatters off its shoulders. Its near forearm is a
// heavy plasma cannon (the muzzle): WIND/OPEN raise it to aim and light its
// coils, ATK kicks it back with the recoil.
const REAPER_PELVIS = [0.02, 0.92], REAPER_HUNCH = 0.16;
const reaperUpper = ([x, y, z]) => {   // the torso leans forward around the pelvis (as in the GLSL)
  const c = Math.cos(REAPER_HUNCH), s = Math.sin(REAPER_HUNCH), dx = x - REAPER_PELVIS[0], dy = y - REAPER_PELVIS[1];
  return [REAPER_PELVIS[0] + c * dx - s * dy, REAPER_PELVIS[1] + s * dx + c * dy, z];
};
const reaperGun = (P) => {
  const aim = Math.max(P.wind || 0, P.open || 0), at = P.atk || 0;
  const E = [-0.1 + 0.1 * at, 1.26, -0.3];
  const a = -0.55 + 0.6 * aim + 0.12 * at;
  return reaperUpper([E[0] - Math.cos(a) * 0.78, E[1] + Math.sin(a) * 0.78, E[2]]);
};
export const reaper = {
  name: "Chrome Reaper", w: 220, h: 220, ground: 0, scale: 0.36, pitch: 0.12, offX: -0.2,
  palettes: [
    ["#06080c", "#1a2028", "#3c4652", "#7a8694", "#c2ccd6", "#f4f8fc"],   // 1 chrome
    ["#050608", "#0c0e12", "#16191f", "#22262e", "#30353f", "#424854"],   // 2 dark steel (joints, sleeves)
    ["#2a0206", "#6a0612", "#c41226", "#ff3a4a", "#ff9aa2", "#ffffff"],   // 3 red glow (optics, core, coils)
    ["#0a0706", "#1a120d", "#2c1f15", "#40301f", "#58432b", "#72583a"],   // 4 burnt coat
    ["#040304", "#0a0709", "#140d10", "#1e1418", "#2a1c22", "#38262c"],   // 5 cables
    ["#08090c", "#14171c", "#24282f", "#383d46", "#545a64", "#7a808a"],   // 6 gunmetal cannon
  ],
  glow: ["#5a0410", "#ff2a40", "#ffb0b8", "#5a0410", "#ff3a4a", "#ffc0c6"],
  anchors: {
    core: [0, 1.15, 0], head: reaperUpper([-0.08, 1.86, 0]), feet: [0, 0, 0],
    muzzle: (P) => reaperGun(P), weapon: (P) => reaperGun(P),
  },
  idle: (t) => ({ bob: Math.sin(t * 2.0) * 0.008, lean: Math.sin(t * 0.7) * 0.015 }),
  glsl: LIB + `
// a long bone with a hydraulic piston running beside it
void limb(inout float d, vec3 q, vec3 a, vec3 b, float r, vec3 off){
  U(d, sdCapT(q, a, b, r, r*.75), 1., q);
  vec3 a2 = a + off, b2 = b + off, m = mix(a2, b2, .55);
  U(d, sdCap(q, a2, m, r*.6), 2., q);    // the cylinder
  U(d, sdCap(q, m, b2, r*.3), 1., q);    // the polished rod
}
float map(vec3 p){
  float d = 1e5;
  float bb = sdBox(p - vec3(-.25, 1.1, 0.), vec3(1.05, 1.15, .6));
  if (bb > .2) return bb;
  float aim = max(WIND, OPEN);
  vec3 q = p;
  // legs on bent knees: chrome bones, pistons, joints, clawed feet
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = WALK*6.283 + fs*1.57;
    vec3 hip = vec3(.02, .9, .13*fs), knee = vec3(-.16 + .05*sin(ph), .52, .16*fs), ank = vec3(.04 + .04*sin(ph), .12, .15*fs);
    limb(d, q, hip, knee, .045, vec3(.07, .02, 0.));
    limb(d, q, knee, ank, .038, vec3(.06, 0., 0.));
    U(d, length(q - knee) - .058, 2., q);
    U(d, sdRBox(q - knee - vec3(-.05, .01, 0.), vec3(.03, .05, .04), .015), 1., q);   // knee cap
    U(d, length(q - ank) - .042, 2., q);
    vec3 f = q - ank;
    U(d, sdRBox(f - vec3(-.07, -.08, 0.), vec3(.09, .028, .05), .018), 1., f);
    for (int k = -1; k <= 1; k++) U(d, sdCapT(f, vec3(-.14, -.08, float(k)*.035), vec3(-.25, -.1, float(k)*.045), .02, .006), 1., f);
    U(d, sdCapT(f, vec3(.02, -.06, 0.), vec3(.11, -.1, 0.), .022, .006), 1., f);   // heel spur
  }
  U(d, sdRBox(q - vec3(.02, .92, 0.), vec3(.09, .06, .18), .035), 1., q);   // pelvis
  // everything above the pelvis hunches forward
  vec3 t = q - vec3(.02, .92, 0.); t.xy = R(-.16 - .05*ATK) * t.xy; t += vec3(.02, .92, 0.);
  for (int k = 0; k < 4; k++) {   // spine
    vec3 v = t - vec3(.06, 1.02 + float(k)*.1, 0.);
    U(d, sdRBox(v, vec3(.04, .028, .055), .014), 1., v);
    U(d, sdCapT(v, vec3(.02, 0., 0.), vec3(.1, -.03, 0.), .02, .004), 1., v);   // spinous spikes
  }
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 c = t - vec3(.03*sin(t.y*9. + fs), 0., .07*fs);
    U(d, sdCap(c, vec3(.02, .96, 0.), vec3(.02, 1.52, 0.), .018), 5., c);
  }
  // the ribcage around a red reactor core
  vec3 cq = t - vec3(-.02, 1.45, 0.);
  float bx2 = sdBox(cq, vec3(.3, .3, .32)); if (bx2 >= .1) d = min(d, bx2); else {
    float core = length(cq - vec3(.0, -.02, 0.)) - .08 - .01*sin(T*6.);
    U(d, core, 3., cq); G(core - .02);
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      vec3 r = cq - vec3(0., .13 - fk*.08, 0.);
      r.xy = R(-.15) * r.xy;
      float rib = length(vec2(length(r.xz*vec2(1.15, 1.)) - (.2 - fk*.014), r.y)) - .017;
      rib = max(rib, -(r.x + .18));
      U(d, rib, 1., r);
    }
    U(d, sdRBox(cq - vec3(-.19, .02, 0.), vec3(.022, .14, .035), .012), 1., cq);   // sternum
    vec3 pl = cq - vec3(-.05, .19, 0.);
    U(d, sdRBox(pl, vec3(.12, .04, .2), .035), 1., pl);   // a chest plate over the upper ribs
  }
  // shoulders: small armoured caps
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 sh = t - vec3(.0, 1.64, .27*fs);
    U(d, length(sh) - .065, 2., sh);
    U(d, max(sdEll(sh - vec3(.01, .03, .0), vec3(.08, .055, .07)), -sh.y + .01), 1., sh);
    U(d, sdCap(t, vec3(-.03, 1.62, .04*fs), vec3(0., 1.64, .22*fs), .016), 1., t);
  }
  // the far arm: skeletal, a three-clawed hand reaching forward
  {
    vec3 S = vec3(.0, 1.62, .3), E = vec3(.06, 1.26, .34), H = vec3(-.26 + .05*sin(T*1.3), 1.08, .32);
    limb(d, t, S, E, .036, vec3(.05, 0., .0));
    U(d, length(t - E) - .045, 2., t);
    U(d, sdCap(t, E, H, .02), 1., t);
    U(d, sdCap(t, E + vec3(0., 0., .03), H + vec3(0., 0., .03), .014), 2., t);
    U(d, sdRBox(t - H, vec3(.04, .03, .03), .012), 1., t);
    for (int k = -1; k <= 1; k++) {
      vec3 f0 = H + vec3(-.03, -.01, float(k)*.025), f1 = f0 + vec3(-.08, -.03, float(k)*.012), f2 = f1 + vec3(-.02, -.08, 0.);
      U(d, sdCap(t, f0, f1, .011), 1., t); U(d, sdCapT(t, f1, f2, .01, .002), 1., t);
    }
  }
  // the near arm: upper arm, then the plasma cannon instead of a forearm
  {
    vec3 S = vec3(.0, 1.62, -.3), E = vec3(-.1 + .1*ATK, 1.26, -.3);
    limb(d, t, S, E, .042, vec3(.05, 0., 0.));
    U(d, length(t - E) - .065, 2., t);
    float a = -.55 + .6*aim + .12*ATK;
    vec3 g = t - E; g.xy = R(a) * g.xy;   // cannon space: the barrel runs down -x
    float bx3 = sdBox(g - vec3(-.38, 0., 0.), vec3(.48, .2, .2)); if (bx3 >= .1) d = min(d, bx3); else {
      U(d, sdCylY((g - vec3(-.18, 0., 0.)).yxz, .115, .17), 6., g);
      U(d, sdCylY((g - vec3(-.52, 0., 0.)).yxz, .075, .2), 6., g);
      for (int k = 0; k < 3; k++) {   // charging coils
        vec3 c = g - vec3(-.42 - float(k)*.09, 0., 0.);
        float coil = sdCylY(c.yxz, .1, .018);
        U(d, coil, aim > .05 ? 3. : 2., c);
        if (aim > .05) G(coil + .03 - .04*aim);
      }
      float muz = sdCylY((g - vec3(-.74, 0., 0.)).yxz, .1, .045);
      muz = max(muz, -sdCylY((g - vec3(-.8, 0., 0.)).yxz, .055, .1));
      U(d, muz, 1., g);
      float bore = sdCylY((g - vec3(-.72, 0., 0.)).yxz, .055, .02);
      U(d, bore, 3., g); G(bore + .03 - .04*aim);
      U(d, sdRBox(g - vec3(-.24, .13, 0.), vec3(.15, .025, .055), .012), 1., g);   // heat-sink fins
      U(d, sdRBox(g - vec3(-.24, .0, -.13), vec3(.15, .055, .02), .012), 1., g);
      U(d, sdCap(g, vec3(-.05, -.1, 0.), vec3(.22, -.22, .06), .02), 5., g);   // a feed cable to the core
    }
  }
  // the skull: a long angular cranium, a bladed crest, red optics, a heavy toothed jaw
  vec3 h = t - vec3(-.1, 1.84, 0.);
  h.xy = R(.08 + .05*sin(T*.9) - .1*aim) * h.xy;
  float bx4 = sdBox(h, vec3(.28, .26, .2)); if (bx4 >= .1) d = min(d, bx4); else {
    U(d, sdCap(t, vec3(.0, 1.6, 0.), vec3(-.05, 1.76, 0.), .03), 2., t);   // neck
    U(d, sdCap(t, vec3(.03, 1.6, .04), vec3(-.02, 1.78, .05), .014), 1., t);
    float sk = sdEll(h - vec3(.05, .05, 0.), vec3(.17, .13, .115));
    sk = smin(sk, sdRBox(h - vec3(-.08, -.01, 0.), vec3(.07, .07, .09), .03), .04);   // the face
    sk = smin(sk, sdRBox(h - vec3(-.1, .04, 0.), vec3(.045, .016, .105), .01), .02);  // a heavy brow
    sk = max(sk, -sdBox(h - vec3(-.15, -.05, 0.), vec3(.03, .02, .02)));               // nose slit
    for (int s = -1; s <= 1; s += 2) sk = max(sk, -sdEll(h - vec3(-.16, .005, .052*float(s)), vec3(.045, .032, .036)));   // sockets
    U(d, sk, 1., h);
    vec3 j = h - vec3(-.07, -.11, 0.);
    j.xy = R(-.25*OPEN) * j.xy;
    U(d, sdRBox(j, vec3(.075, .028, .08), .015), 1., j);
    for (int k = -2; k <= 2; k++) {   // teeth, top and bottom
      U(d, sdBox(j - vec3(-.07, .035, float(k)*.026), vec3(.008, .016, .009)), 1., j);
      U(d, sdBox(j - vec3(-.07, .07, float(k)*.026), vec3(.008, .014, .009)), 1., j);
    }
    for (int s = -1; s <= 1; s += 2) {
      float fs = float(s);
      vec3 e = h - vec3(-.15, .005, .052*fs);
      float eye = length(e) - .026;
      U(d, eye, 3., e); E(eye - .008);
      U(d, sdCap(h, vec3(.0, -.04, .1*fs), vec3(-.07, -.11, .08*fs), .013), 2., h);   // jaw pistons
    }
    for (int k = 0; k < 3; k++) {   // the bladed crest, swept back
      float fk = float(k);
      vec3 c = h - vec3(-.04 + fk*.1, .17 - fk*.02, 0.);
      c.xy = R(.5) * c.xy;
      U(d, extrude(sdTrap(c.xy*vec2(1., -1.) + vec2(.0, .05), .04, .004, .06), c.z, .011), 1., c);
    }
  }
  // a long burnt coat hanging off the shoulders in tatters, swaying
  vec3 k = t - vec3(.14, 1.1, 0.);
  float bx5 = sdBox(k, vec3(.3, .7, .45)); if (bx5 >= .1) d = min(d, bx5); else {
    float lo = 1. - smoothstep(-.1, .5, k.y);
    k.x -= .05*sin(T*1.6 + k.y*4. + k.z*6.)*lo + .15*lo;
    float coat = abs(length(k.xz*vec2(1.3, 1.) + vec2(.22, 0.)) - .42 - .12*lo) - .014;
    coat = max(coat, -k.x - .04);
    coat = max(coat, k.y - .56);
    float rag = -.78 + .45*pow(abs(sin(k.z*9. + 1.)), .7) + .14*vnoise(vec3(k.z*24., 0., 0.));
    coat = max(coat, rag - k.y);
    coat = max(coat, -(vnoise(k*9.) - .74)*.1);   // burnt holes
    U(d, coat, 4., k);
    U(d, sdEll(k - vec3(-.12, .55, 0.), vec3(.16, .06, .34)), 4., k);   // the torn collar
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {
    // polished chrome: a sharp sky / ground horizon reflected in it
    float ry = n.y + .35*n.x;
    float env = ry > .08 ? .62 + .38*smoothstep(.08, .7, ry) : .08 + .25*smoothstep(-.6, .08, ry);
    return mix(sh, env, .6) + .12*pow(max(dot(n, normalize(vec3(-.4, .5, -.8))), 0.), 20.);
  }
  if (m == 4.) {
    float v = vnoise(lp*14.);
    if (v > .64) return .02;                    // charred
    return sh*.85 + .12*v;
  }
  if (m == 6.) return sh + (fract(lp.x*18.) < .15 ? -.15 : 0.);
  return sh;
}`,
};

// ---- Rust Gunner ----
// A second, cruder war robot of the wastes: a rusted, battle-scarred steel
// skeleton hunched under a tattered sand-coloured poncho, a gas-mask face plate
// with a filter snout, hoses and one big red eye, a bent antenna, heavy boots,
// and a battered rifle held in both hands (the muzzle at the barrel's end).
// Shooting: WIND shoulders the rifle to aim, ATK kicks it back with the recoil.
// The bash (no OPEN): WIND hauls the rifle up, butt first, ATK rams the butt
// forward.
const gunPose = (P) => {
  const b = 1 - Math.min(1, Math.max(0, (P.open || 0) * 3)), w = P.wind || 0, at = P.atk || 0;
  const S = [-0.26, 1.0, -0.1], SW = [-0.2, 1.2, -0.12], SA = [0.07, 0.03], BW = [-0.02, 1.26, -0.14], BA = [-0.5, 1.12, -0.12];
  let G = S.map((v, i) => v + (SW[i] - v) * w * (1 - b) + (BW[i] - v) * w * b);
  G = [G[0] + SA[0] * at * (1 - b) + (BA[0] - BW[0]) * at * b, G[1] + SA[1] * at * (1 - b) + (BA[1] - BW[1]) * at * b, G[2]];
  const ang = -0.28 + 0.28 * w * (1 - b) + 0.16 * at * (1 - b) + 2.5 * w * b + 3.05 * at * b;
  return { G, ang };
};
const gunAt = (P, lx, ly) => { const { G, ang } = gunPose(P), c = Math.cos(ang), s = Math.sin(ang); return [G[0] + c * lx - s * ly, G[1] + s * lx + c * ly, G[2]]; };
export const gunner = {
  name: "Rust Gunner", w: 210, h: 200, ground: 0, scale: 0.33, pitch: 0.12, offX: -0.22,
  palettes: [
    ["#0c0705", "#1e120c", "#342014", "#4e3420", "#6a4c30", "#8c6a48"],   // 1 rusted steel
    ["#1a0802", "#3e1404", "#6a2606", "#9a400c", "#c46018", "#e88a34"],   // 2 bright rust
    ["#2a0202", "#6a0606", "#c40e0e", "#ff3424", "#ff9a7a", "#ffffff"],   // 3 red eye
    ["#110e08", "#262012", "#3e3420", "#584a30", "#746446", "#94845e"],   // 4 poncho (faded sand)
    ["#050505", "#0d0d0e", "#18181a", "#252528", "#343438", "#48484e"],   // 5 rubber, hoses, mask
    ["#0a0a0b", "#17181a", "#26282b", "#383b3f", "#4e5257", "#6c7076"],   // 6 gun metal
    ["#0e0806", "#20140c", "#382416", "#523622", "#6c4a30", "#8a6240"],   // 7 wood (stock, grip)
  ],
  glow: ["#5a0606", "#ff2a14", "#ffb0a0", "#5a0606", "#ff3424", "#ffc0b0"],
  anchors: {
    core: [0, 0.95, 0], head: [-0.16, 1.45, 0], feet: [0, 0, 0],
    muzzle: (P) => gunAt(P, -0.62, 0.035), weapon: (P) => gunAt(P, 0.3, -0.02),
  },
  idle: (t) => ({ bob: Math.sin(t * 2.6) * 0.008, lean: Math.sin(t * 1.1) * 0.012 + (Math.sin(t * 7.3) > 0.97 ? 0.02 : 0) }),
  glsl: LIB + `
float map(vec3 p){
  float d = 1e5;
  float bb = sdBox(p - vec3(-.25, .95, 0.), vec3(1.05, 1.0, .6));
  if (bb > .2) return bb;
  float b = 1. - clamp(OPEN*3., 0., 1.);   // 1 = the bash, 0 = shooting
  vec3 q = p;
  // legs: rusted bones on bent knees, heavy boots
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = WALK*6.283 + fs*1.57;
    vec3 hip = vec3(.03, .78, .12*fs), knee = vec3(-.12 + .05*sin(ph), .44, .15*fs + .02*fs), ank = vec3(.03 + .04*sin(ph), .13, .14*fs);
    U(d, sdCapT(q, hip, knee, .055, .045), 1., q);
    U(d, sdCap(q, hip + vec3(.06, 0., 0.), knee + vec3(.06, .05, 0.), .022), 6., q);   // a bent strut
    U(d, sdCapT(q, knee, ank, .045, .035), 1., q);
    U(d, sdRBox(q - knee - vec3(-.03, 0., 0.), vec3(.06, .06, .055), .02), 1., q);
    vec3 f = q - ank;
    U(d, sdRBox(f - vec3(-.06, -.07, 0.), vec3(.12, .05, .075), .03), 5., f);   // boot
    U(d, sdRBox(f - vec3(-.06, -.115, 0.), vec3(.13, .015, .08), .01), 5., f);
  }
  U(d, sdRBox(q - vec3(.03, .8, 0.), vec3(.1, .07, .17), .03), 1., q);   // pelvis
  // the torso hunches forward
  vec3 t = q - vec3(.03, .8, 0.); t.xy = R(-.22 - .06*ATK*b) * t.xy; t += vec3(.03, .8, 0.);
  // the poncho: a ragged cone over the shoulders, swaying
  vec3 pq = t - vec3(-.02, 1.3, 0.);
  float ang = atan(pq.z, pq.x);
  float lo = smoothstep(.0, -.5, pq.y);
  pq.x -= .04*sin(T*1.8 + pq.z*5.)*lo;
  float pon = sdCapT(pq*vec3(1., 1., .92), vec3(0., .02, 0.), vec3(.03, -.48, 0.), .13, .38) + .015*sin(ang*7. + pq.y*3.);
  pon = max(pon, -(pq.y + .5 - .1*abs(sin(ang*4.5 + .5)) - .05*vnoise(vec3(ang*9., 0., 0.))));
  pon = max(pon, -sdCapT(pq, vec3(0., -.1, 0.), vec3(.03, -.7, 0.), .09, .33));   // hollow inside
  U(d, pon, 4., pq);
  U(d, sdTorZ((pq - vec3(0., .02, 0.)).xzy, .12, .04), 4., pq);   // a rolled collar
  // the gas-mask head
  vec3 h = t - vec3(-.14, 1.45, 0.);
  h.xy = R(.15 + .05*sin(T*.8) - .1*WIND*(1. - b)) * h.xy;
  float bx1 = sdBox(h, vec3(.3, .3, .22));
  if (bx1 >= .1) d = min(d, bx1); else {
    U(d, sdEll(h - vec3(.03, .03, 0.), vec3(.14, .14, .13)), 1., h);   // the skull cap
    vec3 mq = h - vec3(-.07, -.03, 0.);
    float mask = sdEll(mq, vec3(.1, .12, .12));
    mask = smin(mask, sdCapT(mq, vec3(-.04, -.03, 0.), vec3(-.15, -.1, 0.), .07, .05), .04);
    U(d, mask, 5., mq);
    vec3 fq = mq - vec3(-.15, -.1, 0.);   // the filter canister
    fq.xy = R(.6) * fq.xy;
    U(d, sdCylY(fq.yxz - vec3(0., -.03, 0.), .06, .04), 6., fq);
    U(d, sdCylY(fq.yxz - vec3(0., -.075, 0.), .045, .01), 1., fq);
    // the single big red eye, off-centre on the near side
    vec3 e = h - vec3(-.13, .03, -.045);
    U(d, sdTorZ(e.zyx, .055, .015), 6., e);   // the lens rim
    float eye = sdEll(e - vec3(-.005, 0., 0.), vec3(.03, .045, .045));
    U(d, eye, 3., e); E(eye - .012);
    U(d, sdEll(h - vec3(-.12, .04, .06), vec3(.02, .025, .025)), 5., h);   // a dead socket on the far side
    for (int s = -1; s <= 1; s += 2) {   // hoses to the back
      float fs = float(s);
      vec3 hq = h - vec3(0., .0, 0.);
      U(d, sdCap(hq, vec3(-.12, -.1, .06*fs), vec3(.02 + .03*sin(hq.y*20.), -.22, .12*fs), .022), 5., hq);
    }
    U(d, sdCap(h, vec3(.08, .12, .03), vec3(.14, .3, .04), .008), 6., h);   // the bent antenna
    U(d, sdCap(h, vec3(.14, .3, .04), vec3(.24, .34, .05), .007), 6., h);
    U(d, length(h - vec3(.24, .34, .05)) - .016, 3., h);
  }
  // the rifle, in local space: barrel along -x, stock at +x
  vec3 G = vec3(-.26, 1., -.1);
  G += (vec3(-.2, 1.2, -.12) - vec3(-.26, 1., -.1))*WIND*(1. - b) + (vec3(-.02, 1.26, -.14) - vec3(-.26, 1., -.1))*WIND*b;
  G.xy += vec2(.07, .03)*ATK*(1. - b) + vec2(-.48, -.14)*ATK*b;
  float ga = -.28 + .28*WIND*(1. - b) + .16*ATK*(1. - b) + 2.5*WIND*b + 3.05*ATK*b;
  vec3 r = q - G; r.xy = R(-ga) * r.xy;
  float bx2 = sdBox(r - vec3(-.1, 0., 0.), vec3(.6, .2, .08));
  if (bx2 >= .1) d = min(d, bx2); else {
    U(d, sdRBox(r - vec3(-.12, .02, 0.), vec3(.16, .045, .03), .01), 6., r);      // receiver
    U(d, sdCylY((r - vec3(-.44, .035, 0.)).yxz, .016, .18), 6., r);              // barrel
    U(d, sdCylY((r - vec3(-.38, .035, 0.)).yxz, .03, .08), 6., r);               // a ventilated shroud
    U(d, sdCylY((r - vec3(-.6, .035, 0.)).yxz, .024, .025), 6., r);              // muzzle brake
    U(d, sdRBox(r - vec3(-.16, .1, 0.), vec3(.07, .022, .02), .008), 6., r);     // scope
    vec3 mg = r - vec3(-.12, -.07, 0.); mg.xy = R(-.25) * mg.xy;
    U(d, sdRBox(mg, vec3(.03, .08, .022), .008), 1., mg);                       // magazine
    U(d, extrude(sdTrap((r - vec3(.15, -.01, 0.)).yx, .055, .03, .14), r.z, .022), 7., r);   // wooden stock
    U(d, sdRBox(r - vec3(.02, -.07, 0.), vec3(.022, .05, .018), .008), 7., r);  // grip
    U(d, sdCap(r, vec3(-.03, .0, 0.), vec3(.1, .05, .0), .007), 5., r);        // a strap
  }
  // arms: from under the poncho to the grip and the foregrip
  vec3 cg = vec3(cos(ga), sin(ga), 0.), cu = vec3(-sin(ga), cos(ga), 0.);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 H = fs < 0. ? G + cg*.02 - cu*.06 + vec3(0., 0., -.03) : G - cg*.26 - cu*.01 + vec3(0., 0., .05);
    vec3 El = vec3(.02, 1.0, .2*fs) + (H - vec3(-.26, 1., -.1))*.4;
    vec3 S = vec3(.0, 1.25, .17*fs);
    U(d, sdCap(t, S, El, .035), 1., t);
    U(d, sdCapT(q, El, H, .04, .03), 1., q);
    U(d, length(q - El) - .045, 2., q);
    U(d, sdRBox(q - H, vec3(.035, .03, .03), .015), 5., q);
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1. || m == 6.) {
    float r = vnoise(lp*11. + 7.) + .4*vnoise(lp*35.);
    if (m == 1. && r > .95) { m = 2.; return sh*.9 + .1; }   // flaking rust
    if (vnoise(lp*60.) > .8) sh -= .15;                       // pitting
    return sh + .06*(r - .7);
  }
  if (m == 4.) {
    float v = vnoise(lp*vec3(6., 18., 6.));
    if (abs(fract(lp.y*7. + .3*vnoise(lp*5.)) - .5) < .05) sh -= .15;   // faded stripes
    return sh*.9 + .1*v;
  }
  return sh;
}`,
};

// ---- Fallen Knight ----
// A huge corrupted knight of the keep: blackened plate armour split by cracks
// that leak violet light, layered spiked pauldrons, a tattered dark crimson
// cape, and a horned great helm whose visor slit burns violet. He rests both
// gauntlets on the pommel of a massive greatsword planted in front of him.
// Slash: WIND hauls the sword up over his shoulder, ATK swings it down through
// the teammate. Shock: the same overhead blow plunges the blade into the floor.
const knightSword = (P) => {
  const w = P.wind || 0, at = P.atk || 0;
  const H0 = [-0.46, 1.12, -0.06], HW = [-0.02, 1.95, -0.1], HA = [-0.62, 1.05, -0.1];
  const H = H0.map((v, i) => v + (HW[i] - v) * w + (HA[i] - v) * at);
  const a = (270 + 145 * w + 315 * at) * Math.PI / 180;
  return { H, a };
};
const knightBlade = (P, k) => { const { H, a } = knightSword(P); return [H[0] + Math.cos(a) * k, H[1] + Math.sin(a) * k, H[2]]; };
export const knight = {
  name: "Fallen Knight", w: 250, h: 260, ground: 0, scale: 0.42, pitch: 0.12, offX: -0.38,
  palettes: [
    ["#050508", "#0c0c12", "#16161e", "#22222c", "#32323e", "#4a4a58"],   // 1 blackened plate
    ["#060406", "#0e0a0e", "#181218", "#221a22", "#2e242e", "#3c303c"],   // 2 mail, leather, joints
    ["#1e0838", "#4a1488", "#8a3ae8", "#c08aff", "#e8d2ff", "#ffffff"],   // 3 violet glow (visor, cracks, runes)
    ["#0e0306", "#20060c", "#360c14", "#4e141e", "#681e28", "#842a34"],   // 4 cape (dark crimson)
    ["#14100c", "#2c241a", "#4a3e2c", "#6c5c42", "#908060", "#bcac88"],   // 5 horns (old bone)
    ["#08080c", "#16171e", "#2a2c36", "#464a56", "#6c7280", "#a4aab6"],   // 6 sword steel
    ["#120c06", "#2a1c0c", "#46301a", "#664828", "#86623a", "#a88050"],   // 7 tarnished bronze trim
  ],
  glow: ["#3a0e70", "#9a4cff", "#e8d0ff", "#3a0e70", "#a860ff", "#f0e0ff"],
  anchors: {
    core: [0, 1.25, 0], head: [-0.06, 1.95, 0], feet: [0, 0, 0],
    weapon: (P) => knightBlade(P, 0.85), muzzle: (P) => knightBlade(P, 1.15),
  },
  idle: (t) => ({ bob: Math.sin(t * 1.5) * 0.012, lean: Math.sin(t * 0.6) * 0.012 }),
  glsl: LIB + `
float map(vec3 p){
  float d = 1e5;
  float bb = sdBox(p - vec3(-.4, 1.4, 0.), vec3(1.3, 1.6, .7));
  if (bb > .2) return bb;
  vec3 q = p;
  float br = .012*sin(T*1.5);
  // legs: greaves, knee cops with spikes, pointed sabatons; a wide stance
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = WALK*6.283 + fs*1.57;
    vec3 hip = vec3(.02, .95, .16*fs), knee = vec3(-.08 - .06*fs + .05*sin(ph), .52, .2*fs), ank = vec3(.04 - .1*fs + .04*sin(ph), .12, .2*fs);
    U(d, sdCapT(q, hip, knee, .11, .085), 1., q);
    U(d, sdCapT(q, knee, ank, .085, .065), 1., q);
    vec3 k = q - knee;
    U(d, sdEll(k - vec3(-.05, 0., 0.), vec3(.08, .08, .085)), 1., k);
    U(d, sdCapT(k, vec3(-.1, 0., 0.), vec3(-.2, .03, 0.), .035, .0), 7., k);   // knee spike
    vec3 f = q - ank;
    float sab = sdCapT(f, vec3(.04, -.05, 0.), vec3(-.22, -.09, 0.), .07, .02);
    sab = max(sab, -f.y - .12);
    U(d, sab, 1., f);
  }
  // fauld: stepped plates skirting the hips, mail beneath
  vec3 fq = q - vec3(.0, 1.02, 0.);
  float fang = atan(fq.z, fq.x);
  U(d, sdCapT(fq, vec3(0., .08, 0.), vec3(0., -.12, 0.), .24, .3), 2., fq);
  float fau = sdCapT(fq, vec3(0., .1, 0.), vec3(0., -.1, 0.), .27, .34);
  fau = max(fau, -fq.y - .1 + .05*step(.5, fract(fang*2.2)));
  U(d, fau, 1., fq);
  // the breastplate: a broad barrel chest with a ridge
  vec3 c = q - vec3(-.02, 1.42, 0.);
  float chest = sdEll(c, vec3(.27 + br, .3, .32 + br));
  chest = smin(chest, sdEll(c - vec3(0., -.22, 0.), vec3(.2, .16, .24)), .08);
  chest = smin(chest, sdCapT(c, vec3(-.24, .15, 0.), vec3(-.25, -.2, 0.), .025, .015), .03);   // ridge
  U(d, chest, 1., c);
  U(d, sdCylY(c - vec3(-.01, .3, 0.), .17, .07) - .02, 2., c);   // gorget
  U(d, sdTorZ((c - vec3(.0, -.33, 0.)).xzy, .25, .025), 7., c);  // belt
  // the cape, tattered, sweeping out behind
  vec3 k = q - vec3(.2, 1.0, 0.);
  float bx1 = sdBox(k, vec3(.35, .85, .5));
  if (bx1 >= .1) d = min(d, bx1); else {
    float lo = smoothstep(.6, -.6, k.y);
    k.x -= .25*lo*lo + .05*sin(T*1.3 + k.z*5. + k.y*3.)*lo;
    float cape = abs(length(k.xz*vec2(1.4, 1.) + vec2(.25, 0.)) - .42 - .1*lo) - .016;
    cape = max(cape, -k.x - .05);
    cape = max(cape, k.y - .62);
    float rag = -.85 + .45*pow(abs(sin(k.z*8. + 2.)), .6) + .15*vnoise(vec3(k.z*20., 0., 0.));
    cape = max(cape, rag - k.y);
    cape = max(cape, -(vnoise(k*8. + 3.) - .78)*.1);
    U(d, cape, 4., k);
  }
  // pauldrons: layered plates with spikes
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 sh = q - vec3(.0, 1.66, .33*fs);
    sh.yz = R(-.35*fs) * sh.yz;
    float pa = sdEll(sh, vec3(.2, .15, .17));
    pa = max(pa, -sh.y - .05);
    U(d, pa, 1., sh);
    for (int l = 0; l < 2; l++) {
      vec3 lq = sh - vec3(0., -.08 - float(l)*.07, 0.);
      float lame = sdEll(lq, vec3(.19 - float(l)*.02, .1, .16 - float(l)*.02));
      lame = max(lame, -lq.y - .03);
      U(d, lame, 1., lq);
    }
    for (int k2 = 0; k2 < 3; k2++) {
      float fk = float(k2) - 1.;
      U(d, sdCapT(sh, vec3(fk*.08, .1, .02), vec3(fk*.12, .3 - abs(fk)*.06, .1), .03, .0), 1., sh);
    }
  }
  // the greatsword
  float w = WIND, at = ATK;
  vec3 H0 = vec3(-.46, 1.12, -.06);
  vec3 H = H0 + (vec3(-.02, 1.95, -.1) - H0)*w + (vec3(-.62, 1.05, -.1) - H0)*at;
  float a = radians(270. + 145.*w + 315.*at);
  vec3 dir = vec3(cos(a), sin(a), 0.), up = vec3(-sin(a), cos(a), 0.);
  vec3 sq = q - H;
  vec3 l = vec3(dot(sq, dir), dot(sq, up), sq.z);   // sword space: x along the blade
  float bx2 = sdBox(l - vec3(.5, 0., 0.), vec3(.75, .16, .16));
  if (bx2 >= .1) d = min(d, bx2); else {
    U(d, sdCap(l, vec3(-.2, 0., 0.), vec3(.08, 0., 0.), .028), 2., l);           // grip
    U(d, sdOct(l - vec3(-.23, 0., 0.), .06), 7., l);                             // pommel
    U(d, sdRBox(l - vec3(.1, 0., 0.), vec3(.03, .17, .035), .012), 7., l);       // crossguard
    U(d, sdCapT(l, vec3(.1, .17, 0.), vec3(.06, .22, 0.), .025, .0), 7., l);
    U(d, sdCapT(l, vec3(.1, -.17, 0.), vec3(.06, -.22, 0.), .025, .0), 7., l);
    float bl = extrude(sdTrap(vec2(l.y, l.x - .65), .075, .0, .53), l.z, .012);   // the blade
    bl = smin(bl, extrude(sdTrap(vec2(l.y, l.x - .25), .085, .075, .13), l.z, .016), .02);
    U(d, bl - .006, 6., l);
  }
  // arms in plate, both gauntlets on the grip
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 S = vec3(.0, 1.58, .3*fs);
    vec3 Hh = H + dir*(fs < 0. ? -.02 : -.14) + vec3(0., 0., .05*fs);
    vec3 El = mix(S, Hh, .5) + vec3(.1, -.1 + .1*w, .12*fs);
    U(d, sdCapT(q, S, El, .085, .07), 1., q);
    U(d, sdCapT(q, El, Hh, .075, .065), 1., q);
    U(d, length(q - El) - .08, 2., q);
    U(d, sdRBox(q - Hh, vec3(.06, .06, .06), .025), 1., q);   // gauntlet
  }
  // the horned great helm, a violet slit for eyes
  vec3 h = q - vec3(-.05, 1.92, 0.);
  h.xy = R(.08 - .12*w + .15*at + .03*sin(T*.7)) * h.xy;
  float bx3 = sdBox(h, vec3(.45, .4, .5));
  if (bx3 >= .1) d = min(d, bx3); else {
    float helm = sdRBox(h, vec3(.13, .16, .13), .07);
    helm = smin(helm, sdCapT(h, vec3(-.12, .1, 0.), vec3(-.14, -.13, 0.), .03, .02), .03);   // a ridge down the face
    float slit = sdBox(h - vec3(-.14, .03, 0.), vec3(.05, .016, .1));
    helm = max(helm, -slit);
    U(d, helm, 1., h);
    float glow = sdBox(h - vec3(-.1, .03, 0.), vec3(.03, .014, .095));
    U(d, glow, 3., h); E(glow - .01);
    for (int k3 = 0; k3 < 3; k3++) U(d, sdBox(h - vec3(-.18, -.06 - float(k3)*.035, -.05), vec3(.02, .006, .025)), 2., h);   // breaths
    for (int s = -1; s <= 1; s += 2) {   // great curved horns
      float fs = float(s);
      vec3 h0 = vec3(.0, .08, .13*fs), h1 = vec3(.02, .16, .3*fs), h2 = vec3(-.05, .36, .4*fs), h3 = vec3(-.2, .48, .36*fs);
      float horn = sdCapT(h, h0, h1, .055, .045);
      horn = smin(horn, sdCapT(h, h1, h2, .045, .03), .02);
      horn = smin(horn, sdCapT(h, h2, h3, .03, .004), .015);
      U(d, horn, 5., h);
    }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {
    // cracks in the plate leaking violet light
    float v = abs(vnoise(lp*vec3(9., 6., 9.) + 5.) - .5) + abs(vnoise(lp*23. + 1.) - .5)*.35;
    if (v < .03) { m = 3.; return .55 + .35*sin(T*2.5 + lp.y*9.); }
    return sh*.9 + .06*vnoise(lp*40.) + .08*pow(max(n.y, 0.), 3.);
  }
  if (m == 6. && abs(lp.y) < .012 && lp.x > .2 && lp.x < .95) { m = 3.; return .5 + .4*sin(T*3. - lp.x*12.); }   // a glowing fuller
  if (m == 5.) return sh + .12*(fract(length(lp)*30.) < .3 ? -1. : 0.);   // horn rings
  if (m == 4.) return sh*.85 + .12*vnoise(lp*12.);
  return sh;
}`,
};
