// The short version of an ultimate (PRD Addendum K, Isaac 2026-10-22): the
// full cinematic plays the first time each day; after that, this 2-second cut
// keeps fights moving. The card's name flashes up, the teammate gathers power
// in its element, and one big themed blast lands on the enemy.
import { sound } from "./sound.js";
import { explode } from "./pixel/toon-fx.js";
import { speedLines, bigHit } from "./cine.js";
import { glow, starFlash } from "./pixel/pixel-fx.js";

const LOOK = {
  void: { color: "#a066f0", kind: "void", sfx: "voidCharge" },
  fire: { color: "#ff9a3c", kind: "fire", sfx: "flameIgnite" },
  water: { color: "#5bb7e4", kind: "water", sfx: "gather" },
};

export async function shortUltimate(s, card) {
  const { fx, pxTop, toon, theme, mate } = s;
  const L = LOOK[theme] || LOOK.water;
  const c = s.mateC(), core = s.golemC();
  fx.title(card.name.toUpperCase(), "");
  mate.setMood?.("angry");
  sound.sfx(L.sfx, { theme });
  fx.converge(c, { color: L.color, n: 22, ms: 500, radius: 120, glow: null });
  await pxTop.add({ dur: 520, draw(g, k) { glow(g, c.x, c.y, 20 + 50 * k, L.color, 0.7 * k); } });
  speedLines(pxTop, core, 420, { inner: 90 });
  sound.sfx("whoosh", { theme });
  // the strike: a streak from the teammate to the enemy
  await pxTop.add({ dur: 180, draw(g, k) {
    const x = c.x + (core.x - c.x) * k, y = c.y + (core.y - c.y) * k;
    glow(g, x, y, 34, L.color, 0.9); starFlash(g, x, y, 14, "#ffffff");
  } });
  sound.sfx("explosion", { size: 1.3 });
  bigHit(fx, core, { stop: 160, shake: 26, punch: 0.06, flash: "#ffffff" });
  if (L.kind === "water") { fx.splash(core, "water", { n: 30, power: 1.4 }); fx.ring(core, { color: L.color, size: 220, ms: 500 }); }
  else if (toon) explode(toon, core.x, core.y, { size: 1.5, kind: L.kind, dur: 1100 });
  s.onHit(1);
  await fx.wait(260);
  fx.shake(14); s.onHit(2);
  await fx.wait(500);
  mate.setMood?.("idle");
}
