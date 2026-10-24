// A marshmallow on a stick, for NOVA's visit to PYRO (Isaac 2026-10-24). Painted straight in art
// pixels like her pizza (nova-pizza.js): flat colours, a light edge top-left, a shaded edge bottom-right,
// a 1-px dark outline, and her see-through purple telekinesis haze round it. The stick runs from where
// she holds it (hx, hy) to the tip (tx, ty); the marshmallow sits on the tip end.
// heat 0..1 toasts it: white, cream, gold, golden brown. The tip goes brown first (that end is in the
// flame) and the colour breaks up with dithering. spin turns it, so the toasting slides round it.

const OUTLINE = [42, 18, 8];
const WOOD = [[226, 170, 70], [160, 100, 52], [110, 70, 70]];   // lit, body, shaded (a gnarly twig, Isaac's reference)
const TOAST = [[252, 248, 240], [246, 230, 196], [236, 196, 112], [212, 148, 62], [176, 100, 42]];   // white to golden brown
const HAZE = [[[44, 18, 88], 72], [[90, 42, 166], 128], [[154, 98, 234], 204]];   // her glow, as on the pizza
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const h1 = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h1(ix + iy * 57), b = h1(ix + 1 + iy * 57), c = h1(ix + (iy + 1) * 57), d = h1(ix + 1 + (iy + 1) * 57);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

const L = 12, R = 6.5;   // the marshmallow (Isaac 2026-10-24, from his reference): a chunky block with flat ends, 12 art px long and 13 across
const mask = document.createElement("canvas"), mg = mask.getContext("2d", { willReadFrequently: true });   // the stick
const mallow = document.createElement("canvas"), kg = mallow.getContext("2d", { willReadFrequently: true });   // the marshmallow

// g: the art-pixel canvas to draw on.
export function drawMallow(g, hx, hy, tx, ty, { heat = 0, t = 0, spin = 0 } = {}) {
  const pad = 16, x0 = Math.floor(Math.min(hx, tx)) - pad, y0 = Math.floor(Math.min(hy, ty)) - pad;
  const w = Math.ceil(Math.abs(tx - hx)) + 2 * pad + 2, h = Math.ceil(Math.abs(ty - hy)) + 2 * pad + 2;
  for (const c of [mask, mallow]) { c.width = w; c.height = h; }
  const len = Math.hypot(tx - hx, ty - hy) || 1, ux = (tx - hx) / len, uy = (ty - hy) / len;   // along the stick, toward the tip
  // the stick, and a capsule for the marshmallow whose far end just pokes past the tip
  mg.lineWidth = 2; mg.strokeStyle = "#a06434"; mg.beginPath(); mg.moveTo(hx - x0, hy - y0); mg.lineTo(tx - x0, ty - y0);
  // a little twig sticking out near her end, like the reference
  const bx = hx + ux * len * 0.16 - x0, by = hy + uy * len * 0.16 - y0, ba = Math.atan2(uy, ux) + 0.75;
  mg.moveTo(bx, by); mg.lineTo(bx + Math.cos(ba) * 7, by + Math.sin(ba) * 7); mg.stroke();
  // the block sits on the stick with its far end 4 px short of the tip, so the stick pokes out of it
  const cx = tx - ux * (L / 2 + 4) - x0, cy = ty - uy * (L / 2 + 4) - y0;
  kg.save(); kg.translate(cx, cy); kg.rotate(Math.atan2(uy, ux));
  kg.fillStyle = "#fff"; kg.beginPath(); kg.roundRect(-L / 2, -R, L, 2 * R, 1.8); kg.fill(); kg.restore();
  const S = mg.getImageData(0, 0, w, h).data, M = kg.getImageData(0, 0, w, h).data, out = new Uint8ClampedArray(w * h * 4);
  const inS = (x, y) => x >= 0 && y >= 0 && x < w && y < h && S[(y * w + x) * 4 + 3] > 127;
  const inM = (x, y) => x >= 0 && y >= 0 && x < w && y < h && M[(y * w + x) * 4 + 3] > 127;
  const solid = (x, y) => inS(x, y) || inM(x, y);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    let c = null;
    if (inM(x, y)) {
      // where this pixel is on the marshmallow: a along it (0 = the stick end, 1 = the tip), v across it (-1 .. 1)
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, a = (dx * ux + dy * uy + L / 2) / L, v = (-dx * uy + dy * ux) / R;
      // toasting: the tip first, breaking up with noise and with the way it is turned
      const facing = v * Math.sign(ux || 1);   // > 0 on the side facing down, toward the flame: it browns first
      const hh = Math.max(0, Math.min(1, heat * 1.25 - (1 - a) * 0.12 + facing * 0.16 * Math.min(1, heat * 2) + (vnoise(a * 5 + spin * 0.5, v * 3 + spin) - 0.5) * 0.28 + Math.sin(v * 2.2 + spin) * 0.06));
      const step = Math.max(0, Math.min(4, Math.floor(hh * 4 + (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9)));
      c = TOAST[step];
      if (!inM(x - 1, y - 1)) c = mix(c, [255, 255, 250], 0.5);                 // lit edge, top-left
      else if (!inM(x + 1, y + 1)) c = mix(c, mix([140, 160, 182], [120, 70, 40], heat), 0.38);   // shaded edge, bottom-right: cool grey-blue on white, brown once toasted
      else if (v > 0.45 + Math.sin(spin) * 0.25) c = mix(c, [150, 96, 60], 0.12);   // the turned-away side is a touch darker
    } else if (inS(x, y)) {
      c = !inS(x - 1, y - 1) ? WOOD[0] : !inS(x + 1, y + 1) ? WOOD[2] : WOOD[1];
    } else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) c = OUTLINE;
    if (c) { out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; }
  }
  // her telekinesis round it: the dithered purple haze, as on the pizza
  const dist = new Float32Array(w * h).fill(99);
  for (let i = 0; i < w * h; i++) if (out[i * 4 + 3]) dist[i] = 0;
  for (let pass = 0; pass < 2; pass++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const yy = pass ? h - 1 - y : y, xx = pass ? w - 1 - x : x, i = yy * w + xx, s2 = pass ? -1 : 1;
    const a1 = xx - s2 >= 0 && xx - s2 < w ? dist[i - s2] + 1 : 99, a2 = yy - s2 >= 0 && yy - s2 < h ? dist[i - s2 * w] + 1 : 99;
    dist[i] = Math.min(dist[i], a1, a2);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, d = dist[i];
    if (!d || d > 5) continue;
    const gas = Math.exp(-(d - 1) * 0.5) * (0.3 + 0.85 * vnoise(x * 0.28 + x0, y * 0.28 + y0 + t * 1.6));
    const lv = gas * 3 + (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.45;
    const [c, al] = lv > 2 ? HAZE[2] : lv > 1 ? HAZE[1] : lv > 0.5 ? HAZE[0] : [null, 0];
    if (c) { const o = i * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = al; }
  }
  const img = new ImageData(out, w, h);
  mg.putImageData(img, 0, 0);
  g.drawImage(mask, Math.round(x0), Math.round(y0));
}
