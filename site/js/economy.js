// All the numbers that make up Operandi's game economy, in one place so
// they're easy to tune.

export const STARTER_ITEMS = { hint: 15, peek: 15, solution: 5, shield: 0 };

export const EARN = {
  lesson: 10,             // per lesson section
  challenge: { 1: 5, 2: 12, 3: 25 },
  firstTryMultiplier: 2,      // only when no hint, peek or solution was used
  markBonus: (mark) => Math.max(0, mark - 7), // 8 -> +1, 9 -> +2, 10 -> +3
  moduleComplete: 50,
  dailyFirstPass: 5,
  repeatAfter: 5,             // after this many solves at Easy/Medium in a module...
  repeatMultiplier: 0.5,      // ...that difficulty pays half
};

export const DIFFS = { 1: "Easy", 2: "Medium", 3: "Hard" };

export const SHOP = [
  { id: "hint", kind: "item", name: "Hint", price: 10, desc: "A nudge in the right direction. Up to 3 per task, gentle to nearly-there." },
  { id: "peek", kind: "item", name: "Test peek", price: 15, desc: "See exactly what one failing test expected." },
  { id: "solution", kind: "item", name: "Full solution", price: 60, desc: "Shows the whole answer. That challenge then pays no Bits." },
  { id: "shield", kind: "item", name: "Streak shield", price: 30, desc: "Protects your streak if you miss one day. Used automatically." },
  // Looks for your teammate. `slot` says what can be worn together:
  // one head item, one face item, one mouth item and one prop.
  { id: "moustache", kind: "dot", slot: "mouth", name: "Fake moustache", price: 100, desc: "Instantly distinguished. Probably." },
  { id: "bow", kind: "dot", slot: "head", name: "Bow", price: 100, desc: "A little bow. Very professional, apparently." },
  { id: "shades", kind: "dot", slot: "face", name: "Sunglasses", price: 120, desc: "Too cool for syntax errors." },
  { id: "party", kind: "dot", slot: "head", name: "Party hat", price: 120, desc: "For celebrating every passed test." },
  { id: "nerd", kind: "dot", slot: "face", name: "Big nerdy glasses", price: 150, desc: "Thick black frames for reading tracebacks closely." },
  { id: "wizard", kind: "dot", slot: "head", name: "Wizard hat", price: 250, desc: "Python is basically magic anyway." },
  { id: "laptop", kind: "dot", slot: "prop", name: "Laptop", price: 300, desc: "Your teammate types along whenever you type." },
  { id: "crown", kind: "dot", slot: "head", name: "Crown", price: 400, desc: "For a true Program-level coder." },
  { id: "pyro", kind: "teammate", slot: "teammate", name: "PYRO", price: 800, desc: "PYthon Runtime Operative. A fiery, energetic teammate made of flames. Swap between DOT and PYRO any time." },
  { id: "theme-forest", kind: "theme", slot: "theme", name: "Forest editor", price: 80, desc: "Deep green editor colours." },
  { id: "theme-dusk", kind: "theme", slot: "theme", name: "Dusk editor", price: 80, desc: "Warm purple editor colours." },
];

export const LEVELS = [
  { name: "Operand", modules: 0 },
  { name: "Operator", modules: 1 },
  { name: "Expression", modules: 2 },
  { name: "Function", modules: 4 },
  { name: "Module", modules: 6 },
  { name: "Program", modules: 8 },
];

export function levelFor(modulesDone) {
  let i = 0;
  LEVELS.forEach((l, k) => { if (modulesDone >= l.modules) i = k; });
  return i;
}

// Bits for a pass. `assisted` = used a hint or peek; `solved` = used a solution.
export function rewardFor({ kind, difficulty, attempt, mark, assisted, solved, repeat }) {
  if (solved) return { total: 0, parts: ["Solution used: no Bits for this one"] };
  const base = kind === "lesson" ? EARN.lesson : EARN.challenge[difficulty];
  const parts = [`${base} base`];
  let total = base;
  if (attempt === 1 && !assisted) { total *= EARN.firstTryMultiplier; parts.push(`×${EARN.firstTryMultiplier} first try`); }
  if (repeat) { total = Math.round(total * EARN.repeatMultiplier); parts.push("half: you've mastered this difficulty"); }
  const mb = EARN.markBonus(mark);
  if (mb) { total += mb; parts.push(`+${mb} for a ${mark}/10`); }
  return { total, parts };
}

// Marking rubric (no AI). Tests decide pass/fail; style findings and
// attempts adjust the mark.
export function markFor({ passedCount, total, lintIds, attempt, penalties }) {
  if (total === 0) return 0;
  if (passedCount < total) return Math.max(0, Math.min(5, Math.round((5 * passedCount) / total)));
  let mark = 10;
  let style = 0;
  for (const id of new Set(lintIds)) style += penalties[id] || 0;
  mark -= Math.min(3, style);
  if (attempt >= 4) mark -= 1;
  return Math.max(6, mark);
}

export const WEAR_SLOTS = ["head", "face", "mouth", "prop"];

// Boss fights (PRD Addendum C). Both sides start with the same HP. A pass
// hits by its mark; a flawless pass (10/10, first submit, no hint or peek) is a
// crit. The boss strikes back after every hit except a crit, and harder after
// a miss (a failed Submit). Every few passes
// the boss telegraphs a special that changes the next challenge.
export const BOSS = {
  hp: 300,
  damage: { 6: 15, 7: 17, 8: 20, 9: 22, 10: 25 },
  crit: 40,
  bossHit: 20,                 // after a miss (a failed Submit)
  strikeBack: 10,              // after each of your hits, unless it was a crit
  firewallKeeps: 0.5,          // a blocked hit still does half
  specialEvery: 3,             // passes between specials
  reward: { firstTry: 100, retry: 50 },
  exclusivePrice: 1500,        // the boss's accessory in the Shop after a retry win
};
