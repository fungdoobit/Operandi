// ROTCAP redrawn as 2D pixel art (PRD Addendum L style test), with the same
// painter as Kaela: a corrupted mushroom with a bloated violet cap covered in
// glowing toxic spots, a dark gilled underside, a gnarled bone-pale stem with
// slanted green eyes and a jagged grin, stumpy legs and root arms. Faces left.
import { paint, circle, ellipse, capsule, poly, stroke, union, cut, smooth } from "./painter.js";

export const RAMPS = {
  cap: ["#120410", "#2a0a22", "#4a1238", "#6e1c52", "#94306c", "#bc5490"],
  gill: ["#0a0507", "#1a0e14", "#2c1a24", "#402834", "#563848", "#704a5e"],
  stem: ["#20160e", "#463624", "#745e44", "#a28862", "#c8b088", "#e6d6b2"],
  root: ["#140c06", "#2c1c0e", "#4a3018", "#684424", "#8a5c34", "#ab7a48"],
  spot: ["#0c2408", "#24500e", "#46881a", "#7cc42a", "#bcec5e", "#f0ffc0"],
};
export const W = 96, H = 88;
export const REST = { lean: 0, wind: 0, atk: 0, squash: 0, mouth: 0 };

export function rotcapParts(P, t = 0) {
  const br = Math.sin(t * 2.4) * 0.7, step = Math.sin(t * 1.3) * 0.6;
  const lean = P.lean - P.atk * 0.35 + P.wind * 0.22, sq = P.squash;
  const cx = 50, gy = H - 5;
  // bend the body about the feet: a point at height h moves sideways by lean
  const B = (x, y) => { const hgt = gy - y; return [x - Math.sin(lean) * hgt * 0.9, gy - hgt * (1 - sq * 0.25) * Math.cos(lean * 0.5)]; };
  const parts = [], add = (s, m, z, o = {}) => parts.push({ s, m, z, ...o });
  // stumpy legs and round feet
  for (const [dx, z, dim] of [[7, 2, 1], [-5, 6, 0]]) {
    const k = B(cx + dx, gy - 12), a = [cx + dx + (dx > 0 ? 1 : -1), gy - 3 + (dx > 0 ? step : -step) * 0.5];
    add(capsule(...k, ...a, 5, 4.2), "stem", z, { dim, thick: 3 });
    add(union(ellipse(a[0] - 2.5, gy - 1.6, 6.8, 3), circle(a[0] - 7, gy - 1.2, 2), circle(a[0] - 3.5, gy - 0.8, 2)), "root", z, { dim, thick: 2 });
  }
  // the back root arm
  const ab = B(cx + 9, gy - 30);
  add(stroke([[ab[0], ab[1], 2.6], [ab[0] + 7, ab[1] + 5, 1.8], [ab[0] + 9, ab[1] + 1, 0.6]]), "root", 3, { dim: 1, thick: 2 });
  // the stem: gnarled, swelling at the base
  const s0 = B(cx, gy - 10), s1 = B(cx - 1, gy - 40 + br * 0.3);
  add(union(capsule(...s0, ...s1, 12, 9.5), ellipse(s0[0], s0[1] - 2, 12.5, 7)), "stem", 4, { thick: 6, decal(put) {
    // bark grooves
    for (let i = 0; i < 7; i++) put(s0[0] + 6, s0[1] - 6 - i * 3 + (i % 2), "2");
    for (let i = 0; i < 5; i++) put(s0[0] - 7, s0[1] - 4 - i * 4, "2");
    // mottled bark
    for (let i = 0; i < 26; i++) { const a = i * 2.39, r = (i * 37 % 11); put(s0[0] - 9 + r * 1.6, s0[1] - 4 - (i * 13 % 26), i % 3 ? "2" : "1"); }
  } });
  // the face, on the side turned toward Kaela: slanted glowing eyes under a heavy brow, a wide fanged maw
  const e = B(cx - 6, gy - 34 + br * 0.3), m = B(cx - 6, gy - 25), open = 1.5 + P.mouth * 3.5;
  for (const [ex, ey, sgn] of [[e[0] - 4.5, e[1], 1], [e[0] + 4.5, e[1] + 0.6, -1]]) {
    add(cut(ellipse(ex, ey, 3.2, 2.2, 0.15 * sgn), poly([[ex - 6, ey - 6], [ex + 6, ey - 6 + sgn * 3.5], [ex + 6, ey - 0.6 + sgn * 1.2], [ex - 6, ey - 0.6 - sgn * 1.2]])), "spot", 10, { flat: 4, noContour: true, decal(put) { put(ex - 1, ey, "#f8ffd8"); put(ex, ey, "#f8ffd8"); } });
  }
  add(poly([[m[0] - 8, m[1] - 1], [m[0] - 4, m[1] - 2], [m[0], m[1] - 1.5], [m[0] + 4, m[1] - 2.2], [m[0] + 7, m[1] - 1], [m[0] + 5, m[1] + open], [m[0] + 1, m[1] + open + 1], [m[0] - 5, m[1] + open + 0.5]]), "gill", 10, { flat: 1, decal(put) {
    for (let i = -6; i <= 5; i += 2.5) { put(m[0] + i, m[1] - 1, "#e6d6b2"); put(m[0] + i, m[1], "#c8b088"); }   // upper fangs
    for (let i = -4; i <= 4; i += 3) put(m[0] + i, m[1] + open, "#c8b088");
    put(m[0] - 1, m[1] + open - 1, "#7cc42a");   // toxic drool
  } });
  // the front root arm
  const af = B(cx - 9, gy - 28), reach = P.atk * 8 - P.wind * 4;
  add(stroke([[af[0], af[1], 2.8], [af[0] - 8 - reach, af[1] + 4, 2], [af[0] - 12 - reach, af[1] - 1, 1.2], [af[0] - 13 - reach, af[1] - 5, 0.4]]), "root", 7, { thick: 2 });
  // the gills under the cap, then the bloated cap
  const c = B(cx - 1, gy - 50 + br * 0.4), tilt = -lean * 0.8 + 0.08;
  add(ellipse(c[0], c[1] + 6, 25, 5.5, tilt), "gill", 5, { thick: 3, decal(put) { for (let i = -10; i <= 10; i++) put(c[0] + i * 2.2, c[1] + 6 + Math.abs(i) * 0.12, "0"); } });
  const dome = cut(smooth(ellipse(c[0], c[1], 28, 18, tilt), ellipse(c[0] + 2, c[1] - 9, 15, 10, tilt), 6), poly([[c[0] - 40, c[1] + 5 + tilt * 30], [c[0] + 40, c[1] + 5 - tilt * 30], [c[0] + 40, c[1] + 40], [c[0] - 40, c[1] + 40]]));
  add(dome, "cap", 8, { thick: 7, decal(put) {
    for (let i = 0; i < 8; i++) put(c[0] - 14 + i * 1.6, c[1] - 12 - Math.sin(i * 0.4) * 2, "5");   // the sheen
  } });
  // glowing toxic spots
  for (const [dx, dy, r] of [[-16, -1, 3.8], [-5, -9, 2.4], [7, -3, 4.4], [19, 1, 2.2], [-9, 3.5, 1.6], [1, -15, 1.8], [14, -12, 1.4], [-20, -8, 1.3], [11, 3, 1.4]]) {
    add(ellipse(c[0] + dx, c[1] + dy, r * 1.15, r * 0.85, tilt), "spot", 9, { thick: 2, lift: 0.15, noContour: true });
  }
  return { parts, joints: { core: B(cx, gy - 34), head: c, mouth: B(cx - 5, gy - 26), foot: [cx, gy] } };
}

export function paintRotcap(P, t, opts) {
  const { parts, joints } = rotcapParts(P, t);
  return { img: paint(parts, W, H, RAMPS, opts), joints };
}
