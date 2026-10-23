// The 2D battle (PRD Addendum L): Kaela against an enemy in the Green Forest, in pixel art.
// Drawn on three canvases at an art resolution of `ha` pixels tall (the closer camera: 180,
// Isaac 2026-10-23), scaled up with crisp pixels. The lesson fights (stage.js) and the test page
// (kaela-moves.html) both drive it:
//   cast(card, { finish, onHit })   Kaela plays an ability card (kaela-kit.js); onHit(i, last) on each hit
//   foeAttack({ onHit, move })      the enemy uses one of its abilities (foes.js) and hits her
//   setFoe(id) / foeEnter() / foeDie()   swap, bring in, finish the enemy
//   meKO() / meWin() / meRevive()        Kaela goes down, celebrates, gets back up
// Each returns a promise that settles when the animation is over.
import { shards } from "../pixel2d/slash.js";
import { sound } from "../sound.js";
import { ghost, dissolved } from "./art.js";
import { FOES2D } from "./foes.js";

const ease = { out: (t) => 1 - (1 - t) ** 3, in: (t) => t ** 3, io: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), lin: (t) => t };
// her red ramp, plus the colours of the enemies' spells
const C = { white: [255, 255, 255], pale: [255, 196, 182], light: [255, 120, 104], mid: [224, 58, 52], deep: [176, 34, 42], dark: [122, 12, 38] };
const VIOLET = [[246, 214, 255], [198, 120, 255], [130, 56, 210], [66, 22, 112]];
const CYAN = [[226, 255, 250], [122, 255, 236], [40, 200, 190], [16, 110, 120]];
const LIFT = -56;   // how high a launched enemy flies

// A card's chain laid out on one timeline (see kaela-kit.js), cached per card.
const layouts = new WeakMap();
function layoutCard(card, MOVES) {
  if (layouts.has(card)) return layouts.get(card);
  const c = { ...card };
  let at = 0; c.hits = []; c.lift = [];
  c.segs = card.seq.map((sg) => {
    const mv = MOVES[sg.id], to = sg.to ?? mv.m.n - 1, sp = sg.speed || 1, fr = [];
    for (let j = sg.from; j <= to; j++) fr.push({ j, ms: (sg.hold ?? mv.m.ms[j]) / sp });
    if (sg.hang) fr[fr.length - 1].ms += sg.hang;
    const starts = fr.reduce((a, f) => (a.push(a[a.length - 1] + f.ms), a), [0]);
    const seg = { ...sg, mv, fr, starts, start: at, dur: starts[fr.length] };
    const hs = (sg.hits || mv.hits).filter((h) => h >= sg.from && h <= to);
    seg.hitAts = sg.charge ? [] : hs.map((h) => at + starts[h - sg.from]);
    seg.reach = sg.charge ? Infinity : Math.min(...hs.map((h) => -(mv.hitx[mv.hits.indexOf(h)] ?? 0)), Infinity);
    if (sg.launch && seg.hitAts.length) c.lift.push([seg.hitAts[0], 0], [seg.hitAts[0] + 260, LIFT, "out"]);
    if (sg.slamDown && seg.hitAts.length) c.lift.push([at, LIFT], [seg.hitAts[0], 14, "in"], [seg.hitAts[0] + 500, 14], [seg.hitAts[0] + 900, 0, "io"]);
    c.hits.push(...seg.hitAts); at += seg.dur; return seg;
  });
  c.chain = at; c.total = at;
  let prevEnd = 0;   // height continuity: each segment starts where the last one left her
  c.segs.forEach((g, i) => { g.dy0 = i ? prevEnd - g.mv.feet[g.fr[0].j] : 0; g.dy1 = g.dy ?? 0; prevEnd = g.mv.feet[g.fr[g.fr.length - 1].j] + g.dy1; });
  if (c.juggle) { const lh = c.hits[c.hits.length - 1]; c.lift.push([lh + 140, LIFT], [lh + 560, 0, "in"]); }
  c.reach = c.ranged ? null : c.reach ?? Math.min(...c.segs.map((g) => g.reach));
  if (c.orb) {   // the hit is the orb landing, not the swing
    const g = c.segs[1], launch = g.start + g.starts[MOVES.quick.hits[0] - g.from];
    c.launch = launch; c.flight = 210; c.hits = [launch + c.flight]; c.total = Math.max(c.chain, launch + c.flight + 900);
  }
  if (c.heavy || c.orb) c.slowAt = c.hits[c.hits.length - 1] - (c.orb ? 45 : 110);   // slow motion just before the finishing hit
  layouts.set(card, c); return c;
}
function keyed(keys, t) {   // a value from keyframes [[t, v, ease], ...] at time t (null before the first)
  if (!keys.length || t < keys[0][0]) return null;
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1, e = "io"] = keys[i]; return v0 + (v1 - v0) * ease[e]((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}

export function createEngine(host, art, { ha = 180 } = {}) {
  const { MOVES, IDLE, WALK, FOES, FX, FOREST, GRASS } = art;
  const HA = ha, FLOOR = Math.round(ha * 0.8);
  const world = document.createElement("div");
  Object.assign(world.style, { position: "absolute", inset: "0", willChange: "transform" });
  const mk = (z) => { const c = document.createElement("canvas"); Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", imageRendering: "pixelated", zIndex: z }); world.append(c); return c; };
  const bg = mk(1), cv = mk(2), fx = mk(3);
  host.append(world);
  const gb = bg.getContext("2d"), ga = cv.getContext("2d"), gf = fx.getContext("2d");
  let WA = 400, kxBase = 100, exBase = 300;
  // the fighters stay in a fight zone in the middle (at most 2.9x as wide as tall), so on wide bands they don't end up far apart
  const fit = () => {
    if (!host.clientHeight) return;
    WA = Math.max(200, Math.round(host.clientWidth / host.clientHeight * HA));
    for (const c of [bg, cv, fx]) { c.width = WA; c.height = HA; }
    const zone = Math.min(WA, HA * 2.9), edge = (WA - zone) / 2;
    kxBase = Math.round(edge + zone * 0.22); exBase = Math.round(edge + zone * 0.74);
  };
  fit(); const ro = new ResizeObserver(fit); ro.observe(host);

  // ---- state ----
  let gt = 0, last = performance.now(), hitstop = 0, shake = 0, flash = 0, meFlash = 0, meKnock = -1e9;
  let parts = [], trail = [], booms = [], sprites = [], smoke = [], projs = [], marks = [];
  let act = null, foeAct = null, dying = null, entering = null, meState = null;
  let kx = 0, ky = 0, frame = IDLE[0], moveFrame = null, dark = 0, orb = null, speed = null, slowmo = 0, impactF = 0, impactAt = null;
  const cam = { z: 1, x: 0.5, y: 0.5 }; let camT = null;
  let foeId = "demon", FOE = FOES.demon, DATA = FOES2D.demon, lastMove = null;
  let ex = 0, ey = 0, lift = 0, eFrame = FOE.idle[0], eAlpha = 1, dead = false, knock = -1e9, eDissolve = 0;

  const camKick = (z, x, y, ms) => { camT = { z, x: x / WA, y: y / HA, until: gt + ms }; };
  const spawnFx = (id, x, y, o = {}) => sprites.push({ id, t: gt, x, y, from: 0, to: FX[id].n - 1, ms: FX[id].ms, ...o });
  const footY = () => (FOE.fly ? FLOOR - 16 : FLOOR);
  const eDrawY = () => Math.round(footY() - FOE.idle[0].bottom - 1 + ey + lift);
  const hitY = () => { const f = FOE.idle[0]; return Math.round(footY() - (f.bottom - f.top) / 2 + lift); };
  const eHalf = () => { const f = FOE.idle[0]; return f.w / 2 - f.left; };   // how far its body reaches toward her
  const me = () => ({ x: kxBase + kx + 4, y: FLOOR - 28 - ky });
  const blade = () => ({ x: kxBase + 26, y: FLOOR - 27 });
  const idleF = (t) => FOE.idle[Math.floor(t / FOE.ms) % FOE.idle.length];
  const atkF = (k) => FOE.atk[Math.max(0, Math.min(FOE.atk.length - 1, Math.floor(k * FOE.atk.length)))];

  // ---- Kaela's card ----
  function stepKaela() {
    const c = act.c, t = gt - act.t0;
    const spot = c.ranged ? 0 : exBase - kxBase - Math.max(c.reach, eHalf() + 32);   // where she stands for the cuts to land (clear of big enemies)
    const IN = spot ? 220 : 0;
    let lifted = null;
    if (t < IN) {   // dash in: walk frames at speed, red afterimages, speed lines
      const k = ease.out(t / IN); kx = spot * k; frame = WALK[(Math.floor(t / 25) + 6) % 24];
      if (!act.whoosh) { act.whoosh = true; sound.sfx("whoosh", { theme: "fire" }); }
      if (Math.abs(spot) > 20) { trail.push({ f: frame, x: kxBase + kx - frame.w / 2, y: FLOOR - frame.bottom, t: gt }); speed = { v: false, until: gt + 60 }; }
      return null;
    }
    const mt = t - IN;
    if (c.slowAt != null && mt >= c.slowAt && !act.slowed) { act.slowed = true; slowmo = c.orb ? 560 : 420; }
    lifted = keyed(c.lift, mt);
    if (mt < c.chain) {
      const g = c.segs.find((g) => mt < g.start + g.dur), lt = mt - g.start, mv = g.mv;
      let i = 0; while (i < g.fr.length - 1 && g.starts[i + 1] <= lt) i++;
      const j = g.fr[i].j, f = mv.frames[j];
      const dy = g.dy0 + (g.dy1 - g.dy0) * ease.io(Math.min(1, lt / (g.blend ?? 160)));   // from where the last segment left her
      kx = spot; ky = Math.round(dy);
      moveFrame = { f, x: Math.round(kxBase + spot - mv.ax), y: FLOOR - f.h - ky };
      if (mv.m.dark.includes(j)) dark = 1;
      if (Math.abs(dy - (act.lastDy ?? dy)) > 1.5 || (g.id === "upper" && j >= 2 && j <= 7)) trail.push({ f, x: moveFrame.x, y: moveFrame.y, t: gt });
      if ((g.launch && j >= 2 && j <= 7) || (g.dy && dy - (act.lastDy ?? dy) > 1.5)) speed = { v: true, until: gt + 90 };
      act.lastDy = dy;
      if (g.charge) {   // Blood Orb: the orb gathers on her blade; the world dims and the camera leans in
        if (!act.hum) { act.hum = true; sound.sfx("magic"); }
        dark = Math.max(dark, 0.6 * Math.min(1, lt / 200)); camT = { z: 1.08, x: blade().x / WA, y: blade().y / HA, until: gt + 80 };
        orb = { x: blade().x, y: blade().y, charge: lt, f: Math.min(11, Math.floor(lt / g.dur * 12)), trail: [] };
      }
    } else if (c.ranged) { kx = 0; frame = IDLE[Math.floor(mt / 100) % 10]; }
    else { const k = ease.io(Math.min(1, (mt - c.total) / 320)); kx = spot * (1 - k); frame = WALK[Math.floor(mt / 40) % 24]; }   // back to her place
    if (c.orb && orb && mt >= c.segs[0].dur && mt < c.launch) { orb.charge = null; orb.f = 10 + (Math.floor(gt / 60) % 2); }
    if (c.orb && mt >= c.launch && mt < c.hits[0]) {   // a fast straight shot
      const k = Math.min(1, (mt - c.launch) / c.flight), b = blade(), tx = exBase - 6, ty = hitY();
      if (!act.thrown) { act.thrown = true; sound.sfx("whoosh", { theme: "fire" }); }
      const x = b.x + (tx - b.x) * k, y = b.y + (ty - b.y) * k, tr = [...(orb?.trail || [])], lp = tr[tr.length - 1];
      if (lp) { const n = Math.max(1, Math.round(Math.hypot(x - lp.x, y - lp.y) / 2)); for (let i = 1; i < n; i++) tr.push({ x: lp.x + (x - lp.x) * i / n, y: lp.y + (y - lp.y) * i / n }); }
      tr.push({ x, y });
      orb = { x, y, f: 10 + (Math.floor(gt / 50) % 2), trail: tr.slice(-50) };
      if (!act.ring) { act.ring = true; booms.push({ t: gt, x: b.x, y: b.y, ring: true }); shake = 4; }
      camT = { z: 1.05, x: x / WA, y: y / HA, until: gt + 80 };
    } else if (c.orb && mt >= c.hits[0]) orb = null;
    c.hits.forEach((h, i) => {
      if (mt < h || act.done.has(i)) return;
      act.done.add(i);
      const lastHit = i === c.hits.length - 1, big = lastHit && c.heavy, hx = exBase - 4, hy = hitY();
      hitstop = big ? 220 : lastHit ? 150 : 70; flash = 140; shake = big ? 8 : lastHit ? 5 : 3; knock = gt;
      if (c.orb) {
        booms.push({ t: gt, x: hx, y: hy, big: 1.5, sprite: true }); hitstop = 160; shake = 11; sound.sfx("impact", { size: 1.8 });
        spawnFx("orb", hx, hy, { from: 13, to: 20, ms: 60 }); spawnFx("burst", hx, hy, { ms: 55 });
      } else {
        spawnFx("slash", hx, hy, { from: 2, to: 11, flipX: (i + h) % 2 === 1, flipY: i % 3 === 1 });
        if (lastHit) spawnFx("burst", hx, hy, { ms: 45 });
        sound.sfx("slash"); sound.sfx(lastHit ? "impact" : "hit", { size: big ? 1.6 : lastHit ? 1.2 : 0.8 });
      }
      if (lastHit && (c.heavy || c.orb)) { impactF = 2; impactAt = { x: hx, y: hy }; camKick(1.16, hx, hy, 520); puffs(hx, Math.min(FLOOR - 6, hy + 10), c.orb ? 9 : 6); if (!c.orb) booms.push({ t: gt, x: hx, y: FLOOR - 2, dust: true }); }
      else camKick(1.04, hx, hy, 160);
      parts.push(...shards(big || c.orb ? 30 : lastHit ? 22 : 10, hx, hy, Math.floor(gt) + i));
      act.onHit?.(i, lastHit);
      if (lastHit && act.finish) startDying();
    });
    if (mt >= c.total + (c.ranged ? 0 : 320)) { const r = act.resolve; act = null; r(); }
    return lifted;
  }

  // ---- the enemy's abilities (FOES2D moves) ----
  // Each runs on the enemy's clock t; it sets the enemy's offset (ex, ey) and frame, launches
  // projectiles and drawn marks, calls hitMe() on impact, and returns true when it's over.
  function hitMe({ shake: s = 3, fx = "burst-raw", push = 8 } = {}) {
    if (!foeAct || foeAct.hit) return; foeAct.hit = true;
    const m = me(); hitstop = 120; meFlash = 140; shake = s; meKnock = gt; foeAct.push = push;
    sound.sfx("hit", { size: 1 }); spawnFx(fx, m.x, m.y, { ms: 40 }); parts.push(...shards(14, m.x, m.y, Math.floor(gt)));
    foeAct.onHit?.();
  }
  // a projectile: an fx sprite flying from a to b over dur ms (arc: px of rise), then onArrive
  function shoot(id, a, b, dur, { arc = 0, onArrive, frame } = {}) {
    projs.push({ id, frame: frame ?? (id === "wisp" ? 8 : id === "pillar" ? 4 : 10), a, b, t0: gt, dur, arc, onArrive });
  }
  const spellFrom = () => ({ x: exBase + ex - 16, y: hitY() - 6 });
  const lungeTo = () => -(exBase - kxBase - Math.max(34, eHalf() + 14));   // how far it travels to reach her
  const MOVES_FOE = {
    // a lunge (with bite or attack frames where the art has them)
    lunge(t) {
      const reach = lungeTo(), bob = FOE.fly ? Math.round(Math.sin(gt / 260) * 2) : 0;
      if (t < 260) { ex = 8 * ease.out(t / 260); eFrame = FOE.atk ? atkF(t / 260 * 0.25) : idleF(t); }
      else if (t < 420) { const k = (t - 260) / 160; ex = 8 + (reach - 8) * k ** 3; eFrame = FOE.bite ? FOE.bite[Math.min(1, Math.floor(k * 2))] : FOE.atk ? atkF(0.25 + k * 0.5) : idleF(t * 2); if (!foeAct.g) { foeAct.g = true; sound.sfx("growl"); } }
      else if (t < 640) { ex = reach; eFrame = FOE.bite ? FOE.bite[2 + Math.min(1, Math.floor((t - 420) / 110))] : FOE.atk ? atkF(0.75 + (t - 420) / 220 * 0.25) : idleF(t * 2); }
      else if (t < 1000) { ex = reach * (1 - ease.io((t - 640) / 360)); eFrame = idleF(t); }
      ey = bob;
      if (t >= 430) hitMe();
      return t >= 1000;
    },
    bite(t) { return MOVES_FOE.lunge(t); },
    // the red flyer: rears back with its mouth open, spits a fireball
    spit(t) {
      ex = t < 300 ? 10 * ease.out(t / 300) : 10 * (1 - ease.io(Math.min(1, (t - 300) / 300)));
      eFrame = t < 520 ? FOE.mouth[Math.floor(t / 80) % FOE.mouth.length] : idleF(t); ey = Math.round(Math.sin(gt / 260) * 2);
      if (t >= 330 && !foeAct.shot) { foeAct.shot = true; sound.sfx("whoosh"); const a = { x: exBase + ex - 22, y: hitY() + 4 }; shoot("orb", a, me(), 240, { onArrive: () => { hitMe({ fx: "burst" }); booms.push({ t: gt, x: me().x, y: me().y, ring: true }); } }); }
      return t >= 950;
    },
    // casters: rise, glow, throw a spell straight at her
    shot(t) {
      ey = -6 * Math.sin(Math.min(1, t / 700) * Math.PI); eFrame = idleF(t * 2);
      if (!foeAct.g) { foeAct.g = true; sound.sfx("magic"); }
      if (t >= 380 && !foeAct.shot) { foeAct.shot = true; sound.sfx("whoosh"); shoot(DATA.proj, spellFrom(), me(), 260, { onArrive: () => hitMe({ fx: DATA.proj === "orb" ? "burst" : "burst-raw", shake: 4 }) }); }
      return t >= 1000;
    },
    // three spells in quick succession; the last one hurts
    volley(t) {
      ey = -5 * Math.sin(Math.min(1, t / 1000) * Math.PI); eFrame = idleF(t * 2);
      if (!foeAct.g) { foeAct.g = true; sound.sfx("magic"); }
      [300, 440, 580].forEach((at, i) => {
        if (t >= at && !(foeAct.v ?? (foeAct.v = new Set())).has(i)) {
          foeAct.v.add(i); sound.sfx("whoosh");
          const m = me(), b = { x: m.x + (i - 1) * 6, y: m.y - 10 + i * 8 };
          shoot(DATA.proj, spellFrom(), b, 240, { arc: (i - 1) * 14, onArrive: () => { if (i === 2) hitMe({ fx: "burst", shake: 5 }); else { spawnFx(DATA.proj === "orb" ? "burst" : "burst-raw", b.x, b.y, { ms: 35 }); shake = 2; } } });
        }
      });
      return t >= 1250;
    },
    // fire rain: spells fall from above onto her
    rain(t) {
      ey = -8 * Math.sin(Math.min(1, t / 1300) * Math.PI); eFrame = idleF(t * 2);
      if (!foeAct.g) { foeAct.g = true; sound.sfx("magic"); }
      [350, 470, 590, 710].forEach((at, i) => {
        if (t >= at && !(foeAct.v ?? (foeAct.v = new Set())).has(i)) {
          foeAct.v.add(i);
          const m = me(), x = m.x + [-14, 10, -4, 2][i];
          shoot(DATA.proj, { x: x + 30, y: -12 }, { x, y: FLOOR - 8 - (i === 3 ? 20 : 0) }, 260, { onArrive: () => { if (i === 3) hitMe({ fx: "burst", shake: 5 }); else { spawnFx("burst", x, FLOOR - 8, { ms: 35 }); booms.push({ t: gt, x, y: FLOOR - 2, dust: true, small: true }); shake = 2; sound.sfx("hit", { size: 0.6 }); } } });
        }
      });
      return t >= 1300;
    },
    // lightning from the sky
    bolt(t) {
      ey = -8 * Math.sin(Math.min(1, t / 900) * Math.PI); eFrame = idleF(t * 2);
      if (!foeAct.g) { foeAct.g = true; sound.sfx("magic"); dark = Math.max(dark, 0.4); }
      if (t < 500) dark = Math.max(dark, 0.45);
      if (t >= 500 && !foeAct.z) { foeAct.z = true; const m = me(); marks.push({ kind: "bolt", t0: gt, dur: 220, x: m.x, y: m.y + 10, seed: Math.floor(gt) }); flash = 0; impactF = 1; impactAt = { x: m.x, y: m.y }; sound.sfx("impact", { size: 1.3 }); hitMe({ shake: 7 }); }
      return t >= 1000;
    },
    // a summoning circle under her, then the eruption
    circle(t) {
      ey = -6 * Math.sin(Math.min(1, t / 1100) * Math.PI); eFrame = idleF(t * 2);
      if (!foeAct.g) { foeAct.g = true; sound.sfx("magic"); marks.push({ kind: "circle", t0: gt, dur: 760, x: me().x, y: FLOOR }); }
      if (t >= 650 && !foeAct.z) { foeAct.z = true; spawnFx("wisp", me().x, FLOOR - 24, { ms: 32 }); hitMe({ fx: "burst-raw", shake: 6 }); }
      return t >= 1150;
    },
    // fire pillars erupt in a line toward her
    pillars(t) {
      eFrame = idleF(t * 2); ey = 0;
      if (!foeAct.g) { foeAct.g = true; sound.sfx("magic"); }
      const from = exBase + ex - 30, to = me().x;
      [250, 400, 550].forEach((at, i) => {
        if (t >= at && !(foeAct.v ?? (foeAct.v = new Set())).has(i)) {
          foeAct.v.add(i); const x = from + (to - from) * (i + 1) / 3;
          spawnFx("pillar", x, FLOOR - 40, { ms: 45 }); booms.push({ t: gt, x, y: FLOOR - 2, dust: true, small: true }); shake = 3; sound.sfx("impact", { size: 0.7 });
          if (i === 2) hitMe({ fx: "burst", shake: 5 });
        }
      });
      return t >= 1150;
    },
    // fire skull: charges straight through her, trailing fire
    charge(t) {
      const reach = lungeTo() - 10;
      if (t < 300) { ex = 10 * ease.out(t / 300); eFrame = idleF(t * 3); ey = Math.round((Math.random() - 0.5) * 2); }
      else if (t < 460) { const k = (t - 300) / 160; ex = 10 + (reach - 10) * k ** 2; eFrame = idleF(t * 3); trail.push({ f: eFrame, x: Math.round(exBase + ex - eFrame.w / 2), y: eDrawY(), t: gt, col: "#ff8a2a" }); if (!foeAct.g) { foeAct.g = true; sound.sfx("whoosh", { theme: "fire" }); } }
      else if (t < 900) { ex = reach * (1 - ease.io((t - 460) / 440)); eFrame = idleF(t); }
      if (t >= 450) hitMe({ fx: "burst", shake: 5, push: 12 });
      return t >= 950;
    },
    // jumper: a big leap onto her, a slam, then a hop back
    leap(t) {
      const reach = lungeTo();
      if (t < 260) { eFrame = FOE.atk[Math.min(1, Math.floor(t / 130))]; ex = 0; ey = 0; }
      else if (t < 640) { const k = (t - 260) / 380; ex = reach * ease.io(k); ey = -60 * Math.sin(k * Math.PI); eFrame = FOE.atk[k < 0.5 ? 2 : 4]; if (!foeAct.g) { foeAct.g = true; sound.sfx("whoosh"); } }
      else if (t < 860) { ex = reach; ey = 0; eFrame = FOE.atk[5]; if (!foeAct.land) { foeAct.land = true; booms.push({ t: gt, x: exBase + ex, y: FLOOR - 2, dust: true }); puffs(exBase + ex, FLOOR - 6, 5); sound.sfx("impact", { size: 1.4 }); hitMe({ shake: 8 }); } }
      else if (t < 1180) { const k = (t - 860) / 320; ex = reach * (1 - ease.io(k)); ey = -24 * Math.sin(k * Math.PI); eFrame = FOE.atk[k < 0.5 ? 3 : 5]; }
      else { ex = 0; ey = 0; eFrame = idleF(t); }
      return t >= 1250;
    },
    // jumper: a jump on the spot, and a shock wave runs along the ground to her
    quake(t) {
      if (t < 200) { eFrame = FOE.atk[1]; ey = 0; }
      else if (t < 560) { const k = (t - 200) / 360; ey = -46 * Math.sin(k * Math.PI); eFrame = FOE.atk[k < 0.5 ? 2 : 4]; }
      else { ey = 0; eFrame = t < 760 ? FOE.atk[5] : idleF(t); if (!foeAct.land) { foeAct.land = true; sound.sfx("impact", { size: 1.2 }); shake = 6; booms.push({ t: gt, x: exBase, y: FLOOR - 2, dust: true }); marks.push({ kind: "shock", t0: gt, dur: 420, x0: exBase - 20, x1: me().x }); } }
      if (t >= 980) hitMe({ shake: 6 });
      return t >= 1200;
    },
    // gargoyle: rises, then dives at her and swoops back
    swoop(t) {
      const reach = lungeTo();
      if (t < 420) { const k = t / 420; ey = -40 * ease.out(k); ex = 14 * k; eFrame = FOE.atk[0]; }
      else if (t < 580) { const k = (t - 420) / 160; ex = 14 + (reach - 14) * k ** 2; ey = -40 + 54 * k; eFrame = FOE.atk[2 + (k > 0.5 ? 1 : 0)]; trail.push({ f: eFrame, x: Math.round(exBase + ex - eFrame.w / 2), y: eDrawY(), t: gt, col: "#c060ff" }); if (!foeAct.g) { foeAct.g = true; sound.sfx("whoosh"); } }
      else if (t < 1000) { const k = (t - 580) / 420; ex = reach * (1 - ease.io(k)); ey = 14 * (1 - k); eFrame = idleF(t); }
      else { ex = 0; ey = 0; eFrame = idleF(t); }
      if (t >= 580) hitMe({ shake: 5 });
      return t >= 1050;
    },
    // gargoyle: wings spread, a gust of wind shoves her back
    gust(t) {
      eFrame = t < 820 ? FOE.atk[0] : idleF(t); ey = -4 * Math.sin(Math.min(1, t / 820) * Math.PI);
      if (t >= 200 && !foeAct.g) { foeAct.g = true; sound.sfx("whoosh"); marks.push({ kind: "wind", t0: gt, dur: 560, x0: exBase - 30, x1: kxBase - 30 }); }
      if (t >= 520) hitMe({ fx: "burst-raw", shake: 4, push: 22 });
      return t >= 1000;
    },
    // wolf: a pounce with its own frames
    pounce(t) {
      const reach = lungeTo();
      if (t < 220) { ex = 6 * ease.out(t / 220); ey = 0; eFrame = FOE.atk[0]; }
      else if (t < 560) { const k = (t - 220) / 340; ex = 6 + (reach - 6) * ease.io(k); ey = -26 * Math.sin(k * Math.PI); eFrame = atkF(k); if (!foeAct.g) { foeAct.g = true; sound.sfx("growl"); } }
      else if (t < 960) { const k = (t - 560) / 400; ex = reach * (1 - ease.io(k)); ey = 0; eFrame = idleF(t); }
      if (t >= 520) hitMe({ shake: 5 });
      return t >= 1000;
    },
    // wolf: howls, and rings of ghost light roll out at her
    howl(t) {
      eFrame = FOE.atk[Math.min(FOE.atk.length - 1, 4 + Math.floor(t / 200) % 2)]; ex = 0; ey = 0;
      if (!foeAct.g) { foeAct.g = true; sound.sfx("growl"); }
      [250, 420, 590].forEach((at, i) => { if (t >= at && !(foeAct.v ?? (foeAct.v = new Set())).has(i)) { foeAct.v.add(i); marks.push({ kind: "wave", t0: gt, dur: 380, x0: exBase - 26, x1: me().x, y: me().y }); } });
      if (t >= 970) hitMe({ fx: "burst-raw", shake: 5 });
      if (t >= 1050) eFrame = idleF(t);
      return t >= 1150;
    },
  };
  function stepFoe() {
    const t = gt - foeAct.t0, done = MOVES_FOE[foeAct.move](t);
    if (done) { if (!foeAct.hit) hitMe(); const r = foeAct.resolve; foeAct = null; r(); }
  }
  function startDying() { if (!dying) { dying = { t0: gt }; if (!FOE.die) sound.sfx("screech"); } }

  // ---- the frame update ----
  function update() {
    trail = trail.filter((g) => gt - g.t < 180);
    moveFrame = null; dark *= 0.85; ky = 0;
    let lifted = null;
    if (meState) {   // knocked out or celebrating
      const t = gt - meState.t0; kx = 0;
      frame = IDLE[Math.floor(gt / 100) % 10];
      if (meState.kind === "win") ky = Math.round(Math.max(0, Math.sin(Math.min(t, 1200) / 300 * Math.PI)) * 10 * (t < 1200 ? 1 : 0));
    } else if (act) lifted = stepKaela();
    else { kx = 0; frame = IDLE[Math.floor(gt / 100) % 10]; }
    if (!act) orb = null;
    lift = lifted ?? lift * 0.85;
    if (Math.abs(lift) < 0.3) lift = 0;
    const bob = FOE.fly ? Math.round(Math.sin(gt / 260) * 2) : 0;
    if (dying || dead) {
      const k = dying ? (gt - dying.t0) / 900 : 1.2;
      if (FOE.die) { eFrame = FOE.die[Math.min(7, Math.floor(k * 10))]; ex = 10 * Math.min(1, k * 2); ey = 20 * Math.min(1, k) - lift; eAlpha = k < 0.8 ? 1 : Math.max(0, 1 - (k - 0.8) / 0.4); }
      else {   // no death frames: white flash, then it dissolves in a dither and bursts
        eFrame = FOE.idle[0]; ex = 6 * Math.min(1, k * 3); ey = 0; eDissolve = Math.max(0, Math.min(1, (k - 0.15) / 0.6));
        if (k < 0.15) flash = 60; eAlpha = eDissolve >= 1 ? 0 : 1;
        if (dying && !dying.boom && k > 0.15) { dying.boom = true; spawnFx("burst", exBase - 4, hitY(), { ms: 60 }); puffs(exBase - 4, hitY() + 6, 7); sound.sfx("impact", { size: 1.2 }); }
      }
      if (dying && k >= 1.2) { dead = true; const r = dying.resolve; dying = null; r?.(); }
    } else if (entering) {   // a new enemy comes in from the right
      const k = Math.min(1, (gt - entering.t0) / 650);
      ex = 160 * (1 - ease.out(k)); ey = FOE.fly ? -30 * (1 - ease.out(k)) + bob : 0; eFrame = idleF(gt); eAlpha = 1;
      if (k >= 1) { const r = entering.resolve; entering = null; r(); }
    } else if (foeAct) stepFoe();
    else if (gt - knock < 420) { const k = (gt - knock) / 420; ex = 9 * Math.sin(k * Math.PI) * (1 - k * 0.3); ey = lift ? -3 * Math.sin(k * Math.PI) : bob; eFrame = FOE.bite ? FOE.bite[0] : idleF(gt); }
    else { ex = 0; ey = lift ? 0 : bob; eFrame = lift && FOE.bite ? FOE.bite[0] : idleF(gt); }
    // projectiles
    projs = projs.filter((p) => { if (gt - p.t0 >= p.dur) { p.onArrive?.(); return false; } return true; });
  }

  // ---- drawing helpers (pixels on the effects layer) ----
  const put = (img, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= img.width || y >= img.height) return; img.data.set([c[0], c[1], c[2], 255], (y * img.width + x) * 4); };
  function disc(img, cx, cy, r, band, wobble = 0, seed = 0) {
    const R = Math.ceil(r * 1.3) + 1;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const a = Math.atan2(y, x), rr = r * (1 + wobble * Math.sin(a * 7 + seed) * Math.cos(a * 3 - seed * 0.7));
      const d = Math.hypot(x + 0.5, y + 0.5) / Math.max(0.5, rr), c = band(d, x, y);
      if (c) put(img, cx + x, cy + y, c);
    }
  }
  function drawOrb(img, o) {
    if (o.charge != null) {   // the rune circle draws itself round her blade, then turns
      const p = Math.min(1, o.charge / 300), rot = gt / 500;
      for (let a = 0; a < p * 6.283; a += 0.06) { put(img, o.x + Math.cos(a - 1.57) * 14, o.y + Math.sin(a - 1.57) * 14, C.light); put(img, o.x + Math.cos(a - 1.57) * 15, o.y + Math.sin(a - 1.57) * 15, C.deep); }
      for (let k = 0; k < 8; k++) { const a = rot + k * 0.785; if (((a + 1.57) % 6.283 + 6.283) % 6.283 > p * 6.283) continue; for (let r = 10; r <= 12; r++) put(img, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, k % 2 ? C.pale : C.light); }
      if (p > 0.5) for (let a = 0; a < 6.283; a += 0.045) { if (Math.floor((a - rot * 1.6) * 20 / 6.283 * 2) % 2) continue; put(img, o.x + Math.cos(a) * 20, o.y + Math.sin(a) * 20, C.mid); }
    }
    disc(img, o.x, o.y, 12, (d, x, y) => (d > 0.62 && d < 1 && !((x + y) & 1) ? C.deep : null));   // a dithered glow
    o.trail?.forEach((p, i, A) => {   // a twisting flame tail
      const k = i / A.length, q = A[Math.max(0, i - 1)], dx = p.x - q.x, dy = p.y - q.y, L = Math.hypot(dx, dy) || 1, w = Math.sin(i * 1.1 - gt / 40) * 4 * k;
      put(img, p.x - dy / L * w, p.y + dx / L * w, k > 0.6 ? C.pale : C.light); put(img, p.x + dy / L * w, p.y - dx / L * w, k > 0.6 ? C.light : C.mid);
    });
    o.trail?.forEach((p, i, A) => { const k = i / A.length, r = 6 * (0.35 + 0.55 * k); disc(img, p.x, p.y, r, (d, x, y) => d > 1 ? null : k < 0.35 && (x + y) & 1 ? null : d < 0.5 && k > 0.6 ? C.light : k > 0.5 ? C.mid : k > 0.25 ? C.deep : C.dark); });
    if (o.charge != null) for (let k = 0; k < 12; k++) {
      const ph = (o.charge / 420 + k / 12) % 1, a = k * 2.4 + 0.6, r = 30 * (1 - ph), c = ph > 0.7 ? C.pale : ph > 0.35 ? C.light : C.mid;
      put(img, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, c); if (ph > 0.4) put(img, o.x + Math.cos(a) * (r + 1), o.y + Math.sin(a) * (r + 1), C.deep);
    }
  }
  function drawBoom(img, b) {
    if (b.ring) { const t = (gt - b.t) / 220; if (t > 1) return false; const r = 4 + 16 * ease.out(t); for (let a = 0; a < 6.283; a += 0.05) if (!(t > 0.5 && Math.floor(a * 10) % 2)) put(img, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.7, t < 0.4 ? C.pale : C.light); return true; }
    if (b.dust || b.big) {   // a dust ring racing out along the floor
      const t = (gt - b.t) / 700, R = b.small ? 30 : 80;
      if (t <= 1) { const rx = 8 + R * ease.out(t), ry = 2 + 4 * t; for (let a = 0; a < 6.283; a += 0.02) { const x = b.x + Math.cos(a) * rx, y = FLOOR - 1 + Math.sin(a) * ry; if (t > 0.5 && ((Math.round(x) + Math.round(y)) & 1)) continue; put(img, x, y, t < 0.3 ? [236, 214, 200] : [190, 160, 150]); } }
      if (b.dust) return t <= 1;
    }
    const S = b.big || 1, t = (gt - b.t) / (560 * S); if (t > 1) return false;
    if (S > 1 && t > 0.12) { const t2 = (t - 0.12) / 0.88, r2 = 10 + 70 * ease.out(t2); for (let a = 0; a < 6.283; a += 0.02) if (!(t2 > 0.4 && Math.floor(a * 24) % 2)) put(img, b.x + Math.cos(a) * r2, b.y + Math.sin(a) * r2 * 0.8, t2 < 0.3 ? C.light : C.deep); }
    const rr = 6 + 36 * S * ease.out(t), w = 3 * (1 - t) + 0.6;
    disc(img, b.x, b.y, rr + w, (d, x, y) => { if (d > 1) return null; const r = d * (rr + w); if (r < rr - w) return null; if (t > 0.55 && (x + y) & 1) return null; return t < 0.25 ? C.pale : t < 0.5 ? C.light : C.mid; });
    return true;
  }
  function puffs(x, y, n) { for (let i = 0; i < n; i++) { const a = -1.57 + (i / (n - 1 || 1) - 0.5) * 2.4; smoke.push({ x, y, vx: Math.cos(a) * (14 + (i % 3) * 8), vy: Math.sin(a) * 26 - 10, r: 4 + (i % 3), t0: gt + i * 18 }); } }
  function drawPuff(img, p) {
    const t = (gt - p.t0) / 1300; if (t > 1) return false; if (t < 0) return true;
    const x = p.x + p.vx * t * 1.6, y = p.y + p.vy * t * 1.6 - 18 * t * t, r = p.r * (1 + 1.8 * ease.out(t));
    disc(img, x, y, r, (d, X, Y) => { if (d > 1) return null; const thin = t > 0.75 ? 2 : t > 0.5 ? 1 : 0; if (thin === 2 && ((X + Y) & 1 || X & 1)) return null; if (thin === 1 && (X + Y) & 1) return null; return d < 0.55 && t < 0.25 ? [150, 44, 40] : d > 0.85 ? [40, 18, 22] : [72, 30, 34]; }, 0.15, p.r);
    return true;
  }
  // the enemies' drawn effects: lightning, a summoning circle, a ground shock wave, wind, ghost waves
  function drawMark(img, m) {
    const t = (gt - m.t0) / m.dur; if (t > 1) return false;
    if (m.kind === "bolt") {
      let sd = m.seed + Math.floor(gt / 50); const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
      let x = m.x + (rnd() - 0.5) * 20, y = -2;
      while (y < m.y) { const nx = m.x + (x - m.x) * 0.6 + (rnd() - 0.5) * 18 * (1 - y / m.y), ny = y + 6 + rnd() * 6; for (let i = 0; i <= 8; i++) { const px = x + (nx - x) * i / 8, py = y + (ny - y) * i / 8; put(img, px, py, C.white); put(img, px + 1, py, t < 0.5 ? CYAN[0] : CYAN[1]); put(img, px - 1, py, CYAN[1]); } x = nx; y = ny; }
      disc(img, m.x, m.y, 10 + 8 * t, (d, X, Y) => (d < 1 && d > 0.7 && !((X + Y) & 1) ? CYAN[1] : null));
    } else if (m.kind === "circle") {
      const r = 26 * ease.out(Math.min(1, t * 1.6)), rot = gt / 300;
      for (let a = 0; a < 6.283; a += 0.02) { const x = m.x + Math.cos(a) * r, y = m.y - 1 + Math.sin(a) * r * 0.28; put(img, x, y, VIOLET[1]); if (Math.floor((a + rot) * 6) % 2) put(img, m.x + Math.cos(a) * r * 0.7, m.y - 1 + Math.sin(a) * r * 0.7 * 0.28, VIOLET[2]); }
      for (let k = 0; k < 6; k++) { const a = rot + k * 1.047; put(img, m.x + Math.cos(a) * r * 0.85, m.y - 1 + Math.sin(a) * r * 0.24, VIOLET[0]); }
      if (t > 0.4) for (let k = 0; k < 10; k++) { const ph = ((gt / 400 + k / 10) % 1), x = m.x + Math.cos(k * 2.3) * r * 0.8; put(img, x, m.y - 2 - ph * 40, ph < 0.5 ? VIOLET[1] : VIOLET[2]); }
    } else if (m.kind === "shock") {   // a hump of dust and rock running along the floor
      const x = m.x0 + (m.x1 - m.x0) * ease.in(t);
      for (let i = -8; i <= 8; i++) { const h = Math.round((1 - (i / 8) ** 2) * 9); for (let y = 0; y < h; y++) if (!((i + y) & 1) || y < 3) put(img, x + i, FLOOR - y, y > h - 3 ? [236, 214, 200] : [150, 120, 100]); }
      if (Math.floor(gt / 60) % 2) booms.push({ t: gt, x, y: FLOOR - 2, dust: true, small: true });
    } else if (m.kind === "wind") {   // streaks blowing at her
      let sd = Math.floor(gt / 33) * 7919 + 7; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
      for (let k = 0; k < 16; k++) { const y = FLOOR - 8 - rnd() * 70, xs = m.x0 - (m.x0 - m.x1) * ((t + rnd() * 0.4) % 1), L = 14 + rnd() * 30; for (let i = 0; i < L; i += 1) if (i % 4 !== 3) put(img, xs + i, y, i < L * 0.3 ? [240, 246, 250] : [170, 186, 200]); }
    } else if (m.kind === "wave") {   // a ring of ghost light rolling toward her
      const x = m.x0 + (m.x1 - m.x0) * ease.lin(t), h = 18 + 10 * t;
      for (let a = -1.2; a <= 1.2; a += 0.04) { const px = x - Math.cos(a) * 8, py = m.y + Math.sin(a) * h; put(img, px, py, CYAN[1]); put(img, px + 1, py, CYAN[2]); if (t < 0.6) put(img, px - 1, py, CYAN[0]); }
    }
    return true;
  }
  function drawSprite(sp) {   // an fx sprite centred on (x, y); false when it has finished
    const F = FX[sp.id], n = sp.to - sp.from + 1, i = Math.floor((gt - sp.t) / sp.ms);
    if (i >= n && !sp.loop) return false;
    const f = F.frames[sp.from + (i % n)];
    gf.save(); gf.translate(Math.round(sp.x), Math.round(sp.y)); gf.scale(sp.flipX ? -1 : 1, sp.flipY ? -1 : 1);
    gf.drawImage(f.c, -Math.round(f.w / 2), -Math.round(f.h / 2)); gf.restore();
    return true;
  }
  function drawForest(pan) {   // back and middle layers tiled, the grass strip in front; each slides a different amount
    const oy = FLOOR - 164;   // the forest's ground line meets the floor
    gb.fillStyle = "rgb(145,165,161)"; gb.fillRect(0, 0, WA, Math.max(0, oy)); gb.fillStyle = "rgb(17,24,3)"; gb.fillRect(0, oy + 204, WA, HA);
    [FOREST[0], FOREST[1], GRASS].forEach((img, i) => {
      const off = Math.round(pan * [0.15, 0.4, 0.8][i]), w = img.width, y = i === 2 ? oy + 140 : oy;
      for (let x = -((off % w) + w) % w - w; x < WA; x += w) gb.drawImage(img, x, y);
    });
  }

  function render() {
    drawForest(-kx * 0.25);
    ga.clearRect(0, 0, WA, HA);
    if (dark > 0.05) { ga.fillStyle = `rgba(6,4,10,${0.72 * Math.min(1, dark)})`; ga.fillRect(0, 0, WA, HA); }
    ga.fillStyle = "rgba(0,0,0,0.35)";   // shadows, smaller the higher they are
    const shadows = [[kxBase + kx, Math.max(5, 14 - ky / 5)]];
    if (eAlpha > 0.2) shadows.push([exBase + ex, Math.max(4, Math.round(FOE.idle[0].w / 5) + (lift + Math.min(0, ey)) / 8 - (FOE.fly ? 3 : 0))]);
    for (const [x, w] of shadows) for (let i = -Math.round(w); i <= w; i++) { const k = 1 - (i / w) ** 2; ga.fillRect(Math.round(x + i), FLOOR, 1, k > 0.5 ? 2 : 1); }
    if (eAlpha > 0) {
      const src = flash > 0 && (!dying || !FOE.die) ? ghost(eFrame, "#ffffff") : eDissolve > 0 ? dissolved(eFrame, eDissolve) : eFrame.c;
      ga.globalAlpha = eAlpha; ga.drawImage(src, Math.round(exBase + ex - eFrame.w / 2), eDrawY()); ga.globalAlpha = 1;
    }
    for (const g of trail) { ga.globalAlpha = 0.4 * (1 - (gt - g.t) / 180); ga.drawImage(ghost(g.f, g.col || "#ff3a44"), g.x, g.y); }
    ga.globalAlpha = 1;
    // Kaela (knocked back when hit; dissolving when knocked out)
    const push = meKnock > gt - 380 ? -Math.round((foeAct?.push ?? 8) * Math.sin((gt - meKnock) / 380 * Math.PI)) : 0;
    if (moveFrame) ga.drawImage(moveFrame.f.c, moveFrame.x, moveFrame.y);
    else if (meState?.kind === "ko") { const k = Math.min(1, (gt - meState.t0) / 900); ga.drawImage(k < 0.2 ? ghost(frame, "#ffffff") : dissolved(frame, (k - 0.2) / 0.8), Math.round(kxBase + kx - frame.w / 2), FLOOR - frame.bottom + Math.round(k * 6)); }
    else ga.drawImage(meFlash > 0 ? ghost(frame, "#ffffff") : frame.c, Math.round(kxBase + kx + push - frame.w / 2), FLOOR - frame.bottom - ky);
    const img = gf.createImageData(WA, HA), dt = 1 / 30;
    if (speed && gt < speed.until) {   // speed lines
      let sd = Math.floor(gt / 33) * 7919 + 13; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
      for (let k = 0; k < 14; k++) { const L = 18 + rnd() * 50, a = rnd(), b = rnd(); for (let i = 0; i < L; i++) { if (i % 3 === 2) continue; const c = i < L * 0.3 ? [255, 230, 222] : [196, 150, 150]; if (speed.v) put(img, a * WA, b * HA * 1.2 - i, c); else put(img, b * WA * 1.2 - i, 20 + a * (FLOOR - 24), c); } }
    }
    smoke = smoke.filter((p) => drawPuff(img, p));
    marks = marks.filter((m) => drawMark(img, m));
    if (orb) drawOrb(img, orb);
    booms = booms.filter((b) => drawBoom(img, b));
    parts = parts.filter((s) => { if (hitstop <= 0) { s.vy += 380 * dt; s.x += s.vx * dt; s.y += s.vy * dt; } s.life = (s.life || 0) + dt; return s.life < 0.8 && s.y < FLOOR + 4; });
    for (const s of parts) { const c = [parseInt(s.c.slice(1, 3), 16), parseInt(s.c.slice(3, 5), 16), parseInt(s.c.slice(5, 7), 16)]; for (let i = 0; i < s.s; i++) for (let j = 0; j < s.s; j++) put(img, s.x + i, s.y + j, c); }
    if (impactF > 0) {   // impact frame: the world goes black, both fighters white, red burst lines
      impactF--;
      ga.fillStyle = "#000"; ga.fillRect(0, 0, WA, HA);
      ga.drawImage(ghost(eFrame, "#ffffff"), Math.round(exBase + ex - eFrame.w / 2), eDrawY());
      if (moveFrame) ga.drawImage(ghost(moveFrame.f, "#ffffff"), moveFrame.x, moveFrame.y); else ga.drawImage(ghost(frame, "#ffffff"), Math.round(kxBase + kx - frame.w / 2), FLOOR - frame.bottom);
      img.data.fill(0);
      for (let k = 0; k < 28; k++) { const a = k * 0.2244 + (k % 3) * 0.05, r0 = 14 + (k % 4) * 6; for (let r = r0; r < 260; r++) put(img, impactAt.x + Math.cos(a) * r, impactAt.y + Math.sin(a) * r, k % 2 ? C.mid : C.deep); }
    }
    gf.putImageData(img, 0, 0);
    if (impactF <= 0) {
      if (orb) drawSprite({ id: "orb", t: gt, x: orb.x, y: orb.y, from: orb.f, to: orb.f, ms: 1e9 });
      for (const p of projs) {   // enemy spells in flight
        const k = Math.min(1, (gt - p.t0) / p.dur), x = p.a.x + (p.b.x - p.a.x) * k, y = p.a.y + (p.b.y - p.a.y) * k - Math.sin(k * Math.PI) * p.arc;
        drawSprite({ id: p.id, t: gt, x, y, from: p.frame + (p.id.startsWith("orb") ? Math.floor(gt / 60) % 2 : 0), to: p.frame + (p.id.startsWith("orb") ? Math.floor(gt / 60) % 2 : 0), ms: 1e9, flipX: true });
      }
      sprites = sprites.filter(drawSprite);
    }
    const sx = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake) * 2 : 0, sy = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake) * 2 : 0;
    const px = host.clientHeight / HA / 2;
    world.style.transformOrigin = `${(cam.x * 100).toFixed(2)}% ${(cam.y * 100).toFixed(2)}%`;
    world.style.transform = `translate(${sx * px}px, ${sy * px}px) scale(${cam.z.toFixed(4)})`;
  }

  let tick = 0, alive = true;
  function loop(now) {
    if (!alive) return;
    if (!host.isConnected) { alive = false; ro.disconnect(); return; }   // the stage was taken down
    requestAnimationFrame(loop);
    const real = Math.max(0, Math.min(50, now - last)); last = now;
    if (hitstop > 0) hitstop -= real; else gt += real * (slowmo > 0 ? 0.3 : 1);
    if (slowmo > 0 && hitstop <= 0) slowmo -= real;
    const on = camT && gt < camT.until, tz = on ? camT.z : 1;
    cam.z += (tz - cam.z) * 0.12; if (on) { cam.x += (camT.x - cam.x) * 0.2; cam.y += (camT.y - cam.y) * 0.2; }
    if (flash > 0) flash -= real;
    if (meFlash > 0) meFlash -= real;
    shake *= 0.86;
    if (++tick % 2) return;   // drawn on twos (30 fps)
    update(); render();
  }
  requestAnimationFrame(loop);

  const wait = (set) => new Promise((resolve) => set(resolve));
  return {
    // Kaela plays a card. finish: this blow kills, so the enemy starts dying on the last hit.
    cast(card, { finish = false, onHit } = {}) {
      if (dead) { dead = false; eAlpha = 1; eDissolve = 0; }
      return wait((resolve) => { act = { c: layoutCard(card, MOVES), t0: gt, done: new Set(), finish, onHit, resolve }; });
    },
    // The enemy uses an ability (by name, or the next of its moves without repeating).
    foeAttack({ onHit, move } = {}) {
      const list = DATA.moves.filter((m) => MOVES_FOE[m] && (m !== "bite" || FOE.bite) && (!["leap", "quake", "swoop", "gust", "pounce", "howl"].includes(m) || FOE.atk));
      move ??= list.length > 1 ? list.filter((m) => m !== lastMove)[Math.floor(Math.random() * (list.length - 1))] : list[0] || "lunge";
      lastMove = move;
      return wait((resolve) => { foeAct = { move, t0: gt, onHit, resolve }; });
    },
    setFoe(id) { foeId = id; FOE = FOES[id]; DATA = FOES2D[id] || { moves: ["lunge"] }; dead = false; dying = null; eAlpha = 1; eDissolve = 0; lift = 0; lastMove = null; },
    hideFoe() { eAlpha = 0; dead = true; },   // a boss drawn by someone else stands there instead (GOLEM)
    foeEnter() { dead = false; eAlpha = 1; eDissolve = 0; return wait((resolve) => { entering = { t0: gt, resolve }; }); },
    foeDie() {
      if (dead) return Promise.resolve();
      return wait((resolve) => { startDying(); dying.resolve = resolve; });
    },
    meKO() { return wait((resolve) => { meState = { kind: "ko", t0: gt }; sound.sfx("hurt"); setTimeout(resolve, 1100); }); },
    meWin() { return wait((resolve) => { meState = { kind: "win", t0: gt }; spawnFx("burst", kxBase, FLOOR - 50, { ms: 50 }); setTimeout(() => { meState = null; resolve(); }, 1300); }); },
    meRevive() { meState = null; },
    // where a fighter is, in the host's pixels (for damage numbers)
    where(who) {
      const s = host.clientHeight / HA;
      return who === "foe" ? { x: (exBase + ex) * s, y: (eDrawY() + FOE.idle[0].top) * s } : { x: (kxBase + kx) * s, y: (FLOOR - 58) * s };
    },
    // a card picture: her pose (or the Blood Orb sprite) on a dark red ground, 80 x 60
    cardArt(card) {
      const c = document.createElement("canvas"); c.width = 80; c.height = 60; const g = c.getContext("2d");
      const grd = g.createRadialGradient(40, 30, 4, 40, 30, 50); grd.addColorStop(0, "#5a0d14"); grd.addColorStop(1, "#07080d"); g.fillStyle = grd; g.fillRect(0, 0, 80, 60);
      const [id, j] = card.pose, mv = MOVES[id], f = mv.frames[j];
      // fit the pose: her anchor in the middle, feet near the bottom, cropped to the card
      g.drawImage(f.c, Math.round(40 - (mv.ax) + (card.orbArt ? -14 : 0)), Math.round(58 - f.h));
      if (card.orbArt) { const o = FX.orb.frames[11]; g.drawImage(o.c, 44, 6); }
      return c.toDataURL();
    },
    get foe() { return foeId; },
    destroy() { alive = false; ro.disconnect(); world.remove(); },
  };
}
