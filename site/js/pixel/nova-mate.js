// NOVA as a teammate: the pixel-art NOVA (nova-px.js) behind the same calls as
// Dot (say, setMood, pickUp, drop, face, nudge...), so the roaming pet (pet.js)
// and the Shop can use him like DOT or PYRO.
// Every 20-40 s, when nobody needs him, he does one of two idles (never the same
// twice in a row): he crushes his dust ring and summons an orrery of planets, a
// black hole and asteroids in its place, or he tears a portal open and pulls a
// bucket of popcorn out with telekinesis.
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
// Where things are in NOVA's own space (keep in step with the shader): the portal,
// where the bucket hangs beside his head while he eats, and the front of his head.
const PORTAL = [1.04, 0.2, 0.05], HOLD = [0.8, 0.4, -0.25], FACE = [0, 0.48, -0.3];
const lerp3 = (a, b, e) => a.map((v, i) => v + (b[i] - v) * e);

export class NovaMate {
  constructor(container, { size = 96, idles = true, fast = false } = {}) {
    container.innerHTML = `<div class="dot-wrap"><div class="nova-figure" data-mood="idle"></div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.figure = container.querySelector(".nova-figure");
    this.bubble = container.querySelector(".dot-bubble");
    const k = size / 96;
    this.figure.style.width = size + "px"; this.figure.style.height = 115 * k + "px";
    // The canvas is bigger than the figure so the planets and the portal have room.
    const W = 160, H = 170;
    this.nova = new PixelNova(this.figure, { kind: "mooncloak", w: W, h: H, px: k, view: 4.79, half: true, shadow: false });   // view 4.79 (was 5.03): 5% bigger, Isaac 2026-10-21
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

  // A burst of magic and flying shards at a point in his space.
  burst(at, ms = 520) {
    this.nova.idle.burstAt = at;
    return this.anim(ms, (e) => { this.nova.idle.burst = e >= 1 ? 0 : e; }, "out");
  }

  // He crushes his dust ring into a burst, and planets, a black hole and asteroids
  // fly out of it into orbit. Later he shakes them off and summons his ring back.
  async orrery() {
    const I = this.nova.idle;
    this.setMood("angry");
    sound.sfx("crush");
    const spin0 = I.spin;
    await this.anim(750, (e) => { I.ringR = 1 - 0.75 * e; I.ringK = 1 - 0.35 * e; I.spin = spin0 + 5 * e; }, "in");
    I.ringK = 0;
    sound.sfx("ringBurst");
    this.burst([0, 0.15, 0]);
    sound.sfx("novaSummon");
    this.setMood("happy");
    await this.anim(950, (e) => { I.orb = e; I.orbR = 0.2 + 0.8 * e; }, "out");
    setTimeout(() => sound.sfx("blackhole"), 700);
    await this.wait(3800);
    // shake them off: everything is flung outward and fades
    this.setMood("angry");
    sound.sfx("shakeOff");
    await this.anim(750, (e) => { I.shake = Math.sin(e * Math.PI); I.orbR = 1 + 1.6 * e * e; I.orb = 1 - e; }, "lin");
    I.shake = 0; I.orb = 0; I.orbR = 1;
    // and the dust ring spirals back in
    sound.sfx("ringReform");
    const spin1 = I.spin;
    await this.anim(950, (e) => { I.ringK = e; I.ringR = 2.2 - 1.2 * e; I.spin = spin1 - 6 * (1 - e); }, "out");
    I.ringK = 1; I.ringR = 1;
    this.setMood("idle");
  }

  // He rips a portal open in the air, pulls a bucket of popcorn out with purple
  // telekinesis, eats a few, sends it back, and the portal collapses.
  async popcorn() {
    const I = this.nova.idle;
    this.face("right");
    this.setMood("angry");
    sound.sfx("portalTear");
    await this.anim(260, (e) => { I.tear = e; }, "out");
    await this.wait(160);
    sound.sfx("portal");
    await this.anim(650, (e) => { I.portal = e; I.tear = 1 - e; }, "out");
    I.tear = 0;
    // telekinesis: the beam reaches into the portal and draws the bucket out
    this.setMood("idle");
    sound.sfx("telekinesis");
    await this.anim(280, (e) => { I.tk = e; I.bucketAt = PORTAL; }, "out");
    await this.anim(1100, (e) => { I.bucket = Math.min(1, e * 1.6); I.bucketAt = lerp3(PORTAL, HOLD, e); }, "io");
    const pieces = 2 + Math.round(Math.random());
    for (let i = 0; i < pieces; i++) {
      await this.wait(300);
      const from = [HOLD[0] + (Math.random() - 0.5) * 0.1, HOLD[1] + 0.26, HOLD[2]];
      sound.sfx("pop");
      // the piece floats up out of the bucket and over into his face
      await this.anim(520, (e) => {
        const k = lerp3(from, FACE, e);
        this.nova.idle.kern = [k[0], k[1] + Math.sin(e * Math.PI) * 0.22, k[2], 1];
      }, "io");
      I.kern = [0, 0, 0, 0];
      sound.sfx("munch");
      this.setMood("happy");
      await this.anim(320, (e) => { I.chomp = Math.sin(e * Math.PI * 3) * (1 - e); }, "lin");
    }
    await this.wait(450);
    // send it back, and the portal collapses with a burst
    this.setMood("idle");
    sound.sfx("telekinesis");
    await this.anim(800, (e) => { I.bucketAt = lerp3(HOLD, PORTAL, e); I.bucket = 1 - Math.max(0, e - 0.4) / 0.6; }, "io");
    I.bucket = 0;
    await this.anim(200, (e) => { I.tk = 1 - e; }, "in");
    sound.sfx("portalClose");
    await this.anim(380, (e) => { I.portal = 1 - e; }, "in");
    I.portal = 0;
    await this.burst(PORTAL, 450);
  }
}
