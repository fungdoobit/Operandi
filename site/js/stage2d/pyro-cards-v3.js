// PYRO's cards, third pass (Isaac 2026-10-24): "all very bad and poorly done except Sunfire Halo". Sunfire is built on
// the cel-shaded toon layer (pixel/toon-fx.js: fire painted into a heat field, drawn as hard colour bands with living
// edges), so everything here is too, with the shapes of Isaac's references: comet tails of flowing ribbons, a jet of fire
// that pools into a blaze, a star of glowing cracks with fire spires, a column with rings round it and grey dust arcs
// at its foot, spiked nova bursts, a firebird. His own body acts too (PyroFighter.fly): it leans, thrusts, flies.
// Cards: Fireball (basic), Flame Jet (light), Eruption (medium), Comet Dive (medium), Meteor Rain (ultimate), Phoenix (ultimate II).
import { ease, lerp, glow, starFlash, ribbon } from "../pixel/pixel-fx.js";
import { explode } from "../pixel/toon-fx.js";
import { sound } from "../sound.js";

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp2 = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const wait = (s, ms) => s.fx.wait(ms);
const baseOf = (s) => s.fx.at(s.mate.figure, { fy: 1 });
const SPARK = ["#fff4d6", "#ffd27a", "#ff9a3c", "#e04a1c"];

// ---- shared pieces -------------------------------------------------------------------------------------------

// A comet: a bright head on a path with a long flowing tail of fire and ribbon strands (the "classic fireball" reference).
// getPos(u) gives the head's place for progress 0..1 over ms; the tail then burns out over life ms.
function comet(toon, getPos, ms, { r = 14, strands = 4, life = 640 } = {}) {
  const hist = [];
  return toon.add({ dur: ms + life, draw(pen, k, t) {
    const u = Math.min(1, t / ms), moving = t < ms;
    if (moving) { const p = getPos(u); hist.push({ x: p.x, y: p.y, t }); }
    const head = hist[hist.length - 1];
    for (let i = 0; i < hist.length; i++) {   // the body of the tail: puffs that shrink and cool with age
      const q = hist[i], age = (t - q.t) / life; if (age > 1) continue;
      pen.puff("heat", q.x - age * 12, q.y + Math.sin(i * 0.7) * age * 7 - age * 10, r * (1.25 - age * 0.95), 1.0 * (1 - age * 0.95));
    }
    for (let j = 0; j < strands; j++) {       // ribbon strands streaming behind, weaving
      const pts = [], side = (j % 2 ? 1 : -1) * (0.6 + 0.3 * j);
      for (let i = hist.length - 1; i >= 0 && pts.length < 26; i--) {
        const q = hist[i], age = (t - q.t) / life; if (age > 1) break;
        pts.push([q.x - age * 8, q.y + Math.sin(age * 7 + j * 1.7 + t * 0.012) * (3 + age * 20) * side]);
      }
      if (pts.length > 2) pen.limb("heat", pts, r * 0.6, 1, 0.78 - j * 0.1);
    }
    if (moving && head) { pen.puff("heat", head.x, head.y, r * 2.5, 0.4); pen.puff("heat", head.x, head.y, r * 1.6, 0.95); pen.puff("heat", head.x, head.y, r, 1.45); }
  } });
}

// Grey dust thrown out sideways from a point on the floor (the splashes under the references' impacts).
function dustArcs(s, x, size = 1, ms = 520) {
  const floor = s.fx.floorY;
  return s.pxTop.add({ dur: ms, z: 4, draw(g, k) {
    const e = ease.out(k), fade = 1 - clamp01((k - 0.45) / 0.55);
    for (const dir of [-1, 1]) for (let j = 0; j < 3; j++) {
      const reach = (46 + j * 30) * size * e, up = (34 + j * 16) * size * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.8);
      const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([x + dir * (12 + reach * u), floor + 6 - up * Math.sin(u * Math.PI * 0.85) * (1 - u * 0.3)]); }
      g.globalAlpha = fade; ribbon(g, pts, 11 * size * (1 - j * 0.2), 1.2, j % 2 ? "#aeb4c0" : "#d9dde4"); g.globalAlpha = 1;
    }
  } });
}
// A flat ellipse ring standing on the floor (a ripple), in pixel-art strokes.
function floorRing(s, x, { size = 90, ms = 520, color = "#ffe9b0", width = 4, y } = {}) {
  const fy = y ?? s.fx.floorY + 8;
  return s.pxTop.add({ dur: ms, z: 3, draw(g, k) { const e = ease.out(k); g.globalAlpha = 1 - k; g.strokeStyle = color; g.lineWidth = width * (1 - k * 0.5); g.beginPath(); g.ellipse(x, fy, size * e, size * e * 0.22, 0, 0, 7); g.stroke(); g.globalAlpha = 1; } });
}
// Rays flashing out from a point (the hit star of the references).
function rays(s, at, { n = 14, len = 120, ms = 260, color = "#fff6d8" } = {}) {
  return s.pxTop.add({ dur: ms, z: 6, draw(g, k) {
    const f = k < 0.25 ? k / 0.25 : (1 - k) / 0.75;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2, L = len * f * (i % 2 ? 0.55 : 1), x2 = at.x + Math.cos(a) * L, y2 = at.y + Math.sin(a) * L;
      ribbon(g, [[at.x + Math.cos(a) * 8, at.y + Math.sin(a) * 8], [x2, y2]], 7 * f, 0.5, color);
    }
    glow(g, at.x, at.y, len * 0.55 * f, "#ff9a3c", 0.6);
    starFlash(g, at.x, at.y, len * 0.5 * f, color);
  } });
}
// Fire tongues standing up from the floor.
function spires(toon, xs, floor, { h = 40, ms = 700, delay = 0 } = {}) {
  return toon.add({ dur: ms + delay, draw(pen, k, t) {
    if (t < delay) return;
    const u = (t - delay) / ms, up = Math.sin(clamp01(u) * Math.PI) ** 0.6;
    for (const [i, x] of xs.entries()) pen.flame(x, floor + 4, 7 + (i % 3) * 3, h * up * (0.7 + (i % 3) * 0.2), 1.1 * (1 - u * 0.4), Math.sin(t * 0.01 + i) * 0.12, 0.2);
  } });
}
const stagger = (s, big = false) => { s.golem.to({ bob: big ? 0.38 : 0.12, tilt: big ? -0.22 : -0.06, flare: big ? 1.4 : 0.5 }, big ? 240 : 120, "out"); };

// ---- Fireball (basic) ------------------------------------------------------------------------------------------
// A bright core gathers INSIDE him (sparks spiralling into his middle), he thrusts, and it bursts out of his front as a comet
// with a long flowing tail. It hits in a hard star burst and a cel explosion.
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
  comet(toon, (u) => { const e = ease.in(u * 0.7 + 0.3 * u); return { x: lerp(heart.x + 20, hit.x, e), y: lerp(heart.y, hit.y, e) - Math.sin(u * Math.PI) * 26 }; }, 360, { r: 17, strands: 4, life: 330 });
  await wait(s, 360);
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null;
  fx.hitstop(90); fx.shake(9); fx.punch(0.03, hit); sound.sfx("impact", { size: 1 });
  rays(s, hit, { n: 14, len: 110, ms: 280 });
  explode(toon, hit.x, hit.y, { size: 0.9, dur: 1100 });
  fx.sparks(hit, 14, { colors: SPARK, power: 1.2 }); stagger(s);
  s.onHit(2); s.heat(0.1);
  mate.setMood("idle");
  await wait(s, 700);
}

// ---- Flame Jet (light) -----------------------------------------------------------------------------------------
// He leans in and breathes a jet of fire out of his body: a white-hot core in a wavering orange stream that pools into a
// roaring blaze on GOLEM, with fire licking up over him. (The flamethrower of the references.)
async function flameJet(s) {
  const { fx, mate, toon } = s;
  const me = s.mateC(), core = s.golemC(), hit = lerp2(s.P("claw"), core, 0.5), N = { x: me.x + 30, y: me.y - 6 };
  mate.setMood("fierce"); mate.sx.t = 1.1; mate.sy.t = 0.9; mate.fly = { x: -6, y: 0, rot: -0.06, sx: 1, sy: 1 }; mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 500 });
  await toon.add({ dur: 460, draw(pen, k) { pen.puff("heat", N.x, N.y, 6 + 14 * k, 1.3 * k); pen.puff("heat", N.x, N.y, 26 * k, 0.5 * k); } });
  mate.fly.x = 10; mate.sx.t = 1.05; mate.sy.t = 0.96; mate.fly.rot = 0.04;
  sound.sfx("whoosh", { theme: "fire" });
  let reached = false;
  const dur = 1500;
  const jet = toon.add({ dur, draw(pen, k, t) {
    const grow = clamp01(t / 260), fade = 1 - clamp01((t - 1150) / 350), dx = hit.x - N.x, dy = hit.y - N.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const M = 34;
    for (let i = 0; i <= M; i++) {
      const u = (i / M) * grow, w = Math.sin(u * 9 - t * 0.022) * (5 + 16 * u) + Math.sin(u * 4.3 - t * 0.011) * 4;
      const x = N.x + dx * u + nx * w, y = N.y + dy * u + ny * w, r = (6 + 18 * u) * fade;
      pen.puff("heat", x, y, r * 1.5, 0.5 * fade); pen.puff("heat", x, y, r, 0.95 * fade);
      if (i % 2 === 0) pen.puff("heat", x, y, r * 0.55, 1.5 * fade);   // the white-hot core
    }
    if (grow >= 1) {   // the blaze at GOLEM: a mound of fire with tongues licking up, building and settling
      if (!reached) reached = true;
      const b = clamp01((t - 260) / 500) * fade;
      for (let i = 0; i < 9; i++) pen.puff("heat", hit.x + (i - 4) * 17 + Math.sin(t * 0.02 + i) * 5, hit.y + 6 + Math.abs(i - 4) * 4, (34 - Math.abs(i - 4) * 3) * (0.5 + 0.5 * b), 1.2 * b);
      for (let i = 0; i < 8; i++) pen.flame(hit.x + (i - 3.5) * 22, hit.y + 16, 13, (60 + 50 * Math.abs(Math.sin(t * 0.008 + i * 1.7))) * b, 1.15 * b, Math.sin(t * 0.01 + i) * 0.15, 0.25);
    }
  } });
  await wait(s, 330);
  fx.hitstop(70); fx.shake(8); sound.sfx("hit", { size: 1.1 }); rays(s, hit, { n: 10, len: 90, ms: 220 }); fx.sparks(hit, 10, { colors: SPARK, power: 1 });
  stagger(s); s.onHit(1);
  for (let i = 0; i < 4; i++) { await wait(s, 230); fx.shake(4); fx.sparks(hit, 5, { colors: SPARK, power: 0.8 }); }
  fx.hitstop(90); fx.shake(11); sound.sfx("impact", { size: 1.1 }); explode(toon, hit.x, hit.y - 8, { size: 0.9, dur: 1000 });
  s.onHit(2); s.heat(0.15);
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null; mate.setMood("idle");
  await jet; await wait(s, 200);
}

// ---- Eruption (medium) -----------------------------------------------------------------------------------------
// Isaac's design: a rumble, the ground cracks under GOLEM, a huge eruption comes up through him. One tall column (not a pile
// of explosions): a white-hot core, a flared top, rings round it, dark smoke rolling off the top, dust arcs at its foot.
async function eruption(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s), C = { x: core.x + 6, y: floor + 20 };
  mate.setMood("fierce"); mate.sx.t = 1.16; mate.sy.t = 0.8; mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; mate.flare = 1;
  // 1. the rumble: stage and floor heave, dust jumps, embers hop, and he trembles
  sound.sfx("rumble"); sound.sfx("laserCharge", { ms: 1300 }); fx.darken(0.45, 700);
  await toon.add({ dur: 1300, draw(pen, k, t) {
    mate.fly.x = Math.sin(t * 0.09) * 2.2 * k; fx.shake(2 + 8 * k);
    if (Math.random() < 0.25 + 0.4 * k) fx.dust(rand(b.x + 40, core.x + 90), 2, 0.5 + k);
    if (Math.random() < 0.3) pen.puff("heat", rand(b.x - 20, core.x + 40), floor + rand(2, 30), 3, 1);
  } });
  // 2. the ground splits: a star of jagged glowing cracks from under GOLEM, fire spires thrusting along them
  mate.fly.x = 0; mate.sx.t = 1; mate.sy.t = 1.1;
  sound.sfx("shatter"); fx.hitstop(70); fx.shake(12);
  const branches = [];
  for (let i = 0; i < 9; i++) {
    const th = (i / 9) * Math.PI * 2 + rand(-0.2, 0.2), pts = [[C.x, C.y]]; let x = C.x, y = C.y;
    for (let j = 0; j < 9; j++) { const a = th + rand(-0.55, 0.55), len = rand(14, 30) * (1 + j * 0.05); x += Math.cos(a) * len; y += Math.sin(a) * len * 0.36; pts.push([x, Math.max(floor - 4, Math.min(floor + 74, y))]); }
    branches.push(pts);
  }
  const forks = branches.flatMap((pts) => [3, 6].map((at) => { const [x, y] = pts[at], a = rand(-1, 1) + (pts[at][0] > C.x ? 0.4 : Math.PI - 0.4); return [[x, y], [x + Math.cos(a) * 26, y + Math.sin(a) * 9], [x + Math.cos(a) * 46, y + Math.sin(a) * 15]]; }));
  const cracks = toon.add({ dur: 1700, draw(pen, k) {
    const grow = clamp01(k * 6), glow2 = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
    for (const pts of branches) { const n = Math.max(2, Math.floor(grow * pts.length)); pen.line("heat", pts.slice(0, n), 5, 1.15 * glow2); }
    for (const f of forks) if (grow > 0.55) pen.line("heat", f, 3, 1 * glow2);
    pen.oval("heat", C.x, C.y, 70 * grow, 16 * grow, 0.8 * glow2);
  } });
  spires(toon, branches.flatMap((pts) => [pts[3][0], pts[6][0]]), floor + 14, { h: 38, ms: 600, delay: 200 });
  fx.sparks({ x: C.x, y: C.y - 8 }, 16, { colors: SPARK, power: 1 }); dustArcs(s, C.x, 0.9, 600);
  await wait(s, 640);
  // 3. the eruption
  fx.hitstop(170); fx.shake(22); fx.punch(0.06, core); fx.flash(0.4, "#ffe8b8"); fx.darken(0, 600);
  sound.sfx("explosion", {}); sound.sfx("impact", { size: 1.7 }); sound.sfx("rumble");
  stagger(s, true); s.onHit(1);
  const H = 300;
  toon.add({ dur: 1500, draw(pen, k, t) {
    const up = ease.out(clamp01(k / 0.28)), thin = 1 - clamp01((k - 0.62) / 0.38);
    for (let y = 0; y <= H * up; y += 8) {
      const u = y / H, w = (20 + 14 * u + 46 * u * u * u) * thin * (0.82 + 0.3 * Math.sin(y * 0.11 + t * 0.012)) + 3;   // narrow shaft, flared top, ragged edge
      const sway = Math.sin(t * 0.012 + u * 6) * 6;
      pen.puff("heat", C.x + sway, floor + 14 - y, w * 1.35, 0.3 * thin); pen.puff("heat", C.x + sway, floor + 14 - y, w, 0.38 * thin);
      if (u < 0.7) pen.puff("heat", C.x + sway, floor + 14 - y, w * 0.4, 0.4 * thin);
    }
    if (k > 0.2) for (let i = 0; i < 6; i++) {   // dark smoke rolling off the top
      const u = clamp01((k - 0.2) / 0.8), a = i * 1.05 + u * 1.2;
      pen.puff("smoke", C.x + Math.cos(a) * (50 + 70 * u), floor + 14 - H * 0.92 * up - 10 - u * 50 + Math.sin(a) * 22, 26 + 22 * u, Math.min(1, u * 3) * (1 - u * 0.7), clamp01(u * 1.2));
    }
    for (let i = 0; i < 8; i++) pen.flame(C.x + (i - 3.5) * 24, floor + 16, 10, (60 + 40 * Math.abs(Math.sin(t * 0.009 + i))) * thin * up, 1.0 * thin, Math.sin(t * 0.01 + i) * 0.2, 0.2);
  } });
  for (const [i, col] of ["#ffd84a", "#ff5a3a", "#ffe9b0"].entries()) {   // rings climbing the column (the references)
    s.pxTop.add({ dur: 900, z: 5, draw(g, k0, t) {
      const k = clamp01((t - i * 160) / 740); if (t < i * 160) return; const e = ease.out(k);
      g.globalAlpha = 1 - k * k; g.strokeStyle = col; g.lineWidth = 4 - k * 2; g.beginPath(); g.ellipse(C.x, floor + 10 - 40 - e * 210, 52 + 34 * e, 10 + 5 * e, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    } });
  }
  fx.debris({ x: C.x, y: floor - 20 }, 18, { power: 1.7 }); fx.sparks({ x: C.x, y: floor - 60 }, 30, { colors: SPARK, power: 1.8 }); dustArcs(s, C.x, 1.5, 700); floorRing(s, C.x, { size: 150, ms: 700 });
  await wait(s, 520);
  fx.hitstop(90); fx.shake(12); s.onHit(2); s.heat(0.3); s.golem.rest(1000);
  mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 1000);
}

// ---- Comet Dive (medium) ----------------------------------------------------------------------------------------
// "Flame on": fire spires burst round his feet, then he flies at GOLEM wrapped in flame, a long tail behind him, and drives into
// him feet first: shock rings, a star of rays, dust arcs, a fire bloom. He flips off and lands back at his place.
async function cometDive(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), b = baseOf(s), floor = fx.floorY;
  const mid = (p) => ({ x: p.x - b.x, y: p.y - (b.y - 55) });
  const T = mid({ x: core.x - 52, y: core.y + 10 }), F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  mate.setMood("fierce"); mate.flare = 1;
  // 1. flame on: a ring of fire spires erupts round his feet, he crouches
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 600 });
  mate.sx.t = 1.2; mate.sy.t = 0.78;
  spires(toon, [-90, -60, -32, 32, 60, 90].map((d) => b.x + d), floor - 2, { h: 70, ms: 760 }); floorRing(s, b.x, { size: 120, ms: 600, color: "#ffd27a" });
  toon.add({ dur: 600, draw(pen, k) { pen.puff("heat", b.x, b.y - 40, 40 * k, 0.9 * k); } });
  await wait(s, 520);
  // 2. the flight: his body tilted along the path, wrapped in a halo of fire, a long flowing tail
  sound.sfx("whoosh", { theme: "fire" }); mate.sx.t = 0.85; mate.sy.t = 1.25; fx.shake(6);
  const body = () => ({ x: b.x + F.x, y: b.y - 55 + F.y });
  let prev = { x: 0, y: 0 };
  comet(s.toonBack, (u) => { const p = body(); return { x: p.x, y: p.y }; }, 560, { r: 22, strands: 5, life: 420 });   // behind him, so he stays in view inside the fire
  await s.spr.add({ dur: 560, draw(g, k) {
    const e = ease.in(k * 0.85 + 0.15 * k), x = T.x * e, y = T.y * e - Math.sin(k * Math.PI) * 150, ang = Math.atan2(y - prev.y, x - prev.x); prev = { x, y };
    F.x = x; F.y = y; F.rot = ang - Math.PI / 2 * 0.95; F.sx = 0.85; F.sy = 1.3;
  } });
  // 3. the kick lands
  const hit = { x: core.x - 24, y: core.y + 6 };
  fx.hitstop(190); fx.shake(18); fx.punch(0.07, hit); fx.flash(0.4, "#fff6dc"); sound.sfx("impact", { size: 1.6 }); sound.sfx("explosion", {});
  rays(s, hit, { n: 16, len: 150, ms: 320 }); floorRing(s, core.x, { size: 170, ms: 640 }); floorRing(s, core.x, { size: 110, ms: 520, color: "#ff7a2f", y: floor + 14 });
  dustArcs(s, core.x, 1.3, 640); explode(toon, hit.x, hit.y, { size: 1.3, dur: 1300 });
  fx.sparks(hit, 22, { colors: SPARK, power: 1.5 }); fx.debris(hit, 8, { power: 1.2 }); stagger(s, true);
  s.onHit(2); s.heat(0.2);
  await wait(s, 200);
  // 4. he flips off him and lands back where he started
  sound.sfx("whoosh", { theme: "fire" }); mate.sx.t = 1; mate.sy.t = 1;
  const from = { x: F.x, y: F.y, rot: F.rot };
  await s.spr.add({ dur: 560, draw(g, k) { const e = ease.io(k); F.x = lerp(from.x, 0, e); F.y = lerp(from.y, 0, e) - Math.sin(k * Math.PI) * 120; F.rot = lerp(from.rot, -Math.PI * 2, e); F.sx = lerp(0.85, 1, e); F.sy = lerp(1.3, 1, e); } });
  mate.fly = null; mate.sx.v = 1.2; mate.sy.v = 0.8; mate.flash = 1; sound.sfx("flameIgnite"); floorRing(s, b.x, { size: 80, ms: 400 }); mate.setMood("idle");
  await wait(s, 300);
}

// ---- Meteor Rain (ultimate) -------------------------------------------------------------------------------------
// He thrusts a pillar of fire up into the sky; the sky darkens; glowing rings mark the floor; meteors come down at different
// angles and sizes, each a comet with a flowing tail landing in a blast, ring and dust; then one huge one finishes him.
async function meteorRain(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  mate.setMood("fierce"); mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; mate.flare = 1;
  sound.sfx("laserCharge", { ms: 1000 }); fx.darken(0.55, 600);
  mate.sx.t = 0.86; mate.sy.t = 1.22;
  await toon.add({ dur: 900, draw(pen, k, t) {   // a pillar of fire from his top into the sky, sparks streaming up it
    const up = ease.out(clamp01(k / 0.5)), top = b.y - 110 - up * (b.y + 110);
    for (let y = b.y - 100; y > top; y -= 12) pen.puff("heat", b.x + 4 + Math.sin(t * 0.02 + y * 0.05) * 3, y, 12 + (b.y - y) * 0.015, 1.1 * (1 - k * 0.5));
  } });
  mate.sx.t = 1; mate.sy.t = 1;
  const spots = [-170, 60, -80, 150, -10].map((dx, i) => ({ x: core.x + dx, y: floor + 10 + (i % 2) * 10 }));
  sound.sfx("lockOn");
  spots.forEach((p, i) => setTimeout(() => floorRing(s, p.x, { size: 46, ms: 1100, y: p.y, color: "#ffd27a", width: 3 }), i * 150));
  await wait(s, 760);
  const sizes = [13, 17, 14, 19, 15];
  const falls = spots.map((p, i) => new Promise((done) => {
    setTimeout(() => {
      sound.sfx("whoosh", { theme: "fire" });
      const from = { x: p.x + (i % 2 ? 1 : -1) * rand(190, 320), y: -90 };
      comet(toon, (u) => ({ x: lerp(from.x, p.x, u * u * 0.5 + u * 0.5), y: lerp(from.y, p.y - 8, u * u * 0.6 + u * 0.4) }), 430, { r: sizes[i] + 3, strands: 3, life: 250 });
      setTimeout(() => {
        fx.hitstop(40); fx.shake(8 + i); sound.sfx("impact", { size: 1 });
        explode(toon, p.x, p.y - 10, { size: 0.55 + i * 0.04, dur: 800 }); floorRing(s, p.x, { size: 80, ms: 520, y: p.y + 2 }); dustArcs(s, p.x, 0.7, 460);
        fx.sparks({ x: p.x, y: p.y - 10 }, 9, { colors: SPARK, power: 1 }); fx.debris({ x: p.x, y: p.y - 14 }, 5, { power: 1 });
        if (Math.abs(p.x - core.x) < 190) stagger(s);
        s.chunk?.(0.1); done();
      }, 430);
    }, i * 280);
  }));
  await Promise.all(falls);
  await wait(s, 300);
  // the big one: slow, huge, straight down onto him
  sound.sfx("rumble"); fx.darken(0.7, 250);
  comet(toon, (u) => ({ x: lerp(core.x - 40, core.x, u), y: lerp(-150, core.y, u * u) }), 640, { r: 40, strands: 6, life: 420 });
  await wait(s, 640);
  fx.hitstop(230); fx.shake(26); fx.punch(0.09, core); fx.flash(0.65, "#fff1d0"); fx.darken(0, 600);
  sound.sfx("impact", { size: 2 }); sound.sfx("explosion", {});
  stagger(s, true); rays(s, core, { n: 18, len: 230, ms: 380 });
  explode(toon, core.x, core.y, { size: 2.3, dur: 1700 }); floorRing(s, core.x, { size: 260, ms: 760 }); floorRing(s, core.x, { size: 170, ms: 640, color: "#ff7a2f", y: floor + 16 }); dustArcs(s, core.x, 2, 800);
  fx.debris(core, 18, { power: 1.8 }); fx.sparks(core, 36, { colors: SPARK, power: 1.9 });
  s.onHit(2); s.heat(0.4); s.golem.rest(1000);
  mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 900);
}

// ---- Phoenix (ultimate II) --------------------------------------------------------------------------------------
// Marvel's Phoenix and the Human Torch: he flames on, and the firebird unfolds round his own body: wings of fanned flame
// feathers, a crest, a trailing tail. He climbs out of the sky, then dives; where he lands the nova bursts, melting a Firewall.
async function phoenix(s) {
  const { fx, mate, toon } = s;
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  const F = (mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  mate.setMood("fierce"); mate.flare = 1;
  const bird = { open: 0, flap: 0, x: b.x, y: b.y - 55, rot: 0, power: 0, on: false };
  // the firebird: drawn each frame on the toon layer round his body
  const wing = (pen, side, t) => {
    const { x, y } = bird, spread = bird.open, flap = Math.sin(t * 0.011) * 0.4 * bird.flap;
    for (let f = 0; f < 8; f++) {
      const u = f / 7, a = -0.35 + u * (1.45 * spread) + flap * (0.4 + u), len = (58 + 70 * Math.sin(u * 2.1 + 0.35)) * bird.power, ang = side > 0 ? a : Math.PI - a;
      const rot = bird.rot, ca = Math.cos(ang + rot), sa = Math.sin(ang + rot), sx0 = x + side * 12, sy0 = y - 6 - u * 10;
      const pts = []; for (let i = 0; i <= 7; i++) { const v = i / 7, bend = v * v * 0.42 * (side > 0 ? 1 : -1); pts.push([sx0 + Math.cos(ang + rot + bend) * len * v, sy0 + Math.sin(ang + rot + bend) * len * v]); }
      pen.limb("heat", pts, 28 * (1 - u * 0.25), 1, 0.5); pen.limb("heat", pts, 18 * (1 - u * 0.25), 1, 0.95); pen.limb("heat", pts.slice(0, 6), 8, 1, 1.5);
    }
  };
  const drawBird = (pen, t) => {
    if (!bird.on) return;
    pen.puff("heat", bird.x, bird.y, 48 * bird.power, 0.55); pen.puff("heat", bird.x, bird.y, 30 * bird.power, 1);
    wing(pen, 1, t); wing(pen, -1, t);
    for (let j = 0; j < 5; j++) {   // the tail: streamers waving behind and below him
      const pts = [], sw = (j - 2) * 0.28;
      for (let i = 0; i <= 8; i++) { const v = i / 8; pts.push([bird.x + Math.sin(t * 0.01 + v * 4 + j) * 10 * v + sw * 60 * v, bird.y + 24 + v * 90 * bird.power]); }
      pen.limb("heat", pts, 12, 1, 0.9 - j * 0.08);
    }
    for (let j = -1; j <= 1; j++) pen.flame(bird.x + j * 9, bird.y - 36 * bird.power, 6, 30 * bird.power, 1.2, j * 0.25, 0.3);   // the crest
  };
  const run = toon.add({ dur: 12000, draw(pen, k, t) { drawBird(pen, t); } });
  // 1. flame on
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 900 }); fx.darken(0.5, 500);
  spires(toon, [-80, -50, -24, 24, 50, 80].map((d) => b.x + d), floor - 2, { h: 76, ms: 800 }); floorRing(s, b.x, { size: 130, ms: 700 });
  mate.sx.t = 1.15; mate.sy.t = 0.85;
  await wait(s, 520);
  // 2. the wings unfold
  bird.on = true; sound.sfx("wings");
  await s.spr.add({ dur: 760, draw(g, k) { bird.open = ease.out(k); bird.power = 0.35 + 0.65 * ease.out(k); bird.flap = 0.6; mate.sx.t = 1; mate.sy.t = 1; } });
  rays(s, { x: bird.x, y: bird.y }, { n: 12, len: 130, ms: 300 });
  // 3. he climbs out of the top of the sky, wings beating, sparks falling off him
  sound.sfx("whoosh", { theme: "fire" });
  await s.spr.add({ dur: 900, draw(g, k) {
    const e = ease.in(k); F.x = (core.x - b.x) * 0.25 * e; F.y = -(b.y + 330) * e; bird.flap = 1; bird.x = b.x + F.x; bird.y = b.y - 55 + F.y;
    if (Math.random() < 0.5) fx.sparks({ x: bird.x, y: bird.y + 20 }, 1, { colors: SPARK, power: 0.4 });
  } });
  fx.darken(0.75, 250); await wait(s, 420);
  // 4. the dive: wings swept back, a streak of fire behind him
  sound.sfx("whoosh", { theme: "fire" }); sound.sfx("laserBeam", {});
  const start = { x: bird.x, y: -80 };
  await s.spr.add({ dur: 520, draw(g, k) {
    const e = ease.in(k), x = lerp(start.x, core.x - 6, e), y = lerp(start.y, core.y, e), ang = Math.atan2(core.y - start.y, core.x - start.x);
    F.x = x - b.x; F.y = y - (b.y - 55); F.rot = ang - Math.PI / 2 + Math.PI; F.sy = 1.15;
    bird.x = x; bird.y = y; bird.rot = ang - Math.PI / 2; bird.open = 0.2 * (1 - k); bird.flap = 0;
  } });
  // 5. the nova: a ring of spikes bursts out of him, the Firewall melts
  bird.on = false;
  if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
  fx.hitstop(260); fx.shake(28); fx.punch(0.09, core); fx.flash(0.75, "#fff6e0"); fx.darken(0, 600);
  sound.sfx("impact", { size: 2 }); sound.sfx("explosion", {});
  s.onHit(1); stagger(s, true);
  rays(s, core, { n: 22, len: 300, ms: 420 }); rays(s, core, { n: 12, len: 190, ms: 340, color: "#ffd27a" });
  explode(toon, core.x, core.y, { size: 2.6, dur: 1900 }); floorRing(s, core.x, { size: 300, ms: 800 }); floorRing(s, core.x, { size: 200, ms: 700, color: "#ff7a2f", y: floor + 16 }); dustArcs(s, core.x, 2.2, 900);
  spires(toon, [-120, -80, -40, 0, 40, 80, 120].map((d) => core.x + d), floor - 2, { h: 90, ms: 900 });
  fx.debris(core, 20, { power: 1.9 }); fx.sparks(core, 40, { colors: SPARK, power: 2 });
  await wait(s, 520);
  fx.hitstop(100); fx.shake(14); s.onHit(2); s.heat(0.4); s.golem.rest(1000);
  // he drifts back down to his place
  sound.sfx("wings"); bird.on = false;
  const from = { x: F.x, y: F.y };
  await s.spr.add({ dur: 700, draw(g, k) { const e = ease.io(k); F.x = lerp(from.x, 0, e); F.y = lerp(from.y, 0, e) - Math.sin(k * Math.PI) * 60; F.rot = lerp(F.rot, 0, e); F.sy = lerp(1.15, 1, e); } });
  mate.fly = null; mate.sx.v = 1.2; mate.sy.v = 0.8; mate.flash = 1; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 400);
}

export const PYRO_V3 = {
  emberShot: { name: "Fireball", run: fireball, desc: "A core of fire gathers inside him and bursts out of him as a comet." },
  crescentWave: { name: "Flame Jet", run: flameJet, desc: "He breathes a jet of fire that pools into a blaze on the boss." },
  eruption: { run: eruption, desc: "A rumble, the ground cracks under the boss, and a column of fire erupts through him." },
  cometKick: { name: "Comet Dive", run: cometDive, desc: "He flames on, flies at the boss wrapped in fire and drives into him." },
  meteorRain: { run: meteorRain, desc: "He calls fire from the sky: meteors rain down, then one huge one." },
  infernoLine: { name: "Phoenix", run: phoenix, counters: "firewall", desc: "A firebird unfolds round him. He climbs out of sight, dives, and the nova melts the boss's Firewall." },
};
