// The Abyssal Maw's scenes: his entrance and his attacks, in the same language as GOLEM's (golem-moves.js):
// a readable wind-up, a fast strike, hit-stop and shake on contact, recovery.
// Attacks are built from extra arms (maw-px.js `extra`): an arm is a curve whose points the scene animates.
import { teammateHurt, bossSpecial } from "../battle-moves.js";
import { sound } from "../sound.js";
import { spl, CELL, SK } from "./maw-px.js";
import { grab } from "./maw-grab.js";
import { storm } from "./maw-storm.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const MOVES = ["whip", "grab", "storm"];
let last = null;

// ---- entrance -------------------------------------------------------------------------------------------------------
// Mittens runs in from the right, stands, sits; he yawns wide and THE ABYSSAL MAW pours out of his mouth.
export async function mawIntro(ctx) {
  const { fx, golem: g } = ctx;
  await g.ready;
  const stage = { x: g.xSit };
  ctx.setName("MITTENS");   // he is only a cat, for now
  fx.letterbox(true);
  g.to({ tent: 0, mouth: 0, shield: 0 }, 1, "lin");
  g.setCat("run", g.W + 30);
  await fx.wait(250);
  // 1. a cat runs in and slows to a stand
  await g.moveCat(stage.x + 6, 1400, "out");
  g.setCat("stand", stage.x + 6);
  fx.title("MITTENS", "Boss 2");
  await fx.wait(900);
  // 2. he sits (there's no sitting-down frame in the art, so a small puff of dust covers the cut)
  g.setCat("sit", stage.x);
  fx.dust(stage.x * CELL, 8, 0.8);
  fx.focus(1.08, fx.fromPage(g.point("core")), 900);
  await fx.wait(1300);
  // 3. a pause... then the name changes: that is not a cat
  fx.shake(10); fx.flash(0.25, "#ffe0d6");
  sound.sfx("roar", { size: 0.6 });
  ctx.setName("THE ABYSSAL MAW");
  fx.title("THE ABYSSAL MAW", "Boss 2");
  await fx.wait(1100);
  // 4. he yawns wider and wider...
  sound.sfx("growl", { size: 0.7 });
  await g.to({ mouth: 1 }, 430, "out");
  await fx.wait(220);
  // 5. ...and the tentacles pour out of his mouth
  fx.hitstop(90); fx.shake(22); fx.flash(0.4, "#ffe0d6");
  sound.sfx("roar");
  const at = fx.fromPage(g.point("core"));
  for (let i = 0; i < 3; i++) fx.wait(i * 140).then(() => fx.ring(at, { color: "#f59a90", size: 150 + i * 80, ms: 500, width: 4 }));
  g.to({ tent: 1 }, 1700, "lin");
  await fx.wait(1700);
  fx.focus(1, null, 600);
  await g.rest(500);
  fx.letterbox(false);
}

// ---- attacks --------------------------------------------------------------------------------------------------------
export async function mawAttack(ctx, kind, { onHit } = {}) {
  kind ||= window.__mawMove;   // test hook: window.__mawMove = "grab" forces one attack
  if (!kind) {
    const options = MOVES.filter((m) => m !== last);
    const pool = options.length ? options : MOVES;
    kind = pool[Math.floor(Math.random() * pool.length)];
  }
  last = kind;
  const { fx, dot, golem } = ctx;
  let hurtDone = false;
  const s = {
    ...ctx, g: golem,
    P: (name) => fx.fromPage(golem.point(name)),
    dotC: () => fx.at(dot.figure, { fy: 0.55 }),
    // cells of the world for the arms
    cell: (p) => [p.x / CELL, p.y / CELL],
    hurt: (opts) => { if (hurtDone) { fx.shake(6); return; } hurtDone = true; teammateHurt(ctx, opts); onHit?.(); },
    // the damage without the knock-back (for an attack that is moving your fighter itself); Kaela's sprite stays put
    hit: (opts, { flinch = true } = {}) => { if (hurtDone) return; hurtDone = true; if (flinch) s.flinch(opts); onHit?.(); },
    flinch: (opts) => { dot.hurt(opts); if ("nv" in dot) dot.nv = 0; },
  };
  await ATTACKS[kind](s);
  if (!hurtDone) s.hurt();
  fx.focus(1, null, 400); fx.darken(0);
  await golem.rest(550);
}

// An extra arm the scene drives. mk(state) returns its points; the state's numbers are tweened by the scene.
function addArm(g, st, mk, w = [9, 1.6], pal) {
  const arm = { st, pts: () => mk(st, g), w, pal, u: () => clamp(st.u ?? 1), seed: 11 };
  g.extra.push(arm);
  return () => { g.extra = g.extra.filter((a) => a !== arm); };
}
const tw = (obj, to, ms, g, ease = "out") => g.to(to, ms, ease, obj);

const ATTACKS = {
  // TENTACLE WHIP: the fast basic attack. One of his own arms (the long low one) leaves the mass, rears up over the cat like a
  // cobra, hangs for a beat, then cracks across the stage at your fighter; the root leads and the tip snaps last. After the hit it
  // swings back into the mass and goes on writhing with the rest.
  async whip(s) {
    const { fx, g } = s;
    const I = 3;
    const T0 = s.cell(s.dotC()), Tg = [T0[0] + 4, T0[1] - 2];   // aim a little past the fighter, at chest height
    const st = { rear: 0, strike: 0, ret: 0 };
    g.override[I] = (base) => {
      const [mx, my] = g.mouthCells(), n = base.length;
      return base.map((b, k) => {
        const f = k / (n - 1);
        const R = [mx + (12 * Math.sin(f * 3) - 62 * f * f) * SK, my - 130 * SK * Math.sin(f * 1.45)];   // the arch: up and over his head
        const wave = Math.sin(f * 7 - st.strike * 9) * (1 - st.strike) * 20 * SK * f;
        const over = 1 + 0.12 * Math.sin(clamp(st.strike) * Math.PI) * f;
        const E = [lerp(mx, Tg[0], f * over), lerp(my, Tg[1], f * over) + wave + 8 * Math.sin(f * Math.PI) * SK * (1 - st.strike * 0.6)];
        const A = [lerp(b[0], R[0], st.rear), lerp(b[1], R[1], st.rear)], pk = clamp(st.strike * 1.7 - 0.7 * f);   // root leads, tip snaps last
        const B = [lerp(A[0], E[0], pk), lerp(A[1], E[1], pk)];
        return [lerp(B[0], b[0], st.ret), lerp(B[1], b[1], st.ret)];
      });
    };
    fx.darken(0.25, 400); fx.focus(1.05, s.P("core"), 450);
    sound.sfx("servo", { ms: 500 });
    g.to({ tense: 1, writhe: 1.0 }, 300, "out");
    await tw(st, { rear: 1 }, 680, g, "out");
    await fx.wait(220);
    sound.sfx("whoosh");
    await tw(st, { strike: 1 }, 170, g, "in");
    const at = s.dotC();
    sound.sfx("slamImpact", { size: 0.7 });
    fx.hitstop(70); fx.shake(16); fx.punch(0.04, at); fx.flash(0.2, "#ffd6c8");
    fx.sparks(at, 14, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.4, dir: -1 });
    fx.ring(at, { color: "#f59a90", size: 150, ms: 380, width: 4 });
    s.hurt({});
    await fx.wait(220);
    await tw(st, { ret: 1 }, 520, g, "io");   // it swings back into the mass
    delete g.override[I];
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  },
  grab,   // GRAB AND SLAM: maw-grab.js
  storm,  // TENTACLE STORM: maw-storm.js
};

export function mawSpecial(ctx, move, name) {
  return bossSpecial(ctx, move, name);
}
