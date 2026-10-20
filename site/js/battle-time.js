// Shared battle time. Battle effects use it for hit-stop (a few frozen frames
// on impact) and slow motion; DOT's and the boss's animation loops ask it how
// much time passed. Outside a battle it changes nothing.
export const battleTime = {
  freezeUntil: 0,
  scale: 1,
  scaleUntil: 0,
  // Animation time for a frame that took `ms` of real time.
  step(now, ms) {
    if (now < this.freezeUntil) return 0;
    if (now > this.scaleUntil) this.scale = 1;
    return ms * this.scale;
  },
  hitstop(ms) { this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms); },
  slowmo(scale, ms) { this.scale = scale; this.scaleUntil = performance.now() + ms; },
};
