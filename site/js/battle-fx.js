// Cinematic battle effects, drawn over the battle stage in its own pixel
// coordinates. Camera (shake, zoom punch, letterbox bars, flashes), time
// (hit-stop and slow motion, shared with DOT and the boss through
// battle-time.js), and themed particles: water for DOT, fire for PYRO, and
// impact effects for the boss.
import { battleTime } from "./battle-time.js";

const NS = "http://www.w3.org/2000/svg";
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const EASE = {
  linear: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

// Colours per teammate element.
export const THEMES = {
  water: { deep: "#0b63a8", mid: "#21b6e8", light: "#93f0ff", foam: "#ffffff", glow: "#8ae2ff" },
  fire: { deep: "#c8321b", mid: "#ff7a2f", light: "#ffd28a", foam: "#fff3c4", glow: "#ff9a3c" },
};

// A smooth curve through points (Catmull-Rom turned into cubic Beziers), so
// water outlines never show corners. closed = loop back to the start.
function curve(pts, closed) {
  const n = pts.length;
  if (n < 2) return "";
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? d + " Z" : d;
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
}

export class BattleFX {
  // stage: the stage box (letterbox and flash go here). world: what the camera
  // moves (characters, floor and these effects all live inside it).
  constructor(stage, world, { floor = 0.78 } = {}) {
    this.stage = stage; this.world = world; this.floorFrac = floor;
    this.svg = el("svg", { class: "fx-layer" });
    Object.assign(this.svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 5 });
    this.svg.innerHTML = `<defs>
      <filter id="fxGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="fxSoft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
      ${Object.entries(THEMES).map(([k, c]) => `<linearGradient id="fxBlade-${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.deep}" stop-opacity=".0"/><stop offset=".45" stop-color="${c.deep}" stop-opacity=".85"/><stop offset=".8" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.foam}"/></linearGradient>`).join("")}
    </defs><g class="fx"></g>`;
    this.g = this.svg.querySelector(".fx");
    world.append(this.svg);
    // Letterbox bars and a flash layer sit on the stage itself (outside the camera).
    const bar = (top) => { const b = document.createElement("div"); Object.assign(b.style, { position: "absolute", left: 0, right: 0, height: "0", background: "#000", zIndex: 20, transition: "height .45s cubic-bezier(.4,0,.2,1)", [top ? "top" : "bottom"]: 0, pointerEvents: "none" }); stage.append(b); return b; };
    this.bars = [bar(true), bar(false)];
    this.flashEl = document.createElement("div");
    Object.assign(this.flashEl.style, { position: "absolute", inset: 0, background: "#fff", opacity: 0, zIndex: 15, pointerEvents: "none", mixBlendMode: "screen" });
    stage.append(this.flashEl);
    this.parts = []; this.tweens = []; this.waits = [];
    this.time = 0; this.shakeAmt = 0; this.flashAmt = 0;
    this.zoom = { s: 1, t: 1, x: 0.5, y: 0.5 };
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  get w() { return this.stage.clientWidth; }
  get h() { return this.stage.clientHeight; }
  get floorY() { return this.h * this.floorFrac; }

  // Centre of an element in stage pixels, with the camera's zoom and shake undone
  // (on screen p' = O + t + s(p - O), so p = O + (p' - O - t) / s), so aim stays true.
  at(elm, { fy = 0.5 } = {}) {
    const r = elm.getBoundingClientRect(), st = this.stage.getBoundingClientRect();
    const c = this.cam || { s: 1, ox: 0, oy: 0, tx: 0, ty: 0 };
    const X = r.left + r.width / 2 - st.left, Y = r.top + r.height * fy - st.top;
    return { x: c.ox + (X - c.ox - c.tx) / c.s, y: c.oy + (Y - c.oy - c.ty) / c.s };
  }

  // A point on the page (e.g. from getBoundingClientRect) in stage pixels.
  fromPage(p, y) {
    const st = this.stage.getBoundingClientRect(), c = this.cam || { s: 1, ox: 0, oy: 0, tx: 0, ty: 0 };
    const X = p.x - st.left, Y = p.y - st.top;
    return { x: c.ox + (X - c.ox - c.tx) / c.s, y: y ?? c.oy + (Y - c.oy - c.ty) / c.s };
  }

  // ---- Time and camera -----------------------------------------------------
  wait(ms) { return new Promise((res) => this.waits.push({ at: this.time + ms, res })); }
  hitstop(ms) { if (!reduceMotion()) battleTime.hitstop(ms); }
  slowmo(scale, ms) { if (!reduceMotion()) battleTime.slowmo(scale, ms); }
  shake(amount) { if (!reduceMotion()) this.shakeAmt = Math.max(this.shakeAmt, amount); }
  flash(alpha = 0.3, color = "#fff") { this.flashEl.style.background = color; this.flashAmt = Math.max(this.flashAmt, alpha); }
  letterbox(on) { this.bars.forEach((b) => (b.style.height = on ? "11%" : "0")); }
  // Zoom the camera toward a point (stage pixels); 1 = normal.
  focus(scale, point, ms = 500) {
    if (reduceMotion()) return;
    this.zoomTw = { from: this.zoom.s, to: scale, start: this.time, ms, fx: this.zoom.x, fy: this.zoom.y, tx: point ? point.x / this.w : 0.5, ty: point ? point.y / this.h : 0.5 };
  }
  // A quick punch-in on impact that settles back.
  punch(amount, point) { if (reduceMotion()) return; this.zoom.kick = amount; this.zoom.kx = point.x / this.w; this.zoom.ky = point.y / this.h; }

  // Move an element (by CSS transform) over game time, so it freezes in hit-stop.
  move(elm, to, ms, ease = "out") {
    const cur = { x: 0, y: 0, r: 0, ...elm._pos };
    return new Promise((res) => this.tweens.push({ elm, from: cur, to: { x: to.x ?? cur.x, y: to.y ?? cur.y, r: to.r ?? cur.r }, start: this.time, ms: Math.max(1, ms), ease: EASE[ease], res }));
  }
  place(elm, p) { elm._pos = { r: 0, ...p }; elm.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${(p.r || 0).toFixed(1)}deg)`; }

  loop(now) {
    const real = Math.min(50, now - this.last);
    this.last = now;
    const d = battleTime.step(now, real);
    this.time += d;
    this.waits = this.waits.filter((w) => (w.at <= this.time ? (w.res(), false) : true));
    this.tweens = this.tweens.filter((tw) => {
      const f = Math.min(1, (this.time - tw.start) / tw.ms), e = tw.ease(f);
      this.place(tw.elm, { x: tw.from.x + (tw.to.x - tw.from.x) * e, y: tw.from.y + (tw.to.y - tw.from.y) * e, r: tw.from.r + (tw.to.r - tw.from.r) * e });
      if (f >= 1) { tw.res(); return false; }
      return true;
    });
    // Camera: zoom tween, impact punch, shake (shake keeps going in hit-stop).
    if (this.zoomTw) {
      const z = this.zoomTw, f = Math.min(1, (this.time - z.start) / z.ms), e = EASE.inOut(f);
      this.zoom.s = z.from + (z.to - z.from) * e; this.zoom.x = z.fx + (z.tx - z.fx) * e; this.zoom.y = z.fy + (z.ty - z.fy) * e;
      if (f >= 1) this.zoomTw = null;
    }
    const kick = this.zoom.kick || 0;
    this.zoom.kick = kick * Math.pow(0.86, real / 16.67);
    this.shakeAmt *= Math.pow(0.87, real / 16.67);
    const s = this.shakeAmt, sx = s > 0.3 ? rand(-s, s) : 0, sy = s > 0.3 ? rand(-s, s) * 0.7 : 0;
    const scale = this.zoom.s + kick;
    const ox = (kick > 0.002 ? this.zoom.kx : this.zoom.x) * 100, oy = (kick > 0.002 ? this.zoom.ky : this.zoom.y) * 100;
    this.world.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
    this.cam = { s: scale, ox: (ox / 100) * this.w, oy: (oy / 100) * this.h, tx: sx, ty: sy };
    this.world.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${scale.toFixed(4)})`;
    this.flashAmt *= Math.pow(0.82, real / 16.67);
    this.flashEl.style.opacity = this.flashAmt.toFixed(3);
    // Particles move in game time, so they freeze during hit-stop too.
    if (d > 0) {
      const k = d / 16.67;
      // Particles can spawn new ones while updating (a shot's trail, a droplet's
      // ripple). Those land in the fresh list, so none get lost.
      const current = this.parts;
      this.parts = [];
      const alive = current.filter((p) => {
        p.life += d;
        if (p.life >= p.max) { p.el.remove(); return false; }
        p.update(p, k, p.life / p.max);
        return true;
      });
      this.parts = alive.concat(this.parts);
    }
    requestAnimationFrame(this.loop);
  }

  // Place it right away, so nothing is ever drawn at 0,0 (a hit-stop would hold that frame).
  particle(p) { p.life = 0; p.update(p, 0, 0); this.parts.push(p); return p; }
  // Remove particles early (e.g. the gathering glow when DOT launches).
  clear(list) { for (const p of list || []) p.life = p.max; }

  // ---- Element effects (water or fire) ---------------------------------------

  // Droplets (or embers) streaming in to gather at a point before an attack.
  gather(c, theme, n = 18, ms = 380) {
    const T = THEMES[theme], made = [];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), r = rand(60, 110);
      const e = el("ellipse", { rx: 2.6, ry: 4.5, fill: pick([T.mid, T.light, T.foam]), filter: "url(#fxGlow)" }, this.g);
      const sx = c.x + Math.cos(a) * r, sy = c.y + Math.sin(a) * r, delay = rand(0, ms * 0.4);
      made.push(this.particle({ el: e, max: ms, update(p, k, f) {
        const g = Math.max(0, (p.life - delay) / (ms - delay)), q = EASE.in(g);
        const x = sx + (c.x - sx) * q, y = sy + (c.y - sy) * q;
        e.setAttribute("cx", x.toFixed(1)); e.setAttribute("cy", y.toFixed(1));
        e.setAttribute("transform", `rotate(${(Math.atan2(c.y - sy, c.x - sx) * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`);
        e.setAttribute("opacity", (g <= 0 ? 0 : Math.min(1, g * 3) * (1 - Math.max(0, g - 0.85) / 0.15)).toFixed(2));
      } }));
    }
    made.push(this.glowBurst(c, theme, 40, ms));
    return made;
  }

  glowBurst(c, theme, size, ms) {
    const T = THEMES[theme];
    const e = el("circle", { cx: c.x, cy: c.y, r: size, fill: T.glow, filter: "url(#fxSoft)" }, this.g);
    return this.particle({ el: e, max: ms, update(p, k, f) { e.setAttribute("opacity", (Math.sin(f * Math.PI) * 0.55).toFixed(2)); e.setAttribute("r", (size * (0.6 + f * 0.6)).toFixed(1)); } });
  }

  // The trail left by a dash: a smear of droplets and speed streaks.
  dashTrail(from, to, theme) {
    const T = THEMES[theme];
    for (let i = 0; i < 16; i++) {
      const f0 = i / 16, x = from.x + (to.x - from.x) * f0, y = from.y + rand(-22, 22);
      const len = rand(30, 70);
      const ln = el("line", { x1: x, y1: y, x2: x - len, y2: y, stroke: pick([T.light, T.mid, T.foam]), "stroke-width": rand(2, 4), "stroke-linecap": "round", opacity: 0 }, this.g);
      this.particle({ el: ln, max: 260, update(p, k, f) { ln.setAttribute("opacity", (Math.sin(Math.min(1, f * 1.6) * Math.PI) * 0.8).toFixed(2)); ln.setAttribute("x2", (x - len * (1 - f)).toFixed(1)); } });
      if (i % 2 === 0) this.drops({ x, y: y + 10 }, theme, 1, { power: 0.5, up: 2 });
    }
  }

  // A blade of water (or flame): a crescent that sweeps through the target and fades.
  slash(c, theme, { size = 110, angle = -25, flip = 1, ms = 300, thick = 0.28 } = {}) {
    const T = THEMES[theme], r = size;
    const g = el("g", { filter: "url(#fxGlow)" }, this.g);
    // Crescent: outer arc, inner arc pulled in at the middle so the ends taper.
    el("path", { d: `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${r * (1 - thick)} ${r * 0.92} 0 0 0 0 ${-r} Z`, fill: `url(#fxBlade-${theme})` }, g);
    el("path", { d: `M0 ${-r * 0.92} A${r * 0.98} ${r * 0.96} 0 0 1 0 ${r * 0.92}`, fill: "none", stroke: T.foam, "stroke-width": 3, "stroke-linecap": "round" }, g);
    this.particle({ el: g, max: ms, update(p, k, f) {
      const sweep = EASE.expo(Math.min(1, f * 3.2));
      const rot = angle - 40 * flip + sweep * 70 * flip;
      g.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(flip * (0.55 + sweep * 0.55)).toFixed(3)} ${(0.55 + sweep * 0.55).toFixed(3)})`);
      g.setAttribute("opacity", (f < 0.3 ? 1 : 1 - (f - 0.3) / 0.7).toFixed(2));
    } });
    // Spray thrown off the edge of the blade.
    for (let i = 0; i < 10; i++) {
      const a = ((angle + rand(-60, 60)) * Math.PI) / 180;
      this.drops({ x: c.x + Math.cos(a) * r * 0.8 * flip, y: c.y + Math.sin(a) * r * 0.8 }, theme, 1, { power: 1.2, dir: flip });
    }
  }

  // Droplets (water) or embers (fire) flung out from a point; droplets fall and
  // splash on the floor, embers float up and fade.
  drops(c, theme, n, { power = 1, dir = 0, up = 4 } = {}) {
    const T = THEMES[theme], fire = theme === "fire", floor = this.floorY;
    for (let i = 0; i < n; i++) {
      const a = dir ? (dir > 0 ? 0 : Math.PI) + rand(-1.1, 1.1) : rand(0, Math.PI * 2), sp = rand(3, 9) * power;
      const size = rand(2.2, 4.8);
      const e = el("ellipse", { rx: size * 0.75, ry: size, fill: pick([T.mid, T.light, T.light, T.foam]), filter: fire ? "url(#fxGlow)" : "" }, this.g);
      this.particle({ el: e, max: fire ? rand(500, 900) : rand(700, 1100), x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up,
        update: (p, k, f) => {
          if (fire) { p.vy -= 0.06 * k; p.vx *= 0.97; } else p.vy += 0.42 * k;
          p.x += p.vx * k; p.y += p.vy * k;
          if (!fire && p.y >= floor) { this.ripple({ x: p.x, y: floor }, theme, 14, 300); p.life = p.max; return; }
          const ang = Math.atan2(p.vy, p.vx) * 180 / Math.PI - 90;
          e.setAttribute("cx", p.x.toFixed(1)); e.setAttribute("cy", p.y.toFixed(1));
          e.setAttribute("ry", (size * (1 + Math.min(2, Math.hypot(p.vx, p.vy) / 6))).toFixed(1));
          e.setAttribute("transform", `rotate(${ang.toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          e.setAttribute("opacity", (1 - f * f).toFixed(2));
        } });
    }
  }

  // A flat ring spreading on the floor, like a ripple on water (or a heat ring).
  ripple(c, theme, size = 60, ms = 600) {
    const T = THEMES[theme] || THEMES.water;
    const e = el("ellipse", { cx: c.x, cy: c.y, fill: "none", stroke: T.light }, this.g);
    this.particle({ el: e, max: ms, update(p, k, f) {
      const q = EASE.out(f);
      e.setAttribute("rx", (size * q).toFixed(1)); e.setAttribute("ry", (size * q * 0.18).toFixed(1));
      e.setAttribute("stroke-width", (3 * (1 - f)).toFixed(2)); e.setAttribute("opacity", (0.8 * (1 - f)).toFixed(2));
    } });
  }

  // A big burst of water (or fire) on impact.
  splash(c, theme, { n = 24, power = 1.2, dir = 0 } = {}) {
    this.drops(c, theme, n, { power, dir });
    this.ring(c, { color: THEMES[theme].light, size: 70 * power, ms: 320, width: 5 });
    this.glowBurst(c, theme, 50 * power, 300);
  }

  // ---- Water shapes ------------------------------------------------------------
  // A "tongue" is a ribbon of water (or flame) that grows from a base point,
  // tapers to a tip and curls over. Its centre line bends a bit more at each
  // step (angle = start + curl * s^2), and the outline is a smooth curve
  // through points either side of it. Three layers give it depth: a dark body,
  // a lighter inner band and a white highlight streak, like cartoon water.
  makeTongue(theme, parent = this.g) {
    const T = THEMES[theme];
    const g = el("g", {}, parent);
    return {
      g,
      body: el("path", { fill: T.deep }, g),
      inner: el("path", { fill: T.mid }, g),
      core: el("path", { fill: T.light, opacity: ".9" }, g),
      shine: el("path", { fill: "none", stroke: T.foam, "stroke-width": 2.6, "stroke-linecap": "round", opacity: ".85" }, g),
      cap: el("circle", { fill: T.foam }, g),
    };
  }

  // Draw a tongue: base (x, y), start angle a (radians, -PI/2 = straight up),
  // length len, curl (radians added by the tip), width w.
  drawTongue(t, { x, y, a, len, curl, w, wob = 0 }) {
    const N = 16, pts = [];
    let px = x, py = y;
    for (let i = 0; i <= N; i++) {
      const s = i / N, ang = a + curl * s * s + Math.sin(s * 5 + wob) * 0.06;
      pts.push({ x: px, y: py, ang, s });
      px += Math.cos(ang) * (len / N); py += Math.sin(ang) * (len / N);
    }
    const ribbon = (scale, shift = 0) => {
      const left = [], right = [];
      for (const p of pts) {
        // Wide near the base, swelling a little, then tapering to a round tip.
        const ww = w * scale * Math.pow(1 - p.s, 0.55) * (0.8 + 0.45 * Math.sin(p.s * Math.PI));
        const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
        left.push([p.x + nx * (ww + shift * ww), p.y + ny * (ww + shift * ww)]);
        right.push([p.x - nx * (ww - shift * ww), p.y - ny * (ww - shift * ww)]);
      }
      return curve([...left, ...right.reverse()], true);
    };
    t.body.setAttribute("d", ribbon(1));
    t.inner.setAttribute("d", ribbon(0.66, 0.25));
    t.core.setAttribute("d", ribbon(0.3, 0.9));
    const hi = pts.filter((p) => p.s > 0.15 && p.s < 0.75).map((p) => { const ww = w * 0.45 * (1 - p.s); return [p.x - Math.sin(p.ang) * ww, p.y + Math.cos(p.ang) * ww]; });
    t.shine.setAttribute("d", curve(hi, false));
    const tip = pts[N];
    t.cap.setAttribute("cx", tip.x.toFixed(1)); t.cap.setAttribute("cy", tip.y.toFixed(1));
    t.cap.setAttribute("r", Math.max(0, w * 0.08).toFixed(1));
    return tip;
  }

  // Crit finisher: a splash crown. Tongues of water erupt from under the target,
  // fan out and curl over at the tips, then droop and fall apart into droplets.
  splashCrown(x, theme, { power = 1, y } = {}) {
    const floor = y ?? this.floorY, n = 6;
    const g = el("g", { filter: theme === "fire" ? "url(#fxGlow)" : "" }, this.g);
    const tongues = Array.from({ length: n }, (_, i) => {
      const side = (i / (n - 1)) * 2 - 1;                       // -1 (left) .. 1 (right)
      return {
        t: this.makeTongue(theme, g),
        a: -Math.PI / 2 + side * 0.8 + rand(-0.12, 0.12),
        len: (120 + (1 - Math.abs(side)) * 120 + rand(-20, 20)) * power,
        curl: side * rand(1.6, 2.3) + (Math.abs(side) < 0.3 ? rand(-0.9, 0.9) : 0),
        w: (26 + (1 - Math.abs(side)) * 16) * power,
        delay: Math.abs(side) * 60 + rand(0, 40),
        wob: rand(0, 6),
      };
    });
    // Tallest in front, so the middle column reads over the side ones.
    tongues.sort((p, q) => q.w - p.w).reverse().forEach((tg) => g.append(tg.t.g));
    const ms = 1100, shed = new Set();
    this.particle({ el: g, max: ms, update: (p, k, f) => {
      for (const tg of tongues) {
        const life = Math.max(0, p.life - tg.delay) / (ms - tg.delay);
        const rise = EASE.expo(Math.min(1, life / 0.28));       // erupt fast
        const fall = life > 0.4 ? EASE.in((life - 0.4) / 0.6) : 0; // then droop and collapse
        const tip = this.drawTongue(tg.t, {
          x: x + Math.cos(tg.a) * 10, y: floor,
          a: tg.a + fall * Math.sign(tg.curl || 1) * 0.5,
          len: tg.len * rise * (1 - fall * 0.65),
          curl: tg.curl * (0.35 + rise * 0.65) + fall * Math.sign(tg.curl || 1) * 1.3,
          w: tg.w * (1 - fall * 0.6), wob: tg.wob + p.life / 120,
        });
        tg.t.g.setAttribute("opacity", (1 - fall * fall).toFixed(2));
        // As each tongue tips over, it throws off a spray from its tip.
        if (fall > 0.05 && !shed.has(tg)) { shed.add(tg); this.drops({ x: tip.x, y: tip.y }, theme, 6, { power: 0.8, up: 2 }); }
      }
    } });
    // A low jagged splash ring at the base, droplets, and ripples on the floor.
    this.drops({ x, y: floor - 20 }, theme, 22, { power: 1.3 * power, up: 6 });
    this.ripple({ x, y: floor }, theme, 170 * power, 900);
    this.wait(200).then(() => this.ripple({ x, y: floor }, theme, 120 * power, 700));
  }
  geyser(x, theme, opts) { this.splashCrown(x, theme, opts); }

  // A wave that rolls in from `from` to `to` and crashes. It rises, curls
  // forward, travels, and on arrival crashes into a splash crown.
  // rideOn(x, y) is called every frame with the crest, so DOT can surf it.
  wave(from, to, theme, { ms = 700, height = 200, onArrive, rideOn } = {}) {
    const floor = this.floorY, dir = Math.sign(to - from) || 1;
    const back = this.makeTongue(theme), front = this.makeTongue(theme);
    let arrived = false;
    this.particle({ el: back.g, max: ms + 200, update: (p, k, f) => {
      const tt = Math.min(1, p.life / ms), rise = EASE.out(Math.min(1, tt / 0.35));
      const x = from + (to - from) * EASE.inOut(tt);
      const crash = p.life > ms ? (p.life - ms) / 200 : 0;
      const h = height * rise * (1 - crash);
      const tip = this.drawTongue(front, { x: x - dir * 50, y: floor, a: -Math.PI / 2 + dir * 0.25, len: h, curl: dir * (1.2 + tt * 1.2 + crash * 1.5), w: 46 * (1 - crash * 0.5), wob: p.life / 90 });
      this.drawTongue(back, { x: x - dir * 120, y: floor, a: -Math.PI / 2 + dir * 0.55, len: h * 0.7, curl: dir * (1.0 + tt), w: 40 * (1 - crash * 0.5), wob: p.life / 70 + 2 });
      back.g.setAttribute("opacity", (1 - crash).toFixed(2)); front.g.setAttribute("opacity", (1 - crash).toFixed(2));
      if (Math.random() < 0.5 * k) this.drops({ x: tip.x, y: tip.y }, theme, 1, { power: 0.6, dir: -dir, up: 3 });
      rideOn?.(tip.x - dir * 30, tip.y);
      if (tt >= 1 && !arrived) { arrived = true; onArrive?.(); }
    } });
    this.parts.at(-1).el = { remove: () => { back.g.remove(); front.g.remove(); } };
  }

  // A ball of water (or fire) fired at a target, trailing droplets; splashes on arrival.
  orb(from, to, theme, { ms = 260, size = 13, arc = 30, onArrive } = {}) {
    const T = THEMES[theme];
    const g = el("g", { filter: "url(#fxGlow)" }, this.g);
    el("circle", { r: size, fill: T.mid }, g);
    el("circle", { r: size * 0.6, fill: T.light }, g);
    el("circle", { cx: -size * 0.3, cy: -size * 0.35, r: size * 0.22, fill: T.foam }, g);
    this.particle({ el: g, max: ms, update: (p, k, f) => {
      const x = from.x + (to.x - from.x) * f, y = from.y + (to.y - from.y) * f - Math.sin(f * Math.PI) * arc;
      const stretch = 1 + Math.min(0.5, k * 0.15);
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI).toFixed(0)}) scale(${stretch.toFixed(2)} ${(1 / stretch).toFixed(2)})`);
      if (k && Math.random() < 0.7) this.drops({ x, y }, theme, 1, { power: 0.3, up: 1 });
    } });
    this.wait(ms).then(() => onArrive?.());
  }

  // ---- Impact effects --------------------------------------------------------

  ring(c, { color = "#fff", size = 120, flat = 1, ms = 380, width = 6 } = {}) {
    const e = el("ellipse", { cx: c.x, cy: c.y, fill: "none", stroke: color }, this.g);
    this.particle({ el: e, max: ms, update(p, k, f) {
      const q = EASE.out(f);
      e.setAttribute("rx", (size * q).toFixed(1)); e.setAttribute("ry", (size * q * flat).toFixed(1));
      e.setAttribute("stroke-width", (width * (1 - f)).toFixed(2)); e.setAttribute("opacity", (1 - f).toFixed(2));
    } });
  }

  sparks(c, n, { colors = ["#fff4d6", "#ffd27a", "#ff9a3c"], power = 1, dir = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = dir ? (dir > 0 ? 0 : Math.PI) + rand(-1, 1) : rand(0, Math.PI * 2), sp = rand(4, 12) * power;
      const ln = el("line", { stroke: pick(colors), "stroke-width": rand(1.5, 3.2), "stroke-linecap": "round" }, this.g);
      this.particle({ el: ln, max: rand(220, 420), x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, update(p, k, f) {
        p.vy += 0.3 * k; p.x += p.vx * k; p.y += p.vy * k;
        ln.setAttribute("x1", p.x.toFixed(1)); ln.setAttribute("y1", p.y.toFixed(1)); ln.setAttribute("x2", (p.x - p.vx * 2.2).toFixed(1)); ln.setAttribute("y2", (p.y - p.vy * 2.2).toFixed(1));
        ln.setAttribute("opacity", (1 - f).toFixed(2));
      } });
    }
  }

  dust(x, n = 8, power = 1) {
    const floor = this.floorY;
    for (let i = 0; i < n; i++) {
      const e = el("circle", { fill: "#9aa4b2" }, this.g);
      this.particle({ el: e, max: rand(500, 900), x: x + rand(-24, 24), y: floor - rand(0, 6), vx: rand(-3, 3) * power, vy: rand(-1.8, -0.3) * power, s: rand(8, 18) * Math.sqrt(power), update(p, k, f) {
        p.x += p.vx * k; p.y += p.vy * k; p.vx *= 0.95;
        e.setAttribute("cx", p.x.toFixed(1)); e.setAttribute("cy", p.y.toFixed(1)); e.setAttribute("r", (p.s * (0.4 + f)).toFixed(1)); e.setAttribute("opacity", (0.3 * (1 - f)).toFixed(2));
      } });
    }
  }

  // A shockwave rolling along the floor from x to `to`; onArrive fires when it reaches.
  groundWave(x, to, { color = "#ffcf8a", ms = 380, onArrive } = {}) {
    const floor = this.floorY, g = el("g", { filter: "url(#fxGlow)" }, this.g);
    el("path", { d: "M-46 0 C-34 -12 -12 -40 0 -56 C12 -40 34 -12 46 0 Z", fill: color, opacity: ".85" }, g);
    el("path", { d: "M-22 0 C-16 -8 -5 -26 0 -34 C5 -26 16 -8 22 0 Z", fill: "#fff8e8" }, g);
    let arrived = false;
    this.particle({ el: g, max: ms + 180, update: (p, k, f) => {
      const tt = Math.min(1, p.life / ms), px = x + (to - x) * EASE.in(0.4 * tt + 0.6 * tt * tt);
      g.setAttribute("transform", `translate(${px.toFixed(1)} ${floor}) scale(${(0.6 + Math.sin(tt * Math.PI) * 0.7).toFixed(3)} ${(0.75 + Math.sin(p.life / 35) * 0.18).toFixed(3)})`);
      g.setAttribute("opacity", p.life > ms ? (1 - (p.life - ms) / 180).toFixed(2) : 1);
      if (Math.random() < 0.5 * k) this.dust(px, 1, 0.6);
      if (tt >= 1 && !arrived) { arrived = true; onArrive?.(); }
    } });
  }

  // A glowing shot fired at a target, with a fiery trail; explodes on arrival.
  shot(from, to, { color = "#ff9a3c", ms = 320, size = 15, onArrive } = {}) {
    const g = el("g", { filter: "url(#fxGlow)" }, this.g);
    el("circle", { r: size, fill: color }, g);
    el("circle", { r: size * 0.5, fill: "#fff6e0" }, g);
    let arrived = false;
    this.particle({ el: g, max: ms, update: (p, k, f) => {
      const x = from.x + (to.x - from.x) * f, y = from.y + (to.y - from.y) * f;
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      const t = el("circle", { cx: x, cy: y, r: size * 0.8, fill: color }, this.g);
      this.particle({ el: t, max: 200, update(q, kk, ff) { t.setAttribute("r", (size * 0.8 * (1 - ff)).toFixed(1)); t.setAttribute("opacity", (0.6 * (1 - ff)).toFixed(2)); } });
    } });
    this.wait(ms).then(() => {
      if (arrived) return; arrived = true;
      this.ring(to, { color: "#ffd9a3", size: 90, ms: 320 });
      this.sparks(to, 16, { power: 1.2 });
      this.glowBurst(to, "fire", 60, 300);
      onArrive?.();
    });
  }

  // Big words across the screen for a special move: "GOLEM · FIREWALL".
  title(text, sub = "") {
    const t = document.createElement("div");
    t.innerHTML = `<div style="font:800 clamp(20px,4vw,44px)/1 'Bricolage Grotesque',system-ui,sans-serif;letter-spacing:.14em;color:#fff;text-shadow:0 0 24px #ff6a2a,0 3px 0 #0008">${text}</div>${sub ? `<div style="margin-top:6px;font:600 clamp(11px,1.4vw,14px) 'IBM Plex Sans',sans-serif;letter-spacing:.3em;color:#ffd6c2;text-transform:uppercase">${sub}</div>` : ""}`;
    Object.assign(t.style, { position: "absolute", left: 0, right: 0, top: "40%", textAlign: "center", zIndex: 25, pointerEvents: "none", opacity: 0, transform: "translateX(-40px)", transition: "opacity .25s, transform .6s cubic-bezier(.2,.9,.3,1)" });
    this.stage.append(t);
    requestAnimationFrame(() => { t.style.opacity = 1; t.style.transform = "translateX(0)"; });
    this.wait(1150).then(() => { t.style.opacity = 0; t.style.transform = "translateX(40px)"; });
    this.wait(1600).then(() => t.remove());
  }
}
