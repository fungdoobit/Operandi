// The Abyssal Maw's scenes: his entrance and his attacks, in the same language as GOLEM's (golem-moves.js):
// a readable wind-up, a fast strike, hit-stop and shake on contact, recovery.
// Attacks are built from extra arms (maw-px.js `extra`): an arm is a curve whose points the scene animates.
import { teammateHurt, bossSpecial } from "../battle-moves.js";
import { sound } from "../sound.js";
import { spl, CELL, SK } from "./maw-px.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const MOVES = ["whip"];
let last = null;

// ---- entrance -------------------------------------------------------------------------------------------------------
// Mittens runs in from the right, stands, sits; he yawns wide and THE ABYSSAL MAW pours out of his mouth.
export async function mawIntro(ctx) {
  const { fx, golem: g } = ctx;
  await g.ready;
  const stage = { x: g.xSit };
  fx.letterbox(true);
  g.to({ tent: 0, mouth: 0, shield: 0 }, 1, "lin");
  g.setCat("run", g.W + 30);
  await fx.wait(250);
  // 1. he runs in and slows to a stand (the run carries him to just short of his seat)
  await g.moveCat(stage.x + 7, 1500, "out");
  g.setCat("stand", stage.x + 7);
  await fx.wait(900);
  // 2. he sits (there's no sitting-down frame in the art, so a small puff of dust covers the cut)
  g.setCat("sit", stage.x);
  fx.dust(stage.x * CELL, 8, 0.8);
  fx.focus(1.08, fx.fromPage(g.point("core")), 900);
  await fx.wait(1000);
  // 3. the yawn: wider and wider...
  sound.sfx("growl", { size: 0.7 });
  await g.to({ mouth: 1 }, 430, "out");
  await fx.wait(220);
  // 4. ...and the Maw pours out
  fx.hitstop(90); fx.shake(22); fx.flash(0.4, "#ffe0d6");
  sound.sfx("roar");
  const at = fx.fromPage(g.point("core"));
  for (let i = 0; i < 3; i++) fx.wait(i * 140).then(() => fx.ring(at, { color: "#f59a90", size: 150 + i * 80, ms: 500, width: 4 }));
  g.to({ tent: 1 }, 1700, "lin");
  fx.title("THE ABYSSAL MAW", "Boss 2");
  await fx.wait(1500);
  fx.focus(1, null, 600);
  await g.rest(500);
  fx.letterbox(false);
}

// ---- attacks --------------------------------------------------------------------------------------------------------
export async function mawAttack(ctx, kind, { onHit } = {}) {
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
  // TENTACLE WHIP: the fast basic attack. One arm rears up over the cat like a cobra, hangs for a beat, then cracks across the
  // stage at your fighter; the root leads and the tip snaps last, overshooting a little.
  async whip(s) {
    const { fx, g } = s;
    const T0 = s.cell(s.dotC()), Tg = [T0[0] + 6, T0[1] - 2];   // aim a little past the fighter, at chest height
    const st = { rear: 0, strike: 0, shrink: 0, u: 0 };
    const M = () => [g.mouth[0] + g.pose.hx, g.mouth[1] + g.pose.hy];
    const N = 7;
    const mk = (S) => {
      const [mx, my] = M(), pts = [];
      for (let k = 0; k < N; k++) {
        const f = k / (N - 1);
        // rear pose: an arch up and back over his head (right, then curling over to the left)
        const rx = mx + (12 * Math.sin(f * 3) - 62 * f * f) * SK, ry = my - 130 * SK * Math.sin(f * 1.45);
        const arch = [lerp(mx, rx, S.rear), lerp(my, ry, S.rear)];
        // strike pose: a line to the target with a little sag, plus a travelling ripple
        const wave = Math.sin(f * 7 - S.strike * 9) * (1 - S.strike) * 20 * SK * f;
        const over = 1 + 0.12 * Math.sin(clamp(S.strike) * Math.PI) * f;
        const ex = lerp(mx, Tg[0], f * over), ey = lerp(my, Tg[1], f * over) + wave + 8 * Math.sin(f * Math.PI) * SK * (1 - S.strike * 0.6);
        const pk = clamp(S.strike * 1.7 - 0.7 * f);   // the root leads, the tip snaps last
        let x = lerp(arch[0], ex, pk), y = lerp(arch[1], ey, pk);
        x = lerp(x, mx, S.shrink * (1 - 0.0) * (1 - f * 0.0)); y = lerp(y, my, S.shrink);
        pts.push([x, y]);
      }
      return pts;
    };
    const WHIP_PAL = ["#4a0e1a", "#b83f3f", "#e8706a", "#fbb0a4", "#ffe2d8"].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);   // lighter than the other arms, so the wind-up reads
    const drop = addArm(g, st, mk, [11, 3.2], WHIP_PAL);
    // wind-up: the mouth gapes, the other arms pull back, the whip rears
    fx.darken(0.25, 400); fx.focus(1.05, s.P("core"), 450);
    sound.sfx("servo", { ms: 500 });
    g.to({ tense: 1, writhe: 1.2 }, 300, "out");
    st.u = 1;
    await tw(st, { rear: 1 }, 680, g, "out");
    await fx.wait(220);
    // the crack
    sound.sfx("whoosh");
    await tw(st, { strike: 1 }, 170, g, "in");
    // contact
    const at = s.dotC();
    sound.sfx("slamImpact", { size: 0.7 });
    fx.hitstop(70); fx.shake(16); fx.punch(0.04, at); fx.flash(0.2, "#ffd6c8");
    fx.sparks(at, 14, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.4, dir: -1 });
    fx.ring(at, { color: "#f59a90", size: 150, ms: 380, width: 4 });
    s.hurt({});
    await fx.wait(220);
    // it pulls back
    await tw(st, { shrink: 1 }, 320, g, "in");
    drop();
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  },
};

export function mawSpecial(ctx, move, name) {
  return bossSpecial(ctx, move, name);
}
