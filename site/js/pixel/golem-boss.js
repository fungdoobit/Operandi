// The hi-bit GOLEM wearing the old Boss's interface, so the shared battle
// choreography (DOT's moves in battle-moves.js, bossSpecial) works on him:
//   figure (with a .boss-core marker), dome, b.name, hit(), charge(), special().
// It also owns his three specials: the Firewall dome (same look as before,
// sized to the new GOLEM), the Typo Swarm (bugs fly out of his missile pods)
// and Glitch Text.
const NS = "http://www.w3.org/2000/svg";
const rand = (a, b) => a + Math.random() * (b - a);
const svg = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.append(e); return e; };

// Missile-pod holes on his deck, in body space (mirrored left and right).
const PODS = [[-0.09, 0.2], [0.11, 0.2], [0.01, -0.02]].flatMap(([hx, hz]) => [1, -1].map((sg) => [sg * 1.22 * (0.72 + hx), 0.44, 0.03 + hz]));

export class PixelBoss {
  constructor({ golem, fx, figure }) {
    this.golem = golem; this.fx = fx; this.figure = figure;
    this.b = { name: "GOLEM" };
    figure.style.position ||= "absolute";
    // A marker that follows his core, for aiming (fx.at reads its position).
    this.coreEl = document.createElement("div");
    this.coreEl.className = "boss-core";
    Object.assign(this.coreEl.style, { position: "absolute", width: "2px", height: "2px", pointerEvents: "none" });
    figure.append(this.coreEl);
    // The Firewall is drawn on its own canvas at GOLEM's art resolution, laid
    // over his, so its pixels line up with his.
    const cv = golem.canvas;
    this.dc = document.createElement("canvas");
    this.pad = 160;   // art pixels of room around his canvas: the dome is wider than he is
    this.dc.width = cv.width + this.pad * 2; this.dc.height = cv.height + this.pad;
    Object.assign(this.dc.style, { position: "absolute", imageRendering: "pixelated", pointerEvents: "none" });
    figure.append(this.dc);
    this.dx = this.dc.getContext("2d");
    this.dome = { childElementCount: 0 };   // what the shared choreography checks
    this.hexes = [];
    this.charging = false;
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  later(ms, f) { this.fx.wait(ms).then(f); }

  tick() {
    if (!this.dc.isConnected) return; // removed from the page: stop
    const c = this.golem.localPoint([0, -0.1, -0.6]);
    this.coreEl.style.left = c.x + "px"; this.coreEl.style.top = c.y + "px";
    const k = this.golem.canvas.clientWidth / this.golem.canvas.width;
    Object.assign(this.dc.style, { left: -this.pad * k + "px", top: -this.pad * k + "px", width: this.dc.width * k + "px", height: this.dc.height * k + "px" });
    this.drawDome();
    requestAnimationFrame(this.tick);
  }

  // Hit by the teammate's code. The Firewall blocks normal hits; a crit smashes it.
  hit({ crit = false, blocked = false } = {}) {
    if (blocked && this.dome.childElementCount) { this.domeRipple(); this.golem.to({ lunge: 0.04 }, 80, "out").then(() => this.golem.to({ lunge: 0 }, 300)); return; }
    if (crit && this.dome.childElementCount) this.breakDome();
    this.golem.hurt({ crit });
  }

  // Telegraph a special: the eye blazes, he hunches with his arms in, trembling.
  charge(move) {
    this.charging = move;
    const g = this.golem;
    g.to({ flare: 1.3, ca: -0.45, ce: 1.25, na: -0.45, ne: 1.25, np: 0.5, tilt: -0.12, bob: 0.06 }, 450, "out");
    for (let i = 0; i < 6; i++) this.later(i * 220, () => { g.fxv.glitch = 0.5; g.to({ glitch: 0 }, 120, "lin", g.fxv); });
  }

  // opts.spawn(ch, pagePoint): hand each Typo Swarm bug to the battle's effects layer.
  special(move, opts = {}) {
    this.charging = false;
    this.golem.rest(500);
    if (move === "firewall") this.buildDome();
    if (move === "typos") this.typoSwarm(opts);
    if (move === "glitch") this.glitchText();
  }

  // Knocked out: the eye dies, he slumps out of the air, his pixels tear, then he fades.
  defeat() {
    const g = this.golem;
    if (this.dome.childElementCount) this.breakDome();
    g.fxv.glitch = 1.2;
    g.to({ flare: -1, thrust: 0, bob: -0.45, tilt: -0.35, lean: 0.25, ca: -1.2, ce: 0.2, na: -1.2, ne: 0.2 }, 1600, "io");
    this.later(1500, () => { g.fxv.glitch = 2.5; g.to({ glitch: 3 }, 700, "lin", g.fxv); g.canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 300, fill: "forwards" }); });
  }
  // He won: rears up, arms high, eye blazing.
  win() {
    const g = this.golem;
    g.to({ flare: 2, tilt: 0.2, bob: 0.25, ca: 1.1, ce: 0.5, na: 1.1, ne: 0.5, thrust: 2 }, 450, "out")
      .then(() => this.fx.wait(1300)).then(() => g.rest(700));
  }

  // ---- Firewall ----
  // Same dome as before: a smooth glowing half-sphere planted on the ground,
  // brighter towards its rim, with a honeycomb inside that fades out towards
  // the middle so he stays easy to see. Sized from his own reach. All sizes
  // are in art pixels (the dome canvas matches GOLEM's).
  domeShape() {
    const g = this.golem, H = g.canvas.height, P = this.pad, at = (L, part) => { const [x, y] = g.toCanvas(L, part); return { x: x + P, y: H - y + P }; };
    const cx = at([0, -0.84, 0]).x, cy = H * (1 - 0.045) + P, top = at([0, 0.8, 0.5]).y;
    const reach = Math.max(Math.abs(at([-0.06, -1.5, -0.05], "claw").x - cx), Math.abs(at([0.5, -1.08, -0.14], "cannon").x - cx));
    return { cx, cy, rx: reach * 1.05, ry: (cy - top) * 1.1 };
  }
  buildDome() {
    const D = (this.D = this.domeShape()), { cx, cy, rx, ry } = D, r = 12, w = r * Math.sqrt(3), now = this.fx.time;
    this.hexes = [];
    for (let row = 0; row * r * 1.5 < ry + r; row++) {
      const y = cy - row * r * 1.5;
      for (let x = cx - rx - w; x <= cx + rx + w; x += w) {
        const px = x + (row % 2 ? w / 2 : 0), d = Math.hypot((px - cx) / rx, (y - cy) / ry);
        if (d > 1.06) continue;
        const edge = Math.max(0, (d - 0.45) / 0.6);
        this.hexes.push({ x: px, y, base: 0.03 + edge * 0.1, line: 0.18 + edge * 0.5, at: now + 80 + row * 45 + rand(0, 60) });
      }
    }
    this.domeState = { on: now, gone: 0, ripple: -1e9 };
    this.dome.childElementCount = 1;
    this.golem.fxv.glitch = 0.6; this.golem.to({ glitch: 0 }, 200, "lin", this.golem.fxv);
  }
  // A blocked hit: the hexes on the side facing the teammate flare up.
  domeRipple() { this.domeState.ripple = this.fx.time; }
  // A crit smashes it: the outline pops and the hexes scatter.
  breakDome() {
    this.domeState.gone = this.fx.time;
    for (const h of this.hexes) { h.vx = rand(-2.6, 2.6); h.vy = rand(-2.8, 0.6); h.spin = rand(-0.12, 0.12); }
    this.dome.childElementCount = 0;
    const D = this.D, k = this.dc.getBoundingClientRect().width / this.dc.width, r = this.dc.getBoundingClientRect();
    this.fx.sparks(this.fx.fromPage({ x: r.left + (D.cx - D.rx * 0.7) * k, y: r.top + (D.cy - D.ry * 0.5) * k }), 22, { colors: ["#ffd39a", "#ff8a33", "#fff3c4"], power: 1.6, dir: -1 });
  }
  drawDome() {
    const c = this.dx, S = this.domeState;
    c.clearRect(0, 0, this.dc.width, this.dc.height);
    if (!S) return;
    const now = this.fx.time, t = now / 1000, { cx, cy, rx, ry } = this.D;
    const gone = S.gone ? (now - S.gone) / 800 : 0;
    if (gone >= 1) { this.domeState = null; this.hexes = []; return; }
    const ease = (f) => 1 + 2.7 * (f - 1) ** 3 + 1.7 * (f - 1) ** 2;
    // shell: grows out of the ground, pops bigger and fades when broken
    const grow = Math.min(1, (now - S.on) / 550), shellK = S.gone ? 1 + 0.12 * Math.min(1, gone * 2.3) : ease(grow);
    const shellA = S.gone ? Math.max(0, 1 - gone * 2.3) : Math.min(1, grow * 2);
    const rip = Math.max(0, 1 - (now - S.ripple) / 400);
    if (shellA > 0) {
      c.save(); c.globalAlpha = shellA;
      c.translate(cx, cy); c.scale(shellK * (S.gone ? 1 : 0.2 + 0.8 * grow), shellK);
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, "rgba(255,154,60,.05)"); gr.addColorStop(0.7, "rgba(255,154,60,.12)"); gr.addColorStop(0.92, "rgba(255,179,102,.32)"); gr.addColorStop(1, "rgba(255,210,154,.55)");
      c.save(); c.scale(rx, ry); c.beginPath(); c.arc(0, 0, 1, Math.PI, 0); c.closePath(); c.fillStyle = gr; c.fill(); c.restore();
      c.strokeStyle = "#ffd29a"; c.lineWidth = rip > 0 ? 4 : 2.5;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, Math.PI, 0); c.stroke();
      c.globalAlpha = shellA * 0.35; c.strokeStyle = "#fff3e0"; c.lineWidth = 4; c.lineCap = "round";
      c.beginPath(); c.ellipse(0, 0, rx * 0.85, ry * 0.85, 0, Math.PI * 1.17, Math.PI * 1.45); c.stroke();
      c.restore();
    }
    // honeycomb: clipped to the dome while it stands, scattering when broken
    c.save();
    if (!S.gone) { c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); c.closePath(); c.clip(); }
    c.lineWidth = 1;
    for (const h of this.hexes) {
      let k = S.gone ? 1 - 0.7 * gone : ease(Math.max(0, Math.min(1, (now - h.at) / 400)));
      if (k <= 0) continue;
      let x = h.x, y = h.y, a = 0, fill = h.base, line = h.line;
      const glow = Math.max(0, Math.sin(t * 2.2 - (h.x - cx) / 30));
      fill += glow ** 6 * 0.08;
      const near = Math.max(0, 1 - (h.x - cx + rx * 0.3) / rx);
      if (rip > 0) fill += near * 0.45 * rip;
      if (S.gone) { const f = (now - S.gone) / 16.67; x += h.vx * f; y += h.vy * f + 0.03 * f * f; a = h.spin * f; fill = 0.3 * (1 - gone); line *= 1 - gone; }
      c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k);
      c.beginPath();
      for (let i = 0; i < 6; i++) { const q = Math.PI / 3 * i + Math.PI / 6; c[i ? "lineTo" : "moveTo"](10 * Math.cos(q), 10 * Math.sin(q)); }
      c.closePath();
      c.fillStyle = `rgba(255,179,102,${Math.min(1, fill).toFixed(3)})`; c.fill();
      c.strokeStyle = `rgba(255,179,102,${line.toFixed(2)})`; c.stroke();
      c.restore();
    }
    c.restore();
  }

  // ---- Typo Swarm: letter-bugs buzz out of his missile pods ----
  typoSwarm({ spawn } = {}) {
    const g = this.golem;
    g.to({ flare: 1.2, tilt: 0.12 }, 200, "out").then(() => g.to({ flare: 0, tilt: 0 }, 900));
    const letters = ["p", "r", "i", "n", "t", "(", '"', ":", ")", "'", ";", "#"];
    letters.forEach((ch, i) => this.later(i * 70, () => {
      const p = this.fx.fromPage(g.pagePoint(PODS[i % PODS.length]));
      this.fx.smoke(p, 1, 0.45);
      this.fx.sparks(p, 3, { colors: ["#ff4d7e", "#ffffff"], power: 0.6, dir: 0 });
      spawn?.(ch, g.pagePoint(PODS[i % PODS.length]));
    }));
  }

  // ---- Glitch Text: his pixels tear and scrambled characters spray out ----
  glitchText() {
    const g = this.golem, fx = this.fx;
    g.fxv.glitch = 1.6; g.to({ glitch: 0 }, 900, "lin", g.fxv);
    g.to({ flare: 1.5 }, 120, "out").then(() => g.to({ flare: 0 }, 700));
    const chars = "#%&@?!*~$";
    for (let i = 0; i < 18; i++) this.later(i * 40, () => {
      const c = fx.fromPage(g.point("core"));
      const t = svg("text", { "font-family": "ui-monospace, Menlo, monospace", "font-weight": 700, "font-size": 22, fill: Math.random() < 0.5 ? "#ff4d7e" : "#8fc8ff" }, fx.g);
      t.textContent = chars[Math.floor(Math.random() * chars.length)];
      fx.particle({ el: t, max: 900, x: c.x, y: c.y, vx: rand(-11, -5), vy: rand(-5, 1.5),
        update: (p, k, f) => { p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.08 * k;
          t.setAttribute("x", p.x.toFixed(1)); t.setAttribute("y", p.y.toFixed(1));
          t.setAttribute("opacity", (f > 0.7 ? (1 - f) / 0.3 : Math.random() < 0.15 ? 0.3 : 1).toFixed(2)); } });
    });
  }
}
