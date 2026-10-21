// NOVA's ability kit (PRD Addendum I): dark void magic. See abilities.js for
// how a scene is called and the s object it gets.
import { ease, lerp, ribbon, glow, starFlash } from "./pixel/pixel-fx.js";
import { explode } from "./pixel/toon-fx.js";
import { sound } from "./sound.js";
import { impactFrame, speedLines, bigHit, drawVoidPortal } from "./cine.js";
import { PODS } from "./pixel/golem-boss.js";
import { propSprites, stamp } from "./pixel/props-px.js";
import { planetSprites, spinFrame } from "./pixel/planets-px.js";

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
    const u = i / 12, b = Math.sin(u * Math.PI) * bend * 0.5 + Math.sin(u * Math.PI * 2) * bend * 0.22 + Math.sin(u * 9 + seed * 3) * w * 0.08;
    pts.push([base[0] + dx * u + nx * b, base[1] + dy * u + ny * b]);
  }
  pen.limb("void", pts, w, w * 0.6, amt);
  const el = pts[7];   // a bony elbow knob
  pen.fill("void", amt, (g) => g.arc(el[0] + nx * w * 0.2, el[1] + ny * w * 0.2, w * 0.5, 0, Math.PI * 2));
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
    let a = dir + (spread * (1 - curl * 0.15) + (r - 0.5) * 0.25) * flip, p = P(fa, fl);
    const pts = [p];
    [0.44, 0.31, 0.25].forEach((l, j) => {
      // each joint bends toward the palm; some fingers are bent back at the first joint
      const bend = j === 0 && r > 0.6 && curl < 0.3 ? -0.22 : 0.16 + curl * (j === 0 ? 0.25 : 0.75) + twitch * (j === 1 ? 1 : 0.4);
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
  sound.sfx("voidCharge"); sound.sfx("ghostWind", { ms: 5000 });
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
  sound.sfx("handsBurst"); sound.sfx("whispers", { ms: 3200 }); sound.sfx("ghostWail");
  fx.shake(16); fx.punch(0.03, core0); fx.debris({ x: cx, y: cy }, 10, { power: 1.2 }); impactFrame(fx, { ms: 50 });
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
  let grip = 0, shatter = 0, pull = 0;
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
      // while they haul him down, each arm comes straight up out of the portal under
      // the part it holds, so it pulls down into the void instead of folding sideways
      let base = h.base, bend = h.bend * (1 - grip * 0.4);
      if (pull > 0) { base = [lerp(h.base[0], Math.max(cx - R * 0.9, Math.min(cx + R * 0.9, wrist[0])), pull), lerp(h.base[1], cy + 10, pull)]; bend *= 1 - pull; }
      const pts = voidArm(pen, base, wrist, bend, h.w, amt, t, h.seed);
      const last = pts[pts.length - 2], dir = Math.atan2(wrist[1] - last[1], wrist[0] - last[0]);
      voidHand(pen, wrist, dir, h.size, Math.max(grip * 0.8, lunge > 0.95 ? 0.3 : 0), t, h.seed, h.flip, amt);
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
  // 4. they seize him: freeze, negative frame, shake, punch, slow motion
  grip = 1;
  sound.sfx("voidCrush");
  bigHit(fx, core0, { stop: 180, shake: 26, punch: 0.06, flash: "#8a4dff" });
  speedLines(s.pxTop, core0, 420);
  fx.slowmo(0.4, 500);
  fx.letterbox(true); fx.focus(1.12, { x: cx, y: (core0.y + floor) / 2 }, 500);
  s.onHit(1);
  golem.to({ lean: 0.1, bob: -0.05, flare: -0.2 }, 160, "out");
  golem.fxv.glitch = 0.6;
  // 5. the pull: he's dragged down into the portal, fighting it; the floor cuts him off as he sinks
  const top = foeEl.offsetTop, height = foeEl.offsetHeight, home = foeEl._pos || { x: 0, y: 0, r: 0 };
  const clip = () => { const y = (foeEl._pos?.y || 0); foeEl.style.clipPath = `inset(0 0 ${Math.max(0, top + height + y - floor).toFixed(1)}px 0)`; };
  const clipper = px.add({ dur: 2600, draw() { clip(); } });
  sound.sfx("telekinesis");
  px.add({ dur: 240, draw(g, k) { pull = ease.out(k); } });
  for (let i = 0; i < 3; i++) {
    const depth = (i + 1) * height * 0.13;
    golem.to({ thrust: 1.6 + i * 0.4, flare: 0.4 + i * 0.3, tilt: 0.12 * (i % 2 ? -1 : 1) }, 200, "out");
    await fx.move(foeEl, { x: home.x + rand(-6, 6), y: home.y + depth }, 300, "in");
    fx.shake(14 + i * 5); fx.hitstop(70); fx.punch(0.03, core0); sound.sfx("impact", { size: 0.7 }); fx.dust(cx, 6, 1);
    if (i === 1) s.onHit(2);
    await fx.wait(160);
  }
  // 6. just before he goes under: his core blazes, he roars and rips free
  fx.darken(0.2, 200);
  golem.to({ flare: 2.4, thrust: 2.6, tilt: -0.35, lean: -0.1 }, 260, "out");
  sound.sfx("laserCharge", { ms: 400 });
  await fx.wait(380);
  sound.sfx("roar");
  bigHit(fx, core0, { stop: 150, shake: 32, punch: 0.07, flash: "#ffd9a3" });
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
  fx.letterbox(false); fx.darken(0, 500); fx.focus(1, null, 500);
  mate.anim(400, (e) => { mate.nova.lift = 0.1 * (1 - e); }, "io");
  golem.rest(500);
  await fx.wait(400);
  mate.setMood("idle");
  void portalBack; void portalFront; void handsActor; void clipper;
}

// ---- shared bits for NOVA's spells ----
const VIOLET = "#cba2ff", PALE = "#f3e6ff", DEEP = "#7838d0";

// The cast pose: angry eyes, she rises a little and her corona flares.
// Returns a function that settles her back.
function castPose(mate, { lift = 0.08, energy = 2.4, ms = 300 } = {}) {
  mate.setMood("angry");
  const m0 = mate.nova.m;
  mate.nova.m = { ...m0, energy };
  mate.anim(ms, (e) => { mate.nova.lift = lift * e; }, "out");
  return () => { mate.nova.m = m0; mate.anim(400, (e) => { mate.nova.lift = lift * (1 - e); }, "io"); };
}

// Specks of purple light streaming in to a point (at can be a function).
function gatherMotes(px, at, ms, { n = 18, r = 120 } = {}) {
  return px.add({ dur: ms, draw(g, k) {
    const p = typeof at === "function" ? at() : at;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39 + k * 5, d = (1 - ease.in(k)) * r * (0.6 + (i % 4) * 0.13) + 4, sz = i % 3 ? 3 : 4;
      g.fillStyle = i % 3 ? "#a066f0" : PALE; g.fillRect(p.x + Math.cos(a) * d - sz / 2, p.y + Math.sin(a) * d * 0.8 - sz / 2, sz, sz);
    }
  } });
}

// A bolt of shadow flying from one point to another, its tail dissolving
// behind it. Resolves when it arrives.
function voidShot(toon, from, to, ms, { r = 12, arc = 0 } = {}) {
  const trail = [];
  const pos = (u) => ({ x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * arc });
  toon.add({ dur: ms + 380, draw(pen, k, t) {
    const u = Math.min(1, t / ms);
    if (u < 1) {
      const last = trail[trail.length - 1], p = pos(ease.in(u) * 0.5 + u * 0.5);
      const n = last ? Math.max(1, Math.floor(Math.hypot(p.x - last.x, p.y - last.y) / 5)) : 1;
      for (let i = 1; i <= n; i++) trail.push({ x: last ? lerp(last.x, p.x, i / n) : p.x, y: last ? lerp(last.y, p.y, i / n) : p.y, t });
      pen.puff("void", p.x, p.y, r * 2, 1.3); pen.puff("void", p.x, p.y, r * 3.2, 0.34);
    }
    for (const q of trail) {
      const age = (t - q.t) / 220; if (age > 1) continue;
      pen.puff("void", q.x, q.y - age * 10, r * (1.5 - age * 0.9), 1.1 * (1 - age));
    }
  } });
  return toon.wait(ms);
}

// A small white star-flash with a purple glow (over everything).
function flashAt(pxTop, at, r, ms = 240) {
  return pxTop.add({ dur: ms, draw(g, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; glow(g, at.x, at.y, r * 1.1 * f, "#a066f0", 0.6); starFlash(g, at.x, at.y, r * f); } });
}

// Purple shards flung out from a point.
function shards(pxTop, at, n = 14, power = 1) {
  const bits = Array.from({ length: n }, (_, i) => ({ a: i * 2.4 + Math.random(), v: (80 + Math.random() * 140) * power, s: 2 + (i % 3) }));
  return pxTop.add({ dur: 520, draw(g, k) {
    const e = ease.out(k);
    for (const b of bits) {
      g.globalAlpha = 1 - k; g.fillStyle = b.s > 3 ? PALE : "#a066f0";
      g.fillRect(at.x + Math.cos(b.a) * b.v * e, at.y + Math.sin(b.a) * b.v * e * 0.8 + 60 * k * k, b.s, b.s);
    }
    g.globalAlpha = 1;
  } });
}

// ---- Shadow Bolt (basic) ----
// A flick of her cloak: a bolt of shadow that bursts on him.
async function shadowBolt(s) {
  const { fx, toon, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), from = { x: c.x + 36, y: c.y - 8 };
  const settle = castPose(mate, { lift: 0.05, energy: 2 });
  gatherMotes(pxTop, from, 280, { n: 12, r: 60 });
  toon.add({ dur: 300, draw(pen, k) { pen.puff("void", from.x, from.y, 16 * ease.out(k), 1.1); } });
  await fx.wait(280);
  sound.sfx("whoosh", { theme: "void" }); fx.shake(4);
  await voidShot(toon, from, { x: core.x - 8, y: core.y }, 230, { r: 11, arc: 18 });
  sound.sfx("impact", { size: 0.7 }); fx.hitstop(70); fx.shake(11); fx.punch(0.025, core);
  explode(toon, core.x - 8, core.y, { size: 0.7, kind: "void", dur: 900 });
  flashAt(pxTop, core, 46); shards(pxTop, core, 10, 0.7);
  s.onHit(1);
  await fx.wait(170);
  fx.shake(7); s.onHit(2);
  settle();
  await fx.wait(380);
  mate.setMood("idle");
}

// ---- portals for her spells (cine.js drawVoidPortal), opened and closed over time ----
// Returns a controller: P (the shape, change x/y/rx/ry/rot freely), open(),
// close(). The portal is drawn on `layer` (a PixelFX) until closed.
function portal(s, layer, P, { hum = true } = {}) {
  const st = { ...P, open: 0, tear: 0, seed: Math.random() * 9 };
  let done = false;
  const actor = layer.add({ dur: 60000, draw(g, k, t, a) { if (done) a.t = a.dur; drawVoidPortal(g, st, t); } });
  return {
    P: st,
    async open(ms = 520) {
      sound.sfx("voidTear"); if (hum) sound.sfx("voidHum", { ms: 2500 });
      await layer.add({ dur: ms * 0.35, draw(g, k) { st.tear = ease.out(k); } });
      s.fx.shake(10); s.fx.hitstop(50);
      await layer.add({ dur: ms * 0.65, draw(g, k) { st.open = ease.back(k); } });
    },
    async close(ms = 380, flash = true) {
      sound.sfx("portalClose");
      await layer.add({ dur: ms, draw(g, k) { st.open = 1 - ease.in(k); st.tear = 1 - ease.in(k) * 0.3; } });
      st.open = 0; st.tear = 0; done = true;
      if (flash) { flashAt(s.pxTop, { x: st.x, y: st.y }, 70, 300); s.fx.shake(8); }
      await actor;
    },
  };
}

// ---- Wraith Flock (light) ----
// She rips a portal open in the air; screaming wraiths pour out of it, swoop
// and rip through him one after another, then the portal snaps shut.
async function wraithFlock(s) {
  const { fx, toon, px, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), N = 9, dur = 900;
  const settle = castPose(mate, { lift: 0.08, energy: 2.8 });
  sound.sfx("ghostWind", { ms: 2800 });
  fx.darken(0.45, 400);
  const gate = portal(s, px, { x: lerp(c.x, core.x, 0.3), y: Math.min(core.y - 20, c.y - 70), rx: 70, ry: 30, rot: Math.PI / 2 });
  fx.focus(1.08, { x: gate.P.x + 60, y: gate.P.y }, 500);
  gatherMotes(pxTop, { x: gate.P.x, y: gate.P.y }, 420, { n: 20, r: 110 });
  await fx.wait(300);
  await gate.open(560);
  speedLines(pxTop, { x: gate.P.x, y: gate.P.y }, 360, { inner: 90 });
  sound.sfx("whispers", { ms: 2200 });
  fx.focus(1.03, { x: (gate.P.x + core.x) / 2, y: core.y - 20 }, 500);
  const bez = (P, u) => { const v = 1 - u; return { x: v * v * v * P[0].x + 3 * v * v * u * P[1].x + 3 * v * u * u * P[2].x + u * u * u * P[3].x, y: v * v * v * P[0].y + 3 * v * v * u * P[1].y + 3 * v * u * u * P[2].y + u * u * u * P[3].y }; };
  const order = [4, 1, 7, 3, 0, 6, 2, 8, 5];
  const g0 = { x: gate.P.x, y: gate.P.y };
  const wraiths = order.map((i, j) => {
    const lane = (i / (N - 1) - 0.5) * 2;
    const P = [{ x: g0.x + rand(-4, 4), y: g0.y + lane * 20 }, { x: g0.x + 90 + rand(-20, 20), y: g0.y + lane * 110 - 30 }, { x: core.x - 170 + rand(-40, 40), y: core.y + lane * 90 }, { x: core.x + 190, y: core.y + lane * 60 + rand(-20, 20) }];
    let best = 0, bd = 1e9;
    for (let k = 0; k <= 60; k++) { const p = bez(P, k / 60), d = Math.hypot(p.x - core.x, p.y - core.y); if (d < bd) { bd = d; best = k / 60; } }
    return { P, delay: j * 85, sz: rand(14, 19), seed: i * 1.7, hitU: best };
  });
  const at = (w, u) => { const p = bez(w.P, clamp01(u)), q = bez(w.P, clamp01(u + 0.01)), dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy) || 1, wob = Math.sin(u * 14 + w.seed) * 9; return { x: p.x - dy / n * wob, y: p.y + dx / n * wob, dx: dx / n, dy: dy / n }; };
  const uOf = (w, t) => (t - w.delay) / dur;
  const total = N * 85 + dur + 300;
  wraiths.forEach((w) => fx.wait(w.delay).then(() => sound.sfx("ghostFly")));
  toon.add({ dur: total, draw(pen, k, t) {
    for (const w of wraiths) {
      const u = uOf(w, t); if (u <= 0 || u > 1.25) continue;
      const fade = u > 1 ? 1 - (u - 1) / 0.25 : 1, born = Math.min(1, u * 6), sz = w.sz * (0.4 + 0.6 * born), pts = [];
      for (let j = 0; j <= 10; j++) pts.push(at(w, Math.max(0, u - j * 0.0095 * born)));
      const P = pts.map((p) => [p.x, p.y]);
      pen.limb("void", P, sz * 1.6, 2, 1.1 * fade);
      for (const side of [-1, 1]) pen.limb("void", P.slice(3).map(([x, y], j) => [x + Math.sin(t * 0.025 + j + side) * 5, y + side * (4 + j * 1.6)]), sz * 0.55, 0.6, 0.95 * fade);
      pen.puff("void", P[0][0], P[0][1], sz * 1.25, 1.25 * fade);
      for (let j = 2; j <= 10; j += 4) pen.puff("void", P[j][0], P[j][1] - 4, sz * 1.8, 0.3 * fade);
    }
  } });
  pxTop.add({ dur: total, draw(g, k, t) {   // glowing eyes and gaping mouths
    for (const w of wraiths) {
      const u = uOf(w, t); if (u <= 0.05 || u > 1.05) continue;
      const h = at(w, u), px2 = -h.dy, py = h.dx, e = w.sz * 0.42, f = h.dx > 0 ? 1 : -1;
      for (const side of [-1, 1]) {
        const x = h.x + h.dx * w.sz * 0.25 + px2 * side * e * f, y = h.y + h.dy * w.sz * 0.25 + py * side * e * f - 2;
        glow(g, x, y, 10, "#a066f0", 0.8); g.fillStyle = "#fff"; g.fillRect(x - 2, y - 2, 4, 4);
      }
      g.fillStyle = "#3a1466"; g.fillRect(h.x + h.dx * w.sz * 0.2 - 2.5, h.y + w.sz * 0.3, 5, 8);
    }
  } });
  wraiths.forEach((w, i) => fx.wait(w.delay + w.hitU * dur).then(() => {
    const last = i === N - 1;
    sound.sfx("hit", { size: 0.7 }); fx.hitstop(last ? 160 : 40); fx.shake(last ? 24 : 9);
    s.golem.fxv.glitch = 0.6; s.golem.to({ glitch: 0 }, 220, "lin", s.golem.fxv);
    s.golem.to({ lean: 0.06 * (i % 2 ? 1 : -1), tilt: 0.05 * (i % 2 ? -1 : 1) }, 90, "out");
    shards(pxTop, at(w, w.hitU), 8, 0.7);
    if (i === 0) s.onHit(1);
    if (last) { bigHit(fx, core, { stop: 160, shake: 26, punch: 0.05, flash: "#cba2ff" }); speedLines(pxTop, core, 300); s.onHit(2); }
  }));
  await fx.wait(total - 200);
  await gate.close();
  s.golem.rest(500);
  fx.darken(0, 500); fx.focus(1, null, 500);
  settle();
  mate.setMood("idle");
}

// ---- Void Orb (medium) ----
// She gathers an orb of void: a black core with a burning violet rim, rune
// rings spinning round it and lightning crawling over it. She hurls it; it
// tears open into a grinding vortex on him, then implodes.
function drawOrbFx(g, at, R, t, power = 1) {
  if (R <= 0.5) return;
  glow(g, at.x, at.y, R * 3.2, "#7838d0", 0.55 * power);
  g.fillStyle = "#05010c"; g.beginPath(); g.arc(at.x, at.y, R, 0, Math.PI * 2); g.fill();   // the core stays pitch black
  // a rim of light round the black core, brightest on top
  g.lineWidth = Math.max(1.5, R * 0.16); g.strokeStyle = "#a066f0"; g.beginPath(); g.arc(at.x, at.y, R * 1.05, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(1, R * 0.08); g.strokeStyle = "#f3e6ff"; g.beginPath(); g.arc(at.x, at.y, R * 1.02, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  // two rune rings, tilted, turning opposite ways
  for (const [tilt, spin, rr] of [[0.35, 1, 1.75], [-0.6, -1.4, 2.15]]) {
    g.save(); g.translate(at.x, at.y); g.rotate(tilt); g.scale(1, 0.32);
    g.strokeStyle = "#8a4dff"; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, R * rr, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + t * 0.003 * spin; g.fillStyle = i % 3 ? "#cba2ff" : "#ffffff"; g.fillRect(Math.cos(a) * R * rr - 2, Math.sin(a) * R * rr - 4, 4, i % 2 ? 8 : 4); }
    g.restore();
  }
  // lightning crawling over it
  if (((t / 50) | 0) % 2 === 0) for (let b = 0; b < 3; b++) {
    let a = Math.random() * Math.PI * 2, r = R * 0.9;
    g.strokeStyle = b ? "#cba2ff" : "#ffffff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    for (let k = 0; k < 5; k++) { a += rand(-0.5, 0.5); r += R * rand(0.15, 0.35); g.lineTo(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r); }
    g.stroke();
  }
  // motes orbiting it
  for (let i = 0; i < 10; i++) { const a = i * 0.63 + t * 0.006 * (1 + (i % 3) * 0.3), rr = R * (1.5 + (i % 4) * 0.25); g.fillStyle = i % 2 ? "#ffffff" : "#cba2ff"; g.fillRect(at.x + Math.cos(a) * rr - 1.5, at.y + Math.sin(a) * rr * 0.45 - 1.5, 3, 3); }
}
async function voidOrb(s) {
  const { fx, toon, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), o = { x: c.x + 50, y: c.y - 70 };
  const settle = castPose(mate, { lift: 0.12, energy: 3 });
  sound.sfx("voidCharge"); sound.sfx("ghostWind", { ms: 1400 });
  fx.darken(0.5, 400);
  fx.focus(1.12, o, 600);
  let R = 0, at = { ...o }, vortex = 0, collapse = 0;
  gatherMotes(pxTop, o, 760, { n: 30, r: 160 });
  const arms = (pen, p, r0, r1, turn, amt, w = 13) => {
    for (let a = 0; a < 4; a++) {
      const pts = [];
      for (let j = 0; j <= 14; j++) { const u = j / 14, ang = a * Math.PI / 2 + u * 3.2 + turn, r = lerp(r0, r1, u); pts.push([p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8]); }
      pen.limb("void", pts, w, w * 0.3, amt);
    }
  };
  const orbToon = toon.add({ dur: 3400, draw(pen, k, t) {
    if (R > 0) { pen.puff("void", at.x, at.y, R * 1.35, 1.35); pen.puff("void", at.x, at.y, R * 2.6, 0.32); }
    if (R > 0 && !vortex) arms(pen, at, R * 3, R * 0.8, -t * 0.012, 0.7, 9);
    if (vortex > 0) {
      const sc = vortex * (1 - collapse);
      arms(pen, at, 120 * sc, 12 * sc, -t * 0.03, 1.1);
      arms(pen, at, 70 * sc, 8 * sc, -t * 0.03 + 0.8, 0.55);
    }
  } });
  const orbTop = pxTop.add({ dur: 3400, draw(g, k, t) { drawOrbFx(g, at, R * (1 - collapse), t, vortex ? 1.4 : 1); } });
  sound.sfx("darkChoir", { ms: 800 });
  await toon.add({ dur: 760, draw(pen, k) { R = 27 * ease.out(k); } });
  // hurl it
  sound.sfx("whoosh", { theme: "void" }); sound.sfx("ghostFly");
  fx.hitstop(70); fx.shake(14); impactFrame(fx, { ms: 50 });
  mate.nova.idle.shake = 0.5; mate.anim(240, (e) => { mate.nova.idle.shake = 0.5 * (1 - e); }, "lin");
  fx.focus(1.04, { x: (o.x + core.x) / 2, y: core.y }, 260);
  const from = { ...o };
  speedLines(pxTop, () => at, 300, { inner: 60 });
  await toon.add({ dur: 280, draw(pen, k) {
    const e = ease.in(k); at.x = lerp(from.x, core.x - 8, e); at.y = lerp(from.y, core.y, e) - Math.sin(e * Math.PI) * 30;
    for (let i = 1; i <= 5; i++) pen.puff("void", lerp(from.x, at.x, 1 - i * 0.07), lerp(from.y, at.y, 1 - i * 0.07), R * (1.2 - i * 0.15), 0.9 - i * 0.12);
  } });
  // the vortex grinds into him
  sound.sfx("voidCrush"); sound.sfx("whispers", { ms: 1100 });
  bigHit(fx, core, { stop: 120, shake: 22, punch: 0.05, flash: "#8a4dff" });
  s.onHit(1);
  fx.focus(1.1, core, 300);
  await toon.add({ dur: 180, draw(pen, k) { vortex = ease.back(k); } });
  for (let i = 0; i < 5; i++) {
    fx.hitstop(45); fx.shake(10 + i * 2); sound.sfx("hit", { size: 0.6 });
    shards(pxTop, { x: core.x + rand(-40, 40), y: core.y + rand(-40, 40) }, 8, 0.7);
    s.golem.to({ tilt: i % 2 ? 0.1 : -0.1, lean: 0.06 }, 110, "out");
    s.golem.fxv.glitch = 0.5; s.golem.to({ glitch: 0 }, 160, "lin", s.golem.fxv);
    await fx.wait(180);
  }
  // it implodes, then blows
  fx.slowmo(0.35, 260);
  sound.sfx("laserCharge", { ms: 260 });
  await toon.add({ dur: 200, draw(pen, k) { collapse = ease.in(k); } });
  sound.sfx("explosion", { size: 1.3 });
  bigHit(fx, core, { stop: 170, shake: 30, punch: 0.07, flash: "#e8d4ff" });
  speedLines(pxTop, core, 400);
  explode(toon, core.x - 8, core.y, { size: 1.4, kind: "void", dur: 1100 });
  flashAt(pxTop, core, 110, 340); shards(pxTop, core, 26, 1.5);
  s.onHit(2);
  vortex = 0; R = 0;
  s.golem.rest(500);
  fx.darken(0, 500); fx.focus(1, null, 600);
  settle();
  await fx.wait(450);
  mate.setMood("idle");
  await Promise.all([orbToon, orbTop]);
}

// ---- Spectral Chains (medium) ----
// Two portals tear open, above him and below. Spear-tipped chains of violet
// metal whip out of both: the ones for his arms coil round them (round the back
// and over the front), the ones for his hull spear into it. Energy pulses up
// the chains as she hauls both ways, trying to tear him in half; light cracks
// across his hull. Then his pods burst open, drones fly out, lock on, and laser
// the chains apart one by one.
// Chains are made of real 3D links (props-px.js) on the sprite layers.
function chainPath(A, B, ext, t, { whip = 0, taut = 0, seed = 0, step = 13 } = {}) {
  const L0 = Math.hypot(B.x - A.x, B.y - A.y) || 1, ux = (B.x - A.x) / L0, uy = (B.y - A.y) / L0;
  const n = Math.max(2, Math.floor((L0 * ext) / step)), pts = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * ext;
    const off = whip * Math.sin(u * 10 - t * 0.035 + seed) * 22 * u * (1 - ext * 0.7)
      + (1 - taut) * Math.sin(u * Math.PI) * 10 * (1 - whip)
      + taut * Math.sin(t * 0.09 + i * 1.7) * 1.6;
    pts.push({ x: A.x + ux * L0 * u - uy * off, y: A.y + uy * L0 * u + ux * off });
  }
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; pts[i].ang = Math.atan2(b.y - a.y, b.x - a.x); }
  return pts;
}
function drawLinks(g, S, pts, from = 0) {
  for (let i = from; i < pts.length; i++) stamp(g, S.link[i % 2], pts[i].x, pts[i].y, pts[i].ang, 0.85, Math.PI);
}
// A coil of chain wound round an arm: the half behind the arm goes on the back
// layer, the half in front on the front layer. axis = the arm's direction.
function drawCoil(gFront, gBack, S, B, axis, k, t) {
  const loops = 1.7 * k, N = Math.max(2, Math.floor(16 * k)), ax = Math.cos(axis), ay = Math.sin(axis);
  for (let i = 0; i < N; i++) {
    const ph = (i / 16) * Math.PI * 2 * 1.5 + t * 0.002, s = (i / 16 - 0.5) * 30, r = 16;
    const x = B.x + ax * s - ay * Math.cos(ph) * r, y = B.y + ay * s + ax * Math.cos(ph) * r;
    const front = Math.sin(ph) > 0, ang = axis + Math.PI / 2 + (front ? 0.5 : -0.5);
    stamp(front ? gFront : gBack, S.link[i % 2], x, y, ang, 1, Math.PI);
  }
  void loops;
}
async function spectralChains(s) {
  const { fx, px, pxTop, spr, sprBack, toon, mate } = s;
  const S = propSprites();
  if (!S) return graspOfTheVoid(s);   // no WebGL for the props: fall back to the hands
  const core = s.golemC(), floor = fx.floorY, cx = core.x - 10;
  const settle = castPose(mate, { lift: 0.1, energy: 3 });
  sound.sfx("ghostWind", { ms: 6000 }); sound.sfx("voidCharge");
  fx.darken(0.55, 400); fx.letterbox(true);
  fx.focus(1.04, { x: cx, y: (core.y + floor) / 2 - 50 }, 600);
  // 1. two portals, above him and below
  const top = portal(s, px, { x: cx, y: Math.max(84, core.y - 112), rx: 130, ry: 24 });
  const bot = portal(s, px, { x: cx, y: floor + 2, rx: 140, ry: 26 }, { hum: false });
  gatherMotes(pxTop, () => s.mateC(), 420, { n: 22, r: 100 });
  await fx.wait(250);
  await Promise.all([top.open(560), fx.wait(120).then(() => bot.open(560))]);
  // 2. chains whip out: arms get coils, the hull gets speared
  const tg = [
    ["top", "claw", [0, -0.3, -0.2]], ["top", null, [-0.3, 0.3, -0.55]], ["top", null, [0.3, 0.3, -0.55]], ["top", "cannon", [0, -0.4, -0.2]],
    ["bot", "claw", [0.1, -0.75, -0.1]], ["bot", null, [-0.25, -0.3, -0.55]], ["bot", null, [0.25, -0.3, -0.55]], ["bot", "cannon", [0, -0.85, -0.2]],
  ];
  const chains = tg.map(([side, part, L], i) => ({ side, part, L, ext: 0, wrap: 0, cut: 0, gone: 0, delay: [0, 120, 200, 60, 90, 170, 240, 30][i], seed: i * 1.3 }));
  const target = (ch) => (ch.part ? s.Pt(ch.L, ch.part) : s.Pt(ch.L));
  const axisOf = (ch) => { if (!ch.part) return 0; const a = s.Pt([ch.L[0], ch.L[1] + 0.12, ch.L[2]], ch.part), b = s.Pt([ch.L[0], ch.L[1] - 0.12, ch.L[2]], ch.part); return Math.atan2(b.y - a.y, b.x - a.x); };
  const anchor = (ch) => { const P = ch.side === "top" ? top.P : bot.P, t = target(ch); return { x: Math.max(P.x - P.rx * 0.75, Math.min(P.x + P.rx * 0.75, t.x)), y: P.y }; };
  let taut = 0, pulses = 0;
  const drawAll = (gF, gB, t) => {
    for (const ch of chains) {
      if (ch.ext <= 0 || ch.gone >= 1) continue;
      const A = anchor(ch), B = target(ch);
      if (ch.cut > 0) {   // cut: the portal end whips back in, the far end falls away
        const back = ease.in(ch.cut);
        drawLinks(gF, S, chainPath(A, B, 0.5 * (1 - back), t, { whip: 1, seed: ch.seed }));
        if (ch.part && ch.cut < 0.6) drawCoil(gF, gB, S, B, axisOf(ch), 1 - ch.cut / 0.6, t);
        continue;
      }
      const pts = chainPath(A, B, ch.ext, t, { whip: ch.wrap ? 0 : 1 - ch.ext * 0.5, taut, seed: ch.seed });
      drawLinks(gF, S, pts);
      if (ch.ext < 1) { const h = pts[pts.length - 1]; stamp(gF, S.shard[0], h.x, h.y, h.ang, 1.2); }
      else if (ch.part) drawCoil(gF, gB, S, B, axisOf(ch), ch.wrap, t);
      else { stamp(gF, S.shard[0], B.x, B.y, Math.atan2(B.y - A.y, B.x - A.x), 1.2); }   // speared into the hull
    }
  };
  spr.add({ dur: 9000, draw(g, k, t, a) { if (chains.every((c) => c.gone >= 1)) { a.t = a.dur; return; } drawAll(g, { drawImage() {} }, t); } });
  sprBack.add({ dur: 9000, draw(g, k, t, a) { if (chains.every((c) => c.gone >= 1)) { a.t = a.dur; return; } drawAll({ drawImage() {} }, g, t); } });
  pxTop.add({ dur: 9000, draw(g, k, t, a) {   // energy pulses running up the chains, the cracks in his hull
    if (chains.every((c) => c.gone >= 1)) { a.t = a.dur; return; }
    if (pulses > 0) for (const ch of chains) {
      if (ch.cut > 0 || ch.ext < 1) continue;
      const A = anchor(ch), B = target(ch);
      for (let j = 0; j < 3; j++) { const u = ((t * 0.0016 + j / 3 + ch.seed) % 1); glow(g, lerp(B.x, A.x, u), lerp(B.y, A.y, u), 12, "#cba2ff", 0.9 * pulses); }
    }
  } });
  sound.sfx("whoosh", { theme: "void" }); sound.sfx("ghostFly");
  fx.focus(1.1, { x: cx, y: core.y }, 400);
  await Promise.all(chains.map((ch) => fx.wait(ch.delay).then(async () => {
    sound.sfx("chainRattle", { size: 0.7 });
    await spr.add({ dur: 230, draw(g, k) { ch.ext = ease.out(k); } });
    fx.hitstop(35); fx.shake(9); fx.punch(0.015, target(ch)); shards(pxTop, target(ch), 6, 0.5);
    sound.sfx(ch.part ? "chainRattle" : "hit", { size: 0.8 });
    await spr.add({ dur: 170, draw(g, k) { ch.wrap = ease.back(k); } });
  })));
  sound.sfx("voidCrush");
  bigHit(fx, core, { stop: 130, shake: 20, punch: 0.04, flash: "#8a4dff", invert: false });
  s.golem.fxv.glitch = 0.6; s.golem.to({ glitch: 0 }, 300, "lin", s.golem.fxv);
  s.onHit(1);
  // 3. she hauls both ways: he's stretched between the portals
  mate.nova.idle.shake = 0.6; pulses = 1;
  sound.sfx("whispers", { ms: 2200 }); sound.sfx("roar");
  await spr.add({ dur: 200, draw(g, k) { taut = ease.out(k); } });
  fx.focus(1.1, { x: core.x, y: core.y - 10 }, 900); fx.slowmo(0.5, 1200);
  for (let i = 0; i < 4; i++) {
    s.golem.to({ tilt: i % 2 ? 0.16 : -0.16, lean: i % 2 ? -0.1 : 0.1, bob: 0.04 * (i % 2 ? 1 : -1), ca: -0.85 - 0.25 * (i % 2 ? 1 : -1), na: -0.85 + 0.25 * (i % 2 ? 1 : -1) }, 110, "io");
    s.golem.fxv.glitch = 0.9; s.golem.to({ glitch: 0.25 }, 180, "lin", s.golem.fxv);
    fx.shake(12 + i * 5); fx.hitstop(50); sound.sfx("chainRattle", { size: 1 }); sound.sfx("impact", { size: 0.5 });
    await fx.wait(210);
  }
  bigHit(fx, core, { stop: 180, shake: 30, punch: 0.06, flash: "#e8d4ff" });
  speedLines(pxTop, core, 420);
  shards(pxTop, core, 22, 1.3);
  s.onHit(2);
  // 4. he fights back: smoke bursts from his pods, drones fly out
  sound.sfx("servo", { ms: 300 }); sound.sfx("laserCharge", { ms: 300 });
  s.golem.to({ flare: 1.8, thrust: 1.4 }, 200, "out");
  const pods = [0, 1, 2, 3].map((i) => fx.fromPage(s.golem.pagePoint(PODS[i % PODS.length])));
  fx.focus(1.08, { x: core.x, y: pods[0].y + 30 }, 260);
  await fx.wait(220);
  sound.sfx("droneBuzz", { ms: 3600 }); sound.sfx("missileLaunch");
  const drones = pods.map((p, i) => ({ i, x: p.x, y: p.y, vx: 0, on: true, aim: null, from: { ...p }, spot: { x: core.x + (i % 2 ? 1 : -1) * rand(95, 130), y: core.y + (i < 2 ? -70 : 40) + rand(-10, 10) } }));
  for (const p of pods) { for (let j = 0; j < 4; j++) toon.add({ dur: 700, draw(pen, k) { pen.puff("smoke", p.x + rand(-6, 6), p.y - k * 30 - j * 6, 10 + k * 14, 0.9 * (1 - k), k * 0.8); } }); fx.sparks(p, 5, { colors: ["#ff6a3a", "#ffd27a"], power: 0.8 }); }
  fx.shake(10);
  const droneActor = spr.add({ dur: 9000, draw(g, k, t, a) {
    if (drones.every((d) => !d.on)) { a.t = a.dur; return; }
    for (const d of drones) {
      if (!d.on) continue;
      const face = d.aim ? (d.aim.x < d.x ? 0 : 8) : d.vx < -0.5 ? 0 : d.vx > 0.5 ? 8 : 12;
      stamp(g, S.drone[((t / 40) | 0) % 2], d.x, d.y + Math.sin(t * 0.008 + d.i) * 2, face * Math.PI / 8 * -1, 1);
    }
  } });
  pxTop.add({ dur: 9000, draw(g, k, t, a) {   // their eyes, and the downdraft under them
    if (drones.every((d) => !d.on)) { a.t = a.dur; return; }
    for (const d of drones) if (d.on && ((t / 120) | 0) % 2) glow(g, d.x + (d.aim ? (d.aim.x < d.x ? -10 : 10) : 0), d.y + 1, 7, "#ff3a3a", 0.8);
  } });
  await Promise.all(drones.map((d, j) => fx.wait(j * 70).then(() => spr.add({ dur: 320, draw(g, k) {
    const e = ease.out(k), x = lerp(d.from.x, d.spot.x, e), y = lerp(d.from.y, d.spot.y, e) - Math.sin(e * Math.PI) * 50;
    d.vx = x - d.x; d.x = x; d.y = y;
  } }))));
  fx.focus(1.08, { x: core.x, y: core.y }, 300);
  // 5. the first cut in slow motion: lock on, charge, fire, the chain glows white-hot and snaps
  const cutOrder = [0, 4, 3, 7, 1, 5, 2, 6];
  const cut = async (n, slow) => {
    const ch = chains[cutOrder[n]], d = drones[n % drones.length], A = anchor(ch), B = target(ch), at = { x: lerp(A.x, B.x, 0.55), y: lerp(A.y, B.y, 0.55) };
    d.aim = at;
    const eye = () => ({ x: d.x + (at.x < d.x ? -10 : 10), y: d.y + 2 });
    if (slow) { fx.slowmo(0.3, 900); fx.focus(1.12, { x: (d.x + at.x) / 2, y: (d.y + at.y) / 2 }, 250); }
    sound.sfx("miniLaser", { size: 0.4 });
    await pxTop.add({ dur: slow ? 150 : 55, draw(g, k) {   // lock-on reticle snapping in, and the charge (fast: Isaac 2026-10-21)
      const r = 26 * (1 - ease.out(k)) + 9;
      g.strokeStyle = "#ff3a3a"; g.lineWidth = 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(at.x + sx * r, at.y + sy * (r - 6)); g.lineTo(at.x + sx * r, at.y + sy * r); g.lineTo(at.x + sx * (r - 6), at.y + sy * r); g.stroke(); }
      const e = eye(); glow(g, e.x, e.y, 6 + 10 * k, "#ff3a3a", 0.9);
    } });
    sound.sfx("miniLaser");
    const beam = pxTop.add({ dur: slow ? 200 : 90, draw(g, k, t) {
      const e = eye(), w = (slow ? 7 : 5) * (1 - k * 0.5) * (0.85 + 0.15 * Math.sin(t * 0.3));
      glow(g, e.x, e.y, 16, "#ff3a3a", 0.9); glow(g, at.x, at.y, 22, "#ff8a3a", 0.9);
      g.lineCap = "round";
      g.strokeStyle = "#7a0d0d"; g.lineWidth = w + 6; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(at.x, at.y); g.stroke();
      g.strokeStyle = "#ff3a3a"; g.lineWidth = w + 2; g.stroke();
      g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(1, w - 3); g.stroke();
    } });
    toon.add({ dur: 400, draw(pen, k) { pen.puff("heat", at.x, at.y, 9 + 6 * k, 1.2 * (1 - k)); } });   // the link glowing white-hot
    fx.sparks(at, slow ? 14 : 6, { colors: ["#ffffff", "#ffd27a", "#ff6a3a"], power: 1.1 });
    await beam;
    sound.sfx("chainSnap");
    if (slow) { impactFrame(fx, { ms: 60 }); fx.hitstop(120); fx.shake(18); }
    else { fx.hitstop(30); fx.shake(9); }
    flashAt(pxTop, at, slow ? 40 : 24, 220);
    const bits = Array.from({ length: slow ? 6 : 3 }, (_, j) => ({ x: at.x, y: at.y, vx: rand(-160, 160), vy: rand(-220, -60), a: rand(0, 6), va: rand(-12, 12), v: j % 2 }));
    spr.add({ dur: 800, draw(g, k) { for (const b of bits) stamp(g, S.link[b.v], b.x + b.vx * k, b.y + b.vy * k + 420 * k * k, b.a + b.va * k, 1, Math.PI); } });
    spr.add({ dur: 300, draw(g, k) { ch.cut = ease.out(k); } }).then(() => { ch.gone = 1; });
    d.aim = null;
    if (slow) fx.focus(1.06, { x: core.x, y: core.y }, 300);
  };
  await cut(0, true);
  mate.setMood("sad");
  taut = 0.6;
  for (let n = 1; n < 8; n++) { await cut(n, false); await fx.wait(40); }
  // 6. free: he roars, the drones zip home, the portals collapse
  taut = 0; pulses = 0; mate.nova.idle.shake = 0;
  sound.sfx("roar");
  fx.shake(22); fx.flash(0.3, "#ffd9a3"); fx.ring(core, { color: "#ffb040", size: 260, flat: 0.6, ms: 500, width: 8 });
  s.golem.to({ flare: 2.2, thrust: 2, tilt: -0.2, lean: -0.1, ca: -0.85, na: -0.85 }, 220, "out");
  await Promise.all(drones.map((d) => spr.add({ dur: 260, draw(g, k) { const e = ease.in(k), x = lerp(d.spot.x, d.from.x, e); d.vx = x - d.x; d.x = x; d.y = lerp(d.y, d.from.y, e); } }).then(() => { d.on = false; })));
  await Promise.all([top.close(), bot.close()]);
  s.golem.rest(500);
  fx.letterbox(false); fx.darken(0, 500); fx.focus(1, null, 500);
  settle();
  await fx.wait(300);
  mate.setMood("idle");
  void droneActor;
}

// ---- Eclipse Lance (ultimate) ----
// The screen goes dark. She tears a portal open in front of her; an eclipse
// forms inside it, rune circles stack along the line of fire, and the lance
// of black light fires straight through him with a white-hot core, spiralling
// energy and shockwave rings racing along it.
async function eclipseLance(s) {
  const { fx, px, toon, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), e = { x: c.x + 80, y: c.y - 20 };
  fx.letterbox(true); fx.darken(0.8, 500);
  fx.title("ECLIPSE LANCE", "NOVA · ultimate");
  const settle = castPose(mate, { lift: 0.14, energy: 3.6, ms: 500 });
  sound.sfx("voidCharge"); sound.sfx("darkChoir", { ms: 1600 }); sound.sfx("ghostWind", { ms: 2600 });
  fx.focus(1.14, { x: e.x + 40, y: e.y }, 700);
  const L = Math.hypot(core.x - e.x, core.y - e.y) || 1, aim = { x: (core.x - e.x) / L, y: (core.y - e.y) / L }, ang = Math.atan2(aim.y, aim.x);
  const lanceEnd = (u) => ({ x: e.x + aim.x * (L + 500) * u, y: e.y + aim.y * (L + 500) * u });
  const gate = portal(s, px, { x: e.x, y: e.y, rx: 74, ry: 30, rot: ang + Math.PI / 2 });
  let heat = 0, beam = 0, beamW = 0, circles = 0;
  // the eclipse inside the portal: a black disc with a burning corona
  toon.add({ dur: 4200, draw(pen, k, t) {
    if (gate.P.open > 0.3) {
      const o = gate.P.open;
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + t * 0.002, rr = 22 * o + Math.sin(t * 0.02 + i * 2.3) * 3; pen.puff("heat", e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr, 6 + heat * 5, 0.5 + heat * 0.6); }
      pen.puff("void", e.x, e.y, 25 * o, 1.35);
    }
    if (beam > 0) {
      const end = lanceEnd(beam), wob = Math.sin(t * 0.09) * 2;
      pen.limb("void", [[e.x, e.y], [(e.x + end.x) / 2 - aim.y * wob, (e.y + end.y) / 2 + aim.x * wob], [end.x, end.y]], 58 * beamW, 34 * beamW, 1.25);
      for (let i = 0; i < 16; i++) { const u = ((i + t * 0.006) % 16) / 16, off = Math.sin(i * 3 + t * 0.03) * 34 * beamW; pen.puff("void", lerp(e.x, end.x, u) - aim.y * off, lerp(e.y, end.y, u) + aim.x * off, 9, 0.55 * beamW); }
    }
  } });
  // rune circles stacked along the line of fire, and the beam's white core, helix and rings
  pxTop.add({ dur: 4200, draw(g, k, t) {
    if (circles > 0) for (let n = 0; n < 3; n++) {
      const d = 50 + n * 62, cx = e.x + aim.x * d, cy = e.y + aim.y * d, r = (62 - n * 12) * ease.back(clamp01(circles * 1.6 - n * 0.3));
      if (r <= 0) continue;
      g.save(); g.translate(cx, cy); g.rotate(ang); g.scale(0.28, 1);
      g.strokeStyle = n % 2 ? "#cba2ff" : "#a066f0"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.72, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + t * 0.004 * (n % 2 ? -1 : 1); g.fillStyle = i % 2 ? "#ffffff" : "#cba2ff"; g.fillRect(Math.cos(a) * r * 0.86 - 4, Math.sin(a) * r * 0.86 - 4, 8, 8); }
      g.restore();
    }
    if (beam > 0) {
      const end = lanceEnd(beam), w = beamW * (8 + Math.sin(t * 0.08) * 2);
      g.strokeStyle = "#a066f0"; g.lineWidth = w + 8; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(end.x, end.y); g.stroke();
      g.strokeStyle = "#ffffff"; g.lineWidth = w; g.stroke();
      // energy spiralling round the lance
      for (const ph of [0, Math.PI]) {
        g.strokeStyle = ph ? "#cba2ff" : "#f3e6ff"; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 60; i++) { const u = i / 60, x = lerp(e.x, end.x, u), y = lerp(e.y, end.y, u), off = Math.sin(u * 40 - t * 0.04 + ph) * 22 * beamW; i ? g.lineTo(x - aim.y * off, y + aim.x * off) : g.moveTo(x - aim.y * off, y + aim.x * off); }
        g.stroke();
      }
      // shockwave rings racing along it
      for (let i = 0; i < 4; i++) {
        const u = ((t * 0.0016 + i / 4) % 1) * beam, x = lerp(e.x, end.x, u), y = lerp(e.y, end.y, u);
        g.save(); g.translate(x, y); g.rotate(ang); g.scale(0.25, 1); g.strokeStyle = "#e8d4ff"; g.lineWidth = 3; g.globalAlpha = beamW; g.beginPath(); g.arc(0, 0, 40 * beamW, 0, Math.PI * 2); g.stroke(); g.restore();
      }
      g.globalAlpha = 1;
    }
  } });
  await gate.open(600);
  sound.sfx("laserCharge", { ms: 1100 });
  gatherMotes(pxTop, e, 900, { n: 36, r: 200 });
  speedLines(pxTop, e, 900, { inner: 70, n: 30 });
  fx.slowmo(0.6, 800);
  await toon.add({ dur: 900, draw(pen, k) { heat = k; circles = ease.out(k); } });
  // FIRE
  sound.sfx("laserBeam", { ms: 900 }); sound.sfx("ghostWail", { size: 1.4 });
  bigHit(fx, e, { stop: 100, shake: 22, punch: 0.05 });
  flashAt(pxTop, e, 130, 340);
  mate.nova.idle.shake = 0.6;
  fx.focus(1.04, { x: (e.x + core.x) / 2, y: core.y }, 260);
  beamW = 1;
  await toon.add({ dur: 110, draw(pen, k) { beam = ease.out(k); } });
  sound.sfx("explosion", { size: 1.5 });
  bigHit(fx, core, { stop: 220, shake: 34, punch: 0.08, flash: "#e8d4ff" });
  speedLines(pxTop, core, 500);
  explode(toon, core.x - 6, core.y, { size: 1.6, kind: "void", dur: 1300 });
  shards(pxTop, core, 28, 1.6);
  fx.debris(core, 14, { power: 1.6, dir: 1 });
  s.golem.to({ lean: 0.22, tilt: 0.14 }, 140, "out");
  s.onHit(1);
  for (let i = 0; i < 4; i++) { await fx.wait(110); fx.shake(16); s.golem.fxv.glitch = 0.7; s.golem.to({ glitch: 0 }, 100, "lin", s.golem.fxv); sound.sfx("hit", { size: 0.6 }); }
  fx.hitstop(90); sound.sfx("explosion", { size: 1 });
  explode(toon, core.x + aim.x * 90, core.y + aim.y * 90, { size: 1.1, kind: "void", dur: 1000 });
  s.onHit(2);
  await toon.add({ dur: 300, draw(pen, k) { beamW = 1 - ease.in(k); circles = 1 - k; } });
  beam = 0; circles = 0; mate.nova.idle.shake = 0;
  await gate.close();
  fx.letterbox(false); fx.darken(0, 500); fx.focus(1, null, 500);
  s.golem.rest(500);
  settle();
  await fx.wait(400);
  mate.setMood("idle");
}

// ---- Planetfall (ultimate II) ----
// Isaac's idea (2026-10-21). Portals open high in the sky, tilted toward GOLEM;
// out of them Venus, Mars and Uranus come straight down into him like asteroids
// and explode (three chunks of damage; Venus smashes his Firewall first). Then
// a huge portal opens right above him, taking everything she has, and Jupiter
// comes down out of it onto his raised hands. He holds it, crushed down, and
// forces it slowly back up into the portal, which slams shut.
function drawPlanet(g, frames, at, t, { scale = 1, clipY = null, spin = 8, squash = 0 } = {}) {
  const f = spinFrame(frames, t, spin), w = f.width * scale, h = f.height * scale * (1 - squash);
  g.save();
  if (clipY !== null) { g.beginPath(); g.rect(-9999, clipY, 99999, 99999); g.clip(); }   // only what has come through the portal
  g.drawImage(f, Math.round(at.x - w / 2), Math.round(at.y - h / 2), Math.round(w), Math.round(h));
  g.restore();
}
async function planetfall(s) {
  const { fx, px, pxTop, spr, toon, mate, boss, foeEl } = s;
  const PL = planetSprites();
  if (!PL) return voidOrb(s);   // no WebGL for the planets
  const core = s.golemC(), floor = fx.floorY, c = s.mateC();
  const skyY = Math.max(64, fx.h * 0.16);
  fx.letterbox(true); fx.darken(0.78, 600);
  fx.title("PLANETFALL", "NOVA · ultimate II");
  const settle = castPose(mate, { lift: 0.18, energy: 3.6, ms: 600 });
  sound.sfx("darkChoir", { ms: 2000 }); sound.sfx("ghostWind", { ms: 9000 });
  gatherMotes(pxTop, () => s.mateC(), 900, { n: 34, r: 180 });
  fx.focus(1.02, { x: (c.x + core.x) / 2, y: fx.h * 0.45 }, 800);
  await fx.wait(700);

  // ---- three planets, three blows ----
  // Isaac 2026-10-21: the portals stay put high in the sky, tilted toward
  // GOLEM, and each planet comes straight out of its portal and slams into him
  // in one go, like an asteroid (no pause, no drifting).
  const smalls = [
    { key: "venus", at: { x: lerp(c.x, core.x, 0.18), y: 58 }, frac: 0.3, spin: 7 },
    { key: "mars", at: { x: lerp(c.x, core.x, 0.36), y: 38 }, frac: 0.3, spin: 10 },
    { key: "uranus", at: { x: lerp(c.x, core.x, 0.52), y: 62 }, frac: 0.4, spin: 6, last: true },
  ];
  const throwPlanet = async (P) => {
    const frames = PL[P.key], r = frames.r, to0 = s.golemC();
    const ang = Math.atan2(to0.y - P.at.y, to0.x - P.at.x);
    const gate = portal(s, px, { x: P.at.x, y: P.at.y, rx: r * 1.3, ry: r * 0.5, rot: ang + Math.PI / 2 });
    await gate.open(380);
    // straight out of the portal and into him: it grows as it comes out of the
    // portal's depth and accelerates all the way down
    const at = { ...P.at };
    let live = true, sc = 0.3, squash = 0;
    const trail = [];
    spr.add({ dur: 4000, draw(g, k, t, a) { if (!live) { a.t = a.dur; return; } drawPlanet(g, frames, at, t, { scale: sc, spin: P.spin, squash }); } });
    toon.add({ dur: 4000, draw(pen, k, t, a) {   // the burn as it tears through the air
      if (!live && !trail.length) { a.t = a.dur; return; }
      if (live && sc > 0.6) { trail.push({ x: at.x, y: at.y, t }); pen.puff("heat", at.x + Math.cos(ang) * r * 0.55, at.y + Math.sin(ang) * r * 0.55, r * 0.95 * sc, 1.2); }
      for (let i = trail.length - 1; i >= 0; i--) {
        const q = trail[i], age = (t - q.t) / 360; if (age > 1) { trail.splice(i, 1); continue; }
        pen.puff("heat", q.x - Math.cos(ang) * age * 10, q.y - Math.sin(ang) * age * 10 - age * 8, r * (0.85 - age * 0.45), 1.1 - age * 1.1);
        if (age > 0.4) pen.puff("smoke", q.x - Math.cos(ang) * age * 20, q.y - age * 26, r * (0.45 + age * 0.5), (age - 0.4) * 1.4 * (1 - age), clamp01(age - 0.6));
      }
    } });
    sound.sfx("whoosh", { theme: "fire" }); sound.sfx("ghostFly"); sound.sfx("rumble", { size: 0.6 });
    const to = s.golemC();
    speedLines(pxTop, to, 380, { inner: 110 });
    fx.wait(220).then(() => gate.close(300, false));
    await spr.add({ dur: 460, draw(g, k) { const e = ease.in(k) * 0.7 + k * 0.3; at.x = lerp(P.at.x, to.x - 10, e); at.y = lerp(P.at.y, to.y - 10, e); sc = 0.3 + 0.7 * ease.out(Math.min(1, k * 3)); } });
    // impact
    if (P.key === "venus" && boss.dome.childElementCount) { boss.breakDome(); sound.sfx("shatter"); }
    sound.sfx("explosion", { size: P.last ? 1.6 : 1.3 });
    bigHit(fx, to, { stop: P.last ? 200 : 150, shake: P.last ? 32 : 26, punch: P.last ? 0.07 : 0.05, flash: "#ffd9a3" });
    squash = 0.35;
    await fx.wait(40);
    live = false;
    explode(toon, to.x - 10, to.y - 4, { size: P.last ? 1.8 : 1.45, dur: 1300 });
    flashAt(pxTop, to, P.last ? 130 : 95, 280);
    fx.debris(to, 14, { power: 1.5 }); fx.sparks(to, 18, { power: 1.5 });
    const shardsOf = Array.from({ length: 16 }, () => ({ a: rand(0, Math.PI * 2), v: rand(90, 230), s: rand(3, 8) }));
    const col = { venus: ["#e8d6a8", "#a6814e"], mars: ["#c4532a", "#54301f"], uranus: ["#6ccbd6", "#1a7488"] }[P.key];
    px.add({ dur: 750, draw(g, k) { for (const [i, q] of shardsOf.entries()) { g.globalAlpha = 1 - k; g.fillStyle = col[i % 2]; g.fillRect(to.x + Math.cos(q.a) * q.v * k, to.y + Math.sin(q.a) * q.v * k + 170 * k * k, q.s, q.s); } g.globalAlpha = 1; } });
    s.golem.to({ lean: 0.14, tilt: 0.16, bob: -0.09 }, 110, "out").then(() => s.golem.to({ lean: 0, tilt: 0, bob: 0 }, 380, "io"));
    if (P.last) { s.onHit(1); s.onHit(2); } else s.chunk(P.frac);
  };
  for (const P of smalls) { await throwPlanet(P); await fx.wait(P.last ? 600 : 160); }

  // ---- Jupiter ----
  // Its portal opens right above GOLEM. He sees it coming and throws his arms
  // up; Jupiter comes down out of the portal straight onto his hands (still half
  // inside it). He holds it with everything he has, then forces it slowly back
  // up into the portal, which slams shut.
  const jf = PL.jupiter, R = jf.r;
  const big = { x: core.x - 15, y: 30 };
  fx.focus(1, null, 500);
  fx.darken(0.86, 800);
  mate.setMood("angry");
  const strain = mate.anim(2200, (e) => { mate.nova.idle.shake = 0.25 + 0.5 * e; mate.nova.lift = 0.18 + 0.06 * e; }, "lin");
  sound.sfx("bhRumble", { ms: 9000 }); sound.sfx("darkChoir", { ms: 3200 }); sound.sfx("whispers", { ms: 3200 });
  gatherMotes(pxTop, () => s.mateC(), 2000, { n: 40, r: 220 });
  const gate = portal(s, px, { x: big.x, y: big.y, rx: R * 0.9, ry: 26 });
  for (let i = 0; i < 6; i++) fx.wait(i * 300).then(() => fx.shake(4 + i * 2));
  // the ground shakes and loose rubble starts to float up off the floor
  const rubble = Array.from({ length: 26 }, () => ({ x: rand(40, fx.w - 40), s: rand(2, 5), v: rand(18, 60), d: rand(0, 2400) }));
  px.add({ dur: 9000, draw(g, k, t) { for (const q of rubble) { const u = Math.max(0, t - q.d) / 1000; if (u <= 0) continue; const y = floor - 2 - q.v * u - Math.sin(u * 3 + q.x) * 3; if (y < big.y + 30) continue; g.fillStyle = q.s > 3.5 ? "#5d6270" : "#8c92a0"; g.fillRect(q.x + Math.sin(u * 2 + q.x) * 4, y, q.s, q.s); } } });
  const opening = gate.open(1500);
  // he sees it coming: looks up, braces, arms up
  await fx.wait(700);
  sound.sfx("servo", { ms: 500 }); sound.sfx("roar");
  fx.focus(1.06, { x: core.x - 20, y: fx.h * 0.42 }, 600);
  s.golem.to({ tilt: -0.28, ca: 1.5, ce: 1.4, cp: 0, na: 1.5, ne: 1.4, np: 0.3, flare: 1.6, thrust: 2.2, bob: 0.05 }, 520, "out");
  await opening;
  fx.title("JUPITER", "");
  await strain;
  // it comes down out of the portal, straight onto his hands
  const hands = () => { const a = s.Pt([-0.06, -1.5, -0.05], "claw"), b = s.Pt([0, -1.05, 0], "cannon"); return { a, b, y: Math.min(a.y, b.y), x: (a.x + b.x) / 2 }; };
  const J = { x: hands().x, y: big.y - R };
  let jLive = true;
  const jBody = spr.add({ dur: 20000, draw(g, k, t, a) { if (!jLive) { a.t = a.dur; return; } drawPlanet(g, jf, J, t, { clipY: big.y, spin: 2.5 }); } });
  pxTop.add({ dur: 20000, draw(g, k, t, a) { if (!jLive) { a.t = a.dur; return; } glow(g, J.x, Math.max(J.y, big.y + 20), R * 1.4, "#ff9a4a", 0.2); } });
  sound.sfx("ghostFly", { size: 1.4 }); sound.sfx("laserCharge", { ms: 1300 });
  for (let i = 0; i < 6; i++) fx.wait(i * 200).then(() => { fx.shake(6 + i * 2); sound.sfx("rumble", { size: 0.6 }); });
  const y0 = J.y;
  await spr.add({ dur: 1300, draw(g, k) { const h = hands(), e = ease.in(k); J.x = lerp(J.x, h.x, 0.2); J.y = lerp(y0, h.y - R * 0.9, e); } });
  // contact
  sound.sfx("explosion", { size: 1.8 }); sound.sfx("impact", { size: 1.6 }); sound.sfx("slamImpact");
  bigHit(fx, { x: J.x, y: J.y + R }, { stop: 300, shake: 42, punch: 0.08, flash: "#ffd9a3" });
  speedLines(pxTop, { x: J.x, y: J.y + R }, 500, { inner: 120 });
  fx.ring({ x: core.x, y: floor }, { color: "#ffd9a3", size: 440, flat: 0.12, ms: 700, width: 10 });
  fx.crack(core.x, { width: 340 }); fx.dust(core.x, 30, 3);
  fx.debris({ x: core.x, y: floor - 10 }, 18, { power: 1.7 });
  // he holds it: crushed down, arms buckling, sparks at his hands, thrusters screaming
  const home = foeEl._pos || { x: 0, y: 0, r: 0 };
  fx.move(foeEl, { x: home.x, y: home.y + 36 }, 200, "out");
  s.golem.to({ ce: 1.78, ne: 1.78, bob: -0.22, tilt: -0.2, flare: 2.4, thrust: 3 }, 200, "out");
  fx.slowmo(0.55, 1800);
  fx.focus(1.1, { x: core.x - 20, y: (big.y + floor) / 2 + 20 }, 600);
  let holding = true;
  pxTop.add({ dur: 12000, draw(g, k, t, a) {   // the grinding contact at his hands
    if (!holding) { a.t = a.dur; return; }
    const h = hands();
    for (const p of [h.a, h.b]) { glow(g, p.x, p.y - 4, 18 + 4 * Math.sin(t * 0.05), "#ffb040", 0.8); if (((t / 50) | 0) % 2) { g.fillStyle = "#fff3c4"; g.fillRect(p.x + rand(-10, 10), p.y - 6 + rand(-6, 6), 3, 3); } }
  } });
  let carry = true;   // Jupiter rides on his hands while he holds and pushes
  spr.add({ dur: 12000, draw(g, k, t, a) { if (!carry) { a.t = a.dur; return; } const h = hands(); J.x = lerp(J.x, h.x, 0.2); J.y = h.y - R * 0.9 + Math.sin(t * 0.03) * 2; } });
  for (let i = 0; i < 6; i++) {
    await fx.wait(260);
    sound.sfx("servo", { ms: 220 }); sound.sfx("impact", { size: 0.5 });
    fx.shake(10 + i * 2); fx.hitstop(40); fx.sparks(hands().a, 6, { colors: ["#fff3c4", "#ffb040"], power: 1 }); fx.sparks(hands().b, 6, { colors: ["#fff3c4", "#ffb040"], power: 1 });
    fx.dust(core.x + rand(-60, 60), 4, 1);
    s.golem.fxv.glitch = 0.4; s.golem.to({ glitch: 0 }, 160, "lin", s.golem.fxv);
    s.golem.to({ ce: 1.78 + (i % 2 ? 0.08 : -0.05), ne: 1.78 + (i % 2 ? -0.05 : 0.08), tilt: -0.2 + (i % 2 ? 0.04 : -0.04) }, 200, "io");
  }
  // he roars and, slowly, with everything he has, forces it back up
  sound.sfx("roar"); sound.sfx("laserCharge", { ms: 1600 });
  fx.flash(0.3, "#ffd9a3"); impactFrame(fx, { ms: 60 });
  fx.ring(s.golemC(), { color: "#ffb040", size: 320, flat: 0.6, ms: 600, width: 8 });
  fx.focus(1.03, { x: big.x, y: fx.h * 0.36 }, 1200);
  const pushing = s.golem.to({ ca: 1.7, ce: 1.5, cp: -0.6, na: 1.7, ne: 1.5, np: -0.3, tilt: -0.3, flare: 3, thrust: 3.2, bob: 0.06 }, 1500, "io");
  fx.move(foeEl, { x: home.x, y: home.y - 12 }, 1500, "inOut");
  for (let i = 0; i < 5; i++) fx.wait(i * 300).then(() => { sound.sfx("servo", { ms: 260 }); fx.shake(8); fx.sparks(hands().a, 4, { colors: ["#fff3c4", "#ffb040"], power: 0.8 }); fx.sparks(hands().b, 4, { colors: ["#fff3c4", "#ffb040"], power: 0.8 }); });
  await pushing;
  // one last shove sends it the rest of the way into the portal
  carry = false; holding = false;
  mate.setMood("sad");
  sound.sfx("impact", { size: 1 });
  fx.shake(16);
  const jy = J.y;
  await spr.add({ dur: 700, draw(g, k) { J.y = lerp(jy, big.y - R * 1.05, ease.io(k)); } });
  jLive = false;
  // the portal slams shut
  await gate.close(280);
  sound.sfx("explosion", { size: 1 });
  fx.shake(24); fx.flash(0.4, "#e8d4ff"); flashAt(pxTop, big, 150, 400);
  fx.move(foeEl, { x: home.x, y: home.y }, 400, "inOut");
  s.golem.rest(700);
  await fx.wait(500);
  fx.letterbox(false); fx.darken(0, 600); fx.focus(1, null, 600);
  mate.nova.idle.shake = 0;
  settle();
  await fx.wait(500);
  mate.setMood("idle");
  void jBody;
}

// ---- the cards ----
export const NOVA_KIT = [
  { id: "shadowBolt", name: "Shadow Bolt", tier: "basic", run: shadowBolt,
    desc: "A quick bolt of shadow that bursts on the boss.",
    art(pen, w, h) { pen.limb("void", [[10, 50], [30, 38], [50, 28]], 4, 12, 0.9); pen.puff("void", 56, 24, 13, 1.2); pen.puff("void", 56, 24, 24, 0.35); } },
  { id: "wraithFlock", name: "Wraith Flock", tier: "light", run: wraithFlock,
    desc: "She rips a portal open in the air and screaming wraiths pour out of it, ripping through the boss.",
    art(pen, w, h) { for (let i = 0; i < 3; i++) { const y = 16 + i * 15, pts = []; for (let j = 0; j <= 8; j++) pts.push([62 - j * 6, y + Math.sin(j * 0.9 + i) * 4 + j * 0.8]); pen.limb("void", pts, 10, 1, 1.05); pen.puff("void", 62, y, 7, 1.15); } } },
  { id: "voidOrb", name: "Void Orb", tier: "medium", run: voidOrb,
    desc: "She hurls a swirling orb of void that grinds into the boss as a vortex, then implodes.",
    art(pen, w, h) { for (let a = 0; a < 4; a++) { const pts = []; for (let j = 0; j <= 10; j++) { const u = j / 10, ang = a * Math.PI / 2 + u * 3, r = 28 - u * 18; pts.push([40 + Math.cos(ang) * r, 30 + Math.sin(ang) * r * 0.8]); } pen.limb("void", pts, 5, 2, 0.9); } pen.puff("void", 40, 30, 13, 1.2); } },
  { id: "spectralChains", name: "Spectral Chains", tier: "medium", run: spectralChains,
    desc: "Chains lash out of portals above and below the boss and try to tear it in half.",
    art(pen, w, h) { for (const [x0, y0, x1, y1] of [[8, 54, 52, 12], [72, 54, 30, 12]]) for (let i = 0; i <= 6; i++) pen.puff("void", lerp(x0, x1, i / 6), lerp(y0, y1, i / 6), 6, 1.2, 0.85); pen.oval("void", 40, 56, 34, 6, 0.9); } },
  { id: "grasp", name: "Grasp of the Void", tier: "heavy", run: graspOfTheVoid,
    desc: "Tears a portal open under the boss. Shadow hands seize it and drag it into the void before it tears free.",
    art(pen, w, h) { pen.oval("void", 40, 56, 30, 6, 1.1); voidArm(pen, [40, 58], [40, 24], 6, 9, 1, 0, 1); voidHand(pen, [40, 24], -Math.PI / 2, 26, 0.15, 0, 1, 1, 1); } },
  { id: "eclipseLance", name: "Eclipse Lance", tier: "ultimate", run: eclipseLance,
    desc: "An eclipse forms inside a portal and fires a lance of black light straight through the boss.",
    art(pen, w, h) { for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; pen.puff("heat", 22 + Math.cos(a) * 13, 30 + Math.sin(a) * 13, 5, 0.95); } pen.puff("void", 22, 30, 14, 1.3); pen.limb("void", [[24, 30], [80, 30]], 16, 10, 1.15); pen.limb("heat", [[24, 30], [80, 30]], 3, 2, 1.2); } },
  { id: "planetfall", name: "Planetfall", tier: "ultimate2", run: planetfall, counters: "firewall",
    desc: "Portals open across the sky and drop Venus, Mars and Uranus onto the boss. Then she tries Jupiter. Breaks a Firewall.",
    art(pen, w, h) { for (const [x, y, r] of [[16, 14, 7], [36, 10, 6], [58, 16, 8]]) { pen.puff("heat", x, y, r, 1.1); pen.puff("heat", x - 3, y - 5, r * 0.7, 0.6); } pen.oval("void", 40, 40, 30, 8, 1.1); pen.puff("heat", 40, 54, 16, 0.9); } },
];
