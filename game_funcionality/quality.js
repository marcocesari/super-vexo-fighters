// How hard we push the GPU, and the watchdog that decides.
//
// The match always steps 60 times a second (game.js keeps its own clock), so a
// slow machine fights at the *right speed* — it just gets fewer drawn frames.
// This file is the list of things we hand back to win those frames: canvas
// resolution first (by far the biggest), then round-shape detail, ground
// shadows and spark counts.
//
// Levels are tried from the top down. If a level can't hold 60 fps we drop one;
// if a lower level sits comfortably above 58 fps for a while we try going back
// up. Dropping from the same level twice means we stop offering it — that way
// a machine that is merely *borderline* settles instead of flickering between
// two looks forever.
export const LEVELS = ['low', 'medium', 'high'];
export const MODES = ['auto', 'high', 'medium', 'low'];

// density = canvas pixels per CSS pixel (capped by the screen's own ratio).
// aa = antialiasing; it is chosen once at start-up and never changed, because
// switching it rebuilds the WebGL context and the stages' baked scenery with it.
const PRESETS = {
  high:   { density: 2,   sphereU: 12, sphereV: 8, cylSegs: 10, shadows: true,  sparkMul: 1,    trail: 3, motes: 40, aa: true },
  medium: { density: 1,   sphereU: 8,  sphereV: 6, cylSegs: 8,  shadows: true,  sparkMul: 0.6,  trail: 2, motes: 24, aa: true },
  low:    { density: 0.7, sphereU: 6,  sphereV: 4, cylSegs: 5,  shadows: false, sparkMul: 0.35, trail: 1, motes: 12, aa: false },
};

// What the renderer reads. Mutated in place, so every importer sees the change.
export const Q = { ...PRESETS.high, level: 'high' };

// Thresholds in fps, and how long a verdict has to hold (in ms of real time, so
// the watchdog reacts just as quickly on a machine drawing 15 frames a second).
const SLOW = 50, FAST = 58;
const WARM_MS = 1200, SLOW_MS = 800, FAST_MS = 7000;
const KEY = 'svf.quality';

// Chromebooks and school laptops: few cores, little memory. Starting them low
// means the first second looks right instead of lurching.
function guess() {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
  if (cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch {} },
};

export class Quality {
  constructor() {
    this.mode = MODES.includes(store.get()) ? store.get() : 'auto';
    this.fps = 60; this.slowMs = 0; this.fastMs = 0; this.warmMs = 0;
    this.downs = {}; this.ceiling = LEVELS.length - 1;
    this.set(this.mode === 'auto' ? guess() : this.mode);
  }

  set(level) {
    Object.assign(Q, PRESETS[level], { level });
    this.slowMs = this.fastMs = this.warmMs = 0;                 // settle before judging the new look
    if (this.p) this.p.pixelDensity(this.density());
  }
  density() { const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1; return Math.min(dpr, Q.density); }

  // Once, in setup(), before anything is drawn or baked.
  attach(p) { this.p = p; p.setAttributes('antialias', Q.aa); p.pixelDensity(this.density()); }

  // One call per *drawn* frame, with the time since the previous one in ms.
  // The average is smoothed over a quarter of a second of real time rather than
  // a fixed number of frames, so a machine managing only two frames a second is
  // spotted in that quarter second instead of half a minute.
  sample(dtMs) {
    this.fps += (1000 / Math.max(1, dtMs) - this.fps) * Math.min(1, dtMs / 250);
    if (this.mode !== 'auto') return;
    if ((this.warmMs += dtMs) < WARM_MS) return;                 // the first moment is shaders and scenery being built, not real speed
    if (this.fps < SLOW) { this.slowMs += dtMs; this.fastMs = 0; }
    else if (this.fps > FAST) { this.fastMs += dtMs; this.slowMs = 0; }
    else { this.slowMs = this.fastMs = 0; }
    if (this.slowMs >= SLOW_MS) this.stepDown();
    else if (this.fastMs >= FAST_MS) this.stepUp();
  }
  stepDown() {
    const i = LEVELS.indexOf(Q.level);
    if (i === 0) { this.slowMs = 0; return false; }
    this.downs[Q.level] = (this.downs[Q.level] || 0) + 1;
    if (this.downs[Q.level] >= 2) this.ceiling = Math.min(this.ceiling, i - 1);   // this level has failed twice: stop offering it
    this.set(LEVELS[i - 1]);
    return true;
  }
  stepUp() {
    const i = LEVELS.indexOf(Q.level);
    if (i >= this.ceiling) { this.fastMs = 0; return false; }
    this.set(LEVELS[i + 1]);
    return true;
  }

  // Menu row: Auto / High / Medium / Low.
  cycle(d) {
    const i = (MODES.indexOf(this.mode) + d + MODES.length) % MODES.length;
    this.mode = MODES[i]; store.set(this.mode);
    this.downs = {}; this.ceiling = LEVELS.length - 1;
    this.set(this.mode === 'auto' ? guess() : this.mode);
  }
  name() { return this.mode === 'auto' ? `Auto · ${Q.level}` : this.mode[0].toUpperCase() + this.mode.slice(1); }
  label() { return `${Math.round(this.fps)} fps${Q.level === 'high' ? '' : ' · ' + Q.level}`; }
}
