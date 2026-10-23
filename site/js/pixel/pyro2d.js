// PYRO as real pixel art (PYRO revamp, Isaac 2026-10-23: "stick close to the original").
// His own outline, tufts, eyes, mouth and colours from dot.js, painted straight in
// art pixels each frame instead of filtering the SVG:
//   - the body in flat bands of his gradient (pale gold top-left to red), with a
//     one-pixel checker only where two bands meet, a darker rim low on the right,
//     a crisp dark outline and hand-placed shine;
//   - his three tufts burn as animated fire like Isaac's fire packs: crisp bands
//     from a white-hot core to a dark red edge, tongues that whip and lean, tips
//     that break off into wisps and fade, embers drifting up.
// Coordinates: dot.js units (his viewBox), scaled by S art px per unit.
import { GEO, SKINS, GROUND, CX } from "../dot.js";

const BODY_COL = ["#a3301a", "#d8462a", "#f2703a", "#ff9a48", "#ffc25e", "#ffe7a6"];
const FIRE_COL = ["#8a1a0c", "#d8401a", "#ff7a22", "#ffb230", "#ffe066", "#fff8d8"];
const OUTLINE = "#4a1206", EYE_INK = "#3a0c04", EYE = "#fffaf0", GLOW = "#ff8a30";
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BODY_RGB = BODY_COL.map(hex), FIRE_RGB = FIRE_COL.map(hex), OUT_RGB = hex(OUTLINE), INK_RGB = hex(EYE_INK), EYE_RGB = hex(EYE), GLOW_RGB = hex(GLOW);

// value noise for the fire's flicker
const h1 = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = h1(ix + iy * 57), b = h1(ix + 1 + iy * 57), c = h1(ix + (iy + 1) * 57), d = h1(ix + 1 + (iy + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export class Pyro2D {
  // canvas: drawn at its own size in art px. S: art px per dot.js unit.
  constructor(canvas, { S = 0.32 } = {}) {
    this.cv = canvas; this.g = canvas.getContext("2d", { willReadFrequently: true });
    this.S = S;
    this.mask = document.createElement("canvas");
    this.mg = this.mask.getContext("2d", { willReadFrequently: true });
    this.mood = "idle"; this.blink = 1; this.energy = 1; this.lean = 0;
  }
  setMood(m) { this.mood = m; }

  // His outline this frame: the body wobbling softly, the tufts rising out of the top.
  outline(t) {
    const G = GEO.pyro, spec = SKINS.pyro.flames;
    const size = { sad: 0.45, sleepy: 0.55, happy: 1.25, celebrate: 1.6 }[this.mood] || 1;
    const fl = spec.map(({ x, top, w, h, p }) => ({ cx: x + Math.sin(t * 2.6 + p) * 1.5 - this.lean * 12, w, top, p,
      H: h * size * (1 + 0.1 * Math.sin(t * 3.6 + p) + 0.05 * Math.sin(t * 5.9 + p * 2)) }));
    const base = G.anchors.map(([x, y], i) => {
      const a = G.angle[i], g = G.grip[i];
      return [x + Math.cos(a) * Math.sin(t * 2.1 + a * 3) * 1.6 * g, y + Math.sin(a) * Math.sin(t * 1.7 + a * 2) * 1.6 * g];
    });
    const pts = base.map(([px, py], i) => {
      if (G.top[i] > 0) for (const f of fl) { const k = Math.exp(-(((px - f.cx) / f.w) ** 4)); py -= f.H * k * G.top[i]; }
      return [px, py];
    });
    return { pts, base, fl };
  }

  draw(t) {
    const W = this.cv.width, H = this.cv.height, S = this.S, g = this.g;
    // dot.js units → art px: centred, his ground near the bottom
    const ox = W / 2 - CX * S, oy = H - 4 - GROUND * S;
    const X = (u) => ox + u * S, Y = (v) => oy + v * S;
    const { pts, base, fl } = this.outline(t);

    // 1. masks: body (1) and fire (2), drawn with canvas paths then hard-thresholded
    this.mask.width = W; this.mask.height = H;
    const mg = this.mg;
    mg.clearRect(0, 0, W, H);
    mg.fillStyle = "#f00"; mg.beginPath();
    pts.forEach(([u, v], i) => (i ? mg.lineTo(X(u), Y(v)) : mg.moveTo(X(u), Y(v))));
    mg.closePath(); mg.fill();
    // the flame tongues above each tuft: S-curves that whip and lean, plus the wisp breaking off
    mg.fillStyle = "#0f0";
    for (const f of fl) {
      const base = f.top - f.H + 6, hT = (f.H * 1.25 + 14) * this.energy, wB = f.w * 0.9;
      const L = [], R = [], N = 10;
      for (let i = 0; i <= N; i++) {
        const k = i / N, y = base - hT * k;
        const sx = f.cx + (Math.sin(k * 4.2 - t * 7 + f.p) * 5 + Math.sin(k * 8 - t * 11 + f.p * 2) * 1.5) * k - this.lean * 20 * k * k;
        const hw = wB * (1 - k) ** 0.8 * (1 + 0.12 * Math.sin(t * 9 + f.p + k * 5));
        L.push([sx - hw, y]); R.push([sx + hw, y]);
      }
      mg.beginPath(); L.forEach(([u, v], i) => (i ? mg.lineTo(X(u), Y(v)) : mg.moveTo(X(u), Y(v)))); R.reverse().forEach(([u, v]) => mg.lineTo(X(u), Y(v))); mg.closePath(); mg.fill();
      for (let k = 0; k < 2; k++) {   // wisps rising off the tip, shrinking away
        const u = (t * 1.3 + f.p * 0.37 + k * 0.5) % 1, wy = base - hT * (0.85 + u * 0.7), wx = f.cx + Math.sin(t * 3 + f.p + k) * 4;
        const r = wB * 0.35 * (1 - u);
        if (r * S > 0.5) { mg.beginPath(); mg.arc(X(wx), Y(wy), r * S, 0, 7); mg.fill(); }
      }
    }
    const md = mg.getImageData(0, 0, W, H).data;
    const kind = new Uint8Array(W * H);   // 0 empty, 1 body, 2 fire
    for (let i = 0; i < W * H; i++) kind[i] = md[i * 4] > 127 ? 1 : md[i * 4 + 1] > 127 ? 2 : 0;
    // the tufts are fire: whatever pokes out above his plain head outline (pushed a few
    // units down, with a flickering edge so it isn't a hard line)
    mg.clearRect(0, 0, W, H); mg.fillStyle = "#f00"; mg.beginPath();
    base.forEach(([u, v], i) => (i ? mg.lineTo(X(u), Y(v + 7)) : mg.moveTo(X(u), Y(v + 7))));
    mg.closePath(); mg.fill();
    const hd = mg.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (kind[i] !== 1) continue;
      const inHead = hd[i * 4] > 127;
      if (y > Y(58)) continue;   // only on top of his head (not round the notch on his side)
      if (!inHead) kind[i] = 2;
      else if (noise2(x * 0.5, y * 0.5 - t * 6) > 0.72 && hd[(y - 2 > 0 ? i - 2 * W : i) * 4] <= 127) kind[i] = 2;   // tongues licking down into the head
    }
    // 2. distance from the outside for every pixel (4-neighbour, two sweeps)
    const D = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) D[i] = kind[i] ? 1e4 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!D[i]) continue; D[i] = Math.min(D[i], (x ? D[i - 1] : 0) + 1, (y ? D[i - W] : 0) + 1); }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!D[i]) continue; D[i] = Math.min(D[i], (x < W - 1 ? D[i + 1] : 0) + 1, (y < H - 1 ? D[i + W] : 0) + 1); }

    // 3. paint
    const img = g.createImageData(W, H), P = img.data;
    const put = (i, c, a = 255) => { P[i * 4] = c[0]; P[i * 4 + 1] = c[1]; P[i * 4 + 2] = c[2]; P[i * 4 + 3] = a; };
    const lx = X(70), ly = Y(70), R = 120 * S;   // his gradient's light spot (upper left)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, k = kind[i];
      if (!k) continue;
      if (k === 1) {
        // body: a soft cushion lit from the upper left, darker low and round the right edge
        const dome = Math.min(D[i] / (R * 0.22), 1);
        let v = 1.2 + dome * 2.6 - ((x - lx) / R) * 1.4 - ((y - ly) / R) * 1.6;
        if (D[i] <= 2 && x > lx) v -= 0.9;
        if (D[i] <= 1) v -= 0.6;
        // band edges get a one-pixel checker, nothing else is dithered
        const f = v - Math.floor(v), edge = f < 0.12 || f > 0.88;
        const band = Math.max(0, Math.min(5, Math.floor(v + (edge ? (((x + y) & 1) ? 0.13 : -0.13) : 0))));
        put(i, BODY_RGB[band]);
      } else {
        // fire: hotter deeper in and lower down, flickering upward
        const n = noise2(x * 0.35, y * 0.35 + t * 9);
        const v = D[i] * 0.9 + (Y(36) - y) * -0.02 + (n - 0.5) * 1.3 + 0.4;
        put(i, FIRE_RGB[Math.max(0, Math.min(5, Math.floor(v)))]);
      }
    }
    // embers drifting up inside the body
    for (let e = 0; e < 5; e++) {
      const u = (t * 0.32 + e * 0.21) % 1, ex = Math.round(X(60 + e * 18 + Math.sin(t * 2 + e) * 4)), ey = Math.round(Y(160 - u * 70));
      const i = ey * W + ex;
      if (ex > 0 && ex < W && ey > 0 && ey < H && kind[i] === 1 && D[i] > 2 && u < 0.85) put(i, BODY_RGB[5]);
    }
    // shine: a soft streak near the top and a couple of glints (his own spots)
    const shine = (u, v, rx, ry, rot) => {
      for (let y = Math.floor(Y(v - ry * 2)); y <= Y(v + ry * 2); y++) for (let x = Math.floor(X(u - rx * 1.2)); x <= X(u + rx * 1.2); x++) {
        const dx = (x - X(u)) / (rx * S), dy = (y - Y(v)) / (ry * S), c = Math.cos(rot), s = Math.sin(rot);
        const q = (dx * c + dy * s) ** 2 + (-dx * s + dy * c) ** 2;
        const i = y * W + x;
        if (q < 1 && x >= 0 && y >= 0 && x < W && y < H && kind[i] === 1 && D[i] > 1) put(i, BODY_RGB[5]);
      }
    };
    shine(52, 62, 9, 3.2, -0.7); shine(36, 80, 2.6, 2.6, 0);
    // outline round everything, then a faint checker glow outside it
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (kind[i]) continue;
      const nb = (x > 0 && kind[i - 1]) || (x < W - 1 && kind[i + 1]) || (y > 0 && kind[i - W]) || (y < H - 1 && kind[i + W]);
      if (nb) { out[i] = 1; const fire = (x > 0 && kind[i - 1] === 2) || (x < W - 1 && kind[i + 1] === 2) || (y > 0 && kind[i - W] === 2) || (y < H - 1 && kind[i + W] === 2); put(i, fire ? FIRE_RGB[0] : OUT_RGB); }
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (kind[i] || out[i] || !((x + y) & 1)) continue;
      if (out[i - 1] || out[i + 1] || out[i - W] || out[i + W]) put(i, GLOW_RGB, 90);
    }
    g.putImageData(img, 0, 0);

    // 4. face: his eyes (left one smaller, both toward his left: he faces a little to the side) and mouth
    this.face(X, Y, S, t);
  }

  face(X, Y, S, t) {
    const g = this.g, m = this.mood;
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const disc = (cx, cy, r, ry, c) => { g.fillStyle = c; for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(r); x <= r; x++) if ((x / r) ** 2 + (y / ry) ** 2 <= 1) g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); };
    const blink = (t % 4.6) > 4.42 ? 0.15 : 1;
    for (const [u, v, r] of [[36, 103, 16.5], [98, 108, 19]]) {
      const cx = X(u), cy = Y(v), R = r * S;
      if (m === "happy" || m === "celebrate") {   // an upturned arc
        for (let a = 0.15; a < Math.PI - 0.15; a += 0.08) { px(cx + Math.cos(a) * R, cy - Math.sin(a) * R * 0.75 + R * 0.3, EYE_INK); px(cx + Math.cos(a) * R, cy - Math.sin(a) * R * 0.75 + R * 0.3 + 1, EYE_INK); }
        continue;
      }
      if (m === "sleepy" || blink < 1) { for (let x = -R; x <= R; x++) { px(cx + x, cy + R * 0.15, EYE_INK); } continue; }
      disc(cx, cy, R + 1, R + 1, EYE_INK);
      disc(cx, cy, R, R, EYE);
      if (m === "angry") g.clearRect(0, 0, 0, 0);
      // a small glint top-left, like the eye glow he had
      px(cx - R * 0.35, cy - R * 0.4, "#ffffff");
    }
    // mouth: a small smile (a frown when sad)
    const sad = m === "sad";
    for (let k = -3; k <= 3; k++) {
      const x = X(60) + k * 0.5 * S * 4, y = Y(sad ? 130 : 129) + (sad ? 1 : -1) * (1 - (k / 3) ** 2) * -S * 4 * 0.6;
      px(x, y, EYE_INK);
    }
  }
}
