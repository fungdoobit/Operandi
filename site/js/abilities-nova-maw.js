// NOVA's spells on THE ABYSSAL MAW (Module 2's boss). Her spells stay exactly the same; only the parts where they were built
// round GOLEM's body change to how the Maw takes them (Isaac 2026-10-25: "i dont want to change any abilities, just need to
// adjust the interactions"):
//   Grasp of the Void: the hands drag him down into the portal; he slams his free arms onto the ground round it, claws in and
//     pushes himself back up and out (GOLEM's core blazed and he ripped free).
//   Spectral Chains: the chains seize the cat and coil round his arms; his free arms grab the chains and rip them apart (GOLEM
//     cut them with drones).
//   Planetfall's Jupiter: his arms catch it, wrap round it and stuff it into his mouth (GOLEM held it up with his thrusters).
// On a finishing blow (s.lethal) the Maw is beaten inside the spell, so the shared code skips his usual ending (s.died()):
// he is always left as Mittens, just a cat, asleep.
// The stage's fx space is the battle world, so a cell of the Maw is CELL stage px.
import { ease, lerp, glow, starFlash } from "./pixel/pixel-fx.js";
import { sound } from "./sound.js";
import { impactFrame, speedLines, bigHit } from "./cine.js";
import { spl, CELL } from "./pixel/maw-px.js";
import { drawPortal, voidArm, voidHand, voidOoze, flashAt, shards, drawPlanet, novaFury, portal, castPose, gatherMotes, chainPath, drawLinks, drawCoil } from "./abilities-nova.js";
import { stamp } from "./pixel/props-px.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const rand = (a, b) => a + Math.random() * (b - a);
const ROSE = "#f59a90", PINK = "#ffd6c8";

// Points on him in stage px: on the cat (dx cells along, up cells above the floor) and along one of his arms (t 0 root .. 1 tip).
function body(g) {
  const at = (dx, up) => ({ x: (g.cat.x + g.pose.hx + dx) * CELL, y: (g.floorC + g.pose.hy + g.pose.sink - up) * CELL });
  const arm = (i, t) => { const r = g.armPts(i), [x, y] = spl(Array.isArray(r) ? r : r.pts, t); return { x: x * CELL, y: y * CELL }; };
  return { at, arm };
}

// His arms in a spell: each one can be planted (up and over, its tip clawed into the ground at `spot`) and dragged (a hand holds
// it at `hold` and hauls it down into the portal, between lo and hi). All in cells; the numbers are tweened by the scene.
function armRig(g, { lo, hi, surface }) {
  const st = {}, ground = g.floorC - 1;
  const ov = (i) => (base) => {
    const a = st[i], n = base.length, M = g.mouthCells();
    let pts = base;
    if (a.go > 0) {
      const S = a.spot, j = a.j, sg = a.sgn;
      const top = [lerp(M[0], S, 0.55), Math.min(M[1], ground) - 30 - 7 * j];
      const P = [M, [lerp(M[0], top[0], 0.4), M[1] - 18 - 4 * j], top, [S - sg * 4, ground - 22], [S - sg, ground - 6], [S + sg, ground + 4 + 10 * a.dig]];
      pts = pts.map((b, k) => { const f = k / (n - 1), q = spl(P, f), w = smooth(a.go * 1.5 - 0.5 * f); return [lerp(b[0], q[0], w), lerp(b[1], q[1], w)]; });
    }
    if (a.drag > 0) {
      const H = spl(pts, a.hold), T = [clamp(H[0], lo, hi), surface + 3 + 34 * a.deep];
      const dx = (T[0] - H[0]) * a.drag, dy = (T[1] - H[1]) * a.drag;
      pts = pts.map((p, k) => { const f = k / (n - 1), w = f >= a.hold ? 1 : smooth(f / a.hold); return [p[0] + dx * w, p[1] + dy * w]; });
    }
    return pts;
  };
  return {
    st,
    set(i, o = {}) { st[i] = { go: 0, dig: 0, drag: 0, deep: 0, hold: 0.45, spot: 0, sgn: 1, j: 0, ...o }; g.override[i] = ov(i); },
    plant(i, spot, sgn, j) { Object.assign(st[i], { spot, sgn, j }); g.clipOv[i] = ground; },
    clear() { for (const i in st) { delete g.override[i]; delete g.clipOv[i]; } },
  };
}

// ---- Grasp of the Void ------------------------------------------------------------------------------------------------
// She tears the portal open under him; the hands seize the cat and his low arms and drag him down, three heaves. Then he
// fights it: four of his arms slam down on the ground round the portal, claw in, and he pushes himself up and out, tearing the
// hands off; the portal snaps shut. Finishing blow: more hands rip his arms off the ground and the void takes the Maw; the
// portal spits Mittens back out, asleep.
export async function graspMaw(s) {
  const { fx, px, pxBack, pxTop, mate, golem: g, toon, boss } = s;
  const B = body(g), floor = fx.floorY, R = Math.min(170, fx.w * 0.13);
  const cx = Math.min(fx.w - R * 0.7, (g.cat.x - 2) * CELL), cy = floor + 4;
  const catC = () => B.at(-3, 20);
  let open = 0, closing = 0;
  const cracks = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rand(-0.2, 0.2), pts = [[Math.cos(a) * R * 1.1, Math.sin(a) * R * 0.27]];
    for (let k = 0; k < 7; k++) { const [x, y] = pts[pts.length - 1]; pts.push([x + Math.cos(a) * rand(10, 22) + rand(-6, 6), y + Math.sin(a) * rand(2, 5) + rand(-2, 2)]); }
    return { pts };
  });
  mate.setMood("angry");
  // 1. wind-up: the scene dims and dark power streams into her
  sound.sfx("voidCharge"); sound.sfx("ghostWind", { ms: 5000 });
  fx.darken(0.55, 600);
  fx.focus(1.06, { x: (s.mateC().x + cx) / 2, y: floor - 80 }, 700);
  mate.anim(500, (e) => { mate.nova.lift = 0.1 * e; }, "out");
  px.add({ dur: 700, draw(gg, k) {
    const c = s.mateC();
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39 + k * 4, r = (1 - ease.in(k)) * 130 + 8;
      gg.fillStyle = i % 3 ? "#a066f0" : "#f3e6ff"; gg.fillRect(c.x + Math.cos(a) * r - 2, c.y + Math.sin(a) * r * 0.8 - 2, 4, 4);
    }
    glow(gg, c.x, c.y, 40 * k, "#7838d0", 0.6 * k);
  } });
  await fx.wait(560);
  // 2. the portal rips open on the floor under him
  sound.sfx("voidTear"); fx.shake(9); fx.hitstop(60);
  let live = true;
  const draw = (back) => (gg, k, t, a) => { if (!live) { a.t = a.dur; return; } drawPortal(gg, cx, cy, R, open * (1 - closing), t, back, cracks); };
  pxBack.add({ dur: 60000, draw: draw(true) });
  px.add({ dur: 60000, z: 1, draw: draw(false) });
  await px.add({ dur: 380, draw(gg, k) { open = ease.back(k); } });
  fx.shake(6);
  g.cut = g.floorC;   // from now on whatever of him sinks below the portal's surface is gone
  const rig = armRig(g, { lo: (cx - R * 0.85) / CELL, hi: (cx + R * 0.85) / CELL, surface: g.floorC });
  const HELD = [3, 5, 7], PLANT = [[4, -1, 1.3], [1, -1, 1.62], [6, 1, 1.25], [2, 1, 1.55]];   // arm, side, distance out in R
  for (let i = 0; i < 8; i++) rig.set(i);
  try {
    await fx.wait(180);
    // 3. the hands erupt: some go for the cat, the rest for his low arms; a few just claw at the air
    sound.sfx("handsBurst"); sound.sfx("whispers", { ms: 3200 }); sound.sfx("ghostWail");
    fx.shake(16); fx.punch(0.03, catC()); fx.debris({ x: cx, y: cy }, 10, { power: 1.2 }); impactFrame(fx, { ms: 50 });
    const targets = [() => B.at(-10, 22), () => B.arm(3, 0.45), () => B.at(-1, 33), () => B.arm(5, 0.45), () => B.arm(7, 0.6), () => B.at(9, 12)];
    const hand = (tgt, i, n, extra = {}) => ({
      tgt, base: [cx + (i / (n - 1) - 0.5) * R * 1.1 + rand(-8, 8), cy + rand(-0.04, 0.08) * R],
      bend: rand(12, 26) * (Math.random() < 0.5 ? -1 : 1), delay: i * 55 + rand(0, 50), w: rand(9, 10.5), size: rand(40, 46), seed: i, flip: Math.random() < 0.5 ? -1 : 1, last: null, ...extra,
    });
    const hands = targets.map((tgt, i) => hand(tgt, i, targets.length));
    const writhers = Array.from({ length: 4 }, (_, i) => ({ base: [cx + (i < 2 ? -1 : 1) * rand(0.45, 0.85) * R, cy + rand(0, 0.1) * R], h: rand(36, 60), seed: 20 + i, flip: i % 2 ? 1 : -1, delay: rand(0, 200) }));
    let grip = 0, shatter = 0, pull = 0, tNow = 0, handsOn = true;
    toon.add({ dur: 60000, draw(pen, k, t, a) {
      if (!handsOn) { a.t = a.dur; return; }
      tNow = t;
      const amt = 1 - shatter;
      voidOoze(pen, cx, cy, R * 0.6, Math.min(1, t / 3200) * 3.2, t, amt);   // (a smaller pool than GOLEM's: the cat is small)
      for (const w of writhers) {
        const rise = ease.out(clamp((t - w.delay) / 300));
        if (rise <= 0) continue;
        const sway = Math.sin(t * 0.006 + w.seed) * 18, wrist = [w.base[0] + sway, w.base[1] - w.h * rise];
        voidArm(pen, w.base, wrist, 8 * w.flip, 8, amt, t, w.seed);
        voidHand(pen, wrist, -Math.PI / 2 + sway * 0.01, 34, 0.2 + 0.3 * Math.sin(t * 0.01 + w.seed), t, w.seed, w.flip, amt);
      }
      for (const h of hands) {
        const reach = ease.out(clamp((t - h.delay) / 260));
        if (reach <= 0) continue;
        const tg = h.tgt(), up = [h.base[0], h.base[1] - 44], lunge = clamp((reach - 0.35) / 0.65);
        let wrist = reach < 0.35 ? [h.base[0], lerp(h.base[1], up[1], reach / 0.35)] : [lerp(up[0], tg.x, lunge), lerp(up[1], tg.y, lunge)];
        if (shatter > 0) wrist = [wrist[0] + Math.sin(t * 0.3 + h.seed) * 3, wrist[1] + shatter * 40];
        h.last = wrist;
        // while they haul him down each arm comes straight up out of the portal under what it holds
        let base = h.base, bend = h.bend * (1 - grip * 0.4);
        const pl = h.late ? 1 : pull;
        if (pl > 0) { base = [lerp(h.base[0], clamp(wrist[0], cx - R * 0.9, cx + R * 0.9), pl), lerp(h.base[1], cy + 10, pl)]; bend *= 1 - pl; }
        const pts = voidArm(pen, base, wrist, bend, h.w, amt, t, h.seed);
        const lp = pts[pts.length - 2], dir = Math.atan2(wrist[1] - lp[1], wrist[0] - lp[0]);
        voidHand(pen, wrist, dir, h.size, Math.max(grip * 0.8, lunge > 0.95 ? 0.3 : 0), t, h.seed, h.flip, amt);
      }
    } });
    const burst = () => {   // the hands bursting into shards where they held him
      px.add({ dur: 420, draw(gg, k) { shatter = ease.out(k); } });
      for (const h of hands) if (h.last) shards(pxTop, { x: h.last[0], y: h.last[1] }, 6, 0.8);
    };
    await fx.wait(620);
    // 4. they seize him: freeze, negative frame, shake, slow motion
    grip = 1;
    sound.sfx("voidCrush");
    bigHit(fx, catC(), { stop: 180, shake: 26, punch: 0.06, flash: "#8a4dff" });
    speedLines(pxTop, catC(), 420);
    fx.slowmo(0.4, 500);
    fx.focus(1.12, { x: cx, y: floor - 70 }, 500);
    s.onHit(1);
    g.to({ writhe: 1.5, tense: 1 }, 160, "out");
    g.fxv.glitch = 0.6;
    // 5. the pull: three heaves down into the portal; the arms the hands hold go under first
    sound.sfx("telekinesis");
    px.add({ dur: 240, draw(gg, k) { pull = ease.out(k); } });
    for (let i = 0; i < 3; i++) {
      for (const a of HELD) g.to({ drag: [0.45, 0.75, 1][i] }, 300, "in", rig.st[a]);
      await g.to({ sink: [6, 11, 16][i], hx: rand(-1.5, 1.5) }, 300, "in");
      fx.shake(14 + i * 5); fx.hitstop(70); fx.punch(0.03, catC()); sound.sfx("impact", { size: 0.7 }); fx.dust(cx, 6, 1);
      g.fxv.glitch = 0.5 + i * 0.2; g.to({ glitch: 0.2 }, 160, "lin", g.fxv);
      if (i === 1) s.onHit(2);
      await fx.wait(160);
    }
    // 6. he fights it: four free arms slam down on the ground round the portal and claw in
    fx.darken(0.25, 200);
    sound.sfx("roar"); g.to({ writhe: 1.2, tense: 1, hx: 0 }, 200, "out");
    const edge = fx.w / CELL - 6;
    PLANT.forEach(([i, sg, d], j) => rig.plant(i, clamp((cx + sg * R * d) / CELL, 6, edge - (sg > 0 ? (1 - j % 2) * 10 : 0)), sg, j % 2));
    await Promise.all(PLANT.map(([i], j) => fx.wait(j * 90).then(async () => {
      sound.sfx("whoosh", { size: 0.6 });
      await g.to({ go: 1 }, 300, "in", rig.st[i]);
      const at = { x: rig.st[i].spot * CELL, y: floor };
      sound.sfx("slamImpact", { size: 0.6 }); sound.sfx("debris");
      fx.shake(12); fx.hitstop(40); fx.dust(at.x, 8, 1.2); fx.debris(at, 5, { power: 0.8 });
      fx.ring(at, { color: ROSE, size: 80, flat: 0.25, ms: 400, width: 4 });
      g.to({ dig: 1 }, 220, "out", rig.st[i]);
    })));
    // ...and strains: he hauls himself up inch by inch, the ground cracking round his claws
    sound.sfx("growl", { size: 1 }); sound.sfx("rumble", { size: 0.8 });
    for (let k = 0; k < 6; k++) fx.wait(k * 110).then(() => { fx.shake(5 + k); g.fxv.glitch = 0.3; g.to({ glitch: 0 }, 90, "lin", g.fxv); for (const [i] of PLANT) if (k % 2) fx.dust(rig.st[i].spot * CELL, 2, 0.5); });
    if (s.lethal) {
      await g.to({ sink: 11 }, 660, "io");
      // the finishing blow: more hands burst up and tear his arms off the ground...
      sound.sfx("handsBurst"); sound.sfx("ghostWail");
      PLANT.forEach(([i], j) => hands.push(hand(() => B.arm(i, 0.5), j, PLANT.length, { delay: tNow + j * 60, late: true, seed: 40 + j })));
      await fx.wait(330);
      bigHit(fx, catC(), { stop: 140, shake: 22, punch: 0.05, flash: "#8a4dff" });
      g.fxv.glitch = 1.4;
      PLANT.forEach(([i]) => { const a = rig.st[i]; delete g.clipOv[i]; fx.dust(a.spot * CELL, 6, 1); g.to({ dig: 0 }, 100, "out", a).then(() => g.to({ go: 0 }, 500, "io", a)); g.to({ drag: 1 }, 600, "in", a); });
      sound.sfx("roar");
      fx.slowmo(0.5, 900);
      await fx.wait(450);
      // ...and the void takes the Maw: every arm and the cat, all the way under
      sound.sfx("voidCrush"); sound.sfx("telekinesis");
      for (let i = 0; i < 8; i++) g.to({ drag: 1, deep: 1.5 }, 1100, "in", rig.st[i]);
      await g.to({ sink: 84 }, 1100, "in");
      fx.shake(18); fx.hitstop(90); impactFrame(fx, { ms: 60 });
      s.onHit(2);
      s.died();
      burst();
      await fx.wait(500);
      // a beat, then the portal spits Mittens back out: only a cat now, fast asleep
      rig.clear();
      if (boss.dome.childElementCount) boss.dome.childElementCount = 0;
      Object.assign(g.pose, { tent: 0, mouth: 0, writhe: 0, shield: 0, tense: 0, sink: 30 });
      g.fxv.glitch = 0;
      g.setCat("sleep");
      sound.sfx("squelch"); fx.shake(10);
      toon.add({ dur: 700, draw(pen, k) { for (let i = 0; i < 9; i++) { const a = i * 0.7 - 0.2, u = ease.out(k); pen.puff("void", cx + Math.cos(a) * 60 * u - 20, cy - Math.sin(u * Math.PI) * (26 + (i % 3) * 10), 7, 1.1 * (1 - k)); } } });
      await g.to({ sink: 0 }, 460, "back");
      fx.dust(catC().x, 8, 1);
      await fx.wait(300);
    } else {
      await g.to({ sink: 12 }, 660, "io");
      // the heave: he pushes himself out and tears the hands off
      sound.sfx("roar"); sound.sfx("squelch");
      bigHit(fx, catC(), { stop: 150, shake: 32, punch: 0.07, flash: PINK });
      fx.ring({ x: cx, y: cy - 10 }, { color: ROSE, size: R * 2.2, flat: 0.3, ms: 500, width: 8 });
      fx.sparks(catC(), 16, { colors: [PINK, ROSE, "#ffffff"], power: 1.5 }); fx.debris({ x: cx, y: cy }, 14, { power: 1.6 });
      burst();
      mate.setMood("sad", { revertAfter: 1200 });
      for (const a of HELD) g.to({ drag: 0 }, 260, "out", rig.st[a]);
      g.fxv.glitch = 0;
      await g.to({ sink: -8 }, 280, "out");
      // the arms let go of the ground and he drops back onto his feet
      PLANT.forEach(([i], j) => fx.wait(40 + j * 50).then(() => { fx.dust(rig.st[i].spot * CELL, 5, 0.8); g.to({ dig: 0 }, 140, "in", rig.st[i]).then(() => g.to({ go: 0 }, 460, "io", rig.st[i])); }));
      await g.to({ sink: 0 }, 260, "in");
      fx.dust(catC().x, 10, 1.2); fx.shake(10); sound.sfx("impact", { size: 0.8 });
      g.to({ writhe: 0.55, tense: 0 }, 600, "io");
      await fx.wait(300);
    }
    // 7. the portal snaps shut: down to a slash of light, then a star-flash
    handsOn = false;
    sound.sfx("portalClose");
    await px.add({ dur: 380, draw(gg, k) { closing = ease.in(k); } });
    px.add({ dur: 340, z: 5, draw(gg, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; starFlash(gg, cx, cy - 6, 70 * f); glow(gg, cx, cy - 6, 60 * f, "#cba2ff", 0.6); } });
    fx.shake(8);
  } finally {
    live = false; rig.clear(); g.cut = Infinity;
  }
  fx.darken(0, 500); fx.focus(1, null, 500);
  mate.anim(400, (e) => { mate.nova.lift = 0.1 * (1 - e); }, "io");
  if (!s.lethal) g.rest(500);
  await fx.wait(400);
  mate.setMood(s.lethal ? "happy" : "idle");
}

// ---- Spectral Chains ----------------------------------------------------------------------------------------------------
// The portals above and below him and the chains are hers, as against GOLEM: four chains coil round four of his arms, four
// spear into the cat, and she hauls both ways, the chained arms dragged towards the portals. Then he fights back with the arms
// she didn't catch: they seize the chains one after another and rip them apart (the first in slow motion). Finishing blow:
// she hauls until he gives out; his arms go limp and he curls up asleep.
const CHAINED = { top: [6, 1], bot: [3, 5] }, FREE = [4, 2, 0, 7];

export async function chainsMaw(s, S) {
  const { fx, px, pxTop, spr, sprBack, mate, golem: g, boss } = s;
  const B = body(g), core = s.golemC(), floor = fx.floorY, cx = core.x - 10;
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
  // 2. chains whip out: four coil round his arms, four spear into the cat
  const tg = [
    ["top", 6], ["top", null, [-8, 40]], ["top", null, [6, 30]], ["top", 1],
    ["bot", 3], ["bot", null, [-12, 18]], ["bot", null, [8, 10]], ["bot", 5],
  ];
  const HOLD = 0.5;
  const chains = tg.map(([side, arm, at], i) => ({ side, arm, at, ext: 0, wrap: 0, cut: 0, gone: 0, delay: [0, 120, 200, 60, 90, 170, 240, 30][i], seed: i * 1.3 }));
  const target = (ch) => (ch.arm != null ? B.arm(ch.arm, HOLD) : B.at(...ch.at));
  const axisOf = (ch) => { const a = B.arm(ch.arm, HOLD - 0.04), b = B.arm(ch.arm, HOLD + 0.04); return Math.atan2(b.y - a.y, b.x - a.x); };
  const anchor = (ch) => { const P = ch.side === "top" ? top.P : bot.P, t = target(ch); return { x: Math.max(P.x - P.rx * 0.75, Math.min(P.x + P.rx * 0.75, t.x)), y: P.y }; };
  let taut = 0, pulses = 0;
  // the chained arms are dragged towards their portals while she hauls (and spring back when the chain goes)
  const drag = {};
  for (const ch of chains) if (ch.arm != null) {
    const d = drag[ch.arm] = { k: 0 }, i = ch.arm;
    g.override[i] = (base) => {
      if (d.k <= 0.001) return base;
      const P = ch.side === "top" ? top.P : bot.P, H = spl(base, HOLD), T = [P.x / CELL, P.y / CELL], n = base.length;
      const dx = (T[0] - H[0]) * 0.3 * d.k, dy = (T[1] - H[1]) * 0.3 * d.k;
      return base.map((p, k) => { const f = k / (n - 1), w = f >= HOLD ? 1 : smooth(f / HOLD); return [p[0] + dx * w, p[1] + dy * w]; });
    };
  }
  const drawAll = (gF, gB, t) => {
    for (const ch of chains) {
      if (ch.ext <= 0 || ch.gone >= 1) continue;
      const A = anchor(ch), T = target(ch);
      if (ch.cut > 0) {   // ripped: the portal end whips back in, the far end falls away
        const back = ease.in(ch.cut);
        drawLinks(gF, S, chainPath(A, T, 0.5 * (1 - back), t, { whip: 1, seed: ch.seed }));
        if (ch.arm != null && ch.cut < 0.6) drawCoil(gF, gB, S, T, axisOf(ch), 1 - ch.cut / 0.6, t);
        continue;
      }
      const pts = chainPath(A, T, ch.ext, t, { whip: ch.wrap ? 0 : 1 - ch.ext * 0.5, taut, seed: ch.seed });
      drawLinks(gF, S, pts);
      if (ch.ext < 1) { const h = pts[pts.length - 1]; stamp(gF, S.shard[0], h.x, h.y, h.ang, 1.2); }
      else if (ch.arm != null) drawCoil(gF, gB, S, T, axisOf(ch), ch.wrap, t);
      else stamp(gF, S.shard[0], T.x, T.y, Math.atan2(T.y - A.y, T.x - A.x), 1.2);   // speared into him
    }
  };
  const allGone = () => chains.every((c) => c.gone >= 1);
  spr.add({ dur: 60000, draw(gg, k, t, a) { if (allGone()) { a.t = a.dur; return; } drawAll(gg, { drawImage() {} }, t); } });
  sprBack.add({ dur: 60000, draw(gg, k, t, a) { if (allGone()) { a.t = a.dur; return; } drawAll({ drawImage() {} }, gg, t); } });
  pxTop.add({ dur: 60000, draw(gg, k, t, a) {   // energy pulses running up the chains
    if (allGone()) { a.t = a.dur; return; }
    if (pulses > 0) for (const ch of chains) {
      if (ch.cut > 0 || ch.ext < 1) continue;
      const A = anchor(ch), T = target(ch);
      for (let j = 0; j < 3; j++) { const u = ((t * 0.0016 + j / 3 + ch.seed) % 1); glow(gg, lerp(T.x, A.x, u), lerp(T.y, A.y, u), 12, "#cba2ff", 0.9 * pulses); }
    }
  } });
  sound.sfx("whoosh", { theme: "void" }); sound.sfx("ghostFly");
  fx.focus(1.1, { x: cx, y: core.y }, 400);
  try {
    await Promise.all(chains.map((ch) => fx.wait(ch.delay).then(async () => {
      sound.sfx("chainRattle", { size: 0.7 });
      await spr.add({ dur: 230, draw(gg, k) { ch.ext = ease.out(k); } });
      fx.hitstop(35); fx.shake(9); fx.punch(0.015, target(ch)); shards(pxTop, target(ch), 6, 0.5);
      sound.sfx(ch.arm != null ? "chainRattle" : "hit", { size: 0.8 });
      await spr.add({ dur: 170, draw(gg, k) { ch.wrap = ease.back(k); } });
    })));
    sound.sfx("voidCrush");
    bigHit(fx, core, { stop: 130, shake: 20, punch: 0.04, flash: "#8a4dff", invert: false });
    g.fxv.glitch = 0.6; g.to({ glitch: 0 }, 300, "lin", g.fxv);
    g.to({ writhe: 1.4, tense: 1 }, 200, "out");
    s.onHit(1);
    // 3. she hauls both ways: his arms are dragged towards the portals
    mate.nova.idle.shake = 0.6; pulses = 1;
    sound.sfx("whispers", { ms: 2200 }); sound.sfx("roar");
    await spr.add({ dur: 200, draw(gg, k) { taut = ease.out(k); } });
    fx.focus(1.1, { x: core.x, y: core.y - 10 }, 900); fx.slowmo(0.5, 1200);
    for (let i = 0; i < 4; i++) {
      for (const a in drag) g.to({ k: 0.45 + i * 0.18 }, 110, "io", drag[a]);
      g.to({ hx: i % 2 ? 2 : -2, hy: i % 2 ? -1 : 1 }, 110, "io");
      g.fxv.glitch = 0.9; g.to({ glitch: 0.25 }, 180, "lin", g.fxv);
      fx.shake(12 + i * 5); fx.hitstop(50); sound.sfx("chainRattle", { size: 1 }); sound.sfx("impact", { size: 0.5 });
      await fx.wait(210);
    }
    bigHit(fx, core, { stop: 180, shake: 30, punch: 0.06, flash: "#e8d4ff" });
    speedLines(pxTop, core, 420);
    shards(pxTop, core, 22, 1.3);
    s.onHit(2);
    if (s.lethal) {
      // 4b. the finishing blow: she hauls until he gives out
      sound.sfx("ghostWail"); sound.sfx("voidCrush");
      fx.slowmo(0.45, 1600);
      for (const a in drag) g.to({ k: 1.3 }, 300, "out", drag[a]);
      for (let i = 0; i < 5; i++) {
        const p = { x: core.x + rand(-70, 50), y: core.y + rand(-60, 50) };
        g.fxv.glitch = 1 + i * 0.3; g.hurt({ crit: i === 4 });
        shards(pxTop, p, 12, 1.1); fx.sparks(p, 8, { colors: [PINK, "#cba2ff", "#ffffff"], power: 1.2 });
        fx.shake(12 + i * 3); fx.hitstop(40); sound.sfx("chainRattle", { size: 1 }); sound.sfx("hit", { size: 0.8 });
        await fx.wait(190);
      }
      sound.sfx("chainSnap"); sound.sfx("slamImpact");
      impactFrame(fx, { ms: 80 });
      bigHit(fx, core, { stop: 220, shake: 36, punch: 0.07, flash: "#e8d4ff" });
      fx.ring(core, { color: "#a066f0", size: 380, flat: 0.5, ms: 700, width: 10 });
      s.died();
      for (const ch of chains) spr.add({ dur: 300, draw(gg, k) { ch.cut = ease.out(k); } }).then(() => { ch.gone = 1; });
      for (const a in drag) g.to({ k: 0 }, 500, "io", drag[a]);
      taut = 0; pulses = 0; mate.nova.idle.shake = 0;
      // he gives out: the arms go limp and sink into his mouth, and Mittens curls up asleep
      if (boss.dome.childElementCount) boss.dome.childElementCount = 0;
      g.fxv.glitch = 0; g.to({ writhe: 0, tense: 0, shield: 0, hx: 0, hy: 0 }, 300, "out");
      g.to({ tent: 0 }, 1300, "io");
      fx.wait(900).then(() => g.to({ mouth: 0 }, 400, "io"));
      await fx.wait(700);
      await Promise.all([top.close(), bot.close()]);
      await fx.wait(500);
      g.setCat("sleep"); fx.dust(B.at(0, 0).x, 6, 0.8);
      fx.letterbox(false); fx.darken(0, 600); fx.focus(1, null, 600);
      settle();
      await fx.wait(500);
      mate.setMood("happy");
      return;
    }
    // 4. he fights back: the arms she didn't catch go for the chains and rip them apart, one after another
    sound.sfx("growl", { size: 1 });
    const cutOrder = [0, 4, 3, 7, 1, 5, 2, 6];
    const grip = FREE.map(() => ({ go: 0, yank: 0, at: null }));
    FREE.forEach((i, j) => {
      g.override[i] = (base) => {
        const a = grip[j]; if (a.go <= 0 || !a.at) return base;
        const M = g.mouthCells(), T = [a.at.x / CELL, a.at.y / CELL], n = base.length;
        const away = [T[0] - M[0], T[1] - M[1]], L = Math.hypot(...away) || 1, nx = -away[1] / L, ny = away[0] / L;
        const Y = [T[0] + (M[0] - T[0]) * 0.45 * a.yank + nx * 20 * a.yank, T[1] + (M[1] - T[1]) * 0.45 * a.yank + ny * 20 * a.yank];   // yanked back and aside
        const P = [M, [lerp(M[0], Y[0], 0.35) + nx * 12, lerp(M[1], Y[1], 0.35) + ny * 12 - 8], [lerp(M[0], Y[0], 0.75) + nx * 4, lerp(M[1], Y[1], 0.75) - 6], Y, [Y[0] + nx * 3, Y[1] + 4]];
        return Array.from({ length: n }, (_, k) => { const f = k / (n - 1), q = spl(P, f), w = smooth(a.go * 1.5 - 0.5 * f), b = base[k]; return [lerp(b[0], q[0], w), lerp(b[1], q[1], w)]; });
      };
    });
    const rip = async (n, slow) => {
      const ch = chains[cutOrder[n]], j = n % FREE.length, a = grip[j], A = anchor(ch), T = target(ch);
      a.at = { x: lerp(A.x, T.x, 0.55), y: lerp(A.y, T.y, 0.55) };
      if (slow) { fx.slowmo(0.3, 900); fx.focus(1.12, a.at, 250); }
      sound.sfx("whoosh", { size: 0.5 });
      await g.to({ go: 1, yank: 0 }, slow ? 260 : 130, "out", a);   // it shoots out and seizes the chain
      sound.sfx("squelch"); fx.hitstop(slow ? 90 : 30); fx.shake(slow ? 10 : 6);
      await fx.wait(slow ? 140 : 30);
      await g.to({ yank: 1 }, slow ? 140 : 80, "in", a);   // ...and rips it
      sound.sfx("chainSnap");
      if (slow) { impactFrame(fx, { ms: 60 }); fx.hitstop(120); fx.shake(18); } else { fx.hitstop(30); fx.shake(9); }
      flashAt(pxTop, a.at, slow ? 40 : 24, 220);
      fx.sparks(a.at, slow ? 14 : 6, { colors: ["#ffffff", "#cba2ff", PINK], power: 1.1 });
      const bits = Array.from({ length: slow ? 6 : 3 }, (_, k) => ({ x: a.at.x, y: a.at.y, vx: rand(-160, 160), vy: rand(-220, -60), r: rand(0, 6), vr: rand(-12, 12), v: k % 2 }));
      spr.add({ dur: 800, draw(gg, k) { for (const b of bits) stamp(gg, S.link[b.v], b.x + b.vx * k, b.y + b.vy * k + 420 * k * k, b.r + b.vr * k, 1, Math.PI); } });
      spr.add({ dur: 300, draw(gg, k) { ch.cut = ease.out(k); } }).then(() => { ch.gone = 1; });
      if (ch.arm != null) g.to({ k: 0 }, 420, "back", drag[ch.arm]);   // the arm it held springs free
      g.to({ go: 0 }, 360, "io", a);
      if (slow) fx.focus(1.06, { x: core.x, y: core.y }, 300);
    };
    await rip(0, true);
    mate.setMood("sad");
    taut = 0.6;
    for (let n = 1; n < 8; n++) { await rip(n, false); await fx.wait(60); }
    // 5. free: he roars, the portals collapse
    taut = 0; pulses = 0; mate.nova.idle.shake = 0;
    sound.sfx("roar");
    fx.shake(22); fx.flash(0.3, PINK); fx.ring(core, { color: ROSE, size: 260, flat: 0.6, ms: 500, width: 8 });
    g.to({ writhe: 1.8, tense: 1 }, 220, "out");
    await fx.wait(300);
    await Promise.all([top.close(), bot.close()]);
  } finally {
    for (let i = 0; i < 8; i++) delete g.override[i];
  }
  g.rest(500);
  fx.letterbox(false); fx.darken(0, 500); fx.focus(1, null, 500);
  settle();
  await fx.wait(300);
  mate.setMood("idle");
}

// ---- Planetfall: Jupiter --------------------------------------------------------------------------------------------
// He shrugs off the three planets. NOVA, furious, tears the huge portal open (novaFury, as against GOLEM) and Jupiter comes
// down out of it. Six of his arms shoot up, catch it and wrap round it; it's her beam against his arms for a moment, then he
// hauls it down, her beam snaps, and he stuffs the whole planet into his mouth. GULP. A couple of thumps inside him, then a
// burp of fire and smoke, and his arms pour back out. Finishing blow: it's too much even for him; he glows, shudders, burps a
// great blast of fire and keels over asleep.
const WRAP = [3, 5, 4, 1, 6, 2];   // left to right along the bottom of the planet
const GRIP = [[150, 202], [128, 228], [108, 252], [80, -76], [62, -50], [42, -24]];   // each arm: where it meets the planet underneath, and where it hooks over the rim (degrees, y down; the left three go up the left side, the right three up the right)

export async function jupiterMaw(s, { jf, R, big, settle }) {
  const { fx, pxTop, spr, sprBack, pxBack, toon, mate, golem: g } = s;
  const floor = fx.floorY, M0 = s.golemC();
  fx.focus(1, null, 500);
  // he shakes the planets off and roars, his arms thrashing
  sound.sfx("roar"); g.fxv.glitch = 0.6; g.to({ glitch: 0 }, 400, "lin", g.fxv);
  await g.to({ writhe: 1.9, tense: 1 }, 300, "out");
  fx.shake(10); fx.ring(M0, { color: ROSE, size: 200, ms: 450, width: 5 });
  await g.to({ writhe: 0.8, tense: 0 }, 500, "io");
  const fury = await novaFury(s, big, R), { gate } = fury;
  // he looks up at it, his arms rising, ready
  await fx.wait(600);
  sound.sfx("growl", { size: 1 });
  g.to({ writhe: 1.3, hy: -2 }, 600, "io");
  await fury.opening;
  fx.title("JUPITER", "");
  await fury.strain;
  // it comes down out of the portal...
  const hold = { x: M0.x - 10, y: Math.max(R * 0.75, M0.y - R - 40) };
  const J = { x: hold.x, y: big.y - R };
  let jLive = true, jScale = 1, jSpin = 2.5, front = false;
  const planet = (layer, isFront) => layer.add({ dur: 60000, draw(gg, k, t, a) { if (!jLive) { a.t = a.dur; return; } if (front === isFront) drawPlanet(gg, jf, J, t, { clipY: big.y, spin: jSpin, scale: jScale }); } });
  planet(sprBack, false); planet(spr, true);
  pxBack.add({ dur: 60000, draw(gg, k, t, a) { if (!jLive) { a.t = a.dur; return; } glow(gg, J.x, Math.max(J.y, big.y + 40), R * 1.4 * jScale, "#ff9a4a", 0.2); } });
  fury.aim(() => ({ x: J.x, y: Math.max(big.y + 16, J.y - R * 0.55 * jScale) }));   // her beam rides down with it, driving it on
  sound.sfx("ghostFly", { size: 1.4 });
  for (let i = 0; i < 6; i++) fx.wait(i * 200).then(() => { fx.shake(6 + i * 2); sound.sfx("rumble", { size: 0.6 }); });
  // ...and his arms shoot up and wrap round it: each one under it, up across its face and hooked over the rim
  const st = WRAP.map(() => ({ go: 0 }));
  WRAP.forEach((i, j) => {
    g.override[i] = (base) => {
      const a = st[j]; if (a.go <= 0) return base;
      const M = g.mouthCells(), c = [J.x / CELL, J.y / CELL], r = (R * jScale) / CELL, n = base.length;
      const [lo, hi] = GRIP[j].map((d) => (d * Math.PI) / 180), mid = (lo + hi) / 2;
      const on = (ang, k) => [c[0] + Math.cos(ang) * r * k, c[1] + Math.sin(ang) * r * k];
      const low = on(lo, 1.02), Q = [lerp(M[0], low[0], 0.5) + (j - 2.5) * 3, lerp(M[1], low[1], 0.55) + 4];
      const P = [M, Q, low, on(mid, 0.74), on(hi, 0.98), on(hi + 0.12 * (j < 3 ? -1 : 1), 1.06)];
      return Array.from({ length: n }, (_, k) => { const f = k / (n - 1), q = spl(P, f), w = smooth(a.go * 1.6 - 0.6 * f), b = base[k]; return [lerp(b[0], q[0], w), lerp(b[1], q[1], w)]; });
    };
  });
  const y0 = J.y;
  const catching = spr.add({ dur: 1200, draw(gg, k) { J.y = lerp(y0, hold.y, ease.in(k)); } });
  await fx.wait(650);
  sound.sfx("whoosh"); sound.sfx("roar");
  WRAP.forEach((i, j) => fx.wait(j * 50).then(() => g.to({ go: 1 }, 520 - j * 30, "out", st[j])));
  await catching;
  // the catch
  sound.sfx("explosion", { size: 1.6 }); sound.sfx("slamImpact"); sound.sfx("squelch");
  fx.darken(0.55, 500);
  bigHit(fx, { x: J.x, y: J.y + R * 0.8 }, { stop: 260, shake: 38, punch: 0.07, flash: "#ffd9a3" });
  speedLines(pxTop, { x: J.x, y: J.y + R * 0.8 }, 500, { inner: R });
  fx.ring({ x: M0.x, y: floor }, { color: "#ffd9a3", size: 400, flat: 0.12, ms: 700, width: 9 });
  fx.dust(M0.x, 24, 2.6); fx.debris({ x: M0.x, y: floor - 10 }, 14, { power: 1.4 });
  g.to({ sink: 4, hy: 0 }, 160, "out");   // the weight drives him down a little
  fx.slowmo(0.55, 1200);
  // the struggle: her beam bearing down, his arms trembling round it
  let shake = 1;
  const tremble = spr.add({ dur: 60000, draw(gg, k, t, a) { if (shake <= 0) { a.t = a.dur; return; } J.x = hold.x + Math.sin(t * 0.09) * 2 * shake; J.y = hold.y + Math.sin(t * 0.13 + 1) * 1.5 * shake; } });
  for (let i = 0; i < 5; i++) {
    await fx.wait(240);
    sound.sfx("impact", { size: 0.5 }); fx.shake(9 + i * 2); fx.hitstop(40);
    const p = WRAP[i % WRAP.length], at = body(g).arm(p, 0.6);
    fx.sparks(at, 5, { colors: ["#fff3c4", "#ffb040", PINK], power: 0.9 });
    g.fxv.glitch = 0.3; g.to({ glitch: 0 }, 140, "lin", g.fxv);
  }
  // he hauls it down to his mouth: her beam snaps and the whole planet goes in
  shake = 0; void tremble;
  sound.sfx("growl", { size: 1.2 }); sound.sfx("ghostWind", { ms: 1200 });
  const jx = J.x, jy = J.y, mouth = () => s.golemC();
  fx.focus(1.12, { x: M0.x, y: M0.y - 40 }, 900);
  fx.wait(300).then(() => fury.snap());
  g.to({ sink: 0 }, 400, "io");
  await spr.add({ dur: 1100, draw(gg, k) {
    const e = ease.in(k), m = mouth();
    J.x = lerp(jx, m.x, e); J.y = lerp(jy, m.y, e);
    jScale = 1 - 0.95 * e; jSpin = 2.5 + 10 * e;
    if (!front && jScale < 0.45) front = true;   // small now, in front of his arms, into his mouth
    g.pose.tent = 1 - smooth((k - 0.55) / 0.45);
  } });
  // GULP
  jLive = false;
  WRAP.forEach((i) => delete g.override[i]);
  g.pose.tent = 0;
  sound.sfx("bite"); sound.sfx("squelch"); sound.sfx("slamImpact", { size: 0.7 });
  g.to({ mouth: 0 }, 140, "in");
  fx.hitstop(120); fx.shake(20); fx.punch(0.04, mouth()); fx.flash(0.25, "#ffd9a3");
  fx.ring(mouth(), { color: "#ffd9a3", size: 160, ms: 380, width: 5 });
  s.onHit(1);
  await fx.wait(450);
  // it rumbles inside him
  const thumps = s.lethal ? 4 : 2;
  for (let i = 0; i < thumps; i++) {
    sound.sfx("hit", { size: 0.6 + i * 0.1 }); fx.shake(8 + i * 3);
    g.to({ hx: i % 2 ? -2 : 2, hy: -1 }, 70, "out").then(() => g.to({ hx: 0, hy: 0 }, 220, "back"));
    if (s.lethal) { g.fxv.flash = 0.35 + i * 0.15; g.to({ flash: 0 }, 260, "lin", g.fxv); }
    await fx.wait(s.lethal ? 300 : 360);
  }
  // the burp: fire and smoke out of his mouth
  g.to({ mouth: 1 }, 120, "out");
  await fx.wait(120);
  const m = mouth(), big2 = s.lethal ? 1.6 : 1;
  sound.sfx("explosion", { size: 0.9 * big2 }); sound.sfx("growl", { size: 0.8 });
  fx.shake(16 * big2); fx.flash(0.3, "#ffd9a3");
  toon.add({ dur: 1500, draw(pen, k) {   // a gust of fire out of his mouth, rolling off into thin smoke rings
    for (let i = 0; i < 7; i++) {
      const u = clamp(k * 1.3 - i * 0.05), sp = i / 6 - 0.5, x = m.x - u * (60 + (i % 3) * 18) * big2, y = m.y - u * (20 + sp * 46) * big2 - u * u * 26;
      if (u <= 0 || u >= 1) continue;
      if (u < 0.5) pen.puff("heat", x, y, (8 + i * 1.6) * big2 * (1 + u), 0.95 - u * 1.9);
      pen.puff("smoke", x + 4, y - 4, (10 + (i % 3) * 3) * big2 * (1 + u * 1.6), Math.min(0.75, u * 2.5) * (1 - u), 0.25 + u * 0.6);
    }
  } });
  fx.ring(m, { color: "#ffb040", size: 220 * big2, ms: 500, width: 6 });
  s.onHit(2);
  if (s.lethal) {
    // too much, even for him: he sways, and keels over asleep
    s.died();
    await fx.wait(700);
    sound.sfx("squelch");
    g.to({ mouth: 0, writhe: 0 }, 400, "io");
    await fx.wait(500);
    g.setCat("sleep");
    fx.dust(s.golemC().x, 8, 1);
    await fx.wait(400);
  } else {
    // ...and his arms pour back out of his mouth
    await fx.wait(500);
    sound.sfx("squelch");
    await g.to({ tent: 1 }, 1200, "lin");
  }
  // the portal, empty, slams shut
  await gate.close(280);
  fx.shake(14); flashAt(pxTop, big, 120, 360);
  g.rest(700);
  await fx.wait(500);
  fx.darken(0, 600); fx.focus(1, null, 600);
  mate.nova.idle.shake = 0; mate.nova.m = fury.m0;
  settle();
  await fx.wait(500);
  mate.setMood(s.lethal ? "happy" : "idle");
}
