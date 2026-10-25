// CONSTRICT, the Abyssal Maw's quick-test attack (Isaac 2026-10-24: "like a QTE, a random short test comes on; solve it in
// time and the tentacles let go, if not it deals full damage (crit)"). Built 2026-10-25 with his defaults: pick one of
// three answers, 10 seconds, at most once a fight (app.js decides when; the hit is held back until you answer).
//
//   1. two of his arms shoot out and wrap your fighter in a crossing double coil, then lift them off the ground
//   2. the quick test pops up (quick-test.js). While the clock runs the coils squeeze tighter, your fighter is squashed and
//      shakes harder, the stage darkens, and the coils creak faster and faster
//   3a. right answer: they BURST free: a flash and sparks in their own colour, the coils spring open, the Maw flinches back,
//       and they drop to the ground. No damage.
//   3b. wrong or too slow: the coils CRUSH them (freeze, negative flash, a crit), then let go and drop them.
//
// The coils are Grab and Slam's (bodyOf in maw-grab.js: sized to each fighter's outline, front passes on the front layer).
// The second arm winds the other way round and from the top down, so the two cross over each other.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { THEMES } from "../battle-fx.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const PAIR = [4, 5];
const N = 110;
const PH0 = 0.15 * Math.PI, PH1 = 4.2 * Math.PI;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function resample(poly, n) {
  const d = [0]; for (let i = 1; i < poly.length; i++) d.push(d[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = d[d.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / (n - 1)) * L; while (j < poly.length - 2 && d[j + 1] < s) j++;
    const u = clamp((s - d[j]) / ((d[j + 1] - d[j]) || 1)), a = poly[j], b = poly[j + 1];
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2] ?? -1, b[2] ?? -1, u)]);
  }
  return out;
}

// s: the attack scene (maw-moves.js). ask(): shows the quick test, resolves with { correct, timedOut }. ms: its time limit.
export async function constrict(s, { ms, ask, onFree }) {
  const { fx, g } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at;
  const T = THEMES[s.theme] || THEMES.water;
  // reach / wrap: the arms going out and round; lift: how high they're held; sq: the squeeze (1 at the end of the clock);
  // trem: how hard they shake; burst: the coils springing open; ret: the arms going home
  const st = { reach: 0, wrap: 0, loose: 1.3, lift: 0, sq: 0, trem: 0, burst: 0, ret: 0, sx: 1, sy: 1, r: 0, wave: 0 };
  // how far they're carried, in whole cells so the body and the coils move together pixel for pixel
  const carried = () => {
    const tt = (g.at - t0) / 1000, tr = st.trem * 2.4;
    return [Math.round((Math.sin(tt * 53) * tr) / CELL) * CELL, Math.round((-st.lift + Math.cos(tt * 47) * tr * 0.6 + (1 - st.sy) * (B.feet - B.pivot[1])) / CELL) * CELL];
  };
  const toWorld = (q) => {
    const D = carried(), c = Math.cos(st.r), sn = Math.sin(st.r), X = (q[0] - B.pivot[0]) * st.sx, Y = (q[1] - B.pivot[1]) * st.sy;
    return [(B.box.x + B.home.x + B.pivot[0] + D[0] + X * c - Y * sn) / CELL, (B.box.y + B.home.y + B.pivot[1] + D[1] + X * sn + Y * c) / CELL];
  };

  // ---- the two arms: from the mouth (a sagging curve) to their coil ----
  PAIR.forEach((i, j) => {
    g.override[i] = (base) => {
      if (st.reach <= 0) return base;
      const Mc = g.mouthCells(), tt = (g.at - t0) / 1000;
      const loose = st.loose * (1 - 0.1 * st.sq) + st.burst * 1.3;
      const coil = [], upto = lerp(PH0, PH1, st.wrap), n = Math.max(2, Math.ceil(100 * st.wrap));
      for (let m = 0; m <= n; m++) {
        const phi = lerp(PH0, upto, m / n), k = (phi - PH0) / (PH1 - PH0);
        const [x, y, z] = j ? B.coil(-phi + Math.PI, 1 - k, loose) : B.coil(phi, k, loose);   // the second one: the other way round, top down
        const w = toWorld([x, y]);
        coil.push([w[0], w[1] - st.burst * 6 * Math.sin(phi * 1.3 + j), z]);
      }
      const E = coil[0], len = Math.hypot(E[0] - Mc[0], E[1] - Mc[1]), line = [];
      for (let m = 0; m <= 40; m++) {
        const f = m / 40, sag = Math.sin(Math.PI * f) * Math.min(26, len * 0.16) * (j ? -1 : 0.7), wv = st.wave * Math.sin(f * 12 - tt * 24 + j) * 3 * Math.sin(Math.PI * f);
        line.push([lerp(Mc[0], E[0], f), lerp(Mc[1], E[1], f) + sag + wv, -1]);
      }
      const pts = resample(line.concat(coil.slice(1)), N);
      pts.forEach((p, k) => {   // reaching out from where it was (root first), and going home again (ret)
        const f = k / (N - 1), b = spl(base, f), a = clamp(st.reach * 1.6 - 0.6 * f), r = clamp(st.ret * 1.6 - 0.6 * (1 - f));
        const e = a * a * (3 - 2 * a) * (1 - r * r * (3 - 2 * r));
        p[0] = lerp(b[0], p[0], e); p[1] = lerp(b[1], p[1], e); p[2] = e > 0.5 ? p[2] : -1;
      });
      const front = []; let a0 = null;
      pts.forEach((p, k) => { const t = k / (N - 1); if (p[2] > 0 && a0 === null) a0 = t; if ((p[2] <= 0 || k === N - 1) && a0 !== null) { front.push([a0, t]); a0 = null; } });
      return { pts: pts.map((p) => [p[0], p[1]]), front };
    };
  });

  // ---- your fighter, placed just before every drawing ----
  const origin = el.style.transformOrigin;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  const place = () => {
    const D = carried(), x = B.home.x + D[0], y = B.home.y + D[1];
    el.style.transform = `translate(${x}px, ${y}px) rotate(${st.r.toFixed(3)}rad) scale(${st.sx.toFixed(3)}, ${st.sy.toFixed(3)})`;
    el._pos = { x, y, r: (st.r * 180) / Math.PI };
  };
  g.draws.add(place);
  const tw = (to, ms2, ease = "io") => g.to(to, ms2, ease, st);
  const stop = () => { g.tweens = g.tweens.filter((t) => t.obj !== st); };   // cut the squeeze short when they answer
  const chest = () => { const D = carried(); return { x: B.box.x + B.home.x + B.pivot[0] + D[0], y: B.box.y + B.home.y + B.pivot[1] + D[1] }; };
  const land = async () => {   // dropped back to the ground: a squash, dust, a thud
    await tw({ lift: 0, trem: 0 }, 300, "in");
    st.sx = 1.18; st.sy = 0.84;
    fx.shake(10); fx.dust(B.box.x + B.home.x + B.pivot[0], 10, 1.1); sound.sfx("slamImpact", { size: 0.5 });
    await tw({ sx: 1, sy: 1, r: 0 }, 360, "back");
  };

  let free = false;
  try {
    // 1. two arms shoot out and wrap them, then lift them off the ground
    fx.darken(0.2, 400);
    fx.focus(1.05, s.P("core"), 400);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 1.1 }, 300, "out");
    await fx.wait(380);
    sound.sfx("whoosh"); sound.sfx("squelch");
    st.wave = 1;
    fx.focus(1.02, null, 300);
    await tw({ reach: 1 }, 300, "in");
    sound.sfx("hit", { size: 0.6 }); fx.shake(8);
    tw({ wave: 0 }, 400, "out");
    await tw({ wrap: 1, loose: 1.06 }, 460, "out");
    if (s.skin !== "pyro") s.flinch({ crit: false });
    sound.sfx("servo", { ms: 500 });
    fx.focus(1.1, { x: chest().x + 40, y: chest().y - 30 }, 600);
    await tw({ lift: 34 }, 520, "out");
    // 2. the quick test; the squeeze tightens while the clock runs, the coils creak faster and faster
    fx.darken(0.5, ms);
    tw({ sq: 1, trem: 1 }, ms, "lin");
    let answered = false;
    (async () => {
      while (!answered) {
        await fx.wait(780 - 420 * st.sq);
        if (answered) break;
        fx.shake(2 + 5 * st.sq); sound.sfx("squelch");
        g.fxv.flash = 0.06 + 0.1 * st.sq; g.to({ flash: 0 }, 120, "lin", g.fxv);
      }
    })();
    const r = await ask();
    answered = true; stop();
    free = r.correct;
    if (free) {
      // 3a. they burst free
      const c = chest();
      sound.sfx("shatter"); sound.sfx("whoosh");
      fx.hitstop(90); fx.shake(18); fx.flash(0.4, T.light); fx.punch(0.04, c);
      fx.ring(c, { color: T.mid, size: 170, ms: 420, width: 6 });
      fx.ring(c, { color: T.light, size: 110, flat: 0.4, ms: 360, width: 4 });
      fx.sparks(c, 26, { colors: [T.foam, T.light, T.mid], power: 1.7 });
      onFree?.();
      st.sx = 1.16; st.sy = 0.9; st.sq = 0;
      tw({ sx: 1, sy: 1 }, 300, "back");
      g.hurt({ crit: false });   // the Maw flinches back
      tw({ wave: 1.2 }, 120, "out");
      await tw({ burst: 1 }, 240, "out");
      fx.darken(0.1, 300); fx.focus(1, null, 500);
      tw({ wave: 0 }, 500, "out");
      tw({ ret: 1 }, 520, "io");
      await land();
    } else {
      // 3b. the crush
      sound.sfx("bite");
      await tw({ sq: 1.6, sx: 0.78, sy: 1.08 }, 110, "in");
      const c = chest();
      impactFrame(fx, { ms: 60, frames: 2 });
      fx.hitstop(170); fx.shake(30); fx.punch(0.07, c); fx.flash(0.35, "#ff4d4d");
      sound.sfx("slamImpact", { size: 1.2 });
      fx.sparks(c, 20, { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1.4 });
      fx.ring(c, { color: "#f59a90", size: 140, ms: 380, width: 5 });
      s.hit({ crit: true }, { flinch: s.skin !== "pyro" });
      await fx.wait(380);
      // it lets go and drops them
      sound.sfx("squelch");
      fx.darken(0.1, 300); fx.focus(1, null, 500);
      tw({ burst: 1, sq: 0 }, 260, "out");
      tw({ ret: 1 }, 560, "io");
      if (s.skin === "pyro") s.flinch({ crit: true });
      await land();
    }
    fx.darken(0, 400);
    await fx.wait(200);
  } finally {
    PAIR.forEach((i) => delete g.override[i]);
    g.draws.delete(place);
    el.style.transformOrigin = origin;
    fx.place(el, B.home);
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  }
  return free;
}
