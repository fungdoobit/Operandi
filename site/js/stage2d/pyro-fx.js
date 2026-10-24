// The fire packs as battle effects (PRD: PYRO's cards, Isaac 2026-10-24): Ansimuz's Magic Pack Fire, Explosions
// Pack 11 and the Patreon fire animation, cut into strips by tools/prepare-pyro-fx.py (assets/fx/pyro).
// Effects are drawn on the stage's sprite layers (s.spr in front, s.sprBack behind GOLEM): positions are stage px,
// and every art pixel is drawn 2 stage px wide, the same grain as GOLEM.
const json = fetch("assets/fx/pyro/fx.json").then((r) => r.json());
let sheets = null;
export function loadPyroFx() {
  return (sheets ||= json.then((meta) => Promise.all(Object.entries(meta).map(([name, m]) => new Promise((ok, no) => {
    const img = new Image(); img.onload = () => ok([name, { ...m, img }]); img.onerror = no; img.src = `assets/fx/pyro/${name}.png`;
  }))).then((a) => Object.fromEntries(a))));
}

export const SCALE = 2;   // stage px per art px
// Draw frame i of a strip. anchor: "b" = x is the middle and y the bottom of the frame, "c" = both the middle.
export function frame(g, sh, i, x, y, { scale = SCALE, anchor = "c", flip = 1, alpha = 1, rot = 0, sx = 1, sy = 1 } = {}) {
  i = Math.max(0, Math.min(sh.n - 1, Math.floor(i)));
  const w = sh.w * scale * sx, h = sh.h * scale * sy;
  g.save(); g.translate(Math.round(x), Math.round(y)); if (rot) g.rotate(rot); g.scale(flip, 1); g.globalAlpha = alpha; g.imageSmoothingEnabled = false;
  g.drawImage(sh.img, i * sh.w, 0, sh.w, sh.h, -w / 2, anchor === "b" ? -h : -h / 2, w, h);
  g.restore();
}

// Play a strip once (or looped for ms) on a sprite layer: resolves when it ends.
// o: { x, y, from, to, ms, loop, fps, ...frame options }. x and y may be functions of progress k.
export function play(layer, sh, o = {}) {
  const from = o.from ?? 0, to = o.to ?? sh.n - 1, n = to - from + 1;
  const ms = o.ms ?? (o.fps ? (n / o.fps) * 1000 : n * 70);
  return layer.add({ dur: o.loop ? o.loop : ms, z: o.z ?? 0, draw(g, k, t) {
    const f = o.loop ? from + (Math.floor(t / (ms / n)) % n) : from + k * (n - 1) + (k >= 1 ? 0 : 0);
    const x = typeof o.x === "function" ? o.x(k, t) : o.x, y = typeof o.y === "function" ? o.y(k, t) : o.y;
    frame(g, sh, f, x, y, { ...o, alpha: typeof o.alpha === "function" ? o.alpha(k) : o.alpha ?? 1 });
  } });
}

// A copy of a strip washed with a colour (so one pack can give several looks): amt 0..1 of rgb over every drawn pixel.
// (A canvas composite, not a CSS filter: iPad's Safari has no ctx.filter.)
const washes = new Map();
export function tinted(sh, [r, g, b], amt = 0.4) {
  const key = `${sh.img.src}|${r},${g},${b},${amt}`;
  if (!washes.has(key)) {
    const c = document.createElement("canvas"); c.width = sh.img.width; c.height = sh.img.height;
    const x = c.getContext("2d"); x.drawImage(sh.img, 0, 0); x.globalCompositeOperation = "source-atop";
    x.fillStyle = `rgba(${r},${g},${b},${amt})`; x.fillRect(0, 0, c.width, c.height);
    washes.set(key, { ...sh, img: c });
  }
  return washes.get(key);
}
