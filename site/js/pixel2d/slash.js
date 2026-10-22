// Kaela's Crimson Slash effect (PRD Addendum L), after the sword swing in
// Isaac's reference video, recoloured red: a big crescent painted in flat
// bands (a white-hot inner edge, then coral, scarlet and deep crimson out to
// the rim, with a dark streak running along it), thickest at the leading
// edge and breaking into jagged spikes toward the tail, plus a thin dark wisp
// trailing behind. Painted pixel by pixel on the art grid, so its edges are as
// crisp as the sprites'.

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const CRIMSON = { core: "#fff4ee", light: "#ffb0a0", mid: "#ff4646", deep: "#c2142e", streak: "#760a24", wisp: "#4a0828", wispLight: "#8a1a44" };

// Draw a slash into ImageData d (w x h).
//   c: centre, R: radius of the arc, T: its thickest width
//   head: the angle the leading edge has reached; span: how far back the tail is (radians)
//   dir: +1 sweeps clockwise on screen (y down), -1 the other way
//   thin: 0..1 (the crescent thinning away at the end)
export function drawSlash(img, { cx, cy, R, T, head, span, dir = 1, thin = 0, pal = CRIMSON, seed = 0 }) {
  const { width: w, height: h, data: D } = img, P = {}; for (const k in pal) P[k] = hexRGB(pal[k]);
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const o = (y * w + x) * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; };
  const reach = R + T * 1.6, x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(w - 1, Math.ceil(cx + reach)), y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(h - 1, Math.ceil(cy + reach));
  const TAU = Math.PI * 2;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    // how far behind the leading edge this pixel is, along the sweep
    let back = ((head - a) * dir) % TAU; if (back < 0) back += TAU;
    // the dark wisp: a thin arc a little outside, lagging behind
    const wispBack = back - span * 0.18;
    if (wispBack > 0 && wispBack < span * 0.85 && thin < 0.8) {
      const wr = R + T * 0.95 + Math.sin(wispBack * 5 + seed) * 1.5, ww = (1.6 - wispBack / span) * (1 - thin);
      if (Math.abs(r - wr) < ww) { put(x, y, Math.abs(r - wr) < ww * 0.45 ? P.wispLight : P.wisp); continue; }
    }
    if (back > span) continue;
    const u = 1 - back / span;   // 1 at the leading edge, 0 at the tail
    // thickness: fullest just behind the head, a sharp point at the very front, thinning to the tail
    let th = T * Math.pow(u, 0.55) * (1 - thin);
    if (u > 0.9) th *= (1 - u) / 0.1 * 0.7 + 0.3;
    // spikes along the outer rim toward the tail (the jagged, flame-like tips)
    // (a few big, sharp, flame-like points, not a comb)
    let spike = 0;
    if (u < 0.5) { const f = (back * 2.4 + seed) % 1; spike = T * 1.15 * Math.pow(1 - f, 2.2) * (1 - u / 0.5) * (1 - thin); }
    const inner = R - th * 0.25, outer = R + th * 0.75 + spike;
    if (r < inner || r > outer || th < 0.6) continue;
    const q = (r - inner) / Math.max(1, outer - inner);
    let c = q < 0.34 ? P.core : q < 0.54 ? P.light : q < 0.8 ? P.mid : P.deep;
    if ((Math.abs(q - 0.66) < 0.035 || Math.abs(q - 0.46) < 0.025) && u > 0.25 && u < 0.85) c = P.streak;   // the streak running along it
    if (spike > 0 && r > R + th * 0.75) c = q > 0.85 ? P.deep : P.mid;
    put(x, y, c);
  }
}

// Little square shards of red and white flying from a hit.
export function shards(n, x, y, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x, y, vx: 40 + rnd() * 140, vy: -60 - rnd() * 120, s: rnd() < 0.3 ? 2 : 1, c: rnd() < 0.25 ? "#fff4ee" : rnd() < 0.6 ? "#ff4646" : "#c2142e" }));
}
