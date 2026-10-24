// GRAB AND SLAM, the Abyssal Maw's heavy attack (Isaac 2026-10-24, second pass: "the tentacle should go and wrap around the
// character's body, then swing up and slam down, strong impact, cinematic, very smooth").
//
// One of his own arms does it, and it stays itself the whole time (same colour, same thickness rule as every other arm):
//   1. it rears up over the cat's head like a scorpion's tail, the tip aimed at your fighter
//   2. it shoots across the stage at them, the root leading and the tip snapping in last
//   3. the tip coils round their body (in front of them and behind them), then squeezes
//   4. it lifts them high and swings them back over the stage, hangs for a beat...
//   5. ...and slams them into the ground: freeze frame, negative flash, shake, dust and shockwaves
//   6. up again with a slight pause, then three quick slams, each a little different (Isaac 2026-10-24: "not copy and paste")
//   7. it uncoils and slides back into the mass
// No letterbox bars on this one (Isaac 2026-10-24).
//
// How the coil works: the coil is part of the arm (the arm is one curve from his mouth to the tip). Its points that are in
// front of your fighter go on the Maw's front layer (maw-px.js), the rest stay behind them. The coil's size comes from the
// outline of each fighter (BODY: measured from their idle frames, so it hugs PYRO's flame, NOVA and Kaela without cutting
// through them). Your fighter is carried by moving their element every frame with the arm (a frame hook), so both stay in step.
import { sound } from "../sound.js";
import { impactFrame } from "../cine.js";
import { CELL, SK, spl } from "./maw-px.js";

const ARM = 4;        // the long upper arm
const N = 120;        // points along the arm while it's in the attack
const TUBE = 7;       // about how thick the coil is (design px, radius), so it wraps outside the body
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const L2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const ss = (t) => t * t * (3 - 2 * t);

// Each fighter's outline: [y, left x, right x] in design px from the centre of their box (the union of their idle frames),
// and the band of their body the coil goes round (top, bottom), clear of their face.
const BODY = {
  pyro: { band: [12, 56], rows: [[-16, 17, 18], [-12, 3, 58], [-8, 14, 66], [-4, -10, 59], [0, 7, 48], [4, 1, 66], [8, -17, 63], [12, -17, 51], [16, -18, 72], [20, -18, 66], [24, -18, 72], [28, -18, 64], [32, -7, 66], [36, -9, 66], [40, -12, 72], [44, -10, 70], [48, -12, 72], [52, -21, 69], [56, -11, 71], [60, -12, 70], [64, -15, 75], [68, -21, 68], [72, -17, 69], [76, -21, 70], [80, -18, 75], [84, -12, 73], [88, -14, 72], [92, -15, 70], [96, -15, 63], [100, -10, 63], [104, -1, 58], [108, 3, 56], [112, 9, 51], [116, 19, 44]] },
  nova: { band: [16, 40], rows: [[-16, 21, 31], [-12, 8, 38], [-8, 7, 37], [-4, 0, 43], [0, 5, 45], [4, -1, 46], [8, -8, 46], [12, -5, 44], [16, -3, 45], [20, -6, 49], [24, 0, 46], [28, 1, 47], [32, 6, 46], [36, 11, 42], [40, 8, 45], [44, 9, 45]] },
  kaela: { band: [-14, 22], rows: [[-52, -4, 15], [-48, -10, 22], [-44, -12, 26], [-40, -12, 28], [-36, -12, 28], [-32, -15, 28], [-28, -19, 28], [-24, -23, 28], [-20, -23, 31], [-16, -26, 35], [-12, -30, 35], [-8, -30, 35], [-4, -39, 35], [0, -45, 33], [4, -45, 35], [8, -41, 33], [12, -39, 37], [16, -35, 39], [20, -35, 39], [24, -30, 37], [28, -28, 35], [32, -21, 33], [36, -21, 30], [40, -21, 31], [44, -23, 35], [48, -26, 39], [52, -30, 39], [56, -30, 39]] },
};

// The fighter's body, the coil round it, and how to carry it.
function bodyOf(s) {
  const el = s.mateEl, home = { x: 0, y: 0, r: 0, ...el._pos };
  const box = { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight };
  let spec = BODY[s.skin];
  if (!spec) {   // any other fighter: their figure's box
    const r = s.dot.figure.getBoundingClientRect(), a = s.fx.fromPage({ x: r.left, y: r.top }), b = s.fx.fromPage({ x: r.right, y: r.bottom });
    const x0 = a.x - box.x - home.x, x1 = b.x - box.x - home.x, y0 = a.y - box.y - home.y, y1 = b.y - box.y - home.y, rows = [];
    for (let y = Math.round(y0); y <= y1; y += 4) rows.push([y, x0, x1]);
    spec = { band: [lerp(y0, y1, 0.42), lerp(y0, y1, 0.66)], rows };
  }
  const env = (y, h) => { let a = 1e9, b = -1e9; for (const [ry, x0, x1] of spec.rows) if (Math.abs(ry - y) <= h) { a = Math.min(a, x0); b = Math.max(b, x1); } return a < b ? [a, b] : [0, 0]; };
  // the coil's centre and half-width up the band, smoothed (40 steps), widest outline within the tube's reach
  const K = 40, cx = [], hw = [];
  for (let i = 0; i <= K; i++) { const y = lerp(spec.band[1], spec.band[0], i / K), [a, b] = env(y, TUBE + 5); cx.push((a + b) / 2); hw.push((b - a) / 2); }
  const sm = (arr) => arr.map((_, i) => { let t = 0, n = 0; for (let j = -4; j <= 4; j++) { const k = clamp(i + j, 0, K); t += arr[k]; n++; } return t / n; });
  const CX = sm(cx), HW = sm(hw).map((v, i) => Math.max(v, hw[i] - 1));
  const at = (arr, k) => { const f = clamp(k) * K, i = Math.min(K - 1, Math.floor(f)); return lerp(arr[i], arr[i + 1], f - i); };
  const mid = (spec.band[0] + spec.band[1]) / 2, pivot = [at(CX, 0.5), mid];
  const feet = Math.max(...spec.rows.map((r) => r[0]));
  return { el, home, box, spec, pivot, feet,
    // a point of the coil: k 0..1 from the bottom of the band to the top, phi round the body; z > 0 is in front of them
    coil(phi, k, loose) {
      const y = lerp(spec.band[1], spec.band[0], k), rx = (at(HW, k) + TUBE * 0.5) * loose, ry = clamp(rx * 0.2, 4, 9);
      return [at(CX, k) + rx * Math.cos(phi), y + ry * Math.sin(phi), Math.sin(phi)];
    },
  };
}

// A curve as evenly spaced points.
function resample(poly, n) {
  const d = [0]; for (let i = 1; i < poly.length; i++) d.push(d[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = d[d.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / (n - 1)) * L; while (j < poly.length - 2 && d[j + 1] < s) j++;
    const u = (s - d[j]) / ((d[j + 1] - d[j]) || 1), p = L2(poly[j], poly[j + 1], clamp(u));
    out.push([p[0], p[1], lerp(poly[j][2] ?? -1, poly[j + 1][2] ?? -1, clamp(u))]);
  }
  return out;
}
const bez = (a, b, c, d, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; };
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

export async function grab(s) {
  const { fx, g, dot } = s;
  const B = bodyOf(s), el = B.el, PH0 = 0.15 * Math.PI, PH1 = 4.5 * Math.PI;   // the coil: from their right side, twice round, the tip ending across their front
  // what the scene animates
  const st = { cock: 0, lunge: 0, wrap: 0, loose: 1.35, dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, arch: 0, ret: 0, wave: 0, fight: 0, path: null };
  let held = false;
  const lag = { x: 0, y: 0, vx: 0, vy: 0, on: false };
  const t0 = g.at;

  // ---- where everything is ----
  const tilt = () => st.rot + Math.sin((g.at - t0) / 38) * 0.035 * st.fight;   // fight: they struggle in the coil
  const toWorld = (q) => {   // a point given from the centre of their box (design px) -> where it is now (cells)
    const c = Math.cos(tilt()), sn = Math.sin(tilt()), X = (q[0] - B.pivot[0]) * st.sx, Y = (q[1] - B.pivot[1]) * st.sy;
    const D = carried();
    return [(B.box.x + B.home.x + B.pivot[0] + D[0] + X * c - Y * sn) / CELL, (B.box.y + B.home.y + B.pivot[1] + D[1] + X * sn + Y * c) / CELL];
  };
  // how far your fighter has been carried (whole cells, so the coil and the body move together pixel for pixel); a squash keeps
  // their feet where they were (they squash about the middle of the coil)
  const carried = () => [Math.round(st.dx / CELL) * CELL, Math.round((st.dy + (1 - st.sy) * (B.feet - B.pivot[1])) / CELL) * CELL];
  const coilPts = (upto, loose) => {
    const out = [], n = Math.max(2, Math.ceil(110 * (upto - PH0) / (PH1 - PH0)));
    for (let i = 0; i <= n; i++) { const phi = lerp(PH0, upto, i / n), k = (phi - PH0) / (PH1 - PH0), [x, y, z] = B.coil(phi, k, loose); const w = toWorld([x, y]); out.push([w[0], w[1], z]); }
    return out;
  };
  // the cocked pose: up over the cat's head and curling forward, the tip aimed at your fighter (cells from the mouth); it sways
  const COCK = [[0, 0], [4, -14], [12, -30], [24, -44], [30, -60], [24, -75], [8, -82], [-9, -78], [-20, -67]];
  const cocked = (M) => {
    const tt = (g.at - t0) / 1000, pts = [];
    for (let i = 0; i <= 60; i++) { const f = i / 60, p = spl(COCK, f); pts.push([M[0] + p[0] + Math.sin(tt * 5 + f * 4) * 2.2 * f, M[1] + p[1] + Math.cos(tt * 4 + f * 5) * 1.6 * f]); }
    return resample(pts, N);
  };
  // the arm from his mouth to where the coil starts, plus the coil so far
  const reach = (M) => {
    const coil = coilPts(lerp(PH0, PH1, st.wrap), st.loose), E = coil[0], E2 = coil[1];
    const dE = norm([E2[0] - E[0], E2[1] - E[1]]), Lc = Math.hypot(E[0] - M[0], E[1] - M[1]);
    const d0 = norm([-1, -0.45 - 0.9 * st.arch]);
    const C1 = [M[0] + d0[0] * Lc * 0.34, M[1] + d0[1] * Lc * 0.34 - st.arch * Lc * 0.22], C2 = [E[0] - dE[0] * Lc * 0.3, E[1] - dE[1] * Lc * 0.3 - st.arch * Lc * 0.1];
    const lx = lag.on ? lag.x / CELL - E[0] : 0, ly = lag.on ? lag.y / CELL - E[1] : 0, tt = (g.at - t0) / 1000;
    const chord = [];
    for (let i = 0; i <= 80; i++) {
      const f = i / 80, p = bez(M, C1, C2, E, f), w = Math.sin(Math.PI * f) ** 1.3;
      const wv = st.wave * Math.sin(f * 11 - tt * 26) * 5 * w;   // a ripple running down it
      p[0] += lx * w; p[1] += ly * w + wv;
      chord.push([p[0], p[1], -1]);
    }
    return resample(chord.concat(coil.slice(1)), N);
  };

  // ---- the arm, every frame ----
  g.override[ARM] = (base) => {
    const M = g.mouthCells(), rest = Array.from({ length: N }, (_, k) => spl(base, k / (N - 1)));
    const C = cocked(M);
    let pts;
    if (st.lunge <= 0) pts = rest.map((p, k) => L2(p, C[k], ss(st.cock)));
    else {
      const A = reach(M), tt = (g.at - t0) / 1000;
      pts = A.map((a, k) => {
        const f = k / (N - 1), pk = ss(clamp(st.lunge * 1.6 - 0.6 * f));                // the root leads, the tip snaps in last
        const p = L2(C[k], a, pk), sw = 4 * pk * (1 - pk) * Math.sin(f * 9 - tt * 30) * 7 * f;   // a snake's S while it travels
        const q = [p[0], p[1] + sw];
        const rk = ss(clamp(st.ret * 1.5 - 0.5 * f));                                     // going home: the root first
        return L2(q, rest[k], rk);
      });
      if (st.wrap > 0 && st.ret < 1) {   // the stretches in front of your fighter go on the front layer
        const front = []; let a0 = null;
        A.forEach((a, k) => { const t = k / (N - 1); if (a[2] > 0 && a0 === null) a0 = t; if ((a[2] <= 0 || k === N - 1) && a0 !== null) { front.push([Math.max(0, a0 - 0.5 / N), Math.min(1, t)]); a0 = null; } });
        return { pts, front };
      }
    }
    return pts;
  };

  // ---- carrying your fighter, every frame ----
  const origin = el.style.transformOrigin;
  el.style.transformOrigin = `${B.box.w / 2 + B.pivot[0]}px ${B.box.h / 2 + B.pivot[1]}px`;
  const hook = (dt) => {
    st.path?.();   // the slam's arc sets where they are
    // the arm's middle lags behind your fighter and overshoots when they stop (a damped spring on where the coil starts)
    const E = toWorld(B.coil(PH0, 0, st.loose)), ex = E[0] * CELL, ey = E[1] * CELL;
    if (!lag.on) { lag.x = ex; lag.y = ey; lag.on = held; }
    const k = Math.min(0.05, dt / 1000), W = 17, Z = 0.32;
    lag.vx += (W * W * (ex - lag.x) - 2 * Z * W * lag.vx) * k; lag.vy += (W * W * (ey - lag.y) - 2 * Z * W * lag.vy) * k;
    lag.x += lag.vx * k; lag.y += lag.vy * k;
  };
  const place = () => {   // just before the Maw draws, so the body and the coil are always in the same spot
    if (!held) return;
    st.path?.();
    const D = carried(), x = B.home.x + D[0], y = B.home.y + D[1];
    el.style.transform = `translate(${x}px, ${y}px) rotate(${tilt()}rad) scale(${st.sx.toFixed(3)}, ${st.sy.toFixed(3)})`;
    el._pos = { x, y, r: (tilt() * 180) / Math.PI };
  };
  g.hooks.add(hook); g.draws.add(place);
  const tw = (to, ms, ease = "io") => g.to(to, ms, ease, st);
  const feetAt = () => ({ x: (B.box.x + B.home.x + B.pivot[0]), y: B.box.y + B.home.y + B.feet - 4 });

  try {
    // 1. it rears up
    fx.darken(0.2, 500); fx.focus(1.05, s.P("core"), 500);
    sound.sfx("growl", { size: 0.8 });
    g.to({ tense: 1, writhe: 0.9 }, 300, "out");
    await tw({ cock: 1 }, 600, "out");
    sound.sfx("hiss");
    await fx.wait(260);
    // 2. it strikes across the floor
    sound.sfx("swoosh");
    fx.focus(1, null, 300);
    await tw({ lunge: 1 }, 330, "in");
    // 3. it coils round them...
    held = true; lag.on = false;
    sound.sfx("squelch");
    fx.shake(6);
    await tw({ wrap: 1, loose: 1.14 }, 430, "out");
    // ...and squeezes
    sound.sfx("bite"); sound.sfx("hurt");
    fx.shake(9); fx.flash(0.12, "#ff9a90");
    tw({ loose: 0.96 }, 140, "out");
    await tw({ sx: 0.9, sy: 1.07 }, 140, "out");
    tw({ sx: 1, sy: 1 }, 320, "back");
    tw({ fight: 1 }, 120, "out");
    await fx.wait(260);
    // 4. it lifts them high and slams them down: once big and slow, then up again for three quick ones, each a little different
    //    (higher or lower, a wider or straighter swing, a different tilt and landing spot, harder or softer)
    const late = s.skin === "pyro";   // PYRO's hurt look is a smaller flame: it would slip down inside the coil, so he flinches as it lets go
    const fl = fx.floorFrac; fx.floorFrac = feetAt().y / fx.h;   // the dust and debris start from where they land
    let first = true;
    const slam = async (o) => {
      // up...
      sound.sfx("whoosh", { size: o.big ? 0.8 : 0.5 });
      tw({ arch: o.arch, wave: o.big ? 0.4 : 0.2, fight: o.big ? 0.4 : 0.2 }, o.up, "out");
      await tw({ dx: o.A[0], dy: o.A[1], rot: o.A[2] }, o.up, "out");
      // ...the hang...
      if (o.big) { fx.focus(1.08, { x: feetAt().x + 60, y: feetAt().y - 130 }, 420); fx.darken(0.3, 400); }
      await tw({ dx: o.H[0], dy: o.H[1], rot: o.H[2], wave: 0, fight: 0 }, o.hang, "io");
      // ...and down in an arc, faster and faster, onto the ground
      sound.sfx("swoosh");
      const A0 = [st.dx, st.dy], C0 = [st.dx + o.C[0], st.dy + o.C[1]], E0 = [o.land, 0];
      const arc = { u: 0 };
      st.path = () => { const u = arc.u, v = 1 - u; st.dx = v * v * A0[0] + 2 * v * u * C0[0] + u * u * E0[0]; st.dy = v * v * A0[1] + 2 * v * u * C0[1] + u * u * E0[1]; };
      tw({ rot: o.R, arch: 0.15 }, o.down, "in");
      await g.to({ u: 1 }, o.down, "in", arc);
      st.path = null; st.dx = o.land; st.dy = 0;
      // impact (p = how hard)
      const p = o.power, at = feetAt();
      at.x += o.land;
      st.sx = 1 + 0.24 * p; st.sy = 1 - 0.2 * p; st.rot = 0.05 * Math.sign(o.R);
      fx.hitstop(Math.round(110 + 60 * p)); fx.shake(Math.round(20 + 12 * p)); fx.punch(0.04 + 0.035 * p, at); fx.flash(0.2 + 0.3 * Math.min(1, p), "#ffd6c8");
      if (o.invert) impactFrame(fx, { ms: 60, frames: 2 });   // the negative flash: only the first and the last
      sound.sfx("slamImpact", { size: 0.9 + 0.4 * p }); if (o.big) sound.sfx("rumble", { size: 0.8 });
      fx.dust(at.x, Math.round(10 + 8 * p), 1 + 0.6 * p);
      for (let i = 1; i <= 6; i++) fx.wait(i * 40).then(() => { fx.dust(at.x - i * 30 * p, 3, 1.1); fx.dust(at.x + i * 30 * p, 3, 1.1); });   // a cloud rolling out both ways
      fx.debris({ x: at.x, y: at.y - 6 }, Math.round(5 + 5 * p), { power: 0.9 + 0.4 * p });
      fx.ring({ x: at.x, y: at.y }, { color: "#ffd6c8", size: 110 + 60 * p, flat: 0.28, ms: 460, width: 7 });
      if (p > 0.9) fx.ring({ x: at.x, y: at.y - 30 }, { color: "#f59a90", size: 120, ms: 380, width: 5 });
      fx.sparks({ x: at.x, y: at.y - 20 }, Math.round(10 + 12 * p), { colors: ["#ffd6c8", "#f59a90", "#ffffff"], power: 1 + 0.6 * p, dir: 0 });
      if (first) s.hit({ crit: true }, { flinch: !late });   // the damage lands on the first slam
      else if (!late) s.flinch({ crit: p > 1 });
      first = false;
      tw({ sx: 1, sy: 1, rot: 0 }, o.big ? 420 : 300, "back");
      st.wave = 1.3 * p; tw({ wave: 0 }, 650, "out");   // the shock runs back up the arm
      await fx.wait(o.after);
    };
    // the big one (the slam Isaac liked: slow lift, long hang, wide arc)
    await slam({ big: true, A: [66, -140, -0.24], up: 600, H: [82, -158, -0.42], hang: 360, C: [-70, 4], R: 0.22, down: 190, land: 0, power: 1, invert: true, arch: 1, after: 200 });
    fx.focus(1, null, 300); fx.darken(0.15, 300);
    // up again, a slight pause, then three quick ones
    await slam({ A: [52, -122, -0.3], up: 300, H: [58, -130, -0.36], hang: 150, C: [-55, 10], R: 0.18, down: 150, land: -8, power: 0.72, arch: 0.85, after: 60 });
    await slam({ A: [24, -96, -0.1], up: 210, H: [26, -102, -0.14], hang: 40, C: [-12, -8], R: 0.08, down: 125, land: 6, power: 0.62, arch: 0.7, after: 50 });
    await slam({ A: [98, -150, -0.5], up: 270, H: [106, -160, -0.56], hang: 90, C: [-95, 0], R: 0.28, down: 165, land: 0, power: 1.15, invert: true, arch: 1, after: 320 });
    fx.wait(800).then(() => { fx.floorFrac = fl; });
    // 5. it lets go, uncoils and slides back into the mass
    fx.focus(1, null, 500); fx.darken(0, 500);
    sound.sfx("squelch");
    if (late) s.flinch({ crit: true });
    await tw({ wrap: 0, loose: 1.4, arch: 0, wave: 0.6 }, 360, "in");
    held = false;
    tw({ wave: 0 }, 480, "out");
    await tw({ ret: 1 }, 480, "io");
  } finally {
    g.hooks.delete(hook); g.draws.delete(place);
    delete g.override[ARM];
    el.style.transformOrigin = origin;
    fx.place(el, B.home);
    g.to({ tense: 0, writhe: 0.55 }, 400, "io");
  }
}
