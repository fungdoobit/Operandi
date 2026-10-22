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
    this.theme = THEMES[song] || null;   // a biome's theme (Addendum K), else the boss theme
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
      const T = this.theme;
      const bpm = T ? T.bpm * (1 + 0.06 * this.intensity) : 160 + 18 * this.intensity, sixteenth = 60 / bpm / 4;
      // swing: every other 16th is late (the swamp's lurch)
      const at = T?.swing && this.step % 2 ? this.nextAt + sixteenth * T.swing * 0.5 : this.nextAt;
      if (T) this.playTheme(T, this.step, at, sixteenth); else this.playStep(this.step, at, sixteenth);
      this.step = (this.step + 1) % ((T ? T.prog.length : SONG.length) * 16);
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
  // One 16th of a biome theme (THEMES below). Lighter than the boss theme:
  // drums, a bass line, the lead and one colour layer of its own; more hats
  // and the lead up an octave as the fight gets close, and the same alarm when
  // your teammate is low.
  playTheme(T, step, t, len) {
    const out = this.musicBus, bar = Math.floor(step / 16), s = step % 16, lvl = this.intensity, mid = lvl > 0.4, hot = lvl > 0.7;
    const deg = (d) => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return T.tonic + 12 * o + T.scale[i]; };
    const root = T.prog[bar % T.prog.length], chord = [root, root + 2, root + 4].map(deg);
    const D = T.drums;
    if (D.kick.includes(s) || (hot && D.kick2?.includes(s))) { this.tone("sine", D.kickF || 150, 38, t, 0.16, D.kickV ?? 0.8, { to: out }); this.noise(t, 0.015, 0.2, { type: "lowpass", f0: 2500, to: out }); }
    if (D.snare.includes(s)) { this.noise(t, D.snareLen || 0.12, D.snareV ?? 0.4, { type: "bandpass", f0: D.snareF || 1800, q: 0.8, to: out }); }
    if (D.tom?.includes(s)) this.tone("triangle", [220, 180, 150, 120][s % 4], 80, t, 0.12, 0.35, { to: out });
    if (D.block?.includes(s)) this.tone("square", 1250, 1100, t, 0.03, 0.08, { to: out });
    const hatEvery = mid ? Math.max(1, D.hat / 2) : D.hat;
    if (D.hat && s % hatEvery === 0) this.noise(t, 0.02, (s % 4 === 2 ? 0.1 : 0.06) * (D.hatV ?? 1), { type: "highpass", f0: 8000, to: out });
    // bass: degrees above the chord's root (an octave or two down), null rests, "-" holds
    const b = T.bass[s];
    if (typeof b === "number") { let hold = 1; while (s + hold < 16 && T.bass[s + hold] === "-") hold++; this.pulse(T.bassWave || "triangle", deg(root + b) - 24 + (T.bassOct || 0), t, len * hold * 0.9, T.bassV ?? 0.5, out, 0.5); }
    // lead: eighth notes over 4 bars, repeated (bars 5-8 the same tune over the next chords)
    if (s % 2 === 0) {
      const L = T.lead[bar % T.lead.length], n = L[s / 2];
      if (typeof n === "number") {
        let hold = 1; while (s / 2 + hold < 8 && L[s / 2 + hold] === "-") hold++;
        const f = deg(n) + (hot ? 12 : 0), dur = len * 2 * hold * 0.92, V = T.leadV ?? 0.13;
        if (T.leadWave === "flute" || T.leadWave === "theremin") this.tone("triangle", midi(f), midi(f), t, dur, V * 1.4, { to: out, vibrato: T.leadWave === "flute" ? [5.5, 4] : [3, 12], attack: 0.03 });
        else if (T.leadWave === "bell") { this.tone("sine", midi(f), midi(f), t, dur * 1.6, V * 1.6, { to: out }); this.tone("sine", midi(f + 12), midi(f + 12), t, dur * 0.6, V * 0.5, { to: out }); this.tone("sine", midi(f), midi(f), t + len * 3, dur, V * 0.5, { to: out }); }   // with an echo
        else if (T.leadWave === "saw") this.tone("sawtooth", midi(f), midi(f), t, dur, V * 0.6, { to: out, dist: true });
        else if (T.leadWave === "organ") { this.pulse("square", f, t, dur, V, out, 0.5); this.pulse("square", f + 12, t, dur, V * 0.5, out, 0.25); }
        else this.pulse("square", f, t, dur, V, out, T.duty || 0.25);
      }
    }
    // the colour layer
    const C = T.layer;
    if (C === "harp" && s % 2 === 0) this.pulse("triangle", chord[(s / 2) % 3] + 12 * (1 + ((s / 2) >> 1) % 2), t, len * 1.8, 0.06, out);
    if (C === "strum" && [2, 6, 10, 14].includes(s)) for (const n of chord) this.pulse("square", n - 12, t, len * 0.8, 0.035, out, 0.25);
    if (C === "drone" && s === 0) { this.tone("sawtooth", midi(T.tonic - 24), midi(T.tonic - 24), t, len * 16, 0.05, { to: out }); this.tone("sawtooth", midi(T.tonic - 17), midi(T.tonic - 17), t, len * 16, 0.035, { to: out }); }
    if (C === "glitter" && s % 3 === 0) this.tone("sine", midi(chord[s % 3] + 24), midi(chord[s % 3] + 24), t, len * 2, 0.04, { to: out });
    if (C === "tremolo") this.pulse("square", chord[s % 2 ? 2 : 0] - 12, t, len * 0.6, 0.03, out, 0.125);
    if (C === "bubbles" && Math.random() < 0.12) this.tone("sine", 600 + Math.random() * 900, 1500 + Math.random() * 900, t, 0.06, 0.03, { to: out });
    if (C === "power" && [0, 3, 6, 10].includes(s)) for (const n of [chord[0], chord[0] + 7]) this.tone("sawtooth", midi(n - 12), midi(n - 12), t, len * 1.4, 0.04, { to: out, dist: true });
    if (C === "pad" && s === 0) for (const n of chord) this.tone("triangle", midi(n - 12), midi(n - 12), t, len * 15, 0.05, { to: out, attack: 0.2 });
    if ((this.danger.me > 0.66) && (s === 0 || s === 8)) { this.pulse("square", 91, t, len * 3, 0.05, out, 0.5); this.pulse("square", 90, t + len * 3, len * 3, 0.05, out, 0.5); }
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

// ---- The biome themes (Addendum K: each module's fights get their own music,
// different from the boss). Melodies in scale degrees (0 = the tonic, 7 = an
// octave up), "-" holds, null rests; 4 bars repeated over an 8-bar progression
// of chord roots (scale degrees). Bass: degrees above each chord's root per 16th.
const _ = null, H = "-";
const SCALES = { dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], phrygDom: [0, 1, 4, 5, 7, 8, 10], minor: [0, 2, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], phrygian: [0, 1, 3, 5, 7, 8, 10] };
const THEMES = {
  // a hushed, mysterious forest: a dorian flute over a harp, soft shaker
  forest: { bpm: 108, tonic: 64, scale: SCALES.dorian, prog: [0, 0, 6, 6, 3, 3, 0, 4], leadWave: "flute", layer: "harp",
    lead: [[4, H, 3, 2, 0, H, _, _], [2, H, 3, 4, 6, H, 4, H], [5, H, 4, 3, 2, H, 0, H], [1, H, 2, 3, 4, H, H, _]],
    bass: [0, _, _, 4, _, _, 0, _, 0, _, _, 4, _, _, 2, _], drums: { kick: [0, 10], snare: [8], snareV: 0.2, hat: 2, hatV: 0.6 } },
  // the overgrown ruins: a bright, bouncy adventure march
  grassland: { bpm: 132, tonic: 67, scale: SCALES.major, prog: [0, 4, 5, 3, 0, 4, 3, 4], duty: 0.25, layer: "strum",
    lead: [[4, _, 4, 5, 7, H, 4, _], [5, H, 4, 2, 4, H, H, _], [2, _, 2, 4, 5, H, 4, 2], [1, H, 2, 4, 0, H, H, _]],
    bass: [0, _, 4, _, 0, _, 4, _, 0, _, 4, _, 2, _, 4, _], drums: { kick: [0, 8], kick2: [6, 14], snare: [4, 12], hat: 2 } },
  // the bone dunes: a snake-charmer melody over a drone and hand drums
  desert: { bpm: 100, tonic: 62, scale: SCALES.phrygDom, prog: [0, 0, 1, 0, 6, 6, 1, 0], duty: 0.125, layer: "drone", leadV: 0.12,
    lead: [[7, 8, 7, 6, 7, H, _, _], [5, 6, 5, 4, 5, H, 4, H], [4, 5, 4, 2, 1, H, 2, H], [1, H, 2, 1, 0, H, H, _]],
    bass: [0, _, _, 0, _, _, 0, _, _, _, 0, _, _, _, _, _], drums: { kick: [0, 7, 10], snare: [12], snareF: 900, tom: [3, 6, 11, 14] } },
  // frostbite fields: slow, echoing bells over held roots and glitter
  ice: { bpm: 88, tonic: 66, scale: SCALES.minor, prog: [0, 0, 5, 5, 3, 3, 4, 4], leadWave: "bell", layer: "glitter", leadV: 0.11,
    lead: [[4, H, H, 3, 2, H, H, _], [0, H, 2, H, 3, H, H, _], [7, H, 6, H, 4, H, 2, H], [3, H, H, 2, 1, H, H, _]],
    bass: [0, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H], drums: { kick: [0], snare: [8], snareV: 0.15, snareLen: 0.05, hat: 4, hatV: 0.5 } },
  // wreck beach: fast surf rock with a tremolo-picked guitar
  beach: { bpm: 144, tonic: 69, scale: SCALES.mixo, prog: [0, 0, 6, 6, 3, 3, 0, 4], duty: 0.5, layer: "tremolo", leadV: 0.1,
    lead: [[0, _, 0, 2, 4, H, 2, 0], [6, H, 4, H, 2, H, _, _], [3, _, 3, 4, 5, H, 4, 3], [4, H, H, 2, 0, H, _, _]],
    bass: [0, _, 0, _, 0, _, 0, _, 4, _, 4, _, 6, _, 6, _], drums: { kick: [0, 6, 8], snare: [4, 12], hat: 1, hatV: 0.7 } },
  // the witchmire: a swung, lurching theremin waltz with a tuba bass and bubbles
  swamp: { bpm: 84, tonic: 60, scale: SCALES.harmonic, prog: [0, 0, 3, 3, 5, 4, 0, 4], leadWave: "theremin", layer: "bubbles", swing: 0.6, bassOct: -12, bassV: 0.6,
    lead: [[4, H, 3, 2, 3, H, _, _], [2, H, 0, H, -1, H, 0, _], [5, H, 4, 3, 4, H, 2, H], [3, H, 2, H, 0, H, H, _]],
    bass: [0, _, _, _, _, _, _, _, 4, _, _, _, 2, _, 3, _], drums: { kick: [0], snare: [8], snareV: 0.18, block: [6, 14] } },
  // the scorched wastes: distorted, driving phrygian
  wasteland: { bpm: 150, tonic: 59, scale: SCALES.phrygian, prog: [0, 0, 1, 0, 5, 5, 1, 6], leadWave: "saw", layer: "power", bassWave: "sawtooth", bassV: 0.22,
    lead: [[0, H, 1, 0, _, 3, H, 1], [0, H, H, _, 4, 3, 1, 0], [5, H, 4, 3, 4, H, 1, H], [3, 1, 0, H, H, _, _, _]],
    bass: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 1], drums: { kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], hat: 1, hatV: 0.6 } },
  // the fallen keep: a gothic organ march with snare rolls
  castle: { bpm: 116, tonic: 62, scale: SCALES.minor, prog: [0, 0, 5, 5, 2, 2, 4, 4], leadWave: "organ", layer: "pad", leadV: 0.09,
    lead: [[4, H, H, 5, 4, H, 3, H], [2, H, H, 3, 4, H, H, _], [7, H, 6, H, 5, H, 4, H], [5, H, 4, H, 3, H, H, _]],
    bass: [0, _, _, _, 0, _, _, _, 4, _, _, _, 0, _, _, _], drums: { kick: [0, 8], snare: [4, 6, 12, 14], snareV: 0.3, snareLen: 0.06 } },
};

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
  // ---- small enemies (Addendum K) ----
  // a bowstring: a short plucked twang falling in pitch, and the arrow's hiss
  twang(t) { this.tone("triangle", 420, 180, t, 0.14, 0.22, { glide: 0.1 }); this.tone("square", 840, 300, t, 0.05, 0.05); this.noise(t + 0.02, 0.18, 0.12, { type: "highpass", f0: 3000, f1: 6000 }); },
  // a gunshot: a hard crack, a short body and a little room
  gunshot(t, k) { this.noise(t, 0.05, 0.7 * k, { type: "highpass", f0: 1800, dist: true }); this.noise(t, 0.22, 0.5 * k, { type: "lowpass", f0: 2400, f1: 200, room: 0.35 }); this.tone("sine", 160, 50, t, 0.16, 0.4); },
  // a beast's growl: a low rough saw buzz that rises and falls
  growl(t, k) { this.tone("sawtooth", 70, 95, t, 0.6, 0.18 * k, { vibrato: [26, 18], glide: 0.3 }); this.noise(t, 0.6, 0.18 * k, { type: "bandpass", f0: 260, f1: 400, q: 4 }); },
  // a snake's hiss
  hiss(t) { this.noise(t, 0.5, 0.25, { type: "highpass", f0: 4500, f1: 3200, attack: 0.05 }); },
  // something wet landing
  squelch(t) { this.noise(t, 0.14, 0.4, { type: "lowpass", f0: 900, f1: 180, q: 6 }); this.tone("sine", 260, 90, t, 0.12, 0.2); },
  // a spell: a bright rising chime with a shimmer
  magic(t, k) { [0, 0.05, 0.1].forEach((d, i) => this.tone("triangle", 660 * (1 + i * 0.5), 1320 * (1 + i * 0.5), t + d, 0.25, 0.08 * k, { room: 0.5 })); this.noise(t, 0.4, 0.08, { type: "highpass", f0: 6000, room: 0.5 }); },
  // wings buzzing (a wasp)
  wings(t, k, o) { const d = (o.ms || 600) / 1000; this.tone("sawtooth", 180, 200, t, d, 0.06 * k, { vibrato: [40, 30] }); this.noise(t, d, 0.06 * k, { type: "bandpass", f0: 900, q: 5 }); },
  bite(t) { this.noise(t, 0.08, 0.4, { type: "bandpass", f0: 1200, q: 3, dist: true }); this.tone("square", 300, 120, t, 0.06, 0.1); },
  // Digital crackle: tiny bit-flip blips (no noise bursts; the old version stacked into a clap, Isaac 2026-10-21).
  glitch(t) {
    for (let i = 0; i < 5; i++) { const f = 1800 + Math.random() * 4200; this.tone("square", f, f * (0.7 + Math.random() * 0.6), t + i * 0.014 + Math.random() * 0.01, 0.012, 0.035); }
    this.tone("sine", 120 + Math.random() * 60, 60, t, 0.05, 0.06);
  },
  // A stream of data: rapid random bleeps in a narrow band, like a modem screaming.
  dataStream(t, k, o) {
    const d = (o.ms || 1200) / 1000;
    for (let x = 0; x < d; x += 0.022) { const f = [880, 1320, 1760, 2640, 3520][Math.floor(Math.random() * 5)] * (0.98 + Math.random() * 0.04); this.tone("square", f, f, t + x, 0.018, 0.028 * k * (0.6 + 0.4 * Math.sin(x * 20))); }
    this.tone("sawtooth", 55, 52, t, d, 0.08 * k, { vibrato: [11, 3], attack: 0.1 });
  },
  // An error box popping up: a two-note "dong".
  errorPop(t, k) {
    this.tone("sine", 880, 880, t, 0.12, 0.12 * k, { room: 0.3 });
    this.tone("sine", 660, 660, t + 0.09, 0.22, 0.12 * k, { room: 0.3 });
    this.tone("square", 220, 220, t, 0.05, 0.03 * k);
  },
  // A target lock: three quick rising beeps, then a held tone.
  lockOn(t, k) {
    [1400, 1700, 2000].forEach((f, i) => this.tone("square", f, f, t + i * 0.055, 0.035, 0.05 * k));
    this.tone("square", 2400, 2400, t + 0.17, 0.12, 0.05 * k);
  },
  // The claw slam: a sub-bass blow, a metal clang, crushed concrete, and a long rolling tail.
  slamImpact(t, k) {
    this.tone("sine", 70, 22, t, 1.4, 1.0 * k, { room: 0.4 });
    this.tone("sine", 140, 40, t, 0.35, 0.6 * k);
    this.noise(t, 0.5, 0.8 * k, { type: "lowpass", f0: 2400, f1: 120, dist: true, room: 0.5 });
    [[233, 0.25], [311, 0.2], [466, 0.12], [587, 0.08]].forEach(([f, a]) => this.tone("triangle", f, f * 0.98, t, 0.9, a * k, { room: 0.6 }));   // the clang
    for (let i = 0; i < 10; i++) this.noise(t + 0.03 + Math.random() * 0.35, 0.05, 0.25 * k, { type: "bandpass", f0: 400 + Math.random() * 1600, q: 2 });   // concrete
    this.noise(t + 0.1, 1.6, 0.35 * k, { type: "lowpass", f0: 400, f1: 80, room: 0.5, attack: 0.15 });   // the rumble rolling away
  },
  // Rock slabs bursting up out of the floor.
  rubble(t, k) {
    this.tone("sine", 110, 45, t, 0.25, 0.4 * k);
    for (let i = 0; i < 4; i++) this.noise(t + i * 0.02, 0.08, 0.3 * k, { type: "bandpass", f0: 500 + Math.random() * 1200, q: 1.5 });
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
  // ---- NOVA's dark space magic (Isaac 2026-10-21: windy, ghastly, whispering) ----
  // A cold wind howling through the void: whistling noise sweeping up and down.
  ghostWind(t, k, o) {
    const d = (o.ms || 1500) / 1000;
    this.noise(t, d, 0.22 * k, { type: "bandpass", f0: 260, f1: 760, q: 7, attack: d * 0.3, room: 0.6 });
    this.noise(t + d * 0.2, d * 0.8, 0.16 * k, { type: "bandpass", f0: 900, f1: 340, q: 9, attack: d * 0.2, room: 0.6 });
    this.noise(t, d, 0.12 * k, { type: "lowpass", f0: 260, f1: 160, attack: d * 0.25 });
  },
  // Many voices whispering and chattering: short breathy bursts shaped like vowels.
  whispers(t, k, o) {
    const d = (o.ms || 2000) / 1000, V = [[300, 870], [400, 2000], [700, 1200], [500, 1000], [350, 2300], [600, 1700]];
    for (let x = 0; x < d; x += 0.035 + Math.random() * 0.06) {
      const [f1, f2] = V[Math.floor(Math.random() * V.length)], len = 0.04 + Math.random() * 0.12, pk = (0.04 + Math.random() * 0.06) * k;
      this.noise(t + x, len, pk, { type: "bandpass", f0: f1 * (0.9 + Math.random() * 0.3), q: 9, attack: 0.01, room: 0.5 });
      this.noise(t + x, len, pk * 0.8, { type: "bandpass", f0: f2 * (0.9 + Math.random() * 0.3), q: 9, attack: 0.01, room: 0.5 });
      if (Math.random() < 0.12) this.noise(t + x, 0.12, pk * 0.6, { type: "highpass", f0: 4500, attack: 0.03 });   // a hiss of "sss"
    }
    SFX.ghostWail.call(this, t + d * 0.3, k * 0.5, { ms: d * 700 });
  },
  // A ghost's wail: a wavering voice sliding up and down.
  ghostWail(t, k, o) {
    const d = (o.ms || 1200) / 1000;
    this.tone("triangle", 380, 640, t, d * 0.55, 0.06 * k, { glide: d * 0.4, vibrato: [6, 14], attack: 0.15, room: 0.7 });
    this.tone("triangle", 640, 300, t + d * 0.45, d * 0.55, 0.05 * k, { vibrato: [7, 18], attack: 0.05, room: 0.7 });
    this.noise(t, d, 0.05 * k, { type: "bandpass", f0: 900, f1: 600, q: 3, attack: 0.2, room: 0.6 });
  },
  // A wraith flying past: a falling whoosh with a short shriek.
  ghostFly(t, k) {
    this.noise(t, 0.5, 0.2 * k, { type: "bandpass", f0: 2800, f1: 380, q: 4, room: 0.4 });
    this.tone("sine", 900, 320, t, 0.4, 0.05 * k, { vibrato: [9, 25], room: 0.6 });
  },
  // A low hum for an open portal.
  voidHum(t, k, o) {
    const d = (o.ms || 1500) / 1000;
    this.tone("sine", 48, 44, t, d, 0.22 * k, { attack: 0.2, vibrato: [3, 2], room: 0.4 });
    this.tone("sine", 73, 70, t, d, 0.1 * k, { attack: 0.3, room: 0.4 });
  },
  // Chains: rattling links, and one snapping.
  chainRattle(t, k) {
    for (let i = 0; i < 9; i++) {
      const x = t + i * 0.045 + Math.random() * 0.02, f = 2200 + Math.random() * 1400;
      this.tone("triangle", f, f, x, 0.05, 0.05 * k, { attack: 0.001 });
      this.tone("sine", f * 1.6, f * 1.6, x, 0.08, 0.03 * k, { attack: 0.001, room: 0.3 });
    }
  },
  chainSnap(t, k) {
    this.tone("square", 1900, 500, t, 0.09, 0.08 * k, { attack: 0.001 });
    this.noise(t, 0.08, 0.3 * k, { type: "highpass", f0: 3000 });
    this.tone("triangle", 3100, 3100, t + 0.02, 0.25, 0.05 * k, { room: 0.4 });
  },
  // GOLEM's drones and their little lasers; his grappling hook.
  droneBuzz(t, k, o) {
    const d = (o.ms || 800) / 1000;
    this.tone("sawtooth", 360, 420, t, d, 0.03 * k, { vibrato: [28, 22], attack: 0.05 });
  },
  miniLaser(t, k) {
    this.tone("sine", 2600, 900, t, 0.14, 0.1 * k, { attack: 0.002 });
    this.tone("square", 1300, 1300, t, 0.06, 0.03 * k);
  },
  grapple(t, k) {
    this.noise(t, 0.3, 0.25 * k, { type: "bandpass", f0: 1200, f1: 3500, q: 2 });
    this.tone("sine", 220, 70, t + 0.25, 0.3, 0.4 * k, { room: 0.3 });
    this.tone("square", 1700, 700, t + 0.25, 0.07, 0.07 * k);
  },
  cableReel(t, k, o) {
    const d = (o.ms || 700) / 1000;
    this.tone("sawtooth", 70, 260, t, d, 0.06 * k, { vibrato: [40, 10] });
    this.noise(t, d, 0.1 * k, { type: "bandpass", f0: 1500, f1: 3500, q: 3 });
  },
  // A black hole: a sub-bass that drags lower, with wind being sucked in.
  bhRumble(t, k, o) {
    const d = (o.ms || 3000) / 1000;
    this.tone("sine", 42, 26, t, d, 0.45 * k, { attack: 0.5, room: 0.3 });
    this.noise(t, d, 0.25 * k, { type: "lowpass", f0: 300, f1: 120, attack: 0.4, dist: true });
    this.noise(t, d, 0.15 * k, { type: "bandpass", f0: 3000, f1: 300, q: 5, attack: 0.6, room: 0.5 });
  },
  // A dark choir swelling as power gathers (Eclipse Lance).
  darkChoir(t, k, o) {
    const d = (o.ms || 1500) / 1000;
    [147, 175, 220, 294].forEach((f, i) => this.tone("triangle", f, f * 1.06, t + i * 0.05, d, 0.04 * k, { attack: d * 0.6, vibrato: [5, 4], room: 0.8 }));
    SFX.whispers.call(this, t, k * 0.6, { ms: d * 1000 });
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
