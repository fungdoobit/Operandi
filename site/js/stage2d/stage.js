// The lesson and challenge fights in 2D (PRD Addendum L): Kaela against the pixel-art enemies
// (foes.js) in the Green Forest. It has the same methods app.js uses on BattleStage
// (boss-fight.js), so the level-fight flow is unchanged: HP bars, mana, the card hand, damage
// numbers, messages, and the scenes (intro, attack, counter, spawn, victory, defeat).
// The GOLEM boss fight still uses BattleStage.
import { BATTLE_CSS } from "../boss-fight.js";
import { pickCard, CARDS_CSS } from "../cards.js";
import { MANA } from "../economy.js";
import { sound } from "../sound.js";
import { loadArt } from "./art.js";
import { createEngine } from "./engine.js";
import { KAELA_KIT } from "./kaela-kit.js";
import { FOES2D } from "./foes.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS2D = `
.b2d { position: absolute; inset: 0; }
.bhp.me.blood .fill { background: linear-gradient(90deg, #b0222a, #ff8a7a); }
`;

export class LevelStage2D {
  constructor(host, sayHost, { foe, max }) {
    this.isBoss = false;
    this.kit = KAELA_KIT;
    this.max = { ...max };
    this.sayHost = sayHost;
    if (!document.getElementById("battleCss")) { const st = document.createElement("style"); st.id = "battleCss"; st.textContent = BATTLE_CSS + CARDS_CSS; document.head.append(st); }
    if (!document.getElementById("battle2dCss")) { const st = document.createElement("style"); st.id = "battle2dCss"; st.textContent = CSS2D; document.head.append(st); }
    const name = FOES2D[foe]?.name || foe;
    host.innerHTML = `<div class="bstage" role="img" aria-label="Battle: Kaela against ${esc(name)}">
      <div class="b2d"></div>
      <div class="bhp me blood"><div class="row"><span>KAELA</span><small></small></div><div class="bar"><div class="fill"></div></div><div class="mana"><span>Mana</span><div class="mbar"><i></i></div><b>0</b></div></div>
      <div class="bhp foe"><div class="row"><span>${esc(name)}</span><small></small></div><div class="bar"><div class="fill"></div></div></div>
    </div>`;
    this.stage = host.querySelector(".bstage");
    const view = host.querySelector(".b2d");
    this.ready = loadArt("./").then((art) => {
      this.eng = createEngine(view, art, { ha: 180 });
      this.eng.setFoe(foe);
      for (const c of this.kit) c.img ??= this.eng.cardArt(c);   // the card pictures: her own poses
      return this.eng;
    });
    this.place();
    new ResizeObserver(() => this.place()).observe(this.stage);
    if (!sound.ready) {   // browsers keep sound off until you tap the page
      const b = document.createElement("button");
      b.className = "bsound"; b.type = "button"; b.textContent = "🔊 Tap for sound";
      b.addEventListener("click", () => sound.unlock());
      this.stage.append(b);
      sound.onReady(() => b.remove());
    }
  }

  // HP bars: clear of the ☰ button in the corner, text scaled to the band
  place() {
    const H = this.stage.clientHeight, W = this.stage.clientWidth; if (!H) return;
    const k = H / 440, mid = W / 2, left = 64, right = 14;
    Object.assign(this.stage.querySelector(".bhp.me").style, { left: left + "px", width: mid - 20 - left + "px" });
    Object.assign(this.stage.querySelector(".bhp.foe").style, { right: right + "px", width: mid - 20 - right + "px" });
    this.stage.style.setProperty("--k", Math.max(0.75, k).toFixed(3));
  }

  hp(me, foe) {
    this.lastHp = { me, foe };
    const set = (cls, v, max) => {
      this.stage.querySelector(`.bhp.${cls} .fill`).style.width = (v / max) * 100 + "%";
      this.stage.querySelector(`.bhp.${cls} small`).textContent = `${v} / ${max}`;
    };
    set("me", me, this.max.me); set("foe", foe, this.max.foe);
    sound.setDanger(1 - foe / this.max.foe, 1 - me / this.max.me);
  }
  mana(v) {
    this.stage.querySelector(".bhp.me .mana b").textContent = `${v} / ${MANA.cap}`;
    this.stage.querySelector(".bhp.me .mbar i").style.width = (v / MANA.cap) * 100 + "%";
  }
  async pickCard(f, opts) { await this.ready; return pickCard(this.stage, this.kit, f, { theme: "blood", ...opts }); }

  // a damage number popping up over someone ("-22", "CRIT -40", "MISS")
  number(text, who, kind = "") {
    if (!this.eng) return;
    const p = this.eng.where(who), n = document.createElement("div");
    n.className = "bnum " + kind; n.textContent = text;
    n.style.left = p.x + "px"; n.style.top = p.y + "px";
    this.stage.append(n);
    setTimeout(() => n.remove(), 1200);
    if (kind === "miss") sound.sfx("miss");
    if (kind === "ouch") sound.sfx("hurt");
  }
  say(text, { title, actions = [] } = {}) {
    const box = this.sayHost;
    box.hidden = false;
    box.innerHTML = `<button class="x" aria-label="Hide message">×</button>${title ? `<b>${esc(title)}</b>` : ""}<div>${text}</div>${actions.length ? `<div class="acts">${actions.map((a, i) => `<button class="btn${i === 0 ? " primary" : ""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}`;
    box.querySelector(".x").addEventListener("click", () => (box.hidden = true));
    box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => actions[+b.dataset.i].onClick()));
  }

  // ---- scenes ----
  async intro() { await this.ready; await this.eng.foeEnter(); }
  // the next wave: a new enemy steps in (its HP bar refills)
  async spawn(kind, hp) {
    await this.ready;
    const E = FOES2D[kind];
    this.max.foe = E.hp;
    this.stage.querySelector(".bhp.foe .row span").textContent = E.name;
    this.hp(this.lastHp?.me ?? this.max.me, hp ?? E.hp);
    this.eng.setFoe(kind);
    await this.eng.foeEnter();
  }
  // Kaela's card. strike = { result: "hit" | "crit", dmg }; onImpact runs when the last hit lands.
  // lethal: this blow kills, so the enemy starts dying on the last hit.
  async attack(strike, onImpact, card, { lethal = false } = {}) {
    await this.ready;
    const crit = strike.result === "crit";
    await this.eng.cast(card || this.kit[0], { finish: lethal, onHit: (i, last) => {
      if (!last) return;
      this.number(crit ? `CRIT -${strike.dmg}` : `-${strike.dmg}`, "foe", strike.result);
      onImpact?.();
    } });
  }
  // the enemy's turn: after a miss (MISS first), or striking back after her hit
  async counter(dmg, onImpact, { miss = false } = {}) {
    await this.ready;
    if (miss) { this.number("MISS", "me", "miss"); await new Promise((r) => setTimeout(r, 350)); }
    await this.eng.foeAttack({ onHit: () => { this.number(`-${dmg}`, "me", "ouch"); onImpact?.(); } });
  }
  staggered() { this.number("STAGGERED", "foe", "blocked"); }
  async victory() { await this.ready; await this.eng.foeDie(); sound.music("victory"); await this.eng.meWin(); }
  async beaten() { await this.ready; await this.eng.foeDie(); }
  async defeat() { await this.ready; await this.eng.meKO(); }
}
