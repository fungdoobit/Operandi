// Module 5: Wreck Beach. A stormy shipwreck beach at dusk: heavy storm clouds
// with a burning break of sunset on the horizon, a dark sea with a lighthouse
// on a far headland, the broken hull of a wooden ship with a snapped mast and
// a torn sail on the right, rusted machine wreckage (a great gear, a boiler,
// chain) half sunk on the left, and wet sand that mirrors the sunset. Two
// palms bent by the gale frame the scene. The light layer rolls the waves in
// with foam, sweeps the lighthouse beam, thrashes the palm fronds and the sail,
// slants the rain and throws the odd lightning flash out at sea.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky: ["#07080e", "#0e1018", "#161a26", "#232636", "#3a3242", "#6a3e46", "#b05a40", "#ec9a50", "#ffd890"].map(hex),
  cl: ["#06070c", "#0f111a", "#1c1e2c", "#2e2e40", "#523c4a", "#9a5a48", "#e09058"].map(hex),
  sea: ["#060c14", "#0a1622", "#102434", "#183448", "#24485a", "#3a6470"].map(hex),
  foam: hex("#cfe2e6"), foamDk: hex("#7fa0aa"), glint: hex("#ffb060"), glintHi: hex("#ffe2a0"),
  head: hex("#0a0c12"), headLit: hex("#1a1c26"), lh: hex("#c8c0b8"), lhRed: hex("#8a2a2a"), lamp: hex("#fff2b0"),
  sand: ["#120e12", "#1e171a", "#2e2224", "#463230", "#644840", "#8a6450"].map(hex),
  wet: ["#0c0e14", "#161a22", "#24242e", "#3e3036"].map(hex),
  wood: ["#0e0908", "#1e1410", "#2e2018", "#4a3424", "#6e4e34", "#9a7048"].map(hex),
  sail: hex("#8a8070"), sailDk: hex("#4e463e"),
  rust: ["#120c0c", "#2a1612", "#4a2418", "#74361c", "#a8562a", "#d08048"].map(hex),
  palm: hex("#0a0a0c"), palmLit: hex("#2a2220"), frond: hex("#0c140e"), frondLit: hex("#24321e"), frondHi: hex("#5a5a2a"),
  rain: hex("#8aa0b4"), bolt: hex("#e8f0ff"), shell: hex("#d8c8b8"), weed: hex("#1e2a1a"),
};

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, bay, r, mix, get }) {
    const B = (x, y) => bay(x & 255, y & 255);
    const blend = (x, y, c, k) => { if (k <= 0) return; const q = Math.min(4, Math.floor(Math.min(1, k) * 4 + B(x, y))) / 4; if (q > 0) put(x, y, q >= 1 ? c : mix(get(x, y), c, q)); };
    const ramp = (x, y, cols, v) => { v = Math.max(0, Math.min(0.999, v)) * (cols.length - 1); const i = Math.floor(v); put(x, y, (v - i) > B(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); };
    const HOR = 116, SX = Math.round(W * 0.56), SHORE = FLOOR - 16;
    Object.assign(this, { HOR, SX, SHORE });

    // 1. dusk sky: near black at the top, a burning band at the horizon round the sunset
    for (let y = 0; y < HOR; y++) for (let x = 0; x < W; x++) {
      const glow = Math.max(0, 1 - Math.hypot((x - SX) / (W * 0.5), (y - HOR) / 60));
      ramp(x, y, C.sky, Math.pow(y / HOR, 2.2) * 0.62 + glow * glow * 0.42);
    }
    // the sun, half drowned, squashed by the haze
    for (let y = HOR - 10; y < HOR; y++) for (let x = SX - 14; x <= SX + 14; x++) if (((x - SX) / 14) ** 2 + ((y - HOR) / 10) ** 2 < 1) put(x, y, (y + (x & 1)) % 4 === 0 && y > HOR - 6 ? C.sky[7] : C.sky[8]);
    // 2. storm clouds: heavy masses, their bellies lit by the sunset
    const cloud = (cx, cy, w, h, n, lift) => {
      const blobs = Array.from({ length: n }, (_, i) => { const u = (i / (n - 1)) * 2 - 1; return { x: cx + u * w * 0.5 + (r() - 0.5) * w * 0.2, y: cy - (1 - u * u) * h * 0.4 * (0.5 + r()), rx: w * (0.14 + r() * 0.14), ry: h * (0.4 + r() * 0.3) }; });
      for (let y = Math.floor(cy - h * 1.6); y < cy + h * 0.7; y++) for (let x = Math.floor(cx - w * 0.85); x < cx + w * 0.85; x++) {
        let dens = 0, lo = 0;
        for (const b of blobs) { const q = 1 - Math.hypot((x - b.x) / b.rx, (y - b.y) / b.ry); if (q > dens) { dens = q; lo = (y - b.y) / b.ry; } }
        if (y > cy + h * 0.25) dens -= (y - cy - h * 0.25) / (h * 0.25);
        if (dens <= 0 || (dens < 0.1 && dens * 10 < B(x, y))) continue;
        const toSun = Math.max(0, 1 - Math.abs(x - SX) / (W * 0.55)) * Math.max(0, y / HOR);
        const v = 0.12 + 0.18 * Math.max(0, lo) + lift * toSun * (0.5 + Math.max(0, lo)) + (dens < 0.14 ? 0.12 * toSun : 0) + 0.08 * (hash(x >> 2, y >> 2) - 0.5);
        ramp(x, y, C.cl, v);
      }
    };
    // a dark overcast ceiling, then lower, nearer masses
    for (let i = 0; i < Math.max(4, W / 90); i++) cloud(r() * W, 6 + r() * 16, 120 + r() * 120, 20 + r() * 10, 7, 0.15);
    for (let i = 0; i < Math.max(3, W / 140); i++) cloud(r() * W, 46 + r() * 22, 90 + r() * 110, 16 + r() * 10, 7, 0.55);
    for (let i = 0; i < Math.max(3, W / 160); i++) cloud(r() * W, 86 + r() * 16, 60 + r() * 80, 7 + r() * 4, 6, 0.9);
    // rain curtains hanging from the far clouds
    for (const fx of [0.12, 0.34, 0.86]) {
      const cx = W * fx + (r() - 0.5) * 40;
      for (let y = 60; y < HOR; y++) for (let x = Math.round(cx - 30); x < cx + 30; x++) { const k = (1 - Math.abs(x - cx - (y - 60) * 0.3) / 30) * 0.4 * ((x + y * 2) % 3 === 0 ? 1 : 0.5); blend(x, y, C.sky[3], k); }
    }

    // 3. the far headland with its lighthouse (left)
    const hx0 = -10, hx1 = Math.round(W * 0.26);
    const headTop = (x) => HOR - 4 - 14 * Math.max(0, 1 - Math.abs(x - W * 0.08) / (W * 0.2)) - 3 * Math.sin(x * 0.15);
    for (let x = hx0; x < hx1; x++) { const t = Math.round(headTop(x) + Math.max(0, x - hx1 + 30) * 0.3); for (let y = t; y < HOR + 2; y++) put(x, y, y < t + 1 ? C.headLit : C.head); }
    const LX = Math.round(W * 0.09), LB = Math.round(headTop(LX)) + 1;
    for (let y = LB - 18; y < LB; y++) { const half = 2 + (y - LB + 18) * 0.06; for (let k = -half; k <= half; k++) put(LX + k, y, ((y - LB) >> 2) % 2 ? C.lhRed : (k < 0 ? C.lh : mix(C.lh, C.head, 0.4))); }
    for (let k = -3; k <= 3; k++) { put(LX + k, LB - 19, C.head); put(LX + k, LB - 23, C.head); }
    for (let k = -2; k <= 2; k++) for (let y = LB - 22; y < LB - 19; y++) put(LX + k, y, C.lamp);
    this.lamp = { x: LX, y: LB - 21 };

    // 4. the sea: darker far out, waves in perspective, a glinting path under the sunset
    for (let y = HOR; y < SHORE + 4; y++) {
      const t = (y - HOR) / (SHORE - HOR);
      for (let x = 0; x < W; x++) {
        const ph = Math.pow(t, 0.6) * 22 + Math.sin(x * 0.04 / (0.3 + t) + y) * 0.5 + Math.sin(x * 0.011) * 0.6;
        const f = ph - Math.floor(ph);
        let v = 0.18 + t * 0.35 + (f < 0.1 ? 0.12 : f > 0.75 ? -0.08 : 0);
        ramp(x, y, C.sea, v + 0.05 * (hash(x >> 1, y) - 0.5));
        const path = Math.max(0, 1 - Math.abs(x - SX) / (16 + t * 70));
        if (path > 0 && f < 0.18) blend(x, y, f < 0.08 ? C.glintHi : C.glint, path * (0.9 - t * 0.4));
        else if (path > 0) blend(x, y, C.sky[5], path * 0.35);
      }
    }
    for (let x = 0; x < W; x++) put(x, HOR, Math.abs(x - SX) < 40 ? C.sky[7] : C.sea[3]);   // the bright horizon line

    // 5. the beach: wet sand from the shore down to the floor, mirroring the sky
    for (let y = SHORE; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const t = (y - SHORE) / (FLOOR - SHORE), edge = SHORE + 2 + 2 * Math.sin(x * 0.05) + Math.sin(x * 0.17);
      if (y < edge) continue;
      const refl = Math.max(0, 1 - Math.abs(x - SX + (y - SHORE) * 0.2) / (24 + t * 40)) * (1 - t * 0.5);
      ramp(x, y, C.wet, 0.4 + t * 0.4 + 0.08 * Math.sin(x * 0.3 + y * 1.7));
      if (refl > 0) blend(x, y, (y + x) % 5 ? C.sky[6] : C.sky[7], refl * 0.7);
    }

    // 6. rusted machine wreckage on the left: a great gear, a boiler, pipes and chain
    const rs = (x, y, v) => ramp(x, y, C.rust, v + 0.08 * (hash(x >> 1, y >> 1) - 0.5) - (hash(x >> 2, y >> 2) < 0.1 ? 0.15 : 0));
    const gx = Math.round(W * 0.27), gy = FLOOR - 4, gr = 24;
    for (let y = gy - gr - 5; y < gy + 2; y++) for (let x = gx - gr - 5; x <= gx + gr + 5; x++) {
      const d = Math.hypot(x - gx, y - gy), a = Math.atan2(y - gy, x - gx) + 0.2;
      const tooth = d >= gr && d < gr + 5 && Math.sin(a * 14) > 0.1 && !(a > 0.9 && a < 1.5);   // a few teeth broken off
      const spoke = d < gr - 4 && d > 6 && Math.abs(Math.sin(a * 3)) < 0.25;
      if (d < 5) rs(x, y, 0.55 - (y - gy) * 0.03);
      else if (spoke || (d >= gr - 4 && d < gr) || tooth) rs(x, y, 0.35 - (x - gx) / gr * 0.12 - (y - gy) / gr * 0.25 + (d > gr - 1 && d < gr ? -0.15 : 0));
    }
    // the boiler, lying on its side, a pipe bent up from it
    const bx = Math.round(W * 0.15), by = FLOOR - 6;
    for (let y = by - 18; y < by + 2; y++) for (let x = bx - 26; x < bx + 22; x++) {
      const u = (y - by + 8) / 10;
      if (Math.abs(u) > 1 || (x > bx + 18 && Math.abs(u) > Math.sqrt(Math.max(0, 1 - ((x - bx - 18) / 4) ** 2)))) continue;
      rs(x, y, 0.5 - u * 0.35 - ((x - bx) % 9 === 0 ? 0.2 : 0));
      if ((x - bx) % 9 === 0 && (y % 3 === 0)) put(x, y, C.rust[5]);   // rivets
    }
    for (let k = 0; k < 26; k++) { const x = bx + 6 + Math.round(Math.sin(k * 0.08) * 6), y = by - 18 - k; for (let j = -2; j <= 2; j++) rs(x + j, y, 0.4 - j * 0.12); }
    for (let j = -3; j <= 3; j++) rs(bx + 12 + j, by - 44, 0.6);
    // a chain draped from the gear into the sand
    for (let k = 0; k < 40; k++) { const x = gx + gr - 6 + k * 0.9, y = gy - 16 + Math.sin(k / 40 * Math.PI) * 14 + k * 0.35; if (k % 3) { put(x, y, C.rust[3]); put(x, y + 1, C.rust[1]); } else put(x, y, C.rust[4]); }
    // sand drifted round it
    for (let x = bx - 50; x < gx + 50; x++) { const h = 5 + 3 * Math.sin(x * 0.11); for (let y = Math.round(FLOOR + 1 - h); y < FLOOR + 2; y++) ramp(x, y, C.sand, 0.55 - (y - FLOOR + h) * 0.05); }

    // 7. the shipwreck on the right: a broken hull heeled over, ribs bare, a snapped mast
    const sx = Math.round(W * 0.74), sb = FLOOR - 2, len = Math.min(210, W * 0.36), hh = 58;
    const keel = (u) => sb - 4 - Math.sin(u * Math.PI) * 4;   // u 0 = stern (right), 1 = broken bow end (left)
    for (let i = 0; i <= len; i++) {
      const u = i / len, x = Math.round(sx + len * 0.5 - i), kTop = keel(u);
      const top = kTop - hh * (0.58 + 0.42 * (1 - u) ** 2.5) - (u < 0.12 ? 6 : 0) + (u > 0.55 ? (u - 0.55) * 60 + hash(i >> 1, 2) * 10 : 0);   // sheer up to a raised stern, jagged where it broke
      const broken = u > 0.7;
      for (let y = Math.round(top); y < sb + 2; y++) {
        const v2 = (y - top) / (sb - top);
        if (broken) {   // only ribs and a few planks remain at the broken end
          const rib = (i % 11) < 2, plank = (Math.round(y - top) % 7) < 2 && hash(i >> 2, y >> 2) < 0.45 && y > top + (u - 0.7) * 80;
          if (!rib && !plank) continue;
          if (y < top + (u - 0.7) * 60 * hash(i, 3)) continue;
          ramp(x, y, C.wood, (rib ? 0.45 : 0.3) - v2 * 0.25);
          continue;
        }
        const seam = (Math.round(y - top) % 6) === 0, porthole = Math.hypot((i % 30) - 15, y - top - 12) < 2.5 && u > 0.15;
        let v = 0.5 - v2 * 0.4 + (u < 0.12 && u > 0.1 ? -0.2 : 0) + (seam ? -0.15 : 0) + 0.06 * (hash(i >> 3, y) - 0.5);
        if (y < top + 2) v = 0.75;   // the rail catches the light
        ramp(x, y, porthole ? [C.wood[0], C.wood[0]] : C.wood, v);
        if (v2 > 0.55 && hash(i, y) < 0.08) put(x, y, C.weed);   // weed on the waterline
      }
    }
    // the mast, snapped and leaning toward the sea, with a torn sail hanging from its yard
    const mx = Math.round(sx), mBase = Math.round(keel(0.5) - hh * 0.95);
    const mTop = { x: mx + 28, y: mBase - 84 };
    for (let k = 0; k <= 90; k++) { const u = k / 90, x = mx + (mTop.x - mx) * u, y = mBase + (mTop.y - mBase) * u; if (y < 8) break; for (let j = -2; j <= 1; j++) ramp(Math.round(x + j), Math.round(y), C.wood, 0.3 - j * 0.12); }
    const yard = { x0: mTop.x - 32, y0: mTop.y + 30, x1: mTop.x + 30, y1: mTop.y + 18 };
    for (let k = 0; k <= 62; k++) { const u = k / 62; put(Math.round(yard.x0 + (yard.x1 - yard.x0) * u), Math.round(yard.y0 + (yard.y1 - yard.y0) * u), C.wood[3]); put(Math.round(yard.x0 + (yard.x1 - yard.x0) * u), Math.round(yard.y0 + (yard.y1 - yard.y0) * u) + 1, C.wood[1]); }
    this.yard = yard;
    // rigging lines
    for (const [ax, ay] of [[sx - len * 0.3, keel(0.8) - hh * 0.7], [sx + len * 0.45, keel(0.05) - hh * 1.1]]) for (let k = 0; k <= 60; k++) { const u = k / 60; put(Math.round(mTop.x + (ax - mTop.x) * u), Math.round(mTop.y + (ay - mTop.y) * u + Math.sin(u * Math.PI) * 6), C.wood[1]); }
    // sand heaped against the hull
    for (let x = Math.round(sx - len * 0.6); x < sx + len * 0.6; x++) { const h = 6 + 4 * Math.sin(x * 0.07) + 3 * Math.sin(x * 0.19); for (let y = Math.round(FLOOR + 2 - h); y < FLOOR + 2; y++) ramp(x, y, C.sand, 0.5 - (y - FLOOR + h) * 0.04 + 0.05 * Math.sin(y * 2 + x)); }

    // 8. the floor: wet, darker sand that shines with the sunset; shells, weed, bolts
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x = 0; x < W; x++) {
        const n = 0.08 * Math.sin(x * 0.03 + y * 0.2) + 0.06 * Math.sin(x * 0.11 - y * 0.5) + 0.05 * (hash(x >> 1, y) - 0.5);
        ramp(x, y, C.sand, 0.62 - t * 0.4 + n + (t < 0.04 ? 0.15 : 0));
        const refl = Math.max(0, 1 - Math.abs(x - SX + (y - FLOOR) * 0.4) / (30 + t * 60)) * (1 - t);
        const puddle = Math.sin(x * 0.045 + Math.sin(y * 0.3) * 2) * Math.sin(y * 0.35 + x * 0.01) > 0.55;
        if (puddle) ramp(x, y, C.wet, 0.6 - t * 0.4);
        if (refl > 0) blend(x, y, (y % 3) ? C.sky[6] : C.sky[7], refl * (puddle ? 0.85 : 0.35));
      }
    }
    for (let x = 0; x < W; x++) if (hash(x, 4) < 0.6) put(x, FLOOR, C.sand[4]);
    for (let i = 0; i < W / 10; i++) {
      const x = r() * W, y = FLOOR + 3 + r() * 40, k = r();
      if (Math.abs(x - W / 2) < W * 0.1 && y < FLOOR + 14) continue;
      if (k < 0.4) { put(x, y, C.shell); put(x + 1, y, C.sand[4]); }
      else if (k < 0.7) for (let j = 0; j < 4 + r() * 6; j++) put(x + j, y + Math.round(Math.sin(j) * 0.8), C.weed);
      else { put(x, y, C.rust[4]); put(x + 1, y, C.rust[2]); put(x, y - 1, C.rust[3]); }
    }

    // 9. framing palm trunks (the fronds are animated in the light layer)
    this.palms = [];
    const trunk = (x0, dir, hgt, bend) => {
      let px0 = x0, py0 = FLOOR + 10;
      for (let k = 0; k < hgt; k++) {
        const u = k / hgt, x = x0 + dir * (u * u * bend), y = FLOOR + 10 - k, w = 6.5 - u * 2.5;
        for (let j = -w; j <= w; j++) put(Math.round(x + j), y, (k % 7) < 1 ? C.palm : j * dir > w * 0.2 ? C.palmLit : C.palm);
        px0 = x; py0 = y;
      }
      this.palms.push({ x: px0, y: py0, dir });
    };
    trunk(Math.max(4, Math.round(W * 0.01)), 1, 150, 46);
    trunk(W - Math.max(8, Math.round(W * 0.015)), -1, 128, 34);
    // coconuts and a clump at each crown
    for (const p of this.palms) for (let k = 0; k < 4; k++) { const cx = p.x + (k - 1.5) * 3, cy = p.y + 4 + (k % 2) * 2; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(cx + i, cy + j, i + j < 0 ? C.palmLit : C.palm); }

    // ---- light-layer data ----
    this.waves = Array.from({ length: 4 }, (_, i) => ({ p: i / 4, seed: r() * 100 }));
    this.drops = Array.from({ length: Math.round(W / 6) }, () => ({ x: r() * W, y: r() * H, v: 160 + r() * 80, l: 3 + Math.round(r() * 4) }));
    this.fronds = [];
    for (const p of this.palms) for (let i = 0; i < 9; i++) this.fronds.push({ p, a: -Math.PI / 2 + (i - 4) * 0.42 + (p.dir < 0 ? 0.3 : -0.1), len: 30 + r() * 22, ph: r() * 6 });
    this.nextBolt = 2 + r() * 4; this.bolt = null;
  }

  animate({ g, t, dt, W, H, FLOOR, px }) {
    const { HOR, SHORE, SX } = this;
    // the lighthouse beam sweeping (a flash when it faces us)
    const ba = t * 0.9, facing = Math.cos(ba);
    const L = this.lamp;
    if (L) {
      const dx = Math.sin(ba);
      for (let k = 3; k < 120; k += 2) {
        const a = (1 - k / 120) * 0.22 * Math.max(0, 0.3 + 0.7 * Math.abs(dx));
        if (facing < 0) break;
        px(L.x + dx * k, L.y - k * 0.04 + Math.abs(dx) * 0, C.lamp, a, 2);
      }
      if (facing > 0.92) px(L.x - 3, L.y - 3, C.lamp, (facing - 0.92) * 8, 7);
      px(L.x - 1, L.y - 1, C.lamp, 0.6, 3);
    }
    // waves rolling in: crest lines move toward the shore, break into foam, wash up and slip back
    for (const w of this.waves) {
      w.p += dt * 0.07; if (w.p > 1) { w.p -= 1; w.seed = Math.random() * 100; }
      const p = w.p, y = HOR + 14 + Math.pow(p, 1.3) * (SHORE - HOR - 10);
      const near = Math.pow(p, 1.6), alpha = Math.min(1, p * 4) * (p > 0.9 ? (1 - p) * 10 : 1);
      for (let x = 0; x < W; x += 1) {
        const gap = Math.sin(x * 0.07 / (0.3 + near) + w.seed) + Math.sin(x * 0.023 + w.seed * 2) * 0.8;
        if (gap < 0.9 - near * 2.2) continue;
        const yy = y + Math.sin(x * 0.05 + w.seed) * (1 + near * 2);
        px(x, yy, C.foam, alpha * (0.12 + near * 0.8));
        if (near > 0.4) { px(x, yy + 1, C.foamDk, alpha * 0.6); if (gap > 0.9) px(x, yy - 1, C.foam, alpha * 0.5); }
      }
    }
    // the wash: a sheet of foam sliding up the wet sand and back
    const wash = 0.5 + 0.5 * Math.sin(t * 0.45), wy = SHORE + 2 + wash * 9;
    for (let x = 0; x < W; x++) {
      const e = wy + Math.sin(x * 0.06 + t * 0.4) * 2 + Math.sin(x * 0.17) * 1.2;
      px(x, e, C.foam, 0.55 * (0.4 + 0.6 * wash));
      if ((x + Math.round(t * 4)) % 5 === 0) px(x, e - 2, C.foam, 0.3);
      if (Math.sin(x * 0.3 + t) > 0.6) px(x, e + 1, C.foamDk, 0.35);
    }
    // glints on the sea under the sunset
    for (let i = 0; i < 18; i++) { const yy = HOR + 2 + ((i * 37 + Math.floor(t * 6) * 13) % 36), spread = 10 + (yy - HOR) * 1.4; px(SX + ((i * 53 + Math.floor(t * 5) * 7) % (spread * 2)) - spread, yy, C.glintHi, 0.8); }
    // the torn sail flapping from the yard
    if (this.yard) {
      const Y = this.yard;
      for (let k = 0; k <= 30; k++) {
        const u = k / 30, x0 = Y.x0 + (Y.x1 - Y.x0) * (0.15 + u * 0.55), y0 = Y.y0 + (Y.y1 - Y.y0) * (0.15 + u * 0.55) + 1;
        const drop = 22 - Math.abs(u - 0.4) * 18 - (u > 0.7 ? (u - 0.7) * 40 : 0);   // torn short on one side
        for (let j = 0; j < drop; j++) {
          const s = j / drop, wv = Math.sin(t * 5 + u * 6 - s * 3) * s * 5 + s * 9;
          px(x0 + wv, y0 + j, (Math.sin(t * 5 + u * 6 - s * 3) > 0.3) ? C.sail : C.sailDk, 0.95);
        }
      }
    }
    // palm fronds thrashing in the wind (all streaming to the right)
    const gust = 0.5 + 0.5 * Math.sin(t * 0.8) + 0.3 * Math.sin(t * 2.3);
    for (const f of this.fronds) {
      const { p } = f;
      let a = f.a * 0.55 + 0.35 + Math.sin(t * 3 + f.ph) * 0.12 * (0.5 + gust);   // swept downwind
      let x = p.x, y = p.y;
      for (let k = 0; k < f.len; k++) {
        a += 0.03 + 0.012 * gust;   // droop and blow
        x += Math.cos(a); y += Math.sin(a);
        px(x, y, k < 4 ? C.palm : C.frond, 1, 2);
        if (k > 3 && k % 2 === 0) {
          const ll = (1 - k / f.len) * 9 + 2, flap = Math.sin(t * 6 + k * 0.5 + f.ph) * 1.5;
          for (let j = 1; j < ll; j++) { px(x + Math.cos(a + 1.9) * j + flap * 0.3, y + Math.sin(a + 1.9) * j + j * 0.3, j < 2 ? C.frondLit : C.frond); px(x + Math.cos(a - 1.3) * j * 0.7, y + Math.sin(a - 1.3) * j * 0.7 + j * 0.2, C.frondLit); }
        }
      }
    }
    // rain slanting on the gale
    for (const d of this.drops) {
      d.y += d.v * dt; d.x += d.v * 0.35 * dt;
      if (d.y > H) { d.y = -5; d.x = Math.random() * W - 40; }
      for (let k = 0; k < d.l; k++) px(d.x - k * 0.35, d.y - k, C.rain, 0.22);
    }
    // lightning far out at sea: a flash of the whole sky and a jagged bolt
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      const x0 = W * (0.15 + Math.random() * 0.7), pts = [[x0, 30]];
      let x = x0, y = 30; while (y < HOR) { x += (Math.random() - 0.5) * 10; y += 3 + Math.random() * 6; pts.push([x, Math.min(HOR, y)]); }
      this.bolt = { pts, life: 0.35 };
      this.nextBolt = 4 + Math.random() * 7;
    }
    if (this.bolt) {
      const b = this.bolt; b.life -= dt;
      const on = b.life > 0.22 || (b.life > 0.06 && b.life < 0.14);
      if (on) {
        g.fillStyle = "rgba(190,200,235,0.13)"; g.fillRect(0, 0, W, HOR);
        g.fillStyle = "rgba(190,200,235,0.05)"; g.fillRect(0, HOR, W, H - HOR);
        for (let i = 1; i < b.pts.length; i++) {
          const [ax, ay] = b.pts[i - 1], [bx, by] = b.pts[i], n = Math.max(1, Math.round(by - ay));
          for (let k = 0; k <= n; k++) { const u = k / n; px(ax + (bx - ax) * u, ay + (by - ay) * u, C.bolt, 1); px(ax + (bx - ax) * u - 1, ay + (by - ay) * u, C.bolt, 0.35); }
        }
      }
      if (b.life <= 0) this.bolt = null;
    }
  }
}
