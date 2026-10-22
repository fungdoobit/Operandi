// Flat pixel-art painter (PRD Addendum L, round 4). Isaac 2026-10-22: the
// shaded painter (painter.js) made pixel art look like 3D. This one draws the
// way a pixel artist does: every part is a sharp polygon filled with ONE flat
// colour, with a hard shadow band along its bottom-right edge, a thin light
// edge on its top-left, and a dark line round the part so parts read apart.
// No gradients, no curves-from-lighting.
//
// A part: { pts: [[x, y], ...], c: [line, shadow, base, light], z, shade: true, decal(put) }
// Polygons are filled by pixel centres, so edges come out as clean steps.

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function inside(pts, x, y) {
  let s = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    if ((by > y) !== (ay > y) && x < ((ax - bx) * (y - by)) / (ay - by) + bx) s = !s;
  }
  return s;
}

export function paintFlat(parts, w, h, { outline = "#0e0a12", flash = false, sw = 1, sh = 1 } = {}) {
  const N = w * h, owner = new Int16Array(N).fill(-1), col = new Array(N).fill(null);
  const sorted = parts.map((p, i) => ({ ...p, i })).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  sorted.forEach((p, k) => {
    const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
    const mine = new Set();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(p.pts, x + 0.5, y + 0.5)) mine.add(y * w + x);
    const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mine.has(y * w + x);
    const [line, shadow, base, light] = p.c;
    for (const o of mine) {
      const x = o % w, y = (o / w) | 0;
      let c = base;
      if (p.shade !== false) {
        // a hard shadow band along the bottom-right edge, a 1-px light edge top-left
        if (!has(x + 1 + sw, y) || !has(x, y + 1 + sh) || !has(x + 1, y + 1)) c = shadow;
        else if (light && (!has(x - 1, y) || !has(x, y - 1))) c = light;
      }
      // the part's own dark line on its edge (not on its top-left, which catches light)
      if (p.line !== false && (!has(x + 1, y) || !has(x, y + 1)) ) c = line;
      if (p.line !== false && (!has(x - 1, y) || !has(x, y - 1)) && owner[o] >= 0) c = line;   // where it overlaps another part
      owner[o] = k; col[o] = c;
    }
  });
  const img = new ImageData(w, h), D = img.data, ink = hexRGB(outline);
  const put = (o, rgb) => { D[o * 4] = rgb[0]; D[o * 4 + 1] = rgb[1]; D[o * 4 + 2] = rgb[2]; D[o * 4 + 3] = 255; };
  for (let o = 0; o < N; o++) if (col[o]) put(o, hexRGB(col[o]));
  // detail pixels
  for (const p of sorted) if (p.decal) p.decal((x, y, hex) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; put(y * w + x, hexRGB(hex)); col[y * w + x] = hex; });
  // the outer outline: one dark pixel round the whole silhouette
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && col[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (filled(x, y)) continue;
    if (filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1)) put(y * w + x, ink);
  }
  if (flash) for (let o = 0; o < N; o++) if (D[o * 4 + 3]) D[o * 4] = D[o * 4 + 1] = D[o * 4 + 2] = 255;
  return img;
}
