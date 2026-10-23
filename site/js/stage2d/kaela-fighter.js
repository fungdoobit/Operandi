// Kaela in the GOLEM fight (PRD Addendum M): her sprite frames on a canvas inside the battle stage,
// with the same calls GOLEM's attacks, the specials and the win/KO scenes use on DOT (nudge, hurt,
// swarmed, ko, win, setMood...), plus play(card), which runs one of her cards' frame chains on the
// shared battle clock (so hit-stop and slow motion freeze her too).
// Her art pixels are 2 stage pixels, the same as the 2D GOLEM's.
import { battleTime } from "../battle-time.js";
import { loadArt, ghost, dissolved } from "./art.js";
import { layoutCard } from "./engine.js";

const PX = 2;                 // stage px per art pixel
const CW = 340, CH = 260;     // her canvas, art px (room for the big moves)
const FX = 170, FY = 250;     // where her feet are on it
const BOX = { w: 46, h: 56 }; // her body box, art px (what the battle aims at)
const ease = { out: (t) => 1 - (1 - t) ** 3, io: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2) };

export class KaelaFighter {
  constructor(container) {
    container.innerHTML = `<div class="kaela-fig" style="position:relative;width:${BOX.w * PX}px;height:${BOX.h * PX}px"></div>`;
    this.figure = container.querySelector(".kaela-fig");
    this.cv = document.createElement("canvas"); this.cv.width = CW; this.cv.height = CH;
    Object.assign(this.cv.style, { position: "absolute", left: (BOX.w / 2 - FX) * PX + "px", top: (BOX.h - FY) * PX + "px", width: CW * PX + "px", height: CH * PX + "px", imageRendering: "pixelated", pointerEvents: "none" });
    this.figure.append(this.cv);
    this.g = this.cv.getContext("2d");
    this.t = 0; this.x = 0; this.nx = 0; this.nv = 0; this.flash = 0; this.shakeT = 0; this.trail = [];
    this.state = null; this.act = null;
    this.ready = loadArt("./").then((a) => { this.art = a; });
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // DOT's calls that don't apply to her
  setAccessory() {} setMood() {} face() {} resize() {} clearTimers() {}
  say() {} hush() {}

  // ---- reactions ----
  nudge(dx = -6, s = 0.5) { this.nv += dx * 6 * s; }
  hurt({ crit = false } = {}) { this.flash = crit ? 260 : 170; this.nv -= crit ? 70 : 40; }
  swarmed(ms = 1500) { this.shakeT = ms; }
  ko() { this.state = { kind: "ko", t: this.t }; }
  win() { this.state = { kind: "win", t: this.t }; }

  // Move the whole figure sideways (stage px), over battle time.
  slide(to, ms) { const from = this.x, t0 = this.t; return new Promise((res) => { this.slideTw = { from, to, t0, ms, res }; }); }

  // Play a card's chain. spot: how far forward she stands to cut (stage px, from her place).
  // onHit(i, last) on each cut; onLaunch() when Blood Orb leaves her blade; resolves when she's back.
  async play(card, { spot = 0, onHit, onLaunch } = {}) {
    await this.ready;
    const c = layoutCard(card, this.art.MOVES);
    if (spot) await this.dash(spot);
    await new Promise((res) => { this.act = { c, t0: this.t, done: new Set(), onHit, onLaunch, res }; });
    if (spot) await this.dash(0, true);
  }
  // a quick run (walk frames at speed, red afterimages), or a walk back
  dash(to, back = false) {
    const ms = back ? 320 : 220;
    this.running = { back, t0: this.t };
    return this.slide(to, ms).then(() => { this.running = null; });
  }

  loop(now) {
    if (!this.figure.isConnected) return;
    requestAnimationFrame(this.loop);
    const real = Math.max(0, Math.min(50, now - this.last)); this.last = now;   // a stale rAF timestamp can be earlier than the last one
    const dt = battleTime.step(now, real);
    this.t += dt;
    if (this.flash > 0) this.flash -= real;
    if (this.shakeT > 0) this.shakeT -= dt;
    // knock-back spring
    this.nv += -this.nx * 0.04 * dt; this.nv *= Math.pow(0.88, dt / 16); this.nx += this.nv * dt / 1000;
    if (this.slideTw) {
      const s = this.slideTw, k = Math.min(1, (this.t - s.t0) / s.ms);
      this.x = s.from + (s.to - s.from) * (this.running?.back ? ease.io(k) : ease.out(k));
      if (k >= 1) { this.slideTw = null; s.res(); }
    }
    if ((this.tick = !this.tick)) return;   // drawn on twos (30 fps)
    this.draw();
  }

  draw() {
    const g = this.g, A = this.art;
    g.clearRect(0, 0, CW, CH);
    if (!A) return;
    const { IDLE, WALK } = A;
    let f = IDLE[Math.floor(this.t / 100) % IDLE.length], dx = FX - f.w / 2, dy = FY - f.bottom, lift = 0, moveFrame = null;
    if (this.running) {
      f = WALK[(Math.floor((this.t - this.running.t0) / (this.running.back ? 40 : 25)) + 6) % WALK.length];
      dx = FX - f.w / 2; dy = FY - f.bottom;
      if (!this.running.back) this.trail.push({ f, x: dx + this.x / PX, y: dy, t: this.t });
    } else if (this.act) {
      const a = this.act, c = a.c, mt = this.t - a.t0;
      if (mt < c.chain) {
        const s = c.segs.find((s) => mt < s.start + s.dur) || c.segs[c.segs.length - 1], lt = mt - s.start, mv = s.mv;
        let i = 0; while (i < s.fr.length - 1 && s.starts[i + 1] <= lt) i++;
        const j = s.fr[i].j;
        lift = Math.round(s.dy0 + (s.dy1 - s.dy0) * ease.io(Math.min(1, lt / (s.blend ?? 160))));
        moveFrame = mv.frames[j];
        dx = FX - mv.ax; dy = FY - moveFrame.h - lift;
        if (Math.abs(lift - (a.lastLift ?? lift)) > 1.5) this.trail.push({ f: moveFrame, x: dx + this.x / PX, y: dy, t: this.t });
        a.lastLift = lift;
        f = moveFrame;
      }
      if (c.orb && !a.launched && mt >= c.launch) { a.launched = true; a.onLaunch?.(); }
      c.hits.forEach((h, i) => {
        if (c.orb || mt < h || a.done.has(i)) return;
        a.done.add(i); a.onHit?.(i, i === c.hits.length - 1);
      });
      if (mt >= c.total) { this.act = null; a.res(); }
    } else if (this.state?.kind === "win") {
      lift = Math.round(Math.max(0, Math.sin(Math.min(this.t - this.state.t, 1200) / 300 * Math.PI)) * 8 * ((this.t - this.state.t) < 1200));
      dy -= lift;
    }
    // afterimages
    this.trail = this.trail.filter((p) => this.t - p.t < 180);
    for (const p of this.trail) { g.globalAlpha = 0.4 * (1 - (this.t - p.t) / 180); g.drawImage(ghost(p.f, "#ff3a44"), Math.round(p.x - this.x / PX), Math.round(p.y)); }
    g.globalAlpha = 1;
    const jitter = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    const ox = Math.round(dx + this.nx / PX) + jitter, oy = Math.round(dy);
    if (this.state?.kind === "ko") {
      const k = Math.min(1, (this.t - this.state.t) / 900);
      g.drawImage(k < 0.2 ? ghost(f, "#ffffff") : dissolved(f, (k - 0.2) / 0.8), ox, oy + Math.round(k * 4));
    } else g.drawImage(this.flash > 0 ? ghost(f, "#ffffff") : f.c, ox, oy);
    this.figure.style.transform = `translateX(${this.x.toFixed(1)}px)`;
  }
}
