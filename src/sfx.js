// Sound effects. Impact sounds are from Kenney's "Impact Sounds" pack (CC0,
// see assets/sfx/LICENSE-kenney-impact-sounds.txt). Each family has a few
// variants; one is picked at random and nudged in pitch so hits don't sound
// like a stuck record.
const FAMILIES = { hit_light: 5, hit_medium: 5, hit_heavy: 5, shield: 3, shield_break: 1, bell: 3, ko: 2 };

export class Sfx {
  constructor() {
    this.volume = 0.8; this.bank = {};
    for (const name in FAMILIES) {
      this.bank[name] = Array.from({ length: FAMILIES[name] }, (_, i) => { const a = new Audio(`assets/sfx/${name}_${i}.wav`); a.preload = 'auto'; return a; });
    }
  }
  play(name, { volume = 1, pitch = 1 } = {}) {
    const list = this.bank[name]; if (!list) return;
    const src = list[Math.floor(Math.random() * list.length)];
    const a = src.cloneNode();                                   // a fresh element, so overlapping hits all sound
    a.volume = Math.max(0, Math.min(1, this.volume * volume));
    a.playbackRate = pitch * (0.92 + Math.random() * 0.16); a.preservesPitch = false;
    a.play().catch(() => {});
  }
  // A landed hit: pick by how hard it was. Belledon's hits ring.
  hit(dmg, tumble, attacker) {
    if (attacker?.char?.id === 'belledon') return this.play('bell', { volume: 0.9 });
    if (tumble || dmg >= 11) this.play('hit_heavy', { volume: 1 });
    else if (dmg >= 6) this.play('hit_medium', { volume: 0.9 });
    else this.play('hit_light', { volume: 0.8 });
  }
}
