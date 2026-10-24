// How PYRO moves (Isaac 2026-10-24): like fire racing along a line of flammable gas.
// He doesn't glide: he becomes the flame FRONT. It flashes along the path in a fast,
// jittery burst while the line he lights burns behind him: white-yellow hot right at the
// front, then orange, then red, then dying embers, each little flame flickering and
// dropping lower until the whole line has burned out.
// GasTrail draws that burning line on its own canvas (same grain as PYRO, 1.5 CSS px per
// art pixel) under him; pet.js moves him along the path with dashProgress().
const COLS = [[255, 248, 200], [255, 209, 0], [255, 161, 20], [255, 100, 28], [255, 44, 33], [150, 26, 20]];   // hottest to coolest (the pack's flame colours)
const LIFE = 1.15;              // seconds for a lit part of the line to burn out
const H0 = 26, HFRONT = 36;     // flame height in art px far behind the front, and at the front
const SPACING = 2.2;            // art px between the little flames along the line
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const h1 = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h1(ix + iy * 57), b = h1(ix + 1 + iy * 57), c = h1(ix + (iy + 1) * 57), d = h1(ix + 1 + (iy + 1) * 57);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// How far along the path (0..1) the front is at time u (0..1): it flashes up to speed fast, then
// races on in little jerks like a flash fire jumping from pocket to pocket of gas.
export function dashProgress(u, prev = 0) {
  const a = 0.14, v = 1 / (1 - a / 2);
  let p = u < a ? (v / (2 * a)) * u * u : v * (u - a / 2);
  p += 0.012 * Math.sin(u * 83) + 0.008 * Math.sin(u * 151 + 1);
  return Math.max(prev, Math.min(1, p * (u >= 1 ? 1 : 0.995)));
}

export class GasTrail {
  // k: CSS px per art px. A, B: page coordinates (CSS px) of the flame's bottom at the start and the end.
  constructor(k, A, B) {
    this.k = k; this.A = A; this.B = B;
    const PADX = 14, PADT = HFRONT + 10, PADB = 8;
    const len = Math.hypot(B.x - A.x, B.y - A.y) / k;
    this.n = Math.max(2, Math.ceil(len / SPACING));
    this.reach = new Float32Array(this.n).fill(-1);
    this.ox = Math.min(A.x, B.x) - PADX * k; this.oy = Math.min(A.y, B.y) - PADT * k;
    this.W = Math.ceil(Math.abs(B.x - A.x) / k + PADX * 2); this.H = Math.ceil(Math.abs(B.y - A.y) / k + PADT + PADB);
    this.cv = document.createElement("canvas"); this.cv.width = this.W; this.cv.height = this.H;
    Object.assign(this.cv.style, { position: "fixed", left: this.ox + "px", top: this.oy + "px", width: this.W * k + "px", height: this.H * k + "px", imageRendering: "pixelated", pointerEvents: "none", zIndex: 39 });
    document.body.append(this.cv);
    this.g = this.cv.getContext("2d");
    this.img = this.g.createImageData(this.W, this.H); this.px = new Uint32Array(this.img.data.buffer);
    this.frontDone = -1; this.dead = false;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // p: how far the front is (0..1); now: seconds. Lights every part of the line it has passed.
  setFront(p, now) {
    const upTo = Math.floor(p * (this.n - 1) + 1e-6);
    for (let i = 0; i <= upTo; i++) if (this.reach[i] < 0) this.reach[i] = now;
    if (p >= 1 && this.frontDone < 0) this.frontDone = now;
  }
  cut() { this.frontDone = this.frontDone < 0 ? performance.now() / 1000 : this.frontDone; }   // let go: nothing more gets lit, what's lit burns out
  loop(ms) {
    if (!this.cv.isConnected) return;
    const t = ms / 1000;
    if (this.frontDone >= 0 && t - this.frontDone > LIFE + 0.1) { this.cv.remove(); this.dead = true; return; }
    requestAnimationFrame(this.loop);
    if ((this.tick = !this.tick)) return;   // 30 fps
    this.draw(t);
  }
  draw(t) {
    const { W, H, k, A, B, n, px, reach } = this;
    px.fill(0);
    const frame = Math.floor(t * 30);
    const set = (x, y, c, skip) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H || skip) return;
      px[y * W + x] = 0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0];   // little-endian ABGR
    };
    for (let i = 0; i < n; i++) {
      if (reach[i] < 0) continue;
      const age = t - reach[i];
      if (age > LIFE || age < 0) continue;
      const s = i / (n - 1), bx = (A.x + (B.x - A.x) * s - this.ox) / k, by = (A.y + (B.y - A.y) * s - this.oy) / k;
      const q = age / LIFE;
      // each little flame: tall and white-hot at the front, then shrinking and cooling, always flickering
      const fl = 0.6 + 0.8 * vnoise(i * 0.22, t * 9);   // a slow ripple along the line, so it reads as one sheet of flame
      const Hh = (age < 0.09 ? HFRONT * (1 - age * 3) : H0 * Math.exp(-(age - 0.09) * 2.7)) * fl;
      if (Hh < 1.6) {   // down to an ember on the line
        if (q < 0.97) set(bx, by, COLS[5], B4[((Math.round(bx) & 3) + (Math.round(by) & 3) * 4)] / 16 < q - 0.55);
        continue;
      }
      for (let c = -2; c <= 2; c++) {
        const hc = Hh * (1 - (Math.abs(c) / 3.3) ** 1.5) * (0.84 + 0.32 * vnoise(i * 0.5 + c * 0.7, t * 15));
        for (let y = 0; y < hc; y++) {
          const frac = y / hc, heat = (1 - frac * 0.95) * (1 - q * 0.85) + (vnoise(bx + c, y * 0.5 - t * 22) - 0.5) * 0.18;
          const ci = heat > 0.82 ? 0 : heat > 0.6 ? 1 : heat > 0.42 ? 2 : heat > 0.27 ? 3 : heat > 0.14 ? 4 : 5;
          // the tips flicker out and the oldest flames dither away
          const skip = (frac > 0.72 && ((c + y + frame) & 1) === 0 && vnoise(c, y + t * 30) > 0.4) || B4[((Math.round(bx) + c) & 3) + ((Math.round(by - y) & 3) << 2)] / 16 < (q - 0.55) * 2;
          set(bx + c, by - y, COLS[ci], skip);
        }
      }
    }
    this.g.putImageData(this.img, 0, 0);
  }
}
