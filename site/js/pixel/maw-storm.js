// TENTACLE STORM, the Abyssal Maw's flurry (Isaac 2026-10-24/25: "a bunch of subsequent sweeping whips, not straight as a ruler,
// sweeping from left to right and vice versa, not top-down smacking; cinematic, no black bars, high quality target interaction";
// the two-arm X finisher was dropped: "the last clap looks weird").
//
// Four of his own arms take turns lashing SIDEWAYS through your fighter, the way a bullwhip cracks: the arm is folded into a
// loop (a U-turn), and the loop rolls along it, across the stage and past them, until the tip whips round at the far end.
// A forehand rolls the loop from his side to theirs (right to left); a backhand rolls it back (left to right). Each one is at
// a different height, size and speed, and the last, wide and low, takes them off their feet.
//
// The loop lies flat (seen from a little above): the leg going out runs just BEHIND your fighter, the leg coming back runs IN
// FRONT of them (on the Maw's front layer), and the bend passes through their body: the lash wraps them as it goes by.
// Your fighter is really hit when the bend reaches them: shoved the way it was going (a spring on their position, tilt and
// squash; the last one throws them into the air and they land), with a freeze, sparks and a flash.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const N = 72;          // points along a whipping arm
const PZ = 0.3;        // how far down the screen one px towards the camera shows (the camera looks a little down)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export async function storm(s) {
  const { fx, g } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at;
  // your fighter on a spring: shoved about, then back to where they stand (or thrown up and falling, when in the air)
  const F = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, sx: 1, sy: 1, zeta: 0.42, air: false };
  const pivotD = () => [B.box.x + B.home.x + B.pivot[0] + F.x, B.box.y + B.home.y + B.pivot[1] + F.y];
  const P0 = pivotD(), floorY = B.box.y + B.home.y + B.feet;   // design px
  const fl = fx.floorFrac; fx.floorFrac = floorY / fx.h;   // dust starts on the ground

  // ---- the whips ----
  const whips = new Set();
  // The whip on its own, in 3D (design px; z towards the camera). l: how far the loop has rolled along the track (0 = folded
  // up by the cat, 1 = at the far end past your fighter). Returns the points and where the bend is.
  const shape = (w) => {
    const o = w.o, st = w.st, Mc = g.mouthCells(), M = [Mc[0] * CELL, Mc[1] * CELL, 0], tt = (g.at - t0) / 1000;
    const yh = P0[1] + o.h + st.dy, rz = st.rz, xs = M[0] - 50, xe = P0[0] - (o.past ?? 80), track = xs - xe;
    const L1 = st.l * track, xb = xs - L1;                                   // the bend
    const ret = Math.max(0, (track - L1) * 0.3 * st.ret + 6);               // the leg coming back (shrinks as the loop rolls out)
    const wave = (u, ph) => Math.sin(u * 0.045 - st.l * 14 - tt * 9 + ph) * st.wav * 11;  // ripples, rolling with the loop
    const arch = (x) => { const u = clamp((xs - x) / track); return -o.arch * Math.sin(Math.PI * u) - 10 * Math.sin(Math.PI * 2 * u + w.i); };   // the path bows
    const out = [];
    // out: from his mouth, curving down to the height and depth of the track, then along it behind your fighter
    const T0 = [xs, yh, -rz], gap = Math.hypot(T0[0] - M[0], T0[1] - M[1]);
    for (let k = 0; k <= 16; k++) { const u = k / 16, v = 1 - u, C1 = [M[0] - gap * 0.4, M[1] - gap * 0.15, 0], C2 = [T0[0] + gap * 0.45, T0[1], -rz];
      out.push([0, 1, 2].map((c) => v * v * v * M[c] + 3 * v * v * u * C1[c] + 3 * v * u * u * C2[c] + u * u * u * T0[c])); }
    const nOut = Math.max(2, Math.ceil(L1 / 10));
    for (let k = 1; k <= nOut; k++) { const u = (k / nOut) * L1, x = xs - u; out.push([x, yh + arch(x) + wave(u, 0), -rz + Math.sin(u * 0.02 + w.i) * 8]); }
    // the bend: half a turn round from behind them to in front of them, a little tilted
    const yb = yh + arch(xb) + wave(L1, 0);
    for (let k = 1; k <= 14; k++) { const a = -Math.PI / 2 + (k / 14) * Math.PI; out.push([xb - rz * Math.cos(a) * 0.9, yb + st.tilt * (Math.sin(a) + 1) / 2, rz * Math.sin(a)]); }
    // back: towards him again, in front of your fighter
    const nRet = Math.max(2, Math.ceil(ret / 10));
    // (it trails loosely: sagging, rippling, and its tip curling up at the end)
    let rp = [xb, yb + st.tilt, rz];
    for (let k = 1; k <= nRet; k++) {
      const f = k / nRet, seg = ret / nRet, ang = 0.25 * Math.sin(f * 4 + tt * 8 + w.i) * st.wav + (o.tilt > 0 ? 0.35 : -0.25) * f * f + (f > 0.75 ? -(f - 0.75) * 7 : 0);
      rp = [rp[0] + Math.cos(ang) * seg, rp[1] + Math.sin(ang) * seg, rz + f * 18];
      out.push(rp);
    }
    // even the points out along the arm (so its thickness runs evenly), then draw it with the camera a little above
    const d = [0];
    for (let k = 1; k < out.length; k++) d.push(d[k - 1] + Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1], out[k][2] - out[k - 1][2]));
    const Lt = d[d.length - 1], res = []; let j = 0;
    for (let k = 0; k < N; k++) {
      const sk = (k / (N - 1)) * Lt; while (j < out.length - 2 && d[j + 1] < sk) j++;
      const u = clamp((sk - d[j]) / ((d[j + 1] - d[j]) || 1)), q = [0, 1, 2].map((c) => lerp(out[j][c], out[j + 1][c], u));
      res.push([q[0] / CELL, Math.min(floorY - 3, q[1] + q[2] * PZ) / CELL, q[2]]);
    }
    return { pts: res, bend: xb, yh };
  };
  function start(i, o) {
    const w = { i, o, st: { w: 0, l: o.back ? 1 : 0, rz: o.rz * 0.5, tilt: o.tilt ?? 0, ret: 1, wav: 0, dy: 0 }, armed: false, hit: false, side: null };
    w.fn = (base) => {
      const A = shape(w);
      const pts = A.pts.map((q, k) => { const b = spl(base, k / (N - 1)); return [lerp(b[0], q[0], w.st.w), lerp(b[1], q[1], w.st.w)]; });
      // the bend reaches them: the moment it crosses the middle of their body
      const side = Math.sign(A.bend - pivotD()[0]);
      if (w.armed && !w.hit && w.side !== null && side !== w.side) contact(w, [pivotD()[0], A.yh + 4]);
      w.side = side;
      // the stretches in front of your fighter go on the front layer
      const front = []; let a0 = null;
      if (w.st.w > 0.3) A.pts.forEach((q, k) => { const t = k / (N - 1); if (q[2] > 3 && a0 === null) a0 = t; if ((q[2] <= 3 || k === N - 1) && a0 !== null) { front.push([a0, t]); a0 = null; } });
      return { pts, front };
    };
    g.override[i] = w.fn;
    whips.add(w);
    return w;
  }
  function stop(w) { if (g.override[w.i] === w.fn) delete g.override[w.i]; whips.delete(w); }   // (the same arm may already be whipping again)

  // A hit: shoved the way the lash was going, a freeze, sparks, a flash; the last one throws them into the air.
  function contact(w, at) {
    w.hit = true;
    const o = w.o, p = o.power, dir = o.back ? 1 : -1, c = { x: at[0], y: at[1] };   // dir: which way the loop was rolling
    F.vx += dir * 520 * p; F.vr += dir * 4.5 * p; F.sx = 1 - 0.22 * p;   // shoved along, twisted, squeezed as the bend wraps them
    if (o.h > 20) F.sy = 1 + 0.08 * p; else F.sy = 1 - 0.08 * p;
    fx.dust(pivotD()[0], Math.round(3 + 4 * p), 0.8);   // their feet scuff the ground
    fx.hitstop(Math.round(50 + 45 * p)); fx.shake(Math.round(8 + 10 * p)); fx.punch(0.02 + 0.025 * p, c); fx.flash(0.1 + 0.12 * p, "#ffd6c8");
    fx.sparks(c, Math.round(8 + 8 * p), { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1 + 0.4 * p, dir });
    fx.ring(c, { color: "#f59a90", size: 60 + 40 * p, flat: 0.35, ms: 280, width: 4 });   // flat: a lash round them, not a burst
    sound.sfx("slash", { size: 0.7 + 0.3 * p }); sound.sfx("hit", { size: p });
    if (o.last) {
      F.air = true; F.vy = -620; F.vr += dir * 3;   // swept off their feet
      impactFrame(fx, { ms: 60, frames: 2 });
      fx.hitstop(160); fx.shake(28); fx.punch(0.07, c); fx.flash(0.35, "#ffd6c8");
      fx.wait(170).then(() => fx.slowmo(0.4, 320));   // up they go, in slow motion
      sound.sfx("slamImpact", { size: 1 }); sound.sfx("roar", { size: 0.6 });
      s.hit({ crit: true });   // the damage lands on the last lash
      F.zeta = 0.8;            // and they slide back to their spot instead of bouncing
    } else s.flinch({ crit: false });
  }

  // ---- your fighter: the spring, then placed just before every drawing (so the body and the arms match) ----
  const origin = el.style.transformOrigin;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  const hook = (dt) => {
    const k = Math.min(0.05, dt / 1000), W = 13, Z = F.zeta;
    F.vx += (-W * W * F.x - 2 * Z * W * F.vx) * k; F.vr += (-W * W * F.r - 2 * Z * W * F.vr) * k;
    if (F.air) F.vy += 2600 * k; else F.vy += (-W * W * F.y - 2 * Z * W * F.vy) * k;   // in the air: falling
    F.x += F.vx * k; F.y += F.vy * k; F.r += F.vr * k;
    if (F.y > 0) {
      if (F.air) { F.air = false; F.sx = 1.2; F.sy = 0.82; fx.dust(pivotD()[0], 10, 1.2); fx.shake(12); sound.sfx("slamImpact", { size: 0.6 }); }   // they land
      F.y = 0; F.vy = Math.min(0, F.vy);
    }
    F.sx += (1 - F.sx) * Math.min(1, k * 10); F.sy += (1 - F.sy) * Math.min(1, k * 10);
  };
  const place = () => {
    const x = B.home.x + Math.round(F.x / CELL) * CELL, y = B.home.y + Math.round((F.y + (1 - F.sy) * (B.feet - B.pivot[1])) / CELL) * CELL;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${F.r.toFixed(3)}rad) scale(${F.sx.toFixed(3)}, ${F.sy.toFixed(3)})`;
    el._pos = { x, y, r: (F.r * 180) / Math.PI };
  };
  g.hooks.add(hook); g.draws.add(place);
  const tw = (obj, to, ms, ease = "io") => g.to(to, ms, ease, obj);

  // One lash. Forehand (back: false): it folds up by the cat, then the loop rolls out across the stage past your fighter and the
  // tip cracks round at the far end. Backhand (back: true): it reaches out past them, then the loop rolls back towards him.
  // Resolves when the loop has gone by (the next one can already be coming).
  const whip = (i, o) => {
    const w = start(i, o);
    const swept = (async () => {
      // wind up: into the start pose, the loop opening up
      tw(w.st, { w: 1 }, o.prep * 0.85, "out");
      await tw(w.st, { rz: o.rz }, o.prep, "out");
      if (o.hold) await fx.wait(o.hold);
      // the lash: the loop rolls, faster and faster, ripples running along it
      w.armed = true;
      sound.sfx(o.last ? "swoosh" : "whoosh", { size: 0.6 + 0.3 * o.power });
      tw(w.st, { wav: 1 }, o.strike * 0.5, "out");
      await tw(w.st, { l: o.back ? 0 : 1 }, o.strike, "in");
    })();
    const done = swept.then(async () => {
      // the crack and the recoil: the tip whips round, the loop closes up, and it slides back into the mass
      sound.sfx("hit", { size: 0.4 });
      w.armed = false;
      // he yanks it back: the loop rolls back the way it came and the arm lifts off the ground as it goes
      tw(w.st, { wav: 0.6, rz: o.rz * 0.6, ret: 0.6, dy: -26 }, 280, "out");
      tw(w.st, { l: o.back ? 0.5 : 0.45 }, 520, "io");
      await fx.wait(200);
      tw(w.st, { wav: 0 }, 400, "out");
      await tw(w.st, { w: 0 }, 380, "io");
      stop(w);
    });
    return { swept, done };
  };

  const ends = [];
  try {
    // the arms tense, the camera takes in both of them
    fx.darken(0.2, 400);
    const Mx = g.mouthCells()[0] * CELL;
    fx.focus(1.05, { x: (P0[0] + Mx) / 2, y: P0[1] - 30 }, 500);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 1.1 }, 300, "out");
    // forehand, backhand lower, forehand higher and faster, backhand, then the last
    let w;
    w = whip(3, { h: -4, rz: 46, tilt: 8, arch: 46, prep: 420, hold: 60, strike: 300, power: 0.8 }); ends.push(w.done); await w.swept;
    await fx.wait(40);
    w = whip(5, { back: true, h: 16, rz: 40, tilt: -10, arch: 22, prep: 300, strike: 260, power: 0.7 }); ends.push(w.done); await w.swept;
    w = whip(4, { h: -20, rz: 52, tilt: 14, arch: 60, prep: 260, strike: 230, power: 0.85 }); ends.push(w.done); await w.swept;
    await fx.wait(20);
    w = whip(6, { back: true, h: 4, rz: 36, tilt: -6, arch: 34, prep: 240, strike: 210, power: 0.65 }); ends.push(w.done); await w.swept;
    // ...the last: wide and low, a beat before it comes, and it sweeps them off their feet
    fx.focus(1.08, { x: P0[0] + 40, y: P0[1] - 20 }, 400);
    w = whip(3, { h: 24, rz: 62, tilt: 6, past: 120, arch: 30, prep: 460, hold: 160, strike: 300, power: 1.15, last: true }); ends.push(w.done); await w.swept;
    await Promise.all(ends);
    await fx.wait(250);
    fx.focus(1, null, 500); fx.darken(0, 500);
    await fx.wait(250);
  } finally {
    for (const w of [...whips]) stop(w);
    g.hooks.delete(hook); g.draws.delete(place);
    el.style.transformOrigin = origin;
    fx.place(el, B.home);
    fx.floorFrac = fl;
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  }
}
