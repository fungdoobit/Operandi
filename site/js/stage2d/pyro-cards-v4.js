// PYRO's cards, fourth pass (Isaac 2026-10-24). Same toon (cel-shaded) fire as Sunfire Halo, which he likes. What he said:
//   Fireball: good, but the flame trail was poorly drawn and animated   Flame Jet: hated   Eruption: v2 (sprites) had the power,
//   v3 was underwhelming; the crack was bad and the stacked explosions obvious   Comet Dive: hates the going-back animation
//   Meteor Rain: use the ORIGINAL (target circles, meteors) but far more cinematic, PYRO vanishing into the sky and coming
//   back with his roaming relight   Phoenix: bad, and the odd shapes (white dust arcs, spiky rays, thin feathers) are bad.
// So: no dust arcs, no spiky feathers; a real flame trail; big smooth cel masses; and he always returns by relighting.
import { ease, lerp, glow, starFlash, ribbon } from "../pixel/pixel-fx.js";
import { explode } from "../pixel/toon-fx.js";
import { sound } from "../sound.js";

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
async function fireball(s) {
  const { fx, mate, toon } = s;
  const me = s.mateC(), core = s.golemC(), hit = lerp2(s.P("claw"), core, 0.55), heart = { x: me.x + 4, y: me.y - 2 };
  mate.setMood("fierce"); mate.sx.t = 1.12; mate.sy.t = 0.88; mate.fly = { x: -8, y: 0, rot: -0.08, sx: 1, sy: 1 };
  sound.sfx("flameIgnite");
  await toon.add({ dur: 560, draw(pen, k) {
    for (let i = 0; i < 8; i++) { const u = (k * 2 + i / 8) % 1, a = i * 0.8 + u * 5, r = (1 - u) * 70; pen.puff("heat", heart.x + Math.cos(a) * r, heart.y + Math.sin(a) * r * 0.8, 4 + u * 3, 0.9 * k); }
    pen.puff("heat", heart.x, heart.y, 8 + 24 * ease.out(k), 1.3 * k); pen.puff("heat", heart.x, heart.y, 40 * ease.out(k), 0.4 * k);
  } });
  mate.sx.t = 0.94; mate.sy.t = 1.08; mate.fly.x = 12; mate.fly.rot = 0.05; mate.flare = 1;
  fx.shake(5); sound.sfx("whoosh", { theme: "fire" });
  rays(s, heart, { n: 10, len: 70, ms: 200 }); floorRing(s, me.x + 20, { size: 70, ms: 380 });
  comet(toon, (u) => { const e = ease.in(u * 0.7 + 0.3 * u); return { x: lerp(heart.x + 20, hit.x, e), y: lerp(heart.y, hit.y, e) - Math.sin(u * Math.PI) * 26 }; }, 380, { r: 17, life: 560 });
  await wait(s, 380);
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null;
  fx.hitstop(90); fx.shake(9); fx.punch(0.03, hit); sound.sfx("impact", { size: 1 });
  rays(s, hit, { n: 14, len: 110, ms: 280 });
  explode(toon, hit.x, hit.y, { size: 0.9, dur: 1100 });
  fx.sparks(hit, 14, { colors: SPARK, power: 1.2 }); stagger(s);
  s.onHit(2); s.heat(0.1);
  mate.setMood("idle");
  await wait(s, 700);
}

// ---- Flame Orbit (light) ---------------------------------------------------------------------------------------
// Three fireballs spin out of his body and circle him, each trailing a streak of fire round its orbit; then they are thrown at
// GOLEM one after another, each landing in its own burst.
async function flameOrbit(s) {
  const { fx, mate, toon } = s;
  const me = s.mateC(), core = s.golemC(), claw = s.P("claw");
  const aims = [lerp2(claw, core, 0.35), lerp2(claw, core, 0.7), { x: core.x - 16, y: core.y + 4 }];
  mate.setMood("fierce"); mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 700 });
  const orbs = [0, 1, 2].map((i) => ({ a: i * 2.094, gone: false, hot: 0 }));
  const SPIN = 0.0105, R = 62, spawn = 640;
  const at = (o, a, r) => ({ x: me.x + Math.cos(a) * r, y: me.y - 6 + Math.sin(a) * r * 0.55 });
  const orbit = toon.add({ dur: 4200, draw(pen, k, t) {
    const r = R * ease.out(clamp01(t / spawn));
    for (const o of orbs) {
      if (o.gone) continue;
      const a = o.a + t * SPIN;
      for (let j = 7; j >= 0; j--) { const p = at(o, a - j * 0.17, r); pen.puff("heat", p.x, p.y, (14 - j * 1.4) * (0.5 + 0.5 * ease.out(clamp01(t / spawn))), 0.95 - j * 0.1); }   // the streak behind it
      const p = at(o, a, r), big = 1 + o.hot * 0.5;
      pen.puff("heat", p.x, p.y, 28 * big, 0.4); pen.puff("heat", p.x, p.y, 16 * big, 1.0); pen.puff("heat", p.x, p.y, 8 * big, 1.5);
    }
  } });
  await wait(s, spawn + 220);
  const t0 = performance.now();
  for (const [i, o] of orbs.entries()) {
    const to = aims[i], t = performance.now() - t0 + spawn + 220, a = o.a + t * SPIN, from = at(o, a, R);
    o.gone = true; mate.leanV += 4; mate.flare = 1; fx.shake(3); sound.sfx("whoosh", { theme: "fire" });
    comet(toon, (u) => { const e = ease.in(u * 0.6 + 0.4 * u); return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - Math.sin(u * Math.PI) * 30 }; }, 330, { r: 13, life: 380 });
    setTimeout(() => {
      fx.hitstop(i === 2 ? 110 : 45); fx.shake(6 + i * 3); sound.sfx("impact", { size: 0.9 + i * 0.15 });
      explode(toon, to.x, to.y, { size: 0.6 + i * 0.22, dur: 900 }); fx.sparks(to, 8 + i * 4, { colors: SPARK, power: 1 });
      stagger(s, i === 2);
      if (i === 2) s.onHit(2); else s.chunk?.(0.33);
    }, 330);
    await wait(s, 240);
  }
  await wait(s, 600);
  s.heat(0.15); mate.setMood("idle"); void orbit;
}

// ---- Eruption (medium) -----------------------------------------------------------------------------------------
// Isaac: a rumble, the ground cracks under GOLEM, a huge eruption comes up through him; not stacked explosions, and a real crack.
// The crack: jagged tapered fissures (wide at the middle, thin at the tips, dark rock edge, orange glow, white-hot seam) with forks.
// The eruption: geysers punch up along the cracks, then one colossal churning column, lava bombs arcing up and falling, dark smoke.
function fissures(C, floor) {
  const out = [];
  const grow = (x, y, th, n, seg, depth) => {
    const pts = [{ x, y }];
    for (let j = 0; j < n; j++) {
      th += rand(0.35, 0.95) * (Math.random() < 0.5 ? -1 : 1) * 0.55;   // sharp angular turns, but keeping its heading
      const len = rand(0.7, 1.25) * seg; x += Math.cos(th) * len; y += Math.sin(th) * len * 0.38;
      pts.push({ x, y: Math.max(floor - 3, Math.min(floor + 76, y)) });
      if (depth < 2 && j > 1 && j < n - 1 && Math.random() < 0.5) grow(x, y, th + rand(-1.1, 1.1) + (Math.random() < 0.5 ? 0.7 : -0.7), Math.round(n * 0.5), seg * 0.7, depth + 1);
    }
    out.push({ pts, depth });
  };
  for (let i = 0; i < 8; i++) grow(C.x, C.y, (i / 8) * Math.PI * 2 + rand(-0.25, 0.25), 8, 26, 0);
  return out;
}
async function eruption(s) {
  const { fx, mate, toon, pxTop } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s), C = { x: core.x + 6, y: floor + 24 };
  mate.setMood("fierce"); mate.sx.t = 1.16; mate.sy.t = 0.8; mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; mate.flare = 1;
  // 1. the rumble
  sound.sfx("rumble"); sound.sfx("laserCharge", { ms: 1400 }); fx.darken(0.5, 800);
  await toon.add({ dur: 1400, draw(pen, k, t) {
    mate.fly.x = Math.sin(t * 0.09) * 2.4 * k; fx.shake(2 + 9 * k);
    if (Math.random() < 0.3 + 0.5 * k) fx.dust(rand(b.x + 40, core.x + 100), 2, 0.6 + k);
    if (Math.random() < 0.4) pen.puff("heat", rand(b.x, core.x + 60), floor + rand(2, 40), 3, 1);
    if (k > 0.55 && Math.random() < 0.35) fx.debris({ x: rand(core.x - 60, core.x + 70), y: floor + 6 }, 1, { power: 0.5 });
  } });
  // 2. the ground splits
  mate.fly.x = 0; mate.sx.t = 1; mate.sy.t = 1.1;
  sound.sfx("shatter"); fx.hitstop(80); fx.shake(14);
  const cracks = fissures(C, floor);
  const CR = 2000;
  pxTop.add({ dur: CR, z: 2, draw(g, k, t) {
    const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, pulse = 0.85 + 0.15 * Math.sin(t * 0.02);
    glow(g, C.x, C.y, 90, "#ff7a2f", 0.45 * fade * pulse);
    for (const [i, c] of cracks.entries()) {
      const prog = clamp01((t - i * 25 - c.depth * 160) / 380); if (prog <= 0) continue;
      const n = Math.max(2, Math.ceil(prog * c.pts.length)), pts = c.pts.slice(0, n).map((p) => [p.x, p.y]), w = (c.depth === 0 ? 15 : 8) * (0.5 + 0.5 * prog);
      g.globalAlpha = fade;
      ribbon(g, pts, w + 4, 2, "#140a06"); ribbon(g, pts, w, 1.4, "#ff6a24"); ribbon(g, pts, w * 0.5, 0.8, "#ffe9a0");
      g.globalAlpha = 1;
    }
  } });
  fx.sparks({ x: C.x, y: C.y - 8 }, 16, { colors: SPARK, power: 1 });
  // geysers punch up along the cracks, one after another
  const spots = cracks.filter((c) => c.depth === 0).map((c) => c.pts[4]);
  toon.add({ dur: 1500, draw(pen, k, t) {
    for (const [i, p] of spots.entries()) { const u = clamp01((t - 250 - i * 110) / 520); if (u <= 0 || u >= 1) continue; pen.flame(p.x, p.y + 6, 9, 95 * Math.sin(u * Math.PI) ** 0.7, 1.15, Math.sin(t * 0.01 + i) * 0.1, 0.2); }
  } });
  spots.forEach((p, i) => setTimeout(() => { fx.debris({ x: p.x, y: p.y }, 3, { power: 0.9 }); fx.shake(5); }, 250 + i * 110));
  await wait(s, 1300);
  // 3. the eruption
  fx.hitstop(190); fx.shake(26); fx.punch(0.07, core); fx.flash(0.55, "#ffe8b8"); fx.darken(0, 700);
  sound.sfx("explosion", {}); sound.sfx("impact", { size: 1.8 }); sound.sfx("rumble");
  stagger(s, true); s.onHit(1);
  const H = 360, bombs = Array.from({ length: 18 }, () => ({ vx: rand(-260, 260), vy: -rand(380, 760), r: rand(5, 11), d: rand(0, 260) }));
  toon.add({ dur: 2300, draw(pen, k, t) {
    const up = ease.out(clamp01(t / 380)), thin = 1 - clamp01((t - 1350) / 950);
    for (let y = 0; y <= H * up; y += 7) {
      const u = y / H, w = ((26 + 22 * u + 62 * u ** 3) * (0.8 + 0.32 * Math.sin(y * 0.1 + t * 0.014)) + hash(Math.floor(y / 7)) * 5) * thin + 3;
      const sway = Math.sin(t * 0.011 + u * 6) * (4 + 14 * u);
      pen.puff("heat", C.x + sway, floor + 16 - y, w * 1.4, 0.16 * thin); pen.puff("heat", C.x + sway, floor + 16 - y, w, 0.2 * thin);
      if (u < 0.6) pen.puff("heat", C.x + sway, floor + 16 - y, w * 0.4, 0.2 * thin);
    }
    for (let i = 0; i < 12; i++) {   // flame tongues whirling round the column
      const u = (i / 12 + t * 0.0004) % 1, y = u * H * up, a = i * 2.1 + t * 0.009;
      pen.flame(C.x + Math.cos(a) * (36 + 24 * u) , floor + 16 - y, 11, (34 + 20 * Math.sin(t * 0.01 + i)) * thin, 1.0 * thin, Math.cos(a) * 0.3, 0.3);
    }
    for (const m of bombs) {   // lava bombs thrown up and falling
      const tt = (t - m.d) / 1000; if (tt < 0) continue;
      const x = C.x + m.vx * tt, y = floor + 10 + m.vy * tt + 620 * tt * tt;
      if (y > floor + 30) continue;
      for (let j = 0; j < 4; j++) { const t2 = Math.max(0, tt - j * 0.025); pen.puff("heat", C.x + m.vx * t2, floor + 10 + m.vy * t2 + 620 * t2 * t2, m.r * (1 - j * 0.2), 1 - j * 0.22); }
    }
    if (t > 500) for (let i = 0; i < 7; i++) {   // dark smoke rolling off the top
      const u = clamp01((t - 500) / 1700), a = i * 0.95 + u * 1.1;
      pen.puff("smoke", C.x + Math.cos(a) * (60 + 90 * u), floor + 16 - H * 0.85 * up - 14 - u * 60 + Math.sin(a) * 26, 30 + 26 * u, Math.min(1, u * 3) * (1 - u * 0.7), clamp01(u * 1.2));
    }
  } });
  fx.sparks({ x: C.x, y: floor - 60 }, 36, { colors: SPARK, power: 2 });
  await wait(s, 560);
  fx.hitstop(100); fx.shake(14); s.onHit(2); s.heat(0.3); s.golem.rest(1100);
  mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 1300);
}

// ---- Comet Dive (medium) ----------------------------------------------------------------------------------------
// Flames on, he flies at GOLEM in a blaze with a real flame trail behind him, drives in, and sinks into the fire; then he
// relights at home (his roaming), no going back.
async function cometDive(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), b = baseOf(s), floor = fx.floorY;
  const mid = (p) => ({ x: p.x - b.x, y: p.y - (b.y - 55) });
  const T = mid({ x: core.x - 48, y: core.y + 10 }), F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  mate.setMood("fierce"); mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 600 });
  mate.sx.t = 1.2; mate.sy.t = 0.78;
  toon.add({ dur: 760, draw(pen, k, t) { for (let i = -3; i <= 3; i++) { if (i === 0) continue; pen.flame(b.x + i * 32, floor + 2, 9, 70 * Math.sin(clamp01(t / 760) * Math.PI) ** 0.7, 1.1, Math.sin(t * 0.01 + i) * 0.1, 0.2); } pen.puff("heat", b.x, b.y - 40, 40 * k, 0.9 * k); } });
  await wait(s, 520);
  sound.sfx("whoosh", { theme: "fire" }); mate.sx.t = 0.85; mate.sy.t = 1.25; fx.shake(6);
  let prev = { x: 0, y: 0 };
  comet(s.toonBack, () => ({ x: b.x + F.x, y: b.y - 55 + F.y }), 560, { r: 22, life: 520 });   // behind him: he stays in view in front of his own fire
  await s.spr.add({ dur: 560, draw(g, k) {
    const e = ease.in(k * 0.85 + 0.15 * k), x = T.x * e, y = T.y * e - Math.sin(k * Math.PI) * 150, ang = Math.atan2(y - prev.y, x - prev.x); prev = { x, y };
    F.x = x; F.y = y; F.rot = ang - Math.PI / 2 * 0.95; F.sx = 0.85; F.sy = 1.3;
  } });
  const hit = { x: core.x - 24, y: core.y + 6 };
  fx.hitstop(190); fx.shake(20); fx.punch(0.07, hit); fx.flash(0.4, "#fff6dc"); sound.sfx("impact", { size: 1.6 }); sound.sfx("explosion", {});
  explode(toon, hit.x, hit.y, { size: 1.5, dur: 1400 }); fx.sparks(hit, 22, { colors: SPARK, power: 1.5 }); fx.debris(hit, 8, { power: 1.2 }); stagger(s, true);
  s.onHit(2); s.heat(0.2);
  mate.sx.t = 1; mate.sy.t = 1; F.rot *= 0.5; F.sx = 1; F.sy = 1;
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
// Marvel's Phoenix and the Human Torch: he flames on and the firebird opens round him: two big smooth wings of flame swept up
// like horns (the reference's symmetrical silhouette), a flame crest, a trailing tail. He rises out of sight, dives, the nova
// melts a Firewall; he sinks into the blaze and relights at home. Wings are big cel masses (no feathers, no spikes).
async function phoenix(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  const F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  mate.setMood("fierce"); mate.flare = 1;
  const bird = { open: 0, flap: 0, x: b.x, y: b.y - 55, rot: 0, power: 0, on: false };
  const bez = (a, c1, c2, d, t) => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * d.y }; };
  const wing = (pen, side, t) => {
    const { x, y, power: P } = bird, sp = bird.open, th = -side * Math.sin(t * 0.0105) * 0.38 * bird.flap + side * bird.rot * 0.0;
    const rot = (p) => { const c = Math.cos(th), sn = Math.sin(th); return { x: x + (p.x * c - p.y * sn) * P, y: y + (p.x * sn + p.y * c) * P }; };
    const arm = (A, B, C, D, rMax, hot) => {   // a big smooth horn of flame along a curve, fat in the middle
      const pa = rot(A), pb = rot(B), pc = rot(C), pd = rot(D);
      for (let i = 0; i <= 22; i++) {
        const u = i / 22, p = bez(pa, pb, pc, pd, u), r = (8 + rMax * Math.sin(Math.PI * Math.min(1, u * 1.08)) ** 0.85) * P * (0.85 + 0.15 * Math.sin(t * 0.01 + i));
        pen.puff("heat", p.x, p.y, r * 1.35, 0.32); pen.puff("heat", p.x, p.y, r, 0.5);
        if (u < 0.85) pen.puff("heat", p.x, p.y, r * 0.5, hot);
        if (i % 4 === 2 && u > 0.2) pen.flame(p.x, p.y, 7, 26 * P, 1.0, side * 0.25, 0.3 * side);   // flames licking off the top edge
      }
    };
    arm({ x: side * 8, y: -6 }, { x: side * (50 + 40 * sp), y: -20 - 30 * sp }, { x: side * (95 + 70 * sp), y: -50 - 110 * sp }, { x: side * (120 + 70 * sp), y: -130 - 120 * sp }, 26, 0.5);   // the big upper horn
    arm({ x: side * 8, y: 4 }, { x: side * (45 + 35 * sp), y: 10 }, { x: side * (80 + 50 * sp), y: 30 + 20 * bird.flap }, { x: side * (110 + 60 * sp), y: 70 + 30 * sp }, 17, 0.45);   // the lower sweep
  };
  const drawBird = (pen, t) => {
    if (!bird.on) return;
    const P = bird.power;
    pen.puff("heat", bird.x, bird.y, 52 * P, 0.4); pen.puff("heat", bird.x, bird.y, 34 * P, 0.55);
    wing(pen, 1, t); wing(pen, -1, t);
    for (let j = -1; j <= 1; j++) {   // the tail: three thick streamers waving down behind him
      for (let i = 0; i <= 9; i++) { const v = i / 9; pen.puff("heat", bird.x + j * 16 * v * 1.4 + Math.sin(t * 0.009 + v * 4 + j) * 12 * v, bird.y + 22 + v * 100 * P, (16 - v * 12) * P, 0.85 - v * 0.4); }
    }
    for (let j = -1; j <= 1; j++) pen.flame(bird.x + j * 10, bird.y - 34 * P, 7, 34 * P, 1.2, j * 0.25, 0.3);   // the crest
  };
  toon.add({ dur: 14000, draw(pen, k, t) { drawBird(pen, t); } });
  // 1. flame on: a ring of fire tongues round his feet, he crouches
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 900 }); fx.darken(0.55, 500);
  toon.add({ dur: 900, draw(pen, k, t) { for (let i = -3; i <= 3; i++) { if (i === 0) continue; pen.flame(b.x + i * 30, floor + 2, 9, 78 * Math.sin(clamp01(t / 900) * Math.PI) ** 0.7, 1.1, Math.sin(t * 0.01 + i) * 0.1, 0.2); } } });
  mate.sx.t = 1.15; mate.sy.t = 0.85;
  await wait(s, 560);
  // 2. the wings open
  bird.on = true; sound.sfx("wings");
  await s.spr.add({ dur: 800, draw(g, k) { bird.open = ease.out(k); bird.power = 0.3 + 0.7 * ease.out(k); bird.flap = 0.5; mate.sx.t = 1; mate.sy.t = 1; } });
  fx.flash(0.25, "#ffd28a");
  // 3. he rises out of the top of the sky, wings beating
  sound.sfx("whoosh", { theme: "fire" });
  await s.spr.add({ dur: 950, draw(g, k) {
    const e = ease.in(k); F.x = (core.x - b.x) * 0.25 * e; F.y = -(b.y + 340) * e; bird.flap = 1; bird.x = b.x + F.x; bird.y = b.y - 55 + F.y;
    if (Math.random() < 0.5) fx.sparks({ x: bird.x, y: bird.y + 24 }, 1, { colors: SPARK, power: 0.4 });
  } });
  fx.darken(0.78, 250); await wait(s, 480);
  // 4. the dive: wings swept back
  sound.sfx("whoosh", { theme: "fire" }); sound.sfx("laserBeam", {});
  const start = { x: bird.x, y: -90 };
  await s.spr.add({ dur: 560, draw(g, k) {
    const e = ease.in(k), x = lerp(start.x, core.x - 6, e), y = lerp(start.y, core.y, e), ang = Math.atan2(core.y - start.y, core.x - start.x);
    F.x = x - b.x; F.y = y - (b.y - 55); F.rot = ang - Math.PI / 2 + Math.PI; F.sy = 1.15;
    bird.x = x; bird.y = y; bird.open = 0; bird.power = lerp(1, 0.68, k); bird.flap = 0;   // wings folded in, a compact spear of fire
  } });
  // 5. the nova: one colossal blaze, the Firewall melting
  bird.on = false;
  if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
  fx.hitstop(280); fx.shake(30); fx.punch(0.1, core); fx.flash(0.8, "#fff6e0"); fx.darken(0, 700);
  sound.sfx("impact", { size: 2.1 }); sound.sfx("explosion", {}); sound.sfx("rumble");
  s.onHit(1); stagger(s, true);
  explode(toon, core.x, core.y, { size: 2.8, dur: 2100 });
  toon.add({ dur: 2000, draw(pen, k, t) {
    const up = ease.out(clamp01(t / 420)), thin = 1 - clamp01((t - 1100) / 900);
    for (let y = 0; y <= 330 * up; y += 8) { const u = y / 330, w = (30 + 24 * u + 60 * u ** 3) * (0.8 + 0.3 * Math.sin(y * 0.11 + t * 0.013)) * thin + 3; const sw = Math.sin(t * 0.011 + u * 6) * (4 + 12 * u); pen.puff("heat", core.x + sw, floor + 16 - y, w * 1.4, 0.3 * thin); pen.puff("heat", core.x + sw, floor + 16 - y, w, 0.4 * thin); if (u < 0.7) pen.puff("heat", core.x + sw, floor + 16 - y, w * 0.4, 0.2 * thin); }
  } });
  fx.debris(core, 22, { power: 2 }); fx.sparks(core, 44, { colors: SPARK, power: 2.1 });
  await wait(s, 700);
  fx.hitstop(100); fx.shake(14); s.onHit(2); s.heat(0.4); s.golem.rest(1200);
  mate.sx.t = 1; mate.sy.t = 1; F.rot = 0; F.sx = 1; F.sy = 1;
  await sinkAway(s, 520);
  await wait(s, 500);
  await relightHome(s);
}

export const PYRO_V4 = {
  emberShot: { name: "Fireball", run: fireball, desc: "A core of fire gathers inside him and bursts out of him as a comet." },
  crescentWave: { name: "Flame Orbit", run: flameOrbit, desc: "Three fireballs spin out of him, circle him, then are thrown at the boss one after another." },
  eruption: { run: eruption, desc: "A rumble, the ground cracks under the boss, and a colossal column of fire erupts through him." },
  cometKick: { name: "Comet Dive", run: cometDive, desc: "He flames on, flies at the boss in a blaze and drives into him, then relights at home." },
  meteorRain: { run: meteorRain, desc: "He vanishes into the sky and calls down meteors on the boss, then relights." },
  infernoLine: { name: "Phoenix", run: phoenix, counters: "firewall", desc: "A firebird opens round him. He climbs out of sight, dives, and the nova melts the boss's Firewall." },
};
