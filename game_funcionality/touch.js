// Phones & tablets: the on-screen pad for Player 1, laid out like New Super Mario Bros 2D All Stars.
//   left side  = a joystick that appears under your thumb wherever it lands (and vanishes when you let go)
//   right side = A (big, attack) lifted off the corner · B (special) to its left
//                X (jump) above-left · Y (shield) above-right
//   top middle = ❚❚ pause (Start)
// The stick works like a real one: a gentle push walks, all the way over runs,
// pushing up jumps (tap-jump, like Smash) and pushing down crouches / fast-falls.
// poll() is called once per 1/60 s step; a tap quicker than a step still counts.

// A phone or tablet: the main pointer is a finger. A Chromebook with a touchscreen
// still has a touchpad as its main pointer, so it keeps the keyboard menus — but the
// pad still shows up the moment it's touched (and goes away again on a key press).
export const isTouchDevice = globalThis.window?.matchMedia?.('(pointer: coarse)').matches || false;   // (no window in the node smoke test)

const DEAD = 0.25, TILT = 0.55;   // same feel as a gamepad stick (input.js)
const BUTTONS = [
  { id: 'attack', label: 'A', word: 'ATTACK', c: 'rgb(80,210,110)' },
  { id: 'special', label: 'B', word: 'SPECIAL', c: 'rgb(230,80,90)' },
  { id: 'jump', label: 'X', word: 'JUMP', c: 'rgb(80,150,230)' },
  { id: 'shield', label: 'Y', word: 'SHIELD', c: 'rgb(245,205,60)' },
];
const KEYS = ['up', 'down', 'jump', 'attack', 'special', 'shield'];

export class Touch {
  constructor() {
    this.active = isTouchDevice;   // a finger is what's being used to play
    this.want = false;             // the game wants the pad (in a fight)
    this.shown = false;
    this.fingers = new Map();      // pointerId → { x, y }
    this.stick = null;             // { id, x0, y0, x, y } while a thumb is on the joystick
    this.hits = new Set();         // buttons pressed since the last poll (so quick taps aren't lost)
    this.prev = {};
    this.startTap = false;
    if (this.active) document.body.classList.add('touch');

    const el = this.el = document.createElement('div');
    el.id = 'touch'; el.style.display = 'none';
    el.innerHTML = `<div class="tstick"><div class="tknob"></div></div>
      ${BUTTONS.map(b => `<div class="tbtn" data-b="${b.id}" style="--c:${b.c}"><b>${b.label}</b><small>${b.word}</small></div>`).join('')}
      <div class="tpause"><i></i><i></i></div>`;
    document.body.appendChild(el);
    this.stickEl = el.querySelector('.tstick'); this.knobEl = el.querySelector('.tknob');
    this.btnEls = Object.fromEntries([...el.querySelectorAll('.tbtn')].map(e => [e.dataset.b, e]));
    this.stickEl.style.display = 'none';

    const at = e => ({ x: e.clientX, y: e.clientY });
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (e.target.closest('.tpause')) { this.startTap = true; return; }
      const f = at(e); this.fingers.set(e.pointerId, f);
      const b = this.buttonAt(f.x, f.y);
      if (b) this.hits.add(b);
      else if (!this.stick) this.stick = { id: e.pointerId, x0: f.x, y0: f.y, x: f.x, y: f.y };
      this.paintPad();
    });
    el.addEventListener('pointermove', e => {
      if (!this.fingers.has(e.pointerId)) return;
      const f = at(e); this.fingers.set(e.pointerId, f);
      if (this.stick?.id === e.pointerId) { this.stick.x = f.x; this.stick.y = f.y; }
      else { const b = this.buttonAt(f.x, f.y); if (b) this.hits.add(b); }   // sliding onto a button presses it
      this.paintPad();
    });
    const up = e => {
      this.fingers.delete(e.pointerId);
      if (this.stick?.id === e.pointerId) this.stick = null;
      this.paintPad();
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());

    // switch between finger and keyboard play on the fly
    window.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' && !this.active) { this.active = true; document.body.classList.add('touch'); this.update(); }
      if (e.pointerType === 'touch') this.firstGesture();
    }, true);
    window.addEventListener('keydown', () => { if (this.active && !isTouchDevice) { this.active = false; document.body.classList.remove('touch'); this.update(); } });
    window.addEventListener('resize', () => this.layout());
  }

  // Phones only go fullscreen / lock sideways from inside a tap, so the first tap asks.
  firstGesture() {
    if (this.gestured || !isTouchDevice) return; this.gestured = true;
    try { const r = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); r?.catch?.(() => {}); } catch (e) { /* iPhone Safari has no fullscreen */ }
    try { const r = screen.orientation?.lock?.('landscape'); r?.catch?.(() => {}); } catch (e) { /* not supported */ }
  }

  show(on) { this.want = on; this.update(); }
  update() {
    const s = this.want && this.active;
    if (s === this.shown) return;
    this.shown = s; this.el.style.display = s ? '' : 'none';
    if (s) this.layout();
    else { this.fingers.clear(); this.stick = null; this.hits.clear(); this.paintPad(); }
  }

  // Button sizes and spots — the same sums as the Mario game, so thumbs feel at home.
  layout() {
    const w = window.innerWidth, h = window.innerHeight, short = Math.min(w, h);
    const aR = Math.max(54, Math.min(92, short * 0.12)), r = aR * 0.58, pad = Math.max(18, short * 0.04);
    const aX = w - Math.max(pad + r, w * 0.10) - aR, aY = h - Math.max(pad + aR * 0.5, h * 0.25) - aR;
    this.L = {
      attack: { x: aX, y: aY, r: aR },
      special: { x: aX - aR - r * 1.2, y: aY + aR * 0.25, r },
      jump: { x: aX - aR * 0.75 - r * 0.2, y: aY - aR - r * 0.4, r },
      shield: { x: aX + aR * 0.75 + r * 0.2, y: aY - aR - r * 0.4, r },
    };
    for (const [id, b] of Object.entries(this.L)) {
      const e = this.btnEls[id];
      Object.assign(e.style, { left: `${b.x - b.r}px`, top: `${b.y - b.r}px`, width: `${b.r * 2}px`, height: `${b.r * 2}px`, fontSize: `${b.r * 0.95}px` });
    }
    this.stickR = Math.max(40, short * 0.11);
    this.paintPad();
  }

  // Which button is under (x, y)? A little grace around each so thumbs don't slip off.
  buttonAt(x, y) {
    if (!this.L) return null;
    for (const [id, b] of Object.entries(this.L)) if ((x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r * 1.15) ** 2) return id;
    return null;
  }
  heldButtons() {
    const held = new Set();
    for (const [id, f] of this.fingers) if (this.stick?.id !== id) { const b = this.buttonAt(f.x, f.y); if (b) held.add(b); }
    return held;
  }
  // The stick as -1..1 on each axis (screen down = +y).
  stickXY() {
    if (!this.stick) return { x: 0, y: 0 };
    let dx = (this.stick.x - this.stick.x0) / this.stickR, dy = (this.stick.y - this.stick.y0) / this.stickR;
    const d = Math.hypot(dx, dy); if (d > 1) { dx /= d; dy /= d; }
    return { x: dx, y: dy };
  }

  paintPad() {
    const held = this.heldButtons();
    for (const [id, e] of Object.entries(this.btnEls)) e.classList.toggle('held', held.has(id));
    if (!this.stick) { this.stickEl.style.display = 'none'; return; }
    const R = this.stickR, k = R * 0.5, { x, y } = this.stickXY();
    Object.assign(this.stickEl.style, { display: '', left: `${this.stick.x0 - R}px`, top: `${this.stick.y0 - R}px`, width: `${R * 2}px`, height: `${R * 2}px` });
    Object.assign(this.knobEl.style, { width: `${k * 2}px`, height: `${k * 2}px`, transform: `translate(${x * R - k}px, ${y * R - k}px)` });
  }

  // One step's worth of pad, plus whether ❚❚ was tapped.
  poll() {
    const start = this.startTap; this.startTap = false;
    const held = this.heldButtons(), hits = this.hits; this.hits = new Set();
    const { x: sx, y: sy } = this.stickXY();
    const x = Math.abs(sx) < DEAD ? 0 : sx;
    const now = {
      x, left: x < 0, right: x > 0,
      up: sy < -TILT, down: sy > TILT,
      jump: sy < -TILT || held.has('jump') || hits.has('jump'),
      attack: held.has('attack') || hits.has('attack'),
      special: held.has('special') || hits.has('special'),
      shield: held.has('shield') || hits.has('shield'),
    };
    const pad = { ...now };
    for (const k of KEYS) pad[k + 'P'] = now[k] && (!this.prev[k] || hits.has(k));
    this.prev = now;
    return { pad, start };
  }
}
