// The small enemies' attacks (PRD Addendum K), in the same language as GOLEM's:
// a readable wind-up, a fast strike, hit-stop and shake on contact, recovery.
// One scene per attack type; an enemy's spec (enemies.js) picks the type and
// its look (projectile, slash shape, colour). The model animates itself from
// its pose numbers: wind (the wind-up), atk (the strike), open, walk.
import { teammateHurt } from "../battle-moves.js";
import { sound } from "../sound.js";
import { ease, lerp, glow, starFlash, ribbon } from "./pixel-fx.js";
import { explode } from "./toon-fx.js";
import { speedLines, bigHit } from "../cine.js";

const rand = (a, b) => a + Math.random() * (b - a);
const last = new WeakMap();

// ctx: the battle's scene context (fx, px, pxTop, toon, dot, mateEl, golem = the model, foeEl).
export async function enemyAttack(ctx, enemy, { onHit } = {}) {
  const list = enemy.attacks, prev = last.get(enemy);
  const options = list.length > 1 ? list.filter((a) => a !== prev) : list;
  const spec = options[Math.floor(Math.random() * options.length)];
  last.set(enemy, spec);
  const { fx, dot, golem } = ctx;
  let hurtDone = false;
  const s = {
    ...ctx, g: golem, spec, color: spec.color || "#ffffff",
    P: (name) => fx.fromPage(golem.point(name)),
    dotC: () => fx.at(dot.figure, { fy: 0.55 }),
    // the first hit on the teammate shows the damage; later ones only shake
    hurt: (opts) => { if (hurtDone) { fx.shake(6); dot.hurt?.({}); return; } hurtDone = true; teammateHurt(ctx, opts); onHit?.(); },
  };
  await SCENES[spec.type](s);
  if (!hurtDone) s.hurt();
  fx.focus(1, null, 350);
  await golem.rest(450);
}

// ---- the scenes ----
const SCENES = {
  // Rush in and strike up close.
  async lunge(s) {
    const { fx, g, foeEl, spec } = s;
    const home = foeEl._pos || { x: 0, y: 0 };
    sound.sfx(spec.fx === "bite" ? "hiss" : "growl", { size: 0.7 });
    await g.to({ wind: 1, lean: 0.12, squash: 0.15 }, 320, "out");
    // the dash: close the gap to the teammate
    const gap = s.P("core").x - s.dotC().x - 70;
    sound.sfx("whoosh");
    g.to({ walk: g.pose.walk + 1 }, 200, "lin");
    await fx.move(foeEl, { x: home.x - gap }, 200, "in");
    g.to({ wind: 0, atk: 1, lean: -0.2, squash: 0 }, 90, "out");
    await fx.wait(60);
    strikeFx(s, spec.fx, s.dotC());
    s.hurt({});
    await fx.wait(260);
    g.to({ atk: 0, lean: 0 }, 300, "io");
    await fx.move(foeEl, home, 420, "inOut");
  },

  // Fire projectiles from the muzzle at the teammate.
  async shoot(s) {
    const { fx, g, spec, pxTop } = s;
    const n = spec.n || 1, proj = spec.proj;
    const charge = { bolt: 1, plasma: 1, fireball: 1 }[proj];
    await g.to({ wind: 1, open: 0.6 }, charge ? 420 : 300, "out");
    if (charge) {
      sound.sfx(proj === "plasma" ? "laserCharge" : "magic", { ms: 400 });
      await pxTop.add({ dur: 380, draw(gc, k) { const m = s.P("muzzle"); glow(gc, m.x, m.y, 10 + 22 * k, s.color, 0.8 * k); glow(gc, m.x, m.y, 5 + 8 * k, "#ffffff", k); } });
    }
    const shots = [];
    for (let i = 0; i < n; i++) {
      g.to({ atk: 1, wind: 0 }, 70, "out").then(() => g.to({ atk: 0.3, wind: 0.6 }, 120, "io"));
      const from = s.P("muzzle"), to = s.dotC();
      to.x += rand(-14, 14); to.y += rand(-16, 12);
      sound.sfx(SHOT_SOUND[proj] || "whoosh", { size: 0.8 });
      if (proj === "bullet" || proj === "plasma") fx.shake(3);
      shots.push(projectile(s, proj, from, to, i).then(() => { impactFx(s, proj, to); s.hurt({}); }));
      await fx.wait(n > 4 ? 90 : 170);
    }
    await Promise.all(shots);
    g.to({ atk: 0, wind: 0, open: 0 }, 250, "io");
    await fx.wait(200);
  },

  // Leap and smash the ground: a wave runs along the floor into the teammate.
  async slam(s) {
    const { fx, g, foeEl, spec, px } = s;
    sound.sfx("growl", { size: 1 });
    await g.to({ wind: 1, squash: 0.35 }, 260, "out");
    sound.sfx("whoosh");
    await g.to({ bob: 0.55, squash: -0.15, wind: 1 }, 260, "out");
    await g.to({ bob: 0, atk: 1, wind: 0, squash: 0.45 }, 120, "in");
    sound.sfx("slamImpact"); sound.sfx("rubble", { size: 0.8 });
    const at = { x: s.P("core").x, y: fx.floorY };
    fx.hitstop(90); fx.shake(20); fx.punch(0.03, at);
    fx.ring(at, { color: s.color, size: 240, flat: 0.15, ms: 450, width: 6 });
    fx.dust(at.x, 14, 1.6);
    if (s.toon) s.toon.add({ dur: 900, draw(pen, k) { for (let i = -3; i <= 3; i++) pen.puff("smoke", at.x + i * 22 * (0.6 + k), at.y - 8 - k * 20, 18 + 16 * k, (1 - k) * 1.1, Math.max(0, k - 0.4)); } });
    g.to({ squash: 0 }, 300, "back");
    // the wave of spikes, rocks or light rushing to the teammate
    const target = s.dotC(), x0 = at.x - 30, x1 = target.x, steps = 9, look = WAVES[spec.wave] || WAVES.rock;
    const spikes = Array.from({ length: steps }, (_, i) => ({ x: lerp(x0, x1, i / (steps - 1)) + rand(-6, 6), h: rand(26, 46) * (i === steps - 1 ? 1.5 : 1), w: rand(9, 15), lean: rand(-0.3, 0.3) }));
    let hit = false;
    await px.add({ dur: 900, draw(gc, k, t) {
      for (const [i, sp] of spikes.entries()) {
        const u = (t - i * 45) / 420; if (u <= 0) continue;
        const up = u < 0.25 ? ease.out(u / 0.25) : u < 0.7 ? 1 : Math.max(0, 1 - (u - 0.7) / 0.3);
        look(gc, sp, at.y, up, s.color);
        if (i === steps - 1 && u > 0.05 && !hit) { hit = true; s.hurt({}); fx.shake(14); sound.sfx("debris"); }
      }
    } });
  },

  // Charge across the arena and smash into the teammate with its whole body.
  async charge(s) {
    const { fx, g, foeEl, pxTop } = s;
    const home = foeEl._pos || { x: 0, y: 0 };
    sound.sfx("growl", { size: 1 });
    await g.to({ wind: 1, lean: 0.18, squash: 0.2 }, 380, "out");
    fx.dust(s.P("core").x + 20, 8, 1);
    const gap = s.P("core").x - s.dotC().x - 40;
    sound.sfx("whoosh");
    speedLines(pxTop, () => s.dotC(), 320, { inner: 90, n: 30 });
    g.to({ wind: 0, atk: 1, lean: -0.25, walk: g.pose.walk + 2 }, 280, "lin");
    await fx.move(foeEl, { x: home.x - gap }, 280, "in");
    sound.sfx("impact", { size: 1.1 });
    bigHit(fx, s.dotC(), { stop: 120, shake: 22, punch: 0.04, flash: "#ffffff", invert: false });
    fx.debris(s.dotC(), 8, { power: 1.2, dir: -1 });
    s.hurt({ crit: true });
    await fx.move(foeEl, { x: home.x - gap + 50 }, 160, "out");
    g.to({ atk: 0, lean: 0 }, 300, "io");
    await fx.move(foeEl, home, 520, "inOut");
  },

  // A beam from the muzzle that sweeps into the teammate.
  async beam(s) {
    const { fx, g, pxTop, px } = s;
    sound.sfx("laserCharge", { ms: 600 });
    g.to({ wind: 1, open: 1, flare: 1.5 }, 500, "out");
    fx.converge(s.P("muzzle"), { color: s.color, n: 20, ms: 500, radius: 120, glow: null });
    await pxTop.add({ dur: 520, draw(gc, k) { const m = s.P("muzzle"); glow(gc, m.x, m.y, 8 + 26 * k, s.color, 0.9 * k); glow(gc, m.x, m.y, 4 + 10 * k, "#ffffff", k); } });
    sound.sfx("laserBeam", { ms: 700 });
    g.to({ wind: 0, atk: 1 }, 80, "out");
    fx.shake(8);
    let hit = false;
    await px.add({ dur: 700, draw(gc, k, t) {
      const m = s.P("muzzle"), d = s.dotC(), sweep = Math.min(1, k * 3);
      const end = { x: lerp(m.x - 40, d.x, ease.out(sweep)), y: lerp(fx.floorY - 10, d.y, ease.out(sweep)) };
      const w = (k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1) * (14 + 3 * Math.sin(t * 0.08));
      ribbon(gc, [[m.x, m.y], [end.x, end.y]], w * 1.6, w * 1.3, s.color);
      ribbon(gc, [[m.x, m.y], [end.x, end.y]], w * 0.6, w * 0.5, "#ffffff");
      glow(gc, end.x, end.y, 26 + 6 * Math.sin(t * 0.1), s.color, 0.8);
      starFlash(gc, end.x, end.y, 10 + 4 * Math.sin(t * 0.13), "#ffffff");
      if (sweep >= 1 && !hit) { hit = true; s.hurt({}); fx.sparks(d, 14, { colors: ["#ffffff", s.color], power: 1.3, dir: -1 }); }
      if (hit && ((t / 70) | 0) % 2) fx.shake(5);
    } });
    g.to({ atk: 0, open: 0, flare: 0 }, 300, "io");
  },

  // Raise up and call projectiles down from the sky onto the teammate.
  async rain(s) {
    const { fx, g, spec } = s;
    sound.sfx(spec.proj === "fireball" ? "magic" : "growl", { size: 0.9 });
    await g.to({ wind: 1, open: 1, flare: 1 }, 420, "out");
    g.to({ atk: 1, wind: 0 }, 120, "out");
    const n = spec.n || 8, falls = [];
    for (let i = 0; i < n; i++) {
      const to = s.dotC(); to.x += rand(-40, 40); to.y += rand(-10, 20);
      const from = { x: to.x + rand(30, 90), y: -30 };
      falls.push(fx.wait(i * 80).then(() => { sound.sfx(SHOT_SOUND[spec.proj] || "whoosh", { size: 0.5 }); return projectile(s, spec.proj, from, to, i, { arc: 0, ms: 420 }); }).then(() => { impactFx(s, spec.proj, to); s.hurt({}); }));
    }
    await Promise.all(falls);
    g.to({ atk: 0, open: 0, flare: 0 }, 300, "io");
  },
};

const SHOT_SOUND = { arrow: "twang", bullet: "gunshot", plasma: "cannon", spore: "squelch", bolt: "magic", web: "squelch", potion: "whoosh", ice: "zap", slime: "squelch", leaf: "swoosh", venom: "hiss", shell: "cannon", fireball: "flameIgnite" };

// ---- projectiles: drawn on the pixel layer over the fighters ----
function projectile(s, kind, from, to, i, { arc, ms } = {}) {
  const { pxTop, toon } = s;
  const A = arc ?? ({ potion: 70, shell: 90, slime: 60, spore: 30, web: 30 }[kind] || 10);
  const D = ms ?? ({ arrow: 260, bullet: 140, plasma: 320, spore: 650, bolt: 360, web: 380, potion: 520, ice: 260, slime: 460, leaf: 600, venom: 300, shell: 600, fireball: 420 }[kind] || 300);
  const pos = (u) => ({ x: lerp(from.x, to.x, u) + (kind === "spore" || kind === "leaf" ? Math.sin(u * 9 + i) * 10 : 0), y: lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * A });
  const color = s.color, seed = i * 1.7;
  if ((kind === "fireball" || kind === "plasma") && toon) {   // a cel fire trail behind it
    const trail = [];
    toon.add({ dur: D + 300, draw(pen, k, t) {
      if (t < D) { const p = pos(t / D); trail.push({ ...p, t }); pen.puff("heat", p.x, p.y, kind === "plasma" ? 9 : 13, 1.2); }
      for (const q of trail) { const age = (t - q.t) / 220; if (age < 1) pen.puff("heat", q.x, q.y - age * 6, (kind === "plasma" ? 7 : 11) * (1 - age * 0.6), 1 - age); }
    } });
  }
  return pxTop.add({ dur: D, draw(g, k) {
    const p = pos(k), q = pos(Math.max(0, k - 0.04)), a = Math.atan2(p.y - q.y, p.x - q.x);
    g.save(); g.translate(p.x, p.y); g.rotate(a);
    switch (kind) {
      case "arrow": g.fillStyle = "#6e4e2c"; g.fillRect(-16, -1, 18, 2); g.fillStyle = "#d8dce4"; g.beginPath(); g.moveTo(6, 0); g.lineTo(0, -3); g.lineTo(0, 3); g.fill(); g.fillStyle = "#e8e0c8"; g.fillRect(-18, -3, 5, 2); g.fillRect(-18, 1, 5, 2); break;
      case "bullet": g.fillStyle = "#fff6c0"; g.fillRect(-3, -1.5, 6, 3); g.fillStyle = color; g.globalAlpha = 0.6; g.fillRect(-16, -1, 13, 2); break;
      case "plasma": glow(g, 0, 0, 16, color, 0.9); g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); g.fill(); break;
      case "bolt": glow(g, 0, 0, 14, color, 0.9); starFlash(g, 0, 0, 7 + 2 * Math.sin(k * 40), "#ffffff"); break;
      case "fireball": glow(g, 0, 0, 12, "#ffd27a", 0.8); break;
      case "spore": for (let j = 0; j < 5; j++) { const r = 2 + (j % 3); g.fillStyle = j % 2 ? color : "#e2ffa0"; g.globalAlpha = 0.85; g.fillRect(Math.cos(j * 2.4 + k * 6) * 7, Math.sin(j * 2.4 + k * 6) * 6, r, r); } break;
      case "venom": g.fillStyle = color; g.beginPath(); g.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ffffff"; g.fillRect(1, -2, 2, 2); break;
      case "web": g.strokeStyle = color; g.lineWidth = 1.5; for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(j * 1.05) * 9, Math.sin(j * 1.05) * 9); g.stroke(); } g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.stroke(); break;
      case "potion": g.rotate(k * 12 - a); g.fillStyle = color; g.beginPath(); g.arc(0, 2, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = "#d8d0e8"; g.fillRect(-2, -8, 4, 5); g.fillStyle = "#6e4e2c"; g.fillRect(-2, -10, 4, 2); g.fillStyle = "#ffffff"; g.fillRect(-3, 0, 2, 2); break;
      case "ice": g.fillStyle = "#e6f6ff"; g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -4); g.lineTo(-9, 0); g.lineTo(-6, 4); g.fill(); g.fillStyle = color; g.fillRect(-6, -1, 8, 2); break;
      case "slime": g.fillStyle = color; g.beginPath(); g.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#e8ffb0"; g.fillRect(-2, -3, 3, 2); break;
      case "leaf": g.rotate(k * 14 + seed); g.fillStyle = color; g.beginPath(); g.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#3a6a1a"; g.fillRect(-6, 0, 12, 1); break;
      case "shell": g.fillStyle = "#2a2a30"; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ff8a3a"; g.fillRect(-1, -7, 2, 3); break;
      default: glow(g, 0, 0, 10, color, 0.9);
    }
    g.restore();
  } });
}

function impactFx(s, kind, at) {
  const { fx, pxTop, toon } = s;
  const c = s.color;
  if (kind === "shell" || kind === "fireball" || kind === "plasma") { if (toon) explode(toon, at.x, at.y, { size: kind === "shell" ? 0.6 : 0.45, dur: 900 }); sound.sfx("explosion", { size: 0.6 }); fx.shake(10); return; }
  if (kind === "potion" || kind === "slime" || kind === "venom" || kind === "spore") {
    const drops = Array.from({ length: 12 }, () => ({ a: rand(-Math.PI, 0), v: rand(30, 90), r: rand(2, 5) }));
    pxTop.add({ dur: 500, draw(g, k) { for (const d of drops) { g.globalAlpha = 1 - k; g.fillStyle = c; g.fillRect(at.x + Math.cos(d.a) * d.v * k, at.y + Math.sin(d.a) * d.v * k + 80 * k * k, d.r, d.r); } g.globalAlpha = 1; } });
    if (kind === "potion") pxTop.add({ dur: 700, draw(g, k) { for (let j = 0; j < 6; j++) { const r = 4 + j % 3 * 2; g.globalAlpha = 0.8 * (1 - k); g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); g.arc(at.x - 20 + j * 8, at.y - k * 50 - j * 4, r, 0, Math.PI * 2); g.stroke(); } g.globalAlpha = 1; } });
    sound.sfx("squelch");
    return;
  }
  if (kind === "web") { pxTop.add({ dur: 900, draw(g, k) { g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; g.strokeStyle = "#f0f0f0"; g.lineWidth = 1; for (let j = 0; j < 8; j++) { g.beginPath(); g.moveTo(at.x, at.y); g.lineTo(at.x + Math.cos(j * 0.785) * 34, at.y + Math.sin(j * 0.785) * 30); g.stroke(); } for (let r = 10; r < 34; r += 8) { g.beginPath(); g.ellipse(at.x, at.y, r, r * 0.88, 0, 0, Math.PI * 2); g.stroke(); } g.globalAlpha = 1; } }); return; }
  fx.sparks(at, 6, { colors: ["#ffffff", c], power: 0.8, dir: -1 });
  pxTop.add({ dur: 160, draw(g, k) { starFlash(g, at.x, at.y, 12 * (1 - k), "#ffffff"); } });
}

// The close-up strike shapes.
function strikeFx(s, kind, at) {
  const { fx, pxTop } = s;
  const c = s.color;
  sound.sfx(kind === "bite" ? "bite" : kind === "bash" ? "impact" : "slash", { size: 0.9 });
  fx.hitstop(80); fx.shake(12); fx.punch(0.025, at);
  if (kind === "bite") {
    pxTop.add({ dur: 260, draw(g, k) {
      const close = ease.in(Math.min(1, k * 2)), gap = 26 * (1 - close);
      for (const sg of [-1, 1]) for (let j = -2; j <= 2; j++) { g.fillStyle = "#ffffff"; g.beginPath(); const x = at.x + j * 9, y = at.y + sg * (gap + 4); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.lineTo(x, y - sg * 12); g.fill(); }
    } });
  } else if (kind === "claw") {
    pxTop.add({ dur: 240, draw(g, k) { for (let j = -1; j <= 1; j++) { const pts = []; for (let q = 0; q <= 8; q++) { const u = q / 8; if (u > k * 1.6) break; pts.push([at.x + 30 - u * 60 + j * 12, at.y - 34 + u * 64]); } ribbon(g, pts, 2, 7, k > 0.6 ? c : "#ffffff"); } } });
  } else if (kind === "sting") {
    pxTop.add({ dur: 200, draw(g, k) { ribbon(g, [[at.x + 60, at.y - 4], [at.x - 10 * k, at.y]], 6 * (1 - k), 1, "#ffffff"); starFlash(g, at.x, at.y, 14 * (1 - k), c); } });
  } else if (kind === "bash") {
    fx.ring(at, { color: c, size: 90, ms: 260, width: 5 });
    pxTop.add({ dur: 180, draw(g, k) { starFlash(g, at.x, at.y, 22 * (1 - k), "#ffffff"); } });
  } else {   // slash: a crescent arc
    pxTop.add({ dur: 240, draw(g, k) {
      const pts = [], sweep = Math.min(1, k * 1.8);
      for (let q = 0; q <= 14; q++) { const u = q / 14; if (u > sweep) break; const ang = -2.2 + u * 2.4; pts.push([at.x + Math.cos(ang) * 46, at.y + 10 + Math.sin(ang) * 46]); }
      ribbon(g, pts, 1, 9 * (1 - k * 0.6), "#ffffff");
      if (pts.length > 2) ribbon(g, pts.slice(0, -1), 1, 4, c);
    } });
  }
  fx.sparks(at, 8, { colors: ["#ffffff", c], power: 1, dir: -1 });
}

// Ground waves for "slam": each draws one spike (sp: x, h, w, lean) rising by `up`.
const WAVES = {
  rock(g, sp, y, up) { g.fillStyle = "#5d6270"; g.beginPath(); g.moveTo(sp.x - sp.w, y); g.lineTo(sp.x + sp.lean * sp.h, y - sp.h * up); g.lineTo(sp.x + sp.w, y); g.fill(); g.fillStyle = "#8c92a0"; g.beginPath(); g.moveTo(sp.x - sp.w * 0.6, y); g.lineTo(sp.x + sp.lean * sp.h, y - sp.h * up); g.lineTo(sp.x, y); g.fill(); },
  ice(g, sp, y, up) { g.fillStyle = "#5fa5ef"; g.beginPath(); g.moveTo(sp.x - sp.w * 0.8, y); g.lineTo(sp.x + sp.lean * sp.h, y - sp.h * 1.2 * up); g.lineTo(sp.x + sp.w * 0.8, y); g.fill(); g.fillStyle = "#e6f6ff"; g.beginPath(); g.moveTo(sp.x - sp.w * 0.3, y); g.lineTo(sp.x + sp.lean * sp.h, y - sp.h * 1.2 * up); g.lineTo(sp.x, y); g.fill(); },
  thorn(g, sp, y, up) { const h = sp.h * 1.1 * up; g.strokeStyle = "#3a2816"; g.lineWidth = sp.w * 0.7; g.lineCap = "round"; g.beginPath(); g.moveTo(sp.x, y); g.quadraticCurveTo(sp.x + sp.lean * 40, y - h * 0.6, sp.x - sp.lean * 30, y - h); g.stroke(); g.fillStyle = "#6e4e2c"; for (let j = 1; j < 4; j++) { const yy = y - h * j / 4; g.beginPath(); g.moveTo(sp.x, yy); g.lineTo(sp.x + 8, yy - 4); g.lineTo(sp.x, yy - 3); g.fill(); } },
  shock(g, sp, y, up, c) { glow(g, sp.x, y - sp.h * 0.4 * up, sp.h * 0.7, c, 0.7 * up); g.fillStyle = "#ffffff"; g.fillRect(sp.x - 2, y - sp.h * up, 4, sp.h * up); },
};

// The enemy steps in (or a new wave arrives): it resolves out of big pixel blocks with a roar.
export async function enemyIntro(ctx) {
  const { fx, golem } = ctx;
  golem.revive?.();
  sound.sfx("growl", { size: 0.8 });
  golem.to({ wind: 1, open: 1 }, 400, "out").then(() => golem.rest(500));
  await golem.resolve(700, 34);
  fx.shake(6);
}

// Beaten: knocked out, it breaks up into pixel blocks.
export async function enemyDefeat(ctx) {
  const { fx, golem } = ctx;
  const c = fx.fromPage(golem.point("core"));
  fx.slowmo(0.4, 600); fx.flash(0.3); fx.shake(14); fx.punch(0.04, c);
  sound.sfx("explosion", { size: 0.7 });
  fx.sparks(c, 16, { power: 1.3 });
  fx.ring(c, { size: 160, ms: 450 });
  await golem.die();
}
