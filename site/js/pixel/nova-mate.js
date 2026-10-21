// NOVA as a teammate: the pixel-art NOVA (nova-px.js) behind the same calls as
// Dot (say, setMood, pickUp, drop, face, nudge...), so the roaming pet (pet.js)
// and the Shop can use him like DOT or PYRO.
// Every 20-40 s, when nobody needs him, he does one of two idles (never the same
// twice in a row): an orrery of planets, a black hole and asteroids circling
// him, or a popcorn break from a black-hole portal.
// Battle moves come later; in a fight the battle still uses DOT's moves.
import { PixelNova } from "./nova-px.js";
import { Dot } from "../dot.js";
import { sound } from "../sound.js";

export const NOVA_CSS = `
.nova-figure { width: 96px; height: 115px; flex: none; touch-action: none; position: relative; }
.nova-figure canvas { position: absolute; pointer-events: none; }
`;

// DOT's moods mapped onto NOVA's five.
const MOOD = { happy: "happy", celebrate: "happy", sad: "sad", ko: "sad", sleepy: "sleepy", angry: "angry", fierce: "angry" };
const EASE = { out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, io: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), lin: (t) => t };
// Where things are in NOVA's own space (keep in step with the shader): the top of
// the popcorn heap when the bucket is up, and the front of his head.
const HEAP = [0.98, 0.04, -0.05], FACE = [0, 0.48, -0.3];

export class NovaMate {
  constructor(container, { size = 96, idles = true, fast = false } = {}) {
    container.innerHTML = `<div class="dot-wrap"><div class="nova-figure" data-mood="idle"></div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.figure = container.querySelector(".nova-figure");
    this.bubble = container.querySelector(".dot-bubble");
    const k = size / 96;
    this.figure.style.width = size + "px"; this.figure.style.height = 115 * k + "px";
    // The canvas is bigger than the figure so the planets and the portal have room.
    const W = 160, H = 170;
    this.nova = new PixelNova(this.figure, { kind: "mooncloak", w: W, h: H, px: k, view: 5.03, half: true, shadow: false });
    Object.assign(this.nova.canvas.style, { left: (size - W * k) / 2 + "px", top: (115 * k - H * k) / 2 + "px" });
    this.tweens = [];
    this.last = null;
    this.swayV = 0; this.yawT = 0.25;
    this.nova.onFrame = (s) => this.step(s);
    this.idleOn = idles;
    this.fast = fast;
    this.lastIdle = null;
    if (idles) this.schedule(fast ? 4000 : 12000);
  }

  // ----- per frame: tweens, sway spring, turning -----
  step(s) {
    const dt = this.last == null ? 0 : Math.min(0.05, s - this.last);
    this.last = s;
    const n = this.nova;
    this.tweens = this.tweens.filter((tw) => {
      tw.t = Math.min(tw.t + dt * 1000, tw.ms);
      tw.fn(tw.ease(tw.ms ? tw.t / tw.ms : 1));
      if (tw.t >= tw.ms) { tw.done(); return false; }
      return true;
    });
    this.swayV += -n.sway * 40 * dt; this.swayV *= Math.pow(0.04, dt);
    n.sway += this.swayV * dt;
    n.yaw += (this.yawT - n.yaw) * Math.min(1, dt * 6);
  }
  anim(ms, fn, ease = "io") { return new Promise((done) => this.tweens.push({ ms, fn, ease: EASE[ease], t: 0, done })); }
  to(vals, ms, ease) {
    const from = {}; for (const k in vals) from[k] = this.nova.idle[k];
    return this.anim(ms, (e) => { for (const k in vals) this.nova.idle[k] = from[k] + (vals[k] - from[k]) * e; }, ease);
  }
  wait(ms) { return this.anim(ms, () => {}); }

  // ----- the same calls as Dot -----
  setMood(mood, { revertAfter } = {}) {
    clearTimeout(this.moodTimer);
    this.figure.dataset.mood = mood;
    this.nova.setMood(MOOD[mood] || "idle");
    if (mood === "happy" || mood === "celebrate") this.nudge(0, 0.5);
    if (revertAfter) this.moodTimer = setTimeout(() => this.setMood("idle"), revertAfter);
  }
  setAccessory() {}   // looks are for DOT and PYRO
  typing() {}
  nudge(dx = 0, e = 0) { this.swayV += dx * 0.02 + (Math.random() - 0.5) * e * 0.3; }
  face(dir) { this.yawT = dir === "right" ? -0.25 : 0.25; }
  pickUp() { this.held = true; this.setMood("held"); this.anim(200, (e) => { this.nova.lift = 0.06 * e; }, "out"); }
  drop() {
    this.held = false;
    this.anim(140, (e) => { this.nova.lift = 0.06 - 0.14 * e; }, "in")
      .then(() => this.anim(500, (e) => { this.nova.lift = -0.08 * (1 - e); }, "out"));
    this.setMood("happy", { revertAfter: 900 });
  }
  say(text, opts) { Dot.prototype.say.call(this, text, opts); }
  hush() { Dot.prototype.hush.call(this); }

  // ----- idles -----
  schedule(ms) {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.maybeIdle(), ms);
  }
  get busy() {
    const r = this.figure.getBoundingClientRect();
    return this.held || this.playing || !this.bubble.hidden || document.hidden || !this.figure.isConnected || !r.width
      || getComputedStyle(this.figure).visibility === "hidden";
  }
  async maybeIdle() {
    if (!this.figure.isConnected) return;
    if (this.busy) { this.schedule(5000); return; }
    const which = this.lastIdle === "orrery" ? "popcorn" : this.lastIdle === "popcorn" ? "orrery" : Math.random() < 0.5 ? "orrery" : "popcorn";
    await this.idle(which);
    this.schedule(this.fast ? 8000 + Math.random() * 4000 : 20000 + Math.random() * 20000);
  }
  async idle(which) {
    if (this.playing) return;
    this.playing = true; this.lastIdle = which;
    try { await (which === "orrery" ? this.orrery() : this.popcorn()); }
    finally { this.playing = false; }
  }

  // Planets, a black hole and asteroids swing into orbit round him, then fade away.
  async orrery() {
    sound.sfx("novaSummon");
    this.setMood("happy");
    await this.to({ orb: 1 }, 900, "out");
    setTimeout(() => sound.sfx("blackhole"), 900);
    await this.wait(4200);
    sound.sfx("novaUnsummon");
    await this.to({ orb: 0 }, 700, "in");
    this.setMood("idle");
  }

  // A portal opens beside him, a popcorn bucket rises out, he eats a few, it all sinks away.
  async popcorn() {
    sound.sfx("portal");
    await this.to({ portal: 1 }, 600, "out");
    sound.sfx("bucketRise");
    await this.to({ bucket: 1 }, 900, "out");
    const pieces = 2 + Math.round(Math.random());
    for (let i = 0; i < pieces; i++) {
      await this.wait(350);
      const from = [HEAP[0] + (Math.random() - 0.5) * 0.12, HEAP[1], HEAP[2]];
      sound.sfx("pop");
      // a little arc up and over into his face
      await this.anim(480, (e) => {
        const x = from[0] + (FACE[0] - from[0]) * e, z = from[2] + (FACE[2] - from[2]) * e;
        const y = from[1] + (FACE[1] - from[1]) * e + Math.sin(e * Math.PI) * 0.35;
        this.nova.idle.kern = [x, y, z, 1];
      }, "lin");
      this.nova.idle.kern = [0, 0, 0, 0];
      sound.sfx("munch");
      this.setMood("happy");
      await this.anim(320, (e) => { this.nova.idle.chomp = Math.sin(e * Math.PI * 3) * (1 - e); }, "lin");
    }
    await this.wait(500);
    this.setMood("idle");
    sound.sfx("portalClose");
    await this.to({ bucket: 0 }, 600, "in");
    await this.to({ portal: 0 }, 450, "in");
  }
}
