// THE MAW'S ARENA (Isaac 2026-10-24: the procedural valley "doesn't look very good", so: use his pixel-art packs, edited): Ansimuz's
// Plains in three layers (back = sky and clouds, middle = far mountains and meadow, front = the grass, path and rocks), moving slowly
// through a whole day: noon -> golden sunset -> night -> sunrise.
//
// How: each time (4 times a second) the three layers are re-coloured for the time of day and stacked.
//   back   a 6-colour palette (sky bands and cloud shades), so it is swapped colour by colour, with a smooth sky gradient mixed in
//   middle/front   graded: warmer and darker at sunset, dark and blue at night, with haze on the far mountains
// The sun and the moon are painted INTO the sky layer's pixels, so the mountains and clouds pass in front of them. A light layer on
// top animates stars (only where the sky is), fireflies, birds, drifting petals and sunset rays.
// The art is 368 px wide; wider stages get the layers mirrored on both sides.
import { PixelScene } from "../scene-base.js";

const DAY_LENGTH = 480;     // seconds for a whole day: sunset at 2 minutes, night at 4, sunrise at 6
const OY = 22;              // the art sits this far down, so the grass band lines up with where the fighters stand
const IW = 368, IH = 208;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => B4[(y & 3) * 4 + (x & 3)];

// the back layer's six colours (dark sky, mid, light, horizon sky, cloud shade, cloud white) in each time of day
const PAL = {
  day: ["#1c78b4", "#3390c6", "#5daeda", "#7ac2eb", "#a2d3ea", "#cae3ed"].map(hex),
  sun: ["#2a2160", "#5a3480", "#b4558c", "#f2906a", "#f6a882", "#ffe0b4"].map(hex),
  night: ["#04061c", "#080c2c", "#0e1840", "#16265a", "#2a3c78", "#5a70a8"].map(hex),
};
const SKY = { // the sky's own gradient, top to horizon (mixed into the palette colours)
  day: ["#1f6fc0", "#4a96dc", "#7ec0ec", "#b6dcf4"].map(hex),
  sun: ["#241c58", "#6a3a86", "#d4688a", "#ffb872"].map(hex),
  night: ["#03051a", "#080e30", "#101c4a", "#1c2c66"].map(hex),
};
const LAYERS = {};
const live = new Set();
function loadAll() {
  for (const name of ["back", "middle", "front"]) {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height).data;
      const L = { w: im.width, h: im.height, d };
      if (name === "back") { // which of the 6 colours each pixel is
        const keys = PAL.day.map((c2) => c2.join(","));
        L.idx = new Uint8Array(im.width * im.height);
        for (let i = 0; i < L.idx.length; i++) L.idx[i] = Math.max(0, keys.indexOf([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]].join(",")));
      }
      LAYERS[name] = L;
      if (LAYERS.back && LAYERS.middle && LAYERS.front) for (const s of live) { s.wa = 0; s.resize(); }
    };
    im.src = new URL("../../../assets/maw-arena/plains/" + name + ".png", import.meta.url).href;
  }
}
loadAll();

export class Scene extends PixelScene {
  constructor(stage) { super(stage); live.add(this); this.lastTint = -1e9; }

  // the time of day, 0..1: 0 noon, .25 sunset, .5 midnight, .75 sunrise. ?tod=0.25 in the address (or window.__tod) pins it.
  phase(t) {
    const pin = window.__tod ?? new URLSearchParams(location.search).get("tod");
    return pin != null && pin !== "" ? +pin % 1 : (t / DAY_LENGTH) % 1;
  }
  sunMoon(u) { const a = u * Math.PI * 2, h = Math.cos(a); return { h, sx: 0.5 - 0.22 * Math.sin(a), mh: -h, mx: 0.5 - 0.22 * Math.sin(a + Math.PI) }; }
  weights(u) {
    const { h } = this.sunMoon(u), day = smooth(0.15, 0.6, h), night = smooth(0.04, -0.3, h);
    return { day, night, sun: clamp(1 - day - night), h, right: Math.sin(u * Math.PI * 2) };
  }
  grade(c, w) {   // the middle and front layers: day as drawn, sunset warm and low, night dark and blue
    const s = [c[0] * 1.1 + 28, c[1] * 0.76 + 8, c[2] * 0.6 + 2], n = [c[0] * 0.22 + 5, c[1] * 0.3 + 10, c[2] * 0.52 + 28];
    return [w.day * c[0] + w.sun * s[0] + w.night * n[0], w.day * c[1] + w.sun * s[1] + w.night * n[1], w.day * c[2] + w.sun * s[2] + w.night * n[2]];
  }
  palette(w) { return PAL.day.map((_, i) => [0, 1, 2].map((k) => w.day * PAL.day[i][k] + w.sun * PAL.sun[i][k] + w.night * PAL.night[i][k])); }
  skyGrad(v, w) {   // v 0..1 top to horizon
    const f = clamp(v) * 3, i = Math.min(2, Math.floor(f)), t = f - i, st = (set) => lerp3(set[i], set[i + 1], t), d = st(SKY.day), s = st(SKY.sun), n = st(SKY.night);
    return [0, 1, 2].map((k) => w.day * d[k] + w.sun * s[k] + w.night * n[k]);
  }

  paint(p) {
    this.W = p.W; this.H = p.H; this.bimg = null;
    // sky pixels (where the sun, moon and stars may show): filled by tint()
    this.isSky = new Uint8Array(p.W * p.H);
    this.HOR = 128 + OY;     // the far mountains' base
    this.stars = Array.from({ length: 120 }, (_, i) => ({ x: hash(i, 70) * p.W, y: hash(i, 71) * 120, p: hash(i, 72) * 6.28, b: 0.4 + hash(i, 73) * 0.6 }));
    this.flies = Array.from({ length: 30 }, (_, i) => ({ x: hash(i, 80) * p.W, y: 168 + hash(i, 81) * 46, p: hash(i, 82) * 6.28, s: 0.4 + hash(i, 83) }));
    this.petals = Array.from({ length: 14 }, (_, i) => ({ x: hash(i, 90) * p.W, y: hash(i, 91) * 190, v: 4 + hash(i, 92) * 6, p: hash(i, 93) * 6.28 }));
    this.birds = Array.from({ length: 5 }, (_, i) => ({ x: hash(i, 100) * p.W, y: 50 + hash(i, 101) * 40, v: 5 + hash(i, 102) * 4, p: hash(i, 103) * 6.28 }));
    this.tint(performance.now(), (x, y, c) => p.put(x, y, c));
  }

  tint(now, write) {
    const B = LAYERS.back, M = LAYERS.middle, F = LAYERS.front; if (!B || !M || !F) return;
    this.t0 ??= performance.now();
    const t = (now - this.t0) / 1000, u = this.phase(t), w = (this.w = this.weights(u)), { W, H, HOR, isSky } = this;
    this.u = u;
    const pal = this.palette(w), sm = this.sunMoon(u), ox = Math.floor((W - IW) / 2), scroll = Math.floor(t * 0.6);
    const arcY = (h) => HOR + 6 - h * (HOR - 30);
    const sunX = sm.sx * W, sunY = arcY(Math.max(-0.14, sm.h)), sunA = clamp((sm.h + 0.14) * 5);
    const moonX = sm.mx * W, moonY = arcY(Math.max(-0.12, sm.mh)), moonA = clamp((sm.mh + 0.1) * 5) * (1 - w.day);
    const sunCol = lerp3([255, 250, 226], [255, 178, 98], w.sun), horizon = this.skyGrad(1, w);
    const mir = (u2) => { const k = Math.floor(u2 / IW); let r = u2 - k * IW; if (k & 1) r = IW - 1 - r; return r; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const iy = Math.max(0, Math.min(IH - 1, y - OY)), fx = mir(x - ox), fi = (iy * IW + fx) * 4;
      let c, sky = false;
      if (y - OY >= 0 && y - OY < IH && F.d[fi + 3] > 128) c = this.grade([F.d[fi], F.d[fi + 1], F.d[fi + 2]], w);
      else if (y - OY >= 0 && y - OY < IH && M.d[fi + 3] > 128) {
        c = this.grade([M.d[fi], M.d[fi + 1], M.d[fi + 2]], w);
        const hz = (0.42 - 0.3 * clamp((iy - 100) / 60)) * (0.8 * w.day + 0.5 * w.sun + 0.6 * w.night);   // the far mountains sit in haze
        c = lerp3(c, horizon, hz);
        if (w.sun > 0.05 && (M.d[fi] + M.d[fi + 1] + M.d[fi + 2]) > 520) c = lerp3(c, [255, 190, 130], w.sun * 0.35);   // snow catches the low sun
      } else {
        sky = true;
        const bx = mir(x - ox + scroll), bi = (iy * IW + bx), idx = B.idx[bi];
        c = pal[idx];
        if (idx <= 3) {   // sky: mix in the smooth gradient, dithered, so sunset is a glow and not four flat bands
          const g = this.skyGrad((y / (HOR + 24)) ** 0.9, w), k = 0.7, q = Math.floor(k * 5 + bay(x, y)) / 5;
          c = lerp3(c, g, Math.min(1, q));
          // a golden glow around the low sun
          const glow = Math.max(0, 1 - Math.hypot((x - sunX) * 0.55, (y - sunY) * 1.0) / 90) * w.sun * sunA;
          if (glow > 0) c = lerp3(c, [255, 190, 110], glow * glow * 0.65 + (bay(x, y) - 0.5) * 0.06);
          if (sunA > 0) { const d = Math.hypot(x - sunX, y - sunY); if (d < 9) c = sunCol; else if (d < 34) { const kk = Math.exp(-(d - 9) / 10) * 0.5 * sunA * (0.6 + 0.4 * w.sun); c = lerp3(c, [255, 232, 170], kk); } }
          if (moonA > 0) { const mdx = x - moonX, mdy = y - moonY, d = Math.hypot(mdx, mdy); if (d < 7) { const cr = (Math.hypot(mdx + 2.4, mdy + 1.6) < 1.7 || Math.hypot(mdx - 2.4, mdy - 2.6) < 1.3 || Math.hypot(mdx - 1, mdy + 3) < 1) ? 0.78 : 1; c = [238 * cr, 244 * cr, 255 * cr]; } else if (d < 32) c = lerp3(c, [170, 190, 255], Math.exp(-(d - 7) / 9) * 0.4 * moonA); }
        } else if (w.night < 0.5) c = c;          // cloud pixels keep their own (time-of-day) colours
        else sky = false;
      }
      isSky[y * W + x] = sky && B.idx[iy * IW + mir(x - ox + scroll)] <= 3 ? 1 : 0;
      write(x, y, [Math.max(0, Math.min(255, Math.round(c[0]))), Math.max(0, Math.min(255, Math.round(c[1]))), Math.max(0, Math.min(255, Math.round(c[2])))]);
    }
  }

  animate({ g, t, dt, W, H, px }) {
    const now = performance.now();
    if (now - this.lastTint > 250 && LAYERS.back && LAYERS.middle && LAYERS.front) {
      this.lastTint = now;
      const wa = this.wa, d = (this.bimg || (this.bimg = new ImageData(wa, H))).data;
      this.tint(now, (x, y, c) => { const o = (y * wa + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; });
      this.base.getContext("2d").putImageData(this.bimg, 0, 0);
    }
    const w = this.w; if (!w) return;
    const sm = this.sunMoon(this.u), rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    // stars, only where the sky really is
    if (w.night > 0.15) for (const s of this.stars) { if (!this.isSky[Math.round(s.y) * this.W + Math.round(s.x)]) continue; const a = w.night * s.b * (0.55 + 0.45 * Math.sin(t * 1.6 + s.p)); if (a > 0.1) px(s.x, s.y, [235, 240, 255], Math.min(1, a), (s.b > 0.9 && a > 0.7) ? 2 : 1); }
    // soft rays fanning out of the low sun
    if (w.sun > 0.2 && sm.h > -0.1) {
      const sx = sm.sx * W, sy = HOR_Y(this, sm.h);
      for (let i = 0; i < 7; i++) { const a0 = -Math.PI * 0.95 + i * 0.4 + Math.sin(t * 0.2 + i) * 0.03; g.fillStyle = `rgba(255,200,130,${0.05 * w.sun})`; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a0 - 0.07) * 340, sy + Math.sin(a0 - 0.07) * 340); g.lineTo(sx + Math.cos(a0 + 0.07) * 340, sy + Math.sin(a0 + 0.07) * 340); g.closePath(); g.fill(); }
    }
    // birds by day
    if (w.day + w.sun * 0.5 > 0.3) for (const b of this.birds) { b.x += b.v * dt; if (b.x > W + 6) { b.x = -6; b.y = 46 + hash(b.p, t) * 44; } const y = b.y + Math.sin(t * 0.5 + b.p) * 6, f = Math.sin(t * 9 + b.p) > 0 ? -1 : 0, a = 0.8 * (w.day + w.sun * 0.5), col = [28, 32, 52]; px(b.x, y + f, col, a); px(b.x - 1, y, col, a); px(b.x + 1, y, col, a); px(b.x - 2, y - f, col, a * 0.8); px(b.x + 2, y - f, col, a * 0.8); }
    // fireflies at night, butterflies by day, petals always
    for (const f of this.flies) {
      f.x += Math.sin(t * 0.3 * f.s + f.p) * dt * 9; f.y += Math.cos(t * 0.4 * f.s + f.p) * dt * 4;
      if (f.x < -4) f.x = W + 4; if (f.x > W + 4) f.x = -4; f.y = clamp(f.y, 160, 214);
      if (w.night > 0.25) { const tw = 0.5 + 0.5 * Math.sin(t * 2.2 * f.s + f.p), a = w.night * tw; px(f.x, f.y, [230, 255, 140], a, 1); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(f.x + dx, f.y + dy, [200, 255, 120], a * 0.3); }
      else if (w.day + w.sun > 0.5 && f.s > 0.9) { const wing = Math.sin(t * 14 + f.p) > 0; px(f.x, f.y, [255, 190, 90], 0.9); px(f.x + (wing ? 1 : -1), f.y - 1, [255, 220, 130], 0.85); }
    }
    for (const q of this.petals) { q.x += (6 + q.v * 0.5) * dt; q.y += q.v * dt * 0.7; if (q.x > W + 2 || q.y > 210) { q.x = -2; q.y = hash(q.p, t) * 120; } px(q.x + Math.sin(t * 1.4 + q.p) * 3, q.y, w.sun > 0.4 ? [255, 196, 150] : [255, 255, 235], 0.55 * (1 - w.night * 0.6)); }
  }
}
const HOR_Y = (s, h) => s.HOR + 6 - Math.max(-0.14, h) * (s.HOR - 30);
