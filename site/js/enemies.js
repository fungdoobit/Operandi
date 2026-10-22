// The small enemies you fight in every lesson and challenge (PRD Addendum K).
// Each module has its own biome; its enemies come from Isaac's list. The models
// live in pixel/enemy-models/, the attack scenes in pixel/enemy-moves.js.
//
// An enemy: { name, biome, hp, hit (damage to your teammate), attacks: [spec] }.
// Attack specs (enemy-moves.js):
//   { type: "lunge", fx: "slash" | "bite" | "claw" | "bash" | "sting" }
//   { type: "shoot", proj: "arrow" | "bullet" | "plasma" | "spore" | "bolt" | "web" | "potion"
//                          | "ice" | "slime" | "leaf" | "venom" | "shell" | "fireball", n }
//   { type: "slam", wave: "rock" | "ice" | "thorn" | "shock" }
//   { type: "charge" }   { type: "beam" }   { type: "rain", proj, n }
// color: the attack's main colour.
import { ENEMY_MODELS } from "./pixel/enemy-models/index.js";

export const BIOMES = {
  forest: { name: "Whispering Forest", module: 1 },
  grassland: { name: "Overgrown Ruins", module: 2 },
  desert: { name: "Bone Dunes", module: 3 },
  ice: { name: "Frostbite Fields", module: 4 },
  beach: { name: "Wreck Beach", module: 5 },
  swamp: { name: "Witchmire", module: 6 },
  wasteland: { name: "Scorched Wastes", module: 7 },
  castle: { name: "Fallen Keep", module: 8 },
};
export const MODULE_BIOME = Object.fromEntries(Object.entries(BIOMES).map(([id, b]) => [b.module, id]));

export const ENEMIES = {
  // Module 1, Whispering Forest
  mushroom: { name: "Rotcap", biome: "forest", hp: 26, hit: 8, attacks: [{ type: "lunge", fx: "bash", color: "#86d02a" }, { type: "shoot", proj: "spore", n: 7, color: "#86d02a" }] },
  wasp: { name: "Stinger", biome: "forest", hp: 20, hit: 7, attacks: [{ type: "lunge", fx: "sting", color: "#ffd23a" }, { type: "shoot", proj: "venom", n: 3, color: "#b6ff3a" }] },
  treant: { name: "Gnarlwood", biome: "forest", hp: 40, hit: 11, attacks: [{ type: "slam", wave: "thorn", color: "#6e4e2c" }, { type: "rain", proj: "leaf", n: 12, color: "#7ac943" }] },
  spirit: { name: "Hollow Wisp", biome: "forest", hp: 30, hit: 9, attacks: [{ type: "beam", color: "#7affc8" }, { type: "shoot", proj: "bolt", n: 4, color: "#7affc8" }] },
  // Module 2, Overgrown Ruins
  goblin: { name: "Grub Goblin", biome: "grassland", hp: 26, hit: 8, attacks: [{ type: "lunge", fx: "slash", color: "#e8e0c0" }, { type: "shoot", proj: "shell", n: 1, color: "#3a3a3a" }] },
  snake: { name: "Fangsnake", biome: "grassland", hp: 24, hit: 8, attacks: [{ type: "lunge", fx: "bite", color: "#ffffff" }, { type: "shoot", proj: "venom", n: 3, color: "#a6ff3a" }] },
  spider: { name: "Webspinner", biome: "grassland", hp: 28, hit: 8, attacks: [{ type: "lunge", fx: "bite", color: "#ffffff" }, { type: "shoot", proj: "web", n: 1, color: "#f0f0f0" }] },
  snail: { name: "Sludge Snail", biome: "grassland", hp: 42, hit: 10, attacks: [{ type: "charge", color: "#9acd32" }, { type: "shoot", proj: "slime", n: 3, color: "#9acd32" }] },
  // Module 3, Bone Dunes
  skeleton: { name: "Bone Legion", biome: "desert", hp: 34, hit: 9, attacks: [{ type: "lunge", fx: "slash", color: "#e8e8e0" }, { type: "charge", color: "#e8e8e0" }] },
  archer: { name: "Bone Archers", biome: "desert", hp: 28, hit: 9, attacks: [{ type: "shoot", proj: "arrow", n: 3, color: "#c8b08a" }, { type: "rain", proj: "arrow", n: 10, color: "#c8b08a" }] },
  // Module 4, Frostbite Fields
  bear: { name: "Frostbitten Bear", biome: "ice", hp: 44, hit: 12, attacks: [{ type: "lunge", fx: "claw", color: "#bfe8ff" }, { type: "slam", wave: "ice", color: "#9fd2ff" }] },
  robot: { name: "Scrap Bots", biome: "ice", hp: 30, hit: 8, attacks: [{ type: "shoot", proj: "bullet", n: 6, color: "#ffd23a" }, { type: "charge", color: "#ff5a3a" }] },
  // Module 5, Wreck Beach
  crab: { name: "Clawtank", biome: "beach", hp: 40, hit: 10, attacks: [{ type: "lunge", fx: "claw", color: "#ffffff" }, { type: "shoot", proj: "shell", n: 3, color: "#3a3a3a" }, { type: "beam", color: "#ff4a3a" }] },
  // Module 6, Witchmire
  witch: { name: "Bog Witch", biome: "swamp", hp: 32, hit: 10, attacks: [{ type: "shoot", proj: "potion", n: 2, color: "#b05aff" }, { type: "beam", color: "#b05aff" }] },
  wizard: { name: "Hex Wizard", biome: "swamp", hp: 32, hit: 10, attacks: [{ type: "shoot", proj: "bolt", n: 3, color: "#5ab8ff" }, { type: "rain", proj: "fireball", n: 6, color: "#ff8a3a" }] },
  // Module 7, Scorched Wastes
  reaper: { name: "Chrome Reaper", biome: "wasteland", hp: 40, hit: 11, attacks: [{ type: "shoot", proj: "plasma", n: 2, color: "#ff3a5a" }, { type: "beam", color: "#ff3a5a" }] },
  gunner: { name: "Rust Gunner", biome: "wasteland", hp: 32, hit: 9, attacks: [{ type: "shoot", proj: "bullet", n: 8, color: "#ffd23a" }, { type: "lunge", fx: "bash", color: "#ffd23a" }] },
  // Module 8, Fallen Keep
  knight: { name: "Fallen Knight", biome: "castle", hp: 46, hit: 12, attacks: [{ type: "lunge", fx: "slash", color: "#c8a0ff" }, { type: "slam", wave: "shock", color: "#c8a0ff" }] },
};

// The enemies of a biome, in the order they show up.
export const enemiesIn = (biome) => Object.keys(ENEMIES).filter((k) => ENEMIES[k].biome === biome);

// A deterministic pick for a level's n-th wave, so a reload shows the same enemy.
// (Only enemies whose model exists; Rotcap if none do.)
export function enemyFor(module, seed, wave = 0) {
  const list = enemiesIn(MODULE_BIOME[module] || "forest").filter((k) => ENEMY_MODELS[k]);
  if (!list.length) return "mushroom";
  return list[Math.abs((seed * 31 + wave * 7) | 0) % list.length];
}
