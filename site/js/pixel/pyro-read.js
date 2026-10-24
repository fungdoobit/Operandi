// PYRO's idle "reads your code" (Isaac 2026-10-24). He drifts over to the code editor, sits just to the
// right of the end of each line and reads it with his eyes flicking back and forth along the text; then he
// reacts to how the last run went: happy if it ran fine / passed, angry (the big dark flame) at the line
// Python flagged. It never says anything. app.js tells him about the editor and the last run (Pet.codeInfo).
// The editor is a plain text box (monospace, no wrapping), so where each line is on screen is worked out from
// its line height, padding and scroll, and how wide each line is from measuring it with the same font.

const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const measure = document.createElement("canvas").getContext("2d");

// Where each visible line of code is: its middle (y) and the x where its text ends, in page px. Empty lines are skipped.
function lineSpots(el) {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || 22, padT = parseFloat(cs.paddingTop) || 0, padL = parseFloat(cs.paddingLeft) || 0;
  measure.font = cs.font;
  const spots = [];
  el.value.split("\n").forEach((text, i) => {
    if (!text.trim()) return;
    const y = r.top + padT + (i + 0.5) * lh - el.scrollTop;
    if (y < r.top + 8 || y > r.bottom - 8) return;   // scrolled out of sight
    const w = measure.measureText(text.replace(/\t/g, "    ")).width;
    spots.push({ n: i + 1, y, x: r.left + padL + w - el.scrollLeft, len: text.length, right: r.right });
  });
  return spots;
}

// Is it a good moment: the editor is on screen, he isn't mid-conversation, and there's something to read?
export function canRead(pet) {
  const c = pet.constructor.codeInfo?.();   // set by app.js
  if (!c || innerWidth < 640 || innerHeight < 420) return false;
  const el = c.el;
  if (!el?.isConnected || !el.offsetParent) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 260 || r.height < 120 || r.bottom < 0 || r.top > innerHeight || performance.now() - c.lastEdit < 5000) return false;
  return lineSpots(el).length >= 2;
}

// h: { wait, tween } from PyroMate.idle (they stop the idle if he's picked up).
export async function readCode(pet, { wait, tween }) {
  const c = pet.constructor.codeInfo?.();
  const mate = pet.dot, el = c?.el;
  if (!el) return;
  const spots = lineSpots(el).slice(0, 6);
  if (spots.length < 2) return;
  const status = c.status;
  const bad = status?.kind === "bad" ? status : null;
  // read down to the flagged line (the first one at or after it), or all of them
  const flagged = bad?.line ? spots.findIndex((s) => s.n >= bad.line) : -1, last = flagged >= 0 ? flagged : spots.length - 1;
  const size = pet.size(), spot = (s) => ({ x: Math.min(s.right - size.w - 20, s.x + 52), y: s.y - size.h * 0.55 });
  const t0 = performance.now();
  try {
    // 1. over to the first line (his usual snuff and relight if it is far)
    const first = spot(spots[0]);
    pet.target = { x: first.x, y: first.y };
    if (pet.startDash(true)) { while (pet.dashing) await wait(40); }
    else { const x0 = pet.x, y0 = pet.y; await tween(700, (u) => { pet.x = x0 + (first.x - x0) * ease(u); pet.y = y0 + (first.y - y0) * ease(u); pet.place(0); }); pet.target = null; }
    mate.face("left");   // the text is on his left
    // 2. read the lines one by one: his eyes sweep to and fro along the text
    for (let i = 0; i <= last; i++) {
      const p = spot(spots[i]), x0 = pet.x, y0 = pet.y;
      if (i) await tween(380, (u) => { pet.x = x0 + (p.x - x0) * ease(u); pet.y = y0 + (p.y - y0) * ease(u); pet.place(0); });
      const dur = Math.max(700, Math.min(1500, 500 + spots[i].len * 28));
      await tween(dur, (u) => { mate.look = -3 + 2.4 * Math.sin(u * (3 + spots[i].len / 8) * Math.PI); });
    }
    mate.look = -3;
    await wait(250);
    // 3. the verdict
    if (bad) {
      mate.setMood("angry");
      pet.dot.flare = 0.6;
      const bx = pet.x;
      await tween(900, (u) => { pet.x = bx + Math.sin(u * 46) * 2.5 * (1 - u * 0.5); pet.place(0); });
      pet.x = bx; pet.place(0);
      await wait(600);
    } else if (status?.kind === "ok") {
      mate.look = 0; mate.setMood("happy");
      pet.dot.flare = 0.35;
      const by = pet.y;
      await tween(500, (u) => { pet.y = by - 9 * Math.sin(u * Math.PI); pet.place(0); });
      await wait(900);
    } else {
      await wait(500);   // nothing to say about it
    }
  } finally {
    mate.look = 0;
    if (!pet.dashing) pet.target = null;
    if (!mate.held) mate.setMood("idle");   // (if he was picked up, leave his held face alone)
    pet.wait = 1.5;
  }
  return performance.now() - t0;
}
