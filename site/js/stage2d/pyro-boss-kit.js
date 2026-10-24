// PYRO's hand in the GOLEM fight (Isaac 2026-10-24). The cards live in pyro-cards-v4.js (cel-shaded toon fire like Sunfire Halo,
// his own body acting); this file only builds the hand: the old kit's tiers, card art and order with the new runs.
//   emberShot = Fireball (basic)   crescentWave = Flame Orbit (light)   eruption (medium)   cometKick = Comet Dive (medium)
//   sunfire = Sunfire Halo (heavy, the old one: the one Isaac likes)   meteorRain (ultimate)   infernoLine = Phoenix (ultimate II)
import { PYRO_KIT } from "../abilities-pyro.js";
import { PYRO_V4, chunky } from "./pyro-cards-v4.js";

export const PYRO_BOSS_KIT = PYRO_KIT.map((c) => { const k = PYRO_V4[c.id] ? { ...c, ...PYRO_V4[c.id] } : c; return { ...k, run: chunky(k.run) }; });   // all cards, Sunfire and Meteor Rain too, in the same 2-px blocks
