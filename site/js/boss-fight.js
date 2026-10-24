// The battle stage inside the course: hi-bit GOLEM, your teammate (DOT or
// PYRO), HP bars, damage numbers and your teammate's messages. The rules live
// in boss-rules.js; app.js decides what happens and calls these to show it.

import { BattleFX } from "./battle-fx.js";
import { Dot } from "./dot.js";
import * as M from "./battle-moves.js";
import { PixelGolem } from "./pixel/golem-px.js";
import { PixelBoss } from "./pixel/golem-boss.js";
import { golemAttack, golemIntro, golemSpecial } from "./pixel/golem-moves.js";
import { PixelMaw } from "./pixel/maw-px.js";
import { MawBoss } from "./pixel/maw-boss.js";
import { mawAttack, mawIntro, mawSpecial } from "./pixel/maw-moves.js";
import { SPECIALS } from "./boss-rules.js";
import { BOSS } from "./economy.js";
import { biomeBG } from "./pixel/biomes.js";
import { PixelEnemy, EnemyFoe } from "./pixel/enemy-px.js";
import { enemyAttack, enemyIntro, enemyDefeat } from "./pixel/enemy-moves.js";
import { ENEMIES, BIOMES } from "./enemies.js";
import { shortUltimate } from "./ult-short.js";
import { PixelFX } from "./pixel/pixel-fx.js";
import { ToonFX } from "./pixel/toon-fx.js";
import { NovaFighter } from "./pixel/nova-mate.js";
import { PyroFighter } from "./pixel/pyro-fighter.js";
import { PYRO_BOSS_KIT } from "./stage2d/pyro-boss-kit.js";
import { kitFor } from "./abilities.js";
import { pickCard, CARDS_CSS } from "./cards.js";
import { MANA } from "./economy.js";
import { sound, wireBattleSounds } from "./sound.js";
import { KaelaFighter } from "./stage2d/kaela-fighter.js";
import { KAELA_BOSS_KIT } from "./stage2d/kaela-boss-kit.js";

const GOLEM_W = 512, GOLEM_EXTRA = (GOLEM_W - 416) / 2;   // the extra width on each side of him, in art px
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const BATTLE_CSS = `
/* The stage fills the whole battle band, edge to edge. */
.bstage { position: relative; height: 100%; width: 100%; overflow: hidden;
  background: #06070c; color: #e9ecf2; }   /* only shows at the edges when the camera shakes */
.bworld { position: absolute; inset: 0; will-change: transform; }
.bfloor { display: none; }   /* the arena background draws the floor now */
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
.bhp.me.void .fill { background: linear-gradient(90deg, #6a35c8, #cba2ff); }
.bhp.me.blood .fill { background: linear-gradient(90deg, #b0222a, #ff7868); }
/* Mana (Addendum J): a thin bar of gems under your HP bar. */
.bhp .mana { display: flex; align-items: center; gap: calc(6px * var(--k, 1)); font-size: max(10px, calc(11px * var(--k, 1))); color: #9be7ff; }
.bhp .mana .mbar { flex: 1; height: calc(6px * var(--k, 1)); border-radius: 99px; background: #1a2333; overflow: hidden; }
.bhp .mana .mbar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #2a68d8, #9be7ff); transition: width .5s; }
.bhp.foe .fill { background: linear-gradient(90deg, #ff9a3c, #ffd28a); margin-left: auto; }
.bsound { position: absolute; z-index: 23; left: 50%; bottom: 10px; transform: translateX(-50%); border: 1px solid #ffffff40; background: #0d0f14cc; color: #fff; border-radius: 99px; padding: 6px 14px; font: 600 13px var(--font-body, sans-serif); }
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
  sound.sfx("swoosh");
  const t0 = performance.now();
  await new Promise((done) => {
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); set(1 + k * k * 47); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  });
}

export class BattleStage {
  // host: where the stage goes. sayHost: where your teammate's messages go.
  // foe: "golem" (the boss) or a small enemy's kind (enemies.js), fought in its
  // biome (PRD Addendum K). max: the HP bars' full values.
  constructor(host, sayHost, { skin = "dot", accessories = [], name, foe = "golem", biome, max, entering = false } = {}) {
    this.isBoss = foe === "golem" || foe === "maw";
    this.maw = foe === "maw";   // Module 2's boss: THE ABYSSAL MAW (pixel/maw-px.js)
    this.enemy = this.isBoss ? null : ENEMIES[foe];
    name ??= this.maw ? "THE ABYSSAL MAW" : this.isBoss ? "GOLEM" : this.enemy.name;
    if (this.maw && entering) name = "MITTENS";   // the Maw is only a cat until he opens his mouth (his entrance renames him)
    this.max = max || { me: BOSS.hp, foe: this.isBoss ? BOSS.hp : this.enemy.hp };
    ensureFilters();
    if (!document.getElementById("battleCss")) { const st = document.createElement("style"); st.id = "battleCss"; st.textContent = BATTLE_CSS + CARDS_CSS; document.head.append(st); }
    const who = { pyro: "PYRO", nova: "NOVA", kaela: "KAELA" }[skin] || "DOT";
    host.innerHTML = `<div class="bstage" role="img" aria-label="${this.isBoss ? "Boss battle" : "Battle"}: ${who} against ${esc(name)}">
      <div class="bworld"><div class="bfloor"></div><div class="bfoe"></div><div class="bmate"></div></div>
      <div class="bhp me ${{ pyro: "fire", nova: "void", kaela: "blood" }[skin] || ""}"><div class="row"><span>${who}</span><small></small></div><div class="bar"><div class="fill"></div></div><div class="mana"><span>Mana</span><div class="mbar"><i></i></div><b>0</b></div></div>
      <div class="bhp foe"><div class="row"><span>${esc(name)}</span><small></small></div><div class="bar"><div class="fill"></div></div></div>
    </div>`;
    this.sayHost = sayHost;
    this.stage = host.querySelector(".bstage");
    const world = host.querySelector(".bworld"), foeEl = host.querySelector(".bfoe"), mateEl = host.querySelector(".bmate");
    // the Sunken Foundry for GOLEM (pixel/arena-bg.js), else the enemy's biome (pixel/biomes.js); it shakes with the camera
    this.bg = biomeBG(world, this.isBoss ? (biome || (this.maw ? "dusk" : "foundry")) : biome || this.enemy.biome);
    this.fx = new BattleFX(this.stage, world, { floor: 0.8 });
    // 512 art px wide (default 416): room for his arms when they swing out, so they don't run off his canvas
    if (this.maw) {
      this.golem = new PixelMaw(foeEl);
      this.boss = new MawBoss({ golem: this.golem, fx: this.fx, figure: foeEl });
    } else if (this.isBoss) {
      this.golem = new PixelGolem(foeEl, { px: 1, w: GOLEM_W, chunk: 2, flat: true });   // the 2D GOLEM (Addendum M): 2-px art pixels like everyone else, flat tones
      this.boss = new PixelBoss({ golem: this.golem, fx: this.fx, figure: foeEl });
    } else {
      // a small enemy: the same interface as GOLEM (enemy-px.js), so every ability works on it
      this.golem = new PixelEnemy(foeEl, foe);
      this.boss = new EnemyFoe({ model: this.golem, fx: this.fx, figure: foeEl, name });
    }
    // NOVA fights as her pixel self (NovaFighter), Kaela as her sprite (stage2d/kaela-fighter.js); DOT and PYRO share dot.js
    this.dot = skin === "nova" ? new NovaFighter(mateEl) : skin === "pyro" ? new PyroFighter(mateEl) : skin === "kaela" ? new KaelaFighter(mateEl) : new Dot(mateEl, { facing: "right", battle: true, skin });
    this.dot.setAccessory(accessories);
    this.px = new PixelFX(world);   // hi-bit effects for the abilities (pixel/pixel-fx.js)
    this.pxBack = new PixelFX(world, { z: 0, before: foeEl });   // a layer behind the fighters (the far side of a portal...)
    this.toon = new ToonFX(world);   // cel-shaded fire, smoke and shadow on the GPU (pixel/toon-fx.js)
    this.toonBack = new ToonFX(world, { z: 0, before: foeEl });   // the same, behind the fighters (a black hole he's pulled into)
    this.pxTop = new PixelFX(world, { z: 8 });   // over the toon layer: eyes, sparks, star-flashes
    // 3D props already in pixel art (props-px.js): in front of everything, and behind GOLEM (the back of a chain's coil)
    this.spr = new PixelFX(world, { z: 9, raw: true });
    this.sprBack = new PixelFX(world, { z: 0, before: foeEl, raw: true });
    this.kit = skin === "kaela" ? KAELA_BOSS_KIT : skin === "pyro" ? PYRO_BOSS_KIT : kitFor(skin);
    this.ctx = { skin, isBoss: this.isBoss, fx: this.fx, px: this.px, pxBack: this.pxBack, pxTop: this.pxTop, spr: this.spr, sprBack: this.sprBack, toon: this.toon, toonBack: this.toonBack, foeEl, dot: this.dot, boss: this.boss, golem: this.golem, mateEl, theme: { pyro: "fire", nova: "void", kaela: "blood" }[skin] || "water", heat: (a) => this.addHeat(a) };
    this.ctx.setName = (n) => { this.stage.querySelector(".bhp.foe .row span").textContent = n; this.boss.b.name = n; };   // the Maw is called MITTENS until he opens his mouth
    this.heatAmt = 0;
    this.fx.place(mateEl, { x: 0, y: 0 });
    wireBattleSounds(this.fx, this.ctx.theme);
    sound.music(this.isBoss ? "battle" : biome || this.enemy.biome);   // each biome has its own theme (Addendum K)
    // Browsers keep sound off until you tap the page. If you came straight
    // here (a page load), offer a button for it.
    if (!sound.ready) {
      const b = document.createElement("button");
      b.className = "bsound"; b.type = "button"; b.textContent = "🔊 Tap for sound";
      b.addEventListener("click", () => sound.unlock());
      this.stage.append(b);
      sound.onReady(() => b.remove());
    }
    this.foeEl = foeEl; this.mateEl = mateEl; this.world = world;
    // Everything was designed at a 440 px tall stage: scale GOLEM, your
    // teammate and their spots to the real height, so big screens get big fighters.
    this.fit();
    new ResizeObserver(() => this.fit()).observe(this.stage);
  }

  // The battle world is laid out at the size it was designed for (440 px tall,
  // as wide as the band's shape needs) and then scaled to the band as a whole
  // (BattleFX's camera adds the scale), so GOLEM, your teammate and every effect
  // stay in proportion on any screen (Isaac 2026-10-21: on a short band the
  // effects were drawn too big for him).
  fit() {
    const H = this.stage.clientHeight;
    if (!H) return;
    const k = H / 440, W = this.stage.clientWidth, Wd = W / k, Hd = 440;
    Object.assign(this.world.style, { right: "auto", bottom: "auto", width: Wd + "px", height: Hd + "px" });
    this.fx.k = k;
    // The fighters stay in a fight zone in the middle (at most 3.6× as wide as
    // tall), so on wide screens they don't end up miles apart.
    const zone = Math.min(Wd, Hd * 3.6), edge = (Wd - zone) / 2;
    this.golem.setPx(1);
    if (this.maw) { /* the Maw lays himself out at the end of fit(), once your teammate is in place */ }
    else if (this.isBoss) Object.assign(this.foeEl.style, { right: edge + (6 - GOLEM_EXTRA) + "px", bottom: 0.2 * Hd - 17 + "px" });
    else {   // a small enemy stands on the floor line, centred about four-fifths across the fight zone
      const cw = this.golem.canvas.width;
      Object.assign(this.foeEl.style, { right: Math.max(0, edge + zone * 0.2 - cw / 2) + "px", bottom: 0.2 * Hd - this.golem.footPx + "px" });
    }
    this.mateEl.style.left = edge + zone * 0.06 + "px";
    // HP bars (on the stage itself, in real pixels) line up with the zone, clear of the ☰ button in the corner.
    const left = Math.max(64, (edge + 14) * k), right = Math.max(14, (edge + 14) * k), mid = W / 2;
    Object.assign(this.stage.querySelector(".bhp.me").style, { left: left + "px", width: mid - 20 - left + "px" });
    Object.assign(this.stage.querySelector(".bhp.foe").style, { right: right + "px", width: mid - 20 - right + "px" });
    this.stage.style.setProperty("--k", k.toFixed(3));   // text on the stage scales too
    this.mateEl.style.bottom = 0.2 * Hd - 6 + "px";
    if (this.dot.resize) this.dot.resize(72); else this.dot.figure.style.width = "65px";
    // the Maw sits on the same floor level as your teammate's feet (and his arms reach across the whole world)
    if (this.maw) {
      // the visible base of the fighter's body (its canvas reaches below its box)
      const cv = this.dot.figure.querySelector("canvas") || this.dot.figure, cr = cv.getBoundingClientRect(), feet = this.fx.fromPage({ x: cr.left, y: cr.bottom }).y - 10;
      this.golem.layout(Wd, Hd, Number.isFinite(feet) ? feet : this.fx.floorY, edge + 56);
    }
  }

  // PYRO's fire heats GOLEM's stone: every fire card makes him glow a little redder for the rest of the fight (looks only).
  addHeat(a = 0.1) {
    this.heatAmt = Math.min(1, (this.heatAmt || 0) + a);
    const h = this.heatAmt;
    this.golem.canvas.style.filter = `sepia(${(h * 0.45).toFixed(2)}) saturate(${(1 + h * 2).toFixed(2)}) hue-rotate(${(-h * 14).toFixed(0)}deg) brightness(${(1 + h * 0.1).toFixed(2)}) drop-shadow(0 0 ${(4 + h * 12).toFixed(0)}px rgba(255, 96, 28, ${(h * 0.75).toFixed(2)}))`;
  }

  hp(me, foe) {
    this.lastHp = { me, foe };
    const set = (cls, v, max) => {
      this.stage.querySelector(`.bhp.${cls} .fill`).style.width = (v / max) * 100 + "%";
      this.stage.querySelector(`.bhp.${cls} small`).textContent = `${v} / ${max}`;
    };
    set("me", me, this.max.me); set("foe", foe, this.max.foe);
    sound.setDanger(1 - foe / this.max.foe, 1 - me / this.max.me);   // the music gets tenser as either side weakens
  }

  mana(v) {
    this.stage.querySelector(".bhp.me .mana b").textContent = `${v} / ${MANA.cap}`;
    this.stage.querySelector(".bhp.me .mbar i").style.width = (v / MANA.cap) * 100 + "%";
  }

  // The card hand: resolves with the card you cast (cards.js).
  pickCard(f, opts) { return pickCard(this.stage, this.kit, f, { theme: this.ctx.theme, ...opts }); }

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
    if (kind === "miss") sound.sfx("miss");
    if (kind === "ouch") sound.sfx("hurt");
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
  intro() { return this.maw ? mawIntro(this.ctx) : this.isBoss ? golemIntro(this.ctx) : enemyIntro(this.ctx); }

  // The next wave: a new enemy steps in (its HP bar refills).
  async spawn(kind, hp) {
    this.enemy = ENEMIES[kind];
    this.golem.setKind(kind);
    this.boss.b.name = this.enemy.name;
    this.max.foe = this.enemy.hp;
    this.stage.querySelector(".bhp.foe .row span").textContent = this.enemy.name;
    this.fit();
    this.hp(this.lastHp?.me ?? this.max.me, hp ?? this.enemy.hp);
    await enemyIntro(this.ctx);
  }

  // Your strike. strike = { result: "hit" | "crit" | "blocked", dmg }; onImpact runs when it lands.
  // card = the ability card cast (abilities.js); without one, the first in the kit.
  // lethal: this blow finishes him, so a move that normally lets him escape
  // (Grasp, Chains, Planetfall) kills him instead and calls s.died().
  async attack(strike, onImpact, card, { short = false, lethal = false } = {}) {
    this.foeGone = false;
    const crit = strike.result === "crit";
    let landed = false, shown = 0;
    const land = () => {
      landed = true;
      if (shown) {   // the earlier chunks already showed: this is the last one
        this.number(crit ? `CRIT -${strike.dmg - shown}` : `-${strike.dmg - shown}`, "foe", strike.result);
        onImpact?.();
        return;
      }
      this.number(crit ? `CRIT -${strike.dmg}` : strike.result === "blocked" ? `BLOCKED -${strike.dmg}` : `-${strike.dmg}`, "foe", strike.result);
      onImpact?.();
    };
    const onHit = (n) => {
      const final = !crit || n === 2;
      const dome = this.boss.dome.childElementCount > 0;
      let result;
      if (dome && !(crit && n === 2)) { this.boss.hit({ blocked: true }); result = "blocked"; }
      else { this.boss.hit({ crit: crit && n === 2 }); result = crit && n === 2 ? "crit" : "hit"; }
      if (final && !landed) land();
      return result;
    };
    // A move that hits in several blows shows each chunk as it lands; the last
    // onHit shows what's left (Planetfall: Venus, Mars, then Uranus).
    const chunk = (frac) => {
      const d = Math.round(strike.dmg * frac);
      shown += d;
      this.boss.hit({ crit: false });
      this.number(`-${d}`, "foe", strike.result === "blocked" ? "blocked" : "hit");
      if (this.lastHp) this.hp(this.lastHp.me, Math.max(0, this.lastHp.foe - d));
    };
    await this.ability(card || this.kit[0], onHit, crit, chunk, { short, lethal, hpBefore: this.lastHp?.foe ?? 0, dmg: strike.dmg });
    if (!landed) land();   // a move with a single hit that was a crit
  }

  // Play one ability from the teammate's kit.
  // short: the quick version of an ultimate (after the first time each day, Addendum K).
  async ability(a, onHit = () => "hit", crit = false, chunk = () => {}, { short = false, lethal = false, hpBefore = 0, dmg = 0 } = {}) {
    const { fx, px, golem, dot } = this.ctx;
    const died = () => { this.foeGone = true; };
    await (short ? (s) => shortUltimate(s, a) : a.run)({ ...this.ctx, crit, chunk, lethal: lethal && this.isBoss, hpBefore, dmg, died, mate: dot, P: (name) => fx.fromPage(golem.point(name)),
      Pt: (L, part) => fx.fromPage(golem.pagePoint(L, part)),
      mateC: () => fx.at(dot.figure, { fy: 0.55 }), golemC: () => fx.fromPage(golem.point("core")), onHit, px });
  }

  // GOLEM's turn: after a miss (the MISS label first), or striking back after your hit.
  async counter(dmg, onImpact, { miss = false } = {}) {
    if (miss) { this.number("MISS", "me", "miss"); await this.fx.wait(350); }
    else await this.fx.wait(250);
    const onHit = () => { this.number(`-${dmg}`, "me", "ouch"); onImpact?.(); };
    if (this.maw) await mawAttack(this.ctx, null, { onHit });
    else if (this.isBoss) await golemAttack(this.ctx, null, { onHit });
    else await enemyAttack(this.ctx, this.enemy, { onHit });
  }
  // A crit staggers him: no strike back this turn.
  staggered() {
    this.number("STAGGERED", "foe", "blocked");
    this.golem.fxv.glitch = 1; this.golem.to({ glitch: 0 }, 500, "lin", this.golem.fxv);
  }

  special(kind) { return (this.maw ? mawSpecial : golemSpecial)(this.ctx, kind, SPECIALS[kind]); }
  // Put a standing Firewall back after a reload.
  restoreDome() { this.boss.buildDome(); }
  async victory() {
    if (!this.isBoss) { await enemyDefeat(this.ctx); await M.teammateWin(this.ctx); return; }
    // the finishing move already killed him on screen (dragged under, ripped apart, crushed)
    if (this.foeGone) { sound.music("victory"); await M.teammateWin(this.ctx); return; }
    sound.music(null); await M.bossDefeat(this.ctx); sound.music("victory");
  }
  // An enemy beaten mid-level (another one is coming).
  beaten() { return enemyDefeat(this.ctx); }
  async defeat() {
    if (!this.isBoss) { await M.teammateKO(this.ctx); this.boss.win(); await this.fx.wait(1200); return; }
    sound.music("defeat"); await M.bossWin(this.ctx);
  }
}
