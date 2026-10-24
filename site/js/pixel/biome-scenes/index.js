// Every biome background by id (biomes.js). "foundry" (GOLEM's arena) is arena-bg.js.
// Each file exports its class as Scene; a missing one falls back to the Foundry.
import { ForestScene } from "./forest.js";
import * as grassland from "./grassland.js";
import * as desert from "./desert.js";
import * as ice from "./ice.js";
import * as beach from "./beach.js";
import * as swamp from "./swamp.js";
import * as wasteland from "./wasteland.js";
import * as castle from "./castle.js";
import * as maw from "./maw.js";
import * as dusk from "./dusk.js";
export const BIOME_SCENES = { forest: ForestScene, grassland: grassland.Scene, desert: desert.Scene, ice: ice.Scene, beach: beach.Scene, swamp: swamp.Scene, wasteland: wasteland.Scene, castle: castle.Scene, maw: maw.Scene, dusk: dusk.Scene };
