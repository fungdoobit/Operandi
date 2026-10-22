// KAELA, the first playable character (PRD Addendum L), round 2: rebuilt to
// match Isaac's reference (the blue-haired swordswoman in his videos),
// recoloured: chibi proportions (head and hair about 45% of her height), a big
// spiky mass of red hair with a long ponytail, a dark scarf streaming behind,
// a big eye, a dark rogue top with a crimson collar, a white steel shoulder
// plate and gauntlet, dark leggings, boots with gold bands, and a straight
// sword with a glowing crimson edge. Her stance is the reference's low dash:
// leaning in, legs in a long stride, the sword held low and back.
// Painted with the 2D pixel painter (painter.js) from a small rig; about 52
// art px tall; faces right.
import { paint, circle, ellipse, capsule, poly, stroke, union, cut, limb, lerp } from "./painter.js";

export const RAMPS = {
  skin: ["#3a1a1c", "#7a3e36", "#c06e52", "#e8a07c", "#f8c8a4", "#ffe8d0"],
  hair: ["#26040a", "#5a0c16", "#9a1820", "#d22a26", "#f45a36", "#ffa070"],
  navy: ["#06070c", "#10131f", "#1b2033", "#283050", "#3a4672", "#56669a"],
  scarf: ["#05060a", "#0c0f1a", "#151a2c", "#1f2742", "#2e3a60", "#46568a"],
  crimson: ["#22040c", "#4c0a18", "#821428", "#b8203a", "#e04450", "#ff8a80"],
  steel: ["#24283a", "#4e5672", "#8a94b0", "#c4cce0", "#eef2fa", "#ffffff"],
  boot: ["#120a06", "#2a1a10", "#46301c", "#644628", "#86623a", "#a8844e"],
  gold: ["#3a2004", "#7a4a0a", "#b8801a", "#e6b23a", "#ffdc72", "#fff6c4"],
  blade: ["#3a0a18", "#a03040", "#d8d0dc", "#eef0f8", "#ffffff", "#ffffff"],
};

// Poses: lean (body), head tilt, front (sword) arm shoulder/elbow, sword angle
// (absolute, radians, y down), back arm, legs (front thigh/shin, back thigh/shin), hair/scarf flow.
export const POSES = {
  // the low ready dash, sword held down and back
  idle: { lean: 0.32, head: -0.05, fa: 2.05, fe: 0.55, sw: 2.45, ba: 0.6, be: -1.9, ft: 0.75, fs: 1.0, bt: 2.15, bs: 0.35, flow: 0 },
  // the thrust: sword arm straight out in front, the sword level
  thrust: { lean: 0.42, head: 0.05, fa: 0.05, fe: 0.02, sw: 0.02, ba: 2.3, be: -0.4, ft: 0.55, fs: 1.25, bt: 2.3, bs: 0.25, flow: 0.6 },
  // swept through: the sword whipped round behind her, level
  swept: { lean: 0.5, head: 0.1, fa: 2.9, fe: 0.25, sw: 3.2, ba: 0.4, be: -1.5, ft: 0.6, fs: 1.2, bt: 2.35, bs: 0.25, flow: 1 },
  // rising: the sword raised high over her head
  rise: { lean: 0.1, head: -0.15, fa: -1.6, fe: -0.3, sw: -2.2, ba: 1.2, be: -1.2, ft: 0.95, fs: 0.9, bt: 2.0, bs: 0.5, flow: 0.4 },
};
export const mixPose = (a, b, k) => Object.fromEntries(Object.keys(a).map((n) => [n, lerp(a[n], b[n] ?? a[n], k)]));

export const W = 112, H = 84;

export function kaelaParts(P, t = 0) {
  const br = Math.sin(t * 2.6) * 0.5, sway = Math.sin(t * 3.1) * 1.3, flow = P.flow || 0;
  // the skeleton, hip at the origin
  const legF = limb(1, 0, 9.5, P.ft, 9.5, P.fs), legB = limb(-1, 0, 9.5, P.bt, 9.5, P.bs);
  const chest = [Math.sin(P.lean) * 11, -Math.cos(P.lean) * 11 + br * 0.3];
  const neck = [chest[0] + Math.sin(P.lean) * 2, chest[1] - 2 + br * 0.2];
  const hc = [neck[0] + 1.5 + Math.sin(P.lean * 0.6 + P.head) * 7, neck[1] - 7.2];
  const shF = [chest[0] + 1, chest[1] + 1.2], shB = [chest[0] - 1.5, chest[1] + 0.6];
  const armF = limb(shF[0], shF[1], 6, P.fa, 5.5, P.fe), armB = limb(shB[0], shB[1], 5.5, P.ba, 5, P.be);
  const footY = Math.max(legF[2][1], legB[2][1]) + 1.5;
  const ox = W * 0.44, oy = H - 4 - footY;
  const T = ([x, y]) => [x + ox, y + oy];
  const HP = T([0, 0]), [, KF, AF] = legF.map(T), [, KB, AB] = legB.map(T);
  const C = T(chest), N = T(neck), HC = T(hc), SF = T(shF), SB = T(shB);
  const [, EF, WF] = armF.map(T), [, EB, WB] = armB.map(T);
  const parts = [], add = (s, m, z, o = {}) => parts.push({ s, m, z, ...o });

  // ---- behind her: the scarf tails and the ponytail streaming back ----
  const sf = sway + flow * 4;
  add(stroke([[N[0] - 1, N[1] + 1, 2.4], [N[0] - 7, N[1] + 2 + sf * 0.3, 2.6], [N[0] - 14, N[1] + 1 + sf * 0.7, 2.2], [N[0] - 20, N[1] - 1 + sf, 1.4], [N[0] - 24, N[1] - 3 + sf * 1.3, 0.3]]), "scarf", 1, { thick: 2 });
  add(stroke([[N[0] - 1, N[1] + 2, 1.8], [N[0] - 6, N[1] + 6 + sf * 0.4, 1.8], [N[0] - 11, N[1] + 9 + sf * 0.8, 0.3]]), "scarf", 1, { thick: 1.5, dim: 1 });
  const tie = [HC[0] - 6.5, HC[1] - 4];
  add(stroke([[tie[0], tie[1], 3], [tie[0] - 6, tie[1] - 1 + sf * 0.25, 3.4], [tie[0] - 12, tie[1] + 1 + sf * 0.55, 2.8], [tie[0] - 17, tie[1] + 4 + sf * 0.9, 1.8], [tie[0] - 21, tie[1] + 5 + sf * 1.2, 0.3]]), "hair", 2, { thick: 2.5, decal(put) {
    for (let i = 0; i < 4; i++) put(tie[0] - 4 - i * 3.5, tie[1] - 1 + i * 0.9 + sf * (0.2 + i * 0.2), "5");
  } });
  add(stroke([[tie[0] - 3, tie[1] + 2, 1.6], [tie[0] - 10, tie[1] + 6 + sf * 0.5, 1.4], [tie[0] - 14, tie[1] + 10 + sf * 0.9, 0.3]]), "hair", 2, { thick: 1.5, dim: 1 });

  // ---- the far leg and arm, a step darker ----
  add(capsule(...HP, ...KB, 2.6, 2.2), "navy", 3, { dim: 1 });
  add(capsule(...KB, ...AB, 2.2, 1.9), "boot", 3, { dim: 1 });
  add(capsule(AB[0], AB[1], AB[0] + 4.5, AB[1] + 0.8, 1.9, 1.3), "boot", 3, { dim: 1 });
  add(capsule(...SB, ...EB, 1.7, 1.5), "navy", 4, { dim: 1 });
  add(capsule(...EB, ...WB, 1.8, 1.6), "steel", 4, { dim: 1 });
  add(circle(...WB, 1.8), "navy", 4, { dim: 1 });

  // ---- her body ----
  add(union(capsule(HP[0], HP[1] - 1, C[0], C[1] + 1, 4, 4.4), ellipse(HP[0] + Math.sin(P.lean), HP[1] - 1.5, 4.4, 3.2, P.lean)), "navy", 5, { thick: 3, decal(put) {
    for (let i = 0; i < 6; i++) put(lerp(C[0], HP[0], i / 6) + 1.6, lerp(C[1], HP[1], i / 6), "4");   // the light down her front seam
  } });
  // a short tunic flap and a belt
  const bx = HP[0] + Math.sin(P.lean) * 1.2, by = HP[1] - 2;
  add(poly([[bx - 4.6, by], [bx + 4.4, by], [bx + 5.6, by + 4.6], [bx + 1.5, by + 3], [bx - 1.5, by + 5.5], [bx - 5.6, by + 3.8]]), "navy", 6, { thick: 2 });
  add(capsule(bx - 4.5, by, bx + 4.4, by - 0.3, 1.1), "boot", 6, { thick: 1, decal(put) { put(bx + 2, by - 1, "#ffdc72", false); put(bx + 2, by, "#b8801a", false); } });
  // the near leg: legging, boot with gold bands, foot
  add(capsule(...HP, ...KF, 2.8, 2.3), "navy", 7, { thick: 2.5 });
  add(capsule(...KF, ...AF, 2.4, 2), "boot", 7, { thick: 2, decal(put) {
    for (const u of [0.35, 0.6]) { const x = lerp(KF[0], AF[0], u), y = lerp(KF[1], AF[1], u); for (let k = -2; k <= 2; k++) put(x + k * 0.5, y, "#e6b23a"); }
  } });
  add(union(capsule(AF[0], AF[1], AF[0] + 5, AF[1] + 0.8, 2, 1.3), circle(AF[0] - 0.3, AF[1] + 0.5, 1.9)), "boot", 7, { thick: 1.5 });
  // the crimson collar
  add(union(ellipse(N[0] + 0.6, N[1] + 1.2, 4.2, 2.6, P.lean), ellipse(N[0] - 1.5, N[1] + 2.4, 3, 1.8)), "crimson", 8, { thick: 2 });

  // ---- her head: a big spiky mass of red hair over a small face ----
  add(union(circle(HC[0], HC[1], 6.4), poly([[HC[0] - 2.5, HC[1] + 2], [HC[0] + 5.6, HC[1] + 1], [HC[0] + 6, HC[1] + 4.4], [HC[0] + 2.4, HC[1] + 7.2], [HC[0] - 1.5, HC[1] + 6]])), "skin", 9, { thick: 3, decal(put) {
    // a big anime eye: a heavy lash line, a crimson-amber iris, two highlights; a tiny mouth
    const ex = HC[0] + 3.2, ey = HC[1] + 1.2;
    for (let k = -1; k <= 2; k++) put(ex + k, ey - 2, "#160810");
    put(ex - 1, ey - 1, "#160810"); put(ex, ey - 1, "#ffffff"); put(ex + 1, ey - 1, "#e04450"); put(ex + 2, ey - 1, "#160810");
    put(ex, ey, "#ff8a50"); put(ex + 1, ey, "#b8203a"); put(ex + 2, ey, "#3a0a14");
    put(ex, ey + 1, "#ffc070"); put(ex + 1, ey + 1, "#ff8a50");
    put(HC[0] + 5, HC[1] + 4.6, "#7a3e36");
    put(HC[0] + 1, HC[1] + 3.5, "#f08070"); put(HC[0] + 2, HC[1] + 3.5, "#f08070");
  } });
  // the hair: a rounded mass, spikes swept back and up, bangs falling over the brow
  const spike = (a, len, r0, bend = 0) => { const dx = Math.cos(a), dy = Math.sin(a), mx = HC[0] + dx * len * 0.55 - dy * bend, my = HC[1] - 1 + dy * len * 0.55 + dx * bend; return stroke([[HC[0] + dx * 3, HC[1] - 1 + dy * 3, r0], [mx, my, r0 * 0.7], [HC[0] + dx * len, HC[1] - 1 + dy * len, 0.3]]); };
  const face = poly([[HC[0] + 1, HC[1] - 1.5], [HC[0] + 12, HC[1] - 3], [HC[0] + 12, HC[1] + 12], [HC[0] - 1.5, HC[1] + 12], [HC[0] - 0.5, HC[1] + 2]]);
  const mass = union(
    cut(ellipse(HC[0] - 0.6, HC[1] - 1.5, 7.6, 7), face),
    spike(-2.75, 13 + sf * 0.2, 3.2, -1), spike(-2.35, 13, 3.2, -1.2), spike(-1.95, 12, 3, -1), spike(-1.5, 10.5, 2.8, -0.8), spike(-1.05, 10, 2.6, -0.6), spike(3.0, 11.5, 2.8, 1),
  );
  add(mass, "hair", 10, { thick: 3.2, decal(put) {
    for (let i = 0; i < 5; i++) put(HC[0] - 5 + i * 1.4, HC[1] - 6.6 + Math.abs(i - 2) * 0.6, "5");
  } });
  add(union(
    stroke([[HC[0] + 2, HC[1] - 6.5, 2.4], [HC[0] + 5.5, HC[1] - 3.2, 1.6], [HC[0] + 7.4, HC[1] + 0.2, 0.3]]),
    stroke([[HC[0], HC[1] - 5.6, 2.1], [HC[0] + 2, HC[1] - 2.2, 1.3], [HC[0] + 2.4, HC[1] + 0.8, 0.3]]),
    stroke([[HC[0] - 1.2, HC[1] - 3, 2.2], [HC[0] - 0.8, HC[1] + 3, 1.5], [HC[0] + 0.4, HC[1] + 7.8, 0.3]]),
  ), "hair", 11, { thick: 2 });
  add(ellipse(tie[0] + 1.2, tie[1] + 0.8, 1.1, 1.8, 0.4), "crimson", 1.5, { thick: 1 });   // the hair tie, just behind the hair mass

  // ---- the sword arm, in front: a steel shoulder plate, a gauntlet, the straight sword ----
  add(ellipse(SF[0] + 0.4, SF[1] - 0.2, 3.2, 2.4, -0.3), "steel", 13, { thick: 2 });
  add(capsule(...SF, ...EF, 1.8, 1.6), "navy", 12, { thick: 1.5 });
  add(capsule(...EF, ...WF, 2.1, 1.9), "steel", 12, { thick: 1.8 });
  add(circle(...WF, 1.9), "navy", 14, { thick: 1.2 });
  const dx = Math.cos(P.sw), dy = Math.sin(P.sw), nx = -dy, ny = dx, L = 23;
  const g = [WF[0] + dx * 2.6, WF[1] + dy * 2.6], tip = [WF[0] + dx * (2.6 + L), WF[1] + dy * (2.6 + L)];
  add(poly([[g[0] + nx * 1.3, g[1] + ny * 1.3], [tip[0] - dx * 3 + nx * 1.1, tip[1] - dy * 3 + ny * 1.1], [tip[0], tip[1]], [tip[0] - dx * 3 - nx * 1.1, tip[1] - dy * 3 - ny * 1.1], [g[0] - nx * 1.3, g[1] - ny * 1.3]]), "blade", 15, { flat: 3, noContour: true, decal(put) {
    // a glowing crimson cutting edge, a white glint down the middle
    for (let i = 0; i <= L - 2; i++) { const x = g[0] + dx * i, y = g[1] + dy * i; put(x + nx * 1.1, y + ny * 1.1, i % 5 === 2 ? "#ff8a80" : "#e04450"); if (i % 3) put(x, y, "#ffffff"); }
  } });
  add(capsule(g[0] + nx * 2.8, g[1] + ny * 2.8, g[0] - nx * 2.8, g[1] - ny * 2.8, 0.9), "gold", 16, { thick: 1 });
  add(capsule(WF[0] - dx * 2.6, WF[1] - dy * 2.6, WF[0] + dx * 1.6, WF[1] + dy * 1.6, 0.9), "boot", 16, { thick: 1 });
  add(circle(WF[0] - dx * 3.2, WF[1] - dy * 3.2, 1), "gold", 16, { thick: 1 });
  return { parts, joints: { hand: WF, tip, head: HC, chest: C, hip: HP, foot: AF } };
}

export function paintKaela(P, t, opts) {
  const { parts, joints } = kaelaParts(P, t);
  return { img: paint(parts, W, H, RAMPS, opts), joints };
}
