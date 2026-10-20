// Bosses: the end-of-module fights. The Module 1 boss is a hulking armoured
// mech corrupted by glitches. He floats, with torn wires dangling where legs
// would be, and has a glowing orange core for an eye, a crushing claw on one
// arm and a cannon on the other, and cyan "corrupted data" crystals growing
// out of his plates.
//
// Like DOT it is SVG, animated every frame. The battle screen drives it with:
//   attack({ kind: "slam" | "cannon", onRelease(point) }), hit({ crit, blocked }),
//   charge(move), special(move), defeat(), win(), reset(), point(name).

import { battleTime } from "./battle-time.js";
const INK = "#0b0e13";
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a, b) => a + Math.random() * (b - a);
const NS = "http://www.w3.org/2000/svg";

export const BOSSES = {
  m1: {
    name: "GOLEM",             // Glitched Overclocked Logic-Eating Machine
    module: 1,
    hp: 300,
    moves: {
      firewall: { name: "Firewall", tell: "is raising a Firewall" },
      typos: { name: "Typo Swarm", tell: "is loading a Typo Swarm" },
      glitch: { name: "Glitch Text", tell: "is scrambling your data" },
    },
  },
};

const C = {
  light: "#748499", plate: "#4b596b", dark: "#313a47", deep: "#1c222b",
  rim: "#b4c6d8", crystal: "#5fd3ff", crystalLight: "#d2f5ff", crystalDark: "#1f78b4",
};

// A little cluster of corrupted-data crystals.
function crystal(x, y, s = 1, r = 0) {
  return `<g class="boss-crystal" transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
    <path d="M0 0 L-5 -14 L2 -22 L6 -9 Z" fill="${C.crystal}" stroke="${C.crystalDark}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M3 1 L10 -9 L15 -4 L9 4 Z" fill="${C.crystal}" stroke="${C.crystalDark}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-2 1 L-12 -5 L-9 4 Z" fill="${C.crystal}" stroke="${C.crystalDark}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-1 -4 L1 -17" stroke="${C.crystalLight}" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

// The Firewall dome: a smooth half-sphere planted on the ground, big enough to
// cover him through every move (lunges, swinging arms, the win stomp).
const DOME = { cx: 200, cy: 322, rx: 300, ry: 400 };
const DOME_PATH = `M${DOME.cx - DOME.rx} ${DOME.cy} A${DOME.rx} ${DOME.ry} 0 0 1 ${DOME.cx + DOME.rx} ${DOME.cy} Z`;

// Torn cables dangling from his underside: x where it leaves the body,
// length, thickness, colour, and a phase so they don't swing together.
const WIRES = [
  { x: 160, len: 62, w: 6, c: "#2a2f37", p: 0 },
  { x: 176, len: 84, w: 5, c: "#ff7a2f", p: 1.3 },
  { x: 192, len: 70, w: 7, c: "#2a2f37", p: 2.1 },
  { x: 208, len: 92, w: 4, c: "#5fd3ff", p: 3.4 },
  { x: 224, len: 66, w: 6, c: "#2a2f37", p: 4.2 },
  { x: 240, len: 78, w: 5, c: "#d64545", p: 5.1 },
];

// One arm. Drawn hanging straight down from its shoulder at (0, 0); the class
// turns it at the shoulder and at the elbow.
function arm(side) {
  const upper = `
    <rect x="-17" y="4" width="34" height="24" rx="7" fill="${C.plate}" stroke="${INK}" stroke-width="4"/>
    <rect x="-16" y="28" width="32" height="23" rx="7" fill="${C.dark}" stroke="${INK}" stroke-width="4"/>
    <rect x="-15" y="51" width="30" height="24" rx="7" fill="${C.plate}" stroke="${INK}" stroke-width="4"/>
    <path d="M-10 9 L10 9 M-10 56 L9 56" stroke="${C.rim}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>`;
  const claw = `
    <path d="M-24 82 L-34 120 L-12 106 L-6 88 Z" fill="${C.dark}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M18 84 L26 122 L6 108 L0 92 Z" fill="${C.dark}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-32 0 L28 -6 L38 40 L28 86 L-4 98 L-32 82 L-40 40 Z" fill="${C.plate}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M-30 4 L26 -2 L32 26 L-34 32 Z" fill="${C.light}" opacity=".85"/>
    <path d="M-36 40 L36 40 M-30 66 L30 64" stroke="${INK}" stroke-width="3" opacity=".55"/>
    <rect x="-8" y="48" width="16" height="7" rx="2" fill="#ff9a3c"/>
    ${crystal(-26, 30, 0.9, -20)}${crystal(24, 74, 0.7, 30)}`;
  const cannon = `
    <path d="M-32 -2 L32 -2 L40 46 L32 90 L-32 90 L-40 46 Z" fill="${C.plate}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M-30 2 L30 2 L35 28 L-35 28 Z" fill="${C.light}" opacity=".85"/>
    <path d="M-38 46 L38 46" stroke="${INK}" stroke-width="3" opacity=".55"/>
    <rect x="-30" y="52" width="10" height="6" rx="2" fill="#ff9a3c"/><rect x="20" y="52" width="10" height="6" rx="2" fill="#ff9a3c"/>
    <ellipse cx="0" cy="92" rx="27" ry="15" fill="${C.dark}" stroke="${INK}" stroke-width="4.5"/>
    <ellipse cx="0" cy="93" rx="18" ry="9" fill="${INK}"/>
    <ellipse class="boss-muzzle" cx="0" cy="93" rx="16" ry="8" fill="#ffb347" opacity="0"/>
    ${crystal(28, 30, 0.8, 25)}`;
  return `
  <g class="boss-arm" data-side="${side}">
    <path d="M${side * 8} -18 L${side * 30} -46 L${side * 24} -10 Z M${side * 20} -6 L${side * 50} -22 L${side * 26} 6 Z" fill="${C.dark}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="0" cy="0" r="24" fill="${C.dark}" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="-6" cy="-7" r="8" fill="${C.light}" opacity=".7"/>
    ${upper}
    <g class="boss-fore">
      <circle cx="0" cy="78" r="16" fill="${C.deep}" stroke="${INK}" stroke-width="4"/>
      <g transform="translate(0 92)">${side < 0 ? claw : cannon}</g>
    </g>
  </g>`;
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 3 * k + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

let uid = 0;

function svg(id, b) {
  const tint = (name, [r, g, bl], a = 0.85) => `<filter id="${name}${id}"><feColorMatrix type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${bl}  0 0 0 ${a} 0"/></filter>`;
  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${400 - +x} ${y}`);
  const spikesL = ["M62 94 L28 46 L80 82 Z", "M100 66 L84 12 L118 60 Z", "M140 56 L136 22 L160 52 Z"];
  const holes = [[100, 84], [126, 76], [152, 72], [248, 72], [274, 76], [300, 84]];
  return `
<svg class="boss-svg" viewBox="-70 -50 540 400" role="img" aria-label="${b.name}, the Module ${b.module} boss">
  <defs>
    <linearGradient id="bossFront${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.plate}"/><stop offset="100%" stop-color="${C.dark}"/>
    </linearGradient>
    <radialGradient id="bossCore${id}" cx="42%" cy="38%" r="70%">
      <stop class="core-a" offset="0%"/><stop class="core-b" offset="55%"/><stop class="core-c" offset="100%"/>
    </radialGradient>
    <radialGradient id="bossGlow${id}"><stop class="glow-a" offset="0%" stop-opacity=".55"/><stop class="glow-a" offset="100%" stop-opacity="0"/></radialGradient>
    <clipPath id="bossDomeClip${id}"><path d="${DOME_PATH}"/></clipPath>
    <radialGradient id="bossDomeFill${id}" cx="50%" cy="100%" r="100%" fx="50%" fy="80%">
      <stop offset="0%" stop-color="#ff9a3c" stop-opacity=".05"/><stop offset="70%" stop-color="#ff9a3c" stop-opacity=".12"/>
      <stop offset="92%" stop-color="#ffb366" stop-opacity=".32"/><stop offset="100%" stop-color="#ffd29a" stop-opacity=".55"/>
    </radialGradient>
    <clipPath id="bossCoreClip${id}"><circle cx="200" cy="160" r="28"/></clipPath>
    <clipPath id="bossSlice${id}" clipPathUnits="userSpaceOnUse"><rect class="slice-rect" x="-80" y="0" width="560" height="0"/></clipPath>
    ${tint("bossCyan", [0.25, 1, 0.95])}${tint("bossPink", [1, 0.25, 0.6])}${tint("bossWhite", [1, 1, 1], 1)}
  </defs>
  <ellipse class="boss-shadow" cx="200" cy="318" rx="130" ry="12" fill="#000" opacity=".35"/>
  <g class="boss-rig">
    <use class="boss-ghost" href="#bossArt${id}" filter="url(#bossCyan${id})" opacity="0"/>
    <use class="boss-ghost" href="#bossArt${id}" filter="url(#bossPink${id})" opacity="0"/>
    <g id="bossArt${id}">
      <g class="boss-body">
        <g class="boss-wires">${WIRES.map((w) => `<path class="wire" fill="none" stroke="${INK}" stroke-width="${w.w + 4}" stroke-linecap="round"/><path class="wire-core" fill="none" stroke="${w.c}" stroke-width="${w.w}" stroke-linecap="round"/><g class="wire-tip"><rect x="-5" y="-3" width="10" height="9" rx="2" fill="${C.dark}" stroke="${INK}" stroke-width="2.5"/><path d="M-3 6 L-5 12 M0 6 L0 13 M3 6 L5 12" stroke="${w.c === C.crystal ? C.crystal : "#ffb347"}" stroke-width="1.6" stroke-linecap="round"/></g>`).join("")}</g>
        <path d="M150 236 L250 236 L238 262 L162 262 Z" fill="${C.deep}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        <ellipse class="boss-eyeglow" cx="200" cy="160" rx="120" ry="100" fill="url(#bossGlow${id})"/>
        <g stroke="${INK}" stroke-width="5" stroke-linejoin="round">
          ${spikesL.map((d) => `<path d="${d}" fill="${C.dark}"/><path d="${mirror(d)}" fill="${C.dark}"/>`).join("")}
          <path d="M96 176 L148 204 L252 204 L304 176 L290 222 L244 248 L156 248 L110 222 Z" fill="${C.deep}"/>
          <path d="M56 96 L100 116 L200 126 L300 116 L344 96 L346 132 L304 176 L252 204 L148 204 L96 176 L54 132 Z" fill="url(#bossFront${id})"/>
          <path d="M56 96 L104 60 L200 46 L296 60 L344 96 L300 116 L200 126 L100 116 Z" fill="${C.light}"/>
        </g>
        <path d="M70 94 L106 66 L200 54 L294 66 L330 94" fill="none" stroke="${C.rim}" stroke-width="3" opacity=".6" stroke-linejoin="round"/>
        <path d="M100 116 L96 176 M300 116 L304 176 M152 121 L148 204 M248 121 L252 204 M54 132 L96 176 M346 132 L304 176" stroke="${INK}" stroke-width="3" opacity=".45"/>
        <g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">
          <path d="M160 74 L200 58 L240 74 L226 96 L174 96 Z" fill="${C.plate}"/>
          <path d="M176 76 L200 66 L224 76 L215 89 L185 89 Z" fill="${C.light}"/>
          <path d="M191 76 L200 72 L209 76 L205 83 L195 83 Z" fill="${C.rim}"/>
        </g>
        ${holes.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="6.5" fill="${INK}" stroke="${C.dark}" stroke-width="2.5"/>`).join("")}
        <rect x="108" y="140" width="18" height="7" rx="2" fill="#ff4a2a"/><rect x="274" y="140" width="18" height="7" rx="2" fill="#ff4a2a"/>
        <circle cx="146" cy="186" r="4" fill="#ffb347"/><circle cx="254" cy="186" r="4" fill="#ffb347"/>
        <circle cx="200" cy="160" r="41" fill="${C.deep}" stroke="${INK}" stroke-width="5"/>
        <circle cx="200" cy="160" r="33" fill="${INK}"/>
        <circle class="boss-core" cx="200" cy="160" r="28" fill="url(#bossCore${id})"/>
        <g clip-path="url(#bossCoreClip${id})">
          <g class="boss-hexgrid" fill="none" stroke="#9c3f0c" stroke-width="1.4" opacity=".45">
            ${[-2, -1, 0, 1, 2].flatMap((r) => [-2, -1, 0, 1, 2].map((c) => `<polygon points="${hexPoints(200 + c * 14 + (r % 2 ? 7 : 0), 160 + r * 12, 8)}"/>`)).join("")}
          </g>
          <ellipse class="boss-pupil" cx="200" cy="164" rx="4.5" ry="17" fill="#3a0f02" opacity=".75"/>
        </g>
        <ellipse cx="186" cy="160" rx="7" ry="4" fill="#fff" opacity=".4" transform="rotate(-25 186 160)"/>
        ${crystal(92, 108, 1.1, -15)}${crystal(316, 112, 1, 20)}${crystal(126, 168, 0.8, -40)}${crystal(282, 200, 0.9, 35)}${crystal(220, 244, 0.7, 10)}${crystal(150, 60, 0.7, -10)}
        <g transform="translate(66 112) rotate(16)">${arm(-1)}</g>
        <g transform="translate(334 112) rotate(-16)">${arm(1)}</g>
      </g>
    </g>
    <g clip-path="url(#bossSlice${id})"><use class="boss-slice" href="#bossArt${id}"/></g>
    <use class="boss-flash" href="#bossArt${id}" filter="url(#bossWhite${id})" opacity="0"/>
  </g>
  <g class="boss-dome"></g>
  <g class="boss-fx"></g>
</svg>`;
}

export const BOSS_CSS = `
.boss-figure { position: relative; width: 340px; aspect-ratio: 540 / 400; user-select: none; }
.boss-svg { width: 100%; height: 100%; display: block; overflow: visible; }
.boss-ghost { mix-blend-mode: screen; }
.boss-figure .core-a { stop-color: #fff3c9; } .boss-figure .core-b { stop-color: #ffae3d; } .boss-figure .core-c { stop-color: #d9530f; }
.boss-figure .glow-a { stop-color: #ff9a3c; }
.boss-figure[data-eye="charge"] .core-a { stop-color: #fff0e0; } .boss-figure[data-eye="charge"] .core-b { stop-color: #ff4f3a; } .boss-figure[data-eye="charge"] .core-c { stop-color: #a3150b; }
.boss-figure[data-eye="charge"] .glow-a { stop-color: #ff3b2f; }
.boss-figure[data-eye="hurt"] .core-a, .boss-figure[data-eye="hurt"] .core-b { stop-color: #ffffff; } .boss-figure[data-eye="hurt"] .core-c { stop-color: #ffd29a; }
.boss-figure[data-eye="dead"] .core-a { stop-color: #59606b; } .boss-figure[data-eye="dead"] .core-b { stop-color: #343a43; } .boss-figure[data-eye="dead"] .core-c { stop-color: #1d2128; }
.boss-figure[data-eye="dead"] .glow-a { stop-color: #000; }
.boss-crystal { animation: boss-twinkle 2.6s ease-in-out infinite; }
.boss-crystal:nth-of-type(2n) { animation-delay: -1.3s; }
@keyframes boss-twinkle { 0%,100% { filter: none; } 50% { filter: brightness(1.35) drop-shadow(0 0 4px #5fd3ff); } }
.boss-dome polygon { transform-box: fill-box; transform-origin: center; transition: transform .4s cubic-bezier(.3,1.5,.5,1), opacity .4s; }
.boss-dome polygon.off { transform: scale(0); opacity: 0; }
.boss-dome polygon.gone { transition: transform .8s ease-out, opacity .8s ease-out; opacity: 0; }
.boss-dome .dome-shell, .boss-dome .dome-rim { transform-box: view-box; transform-origin: 200px 322px; transition: transform .55s cubic-bezier(.3,1.3,.5,1), opacity .4s; }
.boss-dome .dome-shell.off, .boss-dome .dome-rim.off { transform: scale(.2, 0); opacity: 0; }
.boss-dome .dome-shell.gone, .boss-dome .dome-rim.gone { transform: scale(1.12); opacity: 0; transition: transform .35s ease-out, opacity .35s ease-out; }
.boss-fx text { font: 700 18px ui-monospace, "SF Mono", Menlo, monospace; }
@media (prefers-reduced-motion: reduce) { .boss-crystal { animation: none; } }
`;

export class Boss {
  constructor(container, { id = "m1" } = {}) {
    this.b = BOSSES[id] || BOSSES.m1;
    const n = ++uid;
    this.n = n;
    container.innerHTML = `<div class="boss-figure" data-eye="idle">${svg(n, this.b)}</div>`;
    const q = (s) => container.querySelector(s);
    this.figure = q(".boss-figure");
    this.svgEl = q(".boss-svg");
    this.rig = q(".boss-rig");
    this.body = q(".boss-body");
    const outer = [...container.querySelectorAll(".boss-wires .wire")], core = [...container.querySelectorAll(".boss-wires .wire-core")], tips = [...container.querySelectorAll(".boss-wires .wire-tip")];
    this.wires = WIRES.map((w, i) => ({ ...w, outer: outer[i], core: core[i], tip: tips[i] }));
    this.ghosts = [...container.querySelectorAll(".boss-ghost")];
    this.slice = q(".boss-slice");
    this.sliceRect = q(".slice-rect");
    this.flashEl = q(".boss-flash");
    this.eyeGlow = q(".boss-eyeglow");
    this.pupil = q(".boss-pupil");
    this.hexgrid = q(".boss-hexgrid");
    this.dome = q(".boss-dome");
    this.fx = q(".boss-fx");
    this.shadow = q(".boss-shadow");
    this.muzzle = q(".boss-muzzle");
    const arms = [...container.querySelectorAll(".boss-arm")];
    // Each arm: shoulder angle and elbow angle springs, added to its resting pose.
    this.arms = arms.map((el) => ({ el, fore: el.querySelector(".boss-fore"), side: +el.dataset.side, a: { s: 0, v: 0, t: 0 }, e: { s: 0, v: 0, t: 0 } }));
    this.x = { s: 0, v: 0, t: 0 }; this.y = { s: 0, v: 0, t: 0 }; this.rot = { s: 0, v: 0, t: 0 };
    this.sx = { s: 1, v: 0, t: 1 }; this.sy = { s: 1, v: 0, t: 1 };
    this.slump = { s: 0, v: 0, t: 0 };
    this.jump = { s: 0, v: 0 };
    this.look = { s: -6, t: -6 };
    this.flash = 0; this.shake = 0; this.fade = 1; this.muzzleGlow = 0;
    this.charging = false; this.dying = false; this.dead = false;
    this.glitchUntil = 0; this.glitchPower = 1; this.nextGlitch = performance.now() + 1800;
    this.nextPuff = performance.now() + 1200;
    this.parts = [];
    this.timers = [];
    this.start = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); }
  eye(state) { this.figure.dataset.eye = state; }
  glitch(ms = 160, power = 1) { this.glitchUntil = Math.max(this.glitchUntil, performance.now() + ms); this.glitchPower = power; }

  // Where something is on the page, for the battle screen's projectiles.
  point(name) {
    const el = { muzzle: this.muzzle, core: this.figure.querySelector(".boss-core"), claw: this.arms[0].fore }[name] || this.figure;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: name === "claw" ? r.bottom : r.top + r.height / 2 };
  }

  // Two attacks: a claw slam that sends a shockwave along the ground, or a cannon shot.
  // onRelease(point) fires when the shockwave or shot leaves him.
  // target: the teammate's position on the page, so the cannon really aims at it.
  attack({ kind = "slam", onRelease, target } = {}) {
    if (this.dead) return;
    const [L, R] = this.arms;
    const idle = () => this.eye(this.charging ? "charge" : "idle");
    if (kind === "cannon") {
      // 1. Aim: swing the cannon round in front of him until it points straight at
      // the teammate, brace, and let it charge and tremble.
      this.rot.t = -3; this.y.t = -14; this.x.t = 10;
      R.a.t = target ? this.aimAt(target, this.rot.t) : 100; R.e.t = 0; L.a.t = -20; L.e.t = 20;
      this.eye("charge");
      this.later(60, () => { this.muzzleGlow = 1; this.aiming = true; });
      // 2. Fire: big recoil that shoves his whole body back, muzzle flash, smoke.
      this.later(620, () => {
        this.aiming = false;
        R.a.v += 14; this.x.v += 11; this.rot.v += 2.6; this.y.v -= 2;
        this.shake = 9; this.muzzleGlow = 2.6; this.flash = 0.3;
        const [mx, my] = this.local(this.muzzle);
        this.blast(mx, my); this.puff(mx, my, 6, 1.1);
        this.sx.s = 1.06; this.sy.s = 0.95;
        onRelease?.(this.point("muzzle"));
      });
      // 3. Settle back down, cannon still smoking.
      this.later(900, () => { R.a.t = 60; this.rot.t = 2; this.y.t = 0; this.x.t = 0; L.a.t = 0; L.e.t = 0; idle(); });
      this.later(1050, () => { const [mx, my] = this.local(this.muzzle); this.puff(mx, my, 2, 0.6); });
      this.later(1300, () => { R.a.t = 0; this.rot.t = 0; });
      return;
    }
    // Slam. 1. Rear up: rise high, lean back, claw raised overhead, the other arm swung back.
    L.a.t = 150; L.e.t = 55; R.a.t = -35; R.e.t = 25;
    this.rot.t = 9; this.x.t = 26; this.y.t = -42; this.sy.t = 1.06; this.sx.t = 0.96;
    this.eye("charge"); this.flare(500);
    this.later(250, () => { this.shake = 2.5; });
    // 2. Lunge: drop and throw his whole weight forward, claw whipping down.
    this.later(460, () => {
      L.a.t = 18; L.a.v = -22; L.e.t = -18; R.a.t = 30;
      this.rot.t = -12; this.rot.v = -2; this.x.t = -95; this.x.v = -14; this.y.t = 16; this.y.v = 6;
      this.sy.t = 0.94; this.sx.t = 1.05;
    });
    // 3. Impact: the ground shakes, dust and sparks fly, and the shockwave leaves.
    this.later(600, () => {
      this.shake = 16; this.glitch(200, 1.4);
      this.sx.s = 1.1; this.sy.s = 0.88;
      const [cx] = this.local(this.arms[0].fore);
      this.dust(cx, 306, 22); this.sparks(cx - this.x.s, 300, 12, 1.2);
      this.debris(cx - this.x.s, 290, 5);
      onRelease?.(this.point("claw"));
    });
    // 4. Pull back with a small heave, then settle.
    this.later(950, () => { L.a.t = 40; L.e.t = 10; R.a.t = 0; this.rot.t = 3; this.x.t = -20; this.y.t = -8; idle(); });
    this.later(1250, () => { L.a.t = 0; L.e.t = 0; R.e.t = 0; this.rot.t = 0; this.x.t = 0; this.y.t = 0; this.sx.t = 1; this.sy.t = 1; });
  }

  // The shoulder angle that points the cannon arm at a spot on the page.
  // The arm hangs straight down at 0; it sits in a group turned -16 degrees.
  aimAt(target, bodyTilt = 0) {
    const r = this.arms[1].el.querySelector("circle").getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    const deg = Math.atan2(-(target.x - sx), target.y - sy) * 180 / Math.PI;
    return deg + 16 - bodyTilt;
  }

  // A point in the boss's drawing coordinates, on the page.
  toPage(x, y) {
    const pt = this.svgEl.createSVGPoint(); pt.x = x; pt.y = y;
    const r = pt.matrixTransform(this.svgEl.getScreenCTM());
    return { x: r.x, y: r.y };
  }

  // A point on the page in the boss's own drawing coordinates.
  toLocal({ x, y }) {
    const pt = this.svgEl.createSVGPoint(); pt.x = x; pt.y = y;
    const r = pt.matrixTransform(this.svgEl.getScreenCTM().inverse());
    return [r.x, r.y];
  }

  // Hit by the teammate's code. A Firewall dome blocks normal hits; a crit smashes it.
  hit({ crit = false, blocked = false } = {}) {
    if (this.dead) return;
    if (blocked && this.dome.childElementCount) { this.domeRipple(); this.x.v += 2; return; }
    if (crit && this.dome.childElementCount) this.breakDome();
    this.flash = 1;
    this.x.v += crit ? 12 : 6;
    this.rot.v += crit ? 2.4 : 1.1;
    this.sx.s = crit ? 0.92 : 0.96; this.sy.s = crit ? 1.06 : 1.03;
    this.shake = crit ? 10 : 5;
    for (const A of this.arms) { A.a.v -= A.side * (crit ? 10 : 5); A.e.v += crit ? 8 : 4; }
    this.eye("hurt");
    this.later(crit ? 420 : 200, () => { if (!this.dead) this.eye(this.charging ? "charge" : "idle"); });
    this.glitch(crit ? 420 : 160, crit ? 2 : 1);
    this.sparks(rand(150, 250), rand(110, 200), crit ? 22 : 10, crit ? 1.5 : 1);
    if (crit) { this.debris(200, 150, 10); this.later(120, () => this.sparks(rand(90, 310), rand(80, 220), 12, 1.2)); }
  }

  // Telegraph a special move one turn ahead: red eye, venting steam, trembling.
  charge(move) {
    this.charging = move;
    this.eye("charge");
    this.arms.forEach((A) => { A.a.t = -10 * A.side; A.e.t = 12; });
  }

  // opts.target (page point) and opts.onArrive: the Typo Swarm flies at the
  // teammate and calls onArrive when it reaches them.
  special(move, opts = {}) {
    this.charging = false;
    this.eye("idle");
    this.arms.forEach((A) => { A.a.t = 0; A.e.t = 0; });
    if (move === "firewall") this.buildDome();
    if (move === "typos") this.typoSwarm(opts);
    if (move === "glitch") this.glitchText();
  }

  // Firewall: a smooth glowing dome (brighter towards its rim, like a bubble)
  // with a honeycomb of hexagons inside it, clipped to the dome's outline.
  buildDome() {
    this.dome.innerHTML = "";
    const { cx, cy, rx, ry } = DOME, r = 20, w = r * Math.sqrt(3);
    const shell = document.createElementNS(NS, "path");
    shell.setAttribute("d", DOME_PATH);
    shell.setAttribute("fill", `url(#bossDomeFill${this.n})`);
    shell.classList.add("dome-shell", "off");
    const hexes = document.createElementNS(NS, "g");
    hexes.setAttribute("clip-path", `url(#bossDomeClip${this.n})`);
    hexes.classList.add("dome-hexes");
    for (let row = 0; row * r * 1.5 < ry + r; row++) {
      const y = cy - row * r * 1.5;
      for (let x = cx - rx - w; x <= cx + rx + w; x += w) {
        const px = x + (row % 2 ? w / 2 : 0);
        const d = Math.hypot((px - cx) / rx, (y - cy) / ry);
        if (d > 1.06) continue;
        const p = document.createElementNS(NS, "polygon");
        p.setAttribute("points", hexPoints(px, y, r - 2));
        // Hexes fade out towards the middle so he stays easy to see.
        const edge = Math.max(0, (d - 0.45) / 0.6);
        p.setAttribute("fill", "#ffb366"); p.setAttribute("fill-opacity", (0.03 + edge * 0.1).toFixed(3));
        p.setAttribute("stroke", "#ffb366"); p.setAttribute("stroke-opacity", (0.18 + edge * 0.5).toFixed(2)); p.setAttribute("stroke-width", "1.8");
        p.dataset.x = px; p.dataset.base = p.getAttribute("fill-opacity");
        p.classList.add("off");
        hexes.append(p);
        this.later(80 + row * 45 + rand(0, 60), () => p.classList.remove("off"));
      }
    }
    const rim = document.createElementNS(NS, "path");
    rim.setAttribute("d", `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`);
    rim.setAttribute("fill", "none"); rim.setAttribute("stroke", "#ffd29a"); rim.setAttribute("stroke-width", "4");
    rim.setAttribute("stroke-linecap", "round"); rim.classList.add("dome-rim", "off");
    const shine = document.createElementNS(NS, "path");
    shine.setAttribute("d", `M${cx - rx * 0.62} ${cy - ry * 0.62} A${rx * 0.85} ${ry * 0.85} 0 0 1 ${cx - rx * 0.1} ${cy - ry * 0.93}`);
    shine.setAttribute("fill", "none"); shine.setAttribute("stroke", "#fff3e0"); shine.setAttribute("stroke-width", "7");
    shine.setAttribute("stroke-linecap", "round"); shine.setAttribute("opacity", ".35"); shine.classList.add("dome-rim", "off");
    this.dome.append(shell, hexes, rim, shine);
    this.later(30, () => [shell, rim, shine].forEach((e) => e.classList.remove("off")));
    this.domeShimmer = true;
    this.glitch(200);
  }

  // A blocked hit: the hexes on the side facing the teammate flare up.
  domeRipple() {
    this.dome.querySelectorAll(".dome-hexes polygon").forEach((p) => {
      const near = Math.max(0, 1 - (+p.dataset.x + 100) / 300);
      if (near <= 0) return;
      p.setAttribute("fill-opacity", (+p.dataset.base + near * 0.45).toFixed(2));
      this.later(140 + (1 - near) * 260, () => p.setAttribute("fill-opacity", p.dataset.base));
    });
    const rim = this.dome.querySelector(".dome-rim");
    rim?.setAttribute("stroke-width", "7");
    this.later(200, () => rim?.setAttribute("stroke-width", "4"));
    this.sparks(-95, rand(170, 280), 10, 0.8, ["#ffd39a", "#ff8a33"]);
  }

  // A crit smashes it: the outline pops and the hexes scatter.
  breakDome() {
    this.dome.querySelectorAll(".dome-shell, .dome-rim").forEach((e) => e.classList.add("gone"));
    const g = this.dome.querySelector(".dome-hexes");
    g?.removeAttribute("clip-path");
    g?.querySelectorAll("polygon").forEach((p) => {
      p.classList.add("gone");
      p.setAttribute("fill-opacity", "0.3");
      p.style.transform = `translate(${rand(-120, 120)}px, ${rand(-120, 40)}px) rotate(${rand(-200, 200)}deg) scale(.3)`;
    });
    this.sparks(-60, 220, 22, 1.6, ["#ffd39a", "#ff8a33", "#fff3c4"]);
    this.domeShimmer = false;
    const all = [...this.dome.children];
    this.later(850, () => all.forEach((p) => p.remove()));
  }

  // Typo Swarm: a cloud of little letter-bugs buzzes out of his deck vents,
  // flies at the teammate, mobs them for a moment, then pops. No damage: it's
  // the warning that typos are coming in the next challenge.
  // spawn(ch, pagePoint): hand each bug to the battle's effects layer instead, so
  // it's drawn in front of the teammate.
  typoSwarm({ target, onArrive, spawn } = {}) {
    const swarm = { target: target ? this.toLocal(target) : null, onArrive, arrived: false };
    this.glitch(220);
    this.flare(900);
    const letters = ["p", "r", "i", "n", "t", "(", '"', ":", ")", "'", ";", "#"];
    const holes = [[100, 84], [126, 76], [152, 72], [248, 72], [274, 76], [300, 84]];
    letters.forEach((ch, i) => this.later(i * 70, () => {
      const [hx, hy] = holes[i % holes.length];
      this.puff(hx, hy - 24, 1, 0.5);
      if (spawn) spawn(ch, this.toPage(hx + this.x.s, hy - 24));
      else this.spawnBug(ch, hx, hy - 24, swarm);
    }));
  }

  spawnBug(ch, x, y, swarm) {
    const g = document.createElementNS(NS, "g");
    g.innerHTML = `<g class="wings" fill="#e8f7ff" fill-opacity=".75" stroke="${INK}" stroke-width="1.6">
        <ellipse cx="-7" cy="-13" rx="7" ry="4" transform="rotate(-25 -7 -13)"/><ellipse cx="7" cy="-13" rx="7" ry="4" transform="rotate(25 7 -13)"/></g>
      <path d="M-7 7 L-11 12 M0 8 L0 13 M7 7 L11 12" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="-12" y="-11" width="24" height="20" rx="6" fill="#ff4d7e" stroke="${INK}" stroke-width="3"/>
      <text x="0" y="5" text-anchor="middle" fill="#fff">${ch}</text>`;
    this.fx.append(g);
    this.parts.push({ el: g, wings: g.querySelector(".wings"), kind: "bug", x: x + this.x.s, y, vx: rand(-5.2, -3.6), vy: rand(0.7, 1.5), g: 0,
      life: 0, max: swarm?.target ? 420 : 230, phase: rand(0, 6), freq: rand(5, 8), amp: rand(6, 14), swarm, dir: Math.random() < 0.5 ? 1 : -1 });
  }

  glitchText() {
    this.glitch(800, 2.6);
    this.flare(800);
    this.noiseUntil = performance.now() + 800;
    const chars = "#%&@?!*~$";
    for (let i = 0; i < 18; i++) {
      this.later(i * 40, () => {
        const t = document.createElementNS(NS, "text");
        t.textContent = chars[Math.floor(Math.random() * chars.length)];
        t.setAttribute("fill", Math.random() < 0.5 ? "#ff4d7e" : C.crystal);
        this.fx.append(t);
        this.parts.push({ el: t, kind: "char", x: 190 + this.x.s, y: 224, vx: rand(-9, -4), vy: rand(-4, 1), g: 0.06, life: 0, max: 90 });
      });
    }
  }

  // Knocked out: sparks and small blasts, the eye dies, he slumps, then glitches apart.
  defeat() {
    if (this.dead) return;
    this.dead = true; this.charging = false;
    if (this.dome.childElementCount) this.breakDome();
    this.eye("hurt"); this.shake = 8; this.glitch(1400, 1.6);
    for (let i = 0; i < 7; i++) this.later(i * 170, () => { this.blast(rand(90, 310), rand(70, 230)); this.shake = 7; });
    this.later(500, () => this.eye("dead"));
    this.later(700, () => {
      this.slump.t = 1;
      this.arms.forEach((A) => { A.a.t = 6 * A.side; A.e.t = 28; });
    });
    this.later(1600, () => {
      this.dying = true; this.glitch(900, 3);
      for (let i = 0; i < 5; i++) this.later(i * 120, () => this.pixels(rand(80, 320), rand(60, 260), 18));
      this.puff(200, 200, 8, 1.6);
    });
  }

  // He won: arms up, eye blazing, a stomp.
  win() {
    if (this.dead) return;
    this.arms.forEach((A) => { A.a.t = -140 * A.side; A.e.t = -30; });
    this.flare(1600);
    this.jump.v = -6;
    this.later(560, () => { this.jump.v = -4.5; });
    this.later(1700, () => this.arms.forEach((A) => { A.a.t = 0; A.e.t = 0; }));
    this.glitch(150);
  }
  taunt() { this.win(); }

  reset() {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.dead = false; this.dying = false; this.fade = 1; this.charging = false; this.domeShimmer = false;
    for (const k of [this.x, this.y, this.rot, this.slump]) Object.assign(k, { s: 0, v: 0, t: 0 });
    this.sx.t = 1; this.sy.t = 1;
    this.arms.forEach((A) => { Object.assign(A.a, { s: 0, v: 0, t: 0 }); Object.assign(A.e, { s: 0, v: 0, t: 0 }); });
    this.eye("idle");
    this.dome.innerHTML = "";
    this.parts.forEach((p) => p.el.remove()); this.parts = [];
  }

  // His eye blazes for a moment (a laugh, or loading up a move).
  flare(ms) {
    this.eyeBoost = 1;
    this.later(ms, () => { this.eyeBoost = 0; });
  }

  // The centre of an element in the boss's own drawing coordinates.
  local(el) {
    const r = el.getBoundingClientRect(), s = this.svgEl.getBoundingClientRect();
    if (!s.width) return [200, 150];   // hidden: no size to measure against
    const k = 540 / s.width;
    return [(r.left + r.width / 2 - s.left) * k - 70, (r.top + r.height / 2 - s.top) * k - 50];
  }

  // Particles ---------------------------------------------------------------
  add(tag, attrs, p) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    this.fx.append(el);
    this.parts.push({ el, life: 0, g: 0, ...p });
  }
  sparks(cx, cy, n, power = 1, colors = ["#fff3c4", "#ffd04a", "#ff9a3c"]) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(2, 7) * power;
      this.add("line", { stroke: colors[i % colors.length], "stroke-width": rand(2, 3.5), "stroke-linecap": "round" },
        { kind: "spark", x: cx + this.x.s, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.25, max: rand(18, 32) });
    }
  }
  pixels(cx, cy, n) {
    const colors = [C.plate, C.light, C.crystal, "#ff4d7e", "#ffb347"];
    for (let i = 0; i < n; i++) {
      const s = rand(4, 10), a = rand(0, Math.PI * 2), sp = rand(1.5, 5);
      this.add("rect", { width: s, height: s, fill: colors[i % colors.length] },
        { kind: "px", x: cx + this.x.s, y: cy, s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5, g: 0.12, max: rand(40, 70) });
    }
  }
  debris(cx, cy, n) {
    for (let i = 0; i < n; i++) {
      const s = rand(6, 13);
      this.add("polygon", { points: `0,0 ${s},${s * 0.3} ${s * 0.7},${s} ${-s * 0.2},${s * 0.7}`, fill: Math.random() < 0.5 ? C.plate : C.dark, stroke: INK, "stroke-width": 1.5 },
        { kind: "chunk", x: cx + rand(-60, 60) + this.x.s, y: cy + rand(-40, 40), vx: rand(-5, 5), vy: rand(-8, -3), g: 0.35, spin: rand(-12, 12), max: 55, floor: 304 });
    }
  }
  puff(cx, cy, n = 3, size = 1) {
    for (let i = 0; i < n; i++) {
      this.add("circle", { r: 4, fill: "#c9d3dd" },
        { kind: "smoke", x: cx + rand(-6, 6), y: cy, vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.6), size: rand(10, 18) * size, max: rand(45, 70) });
    }
  }
  dust(cx, cy, n) {
    for (let i = 0; i < n; i++) {
      this.add("circle", { r: 4, fill: "#8d8270" },
        { kind: "smoke", x: cx + rand(-30, 30), y: cy, vx: rand(-3.5, 1.5), vy: rand(-1.4, -0.2), size: rand(10, 20), max: rand(35, 55), base: 0.5 });
    }
  }
  blast(cx, cy) {
    this.add("circle", { r: 2, fill: "#ffd04a" }, { kind: "blast", x: cx, y: cy, vx: 0, vy: 0, size: rand(22, 34), max: 18 });
    this.sparks(cx, cy, 6, 1);
    this.puff(cx, cy, 2, 1);
  }

  frame(now) {
    if (!this.figure.isConnected) return;
    const raw = Math.min(3, (now - (this.last ?? now)) / (1000 / 60)) || 1;
    this.last = now;
    // In a battle, hit-stop freezes him and slow motion slows him (battle-time.js).
    const step = battleTime.step(now, raw);
    this.at = (this.at ?? 0) + step / 60;
    const t = this.at;
    const still = reduceMotion();
    const spring = (k, stiff = 0.12, damp = 0.8) => { k.v += (k.t - k.s) * stiff * step; k.v *= Math.pow(damp, step); k.s += k.v * step; };
    [this.x, this.y, this.rot, this.sx, this.sy].forEach((k) => spring(k));
    spring(this.slump, 0.05, 0.85);
    this.arms.forEach((A) => { spring(A.a, 0.1, 0.78); spring(A.e, 0.1, 0.78); });
    if (this.jump.s < 0 || this.jump.v < 0) {
      this.jump.v += 0.45 * step; this.jump.s += this.jump.v * step;
      if (this.jump.s >= 0) { if (this.jump.v > 2) { this.shake = 7; this.sy.s = 0.94; this.sx.s = 1.04; this.dust(200, 312, 8); } this.jump.s = 0; this.jump.v = 0; }
    }
    this.shake *= Math.pow(0.84, step);
    this.flash *= Math.pow(0.8, step);
    this.muzzleGlow *= Math.pow(this.muzzleGlow > 1 ? 0.85 : 0.97, step);
    if (this.dying) this.fade = Math.max(0, this.fade - 0.02 * step);
    const charge = this.charging ? 1 : 0;
    const calm = still || this.dead ? 0 : 1;
    // Heavy breathing: the body rises and sinks on its legs; arms swing a beat behind.
    const breathe = Math.sin(t * 1.7) * 3 * calm;
    const jitter = (this.shake + charge * 1.8) * (still ? 0 : 1);
    const jx = rand(-jitter, jitter), jy = rand(-jitter, jitter) * 0.5;
    const sl = this.slump.s;
    // He hovers: drifting up and down above the ground. Knocked out, he drops.
    const hover = (-24 + breathe * 2.2) * (1 - sl) + sl * 48;
    this.body.setAttribute("transform", `translate(0 ${hover.toFixed(2)}) rotate(${(sl * -5).toFixed(2)} 200 220)`);
    // Dangling wires swing, trail behind when he moves, and crumple when he falls.
    const drag = -this.x.v * 3.5 - this.rot.v * 6;
    this.wires.forEach((w, i) => {
      const L = w.len * (1 - sl * 0.6), x = w.x, y = 252;
      const sway = (Math.sin(t * 1.4 + w.p) * 7 + Math.sin(t * 2.3 + w.p * 1.7) * 3) * calm + drag;
      const ex = x + sway, ey = y + L - Math.abs(sway) * 0.15;
      const d = `M${x} ${y} C${(x + sway * 0.15).toFixed(1)} ${(y + L * 0.4).toFixed(1)} ${(x + sway * 0.6).toFixed(1)} ${(y + L * 0.75).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      w.outer.setAttribute("d", d); w.core.setAttribute("d", d);
      const ang = Math.atan2(ex - (x + sway * 0.6), ey - (y + L * 0.75)) * -180 / Math.PI;
      w.tip.setAttribute("transform", `translate(${ex.toFixed(1)} ${ey.toFixed(1)}) rotate(${ang.toFixed(1)})`);
      if (!still && !this.dead && Math.random() < 0.004) this.sparks(ex + this.x.s, ey + hover + this.jump.s, 4, 0.5, w.c === C.crystal ? [C.crystalLight, C.crystal] : ["#fff3c4", "#ffb347"]);
    });
    this.arms.forEach((A, i) => {
      const sway = Math.sin(t * 1.7 - 0.8 + i * 0.4) * 3 * calm;
      A.el.setAttribute("transform", `rotate(${(A.a.s + sway * A.side * -1).toFixed(2)})`);
      A.fore.setAttribute("transform", `rotate(${(A.e.s * A.side * -1 + sway * 0.6).toFixed(2)} 0 78)`);
    });
    // The eye core pulses, its hex grid drifts, and the pupil keeps watching the teammate.
    const pulse = 0.75 + 0.25 * Math.sin(t * (charge ? 9 : 2.4));
    this.eyeGlow.setAttribute("opacity", this.dead ? "0" : (pulse * (charge ? 1.3 : 1) + this.flash * 0.6 + (this.eyeBoost || 0) * 0.6).toFixed(3));
    this.look.t = this.dead ? 0 : -7 + Math.sin(t * 0.7) * 3 * calm;
    this.look.s += (this.look.t - this.look.s) * 0.08 * step;
    this.pupil.setAttribute("cx", (200 + this.look.s).toFixed(2));
    this.pupil.setAttribute("ry", charge ? "8" : "19");
    this.hexgrid.setAttribute("transform", `translate(${(Math.sin(t * 0.5) * 4).toFixed(2)} 0)`);
    this.muzzle.setAttribute("opacity", Math.min(1, this.muzzleGlow).toFixed(3));
    // Steam: idle puffs from the deck vents, more while charging a special.
    if (!still && !this.dead && now > this.nextPuff) {
      const holes = [[100, 84], [126, 76], [152, 72], [248, 72], [274, 76], [300, 84]];
      const [hx, hy] = holes[Math.floor(rand(0, holes.length))];
      this.puff(hx, hy + breathe, charge ? 3 : 1, charge ? 1 : 0.7);
      this.nextPuff = now + (charge ? rand(150, 300) : rand(1400, 2600));
    }
    // Glitch bursts: colour ghosts split off and a slice of him slides sideways.
    if (!still && !this.dead && now > this.nextGlitch) { this.glitch(rand(90, 180)); this.nextGlitch = now + rand(2200, 4800) * (charge ? 0.35 : 1); }
    if (!still && now < this.glitchUntil) {
      const p = this.glitchPower;
      this.ghosts[0].setAttribute("transform", `translate(${(rand(-6, -1) * p).toFixed(1)} ${rand(-2, 2).toFixed(1)})`);
      this.ghosts[1].setAttribute("transform", `translate(${(rand(1, 6) * p).toFixed(1)} ${rand(-2, 2).toFixed(1)})`);
      this.ghosts.forEach((g) => g.setAttribute("opacity", "0.7"));
      if (Math.random() < 0.5) {
        this.sliceRect.setAttribute("y", rand(20, 300).toFixed(0));
        this.sliceRect.setAttribute("height", rand(6, 18 * p).toFixed(0));
        this.slice.setAttribute("transform", `translate(${(rand(-16, 16) * p).toFixed(1)} 0)`);
      }
    } else {
      this.ghosts.forEach((g) => g.setAttribute("opacity", "0"));
      this.sliceRect.setAttribute("height", "0");
    }
    if (this.noiseUntil && now < this.noiseUntil) this.figure.dataset.eye = Math.random() < 0.5 ? "hurt" : "charge";
    else if (this.noiseUntil) { this.noiseUntil = 0; this.eye(this.charging ? "charge" : "idle"); }
    // A slow shimmer runs across the dome's honeycomb.
    if (this.domeShimmer) this.dome.querySelectorAll(".dome-hexes polygon").forEach((p) => {
      const glow = Math.max(0, Math.sin(t * 2.2 - +p.dataset.x / 60));
      p.setAttribute("fill-opacity", (+p.dataset.base + glow ** 6 * 0.08).toFixed(3));
    });
    this.flashEl.setAttribute("opacity", Math.min(0.85, this.flash).toFixed(3));
    if (this.aiming && !still) { this.arms[1].a.s += rand(-0.8, 0.8); this.muzzleGlow = Math.min(1.6, this.muzzleGlow + 0.02 * step); }
    const x = this.x.s + jx, y = this.y.s + this.jump.s + jy;
    this.rig.setAttribute("transform",
      `translate(${x.toFixed(2)} ${y.toFixed(2)}) translate(200 306) rotate(${this.rot.s.toFixed(2)}) scale(${this.sx.s.toFixed(4)} ${this.sy.s.toFixed(4)}) translate(-200 -306)`);
    this.rig.setAttribute("opacity", this.fade.toFixed(3));
    const sh = (0.85 - breathe * 0.02 + sl * 0.3 + this.jump.s / 120) * (0.3 + 0.7 * this.fade);
    this.shadow.setAttribute("transform", `translate(${(200 + this.x.s).toFixed(1)} 318) scale(${sh.toFixed(3)} 1) translate(-200 -318)`);
    this.stepParticles(step, t);
    requestAnimationFrame(this.frame);
  }

  stepParticles(step, t) {
    // New particles made during the update (e.g. a popped bug's pixels) go in a fresh list.
    const current = this.parts;
    this.parts = [];
    const alive = current.filter((p) => {
      p.life += step;
      if (p.life > p.max) { p.el.remove(); return false; }
      p.vy += p.g * step; p.x += p.vx * step; p.y += p.vy * step;
      if (p.floor && p.y > p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.7; }
      const k = p.life / p.max, el = p.el;
      switch (p.kind) {
        case "spark": {
          el.setAttribute("x1", p.x.toFixed(1)); el.setAttribute("y1", p.y.toFixed(1));
          el.setAttribute("x2", (p.x - p.vx * 2.2).toFixed(1)); el.setAttribute("y2", (p.y - p.vy * 2.2).toFixed(1));
          el.setAttribute("opacity", (1 - k).toFixed(2));
          break;
        }
        case "smoke": {
          el.setAttribute("cx", p.x.toFixed(1)); el.setAttribute("cy", p.y.toFixed(1));
          el.setAttribute("r", (4 + p.size * Math.sqrt(k)).toFixed(1));
          el.setAttribute("opacity", ((p.base ?? 0.35) * (1 - k)).toFixed(3));
          break;
        }
        case "blast": {
          el.setAttribute("cx", p.x.toFixed(1)); el.setAttribute("cy", p.y.toFixed(1));
          el.setAttribute("r", (p.size * Math.sqrt(k)).toFixed(1));
          el.setAttribute("fill", k < 0.4 ? "#fff3c4" : "#ff9a3c");
          el.setAttribute("opacity", (1 - k).toFixed(2));
          break;
        }
        case "chunk": {
          p.rot = (p.rot || 0) + p.spin * step;
          el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)})`);
          el.setAttribute("opacity", k > 0.7 ? ((1 - k) / 0.3).toFixed(2) : 1);
          break;
        }
        case "bug": {
          // Flying letter-bugs: each weaves on its own wobbly path, wings buzzing.
          const tgt = p.swarm?.target;
          if (tgt && p.mode !== "mob") {
            // Home in on the teammate.
            const dx = tgt[0] - p.x, dy = tgt[1] - p.y, d = Math.hypot(dx, dy) || 1;
            p.vx += ((dx / d) * 7 - p.vx) * 0.07 * step; p.vy += ((dy / d) * 7 - p.vy) * 0.07 * step;
            if (d < 70) {
              p.mode = "mob"; p.ang = Math.atan2(p.y - tgt[1], p.x - tgt[0]); p.mobT = 0;
              if (!p.swarm.arrived) { p.swarm.arrived = true; p.swarm.onArrive?.(); }
            }
          } else if (tgt) {
            // Mob them: buzz round in tight, jittery loops, then pop.
            p.mobT += step; p.ang += 0.13 * step * p.dir; p.vx = 0; p.vy = 0;
            const rad = 38 + Math.sin(t * 11 + p.phase) * 12;
            p.x = tgt[0] + Math.cos(p.ang) * rad * 1.35; p.y = tgt[1] + Math.sin(p.ang) * rad * 0.75 - 8;
            if (p.mobT > 75 + p.phase * 6) { this.pixels(p.x - this.x.s, p.y, 4); p.life = p.max; }
          } else if (p.y > 250) p.vy -= 0.08 * step;
          const wy = p.y + Math.sin(t * p.freq + p.phase) * p.amp;
          const wx = p.x + Math.cos(t * p.freq * 0.7 + p.phase) * p.amp * 0.5;
          const tilt = Math.cos(t * p.freq + p.phase) * 14;
          el.setAttribute("transform", `translate(${wx.toFixed(1)} ${wy.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
          p.wings.setAttribute("transform", `translate(0 -13) scale(1 ${(0.25 + Math.abs(Math.sin(t * 60 + p.phase)) * 0.75).toFixed(2)}) translate(0 13)`);
          el.setAttribute("opacity", k > 0.85 ? ((1 - k) / 0.15).toFixed(2) : Math.min(1, p.life / 6).toFixed(2));
          break;
        }
        case "char": {
          el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          el.setAttribute("opacity", (1 - k * k).toFixed(2));
          break;
        }
        default: {
          el.setAttribute("x", (p.x - p.s / 2).toFixed(1)); el.setAttribute("y", (p.y - p.s / 2).toFixed(1));
          el.setAttribute("opacity", (1 - k * k).toFixed(2));
        }
      }
      return true;
    });
    this.parts = alive.concat(this.parts);
  }
}
