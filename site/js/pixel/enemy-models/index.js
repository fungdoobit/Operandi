// Every enemy model, by kind (enemy-px.js). Game data (HP, attacks, biome)
// lives in js/enemies.js.
import * as forest from "./forest.js";
import * as a from "./group-a.js";
import * as b from "./group-b.js";
import * as c from "./group-c.js";
import * as d from "./group-d.js";
export const ENEMY_MODELS = { ...forest, ...a, ...b, ...c, ...d };
