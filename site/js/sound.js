// Battle sound: effects and chiptune music, all generated in the browser with
// Web Audio (no sound files, nothing licensed). PRD Addendum G.
//
// How it fits together:
//   sound effects -> sfx bus -> master -> compressor -> limiter -> speakers
//   music         -> music bus -> master
//   heavy hits also go to a short "room" echo (a convolver) for weight, and
//   the nastiest sounds (laser, roar) go through a distortion curve for grit.
// Settings (on/off and volume for each) are saved per device.

const KEY = "operandi:sound";
const DEFAULTS = { music: true, musicVol: 0.6, sfx: true, sfxVol: 0.8 };
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; } };
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

class Sound {
  constructor() {
    this.settings = load();
    this.ctx = null;
    this.last = {};          // per-effect time of last play, to avoid stacking duplicates
    this.song = null;        // what the music should be playing: "battle" | "victory" | "defeat" | null
    this.danger = { boss: 0, me: 0 };   // 0..1 each: how close each fighter is to losing
    this.listeners = new Set();
    // Browsers only allow sound after the person interacts with the page.
    const unlock = () => this.unlock();
    addEventListener("pointerdown", unlock, { passive: true });
    addEventListener("keydown", unlock);
  }

  get ready() { return !!this.ctx && this.ctx.state === "running"; }
  onReady(fn) { this.listeners.add(fn); }

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
      this.room = c.createConvolver(); this.room.buffer = this.impulse(1.3);
      this.roomSend = c.createGain(); this.roomSend.gain.value = 0.4;
      this.roomSend.connect(this.room); this.room.connect(this.sfxBus);
      this.noiseBuf = this.makeNoise();
      this.curve = this.makeCurve(60);
      this.applySettings();
      c.onstatechange = () => { if (c.state === "running") { this.listeners.forEach((f) => f()); if (this.song && !this.timer) this.startSong(this.song); } };
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
  makeCurve(k) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return curve;
  }
  // An envelope: quick attack to `peak`, exponential fall over `dur`.
  env(gain, t, peak, dur, attack = 0.004) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  }
  // Where a voice goes: the bus, plus optional room echo and distortion.
  route(g, { to = this.sfxBus, room = 0, dist = false } = {}) {
    let node = g;
    if (dist) { const ws = this.ctx.createWaveShaper(); ws.curve = this.curve; ws.oversample = "2x"; g.connect(ws); node = ws; }
    node.connect(to);
    if (room) { const r = this.ctx.createGain(); r.gain.value = room; node.connect(r); r.connect(this.roomSend); }
  }
  tone(type, f0, f1, t, dur, peak, o = {}) {
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + (o.glide ?? dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vibrato) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibrato[0]; lg.gain.value = o.vibrato[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1); }
    this.env(g, t, peak, dur, o.attack);
    osc.connect(g); this.route(g, o);
    osc.start(t); osc.stop(t + dur + 0.1);
  }
  noise(t, dur, peak, o = {}) {
    const { type = "bandpass", f0 = 1000, f1 = f0, q = 1 } = o;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    this.env(g, t, peak, dur, o.attack);
    s.connect(f); f.connect(g); this.route(g, o);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.1);
  }

  // ---- Effects ----
  // name: which sound. o: { size: 0.5..2, theme: "water"|"fire", ms: length }
  sfx(name, o = {}) {
    if (!this.ready || !this.settings.sfx) return;
    const now = this.ctx.currentTime;
    const gap = { buzz: 0.12, glitch: 0.06, debris: 0.08, zap: 0.06, splash: 0.05, hit: 0.03, hop: 0.15, drip: 0.08 }[name] ?? 0.02;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const S = SFX[name];
    if (S) S.call(this, now + 0.005, o.size ?? 1, { ...o, fire: o.theme === "fire" });
  }

  // ---- Music ----
  music(song) {
    if (song === this.song) return;
    this.song = song;
    if (this.ctx) this.startSong(song);
  }
  // How close each side is to losing (0..1). The theme gets tenser with either.
  setDanger(boss, me) { this.danger = { boss, me }; }
  get intensity() { return Math.max(this.danger.boss, this.danger.me); }

  startSong(song) {
    clearInterval(this.timer);
    this.timer = null;
    if (!song || !this.ready) return;
    if (song === "victory" || song === "defeat") return this.jingle(song);
    // A look-ahead scheduler: every 25 ms, queue the notes due in the next 120 ms.
    this.step = 0;
    this.nextAt = this.ctx.currentTime + 0.12;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    const c = this.ctx;
    if (!c || c.state !== "running") return;
    if (this.nextAt < c.currentTime - 0.2) this.nextAt = c.currentTime + 0.05;   // after a pause, don't play a backlog
    while (this.nextAt < c.currentTime + 0.12) {
      // it speeds up as things get desperate: 148 to 166 BPM
      const bpm = 148 + 18 * this.intensity, sixteenth = 60 / bpm / 4;
      this.playStep(this.step, this.nextAt, sixteenth);
      this.step = (this.step + 1) % (SONG.length * 16);
      this.nextAt += sixteenth;
    }
  }

  // One 16th-note step of the battle theme. Layers come in with the danger:
  //   always: syncopated drums, a 16th-note bass ostinato that never lets up, the lead
  //   > 0.4: an arpeggio over the chord and 16th hats
  //   > 0.7: the lead up an octave, double kicks, snare rolls into each 4-bar phrase
  //   your teammate below 1/3 HP: a warning alarm pulsing over the top
  playStep(step, t, len) {
    const bar = Math.floor(step / 16), s = step % 16, B = SONG[bar], out = this.musicBus;
    const lvl = this.intensity, mid = lvl > 0.4, hot = lvl > 0.7, low = this.danger.me > 0.66;
    // drums
    const kick = [0, 3, 8, 11].includes(s) || (hot && [6, 14].includes(s));
    if (kick) { this.tone("sine", 160, 38, t, 0.17, 0.95, { to: out }); this.noise(t, 0.02, 0.25, { type: "lowpass", f0: 3000, to: out }); }
    if (s === 4 || s === 12) { this.noise(t, 0.14, 0.5, { type: "bandpass", f0: 1800, q: 0.7, to: out }); this.tone("triangle", 220, 140, t, 0.08, 0.25, { to: out }); }
    const roll = hot && bar % 4 === 3 && s >= 12;
    if (roll) this.noise(t, 0.06, 0.32, { type: "bandpass", f0: 2000, q: 0.8, to: out });
    if (mid || s % 2 === 0) this.noise(t, 0.025, s % 4 === 2 ? 0.16 : 0.08, { type: "highpass", f0: 7500, to: out });
    if (s === 0 && bar % 4 === 0) this.noise(t, 0.9, 0.18, { type: "highpass", f0: 5000, to: out });   // crash each phrase
    // bass ostinato: root, root, octave, root ... with a chromatic step up for unease
    const bassPat = [0, 0, 12, 0, 0, 1, 12, 0, 0, 0, 12, 0, 1, 0, 12, 13];
    this.pulse("triangle", B.root + bassPat[s], t, len * 0.9, 0.55, out);
    // lead: eighth notes, "-" holds the previous note
    if (s % 2 === 0) {
      const n = B.lead[s / 2];
      if (typeof n === "number") {
        let hold = 1; while (s / 2 + hold < 8 && B.lead[s / 2 + hold] === "-") hold++;
        this.pulse("square", n + (hot ? 12 : 0), t, len * 2 * hold * 0.92, hot ? 0.12 : 0.15, out, 0.125);
      }
    }
    if (mid) { const ch = CHORDS[B.chord]; this.pulse("square", ch[s % ch.length] + 12, t, len * 0.7, hot ? 0.07 : 0.05, out, 0.25); }
    // the alarm when your teammate is in trouble
    if (low && (s === 0 || s === 8)) { this.pulse("square", 91, t, len * 3, 0.06, out, 0.5); this.pulse("square", 90, t + len * 3, len * 3, 0.06, out, 0.5); }
  }
  // A chiptune voice. duty: pulse width for square waves (0.125, 0.25 or 0.5).
  pulse(type, n, t, dur, peak, out, duty) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    if (type === "square" && duty && duty !== 0.5) o.setPeriodicWave(this.pulseWave(duty)); else o.type = type;
    o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.setValueAtTime(peak, t + Math.max(0.01, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  pulseWave(duty) {
    this.waves ||= {};
    if (this.waves[duty]) return this.waves[duty];
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return (this.waves[duty] = this.ctx.createPeriodicWave(re, im));
  }
  jingle(kind) {
    const t = this.ctx.currentTime + 0.05, out = this.musicBus;
    const notes = kind === "victory" ? [62, 66, 69, 74, 78, 81] : [69, 68, 65, 62, 61];
    const step = kind === "victory" ? 0.09 : 0.3;
    notes.forEach((n, i) => this.pulse(kind === "victory" ? "square" : "triangle", n, t + i * step, step * 1.6, 0.16, out, 0.25));
    const end = t + notes.length * step;
    if (kind === "victory") [74, 78, 81].forEach((n) => this.pulse("square", n, end, 1.2, 0.1, out));
    else { this.pulse("triangle", 38, end, 1.6, 0.4, out); this.pulse("square", 39, end, 1.6, 0.05, out); }
  }
}

// ---- The battle theme: D harmonic minor, 16 bars ----
// Tension comes from half-step rubs (D-Eb, G-Ab), the C#-diminished turnaround
// and a bass that never stops. Each bar: bass root, chord, 8 lead eighth-notes
// (MIDI number, "-" to hold, null for a rest).
const CHORDS = { Dm: [62, 65, 69, 74], Bb: [58, 62, 65, 70], A: [57, 61, 64, 69], Gm: [55, 58, 62, 67], Eb: [63, 67, 70, 75], Cd: [61, 64, 67, 70] };
const bar = (root, chord, lead) => ({ root, chord, lead });
const SONG = [
  bar(38, "Dm", [74, "-", 75, 74, "-", 70, 69, "-"]),
  bar(38, "Dm", [74, "-", 75, 74, "-", 77, 75, 74]),
  bar(34, "Bb", [70, "-", 69, 70, "-", 74, 73, "-"]),
  bar(33, "A", [73, "-", 74, 73, "-", 69, null, null]),
  bar(31, "Gm", [79, "-", 80, 79, "-", 75, 74, "-"]),
  bar(39, "Eb", [75, "-", 74, 75, "-", 79, 82, "-"]),
  bar(37, "Cd", [73, "-", 76, 79, "-", 82, "-", 79]),
  bar(33, "A", [81, "-", "-", 80, 81, "-", null, null]),
  bar(38, "Dm", [86, "-", 85, 86, "-", 81, "-", 77]),
  bar(34, "Bb", [82, "-", 81, 82, "-", 77, "-", 74]),
  bar(31, "Gm", [79, "-", 78, 79, "-", 74, "-", 70]),
  bar(33, "A", [73, "-", 76, 79, "-", 82, 81, 79]),
  bar(38, "Dm", [74, 74, null, 74, 75, null, 74, null]),
  bar(39, "Eb", [75, 75, null, 75, 77, null, 75, null]),
  bar(37, "Cd", [76, "-", 79, "-", 82, "-", 85, "-"]),
  bar(33, "A", [81, "-", 80, "-", 79, "-", 76, 73]),
];

// ---- The effects. `this` is the Sound; t = start time; k = size. ----
const SFX = {
  // Generic heavy hit: sub-bass drop, noise crack, pitched body, room echo.
  impact(t, k) {
    this.tone("sine", 120 * (1.2 - 0.2 * k), 30, t, 0.5 + 0.3 * k, 0.95 * Math.min(1.3, k), { room: 0.35 });
    this.noise(t, 0.2 + 0.12 * k, 0.65 * k, { type: "lowpass", f0: 3000, f1: 250, room: 0.45 });
    this.tone("square", 170, 50, t, 0.14, 0.2 * k, { dist: true });
    this.noise(t, 0.05, 0.45, { type: "bandpass", f0: 3500, q: 0.8 });
  },
  hit(t, k) {
    this.noise(t, 0.09, 0.55 * k, { type: "bandpass", f0: 2200, q: 0.7 });
    this.tone("sine", 190, 55, t, 0.22, 0.65 * k, { room: 0.2 });
  },
  explosion(t, k) {
    this.noise(t, 1 * k, 0.75, { type: "lowpass", f0: 3500, f1: 100, room: 0.55 });
    this.tone("sine", 95, 26, t, 0.9 * k, 0.95, { room: 0.35 });
    this.noise(t + 0.02, 0.45, 0.35, { type: "bandpass", f0: 900, f1: 180, q: 0.6, dist: true });
    for (let i = 0; i < 5; i++) this.noise(t + 0.1 + Math.random() * 0.5, 0.05, 0.15, { type: "highpass", f0: 3000 });   // debris crackle
  },

  // ---- Your teammate: water (DOT) or fire (PYRO) ----
  gather(t, k, o) {
    // energy drawn in: a rising swirl (bubbles for water, crackle for fire)
    if (o.fire) { this.noise(t, 0.5, 0.25, { type: "bandpass", f0: 400, f1: 2400, q: 2 }); for (let i = 0; i < 6; i++) this.noise(t + i * 0.06, 0.03, 0.15, { type: "highpass", f0: 4000 }); return; }
    this.noise(t, 0.45, 0.3, { type: "bandpass", f0: 300, f1: 1800, q: 3 });
    for (let i = 0; i < 6; i++) { const f = 400 + i * 120; this.tone("sine", f, f * 1.6, t + i * 0.06, 0.07, 0.07); }
  },
  whoosh(t, k, o) {
    if (o.fire) { this.noise(t, 0.4, 0.45, { type: "bandpass", f0: 300, f1: 2500, q: 0.8, dist: true }); this.noise(t, 0.35, 0.2, { type: "highpass", f0: 3000 }); return; }
    // a rushing jet of water
    this.noise(t, 0.4, 0.5, { type: "bandpass", f0: 400, f1: 3000, q: 1.2, room: 0.2 });
    this.noise(t + 0.05, 0.3, 0.25, { type: "highpass", f0: 5000 });
  },
  slash(t, k, o) {
    if (o.fire) { this.noise(t, 0.28, 0.5, { type: "bandpass", f0: 600, f1: 4000, q: 1.2, dist: true }); this.noise(t, 0.2, 0.25, { type: "highpass", f0: 3000 }); return; }
    // a blade of water cutting the air: hiss sweep plus a wet slap
    this.noise(t, 0.22, 0.55, { type: "bandpass", f0: 900, f1: 7000, q: 2 });
    this.noise(t + 0.08, 0.2, 0.4, { type: "bandpass", f0: 1600, f1: 600, q: 1, room: 0.25 });
  },
  splash(t, k, o) {
    if (o.fire) { this.noise(t, 0.4 * k, 0.5 * k, { type: "lowpass", f0: 2500, f1: 300, dist: true, room: 0.3 }); for (let i = 0; i < 6; i++) this.noise(t + Math.random() * 0.2, 0.04, 0.2, { type: "highpass", f0: 3000 }); return; }
    // a slap of water, a wash of spray, and bubbles
    this.tone("sine", 140, 60, t, 0.15, 0.5 * k);
    this.noise(t, 0.35 * k, 0.5 * k, { type: "bandpass", f0: 1800, f1: 500, q: 0.8, room: 0.3 });
    this.noise(t, 0.5 * k, 0.2 * k, { type: "highpass", f0: 4000, f1: 2000 });
    for (let i = 0; i < 6; i++) { const f = 450 + Math.random() * 1100; this.tone("sine", f, f * 1.9, t + 0.05 + Math.random() * 0.2, 0.05, 0.09 * k); }
  },
  splashBig(t, k, o) {
    SFX.splash.call(this, t, 1.6, o);
    this.tone("sine", 90, 30, t, 0.6, 0.8, { room: 0.4 });
    this.noise(t + 0.15, 0.9, 0.35, { type: "lowpass", f0: 2500, f1: 400, room: 0.5 });   // the spray falling back
  },
  wave(t, k, o) {
    // a wall of water building, roaring in, and crashing
    const typ = o.fire ? "bandpass" : "lowpass";
    this.noise(t, 1.0, 0.55, { type: typ, f0: 250, f1: 2800, q: 0.6, attack: 0.5, room: 0.4, dist: o.fire });
    this.tone("sine", 50, 70, t, 1.0, 0.5, { attack: 0.6 });
    this.noise(t + 0.95, 0.9, 0.7, { type: "lowpass", f0: 4000, f1: 300, room: 0.6 });
    this.tone("sine", 100, 28, t + 0.95, 0.7, 0.9, { room: 0.4 });
  },
  orb(t, k, o) {
    if (o.fire) { this.noise(t, 0.15, 0.3, { type: "bandpass", f0: 800, f1: 3000, q: 1, dist: true }); return; }
    this.tone("sine", 300, 1100, t, 0.12, 0.25); this.noise(t, 0.12, 0.2, { type: "bandpass", f0: 1500, q: 2 });
  },
  drip(t) { const f = 900 + Math.random() * 600; this.tone("sine", f, f * 2, t, 0.05, 0.08); },

  // ---- GOLEM ----
  roar(t, k) {
    // a mechanical roar: a low detuned growl through distortion, a servo shriek on top
    for (const [f, d] of [[55, 0], [58, 15], [82, -10]]) this.tone("sawtooth", f, f * 0.8, t, 1.3, 0.22, { dist: true, room: 0.4, attack: 0.15, detune: d, vibrato: [7, 6] });
    this.tone("square", 700, 1200, t, 0.6, 0.06, { vibrato: [11, 40], attack: 0.1 });
    this.noise(t, 1.2, 0.3, { type: "lowpass", f0: 600, f1: 200, attack: 0.15, room: 0.4 });
  },
  servo(t, k, o) {
    const d = (o.ms || 500) / 1000;
    this.tone("square", 120, 340, t, d, 0.08, { vibrato: [24, 12] });
    this.tone("sawtooth", 60, 170, t, d, 0.12, { dist: true });
    this.noise(t, d, 0.12, { type: "bandpass", f0: 900, f1: 2200, q: 4 });
  },
  charge(t, k, o) {
    const d = (o.ms || 700) / 1000;
    this.tone("sawtooth", 80, 900, t, d, 0.12, { room: 0.2 });
    this.tone("square", 55, 440, t, d, 0.06, { vibrato: [14, 8] });
  },
  laserCharge(t, k, o) {
    // a rising, wavering shriek with a growl underneath: something terrible is coming
    const d = (o.ms || 1000) / 1000;
    this.tone("sawtooth", 110, 1400, t, d, 0.16, { vibrato: [9, 30], attack: 0.2, room: 0.3 });
    this.tone("square", 220, 2800, t, d, 0.05, { vibrato: [17, 60] });
    this.tone("sawtooth", 45, 60, t, d, 0.25, { dist: true, attack: 0.3 });
    this.noise(t, d, 0.2, { type: "bandpass", f0: 500, f1: 5000, q: 6, attack: 0.3 });
  },
  laserBeam(t, k, o) {
    // the beam: a thick, distorted roar that pulses, with a searing top and a tail of crackle
    const d = (o.ms || 800) / 1000;
    for (const [f, dt] of [[90, 0], [92, 20], [180, -12], [270, 7]]) this.tone("sawtooth", f, f * 0.85, t, d, 0.2, { dist: true, room: 0.4, detune: dt, vibrato: [32, 9], attack: 0.01 });
    this.tone("sine", 60, 40, t, d, 0.9, { attack: 0.01 });
    this.noise(t, d, 0.45, { type: "bandpass", f0: 3500, f1: 1800, q: 0.9, dist: true });
    this.tone("square", 1800, 1500, t, d, 0.05, { vibrato: [40, 120] });
    SFX.impact.call(this, t, 1.2);
    for (let i = 0; i < 6; i++) this.noise(t + d + i * 0.05, 0.04, 0.2, { type: "highpass", f0: 2500 });
  },
  cannon(t, k) {
    // a cannon round: a deep boom, a mechanical clack, the shell's whistle
    this.tone("sine", 140, 35, t, 0.4, 0.95 * k, { room: 0.35 });
    this.noise(t, 0.25, 0.6 * k, { type: "lowpass", f0: 3500, f1: 300, dist: true });
    this.tone("square", 900, 400, t, 0.03, 0.12);
    this.tone("sine", 2200, 900, t + 0.04, 0.25, 0.05);
  },
  zap(t) { for (let i = 0; i < 3; i++) this.tone("square", 900 + Math.random() * 1600, 300, t + i * 0.025, 0.04, 0.07); },
  debris(t) { this.tone("square", 500 + Math.random() * 700, 180, t, 0.06, 0.06); this.noise(t, 0.05, 0.15, { type: "highpass", f0: 4000 }); },
  rumble(t, k) { this.noise(t, 0.8 * k, 0.55, { type: "lowpass", f0: 200, q: 0.7, room: 0.35 }); this.tone("sine", 45, 35, t, 0.7 * k, 0.4); },
  stinger(t) {
    [38, 45, 50, 51].forEach((n, i) => this.tone("sawtooth", midi(n), midi(n), t + i * 0.02, 1.5, 0.11, { room: 0.5, dist: i === 0 }));
    this.tone("sine", 60, 28, t, 1.3, 0.8, { room: 0.4 });
    this.noise(t, 0.6, 0.35, { type: "lowpass", f0: 5000, f1: 200, room: 0.5 });
  },
  swoosh(t) { this.noise(t, 0.7, 0.45, { type: "bandpass", f0: 5000, f1: 150, q: 1 }); this.tone("sine", 500, 50, t, 0.7, 0.25); },
  miss(t) { this.noise(t, 0.2, 0.2, { type: "bandpass", f0: 1500, f1: 500, q: 2 }); },
  hurt(t) { this.tone("sine", 280, 80, t, 0.28, 0.35); this.noise(t, 0.14, 0.25, { type: "lowpass", f0: 900 }); },

  // ---- Specials ----
  shield(t) {
    this.tone("sine", 220, 220, t, 1.3, 0.2, { room: 0.45, attack: 0.15 }); this.tone("sine", 330, 336, t, 1.3, 0.14, { room: 0.45, attack: 0.15 });
    this.noise(t, 0.7, 0.18, { type: "bandpass", f0: 500, f1: 2600, q: 3 });
  },
  block(t) { this.tone("sine", 680, 520, t, 0.3, 0.25, { room: 0.35 }); this.noise(t, 0.09, 0.3, { type: "bandpass", f0: 2600, q: 2 }); },
  shatter(t) {
    this.noise(t, 0.7, 0.5, { type: "highpass", f0: 3000, room: 0.55 });
    for (let i = 0; i < 10; i++) { const f = 1800 + Math.random() * 3500; this.tone("sine", f, f * 0.9, t + Math.random() * 0.3, 0.3, 0.07); }
  },
  launch(t) {
    this.tone("square", 160, 1000, t, 0.2, 0.12); this.noise(t, 0.25, 0.4, { type: "bandpass", f0: 500, f1: 3500, q: 1 });
    this.tone("sine", 110, 40, t, 0.25, 0.6, { room: 0.3 });
  },
  buzz(t) { for (let i = 0; i < 3; i++) { const f = 190 + Math.random() * 90; this.tone("sawtooth", f, f * 1.05, t + i * 0.02, 0.2, 0.04, { vibrato: [60, 20] }); } },
  bite(t) { this.noise(t, 0.08, 0.4, { type: "bandpass", f0: 1200, q: 3, dist: true }); this.tone("square", 300, 120, t, 0.06, 0.1); },
  glitch(t) {
    for (let i = 0; i < 4; i++) this.tone("square", 80 + Math.random() * 1600, 80 + Math.random() * 1600, t + i * 0.03, 0.03, 0.09);
    this.noise(t, 0.12, 0.22, { type: "bandpass", f0: 300 + Math.random() * 3000, q: 4, dist: true });
  },
  screech(t) {
    // the data blast: a tearing digital shriek
    this.tone("sawtooth", 2400, 200, t, 0.7, 0.2, { dist: true, vibrato: [55, 300], room: 0.3 });
    this.tone("square", 120, 1800, t, 0.5, 0.08, { vibrato: [33, 200] });
    this.noise(t, 0.6, 0.35, { type: "bandpass", f0: 4000, f1: 600, q: 2, dist: true });
    SFX.impact.call(this, t, 1);
  },

  // ---- Your roaming teammate (quiet: they play outside battles too) ----
  hop(t, k, o) { if (o.fire) this.noise(t, 0.04, 0.05, { type: "highpass", f0: 3500 }); else this.tone("sine", 260, 420, t, 0.07, 0.06); },
  pickup(t, k, o) { this.tone("sine", 240, 760, t, 0.18, 0.14); if (o.fire) this.noise(t, 0.15, 0.08, { type: "highpass", f0: 3000 }); },
  plop(t, k, o) {
    if (o.fire) { this.noise(t, 0.2, 0.2, { type: "lowpass", f0: 2000, f1: 300 }); this.tone("sine", 160, 60, t, 0.15, 0.3); return; }
    this.tone("sine", 180, 70, t, 0.16, 0.35); this.noise(t, 0.18, 0.2, { type: "bandpass", f0: 1400, f1: 500, q: 1 });
    for (let i = 0; i < 3; i++) { const f = 600 + Math.random() * 600; this.tone("sine", f, f * 1.8, t + 0.06 + i * 0.04, 0.05, 0.05); }
  },
};

export const sound = new Sound();

// Tie sounds to a battle's effects (battle-fx.js), so every visual beat has
// its sound at exactly the same moment, slow motion and hit-stop included.
// Moves that need a special sound (the laser, the roar...) call sound.sfx themselves.
export function wireBattleSounds(fx, theme) {
  const on = (name, f) => { const orig = fx[name].bind(fx); fx[name] = (...a) => { try { f(...a); } catch {} return orig(...a); }; };
  on("hitstop", (ms) => sound.sfx(ms >= 100 ? "impact" : "hit", { size: Math.min(2, ms / 100) }));
  on("explosion", (c, o = {}) => sound.sfx("explosion", { size: o.size ?? 1 }));
  on("gather", (c, th) => sound.sfx("gather", { theme: th }));
  on("slash", () => sound.sfx("slash", { theme }));
  on("dashTrail", (a, b, th) => sound.sfx("whoosh", { theme: th }));
  on("splash", (c, th, o = {}) => sound.sfx("splash", { theme: th, size: Math.min(1.4, (o.n || 20) / 22) }));
  on("splashCrown", (x, th) => sound.sfx("splashBig", { theme: th }));
  on("wave", (a, b, th) => sound.sfx("wave", { theme: th }));
  on("orb", (a, b, th) => sound.sfx("orb", { theme: th }));
  on("ripple", (c, th) => sound.sfx("drip", { theme: th }));
  on("converge", (c, o = {}) => o.sound !== false && sound.sfx("charge", { ms: o.ms }));
  on("beam", (a, b, o = {}) => sound.sfx("laserBeam", { ms: o.ms }));
  on("shot", () => sound.sfx("cannon"));
  on("arcs", () => sound.sfx("zap"));
  on("debris", () => sound.sfx("debris"));
  on("crack", () => sound.sfx("rumble", { size: 1 }));
  on("groundWave", () => sound.sfx("rumble", { size: 0.7 }));
  on("title", () => sound.sfx("stinger"));
  on("bug", () => sound.sfx("buzz"));
}
