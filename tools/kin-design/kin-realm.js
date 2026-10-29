// DRAFTS, round 6 (Isaac 2026-10-29). Round 5 (objects and animals with faces: a teapot, a kite, a snail...) was "not even
// in the same realm as NOVA". Asked what the realm is, Isaac picked: cosmic forces, dark and eerie spirits, mythic beings;
// the build "similar, not the same, new details". So these are spirits of a force, like NOVA (the void) and AURUM (light):
// NOVA's round head, short cloak, big blank mood eyes, haze and lighting, each with its own crown, mantle, mask or wings.
// No costume items (round 1's scarf, headphones and hat were dropped). Not in the game: a preview page (realm.html).
//
// Materials: 1 shadow (NOVA's dark body, rim-lit in the spirit's colour), 2 void, 3 eyes, 4 magic glow, 5 shiny (metal,
// obsidian, ice), 6-10 lit matte. All share ONE WebGL canvas (browsers allow about 16 per page) and are copied out.
import { PixelGL } from "../../site/js/pixel/pixel-gl.js";

const VOID = ["#020104", "#05030a", "#0a0614", "#120a21", "#1c1031", "#2a1846"];
const EYES = ["#8f86b8", "#b8b0dc", "#d8d2f0", "#ece8fa", "#f8f6ff", "#ffffff"];
const OBSIDIAN = ["#0a0710", "#161024", "#241a3a", "#3a2a5c", "#6a4fa0", "#c3a8ff"];
const GOLD = ["#4a3000", "#7e5808", "#b88a1a", "#e2b83a", "#fade7a", "#fff8d0"];
const SILVER = ["#2a2e3a", "#4a5060", "#6e7688", "#98a0b4", "#c4cadc", "#f0f2fa"];
const BONE = ["#3a3428", "#6a604c", "#a09478", "#ccc2a6", "#e8e0cc", "#fbf8ee"];
const STAR = ["#9aa4c8", "#c4cce8", "#e2e8fa", "#f4f6ff", "#fbfcff", "#ffffff"];

// palettes: [m1 shadow, m3 eyes, m4 glow, m5 shiny, m6, m7, m8, m9, m10]; m2 is always the void
const P = (a) => [a[0], VOID, a[1], a[2], a[3], a[4] || a[0], a[5] || a[0], a[6] || a[0], a[7] || a[0], a[8] || a[0]];

export const SPIRITS = [
  // ---- cosmic ----
  { n: 1, name: "ECLIPSE", realm: "Cosmic", pitch: "The moment the sun goes dark: a black body before a white-gold corona with long flares, a diamond-ring flash on its rim, embers rising.",
    pal: P([["#070402", "#120a04", "#21140a", "#352010", "#523018", "#7a4a1e"], ["#a08050", "#c8a870", "#e8d0a0", "#f8ecd0", "#fff8ec", "#ffffff"], ["#5a2a00", "#a85a08", "#e8961a", "#ffc84a", "#ffec9a", "#fffbe8"], GOLD]),
    glow: ["#7a5a2a", "#e8c070", "#fff4dc", "#5a2a04", "#b06010", "#f0a040"] },
  { n: 2, name: "NEBULA", realm: "Cosmic", pitch: "Made of star-forming gas, magenta and teal with stars inside it; the hem dissolves into wisps; a tiny galaxy turns over its shoulder.",
    pal: P([OBSIDIAN, EYES, ["#4a0f3a", "#842068", "#bc3a94", "#e46ac0", "#f8a8e0", "#ffe4f6"], OBSIDIAN, ["#1a0a2e", "#36124e", "#5a1c74", "#8a2a90", "#c048a8", "#f080c8"], ["#061e2e", "#0c3a52", "#145a74", "#228494", "#40b0b4", "#80dccc"], STAR]),
    glow: ["#6a4a8a", "#c8a0e8", "#fbefff", "#3a0a3a", "#7a2a7a", "#c060c0"] },
  { n: 3, name: "COMET", realm: "Cosmic", pitch: "A dark traveller with an icy crown and a long tail of blue-white light streaming back from its head, shedding sparkles.",
    pal: P([["#02040a", "#050a16", "#0a1424", "#102038", "#183050", "#22466c"], EYES, ["#0a3a5a", "#16649a", "#2a9ad0", "#5ccaf0", "#a8ecff", "#effcff"], ["#123048", "#24587c", "#3d8ab0", "#6cbcda", "#b4e6f4", "#f2fdff"]]),
    glow: ["#2a3a7a", "#5a74c8", "#a8b8f0", "#0a3a56", "#1e74a4", "#6ac4ec"] },
  { n: 4, name: "ASTRA", realm: "Cosmic", pitch: "A constellation given a body: stars on its cloak joined by faint lines, gold orbit rings turning round its head, a crown of three stars.",
    pal: P([["#020410", "#050a1e", "#0a1230", "#121e48", "#1c2c66", "#2a3e8a"], STAR, ["#4a3a10", "#8a6a20", "#c8a040", "#f0d070", "#fff0b0", "#fffbe8"], GOLD]),
    glow: ["#4a5a9a", "#a0b0e8", "#f4f6ff", "#0e1a48", "#24408a", "#5a80d0"] },
  { n: 5, name: "HOLLOW", realm: "Cosmic", pitch: "A black hole: a head of pure dark ringed by a blazing disk, the far side of the disk bent up over the top, matter spiralling in.",
    pal: P([["#050302", "#0c0604", "#180c06", "#28140a", "#3e1e0c", "#5c2c10"], EYES, ["#5a1a00", "#a84008", "#e8781a", "#ffb04a", "#ffe09a", "#fffbe8"], OBSIDIAN, ["#3a0e04", "#6a1e08", "#a03810", "#d05a1a", "#f08a3a", "#ffc070"]]),
    glow: ["#6a4a3a", "#d0a080", "#fff0e0", "#4a1a04", "#a04010", "#f08030"] },
  { n: 6, name: "LUNA", realm: "Cosmic", pitch: "The moon's own spirit: a great silver crescent moon behind its head, a silver collar, small stars drifting round.",
    pal: P([["#03040a", "#070a16", "#0e1222", "#161c32", "#202a48", "#2e3c64"], STAR, ["#3a4a7a", "#6a7ab0", "#a0b0e0", "#c8d4f4", "#e8eeff", "#ffffff"], ["#2a3040", "#4a5468", "#727e96", "#a2acc2", "#d0d8ea", "#f6f8ff"]]),
    glow: ["#4a5a8a", "#a8b4e0", "#f4f6ff", "#1a2240", "#3a4878", "#7a8cc0"] },
  // ---- dark and eerie ----
  { n: 7, name: "WRAITH", realm: "Eerie", pitch: "A cracked bone mask over the dark, sickly green eyes behind it, a crown of black thorns, long tattered tails.",
    pal: P([["#030604", "#07100a", "#0d1a10", "#152818", "#203c24", "#305a34"], ["#2a7a2a", "#4aa84a", "#7ad870", "#b0f8a0", "#e0ffd8", "#ffffff"], ["#0e3a12", "#1c6a20", "#34a038", "#5cd85a", "#a6f8a0", "#efffea"], OBSIDIAN, BONE]),
    glow: ["#2a6a2a", "#7ad070", "#e8ffe0", "#0a2a0c", "#1e5a1e", "#4a9a40"] },
  { n: 8, name: "WISP", realm: "Eerie", pitch: "A pale ghost with hollow black eyes and a little open mouth, trailing off into a curl of mist, carrying a lantern of teal soul-fire.",
    pal: P([OBSIDIAN, ["#020306", "#04060c", "#070a12", "#0a0e18", "#0e1420", "#121a28"], ["#06343a", "#0e5e64", "#18929a", "#30c8c8", "#80f0e8", "#e0fffc"], ["#0e0e12", "#1a1a20", "#2a2a32", "#3e3e4a", "#5a5a6a", "#8a8aa0"], ["#3a4a5a", "#5a7084", "#8aa2b6", "#b8cedc", "#dceaf2", "#ffffff"]]),
    glow: ["#1a2a3a", "#3a5060", "#6a8090", "#06343a", "#1a7a80", "#6ad6cc"] },
  { n: 9, name: "BOUND", realm: "Eerie", pitch: "Something sealed away: rusted chains wound round its cloak, a heavy padlock on its chest, red eyes.",
    pal: P([["#060203", "#0e0507", "#1a090c", "#2a0f14", "#40161e", "#5e1e2a"], ["#a04040", "#c86060", "#e89090", "#f8c0c0", "#ffe4e4", "#ffffff"], ["#4a0606", "#8a1010", "#c82418", "#f0502a", "#ff9060", "#ffd8c0"], ["#2a1a14", "#4a3024", "#6e4a34", "#94684a", "#bc9070", "#e8c8a8"], GOLD]),
    glow: ["#7a2020", "#e06050", "#ffe0d8", "#3a0606", "#7a1414", "#c03020"] },
  { n: 10, name: "HEX", realm: "Eerie", pitch: "A third eye on its brow that opens wide when angry, small horns, red rune circles orbiting it.",
    pal: P([["#060208", "#0e0410", "#1a081c", "#2a0c2a", "#40123c", "#5e1a52"], EYES, ["#4a0618", "#8a1028", "#c82040", "#f04a60", "#ff90a0", "#ffe0e6"], OBSIDIAN]),
    glow: ["#6a3a6a", "#d0a0d0", "#fff0ff", "#3a0618", "#7a1030", "#c02848"] },
  { n: 11, name: "CORVID", realm: "Eerie", pitch: "A raven spirit: a long bone beak mask with round brass-rimmed eyes, a mantle of black feathers.",
    pal: P([["#040308", "#0a0812", "#120e20", "#1c1630", "#2a2046", "#3c2e64"], EYES, ["#2e0f5c", "#4f1f98", "#7838d0", "#a066f0", "#cba2ff", "#f3e6ff"], GOLD, ["#04040a", "#0a0a18", "#141428", "#20203e", "#30305a", "#4a4a80"], BONE]),
    glow: ["#5b4c92", "#a99ee0", "#f2eeff", "#1a0a3a", "#3a1a6a", "#7040b0"] },
  { n: 12, name: "NOX", realm: "Eerie", pitch: "Night itself: pointed ears, red eyes, and huge tattered bat wings.",
    pal: P([["#050308", "#0c0610", "#160a1c", "#220e2c", "#341440", "#4c1c5a"], ["#a03040", "#c84a58", "#e87888", "#fcb0b8", "#ffe0e4", "#ffffff"], ["#4a0618", "#8a1028", "#c82040", "#f04a60", "#ff90a0", "#ffe0e6"], OBSIDIAN, ["#0a0612", "#160c22", "#241434", "#341c4a", "#4a2864", "#663880"]]),
    glow: ["#7a2030", "#e06070", "#ffe0e4", "#2a0a2a", "#5a1440", "#9a2a60"] },
  // ---- mythic ----
  { n: 13, name: "OPHAN", realm: "Mythic", pitch: "The old idea of an angel: two great gold rings turning round a dark body, covered in eyes that all watch you.",
    pal: P([["#060402", "#100a04", "#1e1408", "#30200c", "#4a3212", "#6a4a1a"], ["#a08050", "#c8a870", "#e8d0a0", "#f8ecd0", "#fff8ec", "#ffffff"], GOLD, GOLD, BONE, BONE, ["#8a8070", "#b4ac9c", "#d8d2c4", "#eeeae0", "#f8f6f0", "#ffffff"]]),
    glow: ["#7a5a2a", "#e8c070", "#fff4dc", "#5a3c08", "#b88a20", "#f0d070"] },
  { n: 14, name: "DJINN", realm: "Mythic", pitch: "A turquoise spirit whose body is smoke pouring out of a floating gold lamp; a flame topknot and gold hoops.",
    pal: P([OBSIDIAN, EYES, ["#5a3c00", "#9a6c06", "#d4a01a", "#f6cc4a", "#fff09a", "#fffde8"], GOLD, ["#04282c", "#08464c", "#0e6a70", "#1a9496", "#3cbcb6", "#8ae8dc"]]),
    glow: ["#3a7a7a", "#90e0d8", "#effffc", "#06343a", "#1a7a80", "#6ad6cc"] },
  { n: 15, name: "VALKYRIE", realm: "Mythic", pitch: "A chooser of the fallen: a silver winged helm over a face of shadow, a steel-blue cloak trimmed in gold, a floating spear.",
    pal: P([["#04060a", "#080c14", "#0e1420", "#161e30", "#202a44", "#2c3a5c"], EYES, ["#4a3a10", "#8a6a20", "#c8a040", "#f0d070", "#fff0b0", "#fffbe8"], SILVER, ["#0c1626", "#16263e", "#22385a", "#30507a", "#46709c", "#6a96c0"], GOLD, ["#5a5650", "#8c867c", "#bab4a8", "#dedad0", "#f2efe8", "#ffffff"]]),
    glow: ["#4a5a8a", "#a0b0e0", "#f4f6ff", "#2a3a5a", "#5a74a0", "#a8bce0"] },
  { n: 16, name: "GORGON", realm: "Mythic", pitch: "Snakes for hair that never stop moving, golden eyes with slit pupils (don't look too long).",
    pal: P([["#020604", "#06100a", "#0a1a12", "#10281c", "#183a28", "#225036"], ["#a08020", "#c8a830", "#e8cc50", "#f8e680", "#fff6c0", "#ffffff"], ["#3a3a06", "#6a6a0e", "#a0a01a", "#d0d030", "#f0f070", "#fffff0"], OBSIDIAN, ["#1a3a10", "#2e5a18", "#4a8a24", "#72b832", "#a6e04a", "#e2ff9a"]]),
    glow: ["#6a6a2a", "#d0d070", "#fffff0", "#1a3a0a", "#3a6a1a", "#7aa040"] },
];

// ---- each spirit's shape (GLSL, inside map(); p is the point, c the head centre, T the time) ----
const BODY = {
1: `
  U(d, nova(p), 1.);
  corona(d, p, c, .52);
  for (int k = 0; k < 5; k++) {                        // long streamers of the corona
    float fk = float(k), a = fk*1.2566 + .4 + .08*sin(T*.7 + fk);
    vec3 dir = vec3(cos(a), sin(a), 0.), side = vec3(-dir.y, dir.x, 0.);
    float len = .3 + .18*hash1(fk*5.3), cu = .1 + .06*sin(T*1.1 + fk*2.);
    vec3 a0 = c + vec3(0., 0., .32) + dir*.5, a1 = a0 + dir*len*.55 + side*cu*.6, a2 = a0 + dir*len + side*cu*1.8;
    glowU(d, min(sdCapT(p, a0, a1, .075, .045), sdCapT(p, a1, a2, .045, 0.)), 4.);
  }
  vec3 bead = c + vec3(.29, .27, -.12);                // the diamond ring: a white-hot bead on the rim
  float bd = length(p - bead) - .055*(.75 + .25*sin(T*2.));
  U(d, bd, 3.); gEye = min(gEye, bd);
  for (int i = 0; i < 6; i++) {                        // embers rising from the hem
    float fi = float(i), f = fract(T*.3 + fi/6.);
    glowU(d, length(p - vec3(sin(fi*2.7)*.55, -.75 + f*1.3, cos(fi*1.9)*.35 - .1)) - .028*(1. - f), 4.);
  }
  headEyes(d, p, c, .4, .92);`,
2: `
  float b = nova(p) + (fbm(p*3.5 + vec3(0., T*.35, T*.2)) - .5)*.24*smoothstep(.1, -.7, p.y);   // the hem dissolves
  float star = hash1(dot(floor(p*26.), vec3(1., 57., 113.)));
  U(d, b, star > .972 ? 8. : (fbm(p*2.6 + vec3(T*.08, 0., 0.)) > .52 ? 7. : 6.));
  vec3 g = p - vec3(-.74, 1.0, .05); g.yz = R(1.2)*g.yz;       // a little spiral galaxy over the shoulder
  float gr = length(g.xz), ga = atan(g.z, g.x) + T*.5;
  float arms = max(sin(ga*2. - log(gr + .02)*4.), 0.);
  float disc = max(abs(g.y) - .02 - .06*exp(-gr*18.), gr - .36);
  glowU(d, max(disc, gr > .07 ? (.35 - arms)*.08 : -1.), 4.);
  headEyes(d, p, c, .4, .92);`,
3: `
  U(d, nova(p), 1.);
  for (int i = 0; i < 3; i++) {                        // an icy crown
    float fi = float(i) - 1.;
    vec3 q = p - c - vec3(fi*.16, .44 - abs(fi)*.07, .04); q.xy = R(-fi*.35)*q.xy;
    U(d, sdOct(q/vec3(1., 2.6, 1.), .07 - abs(fi)*.015), 5.);
  }
  for (int k = 0; k < 6; k++) {                        // a tail of light: thin streaks fanning back from the head
    float fk = float(k), an = -.25 + fk*.16 + .04*sin(T*1.7 + fk*1.3), len = 1.05 + .35*hash1(fk*2.7);
    vec3 dir = vec3(cos(an), sin(an), .35);
    vec3 a0 = c + vec3(.2, .05, .2) + vec3(0., (fk - 2.5)*.05, 0.);
    vec3 a1 = a0 + dir*len*.5 + vec3(0., .05*sin(T*2.6 - fk), 0.), a2 = a0 + dir*len + vec3(0., .08*sin(T*2.6 - 1. - fk), 0.);
    glowU(d, min(sdCapT(p, a0, a1, .055, .032), sdCapT(p, a1, a2, .032, 0.)), 4.);
  }
  for (int i = 0; i < 5; i++) {                        // sparkles shed along it
    float fi = float(i), f = fract(T*.45 + fi/5.);
    vec3 sq = p - mix(c + vec3(.35, .05, .3), vec3(1.55, .9, .7), f) - vec3(.1*sin(fi*3.1), .14*cos(fi*2.3), 0.); sq.xy = R(T*2. + fi)*sq.xy;
    glowU(d, sdOct(sq, .05*(1. - f*.6)), 4.);
  }
  headEyes(d, p, c, .4, .92);`,
4: `
  U(d, nova(p), 1.);
  vec3 s = cloakS(p, .22);                              // stars ride on the cloth as it sways
  const vec3 ST[6] = vec3[6](vec3(-.15, .05, -.215), vec3(.06, -.1, -.293), vec3(.24, -.02, -.19), vec3(-.08, -.38, -.386), vec3(.2, -.48, -.394), vec3(-.36, -.52, -.334));
  float st = 1e5;
  for (int i = 0; i < 6; i++) { vec3 sq = s - ST[i]; sq.xy = R(.785)*sq.xy; st = min(st, sdOct(sq, .058 + .012*sin(T*3. + float(i)*1.7))); }
  U(d, st, 3.); gEye = min(gEye, st);
  float ln = 1e5;
  for (int i = 0; i < 5; i++) {
    ivec2 e = i == 0 ? ivec2(0, 1) : i == 1 ? ivec2(1, 2) : i == 2 ? ivec2(1, 3) : i == 3 ? ivec2(3, 4) : ivec2(3, 5);
    vec3 a = ST[e.x], b = ST[e.y], m = (a + b)*.5; m.z = min(a.z, b.z) - .05;
    ln = min(ln, min(sdCap(s, a, m, .011), sdCap(s, m, b, .011)));
  }
  glowU(d, ln, 4.);
  for (int r = 0; r < 2; r++) {                        // gold orbit rings round the head
    vec3 q = p - c;
    q.xz = R(.5 + float(r)*1.9)*q.xz; q.yz = R(1.15 - float(r)*.35)*q.yz; q.xy = R(T*(.4 - float(r)*.7))*q.xy;
    U(d, min(sdTorZ(q, .64 - float(r)*.06, .02), length(q - vec3(.64 - float(r)*.06, 0., 0.)) - .045), 5.);
  }
  for (int i = 0; i < 3; i++) {                        // a crown of three stars
    float fi = float(i) - 1.;
    vec3 sq = p - c - vec3(fi*.17, .52 - abs(fi)*.07 + .02*sin(T*2. + fi), .02); sq.xy = R(.785)*sq.xy;
    float cs = sdOct(sq, .07 - abs(fi)*.015);
    U(d, cs, 3.); gEye = min(gEye, cs);
  }
  headEyes(d, p, c, .4, .92);`,
5: `
  U(d, cloakB(p, .22, -.74, .22, .64), 1.);
  U(d, length(p - c) - .4, 2.);                        // a head of pure dark
  vec3 a = p - c - vec3(0., -.36, 0.); a.yz = R(.16)*a.yz; a.xy = R(-.08)*a.xy;
  float ar = length(a.xz);
  float disk = max(abs(a.y) - .016, max(.42 - ar, ar - 1.05));
  if (ar < .75) glowU(d, disk, 4.); else U(d, disk, 6.);     // white-hot inside, orange at the edge
  vec3 l = p - c - vec3(0., -.04, .25);                // the light bent all the way round the head
  glowU(d, sdTorZ(l, .5, .026 + .014*max(l.y, 0.)/.5), 4.);
  for (int i = 0; i < 7; i++) {                        // matter spiralling in
    float fi = float(i), f = fract(T*.22 + fi/7.), an = fi*.9 + f*7.;
    float rr = .45 + .55*(1. - f);
    vec3 sp = vec3(cos(an)*rr, 0., sin(an)*rr); sp.yz = R(-.16)*sp.yz;
    glowU(d, length(p - c - vec3(0., -.36, 0.) - sp) - .028, 4.);
  }
  headEyes(d, p, c, .4, .92);`,
6: `
  U(d, nova(p), 1.);
  vec3 m = p - c - vec3(-.1, .08, .3);                // a great crescent moon behind the head, opening to the right
  float cres = max(length(m) - .7, -(length(m - vec3(.3, .1, 0.)) - .6));
  cres = max(cres, abs(m.z) - .05);
  U(d, cres, 5.);
  glowU(d, max(cres - .012, m.x + .35), 4.);           // its outer edge glows
  for (int i = 0; i < 4; i++) {                        // small stars drifting round
    float an = T*.35 + float(i)*1.5708;
    vec3 sq = p - c - vec3(cos(an)*.78, -.35 + .25*sin(an*2. + float(i)), sin(an)*.4); sq.xy = R(.785)*sq.xy;
    float st = sdOct(sq, .05);
    U(d, st, 3.); gEye = min(gEye, st);
  }
  U(d, length(vec2(length(p.xz) - .26, (p.y - .17)*1.6)) - .04, 5.);   // a silver collar
  headEyes(d, p, c, .4, .92);`,
7: `
  vec3 s = cloakS(p, .22);
  float ry = mix(.22, .66, clamp((.22 - s.y)/1.08, 0., 1.));
  float cl = (length(vec2(s.x, s.z*1.3)) - ry)*.7;
  float jag = .2*abs(sin(s.x*8. + T*1.2)) + .06*sin(s.x*21. - T*2.3);
  float tails = .42*pow(max(0., sin(s.x*7. + 1.3 + .5*sin(T*1.1))), 8.);   // long tattered tails
  U(d, smin(length(p - c) - .4, max(cl, max(s.y - .24, (-.86 + jag - tails) - s.y)), .1), 1.);
  float mk = max(abs(length(p - c) - .425) - .022, p.z - c.z + .12);          // the bone mask
  mk = max(mk, -min(sdEll(p - c - vec3(-.16, .03, -.38), vec3(.14, .17, .3)), sdEll(p - c - vec3(.15, .03, -.38), vec3(.14, .17, .3))));
  mk = max(mk, -sdEll(p - c - vec3(0., -.13, -.4), vec3(.035, .05, .2)));                   // the nose
  mk = max(mk, -max(abs(p.x - .03 - .035*sin(p.y*30.)) - .017, abs(p.y - c.y - .3) - .1));   // a crack from the brow
  mk = max(mk, -sdEll(p - c - vec3(0., -.24, -.4), vec3(.13, .022, .2)));                     // a thin mouth
  U(d, mk, 6.);
  vec3 cr = p - c - vec3(0., .5, .02);                                       // a floating crown of black thorns
  float th = length(vec2(length(cr.xz) - .27, cr.y)) - .03;
  for (int k = 0; k < 7; k++) {
    float an = float(k)*.8976 + T*.25;
    vec3 b = vec3(cos(an)*.27, 0., sin(an)*.27);
    th = min(th, sdCapT(cr, b, b + vec3(cos(an)*.08, .2 + .07*hash1(float(k)), sin(an)*.08), .045, 0.));
  }
  U(d, th, 5.);
  eyes(d, p, c + vec3(-.16, .02, -.34), c + vec3(.15, .02, -.34), vec3(.055, .085, .07));   // small eyes deep in the sockets`,
8: `
  float sw = .06*sin(T*1.4);
  vec3 t0 = vec3(0., .25, 0.), t1 = vec3(.04 + sw, -.25, .02), t2 = vec3(.2 + sw*1.5, -.6, .05), t3 = vec3(.48 + sw*2., -.72, .08), t4 = vec3(.64 + sw*2., -.56, .1);
  float tail = min(min(sdCapT(p, t0, t1, .38, .3), sdCapT(p, t1, t2, .3, .18)), min(sdCapT(p, t2, t3, .18, .08), sdCapT(p, t3, t4, .08, 0.)));
  U(d, smin(length(p - c) - .4, tail, .12), 6.);
  headEyes(d, p, c, .4, .92);
  U(d, sdEll(p - c - vec3(0., -.25, -.31), vec3(.05, .07, .05)), 2.);     // a small open mouth
  vec3 lq = p - vec3(-.66, .02 + .04*sin(T*1.5), -.06); lq.xy = R(.12*sin(T*1.2))*lq.xy;
  float lan = min(sdCapT(lq, vec3(0., .14, 0.), vec3(0., .27, 0.), .13, .02), sdCylY(lq - vec3(0., -.15, 0.), .11, .025));
  for (int k = 0; k < 4; k++) { vec2 cn = vec2(k < 2 ? -.08 : .08, k % 2 == 0 ? -.08 : .08); lan = min(lan, sdCap(lq, vec3(cn.x, -.14, cn.y), vec3(cn.x, .14, cn.y), .016)); }
  lan = min(lan, sdTorZ(lq - vec3(0., .31, 0.), .045, .013));
  U(d, lan, 5.);
  glowU(d, sdEll(lq - vec3(0., -.03 + .01*sin(T*9.), 0.), vec3(.055, .1 + .02*sin(T*11.), .055)), 4.);`,
9: `
  U(d, nova(p), 1.);
  vec3 s = cloakS(p, .22);
  if (length(s.xz) < .9 && s.y < .35 && s.y > -.85) {
    for (int ch = 0; ch < 2; ch++) {                     // two chains winding round the cloak
      float ph = float(ch)*3.1416;
      for (int i = 0; i < 20; i++) {
        float fi = float(i), u = fi/19., an = ph + u*7.4 + T*.2, y = .14 - u*.8;
        float ry = mix(.22, .64, clamp((.22 - y)/.96, 0., 1.)) + .04;
        vec3 cc = vec3(cos(an)*ry, y, sin(an)*ry/1.3);
        vec3 tg = normalize(vec3(-sin(an)*ry, -.8/7.4, cos(an)*ry/1.3)), nr = normalize(vec3(cos(an), 0., sin(an))), bn = cross(tg, nr);
        vec3 v = s - cc;
        bool flip = mod(fi, 2.) < 1.;
        vec3 q = vec3(dot(v, tg), dot(v, flip ? nr : bn), dot(v, flip ? bn : nr));
        q.x = sign(q.x)*max(abs(q.x) - .028, 0.);
        U(d, sdTorZ(q, .042, .015), 5.);
      }
    }
    float lock = sdRBox(s - vec3(0., -.1, -.34), vec3(.1, .085, .045), .02);   // the padlock
    U(d, lock, 6.);
    U(d, max(sdTorZ(s - vec3(0., -.02, -.34), .065, .02), -(s.y + .02)), 6.);
    U(d, sdCap(s, vec3(0., -.09, -.39), vec3(0., -.13, -.39), .016), 2.);
  }
  headEyes(d, p, c, .4, .92);`,
10: `
  for (int k = 0; k < 2; k++) {                        // two small curved horns
    float sx = k == 0 ? -1. : 1.;
    U(d, min(sdCapT(p, c + vec3(.22*sx, .25, .02), c + vec3(.34*sx, .45, .06), .075, .05), sdCapT(p, c + vec3(.34*sx, .45, .06), c + vec3(.29*sx, .63, .12), .05, 0.)), 5.);
  }
  U(d, nova(p), 1.);
  vec3 te = c + vec3(0., .26, -.27);                   // the third eye, upright on the brow
  float op = uMood == 2. ? 1. : (uMood == 4. ? .08 : .75 + .1*sin(T*1.7));
  glowU(d, sdEll(p - te, vec3(.07, .13*op, .06)), 4.);
  U(d, sdEll(p - te - vec3(0., 0., -.045), vec3(.02, .09*op, .02)), 2.);
  eyes(d, p, c + vec3(-.166, -.06, -.344), c + vec3(.156, -.06, -.344), vec3(.092, .15, .1));
  for (int k = 0; k < 3; k++) {                        // rune circles orbiting
    float fk = float(k), an = T*.5 + fk*2.094;
    vec3 rq = p - c - vec3(cos(an)*.85, -.7 + .2*sin(an*1.3 + fk), sin(an)*.5);
    rq.xy = R(T + fk)*rq.xy;
    glowU(d, min(sdTorZ(rq, .1, .014), min(sdCap(rq, vec3(0., -.07, 0.), vec3(0., .07, 0.), .012), sdCap(rq, vec3(-.06, .02, 0.), vec3(.05, -.04, 0.), .012))), 4.);
  }`,
11: `
  U(d, nova(p), 1.);
  for (int r = 0; r < 2; r++) {                        // a mantle of black feathers, two rows
    float fr = float(r);
    for (int k = 0; k < 10; k++) {
      float an = float(k)*.628 + fr*.31;
      vec3 dir = vec3(sin(an), 0., -cos(an));
      vec3 base = vec3(0., .2 - fr*.14, 0.) + dir*(.22 + fr*.08);
      U(d, sdCapT(p, base, base + dir*(.13 + fr*.06) + vec3(0., -.3 - fr*.06, 0.), .085, .015), 6.);
    }
  }
  vec3 ea = c + vec3(-.17, .1, -.35), eb = c + vec3(.17, .1, -.35);
  float plate = max(abs(length(p - c) - .42) - .025, p.z - c.z + .14);   // the beak mask
  plate = max(plate, -min(length(p - ea) - .12, length(p - eb) - .12));
  vec3 b0 = c + vec3(0., -.02, -.36), b1 = c + vec3(-.2, -.2, -.62), b2 = c + vec3(-.42, -.46, -.66);
  float beak = min(sdCapT(p, b0, b1, .15, .08), sdCapT(p, b1, b2, .08, 0.));
  U(d, smin(plate, beak, .05), 7.);
  U(d, min(sdTorZ(p - ea - vec3(0., 0., -.07), .12, .026), sdTorZ(p - eb - vec3(0., 0., -.07), .12, .026)), 5.);
  eyes(d, p, ea, eb, vec3(.085, .1, .08));
  for (int i = 0; i < 2; i++) {                        // a feather drifting down
    float fi = float(i), f = fract(T*.18 + fi*.5);
    vec3 fq = p - vec3(-.7 + fi*1.35 + .12*sin(T*1.3 + fi*2.), .9 - f*1.8, -.1); fq.xy = R(.6*sin(T*1.6 + fi))*fq.xy;
    U(d, sdCapT(fq, vec3(0., .09, 0.), vec3(0., -.09, 0.), .035, .006), 6.);
  }`,
12: `
  float b = nova(p);
  for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.; b = smin(b, sdCapT(p, c + vec3(.2*sx, .26, .05), c + vec3(.34*sx, .64, .1), .13, 0.), .05); }   // pointed ears
  U(d, b, 1.);
  float flap = .2*sin(T*1.8);
  for (int k = 0; k < 2; k++) {                        // tattered bat wings: three fingers, a scalloped membrane
    float sx = k == 0 ? -1. : 1.;
    vec3 w = p - vec3(.2*sx, .24, .24);
    w.xz = R(-sx*(.3 + flap*.5))*w.xz;
    vec2 q = vec2(w.x*sx, w.y);
    float r = length(q), an = atan(q.y, q.x);
    float edge = 1. - .2*pow(abs(sin((an + .35)/1.55*9.4248)), .6);
    float fan = max(r - edge, max(an - 1.2, -.35 - an));
    fan = max(fan, -(length(q - vec2(.6, .32)) - .06));
    fan = max(fan, -(length(q - vec2(.42, -.02)) - .045));
    U(d, extrude(fan*.8, w.z, .02), 6.);
    for (int j = 0; j < 4; j++) { float a = -.35 + float(j)*.517; U(d, sdCapT(w, vec3(0.), vec3(cos(a)*1.02*sx, sin(a)*1.02, 0.), .035, .012), 1.); }
  }
  headEyes(d, p, c, .4, .92);`,
13: `
  U(d, nova(p), 1.);
  for (int r = 0; r < 2; r++) {                        // two great gold rings, covered in eyes that watch you
    float fr = float(r), yaw = r == 0 ? .75 : 0., tilt = r == 0 ? 0. : 1.1, spin = T*(.22 + fr*.08)*(r == 1 ? -1. : 1.);
    vec3 q = p - vec3(0., .12, 0.);
    q.xz = R(yaw)*q.xz; q.yz = R(tilt)*q.yz; q.xy = R(spin)*q.xy;
    U(d, sdTorZ(q, .96, .05), 5.);
    float seg = 6.2832/9., id = floor(atan(q.y, q.x)/seg + .5);
    vec3 w = vec3(cos(id*seg), sin(id*seg), 0.)*.96;
    w.xy = R(-spin)*w.xy; w.yz = R(-tilt)*w.yz; w.xz = R(-yaw)*w.xz; w += vec3(0., .12, 0.);
    float bl = step(.05, fract(T*.23 + hash1(id + fr*9.)));
    U(d, sdEll(p - w, vec3(.09, .09*bl + .012, .09)), 8.);
    U(d, sdEll(p - w - vec3(0., 0., -.075), vec3(.042, .042*bl + .005, .03)), 2.);
  }
  headEyes(d, p, c, .4, .92);`,
14: `
  float sw = .05*sin(T*1.3);
  vec3 t0 = vec3(0., .2, 0.), t1 = vec3(.1 + sw, -.18, .04), t2 = vec3(-.08 - sw, -.48, .06), t3 = vec3(.0 + sw*.5, -.76, .04);
  float smoke = min(min(sdCapT(p, t0, t1, .34, .24), sdCapT(p, t1, t2, .24, .14)), sdCapT(p, t2, t3, .14, .05));
  smoke += (fbm(p*5. + vec3(0., T*1.2, 0.)) - .5)*.1*smoothstep(.1, -.6, p.y);
  U(d, smin(length(p - c) - .4, smoke, .1), 6.);
  U(d, length(vec2(length((p - c - vec3(0., .4, 0.)).xz) - .075, p.y - c.y - .4)) - .028, 5.);   // the topknot ring
  glowU(d, sdCapT(p, c + vec3(0., .42, 0.), c + vec3(.05*sin(T*3.), .74, .02), .075, 0.), 4.);  // its flame
  for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1. : 1.; U(d, sdTorZ(p - c - vec3(.41*sx, -.12, -.02), .07, .016), 5.); }
  vec3 lq = p - vec3(0., -.86, 0.);                    // the lamp it pours out of
  float lamp = sdEll(lq, vec3(.3, .11, .19));
  lamp = smin(lamp, sdCapT(lq, vec3(.22, .02, 0.), vec3(.48, .11, 0.), .07, .03), .05);
  lamp = min(lamp, max(sdTorZ(lq - vec3(-.32, .03, 0.), .09, .022), -(lq.x + .3)));
  lamp = smin(lamp, sdEll(lq - vec3(0., .1, 0.), vec3(.12, .05, .1)), .04);
  U(d, lamp, 5.);
  headEyes(d, p, c, .4, .92);`,
15: `
  float body = cloakB(p, .22, -.74, .22, .64);
  U(d, body, 6.);
  vec3 s = cloakS(p, .22);                              // gold trim above the hem, a gold collar
  float jag = .22*abs(sin(s.x*8. + T*1.2)) + .06*sin(s.x*21. - T*2.3);
  U(d, max(cloakB(p, .22, -.74, .225, .645) - .006, s.y - (-.74 + jag + .1)), 7.);
  U(d, length(vec2(length(p.xz) - .26, (p.y - .17)*1.6)) - .045, 7.);
  U(d, length(p - c) - .4, 1.);                        // a face of shadow
  float helm = max(length(p - c) - .44, -(length(p - c - vec3(0., -.14, -.38)) - .3));
  helm = min(helm, sdCapT(p, c + vec3(0., .34, -.38), c + vec3(0., .02, -.45), .04, .026));   // nose guard
  U(d, helm, 5.);
  float flap = .12*sin(T*2.);
  for (int k = 0; k < 2; k++) {                        // wings on the helm
    float sx = k == 0 ? -1. : 1.;
    vec3 w = p - c - vec3(.38*sx, .12, .08);
    for (int j = 0; j < 3; j++) {
      float a = .5 + float(j)*.38 + flap*(1. - float(j)*.25);
      vec3 f = vec3(w.x*sx, w.y, w.z); f.xy = R(-a)*f.xy;
      U(d, sdEll(f - vec3(.2 - float(j)*.03, 0., .05*float(j)), vec3(.22 - float(j)*.04, .055, .03)), 8.);
    }
  }
  vec3 sp = p - vec3(.72, .0 + .04*sin(T*1.3), -.05); sp.xy = R(-.12)*sp.xy;   // the spear
  U(d, sdCap(sp, vec3(0., -.75, 0.), vec3(0., .72, 0.), .022), 7.);
  U(d, sdCapT(sp*vec3(1., 1., 2.), vec3(0., .7, 0.), vec3(0., 1.04, 0.), .075, 0.)/2., 5.);
  glowU(d, length(sp - vec3(0., .98, 0.)) - .03, 4.);
  headEyes(d, p, c, .4, .92);`,
16: `
  U(d, nova(p), 1.);
  for (int k = 0; k < 6; k++) {                        // snakes for hair, always moving
    float fk = float(k), an = -1.05 + fk*.42, ph = T*1.8 + fk*1.4;
    vec3 dir = vec3(sin(an), cos(an), 0.), side = vec3(cos(an), -sin(an), 0.);
    vec3 r0 = c + dir*.32 + vec3(0., 0., .05);
    vec3 r1 = r0 + dir*.16 + side*.06*sin(ph);
    vec3 r2 = r1 + dir*.16 - side*.08*sin(ph + 1.);
    vec3 r3 = r2 + dir*.1 + side*.07*sin(ph + 2.) + vec3(0., 0., -.06);
    vec3 hd = r3 + dir*.05 + vec3(0., 0., -.04);
    U(d, min(min(sdCapT(p, r0, r1, .07, .055), sdCapT(p, r1, r2, .055, .045)), min(sdCapT(p, r2, r3, .045, .04), sdEll(p - hd, vec3(.075, .058, .085)))), 6.);
    glowU(d, length(p - hd - vec3(0., .035, -.065)) - .017, 4.);
  }
  vec3 ea = c + vec3(-.166, .01, -.344), eb = c + vec3(.156, .01, -.344), er = vec3(.092, .166, .1);
  eyes(d, p, ea, eb, er);
  U(d, max(sdBox(p - ea - vec3(0., 0., -.1), vec3(.014, .11, .02)), eye1(p - ea - vec3(0., 0., -.04), er, 1.)), 2.);    // slit pupils
  U(d, max(sdBox(p - eb - vec3(0., 0., -.1), vec3(.014, .11, .02)), eye1(p - eb - vec3(0., 0., -.04), er*vec3(1.08, 1.04, 1.), -1.)), 2.);`,
};

const model = (s) => `
uniform vec2 uRes; uniform float uTime, uYaw, uView, uBlink, uBob, uSway, uMood, uEnergy;
float gm; float gEye; float gMagic;
void U(inout float d, float nd, float m){ if (nd < d) { d = nd; gm = m; } }
void glowU(inout float d, float nd, float m){ U(d, nd, m); gMagic = min(gMagic, nd); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.)/k1; }
float fbm(vec3 p){ return vnoise(p)*.6 + vnoise(p*2.1 + 4.)*.3 + vnoise(p*4.3 + 9.)*.1; }
// ---- NOVA's own pieces, exactly as in nova-px.js ----
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
void corona(inout float d, vec3 p, vec3 c0, float rr){
  vec3 c = p - c0 - vec3(0., 0., .32);
  float ring = sdTorZ(c, rr, .04);
  float n = 20., sec = 6.2831853/n, a = atan(c.y, c.x);
  float id = floor((a + sec*.5)/sec), an = mod(a + sec*.5, sec) - sec*.5;
  float len = (.16 + .16*hash1(id) + .07*sin(uTime*3.3*uEnergy + id*2.1))*uEnergy;
  vec3 rp = vec3(cos(an)*length(c.xy), sin(an)*length(c.xy), c.z);
  ring = min(ring, sdCapT(rp, vec3(rr, 0., 0.), vec3(rr + len, 0., 0.), .045, .0));
  U(d, ring, 4.); gMagic = min(gMagic, ring);
}
// the cloak's sway, so things can ride on the cloth
vec3 cloakS(vec3 p, float top){
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(top - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(top - s.y, 0.), 2.);
  return s;
}
float cloakB(vec3 p, float top, float bot, float r0, float r1){
  vec3 s = cloakS(p, top);
  float ry = mix(r0, r1, clamp((top - s.y)/(top - bot), 0., 1.));
  float c = (length(vec2(s.x, s.z*1.3)) - ry)*.7;
  float jag = .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3);
  return max(c, max(s.y - top - .02, (bot + jag) - s.y));
}
// NOVA's build: the round head on the short ragged cloak
float nova(vec3 p){ return smin(length(p - vec3(0., .5, 0.)) - .4, cloakB(p, .22, -.74, .22, .64), .1); }

float map(vec3 p){
  gm = 0.; gEye = 1e5; gMagic = 1e5;
  float d = 1e5, T = uTime;
  p.y -= uBob;
  p.xz = R(uYaw) * p.xz;
  float bb = sdBox(p - vec3(0., .1, 0.), vec3(1.9, 1.9, 1.5));
  if (bb > .3) return max(bb, 1.);
  vec3 c = vec3(0., .5, 0.);
  ${BODY[s.n]}
  return d;
}
vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.)*.002;
  return normalize(k.xyy*map(p + k.xyy) + k.yyx*map(p + k.yyx) + k.yxy*map(p + k.yxy) + k.xxx*map(p + k.xxx));
}
// NOVA's lighting and haze, exactly
out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  vec3 ro = vec3(uv.x, uv.y + .1, -5.), rd = vec3(0., 0., 1.);
  float t = 0., m = 0., minD = 1e5, minEye = 1e5, minMagic = 1e5;
  for (int i = 0; i < 120; i++) {
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
  else if (m == 8.) sh = .2 + .55*key + .25*rim;
  else if (m >= 6.) sh = .14 + .62*key + .22*rim;
  else { sh = .05 + .2*key + .55*rim*(.4 + .6*back); sh += .3*exp(-max(gEye, 0.)*10.); }
  o = vec4(clamp(sh, 0., 1.), m/16., t/10., eyeGlow);
}`;

const MOODS = { idle: { id: 0, energy: 1, bob: 1.5, amp: 0.05 }, happy: { id: 1, energy: 1.2, bob: 3.2, amp: 0.07, hop: true }, angry: { id: 2, energy: 1.6, bob: 2.4, amp: 0.035 }, sad: { id: 3, energy: 0.55, bob: 0.9, amp: 0.03, sink: -0.06 }, sleepy: { id: 4, energy: 0.45, bob: 0.7, amp: 0.025, sink: -0.04 } };

// One shared WebGL canvas; each spirit draws there and is copied onto its own 2D canvas.
const W = 107, H = 113, SHARED = document.createElement("canvas");
SHARED.width = W; SHARED.height = H;
const LIVE = [];
const loop = (now) => { for (const k of LIVE) k.frame(now); requestAnimationFrame(loop); };

export class PixelSpirit {
  constructor(host, spirit, { px = 3, view = 4.79 } = {}) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W; this.canvas.height = H;
    Object.assign(this.canvas.style, { width: W * px + "px", height: H * px + "px", imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.gl = new PixelGL(SHARED, { model: model(spirit), palettes: spirit.pal, glow: spirit.glow, extra: ["#c9b8f0", "#ffffff", "#030206"] });
    this.view = view; this.yaw = 0.25; this.m = MOODS.idle; this.t0 = performance.now() - Math.random() * 4000; this.nextBlink = 2;
    if (!LIVE.length) requestAnimationFrame(loop);
    LIVE.push(this);
  }
  setMood(name) { this.m = MOODS[name] || MOODS.idle; }
  frame(now) {
    const s = (now - this.t0) / 1000, m = this.m, wv = s * m.bob;
    if (s > this.nextBlink + 0.16) this.nextBlink = s + 2.5 + Math.random() * 3;
    const bob = (m.hop ? Math.abs(Math.sin(wv)) * m.amp * 1.6 - m.amp * 0.4 : Math.sin(wv) * m.amp) + (m.sink ?? 0);
    this.gl.draw({ uTime: s, uYaw: this.yaw, uView: this.view, uBlink: m.id === 4 ? 1 : s > this.nextBlink ? 0.1 : 1, uBob: bob, uSway: 0, uMood: m.id, uEnergy: m.energy },
      { uTime: s, uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: 0, uShadowX: 0.5, uPlume: [0, 0, 0, 0] });
    this.ctx.clearRect(0, 0, W, H);
    this.ctx.drawImage(SHARED, 0, 0);
  }
}
