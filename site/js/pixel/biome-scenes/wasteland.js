// Module 7: the Scorched Wastes. The end of a city: a burning orange-red sky
// with a swollen sun sinking into the haze, two layers of ruined skyline
// (towers with their floors showing, a snapped highway overpass), black smoke
// columns leaning in the wind, a sagging power line, rusted cars and a dead
// machine head in the rubble, a broken wall and a toppled streetlight framing
// the sides, and a cracked road in front with faded lane marks, wires, sand
// drifts and skulls. The light layer flickers the fires on the skyline, sends
// embers up and ash down, rolls smoke off the column tops and blinks a warning
// light.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky0: hex("#0e0406"), sky1: hex("#22080a"), sky2: hex("#4a130d"), sky3: hex("#842a12"), sky4: hex("#c24c18"), sky5: hex("#e8792a"), sky6: hex("#f6a646"),
  sun: hex("#ffe2a0"), sunMid: hex("#ffc066"), sunRim: hex("#f79a40"),
  far: hex("#9a3a18"), farLit: hex("#b04a1e"), farDark: hex("#7a2c14"), farWin: hex("#c45a24"),
  mid: hex("#3c120c"), midLit: hex("#5e2212"), midDark: hex("#260a08"), midWin: hex("#140504"),
  fire: hex("#ff9a2a"), fireHi: hex("#ffe08a"), fireDeep: hex("#d4441a"),
  smoke: hex("#1c0a08"), smoke2: hex("#2c120c"), smokeLit: hex("#6a2a14"), smokeHi: hex("#94401a"),
  plain: hex("#2a120c"), plainLit: hex("#3e1c10"), plainDark: hex("#1a0a08"),
  rust: hex("#5a2414"), rustLit: hex("#8a3c1a"), rustHi: hex("#b8602a"), rustDark: hex("#2a0e08"), glassDk: hex("#120608"), metal: hex("#3a2a26"), metalLit: hex("#6a4a3a"),
  concrete: hex("#2a1c18"), concLit: hex("#4e342a"), concHi: hex("#74503a"), concDark: hex("#170e0c"), rebar: hex("#5a3424"),
  road: hex("#201612"), roadLit: hex("#36261e"), roadGlow: hex("#4a2a1a"), lane: hex("#a8803a"), laneDim: hex("#6e5230"), crack: hex("#0a0505"), crackLit: hex("#3e2418"),
  sand: hex("#4a2c1a"), sandLit: hex("#6a4024"), bone: hex("#d8c8a8"), boneDk: hex("#8a7a64"), wire: hex("#0e0808"), copper: hex("#b8682a"),
  ember: hex("#ffb040"), emberHi: hex("#fff0a0"), ash: hex("#7a6a66"), red: hex("#ff3a2a"), eye: hex("#ff4a2a"),
};

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r, mix, get }) {
    const HZ = 156;   // where the far city meets the rubble plain
    const rect = (x0, y0, w, h, c) => { for (let y = Math.round(y0); y < y0 + h; y++) for (let x = Math.round(x0); x < x0 + w; x++) put(x, y, c); };

    // 1. the burning sky: dark at the top (for the HP bars), orange to the horizon
    const stops = [[0, C.sky0], [0.16, C.sky1], [0.36, C.sky2], [0.58, C.sky3], [0.76, C.sky4], [0.9, C.sky5], [1, C.sky6]];
    for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
      const t = y / HZ + Math.sin(x * 0.02 + y * 0.05) * 0.012;
      let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      const [t0, a] = stops[i], [t1, b] = stops[i + 1];
      dith(x, y, a, b, Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
    }
    // streaky cloud bands lit from below
    for (let i = 0; i < 9; i++) {
      const cy = 40 + r() * 70, cx = r() * W, w = 40 + r() * 120, h = 1.5 + r() * 2.5;
      for (let y = Math.round(cy - h); y <= cy + h; y++) for (let x = Math.round(cx - w); x <= cx + w; x++) {
        const k = 1 - ((x - cx) / w) ** 2 - ((y - cy) / h) ** 2 + Math.sin(x * 0.3) * 0.1;
        if (k > bay(x, y) * 0.6) put(x, y, y > cy + h * 0.3 ? mix(get(x, y), C.sky5, 0.25) : mix(get(x, y), C.sky1, 0.45));
      }
    }
    // 2. a swollen sun low in the haze, with a dithered corona
    const sx = Math.round(W * 0.6), sy = 118, sr = 20;
    for (let y = sy - 60; y < HZ; y++) for (let x = sx - 80; x < sx + 80; x++) {
      const d = Math.hypot(x - sx, y - sy);
      if (d <= sr) { put(x, y, d > sr - 1.5 ? C.sunRim : d < sr * 0.6 && y < sy ? C.sun : (y + Math.round(Math.sin(x * 0.3) * 2)) % 6 === 0 && y > sy ? C.sunRim : C.sunMid); continue; }
      const k = Math.max(0, 1 - (d - sr) / 60) ** 2 * 0.8;
      if (k > bay(x, y) + 0.05) put(x, y, k > 0.45 ? C.sunRim : C.sky5);
    }

    // 3. the far skyline: hazy towers, half of them broken off, windows showing sky
    const tower = (x, base, w, h, pal, win, broken) => {
      const top = base - h, slant = broken ? (r() - 0.5) * 1.4 : 0, notch = broken ? 3 + r() * h * 0.25 : 0, skel = broken && r() < 0.5;
      for (let y = Math.round(top - Math.abs(slant) * w); y < base; y++) for (let xx = 0; xx < w; xx++) {
        const cut = top + (slant > 0 ? xx : w - xx) * Math.abs(slant) * (broken ? 1 : 0) + (xx > w * 0.3 && xx < w * 0.6 ? notch : 0);
        if (y < cut) continue;
        const floorLine = (y - top) % 5 === 0, edge = xx === 0;
        let c = edge ? pal.lit : xx === w - 1 ? pal.dark : pal.base;
        if (win && !floorLine && xx > 1 && xx < w - 2 && (xx % 3) !== 1 && (y - top) % 5 > 1) c = skel && y < cut + h * 0.3 ? null : pal.win;
        if (skel && y < cut + h * 0.3 && !floorLine && xx > 0 && xx < w - 1 && (xx % 4)) c = null;   // the facade has fallen away, floors stick out
        if (c) put(x + xx, y, c);
      }
      if (!broken && r() < 0.4) for (let k = 0; k < 6 + r() * 12; k++) put(x + Math.round(w / 2), top - k, pal.dark);   // an antenna
      return top;
    };
    const farPal = { base: C.far, lit: C.farLit, dark: C.farDark, win: C.farWin };
    for (let x = -6; x < W; x += 10 + r() * 22) tower(Math.round(x), HZ + 2, 8 + Math.round(r() * 14), 18 + r() * 46, farPal, true, r() < 0.55);
    // haze sitting over the far city
    for (let y = HZ - 30; y < HZ + 2; y++) for (let x = 0; x < W; x++) {
      const k = ((y - (HZ - 30)) / 32) ** 1.5 * 0.7;
      if (k > bay(x, y) + 0.08) put(x, y, C.sky5);
    }

    // 4. smoke columns rising from the city and leaning with the wind
    this.plumes = [];
    const plume = (bx, h, w0, lean) => {
      const steps = Math.round(h);
      for (let s = 0; s < steps; s++) {
        const u = s / steps, cx = bx + u * u * lean + Math.sin(u * 5 + bx) * 2, cy = HZ - 6 - s, rad = w0 * (0.45 + u * 1.9) + Math.sin(s * 0.35 + bx) * 2 + Math.sin(s * 0.13) * 2;
        for (let x = Math.round(cx - rad); x <= cx + rad; x++) {
          const k = 1 - Math.abs(x - cx) / rad, lumpy = 0.14 * Math.sin(x * 0.35 + s * 0.3) + 0.12 * Math.sin(s * 0.7 - x * 0.25) + 0.1 * Math.sin((x - cx) * 0.9 + s * 0.5);
          if (k + lumpy < bay(x, cy) * 0.5) continue;
          const lit = (x - cx) / rad + lumpy * 0.5 < -0.55, low = u < 0.1, curl = false;
          put(x, cy, low ? C.smokeLit : lit ? (u < 0.35 ? C.smokeLit : C.smoke2) : (k + lumpy) < 0.3 && u > 0.5 ? mix(C.smoke, C.sky2, 0.4) : curl ? C.smoke2 : C.smoke);
        }
      }
      this.plumes.push({ x: bx + lean, y: HZ - 6 - steps, w: w0 * 2 });
    };
    plume(W * 0.2, 125, 9, 80);
    plume(W * 0.76, 105, 8, 70);
    if (W > 600) plume(W * 0.47, 70, 5, 45);

    // 5. the near skyline and the snapped overpass, darker, with fires in the windows
    this.fires = [];
    const midPal = { base: C.mid, lit: C.midLit, dark: C.midDark, win: C.midWin };
    for (let x = -10; x < W; x += 16 + r() * 40) {
      const side = Math.min(x, W - x) / W, h = (side < 0.25 ? 30 + r() * 45 : 12 + r() * 26), w = 12 + Math.round(r() * 18);
      const top = tower(Math.round(x), HZ + 6, w, h, midPal, true, r() < 0.7);
      if (r() < 0.35) { const fx = Math.round(x + 2 + r() * (w - 4)), fy = Math.round(top + 6 + r() * h * 0.5); this.fires.push({ x: fx, y: fy, s: 1 + r() }); }
      // bent rebar sticking out of broken tops
      for (let k = 0; k < 3; k++) { let rx = x + r() * w, ry = top + 2; for (let j = 0; j < 4 + r() * 6; j++) { put(rx, ry, C.rebar); rx += r() - 0.3; ry -= 1; } }
    }
    // the overpass: a deck on pillars, snapped in the middle with the ends sagging
    const oy = HZ - 30, gap0 = W * 0.42, gap1 = W * 0.56;
    for (let x = 0; x < W; x++) {
      if (x > gap0 && x < gap1) continue;
      const sag = x <= gap0 ? Math.max(0, (x - (gap0 - 40)) / 40) ** 2 * 10 : Math.max(0, ((gap1 + 30) - x) / 30) ** 2 * 7;
      for (let k = 0; k < 6; k++) put(x, Math.round(oy + sag + k), k === 0 ? C.midLit : k === 1 ? C.mid : k > 4 ? C.midDark : C.mid);
      if (x % 4 === 0) put(x, Math.round(oy + sag - 1), C.midDark);   // railing posts
      if (x % 4 === 0 && x % 8 === 0) put(x, Math.round(oy + sag - 2), C.midDark);
    }
    for (let i = 0; i < 12; i++) { const ex = r() < 0.5 ? gap0 : gap1, d = ex === gap0 ? 1 : -1; let rx = ex, ry = oy + (ex === gap0 ? 10 : 7) + r() * 5; for (let j = 0; j < 4 + r() * 10; j++) { put(Math.round(rx), Math.round(ry), C.rebar); rx += d * r() * 0.7; ry += 1; } }
    for (const px of [0.12, 0.3, 0.68, 0.88]) { const x0 = Math.round(W * px); rect(x0, oy + 6, 5, HZ + 4 - oy - 6, C.midDark); rect(x0, oy + 6, 1, HZ + 4 - oy - 6, C.midLit); }

    // 6. the rubble plain between the city and the road
    for (let y = HZ; y < FLOOR; y++) {
      const t = (y - HZ) / (FLOOR - HZ);
      for (let x = 0; x < W; x++) {
        if (get(x, y)[0] < 70 && y < HZ + 6 && get(x, y)[0] > 30) continue;   // keep the bases of the near towers
        const n = Math.sin(x * 0.17 + y * 0.6) + Math.sin(x * 0.041 - y * 0.3);
        dith(x, y, t < 0.15 ? C.plainLit : C.plain, n > 1.1 ? C.plainLit : C.plainDark, t < 0.15 ? 0.3 : 0.2 + t * 0.4);
      }
    }
    for (let i = 0; i < W / 6; i++) {   // rubble lumps catching the sky's glow on top
      const x = r() * W, y = HZ + 3 + r() * (FLOOR - HZ - 6), w = 1 + r() * 4, h = 1 + r() * 2.5;
      for (let yy = 0; yy < h; yy++) for (let xx = -w; xx <= w * (1 - yy / h); xx++) put(x + xx, y - yy, yy === Math.floor(h - 0.01) ? C.concLit : C.concrete);
    }
    // a power line on leaning pylons, wires sagging between them
    const pylons = [W * 0.08, W * 0.36, W * 0.66, W * 0.95].map((x, i) => ({ x: Math.round(x), base: HZ + 4 + i % 2 * 3, h: 52 - i % 2 * 6, lean: [0.05, -0.1, 0.18, -0.04][i] }));
    for (const p of pylons) {
      for (let y = 0; y < p.h; y++) {
        const half = 1 + (p.h - y) * 0.08, cx = p.x + y * p.lean;
        put(Math.round(cx - half), p.base - y, C.midDark); put(Math.round(cx + half), p.base - y, C.midDark);
        if (y % 5 === 0) for (let k = -half; k <= half; k++) put(Math.round(cx + k), p.base - y, C.midDark);
        if ((y % 10) < 5) put(Math.round(cx - half + (y % 5) * half * 0.4), p.base - y, C.midDark);
      }
      p.tx = Math.round(p.x + p.h * p.lean); p.ty = p.base - p.h;
      for (let k = -6; k <= 6; k++) put(p.tx + k, p.ty + 3, C.midDark);
    }
    this.warn = pylons.map((p) => ({ x: p.tx, y: p.ty - 1 }));
    for (let i = 0; i < pylons.length - 1; i++) {
      const a = pylons[i], b = pylons[i + 1];
      for (const off of [-5, 5]) {
        if (i === 1 && off > 0) continue;   // one wire snapped
        for (let x = a.tx + off; x < b.tx + off; x++) { const u = (x - a.tx - off) / (b.tx - a.tx), y = a.ty + 3 + (b.ty - a.ty) * u + Math.sin(u * Math.PI) * 14; put(x, Math.round(y), C.wire); }
      }
    }
    { const a = pylons[1]; let x = a.tx + 5, y = a.ty + 3; for (let k = 0; k < 38; k++) { put(Math.round(x), Math.round(y), C.wire); x += 0.4 + k * 0.01; y += 1; } this.spark = { x: Math.round(x), y: Math.round(y) }; }

    // 7. rusted cars and a dead machine in the middle distance
    const car = (x, base, s, flip, wreck) => {
      const L = Math.round(34 * s), bh = Math.round(7 * s), ch = Math.round(6 * s);
      for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < L; xx++) {
        const round = (yy === 0 && (xx < 2 || xx > L - 3)) || (yy === bh - 1 && (xx < 1 || xx > L - 2));
        if (round) continue;
        const rust = Math.sin(xx * 0.9 + yy * 1.7 + x) + Math.sin(xx * 0.31) > 1.1;
        put(x + (flip ? L - xx : xx), base - bh + yy, yy === 0 ? C.rustHi : yy === 1 ? C.rustLit : rust ? C.rustDark : yy > bh - 3 ? C.rustDark : C.rust);
      }
      const c0 = Math.round(L * 0.28), c1 = Math.round(L * 0.72);
      for (let yy = 0; yy < ch; yy++) for (let xx = c0 + Math.round((ch - yy) * 0.8); xx < c1 - Math.round((ch - yy) * 0.5); xx++) {
        const glass = yy > 0 && xx > c0 + (ch - yy) * 0.8 + 1 && xx < c1 - (ch - yy) * 0.5 - 1 && xx !== Math.round((c0 + c1) / 2);
        put(x + (flip ? L - xx : xx), base - bh - ch + yy, yy === 0 ? C.rustLit : glass ? (wreck && xx % 3 === 0 ? C.sky3 : C.glassDk) : C.rust);
      }
      for (const wx of [Math.round(L * 0.2), Math.round(L * 0.8)]) {   // wheels (or bare rims)
        const wr = Math.max(2, Math.round(3 * s));
        for (let yy = -wr; yy <= wr; yy++) for (let xx = -wr; xx <= wr; xx++) if (xx * xx + yy * yy <= wr * wr) put(x + (flip ? L - wx : wx) + xx, base - 1 + yy - (wreck ? 0 : 1), xx * xx + yy * yy < 2 ? C.metalLit : C.midDark);
      }
    };
    car(Math.round(W * 0.2), HZ + 14, 1.05, false, true);
    car(Math.round(W * 0.68), HZ + 16, 1.15, true, false);
    if (W > 800) car(Math.round(W * 0.42), HZ + 10, 0.75, false, true);
    // a toppled machine head half sunk in the rubble, one eye still glowing now and then
    const mhx = Math.round(W * 0.56), mhy = HZ + 13, mr = 15;
    for (let yy = -mr; yy <= 0; yy++) for (let xx = -mr - 4; xx <= mr + 4; xx++) {
      const e = (xx / (mr + 4)) ** 2 + (yy / mr) ** 2; if (e > 1) continue;
      const l = (xx * 0.6 - yy * 0.4) / mr, plate = (xx + 40) % 9 === 0 || yy === -Math.round(mr * 0.45);
      put(mhx + xx, mhy + yy, plate ? C.rustDark : l < -0.4 ? C.rustLit : l > 0.3 ? C.rustDark : C.rust);
    }
    for (let yy = -6; yy <= -3; yy++) for (let xx = -11; xx <= 1; xx++) put(mhx + xx, mhy + yy, C.midDark);   // the visor slot
    this.eye = { x: mhx - 7, y: mhy - 5 };
    for (let k = 0; k < 14; k++) put(mhx + mr - 2 + Math.round(k * 0.4), mhy - mr + 4 - k, C.metal);   // a bent antenna
    for (let i = 0; i < 5; i++) { let x = mhx - mr + r() * mr * 2, y = mhy; for (let k = 0; k < 10; k++) { put(Math.round(x), y, k % 3 ? C.wire : C.copper); x += (r() - 0.5) * 2; y += r() < 0.4 ? 1 : 0; } }   // spilled cables

    // 8. the road in front: cracked asphalt in perspective, lit orange at the far edge
    const vx = W / 2;
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x = 0; x < W; x++) {
        const n = Math.sin(x * 0.23 + y * 1.1) * 0.5 + Math.sin(x * 0.07 - y * 0.5) * 0.5;
        if (y === FLOOR) { put(x, y, (x * 5) % 7 ? C.concLit : C.concrete); continue; }   // the kerb
        if (t < 0.16) { dith(x, y, C.roadGlow, C.roadLit, t / 0.16); continue; }
        dith(x, y, C.roadLit, C.road, Math.min(1, (t - 0.16) * 1.5 + n * 0.2));
        // lane marks: dashes running toward the vanishing point, faded and broken
        for (const o of [-1, 0, 1]) {
          const lx = vx + o * W * 0.33 * (0.55 + t * 0.9), dep = 1 / (t + 0.25);
          if (Math.abs(x - lx) < 0.8 + t * 2.4 && (Math.floor(dep * 1.6) % 2 === 0) && Math.sin(x * 1.7 + y * 3.1) > -0.6) put(x, y, o === 0 ? C.lane : C.laneDim);
        }
      }
    }
    // cracks: forking dark lines with a lit lip
    for (let i = 0; i < W / 40; i++) {
      let x = r() * W, y = FLOOR + 3 + r() * (H - FLOOR - 4), a = (r() - 0.5) * 1.2;
      const n = 14 + r() * 30;
      for (let s = 0; s < n; s++) {
        put(x, y, C.crack); put(x, y - 1, C.crackLit);
        if (r() < 0.07) { let bx = x, by = y, ba = a + (r() - 0.5) * 2; for (let k = 0; k < 6 + r() * 8; k++) { put(bx, by, C.crack); bx += Math.cos(ba); by += Math.sin(ba) * 0.5; } }
        x += Math.cos(a); y += Math.sin(a) * 0.45; a += (r() - 0.5) * 0.7;
      }
    }
    // sand blown over the road edges, more at the sides
    for (let y = FLOOR + 1; y < H; y++) for (let x = 0; x < W; x++) {
      const side = Math.min(x, W - x) / W, k = (0.3 - side) * 3 + Math.sin(x * 0.06 + y * 0.3) * 0.3 + Math.sin(x * 0.019) * 0.3 - 0.2;
      if (k > bay(x, y)) put(x, y, k > 0.7 && (x + y) % 3 ? C.sandLit : C.sand);
    }
    // debris: skulls, wires, chunks of concrete, a bent sign
    const skull = (x, y) => {
      const S = ["0110", "1111", "1011", "0110"];
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) if (S[yy][xx] === "1") put(x + xx, y + yy - 4, yy === 0 || xx === 0 ? C.bone : C.boneDk);
      put(x + 1, y - 2, C.crack); put(x + 3, y - 2, C.crack);
    };
    for (let i = 0; i < W / 110 + 2; i++) { const x = r() * W; if (Math.abs(x - W / 2) < W * 0.15) continue; skull(Math.round(x), Math.round(FLOOR + 8 + r() * 30)); }
    for (let i = 0; i < W / 120 + 2; i++) {
      let x = r() * W, y = FLOOR + 4 + r() * 36, a = r() * 6;
      for (let k = 0; k < 20 + r() * 30; k++) { put(Math.round(x), Math.round(y), k % 9 === 0 ? C.copper : C.wire); x += Math.cos(a); y += Math.sin(a) * 0.35; a += (r() - 0.5) * 0.6; }
    }
    for (let i = 0; i < W / 25; i++) {
      const x = r() * W, y = FLOOR + 3 + r() * (H - FLOOR - 4), w = 1 + r() * 3 * (1 + (y - FLOOR) / 30), h = 1 + r() * 2;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) put(x + xx, y - yy, yy === Math.ceil(h) - 1 ? C.concLit : C.concrete);
    }

    // 9. framing: a broken concrete wall with rebar on the left, a toppled streetlight and a burnt-out car on the right
    const wallW = Math.max(26, Math.min(56, W * 0.06));
    for (let x = 0; x < wallW; x++) {
      const top = 40 + Math.abs(Math.sin(x * 0.5)) * 10 + (x / wallW) ** 2 * 80 + (r() < 0.2 ? r() * 6 : 0);
      for (let y = Math.round(top); y < FLOOR + 10; y++) {
        const block = (y % 12 === 0) || ((x + (Math.floor(y / 12) % 2) * 9) % 18 === 0);
        const u = x / wallW, n = Math.sin(x * 0.7 + y * 0.3) + Math.sin(y * 0.13);
        put(x, y, y < top + 2 ? C.concHi : block ? C.concDark : u > 0.8 ? C.concDark : n > 1.2 ? C.concLit : C.concrete);
      }
    }
    for (let i = 0; i < 7; i++) { let x = wallW * (0.3 + r() * 0.7), y = 40 + (x / wallW) ** 2 * 80, a = -Math.PI / 2 + (r() - 0.2) * 1.2; for (let k = 0; k < 8 + r() * 14; k++) { put(Math.round(x), Math.round(y), C.rebar); x += Math.cos(a); y += Math.sin(a); a += (r() - 0.5) * 0.3; } }
    for (let k = 0; k < 10; k++) { put(wallW * 0.35 + k * 0.2, 90 + k, C.crack); put(wallW * 0.35 + k * 0.5, 100 + k * 1.4, C.crack); }   // a crack in the wall
    // graffiti-ish warning stripes on the wall
    for (let y = 120; y < 128; y++) for (let x = 3; x < wallW - 6; x++) if (((x + y) >> 2) % 2 === 0 && get(x, y)[0] > 30) put(x, y, C.laneDim);
    // the toppled streetlight: a post leaning in from the right edge, lamp dangling
    { let x = W - 6, y = FLOOR + 6; const a = -Math.PI / 2 - 0.42;
      for (let k = 0; k < 120; k++) { for (let j = -1; j <= 1; j++) put(Math.round(x) + j, Math.round(y), j < 0 ? C.metalLit : j > 0 ? C.midDark : C.metal); x += Math.cos(a); y += Math.sin(a); if (y < 30) break; }
      for (let k = 0; k < 16; k++) { put(Math.round(x) - k, Math.round(y) + Math.round(k * 0.2), C.metal); put(Math.round(x) - k, Math.round(y) + 1 + Math.round(k * 0.2), C.midDark); }
      const lx = Math.round(x) - 16, ly = Math.round(y) + 4;
      for (let k = 0; k < 10; k++) put(lx, ly + k, C.wire);
      for (let yy = 0; yy < 4; yy++) for (let xx = -3 + yy; xx <= 3 - yy; xx++) put(lx + xx, ly + 10 + yy, yy === 3 ? C.sunRim : C.metal);
      this.lamp = { x: lx, y: ly + 13 };
    }
    // oil drums in the right corner: two standing, one tipped over, and a tyre
    { const s = 1.5;
      const drum = (x0, base, w, h, c) => {
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          const u = xx / w, rib = yy === 1 || yy === Math.round(h * 0.33) || yy === Math.round(h * 0.66) || yy === h - 2, rust = Math.sin(xx * 0.9 + yy * 0.7 + x0) + Math.sin(yy * 0.3) > 1.2;
          put(x0 + xx, base - h + yy, yy === 0 ? C.metalLit : rib ? (u < 0.3 ? c.hi : c.dark) : rust ? C.rustDark : u < 0.15 ? c.hi : u < 0.45 ? c.lit : u > 0.85 ? c.dark : c.base);
        }
        for (let xx = 1; xx < w - 1; xx++) put(x0 + xx, base - h - 1, xx < w * 0.4 ? C.metalLit : C.metal);
      };
      const red = { base: hex("#6a2014"), lit: hex("#8e3018"), hi: hex("#b84a22"), dark: hex("#2e0c08") }, blu = { base: hex("#26303a"), lit: hex("#34424c"), hi: hex("#5a6a70"), dark: hex("#12161c") };
      const dw = Math.round(14 * s), dh = Math.round(20 * s), x0 = Math.round(W - dw * 2.3);
      drum(x0, H - 1, dw, dh, red); drum(x0 + dw + 2, H + 3, dw, dh, blu);
      // the tipped drum lying in front, spilling something dark and glinting
      const lx = Math.round(x0 - dw * 1.6), ly = H - 2, L = dh, R = Math.round(dw / 2);
      for (let xx = 0; xx < L; xx++) for (let yy = -R; yy <= R; yy++) { const u = (yy + R) / (2 * R), rib = xx === 2 || xx === Math.round(L / 2) || xx === L - 3; put(lx + xx, ly - R + yy, rib ? red.dark : u < 0.2 ? red.hi : u < 0.5 ? red.lit : u > 0.85 ? red.dark : red.base); }
      for (let yy = -R; yy <= R; yy++) for (let xx = -2; xx <= 0; xx++) if (xx * xx * 4 + yy * yy <= R * R) put(lx + xx, ly - R + yy, xx === 0 ? red.dark : C.crack);
      for (let y = 0; y < 4; y++) for (let x = -14 - y * 3; x < 0; x++) if (r() < 0.9) put(lx + x, ly - 1 + y - 2, (x + y) % 5 === 0 ? C.metalLit : C.crack);
      const tx = Math.round(x0 - dw * 0.3), ty = H - 4;   // a tyre leaning on the drum
      for (let yy = -8; yy <= 8; yy++) for (let xx = -4; xx <= 4; xx++) { const e = (xx / 4) ** 2 + (yy / 8) ** 2; if (e <= 1 && e > 0.35) put(tx + xx, ty - 8 + yy, e > 0.8 ? C.crack : xx < 0 ? C.metal : C.midDark); }
    }
    // darken the very top so the HP bars stay readable
    for (let y = 0; y < 34; y++) for (let x = 0; x < W; x++) if ((1 - y / 34) * 0.8 > bay(x, y) + 0.1) put(x, y, mix(get(x, y), C.sky0, 0.6));

    this.embers = Array.from({ length: Math.round(W / 9) }, () => ({ x: r() * W, y: r() * H, v: 6 + r() * 14, p: r() * 9, hot: r() < 0.3 }));
    this.ash = Array.from({ length: Math.round(W / 12) }, () => ({ x: r() * W, y: r() * H, v: 3 + r() * 5, p: r() * 9 }));
    this.puffs = Array.from({ length: 18 }, (_, i) => ({ i, t: r() * 12 }));
  }
  animate({ t, dt, W, H, FLOOR, px }) {
    const r = Math.random;
    // fires flickering in the towers
    for (const f of this.fires) {
      const a = 0.25 + 0.15 * Math.sin(t * 9 + f.x) * Math.sin(t * 3.7 + f.y);
      px(f.x - 3, f.y - 3, C.fire, a * 0.6, 7);
      for (let k = 0; k < 4; k++) { const h = Math.max(0, Math.round((Math.sin(t * 11 + k * 2 + f.x) + 1) * 2 * f.s)); for (let j = 0; j < h; j++) px(f.x - 2 + k, f.y + 1 - j, j > h - 2 ? C.fireDeep : k === 1 || k === 2 ? C.fireHi : C.fire, 0.9); }
    }
    // smoke rolling off the tops of the columns
    for (const p of this.puffs) {
      const pl = this.plumes[p.i % this.plumes.length], k = ((t + p.t) % 12) / 12;
      const x = pl.x + k * 50 + Math.sin(k * 4 + p.i) * 6, y = pl.y + 4 - k * 18;
      px(x, y, C.smoke, 0.5 * (1 - k), 4 + Math.round(k * 6));
    }
    // the dead machine's eye sputters
    const on = Math.sin(t * 0.7) > 0.3 && Math.sin(t * 23) > -0.3;
    if (on) { px(this.eye.x - 2, this.eye.y - 1, C.eye, 0.3, 5); px(this.eye.x, this.eye.y, C.eye); px(this.eye.x + 1, this.eye.y, C.eye); }
    // warning lights on the pylons, out of step
    this.warn.forEach((w, i) => { if (Math.sin(t * 2 + i * 1.7) > 0.7) { px(w.x - 1, w.y - 1, C.red, 0.35, 3); px(w.x, w.y, C.red); } });
    // the snapped wire sparks now and then; the dangling lamp flickers
    if (Math.sin(t * 1.3) > 0.85 && r() < 0.6) for (let k = 0; k < 5; k++) px(this.spark.x + (r() - 0.5) * 6, this.spark.y + r() * 5, r() < 0.5 ? C.emberHi : C.sun, 0.9);
    if (Math.sin(t * 17) > 0 || Math.sin(t * 0.9) > 0.2) { px(this.lamp.x - 3, this.lamp.y, C.sunMid, 0.25, 7); px(this.lamp.x - 1, this.lamp.y, C.sun, 0.8, 2); }
    // embers rising and swirling
    for (const e of this.embers) {
      e.y -= e.v * dt; e.x += (Math.sin(t * 1.3 + e.p) * 6 + 5) * dt;
      if (e.y < 30 || e.x > W + 4) { e.y = FLOOR + r() * (H - FLOOR); e.x = r() * W; }
      const tw = Math.sin(t * 6 + e.p) > -0.2;
      if (tw) { px(e.x, e.y, e.hot ? C.emberHi : C.ember, 0.9); if (e.hot) px(e.x - 1, e.y - 1, C.ember, 0.25, 3); }
    }
    // ash drifting down
    for (const a of this.ash) {
      a.y += a.v * dt; a.x += (Math.sin(t * 0.8 + a.p) * 4 + 3) * dt;
      if (a.y > H) { a.y = 30; a.x = r() * W; }
      px(a.x, a.y, C.ash, 0.7);
    }
  }
}
