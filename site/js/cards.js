// The ability card hand in boss fights (PRD Addendum J). After a pass the
// teammate's cards fan out over the bottom of the battle:
//   - hover lifts a card
//   - left click casts it (Isaac 2026-10-21; it was the other way round at first)
//   - right click flips it to read what it does (the back has a Cast button too)
//   - touch screens: a tap flips, press and hold casts
// Each card shows its art (painted with the battle's cel-effects shader), its
// mana cost, tier and damage, and a cooldown counter when it's resting.
import { TIERS, MANA, BOSS } from "./economy.js";
import { cantCast } from "./boss-rules.js";
import { toonStill } from "./pixel/toon-fx.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Card colours per teammate theme: [card body, edge, glow].
const LOOK = { void: ["#170a2c", "#a066f0", "#7838d0", "#5a2fa0"], fire: ["#2a0f06", "#ff8a2a", "#d0401a", "#6a2410"], water: ["#071c34", "#5fd0ff", "#2f8fe0", "#1d4f86"] };

export const CARDS_CSS = `
.bhand { position: fixed; z-index: 60; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.bhand .hbar { pointer-events: auto; display: flex; gap: 14px; align-items: center; margin-bottom: 10px; padding: 7px 14px; border-radius: 99px;
  background: #0b0d14e6; border: 1px solid #ffffff22; color: #e9ecf2; font: 600 13px var(--font-body, system-ui, sans-serif); box-shadow: 0 6px 24px #0008; }
.bhand .hbar b { font-family: var(--font-display, system-ui); font-size: 15px; }
.bhand .hbar .crit { color: #ffd662; }
.bhand .hbar .how { color: #9aa3b5; font-weight: 500; }
.bhand .row { display: flex; justify-content: center; align-items: flex-end; pointer-events: auto; }
.bcard { --w: clamp(100px, 8.2vw, 132px); width: var(--w); height: calc(var(--w) * 1.42); margin: 0 calc(var(--w) * -0.06);
  perspective: 900px; cursor: pointer; transform: translateY(var(--dy, 0)) rotate(var(--rot, 0deg)); transform-origin: 50% 120%;
  transition: transform .22s cubic-bezier(.3,1.4,.5,1), filter .2s; outline: none; animation: bcardIn .45s cubic-bezier(.2,1.2,.4,1) backwards; animation-delay: var(--delay, 0s); }
@keyframes bcardIn { from { transform: translateY(160px) rotate(var(--rot, 0deg)); opacity: 0; } }
.bcard:hover, .bcard:focus-visible { transform: translateY(calc(var(--dy, 0px) - 26px)) rotate(0deg) scale(1.08); z-index: 3; }
.bcard.flip { transform: translateY(calc(var(--dy, 0px) - 70px)) rotate(0deg) scale(1.42); z-index: 4; }
.bcard .inner { position: relative; width: 100%; height: 100%; transition: transform .45s cubic-bezier(.3,1.3,.5,1); transform-style: preserve-3d; }
.bcard.flip .inner { transform: rotateY(180deg); }
.bcard .face { position: absolute; inset: 0; border-radius: 10px; backface-visibility: hidden; overflow: hidden; display: flex; flex-direction: column;
  background: linear-gradient(180deg, var(--c1) 0%, #07080d 100%); border: 2px solid var(--c2); box-shadow: 0 8px 22px #000a, inset 0 0 0 2px #0008, 0 0 16px -4px var(--c3); color: #f1f3f8; }
.bcard .back { transform: rotateY(180deg); padding: 7px 7px 6px; gap: 3px; font: 500 9px/1.3 var(--font-body, system-ui, sans-serif); }
.bcard .art { display: block; width: calc(100% - 10px); margin: 5px 5px 0; aspect-ratio: 80 / 60; image-rendering: pixelated; border-radius: 6px; border: 1px solid #ffffff1c; background: radial-gradient(circle at 50% 45%, var(--c4) 0%, #05060a 85%); }
.bcard .gem { position: absolute; top: 2px; left: 2px; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%;
  font: 800 13px var(--font-display, system-ui); color: #fff; background: radial-gradient(circle at 35% 30%, #9be7ff, #2a68d8 60%, #102a6a); border: 2px solid #0b1430; box-shadow: 0 2px 6px #0009; }
.bcard .nm { font: 800 12px/1.15 var(--font-display, system-ui); text-align: center; padding: 6px 5px 0; }
.bcard .tier { margin-top: auto; display: flex; justify-content: space-between; gap: 4px; padding: 4px 7px 6px; font: 700 9px var(--font-body, system-ui); color: #c9cfdb; white-space: nowrap; }
.bcard .tier .dmg { color: #ffd6a0; }
.bcard .back .nm { padding: 0 0 2px; font-size: 12px; }
.bcard .back .stats { display: grid; grid-template-columns: auto 1fr; gap: 0 5px; font-weight: 700; color: #dfe4ee; font-size: 9px; white-space: nowrap; }
.bcard .back .stats span:nth-child(odd) { color: #9aa3b5; font-weight: 500; }
.bcard .back p { margin: 2px 0 0; color: #cfd5e1; font-size: 8px; line-height: 1.25; max-width: none; flex: 1; min-height: 0; overflow: hidden; }   /* the Cast button always stays on the card */
.bcard .back .cast { margin-top: auto; border: 0; border-radius: 6px; padding: 5px 0; font: 800 11px var(--font-display, system-ui); color: #120a02; background: var(--c2); cursor: pointer; }
.bcard .back .cast:disabled { background: #3a3f4c; color: #9aa3b5; cursor: not-allowed; }
.bcard .back small { text-align: center; color: #8790a2; font-size: 9px; }
.bcard.off .front { filter: grayscale(.85) brightness(.55); }
.bcard .cdv { position: absolute; inset: 0; display: none; place-items: center; font: 800 34px var(--font-display, system-ui); color: #fff; text-shadow: 0 2px 0 #000; }
.bcard.cooling .cdv { display: grid; }
.bcard .cdv small { display: block; font-size: 10px; font-weight: 700; text-align: center; }
.bcard.nope { animation: bcardNope .35s; }
@keyframes bcardNope { 20%, 60% { margin-left: -14px; } 40%, 80% { margin-left: 2px; } }
.bcard .hold { position: absolute; inset: -3px; border-radius: 12px; border: 3px solid #fff; opacity: 0; pointer-events: none; }
.bcard.holding .hold { opacity: 1; animation: bcardHold var(--hold) linear forwards; }
@keyframes bcardHold { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
.bcard.cast { animation: bcardCast .5s cubic-bezier(.4,0,.6,1) forwards !important; z-index: 5; }
@keyframes bcardCast { 30% { transform: translateY(-120px) scale(1.25); opacity: 1; filter: brightness(1.8); } 100% { transform: translateY(-260px) scale(.6); opacity: 0; } }
.bhand.going .bcard:not(.cast) { transition: transform .35s ease-in, opacity .35s; transform: translateY(200px); opacity: 0; }
.bhand.going .hbar { opacity: 0; transition: opacity .3s; }
`;

// Painted art for each card, cached by teammate + ability id.
const artCache = new Map();
function artFor(card, theme) {
  const key = theme + ":" + card.id;
  if (!artCache.has(key)) {
    const c = toonStill(80, 60, (pen, w, h) => card.art?.(pen, w, h), { palette: theme === "water" ? "water" : "fire" });
    artCache.set(key, c.toDataURL());
  }
  return artCache.get(key);
}

const touchy = () => matchMedia("(hover: none)").matches;

// Show the hand and wait for a card. anchor = the battle band (the hand sits on
// its bottom edge). f = the fight (mana, cooldowns). Returns the cast card.
export function pickCard(anchor, kit, f, { theme = "void", crit = false, gain = 0 } = {}) {
  const [c1, c2, c3, c4] = LOOK[theme] || LOOK.void;
  const hand = document.createElement("div");
  hand.className = "bhand";
  const n = kit.length;
  hand.innerHTML = `<div class="hbar"><span>Mana <b>${f.mana}</b> / ${MANA.cap}${gain ? ` <span class="how">(+${gain})</span>` : ""}</span>${crit ? `<span class="crit">Flawless: your ability crits ×${BOSS.critTimes}</span>` : ""}<span class="how">${touchy() ? "Tap to read · hold to cast" : "Click to cast · right-click to read"}</span></div>
    <div class="row">${kit.map((c, i) => {
      const t = TIERS[c.tier], why = cantCast(f, c), cd = f.cd?.[c.id] || 0, mid = (n - 1) / 2, d = i - mid;
      return `<div class="bcard${why ? " off" : ""}${cd ? " cooling" : ""}" tabindex="0" data-i="${i}" style="--c1:${c1};--c2:${c2};--c3:${c3};--c4:${c4};--rot:${(d * 3.2).toFixed(1)}deg;--dy:${(Math.abs(d) ** 1.6 * 5).toFixed(0)}px;--delay:${(i * 0.05).toFixed(2)}s;--hold:450ms" aria-label="${esc(c.name)}, ${t.label}, ${t.mana} mana, ${t.dmg} damage${why ? `. ${why}` : ""}">
        <div class="inner">
          <div class="face front"><img class="art" alt="" src="${artFor(c, theme)}"><div class="gem">${t.mana}</div><div class="nm">${esc(c.name)}</div>
            <div class="tier"><span>${t.short || t.label}</span><span class="dmg">${t.dmg} dmg</span></div>
            <div class="cdv"><div>${cd}<small>turn${cd === 1 ? "" : "s"}</small></div></div></div>
          <div class="face back"><div class="nm">${esc(c.name)}</div>
            <div class="stats"><span>Damage</span><span>${t.dmg}${crit ? ` (crit ${Math.round(t.dmg * BOSS.critTimes)})` : ""}</span><span>Mana</span><span>${t.mana || "free"}</span><span>Cooldown</span><span>${t.cd ? `${t.cd} turn${t.cd === 1 ? "" : "s"}` : "none"}</span></div>
            <p>${esc(c.desc)}</p>
            <button class="cast" type="button" ${why ? "disabled" : ""}>${why ? esc(why) : "Cast"}</button>
            <small>${touchy() ? "or press and hold the card" : "or left-click the card"}</small></div>
        </div><div class="hold"></div></div>`;
    }).join("")}</div>`;
  document.body.append(hand);
  const place = () => {
    const r = anchor.getBoundingClientRect(), cardH = hand.querySelector(".bcard")?.offsetHeight || 150;
    Object.assign(hand.style, { left: r.left + "px", width: r.width + "px", top: Math.max(8, r.bottom - cardH * 0.72 - 46) + "px" });
  };
  place();
  addEventListener("resize", place);
  addEventListener("scroll", place, true);
  return new Promise((resolve) => {
    const cards = [...hand.querySelectorAll(".bcard")];
    let done = false;
    const flip = (el) => { const was = el.classList.contains("flip"); cards.forEach((c) => c.classList.remove("flip")); if (!was) el.classList.add("flip"); };
    const cast = (el) => {
      if (done) return;
      const card = kit[+el.dataset.i];
      if (cantCast(f, card)) { el.classList.remove("nope"); void el.offsetWidth; el.classList.add("nope"); return; }
      done = true;
      el.classList.remove("flip"); el.classList.add("cast");
      hand.classList.add("going");
      removeEventListener("resize", place); removeEventListener("scroll", place, true);
      setTimeout(() => { hand.remove(); }, 520);
      resolve(card);
    };
    for (const el of cards) {
      let hold = null, held = false, touch = false;
      el.addEventListener("click", (e) => {
        if (held) { held = false; return; }
        if (e.target.closest(".cast")) return cast(el);
        if (touch) flip(el); else cast(el);   // a mouse click casts; a tap only flips (holding casts)
      });
      el.addEventListener("contextmenu", (e) => { e.preventDefault(); if (!touch) flip(el); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(el); } });
      // Touch: press and hold to cast (a quick tap flips, through "click").
      el.addEventListener("pointerdown", (e) => {
        touch = e.pointerType === "touch";
        if (!touch || e.target.closest(".cast")) return;
        el.classList.add("holding");
        hold = setTimeout(() => { held = true; el.classList.remove("holding"); cast(el); }, 450);
      });
      const stop = () => { clearTimeout(hold); el.classList.remove("holding"); };
      el.addEventListener("pointerup", stop); el.addEventListener("pointercancel", stop); el.addEventListener("pointerleave", stop);
    }
  });
}
