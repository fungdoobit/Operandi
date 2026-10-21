// Hi-bit GOLEM's attacks: the same cinematic language as battle-moves.js
// (charge-up, a violent release, hit-stop, camera shake and punch-in, heavy
// impact, recovery), driven by the pixel model's pose numbers.
import { teammateHurt, bossSpecial } from "../battle-moves.js";
import { PODS } from "./golem-boss.js";
import { sound } from "../sound.js";

const MOVES = ["slam", "barrage", "laser"];
let last = null;

// ctx: { fx, dot, mateEl, theme, golem }
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
    sound.sfx("servo", { ms: 520 });
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
    fx.converge(s.P("core"), { color: "#ff6a2a", n: 34, ms: 1000, radius: 220, sound: false });
    sound.sfx("laserCharge", { ms: 1000 });
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
};

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
  sound.sfx("roar");
  for (let i = 0; i < 3; i++) fx.wait(i * 150).then(() => fx.ring(at, { color: "#ffb35c", size: 160 + i * 90, ms: 500, width: 4 }));
  fx.arcs(at, 5, { radius: 120, color: "#8fc8ff", ms: 600 });
  fx.title("GOLEM", "Boss 1");
  await fx.wait(1300);
  fx.focus(1, null, 600);
  await golem.rest(700);
  fx.letterbox(false);
}

// ---- Specials ----------------------------------------------------------------
// They do no damage (they change the next challenge), so the threat is all in
// the staging: a long telegraph, a violent release, and the hit landing on the
// teammate. The Firewall keeps the shared staging in battle-moves.js.

const NS = "http://www.w3.org/2000/svg";
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const node = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
const PINK = "#ff4d7e", CYAN = "#5fe3ff";

export function golemSpecial(ctx, move, name) {
  if (move === "typos") return typoSwarm(ctx, name);
  if (move === "glitch") return glitchText(ctx, name);
  return bossSpecial(ctx, move, name);
}

// Typo Swarm: he rears back to show his deck while the pods charge pink, then
// fires three waves of letter-bugs (each one kicking him back) that close in
// on the teammate in slow motion and bite.
async function typoSwarm(ctx, name) {
  const { fx, dot, golem: g, theme } = ctx;
  const core = () => fx.fromPage(g.point("core"));
  const pod = (i) => fx.fromPage(g.pagePoint(PODS[i % PODS.length]));
  const dotC = () => fx.at(dot.figure, { fy: 0.5 });
  fx.letterbox(true); fx.darken(0.45, 500);
  fx.focus(1.12, { x: core().x, y: core().y - 40 }, 900);
  fx.title(g.name || "GOLEM", name);
  g.to({ tilt: 0.38, bob: 0.16, lean: 0.08, ca: -0.3, ce: 1.4, na: -0.3, ne: 1.4, flare: 1.4, thrust: 1.6 }, 700, "out");
  dot.setMood("worried");
  for (let i = 0; i < 6; i++) fx.converge(pod(i), { color: PINK, n: 6, ms: 800, radius: 80, glow: null });
  for (let k = 0; k < 12; k++) fx.wait(k * 85).then(() => { fx.shake(2 + k * 0.5); g.fxv.glitch = 0.3; g.to({ glitch: 0 }, 70, "lin", g.fxv); });
  await fx.wait(1200);
  fx.focus(1, null, 300); fx.letterbox(false);

  let mobbed = false;
  const onArrive = () => {
    if (mobbed) return;
    mobbed = true;
    dot.swarmed(2300);
    for (let i = 0; i < 7; i++) fx.wait(i * 300).then(() => { fx.drops(fx.at(dot.figure, { fy: 0.45 }), theme, 4, { power: 0.7 }); fx.shake(4); });
  };
  const letters = ["p", "r", "i", "n", "t", "(", '"', ":", ")", "'", ";", "#", "=", "{", "}", "f"];
  for (let w = 0; w < 3; w++) {
    g.to({ tilt: 0.5, bob: 0.1 }, 50, "out").then(() => g.to({ tilt: 0.38, bob: 0.16 }, 220, "out"));
    fx.shake(12); fx.flash(0.14, PINK); fx.punch(0.025, core());
    sound.sfx("launch");
    for (let i = 0; i < 6; i++) {
      const p = pod(i);
      fx.smoke(p, 1, 0.55);
      fx.sparks(p, 4, { colors: [PINK, "#ffffff", "#ffb3c8"], power: 1.1, dir: -1 });
      fx.ring(p, { color: PINK, size: 34, ms: 220, width: 3 });
      fx.bug(letters[(w * 6 + i) % letters.length], p, dotC, { onArrive });
    }
    await fx.wait(300);
  }
  // The swarm closes in: slow motion and the camera on the teammate.
  await fx.wait(450);
  fx.focus(1.16, dotC(), 500); fx.slowmo(0.5, 800);
  await fx.wait(800);
  for (let k = 0; k < 5; k++) fx.wait(k * 260).then(() => {
    fx.hitstop(40); fx.shake(7); fx.flash(0.08, PINK);
    sound.sfx("bite");
    fx.ring(dotC(), { color: PINK, size: 100, flat: 0.5, ms: 300, width: 3 });
  });
  await fx.wait(1500);
  fx.focus(1, null, 500); fx.darken(0, 500);
  g.rest(600);
  await fx.wait(600);
}

// Glitch Text: his eye blazes, the colours split and static tears across the
// arena while he charges; then a torrent of scrambled characters slams into the
// teammate and a wave of corrupted blocks rolls along the floor.
async function glitchText(ctx, name) {
  const { fx, dot, golem: g } = ctx;
  const core = () => fx.fromPage(g.point("core"));
  const dotC = () => fx.at(dot.figure, { fy: 0.5 });
  // Red/cyan colour split on the two fighters (not the whole arena, which would tint the darkening too).
  const chroma = (px) => { for (const e of [g.canvas, ctx.mateEl]) e.style.filter = px ? `drop-shadow(${px}px 0 rgba(255,60,120,.8)) drop-shadow(${-px}px 0 rgba(60,230,255,.8))` : ""; };
  fx.letterbox(true); fx.darken(0.55, 400);
  fx.focus(1.14, core(), 800);
  fx.title(g.name || "GOLEM", name);
  g.to({ flare: 2.2, tilt: -0.25, bob: 0.25, ca: 0.6, ce: 0.2, na: 0.6, ne: 0.2, thrust: 1.6 }, 700, "out");
  dot.setMood("worried");
  fx.converge(core(), { color: CYAN, n: 30, ms: 950, radius: 240, glow: null });
  fx.arcs(core(), 3, { radius: 90, color: CYAN, ms: 900 });
  for (let k = 0; k < 9; k++) fx.wait(k * 115).then(() => {
    g.fxv.glitch = 0.8 + k * 0.2; g.to({ glitch: 0 }, 100, "lin", g.fxv);
    chroma(k % 2 ? 2 + k * 0.6 : 0); fx.shake(3 + k * 0.6);
    staticBars(fx, 3 + k, 90);
  });
  await fx.wait(1050);
  fx.letterbox(false); fx.focus(1.02, null, 200);

  // Release.
  chroma(6);
  fx.flash(0.5, CYAN); fx.hitstop(120); fx.shake(22); fx.punch(0.05, core());
  sound.sfx("screech");
  g.to({ tilt: -0.42, lunge: 0.12, flare: 2.6 }, 100, "out");
  fx.ring(core(), { color: CYAN, size: 220, ms: 420, width: 6 });
  let hit = false;
  for (let i = 0; i < 64; i++) fx.wait(i * 16).then(() => glyph(fx, core(), dotC(), () => {
    if (!hit) { hit = true; dot.setMood("worried"); fx.hitstop(60); fx.shake(14); fx.flash(0.15, PINK); }
    dot.nudge(-3, 0.25);
  }));
  corruptionWave(fx, core().x, dotC().x);
  for (let k = 0; k < 6; k++) fx.wait(k * 160).then(() => { staticBars(fx, 6, 110); chroma(k % 2 ? 7 : 3); });
  await fx.wait(1250);

  // Aftershock: everything tears for a beat, then settles.
  g.fxv.glitch = 2; g.to({ glitch: 0 }, 700, "lin", g.fxv);
  staticBars(fx, 14, 160); fx.shake(10);
  await fx.wait(300);
  chroma(0);
  fx.darken(0, 500); fx.focus(1, null, 500);
  g.rest(700);
  await fx.wait(700);
}

// A scrambled character fired from `a` to `b` on a jittery arc; bursts into pixels on arrival.
function glyph(fx, a, b, onArrive) {
  const t = node("text", { "font-family": "ui-monospace, Menlo, monospace", "font-weight": 700, "font-size": rnd(20, 36).toFixed(0), fill: pickOne([CYAN, PINK, "#ffffff"]) }, fx.g);
  t.textContent = pickOne([..."#%&@?!*~$01<>/\\{}[]"]);
  const ms = rnd(260, 420), lift = rnd(-70, 40), ty = rnd(-26, 26);
  fx.particle({ el: t, max: ms, update(p, k, f) {
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y + ty - a.y) * f + Math.sin(f * Math.PI) * lift + rnd(-3, 3);
    t.setAttribute("x", x.toFixed(1)); t.setAttribute("y", y.toFixed(1));
    if (f > 0.97 && !p.done) {
      p.done = true;
      onArrive?.();
      for (let i = 0; i < 4; i++) {
        const sq = node("rect", { width: 4, height: 4, fill: pickOne([CYAN, PINK, "#fff"]) }, fx.g);
        const ang = rnd(0, Math.PI * 2), sp = rnd(2, 5);
        fx.particle({ el: sq, max: 300, px: x, py: y, update(q, kk, ff) { q.px += Math.cos(ang) * sp * kk; q.py += Math.sin(ang) * sp * kk; sq.setAttribute("x", q.px.toFixed(1)); sq.setAttribute("y", q.py.toFixed(1)); sq.setAttribute("opacity", (1 - ff).toFixed(2)); } });
      }
    }
  } });
}

// Bars of static flickering across the arena.
function staticBars(fx, n, ms) {
  sound.sfx("glitch");
  for (let i = 0; i < n; i++) {
    const h = rnd(2, 10), y = rnd(0, fx.h), w = rnd(fx.w * 0.15, fx.w * 0.7), x = rnd(-50, fx.w - w);
    const r = node("rect", { x, y, width: w, height: h, fill: pickOne([CYAN, PINK, "#ffffff", "#0b0910"]), opacity: rnd(0.35, 0.85).toFixed(2) }, fx.g);
    fx.particle({ el: r, max: ms * rnd(0.5, 1.2), update(p) { r.setAttribute("x", (x + rnd(-14, 14)).toFixed(1)); } });
  }
}

// A row of corrupted blocks rolling along the floor from GOLEM to the teammate.
function corruptionWave(fx, from, to) {
  const steps = 16;
  for (let i = 0; i < steps; i++) fx.wait(i * 35).then(() => {
    const x = from + (to - from) * (i / (steps - 1));
    for (let j = 0; j < 3; j++) {
      const s = rnd(6, 16), r = node("rect", { width: s, height: s, fill: pickOne([CYAN, PINK, "#ffffff"]) }, fx.g);
      const bx = x + rnd(-14, 14), vy = rnd(-4, -1.5);
      fx.particle({ el: r, max: rnd(300, 520), y: fx.floorY - s, update(p, k, f) { p.y += vy * k * (1 - f); r.setAttribute("x", bx.toFixed(1)); r.setAttribute("y", p.y.toFixed(1)); r.setAttribute("opacity", (1 - f).toFixed(2)); } });
    }
  });
}
