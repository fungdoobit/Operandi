// DOT, the Digital Operandi Teammate: an original goopy water blob in SVG.
// The body outline is re-drawn every frame with a soft wobble, so DOT always
// looks a little liquid, and jiggles harder when moved (nudge, pick up, plop).
// Moods change the face; say() shows a speech bubble.

const INK = "#16304a";

// Body outline as cubic segments: [start, c1, c2, end, c1, c2, end, ...].
// Bottom points (y >= 150) barely wobble, so DOT sits on the ground.
const BODY = [
  [96, 168],
  [60, 169], [28, 168], [13, 156],
  [1, 146], [-1, 126], [3, 108],
  [9, 72], [32, 38], [64, 25],
  [84, 17], [110, 15], [130, 21],
  [158, 30], [179, 53], [185, 76],
  [188, 88], [185, 98], [178, 100],
  [171, 102], [165, 104], [164, 112],
  [163, 122], [186, 128], [185, 147],
  [184, 162], [160, 168], [132, 168],
  [120, 168], [108, 168], [96, 168],
];
const GROUND = 166, CX = 96, CY = 100;

// Sample the outline into evenly spread anchor points once. Each frame the
// anchors move a little, and a smooth curve (Catmull-Rom) is drawn through
// them, so the outline can wobble without ever forming a corner.
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
}
const dense = [];
for (let i = 0; i + 3 < BODY.length; i += 3) {
  for (let j = 0; j < 40; j++) dense.push(cubic(BODY[i], BODY[i + 1], BODY[i + 2], BODY[i + 3], j / 40));
}
const lengths = [0];
for (let i = 1; i <= dense.length; i++) {
  const a = dense[i - 1], b = dense[i % dense.length];
  lengths.push(lengths[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
}
const ANCHOR_COUNT = 44, ANCHORS = [];
for (let k = 0, i = 0; k < ANCHOR_COUNT; k++) {
  const want = (k / ANCHOR_COUNT) * lengths[lengths.length - 1];
  while (lengths[i + 1] < want) i++;
  ANCHORS.push(dense[i]);
}
const ANGLE = ANCHORS.map(([x, y]) => Math.atan2(y - CY, x - CX));
// How free each point is to wobble: 0 at the ground (DOT stays planted),
// easing up to 1 by mid-body, so there's no crease where the two meet.
const GRIP = ANCHORS.map(([, y]) => { const k = Math.min(1, Math.max(0, (GROUND + 4 - y) / 70)); return k * k * (3 - 2 * k); });

function smoothPath(pts) {
  const n = pts.length, f = (v) => v.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

const MOUTHS = {
  idle: "M54 128 Q60 133 66 128",
  happy: "M52 126 Q60 136 68 126",
  celebrate: "M50 124 Q60 140 70 124 Z",
  thinking: "M55 130 L65 129",
  worried: "M52 131 Q56 127 60 131 Q64 135 68 131",
  sad: "M53 132 Q60 125 67 132",
  sleepy: "M56 130 Q60 132 64 130",
  held: "M57 130 a3.5 4.5 0 1 0 7 0 a3.5 4.5 0 1 0 -7 0",
  plop: "M53 129 Q60 133 67 129",
};

let uid = 0;

function svg(id) {
  return `
<svg class="dot-svg" viewBox="-8 -30 208 205" role="img" aria-label="DOT, your Operandi teammate">
  <defs>
    <radialGradient id="dotBody${id}" cx="40%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#e9fbff" stop-opacity="0.98"/>
      <stop offset="40%" stop-color="#b3ebfc" stop-opacity="0.95"/>
      <stop offset="80%" stop-color="#7fd0f2" stop-opacity="0.93"/>
      <stop offset="100%" stop-color="#5bb7e4" stop-opacity="0.95"/>
    </radialGradient>
    <filter id="dotGlow${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="b"/>
      <feFlood flood-color="#8ae2ff" flood-opacity="0.7"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="eyeGlow${id}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.95"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="dotClip${id}"><path class="dot-clip"/></clipPath>
  </defs>
  <ellipse class="dot-shadow" cx="94" cy="169" rx="92" ry="8"/>
  <g class="dot-hop">
    <g class="dot-jelly">
      <path class="dot-body" fill="url(#dotBody${id})" filter="url(#dotGlow${id})"/>
      <g clip-path="url(#dotClip${id})" class="dot-inner">
        <circle class="ripple r1" cx="120" cy="80" r="26"/>
        <circle class="ripple r2" cx="70" cy="70" r="18"/>
        <circle class="ripple r3" cx="130" cy="135" r="20"/>
        <ellipse cx="118" cy="36" rx="20" ry="7" fill="#fff" opacity=".55" transform="rotate(-8 118 36)"/>
        <circle cx="90" cy="30" r="4" fill="#fff" opacity=".6"/>
        <circle cx="146" cy="48" r="3" fill="#fff" opacity=".45"/>
        <circle cx="104" cy="150" r="4" fill="#fff" opacity=".35"/>
      </g>
      <path class="dot-outline"/>
      <g class="dot-face">
        <g class="dot-eyes" filter="url(#eyeGlow${id})">
          <g class="dot-eye"><circle class="eye-white" cx="36" cy="103" r="16.5"/><path class="eye-line eye-arc" d="M22 106 Q36 92 50 106"/><path class="eye-line eye-shut" d="M22 103 Q36 112 50 103"/><path class="eye-line eye-squeeze" d="M25 96 L44 103 L25 110"/></g>
          <g class="dot-eye"><circle class="eye-white" cx="98" cy="108" r="19"/><path class="eye-line eye-arc" d="M82 111 Q98 95 114 111"/><path class="eye-line eye-shut" d="M82 108 Q98 118 114 108"/><path class="eye-line eye-squeeze" d="M109 100 L88 108 L109 116"/></g>
        </g>
        <path class="dot-mouth" d="${MOUTHS.idle}"/>
        <path class="dot-sweat" d="M150 66 Q157 77 150 84 Q143 77 150 66 Z"/>
        <g class="acc acc-glasses"><rect x="15" y="85" width="42" height="36" rx="13"/><rect x="77" y="88" width="44" height="40" rx="14"/><path d="M57 101 Q67 96 77 102"/></g>
        <g class="acc acc-bow"><path d="M52 32 L34 20 L36 46 Z"/><path d="M56 32 L74 20 L72 46 Z"/><circle cx="54" cy="33" r="6"/></g>
        <g class="acc acc-party"><path d="M84 22 L104 -26 L126 18 Z"/><path class="stripe" d="M92 4 L117 0 M98 -10 L111 -12"/><circle cx="104" cy="-28" r="6"/></g>
        <g class="acc acc-crown"><path d="M74 22 L80 -2 L92 14 L102 -8 L112 14 L124 -2 L128 22 Z"/><circle cx="102" cy="-8" r="3.5"/><circle cx="80" cy="-2" r="3"/><circle cx="124" cy="-2" r="3"/></g>
      </g>
    </g>
  </g>
  <g class="dot-zz"><text x="150" y="30">z</text><text x="164" y="12">z</text></g>
  <g class="dot-sparkles">
    <path d="M20 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/>
    <path d="M178 14 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/>
    <path d="M190 128 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>
  </g>
</svg>`;
}

export const DOT_CSS = `
.dot-wrap { display: flex; align-items: flex-end; gap: 10px; }
.dot-figure { width: 96px; flex: none; touch-action: none; }
.dot-svg { width: 100%; height: auto; overflow: visible; display: block; }
.dot-shadow { fill: #000; opacity: 0.16; transform-origin: 94px 169px; transition: transform .25s, opacity .25s; }
.dot-hop { transform-origin: 96px 164px; }
.dot-outline { fill: none; stroke: ${INK}; stroke-opacity: .55; stroke-width: 2.2; }
.ripple { fill: none; stroke: #ffffff; stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; animation: dot-ripple 5.5s ease-out infinite; }
.ripple.r2 { animation-delay: 1.8s; } .ripple.r3 { animation-delay: 3.6s; }
.eye-white { fill: #fbfeff; stroke: ${INK}; stroke-width: 3.5; transform-box: fill-box; transform-origin: center; transition: transform .2s; }
.eye-line { fill: none; stroke: ${INK}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; display: none; }
.dot-eyes { transform-origin: 66px 105px; animation: dot-blink 4.6s infinite; }
.dot-face { transition: transform .35s ease; }
.dot-mouth { fill: none; stroke: ${INK}; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.dot-sweat { display: none; fill: #e3f8ff; stroke: #4fb0e0; stroke-width: 1.5; }
.dot-zz { display: none; font: 600 14px var(--font-mono, monospace); fill: #7fd0f2; }
.dot-sparkles { display: none; fill: #ffd54a; }
.acc { display: none; }

/* Moods */
.dot-figure[data-mood="happy"] .eye-white, .dot-figure[data-mood="celebrate"] .eye-white,
.dot-figure[data-mood="sleepy"] .eye-white, .dot-figure[data-mood="plop"] .eye-white { display: none; }
.dot-figure[data-mood="happy"] .eye-arc, .dot-figure[data-mood="celebrate"] .eye-arc { display: inline; }
.dot-figure[data-mood="sleepy"] .eye-shut { display: inline; }
.dot-figure[data-mood="plop"] .eye-squeeze { display: inline; }
.dot-figure:is([data-mood="happy"],[data-mood="celebrate"],[data-mood="sleepy"],[data-mood="plop"],[data-mood="held"]) .dot-eyes { animation: none; }
.dot-figure[data-mood="happy"] .dot-hop { animation: dot-hop 1.1s 2; }
.dot-figure[data-mood="celebrate"] .dot-hop { animation: dot-hop .85s 3; }
.dot-figure[data-mood="celebrate"] .dot-sparkles { display: inline; animation: dot-twinkle .6s ease-in-out infinite alternate; }
.dot-figure[data-mood="celebrate"] .dot-mouth { fill: ${INK}; }
.dot-figure[data-mood="thinking"] .dot-face { transform: translate(5px, -5px); }
.dot-figure[data-mood="thinking"] .eye-white { transform: scale(1, .9); }
.dot-figure[data-mood="worried"] .dot-sweat { display: inline; animation: dot-drip 1.6s ease-in infinite; }
.dot-figure[data-mood="sad"] .dot-face { transform: translateY(6px); }
.dot-figure[data-mood="sleepy"] .dot-zz { display: inline; animation: dot-float 2.4s ease-in-out infinite; }
.dot-figure[data-mood="held"] .eye-white { transform: scale(1.12); }
.dot-figure[data-mood="held"] .dot-mouth { fill: ${INK}; }
.dot-figure[data-mood="held"] .dot-shadow { transform: scale(.55); opacity: .08; }
.dot-figure[data-mood="held"] .dot-hop { animation: dot-dangle 1.6s ease-in-out infinite; transform-origin: 96px 20px; }
.dot-figure.dragging { cursor: grabbing; }

.dot-figure[data-acc="glasses"] .acc-glasses, .dot-figure[data-acc="bow"] .acc-bow,
.dot-figure[data-acc="party"] .acc-party, .dot-figure[data-acc="crown"] .acc-crown { display: inline; }
.acc-glasses rect { fill: rgba(255,255,255,.08); stroke: ${INK}; stroke-width: 3.5; }
.acc-glasses path { fill: none; stroke: ${INK}; stroke-width: 3.5; }
.acc-bow { fill: #ff8fbf; stroke: #c2477e; stroke-width: 2; stroke-linejoin: round; }
.acc-party path:first-child { fill: #ffcf4a; stroke: #c98a12; stroke-width: 2; stroke-linejoin: round; }
.acc-party .stripe { fill: none; stroke: #ff6fa8; stroke-width: 4; stroke-linecap: round; }
.acc-party circle { fill: #ff6fa8; }
.acc-crown path { fill: #ffd54a; stroke: #b8860b; stroke-width: 2.5; stroke-linejoin: round; }
.acc-crown circle { fill: #ff6f91; }

@keyframes dot-blink { 0%,93%,100% { transform: scaleY(1); } 96% { transform: scaleY(.08); } }
@keyframes dot-hop {
  0% { transform: translateY(0) scale(1, 1); animation-timing-function: cubic-bezier(.3, 0, .5, 1); }
  10% { transform: translateY(0) scale(1.06, .94); animation-timing-function: cubic-bezier(.2, .6, .4, 1); }
  48% { transform: translateY(-22px) scale(.97, 1.04); animation-timing-function: cubic-bezier(.6, 0, .8, .4); }
  82% { transform: translateY(0) scale(1.07, .93); animation-timing-function: cubic-bezier(.3, 0, .4, 1); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes dot-dangle { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes dot-ripple { 0% { opacity: .5; transform: scale(.2); } 70% { opacity: 0; transform: scale(1.4); } 100% { opacity: 0; } }
@keyframes dot-drip { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(14px); opacity: 0; } }
@keyframes dot-float { 0% { transform: translateY(0); opacity: .3; } 50% { opacity: 1; } 100% { transform: translateY(-10px); opacity: .2; } }
@keyframes dot-twinkle { from { opacity: .3; } to { opacity: 1; } }

.dot-bubble { position: relative; background: var(--surface, #fff); color: var(--ink, #14161b); border: 1.5px solid var(--dot-line, #9fdcf5); border-radius: 14px; padding: 10px 14px; font-size: 14px; line-height: 1.45; max-width: 46ch; box-shadow: 0 0 0 4px rgb(127 220 255 / .18); min-width: 0; }
.dot-bubble::before { content: ""; position: absolute; left: -8px; bottom: 18px; width: 14px; height: 14px; background: inherit; border-left: 1.5px solid var(--dot-line, #9fdcf5); border-bottom: 1.5px solid var(--dot-line, #9fdcf5); transform: rotate(45deg); }
.dot-bubble b.dot-title { display: block; margin-bottom: 2px; }
.dot-bubble .dot-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.dot-bubble .dot-actions button { font: inherit; font-size: 13px; border: 1px solid var(--dot-line, #9fdcf5); background: transparent; color: inherit; border-radius: 999px; padding: 3px 12px; cursor: pointer; }
.dot-bubble .dot-actions button:hover { background: rgb(127 220 255 / .2); }

@media (prefers-reduced-motion: reduce) {
  .dot-figure *, .dot-figure { animation: none !important; transition: none !important; }
}`;

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Dot {
  constructor(container, { size } = {}) {
    const id = ++uid;
    container.innerHTML = `<div class="dot-wrap"><div class="dot-figure" data-mood="idle">${svg(id)}</div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.figure = container.querySelector(".dot-figure");
    this.bubble = container.querySelector(".dot-bubble");
    this.mouth = container.querySelector(".dot-mouth");
    this.body = container.querySelector(".dot-body");
    this.outline = container.querySelector(".dot-outline");
    this.clip = container.querySelector(".dot-clip");
    this.jelly = container.querySelector(".dot-jelly");
    if (size) this.figure.style.width = size + "px";
    this.moodTimer = null;
    // Squash and stretch springs: s = current, v = velocity, target set by mood.
    this.sx = { s: 1, v: 0, t: 1 };
    this.sy = { s: 1, v: 0, t: 1 };
    this.lean = { s: 0, v: 0, t: 0 };
    this.energy = 0;
    this.start = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  // One animation frame: wobble the outline and settle the springs.
  frame(now) {
    if (!this.figure.isConnected) return; // removed from the page: stop
    const t = (now - this.start) / 1000;
    // Scale every step by real elapsed time, so motion is the same speed at 60 or 120 fps.
    const step = Math.min(3, (now - (this.last ?? now)) / (1000 / 60)) || 1;
    this.last = now;
    const still = reduceMotion();
    for (const k of [this.sx, this.sy, this.lean]) {
      k.v += (k.t - k.s) * 0.07 * step;
      k.v *= Math.pow(0.86, step);
      k.s += k.v * step;
    }
    this.energy *= Math.pow(0.965, step);
    // Ease the wobble size toward its target instead of jumping, for a calm, liquid feel.
    const want = still ? 0 : 1.0 + this.energy * 4;
    this.amp = (this.amp ?? want) + (want - (this.amp ?? want)) * Math.min(1, 0.08 * step);
    const amp = this.amp;
    const breathe = still ? 0 : Math.sin(t * 1.5) * 0.016;
    // Slow, broad waves around the body: neighbouring points move together.
    const pts = ANCHORS.map(([x, y], i) => {
      const a = ANGLE[i];
      const w = amp * GRIP[i] * (0.65 * Math.sin(2 * a + t * 1.15) + 0.35 * Math.sin(3 * a - t * 0.85));
      return [x + Math.cos(a) * w, y + Math.sin(a) * w];
    });
    const d = smoothPath(pts);
    this.body.setAttribute("d", d);
    this.outline.setAttribute("d", d);
    this.clip.setAttribute("d", d);
    const sx = this.sx.s + breathe, sy = this.sy.s - breathe, lean = this.lean.s;
    // Squash/stretch around the bottom centre, plus a lean (shear) when moving.
    this.jelly.setAttribute("transform", `matrix(${sx.toFixed(4)} 0 ${(-lean).toFixed(4)} ${sy.toFixed(4)} ${(CX - sx * CX + lean * GROUND).toFixed(2)} ${(GROUND - sy * GROUND).toFixed(2)})`);
    requestAnimationFrame(this.frame);
  }

  // Give DOT a jiggle, e.g. while being moved. vx = horizontal speed in px/frame.
  nudge(vx = 0, amount = 0.6) {
    this.energy = Math.min(1.5, this.energy + amount);
    this.lean.t = Math.max(-0.22, Math.min(0.22, vx * 0.02));
    this.sx.v += amount * 0.04;
    this.sy.v -= amount * 0.04;
  }

  pickUp() {
    this.setMood("held");
    this.figure.classList.add("dragging");
    this.sx.t = 0.84; this.sy.t = 1.22;
    this.energy = 1;
  }

  drop() {
    this.figure.classList.remove("dragging");
    this.lean.t = 0;
    this.setMood("plop");
    // Splat flat, then spring back with a wobble.
    this.sx.t = 1; this.sy.t = 1;
    this.sx.s = 1.35; this.sy.s = 0.62; this.sx.v = 0; this.sy.v = 0;
    this.energy = 1.5;
    clearTimeout(this.moodTimer);
    this.moodTimer = setTimeout(() => this.setMood("happy", { revertAfter: 1800 }), 650);
  }

  setAccessory(id) { if (id) this.figure.dataset.acc = id; else delete this.figure.dataset.acc; }

  setMood(mood, { revertAfter } = {}) {
    clearTimeout(this.moodTimer);
    this.figure.dataset.mood = mood;
    this.mouth.setAttribute("d", MOUTHS[mood] || MOUTHS.idle);
    if (mood === "sad") { this.sx.t = 1.07; this.sy.t = 0.9; }
    else if (mood !== "held") { this.sx.t = 1; this.sy.t = 1; }
    if (mood === "happy" || mood === "celebrate") this.nudge(0, 0.5);
    if (revertAfter) this.moodTimer = setTimeout(() => this.setMood("idle"), revertAfter);
  }

  // text: plain string. title: optional bold first line. actions: [{label, onClick}]
  say(text, { title, mood, actions } = {}) {
    if (mood) this.setMood(mood);
    const b = this.bubble;
    b.replaceChildren();
    if (title) { const t = document.createElement("b"); t.className = "dot-title"; t.textContent = title; b.append(t); }
    const p = document.createElement("span"); p.textContent = text; b.append(p);
    if (actions?.length) {
      const row = document.createElement("div"); row.className = "dot-actions";
      for (const a of actions) {
        const btn = document.createElement("button"); btn.type = "button"; btn.textContent = a.label;
        btn.addEventListener("click", a.onClick);
        row.append(btn);
      }
      b.append(row);
    }
    b.hidden = false;
    this.nudge(0, 0.25);
  }

  hush() { this.bubble.hidden = true; }
}
