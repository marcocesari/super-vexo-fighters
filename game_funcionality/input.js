// Keyboard + gamepads → per-player "pad" snapshots.
//
// The keyboard is laid out like ONE gamepad (e.code, so it works on any layout):
//   left hand  = the stick:      W up/jump · A D move · S crouch/drop/fast-fall
//   right hand = the arrow keys as the pad buttons (Marco's layout):
//                → = A attack · ↓ = B special · ↑ = shield bubble · ← = jump (X/Y)
//   Space / Shift also shield · Enter = Start (pause / confirm) · Esc = back
// A second human with no pad gets the right side of the keyboard (P2 layout):
//   I J K L = stick · O attack · P special · U shield
//
// Gamepads (Web Gamepad API, standard mapping — Xbox / PlayStation / Switch Pro
// / most USB pads): the first pad plugged in is Player 1, the second Player 2.
// Keyboard and pad for the same player are merged, so either works.
//   left stick / d-pad  move (stick is analog: a gentle push walks, hard over runs)
//   stick up / d-pad up jump (tap jump, like Smash)   X or Y  jump
//   A  attack     B  special     any shoulder / trigger  shield
//   Start  pause / confirm in menus     B  back in menus
// Every binding is a list of key codes: any of them counts.
export const KEYBOARD = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  jump: ['ArrowLeft'], attack: ['ArrowRight'], special: ['ArrowDown'],
  shield: ['ArrowUp', 'Space', 'ShiftLeft', 'ShiftRight'], start: ['Enter'],
};
export const KEYBOARD2 = {
  left: ['KeyJ'], right: ['KeyL'], up: ['KeyI'], down: ['KeyK'],
  jump: [], attack: ['KeyO'], special: ['KeyP'], shield: ['KeyU'], start: ['Enter'],
};
export const BINDING_TEXT = [
  '⌨️ W/A/S/D = stick (W jump · S crouch/fast-fall) · → attack (A) · ↓ special (B) · ↑ shield · ← jump · Enter start',
  '⌨️ P2 on the same keyboard: I/J/K/L = stick · O attack · P special · U shield',
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
    this.p2cpu = true;            // set by the menu: with a CPU opponent the keyboard is never shared
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
    m.confirm ||= kp('Enter'); m.back ||= kp('Escape'); m.start ||= kp('Escape') || kp('Enter'); m.any ||= kp('Enter') || kp('Space');
    this.menu = m;
  }

  // Both humans on the keyboard and nobody on a pad → P1 keeps WASD + arrows, P2 gets IJKL + O P U.
  kbShared() { return !this.p2cpu && this.assign[0] < 0 && this.assign[1] < 0; }
  keys(i) { return i === 1 && this.kbShared() ? KEYBOARD2 : KEYBOARD; }

  // Snapshot for one player: keyboard and that player's gamepad merged.
  // The keyboard belongs to whoever picked it; when nobody did (P1 on the only pad,
  // P2 is the CPU) it still drives P1, so it never goes dead.
  pad(i) {
    const pad = emptyPad();
    const g = this.assign[i] >= 0 ? this.gpPads[this.assign[i]] : null;
    const other = 1 - i, nobodyOnKeys = this.assign[0] >= 0 && (this.p2cpu || this.assign[1] >= 0);
    if (this.assign[i] < 0 || (i === 0 && nobodyOnKeys)) {
      const b = this.keys(i), h = c => b[c].some(k => this.held.has(k)), p = c => b[c].some(k => this.pressed.has(k));
      pad.left = h('left'); pad.right = h('right');
      pad.up = h('up'); pad.down = h('down'); pad.jump = pad.up || h('jump');   // stick up is a tap-jump, like on a pad
      pad.attack = h('attack'); pad.special = h('special'); pad.shield = h('shield');
      pad.upP = p('up'); pad.downP = p('down'); pad.jumpP = pad.upP || p('jump');
      pad.attackP = p('attack'); pad.specialP = p('special'); pad.shieldP = p('shield');
      pad.x = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    }
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
  assignName(i) {
    const a = this.assign[i];
    if (a >= 0 && this.gpNames[a]) return `🎮 ${this.gpNames[a]}`;
    return this.kbShared() ? (i === 0 ? '⌨️ Keyboard (WASD + arrows)' : '⌨️ Keyboard (IJKL + O P U)') : '⌨️ Keyboard';
  }
  wasPressed(code) { return this.pressed.has(code); }
  endFrame() { this.pressed.clear(); }
}
