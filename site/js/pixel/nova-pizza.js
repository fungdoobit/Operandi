// A big floppy slice of pizza for NOVA's warp idle (Isaac 2026-10-23), painted
// straight in art pixels so it matches her: flat colours, a light edge top-left,
// a shaded edge bottom-right and a 1-px dark outline. She holds it by the crust
// with telekinesis; the tip droops and wobbles, and cheese strings hang off it.
// Each bite takes the tip back a step, with a bite mark.

const PAL = {
  outline: [42, 18, 8], cheeseLt: [255, 228, 140], cheese: [246, 196, 74], cheeseDk: [214, 146, 40],
  crustLt: [228, 152, 82], crust: [180, 100, 42], crustDk: [120, 58, 24], pep: [196, 46, 40], pepLt: [234, 92, 70],
};
const KEYS = Object.keys(PAL);

const off = document.createElement("canvas");
const og = off.getContext("2d", { willReadFrequently: true });

// g: the art-pixel canvas to draw on. (x, y): where the crust's middle is held.
// dir: 1 = the slice hangs out to the right of the crust, -1 to the left.
// aim: 0 = it hangs out away from her, 1 = tipped back toward her mouth for a bite.
// flop: extra droop (radians, from its wobble spring). bites: 0..3. t: seconds.
export function drawPizza(g, x, y, { dir = 1, aim = 0, flop = 0, bites = 0, t = 0, scale = 1 } = {}) {
  const S = 30 * scale, W = 22 * scale, L = S * (1 - bites * 0.27);   // full length, crust width, what's left
  if (L <= 2) return;
  const size = Math.ceil(S * 2 + 24);
  off.width = off.height = size;
  const cx = size / 2, cy = 10;
  og.clearRect(0, 0, size, size);
  // the centre line: out from the crust, then bending down more and more (floppy)
  const N = 14, pts = [];
  const side = dir * (1 - 2 * aim);   // which way it leans: gravity always bends it back toward straight down
  let px = cx, py = cy, a0 = Math.PI / 2 - side * 0.55;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push([px, py, u]);
    const a = a0 + side * (0.5 + flop) * u * u;
    px += Math.cos(a) * (L / N); py += Math.sin(a) * (L / N);
  }
  // the slice's two edges, narrowing to the tip of the whole slice (not what's left of it)
  const half = (u) => (W / 2) * (1 - (u * L) / S) + 0.6;
  const left = [], right = [];
  pts.forEach(([X, Y, u], i) => {
    const [nx, ny] = pts[Math.min(N, i + 1)], [bx, by] = pts[Math.max(0, i - 1)];
    let tx = nx - bx, ty = ny - by; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    left.push([X - ty * half(u), Y + tx * half(u)]); right.push([X + ty * half(u), Y - tx * half(u)]);
  });
  const col = (k) => `rgb(${PAL[k].join(",")})`;
  og.fillStyle = col("cheese");
  og.beginPath(); left.forEach(([X, Y], i) => (i ? og.lineTo(X, Y) : og.moveTo(X, Y))); right.reverse().forEach(([X, Y]) => og.lineTo(X, Y)); og.closePath(); og.fill();
  // bite marks: round bites out of the end
  if (bites > 0) {
    const [ex, ey] = pts[N];
    og.globalCompositeOperation = "destination-out";
    for (const o of [-0.45, 0.1, 0.55]) { const h = half(1) * o * 2; og.beginPath(); og.arc(ex + h * Math.cos(a0), ey + h * Math.sin(a0) * 0.3, 3.2 * scale, 0, 7); og.fill(); }
    og.globalCompositeOperation = "source-over";
  }
  // pepperoni, where there's still pizza under them
  for (const [u, v] of [[0.3, -0.25], [0.42, 0.3], [0.68, 0.02]]) {
    if (u * S > L - 3 * scale) continue;
    const i = Math.round((u * S / L) * N), [X, Y] = pts[Math.min(N, i)], [lx, ly] = left[Math.min(N, i)];
    const r = 3 * scale * (1 - u * 0.3);
    og.fillStyle = col("pep"); og.beginPath(); og.arc(X + (lx - X) * v * 1.6, Y + (ly - Y) * v * 1.6, r, 0, 7); og.fill();
    og.fillStyle = col("pepLt"); og.fillRect(Math.round(X + (lx - X) * v * 1.6 - r * 0.45), Math.round(Y + (ly - Y) * v * 1.6 - r * 0.45), 1, 1);
  }
  // the crust: a fat rolled band across the top
  og.fillStyle = col("crust");
  og.beginPath(); og.ellipse(cx, cy, W / 2 + 1.5, 3.4 * scale, -dir * 0.1, 0, 7); og.fill();
  og.fillStyle = col("crustLt"); og.fillRect(Math.round(cx - W / 2 + 2), Math.round(cy - 2 * scale), Math.round(W * 0.55), 1);
  // cheese strings hanging off the end, swinging
  for (let k = 0; k < 2; k++) {
    const [ex, ey] = pts[N], len = (4 + 3 * k + Math.sin(t * 3 + k * 2) * 1.5) * scale;
    og.fillStyle = col("cheeseLt");
    const sx = ex + (k ? -2 : 1.5) * dir * scale;
    for (let j = 0; j < len; j++) og.fillRect(Math.round(sx + Math.sin(t * 4 + j * 0.5 + k) * 0.6), Math.round(ey + j), 1, 1);
    og.fillStyle = col("cheese"); og.fillRect(Math.round(sx) - 1, Math.round(ey + len), 2, 2);
  }
  // pixel pass: hard alpha, snap to the palette, light/shade edges, outline
  const img = og.getImageData(0, 0, size, size), D = img.data;
  const at = (X, Y) => X >= 0 && Y >= 0 && X < size && Y < size && D[(Y * size + X) * 4 + 3] > 127;
  const out = new Uint8ClampedArray(D.length);
  for (let Y = 0; Y < size; Y++) for (let X = 0; X < size; X++) {
    const o = (Y * size + X) * 4;
    if (D[o + 3] > 127) {
      let best = "cheese", bd = 1e9;
      for (const k of KEYS) { const c = PAL[k], d = (c[0] - D[o]) ** 2 + (c[1] - D[o + 1]) ** 2 + (c[2] - D[o + 2]) ** 2; if (d < bd) { bd = d; best = k; } }
      if (best === "cheese" && !at(X - 1, Y - 1)) best = "cheeseLt";
      else if (best === "cheese" && !at(X + 1, Y + 1)) best = "cheeseDk";
      else if (best === "crust" && !at(X + 1, Y + 1)) best = "crustDk";
      const c = PAL[best]; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    } else if (at(X - 1, Y) || at(X + 1, Y) || at(X, Y - 1) || at(X, Y + 1)) {
      const c = PAL.outline; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
  }
  // her telekinesis round it: a flickering 2-px aura in her magic purples, dithered on the outside
  for (let Y = 0; Y < size; Y++) for (let X = 0; X < size; X++) {
    const o = (Y * size + X) * 4;
    if (out[o + 3]) continue;
    let near = 9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const q = ((Y + dy) * size + X + dx) * 4;
      if (Y + dy >= 0 && Y + dy < size && X + dx >= 0 && X + dx < size && out[q + 3] && PAL.outline[0] === out[q] && out[q + 1] === PAL.outline[1]) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
    }
    if (near > 2) continue;
    const flick = ((X * 7 + Y * 13 + Math.floor(t * 12)) % 5) === 0;
    if (near === 2 && ((X + Y) & 1 || flick)) continue;
    const c = near === 1 ? (flick ? [243, 230, 255] : [160, 102, 240]) : [120, 56, 208];
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  img.data.set(out); og.putImageData(img, 0, 0);
  g.drawImage(off, Math.round(x - cx), Math.round(y - cy));
}
