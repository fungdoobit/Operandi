// Your teammate (DOT, PYRO or NOVA) as a little companion that roams the whole
// screen. Pick him up with the mouse or a finger, drop him anywhere and he
// plops down and stays parked there. Double-click to let him roam again.
// Exposes the same say/setMood/setAccessory calls as Dot, so the app can
// treat it like any teammate.

import { sound } from "./sound.js";
import { Dot } from "./dot.js";
import { NovaMate } from "./pixel/nova-mate.js";

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
    this.dot = skin === "nova" ? new NovaMate(this.root, { fast: Pet.fastIdles }) : new Dot(this.root, { skin });
    this.dot.setAccessory(this.accessories);
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
    if (this.mode === "roam" && !this.speaking) {
      if (this.wait > 0) this.wait -= dt;
      else {
        this.target ||= this.pickTarget();
        const dx = this.target.x - this.x, dy = this.target.y - this.y, dist = Math.hypot(dx, dy);
        if (dist < 2) { this.target = null; this.wait = 2 + Math.random() * 5; }
        else {
          const step = Math.min(dist, SPEED * dt);
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
          // A little hopping gait while he travels, with a jiggle.
          const before = Math.floor(this.phase / Math.PI);
          this.phase += dt * 7;
          const floats = this.skin === "nova";   // NOVA glides; DOT and PYRO hop
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
    if (e.button !== undefined && e.button !== 0) return;
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
