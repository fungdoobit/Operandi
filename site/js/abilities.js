// Teammate ability kits (PRD Addendum I). Each ability is a short cinematic
// scene in the same language as battle-moves.js: a readable wind-up, a very fast
// strike, a hit-stop freeze with screen shake and a camera punch on contact,
// then follow-through. Effects are drawn on the pixel FX layer (pixel/pixel-fx.js)
// so they come out as hi-bit pixel art.
//
// s = { fx, px, mate, mateEl, golem, P(name), mateC(), golemC(), onHit(n) }
//   onHit(1) is the first contact; a crit's finishing blow is onHit(2).
// Costs, cooldowns and damage come with the ability cards (Addendum J).
import { ease, lerp, ribbon, glow, starFlash } from "./pixel/pixel-fx.js";
import { sound } from "./sound.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- NOVA ----

// ---- drawing the void portal and the shadow hands ----

// A gaunt shadow arm from base to wrist through a bent elbow, with a purple rim
// along its top edge and a bony ridge.
function drawArm(g, base, wrist, bend, w, alpha = 1) {
  const mid = [(base[0] + wrist[0]) / 2, (base[1] + wrist[1]) / 2];
  const dx = wrist[0] - base[0], dy = wrist[1] - base[1], len = Math.hypot(dx, dy) || 1;
  const elbow = [mid[0] - (dy / len) * bend, mid[1] + (dx / len) * bend];
  const pts = [];
  for (let i = 0; i <= 12; i++) {   // a curve that passes through the elbow
    const u = i / 12, a = 2 * elbow[0] - mid[0], b = 2 * elbow[1] - mid[1];
    pts.push([(1 - u) ** 2 * base[0] + 2 * (1 - u) * u * a + u * u * wrist[0], (1 - u) ** 2 * base[1] + 2 * (1 - u) * u * b + u * u * wrist[1]]);
  }
  g.globalAlpha = alpha;
  ribbon(g, pts.map(([x, y]) => [x - 1, y - 1.5]), w + 1.5, w * 0.55 + 1.5, "#6a3cc0");   // thin rim light
  ribbon(g, pts, w, w * 0.55, "#0d0717");
  ribbon(g, pts.slice(2, 10).map(([x, y]) => [x + 1, y - 1]), 1.6, 1.2, "#2c1748");  // bone ridge
  g.globalAlpha = 1;
  return pts;
}

// A long-fingered clawed hand at the wrist, pointing along dir. curl 0 = splayed,
// 1 = clenched; fingers twitch now and then while they reach.
function drawHand(g, wrist, dir, size, curl, t, seed, flip = 1, alpha = 1) {
  g.globalAlpha = alpha;
  const cx = Math.cos(dir), cy = Math.sin(dir), px = -cy * flip, py = cx * flip;
  const pc = [wrist[0] + cx * size * 0.2, wrist[1] + cy * size * 0.2];
  g.save(); g.translate(pc[0], pc[1]); g.rotate(dir);
  g.fillStyle = "#6a3cc0"; g.beginPath(); g.ellipse(-1, -1, size * 0.27, size * 0.18, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#0d0717"; g.beginPath(); g.ellipse(0, 0, size * 0.25, size * 0.16, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  const twitch = (k) => (Math.sin(t * 0.045 + seed * 7 + k * 2) > 0.8 ? 0.4 : 0) * (1 - curl);
  for (let f = 0; f < 5; f++) {
    const thumb = f === 4, spread = thumb ? 1.25 : (f - 1.5) * 0.28 * (1 - curl * 0.35);
    let a = dir + spread * flip;
    let p = thumb ? [pc[0] + px * size * 0.26, pc[1] + py * size * 0.26]
      : [pc[0] + cx * size * 0.2 + px * (f - 1.5) * size * 0.1, pc[1] + cy * size * 0.2 + py * (f - 1.5) * size * 0.1];
    const lens = (thumb ? [0.36, 0.28] : [0.56, 0.42, 0.32]).map((v) => v * size * (f === 0 || f === 3 ? 0.86 : 1));
    for (let j = 0; j < lens.length; j++) {
      a += (curl * 0.85 + twitch(f + j)) * -flip * (thumb ? -0.6 : 1);
      const q = [p[0] + Math.cos(a) * lens[j], p[1] + Math.sin(a) * lens[j]];
      ribbon(g, [p, q], size * (0.09 - j * 0.015), size * (0.07 - j * 0.015), "#0d0717");
      g.fillStyle = "#3d2266"; g.fillRect(p[0] - 1, p[1] - 1, 2.5, 2.5);   // knuckle
      p = q;
    }
    // the claw: a hooked pale nail
    const tip = [p[0] + Math.cos(a - 0.5 * flip) * size * 0.24, p[1] + Math.sin(a - 0.5 * flip) * size * 0.24];
    ribbon(g, [p, tip], size * 0.06, 0, "#e8dcff");
  }
  g.globalAlpha = 1;
}

// The portal on the floor, drawn in two halves: the far half behind GOLEM and
// the near half in front of him, so he can sink into it. o = 0..1 how open,
// spin = its swirl, t = time; back = which half.
function drawPortal(g, cx, cy, R, o, t, back, cracks) {
  if (o <= 0) return;
  const ry = 0.24;
  g.save();
  g.beginPath(); back ? g.rect(cx - R * 3, cy - R * 3, R * 6, R * 3) : g.rect(cx - R * 3, cy, R * 6, R * 3); g.clip();
  if (back) {
    // light pillars and rising glyphs behind everything
    for (let i = 0; i < 5; i++) {
      const x = cx + (i - 2) * R * 0.38, h = R * (1.2 + 0.4 * Math.sin(t * 0.004 + i));
      const gr = g.createLinearGradient(x, cy, x, cy - h);
      gr.addColorStop(0, "rgba(160,102,240,0.55)"); gr.addColorStop(1, "rgba(120,56,208,0)");
      g.globalAlpha = o; g.fillStyle = gr; g.fillRect(x - R * 0.08, cy - h, R * 0.16, h);
    }
    for (let i = 0; i < 10; i++) {
      const u = ((t * 0.0006 + i * 0.1) % 1), x = cx + Math.sin(i * 2.3) * R * 0.8, y = cy - u * R * 1.6;
      g.globalAlpha = o * (1 - u); g.fillStyle = "#cba2ff"; g.fillRect(x - 2, y - 3, 4, i % 2 ? 6 : 3);
    }
    g.globalAlpha = 1;
  }
  // cracks spreading over the floor, glowing purple
  if (!back) for (const c of cracks) {
    const n = Math.floor(c.pts.length * Math.min(1, o * 1.4));
    g.strokeStyle = "#a066f0"; g.lineWidth = 3; g.beginPath();
    c.pts.slice(0, n).forEach(([x, y], k) => (k ? g.lineTo(cx + x, cy + y) : g.moveTo(cx + x, cy + y))); g.stroke();
    g.strokeStyle = "#05020a"; g.lineWidth = 1.5; g.stroke();
  }
  g.translate(cx, cy); g.scale(1, ry);
  const r = R * o;
  // outer rune ring with glyph boxes turning between two rings
  g.lineWidth = 5; g.strokeStyle = "#a066f0"; g.beginPath(); g.arc(0, 0, r * 1.18, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2.5; g.strokeStyle = "#cba2ff"; g.beginPath(); g.arc(0, 0, r * 1.02, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + t * 0.0009;
    g.save(); g.rotate(a); g.fillStyle = i % 4 ? "#cba2ff" : "#f3e6ff"; g.fillRect(r * 1.06, -5, 9, i % 3 ? 10 : 4); g.restore();
  }
  // the void: black, with spiral arms of purple light winding into it
  g.fillStyle = "#04010a"; g.beginPath(); g.arc(0, 0, r * 0.95, 0, Math.PI * 2); g.fill();
  for (let arm = 0; arm < 4; arm++) {
    g.beginPath();
    for (let k = 0; k <= 30; k++) { const u = k / 30, a = arm * Math.PI / 2 + u * 4.2 - t * 0.004, rr = r * 0.92 * (1 - u * 0.92); k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.lineWidth = 10; g.strokeStyle = arm % 2 ? "#5a24a8" : "#8a4dff"; g.stroke();
    g.lineWidth = 3; g.strokeStyle = "#e8d4ff"; g.stroke();
  }
  g.restore();
  // purple fire licking up round the rim
  g.save();
  g.beginPath(); back ? g.rect(cx - R * 3, cy - R * 3, R * 6, R * 3) : g.rect(cx - R * 3, cy, R * 6, R * 3); g.clip();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, x = cx + Math.cos(a) * r * 0.97, y = cy + Math.sin(a) * r * 0.97 * ry;
    const h = (10 + 22 * Math.abs(Math.sin(t * 0.011 + i * 1.7)) * (0.6 + 0.4 * Math.sin(i * 3.1))) * o, sway = Math.sin(t * 0.009 + i) * 7;
    ribbon(g, [[x, y], [x + sway * 0.3, y - h * 0.35], [x + sway, y - h * 0.7], [x + sway * 1.6, y - h]], 8 + (i % 3) * 3, 0, i % 3 ? "#7838d0" : "#a066f0");
    ribbon(g, [[x, y], [x + sway * 0.3, y - h * 0.3], [x + sway * 0.8, y - h * 0.5]], 3, 0, "#e8d4ff");
  }
  g.restore();
}

// Grasp of the Void: she tears a portal open in the floor under GOLEM. Gaunt
// shadow arms claw out of it; some seize his claw and cannon arms, the rest his
// hull, and they drag him down into the void. Just before he's pulled under, his
// core blazes and he rips free, shattering the hands; the portal snaps shut.
async function graspOfTheVoid(s) {
  const { fx, px, pxBack, mate, golem, foeEl } = s;
  const core0 = s.golemC(), floor = fx.floorY, R = Math.min(170, fx.w * 0.13);
  const cx = core0.x - 15, cy = floor + 4;
  let open = 0, sink = 0, closing = 0;
  const cracks = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rand(-0.2, 0.2), pts = [[Math.cos(a) * R * 1.1, Math.sin(a) * R * 0.27]];
    for (let k = 0; k < 7; k++) { const [x, y] = pts[pts.length - 1]; pts.push([x + Math.cos(a) * rand(10, 22) + rand(-6, 6), y + Math.sin(a) * rand(2, 5) + rand(-2, 2)]); }
    return { pts };
  });
  mate.setMood("angry");
  // 1. wind-up: the scene dims and dark power streams into her
  sound.sfx("voidCharge");
  fx.darken(0.55, 600);
  fx.focus(1.06, { x: (s.mateC().x + core0.x) / 2, y: floor - 80 }, 700);
  mate.anim(500, (e) => { mate.nova.lift = 0.1 * e; }, "out");
  px.add({ dur: 700, draw(g, k) {
    const c = s.mateC();
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39 + k * 4, r = (1 - ease.in(k)) * 130 + 8;
      g.fillStyle = i % 3 ? "#a066f0" : "#f3e6ff"; g.fillRect(c.x + Math.cos(a) * r - 2, c.y + Math.sin(a) * r * 0.8 - 2, 4, 4);
    }
    glow(g, c.x, c.y, 40 * k, "#7838d0", 0.6 * k);
  } });
  await fx.wait(560);
  // 2. the portal: a crack of light, then it rips wide open on the floor
  sound.sfx("voidTear"); fx.shake(9); fx.hitstop(60);
  const life = 4800;
  const draw = (back) => (g, k, t) => drawPortal(g, cx, cy, R, open * (1 - closing), t, back, cracks);
  const portalBack = pxBack.add({ dur: life, draw: draw(true) });
  const portalFront = px.add({ dur: life, z: 1, draw: draw(false) });
  await px.add({ dur: 380, draw(g, k) { open = ease.back(k); } });
  fx.shake(6);
  await fx.wait(180);
  // 3. the hands erupt: some go for his arms, the rest for his hull; a few just claw at the air
  sound.sfx("handsBurst"); fx.shake(14); fx.punch(0.02, core0); fx.debris({ x: cx, y: cy }, 10, { power: 1.2 });
  const targets = [
    ["claw", [0, -0.3, -0.2]], ["claw", [0.1, -0.6, -0.1]], ["cannon", [0, -0.4, -0.2]], ["cannon", [0, -0.75, -0.2]],
    [null, [-0.55, 0.0, -0.5]], [null, [0.5, 0.05, -0.5]], [null, [0, -0.6, -0.35]],
  ];
  const hands = targets.map(([part, L], i) => ({
    part, L, base: [cx + rand(-0.5, 0.5) * R, cy + rand(-0.04, 0.08) * R], bend: rand(18, 40) * (Math.random() < 0.5 ? -1 : 1),
    delay: i * 55 + rand(0, 50), w: part ? rand(13, 16) : rand(11, 13), size: part ? 62 : rand(50, 56), seed: i, flip: Math.random() < 0.5 ? -1 : 1,
  }));
  const writhers = Array.from({ length: 4 }, (_, i) => ({ base: [cx + rand(-0.85, 0.85) * R, cy + rand(0, 0.1) * R], h: rand(50, 90), seed: 20 + i, flip: i % 2 ? 1 : -1, delay: rand(0, 200) }));
  let grip = 0, shatter = 0;
  const handsActor = px.add({ dur: 3200, z: 2, draw(g, k, t) {
    for (const w of writhers) {   // small arms clawing the air at the rim
      const rise = ease.out(clamp01((t - w.delay) / 300)) * (1 - shatter);
      if (rise <= 0) continue;
      const sway = Math.sin(t * 0.006 + w.seed) * 18;
      const wrist = [w.base[0] + sway, w.base[1] - w.h * rise];
      drawArm(g, w.base, wrist, 14 * w.flip, 9, 1 - shatter);
      drawHand(g, wrist, -Math.PI / 2 + sway * 0.01, 38, 0.25 + 0.25 * Math.sin(t * 0.01 + w.seed), t, w.seed, w.flip, 1 - shatter);
    }
    for (const h of hands) {
      const reach = ease.out(clamp01((t - h.delay) / 260));
      if (reach <= 0) continue;
      const tgt = h.part ? s.Pt(h.L, h.part) : s.Pt(h.L);
      // rise straight up out of the void first, then lunge for the target
      const up = [h.base[0], h.base[1] - 70];
      const lunge = clamp01((reach - 0.35) / 0.65);
      let wrist = reach < 0.35 ? [h.base[0], lerp(h.base[1], up[1], reach / 0.35)] : [lerp(up[0], tgt.x, lunge), lerp(up[1], tgt.y, lunge)];
      if (shatter > 0) wrist = [wrist[0] + rand(-3, 3), wrist[1] + shatter * 40];
      const pts = drawArm(g, h.base, wrist, h.bend * (1 - grip * 0.4), h.w, 1 - shatter);
      const last = pts[pts.length - 2], dir = Math.atan2(wrist[1] - last[1], wrist[0] - last[0]);
      drawHand(g, wrist, dir, h.size, Math.max(grip, lunge > 0.95 ? 0.35 : 0), t, h.seed, h.flip, 1 - shatter);
    }
    if (shatter > 0) for (let i = 0; i < 26; i++) {   // the arms bursting into shards and smoke
      const a = i * 2.4, r = shatter * (60 + (i % 5) * 30);
      g.globalAlpha = 1 - shatter; g.fillStyle = i % 3 ? "#0d0717" : "#a066f0";
      g.fillRect(core0.x + Math.cos(a) * r, core0.y + 40 + Math.sin(a) * r * 0.6 - shatter * 30, 6, 4);
      g.globalAlpha = 1;
    }
  } });
  await fx.wait(620);
  // 4. they seize him: freeze, shake, punch
  grip = 1;
  sound.sfx("voidCrush");
  fx.hitstop(160); fx.shake(22); fx.punch(0.05, core0); fx.flash(0.25, "#8a4dff");
  s.onHit(1);
  golem.to({ lean: 0.1, bob: -0.05, flare: -0.2 }, 160, "out");
  golem.fxv.glitch = 0.6;
  // 5. the pull: he's dragged down into the portal, fighting it; the floor cuts him off as he sinks
  const top = foeEl.offsetTop, height = foeEl.offsetHeight, home = foeEl._pos || { x: 0, y: 0, r: 0 };
  const clip = () => { const y = (foeEl._pos?.y || 0); foeEl.style.clipPath = `inset(0 0 ${Math.max(0, top + height + y - floor).toFixed(1)}px 0)`; };
  const clipper = px.add({ dur: 2600, draw() { clip(); } });
  sound.sfx("telekinesis");
  for (let i = 0; i < 3; i++) {
    const depth = (i + 1) * height * 0.13;
    golem.to({ thrust: 1.6 + i * 0.4, flare: 0.4 + i * 0.3, tilt: 0.12 * (i % 2 ? -1 : 1) }, 200, "out");
    await fx.move(foeEl, { x: home.x + rand(-6, 6), y: home.y + depth }, 300, "in");
    fx.shake(10 + i * 4); fx.hitstop(50); sound.sfx("impact", { size: 0.6 });
    if (i === 1) s.onHit(2);
    await fx.wait(160);
  }
  // 6. just before he goes under: his core blazes, he roars and rips free
  fx.darken(0.2, 200);
  golem.to({ flare: 2.4, thrust: 2.6, tilt: -0.35, lean: -0.1 }, 260, "out");
  sound.sfx("laserCharge", { ms: 400 });
  await fx.wait(380);
  sound.sfx("roar");
  fx.flash(0.5, "#ffd9a3"); fx.hitstop(120); fx.shake(28); fx.punch(0.06, core0);
  fx.ring({ x: cx, y: cy - 10 }, { color: "#ffb040", size: R * 2.2, flat: 0.3, ms: 500, width: 8 });
  fx.sparks(core0, 18, { power: 1.6 }); fx.debris({ x: cx, y: cy }, 14, { power: 1.6 });
  px.add({ dur: 420, draw(g, k) { shatter = ease.out(k); } });
  mate.setMood("sad", { revertAfter: 1200 });
  await fx.move(foeEl, { x: home.x, y: home.y }, 300, "out");
  golem.fxv.glitch = 0;
  // 7. the portal snaps shut: down to a slash of light, then a star-flash
  sound.sfx("portalClose");
  await px.add({ dur: 380, draw(g, k) { closing = ease.in(k); } });
  px.add({ dur: 340, z: 5, draw(g, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; starFlash(g, cx, cy - 6, 70 * f); glow(g, cx, cy - 6, 60 * f, "#cba2ff", 0.6); } });
  fx.shake(8);
  foeEl.style.clipPath = "";
  fx.darken(0, 500); fx.focus(1, null, 500);
  mate.anim(400, (e) => { mate.nova.lift = 0.1 * (1 - e); }, "io");
  golem.rest(500);
  await fx.wait(400);
  mate.setMood("idle");
  void portalBack; void portalFront; void handsActor; void clipper;
}

export const NOVA_KIT = [
  { id: "grasp", name: "Grasp of the Void", tier: "heavy", run: graspOfTheVoid,
    desc: "Tears a portal open under the boss. Shadow hands seize it and drag it into the void before it tears free." },
];

// ---------------------------------------------------------------- PYRO ----

// A cel-shaded fire explosion: billowing puffs from a white-hot core out to deep
// red, then black smoke rolling up (Isaac's fire references).
function drawBlast(g, x, y, k, size, seeds) {
  const grow = ease.out(clamp01(k / 0.35)), fade = 1 - clamp01((k - 0.35) / 0.65);
  for (const sd of seeds) {   // smoke first, rising and swelling behind the fire
    const sk = clamp01((k - 0.15) / 0.85), r = size * (0.25 + 0.35 * sk) * sd.r;
    g.globalAlpha = 0.9 * (1 - sk); g.fillStyle = sd.dark ? "#1c1820" : "#2e2830";
    g.beginPath(); g.arc(x + sd.x * size * (0.6 + sk), y + sd.y * size * (0.6 + sk) - sk * size * 0.5, r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const layers = [["#a8201a", 1], ["#ff5a1f", 0.82], ["#ffb040", 0.62], ["#ffe9a6", 0.42], ["#ffffff", 0.22]];
  for (const [col, sc] of layers) {
    g.fillStyle = col;
    for (const sd of seeds) {
      const r = size * 0.42 * sd.r * sc * grow * (0.35 + 0.65 * fade);
      if (r > 0.5) { g.beginPath(); g.arc(x + sd.x * size * 0.5 * grow, y + sd.y * size * 0.45 * grow, r, 0, Math.PI * 2); g.fill(); }
    }
  }
}

// Comet Kick: he leaps, a spiralling fireball gathers in front of him, and he
// kicks it into GOLEM, where it bursts into a fire explosion with rolling smoke.
async function cometKick(s) {
  const { fx, px, mate: dot, mateEl } = s;
  const core = s.golemC(), home = mateEl._pos || { x: 0, y: 0, r: 0 };
  dot.clearTimers?.(); dot.setMood("fierce");
  // 1. leap: crouch, spring up, hang at the top
  dot.sx.t = 1.28; dot.sy.t = 0.74; dot.lean.t = -0.12; dot.energy = 1.3;
  sound.sfx("flameIgnite");
  await fx.wait(220);
  dot.sx.s = 0.8; dot.sy.s = 1.25; dot.sx.t = 1; dot.sy.t = 1;
  fx.move(mateEl, { x: home.x + 30, y: home.y - 110 }, 300, "out");   // a real leap, high above the floor
  fx.dust(s.mateC().x, 6, 1);
  fx.focus(1.08, { x: s.mateC().x + 60, y: s.mateC().y - 60 }, 450);
  await fx.wait(260);
  fx.slowmo(0.35, 520);
  // 2. the fireball gathers: embers spiral in, a ball of fire swells in front of him
  let ball = 0, ballAt = null, flying = false;
  const fireball = px.add({ dur: 1700, z: 3, draw(g, k, t) {
    if (ball <= 0) return;
    const c = s.mateC(), at = ballAt || { x: c.x + 62, y: c.y - 6 }, r = 44 * ball;
    if (!flying) for (let i = 0; i < 14; i++) {   // embers spiralling in
      const a = i * 0.9 + t * 0.012, d = r + 30 * (1 - ball) + (i % 4) * 6;
      g.fillStyle = i % 2 ? "#ffd28a" : "#ff7a2f"; g.fillRect(at.x + Math.cos(a) * d - 2, at.y + Math.sin(a) * d - 2, 4, 4);
    }
    glow(g, at.x, at.y, r * 2.4, "#ff7a2f", 0.55);
    for (const [col, sc] of [["#c8321b", 1], ["#ff7a2f", 0.78], ["#ffd28a", 0.52], ["#ffffff", 0.26]]) {
      g.fillStyle = col; g.beginPath(); g.arc(at.x, at.y, r * sc, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 4; i++) {   // flame licks swirling round it
      const a = t * 0.02 + i * (Math.PI / 2);
      ribbon(g, [[at.x + Math.cos(a) * r * 0.8, at.y + Math.sin(a) * r * 0.8], [at.x + Math.cos(a + 0.6) * r * 1.25, at.y + Math.sin(a + 0.6) * r * 1.25], [at.x + Math.cos(a + 1.1) * r * 1.4, at.y + Math.sin(a + 1.1) * r * 1.4]], r * 0.35, 0, i % 2 ? "#ff7a2f" : "#ffb040");
    }
  } });
  await px.add({ dur: 420, draw(g, k) { ball = ease.out(k); } });
  // 3. the kick: a snap, a shock ring, and the comet flies
  const from = { x: s.mateC().x + 62, y: s.mateC().y - 6 };
  ballAt = { ...from }; flying = true;
  dot.sx.s = 1.35; dot.sy.s = 0.75; dot.lean.t = 0.3;
  fx.hitstop(70); fx.shake(10); fx.punch(0.03, from);
  fx.ring(from, { color: "#fff3c4", size: 90, flat: 1, ms: 260, width: 5 });
  sound.sfx("whoosh", { theme: "fire" });
  fx.focus(1.02, { x: (from.x + core.x) / 2, y: core.y }, 300);
  const trail = [];
  px.add({ dur: 900, z: 2, draw(g, k, t) {   // the comet's tail: flame streaks and smoke puffs
    if (flying) trail.push({ x: ballAt.x, y: ballAt.y, t });
    for (const p of trail) {
      const age = (t - p.t) / 420; if (age > 1) continue;
      g.globalAlpha = 0.8 * (1 - age);
      g.fillStyle = age < 0.25 ? "#ffd28a" : age < 0.5 ? "#ff7a2f" : "#3a3238";
      g.beginPath(); g.arc(p.x - age * 10, p.y - age * 14, (1 - age * 0.5) * 18 * ball, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  } });
  await px.add({ dur: 260, draw(g, k) { const e = ease.in(k); ballAt.x = lerp(from.x, core.x, e); ballAt.y = lerp(from.y, core.y, e) - Math.sin(e * Math.PI) * 30; } });
  // 4. impact: freeze, huge shake, punch, the explosion
  flying = false; ball = 0;
  sound.sfx("explosion", { size: 1.4 });
  fx.hitstop(170); fx.shake(26); fx.punch(0.07, core); fx.flash(0.4, "#ffb040");
  s.onHit(1);
  const seeds = Array.from({ length: 11 }, (_, i) => ({ x: Math.cos(i * 2.2) * (0.4 + (i % 3) * 0.25), y: Math.sin(i * 2.2) * (0.35 + (i % 2) * 0.2) - 0.1, r: 0.7 + (i % 4) * 0.15, dark: i % 2 }));
  px.add({ dur: 1100, z: 4, draw(g, k) { drawBlast(g, core.x - 10, core.y, k, 150, seeds); } });
  fx.debris(core, 12, { power: 1.5, dir: 1 }); fx.sparks(core, 18, { power: 1.6, dir: 1 });
  await fx.wait(240);
  // a second blast as it detonates fully
  fx.hitstop(90); fx.shake(16); fx.punch(0.03, core);
  s.onHit(2);
  px.add({ dur: 800, z: 4, draw(g, k) { drawBlast(g, core.x + 30, core.y - 30, k, 90, seeds.slice(0, 7)); } });
  // 5. he drops back down home
  fx.move(mateEl, { x: home.x, y: home.y }, 420, "in").then(() => { fx.dust(s.mateC().x, 5, 0.8); dot.sx.s = 1.25; dot.sy.s = 0.8; });
  await fx.wait(450);
  fx.focus(1, null, 500);
  dot.lean.t = 0; dot.setMood("idle");
  await fireball;
}

export const PYRO_KIT = [
  { id: "cometKick", name: "Comet Kick", tier: "medium", run: cometKick,
    desc: "Leaps and kicks a spiralling fireball into the boss. It bursts into a fire explosion." },
];

// Run one of a teammate's abilities. Until the ability cards arrive
// (Addendum J) the first one in the kit is used.
export function kitFor(skin) { return skin === "nova" ? NOVA_KIT : skin === "pyro" ? PYRO_KIT : null; }
