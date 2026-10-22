// The biome backgrounds for the small-enemy fights (PRD Addendum K), one per
// module, in the same hi-bit style as the Sunken Foundry (arena-bg.js): drawn
// once per size straight in pixels with ordered dithering, plus a light layer
// on top that animates at 15 fps (fireflies, spores, snow, embers...).
// Art height is always 220 px with the floor line at y = 176 (the fighters
// stand on it).
//
// A biome is a class extending PixelScene with:
//   paint(p)      the still scene; p = { W, H, FLOOR, put, dith, bay, r, mix }
//   animate(a)    the moving bits each frame; a = { g, t, dt, W, H, FLOOR, px }
import { FoundryBG } from "./arena-bg.js";
import { BIOME_SCENES } from "./biome-scenes/index.js";
export { PixelScene, hex, rng, HA, FLOOR } from "./scene-base.js";

// The background for a biome id ("foundry" is GOLEM's arena).
export function biomeBG(stage, id) {
  if (id === "foundry" || !BIOME_SCENES[id]) return new FoundryBG(stage);   // (a biome not built yet shows the Foundry)
  return new BIOME_SCENES[id](stage);
}
