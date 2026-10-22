// Module 4: Frostbite Fields. A frozen tundra at night under a green-teal
// aurora: stars and a cold moon, jagged moonlit peaks, faceted ice cliffs with
// a frozen waterfall, ranks of snowy pines fading into the cold haze, and a
// heap of scrap half buried in the snow around a dead giant robot's head (the
// scrap robots crawl out of here; its one red eye still flickers). A huge
// snow-laden pine frames the left, ice spires the right, and the floor is
// packed snow with sheets of cracked ice catching the aurora. The light layer
// ripples the aurora, falls snow, twinkles the stars and blinks the red eye.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky: ["#02040b", "#050a18", "#081226", "#0b1d34", "#0f2c42", "#15404e"].map(hex),
  star: hex("#cfe6ff"), starHi: hex("#ffffff"), moon: hex("#e8f2ff"), moonDk: hex("#9ab0cc"),
  au: [hex("#123c3c"), hex("#1a6050"), hex("#2aa070"), hex("#5ee8a8")], auTop: hex("#4a3a8a"),
  mtn: [hex("#16233a"), hex("#22344e"), hex("#3a5272"), hex("#6a88aa"), hex("#a8c4dc")],
  ice: [hex("#0c1e30"), hex("#153452"), hex("#235a7e"), hex("#4a90b4"), hex("#9ad4ea"), hex("#e4f8ff")],
  pineFar: hex("#132236"), pineFarSnow: hex("#3e5874"), pine: hex("#08121e"), pineMid: hex("#0f2030"), pineSnow: hex("#7a9ab8"), pineSnowHi: hex("#cfe4f4"),
  snow: [hex("#1a2a44"), hex("#2a4064"), hex("#45628a"), hex("#7894b8"), hex("#b6cce4"), hex("#e6f2fc")],
  sheet: [hex("#0a1a2a"), hex("#123048"), hex("#1a5058"), hex("#2a8070"), hex("#6ad8b0")], crack: hex("#04101c"), crackHi: hex("#8ad8ff"),
  metal: [hex("#0c1018"), hex("#1c2430"), hex("#34404e"), hex("#56667a"), hex("#8a9cb0")], rust: hex("#7a3a1e"), rustHi: hex("#b05a2a"),
  eye: hex("#ff3a2a"), eyeHi: hex("#ffb0a0"), bark: hex("#120c10"), barkLit: hex("#2a2030"),
  fog: hex("#24405a"),
};

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r, mix, get }) {
    const B = (x, y) => bay(x & 255, y & 255);
    const blend = (x, y, c, k) => { if (k <= 0) return; const q = Math.min(4, Math.floor(Math.min(1, k) * 4 + B(x, y))) / 4; if (q > 0) put(x, y, q >= 1 ? c : mix(get(x, y), c, q)); };
    const ramp = (x, y, cols, v) => { v = Math.max(0, Math.min(0.999, v)) * (cols.length - 1); const i = Math.floor(v); put(x, y, (v - i) > B(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); };
    const HOR = 136;
    const auY = (x) => 66 + 12 * Math.sin(x * 0.009 + 1) + 7 * Math.sin(x * 0.023 + 2.4);
    this.auY = auY;

    // 1. night sky, a teal glow toward the horizon
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) ramp(x, y, C.sky, Math.pow(y / HOR, 1.5) * 0.95);
    // stars (the twinkling ones are in the light layer)
    this.stars = [];
    for (let i = 0; i < W * 0.35; i++) {
      const x = Math.round(r() * W), y = Math.round(r() * (HOR - 30)), b = r();
      put(x, y, b > 0.85 ? C.starHi : mix(get(x, y), C.star, 0.3 + b * 0.5));
      if (b > 0.93) this.stars.push({ x, y, p: r() * 6, s: 1 + r() * 2 });
    }
    // 2. the aurora's still glow (the curtains shimmer in the light layer)
    for (let y = 10; y < HOR; y++) for (let x = 0; x < W; x++) {
      const e = auY(x), d = y - e;
      let k = d > 0 ? Math.max(0, 1 - d / 10) : Math.max(0, 1 + d / 55) ** 2;
      k *= (0.55 + 0.45 * Math.sin(x * 0.05 + Math.sin(x * 0.013) * 3)) * (0.55 + 0.45 * Math.sin(x * 0.31 + Math.sin(x * 0.021) * 6 + y * 0.02));
      if (k > 0.05) ramp(x, y, [get(x, y), C.au[0], C.au[1], C.au[2]], k * (d > -8 ? 0.95 : 0.6));
      if (d < -30 && k > 0.1) blend(x, y, C.auTop, k * 0.3);
    }
    // the moon, small and cold
    const MX = Math.round(W * 0.84), MY = 36;
    for (let y = MY - 30; y < MY + 30; y++) for (let x = MX - 30; x < MX + 30; x++) {
      const d = Math.hypot(x - MX, y - MY);
      if (d < 8) put(x, y, Math.hypot(x - MX - 3, y - MY + 1) < 6 ? C.moonDk : C.moon);
      else blend(x, y, C.moonDk, Math.max(0, 1 - d / 28) ** 2 * 0.4);
    }
    // 3. jagged moonlit peaks, snow on the lit faces
    const peaks = (base, amp, fr, ph, cols, haze) => {
      const f = (x) => base - amp * (0.55 * (1 - Math.abs(Math.sin(x * fr + ph))) + 0.3 * (1 - Math.abs(Math.sin(x * fr * 2.3 + ph * 2))) + 0.15 * (1 - Math.abs(Math.sin(x * fr * 5.1 + ph))));
      for (let x = 0; x < W; x++) {
        const top = Math.round(f(x)), slope = f(x + 1) - f(x - 1);
        for (let y = top; y < FLOOR; y++) {
          const dd = y - top, lit = slope > 0;   // faces toward the moon (right)
          let v = lit ? 0.75 - dd * 0.012 : 0.22 - dd * 0.004;
          if (lit && Math.sin(x * 0.4 + y * 0.3) + hash(x >> 1, y >> 1) > 1.2) v -= 0.25;   // rock showing through
          if (dd < 1) v = lit ? 0.95 : 0.4;
          ramp(x, y, cols, v);
          if (haze) blend(x, y, C.sky[5], haze * (0.4 + dd * 0.02));
        }
      }
      return f;
    };
    peaks(HOR - 8, 46, 0.012, r() * 6, C.mtn, 0.35);
    peaks(HOR + 4, 30, 0.02, r() * 6, C.mtn, 0.15);
    // far pines: a soft band of snowy firs in the haze
    const pine = (x, base, h, col, snow, snowHi) => {
      const tiers = Math.max(3, Math.round(h / 6));
      for (let y = 0; y < h; y++) {
        const u = y / h, tier = (u * tiers) % 1, half = (0.5 + u * 5.5) * (0.6 + 0.4 * tier) * (h / 30);
        for (let k = -half; k <= half; k++) {
          const top = tier < 0.22 && snow;
          put(x + k, base - h + y, top ? (k < 0 && snowHi ? snowHi : snow) : col);
        }
      }
      for (let y = 0; y < 3; y++) put(x, base + y - 1, col);
    };
    for (let x = -4; x < W + 4; x += 3 + r() * 6) pine(Math.round(x), HOR + 14 + Math.round(r() * 4), 10 + r() * 12, C.pineFar, r() < 0.7 ? C.pineFarSnow : null, null);
    // cold mist over the far forest
    for (let y = HOR; y < FLOOR; y++) for (let x = 0; x < W; x++) blend(x, y, C.fog, 0.5 * Math.max(0, 1 - Math.abs(y - HOR - 14) / 16) * (0.7 + 0.3 * Math.sin(x * 0.03 + y * 0.2)));

    // 4. faceted ice cliffs with a frozen waterfall (left of centre)
    const cx0 = Math.round(W * 0.1), cx1 = Math.round(W * 0.36), cTop = (x) => 74 + 16 * Math.abs(Math.sin(x * 0.045)) + 10 * Math.abs(Math.sin(x * 0.13 + 1)) + 4 * Math.abs(Math.sin(x * 0.37)) + 3 * hash(x >> 2, 1) + Math.max(0, (x - cx1 + 30)) * 1.6 + Math.max(0, cx0 + 20 - x) * 1.2;
    const seeds = Array.from({ length: 60 }, () => ({ x: cx0 - 10 + r() * (cx1 - cx0 + 20), y: 70 + r() * 110, v: r() }));
    const fallX = Math.round(W * 0.22), fallW = 14;
    for (let x = cx0 - 30; x < cx1 + 40; x++) {
      const top = Math.round(cTop(x));
      for (let y = top; y < FLOOR + 2; y++) {
        let best = 1e9, sv = 0;
        for (const sd of seeds) { const d = (x - sd.x) ** 2 + ((y - sd.y) * 0.7) ** 2; if (d < best) { best = d; sv = sd.v; } }
        const fall = Math.abs(x - fallX - Math.sin(y * 0.08) * 2) < fallW * (0.6 + (y - top) / 200);
        if (fall && y > top + 3) {
          const streak = hash(x, 5) ;
          ramp(x, y, C.ice, 0.55 + streak * 0.4 - (y % 9 === 0 && streak < 0.5 ? 0.2 : 0));
        } else ramp(x, y, C.ice, 0.12 + sv * 0.38 + (y - top < 2 ? 0.45 : 0) - (y - top) * 0.0015);
      }
      if (top < FLOOR) for (let y = top - 2; y < top; y++) put(x, y, C.snow[5]);   // snow on the clifftop
    }
    // icicles along the cliff's edge
    for (let x = cx0; x < cx1; x += 2 + Math.floor(r() * 4)) { const top = Math.round(cTop(x)), len = 3 + r() * 10; for (let k = 0; k < len; k++) put(x, top + k, k > len - 2 ? C.ice[5] : C.ice[4]); }
    // the frozen pool at the waterfall's foot
    for (let y = FLOOR - 10; y < FLOOR; y++) for (let x = fallX - 30; x < fallX + 30; x++) if (((x - fallX) / 30) ** 2 + ((y - FLOOR + 3) / 7) ** 2 < 1) ramp(x, y, C.ice, 0.62 + 0.25 * hash(x >> 2, y));

    // 5. middle pines: darker, with heavy snow on the tiers
    for (let i = 0; i < W / 26; i++) {
      const x = Math.round(r() * W);
      if (x > cx0 - 10 && x < cx1 + 6) continue;
      pine(x, FLOOR - 6 + Math.round(r() * 4), 26 + r() * 30, C.pineMid, C.pineSnow, C.pineSnowHi);
    }

    // 6. the scrap heap: a dead giant robot's head half buried, an arm, pipes, a wheel
    const SX = Math.round(W * 0.64), SB = FLOOR - 4;
    const met = (x, y, v) => ramp(x, y, C.metal, v + 0.12 + 0.06 * (hash(x >> 1, y >> 1) - 0.5) + (hash(x >> 2, y >> 2) < 0.12 ? 0.15 : 0));
    // a heap of junk shapes behind
    for (let i = 0; i < 26; i++) {
      const bx = SX - 50 + r() * 100, by = SB - r() * 18, w = 4 + r() * 10, h = 3 + r() * 7, ang = (r() - 0.5) * 0.8;
      for (let y = -h; y <= 0; y++) for (let k = -w; k <= w; k++) { const x = Math.round(bx + k + y * ang); met(x, by + y, 0.22 + (y === -Math.round(h) ? 0.4 : 0) + (k / w) * -0.1); if (y === -Math.round(h) && hash(x, by) < 0.7) put(x, by + y - 1, C.snow[4]); }
    }
    // the head: a dome with a visor slit and one socket
    const hx = SX + 8, hy = SB - 20, hr = 24;
    for (let y = hy - hr; y < SB + 2; y++) for (let x = hx - hr - 4; x <= hx + hr + 4; x++) {
      const dx = (x - hx) / (hr + 4), dy = (y - hy) / hr;
      if (dx * dx + Math.min(0, dy) ** 2 > 1) continue;
      const tilt = y - hy + (x - hx) * 0.15;
      const visor = tilt > -2 && tilt < 5 && Math.abs(x - hx) < hr;
      let v = 0.4 - dx * 0.25 - Math.min(0, dy) * -0.1 + (dy < -0.7 ? 0.2 : 0);
      if (visor) v = 0.05 + (Math.abs(x - hx + 9) < 4 || Math.abs(x - hx - 6) < 4 ? 0 : 0.12);
      if (tilt > 12 && tilt < 18 && Math.abs(x - hx) < 10) v = ((x + 100) % 3 === 0) ? 0.02 : 0.32;   // the mouth grill
      if (Math.abs(tilt - 10) < 0.6) v = 0.1;   // a panel seam
      met(x, y, v);
      if (Math.abs(x - hx) % 9 === 0 && tilt > 7 && tilt < 14) put(x, y, C.metal[4]);   // rivets
      if (!visor && hash(x, y) < 0.06 && dy > 0) put(x, y, C.rust);
    }
    // snow cap on the dome
    for (let x = hx - hr; x <= hx + hr; x++) { const dx = (x - hx) / (hr + 4), top = Math.round(hy - hr * Math.sqrt(Math.max(0, 1 - dx * dx))); for (let k = 0; k < 3 + 3 * (1 - Math.abs(dx)); k++) put(x, top + k - 1, k < 1 ? C.snow[5] : C.snow[4]); }
    this.eye = { x: hx - 9, y: Math.round(hy + 1 - 9 * 0.15) };
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) put(this.eye.x + k, this.eye.y + j, k + j ? C.rust : C.eye);
    // an antenna snapped and bent
    for (let k = 0; k < 18; k++) put(hx + 10 + Math.round(k * 0.25), hy - hr + 4 - k, C.metal[3]); for (let k = 0; k < 7; k++) put(hx + 14 + k, hy - hr - 14 + Math.round(k * 0.6), C.metal[3]);
    // a great arm reaching up out of the snow, claw open (to the left)
    for (let i = 0; i < 34; i++) { const x = SX - 34 - i * 0.55, y = SB - i; for (let k = -3; k <= 3; k++) met(Math.round(x + k), Math.round(y), 0.3 + k * -0.06 + (i % 8 === 0 ? -0.2 : 0)); }
    for (const [dx, dy] of [[-1, -1], [1, -0.4]]) for (let i = 0; i < 12; i++) { const x = SX - 53 + dx * i * 0.8 + (dx > 0 ? 2 : 0), y = SB - 34 + dy * i - (i * i) * 0.06 * (dx > 0 ? -1 : 1); for (let k = -1; k <= 1; k++) met(Math.round(x + k), Math.round(y), 0.5 - k * 0.1); }
    // a wheel/gear half buried on the right
    const gx = SX + 44, gy = SB, gr = 11;
    for (let y = gy - gr - 3; y < gy; y++) for (let x = gx - gr - 3; x <= gx + gr + 3; x++) {
      const d = Math.hypot(x - gx, y - gy), a = Math.atan2(y - gy, x - gx);
      const tooth = d < gr + 3 && d > gr && Math.sin(a * 10) > 0.2;
      if (d < 3) met(x, y, 0.6); else if (d < gr - 4 && d > 4) met(x, y, 0.08); else if (d <= gr || tooth) met(x, y, 0.35 - (y - gy) * 0.02 + (d > gr - 1.5 ? 0.15 : 0));
    }
    // snow drifted round the whole heap
    for (let x = SX - 90; x < SX + 80; x++) { const h = 8 * Math.max(0, 1 - Math.abs(x - SX) / 90) + 2 * Math.sin(x * 0.17); for (let y = Math.round(SB + 2 - h); y < FLOOR + 1; y++) ramp(x, y, C.snow, 0.72 - (y - SB + h) * 0.04); }

    // low drifting mist over the middle distance
    for (let y = FLOOR - 26; y < FLOOR; y++) for (let x = 0; x < W; x++) blend(x, y, C.fog, ((y - FLOOR + 26) / 26) * 0.35 * (0.7 + 0.3 * Math.sin(x * 0.04 + y * 0.15)));

    // 7. the floor: packed snow in perspective with sheets of cracked ice
    const patches = [];
    for (let i = 0; i < Math.max(3, W / 120); i++) { const py = FLOOR + 8 + r() * 36; patches.push({ x: r() * W, y: py, rx: 20 + r() * 50 * (0.6 + (py - FLOOR) / 40), ry: 3 + (py - FLOOR) * 0.14 }); }
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x = 0; x < W; x++) {
        const n = 0.1 * Math.sin(x * 0.02 + y * 0.13) + 0.08 * Math.sin(x * 0.051 - y * 0.3) + 0.05 * (hash(x >> 1, y) - 0.5);
        let sheetK = -1;
        for (const pt of patches) { const q = 1 - Math.hypot((x - pt.x) / pt.rx, (y - pt.y) / pt.ry) + 0.12 * Math.sin(x * 0.2 + y * 0.9 + pt.x); if (q > sheetK) sheetK = q; }
        if (sheetK > 0) {
          const refl = Math.max(0, 1 - t * 1.2) * (0.5 + 0.5 * Math.sin(x * 0.05 + 1)) * 0.45;
          ramp(x, y, C.sheet, 0.2 + refl + (Math.sin(x * 0.3 - y * 1.7) > 0.92 ? 0.25 : 0));
          if (sheetK < 0.06) put(x, y, C.snow[4]);
        } else ramp(x, y, C.snow, 0.6 + n - t * 0.35 + (t < 0.04 ? 0.3 : 0));
      }
    }
    // cracks across the ice, with bright edges
    for (let i = 0; i < W / 110; i++) {
      let x = r() * W, y = FLOOR + 10 + r() * 30, dir = r() < 0.5 ? -1 : 1;
      for (let s2 = 0; s2 < 30 + r() * 30; s2++) {
        put(x, y, C.crack); put(x, y + 1, C.crackHi);
        if (r() < 0.08) { let bx = x, by = y; for (let k = 0; k < 6; k++) { bx += dir * (0.5 + r()); by += 0.7; put(bx, by, C.crack); } }
        x += 1.5 + r() * 1.5; y += (r() - 0.5) * 1.2;
      }
    }
    // little snow mounds and grass poking through
    for (let i = 0; i < W / 12; i++) { const x = r() * W, y = FLOOR + 1 + r() * 40; if (Math.abs(x - W / 2) < W * 0.15) continue; for (let k = 0; k < 2 + r() * 3; k++) put(x + k * (r() < 0.5 ? 1 : -1) * 0.5, y - k, C.mtn[2]); }

    // 8. framing: a huge snowy pine on the left, ice spires on the right
    const lx = Math.max(6, Math.round(W * 0.012));
    for (let y = 0; y < FLOOR + 8; y++) for (let k = -4; k <= 4; k++) put(lx + k, y, k < -2 ? C.barkLit : C.bark);
    // tiers of drooping, snow-laden boughs, widest at the bottom
    for (let i = 0; i < 12; i++) {
      const ty = -8 + i * 15 + r() * 4, wdt = 16 + i * 4.2 + r() * 8;
      for (const side of [1, -1]) for (let s2 = 0; s2 < wdt; s2++) {
        const u = s2 / wdt, x = lx + side * s2, yb = ty + u * 12 + u * u * 6;
        const th = 9 * (1 - u) + 3;
        for (let k = 0; k < th; k++) {
          const yy = Math.round(yb - th + k + 2 + (hash(x >> 1, i) - 0.5) * 2);
          const edge = k < 2 && hash(x, i) < 0.9;
          put(x, yy, edge ? (k < 1 ? (side > 0 ? C.pineSnowHi : C.pineSnow) : C.pineSnow) : k < 4 ? C.pineMid : C.pine);
        }
        if (u > 0.85 && hash(x, 7 + i) < 0.4) for (let k = 0; k < 3; k++) put(x, Math.round(yb + 2 + k), C.pine);   // ragged tips
      }
    }
    const spire = (sx, base, h, w, lean) => {
      for (let y = 0; y < h; y++) {
        const half = w * (1 - y / h) ** 0.8;
        for (let k = -half; k <= half; k++) { const u = k / Math.max(1, half); ramp(Math.round(sx + k + y * lean), base - y, C.ice, u < -0.3 ? 0.8 : u < 0.2 ? 0.55 + 0.2 * hash(y >> 2, sx) : 0.18); if (u < -0.85) put(Math.round(sx + k + y * lean), base - y, C.ice[5]); }
      }
    };
    const rx = W - Math.max(10, Math.round(W * 0.02));
    spire(rx, FLOOR + 6, 170, 16, -0.12); spire(rx - 22, FLOOR + 6, 96, 10, -0.2); spire(rx + 8, FLOOR + 6, 220, 12, -0.05); spire(rx - 36, FLOOR + 6, 44, 7, -0.3);
    for (let x = rx - 50; x < W; x++) { const h = 6 + 3 * Math.sin(x * 0.2); for (let y = Math.round(FLOOR + 4 - h); y < FLOOR + 10; y++) ramp(x, y, C.snow, 0.8 - (y - FLOOR + h) * 0.05); }
    for (let x = 0; x < lx + 50; x++) { const h = 7 + 3 * Math.sin(x * 0.15); for (let y = Math.round(FLOOR + 4 - h); y < FLOOR + 10; y++) ramp(x, y, C.snow, 0.8 - (y - FLOOR + h) * 0.05); }

    // ---- light-layer data ----
    this.flakes = Array.from({ length: Math.round(W / 3.5) }, () => ({ x: r() * W, y: r() * H, z: r(), p: r() * 6 }));
  }

  animate({ g, t, dt, W, H, FLOOR, px }) {
    // aurora curtains: rays rising from a wavering lower edge, rippling sideways
    for (let x = 0; x < W; x += 2) {
      const e = this.auY(x) + 3 * Math.sin(x * 0.035 + t * 0.7);
      const I = 0.5 + 0.5 * Math.sin(x * 0.21 + t * 1.6 + Math.sin(x * 0.03 - t * 0.35) * 4);
      const I2 = Math.max(0, Math.sin(x * 0.013 - t * 0.25));
      const k = I * (0.35 + 0.65 * I2);
      if (k < 0.12) continue;
      const len = 26 + 22 * I2;
      for (let y = 0; y < len; y += 2) {
        const f = (1 - y / len) ** 1.6 * k;
        if (f < 0.05) break;
        px(x, e - y - 2, y < 6 ? C.au[3] : y < len * 0.6 ? C.au[2] : C.auTop, f * 0.6, 2);
      }
    }
    // twinkling stars
    for (const s of this.stars) { const a = Math.max(0, Math.sin(t * s.s + s.p)); px(s.x, s.y, C.starHi, a); if (a > 0.8) { px(s.x - 1, s.y, C.star, 0.4); px(s.x + 1, s.y, C.star, 0.4); px(s.x, s.y - 1, C.star, 0.4); px(s.x, s.y + 1, C.star, 0.4); } }
    // the robot's eye flickering
    const on = Math.sin(t * 1.3) > -0.3 && Math.sin(t * 17) > -0.6;
    if (on) { px(this.eye.x - 1, this.eye.y - 1, C.eye, 0.3, 4); px(this.eye.x, this.eye.y, C.eye, 1, 2); px(this.eye.x, this.eye.y, C.eyeHi, 0.9); }
    // snow: far flakes small and slow, near ones bigger, a wind gusting
    const wind = 8 + 10 * Math.sin(t * 0.3);
    for (const f of this.flakes) {
      f.y += (6 + f.z * 22) * dt; f.x += (wind * (0.5 + f.z) + Math.sin(t * 1.5 + f.p) * 6) * dt;
      if (f.y > H) { f.y = -2; f.x = Math.random() * W; } if (f.x > W + 2) f.x = -2;
      const s = f.z > 0.85 ? 2 : 1;
      px(f.x, f.y, C.snow[5], 0.35 + f.z * 0.55, s);
    }
  }
}
