// POINT STAB, the Abyssal Maw's piercing attack (Isaac 2026-10-24: "four tentacles group into a point at the end and stab").
//
// Four of his own arms (3, 4, 5, 6) rise up over the cat and TWIST round each other into one spear, thick in the middle and
// tapering to a point, held high and curled like a scorpion's tail, aimed at your fighter. It draws back, the twist winding
// tighter and spinning faster, the point glinting... then it THRUSTS straight across the stage into them,
// keeps spinning like a drill for a moment (sparks spraying), and the four arms burst apart like a flower and slide home.
//
// How the braid works: the spear is one centre line (its "spine"). Each arm follows the spine at a distance that is 0 at the
// mouth, widest a quarter of the way along and 0 again at the point, going round it at its own angle (a quarter turn apart)
// that twists along the spine and spins with time. Seen from the side, an arm is in front of the spine for half of each turn:
// those stretches go on the Maw's front layer, the others stay behind, so the four arms really wind round each other.
// The thrust: the spine morphs from the curled pose to a straight line at your fighter, the point leading, the base last.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const ARMS4 = [3, 5, 4, 6];
const N = 64;          // points along each arm
const NS = 6;          // spine control points
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (t) => t * t * (3 - 2 * t);

export async function stab(s) {
  const { fx, g } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at;
  // your fighter on a spring: knocked back, then back to where they stand
  const F = { x: 0, vx: 0, r: 0, vr: 0, sx: 1, sy: 1 };
  const chest = () => [B.box.x + B.home.x + B.pivot[0] + F.x, B.box.y + B.home.y + B.pivot[1]];
  const T = chest().map((v) => v / CELL);

  // what the scene animates
  const st = { pull: 0, stab: 0, ext: 0, R: 14, turns: 0.6, spin: 0, rate: 1.5, open: 0, front: 0, shake: 0 };
  const W = [0, 0, 0, 0];   // how far each arm has joined the spear

  // ---- the spine: curled high over the cat (the cocked pose, tighter as it draws back) -> straight at your fighter ----
  const spine = () => {
    const M = g.mouthCells(), p = st.pull, tt = (g.at - t0) / 1000;
    const tr = st.shake * Math.sin(tt * 70) * 0.8;   // the tremble while it holds
    // (it rises from the MIDDLE of his arms, out in front of his mouth, not off to the side over the cat: Isaac 2026-10-25)
    const C = [[0, 0], [-16, -12 - 2 * p], [-30 + 4 * p, -36 - 6 * p], [-38 + 6 * p, -66 - 8 * p], [-52 + 10 * p, -92 - 6 * p], [-76 + 16 * p, -88]]
      .map(([x, y], j) => [M[0] + x + tr * j * 0.3 + Math.sin(tt * 2 + j) * 0.8 * (1 - st.stab), M[1] + y + Math.cos(tt * 1.7 + j) * 0.8 * (1 - st.stab)]);
    const dx = T[0] - M[0], dy = T[1] - M[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, Lx = len + st.ext;
    const S = Array.from({ length: NS }, (_, j) => { const f = j / (NS - 1); return [M[0] + ux * Lx * f, M[1] + uy * Lx * f - 6 * Math.sin(Math.PI * f) * (1 - f)]; });
    // the point leads, the base follows
    return C.map((c, j) => { const k = ss(clamp(st.stab * 1.6 - 0.6 * (1 - j / (NS - 1)))); return [lerp(c[0], S[j][0], k), lerp(c[1], S[j][1], k)]; });
  };
  // the spear's thickness along it: 0 at the mouth, widest a quarter of the way, 0 at the point
  const radius = (u) => st.R * Math.min(1, u / 0.22) * (1 - u) ** 0.6;

  // one arm of the spear: the spine plus its turn round it (z: towards the camera)
  const armOf = (j, S) => {
    const pts = [], z = [], tt = (g.at - t0) / 1000;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1), p = spl(S, u), q = spl(S, Math.min(1, u + 0.01)), p0 = spl(S, Math.max(0, u - 0.01));
      let tx = q[0] - p0[0], ty = q[1] - p0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const th = (j * Math.PI) / 2 + st.turns * 2 * Math.PI * u + st.spin;
      const r = radius(u) + st.open * (6 + 22 * Math.sin(Math.PI * u)) * (1 + 0.3 * Math.sin(j * 2.1));   // open: the flower
      const wob = st.open * Math.sin(tt * 9 + u * 7 + j) * 2;
      pts.push([p[0] - ty * (r * Math.cos(th) + wob), p[1] + tx * (r * Math.cos(th) + wob)]);
      z.push(Math.sin(th));
    }
    return { pts, z };
  };

  ARMS4.forEach((i, j) => {
    g.override[i] = (base) => {
      const A = armOf(j, spine()), wj = W[j];
      const pts = A.pts.map((q, k) => { const b = spl(base, k / (N - 1)); return [lerp(b[0], q[0], wj), lerp(b[1], q[1], wj)]; });
      if (wj < 0.25) return pts;
      // in front of the spine -> the front layer; near the point, all of it while it is in your fighter
      const front = []; let a0 = null;
      A.z.forEach((zz, k) => {
        const t = k / (N - 1), f = zz > 0 || (st.front > 0.5 && t > 0.8);
        if (f && a0 === null) a0 = t;
        if ((!f || k === N - 1) && a0 !== null) { front.push([a0, t]); a0 = null; }
      });
      return { pts, front };
    };
  });


  // ---- your fighter, placed just before every drawing ----
  const origin = el.style.transformOrigin;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  const hook = (dt) => {
    const k = Math.min(0.05, dt / 1000), w = 12, z = 0.55;
    st.spin += st.rate * k;
    F.vx += (-w * w * F.x - 2 * z * w * F.vx) * k; F.vr += (-w * w * F.r - 2 * z * w * F.vr) * k;
    F.x += F.vx * k; F.r += F.vr * k;
    F.sx += (1 - F.sx) * Math.min(1, k * 8); F.sy += (1 - F.sy) * Math.min(1, k * 8);
  };
  const place = () => {
    const x = B.home.x + Math.round(F.x / CELL) * CELL, y = B.home.y + Math.round(((1 - F.sy) * (B.feet - B.pivot[1])) / CELL) * CELL;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${F.r.toFixed(3)}rad) scale(${F.sx.toFixed(3)}, ${F.sy.toFixed(3)})`;
    el._pos = { x, y, r: (F.r * 180) / Math.PI };
  };
  g.hooks.add(hook); g.draws.add(place);
  const tw = (to, ms, ease = "io", obj = st) => g.to(to, ms, ease, obj);
  const tipAt = () => { const S = spine(), p = S[NS - 1]; return { x: p[0] * CELL, y: p[1] * CELL }; };

  try {
    // 1. four arms rise and twist together into the spear, high over the cat
    fx.darken(0.2, 400);
    fx.focus(1.06, s.P("core"), 600);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 0.8 }, 300, "out");
    ARMS4.forEach((_, j) => fx.wait(j * 90).then(() => g.to({ [j]: 1 }, 520, "out", W)));
    tw({ R: 10, turns: 1.8 }, 820, "out");
    await fx.wait(860);
    // 2. it draws back: the twist winds tighter and spins faster, sparks pour into the point, it trembles
    sound.sfx("charge", { ms: 700 });
    tw({ rate: 14, R: 9, turns: 2.2 }, 650, "in");
    await tw({ pull: 1 }, 520, "out");
    for (let i = 0; i < 2; i++) fx.wait(i * 200).then(() => fx.ring(tipAt(), { color: "#ffd6c8", size: 34 - i * 10, ms: 260, width: 3 }));   // the point glints
    tw({ shake: 1 }, 120, "out");
    fx.focus(1.08, { x: (tipAt().x + chest()[0]) / 2, y: chest()[1] - 20 }, 400);
    await fx.wait(380);
    // 3. THRUST
    sound.sfx("swoosh");
    st.shake = 0;
    st.front = 1;
    tw({ turns: 4.2 }, 130, "in");   // the twist spreads along the longer spear
    await tw({ stab: 1 }, 130, "in");
    // impact: freeze, the negative flash, they're knocked back while the point drills on
    const at = { x: chest()[0] + 6, y: chest()[1] };
    impactFrame(fx, { ms: 60, frames: 2 });
    fx.hitstop(150); fx.shake(28); fx.punch(0.07, at); fx.flash(0.35, "#ffd6c8");
    sound.sfx("slamImpact", { size: 1.1 }); sound.sfx("hit", { size: 1 });
    fx.ring(at, { color: "#ffd6c8", size: 130, ms: 380, width: 6 });
    fx.ring(at, { color: "#f59a90", size: 90, flat: 0.4, ms: 320, width: 4 });
    fx.sparks(at, 24, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.6, dir: -1 });
    fx.dust(chest()[0], 10, 1.2);
    F.vx = -560; F.vr = -3.2; F.sx = 0.84; F.sy = 1.08;
    s.hit({ crit: true });
    tw({ ext: 12 }, 180, "out");   // the point follows them in
    // the drill: it keeps spinning in them, spraying sparks
    for (let i = 0; i < 5; i++) fx.wait(90 + i * 70).then(() => { const c = { x: chest()[0] + 6, y: chest()[1] }; fx.sparks(c, 6, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.1, dir: -1 }); sound.sfx("debris"); });
    await fx.wait(460);
    // 4. the arms burst apart like a flower and slide back into the mass
    sound.sfx("squelch");
    st.front = 0;
    tw({ rate: -4 }, 300, "out");
    await tw({ open: 1, ext: 0, turns: 1.2 }, 260, "out");
    fx.focus(1, null, 500); fx.darken(0, 500);
    ARMS4.forEach((_, j) => fx.wait(j * 60).then(() => g.to({ [j]: 0 }, 460, "io", W)));
    await fx.wait(700);
  } finally {
    ARMS4.forEach((i) => delete g.override[i]);
    g.hooks.delete(hook); g.draws.delete(place);
    el.style.transformOrigin = origin;
    fx.place(el, B.home);
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  }
}
