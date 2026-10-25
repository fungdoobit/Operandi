// SWALLOW AND SPIT, the Abyssal Maw's nastiest trick (agreed with Isaac 2026-10-24: "the cat yawns wide, a tentacle pulls the
// fighter into the mouth, a dark beat, he spits them out dazed").
//
//   1. his arms slide back into his mouth: for a moment he is only a cat again, yawning wide
//   2. one arm shoots out of the open mouth like a frog's tongue, coils round your fighter and reels them in, smaller and
//      smaller (further away, into the mouth) until they vanish inside
//   3. GULP: the mouth shuts, the screen goes dark, three muffled thumps as they fight inside him, and he flinches each time
//   4. he gags... and SPITS: the mouth flies open, your fighter shoots out in an arc with a spray of slime, lands, skids,
//      and stands there dazed with stars circling over their head while the arms pour out of his mouth again
//
// The coil is the one from Grab and Slam (bodyOf in maw-grab.js: sized to each fighter's outline, its front passes on the Maw's
// front layer). Your fighter's element is moved and scaled every frame just before the Maw draws, so the two stay together.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, spl } from "./maw-px.js";
import { bodyOf } from "./maw-grab.js";

const ARM = 4;                        // the tongue
const REST = [0, 1, 2, 3, 5, 6, 7];   // the others, which slide back into the mouth
const N = 100;
const PH0 = 0.15 * Math.PI, PH1 = 4.5 * Math.PI;   // the coil: twice round, from their right side
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// A path as evenly spaced points (keeps the tentacle's taper even)
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

export async function swallow(s) {
  const { fx, g, pxTop } = s;
  const B = bodyOf(s), el = B.el, t0 = g.at;
  // where your fighter is: carried (dx, dy design px), shrunk (sc), see-through (op), tilted (r)
  const st = { grow: 1, reach: 0, wrap: 0, loose: 1.35, reel: 0, sc: 1, op: 1, r: 0, sag: 1, wave: 0, fly: -1, sx: 1, sy: 1, daze: 0 };
  const P0 = [B.box.x + B.home.x + B.pivot[0], B.box.y + B.home.y + B.pivot[1]];
  const mouth = () => { const m = g.mouthD(); return [m.x, m.y]; };
  // where they are now, while being reeled in (to the mouth) or spat out (an arc from the mouth home)
  const at = () => {
    const M = mouth();
    if (st.fly >= 0) { const u = st.fly; return [lerp(M[0], P0[0], u), lerp(M[1], P0[1], u) - 120 * Math.sin(Math.PI * u) * (1 - u * 0.3)]; }
    const e = st.reel ** 1.6;   // slow at first, then swallowed fast
    return [lerp(P0[0], M[0] + 4, e), lerp(P0[1], M[1], e) - 26 * Math.sin(Math.PI * e)];
  };
  const toWorld = (q) => {   // a point from the centre of their box -> cells, as they are now
    const c = at(), x = (q[0] - B.pivot[0]) * st.sc, y = (q[1] - B.pivot[1]) * st.sc;
    return [(c[0] + x) / CELL, (c[1] + y) / CELL];
  };

  // ---- the tongue: from the mouth (a sagging curve) to the coil round them ----
  g.override[ARM] = (base) => {
    if (st.reach <= 0) return base;
    const Mc = g.mouthCells(), tt = (g.at - t0) / 1000;
    const coil = [];
    const upto = lerp(PH0, PH1, st.wrap), n = Math.max(2, Math.ceil(90 * st.wrap));
    for (let i = 0; i <= n; i++) { const phi = lerp(PH0, upto, i / n), k = (phi - PH0) / (PH1 - PH0), [x, y, z] = B.coil(phi, k, st.loose), w = toWorld([x, y]); coil.push([w[0], w[1], z]); }
    const E = coil[0], len = Math.hypot(E[0] - Mc[0], E[1] - Mc[1]);
    const line = [];
    for (let i = 0; i <= 40; i++) {
      const f = i / 40, sag = st.sag * Math.sin(Math.PI * f) * Math.min(14, len * 0.12), wv = st.wave * Math.sin(f * 12 - tt * 24) * 3 * Math.sin(Math.PI * f);
      line.push([lerp(Mc[0], E[0], f), lerp(Mc[1], E[1], f) + sag + wv, -1]);
    }
    const pts = resample(line.concat(coil.slice(1)), N);
    const front = []; let a0 = null;
    pts.forEach((p, k) => { const t = k / (N - 1); if (p[2] > 0 && a0 === null) a0 = t; if ((p[2] <= 0 || k === N - 1) && a0 !== null) { front.push([a0, t]); a0 = null; } });
    return { pts: pts.map((p) => [p[0], p[1]]), front };
  };

  // ---- your fighter, placed just before every drawing ----
  const origin = el.style.transformOrigin, op0 = el.style.opacity;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  const held = () => st.reel > 0 || st.fly >= 0 || st.op < 1;
  const place = () => {
    if (!held()) return;
    const c = at(), x = B.home.x + Math.round((c[0] - P0[0]) / CELL) * CELL, y = B.home.y + Math.round((c[1] - P0[1]) / CELL) * CELL;
    const r = st.r + Math.sin((g.at - t0) / 90) * 0.06 * st.daze;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${r.toFixed(3)}rad) scale(${(st.sc * st.sx).toFixed(3)}, ${(st.sc * st.sy).toFixed(3)})`;
    el.style.opacity = st.op.toFixed(2);
    el._pos = { x, y, r: (r * 180) / Math.PI };
  };
  g.draws.add(place);
  const tw = (to, ms, ease = "io") => g.to(to, ms, ease, st);
  const grow = (v, ms, ease = "io") => { for (const i of REST) g.growOv[i] ??= 1; return g.to(Object.fromEntries(REST.map((i) => [i, v])), ms, ease, g.growOv); };

  try {
    // 1. the arms slide back into his mouth: only a cat, yawning wide
    fx.darken(0.15, 500);
    sound.sfx("growl", { size: 0.5 });
    g.growOv[ARM] = 1;
    g.to({ [ARM]: 0 }, 520, "io", g.growOv);
    await grow(0, 560, "io");
    fx.focus(1.12, { x: mouth()[0] - 30, y: mouth()[1] }, 500);
    g.to({ hx: -2 }, 400, "out");   // he leans in
    await fx.wait(480);
    // 2. the tongue: out of the mouth to them, round them...
    sound.sfx("whoosh"); sound.sfx("squelch");
    st.reach = 1;
    tw({ wave: 1 }, 1, "lin");
    fx.focus(1.02, null, 300);
    await g.to({ [ARM]: 0.62 }, 220, "in", g.growOv);   // the straight part shoots out first
    sound.sfx("hit", { size: 0.6 }); fx.shake(6);
    if (s.skin !== "pyro") s.flinch({ crit: false });   // (PYRO's hurt look is a smaller flame: it would slip inside the coil)
    tw({ wave: 0 }, 400, "out");
    g.to({ [ARM]: 1 }, 380, "out", g.growOv);
    await tw({ wrap: 1, loose: 1.1 }, 380, "out");
    await tw({ loose: 0.97 }, 120, "out");   // squeeze
    await fx.wait(140);
    // ...and reels them in, smaller and smaller, into the mouth
    sound.sfx("servo", { ms: 700 });
    tw({ sag: 0.2 }, 600, "in");
    tw({ sc: 0.16, r: -0.5 }, 760, "in");
    fx.focus(1.14, { x: mouth()[0] - 20, y: mouth()[1] }, 700);
    await tw({ reel: 1 }, 760, "in");
    st.op = 0;
    g.growOv[ARM] = 0; st.reach = 0;
    // 3. GULP: the mouth shuts, dark, three muffled thumps
    sound.sfx("bite"); sound.sfx("squelch");
    g.to({ mouth: 0 }, 140, "out");
    g.to({ hy: 3 }, 90, "out").then(() => g.to({ hy: 0 }, 300, "back"));
    fx.shake(10);
    fx.darken(0.72, 260);
    await fx.wait(520);
    for (const [dx, d] of [[3, 330], [-4, 280], [5, 380]]) {
      sound.sfx("hit", { size: 0.5 }); fx.shake(7);
      g.to({ hx: dx, hy: -2 }, 60, "out").then(() => g.to({ hx: 0, hy: 0 }, 220, "back"));
      g.fxv.flash = 0.25; g.to({ flash: 0 }, 160, "lin", g.fxv);
      await fx.wait(d);
    }
    // 4. he gags... and SPITS
    sound.sfx("growl", { size: 0.9 });
    g.to({ hy: 2, hx: 2 }, 260, "in");
    await fx.wait(260);
    g.to({ mouth: 1 }, 90, "out");
    g.to({ hx: -6, hy: -2 }, 90, "out").then(() => g.to({ hx: 0, hy: 0 }, 420, "back"));
    fx.darken(0.15, 200);
    fx.flash(0.35, "#ffd6c8"); fx.shake(18);
    sound.sfx("splashBig"); sound.sfx("whoosh");
    const M = mouth(), mc = { x: M[0] - 8, y: M[1] };
    fx.drops(mc, "slime", 18, { power: 1.5, dir: -1, up: 6 });
    fx.ring(mc, { color: "#f59a90", size: 90, ms: 320, width: 4 });
    st.op = 1; st.sc = 0.2; st.r = -2.2; st.fly = 0;
    tw({ sc: 1 }, 460, "out");
    tw({ r: 0.35 }, 470, "out");
    fx.focus(1, null, 500);
    grow(1, 900, "out");   // the arms pour back out of his mouth
    await tw({ fly: 1 }, 470, "in");
    // the landing: squash, skid, slime splat, the hit
    const land = { x: P0[0], y: B.box.y + B.home.y + B.feet - 4 };
    st.sx = 1.25; st.sy = 0.78;
    impactFrame(fx, { ms: 60, frames: 1 });
    fx.hitstop(120); fx.shake(22); fx.punch(0.05, land); fx.flash(0.2, "#ffd6c8");
    sound.sfx("slamImpact", { size: 0.9 }); sound.sfx("splash");
    fx.dust(land.x, 12, 1.2);
    fx.drops({ x: land.x, y: land.y - 10 }, "slime", 12, { power: 1, up: 4 });
    s.hit({ crit: true });
    tw({ sx: 1, sy: 1, r: 0 }, 420, "back");
    st.daze = 1;
    // dazed: stars circling over their head
    const R = B.spec.rows, cx = R.reduce((a, r) => a + (r[1] + r[2]) / 2, 0) / R.length;   // the middle of their outline...
    const head = () => ({ x: B.box.x + B.home.x + cx, y: B.box.y + B.home.y + R[0][0] - 2 });  // ...over the top of it
    pxTop.add({ dur: 1700, draw(c, k, t) {
      const h = head(), a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1;
      for (let i = 0; i < 3; i++) {
        const ang = t / 240 + (i * Math.PI * 2) / 3, x = h.x + Math.cos(ang) * 26, y = h.y - 12 + Math.sin(ang) * 7, r = 7 + Math.sin(ang) * 2;
        c.globalAlpha = a; c.fillStyle = Math.sin(ang) > 0 ? "#ffe37a" : "#d9a93a";
        c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.35, y - r * 0.35); c.lineTo(x + r, y); c.lineTo(x + r * 0.35, y + r * 0.35); c.lineTo(x, y + r); c.lineTo(x - r * 0.35, y + r * 0.35); c.lineTo(x - r, y); c.lineTo(x - r * 0.35, y - r * 0.35); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
    } });
    await fx.wait(900);
    tw({ daze: 0 }, 700, "io");
    fx.darken(0, 500);
    await fx.wait(500);
  } finally {
    delete g.override[ARM];
    for (const i of [ARM, ...REST]) delete g.growOv[i];
    g.draws.delete(place);
    el.style.transformOrigin = origin; el.style.opacity = op0;
    fx.place(el, B.home);
    g.to({ tense: 0, writhe: 0.55, mouth: 1, hx: 0, hy: 0 }, 300, "io");
  }
}
