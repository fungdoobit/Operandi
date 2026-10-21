// PYRO's ability kit (PRD Addendum I): fire. See abilities.js for how a scene
// is called and the s object it gets.
import { ease, lerp, glow, starFlash } from "./pixel/pixel-fx.js";
import { explode } from "./pixel/toon-fx.js";
import { sound } from "./sound.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- PYRO ----

// PYRO's fire is painted into the heat channel of the toon layer
// (pixel/toon-fx.js): hard bands from white-hot to deep red, flames licking
// upward, and the shared cel explosion (explode) on impact.

// A ring of fire standing upright round PYRO (after Isaac's archer reference):
// traced from the bottom up both sides (drawn 0..1), then blazing, flame
// tongues licking outward and up; burst flings it apart.
function fireRing(pen, c, rx, ry, drawn, power, burst, t) {
  const N = 48;
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1, v = Math.floor(i / 2) / (N / 2 - 1);   // 0 at the bottom, 1 at the top
    if (v > drawn) continue;
    const a = Math.PI / 2 + side * v * Math.PI, ex = Math.cos(a), ey = Math.sin(a);
    const out = 1 + burst * 1.6, fl = 0.8 + 0.2 * Math.sin(t * 0.02 + i * 1.7);
    const x = c.x + ex * rx * out, y = c.y + ey * ry * out, amt = (0.62 + power * 0.42) * (1 - burst);
    pen.puff("heat", x, y, (8 + power * 4) * fl * (1 + burst * 0.6), amt);
    if (i % 3 === 0) {   // a tongue licking outward and up
      let dx = ex * 0.8, dy = ey * 0.8 - 0.9; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      const L = (12 + 14 * Math.abs(Math.sin(t * 0.013 + i))) * (0.7 + power * 0.6) * (1 - burst * 0.5);
      for (let j = 1; j <= 4; j++) pen.puff("heat", x + dx * L * j / 4 + Math.sin(t * 0.01 + i) * j, y + dy * L * j / 4, 7 - j * 1.2, amt * (1 - j * 0.12));
    }
    if (Math.abs(v - drawn) < 0.05 && drawn < 1) pen.puff("heat", x, y, 14, 1.2);   // the white-hot leading tip
  }
}

// Sunfire Halo: a ring of fire blazes up round PYRO, a sun gathers in his
// hands, and he fires it: a roaring wave of fire that hits GOLEM in a huge cel
// explosion.
async function sunfireHalo(s) {
  const { fx, px, toon, mate: dot, mateEl } = s;
  const core = s.golemC(), home = mateEl._pos || { x: 0, y: 0, r: 0 };
  const c0 = s.mateC(), ringC = { x: c0.x + 4, y: c0.y - 8 }, orb = { x: c0.x + 58, y: c0.y - 4 };
  dot.clearTimers?.(); dot.setMood("fierce");
  // 1. the ring of fire traces itself round him
  let drawn = 0, power = 0.3, burst = 0, orbR = 0, firing = false;
  sound.sfx("flameIgnite");
  fx.darken(0.5, 500);
  fx.focus(1.1, { x: c0.x + 50, y: c0.y - 20 }, 600);
  dot.sx.t = 1.12; dot.sy.t = 0.9; dot.lean.t = -0.08; dot.energy = 1.3;
  const ring = toon.add({ dur: 1500, draw(pen, k, t) {
    fireRing(pen, ringC, 60, 84, drawn, power, burst, t);
    for (let i = 0; i < 10; i++) {   // embers rising off the floor round him
      const u = (t * 0.0012 + i * 0.1) % 1;
      pen.puff("heat", ringC.x + Math.sin(i * 2.7) * 70, fx.floorY - u * 120, 3.2 * (1 - u), 1.1 * (1 - u) * (1 - burst));
    }
  } });
  await toon.add({ dur: 420, draw(pen, k) { drawn = ease.out(k); } });
  // 2. a sun gathers in front of him: fire spirals in, the ring roars higher
  sound.sfx("laserCharge", { ms: 520 });
  fx.shake(4);
  const sun = toon.add({ dur: 760, draw(pen, k, t) {
    if (firing) return;
    for (let i = 0; i < 9; i++) {   // fire spiralling into it
      const u = (k * 2.2 + i / 9) % 1, a = i * 0.7 + u * 5, r = (1 - u) * 80 + orbR;
      pen.puff("heat", orb.x + Math.cos(a) * r, orb.y + Math.sin(a) * r * 0.8, 5 + u * 4, 0.9);
    }
    pen.puff("heat", orb.x, orb.y, orbR * 1.6, 1.25);
    pen.puff("heat", orb.x, orb.y, orbR * 2.6, 0.5);
  } });
  await toon.add({ dur: 560, draw(pen, k) { orbR = 22 * ease.out(k); power = 0.3 + 0.7 * k; } });
  // 3. FIRE: a white flash, the ring bursts, and a wave of fire roars across
  firing = true;
  fx.hitstop(80); fx.shake(16); fx.punch(0.04, orb); fx.flash(0.3, "#ffd28a");
  sound.sfx("whoosh", { theme: "fire" }); sound.sfx("explosion", { size: 0.5 });
  px.add({ dur: 240, z: 5, draw(g, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; starFlash(g, orb.x, orb.y, 95 * f); } });
  fx.ring(orb, { color: "#ffe2a0", size: 120, flat: 1, ms: 300, width: 6 });
  toon.add({ dur: 300, draw(pen, k) { burst = ease.out(k); } });
  dot.sx.s = 0.8; dot.sy.s = 1.22; dot.lean.t = -0.25;
  fx.move(mateEl, { x: home.x - 18, y: home.y }, 90, "out").then(() => fx.move(mateEl, { x: home.x, y: home.y }, 360, "inOut"));
  fx.focus(1.03, { x: (orb.x + core.x) / 2, y: core.y }, 260);
  const head = { ...orb }, trail = [];
  let flying = true;
  const wave = toon.add({ dur: 1300, draw(pen, k, t) {
    if (flying) {   // lay a dense trail behind the head
      const last = trail[trail.length - 1] || { x: orb.x, y: orb.y };
      const n = Math.max(1, Math.floor(Math.hypot(head.x - last.x, head.y - last.y) / 7));
      for (let i = 1; i <= n; i++) {
        const x = lerp(last.x, head.x, i / n), u = clamp01((x - orb.x) / (core.x - orb.x));
        trail.push({ x, y: lerp(last.y, head.y, i / n) + rand(-1, 1) * (4 + 10 * u), t, j: rand(-1, 1), u, r: rand(0.7, 1.3) });
      }
    }
    for (const [i, p] of trail.entries()) {
      const age = (t - p.t) / (420 + 380 * p.u); if (age > 1) continue;   // the tail burns out first
      const x = p.x - age * 14, y = p.y + p.j * age * 26 - age * 30;
      pen.puff("heat", x, y, (10 + 26 * p.u + 22 * age) * p.r, 0.78 + 0.3 * p.u - age * 0.95);
      if (i % 3 === 0 && age < 0.75) {   // deep red licks sweeping off the wave, up and back
        const L = (24 + 40 * p.u) * (0.6 + age), dir = p.j > 0 ? 1 : -1;
        pen.limb("heat", [[x, y], [x - L * 0.4, y - dir * L * 0.35], [x - L * 0.9, y - dir * L * 0.7 - 10]], 9 + 8 * p.u, 1, 0.34 * (1 - age));
      }
      if (age > 0.3) pen.puff("smoke", x - 6, y - 14 - age * 20, 14 + 22 * age, (age - 0.3) * 2.4 * (1 - age), clamp01((age - 0.5) * 2));
    }
    if (flying) {   // the head: a roaring fireball with flames streaming back off it
      pen.puff("heat", head.x, head.y, 40, 1.25);
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.45; pen.limb("heat", [[head.x, head.y], [head.x + Math.cos(a) * 40, head.y + Math.sin(a) * 30 - 8], [head.x + Math.cos(a) * 70, head.y + Math.sin(a) * 44 - 22]], 16, 2, 0.55); }
    }
  } });
  await toon.add({ dur: 200, draw(pen, k) { const e = ease.in(k); head.x = lerp(orb.x, core.x - 10, e); head.y = lerp(orb.y, core.y, e) - Math.sin(e * Math.PI) * 16; } });
  flying = false;
  // 4. impact: freeze, the big shake and punch, a huge cel explosion
  sound.sfx("explosion", { size: 1.4 });
  fx.hitstop(170); fx.shake(26); fx.punch(0.07, core); fx.flash(0.45, "#ffb040");
  s.onHit(1);
  explode(toon, core.x - 10, core.y, { size: 1.7, dur: 1700 });
  fx.debris(core, 12, { power: 1.5, dir: 1 }); fx.sparks(core, 18, { power: 1.6, dir: 1 });
  await fx.wait(260);
  // a second and third blast as it detonates fully
  fx.hitstop(90); fx.shake(16); fx.punch(0.03, core);
  sound.sfx("explosion", { size: 0.9 });
  s.onHit(2);
  explode(toon, core.x + 36, core.y - 34, { size: 0.9 });
  await fx.wait(140);
  explode(toon, core.x - 46, core.y + 24, { size: 0.75 });
  fx.shake(10);
  dot.lean.t = 0;
  await fx.wait(500);
  fx.darken(0, 500); fx.focus(1, null, 500);
  dot.sx.t = 1; dot.sy.t = 1; dot.setMood("idle");
  await Promise.all([ring, sun, wave]);
}

// ---- shared bits for PYRO's moves ----

// A fireball flying from one point to another with a tail of fire and smoke.
// Resolves when it arrives.
function fireShot(toon, from, to, ms, { r = 12, arc = 0, smoke = true } = {}) {
  const trail = [];
  const pos = (u) => ({ x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * arc });
  toon.add({ dur: ms + 600, draw(pen, k, t) {
    const u = Math.min(1, t / ms);
    if (u < 1) {
      const last = trail[trail.length - 1], p = pos(ease.in(u) * 0.5 + u * 0.5);
      const n = last ? Math.max(1, Math.floor(Math.hypot(p.x - last.x, p.y - last.y) / 6)) : 1;
      for (let i = 1; i <= n; i++) trail.push({ x: last ? lerp(last.x, p.x, i / n) : p.x, y: last ? lerp(last.y, p.y, i / n) : p.y, t, j: rand(-1, 1) });
      pen.puff("heat", p.x, p.y, r * 2, 1.3); pen.puff("heat", p.x, p.y, r * 3.2, 0.45);
    }
    const life = Math.min(380, ms * 0.55 + 40);   // a short tail on a quick shot, a long one on a comet
    for (const [i, q] of trail.entries()) {
      const age = (t - q.t) / life; if (age > 1.6) continue;
      if (age < 1) pen.puff("heat", q.x - age * 6, q.y + q.j * age * 10 - age * 12, r * (1.5 - age * 0.9), 1.1 - age * 1.1);
      if (smoke && age > 0.5 && i % 2) pen.puff("smoke", q.x - 8, q.y - age * 22, r * (0.6 + age * 0.7), (age - 0.5) * 1.6 * (1.6 - age), clamp01(age - 0.9));
    }
  } });
  return toon.wait(ms);
}

// A white star-flash over the fire.
function flashAt(pxTop, at, r, ms = 240) {
  return pxTop.add({ dur: ms, draw(g, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; glow(g, at.x, at.y, r * 1.1 * f, "#ff9a3c", 0.6); starFlash(g, at.x, at.y, r * f, "#fff6d8"); } });
}

// Squash, stretch and lean on PYRO's springy body (dot.js).
function pose(dot, { sx = 1, sy = 1, lean = 0, kick = false } = {}) {
  if (kick) { dot.sx.s = sx; dot.sy.s = sy; } else { dot.sx.t = sx; dot.sy.t = sy; }
  dot.lean.t = lean;
}

// ---- Ember Shot (basic) ----
async function emberShot(s) {
  const { fx, toon, pxTop, mate: dot } = s;
  const c = s.mateC(), core = s.golemC(), from = { x: c.x + 40, y: c.y - 4 };
  dot.clearTimers?.(); dot.setMood("fierce");
  pose(dot, { sx: 1.15, sy: 0.88, lean: -0.1 });
  sound.sfx("flameIgnite");
  toon.add({ dur: 260, draw(pen, k, t) {
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 0.02, d = 30 * (1 - k) + 6; pen.puff("heat", from.x + Math.cos(a) * d, from.y + Math.sin(a) * d, 4, 0.9); }
    pen.puff("heat", from.x, from.y, 14 * ease.out(k), 1.2);
  } });
  await fx.wait(250);
  pose(dot, { sx: 0.82, sy: 1.2, lean: 0.2, kick: true });
  sound.sfx("whoosh", { theme: "fire" }); fx.shake(4);
  await fireShot(toon, from, { x: core.x - 8, y: core.y }, 220, { r: 10, arc: 14 });
  sound.sfx("explosion", { size: 0.6 }); fx.hitstop(70); fx.shake(11); fx.punch(0.025, core);
  explode(toon, core.x - 8, core.y, { size: 0.7, dur: 1100 });
  flashAt(pxTop, core, 44);
  s.onHit(1);
  await fx.wait(160);
  explode(toon, core.x + 18, core.y - 16, { size: 0.4, dur: 800 });
  fx.shake(7); s.onHit(2);
  pose(dot, {});
  await fx.wait(400);
  dot.setMood("idle");
}

// ---- Crescent Wave (light) ----
// He whips a crescent of fire off his body; it skims the floor, scattering
// embers, and slices into GOLEM.
function crescent(pen, m, R, amt, t, dir = 1) {
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, a = (u - 0.5) * 2.3, thick = Math.cos((u - 0.5) * Math.PI);
    pen.puff("heat", m.x + Math.cos(a) * R * dir, m.y + Math.sin(a) * R, 3 + 13 * thick, amt * (0.5 + 0.42 * thick));
  }
  for (let i = 0; i < 3; i++) {   // flames streaming back off its tips and middle
    const a = (i - 1) * 0.9, x = m.x + Math.cos(a) * R * dir, y = m.y + Math.sin(a) * R;
    pen.limb("heat", [[x, y], [x - 20 * dir, y - 6 + Math.sin(t * 0.03 + i) * 4], [x - 44 * dir, y - 16]], 8, 1, 0.45 * amt);
  }
}
async function crescentWave(s) {
  const { fx, toon, pxTop, mate: dot } = s;
  const c = s.mateC(), core = s.golemC(), y = Math.min(core.y + 20, fx.floorY - 46);
  dot.clearTimers?.(); dot.setMood("fierce");
  pose(dot, { sx: 0.9, sy: 1.1, lean: -0.28 });
  sound.sfx("flameIgnite");
  await fx.wait(240);
  pose(dot, { sx: 1.25, sy: 0.82, lean: 0.32, kick: true });
  sound.sfx("slash", { theme: "fire" }); fx.shake(8); fx.hitstop(50);
  const m = { x: c.x + 50, y }, x0 = m.x, x1 = core.x - 40, trail = [];
  let live = 1;
  const wave = toon.add({ dur: 900, draw(pen, k, t) {
    if (live) {
      const last = trail[trail.length - 1], n = last ? Math.max(1, Math.floor((m.x - last.x) / 6)) : 1;
      for (let i = 1; i <= n; i++) trail.push({ x: last ? lerp(last.x, m.x, i / n) : m.x, y: m.y, t, j: rand(-1, 1) });
      crescent(pen, m, 58, 1.05, t);
    }
    for (const p of trail) {
      const age = (t - p.t) / 300; if (age > 1) continue;
      pen.puff("heat", p.x - 36, p.y + p.j * 26 * (0.4 + age), 14 * (1 - age), 0.85 * (1 - age));
      if (age > 0.4) if (p.j > 0.3) pen.puff("smoke", p.x - 40, p.y - 16 - age * 18, 10 + 10 * age, (age - 0.4) * 1.6 * (1 - age), clamp01((age - 0.6) * 2));
    }
  } });
  await toon.add({ dur: 340, draw(pen, k) { m.x = lerp(x0, x1, ease.in(k) * 0.4 + k * 0.6); } });
  live = 0;
  sound.sfx("explosion", { size: 1 });
  fx.hitstop(100); fx.shake(16); fx.punch(0.04, core); fx.flash(0.2, "#ffb040");
  explode(toon, core.x - 20, y - 6, { size: 1, dur: 1300 });
  pxTop.add({ dur: 300, draw(g, k) {   // the slice left hanging in the air
    g.globalAlpha = 1 - k; g.strokeStyle = "#fff6d8"; g.lineWidth = 5 * (1 - k);
    g.beginPath(); g.arc(core.x - 70, y - 6, 58, -1.1, 1.1); g.stroke(); g.globalAlpha = 1;
  } });
  s.onHit(1);
  await fx.wait(140);
  explode(toon, core.x + 20, core.y - 20, { size: 0.55, dur: 900 });
  fx.shake(9); s.onHit(2);
  pose(dot, {});
  await fx.wait(400);
  dot.setMood("idle");
  await wave;
}

// ---- Eruption (medium) ----
// He stomps; a glowing crack races along the floor to GOLEM, the ground
// rumbles, and a volcanic pillar of fire blasts up through him with rings of
// fire, then dies down into smoke.
async function eruption(s) {
  const { fx, toon, pxTop, mate: dot, foeEl } = s;
  const c = s.mateC(), core = s.golemC(), floor = fx.floorY, cx = core.x - 10;
  dot.clearTimers?.(); dot.setMood("fierce");
  // the stomp
  dot.jump.v = -6; pose(dot, { sx: 0.85, sy: 1.18 });
  sound.sfx("flameIgnite");
  await fx.wait(300);
  pose(dot, { sx: 1.35, sy: 0.72, kick: true });
  sound.sfx("impact", { size: 0.9 }); fx.shake(12); fx.hitstop(60); fx.dust(c.x, 10, 1.2);
  // the crack racing to him
  const crack = [[c.x + 20, floor + 2]];
  while (crack[crack.length - 1][0] < cx) { const [x, y] = crack[crack.length - 1]; crack.push([x + rand(14, 26), floor + 2 + rand(-3, 3)]); }
  let run = 0, glowAmt = 0, pillar = 0, die = 0, rings = [];
  toon.add({ dur: 2600, draw(pen, k, t) {
    const n = Math.floor(crack.length * run);
    if (n > 1) pen.line("heat", crack.slice(0, n), 4, 0.95 * (1 - die));
    if (glowAmt > 0) { pen.oval("heat", cx, floor, 70 * glowAmt, 12 * glowAmt, 0.8 * glowAmt * (1 - die)); }
    if (pillar > 0) {
      const top = floor - (floor + 40) * pillar;
      for (let y = floor; y > top; y -= 9) {
        const u = (floor - y) / (floor + 40);
        const x = cx + Math.sin(y * 0.045 + t * 0.02) * 9 + Math.sin(y * 0.11 - t * 0.03) * 5;
        pen.puff("heat", x, y, (30 + u * 26) * (1 - die * 0.6), (0.3 - u * 0.1) * (1 - die));   // overlapping puffs add up, so each is faint
        if (die > 0) pen.puff("smoke", x + rand(-6, 6), y - die * 40, 22 + u * 20, die * 0.9 * (1.3 - die), clamp01(die - 0.3));
      }
      for (const r of rings) { const a = clamp01((t - r.t) / 520); if (a < 1) pen.oval("heat", cx, r.y - a * 80, 44 + a * 100, (44 + a * 100) * 0.24, 1.15 * (1 - a), 0.7); }
    }
  } });
  sound.sfx("whoosh", { theme: "fire" });
  await toon.add({ dur: 300, draw(pen, k) { run = ease.in(k); } });
  // the rumble
  for (let i = 0; i < 3; i++) { fx.shake(5 + i * 2); sound.sfx("impact", { size: 0.35 }); s.golem.to({ bob: 0.03 * (i % 2 ? 1 : -1) }, 90); await toon.add({ dur: 110, draw(pen, k) { glowAmt = (i + k) / 3; } }); }
  // ERUPT
  sound.sfx("explosion", { size: 1.5 });
  fx.hitstop(140); fx.shake(28); fx.punch(0.06, core); fx.flash(0.4, "#ffb040");
  flashAt(pxTop, { x: cx, y: floor - 10 }, 90);
  fx.debris({ x: cx, y: floor }, 14, { power: 1.6 });
  const home = foeEl._pos || { x: 0, y: 0, r: 0 };
  fx.move(foeEl, { x: home.x, y: home.y - 26 }, 160, "out");
  s.golem.to({ lean: -0.12, tilt: -0.1 }, 160, "out");
  rings.push({ t: 0, y: floor - 30 });
  const pt = toon.add({ dur: 2000, draw(pen, k, t) { if (k === 0) return; } });
  await toon.add({ dur: 150, draw(pen, k) { pillar = ease.out(k); } });
  s.onHit(1);
  explode(toon, cx, core.y, { size: 1.1, dur: 1200 });
  await fx.wait(300);
  // a second surge
  sound.sfx("explosion", { size: 1 });
  fx.hitstop(80); fx.shake(18);
  rings.push({ t: 2600 * 0 + 0, y: floor - 90 });
  s.onHit(2);
  explode(toon, cx + 10, core.y - 50, { size: 0.8, dur: 1000 });
  await fx.wait(380);
  fx.move(foeEl, { x: home.x, y: home.y }, 360, "inOut");
  s.golem.rest(500);
  await toon.add({ dur: 700, draw(pen, k) { die = k; } });
  pillar = 0;
  pose(dot, {});
  dot.setMood("idle");
  void pt;
}

// ---- Comet Kick (medium) ----
// He leaps, a fireball gathers in front of him, and he kicks it into GOLEM as
// a comet with a long tail of fire and smoke.
async function cometKick(s) {
  const { fx, toon, pxTop, mate: dot, mateEl } = s;
  const core = s.golemC(), home = mateEl._pos || { x: 0, y: 0, r: 0 };
  dot.clearTimers?.(); dot.setMood("fierce");
  pose(dot, { sx: 1.28, sy: 0.74, lean: -0.12 }); dot.energy = 1.3;
  sound.sfx("flameIgnite");
  await fx.wait(220);
  pose(dot, { sx: 0.8, sy: 1.25, kick: true }); pose(dot, { lean: -0.12 });
  fx.move(mateEl, { x: home.x + 30, y: home.y - 110 }, 300, "out");
  fx.dust(s.mateC().x, 6, 1);
  fx.focus(1.08, { x: s.mateC().x + 60, y: s.mateC().y - 60 }, 450);
  await fx.wait(260);
  fx.slowmo(0.35, 520);
  let ball = 0, at = null;
  const sun = toon.add({ dur: 900, draw(pen, k, t) {
    if (!ball) return;
    const c = s.mateC(), p = at || { x: c.x + 58, y: c.y - 4 };
    for (let i = 0; i < 8; i++) { const a = i * 0.8 + t * 0.016, d = 26 * ball + 30 * (1 - ball) + (i % 3) * 5; pen.puff("heat", p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 5, 0.85); }
    pen.puff("heat", p.x, p.y, 26 * ball, 1.3);
    pen.puff("heat", p.x, p.y, 44 * ball, 0.5);
  } });
  await toon.add({ dur: 420, draw(pen, k) { ball = ease.out(k); } });
  // the kick
  const c = s.mateC(), from = { x: c.x + 58, y: c.y - 4 };
  ball = 0;
  pose(dot, { sx: 1.35, sy: 0.75, lean: 0.3, kick: true });
  fx.hitstop(70); fx.shake(12); fx.punch(0.03, from); flashAt(pxTop, from, 60);
  fx.ring(from, { color: "#fff3c4", size: 90, flat: 1, ms: 260, width: 5 });
  sound.sfx("whoosh", { theme: "fire" });
  fx.focus(1.02, { x: (from.x + core.x) / 2, y: core.y }, 300);
  await fireShot(toon, from, { x: core.x - 10, y: core.y }, 260, { r: 20, arc: 30 });
  sound.sfx("explosion", { size: 1.4 });
  fx.hitstop(170); fx.shake(26); fx.punch(0.07, core); fx.flash(0.4, "#ffb040");
  explode(toon, core.x - 10, core.y, { size: 1.35, dur: 1500 });
  flashAt(pxTop, core, 70);
  fx.debris(core, 12, { power: 1.5, dir: 1 }); fx.sparks(core, 18, { power: 1.6, dir: 1 });
  s.onHit(1);
  await fx.wait(240);
  fx.hitstop(90); fx.shake(16); fx.punch(0.03, core);
  explode(toon, core.x + 30, core.y - 30, { size: 0.8 });
  s.onHit(2);
  fx.move(mateEl, { x: home.x, y: home.y }, 420, "in").then(() => { fx.dust(s.mateC().x, 5, 0.8); pose(dot, { sx: 1.25, sy: 0.8, kick: true }); pose(dot, {}); });
  await fx.wait(450);
  fx.focus(1, null, 500);
  dot.setMood("idle");
  await sun;
}

// ---- Meteor Rain (ultimate) ----
// The sky burns red. Target circles lock onto the floor round GOLEM, then
// meteors with long trails slam down one after another; the last one hits him
// square in the core.
async function meteorRain(s) {
  const { fx, px, toon, pxTop, mate: dot } = s;
  const core = s.golemC(), floor = fx.floorY;
  fx.letterbox(true); fx.darken(0.6, 500); fx.flash(0.18, "#ff4010");
  fx.title("METEOR RAIN", "PYRO · ultimate");
  dot.clearTimers?.(); dot.setMood("fierce");
  dot.jump.v = -5; pose(dot, { sx: 0.85, sy: 1.2, lean: -0.1 }); dot.energy = 1.5;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 900 });
  const c = s.mateC();
  toon.add({ dur: 1100, draw(pen, k, t) {   // he blazes up as he calls them down
    for (let i = 0; i < 7; i++) { const u = (t * 0.0014 + i / 7) % 1; pen.puff("heat", c.x + Math.sin(i * 2.3) * 26, c.y + 20 - u * 80, 7 * (1 - u), 1.1 * (1 - u) * Math.min(1, k * 4) * (1 - k)); }
  } });
  const targets = [
    { x: core.x - 150, y: floor - 4 }, { x: core.x - 60, y: floor - 4 }, { at: () => s.Pt([0, -0.2, -0.2], "claw") },
    { x: core.x + 60, y: floor - 4 }, { at: () => s.golemC(), last: true },
  ];
  const where = (m) => (m.at ? m.at() : m);
  px.add({ dur: 2900, draw(g, k, t) {   // target circles, pulsing
    for (const m of targets) {
      if (m.hit) continue;
      const p = m.last || m.at ? { x: where(m).x, y: floor - 2 } : m, pulse = 1 + 0.12 * Math.sin(t * 0.03);
      g.strokeStyle = "#ff4a2a"; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(p.x, p.y, 26 * pulse, 6 * pulse, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#ffd28a"; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(p.x, p.y, 14 * pulse, 3 * pulse, 0, 0, Math.PI * 2); g.stroke();
    }
  } });
  await fx.wait(700);
  pose(dot, { sx: 1.2, sy: 0.85, lean: 0 });
  fx.focus(1.04, { x: core.x - 40, y: core.y }, 600);
  for (const [i, m] of targets.entries()) {
    await fx.wait(i ? 230 : 0);
    const to = where(m), from = { x: to.x - 260, y: -80 };
    sound.sfx("whoosh", { theme: "fire" });
    fireShot(toon, from, to, m.last ? 380 : 320, { r: m.last ? 22 : 14 }).then(() => {
      m.hit = true;
      if (m.last) {
        sound.sfx("explosion", { size: 1.6 });
        fx.hitstop(200); fx.shake(30); fx.punch(0.08, to); fx.flash(0.5, "#ffb040");
        explode(toon, to.x - 8, to.y, { size: 1.8, dur: 1700 });
        flashAt(pxTop, to, 120, 320);
        fx.debris(to, 14, { power: 1.7 });
        s.onHit(2);
      } else {
        sound.sfx("explosion", { size: 0.8 });
        fx.hitstop(50); fx.shake(14);
        explode(toon, to.x, to.y - (m.at ? 0 : 14), { size: m.at ? 1.1 : 0.9, dur: 1200 });
        if (!m.at) { fx.crack(to.x, { width: 80 }); fx.dust(to.x, 6, 1); }
        else s.onHit(1);
      }
    });
  }
  await fx.wait(380 + 900);
  fx.letterbox(false); fx.darken(0, 600); fx.focus(1, null, 600);
  pose(dot, {});
  dot.setMood("idle");
}

// ---- Inferno Line (ultimate II) ----
// He drives his fists into the floor; a wall of fire races along the ground to
// GOLEM and erupts into a roaring flame tornado that lifts and spins him, then
// blows apart in one giant explosion.
async function infernoLine(s) {
  const { fx, toon, pxTop, mate: dot, foeEl } = s;
  const c = s.mateC(), core = s.golemC(), floor = fx.floorY, cx = core.x - 10;
  fx.letterbox(true); fx.darken(0.7, 500);
  fx.title("INFERNO LINE", "PYRO · ultimate II");
  dot.clearTimers?.(); dot.setMood("fierce");
  dot.jump.v = -7; pose(dot, { sx: 0.8, sy: 1.25 });
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 700 });
  await fx.wait(420);
  pose(dot, { sx: 1.4, sy: 0.68, lean: 0.1, kick: true });
  sound.sfx("impact", { size: 1.2 }); fx.hitstop(70); fx.shake(16); fx.dust(c.x, 12, 1.4);
  flashAt(pxTop, { x: c.x + 20, y: floor - 6 }, 50);
  // the wall of fire racing along the floor
  let front = c.x + 30, racing = true, tornado = 0, lift = 0, blow = 0;
  const wall = toon.add({ dur: 3600, draw(pen, k, t) {
    if (racing) for (let x = front; x > front - 180 && x > c.x + 20; x -= 11) {
      const u = (front - x) / 180, h = (130 - 110 * u) * (0.75 + 0.25 * Math.sin(x * 0.21 + t * 0.03));
      pen.flame(x, floor + 4, 15 - u * 6, h, 1.15 - u * 0.75, -0.25, Math.sin(x * 0.13 + t * 0.01) * 0.3);
      if (u > 0.4) pen.puff("smoke", x - 10, floor - h - 10, 18 + u * 10, (u - 0.4) * 1.2, clamp01(u - 0.6));
    }
    if (tornado > 0) {   // the flame tornado: a funnel of fire widening upward, strands swirling round it
      const H = 300 * tornado * (1 - blow), f = 1 - blow;
      for (let i = 0; i < 26; i++) {
        const u = i / 26, y = floor - u * H, r = (16 + u * 84) * tornado, sway = Math.sin(t * 0.006 + u * 3) * 10 * u;
        pen.oval("heat", cx + sway, y, r, r * 0.3, (0.5 - u * 0.12) * f);
      }
      for (let k2 = 0; k2 < 3; k2++) for (let i = 0; i < 34; i++) {
        const u = i / 34, y = floor - u * H, r = (18 + u * 80) * tornado, a = u * 9 - t * 0.018 + k2 * 2.1;
        if (Math.sin(a) < -0.2) continue;   // the strand is round the back of the funnel
        pen.puff("heat", cx + Math.sin(t * 0.006 + u * 3) * 10 * u + Math.cos(a) * r, y + Math.sin(a) * r * 0.3, (7 + u * 8) * f, (1 - u * 0.35) * f);
      }
      for (let i = 0; i < 6; i++) pen.puff("smoke", cx + Math.sin(t * 0.004 + i * 1.3) * 70, floor - H - i * 8, 30, 0.75 * f, 0.3);
    }
  } });
  sound.sfx("whoosh", { theme: "fire" });
  await toon.add({ dur: 620, draw(pen, k) { front = lerp(c.x + 30, cx, ease.in(k) * 0.3 + k * 0.7); } });
  racing = false;
  sound.sfx("explosion", { size: 1.2 }); sound.sfx("roar");
  fx.hitstop(120); fx.shake(22); fx.punch(0.05, core); fx.flash(0.3, "#ffb040");
  s.onHit(1);
  fx.focus(1.05, { x: cx, y: core.y - 40 }, 500);
  // the tornado lifts and spins him
  const home = foeEl._pos || { x: 0, y: 0, r: 0 };
  await toon.add({ dur: 260, draw(pen, k) { tornado = ease.out(k); } });
  fx.move(foeEl, { x: home.x, y: home.y - 50 }, 1000, "inOut");
  for (let i = 0; i < 5; i++) {
    s.golem.to({ tilt: i % 2 ? 0.16 : -0.16, lean: 0.06 }, 160, "io");
    fx.hitstop(40); fx.shake(10 + i * 2); sound.sfx("hit", { size: 0.6 });
    await fx.wait(240);
  }
  // it blows apart
  fx.slowmo(0.45, 300);
  sound.sfx("explosion", { size: 1.8 });
  fx.hitstop(220); fx.shake(36); fx.punch(0.08, core); fx.flash(0.6, "#fff3c4");
  flashAt(pxTop, core, 150, 380);
  explode(toon, cx, core.y - 30, { size: 2, dur: 1800 });
  explode(toon, cx - 60, floor - 40, { size: 1, dur: 1300 });
  explode(toon, cx + 60, core.y - 90, { size: 0.9, dur: 1200 });
  fx.debris(core, 16, { power: 1.8 });
  s.onHit(2);
  await toon.add({ dur: 200, draw(pen, k) { blow = k; } });
  tornado = 0;
  await fx.move(foeEl, { x: home.x, y: home.y + 8 }, 220, "in");
  fx.shake(18); fx.dust(core.x, 12, 1.3); sound.sfx("impact", { size: 1 });
  fx.move(foeEl, { x: home.x, y: home.y }, 260, "out");
  s.golem.rest(500);
  await fx.wait(500);
  fx.letterbox(false); fx.darken(0, 600); fx.focus(1, null, 600);
  pose(dot, {});
  dot.setMood("idle");
  await wall;
}

// ---- the cards ----
export const PYRO_KIT = [
  { id: "emberShot", name: "Ember Shot", tier: "basic", run: emberShot,
    desc: "A quick fireball flicked at the boss.",
    art(pen, w, h) { for (let i = 0; i < 8; i++) pen.puff("heat", 14 + i * 5, 46 - i * 3, 3 + i * 0.8, 0.5 + i * 0.07); pen.puff("heat", 56, 24, 12, 1.25); } },
  { id: "crescentWave", name: "Crescent Wave", tier: "light", run: crescentWave,
    desc: "A crescent of fire skims the floor and slices into the boss.",
    art(pen, w, h) { crescent(pen, { x: 30, y: 30 }, 22, 1.1, 0); } },
  { id: "eruption", name: "Eruption", tier: "medium", run: eruption,
    desc: "A crack races to the boss and a volcanic pillar of fire blasts up through it.",
    art(pen, w, h) { for (let y = h; y > 0; y -= 5) pen.puff("heat", 40 + Math.sin(y * 0.2) * 3, y, 9 + (h - y) * 0.12, 1.2 - (h - y) / h * 0.3); pen.oval("heat", 40, 34, 26, 5, 0.9, 0.8); } },
  { id: "cometKick", name: "Comet Kick", tier: "medium", run: cometKick,
    desc: "Leaps and kicks a fireball into the boss as a comet. It bursts in a fire explosion.",
    art(pen, w, h) { for (let i = 0; i < 10; i++) { pen.puff("heat", 8 + i * 5, 54 - i * 3.6, 4 + i * 0.9, 0.55 + i * 0.06); pen.puff("smoke", 4 + i * 4, 44 - i * 3, 4, 0.6); } pen.puff("heat", 60, 18, 15, 1.3); } },
  { id: "sunfire", name: "Sunfire Halo", tier: "heavy", run: sunfireHalo,
    desc: "A ring of fire blazes up round him, then he fires a sun at the boss as a roaring wave of fire.",
    art(pen, w, h) { for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; pen.puff("heat", 40 + Math.cos(a) * 18, 30 + Math.sin(a) * 25, 4.5, 0.95); } pen.puff("heat", 40, 30, 9, 1.3); } },
  { id: "meteorRain", name: "Meteor Rain", tier: "ultimate", run: meteorRain,
    desc: "Target circles lock onto the floor, then meteors slam down one after another. The last hits the boss's core.",
    art(pen, w, h) { for (const [x, y, r] of [[30, 20, 8], [52, 34, 10], [70, 50, 7]]) { for (let i = 1; i < 8; i++) pen.puff("heat", x - i * 4, y - i * 3, r * (1 - i / 9), 1 - i * 0.1); pen.puff("heat", x, y, r, 1.25); pen.puff("smoke", x + 1, y + 1, r * 0.45, 1); } } },
  { id: "infernoLine", name: "Inferno Line", tier: "ultimate2", run: infernoLine,
    desc: "A wall of fire races along the floor and erupts into a flame tornado that lifts the boss, then blows apart.",
    art(pen, w, h) { for (let i = 0; i < 30; i++) { const u = i / 30, y = h - 2 - u * 54, r = 6 + u * 18, a = u * 10; pen.puff("heat", 40 + Math.cos(a) * r, y, 5 + u * 3, 1.15 - u * 0.4); } } },
];
