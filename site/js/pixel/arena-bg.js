// Boss 1's arena, "The Sunken Foundry" (PRD Addendum I): a ruined data foundry
// in a cavern, in hi-bit pixel art to match GOLEM and NOVA.
//   back:   cavern rock, purple light shafts through a broken ceiling vent,
//           silhouetted server towers with tiny status lights
//   middle: hanging cables, broken pipes, cyan ice crystals (GOLEM's ice), fog
//   floor:  cracked metal grating; the cracks glow faintly orange
// The scene is drawn once (per size) straight in pixels, with ordered dithering
// for the gradients. A light layer on top animates at 15 fps: blinking lights,
// dust drifting up, and the odd spark from a broken cable.
// Art height is always 220 px (the stage is designed at 440 px tall, and one art
// pixel is 2 design pixels), so the floor line is always at y = 176.

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const HA = 220, FLOOR = 176;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const C = {
  void: hex("#06070c"), deep: hex("#0b0c16"), cave: hex("#121426"), haze: hex("#211a3c"), hazeHi: hex("#3a2a62"),
  rock: hex("#0d0e18"), rockLit: hex("#1a1a2c"), tower: hex("#111523"), towerEdge: hex("#1d2336"),
  shaft: hex("#5b45a8"), cable: hex("#07080d"), pipe: hex("#1c2230"), pipeLit: hex("#2f3a4e"), pipeDark: hex("#0d1018"),
  ice: hex("#1d4794"), iceMid: hex("#3274d0"), iceLit: hex("#9fd2ff"), iceWhite: hex("#e6f6ff"),
  fog: hex("#2a2440"), floor: hex("#141922"), floorLit: hex("#222b3a"), lip: hex("#3a465c"), grate: hex("#0a0d13"),
  crack: hex("#05060a"), ember: hex("#e07a10"), emberHi: hex("#ffb040"),
  cyan: hex("#5fe3ff"), amber: hex("#ffb040"), red: hex("#ff5a5a"), dust: hex("#8d7fc4"),
};

// A small seeded random, so the scene looks the same every time.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class FoundryBG {
  constructor(stage) {
    this.stage = stage;
    this.base = document.createElement("canvas");
    this.top = document.createElement("canvas");
    for (const c of [this.base, this.top]) {
      c.className = "arena-bg";
      Object.assign(c.style, { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" });
    }
    this.top.style.zIndex = 0;
    stage.prepend(this.top);
    stage.prepend(this.base);
    this.tick = this.tick.bind(this);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(stage);
    requestAnimationFrame(this.tick);
  }

  resize() {
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (!W || !H) return;
    const wa = Math.max(64, Math.round((W / H) * HA));
    if (wa === this.wa) return;
    this.wa = wa;
    for (const c of [this.base, this.top]) { c.width = wa; c.height = HA; }
    this.draw();
  }

  // ---------- the still scene ----------
  draw() {
    const W = this.wa, H = HA, img = new ImageData(W, H), d = img.data;
    const r = rng(7);
    const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
    const bay = (x, y) => B4[(y & 3) * 4 + (x & 3)];
    // mix two colours by k (0..1) with dithering
    const dith = (x, y, a, b, k) => put(x, y, k > bay(x, y) ? b : a);

    // 1. cavern air: dark at the top, a purple haze rising toward the horizon
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
      const t = y / FLOOR;
      if (t < 0.45) dith(x, y, C.void, C.deep, t / 0.45);
      else if (t < 0.8) dith(x, y, C.deep, C.cave, (t - 0.45) / 0.35);
      else dith(x, y, C.cave, C.haze, (t - 0.8) / 0.2);
    }
    // 2. light shafts falling from a broken vent in the ceiling
    const vent = W * 0.58;
    for (let i = 0; i < 4; i++) {
      const x0 = vent + (i - 1.5) * 14, slope = 0.35 + i * 0.05, wdt = 6 + i * 3;
      for (let y = 0; y < FLOOR; y++) for (let k = -wdt; k <= wdt; k++) {
        const x = Math.round(x0 + y * slope + k), fade = (1 - Math.abs(k) / (wdt + 1)) * (1 - 0.6 * y / FLOOR) * 0.6;
        if (fade > bay(x, y) + 0.12 && x >= 0 && x < W) put(x, y, C.shaft);
      }
    }
    // 3. cavern ceiling with stalactites, and rock walls at the edges
    for (let x = 0; x < W; x++) {
      const h = 10 + 6 * Math.sin(x * 0.07) + 4 * Math.sin(x * 0.23 + 1) + (r() < 0.08 ? 10 + r() * 22 : 0);
      for (let y = 0; y < h; y++) put(x, y, y > h - 2 ? C.rockLit : C.rock);
    }
    for (let y = 0; y < FLOOR; y++) {
      const L = 6 + 5 * Math.sin(y * 0.09) + 3 * Math.sin(y * 0.31), R = 6 + 5 * Math.sin(y * 0.08 + 2) + 3 * Math.sin(y * 0.27);
      for (let x = 0; x < L; x++) put(x, y, x > L - 2 ? C.rockLit : C.rock);
      for (let x = W - R; x < W; x++) put(Math.floor(x), y, x < W - R + 1 ? C.rockLit : C.rock);
    }
    // the vent itself: a ragged hole of purple light in the ceiling
    for (let x = -12; x <= 12; x++) for (let y = 0; y < 8; y++) if (Math.abs(x) < 12 - y * 0.8) put(Math.round(vent + x), 6 + y, y < 3 ? C.hazeHi : C.shaft);
    // 4. server towers in the distance (some broken and leaning), with status lights
    this.lights = [];
    let x = 10;
    while (x < W - 10) {
      // server racks: wide cabinets with slot lines, a light column, some broken and leaning
      const w = 14 + Math.floor(r() * 14), h = 50 + Math.floor(r() * 60), lean = r() < 0.3 ? (r() - 0.5) * 0.3 : 0, broken = r() < 0.35;
      const top = FLOOR - 18 - h, lightCol = 2 + Math.floor(r() * 3);
      for (let yy = top; yy < FLOOR - 14; yy++) {
        const off = Math.round((FLOOR - 14 - yy) * lean);
        const jag = broken && yy < top + 8 ? Math.floor(r() * w * 0.7) : 0;
        const slot = (yy - top) % 4 === 0;
        for (let xx = jag; xx < w; xx++) put(x + xx + off, yy, xx === 0 || xx === w - 1 ? C.towerEdge : slot ? C.deep : C.tower);
        if ((yy - top) % 4 === 2 && r() < 0.45) this.lights.push({ x: x + lightCol + off, y: yy, c: r() < 0.65 ? C.cyan : r() < 0.7 ? C.amber : C.red, p: r() * 6, s: 0.4 + r() * 2 });
      }
      x += w + 8 + Math.floor(r() * 26);
    }
    // a giant broken cooling fan set into the back wall
    const fx0 = Math.round(W * 0.3), fy0 = 74, fr = 36;
    for (let yy = -fr - 4; yy <= fr + 4; yy++) for (let xx = -fr - 4; xx <= fr + 4; xx++) {
      const dd = Math.hypot(xx, yy), a = Math.atan2(yy, xx);
      if (dd <= fr + 4 && dd > fr) put(fx0 + xx, fy0 + yy, dd > fr + 2 ? C.towerEdge : C.pipeLit);        // the housing ring
      else if (dd <= fr) {
        const blade = Math.sin(a * 5 + dd * 0.06) > 0.55 && dd > 6 && !(a > 0.6 && a < 1.5 && dd > 20);   // one blade snapped off
        put(fx0 + xx, fy0 + yy, dd < 6 ? C.pipeLit : blade ? (yy < 0 ? C.pipeLit : C.pipe) : C.deep);
      }
    }
    for (let k = -fr; k <= fr; k += 6) put(fx0 + k, fy0 - Math.round(Math.sqrt(Math.max(0, fr * fr - k * k))) - 2, C.amber);   // bolts
    // 5. fog over the bottom of the towers
    for (let y = FLOOR - 34; y < FLOOR; y++) for (let x2 = 0; x2 < W; x2++) {
      const k = ((y - (FLOOR - 34)) / 34) * (0.55 + 0.2 * Math.sin(x2 * 0.05 + y * 0.1));
      if (k > bay(x2, y) + 0.1) put(x2, y, C.fog);
    }
    // 6. broken pipes across the middle distance
    const pipes = [[0.04, 0.42, 70, 4], [0.66, 0.97, 92, 5], [0.2, 0.36, 128, 3]];
    for (const [a, b, py, th] of pipes) {
      for (let px = Math.round(a * W); px < b * W; px++) {
        for (let t = 0; t < th; t++) put(px, py + t, t === 0 ? C.pipeLit : t === th - 1 ? C.pipeDark : C.pipe);
        if (px % 23 === 0) for (let t = -1; t <= th; t++) put(px, py + t, C.pipeLit);   // joints
      }
      // a jagged broken end
      for (let t = 0; t < th; t++) put(Math.round(b * W) + (t % 2), py + t, C.pipeDark);
    }
    // 7. cables hanging from the ceiling in long sags
    this.cables = [];
    for (let i = 0; i < 6; i++) {
      const xa = r() * W, xb = xa + 30 + r() * 80, ya = 8 + r() * 14, sag = 30 + r() * 50;
      for (let s = 0; s <= 1; s += 1 / (xb - xa)) {
        const cx = xa + (xb - xa) * s, cy = ya + Math.sin(s * Math.PI) * sag;
        put(Math.round(cx), Math.round(cy), C.cable); put(Math.round(cx), Math.round(cy) + 1, C.cable);
      }
      if (i < 2) {   // a snapped one dangling, which sparks now and then
        const dx = Math.round(xa + (xb - xa) * 0.35), dy = Math.round(ya + Math.sin(0.35 * Math.PI) * sag);
        for (let k = 0; k < 18 + i * 8; k++) put(dx + Math.round(Math.sin(k * 0.2) * 1.5), dy + k, C.cable);
        this.cables.push({ x: dx, y: dy + 18 + i * 8 });
      }
    }
    // 8. ice crystal clusters on both sides
    const crystal = (cx, base, hgt, wdt, lean) => {
      for (let y = 0; y < hgt; y++) {
        const half = Math.max(0, wdt * (1 - y / hgt));
        for (let k = -Math.ceil(half); k <= Math.ceil(half); k++) {
          const px2 = Math.round(cx + k + y * lean), py2 = base - y;
          const side = k < 0 ? C.iceLit : k === 0 ? C.iceWhite : k < half * 0.5 ? C.iceMid : C.ice;
          put(px2, py2, Math.abs(k) >= half - 0.5 ? C.ice : side);
        }
      }
    };
    for (const [fx, sc] of [[0.06, 1], [0.13, 0.6], [0.9, 0.9], [0.95, 0.55], [0.47, 0.4]]) {
      const cx = W * fx;
      crystal(cx, FLOOR, 46 * sc, 6 * sc, -0.15);
      crystal(cx + 9 * sc, FLOOR, 30 * sc, 4.5 * sc, 0.25);
      crystal(cx - 9 * sc, FLOOR, 22 * sc, 3.5 * sc, -0.35);
    }
    // 9. the floor: a metal grating in perspective, a bright lip, glowing cracks
    for (let y = FLOOR; y < H; y++) {
      const t = (y - FLOOR) / (H - FLOOR);
      for (let x2 = 0; x2 < W; x2++) {
        let c = t < 0.06 ? C.lip : null;
        if (!c) {
          // planks get wider toward the viewer; slits converge on the middle
          const u = (x2 - W / 2) / (0.35 + t), slit = Math.abs(((u / 14) % 1 + 1) % 1 - 0.5) < 0.05;
          const row = Math.abs(((t * 7) % 1) - 0.5) < 0.06;
          c = slit || row ? C.grate : null;
          if (!c) { dith(x2, y, C.floorLit, C.floor, t * 1.4); continue; }
        }
        put(x2, y, c);
      }
    }
    for (let i = 0; i < 5; i++) {
      let cx = W * (0.15 + 0.7 * r()), cy = FLOOR + 6 + r() * 30;
      for (let s = 0; s < 26; s++) {
        put(Math.round(cx), Math.round(cy), C.crack);
        if (s % 3 === 0) put(Math.round(cx), Math.round(cy) - 1, s % 6 ? C.ember : C.emberHi);
        cx += (r() - 0.3) * 3; cy += (r() - 0.5) * 1.6;
      }
    }
    // light from the shafts pooling on the floor
    for (let y = FLOOR; y < FLOOR + 14; y++) for (let x2 = Math.round(vent + 40); x2 < vent + 130 && x2 < W; x2++) {
      const k = (1 - Math.abs(x2 - vent - 85) / 45) * (1 - (y - FLOOR) / 14) * 0.5;
      if (k > bay(x2, y)) put(x2, y, C.shaft);
    }
    // dark steel girders framing the sides, with rivets
    for (const gx of [4, W - 16]) {
      for (let y = 0; y < FLOOR + 4; y++) for (let k = 0; k < 12; k++) {
        const edge = k === 0 || k === 11, web = k > 3 && k < 8;
        put(gx + k, y, edge ? C.pipeLit : web ? C.pipeDark : C.pipe);
        if (y % 12 === 6 && (k === 2 || k === 9)) put(gx + k, y, C.towerEdge);
      }
      for (let y = 10; y < FLOOR; y += 34) for (let k = 0; k < 12; k++) { put(gx + k, y, C.pipeLit); put(gx + k, y + 1, C.pipeDark); }
    }
    this.base.getContext("2d").putImageData(img, 0, 0);
    // dust motes for the light layer
    this.dust = Array.from({ length: Math.round(W / 14) }, () => ({ x: r() * W, y: r() * FLOOR, v: 2 + r() * 5, p: r() * 6 }));
    this.sparks = [];
  }

  // ---------- the moving bits, 15 fps ----------
  tick(now) {
    if (!this.stage.isConnected) return;
    requestAnimationFrame(this.tick);
    if (now - (this.lastDraw || 0) < 66) return;
    const dt = Math.min(0.2, (now - (this.lastDraw || now)) / 1000);
    this.lastDraw = now;
    if (!this.lights) return;
    const t = now / 1000, g = this.top.getContext("2d");
    g.clearRect(0, 0, this.wa, HA);
    const px = (x, y, c, a = 1) => { g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    for (const l of this.lights) if (Math.sin(t * l.s + l.p) > -0.2) px(l.x, l.y, l.c);
    for (const m of this.dust) {
      m.y -= m.v * dt; if (m.y < 10) m.y = FLOOR - 2;
      px(m.x + Math.sin(t * 0.7 + m.p) * 3, m.y, C.dust, 0.55);
    }
    // a snapped cable spits sparks now and then
    for (const c of this.cables) if (Math.random() < 0.03) for (let i = 0; i < 6; i++) this.sparks.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 30, life: 0.4 });
    this.sparks = this.sparks.filter((s) => {
      s.life -= dt; s.vy += 120 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      px(s.x, s.y, s.life > 0.2 ? C.emberHi : C.ember);
      return s.life > 0;
    });
  }
}
