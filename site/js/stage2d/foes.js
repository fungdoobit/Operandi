// The enemies of the 2D lesson and challenge fights (PRD Addendum L; Isaac 2026-10-23: only ones
// about Kaela's size or bigger, each with real abilities instead of a plain lunge).
// An enemy: { name, hp, hit (damage to Kaela), moves: [ability ids, engine.js FOE_MOVES], proj (the
// fx sprite its spells use) }. The art is assets/enemies/<id> (tools/prepare-packs.py).
export const FOES2D = {
  demon: { name: "Fang Demon", hp: 30, hit: 9, moves: ["bite", "spit"] },
  jumper: { name: "Brute Imp", hp: 36, hit: 11, moves: ["leap", "quake"] },
  gargoyle: { name: "Gargoyle", hp: 30, hit: 9, moves: ["swoop", "gust"] },
  wolf: { name: "Ghost Wolf", hp: 32, hit: 10, moves: ["pounce", "howl"] },
  witch: { name: "Ember Witch", hp: 30, hit: 10, moves: ["shot", "rain", "volley"], proj: "orb" },
  mage: { name: "Hooded Mage", hp: 28, hit: 9, moves: ["shot", "bolt", "circle"], proj: "orb-raw" },
  "mage-b": { name: "Faceless Mage", hp: 28, hit: 9, moves: ["shot", "circle", "volley"], proj: "orb-raw" },
  flame: { name: "Flame Spirit", hp: 26, hit: 8, moves: ["pillars", "rain"], proj: "orb" },
  "fire-skull": { name: "Fire Skull", hp: 24, hit: 8, moves: ["pillars", "charge"], proj: "orb" },
};

// A deterministic pick for a level's n-th wave, so a reload shows the same enemy.
// (Every module uses the forest roster until the other biomes get their art.)
export function foeFor(module, seed, wave = 0) {
  const list = Object.keys(FOES2D);
  return list[Math.abs((seed * 31 + wave * 7 + module * 3) | 0) % list.length];
}
