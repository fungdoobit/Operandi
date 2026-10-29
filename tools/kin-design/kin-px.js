// DRAFTS (Isaac 2026-10-29: "a few new characters in the style of NOVA, same size, same structure, same art style; change it,
// add clothing, accessories, different powers, elements"). Not in the game yet: a design preview only (index.html here).
//
// Every one is built like NOVA's chosen body ("mooncloak", nova-px.js KIND 10): a round head on a short cloak with a ragged
// hem, blank glowing eyes that change with mood, a halo behind the head, and a haze round them. Same renderer (PixelGL: a 3D
// shape marched into pixel art with fixed colour ramps, dithering and outlines), same size (view 4.79 on a 107 x 113 canvas,
// as NovaMate draws her), same eye code. What changes: the element (colours, halo, haze), the clothes and accessories.
//
// Materials (each a ramp of 6 colours, dark to light): 1 body, 2 deep shadow, 3 eyes, 4 element glow, 5 hard/shiny accent,
// 6 7 8 clothes and accessories (lit matte).
import { PixelGL } from "../../site/js/pixel/pixel-gl.js";

export const KINS = [
  {
    id: "frost", name: "FROST", element: "Ice",
    look: "a knitted red and cream scarf with a tail that flutters behind; a crown of ice crystals; snowflakes drift round them",
    powers: "Ice Shard, Blizzard, Glacier Wall (a shield), Absolute Zero (freezes the boss solid, then shatters it)",
    palettes: [
      ["#03060f", "#07102a", "#0d1d45", "#173066", "#26508f", "#3f7cc0"],
      ["#010208", "#030614", "#060c22", "#0a1432", "#101e44", "#182a58"],
      ["#7fb2d6", "#a8d4ee", "#cbe8f8", "#e6f6ff", "#f4fbff", "#ffffff"],
      ["#0f3a5c", "#1b6a96", "#2fa0cc", "#5cd0ee", "#a6ecfa", "#e8fcff"],
      ["#123048", "#24587c", "#3d8ab0", "#6cbcda", "#b4e6f4", "#f2fdff"],
      ["#3a0a12", "#6e1422", "#a82434", "#d8444a", "#f27a70", "#ffc0b0"],
      ["#4a4236", "#7a6e5a", "#b4a88a", "#e0d6bc", "#f4eedc", "#fffdf6"],
      ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
    ],
    glow: ["#3d6e96", "#9ccfee", "#effaff", "#123e66", "#2c7ab0", "#7cc8ee"],
  },
  {
    id: "volt", name: "VOLT", element: "Lightning",
    look: "big over-ear headphones; a lightning-bolt tuft of hair that crackles; a jagged halo of flickering bolts",
    powers: "Static Shot, Chain Lightning (jumps between targets), Thunderclap, Overload (charges up and discharges everything)",
    palettes: [
      ["#050505", "#0d0d10", "#18181e", "#25252e", "#3a3a48", "#5a5a70"],
      ["#020202", "#060608", "#0c0c10", "#141418", "#1e1e24", "#2a2a32"],
      ["#b0a060", "#d4c888", "#ece4b4", "#f8f4dc", "#fffcf0", "#ffffff"],
      ["#4a3a00", "#8a6a00", "#c8a000", "#f0d020", "#fff070", "#ffffe0"],
      ["#1a1c22", "#2c3038", "#444a56", "#646c7c", "#929cae", "#cfd6e2"],
      ["#5a4400", "#94700a", "#cc9e14", "#f0c830", "#ffe680", "#fff8d0"],
      ["#0a0a0e", "#16161c", "#22222a", "#30303a", "#464652", "#6a6a78"],
      ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
    ],
    glow: ["#6a5e20", "#e8d870", "#fffbe0", "#3a3000", "#9a8200", "#f0dc40"],
  },
  {
    id: "bloom", name: "BLOOM", element: "Nature",
    look: "a crown of pink flowers; a cloak whose hem is a ring of leaves; a halo of turning leaves; spores in the air",
    powers: "Thorn Dart, Vine Bind (roots the boss), Pollen Burst, Overgrowth (a forest bursts out of the ground)",
    palettes: [
      ["#020803", "#06140a", "#0c2414", "#14381f", "#20552e", "#327a42"],
      ["#010402", "#030a05", "#06120a", "#0a1c10", "#0f2817", "#16361f"],
      ["#a8a878", "#cccc98", "#e4e4b8", "#f4f4d8", "#fbfbee", "#ffffff"],
      ["#0f3a10", "#1f6a1c", "#3a9a2a", "#6cc63c", "#aeea7a", "#effcd8"],
      ["#1c2e10", "#30501a", "#4c7a28", "#74a83a", "#a6d65a", "#e2f8a8"],
      ["#4a0f2a", "#842048", "#bc3a6a", "#e46a94", "#f8a8c4", "#ffe4ee"],
      ["#5a3a00", "#946400", "#cc9810", "#f2c838", "#ffe88a", "#fff8d4"],
      ["#0e2a10", "#1c4a1a", "#2e7028", "#46983a", "#72c254", "#b8ec8c"],
    ],
    glow: ["#5a6a2a", "#cfe0a0", "#f8ffe4", "#14380e", "#3c8a26", "#9ad85a"],
  },
  {
    id: "tide", name: "TIDE", element: "Water",
    look: "a captain's tricorne hat with a gold anchor badge; a ring of rippling water behind the head; bubbles rising",
    powers: "Water Bolt, Riptide (drags the boss), Whirlpool, Tidal Wave (a huge wave crashes over the stage)",
    palettes: [
      ["#020a0c", "#051618", "#0a2a2e", "#114046", "#1c5e66", "#2e868e"],
      ["#010506", "#020c0e", "#051618", "#082226", "#0c3036", "#124048"],
      ["#7cc0c4", "#a2dade", "#c4eef0", "#e2faf8", "#f2fdfc", "#ffffff"],
      ["#073a44", "#0c6070", "#1592a4", "#3cc4d2", "#8ce8ee", "#e0feff"],
      ["#0a2c3a", "#145068", "#22809c", "#44b2cc", "#94e0ee", "#e8fdff"],
      ["#3a2400", "#6e4a08", "#a87814", "#d8a82a", "#f6d460", "#fff2b8"],
      ["#1a0e08", "#2e1a0e", "#4a2c16", "#6a4222", "#8e5c32", "#b47e4a"],
      ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
    ],
    glow: ["#2a6a70", "#9ae0e4", "#efffff", "#08404a", "#167e90", "#5ccfda"],
  },
  {
    id: "aurum", name: "AURUM", element: "Light",
    look: "NOVA's opposite: an ivory body and cloak with a gold-trimmed hem, a golden halo above the head, small feathered wings, deep blue eyes",
    powers: "Radiant Bolt, Sanctuary (a shield of light), Prism Lance, Judgment (a pillar of light from the sky)",
    palettes: [
      ["#4a4038", "#7a6c5e", "#ab9c88", "#d4c8b2", "#eee6d4", "#fffcf2"],
      ["#2a2420", "#3e362e", "#544a40", "#6c6052", "#867866", "#a0927e"],
      ["#060a1c", "#0a1230", "#0e1840", "#142050", "#1a2a62", "#223474"],
      ["#5a3c00", "#9a6c06", "#d4a01a", "#f6cc4a", "#fff09a", "#fffde8"],
      ["#4a3000", "#7e5808", "#b88a1a", "#e2b83a", "#fade7a", "#fff8d0"],
      ["#4a4038", "#7a6c5e", "#ab9c88", "#d4c8b2", "#eee6d4", "#fffcf2"],
      ["#4a3000", "#7e5808", "#b88a1a", "#e2b83a", "#fade7a", "#fff8d0"],
      ["#5a5650", "#8c867c", "#bab4a8", "#dedad0", "#f2efe8", "#ffffff"],
    ],
    glow: ["#2a3a7a", "#5a74c8", "#a8b8f0", "#6a4a08", "#c8961e", "#f6dc78"],
    extra: ["#cfd6e2", "#ffffff", "#2a1e10"],
  },
  {
    id: "byte", name: "BYTE", element: "Code",
    look: "a hoodie with the hood up; a glowing green visor screen across the face; an antenna with a blinking light; a halo of orbiting bits",
    powers: "Ping, Bug Swarm, Infinite Loop (traps the boss in a repeating moment), Stack Overflow (blocks of code crash down)",
    palettes: [
      ["#03050a", "#080c14", "#0f1622", "#182234", "#24324a", "#36486a"],
      ["#010204", "#03050a", "#060a12", "#0a0f1a", "#0f1624", "#151e30"],
      ["#5cc87a", "#8ae6a0", "#b8f6c8", "#e0ffe8", "#f2fff6", "#ffffff"],
      ["#03200c", "#064018", "#0a6a28", "#18a040", "#58e070", "#c8ffd0"],
      ["#101418", "#1e262e", "#2e3a46", "#46566a", "#6a7e96", "#9cb0c8"],
      ["#0c1426", "#16223e", "#22345c", "#30487c", "#46629e", "#6a86c0"],
      ["#3a0e10", "#6a1a1e", "#a02a2e", "#d04440", "#f07a6a", "#ffc0b0"],
      ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
    ],
    glow: ["#1e6a34", "#7ae898", "#e8ffee", "#063a14", "#13883a", "#4ee070"],
  },
];

const model = (kind) => `
#define KIND ${kind}
uniform vec2 uRes; uniform float uTime, uYaw, uView, uBlink, uBob, uSway, uMood, uEnergy;
float gm; float gEye; float gMagic;
void U(inout float d, float nd, float m){ if (nd < d) { d = nd; gm = m; } }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.)/k1; }
float fbm(vec3 p){ return vnoise(p)*.6 + vnoise(p*2.1 + 4.)*.3 + vnoise(p*4.3 + 9.)*.1; }
void glowU(inout float d, float nd, float m){ U(d, nd, m); gMagic = min(gMagic, nd); }

// ---- NOVA's eyes, exactly (mood: 0 idle, 1 happy, 2 angry, 3 sad, 4 sleepy) ----
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
void headEyes(inout float d, vec3 p, vec3 c, float r, float k){
  float z = -r*.86;
  eyes(d, p, c + vec3(-.18*k, .01, z), c + vec3(.17*k, .01, z), vec3(.1, .18, .11)*k);
}
// ---- NOVA's short cloak, with the hem shape as a choice (0 ragged, 1 leaves) ----
float cloak(vec3 p, float top, float bot, float r0, float r1, float hem){
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(top - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(top - s.y, 0.), 2.);
  float ry = mix(r0, r1, clamp((top - s.y)/(top - bot), 0., 1.));
  float c = (length(vec2(s.x, s.z*1.3)) - ry)*.7;
  float a = atan(s.z, s.x);
  float jag = hem < .5 ? .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3)
                       : .26*pow(1. - abs(fract(a*1.6 + uTime*.05) * 2. - 1.), 1.6) + .03*sin(uTime*2. + a*3.);
  return max(c, max(s.y - top - .02, (bot + jag) - s.y));
}

float map(vec3 p){
  gm = 0.; gEye = 1e5; gMagic = 1e5;
  float d = 1e5;
  p.y -= uBob;
  p.xz = R(uYaw) * p.xz;
  if (sdBox(p - vec3(0., .25, 0.), vec3(1.6, 1.9, 1.3)) > .3) return 1.;
  vec3 c = vec3(0., .5, 0.);
  float body;
#if KIND == 0
  // FROST: head and cloak, a knitted scarf round the neck (red and cream stripes) with a fluttering tail, a crown of ice
  body = smin(length(p - c) - .4, cloak(p, .22, -.74, .22, .64, 0.), .1);
  U(d, body, 1.);
  vec3 n = p - vec3(0., .17, 0.);
  float an = atan(n.z, n.x);
  float scarf = length(vec2(length(n.xz) - .3, n.y*1.15)) - .1 - .012*sin(an*14.)*sin(n.y*40.);
  U(d, scarf, fract(an*1.27) < .5 ? 6. : 7.);
  // the tail: from the front left of the neck, blown back and down in the wind
  vec3 a0 = vec3(-.22, .12, -.24), prev = a0; float tail = 1e5, tsel = 0.;
  for (int k = 1; k <= 5; k++) {
    float w = float(k)/5.;
    vec3 nx = a0 + vec3(.34*w + .05*sin(uTime*5. - w*6.), -.42*w + .06*sin(uTime*4.3 - w*7.), .18*w);
    float sg = sdCapT(p, prev, nx, .085 - .02*w, .08 - .02*w);
    if (sg < tail) { tail = sg; tsel = float(k); }
    prev = nx;
  }
  U(d, tail, mod(tsel, 2.) < .5 ? 7. : 6.);
  // the ice crown: crystals fanning out behind the head, turning slowly
  vec3 q = p - c - vec3(0., .02, .3);
  for (int k = 0; k < 7; k++) {
    float a = 1.57 + (float(k) - 3.)*.42 + .05*sin(uTime*.8 + float(k));
    float L = .3 + .12*hash1(float(k)) + (k == 3 ? .1 : 0.);
    vec3 dir = vec3(cos(a), sin(a), 0.), cen = dir*(.42 + L*.5);
    vec3 r = q - cen; r.xy = R(-a + 1.5708) * r.xy;
    float cr = sdOct(r*vec3(1.9, .62, 1.9), .16 + L*.12)*.5;
    if (k == 3) glowU(d, cr, 5.); else U(d, cr, 5.);
  }
  // snowflakes drifting down round them
  for (int k = 0; k < 4; k++) {
    float fk = float(k), ph = fract(uTime*.16 + fk*.25);
    vec3 f = p - vec3(sin(fk*2.4 + uTime*.7)*.95, 1.2 - ph*2.1, -.2 + .2*fk);
    f.xy = R(uTime*1.3 + fk) * f.xy;
    glowU(d, sdOct(f*vec3(1., 1., 2.5), .055), 5.);
  }
  headEyes(d, p, c, .4, .92);
#elif KIND == 1
  // VOLT: head and cloak, big headphones, a bolt-shaped tuft of hair, a jagged halo of flickering bolts
  body = smin(length(p - c) - .4, cloak(p, .22, -.74, .22, .64, 0.), .1);
  // the tuft: a zig-zag spike off the top of the head
  vec3 t0 = c + vec3(.02, .3, .02), t1 = t0 + vec3(.15, .18, 0.), t2 = t1 + vec3(-.16, .1, 0.), t3 = t2 + vec3(.14, .26, 0.);
  float tuft = min(min(sdCapT(p, t0, t1, .1, .07), sdCapT(p, t1, t2, .07, .055)), sdCapT(p, t2, t3, .055, .0));
  body = smin(body, tuft, .05);
  U(d, body, 1.);
  float spark = sdCapT(p, t2, t3, .03, .0);
  if (fract(uTime*3.1) < .35) glowU(d, spark - .005, 4.);
  // headphones: a band over the top and a cup on each side
  vec3 h = p - c;
  float band = max(length(vec2(length(h.xy) - .46, h.z - .02)) - .05, -h.y - .02);
  U(d, band, 6.);
  vec3 cu = vec3(abs(h.x) - .43, h.y + .02, h.z - .02);
  U(d, sdCylY(cu.yxz, .19, .06) - .025, 6.);                                       // the yellow shells
  U(d, sdCylY((cu - vec3(-.07, 0., 0.)).yxz, .16, .03) - .015, 7.);               // the dark cushions against the head
  glowU(d, length(vec2(length(cu.yz) - .1, cu.x - .09)) - .02, 4.);              // a lit ring on each
  // the halo: bolts jumping out of a ring behind the head, flickering
  vec3 q = p - c - vec3(0., 0., .32);
  float rr = .58, n = 12., sec = 6.2831853/n, a = atan(q.y, q.x);
  float id = floor((a + sec*.5)/sec), an = mod(a + sec*.5, sec) - sec*.5, fl = floor(uTime*9.);
  float len = (.12 + .2*hash1(id + fl*3.1))*uEnergy*step(.25, hash1(id*7. + fl));
  vec3 rp = vec3(cos(an)*length(q.xy), sin(an)*length(q.xy), q.z);
  float zig = .06*(hash1(id + fl) - .5);
  float bolt = min(sdCapT(rp, vec3(rr, 0., 0.), vec3(rr + len*.5, zig + .04, 0.), .035, .025), sdCapT(rp, vec3(rr + len*.5, zig + .04, 0.), vec3(rr + len, zig - .03, 0.), .025, .0));
  glowU(d, min(bolt, sdTorZ(q, rr, .025)), 4.);
  headEyes(d, p, c, .4, .92);
#elif KIND == 2
  // BLOOM: head and a cloak with a hem of leaves, a crown of flowers, a halo of turning leaves
  body = smin(length(p - c) - .4, cloak(p, .22, -.74, .22, .64, 1.), .1);
  U(d, body, 1.);
  // the flower crown, round the top of the head, tilted toward us
  vec3 h = p - c - vec3(0., .2, 0.); h.yz = R(-.35) * h.yz;
  for (int k = 0; k < 5; k++) {
    float a = 3.1416 + (float(k) + .5)*.63;   // the front half
    vec3 fc = vec3(cos(a)*.34, .02*sin(float(k)*2.), sin(a)*.3);
    vec3 f = h - fc;
    float petals = 1e5;
    for (int j = 0; j < 5; j++) { float b = float(j)*1.2566 + float(k); petals = min(petals, length(f - vec3(cos(b)*.07, sin(b)*.07, -.01)) - .05); }
    U(d, petals, 6.);
    U(d, length(f - vec3(0., 0., -.03)) - .035, 7.);
  }
  // a little sprout on top
  vec3 s0 = c + vec3(.05, .38, .0), s1 = s0 + vec3(.02, .14, 0.);
  U(d, sdCapT(p, s0, s1, .022, .016), 8.);
  vec3 lf = p - s1; lf.xy = R(.6 + .1*sin(uTime*2.)) * lf.xy;
  U(d, sdEll(lf - vec3(.08, 0., 0.), vec3(.09, .035, .03)), 8.);
  vec3 lf2 = p - s1; lf2.xy = R(-.5 + .1*sin(uTime*2.3)) * lf2.xy;
  U(d, sdEll(lf2 - vec3(-.07, .01, 0.), vec3(.075, .03, .03)), 8.);
  // the halo: leaves circling behind the head
  vec3 q = p - c - vec3(0., 0., .3);
  for (int k = 0; k < 9; k++) {
    float a = float(k)*.698 + uTime*.35;
    vec3 r = q - vec3(cos(a)*.6, sin(a)*.6, 0.); r.xy = R(-a) * r.xy;
    glowU(d, sdEll(r, vec3(.06, .12, .03)), 8.);
  }
  // spores floating up
  for (int k = 0; k < 4; k++) {
    float fk = float(k), ph = fract(uTime*.2 + fk*.25);
    glowU(d, length(p - vec3(sin(fk*2.1 + uTime)*.9, -.6 + ph*2., -.1)) - .035*(1. - ph*.5), 4.);
  }
  headEyes(d, p, c, .4, .92);
#elif KIND == 3
  // TIDE: head and cloak, a captain's tricorne with a gold badge, a ring of water behind the head, bubbles
  body = smin(length(p - c) - .4, cloak(p, .22, -.74, .22, .64, 0.), .1);
  U(d, body, 1.);
  vec3 h = p - c - vec3(0., .27, .02); h.yz = R(-.15) * h.yz;
  float crown = sdEll(h - vec3(0., .12, 0.), vec3(.31, .2, .28));
  vec3 b = h; float a = atan(b.z, b.x), rad = length(b.xz);
  b.y -= .13*pow(.5 + .5*cos(3.*(a + 1.5708)), 2.)*smoothstep(.18, .5, rad);   // three corners turned up
  float brim = sdEll(b, vec3(.6, .05, .54));
  float hat = smin(crown, brim, .03);
  U(d, hat, 7.);
  // the gold trim along the brim, and the anchor badge at the front
  U(d, max(abs(sdEll(b, vec3(.6, .05, .54))) - .014, abs(rad - .54) - .045), 6.);
  vec3 g = h - vec3(0., .1, -.27);
  float hook = max(length(vec2(length(g.xy - vec2(0., .01)) - .055, g.z)) - .016, g.y - .0);   // the anchor's curved foot
  float anchor = min(min(sdCapT(g, vec3(0., .07, 0.), vec3(0., -.05, 0.), .018, .018), sdCapT(g, vec3(-.045, .035, 0.), vec3(.045, .035, 0.), .014, .014)), hook);
  U(d, anchor, 6.);
  // the water ring behind the head: rippling, with drops running round it
  vec3 q = p - c - vec3(0., 0., .32);
  float an = atan(q.y, q.x), R0 = .6 + .03*sin(an*6. + uTime*3.) + .02*sin(an*11. - uTime*4.);
  U(d, sdTorZ(q, R0, .05 + .012*sin(an*5. + uTime*5.)), 4.);
  for (int k = 0; k < 6; k++) {
    float a2 = float(k)*1.047 + uTime*.9;
    glowU(d, length(q - vec3(cos(a2)*.6, sin(a2)*.6, -.02)) - .055, 5.);
  }
  // bubbles rising
  for (int k = 0; k < 3; k++) {
    float fk = float(k), ph = fract(uTime*.22 + fk*.33);
    vec3 bp = p - vec3(.75 + sin(uTime*2. + fk*2.)*.08 - fk*.15, -.6 + ph*1.8, -.1);
    U(d, abs(length(bp) - .06 - .02*fk) - .012, 5.);
  }
  headEyes(d, p, c, .4, .92);
#elif KIND == 4
  // AURUM: an ivory head and cloak (lit, not shadow) with a gold hem, a golden halo above, small feathered wings
  body = smin(length(p - c) - .4, cloak(p, .22, -.74, .22, .64, 0.), .1);
  U(d, body, 6.);
  // the gold trim: a band just above the ragged hem
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(.22 - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(.22 - s.y, 0.), 2.);
  float jag = .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3);
  float trim = max(cloak(p, .22, -.74, .225, .645, 0.) - .006, s.y - (-.74 + jag + .1));
  U(d, trim, 7.);
  // a gold collar where the head meets the cloak
  U(d, length(vec2(length(p.xz) - .26, (p.y - .17)*1.6)) - .045, 7.);
  // the halo, floating over the head and tipped toward us
  vec3 hq = p - c - vec3(0., .52 + .03*sin(uTime*1.6), .04); hq.yz = R(1.25) * hq.yz;
  glowU(d, sdTorZ(hq, .27, .04), 4.);
  // the wings: three feathers each side, fanned out behind the shoulders, beating slowly
  vec3 w = vec3(abs(p.x), p.yz) - vec3(.26, .2, .2);
  float flap = .18*sin(uTime*2.4);
  for (int k = 0; k < 3; k++) {
    float a = .35 + float(k)*.42 + flap*(1. - float(k)*.2);
    vec3 f = w; f.xy = R(-a) * f.xy;
    U(d, sdEll(f - vec3(.25 - float(k)*.03, 0., 0.), vec3(.27 - float(k)*.04, .07, .03)), 8.);
  }
  headEyes(d, p, c, .4, .92);
#else
  // BYTE: a hoodie (the hood up round the head), a glowing visor across the face, an antenna, orbiting bits
  float head = length(p - c) - .38;
  U(d, head, 2.);
  vec3 hh = p - c; hh.z -= (hh.y - .1)*(hh.y - .1)*.2;
  float hood = sdEll(hh - vec3(0., .04, .08), vec3(.5, .52, .5));
  hood = max(hood, -(length(p - c - vec3(0., -.02, -.42)) - .4));   // the opening round the face
  body = smin(hood, cloak(p, .22, -.74, .24, .64, 0.), .1);
  U(d, body, 6.);
  U(d, max(abs(length(p - c - vec3(0., -.02, -.42)) - .4) - .025, hood - .02), 1.);   // the hood's rim
  // the drawstrings
  for (int k = 0; k < 2; k++) {
    float x = k == 0 ? -.12 : .12;
    U(d, sdCapT(p, vec3(x, .2, -.36), vec3(x + .01*sin(uTime*2. + float(k)), -.05, -.4), .018, .018), 5.);
    U(d, length(p - vec3(x + .01*sin(uTime*2. + float(k)), -.07, -.4)) - .03, 5.);
  }
  // the visor: a curved strip of screen across the face
  vec3 v = p - c;
  float visor = max(max(abs(length(v) - .385) - .03, abs(v.y - .01) - .14), v.z + .12);
  glowU(d, visor, 4.);
  // the antenna, poking out of the hood, its light blinking
  vec3 a0 = c + vec3(.16, .44, .06), a1 = a0 + vec3(.1, .2, 0.);
  U(d, sdCapT(p, a0, a1, .02, .014), 5.);
  float blink = step(.5, fract(uTime*1.2));
  glowU(d, length(p - a1) - (.045 + .015*blink), blink > .5 ? 4. : 7.);
  // bits orbiting behind the head
  vec3 q = p - c - vec3(0., 0., .3);
  for (int k = 0; k < 8; k++) {
    float a = float(k)*.785 + uTime*.6;
    vec3 r = q - vec3(cos(a)*.62, sin(a)*.62, 0.); r.xy = R(uTime + float(k)) * r.xy;
    glowU(d, sdBox(r, vec3(k % 3 == 0 ? .055 : .04)), 4.);
  }
  // eyes on the visor
  eyes(d, p, c + vec3(-.15, .01, -.4), c + vec3(.14, .01, -.4), vec3(.08, .1, .06));
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
  else {
    sh = .05 + .2*key + .55*rim*(.4 + .6*back);
    sh += .3*exp(-max(gEye, 0.)*10.);
  }
  o = vec4(clamp(sh, 0., 1.), m/16., t/10., eyeGlow);
}`;

const MOODS = { idle: { id: 0, energy: 1, bob: 1.5, amp: 0.05 }, happy: { id: 1, energy: 1.2, bob: 3.2, amp: 0.07, hop: true }, angry: { id: 2, energy: 1.6, bob: 2.4, amp: 0.035 }, sad: { id: 3, energy: 0.55, bob: 0.9, amp: 0.03, sink: -0.06 }, sleepy: { id: 4, energy: 0.45, bob: 0.7, amp: 0.025, sink: -0.04 } };

// One of them on a canvas, drawn like NovaMate draws NOVA (107 x 113 art px, view 4.79). px: CSS px per art px.
export class PixelKin {
  constructor(host, id, { px = 3, w = 107, h = 113, view = 4.79 } = {}) {
    const K = KINS.find((k) => k.id === id);
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, { width: w * px + "px", height: h * px + "px", imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.canvas.width = w; this.canvas.height = h;
    this.gl = new PixelGL(this.canvas, { model: model(KINS.indexOf(K)), palettes: K.palettes, glow: K.glow, extra: K.extra || ["#cfd6e2", "#ffffff", "#07080c"] });
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
