// Playtime's opening pages (Isaac 2026-10-31): the title with NOVA; code is steps in order (a pixel tea scene), and
// what happens when the steps are mixed up; move() and collect() acted out by NOVA with her own portals and her
// telekinesis; the round brackets. Every scene is a function of time, so it can replay, or pause on any moment.
import { PixelNova } from "../pixel/nova-px.js";
import { PixelGL } from "../pixel/pixel-gl.js";
import { PIX_PALETTES, PIX_GLOW, PIX_EXTRA, moodOf } from "./island.js";

const $ = (id) => document.getElementById(id);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let onClose = () => {};
// Six pages. Pages 2 and 3 play a small pixel tea scene: the right order, then the same steps mixed up. Pages 4
// and 5 show NOVA stepping out of her portal (the same portal sheet as her warp idle) and doing a command while it
// types itself. Every scene is a function of time, so it can replay, or pause on any moment for tests.
const PAGES = 6;
let page = 0, sceneT0 = performance.now(), stillT = null, introNova = null, stageK = 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3), easeIn = (t) => t * t * t;
const c01 = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, t) => a + (b - a) * t;
const sm01 = (a, b, x) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---- NOVA's portal: Isaac's 4-colour portal sheet (8 open frames, 8 looping, 6 closing; 128 art px each)
const portalSheet = new Image(); portalSheet.src = "assets/nova/portal.png";
const pcv = document.createElement("canvas"); pcv.width = pcv.height = 128;
const pg = pcv.getContext("2d", { willReadFrequently: true });
function portalAt(t, open, close) {   // which frame shows at time t, or null
  if (t < open) return null;
  if (t < open + .64) return [1, Math.floor((t - open) / .08)];
  if (t < close) return [0, Math.floor((t - open - .64) / .08) % 8];
  if (t < close + .48) return [2, Math.floor((t - close) / .08)];
  return null;
}
// The swirl goes behind NOVA; the half of its dark rim she is passing through is drawn again in front of her,
// so she goes in and out of it (as in the warp idle).
function drawPortal(back, front, st, x, y, rimSide) {
  if (!st || !portalSheet.naturalWidth) return;
  pg.clearRect(0, 0, 128, 128); pg.drawImage(portalSheet, st[1] * 128, st[0] * 128, 128, 128, 0, 0, 128, 128);
  back.drawImage(pcv, Math.round(x - 60), Math.round(y - 70));
  const d = pg.getImageData(0, 0, 128, 128), D = d.data;
  const yGround = GY - Math.round(y - 70);   // no rim below the ground line
  for (let i = 0; i < 128 * 128; i++) { const o = i * 4; if ((i % 128 < 60 ? -1 : 1) !== rimSide || D[o] !== 30 || D[o + 1] !== 8 || (i >> 7) >= yGround) D[o + 3] = 0; }
  pg.putImageData(d, 0, 0); front.drawImage(pcv, Math.round(x - 60), Math.round(y - 70));
}
// The row of tiles NOVA stands on, seen straight from the side: the island's own tiles (same rounded blocks, grass
// band, earth strata, palettes, dithering and outlines), drawn once by the pixel pipeline and kept as two pictures:
// plain, and with the second tile lit (where move() takes her).
const TILES = [80, 128, 176], GY = 104, TW = 48;
const GROUND_MODEL = `
uniform vec2 uRes; uniform float uHi, uScale; uniform vec2 uOrigin;
float gm;
float map(vec3 p){
  gm = 0.; float d = 1e5;
  for (int k = 0; k < 3; k++) {
    float nd = sdRBox(p - vec3(float(k) - 1., -.21, 0.), vec3(.485, .21, .485), .045);
    if (nd < d) { d = nd; gm = p.y > -.11 ? 1. : 7.; }
  }
  return d; }
vec3 nrm(vec3 p){ vec2 e = vec2(.002, -.002);
  return normalize(e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) + e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx)); }
const vec3 L = normalize(vec3(-.35, .85, .5));
out vec4 o;
void main(){
  vec3 ro = vec3((gl_FragCoord.xy - uOrigin)/uScale, 3.), rd = vec3(0., 0., -1.);
  float t = 0.; bool hit = false;
  for (int i = 0; i < 48; i++) { float d = map(ro + rd*t); if (d < .002) { hit = true; break; } t += d; if (t > 6.) break; }
  if (!hit) { o = vec4(0.); return; }
  vec3 p = ro + rd*t; float m = gm; vec3 n = nrm(p);
  float sh = .14 + .62*max(dot(n, L), 0.) + .2*(.55 + .45*n.y);
  if (m == 1.) { if (n.y > .6) sh += (vnoise(p*vec3(11., 1., 11.)) - .5)*.22; if (uHi >= 0. && abs(p.x - (uHi - 1.)) < .5) sh += .22; }
  else sh += sin(p.y*20. + vnoise(p*3.)*5.)*.07 + (vnoise(p*13.) - .5)*.12;
  o = vec4(clamp(sh, 0., 1.), m/16., clamp(t/6., 0., 1.), 0.);
}`;
const groundPics = [];
function makeGround() {
  const cv = document.createElement("canvas"); cv.width = 232; cv.height = 124;
  const gl = new PixelGL(cv, { model: GROUND_MODEL, palettes: PIX_PALETTES, glow: PIX_GLOW, extra: PIX_EXTRA });
  [-1, 1].forEach((hi) => {
    gl.draw({ uHi: hi, uScale: TW, uOrigin: [TILES[1], 124 - GY] }, { uTime: 0, uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: 0, uShadowX: .5, uFlat: 0, uPlume: [0, 0, 0, 0] });
    const c = document.createElement("canvas"); c.width = 232; c.height = 124; c.getContext("2d").drawImage(cv, 0, 0); groundPics.push(c);
  });
  gl.gl.getExtension("WEBGL_lose_context")?.loseContext();   // drawn once; give the context back
}
function drawGround(g, hi = -1) { if (groundPics.length) g.drawImage(groundPics[hi === 1 ? 1 : 0], 0, 0); }
// a Bit: a gold coin, spinning (spin = angle), with NOVA's purple telekinesis round it (aura 0..1)
function drawCoin(g, cx, cy, spin, aura, t) {
  cx = Math.round(cx); cy = Math.round(cy);
  const r = 5, w = Math.max(1.2, Math.abs(Math.cos(spin)) * r);
  if (aura > 0) for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
    const d = Math.hypot(x, y), b = ((x & 3) * 4 + (y & 3)) / 16, f = aura * (1 - d / 10) + Math.sin(t * 9 + d) * .06;
    if (d > 4 && d < 10 && f > b * .9) { g.fillStyle = f > .55 ? "#cba2ff" : "#7838d0"; g.fillRect(cx + x, cy + y, 1, 1); }
  }
  const ell = (x, y, a, b) => (x / a) ** 2 + (y / b) ** 2 <= 1;
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -Math.ceil(w) - 1; x <= Math.ceil(w) + 1; x++) {
    if (ell(x, y, w + .9, r + .9) && !ell(x, y, w, r)) { g.fillStyle = "#06060f"; g.fillRect(cx + x, cy + y, 1, 1); }
    else if (ell(x, y, w, r)) {
      const edge = !ell(x, y, w - 1.1, r - 1.1);
      g.fillStyle = edge ? "#c48a18" : x < 0 && y < 0 ? "#fff4b0" : x + y > 3 ? "#eab42a" : "#ffd75a";
      g.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}

// ---- the tea scene (art 170 x 96): a tap, a kettle on a hob, a cup on a saucer
const TEA = { W: 150, H: 70, step: 1.9, t0: .5 };
const TEA_ORDER = { right: ["fill", "boil", "pour"], wrong: ["pour", "fill", "boil"] };
const TEA_LABEL = { fill: "Fill the kettle", boil: "Boil it", pour: "Pour the tea" };
const kcv = document.createElement("canvas"); kcv.width = 36; kcv.height = 30;
const KMASK = (() => {   // 0 empty, 1 body, 2 dark parts (knob, spout, handle), 3 the water window. Origin (17, 28).
  const W = 36, m = new Uint8Array(W * 30), set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < 30) m[y * W + x] = v; };
  for (let y = 10; y <= 28; y++) { const hw = y >= 18 ? 10 : Math.round(10 * Math.sqrt(Math.max(0, 1 - ((18 - y) / 9.5) ** 2))); for (let x = 17 - hw; x < 17 + hw; x++) set(x, y, 1); }
  for (let y = 7; y <= 9; y++) for (let x = 15; x <= 18; x++) set(x, y, 2);
  for (let i = 0; i <= 9; i++) { const x = 26 + Math.round(i * .7), y = 22 - i; set(x, y, 2); set(x + 1, y, 2); set(x, y + 1, 2); }
  for (let a = 0; a <= 1.001; a += .04) { const x = Math.round(6 - Math.sin(a * Math.PI) * 5), y = Math.round(13 + a * 10); set(x, y, 2); set(x + 1, y, 2); }
  for (let y = 17; y <= 25; y++) { set(10, y, 3); set(11, y, 3); }
  return m;
})();
function paintKettle(level, hot) {
  const g = kcv.getContext("2d"), W = 36; g.clearRect(0, 0, 36, 30);
  for (let y = 0; y < 30; y++) for (let x = 0; x < W; x++) {
    const v = KMASK[y * W + x];
    if (!v) {
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < 30 && KMASK[Y * W + X]; });
      if (near) { g.fillStyle = "#06060f"; g.fillRect(x, y, 1, 1); }
      continue;
    }
    let c;
    if (v === 2) c = x < 14 || y < 10 ? "#565d96" : "#3a3f6b";
    else if (v === 3) c = y >= 25 - Math.round(level * 8) ? (hot ? "#9fd0ff" : "#4f8de8") : "#1c2040";
    else { const f = (x - 7) / 20; c = f < .22 ? "#c9d3ff" : f < .62 ? "#8b97d6" : "#5a64a3"; if ((x === 12 || x === 13) && y > 12 && y < 21) c = "#eef2ff"; }
    g.fillStyle = c; g.fillRect(x, y, 1, 1);
  }
}
function teaState(order, t) {
  const S = { level: 0, hot: false, cup: 0, tea: false, x: 46, y: 56, ang: 0, stream: false, tapOn: false, puff: -1, steam: 0, shake: false, light: false, active: -1, done: [], bad: [], end: false };
  TEA_ORDER[order].forEach((a, i) => {
    const s0 = TEA.t0 + i * TEA.step; if (t < s0) return;
    const k = c01((t - s0) / 1.7); if (k < 1) S.active = i;
    if (a === "fill") { S.level = Math.max(S.level, sm01(.12, .85, k)); S.tapOn = k > .06 && k < .9; }
    if (a === "boil") {
      S.light = k < .96; S.shake = k > .15 && k < .9 && S.level > 0;
      S.steam = S.level > 0 ? sm01(.15, .6, k) * (1 - .55 * sm01(.85, 1, k)) : 0;
      if (k >= .6 && S.level > 0) S.hot = true;
    }
    if (a === "pour") {
      const lift = sm01(0, .22, k) * (1 - sm01(.8, 1, k)), tilt = sm01(.22, .38, k) * (1 - sm01(.72, .82, k));
      S.x = lerp(46, 102, lift); S.y = lerp(56, 44, lift); S.ang = .8 * tilt;
      const lv = S.level;
      if (lv > 0) { const m = c01((k - .4) / .3); S.stream = k > .38 && k < .72; S.cup = Math.max(S.cup, m * lv); S.level = lv * (1 - m); S.tea = S.hot; }
      else { if (k > .4 && k < .85) S.puff = (k - .4) / .45; if (k > .8) S.bad.push(i); }
    }
    if (k >= 1 && !S.bad.includes(i)) S.done.push(i);
  });
  if (t > TEA.t0 + 3 * TEA.step) S.end = true;
  if (S.end && S.tea) S.cupSteam = 1;
  return S;
}
const GLYPH_Q = ["01110", "10001", "00001", "00110", "00100", "00000", "00100"];
function drawTea(cv, order, t) {
  const g = cv.getContext("2d"), S = teaState(order, t);
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, TEA.W, TEA.H);
  // the counter top
  g.fillStyle = "#1d1b33"; g.fillRect(6, 62, 138, 3); g.fillStyle = "#2c2a4a"; g.fillRect(6, 61, 138, 1);
  // the hob, its light red while it boils
  g.fillStyle = "#06060f"; g.fillRect(27, 56, 38, 5); g.fillStyle = "#2a2a3a"; g.fillRect(28, 57, 36, 3); g.fillStyle = "#3e3e52"; g.fillRect(28, 57, 36, 1);
  g.fillStyle = S.light ? (Math.floor(t * 6) % 2 ? "#ff6a4a" : "#ffb04a") : "#4a4058"; g.fillRect(58, 58, 3, 1);
  // the tap, and its water
  g.fillStyle = "#06060f"; g.fillRect(0, 5, 51, 5); g.fillRect(44, 5, 7, 11);
  g.fillStyle = "#8a90a8"; g.fillRect(0, 6, 50, 3); g.fillRect(45, 6, 5, 9); g.fillStyle = "#c3c8dc"; g.fillRect(0, 6, 50, 1);
  g.fillStyle = "#06060f"; g.fillRect(36, 0, 8, 6); g.fillStyle = S.tapOn ? "#ff9a8a" : "#a9bcff"; S.tapOn ? g.fillRect(37, 2, 6, 2) : g.fillRect(39, 1, 2, 4);
  if (S.tapOn) for (let y = 16; y < S.y - 18; y++) { g.fillStyle = (y + Math.floor(t * 30)) % 4 ? "#4f8de8" : "#bde4ff"; g.fillRect(46 + ((y * 7 + Math.floor(t * 20)) % 3 === 0 ? 1 : 0), y, 2, 1); }
  // the kettle (turned to pour)
  paintKettle(S.level, S.hot);
  const sx = S.shake ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
  g.save(); g.translate(Math.round(S.x + sx), Math.round(S.y - 10)); g.rotate(S.ang); g.drawImage(kcv, -17, -18); g.restore();
  const tip = (() => { const px = 16, py = -9, c = Math.cos(S.ang), s = Math.sin(S.ang); return [S.x + px * c - py * s, S.y - 10 + px * s + py * c]; })();
  if (S.stream) for (let y = Math.round(tip[1]) + 1; y < 47; y++) { g.fillStyle = S.tea ? ((y + Math.floor(t * 30)) % 3 ? "#a8743c" : "#e0b070") : "#4f8de8"; g.fillRect(Math.round(tip[0]), y, 2, 1); }
  // steam from the spout while it boils, from the cup when the tea is made
  const steam = (x0, y0, k, n) => { for (let i = 0; i < n; i++) { const ph = (t * .7 + i / n) % 1, x = x0 + Math.round(Math.sin(ph * 7 + i) * 2.5), y = y0 - Math.round(ph * 16);
    if (k * (1 - ph) > ((i * 5 + Math.floor(t * 10)) % 7) / 10) { g.fillStyle = ph < .4 ? "#eef2ff" : "#a9b2d6"; g.fillRect(x, y, 2, 2); } } };
  if (S.steam > 0) steam(tip[0], tip[1] - 2, S.steam, 8);
  // a puff of nothing from an empty kettle
  if (S.puff >= 0) for (let i = 0; i < 9; i++) { const a = i * .7 + .4, r = 2 + S.puff * 9; const x = Math.round(tip[0] + Math.cos(a) * r), y = Math.round(tip[1] + 2 + Math.sin(a) * r * .6);
    if ((1 - S.puff) > (i % 3) * .25) { g.fillStyle = "#8e93b0"; g.fillRect(x, y, 1, 1); } }
  // the cup on its saucer (inside: empty, or tea)
  const cx = 122, cy = 61;
  g.fillStyle = "#06060f"; g.fillRect(cx - 11, cy - 1, 22, 3); g.fillStyle = "#d9cfbd"; g.fillRect(cx - 10, cy - 1, 20, 1);
  for (let y = 0; y < 12; y++) { const hw = Math.round(7 - y * .2); g.fillStyle = "#06060f"; g.fillRect(cx - hw - 1, cy - 13 + y, hw * 2 + 2, 1);
    g.fillStyle = "#f2eadb"; g.fillRect(cx - hw, cy - 13 + y, hw * 2, 1); g.fillStyle = "#c9bfae"; g.fillRect(cx + hw - 3, cy - 13 + y, 3, 1); }
  g.fillStyle = "#06060f"; g.fillRect(cx + 7, cy - 11, 4, 1); g.fillRect(cx + 10, cy - 11, 1, 6); g.fillRect(cx + 7, cy - 5, 4, 1);
  g.fillStyle = "#06060f"; g.fillRect(cx - 7, cy - 15, 14, 3);
  g.fillStyle = S.cup > .05 ? (S.tea ? "#8a5a2b" : "#4f8de8") : "#2a2438"; g.fillRect(cx - 6, cy - 14, 12, 1);
  if (S.cup > .05 && S.tea) { g.fillStyle = "#c58a4a"; g.fillRect(cx - 4, cy - 14, 3, 1); }
  if (S.cupSteam) steam(cx - 2, cy - 17, 1, 6);
  // the empty cup wonders
  if (S.end && S.cup < .05) GLYPH_Q.forEach((row, y) => [...row].forEach((b, x) => { if (b === "1") { g.fillStyle = "#ff9a8a"; g.fillRect(cx - 2 + x, cy - 30 + y + Math.round(Math.sin(t * 3)), 1, 1); } }));
  return S;
}
function teaSteps(el, order) {
  el.innerHTML = TEA_ORDER[order].map((a, i) => `<li><b>${i + 1}</b>${TEA_LABEL[a]}<span class="mark"></span></li>`).join("") +
    `<li class="verdict">${order === "right" ? "A nice cup of tea" : "A cup of cold air"}</li>`;
}
function teaScene(n, order) {
  const cv = $("tea" + n), list = $(`tea${n}steps`);
  return (t) => {
    const S = drawTea(cv, order, t);
    [...list.children].forEach((li, i) => {
      if (li.classList.contains("verdict")) { li.classList.toggle("show", S.end); li.classList.toggle("good", order === "right"); li.classList.toggle("bad", order !== "right"); return; }
      li.classList.toggle("on", S.active === i); li.classList.toggle("ok", S.done.includes(i)); li.classList.toggle("bad", S.bad.includes(i));
    });
    return S.end;
  };
}

// ---- NOVA's stages (art 232 x 124): she comes out of a portal, the command types itself, she does it
const ST = { W: 232, H: 124, NY: 78, PY: 70, AX: 36 };
function stage(id) {
  const el = $(id), [back, front] = el.querySelectorAll("canvas");
  [back, front].forEach((c) => { c.width = ST.W; c.height = ST.H; });
  return { el, host: el.querySelector(".snova"), bg: back.getContext("2d"), fg: front.getContext("2d") };
}
function sizeIntro() {
  const fit = (n) => Math.floor(n * 2) / 2;
  stageK = Math.max(1.5, Math.min(3, fit((Math.min(innerWidth, 900) - 40) / ST.W), fit((innerHeight - 400) / ST.H)));
  [$("stMove"), $("stCollect")].forEach((el) => { el.style.width = ST.W * stageK + "px"; el.style.height = ST.H * stageK + "px";
    el.querySelectorAll("canvas").forEach((c) => { c.style.width = ST.W * stageK + "px"; c.style.height = ST.H * stageK + "px"; }); });
  const tk = Math.max(1.5, Math.min(3, fit((Math.min(innerWidth, 900) - 40) / TEA.W), fit((innerHeight - 470) / TEA.H)));
  ["tea1", "tea2"].forEach((id) => { const c = $(id); c.width = TEA.W; c.height = TEA.H; c.style.width = TEA.W * tk + "px"; c.style.height = TEA.H * tk + "px"; });
}
// put NOVA (her canvas centred on art x, y) on a stage: clipL/clipR hide her past a portal's middle, dark dims her near it
function placeOnStage(S, x, y, { vis = true, clipL = null, clipR = null, dark = 0 } = {}) {
  const k = stageK, c = introNova.canvas, W = c.width, H = c.height, left = x - W / 2, top = y - H / 2;
  if (c.parentElement !== S.host) S.host.append(c);
  c.style.width = W * k + "px"; c.style.height = H * k + "px";
  S.host.style.width = W * k + "px"; S.host.style.height = H * k + "px";   // clip-path measures from this box
  S.host.style.transform = `translate(${(left * k).toFixed(1)}px, ${(top * k).toFixed(1)}px)`;
  S.host.style.clipPath = clipL != null ? `inset(0 0 0 ${Math.max(0, (clipL - left) * k)}px)` : clipR != null ? `inset(0 ${Math.max(0, (left + W - clipR) * k)}px 0 0)` : "none";
  S.host.style.filter = dark > .01 ? `brightness(${(1 - .45 * dark).toFixed(2)})` : "";
  S.host.style.visibility = vis ? "" : "hidden";
}
const near = (x, px) => c01(1 - Math.abs(x - px) / 40);
function typing(id, bubble, text, t, t0, tRun) {
  const el = $(id), n = Math.max(0, Math.min(text.length, Math.floor((t - t0) / .1) + 1));
  el.style.minWidth = `calc(${text.length + 1}ch + 34px)`;
  el.querySelector(".typed").textContent = t < t0 ? "" : text.slice(0, n);
  el.classList.toggle("empty", t < t0);
  el.classList.toggle("done", n >= text.length && t >= t0 + text.length * .1);
  el.classList.toggle("run", t >= tRun && t < tRun + 1.1);
  $(bubble).classList.toggle("wait", t < t0 + text.length * .1 + .1);
}
// move(): out of portal A onto tile 1, move() types, one tile right, portal B opens ahead, in she goes
const MV = { aO: .2, oS: .9, oE: 1.9, aC: 2.05, tS: 2.5, run: 3.3, mS: 3.4, mE: 4.2, bO: 4.55, iS: 5.3, iE: 6.2, bC: 6.35, end: 7 };
let SMOVE = null, SCOL = null;
function sceneMove(t) {
  const S = SMOVE, T1 = TILES[0], T2 = TILES[1], BX = 172;
  S.bg.clearRect(0, 0, ST.W, ST.H); S.fg.clearRect(0, 0, ST.W, ST.H);
  drawPortal(S.bg, S.fg, portalAt(t, MV.aO, MV.aC), ST.AX, ST.PY, 1);
  drawPortal(S.bg, S.fg, portalAt(t, MV.bO, MV.bC), BX, ST.PY, -1);
  drawGround(S.bg, t >= MV.mE - .1 && t < MV.iE ? 1 : -1);
  if (t >= MV.mS && t < MV.bO) {   // the one tile she moves, marked on the ground
    const a = c01((t - MV.mS) / .3) * (1 - c01((t - MV.bO + .3) / .3));
    S.fg.globalAlpha = a; S.fg.fillStyle = "#a9bcff";
    for (let x = T1 + 2; x < T2 - 3; x += 3) S.fg.fillRect(x, GY - 3, 2, 1);
    S.fg.fillRect(T2 - 4, GY - 4, 1, 3); S.fg.fillRect(T2 - 3, GY - 3, 1, 1); S.fg.globalAlpha = 1;
  }
  let x = T1, o = { vis: true };
  if (t < MV.oS) o.vis = false;
  else if (t < MV.oE) { x = lerp(ST.AX - 30, T1, easeOut((t - MV.oS) / (MV.oE - MV.oS))); o.dark = near(x, ST.AX); }
  else if (t < MV.mS) x = T1;
  else if (t < MV.mE) x = lerp(T1, T2, easeIO((t - MV.mS) / (MV.mE - MV.mS)));
  else if (t < MV.iS) x = T2;
  else if (t < MV.iE) { x = lerp(T2, BX + 32, easeIn((t - MV.iS) / (MV.iE - MV.iS))); o.dark = near(x, BX); }
  else o.vis = false;
  if (t < MV.aC + .5) o.clipL = ST.AX;
  if (t >= MV.iS) o.clipR = BX;
  placeOnStage(S, x, ST.NY, o);
  introNova.yaw = -.35; introNova.sway = t > MV.mS && t < MV.mE ? -Math.sin((t - MV.mS) / (MV.mE - MV.mS) * Math.PI) * .25 : 0;
  moodOf(introNova, t > MV.bO - .2 && t < MV.iS ? "angry" : "idle");   // she frowns to tear the portal open, as in her warp
  typing("cmd3", "bub3", "move()", t, MV.tS, MV.run);
  return t >= MV.end;
}
// collect(): out of portal A onto the Bit's tile, collect() types, her telekinesis lifts the Bit and takes it
const CL = { aO: .2, oS: .9, oE: 1.9, aC: 2.05, tS: 2.45, run: 3.45, tk: 3.5, lS: 3.8, lE: 4.9, pS: 4.95, pE: 5.4, end: 6.2 };
function sceneCollect(t) {
  const S = SCOL, T1 = TILES[0];
  S.bg.clearRect(0, 0, ST.W, ST.H); S.fg.clearRect(0, 0, ST.W, ST.H);
  drawPortal(S.bg, S.fg, portalAt(t, CL.aO, CL.aC), ST.AX, ST.PY, 1);
  drawGround(S.bg);
  let x = T1, o = { vis: true };
  if (t < CL.oS) o.vis = false;
  else if (t < CL.oE) { x = lerp(ST.AX - 30, T1, easeOut((t - CL.oS) / (CL.oE - CL.oS))); o.dark = near(x, ST.AX); }
  if (t < CL.aC + .5) o.clipL = ST.AX;
  placeOnStage(S, x, ST.NY, o);
  // the Bit: resting on her tile, then lifted beside her in purple telekinesis, then taken
  const lift = easeIO(c01((t - CL.lS) / (CL.lE - CL.lS))), pop = c01((t - CL.pS) / (CL.pE - CL.pS));
  const bx = lerp(T1 + 14, T1 + 22, lift), by = lerp(GY - 6, ST.NY - 8, lift) + Math.sin(t * 4) * lift;
  const tk = sm01(CL.tk, CL.tk + .3, t) * (1 - sm01(CL.pS, CL.pE, t));
  if (pop < 1) drawCoin(S.fg, bx, by, t * (2 + lift * 6 + pop * 20), tk, t);
  if (pop > 0 && pop < 1) for (let i = 0; i < 10; i++) {   // the Bit bursts into sparkles
    const a = i * .628, r = 3 + pop * 13; S.fg.fillStyle = i % 2 ? "#ffd75a" : "#cba2ff";
    S.fg.fillRect(Math.round(bx + Math.cos(a) * r), Math.round(by + Math.sin(a) * r), 1 + (pop < .5), 1 + (pop < .5));
  }
  // her telekinesis strands reach from her to the Bit (her renderer draws them; we tell it where the Bit is)
  const n = introNova, W = n.canvas.width, H = n.canvas.height, cpx = bx - (x - W / 2), cpy = by - (ST.NY - H / 2);
  const wx = (cpx - W / 2) / H * n.view, wy = (H / 2 - cpy) / H * n.view + .1 - (n.lastBob || 0);
  n.idle.tk = tk; n.idle.bucketAt = [wx / Math.cos(n.yaw), wy, 0]; n.idle.bucket = 0;
  n.yaw = -.35; n.sway = 0;
  moodOf(n, t >= CL.pS + .1 ? "happy" : t >= CL.tk ? "angry" : "idle");
  typing("cmd4", "bub4", "collect()", t, CL.tS, CL.run);
  const got = t >= CL.pE ? 1 : 0, cn = $("scountN");
  if (cn.textContent !== String(got)) { cn.textContent = got; if (got) { const c = $("scount"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); } }
  return t >= CL.end;
}
const SCENES = { 1: null, 2: null, 3: sceneMove, 4: sceneCollect };
function introLoop(now) {
  if ($("intro").classList.contains("gone")) { introRunning = false; return; }
  const sc = SCENES[page], t = stillT ?? (REDUCED ? 99 : (now - sceneT0) / 1000);
  const done = sc ? sc(t) : false;
  $("nextP").classList.toggle("nudge", !!done && page < PAGES - 1);
  requestAnimationFrame(introLoop);
}
let introRunning = false;
function showPage(n) {
  page = Math.max(0, Math.min(PAGES - 1, n)); sceneT0 = performance.now();
  document.querySelectorAll(".page").forEach((p) => { const k = +p.dataset.p; p.classList.toggle("on", k === page); p.classList.toggle("past", k < page); });
  $("pcount").textContent = `${page + 1} of ${PAGES}`; $("prevP").disabled = page === 0;
  $("nextP").hidden = page === PAGES - 1; $("startBtn").hidden = page !== PAGES - 1;
  // NOVA lives on whichever page shows her
  if (introNova) {
    const n = introNova; n.idle.tk = 0; moodOf(n, page === 0 ? "happy" : "idle"); n.sway = 0;
    if (page === 0) { $("introNova").append(n.canvas); n.canvas.style.width = n.canvas.width * 2 + "px"; n.canvas.style.height = n.canvas.height * 2 + "px"; n.yaw = .25; }
  }
  if (!introRunning) { introRunning = true; requestAnimationFrame(introLoop); }
}
export function closeIntro() {
  $("intro").classList.add("gone");
  onClose();
}
export const introOpen = () => !$("intro").classList.contains("gone");
export function openIntro(n = 0) { $("intro").classList.remove("gone"); showPage(n); }
// test hook: hold every scene at this many seconds
export function holdIntro(t) { stillT = t; }
export function initIntro({ closed } = {}) {
  onClose = closed || onClose;
  teaSteps($("tea1steps"), "right"); teaSteps($("tea2steps"), "wrong");
  SCENES[1] = teaScene(1, "right"); SCENES[2] = teaScene(2, "wrong");
  SMOVE = stage("stMove"); SCOL = stage("stCollect"); makeGround();
  // the same NOVA as in the game: her mooncloak body at the roaming size (art px), drawn 2x on the title page
  introNova = new PixelNova($("introNova"), { kind: "mooncloak", w: 107, h: 113, px: 2, view: 4.79, shadow: false });
  introNova.bill = 1;
  sizeIntro(); addEventListener("resize", sizeIntro);
}
$("prevP").onclick = () => showPage(page - 1); $("nextP").onclick = () => showPage(page + 1);
$("startBtn").onclick = closeIntro; $("skipIntro").onclick = closeIntro;
document.querySelectorAll("[data-replay]").forEach((b) => (b.onclick = () => (sceneT0 = performance.now())));
addEventListener("keydown", (e) => { if ($("intro").classList.contains("gone")) return; if (e.key === "ArrowRight") showPage(page + 1); if (e.key === "ArrowLeft") showPage(page - 1); if (e.key === "Escape") closeIntro(); });
