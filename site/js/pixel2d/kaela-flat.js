// KAELA round 4 (PRD Addendum L), on the flat painter (flat.js), drawn over
// Isaac's reference (the blue-haired swordswoman), recoloured red: thin and
// sharp, no bulky clothes, small boots. A high ponytail tied with a gold band
// sweeping up and back, smooth swept hair with a few sharp points, a navy
// mask over her mouth, puffed crimson collar, a short navy cape behind, a
// slim navy top and trousers, pale sleeves, dark knee guards, short boots with
// gold bands. Legs planted wide and straight; the sword hangs from her hand
// down to the floor behind her front foot; the other hand rests at her hip.
// Faces right. A still idle for the style check: canvas 64x76, about 66 px tall.
import { paintFlat } from "./flat.js";

export const W = 64, H = 76;
const C = {
  hair: ["#4a0812", "#9a1622", "#d8282c", "#ff6a48"],
  skin: ["#6a2e26", "#c47a5c", "#f2b48c", "#ffd8b8"],
  navy: ["#05070e", "#141a30", "#222c4c", "#34446e"],
  collar: ["#2a0610", "#6e0e1e", "#a8182c", "#e0404a"],
  sleeve: ["#2a3444", "#7e8aa0", "#b8c4d6", "#e6eef8"],
  cape: ["#04050a", "#0c1022", "#161e38", "#222c4c"],
  belt: ["#1a0e06", "#3a2412", "#5a3a1e", "#7a5430"],
  gold: ["#5a3a06", "#b8801a", "#e6b23a", "#fff0a0"],
  guard: ["#08080c", "#1c1c26", "#2e2e3c", "#4a4a5c"],
  legs: ["#05070e", "#1e2a4a", "#2e3e68", "#46588c"],
  blade: ["#2a3448", "#9aa8bc", "#dfe8f4", "#ffffff"],
};

export function kaelaFlatParts(t = 0) {
  const b = Math.round(Math.sin(t * 2.4) * 0.5 + 0.5);   // a 1-px breathing bob for the upper body
  const up = (pts) => pts.map(([x, y]) => [x, y - b]);
  const P = [];
  const add = (pts, c, z, o = {}) => P.push({ pts, z, ...o, c: o.c || C[c] });

  // ---- behind: the cape, the ponytail ----
  add(up([[21, 24], [25, 25], [25, 36], [22, 46], [17, 52], [11, 55], [14, 47], [17, 36]]), "cape", 0);
  add(up([[24, 11], [21, 7], [17, 5], [10, 6], [15, 8], [8, 11], [16, 11], [21, 13]]), "hair", 0.5, { c: ["#3a0610", "#6e1018", "#9a1622", "#c42028"] });
  add(up([[25, 10], [23, 6], [20, 2], [15, 0], [18, 3], [12, 2], [17, 6], [13, 7], [19, 9], [22, 12]]), "hair", 1);

  // ---- the far leg ----
  add([[24, 39], [28, 39], [25, 48], [21, 48]], "legs", 2);
  add([[20, 47], [25, 47], [25, 52], [20, 52]], "guard", 3);
  add([[21, 52], [24, 52], [24, 64], [20, 64]], "legs", 2);
  add([[20, 63], [24, 63], [24, 70], [25, 72], [18, 72], [19, 70]], "guard", 3, { decal: (put) => { for (let x = 20; x <= 23; x++) put(x, 66, "#e6b23a"); } });

  // ---- the far arm (holds the sword), behind the body ----
  add(up([[20, 25], [24, 26], [24, 32], [21, 33]]), "sleeve", 4);
  add(up([[21, 32], [24, 32], [27, 36], [24, 38]]), "sleeve", 4, { decal: (put) => { put(23, 34 - b, "#7e8aa0"); put(24, 35 - b, "#7e8aa0"); } });

  // ---- the body ----
  add(up([[24, 24], [32, 24], [33, 30], [31, 36], [25, 36], [23, 30]]), "navy", 5, { decal: (put) => { for (let y = 25; y < 34; y++) put(28, y - b, "#34446e"); } });
  add(up([[24, 35], [32, 35], [32, 38], [24, 38]]), "belt", 6, { shade: false, decal: (put) => { put(29, 36 - b, "#e6b23a"); put(30, 36 - b, "#fff0a0"); put(29, 37 - b, "#b8801a"); put(30, 37 - b, "#e6b23a"); } });
  add([[24, 37], [32, 37], [33, 41], [23, 41]], "legs", 5);

  // ---- the near leg ----
  add([[29, 40], [33, 40], [36, 48], [33, 49]], "legs", 7);
  add([[33, 47], [38, 47], [38, 52], [33, 52]], "guard", 8);
  add([[34, 52], [37, 52], [39, 64], [35, 64]], "legs", 7);
  add([[35, 63], [39, 63], [39, 69], [42, 71], [42, 72], [35, 72]], "guard", 8, { decal: (put) => { for (let x = 36; x <= 38; x++) put(x, 66, "#e6b23a"); } });

  // ---- collar and head ----
  add(up([[16, 21], [24, 19], [27, 23], [24, 29], [17, 28]]), "collar", 9);
  add(up([[29, 20], [36, 20], [40, 24], [37, 30], [30, 28]]), "collar", 11);
  add(up([[24, 20], [31, 20], [31, 25], [25, 25]]), "collar", 10);
  add(up([[27, 12], [33, 13], [35, 17], [33, 21], [28, 22], [26, 18]]), "skin", 12, { decal: (put) => {
    // the eye: a dark lash line over a crimson iris with a white glint
    for (const x of [31, 32, 33, 34]) put(x, 14 - b, "#1a0a10");
    put(31, 15 - b, "#1a0a10"); put(32, 15 - b, "#ffffff"); put(33, 15 - b, "#dc3a44");
    put(32, 16 - b, "#ff8a6a"); put(33, 16 - b, "#7e1226");
    put(31, 12 - b, "#7a3e36"); put(32, 12 - b, "#7a3e36"); put(33, 12 - b, "#7a3e36");
  } });
  add(up([[27, 18], [35, 18], [34, 21], [30, 23], [26, 22]]), "navy", 13);   // the mask over her mouth
  // the hair: swept back, smooth, a few sharp points behind; bangs over the brow
  add(up([[21, 13], [24, 9], [30, 8], [35, 10], [35, 12], [31, 12], [29, 13], [28, 17], [26, 21], [23, 22], [23, 18], [18, 20], [21, 15], [17, 14]]), "hair", 14);
  add(up([[29, 9], [36, 10], [37, 13], [34, 12], [31, 13], [29, 12]]), "hair", 15);
  add(up([[22, 9], [25, 8], [25, 11], [22, 11]]), "gold", 16, { shade: false });   // the hair tie

  // ---- the near arm: hand on her hip ----
  add(up([[32, 24], [35, 24], [37, 31], [34, 32]]), "sleeve", 17);
  add(up([[34, 31], [37, 31], [36, 36], [33, 37]]), "sleeve", 17, { decal: (put) => { put(34, 33 - b, "#7e8aa0"); put(35, 34 - b, "#7e8aa0"); } });
  add(up([[32, 36], [35, 36], [35, 39], [32, 39]]), "skin", 18);

  // ---- the sword: hanging from her far hand down to the floor ----
  add([[23, 39 - b], [27, 40 - b], [13, 70], [11, 72], [10, 70]], "blade", 19, { decal: (put) => { for (let i = 0; i < 26; i++) put(Math.round(24 - i * 0.48), 41 - b + i, "#ffffff"); } });
  add(up([[22, 37], [28, 39], [28, 40], [22, 38]]), "gold", 20, { shade: false });   // crossguard
  add(up([[24, 35], [27, 35], [27, 38], [24, 38]]), "skin", 21);   // her fist on the grip
  return P;
}

export function paintKaelaFlat(t = 0, opts) { return paintFlat(kaelaFlatParts(t), W, H, opts); }
