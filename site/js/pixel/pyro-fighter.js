// PYRO in a boss fight (Isaac 2026-10-24): the new flame body (pyro-mate.js) with the same calls the battle
// scenes make on DOT (hurt, swarmed, ko, win, nudge, setMood...), like NovaFighter does for NOVA. In a fight his
// usual look is the big dark flame (angry), his art pixel is 1.6 stage px, a little smaller than GOLEM's 2.
import { PyroMate } from "./pyro-mate.js";

const SIZE = 102;   // k = SIZE / 64 stage px per art px
export class PyroFighter extends PyroMate {
  constructor(container) {
    super(container, { size: SIZE, idles: false });
    this.battle = true;
    // DOT's springy body: the old scenes set sx.t / sy.t / lean.t (squash, stretch, tilt) and energy; he squashes through them
    this.sx = { v: 1, t: 1 }; this.sy = { v: 1, t: 1 }; this.energy = 1; this.dx = 0;
    this.face("right");
    this.setMood("idle");
    this.lastSpring = performance.now();
  }
  // (a number that also takes .t, for the old scenes: dot.lean.t = -0.2)
  get lean() { return (this._leanObj ||= { t: 0, valueOf: () => this._lean || 0 }); }
  set lean(v) { this._lean = +v; }
  resize() { super.resize(SIZE); }
  setMood(mood, o) { super.setMood(mood === "idle" ? "angry" : mood, o); }
  clearTimers() { clearTimeout(this.moodTimer); }
  jump() { return Promise.resolve(); }
  hurt({ crit = false } = {}) {
    this.flare = 1; this.leanV -= crit ? 5 : 3; this.sx.v = 1.1; this.sy.v = 0.88;
    this.setMood("sad", { revertAfter: 1100 });
  }
  swarmed(ms = 1500) {
    this.setMood("sad"); const t0 = performance.now();
    const shake = (n) => { const u = (n - t0) / ms; if (u >= 1 || !this.figure.isConnected) { this.nudge(0, 0); this.setMood("idle"); return; } this.leanV += (Math.random() - 0.5) * 3; requestAnimationFrame(shake); };
    requestAnimationFrame(shake);
  }
  ko() {   // the flame sinks and dims
    this.setMood("sad"); const t0 = performance.now();
    const f = (n) => { const u = Math.min(1, (n - t0) / 900); this.snuff(1 - 0.7 * u * (2 - u), true, 1 - 0.4 * u); if (u < 1 && this.figure.isConnected) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  win() { this.setMood("happy"); this.drop(); this.setMood("happy"); }
  loop(now) {
    super.loop(now);
    const dt = Math.min(0.05, (now - this.lastSpring) / 1000); this.lastSpring = now;
    for (const a of [this.sx, this.sy]) a.v += (a.t - a.v) * Math.min(1, dt * 9);
    this.figure.style.transform = `scale(${this.sx.v.toFixed(3)}, ${this.sy.v.toFixed(3)})`;
    this.figure.style.transformOrigin = "50% 100%";
    if (this.lean.t) this.leanV += (this.lean.t * -3 - this._lean) * 2 * dt;
  }
}
