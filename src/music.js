// Background music: one looping track at a time, started from a chosen point,
// with a fade-in and a "duck" so a voice-over can sit on top.
export class Music {
  constructor() { this.el = null; this.volume = 0.5; this.duck = 1; this.fade = 1; }

  // Returns a promise: true if playing, false if the browser wants a gesture first.
  async play(src, { volume = 0.5, offset = 0, fadeIn = 0 } = {}) {
    if (this.el && this.el.dataset.src === src && !this.el.paused) return true;
    this.stop();
    const el = new Audio(src); el.loop = true; el.dataset.src = src; el.preload = 'auto';
    this.el = el; this.volume = volume; this.fade = fadeIn ? 0 : 1; this.fadeRate = fadeIn ? 1 / (fadeIn * 60) : 1;
    el.currentTime = offset; el.volume = 0;
    try { await el.play(); this.apply(); return true; } catch { this.el = null; return false; }
  }
  stop() { if (this.el) { this.el.pause(); this.el = null; } }
  get playing() { return !!this.el && !this.el.paused; }
  time() { return this.el ? this.el.currentTime : 0; }
  // every frame: ease the duck, advance the fade
  update(duckTarget = 1) {
    this.duck += (duckTarget - this.duck) * 0.08;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + this.fadeRate);
    this.apply();
  }
  apply() { if (this.el) this.el.volume = Math.max(0, Math.min(1, this.volume * this.duck * this.fade)); }
}
