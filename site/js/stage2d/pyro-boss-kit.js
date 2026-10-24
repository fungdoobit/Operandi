// PYRO's hand in the GOLEM fight (Isaac 2026-10-24). The cards live in pyro-cards-v2.js (his own body does the acting,
// the fire packs do the fire); this file only builds the hand: the old kit's tiers, art and order, with the new runs.
//   emberShot = Ember Flick (basic)      crescentWave = Flame Lash (light)    eruption (medium)    cometKick (medium)
//   sunfire = Sunfire Halo (heavy, still the old version)    meteorRain (ultimate)
//   ultimate II: Supernova, plus Phoenix as a test card next to it until Isaac picks (infernoLine is gone).
import { PYRO_KIT } from "../abilities-pyro.js";
import { PYRO_V2 } from "./pyro-cards-v2.js";

const base = PYRO_KIT.filter((c) => c.id !== "infernoLine").map((c) => (PYRO_V2[c.id] ? { ...c, ...PYRO_V2[c.id] } : c));
const ult = PYRO_KIT.find((c) => c.id === "infernoLine");   // its tier and card art, for the two new ultimates
export const PYRO_BOSS_KIT = [...base, { ...ult, ...PYRO_V2.supernova }, { ...ult, ...PYRO_V2.phoenix }];
