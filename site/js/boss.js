// Bosses: the end-of-module fights. The Module 1 boss is a glitchy bug with a
// little screen for a face. Like DOT he is SVG, animated every frame, and the
// battle screen drives him with a few actions:
//   attack(onImpact), hit({ crit, blocked }), charge(moveId), special(moveId),
//   defeat(), taunt(), reset().

const INK = "#0e0a18";
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a, b) => a + Math.random() * (b - a);

export const BOSSES = {
  m1: {
    name: "GLITCH",            // working name until Isaac picks one
    module: 1,
    shell: ["#5a4392", "#35255e", "#1b1332"],
    glow: "#ff3d8b",
    pixel: "#ff4d7e",
    alt: "#3dffc0",
    moves: {
      firewall: { name: "Firewall", tell: "is building a Firewall" },
      typos: { name: "Typo Swarm", tell: "is gathering a Typo Swarm" },
      glitch: { name: "Glitch Text", tell: "is scrambling your data" },
    },
  },
};

// The screen face, as 16 x 9 pixel pictures ("#" = lit pixel).
const FACES = {
  idle: [
    "................",
    ".##..........##.",
    "...##......##...",
    "..###......###..",
    "..###......###..",
    "................",
    "...#.#.#.#.#.#..",
    "....#.#.#.#.#...",
    "................"],
  blink: [
    "................",
    ".##..........##.",
    "...##......##...",
    "................",
    "..###......###..",
    "................",
    "...#.#.#.#.#.#..",
    "....#.#.#.#.#...",
    "................"],
  attack: [
    ".#............#.",
    "..##........##..",
    "...##......##...",
    "..###......###..",
    "................",
    "......####......",
    ".....#....#.....",
    ".....#....#.....",
    "......####......"],
  charge: [
    "...##......##...",
    "...##......##...",
    "...##......##...",
    "...##......##...",
    "................",
    "...##......##...",
    "................",
    ".......##.......",
    "................"],
  hit: [
    "................",
    "..#.#......#.#..",
    "...#........#...",
    "..#.#......#.#..",
    "................",
    "................",
    ".....######.....",
    "................",
    "................"],
  dizzy: [
    "..###......###..",
    ".#...#....#...#.",
    ".#.#.#....#.#.#.",
    ".#..##....#..##.",
    "..#..........#..",
    "................",
    "....#.#.#.#.#...",
    ".....#.#.#.#....",
    "................"],
  smug: [
    "................",
    "...#........#...",
    "..#.#......#.#..",
    ".#...#....#...#.",
    "................",
    "...##########...",
    "....#.#..#.#....",
    ".....######.....",
    "................"],
  dead: [
    "..........##....",
    ".........##.....",
    "...##...##......",
    "...##...##......",
    "........##......",
    "...##...##......",
    "...##...##......",
    ".........##.....",
    "..........##...."],
};
const FACE_COLOR = { idle: "pixel", blink: "pixel", attack: "pixel", smug: "pixel", charge: "#ffd23d", hit: "#ffffff", dizzy: "#ffffff", dead: "#ffffff" };

let uid = 0;

function faceRects(rows) {
  let out = "";
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === "#") out += `<rect x="${72 + x * 6}" y="${95 + y * 6}" width="5.2" height="5.2" rx="1"/>`;
  }));
  return out;
}

function svg(id, b) {
  const tint = (name, [r, g, bl]) => `<filter id="${name}${id}"><feColorMatrix type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${bl}  0 0 0 .85 0"/></filter>`;
  const leg = (x, dir, i) => `<g class="boss-leg" data-i="${i}" data-x="${x}"><path d="M${x} 184 L${x + dir * 9} 203 L${x + dir * 17} 204" /></g>`;
  const scan = Array.from({ length: 20 }, (_, i) => `<line x1="70" x2="170" y1="${93 + i * 3}" y2="${93 + i * 3}"/>`).join("");
  const faces = Object.entries(FACES).map(([k, rows]) => {
    const col = FACE_COLOR[k] === "pixel" ? b.pixel : FACE_COLOR[k];
    return `<g class="boss-face" data-f="${k}" fill="${col}" style="display:none">${faceRects(rows)}</g>`;
  }).join("");
  return `
<svg class="boss-svg" viewBox="-30 -30 300 260" role="img" aria-label="${b.name}, the Module ${b.module} boss">
  <defs>
    <linearGradient id="bossShell${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${b.shell[0]}"/><stop offset="55%" stop-color="${b.shell[1]}"/><stop offset="100%" stop-color="${b.shell[2]}"/>
    </linearGradient>
    <radialGradient id="bossGlow${id}"><stop offset="0%" stop-color="${b.glow}" stop-opacity=".5"/><stop offset="100%" stop-color="${b.glow}" stop-opacity="0"/></radialGradient>
    <clipPath id="bossScreen${id}"><rect x="70" y="92" width="100" height="60" rx="10"/></clipPath>
    <clipPath id="bossSlice${id}" clipPathUnits="userSpaceOnUse"><rect class="slice-rect" x="-40" y="0" width="320" height="0"/></clipPath>
    ${tint("bossCyan", [0.2, 1, 0.85])}${tint("bossPink", [1, 0.2, 0.55])}${tint("bossWhite", [1, 1, 1])}
  </defs>
  <ellipse class="boss-shadow" cx="120" cy="208" rx="80" ry="9" fill="#000" opacity=".35"/>
  <g class="boss-rig">
    <ellipse class="boss-glow" cx="120" cy="118" rx="140" ry="115" fill="url(#bossGlow${id})"/>
    <use class="boss-ghost cyan" href="#bossArt${id}" filter="url(#bossCyan${id})" opacity="0"/>
    <use class="boss-ghost pink" href="#bossArt${id}" filter="url(#bossPink${id})" opacity="0"/>
    <g id="bossArt${id}" class="boss-art">
      <g class="boss-legs" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
        ${leg(74, -1, 0)}${leg(102, -1, 1)}${leg(138, 1, 2)}${leg(166, 1, 3)}
      </g>
      <g class="boss-antenna" data-side="-1"><path d="M100 42 Q90 20 78 8" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        <rect class="boss-cursor" x="70" y="-4" width="11" height="14" rx="2" fill="${b.pixel}" stroke="${INK}" stroke-width="3"/></g>
      <g class="boss-antenna" data-side="1"><path d="M140 42 Q150 20 162 8" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        <path d="M160 -6 L160 14 L165 9 L169 17 L173 15 L169 7 L176 7 Z" fill="#ffffff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>
      <g class="boss-claw" data-side="-1"><path d="M34 120 L12 108 L2 124 L16 126 L6 140 L28 138 L38 134 Z" fill="${b.shell[1]}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>
      <g class="boss-claw" data-side="1"><path d="M206 120 L228 108 L238 124 L224 126 L234 140 L212 138 L202 134 Z" fill="${b.shell[1]}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>
      <path class="boss-shell" d="M120 34 L172 44 L204 76 L214 124 L198 170 L160 190 L80 190 L42 170 L26 124 L36 76 L68 44 Z"
        fill="url(#bossShell${id})" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M74 50 L118 66 L104 74 L66 58 Z" fill="#ffffff" opacity=".14"/>
      <path d="M68 44 L120 64 L172 44 M36 76 L66 92 M204 76 L174 92 M80 190 L74 154 M160 190 L166 154" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" opacity=".7"/>
      <rect x="50" y="118" width="9" height="9" fill="${b.pixel}"/><rect x="186" y="136" width="7" height="7" fill="${b.alt}"/>
      <rect x="150" y="56" width="6" height="6" fill="${b.alt}"/><rect x="58" y="156" width="6" height="6" fill="${b.pixel}" opacity=".8"/>
      <rect class="boss-screen" x="70" y="92" width="100" height="60" rx="10" fill="#0b0716" stroke="${INK}" stroke-width="4"/>
      <g clip-path="url(#bossScreen${id})">
        <g class="boss-faces">${faces}</g>
        <g class="boss-noise" fill="${b.pixel}"></g>
        <g stroke="#ffffff" stroke-width="1" opacity=".07">${scan}</g>
        <path d="M74 96 L96 96 L78 112 Z" fill="#ffffff" opacity=".08"/>
      </g>
    </g>
    <g clip-path="url(#bossSlice${id})"><use class="boss-slice" href="#bossArt${id}"/></g>
    <use class="boss-flash" href="#bossArt${id}" filter="url(#bossWhite${id})" opacity="0"/>
    <g class="boss-wall"></g>
  </g>
  <g class="boss-fx"></g>
</svg>`;
}

export const BOSS_CSS = `
.boss-figure { position: relative; width: 220px; aspect-ratio: 300 / 260; user-select: none; }
.boss-svg { width: 100%; height: 100%; display: block; overflow: visible; }
.boss-ghost { mix-blend-mode: screen; }
.boss-wall polygon { transform-box: fill-box; transform-origin: center; transition: transform .35s cubic-bezier(.3,1.6,.5,1), opacity .35s; }
.boss-wall polygon.off { transform: scale(0); opacity: 0; }
.boss-wall polygon.gone { transition: transform .7s ease-out, opacity .7s ease-out; opacity: 0; }
.boss-wall.blocked polygon { animation: boss-hexflash .35s; }
@keyframes boss-hexflash { 40% { fill: #fff3c4; } }
.boss-fx text { font: 700 15px ui-monospace, "SF Mono", Menlo, monospace; }
`;

export class Boss {
  constructor(container, { id = "m1" } = {}) {
    this.b = BOSSES[id] || BOSSES.m1;
    const n = ++uid;
    container.innerHTML = `<div class="boss-figure">${svg(n, this.b)}</div>`;
    const q = (s) => container.querySelector(s);
    this.figure = q(".boss-figure");
    this.rig = q(".boss-rig");
    this.art = q(".boss-art");
    this.glow = q(".boss-glow");
    this.ghosts = [...container.querySelectorAll(".boss-ghost")];
    this.slice = q(".boss-slice");
    this.sliceRect = q(".slice-rect");
    this.flashEl = q(".boss-flash");
    this.screen = q(".boss-screen");
    this.noise = q(".boss-noise");
    this.wall = q(".boss-wall");
    this.fx = q(".boss-fx");
    this.shadow = q(".boss-shadow");
    this.faces = Object.fromEntries([...container.querySelectorAll(".boss-face")].map((g) => [g.dataset.f, g]));
    this.legs = [...container.querySelectorAll(".boss-leg")];
    this.antennae = [...container.querySelectorAll(".boss-antenna")];
    this.claws = [...container.querySelectorAll(".boss-claw")];
    this.cursor = q(".boss-cursor");
    // Springs: s = now, v = speed, t = where it wants to be.
    this.x = { s: 0, v: 0, t: 0 }; this.rot = { s: 0, v: 0, t: 0 };
    this.sx = { s: 1, v: 0, t: 1 }; this.sy = { s: 1, v: 0, t: 1 };
    this.jump = { s: 0, v: 0 };
    this.claw = 0; this.flash = 0; this.shake = 0; this.fade = 1;
    this.charging = false; this.scuttle = 0;
    this.glitchUntil = 0; this.nextGlitch = performance.now() + 1500; this.glitchPower = 1;
    this.noiseUntil = 0;
    this.parts = [];
    this.timers = [];
    this.setFace("idle");
    this.start = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); }

  setFace(name, revertAfter) {
    if (this.face === "dead" && name !== "dead" && !this.resetting) return;
    this.face = name;
    for (const [k, g] of Object.entries(this.faces)) g.style.display = k === name ? "" : "none";
    this.screen.setAttribute("fill", name === "dead" ? "#2453c9" : "#0b0716");
    clearTimeout(this.faceTimer);
    if (revertAfter) this.faceTimer = setTimeout(() => this.setFace(this.charging ? "charge" : "idle"), revertAfter);
  }

  glitch(ms = 160, power = 1) {
    const now = performance.now();
    this.glitchUntil = Math.max(this.glitchUntil, now + ms);
    this.glitchPower = power;
  }

  // Lunge at the teammate. onImpact runs at the moment the hit lands.
  attack(onImpact) {
    this.setFace("attack", 900);
    this.x.t = 12; this.sx.t = 0.94; this.sy.t = 1.06; this.scuttle = 1;   // wind up
    this.later(220, () => { this.x.t = -90; this.x.v = -9; this.sx.t = 1.1; this.sy.t = 0.92; this.claw = 1; });
    this.later(380, () => { this.glitch(120); onImpact?.(); });
    this.later(520, () => { this.x.t = 0; this.sx.t = 1; this.sy.t = 1; this.claw = 0; this.scuttle = 0; });
  }

  // Took a hit from the teammate's code.
  hit({ crit = false, blocked = false } = {}) {
    if (blocked && this.wall.childElementCount) {
      this.wall.classList.remove("blocked"); void this.wall.getBBox(); this.wall.classList.add("blocked");
      this.x.v += 3; this.shake = 3;
      this.burst(20, 120, 6, ["#ffb35c", "#ff7a2f"], 1);
      return;
    }
    if (crit && this.wall.childElementCount) this.breakWall();
    this.flash = 1;
    this.x.v += crit ? 16 : 9;
    this.rot.v += crit ? 3.2 : 1.6;
    this.sx.s = crit ? 0.8 : 0.9; this.sy.s = crit ? 1.15 : 1.07;
    this.shake = crit ? 9 : 4;
    this.setFace(crit ? "dizzy" : "hit", crit ? 1300 : 750);
    this.glitch(crit ? 380 : 180, crit ? 2 : 1);
    this.burst(110, 110, crit ? 26 : 12, [this.b.pixel, this.b.alt, "#ffffff"], crit ? 1.6 : 1);
  }

  // Telegraph a special move one turn ahead.
  charge(move) {
    this.charging = move;
    this.setFace("charge");
  }

  special(move) {
    this.charging = false;
    if (move === "firewall") this.buildWall();
    if (move === "typos") this.typoSwarm();
    if (move === "glitch") this.glitchText();
  }

  buildWall() {
    this.wall.innerHTML = "";
    this.setFace("smug", 1200);
    const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, k) => {
      const a = Math.PI / 3 * k + Math.PI / 6;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    const ns = "http://www.w3.org/2000/svg";
    let i = 0;
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 7; row++) {
        const p = document.createElementNS(ns, "polygon");
        p.setAttribute("points", hex(-14 + col * 20, 36 + row * 24 + (col ? 12 : 0), 13));
        p.setAttribute("fill", "#ff7a2f"); p.setAttribute("fill-opacity", ".5");
        p.setAttribute("stroke", "#ffc06b"); p.setAttribute("stroke-width", "2.5");
        p.classList.add("off");
        this.wall.append(p);
        const el = p, d = 40 + i++ * 45;
        this.later(d, () => el.classList.remove("off"));
      }
    }
    this.glitch(200);
  }

  breakWall() {
    const hexes = [...this.wall.children];
    hexes.forEach((p) => {
      p.classList.add("gone");
      p.style.transform = `translate(${rand(-60, 20)}px, ${rand(-50, 60)}px) rotate(${rand(-120, 120)}deg) scale(.3)`;
    });
    this.burst(0, 110, 18, ["#ffb35c", "#ff7a2f", "#fff3c4"], 1.4);
    this.later(750, () => hexes.forEach((p) => p.remove()));
  }

  clearWall() { this.wall.innerHTML = ""; }

  typoSwarm() {
    this.setFace("smug", 1500);
    this.glitch(220);
    const letters = ["p", "r", "i", "n", "t", "(", '"', ":"];
    letters.forEach((ch, i) => this.later(i * 110, () => this.spawnBug(ch)));
  }

  spawnBug(ch) {
    const ns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(ns, "g");
    g.innerHTML = `<path d="M-6 6 L-10 11 M0 7 L0 12 M6 6 L10 11" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
      <rect x="-10" y="-10" width="20" height="18" rx="5" fill="${this.b.pixel}" stroke="${INK}" stroke-width="2.5"/>
      <text x="0" y="4" text-anchor="middle" fill="#fff">${ch}</text>`;
    this.fx.append(g);
    this.parts.push({ el: g, kind: "bug", x: 50 + this.x.s, y: 120 + rand(-30, 30), vx: rand(-4.6, -3.4), vy: 0, g: 0, life: 0, max: 150, phase: rand(0, 6) });
  }

  glitchText() {
    this.setFace("smug", 1600);
    this.glitch(700, 2.4);
    this.noiseUntil = performance.now() + 700;
    const chars = "#%&@?!*~$";
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 14; i++) {
      this.later(i * 45, () => {
        const t = document.createElementNS(ns, "text");
        t.textContent = chars[Math.floor(Math.random() * chars.length)];
        t.setAttribute("fill", Math.random() < 0.5 ? this.b.pixel : this.b.alt);
        this.fx.append(t);
        this.parts.push({ el: t, kind: "char", x: 110 + this.x.s, y: 110 + rand(-25, 25), vx: rand(-6, -2.5), vy: rand(-3, 1.5), g: 0.08, life: 0, max: 70 });
      });
    }
  }

  defeat() {
    this.charging = false;
    this.clearWall();
    this.setFace("dead");
    this.shake = 6;
    this.glitch(900, 1.6);
    this.later(900, () => {
      this.dying = true;
      for (let i = 0; i < 4; i++) this.later(i * 140, () => this.burst(rand(60, 180), rand(60, 180), 16, [this.b.shell[0], this.b.pixel, this.b.alt], 1.1, -2));
    });
  }

  // Gloat after knocking the teammate out.
  taunt() {
    this.setFace("smug", 1500);
    this.jump.v = -5.5;
    this.later(520, () => { this.jump.v = -4; });
    this.glitch(120);
  }

  reset() {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.resetting = true; this.setFace("idle"); this.resetting = false;
    this.dying = false; this.fade = 1; this.charging = false; this.claw = 0; this.scuttle = 0;
    Object.assign(this.x, { s: 0, v: 0, t: 0 }); Object.assign(this.rot, { s: 0, v: 0, t: 0 });
    Object.assign(this.sx, { t: 1 }); Object.assign(this.sy, { t: 1 });
    this.clearWall();
    this.parts.forEach((p) => p.el.remove()); this.parts = [];
  }

  // Little square pixels flying out from (cx, cy).
  burst(cx, cy, count, colors, power = 1, lift = 0) {
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < count; i++) {
      const r = document.createElementNS(ns, "rect");
      const s = rand(3.5, 8);
      r.setAttribute("width", s); r.setAttribute("height", s);
      r.setAttribute("fill", colors[i % colors.length]);
      this.fx.append(r);
      const a = rand(0, Math.PI * 2), sp = rand(1.5, 5) * power;
      this.parts.push({ el: r, kind: "px", x: cx + this.x.s, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5 + lift, g: 0.16, life: 0, max: rand(35, 60), s });
    }
  }

  frame(now) {
    if (!this.figure.isConnected) return;
    const t = (now - this.start) / 1000;
    const step = Math.min(3, (now - (this.last ?? now)) / (1000 / 60)) || 1;
    this.last = now;
    const still = reduceMotion();
    for (const k of [this.x, this.rot, this.sx, this.sy]) {
      k.v += (k.t - k.s) * 0.13 * step;
      k.v *= Math.pow(0.78, step);
      k.s += k.v * step;
    }
    if (this.jump.s < 0 || this.jump.v < 0) {
      this.jump.v += 0.4 * step; this.jump.s += this.jump.v * step;
      if (this.jump.s >= 0) { this.jump.s = 0; if (this.jump.v > 1) { this.sx.s = 1.12; this.sy.s = 0.88; } this.jump.v = 0; }
    }
    this.shake *= Math.pow(0.85, step);
    this.flash *= Math.pow(0.82, step);
    if (this.dying) this.fade = Math.max(0, this.fade - 0.022 * step);
    const charge = this.charging ? 1 : 0;
    // Idle life: hover bob, legs fidget, antennae sway, cursor blinks.
    const bob = still ? 0 : Math.sin(t * 2.2) * 3;
    const jitter = (this.shake + charge * 1.6) * (still ? 0 : 1);
    const jx = rand(-jitter, jitter), jy = rand(-jitter, jitter) * 0.6;
    const legSpeed = this.scuttle ? 22 : 3;
    this.legs.forEach((g, i) => {
      const a = still ? 0 : Math.sin(t * legSpeed + i * 1.7) * (this.scuttle ? 16 : 5);
      g.setAttribute("transform", `rotate(${a.toFixed(2)} ${g.dataset.x} 184)`);
    });
    this.antennae.forEach((g) => {
      const side = +g.dataset.side, a = still ? 0 : Math.sin(t * 1.7 + side) * 5 + charge * Math.sin(t * 20) * 4;
      g.setAttribute("transform", `rotate(${(a * side).toFixed(2)} ${120 + side * 20} 42)`);
    });
    this.claws.forEach((g) => {
      const side = +g.dataset.side, open = this.claw * 14 + (still ? 0 : Math.sin(t * 2.6 + side) * 3);
      g.setAttribute("transform", `rotate(${(-open * side).toFixed(2)} ${120 + side * 84} 128)`);
    });
    this.cursor.setAttribute("opacity", Math.sin(t * 5) > -0.2 ? 1 : 0.15);
    // Blink every few seconds (only on the calm faces).
    if (this.face === "idle" && Math.sin(t * 0.9) > 0.995) this.setFace("blink", 120);
    this.glow.setAttribute("opacity", (0.55 + charge * (0.35 + 0.25 * Math.sin(t * 9)) + this.flash * 0.4).toFixed(3));
    // Glitch bursts: the picture splits into colour ghosts and a slice slides sideways.
    if (!still && now > this.nextGlitch) { this.glitch(rand(90, 200)); this.nextGlitch = now + rand(1800, 4200) * (charge ? 0.3 : 1); }
    const glitching = !still && now < this.glitchUntil;
    if (glitching) {
      const p = this.glitchPower;
      this.ghosts[0].setAttribute("transform", `translate(${rand(-5, -1) * p} ${rand(-2, 2)})`);
      this.ghosts[1].setAttribute("transform", `translate(${rand(1, 5) * p} ${rand(-2, 2)})`);
      this.ghosts.forEach((g) => g.setAttribute("opacity", "0.75"));
      if (Math.random() < 0.5) {
        this.sliceRect.setAttribute("y", rand(30, 190).toFixed(0));
        this.sliceRect.setAttribute("height", rand(5, 16 * p).toFixed(0));
        this.slice.setAttribute("transform", `translate(${(rand(-12, 12) * p).toFixed(1)} 0)`);
      }
    } else {
      this.ghosts.forEach((g) => g.setAttribute("opacity", "0"));
      this.sliceRect.setAttribute("height", "0");
    }
    // Scrambled screen during Glitch Text.
    if (now < this.noiseUntil && Math.random() < 0.5) {
      let s = "";
      for (let i = 0; i < 40; i++) s += `<rect x="${72 + Math.floor(rand(0, 16)) * 6}" y="${95 + Math.floor(rand(0, 9)) * 6}" width="5.2" height="5.2"/>`;
      this.noise.innerHTML = s;
    } else if (now >= this.noiseUntil && this.noise.childElementCount) this.noise.innerHTML = "";
    this.flashEl.setAttribute("opacity", this.flash.toFixed(3));
    const x = this.x.s + jx, y = this.jump.s + bob + jy;
    this.rig.setAttribute("transform",
      `translate(${x.toFixed(2)} ${y.toFixed(2)}) translate(120 200) rotate(${this.rot.s.toFixed(2)}) scale(${this.sx.s.toFixed(4)} ${this.sy.s.toFixed(4)}) translate(-120 -200)`);
    this.rig.setAttribute("opacity", this.fade.toFixed(3));
    const sh = (1 + this.jump.s / 60) * this.fade;
    this.shadow.setAttribute("transform", `translate(${(120 + this.x.s).toFixed(1)} 208) scale(${sh.toFixed(3)} 1) translate(-120 -208)`);
    this.stepParticles(step, t);
    requestAnimationFrame(this.frame);
  }

  stepParticles(step, t) {
    this.parts = this.parts.filter((p) => {
      p.life += step;
      if (p.life > p.max) { p.el.remove(); return false; }
      p.vy += p.g * step; p.x += p.vx * step; p.y += p.vy * step;
      const k = p.life / p.max;
      if (p.kind === "bug") {
        const wy = p.y + Math.sin(t * 12 + p.phase) * 6;
        p.el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${wy.toFixed(1)}) rotate(${(Math.sin(t * 18 + p.phase) * 10).toFixed(1)})`);
        p.el.setAttribute("opacity", k > 0.8 ? ((1 - k) * 5).toFixed(2) : 1);
      } else {
        const a = p.kind === "char" ? `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` : null;
        if (a) p.el.setAttribute("transform", a);
        else { p.el.setAttribute("x", (p.x - p.s / 2).toFixed(1)); p.el.setAttribute("y", (p.y - p.s / 2).toFixed(1)); }
        p.el.setAttribute("opacity", (1 - k * k).toFixed(2));
      }
      return true;
    });
  }
}
