// Loading the 2D battle art (PRD Addendum L): Kaela's move sheets, the enemy strips, the effect
// sprites and the Green Forest layers. Everything is cut into frames once and cached.
// Sheets: tools/extract-moves.py (Kaela), tools/prepare-packs.py (enemies, effects, forest).

const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const json = (src) => fetch(src).then((r) => r.json());

// Cut a sheet into frames. mirror: flip each frame (Kaela's sheets face left; she faces the enemy
// on the right). Each frame records where its pixels start and end (top/bottom/left/right).
export function cut(img, fw, fh, cols, n, { row = 0, mirror = true } = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = document.createElement("canvas"); c.width = fw; c.height = fh;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (mirror) { g.translate(fw, 0); g.scale(-1, 1); }
    g.drawImage(img, (k % cols) * fw, (Math.floor(k / cols) + row) * fh, fw, fh, 0, 0, fw, fh);
    const D = g.getImageData(0, 0, fw, fh).data;
    let bottom = 0, top = -1, left = fw, right = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      if (!D[(y * fw + x) * 4 + 3]) continue;
      bottom = y; if (top < 0) top = y; if (x < left) left = x; if (x > right) right = x;
    }
    out.push({ c, w: fw, h: fh, bottom, top: Math.max(0, top), left, right });
  }
  return out;
}

// A frame filled with one colour (hit flashes, afterimages, impact-frame silhouettes), cached.
const ghosts = new WeakMap();
export function ghost(f, col) {
  let m = ghosts.get(f); if (!m) ghosts.set(f, (m = new Map()));
  if (m.has(col)) return m.get(col);
  const c = document.createElement("canvas"); c.width = f.w; c.height = f.h;
  const g = c.getContext("2d"); g.drawImage(f.c, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, f.w, f.h);
  m.set(col, c); return c;
}

// A frame in a dither dissolve: pixels drop out in a 4x4 Bayer order as k goes 0 -> 1.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function dissolved(f, k) {
  const c = document.createElement("canvas"); c.width = f.w; c.height = f.h; const g = c.getContext("2d"); g.drawImage(f.c, 0, 0);
  const d = g.getImageData(0, 0, f.w, f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < k * 16) d.data[(y * f.w + x) * 4 + 3] = 0;
  g.putImageData(d, 0, 0); return c;
}

// Her effect reds (the slash ramp and white): pixels in these colours are effects, not her body.
export const RED_FX = [[255, 196, 182], [255, 120, 104], [224, 58, 52], [176, 34, 42], [122, 12, 38], [255, 255, 255]];
// How high her feet are in a frame (0 = on the floor): the lowest row with 3+ body pixels.
function feetOf(f) {
  const D = f.c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, f.w, f.h).data;
  for (let y = f.h - 1; y >= 0; y--) {
    let n = 0;
    for (let x = 0; x < f.w; x++) {
      const o = (y * f.w + x) * 4; if (!D[o + 3]) continue;
      if (!RED_FX.some((c) => Math.abs(c[0] - D[o]) + Math.abs(c[1] - D[o + 1]) + Math.abs(c[2] - D[o + 2]) < 8)) n++;
    }
    if (n >= 3) return f.h - 1 - y;
  }
  return 0;
}

let cache = null;
// Everything, once. base: the site root as seen from the page ("./").
export function loadArt(base = "./") {
  return (cache ??= (async () => {
    const A = base + "assets/";
    const MOVES = {};
    await Promise.all(["quick", "dash", "spin", "slam", "combo", "upper"].map(async (id) => {
      const [img, m] = await Promise.all([load(`${A}kaela/moves/${id}.png`), json(`${A}kaela/moves/${id}.json`)]);
      const frames = cut(img, m.fw, m.fh, m.n, m.n);
      MOVES[id] = { m, frames, feet: frames.map(feetOf), ax: m.fw - m.anchor[0], hitx: m.hitx, hits: m.hits };
    }));
    MOVES.upper.feet[8] = MOVES.upper.feet[9] = 33;   // two airborne frames with a speck at floor level
    const [idleImg, walkImg] = await Promise.all([load(A + "kaela/moves/idle.png"), load(A + "kaela/moves/walk.png")]);
    const IDLE = cut(idleImg, 46, 55, 10, 10), WALK = cut(walkImg, 45, 58, 4, 24);

    // enemies: the red flyer has its own sheet (idle, mouth open, bite, death rows); the rest come from
    // prepare-packs.py, one row per animation, turned to face her (left)
    const FOES = {};
    const demon = await load(A + "enemies/demon.png");
    FOES.demon = { idle: cut(demon, 64, 64, 8, 6), mouth: cut(demon, 64, 64, 8, 6, { row: 1 }), bite: cut(demon, 64, 64, 8, 4, { row: 2 }), die: cut(demon, 64, 64, 8, 8, { row: 3 }), fly: true, ms: 110 };
    for (const id of await json(A + "enemies/list.json")) {
      const [img, m] = await Promise.all([load(`${A}enemies/${id}.png`), json(`${A}enemies/${id}.json`)]);
      const rows = {}; for (const [k, [ri, n]] of Object.entries(m.rows)) rows[k] = cut(img, m.fw, m.fh, n, n, { row: ri, mirror: m.right });
      FOES[id] = { idle: rows.idle || rows.walk, atk: rows.attack, fly: m.fly, ms: m.ms };
    }

    const FX = {};
    await Promise.all(["orb", "orb-raw", "burst", "burst-raw", "wisp", "slash", "pillar"].map(async (id) => {
      const [img, m] = await Promise.all([load(`${A}fx/${id}.png`), json(`${A}fx/${id}.json`)]);
      FX[id] = { ...m, frames: cut(img, m.fw, m.fh, m.n, m.n, { mirror: false }) };
    }));

    // the forest: back and middle layers, and the grass of the front layer from the clearing between
    // its trunks (columns 72-248, rows 140 down), mirror-tiled (its giant trunks, tiled, landed right
    // behind the fighters: Isaac, "looks like they're standing on the trees")
    const FOREST = await Promise.all(["back", "middle", "front"].map((k) => load(`${A}bg/forest/${k}.png`)));
    const GRASS = document.createElement("canvas"); GRASS.width = 352; GRASS.height = 68;
    const g = GRASS.getContext("2d");
    g.drawImage(FOREST[2], 72, 140, 176, 68, 0, 0, 176, 68);
    g.save(); g.translate(352, 0); g.scale(-1, 1); g.drawImage(FOREST[2], 72, 140, 176, 68, 0, 0, 176, 68); g.restore();
    return { MOVES, IDLE, WALK, FOES, FX, FOREST, GRASS };
  })());
}
