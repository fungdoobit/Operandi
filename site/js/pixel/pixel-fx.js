// The battle's hi-bit effects layer (PRD Addendum I). Abilities draw their
// effects (shadow hands, flame blades, missiles, chains...) with ordinary 2D
// canvas calls in stage pixels; every frame the layer is turned into pixel art
// so it matches GOLEM, NOVA and the arena:
//   - drawn at the arena's art size (220 px tall), shown with crisp pixels
//   - see-through parts (glows, smoke) become a dither pattern
//   - colours snap to a few levels with ordered dithering
//   - a dark one-pixel outline round everything solid
// It runs on battle time, so hit-stop freezes it and slow motion slows it.
import { battleTime } from "../battle-time.js";

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const HA = 220, LEVELS = 7;

export class PixelFX {
  constructor(world, { outline = "#0b0614", z = 6 } = {}) {
    this.world = world;
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none", zIndex: z });
    world.append(this.canvas);
    this.g = this.canvas.getContext("2d", { willReadFrequently: true });
    this.ink = [1, 3, 5].map((i) => parseInt(outline.slice(i, i + 2), 16));
    this.actors = [];
    this.time = 0;
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // Stage size in CSS px, and the art scale (art px per stage px).
  get w() { return this.world.clientWidth; }
  get h() { return this.world.clientHeight; }

  // Add an effect. draw(g, k, t, a) is called every frame with g in stage pixels,
  // k = progress 0..1, t = its own time in ms, a = this actor (for its own state).
  // Returns a promise for when it ends. { dur, draw, z } (higher z draws later).
  add(actor) {
    return new Promise((done) => {
      actor.t = 0; actor.z ??= 0; actor.done = done;
      this.actors.push(actor);
      this.actors.sort((a, b) => a.z - b.z);
    });
  }
  // Wait in battle time (freezes in hit-stop).
  wait(ms) { return this.add({ dur: ms, draw() {} }); }

  loop(now) {
    if (!this.world.isConnected) return;
    requestAnimationFrame(this.loop);
    const real = Math.min(50, now - this.last);
    this.last = now;
    const d = battleTime.step(now, real);
    const W = this.w, H = this.h;
    if (!W || !H) return;
    const wa = Math.max(64, Math.round((W / H) * HA));
    if (this.canvas.width !== wa || this.canvas.height !== HA) { this.canvas.width = wa; this.canvas.height = HA; }
    const g = this.g;
    if (!this.actors.length) {
      if (this.dirty) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, wa, HA); this.dirty = false; }
      return;
    }
    // 30 fps is plenty for pixel art (and it halves the work), unless frozen.
    this.acc = (this.acc || 0) + real;
    for (const a of this.actors) a.t += d;
    if (this.acc < 30 && !this.ended()) return;
    this.acc = 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, wa, HA);
    const s = HA / H;
    this.actors = this.actors.filter((a) => {
      const k = Math.min(1, a.t / a.dur);
      g.save(); g.setTransform(s, 0, 0, s, 0, 0); g.globalAlpha = 1;
      a.draw(g, k, a.t, a);
      g.restore();
      if (k >= 1) { a.done(); return false; }
      return true;
    });
    this.pixelate(wa, HA);
    this.dirty = true;
  }
  ended() { return this.actors.some((a) => a.t >= a.dur); }

  pixelate(W, H) {
    const g = this.g, img = g.getImageData(0, 0, W, H), d = img.data, solid = new Uint8Array(W * H);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const o = i * 4, a = d[o + 3], b = B4[(y & 3) * 4 + (x & 3)];
      if (a < 12) { d[o + 3] = 0; continue; }
      if (a < 150) { if (a / 150 > b) d[o + 3] = 200; else { d[o + 3] = 0; continue; } }
      else { d[o + 3] = 255; solid[i] = 1; }
      // snap each colour channel to a few levels, with dithering between them
      for (let c = 0; c < 3; c++) d[o + c] = Math.min(255, Math.floor((d[o + c] / 255) * (LEVELS - 1) + b) * (255 / (LEVELS - 1)));
    }
    const [ir, ig, ib] = this.ink;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      if (solid[i] || d[i * 4 + 3] === 255) continue;
      if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
        const o = i * 4; d[o] = ir; d[o + 1] = ig; d[o + 2] = ib; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
}

// ---- small drawing helpers shared by the abilities ----
export const ease = {
  out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, io: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2, lin: (t) => t,
};
export const lerp = (a, b, t) => a + (b - a) * t;
// A tapered ribbon along points [[x,y],...], width w0 at the start to w1 at the end.
export function ribbon(g, pts, w0, w1, fill) {
  if (pts.length < 2) return;
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
    let dx = q[0] - o[0], dy = q[1] - o[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const w = lerp(w0, w1, i / (pts.length - 1)) / 2;
    L.push([p[0] - dy * w, p[1] + dx * w]); R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (const p of L) g.lineTo(p[0], p[1]);
  for (const p of R.reverse()) g.lineTo(p[0], p[1]);
  g.closePath(); g.fillStyle = fill; g.fill();
}
// A soft glow blob (becomes a dithered halo after the pixel pass).
export function glow(g, x, y, r, color, alpha = 0.5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.globalAlpha = alpha; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
}
// A sharp four-point star flash.
export function starFlash(g, x, y, r, color = "#ffffff") {
  g.fillStyle = color; g.beginPath();
  const pts = [[0, -r * 1.25], [r * 0.12, -r * 0.12], [r, 0], [r * 0.12, r * 0.12], [0, r * 1.25], [-r * 0.12, r * 0.12], [-r, 0], [-r * 0.12, -r * 0.12]];
  pts.forEach(([a, b], i) => (i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b)));
  g.closePath(); g.fill();
}
