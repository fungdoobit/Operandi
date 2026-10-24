// PYRO's cards in the GOLEM fight, rebuilt on the fire packs (Isaac 2026-10-24). Same 7 cards, tiers and
// mana as before (abilities-pyro.js); the ones done so far use the new flame body (pixel/pyro-fighter.js) and the
// sprite layers (stage2d/pyro-fx.js): Ember Flick, Comet Kick and Inferno Line. The rest still run the old versions.
//
// Each run(s): s.mate is the PyroFighter; s.spr draws in front of everything, s.sprBack behind GOLEM;
// s.onHit(2) lands the card's damage (a crit on it); s.heat(n) heats GOLEM's stone (his glow builds up over a fight).
import { PYRO_KIT } from "../abilities-pyro.js";
import { loadPyroFx, play, frame } from "./pyro-fx.js";
import { ease, lerp } from "../pixel/pixel-fx.js";
import { sound } from "../sound.js";

const FIRE = ["#fff4d6", "#ffd27a", "#ff9a3c", "#e04a1c"];
const wait = (s, ms) => s.fx.wait(ms);
const tween = (s, ms, fn) => s.spr.add({ dur: ms, draw(g, k) { fn(k); } });

// A small ember flick: he forms a glowing ember in front of himself, flicks it at GOLEM, and it sticks and burns.
async function emberFlick(s) {
  const { fx, mate, spr } = s, A = await loadPyroFx();
  const me = s.mateC(), hand = { x: me.x + 50, y: me.y - 14 }, hit = lerp3(s.P("claw"), s.golemC(), 0.6);
  mate.setMood("fierce"); mate.sx.t = 0.92; mate.sy.t = 1.08;
  // 1. an ember gathers in front of him (red ball, white ball, a tongue of flame)
  sound.sfx("flameIgnite");
  await play(spr, A.flame, { from: 0, to: 3, ms: 380, x: hand.x, y: hand.y + 38, scale: 1, anchor: "c" });
  mate.sx.t = 1.08; mate.sy.t = 0.94; mate.leanV += 3;   // the flick
  // 2. it flies to GOLEM along an arc, a flame trailing behind it
  const trail = [];
  sound.sfx("whoosh", { theme: "fire" });
  await spr.add({ dur: 420, z: 2, draw(g, k, t) {
    const x = lerp(hand.x, hit.x, k), y = lerp(hand.y, hit.y, ease.in(k)) - Math.sin(k * Math.PI) * 46;
    const px = trail.at(-1)?.x ?? x, py = trail.at(-1)?.y ?? y, ang = Math.atan2(y - py, x - px) - Math.PI / 2;
    trail.push({ x, y }); if (trail.length > 7) trail.shift();
    trail.forEach((p, i) => frame(g, A.flame, 6 + (i % 3), p.x, p.y + 30, { scale: 0.7 + i * 0.05, alpha: 0.09 * (i + 1), rot: ang }));
    frame(g, A.flame, 6 + (Math.floor(t / 50) % 4), x, y + 38, { scale: 1, rot: ang });
  } });
  // 3. it hits: a small star burst, and it sticks to him and burns
  mate.sx.t = 1; mate.sy.t = 1;
  fx.hitstop(90); fx.shake(6); sound.sfx("hit", { size: 1 });
  fx.sparks(hit, 10, { colors: FIRE, power: 1 });
  play(spr, A.boom4, { from: 0, to: 3, ms: 240, x: hit.x, y: hit.y, scale: 1.6 });
  s.onHit(2); s.heat(0.12);
  play(spr, A.flame, { from: 4, to: 11, loop: 1500, ms: 480, x: hit.x, y: hit.y + 30, scale: 1.3, alpha: (k) => Math.min(1, (1 - k) * 4) });
  await wait(s, 650);
  mate.setMood("idle"); mate.leanV -= 2;
}
const lerp3 = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

// Comet Kick: he snuffs himself out to an ember, streaks across as a comet and relights inside GOLEM in a burst.
async function cometKick(s) {
  const { fx, mate, spr } = s, A = await loadPyroFx();
  const me = s.mateC(), core = s.golemC();
  mate.setMood("fierce");
  // 1. he sinks to an ember (his own snuff), embers lifting off
  sound.sfx("flameIgnite");
  await spr.add({ dur: 520, draw(g, k) { mate.snuff(1 - 0.92 * ease.io(k), true, 1, true); } });
  // 2. the ember leaps off as a comet: a long streak of afterimages
  mate.snuff(0, true);
  fx.darken(0.35, 200);
  sound.sfx("whoosh", { theme: "fire" });
  const pts = [];
  await spr.add({ dur: 340, z: 3, draw(g, k) {
    const e = ease.in(k), x = lerp(me.x + 10, core.x - 30, e), y = lerp(me.y + 30, core.y, e) - Math.sin(k * Math.PI) * 30;
    pts.push({ x, y }); if (pts.length > 14) pts.shift();
    const ang = Math.atan2(core.y - me.y, core.x - me.x) - Math.PI / 2;
    pts.forEach((p, i) => frame(g, A.flame, 6 + (i % 3), p.x, p.y + 34, { scale: 0.55 + i * 0.05, alpha: Math.min(0.9, 0.09 * (i + 1)), rot: ang }));
    frame(g, A.flame, 1, x, y, { scale: 1, rot: ang }); frame(g, A.flame, 2, x, y + 14, { scale: 1.1, rot: ang });
  } });
  // 3. he relights inside GOLEM: a star burst, then a fireball
  fx.hitstop(150); fx.shake(14); fx.punch(0.05, core); fx.flash(0.35, "#fff1d0"); fx.darken(0, 400);
  sound.sfx("impact", { size: 1.4 }); sound.sfx("explosion", {});
  play(spr, A.boom4, { from: 0, to: 6, ms: 420, x: core.x, y: core.y, scale: 2.6 });
  await wait(s, 120);
  play(spr, A.boom1, { from: 0, to: 6, ms: 560, x: core.x, y: core.y, scale: 2.4 });
  s.onHit(2); s.heat(0.2);
  fx.sparks(core, 22, { colors: FIRE, power: 1.4 });
  // and back at his own place he is relit (ember, flicker, a flash)
  mate.flash = 1; sound.sfx("flameIgnite");
  await spr.add({ dur: 700, draw(g, k) { mate.snuff(0.08 + 0.97 * (1 - (1 - k) ** 3), k < 0.45, 1); } });
  mate.snuff(1, false); mate.setMood("idle");
  await wait(s, 200);
}

// Inferno Line: a wall of fire races along the floor to GOLEM, a dome of fire closes round him and a tornado of
// flame lifts him and blows apart. It melts a Firewall.
async function infernoLine(s) {
  const { fx, mate, spr, sprBack } = s, A = await loadPyroFx();
  const me = s.mateC(), core = s.golemC(), floor = fx.floorY, x0 = me.x + 60, x1 = core.x - 10;
  mate.setMood("fierce"); mate.sy.t = 0.9; mate.sx.t = 1.1; mate.flare = 1;
  fx.darken(0.5, 500); fx.focus(1.08, { x: (x0 + x1) / 2, y: floor - 80 }, 700);
  sound.sfx("laserCharge", { ms: 600 });
  await wait(s, 600);
  mate.sy.t = 1.1; mate.sx.t = 0.92;
  // 1. the line: a column of flame springs up every few px, one after another, racing at him
  sound.sfx("flameIgnite"); sound.sfx("rumble");
  const cols = 14, gap = (x1 - x0) / (cols - 1);
  for (let i = 0; i < cols; i++) {
    const x = x0 + i * gap, big = 0.9 + 0.5 * (i / cols);
    play(sprBack, A.fire, { from: 3, to: 10, ms: 720, x, y: floor + 6, anchor: "b", scale: 1.4 * big });
    if (i % 3 === 0) fx.sparks({ x, y: floor - 30 }, 6, { colors: FIRE, power: 0.8 });
    await wait(s, 38);
  }
  // 2. it reaches him: the Firewall (if there is one) melts, and the dome of fire closes round him
  if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
  fx.hitstop(110); fx.shake(10);
  s.onHit(1);
  play(sprBack, A.aura, { from: 0, to: 12, ms: 900, x: core.x + 10, y: floor + 12, anchor: "b", scale: 2.6 });
  sound.sfx("explosion", {});
  await wait(s, 420);
  // 3. a tornado of flame rises from the dome (the Patreon swirl), lifts him and blows apart
  play(spr, A.swirl, { loop: 1100, ms: 600, x: core.x + 6, y: floor + 10, anchor: "b", scale: 4.6, alpha: (k) => 0.9 * Math.min(1, k * 6) * Math.min(1, (1 - k) * 4) });
  play(spr, A.fire, { from: 4, to: 9, ms: 700, x: core.x, y: floor + 8, anchor: "b", scale: 3.2 });
  fx.shake(8); sound.sfx("rumble");
  await wait(s, 780);
  fx.hitstop(200); fx.shake(18); fx.punch(0.07, core); fx.flash(0.5, "#fff1d0"); fx.darken(0, 500);
  sound.sfx("impact", { size: 1.7 });
  play(spr, A.boom2, { from: 0, to: 7, ms: 640, x: core.x, y: core.y + 60, anchor: "c", scale: 3.6 });
  play(spr, A.boom5, { from: 0, to: 8, ms: 700, x: core.x, y: core.y, scale: 3 });
  fx.sparks(core, 30, { colors: FIRE, power: 1.6 });
  s.onHit(2); s.heat(0.4);
  mate.sx.t = 1; mate.sy.t = 1; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 600);
}

// The hand: the old kit, with the three finished cards replaced.
const NEW = {
  emberShot: { name: "Ember Flick", run: emberFlick, desc: "He flicks a glowing ember at the boss. It sticks to him and burns." },
  cometKick: { run: cometKick, desc: "He snuffs himself out to an ember, streaks across as a comet and relights inside the boss in a burst of fire." },
  infernoLine: { run: infernoLine, counters: "firewall", desc: "A wall of fire races along the floor, melts a Firewall, closes in a dome round the boss and blows him apart in a tornado of flame." },
};
export const PYRO_BOSS_KIT = PYRO_KIT.map((c) => (NEW[c.id] ? { ...c, ...NEW[c.id] } : c));
