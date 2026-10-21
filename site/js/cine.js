// Cinematic tricks shared by the abilities (Isaac 2026-10-21: "5 times more
// cinematic and impactful"):
//   - impactFrame: one or two frames where the whole picture flips to its
//     negative on a big hit, the classic anime impact frame
//   - speedLines: white lines rushing in toward a point (focus lines)
//   - drawVoidPortal: NOVA's portal, after her popcorn portal: a jagged tear
//     that rips open into a swirling vortex with a burning violet rim
import { glow } from "./pixel/pixel-fx.js";

// Flip the stage to its negative for `ms` (real time), then back.
export function impactFrame(fx, { ms = 70, frames = 1 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!fx.invertEl) {
    fx.invertEl = document.createElement("div");
    Object.assign(fx.invertEl.style, { position: "absolute", inset: 0, background: "#fff", mixBlendMode: "difference", zIndex: 19, pointerEvents: "none", display: "none" });
    fx.stage.append(fx.invertEl);
  }
  const el = fx.invertEl;
  for (let i = 0; i < frames; i++) {
    setTimeout(() => { el.style.display = "block"; }, i * ms * 2);
    setTimeout(() => { el.style.display = "none"; }, i * ms * 2 + ms);
  }
}

// Focus lines rushing toward `at` (a point, or a function giving one) for ms.
export function speedLines(px, at, ms, { n = 46, color = "#ffffff", inner = 120 } = {}) {
  const lines = Array.from({ length: n }, () => ({ a: Math.random() * Math.PI * 2, w: 1 + Math.random() * 3, s: Math.random() }));
  return px.add({ dur: ms, draw(g, k, t) {
    const p = typeof at === "function" ? at() : at, W = px.w, H = px.h, far = Math.hypot(W, H);
    const fade = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
    g.fillStyle = color;
    for (const l of lines) {
      if (((t / 40 + l.s * 10) | 0) % 3 === 0) continue;   // flicker
      const a = l.a + Math.sin(t * 0.01 + l.s * 9) * 0.02, r0 = inner + l.s * 80, cos = Math.cos(a), sin = Math.sin(a);
      g.globalAlpha = 0.85 * fade;
      g.beginPath();
      g.moveTo(p.x + cos * r0, p.y + sin * r0);
      g.lineTo(p.x + cos * far - sin * l.w * 6, p.y + sin * far + cos * l.w * 6);
      g.lineTo(p.x + cos * far + sin * l.w * 6, p.y + sin * far - cos * l.w * 6);
      g.fill();
    }
    g.globalAlpha = 1;
  } });
}

// A short freeze plus a negative frame plus a big shake: the strongest hit.
export function bigHit(fx, at, { stop = 180, shake = 30, punch = 0.07, flash = "#ffffff", invert = true } = {}) {
  fx.hitstop(stop); fx.shake(shake); fx.punch(punch, at); fx.flash(0.5, flash);
  if (invert) impactFrame(fx, { ms: 60, frames: 2 });
}

// ---- NOVA's portal ----
// P = { x, y, rx, ry, rot, open (0..1), tear (0..1), seed }. The long axis is
// rx; tear draws the jagged slash it rips out of; open widens it into the
// vortex. Drawn on a PixelFX layer, so things that come out of it (on the toon
// layer) appear in front.
export function drawVoidPortal(g, P, t) {
  const { x, y, rx, ry, rot = 0, open = 0, tear = 0, seed = 0 } = P;
  if (tear <= 0 && open <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot);
  // the slash it tears out of: a jagged line of white light
  if (tear > 0 && open < 1) {
    const L = rx * tear, a = 1 - open;
    glow(g, 0, 0, L * 0.9, "#a066f0", 0.5 * a);
    g.globalAlpha = a; g.fillStyle = "#f3e6ff"; g.beginPath(); g.moveTo(-L, 0);
    for (let i = 1; i < 12; i++) { const u = i / 12; g.lineTo(-L + 2 * L * u, (i % 2 ? -1 : 1) * (2 + 4 * Math.sin(u * Math.PI)) * (1 + 0.5 * Math.sin(seed + i * 7))); }
    g.lineTo(L, 0);
    for (let i = 11; i > 0; i--) { const u = i / 12; g.lineTo(-L + 2 * L * u, (i % 2 ? 1 : -1) * 1.5); }
    g.closePath(); g.fill(); g.globalAlpha = 1;
  }
  if (open > 0) {
    const a = rx, b = Math.max(2, ry * open);
    // outer aura and the jagged rim rays, whirling
    glow(g, 0, 0, a * 1.5, "#7838d0", 0.55);
    for (let i = 0; i < 34; i++) {
      const ang = (i / 34) * Math.PI * 2 + t * 0.0009 * (i % 2 ? 1 : -1.4), cs = Math.cos(ang), sn = Math.sin(ang);
      const len = (10 + 26 * Math.abs(Math.sin(t * 0.012 + i * 2.7 + seed))) * open, wid = 0.07;
      const nx = cs * (a + len), ny = sn * (b + len * 0.6);
      g.fillStyle = i % 3 ? "#8a4dff" : "#e8d4ff";
      g.beginPath(); g.moveTo(Math.cos(ang - wid) * a, Math.sin(ang - wid) * b); g.lineTo(nx, ny); g.lineTo(Math.cos(ang + wid) * a, Math.sin(ang + wid) * b); g.fill();
    }
    // the void inside: near black, deep violet at the edge
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, "#020006"); gr.addColorStop(0.55, "#0b0320"); gr.addColorStop(0.85, "#2a0e5c"); gr.addColorStop(1, "#5a24a8");
    g.save(); g.scale(a, b); g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.restore();
    // spiral arms of light winding into the middle
    g.save(); g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, Math.PI * 2); g.clip();
    for (let arm = 0; arm < 5; arm++) {
      g.beginPath();
      for (let k = 0; k <= 26; k++) { const u = k / 26, ang = arm * (Math.PI * 2 / 5) + u * 4.4 - t * 0.0045, r = 1 - u * 0.95; const px = Math.cos(ang) * a * r, py = Math.sin(ang) * b * r; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.lineWidth = 7 * open; g.strokeStyle = arm % 2 ? "#4a1c94" : "#7838d0"; g.stroke();
      g.lineWidth = 2; g.strokeStyle = "#cba2ff"; g.stroke();
    }
    // shards whirling inward
    for (let i = 0; i < 16; i++) {
      const u = ((t * 0.0005 + i / 16) % 1), ang = i * 2.4 - t * 0.004 + u * 3, r = 1 - u;
      g.fillStyle = i % 3 ? "#cba2ff" : "#ffffff"; g.fillRect(Math.cos(ang) * a * r - 1.5, Math.sin(ang) * b * r - 1.5, 3, 3);
    }
    g.restore();
    // the burning rim
    g.lineWidth = 5; g.strokeStyle = "#a066f0"; g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.strokeStyle = "#f3e6ff"; g.beginPath(); g.ellipse(0, 0, a - 3, Math.max(1, b - 3), 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}
