// Keyboard + gamepads → per-player "pad" snapshots.
//
// Keyboard (e.code, so it works on any layout):
//   P1: A D move, W jump, S crouch/drop/fast-fall, F attack, G special, H shield
//   P2: ← → move, ↑ jump, ↓ crouch, K attack, L special, ; shield
//
// Gamepads (Web Gamepad API, standard mapping — Xbox / PlayStation / Switch Pro
// / most USB pads): the first pad plugged in is Player 1, the second Player 2.
// Keyboard and pad for the same player are merged, so either works.
//   left stick / d-pad  move (stick is analog: a gentle push walks, hard over runs)
//   stick up / d-pad up jump (tap jump, like Smash)   X or Y  jump
//   A  attack     B  special     any shoulder / trigger  shield
//   Start  pause / confirm in menus     B  back in menus
export const BINDINGS = [
  { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', attack: 'KeyF', special: 'KeyG', shield: 'KeyH' },
  { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', attack: 'KeyK', special: 'KeyL', shield: 'Semicolon' },
];
export const BINDING_TEXT = [
  'P1: A/D move · W jump · S crouch/fast-fall · F attack · G special · H shield (+dir: roll · +S: spot dodge · in air: air dodge)',
  'P2: ←/→ move · ↑ jump · ↓ crouch/fast-fall · K attack · L special · ; shield',
  '🎮 stick/d-pad move · stick up or X/Y jump · A attack · B special · shoulders shield · Start pause',
];

// Pads whose face buttons come out rotated 180° (their A is where Y should be,
// B where X should be). Matched against the pad's reported id.
const ROTATED_PADS = [/P880/i];
const ROTATE = { 0: 3, 1: 2, 2: 1, 3: 0 };

const DEAD = 0.25, TILT = 0.55;   // stick: below DEAD is nothing, past TILT counts as "up"/"down"/full run
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

export function emptyPad() {
  return { x: 0, left: false, right: false, up: false, down: false, jump: false, attack: false, special: false, shield: false,
           upP: false, downP: false, jumpP: false, attackP: false, specialP: false, shieldP: false };
}

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();     // key codes pressed since the last endFrame()
    this.gpPads = [];             // this frame's gamepad snapshots, in connection order
    this.assign = [0, 1];         // which gamepad (index into gpPads) each player uses; -1 = keyboard only
    this.gpPrev = {};             // last frame's raw state per gamepad index, for edge detection
    this.gpNames = [];
    this.menu = { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, any: false };
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.held.add(e.code); this.pressed.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  // Call once at the start of every frame: reads the gamepads and works out which buttons were just pressed.
  beginFrame() {
    const raw = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(g => g && g.connected) : [];
    this.gpPads = []; this.gpNames = [];
    const m = { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, any: false };
    raw.slice(0, 4).forEach((g, slot) => {
      const rotated = ROTATED_PADS.some(rx => rx.test(g.id));
      const b = i => { if (rotated && i in ROTATE) i = ROTATE[i]; return !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5)); };
      let sx = g.axes[0] || 0, sy = g.axes[1] || 0;
      if (Math.abs(sx) < DEAD) sx = 0; if (Math.abs(sy) < DEAD) sy = 0;
      const now = {
        x: b(BTN.LEFT) ? -1 : b(BTN.RIGHT) ? 1 : sx,
        up: sy < -TILT || b(BTN.UP),                                   // direction (up tilt / up special)
        jump: sy < -TILT || b(BTN.UP) || b(BTN.X) || b(BTN.Y),          // tap-jump on the stick, or the jump buttons
        down: sy > TILT || b(BTN.DOWN),
        attack: b(BTN.A), special: b(BTN.B),
        shield: b(BTN.LB) || b(BTN.RB) || b(BTN.LT) || b(BTN.RT),
        start: b(BTN.START), left: false, right: false,
      };
      now.left = now.x < -DEAD; now.right = now.x > DEAD;
      const prev = this.gpPrev[g.index] || {};
      const edge = k => now[k] && !prev[k];
      const pad = { ...now, upP: edge('up'), downP: edge('down'), jumpP: edge('jump'), attackP: edge('attack'), specialP: edge('special'), shieldP: edge('shield') };
      this.gpPads[slot] = pad; this.gpNames[slot] = g.id.replace(/\(.*\)/, '').trim() + (rotated ? ' (buttons rotated)' : '');
      m.up ||= edge('jump'); m.down ||= edge('down'); m.left ||= edge('left'); m.right ||= edge('right');
      m.confirm ||= edge('attack') || edge('start'); m.back ||= edge('special'); m.start ||= edge('start');
      m.any ||= g.buttons.some((bt, i) => bt.pressed && !(prev.buttons || [])[i]);
      this.gpPrev[g.index] = { ...now, buttons: g.buttons.map(bt => bt.pressed) };
    });
    for (const k in this.gpPrev) if (!raw.some(g => g.index === +k)) delete this.gpPrev[k];
    // keyboard side of the menu controls
    const kp = c => this.pressed.has(c);
    m.up ||= kp('ArrowUp') || kp('KeyW'); m.down ||= kp('ArrowDown') || kp('KeyS');
    m.left ||= kp('ArrowLeft') || kp('KeyA'); m.right ||= kp('ArrowRight') || kp('KeyD');
    m.confirm ||= kp('Enter'); m.back ||= kp('Escape'); m.start ||= kp('Escape'); m.any ||= kp('Enter') || kp('Space');
    this.menu = m;
  }

  // Snapshot for one player: keyboard and that player's gamepad merged.
  pad(i) {
    const b = BINDINGS[i], h = this.held, p = this.pressed;
    const pad = emptyPad();
    pad.left = h.has(b.left); pad.right = h.has(b.right);
    pad.up = h.has(b.up); pad.down = h.has(b.down); pad.jump = pad.up;          // on a keyboard the jump key is the up key
    pad.attack = h.has(b.attack); pad.special = h.has(b.special); pad.shield = h.has(b.shield);
    pad.upP = p.has(b.up); pad.downP = p.has(b.down); pad.jumpP = pad.upP;
    pad.attackP = p.has(b.attack); pad.specialP = p.has(b.special); pad.shieldP = p.has(b.shield);
    pad.x = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    const g = this.assign[i] >= 0 ? this.gpPads[this.assign[i]] : null;
    if (g) {
      if (!pad.x) pad.x = g.x;
      for (const k of ['left', 'right', 'up', 'down', 'jump', 'attack', 'special', 'shield', 'upP', 'downP', 'jumpP', 'attackP', 'specialP', 'shieldP']) pad[k] ||= g[k];
    }
    return pad;
  }
  // Give player i the next controller option: keyboard only, then each connected pad.
  // Picking the pad the other player holds swaps them.
  cycleAssign(i, d) {
    const n = this.gpNames.length, opts = [-1, ...Array.from({ length: n }, (_, k) => k)];
    let idx = Math.max(0, opts.indexOf(this.assign[i])); idx = (idx + d + opts.length) % opts.length;
    const pick = opts[idx], other = 1 - i;
    if (pick >= 0 && this.assign[other] === pick) this.assign[other] = this.assign[i];
    this.assign[i] = pick;
  }
  assignName(i) { const a = this.assign[i]; return a >= 0 && this.gpNames[a] ? `🎮 ${this.gpNames[a]}` : (i === 0 ? '⌨️ Keyboard (WASD)' : '⌨️ Keyboard (arrows)'); }
  wasPressed(code) { return this.pressed.has(code); }
  endFrame() { this.pressed.clear(); }
}
