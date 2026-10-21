// Hi-bit GOLEM's attacks: the same cinematic language as battle-moves.js
// (charge-up, a violent release, hit-stop, camera shake and punch-in, heavy
// impact, recovery), driven by the pixel model's pose numbers.
import { teammateHurt, bossSpecial } from "../battle-moves.js";
import { PODS } from "./golem-boss.js";
import { sound } from "../sound.js";
import { ease, lerp, glow, ribbon } from "./pixel-fx.js";
import { explode } from "./toon-fx.js";
import { propSprites, stamp } from "./props-px.js";
import { impactFrame, speedLines, bigHit } from "../cine.js";

const MOVES = ["slam", "barrage", "laser", "missiles"];
let last = null;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rand = (a, b) => a + Math.random() * (b - a);
// The shared cel explosion (toon-fx.js) when the stage has the toon layer.
const boom = (s, c, { size = 1 } = {}) => (s.toon ? explode(s.toon, c.x, c.y, { size: size * 0.9 }) : s.fx.explosion(c, { size }));

// ctx: { fx, px, dot, mateEl, theme, golem }
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
  // Claw slam: he rises on his thrusters with the claw cocked over his head,
  // power crackling into it, hangs for a beat in slow motion, then drives it
  // into the floor. The ground explodes into a cel dust cloud and a wave of rock
  // slabs bursts up out of the floor all the way to the teammate.
  async slam(s) {
    const { fx, g, toon, px, pxTop } = s;
    fx.letterbox(true); fx.darken(0.35, 500);
    sound.sfx("servo", { ms: 600 });
    fx.focus(1.1, s.mid(), 700);
    g.to({ ca: 0.9, ce: 1.7, cp: -0.2, cg: 0.6, lean: 0.18, tilt: 0.22, bob: 0.22, lunge: 0.15, flare: 1, na: -0.5, ne: 0.6, thrust: 2.2 }, 620, "out");
    fx.dust(s.P("core").x, 10, 1.4);   // the thrusters kick up the floor as he rises
    await fx.wait(300);
    const claw = () => s.P("claw");
    fx.converge(claw(), { color: "#8fc8ff", n: 26, ms: 520, radius: 160 });
    sound.sfx("laserCharge", { ms: 600 });
    const charge = pxTop.add({ dur: 1100, draw(gc, k, t) {   // the claw crackling with power
      const c = claw(), r = 10 + 22 * k;
      glow(gc, c.x, c.y, r * 2, "#5fa5ef", 0.7 * k);
      glow(gc, c.x, c.y, r, "#e6f6ff", 0.9 * k);
      if (((t / 45) | 0) % 2) for (let b = 0; b < 3; b++) {
        let a = Math.random() * Math.PI * 2, x = c.x, y = c.y;
        gc.strokeStyle = b ? "#9fd2ff" : "#ffffff"; gc.lineWidth = 2; gc.beginPath(); gc.moveTo(x, y);
        for (let j = 0; j < 4; j++) { a += rand(-0.7, 0.7); x += Math.cos(a) * r * 0.6; y += Math.sin(a) * r * 0.6; gc.lineTo(x, y); }
        gc.stroke();
      }
    } });
    await g.wait(420);
    // the hang: slow motion at the top
    fx.slowmo(0.35, 380);
    await g.to({ ca: 1.05, ce: 1.85, lean: 0.22, bob: 0.26 }, 240, "lin");
    fx.focus(1.04, { x: claw().x - 60, y: fx.floorY - 60 }, 160);
    // the drop
    sound.sfx("whoosh", { theme: "fire" });
    const at = { x: claw().x - 30, y: fx.floorY };
    speedLines(pxTop, at, 200, { inner: 70 });
    await g.to({ ca: -0.25, ce: 0.8, cp: 0.6, cg: 0, lean: -0.22, tilt: -0.25, bob: -0.25, lunge: -0.4, thrust: 0.3 }, 100, "in");
    // IMPACT
    sound.sfx("slamImpact");
    bigHit(fx, at, { stop: 220, shake: 38, punch: 0.08, flash: "#e6f6ff" });
    flashOn(pxTop, at, 110, 300, "#9fd2ff");
    fx.crack(at.x, { width: 320, color: "#9fd2ff" });
    fx.ring(at, { color: "#e6f6ff", size: 380, flat: 0.12, ms: 600, width: 10 });
    fx.debris({ x: at.x, y: fx.floorY - 10 }, 18, { power: 1.8, dir: -1 });
    fx.sparks({ x: at.x, y: fx.floorY - 6 }, 22, { power: 1.6, colors: ["#ffffff", "#9fd2ff", "#ffd27a"] });
    if (toon) {
      dustCloud(toon, at.x, fx.floorY, 1.3);
      explode(toon, at.x, fx.floorY - 20, { size: 0.7, dur: 900 });
    }
    // the wave of rock slabs racing to the teammate
    const to = s.dotC().x, dir = Math.sign(to - at.x) || -1, n = Math.max(6, Math.floor(Math.abs(to - at.x) / 30));
    const slabs = [];
    const rock = { dur: n * 45 + 1400, draw(gc, k, t) {
      for (const sl of slabs) {
        const u = (t - sl.t0) / 900; if (u < 0 || u > 1) continue;
        const rise = u < 0.12 ? ease.out(u / 0.12) : u > 0.6 ? 1 - ease.in((u - 0.6) / 0.4) : 1, h = sl.h * rise;
        if (h < 1) continue;
        const x = sl.x, y = fx.floorY + 2, w = sl.w;
        gc.fillStyle = "#3a3f4c";   // the slab: a jagged block of floor with a lit top
        gc.beginPath(); gc.moveTo(x - w / 2, y); gc.lineTo(x - w / 2 + sl.j1, y - h * 0.85); gc.lineTo(x + sl.j2, y - h); gc.lineTo(x + w / 2 - sl.j1, y - h * 0.7); gc.lineTo(x + w / 2, y); gc.fill();
        gc.fillStyle = "#6e7887"; gc.beginPath(); gc.moveTo(x - w / 2 + sl.j1, y - h * 0.85); gc.lineTo(x + sl.j2, y - h); gc.lineTo(x + w / 2 - sl.j1, y - h * 0.7); gc.lineTo(x + sl.j2 * 0.5, y - h * 0.8); gc.fill();
        gc.fillStyle = "#9fd2ff"; gc.fillRect(x - 1, y - h * 0.5, 2, h * 0.3);   // a crack of light in it
      }
    } };
    px.add(rock);   // rock.t is its clock: each slab starts at the time it was added
    let hit = false;
    for (let i = 1; i <= n; i++) fx.wait(i * 45).then(() => {
      const last = i === n, x = at.x + dir * (Math.abs(to - at.x) * i / n);
      slabs.push({ x, t0: rock.t, h: last ? 70 : rand(26, 48) * (0.7 + i / n * 0.5), w: last ? 46 : rand(20, 30), j1: rand(2, 6), j2: rand(-6, 6) });
      fx.dust(x, 3, 1); if (i % 2) sound.sfx("rubble", { size: 0.6 });
      if (toon) toon.add({ dur: 700, draw(pen, k) { pen.puff("smoke", x, fx.floorY - 8 - k * 20, 14 + k * 18, 0.95 * (1 - k), k * 0.9); } });
      fx.shake(8);
      if (last && !hit) { hit = true; sound.sfx("rubble", { size: 1.2 }); bigHit(fx, s.dotC(), { stop: 90, shake: 20, punch: 0.04, invert: false }); s.hurt(); }
    });
    void charge;
    await g.to({ bob: -0.3, lunge: -0.44 }, 140, "out");
    await fx.wait(n * 45 + 500);
    fx.letterbox(false); fx.darken(0, 400);
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
        boom(s, aim, { size: lastShot ? 1.1 : 0.6 });
        if (lastShot) s.hurt({ crit: false });
        else { fx.hitstop(40); fx.shake(6); dot.nudge(-8, 0.6); }
      } });
      await fx.wait(lastShot ? 520 : 200);
    }
    g.to({ charge: 0 }, 250);
  },

  // Missile swarm (Addendum I; Isaac 2026-10-21: lean into it, more cinematic):
  // he leans right over toward the teammate, the camera closes on his deck as
  // the hatches heat up, a lock-on snaps onto the teammate, and a volley of
  // missiles bursts out of the pods, climbs, turns and dives in, carpeting the
  // floor; the last one hits the teammate square.
  async missiles(s) {
    const { fx, g, px, pxTop, spr, toon, dot } = s;
    const S = propSprites();
    const pod = (i) => fx.fromPage(g.pagePoint(PODS[i % PODS.length]));
    fx.letterbox(true);
    fx.focus(1.16, { x: pod(0).x, y: pod(0).y + 30 }, 500);
    sound.sfx("servo", { ms: 460 });
    await g.to({ lean: 0.3, tilt: 0.2, lunge: -0.12, bob: 0.04, flare: 0.8, thrust: 1.4, ca: -0.6, na: -0.6 }, 460, "out");
    // the hatches heat up
    px.add({ dur: 900, draw(gc, k, t) { for (let i = 0; i < PODS.length; i++) { const p = pod(i), f = 0.7 + 0.3 * Math.sin(t * 0.04 + i); glow(gc, p.x, p.y, 24 * k * f, "#ff6a2a", 0.8); gc.fillStyle = "#ffd27a"; gc.fillRect(p.x - 3, p.y - 3, 6, 6); } } });
    await fx.wait(380);
    // lock-on
    fx.focus(1.08, { x: s.dotC().x, y: s.dotC().y - 20 }, 300);
    sound.sfx("lockOn");
    await pxTop.add({ dur: 220, draw(gc, k) { reticle(gc, s.dotC(), k, "#ff3a3a"); } });
    pxTop.add({ dur: 1500, draw(gc, k, t) { if (((t / 90) | 0) % 2) reticle(gc, s.dotC(), 1, "#ff3a3a"); } });
    fx.focus(1, null, 500);
    const n = 10, flights = [];
    for (let i = 0; i < n; i++) {
      const lastOne = i === n - 1;
      fx.wait(i * 90).then(() => {
        const from = pod(i), to0 = s.dotC();
        const to = lastOne ? to0 : { x: to0.x + rand(-150, 150), y: fx.floorY - 4 };
        const up = { x: from.x + rand(-40, 30), y: from.y - rand(140, 200) };
        const turn = { x: (up.x + to.x) / 2 + rand(-40, 40), y: Math.min(up.y, to.y) - rand(40, 90) };
        const pt = (u) => { const v = 1 - u; return { x: v * v * v * from.x + 3 * v * v * u * up.x + 3 * v * u * u * turn.x + u * u * u * to.x, y: v * v * v * from.y + 3 * v * v * u * up.y + 3 * v * u * u * turn.y + u * u * u * to.y }; };
        sound.sfx("missileLaunch");
        fx.shake(5); g.to({ lunge: -0.16 }, 50, "out").then(() => g.to({ lunge: -0.12 }, 140));
        if (toon) explode(toon, from.x, from.y, { size: 0.25, dur: 400 });
        const dur = 640 + rand(0, 140), M = { x: from.x, y: from.y, a: -Math.PI / 2, on: true };
        if (toon) toon.add({ dur: dur + 700, draw(pen, k, t) {   // the exhaust flame and a thick trail of smoke
          if (M.on) { M.trail ||= []; M.trail.push({ x: M.x, y: M.y, t }); pen.puff("heat", M.x - Math.cos(M.a) * 12, M.y - Math.sin(M.a) * 12, 6, 1.15); }
          for (const q of M.trail || []) { const age = (t - q.t) / 650; if (age > 1) continue; pen.puff("smoke", q.x, q.y - age * 10, 4 + age * 12, 0.85 * (1 - age), clamp01(age - 0.5)); }
        } });
        flights.push(spr.add({ dur, draw(gc, k) {
          const u = ease.in(k) * 0.35 + k * 0.65, p = pt(u), q = pt(Math.min(1, u + 0.02));
          M.x = p.x; M.y = p.y; M.a = Math.atan2(q.y - p.y, q.x - p.x);
          if (S) stamp(gc, S.missile[0], p.x, p.y, M.a, 1);
        } }).then(() => {
          M.on = false;
          if (toon) explode(toon, to.x, to.y - 10, { size: lastOne ? 1.2 : 0.65, dur: lastOne ? 1300 : 1000 }); else boom(s, to, { size: lastOne ? 1.1 : 0.6 });
          fx.dust(to.x, 5, 1);
          sound.sfx("explosion", { size: lastOne ? 1.2 : 0.55 });
          if (lastOne) { bigHit(fx, to, { stop: 140, shake: 26, punch: 0.06, flash: "#ffd9a3" }); s.hurt({ crit: false }); }
          else { fx.hitstop(30); fx.shake(9); dot.nudge(rand(-6, 6), 0.5); }
        }));
      });
    }
    await fx.wait(n * 90 + 1000);
    await Promise.all(flights);
    fx.letterbox(false);
  },

  // Core laser: the screen goes dark, he rises and spreads his arms while energy
  // pours into his eye from all around, then a beam of fire tears out of it: it
  // hits the floor in front of the teammate, sweeps into them, and explodes.
  async laser(s) {
    const { fx, g, toon, pxTop } = s;
    fx.letterbox(true); fx.darken(0.7, 500); fx.focus(1.12, s.mid(), 900);
    g.to({ ca: 0.4, ce: 0.3, cp: 0, na: 0.4, ne: 0.3, np: 0.3, tilt: -0.3, bob: 0.3, flare: 1.8, thrust: 1.6 }, 700, "out");
    fx.converge(s.P("core"), { color: "#ff6a2a", n: 40, ms: 1100, radius: 260, sound: false });
    sound.sfx("laserCharge", { ms: 1100 });
    fx.arcs(s.P("core"), 3, { radius: 90, color: "#ffb35c", ms: 1000 });
    speedLines(pxTop, () => s.P("core"), 1100, { color: "#ffd9a3", n: 36, inner: 50 });
    pxTop.add({ dur: 1150, draw(gc, k, t) { const c = s.P("core"), f = k * (0.85 + 0.15 * Math.sin(t * 0.06)); glow(gc, c.x, c.y, 90 * f, "#ff9a3c", 0.7); flare(gc, c, 26 * f); } });
    for (let i = 0; i < 6; i++) fx.wait(i * 170).then(() => fx.ring(s.P("core"), { color: "#ff9a3c", size: 160 - i * 22, ms: 260, width: 3 }));
    await fx.wait(1100);
    // FIRE
    const from = s.P("core"), tgt = s.dotC(), start = { x: tgt.x + 110, y: fx.floorY - 4 };
    sound.sfx("laserBeam", { ms: 1000 });
    bigHit(fx, from, { stop: 90, shake: 18, punch: 0.04, flash: "#ffd9a3" });
    g.to({ tilt: -0.4, lunge: 0.12, lean: 0.06, flare: 2.4 }, 120, "out");
    fx.focus(1.03, { x: (from.x + tgt.x) / 2, y: (from.y + tgt.y) / 2 }, 300);
    let aim = { ...start }, W = 0, hit = false;
    const burn = [];
    if (toon) toon.add({ dur: 1500, draw(pen, k, t) {   // the beam itself, and the floor it sets alight
      if (W > 0) {
        pen.limb("heat", [[from.x, from.y], [aim.x, aim.y]], 34 * W, 22 * W, 1.05);
        pen.puff("heat", aim.x, aim.y, 30 * W, 1.2);
        if (aim.y > fx.floorY - 20) burn.push({ x: aim.x, t });
      }
      for (const b of burn) { const age = (t - b.t) / 700; if (age > 1) continue; pen.flame(b.x, fx.floorY + 2, 9, 30 * (1 - age), 0.9 * (1 - age), -0.2, 0.2); }
    } });
    pxTop.add({ dur: 1300, draw(gc, k, t) {   // its white-hot core and rings racing along it
      if (W <= 0) return;
      const w = W * (8 + Math.sin(t * 0.09) * 2), L = Math.hypot(aim.x - from.x, aim.y - from.y), ux = (aim.x - from.x) / L, uy = (aim.y - from.y) / L;
      gc.lineCap = "round"; gc.strokeStyle = "#ffd27a"; gc.lineWidth = w + 6; gc.beginPath(); gc.moveTo(from.x, from.y); gc.lineTo(aim.x, aim.y); gc.stroke();
      gc.strokeStyle = "#ffffff"; gc.lineWidth = w; gc.stroke();
      for (let i = 0; i < 4; i++) { const u = (t * 0.002 + i / 4) % 1, x = from.x + ux * L * u, y = from.y + uy * L * u; gc.save(); gc.translate(x, y); gc.rotate(Math.atan2(uy, ux)); gc.scale(0.3, 1); gc.strokeStyle = "#fff3c4"; gc.lineWidth = 3; gc.beginPath(); gc.arc(0, 0, 30 * W, 0, Math.PI * 2); gc.stroke(); gc.restore(); }
      flare(gc, from, 30 * W);
    } });
    await pxTop.add({ dur: 90, draw(gc, k) { W = ease.out(k); } });
    // it sweeps along the floor into the teammate
    await pxTop.add({ dur: 420, draw(gc, k) {
      const e = ease.io(k), t2 = s.dotC();
      aim = { x: lerp(start.x, t2.x, e), y: lerp(start.y, t2.y, e) };
      if (Math.random() < 0.5) fx.shake(8);
      if (k > 0.85 && !hit) {
        hit = true;
        sound.sfx("explosion", { size: 1.4 });
        bigHit(fx, t2, { stop: 160, shake: 30, punch: 0.06, flash: "#ffd9a3" });
        if (toon) explode(toon, t2.x, t2.y, { size: 1.3, dur: 1300 }); else boom(s, t2, { size: 0.9 });
        s.hurt({ crit: true });
      }
    } });
    for (let i = 0; i < 4; i++) { await fx.wait(90); fx.shake(14); g.pose.lunge += 0.01; }
    await pxTop.add({ dur: 260, draw(gc, k) { W = 1 - ease.in(k); } });
    W = 0;
    fx.crack(s.dotC().x, { width: 160 });
    await fx.wait(400);
    fx.letterbox(false); fx.darken(0, 500);
  },
};

// ---- shared bits for his attacks ----
// A lock-on reticle closing in on a point (k: 0 = wide, 1 = locked).
function reticle(gc, at, k, color) {
  const r = 34 * (1 - ease.out(k)) + 13;
  gc.strokeStyle = color; gc.lineWidth = 2.5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { gc.beginPath(); gc.moveTo(at.x + sx * r, at.y + sy * (r - 7)); gc.lineTo(at.x + sx * r, at.y + sy * r); gc.lineTo(at.x + sx * (r - 7), at.y + sy * r); gc.stroke(); }
  if (k >= 1) { gc.fillStyle = color; gc.fillRect(at.x - 1, at.y - 1, 3, 3); }
}
// A star-shaped lens flare.
function flare(gc, at, r) {
  if (r <= 0) return;
  gc.fillStyle = "#fff6e0"; gc.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.18 : r * (i % 4 ? 0.7 : 1.4); i ? gc.lineTo(at.x + Math.cos(a) * rr, at.y + Math.sin(a) * rr) : gc.moveTo(at.x + Math.cos(a) * rr, at.y + Math.sin(a) * rr); }
  gc.closePath(); gc.fill();
}
function flashOn(layer, at, r, ms, color) {
  return layer.add({ dur: ms, draw(gc, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; glow(gc, at.x, at.y, r * 1.2 * f, color, 0.7); flare(gc, at, r * f); } });
}
// A cel dust cloud blasting out along the floor from x.
function dustCloud(toon, x, y, size = 1) {
  const puffs = Array.from({ length: 16 }, (_, i) => ({ dir: i % 2 ? 1 : -1, v: rand(0.4, 1), r: rand(14, 26), h: rand(0, 1) }));
  return toon.add({ dur: 1400, draw(pen, k) {
    const e = ease.out(k);
    for (const p of puffs) pen.puff("smoke", x + p.dir * p.v * 220 * size * e, y - 6 - p.h * 30 * e - 10 * k, p.r * size * (0.6 + k), 1 - k * 0.9, clamp01(k * 1.4 - 0.4));
  } });
}

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

// Typo Swarm (Isaac 2026-10-21: the letter-bugs looked childish; now his mini
// drones): he rears back while the pods charge pink, then three waves of drones
// burst out of the pods and swarm the teammate, circling it (the far side of
// the ring behind it, the near side in front). One after another they lock on
// and zap typos into it, each zap knocking a stray character out; then in slow
// motion they all fire at once, and zip home.
async function typoSwarm(ctx, name) {
  const { fx, dot, golem: g, spr, sprBack, pxTop } = ctx;
  const S = propSprites();
  const core = () => fx.fromPage(g.point("core"));
  const pod = (i) => fx.fromPage(g.pagePoint(PODS[i % PODS.length]));
  const dotC = () => fx.at(dot.figure, { fy: 0.5 });
  fx.letterbox(true); fx.darken(0.5, 500);
  fx.focus(1.12, { x: core().x, y: core().y - 40 }, 800);
  fx.title(g.name || "GOLEM", name);
  g.to({ tilt: 0.38, bob: 0.16, lean: 0.08, ca: -0.3, ce: 1.4, na: -0.3, ne: 1.4, flare: 1.4, thrust: 1.6 }, 700, "out");
  dot.setMood("worried");
  for (let i = 0; i < 6; i++) fx.converge(pod(i), { color: PINK, n: 6, ms: 700, radius: 80, glow: null });
  pxTop.add({ dur: 1000, draw(gc, k, t) { for (let i = 0; i < 6; i++) { const p = pod(i); glow(gc, p.x, p.y, 20 * k * (0.8 + 0.2 * Math.sin(t * 0.05 + i)), PINK, 0.8); } } });
  sound.sfx("servo", { ms: 500 });
  await fx.wait(950);
  fx.focus(1.02, { x: (core().x + dotC().x) / 2, y: dotC().y - 30 }, 400);
  // three waves of drones burst out of the pods
  sound.sfx("droneBuzz", { ms: 5200 }); sound.sfx("droneBuzz", { ms: 5000 });
  const drones = [];
  for (let w = 0; w < 3; w++) {
    g.to({ tilt: 0.5, bob: 0.1 }, 50, "out").then(() => g.to({ tilt: 0.38, bob: 0.16 }, 220, "out"));
    fx.shake(12); fx.flash(0.14, PINK); fx.punch(0.025, core());
    sound.sfx("launch");
    for (let i = 0; i < 4; i++) {
      const p = pod(w * 2 + i);
      fx.smoke(p, 1, 0.55); fx.sparks(p, 4, { colors: [PINK, "#ffffff"], power: 1.1, dir: -1 });
      drones.push({ from: { ...p }, x: p.x, y: p.y, a: (drones.length / 12) * Math.PI * 2 + rand(-0.2, 0.2), rx: rand(64, 104), ry: rand(26, 46), sp: rand(1.6, 2.4) * (Math.random() < 0.5 ? -1 : 1), bob: rand(0, 6), t0: null, home: false, out: 0 });
    }
    await fx.wait(260);
  }
  let orbiting = true;
  const place = (d, t) => {
    const c = dotC(), a = d.a + (t / 1000) * d.sp;
    return { x: c.x + Math.cos(a) * d.rx, y: c.y - 6 + Math.sin(a) * d.ry + Math.sin(t * 0.006 + d.bob) * 3, front: Math.sin(a) > 0 };
  };
  const drawD = (gc, d, t, front) => {
    if (!S || d.front !== front || d.gone) return;
    const c = dotC(), left = d.x > c.x;   // face the teammate
    const f = S.drone[((t / 40) | 0) % 2][left ? 0 : 8], sc = d.front ? 1 : 0.85;
    gc.drawImage(f, Math.round(d.x - f.width * sc / 2), Math.round(d.y - f.height * sc / 2), Math.round(f.width * sc), Math.round(f.height * sc));
  };
  const swarm = { dur: 12000, draw(gc, k, t, a) {
    if (drones.every((d) => d.gone)) { a.t = a.dur; return; }
    for (const d of drones) {
      if (d.home) continue;
      d.t0 ??= t;
      const u = clamp01((t - d.t0) / 420), p = place(d, t);
      if (u < 1) { const e = ease.out(u); d.x = lerp(d.from.x, p.x, e); d.y = lerp(d.from.y, p.y, e) - Math.sin(e * Math.PI) * 60; d.front = true; }
      else { d.x = p.x; d.y = p.y; d.front = p.front; }
    }
    for (const d of drones) drawD(gc, d, t, true);
  } };
  spr.add(swarm);
  sprBack.add({ dur: 12000, draw(gc, k, t, a) { if (drones.every((d) => d.gone)) { a.t = a.dur; return; } for (const d of drones) drawD(gc, d, t, false); } });
  pxTop.add({ dur: 12000, draw(gc, k, t, a) { if (!orbiting) { a.t = a.dur; return; } for (const d of drones) if (!d.gone && d.front && ((t / 140) | 0) % 2) glow(gc, d.x + (d.x > dotC().x ? -9 : 9), d.y + 1, 6, "#ff3a3a", 0.8); } });
  await fx.wait(700);
  dot.swarmed(4200);
  // they zap typos into it, one after another
  const LET = [..."prnti(:)\"'=#{}fx"];
  const zap = async (d, slow = false) => {
    const c = dotC(), hit = { x: c.x + rand(-10, 10), y: c.y + rand(-12, 8) };
    sound.sfx("lockOn", { size: 0.5 });
    await pxTop.add({ dur: slow ? 120 : 50, draw(gc, k) { reticleSmall(gc, hit, k); } });
    sound.sfx("miniLaser");
    pxTop.add({ dur: slow ? 160 : 80, draw(gc, k) {
      const e = { x: d.x + (d.x > c.x ? -9 : 9), y: d.y + 2 };
      glow(gc, e.x, e.y, 10, PINK, 0.9); glow(gc, hit.x, hit.y, 14, PINK, 0.9);
      gc.lineCap = "round"; gc.strokeStyle = "#7a0d3a"; gc.lineWidth = 7; gc.beginPath(); gc.moveTo(e.x, e.y); gc.lineTo(hit.x, hit.y); gc.stroke();
      gc.strokeStyle = PINK; gc.lineWidth = 4; gc.stroke(); gc.strokeStyle = "#ffffff"; gc.lineWidth = 1.5; gc.stroke();
    } });
    fx.sparks(hit, 5, { colors: [PINK, "#ffffff", "#ffb3c8"], power: 0.9 });
    fx.shake(4); dot.nudge(rand(-5, 5), 0.4);
    const ch = LET[Math.floor(Math.random() * LET.length)], vx = rand(-60, 60);
    pxTop.add({ dur: 700, draw(gc, k) {   // a stray character knocked out of it
      gc.globalAlpha = 1 - k; gc.font = "bold 14px ui-monospace, Menlo, monospace"; gc.fillStyle = k < 0.15 ? "#ffffff" : PINK;
      gc.fillText(ch, hit.x + vx * k, hit.y - 40 * ease.out(k)); gc.globalAlpha = 1;
    } });
  };
  for (let i = 0; i < 16; i++) { zap(drones[(i * 5) % drones.length]); await fx.wait(i < 6 ? 150 : 95); }
  // in slow motion, they all fire at once
  fx.focus(1.18, dotC(), 300); fx.slowmo(0.35, 700);
  sound.sfx("lockOn");
  await pxTop.add({ dur: 160, draw(gc, k) { reticle(gc, dotC(), k, PINK); } });
  sound.sfx("miniLaser", { size: 1.4 }); sound.sfx("bite");
  impactFrame(fx, { ms: 60 }); fx.hitstop(140); fx.shake(18); fx.flash(0.25, PINK);
  const c0 = dotC();
  pxTop.add({ dur: 260, draw(gc, k) {
    for (const d of drones) { if (d.gone) continue; const e = { x: d.x + (d.x > c0.x ? -9 : 9), y: d.y + 2 }; gc.strokeStyle = PINK; gc.lineWidth = 4 * (1 - k); gc.beginPath(); gc.moveTo(e.x, e.y); gc.lineTo(c0.x, c0.y); gc.stroke(); gc.strokeStyle = "#ffffff"; gc.lineWidth = 1.5 * (1 - k); gc.stroke(); }
    glow(gc, c0.x, c0.y, 50 * (1 - k), PINK, 0.9);
  } });
  fx.ring(c0, { color: PINK, size: 120, flat: 0.5, ms: 360, width: 4 });
  for (let i = 0; i < 10; i++) zapGlyph(pxTop, c0, i);
  await fx.wait(600);
  // and zip home to the pods
  orbiting = false;
  fx.focus(1, null, 500);
  await Promise.all(drones.map((d, i) => fx.wait(i * 25).then(() => pxTop.add({ dur: 280, draw(gc, k) { const p = pod(i), e = ease.in(k); d.x = lerp(d.x, p.x, e); d.y = lerp(d.y, p.y, e); d.home = true; d.front = true; } })).then(() => { d.gone = true; })));
  fx.letterbox(false); fx.darken(0, 500);
  g.rest(600);
  await fx.wait(500);
}
function reticleSmall(gc, at, k) {
  const r = 18 * (1 - ease.out(k)) + 7;
  gc.strokeStyle = PINK; gc.lineWidth = 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { gc.beginPath(); gc.moveTo(at.x + sx * r, at.y + sy * (r - 4)); gc.lineTo(at.x + sx * r, at.y + sy * r); gc.lineTo(at.x + sx * (r - 4), at.y + sy * r); gc.stroke(); }
}
function zapGlyph(layer, at, i) {
  const ch = [..."#%&@?!~{}"][i % 9], a = (i / 10) * Math.PI * 2, v = rand(50, 90);
  layer.add({ dur: 800, draw(gc, k) { gc.globalAlpha = 1 - k; gc.font = "bold 16px ui-monospace, Menlo, monospace"; gc.fillStyle = i % 2 ? PINK : "#ffffff"; gc.fillText(ch, at.x + Math.cos(a) * v * ease.out(k), at.y + Math.sin(a) * v * ease.out(k) + 30 * k * k); gc.globalAlpha = 1; } });
}

// Glitch Text (Isaac 2026-10-21: more cinematic; the old static sound clapped):
// his eye blazes and code rains down the whole screen while the picture
// tears; then a torrent of glyphs blasts out of his eye into the teammate,
// Python error windows pop up all round it, and the whole thing shatters into
// pixels while a wave of corrupted blocks rolls along the floor.
async function glitchText(ctx, name) {
  const { fx, dot, golem: g, pxTop } = ctx;
  const core = () => fx.fromPage(g.point("core"));
  const dotC = () => fx.at(dot.figure, { fy: 0.5 });
  // Red/cyan colour split on the two fighters (not the whole arena, which would tint the darkening too).
  const chroma = (px) => { for (const e of [g.canvas, ctx.mateEl]) e.style.filter = px ? `drop-shadow(${px}px 0 rgba(255,60,120,.8)) drop-shadow(${-px}px 0 rgba(60,230,255,.8))` : ""; };
  fx.letterbox(true); fx.darken(0.65, 400);
  fx.focus(1.14, core(), 800);
  fx.title(g.name || "GOLEM", name);
  g.to({ flare: 2.2, tilt: -0.25, bob: 0.25, ca: 0.6, ce: 0.2, na: 0.6, ne: 0.2, thrust: 1.6 }, 700, "out");
  dot.setMood("worried");
  sound.sfx("dataStream", { ms: 1300 }); sound.sfx("laserCharge", { ms: 1100 });
  fx.converge(core(), { color: CYAN, n: 30, ms: 1000, radius: 240, glow: null });
  // code raining down the whole screen, thickening
  const cols = Array.from({ length: 40 }, (_, i) => ({ x: (i / 40) * fx.w + rand(-6, 6), sp: rand(120, 260), off: rand(0, 400), len: Math.floor(rand(5, 14)) }));
  const GL = [..."01#%&@<>/\\{}[]=;:$?!*~ABCDEFabcdef"];
  let rain = 0;
  pxTop.add({ dur: 3800, draw(gc, k, t, a) {
    if (rain <= 0 && k > 0.3) { a.t = a.dur; return; }
    gc.font = "bold 11px ui-monospace, Menlo, monospace";
    for (const [i, c] of cols.entries()) {
      if (i / cols.length > rain) continue;
      const head = ((t / 1000) * c.sp + c.off) % (fx.h + 200) - 100;
      for (let j = 0; j < c.len; j++) {
        const y = head - j * 12; if (y < 0 || y > fx.h) continue;
        gc.globalAlpha = (1 - j / c.len) * 0.9 * Math.min(1, rain * 1.5);
        gc.fillStyle = j === 0 ? "#ffffff" : (i + j) % 5 ? CYAN : PINK;
        gc.fillText(GL[(i * 7 + j * 3 + ((t / 90) | 0)) % GL.length], c.x, y);
      }
    }
    gc.globalAlpha = 1;
  } });
  await pxTop.add({ dur: 500, draw(gc, k) { rain = k; } });
  for (let k = 0; k < 8; k++) fx.wait(k * 70).then(() => {
    g.fxv.glitch = 0.8 + k * 0.2; g.to({ glitch: 0 }, 100, "lin", g.fxv);
    chroma(k % 2 ? 2 + k * 0.6 : 0); fx.shake(3 + k * 0.6);
    tearBars(pxTop, 3 + k, 90);
    sound.sfx("glitch");
  });
  await fx.wait(600);
  fx.focus(1.02, { x: (core().x + dotC().x) / 2, y: dotC().y - 30 }, 220);

  // Release: the torrent of glyphs
  chroma(6);
  impactFrame(fx, { ms: 60, frames: 2 });
  fx.flash(0.5, CYAN); fx.hitstop(140); fx.shake(26); fx.punch(0.05, core());
  sound.sfx("screech"); sound.sfx("dataStream", { ms: 1400, size: 1.3 });
  g.to({ tilt: -0.42, lunge: 0.12, flare: 2.6 }, 100, "out");
  fx.ring(core(), { color: CYAN, size: 240, ms: 420, width: 6 });
  const from = core();
  const stream = Array.from({ length: 90 }, (_, i) => ({ d: i * 14, ph: rand(0, 6), off: rand(-1, 1), ch: GL[Math.floor(Math.random() * GL.length)], sz: rand(11, 20) }));
  let hitOnce = false;
  pxTop.add({ dur: 1500, draw(gc, k, t) {
    const to = dotC(), L = Math.hypot(to.x - from.x, to.y - from.y), ux = (to.x - from.x) / L, uy = (to.y - from.y) / L;
    glow(gc, from.x, from.y, 40, CYAN, 0.7);
    for (const q of stream) {
      const u = (t - q.d) / 420; if (u < 0 || u > 1) continue;
      const tube = Math.sin(u * Math.PI) * 26 * q.off + Math.sin(u * 14 + q.ph) * 6, x = from.x + ux * L * u - uy * tube, y = from.y + uy * L * u + ux * tube;
      gc.font = `bold ${q.sz | 0}px ui-monospace, Menlo, monospace`; gc.fillStyle = u > 0.92 ? "#ffffff" : q.d % 3 ? CYAN : PINK;
      gc.fillText(q.ch, x, y);
      if (u > 0.95 && !hitOnce) { hitOnce = true; fx.hitstop(60); fx.shake(14); fx.flash(0.15, PINK); }
    }
  } });
  corruptionWave(fx, core().x, dotC().x);
  // Python error windows popping up round the teammate
  const ERR = ["SyntaxError", "NameError", "TypeError", "IndentationError", "ValueError", "KeyError"];
  const wins = [];
  for (let i = 0; i < 6; i++) fx.wait(300 + i * 140).then(() => {
    const c = dotC();
    wins.push({ x: c.x + rand(-120, 60), y: c.y - rand(20, 120), txt: ERR[i], born: performance.now() });
    sound.sfx("errorPop"); fx.shake(6); dot.nudge(rand(-6, 6), 0.4);
  });
  let shatter = 0;
  const winActor = { dur: 2600, draw(gc, k, t, a) {
    for (const [i, w] of wins.entries()) {
      w.t0 ??= t;
      const pop = ease.back(clamp01((t - w.t0) / 140)), jx = ((t / 60) | 0) % 2 ? 1 : -1;
      if (shatter > 0) { // shattering into pixel blocks
        for (let b = 0; b < 14; b++) { const ang = b * 2.4 + i, r = shatter * (30 + (b % 5) * 18); gc.globalAlpha = 1 - shatter; gc.fillStyle = b % 3 ? "#1a1d2e" : b % 2 ? PINK : CYAN; gc.fillRect(w.x + 46 + Math.cos(ang) * r, w.y + 14 + Math.sin(ang) * r + 40 * shatter * shatter, 6, 5); }
        gc.globalAlpha = 1; continue;
      }
      gc.save(); gc.translate(w.x + 46 + jx, w.y + 14); gc.scale(pop, pop); gc.translate(-46, -14);
      gc.fillStyle = "#0b0d16"; gc.fillRect(0, 0, 92, 30);               // the window
      gc.fillStyle = i % 2 ? PINK : "#d02a4a"; gc.fillRect(0, 0, 92, 9); // its title bar
      gc.fillStyle = "#ffffff"; gc.fillRect(84, 2, 5, 5);
      gc.strokeStyle = CYAN; gc.lineWidth = 1; gc.strokeRect(0.5, 0.5, 91, 29);
      gc.font = "bold 9px ui-monospace, Menlo, monospace"; gc.fillStyle = "#ffffff"; gc.fillText(w.txt, 5, 22);
      gc.restore();
    }
  } };
  pxTop.add(winActor);
  for (let k = 0; k < 6; k++) fx.wait(k * 170).then(() => { tearBars(pxTop, 6, 110); chroma(k % 2 ? 7 : 3); dot.nudge(-3, 0.25); sound.sfx("glitch"); });
  await fx.wait(1500);
  // everything shatters
  rain = 0;
  sound.sfx("shatter"); sound.sfx("glitch");
  impactFrame(fx, { ms: 50 }); fx.shake(18); fx.flash(0.2, CYAN);
  await pxTop.add({ dur: 500, draw(gc, k) { shatter = ease.out(k); } });
  winActor.t = winActor.dur;
  g.fxv.glitch = 2; g.to({ glitch: 0 }, 700, "lin", g.fxv);
  tearBars(pxTop, 14, 160); fx.shake(10);
  await fx.wait(300);
  chroma(0);
  fx.letterbox(false); fx.darken(0, 500); fx.focus(1, null, 500);
  g.rest(700);
  await fx.wait(700);
}

// Tearing bars across the picture: slabs of colour shifted sideways for a moment.
function tearBars(layer, n, ms) {
  const bars = Array.from({ length: n }, () => ({ y: rnd(0, layer.h), h: rnd(2, 12), w: rnd(layer.w * 0.15, layer.w * 0.8), x: rnd(-50, layer.w * 0.6), c: pickOne([CYAN, PINK, "#ffffff", "#0b0910", "#0b0910"]), a: rnd(0.4, 0.9) }));
  layer.add({ dur: ms, draw(gc) { for (const b of bars) { gc.globalAlpha = b.a; gc.fillStyle = b.c; gc.fillRect(b.x + rnd(-16, 16), b.y, b.w, b.h); } gc.globalAlpha = 1; } });
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
