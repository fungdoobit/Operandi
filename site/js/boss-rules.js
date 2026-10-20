// Boss fight rules as plain functions (no page code), so they're easy to test.
// The numbers live in economy.js (BOSS).

import { BOSS } from "./economy.js";

export const SPECIALS = { firewall: "Firewall", typos: "Typo Swarm", glitch: "Glitch Text" };

export function newFight(module, number = 1) {
  return { module, number, me: BOSS.hp, foe: BOSS.hp, turn: 0, cur: null, dome: false, pending: null, lastSpecial: null, over: null };
}

// Challenges get harder as the boss weakens.
export const difficultyFor = (f) => (f.foe > BOSS.hp * 2 / 3 ? 1 : f.foe > BOSS.hp / 3 ? 2 : 3);

// A pass: how hard it hits. The Firewall halves a normal hit; a crit breaks it.
export function strikeFor({ mark, flawless, dome }) {
  if (flawless) return { result: "crit", dmg: BOSS.crit };
  const base = BOSS.damage[Math.max(6, Math.min(10, mark))];
  if (dome) return { result: "blocked", dmg: Math.round(base * BOSS.firewallKeeps) };
  return { result: "hit", dmg: base };
}

// After a pass: does the boss charge a special for the next challenge?
export function nextSpecial(f, rand = Math.random) {
  if (f.foe <= 0 || f.turn % BOSS.specialEvery !== 0) return null;
  const options = Object.keys(SPECIALS).filter((k) => k !== f.lastSpecial && !(k === "firewall" && f.dome));
  return options[Math.floor(rand() * options.length)];
}

// ---- What Typo Swarm and Glitch Text do to the next challenge's starter ----

const GIVEN = /^([A-Za-z_]\w*) = (.+)$/;
const GLITCH = "#%&@";

export function specialApplies(kind, starter) {
  const lines = starter.split("\n");
  if (kind === "typos") return lines.some((l) => GIVEN.test(l) && l.match(GIVEN)[1].length >= 4);
  if (kind === "glitch") return lines.some((l) => /^[A-Za-z_]\w* = "([^"#%&@]{2,})"$/.test(l));
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
  return { starter, note: "" };
}
