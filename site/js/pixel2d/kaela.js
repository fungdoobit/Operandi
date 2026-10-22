// KAELA, the first playable character (PRD Addendum L): a red-haired rogue
// assassin with a curved saber and a spear. Drawn with the 2D pixel painter
// (painter.js) from a simple rig: a pose is a few angles (joints in radians,
// y down, 0 = pointing right), and every frame is painted fresh at native
// resolution, so she moves smoothly and stays crisp. About 64 art px tall,
// facing right (toward the enemy).
import { paint, circle, ellipse, capsule, poly, stroke, union, cut, smooth, limb, lerp } from "./painter.js";

export const RAMPS = {
  skin: ["#3a1a1c", "#7a3e36", "#b8664e", "#e09a76", "#f6c4a0", "#ffe6cc"],
  hair: ["#2a060c", "#5c0e18", "#961a22", "#cc2c2a", "#ee5a3e", "#ff9a6a"],
  leather: ["#08090f", "#141826", "#1f2538", "#2e3652", "#46507a", "#6a76a2"],
  tights: ["#07070c", "#101119", "#191b27", "#252838", "#363a50", "#4c516c"],
  scarf: ["#22040c", "#4a0a18", "#7c1224", "#b01e30", "#dc3a44", "#ff7a72"],
  brown: ["#1c1008", "#3a2212", "#5c381e", "#86552c", "#ad7840", "#d6a464"],
  wrap: ["#3a3430", "#6e665c", "#a39886", "#cfc5b0", "#ebe4d2", "#fffaf0"],
  steel: ["#1a1d26", "#3e4554", "#6c7688", "#a4aebe", "#d6dde8", "#ffffff"],
  gold: ["#3a2004", "#7a4a0a", "#b8801a", "#e6b23a", "#ffdc72", "#fff6c4"],
  wood: ["#1e0f06", "#3c220e", "#5e3818", "#835024", "#a66c36", "#c88e52"],
};

// The rest pose: a low ready stance like the girl in Isaac's video, saber held
// forward and down, spear across her back.
export const POSES = {
  idle: { lean: 0.12, crouch: 0, fa: 1.95, fe: -1.25, sab: 0.32, ba: 2.15, be: -0.75, ft: 1.02, fs: 0.48, bt: 2.25, bs: -0.65, head: 0, hair: 0 },
  // Crimson Slash: the wind-up (saber cocked high behind her), the strike (swept through low in front), the follow-through
  windup: { lean: -0.12, crouch: 2, fa: -2.3, fe: -0.6, sab: -0.75, ba: 2.4, be: -0.5, ft: 0.95, fs: 0.55, bt: 2.35, bs: -0.6, head: -0.08, hair: 0.6 },
  strike: { lean: 0.42, crouch: 4, fa: 0.25, fe: -0.2, sab: 0.55, ba: 2.7, be: -0.4, ft: 0.75, fs: 0.75, bt: 2.45, bs: -0.4, head: 0.12, hair: -0.8 },
  follow: { lean: 0.32, crouch: 3, fa: 0.9, fe: 0.3, sab: 1.6, ba: 2.6, be: -0.5, ft: 0.85, fs: 0.65, bt: 2.4, bs: -0.5, head: 0.08, hair: -0.4 },
};
export const mixPose = (a, b, k) => Object.fromEntries(Object.keys(a).map((n) => [n, lerp(a[n], b[n] ?? a[n], k)]));

export const W = 120, H = 100;   // her canvas (art px); the feet stand at y = H - 5

// Build the parts for a pose at time t (s). Returns the part list.
export function kaelaParts(P, t = 0) {
  const br = Math.sin(t * 2.2) * 0.6, sway = Math.sin(t * 2.6) * 1.2;
  // the skeleton, with the hip at the origin
  const hip = [0, 0];
  const legF = limb(1.5, 0, 14, P.ft, 14, P.fs), legB = limb(-1.5, 0, 14, P.bt, 14, P.bs);
  const up = [Math.sin(P.lean) * 19, -Math.cos(P.lean) * 19 + br * 0.4];   // chest
  const neck = [up[0] + Math.sin(P.lean) * 3.5, up[1] - 3.8 + br * 0.2];
  const hc = [neck[0] + 1.2 + Math.sin(P.lean + P.head) * 6.5, neck[1] - 6.6];
  const shF = [up[0] + 1.6, up[1] + 0.8], shB = [up[0] - 1.8, up[1] + 0.4];
  const armF = limb(shF[0], shF[1], 8, P.fa, 7.5, P.fe), armB = limb(shB[0], shB[1], 8, P.ba, 7.5, P.be);
  // drop everything so the lower foot touches the ground
  const footY = Math.max(legF[2][1], legB[2][1]) + 2;
  const ox = W * 0.42, oy = H - 5 - footY + (P.crouch || 0) * 0;
  const T = ([x, y]) => [x + ox, y + oy];
  const [H0, KF, AF] = legF.map(T), [, KB, AB] = legB.map(T);
  const C = T(up), N = T(neck), HC = T(hc), SF = T(shF), SB = T(shB);
  const [, EF, WF] = armF.map(T), [, EB, WB] = armB.map(T);
  const HP = T(hip);
  const parts = [];
  const add = (s, m, z, o = {}) => parts.push({ s, m, z, ...o });

  // ---- behind her ----
  // the spear across her back: tip and tassel up over her right shoulder
  const sa = -0.95 - P.lean * 0.3, sx = Math.cos(sa), sy = Math.sin(sa);
  const sBase = [HP[0] - 13, HP[1] - 4], sTip = [sBase[0] + sx * 46, sBase[1] + sy * 46];
  add(capsule(sBase[0], sBase[1], sTip[0] - sx * 6, sTip[1] - sy * 6, 1.1), "wood", 1, { thick: 2 });
  add(poly([[sTip[0] + sx * 5, sTip[1] + sy * 5], [sTip[0] - sx * 2 - sy * 2.6, sTip[1] - sy * 2 + sx * 2.6], [sTip[0] - sx * 6.5, sTip[1] - sy * 6.5], [sTip[0] - sx * 2 + sy * 2.6, sTip[1] - sy * 2 - sx * 2.6]]), "steel", 1, { thick: 2.5, lift: 0.08 });
  const tas = [sTip[0] - sx * 7.5, sTip[1] - sy * 7.5];
  add(stroke([[tas[0], tas[1], 1.6], [tas[0] - 3 + sway * 0.5, tas[1] + 4, 1.3], [tas[0] - 5 + sway, tas[1] + 8, 0.3]]), "scarf", 1, { thick: 2 });
  // scarf tails streaming behind
  add(stroke([[N[0] - 2, N[1] + 1.5, 2.6], [N[0] - 9, N[1] + 3 + sway * 0.6, 2.3], [N[0] - 16, N[1] + 6 + sway, 1.8], [N[0] - 21, N[1] + 5 + sway * 1.6, 0.5]]), "scarf", 2, { thick: 2.5, dim: 1 });
  add(stroke([[N[0] - 2, N[1] + 2.5, 2], [N[0] - 7, N[1] + 7 + sway * 0.4, 1.8], [N[0] - 12, N[1] + 12 + sway * 0.8, 0.5]]), "scarf", 2, { thick: 2, dim: 1 });
  // the ponytail, tied high at the back of her head, swinging
  // tied at the back of her head, it falls with some weight and swings
  const tie = [HC[0] - 7.6, HC[1] - 3.2], hs = sway * 0.8 + (P.hair || 0) * 5;
  add(stroke([[tie[0], tie[1], 2.6], [tie[0] - 4 + hs * 0.2, tie[1] + 3, 3.4], [tie[0] - 6.5 + hs * 0.5, tie[1] + 9, 3.2], [tie[0] - 7 + hs * 0.9, tie[1] + 15, 2.3], [tie[0] - 5.5 + hs * 1.3, tie[1] + 21, 0.4]]), "hair", 2, { thick: 3, decal(put) {
    for (let i = 0; i < 4; i++) put(tie[0] - 3.5 - i * 0.6 + hs * (0.2 + i * 0.2), tie[1] + 4 + i * 3, "5");
  } });
  add(stroke([[tie[0] - 1, tie[1] + 2, 1.5], [tie[0] - 6 + hs * 0.6, tie[1] + 8, 1.2], [tie[0] - 9 + hs, tie[1] + 13, 0.3]]), "hair", 2, { thick: 1.5, dim: 1 });
  // far leg and arm (a step darker)
  add(capsule(...KB, ...AB, 2.4, 2.1), "brown", 3, { dim: 1 });
  add(capsule(...HP, ...KB, 3.4, 2.7), "tights", 3, { dim: 1 });
  add(capsule(AB[0], AB[1], AB[0] + 5.5, AB[1] + 1.2, 2.1, 1.5), "brown", 3, { dim: 1 });
  add(capsule(...SB, ...EB, 2.2, 1.9), "leather", 4, { dim: 1 });
  add(capsule(...EB, ...WB, 1.9, 1.7), "wrap", 4, { dim: 1 });
  add(circle(...WB, 1.9), "skin", 4, { dim: 1 });

  // ---- her body ----
  const torso = smooth(ellipse(C[0] - 0.3, C[1] + 2.5, 5.4, 6.6, P.lean), ellipse(HP[0] + Math.sin(P.lean) * 2, HP[1] - 3.5, 5.6, 4.2, P.lean * 0.5), 3);
  add(torso, "leather", 5, { thick: 4, decal(put) {   // stitched seam and a strap across the chest
    for (let i = 0; i < 9; i++) put(C[0] - 3 + i * 0.75, C[1] - 1 + i * 1.1, "2");
    for (let i = 0; i < 5; i++) put(C[0] + 2.8, C[1] + 2 + i * 1.6, "4");
  } });
  // the cowl of her scarf round her neck and shoulders
  add(union(ellipse(N[0] + 0.5, N[1] + 1.8, 5.2, 3.3, P.lean), ellipse(N[0] - 1.5, N[1] + 3.5, 3.6, 2.4)), "scarf", 8, { thick: 2.5 });
  // short split skirt-flaps and the belt with a gold buckle
  const bx = HP[0] + Math.sin(P.lean) * 1.5, by = HP[1] - 3;
  add(poly([[bx - 6.8, by], [bx + 6.4, by], [bx + 8.4, by + 7], [bx + 3, by + 4.5], [bx + 0.5, by + 8.5], [bx - 3, by + 4.6], [bx - 8.5, by + 6.5]]), "leather", 6, { thick: 3 });
  add(capsule(bx - 6.6, by, bx + 6.4, by - 0.4, 1.5), "brown", 6, { thick: 1.5, decal(put) { put(bx + 3, by - 1, "#ffdc72", false); put(bx + 4, by - 1, "#e6b23a", false); put(bx + 3, by, "#b8801a", false); put(bx + 4, by, "#ffdc72", false); } });
  // near leg: tights, a knee-high boot, the foot
  add(capsule(...HP, ...KF, 3.6, 2.9), "tights", 7, { thick: 3 });
  const bootTop = [lerp(KF[0], AF[0], 0.15), lerp(KF[1], AF[1], 0.15)];
  add(capsule(...bootTop, ...AF, 2.9, 2.4), "brown", 7, { thick: 2.5, decal(put) { for (let i = 0; i < 3; i++) put(lerp(bootTop[0], AF[0], 0.2 + i * 0.25) + 1, lerp(bootTop[1], AF[1], 0.2 + i * 0.25), "1"); } });
  add(union(capsule(AF[0], AF[1], AF[0] + 6, AF[1] + 1.5, 2.4, 1.6), circle(AF[0] - 0.5, AF[1] + 1, 2.2)), "brown", 7, { thick: 2 });
  add(ellipse(bootTop[0], bootTop[1], 3.4, 1.5, 0.2), "brown", 7, { thick: 1.5, lift: 0.1 });   // the boot cuff

  // ---- her head ----
  add(union(circle(HC[0], HC[1], 6.9), poly([[HC[0] - 3.5, HC[1] + 2.5], [HC[0] + 5.2, HC[1] + 1.2], [HC[0] + 6.6, HC[1] + 4.2], [HC[0] + 3.6, HC[1] + 7.6], [HC[0] - 1.5, HC[1] + 6.8]])), "skin", 9, { thick: 3.5, decal(put) {
    // the eye: a dark lash line over a warm amber iris with a glint; a brow; a mouth
    const ex = HC[0] + 3.3, ey = HC[1] + 1;
    put(ex - 1, ey - 1, "#1a0a10"); put(ex, ey - 1, "#1a0a10"); put(ex + 1, ey - 1, "#1a0a10");
    put(ex - 1, ey, "#5a1a10"); put(ex, ey, "#ffffff"); put(ex + 1, ey, "#c26a28");
    put(ex, ey + 1, "#e0902e"); put(ex + 1, ey + 1, "#7a2a14");
    put(ex - 0.5, ey - 3, "#5c0e18"); put(ex + 0.6, ey - 3.2, "#5c0e18"); put(ex + 1.6, ey - 2.8, "#5c0e18");
    put(HC[0] + 5, HC[1] + 5.4, "#7a3e36"); put(HC[0] + 4, HC[1] + 5.6, "#9a5040");
    put(HC[0] + 1.2, HC[1] + 3.6, "#e8806a");   // a touch of blush
  } });
  // hair: the mass over the top and back of her head, cut away round the face
  const face = poly([[HC[0] + 0.8, HC[1] - 3.4], [HC[0] + 13, HC[1] - 5], [HC[0] + 13, HC[1] + 13], [HC[0] - 1.5, HC[1] + 13], [HC[0] - 0.8, HC[1] + 1.5]]);
  add(cut(ellipse(HC[0] - 0.8, HC[1] - 1.8, 7.7, 7), face), "hair", 10, { thick: 3.5, decal(put) {
    for (let i = 0; i < 5; i++) put(HC[0] - 5 + i * 1.3, HC[1] - 7.2 + Math.abs(i - 2) * 0.5, "5");   // the shine across the top
  } });
  // bangs sweeping down over her forehead, a side lock by her cheek
  add(union(
    stroke([[HC[0] + 1.5, HC[1] - 7, 2.4], [HC[0] + 5.5, HC[1] - 4.6, 1.5], [HC[0] + 7.6, HC[1] - 2.2, 0.3]]),
    stroke([[HC[0] - 0.5, HC[1] - 6.2, 2], [HC[0] + 1.8, HC[1] - 3, 1.2], [HC[0] + 2.4, HC[1] - 0.8, 0.3]]),
    stroke([[HC[0] - 0.5, HC[1] - 3, 2.1], [HC[0] - 0.2, HC[1] + 3.5, 1.5], [HC[0] + 1, HC[1] + 8.5, 0.3]]),
  ), "hair", 11, { thick: 2.2 });
  add(ellipse(tie[0] - 0.4, tie[1] + 0.6, 1.3, 2, 0.5), "scarf", 11, { thick: 1 });   // a crimson hair tie   // the hair tie

  // ---- her saber arm, in front ----
  add(capsule(...SF, ...EF, 2.3, 2), "leather", 12, { thick: 2 });
  add(capsule(...EF, ...WF, 2.1, 1.8), "wrap", 12, { thick: 2, decal(put) { for (let i = 1; i < 4; i++) put(lerp(EF[0], WF[0], i / 4), lerp(EF[1], WF[1], i / 4) - 1, "2"); } });
  add(circle(...WF, 2), "skin", 13, { thick: 1.5 });
  // the saber: grip, a gold guard, and a long curved blade
  const fa = P.fa + P.fe + P.sab, dx = Math.cos(fa), dy = Math.sin(fa), nx = -dy, ny = dx;
  const blade = [], L = 25;
  for (let i = 0; i <= 6; i++) { const u = i / 6, c = Math.sin(u * Math.PI * 0.9) * 2.2 * u; blade.push([WF[0] + dx * (3 + u * L) + nx * c, WF[1] + dy * (3 + u * L) + ny * c, lerp(1.45, 0.25, u ** 1.4)]); }
  add(stroke(blade), "steel", 14, { thick: 1.5, lift: 0.12, decal(put) { for (let i = 1; i < 5; i++) { const b = blade[i]; put(b[0] - nx * 0.6, b[1] - ny * 0.6, "5"); } } });
  add(capsule(WF[0] + dx * 2.6 + nx * 2.4, WF[1] + dy * 2.6 + ny * 2.4, WF[0] + dx * 2.6 - nx * 2.4, WF[1] + dy * 2.6 - ny * 2.4, 1), "gold", 14, { thick: 1 });
  add(capsule(WF[0] - dx * 2.5, WF[1] - dy * 2.5, WF[0] + dx * 1.6, WF[1] + dy * 1.6, 1.1), "brown", 14, { thick: 1 });
  return { parts, joints: { hand: WF, tip: blade[blade.length - 1], head: HC, chest: C, hip: HP, foot: AF } };
}

// Paint her into an ImageData. opts: flash, tint.
export function paintKaela(P, t, opts) {
  const { parts, joints } = kaelaParts(P, t);
  return { img: paint(parts, W, H, RAMPS, opts), joints };
}
