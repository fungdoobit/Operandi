// TENTACLE STORM, the Abyssal Maw's flurry. Fourth pass (Isaac 2026-10-29), his design:
//   "the same 4 tentacles stab into the ground (smoother, no sharp angles), drill underground towards the opponent, come out
//    like Point Stab, which stabs the opponent up into the air; one of the other tentacles grabs them in the air while the
//    original four come back; then all the tentacles except the one grabbing become a point stab (but bigger) and stab the
//    opponent; then it lets go."
// (Earlier passes, all dropped: an X clap, top-down smacks, a rolling bullwhip loop, and sideways sweeps from arms that came
// up round the fighter.)
//
//   1. Four arms (3, 5, 4, 6) rear up and plunge into the ground in front of him, each in one smooth arch.
//   2. They drill under the stage towards your fighter (dust and rumbles along the ground), and the ground trembles under them.
//   3. They burst up right under your fighter already twisted together into a spear (Point Stab's braid, standing up), and it
//      launches them into the air.
//   4. Arm 1 shoots out, catches them at the top and coils round them, holding them up there; the four sink back into the
//      ground and tunnel home.
//   5. Every other arm (0, 2, 3, 4, 5, 6, 7) twists into one bigger spear over the cat, draws back, and drives it into them
//      where they hang (the damage lands here).
//   6. The big spear bursts open like a flower, arm 1 uncoils, and they drop to the ground.
//
// Every arm here is one continuous, evenly smooth curve with plenty of points (Isaac: no sharp angles): for the four, out of his
// mouth in an arch, into the ground, under the stage (hidden: clipOv) and up through the spear. The spear arms wind round a
// centre line ("spine") at their own angles, twisting along it and spinning; the stretches in front of the spine go on the
// Maw's front layer, so they really wind round each other (and round your fighter where they pass them).
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const FOUR = [3, 5, 4, 6], GRABBER = 1, BIG = [0, 2, 3, 4, 5, 6, 7];
const N = 64;                                    // points along a spear arm
const NG = 110;                                  // points along the grabbing arm
const PH0 = 0.15 * Math.PI, PH1 = 4.2 * Math.PI;  // its coil: from their right side, twice round
const SPEAR_H = 66;                              // cells the eruption spear stands out of the ground
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

function resample(poly, n) {   // a curve as n evenly spaced points (keeps a third value, z, if there is one)
  const d = [0]; for (let i = 1; i < poly.length; i++) d.push(d[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = d[d.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / (n - 1)) * L; while (j < poly.length - 2 && d[j + 1] < s) j++;
    const u = clamp((s - d[j]) / ((d[j + 1] - d[j]) || 1)), a = poly[j], b = poly[j + 1];
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2] ?? -1, b[2] ?? -1, u)]);
  }
  return out;
}
// the stretches of an arm with z > 0 (in front), as [t0, t1] ranges along it
function fronts(z, extra = () => false) {
  const out = []; let a0 = null, n = z.length;
  z.forEach((zz, k) => { const t = k / (n - 1), f = zz > 0 || extra(t); if (f && a0 === null) a0 = t; if ((!f || k === n - 1) && a0 !== null) { out.push([Math.max(0, a0 - 0.5 / n), t]); a0 = null; } });
  return out;
}

export async function storm(s) {
  const { fx, g } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at, late = s.skin === "pyro";   // (PYRO's hurt look is a smaller flame: he flinches once let go)
  const G = g.floorC - 1;   // the ground line, in cells
  // ---- your fighter: on the ground (a spring back to their spot), in the air (falling), or held (following H) ----
  const F = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, sx: 1, sy: 1, mode: "ground" };
  const H = { x: 0, y: 0, r: 0, trem: 0 };
  let landed = null;   // resolves when they come down
  const carried = () => [Math.round(F.x / CELL) * CELL, Math.round((F.y + (1 - F.sy) * (B.feet - B.pivot[1])) / CELL) * CELL];
  const toWorld = (q) => {
    const D = carried(), c = Math.cos(F.r), sn = Math.sin(F.r), X = (q[0] - B.pivot[0]) * F.sx, Y = (q[1] - B.pivot[1]) * F.sy;
    return [(B.box.x + B.home.x + B.pivot[0] + D[0] + X * c - Y * sn) / CELL, (B.box.y + B.home.y + B.pivot[1] + D[1] + X * sn + Y * c) / CELL];
  };
  const chest = () => { const D = carried(); return [B.box.x + B.home.x + B.pivot[0] + D[0], B.box.y + B.home.y + B.pivot[1] + D[1]]; };
  const P0 = chest(), floorY = B.box.y + B.home.y + B.feet;
  const fl = fx.floorFrac; fx.floorFrac = floorY / fx.h;   // dust starts on the ground
  const Ex = P0[0] / CELL;                                  // where the spear comes up: right under them

  // ---- the eruption spear (the four arms) ----
  // per arm: go (from its idle pose into the dive), run (how far it has tunnelled: 0 at its dive spot, 1 under your fighter)
  const four = FOUR.map((i, j) => ({ i, j, dive: [54, 80, 40, 68][j], go: 0, run: 0 }));
  const SP = { up: 0, R: 9, turns: 2.2, spin: 0, rate: 2 };   // up: how far the spear stands out of the ground (below 0: in it)
  const fourPath = (a) => {
    const M = g.mouthCells(), tt = (g.at - t0) / 1000, D = M[0] - a.dive, E = lerp(D - 6, Ex, ss(a.run)), side = a.j % 2 ? 1 : -1;
    const out = [];
    // out of his mouth in one smooth arch and into the ground (a lazy S along it, rippling)
    const A = 22 + 0.32 * a.dive + 5 * a.j;
    for (let k = 0; k < 22; k++) {
      const u = (k / 21) * 1.04, q = Math.min(u, 1), sw = (Math.sin(Math.PI * 2 * q + a.j) * 1.8 + Math.sin(q * 7 - tt * 3 + a.j) * 0.7) * Math.sin(Math.PI * q);
      out.push([lerp(M[0], D, u) + sw, lerp(M[1], G, u) - A * Math.sin(Math.PI * q ** 0.8), -1]);
    }
    // under the stage (hidden), across to the spear
    out.push([lerp(D, E, 0.15), G + 16, -1], [lerp(D, E, 0.5), G + 20, -1], [lerp(D, E, 0.85) + side * 4, G + 18, -1], [E + side * 6, G + 12, -1]);
    // up through the ground at E, twisted round the spear's spine with the other three
    // (until it breaks the surface, all of it stays below the ground, hidden)
    const Hs = SPEAR_H * Math.max(0, SP.up) + 10 * clamp(SP.up * 6), grow = clamp(SP.up * 3);
    for (let k = 0; k < N - 26; k++) {
      const u = k / (N - 27), y = G + 8 - Hs * u, x = E + Math.sin(u * 2.4 + tt * 2) * 1.2 * u;
      const th = (a.j * Math.PI) / 2 + SP.turns * 2 * Math.PI * u + SP.spin, r = (SP.R * (1 - u) ** 0.8 + 1.5 * (1 - u)) * grow;
      out.push([x + r * Math.cos(th), y + r * Math.sin(th) * 0.22, Math.sin(th)]);
    }
    return out;
  };

  // ---- the big spear (every arm but the grabber) ----
  // Point Stab's spear, bigger: cocked high over the cat, then straightened at T (your fighter where they hang)
  const BS = { pull: 0, stab: 0, ext: 0, R: 16, turns: 0.6, spin: 0, rate: 1.5, open: 0, front: 0, shake: 0 };
  const W = {};  for (const i of BIG) W[i] = 0;   // how far each arm has joined it
  let T = [0, 0];
  const NS = 6;
  const bigSpine = () => {
    const M = g.mouthCells(), p = BS.pull, tt = (g.at - t0) / 1000, tr = BS.shake * Math.sin(tt * 70) * 1;
    const C = [[0, 0], [-18, -14 - 3 * p], [-34 + 5 * p, -44 - 8 * p], [-44 + 8 * p, -80 - 10 * p], [-60 + 12 * p, -110 - 8 * p], [-90 + 20 * p, -104]]
      .map(([x, y], j) => [M[0] + x + tr * j * 0.3 + Math.sin(tt * 2 + j) * 0.8 * (1 - BS.stab), M[1] + y + Math.cos(tt * 1.7 + j) * 0.8 * (1 - BS.stab)]);
    const dx = T[0] - M[0], dy = T[1] - M[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, Lx = len + BS.ext;
    const S = Array.from({ length: NS }, (_, j) => { const f = j / (NS - 1); return [M[0] + ux * Lx * f, M[1] + uy * Lx * f - 8 * Math.sin(Math.PI * f) * (1 - f)]; });
    return C.map((c, j) => { const k = ss(BS.stab * 1.6 - 0.6 * (1 - j / (NS - 1))); return [lerp(c[0], S[j][0], k), lerp(c[1], S[j][1], k)]; });   // the point leads
  };
  const bigStrand = (j, S) => {
    const pts = [], tt = (g.at - t0) / 1000;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1), p = spl(S, u), q = spl(S, Math.min(1, u + 0.01)), p0 = spl(S, Math.max(0, u - 0.01));
      let tx = q[0] - p0[0], ty = q[1] - p0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const th = (j * 2 * Math.PI) / BIG.length + BS.turns * 2 * Math.PI * u + BS.spin;
      const r = BS.R * Math.min(1, u / 0.22) * (1 - u) ** 0.6 + BS.open * (6 + 26 * Math.sin(Math.PI * u)) * (1 + 0.3 * Math.sin(j * 2.1));
      const wob = BS.open * Math.sin(tt * 9 + u * 7 + j) * 2;
      pts.push([p[0] - ty * (r * Math.cos(th) + wob), p[1] + tx * (r * Math.cos(th) + wob), Math.sin(th)]);
    }
    return pts;
  };

  // ---- the arms' overrides: the four (dive, tunnel, spear) and the big spear, in one ----
  const smoothBase = (raw) => Array.from({ length: N }, (_, k) => spl(raw, k / (N - 1)));
  for (const i of new Set([...FOUR, ...BIG])) {
    const a = four.find((q) => q.i === i), jb = BIG.indexOf(i);
    if (a) g.clipOv[i] = G;   // what goes under the stage is hidden
    g.override[i] = (raw) => {
      const wb = jb >= 0 ? W[i] : 0;
      if ((!a || a.go <= 0) && wb <= 0) return raw;
      let pts = smoothBase(raw).map((p) => [p[0], p[1], -1]);
      if (a && a.go > 0) {   // the dive: the tip stabs into the ground first and the rest follows it in (coming out: the tip last)
        const P = fourPath(a);
        pts = pts.map((b, k) => { const f = k / (N - 1), w = ss(a.go * 1.6 - 0.6 * (1 - f)); return [lerp(b[0], P[k][0], w), lerp(b[1], P[k][1], w), w > 0.5 ? P[k][2] : -1]; });
      }
      if (wb > 0) {
        const S = bigStrand(jb, bigSpine());
        pts = pts.map((b, k) => [lerp(b[0], S[k][0], wb), lerp(b[1], S[k][1], wb), wb > 0.25 ? S[k][2] : b[2]]);
      }
      const front = fronts(pts.map((p) => p[2]), (t) => wb > 0.5 && BS.front > 0.5 && t > 0.8);
      return { pts: pts.map((p) => [p[0], p[1]]), front };
    };
  }

  // ---- the grabbing arm: from his mouth (a sagging curve) to its coil round them ----
  const GS = { reach: 0, wrap: 0, loose: 1.3, ret: 0, wave: 0, burst: 0 };
  g.override[GRABBER] = (base) => {
    if (GS.reach <= 0) return base;
    const Mc = g.mouthCells(), tt = (g.at - t0) / 1000;
    const coil = [], upto = lerp(PH0, PH1, GS.wrap), n = Math.max(2, Math.ceil(100 * GS.wrap));
    for (let m = 0; m <= n; m++) {
      const phi = lerp(PH0, upto, m / n), k = (phi - PH0) / (PH1 - PH0), [x, y, z] = B.coil(phi, k, GS.loose + GS.burst * 1.2), w = toWorld([x, y]);
      coil.push([w[0], w[1] - GS.burst * 6 * Math.sin(phi * 1.3), z]);
    }
    const E = coil[0], len = Math.hypot(E[0] - Mc[0], E[1] - Mc[1]), line = [];
    for (let m = 0; m <= 40; m++) {
      const f = m / 40, sag = Math.sin(Math.PI * f) * Math.min(30, len * 0.18), wv = GS.wave * Math.sin(f * 12 - tt * 24) * 3 * Math.sin(Math.PI * f);
      line.push([lerp(Mc[0], E[0], f), lerp(Mc[1], E[1], f) - sag + wv, -1]);   // (it bows up: it's reaching up to them)
    }
    const pts = resample(line.concat(coil.slice(1)), NG);
    pts.forEach((p, k) => {   // reaching out from where it was (root first), and going home again (ret)
      const f = k / (NG - 1), b = spl(base, f), r0 = ss(GS.reach * 1.6 - 0.6 * f), r1 = ss(GS.ret * 1.6 - 0.6 * (1 - f)), e = r0 * (1 - r1);
      p[0] = lerp(b[0], p[0], e); p[1] = lerp(b[1], p[1], e); p[2] = e > 0.5 ? p[2] : -1;
    });
    return { pts: pts.map((p) => [p[0], p[1]]), front: fronts(pts.map((p) => p[2])) };
  };

  // ---- your fighter, every frame and just before every drawing ----
  const origin = el.style.transformOrigin;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  let onLand = null;
  const hook = (dt) => {
    const k = Math.min(0.05, dt / 1000), tt = (g.at - t0) / 1000;
    SP.spin += SP.rate * k; BS.spin += BS.rate * k;
    if (F.mode === "air") {
      F.vy += 2400 * k; F.x += F.vx * k; F.y += F.vy * k; F.r += F.vr * k;
      if (F.y >= 0 && F.vy > 0) {   // they come down
        F.y = 0; F.vy = 0; F.vx = 0; F.mode = "ground"; F.sx = 1.2; F.sy = 0.8;
        fx.dust(chest()[0], 10, 1.2); fx.shake(12); sound.sfx("slamImpact", { size: 0.6 });
        onLand?.();
      }
    } else if (F.mode === "held") {
      const e = Math.min(1, k * 14);
      F.x += (H.x + Math.sin(tt * 41) * H.trem - F.x) * e; F.y += (H.y + Math.cos(tt * 37) * H.trem * 0.6 - F.y) * e; F.r += (H.r - F.r) * Math.min(1, k * 10);
    } else {
      const w = 12, z = 0.6;
      F.vx += (-w * w * F.x - 2 * z * w * F.vx) * k; F.vr += (-w * w * F.r - 2 * z * w * F.vr) * k;
      F.x += F.vx * k; F.r += F.vr * k; F.y += (0 - F.y) * Math.min(1, k * 10);
    }
    F.sx += (1 - F.sx) * Math.min(1, k * 8); F.sy += (1 - F.sy) * Math.min(1, k * 8);
  };
  const place = () => {
    const D = carried(), x = B.home.x + D[0], y = B.home.y + D[1];
    el.style.transform = `translate(${x}px, ${y}px) rotate(${F.r.toFixed(3)}rad) scale(${F.sx.toFixed(3)}, ${F.sy.toFixed(3)})`;
    el._pos = { x, y, r: (F.r * 180) / Math.PI };
  };
  g.hooks.add(hook); g.draws.add(place);
  const tw = (obj, to, ms, ease = "io") => g.to(to, ms, ease, obj);
  const Mx = () => g.mouthCells()[0] * CELL;

  try {
    // 1. four arms rear up and plunge into the ground in front of him, one after another
    fx.darken(0.2, 400);
    fx.focus(1.04, { x: (P0[0] + Mx()) / 2, y: P0[1] - 30 }, 500);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 1.0 }, 300, "out");
    await Promise.all(four.map((a) => fx.wait(a.j * 120).then(async () => {
      sound.sfx("whoosh", { size: 0.5 });
      await tw(a, { go: 1 }, 520, "io");
      const x = Mx() - a.dive * CELL;
      sound.sfx("squelch"); sound.sfx("debris", { size: 0.5 });
      fx.shake(8); fx.dust(x, 7, 1.1); fx.ring({ x, y: G * CELL }, { color: "#f59a90", size: 60, flat: 0.25, ms: 380, width: 3 });
    })));
    // 2. they drill under the stage towards your fighter: the ground heaves along their way
    sound.sfx("rumble", { size: 1 });
    fx.focus(1.06, { x: P0[0] + 20, y: P0[1] - 30 }, 900);
    const drill = Promise.all(four.map((a) => tw(a, { run: 1 }, 820 + a.j * 50, "io")));
    for (let k = 0; k < 10; k++) fx.wait(k * 85).then(() => {
      for (const a of four) { const u = ss(clamp((k * 85) / (820 + a.j * 50))), x = lerp(Mx() - a.dive * CELL, P0[0], u); fx.dust(x, 2, 0.7); }
      fx.shake(3 + k * 0.5);
    });
    await drill;
    // ...the ground trembles under them
    sound.sfx("rumble", { size: 0.7 });
    for (let k = 0; k < 4; k++) fx.wait(k * 80).then(() => { fx.dust(P0[0] + (k % 2 ? 14 : -14), 4, 0.8); fx.shake(5 + k * 2); F.vr += (k % 2 ? 1 : -1) * 1.5; });
    await fx.wait(380);
    // 3. the spear bursts up under them and launches them into the air
    sound.sfx("swoosh"); sound.sfx("slamImpact", { size: 0.9 }); sound.sfx("debris");
    SP.rate = 14;
    tw(SP, { up: 1 }, 180, "out");
    await fx.wait(50);
    const at = { x: P0[0], y: P0[1] + 20 };
    impactFrame(fx, { ms: 60, frames: 2 });
    fx.hitstop(120); fx.shake(26); fx.punch(0.05, at); fx.flash(0.3, "#ffd6c8");
    fx.ring({ x: P0[0], y: floorY }, { color: "#ffd6c8", size: 120, flat: 0.28, ms: 420, width: 6 });
    fx.sparks(at, 20, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.5, dir: 0 });
    fx.debris({ x: P0[0], y: floorY - 6 }, 10, { power: 1.3 }); fx.dust(P0[0], 12, 1.4);
    sound.sfx("hit", { size: 0.9 });
    F.mode = "air"; F.vy = -900; F.vx = 50; F.vr = -5;
    if (!late) s.flinch({ crit: false });
    fx.wait(150).then(() => fx.slowmo(0.45, 420));
    fx.focus(1.04, { x: P0[0] + 40, y: P0[1] - 110 }, 500);
    // 4. arm 1 shoots out and catches them at the top
    await fx.wait(170);
    sound.sfx("whoosh"); GS.wave = 1;
    await tw(GS, { reach: 1 }, 260, "in");
    sound.sfx("squelch"); sound.sfx("hit", { size: 0.6 }); fx.shake(8);
    Object.assign(H, { x: F.x, y: F.y, r: F.r });   // held where they are...
    F.mode = "held";
    tw(GS, { wave: 0 }, 400, "out");
    tw(GS, { wrap: 1, loose: 1.06 }, 420, "out");
    tw(H, { x: 90, y: -118, r: -0.22 }, 620, "io");  // ...and swung up to where the big spear will meet them
    // ...while the four sink back into the ground and tunnel home
    SP.rate = 3;
    (async () => {
      sound.sfx("squelch");
      await tw(SP, { up: -0.25 }, 420, "in");
      fx.dust(P0[0], 6, 0.9);
      await Promise.all(four.map((a) => tw(a, { run: 0 }, 600 + a.j * 40, "io")));
      for (const a of four) fx.dust(Mx() - a.dive * CELL, 3, 0.7);
      await Promise.all(four.map((a) => tw(a, { go: 0 }, 700, "io")));
    })();
    await fx.wait(650);
    // 5. every other arm twists together into one bigger spear over the cat...
    fx.focus(1.03, { x: (chest()[0] + Mx()) / 2, y: chest()[1] - 10 }, 600);
    sound.sfx("growl", { size: 1.1 });
    T = chest().map((v) => v / CELL);
    BIG.forEach((i, j) => fx.wait(250 + j * 70).then(() => tw(W, { [i]: 1 }, 620, "io")));   // the four join as they come home
    tw(BS, { R: 15, turns: 2 }, 900, "out");
    tw(H, { trem: 1.2 }, 600, "io");
    await fx.wait(1300);
    // ...draws back, winding tighter and spinning faster, trembling; the point glints
    sound.sfx("charge", { ms: 700 });
    tw(BS, { rate: 16, R: 14, turns: 2.4 }, 650, "in");
    await tw(BS, { pull: 1 }, 560, "out");
    const tip = () => { const S = bigSpine(), p = S[NS - 1]; return { x: p[0] * CELL, y: p[1] * CELL }; };
    for (let i = 0; i < 2; i++) fx.wait(i * 200).then(() => fx.ring(tip(), { color: "#ffd6c8", size: 44 - i * 12, ms: 280, width: 3 }));
    tw(BS, { shake: 1 }, 120, "out");
    T = chest().map((v) => v / CELL);
    await fx.wait(420);
    // ...and drives it into them
    sound.sfx("swoosh");
    BS.shake = 0; BS.front = 1;
    T = chest().map((v) => v / CELL);
    tw(BS, { turns: 4.6 }, 150, "in");
    await tw(BS, { stab: 1 }, 150, "in");
    const c = { x: chest()[0] + 6, y: chest()[1] };
    impactFrame(fx, { ms: 70, frames: 2 });
    fx.hitstop(190); fx.shake(34); fx.punch(0.08, c); fx.flash(0.4, "#ffd6c8");
    sound.sfx("slamImpact", { size: 1.3 }); sound.sfx("hit", { size: 1.1 });
    fx.ring(c, { color: "#ffd6c8", size: 170, ms: 420, width: 7 });
    fx.ring(c, { color: "#f59a90", size: 110, flat: 0.4, ms: 360, width: 5 });
    fx.sparks(c, 30, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.8, dir: -1 });
    s.hit({ crit: true }, { flinch: !late });   // the damage lands here
    F.sx = 0.84; F.sy = 1.1;
    H.x -= 22; H.r -= 0.25; tw(H, { x: 90, r: -0.22 }, 420, "back");   // jolted back in the coil
    tw(BS, { ext: 14 }, 200, "out");                                       // the point follows in
    for (let i = 0; i < 6; i++) fx.wait(100 + i * 70).then(() => { const p = { x: chest()[0] + 6, y: chest()[1] }; fx.sparks(p, 7, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.2, dir: -1 }); sound.sfx("debris"); });
    await fx.wait(560);
    // 6. it bursts open like a flower, arm 1 uncoils, and they drop
    sound.sfx("squelch");
    BS.front = 0;
    tw(BS, { rate: -4 }, 300, "out");
    tw(BS, { open: 1, ext: 0, turns: 1.2 }, 300, "out");
    BIG.forEach((i, j) => fx.wait(200 + j * 50).then(() => tw(W, { [i]: 0 }, 900, "io")));
    await fx.wait(160);
    landed = new Promise((ok) => { onLand = ok; });
    tw(GS, { burst: 1 }, 220, "out");
    H.trem = 0;
    F.mode = "air"; F.vy = -60; F.vx = -30; F.vr = 1.5;
    tw(GS, { ret: 1 }, 900, "io");
    if (late) s.flinch({ crit: true });
    fx.focus(1, null, 600); fx.darken(0, 600);
    await Promise.race([landed, fx.wait(1500)]);
    await fx.wait(900);
  } finally {
    for (const i of new Set([...FOUR, ...BIG, GRABBER])) { delete g.override[i]; delete g.clipOv[i]; }
    g.hooks.delete(hook); g.draws.delete(place);
    el.style.transformOrigin = origin;
    fx.place(el, B.home);
    fx.floorFrac = fl;
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  }
}
