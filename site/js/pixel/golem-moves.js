// Hi-bit GOLEM's attacks: the same cinematic language as battle-moves.js
// (charge-up, a violent release, hit-stop, camera shake and punch-in, heavy
// impact, recovery), driven by the pixel model's pose numbers.
import { teammateHurt } from "../battle-moves.js";

const MOVES = ["slam", "barrage", "laser", "ram"];
let last = null;

// ctx: { fx, dot, mateEl, theme, golem, foeEl }
export async function golemAttack(ctx, kind, { onHit } = {}) {
  if (!kind) {
    const options = MOVES.filter((m) => m !== last);
    kind = options[Math.floor(Math.random() * options.length)];
  }
  last = kind;
  const { fx, dot, golem } = ctx;
  const s = {
    ...ctx, g: golem,
    P: (name) => fx.fromPage(golem.point(name)),
    // camera target: below and in front of his core, so raised arms stay in shot
    mid: () => { const c = fx.fromPage(golem.point("core")); return { x: c.x - 120, y: (c.y + fx.floorY) / 2 }; },
    dotC: () => fx.at(dot.figure, { fy: 0.55 }),
    hurt: (opts) => { teammateHurt(ctx, opts); onHit?.(); },
  };
  await ATTACKS[kind](s);
  fx.focus(1, null, 400); fx.darken(0);
  await golem.rest(550);
}

const ATTACKS = {
  // Claw slam: he rears back with the claw cocked over his head while power
  // streams into it, hangs for a beat, then smashes the floor in front of him.
  async slam(s) {
    const { fx, g } = s;
    fx.focus(1.06, s.mid(), 600);
    g.to({ ca: 0.9, ce: 1.7, cp: -0.2, cg: 0.6, lean: 0.18, tilt: 0.22, bob: 0.06, lunge: 0.15, flare: 0.8, na: -0.5, ne: 0.6, thrust: 1.4 }, 520, "out");
    await fx.wait(260);
    fx.converge(s.P("claw"), { color: "#8fc8ff", n: 18, ms: 320, radius: 120 });
    fx.arcs(s.P("claw"), 2, { radius: 60, color: "#8fc8ff", ms: 300 });
    await g.wait(260);
    await g.to({ ca: 1.05, ce: 1.85, lean: 0.22, bob: 0.09 }, 240, "lin");   // the hang
    fx.focus(1, null, 250);
    await g.to({ ca: -0.25, ce: 0.8, cp: 0.6, cg: 0, lean: -0.22, tilt: -0.25, bob: -0.25, lunge: -0.4, thrust: 0.3 }, 110, "in");
    const at = { x: s.P("claw").x, y: fx.floorY };
    fx.hitstop(120); fx.shake(28); fx.punch(0.055, at); fx.flash(0.22, "#ffe2b0");
    fx.crack(at.x, { width: 260 });
    fx.ring(at, { color: "#ffe2b0", size: 320, flat: 0.14, ms: 560, width: 9 });
    fx.dust(at.x, 22, 2.6);
    fx.debris({ x: at.x, y: fx.floorY - 10 }, 10, { power: 1.2, dir: -1 });
    fx.sparks({ x: at.x, y: fx.floorY - 6 }, 16, { power: 1.4 });
    fx.groundWave(at.x - 30, s.dotC().x, { onArrive: () => s.hurt() });
    fx.wait(130).then(() => fx.groundWave(at.x - 30, s.dotC().x - 60, { color: "#ffe2b0", ms: 420 }));
    await g.to({ bob: -0.3, lunge: -0.44 }, 140, "out");
    await fx.wait(380);
  },

  // Cannon barrage: he turns to bring the cannon round to face the teammate,
  // charges the bore, and fires three shots, each kicking the cannon back.
  async barrage(s) {
    const { fx, g, dot } = s;
    fx.focus(1.05, s.mid(), 500);
    await g.to({ yaw: 0.6, na: 0.15, ne: -0.25, np: 1.25, lean: -0.06, lunge: 0.1, bob: 0.08, flare: 0.4 }, 420, "out");
    g.to({ charge: 0.6 }, 420, "lin");
    fx.converge(s.P("muzzle"), { n: 16, ms: 420, radius: 110 });
    await fx.wait(440);
    fx.focus(1, null, 300);
    for (let i = 0; i < 3; i++) {
      const lastShot = i === 2, m = s.P("muzzle");
      g.pose.charge = 1; g.to({ charge: 0.35 }, 180, "out");
      g.to({ np: 1.0, lunge: 0.18 + i * 0.05, lean: 0.05 }, 60, "out").then(() => g.to({ np: 1.25, lean: -0.06 }, 180, "io"));
      fx.shake(lastShot ? 14 : 8); fx.punch(lastShot ? 0.03 : 0.015, m);
      fx.ring(m, { color: "#ffd9a3", size: lastShot ? 70 : 46, ms: 240 });
      fx.sparks(m, 8, { power: 1, dir: -1 });
      fx.smoke(m, 2, 0.6);
      const target = s.dotC(), aim = { x: target.x + (i - 1) * 18, y: target.y + (i - 1) * 10 };
      fx.shot(m, aim, { ms: lastShot ? 300 : 240, size: lastShot ? 20 : 13, onArrive: () => {
        fx.explosion(aim, { size: lastShot ? 1.1 : 0.6 });
        if (lastShot) s.hurt({ crit: false });
        else { fx.hitstop(40); fx.shake(6); dot.nudge(-8, 0.6); }
      } });
      await fx.wait(lastShot ? 520 : 200);
    }
    g.to({ charge: 0 }, 250);
  },

  // Core laser: the screen darkens, he rises and spreads his arms while energy
  // pours into his eye, then a beam tears across the floor into the teammate.
  async laser(s) {
    const { fx, g } = s;
    fx.darken(0.6, 500); fx.focus(1.1, s.mid(), 900);
    g.to({ ca: 0.4, ce: 0.3, cp: 0, na: 0.4, ne: 0.3, np: 0.3, tilt: -0.3, bob: 0.3, flare: 1.6, thrust: 1.5 }, 700, "out");
    fx.converge(s.P("core"), { color: "#ff6a2a", n: 34, ms: 1000, radius: 220 });
    fx.arcs(s.P("core"), 3, { radius: 90, color: "#ffb35c", ms: 900 });
    for (let i = 0; i < 5; i++) fx.wait(i * 180).then(() => fx.ring(s.P("core"), { color: "#ff9a3c", size: 140 - i * 20, ms: 260, width: 3 }));
    await fx.wait(1000);
    fx.focus(1.02, null, 200); fx.flash(0.35, "#ffd9a3");
    g.to({ tilt: -0.4, lunge: 0.12, lean: 0.06, flare: 2 }, 120, "out");
    fx.beam(s.P("core"), s.dotC(), { ms: 800, width: 38, onHit: () => s.hurt({ crit: true }) });
    for (let i = 0; i < 8; i++) fx.wait(i * 90).then(() => { fx.shake(8); g.pose.lunge += 0.012; });
    fx.wait(200).then(() => { fx.crack(s.dotC().x, { width: 140 }); fx.explosion(s.dotC(), { size: 0.8 }); });
    await fx.wait(900);
    fx.darken(0, 500);
  },

  // Rocket ram: he coils back as the thruster roars, sweeps his arms back and
  // blasts across the stage into the teammate, then drifts home.
  async ram(s) {
    const { fx, g, foeEl } = s;
    fx.focus(1.05, s.mid(), 500);
    g.to({ lunge: 0.35, lean: 0.2, bob: 0.2, ca: 0.2, ce: 0.2, na: 0.2, ne: 0.2, tilt: 0.15, thrust: 2.2, flare: 0.8 }, 600, "out");
    for (let i = 0; i < 7; i++) fx.wait(i * 80).then(() => {
      const t = s.P("thruster");
      fx.sparks(t, 6, { colors: ["#ffffff", "#c9d3dc", "#8fc8ff"], power: 1, dir: 1 });
      fx.smoke(t, 1, 0.6);
    });
    await fx.wait(620);
    const home = foeEl._pos || { x: 0, y: 0 };
    const dist = s.P("core").x - s.dotC().x - 240;
    fx.focus(1, null, 200);
    g.to({ lean: -0.3, tilt: -0.3, lunge: 0, bob: -0.05, ca: -1.4, ce: 0.4, na: -1.4, ne: 0.4, thrust: 2.6 }, 170, "in");
    const c = s.P("core");
    fx.dashTrail({ x: c.x, y: c.y + 40 }, { x: s.dotC().x + 150, y: c.y + 40 }, "fire");
    fx.dust(c.x, 10, 1.6);
    await fx.move(foeEl, { x: home.x - dist }, 170, "in");
    const hit = s.dotC();
    fx.hitstop(130); fx.shake(26); fx.punch(0.05, hit); fx.flash(0.25, "#ffe2b0");
    fx.ring(hit, { size: 180, ms: 420 }); fx.sparks(hit, 22, { power: 1.6, dir: -1 }); fx.debris(hit, 6, { dir: -1 });
    s.hurt({ crit: true });
    await fx.move(foeEl, { x: home.x - dist + 50 }, 160, "out");
    await fx.wait(180);
    g.to({ lean: 0.1, tilt: 0.1, bob: 0.2, thrust: 1 }, 300);
    await fx.move(foeEl, { x: home.x }, 620, "inOut");
    await fx.wait(250);
  },
};

// When the teammate lands a hit: sparks, crackling arcs and armour chips at the
// core, plus his own flinch. A crit adds an explosion and a beat of slow motion.
export function golemHit(ctx, { crit = false } = {}) {
  const { fx, golem } = ctx;
  const at = fx.fromPage(golem.point("core"));
  fx.hitstop(crit ? 170 : 85); fx.shake(crit ? 18 : 9); fx.punch(crit ? 0.06 : 0.025, at);
  fx.arcs(at, crit ? 6 : 3, { radius: crit ? 110 : 70, color: "#8fc8ff" });
  fx.debris(at, crit ? 10 : 4, { dir: 1, power: crit ? 1.2 : 0.9 });
  fx.sparks(at, crit ? 14 : 7, { dir: 1 });
  if (crit) { fx.flash(0.35); fx.ring(at, { size: 210, ms: 460 }); fx.slowmo(0.35, 400); fx.explosion({ x: at.x + 30, y: at.y - 20 }, { size: 0.9 }); }
  return golem.hurt({ crit });
}

// His entrance after the transition: he powers up with a roar.
export async function golemIntro(ctx) {
  const { fx, golem } = ctx;
  fx.letterbox(true);
  await golem.resolve(950, 48);
  fx.focus(1.08, fx.fromPage(golem.point("core")), 700);
  golem.to({ flare: 1.6, tilt: -0.2, bob: 0.2, ca: 0.3, ce: 0.4, na: 0.3, ne: 0.4, thrust: 1.8 }, 500, "out");
  await fx.wait(420);
  const at = fx.fromPage(golem.point("core"));
  fx.shake(16); fx.flash(0.2, "#ffd9a3");
  for (let i = 0; i < 3; i++) fx.wait(i * 150).then(() => fx.ring(at, { color: "#ffb35c", size: 160 + i * 90, ms: 500, width: 4 }));
  fx.arcs(at, 5, { radius: 120, color: "#8fc8ff", ms: 600 });
  fx.title("GOLEM", "Boss 1");
  await fx.wait(1300);
  fx.focus(1, null, 600);
  await golem.rest(700);
  fx.letterbox(false);
}
