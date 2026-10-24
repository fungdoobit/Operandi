// NOVA's warp idle (Isaac 2026-10-23). While she roams sideways, now and then she
// opens a portal in front of her and glides into it. It closes, another one opens
// far away (anywhere on screen, never close to the first), and she glides out of
// it holding a big floppy slice of pizza in telekinesis, then eats it.
// The portal is Isaac's 4-colour portal sheet, recoloured to her magic and doubled
// with Scale2x (tools/nova-portal.py), drawn at her art-pixel size.
// The portal is drawn in front of her and the part of her past its middle is cut off
// with clip-path, so she goes into the swirl and comes out of it (not over or past it).
import { sound } from "../sound.js";

const CELL = 128;                 // one frame of assets/nova/portal.png, art px
const ANCHOR = { x: 60, y: 70 };  // the portal's middle inside a frame
const ROWS = { loop: 0, open: 1, close: 2 };
const FRAMES = { loop: 8, open: 8, close: 6 };
const FRAME_MS = 80;
const slow = () => window.__warpSlow || 1;   // testing: window.__warpSlow = 4 plays the whole warp 4x slower

let sheet = null;   // the loaded image
const loadSheet = () => sheet ? Promise.resolve(sheet) : new Promise((ok) => { const i = new Image(); i.onload = () => ok((sheet = i)); i.src = "assets/nova/portal.png"; });

class Portal {
  // (x, y): its middle on screen (CSS px). px: CSS px per art px (the same as NOVA's).
  constructor(x, y, px) {
    this.cv = document.createElement("canvas");
    this.cv.width = this.cv.height = CELL;
    Object.assign(this.cv.style, { position: "fixed", left: x - ANCHOR.x * px + "px", top: y - ANCHOR.y * px + "px", width: CELL * px + "px", height: CELL * px + "px",
      imageRendering: "pixelated", pointerEvents: "none", zIndex: 39 });   // behind her (the pet is 40): she is IN the swirl; the rim is drawn again in front, see rim()
    document.body.append(this.cv);
    this.g = this.cv.getContext("2d", { willReadFrequently: true });
    // the portal's front rim: only its dark outline pixels, on a second canvas in front of her
    this.rimCv = this.cv.cloneNode(); this.rimCv.style.zIndex = 41; document.body.append(this.rimCv);
    this.rimG = this.rimCv.getContext("2d"); this.rimSide = 0;   // rimSide: -1 / 1 = which half of the oval shows (0 none)
    this.state = "open"; this.t0 = performance.now();
    this.tick = this.tick.bind(this);
    this.done = null;
    requestAnimationFrame(this.tick);
  }
  play(state) { this.state = state; this.t0 = performance.now(); return new Promise((ok) => (this.done = ok)); }
  tick(now) {
    if (!this.cv.isConnected) { this.rimCv.remove(); return; }
    const f = Math.floor((now - this.t0) / (FRAME_MS * slow())), n = FRAMES[this.state];
    let i = f;
    if (this.state === "loop") i = f % n;
    else if (f >= n) {
      i = n - 1;
      const ok = this.done; this.done = null;
      if (this.state === "open") { this.state = "loop"; this.t0 = now; }
      else if (this.state === "close") { this.cv.remove(); this.rimCv.remove(); ok?.(); return; }
      ok?.();
    }
    this.g.clearRect(0, 0, CELL, CELL);
    if (sheet) this.g.drawImage(sheet, i * CELL, ROWS[this.state] * CELL, CELL, CELL, 0, 0, CELL, CELL);
    this.rimG.clearRect(0, 0, CELL, CELL);
    if (sheet && this.rimSide) {
      const d = this.g.getImageData(0, 0, CELL, CELL), D = d.data;
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const o = (y * CELL + x) * 4, side = x < ANCHOR.x ? -1 : 1;
        if (side !== this.rimSide || !D[o + 3] || D[o] !== 30 || D[o + 1] !== 8) D[o + 3] = 0;   // keep outline-coloured pixels on that half only
      }
      this.rimG.putImageData(d, 0, 0);
    }
    requestAnimationFrame(this.tick);
  }
}

const ease = { in: (t) => t * t, out: (t) => 1 - (1 - t) ** 2, io: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2) };
function tween(ms, fn, e = "io") {
  ms *= slow();
  return new Promise((ok) => {
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); fn(ease[e](k)); k < 1 ? requestAnimationFrame(step) : ok(); };
    requestAnimationFrame(step);
  });
}
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms * slow()));

// Is there room ahead of her (dir 1 = right, -1 = left) for a portal?
export function canWarp(pet, dir) {
  const r = pet.dot.figure.getBoundingClientRect();
  const px = (dir > 0 ? r.right : r.left) + dir * 30;
  return px > 50 && px < innerWidth - 50 && innerWidth > 520 && innerHeight > 420;
}

// The whole idle. pet: the roaming Pet (pet.js); dir: the way she's heading.
export async function novaWarp(pet, dir) {
  await loadSheet();
  const mate = pet.dot, root = pet.root;
  const r = mate.figure.getBoundingClientRect();
  const offX = r.left - pet.x, offY = r.top - pet.y, fw = r.width, fh = r.height;
  const px = mate.held2d.getBoundingClientRect().width / mate.held2d.width;   // her art pixel in CSS px
  // keep: which side of screen x stays visible (1 = right of it). clip-path is measured
  // from her own box, which moves as she glides, so this is re-applied every frame.
  const clip = (x, keep) => {
    const cx = x - pet.x;
    root.style.clipPath = keep > 0 ? `polygon(${cx}px -3000px, 3000px -3000px, 3000px 3000px, ${cx}px 3000px)` : `polygon(-3000px -3000px, ${cx}px -3000px, ${cx}px 3000px, -3000px 3000px)`;
  };
  // Depth: the closer her middle is to a portal's middle the darker she is, as if going into it
  // (no shrinking, Isaac 2026-10-24).
  const wrap = mate.figure.parentElement, pw = 56 * px;   // the oval is about 56 art px wide
  const depth = (cx, cy, k) => { wrap.style.filter = k > 0 ? `brightness(${(1 - 0.45 * k).toFixed(2)})` : ""; };
  const near = (cx, d) => Math.max(0, Math.min(1, 1 - Math.abs((pet.x + offX + fw / 2) - cx) / (pw / 2 + fw / 2) * 1)) ;
  mate.playing = true;
  try {
    // 1. a portal opens just ahead of her, and she glides into it
    mate.face(dir > 0 ? "right" : "left");
    mate.setMood("angry");
    const A = { x: (dir > 0 ? r.right : r.left) + dir * 26, y: r.top + fh * 0.5 };
    const pa = new Portal(A.x, A.y, px); pa.rimSide = -dir;
    sound.sfx("portalTear");
    await pa.play("open");
    sound.sfx("portal");
    await wait(250);
    mate.setMood("idle");
    clip(A.x, -dir);
    sound.sfx("novaUnsummon");
    const x0 = pet.x, x1 = A.x - offX - fw / 2 + dir * (fw * 0.75);
    await tween(900, (e) => { pet.x = x0 + (x1 - x0) * e; pet.place(0); clip(A.x, -dir); depth(A.x, A.y, near(A.x)); }, "in");
    depth(A.x, A.y, 0);
    root.style.visibility = "hidden";
    await wait(200);
    sound.sfx("portalClose");
    await pa.play("close");
    await wait(500);

    // 2. somewhere far away (never close to the first), another one opens
    const diag = Math.hypot(innerWidth, innerHeight), far = Math.max(360, diag * 0.45);
    const mx = fw + 60, my = fh * 0.6 + 40;
    let B = null;
    for (let i = 0; i < 40 && !B; i++) {
      const p = { x: mx + Math.random() * (innerWidth - 2 * mx), y: my + Math.random() * (innerHeight - 2 * my) };
      if (Math.hypot(p.x - A.x, p.y - A.y) >= far) B = p;
    }
    B ||= { x: A.x < innerWidth / 2 ? innerWidth - mx : mx, y: A.y < innerHeight / 2 ? innerHeight - my : my };
    const out = B.x < innerWidth / 2 ? 1 : -1;   // she comes out heading toward the middle of the screen
    pet.x = B.x - offX - fw / 2 - out * (fw * 0.75); pet.y = B.y - offY - fh / 2; pet.place(0);
    clip(B.x, out);
    const pb = new Portal(B.x, B.y, px); pb.rimSide = out;
    sound.sfx("portalTear");
    await pb.play("open");
    sound.sfx("portal");
    await wait(200);

    // 3. out she comes, pizza first, held in purple telekinesis
    mate.holdPizza(out);
    root.style.visibility = "";
    sound.sfx("novaSummon");
    sound.sfx("telekinesis");
    const x2 = pet.x, x3 = B.x - offX - fw / 2 + out * (fw * 0.5 + 34);
    await tween(1000, (e) => { pet.x = x2 + (x3 - x2) * e; pet.place(0); clip(B.x, out); depth(B.x, B.y, near(B.x)); }, "out");
    depth(B.x, B.y, 0);
    root.style.clipPath = "";
    await wait(250);
    sound.sfx("portalClose");
    pb.play("close");
    await mate.eatPizza();
  } finally {
    root.style.clipPath = ""; root.style.visibility = ""; wrap.style.filter = "";
    mate.pizza = null; mate.nova.idle.tk = 0;
    mate.playing = false;
    pet.save();
  }
}
