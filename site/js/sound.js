// Battle sound: effects and chiptune music, all generated in the browser with
// Web Audio (no sound files, nothing licensed). PRD Addendum G.
//
// How it fits together:
//   sound effects -> sfx bus -> master -> compressor -> limiter -> speakers
//   music         -> music bus -> master
//   heavy hits also go to a short "room" echo (a convolver) for weight.
// Settings (on/off and volume for each) are saved per device.

const KEY = "operandi:sound";
const DEFAULTS = { music: true, musicVol: 0.6, sfx: true, sfxVol: 0.8 };
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; } };

class Sound {
  constructor() {
    this.settings = load();
    this.ctx = null;
    this.last = {};          // per-effect time of last play, to avoid stacking duplicates
    this.song = null;        // what the music should be playing: "battle" | "victory" | "defeat" | null
    this.intensity = 0;      // 0..1: the battle theme gets heavier as the boss weakens
    // Browsers only allow sound after the person interacts with the page.
    const unlock = () => this.unlock();
    addEventListener("pointerdown", unlock, { passive: true });
    addEventListener("keydown", unlock);
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      // A compressor glues the mix; a hard limiter after it stops loud hits from clipping.
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -18; this.comp.ratio.value = 4; this.comp.attack.value = 0.005;
      const limit = c.createDynamicsCompressor();
      limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.1;
      this.comp.connect(limit); limit.connect(c.destination);
      this.out = limit;
      this.master = c.createGain(); this.master.gain.value = 0.6; this.master.connect(this.comp);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.room = c.createConvolver(); this.room.buffer = this.impulse(1.1);
      this.roomSend = c.createGain(); this.roomSend.gain.value = 0.35;
      this.roomSend.connect(this.room); this.room.connect(this.sfxBus);
      this.noiseBuf = this.makeNoise();
      this.applySettings();
      if (this.song) this.startSong(this.song);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  // ---- Settings ----
  set(patch) {
    Object.assign(this.settings, patch);
    try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch {}
    this.applySettings();
  }
  applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.settings;
    this.sfxBus.gain.setTargetAtTime(s.sfx ? s.sfxVol : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music ? s.musicVol * 0.55 : 0, t, 0.08);
  }

  // ---- Building blocks ----
  makeNoise() {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  impulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.5; }
    return b;
  }
  // An envelope: quick attack to `peak`, exponential fall over `dur`.
  env(gain, t, peak, dur, attack = 0.004) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  }
  tone(type, f0, f1, t, dur, peak, { to = this.sfxBus, room = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    this.env(g, t, peak, dur);
    o.connect(g); g.connect(to); if (room) { const r = c.createGain(); r.gain.value = room; g.connect(r); r.connect(this.roomSend); }
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noise(t, dur, peak, { type = "bandpass", f0 = 1000, f1 = f0, q = 1, to = this.sfxBus, room = 0 } = {}) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    this.env(g, t, peak, dur);
    s.connect(f); f.connect(g); g.connect(to); if (room) { const r = c.createGain(); r.gain.value = room; g.connect(r); r.connect(this.roomSend); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  // ---- Effects ----
  // name: which sound. o: { size: 0.5..2, theme: "water"|"fire", ms: length }
  sfx(name, o = {}) {
    if (!this.ctx || !this.settings.sfx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const gap = { buzz: 0.12, glitch: 0.05, debris: 0.08, zap: 0.06, splash: 0.05, ring: 0.06, hit: 0.03 }[name] ?? 0.02;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const t = now + 0.005, k = o.size ?? 1, fire = o.theme === "fire";
    const S = SFX[name];
    if (S) S.call(this, t, k, { ...o, fire });
  }

  // ---- Music ----
  music(song) {
    if (song === this.song) return;
    this.song = song;
    if (this.ctx) this.startSong(song);
  }
  setIntensity(v) { this.intensity = v; }

  startSong(song) {
    clearInterval(this.timer);
    this.timer = null;
    if (!song) return;
    if (song === "victory" || song === "defeat") return this.jingle(song);
    // A look-ahead scheduler: every 25 ms, queue the notes due in the next 120 ms.
    this.step = 0;
    this.nextAt = this.ctx.currentTime + 0.12;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    const c = this.ctx;
    if (!c || c.state !== "running") return;
    const sixteenth = 60 / SONG.bpm / 4;
    if (this.nextAt < c.currentTime - 0.2) this.nextAt = c.currentTime + 0.05;   // after a pause, don't play a backlog
    while (this.nextAt < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextAt);
      this.step = (this.step + 1) % (SONG.bars.length * 16);
      this.nextAt += sixteenth;
    }
  }

  // One 16th-note step of the battle theme: drums, bass, lead and (when
  // the boss is low) an arpeggio layer and busier drums.
  playStep(step, t) {
    const bar = Math.floor(step / 16), s = step % 16, B = SONG.bars[bar], hot = this.intensity > 0.66;
    const out = this.musicBus, len = 60 / SONG.bpm / 4;
    // drums
    const kick = s === 0 || s === 8 || s === 10 || (hot && (s === 14 || s === 3));
    if (kick) this.tone("sine", 150, 40, t, 0.16, 0.9, { to: out });
    if (s === 4 || s === 12) this.noise(t, 0.12, 0.45, { type: "highpass", f0: 1400, to: out });
    if (hot ? true : s % 2 === 0) this.noise(t, 0.03, s % 4 === 2 ? 0.16 : 0.09, { type: "highpass", f0: 7000, to: out });
    // bass: driving eighths, octave jump on the off-beats
    if (s % 2 === 0) { const n = B.root + (s % 4 === 2 ? 12 : 0); this.pulse("triangle", n, t, len * 1.8, 0.5, out); }
    // lead: eighth notes from the melody, "-" holds the previous note
    if (s % 2 === 0) {
      const n = B.lead[s / 2];
      if (typeof n === "number") {
        let hold = 1; while (s / 2 + hold < 8 && B.lead[s / 2 + hold] === "-") hold++;
        this.pulse("square", n + (hot ? 12 : 0), t, len * 2 * hold * 0.92, hot ? 0.13 : 0.16, out);
      }
    }
    // arpeggio layer
    if (hot || bar % 8 >= 4) {
      const ch = CHORDS[B.chord];
      this.pulse("square", ch[s % ch.length] + 12, t, len * 0.8, hot ? 0.07 : 0.045, out);
    }
  }
  pulse(type, midi, t, dur, peak, out) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.setValueAtTime(peak, t + Math.max(0.01, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  jingle(kind) {
    const t = this.ctx.currentTime + 0.05, out = this.musicBus;
    const notes = kind === "victory" ? [62, 66, 69, 74, 78, 81] : [69, 65, 62, 57];
    const step = kind === "victory" ? 0.09 : 0.28;
    notes.forEach((n, i) => this.pulse(kind === "victory" ? "square" : "triangle", n, t + i * step, step * 1.6, 0.16, out));
    const end = t + notes.length * step;
    if (kind === "victory") [74, 78, 81].forEach((n) => this.pulse("square", n, end, 1.2, 0.1, out));
    else this.pulse("triangle", 50, end, 1.4, 0.3, out);
  }
}

// ---- The battle theme: D minor, 150 BPM, 16 bars (about 26 seconds) ----
// Each bar: the bass root (MIDI), the chord for the arpeggio, and 8 lead
// eighth-notes (MIDI number, "-" to hold, null for a rest).
const CHORDS = { Dm: [62, 65, 69, 74], Bb: [58, 62, 65, 70], C: [60, 64, 67, 72], A: [57, 61, 64, 69], Gm: [55, 58, 62, 67] };
const bar = (root, chord, lead) => ({ root, chord, lead });
const SONG = {
  bpm: 150,
  bars: [
    bar(38, "Dm", [74, "-", 72, 74, "-", 77, 76, 74]),
    bar(38, "Dm", [72, "-", 69, "-", 72, 74, "-", "-"]),
    bar(34, "Bb", [70, "-", 74, 77, "-", 74, 72, 70]),
    bar(36, "C", [72, "-", 76, 79, "-", 76, 77, 79]),
    bar(38, "Dm", [81, "-", 79, 77, "-", 76, 77, "-"]),
    bar(38, "Dm", [74, "-", "-", 72, 74, 77, 76, 74]),
    bar(34, "Bb", [77, "-", 74, "-", 70, "-", 74, 77]),
    bar(33, "A", [76, "-", 73, "-", 69, "-", 76, "-"]),
    bar(43, "Gm", [79, "-", 79, 77, 79, "-", 82, "-"]),
    bar(43, "Gm", [81, 79, 77, "-", 74, "-", 77, "-"]),
    bar(38, "Dm", [74, "-", 77, 81, "-", 79, 77, 76]),
    bar(38, "Dm", [74, "-", "-", "-", 72, 74, 76, 77]),
    bar(34, "Bb", [77, "-", 79, 81, "-", 82, 81, 79]),
    bar(36, "C", [79, "-", 76, "-", 72, "-", 76, 79]),
    bar(33, "A", [81, "-", 79, "-", 76, "-", 73, "-"]),
    bar(33, "A", [76, 77, 76, 73, 69, null, null, null]),
  ],
};

// ---- The effects. `this` is the Sound; t = start time; k = size. ----
// Heavy hits stack a sub-bass drop, a noise crack, a pitched body and the room echo.
const SFX = {
  impact(t, k) {
    this.tone("sine", 110 * (1.2 - 0.2 * k), 32, t, 0.45 + 0.25 * k, 0.9 * Math.min(1.3, k), { room: 0.3 });
    this.noise(t, 0.18 + 0.1 * k, 0.6 * k, { type: "lowpass", f0: 2600, f1: 300, room: 0.4 });
    this.tone("square", 160, 55, t, 0.12, 0.18 * k);
    this.noise(t, 0.05, 0.4, { type: "bandpass", f0: 3200, q: 0.8 });
  },
  hit(t, k) {
    this.noise(t, 0.08, 0.5 * k, { type: "bandpass", f0: 2200, q: 0.7 });
    this.tone("sine", 180, 60, t, 0.2, 0.6 * k, { room: 0.15 });
  },
  explosion(t, k) {
    this.noise(t, 0.9 * k, 0.7, { type: "lowpass", f0: 3000, f1: 120, room: 0.5 });
    this.tone("sine", 90, 28, t, 0.8 * k, 0.9, { room: 0.3 });
    this.noise(t + 0.03, 0.4, 0.25, { type: "bandpass", f0: 900, f1: 200, q: 0.6 });
  },
  slash(t, k, o) {
    if (o.fire) { this.noise(t, 0.25, 0.4, { type: "bandpass", f0: 600, f1: 3500, q: 1.2 }); this.noise(t, 0.2, 0.2, { type: "highpass", f0: 3000 }); }
    else { this.noise(t, 0.2, 0.45, { type: "bandpass", f0: 900, f1: 6500, q: 2 }); this.tone("sine", 900, 2400, t, 0.12, 0.08); }
  },
  whoosh(t, k) { this.noise(t, 0.35 * k, 0.35, { type: "bandpass", f0: 250, f1: 2200, q: 1.5 }); },
  splash(t, k, o) {
    if (o.fire) { for (let i = 0; i < 6; i++) this.noise(t + Math.random() * 0.15, 0.04, 0.25 * k, { type: "highpass", f0: 2500 + Math.random() * 3000 }); return; }
    this.noise(t, 0.25 * k, 0.35 * k, { type: "bandpass", f0: 1400, f1: 500, q: 0.9, room: 0.2 });
    for (let i = 0; i < 4; i++) { const f = 500 + Math.random() * 900; this.tone("sine", f, f * 1.8, t + Math.random() * 0.12, 0.06, 0.08 * k); }
  },
  wave(t, k, o) {
    this.noise(t, 1.1, 0.5, { type: o.fire ? "bandpass" : "lowpass", f0: 400, f1: 2400, q: 0.5, room: 0.4 });
    this.noise(t + 0.6, 0.6, 0.5, { type: "lowpass", f0: 2000, f1: 300, room: 0.4 });
  },
  charge(t, k, o) {
    const d = (o.ms || 700) / 1000;
    this.tone("sawtooth", 90, 900, t, d, 0.12, { room: 0.2 });
    this.tone("square", 60, 450, t, d, 0.06);
  },
  laser(t, k, o) {
    const d = (o.ms || 700) / 1000;
    this.tone("sawtooth", 220, 180, t, d, 0.25, { room: 0.3 });
    this.tone("square", 110, 95, t, d, 0.18);
    this.noise(t, d, 0.3, { type: "bandpass", f0: 1800, f1: 900, q: 1 });
    this.tone("sine", 70, 40, t, d, 0.6);
  },
  shot(t, k) {
    this.tone("square", 320, 70, t, 0.14, 0.3 * k);
    this.noise(t, 0.12, 0.45 * k, { type: "lowpass", f0: 3000, f1: 400 });
    this.tone("sine", 120, 40, t, 0.2, 0.7 * k);
  },
  orb(t) { this.tone("sine", 500, 1400, t, 0.12, 0.12); this.noise(t, 0.1, 0.15, { type: "bandpass", f0: 1200, q: 2 }); },
  zap(t) { for (let i = 0; i < 3; i++) this.tone("square", 900 + Math.random() * 1600, 300, t + i * 0.025, 0.04, 0.06); },
  debris(t) { this.tone("square", 600 + Math.random() * 600, 200, t, 0.05, 0.05); this.noise(t, 0.04, 0.12, { type: "highpass", f0: 4000 }); },
  rumble(t, k) { this.noise(t, 0.7 * k, 0.5, { type: "lowpass", f0: 180, q: 0.7, room: 0.3 }); },
  stinger(t) {
    [38, 45, 50].forEach((n, i) => this.tone("sawtooth", 440 * 2 ** ((n - 69) / 12), 440 * 2 ** ((n - 69) / 12), t + i * 0.02, 1.4, 0.12, { room: 0.5 }));
    this.tone("sine", 60, 30, t, 1.2, 0.7, { room: 0.4 });
    this.noise(t, 0.5, 0.3, { type: "lowpass", f0: 4000, f1: 200, room: 0.5 });
  },
  swoosh(t) { this.noise(t, 0.6, 0.4, { type: "bandpass", f0: 4000, f1: 200, q: 1 }); this.tone("sine", 400, 60, t, 0.6, 0.2); },
  miss(t) { this.noise(t, 0.18, 0.18, { type: "bandpass", f0: 1500, f1: 600, q: 2 }); },
  shield(t) {
    this.tone("sine", 220, 220, t, 1.2, 0.18, { room: 0.4 }); this.tone("sine", 330, 335, t, 1.2, 0.12, { room: 0.4 });
    this.noise(t, 0.6, 0.15, { type: "bandpass", f0: 600, f1: 2400, q: 3 });
  },
  block(t) { this.tone("sine", 660, 520, t, 0.25, 0.22, { room: 0.3 }); this.noise(t, 0.08, 0.25, { type: "bandpass", f0: 2500, q: 2 }); },
  shatter(t) {
    this.noise(t, 0.6, 0.45, { type: "highpass", f0: 3000, room: 0.5 });
    for (let i = 0; i < 8; i++) { const f = 1800 + Math.random() * 3000; this.tone("sine", f, f * 0.9, t + Math.random() * 0.25, 0.25, 0.07); }
  },
  launch(t) { this.tone("square", 180, 900, t, 0.18, 0.12); this.noise(t, 0.2, 0.3, { type: "bandpass", f0: 600, f1: 3000, q: 1 }); this.tone("sine", 100, 45, t, 0.2, 0.4); },
  buzz(t) { for (let i = 0; i < 3; i++) { const f = 190 + Math.random() * 90; this.tone("sawtooth", f, f * 1.05, t + i * 0.02, 0.18, 0.035); } },
  glitch(t) {
    for (let i = 0; i < 4; i++) this.tone("square", 80 + Math.random() * 1600, 80 + Math.random() * 1600, t + i * 0.03, 0.03, 0.08);
    this.noise(t, 0.12, 0.2, { type: "bandpass", f0: 300 + Math.random() * 3000, q: 4 });
  },
  hurt(t) { this.tone("sine", 260, 90, t, 0.25, 0.3); this.noise(t, 0.12, 0.2, { type: "lowpass", f0: 900 }); },
};

export const sound = new Sound();

// Tie sounds to a battle's effects (battle-fx.js), so every visual beat has
// its sound at exactly the same moment, slow motion and hit-stop included.
export function wireBattleSounds(fx, theme) {
  const on = (name, f) => { const orig = fx[name].bind(fx); fx[name] = (...a) => { try { f(...a); } catch {} return orig(...a); }; };
  on("hitstop", (ms) => sound.sfx(ms >= 100 ? "impact" : "hit", { size: Math.min(2, ms / 100) }));
  on("explosion", (c, o = {}) => sound.sfx("explosion", { size: o.size ?? 1 }));
  on("slash", () => sound.sfx("slash", { theme }));
  on("dashTrail", () => sound.sfx("whoosh"));
  on("splash", (c, th, o = {}) => sound.sfx("splash", { theme: th, size: Math.min(1.5, (o.n || 20) / 24) }));
  on("splashCrown", (x, th) => sound.sfx("splash", { theme: th, size: 1.4 }));
  on("wave", (a, b, th) => sound.sfx("wave", { theme: th }));
  on("converge", (c, o = {}) => sound.sfx("charge", { ms: o.ms }));
  on("beam", (a, b, o = {}) => sound.sfx("laser", { ms: o.ms }));
  on("shot", () => sound.sfx("shot"));
  on("orb", () => sound.sfx("orb"));
  on("arcs", () => sound.sfx("zap"));
  on("debris", () => sound.sfx("debris"));
  on("crack", () => sound.sfx("rumble", { size: 1 }));
  on("groundWave", () => sound.sfx("rumble", { size: 0.7 }));
  on("title", () => sound.sfx("stinger"));
  on("bug", () => sound.sfx("buzz"));
}
