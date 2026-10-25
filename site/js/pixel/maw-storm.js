// TENTACLE STORM, the Abyssal Maw's flurry (Isaac 2026-10-24/25: "a bunch of subsequent sweeping whips, not straight as a ruler,
// sweeping from left to right and vice versa, not top-down smacking; cinematic, no black bars, high quality target interaction";
// the two-arm X finisher was dropped: "the last clap looks weird"; then the rolling bullwhip loop "doesn't look very good").
//
// Third pass: the storm comes up out of the ground. Four of his arms rear up and dive into the ground in front of him; the
// ground heaves as they tunnel across the stage, and they burst up round your fighter, two on each side, rearing like cobras.
// Then they take turns sweeping SIDEWAYS through them: each one bends over at their height and its outer part swings round in a
// flat circle (seen from a little above), from behind one side, round the front of them, through to the other side, with a
// slash arc trailing its tip. Left to right, right to left, chest, legs, head, chest; the last is wide and low and sweeps them
// off their feet. Then the arms sink back into the ground and come home.
// The arms are one curve all the way: mouth, over, into the ground, under the stage, and up beside your fighter; the Maw hides
// everything of them below the ground (clipOv), and the parts in front of your fighter go on the front layer.
// Your fighter is hit when an arm's tip passes their middle: shoved the way it was going (a spring on their position, tilt and
// squash; the last one throws them into the air and they land), with a freeze, sparks and a flash.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const PZ = 0.3;        // how far down the screen one px towards the camera shows (the camera looks a little down)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const TRAIL = 150;     // ms of slash arc behind a sweeping tip

// The four arms: where each dives in (px in front of his mouth), where it comes up (px from your fighter's middle) and how long
// its sweeping part is.
const ARMS = [
  { i: 3, dive: 70, up: -54, len: 116 },
  { i: 5, dive: 104, up: 60, len: 108 },
  { i: 4, dive: 54, up: -86, len: 132 },
  { i: 6, dive: 88, up: 94, len: 122 },
];

export async function storm(s) {
  const { fx, g } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at;
  // your fighter on a spring: shoved about, then back to where they stand (or thrown up and falling, when in the air)
  const F = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, sx: 1, sy: 1, zeta: 0.42, air: false };
  const pivotD = () => [B.box.x + B.home.x + B.pivot[0] + F.x, B.box.y + B.home.y + B.pivot[1] + F.y];
  const P0 = pivotD(), floorY = B.box.y + B.home.y + B.feet;   // design px
  const G = (g.floorC - 1) * CELL;                               // the ground line under the Maw
  const fl = fx.floorFrac; fx.floorFrac = floorY / fx.h;         // dust starts on the ground

  // ---- the arms ----
  // st: go (from his idle pose into the dive), run (how far it has tunnelled, 0 at the dive .. 1 under your fighter), rise (how
  // far it stands out of the ground, below 0 = under it), h (the height it bends over at), ang (where its sweeping part points:
  // 0 to their right, pi/2 at the camera, pi to their left), flat (0 standing up like a cobra .. 1 bent over and sweeping),
  // curl (how much the sweeping part bends behind the tip), wav (ripples).
  const arms = ARMS.map((a, j) => ({ ...a, j, st: { go: 0, run: 0, rise: -0.3, h: -10, ang: a.up < 0 ? Math.PI : 0, flat: 0, curl: 0, wav: 0 }, armed: false, hit: false, trail: [], o: null }));
  let done = false;
  const path = (a) => {
    const st = a.st, Mc = g.mouthCells(), M = [Mc[0] * CELL, Mc[1] * CELL, 0], tt = (g.at - t0) / 1000;
    const D = M[0] - a.dive, E = lerp(D - 10, P0[0] + a.up, st.run), side = Math.sign(a.up);
    const top = [lerp(M[0], D, 0.55), Math.min(M[1], G) - 40 - a.j * 7, 0];
    const hy = P0[1] + st.h + a.len * 0.2 * st.flat, rise = st.rise, elbowY = lerp(G + 10, hy, rise);   // (bent over, it rises a little more before it turns)
    const sway = Math.sin(tt * 3 + a.j * 2) * 4 * (1 - st.flat);
    // (few points up to where it comes out of the ground, so the part above it is the thick middle of the arm, not its thin end)
    const pts = [M, top, [D + 4, G - 16, 0], [D - 6, G + 24, 0], [E - side * 12, G + 28, 0], [E, G + 6, 0],
      [E + sway * 0.3, lerp(G + 6, elbowY, 0.55), 0], [E + sway, elbowY, 0]];
    // the part above: standing, it rises and curls over towards your fighter like a cobra (its tip hooked down); bent over to
    // sweep, it lies flat along ang, curving behind its tip into a crescent
    const n = 10, L = a.len * clamp(rise + 0.3), toward = -a.sg;
    let p = pts[pts.length - 1];
    for (let k = 1; k <= n; k++) {
      const f = k / n, th = -Math.PI / 2 + toward * (1.95 * f ** 1.6 + 0.12 * Math.sin(tt * 3 + a.j)) + Math.sin(tt * 4 + f * 3 + a.j) * 0.08;
      const an = st.ang - a.sg * st.curl * (1 - f) * 1.5;
      const sx = Math.cos(th), sy = Math.sin(th), wx = Math.cos(an), wz = Math.sin(an), wy = 0.18 * f * f + Math.sin(f * 6 + tt * 10) * 0.12 * st.wav;
      const fl = st.flat * smooth(f * 2.4);   // it bends over smoothly: still rising at its base, flat further out
      const dx = lerp(sx, wx, fl), dy = lerp(sy, wy, fl), dz = lerp(0, wz, fl);
      const l = Math.hypot(dx, dy, dz) || 1, seg = L / n;
      p = [p[0] + (dx / l) * seg, p[1] + (dy / l) * seg, p[2] + (dz / l) * seg];
      pts.push(p);
    }
    return pts;
  };
  const project = (q) => [q[0] / CELL, (q[1] + q[2] * PZ) / CELL];
  for (const a of arms) {
    a.sg = Math.sign(a.up) < 0 ? -1 : 1;   // the side it comes up on: it sweeps towards the other
    g.clipOv[a.i] = g.floorC - 1;
    a.fn = (base) => {
      const st = a.st; if (st.go <= 0) return base;
      const P = path(a), n = P.length;
      const pts = P.map((q, k) => {
        const f = k / (n - 1), b = spl(base, f), w = smooth(st.go * 1.6 - 0.6 * f), pr = project(q);
        return [lerp(b[0], pr[0], w), lerp(b[1], pr[1], w)];
      });
      const tip = P[n - 1], tipD = [tip[0], tip[1] + tip[2] * PZ];
      if (a.armed) {
        a.trail.push({ x: tipD[0], y: tipD[1], t: g.at });
        if (!a.hit && (tip[0] - pivotD()[0]) * -a.sg > 0) contact(a, [pivotD()[0], tipD[1]]);
      }
      // the stretches in front of your fighter go on the front layer
      const front = []; let f0 = null;
      P.forEach((q, k) => { const t = k / (n - 1); if (q[2] > 3 && f0 === null) f0 = t; if ((q[2] <= 3 || k === n - 1) && f0 !== null) { front.push([Math.max(0, f0 - 0.04), t]); f0 = null; } });
      return { pts, front };
    };
    g.override[a.i] = a.fn;
  }
  // the slash arc behind a sweeping tip: a crescent, thick and bright at the tip, thinning and fading behind it
  s.pxTop.add({ dur: 60000, draw(gg, k, t, act) {
    if (done) { act.t = act.dur; return; }
    for (const a of arms) {
      const pts = a.trail = a.trail.filter((q) => g.at - q.t < TRAIL);
      if (pts.length < 3) continue;
      for (const [wd, col, al] of [[10, "#f59a90", 0.5], [4, "#fff3ee", 0.95]]) {
        const L = [], R = [];
        pts.forEach((q, n) => {
          const p2 = pts[Math.min(pts.length - 1, n + 1)], p1 = pts[Math.max(0, n - 1)], dx = p2.x - p1.x, dy = p2.y - p1.y, l = Math.hypot(dx, dy) || 1;
          const f = 1 - (g.at - q.t) / TRAIL, hw = wd * f * f * 0.5 + 0.3;
          L.push([q.x - (dy / l) * hw, q.y + (dx / l) * hw]); R.push([q.x + (dy / l) * hw, q.y - (dx / l) * hw]);
        });
        gg.globalAlpha = al; gg.fillStyle = col; gg.beginPath();
        [...L, ...R.reverse()].forEach(([x, y], n) => (n ? gg.lineTo(x, y) : gg.moveTo(x, y)));
        gg.closePath(); gg.fill();
      }
      gg.globalAlpha = 1;
    }
  } });

  // A hit: shoved the way the lash was going, a freeze, sparks, a flash; the last one throws them into the air.
  function contact(w, at) {
    w.hit = true;
    const o = w.o, p = o.power, dir = -w.sg, c = { x: at[0], y: at[1] };   // dir: which way the tip was going (+1 = to the right)
    F.vx += dir * 520 * p; F.vr += dir * 4.5 * p; F.sx = 1 - 0.22 * p;   // shoved along, twisted, squeezed as the arm wraps past them
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

  // One sweep: the arm bends over at height h, its tip cocked back behind its own side, then swings round the front of your
  // fighter and through to the other side; then it rears up again. Resolves when it has gone past them.
  const sweep = async (a, o) => {
    a.o = o; a.hit = false;
    const a0 = a.sg < 0 ? Math.PI + 0.45 : -0.45, a1 = a.sg < 0 ? -0.5 : Math.PI + 0.5;   // from behind its side, round the front, past
    tw(a.st, { h: o.h, flat: 1, curl: 0.5 }, o.prep, "out");
    await tw(a.st, { ang: a0 + a.sg * 0.3 }, o.prep, "out");
    if (o.hold) await fx.wait(o.hold);
    a.armed = true;
    sound.sfx(o.last ? "swoosh" : "whoosh", { size: 0.6 + 0.3 * o.power });
    tw(a.st, { curl: 1, wav: 1 }, o.strike * 0.5, "out");
    await tw(a.st, { ang: a1 }, o.strike, "in");
    // the follow-through, then it rears up again
    (async () => {
      await tw(a.st, { ang: a1 - a.sg * 0.45, curl: 0.5, wav: 0.4 }, 240, "out");
      a.armed = false;
      tw(a.st, { flat: 0, curl: 0, wav: 0, h: -10 }, 420, "io");
    })();
  };

  try {
    // 1. the arms tense, rear up and dive into the ground in front of him, one after another
    fx.darken(0.2, 400);
    const Mx = g.mouthCells()[0] * CELL;
    fx.focus(1.04, { x: (P0[0] + Mx) / 2, y: P0[1] - 30 }, 500);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 1.1 }, 300, "out");
    await Promise.all(arms.map((a) => fx.wait(a.j * 110).then(async () => {
      sound.sfx("whoosh", { size: 0.5 });
      await tw(a.st, { go: 1 }, 420, "in");
      const x = g.mouthCells()[0] * CELL - a.dive;
      sound.sfx("squelch"); sound.sfx("debris", { size: 0.5 });
      fx.shake(8); fx.dust(x, 7, 1.1); fx.ring({ x, y: G }, { color: "#f59a90", size: 60, flat: 0.25, ms: 380, width: 3 });
    })));
    // 2. they tunnel across: the ground heaves along their way
    sound.sfx("rumble", { size: 0.9 });
    fx.focus(1.05, { x: P0[0] + 30, y: P0[1] - 20 }, 700);
    const tunnel = Promise.all(arms.map((a) => tw(a.st, { run: 1 }, 640 + a.j * 60, "io")));
    for (let k = 0; k < 9; k++) fx.wait(k * 75).then(() => { for (const a of arms) { const u = smooth(clamp((k * 75) / (640 + a.j * 60))), x = lerp(Mx - a.dive, P0[0] + a.up, u); fx.dust(x, 2, 0.7); } fx.shake(3 + k * 0.5); });
    await tunnel;
    // 3. they burst up round your fighter and rear like cobras
    sound.sfx("slamImpact", { size: 0.7 }); sound.sfx("debris"); sound.sfx("hiss");
    fx.shake(16); fx.flash(0.12, "#ffd6c8");
    for (const a of arms) {
      const x = P0[0] + a.up;
      fx.dust(x, 8, 1.3); fx.debris({ x, y: floorY - 4 }, 5, { power: 1 });
      fx.ring({ x, y: floorY }, { color: "#ffd6c8", size: 70, flat: 0.25, ms: 360, width: 4 });
      tw(a.st, { rise: 1 }, 260 + a.j * 40, "back");
    }
    s.flinch({ crit: false });
    await fx.wait(520);
    // 4. the sweeps: chest left to right, legs right to left, head left to right and faster, chest right to left...
    await sweep(arms[0], { h: -6, prep: 260, hold: 60, strike: 220, power: 0.8 });
    await fx.wait(40);
    await sweep(arms[1], { h: 18, prep: 220, strike: 200, power: 0.7 });
    await fx.wait(30);
    await sweep(arms[2], { h: -30, prep: 200, strike: 170, power: 0.85 });
    await fx.wait(30);
    await sweep(arms[3], { h: -4, prep: 200, strike: 180, power: 0.75 });
    // ...and the last, wide and low, a beat before it comes: it sweeps them off their feet
    fx.focus(1.08, { x: P0[0], y: P0[1] - 10 }, 300);
    arms[2].len = 168;
    await sweep(arms[2], { h: 22, prep: 360, hold: 160, strike: 230, power: 1.15, last: true });
    await fx.wait(900);
    // 5. back into the ground, home under the stage, and up out of the ground by him
    sound.sfx("squelch");
    for (const a of arms) { tw(a.st, { flat: 0, curl: 0 }, 200, "io"); fx.dust(P0[0] + a.up, 4, 0.8); }
    await Promise.all(arms.map((a) => tw(a.st, { rise: -0.3 }, 300, "in")));
    await Promise.all(arms.map((a) => tw(a.st, { run: 0 }, 420, "io")));
    sound.sfx("whoosh", { size: 0.5 });
    for (const a of arms) fx.dust(Mx - a.dive, 4, 0.8);
    await Promise.all(arms.map((a) => tw(a.st, { go: 0 }, 480, "io")));
    fx.focus(1, null, 500); fx.darken(0, 500);
    await fx.wait(200);
  } finally {
    done = true;
    for (const a of arms) { if (g.override[a.i] === a.fn) delete g.override[a.i]; delete g.clipOv[a.i]; }
    g.hooks.delete(hook); g.draws.delete(place);
    el.style.transformOrigin = origin;
    fx.place(el, B.home);
    fx.floorFrac = fl;
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  }
}
