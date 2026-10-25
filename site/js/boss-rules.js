// Boss fight rules as plain functions (no page code), so they're easy to test.
// The numbers live in economy.js (BOSS).

import { BOSS, MANA, TIERS } from "./economy.js";

export const SPECIALS = { firewall: "Firewall", typos: "Typo Swarm", glitch: "Glitch Text", quote: "Quote Trap", caseTwist: "Case Twist", flip: "Flipped Values" };
// Each boss has its own specials. Module 2's Abyssal Maw (2026-10-24, agreed with Isaac): his Firewall is the Coil Shield, and
// his three mess with the given values: a number in quotes, the capitals of a text swapped, two numbers swapped.
const BOSS_SPECIALS = { 1: ["firewall", "typos", "glitch"], 2: ["firewall", "quote", "caseTwist", "flip"] };
export const specialsFor = (module) => BOSS_SPECIALS[module] || BOSS_SPECIALS[1];
export const specialName = (kind, module) => (kind === "firewall" && module === 2 ? "Coil Shield" : SPECIALS[kind]);

export function newFight(module, number = 1) {
  return { module, number, me: BOSS.hp, foe: BOSS.hp, turn: 0, cur: null, dome: false, pending: null, lastSpecial: null, over: null, mana: 0, cd: {}, hand: null };
}

// Challenges get harder as the boss weakens.
export const difficultyFor = (f) => (f.foe > BOSS.hp * 2 / 3 ? 1 : f.foe > BOSS.hp / 3 ? 2 : 3);

// Mana from a pass (Addendum J). r = the challenge record: attempts, hints,
// peeked, solutionUsed.
export function manaFor(mark, r) {
  if (r.solutionUsed) return 0;
  let m = r.attempts <= 1 ? mark : r.attempts === 2 ? Math.min(MANA.secondTry, mark) : Math.max(MANA.laterMin, mark - MANA.laterMinus);
  m -= (r.hints || 0) * MANA.hint + (r.peeked || []).length * MANA.peek;
  return Math.max(0, m);
}

// Can this card be cast now? Returns null if yes, else why not.
export function cantCast(f, card) {
  const t = TIERS[card.tier];
  if ((f.cd?.[card.id] || 0) > 0) return `Cooling down: ${f.cd[card.id]} more turn${f.cd[card.id] === 1 ? "" : "s"}`;
  if ((f.mana || 0) < t.mana) return `Needs ${t.mana} mana`;
  return null;
}

// Cast a card: pay its mana, start its cooldown, tick the others' down, and
// work out the strike. crit = this pass was flawless. The Firewall halves every
// hit until a crit or a card that counters it breaks it (Isaac 2026-10-21).
export const countersFirewall = (card) => card.counters === "firewall";
export function castCard(f, card, { crit }) {
  const t = TIERS[card.tier];
  f.mana = Math.max(0, (f.mana || 0) - t.mana);
  f.cd ||= {};
  for (const id of Object.keys(f.cd)) f.cd[id] = Math.max(0, f.cd[id] - 1);
  if (t.cd) f.cd[card.id] = t.cd;
  if (crit) return { result: "crit", dmg: Math.round(t.dmg * BOSS.critTimes) };
  if (f.dome && !countersFirewall(card)) return { result: "blocked", dmg: Math.round(t.dmg * BOSS.firewallKeeps) };
  return { result: "hit", dmg: t.dmg };
}

// After a pass: does the boss charge a special for the next challenge?
export function nextSpecial(f, rand = Math.random) {
  if (f.foe <= 0 || f.turn % BOSS.specialEvery !== 0) return null;
  const options = specialsFor(f.module).filter((k) => k !== f.lastSpecial && !(k === "firewall" && f.dome));
  return options[Math.floor(rand() * options.length)];
}

// ---- What the code specials do to the next challenge's starter ----

const GIVEN = /^([A-Za-z_]\w*) = (.+)$/;
const GLITCH = "#%&@";
const NUMBER = /^([A-Za-z_]\w*) = (-?\d+(?:\.\d+)?)$/;            // count = 12
const TEXT = /^([A-Za-z_]\w*) = "([^"\\]*)"$/;                    // city = "Tokyo"
const lettersIn = (t) => (t.match(/[A-Za-z]/g) || []).length;
const numberLines = (lines) => lines.map((l, i) => i).filter((i) => NUMBER.test(lines[i]));
const flipPairs = (lines) => { const n = numberLines(lines), out = []; for (const a of n) for (const b of n) if (a < b && lines[a].match(NUMBER)[2] !== lines[b].match(NUMBER)[2]) out.push([a, b]); return out; };

export function specialApplies(kind, starter) {
  const lines = starter.split("\n");
  if (kind === "typos") return lines.some((l) => GIVEN.test(l) && l.match(GIVEN)[1].length >= 4);
  if (kind === "glitch") return lines.some((l) => /^[A-Za-z_]\w* = "([^"#%&@]{2,})"$/.test(l));
  if (kind === "quote") return numberLines(lines).length > 0;
  if (kind === "caseTwist") return lines.some((l) => TEXT.test(l) && lettersIn(l.match(TEXT)[2]) >= 2);
  if (kind === "flip") return flipPairs(lines).length > 0;
  return true;
}

// Typo Swarm: one given variable's name gets two letters swapped (pirce = 4.5).
// The "given values unchanged" test and the NameError lead you to it.
// Glitch Text: glitch symbols land inside the given text ("To#ky%o"); you
// delete them before you start.
export function applySpecial(kind, starter, r) {
  const lines = starter.split("\n");
  if (kind === "typos") {
    const idx = lines.map((l, i) => i).filter((i) => GIVEN.test(lines[i]) && lines[i].match(GIVEN)[1].length >= 4);
    const i = idx[r.int(0, idx.length - 1)];
    const [, name, rest] = lines[i].match(GIVEN);
    // Swap two neighbouring letters after the first (a swap of two equal letters changes nothing, so skip those).
    const spots = [];
    for (let k = 1; k < name.length - 1; k++) if (name[k] !== name[k + 1]) spots.push(k);
    const k = spots.length ? spots[r.int(0, spots.length - 1)] : -1;
    const bad = k < 0 ? name + name[name.length - 1] : name.slice(0, k) + name[k + 1] + name[k] + name.slice(k + 2);
    lines[i] = `${bad} = ${rest}`;
    return { starter: lines.join("\n"), note: "The Typo Swarm planted a typo in your starter code. Find it and fix it before you start." };
  }
  if (kind === "glitch") {
    const idx = lines.map((l, i) => i).filter((i) => /^[A-Za-z_]\w* = "([^"#%&@]{2,})"$/.test(lines[i]));
    for (const i of idx) {
      const [, name, text] = lines[i].match(/^([A-Za-z_]\w*) = "(.*)"$/);
      const chars = [...text];
      const n = Math.min(3, Math.max(2, Math.floor(chars.length / 3)));
      for (let j = 0; j < n; j++) chars.splice(r.int(1, chars.length - 1), 0, GLITCH[r.int(0, GLITCH.length - 1)]);
      lines[i] = `${name} = "${chars.join("")}"`;
    }
    return { starter: lines.join("\n"), note: "Glitch Text scrambled the given text. Delete the # % & @ symbols from it before you start." };
  }
  // Quote Trap: one given number is wrapped in quotes, so it's text now (count = "12"). Comparing or adding it fails, and the
  // "given values unchanged" test points at it.
  if (kind === "quote") {
    const idx = numberLines(lines), i = idx[r.int(0, idx.length - 1)], [, name, num] = lines[i].match(NUMBER);
    lines[i] = `${name} = "${num}"`;
    return { starter: lines.join("\n"), note: "The Quote Trap wrapped one of the given numbers in quotes, so Python sees it as text, not a number. Find it and take the quotes off before you start." };
  }
  // Case Twist: one given text has its capitals swapped ("Tokyo" becomes "tOKYO"). Python sees them as different text.
  if (kind === "caseTwist") {
    const idx = lines.map((l, i) => i).filter((i) => TEXT.test(lines[i]) && lettersIn(lines[i].match(TEXT)[2]) >= 2);
    const i = idx[r.int(0, idx.length - 1)], [, name, text] = lines[i].match(TEXT);
    const twisted = [...text].map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join("");
    lines[i] = `${name} = "${twisted}"`;
    return { starter: lines.join("\n"), note: "Case Twist swapped the capitals in some given text: big letters became small and small became big. Python sees \"Tokyo\" and \"tOKYO\" as different text, so put it back exactly as the task gives it." };
  }
  // Flipped Values: two given numbers swap places (limit = 30, temp = 25 instead of limit = 25, temp = 30).
  if (kind === "flip") {
    const pairs = flipPairs(lines), [a, b] = pairs[r.int(0, pairs.length - 1)];
    const A = lines[a].match(NUMBER), B = lines[b].match(NUMBER);
    lines[a] = `${A[1]} = ${B[2]}`; lines[b] = `${B[1]} = ${A[2]}`;
    return { starter: lines.join("\n"), note: "Flipped Values swapped two of the given numbers. Check each one against the task and swap them back before you start." };
  }
  return { starter, note: "" };
}
