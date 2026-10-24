// Your teammate (DOT, PYRO or NOVA) as a little companion that roams the whole
// screen. Pick him up with the mouse or a finger, drop him anywhere and he
// plops down and stays parked there. Double-click to let him roam again.
// Exposes the same say/setMood/setAccessory calls as Dot, so the app can
// treat it like any teammate.

import { sound } from "./sound.js";
import { Dot } from "./dot.js";
import { NovaMate } from "./pixel/nova-mate.js";
import { PyroMate } from "./pixel/pyro-mate.js";
import { novaWarp, canWarp, novaVisit, visitSide } from "./pixel/nova-warp.js";
import { canRead, readCode } from "./pixel/pyro-read.js";

const SPEED = 46;            // px per second while wandering
const MARGIN = 8;

export class Pet {
  constructor({ skin = "dot", accessories = [], place = { mode: "roam", x: 0.8, y: 0.75 }, onPlace, voice }) {
    this.root = document.createElement("div");
    this.root.className = "pet";
    document.body.append(this.root);
    this.onPlace = onPlace;
    this.voice = voice;
    this.accessories = accessories;
    this.mode = place.mode === "parked" ? "parked" : "roam";
    this.speaking = false;
    this.wait = 1.5;
    this.phase = 0;
    this.build(skin);
    const { w, h } = this.size();
    this.x = clamp(place.x * innerWidth, MARGIN, innerWidth - w - MARGIN);
    this.y = clamp(place.y * innerHeight, MARGIN, innerHeight - h - MARGIN);
    this.target = null;
    this.last = performance.now();
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
    addEventListener("resize", () => this.clampToScreen());
  }

  build(skin) {
    this.skin = skin;
    // NOVA is pixel art with his own idles (pixel/nova-mate.js); DOT and PYRO share dot.js
    // NOVA's size 101 is 5% bigger than the default 96 (Isaac 2026-10-23)
    // PYRO is the flame sprite (pixel/pyro-mate.js, Isaac 2026-10-23); DOT (dot.js) is in storage for now
    this.dot = skin === "nova" ? new NovaMate(this.root, { fast: Pet.fastIdles, size: 101 }) : skin === "pyro" ? new PyroMate(this.root, { size: 96, fast: Pet.fastIdles }) : new Dot(this.root, { skin });
    this.dot.setAccessory(this.accessories);
    if (skin === "pyro") { this.dot.visitOk = () => this.canVisit(); this.dot.onVisitRequest = () => this.visitNova(); this.dot.readOk = () => canRead(this); this.dot.onReadRequest = (h) => readCode(this, h); }
    if (skin === "nova") this.dot.onWarpRequest = () => { this.warpWantedAt = performance.now(); };   // her idle rotation asks for the warp
    this.dot.onSay = (hasActions) => {
      this.speaking = true;
      clearTimeout(this.hideTimer);
      // Plain messages fade after a while; ones with buttons wait for you.
      if (!hasActions) this.hideTimer = setTimeout(() => this.dot.hush(), 14000);
      this.placeBubble();
    };
    this.dot.onHush = () => { this.speaking = false; this.wait = 1.2; };
    const fig = this.dot.figure;
    fig.title = "Drag to move me. Double-click to let me roam.";
    fig.addEventListener("pointerdown", (e) => this.grab(e));
    fig.addEventListener("pointermove", (e) => this.drag(e));
    fig.addEventListener("pointerup", (e) => this.release(e));
    fig.addEventListener("pointercancel", (e) => this.release(e));
    fig.addEventListener("dblclick", () => this.roam());
  }

  get theme() { return this.skin === "pyro" ? "fire" : this.skin === "nova" ? "void" : "water"; }

  // ----- Same calls as Dot -----
  get figure() { return this.dot.figure; }
  // sayOverride: somewhere else shows the messages for now (the battle stage).
  say(text, opts) { if (this.sayOverride) return this.sayOverride(text, opts); this.dot.say(text, opts); }
  setMood(m, o) { this.dot.setMood(m, o); }
  hush() { this.dot.hush(); }
  typing() { this.dot.typing(); }
  setAccessory(list) { this.accessories = list; this.dot.setAccessory(list); }

  setSkin(skin) {
    if (skin === this.skin) return;
    this.root.replaceChildren();
    this.speaking = false;
    this.build(skin);
    this.dot.setMood("happy", { revertAfter: 2000 });
  }

  size() {
    const r = this.dot.figure.getBoundingClientRect();
    return { w: r.width || 92, h: r.height || 80 };
  }

  clampToScreen() {
    const { w, h } = this.size();
    this.x = clamp(this.x, MARGIN, innerWidth - w - MARGIN);
    this.y = clamp(this.y, MARGIN, innerHeight - h - MARGIN);
    this.place(0);
  }

  // ----- Wandering -----
  pickTarget() {
    const { w, h } = this.size();
    return { x: MARGIN + Math.random() * (innerWidth - w - 2 * MARGIN), y: 60 + Math.random() * (innerHeight - h - 60 - MARGIN) };
  }

  tick(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let bob = 0;
    if (this.dashing) { this.stepDash(now); this.place(0); requestAnimationFrame(this.tick); return; }   // PYRO snuffing out and relighting
    if (this.mode === "roam" && !this.speaking && !this.warping && !(this.skin === "pyro" && this.dot.playing)) {   // (he stays put while he is in an idle)
      if (this.wait > 0) this.wait -= dt;
      else {
        if (!this.target) { this.target = this.pickTarget(); this.maybeWarp(); }
        if (!this.target) { this.place(0); requestAnimationFrame(this.tick); return; }   // a warp took over this trip (it clears the target)
        if (this.skin === "pyro" && this.startDash()) { this.place(0); requestAnimationFrame(this.tick); return; }
        const dx = this.target.x - this.x, dy = this.target.y - this.y, dist = Math.hypot(dx, dy);
        if (dist < 2) { this.target = null; this.wait = 2 + Math.random() * 5; }
        else {
          const step = Math.min(dist, SPEED * dt);
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
          // A little hopping gait while he travels, with a jiggle.
          const before = Math.floor(this.phase / Math.PI);
          this.phase += dt * 7;
          const floats = this.skin === "nova" || this.skin === "pyro";   // NOVA and PYRO glide (for now); DOT hops
          if (!floats && Math.floor(this.phase / Math.PI) !== before && Math.floor(this.phase / Math.PI) % 2 === 0 && this.root.style.visibility !== "hidden") sound.sfx("hop", { theme: this.theme });   // every other landing
          bob = floats ? 0 : -Math.abs(Math.sin(this.phase)) * 5;
          this.dot.nudge((dx / dist) * 1.5, 0.012);
          // Face the way he's going (only when it's mostly sideways, so he doesn't flicker).
          if (Math.abs(dx / dist) > 0.25) this.dot.face(dx > 0 ? "right" : "left");
        }
      }
    }
    this.place(bob);
    requestAnimationFrame(this.tick);
  }

  // NOVA only: the warp is the third of her idles (with the orrery and the popcorn: one every
  // 20-40 s, never the same twice running; nova-mate.js). When her rotation picks it, she does it
  // on her next mostly-sideways trip (within 90 s), opening a portal ahead instead of walking.
  maybeWarp() {
    if (this.skin !== "nova" || this.warping || !this.warpWantedAt || this.dot.busy || this.root.style.visibility === "hidden") return;
    if (performance.now() - this.warpWantedAt > 90000) { this.warpWantedAt = 0; return; }
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    if (Math.abs(dx) < 120 || Math.abs(dx) < Math.abs(dy)) return;   // sideways trips only
    const dir = Math.sign(dx);
    if (!canWarp(this, dir)) return;
    this.warpWantedAt = 0;
    this.lastWarp = performance.now();
    this.warping = true; this.target = null;
    novaWarp(this, dir).finally(() => { this.warping = false; this.wait = 1.5; });
  }
  // PYRO's movement (Isaac 2026-10-24): on trips of 140 px or more he doesn't glide, he snuffs out and
  // relights. His flame sinks in chunky steps (flickering, eyes shut) until it is out, a beat of nothing,
  // then a tiny ember at the far spot grows back to his full flame. Shorter trips glide.
  startDash(force = false) {   // force: an idle is moving him on purpose (it counts as busy)
    if (!this.target || this.warping || (this.dot.busy && !force)) return false;
    const T = { x: this.target.x, y: this.target.y };
    if (Math.hypot(T.x - this.x, T.y - this.y) < 140) return false;
    this.dashing = { T, t0: performance.now(), moved: false };
    this.dot.face?.(T.x > this.x ? "right" : "left");
    return true;
  }
  stepDash() {
    const d = this.dashing, t = (performance.now() - d.t0) / 1000, m = this.dot;
    const OUT = 0.9, GONE = 0.4, PULSE = 0.4, GROW = 0.8, EMBER = 0.08;
    const back = (q) => { const c = 1.5, u = q - 1; return 1 + (c + 1) * u * u * u + c * u * u; };   // grows with a slight overshoot, then settles
    if (t < OUT) {   // sinks fast at first, slowly at the end, guttering as it goes
      const q = t / OUT, gutter = q > 0.15 && q < 0.95 ? 1 + 0.07 * Math.sin(t * 50) * (1 - q) : 1;
      m.snuff((EMBER + (1 - EMBER) * (1 - q) ** 1.8) * gutter, q > 0.06, 1, true);
    } else if (t < OUT + GONE) m.snuff(EMBER, true, 1 - (t - OUT) / GONE);   // the last ember dims out
    else {
      if (!d.moved) { d.moved = true; this.x = d.T.x; this.y = d.T.y; sound.sfx("flameIgnite", { theme: "fire" }); }
      const u = t - OUT - GONE;
      if (u < PULSE) m.snuff(EMBER * (1 + 0.55 * Math.max(0, Math.sin(u / PULSE * Math.PI * 2.4))), true, Math.min(1, u / 0.08));   // an ember flickers on
      else if (u < PULSE + GROW) {
        const q = (u - PULSE) / GROW;
        if (q > 0.35 && !d.flashed) { d.flashed = true; m.flash = 1; }
        m.snuff(Math.min(1.05, EMBER + (1 - EMBER) * back(q)), q < 0.45, 1);
      } else this.endDash(true);
    }
  }
  endDash(arrived) {
    const d = this.dashing; if (!d) return;
    this.dashing = null;
    this.dot.snuff?.(1, false);
    if (arrived) { this.x = d.T.x; this.y = d.T.y; }
    this.target = null; this.wait = 2 + Math.random() * 5;
  }
  // PYRO's rare idle (Isaac 2026-10-24): NOVA visits through her portal with a marshmallow, roasts it on him and leaves.
  // Only if she is won (Pet.hasNova, set by app.js) and there's room on one side of him.
  canVisit() {
    return !!Pet.hasNova?.() && this.skin === "pyro" && this.mode !== "held" && !this.dashing && !this.warping && !this.visiting && !this.speaking && !!visitSide(this);
  }
  async visitNova() {
    this.visiting = true;
    try { await novaVisit(this); } finally { this.visiting = false; this.wait = 1.5; }
  }
  // test hook: operandiPet.visitNow()
  visitNow() { return this.dot.idle?.("visit"); }
  // test hook: operandiPet.warpNow(1 | -1)
  warpNow(dir = this.x < innerWidth / 2 ? 1 : -1) {
    if (this.skin !== "nova" || this.warping) return;
    this.warping = true; this.target = null; this.lastWarp = performance.now();
    return novaWarp(this, dir).finally(() => { this.warping = false; this.wait = 1.5; });
  }
  place(bob = 0) {
    this.root.style.transform = `translate3d(${this.x.toFixed(1)}px, ${(this.y + bob).toFixed(1)}px, 0)`;
    if (this.speaking) this.placeBubble();
  }

  // Keep the speech bubble on screen: flip to the left near the right edge,
  // and below DOT near the top.
  placeBubble() {
    const { w } = this.size();
    this.root.classList.toggle("flip-x", this.x + w + 360 > innerWidth);
    this.root.classList.toggle("flip-y", this.y < 150);
  }

  // ----- Picking up and dropping -----
  grab(e) {
    if ((e.button !== undefined && e.button !== 0) || this.warping || this.visiting) return;
    if (this.dashing) this.endDash(false);   // picked up mid-snuff: he relights where he is
    e.preventDefault();
    this.dot.figure.setPointerCapture(e.pointerId);
    this.before = this.mode;
    this.mode = "held";
    this.grabbed = { dx: e.clientX - this.x, dy: e.clientY - this.y, px: e.clientX };
    this.dot.pickUp();
    sound.sfx("pickup", { theme: this.theme });
  }

  drag(e) {
    if (this.mode !== "held" || !this.grabbed) return;
    const { w, h } = this.size();
    this.x = clamp(e.clientX - this.grabbed.dx, MARGIN, innerWidth - w - MARGIN);
    this.y = clamp(e.clientY - this.grabbed.dy, MARGIN, innerHeight - h - MARGIN);
    this.dot.nudge(e.clientX - this.grabbed.px, 0.06);
    if (Math.abs(e.clientX - this.grabbed.px) > 3) this.dot.face(e.clientX > this.grabbed.px ? "right" : "left");
    this.grabbed.px = e.clientX;
    this.place(0);
  }

  release() {
    if (this.mode !== "held") return;
    this.grabbed = null;
    this.mode = "parked";
    this.target = null;
    this.dot.drop();
    sound.sfx("plop", { theme: this.theme });
    this.save();
    if (this.before === "roam" && this.voice) setTimeout(() => this.say(this.voice().parked().text, { mood: "happy" }), 900);
  }

  // Roaming switched off in Settings: he stays still in the bottom-right corner
  // (you can still drag him somewhere else), and double-click won't set him off.
  setRoaming(on) {
    this.fixed = !on;
    if (on) { if (this.mode !== "roam") { this.mode = "roam"; this.wait = 1; } }
    else {
      const { w, h } = this.size();
      this.mode = "parked"; this.target = null;
      this.x = innerWidth - w - MARGIN - 6; this.y = innerHeight - h - MARGIN - 6;
      this.place(0);
    }
    this.save();
  }

  roam() {
    if (this.mode === "roam" || this.fixed) return;
    this.mode = "roam";
    this.wait = 1.5;
    this.save();
    if (this.voice) this.say(this.voice().roamFree().text, { mood: "happy" });
  }

  save() {
    this.onPlace?.({ mode: this.mode === "held" ? "parked" : this.mode, x: this.x / innerWidth, y: this.y / innerHeight });
  }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
