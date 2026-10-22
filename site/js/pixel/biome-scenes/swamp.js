// Module 6: Witchmire. A witch's swamp at night: a sickly moon behind thin
// cloud, a far line of dead trees in the haze, a crooked hut on stilts with a
// glowing window, still black water that mirrors it all (with lily pads and
// broken ripple lines), twisted dead trees dripping moss framing both sides,
// bottles and a lantern hung from the branches, reeds and cattails along a
// soggy peat bank. The light layer drifts green and purple fog, floats
// will-o'-wisps (mirrored in the water), surfaces bubbles, lets swamp-gas
// bubbles rise and flickers the window, lantern and bottles.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  sky0: hex("#050509"), sky1: hex("#0a0915"), sky2: hex("#121423"), sky3: hex("#1b2328"), sky4: hex("#24302c"),
  star: hex("#8a96a0"), moon: hex("#d9e6bf"), moonMid: hex("#b5c79c"), moonDark: hex("#8ea07c"), halo: hex("#2c3a33"), haloHi: hex("#3d5042"),
  cloud: hex("#0d0f18"), cloudLit: hex("#2a3432"),
  farTree: hex("#1d2a2a"), farTree2: hex("#172222"), haze: hex("#2a3a34"), hazeP: hex("#2b2238"),
  midTree: hex("#0f1617"), midLit: hex("#2a3834"), midDark: hex("#0a0f10"),
  bark: hex("#0c0f0f"), barkLit: hex("#2c3630"), barkHi: hex("#4a5a4a"), barkDark: hex("#060808"),
  moss: hex("#2f3d2e"), mossLit: hex("#4b5e42"), mossHi: hex("#6e845a"), mossDark: hex("#1d271d"),
  hut: hex("#18120e"), hutLit: hex("#2c2218"), hutHi: hex("#433322"), roof: hex("#151615"), roofLit: hex("#2a2c24"), stilt: hex("#0f0c0a"),
  win: hex("#ffcf5a"), winHi: hex("#fff3b0"), winGlow: hex("#5a4020"), winGlow2: hex("#3a3420"),
  water: hex("#04070a"), water2: hex("#070c10"), ripple: hex("#1a2a2c"), rippleHi: hex("#3a4e4a"),
  pad: hex("#1c3a22"), padLit: hex("#2e5a30"), padDark: hex("#10221a"), flower: hex("#e8c8e0"), flowerHi: hex("#ffffff"),
  wood: hex("#352d22"), wood2: hex("#2a241b"), woodLit: hex("#463c2c"), woodHi: hex("#6a5c42"), woodDark: hex("#14100c"), nail: hex("#6a6a5a"),
  mud: hex("#0d0f0b"), mudLit: hex("#191d14"), peat: hex("#22281a"), bankMoss: hex("#2a3a20"), bankMossHi: hex("#46602e"),
  reed: hex("#1e2c18"), reedLit: hex("#3a5228"), reedHi: hex("#5a7a36"), cattail: hex("#2a1a10"), cattailLit: hex("#4a3018"),
  rope: hex("#1a1612"), glass: hex("#2a6a4a"), glassHi: hex("#9affc0"), glassP: hex("#5a2a7a"), glassPHi: hex("#d8a0ff"),
  lantern: hex("#ffc86a"), lanternHi: hex("#fff2c0"), lanternMetal: hex("#1a1612"),
  fogG: hex("#4a6a52"), fogP: hex("#5a4a78"), wisp: hex("#9affd6"), wispHi: hex("#f0fff8"), gas: hex("#8ad86a"), smoke: hex("#3a3f44"),
};

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r, mix, get }) {
    const HZ = 136;                                   // the far shore line: water from here to the floor
    const disc = (cx, cy, rad, pal) => {
      const R = Math.max(0.5, rad), n = Math.ceil(R);
      for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
        if (dx * dx + dy * dy > R * R + 0.3) continue;
        const l = (dx * 0.8 + dy * 0.6) / R;            // moon light comes from the upper left
        put(cx + dx, cy + dy, l < -0.45 ? pal.lit : l > 0.35 ? pal.dark : pal.base);
      }
    };
    const strands = [];
    // a gnarled limb: stamps discs along a wobbling path, forks, records where moss hangs
    const limb = (x, y, a, len, th, depth, pal, moss, bend = 0) => {
      const steps = Math.round(len);
      for (let s = 0; s < steps; s++) {
        const w = Math.max(0.5, th * (1 - 0.55 * s / steps));
        disc(Math.round(x), Math.round(y), w, pal);
        x += Math.cos(a); y += Math.sin(a); a += (r() - 0.5) * 0.28 + bend;
        if (depth > 0 && s > steps * 0.25 && r() < 0.035) limb(x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * (0.3 + r() * 0.3), w * 0.65, depth - 1, pal, moss);
        if (moss && w < 3.5 && r() < moss) strands.push({ x: Math.round(x), y: Math.round(y + w), len: 5 + r() * 22 * Math.min(1, w) });
      }
      if (depth > 0) for (const d of [-0.45, 0.4]) limb(x, y, a + d + (r() - 0.5) * 0.3, len * (0.35 + r() * 0.25), th * 0.35, depth - 1, pal, moss);
    };

    // 1. night sky: near-black at the top, a sick green haze toward the far shore
    for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
      const t = y / HZ;
      if (t < 0.3) dith(x, y, C.sky0, C.sky1, t / 0.3);
      else if (t < 0.6) dith(x, y, C.sky1, C.sky2, (t - 0.3) / 0.3);
      else if (t < 0.85) dith(x, y, C.sky2, C.sky3, (t - 0.6) / 0.25);
      else dith(x, y, C.sky3, C.sky4, (t - 0.85) / 0.15);
    }
    for (let i = 0; i < W / 9; i++) { const x = r() * W, y = 30 + r() * 70; if (r() < 0.8) put(x, y, mix(C.sky2, C.star, 0.3 + r() * 0.5)); }
    // 2. the moon with a dithered halo and craters, cut by thin clouds
    const mx = Math.round(W * 0.34), my = 66, mr = 15;
    for (let y = my - 52; y < my + 52; y++) for (let x = mx - 70; x < mx + 70; x++) {
      const d = Math.hypot((x - mx) * 0.8, y - my);
      if (d <= mr || y < 0) continue;
      const k = Math.max(0, 1 - (d - mr) / 50) ** 1.6;
      if (k > bay(x, y) + 0.05) put(x, y, k > 0.55 ? C.haloHi : C.halo);
    }
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
      const d = Math.hypot(x, y); if (d > mr) continue;
      const l = (x * 0.6 + y * 0.5) / mr, crater = Math.sin(x * 0.7 + 1) * Math.sin(y * 0.6 + 2) + Math.sin(x * 0.31 - y * 0.4) * 0.6;
      let c = l > 0.35 ? C.moonMid : C.moon;
      if (crater > 0.75) c = l > 0.1 ? C.moonDark : C.moonMid;
      if (d > mr - 1.2) c = l < 0 ? C.moon : C.moonMid;
      put(mx + x, my + y, c);
    }
    // thin ragged clouds: overlapping noisy puffs, rim-lit where they cross the moon
    const cloud = (cx, cy, w, h) => {
      const n = 3 + Math.floor(w / 12), puffs = [];
      for (let i = 0; i < n; i++) puffs.push({ x: cx - w + (2 * w * (i + r() * 0.6)) / n, y: cy + (r() - 0.5) * h, w: w / n * (1.2 + r()), h: h * (0.6 + r() * 0.7) });
      for (const p of puffs) for (let y = Math.round(p.y - p.h - 1); y <= p.y + p.h + 1; y++) for (let x = Math.round(p.x - p.w - 2); x <= p.x + p.w + 2; x++) {
        const u = (x - p.x) / p.w, v = (y - p.y) / p.h, k = 1 - u * u - v * v + Math.sin(x * 0.5 + y * 1.3) * 0.15;
        if (k <= 0 || (k < 0.25 && k < bay(x, y))) continue;
        const nm = Math.hypot(x - mx, y - my) < mr + 18;
        put(x, y, v < -0.35 && nm ? C.cloudLit : v < -0.4 && k < 0.5 ? mix(C.cloud, C.cloudLit, 0.35) : C.cloud);
      }
    };
    cloud(mx - 20, my + 8, 34, 3.6); cloud(mx + 30, my - 8, 22, 2.4);
    cloud(W * 0.76, 54, 44, 2.6); cloud(W * 0.9, 64, 26, 2); cloud(W * 0.1, 48, 36, 2.2); cloud(W * 0.55, 88, 30, 1.6);

    // 3. the far shore: a hazy line of dead trees
    for (let x = 0; x < W; x++) {
      const h = 4 + 3 * Math.sin(x * 0.05) + 2 * Math.sin(x * 0.17 + 1) + (r() < 0.3 ? r() * 3 : 0);
      for (let y = Math.round(HZ - h); y < HZ; y++) put(x, y, C.farTree2);
    }
    for (let x = 4; x < W; x += 6 + r() * 16) {
      const h = 14 + r() * 26, lean = (r() - 0.5) * 0.4;
      for (let y = 0; y < h; y++) { put(x + Math.round(y * lean), HZ - y, C.farTree); if (y < h * 0.4) put(x + 1 + Math.round(y * lean), HZ - y, C.farTree); }
      for (let b = 0; b < 3; b++) {   // a few bare branches
        const by = HZ - h * (0.45 + r() * 0.5), dir = r() < 0.5 ? -1 : 1, bl = 3 + r() * 7, bx = x + Math.round((HZ - by) * lean);
        for (let k = 0; k < bl; k++) put(bx + dir * k, Math.round(by - k * (0.5 + r() * 0.3)), C.farTree);
      }
    }
    // haze over the far shore, purple drifting into green
    for (let y = HZ - 34; y < HZ; y++) for (let x = 0; x < W; x++) {
      const k = ((y - (HZ - 34)) / 34) ** 1.3 * (0.55 + 0.25 * Math.sin(x * 0.04 + y * 0.15) + 0.15 * Math.sin(x * 0.011));
      if (k > bay(x, y) + 0.12) put(x, y, Math.sin(x * 0.013 + 1) > 0.2 ? C.hazeP : C.haze);
    }

    // 4. the witch's hut on stilts, far back on the water
    const hx = Math.round(W * 0.63), hb = HZ - 10, hw = 30, hh = 22, skew = 0.12;
    this.hut = { x: hx, y: hb - hh + 9, chim: null };
    for (let i = 0; i < 6; i++) {   // stilts down into the water
      const sx = hx - hw / 2 + 2 + i * (hw - 4) / 5 + (r() - 0.5) * 2;
      for (let y = hb; y < HZ + 3; y++) { put(sx + Math.round((y - hb) * (i % 2 ? 0.08 : -0.06)), y, C.stilt); }
    }
    for (let x = hx - hw / 2 - 4; x < hx + hw / 2 + 3; x++) { put(x, hb, C.hutLit); put(x, hb + 1, C.stilt); }   // the deck
    for (let k = 0; k < 9; k++) { put(hx + hw / 2 + 2 + Math.round(k * 0.5), hb + 1 + k, C.stilt); if (k % 3 === 1) put(hx + hw / 2 + 1 + Math.round(k * 0.5), hb + 1 + k, C.hutLit); }   // a ladder
    for (let y = hb - hh; y < hb; y++) {   // crooked plank walls
      const off = Math.round((hb - y) * skew);
      for (let x = -hw / 2; x < hw / 2; x++) {
        const plank = (x + 40) % 5 === 0, u = (x + hw / 2) / hw;
        put(hx + x + off, y, plank ? C.stilt : u < 0.2 ? C.hutHi : u < 0.55 ? C.hutLit : C.hut);
      }
    }
    // the roof: a tall crooked cone that bends over at the tip, with patches
    const rb = hb - hh, rh = 34;
    for (let y = 0; y < rh; y++) {
      const t = y / rh, half = (hw / 2 + 5) * (1 - t) ** 1.1, cx = hx + Math.round(hh * skew) + Math.round(t * t * 10);
      for (let x = Math.round(-half); x <= half; x++) {
        const u = (x + half) / (2 * half + 0.01), shingle = ((y + (x & 3)) % 4) === 0;
        put(cx + x, rb - y + 1, u < 0.25 ? C.roofLit : shingle ? C.stilt : C.roof);
      }
    }
    for (let k = 0; k < 6; k++) put(hx + Math.round(hh * skew) + 10 + k, rb - rh + 1 + Math.round(k * 0.6), C.roof);   // the drooping tip
    // a crooked stovepipe chimney
    const chx = hx + 8 + Math.round(hh * skew);
    for (let y = rb - 20; y < rb - 6; y++) for (let k = 0; k < 3; k++) put(chx + k + Math.round((rb - y) * 0.06), y, k === 0 ? C.hutHi : C.stilt);
    this.hut.chim = { x: chx + 2, y: rb - 21 };
    // the glowing window (cross frame) and its glow on the wall
    const wx = hx - 6 + Math.round(10 * skew), wy = hb - 15;
    for (let y = -8; y < 14; y++) for (let x = -10; x < 16; x++) {
      const k = 1 - Math.hypot(x - 3, (y - 3) * 1.2) / 13;
      if (k > bay(wx + x, wy + y) + 0.2 && get(wx + x, wy + y)[0] < 80) put(wx + x, wy + y, C.winGlow);
    }
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) put(wx + x, wy + y, x === 3 || y === 3 ? C.hutLit : (x + y < 5 ? C.winHi : C.win));
    this.win = { x: wx + 3, y: wy + 3 };
    // a second, small round window up in the roof
    put(hx + 3, rb - 10, C.win); put(hx + 4, rb - 10, C.win); put(hx + 3, rb - 9, C.win); put(hx + 4, rb - 9, C.winHi);

    // 5. middle-distance dead trees standing in the water, hazy, with moss
    const midPal = { base: C.midTree, lit: C.midLit, dark: C.midDark };
    for (const [fx, sc] of [[0.2, 0.9], [0.43, 0.6], [0.83, 1], [0.92, 0.55], [0.06, 0.6]]) {
      const tx = W * fx, base = HZ + 4;
      limb(tx, base, -Math.PI / 2 + (r() - 0.5) * 0.3, 70 * sc, 3.5 * sc, 2, midPal, 0.12);
      for (const d of [-1, 1]) { let x = tx, y = base - 1; for (let k = 0; k < 6 * sc; k++) { put(x, y, C.midTree); x += d; y += r() < 0.5 ? 1 : 0; } }
    }
    for (const s of strands.splice(0)) for (let k = 0; k < s.len * 0.7; k++) if (r() < 0.85) put(s.x + Math.round(Math.sin(k * 0.4 + s.x) * 0.8), s.y + k, k % 4 === 0 ? C.mossLit : C.moss);

    // 6. the water: a broken, darkened mirror of everything above the shore
    for (let y = HZ; y < FLOOR; y++) {
      const t = (y - HZ) / (FLOOR - HZ);
      for (let x = 0; x < W; x++) {
        const sy = 2 * HZ - y - 1, wob = Math.round(Math.sin(y * 0.9 + x * 0.02) * (0.5 + t * 1.5));
        const src = sy >= 0 ? get(x + wob, sy) : C.sky0;
        const k = 0.38 + 0.4 * t, c = mix(src, C.water, k);
        if (Math.sin(y * 1.7 + Math.sin(x * 0.05 + y) * 2) > 0.85 - t * 0.2) { put(x, y, mix(c, C.water, 0.6)); continue; }   // ripple breaks
        dith(x, y, c, C.water2, t * 0.6);
      }
    }
    // a few thin highlight streaks where the moonlight catches the water
    for (let i = 0; i < 40; i++) {
      const tt = r() ** 1.6, y = HZ + 2 + Math.round(tt * (FLOOR - HZ - 6)), x = mx + (r() - 0.5) * (10 + (y - HZ) * 1.4), len = 2 + (1 - tt) * 10 * r();
      for (let k = 0; k < len; k++) put(x + k, y, k === 0 || k > len - 2 ? C.rippleHi : tt < 0.3 ? C.moonDark : C.rippleHi);
    }
    for (let i = 0; i < W / 14; i++) { const y = HZ + 3 + Math.round(r() * (FLOOR - HZ - 6)), x = r() * W, len = 3 + r() * 12; for (let k = 0; k < len; k++) put(x + k, y, C.ripple); }
    // lily pads: flattened discs with a notch, some with a pale flower
    const pad = (cx, cy, rw) => {
      const rh = Math.max(1, rw * 0.38), n = r() * 6;
      for (let y = -Math.ceil(rh); y <= rh; y++) for (let x = -Math.ceil(rw); x <= rw; x++) {
        if ((x / rw) ** 2 + (y / rh) ** 2 > 1) continue;
        const ang = Math.atan2(y / rh, x / rw); if (Math.abs(((ang - n + 9.42) % 6.283) - 3.14) < 0.3) continue;   // the notch
        put(cx + x, cy + y, y > rh * 0.4 ? C.padDark : y < -rh * 0.3 && x < 0 ? C.padLit : C.pad);
      }
      if (r() < 0.3) { put(cx, cy - 1, C.flower); put(cx - 1, cy - 1, C.flower); put(cx + 1, cy - 1, C.flower); put(cx, cy - 2, C.flowerHi); }
    };
    for (let i = 0; i < W / 22; i++) {
      const t = r(), cy = Math.round(HZ + 4 + t * (FLOOR - HZ - 8)), cx = Math.round(r() * W);
      if (Math.abs(cx - W / 2) < W * 0.12 && t > 0.5) continue;
      pad(cx, cy, 2 + t * 6 * (0.6 + r() * 0.6));
      if (r() < 0.5) pad(cx + 5 + Math.round(r() * 6), cy + 1, 1.5 + t * 3);
    }
    this.pads = [];
    // low mist sitting on the water
    for (let y = HZ; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const k = (0.35 - Math.abs((y - HZ - 8) / 30)) * (0.6 + 0.4 * Math.sin(x * 0.03 + y * 0.2));
      if (k > bay(x, y) + 0.05) put(x, y, (x >> 6) % 3 === 1 ? C.hazeP : C.haze);
    }

    // 7. a rotting boardwalk across the bog (the fighters stand on it), black water in front
    const DK = FLOOR + 16, planks = [];
    for (let i = 0; i < 400; i++) planks.push({ c: r(), miss: r() < 0.05, moss: r() < 0.22, sag: r() < 0.15 ? 1 : 0, nail: r() < 0.5 });
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (DK - FLOOR);
      for (let x = 0; x < W; x++) {
        if (y < DK) {
          const u = (x - W / 2) / (1 + t * 0.5) + 1000, pi = Math.floor(u / 8), pf = (u / 8) - pi, pl = planks[pi % 400];
          if (pl.miss && y > FLOOR + 1) { put(x, y, (x + y) % 7 ? C.water : C.ripple); continue; }
          if (pf < 0.1) { put(x, y, C.barkDark); continue; }
          const grain = Math.sin(y * 2.1 + pi * 3) > 0.6, base = pl.c < 0.35 ? C.wood2 : pl.c < 0.7 ? C.wood : C.woodLit;
          let c = y === FLOOR ? C.woodHi : y === FLOOR + 1 ? C.woodLit : grain ? C.woodDark : base;
          if (pl.moss && Math.sin(x * 0.7 + y * 1.3 + pi) > 0.3) c = y < FLOOR + 4 ? C.bankMossHi : C.bankMoss;
          if (pl.nail && (y === FLOOR + 3 || y === DK - 3) && pf > 0.4 && pf < 0.55) c = C.nail;
          dith(x, y, c, C.woodDark, t * 0.35);
        } else if (y < DK + 3) put(x, y, y === DK ? C.woodLit : C.woodDark);   // the front beam
        else {
          const tw = (y - DK) / (H - DK), n = Math.sin(x * 0.05 + y * 0.9) + Math.sin(x * 0.013 - y * 0.2);
          put(x, y, y === DK + 3 ? C.barkDark : n > 1.4 ? C.ripple : tw < 0.12 ? C.water : (x + y * 3) % 11 === 0 && n > 0.6 ? C.water2 : C.water);
        }
      }
    }
    // posts going down from the beam into the water, with their wobbling reflections
    for (let px = 6 + r() * 20; px < W; px += 38 + r() * 40) {
      const pw = 3 + Math.round(r() * 2), x0 = Math.round(px);
      for (let y = DK - 1; y < H; y++) {
        const deep = y > DK + 10, wob = deep ? Math.round(Math.sin(y * 1.1) * 0.8) : 0;
        for (let k = 0; k < pw; k++) { if (deep && (y + k) % 3 === 0) continue; put(x0 + k + wob, y, deep ? C.mudLit : k === 0 ? C.woodLit : k === pw - 1 ? C.barkDark : C.wood2); }
      }
      for (let k = -1; k <= pw; k++) put(x0 + k, DK + 10, C.rippleHi);
    }
    // ripple lines on the front water, and big lily pads in the foreground
    for (let i = 0; i < W / 6; i++) { const y = DK + 6 + Math.round(r() * (H - DK - 7)), x = r() * W, len = 4 + r() * 18; for (let k = 0; k < len; k++) if ((k + i) % 7) put(x + k, y, k < 2 || k > len - 3 ? C.ripple : r() < 0.3 ? C.rippleHi : C.ripple); }
    for (let i = 0; i < W / 45; i++) { const cx = Math.round(r() * W), cy = Math.round(DK + 10 + r() * (H - DK - 12)); pad(cx, cy, 5 + r() * 7); }
    // foreground reeds framing the bottom corners, dark against the water
    for (const [x0, x1] of [[0, W * 0.09], [W * 0.92, W]]) for (let x = x0; x < x1; x += 1 + r() * 2.5) {
      const h = 18 + r() * 40, lean = (r() - 0.5) * 0.8;
      for (let k = 0; k < h; k++) { const xx = Math.round(x + lean * k * k / h); put(xx, H - k, k > h * 0.75 ? C.reedLit : C.reed); if (k < h * 0.5) put(xx + 1, H - k, C.mossDark); }
      if (r() < 0.25) { const tx = Math.round(x + lean * h), ty = H - h; for (let k = 0; k < 7; k++) { put(tx, ty + k, k < 2 ? C.cattailLit : C.cattail); put(tx + 1, ty + k, C.cattail); } }
    }
    this.pools = [{ x: W * 0.2, y: H - 8, w: W * 0.15 }, { x: W * 0.55, y: H - 6, w: W * 0.2 }, { x: W * 0.85, y: H - 10, w: W * 0.1 }];
    // reeds and cattails along the water's edge (thin in the middle, thick at the sides)
    for (let i = 0; i < W / 2.2; i++) {
      const x = Math.round(r() * W), side = Math.min(x, W - x) / W;
      if (side > 0.22 && r() < 0.8) continue;
      const h = (side < 0.15 ? 10 + r() * 22 : 4 + r() * 9), lean = (r() - 0.5) * 0.5, y0 = FLOOR - 1;
      for (let k = 0; k < h; k++) put(x + Math.round(lean * k * k / h), y0 - k, k > h * 0.7 ? C.reedHi : k > h * 0.3 ? C.reedLit : C.reed);
      if (h > 16 && r() < 0.5) {   // a cattail head
        const tx = x + Math.round(lean * h), ty = y0 - h;
        for (let k = 0; k < 5; k++) { put(tx, ty + k, k < 2 ? C.cattailLit : C.cattail); put(tx + 1, ty + k, C.cattail); }
        put(tx, ty - 1, C.reedHi); put(tx, ty - 2, C.reed);
      }
    }

    // 8. the great twisted trees framing both sides, branches reaching over the top
    const nearPal = { base: C.bark, lit: C.barkLit, dark: C.barkDark };
    const gnarl = (bx, dir, th) => {
      // trunk with flared roots
      for (let y = FLOOR - 26; y < FLOOR + 6; y++) {
        const f = ((y - (FLOOR - 26)) / 32) ** 2 * th * 2.2;
        for (let k = -th - f; k <= th + f; k++) { const u = (k + th + f) / (2 * (th + f)); put(bx + k, y, u < 0.2 ? C.barkLit : u > 0.75 ? C.barkDark : C.bark); }
      }
      let x = bx, y = FLOOR - 20, a = -Math.PI / 2 + dir * 0.08;
      for (let s = 0; s < 150; s++) {
        const w = th * (1 - 0.35 * s / 150) + Math.sin(s * 0.2) * 0.8;
        disc(Math.round(x), Math.round(y), w, nearPal);
        if (s % 9 === 0 && r() < 0.6) disc(Math.round(x + w * 0.4), Math.round(y), 1.2, { base: C.barkHi, lit: C.barkHi, dark: C.barkLit });   // knots
        x += Math.cos(a); y += Math.sin(a); a += Math.sin(s * 0.08) * 0.03 + (r() - 0.5) * 0.08;
        if (y < 6) break;
      }
      // the long branch arching over the top toward the middle
      limb(bx + dir * th * 0.5, 34, -Math.PI / 2 + dir * 1.05, Math.min(W * 0.3, 140), th * 0.55, 2, nearPal, 0.22, dir * -0.004);
      limb(bx + dir * th * 0.5, 80, -Math.PI / 2 + dir * 1.25, Math.min(W * 0.12, 70), th * 0.4, 1, nearPal, 0.25, dir * 0.004);
      limb(bx, 14, -Math.PI / 2 - dir * 0.6, 30, th * 0.5, 1, nearPal, 0.1);
    };
    const th = Math.max(10, Math.min(16, W / 60));
    gnarl(Math.round(th * 0.6), 1, th);
    gnarl(Math.round(W - th * 0.7), -1, th * 1.05);
    // moss hanging in long strands from the near branches
    for (const s of strands) {
      if (s.y > FLOOR - 50 || (Math.abs(s.x - W / 2) < W * 0.18 && s.y > 60)) continue;
      const len = s.len * 1.4;
      for (let k = 0; k < len; k++) {
        const x = s.x + Math.round(Math.sin(k * 0.3 + s.x * 0.7) * 1.2);
        if (k > len * 0.7 && r() < 0.4) continue;
        put(x, s.y + k, k < 2 ? C.mossDark : (k + s.x) % 5 === 0 ? C.mossHi : k % 3 ? C.moss : C.mossLit);
        if (k < len * 0.5 && r() < 0.35) put(x + 1, s.y + k, C.mossDark);
      }
    }
    // bottles and a lantern hung on ropes from the branches
    this.hangs = [];
    const hang = (x, y, len, kind) => {
      for (let k = 0; k < len; k++) put(x, y + k, C.rope);
      const by = y + len;
      if (kind === "lantern") {
        for (let k = -3; k <= 3; k++) put(x + k, by, C.lanternMetal);
        for (let yy = 1; yy < 8; yy++) for (let k = -2; k <= 2; k++) put(x + k, by + yy, Math.abs(k) === 2 || yy === 4 ? C.lanternMetal : yy < 4 ? C.lanternHi : C.lantern);
        for (let k = -3; k <= 3; k++) put(x + k, by + 8, C.lanternMetal);
        this.hangs.push({ x, y: by + 4, c: C.lantern, s: 1.6 });
      } else {
        const p = kind === "p", g = p ? C.glassP : C.glass, gh = p ? C.glassPHi : C.glassHi;
        put(x, by, C.rope); put(x, by + 1, g);
        for (let yy = 2; yy < 7; yy++) for (let k = -2; k <= 2; k++) if (!(yy === 2 && Math.abs(k) === 2)) put(x + k, by + yy, k === -1 && yy < 5 ? gh : yy > 3 ? gh : g);
        this.hangs.push({ x, y: by + 4, c: gh, s: 1 });
      }
    };
    const hx1 = W * 0.08 + th, hx2 = W * 0.92 - th;
    hang(Math.round(hx1 + 6), 34, 18, "lantern");
    hang(Math.round(hx1 + 22), 28, 30, "g");
    hang(Math.round(hx1 + 34), 24, 12, "p");
    hang(Math.round(hx2 - 8), 30, 26, "p");
    hang(Math.round(hx2 - 24), 26, 14, "g");
    if (W > 700) { hang(Math.round(W * 0.27), 18, 22, "g"); hang(Math.round(W * 0.74), 16, 34, "lantern"); }
    // dark vignette at the very top so the HP bars stay readable
    for (let y = 0; y < 30; y++) for (let x = 0; x < W; x++) if ((1 - y / 30) * 0.7 > bay(x, y) + 0.1 && get(x, y)[1] < 40) put(x, y, C.sky0);

    // 9. the fog, made once as a wrapping strip the light layer slides along
    const fog = (col, h, seed, dens) => {
      const c = document.createElement("canvas"); c.width = W; c.height = h;
      const g = c.getContext("2d"), img = g.createImageData(W, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
        const a = (x / W) * Math.PI * 2;
        const n = Math.sin(a * 2 + seed) * 0.5 + Math.sin(a * 5 + y * 0.12 + seed * 2) * 0.3 + Math.sin(a * 11 - y * 0.2 + seed) * 0.2;
        const v = Math.sin((y / h) * Math.PI) * (0.5 + n * 0.6) * dens;
        if (v > bay(x, y) + 0.1) { const o = (y * W + x) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
      }
      g.putImageData(img, 0, 0); return c;
    };
    this.fogs = [
      { c: fog(C.fogG, 34, 1, 0.75), y: HZ - 22, v: 3, a: 0.32 },
      { c: fog(C.fogP, 28, 4, 0.7), y: HZ + 8, v: -4.5, a: 0.28 },
      { c: fog(C.fogG, 24, 7, 0.6), y: FLOOR - 18, v: 6, a: 0.22 },
    ];
    this.W = W; this.HZ = HZ;
    this.wisps = Array.from({ length: Math.max(4, Math.round(W / 130)) }, () => ({ x: r() * W, y: 70 + r() * 60, p: r() * 9, s: 0.5 + r() * 0.6, rx: 20 + r() * 40 }));
    this.blips = Array.from({ length: Math.round(W / 60) }, () => ({ x: 0, y: 0, t: -r() * 6 }));
    this.gas = Array.from({ length: Math.round(W / 90) }, () => ({ x: 0, y: -1, t: r() * 8 }));
    this.smoke = Array.from({ length: 10 }, (_, i) => ({ t: i * 0.9 }));
    this.rnd = r;
  }
  animate({ g, t, dt, W, FLOOR, px }) {
    const HZ = this.HZ, r = Math.random;
    // fog banks sliding along
    for (const f of this.fogs) {
      const off = Math.round(((t * f.v) % W + W) % W);
      g.globalAlpha = f.a * (0.85 + 0.15 * Math.sin(t * 0.3 + f.v));
      g.drawImage(f.c, off, f.y); g.drawImage(f.c, off - W, f.y);
    }
    g.globalAlpha = 1;
    // the hut's window flickers, chimney smoke curls up
    const fl = 0.18 + 0.1 * Math.sin(t * 7) * Math.sin(t * 2.3) + (Math.sin(t * 13) > 0.9 ? 0.1 : 0);
    px(this.win.x - 5, this.win.y - 5, C.win, fl, 11);
    for (const s of this.smoke) {
      const k = ((t + s.t) % 9) / 9, x = this.hut.chim.x + Math.sin(k * 6 + s.t) * 3 + k * 14, y = this.hut.chim.y - k * 40;
      px(x, y, C.smoke, 0.5 * (1 - k), 2 + Math.round(k * 3));
    }
    // bottles and lantern glow
    for (const h of this.hangs) { const a = (0.14 + 0.08 * Math.sin(t * 2.2 * h.s + h.x)) * (h.s > 1 ? 1.4 : 1); px(h.x - 4, h.y - 4, h.c, a, 9); px(h.x - 2, h.y - 2, h.c, a, 5); }
    // will-o'-wisps: soft orbs drifting on lazy loops, with a faint tail and a mirror in the water
    for (const w of this.wisps) {
      const x = w.x + Math.sin(t * 0.25 * w.s + w.p) * w.rx, y = w.y + Math.sin(t * 0.6 * w.s + w.p * 2) * 12 + Math.sin(t * 2 + w.p) * 1.5;
      const pulse = 0.6 + 0.4 * Math.sin(t * 3 + w.p);
      for (let k = 1; k < 5; k++) { const tx = w.x + Math.sin((t - k * 0.12) * 0.25 * w.s + w.p) * w.rx, ty = w.y + Math.sin((t - k * 0.12) * 0.6 * w.s + w.p * 2) * 12; px(tx, ty, C.wisp, 0.25 - k * 0.05); }
      px(x - 3, y - 3, C.wisp, 0.12 * pulse, 7); px(x - 2, y - 2, C.wisp, 0.25 * pulse, 5); px(x - 1, y - 1, C.wisp, 0.6, 3); px(x, y, C.wispHi);
      const ry = 2 * HZ - y;
      if (ry > HZ && ry < FLOOR) { px(x - 1, ry - 1, C.wisp, 0.15 * pulse, 3); px(x, ry, C.wisp, 0.35); }
    }
    // bubbles surfacing on the water: a dot, then a widening ring
    for (const b of this.blips) {
      b.t += dt;
      if (b.t > 2.2) { b.t = -r() * 3; b.x = Math.round(r() * W); b.y = Math.round(HZ + 6 + r() * (FLOOR - HZ - 10)); }
      if (b.t < 0) continue;
      if (b.t < 0.5) { px(b.x, b.y - 1, C.rippleHi, 0.9); continue; }
      const k = (b.t - 0.5) / 1.7, rw = 1 + k * 7, rh = rw * 0.35, a = 0.7 * (1 - k);
      for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; px(b.x + Math.cos(an) * rw, b.y + Math.sin(an) * rh, C.rippleHi, a); }
    }
    // swamp gas: little glowing bubbles rising from the pools on the bank and wobbling up
    for (const s of this.gas) {
      s.t += dt;
      if (s.y < 0 || s.t > 7) { const p = this.pools[Math.floor(r() * this.pools.length)]; s.x = p.x + (r() - 0.5) * p.w; s.y0 = p.y; s.t = 0; s.v = 6 + r() * 6; s.y = p.y; }
      s.y = s.y0 - s.t * s.v; if (s.y < 60) s.t = 99;
      const x = s.x + Math.sin(s.t * 3) * 2, a = Math.max(0, 0.7 - s.t * 0.1);
      px(x - 1, s.y, C.gas, a); px(x + 1, s.y, C.gas, a); px(x, s.y - 1, C.gas, a); px(x, s.y + 1, C.gas, a); px(x - 1, s.y - 1, C.gasHi || C.wispHi, a * 0.6);
    }
  }
}
