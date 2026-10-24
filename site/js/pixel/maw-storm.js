// TENTACLE STORM, the Abyssal Maw's flurry (Isaac 2026-10-24: "not straight as a ruler, a bunch of subsequent sweeping whips,
// cinematic, no black bars, high quality target interaction, animation and impact").
//
// Four of his own arms take turns: each rears back and SWEEPS across the stage in a big curve, over the top or up from the
// floor, then swings back into the mass while the next one is already coming. Two arms finish it together, crossing like an X.
//
// How a sweep looks like a whip: only the arm's root is steered (an angle). Every point further along takes the angle the root
// had a moment earlier (3.6 ms later per point), so the bend runs down the arm and the tip arrives last and snaps through. On
// top of that the arm is never straight: it curls back while it winds up, carries a slow S, and its tip whips past at the end.
// Your fighter is really hit: the moment a whip's outer half touches their body they are knocked the way it was moving
// (a spring on their position, tilt and squash, brought back to where they stand), with a freeze, sparks and a flash.
// The part of the arm past their body is drawn on the Maw's front layer while it strikes, so the lash lands IN FRONT of them.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const N = 64;          // points along a whipping arm
const TAU = 3.6;       // ms each point lags behind the one before it (the tip is about 225 ms behind the root)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export async function storm(s) {
  const { fx, g } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at;
  const late = s.skin === "pyro";   // (as in Grab and Slam) his hurt look is a smaller flame; here it's fine, he isn't held
  // where they are hit: their body's box (design px, from the pivot)
  const xs0 = B.spec.rows.map((r) => r[1]), xs1 = B.spec.rows.map((r) => r[2]), ys = B.spec.rows.map((r) => r[0]);
  const box = { l: Math.min(...xs0) - B.pivot[0] - 4, r: Math.max(...xs1) - B.pivot[0] + 4, t: Math.min(...ys) - B.pivot[1] - 4, b: Math.max(...ys) - B.pivot[1] };
  // your fighter on a spring: knocked about, then back to where they stand
  const F = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, sx: 1, sy: 1, zeta: 0.42 };
  const pivotD = () => [B.box.x + B.home.x + B.pivot[0] + F.x, B.box.y + B.home.y + B.pivot[1] + F.y];
  const M0 = g.mouthCells(), P0 = pivotD(), T = [P0[0] / CELL, P0[1] / CELL];
  const thT = Math.atan2(T[1] - M0[1], T[0] - M0[0]), dT = Math.hypot(T[0] - M0[0], T[1] - M0[1]), L = dT * 1.3;   // longer than the gap: it's curved
  const floor = Math.round((B.box.y + B.home.y + B.feet) / CELL) - 1;   // the arms can't go through the ground
  const fl = fx.floorFrac; fx.floorFrac = (floor * CELL) / fx.h;   // dust starts on the ground

  // ---- the whips ----
  const whips = new Set();
  let finale = null;
  const thAt = (w, t) => { const H = w.hist; if (t <= H[0][0]) return H[0][1]; for (let i = H.length - 1; i > 0; i--) if (H[i - 1][0] <= t) { const [ta, a] = H[i - 1], [tb, b] = H[i]; return lerp(a, b, clamp((t - ta) / ((tb - ta) || 1))); } return H[0][1]; };
  const shape = (w) => {   // the whip on its own: the root's angle, delayed down the arm, plus a curl and a little life
    const M = g.mouthCells(), seg = w.st.L / (N - 1), tt = (g.at - t0) / 1000, pts = [[M[0], M[1]]];
    let p = [M[0], M[1]];
    for (let k = 1; k < N; k++) {
      const f = k / (N - 1), phi = thAt(w, g.at - k * TAU) + w.st.curl * f ** 1.25 + w.st.s * Math.sin(f * Math.PI * 1.6 + w.i) * f
        + w.st.wav * Math.sin(f * 10 - tt * 34) * f + Math.sin(tt * 7 + f * 8 + w.i) * 0.04 * f;   // wav: ripples running down it as it lashes
      p = [p[0] + Math.cos(phi) * seg, Math.min(floor, p[1] + Math.sin(phi) * seg)];
      pts.push(p);
    }
    return pts;
  };
  const inside = (P) => { const c = pivotD(), x = P[0] * CELL - c[0], y = P[1] * CELL - c[1]; return x > box.l && x < box.r && y > box.t && y < box.b; };
  function start(i, o) {
    const r0 = g.armPts(i), rest = Array.isArray(r0) ? r0 : r0.pts, M = g.mouthCells(), tip = rest[rest.length - 1];   // (it may still be finishing a whip)
    let len = 0; for (let k = 1; k < rest.length; k++) len += Math.hypot(rest[k][0] - rest[k - 1][0], rest[k][1] - rest[k - 1][1]);
    let th0 = Math.atan2(tip[1] - M[1], tip[0] - M[0]);
    th0 = thT + Math.atan2(Math.sin(th0 - thT), Math.cos(th0 - thT));   // measured from the line to your fighter, so it never swings the long way round
    const w = { i, o, st: { w: 0, th: th0, L: len, curl: 0, s: 0, wav: 0 }, hist: [[g.at - 2000, th0]], armed: false, front: false, hit: false, floorHit: false, prev: null };
    w.fn = (base) => {
      const W = shape(w), k0 = Math.floor(N * 0.42);
      const pts = W.map((q, k) => { const b = spl(base, k / (N - 1)); return [lerp(b[0], q[0], w.st.w), lerp(b[1], q[1], w.st.w)]; });
      // contact: the first point of the outer half inside their body, while the whip is live
      if (w.armed && !w.hit) for (let k = k0; k < N; k++) if (inside(pts[k])) { const pv = w.prev ? w.prev[k] : pts[k]; contact(w, pts[k], [pts[k][0] - pv[0], pts[k][1] - pv[1]]); break; }
      // the tip slapping the ground on a down-sweep
      if (w.armed && !w.floorHit && w.o.to < w.o.from && pts[N - 4][1] >= floor - 0.5 && w.prev && Math.abs(pts[N - 4][0] - w.prev[N - 4][0]) > 2) { w.floorHit = true; fx.dust(pts[N - 4][0] * CELL, 6, 0.9); sound.sfx("hit", { size: 0.5 }); }
      w.prev = pts;
      const out = { pts };
      if (w.front) out.front = [[clamp((dT - 26) / w.st.L), 1]];
      return out;
    };
    g.override[i] = w.fn;
    whips.add(w);
    return w;
  }
  function stop(w) { if (g.override[w.i] === w.fn) delete g.override[w.i]; whips.delete(w); }   // (the same arm may already be whipping again)

  // A hit: knocked the way the whip was moving, a freeze, sparks, a flash; the last one is the big one.
  function contact(w, P, v) {
    w.hit = true;
    const n = Math.hypot(v[0], v[1]) || 1, d = [v[0] / n, v[1] / n], at = { x: P[0] * CELL, y: P[1] * CELL }, o = w.o;
    if (finale && finale.done) {   // the second arm of the X: only sparks
      fx.sparks(at, 10, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.2, dir: Math.sign(d[0]) || -1 });
      return;
    }
    const p = o.power;
    F.vx += d[0] * 700 * p; F.vy += Math.min(0, d[1]) * 420 * p; F.vr += d[0] * 5 * p + d[1] * 1.6 * p;
    fx.dust(pivotD()[0], Math.round(3 + 4 * p), 0.8);   // their feet scuff the ground
    if (d[1] > 0.25) { F.sx = 1 + 0.16 * p; F.sy = 1 - 0.14 * p; } else if (d[1] < -0.25) { F.sx = 1 - 0.08 * p; F.sy = 1 + 0.1 * p; }
    fx.hitstop(Math.round(45 + 40 * p)); fx.shake(Math.round(8 + 10 * p)); fx.punch(0.02 + 0.025 * p, at); fx.flash(0.1 + 0.12 * p, "#ffd6c8");
    fx.sparks(at, Math.round(8 + 8 * p), { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1 + 0.4 * p, dir: Math.sign(d[0]) || -1 });
    fx.ring(at, { color: "#f59a90", size: 50 + 40 * p, flat: Math.abs(d[1]) > 0.5 ? 0.5 : 1, ms: 260, width: 4 });
    sound.sfx("slash", { size: 0.7 + 0.3 * p }); sound.sfx("hit", { size: p });
    if (o.last) {
      finale.done = true;
      F.vx -= 700; F.vy -= 200; F.vr -= 5;
      impactFrame(fx, { ms: 60, frames: 2 });
      fx.hitstop(160); fx.shake(30); fx.punch(0.07, at); fx.flash(0.4, "#ffd6c8");
      fx.wait(170).then(() => fx.slowmo(0.35, 300));   // the knock-back flies in slow motion
      sound.sfx("slamImpact", { size: 1.1 }); sound.sfx("roar", { size: 0.6 });
      fx.ring(at, { color: "#ffd6c8", size: 150, ms: 420, width: 6 });
      s.hit({ crit: true });   // the damage lands on the finishing X
      F.zeta = 0.75;            // and they slide back to their spot instead of bouncing
    } else s.flinch({ crit: false });
  }

  // ---- your fighter: the spring, then placed just before every drawing (so the body and the arms match) ----
  const origin = el.style.transformOrigin;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  const hook = (dt) => {
    for (const w of whips) { w.hist.push([g.at, w.st.th]); if (w.hist.length > 400) w.hist.splice(1, 100); }   // each root angle's recent past
    const k = Math.min(0.05, dt / 1000), W = 13, Z = F.zeta;
    F.vx += (-W * W * F.x - 2 * Z * W * F.vx) * k; F.vy += (-W * W * F.y - 2 * Z * W * F.vy) * k; F.vr += (-W * W * F.r - 2 * Z * W * F.vr) * k;
    F.x += F.vx * k; F.y += F.vy * k; F.r += F.vr * k;
    if (F.y > 0) { F.y = 0; F.vy = Math.min(0, F.vy); }
    F.sx += (1 - F.sx) * Math.min(1, k * 10); F.sy += (1 - F.sy) * Math.min(1, k * 10);
  };
  const place = () => {
    const x = B.home.x + Math.round(F.x / CELL) * CELL, y = B.home.y + Math.round((F.y + (1 - F.sy) * (B.feet - B.pivot[1])) / CELL) * CELL;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${F.r.toFixed(3)}rad) scale(${F.sx.toFixed(3)}, ${F.sy.toFixed(3)})`;
    el._pos = { x, y, r: (F.r * 180) / Math.PI };
  };
  g.hooks.add(hook); g.draws.add(place);
  const tw = (obj, to, ms, ease = "io") => g.to(to, ms, ease, obj);

  // One whip: rear back to `from` (radians above + / below - the line to your fighter), sweep through to `to`, follow through,
  // and swing back into the mass. Resolves when the sweep is through (the next one can already be coming).
  const whip = (i, o) => {
    const w = start(i, o), dir = Math.sign(o.to - o.from);
    const swept = (async () => {
      // wind up: short and coiled back over the cat, the hook open toward your fighter
      tw(w.st, { w: 1 }, o.prep * 0.8, "out"); tw(w.st, { L: dT * 0.38 }, o.prep, "out"); tw(w.st, { curl: -dir * o.curl, s: 0.3 * dir }, o.prep, "out");
      await tw(w.st, { th: thT + o.from }, o.prep, "out");
      if (o.hold) await fx.wait(o.hold);
      // strike: it swings and unfurls across the stage at once, the coil opening out, the tip last
      w.armed = true; w.front = true;
      sound.sfx(o.last ? "swoosh" : "whoosh", { size: 0.6 + 0.3 * o.power });
      tw(w.st, { L }, o.strike * 1.15, "out");
      tw(w.st, { curl: dir * 1.0, s: -0.15 * dir }, o.strike + 120, "io");
      tw(w.st, { wav: 0.24 }, o.strike, "out");
      await tw(w.st, { th: thT + o.to }, o.strike, "in");
    })();
    const done = swept.then(async () => {
      // follow-through and recoil: it carries on a little, the tip curls round, and it pulls back in (never left lying straight)
      tw(w.st, { th: thT + o.to + dir * 0.18 }, 240, "out");
      tw(w.st, { curl: dir * 2.3, s: 0.2 * dir, wav: 0 }, 340, "out");
      tw(w.st, { L: dT * 0.42 }, 420, "out");
      await fx.wait(330);               // the tip is still on its way: it can still land
      w.armed = false;
      await tw(w.st, { w: 0 }, 380, "io");
      stop(w);
    });
    return { swept, done };
  };

  const ends = [];
  try {
    // the arms tense, the camera takes in both of them
    fx.darken(0.2, 400);
    fx.focus(1.05, { x: (P0[0] + M0[0] * CELL) / 2, y: P0[1] - 30 }, 500);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 1.1 }, 300, "out");
    // a rhythm that isn't even: over the top, up from the floor, steep and fast, low and flat, a beat... then the X
    let w;
    w = whip(3, { from: 0.85, to: -0.2, prep: 440, hold: 60, strike: 190, power: 0.8, curl: 2.3 }); ends.push(w.done); await w.swept;
    await fx.wait(40);
    w = whip(5, { from: -0.28, to: 0.42, prep: 270, strike: 165, power: 0.7, curl: 2.0 }); ends.push(w.done); await w.swept;
    w = whip(4, { from: 1.0, to: -0.16, prep: 240, strike: 150, power: 0.9, curl: 2.6 }); ends.push(w.done); await w.swept;
    await fx.wait(20);
    w = whip(6, { from: -0.2, to: 0.34, prep: 210, strike: 135, power: 0.6, curl: 1.8 }); ends.push(w.done); await w.swept;
    // the finisher: two arms rear wide, a beat, then cross through them together
    finale = { done: false };
    fx.focus(1.09, { x: P0[0] + 40, y: P0[1] - 20 }, 400);
    const a = whip(3, { from: 0.95, to: -0.2, prep: 440, hold: 150, strike: 190, power: 1.1, curl: 2.5, last: true });
    const b = whip(5, { from: -0.32, to: 0.44, prep: 440, hold: 150, strike: 190, power: 1.1, curl: 2.2, last: true });
    ends.push(a.done, b.done);
    await Promise.all([a.swept, b.swept]);
    await Promise.all(ends);
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
