// NOVA as a teammate: the pixel-art NOVA (nova-px.js) behind the same calls as
// Dot (say, setMood, pickUp, drop, face, nudge...), so the roaming pet (pet.js)
// and the Shop can use her like DOT or PYRO.
// Every 20-40 s, when nobody needs her, she does one of two idles (never the same
// twice in a row): she crushes her dust ring and summons an orrery of planets, a
// black hole and asteroids in its place, or she tears a portal open and pulls a
// bucket of popcorn out with telekinesis.
// Battle moves come later; in a fight the battle still uses DOT's moves.
import { PixelNova } from "./nova-px.js";
import { Dot } from "../dot.js";
import { sound } from "../sound.js";
import { drawPizza, pizzaLen, crustHalfWidth } from "./nova-pizza.js";
import { drawMallow } from "./nova-mallow.js";

export const NOVA_CSS = `
.nova-figure { width: 96px; height: 115px; flex: none; touch-action: none; position: relative; }
.nova-figure canvas { position: absolute; pointer-events: none; }
`;

// DOT's moods mapped onto NOVA's five.
const MOOD = { happy: "happy", celebrate: "happy", sad: "sad", ko: "sad", sleepy: "sleepy", angry: "angry", fierce: "angry" };
const EASE = { out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, io: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), lin: (t) => t };
// Where things are in NOVA's own space (keep in step with the shader): the portal,
// where the bucket hangs beside her head while she eats, and the front of her head.
const PORTAL = [1.04, 0.2, 0.05], HOLD = [0.8, 0.4, -0.25], FACE = [0, 0.48, -0.3];
const lerp3 = (a, b, e) => a.map((v, i) => v + (b[i] - v) * e);

const CHUNK = 1.5;   // how many CSS px one of her art pixels covers
const HPAD = 64;     // art px of room round her canvas for things she holds

export class NovaMate {
  constructor(container, { size = 96, idles = true, fast = false } = {}) {
    container.innerHTML = `<div class="dot-wrap"><div class="nova-figure" data-mood="idle"></div><div class="dot-bubble" hidden aria-live="polite"></div></div>`;
    this.figure = container.querySelector(".nova-figure");
    this.bubble = container.querySelector(".dot-bubble");
    const k = size / 96;
    this.figure.style.width = size + "px"; this.figure.style.height = 115 * k + "px";
    // The canvas is bigger than the figure so the planets and the portal have room.
    // drawn smaller and shown CHUNK x: art pixels 1.5 CSS px, like DOT and PYRO, close to GOLEM's 2 (Isaac 2026-10-23)
    const W = Math.round(160 / CHUNK), H = Math.round(170 / CHUNK);
    this.nova = new PixelNova(this.figure, { kind: "mooncloak", w: W, h: H, px: k, view: 4.79, half: true, shadow: false });   // view 4.79 (was 5.03): 5% bigger, Isaac 2026-10-21
    // a 2D layer over her at the same art-pixel size, for things she holds (the warp idle's pizza)
    this.held2d = document.createElement("canvas");
    this.held2d.width = W + 2 * HPAD; this.held2d.height = H + HPAD;   // a margin round her canvas so a held thing never gets cut off
    this.held2d.style.imageRendering = "pixelated";
    this.figure.append(this.held2d);
    this.pizza = null;
    this.resize(size);
    this.tweens = [];
    this.last = null;
    this.swayV = 0; this.yawT = 0.25;
    this.nova.onFrame = (s) => this.step(s);
    this.idleOn = idles;
    this.fast = fast;
    this.lastIdle = null;
    if (idles) this.schedule(fast ? 4000 : 12000);
  }

  // Show her at a new size (the battle stage scales with its height).
  resize(size) {
    const k = size / 96, W = this.nova.canvas.width * CHUNK, H = this.nova.canvas.height * CHUNK;   // (the canvas is drawn smaller)
    this.figure.style.width = size + "px"; this.figure.style.height = 115 * k + "px";
    Object.assign(this.nova.canvas.style, { width: W * k + "px", height: H * k + "px", left: (size - W * k) / 2 + "px", top: (115 * k - H * k) / 2 + "px" });
    if (this.held2d) {
      const a = CHUNK * k;   // CSS px per art px
      Object.assign(this.held2d.style, { width: this.held2d.width * a + "px", height: this.held2d.height * a + "px",
        left: (size - W * k) / 2 - HPAD * a + "px", top: (115 * k - H * k) / 2 - HPAD * a + "px" });
    }
  }
  // A point in her own 3D space → art pixels on her canvas (the shader's camera
  // looks straight down z, orthographic, and turns her by yaw).
  project([x, y, z]) {
    const n = this.nova, c = Math.cos(n.yaw), s = Math.sin(n.yaw), H = n.canvas.height, W = n.canvas.width;
    const wx = c * x + s * z, wy = y + (n.lastBob || 0);
    return [W / 2 + (wx / n.view) * H + HPAD, H / 2 - ((wy - 0.1) / n.view) * H + HPAD];   // (on held2d, which has the margin)
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
    this.drawHeld(dt, s);
  }
  drawHeld(dt, s) {
    const g = this.held2d.getContext("2d"), P = this.pizza, M = this.mallow;
    g.clearRect(0, 0, this.held2d.width, this.held2d.height);
    if (M) {   // a marshmallow on a stick (the visit to PYRO): the stick runs from her hold to M.target on screen, or to a carry spot beside her
      const [hx, hy] = this.project(this.nova.idle.bucketAt), r = this.held2d.getBoundingClientRect(), a = r.width / this.held2d.width;
      const gx = hx + ((M.target.x - r.left) / a - hx) * M.reach, gy = hy + ((M.target.y - r.top) / a - hy) * M.reach;   // art px on held2d
      const tx = gx + (hx + M.carry[0] - gx) * M.mix + Math.sin(s * 1.7) * 0.6, ty = gy + (hy + M.carry[1] - gy) * M.mix + Math.cos(s * 1.3) * 0.6;
      M.spin += dt * (M.turning ? 2.4 : 0.2);
      drawMallow(g, hx, hy, tx, ty, { heat: M.heat, t: s, spin: M.spin });
      return;
    }
    if (!P) return;
    const [x, y] = this.project(this.nova.idle.bucketAt);
    // floppy: the tip lags behind when the slice moves, then wobbles back
    if (P.px != null && dt) P.fv += ((x - P.px) * P.dir * -0.05 + (y - P.py) * 0.04) / Math.max(dt, 0.008) * 0.016;
    P.fv += -P.flop * 60 * dt; P.fv *= Math.pow(0.08, dt); P.flop += P.fv * dt;
    P.px = x; P.py = y;
    drawPizza(g, x, y, { dir: P.dir, aim: P.aim, flop: P.flop + Math.sin(s * 2.2) * 0.06, bites: P.bites, t: s, scale: P.scale });
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
    // three idles in a rotation, never the same one twice running (the warp needs the roaming pet: pet.js)
    const options = ["orrery", "popcorn", ...(this.onWarpRequest ? ["warp"] : [])].filter((w) => w !== this.lastIdle);
    await this.idle(options[Math.floor(Math.random() * options.length)]);
    this.schedule(this.fast ? 8000 + Math.random() * 4000 : 20000 + Math.random() * 20000);
  }
  async idle(which) {
    if (this.playing) return;
    if (which === "warp") { this.lastIdle = "warp"; this.onWarpRequest?.(); return; }   // pet.js does it on her next sideways trip
    this.playing = true; this.lastIdle = which;
    try { await (which === "orrery" ? this.orrery() : this.popcorn()); }
    finally { this.playing = false; }
  }

  // A star-flash at a point in her space, with shards streaking out of it
  // (implode = false) or being sucked into it (implode = true).
  burst(at, ms = 560, implode = false) {
    this.nova.idle.burstAt = at;
    this.nova.idle.implode = implode ? 1 : 0;
    return this.anim(ms, (e) => { this.nova.idle.burst = e >= 1 ? 0 : e; }, implode ? "lin" : "out");
  }

  // She squeezes her dust ring and flings it spiralling outward, and planets, a black
  // hole and asteroids grow in on its orbits. Later she shakes them off and her ring
  // spirals back in.
  async orrery() {
    const I = this.nova.idle;
    // a quick squeeze, then she flings the ring into a spin and it spirals outward,
    // widening and fading, while the planets grow in on the same orbits
    // (the mirror of the ring coming back at the end, which Isaac loved)
    this.setMood("angry");
    sound.sfx("crush");
    const spin0 = I.spin;
    await this.anim(320, (e) => { I.ringR = 1 - 0.18 * e; I.spin = spin0 + 1.2 * e; }, "in");
    this.setMood("happy");
    sound.sfx("ringRelease");
    setTimeout(() => sound.sfx("novaSummon"), 350);
    const spinOut = I.spin;
    await this.anim(1100, (e) => {
      I.ringR = 0.82 + 1.4 * e; I.ringK = 1 - e; I.spin = spinOut + 7 * e;
      I.orb = Math.max(0, (e - 0.25) / 0.75); I.orbR = 0.75 + 0.25 * e;
    }, "out");
    I.ringK = 0; I.ringR = 1; I.orb = 1; I.orbR = 1;
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

  // She rips a portal open in the air, pulls a bucket of popcorn out with purple
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
      // the piece floats up out of the bucket and over into her face
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
    // the vortex spins shut back into the slash it came from, which pinches to a point and flashes out
    sound.sfx("portalClose");
    await this.anim(420, (e) => { I.portal = 1 - e; I.tear = e; }, "in");
    I.portal = 0;
    this.burst(PORTAL, 520, true);
    await this.anim(160, (e) => { I.tear = 1 - e; }, "in");
    I.tear = 0;
    await this.wait(380);
  }
}

// ----- the warp idle (Isaac 2026-10-23): she dives into a portal and comes out
// somewhere else holding a slice of pizza. pet.js moves her and the portals
// (nova-warp.js); these are her parts of it.
const HOLD_P = (dir) => [dir * 1.2, 0.5, -0.25];
export const HOLD_M = (dir) => [dir * 1.95, 0.35, -0.25];   // where the stick's near end floats, for the marshmallow
// Where to hold the crust so the end of what's left reaches her mouth (the slice
// tipped toward her: it points down and in at about 68 degrees).
function biteAt(mate, P) {
  const unit = mate.nova.canvas.height / mate.nova.view, l = pizzaLen(P.bites, P.scale) / unit;
  if (l > 0.05) return [FACE[0] + P.dir * (0.37 * l + 0.1), FACE[1] + 0.93 * l - 0.05, FACE[2]];
  // only crust left: hold it at the side of her face with the end she bites just touching her cheek
  const half = crustHalfWidth(P.scale) / unit, near = 0.3;
  return [FACE[0] + P.dir * (near + (P.bites >= 4 ? 0 : half)), FACE[1] - 0.08, FACE[2]];
}
Object.assign(NovaMate.prototype, {
  // She's already holding it in telekinesis as she comes out (dir: the side it's on).
  holdPizza(dir) {
    this.face(dir > 0 ? "right" : "left");
    this.nova.idle.bucketAt = HOLD_P(dir);
    this.nova.idle.tk = 1;
    this.pizza = { dir, aim: 0, bites: 0, flop: 0.5, fv: 0, scale: 1, px: null, py: null };
  },
  // She is holding a marshmallow on a stick in telekinesis, pointing at target (a screen point, CSS px).
  holdMallow(dir, target) {
    this.face(dir > 0 ? "right" : "left");
    this.nova.idle.bucketAt = HOLD_M(dir);   // well out from her spikes, so it floats free: telekinesis, not held by a horn
    this.nova.idle.tk = 1;
    this.mallow = { target, reach: 0.7, mix: 0, carry: [0, 0], heat: 0, spin: 0, turning: false };
  },
  async eatPizza() {
    const I = this.nova.idle, P = this.pizza;
    if (!P) return;
    this.setMood("happy");
    for (let b = 1; b <= 5; b++) {
      await this.wait(b === 1 ? 500 : 380);
      sound.sfx("telekinesis");
      const to = biteAt(this, P);
      await this.anim(460, (e) => { I.bucketAt = lerp3(HOLD_P(P.dir), to, e); P.aim = e; }, "io");
      sound.sfx("munch");
      P.bites = b;
      await this.anim(320, (e) => { I.chomp = Math.sin(e * Math.PI * 3) * (1 - e); }, "lin");
      I.chomp = 0;
      if (b < 5) await this.anim(420, (e) => { I.bucketAt = lerp3(to, HOLD_P(P.dir), e); P.aim = 1 - e; }, "io");
    }
    this.pizza = null;
    await this.anim(220, (e) => { I.tk = 1 - e; }, "in");
    I.tk = 0;
    await this.wait(500);
    this.setMood("idle");
  },
});

// NOVA on the battle stage (PRD Addendum I): she faces GOLEM with her angry eyes,
// and reacts to hits like DOT does (hurt, swarmed, knocked out, winning).
export class NovaFighter extends NovaMate {
  constructor(container, { size = 72 } = {}) {
    super(container, { size, idles: false });
    this.battle = true;
    this.nova.half = false;   // full frame rate in a fight
    this.face("right");
    this.timers = [];
    this.setMood("idle");
  }
  setMood(mood, o) { super.setMood(mood === "idle" ? "angry" : mood, o); }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); }
  hurt({ crit = false } = {}) {
    this.clearTimers();
    this.nova.flash = 1; this.anim(crit ? 260 : 180, (e) => { this.nova.flash = 1 - e; }, "lin");
    this.anim(380, (e) => { this.nova.idle.shake = (1 - e) * (crit ? 1 : 0.6); }, "lin").then(() => { this.nova.idle.shake = 0; });
    this.setMood("sad", { revertAfter: 1100 });
  }
  swarmed(ms = 1500) {
    this.clearTimers();
    this.setMood("sad");
    this.anim(ms, (e) => { this.nova.idle.shake = 0.5 * Math.sin(e * Math.PI); }, "lin").then(() => { this.nova.idle.shake = 0; this.setMood("idle"); });
  }
  ko() { this.clearTimers(); this.setMood("sad"); this.anim(900, (e) => { this.nova.lift = -0.25 * e; }, "out"); }
  win() { this.clearTimers(); this.setMood("happy"); }
}
