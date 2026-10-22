// Module 3: Bone Dunes. A scorching desert under a bleached sky: a huge pale
// sun, flat-topped mesas and a ruined sandstone temple and obelisk lost in the
// haze, dunes with sharp lit crests and cool shadowed slip faces, the giant
// ribcage of something long dead in the middle distance, a horned skull half
// buried on the left and a great tusk arching in from the right. The floor is
// rippled sand littered with old swords, a shield and spent arrows (the
// skeletons' battlefield). The light layer shimmers the horizon in the heat,
// blows sand off the crests and along the ground, and circles vultures far off.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky: ["#1c1c30", "#2e2c46", "#4c4762", "#7a7088", "#ab9a9e", "#d4c0aa", "#ecdcbe", "#f6ecd4"].map(hex),
  sun: hex("#fffcf0"), halo: hex("#fbf1da"),
  mesa: hex("#a98f8c"), mesaLit: hex("#cdb4a2"), mesaDk: hex("#958088"),
  far: [hex("#b8968a"), hex("#d2b096"), hex("#e8caa4"), hex("#f4dcb4")],
  mid: [hex("#8e6a62"), hex("#b48a6c"), hex("#d6a87c"), hex("#eec894")],
  near: [hex("#5a3e3e"), hex("#84594a"), hex("#b07c56"), hex("#d6a46a"), hex("#f0c888")],
  bone: [hex("#3e2e30"), hex("#6e5650"), hex("#a48e7c"), hex("#d6c6aa"), hex("#f6ecd8")],
  stone: [hex("#8a6e66"), hex("#a8887a"), hex("#c8a68c"), hex("#e0c4a2")],
  rust: hex("#6a3a2a"), rustLit: hex("#a8603a"), steel: hex("#8a8a92"), steelLit: hex("#d0d4dc"), wood: hex("#5a3a28"), cloth: hex("#7a2a2a"),
  sandFly: hex("#f6dcae"), vulture: hex("#2a1e22"),
};

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r, mix, get }) {
    const B = (x, y) => bay(x & 255, y & 255);
    const blend = (x, y, c, k) => { if (k <= 0) return; const q = Math.min(4, Math.floor(Math.min(1, k) * 4 + B(x, y))) / 4; if (q > 0) put(x, y, q >= 1 ? c : mix(get(x, y), c, q)); };
    const ramp = (x, y, cols, v) => { v = Math.max(0, Math.min(0.999, v)) * (cols.length - 1); const i = Math.floor(v); put(x, y, (v - i) > B(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); };
    const SX = Math.round(W * 0.4), SY = 74, HOR = 132;
    this.HOR = HOR;

    // 1. bleached sky: dusty dark at the top, white-hot toward the horizon and around the sun
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - SX) * 0.75, y - SY);
      const v = Math.pow(Math.max(0, y - 6) / (HOR - 6), 1.1) * 0.82 + Math.pow(Math.max(0, 1 - d / 170), 1.6) * 0.45;
      ramp(x, y, C.sky, v);
    }
    // 2. the huge pale sun and its glare rings
    for (let y = SY - 120; y < SY + 120; y++) for (let x = SX - 140; x < SX + 140; x++) {
      const d = Math.hypot(x - SX, y - SY);
      if (d < 24) put(x, y, C.sun);
      else if (d < 26) dith(x, y, C.halo, C.sun, 0.5);
      else blend(x, y, C.halo, Math.pow(Math.max(0, 1 - d / 95), 2.2) * 0.9 + (Math.abs(d - 44) < 1 ? 0.25 : 0));
    }
    // thin high haze streaks
    for (let i = 0; i < W / 90; i++) {
      const cx = r() * W, cy = 46 + r() * 50, w = 60 + r() * 120;
      for (let x = Math.round(cx - w / 2); x < cx + w / 2; x++) {
        const u = (x - cx) / (w / 2), th = (1 - u * u) * 2.5;
        for (let y = Math.round(cy - th); y <= cy + th * 0.4; y++) blend(x, y, C.halo, 0.35 * (1 - u * u));
      }
    }
    // 3. distant mesas, pale with haze
    const mesas = [[0.05, 0.2, 26], [0.7, 0.86, 18], [0.88, 1.02, 30]];
    for (const [a, b, h] of mesas) {
      const x0 = W * a, x1 = W * b, top = HOR - h;
      for (let x = Math.round(x0 - 10); x < x1 + 10; x++) {
        const edge = x < x0 ? (x0 - x) : x > x1 ? (x - x1) : 0;
        const t = Math.round(top + edge * 2.2 + hash(x >> 2, 9) * 2);
        for (let y = t; y < HOR + 6; y++) put(x, y, y < t + 2 ? C.mesaLit : (y - t) % 7 === 3 && hash(x >> 3, y) < 0.6 ? C.mesaDk : C.mesa);
      }
    }
    // 4. dune layers: crescent dunes with a gentle lit windward face, a sharp
    // crest and a cool shadowed slip face whose edge curves down from the crest
    const duneLayer = (base, n, hMin, hMax, cols, ripple) => {
      const top = new Float32Array(W).fill(base);
      for (let x = 0; x < W; x++) {
        const t0 = Math.round(base - 3 * Math.sin(x * 0.02 + base) - 2 * Math.sin(x * 0.053));
        top[x] = t0;
        for (let y = t0; y < FLOOR + 2; y++) ramp(x, y, cols, 0.5 - (y - t0) * 0.012 + (ripple && (y - t0 + Math.round(Math.sin(x * 0.09) * 1.5)) % 5 === 0 ? -0.1 : 0));
      }
      const list = Array.from({ length: n }, (_, i) => ({ cx: (i + 0.15 + r() * 0.7) * W / n, w: (W / n) * (0.7 + r() * 0.6), h: hMin + r() * (hMax - hMin) }));
      for (const d of list) {
        const L = d.cx - d.w, cX = d.cx + d.w * 0.12, R = cX + d.w * 0.4, cT = top[Math.max(0, Math.min(W - 1, Math.round(cX)))] - d.h;
        for (let x = Math.floor(L); x < R; x++) {
          if (x < 0 || x >= W) continue;
          const u = x <= cX ? (x - L) / (cX - L) : 1 - (x - cX) / (R - cX);
          const e = x <= cX ? (u * u * (3 - 2 * u)) ** 1.15 : Math.pow(Math.max(0, u), 0.55);
          const tp = Math.round(Math.min(top[x], base - d.h * e - (top[x] - base) * 0) + 0);
          if (tp >= top[x]) continue;
          for (let y = tp; y < FLOOR + 2; y++) {
            const edge = cX + (y - cT) * (0.55 + 0.25 * Math.sin(y * 0.05 + d.cx)) ;
            const lee = x > edge && (y - tp) < (R - x) * 1.1 + 4;
            const dd = y - tp;
            let v = lee ? 0.1 + Math.min(0.18, (y - cT) * 0.004) : 0.86 - Math.min(0.32, dd * 0.01) - (1 - u) * 0.1;
            if (!lee && Math.abs(x - edge) < 1.2) v = 0.98;
            if (dd < 1 && !lee) v = 0.98;
            if (!lee && ripple && dd > 2 && (y - tp + Math.round(Math.sin(x * 0.11 + d.cx) * 1.5)) % 4 === 0) v -= 0.14;
            ramp(x, y, cols, v + 0.04 * (hash(x >> 1, y) - 0.5));
          }
          top[x] = tp;
        }
      }
      return top;
    };
    const farTop = duneLayer(HOR + 10, Math.max(3, Math.round(W / 160)), 8, 18, C.far, false);

    // 5. the ruined temple and obelisk on the far dunes
    const ox = Math.round(W * 0.6), ob = Math.round(farTop[Math.min(W - 1, ox)]) + 3;
    for (let y = ob - 58; y < ob; y++) {
      const half = 2.5 + (y - ob + 58) * 0.035;
      for (let k = -Math.ceil(half); k <= Math.ceil(half); k++) {
        if (y < ob - 52 && Math.abs(k) > (y - ob + 58)) continue;   // the pointed cap
        if (Math.abs(k) > half) continue;
        put(ox + k, y, k < -half * 0.2 ? C.stone[3] : k > half * 0.5 ? C.stone[0] : C.stone[1]);
      }
      if ((y - ob) % 6 === 0 && y > ob - 46) put(ox, y, C.stone[0]);   // carved glyphs
    }
    const tx = Math.round(W * 0.8), tb = Math.round(farTop[Math.min(W - 1, tx)]) + 4;
    for (let y = tb - 6; y < tb; y++) for (let k = -30 - (y - tb + 6); k <= 30 + (y - tb + 6); k++) put(tx + k, y, y === tb - 6 ? C.stone[3] : C.stone[1]);   // steps
    for (let i = 0; i < 6; i++) {
      const cx = tx - 25 + i * 10, h = [26, 26, 14, 26, 8, 20][i];
      for (let y = tb - 6 - h; y < tb - 6; y++) for (let k = -2; k <= 2; k++) put(cx + k, y, k < 0 ? C.stone[3] : k > 1 ? C.stone[0] : C.stone[2]);
    }
    for (let x = tx - 29; x < tx + 2; x++) for (let y = tb - 36; y < tb - 32; y++) put(x, y, y === tb - 36 ? C.stone[3] : C.stone[1]);   // half the lintel
    for (let x = tx - 29; x < tx - 6; x++) { const ph = Math.round((x - tx + 29) * 0.45); for (let y = tb - 36 - ph; y < tb - 36; y++) put(x, y, y === tb - 36 - ph ? C.stone[3] : C.stone[2]); }   // the broken pediment
    // sand drifted against the temple steps
    for (let x = tx - 44; x < tx + 44; x++) { const h = 4 * Math.max(0, 1 - Math.abs(x - tx - 10) / 34); for (let y = Math.round(tb - h); y < tb + 1; y++) ramp(x, y, C.far, 0.7); }
    // haze between the far and middle dunes
    for (let y = HOR - 30; y < FLOOR; y++) for (let x = 0; x < W; x++) blend(x, y, C.sky[6], 0.3 * Math.max(0, 1 - Math.abs(y - HOR - 4) / 26));
    const midTop = duneLayer(FLOOR - 10, Math.max(2, Math.round(W / 230)), 14, 30, C.mid, true);
    const midCrest = (x) => midTop[Math.max(0, Math.min(W - 1, Math.round(x)))];

    // 6. the giant ribcage in the middle distance (right of centre), half sunk
    const bone = (x, y, u, v) => ramp(x, y, C.bone, 0.25 + 0.6 * v + 0.08 * (hash(x, y) - 0.5) + (u ? 0 : 0));
    const curve = (pts, w0, w1) => {   // a tapering bone along a quadratic curve
      const [a, b, c] = pts, n = 80;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
        const w = w0 + (w1 - w0) * t;
        for (let k = -w; k <= w; k++) for (let j = -w; j <= w; j++) if (k * k + j * j <= w * w + 0.5) bone(Math.round(x + k), Math.round(y + j), 0, 0.55 - j / (w + 1) * 0.45 - k / (w + 1) * 0.15);
      }
    };
    const rc = Math.round(W * 0.74), rg = FLOOR - 14;
    // the spine running back into the dune
    for (let x = rc - 70; x < rc + 50; x++) { const y = rg - 26 + (x - rc) * 0.08 + Math.sin(x * 0.4) * 0.6; for (let j = -2; j <= 2; j++) bone(x, Math.round(y + j), 0, 0.6 - j * 0.2); if ((x - rc) % 6 === 0) for (let j = -5; j < -2; j++) bone(x, Math.round(y + j), 0, 0.8); }
    for (let i = 0; i < 7; i++) {
      const bx = rc - 62 + i * 17 + (r() - 0.5) * 4, by = rg - 26 + (bx - rc) * 0.08, s = 1 - Math.abs(i - 2.5) * 0.11;
      if (i === 5) continue;   // one rib missing
      const reach = (34 + r() * 8) * s, back = i === 6 ? 10 : 0;
      curve([[bx, by], [bx - 22 * s, by + 4], [bx - 12 * s - back, by + reach]], 2.2, 1);
    }
    // sand drifted against the ribs
    for (let x = rc - 90; x < rc + 70; x++) { const h = 6 * Math.max(0, 1 - Math.abs(x - rc + 10) / 80) + 2 * Math.sin(x * 0.2); for (let y = Math.round(rg + 10 - h); y < rg + 14; y++) ramp(x, y, C.mid, 0.58 - (y - rg) * 0.01 + 0.06 * Math.sin(y * 1.6 + x * 0.07)); }


    // 8. the floor: sand in perspective, warm in the sun, fine wind ripples
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x = 0; x < W; x++) {
        const sun = Math.max(0, 1 - Math.abs(x - SX) / (W * 0.55));
        const low = 0.08 * Math.sin(x * 0.013 + y * 0.05) + 0.06 * Math.sin(x * 0.031 - y * 0.11);
        const ph = (y - FLOOR) / (1.5 + t * 3.4) + Math.sin(x * 0.035 + y * 0.02) * 0.35 + Math.sin(x * 0.11 + y * 0.05) * 0.2 + hash(x >> 3, y >> 2) * 0.12;
        const f = ph - Math.floor(ph);
        let v = 0.54 + 0.16 * sun - t * 0.2 + low;
        if (f < 0.14) v -= 0.16; else if (f < 0.3) v += 0.1;
        ramp(x, y, C.near, v + 0.04 * (hash(x >> 1, y) - 0.5));
      }
    }
    for (let x = 0; x < W; x++) put(x, FLOOR, hash(x, 2) < 0.7 ? C.near[4] : C.near[3]);

    // 9. the old battlefield: swords and spears in the sand, a shield, arrows, small bones
    const sword = (x, y, h, lean) => {
      for (let k = 0; k < h; k++) { const xx = Math.round(x + k * lean); put(xx, y - k, k > h - 3 ? C.steel : C.steelLit); put(xx + 1, y - k, C.steel); }
      const gy = y - h; for (let k = -3; k <= 3; k++) put(Math.round(x + h * lean) + k, gy, C.rust);
      for (let k = 1; k < 5; k++) put(Math.round(x + (h + k) * lean), gy - k, C.wood);
    };
    const arrow = (x, y, lean) => { for (let k = 0; k < 9; k++) put(Math.round(x + k * lean), y - k, C.wood); put(Math.round(x + 9 * lean), y - 9, C.bone[4]); put(Math.round(x + 9 * lean) - 1, y - 9, C.cloth); put(Math.round(x + 8 * lean) - 1, y - 8, C.cloth); };
    const shield = (x, y, rad) => { for (let j = -rad; j <= 0; j++) for (let k = -rad; k <= rad; k++) { const d = Math.hypot(k, j * 1.4); if (d > rad) continue; put(x + k, y + j, d > rad - 1.2 ? C.rust : d < 1.5 ? C.steelLit : (k + j) < 0 ? C.rustLit : C.rust); } };
    sword(Math.round(W * 0.2), FLOOR + 14, 14, 0.25); sword(Math.round(W * 0.86), FLOOR + 22, 16, -0.2); sword(Math.round(W * 0.58), FLOOR - 14, 9, 0.15);
    shield(Math.round(W * 0.31), FLOOR + 26, 8);
    for (let i = 0; i < W / 40; i++) { const x = r() * W, y = FLOOR + 4 + r() * 40; if (Math.abs(x - W / 2) < W * 0.12) continue; if (r() < 0.6) arrow(x, y, (r() - 0.5) * 0.8); else { for (let k = 0; k < 4 + r() * 3; k++) put(x + k, y, C.bone[3]); put(x, y - 1, C.bone[4]); put(x + 5, y - 1, C.bone[3]); } }
    for (let i = 0; i < W / 6; i++) { const x = r() * W, y = FLOOR + 1 + r() * 43; put(x, y, r() < 0.5 ? C.near[0] : C.bone[2]); }   // pebbles

    // 10. a horned skull half buried on the middle dune (left of centre)
    const inEl = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    const skull = (X, Y, S) => {
      // the horn first (it sweeps up and back behind the cranium), in local units
      for (let i = 0; i <= 160; i++) {
        const t = i / 160, lx = -4 - 34 * Math.sin(t * 2.0) + t * t * 30, ly = -40 - t * 80 + t * t * 18;
        const w = (9 * (1 - t) ** 0.9 + 1.2) * S;
        for (let k = -w; k <= w; k++) { const u = k / w; ramp(Math.round(X + lx * S + k), Math.round(Y + ly * S), C.bone, 0.22 + 0.5 * Math.max(0, 0.3 - u) + (Math.abs(u) > 0.85 ? -0.12 : 0) - ((i % 11) < 2 ? 0.14 : 0)); }
      }
      for (let y = Math.floor(Y - 50 * S); y < Y + 8 * S; y++) for (let x = Math.floor(X - 34 * S); x < X + 70 * S; x++) {
        const lx = (x - X) / S, ly = (y - Y) / S;
        const cr = inEl(lx, ly, 0, -20, 30, 24);
        const snTop = -34 + lx * 0.3, snBot = -4 + lx * 0.04, tipC = inEl(lx, ly, 58, -10, 9, 8);
        const inSnout = lx >= 0 && lx <= 58 && ly >= snTop && ly <= snBot;
        if (cr > 1 && !inSnout && tipC > 1) continue;
        const eye = inEl(lx, ly, 12, -24, 8, 7), cheek = inEl(lx, ly, 26, -9, 7, 3), nose = inEl(lx, ly, 52, -18, 3, 5);
        if (eye < 1) { put(x, y, eye > 0.6 && ly < -26 ? C.bone[1] : C.bone[0]); continue; }
        if (cheek < 1 || nose < 1) { put(x, y, C.bone[0]); continue; }
        let v;
        if (cr <= 1) v = 0.62 - ((ly + 20) / 24) * 0.35 - (cr > 0.82 ? 0.22 : 0);
        else { const u = (ly - snTop) / Math.max(1, snBot - snTop); v = 0.75 - u * 0.4 - (u > 0.88 || u < 0.08 ? 0.2 : 0); }
        if (eye < 1.6) v -= 0.12;   // the brow ridge shadow
        const crack = Math.abs((lx + 8) - ly * 0.5 - 2.5 * Math.sin(ly * 0.5)) < 0.8 && ly < -26;
        ramp(x, y, C.bone, crack ? 0.12 : v + 0.06 * (hash(x >> 1, y >> 1) - 0.5));
      }
      for (let lx = 16; lx < 56; lx += 5) { const x = Math.round(X + lx * S), y0 = Math.round(Y + (-4 + lx * 0.04) * S); put(x, y0, C.bone[4]); put(x, y0 + 1, C.bone[3]); put(x + 1, y0, C.bone[0]); }
      // sand drifted over the jaw
      for (let x = Math.floor(X - 40 * S); x < X + 80 * S; x++) { const h = (5 + 3 * Math.sin(x * 0.07)) * S - Math.max(0, x - X - 40 * S) * 0.2; for (let y = Math.round(Y + 2 * S - h); y < Y + 6 * S; y++) ramp(x, y, C.mid, 0.66 - (y - Y) * 0.02 + ((y + Math.round(Math.sin(x * 0.1) * 2)) % 4 === 0 ? -0.1 : 0)); }
    };
    const skX = Math.round(W * 0.22);
    skull(skX, Math.round(midCrest(skX + 10)) + 12, 0.62);
    // 11. framing: two great ribs arching in from the left, a tusk from the right
    for (const [x0, sc, sh] of [[-10, 1, 0], [22, 0.8, 0.08]]) for (let i = 0; i <= 220; i++) {
      const t = i / 220, x = x0 + 80 * sc * Math.sin(t * 2.1) + t * 10, y = FLOOR + 12 - t * 190 * sc + t * t * 50 * sc;
      const w = (11 * (1 - t) ** 0.7 + 1.5) * sc;
      for (let k = -w; k <= w; k++) { const u = k / w; ramp(Math.round(x + k), Math.round(y), C.bone, 0.12 + sh + 0.5 * Math.max(0, -u) * (1.1 - t * 0.3) + (Math.abs(u) > 0.88 ? -0.1 : 0) + 0.06 * hash(i >> 2, k)); }
    }
    for (let x = 0; x < 80; x++) { const h = 9 + 4 * Math.sin(x * 0.1) - x * 0.06; for (let y = Math.round(FLOOR + 6 - h); y < FLOOR + 16; y++) ramp(x, y, C.near, 0.5 - (y - FLOOR) * 0.02 + ((y + Math.round(Math.sin(x * 0.1) * 2)) % 4 === 0 ? 0.12 : 0)); }
    // the tusk: from the right edge, a long curve up and over the top-right
    const tk0 = W + 6;
    for (let i = 0; i <= 260; i++) {
      const t = i / 260, x = tk0 - 70 * Math.sin(t * 2.2) - t * 16, y = FLOOR + 10 - t * 170 + t * t * 40;
      const w = 15 * (1 - t) ** 0.8 + 1.5;
      for (let k = -w; k <= w; k++) { const u = k / w; ramp(Math.round(x + k), Math.round(y), C.bone, 0.18 + 0.55 * Math.max(0, -u) * (1.2 - t * 0.4) + (Math.abs(u) > 0.9 ? -0.1 : 0) + 0.06 * hash(i >> 2, k)); }
      if (i % 37 === 0 && t < 0.8) for (let k = -w; k <= w; k++) put(Math.round(x + k), Math.round(y), C.bone[1]);
    }
    for (let x = W - 70; x < W; x++) { const h = 8 + 4 * Math.sin(x * 0.1); for (let y = Math.round(FLOOR + 6 - h); y < FLOOR + 16; y++) ramp(x, y, C.near, 0.55 - (y - FLOOR) * 0.02 + 0.1 * Math.sin(y * 1.3 + x * 0.12)); }

    // ---- light-layer data ----
    this.sun = { x: SX, y: SY };
    this.midCrest = midCrest;
    this.streaks = Array.from({ length: Math.round(W / 10) }, () => ({ x: r() * W, y: FLOOR - 6 + r() * 46, v: 30 + r() * 60, len: 3 + r() * 10, p: r() * 6 }));
    this.spray = Array.from({ length: Math.round(W / 16) }, () => ({ x: r() * W, life: r(), v: 15 + r() * 25 }));
    this.birds = [[0.32, 40, 22, 0.35], [0.5, 52, 16, -0.28], [0.36, 58, 30, 0.22]].map(([fx, y, rad, s]) => ({ x: W * fx, y, rad, s, p: r() * 6 }));
  }

  animate({ g, t, dt, W, H, FLOOR, px }) {
    // heat shimmer: rows near the horizon nudged sideways
    const hb = this.HOR - 26;
    for (let y = hb; y < FLOOR - 6; y++) {
      const off = Math.round(Math.sin(t * 5 + y * 0.9) * Math.sin(t * 1.3 + y * 0.21) * 1.4);
      if (off) g.drawImage(this.base, 0, y, W, 1, off, y, W, 1);
    }
    // vultures circling far off, wings slowly beating
    for (const b of this.birds) {
      const a = t * b.s + b.p, x = b.x + Math.cos(a) * b.rad, y = b.y + Math.sin(a) * b.rad * 0.35, f = Math.sin(t * 3 + b.p) > 0.3;
      px(x, y, C.vulture, 0.85);
      px(x - 1, y - (f ? 1 : 0), C.vulture, 0.85); px(x + 1, y - (f ? 1 : 0), C.vulture, 0.85);
      px(x - 2, y - (f ? 2 : 0), C.vulture, 0.7); px(x + 2, y - (f ? 2 : 0), C.vulture, 0.7);
      if (!f) { px(x - 3, y + 1, C.vulture, 0.5); px(x + 3, y + 1, C.vulture, 0.5); }
    }
    // sand blown off the dune crests
    for (const s of this.spray) {
      s.life += dt * 0.6; if (s.life > 1) { s.life = 0; s.x = Math.random() * W; }
      const y0 = this.midCrest(s.x), x = s.x + s.life * s.v, y = y0 - s.life * 4 + s.life * s.life * 6;
      px(x, y, C.sandFly, 0.5 * (1 - s.life));
      px(x - 2, y + 1, C.sandFly, 0.3 * (1 - s.life));
    }
    // sand streaks racing along the ground
    const gust = 0.6 + 0.4 * Math.sin(t * 0.5);
    for (const s of this.streaks) {
      s.x += s.v * dt * gust; if (s.x > W + 12) s.x = -12 - Math.random() * 40;
      const a = 0.25 + 0.2 * Math.sin(t * 2 + s.p);
      for (let k = 0; k < s.len; k++) px(s.x - k, s.y + Math.sin(s.x * 0.05 + s.p) * 1.5, C.sandFly, a * (1 - k / s.len));
    }
  }
}
