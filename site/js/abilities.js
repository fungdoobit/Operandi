// Teammate ability kits (PRD Addenda I and J). Each ability is a short
// cinematic scene: a readable wind-up, a very fast strike, a hit-stop freeze
// with screen shake and a camera punch on contact, then follow-through.
//
// A scene gets s = { fx, px, pxBack, pxTop, toon, foeEl, mate, mateEl, golem,
//   P(name), Pt(L, part), mateC(), golemC(), onHit(n), crit }
//   - toon: cel-shaded fire, smoke and shadow (pixel/toon-fx.js)
//   - px / pxBack / pxTop: hi-bit 2D effects in front of GOLEM, behind the
//     fighters, and over everything (pixel/pixel-fx.js)
//   - onHit(1) is the first contact; onHit(2) the finishing blow (a crit lands on it)
//
// Each card: { id, name, tier, desc, run(s), art(pen, w, h) }. tier picks the
// mana cost, cooldown and damage (economy.js TIERS). art paints the card's
// picture with the toon pen, on an 80 x 60 pixel card.
import { NOVA_KIT } from "./abilities-nova.js";
import { PYRO_KIT } from "./abilities-pyro.js";
import { teammateAttack } from "./battle-moves.js";

// DOT keeps his water moves (battle-moves.js), now as cards.
const water = (move) => (s) => teammateAttack(s, { move, crit: s.crit, onHit: s.onHit });
const DOT_KIT = [
  { id: "blade", name: "Water Blade", tier: "basic", run: water("blade"),
    desc: "Dashes in and slashes with a blade of water.",
    art(pen, w, h) { for (let i = 0; i <= 16; i++) { const a = -2.4 + i * 0.12; pen.puff("heat", w / 2 + Math.cos(a) * 30, h * 0.75 + Math.sin(a) * 30, 3 + Math.sin(i / 16 * Math.PI) * 6, 0.95); } } },
  { id: "volley", name: "Hydro Volley", tier: "light", run: water("volley"),
    desc: "Fires three orbs of water in quick succession.",
    art(pen, w, h) { [[20, 40], [40, 30], [60, 20]].forEach(([x, y], i) => { pen.puff("heat", x, y, 9, 1.1); pen.limb("heat", [[x, y], [x - 14, y + 7]], 7 - i, 1, 0.6); }); } },
  { id: "dive", name: "Tidal Dive", tier: "medium", run: water("dive"),
    desc: "Leaps, spins and crashes down onto the boss in a burst of water.",
    art(pen, w, h) { pen.puff("heat", w / 2, 18, 11, 1.1); for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; pen.limb("heat", [[w / 2, h - 6], [w / 2 + Math.cos(a) * 26, h - 6 + Math.sin(a) * 20]], 6, 1, 0.9); } } },
  { id: "crossBlades", name: "Crossing Blades", tier: "heavy", run: water("crossBlades"),
    desc: "Two blades of water cross on the boss, then a crown of water bursts up.",
    art(pen, w, h) { pen.limb("heat", [[14, 10], [w - 14, h - 10]], 7, 2, 1.05); pen.limb("heat", [[w - 14, 10], [14, h - 10]], 7, 2, 1.05); pen.puff("heat", w / 2, h / 2, 10, 1.2); } },
  { id: "tidalWave", name: "Tidal Wave", tier: "ultimate", run: water("tidalWave"),
    desc: "Summons a towering wave and rides it straight into the boss.",
    art(pen, w, h) { for (let i = 0; i <= 20; i++) { const u = i / 20, a = -Math.PI * 0.2 - u * Math.PI * 1.3; pen.puff("heat", 40 + Math.cos(a) * 22 * (1 - u * 0.4), 36 + Math.sin(a) * 22 * (1 - u * 0.4), 9 - u * 5, 1.05 - u * 0.2); } for (let x = 0; x < w; x += 8) pen.puff("heat", x, h - 4, 10, 0.8); } },
];

// The full hand for a teammate (basic strike first).
export function kitFor(skin) { return skin === "nova" ? NOVA_KIT : skin === "pyro" ? PYRO_KIT : DOT_KIT; }
