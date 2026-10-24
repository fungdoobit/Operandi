// The Abyssal Maw wearing the boss interface the shared battle code expects (the same shape as PixelBoss for GOLEM):
//   figure (with a .boss-core marker), dome, b.name, hit(), charge(), special(), defeat(), win(), buildDome()/breakDome().
// Its defence is the Coil Shield: the arms swing round into a wall in front of the cat (the Firewall's job: halves every hit
// until a crit or a counter ability breaks it).
import { sound } from "../sound.js";

export class MawBoss {
  constructor({ golem, fx, figure }) {
    this.golem = golem; this.fx = fx; this.figure = figure;
    this.b = { name: "THE ABYSSAL MAW" };
    this.coreEl = document.createElement("div");
    this.coreEl.className = "boss-core";
    Object.assign(this.coreEl.style, { position: "absolute", width: "2px", height: "2px", pointerEvents: "none" });
    figure.append(this.coreEl);
    this.dome = { childElementCount: 0 };   // what the shared choreography checks
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }
  later(ms, f) { this.fx.wait(ms).then(f); }
  // the marker follows his mouth
  tick() {
    if (!this.figure.isConnected) return;
    const m = this.golem.mouthD ? this.golem.mouthD() : null;
    if (m && this.golem.foeLeft != null) { this.coreEl.style.left = m.x - this.golem.foeLeft + "px"; this.coreEl.style.top = m.y - this.golem.foeTop + "px"; }
    requestAnimationFrame(this.tick);
  }

  hit({ crit = false, blocked = false } = {}) {
    if (blocked && this.dome.childElementCount) { this.domeRipple(); return; }
    if (crit && this.dome.childElementCount) this.breakDome();
    this.golem.hurt({ crit });
  }

  // Telegraph a special: the mouth gapes, the arms tense and thrash.
  charge() {
    const g = this.golem;
    g.to({ tense: 1, writhe: 1.5, hy: 1 }, 450, "out");
    for (let i = 0; i < 5; i++) this.later(i * 240, () => { g.fxv.glitch = 0.35; g.to({ glitch: 0 }, 120, "lin", g.fxv); });
  }
  special(move) {
    const g = this.golem;
    g.rest(500);
    if (move === "firewall") this.buildDome();
  }

  // ---- Coil Shield ----
  buildDome() {
    sound.sfx("shield");
    this.dome.childElementCount = 1;
    this.golem.to({ shield: 1, writhe: 0.35 }, 650, "back");
  }
  domeRipple() { sound.sfx("block"); const g = this.golem; g.to({ shield: 0.9 }, 60, "out").then(() => g.to({ shield: 1 }, 260, "back")); g.fxv.flash = 0.3; g.to({ flash: 0 }, 200, "lin", g.fxv); }
  breakDome() {
    sound.sfx("shatter");
    this.dome.childElementCount = 0;
    const g = this.golem;
    g.to({ shield: 0, writhe: 1.6 }, 320, "out").then(() => g.to({ writhe: 0.55 }, 700, "io"));
    this.fx.sparks(this.fx.fromPage(g.point("core")), 22, { colors: ["#ffd6c8", "#f59a90", "#b83f3f"], power: 1.6, dir: -1 });
  }

  // Beaten: the arms go limp and sink, the cat shuts his mouth and falls asleep.
  defeat() {
    const g = this.golem;
    if (this.dome.childElementCount) this.breakDome();
    g.fxv.glitch = 1;
    g.to({ writhe: 0, shield: 0 }, 300, "out");
    g.to({ glitch: 0 }, 600, "lin", g.fxv);
    g.to({ tent: 0 }, 1500, "io");
    this.later(1000, () => g.to({ mouth: 0 }, 400, "io"));
    this.later(2200, () => g.setCat("sleep"));
  }
  // He won: the arms rear up and the mouth roars.
  win() {
    const g = this.golem;
    sound.sfx("roar");
    g.to({ writhe: 1.7, tense: 1 }, 400, "out").then(() => this.fx.wait(1300)).then(() => g.rest(700));
  }
}
