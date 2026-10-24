// PYRO's cards, second pass (Isaac 2026-10-24: "things come from outside of him", "cheap", "lazy", "straight line").
// The rule now: HIS OWN BODY does the acting. A piece of his flame tears off, he stretches into a whip, he really
// leaps, he swells, and GOLEM reacts to every hit. Effects are the fire packs (stage2d/pyro-fx.js).
// Previews: Ember Flick, Flame Lash (in place of Crescent Wave), Eruption, Comet Kick, Meteor Rain and two ideas
// for the ultimate (Supernova, Phoenix).
import { loadPyroFx, play, frame, tinted } from "./pyro-fx.js";
import { ease, lerp } from "../pixel/pixel-fx.js";
import { sound } from "../sound.js";

const PK = 102 / 64;          // stage px per art px on his body (PyroFighter)
const AW = 88, AH = 112;      // his canvas, art px (pyro-mate.js)
const FIRE = ["#fff4d6", "#ffd27a", "#ff9a3c", "#e04a1c"];
const GOLD = [255, 226, 150], RED = [214, 52, 36], WHITE = [255, 250, 230];
const wait = (s, ms) => s.fx.wait(ms);
const lerp2 = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const rand = (a, b) => a + Math.random() * (b - a);
// where his flame really starts and ends on his canvas (rows with solid pixels), art px
function bounds(m) {
  const d = m.g.getImageData(0, 0, AW, AH).data; let top = -1, bot = AH - 1;
  for (let y = 0; y < AH; y++) { let any = false; for (let x = 0; x < AW && !any; x++) any = d[(y * AW + x) * 4 + 3] > 200; if (any) { if (top < 0) top = y; bot = y; } }
  return { top: Math.max(0, top), bot };
}
// the bottom middle of his body on the stage
const baseOf = (s) => s.fx.at(s.mate.figure, { fy: 1 });
// his flame: which one is showing, and where its top is
const flameOf = (m) => ((m.mood === "angry" || m.flare > 0.35) ? m.fl.F : m.fl.E);
// a copy of what his canvas shows right now (or a band of rows of it), for pieces that tear off and afterimages
function snap(m, y0 = 0, h = AH) {
  const c = document.createElement("canvas"); c.width = AW; c.height = h;
  c.getContext("2d").drawImage(m.cv, 0, y0, AW, h, 0, 0, AW, h);
  return c;
}
// draw a snapshot with its bottom middle at (x, y)
function putSnap(g, c, x, y, { rot = 0, sx = 1, sy = 1, alpha = 1, scale = PK } = {}) {
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(rot); g.scale(sx, sy); g.globalAlpha = alpha; g.imageSmoothingEnabled = false;
  g.drawImage(c, -AW * scale / 2, -c.height * scale, AW * scale, c.height * scale); g.restore();
}
// the fire aura wraps him: the pack's dome swells up round his body
function wrapAura(s, A, ms = 560, scale = 1.7) {
  const b = baseOf(s);
  return play(s.spr, A.aura, { from: 0, to: 9, ms, x: b.x, y: b.y + 6, anchor: "b", scale, z: 4 });
}
const body = (s) => s.mate;

// ---------------------------------------------------------------- Ember Flick ----
// He squashes back and the TOP of his own flame tears off and flies at GOLEM (a cut-out of his real sprite, so it is
// his colours), spinning. It pops on him in a short burst: nothing stays burning. He is smaller for a moment, then regrows.
async function emberFlick(s) {
  const { fx, mate, spr } = s, A = await loadPyroFx();
  const hit = lerp2(s.P("claw"), s.golemC(), 0.6);
  mate.setMood("fierce");
  mate.sx.t = 1.14; mate.sy.t = 0.86; mate.fly = { x: -6, y: 0, rot: -0.07, sx: 1, sy: 1 };
  sound.sfx("flameIgnite");
  await wait(s, 320);
  // the tear: cut the top 40% of his flame
  const b = baseOf(s), bd = bounds(mate), top = bd.top, band = Math.max(12, Math.round((bd.bot - bd.top) * 0.42));
  const piece = snap(mate, top, band), start = { x: b.x + 4, y: b.y - (AH - top - band * 0.5) * PK };
  mate.sx.t = 0.92; mate.sy.t = 1.1; mate.fly = { x: 6, y: 0, rot: 0.05, sx: 1, sy: 1 };
  mate.snuff(0.8, false); mate.flare = 0.8;
  fx.sparks(start, 8, { colors: FIRE, power: 0.8 });
  sound.sfx("whoosh", { theme: "fire" });
  const trail = [];
  await spr.add({ dur: 460, z: 2, draw(g, k, t) {
    const e = ease.in(k), x = lerp(start.x, hit.x, e), y = lerp(start.y, hit.y, e) - Math.sin(e * Math.PI) * 60, rot = t * 0.02 * e;
    trail.push({ x, y, rot }); if (trail.length > 6) trail.shift();
    trail.forEach((p, i) => putSnap(g, piece, p.x, p.y + band * PK * 0.5, { rot: p.rot, scale: PK * (0.6 + i * 0.07), alpha: 0.08 * (i + 1) }));
    putSnap(g, piece, x, y + band * PK * 0.5, { rot, scale: PK * 1.05 });
  } });
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null;
  fx.hitstop(80); fx.shake(5); sound.sfx("hit", { size: 1 });
  fx.sparks(hit, 12, { colors: FIRE, power: 1 });
  play(spr, A.boom4, { from: 0, to: 3, ms: 190, x: hit.x, y: hit.y, scale: 1.9 });
  s.onHit(2); s.heat(0.1);
  // he regrows what he threw
  mate.flash = 1; sound.sfx("flameIgnite");
  await spr.add({ dur: 520, draw(g, k) { mate.snuff(0.8 + 0.2 * (1 - (1 - k) ** 3), false); } });
  mate.snuff(1, false); mate.setMood("idle");
  await wait(s, 200);
}

// ---------------------------------------------------------------- Flame Lash ----
// A whip of fire made of the pack's flame sprites laid along a curve: he swings it back over himself, then cracks it
// forward at GOLEM, his body stretching after it. The crack is a star burst at the tip.
async function flameLash(s) {
  const { fx, mate, spr } = s, A = await loadPyroFx();
  const me = s.mateC(), hand = { x: me.x + 34, y: me.y - 16 }, hit = lerp2(s.P("claw"), s.golemC(), 0.55);
  const R = 96; let arch = 70;
  let phase = "wind", tip = { x: hand.x - 70, y: hand.y - 40 }, extend = 1, fade = 1, wob = 0;
  mate.setMood("fierce"); mate.sx.t = 0.94; mate.sy.t = 1.06; mate.fly = { x: -10, y: 0, rot: -0.08, sx: 1, sy: 1 };
  sound.sfx("flameIgnite");
  const whip = spr.add({ dur: 1500, z: 3, draw(g, k, t) {
    // the whip: a thick arched curve of flame sprites from his hand to the tip, a ripple running down it
    const N = 24, dx = tip.x - hand.x, dy = tip.y - hand.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const C = { x: (hand.x + tip.x) / 2 + nx * -arch * (L / 200), y: (hand.y + tip.y) / 2 + ny * -arch * (L / 200) };
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * extend, v = 1 - u;
      const x0 = v * v * hand.x + 2 * v * u * C.x + u * u * tip.x, y0 = v * v * hand.y + 2 * v * u * C.y + u * u * tip.y;
      const tx = 2 * v * (C.x - hand.x) + 2 * u * (tip.x - C.x), ty = 2 * v * (C.y - hand.y) + 2 * u * (tip.y - C.y), tl = Math.hypot(tx, ty) || 1;
      const ripple = Math.sin(u * Math.PI * 2.4 - t * 0.03 * (phase === "snap" ? 2 : 1)) * 7 * (1 - u * 0.6) + Math.sin(u * Math.PI) * wob;
      const x = x0 - (ty / tl) * ripple, y = y0 + (tx / tl) * ripple, ang = Math.atan2(ty, tx) - Math.PI / 2;
      frame(g, A.flame, 6 + ((i + Math.floor(t / 60)) % 4), x, y + 30, { scale: (1.95 - u * 1.0), rot: ang, alpha: fade * (0.6 + 0.4 * (1 - u)) });
    }
  } });
  // 1. wind-up: the whip swings back and over his head
  await spr.add({ dur: 420, draw(g, k) { const a = lerp(Math.PI * 1.15, Math.PI * 1.9, ease.io(k)); tip = { x: hand.x + Math.cos(a) * R, y: hand.y + Math.sin(a) * R * 0.9 }; mate.fly.rot = -0.08 - 0.06 * k; } });
  sound.sfx("whoosh", { theme: "fire" });
  // 2. the crack: it snaps forward at GOLEM and he lunges after it
  phase = "snap"; mate.sx.t = 1.14; mate.sy.t = 0.92;
  await spr.add({ dur: 170, draw(g, k) {
    const e = ease.out(k); arch = lerp(70, 110, Math.sin(k * Math.PI)); tip = lerp2({ x: hand.x + Math.cos(Math.PI * 1.9) * R, y: hand.y + Math.sin(Math.PI * 1.9) * R * 0.9 }, hit, e);
    mate.fly.x = -10 + 26 * e; mate.fly.rot = 0.06 * e;
  } });
  tip = hit;
  fx.hitstop(120); fx.shake(9); fx.punch(0.03, hit); sound.sfx("hit", { size: 1.2 }); sound.sfx("impact", { size: 0.9 });
  play(spr, A.boom4, { from: 0, to: 3, ms: 220, x: hit.x, y: hit.y, scale: 2.6 });
  fx.sparks(hit, 16, { colors: FIRE, power: 1.2 });
  s.onHit(2); s.heat(0.15);
  wob = 14;
  await spr.add({ dur: 260, draw(g, k) { fade = 1 - k; wob = 14 * (1 - k); extend = 1 - 0.3 * k; } });
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null; mate.setMood("idle");
  await wait(s, 240);
}

// ---------------------------------------------------------------- Eruption ----
// Isaac's design: a rumble, the ground cracks under GOLEM, and a huge eruption comes up through him.
async function eruption(s) {
  const { fx, mate, spr, sprBack } = s, A = await loadPyroFx();
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  mate.setMood("fierce"); mate.sx.t = 1.16; mate.sy.t = 0.8; mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; mate.flare = 1;
  // 1. the rumble: it builds. The whole stage shakes harder, embers hop on the floor, he is crouched and trembling.
  sound.sfx("rumble"); sound.sfx("laserCharge", { ms: 1200 });
  fx.darken(0.45, 700);
  const t0 = performance.now();
  await spr.add({ dur: 1300, draw(g, k) {
    mate.fly.x = Math.sin(k * 90) * 2 * k; fx.shake(2 + 9 * k);
    if (Math.random() < 0.35) fx.sparks({ x: rand(b.x - 40, core.x + 60), y: floor - 2 }, 2, { colors: FIRE, power: 0.5 });
  } });
  // 2. the ground cracks under GOLEM: glowing cracks race out along the floor from a point under him
  mate.fly.x = 0; mate.sx.t = 1; mate.sy.t = 1.1;
  sound.sfx("shatter"); fx.hitstop(70); fx.shake(10);
  const C = { x: core.x + 8, y: floor + 26 }, branches = [];
  for (let i = 0; i < 11; i++) {   // a star of cracks under him, flattened by perspective, each one zig-zagging outward
    const th = (i / 11) * Math.PI * 2 + rand(-0.15, 0.15), pts = [{ x: C.x, y: C.y }]; let x = C.x, y = C.y;
    for (let j = 0; j < 8; j++) { const len = rand(16, 34) * (1 + j * 0.06), a2 = th + rand(-0.5, 0.5); x += Math.cos(a2) * len; y += Math.sin(a2) * len * 0.36; pts.push({ x, y: Math.max(floor - 2, Math.min(floor + 70, y)) }); }
    branches.push(pts);
  }
  const crack = sprBack.add({ dur: 1500, z: 1, draw(g, k) {
    const grow = Math.min(1, k * 7), glow = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    for (const pts of branches) for (const [w, col] of [[7, `rgba(40,20,14,${glow})`], [4, `rgba(255,122,47,${glow})`], [2, `rgba(255,232,150,${glow})`]]) {
      g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.beginPath();
      const n = Math.max(1, Math.floor(grow * (pts.length - 1)));
      g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i <= n; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke();
    }
    if (k < 0.55) { frame(g, A.fire, 0, C.x, C.y, { scale: 3 + 4 * k, alpha: 0.8 * (1 - k * 1.5) }); frame(g, A.fire, 1, C.x, C.y, { scale: 2 + 3 * k, alpha: 0.6 * (1 - k * 1.6) }); }
  } });
  fx.sparks(C, 14, { colors: FIRE, power: 1 });
  await wait(s, 560);
  // 3. the eruption: a column of fire up through him, bigger than he is, with rock thrown up and GOLEM thrown with it
  fx.hitstop(160); fx.shake(20); fx.punch(0.06, core); fx.flash(0.4, "#ffe8b8"); fx.darken(0, 500);
  sound.sfx("explosion", {}); sound.sfx("impact", { size: 1.6 }); sound.sfx("rumble");
  s.golem.to({ bob: 0.38, tilt: -0.22, flare: 1.3 }, 260, "out");
  s.onHit(1);
  play(sprBack, A.fire, { from: 3, to: 12, ms: 1100, x: core.x, y: floor + 16, anchor: "b", scale: 6.2, z: 2 });
  play(spr, A.fire, { from: 4, to: 11, ms: 1000, x: core.x - 70, y: floor + 12, anchor: "b", scale: 3.6, z: 3 });
  play(spr, A.fire, { from: 4, to: 11, ms: 1000, x: core.x + 80, y: floor + 12, anchor: "b", scale: 4, z: 3 });
  play(spr, A.boom2, { from: 0, to: 7, ms: 720, x: core.x, y: floor + 10, anchor: "b", scale: 5.6, z: 4 });
  fx.debris({ x: core.x, y: floor - 30 }, 16, { power: 1.6 });
  fx.sparks({ x: core.x, y: floor - 40 }, 28, { colors: FIRE, power: 1.8 });
  await wait(s, 420);
  play(spr, A.boom5, { from: 0, to: 8, ms: 700, x: core.x, y: core.y - 20, scale: 4 });
  fx.hitstop(90); fx.shake(12);
  s.onHit(2); s.heat(0.3);
  s.golem.rest(900);
  mate.sx.t = 1; mate.sy.t = 1; mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 900);
}

// ---------------------------------------------------------------- Comet Kick ----
// He coils, then really LEAPS: his own body stretches and tilts into a flying kick, the fire aura round him,
// afterimages of himself trailing. He slams into GOLEM, flips off him and lands back where he started.
async function cometKick(s) {
  const { fx, mate, spr } = s, A = await loadPyroFx(), shell = tinted(A.aura, WHITE, 0.25);
  const core = s.golemC(), b = baseOf(s), floor = fx.floorY;
  const mid = (p) => ({ x: p.x - b.x, y: p.y - (b.y - 55) });          // a stage point as an offset of his body's middle
  const T = mid({ x: core.x - 54, y: core.y + 6 });
  mate.setMood("fierce"); mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };
  // 1. the coil: squash down, the aura swelling round him
  sound.sfx("flameIgnite"); wrapAura(s, A, 700, 1.9);
  mate.sx.t = 1.25; mate.sy.t = 0.7;
  await wait(s, 380);
  fx.sparks(b, 10, { colors: FIRE, power: 0.9 });
  // 2. the leap: an arc up and over, his body stretched along the flight and tilted like a flying kick
  sound.sfx("whoosh", { theme: "fire" }); mate.sx.t = 0.8; mate.sy.t = 1.28;
  const ghosts = [], F = mate.fly;
  let prev = { x: 0, y: 0 };
  await spr.add({ dur: 540, z: 3, draw(g, k, t) {
    const e = ease.in(k * 0.85 + 0.15 * k), x = T.x * e, y = T.y * e - Math.sin(k * Math.PI) * 150;
    const ang = Math.atan2(y - prev.y, x - prev.x); prev = { x, y };
    F.x = x; F.y = y; F.rot = ang - Math.PI / 2 * 0.95 + (k < 0.12 ? 0 : 0); F.sx = 0.85; F.sy = 1.3;
    ghosts.push({ x: b.x + x, y: b.y - 55 + y + 55 * 1.0, rot: F.rot }); if (ghosts.length > 9) ghosts.shift();
    ghosts.forEach((p, i) => i < ghosts.length - 1 && putSnap(g, mate.cv, p.x, p.y, { rot: p.rot, sx: 0.85, sy: 1.3, alpha: 0.06 * (i + 1) }));
    frame(g, shell, 3, b.x + x, b.y - 55 + y, { scale: 1.1, alpha: 0.75, rot: F.rot });
  } });
  // 3. the kick lands: hit-stop on his body inside the impact, a column of fire and a ring along the floor
  fx.hitstop(170); fx.shake(15); fx.punch(0.06, core); fx.flash(0.3, "#fff6dc");
  sound.sfx("impact", { size: 1.5 }); sound.sfx("explosion", {});
  play(spr, A.boom4, { from: 0, to: 3, ms: 150, x: core.x - 30, y: core.y, scale: 2.4 });
  play(spr, A.boom2, { from: 0, to: 7, ms: 640, x: core.x, y: floor + 6, anchor: "b", scale: 4.4 });
  play(s.sprBack, A.boom3, { from: 0, to: 7, ms: 640, x: core.x, y: floor - 6, anchor: "b", scale: 4.4 });
  fx.ring({ x: core.x, y: floor - 4 }, { color: "#ffe9b0", size: 260, flat: 0.18, ms: 520, width: 5 });
  fx.sparks(core, 22, { colors: FIRE, power: 1.5 });
  s.onHit(2); s.heat(0.2);
  await wait(s, 160);
  // 4. he flips off GOLEM and lands back at his own place
  sound.sfx("whoosh", { theme: "fire" }); mate.sx.t = 1; mate.sy.t = 1;
  const from = { x: F.x, y: F.y, rot: F.rot };
  await spr.add({ dur: 560, draw(g, k) {
    const e = ease.io(k); F.x = lerp(from.x, 0, e); F.y = lerp(from.y, 0, e) - Math.sin(k * Math.PI) * 120;
    F.rot = lerp(from.rot, -Math.PI * 2, e);   // a full backflip off him
    F.sx = lerp(0.85, 1, e); F.sy = lerp(1.3, 1, e);
  } });
  mate.fly = null; mate.sx.v = 1.2; mate.sy.v = 0.78; mate.flash = 1; sound.sfx("flameIgnite");
  fx.sparks(b, 12, { colors: FIRE, power: 1 });
  mate.setMood("idle");
  await wait(s, 300);
}

// ---------------------------------------------------------------- Meteor Rain ----
// He sends embers up out of his own body; they come back as meteors, from different angles and sizes, each landing in a
// different blast with a crater, and GOLEM staggering on every hit. The last, biggest one finishes him.
async function meteorRain(s) {
  const { fx, mate, spr, sprBack } = s, A = await loadPyroFx();
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  mate.setMood("fierce"); mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };
  // 1. he stretches up and the embers leave the top of his body, rising off the screen
  sound.sfx("laserCharge", { ms: 900 }); fx.darken(0.5, 500);
  mate.sx.t = 0.86; mate.sy.t = 1.22; mate.flare = 1;
  const embers = Array.from({ length: 7 }, (_, i) => ({ x: b.x + rand(-14, 24), y: b.y - 100, vx: rand(-1.2, 3.8), vy: rand(-12, -8), d: i * 70 }));
  await spr.add({ dur: 900, z: 3, draw(g, k, t) {
    for (const e of embers) { if (t < e.d) continue; const u = (t - e.d) / 1000; frame(g, A.flame, 3 + (Math.floor(t / 60) % 3), e.x + e.vx * u * 60, e.y + e.vy * u * 80, { scale: 0.7, alpha: 0.9 }); }
  } });
  mate.sx.t = 1; mate.sy.t = 1;
  // 2. target rings flicker onto the floor round GOLEM (the pack's flat fire ellipses), one by one
  const spots = [-160, 70, -70, 150, -20].map((dx, i) => ({ x: core.x + dx, y: floor + 6 + (i % 2) * 7, a: -0.55 + dx / 450 }));
  sound.sfx("lockOn");
  spots.forEach((p, i) => sprBack.add({ dur: 900 + i * 260, z: 1, draw(g, k, t) { if (t < i * 260) return; frame(g, A.fire, 1, p.x, p.y, { scale: 1.3, alpha: 0.5 + 0.4 * Math.sin(t * 0.03) }); } }));
  await wait(s, 520);
  // 3. the rain: five meteors from different angles and sizes at overlapping times, then the big one
  const BOOMS = ["boom1", "boom5", "boom6", "boom3", "boom1"], sizes = [1.5, 1.9, 1.6, 2.1, 1.7];
  const falls = spots.map((p, i) => new Promise((done) => {
    const from = { x: p.x + (i % 2 ? 1 : -1) * rand(170, 300), y: -90 }, dur = 430 + rand(0, 90);
    setTimeout(() => {
      sound.sfx("whoosh", { theme: "fire" });
      const tr = [];
      spr.add({ dur, z: 3, draw(g, k) {
        const x = lerp(from.x, p.x, k), y = lerp(from.y, p.y, k * k), ang = Math.atan2(p.y - from.y, p.x - from.x) - Math.PI / 2;
        tr.push({ x, y }); if (tr.length > 8) tr.shift();
        tr.forEach((q, j) => frame(g, A.flame, 6 + (j % 3), q.x, q.y + 20, { scale: sizes[i] * (0.4 + j * 0.07), alpha: 0.1 * (j + 1), rot: ang }));
        frame(g, A.flame, 1, x, y, { scale: sizes[i] * 0.7, rot: ang });
        frame(g, A.flame, 7, x, y + 18, { scale: sizes[i], rot: ang });
      } }).then(() => {
        fx.hitstop(50); fx.shake(8 + i); sound.sfx("impact", { size: 1 });
        play(spr, A[BOOMS[i]], { from: 0, ms: 600, x: p.x, y: p.y - 14, anchor: "c", scale: sizes[i] * 2.1 });
        fx.sparks({ x: p.x, y: p.y - 10 }, 10, { colors: FIRE, power: 1 }); fx.debris({ x: p.x, y: p.y - 14 }, 5, { power: 1 });
        sprBack.add({ dur: 1400, z: 0, draw(g, k) { g.fillStyle = `rgba(20,10,8,${0.55 * (1 - k)})`; g.beginPath(); g.ellipse(p.x, p.y + 1, 26 * sizes[i] / 1.5, 6, 0, 0, 7); g.fill(); } });
        s.chunk?.(0.1);
        done();
      });
    }, i * 270);
  }));
  await Promise.all(falls);
  await wait(s, 260);
  // 4. the big one: from straight above, the biggest blast, GOLEM thrown
  sound.sfx("rumble"); fx.darken(0.65, 200);
  const tr = [];
  await spr.add({ dur: 560, z: 4, draw(g, k) {
    const x = core.x, y = lerp(-140, core.y, k * k);
    tr.push({ x, y }); if (tr.length > 10) tr.shift();
    tr.forEach((q, j) => frame(g, A.flame, 6 + (j % 3), q.x, q.y + 40, { scale: 3 * (0.4 + j * 0.06), alpha: 0.1 * (j + 1) }));
    frame(g, A.flame, 1, x, y, { scale: 2.2 }); frame(g, A.flame, 7, x, y + 40, { scale: 3.4 });
  } });
  fx.hitstop(220); fx.shake(22); fx.punch(0.08, core); fx.flash(0.6, "#fff1d0"); fx.darken(0, 500);
  sound.sfx("impact", { size: 1.9 }); sound.sfx("explosion", {});
  s.golem.to({ bob: 0.3, tilt: -0.2, flare: 1.4 }, 220, "out");
  play(spr, A.boom2, { from: 0, to: 7, ms: 700, x: core.x, y: floor + 8, anchor: "b", scale: 6 });
  play(spr, A.boom5, { from: 0, to: 8, ms: 760, x: core.x, y: core.y, scale: 4.4 });
  play(spr, A.boom1, { from: 0, to: 6, ms: 620, x: core.x + 40, y: core.y + 30, scale: 3.4 });
  fx.debris(core, 18, { power: 1.8 }); fx.sparks(core, 36, { colors: FIRE, power: 1.9 });
  s.onHit(2); s.heat(0.4); s.golem.rest(900);
  mate.fly = null; mate.flare = 0.6; mate.setMood("idle");
  await wait(s, 800);
}

// ---------------------------------------------------------------- Ultimate idea B: Supernova ----
// He swells huge and white-hot, the screen whites out, and he collapses into a ring of fire that sweeps across the whole
// stage, melting a Firewall and engulfing GOLEM.
async function supernova(s) {
  const { fx, mate, spr, sprBack } = s, A = await loadPyroFx();
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  mate.setMood("fierce"); mate.fly = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }; mate.flare = 1;
  // 1. he swells: bigger and bigger, brighter, the stage darkening and shaking, aura after aura
  sound.sfx("laserCharge", { ms: 1500 }); fx.darken(0.65, 900);
  wrapAura(s, A, 700, 2.2); setTimeout(() => wrapAura(s, A, 700, 3), 500);
  await spr.add({ dur: 1500, z: 3, draw(g, k) {
    const e = ease.io(k); mate.fly.sx = 1 + 1.5 * e; mate.fly.sy = 1 + 1.7 * e; mate.flash = Math.max(mate.flash, 0.9 * e);
    fx.shake(2 + 8 * k);
    if (Math.random() < 0.5) fx.sparks({ x: b.x + rand(-40, 40), y: b.y - rand(40, 220) }, 2, { colors: ["#ffffff", "#fff4d6", "#ffd27a"], power: 0.8 });
  } });
  // 2. the whiteout
  fx.hitstop(160); fx.flash(1, "#ffffff"); sound.sfx("impact", { size: 1.8 }); sound.sfx("explosion", {});
  mate.fly.sx = 1; mate.fly.sy = 1; mate.sx.v = 1.6; mate.sy.v = 0.5; mate.flash = 1;
  await wait(s, 260);
  fx.darken(0, 400);
  // 3. the ring: a wall of fire sweeps out along the floor to GOLEM, tall flames riding its front
  let melted = false;
  sound.sfx("rumble"); sound.sfx("flameIgnite");
  const dist = core.x - b.x + 40;
  await spr.add({ dur: 1100, z: 3, draw(g, k) {
    const e = ease.in(k * 0.6 + 0.4 * k), x = b.x + dist * e, sc = 3.2 + 3.4 * k;
    frame(g, A.aura, Math.min(12, 3 + Math.floor(k * 8)), x, floor + 14, { scale: sc, anchor: "b", alpha: 0.95 });
    frame(g, A.aura, Math.min(12, 4 + Math.floor(k * 7)), x - 90, floor + 14, { scale: sc * 0.8, anchor: "b", alpha: 0.7 });
    for (let i = 0; i < 6; i++) frame(g, A.fire, 5 + ((i + Math.floor(k * 14)) % 5), x - i * 38, floor + 10, { scale: 2.6 - i * 0.2, anchor: "b", alpha: 1 - i * 0.12 });
    if (!melted && x > core.x - 60) {
      melted = true; if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
      fx.hitstop(120); fx.shake(14); s.onHit(1);
    }
  } });
  // 4. GOLEM engulfed: a column and a mushroom of fire, then the finish
  fx.hitstop(200); fx.shake(22); fx.punch(0.08, core); fx.flash(0.55, "#fff1d0");
  sound.sfx("impact", { size: 1.9 });
  play(spr, A.fire, { from: 4, to: 12, ms: 1100, x: core.x, y: floor + 14, anchor: "b", scale: 6.4, z: 3 });
  play(spr, A.boom2, { from: 0, to: 7, ms: 700, x: core.x, y: floor + 8, anchor: "b", scale: 5.6 });
  play(spr, A.boom5, { from: 0, to: 8, ms: 760, x: core.x, y: core.y, scale: 4.4 });
  s.golem.to({ bob: 0.3, tilt: -0.2, flare: 1.4 }, 240, "out");
  fx.debris(core, 16, { power: 1.6 }); fx.sparks(core, 36, { colors: FIRE, power: 1.9 });
  s.onHit(2); s.heat(0.4); s.golem.rest(900);
  mate.fly = null; mate.setMood("idle");
  await spr.add({ dur: 600, draw(g, k) { mate.snuff(0.7 + 0.3 * k, false); } });
  mate.snuff(1, false);
  await wait(s, 400);
}

// ---------------------------------------------------------------- Ultimate idea A: Phoenix ----
// He bursts into a firebird: his own body at its heart, wings of the pack's flame swirls (mirrored, flapping), a
// tail of fire. It climbs out of the top of the screen, then dives at GOLEM and smashes through him.
async function phoenix(s) {
  const { fx, mate, spr } = s, A = await loadPyroFx();
  const core = s.golemC(), floor = fx.floorY, b = baseOf(s);
  mate.setMood("fierce"); mate.flare = 1;
  sound.sfx("flameIgnite"); sound.sfx("laserCharge", { ms: 900 }); fx.darken(0.5, 500);
  wrapAura(s, A, 700, 2.2);
  // the bird: drawn on the sprite layer around his own canvas (he stays visible as its heart)
  const bird = { x: b.x, y: b.y, rot: 0, size: 1, flap: 0, open: 0 };
  const swirl = tinted(A.swirl, [255, 170, 60], 0.25);
  const trail = [];
  const drawBird = (g, t) => {
    const f = Math.sin(t * 0.016) * 0.5 + 0.5, spread = 0.5 + 0.9 * bird.open;
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {       // three flames per wing, fanned out, flapping
        const a = side * (spread + j * 0.28) + (f - 0.5) * 0.7 * side * -1;
        frame(g, swirl, 2 + ((j + Math.floor(t / 90)) % 5), bird.x + side * 30 * bird.size, bird.y - 70 * bird.size, { scale: 3.4 * bird.size * (1 - j * 0.12), anchor: "b", flip: side, rot: a * side * 1.0 + bird.rot * 0.2, alpha: 0.95 });
      }
    }
    for (let j = 0; j < 4; j++) frame(g, A.fire, 5 + ((j + Math.floor(t / 70)) % 5), bird.x + Math.sin(t * 0.01 + j) * 8, bird.y + 6 + j * 14 * bird.size, { scale: (2.4 - j * 0.35) * bird.size, anchor: "b", rot: Math.PI + bird.rot * 0.1, alpha: 0.85 });
  };
  // 1. burst: the wings open round him
  await spr.add({ dur: 700, z: 3, draw(g, k, t) { bird.open = ease.out(k); bird.size = 1 + 0.4 * ease.out(k); drawBird(g, t); mate.sy.t = 1 + 0.15 * k; } });
  // 2. he climbs, wings beating, up and out of the top of the screen
  sound.sfx("wings"); sound.sfx("whoosh", { theme: "fire" });
  await spr.add({ dur: 900, z: 3, draw(g, k, t) {
    const e = ease.in(k); mate.fly = { x: lerp(0, (core.x - b.x) * 0.3, e), y: -(b.y + 260) * e, rot: 0, sx: 1, sy: 1 };
    bird.x = b.x + mate.fly.x; bird.y = b.y + mate.fly.y; drawBird(g, t);
    trail.push({ x: bird.x, y: bird.y }); if (trail.length > 9) trail.shift();
  } });
  fx.darken(0.7, 300);
  await wait(s, 320);
  // 3. the dive: down onto GOLEM from above, wings swept back
  sound.sfx("whoosh", { theme: "fire" }); sound.sfx("laserBeam", {});
  const startX = b.x + (core.x - b.x) * 0.3 + 0, sy0 = b.y - (b.y + 260);
  await spr.add({ dur: 520, z: 4, draw(g, k, t) {
    const e = ease.in(k), x = lerp(startX, core.x, e), y = lerp(-100, core.y, e);
    mate.fly = { x: x - b.x, y: y - b.y + 55, rot: Math.atan2(core.y + 100, core.x - startX) - Math.PI / 2 + Math.PI, sx: 1, sy: 1.2 };
    bird.x = x; bird.y = y + 50; bird.rot = mate.fly.rot; bird.open = 0.15 * (1 - k); drawBird(g, t);
  } });
  // 4. the smash: through the Firewall and him
  if (s.boss.dome.childElementCount) { s.boss.breakDome(); sound.sfx("shatter"); }
  fx.hitstop(220); fx.shake(24); fx.punch(0.08, core); fx.flash(0.6, "#fff1d0"); fx.darken(0, 500);
  sound.sfx("impact", { size: 1.9 }); sound.sfx("explosion", {});
  s.onHit(1);
  play(spr, A.boom5, { from: 0, to: 8, ms: 760, x: core.x, y: core.y, scale: 4.6 });
  play(spr, A.boom2, { from: 0, to: 7, ms: 700, x: core.x, y: floor + 8, anchor: "b", scale: 5.6 });
  play(spr, A.fire, { from: 4, to: 12, ms: 1100, x: core.x, y: floor + 14, anchor: "b", scale: 6, z: 3 });
  s.golem.to({ bob: 0.3, tilt: -0.2, flare: 1.4 }, 240, "out");
  fx.debris(core, 16, { power: 1.6 }); fx.sparks(core, 36, { colors: FIRE, power: 1.9 });
  await wait(s, 300);
  s.onHit(2); s.heat(0.4); s.golem.rest(900);
  // he lands back in his place
  mate.fly = null; mate.sx.v = 1.2; mate.sy.v = 0.8; mate.flash = 1; mate.setMood("idle");
  await wait(s, 800);
}

// ids match the old cards where they replace one; supernova and phoenix are the two ideas for the ultimate
export const PYRO_V2 = {
  emberShot: { name: "Ember Flick", run: emberFlick, desc: "A piece of his own flame tears off and flies at the boss." },
  crescentWave: { name: "Flame Lash", run: flameLash, desc: "He cracks a whip of fire across the boss." },
  eruption: { run: eruption, desc: "A rumble, the ground cracks under the boss, and a huge eruption bursts up through him." },
  cometKick: { run: cometKick, desc: "He leaps in a blaze and kicks the boss, then flips back." },
  meteorRain: { run: meteorRain, desc: "Embers fly up from him and fall back as meteors, the last one huge." },
  supernova: { id: "supernova", name: "Supernova", tier: "ultimate2", counters: "firewall", run: supernova, desc: "He swells white-hot, then collapses into a ring of fire that sweeps across the stage and melts a Firewall." },
  phoenix: { id: "phoenix", name: "Phoenix", tier: "ultimate2", counters: "firewall", run: phoenix, desc: "He bursts into a firebird, climbs out of sight and dives through the boss and his Firewall." },
};
