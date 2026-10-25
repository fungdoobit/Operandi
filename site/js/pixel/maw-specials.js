// The Abyssal Maw's specials (Module 2 boss). No letterbox bars (Isaac doesn't want them in the Maw's fight).
//   Coil Shield (his Firewall): the mouth gapes, the arms thrash, then swing round into the wall in front of him (maw-boss.js).
//   Quote Trap, Case Twist, Flipped Values (they mess with the next challenge's given values, boss-rules.js): three arms rear
//   up and PLUNGE into the ground in front of him, down towards your code under the stage; they wriggle there for a beat,
//   the ground ripples, and they pull back out. Then app.js jolts the editor as the sabotaged code arrives.
// The plunging arms are drawn only down to the ground line (the Maw's clipOv), so they really go in.
import { sound } from "../sound.js";
import { spl, CELL } from "./maw-px.js";

const PLUNGE = [3, 4, 6];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

async function telegraph(ctx, name) {
  const { fx, boss, golem: g } = ctx;
  fx.darken(0.25, 400);
  fx.focus(1.08, fx.fromPage(g.point("core")), 700);
  boss.charge();
  sound.sfx("growl", { size: 0.9 });
  fx.title(boss.b.name, name);
  await fx.wait(1250);
}

async function coilShield(ctx, name) {
  const { fx, boss } = ctx;
  await telegraph(ctx, name);
  boss.special("firewall");
  fx.shake(8);
  await fx.wait(700);
  fx.focus(1, null, 400); fx.darken(0, 400);
  await fx.wait(300);
}

// Three arms into the ground: between him and your fighter, each its own spot, depth and timing.
async function plunge(ctx, name) {
  const { fx, golem: g, dot } = ctx;
  await telegraph(ctx, name);
  const t0 = g.at, floor = g.floorC - 1;
  const M0 = g.mouthCells(), D = fx.at(dot.figure, { fy: 0.9 });
  const spots = [0.3, 0.52, 0.72].map((f, j) => ({ x: lerp(M0[0], D.x / CELL, f), j }));
  const st = PLUNGE.map(() => ({ go: 0, dive: 0 }));
  PLUNGE.forEach((i, j) => {
    g.clipOv[i] = floor;
    g.override[i] = (base) => {
      const s = st[j], M = g.mouthCells(), sp = spots[j], tt = (g.at - t0) / 1000, n = base.length;
      if (s.go <= 0) return base;
      // up and over, then straight down into the ground (below it, hidden), wriggling while it's in
      const E = [sp.x + Math.sin(tt * 9 + j) * 1.5 * s.dive, floor + 10 + 30 * s.dive];
      const top = [lerp(M[0], sp.x, 0.55), Math.min(M[1], floor) - 46 - 8 * j];
      const P = [M, [lerp(M[0], top[0], 0.5), M[1] - 26 - 6 * j], top, [sp.x + 3, floor - 34], [sp.x + Math.sin(tt * 7 + j) * 2 * s.dive, floor - 6], E];
      return Array.from({ length: n }, (_, k) => {
        const f = k / (n - 1), b = base[k], q = spl(P, f), w = clamp(s.go * 1.5 - 0.5 * f), e = w * w * (3 - 2 * w);
        return [lerp(b[0], q[0], e), lerp(b[1], q[1], e)];
      });
    };
  });
  const tw = (obj, to, ms, ease = "io") => g.to(to, ms, ease, obj);
  try {
    fx.focus(1.04, { x: lerp(M0[0] * CELL, D.x, 0.5), y: floor * CELL - 40 }, 500);
    // in they go, one after another
    for (let j = 0; j < PLUNGE.length; j++) {
      fx.wait(j * 150).then(async () => {
        sound.sfx("whoosh", { size: 0.6 });
        await tw(st[j], { go: 1 }, 380, "in");
        const at = { x: spots[j].x * CELL, y: floor * CELL };
        sound.sfx("squelch"); sound.sfx("debris");
        fx.shake(10); fx.dust(at.x, 8, 1.1);
        fx.ring(at, { color: "#f59a90", size: 70, flat: 0.25, ms: 420, width: 4 });
        tw(st[j], { dive: 1 }, 500, "out");
      });
    }
    await fx.wait(900);
    // a beat in your code: the ground ripples over them
    sound.sfx("glitch");
    for (let k = 0; k < 3; k++) fx.wait(k * 200).then(() => { for (const sp of spots) fx.ring({ x: sp.x * CELL, y: floor * CELL }, { color: "#f59a90", size: 40 + 25 * k, flat: 0.25, ms: 360, width: 3 }); fx.shake(4); });
    await fx.wait(650);
    // and out again
    for (let j = 0; j < PLUNGE.length; j++) fx.wait(j * 90).then(() => { fx.dust(spots[j].x * CELL, 5, 0.8); tw(st[j], { dive: 0 }, 220, "in").then(() => tw(st[j], { go: 0 }, 480, "io")); });
    sound.sfx("whoosh");
    await fx.wait(820);
  } finally {
    PLUNGE.forEach((i) => { delete g.override[i]; delete g.clipOv[i]; });
    fx.focus(1, null, 400); fx.darken(0, 400);
    g.rest(400);
  }
}

export function mawSpecialScene(ctx, move, name) {
  return move === "firewall" ? coilShield(ctx, name) : plunge(ctx, name);
}
