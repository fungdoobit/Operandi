// KAELA, the first playable character (PRD Addendum L), round 3 (Isaac
// 2026-10-22: round 2 "just doesn't look good"). Built after his two new
// references: the stance and build of the blue-haired swordswoman (upright,
// about five heads tall, feet planted wide, a straight sword trailing down
// from her hand, spiky hair with a high ponytail) and the outfit of the Dead
// Cells hero (big dark shoulder plates, a red scarf, a red tabard hanging down
// the front, baggy beige trousers, pale wrapped forearms, boots wrapped in
// red). Red hair, faces right, about 74 art
// px tall. Painted with the 2D pixel painter (painter.js) from a small rig.
import { paint, circle, ellipse, capsule, poly, stroke, union, cut, limb, lerp } from "./painter.js";

export const RAMPS = {
  skin: ["#3a1a1c", "#7a3e36", "#c06e52", "#e8a07c", "#f8c8a4", "#ffe8d0"],
  hair: ["#26040a", "#5a0c16", "#9a1820", "#d22a26", "#f45a36", "#ffa070"],
  navy: ["#05060b", "#0f1320", "#1a2136", "#26304e", "#36456e", "#4e6294"],
  crimson: ["#1e030a", "#480916", "#7e1226", "#b41e34", "#dc3a44", "#ff7a6c"],
  beige: ["#22180f", "#5a4632", "#8a7254", "#b49c76", "#d4c09a", "#eee0bc"],
  wrap: ["#16222c", "#3e5c6c", "#6e98aa", "#a2c8d6", "#d0ecf4", "#ffffff"],
  boot: ["#0a0706", "#1e140e", "#342418", "#4a3522", "#63482e", "#80603e"],
  leather: ["#140a06", "#34200f", "#563619", "#764c24", "#966632", "#b88444"],
  gold: ["#3a2004", "#7a4a0a", "#b8801a", "#e6b23a", "#ffdc72", "#fff6c4"],
  blade: ["#1a2030", "#5a6680", "#a8b4c8", "#d8e0ec", "#f4f8ff", "#ffffff"],
  wood: ["#120a06", "#2e1c10", "#4a2e18", "#664022", "#82562e", "#a0703c"],
};

// Poses: lean (body), head tilt, sword arm (fa shoulder, fe elbow, sw sword
// angle, absolute, radians, y down), back arm (ba, be), legs (front thigh/shin
// ft/fs, back thigh/shin bt/bs, absolute angles for the thighs, relative for
// the shins), flow (hair and scarf streaming back).
export const POSES = {
  // standing ready, feet wide, the sword trailing down and back from her hand
  idle: { lean: 0.03, head: 0, fa: 1.95, fe: -0.75, sw: 2.3, ba: 1.95, be: 0.3, ft: 1.05, fs: 0.38, bt: 2.12, bs: -0.4, flow: 0 },
  // the thrust: sword arm straight out in front, the sword level, a deep lunge
  thrust: { lean: 0.32, head: 0.05, fa: 0.05, fe: 0.02, sw: 0.02, ba: 2.4, be: -0.3, ft: 0.75, fs: 0.75, bt: 2.4, bs: 0.15, flow: 0.6 },
  // swept through: the sword whipped round behind her, level
  swept: { lean: 0.4, head: 0.1, fa: 2.9, fe: 0.25, sw: 3.2, ba: 0.5, be: -1.2, ft: 0.8, fs: 0.7, bt: 2.4, bs: 0.15, flow: 1 },
  // rising: the sword raised high over her head
  rise: { lean: 0.06, head: -0.15, fa: -1.6, fe: -0.3, sw: -2.2, ba: 1.4, be: -0.8, ft: 1.15, fs: 0.3, bt: 2.0, bs: -0.1, flow: 0.4 },
};
export const mixPose = (a, b, k) => Object.fromEntries(Object.keys(a).map((n) => [n, lerp(a[n], b[n] ?? a[n], k)]));

export const W = 132, H = 100;

export function kaelaParts(P, t = 0) {
  const br = Math.sin(t * 2.4) * 0.6, sway = Math.sin(t * 2.9) * 1.2, flow = P.flow || 0, sf = sway + flow * 4;
  // the skeleton, hip at the origin (y down)
  const legF = limb(2.5, 0, 14, P.ft, 13, P.fs), legB = limb(-2.5, 0, 14, P.bt, 13, P.bs);
  const up = (d) => [Math.sin(P.lean) * d, -Math.cos(P.lean) * d];
  const W0 = up(7), ch = up(19 + br * 0.3), nk = up(23 + br * 0.3);
  const hc = [nk[0] + 1.5 + Math.sin(P.head) * 2, nk[1] - 7];
  const shF = [ch[0] + 7, ch[1] + 1.5], shB = [ch[0] - 7, ch[1] + 1];
  const armF = limb(shF[0], shF[1], 10, P.fa, 9, P.fe), armB = limb(shB[0], shB[1], 10, P.ba, 9, P.be);
  const footY = Math.max(legF[2][1], legB[2][1]) + 2.5;
  const ox = W * 0.46, oy = H - 4 - footY;
  const T = ([x, y]) => [x + ox, y + oy];
  const HF = T(legF[0]), HB = T(legB[0]), [, KF, AF] = legF.map(T), [, KB, AB] = legB.map(T);
  const HP = T([0, 0]), WA = T(W0), C = T(ch), N = T(nk), HC = T(hc), SF = T(shF), SB = T(shB);
  const [, EF, WF] = armF.map(T), [, EB, WB] = armB.map(T);
  const parts = [], add = (s, m, z, o = {}) => parts.push({ s, m, z, ...o });
  const wraps = (A, B, n, put, c = "1") => { for (let i = 1; i <= n; i++) { const u = i / (n + 1), x = lerp(A[0], B[0], u), y = lerp(A[1], B[1], u); for (let k = -3; k <= 3; k++) put(x + k * 0.7, y + k * 0.25, c); } };

  // ---- behind her: the spear across her back, the scarf tails, the ponytail ----
  add(stroke([[N[0] - 2, N[1] + 2, 2.8], [N[0] - 9, N[1] + 4 + sf * 0.3, 2.6], [N[0] - 15, N[1] + 8 + sf * 0.7, 2], [N[0] - 19, N[1] + 13 + sf, 0.4]]), "crimson", 1.5, { thick: 2, dim: 1 });
  const tie = [HC[0] - 4, HC[1] - 7];
  add(union(
    stroke([[tie[0], tie[1], 2.6], [tie[0] - 3, tie[1] - 5, 2.2], [tie[0] - 7, tie[1] - 8 + sf * 0.2, 1.2], [tie[0] - 10, tie[1] - 9 + sf * 0.4, 0.3]]),
    stroke([[tie[0] - 2, tie[1] - 3, 2], [tie[0] - 7, tie[1] - 3 + sf * 0.3, 1.4], [tie[0] - 12, tie[1] - 1 + sf * 0.6, 0.3]]),
  ), "hair", 2, { thick: 2.2, decal(put) { put(tie[0] - 2, tie[1] - 5, "5"); put(tie[0] - 4, tie[1] - 7, "5"); } });
  add(stroke([[tie[0] - 2, tie[1], 1.6], [tie[0] - 6, tie[1] + 3 + sf * 0.4, 1.2], [tie[0] - 9, tie[1] + 7 + sf * 0.8, 0.3]]), "hair", 2, { thick: 1.5, dim: 1 });

  // ---- the far leg and arm, a step darker ----
  add(capsule(...HB, ...KB, 4.4, 3.8), "beige", 3, { dim: 1, thick: 3 });
  add(capsule(...KB, ...AB, 3.9, 2.6), "beige", 3, { dim: 1, thick: 3 });
  add(capsule(AB[0], AB[1] - 4.5, AB[0], AB[1], 2.8, 2.6), "boot", 3.1, { dim: 1, decal: (put) => wraps([AB[0], AB[1] - 5], [AB[0], AB[1]], 2, put, "#7e1226") });
  add(union(capsule(AB[0] - 1, AB[1] + 0.8, AB[0] + 5, AB[1] + 1.4, 2.4, 1.8)), "boot", 3.1, { dim: 1 });
  add(capsule(...SB, ...EB, 2.6, 2.2), "navy", 4, { dim: 1 });
  add(capsule(...EB, ...WB, 2.4, 2), "wrap", 4, { dim: 1, decal: (put) => wraps(EB, WB, 3, put) });
  add(union(circle(WB[0], WB[1] + 1, 2.2), capsule(WB[0], WB[1] + 1, WB[0] + Math.cos(P.ba + P.be) * 3.5, WB[1] + 1 + Math.sin(P.ba + P.be) * 3.5, 1.5, 1)), "skin", 4.1, { dim: 1 });
  add(ellipse(SB[0] - 1, SB[1] + 0.5, 6, 5, 0.2), "navy", 4.2, { dim: 1, thick: 3 });

  // ---- her body: a dark top, the belt, the red tabard ----
  const ln = P.lean;
  add(poly([[SB[0] - 1, SB[1] - 1.5], [SF[0] + 1, SF[1] - 1.5], [WA[0] + 5.5, WA[1]], [HP[0] + 6, HP[1] + 1], [HP[0] - 6, HP[1] + 1], [WA[0] - 5.5, WA[1]]]), "navy", 5, { thick: 4, decal(put) {
    for (let i = 0; i < 8; i++) put(lerp(C[0], WA[0], i / 8) + 2, lerp(C[1] + 1, WA[1], i / 8), "4");   // the light down her front seam
    for (let i = -3; i <= 3; i++) put(C[0] + i, C[1] + 4 + Math.abs(i) * 0.4, "1");   // a strap across her chest
  } });
  // the near leg: a baggy trouser leg, wrapped boot, foot
  add(capsule(...HF, ...KF, 4.6, 4), "beige", 6, { thick: 3.2, decal(put) { put(lerp(HF[0], KF[0], 0.5) - 1, lerp(HF[1], KF[1], 0.5), "2"); put(lerp(HF[0], KF[0], 0.6), lerp(HF[1], KF[1], 0.6) + 1, "2"); } });
  add(capsule(...KF, ...AF, 4.1, 2.7), "beige", 6, { thick: 3 });
  add(capsule(AF[0], AF[1] - 5, AF[0], AF[1], 3, 2.7), "boot", 6.1, { thick: 2, decal: (put) => wraps([AF[0], AF[1] - 5.5], [AF[0], AF[1]], 2, put, "#b41e34") });
  add(union(capsule(AF[0] - 1, AF[1] + 0.8, AF[0] + 6, AF[1] + 1.4, 2.6, 1.9)), "boot", 6.1, { thick: 2 });
  // the belt and the tabard hanging from it
  const bl = [WA[0] - 6, WA[1] + 1.5], brt = [WA[0] + 6.2, WA[1] + 1.5];
  add(capsule(...bl, ...brt, 1.6), "leather", 7, { thick: 1.2, decal(put) { const b = [WA[0] + 2.5, WA[1] + 1.5]; put(b[0], b[1] - 1, "#ffdc72", false); put(b[0] + 1, b[1] - 1, "#e6b23a", false); put(b[0], b[1], "#b8801a", false); put(b[0] + 1, b[1], "#ffdc72", false); put(b[0], b[1] + 1, "#7a4a0a", false); put(b[0] + 1, b[1] + 1, "#b8801a", false); } });
  const tf = sf * 0.25 + flow * 2;
  add(poly([[WA[0] - 4, WA[1] + 2], [WA[0] + 6.5, WA[1] + 2], [WA[0] + 9 - tf, WA[1] + 24], [WA[0] + 5 - tf, WA[1] + 22.5], [WA[0] + 1 - tf, WA[1] + 25], [WA[0] - 3 - tf, WA[1] + 23], [WA[0] - 5.5 - tf, WA[1] + 24]]), "crimson", 8, { thick: 3, decal(put) {
    for (let i = 3; i < 21; i++) put(WA[0] + 1.5 - tf * i / 22, WA[1] + i, "2");   // a fold down the middle
    for (let k = -1; k < 7; k++) put(WA[0] + k, WA[1] + 3, "1");   // the shadow under the belt
  } });
  // the red scarf, wrapped thick round her neck
  add(union(ellipse(N[0] + 0.5, N[1] + 1.2, 8, 4.2, ln * 0.5), ellipse(N[0] - 4.5, N[1] + 3.6, 5, 3.6, 0.3), ellipse(N[0] + 4.5, N[1] + 4.2, 4.4, 3.2, -0.2), ellipse(N[0] - 0.5, N[1] + 5, 5, 2.6)), "crimson", 9, { thick: 2.6, decal(put) {
    for (let k = -4; k <= 4; k++) put(N[0] + k, N[1] + 2.2 + Math.abs(k) * 0.15, "2");   // the wrap's fold line
  } });

  // ---- her head ----
  add(union(circle(HC[0], HC[1], 6.6), poly([[HC[0] - 2, HC[1] + 2], [HC[0] + 5.6, HC[1] + 1], [HC[0] + 5.4, HC[1] + 4.4], [HC[0] + 2.5, HC[1] + 6.8], [HC[0] - 1.5, HC[1] + 5.6]])), "skin", 10, { thick: 3, decal(put) {
    // the eye: a dark lash line, a crimson iris, a white highlight; a brow; a small mouth
    const ex = HC[0] + 3, ey = HC[1] + 1;
    for (let k = -1; k <= 2; k++) put(ex + k, ey - 1, "#160810");
    put(ex - 1, ey, "#160810"); put(ex, ey, "#ffffff"); put(ex + 1, ey, "#b41e34"); put(ex + 2, ey, "#160810");
    put(ex, ey + 1, "#dc3a44"); put(ex + 1, ey + 1, "#7e1226");
    put(ex, ey + 2, "#ff9a7c"); put(ex + 1, ey + 2, "#dc3a44");
    for (let k = -1; k <= 1; k++) put(ex + k, ey - 3, "#5a0c16");
    put(HC[0] + 5, HC[1] + 3.5, "#7a3e36");
    put(HC[0] + 3, HC[1] + 4.6, "#9a4a40"); put(HC[0] + 4, HC[1] + 4.6, "#9a4a40");
  } });
  // the hair: a mass over the crown and back of her head, spikes swept up and back, bangs over the brow
  const spike = (a, len, r0, bend = 0) => { const dx = Math.cos(a), dy = Math.sin(a), mx = HC[0] + dx * len * 0.55 - dy * bend, my = HC[1] - 1 + dy * len * 0.55 + dx * bend; return stroke([[HC[0] + dx * 3, HC[1] - 1 + dy * 3, r0], [mx, my, r0 * 0.7], [HC[0] + dx * len, HC[1] - 1 + dy * len, 0.3]]); };
  const face = poly([[HC[0] + 1, HC[1] - 2], [HC[0] + 12, HC[1] - 3], [HC[0] + 12, HC[1] + 12], [HC[0] - 1, HC[1] + 12], [HC[0] - 0.5, HC[1] + 2]]);
  const mass = union(
    cut(ellipse(HC[0] - 0.8, HC[1] - 1.4, 7.4, 7), face),
    spike(-2.6, 12, 3, -1), spike(-2.1, 12.5, 3, -1), spike(-1.7, 11, 2.8, -0.8), spike(-1.25, 10, 2.6, -0.6), spike(2.9, 10.5, 2.6, 1), spike(2.45, 10, 2.4, 1.2),
  );
  add(mass, "hair", 11, { thick: 3, decal(put) {
    for (let i = 0; i < 5; i++) put(HC[0] - 5 + i * 1.4, HC[1] - 6.4 + Math.abs(i - 2) * 0.6, "5");
  } });
  add(union(
    stroke([[HC[0] + 2, HC[1] - 6.5, 2.4], [HC[0] + 5.4, HC[1] - 3.4, 1.6], [HC[0] + 7, HC[1] - 0.4, 0.3]]),
    stroke([[HC[0] - 0.5, HC[1] - 5.4, 2.1], [HC[0] + 1.5, HC[1] - 2, 1.3], [HC[0] + 1.8, HC[1] + 1.2, 0.3]]),
    stroke([[HC[0] - 1.5, HC[1] - 2, 2.2], [HC[0] - 0.6, HC[1] + 4, 1.8], [HC[0] + 0.6, HC[1] + 9 + sf * 0.2, 0.3]]),   // a long lock framing her face
  ), "hair", 12, { thick: 2 });
  add(ellipse(tie[0] + 0.6, tie[1] + 0.6, 1.4, 2, 0.6), "crimson", 12.5, { thick: 1 });   // the hair tie

  // ---- the sword arm, in front: a big shoulder plate, a sleeve, a wrapped forearm, the sword ----
  add(capsule(...SF, ...EF, 2.6, 2.2), "navy", 13, { thick: 2 });
  add(capsule(...EF, ...WF, 2.5, 2.1), "wrap", 13, { thick: 2, decal: (put) => wraps(EF, WF, 3, put) });
  add(ellipse(SF[0] + 1, SF[1] + 0.2, 6.6, 5.4, -0.25), "navy", 14, { thick: 3.2, decal(put) {
    for (let k = -4; k <= 3; k++) put(SF[0] + k + 0.5, SF[1] - 4.2 + Math.abs(k + 0.5) * 0.3, "5");   // the rim catching the light
    for (let k = -4; k <= 4; k++) put(SF[0] + k + 1, SF[1] + 3.4, "1");   // the plate's lower edge
  } });
  const dx = Math.cos(P.sw), dy = Math.sin(P.sw), nx = -dy, ny = dx, L = 30;
  const g = [WF[0] + dx * 2.8, WF[1] + dy * 2.8], tip = [WF[0] + dx * (2.8 + L), WF[1] + dy * (2.8 + L)];
  add(poly([[g[0] + nx * 1.6, g[1] + ny * 1.6], [tip[0] - dx * 3.5 + nx * 1.5, tip[1] - dy * 3.5 + ny * 1.5], [tip[0], tip[1]], [tip[0] - dx * 3.5 - nx * 1.5, tip[1] - dy * 3.5 - ny * 1.5], [g[0] - nx * 1.6, g[1] - ny * 1.6]]), "blade", 15, { thick: 1.5, decal(put) {
    for (let i = 1; i <= L - 3; i++) { const x = g[0] + dx * i, y = g[1] + dy * i; if (i % 4) put(x, y, "#ffffff"); put(x - nx * 1, y - ny * 1, "1"); }   // the fuller's glint, the shaded flat
  } });
  add(capsule(g[0] + nx * 3.4, g[1] + ny * 3.4, g[0] - nx * 3.4, g[1] - ny * 3.4, 1.1), "gold", 16, { thick: 1 });
  add(capsule(WF[0] - dx * 3, WF[1] - dy * 3, WF[0] + dx * 1.8, WF[1] + dy * 1.8, 1.1), "leather", 16, { thick: 1 });
  add(circle(WF[0] - dx * 3.8, WF[1] - dy * 3.8, 1.3), "gold", 16, { thick: 1 });
  add(circle(WF[0], WF[1], 2.3), "skin", 17, { thick: 1.5, decal(put) { put(WF[0] - 1, WF[1], "1"); put(WF[0] + 1, WF[1], "1"); } });   // her fist round the grip
  return { parts, joints: { hand: WF, tip, head: HC, chest: C, hip: HP, foot: AF } };
}

export function paintKaela(P, t, opts) {
  const { parts, joints } = kaelaParts(P, t);
  return { img: paint(parts, W, H, RAMPS, opts), joints };
}
