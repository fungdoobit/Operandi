// PYRO, the revamp (Isaac 2026-10-23): a living flame from devkidd's pixel fire pack
// (assets/pyro/devkidd, free for any use) with blank rounded eyes like NOVA's on a
// slightly darker core. His usual flame is E (red Group 4-5); when he's fired up
// (angry, fierce, picked up) it flares into F (red Group 7-2), bigger and darker.
// Same calls as Dot and NovaMate (say, setMood, pickUp, drop, face, nudge...), so the
// roaming pet (pet.js) and the Shop use him the same way.
// The flame sways against the way he moves, like a real flame: each row of pixels
// shifts sideways a little more the higher it is, so it stays crisp pixel art.
import { Dot } from "../dot.js";

export const PYRO_CSS = `
.pyro-figure { flex: none; touch-action: none; position: relative; cursor: grab; user-select: none; -webkit-user-select: none; }
.pyro-figure canvas { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); image-rendering: pixelated; pointer-events: none; }
`;

const AW = 44, AH = 52, PAD = 6;   // canvas in art px: the 32 x 48 flame plus room to sway and spark
const FRAME_MS = 100;
const W_ = "#ffffff", C_ = "#fff1d6";
// Eyes like NOVA's: tall, rounded at both ends, plain white (warmer bottom row), no outline.
const EYES = {
  idle:   [".WW.", "WWWW", "WWWW", "WWWW", "CCCC", ".CC."],
  angry:  ["W...", "WW..", "WWW.", "WWWW", "CCCC", ".CC."],
  sad:    ["...W", "..WW", ".WWW", "WWWW", "CCCC", ".CC."],
  happy:  [".WW.", "WWWW", "W..W"],
  sleepy: ["WWWW"],
  held:   [".WW.", "WWWW", "WWWW", "WWWW", "WWWW", "CCCC", ".CC."],   // a little bigger: surprised
  blink:  ["CCCC"],
};
// DOT's moods mapped onto PYRO's.
const MOOD = { happy: "happy", celebrate: "happy", angry: "angry", fierce: "angry", sad: "sad", ko: "sad", worried: "sad", sleepy: "sleepy", held: "held" };

// The two flames, loaded once: each 8 frames, plus where its hot core is and its colours (palest first).
let flames = null;
function loadFlames() {
  if (flames) return flames;
  const one = (src) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const n = 8, fw = img.width / n, fh = img.height;
      const c = document.createElement("canvas"); c.width = img.width; c.height = fh;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const D = g.getImageData(0, 0, img.width, fh).data;
      let best = 0, bottom = 0, sx = 0, sy = 0, k = 0;
      const cols = new Map();
      for (let i = 0; i < D.length; i += 4) if (D[i + 3]) {
        const v = D[i] + D[i + 1] + D[i + 2];
        best = Math.max(best, v); bottom = Math.max(bottom, Math.floor(i / 4 / img.width));
        cols.set((D[i] << 16) | (D[i + 1] << 8) | D[i + 2], v);
      }
      for (let i = 0; i < D.length; i += 4) if (D[i + 3] && D[i] + D[i + 1] + D[i + 2] >= best - 60) { sx += (i / 4) % img.width % fw; sy += Math.floor(i / 4 / img.width); k++; }
      const dy = AH - 2 - bottom;
      ok({ img, n, fw, fh, dy, dx: Math.round((AW - fw) / 2), core: [sx / k + Math.round((AW - fw) / 2), sy / k + dy], tones: [...cols].sort((a, b) => b[1] - a[1]).map(([c]) => c) });
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
    this.mood = "idle"; this.faceDir = 0; this.lean = 0; this.leanV = 0; this.flare = 0; this.sparks = [];
    this.t0 = performance.now(); this.lastX = null; this.lastT = null;
    loadFlames().then((f) => { this.fl = f; });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // The figure is his body's box (what you grab); the canvas hangs over it with room to sway.
  resize(size) {
    const k = size / 32;   // CSS px per art px: 3 at the usual 96
    this.k = k;
    Object.assign(this.figure.style, { width: 26 * k + "px", height: 34 * k + "px" });
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
  pickUp() { this.held = true; this.setMood("held"); this.flare = 1; }
  drop() {
    this.held = false;
    this.flare = 0.7;
    // a burst of sparks as he lands
    for (let i = 0; i < 12; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); this.sparks.push({ x: AW / 2 + (Math.random() - 0.5) * 10, y: AH - 6, vx: Math.cos(a) * (14 + Math.random() * 20), vy: Math.sin(a) * (20 + Math.random() * 26), life: 0.5 + Math.random() * 0.4, age: 0 }); }
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
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; }
    if ((this.tick = !this.tick)) return;   // drawn at 30 fps
    this.draw((now - this.t0) / 1000);
  }

  draw(t) {
    const F = this.fl; if (!F) return;
    const fired = this.mood === "angry" || this.flare > 0.35;
    const fl = fired ? F.F : F.E, bg = this.bg, g = this.g;
    const i = Math.floor((t * 1000) / FRAME_MS) % fl.n;
    // 1. the flame into a buffer, the core behind the eyes toned down a step
    bg.clearRect(0, 0, AW, AH);
    bg.drawImage(fl.img, i * fl.fw, 0, fl.fw, fl.fh, fl.dx, fl.dy, fl.fw, fl.fh);
    const sx = Math.round(Math.sin(t * 1.3) * 0.6) + this.faceDir, sy = Math.round(Math.sin(t * 1.9 + 1) * 0.6);
    const [cx, cy] = fl.core, ex = cx + sx, ey = cy - 1 + sy;
    const img = bg.getImageData(0, 0, AW, AH), P = img.data, [p0, p1] = fl.tones;
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      if (((x + 0.5 - ex) / 7.5) ** 2 + ((y + 0.5 - ey) / 5) ** 2 > 1) continue;
      const o = (y * AW + x) * 4;
      if (P[o + 3] && ((P[o] << 16) | (P[o + 1] << 8) | P[o + 2]) === p0) { P[o] = (p1 >> 16) & 255; P[o + 1] = (p1 >> 8) & 255; P[o + 2] = p1 & 255; }
    }
    bg.putImageData(img, 0, 0);
    // 2. eyes (blinking every few seconds when idle)
    const blink = this.mood === "idle" && (t % 4.2) > 4.06;
    const rows = blink ? EYES.blink : EYES[this.mood] || EYES.idle;
    const eye = (cx2, mirror) => {
      const w = rows[0].length, x0 = Math.round(cx2 - w / 2), y0 = Math.round(ey - rows.length / 2);
      rows.forEach((r, y) => [...r].forEach((ch, xx) => { if (ch === ".") return; bg.fillStyle = ch === "W" ? W_ : C_; bg.fillRect(x0 + (mirror ? w - 1 - xx : xx), y0 + y, 1, 1); }));
    };
    eye(ex - 3.5, false); eye(ex + 3.5, true);
    // 3. onto the canvas row by row: rows above his core shift against his movement, more the higher they are
    g.clearRect(0, 0, AW, AH);
    const base = cy + 4, top = fl.dy;
    for (let y = 0; y < AH; y++) {
      const h = Math.max(0, (base - y) / (base - top));
      const off = Math.round(this.lean * 7 * h ** 1.3 + Math.sin(t * 2.2 + y * 0.15) * 0.4 * h);
      g.drawImage(this.buf, 0, y, AW, 1, off, y, AW, 1);
    }
    for (const s of this.sparks) { g.fillStyle = s.age / s.life < 0.5 ? "#ffe08a" : "#ff8a30"; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
  }
}
