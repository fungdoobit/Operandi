// Module 2: Overgrown Ruins. A rolling meadow at golden hour, taken back by
// nature: a low sun behind hazy pink hills (an old tower and a broken aqueduct
// on them), sunbeams fanning out, big clouds lit from below, a ruined
// colonnade and arch in the middle distance wrapped in ivy, a huge broken
// column (left) and an old oak (right) framing the scene, and a meadow floor
// with sunken flagstones and wildflowers. The light layer sways the tall grass
// at the edges and drifts butterflies and pollen through the sunbeams.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky0: hex("#141429"), sky1: hex("#252445"), sky2: hex("#4a3560"), sky3: hex("#8e4f68"), sky4: hex("#d27a58"), sky5: hex("#f2b466"), sky6: hex("#fbd88a"),
  sun: hex("#fff4cc"), sunHalo: hex("#ffe29a"),
  cl0: hex("#3a2c4e"), cl1: hex("#6e4060"), cl2: hex("#b45e5e"), cl3: hex("#ec9662"), cl4: hex("#ffd28c"),
  hillA: hex("#b77a7e"), hillAl: hex("#e2a07a"), hillB: hex("#7e5670"), hillBl: hex("#d0906a"),
  hillC: hex("#3e3e4a"), hillCl: hex("#a8884e"), meadow: hex("#2e3a26"), meadowLit: hex("#6a7430"), meadowHi: hex("#c0a040"),
  st0: hex("#2a2434"), st1: hex("#4a4052"), st2: hex("#76626a"), st3: hex("#b08872"), st4: hex("#f0c48a"),
  ivy0: hex("#132015"), ivy1: hex("#24381c"), ivy2: hex("#47622a"), ivy3: hex("#9aa84a"),
  bark0: hex("#140f12"), bark1: hex("#2a1e1e"), bark2: hex("#4a3426"), bark3: hex("#a87a4a"),
  leaf0: hex("#0e1610"), leaf1: hex("#1c2a18"), leaf2: hex("#3c4e22"), leaf3: hex("#b0a040"),
  g0: hex("#1a2414"), g1: hex("#2c3c1c"), g2: hex("#4c6224"), g3: hex("#8e9a34"), g4: hex("#e0c050"),
  pave0: hex("#3a2e2c"), pave1: hex("#5e4a44"), pave2: hex("#8e6e5a"), pave3: hex("#d6a676"),
  fRed: hex("#e04a4a"), fYel: hex("#ffd84a"), fWhite: hex("#fff0e0"), fBlue: hex("#7a9aff"), fPink: hex("#ff8ab0"),
  pollen: hex("#ffe9a0"), bfly: [hex("#ff9a3a"), hex("#ffe070"), hex("#9ad0ff"), hex("#ffffff")],
};

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r, mix, get }) {
    const B = (x, y) => bay(x & 255, y & 255);
    // blend colour c over what's there by k (0..1), in dithered quarter steps
    const blend = (x, y, c, k) => { if (k <= 0) return; const q = Math.min(4, Math.floor(Math.min(1, k) * 4 + B(x, y))) / 4; if (q > 0) put(x, y, q >= 1 ? c : mix(get(x, y), c, q)); };
    // pick from a ramp by v (0..1) with dithering between neighbours
    const ramp = (x, y, cols, v) => { v = Math.max(0, Math.min(0.999, v)) * (cols.length - 1); const i = Math.floor(v); put(x, y, (v - i) > B(x, y) ? cols[Math.min(cols.length - 1, i + 1)] : cols[i]); };
    const SX = Math.round(W * 0.6), SY = 128, HOR = 140;
    this.sun = { x: SX, y: SY };

    // 1. golden-hour sky: deep violet at the top (quiet behind the HP bars) to gold at the horizon
    const sky = [C.sky0, C.sky1, C.sky2, C.sky3, C.sky4, C.sky5, C.sky6];
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - SX) * 0.6, y - SY);
      const v = Math.pow(Math.max(0, y - 10) / (HOR - 10), 1.35) * 0.85 + Math.max(0, 1 - d / 150) * 0.3;
      ramp(x, y, sky, v);
    }
    // 2. clouds lit from below by the low sun
    const cloud = (cx, cy, w, h, n) => {
      const blobs = [];
      for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * 2 - 1; blobs.push({ x: cx + u * w * 0.5 + (r() - 0.5) * w * 0.15, y: cy - (1 - u * u) * h * 0.55 * (0.6 + r() * 0.6), rx: w * (0.12 + r() * 0.12), ry: h * (0.35 + r() * 0.25) }); }
      const x0 = Math.floor(cx - w * 0.8), x1 = Math.ceil(cx + w * 0.8), y0 = Math.floor(cy - h * 1.5), y1 = Math.ceil(cy + h * 0.6);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        let dens = 0, lo = 0;
        for (const b of blobs) { const q = 1 - Math.hypot((x - b.x) / b.rx, (y - b.y) / b.ry); if (q > dens) { dens = q; lo = (y - b.y) / b.ry; } }
        if (y > cy + h * 0.15) dens -= (y - cy - h * 0.15) / (h * 0.3);   // flat-ish bottoms
        if (dens <= 0) continue;
        if (dens < 0.12 && dens * 8 < B(x, y)) continue;
        const toSun = Math.max(0, 1 - Math.abs(x - SX) / (W * 0.6));
        const v = 0.15 + 0.45 * Math.max(0, lo) + 0.25 * toSun + (dens < 0.18 ? 0.25 : 0) + 0.1 * (hash(x >> 2, y >> 2) - 0.5);
        ramp(x, y, [C.cl0, C.cl1, C.cl2, C.cl3, C.cl4], v * (0.55 + 0.45 * (y / HOR)));
      }
    };
    const nCl = Math.max(3, Math.round(W / 150));
    for (let i = 0; i < nCl; i++) {
      const cx = (i + 0.2 + r() * 0.6) * W / nCl, cy = 52 + r() * 40;
      cloud(cx, cy, 70 + r() * 70, 18 + r() * 14, 6 + Math.floor(r() * 4));
    }
    cloud(W * 0.08, 98, 60, 10, 5); cloud(W * 0.9, 104, 80, 10, 6);   // low streaks near the horizon

    // 3. the sun: a white-gold disc with a dithered halo
    for (let y = SY - 70; y < SY + 70; y++) for (let x = SX - 90; x < SX + 90; x++) {
      const d = Math.hypot(x - SX, y - SY);
      if (d < 15) put(x, y, d < 13 ? C.sun : C.sunHalo);
      else blend(x, y, C.sunHalo, Math.pow(Math.max(0, 1 - d / 70), 2) * 0.8);
    }

    // 4. far hills, hazy pink, rim-lit; an old tower and a broken aqueduct on them
    const ridge = (base, amp, fr, ph) => (x) => base - amp * (0.5 + 0.3 * Math.sin(x * fr + ph) + 0.15 * Math.sin(x * fr * 2.7 + ph * 2) + 0.05 * Math.sin(x * fr * 7 + ph));
    const hill = (f, col, lit, rimW) => {
      for (let x = 0; x < W; x++) { const top = Math.round(f(x)); for (let y = top; y < FLOOR; y++) put(x, y, y - top < rimW && (y - top < rimW - 1 || B(x, y) > 0.5) ? lit : col); }
    };
    const fA = ridge(HOR + 2, 28, 0.011, r() * 6);
    hill(fA, C.hillA, C.hillAl, 2);
    // the tower: a broken keep with window slits
    const tx = Math.round(W * 0.24), tyb = Math.round(fA(tx)) + 2;
    for (let y = tyb - 40; y < tyb; y++) for (let k = -6; k <= 6; k++) {
      const top = tyb - 40 + (k > 2 ? (k - 2) * 3 : 0) + (k < -3 ? 4 : 0);   // a ragged broken top
      if (y < top) continue;
      const win = (Math.abs(k) < 1 && ((y - tyb + 32) % 12 + 12) % 12 < 4 && y < tyb - 8);
      put(tx + k, y, win ? C.hillAl : k > 3 ? C.hillAl : mix(C.hillA, C.hillB, 0.35));
    }
    // the aqueduct: a row of arches, a gap where it fell
    const ax0 = Math.round(W * 0.7), ax1 = Math.round(W * 0.96), ay = Math.round(fA(ax0)) - 14, span = 13;
    for (let x = ax0; x < ax1; x++) {
      const u = ((x - ax0) % span) - span / 2 + 0.5, broken = x > ax0 + (ax1 - ax0) * 0.42 && x < ax0 + (ax1 - ax0) * 0.6;
      const archTop = ay + 9 - Math.sqrt(Math.max(0, 20 - u * u));
      for (let y = ay; y < fA(x) + 2; y++) {
        if (broken && y < ay + 12 + hash(x, 3) * 8) continue;
        if (Math.abs(u) < 4.5 && y > archTop && y > ay + 3) continue;
        put(x, y, y < ay + 1 || (Math.abs(u) > 4.5 && u > 0) ? C.hillAl : mix(C.hillA, C.hillB, 0.4));
      }
    }
    const fB = ridge(HOR + 14, 26, 0.017, r() * 6);
    hill(fB, C.hillB, C.hillBl, 2);
    // 5. sunbeams fanning out from the sun over the sky and far hills
    const rays = Array.from({ length: 9 }, (_, i) => [-Math.PI + 0.25 + (i + r() * 0.6) * (Math.PI - 0.5) / 9, 0.02 + r() * 0.05]);
    for (let y = 30; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const a = Math.atan2(y - SY, x - SX), d = Math.hypot(x - SX, y - SY);
      if (d < 18) continue;
      let beam = 0;
      for (const [ra, rw] of rays) beam = Math.max(beam, Math.exp(-(((a - ra) / rw) ** 2)));
      blend(x, y, C.sky6, beam * 0.4 * Math.max(0, 1 - d / (W * 0.5)));
    }
    // 6. nearer hills in shadow (backlit) with a gold rim and a meadow running to the floor
    const fC = ridge(FLOOR - 16, 22, 0.009, r() * 6);
    for (let x = 0; x < W; x++) {
      const top = Math.round(fC(x));
      for (let y = top; y < FLOOR; y++) {
        const u = (y - top), v = 1 - Math.min(1, u / 30);
        if (u < 1) put(x, y, C.meadowHi);
        else if (u < 3) dith(x, y, C.meadowLit, C.meadowHi, 0.4);
        else dith(x, y, C.meadow, C.meadowLit, v * 0.6 + 0.15 * Math.sin(x * 0.05 + y * 0.3));
      }
    }
    // far bushes and little trees on the near hill, backlit
    for (let i = 0; i < W / 30; i++) {
      const bx = r() * W, by = fC(bx) + 1 + r() * 6, s = 2 + r() * 5, tree = r() < 0.3;
      if (tree) for (let y = 0; y < s * 2; y++) put(bx, by - y, C.leaf1);
      const cy = by - (tree ? s * 2 : 0);
      for (let y = -s; y <= s * 0.4; y++) for (let k = -s * 1.3; k <= s * 1.3; k++) if ((k / 1.3) ** 2 + y * y < s * s) put(bx + k, cy + y, y < -s * 0.6 && k > -s * 0.2 ? C.meadowLit : C.leaf1);
    }

    // 7. middle-distance ruins: a colonnade (left) and a broken arch (right), ivy everywhere
    const LX = (x) => Math.sign(SX - x);   // which way the lit side faces
    const stoneCol = (x, y, side, u) => {   // u: -1..1 across, side: lit side sign
      const l = u * side;   // 1 = facing the sun
      const v = 0.25 + 0.35 * l + 0.12 * (hash(x >> 1, y >> 2) - 0.5) + (Math.abs(Math.sin(u * 5)) < 0.25 ? -0.15 : 0);
      ramp(x, y, [C.st0, C.st1, C.st2, C.st3, C.st4], v);
    };
    const ivy = (x0, y0, len, sway) => {   // a trailing strand of ivy, leaves on it
      for (let k = 0; k < len; k++) {
        const x = x0 + Math.sin(k * 0.15 + sway) * 2.5, y = y0 + k;
        put(x, y, C.ivy1);
        if (hash(x0 + k, sway) < 0.45) { const lx = x + (hash(k, x0) < 0.5 ? -1 : 1); put(lx, y, C.ivy2); put(lx, y - 1, hash(k, y0) < 0.4 ? C.ivy3 : C.ivy2); }
      }
    };
    const column = (cx, base, h, w, capital) => {
      const side = LX(cx), top = base - h;
      for (let y = Math.round(top); y < base; y++) {
        const jag = y < top + 4 ? Math.floor(hash(cx, y) * w * 0.8) : 0;   // broken top
        for (let k = -w; k <= w; k++) {
          if (y < top + 4 && (k + w) < jag) continue;
          stoneCol(Math.round(cx + k), y, side, k / w);
        }
      }
      if (capital) for (let y = Math.round(top) - 4; y < top; y++) for (let k = -w - 3; k <= w + 3; k++) stoneCol(Math.round(cx + k), y, side, y === Math.round(top) - 4 ? side : k / (w + 3) * 0.6);
      for (let y = base - 3; y < base + 1; y++) for (let k = -w - 2; k <= w + 2; k++) stoneCol(Math.round(cx + k), y, side, k / (w + 2) * 0.6);
      // ivy climbing from the bottom and draping from the top
      for (let i = 0; i < 3; i++) ivy(cx - w + r() * w * 2, top + r() * 6, 6 + r() * h * 0.6, r() * 9);
      for (let y = base - 1; y > base - h * (0.3 + r() * 0.4); y--) for (let k = -w; k <= w; k++) if (hash(k + cx, y) < 0.35 * (1 - (base - y) / h) + 0.1) put(cx + k, y, hash(y, k) < 0.25 ? C.ivy3 : hash(y, k) < 0.6 ? C.ivy2 : C.ivy1);
    };
    const cBase = FLOOR - 6;
    // the colonnade: four columns of differing heights, a lintel over two
    const colX = [0.15, 0.22, 0.29, 0.35].map((f) => Math.round(W * f + (r() - 0.5) * 6));
    const colH = [62, 78, 44, 26];
    colX.forEach((x, i) => column(x, cBase, colH[i], 5, i < 2));
    for (let x = colX[0] - 9; x < colX[1] + 14; x++) for (let y = cBase - 78 - 12; y < cBase - 78 - 4; y++) {
      if (x < colX[0] + 3 && y < cBase - 90 + 3) continue;
      stoneCol(x, y, 1, y < cBase - 89 ? 1 : 0.1);
    }
    ivy(colX[0] + 2, cBase - 86, 30, 1); ivy(colX[1] - 4, cBase - 86, 44, 4); ivy(colX[1] + 8, cBase - 86, 22, 7);
    // the arch (right of the sun): two piers and a half-collapsed semicircle
    const archC = Math.round(W * 0.8), archR = 26, pierW = 6, archBase = cBase + 2;
    for (const s of [-1, 1]) column(archC + s * archR, archBase, s < 0 ? 58 : 48, pierW, false);
    for (let a = Math.PI; a <= Math.PI * 1.62; a += 0.004) for (let rr = archR - pierW; rr <= archR + pierW; rr++) {
      const x = Math.round(archC + Math.cos(a) * rr), y = Math.round(archBase - 58 + Math.sin(a) * rr * 0.9 + 4);
      stoneCol(x, y, -1, (rr - archR) / pierW * -0.4 + (Math.abs(rr - archR) > pierW - 1 ? 0.5 : 0));
      if ((Math.round(a * 60) % 8) === 0 && Math.abs(rr - archR) < pierW - 1) put(x, y, C.st0);   // the voussoir joints
    }
    for (let i = 0; i < 5; i++) ivy(archC - archR + r() * archR, archBase - 80 + r() * 14, 10 + r() * 30, r() * 9);
    // tumbled blocks in the grass
    const block = (bx, by, w, h) => { for (let y = 0; y < h; y++) for (let k = 0; k < w; k++) put(bx + k, by - y, y === h - 1 ? C.st3 : k === w - 1 ? C.st1 : k < 2 ? C.st3 : C.st2); for (let k = 0; k < w; k++) if (hash(k, bx) < 0.5) put(bx + k, by - h, C.ivy2); };
    block(Math.round(W * 0.39), cBase + 1, 9, 6); block(Math.round(W * 0.405), cBase - 5, 6, 5); block(Math.round(W * 0.69), cBase + 2, 11, 5);

    // 8. haze over the bottom of the middle distance (golden air)
    for (let y = FLOOR - 40; y < FLOOR; y++) for (let x = 0; x < W; x++) blend(x, y, C.sky5, ((y - FLOOR + 40) / 40) * 0.28 * (0.7 + 0.3 * Math.sin(x * 0.02 + y * 0.2)));

    // 9. the floor: meadow in perspective, sunken flagstones down the middle
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x = 0; x < W; x++) {
        const n = hash(x >> 1, y) * 0.3 + 0.3 * Math.sin(x * 0.09 + y * 0.6) * Math.sin(x * 0.031 - y * 0.2);
        const sunlit = Math.max(0, 1 - Math.abs(x - SX) / (W * 0.45)) * (1 - t);
        ramp(x, y, [C.g0, C.g1, C.g2, C.g3], 0.35 + n + sunlit * 0.45 - t * 0.35);
      }
    }
    // flagstones: rows that widen toward the viewer, cracked, grass between
    for (let row = 0, y = FLOOR + 2; y < H; row++) {
      const t = (y - FLOOR) / (H - FLOOR), rh = Math.round(4 + t * 9), half = W * (0.11 + 0.17 * t);
      let x = W / 2 - half + (row % 2) * 6;
      while (x < W / 2 + half) {
        const sw = Math.round((12 + t * 22) * (0.7 + r() * 0.6)), missing = r() < 0.3 || (Math.abs(x - W / 2) > half * 0.6 && r() < 0.4);
        if (!missing) for (let yy = y; yy < Math.min(H, y + rh - 1); yy++) for (let xx = Math.round(x) + 1; xx < x + sw - 1; xx++) {
          const edge = Math.abs((xx - W / 2) / half);
          if (edge > 0.95 && hash(xx, yy) < 0.5) continue;
          const lit = yy === y ? 0.75 : yy === y + rh - 2 ? 0.1 : 0.4;
          const v = lit + 0.15 * (hash(xx >> 1, yy >> 1) - 0.5) + Math.max(0, 1 - Math.abs(xx - SX) / (W * 0.4)) * 0.2;
          ramp(xx, yy, [C.pave0, C.pave1, C.pave2, C.pave3], v);
          if (hash(xx, yy * 3) < 0.06 || (edge > 0.7 && hash(xx >> 1, yy) < 0.3)) put(xx, yy, hash(xx, yy) < 0.5 ? C.g2 : C.g3);   // moss and grass creeping over
        }
        x += sw;
      }
      y += rh;
    }
    // the grass lip along the floor line, lit gold
    for (let x = 0; x < W; x++) { put(x, FLOOR, C.g3); if (hash(x, 1) < 0.5) put(x, FLOOR - 1, C.g2); }
    // grass tufts and wildflowers (none right on the fighters' line in the middle)
    for (let i = 0; i < W / 2.2; i++) {
      const x = r() * W, y = FLOOR + (r() < 0.5 ? r() * 4 : r() * 44), h = 3 + r() * 6 * (1 + (y - FLOOR) / 40);
      if (Math.abs(x - W / 2) < W * (0.17 + 0.2 * (y - FLOOR) / 44) && y > FLOOR + 4 && r() < 0.7) continue;
      for (let k = 0; k < h; k++) { put(x + Math.round(k * 0.3), y - k, k > h - 2 ? C.g4 : k > h * 0.5 ? C.g3 : C.g2); put(x - Math.round(k * 0.35) + 2, y - k * 0.8, k > h - 2 ? C.g3 : C.g2); }
    }
    const fcols = [C.fRed, C.fYel, C.fWhite, C.fBlue, C.fPink];
    for (let i = 0; i < W / 4; i++) {
      const x = r() * W, y = FLOOR - 8 + r() * 52, c = fcols[Math.floor(r() * fcols.length)], near = y > FLOOR + 14;
      if (y < FLOOR && Math.abs(x - W / 2) < W * 0.3) continue;
      if (y > FLOOR + 4 && Math.abs(x - W / 2) < W * 0.2) continue;
      put(x, y + 1, C.g2); put(x, y + 2, C.g1); put(x, y, c);
      if (near) { put(x + 1, y, c); put(x - 1, y, c); put(x, y - 1, c); put(x, y + 1, C.fYel); }
    }

    // 10. framing: a huge broken column on the left, an old oak on the right
    const bigX = Math.max(14, Math.round(W * 0.03)), bigW = 18;
    for (let y = 0; y < FLOOR + 10; y++) {
      const lean = (FLOOR - y) * 0.06;
      for (let k = -bigW; k <= bigW; k++) {
        const u = k / bigW, x = Math.round(bigX + k + lean);
        const flute = Math.abs(Math.sin((u + 1) * 9)) < 0.35;
        const v = 0.12 + 0.45 * Math.max(0, u) * Math.sqrt(1 - u * u) * 1.6 - (flute ? 0.12 : 0) + 0.1 * (hash(x >> 1, y >> 2) - 0.5);
        ramp(x, y, [C.st0, C.st1, C.st2, C.st3, C.st4], v * 0.85);
        if (Math.abs(u) > 0.97) put(x, y, C.st0);
      }
      if (y % 47 === 20) for (let k = -bigW; k <= bigW; k++) put(bigX + k + lean, y, C.st0);   // drum joints
    }
    // heavy ivy over the big column
    for (let i = 0; i < 12; i++) ivy(bigX - bigW + r() * bigW * 2 + 6, -4 + r() * 60, 30 + r() * 110, r() * 9);
    for (let y = 0; y < FLOOR + 10; y++) for (let k = -bigW - 2; k <= bigW + 2; k++) {
      const x = Math.round(bigX + k + (FLOOR - y) * 0.06), m = 0.5 + 0.5 * Math.sin(y * 0.07 + k * 0.2) * Math.sin(y * 0.023 + 1);
      if (m > 0.62 + hash(x, y) * 0.4) put(x, y, hash(y, x) < 0.2 ? C.ivy3 : hash(x, y * 2) < 0.6 ? C.ivy2 : C.ivy1);
    }
    // the fallen capital at its foot
    for (let y = FLOOR - 10; y < FLOOR + 6; y++) for (let x = bigX + 6; x < bigX + 40; x++) {
      const u = (x - bigX - 6) / 34, top = FLOOR - 10 + Math.abs(u - 0.5) * 6;
      if (y < top) continue;
      ramp(x, y, [C.st0, C.st1, C.st2, C.st3], y < top + 2 ? 0.8 : 0.35 - (y - FLOOR) * 0.02 + 0.1 * hash(x >> 1, y));
    }
    // the oak: a twisted trunk on the right, its canopy hanging over the top-right
    const ox = W - Math.max(16, Math.round(W * 0.035));
    for (let y = 30; y < FLOOR + 8; y++) {
      const flare = y > FLOOR - 30 ? ((y - FLOOR + 30) / 30) ** 2 * 16 : 0, half = 11 + flare, c0 = ox + Math.sin(y * 0.03) * 5;
      for (let k = -half; k <= half; k++) {
        const u = (k + half) / (2 * half), x = Math.round(c0 + k);
        let v = 0.12 + 0.5 * Math.max(0, 0.35 - u) * 2.5 + 0.1 * (hash(x, y >> 2) - 0.5);
        if (Math.sin(k * 1.1 + y * 0.04) > 0.75) v -= 0.1;
        ramp(x, y, [C.bark0, C.bark1, C.bark2, C.bark3], v);
      }
    }
    // branches reaching left
    const branch = (x0, y0, x1, y1, w0) => { const n = Math.hypot(x1 - x0, y1 - y0); for (let s = 0; s <= n; s++) { const u = s / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * 3) * 4, w = w0 * (1 - u * 0.7); for (let k = -w; k <= w; k++) put(x, y + k, k < -w * 0.4 ? C.bark2 : C.bark1); } };
    branch(ox, 60, ox - 70, 30, 4); branch(ox - 4, 90, ox - 46, 70, 3); branch(ox, 40, ox - 30, 8, 3);
    // canopy: leaf clusters with a gold rim on their sun side
    for (let i = 0; i < 26; i++) {
      const cx = ox - r() * 110 + 20, cy = -4 + r() * 50 * (1 - Math.max(0, ox - cx - 60) / 80), s = 9 + r() * 12;
      for (let y = -s; y <= s; y++) for (let k = -s * 1.3; k <= s * 1.3; k++) {
        const d = Math.hypot(k / 1.3, y) / s + (hash(cx + k, cy + y) - 0.5) * 0.35;
        if (d > 1) continue;
        const lit = (y > s * 0.3 && k < 0 && d > 0.6) ? 2 : d > 0.75 && y > 0 ? 1 : 0;   // rim lit from the low sun (below-left)
        put(cx + k, cy + y, lit === 2 ? (hash(k, y) < 0.5 ? C.leaf3 : C.leaf2) : lit ? C.leaf1 : C.leaf0);
      }
    }
    // a few leaves hanging over the colonnade side too (top-left corner)
    for (let i = 0; i < 9; i++) {
      const cx = r() * W * 0.18, cy = -6 + r() * 14, s = 6 + r() * 9;
      for (let y = -s; y <= s; y++) for (let k = -s * 1.3; k <= s * 1.3; k++) {
        const d = Math.hypot(k / 1.3, y) / s + (hash(cx + k, cy + y) - 0.5) * 0.4;
        if (d <= 1) put(cx + k, cy + y, d > 0.75 && y > 0 && k > 0 ? C.leaf2 : C.leaf0);
      }
    }

    // ---- light-layer data ----
    this.blades = [];
    for (const [a, b] of [[0, W * 0.16], [W * 0.84, W]]) for (let i = 0; i < (b - a) / 2.2; i++) {
      const x = a + r() * (b - a), y = H - r() * 26, h = 10 + r() * 22 * (1 - (H - y) / 40);
      this.blades.push({ x, y, h, p: r() * 6, c: r() < 0.25 ? C.g4 : r() < 0.6 ? C.g3 : C.g2, seed: r() < 0.15 });
    }
    this.flies = Array.from({ length: Math.max(3, Math.round(W / 120)) }, () => ({ x: r() * W, y: 70 + r() * 90, p: r() * 9, s: 0.5 + r() * 0.6, c: C.bfly[Math.floor(r() * C.bfly.length)] }));
    this.pollen = Array.from({ length: Math.round(W / 9) }, () => ({ x: r() * W, y: 40 + r() * (FLOOR - 30), v: 1 + r() * 3, p: r() * 6, s: r() }));
  }

  animate({ t, dt, W, H, FLOOR, px }) {
    // pollen drifting through the sunbeams; brighter near the sun
    for (const m of this.pollen) {
      m.x += (3 + m.s * 3) * dt; m.y -= m.v * dt * 0.4;
      if (m.x > W + 2) { m.x = -2; } if (m.y < 30) m.y = FLOOR - 4;
      const near = Math.max(0, 1 - Math.hypot(m.x - this.sun.x, m.y - this.sun.y) / 220);
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + m.p);
      px(m.x + Math.sin(t * 0.8 + m.p) * 4, m.y + Math.sin(t * 1.3 + m.p) * 2, C.pollen, 0.25 + 0.55 * near * tw + 0.15 * tw);
    }
    // butterflies: a flutter of two wings, wandering
    for (const f of this.flies) {
      const x = f.x + Math.sin(t * 0.23 * f.s + f.p) * 60 + Math.sin(t * 0.9 + f.p) * 6, y = f.y + Math.sin(t * 0.37 * f.s + f.p * 2) * 20 + Math.sin(t * 4 + f.p) * 1.5;
      const wx = ((x % W) + W) % W, open = Math.sin(t * 14 + f.p) > 0;
      px(wx, y, C.bark0);
      if (open) { px(wx - 2, y - 1, f.c, 1, 2); px(wx + 1, y - 1, f.c, 1, 2); px(wx - 1, y + 1, f.c); px(wx + 1, y + 1, f.c); }
      else { px(wx - 1, y - 2, f.c); px(wx, y - 2, f.c); px(wx - 1, y - 1, f.c); }
    }
    // tall grass swaying in the wind at both edges (in front of everything)
    const gust = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 1.9) * 0.2;
    for (const b of this.blades) {
      const sway = (gust + 0.4 * Math.sin(t * 2.2 + b.p + b.x * 0.05)) * 0.12;
      for (let k = 0; k < b.h; k++) {
        const u = k / b.h, x = b.x + sway * k * u * 1.8 + Math.sin(u * 2 + b.p) * 1.2;
        px(x, b.y - k, k > b.h - 3 ? b.c : u < 0.4 ? C.g1 : C.g2);
      }
      if (b.seed) { const x = b.x + sway * b.h * 1.8; px(x - 1, b.y - b.h - 1, C.g4, 1, 2); }
    }
  }
}
