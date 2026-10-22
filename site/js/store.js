// Progress: Bits, items, lessons, challenges, streak, history.
// Saved to this browser right away, and to the cloud when signed in.

import { STARTER_ITEMS, EARN } from "./economy.js";

const KEY = "operandi:v2:progress";

export function freshState() {
  return {
    version: 2,
    bits: 0,
    items: { ...STARTER_ITEMS },
    owned: {},
    equipped: { head: null, face: null, mouth: null, prop: null, theme: null, teammate: "dot" },
    pet: { mode: "roam", x: 0.8, y: 0.75 }, // where your teammate is: roaming, or parked at a spot
    lessons: {},
    modulesDone: {},
    solves: {},          // "module:difficulty" -> count
    recent: [],          // recent template ids, newest first
    current: null,       // the challenge in progress
    boss: null,          // the boss fight in progress (boss-rules.js newFight)
    bossWins: {},        // module -> { at, firstTry }
    bossFights: {},      // module -> fights started (the first one is the "first try")
    fight: null,         // the lesson / challenge fight in progress (Addendum K): enemy, HP, wave
    kit: { mana: 0, cd: {} },   // mana and card cooldowns, carried from fight to fight
    ultSeen: {},         // card id -> the day its full ultimate last played (later that day: the short cut)
    streak: { count: 0, last: null },
    history: [],
    updatedAt: 0,
  };
}

// Bring older saves up to date: one accessory became slots, and the old
// reading glasses became the big nerdy glasses.
function upgrade(st) {
  const fresh = freshState();
  st.equipped = Object.assign({}, fresh.equipped, st.equipped);
  st.pet = Object.assign({}, fresh.pet, st.pet);
  st.kit = Object.assign({}, fresh.kit, st.kit); st.ultSeen ||= {};
  if (st.owned.glasses) { st.owned.nerd = true; delete st.owned.glasses; }
  const old = st.equipped.dot;
  if (old) {
    const slot = { glasses: "face", bow: "head", party: "head", crown: "head" }[old];
    if (slot) st.equipped[slot] = old === "glasses" ? "nerd" : old;
  }
  delete st.equipped.dot;
  return st;
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };

export class Store {
  constructor() {
    this.state = freshState();
    this.listeners = new Set();
    this.cloud = null;
    this.cloudTimer = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.state = Object.assign(freshState(), JSON.parse(raw));
    } catch { /* private mode or blocked storage: start fresh */ }
    this.state = upgrade(this.state);
  }

  onChange(fn) { this.listeners.add(fn); }

  save() {
    this.state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
    this.listeners.forEach((fn) => fn(this.state));
    if (this.cloud) {
      clearTimeout(this.cloudTimer);
      this.cloudTimer = setTimeout(() => this.cloud.push(this.state), 1500);
    }
  }

  // Called after sign-in with whatever the cloud holds (or null).
  adoptCloud(remote) {
    const local = this.state;
    const localHasProgress = Object.keys(local.lessons).length > 0 || local.bits > 0;
    // A deliberate reset on this device beats an older cloud copy.
    const resetWins = local.resetAt && remote && remote.updatedAt < local.resetAt;
    if (remote && !resetWins && (remote.updatedAt > local.updatedAt || !localHasProgress)) {
      this.state = upgrade(Object.assign(freshState(), remote));
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
      this.listeners.forEach((fn) => fn(this.state));
      return "cloud";
    }
    this.cloud?.push(this.state);
    return "local";
  }

  // Start again from the very beginning: progress and saved code drafts.
  reset() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("operandi:draft:")) localStorage.removeItem(k);
      }
    } catch {}
    this.state = freshState();
    this.state.resetAt = Date.now();
    this.save();
  }

  // ----- Economy actions -----

  earn(n) { this.state.bits += n; }

  useItem(id) {
    if ((this.state.items[id] || 0) <= 0) return false;
    this.state.items[id] -= 1;
    this.save();
    return true;
  }

  buy(entry) {
    if (this.state.bits < entry.price) return false;
    if (entry.kind !== "item" && this.state.owned[entry.id]) return false;
    this.state.bits -= entry.price;
    if (entry.kind === "item") this.state.items[entry.id] = (this.state.items[entry.id] || 0) + 1;
    else this.state.owned[entry.id] = true;
    this.save();
    return true;
  }

  // Put an item on (or take it off if it's already on). Only one item per slot.
  equip(slot, id) {
    if (slot === "teammate") this.state.equipped.teammate = id;
    else this.state.equipped[slot] = this.state.equipped[slot] === id ? null : id;
    this.save();
  }

  // Returns Bits earned from the daily bonus (0 if already counted today).
  markActiveToday() {
    const s = this.state.streak, today = daysAgo(0);
    if (s.last === today) return 0;
    if (s.last === daysAgo(1)) s.count += 1;
    else if (s.last === daysAgo(2) && (this.state.items.shield || 0) > 0) { this.state.items.shield -= 1; s.count += 1; }
    else s.count = 1;
    s.last = today;
    this.earn(EARN.dailyFirstPass);
    return EARN.dailyFirstPass;
  }

  streakNow() {
    const s = this.state.streak;
    if (s.last === daysAgo(0) || s.last === daysAgo(1)) return s.count;
    if (s.last === daysAgo(2) && (this.state.items.shield || 0) > 0) return s.count;
    return 0;
  }

  log(entry) {
    this.state.history.unshift({ ...entry, at: new Date().toISOString() });
    this.state.history = this.state.history.slice(0, 80);
  }
}
