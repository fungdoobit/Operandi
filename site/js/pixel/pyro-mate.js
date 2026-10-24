// PYRO, the revamp (Isaac 2026-10-23): a living flame from devkidd's pixel fire pack
// (assets/pyro/devkidd, free for any use) with blank rounded eyes like NOVA's on a
// slightly darker core. His usual flame is E (red Group 4-5); when he's fired up
// (angry, fierce, picked up) it flares into F (red Group 7-2), bigger and darker.
// Same calls as Dot and NovaMate (say, setMood, pickUp, drop, face, nudge...), so the
// roaming pet (pet.js) and the Shop use him the same way.
// Higher bit (Isaac 2026-10-24: "to match NOVA"): the flames are doubled with Scale2x
// (twice the art pixels, corners rounded) and drawn at 1.5 CSS px each, the same grain as
// NOVA; on top he gets her kind of faint see-through dithered haze
// (in ember colours; no outline), with finer rounded eyes drawn on the same grid.
// The flame sways against the way he moves, like a real flame: each row of pixels
// shifts sideways a little more the higher it is, so it stays crisp pixel art.
import { Dot } from "../dot.js";

export const PYRO_CSS = `
.pyro-figure { flex: none; touch-action: none; position: relative; cursor: grab; user-select: none; -webkit-user-select: none; }
.pyro-figure canvas { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); image-rendering: pixelated; pointer-events: none; }
`;

const AW = 88, AH = 112;   // canvas in art px (each is half a pixel of the pack's art): the 64 x 96 flame plus room to sway, glow and spark
const FRAME_MS = 100;
const W_ = [255, 255, 255], C_ = [255, 241, 214];
// the see-through ember haze: three dithered levels in fire colours, fainter than NOVA's
// three (28 / 50 / 80 %), like her purple aura (Isaac 2026-10-24: "less opaque")
const HAZE = [[[150, 40, 12], 34], [[226, 84, 20], 64], [[255, 160, 50], 104]];
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const h1 = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h1(ix + iy * 57), b = h1(ix + 1 + iy * 57), c = h1(ix + (iy + 1) * 57), d = h1(ix + 1 + (iy + 1) * 57);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Eyes like NOVA's: tall ovals, rounded at both ends, plain white (a warmer bottom row), no outline.
// Each mood reshapes them the way NOVA's eyes change. Returns [x, y, warm] pixels around the eye's
// middle for the LEFT eye; the right eye is its mirror.
const eyeCache = {};
function eyeShape(mood, blink) {
  const key = blink ? "blink" : mood;
  if (eyeCache[key]) return eyeCache[key];
  const px = [];
  const add = (x, y, warm = 0) => px.push([x - 4, y - 7, warm]);
  if (key === "blink" || key === "sleepy") { for (let x = 0; x < 8; x++) { add(x, 6, key === "blink" ? 1 : 0); add(x, 7, 1); } }
  else if (key === "happy") { for (let x = 0; x < 9; x++) { const y = 7 - Math.round(4 * Math.sin(Math.PI * (x + 0.5) / 9)); add(x, y); add(x, y + 1); } }
  else {
    const rx = key === "held" ? 4.2 : 3.7, ry = key === "held" ? 7.4 : 6.3;
    for (let y = 0; y < 15; y++) for (let x = 0; x < 9; x++) {
      const dx = x + 0.5 - 4.5, dy = y + 0.5 - 7.5;
      if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) continue;
      if (key === "angry" && y < (x - 2.5) * 1.15 + 3) continue;       // cut down toward the middle (right side of the left eye)
      if (key === "sad" && y < (6.5 - x) * 1.15 + 3) continue;          // cut down toward the outside
      add(x, y, y >= 12 ? 1 : 0);
    }
  }
  return (eyeCache[key] = px);
}
// DOT's moods mapped onto PYRO's.
const MOOD = { happy: "happy", celebrate: "happy", angry: "angry", fierce: "angry", sad: "sad", ko: "sad", worried: "sad", sleepy: "sleepy", held: "held" };

// Scale2x (EPX): each pixel becomes 2 x 2, and diagonal corners are rounded where neighbours agree.
function scale2x(src, w, h) {
  const s = new Uint32Array(src.data.buffer.slice(0));
  for (let i = 0; i < s.length; i++) if (!(s[i] >>> 24)) s[i] = 0;   // every see-through pixel is the same
  const out = new ImageData(w * 2, h * 2), o = new Uint32Array(out.data.buffer), W2 = w * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = s[y * w + x], A = y ? s[(y - 1) * w + x] : P, D = y < h - 1 ? s[(y + 1) * w + x] : P, C = x ? s[y * w + x - 1] : P, B = x < w - 1 ? s[y * w + x + 1] : P;
    o[y * 2 * W2 + x * 2] = C === A && C !== D && A !== B ? A : P;
    o[y * 2 * W2 + x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
    o[(y * 2 + 1) * W2 + x * 2] = D === C && D !== B && C !== A ? C : P;
    o[(y * 2 + 1) * W2 + x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return out;
}

// The two flames, loaded once and doubled: each 8 frames, plus where its hot core is and its colours (palest first).
let flames = null;
function loadFlames() {
  if (flames) return flames;
  const one = (src) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const n = 8, fw = img.width / n, fh = img.height;
      const c = document.createElement("canvas"); c.width = img.width; c.height = fh;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const all = g.getImageData(0, 0, img.width, fh), D = all.data;
      let best = 0, bottom = 0, sx = 0, sy = 0, k = 0;
      const cols = new Map();
      for (let i = 0; i < D.length; i += 4) if (D[i + 3]) {
        const v = D[i] + D[i + 1] + D[i + 2];
        best = Math.max(best, v); bottom = Math.max(bottom, Math.floor(i / 4 / img.width));
        cols.set((D[i] << 16) | (D[i + 1] << 8) | D[i + 2], v);
      }
      for (let i = 0; i < D.length; i += 4) if (D[i + 3] && D[i] + D[i + 1] + D[i + 2] >= best - 60) { sx += (i / 4) % img.width % fw; sy += Math.floor(i / 4 / img.width); k++; }
      // each frame doubled, side by side in one strip
      const strip = document.createElement("canvas"); strip.width = fw * 2 * n; strip.height = fh * 2;
      const sg = strip.getContext("2d");
      for (let f = 0; f < n; f++) sg.putImageData(scale2x(g.getImageData(f * fw, 0, fw, fh), fw, fh), f * fw * 2, 0);
      const fw2 = fw * 2, fh2 = fh * 2, dx = Math.round((AW - fw2) / 2), dy = AH - 4 - (bottom + 1) * 2;
      ok({ strip, n, fw: fw2, fh: fh2, dx, dy, core: [(sx / k + 0.5) * 2 + dx, (sy / k + 0.5) * 2 + dy], tones: [...cols].sort((a, b) => b[1] - a[1]).map(([c]) => c) });
    };
    img.src = src;
  });
  flames = Promise.all([one("assets/pyro/devkidd/red-group4-5.png"), one("assets/pyro/devkidd/red-group7-2.png")]).then(([E, F]) => ({ E, F }));
  return flames;
}

export class PyroMate {
  constructor(container, { size = 96, idles = true } = {}) {
    container.innerHTML = `<div class="dot-wrap"><div class="pyro-figure" data-mood="idle"></div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.figure = container.querySelector(".pyro-figure");
    this.bubble = container.querySelector(".dot-bubble");
    this.cv = document.createElement("canvas"); this.cv.width = AW; this.cv.height = AH;
    this.figure.append(this.cv);
    this.g = this.cv.getContext("2d", { willReadFrequently: true });
    this.buf = document.createElement("canvas"); this.buf.width = AW; this.buf.height = AH;
    this.bg = this.buf.getContext("2d", { willReadFrequently: true });
    this.resize(size);
    this.mood = "idle"; this.sz = 1; this.shut = false; this.faceDir = 0; this.lean = 0; this.leanV = 0; this.flare = 0; this.sparks = [];
    this.t0 = performance.now(); this.lastX = null; this.lastT = null;
    loadFlames().then((f) => { this.fl = f; });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // The figure is his body's box (what you grab); the canvas hangs over it with room to sway.
  resize(size) {
    const k = size / 64;   // CSS px per art px: 1.5 at the usual 96 (NOVA's grain)
    this.k = k;
    Object.assign(this.figure.style, { width: 52 * k + "px", height: 68 * k + "px" });
    Object.assign(this.cv.style, { width: AW * k + "px", height: AH * k + "px" });
  }

  // ----- the same calls as Dot -----
  setMood(mood, { revertAfter } = {}) {
    clearTimeout(this.moodTimer);
    this.figure.dataset.mood = mood;
    this.mood = MOOD[mood] || "idle";
    if (revertAfter) this.moodTimer = setTimeout(() => this.setMood("idle"), revertAfter);
  }
  setAccessory() {}   // looks were drawn for the old SVG body
  typing() {}
  nudge(dx = 0, e = 0) { this.leanV += (Math.random() - 0.5) * e * 6; }
  face(dir) { this.faceDir = dir === "right" ? 1 : -1; }
  // Snuff and relight (Isaac 2026-10-24): pet.js shrinks him in chunky steps (sz: 1 full .. 0 gone) with his eyes
  // shut, and grows him back at the far spot. Nothing else is drawn: it is only his own flame, smaller.
  snuff(sz = 1, shut = false) { this.sz = sz; this.shut = shut; }
  pickUp() { this.held = true; this.setMood("held"); this.flare = 1; }
  drop() {
    this.held = false;
    this.flare = 0.7;
    // a burst of sparks as he lands
    for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); this.sparks.push({ x: AW / 2 + (Math.random() - 0.5) * 20, y: AH - 12, vx: Math.cos(a) * (28 + Math.random() * 40), vy: Math.sin(a) * (40 + Math.random() * 52), life: 0.5 + Math.random() * 0.4, age: 0 }); }
    this.setMood("happy", { revertAfter: 900 });
  }
  say(text, opts) { Dot.prototype.say.call(this, text, opts); }
  hush() { Dot.prototype.hush.call(this); }

  loop(now) {
    if (!this.cv.isConnected) return;
    requestAnimationFrame(this.loop);
    const dt = this.lastT == null ? 0 : Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    // how fast he's moving on screen: the flame leans the other way (a real flame trails behind)
    const x = this.figure.getBoundingClientRect().left;
    const vx = this.lastX == null || !dt ? 0 : (x - this.lastX) / dt;
    this.lastX = x;
    const target = Math.max(-1, Math.min(1, -vx / 45));
    this.leanV += (target - this.lean) * 40 * dt; this.leanV *= Math.pow(0.02, dt); this.lean += this.leanV * dt;
    this.flare = Math.max(0, this.flare - dt * (this.held ? 0 : 1.6));
    this.sparks = this.sparks.filter((s) => (s.age += dt) < s.life);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 80 * dt; }
    if ((this.tick = !this.tick)) return;   // drawn at 30 fps
    this.draw((now - this.t0) / 1000);
  }

  draw(t) {
    const F = this.fl; if (!F) return;
    const fired = this.mood === "angry" || this.flare > 0.35;
    const fl = fired ? F.F : F.E, bg = this.bg, g = this.g;
    const z = this.sz;
    if (z <= 0) { g.clearRect(0, 0, AW, AH); return; }   // snuffed out
    const i = Math.floor((t * 1000) / FRAME_MS) % fl.n;
    // 1. the flame into a buffer, the core behind the eyes toned down a step
    bg.clearRect(0, 0, AW, AH);
    // smaller = his own frame drawn smaller (nearest-neighbour, anchored at his base), in the steps pet.js picks
    const baseY = AH - 4, dw = Math.round(fl.fw * z), dh = Math.round(fl.fh * z);
    bg.imageSmoothingEnabled = false;
    bg.drawImage(fl.strip, i * fl.fw, 0, fl.fw, fl.fh, fl.dx + Math.round((fl.fw - dw) / 2), baseY - Math.round((baseY - fl.dy) * z) , dw, dh);
    const sx = Math.round(Math.sin(t * 1.3) * 1.2) + this.faceDir * 2, sy = Math.round(Math.sin(t * 1.9 + 1) * 1.2);
    const cx = AW / 2 + (fl.core[0] - AW / 2) * z, cy = baseY - (baseY - fl.core[1]) * z, ex = Math.round(cx + sx), ey = Math.round(cy - 2 * z + sy);
    const img = bg.getImageData(0, 0, AW, AH), P = img.data, [p0, p1] = fl.tones;
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      if (((x + 0.5 - ex) / (15 * z)) ** 2 + ((y + 0.5 - ey) / (10 * z)) ** 2 > 1) continue;
      const o = (y * AW + x) * 4;
      if (P[o + 3] && ((P[o] << 16) | (P[o + 1] << 8) | P[o + 2]) === p0) { P[o] = (p1 >> 16) & 255; P[o + 1] = (p1 >> 8) & 255; P[o + 2] = p1 & 255; }
    }
    // 2. eyes (blinking every few seconds when idle), on the same fine grid
    const blink = this.shut || (this.mood === "idle" && (t % 4.2) > 4.06);
    const shape = eyeShape(this.mood, blink);
    if (z >= 0.4) for (const [mirror, mx] of [[false, ex - 7 * z], [true, ex + 7 * z]]) for (const [dx, dy, warm] of shape) {
      const x = Math.round(mx + (mirror ? -dx : dx)), y = ey + dy;
      if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
      const o = (y * AW + x) * 4, c = warm ? C_ : W_;
      P[o] = c[0]; P[o + 1] = c[1]; P[o + 2] = c[2]; P[o + 3] = 255;
    }
    bg.putImageData(img, 0, 0);
    // 3. onto a second buffer row by row: rows above his core shift against his movement, more the higher they are
    g.clearRect(0, 0, AW, AH);
    const base = cy + 8 * z, top = baseY - (baseY - fl.dy) * z;
    for (let y = 0; y < AH; y++) {
      const h = Math.max(0, (base - y) / (base - top));
      const off = Math.round(this.lean * 14 * h ** 1.3 + Math.sin(t * 2.2 + y * 0.08) * 0.8 * h);
      g.drawImage(this.buf, 0, y, AW, 1, off, y, AW, 1);
    }
    // 4. the faint see-through ember haze, like NOVA's aura
    const out = g.getImageData(0, 0, AW, AH), Q = out.data, N = AW * AH;
    // loose sparks and wisps (small separate blobs) are left as they are and give off no haze of their own
    const small = new Uint8Array(N), seen = new Uint8Array(N), stack = [];
    for (let p0 = 0; p0 < N; p0++) {
      if (seen[p0] || Q[p0 * 4 + 3] <= 127) continue;
      const comp = [p0]; seen[p0] = 1; stack.push(p0);
      while (stack.length) {
        const p = stack.pop(), x = p % AW;
        for (const q of [x ? p - 1 : -1, x < AW - 1 ? p + 1 : -1, p >= AW ? p - AW : -1, p < N - AW ? p + AW : -1]) if (q >= 0 && !seen[q] && Q[q * 4 + 3] > 127) { seen[q] = 1; stack.push(q); comp.push(q); }
      }
      if (comp.length < 40) for (const q of comp) small[q] = 1;
    }
    const dist = new Float32Array(N);
    for (let p = 0; p < N; p++) dist[p] = Q[p * 4 + 3] > 127 && !small[p] ? 0 : 99;
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) { const p = y * AW + x; if (dist[p]) dist[p] = Math.min(dist[p], (x ? dist[p - 1] : 99) + 1, (y ? dist[p - AW] : 99) + 1); }
    for (let y = AH - 1; y >= 0; y--) for (let x = AW - 1; x >= 0; x--) { const p = y * AW + x; if (dist[p]) dist[p] = Math.min(dist[p], (x < AW - 1 ? dist[p + 1] : 99) + 1, (y < AH - 1 ? dist[p + AW] : 99) + 1); }
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const p = y * AW + x, d = dist[p], o = p * 4;
      if (small[p]) { Q[o + 3] = 255; continue; }
      if (!d) { Q[o + 3] = 255; continue; }
      if (d > 7) { Q[o + 3] = 0; continue; }
      // the haze: thickest near the fire, broken up by noise that rises, dithered into three see-through levels
      const gas = Math.exp(-(d - 1) * 0.5) * (0.3 + 0.85 * vnoise(x * 0.3, y * 0.3 + t * 2.4));
      const lv = gas * 3 + (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.45;
      const hz = lv > 2 ? HAZE[2] : lv > 1 ? HAZE[1] : lv > 0.5 ? HAZE[0] : null;
      if (hz) { Q[o] = hz[0][0]; Q[o + 1] = hz[0][1]; Q[o + 2] = hz[0][2]; Q[o + 3] = hz[1]; } else Q[o + 3] = 0;
    }
    g.putImageData(out, 0, 0);
    for (const s of this.sparks) { g.fillStyle = s.age / s.life < 0.5 ? "#ffe08a" : "#ff8a30"; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
  }
}
