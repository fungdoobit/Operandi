// THE ABYSSAL MAW: Module 2's boss (Isaac 2026-10-24). Mittens, the orange tabby, sits and yawns, and tentacles pour out of his
// open mouth. The look was approved as a design test (tools/maw-design/maw-design-test.html); this is that art as a battle foe,
// wearing the same interface as PixelGolem (to, rest, hurt, point, pagePoint, fxv, canvas) so the shared battle code works on it.
//
// Everything is drawn into ONE overlay canvas the size of the battle world, in 2-px "cells", so the tentacles can reach across the
// whole stage. The canvas is a child of the foe element, so abilities that move or fade the foe (fx.move, opacity) carry it along.
//   the cat: every sprite frame goes through one hi-bit pass (Scale3x smoothing, a 1-cell outline, rim light, dithered shading)
//   the tentacles: round tubes shaded from the blurred silhouette, in the colours of the cat's mouth, with cup suckers
import { battleTime } from "../battle-time.js";

export const CELL = 2;        // design px per cell (GOLEM's art pixels are 2 px too)
export const SK = 0.75;        // the tentacles are drawn a bit bigger than the cat (the cat is small next to them)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => hash(a * 57 + b * 131.7); return lerp(lerp(h(ix, iy), h(ix + 1, iy), u), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), u), v); }
const EASE = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) ** 2, io: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2), back: (u) => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2 };
const eout3 = (u) => 1 - (1 - u) ** 3;

// ---- the cat: sheets -> hi-bit frames ------------------------------------------------------------------------------
// [file, frame size, frames, durations(ms)]
const SHEETS = {
  run: ["run.png", 48, 6, [90, 90, 90, 90, 90, 90]],
  idle: ["idle.png", 48, 12, Array(12).fill(120)],
  lie: ["g91.png", 64, 8, [400, 120, 120, 120, 120, 120, 120, 120]],
  lieYawn: ["g92.png", 64, 8, [250, 250, 150, 150, 150, 150, 250, 250]],
  sitYawn: ["g93.png", 64, 7, [100, 100, 100, 200, 300, 100, 100]],
  sitIdle: ["g94.png", 64, 7, Array(7).fill(350)],
  sleep: ["g95.png", 64, 4, Array(4).fill(450)],
};
// One pipeline for EVERY cat frame: Scale2x smooths the diagonals (each sprite pixel becomes 2x2 cells, so the cat stands about as
// tall as PYRO), the thick outline is thinned to one cell, inner dark lines soften to brown, and light from the top-left adds a rim
// light, a dithered second light band, shadow bands and a touch of fur grain.
function hiBit(sd, w, h) {
  const key = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return "t"; const o = (y * w + x) * 4; return sd[o + 3] < 128 ? "t" : sd[o] + "," + sd[o + 1] + "," + sd[o + 2]; };
  const NW = w * 2, NH = h * 2, cat = new Array(NW * NH).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const E = key(x, y); if (E === "t") continue;
    const B = key(x, y - 1), D = key(x - 1, y), Fk = key(x + 1, y), Hh = key(x, y + 1);
    const e = [
      D === B && B !== Fk && D !== Hh ? D : E,
      B === Fk && B !== D && Fk !== Hh ? Fk : E,
      D === Hh && D !== B && Hh !== Fk ? D : E,
      Hh === Fk && D !== Hh && B !== Fk ? Fk : E,
    ];
    for (let i = 0; i < 4; i++) if (e[i] !== "t") cat[(y * 2 + (i >> 1)) * NW + x * 2 + (i & 1)] = e[i].split(",").map(Number);
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= NW || y >= NH ? null : cat[y * NW + x]);
  const isDark = (c) => c && c[0] + c[1] + c[2] < 130;
  const mix = (c, t, k) => c.map((v, i) => Math.round(v + (t[i] - v) * k));
  const cells = new Array(NW * NH).fill(null);
  let minX = 1e9, maxX = -1, maxY = -1;
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    let c = at(x, y); if (!c) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    if (isDark(c)) { cells[y * NW + x] = edge ? [20, 8, 3] : [56, 28, 6]; continue; }
    const lit2 = (!at(x - 3, y - 4) || isDark(at(x - 2, y - 3))) && bay(x, y) < 0.5;
    const sh = !at(x + 2, y + 2) || isDark(at(x + 2, y + 2)), sh2 = (!at(x + 4, y + 5) || isDark(at(x + 3, y + 3))) && bay(x, y) < 0.5;
    if (!at(x - 1, y - 1)) c = mix(c, [255, 236, 190], 0.3);
    else if (lit2) c = mix(c, [255, 220, 150], 0.2);
    else if (sh) c = mix(c, [60, 24, 6], 0.38);
    else if (sh2) c = mix(c, [80, 34, 8], 0.2);
    if (bay(x, y) < 0.08 && !isDark(c)) c = mix(c, [255, 200, 120], 0.12);
    cells[y * NW + x] = c;
  }
  return { NW, NH, cells, minX, maxX, maxY };
}
let sheetsPromise = null;
function loadSheets() {
  sheetsPromise ||= (async () => {
    const A = {};
    for (const [name, [file, fw, n, durs]] of Object.entries(SHEETS)) {
      const im = new Image(); im.src = new URL("../../assets/mittens/" + file, import.meta.url).href; await im.decode();
      const c = document.createElement("canvas"); c.width = fw; c.height = fw; const g = c.getContext("2d", { willReadFrequently: true });
      const frames = []; let base = 0;
      for (let i = 0; i < n; i++) { g.clearRect(0, 0, fw, fw); g.drawImage(im, i * fw, 0, fw, fw, 0, 0, fw, fw); const f = hiBit(g.getImageData(0, 0, fw, fw).data, fw, fw); frames.push(f); base = Math.max(base, f.maxY + 1); }
      const f0 = frames[name === "run" ? 2 : 0];
      A[name] = { frames, durs, total: durs.reduce((a, b) => a + b, 0), base, anchor: (f0.minX + f0.maxX) / 2 };
    }
    return A;
  })();
  return sheetsPromise;
}
function frameAt(a, ms, loop = true) {
  let t = loop ? ms % a.total : Math.min(ms, a.total - 1);
  for (let i = 0; i < a.frames.length; i++) { if (t < a.durs[i]) return i; t -= a.durs[i]; }
  return a.frames.length - 1;
}

// ---- tentacles ---------------------------------------------------------------------------------------------------
const PAL_F = ["#2c060f", "#6a1424", "#b83f3f", "#d85a58", "#f59a90"].map(hex);   // the colours of his mouth's inside
const PAL_B = ["#1e040a", "#4a0e1a", "#8a2c34", "#b04448", "#d87a76"].map(hex);   // the arms further back
const OUTL = hex("#1a0308");
const LX = -0.55, LY = -0.75, LL = Math.hypot(LX, LY);
function boxBlur(src, w, h, R) {
  const tmp = new Float32Array(w * h), dst = new Float32Array(w * h), k = 1 / (2 * R + 1);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -R; x <= R; x++) s += src[y * w + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s * k; s += src[y * w + clamp(x + R + 1, 0, w - 1)] - src[y * w + clamp(x - R, 0, w - 1)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -R; y <= R; y++) s += tmp[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { dst[y * w + x] = s * k; s += tmp[clamp(y + R + 1, 0, h - 1) * w + x] - tmp[clamp(y - R, 0, h - 1) * w + x]; } }
  return dst;
}
export function spl(pts, t) { const n = pts.length - 1, f = Math.min(n - 1e-9, t * n), i = Math.floor(f), u = f - i, p = (k) => pts[Math.max(0, Math.min(n, k))]; const c = (a, b, c2, d) => 0.5 * ((2 * b) + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u); return [c(p(i - 1)[0], p(i)[0], p(i + 1)[0], p(i + 2)[0]), c(p(i - 1)[1], p(i)[1], p(i + 1)[1], p(i + 2)[1])]; }
const maskCv = document.createElement("canvas"), mg = maskCv.getContext("2d", { willReadFrequently: true });

// The seven arms from the mouth and the one behind his neck, as approved. Points are relative to the mouth (cat cells, before SK).
const ARMS = [
  { back: true, pts: [[0, 0], [-10, -26], [-34, -48], [-62, -56], [-86, -50], [-96, -34], [-84, -26]], w: [7, 1.4] },
  { pts: [[0, -2], [-4, -30], [-18, -60], [-40, -84], [-66, -96], [-84, -84], [-76, -70]], w: [7, 1.4], pal: PAL_B },
  { pts: [[0, 0], [-10, -18], [-6, -52], [-14, -84], [-36, -104], [-54, -100], [-52, -88]], w: [6, 1.4], pal: PAL_B },
  { pts: [[-2, 3], [-26, 12], [-52, 8], [-78, 20], [-104, 14], [-122, -2], [-116, -18], [-100, -14]], w: [10, 1.6] },
  { pts: [[-1, 0], [-24, -14], [-48, -30], [-72, -26], [-92, -42], [-96, -66], [-82, -76], [-70, -64]], w: [10, 1.6] },
  { pts: [[-1, 4], [-22, 22], [-48, 34], [-74, 30], [-96, 38], [-110, 28], [-104, 16]], w: [8, 1.4] },
  { pts: [[-2, -1], [-8, -28], [-24, -54], [-46, -70], [-60, -92], [-52, -110], [-36, -108]], w: [8, 1.4] },
  { pts: [[-3, 3], [-14, 24], [-30, 28], [-44, 22], [-56, 30]], w: [6, 1.4] },
];
// The Coil Shield: every arm swings round into a curved wall in front of him (a column each, the wall leaning over him).
const wallPts = (j, n) => { const x = -34 - j * 12; return [[0, 0], [x * 0.35, 10], [x, -6], [x - 4, -50], [x + 2, -96], [x + 14, -132], [x + 34, -150], [x + 52, -146]].slice(0, Math.max(5, n)); };
const sample = (pts, n) => Array.from({ length: n }, (_, k) => spl(pts, k / (n - 1)));

export const REST = { tent: 0, writhe: 0.55, shield: 0, mouth: 0, hx: 0, hy: 0, flare: 0, whip: 0, tense: 0, lunge: 0, squash: 0, lean: 0, tilt: 0, bob: 0, glitch: 0 };

export class PixelMaw {
  // foeEl: the .bfoe element (the BattleStage positions it through layout()).
  constructor(foeEl) {
    this.foeEl = foeEl; this.name = "maw";
    // an anchor the shared code can measure and style (damage numbers, the heat tint)
    this.canvas = document.createElement("div");
    Object.assign(this.canvas.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    this.canvas.width = 150; this.canvas.height = 190;
    this.view = document.createElement("canvas");
    Object.assign(this.view.style, { position: "absolute", imageRendering: "pixelated", pointerEvents: "none" });
    foeEl.append(this.canvas, this.view);
    this.vg = this.view.getContext("2d");
    this.pose = { ...REST }; this.fxv = { flash: 0, block: 1, glitch: 0 };
    this.tweens = []; this.at = 0; this.last = performance.now();
    this.cat = { mode: "gone", x: 0, t0: 0 };   // modes: gone, run, stand, sit, lieYawn, sleep
    this.extra = [];      // extra arms an attack adds: { pts(), w:[a,b], pal, u }
    this.override = {};   // an attack can take over one of the real arms: override[i](idlePts) -> pts
    this.palOv = {};      // ...and recolour it
    this.W = 0; this.H = 0; this.F = null;
    this.sheets = null; this.ready = loadSheets().then((s) => { this.sheets = s; });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // The battle world is wd x hd design px; the floor is at floorY; the foe's element stands rightEdge px from the right.
  layout(wd, hd, floorY, rightEdge) {
    const w = 150, h = 190, left = wd - rightEdge - w, top = floorY - h + 8;
    this.dw = wd; this.floorY = floorY; this.foeLeft = left; this.foeTop = top; this.foeW = w;
    this.W = Math.ceil(wd / CELL); this.H = Math.ceil(hd / CELL);
    this.F = new Uint8ClampedArray(this.W * this.H * 4); this.img = new ImageData(this.F, this.W, this.H);
    Object.assign(this.foeEl.style, { left: left + "px", top: top + "px", right: "auto", bottom: "auto", width: w + "px", height: h + "px" });
    this.view.width = this.W; this.view.height = this.H;
    Object.assign(this.view.style, { left: -left + "px", top: -top + "px", width: this.W * CELL + "px", height: this.H * CELL + "px" });
    this.floorC = Math.round(floorY / CELL) + 2;
    this.xSit = Math.round((left + 70) / CELL);          // the sitting cat's anchor, in cells
    this.mouth = [this.xSit - 7, this.floorC - 37];       // where the tentacles come out
    this.rel = null;
  }
  setPx() {}   // BattleStage.fit calls it on every foe

  // ---- the shared foe interface --------------------------------------------------------------------------------
  to(to, ms, ease = "io", obj = this.pose) {
    return new Promise((done) => {
      const from = {}; for (const k in to) from[k] = obj[k] ?? 0;
      this.tweens.push({ obj, from, to, ms, t: 0, ease: EASE[ease] || EASE.io, done });
    });
  }
  wait(ms) { return this.to({}, ms); }
  rest(ms = 600) { return this.to({ tent: this.pose.tent > 0.5 ? 1 : 0, writhe: REST.writhe, shield: this.pose.shield, mouth: this.pose.mouth, hx: 0, hy: 0, flare: 0, whip: 0, tense: 0, lunge: 0, squash: 0, lean: 0, tilt: 0, bob: 0 }, ms, "io"); }
  // Hit: the cat flinches, the arms thrash, a flash.
  hurt({ crit = false } = {}) {
    this.fxv.flash = crit ? 1 : 0.6; this.to({ flash: 0 }, crit ? 420 : 260, "lin", this.fxv);
    this.to({ hx: crit ? 9 : 5, hy: -2 }, 70, "out").then(() => this.to({ hx: 0, hy: 0 }, 260, "back"));
    this.to({ writhe: crit ? 1.6 : 1.1 }, 80, "out").then(() => this.to({ writhe: REST.writhe }, 700, "io"));
  }
  // Page-space points on him, for aiming and effects. core = his mouth; claw = his chest; muzzle = just in front of the mouth.
  designToPage(x, y) {
    const r = this.foeEl.getBoundingClientRect(), s = r.width / this.foeW;
    return { x: r.left + (x - this.foeLeft) * s, y: r.top + (y - this.foeTop) * s };
  }
  mouthCells() { return [this.mouth[0] + this.pose.hx, this.mouth[1] + this.pose.hy]; }
  mouthD() { const m = this.mouth || [0, 0]; return { x: (m[0] + this.pose.hx) * CELL, y: (m[1] + this.pose.hy) * CELL }; }
  point(name) {
    const m = this.mouthD();
    const at = { core: [0, 0], claw: [-26, 34], muzzle: [-40, 0], thruster: [10, 60] }[name] || [0, 0];
    return this.designToPage(m.x + at[0], m.y + at[1]);
  }
  pagePoint(L = [0, 0, 0], part) { const m = this.mouthD(); return this.designToPage(m.x + L[0] * 60, m.y - L[1] * 60); }
  localPoint(L = [0, 0, 0]) { const m = this.mouthD(); return { x: m.x - this.foeLeft + L[0] * 60, y: m.y - this.foeTop - L[1] * 60 }; }

  // ---- the cat ---------------------------------------------------------------------------------------------------
  setCat(mode, x = this.cat.x) { this.cat = { mode, x, t0: this.at }; }
  // slide the cat to x (cells) over ms, in the current mode
  moveCat(x, ms, ease = "io") { const c = this.cat; return this.to({ x }, ms, ease, c); }

  loop(now) {
    if (!this.view.isConnected) return;
    const frame = now - this.last, raw = Math.min(frame, 50); this.last = now;
    this.avg = (this.avg ?? 16) * 0.95 + Math.min(frame, 100) * 0.05;
    if (this.avg > 26) this.half = true; else if (this.avg < 19) this.half = false;   // slow machines draw him every other frame
    this.skip = this.half && !this.skip;
    const dt = battleTime.step(now, raw);
    this.at += dt;
    this.tweens = this.tweens.filter((tw) => {
      tw.t = Math.min(tw.t + dt, tw.ms);
      const k = tw.ms ? tw.ease(tw.t / tw.ms) : 1;
      for (const n in tw.to) tw.obj[n] = tw.from[n] + (tw.to[n] - tw.from[n]) * k;
      if (tw.t >= tw.ms) { tw.done(); return false; }
      return true;
    });
    if (!this.skip) this.render();
    requestAnimationFrame(this.loop);
  }

  // ---- drawing -------------------------------------------------------------------------------------------------
  put(x, y, c) { if (x < 0 || y < 0 || x >= this.W || y >= this.H) return; const o = (y * this.W + x) * 4, F = this.F; F[o] = c[0]; F[o + 1] = c[1]; F[o + 2] = c[2]; F[o + 3] = 255; }
  // a soft contact shadow so he sits ON the floor
  shadow(cx, cy, rx) {
    const F = this.F, W = this.W;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -rx; dx <= rx; dx++) {
      const d = (dx / rx) ** 2 + (dy / 3) ** 2; if (d >= 1) continue;
      const x = Math.round(cx + dx), y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= this.H) continue;
      if (bay(x, y) > (1 - d) * 1.1) continue;
      const o = (y * W + x) * 4; F[o] = 8; F[o + 1] = 6; F[o + 2] = 14; F[o + 3] = 150;
    }
  }
  drawCat() {
    const A = this.sheets, c = this.cat, P = this.pose; if (c.mode === "gone") return;
    const t = this.at - c.t0;
    let anim, fi, x = c.x, y = this.floorC;
    if (c.mode === "run") { anim = "run"; fi = frameAt(A.run, t); }
    else if (c.mode === "stand") { anim = "idle"; fi = frameAt(A.idle, t); }
    else if (c.mode === "lieYawn") { anim = "lieYawn"; fi = frameAt(A.lieYawn, t); }
    else if (c.mode === "sleep") { anim = "sleep"; fi = frameAt(A.sleep, t); }
    else if (P.mouth > 0.02) { anim = "sitYawn"; fi = clamp(Math.round(P.mouth * 4), 0, 6); }   // 0..1 opens the mouth: frames 0 to 4
    else { anim = "sitIdle"; fi = frameAt(A.sitIdle, t); }
    if (c.mode === "sit" && P.mouth < 0) { anim = "sitYawn"; fi = 5; }                               // negative: closing again
    const a = A[anim], f = a.frames[fi];
    x += P.hx; y += P.hy;
    this.shadow(Math.round(x), this.floorC, 22);
    for (let yy = 0; yy < f.NH; yy++) for (let xx = 0; xx < f.NW; xx++) { const col = f.cells[yy * f.NW + xx]; if (col) this.put(Math.round(x + (a.anchor - xx)), Math.round(y - (a.base - yy)), col); }
  }
  // One arm: pts are absolute cells; u is how much has grown.
  tentacle(pts, w0, w1, pal, u, seed = 0) {
    if (u <= 0.01) return;
    const rad = (t) => { const base = lerp(w0, w1, t ** 0.75) * (1 + 0.07 * Math.sin(t * 15 + seed * 2.3)), tipRound = clamp((u - t) / 0.07 + 0.3, 0, 1); return base * (u < 1 ? Math.sqrt(tipRound) : 1) * (0.45 + 0.55 * clamp(u * 2.2)); };
    // the arm's box: only this part of the world is blurred and shaded
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = Math.ceil(Math.max(w0, w1) + 9);
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(this.W, Math.ceil(x1 + pad)); y1 = Math.min(this.H, Math.ceil(y1 + pad));
    const w = x1 - x0, h = y1 - y0; if (w < 4 || h < 4) return;
    if (maskCv.width < w || maskCv.height < h) { maskCv.width = Math.max(maskCv.width, w); maskCv.height = Math.max(maskCv.height, h); }
    mg.clearRect(0, 0, maskCv.width, maskCv.height); mg.fillStyle = "#fff";
    const lp = pts.map(([x, y]) => [x - x0, y - y0]);
    for (let t = 0; t <= u; t += 0.0015) { const [x, y] = spl(lp, t); mg.beginPath(); mg.arc(x, y, rad(t), 0, 7); mg.fill(); }
    const a = mg.getImageData(0, 0, w, h).data, mask = new Float32Array(w * h), solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { solid[i] = a[i * 4 + 3] > 127 ? 1 : 0; mask[i] = solid[i]; }
    const B2 = boxBlur(mask, w, h, 5), B1 = boxBlur(mask, w, h, 2), B3 = boxBlur(mask, w, h, 4);
    const m = (x, y) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x];
    const F = this.F, W = this.W;
    // it casts a soft shadow on whatever is under it (other arms, the cat): that separates the overlapping arms
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (solid[y * w + x]) continue; const sh = B3[Math.min(h - 1, y + 2) * w + Math.max(0, x - 2)]; if (sh > 0.15) { const o = ((y + y0) * W + x + x0) * 4; if (F[o + 3]) { const k = 1 - 0.38 * clamp(sh * 1.6); F[o] *= k; F[o + 1] *= k; F[o + 2] *= k; } } }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid[y * w + x]) continue;
      const gx = (B2[y * w + Math.min(w - 1, x + 1)] - B2[y * w + Math.max(0, x - 1)]) / 2, gy = (B2[Math.min(h - 1, y + 1) * w + x] - B2[Math.max(0, y - 1) * w + x]) / 2;
      const mag = Math.hypot(gx, gy), nx = mag ? -gx / mag : 0, ny = mag ? -gy / mag : 0, form = clamp(mag / 0.07), d = (nx * LX + ny * LY) / LL;
      let I = 0.5 + 0.5 * d * form;
      I += (B1[y * w + x] < 0.62 ? d * 0.25 : 0);
      I += (vnoise((x + x0) * 0.22 + seed * 9, (y + y0) * 0.22) - 0.5) * 0.1;
      const q = I > 0.9 ? 4 : I > 0.7 ? 3 : I > 0.4 ? 2 : I > 0.2 ? 1 : 0, edgeD = Math.min(Math.abs(I - 0.9), Math.abs(I - 0.7), Math.abs(I - 0.4), Math.abs(I - 0.2));
      const qq = edgeD < 0.035 && bay(x + x0, y + y0) < 0.5 ? clamp(q + (I > [0.2, 0.4, 0.7, 0.9][Math.min(3, Math.max(0, q - 1))] ? -1 : 1), 0, 4) : q;
      this.put(x + x0, y + y0, pal[qq]);
    }
    const root = this.mouth;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!m(x, y) && (m(x - 1, y) || m(x + 1, y) || m(x, y - 1) || m(x, y + 1))) { if (Math.hypot(x + x0 - root[0] - this.pose.hx, y + y0 - root[1] - this.pose.hy) < 14) continue; this.put(x + x0, y + y0, OUTL); }
    // suckers: little cups, bigger near the root
    let last = null, dist = 1e9;
    for (let t = 0.05; t < u - 0.025; t += 0.002) {
      const [x, y] = spl(lp, t); if (last) dist += Math.hypot(x - last[0], y - last[1]); last = [x, y];
      const r = rad(t); if (r < 2.6) continue;
      const rr = clamp(r * 0.5, 2, 5.6); if (dist < rr * 2.6 + 1) continue; dist = 0;
      const [x2, y2] = spl(lp, Math.min(1, t + 0.01)), tx = x2 - x, ty = y2 - y, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      let nx = -uy, ny = ux; if (ny + 0.3 * nx < 0) { nx = -nx; ny = -ny; }
      const cx = x + nx * r * 0.3, cy = y + ny * r * 0.3;
      for (let yy = -7; yy <= 7; yy++) for (let xx = -7; xx <= 7; xx++) {
        const A2 = xx * nx + yy * ny, Bt = xx * ux + yy * uy, e = (A2 / rr) ** 2 + (Bt / (rr * 0.9)) ** 2; if (e > 1) continue;
        const px = Math.round(cx + xx), py = Math.round(cy + yy); if (!m(px, py)) continue;
        const lit = (xx * LX + yy * LY) / (LL * rr);
        this.put(px + x0, py + y0, e > 0.62 ? (lit < 0 ? hex("#ffd6c8") : hex("#a8404a")) : e > 0.22 ? (lit > 0.15 ? hex("#c4505e") : hex("#6a1424")) : hex("#ff7a86"));
      }
    }
  }
  armPts(i) {
    const P = this.pose, A = ARMS[i], M = this.mouth, s = this.at / 1000, wr = P.writhe, n = A.pts.length;
    const base = A.pts.map(([x, y], k) => {
      const live = k / 3 * 1.0;
      return [x * SK + Math.sin(s * 2.1 + i * 1.7 + k * 0.9) * k * 1.6 * wr * live, y * SK * 0.78 + Math.cos(s * 1.7 + i * 2.3 + k * 1.1) * k * 1.4 * wr * live];
    });
    let pts = base;
    if (P.shield > 0.001) {
      const wall = sample(wallPts(i, 8).map(([x, y]) => [x * SK * 0.9, y * SK * 0.78]), n), cur = sample(base, n);
      pts = cur.map((p, k) => [lerp(p[0], wall[k][0], P.shield) + Math.sin(s * 3 + i + k) * k * 0.5 * P.shield, lerp(p[1], wall[k][1], P.shield)]);
    }
    const abs = pts.map(([x, y]) => [M[0] + P.hx + x, M[1] + P.hy + y]);
    return this.override[i] ? this.override[i](abs) : abs;
  }
  render() {
    if (!this.sheets || !this.F) return;
    const P = this.pose, F = this.F, W = this.W;
    F.fill(0);
    for (let i = 0; i < ARMS.length; i++) if (ARMS[i].back) this.tentacle(this.armPts(i), ARMS[i].w[0] * SK, ARMS[i].w[1], this.palOv[i] || ARMS[i].pal || PAL_F, clamp(P.tent * 1.7 - i * 0.1), i);
    this.drawCat();
    for (let i = 0; i < ARMS.length; i++) if (!ARMS[i].back) this.tentacle(this.armPts(i), ARMS[i].w[0] * SK, ARMS[i].w[1], this.palOv[i] || ARMS[i].pal || PAL_F, eout3(clamp(P.tent * 1.7 - i * 0.1)), i);
    for (const e of this.extra) this.tentacle(e.pts(), e.w[0] * SK, e.w[1], e.pal || PAL_F, e.u ? e.u() : 1, e.seed || 9);
    const fl = this.fxv.flash;
    if (fl > 0.02) for (let i = 0; i < W * this.H; i++) { const o = i * 4; if (F[o + 3]) { F[o] += (255 - F[o]) * fl * 0.7; F[o + 1] += (255 - F[o + 1]) * fl * 0.7; F[o + 2] += (255 - F[o + 2]) * fl * 0.7; } }
    if (this.fxv.glitch > 0.05) this.glitch(this.fxv.glitch);
    this.vg.putImageData(this.img, 0, 0);
  }
  // Glitch: a few rows slide sideways.
  glitch(g) {
    const W = this.W, F = this.F, rows = Math.round(4 + g * 8);
    for (let n = 0; n < rows; n++) {
      const y = Math.floor(hash(Math.floor(this.at / 60) * 7 + n) * this.H), dx = Math.round((hash(n + this.at / 90) - 0.5) * 16 * g), len = 2 + Math.floor(hash(n * 3 + y) * 6);
      for (let yy = y; yy < Math.min(this.H, y + len); yy++) { const row = F.slice(yy * W * 4, (yy + 1) * W * 4); for (let x = 0; x < W; x++) { const sx = x - dx; if (sx >= 0 && sx < W) { const o = (yy * W + x) * 4, p = sx * 4; F[o] = row[p]; F[o + 1] = row[p + 1]; F[o + 2] = row[p + 2]; F[o + 3] = row[p + 3]; } } }
    }
  }
  // Fade in from nothing (the shared intro calls it); the Maw has no pixelate-in, so it only has to resolve.
  resolve() { return Promise.resolve(); }
}
