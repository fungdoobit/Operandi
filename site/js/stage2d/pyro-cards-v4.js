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

// He rockets straight up and out of the top of the screen (Meteor Rain, Supernova). Isaac called the first version lazy: so, a proper
// launch: fire is pulled in under his feet and the floor glows (windup), a blast at the feet with hit-stop, flash and dust, and he
// accelerates up as a bright streak with a column of fire standing in the air where he went, the camera tilting up after him,
// ending in a flare at the top of the screen.
async function rocketUp(s, { windup = true, dx = 0 } = {}) {
  const { fx, mate, toon } = s, F = mate.fly, b = baseOf(s), foot = { x: b.x, y: b.y };
  if (windup) {
    mate.sx.t = 1.3; mate.sy.t = 0.7; sound.sfx("laserCharge", { ms: 460 });
    await toon.add({ dur: 460, draw(pen, k) {
      for (let i = 0; i < 9; i++) { const u = (k * 1.7 + i / 9) % 1, a = i * 0.8 + u * 5; pen.puff("heat", foot.x + Math.cos(a) * (1 - u) * 80, foot.y - 4 + Math.sin(a) * (1 - u) * 16, 5 + u * 4, 0.9); }
      pen.oval("heat", foot.x, foot.y - 2, 30 + 50 * k, 6 + 8 * k, 0.8 * k);
    } });
  }
  sound.sfx("whoosh", { theme: "fire" }); sound.sfx("explosion", { size: 0.8 });
  fx.hitstop(70); fx.shake(14); fx.flash(0.3, "#ffd28a"); fx.dust(foot.x, 7, 1.2);
  explode(toon, foot.x, foot.y - 10, { size: 0.9, up: 0.6, dur: 800, star: false });
  mate.sx.t = 0.68; mate.sy.t = 1.55;
  fx.focus(1.06, { x: foot.x + dx / 2, y: foot.y - 230 }, 520);
  const H = b.y + 420, T = 480, pos = (u) => { const e = u ** 2.3; return { x: dx * e, y: -H * e }; };
  toon.add({ dur: T + 800, draw(pen, k, t) {   // the column of fire left standing where he went, and the streak at its head
    const u = Math.min(1, t / T), hd = pos(u), fade = 1 - clamp01((t - T) / 800), n = 16;
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1), p = pos(u * v), r = (30 - 14 * v) * (1 - v * 0.2 * (1 - fade));
      pen.puff("heat", foot.x + p.x, foot.y - 55 + p.y, r, 0.26 * fade);
      if (i % 2) pen.puff("heat", foot.x + p.x, foot.y - 55 + p.y, r * 0.5, 0.2 * fade);
    }
    if (u < 1) { pen.puff("heat", foot.x + hd.x, foot.y - 55 + hd.y, 52, 0.5); pen.puff("heat", foot.x + hd.x, foot.y - 55 + hd.y, 30, 1.3); }
  } });
  await s.spr.add({ dur: T, draw(g, k) { const p = pos(k); F.x = p.x; F.y = p.y; } });
  fx.flash(0.2, "#ffe8c0"); fx.shake(8); sound.sfx("rumble");
  toon.add({ dur: 700, draw(pen, k) { const g = 1 - k; pen.puff("heat", foot.x + dx, -6, 100 * g + 20, 0.7 * g); pen.puff("heat", foot.x + dx, -6, 44 * g, 1.2 * g); } });
  mate.snuff(0, true); mate.fly = null;
}

// ---- Fireball (basic) ------------------------------------------------------------------------------------------
// Sunfire's build in small: fire spirals into a point in front of him, an orb swells, a star-flash, and a roaring fireball (white-hot
// head, a long body of flame with red licks) crosses in a flash, the last stretch in slow motion; it lands in a cel explosion.
async function fireball(s) {
  const { fx, mate, toon } = s;
  const me = s.mateC(), core = s.golemC(), hit = lerp2(s.P("claw"), core, 0.55), orb = { x: me.x + 40, y: me.y - 4 };
  mate.setMood("fierce"); mate.sx.t = 1.12; mate.sy.t = 0.88; mate.fly = { x: -8, y: 0, rot: -0.08, sx: 1, sy: 1 };
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 420 });
  await toon.add({ dur: 420, draw(pen, k) {   // fire gathers into a ball in front of him
    const R = 18 * ease.out(k);
    for (let i = 0; i < 8; i++) { const u = (k * 2 + i / 8) % 1, a = i * 0.8 + u * 5, r = (1 - u) * 56 + R; pen.puff("heat", orb.x + Math.cos(a) * r, orb.y + Math.sin(a) * r * 0.8, 5 + u * 4, 0.9); }
    pen.puff("heat", orb.x, orb.y, R * 1.7, 1.2); pen.puff("heat", orb.x, orb.y, R * 2.7, 0.45);
  } });
  mate.sx.t = 0.94; mate.sy.t = 1.08; mate.fly.x = 12; mate.fly.rot = 0.05; mate.flare = 1;
  fx.shake(8); fx.flash(0.2, "#ffd28a"); sound.sfx("whoosh", { theme: "fire" });
  const T = 170, from = { x: orb.x, y: orb.y }, to = { x: hit.x - 14, y: hit.y };
  comet(toon, (u) => ({ x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) }), T, { r: 22, life: 520 });   // dead straight, very fast
  await wait(s, T);
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null;
  sound.sfx("explosion", { size: 1.2 }); fx.hitstop(150); fx.shake(18); fx.punch(0.06, hit); fx.flash(0.4, "#ffb040");
  explode(toon, hit.x - 8, hit.y, { size: 1.5, dur: 1500, star: false }); fx.debris(hit, 8, { power: 1.2 }); fx.sparks(hit, 18, { colors: SPARK, power: 1.4 }); stagger(s);
  s.onHit(2); s.heat(0.12);
  await wait(s, 700);
  fx.darken(0, 400); mate.setMood("idle");
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
      explode(toon, to.x, to.y, { size: 0.8 + i * 0.35, dur: 1000 + i * 250 , star: false }); fx.sparks(to, 10 + i * 6, { colors: SPARK, power: 1.1 });
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
  fx.darken(0.55, 800); fx.focus(1.05, { x: core.x - 60, y: floor - 60 }, 1100);
  sound.sfx("rumble"); sound.sfx("laserCharge", { ms: 1500 });
  await toon.add({ dur: 1500, draw(pen, k, t) {   // 1. the rumble: the stage and the floor heave, the floor starts to glow under him
    mate.fly.x = Math.sin(t * 0.09) * 2.4 * k; fx.shake(2 + 9 * k);
    if (Math.random() < 0.3 + 0.5 * k) fx.dust(rand(b.x + 40, core.x + 100), 2, 0.6 + k);
    if (k > 0.4) pen.oval("heat", C.x, C.y, 40 + 190 * (k - 0.4) / 0.6, 6 + 14 * (k - 0.4) / 0.6, 0.55 * (k - 0.4) / 0.6);
  } });
  mate.fly.x = 0; mate.sx.t = 1; mate.sy.t = 1.1;
  sound.sfx("shatter"); fx.hitstop(80); fx.shake(16);   // 2. the ground splits under GOLEM
  for (const [i, dx] of [-90, 0, 85, -30, 40].entries()) setTimeout(() => { fx.dust(C.x + dx, 6, 1); fx.debris({ x: C.x + dx, y: floor }, 4, { power: 0.9 }); fx.shake(6); }, i * 110);
  await wait(s, 650);
  // 3. the eruption: a column of fire bursts up out of the floor through him, wide at the foot, with a roiling head, and falls back
  fx.hitstop(190); fx.shake(30); fx.punch(0.07, core); fx.flash(0.55, "#ffe8b8"); fx.darken(0.3, 400);
  sound.sfx("explosion", { size: 2 }); sound.sfx("impact", { size: 1.8 }); sound.sfx("rumble");
  stagger(s, true); s.onHit(1);
  explode(toon, C.x, floor + 4, { size: 1.5, up: 0.6, dur: 1200, star: false });   // the blast at the foot
  const H = 400, DUR = 2300;
  toon.add({ dur: DUR, draw(pen, k, t) {
    const rise = ease.out(clamp01(t / 420)), fall = 1 - clamp01((t - 1500) / 800), h = H * rise * (0.25 + 0.75 * fall), w = 0.5 + 0.5 * fall, n = 18;
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1), y = floor + 14 - v * h, x = C.x + Math.sin(v * 5 + t * 0.011) * 10 * v + Math.sin(t * 0.017 + i) * 4;
      const r = (92 - 40 * v + 7 * Math.sin(t * 0.02 + i * 2)) * w;
      pen.puff("heat", x, y, r, 0.15); pen.puff("heat", x, y, r * 0.5, 0.2);   // the column, hotter in the middle
    }
    const top = floor + 14 - h;   // the head of it: a roiling cap that spreads out, with smoke above
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + t * 0.004; pen.puff("heat", C.x + Math.cos(a) * 80 * w, top + Math.sin(a) * 26 - 8, 62 * w, 0.26); }
    pen.puff("smoke", C.x + 10, top - 50 * rise, 70 * rise, 0.7 * (1 - clamp01((t - 1700) / 600)));
    pen.oval("heat", C.x, floor + 18, 230 * w, 22 * w, 0.8 * w);   // the pool of fire it stands in
  } });
  fx.debris({ x: C.x, y: floor - 20 }, 30, { power: 2.2 }); fx.sparks({ x: C.x, y: floor - 60 }, 36, { colors: SPARK, power: 2 });
  await wait(s, 450); fx.slowmo(0.45, 800); fx.shake(14);
  await wait(s, 700);
  fx.hitstop(100); s.onHit(2); s.heat(0.3); s.golem.rest(1100);
  mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 1300); fx.darken(0, 600); fx.focus(1, null, 600);
}

// ---- Comet Dive (medium) ----------------------------------------------------------------------------------------
// Sunfire's ring of fire blazes round him ("flame on"), he launches as a roaring comet with himself visible inside it, the camera
// pushing in, slow motion as he lands, two blasts like Sunfire's; then he sinks and relights at home.
async function cometDive(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), b = baseOf(s), me = s.mateC();
  const T = { x: core.x - 48 - b.x, y: core.y + 10 - (b.y - 55) }, F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  mate.setMood("fierce"); mate.flare = 1; fx.darken(0.45, 500);
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 760 });
  mate.sx.t = 1.2; mate.sy.t = 0.78;
  let drawn = 0, burst = 0;
  toon.add({ dur: 1100, draw(pen, k, t) { fireRing(pen, { x: me.x + 2, y: me.y - 8 }, 52, 74, drawn, 0.5 + 0.5 * drawn, burst, t); } });
  await s.spr.add({ dur: 620, draw(g, k) { drawn = ease.out(k); } });
  sound.sfx("whoosh", { theme: "fire" }); fx.shake(8); fx.flash(0.25, "#ffd28a");
  s.spr.add({ dur: 300, draw(g, k) { burst = ease.out(k); } });
  fx.focus(1.06, { x: (b.x + core.x) / 2, y: core.y }, 500);
  // he flies dead straight and fast, stretched along the line, inside a big blaze
  const DUR = 240, ang = Math.atan2(T.y, T.x);
  mate.sx.t = 1.35; mate.sy.t = 0.8;
  comet(toon, (u) => ({ x: b.x + T.x * u, y: b.y - 55 + T.y * u }), DUR, { r: 34, life: 520 });
  toon.add({ dur: DUR, draw(pen, k) { const x = b.x + T.x * k, y = b.y - 55 + T.y * k; pen.puff("heat", x + 14, y, 52, 0.4); } });
  await s.spr.add({ dur: DUR, draw(g, k) { F.x = T.x * k; F.y = T.y * k; } });
  const hit = { x: core.x - 24, y: core.y + 6 };
  sound.sfx("explosion", { size: 1.5 }); fx.hitstop(220); fx.shake(26); fx.punch(0.08, hit); fx.flash(0.5, "#fff6dc");
  explode(toon, hit.x, hit.y, { size: 1.8, dur: 1600, star: false }); fx.debris(hit, 12, { power: 1.5 }); fx.sparks(hit, 24, { colors: SPARK, power: 1.5 }); stagger(s, true);
  s.onHit(2); s.heat(0.2);
  await wait(s, 300); fx.hitstop(70); fx.shake(14);
  mate.sx.t = 1; mate.sy.t = 1; F.sx = 1; F.sy = 1;
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
  // 1. he rockets up into the sky
  await rocketUp(s, { dx: 30 });
  // 2. the sky: a red glow gathers at the top and the ground trembles; the target circles lock on
  sound.sfx("rumble");
  const targets = [
    { x: core.x - 170, y: floor - 4 }, { x: core.x + 150, y: floor - 4 }, { x: core.x - 80, y: floor - 4 }, { at: () => s.Pt([0, -0.2, -0.2], "claw") },
    { at: () => s.golemC(), last: true },
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
  const gaps = [0, 170, 320, 210, 300];
  for (const [i, m] of targets.entries()) {
    await wait(s, gaps[i]);
    const to = where(m), side = i % 2 ? 1 : -1, from = { x: to.x + side * rand(60, 360), y: -110 }, ms = rand(300, 440), r = m.last ? 24 : rand(13, 19);
    sound.sfx("whoosh", { theme: "fire" });
    comet(toon, (u) => ({ x: lerp(from.x, to.x, u * u * 0.4 + u * 0.6), y: lerp(from.y, to.y - 6, u * u * 0.55 + u * 0.45) }), ms, { r, life: 460 });
    setTimeout(() => {
      m.hit = true;
      sound.sfx("explosion", { size: 0.8 }); fx.hitstop(50); fx.shake(12 + i * 2); fx.punch(0.02, to);
      explode(toon, to.x, to.y - (m.at ? 0 : 14), { size: m.last ? 2.2 : m.at ? 1.15 : 0.95, dur: m.last ? 1900 : 1200, star: false });
      if (!m.at) { fx.dust(to.x, 7, 1); } else if (m.last) { fx.hitstop(220); fx.shake(30); fx.punch(0.09, to); fx.flash(0.5, "#ffb040"); s.onHit(2); s.heat(0.4); s.golem.rest(1200); } else s.onHit(1);
      fx.debris(to, 6, { power: 1.1 }); fx.sparks(to, 10, { colors: SPARK, power: 1.1 });
      if (Math.abs(to.x - core.x) < 200) stagger(s); s.chunk?.(0.08);
    }, ms);
  }
  await wait(s, 1500);
  fx.letterbox(false); fx.darken(0, 700); fx.focus(1, null, 700);
  // 4. he comes back, relighting where he was
  await relightHome(s, { ms: 900 });
}

// ---- Phoenix (ultimate II) --------------------------------------------------------------------------------------
// Marvel's Phoenix and the Human Torch, in the approved pieces: title and letterbox; a great double ring of fire traces itself round
// him (Sunfire's ring) and he rises up through it into the sky and is gone, as in Meteor Rain; then the Phoenix comes down: a huge
// flaming head with two swept-back wings of fire and a long tail, in slow motion onto GOLEM. The nova melts a Firewall. He relights at home.
async function phoenix(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s), me = s.mateC(), F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  fx.letterbox(true); fx.darken(0.6, 500); fx.flash(0.2, "#ff6a20"); fx.title("SUPERNOVA", "PYRO · ultimate II");
  mate.setMood("fierce"); mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 1400 });
  // 1. two rings of fire trace themselves round him, blazing higher; he stretches up
  let drawn = 0, power = 0.3, burst = 0;
  const ringC = { x: me.x + 2, y: me.y - 10 };
  toon.add({ dur: 2600, draw(pen, k, t) { fireRing(pen, ringC, 56, 82, drawn, power, burst, t); fireRing(pen, ringC, 84, 112, clamp01(drawn * 1.1 - 0.1), power * 0.85, burst, t + 400); } });
  mate.sx.t = 0.9; mate.sy.t = 1.15;
  await s.spr.add({ dur: 1300, draw(g, k) { drawn = ease.out(k); power = 0.3 + 0.7 * k; fx.shake(2 + 5 * k); } });
  // 2. he rockets up through the rings and out of the top of the sky
  s.spr.add({ dur: 400, draw(g, k) { burst = ease.out(k); } });
  await rocketUp(s, { windup: false, dx: (core.x - b.x) * 0.2 });
  // 3. the sky burns red; a star gathers high above GOLEM, fire spiralling into it
  sound.sfx("rumble");
  const star = { x: core.x - 40, y: 70 };
  toon.add({ dur: 4200, draw(pen, k, t) {
    const gl = ease.out(clamp01(t / 900)) * (1 - clamp01((t - 3700) / 500));
    for (let i = 0; i < 7; i++) pen.puff("heat", core.x - 260 + i * 100 + Math.sin(t * 0.004 + i) * 22, -24 + Math.sin(i * 1.7 + t * 0.003) * 16, 90 * gl, 0.5 * gl);
    const g = clamp01((t - 700) / 2400), R = 8 + 62 * g;   // the star swells, shuddering
    if (t < 700 || t > 3700) return;
    const sh = (hash(Math.floor(t / 50)) - 0.5) * 3 * g;
    for (let i = 0; i < 10; i++) { const u = (t * 0.0012 + i / 10) % 1, a = i * 0.9 + u * 6; pen.puff("heat", star.x + Math.cos(a) * (1 - u) * (90 + R), star.y + Math.sin(a) * (1 - u) * (90 + R) * 0.8, 6 + u * 5, 0.9); }
    pen.puff("heat", star.x + sh, star.y, R * 1.9, 0.5); pen.puff("heat", star.x + sh, star.y, R * 1.2, 1.0); pen.puff("heat", star.x + sh, star.y, R * 0.6, 1.5);
  } });
  await wait(s, 700); sound.sfx("laserCharge", { ms: 2800 }); fx.focus(1.08, { x: star.x, y: 80 }, 2400);
  await wait(s, 2400); fx.slowmo(0.4, 700); fx.shake(10); fx.flash(0.2, "#ffd28a");
  await wait(s, 500);
  // 4. the star falls onto GOLEM
  sound.sfx("whoosh", { theme: "fire" }); fx.darken(0.75, 200);
  const tgt = { x: core.x, y: core.y }, DUR = 520;
  comet(toon, (u) => ({ x: lerp(star.x, tgt.x, u * u), y: lerp(star.y, tgt.y, u * u) }), DUR, { r: 40, life: 520 });
  await wait(s, DUR);
  // 5. the nova: a great blast, and a ring of fire racing out along the whole stage
  if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
  fx.hitstop(320); fx.shake(34); fx.punch(0.11, tgt); fx.flash(0.9, "#fff6e0"); fx.darken(0, 900);
  sound.sfx("impact", { size: 2.2 }); sound.sfx("explosion", { size: 2 });
  s.onHit(1); stagger(s, true);
  explode(toon, tgt.x, tgt.y, { size: 3.2, dur: 2400, star: false });
  fx.debris(tgt, 26, { power: 2.2 }); fx.sparks(tgt, 44, { colors: SPARK, power: 2.1 });
  toon.add({ dur: 1300, draw(pen, k) {
    const e = ease.out(k), r = 40 + 560 * e, a = 1.1 * (1 - k * k);
    for (let i = 0; i < 40; i++) { const an = (i / 40) * Math.PI * 2; pen.puff("heat", tgt.x + Math.cos(an) * r, tgt.y + Math.sin(an) * r * 0.55, 30 * (1 - k * 0.5), a); }
  } });
  await wait(s, 450); fx.hitstop(100); fx.shake(20); explode(toon, tgt.x - 80, tgt.y + 24, { size: 1.8, dur: 1600, star: false });
  await wait(s, 300); fx.hitstop(100); fx.shake(16); explode(toon, tgt.x + 90, tgt.y - 30, { size: 1.6, dur: 1500, star: false });
  await wait(s, 500); s.onHit(2); s.heat(0.4); s.golem.rest(1300);
  await wait(s, 900);
  fx.letterbox(false); fx.focus(1, null, 700);
  await relightHome(s, { ms: 900 });
}

// every PYRO card draws its fire in 2-px blocks (Isaac 2026-10-24: 3 was too chunky, 1 too smooth; "a little more hi bit")
export const chunky = (run) => async (s) => { s.toon.chunk = 2; s.toonBack.chunk = 2; try { await run(s); } finally { s.toon.chunk = 1; s.toonBack.chunk = 1; } };
export const PYRO_V4 = {
  emberShot: { name: "Fireball", run: chunky(fireball), desc: "A core of fire gathers inside him and bursts out of him as a comet." },
  crescentWave: { name: "Flame Orbit", run: chunky(flameOrbit), desc: "Three fireballs spin out of him, circle him, then are thrown at the boss one after another." },
  eruption: { run: chunky(eruption), desc: "A rumble, the ground cracks under the boss, and a colossal column of fire erupts through him." },
  cometKick: { name: "Comet Dive", run: chunky(cometDive), desc: "He flames on, flies at the boss in a blaze and drives into him, then relights at home." },
  meteorRain: { run: meteorRain, desc: "He vanishes into the sky and calls down meteors on the boss, then relights." },
  infernoLine: { name: "Supernova", run: chunky(phoenix), counters: "firewall", desc: "He rises out of sight. A star gathers in the sky, falls on the boss, and a ring of fire races out and melts its Firewall." },
};
