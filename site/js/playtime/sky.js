// Playtime's sky: deep space in pixel art behind the island. Painted once at the island's art-pixel size (a nebula
// band in violet and teal, stars, a ringed planet, a moon, a small spiral galaxy), wider than the screen and seamless
// all the way round, so it slides as the camera turns (it feels like turning in space). Each frame some stars
// twinkle and, now and then, one shoots across.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + .5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const BG = ["#04051a", "#070823", "#0b0b2c", "#100e34"].map(hex);
const VIOLET = ["#120b2e", "#1b0f40", "#271554", "#371c6c", "#4c2788", "#6a3aa6"].map(hex);
const TEAL = ["#08182b", "#0c233b", "#11334d", "#17445f"].map(hex);
const PLANET = ["#160b1c", "#2e1530", "#4e2240", "#74324e", "#9c4e5c", "#c8786e"].map(hex);
const MOON = ["#1b1c2e", "#33354e", "#545772", "#7c809a", "#aeb2c8"].map(hex);
const RING = ["#4d2e7a", "#8c64c8", "#c9a6ff"].map(hex);

// seeded value noise in 3D (so the sky can wrap round a cylinder without a seam)
function noise3() {
  const P = new Uint8Array(512); let s = 1234567;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const perm = [...Array(256).keys()].sort(() => rnd() - .5); for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const V = new Float32Array(256).map(() => rnd());
  const at = (x, y, z) => V[P[P[P[x & 255] + (y & 255)] + (z & 255)]];
  const sm = (t) => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const a = lerp(lerp(at(xi, yi, zi), at(xi + 1, yi, zi), xf), lerp(at(xi, yi + 1, zi), at(xi + 1, yi + 1, zi), xf), yf);
    const b = lerp(lerp(at(xi, yi, zi + 1), at(xi + 1, yi, zi + 1), xf), lerp(at(xi, yi + 1, zi + 1), at(xi + 1, yi + 1, zi + 1), xf), yf);
    return lerp(a, b, zf);
  };
}
const N3 = noise3();
const fbm = (x, y, z) => N3(x, y, z) * .5 + N3(x * 2.03, y * 2.03, z * 2.03) * .27 + N3(x * 4.1, y * 4.1, z * 4.1) * .15 + N3(x * 8.3, y * 8.3, z * 8.3) * .08;

export class Sky {
  constructor(canvas) {
    this.cv = canvas; this.big = document.createElement("canvas");
    this.twinkle = []; this.shoot = null; this.nextShoot = 5; this.w = 0; this.h = 0;
  }
  resize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.cv.width = w; this.cv.height = h;
    this.paint();
  }
  paint() {
    const w = this.w, h = this.h, W = Math.round(Math.max(w * 2.4, 400)), big = this.big;
    big.width = W; big.height = h;
    const g = big.getContext("2d"), img = g.createImageData(W, h), D = img.data;
    const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= h) return; const o = (y * W + x) * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; };
    // the nebula, worked out at half size and dithered at full size; x wraps round a cylinder
    const hw = Math.ceil(W / 2), hh = Math.ceil(h / 2), vio = new Float32Array(hw * hh), tea = new Float32Array(hw * hh);
    const R = W / (2 * Math.PI) / 70;
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
      const a = (x / hw) * Math.PI * 2, cx = Math.cos(a) * R, cz = Math.sin(a) * R, yy = y / 35;   // the same scale across and down
      // a band of nebula that winds across the sky
      const bandY = .5 + .17 * Math.sin(a * 2 + .6) + .05 * Math.sin(a * 5), dy = (y / hh - bandY) / .13;
      const band = Math.exp(-dy * dy);
      const n = fbm(cx * 2.4 + 3, yy * 2.4, cz * 2.4), m = fbm(cx * 3.6 + 11, yy * 3.6 + 5, cz * 3.6);
      // soft wisps along the band, mostly dark space elsewhere (it sits behind the island, it mustn't shout)
      vio[y * hw + x] = Math.max(0, n - .35) * 2.5 * (.15 + band);
      tea[y * hw + x] = Math.max(0, m - .5) * 2 * (.3 + .6 * (1 - band));
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
      const b = bayer(x, y), i = (y >> 1) * hw + (x >> 1);
      const gy = y / h, bg = BG[Math.min(3, Math.floor(gy * 3.2 + b * .9))];
      let c = bg;
      const tv = tea[i] * 3.5 + b - .5, vv = vio[i] * 5 + b - .5;
      if (tv >= 1) c = TEAL[Math.min(TEAL.length - 1, Math.floor(tv) - 1)];
      if (vv >= 1) c = VIOLET[Math.min(VIOLET.length - 1, Math.floor(vv) - 1)];
      put(x, y, c);
    }
    // stars: dim, mid and bright, the brightest with a little cross
    let s = 99; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.twinkle = [];
    for (let i = 0; i < W * h / 70; i++) {
      const x = rnd() * W | 0, y = rnd() * h | 0, k = rnd();
      if (k > .985) { put(x, y, [255, 255, 255]); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => put(x + dx, y + dy, [170, 176, 255])); this.twinkle.push({ x, y, ph: rnd() * 6.3, big: true }); }
      else if (k > .9) { put(x, y, [214, 220, 255]); if (k > .96) this.twinkle.push({ x, y, ph: rnd() * 6.3 }); }
      else if (k > .55) put(x, y, [92, 96, 160]);
      else put(x, y, [52, 54, 104]);
    }
    // a spiral galaxy, small and far away
    const gx = W * .62, gy2 = h * .66;
    for (let i = 0; i < 520; i++) {
      const arm = i % 2, t = (i / 520) * 3.6, r = 1.2 + t * 6.5, a = t * 2.1 + arm * Math.PI + rnd() * .35;
      const x = Math.round(gx + Math.cos(a) * r * 1.6), y = Math.round(gy2 + Math.sin(a) * r * .62);
      put(x, y, t < .5 ? [255, 236, 214] : t < 1.6 ? [206, 178, 255] : [120, 96, 186]);
    }
    // a ringed planet and a little moon, shaded in pixel steps from the upper left
    const pr = Math.max(9, Math.round(Math.min(w, h) * .085)), px = Math.round(W * .3), py = Math.round(h * .26);
    const ring = (front) => {
      for (let a = 0; a < Math.PI * 2; a += .004) {
        const sy = Math.sin(a); if ((sy > 0) !== front) continue;
        for (let k = 0; k < 3; k++) {
          const rr = pr * (1.65 + k * .18), x = Math.round(px + Math.cos(a) * rr), y = Math.round(py + sy * rr * .26 - Math.cos(a) * rr * .12);
          put(x, y, RING[k === 1 ? 2 : k === 0 ? 1 : 0]);
        }
      }
    };
    ring(false);
    for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) {
      const d2 = x * x + y * y; if (d2 > pr * pr) continue;
      const z = Math.sqrt(pr * pr - d2), L = (-x * .55 - y * .6 + z * .58) / pr;
      const band = Math.sin((y / pr) * 9 + Math.sin(x / pr * 2) * .6) * .12;
      const lv = Math.floor((L * .55 + .45 + band) * 6 + bayer(px + x, py + y) - .5);
      put(px + x, py + y, PLANET[Math.max(0, Math.min(5, lv))]);
    }
    ring(true);
    const mr = Math.max(4, Math.round(pr * .42)), mx = Math.round(W * .82), my = Math.round(h * .18);
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
      const d2 = x * x + y * y; if (d2 > mr * mr) continue;
      const z = Math.sqrt(mr * mr - d2), L = (-x * .5 - y * .55 + z * .66) / mr;
      const crater = N3((mx + x) * .35, (my + y) * .35, 4) > .62 ? -1 : 0;
      put(mx + x, my + y, MOON[Math.max(0, Math.min(4, Math.floor((L * .6 + .4) * 5 + bayer(x, y) - .5) + crater))]);
    }
    g.putImageData(img, 0, 0);
  }
  // spin: the camera's turn (radians), so the sky slides as it turns; t: seconds
  draw(t, spin, dt = 0) {
    const g = this.cv.getContext("2d"), W = this.big.width, w = this.w, h = this.h;
    if (!W) return;
    let off = ((spin / (Math.PI * 2)) * W * .5 + t * .8) % W; if (off < 0) off += W;
    off = Math.round(off);
    g.drawImage(this.big, -off, 0); if (W - off < w) g.drawImage(this.big, W - off, 0);
    // twinkling stars
    for (const s of this.twinkle) {
      const v = Math.sin(t * (s.big ? 1.3 : 2.1) + s.ph);
      let x = s.x - off; if (x < 0) x += W; if (x >= w) continue;
      if (v > .55) { g.fillStyle = "#ffffff"; g.fillRect(x, s.y, 1, 1); if (s.big && v > .85) { g.fillStyle = "#b8bcff"; g.fillRect(x - 2, s.y, 1, 1); g.fillRect(x + 2, s.y, 1, 1); g.fillRect(x, s.y - 2, 1, 1); g.fillRect(x, s.y + 2, 1, 1); } }
      else if (v < -.6) { g.fillStyle = "#3a3c78"; g.fillRect(x, s.y, 1, 1); }
    }
    // a shooting star now and then
    this.nextShoot -= dt;
    if (!this.shoot && this.nextShoot <= 0) {
      this.shoot = { x: Math.random() * w * .8 + w * .1, y: Math.random() * h * .35, t: 0, dx: (Math.random() < .5 ? -1 : 1) * (.8 + Math.random() * .4), len: 14 + Math.random() * 10 };
      this.nextShoot = 7 + Math.random() * 9;
    }
    const sh = this.shoot;
    if (sh) {
      sh.t += dt; const k = sh.t / .75;
      if (k >= 1) this.shoot = null;
      else {
        const hx = sh.x + sh.dx * k * 90, hy = sh.y + k * 45;
        for (let i = 0; i < sh.len; i++) {
          const x = Math.round(hx - sh.dx * i * 1.6), y = Math.round(hy - i * .8), fade = 1 - i / sh.len;
          g.fillStyle = i < 2 ? "#ffffff" : fade > .5 ? "#c9ceff" : "#6a6fb8"; g.globalAlpha = Math.min(1, fade * 1.4 * (1 - k * .6));
          g.fillRect(x, y, 1, 1);
        }
        g.globalAlpha = 1;
      }
    }
  }
}
