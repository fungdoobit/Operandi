// Characters for the hand-drawn battle concept. All original designs; the
// inspiration is the mood and motion of Hollow Knight (inky bodies, pale
// masks with hollow eyes, held anticipation then a very fast strike).
import { svgEl, partsFrom, Puppet, Dome, GROUND, rand, pick } from "./engine.js";

const INK = "#04060a";

// ---------------------------------------------------------------------------
// Teammates: DOT (water) and PYRO (fire). A little goo creature wearing a pale
// porcelain droplet mask with hollow eyes; its light shows through as a core.

const SKINS = {
  dot: { name: "DOT", body: "#121b2a", rim: "#76c4ee", core: "#aeeaff", mask: "#e8edf1", shade: "#c0cbd6", slash: "#d3f1ff", soul: "#dff4ff" },
  pyro: { name: "PYRO", body: "#1c1311", rim: "#ff8a3d", core: "#ffc06b", mask: "#efe3d3", shade: "#cbb59c", slash: "#ffd7a3", soul: "#ffe2b8" },
};

export class Teammate {
  constructor(stage, { skin = "dot", x = 250 } = {}) {
    this.stage = stage; this.clock = stage.clock; this.home = x; this.skinId = skin;
    const k = this.k = SKINS[skin];
    this.g = svgEl("g", { transform: `translate(${x} ${GROUND})` }, stage.layers.chars);
    this.shadow = svgEl("ellipse", { cx: 0, cy: 2, rx: 38, ry: 6, fill: "#000", opacity: ".45" }, this.g);
    const art = svgEl("g", { filter: "url(#hkInk)" }, this.g);
    const fire = skin === "pyro";
    art.innerHTML = `
    <g class="p-root"><g class="p-body">
      <g class="p-armB"><path d="M-20 -44 C-36 -44 -46 -32 -44 -18 C-40 -26 -32 -32 -20 -32 Z" fill="${k.body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>
      <path d="M-38 0 C-44 -16 -41 -38 -29 -52 C-17 -64 18 -64 30 -50 C41 -36 44 -16 38 0 C33 3 29 -1 25 1 C21 9 16 9 14 1 C6 3 -6 3 -12 1 C-16 9 -22 9 -24 1 C-29 3 -34 3 -38 0 Z" fill="${k.body}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M-33 -9 C-39 -26 -33 -44 -22 -54" fill="none" stroke="${k.rim}" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>
      <path d="M33 -12 C37 -24 34 -38 27 -47" fill="none" stroke="${k.rim}" stroke-width="1.6" stroke-linecap="round" opacity=".4"/>
      <circle class="core-glow" cx="4" cy="-22" r="14" fill="${k.core}" opacity=".35" filter="url(#hkSoftGlow)"/>
      <circle cx="4" cy="-22" r="6" fill="${k.core}" filter="url(#hkGlow)"/>
      <circle cx="-14" cy="-12" r="1.8" fill="${k.core}" opacity=".6"/><circle cx="20" cy="-30" r="1.4" fill="${k.core}" opacity=".5"/><circle cx="-6" cy="-36" r="1.2" fill="${k.core}" opacity=".5"/>
      <g class="p-armF"><path d="M20 -44 C36 -44 46 -32 44 -18 C40 -26 32 -32 20 -32 Z" fill="${k.body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>
      <g class="p-head">
        ${fire ? `<g class="p-flames">
          <path d="M-14 -96 C-24 -114 -12 -126 -18 -146 C-2 -132 4 -114 -4 -100 Z" fill="#ff6a2a" opacity=".9" filter="url(#hkGlow)"/>
          <path d="M2 -104 C-4 -124 8 -136 4 -160 C20 -140 22 -118 12 -102 Z" fill="#ff8a3d" opacity=".95" filter="url(#hkGlow)"/>
          <path d="M16 -94 C14 -108 24 -116 22 -130 C32 -116 32 -104 24 -94 Z" fill="#ff6a2a" opacity=".85" filter="url(#hkGlow)"/>
          <path d="M3 -106 C0 -120 8 -128 6 -142 C15 -128 16 -116 10 -106 Z" fill="#ffd28a"/>
        </g>` : ""}
        <path d="M-6 -114 C-1 -101 27 -92 31 -70 C35 -50 20 -40 2 -40 C-17 -40 -33 -50 -31 -70 C-29 -88 -14 -99 -6 -114 Z" fill="${k.mask}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M-6 -114 C-11 -116 -15 -111 -12 -106" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M-30 -62 C-26 -45 27 -45 31 -62 C24 -50 -22 -50 -30 -62 Z" fill="${k.shade}"/>
        ${fire ? `<path d="M-22 -92 L-15 -84 L-19 -76 M20 -90 L14 -84 L17 -78" fill="none" stroke="#ff8a3d" stroke-width="1.8" stroke-linecap="round" filter="url(#hkGlow)"/>` : `<path d="M-20 -88 C-16 -94 -10 -98 -6 -100" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`}
        <g class="eyes" data-e="open"><ellipse cx="-8" cy="-70" rx="7.5" ry="10.5" transform="rotate(-6 -8 -70)" fill="${INK}"/><ellipse cx="14" cy="-70" rx="7.5" ry="10.5" transform="rotate(6 14 -70)" fill="${INK}"/></g>
        <g class="eyes" data-e="wide" style="display:none"><ellipse cx="-8" cy="-70" rx="8.5" ry="12.5" fill="${INK}"/><ellipse cx="14" cy="-70" rx="8.5" ry="12.5" fill="${INK}"/><circle cx="-8" cy="-70" r="2" fill="${k.core}"/><circle cx="14" cy="-70" r="2" fill="${k.core}"/></g>
        <g class="eyes" data-e="fierce" style="display:none" fill="${INK}"><path d="M-17 -76 L-1 -71 C-1 -64 -5 -60 -9 -60 C-14 -60 -17 -66 -17 -76 Z"/><path d="M23 -76 L7 -71 C7 -64 11 -60 15 -60 C20 -60 23 -66 23 -76 Z"/></g>
        <g class="eyes" data-e="happy" style="display:none" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"><path d="M-15 -66 Q-8 -78 -1 -66"/><path d="M7 -66 Q14 -78 21 -66"/></g>
        <g class="eyes" data-e="ko" style="display:none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"><path d="M-14 -76 L-2 -64 M-2 -76 L-14 -64"/><path d="M8 -76 L20 -64 M20 -76 L8 -64"/></g>
        <path class="crack" d="M10 -106 L4 -92 L12 -84 L5 -72 L9 -62" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" style="display:none"/>
      </g>
    </g></g>`;
    this.eyesEls = [...art.querySelectorAll(".eyes")];
    this.crack = art.querySelector(".crack");
    this.coreGlow = art.querySelector(".core-glow");
    this.pup = new Puppet(this.clock, partsFrom(art.querySelector(".p-root"), {
      root: [0, 0], body: [0, 0], head: [0, -46], armF: [20, -40], armB: [-20, -40], ...(fire ? { flames: [2, -100] } : {}),
    }));
    this.mood = "idle";
    stage.add(this);
  }

  eyes(name) { this.eyesEls.forEach((e) => (e.style.display = e.dataset.e === name ? "" : "none")); }
  // Where the teammate is on the stage (for things aimed at it).
  center() { return { x: this.home + this.pup.get("root", "x"), y: GROUND - 44 + this.pup.get("root", "y") }; }

  frame(t) {
    const breathe = this.mood === "ko" ? 0 : Math.sin(t * 2.4);
    const extra = {
      body: { sy: 1 + breathe * 0.03, sx: 1 - breathe * 0.02 },
      head: { y: Math.sin(t * 2.4 + 0.7) * 1.4 },
      armF: { r: Math.sin(t * 2.4 + 0.3) * 5 }, armB: { r: -Math.sin(t * 2.4 + 0.5) * 5 },
      flames: { sy: 1 + Math.sin(t * 11) * 0.1 + Math.sin(t * 17) * 0.05, r: Math.sin(t * 5) * 4, sx: 1 + Math.sin(t * 7) * 0.05 },
    };
    this.pup.render(extra);
    const lift = -this.pup.get("root", "y");
    this.shadow.setAttribute("transform", `translate(${this.pup.get("root", "x").toFixed(1)} 0) scale(${Math.max(0.4, 1 - lift / 200).toFixed(3)} 1)`);
    this.coreGlow.setAttribute("opacity", (0.3 + 0.12 * Math.sin(t * 3)).toFixed(2));
  }

  // Attack: crouch, dash in, slash (two crossing slashes on a crit), recoil, hop home.
  // target: { x, y } of the boss; onHit(): the battle decides what the slash does.
  async attack({ target, crit = false, onHit }) {
    const P = this.pup, S = this.stage;
    this.eyes("fierce");
    await P.to({ root: { x: -14, sy: 0.84, sx: 1.12 }, armF: { r: -50 }, head: { r: -6 } }, 160, "out");
    await this.clock.wait(crit ? 160 : 90);
    const reach = target.x - this.home - 150;
    S.dust(this.home - 10, 5, 1.2);
    for (let i = 0; i < 3; i++) this.clock.wait(i * 30).then(() => this.afterimage());
    await P.to({ root: { x: reach, sy: 0.92, sx: 1.14 }, head: { r: 4 } }, 110, "snap");
    P.to({ armF: { r: 80 }, root: { sy: 1.06, sx: 0.94 } }, 70, "snap");
    S.slash(target.x - 90, target.y, { color: this.k.slash, size: 82, angle: -10 });
    onHit?.(1);
    if (crit) {
      await this.clock.wait(110);
      P.to({ armF: { r: -60 } }, 60, "snap");
      S.slash(target.x - 80, target.y - 10, { color: "#ffffff", size: 96, angle: 160, flip: -1 });
      onHit?.(2);
    }
    await this.clock.wait(60);
    await P.to({ root: { x: reach - 60, y: -24, sy: 1, sx: 1 }, armF: { r: 0 }, head: { r: 0 } }, 160, "out");
    await P.to({ root: { x: 0, y: -46 } }, 260, "inOut");
    await P.to({ root: { y: 0 } }, 120, "in");
    S.dust(this.home, 4, 0.8);
    await P.to({ root: { sy: 0.86, sx: 1.12 } }, 70, "out");
    await P.to({ root: { sy: 1, sx: 1 } }, 160, "back");
    this.eyes("open");
  }

  // A fading copy left behind during the dash.
  afterimage() {
    const c = this.g.querySelector(".p-root").cloneNode(true);
    const g = svgEl("g", { transform: this.g.getAttribute("transform"), opacity: ".35", filter: "url(#hkWhite)" }, this.stage.layers.chars);
    g.append(c);
    this.stage.particle({ el: g, max: 200, update(p, k, f) { g.setAttribute("opacity", (0.35 * (1 - f)).toFixed(2)); } });
  }

  // Struck: hit-stop, flash, black ink burst, knocked back.
  async hurt({ crit = false } = {}) {
    const P = this.pup, S = this.stage, c = this.center();
    S.hitstop(crit ? 140 : 100); S.shake(crit ? 16 : 11); S.inkBurst(c.x, c.y, crit ? 1.3 : 1);
    this.flash(120);
    this.eyes("wide");
    await P.to({ root: { x: -46, y: -16, r: -12, sx: 1.18, sy: 0.84 }, head: { r: -10 } }, 140, "out");
    await P.to({ root: { y: 0, r: -4, sx: 1, sy: 1 } }, 160, "in");
    S.dust(this.home - 46, 3, 0.6);
    await P.to({ root: { x: 0, r: 0 }, head: { r: 0 } }, 360, "inOut");
    this.eyes("open");
  }

  flash(ms) {
    this.g.setAttribute("filter", "url(#hkWhite)");
    this.clock.wait(ms).then(() => this.g.removeAttribute("filter"));
  }

  // Mobbed by the Typo Swarm: flinching side to side. No damage.
  async swarmed(ms = 1500) {
    this.eyes("wide");
    for (let t = 0, s = 1; t < ms; t += 140, s = -s) {
      this.pup.to({ root: { x: s * 7, r: s * 6 }, head: { r: -s * 8 } }, 120, "out");
      await this.clock.wait(140);
    }
    await this.pup.to({ root: { x: 0, r: 0 }, head: { r: 0 } }, 200, "out");
    this.eyes("open");
  }

  // Knocked out: the mask cracks, the goo collapses, soul leaks out.
  async ko() {
    this.mood = "ko";
    const P = this.pup, S = this.stage, c = this.center();
    S.hitstop(220); S.shake(14); S.flash(0.25); S.inkBurst(c.x, c.y, 1.4);
    this.eyes("ko"); this.crack.style.display = "";
    await P.to({ root: { x: -30, y: -30, r: -20 } }, 200, "out");
    await P.to({ root: { y: 0, r: -8 } }, 180, "in");
    S.dust(this.home - 30, 6);
    S.souls(c.x - 20, c.y, 10, { color: this.k.soul });
    await P.to({ body: { sy: 0.55, sx: 1.3 }, head: { y: 26, r: 24 }, armF: { r: 40 }, armB: { r: -40 } }, 600, "inOut");
  }

  // Victory: a spin and a hop, happy eyes, soul sparkles.
  async win() {
    const P = this.pup, S = this.stage, c = this.center();
    this.eyes("happy");
    await P.to({ root: { sy: 0.85, sx: 1.12 } }, 120, "out");
    await P.to({ root: { y: -70, sy: 1.1, sx: 0.92, r: 360 }, armF: { r: -70 }, armB: { r: 70 } }, 420, "out");
    S.souls(c.x, c.y - 60, 14, { color: this.k.soul });
    await P.to({ root: { y: 0, sy: 1, sx: 1 } }, 220, "in");
    P.set({ root: { r: 0 } });
    await P.to({ root: { sy: 0.86, sx: 1.12 } }, 70, "out");
    await P.to({ root: { sy: 1, sx: 1 }, armF: { r: -40 }, armB: { r: 40 } }, 260, "back");
  }

  reset() { this.mood = "idle"; this.pup.reset(); this.eyes("open"); this.crack.style.display = "none"; this.g.removeAttribute("filter"); }
}

// ---------------------------------------------------------------------------
// Bosses share their special moves; each has its own body and attacks.

class Boss {
  constructor(stage, x) {
    this.stage = stage; this.clock = stage.clock; this.home = x;
    this.g = svgEl("g", { transform: `translate(${x} ${GROUND})` }, stage.layers.chars);
    this.shadow = svgEl("ellipse", { cx: 0, cy: 2, rx: 130, ry: 12, fill: "#000", opacity: ".5" }, this.g);
    this.ghostWrap = svgEl("g", {}, this.g);
    this.art = svgEl("g", { filter: "url(#hkInk)" }, this.g);
    this.dome = null; this.charging = null; this.dead = false;
  }
  // Colour ghosts for glitch bursts: copies of the art tinted cyan and pink, nudged apart.
  makeGhosts() {
    const id = "art" + Math.floor(Math.random() * 1e6);
    this.art.querySelector(".p-root").id = id;
    this.ghosts = ["hkCyan", "hkPink"].map((f) => svgEl("use", { href: `#${id}`, filter: `url(#${f})`, opacity: 0, style: "mix-blend-mode:screen" }, this.ghostWrap));
    this.glitchUntil = 0; this.glitchPower = 1;
  }
  glitch(ms, power = 1) { this.glitchPower = power || 1; this.glitchUntil = Math.max(this.glitchUntil || 0, this.clock.now + ms); }
  glitchFrame() {
    const on = this.clock.now < this.glitchUntil;
    this.ghosts.forEach((g, i) => {
      g.setAttribute("opacity", on ? 0.7 : 0);
      if (on) g.setAttribute("transform", `translate(${((i ? 1 : -1) * rand(2, 8) * this.glitchPower).toFixed(1)} ${rand(-3, 3).toFixed(1)})`);
    });
    if (!this.dead && Math.random() < 0.004) this.glitch(rand(80, 160));
  }
  flash(ms) { this.art.setAttribute("filter", "url(#hkWhite)"); this.clock.wait(ms).then(() => this.art.setAttribute("filter", "url(#hkInk)")); }

  // Struck by the teammate. A Firewall dome blocks normal hits; a crit shatters it.
  hit({ crit = false, blocked = false } = {}) {
    if (this.dead) return;
    const S = this.stage, c = this.center();
    if (blocked && this.dome) { S.hitstop(60); S.shake(5); this.dome.block(); return; }
    if (crit && this.dome) { this.dome.shatter(); this.dome = null; }
    S.hitstop(crit ? 150 : 80); S.shake(crit ? 14 : 7);
    this.flash(crit ? 110 : 70);
    S.blobs(c.x, c.y, crit ? 22 : 10, { power: crit ? 1.3 : 1 });
    S.sparks(c.x - 40, c.y, crit ? 16 : 8, { colors: ["#fff", "#ffe0b0"], dir: -1 });
    if (crit) { S.ring(c.x, c.y, { size: 150 }); S.flash(0.15); this.glitch(260, 2); }
    this.recoil(crit);
  }

  // Telegraph a special: glowing eyes, trembling, steam.
  charge(move) { this.charging = move; this.setEyes("charge"); }

  special(move, { target, onArrive } = {}) {
    const S = this.stage;
    this.charging = null; this.setEyes("idle");
    if (move === "firewall") { this.dome = new Dome(S, this.home, { rx: 250, ry: 330 }); this.glitch(200); }
    if (move === "typos") { const v = this.vent(); S.swarm(v, target, { onArrive }); this.glitch(200); }
    if (move === "glitch") { this.glitch(900, 2.6); const c = this.center(); S.glyphs(c.x - 30, c.y, 22); }
  }
}

// ---- Option A: the corrupted bug knight -----------------------------------
// A hulking armoured beetle: a dark shell cracked with orange infection and
// cyan glitch shards, a pale bone mask with forward horns and hollow eyes, and
// one huge pincer claw. Faces left, toward the teammate.

export class BugKnight extends Boss {
  constructor(stage, { x = 900 } = {}) {
    super(stage, x);
    this.name = "Bug knight";
    const shell = "#1c2430", dark = "#121821", bone = "#e4e7e9", boneShade = "#b9c1c8", glow = "#ff8f3a", cyan = "#62dcff";
    this.art.innerHTML = `
    <g class="p-root">
      <g class="p-legsB" fill="${dark}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">
        <path d="M66 -68 C98 -62 118 -44 120 -24 L128 0 L112 0 L106 -22 C102 -38 86 -52 56 -60 Z"/><path d="M8 -62 C30 -46 42 -28 42 -12 L48 0 L33 0 L30 -12 C28 -26 16 -40 -2 -56 Z"/>
      </g>
      <g class="p-body">
        <path d="M-122 -112 C-132 -192 -62 -252 18 -248 C100 -244 152 -192 142 -120 C138 -80 102 -60 40 -58 L-62 -58 C-102 -60 -120 -80 -122 -112 Z" fill="${shell}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M-104 -176 C-82 -224 -22 -242 34 -240" fill="none" stroke="#45566a" stroke-width="5" stroke-linecap="round" opacity=".8"/>
        <path d="M-40 -246 C-52 -182 -42 -112 -22 -60 M58 -240 C70 -172 66 -112 50 -62" fill="none" stroke="${INK}" stroke-width="3" opacity=".8"/>
        <path d="M-112 -98 C-92 -62 62 -52 124 -98 C112 -68 72 -52 22 -52 L-62 -52 C-98 -56 -114 -72 -112 -98 Z" fill="${dark}" stroke="${INK}" stroke-width="3"/>
        <g filter="url(#hkGlow)">
          <path d="M70 -206 L84 -190 L76 -174 L92 -160 M96 -120 L110 -134 L122 -126" fill="none" stroke="${glow}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="102" cy="-152" r="10" fill="${glow}"/><circle cx="116" cy="-170" r="6" fill="${glow}"/><circle cx="86" cy="-134" r="6.5" fill="${glow}"/>
          <path d="M-14 -246 L-8 -270 L0 -248 Z M6 -244 L18 -262 L18 -240 Z M126 -176 L148 -184 L134 -164 Z" fill="${cyan}" stroke="#1d6f93" stroke-width="1.5"/>
        </g>
        <circle class="vent" cx="40" cy="-232" r="1" fill="none"/>
      </g>
      <g class="p-legsF" fill="${dark}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">
        <path d="M-44 -64 C-74 -54 -92 -38 -92 -18 L-98 0 L-82 0 L-78 -18 C-76 -32 -60 -44 -28 -58 Z"/><path d="M38 -62 C60 -50 74 -32 76 -14 L84 0 L68 0 L62 -14 C58 -28 46 -42 24 -56 Z"/>
      </g>
      <g class="p-head">
        <path d="M-140 -150 C-162 -178 -194 -190 -218 -182 C-196 -178 -172 -166 -158 -142 Z" fill="${bone}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M-116 -154 C-122 -190 -146 -210 -172 -216 C-150 -202 -136 -184 -132 -150 Z" fill="${bone}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M-150 -82 C-162 -66 -152 -54 -140 -56 C-146 -64 -146 -72 -140 -80 Z M-122 -78 C-130 -62 -120 -52 -110 -56 C-116 -62 -116 -70 -112 -78 Z" fill="${dark}" stroke="${INK}" stroke-width="2.5"/>
        <path d="M-98 -152 C-128 -160 -168 -150 -178 -120 C-184 -96 -166 -76 -140 -74 C-116 -72 -96 -86 -92 -106 Z" fill="${bone}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M-176 -104 C-170 -84 -146 -78 -126 -80 C-148 -88 -166 -94 -176 -104 Z" fill="${boneShade}"/>
        <g class="b-eyes">
          <path d="M-162 -124 C-171 -122 -173 -106 -164 -101 C-155 -98 -151 -111 -153 -120 Z M-136 -122 C-145 -120 -147 -104 -138 -99 C-129 -96 -125 -109 -127 -118 Z" fill="${INK}"/>
          <g class="pupils" filter="url(#hkGlow)"><circle cx="-162" cy="-110" r="2.6" fill="${glow}"/><circle cx="-137" cy="-108" r="2.6" fill="${glow}"/></g>
        </g>
      </g>
      <g class="p-arm">
        <path d="M-64 -118 C-84 -114 -106 -92 -118 -68 L-100 -56 C-90 -78 -76 -96 -56 -102 Z" fill="${shell}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <g class="p-claw">
          <path d="M-124 -72 C-166 -66 -194 -38 -196 -6 C-180 -16 -164 -24 -150 -22 C-160 -10 -164 4 -160 14 C-140 2 -110 -22 -100 -52 Z" fill="#202936" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
          <path d="M-128 -62 C-152 -56 -170 -40 -178 -22" fill="none" stroke="#45566a" stroke-width="3" stroke-linecap="round"/>
          <path d="M-150 -46 L-140 -38 L-146 -28" fill="none" stroke="${glow}" stroke-width="2.6" stroke-linecap="round" filter="url(#hkGlow)"/>
          <path d="M-186 -28 L-178 -38 L-176 -24 Z" fill="${cyan}" stroke="#1d6f93" stroke-width="1.4"/>
        </g>
      </g>
    </g>`;
    this.eyeGlow = this.art.querySelector(".pupils");
    this.pup = new Puppet(this.clock, partsFrom(this.art.querySelector(".p-root"), {
      root: [0, 0], body: [0, -60], head: [-100, -110], arm: [-64, -110], claw: [-112, -62], legsF: [0, -60], legsB: [0, -60],
    }));
    this.makeGhosts();
    this.shadow.setAttribute("rx", 150);
    stage.add(this);
  }
  center() { return { x: this.home + this.pup.get("root", "x") - 30, y: GROUND - 150 + this.pup.get("root", "y") }; }
  vent() { return { x: this.home + 40 + this.pup.get("root", "x"), y: GROUND - 240 }; }
  setEyes(state) {
    const col = state === "charge" ? "#ff3b2a" : state === "dead" ? "#33383f" : "#ff8f3a";
    this.eyeGlow.querySelectorAll("circle").forEach((c) => { c.setAttribute("fill", col); c.setAttribute("r", state === "charge" ? 4 : 2.6); });
  }
  frame(t) {
    const live = this.dead ? 0 : 1, ch = this.charging ? 1 : 0;
    const breathe = Math.sin(t * 1.6) * live;
    const tremble = ch ? rand(-1.5, 1.5) : 0;
    this.pup.render({
      body: { sy: 1 + breathe * 0.02, y: breathe * 2 + tremble },
      head: { r: Math.sin(t * 1.6 + 0.6) * 2 * live, y: breathe * 2.5 + tremble },
      arm: { r: Math.sin(t * 1.6 + 1) * 2 * live, y: breathe * 2 },
      legsF: { sy: 1 - breathe * 0.01 },
    });
    const lift = -this.pup.get("root", "y");
    this.shadow.setAttribute("transform", `translate(${(this.pup.get("root", "x") - 20).toFixed(1)} 0) scale(${Math.max(0.3, 1 - lift / 400).toFixed(3)} 1)`);
    if (ch && Math.random() < 0.15) this.stage.dust(this.home + rand(-80, 80), 1, 0.5);
    this.glitchFrame();
  }
  async recoil(crit) {
    const P = this.pup;
    await P.to({ root: { x: crit ? 34 : 16, r: crit ? 5 : 2 }, head: { r: crit ? 14 : 6 } }, 90, "out");
    await P.to({ root: { x: 0, r: 0 }, head: { r: 0 } }, 320, "inOut");
  }

  // Two attacks. "slam": leap up and crash down near the teammate, with a shockwave.
  // "sweep": rear the claw back, lunge, and send an orange crescent along the floor.
  async attack(kind, { target, onHit }) {
    const P = this.pup, S = this.stage;
    if (kind === "slam") {
      this.setEyes("charge");
      await P.to({ root: { sy: 0.82, sx: 1.1, y: 10 }, head: { y: 14, r: -6 }, arm: { r: -20 } }, 260, "out");
      await this.clock.wait(220);
      S.dust(this.home, 10, 1.4);
      const land = target.x + 270 - this.home;
      await P.to({ root: { y: -330, x: land * 0.6, sy: 1.15, sx: 0.9, r: -8 }, arm: { r: 30 } }, 320, "out");
      await this.clock.wait(90);
      await P.to({ root: { y: 0, x: land, sy: 1.1, sx: 0.92, r: 6 } }, 170, "in");
      S.hitstop(70); S.shake(22); S.dust(this.home + land, 14, 2);
      S.ring(this.home + land - 40, GROUND, { color: "#ffe2b0", size: 260, flat: 0.12, ms: 520, width: 8 });
      S.groundWave(this.home + land - 120, target.x, { ms: 220, onArrive: onHit });
      S.groundWave(this.home + land + 60, this.home + land + 400, { ms: 300 });
      await P.to({ root: { sy: 0.8, sx: 1.16, r: 0 }, arm: { r: -10 } }, 90, "out");
      await P.to({ root: { sy: 1, sx: 1 } }, 220, "back");
      await this.clock.wait(260);
      await P.to({ root: { y: -120, x: land * 0.5 } }, 260, "out");
      await P.to({ root: { y: 0, x: 0 } }, 260, "in");
      S.dust(this.home, 6, 1); S.shake(8);
      await P.to({ root: { sy: 0.9, sx: 1.06 } }, 80, "out");
      await P.to({ root: { sy: 1, sx: 1 }, arm: { r: 0 }, head: { r: 0, y: 0 } }, 220, "back");
      this.setEyes("idle");
      return;
    }
    this.setEyes("charge");
    await P.to({ root: { x: 30, r: 6 }, arm: { r: 70 }, claw: { r: 30 }, head: { r: 10 } }, 300, "out");
    await this.clock.wait(260);
    P.to({ root: { x: -170, r: -8 }, head: { r: -10 } }, 140, "snap");
    await P.to({ arm: { r: -70 }, claw: { r: -40 } }, 120, "snap");
    S.slash(this.home - 380, GROUND - 90, { color: "#ffb35c", size: 120, angle: 200, flip: -1, ms: 260 });
    S.shake(10);
    S.groundWave(this.home - 340, target.x, { color: "#ffb35c", ms: 260, onArrive: onHit });
    await this.clock.wait(260);
    await P.to({ root: { x: 0, r: 0 }, arm: { r: 0 }, claw: { r: 0 }, head: { r: 0 } }, 420, "inOut");
    this.setEyes("idle");
  }

  // Defeated: staggers, bursts of orange, sinks to its knees, then dissolves into ink.
  async defeat() {
    this.dead = true; this.charging = null;
    if (this.dome) { this.dome.shatter(); this.dome = null; }
    const P = this.pup, S = this.stage, c = this.center();
    S.hitstop(260); S.flash(0.5); S.shake(20); this.flash(160);
    for (let i = 0; i < 6; i++) this.clock.wait(i * 160).then(() => { S.blobs(c.x + rand(-90, 90), c.y + rand(-80, 60), 10, { power: 1.4 }); S.shake(10); });
    await P.to({ root: { x: 40, r: 8 }, head: { r: 20 } }, 220, "out");
    await P.to({ root: { y: 30, r: -6 }, legsF: { sy: 0.5 }, legsB: { sy: 0.6 }, head: { r: 40, y: 40 }, arm: { r: 40 } }, 700, "inOut");
    this.setEyes("dead");
    await this.clock.wait(400);
    S.ring(c.x, c.y, { color: "#fff", size: 300, ms: 600 });
    S.blobs(c.x, c.y, 30, { power: 1.8 });
    S.souls(c.x, c.y, 18, { color: "#e8f6ff", spread: 80 });
    await P.to({ root: { o: 0, sy: 0.3, sx: 1.3, y: 60 } }, 900, "in");
  }

  // Won: a roar. Rears up, horns high, a shock ring, the screen shakes.
  async win() {
    const P = this.pup, S = this.stage, c = this.center();
    await P.to({ root: { sy: 0.9 }, head: { r: -10, y: 10 } }, 200, "out");
    this.setEyes("charge");
    await P.to({ root: { sy: 1.08, y: -10 }, head: { r: -32, y: -16 }, arm: { r: 60 }, claw: { r: 30 } }, 160, "snap");
    for (let i = 0; i < 3; i++) this.clock.wait(i * 220).then(() => { S.ring(c.x - 90, c.y - 30, { color: "#ffe2b0", size: 220, ms: 520, width: 5 }); S.shake(12); });
    await this.clock.wait(900);
    await P.to({ root: { sy: 1, y: 0 }, head: { r: 0, y: 0 }, arm: { r: 0 }, claw: { r: 0 } }, 400, "inOut");
    this.setEyes("idle");
  }

  reset() { this.dead = false; this.charging = null; this.pup.reset(); this.setEyes("idle"); if (this.dome) { this.dome.g.remove(); this.dome = null; } }
}

// ---- Option B: GOLEM, redrawn ---------------------------------------------
// The floating corrupted machine, in the same inky, hand-drawn style: pale bone
// armour over a dark body, an orange core eye, torn cables dangling below, a
// claw arm and a cannon arm that really aims.

export class Golem extends Boss {
  constructor(stage, { x = 900 } = {}) {
    super(stage, x);
    this.name = "GOLEM";
    const body = "#151b24", bone = "#c9d0d6", shade = "#98a3ad", glow = "#ff8f3a", cyan = "#62dcff";
    const wires = Array.from({ length: 6 }, (_, i) => `<path class="wire" fill="none" stroke="${i === 2 ? "#3a1c10" : INK}" stroke-width="${5 - (i % 2)}" stroke-linecap="round"/>`).join("");
    const arm = (side, end) => `
      <g class="p-${side === -1 ? "armL" : "armR"}">
        <circle cx="0" cy="0" r="20" fill="${bone}" stroke="${INK}" stroke-width="3.5"/>
        <path d="M-12 8 L12 8 L10 70 L-10 70 Z" fill="${body}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M-12 26 L12 26 M-11 46 L11 46" stroke="#33404f" stroke-width="3"/>
        <circle cx="0" cy="74" r="12" fill="${bone}" stroke="${INK}" stroke-width="3"/>
        <g class="p-${side === -1 ? "foreL" : "foreR"}">${end}</g>
      </g>`;
    const claw = `<path d="M-26 82 C-34 104 -30 132 -16 146 C-14 128 -8 116 0 112 C8 116 14 128 16 146 C30 132 34 104 26 82 Z" fill="${bone}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-20 92 C-22 106 -20 118 -14 128" fill="none" stroke="${shade}" stroke-width="3"/>
      <path d="M8 96 L16 104 L10 112" fill="none" stroke="${glow}" stroke-width="2.4" filter="url(#hkGlow)"/>`;
    const cannon = `<path d="M-22 84 L22 84 L26 150 L-26 150 Z" fill="${bone}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-18 100 L18 100" stroke="${shade}" stroke-width="3"/>
      <ellipse cx="0" cy="152" rx="24" ry="9" fill="${INK}"/>
      <ellipse class="muzzle" cx="0" cy="152" rx="15" ry="5" fill="${glow}" opacity="0" filter="url(#hkGlow)"/>`;
    this.art.innerHTML = `
    <g class="p-root"><g class="p-hover">
      <g class="wires">${wires}</g>
      <g class="p-body">
        <path d="M-118 -262 L-70 -292 L70 -292 L118 -262 L124 -222 L88 -168 L36 -146 L-36 -146 L-88 -168 L-124 -222 Z" fill="${body}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M-36 -146 L36 -146 L28 -126 L-28 -126 Z" fill="${body}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M-118 -262 L-70 -292 L70 -292 L118 -262 L80 -246 L0 -240 L-80 -246 Z" fill="${bone}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M-96 -258 L-62 -282 L62 -282 L96 -258" fill="none" stroke="#eef2f5" stroke-width="2.5" opacity=".45"/>
        <path d="M-118 -262 L-80 -246 L0 -240 L80 -246 L118 -262 L84 -252 L0 -246 L-84 -252 Z" fill="${shade}"/>
        <path d="M-80 -246 L-88 -168 M80 -246 L88 -168 M-124 -222 L-88 -168 M124 -222 L88 -168" stroke="#2c3644" stroke-width="3"/>
        <g fill="${body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
          <path d="M-96 -276 L-118 -320 L-80 -286 Z"/><path d="M-40 -290 L-46 -336 L-22 -292 Z"/><path d="M40 -290 L46 -336 L22 -292 Z"/><path d="M96 -276 L118 -320 L80 -286 Z"/>
        </g>
        <circle cx="0" cy="-206" r="40" fill="${bone}" stroke="${INK}" stroke-width="4"/>
        <circle cx="0" cy="-206" r="32" fill="${INK}"/>
        <circle class="core-halo" cx="0" cy="-206" r="40" fill="${glow}" opacity=".35" filter="url(#hkSoftGlow)"/>
        <circle class="core" cx="0" cy="-206" r="26" fill="${glow}"/>
        <circle cx="0" cy="-206" r="15" fill="#ffd9a3" opacity=".6"/>
        <ellipse class="pupil" cx="-6" cy="-206" rx="4.5" ry="16" fill="#3a0f02"/>
        <g filter="url(#hkGlow)"><path d="M-104 -232 L-112 -250 L-96 -236 Z M70 -176 L86 -186 L76 -168 Z M-20 -150 L-14 -136 L-8 -150 Z" fill="${cyan}" stroke="#1d6f93" stroke-width="1.4"/></g>
      </g>
      <g transform="translate(-118 -246) rotate(14)">${arm(-1, claw)}</g>
      <g transform="translate(118 -246) rotate(-14)">${arm(1, cannon)}</g>
    </g></g>`;
    this.wireEls = [...this.art.querySelectorAll(".wire")];
    this.muzzle = this.art.querySelector(".muzzle");
    this.core = this.art.querySelector(".core"); this.halo = this.art.querySelector(".core-halo"); this.pupil = this.art.querySelector(".pupil");
    this.pup = new Puppet(this.clock, partsFrom(this.art.querySelector(".p-root"), {
      root: [0, 0], hover: [0, -150], body: [0, -200], armL: [0, 0], foreL: [0, 74], armR: [0, 0], foreR: [0, 74],
    }));
    this.makeGhosts();
    this.shadow.setAttribute("rx", 110);
    stage.add(this);
  }
  center() { return { x: this.home + this.pup.get("root", "x"), y: GROUND - 210 + this.pup.get("root", "y") }; }
  vent() { return { x: this.home + this.pup.get("root", "x"), y: GROUND - 300 }; }
  setEyes(state) {
    const col = state === "charge" ? "#ff3b2a" : state === "dead" ? "#3a3f46" : "#ff8f3a";
    this.core.setAttribute("fill", col); this.halo.setAttribute("fill", col);
    this.halo.setAttribute("opacity", state === "dead" ? 0 : state === "charge" ? 0.6 : 0.35);
  }
  frame(t) {
    const live = this.dead ? 0 : 1, ch = this.charging ? 1 : 0;
    const bob = Math.sin(t * 1.4) * 8 * live, tremble = ch ? rand(-2, 2) : 0;
    this.pup.render({
      hover: { y: bob + tremble, x: tremble * 0.5 },
      armL: { r: Math.sin(t * 1.4 - 0.8) * 3 * live }, armR: { r: -Math.sin(t * 1.4 - 0.6) * 3 * live },
    });
    // Cables swing and trail behind his movement.
    const vx = this.pup.get("root", "x"), sl = this.slump || 0;
    this.wireEls.forEach((w, i) => {
      const x0 = -40 + i * 16, y0 = -136 + bob, len = (60 + ((i * 37) % 40)) * (1 - sl * 0.6);
      const sway = Math.sin(t * 1.5 + i * 1.3) * 8 * live - (this.lastX !== undefined ? (vx - this.lastX) * 2 : 0);
      w.setAttribute("d", `M${x0} ${y0} C${x0 + sway * 0.2} ${y0 + len * 0.4} ${x0 + sway * 0.6} ${y0 + len * 0.75} ${x0 + sway} ${y0 + len}`);
    });
    this.lastX = vx;
    this.pupil.setAttribute("ry", this.charging ? 7 : 16);
    const lift = -this.pup.get("root", "y");
    this.shadow.setAttribute("transform", `translate(${vx.toFixed(1)} 0) scale(${Math.max(0.3, 0.85 - bob / 100 - lift / 400).toFixed(3)} 1)`);
    this.glitchFrame();
  }
  async recoil(crit) {
    const P = this.pup;
    await P.to({ root: { x: crit ? 40 : 18, r: crit ? 6 : 3 }, armL: { r: crit ? -30 : -14 }, armR: { r: crit ? 30 : 14 } }, 90, "out");
    await P.to({ root: { x: 0, r: 0 }, armL: { r: 0 }, armR: { r: 0 } }, 340, "inOut");
  }
  // The angle that points the cannon arm at a stage point (the arm hangs down at 0,
  // inside a group already turned -14 degrees).
  aimAt(target) {
    const sx = this.home + 118 + this.pup.get("root", "x"), sy = GROUND - 246 - 150 + 150;
    const deg = Math.atan2(-(target.x - sx), target.y - sy) * 180 / Math.PI;
    return deg + 14;
  }
  muzzlePoint() {
    const r = this.muzzle.getBoundingClientRect(), s = this.stage.svg.getBoundingClientRect(), k = 1200 / s.width;
    return { x: (r.left + r.width / 2 - s.left) * k, y: (r.top + r.height / 2 - s.top) * k };
  }

  async attack(kind, { target, onHit }) {
    const P = this.pup, S = this.stage;
    if (kind === "cannon") {
      this.setEyes("charge");
      await P.to({ root: { x: 18, r: -4 }, armR: { r: this.aimAt(target) }, foreR: { r: 0 } }, 380, "out");
      this.muzzle.setAttribute("opacity", "1");
      for (let i = 0; i < 6; i++) { S.souls(this.muzzlePoint().x, this.muzzlePoint().y, 1, { color: "#ffb35c", to: this.muzzlePoint(), spread: 40 }); await this.clock.wait(50); }
      const m = this.muzzlePoint();
      S.shot(m.x, m.y, target, { onArrive: onHit });
      S.ring(m.x, m.y, { color: "#ffd9a3", size: 50, ms: 260 });
      S.shake(9);
      this.muzzle.setAttribute("opacity", "0");
      await P.to({ root: { x: 46, r: 6 }, armR: { r: this.aimAt(target) + 40 } }, 90, "out");
      await this.clock.wait(160);
      await P.to({ root: { x: 0, r: 0 }, armR: { r: 0 } }, 420, "inOut");
      this.setEyes("idle");
      return;
    }
    // Claw slam: rise and rear back, then dive in and smash; a shockwave rolls out.
    this.setEyes("charge");
    await P.to({ root: { x: 40, y: -60, r: 10 }, armL: { r: 150 }, foreL: { r: 40 } }, 340, "out");
    await this.clock.wait(200);
    P.to({ root: { x: -200, y: 30, r: -14 } }, 140, "snap");
    await P.to({ armL: { r: 20 }, foreL: { r: -20 } }, 130, "snap");
    S.hitstop(60); S.shake(20); S.dust(this.home - 300, 16, 2);
    S.ring(this.home - 300, GROUND, { color: "#ffe2b0", size: 240, flat: 0.12, ms: 500, width: 8 });
    S.groundWave(this.home - 340, target.x, { ms: 200, onArrive: onHit });
    await this.clock.wait(260);
    await P.to({ root: { x: 0, y: 0, r: 0 }, armL: { r: 0 }, foreL: { r: 0 } }, 520, "inOut");
    this.setEyes("idle");
  }

  async defeat() {
    this.dead = true; this.charging = null;
    if (this.dome) { this.dome.shatter(); this.dome = null; }
    const P = this.pup, S = this.stage, c = this.center();
    S.hitstop(260); S.flash(0.5); S.shake(20); this.flash(160); this.glitch(2000, 2);
    for (let i = 0; i < 7; i++) this.clock.wait(i * 150).then(() => { S.blobs(c.x + rand(-100, 100), c.y + rand(-80, 80), 8, { power: 1.3 }); S.sparks(c.x + rand(-80, 80), c.y + rand(-60, 60), 8); S.shake(9); });
    await this.clock.wait(500);
    this.setEyes("dead");
    this.slump = 1;
    await P.to({ root: { y: 120, r: -10 }, armL: { r: 20 }, armR: { r: -20 } }, 600, "in");
    S.shake(22); S.dust(this.home, 18, 2.2);
    await this.clock.wait(300);
    S.ring(c.x, c.y + 100, { color: "#fff", size: 300, ms: 600 });
    S.souls(c.x, c.y + 100, 18, { spread: 80 });
    await P.to({ root: { o: 0 } }, 800, "in");
  }

  async win() {
    const P = this.pup, S = this.stage, c = this.center();
    this.setEyes("charge");
    await P.to({ root: { y: -40 }, armL: { r: 140 }, armR: { r: -140 } }, 360, "out");
    for (let i = 0; i < 3; i++) this.clock.wait(i * 230).then(() => { S.ring(c.x, c.y - 40, { color: "#ffe2b0", size: 220, ms: 520, width: 5 }); S.shake(12); });
    await this.clock.wait(900);
    await P.to({ root: { y: 0 }, armL: { r: 0 }, armR: { r: 0 } }, 420, "inOut");
    this.setEyes("idle");
  }

  reset() { this.dead = false; this.charging = null; this.slump = 0; this.pup.reset(); this.setEyes("idle"); if (this.dome) { this.dome.g.remove(); this.dome = null; } }
}
