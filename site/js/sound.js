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
const DEFAULTS = { music: true, musicVol: 0.6, sfx: true, sfxVol: 0.8, roamVol: 0.6, grabVol: 0.8 };
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; } };
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// Half a second of silence as a WAV file (for the iPad media-playback trick).
function silentWav() {
  const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const str = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

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
    // (iPad Safari only counts touchend and click as permission, not pointerdown.)
    for (const ev of ["pointerdown", "touchend", "click", "keydown"]) addEventListener(ev, unlock, { passive: true });
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
      // your teammate's own sounds have their own volume, under the effects volume
      this.roamBus = c.createGain(); this.roamBus.connect(this.sfxBus);   // moving about
      this.grabBus = c.createGain(); this.grabBus.connect(this.sfxBus);   // picked up and dropped
      this.bus = this.sfxBus;                                            // where the effect being built goes
      this.room = c.createConvolver(); this.room.buffer = this.impulse(1.3);
      this.roomSend = c.createGain(); this.roomSend.gain.value = 0.4;
      this.roomSend.connect(this.room); this.room.connect(this.sfxBus);
      this.noiseBuf = this.makeNoise();
      this.curve = this.makeCurve(60);
      this.applySettings();
      c.onstatechange = () => { if (c.state === "running") { this.listeners.forEach((f) => f()); if (this.song && !this.timer) this.startSong(this.song); } };
      if (this.song) this.startSong(this.song);
    }
    if (this.ctx.state !== "running") this.ctx.resume();
    // iPad/iPhone: play one silent sample inside the tap to fully wake the audio,
    // and play the page's sound as media so the silent switch doesn't mute it.
    try {
      const b = this.ctx.createBuffer(1, 1, 22050), src = this.ctx.createBufferSource();
      src.buffer = b; src.connect(this.ctx.destination); src.start(0);
      if (navigator.audioSession) navigator.audioSession.type = "playback";
      if (!this.mediaKick) {
        this.mediaKick = new Audio(silentWav());
        this.mediaKick.loop = true; this.mediaKick.setAttribute("playsinline", "");
      }
      this.mediaKick.play().catch(() => {});
    } catch {}
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
    this.roamBus.gain.setTargetAtTime(s.roamVol, t, 0.05);
    this.grabBus.gain.setTargetAtTime(s.grabVol, t, 0.05);
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
  route(g, { to = this.bus, room = 0, dist = false } = {}) {
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

  // Water rocking about: noise through a filter that wobbles up and down.
  slosh(t, dur, peak, { f = 700, rate = 9, depth = 450, q = 3 } = {}) {
    const c = this.ctx, s = c.createBufferSource(), lp = c.createBiquadFilter(), bp = c.createBiquadFilter(), g = c.createGain();
    const lfo = c.createOscillator(), lg = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    lp.type = "lowpass"; lp.frequency.value = 2200;
    bp.type = "bandpass"; bp.Q.value = q; bp.frequency.setValueAtTime(f, t);
    lfo.frequency.value = rate; lg.gain.value = depth; lfo.connect(lg); lg.connect(bp.frequency);
    this.env(g, t, peak, dur, 0.02);
    s.connect(lp); lp.connect(bp); bp.connect(g); g.connect(this.bus);
    s.start(t, Math.random()); s.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
  }
  // A cloud of wings: detuned buzzing voices, each fluttering at its own wingbeat,
  // plus a papery flutter on top. It swells in, holds, and fades.
  swarm(t, dur, peak) {
    const c = this.ctx, bus = c.createGain(), bp = c.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.8;
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.exponentialRampToValueAtTime(peak * 0.6, t + Math.min(0.5, dur * 0.2));
    bus.gain.exponentialRampToValueAtTime(peak, t + dur * 0.7);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    bus.connect(bp); bp.connect(this.bus);
    const end = t + dur + 0.1;
    for (let i = 0; i < 9; i++) {
      const o = c.createOscillator(), amp = c.createGain(), wing = c.createOscillator(), wg = c.createGain(), drift = c.createOscillator(), dg = c.createGain();
      o.type = i % 2 ? "sawtooth" : "square"; o.frequency.value = 130 + Math.random() * 190;
      drift.frequency.value = 0.5 + Math.random() * 2; dg.gain.value = 12 + Math.random() * 20; drift.connect(dg); dg.connect(o.frequency);
      wing.frequency.value = 35 + Math.random() * 55; wg.gain.value = 0.5; amp.gain.value = 0.5; wing.connect(wg); wg.connect(amp.gain);
      const v = c.createGain(); v.gain.value = 0.12;
      o.connect(amp); amp.connect(v); v.connect(bus);
      for (const n of [o, wing, drift]) { n.start(t); n.stop(end); }
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), am = c.createGain(), flap = c.createOscillator(), fg = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 1.5;
    flap.frequency.value = 22; fg.gain.value = 0.5; am.gain.value = 0.5; flap.connect(fg); fg.connect(am.gain);
    const nv = c.createGain(); nv.gain.value = 0.5;
    s.connect(f); f.connect(am); am.connect(nv); nv.connect(bus);
    s.start(t); s.stop(end); flap.start(t); flap.stop(end);
  }

  // ---- Effects ----
  // name: which sound. o: { size: 0.5..2, theme: "water"|"fire"|"void", ms: length }
  sfx(name, o = {}) {
    if (!this.ready || !this.settings.sfx) return;
    const now = this.ctx.currentTime;
    const gap = { buzz: 0.12, glitch: 0.06, debris: 0.08, zap: 0.06, splash: 0.05, hit: 0.03, hop: 0.15, drip: 0.08 }[name] ?? 0.02;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const S = SFX[name];
    // your teammate's sounds follow the roaming and pick-up volumes (NOVA's idles count as roaming)
    this.bus = name === "hop" || NOVA_IDLE.has(name) ? this.roamBus : name === "pickup" || name === "plop" ? this.grabBus : this.sfxBus;
    if (S) S.call(this, now + 0.005, o.size ?? 1, { ...o, fire: o.theme === "fire", void: o.theme === "void" });
    this.bus = this.sfxBus;
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
      const bpm = 160 + 18 * this.intensity, sixteenth = 60 / bpm / 4;
      this.playStep(this.step, this.nextAt, sixteenth);
      this.step = (this.step + 1) % (SONG.length * 16);
      this.nextAt += sixteenth;
    }
  }

  // One 16th-note step of the battle theme. Layers come in with the danger:
  //   always: syncopated drums, a 16th-note bass ostinato and a root-fifth tremolo that
  //           never let up, the lead, and a rising sweep into each 8-bar section
  //   > 0.4: an arpeggio, distorted chord stabs, 16th hats, tom fills
  //   > 0.7: the lead up an octave, double kicks, snare rolls into each 4-bar phrase
  //   your teammate below 1/3 HP: a warning alarm pulsing over the top
  playStep(step, t, len) {
    const bar = Math.floor(step / 16), s = step % 16, B = SONG[bar], out = this.musicBus;
    const lvl = this.intensity, mid = lvl > 0.4, hot = lvl > 0.7, low = this.danger.me > 0.66;
    // drums: syncopated kicks that get busier with the danger, a cracking snare
    const kick = [0, 3, 8, 11].includes(s) || (mid && s === 14) || (hot && [2, 6, 10].includes(s));
    if (kick) { this.tone("sine", 170, 36, t, 0.18, 1, { to: out }); this.noise(t, 0.02, 0.3, { type: "lowpass", f0: 3000, to: out }); }
    if (s === 4 || s === 12) {
      this.noise(t, 0.16, 0.55, { type: "bandpass", f0: 1800, q: 0.7, to: out });
      this.noise(t, 0.1, 0.25, { type: "highpass", f0: 5000, to: out });
      this.tone("triangle", 240, 140, t, 0.09, 0.3, { to: out });
    }
    // tom fill into each 4-bar phrase
    if (mid && bar % 4 === 3 && s >= 12) this.tone("triangle", [210, 175, 145, 115][s - 12], 70, t, 0.14, 0.5, { to: out });
    // a rising sweep into each 8-bar section
    if (bar % 8 === 7 && s === 0) this.noise(t, len * 16, 0.14, { type: "highpass", f0: 400, f1: 9000, attack: len * 14, to: out });
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
    // the second voice: a relentless 16th-note tremolo between root and fifth
    // (the classic boss-battle drive), opening into a full arpeggio as it heats up
    const ch = CHORDS[B.chord];
    if (mid) this.pulse("square", ch[s % ch.length] + 12, t, len * 0.7, hot ? 0.07 : 0.055, out, 0.25);
    else this.pulse("square", ch[s % 2 ? 2 : 0] + 12, t, len * 0.6, 0.045, out, 0.25);
    // distorted chord stabs on the off-beats
    if (mid && [0, 3, 6, 10].includes(s)) for (const n of ch.slice(0, 3)) this.tone("sawtooth", midi(n - 12), midi(n - 12), t, len * 1.4, hot ? 0.05 : 0.035, { to: out, dist: true });
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
    // a cannon blast: a sub-bass boom that drops through the floor, a distorted
    // blast of air, a hard crack, and a long rumbling tail
    this.tone("sine", 110, 22, t, 1.1, 1, { room: 0.5, glide: 0.5 });
    this.tone("sine", 55, 30, t, 0.9, 0.7);
    this.noise(t, 0.6, 0.85 * k, { type: "lowpass", f0: 5000, f1: 150, dist: true, room: 0.6 });
    this.noise(t, 0.04, 0.6, { type: "highpass", f0: 2500 });
    this.tone("square", 180, 45, t, 0.18, 0.25, { dist: true });
    this.noise(t + 0.1, 1.2, 0.3, { type: "lowpass", f0: 400, f1: 80, room: 0.5 });   // the rumble rolling away
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
  swarm(t, k, o) { this.swarm(t, (o.ms || 3000) / 1000, 0.35 * k); },
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
  // DOT is liquid: he sloshes when he hops, glugs when picked up, splats when dropped.
  // (PYRO crackles instead.)
  // Each hop is a small jelly "blup": a clean tone that bends up and wobbles (the
  // same ingredients as the pick-up and plop Isaac liked), over a faint wet swirl.
  // Not a low buzz (that sounded rude) and not hiss (that sounded like wind).
  hop(t, k, o) {
    if (o.fire) { this.tone("sine", 900 + Math.random() * 400, 600, t, 0.05, 0.012, { attack: 0.01 }); return; }
    const f = 300 + Math.random() * 120;
    this.tone("sine", f, f * 1.45, t, 0.12, 0.035, { attack: 0.012, glide: 0.07, vibrato: [22, 18] });
    this.slosh(t, 0.18, 0.035, { f: 700, rate: 12, depth: 250 });
  },
  pickup(t, k, o) {
    if (o.void) { this.tone("sine", 300, 900, t, 0.35, 0.08, { vibrato: [8, 15], room: 0.4 }); this.noise(t, 0.3, 0.05, { type: "highpass", f0: 3000 }); return; }
    if (o.fire) { this.noise(t, 0.2, 0.12, { type: "highpass", f0: 3000 }); this.tone("sine", 200, 500, t, 0.2, 0.1); return; }
    // the goo stretching up: a rising glug and water swilling around
    this.tone("sine", 160, 420, t, 0.28, 0.18, { vibrato: [14, 25] });
    this.slosh(t + 0.05, 0.45, 0.2, { f: 650, rate: 7, depth: 500 });
  },
  plop(t, k, o) {
    if (o.void) { this.tone("sine", 120, 50, t, 0.3, 0.3, { room: 0.3 }); this.tone("triangle", 1200, 800, t, 0.4, 0.04, { room: 0.5 }); return; }
    if (o.fire) { this.noise(t, 0.25, 0.25, { type: "lowpass", f0: 2200, f1: 300 }); this.tone("sine", 160, 60, t, 0.18, 0.3); return; }
    // a wet splat, then the water settling with a slosh and a few bubbles
    this.tone("sine", 150, 55, t, 0.2, 0.45);
    this.noise(t, 0.16, 0.3, { type: "bandpass", f0: 1300, f1: 450, q: 1.2 });
    this.slosh(t + 0.08, 0.6, 0.22, { f: 550, rate: 6, depth: 380 });
    for (let i = 0; i < 4; i++) { const f = 500 + Math.random() * 700; this.tone("sine", f, f * 1.8, t + 0.15 + i * 0.07, 0.05, 0.05); }
  },

  // ---- Abilities (Addendum I) ----
  // NOVA: dark power streaming in, the rune circle tearing, hands bursting out, the crush
  voidCharge(t) {
    this.tone("sine", 70, 140, t, 0.6, 0.25, { attack: 0.3, room: 0.4 });
    this.noise(t, 0.6, 0.18, { type: "bandpass", f0: 400, f1: 1800, q: 3, attack: 0.3 });
  },
  voidTear(t) {
    this.noise(t, 0.25, 0.4, { type: "highpass", f0: 1500, f1: 5000 });
    this.tone("sawtooth", 160, 60, t, 0.3, 0.08, { dist: true });
    this.tone("sine", 55, 40, t, 0.6, 0.35, { room: 0.4 });
  },
  handsBurst(t) {
    for (let i = 0; i < 10; i++) this.noise(t + i * 0.035, 0.12, 0.18, { type: "bandpass", f0: 500 + Math.random() * 900, f1: 200, q: 2 });
    this.tone("sine", 90, 45, t, 0.5, 0.35, { room: 0.35 });
  },
  voidCrush(t) {
    this.tone("sine", 120, 30, t, 0.8, 0.6, { room: 0.5 });
    this.noise(t, 0.2, 0.5, { type: "bandpass", f0: 2600, q: 0.8 });
    this.noise(t, 0.5, 0.35, { type: "lowpass", f0: 1800, f1: 150, dist: true });
    for (let i = 0; i < 6; i++) this.noise(t + 0.05 + Math.random() * 0.3, 0.04, 0.12, { type: "highpass", f0: 3000 });
  },
  // PYRO: a blade of fire roaring into life
  flameIgnite(t) {
    this.noise(t, 0.45, 0.3, { type: "bandpass", f0: 300, f1: 1400, q: 1.2, attack: 0.1 });
    this.noise(t + 0.1, 0.4, 0.15, { type: "highpass", f0: 2500 });
    this.tone("sine", 80, 160, t, 0.4, 0.2);
  },
  // GOLEM: each missile leaving its pod
  missileLaunch(t) {
    this.noise(t, 0.35, 0.22, { type: "bandpass", f0: 900, f1: 2600, q: 1.5 });
    this.tone("square", 140, 70, t, 0.1, 0.05, { dist: true });
  },

  // ---- NOVA's idles (space magic) ----
  // The orrery: a deep swell, a shimmering minor chord and a rising rush of air.
  novaSummon(t) {
    this.tone("sine", 55, 82, t, 1.6, 0.35, { attack: 0.4, room: 0.4 });
    [587, 698, 880, 1319].forEach((f, i) => this.tone("triangle", f, f, t + 0.1 + i * 0.09, 2.6, 0.045, { attack: 0.15, vibrato: [5, 6], room: 0.6 }));
    this.noise(t, 1.1, 0.14, { type: "highpass", f0: 400, f1: 4000, room: 0.4, attack: 0.3 });
  },
  // the black hole passing: a heavy, falling "whoom"
  blackhole(t) {
    this.tone("sine", 90, 35, t, 1.4, 0.4, { attack: 0.2, room: 0.4 });
    this.noise(t, 1.2, 0.22, { type: "lowpass", f0: 1200, f1: 150, attack: 0.25 });
  },
  novaUnsummon(t) {
    this.tone("triangle", 1319, 440, t, 0.7, 0.06, { room: 0.5 });
    this.tone("sine", 82, 45, t, 0.8, 0.2, { room: 0.3 });
  },
  // He crushes his dust ring: stone grinding inward, then a crack.
  crush(t) {
    this.noise(t, 0.35, 0.2, { type: "bandpass", f0: 900, f1: 300, q: 2.5, attack: 0.15 });
    this.tone("sawtooth", 70, 50, t, 0.35, 0.05, { attack: 0.15, dist: true });
    for (let i = 0; i < 4; i++) this.noise(t + 0.05 + i * 0.07, 0.03, 0.1, { type: "highpass", f0: 2500 });
  },
  // ...and it bursts: a deep boom with a bright magic crack and the shards flying
  ringBurst(t) {
    this.tone("sine", 110, 32, t, 0.7, 0.55, { room: 0.45 });
    this.noise(t, 0.12, 0.45, { type: "bandpass", f0: 3200, q: 0.9 });
    this.noise(t, 0.6, 0.3, { type: "lowpass", f0: 2500, f1: 200, room: 0.4 });
    for (let i = 0; i < 5; i++) this.noise(t + 0.08 + Math.random() * 0.35, 0.04, 0.1, { type: "highpass", f0: 3500 });
  },
  // shaking them off: a fast rattle and a big whoosh outward
  shakeOff(t) {
    for (let i = 0; i < 9; i++) this.noise(t + i * 0.07, 0.05, 0.14, { type: "bandpass", f0: 1400 + (i % 2) * 600, q: 2 });
    this.noise(t + 0.2, 0.55, 0.22, { type: "bandpass", f0: 600, f1: 3000, q: 1.2 });
  },
  // the dust ring flung outward: a spinning whoosh that opens up, and a falling shimmer
  ringRelease(t) {
    this.noise(t, 0.9, 0.16, { type: "bandpass", f0: 700, f1: 3200, q: 3 });
    [1319, 1175, 880].forEach((f, i) => this.tone("triangle", f, f * 0.5, t + i * 0.1, 0.6, 0.04, { room: 0.5 }));
    this.tone("sine", 82, 60, t, 0.4, 0.18);
  },
  // the dust ring spiralling back: a rising shimmer that settles
  ringReform(t) {
    this.noise(t, 0.8, 0.12, { type: "bandpass", f0: 3000, f1: 700, q: 3, attack: 0.25 });
    [880, 1175, 1319].forEach((f, i) => this.tone("triangle", f * 0.5, f, t + i * 0.12, 0.6, 0.04, { room: 0.5 }));
    this.tone("sine", 60, 82, t + 0.6, 0.4, 0.2);
  },
  // Snack time. First a sharp rip in the air...
  portalTear(t) {
    this.noise(t, 0.22, 0.4, { type: "highpass", f0: 1800, f1: 6000, attack: 0.01 });
    this.noise(t, 0.08, 0.35, { type: "bandpass", f0: 2600, q: 1.2 });
    this.tone("square", 220, 90, t, 0.18, 0.06, { dist: true });
  },
  // ...then it rips wide: a roaring swirl over a deep boom, with crackling sparks
  portal(t) {
    this.tone("sine", 95, 38, t, 0.9, 0.5, { room: 0.45 });
    this.noise(t, 1.0, 0.32, { type: "bandpass", f0: 250, f1: 2400, q: 4, room: 0.4 });
    this.tone("sawtooth", 55, 110, t + 0.05, 0.8, 0.07, { dist: true });
    for (let i = 0; i < 7; i++) { const f = 1400 + Math.random() * 1600; this.tone("triangle", f, f * 1.3, t + 0.15 + i * 0.07, 0.1, 0.035, { room: 0.5 }); }
  },
  // telekinesis: a wavering, singing hum while the bucket floats
  telekinesis(t) {
    this.tone("sine", 220, 330, t, 1.1, 0.08, { attack: 0.15, vibrato: [6, 12], room: 0.4 });
    this.tone("triangle", 440, 660, t, 1.1, 0.03, { attack: 0.2, vibrato: [7, 20], room: 0.5 });
    this.noise(t, 1.0, 0.05, { type: "bandpass", f0: 1800, q: 6, attack: 0.2 });
  },
  bucketRise(t) {
    this.tone("sine", 220, 440, t, 0.4, 0.1);
    this.noise(t, 0.3, 0.1, { type: "bandpass", f0: 800, f1: 1600 });
  },
  pop(t) {
    this.noise(t, 0.04, 0.5, { type: "bandpass", f0: 1800, q: 3 });
    this.tone("triangle", 900, 500, t, 0.05, 0.12);
  },
  munch(t) {
    for (let i = 0; i < 3; i++) {
      this.noise(t + i * 0.11, 0.05, 0.35, { type: "bandpass", f0: 1200 + Math.random() * 800, q: 1.5 });
      this.noise(t + i * 0.11, 0.06, 0.2, { type: "lowpass", f0: 700 });
    }
  },
  // the portal imploding, then a burst as it snaps shut
  portalClose(t) {
    this.noise(t, 0.4, 0.3, { type: "bandpass", f0: 2500, f1: 250, q: 3, room: 0.3 });
    this.tone("sine", 140, 45, t, 0.4, 0.35, { room: 0.3 });
    this.tone("sine", 90, 30, t + 0.38, 0.5, 0.5, { room: 0.45 });
    this.noise(t + 0.38, 0.1, 0.35, { type: "bandpass", f0: 3000, q: 0.9 });
  },
};
const NOVA_IDLE = new Set(["novaSummon", "blackhole", "novaUnsummon", "crush", "ringBurst", "ringRelease", "shakeOff", "ringReform",
  "portalTear", "portal", "telekinesis", "bucketRise", "pop", "munch", "portalClose"]);

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
}
