// Seeded random numbers, so a challenge can be re-created exactly from its
// template id and seed (handy for saving progress and for the validator).

export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // A price with 2 decimals, in steps of `step` (e.g. 0.05), between lo and hi.
    money: (lo, hi, step = 0.05) => Math.round((lo + Math.floor(next() * ((hi - lo) / step + 1)) * step) * 100) / 100,
    shuffle: (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
  };
  return r;
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

// Python literal for a JS value (strings, ints, floats).
export const py = (v) => (typeof v === "string" ? JSON.stringify(v) : Number.isInteger(v) ? String(v) : String(v));
