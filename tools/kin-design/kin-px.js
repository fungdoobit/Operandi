// DRAFTS, round 2 (Isaac 2026-10-29). Round 1 was six of NOVA's own body with new trims; Isaac kept AURUM and dropped the
// rest: "it doesn't have to be exactly the same, just consistent in style and art style". So these have their own shapes:
// a spirit fox, a jellyfish, a clockwork robot, a little witch and a mossy boulder, with AURUM. Not in the game: a design
// preview only (index.html here).
//
// What keeps them one family with NOVA: the same renderer (PixelGL: a 3D shape marched into pixel art with fixed colour
// ramps, ordered dithering and outlines), her lighting and her haze, her blank glowing eyes that change with mood, the same
// size (view 4.79 on a 107 x 113 canvas, as NovaMate draws her), floating, never standing.
//
// Materials (each a ramp of 6 colours, dark to light): 1 shadow body (NOVA's moody rim-lit shading), 2 deep shadow, 3 eyes,
// 4 element glow, 5 shiny (metal, crystal), 6 7 8 lit matte (fur, cloth, stone, moss...).
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
    id: "kitsu", name: "KITSU", element: "Spirit fire",
    look: "a white spirit fox: pointed ears with pink insides, a little snout, red marks on the forehead, three big fluffy tails fanned out behind, each tipped with blue spirit fire; two wisps of blue flame drift round them",
    powers: "Foxfire, Wisp Swarm, Nine-Tail Fan, Spirit Blaze",
    palettes: [
      ["#06060c", "#0e0e1a", "#181828", "#24243a", "#363652", "#4c4c70"],
      ["#06060a", "#0c0c12", "#14141c", "#1c1c26", "#262632", "#303040"],
      ["#0a1030", "#101a48", "#16245e", "#1e3078", "#283e94", "#3450b0"],
      ["#0c2a6a", "#1a4aa8", "#2c74dc", "#5aa6f6", "#a2d4ff", "#effaff"],
      ["#1a1c22", "#2c3038", "#444a56", "#646c7c", "#929cae", "#cfd6e2"],
      ["#6a6878", "#9a98aa", "#c6c4d4", "#e4e2ee", "#f6f4fc", "#ffffff"],
      ["#5a2a3a", "#8a4458", "#b8647a", "#de8ea0", "#f4bccb", "#ffe6ee"],
      ["#4a0a10", "#7a1420", "#b02432", "#de4048", "#f47870", "#ffb0a0"],
    ],
    glow: ["#2a3a8a", "#6a8ae0", "#c8d8ff", "#1a3a8a", "#3a72d8", "#8cc0ff"],
    extra: ["#cfd6e2", "#ffffff", "#141428"],
  },
  {
    id: "luma", name: "LUMA", element: "Deep sea",
    look: "a jellyfish: a pale pink bell that pulses as it swims, a frilled magenta rim, two ribbon arms and glowing cyan tentacles trailing below",
    powers: "Sting, Glow Pulse (blinds the boss), Tangle, Abyssal Bloom (a swarm of jellies lights up the stage)",
    palettes: [
      ["#06040c", "#0e0a1a", "#181028", "#24183c", "#382558", "#583a88"],
      ["#140a2a", "#200f40", "#2c1656", "#3a1e6e", "#4a2888", "#5c34a2"],
      ["#140a2a", "#200f40", "#2c1656", "#3a1e6e", "#4a2888", "#5c34a2"],
      ["#0a3a5a", "#16649a", "#2a9ad0", "#5ccaf0", "#a8ecff", "#effcff"],
      ["#1a1c22", "#2c3038", "#444a56", "#646c7c", "#929cae", "#cfd6e2"],
      ["#4a3050", "#7a4e80", "#a874ae", "#d09ed4", "#ecc8ee", "#fff0ff"],
      ["#3a0a3a", "#6a1866", "#9a2a90", "#c84cb8", "#e88ad8", "#ffd0f6"],
      ["#5a3c66", "#8a62a0", "#b88ed0", "#dcb8f0", "#f2dcff", "#ffffff"],
    ],
    glow: ["#3a2a6a", "#8a6ad0", "#e0d0ff", "#4a1a5a", "#a04ab0", "#f0a0f0"],
    extra: ["#cfd6e2", "#ffffff", "#1a0a22"],
  },
  {
    id: "tink", name: "TINK", element: "Clockwork",
    look: "a little brass robot: a round polished body with a copper belt of rivets, a dark glass face with glowing cyan eyes, a spinning propeller on top, a wind-up key turning in its back, stubby arms, a small jet of flame underneath",
    powers: "Rivet Shot, Gear Saw, Overclock (strikes twice), Wind-Up (winds its key all the way and lets everything go)",
    palettes: [
      ["#06060a", "#0e0e14", "#18181e", "#24242c", "#34343e", "#484856"],
      ["#04080c", "#081018", "#0e1824", "#142232", "#1c2e42", "#263c56"],
      ["#2a7a8a", "#40a6b8", "#6ad0de", "#a0eef6", "#d4fcff", "#ffffff"],
      ["#5a1a00", "#a03a00", "#e06a10", "#ffa030", "#ffd880", "#fffbe0"],
      ["#2a1806", "#5a3410", "#8e5a1c", "#c48a30", "#ecc060", "#fff2c0"],
      ["#4a3000", "#7e5808", "#b88a1a", "#e2b83a", "#fade7a", "#fff8d0"],
      ["#2a0e06", "#4e1c0c", "#7a3016", "#a84a24", "#d4744a", "#f4b08a"],
      ["#3a0a0a", "#6a1414", "#a02222", "#d23c34", "#f2705e", "#ffb4a0"],
    ],
    glow: ["#1a6a7a", "#5ad0e0", "#e0ffff", "#6a3a08", "#c87a20", "#ffc860"],
    extra: ["#cfd6e2", "#ffffff", "#1a0e04"],
  },
  {
    id: "hex", name: "HEX", element: "Hexcraft",
    look: "a little witch: a huge crooked hat (deep purple, an orange band and a gold buckle) over a shadowed face with glowing green eyes, a short ragged robe, a lantern of green witch-fire floating beside them",
    powers: "Hex Bolt, Curse (the boss's next hit is weaker), Lantern Swarm, Cauldron Storm",
    palettes: [
      ["#04070a", "#081014", "#0e1a20", "#16282e", "#203a40", "#2e5258"],
      ["#020406", "#04080c", "#081014", "#0c181e", "#122228", "#182c34"],
      ["#6ab040", "#8ad25a", "#b0ec80", "#d4fab0", "#eeffd8", "#ffffff"],
      ["#1a3a06", "#2e6a0c", "#4c9c16", "#7cce2a", "#b8f26a", "#f0ffd0"],
      ["#3a2600", "#6a4a08", "#a07418", "#d4a430", "#f2d068", "#fff2c0"],
      ["#4a1c00", "#7e3400", "#b45410", "#e07a28", "#f6a85a", "#ffd8a8"],
      ["#140a22", "#22123a", "#341c54", "#4a2a72", "#643c94", "#8656b8"],
      ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
    ],
    glow: ["#3a6a1a", "#9ae05a", "#efffd8", "#1a3a10", "#3c8a1e", "#9ade5a"],
  },
  {
    id: "pebble", name: "PEBBLE", element: "Earth",
    look: "a round mossy boulder with a pink flower on top, glowing amber eyes in a dark crack of a face, teal crystals growing from the back, two floating rock fists and little pebbles circling underneath",
    powers: "Rock Toss, Crystal Spike, Landslide, Mountain (rises up into a giant for one huge slam)",
    palettes: [
      ["#08080a", "#121216", "#1e1e24", "#2c2c34", "#3e3e48", "#56565e"],
      ["#08060a", "#100c10", "#18121a", "#201a22", "#2a222c", "#342a36"],
      ["#a06a10", "#c88a20", "#e6ae3a", "#f6d070", "#fff0b0", "#ffffff"],
      ["#06343a", "#0c5a64", "#14868e", "#2eb8ba", "#7ae4e0", "#dafff8"],
      ["#06343a", "#0c5a64", "#14868e", "#2eb8ba", "#7ae4e0", "#dafff8"],
      ["#4a1030", "#7a1e50", "#ae3474", "#d85a98", "#f096c0", "#ffd6ea"],
      ["#1e1a18", "#3a3430", "#5a524a", "#7c7268", "#a29888", "#cec4b2"],
      ["#0e2208", "#1c3a10", "#2e5a1a", "#467e26", "#68a838", "#9cd45a"],
    ],
    glow: ["#7a5010", "#e0a840", "#fff2c8", "#0c3a3a", "#1e8080", "#6ad6cc"],
    extra: ["#cfd6e2", "#ffffff", "#100c0a"],
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
  // KITSU: a white spirit fox. Head with a snout, cheek fluff and pointed ears; a small round body with two paws; three
  // fluffy tails fanned out behind, tipped with blue spirit fire; two wisps of it drifting round.
  c = vec3(0., .44, 0.);
  vec3 hq = p - c;
  float fur = sdEll(hq, vec3(.4, .34, .36));
  fur = smin(fur, sdEll(hq - vec3(0., -.1, -.26), vec3(.17, .12, .2)), .08);                       // the snout
  fur = smin(fur, sdEll(vec3(abs(hq.x), hq.yz) - vec3(.34, -.14, -.02), vec3(.12, .09, .1)), .06); // cheek fluff
  vec3 e = vec3(abs(hq.x), hq.yz);
  float tw = .02*sin(uTime*2. + step(0., hq.x)*2.);   // the ears twitch, each on its own
  float ear = sdCapT(e, vec3(.19, .2, .04), vec3(.33 + tw, .62, .1), .16, .0);
  fur = smin(fur, ear, .05);
  vec3 sb = p; sb.x += uSway*max(-sb.y, 0.);
  fur = smin(fur, sdEll(sb - vec3(0., -.14, .06), vec3(.27, .29, .25)), .1);                       // the body
  fur = smin(fur, length(vec3(abs(sb.x), sb.yz) - vec3(.12, -.4, -.1)) - .08, .06);               // the paws
  // the three tails: out behind the body and curling up, swaying, each its own
  float tails = 1e5, fire = 1e5;
  for (int k = 0; k < 3; k++) {
    float sx = k == 0 ? -1. : k == 1 ? 1. : .3, sp = k == 2 ? .7 : 1., ph = float(k)*1.9;
    float sw = .07*sin(uTime*1.4 + ph);
    vec3 P0 = vec3(.0, -.34, .3), P1 = vec3(.38*sx*sp, -.46, .36), P2 = vec3((.82 + sw)*sx*sp, -.2, .4),
         P3 = vec3((.98 + sw*1.5)*sx*sp, .24 + (k == 2 ? .36 : 0.), .38), P4 = vec3((.9 + sw*2.)*sx*sp, .6 + (k == 2 ? .36 : 0.), .36);
    float t = smin(smin(sdCapT(p, P0, P1, .06, .17), sdCapT(p, P1, P2, .17, .26), .05), smin(sdCapT(p, P2, P3, .26, .21), sdCapT(p, P3, P4, .21, .1), .05), .05);   // bushy: thickest in the middle
    t += (fbm(p*7. + float(k)*3.) - .5)*.09;   // fluffy
    tails = min(tails, t);
    vec3 dir = normalize(P4 - P3); float kk = clamp(dot(p - P4, dir)/.34, 0., 1.);
    vec3 fp = p; fp.x += sin(kk*6. - uTime*7. + ph)*.04*kk;   // the flame licks side to side towards its tip
    float fl = sdCapT(fp, P4 - dir*.1, P4 + dir*(.42 + .08*sin(uTime*9. + ph)), .17, .0);
    fire = min(fire, fl + (fbm(p*9. + vec3(0., -uTime*3., ph)) - .5)*.06);
  }
  fur = smin(fur, tails, .04);
  U(d, fur, 6.);
  glowU(d, fire, 4.);
  // pink insides of the ears, a dark nose, red marks on the forehead
  U(d, sdCapT(e - vec3(0., 0., -.07), vec3(.21, .26, .02), vec3(.32 + tw, .54, .06), .085, .0), 7.);
  U(d, length(hq - vec3(0., -.07, -.46)) - .045, 2.);
  U(d, sdEll(vec3(abs(hq.x), hq.yz) - vec3(.1, .21, -.27), vec3(.045, .08, .03)), 8.);
  // two wisps of spirit fire drifting round them
  for (int k = 0; k < 2; k++) {
    float a = uTime*.9 + float(k)*3.14159;
    vec3 w = p - vec3(cos(a)*.86, .3 + .15*sin(a*1.7), sin(a)*.4);
    glowU(d, sdCapT(w, vec3(0., -.04, 0.), vec3(.02*sin(uTime*8.), .12, 0.), .06, .0), 4.);
  }
  eyes(d, p, c + vec3(-.16, .06, -.32), c + vec3(.15, .06, -.32), vec3(.075, .12, .05));
#elif KIND == 2
  // LUMA: a jellyfish. A bell that pulses as it swims (a shell: hollow underneath), a frilled rim, two ribbon arms and
  // glowing tentacles trailing below, swaying.
  float pulse = sin(uTime*2.2);
  vec3 b = p - vec3(0., .44, 0.);
  b.y *= 1. + .08*pulse; b.xz *= 1. - .05*pulse;
  float an = atan(b.z, b.x);
  float bell = sdEll(b, vec3(.56, .46, .52));
  bell = max(bell, (-.04 + .04*sin(an*9. + uTime*2.)) - b.y);           // open underneath, a wavy edge
  bell = max(bell, -sdEll(b - vec3(0., -.14, 0.), vec3(.47, .36, .43)));
  U(d, bell, sin(an*6.) > .78 && b.y > .06 ? 8. : 6.);                     // pale ribs down the bell
  vec3 rq = b - vec3(0., -.02 + .03*sin(an*9. + uTime*2.), 0.);
  U(d, length(vec2(length(rq.xz) - .5 - .02*sin(an*14. + uTime*3.), rq.y)) - .05, 7.);   // the frill
  // two frilly ribbon arms from under the bell
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1. : 1., ph = float(k)*2.;
    float arm = 1e5; vec3 prev = vec3(.06*sx, .2, -.02);
    for (int j = 1; j <= 5; j++) {
      float w = float(j)/5.;
      vec3 nx = vec3(.08*sx + .09*sin(w*5. - uTime*2.5 + ph)*w, .2 - .85*w, -.02 + .04*sin(w*4. + uTime));
      arm = smin(arm, sdCapT(p, prev, nx, .07 - .03*w, .065 - .03*w) + .015*sin(w*30. + uTime*4.), .04);
      prev = nx;
    }
    U(d, arm, 7.);
  }
  // the glowing tentacles round the rim, trailing down and swaying
  for (int k = 0; k < 6; k++) {
    float a = float(k)*1.047 + .5, ph = float(k)*1.3;
    vec3 prev = vec3(cos(a)*.4, .42, sin(a)*.37); float tt = 1e5;
    for (int j = 1; j <= 5; j++) {
      float w = float(j)/5.;
      vec3 nx = vec3(cos(a)*(.4 - .1*w) + .1*sin(w*4. - uTime*2. + ph)*w, .42 - 1.25*w, sin(a)*(.37 - .1*w));
      tt = min(tt, sdCapT(p, prev, nx, .026, .018));
      prev = nx;
    }
    glowU(d, tt, 4.);
  }
  eyes(d, p, vec3(-.17, .46, -.47), vec3(.17, .46, -.47), vec3(.09, .14, .08));
#elif KIND == 3
  // TINK: a little brass robot. A round polished body with a copper belt of rivets, a dark glass face, a spinning
  // propeller on top, a wind-up key turning in its back, stubby arms, a small jet of flame underneath.
  c = vec3(0., .26, 0.);
  vec3 q = p - c;
  U(d, sdEll(q, vec3(.46, .44, .44)), 5.);
  // the belt, and its rivets
  U(d, length(vec2(length(q.xz) - .455, q.y + .06)) - .035, 7.);
  for (int k = 0; k < 12; k++) {
    float a = float(k)*.5236 + .26;
    U(d, length(q - vec3(cos(a)*.48, -.06, sin(a)*.48)) - .03, 6.);
  }
  // the face: a dark glass disc with a copper rim
  U(d, sdCylY(vec3(q.x, q.z + .4, q.y - .1), .25, .04) - .01, 2.);
  U(d, sdTorZ(q - vec3(0., .1, -.43), .26, .028), 7.);
  // the propeller: a cap, a stem and two spinning blades
  U(d, sdCylY(q - vec3(0., .45, 0.), .07, .04) - .01, 7.);
  U(d, sdCapT(q, vec3(0., .47, 0.), vec3(0., .6, 0.), .02, .02), 7.);
  vec3 pr = q - vec3(0., .62, 0.); pr.xz = R(uTime*14.) * pr.xz;
  U(d, sdEll(pr, vec3(.24, .03, .07)), 8.);
  // the wind-up key in its back, turning
  U(d, sdCapT(q, vec3(.0, .05, .38), vec3(.0, .05, .58), .03, .03), 6.);
  vec3 kq = q - vec3(0., .05, .62); kq.xy = R(uTime*1.3) * kq.xy;
  U(d, min(sdTorZ(kq - vec3(.1, 0., 0.), .08, .026), sdTorZ(kq + vec3(.1, 0., 0.), .08, .026)), 6.);
  // stubby arms with ball hands, bobbing
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1. : 1.;
    vec3 hand = vec3(.62*sx, -.12 + .05*sin(uTime*3. + sx), -.06);
    U(d, sdCapT(q, vec3(.4*sx, .02, 0.), hand, .05, .045), 7.);
    U(d, length(q - hand) - .085, 5.);
  }
  // a nozzle underneath and a flickering jet
  U(d, sdCapT(q, vec3(0., -.38, 0.), vec3(0., -.5, 0.), .1, .07), 7.);
  float fl = .06*sin(uTime*23.) + .04*sin(uTime*37.);
  glowU(d, sdCapT(q, vec3(0., -.52, 0.), vec3(0., -.78 - fl, 0.), .075, .0), 4.);
  eyes(d, p, c + vec3(-.1, .11, -.45), c + vec3(.1, .11, -.45), vec3(.065, .095, .04));
#elif KIND == 4
  // HEX: a little witch. A huge crooked hat over a shadowed face with glowing eyes, a short ragged robe, a lantern of
  // witch-fire floating beside them.
  c = vec3(0., .34, 0.);
  body = smin(length(p - c) - .35, cloak(p, .1, -.78, .2, .6, 0.), .1);
  U(d, body, 1.);
  // the hat: a wide wavy brim tipped toward us, and a tall cone that bends over at the top
  vec3 h = p - c - vec3(0., .2, 0.); h.yz = R(-.14) * h.yz;
  float ha = atan(h.z, h.x);
  vec3 hb = h; hb.y += .035*sin(ha*3. + uTime*.8)*smoothstep(.3, .62, length(h.xz));
  float brim = sdEll(hb, vec3(.68, .045, .62));
  vec3 a0 = c + vec3(0., .22, .02), a1 = a0 + vec3(.02, .36, .04), a2 = a1 + vec3(.12 + .03*sin(uTime*1.3), .25, .06),
       a3 = a2 + vec3(.26 + .04*sin(uTime*1.3 + .5), -.06, .04);
  float cone = min(min(sdCapT(p, a0, a1, .33, .2), sdCapT(p, a1, a2, .2, .1)), sdCapT(p, a2, a3, .1, .016));
  U(d, smin(brim, cone, .04), 7.);
  // the band and its buckle
  U(d, max(abs(p.y - a0.y - .07) - .045, sdCapT(p, a0, a1, .345, .21)), 6.);
  U(d, sdBox(p - vec3(0., a0.y + .07, -.33), vec3(.065, .05, .025)), 5.);
  // the lantern, floating at their side, swinging a little
  vec3 lq = p - vec3(.64, -.05 + .05*sin(uTime*1.6), -.08); lq.xy = R(.15*sin(uTime*1.2)) * lq.xy;
  float lan = sdEll(lq - vec3(0., .16, 0.), vec3(.12, .05, .12));                 // the cap
  lan = min(lan, sdBox(lq - vec3(0., -.15, 0.), vec3(.11, .02, .11)));            // the base
  for (int k = 0; k < 4; k++) {
    vec2 cn = vec2(k < 2 ? -.09 : .09, k % 2 == 0 ? -.09 : .09);
    lan = min(lan, sdCapT(lq, vec3(cn.x, -.14, cn.y), vec3(cn.x, .14, cn.y), .018, .018));
  }
  lan = min(lan, sdTorZ(lq - vec3(0., .24, 0.), .06, .016));                      // the ring on top
  U(d, lan, 5.);
  glowU(d, sdEll(lq - vec3(0., -.03 + .01*sin(uTime*11.), 0.), vec3(.05, .09 + .015*sin(uTime*13.), .05)), 4.);
  // a few sparks of witch-fire drifting up off the hat
  for (int k = 0; k < 3; k++) {
    float fk = float(k), ph = fract(uTime*.3 + fk*.33);
    glowU(d, length(p - (a3 + vec3(.06*sin(fk*3. + uTime*2.), .1 + ph*.5, 0.))) - .03*(1. - ph), 4.);
  }
  eyes(d, p, c + vec3(-.13, -.02, -.32), c + vec3(.13, -.02, -.32), vec3(.075, .1, .05));
#else
  // PEBBLE: a round mossy boulder with a flower on top, glowing eyes in a dark crack of a face, crystals growing from
  // the back, two floating rock fists and pebbles circling underneath.
  c = vec3(0., .22, 0.);
  vec3 q = p - c;
  float rock = sdEll(q, vec3(.56, .5, .5)) + (fbm(q*3.2 + 2.) - .5)*.16;
  U(d, rock, 7.);
  float moss = max(sdEll(q - vec3(0., .05, 0.), vec3(.585, .52, .53)) + (fbm(q*6.) - .5)*.1, .18 - q.y + .07*sin(q.x*7. + q.z*5.));
  U(d, moss, 8.);
  // the face: a dark crack across the front, the eyes glowing in it
  U(d, sdEll(q - vec3(0., .02, -.44), vec3(.32, .14, .1)), 2.);
  // a flower on top of the moss
  vec3 f0 = c + vec3(-.1, .5, .02), f1 = f0 + vec3(.02, .14, 0.);
  U(d, sdCapT(p, f0, f1, .02, .016), 8.);
  vec3 fq = p - f1; float pet = 1e5;
  for (int k = 0; k < 5; k++) { float a = float(k)*1.2566 + uTime*.3; pet = min(pet, length(fq - vec3(cos(a)*.06, .01, sin(a)*.06)) - .045); }
  U(d, pet, 6.);
  U(d, length(fq - vec3(0., .02, 0.)) - .03, 3.);
  // crystals growing out of the back
  for (int k = 0; k < 3; k++) {
    float fk = float(k), a = 2.2 - fk*.7;
    vec3 base = vec3(cos(a)*.36, .32 + .06*fk, .25), dir = normalize(vec3(cos(a)*.8, .8, .3));
    vec3 cq = q - base - dir*(.12 + .04*fk);
    float ang = atan(dir.x, dir.y); cq.xy = R(ang) * cq.xy;
    float cr = sdOct(cq*vec3(1.8, .6, 1.8), .14 + .03*fk)*.5;
    if (k == 1) glowU(d, cr, 4.); else U(d, cr, 4.);
  }
  // two floating rock fists
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1. : 1.;
    vec3 fq2 = q - vec3(.72*sx, -.12 + .06*sin(uTime*2.2 + sx*1.5), -.08);
    U(d, sdEll(fq2, vec3(.14, .13, .13)) + (fbm(fq2*8. + sx) - .5)*.06, 7.);
  }
  // pebbles circling underneath
  for (int k = 0; k < 5; k++) {
    float a = float(k)*1.2566 + uTime*.7;
    vec3 pq = q - vec3(cos(a)*.48, -.62 + .03*sin(uTime*2. + float(k)), sin(a)*.32); pq.xy = R(uTime + float(k))*pq.xy;
    U(d, sdOct(pq, .06 + .02*hash1(float(k))), 7.);
  }
  eyes(d, p, c + vec3(-.12, .03, -.5), c + vec3(.12, .03, -.5), vec3(.07, .085, .04));
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
