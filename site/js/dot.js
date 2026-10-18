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
  [188, 88], [187, 97], [181, 100],
  [176, 103], [173, 106], [173, 113],
  [173, 122], [188, 128], [186, 147],
  [184, 162], [160, 168], [132, 168],
  [120, 168], [108, 168], [96, 168],
];
// Other body shapes DOT and PYRO morph into. They start at the same point and
// run the same way round, so the outlines blend smoothly into each other.
// Picked up: long and droopy, heavy at the bottom, no C-shaped notch.
const HELD = [
  [96, 168],
  [64, 169], [34, 166], [24, 150],
  [12, 130], [16, 92], [32, 64],
  [48, 36], [72, 14], [98, 14],
  [124, 14], [148, 36], [162, 64],
  [178, 94], [182, 128], [172, 150],
  [164, 164], [136, 168], [118, 168],
  [110, 168], [104, 168], [96, 168],
];
// Melting: low and spread out, with little puddle lips at the base.
const MELT = [
  [96, 169],
  [56, 170], [12, 171], [0, 163],
  [-10, 155], [6, 148], [8, 130],
  [10, 90], [32, 52], [66, 38],
  [86, 30], [110, 29], [130, 33],
  [158, 41], [178, 60], [183, 80],
  [186, 91], [185, 100], [180, 102],
  [176, 105], [173, 108], [173, 116],
  [173, 128], [184, 137], [188, 150],
  [196, 163], [176, 170], [140, 170],
  [122, 170], [108, 170], [96, 169],
];
// Splat: like a drop hitting water, a flat puddle with its edges flicked up (a "crown").
const SPLASH = [
  [96, 168],
  [60, 169], [10, 169], [-4, 166],
  [-16, 160], [-14, 132], [0, 130],
  [12, 128], [16, 142], [24, 148],
  [36, 140], [62, 110], [96, 110],
  [130, 110], [156, 140], [172, 150],
  [176, 142], [180, 128], [192, 130],
  [206, 132], [208, 160], [196, 166],
  [182, 169], [132, 169], [96, 168],
];
const GROUND = 166, CX = 96, CY = 100;

// Sample the outline into evenly spread anchor points once. Each frame the
// anchors move a little, and a smooth curve (Catmull-Rom) is drawn through
// them, so the outline can wobble without ever forming a corner.
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
}
// `count` evenly spaced points around an outline.
function sample(shape, count) {
  const dense = [];
  for (let i = 0; i + 3 < shape.length; i += 3) {
    for (let j = 0; j < 40; j++) dense.push(cubic(shape[i], shape[i + 1], shape[i + 2], shape[i + 3], j / 40));
  }
  const lengths = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    lengths.push(lengths[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const out = [];
  for (let k = 0, i = 0; k < count; k++) {
    const want = (k / count) * lengths[lengths.length - 1];
    while (lengths[i + 1] < want) i++;
    out.push(dense[i]);
  }
  return out;
}
const smooth = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
// PYRO uses more points so his flame tufts (part of the outline itself) stay round.
function geometry(count) {
  const anchors = sample(BODY, count);
  return {
    anchors,
    held: sample(HELD, count),
    melt: sample(MELT, count),
    crown: sample(SPLASH, count),
    angle: anchors.map(([x, y]) => Math.atan2(y - CY, x - CX)),
    // How free each point is to wobble: 0 at the ground (DOT stays planted),
    // easing up to 1 by mid-body, so there's no crease where the two meet.
    grip: anchors.map(([, y]) => smooth((GROUND + 4 - y) / 70)),
    // How much of the top of the head a point is: where PYRO's flames rise.
    top: anchors.map(([x, y]) => smooth((62 - y) / 30) * smooth((Math.atan2(CY - y, Math.abs(x - CX) + 1) - 0.25) / 0.5)),
  };
}
const GEO = { dot: geometry(44), pyro: geometry(120) };

function taubin(pts, strength, rounds = 4) {
  const n = pts.length;
  for (let r = 0; r < rounds; r++) {
    for (const f of [0.5 * strength, -0.53 * strength]) {
      pts = pts.map(([x, y], i) => {
        const [ax, ay] = pts[(i - 1 + n) % n], [bx, by] = pts[(i + 1) % n];
        return [x + f * ((ax + bx) / 2 - x), y + f * ((ay + by) / 2 - y)];
      });
    }
  }
  return pts;
}

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

// Looks for each teammate. DOT is water; PYRO (PYthon Runtime Operative) is
// fire: same chubby body, warm glow, embers inside and soft flames on top.
const SKINS = {
  dot: {
    label: "DOT, your Operandi teammate",
    stops: ["#e9fbff", "#b3ebfc", "#7fd0f2", "#5bb7e4"],
    glow: "#8ae2ff", outline: INK, shine: "#ffffff",
    inner: `<circle class="ripple r1" cx="120" cy="80" r="26"/><circle class="ripple r2" cx="70" cy="70" r="18"/><circle class="ripple r3" cx="130" cy="135" r="20"/>`,
  },
  pyro: {
    label: "PYRO, your Operandi teammate",
    stops: ["#fff3c4", "#ffc25e", "#ff8a3d", "#e5482b"],
    glow: "#ff9a3c", outline: "#5a1a0a", shine: "#fff7dc",
    inner: [[60, 150, 0], [96, 158, 1.1], [132, 152, 2.3], [78, 140, 3.0], [116, 146, 0.6], [146, 138, 1.8]]
      .map(([x, y, d]) => `<circle class="ember" cx="${x}" cy="${y}" r="2.6" style="animation-delay:${d}s"/>`).join(""),
    // Flame tufts rise out of the top of the outline: x = centre, w = width, h = height.
    flames: [{ x: 70, top: 23, w: 15, h: 16, p: 0 }, { x: 106, top: 15, w: 18, h: 24, p: 1.7 }, { x: 142, top: 26, w: 14, h: 14, p: 3.1 }],
  },
};

let uid = 0;

function svg(id, skin) {
  const k = SKINS[skin];
  return `
<svg class="dot-svg" viewBox="-8 -30 208 205" role="img" aria-label="${k.label}">
  <defs>
    <radialGradient id="dotBody${id}" cx="40%" cy="40%" r="75%">
      <stop offset="0%" stop-color="${k.stops[0]}" stop-opacity="0.98"/>
      <stop offset="40%" stop-color="${k.stops[1]}" stop-opacity="0.95"/>
      <stop offset="80%" stop-color="${k.stops[2]}" stop-opacity="0.93"/>
      <stop offset="100%" stop-color="${k.stops[3]}" stop-opacity="0.95"/>
    </radialGradient>
    <linearGradient id="dotFlame${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#ffe9a6" stop-opacity="0"/><stop offset="60%" stop-color="#ffe9a6" stop-opacity=".45"/><stop offset="100%" stop-color="#fff6d6" stop-opacity=".7"/>
    </linearGradient>
    <filter id="dotGlow${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="b"/>
      <feFlood flood-color="${k.glow}" flood-opacity="0.7"/>
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
        ${k.inner}
        ${k.flames ? `<g class="flame-cores">${k.flames.map(() => `<path fill="url(#dotFlame${id})"/>`).join("")}</g>` : ""}
        <ellipse cx="118" cy="36" rx="20" ry="7" fill="${k.shine}" opacity=".55" transform="rotate(-8 118 36)"/>
        <circle cx="90" cy="30" r="4" fill="${k.shine}" opacity=".6"/>
        <circle cx="146" cy="48" r="3" fill="${k.shine}" opacity=".45"/>
        <circle cx="104" cy="150" r="4" fill="${k.shine}" opacity=".35"/>
      </g>
      <path class="dot-outline" style="stroke:${k.outline}"/>
      <g class="face-shift"><g class="dot-face">
        <g class="dot-eyes" filter="url(#eyeGlow${id})">
          <g class="dot-eye"><circle class="eye-white" cx="36" cy="103" r="16.5"/><path class="eye-line eye-arc" d="M22 106 Q36 92 50 106"/><path class="eye-line eye-shut" d="M22 103 Q36 112 50 103"/><path class="eye-line eye-squeeze" d="M25 96 L44 103 L25 110"/></g>
          <g class="dot-eye"><circle class="eye-white" cx="98" cy="108" r="19"/><path class="eye-line eye-arc" d="M82 111 Q98 95 114 111"/><path class="eye-line eye-shut" d="M82 108 Q98 118 114 108"/><path class="eye-line eye-squeeze" d="M109 100 L88 108 L109 116"/></g>
        </g>
        <path class="dot-mouth" d="${MOUTHS.idle}"/>
        <path class="dot-sweat" d="M150 66 Q157 77 150 84 Q143 77 150 66 Z"/>
        <g class="acc acc-shades"><rect x="15" y="89" width="42" height="29" rx="11"/><rect x="76" y="92" width="45" height="31" rx="12"/><path class="bridge" d="M57 101 Q66 96 76 102"/><path class="glint" d="M22 97 L30 94 M84 100 L93 96"/></g>
        <g class="acc acc-nerd"><rect x="13" y="83" width="46" height="40" rx="6"/><rect x="74" y="86" width="49" height="44" rx="6"/><path d="M59 100 Q66 95 74 101"/></g>
        <g class="acc acc-moustache" transform="translate(60 127) scale(.72) translate(-60 -120)"><path d="M60 121 C53 113 40 114 34 123 C40 121 46 126 52 126 C56 126 58 124 60 123 C62 124 64 126 68 126 C74 126 80 121 86 123 C80 114 67 113 60 121 Z"/></g>
        <g class="acc acc-bow"><path d="M52 32 L34 20 L36 46 Z"/><path d="M56 32 L74 20 L72 46 Z"/><circle cx="54" cy="33" r="6"/></g>
        <g class="acc acc-party"><path d="M86 20 L106 -28 L128 16 Z"/><path class="stripe" d="M94 2 L119 -2 M100 -12 L113 -14"/><circle cx="106" cy="-30" r="6"/></g>
        <g class="acc acc-crown"><path d="M76 20 L82 -4 L94 12 L104 -10 L114 12 L126 -4 L130 20 Z"/><circle cx="104" cy="-10" r="3.5"/><circle cx="82" cy="-4" r="3"/><circle cx="126" cy="-4" r="3"/></g>
        <g class="acc acc-wizard"><path class="hat" d="M74 20 C86 -4 96 -34 126 -50 C114 -32 118 -6 138 20 Z"/><ellipse class="brim" cx="106" cy="20" rx="44" ry="8"/><path class="star" d="M100 -6 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z"/><path class="star" d="M116 -24 l1.5 3.5 3.5 .7 -2.8 2 .7 3.5 -2.9 -2 -2.9 2 .7 -3.5 -2.8 -2 3.5 -.7z"/></g>
        <g class="acc acc-laptop"><path class="lid" d="M68 124 L124 124 Q127 124 127 127 L127 156 L65 156 L65 127 Q65 124 68 124 Z"/><rect class="screen" x="70" y="129" width="52" height="23" rx="2"/><path class="code" d="M74 134 h18 M74 139 h28 M78 144 h14 M74 148 h22"/><path class="base" d="M58 156 L134 156 L140 164 Q140 166 137 166 L55 166 Q52 166 52 164 Z"/><circle class="logo" cx="96" cy="140" r="0"/></g>
      </g></g>
    </g>
  </g>
  <g class="dot-fx"></g>
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
.ember { fill: #ffe7a0; opacity: 0; animation: dot-ember 3.4s ease-out infinite; }
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

.dot-figure[data-acc~="shades"] .acc-shades, .dot-figure[data-acc~="nerd"] .acc-nerd, .dot-figure[data-acc~="moustache"] .acc-moustache,
.dot-figure[data-acc~="bow"] .acc-bow, .dot-figure[data-acc~="party"] .acc-party, .dot-figure[data-acc~="crown"] .acc-crown,
.dot-figure[data-acc~="wizard"] .acc-wizard, .dot-figure[data-acc~="laptop"] .acc-laptop { display: inline; }
.acc-shades rect { fill: #161b24; stroke: #0b0e14; stroke-width: 3; }
.acc-shades .bridge { fill: none; stroke: #0b0e14; stroke-width: 3.5; }
.acc-shades .glint { fill: none; stroke: #ffffff; stroke-opacity: .55; stroke-width: 2.5; stroke-linecap: round; }
.acc-nerd rect { fill: rgba(255,255,255,.1); stroke: #111; stroke-width: 6; }
.acc-nerd path { fill: none; stroke: #111; stroke-width: 5; }
.acc-moustache path { fill: #3b2516; stroke: #24150b; stroke-width: 1.5; }
.acc-wizard .hat { fill: #5b3fd0; stroke: #2e1f73; stroke-width: 2.5; stroke-linejoin: round; }
.acc-wizard .brim { fill: #4a31b3; stroke: #2e1f73; stroke-width: 2.5; }
.acc-wizard .star { fill: #ffd54a; }
.acc-laptop .lid, .acc-laptop .base { fill: #c9d1dc; stroke: #4d5868; stroke-width: 2; stroke-linejoin: round; }
.acc-laptop .screen { fill: #1b2838; }
.acc-laptop .code { fill: none; stroke: #7fe0a8; stroke-width: 2.2; stroke-linecap: round; opacity: .85; }
.dot-figure.typing .acc-laptop .code { animation: dot-code .28s steps(2) infinite; }
.dot-figure.typing .dot-eyes { transform: translateY(4px); }
.dot-figure.typing .dot-hop { animation: dot-type-bob .3s ease-in-out infinite; }
@keyframes dot-code { 0% { stroke-dasharray: 6 4; } 100% { stroke-dasharray: 10 3; } }
@keyframes dot-type-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(1.5px); } }
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
@keyframes dot-ember { 0% { opacity: 0; transform: translateY(0); } 15% { opacity: .9; } 100% { opacity: 0; transform: translateY(-70px); } }
@keyframes dot-twinkle { from { opacity: .3; } to { opacity: 1; } }

.dot-bubble { position: relative; background: var(--surface, #fff); color: var(--ink, #14161b); border: 1.5px solid var(--dot-line, #9fdcf5); border-radius: 14px; padding: 10px 14px; font-size: 14px; line-height: 1.45; max-width: 46ch; box-shadow: 0 0 0 4px rgb(127 220 255 / .18); min-width: 0; }
.dot-bubble::before { content: ""; position: absolute; left: -8px; bottom: 18px; width: 14px; height: 14px; background: inherit; border-left: 1.5px solid var(--dot-line, #9fdcf5); border-bottom: 1.5px solid var(--dot-line, #9fdcf5); transform: rotate(45deg); }
.dot-bubble b.dot-title { display: block; margin-bottom: 2px; padding-right: 18px; }
.dot-bubble .dot-close { position: absolute; top: 4px; right: 6px; border: 0; background: transparent; color: inherit; opacity: .55; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 4px; }
.dot-bubble .dot-close:hover { opacity: 1; }
.dot-bubble .dot-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.dot-bubble .dot-actions button { font: inherit; font-size: 13px; border: 1px solid var(--dot-line, #9fdcf5); background: transparent; color: inherit; border-radius: 999px; padding: 3px 12px; cursor: pointer; }
.dot-bubble .dot-actions button:hover { background: rgb(127 220 255 / .2); }

@media (prefers-reduced-motion: reduce) {
  .dot-figure *, .dot-figure { animation: none !important; transition: none !important; }
}`;

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Dot {
  constructor(container, { size, skin = "dot" } = {}) {
    const id = ++uid;
    if (!SKINS[skin]) skin = "dot";
    this.skin = skin;
    container.innerHTML = `<div class="dot-wrap"><div class="dot-figure" data-mood="idle" data-skin="${skin}">${svg(id, skin)}</div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.geo = GEO[skin] || GEO.dot;
    this.flameCores = [...container.querySelectorAll(".flame-cores path")];
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
    // How far the body has morphed into the picked-up and melting shapes (0 to 1).
    this.form = { held: { s: 0, t: 0 }, melt: { s: 0, t: 0 }, crown: { s: 0, t: 0 } };
    this.fx = container.querySelector(".dot-fx");
    this.particles = [];
    this.spring = { k: 0.07, damp: 0.86, meltRate: 0.955 };
    this.jump = { s: 0, v: 0 };   // height off the ground (negative = up) for the plop bounce
    this.timers = [];
    this.shadow = container.querySelector(".dot-shadow");
    this.faceShift = container.querySelector(".face-shift");
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
      k.v += (k.t - k.s) * this.spring.k * step;
      k.v *= Math.pow(this.spring.damp, step);
      k.s += k.v * step;
    }
    this.energy *= Math.pow(0.965, step);
    // Ease the wobble size toward its target instead of jumping, for a calm, liquid feel.
    const want = still ? 0 : 1.0 + this.energy * 4;
    this.amp = (this.amp ?? want) + (want - (this.amp ?? want)) * Math.min(1, 0.08 * step);
    const amp = this.amp;
    const breathe = still ? 0 : Math.sin(t * 1.5) * 0.016;
    // Slow, broad waves around the body: neighbouring points move together.
    const { anchors, held, melt, crown, angle, grip, top } = this.geo;
    // Morph speed: quick into the picked-up shape, slower out of a splat so the squish is visible.
    this.form.held.s += (this.form.held.t - this.form.held.s) * (1 - Math.pow(still ? 0 : 0.9, step));
    this.form.melt.s += (this.form.melt.t - this.form.melt.s) * (1 - Math.pow(still ? 0 : this.spring.meltRate, step));
    this.form.crown.s += (this.form.crown.t - this.form.crown.s) * (1 - Math.pow(still ? 0 : 0.8, step));
    // A little hop with gravity; landing gives a small extra squish.
    if (this.jump.s < 0 || this.jump.v < 0) {
      this.jump.v += 0.45 * step;
      this.jump.s += this.jump.v * step;
      if (this.jump.s >= 0) {
        if (this.jump.v > 1.5) { this.sx.s = 1.25; this.sy.s = 0.76; this.sx.v = 0; this.sy.v = 0; this.nudge(0, 0.4); this.splash(0.35); }
        this.jump.s = 0; this.jump.v = 0;
      }
    }
    const h = this.form.held.s, m = this.form.melt.s, c = this.form.crown.s, b = 1 - h - m - c;
    const flames = this.flameShapes(t, still);
    let pts = anchors.map(([bx, by], i) => {
      const x = bx * b + held[i][0] * h + melt[i][0] * m + crown[i][0] * c;
      const y = by * b + held[i][1] * h + melt[i][1] * m + crown[i][1] * c;
      const a = angle[i];
      const w = amp * grip[i] * (0.65 * Math.sin(2 * a + t * 1.15) + 0.35 * Math.sin(3 * a - t * 0.85));
      return [x + Math.cos(a) * w, y + Math.sin(a) * w];
    });
    // While blending between shapes, iron out small bumps (Taubin smoothing:
    // smooths without shrinking), so in-between shapes stay perfectly round.
    const blending = Math.min(1, (h + m + c) * 2);
    if (blending > 0.01) pts = taubin(pts, blending);
    // PYRO: the top of the outline itself bulges up into round flame tufts,
    // so one continuous outline wraps body and flames together.
    if (flames) {
      pts = pts.map(([px, py], i) => {
        if (top[i] <= 0) return [px, py];
        for (const f of flames) {
          const k = Math.exp(-(((px - f.cx) / f.w) ** 4));
          py -= f.H * k * top[i];
          px += f.sway * k * top[i] * 0.4;
        }
        return [px, py];
      });
      pts = taubin(pts, 0.6, 1); // round off the flame tips a touch
    }
    const d = smoothPath(pts);
    this.body.setAttribute("d", d);
    this.outline.setAttribute("d", d);
    this.clip.setAttribute("d", d);
    if (flames) this.drawCores(flames);
    const sx = this.sx.s + breathe, sy = this.sy.s - breathe, lean = this.lean.s;
    // Squash/stretch around the bottom centre, plus a lean (shear) when moving.
    this.jelly.setAttribute("transform", `matrix(${sx.toFixed(4)} 0 ${(-lean).toFixed(4)} ${sy.toFixed(4)} ${(CX - sx * CX + lean * GROUND).toFixed(2)} ${(GROUND - sy * GROUND + this.jump.s).toFixed(2)})`);
    // Keep the face inside the body when it splats down into the crown shape.
    this.faceShift.setAttribute("transform", `translate(${(c * 10).toFixed(2)} ${(c * 26).toFixed(2)})`);
    this.stepParticles(step);
    const sh = 1 + this.jump.s / 70;
    this.shadow.setAttribute("transform", `translate(94 169) scale(${(sh * sx).toFixed(3)} ${sh.toFixed(3)}) translate(-94 -169)`);
    requestAnimationFrame(this.frame);
  }

  // Where each of PYRO's flame tufts is this frame: they flicker, sway when
  // he moves, and grow or shrink with his mood.
  flameShapes(t, still) {
    const spec = SKINS[this.skin].flames;
    if (!spec) return null;
    const mood = this.figure.dataset.mood;
    const size = { sad: 0.45, sleepy: 0.55, worried: 0.85, held: 0.5, plop: 0.45, happy: 1.3, celebrate: 2 }[mood] || 1;
    this.flameSize = (this.flameSize ?? size) + (size - (this.flameSize ?? size)) * 0.06;
    return spec.map(({ x, top, w, h, p }) => {
      const f = still ? 1 : 1 + 0.1 * Math.sin(t * 3.6 + p) + 0.05 * Math.sin(t * 5.9 + p * 2);
      const sway = still ? 0 : 3 * Math.sin(t * 2.6 + p) - this.lean.s * 25;
      return { cx: x + sway * 0.5, w, H: h * f * this.flameSize, sway, top };
    });
  }

  // A soft yellow glow inside each tuft (clipped to the body), so the flames
  // look hot at the tips and blend into the body below.
  drawCores(flames) {
    const r = (v) => v.toFixed(2);
    flames.forEach(({ cx, w, H, sway, top }, i) => {
      const x = cx + sway * 0.3, y = top + 4, cw = w * 0.6, ch = H * 0.85;
      this.flameCores[i].setAttribute("d",
        `M${r(x - cw)} ${r(y)} C${r(x - cw)} ${r(y - ch * 0.6)} ${r(x - cw * 0.5)} ${r(y - ch)} ${r(x)} ${r(y - ch)} ` +
        `C${r(x + cw * 0.5)} ${r(y - ch)} ${r(x + cw)} ${r(y - ch * 0.6)} ${r(x + cw)} ${r(y)} Z`);
    });
  }

  // Give DOT a jiggle, e.g. while being moved. vx = horizontal speed in px/frame.
  nudge(vx = 0, amount = 0.6) {
    this.energy = Math.min(1.5, this.energy + amount);
    this.lean.t = Math.max(-0.22, Math.min(0.22, vx * 0.02));
    this.sx.v += amount * 0.04;
    this.sy.v -= amount * 0.04;
  }

  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }

  pickUp() {
    this.clearTimers();
    this.form.crown.t = 0;
    this.jump.s = 0; this.jump.v = 0;
    this.spring.k = 0.07; this.spring.damp = 0.86; this.spring.meltRate = 0.955;
    this.setMood("held");
    this.figure.classList.add("dragging");
    this.energy = 1;
  }

  drop() {
    this.figure.classList.remove("dragging");
    this.clearTimers();
    this.lean.t = 0;
    this.setMood("plop");
    // 1. Splat: like a drop hitting water, a flat crown with the edges flicked up.
    this.form.held.s = 0; this.form.melt.s = 0;
    this.form.crown.s = 1; this.form.crown.t = 1;
    this.spring.k = 0.25; this.spring.damp = 0.7;
    this.sx.s = 1.18; this.sy.s = 0.8; this.sx.v = 0; this.sy.v = 0;
    this.sx.t = 1.16; this.sy.t = 0.82;
    this.energy = 1.2;
    this.splash(1);
    const later = (ms, fn) => this.timers.push(setTimeout(fn, ms));
    // 2. Bounce back: the middle shoots up tall and narrow, with a small hop.
    later(170, () => {
      this.spring.k = 0.09; this.spring.damp = 0.8;
      this.form.crown.t = 0; this.form.held.t = 1;
      this.sx.t = 0.9; this.sy.t = 1.15;
      this.sx.v = -0.04; this.sy.v = 0.07;
      this.jump.v = -4.4;
    });
    // 3. Round back into shape; landing gives a small squish and splash (frame()).
    later(360, () => { this.form.held.t = 0; this.sx.t = 1; this.sy.t = 1; });
    later(700, () => this.setMood("idle"));
    later(1300, () => { this.spring.k = 0.07; this.spring.damp = 0.86; this.spring.meltRate = 0.955; });
  }

  // A subtle splash: a few droplets (DOT) or sparks (PYRO) and a faint ring on
  // the ground. strength 1 = a full plop, smaller = a light landing.
  splash(strength = 1) {
    if (reduceMotion()) return;
    const fire = this.skin === "pyro";
    const ns = "http://www.w3.org/2000/svg";
    const ring = document.createElementNS(ns, "ellipse");
    ring.setAttribute("cx", 94); ring.setAttribute("cy", 168);
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", fire ? "#ffb35c" : "#9fe3fa");
    ring.setAttribute("stroke-width", "2");
    this.fx.append(ring);
    this.particles.push({ el: ring, ring: true, life: 0.7, max: 0.7, strength });
    const count = Math.round((fire ? 8 : 6) * strength);
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const el = document.createElementNS(ns, fire ? "circle" : "ellipse");
      const p = fire
        ? { x: 94 + side * (78 + Math.random() * 26), y: 156, vx: side * (0.3 + Math.random() * 0.8), vy: -(1.4 + Math.random() * 1.6) * strength, g: -0.01, life: 0.9, size: 1.5 + Math.random() * 1.5 }
        : { x: 94 + side * (70 + Math.random() * 22), y: 150, vx: side * (0.9 + Math.random() * 1.3), vy: -(2.2 + Math.random() * 1.6) * strength, g: 0.16, life: 0.65, size: 2.2 + Math.random() * 1.6 };
      if (fire) { el.setAttribute("r", p.size); el.setAttribute("fill", Math.random() < 0.5 ? "#ffd36b" : "#ff9a3c"); }
      else { el.setAttribute("rx", p.size * 0.75); el.setAttribute("ry", p.size); el.setAttribute("fill", "#bdeeff"); el.setAttribute("stroke", INK); el.setAttribute("stroke-opacity", ".3"); }
      this.fx.append(el);
      this.particles.push({ el, ...p, max: p.life });
    }
  }

  stepParticles(step) {
    const dt = step / 60;
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) { p.el.remove(); return false; }
      const k = p.life / p.max;
      if (p.ring) {
        const grow = 1 - k;
        p.el.setAttribute("rx", (60 + grow * 55 * p.strength).toFixed(1));
        p.el.setAttribute("ry", (5 + grow * 5 * p.strength).toFixed(1));
        p.el.setAttribute("opacity", (0.35 * k * p.strength).toFixed(3));
        return true;
      }
      p.vy += p.g * step; p.x += p.vx * step; p.y += p.vy * step;
      const ang = Math.atan2(p.vy, p.vx) * 180 / Math.PI - 90;
      p.el.setAttribute("cx", p.x.toFixed(1));
      p.el.setAttribute("cy", p.y.toFixed(1));
      if (p.el.tagName === "ellipse") p.el.setAttribute("transform", `rotate(${ang.toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      p.el.setAttribute("opacity", (0.85 * Math.min(1, k * 1.6)).toFixed(3));
      return true;
    });
  }

  // One id or a list of ids (head, face, mouth and prop items can be worn together).
  setAccessory(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (list.length) this.figure.dataset.acc = list.join(" "); else delete this.figure.dataset.acc;
  }

  // Called while the learner types: with the laptop on, DOT types along.
  typing() {
    this.figure.classList.add("typing");
    clearTimeout(this.typeTimer);
    this.typeTimer = setTimeout(() => this.figure.classList.remove("typing"), 700);
  }

  setMood(mood, { revertAfter } = {}) {
    clearTimeout(this.moodTimer);
    this.figure.dataset.mood = mood;
    this.mouth.setAttribute("d", MOUTHS[mood] || MOUTHS.idle);
    // Body shape for the mood: stretched when held, melting a little when sad.
    this.form.held.t = mood === "held" ? 1 : 0;
    this.form.melt.t = mood === "sad" ? 0.75 : 0;
    if (mood === "held") { this.sx.t = 0.9; this.sy.t = 1.12; }
    else if (mood === "sad") { this.sx.t = 1.06; this.sy.t = 0.86; }
    else { this.sx.t = 1; this.sy.t = 1; }
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
    const close = document.createElement("button");
    close.type = "button"; close.className = "dot-close"; close.setAttribute("aria-label", "Close message"); close.textContent = "×";
    close.addEventListener("click", () => this.hush());
    b.append(close);
    b.hidden = false;
    this.onSay?.(!!actions?.length);
    this.nudge(0, 0.25);
  }

  hush() { this.bubble.hidden = true; this.onHush?.(); }
}
