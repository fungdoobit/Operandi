// DRAFTS, round 3 (Isaac 2026-10-29). Round 1 put trims on six copies of NOVA's dark body; Isaac kept AURUM only. Round 2
// gave each its own creature shape (fox, jellyfish, robot, witch, boulder): "these are NOT it, maybe give it a hood and some
// accessories". So round 3 is AURUM's recipe with a hood: NOVA's little cloaked body, the face a dark void inside a hood with
// her blank glowing eyes, but in coloured cloth (lit, like AURUM's ivory, not her shadow) with one or two big accessories
// that say who they are, and each hood its own shape. Not in the game: a design preview only (index.html here).
//
// Same renderer as NOVA (PixelGL: a 3D shape marched into pixel art with fixed colour ramps, ordered dithering and
// outlines), her lighting, haze and eyes, the same size (view 4.79 on a 107 x 113 canvas, as NovaMate draws her).
//
// Materials (each a ramp of 6 colours, dark to light): 1 shadow (NOVA's rim-lit dark), 2 the face in the hood, 3 eyes,
// 4 element glow, 5 shiny (metal, ice, gold), 6 hood and cloak cloth, 7 8 accents (lit matte).
import { PixelGL } from "../../site/js/pixel/pixel-gl.js";

export const KINS = [
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
    id: "rime", name: "RIME", element: "Frost",
    look: "an ice-blue hood and cloak with thick white fur round the face and along the hem, a fluffy pom-pom on the hood's tip, a snowflake brooch at the collar, two ice shards circling",
    powers: "Ice Shard, Blizzard, Frost Armour (a shield), Absolute Zero",
    palettes: [
      ["#06080e", "#0c121c", "#141e2c", "#1e2c40", "#2a3e58", "#3a5474"],
      ["#020408", "#040810", "#070c18", "#0a1220", "#0e182a", "#121e34"],
      ["#7fc2e6", "#a2d8f4", "#c4eafc", "#e0f6ff", "#f2fbff", "#ffffff"],
      ["#0f3a5c", "#1b6a96", "#2fa0cc", "#5cd0ee", "#a6ecfa", "#e8fcff"],
      ["#123048", "#24587c", "#3d8ab0", "#6cbcda", "#b4e6f4", "#f2fdff"],
      ["#1a3a5a", "#2c5a84", "#4a82ae", "#74aed2", "#a8d4ee", "#e2f4ff"],
      ["#1a3a5a", "#2c5a84", "#4a82ae", "#74aed2", "#a8d4ee", "#e2f4ff"],
      ["#6a7a8a", "#98a6b4", "#c4cfda", "#e2e9f0", "#f4f8fb", "#ffffff"],
    ],
    glow: ["#3d6e96", "#9ccfee", "#effaff", "#1a4a70", "#4a8ac0", "#a8d8f4"],
    extra: ["#cfd6e2", "#ffffff", "#0a1420"],
  },
  {
    id: "spark", name: "SPARK", element: "Storm",
    look: "a navy hood with a tall pointed tip, brass flying goggles pushed up on the brow, a yellow lightning bolt down the cloak, a little storm cloud that follows them about and crackles",
    powers: "Static Shot, Chain Lightning, Thunderhead (the cloud grows over the boss), Overload",
    palettes: [
      ["#4a5262", "#646e82", "#8a94a8", "#aab4c6", "#ccd4e2", "#eef2f8"],
      ["#020306", "#04060c", "#070a14", "#0a0e1c", "#0e1426", "#121a30"],
      ["#b0a060", "#d4c888", "#ece4b4", "#f8f4dc", "#fffcf0", "#ffffff"],
      ["#4a3a00", "#8a6a00", "#c8a000", "#f0d020", "#fff070", "#ffffe0"],
      ["#3a2600", "#6a4a08", "#a07418", "#d4a430", "#f2d068", "#fff2c0"],
      ["#060a18", "#0e1630", "#18244a", "#243668", "#344c8c", "#4a68b0"],
      ["#5a4400", "#94700a", "#cc9e14", "#f0c830", "#ffe680", "#fff8d0"],
      ["#1a0e08", "#2e1a0e", "#4a2c16", "#6a4222", "#8e5c32", "#b47e4a"],
    ],
    glow: ["#6a5e20", "#e8d870", "#fffbe0", "#2a2a10", "#7a6c18", "#e0cc40"],
    extra: ["#cfd6e2", "#ffffff", "#060a14"],
  },
  {
    id: "fern", name: "FERN", element: "Nature",
    look: "a moss-green hood whose tip curls over like a leaf, two little leaves sprouting from the top, a necklace of wooden beads, a leaf-cut hem, a wooden staff floating at their side with a glowing seed in its crook",
    powers: "Thorn Dart, Vine Bind, Seed Burst, Overgrowth",
    palettes: [
      ["#06080a", "#0c1210", "#141e18", "#1e2c22", "#2a3e2e", "#3a543e"],
      ["#020402", "#040804", "#070e08", "#0a140c", "#0e1c10", "#122416"],
      ["#c8b84a", "#dccc68", "#ece08c", "#f6f0b8", "#fbf8dc", "#ffffff"],
      ["#3a4a06", "#6a8010", "#9cb820", "#c8e040", "#eefa8a", "#fcffe0"],
      ["#1a1c22", "#2c3038", "#444a56", "#646c7c", "#929cae", "#cfd6e2"],
      ["#0e2a10", "#1c4a1a", "#2e7028", "#46983a", "#72c254", "#b8ec8c"],
      ["#2a1608", "#4a2a10", "#6e4220", "#94602e", "#b8844a", "#dcb27a"],
      ["#1c4a10", "#2e6e1a", "#46962a", "#68bc3c", "#96dc5a", "#d0f6a0"],
    ],
    glow: ["#6a6a1a", "#d8d870", "#fffce0", "#1a3a10", "#4a8a20", "#a8d860"],
    extra: ["#cfd6e2", "#ffffff", "#081208"],
  },
  {
    id: "shade", name: "SHADE", element: "Shadow",
    look: "a charcoal rogue's hood swept back to a point, a long red scarf wrapped round the neck and pulled up over the face, its ends streaming behind, a belt, a dagger floating at their side",
    powers: "Throwing Knife, Smoke Step (vanishes and strikes from behind), Shadow Clones, Thousand Cuts",
    palettes: [
      ["#06060a", "#0c0c12", "#14141c", "#1e1e28", "#2a2a36", "#3a3a4a"],
      ["#020204", "#040408", "#07070c", "#0a0a12", "#0e0e18", "#12121e"],
      ["#c86a2a", "#e08a3a", "#f2ac5a", "#fcd08a", "#fff0c8", "#ffffff"],
      ["#3a0a12", "#6e1422", "#a82434", "#d8444a", "#f27a70", "#ffc0b0"],
      ["#1a1c22", "#2c3038", "#444a56", "#646c7c", "#929cae", "#e6ecf6"],
      ["#141418", "#22222a", "#34343e", "#484856", "#626274", "#848498"],
      ["#3a0a12", "#6e1422", "#a82434", "#d8444a", "#f27a70", "#ffc0b0"],
      ["#1a0e08", "#2e1a0e", "#4a2c16", "#6a4222", "#8e5c32", "#b47e4a"],
    ],
    glow: ["#7a3a10", "#e8903a", "#fff0c8", "#1a1420", "#3a2e44", "#6a5a78"],
    extra: ["#cfd6e2", "#ffffff", "#08080c"],
  },
  {
    id: "mochi", name: "MOCHI", element: "Fortune",
    look: "a cream cat-eared hood with pink insides and a ginger patch, a red collar with a gold bell, a cat's tail curling out from under the cloak, a lucky gold coin floating and turning beside them",
    powers: "Coin Toss, Lucky Paw (the next hit is a sure crit), Nine Lives (a shield), Jackpot",
    palettes: [
      ["#06060a", "#0c0c12", "#14141c", "#1e1e28", "#2a2a36", "#3a3a4a"],
      ["#040306", "#08060c", "#0e0a14", "#140e1c", "#1a1426", "#221a30"],
      ["#6ab040", "#8ad25a", "#b0ec80", "#d4fab0", "#eeffd8", "#ffffff"],
      ["#5a3c00", "#9a6c06", "#d4a01a", "#f6cc4a", "#fff09a", "#fffde8"],
      ["#4a3000", "#7e5808", "#b88a1a", "#e2b83a", "#fade7a", "#fff8d0"],
      ["#5a4a3c", "#8a7460", "#b8a084", "#dcc8aa", "#f2e4cc", "#fffaf0"],
      ["#4a0a1a", "#7e1430", "#b42444", "#e04460", "#f6809a", "#ffc4d0"],
      ["#4a1e06", "#7e3a10", "#b45e1e", "#e08838", "#f6b46a", "#ffe0b4"],
    ],
    glow: ["#3a6a1a", "#9ae05a", "#efffd8", "#5a3c08", "#c89a30", "#f6dc80"],
    extra: ["#cfd6e2", "#ffffff", "#1a120a"],
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


// ---- the hood (round 3) ----
// A hood round the head at c (radius r): a rounded shell a little bigger than the head, open at the front round the face;
// gRim is the band round the opening (for a trim).
float gRim;
float hoodB(vec3 p, vec3 c, float r){
  vec3 q = p - c;
  float outer = sdEll(q - vec3(0., .04, .06), vec3(r*1.2, r*1.18, r*1.2));
  float open = length(q - vec3(0., -.04, -r*1.05)) - r*.8;
  gRim = max(abs(open) - .03, outer - .025);
  return max(outer, -open);
}
// A band of the cloak just above its ragged hem, h tall (a fur or gold trim).
float hemBand(vec3 p, float top, float bot, float r0, float r1, float h){
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(top - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(top - s.y, 0.), 2.);
  float jag = .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3);
  return max(cloak(p, top, bot, r0 + .006, r1 + .006, 0.) - .006, s.y - (bot + jag + h));
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
#elif KIND == 1
  // RIME: an ice-blue hood with white fur round the face and the hem, a pom-pom on the tip, a snowflake brooch, ice shards
  c = vec3(0., .48, 0.);
  U(d, length(p - c) - .43, 2.);   // the face fills the hood's opening, dark
  float hood = hoodB(p, c, .4), rim = gRim;
  float tip = sdCapT(p, c + vec3(0., .3, .2), c + vec3(-.1 + .02*sin(uTime*1.3), .5, .42), .17, .07);
  U(d, smin(smin(hood, tip, .08), cloak(p, .2, -.76, .24, .64, 0.), .08), 6.);
  float fz = (fbm(p*14.) - .5)*.035;
  U(d, rim + .004 + fz, 8.);                                                     // fur round the face
  U(d, hemBand(p, .2, -.76, .24, .64, .1) + fz, 8.);                              // fur along the hem
  U(d, length(p - (c + vec3(-.12 + .02*sin(uTime*1.3), .55, .46))) - .1 + fz*1.5, 8.);   // the pom-pom
  // the snowflake brooch, turning slowly
  vec3 b = p - vec3(0., .19, -.27); b.xy = R(uTime*.4) * b.xy;
  float flake = 1e5;
  for (int k = 0; k < 3; k++) { vec3 bb = b; bb.xy = R(float(k)*1.0472) * bb.xy; flake = min(flake, sdBox(bb, vec3(.075, .013, .016))); }
  glowU(d, flake, 5.);
  // two ice shards circling
  for (int k = 0; k < 2; k++) {
    float a = uTime*.8 + float(k)*3.1416;
    vec3 q = p - vec3(cos(a)*.78, .1 + .12*sin(a*1.3), sin(a)*.45); q.xy = R(uTime*1.2 + float(k)) * q.xy;
    glowU(d, sdOct(q*vec3(1.6, .7, 1.6), .1)*.6, 5.);
  }
  headEyes(d, p, c, .38, .86);
#elif KIND == 2
  // SPARK: a navy hood with a tall tip, goggles on the brow, a lightning bolt down the cloak, a little storm cloud
  c = vec3(0., .48, 0.);
  U(d, length(p - c) - .43, 2.);   // the face fills the hood's opening, dark
  float hood = hoodB(p, c, .4);
  vec3 t0 = c + vec3(0., .3, .16), t1 = t0 + vec3(.04, .26, .12), t2 = t1 + vec3(.16 + .03*sin(uTime*1.5), .12, .1);
  float tip = min(sdCapT(p, t0, t1, .2, .1), sdCapT(p, t1, t2, .1, .02));
  float cl = cloak(p, .2, -.76, .24, .64, 0.);
  U(d, smin(smin(hood, tip, .08), cl, .08), 6.);
  // the lightning bolt down the front
  float zx = .1*(abs(fract(p.y*1.8 + .25)*2. - 1.)*2. - 1.);
  U(d, max(max(cl - .014, abs(p.x - zx) - .05), max(p.y - .14, p.z + .02)), 7.);
  // goggles pushed up on the brow: a leather strap round the hood, brass rims, amber lenses
  vec3 gq = p - c - vec3(0., .23, 0.);
  U(d, max(length(vec2(length(gq.xz) - .44, gq.y*1.4)) - .028, gq.z - .1), 8.);
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1. : 1.;
    vec3 l = p - c - vec3(.13*sx, .24, -.37); l.yz = R(-.45) * l.yz;
    U(d, sdTorZ(l, .08, .026), 5.);
    glowU(d, sdEll(l, vec3(.075, .075, .025)), 4.);
  }
  // the storm cloud, bobbing beside them, a bolt flickering under it now and then
  vec3 cq = p - vec3(-.66, .82 + .04*sin(uTime*1.4), .05);
  float cloud = min(min(length(cq - vec3(-.14, 0., 0.)) - .12, length(cq - vec3(.0, .06, 0.)) - .16), length(cq - vec3(.15, -.01, 0.)) - .12);
  cloud = max(smin(cloud, sdEll(cq - vec3(0., -.06, 0.), vec3(.28, .06, .12)), .05), -cq.y - .09);
  U(d, cloud, 1.);
  if (fract(uTime*.6) < .14) {
    vec3 z0 = vec3(.02, -.1, 0.), z1 = vec3(-.05, -.2, 0.), z2 = vec3(.03, -.26, 0.), z3 = vec3(-.03, -.4, 0.);
    glowU(d, min(min(sdCapT(cq, z0, z1, .022, .018), sdCapT(cq, z1, z2, .018, .016)), sdCapT(cq, z2, z3, .016, .0)), 4.);
  }
  headEyes(d, p, c, .38, .86);
#elif KIND == 3
  // FERN: a moss-green hood with a tip curled like a leaf, two leaves on top, wooden beads, a leaf hem, a floating staff
  c = vec3(0., .48, 0.);
  U(d, length(p - c) - .43, 2.);   // the face fills the hood's opening, dark
  float hood = hoodB(p, c, .4);
  vec3 t0 = c + vec3(0., .3, .2), t1 = t0 + vec3(.04, .18, .22), t2 = t1 + vec3(.06, -.14 + .02*sin(uTime*1.6), .14);
  float tip = min(sdCapT(p, t0, t1, .18, .09), sdCapT(p, t1, t2, .09, .02));
  U(d, smin(smin(hood, tip, .08), cloak(p, .2, -.76, .24, .64, 1.), .08), 6.);
  // two little leaves sprouting from the top of the hood
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1. : 1.;
    vec3 lf = p - c - vec3(.12*sx, .45, .04); lf.xy = R(sx*(.65 + .1*sin(uTime*2. + sx))) * lf.xy;
    U(d, sdEll(lf - vec3(0., .1, 0.), vec3(.055, .12, .025)), 8.);
  }
  // a necklace of wooden beads hanging over the collar
  for (int k = 0; k < 9; k++) {
    float f = float(k)/8., x = (f - .5)*.42, y = .16 - .09*sin(f*3.1416);
    float z = -.25*sqrt(max(0., 1. - (x/.3)*(x/.3))) - .02;
    U(d, length(p - vec3(x, y, z)) - (k == 4 ? .05 : .034), 7.);
  }
  // the staff, floating at their side, a glowing seed held in the ring at its top
  vec3 sq = p - vec3(.66, -.05 + .04*sin(uTime*1.4), -.06); sq.xy = R(.08*sin(uTime*1.1)) * sq.xy;
  float staff = sdCapT(sq, vec3(0., -.6, 0.), vec3(0., .5, 0.), .03, .036);
  staff = min(staff, sdTorZ(sq - vec3(0., .6, 0.), .085, .03));
  U(d, staff, 7.);
  glowU(d, length(sq - vec3(0., .6, 0.)) - .05 - .008*sin(uTime*4.), 4.);
  for (int k = 0; k < 2; k++) {
    vec3 lf = sq - vec3(0., .2 - float(k)*.25, 0.); lf.xy = R(k == 0 ? -.9 : .9) * lf.xy;
    U(d, sdEll(lf - vec3(0., .08, 0.), vec3(.035, .08, .02)), 8.);
  }
  headEyes(d, p, c, .38, .86);
#elif KIND == 4
  // SHADE: a rogue's hood swept back, a red scarf round the neck and over the face, its ends streaming, daggers on the back
  c = vec3(0., .48, 0.);
  U(d, length(p - c) - .43, 2.);   // the face fills the hood's opening, dark
  float hood = hoodB(p, c, .4);
  float tip = sdCapT(p, c + vec3(0., .26, .24), c + vec3(.05, .38, .54), .17, .02);
  U(d, smin(smin(hood, tip, .08), cloak(p, .2, -.76, .24, .64, 0.), .08), 6.);
  // the scarf: round the neck and up over the lower face (below the eyes), two ends streaming out behind
  vec3 n = p - vec3(0., .2, 0.);
  float neck = length(vec2(length(n.xz) - .28, n.y*1.2)) - .09;
  float mask = max(max(abs(length(p - c) - .395) - .035, p.y - c.y + .05), p.z - c.z + .14);
  float sc = min(neck, mask);
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? 1. : .55, ph = float(k)*1.7;
    vec3 prev = vec3(.12, .2, .26);
    for (int j = 1; j <= 4; j++) {
      float w = float(j)/4.;
      vec3 nx = vec3(.12 + .5*w*sx, .2 - .16*w*w + .06*sin(uTime*6. - w*5. + ph)*w, .26 + .3*w);
      sc = min(sc, sdCapT(p, prev, nx, .07 - .02*w, .065 - .02*w));
      prev = nx;
    }
  }
  U(d, sc, 7.);
  // a belt round the waist, and a dagger floating at their side, point down, turning a little and glinting
  U(d, max(length(vec2(length(p.xz*vec2(1., 1.3)) - .36, (p.y + .2)*2.2)) - .05, -1.), 8.);
  U(d, sdBox(p - vec3(0., -.2, -.34), vec3(.06, .05, .02)), 5.);
  vec3 dq = p - vec3(.64, .02 + .05*sin(uTime*1.5), -.06); dq.xy = R(.12*sin(uTime*1.1)) * dq.xy; dq.xz = R(.4 + .3*sin(uTime*.9)) * dq.xz;
  U(d, sdCapT(dq*vec3(1., 1., 2.5), vec3(0., .02, 0.), vec3(0., -.52, 0.), .075, .004)/2.5, 5.);   // the blade
  U(d, sdBox(dq - vec3(0., .05, 0.), vec3(.12, .025, .035)), 5.);                 // the guard
  U(d, sdCapT(dq, vec3(0., .07, 0.), vec3(0., .3, 0.), .038, .038), 8.);          // the grip
  U(d, length(dq - vec3(0., .34, 0.)) - .05, 7.);                                  // a red pommel
  eyes(d, p, c + vec3(-.15, .07, -.33), c + vec3(.14, .07, -.33), vec3(.085, .1, .06));
#else
  // MOCHI: a cream cat-eared hood with a ginger patch, a red collar and gold bell, a cat's tail, a lucky coin
  c = vec3(0., .48, 0.);
  U(d, length(p - c) - .43, 2.);   // the face fills the hood's opening, dark
  float hood = hoodB(p, c, .4);
  vec3 e = vec3(abs(p.x), p.yz) - c;
  float tw = .02*sin(uTime*2. + step(0., p.x)*2.);
  float ear = sdCapT(e, vec3(.2, .3, .02), vec3(.33 + tw, .62, .06), .15, .0);
  float cl = cloak(p, .2, -.76, .24, .64, 0.);
  float cloth = smin(smin(hood, ear, .05), cl, .08);
  U(d, cloth, 6.);
  U(d, max(cloth - .004, length(p - (c + vec3(-.3, .3, -.05))) - .2), 8.);        // a ginger patch over one ear
  U(d, sdCapT(e - vec3(0., 0., -.07), vec3(.21, .34, .0), vec3(.32 + tw, .56, .03), .08, .0), 7.);   // pink inside the ears
  // the tail, curling up from under the cloak behind them; ginger at the tip
  vec3 P0 = vec3(.0, -.5, .3), P1 = vec3(.32, -.6, .4), P2 = vec3(.58, -.36, .42), P3 = vec3(.6 + .04*sin(uTime*1.8), -.04, .4), P4 = vec3(.46 + .06*sin(uTime*1.8), .12, .38);
  float tail = min(min(sdCapT(p, P0, P1, .07, .075), sdCapT(p, P1, P2, .075, .075)), sdCapT(p, P2, P3, .075, .07));
  U(d, tail, 6.);
  U(d, sdCapT(p, P3, P4, .07, .05), 8.);
  // the collar and its bell
  vec3 n = p - vec3(0., .19, 0.);
  U(d, length(vec2(length(n.xz) - .27, n.y*1.3)) - .045, 7.);
  U(d, length(p - vec3(0., .11, -.31)) - .065, 5.);
  // the lucky coin, floating and turning
  vec3 cq = p - vec3(.64, .26 + .05*sin(uTime*1.7), -.05); cq.xz = R(uTime*1.6) * cq.xz;
  glowU(d, sdEll(cq, vec3(.1, .14, .025)), 5.);
  headEyes(d, p, c, .38, .86);
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
