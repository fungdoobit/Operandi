// PYRO's cards, fourth pass (Isaac 2026-10-24). Same toon (cel-shaded) fire as Sunfire Halo, which he likes. What he said:
//   Fireball: good, but the flame trail was poorly drawn and animated   Flame Jet: hated   Eruption: v2 (sprites) had the power,
//   v3 was underwhelming; the crack was bad and the stacked explosions obvious   Comet Dive: hates the going-back animation
//   Meteor Rain: use the ORIGINAL (target circles, meteors) but far more cinematic, PYRO vanishing into the sky and coming
//   back with his roaming relight   Phoenix: bad, and the odd shapes (white dust arcs, spiky rays, thin feathers) are bad.
// So: no dust arcs, no spiky feathers; a real flame trail; big smooth cel masses; and he always returns by relighting.
import { ease, lerp, glow, starFlash, ribbon } from "../pixel/pixel-fx.js";
import { explode } from "../pixel/toon-fx.js";
import { sound } from "../sound.js";
import { fireRing } from "../abilities-pyro.js";

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp2 = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const wait = (s, ms) => s.fx.wait(ms);
const baseOf = (s) => s.fx.at(s.mate.figure, { fy: 1 });
const SPARK = ["#fff4d6", "#ffd27a", "#ff9a3c", "#e04a1c"];
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// ---- shared pieces -------------------------------------------------------------------------------------------

// A fireball with a proper flame trail: a white-hot head, and behind it a teardrop body of fire that cools from yellow to red,
// turbulent (each puff wanders), licking up in small flames, shedding embers that drift up and out. The trail rises as it burns.
function comet(toon, getPos, ms, { r = 14, life = 520 } = {}) {
  const hist = [];
  return toon.add({ dur: ms + life, draw(pen, k, t) {
    const moving = t < ms;
    if (moving) { const p = getPos(Math.min(1, t / ms)); hist.push({ x: p.x, y: p.y, t, id: hist.length }); }
    const head = hist[hist.length - 1];
    for (const q of hist) {
      const age = (t - q.t) / life; if (age > 1 || age < 0) continue;
      const wob = (hash(q.id * 3.1) - 0.5) * 2, rise = age * age * 26 + age * 8;
      const x = q.x - age * 14 + wob * age * 10, y = q.y - rise + Math.sin(q.id * 0.7 + t * 0.014) * age * 6;
      pen.puff("heat", x, y, r * (1.3 - age * 1.05), 1.05 * (1 - age * age));            // the body: shrinking, cooling
      if (q.id % 3 === 0 && age < 0.8) pen.flame(x, y + r * 0.3, r * 0.5 * (1 - age), (r * 1.7 + 12) * (1 - age * 0.8), 0.9 * (1 - age), -0.3 - wob * 0.2, 0.35 * wob);   // licks of flame up off it
      if (q.id % 5 === 1 && age > 0.1 && age < 0.9) {                                        // embers drifting off
        const u = (age - 0.1) / 0.8;
        pen.puff("heat", x - u * 22 * (0.4 + hash(q.id)), y - u * 38 * (0.5 + hash(q.id + 9)), 2.6 * (1 - u), 1.2 * (1 - u));
      }
    }
    if (moving && head) { pen.puff("heat", head.x, head.y, r * 2.6, 0.38); pen.puff("heat", head.x, head.y, r * 1.7, 0.9); pen.puff("heat", head.x, head.y, r, 1.5);
      for (let i = 0; i < 4; i++) { const a = Math.PI + (i - 1.5) * 0.5 + Math.sin(t * 0.03 + i) * 0.2; pen.limb("heat", [[head.x, head.y], [head.x + Math.cos(a) * r * 1.2, head.y + Math.sin(a) * r * 0.9 - 4], [head.x + Math.cos(a) * r * 2.2, head.y + Math.sin(a) * r * 1.5 - 12]], r * 0.7, 1, 0.8); } }
  } });
}
// A flat ring on the floor and rays: only Fireball uses these (Isaac likes Fireball)
function floorRing(s, x, { size = 90, ms = 520, color = "#ffe9b0", width = 4, y } = {}) {
  const fy = y ?? s.fx.floorY + 8;
  return s.pxTop.add({ dur: ms, z: 3, draw(g, k) { const e = ease.out(k); g.globalAlpha = 1 - k; g.strokeStyle = color; g.lineWidth = width * (1 - k * 0.5); g.beginPath(); g.ellipse(x, fy, size * e, size * e * 0.22, 0, 0, 7); g.stroke(); g.globalAlpha = 1; } });
}
function rays(s, at, { n = 14, len = 120, ms = 260, color = "#fff6d8" } = {}) {
  return s.pxTop.add({ dur: ms, z: 6, draw(g, k) {
    const f = k < 0.25 ? k / 0.25 : (1 - k) / 0.75;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.2, L = len * f * (i % 2 ? 0.55 : 1); ribbon(g, [[at.x + Math.cos(a) * 8, at.y + Math.sin(a) * 8], [at.x + Math.cos(a) * L, at.y + Math.sin(a) * L]], 7 * f, 0.5, color); }
    glow(g, at.x, at.y, len * 0.55 * f, "#ff9a3c", 0.6); starFlash(g, at.x, at.y, len * 0.5 * f, color);
  } });
}
const stagger = (s, big = false) => { s.golem.to({ bob: big ? 0.38 : 0.12, tilt: big ? -0.22 : -0.06, flare: big ? 1.4 : 0.5 }, big ? 240 : 120, "out"); };
// He is somewhere else: he comes back the way he travels, his roaming relight (an ember at home flickers on and grows).
async function relightHome(s, { ms = 780 } = {}) {
  const { mate } = s;
  mate.fly = null; mate.snuff(0, true); mate.sx.v = 1; mate.sy.v = 1;
  await wait(s, 300);
  sound.sfx("flameIgnite"); mate.flash = 1; mate.setMood("fierce");
  await s.spr.add({ dur: ms, draw(g, k) { mate.snuff(0.08 + 0.97 * (1 - (1 - k) ** 3), k < 0.5, 1, k < 0.5); } });
  mate.snuff(1, false); mate.setMood("idle");
}
// He sinks into the fire where he is (the same sink his roaming has) and is gone.
async function sinkAway(s, ms = 560) {
  const { mate } = s;
  await s.spr.add({ dur: ms, draw(g, k) { mate.snuff(1 - 0.92 * ease.io(k), true, 1 - 0.3 * k, true); } });
  mate.snuff(0, true);
}

// ---- Fireball (basic) ------------------------------------------------------------------------------------------
// Sunfire's build in small: fire spirals into a point in front of him, an orb swells, a star-flash, and a roaring fireball (white-hot
// head, a long body of flame with red licks) crosses in a flash, the last stretch in slow motion; it lands in a cel explosion.
async function fireball(s) {
  const { fx, mate, toon, pxTop } = s;
  const me = s.mateC(), core = s.golemC(), hit = lerp2(s.P("claw"), core, 0.55), orb = { x: me.x + 46, y: me.y - 6 };
  mate.setMood("fierce"); mate.sx.t = 1.12; mate.sy.t = 0.88; mate.fly = { x: -8, y: 0, rot: -0.08, sx: 1, sy: 1 };
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 520 }); fx.darken(0.3, 400);
  let orbR = 0;
  await toon.add({ dur: 640, draw(pen, k) {
    orbR = 20 * ease.out(k);
    for (let i = 0; i < 9; i++) { const u = (k * 2.2 + i / 9) % 1, a = i * 0.7 + u * 5, r = (1 - u) * 70 + orbR; pen.puff("heat", orb.x + Math.cos(a) * r, orb.y + Math.sin(a) * r * 0.8, 5 + u * 4, 0.9); }
    pen.puff("heat", orb.x, orb.y, orbR * 1.6, 1.25); pen.puff("heat", orb.x, orb.y, orbR * 2.6, 0.5);
  } });
  mate.sx.t = 0.94; mate.sy.t = 1.08; mate.fly.x = 12; mate.fly.rot = 0.05; mate.flare = 1;
  fx.hitstop(70); fx.shake(8); fx.flash(0.25, "#ffd28a"); sound.sfx("whoosh", { theme: "fire" });
  pxTop.add({ dur: 240, z: 5, draw(g, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; starFlash(g, orb.x, orb.y, 80 * f); } });
  fx.focus(1.04, { x: (orb.x + hit.x) / 2, y: hit.y }, 420);
  comet(toon, (u) => { const e = ease.in(u * 0.75 + 0.25 * u); return { x: lerp(orb.x, hit.x - 10, e), y: lerp(orb.y, hit.y, e) - Math.sin(u * Math.PI) * 22 }; }, 340, { r: 24, life: 600 });
  await wait(s, 230); fx.slowmo(0.4, 260); await wait(s, 130);
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null;
  sound.sfx("explosion", { size: 1.2 }); fx.hitstop(160); fx.shake(18); fx.punch(0.06, hit); fx.flash(0.4, "#ffb040");
  explode(toon, hit.x - 8, hit.y, { size: 1.5, dur: 1500 }); fx.debris(hit, 8, { power: 1.2 }); fx.sparks(hit, 18, { colors: SPARK, power: 1.4 }); stagger(s);
  s.onHit(2); s.heat(0.12);
  await wait(s, 300); explode(toon, hit.x + 34, hit.y - 26, { size: 0.8, dur: 1000 }); fx.shake(8);
  await wait(s, 500);
  fx.darken(0, 500); fx.focus(1, null, 500); mate.setMood("idle");
}

// ---- Flame Orbit (light) ---------------------------------------------------------------------------------------
// Sunfire's ring of fire traces itself upright round him, three fireballs ride round it, and are thrown at GOLEM one after another;
// when the last has gone the ring bursts apart.
async function flameOrbit(s) {
  const { fx, mate, toon } = s;
  const me = s.mateC(), core = s.golemC(), claw = s.P("claw"), ringC = { x: me.x + 2, y: me.y - 8 };
  const aims = [lerp2(claw, core, 0.35), lerp2(claw, core, 0.7), { x: core.x - 16, y: core.y + 4 }];
  mate.setMood("fierce"); mate.flare = 1; mate.sx.t = 1.1; mate.sy.t = 0.9;
  fx.darken(0.4, 500); fx.focus(1.05, { x: (me.x + core.x) / 2, y: me.y }, 700);
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 800 });
  const RX = 56, RY = 78;
  let drawn = 0, power = 0.4, burst = 0;
  const orbs = [0, 1, 2].map((i) => ({ a: i * 2.094, gone: false }));
  const ringAct = toon.add({ dur: 5200, draw(pen, k, t) {
    fireRing(pen, ringC, RX, RY, drawn, power, burst, t);
    if (drawn < 0.95 || burst > 0) return;
    for (const o of orbs) {
      if (o.gone) continue;
      const a = o.a + t * 0.0062, p = { x: ringC.x + Math.cos(a) * RX, y: ringC.y + Math.sin(a) * RY };
      for (let j = 6; j >= 1; j--) { const a2 = a - j * 0.13; pen.puff("heat", ringC.x + Math.cos(a2) * RX, ringC.y + Math.sin(a2) * RY, 15 - j * 1.8, 0.9 - j * 0.12); }
      pen.puff("heat", p.x, p.y, 40, 0.4); pen.puff("heat", p.x, p.y, 24, 1.0); pen.puff("heat", p.x, p.y, 11, 1.5);
    }
  } });
  await s.spr.add({ dur: 900, draw(g, k) { drawn = ease.out(k); power = 0.4 + 0.6 * k; } });
  mate.sx.t = 1; mate.sy.t = 1;
  await wait(s, 650);
  const t0 = performance.now();
  for (const [i, o] of orbs.entries()) {
    const to = aims[i], a = o.a + (performance.now() - ringStart(ringAct, t0)) * 0.0062, from = { x: ringC.x + Math.cos(a) * RX, y: ringC.y + Math.sin(a) * RY };
    o.gone = true; mate.leanV += 4; mate.flare = 1; fx.shake(4); sound.sfx("whoosh", { theme: "fire" });
    comet(toon, (u) => { const e = ease.in(u * 0.6 + 0.4 * u); return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - Math.sin(u * Math.PI) * 28 }; }, 320, { r: 17, life: 420 });
    setTimeout(() => {
      fx.hitstop(i === 2 ? 130 : 50); fx.shake(8 + i * 5); sound.sfx("explosion", { size: 0.7 + i * 0.3 });
      explode(toon, to.x, to.y, { size: 0.8 + i * 0.35, dur: 1000 + i * 250 }); fx.sparks(to, 10 + i * 6, { colors: SPARK, power: 1.1 });
      stagger(s, i === 2); if (i === 2) { fx.punch(0.05, to); s.onHit(2); } else s.chunk?.(0.33);
    }, 320);
    await wait(s, 300);
  }
  await wait(s, 500);
  sound.sfx("ringBurst", {}); burst = 0.01; await s.spr.add({ dur: 420, draw(g, k) { burst = ease.out(k); } });
  s.heat(0.15); mate.setMood("idle"); fx.darken(0, 500); fx.focus(1, null, 500); void ringAct;
  await wait(s, 400);
}
const ringStart = (act, t0) => t0 - (act.t || 0);   // when the orbit actor began, in real ms

// ---- Eruption (medium) -----------------------------------------------------------------------------------------
// Isaac's design: a rumble, the ground cracks under GOLEM, a huge eruption. Built from the approved pieces: the arena's own glowing
// floor cracks (the ones Meteor Rain uses), a pool of fire spreading under him, and ONE great rising cel explosion with fire tongues,
// lava bombs and smoke, in slow motion at its peak.
async function eruption(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s), C = { x: core.x + 4, y: floor + 20 };
  mate.setMood("fierce"); mate.sx.t = 1.16; mate.sy.t = 0.8; mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; mate.flare = 1;
  fx.darken(0.55, 800); fx.focus(1.05, { x: core.x - 60, y: floor - 30 }, 1100);
  sound.sfx("rumble"); sound.sfx("laserCharge", { ms: 1500 });
  await toon.add({ dur: 1500, draw(pen, k, t) {   // 1. the rumble: the stage and the floor heave
    mate.fly.x = Math.sin(t * 0.09) * 2.4 * k; fx.shake(2 + 9 * k);
    if (Math.random() < 0.3 + 0.5 * k) fx.dust(rand(b.x + 40, core.x + 100), 2, 0.6 + k);
    if (Math.random() < 0.4) pen.puff("heat", rand(b.x, core.x + 60), floor + rand(2, 40), 3, 1);
    if (k > 0.5) pen.oval("heat", C.x, C.y, 40 + 150 * (k - 0.5) * 2, 6 + 14 * (k - 0.5) * 2, 0.5 * (k - 0.5) * 2);   // the floor starts to glow under him
  } });
  mate.fly.x = 0; mate.sx.t = 1; mate.sy.t = 1.1;
  sound.sfx("shatter"); fx.hitstop(80); fx.shake(16);   // 2. the ground splits
  for (const [i, dx] of [-90, 0, 85, -30, 40].entries()) setTimeout(() => { fx.crack(C.x + dx, { width: 230 - i * 20 }); fx.dust(C.x + dx, 6, 1); fx.debris({ x: C.x + dx, y: floor }, 4, { power: 0.9 }); fx.shake(6); }, i * 130);
  toon.add({ dur: 1500, draw(pen, k, t) { const g = ease.out(clamp01(t / 500)) * (1 - clamp01((t - 1100) / 400)); pen.oval("heat", C.x, C.y, 190 * g, 26 * g, 0.9 * g); for (let i = 0; i < 7; i++) pen.flame(C.x + (i - 3) * 46, C.y - 6, 9, (30 + 36 * Math.abs(Math.sin(t * 0.009 + i))) * g, 1.0 * g, Math.sin(t * 0.01 + i) * 0.15, 0.2); } });
  await wait(s, 1200);
  // 3. the eruption: one great rising explosion, fire tongues, lava bombs, smoke
  fx.hitstop(190); fx.shake(28); fx.punch(0.07, core); fx.flash(0.55, "#ffe8b8"); fx.darken(0.3, 400);
  sound.sfx("explosion", { size: 2 }); sound.sfx("impact", { size: 1.8 }); sound.sfx("rumble");
  stagger(s, true); s.onHit(1);
  explode(toon, C.x, floor - 10, { size: 3.1, up: 2.8, dur: 2600 });
  const bombs = Array.from({ length: 16 }, () => ({ vx: rand(-280, 280), vy: -rand(380, 780), r: rand(6, 12), d: rand(0, 240) }));
  toon.add({ dur: 2300, draw(pen, k, t) {
    const thin = 1 - clamp01((t - 1200) / 1100);
    for (let i = 0; i < 10; i++) { const a = i * 2.1 + t * 0.006; pen.flame(C.x + Math.cos(a) * (50 + (i % 4) * 26), floor + 16, 12, (70 + 60 * Math.abs(Math.sin(t * 0.008 + i))) * thin * ease.out(clamp01(t / 300)), 1.05 * thin, Math.cos(a) * 0.25, 0.3); }
    for (const m of bombs) {
      const tt = (t - m.d) / 1000; if (tt < 0) continue;
      const y = floor + 10 + m.vy * tt + 620 * tt * tt; if (y > floor + 30) continue;
      for (let j = 0; j < 4; j++) { const t2 = Math.max(0, tt - j * 0.025); pen.puff("heat", C.x + m.vx * t2, floor + 10 + m.vy * t2 + 620 * t2 * t2, m.r * (1 - j * 0.2), 1 - j * 0.22); }
    }
  } });
  fx.debris({ x: C.x, y: floor - 20 }, 18, { power: 1.8 }); fx.sparks({ x: C.x, y: floor - 60 }, 36, { colors: SPARK, power: 2 });
  await wait(s, 380); fx.slowmo(0.4, 900); fx.shake(14);
  await wait(s, 700);
  fx.hitstop(100); s.onHit(2); s.heat(0.3); s.golem.rest(1100);
  mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 1300); fx.darken(0, 600); fx.focus(1, null, 600);
}

// ---- Comet Dive (medium) ----------------------------------------------------------------------------------------
// Sunfire's ring of fire blazes round him ("flame on"), he launches as a roaring comet with himself visible inside it, the camera
// pushing in, slow motion as he lands, two blasts like Sunfire's; then he sinks and relights at home.
async function cometDive(s) {
  const { fx, mate, toon, pxTop } = s;
  const core = s.golemC(), b = baseOf(s), me = s.mateC();
  const mid = (p) => ({ x: p.x - b.x, y: p.y - (b.y - 55) });
  const T = mid({ x: core.x - 48, y: core.y + 10 }), F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  mate.setMood("fierce"); mate.flare = 1; fx.darken(0.45, 500);
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 760 });
  mate.sx.t = 1.2; mate.sy.t = 0.78;
  let drawn = 0, burst = 0;
  toon.add({ dur: 1100, draw(pen, k, t) { fireRing(pen, { x: me.x + 2, y: me.y - 8 }, 52, 74, drawn, 0.5 + 0.5 * drawn, burst, t); } });
  await s.spr.add({ dur: 620, draw(g, k) { drawn = ease.out(k); } });
  sound.sfx("whoosh", { theme: "fire" }); mate.sx.t = 0.85; mate.sy.t = 1.25; fx.shake(8); fx.flash(0.25, "#ffd28a");
  s.spr.add({ dur: 300, draw(g, k) { burst = ease.out(k); } });
  fx.focus(1.06, { x: (b.x + core.x) / 2, y: core.y }, 700);
  let prev = { x: 0, y: 0 };
  comet(s.toonBack, () => ({ x: b.x + F.x, y: b.y - 55 + F.y }), 560, { r: 26, life: 560 });
  await s.spr.add({ dur: 560, draw(g, k) {
    const e = ease.in(k * 0.85 + 0.15 * k), x = T.x * e, y = T.y * e - Math.sin(k * Math.PI) * 140, ang = Math.atan2(y - prev.y, x - prev.x); prev = { x, y };
    F.x = x; F.y = y; F.rot = ang - Math.PI / 2 * 0.95; F.sx = 0.85; F.sy = 1.3;
    if (k > 0.8 && k < 0.84) fx.slowmo(0.35, 320);
  } });
  const hit = { x: core.x - 24, y: core.y + 6 };
  sound.sfx("explosion", { size: 1.5 }); fx.hitstop(220); fx.shake(26); fx.punch(0.08, hit); fx.flash(0.5, "#fff6dc");
  explode(toon, hit.x, hit.y, { size: 1.8, dur: 1600 }); fx.debris(hit, 12, { power: 1.5 }); fx.sparks(hit, 24, { colors: SPARK, power: 1.5 }); stagger(s, true);
  s.onHit(2); s.heat(0.2);
  await wait(s, 300); fx.hitstop(70); fx.shake(14); explode(toon, hit.x + 40, hit.y - 30, { size: 1, dur: 1100 });
  mate.sx.t = 1; mate.sy.t = 1; F.rot *= 0.5; F.sx = 1; F.sy = 1;
  fx.darken(0, 600); fx.focus(1, null, 600);
  await sinkAway(s, 520);
  await relightHome(s);
}

// ---- Meteor Rain (ultimate) -------------------------------------------------------------------------------------
// The original (target circles on the floor, meteors one after another, the last one hits his core), made cinematic:
// letterbox and title, he crouches then rockets up into the sky and is gone, the sky itself reddens and rumbles, the target
// circles lock on, meteors fall from different angles, sizes and rhythms with a camera that follows, the last one huge in slow
// motion; he comes back with his roaming relight.
async function meteorRain(s) {
  const { fx, mate, toon, px } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s), F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  fx.letterbox(true); fx.darken(0.6, 500); fx.flash(0.18, "#ff4010"); fx.title("METEOR RAIN", "PYRO · ultimate");
  mate.setMood("fierce"); mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 1300 });
  // 1. he crouches, then rockets up into the sky
  mate.sx.t = 1.25; mate.sy.t = 0.78; await wait(s, 520);
  mate.sx.t = 0.78; mate.sy.t = 1.35; sound.sfx("whoosh", { theme: "fire" });
  comet(s.toonBack, () => ({ x: b.x + F.x, y: b.y - 55 + F.y }), 640, { r: 20, life: 600 });
  await s.spr.add({ dur: 640, draw(g, k) { const e = ease.in(k); F.y = -(b.y + 330) * e; F.x = 30 * e; } });
  mate.snuff(0, true); mate.fly = null;
  // 2. the sky: a red glow gathers at the top and the ground trembles; the target circles lock on
  sound.sfx("rumble");
  const targets = [
    { x: core.x - 170, y: floor - 4 }, { x: core.x + 150, y: floor - 4 }, { x: core.x - 80, y: floor - 4 }, { at: () => s.Pt([0, -0.2, -0.2], "claw") },
    { x: core.x + 70, y: floor - 4 }, { at: () => s.golemC(), last: true },
  ];
  const where = (m) => (m.at ? m.at() : m);
  toon.add({ dur: 4300, draw(pen, k, t) {
    const glowK = ease.out(clamp01(t / 1100)) * (1 - clamp01((t - 3600) / 700));
    for (let i = 0; i < 7; i++) pen.puff("heat", core.x - 300 + i * 100 + Math.sin(t * 0.004 + i) * 24, -30 + Math.sin(i * 1.7 + t * 0.003) * 18, 90 * glowK, 0.55 * glowK);
    for (let i = 0; i < 5; i++) { const u = (t * 0.0006 + i / 5) % 1; pen.puff("heat", core.x - 260 + i * 130, u * 220, 4, 0.9 * (1 - u) * glowK); }   // embers falling out of the glow
  } });
  px.add({ dur: 4300, draw(g, k, t) {
    for (const m of targets) {
      if (m.hit) continue;
      const lock = clamp01((t - 600 - targets.indexOf(m) * 140) / 260); if (lock <= 0) continue;
      const p = m.last || m.at ? { x: where(m).x, y: floor - 2 } : m, pulse = 1 + 0.12 * Math.sin(t * 0.03), sc = 2.2 - 1.2 * ease.out(lock);
      g.globalAlpha = lock; g.strokeStyle = "#ff4a2a"; g.lineWidth = 2.5; g.beginPath(); g.ellipse(p.x, p.y, 26 * pulse * sc, 6 * pulse * sc, 0, 0, 7); g.stroke();
      g.strokeStyle = "#ffd28a"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x, p.y, 14 * pulse * sc, 3 * pulse * sc, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    }
  } });
  fx.focus(1.04, { x: core.x - 30, y: core.y }, 900);
  await wait(s, 1700);
  // 3. the rain: irregular rhythm, different angles and sizes, the camera nudged toward each hit
  const gaps = [0, 170, 320, 210, 520];
  for (const [i, m] of targets.slice(0, 5).entries()) {
    await wait(s, gaps[i]);
    const to = where(m), side = i % 2 ? 1 : -1, from = { x: to.x + side * rand(60, 360), y: -110 }, ms = rand(300, 440), r = rand(13, 19);
    sound.sfx("whoosh", { theme: "fire" });
    comet(toon, (u) => ({ x: lerp(from.x, to.x, u * u * 0.4 + u * 0.6), y: lerp(from.y, to.y - 6, u * u * 0.55 + u * 0.45) }), ms, { r, life: 460 });
    setTimeout(() => {
      m.hit = true;
      sound.sfx("explosion", { size: 0.8 }); fx.hitstop(50); fx.shake(12 + i * 2); fx.punch(0.02, to);
      explode(toon, to.x, to.y - (m.at ? 0 : 14), { size: m.at ? 1.15 : 0.95, dur: 1200 });
      if (!m.at) { fx.crack(to.x, { width: 90 }); fx.dust(to.x, 7, 1); } else s.onHit(1);
      fx.debris(to, 6, { power: 1.1 }); fx.sparks(to, 10, { colors: SPARK, power: 1.1 });
      if (Math.abs(to.x - core.x) < 200) stagger(s); s.chunk?.(0.08);
    }, ms);
  }
  await wait(s, 900);
  // 4. the last: slow motion, a huge meteor growing as it comes straight down onto his core
  sound.sfx("rumble"); fx.darken(0.75, 300); fx.slowmo(0.4, 1100); fx.focus(1.1, { x: core.x, y: core.y - 20 }, 900);
  const last = where(targets[5]);
  comet(toon, (u) => ({ x: lerp(last.x - 70, last.x, u), y: lerp(-180, last.y, u * u) }), 760, { r: 26 + 0, life: 760 });
  toon.add({ dur: 760, draw(pen, k) { const y = lerp(-180, last.y, k * k), x = lerp(last.x - 70, last.x, k); pen.puff("heat", x, y, 70 * k, 0.5 * k); } });
  await wait(s, 780);
  sound.sfx("explosion", { size: 1.9 }); fx.hitstop(260); fx.shake(32); fx.punch(0.1, last); fx.flash(0.6, "#ffb040");
  stagger(s, true); explode(toon, last.x - 8, last.y, { size: 2.2, dur: 1900 }); explode(toon, last.x + 50, last.y + 20, { size: 1.2, dur: 1400 });
  fx.debris(last, 18, { power: 1.9 }); fx.sparks(last, 30, { colors: SPARK, power: 1.8 }); s.onHit(2); s.heat(0.4); s.golem.rest(1200);
  await wait(s, 1100);
  fx.letterbox(false); fx.darken(0, 700); fx.focus(1, null, 700);
  // 5. he comes back, relighting where he was
  await relightHome(s, { ms: 900 });
}

// ---- Phoenix (ultimate II) --------------------------------------------------------------------------------------
// Marvel's Phoenix and the Human Torch, in the approved pieces: title and letterbox; a great double ring of fire traces itself round
// him (Sunfire's ring) and he rises up through it into the sky and is gone, as in Meteor Rain; then the Phoenix comes down: a huge
// flaming head with two swept-back wings of fire and a long tail, in slow motion onto GOLEM. The nova melts a Firewall. He relights at home.
async function phoenix(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s), me = s.mateC(), F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  fx.letterbox(true); fx.darken(0.6, 500); fx.flash(0.2, "#ff6a20"); fx.title("PHOENIX", "PYRO · ultimate II");
  mate.setMood("fierce"); mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 1400 });
  // 1. two rings of fire trace themselves round him, blazing higher; he stretches up
  let drawn = 0, power = 0.3, burst = 0;
  const ringC = { x: me.x + 2, y: me.y - 10 };
  toon.add({ dur: 2600, draw(pen, k, t) { fireRing(pen, ringC, 56, 82, drawn, power, burst, t); fireRing(pen, ringC, 84, 112, clamp01(drawn * 1.1 - 0.1), power * 0.85, burst, t + 400); } });
  mate.sx.t = 0.9; mate.sy.t = 1.15;
  await s.spr.add({ dur: 1300, draw(g, k) { drawn = ease.out(k); power = 0.3 + 0.7 * k; fx.shake(2 + 5 * k); } });
  // 2. he rockets up through the rings and out of the top of the sky
  sound.sfx("whoosh", { theme: "fire" }); fx.flash(0.3, "#ffd28a"); mate.sx.t = 0.78; mate.sy.t = 1.35;
  s.spr.add({ dur: 400, draw(g, k) { burst = ease.out(k); } });
  comet(s.toonBack, () => ({ x: b.x + F.x, y: b.y - 55 + F.y }), 700, { r: 22, life: 600 });
  await s.spr.add({ dur: 700, draw(g, k) { const e = ease.in(k); F.y = -(b.y + 340) * e; F.x = (core.x - b.x) * 0.2 * e; } });
  mate.snuff(0, true); mate.fly = null;
  // 3. the sky burns red; a hush, then the Phoenix
  sound.sfx("rumble");
  toon.add({ dur: 2600, draw(pen, k, t) { const g = ease.out(clamp01(t / 900)) * (1 - clamp01((t - 2100) / 500)); for (let i = 0; i < 7; i++) pen.puff("heat", core.x - 260 + i * 100 + Math.sin(t * 0.004 + i) * 22, -24 + Math.sin(i * 1.7 + t * 0.003) * 16, 90 * g, 0.5 * g); } });
  await wait(s, 1500);
  sound.sfx("wings"); sound.sfx("laserBeam", {}); sound.sfx("rumble"); fx.darken(0.75, 250); fx.slowmo(0.45, 1300); fx.focus(1.1, { x: core.x, y: core.y - 20 }, 1100);
  const tgt = { x: core.x, y: core.y }, start = { x: core.x - 120, y: -200 }, DUR = 900;
  const hist = [];
  toon.add({ dur: DUR + 700, draw(pen, k, t) {
    const u = Math.min(1, t / DUR), e = u * u, x = lerp(start.x, tgt.x, u), y = lerp(start.y, tgt.y, e);
    if (u < 1) hist.push({ x, y, t });
    const ang = Math.atan2(tgt.y - start.y, tgt.x - start.x), grow = 0.5 + 0.5 * u;
    if (u < 1) {
      // two swept-back wings: broad horns of fire sweeping up and back from the head, beating
      const flap = Math.sin(t * 0.016) * 0.16;
      for (const side of [-1, 1]) for (let i = 0; i <= 18; i++) {
        const v = i / 18, back = ang + Math.PI + side * (0.55 + v * 0.65 + flap), L = (30 + 190 * v) * grow, r = (5 + 24 * Math.sin(Math.PI * Math.min(1, v * 1.1)) ** 0.9) * grow;
        const wx = x + Math.cos(back) * L, wy = y + Math.sin(back) * L;
        pen.puff("heat", wx, wy, r * 1.35, 0.3); pen.puff("heat", wx, wy, r, 0.55); if (v < 0.85) pen.puff("heat", wx, wy, r * 0.5, 0.5);
        if (i % 4 === 2) pen.flame(wx, wy, 7, 22 * grow, 1.0, Math.cos(back) * 0.4, 0);
      }
      pen.puff("heat", x, y, 70 * grow, 0.4); pen.puff("heat", x, y, 44 * grow, 1.0); pen.puff("heat", x, y, 22 * grow, 1.5);   // the head
    }
    for (const q of hist) {   // the tail of fire
      const age = (t - q.t) / 760; if (age > 1) continue;
      pen.puff("heat", q.x - age * 14, q.y - age * age * 30, 34 * (1.2 - age), 1.0 * (1 - age * age));
    }
  } });
  await wait(s, DUR);
  // 4. the nova
  if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
  fx.hitstop(320); fx.shake(34); fx.punch(0.11, tgt); fx.flash(0.85, "#fff6e0"); fx.darken(0, 800);
  sound.sfx("impact", { size: 2.2 }); sound.sfx("explosion", { size: 2 });
  s.onHit(1); stagger(s, true);
  explode(toon, tgt.x, tgt.y, { size: 3, dur: 2300 });
  fx.debris(tgt, 22, { power: 2 }); fx.sparks(tgt, 44, { colors: SPARK, power: 2.1 });
  await wait(s, 420); fx.hitstop(120); fx.shake(20); explode(toon, tgt.x - 70, tgt.y + 20, { size: 1.8, dur: 1600 });
  await wait(s, 300); fx.hitstop(100); fx.shake(16); explode(toon, tgt.x + 80, tgt.y - 30, { size: 1.6, dur: 1500 });
  await wait(s, 500); s.onHit(2); s.heat(0.4); s.golem.rest(1300);
  await wait(s, 900);
  fx.letterbox(false); fx.focus(1, null, 700);
  await relightHome(s, { ms: 900 });
}

export const PYRO_V4 = {
  emberShot: { name: "Fireball", run: fireball, desc: "A core of fire gathers inside him and bursts out of him as a comet." },
  crescentWave: { name: "Flame Orbit", run: flameOrbit, desc: "Three fireballs spin out of him, circle him, then are thrown at the boss one after another." },
  eruption: { run: eruption, desc: "A rumble, the ground cracks under the boss, and a colossal column of fire erupts through him." },
  cometKick: { name: "Comet Dive", run: cometDive, desc: "He flames on, flies at the boss in a blaze and drives into him, then relights at home." },
  meteorRain: { run: meteorRain, desc: "He vanishes into the sky and calls down meteors on the boss, then relights." },
  infernoLine: { name: "Phoenix", run: phoenix, counters: "firewall", desc: "A firebird opens round him. He climbs out of sight, dives, and the nova melts the boss's Firewall." },
};
