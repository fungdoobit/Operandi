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
  if (sdBox(q - vec3(-.12, .85, 0.), vec3(.3, .4, .32)) < .1) {
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
// A tall chrome endoskeleton out of the wastes: a polished steel skeleton with
// hydraulic pistons beside every long bone, black cables down the spine, an
// open ribcage around a red reactor core, and an angular skull with a bladed
// crest and two red optics. Burnt scraps of a long coat hang off its shoulders.
// Its near forearm is a heavy plasma cannon (the muzzle): WIND/OPEN raise it to
// aim and light its coils, ATK kicks it back with the recoil.
const reaperGun = (P) => {
  const aim = Math.max(P.wind || 0, P.open || 0), at = P.atk || 0;
  const E = [-0.06 + 0.1 * at, 1.3, -0.3];
  const a = -0.4 + 0.4 * aim + 0.15 * at;
  return [E[0] - Math.cos(a) * 0.72, E[1] + Math.sin(a) * 0.72, E[2]];
};
export const reaper = {
  name: "Chrome Reaper", w: 200, h: 214, ground: 0, scale: 0.36, pitch: 0.12, offX: -0.18,
  palettes: [
    ["#06080c", "#1a2028", "#3c4652", "#7a8694", "#c2ccd6", "#f4f8fc"],   // 1 chrome
    ["#050608", "#0c0e12", "#16191f", "#22262e", "#30353f", "#424854"],   // 2 dark steel (joints, sleeves)
    ["#2a0206", "#6a0612", "#c41226", "#ff3a4a", "#ff9aa2", "#ffffff"],   // 3 red glow (optics, core, coils)
    ["#070605", "#110e0c", "#1c1814", "#28221c", "#362e26", "#463c32"],   // 4 burnt coat
    ["#040304", "#0a0709", "#140d10", "#1e1418", "#2a1c22", "#38262c"],   // 5 cables
    ["#08090c", "#14171c", "#24282f", "#383d46", "#545a64", "#7a808a"],   // 6 gunmetal cannon
  ],
  glow: ["#5a0410", "#ff2a40", "#ffb0b8", "#5a0410", "#ff3a4a", "#ffc0c6"],
  anchors: {
    core: [0, 1.15, 0], head: [-0.08, 1.92, 0], feet: [0, 0, 0],
    muzzle: (P) => reaperGun(P), weapon: (P) => reaperGun(P),
  },
  idle: (t) => ({ bob: Math.sin(t * 2.0) * 0.008, lean: Math.sin(t * 0.7) * 0.015, walkT: 0 }),
  glsl: LIB + `
// a long bone with a hydraulic piston running beside it
void limb(inout float d, vec3 q, vec3 a, vec3 b, float r, vec3 off){
  U(d, sdCapT(q, a, b, r, r*.8), 1., q);
  vec3 a2 = a + off, b2 = b + off, m = mix(a2, b2, .55);
  U(d, sdCap(q, a2, m, r*.62), 2., q);   // the cylinder
  U(d, sdCap(q, m, b2, r*.32), 1., q);   // the polished rod
}
float map(vec3 p){
  float d = 1e5;
  float bb = sdBox(p - vec3(-.2, 1.1, 0.), vec3(1., 1.15, .6));
  if (bb > .2) return bb;
  float aim = max(WIND, OPEN);
  vec3 q = p;
  float br = .006*sin(T*2.);
  // legs: chrome bones, pistons, knee and ankle joints, clawed feet
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = WALK*6.283 + fs*1.57;
    vec3 hip = vec3(.02, .98, .13*fs), knee = vec3(-.1 + .05*sin(ph), .54, .15*fs), ank = vec3(.0 + .04*sin(ph), .12, .14*fs);
    limb(d, q, hip, knee, .05, vec3(.07, 0., 0.));
    limb(d, q, knee, ank, .042, vec3(.06, .0, -.0));
    U(d, length(q - knee) - .06, 2., q);
    U(d, length(q - ank) - .045, 2., q);
    vec3 f = q - ank;
    U(d, sdRBox(f - vec3(-.08, -.08, 0.), vec3(.1, .03, .055), .02), 1., f);
    for (int k = -1; k <= 1; k++) U(d, sdCapT(f, vec3(-.15, -.08, float(k)*.035), vec3(-.24, -.1, float(k)*.04), .022, .008), 1., f);
    U(d, sdCapT(f, vec3(.02, -.06, 0.), vec3(.1, -.1, 0.), .025, .01), 1., f);   // heel spur
  }
  // pelvis
  U(d, sdRBox(q - vec3(.02, 1.0, 0.), vec3(.1, .07, .19), .04), 1., q);
  U(d, sdRBox(q - vec3(-.06, 1.0, 0.), vec3(.04, .1, .08), .02), 2., q);
  // spine and cables
  for (int k = 0; k < 4; k++) {
    vec3 v = q - vec3(.06, 1.1 + float(k)*.1, 0.);
    U(d, sdRBox(v, vec3(.045, .03, .06), .015), 1., v);
  }
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 c = q - vec3(.0 + .03*sin(q.y*9. + fs), 0., .07*fs);
    U(d, sdCap(c, vec3(.02, 1.05, 0.), vec3(.02, 1.55, 0.), .02), 5., c);
  }
  // the ribcage around a red reactor core
  vec3 cq = q - vec3(-.02, 1.48, 0.);
  if (sdBox(cq, vec3(.3, .3, .32)) < .1) {
    float core = length(cq - vec3(.0, -.02, 0.)) - .085 - .01*sin(T*6.);
    U(d, core, 3., cq); G(core - .02);
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      vec3 r = cq - vec3(0., .14 - fk*.085, 0.);
      r.xy = R(-.12) * r.xy;
      float rad = .2 - fk*.012;
      float rib = length(vec2(length(r.xz*vec2(1.15, 1.)) - rad, r.y)) - .019;
      rib = max(rib, -(r.x + .19));   // open at the front, around the sternum
      U(d, rib, 1., r);
    }
    U(d, sdRBox(cq - vec3(-.2, .02, 0.), vec3(.025, .15, .04), .015), 1., cq);   // sternum
    // a chest plate over the upper ribs
    vec3 pl = cq - vec3(-.06, .2, 0.);
    float plate = sdRBox(pl, vec3(.15, .06, .24), .05);
    plate = max(plate, -sdBox(pl - vec3(-.18, -.03, 0.), vec3(.04, .03, .02)));
    U(d, plate, 1., pl);
  }
  // shoulders and collarbones
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    U(d, length(q - vec3(.0, 1.68, .28*fs)) - .075, 1., q);
    U(d, sdCap(q, vec3(-.04, 1.7, .04*fs), vec3(.0, 1.7, .26*fs), .028), 1., q);
  }
  // the far arm: skeletal, a three-clawed hand reaching forward
  {
    vec3 S = vec3(.0, 1.66, .3), E = vec3(.06, 1.28, .34), H = vec3(-.26 + .05*sin(T*1.3), 1.12, .32);
    limb(d, q, S, E, .04, vec3(.05, 0., .0));
    U(d, length(q - E) - .05, 2., q);
    U(d, sdCap(q, E, H, .022), 1., q);
    U(d, sdCap(q, E + vec3(0., 0., .03), H + vec3(0., 0., .03), .016), 2., q);
    U(d, sdRBox(q - H, vec3(.04, .03, .03), .012), 1., q);
    for (int k = -1; k <= 1; k++) {
      vec3 f0 = H + vec3(-.03, -.01, float(k)*.025), f1 = f0 + vec3(-.07, -.03, float(k)*.01), f2 = f1 + vec3(-.02, -.07, 0.);
      U(d, sdCap(q, f0, f1, .012), 1., q); U(d, sdCapT(q, f1, f2, .011, .003), 1., q);
    }
  }
  // the near arm: upper arm, then the plasma cannon instead of a forearm
  {
    vec3 S = vec3(.0, 1.66, -.3), E = vec3(-.06 + .1*ATK, 1.3, -.3);
    limb(d, q, S, E, .045, vec3(.05, 0., 0.));
    U(d, length(q - E) - .065, 2., q);
    float a = -.4 + .4*aim + .15*ATK;
    vec3 g = q - E; g.xy = R(a) * g.xy;   // cannon space: the barrel runs down -x
    if (sdBox(g - vec3(-.35, 0., 0.), vec3(.45, .2, .2)) < .1) {
      U(d, sdCylY(g.yxz - vec3(-.18, 0., 0.), .11, .16), 6., g);
      U(d, sdCylY(g.yxz - vec3(-.5, 0., 0.), .075, .2), 6., g);
      for (int k = 0; k < 3; k++) {   // charging coils
        vec3 c = g - vec3(-.38 - float(k)*.09, 0., 0.);
        float coil = sdCylY(c.yxz, .1, .018);
        U(d, coil, aim > .05 || OPEN > .05 ? 3. : 2., c);
        if (aim > .05) G(coil + .03 - .03*aim);
      }
      float muz = sdCylY(g.yxz - vec3(-.72, 0., 0.), .095, .04);
      muz = max(muz, -sdCylY(g.yxz - vec3(-.76, 0., 0.), .05, .1));
      U(d, muz, 1., g);
      float bore = sdCylY(g.yxz - vec3(-.7, 0., 0.), .05, .02);
      U(d, bore, 3., g); if (aim > .05) G(bore + .02 - .03*aim);
      U(d, sdRBox(g - vec3(-.22, .12, 0.), vec3(.14, .025, .06), .015), 1., g);   // a heat-sink fin
      U(d, sdCap(g, vec3(-.05, -.1, 0.), vec3(.2, -.2, .05), .022), 5., g);    // a feed cable to the core
    }
  }
  // the skull: an angular cranium, a bladed crest, red optics, a toothed jaw
  vec3 h = q - vec3(-.08, 1.9, 0.);
  h.xy = R(-.05 + .05*sin(T*.9)) * h.xy;
  if (sdBox(h, vec3(.25, .25, .2)) < .1) {
    U(d, sdCap(q, vec3(.0, 1.6, 0.), vec3(-.04, 1.8, 0.), .035), 2., q);   // neck
    float sk = sdEll(h - vec3(.02, .04, 0.), vec3(.15, .14, .12));
    sk = smin(sk, sdRBox(h - vec3(-.08, -.03, 0.), vec3(.06, .06, .095), .03), .04);   // the face plate
    sk = smin(sk, sdRBox(h - vec3(-.07, .03, 0.), vec3(.04, .015, .11), .01), .02);   // a heavy brow
    for (int s = -1; s <= 1; s += 2) sk = max(sk, -sdEll(h - vec3(-.14, .0, .055*float(s)), vec3(.04, .03, .035)));   // sockets
    U(d, sk, 1., h);
    vec3 j = h - vec3(-.07, -.1, 0.);
    j.xy = R(-.15*OPEN) * j.xy;
    U(d, sdRBox(j, vec3(.06, .025, .075), .015), 1., j);
    for (int k = -2; k <= 2; k++) U(d, sdBox(j - vec3(-.055, .03, float(k)*.026), vec3(.008, .014, .009)), 1., j);
    for (int s = -1; s <= 1; s += 2) {
      float fs = float(s);
      vec3 e = h - vec3(-.125, .0, .055*fs);
      float eye = length(e) - .024;
      U(d, eye, 3., e); E(eye - .006);
      U(d, sdCap(h, vec3(-.02, -.04, .1*fs), vec3(-.08, -.1, .08*fs), .014), 2., h);   // jaw pistons
    }
    for (int k = 0; k < 3; k++) {   // the crest
      float fk = float(k);
      vec3 c = h - vec3(-.06 + fk*.09, .16 - fk*.02, 0.);
      U(d, extrude(sdTrap(c.xy*vec2(1., -1.) + vec2(.0, .04), .035, .005, .05), c.z, .012), 1., c);
    }
  }
  // burnt scraps of a long coat, hanging behind
  vec3 k = q - vec3(.16, 1.2, 0.);
  if (sdBox(k, vec3(.2, .55, .42)) < .1) {
    float ang = atan(k.z, -k.x + .3);
    k.x += .03*sin(T*1.6 + k.y*4. + k.z*6.)*(1. - smoothstep(.2, .5, k.y));
    float coat = abs(length(k.xz*vec2(1.6, 1.) + vec2(.25, 0.)) - .38) - .012;
    coat = max(coat, -k.x - .02);
    coat = max(coat, k.y - .48 + .25*smoothstep(.0, .4, abs(k.z)) - .3);
    float rag = -.3 + .35*abs(sin(k.z*14.)) + .15*vnoise(vec3(k.z*20., 0., 0.));
    coat = max(coat, rag - k.y);
    coat = max(coat, -(vnoise(k*vec3(9., 9., 9.)) - .72)*.1);   // burnt holes
    U(d, coat, 4., k);
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
    if (v > .66) return .02;
    return sh*.8 + .1*v;
  }
  if (m == 6.) return sh + (fract(lp.x*18.) < .15 ? -.15 : 0.);
  return sh;
}`,
};
