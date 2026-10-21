// Teammate ability kits (PRD Addendum I). Each ability is a short cinematic
// scene in the same language as battle-moves.js: a readable wind-up, a very fast
// strike, a hit-stop freeze with screen shake and a camera punch on contact,
// then follow-through. Effects are drawn on the pixel FX layer (pixel/pixel-fx.js)
// so they come out as hi-bit pixel art.
//
// s = { fx, px, toon, mate, mateEl, golem, P(name), mateC(), golemC(), onHit(n) }
//   onHit(1) is the first contact; a crit's finishing blow is onHit(2).
// Costs, cooldowns and damage come with the ability cards (Addendum J).
import { ease, lerp, ribbon, glow, starFlash } from "./pixel/pixel-fx.js";
import { sound } from "./sound.js";
import { explode } from "./pixel/toon-fx.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- NOVA ----

// ---- drawing the void portal and the shadow hands ----

// The shadow hands are painted into the void channel of the toon layer
// (pixel/toon-fx.js), which turns them into living shadow: solid black with a
// crawling edge, a purple rim of light, faint veins, and wisps rising off them.
// The shapes follow Isaac's zombie-hand silhouettes: a gaunt forearm with a
// knob of wrist bone, a narrow palm, very long bony fingers with swollen
// knuckles, and claws hooking off the tips.
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// A gaunt forearm from base to wrist (a gentle, lumpy bend), with strands
// hanging off it and wisps of shadow peeling away and rising.
function voidArm(pen, base, wrist, bend, w, amt, t, seed) {
  const dx = wrist[0] - base[0], dy = wrist[1] - base[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, b = Math.sin(u * Math.PI) * bend * 0.35 + Math.sin(u * 9 + seed * 3) * w * 0.07;
    pts.push([base[0] + dx * u + nx * b, base[1] + dy * u + ny * b]);
  }
  pen.limb("void", pts, w, w * 0.6, amt);
  for (let k = 0; k < 4; k++) {   // ragged strands hanging off the forearm, swaying
    const p = pts[3 + k * 2], side = k % 2 ? 1 : -1, ww = w * (0.45 - k * 0.04);
    const sx = p[0] + nx * side * ww, sy = p[1] + ny * side * ww, L = 9 + hash(seed + k) * 12, sway = Math.sin(t * 0.006 + k * 2 + seed) * 3;
    pen.limb("void", [[sx, sy], [sx + nx * side * 4 + sway * 0.4, sy + L * 0.5], [sx + nx * side * 5 + sway, sy + L]], 3.4, 1, amt);
  }
  for (let k = 0; k < 6; k++) {   // wisps peeling off and rising
    const u = (t * 0.0008 + k * 0.17 + seed * 0.13) % 1, p = pts[2 + ((k * 2) % 10)];
    pen.puff("void", p[0] + Math.sin(t * 0.004 + k) * 6, p[1] - u * 46, 6 + u * 9, 0.44 * (1 - u) * amt);
  }
  return pts;
}

// A bony clawed hand at the wrist, pointing along dir. size = wrist to
// fingertip; curl 0 = splayed and reaching, 1 = clenched in a grip.
function voidHand(pen, wrist, dir, S, curl, t, seed, flip, amt) {
  const cx = Math.cos(dir), cy = Math.sin(dir), px = -cy * flip, py = cx * flip;
  const P = (a, l) => [wrist[0] + cx * a * S + px * l * S, wrist[1] + cy * a * S + py * l * S];
  const dot = (p, r) => pen.fill("void", amt, (g) => g.arc(p[0], p[1], r, 0, Math.PI * 2));
  // the palm: narrow at the wrist, a little wider across the knuckles
  pen.fill("void", amt, (g) => {
    [P(0, -0.12), P(0.05, -0.15), P(0.34, -0.2), P(0.39, -0.07), P(0.39, 0.07), P(0.34, 0.17), P(0.08, 0.16), P(0, 0.12)]
      .forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  });
  dot(P(0.03, -0.13), S * 0.07);   // a knob of wrist bone
  const claw = (tip, a, w) => {    // a claw hooking off a fingertip
    const a2 = a + flip * 0.55;
    pen.limb("void", [tip, [tip[0] + Math.cos(a) * S * 0.08, tip[1] + Math.sin(a) * S * 0.08], [tip[0] + Math.cos(a) * S * 0.08 + Math.cos(a2) * S * 0.1, tip[1] + Math.sin(a) * S * 0.08 + Math.sin(a2) * S * 0.1]], w, 1, amt);
  };
  const fingers = [[0.35, -0.16, -0.42, 0.5], [0.39, -0.055, -0.13, 0.62], [0.39, 0.055, 0.12, 0.57], [0.34, 0.15, 0.38, 0.44]];
  fingers.forEach(([fa, fl, spread, L], f) => {
    const r = hash(seed * 7 + f), twitch = (Math.sin(t * 0.045 + seed * 7 + f * 2) > 0.8 ? 0.5 : 0) * (1 - curl);
    let a = dir + (spread * (1 - curl * 0.5) + (r - 0.5) * 0.25) * flip, p = P(fa, fl);
    const pts = [p];
    [0.44, 0.31, 0.25].forEach((l, j) => {
      // each joint bends toward the palm; some fingers are bent back at the first joint
      const bend = j === 0 && r > 0.6 && curl < 0.5 ? -0.22 : 0.16 + curl * 0.95 + twitch * (j === 1 ? 1 : 0.4);
      a += bend * flip;
      p = [p[0] + Math.cos(a) * l * L * S, p[1] + Math.sin(a) * l * L * S];
      pts.push(p);
    });
    pen.limb("void", pts, S * 0.085, S * 0.05, amt);
    dot(pts[0], S * 0.058); dot(pts[1], S * 0.054); dot(pts[2], S * 0.046);   // swollen knuckles
    claw(p, a, S * 0.05);
  });
  // the thumb, low on the palm
  let a = dir + (1.05 - curl * 0.5) * flip, p = P(0.1, 0.16);
  const th = [p];
  for (const l of [0.27, 0.22]) { a -= (0.25 + curl * 0.6) * flip; p = [p[0] + Math.cos(a) * l * S, p[1] + Math.sin(a) * l * S]; th.push(p); }
  pen.limb("void", th, S * 0.1, S * 0.06, amt);
  dot(th[1], S * 0.06);
  claw(p, a, S * 0.055);
}

// The black ooze the arms rise out of, with splashes thrown up as they erupt.
function voidOoze(pen, cx, cy, R, k, t, amt) {
  const r = R * 0.8 * ease.out(Math.min(1, k * 3));
  pen.oval("void", cx, cy, r, r * 0.2, 1.05 * amt);
  for (let i = 0; i < 5; i++) pen.oval("void", cx + Math.sin(i * 2.1 + t * 0.002) * r * 0.6, cy + 2, r * 0.3, r * 0.08, 0.7 * amt);
  if (k < 0.4) for (let i = 0; i < 12; i++) {   // splashes as they break the surface
    const a = i * 0.52, u = k / 0.4, x = cx + Math.cos(a) * r * (0.4 + u * 0.6), y = cy - Math.sin(u * Math.PI) * (18 + (i % 4) * 8);
    pen.puff("void", x, y, 5 + (i % 3) * 1.5, 1.1 * (1 - u));
  }
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
    [null, [-0.6, 0.0, -0.5]], [null, [0.55, 0.05, -0.5]],
  ];
  const hands = targets.map(([part, L], i) => ({
    part, L, base: [cx + (i / (targets.length - 1) - 0.5) * R * 1.1 + rand(-8, 8), cy + rand(-0.04, 0.08) * R],   // spread out, so each arm reads on its own
    bend: rand(18, 40) * (Math.random() < 0.5 ? -1 : 1),
    delay: i * 55 + rand(0, 50), w: part ? rand(14, 16) : rand(12, 14), size: part ? 74 : rand(62, 66), seed: i, flip: Math.random() < 0.5 ? -1 : 1,
  }));
  const writhers = Array.from({ length: 4 }, (_, i) => ({ base: [cx + rand(-0.85, 0.85) * R, cy + rand(0, 0.1) * R], h: rand(50, 90), seed: 20 + i, flip: i % 2 ? 1 : -1, delay: rand(0, 200) }));
  let grip = 0, shatter = 0;
  const handsActor = s.toon.add({ dur: 3200, draw(pen, k, t) {
    const amt = 1 - shatter;
    voidOoze(pen, cx, cy, R, k * 3.2, t, amt);
    for (const w of writhers) {   // smaller arms clawing the air at the rim
      const rise = ease.out(clamp01((t - w.delay) / 300));
      if (rise <= 0) continue;
      const sway = Math.sin(t * 0.006 + w.seed) * 18;
      const wrist = [w.base[0] + sway, w.base[1] - w.h * rise];
      voidArm(pen, w.base, wrist, 10 * w.flip, 11, amt, t, w.seed);
      voidHand(pen, wrist, -Math.PI / 2 + sway * 0.01, 50, 0.2 + 0.3 * Math.sin(t * 0.01 + w.seed), t, w.seed, w.flip, amt);
    }
    for (const h of hands) {
      const reach = ease.out(clamp01((t - h.delay) / 260));
      if (reach <= 0) continue;
      const tgt = h.part ? s.Pt(h.L, h.part) : s.Pt(h.L);
      // rise straight up out of the void first, then lunge for the target
      const up = [h.base[0], h.base[1] - 70];
      const lunge = clamp01((reach - 0.35) / 0.65);
      let wrist = reach < 0.35 ? [h.base[0], lerp(h.base[1], up[1], reach / 0.35)] : [lerp(up[0], tgt.x, lunge), lerp(up[1], tgt.y, lunge)];
      if (shatter > 0) wrist = [wrist[0] + Math.sin(t * 0.3 + h.seed) * 3, wrist[1] + shatter * 40];
      const pts = voidArm(pen, h.base, wrist, h.bend * (1 - grip * 0.4), h.w, amt, t, h.seed);
      const last = pts[pts.length - 2], dir = Math.atan2(wrist[1] - last[1], wrist[0] - last[0]);
      voidHand(pen, wrist, dir, h.size, Math.max(grip, lunge > 0.95 ? 0.35 : 0), t, h.seed, h.flip, amt);
    }
  } });
  px.add({ dur: 3200, z: 2, draw(g) {
    if (shatter > 0) for (let i = 0; i < 26; i++) {   // the arms bursting into shards
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
// explosion, leaving the floor under him burning.
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
      for (let i = 1; i <= n; i++) trail.push({ x: lerp(last.x, head.x, i / n), y: lerp(last.y, head.y, i / n), t, j: rand(-1, 1) });
    }
    for (const [i, p] of trail.entries()) {
      const age = (t - p.t) / 650; if (age > 1) continue;
      const x = p.x - age * 14, y = p.y + p.j * age * 22 - age * 26;
      pen.puff("heat", x, y, (20 + 26 * age) * (0.85 + 0.15 * Math.sin(i * 1.3)), 1.2 - age * 1.15);
      if (i % 4 === 0 && age < 0.7) {   // deep red licks sweeping off the wave, up and back
        const L = 30 + 30 * age, dir = p.j > 0 ? 1 : -1;
        pen.limb("heat", [[x, y], [x - L * 0.4, y - dir * L * 0.35], [x - L * 0.9, y - dir * L * 0.6 - 10]], 10, 1, 0.32 * (1 - age));
      }
      if (age > 0.3) pen.puff("smoke", x - 6, y - 14 - age * 20, 14 + 22 * age, (age - 0.3) * 2.4 * (1 - age), clamp01((age - 0.5) * 2));
    }
    if (flying) { pen.puff("heat", head.x, head.y, 34, 1.3); pen.flame(head.x + 10, head.y + 6, 16, 36, 1, 0.5, 0.3); }
  } });
  await toon.add({ dur: 200, draw(pen, k) { const e = ease.in(k); head.x = lerp(orb.x, core.x - 10, e); head.y = lerp(orb.y, core.y, e) - Math.sin(e * Math.PI) * 16; } });
  flying = false;
  // 4. impact: freeze, the big shake and punch, a huge cel explosion
  sound.sfx("explosion", { size: 1.4 });
  fx.hitstop(170); fx.shake(26); fx.punch(0.07, core); fx.flash(0.45, "#ffb040");
  s.onHit(1);
  explode(toon, core.x - 10, core.y, { size: 1.7, dur: 1700 });
  fx.debris(core, 12, { power: 1.5, dir: 1 }); fx.sparks(core, 18, { power: 1.6, dir: 1 });
  const floor = fx.floorY;
  const burn = toon.add({ dur: 1900, draw(pen, k, t) {   // the floor under him left burning
    const fade = 1 - ease.in(k), rise = ease.out(Math.min(1, k * 4));
    for (let i = 0; i < 9; i++) {
      const x = core.x + (i - 4) * 24 + Math.sin(i * 3.1) * 6, h = (34 + 34 * Math.abs(Math.sin(t * 0.006 + i * 1.9))) * rise * fade;
      pen.flame(x, floor + 4, 13, h, 0.95 * fade + 0.1, Math.sin(i * 1.7) * 0.25, Math.sin(t * 0.004 + i) * 0.35);
    }
    pen.oval("heat", core.x, floor + 6, 130 * rise, 12, 0.5 * fade);
  } });
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
  await Promise.all([ring, sun, wave, burn]);
}

export const PYRO_KIT = [
  { id: "sunfire", name: "Sunfire Halo", tier: "heavy", run: sunfireHalo,
    desc: "A ring of fire blazes up round him. He gathers a sun and fires it: a wave of fire that bursts on the boss and leaves the floor burning." },
];

// Run one of a teammate's abilities. Until the ability cards arrive
// (Addendum J) the first one in the kit is used.
export function kitFor(skin) { return skin === "nova" ? NOVA_KIT : skin === "pyro" ? PYRO_KIT : null; }
