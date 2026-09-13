// Sound effects, all in assets/audio/. A landed punch is Marco's game_hit.mp3;
// shields, bells and KOs are from Kenney's "Impact Sounds" pack (CC0, see
// assets/audio/LICENSE-kenney-impact-sounds.txt). Each family has one or more
// variants; one is picked at random and nudged in pitch so hits don't sound
// like a stuck record.
const FAMILIES = { game_hit: 'mp3', hit_light: 5, hit_medium: 5, hit_heavy: 5, shield: 3, shield_break: 1, bell: 3, ko: 2 };
const ONSET = { game_hit: 0.14 };                                // seconds of silence to skip so the punch lands on the frame

export class Sfx {
  constructor() {
    this.volume = 0.8; this.bank = {};
    for (const name in FAMILIES) {
      const f = FAMILIES[name];                                  // a count means name_0.wav … ; a string is a single name.ext
      const files = typeof f === 'number' ? Array.from({ length: f }, (_, i) => `${name}_${i}.wav`) : [`${name}.${f}`];
      this.bank[name] = files.map(file => { const a = new Audio(`assets/audio/${file}`); a.preload = 'auto'; return a; });
    }
  }
  play(name, { volume = 1, pitch = 1 } = {}) {
    const list = this.bank[name]; if (!list) return;
    const src = list[Math.floor(Math.random() * list.length)];
    const a = src.cloneNode();                                   // a fresh element, so overlapping hits all sound
    a.volume = Math.max(0, Math.min(1, this.volume * volume));
    a.playbackRate = pitch * (0.92 + Math.random() * 0.16); a.preservesPitch = false;
    if (ONSET[name]) a.currentTime = ONSET[name];
    a.play().catch(() => {});
  }
  // A landed hit: Marco's punch sound, a little louder and deeper the harder it
  // was (a tumble-strength blow drops the pitch). Belledon's hits ring on top.
  hit(dmg, tumble, attacker) {
    const heavy = tumble || dmg >= 11, medium = dmg >= 6;
    this.play('game_hit', { volume: heavy ? 1 : medium ? 0.9 : 0.75, pitch: heavy ? 0.85 : medium ? 1 : 1.12 });
    if (attacker?.char?.id === 'belledon') this.play('bell', { volume: 0.7 });
  }
}
