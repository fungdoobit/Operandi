// Kaela's cards in the GOLEM fight (PRD Addendum M): the same 7 cards and tiers as kaela-kit.js,
// with a run(s) for the battle stage (boss-fight.js) and card art that paints the ability (Isaac
// 2026-10-23: "art of the abilities", not her). Her effects use the stage's own toolkit in her red
// "blood" theme (battle-fx.js THEMES.blood). The full cinematic redesign of each ability comes next.
//
// run(s): s.mate is her KaelaFighter; s.P(name) points on GOLEM; s.onHit(2) lands the card's
// damage (a crit on it); earlier cuts only shake him (s.boss.hit).
import { KAELA_KIT } from "./kaela-kit.js";
import { sound } from "../sound.js";

const REDS = ["#ffffff", "#ffc4b6", "#ff7868", "#e03a34", "#b0222a"];
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

async function strike(card, s) {
  const { fx, mate } = s;
  const claw = s.P("claw"), core = s.golemC(), me = s.mateC();
  // stand just short of his claw (his front), or cast from where she is
  const spot = card.ranged ? 0 : Math.max(0, claw.x - me.x - 64);
  if (card.id === "skyfall") { fx.darken(0.55, 300); }
  let orbDone = null;
  await mate.play(card, {
    spot,
    onHit: (i, last) => {
      const p = lerp(claw, core, last ? 0.65 : 0.25 + 0.1 * (i % 3)), big = last && card.heavy;
      fx.slash(p, "blood", { size: big ? 190 : 130, angle: [-25, 30, -60, 15][i % 4], flip: i % 2 ? -1 : 1, ms: 260 });
      fx.sparks(p, big ? 26 : 12, { colors: REDS, power: big ? 1.4 : 1 });
      if (last) {
        fx.hitstop(big ? 200 : 130); fx.shake(big ? 16 : 9); fx.punch(big ? 0.06 : 0.03, p);
        if (big) { fx.flash(0.35, "#ffd6cc"); fx.ring(p, { color: "#ff7868", size: 160, ms: 420 }); }
        sound.sfx("impact", { size: big ? 1.6 : 1.1 });
        s.onHit(2);
      } else { fx.hitstop(60); fx.shake(4); s.boss.hit({ crit: false }); sound.sfx("hit", { size: 0.8 }); }
    },
    onLaunch: () => {   // Blood Orb leaves her blade: a fast straight shot into his core
      const from = { x: me.x + 40, y: me.y - 4 };
      sound.sfx("whoosh", { theme: "fire" });
      orbDone = new Promise((res) => fx.orb(from, core, "blood", { ms: 220, size: 16, arc: 0, onArrive: () => {
        fx.explosion(core, { size: 1.1, theme: "blood" }); fx.sparks(core, 24, { colors: REDS, power: 1.3 });
        fx.hitstop(140); fx.shake(14); fx.punch(0.05, core); sound.sfx("impact", { size: 1.5 });
        s.onHit(2); res();
      } }));
    },
  });
  if (orbDone) await orbDone;
}

// Card pictures, painted with the battle's cel-shaded fire pen (80 x 60).
const ART = {
  crimsonSlash(pen, w, h) { for (let i = 0; i <= 18; i++) { const a = -2.5 + i * 0.13; pen.puff("heat", w / 2 + Math.cos(a) * 28, h * 0.72 + Math.sin(a) * 28, 2 + Math.sin(i / 18 * Math.PI) * 6, 1); } },
  twinFang(pen, w, h) { for (const o of [-8, 8]) for (let i = 0; i <= 16; i++) { const a = -2.4 + i * 0.13; pen.puff("heat", w / 2 + o + Math.cos(a) * 24, h * 0.7 + o * 0.6 + Math.sin(a) * 24, 1.5 + Math.sin(i / 16 * Math.PI) * 5, 0.95); } },
  bloodOrb(pen, w, h) { pen.puff("heat", w * 0.62, h * 0.48, 13, 1.25); for (let i = 0; i < 9; i++) pen.puff("heat", w * 0.62 - 6 - i * 5, h * 0.48 + i * 0.6, 7 - i * 0.6, 0.8 - i * 0.06); },
  scarletWhirl(pen, w, h) { for (let i = 0; i <= 40; i++) { const a = i * 0.24, r = 4 + i * 0.6; pen.puff("heat", w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r * 0.75, 1.5 + i * 0.09, 0.9); } },
  fangWhirl(pen, w, h) { ART.scarletWhirl(pen, w, h); pen.limb("heat", [[10, 12], [w - 12, h - 12]], 5, 1.5, 1.05); },
  risingMoon(pen, w, h) { for (let i = 0; i <= 22; i++) { const a = Math.PI * 0.55 + i * 0.1; pen.puff("heat", w / 2 + Math.cos(a) * 22, h * 0.5 + Math.sin(a) * 22, 2 + Math.sin(i / 22 * Math.PI) * 6, 1); } for (let i = 0; i < 6; i++) pen.limb("heat", [[18 + i * 9, h - 4], [22 + i * 9, h - 18 - (i % 2) * 8]], 2, 1, 0.8); },
  skyfall(pen, w, h) { pen.limb("heat", [[w / 2, 2], [w / 2, h - 12]], 6, 2, 1.1); for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; pen.limb("heat", [[w / 2, h - 6], [w / 2 + Math.cos(a) * 26, h - 6 + Math.sin(a) * 18]], 5, 1, 0.9); } },
};

export const KAELA_BOSS_KIT = KAELA_KIT.map((c) => ({ ...c, img: undefined, art: ART[c.id], run: (s) => strike(c, s) }));
