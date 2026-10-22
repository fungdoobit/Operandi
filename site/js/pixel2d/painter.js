// A 2D pixel-art painter (PRD Addendum L): characters are a rig of flat
// shapes painted straight onto a small pixel grid, the way a sprite artist
// shades by hand: a 6-colour ramp per material (outline, two shadows, mid,
// light, highlight), light from the top left, highlights on the edges facing
// it and shadows on the edges facing away, coloured outlines ("selout"),
// a darker contour where a part overlaps another, and hand-placed detail
// pixels (eyes, glints). No 3D, no dithering. Because every frame is painted
// fresh from the rig, poses can move smoothly and still come out as crisp pixels.
//
// Shapes are 2D signed distance functions in art pixels (y down):
//   circle, ellipse, capsule (tapered), poly, plus union / cut. Each returns
//   { d(x, y), b: [x0, y0, x1, y1] } (b = bounds).
// A part: { s: shape, m: material, z, thick (how deep the shading reaches), lift (brighten), flat (no shading), decal(put) }.

export const circle = (cx, cy, r) => ({ d: (x, y) => Math.hypot(x - cx, y - cy) - r, b: [cx - r, cy - r, cx + r, cy + r] });
export function ellipse(cx, cy, rx, ry, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), m = Math.max(rx, ry);
  return { d: (x, y) => { const dx = x - cx, dy = y - cy, u = (c * dx + s * dy) / rx, v = (-s * dx + c * dy) / ry; return (Math.hypot(u, v) - 1) * Math.min(rx, ry); }, b: [cx - m, cy - m, cx + m, cy + m] };
}
// A tapered capsule from a (radius r1) to b (radius r2).
export function capsule(ax, ay, bx, by, r1, r2 = r1) {
  const bax = bx - ax, bay = by - ay, l2 = bax * bax + bay * bay || 1e-6, r = Math.max(r1, r2);
  return { d: (x, y) => { const h = Math.max(0, Math.min(1, ((x - ax) * bax + (y - ay) * bay) / l2)); return Math.hypot(x - ax - bax * h, y - ay - bay * h) - (r1 + (r2 - r1) * h); },
    b: [Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r] };
}
// A polygon [[x, y], ...] (exact signed distance).
export function poly(P) {
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  return { d: (x, y) => {
    let d = Infinity, s = 1;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [ax, ay] = P[j], [bx, by] = P[i], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
      const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-6)));
      d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
      const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * d;
  }, b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
// A tapered stroke through points [[x, y, r], ...] (hair locks, tails, scarves).
export function stroke(P) {
  const segs = P.slice(1).map((p, i) => capsule(P[i][0], P[i][1], p[0], p[1], P[i][2], p[2]));
  return union(...segs);
}
export const union = (...S) => ({ d: (x, y) => { let m = Infinity; for (const s of S) m = Math.min(m, s.d(x, y)); return m; }, b: [Math.min(...S.map((s) => s.b[0])), Math.min(...S.map((s) => s.b[1])), Math.max(...S.map((s) => s.b[2])), Math.max(...S.map((s) => s.b[3]))] });
export const cut = (a, b) => ({ d: (x, y) => Math.max(a.d(x, y), -b.d(x, y)), b: a.b });
export const smooth = (a, b, k) => ({ d: (x, y) => { const da = a.d(x, y), db = b.d(x, y), h = Math.max(0, Math.min(1, 0.5 + 0.5 * (db - da) / k)); return db + (da - db) * h - k * h * (1 - h); }, b: [Math.min(a.b[0], b.b[0]) - k, Math.min(a.b[1], b.b[1]) - k, Math.max(a.b[2], b.b[2]) + k, Math.max(a.b[3], b.b[3]) + k] });

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Light comes from the top left.
const LX = -0.55, LY = -0.83;

// Paint parts into an ImageData (w x h). ramps: { material: [6 hex colours] }.
// opts.flash: paint every pixel white (the hit flash); opts.tint: [r, g, b, k] mix.
export function paint(parts, w, h, ramps, { flash = false, tint = null, outline = "#0b0812" } = {}) {
  const R = {};
  for (const k in ramps) R[k] = ramps[k].map(hexRGB);
  const N = w * h, part = new Int16Array(N).fill(-1), idx = new Uint8Array(N);
  const sorted = parts.map((p, i) => ({ ...p, i })).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  sorted.forEach((p, order) => {
    p.order = order;
    const { d } = p.s, [bx0, by0, bx1, by1] = p.s.b, th = p.thick ?? 4;
    const x0 = Math.max(0, Math.floor(bx0) - 1), y0 = Math.max(0, Math.floor(by0) - 1), x1 = Math.min(w - 1, Math.ceil(bx1) + 1), y1 = Math.min(h - 1, Math.ceil(by1) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, v0 = d(px, py);
      if (v0 >= 0) continue;
      let shade;
      if (p.flat !== undefined) shade = p.flat;
      else {
        const gx = d(px + 0.5, py) - d(px - 0.5, py), gy = d(px, py + 0.5) - d(px, py - 0.5), gl = Math.hypot(gx, gy) || 1;
        const ndl = (gx * LX + gy * LY) / gl, edge = Math.max(0, Math.min(1, 1 + v0 / th));
        const v = 0.56 + 0.44 * ndl * Math.pow(edge, 0.75) + (p.lift || 0) - (p.dim || 0) * 0.16;
        shade = v > 0.9 ? 5 : v > 0.7 ? 4 : v > 0.44 ? 3 : v > 0.24 ? 2 : 1;
      }
      const o = y * w + x;
      part[o] = order; idx[o] = shade;
    }
  });
  // a darker contour where a part overlaps one behind it (not the same material)
  const out = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * w + x, me = part[o]; if (me < 0) continue;
    const P = sorted[me]; if (P.noContour) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = part[ny * w + nx];
      if (n >= 0 && n < me && sorted[n].m !== P.m && !sorted[n].noContour) { out[o] = 1; break; }
    }
  }
  const img = new ImageData(w, h), D = img.data, ink = hexRGB(outline);
  const put = (o, c, a = 255) => { D[o * 4] = c[0]; D[o * 4 + 1] = c[1]; D[o * 4 + 2] = c[2]; D[o * 4 + 3] = a; };
  for (let o = 0; o < N; o++) {
    const me = part[o];
    if (me >= 0) { const P = sorted[me]; put(o, R[P.m][out[o] ? Math.min(1, idx[o]) : idx[o]]); continue; }
    // the outline: the darkest colour of the neighbouring part ("selout"), near-black under and to the right
    const x = o % w, y = (o / w) | 0;
    let nb = -1, dark = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = part[ny * w + nx]; if (n >= 0 && (nb < 0 || n > nb)) { nb = n; dark = dx < 0 || dy < 0; }
    }
    if (nb >= 0) put(o, dark ? ink : R[sorted[nb].m][0]);
  }
  // detail pixels (eyes, glints, stitches)
  for (const P of sorted) if (P.decal) P.decal((x, y, hex, own = true) => {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = y * w + x; if (own && part[o] !== P.order) return;
    put(o, hex.startsWith("#") ? hexRGB(hex) : R[P.m][+hex]);
  });
  if (flash || tint) for (let o = 0; o < N; o++) if (D[o * 4 + 3]) {
    if (flash) { D[o * 4] = D[o * 4 + 1] = D[o * 4 + 2] = 255; continue; }
    for (let k = 0; k < 3; k++) D[o * 4 + k] += (tint[k] - D[o * 4 + k]) * tint[3];
  }
  return img;
}

// Small vector helpers for building rigs.
export const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
export const lerp = (a, b, t) => a + (b - a) * t;
// A two-bone limb: from the root, a bone of length l1 at angle a1, then l2 at a1 + a2. Returns [root, joint, end].
export function limb(x, y, l1, a1, l2, a2) {
  const jx = x + Math.cos(a1) * l1, jy = y + Math.sin(a1) * l1;
  return [[x, y], [jx, jy], [jx + Math.cos(a1 + a2) * l2, jy + Math.sin(a1 + a2) * l2]];
}
