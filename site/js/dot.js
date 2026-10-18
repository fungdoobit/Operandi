// DOT, the Digital Operandi Teammate. An original goopy blob drawn in SVG.
// Moods change the eyes, mouth and animation; say() shows a speech bubble.

const BODY_A = "M28 150 C6 150 8 98 28 66 C48 30 92 12 128 20 C166 30 184 66 186 104 C187 118 181 125 171 122 C160 119 152 124 152 134 C152 144 148 152 138 153 L48 155 C37 155 30 154 28 150 Z";
const BODY_B = "M26 151 C5 149 11 96 31 66 C51 33 94 17 129 24 C164 35 181 69 183 105 C184 120 178 127 168 124 C158 121 151 126 151 136 C151 145 147 153 137 154 L47 155 C36 156 28 155 26 151 Z";
const BODY_C = "M30 149 C9 151 6 100 26 67 C46 28 90 9 128 17 C168 27 187 63 189 102 C190 116 184 122 174 120 C163 117 154 122 154 132 C154 142 150 150 140 152 L50 154 C39 154 32 153 30 149 Z";

const MOUTHS = {
  idle: "M84 133 Q91 128 98 133",
  happy: "M82 130 Q91 141 100 130",
  celebrate: "M80 128 Q91 146 102 128 Z",
  worried: "M82 135 Q86 131 91 135 Q96 139 100 135",
  sad: "M83 136 Q91 128 99 136",
  thinking: "M86 133 L97 132",
  sleepy: "M86 133 Q91 135 96 133",
};

let uid = 0;

function svg(id) {
  return `
<svg class="dot-svg" viewBox="0 0 200 172" role="img" aria-label="DOT, your Operandi teammate">
  <defs>
    <radialGradient id="dotBody${id}" cx="45%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#e6fbff"/>
      <stop offset="45%" stop-color="#a6e6fb"/>
      <stop offset="85%" stop-color="#6cc6ee"/>
      <stop offset="100%" stop-color="#4fb0e0"/>
    </radialGradient>
    <filter id="dotGlow${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feFlood flood-color="#7fdcff" flood-opacity="0.75"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="eyeGlow${id}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.9"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse class="dot-shadow" cx="100" cy="161" rx="70" ry="8"/>
  <g class="dot-bob">
    <g class="dot-squish">
      <path class="dot-body" d="${BODY_A}" fill="url(#dotBody${id})" filter="url(#dotGlow${id})">
        <animate attributeName="d" dur="2.6s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
          values="${BODY_A};${BODY_B};${BODY_C};${BODY_A}"/>
      </path>
      <ellipse cx="84" cy="42" rx="22" ry="9" fill="#ffffff" opacity="0.45" transform="rotate(-14 84 42)"/>
      <circle cx="114" cy="34" r="4" fill="#ffffff" opacity="0.5"/>
      <circle cx="150" cy="60" r="7" fill="#ffffff" opacity="0.16"/>
      <circle cx="120" cy="140" r="5" fill="#ffffff" opacity="0.2"/>
      <g class="dot-face">
        <g class="dot-eyes" filter="url(#eyeGlow${id})">
          <g class="dot-eye"><ellipse class="eye-white" cx="62" cy="106" rx="19" ry="20"/><path class="eye-arc" d="M46 110 Q62 92 78 110"/><path class="eye-shut" d="M47 106 Q62 116 77 106"/></g>
          <g class="dot-eye"><ellipse class="eye-white" cx="114" cy="108" rx="19" ry="20"/><path class="eye-arc" d="M98 112 Q114 94 130 112"/><path class="eye-shut" d="M99 108 Q114 118 129 108"/></g>
        </g>
        <path class="dot-mouth" d="${MOUTHS.idle}"/>
        <g class="dot-sweat"><path d="M150 74 Q157 85 150 92 Q143 85 150 74 Z"/></g>
        <g class="acc acc-glasses"><rect x="40" y="85" width="44" height="40" rx="14"/><rect x="92" y="87" width="44" height="40" rx="14"/><path d="M84 103 Q88 99 92 104"/></g>
        <g class="acc acc-bow" transform="translate(-6 0)"><path d="M58 30 L40 18 L42 44 Z"/><path d="M62 30 L80 18 L78 44 Z"/><circle cx="60" cy="31" r="6"/></g>
        <g class="acc acc-party"><path d="M98 22 L120 -22 L140 18 Z"/><path class="stripe" d="M106 6 L131 1 M112 -8 L126 -10"/><circle cx="120" cy="-24" r="6"/></g>
        <g class="acc acc-crown"><path d="M78 20 L84 -4 L96 12 L106 -10 L116 12 L128 -4 L132 20 Z"/><circle cx="106" cy="-10" r="3.5"/><circle cx="84" cy="-4" r="3"/><circle cx="128" cy="-4" r="3"/></g>
        <g class="dot-zz"><text x="152" y="40">z</text><text x="166" y="24">z</text></g>
      </g>
    </g>
  </g>
  <g class="dot-sparkles">
    <path d="M30 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/>
    <path d="M172 28 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/>
    <path d="M182 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>
  </g>
</svg>`;
}

export const DOT_CSS = `
.dot-wrap { display: flex; align-items: flex-end; gap: 10px; }
.dot-figure { width: 96px; flex: none; }
.dot-svg { width: 100%; height: auto; overflow: visible; display: block; }
.dot-shadow { fill: #000; opacity: 0.18; transform-origin: 100px 161px; animation: dot-shadow 2.6s ease-in-out infinite; }
.dot-squish { transform-origin: 100px 155px; animation: dot-squish 2.6s ease-in-out infinite; }
.dot-bob { transform-origin: 100px 155px; }
.eye-white { fill: #f7fdff; stroke: #16304a; stroke-width: 3.5; }
.eye-arc { fill: none; stroke: #f7fdff; stroke-width: 6; stroke-linecap: round; display: none; }
.eye-shut { fill: none; stroke: #16304a; stroke-width: 4; stroke-linecap: round; display: none; }
.dot-eyes { transform-origin: 88px 107px; animation: dot-blink 4.2s infinite; }
.dot-face { transition: transform .4s ease; }
.dot-mouth { fill: none; stroke: #16304a; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; transition: d .3s; }
.dot-sweat { display: none; fill: #dff7ff; stroke: #4fb0e0; stroke-width: 1.5; }
.dot-zz { display: none; font: 600 14px var(--font-mono, monospace); fill: #a6e6fb; }
.dot-sparkles { display: none; fill: #ffe27a; }
.acc { display: none; }
.dot-figure[data-acc="glasses"] .acc-glasses, .dot-figure[data-acc="bow"] .acc-bow,
.dot-figure[data-acc="party"] .acc-party, .dot-figure[data-acc="crown"] .acc-crown { display: inline; }
.acc-glasses rect { fill: rgba(255,255,255,.08); stroke: #16304a; stroke-width: 3.5; }
.acc-glasses path { fill: none; stroke: #16304a; stroke-width: 3.5; }
.acc-bow { fill: #ff8fbf; stroke: #c2477e; stroke-width: 2; stroke-linejoin: round; }
.acc-party path:first-child { fill: #ffcf4a; stroke: #c98a12; stroke-width: 2; stroke-linejoin: round; }
.acc-party .stripe { fill: none; stroke: #ff6fa8; stroke-width: 4; stroke-linecap: round; }
.acc-party circle { fill: #ff6fa8; }
.acc-crown path { fill: #ffd54a; stroke: #b8860b; stroke-width: 2.5; stroke-linejoin: round; }
.acc-crown circle { fill: #ff6f91; }

/* Moods */
.dot-figure[data-mood="happy"] .dot-bob { animation: dot-hop 1.1s ease-in-out 2; }
.dot-figure[data-mood="happy"] .eye-white,
.dot-figure[data-mood="celebrate"] .eye-white { display: none; }
.dot-figure[data-mood="happy"] .eye-arc,
.dot-figure[data-mood="celebrate"] .eye-arc { display: inline; }
.dot-figure[data-mood="happy"] .dot-eyes,
.dot-figure[data-mood="celebrate"] .dot-eyes { animation: none; }
.dot-figure[data-mood="celebrate"] .dot-bob { animation: dot-hop .7s ease-in-out 4; }
.dot-figure[data-mood="celebrate"] .dot-sparkles { display: inline; animation: dot-twinkle .7s ease-in-out infinite alternate; }
.dot-figure[data-mood="celebrate"] .dot-mouth { fill: #16304a; }
.dot-figure[data-mood="thinking"] .dot-face { transform: translate(6px, -4px); }
.dot-figure[data-mood="thinking"] .eye-white { transform: scaleY(0.92); transform-box: fill-box; transform-origin: center; }
.dot-figure[data-mood="worried"] .dot-sweat { display: inline; animation: dot-drip 1.6s ease-in infinite; }
.dot-figure[data-mood="worried"] .dot-squish { animation-duration: 1.3s; }
.dot-figure[data-mood="sad"] .dot-squish { animation: dot-droop 3s ease-in-out infinite; }
.dot-figure[data-mood="sad"] .dot-face { transform: translateY(5px); }
.dot-figure[data-mood="sleepy"] .eye-white { display: none; }
.dot-figure[data-mood="sleepy"] .eye-shut { display: inline; }
.dot-figure[data-mood="sleepy"] .dot-eyes { animation: none; }
.dot-figure[data-mood="sleepy"] .dot-zz { display: inline; animation: dot-float 2.4s ease-in-out infinite; }
.dot-figure[data-mood="sleepy"] .dot-squish { animation-duration: 4s; }

@keyframes dot-squish { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.04,.96); } }
@keyframes dot-shadow { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(1.06); } }
@keyframes dot-blink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(.08); } }
@keyframes dot-hop { 0%,100% { transform: translateY(0) scale(1,1); } 15% { transform: translateY(0) scale(1.12,.86); } 45% { transform: translateY(-26px) scale(.92,1.1); } 75% { transform: translateY(0) scale(1.1,.9); } }
@keyframes dot-droop { 0%,100% { transform: scale(1.06,.9); } 50% { transform: scale(1.09,.87); } }
@keyframes dot-drip { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(14px); opacity: 0; } }
@keyframes dot-float { 0% { transform: translateY(0); opacity: .3; } 50% { opacity: 1; } 100% { transform: translateY(-10px); opacity: .2; } }
@keyframes dot-twinkle { from { opacity: .3; } to { opacity: 1; } }

.dot-bubble { position: relative; background: var(--surface, #fff); color: var(--ink, #14161b); border: 1.5px solid var(--dot-line, #9fdcf5); border-radius: 14px; padding: 10px 14px; font-size: 14px; line-height: 1.45; max-width: 46ch; box-shadow: 0 0 0 4px color-mix(in srgb, #7fdcff 18%, transparent); min-width: 0; }
.dot-bubble::before { content: ""; position: absolute; left: -8px; bottom: 18px; width: 14px; height: 14px; background: inherit; border-left: 1.5px solid var(--dot-line, #9fdcf5); border-bottom: 1.5px solid var(--dot-line, #9fdcf5); transform: rotate(45deg); }
.dot-bubble b.dot-title { display: block; margin-bottom: 2px; }
.dot-bubble .dot-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.dot-bubble .dot-actions button { font: inherit; font-size: 13px; border: 1px solid var(--dot-line, #9fdcf5); background: transparent; color: inherit; border-radius: 999px; padding: 3px 12px; cursor: pointer; }
.dot-bubble .dot-actions button:hover { background: color-mix(in srgb, #7fdcff 20%, transparent); }
.dot-bubble[hidden] { display: none; }

@media (prefers-reduced-motion: reduce) {
  .dot-figure *, .dot-figure { animation: none !important; transition: none !important; }
}`;

export class Dot {
  constructor(container, { size } = {}) {
    const id = ++uid;
    container.innerHTML = `<div class="dot-wrap"><div class="dot-figure" data-mood="idle">${svg(id)}</div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.figure = container.querySelector(".dot-figure");
    this.bubble = container.querySelector(".dot-bubble");
    this.mouth = container.querySelector(".dot-mouth");
    if (size) this.figure.style.width = size + "px";
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) container.querySelector("svg").pauseAnimations?.();
    this.moodTimer = null;
  }

  setAccessory(id) { if (id) this.figure.dataset.acc = id; else delete this.figure.dataset.acc; }

  setMood(mood, { revertAfter } = {}) {
    clearTimeout(this.moodTimer);
    this.figure.dataset.mood = mood;
    this.mouth.setAttribute("d", MOUTHS[mood] || MOUTHS.idle);
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
  }

  hush() { this.bubble.hidden = true; }
}
