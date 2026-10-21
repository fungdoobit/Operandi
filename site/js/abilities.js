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

// Grasp of the Void: a rune circle opens under GOLEM and shadow hands burst out
// of it, seize him and crush.
async function graspOfTheVoid(s) {
  const { fx, px, mate } = s;
  const core = s.golemC(), floor = fx.floorY, R = Math.min(150, fx.w * 0.12);
  const cx = core.x - 10, cy = floor + 6;
  mate.setMood("angry");
  // 1. wind-up: dark motes stream into her while the scene dims
  sound.sfx("voidCharge");
  fx.darken(0.5, 500);
  fx.focus(1.06, { x: (s.mateC().x + core.x) / 2, y: floor - 70 }, 650);
  mate.anim(450, (e) => { mate.nova.lift = 0.08 * e; }, "out");
  px.add({ dur: 650, draw(g, k) {
    const c = s.mateC();
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39 + k * 3, r = (1 - ease.in(k)) * 110 + 8;
      g.fillStyle = i % 3 ? "#a066f0" : "#f3e6ff";
      g.fillRect(c.x + Math.cos(a) * r - 2, c.y + Math.sin(a) * r * 0.8 - 2, 4, 4);
    }
    glow(g, c.x, c.y, 34 * k, "#7838d0", 0.6 * k);
  } });
  await fx.wait(500);
  // 2. the rune circle draws itself on the floor, then the void tears open inside it
  const runes = px.add({ dur: 2700, z: -1, draw(g, k, t) {
    const grow = ease.out(clamp01(t / 380)), fade = t > 2300 ? 1 - (t - 2300) / 400 : 1;
    g.globalAlpha = fade;
    glow(g, cx, cy - 30, R * 1.3, "#5a24a8", 0.35 * grow);
    g.lineWidth = 4; g.strokeStyle = "#a066f0";
    g.beginPath(); g.ellipse(cx, cy, R * grow, R * 0.22 * grow, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.strokeStyle = "#cba2ff";
    g.beginPath(); g.ellipse(cx, cy, R * 0.72 * grow, R * 0.16 * grow, 0, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 18; i++) {   // glyphs turning between the rings
      const a = (i / 18) * Math.PI * 2 + t * 0.0012, x = cx + Math.cos(a) * R * 0.86 * grow, y = cy + Math.sin(a) * R * 0.19 * grow;
      g.fillStyle = "#f3e6ff"; g.fillRect(x - 2, y - 4, 4, i % 3 ? 4 : 8);
    }
    const open = ease.out(clamp01((t - 450) / 260)) * (t > 2000 ? 1 - ease.in(clamp01((t - 2000) / 300)) : 1);
    if (open > 0) {
      g.fillStyle = "#05020a"; g.beginPath(); g.ellipse(cx, cy, R * 0.62 * open, R * 0.14 * open, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.strokeStyle = "#7838d0"; g.stroke();
    }
  } });
  await fx.wait(450);
  sound.sfx("voidTear"); fx.shake(7); fx.hitstop(50);
  await fx.wait(200);
  // 3. the hands: a dozen shadow arms shoot up, claw at him, close and crush
  sound.sfx("handsBurst"); fx.shake(12); fx.punch(0.02, core);
  const hands = Array.from({ length: 12 }, (_, i) => ({
    bx: cx + rand(-0.55, 0.55) * R, by: cy + rand(-0.06, 0.06) * R,
    tx: core.x + rand(-80, 80), ty: core.y + rand(-60, 70),
    bend: rand(-50, 50), delay: i * 30 + rand(0, 40), w: rand(18, 26), flip: Math.random() < 0.5 ? -1 : 1,
  }));
  px.add({ dur: 1650, draw(g, k, t) {
    for (const h of hands) {
      const reach = ease.out(clamp01((t - h.delay) / 230));
      if (reach <= 0) continue;
      const grip = clamp01((t - 520) / 120), drag = clamp01((t - 1050) / 450);
      // tip: up to its target, squeezed toward his core on the crush, dragged down at the end
      let x = lerp(h.bx, h.tx, reach), y = lerp(h.by, h.ty, reach);
      x = lerp(x, core.x, grip * 0.35); y = lerp(y, core.y, grip * 0.35) + drag * 90;
      const wob = Math.sin(t * 0.02 + h.bend) * 4 * (1 - grip);
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, mx = (h.bx + x) / 2 + h.bend * (1 - grip * 0.5), my = (h.by + y) / 2;
        pts.push([(1 - u) ** 2 * h.bx + 2 * (1 - u) * u * mx + u * u * x + wob * u, (1 - u) ** 2 * h.by + 2 * (1 - u) * u * my + u * u * y]);
      }
      const fade = 1 - drag;
      g.globalAlpha = fade;
      ribbon(g, pts, h.w + 5, 13, "#7838d0");        // purple rim
      ribbon(g, pts, h.w, 9, "#0b0614");             // the shadow arm
      // the hand: a palm and four claws, splayed while reaching, curled when gripping
      const dir = Math.atan2(y - pts[6][1], x - pts[6][0]);
      g.fillStyle = "#0b0614"; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill();
      for (let f = 0; f < 4; f++) {
        const a = dir + (f - 1.5) * (0.42 - grip * 0.25) * h.flip, len = 22 - grip * 10;
        const fx2 = x + Math.cos(a) * len, fy2 = y + Math.sin(a) * len;
        const cx2 = fx2 + Math.cos(a + 1.6 * h.flip) * grip * 9, cy2 = fy2 + Math.sin(a + 1.6 * h.flip) * grip * 9;
        ribbon(g, [[x, y], [fx2, fy2], [cx2, cy2]], 7, 1, "#0b0614");
        g.fillStyle = "#f3e6ff"; g.fillRect(cx2 - 1.5, cy2 - 1.5, 3, 3);   // claw tips
      }
      g.globalAlpha = 1;
      if (drag > 0) for (let m = 0; m < 3; m++) { g.fillStyle = "#a066f0"; g.fillRect(x + rand(-14, 14), y + rand(-20, 10) - drag * 30, 3, 3); }
    }
  } });
  await fx.wait(560);
  // 4. the crush: freeze, shake, punch, a star-flash in the squeeze
  sound.sfx("voidCrush");
  fx.hitstop(170); fx.shake(24); fx.punch(0.06, core); fx.flash(0.3, "#8a4dff");
  s.onHit(1);
  px.add({ dur: 340, z: 5, draw(g, k) { const f = k < 0.2 ? k / 0.2 : (1 - k) / 0.8; starFlash(g, core.x, core.y, 90 * f); glow(g, core.x, core.y, 70 * f, "#cba2ff", 0.6); } });
  await fx.wait(260);
  fx.hitstop(90); fx.shake(16); fx.punch(0.03, core);
  s.onHit(2);
  s.golem.to({ bob: -0.14, lean: 0.08 }, 260, "out");
  await fx.wait(520);
  fx.darken(0, 500); fx.focus(1, null, 500);
  mate.anim(400, (e) => { mate.nova.lift = 0.08 * (1 - e); }, "io");
  await runes;
  s.golem.rest(500);
  mate.setMood("idle");
}

export const NOVA_KIT = [
  { id: "grasp", name: "Grasp of the Void", tier: "heavy", run: graspOfTheVoid,
    desc: "A rune circle tears open under the boss and shadow hands burst out, seize it and crush." },
];

// ---------------------------------------------------------------- PYRO ----

// Flame Sword: he forges a blade of fire, dashes in, cuts through GOLEM and
// back-slashes, leaving him burning.
async function flameSword(s) {
  const { fx, px, mate: dot, mateEl } = s;
  const home = mateEl._pos || { x: 0, y: 0, r: 0 };
  const core = s.golemC();
  dot.clearTimers?.(); dot.setMood("fierce");
  // 1. ignite: crouch while a blade of fire grows from him
  sound.sfx("flameIgnite");
  dot.sx.t = 1.25; dot.sy.t = 0.78; dot.lean.t = -0.15; dot.energy = 1.3;
  fx.focus(1.05, s.mateC(), 450);
  let blade = 0, swing = 0;
  const bladeActor = px.add({ dur: 1500, z: 2, draw(g, k, t) {
    if (blade <= 0) return;
    const c = s.mateC();
    const base = [c.x + 18, c.y + 4], len = 105 * blade, ang = -1.0 + swing;
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, a = ang + u * 0.35;
      pts.push([base[0] + Math.cos(a) * len * u + Math.sin(t * 0.05 + u * 9) * 3 * u, base[1] + Math.sin(a) * len * u]);
    }
    glow(g, pts[6][0], pts[6][1], 60 * blade, "#ff7a2f", 0.45);
    ribbon(g, pts, 26, 4, "#c8321b"); ribbon(g, pts, 18, 3, "#ff7a2f"); ribbon(g, pts, 9, 1, "#ffd28a"); ribbon(g, pts, 3, 0.5, "#fff3c4");
    for (let i = 0; i < 4; i++) { const p = pts[2 + i * 2]; g.fillStyle = i % 2 ? "#ffd28a" : "#ff9a3c"; g.fillRect(p[0] + rand(-6, 6), p[1] - rand(4, 18), 3, 3); }
  } });
  await px.add({ dur: 420, draw(g, k) { blade = ease.out(k); } });
  fx.hitstop(40);
  // 2. dash: a streak of fire and afterimages behind him
  sound.sfx("whoosh", { theme: "fire" });
  const start = s.mateC(), dist = core.x - start.x - 95;
  dot.sx.s = 0.8; dot.sy.s = 1.2; dot.lean.t = 0.25;
  px.add({ dur: 420, draw(g, k) {
    const c = s.mateC(), f = 1 - k;
    ribbon(g, [[start.x - 10, start.y + 6], [(start.x + c.x) / 2, c.y + 2], [c.x - 10, c.y]], 4 * f, 26 * f, "#ff7a2f");
    ribbon(g, [[start.x, start.y + 6], [c.x - 14, c.y]], 2 * f, 10 * f, "#fff3c4");
    for (let i = 1; i <= 3; i++) { const x = lerp(start.x, c.x, i / 4); g.globalAlpha = 0.35 * f; g.fillStyle = "#ff9a3c"; g.beginPath(); g.ellipse(x, c.y, 22, 18, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  } });
  await fx.move(mateEl, { x: home.x + dist }, 150, "in");
  // 3. the cut: a huge crescent through him, white-hot at its core
  const arc = (dirn) => px.add({ dur: 300, z: 4, draw(g, k) {
    const sweep = ease.out(clamp01(k / 0.55)), fade = 1 - clamp01((k - 0.45) / 0.55);
    const r = 120, a0 = dirn > 0 ? -2.3 : 1.0, a1 = dirn > 0 ? 0.9 : -2.2;
    const pts = [];
    for (let i = 0; i <= 16; i++) { const a = lerp(a0, lerp(a0, a1, sweep), i / 16); pts.push([core.x - 20 + Math.cos(a) * r, core.y + Math.sin(a) * r * 0.55]); }
    g.globalAlpha = fade;
    ribbon(g, pts, 2, 40, "#c8321b"); ribbon(g, pts, 1, 26, "#ff7a2f"); ribbon(g, pts, 0.5, 13, "#ffd28a"); ribbon(g, pts, 0, 5, "#ffffff");
    g.globalAlpha = 1;
  } });
  swing = 1.6; blade = 0;
  arc(1);
  sound.sfx("slash", { theme: "fire" });
  await fx.wait(70);
  fx.hitstop(140); fx.shake(18); fx.punch(0.05, core); fx.flash(0.26, "#ff9a3c");
  s.onHit(1);
  fx.explosion(core, { size: 0.7 }); fx.sparks(core, 14, { power: 1.3, dir: 1 });
  dot.sx.s = 1.3; dot.sy.s = 0.78;
  await fx.wait(200);
  // 4. back-slash, crossing the first
  arc(-1);
  sound.sfx("slash", { theme: "fire" });
  await fx.wait(70);
  fx.hitstop(100); fx.shake(14); fx.punch(0.035, core);
  s.onHit(2);
  fx.sparks(core, 10, { power: 1.1, dir: 1 });
  // 5. afterburn on GOLEM while PYRO hops home
  px.add({ dur: 900, draw(g, k, t) {
    for (let i = 0; i < 7; i++) {
      const x = core.x - 70 + i * 24, h = (18 + 14 * Math.sin(t * 0.02 + i)) * (1 - k), y = core.y + 30 - (i % 3) * 22;
      ribbon(g, [[x, y], [x + Math.sin(t * 0.03 + i) * 4, y - h * 0.6], [x + 2, y - h]], 12 * (1 - k), 0, i % 2 ? "#ff7a2f" : "#ffd28a");
    }
  } });
  dot.jump.v = -5;
  await fx.move(mateEl, { x: home.x }, 420, "inOut");
  dot.lean.t = 0; dot.setMood("idle");
  await bladeActor;
}

export const PYRO_KIT = [
  { id: "flameSword", name: "Flame Sword", tier: "medium", run: flameSword,
    desc: "Forges a blade of fire, dashes in and cuts the boss twice, leaving it burning." },
];

// Run one of a teammate's abilities. Until the ability cards arrive
// (Addendum J) the first one in the kit is used.
export function kitFor(skin) { return skin === "nova" ? NOVA_KIT : skin === "pyro" ? PYRO_KIT : null; }
