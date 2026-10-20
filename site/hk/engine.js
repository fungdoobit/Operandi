// Battle stage for the hand-drawn, Hollow Knight-inspired concept.
//
// Everything (cavern, characters, effects) lives in ONE big SVG, so a slash,
// a shot or a swarm can fly from one character to the other in the same
// coordinates. Three ideas carry the feel:
//   - Clock: game time. A "hit-stop" freezes it for a few frames on impact,
//     which is what makes hits feel heavy.
//   - Puppet: a character is a set of body parts (head, arms, body) that are
//     moved with short tweens: a held anticipation pose, then a very fast strike.
//   - Effects: ink bursts, orange blobs, soul wisps, slashes, shockwaves, all
//     simple particles that also freeze during hit-stop.

export const NS = "http://www.w3.org/2000/svg";
export const W = 1200, H = 520, GROUND = 432;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
}

export const EASE = {
  linear: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  snap: (t) => 1 - Math.pow(2, -10 * t),
};

// Game time. wait() resolves in game time, so hit-stop pauses every sequence.
export class Clock {
  constructor() { this.now = 0; this.freeze = 0; this.waits = []; }
  tick(ms) {
    if (this.freeze > 0) { this.freeze -= ms; return 0; }
    this.now += ms;
    this.waits = this.waits.filter((w) => (w.at <= this.now ? (w.res(), false) : true));
    return ms;
  }
  wait(ms) { return new Promise((res) => this.waits.push({ at: this.now + ms, res })); }
  hitstop(ms) { this.freeze = Math.max(this.freeze, ms); }
}

const ZERO = { x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 };

// A character's moving parts. Each part has a pivot and is tweened between poses.
export class Puppet {
  constructor(clock, parts) {
    this.clock = clock;
    this.parts = parts;
    for (const p of Object.values(parts)) { p.v = { ...ZERO }; p.tw = {}; }
  }
  value(p, k) {
    const tw = p.tw[k];
    if (!tw) return p.v[k];
    const t = Math.min(1, (this.clock.now - tw.start) / tw.dur);
    return tw.from + (tw.to - tw.from) * tw.ease(t);
  }
  // Tween parts to a pose: { head: { r: 10 }, root: { x: 40, sy: 0.9 } }.
  to(pose, ms = 200, ease = "out") {
    for (const [name, props] of Object.entries(pose)) {
      const p = this.parts[name];
      if (!p) continue;
      for (const [k, v] of Object.entries(props)) p.tw[k] = { from: this.value(p, k), to: v, start: this.clock.now, dur: Math.max(1, ms), ease: EASE[ease] };
    }
    return this.clock.wait(ms);
  }
  set(pose) {
    for (const [name, props] of Object.entries(pose)) {
      const p = this.parts[name];
      if (!p) continue;
      for (const [k, v] of Object.entries(props)) { p.v[k] = v; delete p.tw[k]; }
    }
  }
  reset() { for (const p of Object.values(this.parts)) { p.v = { ...ZERO }; p.tw = {}; } }
  get(name, k) { return this.value(this.parts[name], k); }
  // extra: small per-frame offsets layered on top (breathing, flicker, sway).
  render(extra = {}) {
    for (const [name, p] of Object.entries(this.parts)) {
      const v = {};
      for (const k in ZERO) v[k] = this.value(p, k);
      const e = extra[name];
      if (e) { v.x += e.x || 0; v.y += e.y || 0; v.r += e.r || 0; v.sx *= e.sx ?? 1; v.sy *= e.sy ?? 1; }
      p.el.setAttribute("transform", `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) translate(${p.px} ${p.py}) rotate(${v.r.toFixed(2)}) scale(${v.sx.toFixed(4)} ${v.sy.toFixed(4)}) translate(${-p.px} ${-p.py})`);
      if (p.lastO !== v.o) { p.el.setAttribute("opacity", v.o.toFixed(3)); p.lastO = v.o; }
    }
  }
}

// Look up parts by class name inside a freshly built group: { body: [px, py], ... }.
export function partsFrom(root, pivots) {
  const parts = {};
  for (const [name, [px, py]] of Object.entries(pivots)) {
    const el = name === "root" ? root : root.querySelector(`.p-${name}`);
    parts[name] = { el, px, py };
  }
  return parts;
}

// ---------------------------------------------------------------------------
// The stage: cavern background, layers, camera shake, screen flash, particles.

export class Stage {
  constructor(svg) {
    this.svg = svg;
    this.clock = new Clock();
    this.parts = [];
    this.actors = [];
    this.shakeAmt = 0;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="hkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b131e"/><stop offset=".55" stop-color="#15243a"/><stop offset="1" stop-color="#0a1019"/>
        </linearGradient>
        <linearGradient id="hkShaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#cfe6ff" stop-opacity=".16"/><stop offset="1" stop-color="#cfe6ff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="hkGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#121a25"/><stop offset="1" stop-color="#05080c"/>
        </linearGradient>
        <radialGradient id="hkFog"><stop offset="0" stop-color="#9fb6cc" stop-opacity=".12"/><stop offset="1" stop-color="#9fb6cc" stop-opacity="0"/></radialGradient>
        <radialGradient id="hkLamp"><stop offset="0" stop-color="#d8f0ff" stop-opacity=".55"/><stop offset=".25" stop-color="#9fd4ff" stop-opacity=".18"/><stop offset="1" stop-color="#9fd4ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="hkVignette" cx="50%" cy="55%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
        <filter id="hkBlur2"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id="hkBlur5" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
        <filter id="hkGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="hkSoftGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
        <filter id="hkWhite"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
        <filter id="hkInk" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>
        <filter id="hkCyan"><feColorMatrix type="matrix" values="0 0 0 0 .3  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 0"/></filter>
        <filter id="hkPink"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .3  0 0 0 0 .55  0 0 0 .8 0"/></filter>
      </defs>
      <g class="hk-bg"></g>
      <g class="hk-world">
        <g class="hk-back"></g>
        <g class="hk-chars"></g>
        <g class="hk-fx"></g>
      </g>
      <g class="hk-fg"></g>
      <rect class="hk-flash" width="${W}" height="${H}" fill="#fff" opacity="0" pointer-events="none"/>
      <rect width="${W}" height="${H}" fill="url(#hkVignette)" pointer-events="none"/>`;
    const q = (s) => svg.querySelector(s);
    this.layers = { bg: q(".hk-bg"), world: q(".hk-world"), back: q(".hk-back"), chars: q(".hk-chars"), fx: q(".hk-fx"), fg: q(".hk-fg") };
    this.flashRect = q(".hk-flash");
    this.flashAmt = 0;
    this.drawCavern();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // A dark cavern: distant pillars and arches in fog, light shafts, hanging roots,
  // a far lamp, an uneven floor, dark foreground silhouettes and drifting motes.
  drawCavern() {
    const bg = this.layers.bg, fg = this.layers.fg;
    svgEl("rect", { width: W, height: H, fill: "url(#hkSky)" }, bg);
    // Far: pale silhouettes of a ruined hall.
    const far = svgEl("g", { fill: "#1d2d43", opacity: ".75", filter: "url(#hkBlur2)" }, bg);
    for (const [x, w, h] of [[60, 46, 330], [250, 34, 300], [470, 52, 350], [720, 38, 310], [930, 50, 340], [1120, 40, 300]]) {
      svgEl("rect", { x, y: GROUND - h, width: w, height: h + 10 }, far);
      svgEl("path", { d: `M${x - 10} ${GROUND - h} L${x + w + 10} ${GROUND - h} L${x + w + 4} ${GROUND - h + 14} L${x - 4} ${GROUND - h + 14} Z` }, far);
    }
    svgEl("path", { d: "M106 120 C150 40 250 40 284 120 L270 120 C240 62 160 62 120 120 Z M522 96 C580 10 690 10 758 96 L742 96 C690 30 590 30 538 96 Z M980 110 C1030 40 1110 40 1160 110 L1146 110 C1110 56 1030 56 994 110 Z" }, far);
    svgEl("circle", { cx: 640, cy: 150, r: 120, fill: "url(#hkLamp)" }, bg);
    svgEl("path", { d: "M640 40 L640 132", stroke: "#2a3d58", "stroke-width": 2 }, bg);
    svgEl("path", { d: "M632 132 L648 132 L652 152 L640 162 L628 152 Z", fill: "#bfe4ff", opacity: ".8", filter: "url(#hkGlow)" }, bg);
    // Light shafts.
    for (const [x, w] of [[300, 120], [780, 90], [980, 140]]) svgEl("path", { d: `M${x} 0 L${x + w} 0 L${x + w * 2.2} ${GROUND} L${x + w * 1.1} ${GROUND} Z`, fill: "url(#hkShaft)" }, bg);
    // Mid: closer, darker rock and hanging roots.
    const mid = svgEl("g", { fill: "#0f1824" }, bg);
    svgEl("path", { d: "M0 0 L1200 0 L1200 36 C1150 52 1120 30 1080 58 C1040 80 1010 44 960 52 C900 62 880 30 820 40 C760 50 740 20 690 34 C640 48 600 22 540 30 C480 40 460 70 400 56 C340 42 310 70 250 58 C190 46 160 76 100 62 C60 52 30 70 0 64 Z" }, mid);
    for (const [x, len] of [[140, 90], [180, 50], [420, 120], [460, 70], [870, 100], [1050, 80], [1090, 130]]) {
      svgEl("path", { d: `M${x} 40 C${x - 6} ${40 + len * 0.4} ${x + 8} ${40 + len * 0.7} ${x} ${40 + len}`, stroke: "#0f1824", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, mid);
    }
    svgEl("path", { d: `M0 ${GROUND - 40} C80 ${GROUND - 90} 120 ${GROUND - 60} 160 ${GROUND - 110} C190 ${GROUND - 140} 230 ${GROUND - 70} 260 ${GROUND - 20} L0 ${GROUND} Z M1200 ${GROUND - 60} C1120 ${GROUND - 120} 1080 ${GROUND - 70} 1040 ${GROUND - 140} C1010 ${GROUND - 100} 980 ${GROUND - 60} 960 ${GROUND} L1200 ${GROUND} Z` }, mid);
    // Fog banks that drift.
    this.fog = [0, 1, 2].map((i) => svgEl("ellipse", { cx: 300 + i * 380, cy: GROUND - 30 - i * 40, rx: 420, ry: 80, fill: "url(#hkFog)" }, bg));
    // Floor.
    svgEl("path", { d: `M0 ${GROUND} C200 ${GROUND - 4} 400 ${GROUND + 3} 600 ${GROUND - 2} C800 ${GROUND - 5} 1000 ${GROUND + 2} 1200 ${GROUND - 1} L1200 ${H} L0 ${H} Z`, fill: "url(#hkGround)" }, bg);
    svgEl("path", { d: `M0 ${GROUND} C200 ${GROUND - 4} 400 ${GROUND + 3} 600 ${GROUND - 2} C800 ${GROUND - 5} 1000 ${GROUND + 2} 1200 ${GROUND - 1}`, stroke: "#3b5068", "stroke-width": 1.5, fill: "none", opacity: ".7" }, bg);
    // Foreground: dark grass and rubble at the edges, slightly blurred for depth.
    const f = svgEl("g", { fill: "#030507", filter: "url(#hkBlur2)" }, fg);
    let grass = "";
    for (let x = -10; x < 230; x += 9) grass += `M${x} ${H} L${x + 4} ${H - rand(26, 70)} L${x + 9} ${H} `;
    for (let x = 990; x < 1215; x += 9) grass += `M${x} ${H} L${x + 4} ${H - rand(26, 70)} L${x + 9} ${H} `;
    svgEl("path", { d: grass }, f);
    svgEl("path", { d: `M0 ${H} L0 ${H - 40} C40 ${H - 60} 90 ${H - 30} 140 ${H - 44} L180 ${H} Z M1200 ${H} L1200 ${H - 50} C1150 ${H - 70} 1110 ${H - 30} 1060 ${H - 42} L1030 ${H} Z` }, f);
    // Motes of dust drifting up through the light.
    this.motes = Array.from({ length: 46 }, () => {
      const m = { x: rand(0, W), y: rand(60, GROUND), s: rand(0.7, 2.2), v: rand(4, 14), ph: rand(0, 6) };
      m.el = svgEl("circle", { r: m.s, fill: "#d6ecff" }, bg);
      return m;
    });
  }

  add(actor) { this.actors.push(actor); return actor; }

  shake(amount) { this.shakeAmt = Math.max(this.shakeAmt, amount); }
  hitstop(ms) { this.clock.hitstop(ms); }
  flash(amount = 0.35) { this.flashAmt = Math.max(this.flashAmt, amount); }

  loop(now) {
    const real = Math.min(50, now - this.last);
    this.last = now;
    const d = this.clock.tick(real);
    const t = this.clock.now / 1000;
    // Camera shake (keeps going during hit-stop, like the real thing).
    this.shakeAmt *= Math.pow(0.86, real / 16.67);
    const s = this.shakeAmt;
    this.layers.world.setAttribute("transform", s > 0.2 ? `translate(${rand(-s, s).toFixed(1)} ${rand(-s, s).toFixed(1)})` : "");
    this.flashAmt *= Math.pow(0.8, real / 16.67);
    this.flashRect.setAttribute("opacity", this.flashAmt.toFixed(3));
    // Background life.
    for (const m of this.motes) {
      m.y -= m.v * real / 1000; m.x += Math.sin(now / 1000 + m.ph) * 0.15;
      if (m.y < 40) { m.y = GROUND; m.x = rand(0, W); }
      m.el.setAttribute("cx", m.x.toFixed(1)); m.el.setAttribute("cy", m.y.toFixed(1));
      m.el.setAttribute("opacity", (0.25 + 0.35 * Math.abs(Math.sin(now / 900 + m.ph))).toFixed(2));
    }
    this.fog.forEach((f, i) => f.setAttribute("cx", (300 + i * 380 + Math.sin(now / 7000 + i) * 80).toFixed(1)));
    for (const a of this.actors) a.frame(t, d);
    this.stepParticles(d, t);
    requestAnimationFrame(this.loop);
  }

  // ---- Particles ----------------------------------------------------------
  // Each particle: { el, life, max, update(p, d) }. d is game ms, so they freeze in hit-stop.
  particle(p) { p.life = 0; this.parts.push(p); return p; }

  stepParticles(d, t) {
    if (!d) return;
    const k = d / 16.67;
    this.parts = this.parts.filter((p) => {
      p.life += d;
      if (p.life >= p.max) { p.el.remove(); return false; }
      p.update(p, k, p.life / p.max, t);
      return true;
    });
  }

  // Orange infection-like blobs that fly, then splat flat on the floor.
  blobs(x, y, n, { color = "#ff8f3a", power = 1, dir = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const r = rand(3, 8);
      const el = svgEl("ellipse", { rx: r, ry: r, fill: color, filter: "url(#hkGlow)" }, this.layers.fx);
      const a = dir ? rand(-0.9, 0.9) + (dir > 0 ? 0 : Math.PI) - Math.PI / 2 * 0.4 : rand(0, Math.PI * 2);
      const sp = rand(3, 9) * power;
      this.particle({ el, max: rand(700, 1100), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, r, landed: false,
        update(p, k, f) {
          if (!p.landed) {
            p.vy += 0.45 * k; p.x += p.vx * k; p.y += p.vy * k;
            if (p.y >= GROUND) { p.y = GROUND; p.landed = true; }
            p.el.setAttribute("rx", p.r); p.el.setAttribute("ry", p.r);
          } else { p.el.setAttribute("rx", (p.r * 1.8).toFixed(1)); p.el.setAttribute("ry", (p.r * 0.45).toFixed(1)); }
          p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1));
          p.el.setAttribute("opacity", (1 - f * f).toFixed(2));
        } });
    }
  }

  // Black ink splash when the teammate takes a hit: a burst of jagged streaks.
  inkBurst(x, y, size = 1) {
    const g = svgEl("g", {}, this.layers.fx);
    let d = "";
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand(-0.2, 0.2), r1 = rand(10, 18) * size, r2 = rand(46, 90) * size, w = rand(0.06, 0.12);
      d += `M${(Math.cos(a - w) * r1).toFixed(1)} ${(Math.sin(a - w) * r1).toFixed(1)} L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)} L${(Math.cos(a + w) * r1).toFixed(1)} ${(Math.sin(a + w) * r1).toFixed(1)} Z `;
    }
    svgEl("path", { d, fill: "#020305" }, g);
    svgEl("circle", { r: 20 * size, fill: "#020305" }, g);
    this.particle({ el: g, max: 260, update(p, k, f) {
      g.setAttribute("transform", `translate(${x} ${y}) scale(${(0.5 + EASE.out(Math.min(1, f * 2.5)) * 0.8).toFixed(3)}) rotate(${(f * 12).toFixed(1)})`);
      g.setAttribute("opacity", (1 - f).toFixed(2));
    } });
    for (let i = 0; i < 10; i++) {
      const el = svgEl("circle", { r: rand(2, 5), fill: "#020305" }, this.layers.fx);
      const a = rand(0, Math.PI * 2), sp = rand(3, 8) * size;
      this.particle({ el, max: rand(500, 800), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
        update(p, k, f) { p.vy += 0.4 * k; p.x += p.vx * k; p.y = Math.min(GROUND, p.y + p.vy * k); p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1)); p.el.setAttribute("opacity", (1 - f).toFixed(2)); } });
    }
  }

  // Pale "soul" wisps that rise and fade (or fly to a point if `to` is given).
  souls(x, y, n, { color = "#e8f6ff", to = null, spread = 30 } = {}) {
    for (let i = 0; i < n; i++) {
      const el = svgEl("circle", { r: rand(2, 4.5), fill: color, filter: "url(#hkGlow)" }, this.layers.fx);
      const sx = x + rand(-spread, spread), sy = y + rand(-spread, spread);
      this.particle({ el, max: to ? rand(500, 800) : rand(700, 1300), sx, sy, ph: rand(0, 6),
        update(p, k, f) {
          let px, py;
          if (to) { const e = EASE.inOut(f); px = p.sx + (to.x - p.sx) * e + Math.sin(f * 9 + p.ph) * 18 * (1 - f); py = p.sy + (to.y - p.sy) * e - Math.sin(f * Math.PI) * 60; }
          else { px = p.sx + Math.sin(f * 6 + p.ph) * 10; py = p.sy - f * 90; }
          p.el.setAttribute("cx", px.toFixed(1)); p.el.setAttribute("cy", py.toFixed(1));
          p.el.setAttribute("opacity", (Math.sin(f * Math.PI)).toFixed(2));
        } });
    }
  }

  sparks(x, y, n, { colors = ["#fff4d6", "#ffd27a", "#ff9a3c"], power = 1, dir = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const el = svgEl("line", { stroke: pick(colors), "stroke-width": rand(1.5, 3), "stroke-linecap": "round" }, this.layers.fx);
      const a = dir ? (dir > 0 ? 0 : Math.PI) + rand(-1, 1) : rand(0, Math.PI * 2), sp = rand(4, 11) * power;
      this.particle({ el, max: rand(200, 420), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        update(p, k, f) { p.vy += 0.3 * k; p.x += p.vx * k; p.y += p.vy * k; p.el.setAttribute("x1", p.x.toFixed(1)); p.el.setAttribute("y1", p.y.toFixed(1)); p.el.setAttribute("x2", (p.x - p.vx * 2).toFixed(1)); p.el.setAttribute("y2", (p.y - p.vy * 2).toFixed(1)); p.el.setAttribute("opacity", (1 - f).toFixed(2)); } });
    }
  }

  dust(x, n = 6, power = 1) {
    for (let i = 0; i < n; i++) {
      const el = svgEl("circle", { fill: "#8d9cad" }, this.layers.fx);
      this.particle({ el, max: rand(500, 900), x: x + rand(-20, 20), y: GROUND - rand(0, 6), vx: rand(-2.5, 2.5) * power, vy: rand(-1.6, -0.3) * power, s: rand(6, 14),
        update(p, k, f) { p.x += p.vx * k; p.y += p.vy * k; p.vx *= 0.96; p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1)); p.el.setAttribute("r", (p.s * (0.4 + f)).toFixed(1)); p.el.setAttribute("opacity", (0.35 * (1 - f)).toFixed(2)); } });
    }
  }

  // An expanding ring (a shockwave), flattened if `flat`.
  ring(x, y, { color = "#ffffff", size = 120, flat = 1, ms = 380, width = 6 } = {}) {
    const el = svgEl("ellipse", { cx: x, cy: y, fill: "none", stroke: color }, this.layers.fx);
    this.particle({ el, max: ms, update(p, k, f) {
      const e = EASE.out(f);
      el.setAttribute("rx", (size * e).toFixed(1)); el.setAttribute("ry", (size * e * flat).toFixed(1));
      el.setAttribute("stroke-width", (width * (1 - f)).toFixed(2)); el.setAttribute("opacity", (1 - f).toFixed(2));
    } });
  }

  // A crescent slash: a curved blade of light that snaps out, then fades.
  slash(x, y, { color = "#e8f6ff", size = 90, angle = 0, flip = 1, ms = 220 } = {}) {
    const g = svgEl("g", { filter: "url(#hkGlow)" }, this.layers.fx);
    const r = size;
    svgEl("path", { d: `M${-r * 0.2} ${-r} A${r} ${r} 0 0 1 ${-r * 0.2} ${r} A${r * 0.78} ${r * 0.86} 0 0 0 ${-r * 0.2} ${-r} Z`, fill: color }, g);
    svgEl("path", { d: `M${-r * 0.1} ${-r * 0.8} A${r * 0.85} ${r * 0.85} 0 0 1 ${-r * 0.1} ${r * 0.8}`, fill: "none", stroke: "#fff", "stroke-width": 2, opacity: ".8" }, g);
    this.particle({ el: g, max: ms, update(p, k, f) {
      const grow = EASE.snap(Math.min(1, f * 3));
      g.setAttribute("transform", `translate(${x} ${y}) rotate(${angle}) scale(${(flip * (0.6 + grow * 0.5)).toFixed(3)} ${(0.6 + grow * 0.5).toFixed(3)})`);
      g.setAttribute("opacity", (f < 0.35 ? 1 : 1 - (f - 0.35) / 0.65).toFixed(2));
    } });
  }

  // A wave that rolls along the floor from x toward `to`, calling onArrive when it gets there.
  groundWave(x, to, { color = "#ffcf8a", ms = 420, onArrive } = {}) {
    const g = svgEl("g", { filter: "url(#hkGlow)" }, this.layers.fx);
    svgEl("path", { d: "M-40 0 C-30 -10 -10 -34 0 -46 C10 -34 30 -10 40 0 Z", fill: color, opacity: ".85" }, g);
    svgEl("path", { d: "M-20 0 C-14 -8 -4 -22 0 -30 C4 -22 14 -8 20 0 Z", fill: "#fff8e8" }, g);
    let arrived = false;
    this.particle({ el: g, max: ms + 160, update: (p, k, f) => {
      const tt = Math.min(1, p.life / ms), px = x + (to - x) * EASE.in(tt * 0.6 + 0.4 * tt);
      g.setAttribute("transform", `translate(${px.toFixed(1)} ${GROUND}) scale(${(0.6 + Math.sin(tt * Math.PI) * 0.6).toFixed(3)} ${(0.7 + Math.sin(p.life / 40) * 0.15).toFixed(3)})`);
      g.setAttribute("opacity", p.life > ms ? (1 - (p.life - ms) / 160).toFixed(2) : 1);
      if (tt >= 1 && !arrived) { arrived = true; onArrive?.(); }
      if (Math.random() < 0.4 * k) this.dust(px, 1, 0.6);
    } });
  }

  // A glowing ball fired from (x, y) at a target point.
  shot(x, y, to, { color = "#ff9a3c", ms = 360, size = 14, onArrive } = {}) {
    const g = svgEl("g", { filter: "url(#hkGlow)" }, this.layers.fx);
    svgEl("circle", { r: size, fill: color }, g);
    svgEl("circle", { r: size * 0.5, fill: "#fff6e0" }, g);
    let arrived = false;
    this.particle({ el: g, max: ms, update: (p, k, f) => {
      const px = x + (to.x - x) * f, py = y + (to.y - y) * f;
      g.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)})`);
      if (Math.random() < 0.8) this.trail(px, py, color, size);
      if (f > 0.97 && !arrived) { arrived = true; onArrive?.(); }
    } });
    this.clock.wait(ms).then(() => { if (!arrived) { arrived = true; onArrive?.(); } });
  }

  trail(x, y, color, size) {
    const el = svgEl("circle", { cx: x, cy: y, r: size * 0.7, fill: color }, this.layers.fx);
    this.particle({ el, max: 220, update(p, k, f) { el.setAttribute("r", (size * 0.7 * (1 - f)).toFixed(1)); el.setAttribute("opacity", (0.6 * (1 - f)).toFixed(2)); } });
  }

  // Glitch symbols sprayed from a point.
  glyphs(x, y, n, dir = -1) {
    for (let i = 0; i < n; i++) {
      const el = svgEl("text", { "font-family": "ui-monospace, Menlo, monospace", "font-weight": 700, "font-size": rand(14, 24), fill: pick(["#ff5c8a", "#5fe3ff", "#e8f6ff"]) }, this.layers.fx);
      el.textContent = pick([..."#%&@?!*~$;{}"]);
      this.particle({ el, max: rand(600, 1000), x, y, vx: dir * rand(3, 9), vy: rand(-4, 1.5),
        update(p, k, f) { p.vy += 0.08 * k; p.x += p.vx * k; p.y += p.vy * k; p.el.setAttribute("x", p.x.toFixed(1)); p.el.setAttribute("y", p.y.toFixed(1)); p.el.setAttribute("opacity", (Math.random() < 0.15 ? 0.2 : 1 - f).toFixed(2)); } });
    }
  }

  // Typo Swarm: letter-bugs with buzzing wings fly at the target, mob it, then pop.
  swarm(from, target, { onArrive } = {}) {
    const letters = [..."print(\":)';#"];
    const state = { arrived: false };
    letters.forEach((ch, i) => this.clock.wait(i * 60).then(() => {
      const g = svgEl("g", {}, this.layers.fx);
      g.innerHTML = `<g class="w" fill="#dff3ff" fill-opacity=".7" stroke="#05070b" stroke-width="1.4"><ellipse cx="-6" cy="-12" rx="7" ry="3.6" transform="rotate(-25 -6 -12)"/><ellipse cx="6" cy="-12" rx="7" ry="3.6" transform="rotate(25 6 -12)"/></g>
        <path d="M-6 6 L-10 11 M0 7 L0 12 M6 6 L10 11" stroke="#05070b" stroke-width="2" stroke-linecap="round"/>
        <rect x="-11" y="-10" width="22" height="18" rx="7" fill="#ff5c8a" stroke="#05070b" stroke-width="2.5"/>
        <text x="0" y="4" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="700" font-size="13" fill="#fff">${ch === "\"" ? "&quot;" : ch}</text>`;
      const wings = g.querySelector(".w");
      this.particle({ el: g, max: 2600, x: from.x + rand(-30, 30), y: from.y + rand(-20, 20), vx: rand(-6, -3), vy: rand(-4, 0), ph: rand(0, 6), mode: "fly", dir: Math.random() < 0.5 ? 1 : -1, ang: 0, mobT: 0,
        update: (p, k, f, t) => {
          if (p.mode === "fly") {
            const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
            p.vx += ((dx / d) * 8 - p.vx) * 0.07 * k; p.vy += ((dy / d) * 8 - p.vy) * 0.07 * k;
            p.x += p.vx * k; p.y += p.vy * k;
            if (d < 60) { p.mode = "mob"; p.ang = Math.atan2(p.y - target.y, p.x - target.x); if (!state.arrived) { state.arrived = true; onArrive?.(); } }
          } else {
            p.mobT += k; p.ang += 0.14 * k * p.dir;
            const rad = 40 + Math.sin(t * 11 + p.ph) * 12;
            p.x = target.x + Math.cos(p.ang) * rad * 1.3; p.y = target.y + Math.sin(p.ang) * rad * 0.7;
            if (p.mobT > 80 + p.ph * 6) { this.blobs(p.x, p.y, 3, { color: "#ff5c8a", power: 0.5 }); p.life = p.max; }
          }
          const wy = Math.sin(t * 9 + p.ph) * 5;
          g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${(p.y + wy).toFixed(1)}) rotate(${(Math.cos(t * 8 + p.ph) * 14).toFixed(1)})`);
          wings.setAttribute("transform", `translate(0 -12) scale(1 ${(0.25 + Math.abs(Math.sin(t * 55 + p.ph)) * 0.75).toFixed(2)}) translate(0 12)`);
        } });
    }));
  }
}

// Firewall: a smooth glowing dome planted on the floor, honeycomb inside.
export class Dome {
  constructor(stage, cx, { rx = 230, ry = 300 } = {}) {
    this.stage = stage; this.cx = cx; this.rx = rx; this.ry = ry;
    const id = "dome" + Math.floor(Math.random() * 1e6);
    const g = this.g = svgEl("g", { opacity: 0 }, stage.layers.fx);
    const path = `M${cx - rx} ${GROUND} A${rx} ${ry} 0 0 1 ${cx + rx} ${GROUND} Z`;
    g.innerHTML = `<defs><clipPath id="${id}c"><path d="${path}"/></clipPath>
      <radialGradient id="${id}f" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".04"/><stop offset=".72" stop-color="#ff9a3c" stop-opacity=".1"/><stop offset=".94" stop-color="#ffb366" stop-opacity=".3"/><stop offset="1" stop-color="#ffe0b0" stop-opacity=".55"/></radialGradient></defs>
      <path class="shell" d="${path}" fill="url(#${id}f)"/>
      <g class="hex" clip-path="url(#${id}c)"></g>
      <path class="rim" d="M${cx - rx} ${GROUND} A${rx} ${ry} 0 0 1 ${cx + rx} ${GROUND}" fill="none" stroke="#ffd9a3" stroke-width="3" filter="url(#hkGlow)"/>`;
    const hex = g.querySelector(".hex"), r = 18, w = r * Math.sqrt(3);
    this.cells = [];
    for (let row = 0; row * r * 1.5 < ry + r; row++) {
      const y = GROUND - row * r * 1.5;
      for (let x = cx - rx - w; x <= cx + rx + w; x += w) {
        const px = x + (row % 2 ? w / 2 : 0), d = Math.hypot((px - cx) / rx, (y - GROUND) / ry);
        if (d > 1.06) continue;
        const pts = Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 3 * k + Math.PI / 6; return `${(px + (r - 2) * Math.cos(a)).toFixed(1)},${(y + (r - 2) * Math.sin(a)).toFixed(1)}`; }).join(" ");
        const edge = Math.max(0, (d - 0.45) / 0.6);
        const el = svgEl("polygon", { points: pts, fill: "#ffb366", "fill-opacity": (0.02 + edge * 0.08).toFixed(3), stroke: "#ffc285", "stroke-opacity": (0.15 + edge * 0.45).toFixed(2), "stroke-width": 1.5 }, hex);
        this.cells.push({ el, px, y, row, base: 0.02 + edge * 0.08 });
      }
    }
    this.hexG = hex;
    this.born = stage.clock.now;
    this.state = "rise";
    stage.add(this);
  }
  frame(t) {
    const age = this.stage.clock.now - this.born;
    if (this.state === "rise") {
      const e = EASE.back(Math.min(1, age / 500));
      this.g.setAttribute("opacity", Math.min(1, age / 200).toFixed(2));
      this.g.setAttribute("transform", `translate(${this.cx} ${GROUND}) scale(${(0.3 + 0.7 * e).toFixed(3)} ${e.toFixed(3)}) translate(${-this.cx} ${-GROUND})`);
    }
    if (this.state !== "gone") for (const c of this.cells) {
      const glow = Math.max(0, Math.sin(t * 2.2 - c.px / 60)) ** 6;
      c.el.setAttribute("fill-opacity", (c.base + glow * 0.07 + (c.flare || 0)).toFixed(3));
      if (c.flare) c.flare = Math.max(0, c.flare - 0.02);
    }
  }
  // A blocked hit: the side facing the attacker flares.
  block(fromX) {
    for (const c of this.cells) { const near = Math.max(0, 1 - Math.abs(c.px - (this.cx - this.rx)) / 260); if (near > 0) c.flare = near * 0.45; }
    this.stage.sparks(this.cx - this.rx * 0.95, GROUND - 120, 14, { colors: ["#fff1d6", "#ffb366"], dir: -1 });
  }
  shatter() {
    this.state = "gone";
    this.g.querySelector(".shell").setAttribute("opacity", "0");
    this.g.querySelector(".rim").setAttribute("opacity", "0");
    this.hexG.removeAttribute("clip-path");
    for (const c of this.cells) {
      const vx = (c.px - this.cx) / 20 + rand(-3, 3), vy = -rand(2, 7);
      this.stage.particle({ el: c.el, max: rand(500, 900), x: 0, y: 0, vx, vy, r: 0, spin: rand(-10, 10),
        update(p, k, f) { p.vy += 0.3 * k; p.x += p.vx * k; p.y += p.vy * k; p.r += p.spin * k; p.el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)} ${c.px} ${c.y})`); p.el.setAttribute("fill-opacity", (0.3 * (1 - f)).toFixed(2)); p.el.setAttribute("stroke-opacity", (1 - f).toFixed(2)); } });
    }
    this.stage.clock.wait(950).then(() => { this.g.remove(); this.stage.actors = this.stage.actors.filter((a) => a !== this); });
  }
}
