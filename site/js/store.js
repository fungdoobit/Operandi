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
    equipped: { dot: null, theme: null },
    lessons: {},
    modulesDone: {},
    solves: {},          // "module:difficulty" -> count
    recent: [],          // recent template ids, newest first
    current: null,       // the challenge in progress
    streak: { count: 0, last: null },
    history: [],
    updatedAt: 0,
  };
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
    if (remote && (remote.updatedAt > local.updatedAt || !localHasProgress)) {
      this.state = Object.assign(freshState(), remote);
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
      this.listeners.forEach((fn) => fn(this.state));
      return "cloud";
    }
    this.cloud?.push(this.state);
    return "local";
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

  equip(kind, id) {
    this.state.equipped[kind] = this.state.equipped[kind] === id ? null : id;
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
