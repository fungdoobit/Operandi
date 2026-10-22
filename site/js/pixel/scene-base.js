// The shared base for the biome backgrounds (biomes.js). See there.
export const HA = 220, FLOOR = 176;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class PixelScene {
  constructor(stage) {
    this.stage = stage;
    this.base = document.createElement("canvas");
    this.top = document.createElement("canvas");
    for (const c of [this.base, this.top]) {
      c.className = "arena-bg";
      Object.assign(c.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" });
    }
    this.top.style.zIndex = 0;
    stage.prepend(this.top);
    stage.prepend(this.base);
    this.tick = this.tick.bind(this);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(stage);
    requestAnimationFrame(this.tick);
  }
  resize() {
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (!W || !H) return;
    const wa = Math.max(64, Math.round((W / H) * HA));
    if (wa === this.wa) return;
    this.wa = wa;
    for (const c of [this.base, this.top]) { c.width = wa; c.height = HA; }
    const img = new ImageData(wa, HA), d = img.data;
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= wa || y >= HA) return; const o = (y * wa + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
    const bay = (x, y) => B4[(y & 3) * 4 + (x & 3)];
    const dith = (x, y, a, b, k) => put(x, y, k > bay(x & 255, y & 255) ? b : a);
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    // get(x, y): the colour already painted there (for blending)
    const get = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= wa || y >= HA) return [0, 0, 0]; const o = (y * wa + x) * 4; return [d[o], d[o + 1], d[o + 2]]; };
    this.paint({ W: wa, H: HA, FLOOR, put, dith, bay, r: rng(this.seed || 7), mix, get });
    this.base.getContext("2d").putImageData(img, 0, 0);
  }
  tick(now) {
    if (!this.stage.isConnected) return;
    requestAnimationFrame(this.tick);
    if (now - (this.lastDraw || 0) < 66) return;
    const dt = Math.min(0.2, (now - (this.lastDraw || now)) / 1000);
    this.lastDraw = now;
    if (!this.wa) return;
    const g = this.top.getContext("2d");
    g.clearRect(0, 0, this.wa, HA);
    const px = (x, y, c, a = 1, s = 1) => { g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; g.fillRect(Math.round(x), Math.round(y), s, s); };
    this.animate({ g, t: now / 1000, dt, W: this.wa, H: HA, FLOOR, px });
  }
  paint() {}
  animate() {}
}

