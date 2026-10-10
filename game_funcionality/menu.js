// DOM menus: title → setup (one screen, Smash-style rows) → fight → result.
import { CHARACTERS, LOCKED } from './characters/index.js?v=48d769e-1791643329';
import { STAGES } from './maps/index.js?v=48d769e-1791643329';
import { MODES, SPEEDS, DEFAULT_SPEED } from './config.js?v=48d769e-1791643329';
import { BINDING_TEXT } from './input.js?v=48d769e-1791643329';

const $menu = () => document.getElementById('menu');

export class Menu {
  constructor(game) {
    this.game = game;
    this.cfg = { mode: MODES.STOCK, p2cpu: true, cpuLevel: 2, p1: 0, p2: 2, stage: 0, speed: DEFAULT_SPEED };
    this.row = 0;
    game.input.p2cpu = this.cfg.p2cpu;
    this.rows = [
      { label: 'Rules', get: () => this.cfg.mode === MODES.STOCK ? 'Stock (3 lives)' : 'Stamina (150 HP)', set: d => this.cfg.mode = this.cfg.mode === MODES.STOCK ? MODES.STAMINA : MODES.STOCK },
      // Stretches time for the whole fight. Every move keeps its frame data, so
      // nothing becomes stronger or weaker — there is just more time to see it.
      { label: 'Game speed', get: () => SPEEDS[this.cfg.speed].label, set: d => this.cfg.speed = Math.max(0, Math.min(SPEEDS.length - 1, this.cfg.speed + d)) },
      { label: 'Player 2', get: () => this.cfg.p2cpu ? `CPU · level ${this.cfg.cpuLevel}` : 'Human', set: d => { if (!this.cfg.p2cpu) this.cfg.p2cpu = true; else if (this.cfg.cpuLevel + d >= 1 && this.cfg.cpuLevel + d <= 5) this.cfg.cpuLevel += d; else this.cfg.p2cpu = false; this.game.input.p2cpu = this.cfg.p2cpu; } },
      { label: 'P1 controller', get: () => this.game.input.assignName(0), set: d => this.game.input.cycleAssign(0, d) },
      { label: 'P2 controller', get: () => this.cfg.p2cpu ? '—' : this.game.input.assignName(1), set: d => { if (!this.cfg.p2cpu) this.game.input.cycleAssign(1, d); } },
      { label: 'P1 fighter', get: () => CHARACTERS[this.cfg.p1].name, set: d => this.cfg.p1 = (this.cfg.p1 + d + CHARACTERS.length) % CHARACTERS.length },
      { label: 'P2 fighter', get: () => CHARACTERS[this.cfg.p2].name, set: d => this.cfg.p2 = (this.cfg.p2 + d + CHARACTERS.length) % CHARACTERS.length },
      { label: 'Stage', get: () => STAGES[this.cfg.stage].name, set: d => this.cfg.stage = (this.cfg.stage + d + STAGES.length) % STAGES.length },
      // Auto watches the frame rate and picks for itself; the fight runs at the
      // same speed either way, so this only changes how pretty it looks.
      { label: 'Graphics', get: () => this.game.quality.name(), set: d => this.game.quality.cycle(d) },
      { label: 'FIGHT!', go: true },
      { label: 'PLAY ONLINE', online: true },
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
    const pads = (input?.gpNames || []).length ? `🎮 connected: ${input.gpNames.join(', ')}` : '🎮 no controller — plug one in and press a button (without one, two humans share the keyboard)';
    const rows = this.rows.map((r, i) => r.go
      ? `<div class="row go ${i === this.row ? 'sel' : ''}">▶ FIGHT! ◀</div>`
      : r.online ? `<div class="row go online ${i === this.row ? 'sel' : ''}">🌐 PLAY ONLINE</div>`
      : `<div class="row ${i === this.row ? 'sel' : ''}"><span>${r.label}</span><span class="val">◀ ${r.get()} ▶</span></div>`).join('');
    const roster = [...c.map(x => `<span>${x.name}</span>`), ...LOCKED.map(n => `<span class="locked">${n}</span>`)].join('');
    $menu().innerHTML = `<div class="setup"><h2>MATCH SETUP</h2>${rows}
      <div class="help"><b>${c[cfg.p1].name}</b>: ${c[cfg.p1].tagline} · B: ${c[cfg.p1].special.name} · ↑B: ${c[cfg.p1].upSpecial.name}<br>
      <b>${c[cfg.p2].name}</b>: ${c[cfg.p2].tagline} · B: ${c[cfg.p2].special.name} · ↑B: ${c[cfg.p2].upSpecial.name}</div>
      <div class="roster">${roster}</div>
      <div class="help">W/S or ↑↓ pick a row · A/D or ←→ change · Enter / A to fight · Esc / Start pauses a match<br>
      Too frantic? <b>Game speed</b> down. Running slowly? <b>Graphics</b> to Low. Neither changes how the moves work.<br>${BINDING_TEXT[0]}<br>${input.kbShared() ? BINDING_TEXT[1] + '<br>' : ''}${BINDING_TEXT[2]}<br>${pads}</div></div>`;
  }
  result(text, online = false) { $menu().innerHTML = `<div class="result">${text}</div><div class="press">ENTER / A · rematch &nbsp;&nbsp; ESC / B · ${online ? 'back to the room' : 'setup'}</div>`; }
  resultOnline(text) { $menu().innerHTML = `<div class="result"></div><div class="press">Waiting for the host… &nbsp;&nbsp; ESC / B · leave the room</div>`; $menu().firstChild.textContent = text; }
  pauseOnline() { $menu().innerHTML = `<div class="pause small">ONLINE MATCH</div><div class="press">The fight keeps going! &nbsp; Q / B · leave &nbsp;&nbsp; ESC / START · back to the fight</div>`; }
  pause() { $menu().innerHTML = `<div class="pause">PAUSED</div><div class="press">ESC / START · resume &nbsp;&nbsp; Q / B · quit to setup</div>`; }
  clear() { $menu().innerHTML = ''; }

  // returns true when the user hits FIGHT
  handleSetupKey(input) {
    const { up, down, left, right, confirm } = input.menu;
    if (up) this.row = (this.row + this.rows.length - 1) % this.rows.length;
    if (down) this.row = (this.row + 1) % this.rows.length;
    const r = this.rows[this.row];
    if (!r.go && !r.online && (left || right)) r.set(left ? -1 : 1);
    if (r.online && confirm) return 'online';
    if (confirm || (r.go && input.wasPressed('Space'))) return true;
    const pads = input.gpNames.join('|') + input.assign.join();
    if (up || down || left || right || pads !== this.lastPads) { this.lastPads = pads; this.setup(input); }
    return false;
  }
}
