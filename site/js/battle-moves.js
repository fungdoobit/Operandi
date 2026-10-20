// Battle choreography: each move as a short scene, timed beat by beat.
// The pattern is the same everywhere: anticipation (a held wind-up the eye can
// read), a very fast strike, a hit-stop freeze on impact with shake and a
// camera punch, then follow-through and recovery.
//
// ctx = { fx: BattleFX, dot: Dot, boss: Boss, mateEl, theme: "water" | "fire" }
// The battle decides what a hit does: onHit(n) returns "hit", "crit" or "blocked".

const page = (elm, fy = 0.55) => { const r = elm.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * fy }; };

// ---- The teammate ------------------------------------------------------------

export async function teammateAttack(ctx, { crit = false, onHit } = {}) {
  const { fx, dot, boss, mateEl, theme } = ctx;
  const home = mateEl._pos || { x: 0, y: 0 };
  const c0 = fx.at(dot.figure, { fy: 0.6 });
  const target = fx.at(boss.figure.querySelector(".boss-core"));
  dot.clearTimers(); dot.setMood("fierce");
  // 1. Gather: crouch low while droplets (or embers) stream into the core.
  dot.sx.t = 1.26; dot.sy.t = 0.76; dot.lean.t = -0.14; dot.energy = 1.3;
  if (crit) { fx.focus(1.07, c0, 520); fx.slowmo(0.55, 620); }
  const gathered = fx.gather(c0, theme, crit ? 32 : 18, crit ? 620 : 380);
  await fx.wait(crit ? 620 : 380);
  fx.clear(gathered);
  // 2. Dash: stretch out and shoot across, leaving a trail.
  const dist = target.x - c0.x - 150;
  dot.sx.s = 1.32; dot.sy.s = 0.78; dot.sx.t = 1.25; dot.sy.t = 0.82; dot.lean.t = 0.22;
  fx.dashTrail(c0, { x: c0.x + dist, y: c0.y }, theme);
  fx.dust(c0.x, 5, 1);
  fx.drops({ x: c0.x, y: c0.y + 10 }, theme, 10, { power: 0.9, dir: -1 });
  fx.ripple({ x: c0.x, y: fx.floorY }, theme, 80, 500);
  if (crit) fx.focus(1, null, 260);
  await fx.move(mateEl, { x: home.x + dist }, 130, "expo");
  // 3. Strike: snap upright as the blade sweeps through.
  dot.sx.s = 0.82; dot.sy.s = 1.22; dot.sx.t = 1; dot.sy.t = 1; dot.lean.t = 0.1;
  fx.slash({ x: target.x - 40, y: target.y }, theme, { angle: -20 });
  impact(fx, theme, target, onHit?.(1), false);
  if (crit) {
    await fx.wait(150);
    dot.jump.v = -4; dot.sx.s = 1.2; dot.sy.s = 0.84;
    fx.slash({ x: target.x - 30, y: target.y - 10 }, theme, { angle: 200, flip: -1, size: 135 });
    fx.geyser(target.x, theme);
    impact(fx, theme, target, onHit?.(2), true);
  }
  await fx.wait(crit ? 280 : 120);
  // 4. Recoil off the hit, then a hop back home and a splash landing.
  await fx.move(mateEl, { x: home.x + dist - 80 }, 150, "out");
  dot.jump.v = -6;
  await fx.move(mateEl, { x: home.x }, 420, "inOut");
  await fx.wait(80);
  fx.ripple({ x: c0.x, y: fx.floorY }, theme, 70, 600);
  dot.lean.t = 0; dot.setMood("idle");
}

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
  if (crit) { fx.flash(0.35); fx.ring(at, { size: 210, ms: 460 }); fx.slowmo(0.35, 400); }
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

// kind "slam": claw smash and a shockwave; "cannon": an aimed shot.
export async function bossAttack(ctx, kind, { onHit } = {}) {
  const { fx, dot, boss } = ctx;
  const bossC = fx.at(boss.figure.querySelector(".boss-core"));
  const dotC = () => fx.at(dot.figure, { fy: 0.55 });
  const hurt = () => { teammateHurt(ctx); onHit?.(); };
  fx.focus(1.04, bossC, 500);
  await new Promise((done) => {
    if (kind === "cannon") {
      boss.attack({ kind: "cannon", target: page(dot.figure), onRelease: (p) => {
        const P = fx.fromPage(p);
        fx.focus(1, null, 300); fx.shake(10); fx.punch(0.02, P);
        fx.shot(P, dotC(), { onArrive: () => { hurt(); done(); } });
      } });
      return;
    }
    boss.attack({ kind: "slam", onRelease: (p) => {
      const P = fx.fromPage(p, fx.floorY);
      fx.focus(1, null, 300);
      fx.hitstop(80); fx.shake(22); fx.punch(0.035, P);
      fx.ring({ x: P.x, y: fx.floorY }, { color: "#ffe2b0", size: 280, flat: 0.14, ms: 520, width: 8 });
      fx.dust(P.x, 18, 2.2);
      fx.groundWave(P.x - 30, dotC().x, { onArrive: () => { hurt(); done(); } });
    } });
  });
  await fx.wait(500);
}

// A special move gets a cinematic telegraph: bars, a slow push-in, its name.
export async function bossSpecial(ctx, move, moveName) {
  const { fx, dot, boss } = ctx;
  const bossC = fx.at(boss.figure.querySelector(".boss-core"));
  fx.letterbox(true); fx.focus(1.08, bossC, 900);
  boss.charge(move);
  fx.title(boss.b.name, moveName);
  await fx.wait(1450);
  fx.letterbox(false); fx.focus(1, null, 400);
  if (move === "typos") boss.special("typos", { target: page(dot.figure), onArrive: () => dot.swarmed(1700) });
  else boss.special(move);
  if (move === "glitch") { fx.flash(0.18, "#5fe3ff"); fx.shake(8); }
  if (move === "firewall") fx.shake(6);
  await fx.wait(move === "typos" ? 2400 : 800);
}

// The final blow: bars, slow motion, push in on the boss as he breaks apart.
export async function bossDefeat(ctx) {
  const { fx, boss } = ctx;
  const c = fx.at(boss.figure.querySelector(".boss-core"));
  fx.letterbox(true); fx.slowmo(0.3, 1600); fx.focus(1.12, c, 700);
  fx.flash(0.6); fx.shake(18); fx.ring(c, { size: 260, ms: 600 });
  boss.defeat();
  await fx.wait(1900);
  fx.focus(1, null, 700);
  await fx.wait(700);
  fx.letterbox(false);
  await teammateWin(ctx);
}

export async function bossWin(ctx) {
  await teammateKO(ctx);
  ctx.boss.win();
  ctx.fx.shake(10);
  await ctx.fx.wait(1600);
}
