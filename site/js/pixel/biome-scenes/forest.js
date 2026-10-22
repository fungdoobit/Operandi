// Module 1: the Whispering Forest. An old forest at dusk going bad: layers of
// trees fading into a green-blue mist, pale shafts of light through the
// canopy, a sickly violet glow seeping up between the trunks (the corruption
// that made Rotcap), huge mossy roots framing the sides, glowing mushrooms in
// the undergrowth, and a mossy floor. Fireflies and spores drift in the light layer.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky0: hex("#070d12"), sky1: hex("#0c1a1e"), sky2: hex("#12302c"), mist: hex("#1d4038"), mistHi: hex("#2e5a4a"),
  far: hex("#0f2624"), farLit: hex("#163430"), mid: hex("#0a1a18"), midLit: hex("#12282a"), near: hex("#060e0e"),
  bark: hex("#1a1410"), barkLit: hex("#2e2418"), barkHi: hex("#46361f"), moss: hex("#1f3a1a"), mossLit: hex("#3a6a24"), mossHi: hex("#5e9a30"),
  ray: hex("#6a9a7a"), rot: hex("#2a1438"), rotHi: hex("#4a2060"), leaf: hex("#0d2216"), leafLit: hex("#1a3e22"),
  ground: hex("#141a10"), groundLit: hex("#22301a"), dirt: hex("#1c160e"), grass: hex("#2e5a1e"), grassHi: hex("#4e8a2a"),
  shroom: hex("#5fe3c0"), shroomHi: hex("#d6fff0"), shroomRed: hex("#c44a78"), stem: hex("#cfc4a8"),
  firefly: hex("#e8ff8a"), spore: hex("#a8e86a"), vine: hex("#16301a"), vineLit: hex("#2a5228"),
};

export class ForestScene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r }) {
    // 1. dusk sky into mist
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const t = y / FLOOR;
      if (t < 0.35) dith(x, y, C.sky0, C.sky1, t / 0.35);
      else if (t < 0.75) dith(x, y, C.sky1, C.sky2, (t - 0.35) / 0.4);
      else dith(x, y, C.sky2, C.mist, (t - 0.75) / 0.25);
    }
    // 2. the far tree line: soft silhouettes in the mist
    const treeLine = (base, col, colLit, step, hMin, hMax, seed) => {
      let x = -10 + seed;
      while (x < W + 10) {
        const w = 6 + r() * 8, h = hMin + r() * (hMax - hMin), top = base - h;
        for (let y = Math.round(top); y < base; y++) {
          const u = (y - top) / h, half = (w * (0.3 + 0.7 * Math.min(1, u * 1.6))) * (0.85 + 0.15 * Math.sin(y * 0.7 + x));
          for (let k = -half; k <= half; k++) put(x + k, y, k < -half * 0.4 && u < 0.7 ? colLit : col);
        }
        for (let y = base - 4; y < base + 30; y++) for (let k = -1; k <= 1; k++) put(x + k, y, col);   // trunk
        x += step * (0.6 + r() * 0.8);
      }
    };
    treeLine(FLOOR - 40, C.far, C.farLit, 14, 50, 90, 3);
    // mist band over the far trees
    for (let y = FLOOR - 70; y < FLOOR - 20; y++) for (let x = 0; x < W; x++) {
      const k = (1 - Math.abs(y - (FLOOR - 45)) / 25) * (0.5 + 0.25 * Math.sin(x * 0.03 + y * 0.1));
      if (k > bay(x, y) + 0.15) put(x, y, C.mist);
    }
    treeLine(FLOOR - 18, C.mid, C.midLit, 22, 70, 130, 9);
    // 3. shafts of pale light through the canopy
    for (const [fx, wd] of [[0.38, 9], [0.47, 5], [0.62, 12], [0.71, 6]]) {
      const x0 = W * fx;
      for (let y = 0; y < FLOOR; y++) for (let k = -wd; k <= wd; k++) {
        const x = Math.round(x0 + y * 0.32 + k), f = (1 - Math.abs(k) / (wd + 1)) * (0.25 + 0.4 * y / FLOOR) * 0.55;
        if (f > bay(x, y) + 0.08) put(x, y, C.ray);
      }
    }
    // 4. the corruption: a violet glow seeping up between the trunks
    for (const cx of [W * 0.22, W * 0.78]) for (let y = FLOOR - 60; y < FLOOR; y++) for (let x = Math.round(cx - 50); x < cx + 50; x++) {
      const k = (1 - Math.abs(x - cx) / 50) * ((y - (FLOOR - 60)) / 60) * 0.7;
      if (k > bay(x, y) + 0.12) put(x, y, k > 0.45 ? C.rotHi : C.rot);
    }
    // 5. canopy: dark leaf masses hanging from the top, with lit edges
    for (let x = 0; x < W; x++) {
      const h = 18 + 10 * Math.sin(x * 0.05) + 7 * Math.sin(x * 0.13 + 2) + 5 * Math.sin(x * 0.37);
      for (let y = 0; y < h; y++) put(x, y, y > h - 3 && (x + y) % 3 ? C.leafLit : C.leaf);
      if (r() < 0.05) for (let y = h; y < h + 6 + r() * 8; y++) put(x, y, C.leaf);   // clumps hanging lower
    }
    // hanging vines
    for (let i = 0; i < Math.round(W / 40); i++) {
      const vx = r() * W, len = 30 + r() * 70;
      for (let y = 10; y < 10 + len; y++) { const x = vx + Math.sin(y * 0.12 + i) * 3; put(x, y, (y % 7) < 2 ? C.vineLit : C.vine); if (y % 9 === 0) { put(x + 1, y, C.vineLit); put(x - 1, y + 1, C.vine); } }
    }
    // 6. the near trunks framing both sides, with moss and roots
    const trunk = (cx, w, lean) => {
      for (let y = 0; y < FLOOR + 6; y++) {
        const flare = y > FLOOR - 40 ? ((y - (FLOOR - 40)) / 40) ** 2 * w * 1.2 : 0, half = w / 2 + flare, c0 = cx + lean * (FLOOR - y);
        for (let k = -half; k <= half; k++) {
          const u = (k + half) / (2 * half), x = Math.round(c0 + k);
          const ridge = Math.sin(k * 0.9 + y * 0.05) > 0.6;
          let c = u < 0.18 ? C.barkHi : u < 0.45 ? C.barkLit : C.bark;
          if (ridge && u > 0.3) c = C.near;
          if (u < 0.5 && Math.sin(y * 0.13 + k * 0.4) + Math.sin(y * 0.05) > 1.1) c = u < 0.25 ? C.mossHi : C.mossLit;   // moss on the lit side
          put(x, y, c);
        }
      }
    };
    trunk(10, 30, 0.02); trunk(W - 14, 34, -0.03);
    // 7. the floor: moss and dirt in perspective, a worn path, grass tufts
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x = 0; x < W; x++) {
        const path = Math.abs(x - W * 0.5 - Math.sin(t * 3) * 20) < W * (0.18 + 0.25 * t);
        const n = Math.sin(x * 0.21 + y * 0.9) + Math.sin(x * 0.07 - y * 0.4);
        if (t < 0.05) put(x, y, C.mossLit);
        else if (path) dith(x, y, C.dirt, C.groundLit, 0.25 + 0.2 * Math.sin(x * 0.3 + y));
        else dith(x, y, n > 0.8 ? C.moss : C.ground, C.groundLit, 0.3 - t * 0.2);
      }
    }
    for (let i = 0; i < W / 3; i++) {   // grass tufts along the floor line and scattered below
      const x = r() * W, y = FLOOR + (r() < 0.6 ? 0 : r() * 40), h = 3 + r() * 6;
      for (let k = 0; k < h; k++) { put(x + Math.round(k * 0.3), y - k, k > h - 2 ? C.grassHi : C.grass); put(x - Math.round(k * 0.4) + 2, y - k * 0.8, C.grass); }
    }
    // 8. glowing mushrooms in the undergrowth (they light the light layer)
    this.glows = [];
    const shroom = (x, y, s, red) => {
      for (let k = 0; k < 4 * s; k++) put(x, y - k, C.stem);
      const cr = 3 * s;
      for (let yy = -cr; yy <= 0; yy++) for (let xx = -cr * 1.4; xx <= cr * 1.4; xx++) if ((xx / 1.4) ** 2 + yy * yy <= cr * cr) put(x + xx, y - 4 * s + yy, yy < -cr * 0.5 && xx < 0 ? (red ? C.stem : C.shroomHi) : red ? C.shroomRed : C.shroom);
      if (!red) this.glows.push({ x, y: y - 4 * s, s });
    };
    for (const fx of [0.05, 0.09, 0.16, 0.84, 0.9, 0.95, 0.3, 0.68]) { const x = W * fx, n = 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) shroom(Math.round(x + i * 5 - 5), FLOOR + Math.round(r() * 3), 1 + Math.round(r()), r() < 0.25); }
    this.flies = Array.from({ length: Math.round(W / 18) }, () => ({ x: r() * W, y: 40 + r() * (FLOOR - 50), p: r() * 9, s: 0.4 + r() * 0.8 }));
    this.spores = Array.from({ length: Math.round(W / 24) }, () => ({ x: r() * W, y: r() * FLOOR, v: 2 + r() * 4, p: r() * 6 }));
  }
  animate({ t, dt, FLOOR, px }) {
    for (const gl of this.glows) { const a = 0.18 + 0.12 * Math.sin(t * 1.7 + gl.x); px(gl.x - 3 * gl.s, gl.y - 2 * gl.s, C.shroom, a, 6 * gl.s); }
    for (const f of this.flies) {
      const on = Math.sin(t * f.s * 3 + f.p) > 0.2;
      if (!on) continue;
      const x = f.x + Math.sin(t * 0.4 * f.s + f.p) * 18, y = f.y + Math.sin(t * 0.7 * f.s + f.p * 2) * 10;
      px(x - 1, y - 1, C.firefly, 0.25, 3); px(x, y, C.firefly);
    }
    for (const s of this.spores) { s.y -= s.v * dt; if (s.y < 20) s.y = FLOOR; px(s.x + Math.sin(t * 0.6 + s.p) * 5, s.y, C.spore, 0.5); }
  }
}
