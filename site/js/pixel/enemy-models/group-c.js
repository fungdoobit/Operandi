// Enemy models, group c: Module 3's desert archers, Module 4's ice bear and
// scrap bots, Module 5's crab tank. See enemy-px.js for what a model gives and
// forest.js for the conventions. All face left (-x), toward the teammate; the
// camera sits at -z, so -z is the side we see.

// ---- Bone Archers: a squad of three skeleton archers ----
// Bleached skeletons in hooded, sun-rotted desert cloaks with ragged hems, open
// at the front over their ribcages. Turquoise soul-fire burns in their eye
// sockets. Each carries a longbow and a quiver on its back. WIND draws the
// bows (the limbs bend, the string comes back to the cheek), ATK looses the
// arrows (the string snaps straight, the hand follows through), OPEN (fully
// open: the rain attack) leans them back and aims the bows at the sky.
export const archer = {
  name: "Bone Archers", w: 280, h: 210, ground: 0, scale: 0.36, pitch: 0.16, offX: 0.62,
  palettes: [
    ["#180c0a", "#341816", "#542820", "#783c2c", "#9c5a3c", "#c27e52"],   // 1 cloak (sun-rotted crimson)
    ["#221c14", "#463c2c", "#706448", "#9c8e6c", "#c8bc98", "#ece4c8"],   // 2 bone
    ["#04302e", "#0a5e58", "#16a092", "#46dcc4", "#a4fff0", "#eafffc"],   // 3 soul fire
    ["#060408", "#0e0a0e", "#181016", "#22181e", "#2e2028", "#3c2c32"],   // 4 hood shadow
    ["#1a0e06", "#34200e", "#523418", "#724c24", "#966a36", "#b88c50"],   // 5 wood, leather
    ["#16161a", "#302e32", "#545052", "#807a72", "#aea692", "#ddd4bc"],   // 6 bronze, string, fletching
  ],
  glow: ["#0a5e58", "#46dcc4", "#c0fff4", "#0a5e58", "#46dcc4", "#c0fff4"],
  anchors: {
    core: [0.1, 0.8, 0], head: [-0.06, 1.2, 0], feet: [0, 0, 0],
    weapon: (P) => [-0.42, 1.0 + 0.3 * smooth(0.7, 1, P.open), -0.17],
    muzzle: (P) => { const e = 0.12 + 0.75 * smooth(0.7, 1, P.open); return [-0.42 - 0.25 * Math.cos(e), 1.0 + 0.4 * Math.sin(e), -0.17]; },
  },
  idle: (t) => ({ bob: 0, lean: Math.sin(t * 0.9) * 0.012 }),
  glsl: `
// one archer; id staggers its timing and sway
void archer(inout float d, vec3 p, float id){
  float ph = T*1.4 + id*2.1;
  float w = clamp(WIND*1.12 - id*.06, 0., 1.), a = clamp(ATK*1.12 - id*.06, 0., 1.);
  float hi = smoothstep(.7, 1., OPEN);
  // legs: a wide archer's stance
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 hip = vec3(.0, .6, .075*fs);
    vec3 knee = fs < 0. ? vec3(-.13, .33, -.11) : vec3(.11, .32, .1);
    vec3 ank = fs < 0. ? vec3(-.12, .05, -.12) : vec3(.18, .05, .11);
    U(d, sdCap(p, hip, knee, .026), 2., p);
    U(d, sdCap(p, knee, ank, .021), 2., p);
    U(d, sdCapT(p, ank, ank + vec3(-.12, -.03, 0.), .032, .018), 2., p);
    U(d, length(p - knee) - .037, 2., p);
  }
  U(d, sdRBox(p - vec3(0., .62, 0.), vec3(.06, .045, .1), .025), 2., p);   // pelvis
  // a rag sash round the hips, its ends hanging in tatters at the front
  vec3 sq = p - vec3(0., .66, 0.);
  U(d, sdCylY(sq, .1 + .01*sin(atan(sq.z, sq.x)*5.), .035), 1., sq);
  vec3 fq = p - vec3(-.09, .5, -.02);
  float flap = sdBox(fq, vec3(.012, .15 + .03*sin(fq.z*60.), .055));
  flap = max(flap, -fq.y - .1 - .05*hash1(floor(fq.z*30.)));
  U(d, flap - .006, 1., fq + vec3(0., .2*sin(T*1.7 + id), 0.)*0.);
  // upper body: breathing, leaning back to shoot at the sky, pivoting at the pelvis
  vec3 q = p - vec3(0., .62, 0.);
  q.xy = R(.24*hi - .03*w + .05*a) * q.xy;
  q += vec3(0., .62 - .008*sin(ph), 0.);
  U(d, sdCap(q, vec3(.02, .62, 0.), vec3(0., 1.05, 0.), .022 + .006*sin(q.y*90.)), 2., q);   // spine
  // ribcage, open at the front
  vec3 rq = q - vec3(-.03, .9, 0.);
  float n = clamp(floor((rq.y + .11)/.05 + .5), 0., 4.), yy = rq.y + .11 - n*.05;
  float rib = length(vec2(length(rq.xz*vec2(1., 1.2)) - (.115 - .01*abs(n - 2.5)), yy)) - .012;
  if (rq.x < 0.) rib = max(rib, .022 - abs(rq.z));
  U(d, rib, 2., rq);
  U(d, sdCap(rq, vec3(-.115, -.08, 0.), vec3(-.12, .09, 0.), .014), 2., rq);   // sternum
  // the cloak: a ragged shell hanging from the shoulders, open at the front
  vec3 c = q - vec3(.04, 0., 0.);
  float t = clamp((1.1 - c.y)/.78, 0., 1.);
  float rr = .15 + .11*t + .02*sin(ph*1.3 + c.y*9. + c.z*6.)*t;
  float ang = atan(c.z, c.x);
  float cl = abs(length(c.xz*vec2(1., .95)) - rr) - .016;
  float strip = floor(ang*2.6 + id), sf = fract(ang*2.6 + id);
  float hem = .28 + .2*hash1(strip + id*7.) + .12*abs(sf - .5) + .04*vnoise(vec3(ang*9., c.y*3., id));
  cl = max(cl, max(c.y - 1.1, hem - c.y));
  cl = max(cl, -c.x - (.02 + .1*t));
  U(d, cl, length(c.xz) < rr - .002 ? 4. : 1., c);
  U(d, length((q - vec3(.03, 1.03, 0.))/vec3(.17, .075, .19))*.075 - .075, 1., q);   // mantle over the shoulders
  // hood
  vec3 hc = q - vec3(-.02, 1.2, 0.);
  hc.xy = R(-.12*hi) * hc.xy;
  float hr = length(hc/vec3(1., 1.1, .95)) - .112;
  float hood = abs(hr) - .016;
  hood = max(hood, dot(hc, normalize(vec3(-1., .45, 0.))) - .02);
  hood = smin(hood, sdCapT(hc, vec3(.04, .06, 0.), vec3(.15, .1, 0.), .06, .008), .04);
  hood = smin(hood, sdCapT(hc, vec3(.05, -.06, 0.), vec3(.07, -.16, 0.), .1, .13), .03);
  U(d, hood, hr < 0. ? 4. : 1., hc);
  // the skull, set back in the hood's shadow
  vec3 k = hc - vec3(-.025, -.02, 0.);
  float sk = length(k/vec3(1.05, 1., .9))*.9 - .068;
  sk = smin(sk, sdRBox(k - vec3(-.05, -.04, 0.), vec3(.028, .028, .042), .014), .03);
  sk = min(sk, sdRBox(k - vec3(-.045, -.088 - .02*w, 0.), vec3(.028, .01, .038), .008));   // jaw
  vec3 ek = vec3(k.x + .066, k.y - .002, abs(k.z) - .03);
  sk = max(sk, -(length(ek) - .021));   // eye sockets
  sk = max(sk, -(length((k - vec3(-.08, -.04, 0.))/vec3(1., 1.6, 1.)) - .011));   // nose hole
  U(d, sk, 2., k);
  float eye = length(ek + vec3(.002, 0., 0.)) - (.013 + .003*sin(T*7. + id));
  U(d, eye, 3., ek); E(eye);
  // aim: the bow arm points along dir, lifted toward the sky by OPEN
  float e = .12 + .75*hi;
  vec3 dir = vec3(-cos(e), sin(e), 0.), up = vec3(sin(e), cos(e), 0.);
  vec3 s1 = vec3(-.01, 1.01, -.14), bh = s1 + dir*.4 + vec3(0., 0., -.03);
  vec3 el1 = mix(s1, bh, .5) + vec3(0., -.02, -.05);
  U(d, sdCap(q, s1, el1, .022), 2., q);
  U(d, sdCap(q, el1, bh, .018), 2., q);
  U(d, sdCapT(q, mix(el1, bh, .35), mix(el1, bh, .85), .028, .03), 5., q);   // leather bracer
  U(d, length(q - el1) - .028, 2., q);
  // the longbow: an arc that bends harder as it is drawn
  float bend = w*(1. - a), Rb = 1.05 - .3*bend, L = .6;
  vec3 bq = q - bh;
  float bu = dot(bq, dir), bv = dot(bq, up);
  float arc = length(vec2(bu + Rb, bv)) - Rb;
  float bow = length(vec2(arc, bq.z)) - (.024 - .012*abs(bv)/L);
  bow = max(bow, max(abs(bv) - L, -bu - .45));
  U(d, bow, abs(bv) < .07 ? 6. : 5., bq);
  float tipU = -Rb + sqrt(Rb*Rb - L*L), nockU = tipU - .26*bend;
  vec3 t1 = bh + dir*tipU + up*L, t2 = bh + dir*tipU - up*L, nk = bh + dir*nockU;
  U(d, min(sdCap(q, t1, nk, .006), sdCap(q, t2, nk, .006)), 6., q);
  // the drawing arm, hand at the nock, following through on the release
  vec3 s2 = vec3(.05, 1.0, .13), hd = nk + dir*(-.02 - .12*a) + vec3(0., 0., .02);
  vec3 el2 = (s2 + hd)*.5 + vec3(.14, .02 + .06*w, .05);
  U(d, sdCap(q, s2, el2, .022), 2., q);
  U(d, sdCap(q, el2, hd, .018), 2., q);
  U(d, length(q - hd) - .026, 2., q);
  // the nocked arrow, gone once it is loosed
  if (a < .35) {
    vec3 a0 = nk - dir*.02, a1 = nk + dir*(.5 + .22*bend);
    U(d, sdCap(q, a0, a1, .008), 5., q);
    U(d, sdCapT(q, a1, a1 + dir*.07, .022, .0), 6., q);
    U(d, sdCapT(q, a0 + dir*.02, a0 + dir*.12, .028, .004) + .012*0., 6., q);
  }
  // quiver on the back
  vec3 qa = vec3(.3, .6, -.03), qb = vec3(.22, 1.12, .06);
  U(d, sdCapT(q, qa, qb, .045, .056), 5., q);
  for (int i = 0; i < 3; i++) {
    vec3 o = qb + vec3(-.02 + .03*float(i), 0., -.03 + .03*float(i));
    vec3 tp = o + vec3(-.05 + .04*float(i), .17 + .02*float(i), 0.);
    U(d, sdCap(q, o, tp, .007), 5., q);
    U(d, sdCapT(q, tp - (tp - o)*.35, tp, .028, .006), 1., q);
  }
}
float map(vec3 p){
  float d = 1e5;
  // the squad: the leader in front, two more behind and to the side
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 o = i == 0 ? vec3(0.) : i == 1 ? vec3(1.12, 0., .14) : vec3(1.43, 0., -.74);
    float sc = i == 0 ? 1. : i == 1 ? .9 : .95;
    vec3 q = (p - o)/sc;
    float bb = sdBox(q - vec3(-.05, .85, 0.), vec3(.8, .95, .45))*sc;
    if (bb > .15) { d = min(d, bb); continue; }
    float dd = 1e5, pm = gm; vec3 pl = gLp;
    archer(dd, q, fi);
    if (dd*sc < d) d = dd*sc; else { gm = pm; gLp = pl; }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {   // folds, wear and a faded woven band near the hem
    float f = sin(atan(lp.z, lp.x)*11. + lp.y*4.)*.07;
    float band = step(.36, lp.y)*step(lp.y, .42);
    return sh + f - .12*band + .1*vnoise(lp*40.) - .05;
  }
  if (m == 2.) return sh - .14*smoothstep(.55, .8, vnoise(lp*26.)) + .05*vnoise(lp*70.);   // stained bone
  if (m == 5.) return sh + .08*sin(lp.y*70.) - .04;
  return sh;
}`,
};

// ---- Frostbitten Bear: a zombified bear frozen half-dead ----
// A huge hunched bear on its hind legs, matted near-black fur rimed with frost,
// jagged ice crystals growing out of its hump, icicles hanging off its jaw and
// forearms. One flank is torn open to rotten flesh and bare ribs. Pale blue
// eyes burn under a heavy brow; the fanged maw gapes (OPEN, and on WIND as it
// roars). WIND rears it upright with both paws raised, ATK brings it crashing
// forward with the claws (the lunge swipe and the ground slam).
export const bear = {
  name: "Frostbitten Bear", w: 270, h: 260, ground: 0, scale: 0.5, pitch: 0.14, offX: -0.1,
  palettes: [
    ["#0c0a0e", "#1a161c", "#2a242a", "#3c343a", "#544a50", "#70646a"],   // 1 matted fur
    ["#183244", "#2a5674", "#4888ac", "#78bcdc", "#b0e2f4", "#ecfcff"],   // 2 frost, ice
    ["#0a3a5a", "#1a74a8", "#46b4ec", "#8ce0ff", "#cff4ff", "#ffffff"],   // 3 eye glow
    ["#080204", "#18060a", "#2c0c12", "#44141a", "#5e1c22", "#7a2a2c"],   // 4 maw, nose
    ["#2a2620", "#4a443a", "#78705e", "#a69c84", "#d0c8b0", "#f0ecdc"],   // 5 bone, claws, fangs
    ["#18080e", "#30101c", "#4c1c2c", "#682c3c", "#86444e", "#a46064"],   // 6 rotten flesh
  ],
  glow: ["#1a74a8", "#46b4ec", "#cff4ff", "#1a74a8", "#8ce0ff", "#ffffff"],
  anchors: {
    core: [0, 1.15, 0], head: [-0.62, 1.62, 0], feet: [0, 0, 0], muzzle: [-0.92, 1.55, 0],
    weapon: (P) => {
      const w = P.wind || 0, a = P.atk || 0, mix = (x, y, k) => x + (y - x) * k;
      return [mix(mix(-0.72, -0.25, w), -1.05, a), mix(mix(0.55, 2.35, w), 0.45, a), -0.42];
    },
  },
  idle: (t) => ({ bob: Math.sin(t * 1.6) * 0.012, lean: Math.sin(t * 0.8) * 0.02 }),
  glsl: `
float ell(vec3 p, vec3 r){ return (length(p/r) - 1.)*min(r.x, min(r.y, r.z)); }
float fur(vec3 p){ return .025*vnoise(p*vec3(6., 10., 6.)) + .03*abs(vnoise(p*vec3(16., 30., 16.)) - .5); }
float map(vec3 p){
  float d = 1e5;
  float br = sin(T*1.6);
  float lean = .55 - .68*WIND + .5*ATK - .04*HURT;   // the torso tips forward from the hips
  // hind legs, braced wide
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 hip = vec3(.14, .86, .27*fs), knee = vec3(-.1 + .05*WIND, .46, .31*fs), ank = vec3(.1, .15, .31*fs);
    float leg = smin(sdCapT(p, hip, knee, .25, .17), sdCapT(p, knee, ank, .17, .12), .08);
    leg = smin(leg, ell(p - vec3(-.05, .08, .32*fs), vec3(.24, .09, .14)), .06);
    U(d, leg + fur(p), 1., p);
    for (int c = -1; c <= 1; c++) {
      vec3 b = vec3(-.26, .06, .32*fs + .06*float(c));
      U(d, sdCapT(p, b, b + vec3(-.09, -.05, .01*float(c)), .028, .004), 5., p);
    }
  }
  // the torso, pivoting on the hips
  vec3 q = p - vec3(.14, .86, 0.);
  q.xy = R(-lean) * q.xy;
  float belly = ell(q - vec3(.02, .32, 0.), vec3(.42, .5, .42));
  float chest = ell(q - vec3(-.05, .88 + .02*br, 0.), vec3(.46, .44, .48 + .015*br));
  float hump = ell(q - vec3(.16, 1.1, 0.), vec3(.3, .3, .36));
  float b = smin(smin(belly, chest, .22), hump, .16) + fur(q);
  // the rotted flank: torn open on the side we see
  vec3 wq = q - vec3(-.02, .6, -.44);
  float hole = ell(wq, vec3(.2, .27, .24)) + .03*vnoise(wq*14.);
  U(d, max(b, -hole), -hole > b ? 6. : 1., q);
  for (int i = 0; i < 3; i++) {
    float y = .48 + .12*float(i);
    float rib = length(vec2(length(q.xz/vec2(1., 1.02)) - .37 + .02*float(i), q.y - y)) - .026;
    U(d, max(rib, hole - .02), 5., q);
  }
  // ice crystals bursting from the hump and shoulders
  if (sdBox(q - vec3(.2, 1.15, 0.), vec3(.5, .55, .55)) < .1) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec3 cb = vec3(.06 + .1*fi, 1.3 - .09*fi, .26*sin(fi*2.4));
      vec3 ct = cb + vec3(.12 + .04*fi, .3 - .04*fi, .12*sin(fi*2.4))*(1.1 - .12*fi);
      float cr = sdCapT(q, cb, ct, .07 - .006*fi, .0);
      U(d, cr, 2., q - cb); G(cr + .02);
    }
  }
  // the neck and the head, held level (and thrown back in the roar)
  vec3 hp = vec3(-.42, 1.26, 0.);
  U(d, sdCapT(q, vec3(-.08, 1.02, 0.), hp + vec3(.05, -.05, 0.), .3, .21) + fur(q), 1., q);
  vec3 h = q - hp;
  h.xy = R(lean*.85 + .3*WIND) * h.xy;
  h /= 1.18; d /= 1.18;   // the head is drawn 1.18x bigger
  float skull = ell(h, vec3(.23, .2, .21));
  skull = smin(skull, sdCapT(h, vec3(-.1, -.03, 0.), vec3(-.36, -.06, 0.), .13, .085), .08);
  skull = smin(skull, ell(h - vec3(-.1, .09, 0.), vec3(.1, .05, .16)), .04);   // heavy brow
  float gape = .12 + .03*br + .45*OPEN + .4*WIND;
  vec3 j = h - vec3(-.02, -.1, 0.);
  j.xy = R(-gape) * j.xy;
  float jaw = sdCapT(j, vec3(0., -.02, 0.), vec3(-.3, -.035, 0.), .11, .06);
  U(d, skull + .6*fur(h), 1., h);
  U(d, jaw + .6*fur(j), 1., j);
  U(d, ell(h - vec3(-.18, -.1, 0.), vec3(.17, .04 + .1*gape, .085)), 4., h);   // the maw
  U(d, ell(h - vec3(-.38, -.04, 0.), vec3(.05, .045, .06)), 4., h);   // nose
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    U(d, sdCapT(h, vec3(-.3, -.09, .055*fs), vec3(-.31, -.2, .05*fs), .022, .0), 5., h);   // fangs
    U(d, sdCapT(j, vec3(-.25, .0, .05*fs), vec3(-.26, .1, .045*fs), .02, .0), 5., j);
    U(d, ell(h - vec3(.05, .19, .13*fs), vec3(.06, .07, .035)) + (fs > 0. ? 0. : max(0., .02 - abs(h.y - .2))*2.), 1., h);   // ears, one torn
    vec3 e = h - vec3(-.17, .045, .1*fs);
    float eye = length(e/vec3(.8, .55, .7))*.55*.6 - .02;
    U(d, eye, 3., e); E(eye);
  }
  for (int i = 0; i < 3; i++) {   // icicles off the jaw
    vec3 ib = vec3(-.08 - .07*float(i), -.08, .05*sin(float(i)*2.));
    U(d, sdCapT(j, ib, ib + vec3(.01, -.1 - .03*float(i&1), 0.), .024, .0), 2., j);
  }
  d *= 1.18;
  // the arms: hanging, raised in the rear-up, crashing forward in the strike
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 sh = vec3(-.1, .98, .37*fs);
    vec3 el = mix(mix(vec3(-.36, .6, .46*fs), vec3(-.3, 1.22, .5*fs), WIND), vec3(-.56, .86, .44*fs), ATK);
    vec3 pw = mix(mix(vec3(-.44, .24, .42*fs), vec3(-.46, 1.5, .44*fs), WIND), vec3(-.86, .56, .36*fs), ATK);
    float arm = smin(sdCapT(q, sh, el, .21, .15), sdCapT(q, el, pw, .15, .12), .06);
    arm = smin(arm, ell(q - pw, vec3(.16, .12, .16)), .05);
    U(d, arm + fur(q), 1., q);
    vec3 cd = normalize(pw - el);
    for (int c = -1; c <= 1; c++) {
      vec3 cb = pw + cd*.1 + vec3(-.03, 0., .075*float(c));
      vec3 cm = cb + cd*.15 + vec3(-.05, .0, .01*float(c));
      U(d, sdCapT(q, cb, cm, .04, .024), 5., q);
      U(d, sdCapT(q, cm, cm + cd*.06 + vec3(-.08, -.03, 0.), .024, .0), 5., q);
    }
    vec3 ib = mix(el, pw, .45) + vec3(.03, -.1, -.04*fs);   // icicles off the forearm
    U(d, sdCapT(q, ib, ib + vec3(.0, -.14, 0.), .03, .0), 2., q);
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {
    float strand = sin(lp.y*55. + vnoise(lp*9.)*7. + lp.x*20.);
    if (n.y + .4*vnoise(lp*vec3(4., 9., 4.)) > .86) { m = 2.; return sh*.9 + .1; }   // frost on the tops
    return sh + .1*strand - .02;
  }
  if (m == 2.) return sh + .25 + .15*step(.7, fract(lp.y*6. + lp.x*3.));   // glassy ice facets
  if (m == 6.) return sh - .08 + .2*vnoise(lp*30.);
  return sh;
}`,
};

// ---- Scrap Bots: a gang of three hostile junk robots ----
// Built from salvage: mismatched steel plates, flaking hazard paint, rust and
// frost. Each has one red camera eye under a slanted visor plate.
// The gunner (front) rolls on treads, with a cannon arm under an ammo drum
// (the muzzle; its barrel kicks back on every ATK). The brute behind is an
// oil drum on stubby reverse-jointed legs with a pincer claw. The scout is a
// small box on stilt legs with twin whip antennae. WIND hunkers them down for
// the charge, ATK throws them forward, WALK drives the treads and legs.
export const robot = {
  name: "Scrap Bots", w: 270, h: 180, ground: 0, scale: 0.34, pitch: 0.2, offX: 0.5,
  palettes: [
    ["#0a0c10", "#161a22", "#262c36", "#3c4450", "#5a6470", "#848e9a"],   // 1 steel plates
    ["#1a0c06", "#341808", "#562a0e", "#7c4016", "#a45c22", "#c8823c"],   // 2 rust
    ["#3a0404", "#7a0a0a", "#c41a12", "#ff4a2a", "#ff9a72", "#fff0e0"],   // 3 red eyes
    ["#060608", "#101014", "#1a1a20", "#26262c", "#34343c", "#46464e"],   // 4 treads, joints
    ["#2a1e04", "#4e3808", "#7c5a0e", "#b08414", "#dcb02a", "#f4d860"],   // 5 hazard paint
    ["#183244", "#2a5674", "#4888ac", "#78bcdc", "#b0e2f4", "#ecfcff"],   // 6 frost
  ],
  glow: ["#7a0a0a", "#ff4a2a", "#ffd0b0", "#7a0a0a", "#ff4a2a", "#ffe0d0"],
  anchors: {
    core: [0.45, 0.5, 0], head: [-0.06, 0.88, 0], feet: [0, 0, 0],
    muzzle: (P) => [-0.6 + 0.09 * (P.atk || 0), 0.6, -0.27],
    weapon: [-0.4, 0.55, -0.2],
  },
  idle: (t) => ({ bob: 0, walkT: t * 0.15 }),
  glsl: `
float cylX(vec3 p, float r, float h){ return sdCylY(p.yxz, r, h); }
float cylZ(vec3 p, float r, float h){ return sdCylY(p.xzy, r, h); }
// the gunner: treads, a boxy body, a cannon arm
void gunner(inout float d, vec3 p){
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 t = p - vec3(0., .14, .18*fs);
    U(d, sdRBox(t, vec3(.27, .13, .065), .11), 4., t);
    for (int w = -1; w <= 1; w++) U(d, cylZ(t - vec3(.17*float(w), 0., -.03*fs), .065, .05), 2., t);
  }
  vec3 q = p - vec3(0., .3, 0.);
  q.xy = R(-.06*sin(T*9.)*ATK) * q.xy;
  U(d, sdRBox(q - vec3(0., .04, 0.), vec3(.2, .05, .16), .02), 4., q);
  vec3 b = q - vec3(.02, .24, 0.);
  U(d, sdRBox(b, vec3(.19, .16, .17), .03), 1., b);
  vec3 pl = b - vec3(-.17, -.03, -.05); pl.xy = R(.12) * pl.xy;   // a bolted-on hazard plate
  U(d, sdRBox(pl, vec3(.04, .11, .1), .01), 5., pl);
  U(d, sdRBox(b - vec3(.17, .05, .02), vec3(.06, .12, .12), .02), 2., b);   // rusty back pack
  U(d, cylZ(b - vec3(.2, .2, .1), .025, .1), 4., b);   // exhaust pipe stub
  // head: a turret that twitches round
  vec3 h = q - vec3(-.05, .56, 0.);
  h.xz = R(.18*sin(T*.7) + .12*step(.92, fract(T*.37))) * h.xz;
  U(d, sdRBox(h, vec3(.12, .09, .12), .03), 1., h);
  vec3 vs = h - vec3(-.1, .09, 0.); vs.xy = R(-.35) * vs.xy;   // slanted visor: a scowl
  U(d, sdRBox(vs, vec3(.07, .015, .12), .008), 5., vs);
  vec3 e = h - vec3(-.14, -.005, -.02);
  U(d, cylX(e, .065, .05), 4., e);
  float lens = max(length(e + vec3(.04, 0., 0.)) - .046, dot(e, normalize(vec3(.35, 1., .3))) - .012);
  U(d, lens, 3., e); E(lens);
  U(d, sdCap(h, vec3(.05, .09, .07), vec3(.12, .36, .1), .01), 4., h);   // antenna
  float tip = length(h - vec3(.12, .37, .1)) - .022; U(d, tip, 3., h); G(tip + .01);
  // cannon arm on the near side, with an ammo drum; the barrel kicks back on the shot
  vec3 a = q - vec3(-.05, .3, -.26);
  U(d, length(a - vec3(.07, 0., 0.)) - .07, 4., a);
  U(d, sdRBox(a - vec3(-.1, 0., 0.), vec3(.14, .055, .055), .02), 1., a);
  U(d, cylZ(a - vec3(-.06, .09, 0.), .07, .045), 5., a);
  vec3 g = a - vec3(-.32 + .09*ATK, 0., 0.);
  U(d, cylX(g, .042, .16), 4., g);
  U(d, cylX(g - vec3(-.13, 0., 0.), .052, .03), 1., g);   // muzzle brake
  U(d, cylX(g - vec3(.06, 0., 0.), .055, .05), 2., g);   // cooling jacket
  // a stubby claw on the far side
  vec3 c = q - vec3(-.06, .28, .22);
  U(d, sdCapT(c, vec3(0.), vec3(-.16, -.06, 0.), .05, .035), 1., c);
  U(d, sdCapT(c, vec3(-.16, -.06, 0.), vec3(-.24, -.02 + .05*OPEN, .02), .03, .01), 4., c);
  U(d, sdCapT(c, vec3(-.16, -.06, 0.), vec3(-.24, -.12 - .05*OPEN, .02), .03, .01), 4., c);
}
// the brute: an oil drum on stubby legs with a pincer
void brute(inout float d, vec3 p){
  float wk = sin(WALK*6.283);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = wk*fs;
    vec3 hip = vec3(.02, .42, .13*fs), knee = vec3(-.1 + .04*ph, .26 + .03*max(ph, 0.), .14*fs), ft = vec3(.03 + .06*ph, .05 + .04*max(ph, 0.), .14*fs);
    U(d, sdCapT(p, hip, knee, .06, .045), 1., p);
    U(d, sdCapT(p, knee, ft, .04, .035), 4., p);
    U(d, length(p - knee) - .05, 2., p);
    vec3 f = p - ft - vec3(-.03, -.02, 0.);
    U(d, sdRBox(f, vec3(.1, .025, .06), .015), 4., f);
  }
  vec3 q = p - vec3(0., .72, 0.);
  q.xy = R(.15*WIND - .2*ATK) * q.xy;
  U(d, sdCylY(q, .21, .24) - .02, 2., q);   // the drum
  U(d, sdCylY(q - vec3(0., -.02, 0.), .235, .015), 1., q);   // its bands
  U(d, sdCylY(q - vec3(0., .14, 0.), .235, .015), 1., q);
  vec3 gr = q - vec3(-.2, -.08, -.02);   // a grille of a mouth
  U(d, sdRBox(gr, vec3(.04, .06, .1), .01), 4., gr);
  for (int i = 0; i < 4; i++) {   // jagged scrap teeth round the rim
    float an = -2.2 + .55*float(i);
    vec3 tb = vec3(.2*cos(an), .22, .2*sin(an));
    U(d, sdCapT(q, tb, tb + vec3(.05*cos(an), .11 + .03*float(i&1), .05*sin(an)), .035, .0), 1., q);
  }
  vec3 pt = q - vec3(-.2, .02, -.1); pt.xz = R(.5) * pt.xz;   // patched with a plate
  U(d, sdRBox(pt, vec3(.03, .12, .1), .01), 1., pt);
  // head: a hooded box with one big eye
  vec3 h = q - vec3(-.04, .34, 0.);
  h.xz = R(-.15*sin(T*.5 + 1.)) * h.xz;
  U(d, sdRBox(h, vec3(.13, .1, .13), .04), 1., h);
  vec3 hood = h - vec3(-.1, .1, 0.); hood.xy = R(-.4) * hood.xy;
  U(d, sdRBox(hood, vec3(.09, .02, .14), .01), 2., hood);
  vec3 e = h - vec3(-.13, -.01, -.03);
  U(d, cylX(e, .07, .05), 4., e);
  float lens = max(length(e + vec3(.035, 0., 0.)) - .052, dot(e, normalize(vec3(.35, 1., .3))) - .014);
  U(d, lens, 3., e); E(lens);
  U(d, sdCap(h, vec3(.06, .1, -.05), vec3(.0, .3, -.09), .01), 4., h);
  vec3 dsh = h - vec3(.0, .3, -.09); dsh.xy = R(.6) * dsh.xy;
  U(d, max(abs(length(dsh - vec3(0., .1, 0.)) - .1) - .01, dsh.y - .03), 1., dsh);   // a bent dish
  // the pincer arm, swinging with the strike
  vec3 a = q - vec3(-.02, .12, -.27);
  a.xy = R(.5*WIND - .9*ATK) * a.xy;
  U(d, length(a) - .065, 4., a);
  U(d, sdCapT(a, vec3(0.), vec3(-.12, -.18, 0.), .055, .045), 1., a);
  U(d, sdCapT(a, vec3(-.12, -.18, 0.), vec3(-.3, -.2, 0.), .045, .04), 5., a);
  float op = .25 + .35*OPEN + .3*WIND;
  vec3 pc = a - vec3(-.3, -.2, 0.);
  U(d, sdCapT(pc, vec3(0.), vec3(-.13, .05 + .07*op, 0.), .035, .012), 1., pc);
  U(d, sdCapT(pc, vec3(0.), vec3(-.13, -.05 - .07*op, 0.), .035, .012), 1., pc);
}
// the scout: a small box on stilts with twin whip antennae
void scout(inout float d, vec3 p){
  float wk = sin(WALK*6.283 + 1.5);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = wk*fs;
    vec3 hip = vec3(0., .38, .09*fs), knee = vec3(.08, .22 + .02*ph, .11*fs), ft = vec3(-.02 + .05*ph, .03 + .03*max(ph, 0.), .11*fs);
    U(d, sdCap(p, hip, knee, .025), 4., p);
    U(d, sdCap(p, knee, ft, .022), 1., p);
    U(d, sdRBox(p - ft - vec3(-.03, -.015, 0.), vec3(.06, .015, .035), .01), 4., p);
  }
  vec3 b = p - vec3(0., .5 + .015*sin(T*5.), 0.);
  b.xy = R(.1*WIND - .25*ATK + .06*sin(T*2.3)) * b.xy;
  U(d, sdRBox(b, vec3(.13, .12, .12), .03), 5., b);
  U(d, sdRBox(b - vec3(.03, .1, 0.), vec3(.12, .03, .13), .015), 1., b);
  vec3 e = b - vec3(-.13, 0., -.02);
  U(d, cylX(e, .07, .04), 4., e);
  float lens = max(length(e + vec3(.03, 0., 0.)) - .05, dot(e, normalize(vec3(.35, 1., .3))) - .012);
  vec3 bv = b - vec3(-.13, .07, 0.); bv.xy = R(-.4) * bv.xy;
  U(d, sdRBox(bv, vec3(.05, .012, .13), .006), 1., bv);
  U(d, lens, 3., e); E(lens);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 a0 = vec3(.06, .12, .08*fs), a1 = a0 + vec3(.1 + .03*sin(T*3. + fs), .3, .05*fs);
    U(d, sdCap(b, a0, a1, .008), 4., b);
    float tp = length(b - a1) - .016; U(d, tp, 3., b); G(tp + .01);
  }
}
float map(vec3 p){
  float d = 1e5;
  for (int i = 0; i < 3; i++) {
    vec3 o = i == 0 ? vec3(0.) : i == 1 ? vec3(.86, 0., .12) : vec3(1.12, 0., -.66);
    vec3 q = p - o;
    float bb = sdBox(q - vec3(-.1, .55, 0.), vec3(.6, .65, .45));
    if (bb > .12) { d = min(d, bb); continue; }
    float dd = 1e5, pm = gm; vec3 pl = gLp;
    if (i == 0) gunner(dd, q); else if (i == 1) brute(dd, q); else scout(dd, q);
    if (dd < d) d = dd; else { gm = pm; gLp = pl; }
  }
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  float rv = length(fract(lp.xy*vec2(9., 9.) + .5) - .5);
  if (m == 1. || m == 5.) {
    if (n.y > .55 && vnoise(lp*13.) > .45) { m = 6.; return sh + .15; }   // frost on the tops
    if (m == 5. && fract((lp.x + lp.y + lp.z)*9.) > .5) m = 4.;   // hazard stripes
    if (m == 5. && vnoise(lp*24.) > .7) m = 1.;   // chipped paint
    if (m == 1. && vnoise(lp*8. + 4.) > .7) m = 2.;   // rust bloom
    if (rv < .1) return sh + .25;   // rivets
    if (abs(fract(lp.y*7. + .3) - .5) < .05) return sh - .2;   // seams
    return sh + .06*vnoise(lp*40.);
  }
  if (m == 2.) return sh + .12*vnoise(lp*30.) - .05 - .15*step(.48, abs(fract(lp.y*14.) - .5));
  if (m == 4.) return sh + .14*step(.5, fract(lp.x*16. - WALK*3.));
  return sh;
}`,
};

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
