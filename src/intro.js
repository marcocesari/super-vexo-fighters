// The title intro, conducted by the music.
//
// "1-02 - Menu" plays from its very first note. It runs at 137 BPM (0.435 s a
// beat, 1.74 s a bar): a six-second swell, the beat entering at 6.33 s, and
// its first real downbeat at 7.20 s. Marco's voice-over
// (assets/title_voice.wav, cut so its words sit two beats and one bar apart)
// comes in 1 s after the music starts:
//
//   music time  1.00  SU-PER     slides in from the left
//               1.87  VEXO       slides in from the right       (+2 beats)
//               2.74  FIGH-TERS  flies in from the screen       (+1 bar)
//               4.48  PRESS (A) TO START drops in, one letter per 16th note,
//                     filling exactly one bar and finishing on the track's
//                     first downbeat area (7.20 s); then it bobs in time with the bars
//
// Everything is timed off the music's own clock so nothing can drift. Without
// sound (blocked or missing), a plain timer runs the same schedule.
const BPM = 137, BEAT = 60 / BPM, BAR = BEAT * 4;
export const MUSIC_START = 0;                // the track is never cut: it starts from the top
const VOICE_IN = 1.0;                        // the voice starts this long after the music
const VOICE_SUPER = 0.08;                    // where "Su-per" starts inside the voice clip
export const CUES = {
  super: VOICE_IN,
  vexo: VOICE_IN + 2 * BEAT,
  fighters: VOICE_IN + BAR,
  press: VOICE_IN + 2 * BAR,
};
// Each word starts moving this much *before* its cue, so it lands on the voice
// instead of arriving after it (a slide takes ~0.35 s; the zoom ~0.6 s to read).
const LEAD = { super: 0.28, vexo: 0.36, fighters: 0.45, press: 0 };
export const LETTER_STEP = BEAT / 4, BOB_PERIOD = BAR;
const VOICE_AT = CUES.super - VOICE_SUPER;
const VOICE_END = VOICE_AT + 3.1;

export class Intro {
  constructor(music) {
    this.music = music;
    this.voice = new Audio('assets/title_voice.wav'); this.voice.preload = 'auto';
    this.started = false; this.done = new Set(); this.voiceStarted = false;
  }

  // Start the show. Resolves true if sound is allowed, false if the browser wants a click first.
  async start() {
    this.done.clear(); this.voiceStarted = false; this.started = true; this.clockStart = performance.now();
    const ok = await this.music.play('assets/menu_music.mp3', { volume: 0.55, offset: MUSIC_START, fadeIn: 0 });
    this.useMusicClock = ok;
    return ok;
  }
  stop() { this.started = false; try { this.voice.pause(); } catch {} }

  // Position in the timeline, in music seconds.
  time() {
    if (this.useMusicClock && this.music.playing) return this.music.time();
    return MUSIC_START + (performance.now() - this.clockStart) / 1000;
  }
  // 0..1: how far into the build-up we are (drives the cover's brightness)
  get build() { return Math.max(0, Math.min(1, (this.time() - MUSIC_START) / (CUES.super - MUSIC_START))); }
  get voiceOn() { const t = this.time(); return t >= VOICE_AT - 0.2 && t < VOICE_END; }

  // Called every frame while the title is up.
  tick(root) {
    if (!this.started) return;
    const t = this.time();
    if (this.useMusicClock && !this.voiceStarted && t >= VOICE_AT - 0.05) {
      this.voiceStarted = true;
      this.voice.currentTime = Math.max(0, t - VOICE_AT);      // land exactly on the beat even if this frame was late
      this.voice.play().catch(() => {});
    }
    for (const k in CUES) {
      if (t >= CUES[k] - LEAD[k] && !this.done.has(k)) { this.done.add(k); root?.querySelector(`[data-word="${k}"]`)?.classList.add('in'); }
    }
    this.music.update(1);                       // no ducking: the music stays level under the voice
  }
  get finished() { return this.done.size === Object.keys(CUES).length; }
}
