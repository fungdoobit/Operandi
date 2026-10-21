// NOVA's ability kit (PRD Addendum I): dark void magic. See abilities.js for
// how a scene is called and the s object it gets.
import { ease, lerp, ribbon, glow, starFlash } from "./pixel/pixel-fx.js";
import { explode } from "./pixel/toon-fx.js";
import { sound } from "./sound.js";

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
      pen.puff("void", p.x, p.y, r * 1.5, 1.15); pen.puff("void", p.x, p.y, r * 2.8, 0.32);
    }
    for (const q of trail) {
      const age = (t - q.t) / 320; if (age > 1) continue;
      pen.puff("void", q.x, q.y - age * 8, r * (1.15 - age * 0.7), 0.9 * (1 - age));
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

// ---- Wraith Flock (light) ----
// Screaming wraiths pour out of her cloak, swoop up and rip through him one
// after another, then scatter into haze.
async function wraithFlock(s) {
  const { fx, toon, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), N = 7, dur = 980;
  const settle = castPose(mate, { lift: 0.06, energy: 2.6 });
  sound.sfx("voidCharge");
  fx.focus(1.05, { x: (c.x + core.x) / 2, y: core.y - 30 }, 500);
  await fx.wait(260);
  const bez = (P, u) => { const v = 1 - u; return { x: v * v * v * P[0].x + 3 * v * v * u * P[1].x + 3 * v * u * u * P[2].x + u * u * u * P[3].x, y: v * v * v * P[0].y + 3 * v * v * u * P[1].y + 3 * v * u * u * P[2].y + u * u * u * P[3].y }; };
  const wraiths = Array.from({ length: N }, (_, i) => {
    const P = [{ x: c.x - 4, y: c.y + 12 }, { x: c.x - 70 + rand(-30, 30), y: c.y - 150 + rand(-30, 30) }, { x: core.x - 200 + rand(-40, 40), y: core.y - 110 + rand(-50, 60) }, { x: core.x + 170, y: core.y + rand(-80, 50) }];
    let best = 0, bd = 1e9;   // where it passes closest to his core: that's its hit
    for (let k = 0; k <= 60; k++) { const p = bez(P, k / 60), d = Math.hypot(p.x - core.x, p.y - core.y); if (d < bd) { bd = d; best = k / 60; } }
    return { P, delay: i * 95, sz: rand(9, 13), seed: i * 1.7, hitU: best };
  });
  const at = (w, u) => { const p = bez(w.P, clamp01(u)), q = bez(w.P, clamp01(u + 0.01)), dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy) || 1, wob = Math.sin(u * 14 + w.seed) * 9; return { x: p.x - dy / n * wob, y: p.y + dx / n * wob, dx: dx / n, dy: dy / n }; };
  const uOf = (w, t) => (t - w.delay) / dur;
  toon.add({ dur: N * 95 + dur + 300, draw(pen, k, t) {
    for (const w of wraiths) {
      const u = uOf(w, t); if (u <= 0 || u > 1.25) continue;
      const fade = u > 1 ? 1 - (u - 1) / 0.25 : 1, pts = [];
      for (let j = 0; j <= 12; j++) pts.push(at(w, u - j * 0.022));
      const P = pts.map((p) => [p.x, p.y]);
      pen.limb("void", P, w.sz * 1.7, 1.2, 1.05 * fade);
      pen.limb("void", P.map(([x, y], j) => [x + Math.sin(t * 0.02 + j) * 4, y + 5 + j * 0.6]), w.sz * 0.7, 0.8, 0.9 * fade);   // a ragged second strand
      pen.puff("void", P[0][0], P[0][1], w.sz * 1.15, 1.15 * fade);
      for (let j = 3; j < 12; j += 3) pen.puff("void", P[j][0], P[j][1] - 4, w.sz * 1.4, 0.3 * fade);   // haze shed off the tail
    }
  } });
  pxTop.add({ dur: N * 95 + dur + 300, draw(g, k, t) {   // glowing eyes and a gaping mouth
    for (const w of wraiths) {
      const u = uOf(w, t); if (u <= 0 || u > 1.05) continue;
      const h = at(w, u), px = -h.dy, py = h.dx, e = w.sz * 0.42, f = h.dx > 0 ? 1 : -1;
      for (const side of [-1, 1]) {
        const x = h.x + h.dx * w.sz * 0.25 + px * side * e * f, y = h.y + h.dy * w.sz * 0.25 + py * side * e * f - 2;
        glow(g, x, y, 7, "#a066f0", 0.7); g.fillStyle = "#fff"; g.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      g.fillStyle = "#2a0f48"; g.fillRect(h.x + h.dx * w.sz * 0.1 - 2, h.y + w.sz * 0.35 - 1, 4, 6);   // the scream
    }
  } });
  wraiths.forEach((w, i) => fx.wait(w.delay + w.hitU * dur).then(() => {
    sound.sfx("hit", { size: 0.6 }); fx.hitstop(i === N - 1 ? 110 : 34); fx.shake(i === N - 1 ? 16 : 7);
    s.golem.fxv.glitch = 0.5; s.golem.to({ glitch: 0 }, 200, "lin", s.golem.fxv);
    shards(pxTop, at(w, w.hitU), 6, 0.6);
    if (i === 0) s.onHit(1);
    if (i === N - 1) { fx.punch(0.04, core); s.onHit(2); }
  }));
  await fx.wait(N * 95 + dur + 300);
  fx.focus(1, null, 500);
  settle();
  mate.setMood("idle");
}

// ---- Void Orb (medium) ----
// She gathers a swirling orb of void, hurls it, and it tears open into a
// grinding vortex on him (several ticks) before it implodes.
async function voidOrb(s) {
  const { fx, toon, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), o = { x: c.x + 44, y: c.y - 52 };
  const settle = castPose(mate, { lift: 0.1, energy: 2.8 });
  sound.sfx("voidCharge");
  fx.darken(0.35, 400);
  let R = 0, at = { ...o }, spin = 0, vortex = 0, collapse = 0;
  gatherMotes(pxTop, o, 620, { n: 22, r: 130 });
  const arms = (pen, p, r0, r1, turn, amt) => {   // spiral arms winding into the middle
    for (let a = 0; a < 4; a++) {
      const pts = [];
      for (let j = 0; j <= 14; j++) { const u = j / 14, ang = a * Math.PI / 2 + u * 3.2 + turn, r = lerp(r0, r1, u); pts.push([p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8]); }
      pen.limb("void", pts, 7, 2, amt);
    }
  };
  const orb = toon.add({ dur: 2900, draw(pen, k, t) {
    spin = t * 0.012;
    if (R > 0) { pen.puff("void", at.x, at.y, R * 1.45, 1.2); pen.puff("void", at.x, at.y, R * 2.5, 0.34); }
    if (R > 0 && !vortex) arms(pen, at, R * 2.6, R * 0.6, -spin, 0.75);
    if (vortex > 0) {
      const sc = vortex * (1 - collapse);
      arms(pen, at, 95 * sc, 12 * sc, -spin * 2.2, 1);
      arms(pen, at, 60 * sc, 8 * sc, -spin * 2.2 + 0.8, 0.5);
    }
  } });
  await toon.add({ dur: 620, draw(pen, k) { R = 20 * ease.out(k); } });
  // hurl it
  sound.sfx("whoosh", { theme: "void" }); fx.hitstop(50); fx.shake(10);
  mate.nova.idle.shake = 0.4; mate.anim(200, (e) => { mate.nova.idle.shake = 0.4 * (1 - e); }, "lin");
  const from = { ...o };
  await toon.add({ dur: 300, draw(pen, k, t) {
    const e = ease.in(k); at.x = lerp(from.x, core.x - 8, e); at.y = lerp(from.y, core.y, e) - Math.sin(e * Math.PI) * 30;
    pen.puff("void", lerp(from.x, at.x, 0.7), lerp(from.y, at.y, 0.7), R * 1.2, 0.6);
  } });
  // the vortex grinds into him
  sound.sfx("voidCrush"); fx.punch(0.04, core); fx.flash(0.15, DEEP);
  await toon.add({ dur: 180, draw(pen, k) { vortex = ease.back(k); } });
  for (let i = 0; i < 4; i++) {
    fx.hitstop(40); fx.shake(9 + i * 2); sound.sfx("hit", { size: 0.5 });
    shards(pxTop, { x: core.x + rand(-30, 30), y: core.y + rand(-30, 30) }, 6, 0.6);
    s.golem.to({ tilt: i % 2 ? 0.08 : -0.08, lean: 0.05 }, 120, "out");
    s.golem.fxv.glitch = 0.4; s.golem.to({ glitch: 0 }, 160, "lin", s.golem.fxv);
    if (i === 0) s.onHit(1);
    await fx.wait(200);
  }
  // it implodes
  fx.slowmo(0.4, 200);
  await toon.add({ dur: 170, draw(pen, k) { collapse = ease.in(k); R = 20 * (1 - k); } });
  sound.sfx("explosion", { size: 1 });
  fx.hitstop(120); fx.shake(22); fx.punch(0.05, core); fx.flash(0.35, "#e8d4ff");
  explode(toon, core.x - 8, core.y, { size: 1.2, kind: "void", dur: 1100 });
  flashAt(pxTop, core, 80, 300); shards(pxTop, core, 18, 1.2);
  s.onHit(2);
  vortex = 0;
  s.golem.rest(500);
  fx.darken(0, 500);
  settle();
  await fx.wait(450);
  mate.setMood("idle");
  await orb;
}

// ---- Spectral Chains (medium) ----
// A rune circle flares under him; glowing chains burst out of it and lash
// round his arms and hull; she yanks, and they slam him into the floor.
function drawChain(g, a, b, k, t, taut = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) * k, n = Math.max(1, Math.floor(L / 9)), ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const sag = (1 - taut) * 12;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = a.x + ux * L * u - uy * Math.sin(u * Math.PI) * sag + (taut ? Math.sin(t * 0.08 + i) * taut * 1.5 : 0), y = a.y + uy * L * u + ux * Math.sin(u * Math.PI) * sag;
    g.save(); g.translate(x, y); g.rotate(Math.atan2(uy, ux));
    g.strokeStyle = i % 2 ? DEEP : VIOLET; g.lineWidth = 2.6;
    g.beginPath(); g.ellipse(0, 0, 6, i % 2 ? 1.6 : 3.6, 0, 0, Math.PI * 2); g.stroke();
    if (i % 2 === 0) { g.fillStyle = PALE; g.fillRect(-2, -3.5, 3, 1.5); }
    g.restore();
  }
  if (k < 1) { const x = a.x + ux * L, y = a.y + uy * L; glow(g, x, y, 12, "#a066f0", 0.8); g.fillStyle = PALE; g.beginPath(); g.moveTo(x + ux * 9, y + uy * 9); g.lineTo(x - uy * 5, y + ux * 5); g.lineTo(x + uy * 5, y - ux * 5); g.fill(); }
}
function drawRuneCircle(g, cx, cy, R, o, t, back) {
  if (o <= 0) return;
  g.save(); g.beginPath(); back ? g.rect(cx - R * 2, cy - R, R * 4, R) : g.rect(cx - R * 2, cy, R * 4, R); g.clip();
  g.translate(cx, cy); g.scale(1, 0.24);
  const r = R * o;
  g.lineWidth = 5; g.strokeStyle = "#a066f0"; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2.5; g.strokeStyle = VIOLET; g.beginPath(); g.arc(0, 0, r * 0.8, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 - t * 0.0012; g.save(); g.rotate(a); g.fillStyle = i % 3 ? VIOLET : PALE; g.fillRect(r * 0.84, -5, 8, i % 2 ? 10 : 4); g.restore(); }
  g.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 * 2 + t * 0.0008; i ? g.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78) : g.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); } g.lineWidth = 2; g.strokeStyle = "#8a4dff"; g.stroke();
  g.restore();
}
async function spectralChains(s) {
  const { fx, px, pxBack, pxTop, toon, mate, foeEl } = s;
  const c = s.mateC(), core = s.golemC(), floor = fx.floorY, R = Math.min(150, fx.w * 0.12), cx = core.x - 10;
  const settle = castPose(mate, { lift: 0.07, energy: 2.6 });
  let open = 0;
  sound.sfx("voidTear"); fx.shake(6);
  pxBack.add({ dur: 2600, draw(g, k, t) { drawRuneCircle(g, cx, floor + 2, R, open, t, true); } });
  px.add({ dur: 2600, z: 1, draw(g, k, t) { drawRuneCircle(g, cx, floor + 2, R, open, t, false); } });
  toon.add({ dur: 2600, draw(pen, k) { if (open > 0) pen.oval("void", cx, floor + 2, R * 0.85 * open, R * 0.2 * open, 0.4 * (1 - k)); } });
  await px.add({ dur: 300, draw(g, k) { open = ease.back(k); } });
  // chains burst out and lash round him
  const tg = [["claw", [0, -0.35, -0.2]], ["cannon", [0, -0.45, -0.2]], [null, [-0.45, 0.05, -0.5]], [null, [0.45, 0.0, -0.5]]];
  const chains = tg.map(([part, L], i) => ({ part, L, a: i * Math.PI / 2 + 0.6, ext: 0, wrap: 0, delay: i * 70 }));
  const anchor = (ch) => ({ x: cx + Math.cos(ch.a) * R * 0.8, y: floor + 2 + Math.sin(ch.a) * R * 0.19 });
  const target = (ch) => (ch.part ? s.Pt(ch.L, ch.part) : s.Pt(ch.L));
  let taut = 0, broken = 0;
  pxTop.add({ dur: 2200, draw(g, k, t) {
    if (broken) return;
    for (const ch of chains) {
      if (ch.ext <= 0) continue;
      const a = anchor(ch), b = target(ch);
      drawChain(g, a, b, ch.ext, t, taut);
      if (ch.wrap > 0) {   // a loop of chain cinched round the arm
        g.save(); g.translate(b.x, b.y); g.rotate(t * 0.004);
        g.strokeStyle = VIOLET; g.lineWidth = 3; g.setLineDash([6, 4]);
        g.beginPath(); g.ellipse(0, 0, 18 * ch.wrap, 9 * ch.wrap, 0.4, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    }
  } });
  sound.sfx("whoosh", { theme: "void" });
  await Promise.all(chains.map((ch) => fx.wait(ch.delay).then(() => pxTop.add({ dur: 200, draw(g, k) { ch.ext = ease.out(k); } }).then(() => pxTop.add({ dur: 140, draw(g, k) { ch.wrap = ease.back(k); } })))));
  sound.sfx("voidCrush"); fx.hitstop(90); fx.shake(13); fx.flash(0.15, DEEP);
  s.golem.fxv.glitch = 0.5; s.golem.to({ glitch: 0 }, 300, "lin", s.golem.fxv);
  s.onHit(1);
  // she yanks: the chains go taut and drag him down into the floor
  mate.nova.idle.shake = 0.5;
  mate.anim(260, (e) => { mate.nova.lift = 0.07 - 0.12 * e; }, "in");
  await pxTop.add({ dur: 220, draw(g, k) { taut = ease.out(k); } });
  const home = foeEl._pos || { x: 0, y: 0, r: 0 };
  s.golem.to({ lean: 0.18, bob: -0.12, tilt: 0.1 }, 160, "in");
  await fx.move(foeEl, { x: home.x - 8, y: home.y + 34 }, 150, "in");
  sound.sfx("explosion", { size: 1.1 }); sound.sfx("impact", { size: 1 });
  fx.hitstop(150); fx.shake(26); fx.punch(0.06, core); fx.flash(0.3, "#e8d4ff");
  fx.crack(core.x, { width: 240, color: "#a066f0" }); fx.dust(core.x, 14, 1.4); fx.debris({ x: core.x, y: floor }, 10, { power: 1.3 });
  explode(toon, cx, floor - 10, { size: 0.9, kind: "void", dur: 900 });
  s.onHit(2);
  // the chains shatter into links
  broken = 1;
  const links = chains.flatMap((ch) => { const a = anchor(ch), b = target(ch); return Array.from({ length: 8 }, (_, i) => ({ x: lerp(a.x, b.x, i / 7), y: lerp(a.y, b.y, i / 7), vx: rand(-90, 90), vy: rand(-160, -40) })); });
  pxTop.add({ dur: 700, draw(g, k) {
    for (const l of links) { g.globalAlpha = 1 - k; g.strokeStyle = VIOLET; g.lineWidth = 2; g.beginPath(); g.ellipse(l.x + l.vx * k, l.y + l.vy * k + 300 * k * k, 5, 3, k * 6, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  } });
  mate.nova.idle.shake = 0;
  await fx.wait(300);
  fx.move(foeEl, { x: home.x, y: home.y }, 420, "out");
  s.golem.rest(500);
  await px.add({ dur: 400, draw(g, k) { open = 1 - ease.in(k); } });
  settle();
  mate.setMood("idle");
}

// ---- Eclipse Lance (ultimate) ----
// The screen goes dark and her corona spins up. An eclipse forms in front of
// her inside a ring of runes, then fires a lance of black light straight
// through him.
async function eclipseLance(s) {
  const { fx, toon, pxTop, mate } = s;
  const c = s.mateC(), core = s.golemC(), e = { x: c.x + 76, y: c.y - 14 };
  fx.letterbox(true); fx.darken(0.75, 500);
  fx.title("ECLIPSE LANCE", "NOVA · ultimate");
  const settle = castPose(mate, { lift: 0.12, energy: 3.4, ms: 500 });
  sound.sfx("voidCharge"); sound.sfx("laserCharge", { ms: 1100 });
  fx.focus(1.12, { x: e.x + 40, y: e.y }, 700);
  let open = 0, heat = 0, beam = 0, beamW = 0;
  pxTop.add({ dur: 2600, draw(g, k, t) {   // the rune ring round the eclipse
    if (open <= 0) return;
    g.save(); g.translate(e.x, e.y); g.scale(0.34, 1);
    g.strokeStyle = VIOLET; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 70 * open, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + t * 0.003; g.save(); g.rotate(a); g.fillStyle = i % 2 ? PALE : "#a066f0"; g.fillRect(74 * open, -6, 12, i % 3 ? 12 : 5); g.restore(); }
    g.restore();
  } });
  toon.add({ dur: 2600, draw(pen, k, t) {
    if (open > 0) {   // the eclipse: a black disc with a burning corona
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 + t * 0.002, rr = 22 * open + Math.sin(t * 0.02 + i * 2.3) * 3; pen.puff("heat", e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr, 6 + heat * 4, 0.55 + heat * 0.55); }
      pen.puff("void", e.x, e.y, 26 * open, 1.3);
    }
    if (beam > 0) {   // the lance: black light with a white-hot core
      const x1 = lerp(e.x, fx.w + 60, beam), wob = Math.sin(t * 0.09) * 2;
      pen.limb("void", [[e.x, e.y], [(e.x + x1) / 2, e.y + wob], [x1, e.y]], 46 * beamW, 26 * beamW, 1.2);
      pen.limb("heat", [[e.x, e.y], [x1, e.y]], 9 * beamW, 6 * beamW, 1.25);
      for (let i = 0; i < 10; i++) { const x = lerp(e.x, x1, ((i + t * 0.004) % 10) / 10); pen.puff("void", x, e.y + Math.sin(i * 3 + t * 0.03) * 24 * beamW, 8, 0.5 * beamW); }
    }
  } });
  await pxTop.add({ dur: 420, draw(g, k) { open = ease.back(k); } });
  gatherMotes(pxTop, e, 800, { n: 30, r: 170 });
  fx.slowmo(0.6, 700);
  await toon.add({ dur: 800, draw(pen, k) { heat = k; } });
  // FIRE
  sound.sfx("laserBeam", { ms: 700 });
  fx.hitstop(90); fx.flash(0.55, "#ffffff"); fx.shake(18); fx.punch(0.04, e);
  flashAt(pxTop, e, 110, 320);
  fx.focus(1.04, { x: (e.x + core.x) / 2, y: core.y }, 260);
  beamW = 1;
  await toon.add({ dur: 120, draw(pen, k) { beam = ease.out(k); } });
  sound.sfx("explosion", { size: 1.4 });
  fx.hitstop(200); fx.shake(30); fx.punch(0.07, core); fx.flash(0.4, "#e8d4ff");
  explode(toon, core.x - 6, core.y, { size: 1.5, kind: "void", dur: 1300 });
  shards(pxTop, core, 24, 1.5);
  s.golem.to({ lean: 0.2, tilt: 0.12 }, 140, "out");
  s.onHit(1);
  await fx.wait(320);
  fx.shake(20); fx.hitstop(80); sound.sfx("explosion", { size: 0.9 });
  explode(toon, core.x + 70, core.y - 10, { size: 1, kind: "void", dur: 1000 });
  s.onHit(2);
  await toon.add({ dur: 260, draw(pen, k) { beamW = 1 - ease.in(k); } });
  beam = 0;
  await pxTop.add({ dur: 300, draw(g, k) { open = 1 - ease.in(k); } });
  fx.letterbox(false); fx.darken(0, 500); fx.focus(1, null, 500);
  s.golem.rest(500);
  settle();
  await fx.wait(400);
  mate.setMood("idle");
}

// ---- Event Horizon (ultimate II) ----
// A black hole opens above him, its burning disc spinning. Debris spirals in
// and he's dragged up off the floor, crushed, until it collapses into a
// star-flash and drops him.
async function eventHorizon(s) {
  const { fx, px, toon, pxTop, mate, foeEl } = s;
  const core = s.golemC(), bh = { x: core.x - 20, y: Math.max(64, core.y - 160) };
  fx.letterbox(true); fx.darken(0.85, 600);
  fx.title("EVENT HORIZON", "NOVA · ultimate II");
  const settle = castPose(mate, { lift: 0.14, energy: 3.2, ms: 600 });
  sound.sfx("blackhole"); sound.sfx("voidCharge");
  fx.focus(1.06, { x: bh.x, y: (bh.y + core.y) / 2 }, 800);
  let size = 0, collapse = 0;
  const scale = () => size * (1 - collapse);
  toon.add({ dur: 4200, draw(pen, k, t) {
    const sc = scale(); if (sc <= 0) return;
    for (let i = 0; i < 34; i++) {   // the accretion disc, tilted, burning
      const a = (i / 34) * Math.PI * 2 + t * 0.004, rx = 96 * sc, ry = 20 * sc;
      pen.puff("heat", bh.x + Math.cos(a) * rx, bh.y + Math.sin(a) * ry, (8 + 3 * Math.sin(i * 1.7 + t * 0.01)) * sc, 0.75 + 0.3 * Math.sin(a));
    }
    pen.puff("void", bh.x, bh.y, 34 * sc, 1.35);
    pen.puff("void", bh.x, bh.y, 70 * sc, 0.3);
  } });
  pxTop.add({ dur: 4200, draw(g, k, t) {   // the photon ring bending over the top
    const sc = scale(); if (sc <= 0) return;
    g.strokeStyle = "#ffb040"; g.lineWidth = 4 * sc; g.beginPath(); g.ellipse(bh.x, bh.y - 2, 30 * sc, 26 * sc, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.strokeStyle = "#fff3c4"; g.lineWidth = 1.6 * sc; g.stroke();
  } });
  const rocks = Array.from({ length: 34 }, (_, i) => ({ a: rand(0, Math.PI * 2), r: rand(160, 320), s: rand(3, 7), delay: rand(0, 1800), sp: rand(0.8, 1.4) }));
  px.add({ dur: 3800, draw(g, k, t) {   // debris spiralling in
    for (const r of rocks) {
      const u = clamp01((t - r.delay) / (900 / r.sp)); if (u <= 0 || u >= 1) continue;
      const d = r.r * (1 - ease.in(u)), a = r.a + u * 4;
      g.fillStyle = r.s > 5 ? "#5d6270" : "#8c92a0"; const sz = r.s * (1 - u * 0.7);
      g.fillRect(bh.x + Math.cos(a) * d - sz / 2, bh.y + Math.sin(a) * d * 0.5 - sz / 2, sz, sz);
    }
  } });
  await toon.add({ dur: 700, draw(pen, k) { size = ease.back(k); } });
  // he's dragged up off the floor, crushed
  const home = foeEl._pos || { x: 0, y: 0, r: 0 };
  s.golem.to({ thrust: 2, flare: 1.2, tilt: 0.18, lean: -0.08 }, 600, "io");
  fx.move(foeEl, { x: home.x - 10, y: home.y - 64 }, 1200, "inOut");
  for (let i = 0; i < 4; i++) {
    await fx.wait(300);
    fx.hitstop(40); fx.shake(10 + i * 3); sound.sfx("hit", { size: 0.6 });
    s.golem.fxv.glitch = 0.6; s.golem.to({ glitch: 0 }, 200, "lin", s.golem.fxv);
    if (i === 0) s.onHit(1);
  }
  // it collapses into a point, and blows
  fx.slowmo(0.4, 360);
  sound.sfx("laserCharge", { ms: 300 });
  await toon.add({ dur: 260, draw(pen, k) { collapse = ease.in(k); } });
  sound.sfx("explosion", { size: 1.6 }); sound.sfx("roar");
  fx.hitstop(240); fx.shake(36); fx.punch(0.08, bh); fx.flash(0.7, "#ffffff");
  flashAt(pxTop, bh, 170, 420); shards(pxTop, bh, 30, 2);
  explode(toon, bh.x, bh.y, { size: 1.6, kind: "void", dur: 1300 });
  // and drops him
  await fx.move(foeEl, { x: home.x, y: home.y + 10 }, 170, "in");
  fx.shake(24); fx.hitstop(90); sound.sfx("impact", { size: 1.2 });
  fx.crack(core.x, { width: 260, color: "#a066f0" }); fx.dust(core.x, 16, 1.5); fx.debris({ x: core.x, y: fx.floorY }, 12, { power: 1.4 });
  s.onHit(2);
  fx.move(foeEl, { x: home.x, y: home.y }, 300, "out");
  s.golem.rest(600);
  await fx.wait(400);
  fx.letterbox(false); fx.darken(0, 600); fx.focus(1, null, 600);
  settle();
  await fx.wait(400);
  mate.setMood("idle");
}

// ---- the cards ----
export const NOVA_KIT = [
  { id: "shadowBolt", name: "Shadow Bolt", tier: "basic", run: shadowBolt,
    desc: "A quick bolt of shadow that bursts on the boss.",
    art(pen, w, h) { pen.limb("void", [[10, 50], [30, 38], [50, 28]], 4, 12, 0.9); pen.puff("void", 56, 24, 13, 1.2); pen.puff("void", 56, 24, 24, 0.35); } },
  { id: "wraithFlock", name: "Wraith Flock", tier: "light", run: wraithFlock,
    desc: "Screaming wraiths pour out of her cloak and rip through the boss one after another.",
    art(pen, w, h) { for (let i = 0; i < 3; i++) { const y = 16 + i * 15, pts = []; for (let j = 0; j <= 8; j++) pts.push([62 - j * 6, y + Math.sin(j * 0.9 + i) * 4 + j * 0.8]); pen.limb("void", pts, 10, 1, 1.05); pen.puff("void", 62, y, 7, 1.15); } } },
  { id: "voidOrb", name: "Void Orb", tier: "medium", run: voidOrb,
    desc: "She hurls a swirling orb of void that grinds into the boss as a vortex, then implodes.",
    art(pen, w, h) { for (let a = 0; a < 4; a++) { const pts = []; for (let j = 0; j <= 10; j++) { const u = j / 10, ang = a * Math.PI / 2 + u * 3, r = 28 - u * 18; pts.push([40 + Math.cos(ang) * r, 30 + Math.sin(ang) * r * 0.8]); } pen.limb("void", pts, 5, 2, 0.9); } pen.puff("void", 40, 30, 13, 1.2); } },
  { id: "spectralChains", name: "Spectral Chains", tier: "medium", run: spectralChains,
    desc: "Glowing chains burst from a rune circle, lash round the boss, and she slams it into the floor.",
    art(pen, w, h) { for (const [x0, y0, x1, y1] of [[8, 54, 52, 12], [72, 54, 30, 12]]) for (let i = 0; i <= 6; i++) pen.puff("void", lerp(x0, x1, i / 6), lerp(y0, y1, i / 6), 6, 1.2, 0.85); pen.oval("void", 40, 56, 34, 6, 0.9); } },
  { id: "grasp", name: "Grasp of the Void", tier: "heavy", run: graspOfTheVoid,
    desc: "Tears a portal open under the boss. Shadow hands seize it and drag it into the void before it tears free.",
    art(pen, w, h) { pen.oval("void", 40, 56, 30, 6, 1.1); voidArm(pen, [40, 58], [40, 24], 6, 9, 1, 0, 1); voidHand(pen, [40, 24], -Math.PI / 2, 26, 0.15, 0, 1, 1, 1); } },
  { id: "eclipseLance", name: "Eclipse Lance", tier: "ultimate", run: eclipseLance,
    desc: "The screen goes dark. An eclipse forms in front of her and fires a lance of black light straight through the boss.",
    art(pen, w, h) { for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; pen.puff("heat", 22 + Math.cos(a) * 13, 30 + Math.sin(a) * 13, 5, 0.95); } pen.puff("void", 22, 30, 14, 1.3); pen.limb("void", [[24, 30], [80, 30]], 16, 10, 1.15); pen.limb("heat", [[24, 30], [80, 30]], 3, 2, 1.2); } },
  { id: "eventHorizon", name: "Event Horizon", tier: "ultimate2", run: eventHorizon,
    desc: "A black hole opens above the boss, drags it up off the floor, crushes it, and collapses into a blinding flash.",
    art(pen, w, h) { for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; pen.puff("heat", 40 + Math.cos(a) * 30, 32 + Math.sin(a) * 7, 5, 0.75 + 0.35 * Math.sin(a)); } pen.puff("void", 40, 30, 14, 1.35); pen.puff("void", 40, 30, 26, 0.3); } },
];
