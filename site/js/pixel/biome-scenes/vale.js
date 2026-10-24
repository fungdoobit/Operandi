// TWILIGHT VALE: the Maw's arena (Isaac 2026-10-24, "an original background, really high quality, that slowly goes from day to a
// beautiful sunset to night, with flowy natural surroundings and enough flat space for the fighters").
//
// A mountain valley seen from a stone-and-earth road: snowy peaks behind pine hills, a lake that mirrors the sky, a little cottage
// on a hill, a willow on the left and tall pines on the right, a flat road across the bottom for the fighters to stand on.
//
// How the time of day works: the still scene is painted ONCE into "material maps" (which material each art pixel is, and how
// lit), then every quarter second the maps are re-coloured for the current time of day (day -> sunset -> night -> sunrise...).
// That is cheap, and it lets one painting have day, golden-hour and moonlit colours. A light layer on top animates the sun and
// moon, the stars, the clouds, the water glitter, birds, fireflies, drifting petals and the swaying grass and willow.
import { PixelScene, hex } from "../scene-base.js";

const DAY_LENGTH = 480;   // seconds for a whole day: sunset at 2 minutes, night at 4, sunrise at 6
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x, y) => 0.55 * vn(x, y) + 0.3 * vn(x * 2.1 + 5, y * 2.1) + 0.15 * vn(x * 4.3 + 9, y * 4.3);
const lerp2 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => B4[(y & 3) * 4 + (x & 3)];

// materials
const SKY = 0, FAR = 1, SNOW = 2, HILL = 3, FOL = 4, TRUNK = 5, WATER = 6, GRASS = 7, PATH = 8, ROCK = 9, FLOWER = 10, WALL = 11, ROOF = 12, WINDOW = 13, SHORE = 14, LEAF = 15;
// day ramps, dark -> light (5 steps); the other times of day are derived from these
const R = (...c) => c.map(hex);
const RAMP = {
  [FAR]: R("#46608c", "#5f7aa6", "#7f9bc2", "#a2bbd9", "#c4d6ec"),
  [SNOW]: R("#9fb4d6", "#c6d6ee", "#e6f0fa", "#f8fbff", "#ffffff"),
  [HILL]: R("#2a6a3e", "#3a8a4a", "#54a85a", "#78c472", "#a0dc8a"),
  [FOL]: R("#0f3320", "#1a5a2c", "#2a8438", "#4cae48", "#8ad05a"),
  [TRUNK]: R("#24160f", "#43291a", "#684428", "#8e6238", "#b88650"),
  [GRASS]: R("#1c5a24", "#2c7a2c", "#48a03a", "#78c84a", "#b0e468"),
  [PATH]: R("#6e5238", "#8f6e4c", "#b0906a", "#cfb084", "#e6cca4"),
  [ROCK]: R("#363b48", "#525968", "#76808f", "#9ca6b6", "#c4ccd8"),
  [WALL]: R("#8a7a6a", "#b0a08a", "#d2c4a8", "#eadcc0", "#fff0d8"),
  [ROOF]: R("#4a2220", "#6e3430", "#984a40", "#c46a52", "#e69272"),
  [SHORE]: R("#4a4438", "#6a6250", "#8a8068", "#aca288", "#cec6a8"),
  [LEAF]: R("#143a1e", "#1f6430", "#34903c", "#5cba50", "#a4e068"),
};
const SKY_STOPS = {
  day: R("#2a6fc8", "#4f93dc", "#7fb6ea", "#a9d2f2", "#cfe8f8", "#eef6fb"),
  sun: R("#1d1f4e", "#4a3a7a", "#a04f8a", "#e8706a", "#ffa860", "#ffd88a"),
  night: R("#04061a", "#080c2a", "#0e1640", "#16225a", "#223070", "#2c3c84"),
};
const FLOWERS = R("#ffffff", "#ffe45a", "#ff7ab0", "#b090ff", "#ff6a50");

export class Scene extends PixelScene {
  constructor(stage) { super(stage); this.t0 = performance.now(); this.lastTint = -1e9; }

  // the time of day, 0..1: 0 noon, .25 sunset, .5 midnight, .75 sunrise. ?tod=0.25 in the address (or window.__tod) pins it.
  phase(t) {
    const pin = window.__tod ?? new URLSearchParams(location.search).get("tod");
    return pin != null && pin !== "" ? +pin % 1 : (t / DAY_LENGTH) % 1;
  }
  sunMoon(u) {
    const a = u * Math.PI * 2, h = Math.cos(a);
    return { h, sx: 0.5 - 0.2 * Math.sin(a), mh: -h, mx: 0.5 - 0.2 * Math.sin(a + Math.PI) };
  }

  // ---- painting the maps ----------------------------------------------------------------------------------------
  paint(p) {
    const { W, H, put, dith, bay: bb, r, mix } = p;
    this.W = W; this.H = H; this.bimg = null;
    const n = W * H;
    const mat = (this.mat = new Uint8Array(n)), shd = (this.shd = new Uint8Array(n)), aux = (this.aux = new Uint8Array(n)), rim = (this.rim = new Uint8Array(n));
    const set = (x, y, m, s = 2, a = 0) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; mat[i] = m; shd[i] = clamp(Math.round(s), 0, 4); aux[i] = a; };
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? SKY : mat[Math.round(y) * W + Math.round(x)]);
    const HOR = 126;     // where the far hills meet the valley
    this.geo = { HOR };

    // 1. far mountains: tall peaks with a low pass on the left of the lake (where the sun sets), jagged ridges, striated rock faces and snow caps
    const peaks = [[0.62, 42, 98], [0.1, 66, 66], [0.2, 92, 46], [0.41, 106, 44], [0.88, 70, 62], [0.99, 62, 48], [0.5, 86, 58]];
    const ridge = (x) => { let y = HOR + 10; for (const [pxr, py, hw] of peaks) y = Math.min(y, py + Math.pow(Math.abs(x - pxr * W) / hw, 1.08) * (HOR + 10 - py)); return y + 4 * (fbm(x * 0.09, 7) - 0.5) + 3.2 * Math.abs(fbm(x * 0.21, 3) - 0.5); };
    this.ridge = new Float32Array(W); for (let x = 0; x < W; x++) this.ridge[x] = ridge(x);
    for (let x = 0; x < W; x++) {
      const top = this.ridge[x], f = this.ridge[Math.max(0, x - 2)] - this.ridge[Math.min(W - 1, x + 2)], dir = f > 0 ? 1 : -1;
      for (let y = Math.ceil(top); y < 156; y++) {
        const depth = y - top, stripe = vn((x + depth * dir * 0.9) * 0.2, depth * 0.1 + dir * 4), crev = vn((x + depth * dir * 1.6) * 0.45, depth * 0.07);
        const cap = clamp((92 - top) / 50) * 20 + 5 * stripe + (crev > 0.62 ? -6 : 0);
        const lit = Math.min(1.4, Math.abs(f) * 0.55) * dir;
        if (top < 90 && depth < cap) set(x, y, SNOW, 2.1 + lit * 1.4 + (stripe - 0.5) * 1.8 - depth / 55, stripe * 255);
        else set(x, y, FAR, 1.9 + lit * 1.6 + (stripe - 0.5) * (dir > 0 ? 3.4 : 4.6) - (crev > 0.62 ? 1.4 : 0) + (dir < 0 && stripe > 0.72 ? 1.1 : 0) - depth / 90 + (depth < 3 ? 0.8 : 0));
      }
    }
    // 2. rolling hills with pines on their crests (two layers: the far one hazier)
    const hillA = (x) => 128 - 8 * Math.sin(x * 0.012 + 1.2) - 5 * Math.sin(x * 0.034 + 0.5) + 3 * fbm(x * 0.05, 11);
    const hillB = (x) => 138 - 9 * Math.sin(x * 0.009 + 4) - 4 * Math.sin(x * 0.027 + 2) + 3 * fbm(x * 0.06, 21);
    this.hillA = hillA; this.hillB = hillB;
    for (const [fn, haze, y1] of [[hillA, 1, 160], [hillB, 0, 172]]) {
      for (let x = 0; x < W; x++) {
        const top = fn(x), lit = fn(x - 3) - fn(x + 3);
        for (let y = Math.ceil(top); y < y1; y++) set(x, y, HILL, 2.2 + (lit > 0 ? 0.9 : -0.5) * Math.exp(-(y - top) / 7) - (y - top) / 22 + (fbm(x * 0.2, y * 0.3) - 0.5) * 1.6, haze * 255);
      }
    }
    const pine = (cx, base, h, m, hz) => {
      const tiers = Math.max(3, Math.round(h / 4));
      for (let t = 0; t < tiers; t++) {
        const y0 = base - h + (t * h) / tiers, w = ((t + 1.4) / (tiers + 0.4)) * (h * 0.28), hh = h / tiers + 2;
        for (let yy = 0; yy < hh; yy++) { const hw = w * (0.25 + 0.75 * (yy / hh)); for (let xx = -Math.ceil(hw); xx <= hw; xx++) set(cx + xx, y0 + yy, FOL, 1.3 + (xx < -hw * 0.2 ? 1.4 : xx > hw * 0.35 ? -0.9 : 0.3) + (hash(cx + xx, y0 + yy) - 0.5) * 0.9 - (yy / hh) * 0.4, hz); }
      }
      for (let yy = 0; yy < 3; yy++) set(cx, base + yy, TRUNK, 1, hz);
    };
    for (let x = 6; x < W - 4; x += 5 + Math.floor(hash(x, 3) * 6)) { const tx = x + Math.floor(hash(x, 8) * 4); if (hillA(tx) < HOR + 4) pine(tx, hillA(tx) + 2, 9 + hash(tx, 5) * 10, FOL, 255); }
    for (let x = 4; x < W; x += 7 + Math.floor(hash(x, 4) * 8)) { const lakeL = W * 0.2, lakeR = W * 0.66; if (x > lakeL - 8 && x < lakeR + 8 && hillB(x) > 140) continue; pine(x, hillB(x) + 3, 12 + hash(x, 6) * 12, FOL, 90); }

    // 3. the meadow: flat-ish grassy ground from the lakeside down to the road, with tall grass tufts and wildflowers (painted first; the lake goes over it)
    const bank = (x) => 160 + 3 * Math.sin(x * 0.02 + 0.3) + 2 * Math.sin(x * 0.05 + 2) + 1.5 * fbm(x * 0.08, 5);
    for (let x = 0; x < W; x++) {
      const top = bank(x);
      for (let y = Math.ceil(top); y < H; y++) set(x, y, GRASS, 2.2 + (bank(x - 3) - bank(x + 3) > 0 ? 0.8 : -0.4) * Math.exp(-(y - top) / 5) + (fbm(x * 0.15, y * 0.25) - 0.5) * 2.2 - (y - top) / 46, 0);
    }
    // 4. the lake: an oval that mirrors the sky (coloured every frame), with a pebbly shore and reeds
    const lk = { cx: W * 0.43, cy: 153, rx: W * 0.28, ry: 14, top: 139, bot: 168 };
    this.lake = lk;
    for (let y = lk.top; y <= lk.bot; y++) for (let x = Math.floor(lk.cx - lk.rx * 1.2); x < lk.cx + lk.rx * 1.2; x++) {
      const rx = lk.rx * (1 + 0.07 * Math.sin(y * 0.4) + 0.05 * Math.sin(x * 0.06)), d = ((x - lk.cx) / rx) ** 2 + ((y - lk.cy) / lk.ry) ** 2;
      if (d < 1) set(x, y, WATER, 2, ((y - lk.top) / (lk.bot - lk.top) * 255) | 0);
      else if (d < 1.22 && y > lk.cy - 2 && hash(x, y) > 0.2) set(x, y, SHORE, 2.6 - (d - 1) * 4 + (hash(x, y) - 0.5) * 1.4);
    }
    for (let x = Math.floor(lk.cx - lk.rx); x < lk.cx + lk.rx; x += 3) { if (hash(x, 61) < 0.45) continue; const yy = Math.round(lk.cy + lk.ry * Math.sqrt(Math.max(0, 1 - ((x - lk.cx) / lk.rx) ** 2))) + 1, h = 4 + Math.floor(hash(x, 62) * 6); for (let k = 0; k < h; k++) set(x + Math.round(k * (hash(x, 63) - 0.5) * 0.3), yy - k, GRASS, 1.8 + k / h * 2); }
    // 5. the cottage on the left hill, with a chimney and a window that lights up at dusk
    const cx0 = Math.round(W * 0.115), cy0 = Math.round(hillA(W * 0.115)) - 1;
    for (let y = 0; y < 11; y++) for (let x = 0; x < 16; x++) set(cx0 + x, cy0 - 11 + y, WALL, 2.5 - (x > 11 ? 1.2 : 0) + (hash(x, y) - 0.5) * 0.5);
    for (let y = 0; y < 8; y++) { const hw = 11 - y * 1.1; for (let x = -hw; x <= hw; x++) set(cx0 + 8 + x, cy0 - 12 - y, ROOF, 1.5 + (x < 0 ? 1.4 : -0.3) + (y % 2 ? 0 : 0.4)); }
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) set(cx0 + 12 + x, cy0 - 24 + y, ROCK, 1.5 + (x === 0 ? 1 : 0));   // chimney
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) set(cx0 + 3 + x, cy0 - 8 + y, WINDOW, 2);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) set(cx0 + 10 + x, cy0 - 5 + y, TRUNK, 1.4);
    this.cottage = { x: cx0 + 13.5, y: cy0 - 24 };
    pine(cx0 - 6, cy0 + 1, 16, FOL, 0); pine(cx0 + 24, cy0 + 1, 13, FOL, 0);

    // 6. the willow on the left: a thick trunk, a round crown and long hanging strands (the strands sway in the light layer)
    const wx = Math.round(W * 0.045), wBase = 176;
    for (let y = wBase; y > 40; y--) { const w = 5 + (y - 40) / 30 + (y > wBase - 14 ? (y - (wBase - 14)) * 0.5 : 0) - Math.max(0, (90 - y)) * 0.05; for (let x = -w; x <= w; x++) set(wx + x + Math.sin(y * 0.05) * 3, y, TRUNK, 1.6 + (x < -w * 0.3 ? 1.6 : x > w * 0.4 ? -0.9 : 0.4) + (hash(x, y >> 1) - 0.5) * 0.8); }
    this.willow = { x: wx, top: 34 };
    const crown = (cx, cy, rx, ry, seed) => {
      for (let y = Math.floor(cy - ry); y < cy + ry; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy + (fbm(x * 0.2, y * 0.2 + seed) - 0.5) * 0.7;
        if (d > 1) continue;
        set(x, y, LEAF, 2.4 + (-dx * 0.9 - dy * 1.3) * 1.2 - d * 1.1 + (hash(x >> 1, y >> 1) - 0.5) * 1.2, 0);
      }
    };
    crown(wx + 18, 56, 52, 30, 1); crown(wx - 8, 44, 34, 26, 2); crown(wx + 48, 70, 38, 22, 3); crown(wx + 4, 80, 30, 18, 4);
    // 7. tall pines on the right edge, framing the scene
    for (const [px, base, h] of [[W - 10, 190, 78], [W - 34, 186, 60], [W - 56, 182, 44], [W - 3, 200, 110]]) pine(px, base, h, FOL, 0);
    // 8. rocks by the lake and a little wooden jetty
    const rock = (cx, cy, rx, ry) => { for (let y = -ry; y <= 0; y++) for (let x = -rx; x <= rx; x++) { const d = (x / rx) ** 2 + (y / ry) ** 2; if (d <= 1 + (hash(x, y) - 0.5) * 0.25) set(cx + x, cy + y, ROCK, 2.6 - d * 1.2 + (x < 0 ? 0.6 : -0.5) + (hash(x + 7, y) - 0.5) * 0.6); } };
    rock(W * 0.14, 172, 9, 5); rock(W * 0.17, 174, 6, 3); rock(W * 0.72, 170, 8, 4); rock(W * 0.75, 173, 5, 3);
    for (let x = Math.round(W * 0.3); x < Math.round(W * 0.3) + 24; x++) { set(x, 163, TRUNK, 3); set(x, 164, TRUNK, 2); set(x, 165, TRUNK, 1); }
    for (let i = 0; i < 5; i++) for (let y = 163; y < 171; y++) set(Math.round(W * 0.3) + 2 + i * 5, y, TRUNK, 1);

    // 9. the road: a flat packed-earth road across the whole bottom (the fighters stand on it), with ruts, pebbles and a grassy lip
    const roadTop = 192;
    for (let x = 0; x < W; x++) {
      const lip = roadTop + Math.round(2 * Math.sin(x * 0.05) + 1.5 * fbm(x * 0.1, 2));
      for (let y = lip; y < H; y++) {
        const v = (y - lip) / (H - lip), g = fbm(x * 0.09, y * 0.22);
        let s = 2.6 - v * 1.2 + (g - 0.5) * 2;
        if (y - lip < 2) s -= 1.4;                               // the shadowed edge under the grass lip
        if (Math.abs(y - (lip + 11)) < 1.4 && g > 0.42) s -= 1.2;  // wheel ruts
        if (Math.abs(y - (lip + 20)) < 1.2 && g > 0.5) s -= 1.1;
        set(x, y, PATH, s, 0);
      }
      for (let g = 0; g < 3; g++) if (hash(x, g + 40) > 0.93) set(x, lip - 1 + g, GRASS, 3 + hash(x, g), 0);
    }
    for (let i = 0; i < 90; i++) { const x = Math.floor(hash(i, 1) * W), y = roadTop + 6 + Math.floor(hash(i, 2) * (H - roadTop - 8)); set(x, y, ROCK, 2 + hash(i, 3) * 2); if (hash(i, 4) > 0.5) set(x + 1, y, ROCK, 1.2); }
    // 10. wildflowers in the meadow and along the lip of the road
    for (let i = 0; i < 260; i++) { const x = Math.floor(hash(i, 9) * W), y = Math.floor(lerp(150, roadTop - 2, hash(i, 10))); if (at(x, y) === GRASS && y > bank(x) + 3) { const c = Math.floor(hash(i, 11) * FLOWERS.length); set(x, y, FLOWER, 3, c); if (hash(i, 12) > 0.7) set(x, y - 1, GRASS, 3); } }
    // lantern post by the road (its lamp is lit at night)
    const lx = Math.round(W * 0.47);
    for (let y = 168; y < 194; y++) set(lx, y, TRUNK, 1.5);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) set(lx - 1 + x, 163 + y, WINDOW, 2, 1);
    this.lamp = { x: lx + 1, y: 165 };
    // 11. rim flags: edges that face the sun (right) or the moon (left), to catch a warm or cool light
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, m = mat[i]; if (m === SKY || m === WATER) continue; let f = 0; if (mat[i + 1] === SKY) f |= 1; if (mat[i - 1] === SKY) f |= 2; if (mat[i - W] === SKY) f |= 4; rim[i] = f; }
    // stars, birds, fireflies and petals for the light layer
    this.stars = Array.from({ length: 110 }, (_, i) => ({ x: hash(i, 70) * W, y: hash(i, 71) * 92, p: hash(i, 72) * 6.28, b: 0.4 + hash(i, 73) * 0.6 }));
    this.flies = Array.from({ length: 26 }, (_, i) => ({ x: hash(i, 80) * W, y: 150 + hash(i, 81) * 44, p: hash(i, 82) * 6.28, s: 0.4 + hash(i, 83) }));
    this.petals = Array.from({ length: 16 }, (_, i) => ({ x: hash(i, 90) * W, y: hash(i, 91) * 190, v: 4 + hash(i, 92) * 6, p: hash(i, 93) * 6.28 }));
    this.birds = Array.from({ length: 4 }, (_, i) => ({ x: hash(i, 100) * W, y: 40 + hash(i, 101) * 30, v: 6 + hash(i, 102) * 4, p: hash(i, 103) * 6.28 }));
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: hash(i, 110) * W * 1.4 - W * 0.2, y: 18 + hash(i, 111) * 50, w: 38 + hash(i, 112) * 50, s: 0.8 + hash(i, 113) * 1.2, v: 1.2 + hash(i, 114) * 1.6 }));
    this.tint(performance.now(), (x, y, c) => put(x, y, c));
  }

  // ---- colouring the maps for the time of day ------------------------------------------------------------------
  weights(u) {
    const { h } = this.sunMoon(u);
    const day = smooth(0.18, 0.62, h), night = smooth(0.04, -0.32, h);
    return { day, night, sun: clamp(1 - day - night), h, right: Math.sin(u * Math.PI * 2) };   // right > 0: the afternoon (the sun sets on the right)
  }
  grade(c, w, haze, warm) {
    // day: as drawn. sunset: warmer and a touch darker. night: dark and blue. (haze 0..1 pushes it toward the sky at that height)
    const s = [c[0] * 1.08 + 26, c[1] * 0.74 + 6, c[2] * 0.62 + 2], n = [c[0] * 0.2 + 5, c[1] * 0.27 + 9, c[2] * 0.5 + 26];
    return [0, 1, 2].map((k) => w.day * c[k] + w.sun * s[k] + w.night * n[k]);
  }
  skyColor(v, w) {   // v: 0 top .. 1 horizon
    const stops = (set) => { const f = clamp(v) * (set.length - 1), i = Math.min(set.length - 2, Math.floor(f)), t = f - i; return [0, 1, 2].map((k) => lerp(set[i][k], set[i + 1][k], t)); };
    const d = stops(SKY_STOPS.day), s = stops(SKY_STOPS.sun), nn = stops(SKY_STOPS.night);
    return [0, 1, 2].map((k) => w.day * d[k] + w.sun * s[k] + w.night * nn[k]);
  }
  tint(now, write) {
    if (!this.mat) return;
    this.t0 ??= performance.now();
    const t = (now - this.t0) / 1000, u = this.phase(t), w = (this.w = this.weights(u)), { W, H } = this, HOR = this.geo.HOR;
    this.u = u;
    // sky rows
    const skyRow = Array.from({ length: H }, (_, y) => this.skyColor(clamp(y / (HOR + 10)), w));
    const horizon = this.skyColor(0.96, w);
    // tables: [material][shade] -> colour, graded
    const tab = {};
    for (const m in RAMP) tab[m] = RAMP[m].map((c) => this.grade(c, w));
    const lamp = clamp(w.night * 1.1 + w.sun * 0.55), glow = [255, 214, 120], warmRim = [255, 170, 90], coolRim = [150, 180, 255];
    const { mat, shd, aux, rim, lake } = this, img = this.bimg || (this.bimg = new ImageData(W, H)), d = img.data;
    const sun = this.sunMoon(u), glitterX = (w.h > 0 ? sun.sx : sun.mx) * W;
    const arcY = (h) => HOR + 16 - h * (HOR + 14 - 22), sunY = arcY(Math.max(-0.12, sun.h)), moonY = arcY(Math.max(-0.12, sun.mh)), sunA = clamp((sun.h + 0.12) * 5), moonA = clamp((sun.mh + 0.1) * 5) * (1 - w.day);
    const sunCol = lerp2([255, 250, 224], [255, 176, 96], w.sun), moonCol = [238, 244, 255];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, m = mat[i], s = shd[i];
      let c;
      if (m === SKY) {
        const row = skyRow[y]; c = row;
        // a little dither so the sky gradient has pixel-art steps instead of a smooth blur
        const q = (bay(x, y) - 0.5) * 7; c = [row[0] + q, row[1] + q, row[2] + q * 1.2];
        // a glow around the sun at sunset
        const gx = (sun.sx * W - x) / 150, gy = (HOR - 14 - sun.h * 0 - y) / 70, near = Math.max(0, 1 - Math.hypot(gx, gy)) * w.sun * (w.right > 0 ? 1 : 0.7);
        // the sun and the moon themselves, in the sky, so mountains and hills hide them as they set
        if (sunA > 0) { const dd = Math.hypot(x - sun.sx * W, y - sunY); if (dd < 9) c = sunCol; else if (dd < 40) { const k = Math.exp(-(dd - 9) / 11) * 0.5 * sunA * (0.6 + 0.4 * w.sun); c = [lerp(c[0], 255, k), lerp(c[1], 226, k * 0.9), lerp(c[2], 160, k * 0.6)]; } }
        if (moonA > 0) { const mdx = x - sun.mx * W, mdy = y - moonY, dd = Math.hypot(mdx, mdy); if (dd < 7) { const crater = (Math.hypot(mdx + 2.4, mdy + 1.6) < 1.7 || Math.hypot(mdx - 2.4, mdy - 2.6) < 1.3 || Math.hypot(mdx - 1, mdy + 3) < 1) ? 0.78 : 1; c = moonCol.map((v2) => v2 * crater); } else if (dd < 36) { const k = Math.exp(-(dd - 7) / 10) * 0.42 * moonA; c = [lerp(c[0], 170, k), lerp(c[1], 190, k), lerp(c[2], 255, k)]; } }
        if (near > 0) { const k = near * near * 0.55 + (bay(x, y) - 0.5) * 0.08; c = [lerp(c[0], 255, k * 0.9), lerp(c[1], 190, k * 0.8), lerp(c[2], 110, k * 0.6)]; }
      } else if (m === WATER) {
        // the lake: the sky (and the far hills) upside-down, rippled and darkened
        const v = aux[i] / 255, mirror = clamp((lake.top - 6 - (y - lake.top) * 0.9 + 4 * Math.sin(y * 0.9 + x * 0.05)) / (HOR + 10)), ry = Math.round(lake.top - 3 - (y - lake.top) * 0.55 + Math.sin(y * 0.8 + x * 0.04) * 1.2);
        const rm = ry >= 0 && ry < H ? mat[Math.max(0, Math.min(H - 1, ry)) * W + x] : SKY;
        if (rm !== SKY && rm !== WATER && RAMP[rm]) c = tab[rm][clamp(shd[Math.max(0, Math.min(H - 1, ry)) * W + x] - 1, 0, 4)].map((v2) => v2 * 0.82);
        else c = skyRow[Math.max(0, Math.min(H - 1, Math.round(mirror * (HOR + 10))))].map((v2) => v2 * 0.9);
        const deep = this.grade([34, 96, 140], w); c = c.map((v2, k) => lerp(v2, deep[k], 0.46)); const sk0 = skyRow[Math.min(H - 1, HOR + 4)]; c = [lerp(c[0], sk0[0], 0.18) * (0.86 + 0.1 * (1 - v)), lerp(c[1], sk0[1], 0.18) * (0.9 + 0.08 * (1 - v)), lerp(c[2], sk0[2], 0.18) * 0.98 + 8];
        if (Math.sin(y * 2.2 + x * 0.35 + t * 0.9) > 0.93) c = c.map((v2) => v2 * 1.18 + 10);   // ripple lines, drifting
      } else if (m === WINDOW) {
        const lit = aux[i] ? lamp : lamp * 0.9;
        c = lit > 0.05 ? [lerp(tab[WALL][1][0], glow[0], lit), lerp(tab[WALL][1][1], glow[1], lit), lerp(tab[WALL][1][2], glow[2], lit)] : tab[ROCK][1];
        if (!lit) c = [60, 90, 120];
      } else if (m === FLOWER) {
        const f = FLOWERS[aux[i] % FLOWERS.length]; c = this.grade(f.map((v2) => v2 * 0.95), w).map((v2, k) => v2 + w.night * 6 * k * 0.2);
      } else {
        const tb = tab[m]; let cs = s; const dq = bay(x, y), fl = Math.floor(cs), fr = cs - fl;
        c = tb[clamp(fl + (fr > dq ? 1 : 0), 0, 4)];     // ordered dithering between two shades
        const a = aux[i];
        if ((m === HILL || m === FOL) && a) {              // far things sit in haze
          const hz = (a / 255) * (0.5 * w.day + 0.45 * w.sun + 0.5 * w.night), sk = skyRow[Math.min(H - 1, HOR + 8)];
          c = [lerp(c[0], sk[0], hz), lerp(c[1], sk[1], hz), lerp(c[2], sk[2], hz)];
        }
        if (m === FAR || m === SNOW) { const hz = Math.min(0.92, 0.3 + 0.62 * clamp((y - 100) / 42)) * (0.55 * w.day + 0.5 * w.sun + 0.5 * w.night), sk = horizon; c = [lerp(c[0], sk[0], hz), lerp(c[1], sk[1], hz), lerp(c[2], sk[2], hz)]; }
        // sunlit and moonlit edges
        const rf = rim[i];
        if (rf) {
          const warm = ((rf & 1) ? 1 : 0) * w.sun * (w.right > 0 ? 1 : 0.3), cool = ((rf & 2) ? 1 : 0) * w.night * 0.5, top = ((rf & 4) ? 1 : 0) * w.day * 0.25;
          if (warm) c = [lerp(c[0], warmRim[0], warm * 0.75), lerp(c[1], warmRim[1], warm * 0.75), lerp(c[2], warmRim[2], warm * 0.7)];
          if (cool) c = [lerp(c[0], coolRim[0], cool * 0.5), lerp(c[1], coolRim[1], cool * 0.5), lerp(c[2], coolRim[2], cool * 0.5)];
          if (top) c = [c[0] + 30 * top, c[1] + 30 * top, c[2] + 22 * top];
        }
        // the lamp lights the road and the grass nearby
        if (lamp > 0.05) { const dl = Math.hypot((x - this.lamp.x) * 0.7, y - this.lamp.y); if (dl < 70) { const k = (1 - dl / 70) ** 2 * lamp * 0.55; c = [lerp(c[0], glow[0], k), lerp(c[1], glow[1], k), lerp(c[2], glow[2], k * 0.8)]; } }
      }
      write(x, y, [Math.max(0, Math.min(255, Math.round(c[0]))), Math.max(0, Math.min(255, Math.round(c[1]))), Math.max(0, Math.min(255, Math.round(c[2])))]);
    }
  }

  // ---- the light layer ---------------------------------------------------------------------------------------------
  animate({ g, t, dt, W, H, px }) {
    const now = performance.now();
    if (now - this.lastTint > 250) {
      this.lastTint = now;
      const d = (this.bimg || (this.bimg = new ImageData(this.wa, H))).data, wa = this.wa;
      this.tint(now, (x, y, c) => { const o = (y * wa + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; });
      this.base.getContext("2d").putImageData(this.bimg, 0, 0);
    }
    const w = this.w; if (!w) return;
    const u = this.u, sm = this.sunMoon(u), HOR = this.geo.HOR;
    const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    // stars
    if (w.night > 0.15) for (const s of this.stars) { const a = w.night * s.b * (0.55 + 0.45 * Math.sin(t * 1.6 + s.p)); if (a > 0.1) px(s.x, s.y, [235, 240, 255], Math.min(1, a), (s.b > 0.9 && a > 0.7) ? 2 : 1); }
    // clouds: soft lit puffs, drifting
    for (const c of this.clouds) {
      c.x += c.v * dt; if (c.x > W + c.w) c.x = -c.w * 1.4;
      const body = this.grade([240, 244, 252], w), shade = this.grade([170, 186, 214], w), lit = this.grade([255, 255, 255], w);
      const warm = w.sun; body[0] += warm * 22; body[1] += warm * 4; shade[0] += warm * 30; shade[2] += warm * 20; lit[0] += warm * 20; lit[1] += warm * 4;
      const a = 0.85 * (0.45 + 0.55 * (1 - w.night));
      for (let i = 0; i < 9; i++) {
        const k = i / 8, bx = c.x + (k - 0.5) * c.w, by = c.y - Math.sin(k * Math.PI) * c.w * 0.14 * c.s + hash(i, c.w) * 3, br = c.w * (0.1 + 0.07 * Math.sin(k * 3.14) + hash(i, 5) * 0.03);
        g.fillStyle = rgba(shade, a); g.beginPath(); g.ellipse(bx, by + br * 0.4, br * 1.1, br * 0.7, 0, 0, 7); g.fill();
        g.fillStyle = rgba(body, a); g.beginPath(); g.ellipse(bx, by, br, br * 0.8, 0, 0, 7); g.fill();
        g.fillStyle = rgba(lit, a * 0.8); g.beginPath(); g.ellipse(bx - br * 0.2, by - br * 0.3, br * 0.6, br * 0.42, 0, 0, 7); g.fill();
      }
    }
    // glitter on the lake under the sun or the moon
    const lk = this.lake, gl = w.h > 0.05 ? sm.sx : sm.mx, gAmt = clamp(w.h > 0.05 ? 0.4 + w.sun : w.night * 0.9);
    for (let i = 0; i < 28; i++) { const yy = lk.top + 1 + Math.floor(hash(i, Math.floor(t * 1.5)) * (lk.bot - lk.top - 3)), xx = gl * W + (hash(i, Math.floor(t * 2.2) + 3) - 0.5) * (30 + (yy - lk.top)) , ok = this.mat[yy * this.W + Math.round(xx)] === WATER; if (ok) px(xx, yy, w.h > 0.05 ? [255, 244, 210] : [210, 225, 255], 0.5 * gAmt * (0.5 + 0.5 * Math.sin(t * 3 + i)), 1); }
    // chimney smoke, birds by day, butterflies at sunset, fireflies at night, petals always
    const ck = this.cottage;
    for (let i = 0; i < 7; i++) { const age = ((t * 0.5 + i / 7) % 1), sx2 = ck.x + age * 14 + Math.sin(t + i) * 2, sy2 = ck.y - age * 26; px(sx2, sy2, this.grade([200, 200, 210], w), 0.5 * (1 - age), age > 0.5 ? 2 : 1); }
    if (w.day + w.sun * 0.5 > 0.3) for (const b of this.birds) { b.x += b.v * dt; if (b.x > W + 6) { b.x = -6; b.y = 34 + hash(b.p, t) * 36; } const y = b.y + Math.sin(t * 0.5 + b.p) * 6, f = Math.sin(t * 9 + b.p) > 0 ? -1 : 0; px(b.x, y + f, [26, 30, 46], 0.8 * (w.day + w.sun * 0.5)); px(b.x - 1, y, [26, 30, 46], 0.8 * (w.day + w.sun * 0.5)); px(b.x + 1, y, [26, 30, 46], 0.8 * (w.day + w.sun * 0.5)); px(b.x - 2, y + f * -1, [26, 30, 46], 0.7); px(b.x + 2, y + f * -1, [26, 30, 46], 0.7); }
    for (const f of this.flies) {
      f.x += Math.sin(t * 0.3 * f.s + f.p) * dt * 9; f.y += Math.cos(t * 0.4 * f.s + f.p) * dt * 4;
      if (f.x < -4) f.x = W + 4; if (f.x > W + 4) f.x = -4; f.y = clamp(f.y, 140, 196);
      if (w.night > 0.25) { const tw = 0.5 + 0.5 * Math.sin(t * 2.2 * f.s + f.p); px(f.x, f.y, [230, 255, 140], w.night * tw, 1); px(f.x - 1, f.y, [200, 255, 120], w.night * tw * 0.3); px(f.x + 1, f.y, [200, 255, 120], w.night * tw * 0.3); px(f.x, f.y - 1, [200, 255, 120], w.night * tw * 0.3); px(f.x, f.y + 1, [200, 255, 120], w.night * tw * 0.3); }
      else if (w.day + w.sun > 0.5 && f.s > 0.9) { const wing = Math.sin(t * 14 + f.p) > 0; px(f.x, f.y, [255, 190, 90], 0.9); px(f.x + (wing ? 1 : -1), f.y - 1, [255, 220, 130], 0.85); }
    }
    for (const q of this.petals) { q.x += (6 + q.v * 0.5) * dt; q.y += q.v * dt * 0.7; if (q.x > W + 2 || q.y > 200) { q.x = -2; q.y = hash(q.p, t) * 120; } const a = 0.55 * (1 - w.night * 0.6); px(q.x + Math.sin(t * 1.4 + q.p) * 3, q.y, w.sun > 0.4 ? [255, 190, 150] : [255, 255, 235], a); }
    // the willow's strands and the tall grass sway
    const wl = this.willow, lc = this.grade([60, 130, 56], w), ld = this.grade([36, 90, 40], w), lh = this.grade([120, 188, 84], w);
    for (let i = 0; i < 46; i++) {
      const sx2 = wl.x - 6 + hash(i, 120) * 98, sy2 = 66 + hash(i, 121) * 26, len = 28 + hash(i, 122) * 56, sway = Math.sin(t * 0.9 + i * 0.7) * 3;
      for (let k = 0; k < len; k += 2) { const f = k / len, xx = sx2 + sway * f * f * 2 + Math.sin(k * 0.12 + i) * 0.7, yy = sy2 + k; if (this.mat[Math.round(yy) * this.W + Math.round(xx)] === LEAF && k < 6) continue; px(xx, yy, f > 0.6 ? lh : (i % 3 ? lc : ld), 0.95 - f * 0.35, 1); px(xx, yy + 1, ld, 0.5 - f * 0.3, 1); }
    }
    const gb = this.grade([86, 190, 70], w), gd = this.grade([40, 130, 48], w);
    for (let i = 0; i < 90; i++) { const gx = hash(i, 130) * W, gy = 188 + hash(i, 131) * 2; const sw = Math.sin(t * 1.7 + i * 0.5 + gx * 0.02) * 2.2, hgt = 5 + hash(i, 132) * 6; for (let k = 0; k < hgt; k++) { const f = k / hgt; px(gx + sw * f * f, gy - k, f > 0.7 ? gb : gd, 0.95, 1); } }
    // the lantern's glow
    if (this.w.night + this.w.sun * 0.5 > 0.1) { const a = clamp(w.night * 1.1 + w.sun * 0.5), L = this.lamp; for (let ring = 5; ring >= 1; ring--) { g.fillStyle = `rgba(255,210,120,${0.05 * a * (6 - ring)})`; g.beginPath(); g.arc(L.x, L.y + 1, 2 + ring * 4, 0, 7); g.fill(); } }
  }
}

