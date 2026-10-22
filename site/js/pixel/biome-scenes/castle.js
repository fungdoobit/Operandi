// Module 8: the Fallen Keep. The throne hall of a castle the corruption took:
// a back wall of tall pointed windows whose stained glass is shattered (only
// coloured shards cling to the frames), the moon outside, cold beams of
// moonlight falling across the hall, an empty throne on its dais split by
// violet crystals with a sword left in the steps, clustered gothic pillars and
// ribbed arches framing it all, torn crimson banners, iron braziers burning
// violet, and a flagstone floor in perspective, cracked, with corruption veins
// and crystals pushing up through it. The light layer flickers the brazier
// flames and their glow, floats dust in the moonbeams, and pulses the
// crystals and veins.
import { PixelScene, hex } from "../scene-base.js";

const C = {
  wall0: hex("#07070c"), wall1: hex("#0e0f18"), wall2: hex("#161826"), wall3: hex("#1f2232"), mortar: hex("#08080d"), wallLit: hex("#2a2e42"),
  stone: hex("#1d202d"), stoneLit: hex("#2d3244"), stoneHi: hex("#454c64"), stoneDark: hex("#10111a"), stoneDeep: hex("#0a0a10"),
  sky: hex("#0b1230"), sky2: hex("#16224a"), star: hex("#8aa0d8"), moon: hex("#eef2ff"), moonMid: hex("#c0cce8"),
  lead: hex("#07070c"), gRed: hex("#8a1a2e"), gRedHi: hex("#d0405a"), gBlue: hex("#1c3c96"), gBlueHi: hex("#4a7ae0"), gViolet: hex("#5a2a90"), gVioletHi: hex("#9a6ae0"), gGold: hex("#a07a24"), gGoldHi: hex("#e8c050"), gGreen: hex("#1e5a46"),
  beam: hex("#9ab0e8"), beamHi: hex("#d0dcff"), pool: hex("#4a5a86"), poolHi: hex("#7a8cc0"),
  floor: hex("#191b26"), floorLit: hex("#262a3a"), floorHi: hex("#333a50"), floorDark: hex("#0e0f17"), grout: hex("#07070b"),
  banner: hex("#4a0e1a"), bannerLit: hex("#6e1a26"), bannerHi: hex("#8e2a32"), bannerDark: hex("#2a060e"), trim: hex("#8a6a2a"), trimHi: hex("#c8a040"), pole: hex("#2a2420"),
  iron: hex("#16141a"), ironLit: hex("#34303a"), ironHi: hex("#56505e"),
  cry0: hex("#2a124e"), cry1: hex("#4a2290"), cry2: hex("#7a46d8"), cry3: hex("#b48aff"), cry4: hex("#f0e2ff"),
  vein: hex("#6a32c8"), veinHi: hex("#b08aff"), glow: hex("#3a1a6a"), glow2: hex("#5a2aa0"),
  flame: hex("#8a4aff"), flameHi: hex("#c8a2ff"), flameCore: hex("#fbf4ff"), flameDeep: hex("#4a1aa0"),
  dust: hex("#c8d4ff"), steel: hex("#8a90a8"), steelHi: hex("#d0d6ec"), gold: hex("#c8a040"),
};

export class Scene extends PixelScene {
  paint({ W, H, FLOOR, put, dith, bay, r, mix, get }) {
    const BW = 150;          // where the back wall meets the floor
    const VY = 96;           // the floor's vanishing height
    const blend = (x, y, c, k) => { if (k > bay(x, y)) put(x, y, mix(get(x, y), c, 0.45)); };

    // 1. the back wall: stone courses, near-black up top, a cold haze toward the floor
    for (let y = 0; y < BW; y++) {
      const t = y / BW, row = Math.floor(y / 7), off = (row % 2) * 9 + (row * 5) % 7;
      for (let x = 0; x < W; x++) {
        const mort = y % 7 === 0 || (x + off) % 18 === 0;
        const base = t < 0.3 ? null : 0;
        if (t < 0.35) dith(x, y, C.wall0, C.wall1, t / 0.35);
        else if (t < 0.75) dith(x, y, C.wall1, C.wall2, (t - 0.35) / 0.4);
        else dith(x, y, C.wall2, C.wall3, (t - 0.75) / 0.25);
        if (mort && t > 0.25) put(x, y, C.mortar);
        else if (!mort && t > 0.4 && y % 7 === 1 && ((x + off) % 18) < 12 && ((x * 31 + row * 17) % 5) === 0) put(x, y, C.wallLit);
        void base;
      }
    }

    // 2. tall pointed windows in the back wall, glass shattered
    const winW = 30, spacing = W < 520 ? Math.max(72, W * 0.26) : Math.max(96, Math.min(130, W / 5));
    const k = Math.max(1, Math.floor((W * 0.36) / spacing)), xs = [];
    for (let j = 1; j <= k; j++) xs.push(W / 2 - j * spacing, W / 2 + j * spacing);
    this.windows = [];
    const mxs = Math.round(W / 2 - spacing + 3), mys = 64;
    for (let i = 0; i < xs.length; i++) {
      const wx = Math.round(xs[i]), ws = 66, wb = 128, hw = winW / 2;
      const inside = (x, y) => y <= wb && (y >= ws ? Math.abs(x - wx) <= hw : Math.hypot(x - (wx + hw), y - ws) <= winW && Math.hypot(x - (wx - hw), y - ws) <= winW);
      const top = Math.round(ws - winW * 0.87);
      this.windows.push({ x: wx, top, bot: wb, hw });
      // the stone surround (a deep reveal) first
      for (let y = top - 4; y <= wb + 3; y++) for (let x = wx - hw - 5; x <= wx + hw + 5; x++) {
        if (inside(x, y)) continue;
        let near = false; for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, 3], [3, -3], [-3, -3]]) if (inside(x + dx, y + dy)) near = true;
        if (near) put(x, y, x < wx ? C.stoneLit : C.stoneDark);
      }
      for (let x = wx - hw - 6; x <= wx + hw + 6; x++) { put(x, wb + 1, C.stoneHi); put(x, wb + 2, C.stoneLit); put(x, wb + 3, C.stoneDark); }   // the sill
      for (let y = top; y <= wb; y++) for (let x = wx - hw; x <= wx + hw; x++) {
        if (!inside(x, y)) continue;
        // the night outside
        let c = y < 70 ? (y + x) % 2 && y > 50 ? C.sky2 : C.sky : C.sky2;
        if ((x * 13 + y * 7) % 97 === 0) c = C.star;
        const md = Math.hypot(x - mxs, y - mys);
        if (md < 13) c = md > 11.5 ? C.moonMid : (x - mxs) + (y - mys) > 6 ? C.moonMid : C.moon;
        else if (md < 22 && (22 - md) / 9 > bay(x, y)) c = C.sky2;
        // what is left of the glass: shards cling near the frame, the middle is blown out
        let edge = 99; for (let d = 1; d < 12; d++) if (!inside(x + d, y) || !inside(x - d, y) || !inside(x, y - d) || !inside(x, y + d)) { edge = d; break; }
        const noise = Math.sin(x * 0.9 + i * 3) * 1.5 + Math.sin(y * 0.7 + x * 0.3) * 1.5 + Math.sin(y * 0.23 + i) * 2;
        const lowKeep = y > wb - 12 ? 3 : 0;
        if (edge + noise < 4.5 + lowKeep || y > wb - 3) {
          const cell = Math.floor((x - wx + 40) / 5) * 7 + Math.floor((y + 3) / 6) * 3 + i;
          const leadLine = (x - wx + 40) % 5 === 0 || (y + 3) % 6 === 0 || x === wx;
          const pal = [[C.gRed, C.gRedHi], [C.gBlue, C.gBlueHi], [C.gViolet, C.gVioletHi], [C.gGold, C.gGoldHi], [C.gBlue, C.gBlueHi], [C.gGreen, C.gBlueHi]][cell % 6];
          c = leadLine ? C.lead : (x + y) % 5 === 0 ? pal[1] : pal[0];
        }
        if (x === wx && y > ws - 4) c = C.stoneLit;                               // the mullion
        if (Math.abs(Math.hypot(x - wx, y - (ws - 8)) - 7) < 0.8) c = C.stoneLit;  // the rose ring in the arch
        put(x, y, c);
      }
    }

    // the great rose window above the throne, its glass mostly gone
    { const rx = Math.round(W / 2), ry = 62, R = 24;
      for (let y = ry - R - 5; y <= ry + R + 5; y++) for (let x = rx - R - 5; x <= rx + R + 5; x++) {
        const d = Math.hypot(x - rx, y - ry), a = Math.atan2(y - ry, x - rx);
        if (d > R + 4) continue;
        if (d > R) { put(x, y, d > R + 3 ? C.stoneDeep : (y < ry ? C.stoneLit : C.stone)); continue; }
        const spoke = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.44 && d > 6;
        const ring = Math.abs(d - 6) < 1 || Math.abs(d - 15) < 0.8;
        let c = (x * 13 + y * 7) % 89 === 0 ? C.star : y < ry - 6 ? C.sky : C.sky2;
        const petal = Math.floor(((a + Math.PI) / (Math.PI / 6))), glassy = d > R - 4 - 3 * Math.sin(petal * 2.3) || (d < 6 && petal % 3 !== 0) || (d > 15 && petal % 4 === 1);
        if (glassy) { const pal = [[C.gRed, C.gRedHi], [C.gBlue, C.gBlueHi], [C.gViolet, C.gVioletHi], [C.gGold, C.gGoldHi]][(petal + (d > 15 ? 1 : 0)) % 4]; c = (x + y) % 4 === 0 ? pal[1] : pal[0]; }
        if (spoke || ring) c = C.stoneLit;
        put(x, y, c);
      }
      this.windows.push({ x: rx, top: ry - R + 4, bot: ry + R, hw: 12, rose: true });
    }

    // 3. the dais and the empty throne, split by crystals, a sword left in the steps
    const tx = Math.round(W / 2), tb = BW + 2;
    for (let s = 0; s < 3; s++) {
      const half = 44 - s * 9, y0 = tb - s * 4;
      for (let y = y0 - 4; y < y0; y++) for (let x = tx - half; x <= tx + half; x++) put(x, y, y === y0 - 4 ? C.stoneHi : y === y0 - 3 ? C.stoneLit : C.stone);
    }
    const seat = tb - 12;
    for (let y = seat - 52; y < seat; y++) for (let x = tx - 12; x <= tx + 12; x++) {
      const dx = Math.abs(x - tx), spire = y < seat - 38 ? (dx < 2 || (Math.abs(dx - 9) < 2 && y > seat - 46)) && y > seat - 52 + dx * 0.3 : true;
      if (!spire) continue;
      const back = y < seat - 14, inner = dx < 8 && y > seat - 36 && y < seat - 14;
      put(x, y, inner ? C.bannerDark : dx === 12 || x === tx - 8 ? C.stoneLit : back ? (dx > 9 ? C.stoneDark : C.stone) : C.stone);
    }
    for (let x = tx - 14; x <= tx + 14; x++) { put(x, seat - 14, C.stoneHi); put(x, seat - 13, C.stoneLit); }   // the seat
    for (let y = seat - 18; y < seat - 14; y++) for (const ax of [-13, 13]) put(tx + ax, y, C.stoneLit);           // armrests
    put(tx, seat - 50, C.gold); put(tx - 9, seat - 44, C.gold); put(tx + 9, seat - 44, C.gold);
    // a crack through the throne, crystals bursting out of it
    { let x = tx + 2, y = seat - 40; for (let k = 0; k < 34; k++) { put(x, y, C.cry1); x += r() < 0.5 ? 1 : -1; y += 1; } }
    // the sword, stuck in the top step
    for (let k = 0; k < 14; k++) put(tx - 26, tb - 9 - k, k < 10 ? (k % 3 ? C.steel : C.steelHi) : C.iron);
    for (let k = -3; k <= 3; k++) put(tx - 26 + k, tb - 19, C.gold);
    put(tx - 26, tb - 23, C.gold);

    // 4. the flagstone floor in perspective: staggered slabs, each its own tone, lit at the back
    const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const tones = [C.floorDark, C.floor, C.floor, C.floorLit];
    for (let y = BW; y < H; y++) {
      const d = y - VY, z = 1100 / d, row = Math.floor(z / 1.4), rf = z / 1.4 - row, t = (y - BW) / (H - BW);
      for (let x = 0; x < W; x++) {
        if (y === BW) { put(x, y, C.stoneDark); continue; }
        const u = ((x - W / 2) / d) * 2.6 + (row % 2) * 0.5 + 100, col = Math.floor(u), cf = u - col;
        const groutW = 1.2 / (d * 0.32);   // ~1 px wide at any depth
        if (cf < groutW || rf > 1 - 1100 / (d * d * 1.4)) { put(x, y, C.grout); continue; }
        const h = hash(row, col), tone = tones[Math.floor(h * 4)], hi = rf < 0.12 ? 1 : 0;   // the slab's far edge catches light
        let c = hi ? mix(tone, C.floorHi, 0.6) : tone;
        if (h > 0.85 && Math.sin(x * 0.6 + y * 1.9) > 0.7) c = C.floorDark;   // worn pits
        dith(x, y, c, mix(c, C.floorDark, 0.7), t * 0.7);
      }
    }
    // a strip of carpet running from the dais toward the viewer, rotted to tatters
    for (let y = BW; y < H; y++) {
      const d = y - VY, half = d * 0.28;
      for (let x = Math.round(W / 2 - half); x <= W / 2 + half; x++) {
        const u = (x - W / 2) / half, rot = Math.sin(x * 0.4 + y * 0.9) + Math.sin(y * 0.21 + x * 0.05) * 1.5;
        if (rot > 1.3 || (y > FLOOR + 10 && rot > 0.6)) continue;
        put(x, y, Math.abs(u) > 0.82 ? C.trim : Math.abs(u) > 0.74 ? C.bannerDark : (x + y) % 4 === 0 ? C.bannerLit : C.banner);
      }
    }

    // 5. moonlight: beams falling from each window across the hall, pooling on the floor
    const slope = 0.42;
    for (const w of this.windows) {
      for (let y = w.top + 6; y < H; y++) {
        const dy = y - w.top, x0 = w.x - w.hw + dy * slope, x1 = w.x + w.hw + dy * slope;
        const groundY = BW + 18;   // where this beam lands
        if (y > groundY + 18) break;
        for (let x = Math.round(x0); x <= x1; x++) {
          const across = (x - x0) / (x1 - x0), soft = Math.min(1, Math.min(across, 1 - across) * 5);
          if (y < groundY) blend(x, y, C.beam, soft * (0.32 - 0.12 * (dy / (groundY - w.top))));
          else {
            const k = soft * (1 - (y - groundY) / 18) * 0.85;
            if (k > bay(x, y)) put(x, y, get(x, y)[0] < 15 ? C.pool : mix(get(x, y), k > 0.55 ? C.poolHi : C.pool, 0.6));
          }
        }
      }
    }

    // 6. clustered gothic pillars: a middle pair, and huge near ones framing the sides
    const pillar = (cx, base, top, w, near) => {
      const shafts = near ? 5 : 4;
      for (let y = top; y < base; y++) for (let x = -w; x <= w; x++) {
        const u = (x + w) / (2 * w), sh = Math.floor(u * shafts), sf = u * shafts - sh;
        let c = sf < 0.18 ? C.stoneHi : sf < 0.5 ? C.stoneLit : sf > 0.85 ? C.stoneDeep : C.stone;
        if (u > 0.7) c = sf < 0.18 ? C.stoneLit : sf > 0.6 ? C.stoneDeep : C.stoneDark;
        if (near) c = mix(c, C.stoneDeep, 0.2);
        if ((y * 7 + x * 3) % 41 === 0) c = C.stoneDark;   // chips
        put(cx + x, y, c);
      }
      // base plinth and capital
      for (let y = base - 8; y < base; y++) for (let x = -w - 3; x <= w + 3; x++) put(cx + x, y, y === base - 8 ? C.stoneHi : x > w * 0.4 ? C.stoneDark : near ? C.stoneDark : C.stone);
      const capY = top + (near ? 34 : 18);
      for (let y = capY; y < capY + 6; y++) for (let x = -w - 4 + (y - capY); x <= w + 4 - (y - capY); x++) put(cx + x, y, y === capY ? C.stoneHi : (x + y) % 3 === 0 ? C.stoneDark : near ? C.stoneDark : C.stoneLit);
    };
    const mpL = Math.round(W * 0.17), mpR = Math.round(W * 0.83), mpBase = BW + 10, mw = 9;
    // the arches between the middle pillars: ribbed pointed arches across the vault
    const arch = (xa, xb, spring, rib, col) => {
      const span = xb - xa, R = span * 0.95;
      for (let x = xa; x <= xb; x++) {
        const ya = spring - Math.sqrt(Math.max(0, R * R - (x - (xa + R)) ** 2)) * (x < xa + span / 2 ? 1 : 0), yb = spring - Math.sqrt(Math.max(0, R * R - (x - (xb - R)) ** 2)) * (x >= xa + span / 2 ? 1 : 0);
        const yy = Math.round(Math.max(x < xa + span / 2 ? ya : yb, -40));
        for (let k = 0; k < rib; k++) put(x, yy + k, k === rib - 1 ? col.lit : k === 0 ? col.dark : col.base);
        for (let y = -1; y < yy; y++) if (y >= 0) put(x, y, get(x, y)[0] > 40 ? C.wall0 : mix(get(x, y), C.wall0, 0.5));   // the vault above is dark
      }
    };
    pillar(mpL, mpBase, 0, mw, false); pillar(mpR, mpBase, 0, mw, false);
    arch(mpL, mpR, 70, 6, { base: C.stone, lit: C.stoneLit, dark: C.stoneDeep });
    // torn banners hanging from the middle pillars
    const banner = (cx, top, len, bw) => {
      for (let x = -bw / 2 - 3; x <= bw / 2 + 3; x++) { put(cx + x, top - 1, C.pole); put(cx + x, top, C.ironLit); }
      put(cx - bw / 2 - 4, top, C.trimHi); put(cx + bw / 2 + 4, top, C.trimHi);
      const holes = Array.from({ length: 3 }, () => ({ x: (r() - 0.5) * bw * 0.6, y: top + 10 + r() * len * 0.7, r: 1 + r() * 2.5 }));
      for (let y = top + 1; y < top + len + 8; y++) for (let x = -bw / 2; x <= bw / 2; x++) {
        const u = (x + bw / 2) / bw, cut = top + len - Math.abs(x) * 0.9 + Math.sin(x * 1.7 + cx) * 3 + (r() < 0.1 ? -3 : 0);
        if (y > cut) continue;
        if (holes.some((h) => Math.hypot(x - h.x, (y - h.y) * 0.7) < h.r)) continue;
        const sway = Math.round(Math.sin((y - top) * 0.08) * 1.2 * ((y - top) / len));
        const fold = Math.sin(x * 0.9 + 1) > 0.5;
        let c = u < 0.12 || u > 0.88 ? C.trim : fold ? C.bannerLit : u > 0.6 ? C.bannerDark : C.banner;
        // a faded crown emblem
        const ey = y - (top + 18), ex = x;
        if (ey > 0 && ey < 9 && Math.abs(ex) < 5 && (ey > 5 || (Math.abs(ex) % 2 === 0 && ey > 2 - (Math.abs(ex) === 0 ? 2 : 0)))) c = (x + y) % 3 ? C.trim : C.trimHi;
        if (y > cut - 2) c = C.bannerDark;
        put(cx + x + sway, y, c);
      }
    };
    const bo = W < 520 ? -(mw + 9) : mw + 12;
    banner(mpL + bo, 74, 56, W < 520 ? 10 : 14);
    banner(mpR - bo, 74, 48, W < 520 ? 10 : 14);
    if (W > 760) { banner(Math.round(W / 2 - spacing / 2), 50, 40, 10); banner(Math.round(W / 2 + spacing / 2), 50, 46, 10); }

    // 7. violet corruption: crystal clusters bursting from the floor, veins between them
    this.glows = [];
    const crystal = (cx, base, hgt, wdt, lean) => {
      for (let y = 0; y < hgt; y++) {
        const half = Math.max(0, wdt * (1 - (y / hgt) ** 1.4));
        for (let k = -Math.ceil(half); k <= Math.ceil(half); k++) {
          const x = Math.round(cx + k + y * lean), yy = Math.round(base - y);
          put(x, yy, Math.abs(k) >= half - 0.5 ? C.cry0 : k < -half * 0.4 ? C.cry3 : k <= 0 ? C.cry4 : k < half * 0.5 ? C.cry2 : C.cry1);
        }
      }
    };
    const cluster = (cx, base, s) => {
      crystal(cx, base, 30 * s, 5 * s, -0.12); crystal(cx + 7 * s, base, 20 * s, 3.6 * s, 0.32); crystal(cx - 7 * s, base, 16 * s, 3 * s, -0.42);
      if (s > 0.7) crystal(cx + 13 * s, base, 10 * s, 2.4 * s, 0.6);
      this.glows.push({ x: cx, y: base - 12 * s, s });
    };
    // veins first, so the crystals sit on top of them
    this.veins = [];
    for (let i = 0; i < 6 + W / 120; i++) {
      let x = r() * W, y = BW + 4 + r() * (H - BW - 6), a = r() * 6;
      const pts = [];
      for (let s = 0; s < 20 + r() * 40; s++) { put(Math.round(x), Math.round(y), C.grout); put(Math.round(x), Math.round(y) - 1, s % 4 ? C.vein : C.veinHi); pts.push([Math.round(x), Math.round(y) - 1]); x += Math.cos(a) * 1.3; y += Math.sin(a) * 0.5; a += (r() - 0.5) * 0.8; }
      this.veins.push(pts);
    }
    cluster(tx + 10, seat - 14, 0.7); cluster(tx - 30, tb - 7, 0.45); crystal(tx + 3, seat - 30, 14, 2.5, 0.25);
    for (const [fx, base, s] of [[0.04, H + 2, 1.3], [0.11, FLOOR + 4, 0.75], [0.27, BW + 8, 0.45], [0.7, BW + 6, 0.4], [0.92, FLOOR + 2, 0.9], [0.97, H + 4, 1.1], [0.6, H + 6, 0.6]]) cluster(Math.round(W * fx), base, s);

    // 8. iron braziers beside the middle pillars (their flames are in the light layer)
    this.braziers = [];
    const brazier = (bx, by) => {
      for (let k = 0; k < 22; k++) { put(bx - 7 + Math.round(k * 0.22), by - k, C.iron); put(bx + 7 - Math.round(k * 0.22), by - k, C.iron); put(bx, by - k, k % 5 ? C.iron : C.ironLit); put(bx - 1, by - k, C.ironLit); }
      for (let x = -8; x <= 8; x++) { put(bx + x, by, C.ironLit); put(bx + x, by - 11, Math.abs(x) < 5 ? C.iron : C.iron); }
      for (let y = 0; y < 7; y++) for (let x = -11 + y; x <= 11 - y; x++) put(bx + x, by - 29 + y, y === 0 ? C.ironHi : y === 1 ? C.ironLit : x < -3 ? C.ironLit : C.iron);
      for (const sx of [-11, 11]) { put(bx + sx, by - 30, C.ironHi); put(bx + sx, by - 31, C.ironLit); }   // little horns on the rim
      for (let x = -9; x <= 9; x++) put(bx + x, by - 30, C.flameDeep);   // embers in the bowl
      // the violet glow it throws on the floor and pillar
      for (let y = by - 60; y < by + 14; y++) for (let x = bx - 44; x <= bx + 44; x++) {
        const k = (1 - Math.hypot((x - bx) / 44, (y - by + 20) / 40)) * 0.6;
        if (k > 0 && k > bay(x, y) + 0.05 && get(x, y)[2] < 120) put(x, y, mix(get(x, y), C.glow2, 0.4));
      }
      this.braziers.push({ x: bx, y: by - 31 });
    };
    brazier(mpL + 24, BW + 14); brazier(mpR - 24, BW + 14);

    // 9. rubble: fallen blocks and a broken column drum
    for (let i = 0; i < W / 45; i++) {
      const x = r() * W, y = BW + 6 + r() * (H - BW - 8), s = 0.6 + (y - BW) / 60;
      if (Math.abs(x - W / 2) < W * 0.2 && y < FLOOR + 6 && y > FLOOR - 12) continue;
      const w = Math.round((3 + r() * 5) * s), h = Math.round((2 + r() * 3) * s);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) put(x + xx, y - yy, yy === h - 1 ? C.stoneHi : xx === 0 ? C.stoneLit : xx > w - 2 ? C.stoneDeep : C.stone);
    }
    { const dx = Math.round(W * 0.36), dy = H - 6, R = 7;   // a column drum lying on its side
      for (let x = -14; x <= 14; x++) for (let y = -R; y <= R; y++) put(dx + x, dy + y, y < -R + 2 ? C.stoneHi : y < 0 ? C.stoneLit : y > R - 2 ? C.stoneDeep : C.stone);
      for (let y = -R; y <= R; y++) for (let x = 0; x < 4; x++) if (x * x * 3 + y * y <= R * R) put(dx + 14 + x, dy + y, x === 0 ? C.stoneHi : C.stoneLit);
    }

    // 10. the near pillars and the great arch framing the view
    const nw = Math.max(14, Math.min(26, W * 0.03));
    pillar(Math.round(nw * 0.4), H, 0, nw, true); pillar(Math.round(W - nw * 0.4), H, 0, nw, true);
    for (let x = 0; x < W; x++) {   // the near arch: a deep soffit along the top
      const u = (x / W) * 2 - 1, y1 = Math.round(26 + (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 70 * (Math.abs(u) > 0.92 ? 1.8 : 1));
      for (let y = 0; y < Math.min(y1, 200); y++) put(x, y, y > y1 - 3 ? C.stoneLit : y > y1 - 5 ? C.stone : (y + x) % 9 === 0 ? C.stoneDeep : C.wall0);
      if (y1 < 200) put(x, y1, C.stoneDeep);
    }

    const sprite = (R, col) => {
      const c = document.createElement("canvas"); c.width = c.height = R * 2;
      const g = c.getContext("2d"), img = g.createImageData(R * 2, R * 2);
      for (let y = 0; y < R * 2; y++) for (let x = 0; x < R * 2; x++) {
        const k = Math.max(0, 1 - Math.hypot(x - R + 0.5, y - R + 0.5) / R) ** 1.4;
        if (k > bay(x, y)) { const o = (y * R * 2 + x) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
      }
      g.putImageData(img, 0, 0); return c;
    };
    this.fireGlow = sprite(30, C.flame); this.fireCore = sprite(12, C.flameHi);
    for (const gl of this.glows) gl.spr = sprite(Math.max(6, Math.round(16 * gl.s)), C.cry2);
    this.dust = Array.from({ length: Math.round(W / 6) }, () => ({ w: Math.floor(r() * this.windows.length), a: r(), b: r(), p: r() * 9, v: 0.5 + r() }));
    this.BW = BW; this.slope = slope;
  }
  animate({ g: g2, t, dt, px }) {
    const r = Math.random;
    // brazier flames: flickering violet tongues with a white core, and a pulsing glow
    for (const b of this.braziers) {
      const g = 0.2 + 0.06 * Math.sin(t * 9 + b.x) + 0.04 * Math.sin(t * 23);
      g2.globalAlpha = g * 1.4; g2.drawImage(this.fireGlow, b.x - 30, b.y - 36); g2.globalAlpha = g * 1.6; g2.drawImage(this.fireCore, b.x - 12, b.y - 16); g2.globalAlpha = 1;
      for (let k = -8; k <= 8; k++) {
        const h = Math.max(1, Math.round((13 - Math.abs(k) * 1.4) * (0.75 + 0.35 * Math.sin(t * 12 + k * 1.9) + 0.2 * Math.sin(t * 7.3 - k))));
        for (let j = 0; j < h; j++) {
          const f = j / h, c = Math.abs(k) < 2 && f < 0.5 ? C.flameCore : f < 0.6 && Math.abs(k) < 4 ? C.flameHi : f > 0.85 ? C.flameDeep : C.flame;
          px(b.x + k + Math.round(Math.sin(t * 8 + j * 0.5) * f * 1.5), b.y - j, c, 0.95);
        }
      }
      if (Math.sin(t * 5 + b.x) > 0.6) px(b.x + (r() - 0.5) * 8, b.y - 12 - r() * 12, C.flameHi, 0.9);   // sparks
    }
    // crystals pulse, veins shimmer in a slow wave
    for (const gl of this.glows) { g2.globalAlpha = 0.14 + 0.1 * Math.sin(t * 1.4 + gl.x * 0.1); g2.drawImage(gl.spr, Math.round(gl.x - gl.spr.width / 2), Math.round(gl.y - gl.spr.height / 2)); } g2.globalAlpha = 1;
    for (const v of this.veins) for (let i = 0; i < v.length; i++) {
      const k = Math.sin(t * 2.2 - i * 0.35 + v[0][0]);
      if (k > 0.75) px(v[i][0], v[i][1], C.veinHi, (k - 0.75) * 3.5);
    }
    // dust motes turning slowly in the moonbeams
    for (const d of this.dust) {
      const w = this.windows[d.w]; if (!w) continue;
      d.b += dt * 0.02 * d.v; if (d.b > 1) d.b = 0;
      const y = w.top + 20 + (1 - d.b) * (this.BW - w.top - 10), dy = y - w.top;
      const x = w.x - w.hw + dy * this.slope + d.a * w.hw * 2 + Math.sin(t * 0.5 * d.v + d.p) * 3;
      const a = 0.35 + 0.35 * Math.sin(t * 2 * d.v + d.p);
      if (a > 0.1) px(x, y, C.dust, a);
    }
  }
}
