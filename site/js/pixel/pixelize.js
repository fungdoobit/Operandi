// Hi-bit pixel filter for a live SVG character (DOT and PYRO), so they match
// GOLEM and NOVA. Every frame we read the SVG as it is right now (shapes,
// colours, moods, accessories, CSS animations, particles), draw it onto a small
// canvas, then turn that into pixel art:
//   - hard edges (no anti-aliasing), see-through bits become a dither pattern
//   - colours snapped to a few levels with ordered (Bayer) dithering
//   - a dark one-pixel outline round the whole figure
// The canvas sits over the SVG, which stays in the page (invisible) so clicks,
// dragging and the battle code that measures it all keep working.
// (Isaac 2026-10-21: the filter for now; a full 3D rebuild like NOVA comes later.)

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const SKIP = new Set(["defs", "clipPath", "filter", "linearGradient", "radialGradient", "style", "title"]);
const LEVELS = 7;    // colour levels per channel

export class Pixelizer {
  // svg: the live <svg>; host: its positioned parent; ink: outline colour.
  constructor(svg, host, { ink = "#0b1a2a", glow = null, pad = 0.4 } = {}) {
    this.svg = svg; this.host = host; this.pad = pad;
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    this.ink = rgb(ink); this.glow = glow && rgb(glow);
    this.canvas = document.createElement("canvas");
    this.canvas.className = "px-dot";
    Object.assign(this.canvas.style, { position: "absolute", pointerEvents: "none", imageRendering: "pixelated" });
    host.append(this.canvas);
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    svg.style.opacity = "0";
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  stop() { this.stopped = true; this.canvas.remove(); this.svg.style.opacity = ""; }

  // Size and place the canvas over the SVG box (plus room round it for hats and splashes).
  layout() {
    const w = this.svg.clientWidth, h = this.svg.clientHeight;
    if (!w || !h) return false;
    // One art pixel is 2 of his own CSS pixels, roaming and in battle (where the whole stage is
    // scaled), the same size as GOLEM's and NOVA's (Isaac 2026-10-23: one consistent pixel size).
    const k = 2;
    const W = Math.round(w * (1 + 2 * this.pad) / k), H = Math.round(h * (1 + 2 * this.pad) / k);
    if (this.canvas.width !== W || this.canvas.height !== H || this.k !== k) {
      this.canvas.width = W; this.canvas.height = H; this.k = k;
      this.canvas.style.width = W * k + "px"; this.canvas.style.height = H * k + "px";
    }
    // (an <svg> has no offsetLeft: measure it against the host, in the host's own CSS pixels)
    const sr = this.svg.getBoundingClientRect(), hr = this.host.getBoundingClientRect(), z = this.host.offsetWidth / (hr.width || 1);
    this.canvas.style.left = ((sr.left - hr.left) * z - w * this.pad) + "px";
    this.canvas.style.top = ((sr.top - hr.top) * z - h * this.pad) + "px";
    return true;
  }

  frame() {
    if (this.stopped || !this.svg.isConnected) return;
    requestAnimationFrame(this.frame);
    // 30 fps is plenty for pixel art and halves the work.
    if ((this.flip = !this.flip)) return;
    if (!this.layout()) return;
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    // screen px -> canvas px (handles the pet moving, the battle scaling, the flip...)
    this.toCanvas = new DOMMatrix().scale(canvas.width / r.width, canvas.height / r.height).translate(-r.left, -r.top);
    const hurt = this.host.classList.contains("hurt");
    ctx.filter = hurt ? "brightness(1.9) saturate(.5)" : "none";
    this.walk(this.svg, 1);
    ctx.filter = "none";
    this.pixelate();
  }

  // Draw every visible shape, in order, with its live transform and style.
  walk(el, alpha) {
    const { ctx } = this;
    for (const c of el.children) {
      const tag = c.tagName;
      if (SKIP.has(tag)) continue;
      const cs = getComputedStyle(c);
      if (cs.display === "none") continue;
      const a = alpha * parseFloat(cs.opacity);
      if (a < 0.02) continue;
      if (tag === "g") {
        const clip = c.getAttribute("clip-path")?.match(/#([^)"']+)/);
        const cp = clip && this.svg.getElementById(clip[1])?.querySelector("path");
        if (cp && cp.getAttribute("d")) {
          ctx.save();
          this.useCTM(c);
          ctx.clip(new Path2D(cp.getAttribute("d")));
          this.walk(c, a);
          ctx.restore();
        } else this.walk(c, a);
        continue;
      }
      if (cs.visibility === "hidden") continue;
      const p = this.shape(c, tag, cs);
      if (!p) continue;
      this.useCTM(c);
      const fill = this.paint(c, cs.fill);
      if (fill) { ctx.globalAlpha = a * parseFloat(cs.fillOpacity); ctx.fillStyle = fill; tag === "text" ? ctx.fillText(c.textContent, +c.getAttribute("x"), +c.getAttribute("y")) : ctx.fill(p); }
      const stroke = this.paint(c, cs.stroke);
      if (stroke && tag !== "text") {
        ctx.globalAlpha = a * parseFloat(cs.strokeOpacity);
        ctx.strokeStyle = stroke; ctx.lineWidth = parseFloat(cs.strokeWidth) || 1;
        ctx.lineCap = cs.strokeLinecap; ctx.lineJoin = cs.strokeLinejoin;
        ctx.setLineDash(cs.strokeDasharray === "none" ? [] : cs.strokeDasharray.split(/[ ,]+/).map(parseFloat));
        ctx.stroke(p);
      }
    }
    ctx.globalAlpha = 1;
  }

  useCTM(el) {
    const m = el.getScreenCTM();
    if (m) this.ctx.setTransform(this.toCanvas.multiply(DOMMatrix.fromMatrix(m)));
  }

  // The element as a Path2D (text returns a stub and is drawn with fillText).
  shape(c, tag, cs) {
    const n = (k) => c[k]?.baseVal?.value ?? 0;
    const p = new Path2D();
    if (tag === "path") { const d = c.getAttribute("d"); return d ? new Path2D(d) : null; }
    if (tag === "circle") { p.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2); return p; }
    if (tag === "ellipse") { p.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2); return p; }
    if (tag === "rect") {
      const x = n("x"), y = n("y"), w = n("width"), h = n("height"), r = Math.min(n("rx") || n("ry"), w / 2, h / 2);
      p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
      return p;
    }
    if (tag === "text") { this.ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return p; }
    return null;
  }

  // A fill/stroke value: a colour, or a gradient (rebuilt over the shape's box).
  paint(c, v) {
    if (!v || v === "none") return null;
    const id = v.match(/url\(["']?#([^"')]+)/)?.[1];
    if (!id) return v;
    const g = this.svg.getElementById(id);
    if (!g) return null;
    const b = c.getBBox(), f = (a, d) => { const s = g.getAttribute(a); return s == null ? d : s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s); };
    let grad;
    if (g.tagName === "radialGradient") {
      const r = f("r", 0.5) * Math.hypot(b.width, b.height) / Math.SQRT2;
      grad = this.ctx.createRadialGradient(b.x + f("cx", 0.5) * b.width, b.y + f("cy", 0.5) * b.height, 0, b.x + f("cx", 0.5) * b.width, b.y + f("cy", 0.5) * b.height, r);
    } else {
      grad = this.ctx.createLinearGradient(b.x + f("x1", 0) * b.width, b.y + f("y1", 0) * b.height, b.x + f("x2", 1) * b.width, b.y + f("y2", 0) * b.height);
    }
    for (const s of g.querySelectorAll("stop")) {
      const col = s.getAttribute("stop-color") || "#000", op = s.getAttribute("stop-opacity") ?? 1;
      grad.addColorStop(Math.min(1, parseFloat(s.getAttribute("offset")) / (String(s.getAttribute("offset")).endsWith("%") ? 100 : 1)), withAlpha(col, +op));
    }
    return grad;
  }

  // The pixel-art pass, on the canvas's own pixels.
  pixelate() {
    const { ctx, canvas } = this, W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    const solid = new Uint8Array(W * H);
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        const o = i * 4, a = d[o + 3], b = B4[(y & 3) * 4 + (x & 3)];
        if (a < 14) { d[o + 3] = 0; continue; }
        if (a < 120) {
          // see-through (shadows, glows, fading particles): a dither pattern instead
          if (a / 120 > b) d[o + 3] = 150; else { d[o + 3] = 0; continue; }
        } else { d[o + 3] = 255; solid[i] = 1; }
        for (let k = 0; k < 3; k++) d[o + k] = Math.min(255, Math.floor((d[o + k] / 255) * (LEVELS - 1) + b) * (255 / (LEVELS - 1)));
      }
    }
    // one-pixel dark outline round the solid parts
    const [ir, ig, ib] = this.ink;
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
          const o = i * 4; d[o] = ir; d[o + 1] = ig; d[o + 2] = ib; d[o + 3] = 255;
        }
      }
    }
    // his glow: a dithered halo two pixels deep outside the outline
    if (this.glow) {
      const [gr, gg, gb] = this.glow, edge = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (!solid[i] && d[i * 4 + 3] === 255) edge[i] = 1;
      for (let ring = 0; ring < 2; ring++) {
        const next = new Uint8Array(W * H);
        for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
          if (d[i * 4 + 3] || edge[i]) continue;
          if (!((x > 0 && edge[i - 1]) || (x < W - 1 && edge[i + 1]) || (y > 0 && edge[i - W]) || (y < H - 1 && edge[i + W]))) continue;
          next[i] = 1;
          if (B4[(y & 3) * 4 + (x & 3)] < (ring ? 0.3 : 0.65)) { const o = i * 4; d[o] = gr; d[o + 1] = gg; d[o + 2] = gb; d[o + 3] = ring ? 90 : 140; }
        }
        for (let i = 0; i < W * H; i++) if (next[i]) edge[i] = 1;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}

// "#rrggbb" or "rgb(...)" plus an opacity -> an rgba() string.
function withAlpha(col, a) {
  if (col.startsWith("#")) {
    const h = col.length === 4 ? col.slice(1).split("").map((x) => x + x).join("") : col.slice(1);
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
  }
  return a >= 1 ? col : col.replace(/rgba?\(([^)]+)\)/, (_, inner) => `rgba(${inner.split(",").slice(0, 3).join(",")},${a})`);
}
