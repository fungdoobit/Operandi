// The battle stage inside the course: hi-bit GOLEM, your teammate (DOT or
// PYRO), HP bars, damage numbers and your teammate's messages. The rules live
// in boss-rules.js; app.js decides what happens and calls these to show it.

import { BattleFX } from "./battle-fx.js";
import { Dot } from "./dot.js";
import * as M from "./battle-moves.js";
import { PixelGolem } from "./pixel/golem-px.js";
import { PixelBoss } from "./pixel/golem-boss.js";
import { golemAttack, golemIntro, golemSpecial } from "./pixel/golem-moves.js";
import { SPECIALS } from "./boss-rules.js";
import { BOSS } from "./economy.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const BATTLE_CSS = `
/* The stage fills the whole battle band, edge to edge. */
.bstage { position: relative; height: 100%; width: 100%; overflow: hidden;
  background: radial-gradient(ellipse at 70% 35%, #1d2330, #12151c 70%); color: #e9ecf2; }
.bworld { position: absolute; inset: 0; will-change: transform; }
.bfloor { position: absolute; left: 0; right: 0; top: 80%; bottom: 0; background: linear-gradient(#171b24, #0e1015); border-top: 1px solid #2c3442; }
.bfoe { position: absolute; }
.bmate { position: absolute; }
.bmate .dot-bubble { display: none; }
/* Effects and the teammate: hard pixel edges, no anti-aliasing. (An SVG filter
   gave a chunkier look, but browsers redo it on the CPU every frame: it made
   Chrome lag and Safari drop or delay effects.) */
.bstage .fx-layer, .bmate svg { shape-rendering: crispEdges; }
/* Bolder face lines so his eyes and mouth read at this size. */
.bmate .eye-white, .bmate .eye-angry { stroke-width: 6; }
.bmate .eye-line, .bmate .dot-mouth { stroke-width: 6; }
.bhp { position: absolute; top: calc(12px * var(--k, 1)); width: 40%; font: 600 max(11px, calc(13px * var(--k, 1))) var(--font-body, sans-serif); display: flex; flex-direction: column; gap: calc(5px * var(--k, 1)); z-index: 22; }
.bhp.foe { text-align: right; }
.bhp .row { display: flex; justify-content: space-between; } .bhp.foe .row { flex-direction: row-reverse; }
.bhp small { color: #9ea6b5; font-weight: 500; }
.bhp .bar { height: calc(10px * var(--k, 1)); border-radius: 99px; background: #262c38; overflow: hidden; }
.bhp .fill { height: 100%; width: 100%; border-radius: 99px; transition: width .5s cubic-bezier(.3,1.2,.5,1); }
.bhp.me .fill { background: linear-gradient(90deg, #5bb7e4, #b3ebfc); }
.bhp.me.fire .fill { background: linear-gradient(90deg, #ff7a2f, #ffd28a); }
.bhp.foe .fill { background: linear-gradient(90deg, #ff9a3c, #ffd28a); margin-left: auto; }
.bnum { position: absolute; z-index: 21; pointer-events: none; transform: translate(-50%, -50%); font: 800 calc(24px * var(--k, 1)) var(--font-display, sans-serif); color: #fff;
  text-shadow: 0 2px 0 #0009, 0 0 12px #000a; white-space: nowrap; animation: bnum 1.1s cubic-bezier(.2,.9,.3,1) forwards; }
.bnum.crit { font-size: calc(34px * var(--k, 1)); color: #ffd662; } .bnum.blocked { color: #ffb366; } .bnum.miss { color: #9ea6b5; font-size: calc(20px * var(--k, 1)); } .bnum.ouch { color: #ff7a7a; }
@keyframes bnum { 0% { opacity: 0; margin-top: 10px; scale: .6; } 15% { opacity: 1; scale: 1.15; } 30% { scale: 1; } 75% { opacity: 1; } 100% { opacity: 0; margin-top: -46px; } }
.bsay { position: sticky; top: 0; z-index: 3; margin: 0 0 14px; padding: 12px 36px 12px 16px; box-shadow: 0 6px 18px #0001; border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 10px; background: var(--surface); }
.bsay b { display: block; margin-bottom: 2px; }
.bsay .x { position: absolute; top: 6px; right: 6px; border: 0; background: transparent; color: var(--muted); font-size: 18px; width: 28px; height: 28px; border-radius: 6px; }
.bsay .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.bspecial { margin: 0 0 14px; padding: 10px 14px; border-radius: 10px; background: #2a1a12; color: #ffd6c2; border: 1px solid #ff6a3d; font-weight: 600; }
`;

// The #pixelate SVG filter (any HTML into big blocks), used once by the entry transition.
function ensureFilters() {
  if (document.getElementById("pixelate")) return;
  const d = document.createElement("div");
  d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="pixelate" x="0" y="0" width="100%" height="100%">
      <feGaussianBlur id="pxBlur" in="SourceGraphic" stdDeviation="0" result="soft" />
      <feFlood id="pxFlood" x="0" y="0" width="2" height="2" />
      <feComposite id="pxComp" width="4" height="4" />
      <feTile result="dots" />
      <feComposite in="soft" in2="dots" operator="in" />
      <feMorphology id="pxMorph" operator="dilate" radius="2" />
    </filter></svg>`;
  document.body.append(d.firstElementChild);
}

// The entry transition, first half: the page breaks up into big blocks.
export async function pixelateOut(el, ms = 650) {
  ensureFilters();
  const set = (b) => {
    b = Math.max(1, Math.round(b));
    document.getElementById("pxFlood").setAttribute("x", b / 2); document.getElementById("pxFlood").setAttribute("y", b / 2);
    document.getElementById("pxComp").setAttribute("width", b); document.getElementById("pxComp").setAttribute("height", b);
    document.getElementById("pxMorph").setAttribute("radius", b / 2);
    document.getElementById("pxBlur").setAttribute("stdDeviation", b / 3);
  };
  set(1); el.style.filter = "url(#pixelate)";
  const t0 = performance.now();
  await new Promise((done) => {
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); set(1 + k * k * 47); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  });
}

export class BattleStage {
  // host: where the stage goes. sayHost: where your teammate's messages go.
  constructor(host, sayHost, { skin = "dot", accessories = [], name = "GOLEM" } = {}) {
    ensureFilters();
    if (!document.getElementById("battleCss")) { const st = document.createElement("style"); st.id = "battleCss"; st.textContent = BATTLE_CSS; document.head.append(st); }
    const who = skin === "pyro" ? "PYRO" : "DOT";
    host.innerHTML = `<div class="bstage" role="img" aria-label="Boss battle: ${who} against ${esc(name)}">
      <div class="bworld"><div class="bfloor"></div><div class="bfoe"></div><div class="bmate"></div></div>
      <div class="bhp me ${skin === "pyro" ? "fire" : ""}"><div class="row"><span>${who}</span><small></small></div><div class="bar"><div class="fill"></div></div></div>
      <div class="bhp foe"><div class="row"><span>${esc(name)}</span><small></small></div><div class="bar"><div class="fill"></div></div></div>
    </div>`;
    this.sayHost = sayHost;
    this.stage = host.querySelector(".bstage");
    const world = host.querySelector(".bworld"), foeEl = host.querySelector(".bfoe"), mateEl = host.querySelector(".bmate");
    this.fx = new BattleFX(this.stage, world, { floor: 0.8 });
    this.golem = new PixelGolem(foeEl, { px: 1 });
    this.boss = new PixelBoss({ golem: this.golem, fx: this.fx, figure: foeEl });
    this.dot = new Dot(mateEl, { facing: "right", battle: true, skin });
    this.dot.setAccessory(accessories);
    this.ctx = { fx: this.fx, dot: this.dot, boss: this.boss, golem: this.golem, mateEl, theme: skin === "pyro" ? "fire" : "water" };
    this.fx.place(mateEl, { x: 0, y: 0 });
    this.foeEl = foeEl; this.mateEl = mateEl;
    // Everything was designed at a 440 px tall stage: scale GOLEM, your
    // teammate and their spots to the real height, so big screens get big fighters.
    this.fit();
    new ResizeObserver(() => this.fit()).observe(this.stage);
  }

  fit() {
    const H = this.stage.clientHeight;
    if (!H) return;
    const k = H / 440, W = this.stage.clientWidth;
    // The fighters stay in a fight zone in the middle (at most 2.4× as wide as
    // tall), so on wide screens they don't end up miles apart.
    const zone = Math.min(W, H * 2.4), edge = (W - zone) / 2;
    this.golem.setPx(k);
    Object.assign(this.foeEl.style, { right: edge + 6 * k + "px", bottom: 0.2 * H - 17 * k + "px" });
    this.mateEl.style.left = edge + zone * 0.06 + "px";
    // HP bars line up with the zone, clear of the ☰ button in the corner.
    const left = Math.max(64, edge + 14 * k), right = Math.max(14, edge + 14 * k), mid = W / 2;
    Object.assign(this.stage.querySelector(".bhp.me").style, { left: left + "px", width: mid - 20 - left + "px" });
    Object.assign(this.stage.querySelector(".bhp.foe").style, { right: right + "px", width: mid - 20 - right + "px" });
    this.stage.style.setProperty("--k", k.toFixed(3));   // text on the stage scales too
    this.mateEl.style.bottom = 0.2 * H - 6 * k + "px";
    this.dot.figure.style.width = 65 * k + "px";
  }

  hp(me, foe) {
    const set = (cls, v) => {
      this.stage.querySelector(`.bhp.${cls} .fill`).style.width = (v / BOSS.hp) * 100 + "%";
      this.stage.querySelector(`.bhp.${cls} small`).textContent = `${v} / ${BOSS.hp}`;
    };
    set("me", me); set("foe", foe);
  }

  // A damage number popping up over someone ("-22", "CRIT -40", "MISS").
  number(text, who, kind = "") {
    const el = who === "foe" ? this.golem.canvas : this.dot.figure;
    const r = el.getBoundingClientRect(), st = this.stage.getBoundingClientRect();
    const n = document.createElement("div");
    n.className = "bnum " + kind;
    n.textContent = text;
    n.style.left = (who === "foe" ? r.left + r.width * 0.45 : r.left + r.width / 2) - st.left + "px";
    n.style.top = (who === "foe" ? r.top + r.height * 0.3 : r.top) - st.top + "px";
    this.stage.append(n);
    setTimeout(() => n.remove(), 1200);
  }

  // Your teammate's messages, shown under the stage while the roaming pet is away.
  say(text, { title, mood, actions = [] } = {}) {
    const box = this.sayHost;
    box.hidden = false;
    box.innerHTML = `<button class="x" aria-label="Hide message">×</button>${title ? `<b>${esc(title)}</b>` : ""}<div>${text}</div>${actions.length ? `<div class="acts">${actions.map((a, i) => `<button class="btn${i === 0 ? " primary" : ""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}`;
    box.querySelector(".x").addEventListener("click", () => (box.hidden = true));
    box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => actions[+b.dataset.i].onClick()));
    if (mood && !["idle", "thinking"].includes(mood)) this.dot.setMood(mood, { revertAfter: 1800 });
  }

  // ---- Scenes ----
  intro() { return golemIntro(this.ctx); }

  // Your strike. strike = { result: "hit" | "crit" | "blocked", dmg }; onImpact runs when it lands.
  async attack(strike, onImpact) {
    const crit = strike.result === "crit";
    let landed = false;
    await M.teammateAttack(this.ctx, { crit, onHit: (n) => {
      const final = !crit || n === 2;
      const dome = this.boss.dome.childElementCount > 0;
      let result;
      if (dome && !(crit && n === 2)) { this.boss.hit({ blocked: true }); result = "blocked"; }
      else { this.boss.hit({ crit: crit && n === 2 }); result = crit && n === 2 ? "crit" : "hit"; }
      if (final && !landed) {
        landed = true;
        // A blocked hit uses up the Firewall.
        if (strike.result === "blocked") this.fx.wait(380).then(() => this.boss.dome.childElementCount && this.boss.breakDome());
        this.number(crit ? `CRIT -${strike.dmg}` : strike.result === "blocked" ? `BLOCKED -${strike.dmg}` : `-${strike.dmg}`, "foe", strike.result);
        onImpact?.();
      }
      return result;
    } });
  }

  // GOLEM's turn: after a miss (the MISS label first), or striking back after your hit.
  async counter(dmg, onImpact, { miss = false } = {}) {
    if (miss) { this.number("MISS", "me", "miss"); await this.fx.wait(350); }
    else await this.fx.wait(250);
    await golemAttack(this.ctx, null, { onHit: () => { this.number(`-${dmg}`, "me", "ouch"); onImpact?.(); } });
  }
  // A crit staggers him: no strike back this turn.
  staggered() {
    this.number("STAGGERED", "foe", "blocked");
    this.golem.fxv.glitch = 1; this.golem.to({ glitch: 0 }, 500, "lin", this.golem.fxv);
  }

  special(kind) { return golemSpecial(this.ctx, kind, SPECIALS[kind]); }
  // Put a standing Firewall back after a reload.
  restoreDome() { this.boss.buildDome(); }
  victory() { return M.bossDefeat(this.ctx); }
  async defeat() { await M.bossWin(this.ctx); }
}
