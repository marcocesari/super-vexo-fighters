// DOM menus: title → setup (one screen, Smash-style rows) → fight → result.
import { CHARACTERS, LOCKED } from './characters/index.js';
import { STAGES } from './stages/index.js';
import { MODES } from './config.js';
import { BINDING_TEXT } from './input.js';

const $menu = () => document.getElementById('menu');

export class Menu {
  constructor(game) {
    this.game = game;
    this.cfg = { mode: MODES.STOCK, p2cpu: true, cpuLevel: 2, p1: 0, p2: 2, stage: 0 };
    this.row = 0;
    this.rows = [
      { label: 'Rules', get: () => this.cfg.mode === MODES.STOCK ? 'Stock (3 lives)' : 'Stamina (150 HP)', set: d => this.cfg.mode = this.cfg.mode === MODES.STOCK ? MODES.STAMINA : MODES.STOCK },
      { label: 'Player 2', get: () => this.cfg.p2cpu ? `CPU · level ${this.cfg.cpuLevel}` : 'Human', set: d => { if (!this.cfg.p2cpu) this.cfg.p2cpu = true; else if (this.cfg.cpuLevel + d >= 1 && this.cfg.cpuLevel + d <= 5) this.cfg.cpuLevel += d; else this.cfg.p2cpu = false; } },
      { label: 'P1 controller', get: () => this.game.input.assignName(0), set: d => this.game.input.cycleAssign(0, d) },
      { label: 'P2 controller', get: () => this.cfg.p2cpu ? '—' : this.game.input.assignName(1), set: d => { if (!this.cfg.p2cpu) this.game.input.cycleAssign(1, d); } },
      { label: 'P1 fighter', get: () => CHARACTERS[this.cfg.p1].name, set: d => this.cfg.p1 = (this.cfg.p1 + d + CHARACTERS.length) % CHARACTERS.length },
      { label: 'P2 fighter', get: () => CHARACTERS[this.cfg.p2].name, set: d => this.cfg.p2 = (this.cfg.p2 + d + CHARACTERS.length) % CHARACTERS.length },
      { label: 'Stage', get: () => STAGES[this.cfg.stage].name, set: d => this.cfg.stage = (this.cfg.stage + d + STAGES.length) % STAGES.length },
      { label: 'FIGHT!', go: true },
    ];
  }

  title() {
    const words = 'PRESS A TO START';
    const letters = words.split('').map((ch, i) => (ch === 'A' && words[i - 1] === ' ' && words[i + 1] === ' ')   // only the lone "A" is the button
      ? `<span class="abtn wave" style="--i:${i}"><svg viewBox="0 0 40 40" aria-label="A"><circle cx="20" cy="20" r="17"/><text x="20" y="20.5" text-anchor="middle" dominant-baseline="central">A</text></svg></span>`
      : `<span class="wave" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    $menu().innerHTML = `<div class="cover">
      <h1 class="title big">
        <span class="word from-left" data-word="super">SUPER</span> <span class="word from-right" data-word="vexo">VEXO</span><br>
        <span class="word from-front" data-word="fighters">FIGHTERS</span>
      </h1>
      <div class="press start" data-word="press">${letters}</div></div>`;
  }
  setup(input) {
    const c = CHARACTERS, cfg = this.cfg;
    const pads = (input?.gpNames || []).length ? `🎮 connected: ${input.gpNames.join(', ')}` : '🎮 no controller — plug one in and press a button; the keyboard always works for both players';
    const rows = this.rows.map((r, i) => r.go
      ? `<div class="row go ${i === this.row ? 'sel' : ''}">▶ FIGHT! ◀</div>`
      : `<div class="row ${i === this.row ? 'sel' : ''}"><span>${r.label}</span><span class="val">◀ ${r.get()} ▶</span></div>`).join('');
    const roster = [...c.map(x => `<span>${x.name}</span>`), ...LOCKED.map(n => `<span class="locked">${n}</span>`)].join('');
    $menu().innerHTML = `<div class="setup"><h2>MATCH SETUP</h2>${rows}
      <div class="help"><b>${c[cfg.p1].name}</b>: ${c[cfg.p1].tagline} · B: ${c[cfg.p1].special.name} · ↑B: ${c[cfg.p1].upSpecial.name}<br>
      <b>${c[cfg.p2].name}</b>: ${c[cfg.p2].tagline} · B: ${c[cfg.p2].special.name} · ↑B: ${c[cfg.p2].upSpecial.name}</div>
      <div class="roster">${roster}</div>
      <div class="help">↑↓ pick a row · ←→ change · Enter / A to fight · Esc / Start pauses a match<br>${BINDING_TEXT[0]}<br>${BINDING_TEXT[1]}<br>${BINDING_TEXT[2]}<br>${pads}</div></div>`;
  }
  splash() { $menu().innerHTML = `<div class="splash"><div class="title small">SUPER VEXO FIGHTERS</div><div class="press">CLICK OR PRESS ANY KEY</div></div>`; }
  result(text) { $menu().innerHTML = `<div class="result">${text}</div><div class="press">ENTER / A · rematch &nbsp;&nbsp; ESC / B · setup</div>`; }
  pause() { $menu().innerHTML = `<div class="pause">PAUSED</div><div class="press">ESC / START · resume &nbsp;&nbsp; Q / B · quit to setup</div>`; }
  clear() { $menu().innerHTML = ''; }

  // returns true when the user hits FIGHT
  handleSetupKey(input) {
    const { up, down, left, right, confirm } = input.menu;
    if (up) this.row = (this.row + this.rows.length - 1) % this.rows.length;
    if (down) this.row = (this.row + 1) % this.rows.length;
    const r = this.rows[this.row];
    if (!r.go && (left || right)) r.set(left ? -1 : 1);
    if (confirm || (r.go && (input.wasPressed('KeyF') || input.wasPressed('KeyK') || input.wasPressed('Space')))) return true;
    const pads = input.gpNames.join('|') + input.assign.join();
    if (up || down || left || right || pads !== this.lastPads) { this.lastPads = pads; this.setup(input); }
    return false;
  }
}
