// Enemy models, group a: Module 1's Stinger, Gnarlwood and Hollow Wisp, and
// Module 2's Grub Goblin. See enemy-px.js for what a model gives and forest.js
// (Rotcap) for the conventions: built facing LEFT (-x, toward the teammate), the
// camera at -z (so -z is the side we see), 80 art px = 1 unit.

const rot = (x, y, t) => { const c = Math.cos(t), s = Math.sin(t); return [c * x - s * y, s * x + c * y]; };
const mix = (a, b, k) => a + (b - a) * k;
const mix3 = (a, b, k) => a.map((v, i) => mix(v, b[i], k));

// ---- Stinger: a big corrupted wasp ----
// A segmented armoured body in purple-black chitin with amber bands, a long
// hooked stinger dripping venom, buzzing smoky wings, hooked mandibles and
// huge compound eyes glowing toxic yellow-green. It curls its abdomen under
// and drives the stinger forward, or spits venom from the stinger tip.
const WASP_WAIST = [0.1, 0.05];
const waspAbd = (P) => -0.5 + 0.6 * (P.wind || 0) - 1.9 * (P.atk || 0);
const waspPitch = (P) => 0.15 * (P.wind || 0) + 0.3 * (P.atk || 0);
function waspTip(P) {
  const bend = 0.25 + 0.35 * (P.atk || 0), sx = 0.6, sy = -bend * sx * sx;
  const dl = Math.hypot(1, 2 * bend * sx), dx = 1 / dl, dy = -2 * bend * sx / dl;
  let [x, y] = rot(sx + dx * 0.3, sy + dy * 0.3 - 0.04, waspAbd(P));
  x += WASP_WAIST[0]; y += WASP_WAIST[1];
  [x, y] = rot(x, y, -waspPitch(P));
  return [x, y, 0];
}
export const wasp = {
  name: "Stinger", w: 220, h: 190, fly: true, hover: -0.75, scale: 0.26, pitch: 0.2,
  palettes: [
    ["#07050a", "#120c18", "#1e1428", "#2e2040", "#463260", "#6a5088"],   // 1 chitin
    ["#241002", "#552a04", "#8e4e08", "#cc8410", "#f0bc2a", "#fff08a"],   // 2 amber bands
    ["#1a2a04", "#4a6a08", "#8ab810", "#c8f028", "#eaff70", "#fbffd0"],   // 3 toxic glow
    ["#16222c", "#2a3e4a", "#46646e", "#6e909a", "#9cbcc2", "#d4ecee"],   // 4 wings
    ["#0e0406", "#24080c", "#401216", "#621e20", "#8c342c", "#bc6448"],   // 5 stinger, mandibles
  ],
  glow: ["#3a5a08", "#b6ff3a", "#f4ffb0", "#3a5a08", "#b6ff3a", "#f4ffb0"],
  anchors: {
    core: [-0.05, 0.08, 0], head: [-0.38, 0.08, 0], feet: [-0.05, -0.3, 0],
    weapon: waspTip, muzzle: waspTip,
  },
  idle: (t) => ({ bob: Math.sin(t * 3.1) * 0.04 + Math.sin(t * 7.3) * 0.008, lean: Math.sin(t * 1.7) * 0.04, yaw: Math.sin(t * 0.9) * 0.05 }),
  glsl: `
float ell(vec3 p, vec3 r){ return (length(p/r) - 1.)*min(min(r.x, r.y), r.z); }
float map(vec3 p){
  float bb = sdBox(p - vec3(.05, .1, 0.), vec3(1., .8, .75));
  if (bb > .2) return bb;
  float d = 1e5;
  vec3 q = p; q.xy = R(.15*WIND + .3*ATK) * q.xy;   // nose up on the wind-up and the sting
  // thorax: an armoured barrel with a raised collar and dorsal spikes
  vec3 th = q - vec3(-.08, .1, 0.);
  float thorax = ell(th, vec3(.19, .15, .14));
  thorax = smin(thorax, ell(th - vec3(-.12, .03, 0.), vec3(.09, .11, .11)), .04);
  thorax += .006*vnoise(th*30.);
  U(d, thorax, 1., th);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 sp = th - vec3(-.07 + fi*.08, .13 - .025*fi, 0.);
    U(d, sdCapT(sp, vec3(0.), vec3(.05, .1 - .025*fi, 0.), .03, .0), 1., sp);
  }
  // head, tilted down, with huge compound eyes, antennae and hooked mandibles
  vec3 h = q - vec3(-.33, .05, 0.);
  h.xy = R(-.35) * h.xy;
  U(d, ell(h, vec3(.1, .13, .115)), 1., h);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 e = h - vec3(-.035, .03, .075*fs);
    float eye = ell(e, vec3(.06, .088, .05));
    U(d, eye, 3., e); E(eye);
    float o = .03 + .05*OPEN + .04*ATK;
    vec3 m0 = h - vec3(-.06, -.11, .045*fs);
    vec3 mb = vec3(-.06, -.05, o*fs), mc = vec3(-.1, .0, -.015*fs);
    U(d, sdCapT(m0, vec3(0.), mb, .032, .024), 5., m0);
    U(d, sdCapT(m0, mb, mc, .024, .004), 5., m0);
    vec3 a0 = h - vec3(-.06, .1, .035*fs);
    vec3 a1 = vec3(-.08, .14, .05*fs), a2 = vec3(-.26, .2 + .03*sin(T*4. + fs), .1*fs);
    U(d, sdCap(a0, vec3(0.), a1, .012), 1., a0);
    U(d, sdCapT(a0, a1, a2, .012, .006), 1., a0);
  }
  // legs dangling under the thorax, the front pair reaching out on the sting
  for (int i = 0; i < 3; i++) for (int s = -1; s <= 1; s += 2) {
    float fi = float(i), fs = float(s), reach = ATK*(1. - fi*.4);
    vec3 l = th - vec3(-.07 + fi*.07, -.09, .06*fs);
    float sw = .04*sin(T*3. + fi*1.3 + fs);
    vec3 k = vec3(-.04 + fi*.04 - .12*reach, -.07, .17*fs);
    vec3 f = k + vec3(.03 + fi*.06 + sw - .15*reach, -.18 - .03*fi + .08*reach, .03*fs);
    U(d, sdCapT(l, vec3(0.), k, .022, .016), 1., l);
    U(d, sdCapT(l, k, f, .016, .005), 2., l);
  }
  // waist and abdomen: banded segments along a curve; curls under on the sting
  vec3 w = q - vec3(${WASP_WAIST[0]}, ${WASP_WAIST[1]}, 0.);
  U(d, sdCap(w, vec3(-.06, .02, 0.), vec3(.05, 0., 0.), .035), 1., w);
  float ang = -.5 + .6*WIND - 1.9*ATK;
  vec3 a = w; a.xy = R(-ang) * a.xy;
  float bend = .25 + .35*ATK, br = 1. + .04*sin(T*6.);
  float ab = 1e5; vec3 alp = a;
  for (int i = 0; i < 5; i++) {
    float fi = float(i), x = .07 + fi*.12;
    vec3 sq = a - vec3(x, -bend*x*x, 0.);
    sq.xy = R(2.*bend*x) * sq.xy;
    float r = (.065 + .11*sin((fi + .5)*.6))*br;
    float sg = ell(sq, vec3(.085, r, r*.95));
    if (sg < ab) { ab = sg; alp = sq; }
  }
  U(d, ab, 1., alp);
  // the stinger: a long hooked blade with a bead of venom
  float sx = .6, sy = -bend*sx*sx;
  vec2 dir = normalize(vec2(1., -2.*bend*sx));
  vec3 s0 = vec3(sx, sy, 0.), s1 = s0 + vec3(dir*.24, 0.), s2 = s1 + vec3(R(-.7)*dir*.09, 0.);
  U(d, sdCapT(a, s0, s1, .06, .016), 5., a);
  U(d, sdCapT(a, s1, s2, .014, .002), 5., a);
  float drop = length(a - s2 - vec3(0., -.02, 0.)) - .018 - .01*OPEN;
  U(d, drop, 3., a); G(drop + .01);
  // wings: two pairs, buzzing, spread wide when open
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    for (int j = 0; j < 2; j++) {
      float fj = float(j);
      vec3 wq = th - vec3(.02 + fj*.06, .13, .06*fs); wq.z *= fs;
      float flap = .75 + .45*OPEN - .3*ATK + .5*sin(T*57. + fj*2.1 + fs*.7);
      wq.yz = R(flap) * wq.yz;
      wq.xz = R(-.35 - .25*fj + .4*OPEN) * wq.xz;
      float wg = ell(wq - vec3(.24 - fj*.05, 0., .03), vec3(.3 - fj*.08, .01, .09 - fj*.015));
      U(d, wg, 4., wq);
    }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1. && abs(lp.x) < .1 && length(lp.yz) > .06 && lp.y > -.3) {
    // abdomen bands: amber with a ragged black front edge
    float edge = -.015 + .025*sin(atan(lp.z, lp.y)*3.) + .015*vnoise(lp*40.);
    if (lp.x > edge && lp.x < .07) { m = 2.; return sh + .05; }
  }
  if (m == 1.) return sh*.9 + .25*pow(max(dot(n, normalize(vec3(-.3, .9, -.4))), 0.), 24.);   // glossy chitin
  if (m == 3. && length(lp) > .03) {   // compound eyes: a hot centre fading to a dark rim, with facets
    float c = clamp(1. - length(lp.xy/vec2(.06, .088)), 0., 1.);
    return (.15 + .85*c)*(.8 + .2*step(.3, abs(fract(lp.y*60. + lp.x*30.) - .5)));
  }
  if (m == 4.) {   // see-through membrane (dithered) with a few dark veins
    float v = min(abs(fract(lp.z*6. + .25*sin(lp.x*7.)) - .5), abs(fract(lp.x*2.6 + lp.z*1.5) - .5)*1.6);
    if (v < .07) return .1;
    float ck = mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.);
    return ck < .5 ? .3 + .25*sh : .6 + .35*sh;
  }
  return sh;
}`,
};

// ---- Gnarlwood: a hulking twisted treant ----
// A hunched trunk of black-brown bark with grooves and moss, a hollow face:
// amber eyes burning in knot-holes under a heavy brow, and a jagged maw with
// splinter teeth and embers deep inside. Long branch arms end in hooked twig
// claws; it stands on root legs; glowing teal fungus shelves climb its side;
// a crown of bare forked branches. It raises both arms and smashes them down,
// or spreads its crown to rain leaves.
const TREANT_LEAN = (P) => 0.12 - 0.16 * (P.wind || 0) + 0.34 * (P.atk || 0);
function treantHand(P) {
  const W = P.wind || 0, A = P.atk || 0;
  const wr = mix3(mix3([-0.55, 0.0, -0.55], [-0.2, 2.05, -0.35], W), [-1.05, -0.02, -0.3], A);
  const [x, y] = rot(wr[0] - 0.15, wr[1], TREANT_LEAN(P));
  return [x, y + 0.62, wr[2]];
}
export const treant = {
  name: "Gnarlwood", w: 290, h: 290, ground: 0, scale: 0.5, pitch: 0.12,
  palettes: [
    ["#0b0806", "#1a120c", "#2c2016", "#403022", "#584430", "#745c42"],   // 1 bark
    ["#081006", "#101e0a", "#1a2e0e", "#284414", "#3a5a1c", "#52742a"],   // 2 moss
    ["#3a1402", "#7a3404", "#c46208", "#f09a1c", "#ffd05a", "#fff2b0"],   // 3 eyes, embers
    ["#050303", "#0c0706", "#160c09", "#22120c", "#301a10", "#402414"],   // 4 hollow maw
    ["#062a2a", "#0c4a48", "#147a70", "#28b0a0", "#60e0c8", "#c0fff0"],   // 5 glowing fungus
    ["#241a10", "#433422", "#665238", "#8c7656", "#b29c7a", "#d8c6a2"],   // 6 splinters, bare wood
  ],
  glow: ["#0c4a48", "#28b0a0", "#9affe8", "#7a3404", "#f09a1c", "#ffe090"],
  anchors: {
    core: [-0.1, 1.2, 0], head: [-0.35, 1.8, 0], feet: [0, 0, 0],
    weapon: treantHand,
    muzzle: (P) => { const [x, y] = rot(-0.2, 1.75 + 0.15 * (P.open || 0), TREANT_LEAN(P)); return [x, y + 0.62, 0]; },
  },
  idle: (t) => ({ bob: Math.sin(t * 1.6) * 0.012, lean: Math.sin(t * 0.9) * 0.025, walkT: t * 0.25 }),
  glsl: `
float ell(vec3 p, vec3 r){ return (length(p/r) - 1.)*min(min(r.x, r.y), r.z); }
// a twig claw hand: four hooked fingers fanned out along the forearm
float hand(vec3 b, vec3 el, vec3 wr, float fs, inout vec3 lp){
  vec3 dir = normalize(wr - el), side = normalize(cross(dir, vec3(0., 1., .01))), curl = cross(dir, side)*fs;
  float h = 1e5;
  for (int i = 0; i < 4; i++) {
    float fi = float(i) - 1.5;
    vec3 f1 = wr + dir*(.2 - .03*abs(fi)) + side*fi*.09;
    vec3 f2 = f1 + dir*.1 + side*fi*.03 - curl*.1;
    h = min(h, sdCapT(b, wr, f1, .055, .03));
    h = min(h, sdCapT(b, f1, f2, .03, .004));
  }
  return h;
}
float map(vec3 p){
  float bb = sdBox(p - vec3(-.3, 1.4, 0.), vec3(1.25, 1.5, 1.1));
  if (bb > .2) return bb;
  float d = 1e5;
  // root legs, planted, stepping slowly
  if (p.y < .95) for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = WALK*6.283 + fs*1.57;
    vec3 l = p - vec3(.05*sin(ph), 0., .26*fs);
    vec3 hip = vec3(.02, .66, -.04*fs), kn = vec3(-.14 + .04*sin(ph), .34, .07*fs), ft = vec3(.02 + .05*sin(ph), .1, .05*fs);
    float leg = sdCapT(l, hip, kn, .19, .14);
    leg = smin(leg, sdCapT(l, kn, ft, .14, .15), .06);
    for (int i = 0; i < 3; i++) {
      float a = 3.14 + (float(i) - 1.)*.75 + fs*.2;
      leg = smin(leg, sdCapT(l, ft, ft + vec3(cos(a)*.32, -.08, sin(a)*.26), .1, .025), .06);
    }
    leg = smin(leg, sdCapT(l, ft, ft + vec3(.28, -.08, .05*fs), .09, .02), .05);
    leg += .035*vnoise(l*vec3(7., 2.2, 7.));
    U(d, leg, 1., l);
  }
  // the upper body hunches forward from the hips
  vec3 b = p - vec3(0., .62, 0.);
  b.xy = R(-(.12 - .16*WIND + .34*ATK)) * b.xy;
  b.x += .15;
  // trunk, shoulders and a heavy head mass, twisted bark
  float tr = sdCapT(b, vec3(.05, 0., 0.), vec3(-.08, 1.0, 0.), .4, .36);
  tr = smin(tr, ell(b - vec3(-.06, .98, 0.), vec3(.36, .3, .55)), .15);
  tr = smin(tr, ell(b - vec3(-.16, 1.18, 0.), vec3(.36, .36, .36)), .12);
  tr += .09*vnoise(b*2.6 + 4.) - .045 + .045*vnoise(b*vec3(6., 1.6, 6.)) + .015*vnoise(b*18.);
  // carved face: knot-hole eye sockets and a jagged hollow maw
  float sock = 1e5;
  for (int s = -1; s <= 1; s += 2) sock = min(sock, length((b - vec3(-.47, 1.2, .13*float(s)))*vec3(1., 1.3, 1.)) - .1);
  vec3 mq = b - vec3(-.5, .78, 0.);
  float zig = .05*abs(fract(mq.z*8. + .25) - .5)*2.;
  float mouth = sdBox(mq, vec3(.2, .09 + .06*OPEN + .06*ATK + zig, .22));
  float hol = min(sock, mouth);
  float trunk = max(tr, -hol);
  U(d, trunk, -hol > tr - .01 ? 4. : 1., -hol > tr - .01 ? mq : b);
  // brow: a heavy V of bark over the eyes
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    U(d, sdCapT(b, vec3(-.57, 1.25, 0.), vec3(-.47, 1.38, .32*fs), .08, .06) + .02*vnoise(b*14.), 1., b);
    vec3 e = b - vec3(-.47, 1.2, .13*fs);
    float eye = ell(e, vec3(.05, .045, .055));
    eye = max(eye, dot(e, normalize(vec3(.1, 1., -.8*fs))) - .01);
    U(d, eye, 3., e); E(eye);
  }
  // splinter fangs, crooked
  if (length(b - vec3(-.45, .78, 0.)) < .4 + d) for (int i = 0; i < 5; i++) {
    float fi = float(i), h = hash1(fi*7.), up = i < 3 ? 1. : -1., z = i < 3 ? -.13 + fi*.13 : -.07 + (fi - 3.)*.14;
    float lid = up > 0. ? .88 + .06*OPEN + .06*ATK : .68 - .06*OPEN - .06*ATK;
    vec3 t0 = vec3(-.43 + .02*h, lid, z), t1 = t0 + vec3(-.04, -up*(.1 + .08*h), .04*(h - .5));
    U(d, sdCapT(b, t0, t1, .035, .0), 6., b);
  }
  // glowing fungus shelves climbing its near side
  if (sdBox(b - vec3(.1, .55, -.36), vec3(.35, .6, .22)) < d) for (int i = 0; i < 5; i++) {
    float fi = float(i), cl = i < 3 ? 0. : 1., k = i < 3 ? fi : fi - 3.;
    vec3 f = b - (cl < .5 ? vec3(.2 - k*.05, .12 + k*.09, -.34 - k*.01) : vec3(-.05 + k*.06, .82 + k*.09, -.36));
    f.xy = R(.2*(k - 1.) - .1) * f.xy;
    float sh = ell(f, vec3(.11 - .025*k, .03, .09 - .02*k));
    sh = max(sh, -f.x - .2);
    U(d, sh, 5., f); G(sh + .015);
  }
  // branch arms: long and hanging, raised high on the wind-up, smashed down on the strike
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 sh = vec3(-.05, 1.0, .5*fs);
    vec3 el = mix(mix(vec3(-.3, .5, .7*fs), vec3(.0, 1.55, .62*fs), WIND), vec3(-.7, .62, .52*fs), ATK);
    vec3 wr = mix(mix(vec3(-.55, .0, .55*fs), vec3(-.2, 2.05, .35*fs), WIND), vec3(-1.05, -.02, .3*fs), ATK);
    el.y += .025*sin(T*1.4 + fs); wr += vec3(.03*sin(T*1.1 + fs), .02*sin(T*1.4 + fs), 0.);
    if (min(sdCap(b, sh, el, .3), sdCap(b, el, wr, .5)) > d) continue;
    float arm = sdCapT(b, sh, el, .17, .11);
    arm = smin(arm, sdCapT(b, el, wr, .11, .075), .04);
    arm = min(arm, sdCapT(b, el, el + vec3(.08, .2, .1*fs), .045, .0));   // a snapped twig on the elbow
    arm += .025*vnoise(b*vec3(9., 3., 9.));
    U(d, arm, 1., b);
    if (length(b - wr) - .45 < d) { vec3 hl = b; U(d, hand(b, el, wr, fs, hl), 1., b); }
  }
  // the crown: bare forked branches, spreading wide when open
  if (sdBox(b - vec3(-.05, 1.75, 0.), vec3(.8, .6, .8)) < d) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i), az = fi*1.257 + .4;
      if (length(b - vec3(-.12 + cos(az)*.4, 1.75, sin(az)*.35)) - .75 > d) continue;
      float tilt = .3 + .3*hash1(fi) + .45*OPEN;
      vec3 dir = normalize(vec3(sin(tilt)*cos(az) + .25, cos(tilt), sin(tilt)*sin(az)));
      vec3 base = vec3(-.12 + cos(az)*.18, 1.38, sin(az)*.2);
      float len = .5 + .25*hash1(fi + 3.);
      vec3 k = base + dir*len*.5 + vec3(.03*sin(T*1.1 + fi), 0., 0.);
      vec3 tip = k + normalize(dir + vec3(.35*cos(fi*3.), .1, .35*sin(fi*5.)))*len*.6 + vec3(.04*sin(T*1.3 + fi), 0., 0.);
      vec3 fk = k + normalize(dir + vec3(-.5*cos(az + 1.), .2, -.5*sin(az + 1.)))*len*.4;
      vec3 k2 = mix(k, tip, .55) + vec3(.06*cos(fi*4.), .02, .06*sin(fi*2.));
      float br = sdCapT(b, base, k, .07, .04);
      br = min(br, sdCapT(b, k, k2, .04, .022));
      br = min(br, sdCapT(b, k2, tip, .022, .003));
      br = min(br, sdCapT(b, k, fk, .028, .003));
      br = min(br, sdCapT(b, k2, k2 + normalize(fk - k + vec3(0., .3, 0.))*len*.25, .016, .002));
      U(d, br, 1., b);
    }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {
    // moss on the upward faces; deep twisting bark grooves
    if (n.y > .3 && vnoise(p*9.) + .3*vnoise(p*30.) > .62) { m = 2.; return sh + .1*vnoise(p*30.); }
    float g = abs(sin(atan(lp.z, lp.x)*5. + lp.y*3.5 + vnoise(lp*vec3(3., 1.2, 3.))*6.));
    if (g < .16 + .2*vnoise(lp*9.)) return sh*.45;
    return sh - .06 + .12*vnoise(lp*vec3(20., 5., 20.));
  }
  if (m == 4. && lp.x > .16 && vnoise(lp*26. + vec3(0., T*2., 0.)) > .45) { m = 3.; return .1 + .35*vnoise(lp*40. - T*3.); }   // embers deep in the maw
  if (m == 4.) return sh*.6;
  if (m == 5.) return lp.y < -.008 ? .2 + .15*abs(sin(atan(lp.z, lp.x)*14.)) : sh*.5 + .4 + .12*sin(T*2. + p.y*8.);   // glowing caps, dark gills
  return sh;
}`,
};

// ---- Hollow Wisp: a forest spirit gone hostile ----
// A long antlered deer-skull mask of cracked bone, eye holes burning mint,
// over a hood and robe of drifting teal mist that frays into wisps below. Two
// long spectral arms end in bone claws; a glowing core pulses in its chest.
// It fires a beam from its core and throws bolts.
export const spirit = {
  name: "Hollow Wisp", w: 230, h: 220, fly: true, hover: -0.5, scale: 0.3, pitch: 0.18,
  palettes: [
    ["#03101a", "#08222e", "#0e3a46", "#18585e", "#2e8482", "#6cbcb0"],   // 1 mist
    ["#1a1814", "#36322a", "#5a564a", "#868070", "#b6b09e", "#e6e2d2"],   // 2 bone
    ["#06302a", "#0c5a4a", "#1aa080", "#4ae0b0", "#a0ffe0", "#eafff8"],   // 3 eyes, core
    ["#020606", "#040c0c", "#081414", "#0c1e1e", "#122a2a", "#183636"],   // 4 hollows
  ],
  glow: ["#0c5a4a", "#4ae0b0", "#c8fff0", "#0c5a4a", "#4ae0b0", "#d8fff4"],
  anchors: {
    core: [-0.16, 0.5, 0], head: [-0.2, 0.85, 0], feet: [0.1, -0.3, 0],
    weapon: (P) => [-0.32 - 0.28 * (P.atk || 0), 0.3 + 0.28 * (P.atk || 0), -0.3],
    muzzle: [-0.2, 0.5, 0],
  },
  idle: (t) => ({ bob: Math.sin(t * 1.8) * 0.05, lean: Math.sin(t * 1.1) * 0.04 }),
  glsl: `
float ell(vec3 p, vec3 r){ return (length(p/r) - 1.)*min(min(r.x, r.y), r.z); }
float map(vec3 p){
  float bb = sdBox(p - vec3(.0, .5, 0.), vec3(.95, 1.1, .8));
  if (bb > .2) return bb;
  float d = 1e5;
  vec3 q = p; q.xy = R(.12*WIND - .15*ATK) * q.xy;
  // mist body: a pointed hood, a ragged mantle, and a robe that frays into trailing tendrils
  vec3 b = q;
  b.x -= .07*sin(T*1.3 + b.y*3.)*smoothstep(.7, -.4, b.y);
  float body = ell(b - vec3(.04, .68, 0.), vec3(.19, .13, .29));   // shoulders
  body = smin(body, ell(b - vec3(.0, .93, 0.), vec3(.17, .2, .17)), .07);   // hood behind the mask
  body = smin(body, sdCapT(b, vec3(.02, 1.0, 0.), vec3(.2, 1.22, 0.), .12, .0), .05);   // its swept point
  body = smin(body, sdCapT(b, vec3(.04, .62, 0.), vec3(.1, .12, 0.), .2, .27), .1);
  for (int i = 0; i < 5; i++) {
    float fi = float(i), az = fi*1.257 + .6;
    vec3 wa = vec3(.1 + cos(az)*.16, .2, sin(az)*.2);
    vec3 wb = vec3(.22 + .14*sin(T*1.7 + fi*2.) + cos(az)*.12, -.35 - .18*hash1(fi*5.) + .07*sin(T*2.3 + fi), sin(az)*.32 + .05*sin(T + fi));
    body = smin(body, sdCapT(b, wa, wb, .12, .0), .07);
  }
  vec3 cp = vec3(-.17, .5, -.02);
  body = max(body, -(length((b - cp)*vec3(1., .8, 1.)) - .1));   // the chest is torn open round the core
  float wisp = smoothstep(.8, -.4, b.y);
  body += (.02 + .09*wisp)*(vnoise(b*vec3(7., 4., 7.) + vec3(0., -T*1.6, T*.4)) - .45);
  U(d, body*.7, 1., b);
  // shards of bone ribs pinning the wound
  for (int i = 0; i < 4; i++) {
    float fi = float(i), a = fi*1.57 + .5;
    vec3 r0 = cp + vec3(.02, cos(a)*.11, sin(a)*.1);
    U(d, sdCapT(b, r0, r0 + vec3(-.07, cos(a)*.04, sin(a)*.03), .014, .0), 2., b);
  }
  float core = length(b - cp) - .06 - .01*sin(T*5.);
  U(d, core, 3., b - cp); G(core - .02);
  // the mask: a long antlered deer skull, cracked, eye holes burning
  vec3 m = (q - vec3(-.12, .9, 0.))/1.18;
  m.xy = R(.08*sin(T*.9) - .2*OPEN + .15*ATK) * m.xy;
  float skull = ell(m - vec3(.02, .02, 0.), vec3(.13, .13, .12));
  skull = smin(skull, sdCapT(m, vec3(-.06, -.02, 0.), vec3(-.27, -.3, 0.), .1, .045), .06);
  float sock = 1e5;
  for (int s = -1; s <= 1; s += 2) sock = min(sock, ell(m - vec3(-.11, -.02, .085*float(s)), vec3(.06, .045, .05)));
  float nose = sdCapT(m, vec3(-.25, -.24, -.06), vec3(-.25, -.24, .06), .02, .02);
  float jaw = sdBox(m - vec3(-.2, -.25, 0.), vec3(.1, .012 + .02*OPEN, .06));
  float hol = min(min(sock, nose), jaw);
  float mask = max(skull, -hol);
  U(d, mask, -hol > skull - .006 ? 4. : 2., m);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    float eye = ell(m - vec3(-.09, -.025, .07*fs), vec3(.032, .026, .03));
    U(d, eye, 3., m); E(eye - .01);
    // antlers: a swept main beam with three tines
    if (sdBox(m - vec3(.15, .5, 0.), vec3(.3, .45, .4)) < d) {
      vec3 a0 = vec3(.02, .1, .07*fs), a1 = vec3(.1, .3, .19*fs), a2 = vec3(.22, .5, .26*fs), a3 = vec3(.34, .66, .22*fs);
      float an = sdCapT(m, a0, a1, .035, .026);
      an = min(an, sdCapT(m, a1, a2, .026, .018));
      an = min(an, sdCapT(m, a2, a3, .018, .004));
      an = min(an, sdCapT(m, a1, a1 + vec3(-.1, .2, .03*fs), .02, .003));
      an = min(an, sdCapT(m, a2, a2 + vec3(-.05, .22, .05*fs), .016, .002));
      an = min(an, sdCapT(m, a2 + (a3 - a2)*.5, a2 + vec3(.22, .1, .14*fs), .013, .002));
      U(d, an, 2., m);
    }
  }
  // spectral arms with bone claws: hanging, thrown wide when open, thrust forward on the strike
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 sh = vec3(-.02, .72, .2*fs);
    vec3 el = mix(mix(vec3(-.1, .42, .36*fs), vec3(-.05, .85, .5*fs), OPEN), vec3(-.3, .62, .3*fs), ATK);
    vec3 hd = mix(mix(vec3(-.3, .28, .34*fs), vec3(-.25, 1.05, .58*fs), OPEN), vec3(-.62, .6, .16*fs), ATK);
    hd += vec3(.03*sin(T*1.7 + fs), .03*sin(T*2.1 + fs), 0.);
    float arm = sdCapT(q, sh, el, .055, .03);
    arm = smin(arm, sdCapT(q, el, hd, .03, .025), .03);
    arm += .02*(vnoise(q*9. + vec3(0., -T*2., 0.)) - .5);
    U(d, arm, 1., q);
    vec3 dir = normalize(hd - el), side = normalize(cross(dir, vec3(0., 0., 1.)));
    for (int i = 0; i < 3; i++) {
      float fi = float(i) - 1.;
      vec3 f1 = hd + dir*.12 + side*fi*.05, f2 = f1 + dir*.08 + side*fi*.02 + side*.05;
      U(d, min(sdCapT(q, hd, f1, .016, .01), sdCapT(q, f1, f2, .01, .001)), 2., q);
    }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {   // ghostly: a bright rim, drifting streaks, fading darker toward the wisps
    float rim = 1. - abs(n.z);
    float s = .18 + .45*rim*rim + .25*sh + .1*sin(lp.y*24. + vnoise(lp*5.)*6. + T*3.);
    float ck = mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.);
    float fade = smoothstep(.25, -.35, lp.y);
    return s*mix(.6, 1., smoothstep(-.5, .6, lp.y)) - (ck < .5 ? fade*.3 : 0.);
  }
  if (m == 2.) {   // cracked bone
    float c = abs(vnoise(lp*vec3(14., 22., 14.) + 5.) - .5);
    return c < .03 ? sh*.35 : sh;
  }
  return sh;
}`,
};

// ---- Grub Goblin: a wiry, mean goblin ----
// Hunched and bow-legged, sickly olive skin, huge pointed ears and a hooked
// nose, glowing yellow eyes and a nasty grin of crooked teeth. Scrappy
// leather with rusty plates, a skull pauldron, a jagged rusty cleaver in the
// near hand and a lit bomb in the other. It slashes, or lobs the bomb.
const GOB_LEAN = (P) => 0.42 + 0.18 * (P.atk || 0) - 0.12 * (P.wind || 0);
const GOB_K = 1.2;   // the model is built small and scaled up
const gobBody = (P, [x, y, z]) => { const [rx, ry] = rot(x, y, GOB_LEAN(P)); return [(rx + 0.04) * GOB_K, (ry + 0.42) * GOB_K, z * GOB_K]; };
const gobCleaverHand = (P) => mix3(mix3([-0.3, 0.06, -0.3], [0.1, 0.65, -0.25], P.wind || 0), [-0.5, 0.15, -0.15], P.atk || 0);
const gobBombHand = (P) => mix3([0.3, 0.0, 0.25], [0.35, 0.45, 0.3], Math.max(P.open || 0, P.wind || 0) * (1 - (P.atk || 0)));
export const goblin = {
  name: "Grub Goblin", w: 240, h: 200, ground: 0, scale: 0.3, pitch: 0.14,
  palettes: [
    ["#0a1206", "#18260e", "#2a3c16", "#425620", "#5e722c", "#869a44"],   // 1 skin
    ["#0c0705", "#1a1009", "#2c1c10", "#422a18", "#5a3c22", "#76522e"],   // 2 leather
    ["#3a2a02", "#7a5a04", "#c89a08", "#f0d020", "#fff060", "#fffad0"],   // 3 eyes, fuse spark
    ["#080203", "#160507", "#2a0a0c", "#421212", "#5c1c1a", "#782822"],   // 4 mouth
    ["#180a04", "#361808", "#5e2c0c", "#8a4414", "#b26626", "#d89656"],   // 5 rust
    ["#262014", "#463e2c", "#6a6046", "#968a68", "#c2b48e", "#ece0bc"],   // 6 bone, teeth
    ["#08090c", "#11151d", "#1c2230", "#2a3242", "#3e4658", "#5c6678"],   // 7 bomb iron
    ["#12161c", "#222832", "#384050", "#566072", "#848ea0", "#c4ccd8"],   // 8 blade steel
  ],
  glow: ["#7a2a04", "#f07a10", "#ffe080", "#7a5a04", "#f0d020", "#fff8b0"],
  anchors: {
    core: [-0.06, 0.72, 0], feet: [0, 0, 0],
    head: (P) => gobBody(P, [-0.06, 0.55, 0]),
    weapon: (P) => { const h = gobCleaverHand(P), a = mix(mix(0.5, 2.6, P.wind || 0), 0.3, P.atk || 0); return gobBody(P, [h[0] - Math.cos(a) * 0.25, h[1] + Math.sin(a) * 0.25, h[2]]); },
    muzzle: (P) => { const h = gobBombHand(P); return gobBody(P, [h[0], h[1] + 0.09, h[2]]); },
  },
  idle: (t) => ({ bob: Math.abs(Math.sin(t * 2.6)) * 0.015, lean: Math.sin(t * 1.3) * 0.03, walkT: Math.sin(t * 1.3) * 0.04 }),
  glsl: `
float ell(vec3 p, vec3 r){ return (length(p/r) - 1.)*min(min(r.x, r.y), r.z); }
float map0(vec3 p);
float map(vec3 p){ return map0(p/1.2)*1.2; }
float map0(vec3 p){
  float bb = sdBox(p - vec3(-.05, .65, 0.), vec3(1., .75, .7));
  if (bb > .2) return bb;
  float d = 1e5;
  float ph = WALK*6.283;
  // bowed legs: leather breeches, skinny shins, big clawed feet
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), st = sin(ph + fs*1.57);
    vec3 l = p - vec3(0., 0., .13*fs);
    vec3 hip = vec3(.06, .42, 0.), kn = vec3(-.1 + .04*st, .25, .08*fs), an = vec3(.04 + .05*st, .08 + .03*max(st, 0.), .03*fs);
    U(d, sdCapT(l, hip, kn, .08, .06), 2., l);
    U(d, sdCapT(l, kn, an, .05, .038), 1., l);
    vec3 f = l - an - vec3(-.07, -.04, 0.);
    U(d, ell(f, vec3(.11, .04, .055)), 1., f);
    for (int i = 0; i < 3; i++) {
      float fi = float(i) - 1.;
      U(d, sdCapT(f, vec3(-.09, 0., fi*.03), vec3(-.15, -.03, fi*.045), .018, .003), 6., f);
    }
  }
  // torso, hunched forward from the hips
  float lean = .42 + .18*ATK - .12*WIND + .02*sin(T*2.6);
  vec3 b = p - vec3(.04, .42, 0.);
  b.xy = R(-lean) * b.xy;
  float torso = ell(b - vec3(0., .28, 0.), vec3(.15, .18, .19));
  torso = smin(torso, ell(b - vec3(.0, .4, 0.), vec3(.12, .08, .25)), .06);   // shoulders
  torso = smin(torso, ell(b - vec3(-.02, .1, 0.), vec3(.14, .13, .15)), .06);
  torso += .008*vnoise(b*25.);
  U(d, torso, 2., b);
  U(d, sdRBox(b - vec3(-.12, .27, 0.), vec3(.05, .13, .13), .03) + .006*vnoise(b*40.), 5., b);   // rusty chest plate
  U(d, sdCylY(b - vec3(0., .06, 0.), .165, .028), 2., b);   // belt
  U(d, sdRBox(b - vec3(-.16, .06, 0.), vec3(.02, .035, .04), .01), 5., b);   // buckle
  for (int i = 0; i < 3; i++) {   // rusty spikes down the back
    float fi = float(i);
    vec3 sp = b - vec3(.14, .38 - fi*.1, 0.);
    U(d, sdCapT(sp, vec3(0.), vec3(.1, .03, 0.), .03, .0), 5., sp);
  }
  // skull pauldron on the near shoulder
  vec3 pa = b - vec3(-.02, .42, -.21);
  U(d, ell(pa - vec3(0., -.04, 0.), vec3(.12, .05, .1)), 5., pa);
  U(d, sdCapT(pa, vec3(.0, -.01, -.06), vec3(.05, .1, -.1), .025, .0), 5., pa);
  float sk = ell(pa - vec3(-.02, .05, -.02), vec3(.075, .065, .065));
  float sko = 1e5;
  for (int s = -1; s <= 1; s += 2) sko = min(sko, length(pa - vec3(-.03 + .03*float(s), .055, -.08)) - .022);
  U(d, max(sk, -sko), -sko > sk - .006 ? 4. : 6., pa);
  // head: counter-tilted so it glares forward
  vec3 h = b - vec3(-.07, .52, 0.);
  h.xy = R(lean*.75 - .1*ATK) * h.xy;
  float head = ell(h - vec3(0., .02, 0.), vec3(.14, .12, .13));
  head = smin(head, ell(h - vec3(-.06, -.07, 0.), vec3(.12, .07, .11)), .05);
  for (int s = -1; s <= 1; s += 2) head = smin(head, sdCapT(h, vec3(-.14, .05, 0.), vec3(-.1, .09, .12*float(s)), .032, .022), .03);   // heavy brow
  head += .006*vnoise(h*30.);
  vec3 mq = h - vec3(-.14, -.08, 0.);
  mq.y -= 1.4*mq.z*mq.z;   // the grin curls up at the corners
  float mouth = sdBox(mq, vec3(.07, .016 + .025*ATK + .015*OPEN, .095));
  U(d, max(head, -mouth), -mouth > head - .005 ? 4. : 1., h);
  // hooked nose
  U(d, sdCapT(h, vec3(-.13, .02, 0.), vec3(-.23, -.02, 0.), .035, .02), 1., h);
  U(d, sdCapT(h, vec3(-.23, -.02, 0.), vec3(-.22, -.07, 0.), .02, .006), 1., h);
  // crooked teeth along the grin
  for (int i = 0; i < 6; i++) {
    float fi = float(i), z = -.08 + fi*.032, hz = hash1(fi*3.1);
    float y0 = -.08 + 1.4*z*z;
    float up = mod(fi, 2.) < 1. ? 1. : -1.;
    vec3 t0 = vec3(-.18 + .02*abs(z)*4., y0 + up*(.02 + .025*ATK), z), t1 = t0 + vec3(-.01, -up*(.035 + .02*hz), .015*(hz - .5));
    U(d, sdCapT(h, t0, t1, .014, .002), 6., h);
  }
  // slanted glowing eyes and huge ears
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 e = h - vec3(-.12, .025, .06*fs);
    float eye = ell(e, vec3(.028, .024, .03));
    eye = max(eye, dot(e, normalize(vec3(.25, 1., -.7*fs))) - .006);
    U(d, eye, 3., e); E(eye);
    vec3 er = h - vec3(.0, .03, .1*fs);
    vec3 tip = vec3(.13, .14 + .02*sin(T*3. + fs) - .06*ATK, .4*fs);
    er.x *= 2.5; tip.x *= 2.5;
    float ear = sdCapT(er, vec3(0.), tip, .075, .0)/2.5;
    ear = max(ear, -(length(er - tip*.55 - vec3(-.03, .045, 0.)) - .025));   // a notch bitten out
    U(d, ear, 1., er);
  }
  // near arm: the cleaver
  {
    vec3 sh = vec3(-.03, .36, -.2);
    vec3 hd = mix(mix(vec3(-.3, .06, -.3), vec3(.1, .65, -.25), WIND), vec3(-.5, .15, -.15), ATK);
    vec3 el = (sh + hd)*.5 + vec3(.07, -.08, -.08);
    U(d, sdCapT(b, sh, el, .05, .04), 1., b);
    U(d, sdCapT(b, el, hd, .045, .035), 1., b);
    U(d, sdCapT(b, el + (hd - el)*.3, el + (hd - el)*.8, .05, .045), 2., b);   // bracer
    U(d, length(b - hd) - .05, 1., b);
    float a = mix(mix(.5, 2.6, WIND), .3, ATK);
    vec2 dir = vec2(-cos(a), sin(a));
    U(d, sdCap(b, hd - vec3(dir*.07, 0.), hd + vec3(dir*.06, 0.), .02), 2., b);
    vec3 c = b - hd; c.xy = R(-atan(dir.y, dir.x)) * c.xy;
    float bl = sdBox(c - vec3(.22, .025, 0.), vec3(.16, .06, .012));
    bl = max(bl, dot(c.xy - vec2(.38, .0), normalize(vec2(1., .9))));   // the point
    bl = max(bl, c.y - (.08 - .028*abs(fract(c.x*10.) - .5)*2.));   // a jagged notched spine
    bl = max(bl, -(length(c.xy - vec2(.27, .04)) - .018));   // a hole punched through
    U(d, bl, 8., c);
  }
  // far arm: the bomb, held up, cocked back to throw
  {
    vec3 sh = vec3(-.03, .36, .2);
    vec3 hd = mix(vec3(.3, .0, .25), vec3(.35, .45, .3), max(OPEN, WIND)*(1. - ATK));
    vec3 el = (sh + hd)*.5 + vec3(.08, -.1, .08);
    U(d, sdCapT(b, sh, el, .05, .04), 1., b);
    U(d, sdCapT(b, el, hd, .045, .035), 1., b);
    vec3 bo = b - hd - vec3(0., .09, 0.);
    U(d, length(bo) - .1, 7., bo);
    U(d, max(abs(bo.y) - .014, length(bo) - .108), 5., bo);   // rusty band
    U(d, sdCylY(bo - vec3(0., .1, 0.), .03, .02), 5., bo);
    vec3 fz = vec3(.02, .11, 0.), fz2 = vec3(.05 + .01*sin(T*9.), .17, .01);
    U(d, sdCapT(bo, fz, fz2, .012, .009), 2., bo);
    float spark = length(bo - fz2) - .02 - .008*sin(T*31.);
    U(d, spark, 3., bo); G(spark - .015);
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) return sh - .05 + .1*vnoise(lp*35.);   // warty skin
  if (m == 2.) {   // worn leather with stitched seams
    float s = abs(fract(lp.y*14. + vnoise(lp*6.)*.6) - .5);
    return (s < .05 ? sh*.6 : sh) - .04 + .08*vnoise(lp*30.);
  }
  if (m == 5.) return sh*.85 - .05 + .25*vnoise(lp*24.);   // pitted rust
  if (m == 8.) {   // a rust-eaten blade with a bright edge
    if (vnoise(lp*18.) > .62) { m = 5.; return sh*.8; }
    return lp.y < -.015 ? sh + .25 : sh;
  }
  if (m == 7.) return sh + .3*pow(max(dot(n, normalize(vec3(-.5, .8, -.4))), 0.), 30.);
  return sh;
}`,
};
