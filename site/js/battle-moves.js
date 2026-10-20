// Battle choreography: each move as a short scene, timed beat by beat.
// The pattern is the same everywhere: anticipation (a held wind-up the eye can
// read), a very fast strike, a hit-stop freeze on impact with shake and a
// camera punch, then follow-through and recovery.
//
// ctx = { fx: BattleFX, dot: Dot, boss: Boss, mateEl, theme: "water" | "fire" }
// The battle decides what a hit does: onHit(n) returns "hit", "crit" or "blocked".

const page = (elm, fy = 0.55) => { const r = elm.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * fy }; };

// ---- The teammate ------------------------------------------------------------

// The teammate has several attacks so fights don't repeat: three normal ones
// and two finishers for a flawless crit, picked at random but never the same
// one twice in a row.
const ATTACKS = ["blade", "dive", "volley"], FINISHERS = ["crossBlades", "tidalWave"];
let lastMove = null;
function choose(list) {
  const options = list.filter((m) => m !== lastMove);
  lastMove = options[Math.floor(Math.random() * options.length)];
  return lastMove;
}

export async function teammateAttack(ctx, { crit = false, onHit, move } = {}) {
  const { fx, dot, boss } = ctx;
  const s = {
    ...ctx,
    home: ctx.mateEl._pos || { x: 0, y: 0, r: 0 },
    c0: fx.at(dot.figure, { fy: 0.6 }),
    target: fx.at(boss.figure.querySelector(".boss-core")),
    onHit,
  };
  dot.clearTimers(); dot.setMood("fierce");
  const kind = move || choose(crit ? FINISHERS : ATTACKS);
  await MOVES[kind](s);
  dot.lean.t = 0; dot.setMood("idle");
}

// 1. Gather: crouch low while droplets (or embers) stream into the core.
async function gather(s, { crit = false, ms } = {}) {
  const { fx, dot, c0, theme } = s;
  ms ??= crit ? 620 : 380;
  dot.sx.t = 1.26; dot.sy.t = 0.76; dot.lean.t = -0.14; dot.energy = 1.3;
  if (crit) { fx.focus(1.07, c0, 520); fx.slowmo(0.55, ms); }
  const gathered = fx.gather(c0, theme, crit ? 32 : 18, ms);
  await fx.wait(ms);
  fx.clear(gathered);
}

// Push off: a splash and a ripple where he launches from.
function launch(s, dir = -1) {
  const { fx, c0, theme } = s;
  fx.dust(c0.x, 5, 1);
  fx.drops({ x: c0.x, y: c0.y + 10 }, theme, 10, { power: 0.9, dir });
  fx.ripple({ x: c0.x, y: fx.floorY }, theme, 80, 500);
}

// Hop back home and land with a splash.
async function hopHome(s, from) {
  const { fx, dot, mateEl, home, c0, theme } = s;
  if (from !== undefined) await fx.move(mateEl, { x: from }, 150, "out");
  dot.jump.v = -6;
  await fx.move(mateEl, { x: home.x, y: home.y, r: 0 }, 420, "inOut");
  await fx.wait(80);
  fx.ripple({ x: c0.x, y: fx.floorY }, theme, 70, 600);
}

const MOVES = {
  // Water blade: dash in, slash, recoil.
  async blade(s) {
    const { fx, dot, mateEl, home, c0, target, theme, onHit } = s;
    await gather(s);
    const dist = target.x - c0.x - 150;
    dot.sx.s = 1.32; dot.sy.s = 0.78; dot.sx.t = 1.25; dot.sy.t = 0.82; dot.lean.t = 0.22;
    launch(s);
    fx.dashTrail(c0, { x: c0.x + dist, y: c0.y }, theme);
    await fx.move(mateEl, { x: home.x + dist }, 130, "expo");
    dot.sx.s = 0.82; dot.sy.s = 1.22; dot.sx.t = 1; dot.sy.t = 1; dot.lean.t = 0.1;
    const up = Math.random() < 0.5;
    fx.slash({ x: target.x - 40, y: target.y }, theme, { angle: up ? -20 : 20, flip: up ? 1 : -1 });
    impact(fx, theme, target, onHit?.(1), false);
    await fx.wait(120);
    await hopHome(s, home.x + dist - 80);
  },

  // Tidal dive: leap high, spin, and crash down on the boss with a splash crown.
  async dive(s) {
    const { fx, dot, mateEl, home, c0, target, theme, onHit } = s;
    await gather(s, { ms: 300 });
    const dist = target.x - c0.x - 110;
    dot.sx.s = 0.8; dot.sy.s = 1.3; dot.sx.t = 1; dot.sy.t = 1;
    launch(s, 0);
    fx.slowmo(0.7, 380);
    await fx.move(mateEl, { x: home.x + dist * 0.6, y: home.y - 190, r: 200 }, 340, "out");
    fx.drops(fx.at(dot.figure), theme, 8, { power: 0.6 });
    await fx.move(mateEl, { x: home.x + dist, y: home.y - 40, r: 360 }, 170, "in");
    dot.sx.s = 1.3; dot.sy.s = 0.75;
    fx.splashCrown(target.x - 40, theme, { power: 0.75 });
    impact(fx, theme, target, onHit?.(1), false);
    fx.punch(0.04, target);
    await fx.move(mateEl, { x: home.x + dist - 30, y: home.y, r: 360 }, 120, "out");
    await fx.wait(160);
    mateEl._pos.r = 0;
    await hopHome(s, home.x + dist - 90);
  },

  // Hydro volley: stay back and fire three water orbs in quick succession.
  async volley(s) {
    const { fx, dot, c0, target, theme, onHit } = s;
    await gather(s, { ms: 320 });
    for (let i = 0; i < 3; i++) {
      const last = i === 2;
      dot.sx.s = 1.18; dot.sy.s = 0.86; dot.dx.v += 5;     // recoil each shot
      fx.drops({ x: c0.x + 30, y: c0.y }, theme, 4, { power: 0.6, dir: 1 });
      const aim = { x: target.x - 30 + (i - 1) * 6, y: target.y + (i - 1) * 26 };
      fx.orb({ x: c0.x + 40, y: c0.y - 6 }, aim, theme, { ms: 240, arc: 20 + i * 18, onArrive: () => {
        if (last) impact(fx, theme, aim, onHit?.(1), false);
        else { fx.splash(aim, theme, { n: 10, power: 0.8, dir: 1 }); fx.hitstop(35); fx.shake(4); s.boss.hit({ blocked: !!s.boss.dome?.childElementCount }); }
      } });
      await fx.wait(last ? 320 : 150);
    }
  },

  // Finisher: two crossing blades, then a splash crown erupts under the boss.
  async crossBlades(s) {
    const { fx, dot, mateEl, home, c0, target, theme, onHit } = s;
    await gather(s, { crit: true });
    const dist = target.x - c0.x - 150;
    dot.sx.s = 1.32; dot.sy.s = 0.78; dot.lean.t = 0.22;
    launch(s);
    fx.dashTrail(c0, { x: c0.x + dist, y: c0.y }, theme);
    fx.focus(1, null, 260);
    await fx.move(mateEl, { x: home.x + dist }, 130, "expo");
    dot.sx.s = 0.82; dot.sy.s = 1.22;
    fx.slash({ x: target.x - 40, y: target.y }, theme, { angle: -20 });
    impact(fx, theme, target, onHit?.(1), false);
    await fx.wait(150);
    dot.jump.v = -4; dot.sx.s = 1.2; dot.sy.s = 0.84;
    fx.slash({ x: target.x - 30, y: target.y - 10 }, theme, { angle: 200, flip: -1, size: 135 });
    fx.splashCrown(target.x, theme, { power: 1.1 });
    impact(fx, theme, target, onHit?.(2), true);
    await fx.wait(280);
    await hopHome(s, home.x + dist - 80);
  },

  // Finisher: summon a wave, ride its crest into the boss, and let it crash over him.
  async tidalWave(s) {
    const { fx, dot, mateEl, home, c0, target, theme, onHit } = s;
    await gather(s, { crit: true });
    fx.focus(1.04, { x: (c0.x + target.x) / 2, y: c0.y }, 600);
    dot.sx.s = 0.8; dot.sy.s = 1.3; dot.jump.v = -3;
    launch(s, 0);
    let hitOnce = false;
    const startX = c0.x - 40, endX = target.x - 60;
    // The wave carries DOT: each frame he's placed on its crest.
    const ride = (x, y) => { fx.place(mateEl, { x: home.x + (x - c0.x) - 10, y: home.y + Math.min(0, y - c0.y - 30), r: -12 }); };
    await new Promise((done) => fx.wave(startX, endX, theme, { ms: 1050, height: 210, rideOn: ride, onArrive: () => {
      if (!hitOnce) { hitOnce = true; impact(fx, theme, target, onHit?.(1), false); }
      fx.splashCrown(target.x - 20, theme, { power: 1.2 });
      impact(fx, theme, target, onHit?.(2), true);
      done();
    } }));
    fx.focus(1, null, 400);
    await fx.wait(320);
    const p = mateEl._pos;
    await fx.move(mateEl, { x: p.x - 40, y: home.y, r: 0 }, 180, "in");
    await hopHome(s, p.x - 100);
  },
};

// What a strike looks like when it lands, depending on the result.
function impact(fx, theme, at, result, crit) {
  if (result === "blocked") {
    fx.hitstop(60); fx.shake(6);
    fx.sparks({ x: at.x - 170, y: at.y }, 14, { colors: ["#fff1d6", "#ffb366"], dir: -1 });
    fx.drops({ x: at.x - 170, y: at.y }, theme, 8, { dir: -1, power: 0.8 });
    return;
  }
  fx.hitstop(crit ? 170 : 85); fx.shake(crit ? 18 : 9);
  fx.splash({ x: at.x - 20, y: at.y }, theme, { n: crit ? 36 : 18, power: crit ? 1.6 : 1.1, dir: 1 });
  fx.punch(crit ? 0.06 : 0.025, at);
  // His armour takes it: sparks, crackling arcs and bits of plate.
  fx.arcs(at, crit ? 6 : 3, { radius: crit ? 110 : 70 });
  fx.debris(at, crit ? 10 : 4, { dir: 1, power: crit ? 1.2 : 0.9 });
  fx.sparks(at, crit ? 14 : 7, { dir: 1 });
  if (crit) { fx.flash(0.35); fx.ring(at, { size: 210, ms: 460 }); fx.slowmo(0.35, 400); fx.explosion({ x: at.x + 30, y: at.y - 20 }, { size: 0.9 }); }
}

export async function teammateHurt(ctx, { crit = false } = {}) {
  const { fx, dot, mateEl, theme } = ctx;
  const home = mateEl._pos || { x: 0, y: 0 };
  const c = fx.at(dot.figure, { fy: 0.55 });
  fx.hitstop(crit ? 140 : 100); fx.shake(crit ? 18 : 12); fx.punch(0.03, c);
  fx.flash(0.16, "#ff4d4d");
  dot.hurt({ crit });
  fx.splash(c, theme, { n: crit ? 24 : 14, power: 1, dir: -1 });
  await fx.move(mateEl, { x: home.x - (crit ? 60 : 40) }, 120, "out");
  await fx.move(mateEl, { x: home.x }, 380, "inOut");
}

export async function teammateKO(ctx) {
  const { fx, dot, theme } = ctx;
  const c = fx.at(dot.figure, { fy: 0.55 });
  fx.letterbox(true); fx.slowmo(0.3, 1300); fx.focus(1.14, c, 700);
  fx.hitstop(160); fx.shake(16); fx.flash(0.25, "#ff4d4d");
  dot.ko();
  fx.splash(c, theme, { n: 30, power: 1.3 });
  for (let i = 0; i < 3; i++) fx.wait(200 + i * 260).then(() => fx.ripple({ x: c.x, y: fx.floorY }, theme, 90 + i * 40, 900));
  await fx.wait(1500);
  fx.focus(1, null, 600);
  await fx.wait(500);
  fx.letterbox(false);
}

export async function teammateWin(ctx) {
  const { fx, dot, theme } = ctx;
  const c = fx.at(dot.figure, { fy: 0.5 });
  dot.win();
  for (let i = 0; i < 3; i++) {
    fx.drops({ x: c.x, y: c.y - 30 }, theme, 14, { power: 0.8, up: 8 });
    fx.glowBurst({ x: c.x, y: c.y }, theme, 50, 400);
    await fx.wait(380);
  }
}

// ---- The boss ----------------------------------------------------------------

// GOLEM's attacks, picked at random like DOT's (never the same twice running).
// Each one: a readable charge-up, a violent release, heavy impact, recovery.
const BOSS_MOVES = ["slam", "barrage", "laser", "ram"];
let lastBossMove = null;

export async function bossAttack(ctx, kind, { onHit } = {}) {
  const { fx, dot, boss } = ctx;
  if (!kind) {
    const options = BOSS_MOVES.filter((m) => m !== lastBossMove);
    kind = options[Math.floor(Math.random() * options.length)];
  }
  lastBossMove = kind;
  const s = {
    ...ctx,
    core: () => fx.at(boss.figure.querySelector(".boss-core")),
    dotC: () => fx.at(dot.figure, { fy: 0.55 }),
    hurt: (opts) => { teammateHurt(ctx, opts); onHit?.(); },
  };
  await BOSS[kind](s);
  // Settle back to his guard.
  boss.arms.forEach((A) => { A.a.t = 0; A.e.t = 0; });
  Object.assign(boss.x, { t: 0 }); Object.assign(boss.y, { t: 0 }); Object.assign(boss.rot, { t: 0 });
  boss.sx.t = 1; boss.sy.t = 1; boss.aiming = false; boss.eye(boss.charging ? "charge" : "idle");
  fx.focus(1, null, 400); fx.darken(0);
  await fx.wait(350);
}

const BOSS = {
  // Claw slam: he rears up as power streams into the claw, hangs for a beat,
  // then smashes the floor. The floor cracks, debris flies, and two shockwaves roll out.
  async slam(s) {
    const { fx, boss } = s;
    fx.focus(1.06, s.core(), 600);
    const claw = () => fx.fromPage(boss.point("claw"));
    boss.attack({ kind: "slam", onRelease: (p) => {
      const P = fx.fromPage(p, fx.floorY);
      fx.focus(1, null, 250);
      fx.hitstop(120); fx.shake(28); fx.punch(0.055, P); fx.flash(0.22, "#ffe2b0");
      fx.crack(P.x, { width: 260 });
      fx.ring({ x: P.x, y: fx.floorY }, { color: "#ffe2b0", size: 320, flat: 0.14, ms: 560, width: 9 });
      fx.dust(P.x, 22, 2.6);
      fx.debris({ x: P.x, y: fx.floorY - 10 }, 10, { power: 1.2, dir: -1 });
      fx.sparks({ x: P.x, y: fx.floorY - 6 }, 16, { power: 1.4 });
      fx.groundWave(P.x - 30, s.dotC().x, { onArrive: () => s.hurt() });
      fx.wait(130).then(() => fx.groundWave(P.x - 30, s.dotC().x - 60, { color: "#ffe2b0", ms: 420 }));
    } });
    await fx.wait(250);
    fx.converge(claw(), { n: 18, ms: 300, radius: 120 });
    await fx.wait(1300);
  },

  // Cannon barrage: the cannon swings onto DOT, charges, and fires three shots
  // in quick succession, each kicking him back, ending in a heavier blast.
  async barrage(s) {
    const { fx, dot, boss } = s;
    const R = boss.arms[1];
    boss.eye("charge"); boss.rot.t = -3; boss.y.t = -14; boss.x.t = 12;
    const aimAt = () => boss.aimAt(page(dot.figure), boss.rot.t);
    R.a.t = aimAt(); R.e.t = 0;
    fx.focus(1.05, s.core(), 500);
    await fx.wait(380);
    boss.muzzleGlow = 1; boss.aiming = true;
    fx.converge(fx.fromPage(boss.point("muzzle")), { n: 16, ms: 420, radius: 110 });
    await fx.wait(440);
    fx.focus(1, null, 300);
    for (let i = 0; i < 3; i++) {
      const last = i === 2;
      R.a.t = aimAt() + (i - 1) * 3;
      const m = fx.fromPage(boss.point("muzzle"));
      R.a.v += last ? 18 : 10; boss.x.v += last ? 12 : 6; boss.rot.v += last ? 2.4 : 1.2; boss.muzzleGlow = 2.6;
      fx.shake(last ? 14 : 8); fx.punch(last ? 0.03 : 0.015, m);
      fx.ring(m, { color: "#ffd9a3", size: last ? 70 : 46, ms: 240 });
      fx.sparks(m, 8, { power: 1, dir: -1 });
      fx.smoke(m, 2, 0.6);
      const target = s.dotC(), aim = { x: target.x + (i - 1) * 18, y: target.y + (i - 1) * 10 };
      fx.shot(m, aim, { ms: last ? 300 : 240, size: last ? 20 : 13, onArrive: () => {
        fx.explosion(aim, { size: last ? 1.1 : 0.6 });
        if (last) s.hurt({ crit: false });
        else { fx.hitstop(40); fx.shake(6); dot.nudge(-8, 0.6); }
      } });
      await fx.wait(last ? 520 : 200);
    }
    boss.aiming = false; boss.muzzleGlow = 0;
  },

  // Core laser: the screen darkens, energy pours into his eye while he rises and
  // spreads his arms, then a beam tears across the floor into DOT.
  async laser(s) {
    const { fx, boss } = s;
    boss.eye("charge"); boss.flare(1400);
    boss.arms.forEach((A) => { A.a.t = -55 * A.side; A.e.t = -20; });
    boss.y.t = -40; boss.rot.t = 4;
    fx.darken(0.6, 500); fx.focus(1.1, s.core(), 900);
    fx.converge(s.core(), { color: "#ff6a2a", n: 34, ms: 1000, radius: 220 });
    fx.arcs(s.core(), 3, { radius: 90, color: "#ffb35c", ms: 900 });
    for (let i = 0; i < 5; i++) fx.wait(i * 180).then(() => fx.ring(s.core(), { color: "#ff9a3c", size: 140 - i * 20, ms: 260, width: 3 }));
    await fx.wait(1000);
    fx.focus(1.02, null, 200); fx.flash(0.35, "#ffd9a3");
    boss.rot.t = -6; boss.x.t = 26; boss.sx.s = 1.06; boss.sy.s = 0.95;
    fx.beam(s.core(), s.dotC(), { ms: 800, width: 38, onHit: () => s.hurt({ crit: true }) });
    for (let i = 0; i < 8; i++) fx.wait(i * 90).then(() => { fx.shake(8); boss.x.v += 1.5; });
    fx.wait(200).then(() => { fx.crack(s.dotC().x, { width: 140 }); fx.explosion(s.dotC(), { size: 0.8 }); });
    await fx.wait(900);
    fx.darken(0, 500);
  },

  // Rocket ram: he coils back, the cables underneath flare like thrusters, then
  // he blasts across the stage and slams into DOT, and recoils back home.
  async ram(s) {
    const { fx, boss } = s;
    const scale = boss.svgEl.getBoundingClientRect().width / 540 || 1;
    boss.eye("charge"); boss.x.t = 40; boss.rot.t = 8; boss.y.t = -20;
    boss.arms.forEach((A) => { A.a.t = 30 * -A.side; A.e.t = 30; });
    fx.focus(1.05, s.core(), 500);
    const under = () => { const c = s.core(); return { x: c.x + 20, y: c.y + 110 }; };
    for (let i = 0; i < 7; i++) fx.wait(i * 80).then(() => { fx.sparks(under(), 6, { colors: ["#ffd27a", "#ff9a3c", "#ffffff"], power: 1, dir: 1 }); fx.smoke(under(), 1, 0.6); });
    await fx.wait(620);
    // The ram moves his whole frame with an exact tween (his own springs would
    // overshoot), so he stops right in front of DOT.
    const foeEl = boss.figure.parentElement, home = foeEl._pos || { x: 0, y: 0 };
    const dist = s.core().x - s.dotC().x - 210;
    fx.focus(1, null, 200);
    boss.x.t = 0; boss.rot.t = -14; boss.y.t = 10;
    boss.arms.forEach((A) => { A.a.t = 60 * -A.side; A.e.t = -20; });
    fx.dashTrail({ x: s.core().x, y: s.core().y + 60 }, { x: s.dotC().x + 150, y: s.core().y + 60 }, "fire");
    fx.dust(s.core().x, 10, 1.6);
    await fx.move(foeEl, { x: home.x - dist }, 170, "in");
    const hit = s.dotC();
    fx.hitstop(130); fx.shake(26); fx.punch(0.05, hit); fx.flash(0.25, "#ffe2b0");
    fx.ring(hit, { size: 180, ms: 420 }); fx.sparks(hit, 22, { power: 1.6, dir: -1 }); fx.debris(hit, 6, { dir: -1 });
    s.hurt({ crit: true });
    boss.sx.s = 0.9; boss.sy.s = 1.08;
    await fx.move(foeEl, { x: home.x - dist + 50 }, 160, "out");
    await fx.wait(180);
    boss.rot.t = 4; boss.y.t = -30;
    await fx.move(foeEl, { x: home.x }, 620, "inOut");
    await fx.wait(500);
  },
};

// A special move gets a cinematic telegraph: bars, a slow push-in, its name.
export async function bossSpecial(ctx, move, moveName) {
  const { fx, dot, boss, theme } = ctx;
  const bossC = fx.at(boss.figure.querySelector(".boss-core"));
  fx.letterbox(true); fx.focus(1.08, bossC, 900);
  boss.charge(move);
  fx.title(boss.b.name, moveName);
  await fx.wait(1450);
  fx.letterbox(false); fx.focus(1, null, 400);
  if (move === "typos") {
    // The bugs fly in the effects layer, in front of DOT, and follow him.
    let mobbed = false;
    const onArrive = () => {
      if (mobbed) return;
      mobbed = true;
      dot.swarmed(1900);
      // Bits of him get knocked off while they nibble.
      for (let i = 0; i < 6; i++) fx.wait(i * 300).then(() => { fx.drops(fx.at(dot.figure, { fy: 0.45 }), theme, 4, { power: 0.7 }); fx.shake(3); });
    };
    boss.special("typos", { spawn: (ch, p) => fx.bug(ch, fx.fromPage(p), () => fx.at(dot.figure, { fy: 0.5 }), { onArrive }) });
  }
  else boss.special(move);
  if (move === "glitch") { fx.flash(0.18, "#5fe3ff"); fx.shake(8); }
  if (move === "firewall") fx.shake(6);
  await fx.wait(move === "typos" ? 2400 : 800);
}

// The final blow: bars, slow motion, push in on the boss as he breaks apart.
export async function bossDefeat(ctx) {
  const { fx, boss } = ctx;
  const c = fx.at(boss.figure.querySelector(".boss-core"));
  fx.letterbox(true); fx.focus(1.12, c, 700); fx.darken(0.45, 600);
  fx.flash(0.6); fx.shake(18); fx.ring(c, { size: 260, ms: 600 });
  boss.defeat();
  // Explosions ripple across his body while time crawls.
  fx.slowmo(0.4, 1800);
  for (let i = 0; i < 7; i++) {
    fx.wait(i * 190).then(() => {
      const p = { x: c.x + (Math.random() - 0.5) * 220, y: c.y + (Math.random() - 0.5) * 180 };
      fx.explosion(p, { size: 0.7 + Math.random() * 0.4 }); fx.arcs(p, 2); fx.debris(p, 5); fx.shake(14); fx.flash(0.12, "#ffd9a3");
    });
  }
  await fx.wait(1500);
  // The final blast.
  fx.hitstop(160); fx.flash(0.85); fx.shake(32); fx.punch(0.06, c);
  fx.explosion(c, { size: 2 });
  fx.ring(c, { size: 420, ms: 700, width: 10 });
  fx.debris(c, 22, { power: 1.6 });
  fx.crack(c.x, { width: 320 });
  await fx.wait(1100);
  fx.focus(1, null, 700); fx.darken(0, 700);
  await fx.wait(700);
  fx.letterbox(false);
  await teammateWin(ctx);
}

export async function bossWin(ctx) {
  const { fx, boss } = ctx;
  await teammateKO(ctx);
  // His victory roar: arms up, the eye blazes, the ground pounds.
  const c = fx.at(boss.figure.querySelector(".boss-core"));
  fx.focus(1.08, c, 600); fx.darken(0.4, 500);
  boss.win();
  for (let i = 0; i < 3; i++) {
    fx.wait(200 + i * 300).then(() => { fx.ring(c, { color: "#ff9a3c", size: 260, ms: 500, width: 6 }); fx.arcs(c, 3, { radius: 120, color: "#ffb35c" }); fx.shake(14); });
  }
  await fx.wait(1600);
  fx.focus(1, null, 600); fx.darken(0, 600);
  await fx.wait(600);
}
