// The match itself: states, the fixed 60 fps step, hits, projectiles, and the render pass.
//
// Simulation and drawing are kept apart. draw() is called by the browser as
// often as the screen can manage — 60, 120, or 20 times a second on a tired
// laptop — and it hands the *real elapsed time* to a clock that runs the fight
// in whole 1/60 s steps: tick() may run none, one, or several times before a
// single paint(). So a fast screen no longer speeds the fight up, and a slow
// one no longer slows it down; it only gets fewer pictures of it.
import { MODES, HITLAG_CAP, STEP_MS, MAX_FRAME_MS, MAX_CATCHUP_STEPS, SNAP_TOLERANCE, SPEEDS, TARGET_FPS } from './config.js?v=48d769e-1791643329';
import { Input, emptyPad } from './input.js?v=48d769e-1791643329';
import { Fighter } from './fighter.js?v=48d769e-1791643329';
import { CPU } from './cpu.js?v=48d769e-1791643329';
import { Camera } from './camera.js?v=48d769e-1791643329';
import { HUD } from './hud.js?v=48d769e-1791643329';
import { Menu } from './menu.js?v=48d769e-1791643329';
import { Cover } from './cover.js?v=48d769e-1791643329';
import { Intro } from './intro.js?v=48d769e-1791643329';
import { Music } from './music.js?v=48d769e-1791643329';
import { Sfx } from './sfx.js?v=48d769e-1791643329';
import { Quality, Q } from './quality.js?v=48d769e-1791643329';
import { Online } from './online.js?v=48d769e-1791643329';

// A frame that is within SNAP_TOLERANCE of a whole number of steps is counted as
// exactly that many. Without it a 60 Hz screen drifts in and out of phase with
// our 60 Hz clock, so some frames get two steps and some none — which reads as
// judder even though the average speed is right.
function snap(dtMs) {
  const steps = dtMs / STEP_MS, near = Math.round(steps);
  return near >= 1 && Math.abs(steps - near) < SNAP_TOLERANCE ? near * STEP_MS : dtMs;
}

const MENU_MUSIC = 'assets/audio/menu_music.mp3';
const BATTLE_MUSIC = 'assets/audio/battle_music.mp3';
import { CHARACTERS } from './characters/index.js?v=48d769e-1791643329';
import { STAGES } from './maps/index.js?v=48d769e-1791643329';

export class Game {
  constructor(p) { this.p = p; this.t = 0; this.acc = 0; this.lastMs = 0; this.sincePaint = 0; this.repaint = true; }

  setup() {
    const p = this.p;
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    // Ask for TARGET_FPS pictures a second instead of p5's own cap of 60; the
    // clock in draw() decides how much of the fight each picture is worth.
    p.frameRate(TARGET_FPS);
    this.quality = new Quality(); this.quality.attach(p);
    this.setPerspective();
    this.input = new Input(); this.hud = new HUD(); this.menu = new Menu(this); this.cam = new Camera();
    this.fighters = []; this.projectiles = []; this.sparks = [];
    this.stage = STAGES[0];
    this.online = new Online(this);
    this.cover = new Cover(); this.music = new Music(); this.intro = new Intro(this.music); this.sfx = new Sfx();
    this.refreshPreview();
    this.beginTitle();
    // if the browser wants a gesture before it plays sound, the first click brings the music in
    for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { if (this.state === 'title') this.intro.unlock(); });
  }
  setPerspective() { const p = this.p; p.perspective(Math.PI / 3.2, p.width / p.height, 10, 20000); }
  resize() { this.p.resizeCanvas(this.p.windowWidth, this.p.windowHeight); this.setPerspective(); this.repaint = true; }

  // ------------------------------------------------------------ flow
  refreshPreview() {
    const c = this.menu.cfg; this.stage = STAGES[c.stage];
    const ids = [CHARACTERS[c.p1].id, CHARACTERS[c.p2].id];
    if (this.preview && this.preview.map(f => f.char.id).join() === ids.join() && this.previewStage === this.stage) return;
    this.preview = ids.map((id, i) => { const f = new Fighter(CHARACTERS.find(x => x.id === id), i, c.mode); f._stage = this.stage; f.spawn(this.stage.spawns[i][0], i === 0 ? 1 : -1, 0); f.grounded = true; f.setState('idle'); return f; });
    this.previewStage = this.stage;
  }

  // `net` is the Online host when the other fighter is a player on another device.
  startMatch(net = null) {
    const c = this.menu.cfg; this.stage = STAGES[c.stage]; this.mode = c.mode; this.net = net;
    this.fighters = [CHARACTERS[c.p1], CHARACTERS[c.p2]].map((ch, i) => {
      const f = new Fighter(ch, i, c.mode); f._stage = this.stage; f.isCPU = i === 1 && c.p2cpu && !net;
      f.spawn(this.stage.spawns[i][0], i === 0 ? 1 : -1, 260); return f;
    });
    this.cpu = c.p2cpu && !net ? new CPU(c.cpuLevel) : null;
    this.projectiles = []; this.sparks = []; this.frames = 0; this.endTimer = 0; this.winner = null;
    this.cam = new Camera(); this.cam.x = 0; this.cam.y = 200;
    this.music.play(BATTLE_MUSIC, { volume: 0.5, fadeIn: 0.5 });
    this.netHint = false;
    this.menu.clear(); this.hud.show(true); this.hud.announce('GO!', 60); this.state = 'fight';
  }

  // ------------------------------------------------------------ the clock
  // One browser frame: work out how much time really passed, pay it out in
  // whole 1/60 s steps, then draw once if anything moved.
  draw() {
    const now = performance.now();
    let real = this.lastMs ? now - this.lastMs : STEP_MS;
    this.lastMs = now;
    if (!(real > 0)) real = STEP_MS;
    this.sincePaint += real;                              // real time, for the frame-rate watchdog
    // Simulated time. A long stall is not fast-forwarded, and the fight (never
    // the menus) is stretched by the chosen game speed.
    const slowed = this.state === 'fight' || this.state === 'result' || this.state === 'netview';
    this.acc += snap(Math.min(real, MAX_FRAME_MS)) * (slowed ? this.speed() : 1);
    let steps = Math.floor(this.acc / STEP_MS);
    if (steps > MAX_CATCHUP_STEPS) { steps = MAX_CATCHUP_STEPS; this.acc = 0; }
    else this.acc -= steps * STEP_MS;
    for (let i = 0; i < steps; i++) this.tick();
    // Draw every frame, at the point we have actually reached *between* two
    // steps. That is what keeps a 45-step-a-second fight looking as smooth as a
    // 60-step one, and a 60-step fight smooth on a 120 Hz screen.
    this.paint(this.acc / STEP_MS);
    this.quality.sample(this.sincePaint); this.sincePaint = 0;
  }
  speed() { return SPEEDS[this.menu.cfg.speed].mul; }

  // One 1/60 s step of whatever the game is currently doing. No drawing here.
  tick() {
    const inp = this.input; this.t++;
    inp.beginFrame();
    const m = inp.menu;
    switch (this.state) {
      case 'title':
        this.intro.tick(document.getElementById('menu'));
        if (m.any) { this.intro.stop(); this.state = 'setup'; this.menu.setup(this.input); if (!this.music.playing) this.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 }); }
        break;
      case 'setup':
        this.music.update(1);
        const go = this.menu.handleSetupKey(inp);
        if (go === 'online') this.online.open();
        else if (go) this.startMatch();
        else { this.refreshPreview(); this.stepPreview(); }
        break;
      case 'fight':
        if (this.net) {                                   // online: the fight can't stop for everyone, so Start only offers to leave
          if (m.start) { this.netHint = !this.netHint; this.netHint ? this.menu.pauseOnline() : this.menu.clear(); }
          if (this.netHint && (inp.wasPressed('KeyQ') || m.back)) { this.netHint = false; this.menu.clear(); this.net.backToRoom(); break; }
        } else if (m.start) { this.state = 'paused'; this.menu.pause(); this.music.pause(); break; }
        this.music.update(1);
        this.step();
        this.net?.afterStep();
        break;
      case 'online':                                      // the online menus, with the fighters idling behind
        this.music.update(1);
        this.online.tick(inp);
        if (this.state === 'online') { this.refreshPreview(); this.stepPreview(); }
        break;
      case 'netview':                                     // someone else's fight, as a guest or a watcher
        this.music.update(1);
        this.online.viewTick(inp);
        break;
      case 'paused':
        if (m.start) { this.state = 'fight'; this.menu.clear(); this.music.resume(); }
        else if (inp.wasPressed('KeyQ') || m.back) this.toSetup();
        break;
      case 'result':
        this.music.update(0.35);                                  // battle music sits back under the result
        this.stepIdle();
        this.net?.afterStep();
        if (this.net) { if (m.confirm) this.net.rematch(); else if (m.back) this.net.backToRoom(); }
        else if (m.confirm) this.startMatch();
        else if (m.back) this.toSetup();
        break;
    }
    inp.endFrame();
  }

  // One picture of wherever we are now, `a` of the way to the next step.
  paint(a = 1) {
    switch (this.state) {
      case 'title': this.cover.draw(this.p, this, 0.25 + 0.75 * this.intro.build); break;
      case 'setup': case 'online': this.renderPreview(); break;
      default: this.render(a);
    }
  }

  beginTitle() { this.state = 'title'; this.menu.title(); this.intro.start(); }
  toSetup() { this.net = null; this.hud.show(false); this.state = 'setup'; this.menu.setup(this.input); this.refreshPreview(); this.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 }); }

  // ------------------------------------------------------------ simulation
  step() {
    const [a, b] = this.fighters;
    const pads = [this.input.pad(0), this.net ? this.net.remotePad() : this.cpu ? this.cpu.think(b, a, this.stage) : this.input.pad(1)];
    if (this.endTimer === 0) this.fighters.forEach((f, i) => f.update(pads[i], this));
    else { this.fighters.forEach(f => { if (!f.dead) f.update({ ...pads[0], x: 0, left: false, right: false, up: false, down: false, attack: false, special: false, shield: false, upP: false, downP: false, attackP: false, specialP: false, shieldP: false }, this); }); }
    this.separateBodies(); this.resolveHits(); this.stepProjectiles(); this.stepSparks();
    this.cam.update(this.fighters, this.stage);
    this.frames++;
    this.hud.update(this.fighters, this.mode, this.clock(), this.quality.label());
    if (this.endTimer > 0 && --this.endTimer === 0) {
      const text = `${this.winner.name.toUpperCase()} WINS!`;
      this.state = 'result'; this.menu.result(text, !!this.net); this.net?.onMatchOver(text);
    }
  }
  stepIdle() { this.fighters.forEach(f => { if (!f.dead) f.update(emptyPad(), this); }); this.stepSparks(); this.stepProjectiles(); this.cam.update(this.fighters, this.stage); this.hud.update(this.fighters, this.mode, this.clock()); }
  clock() { const s = Math.floor(this.frames / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  // Fighters are solid to each other: overlapping bodies get pushed apart,
  // the heavier one giving less ground. A little per frame, so it feels like
  // shoving rather than a wall.
  separateBodies() {
    const [a, b] = this.fighters;
    if (!a || !b || a.dead || b.dead) return;
    const ha = a.hurt(), hb = b.hurt();
    if (ha.y0 > hb.y1 || hb.y0 > ha.y1) return;                     // not at the same height
    const minDist = ha.r + hb.r + 4, dx = b.x - a.x, dist = Math.abs(dx);
    if (dist >= minDist) return;
    const dir = dx === 0 ? (a.facing || 1) : Math.sign(dx);
    const push = Math.min(minDist - dist, 5);                       // max shove per frame
    const wa = a.stats.weight, wb = b.stats.weight, share = wb / (wa + wb);
    a.x -= dir * push * share; b.x += dir * push * (1 - share);
    if (a.vx * dir > 0) a.vx *= 0.5; if (b.vx * dir < 0) b.vx *= 0.5;   // running into someone slows you
  }

  resolveHits() {
    for (const f of this.fighters) {
      if (f.dead) continue;
      for (const h of f.activeHits()) for (const o of this.fighters) {
        if (o === f || o.dead) continue;
        if (o.overlaps(h.x, h.y, h.r) && o.takeHit(h, this)) f.hitsDone.add(h.id);
      }
    }
  }
  hitlag(dmg) { return Math.min(HITLAG_CAP, Math.floor(dmg * 0.65 + 6)); }   // Ultimate's freeze frames

  addProjectile(pr) { this.projectiles.push({ gravity: 0, ...pr, age: 0, px: pr.x, py: pr.y }); }
  stepProjectiles() {
    for (const pr of this.projectiles) {
      pr.px = pr.x; pr.py = pr.y;
      pr.x += pr.vx; pr.y += pr.vy; pr.vy += pr.gravity; pr.life--; pr.age++;
      if (pr.age % 3 === 0) this.spark(pr.x - pr.vx, pr.y - pr.vy, pr.colour, 1, true);     // a sparkly trail, so shots are easy to follow
      for (const o of this.fighters) if (o !== pr.owner && !o.dead && o.overlaps(pr.x, pr.y, pr.r)) {
        if (o.takeHit({ ...pr, owner: pr.owner, projectile: true }, this)) { pr.life = 0; }
      }
      for (const pl of this.stage.platforms) if (pl.solid && Math.abs(pr.x - pl.x) < pl.w / 2 && pr.y < pl.y && pr.y > pl.y - pl.h) { pr.life = 0; this.spark(pr.x, pr.y, pr.colour, 5); }
    }
    this.projectiles = this.projectiles.filter(pr => pr.life > 0);
  }
  spark(x, y, colour, n = 8, soft = false) {
    n = Math.max(1, Math.round(n * Q.sparkMul));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = soft ? 1 + Math.random() * 2 : 3 + Math.random() * 7;
      this.sparks.push({ x, y, px: x, py: y, z: (Math.random() - 0.5) * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: soft ? 14 : 18 + Math.random() * 10, colour, r: soft ? 4 : 3 + Math.random() * 5 });
    }
  }
  stepSparks() { for (const s of this.sparks) { s.px = s.x; s.py = s.y; s.x += s.vx; s.y += s.vy; s.vy -= 0.25; s.life--; } this.sparks = this.sparks.filter(s => s.life > 0); }
  shake(a) { this.cam.shake(a); }

  onSuper(f) {
    this.hud.announce(`${f.name.toUpperCase()} — SUPER!`, 70);
    this.shake(8); this.sfx.play('shield_break', { volume: 0.9, pitch: 0.8 });
  }

  onKO(f) {
    if (f.dead) return;
    this.spark(Math.max(this.stage.blast.l + 60, Math.min(this.stage.blast.r - 60, f.x)), Math.max(this.stage.blast.b + 60, Math.min(this.stage.blast.t - 60, f.y)), '#ffd23f', 30);
    this.shake(20); this.sfx.play('ko', { volume: 1, pitch: 0.9 });
    f.kill();
    if (this.mode === MODES.STOCK) f.stocks--; else f.stocks = 0;
    if (f.stocks <= 0) { this.winner = this.fighters.find(o => o !== f); this.endTimer = 120; this.hud.announce('GAME!', 120); this.music.update(0.35); }
    else this.hud.announce(`${f.name} — ${f.stocks} left`, 60, true);
  }

  // ------------------------------------------------------------ render
  lights() {
    const p = this.p;
    p.ambientLight(95, 95, 110);
    p.directionalLight(255, 248, 235, -0.35, 0.75, -0.55);
    p.directionalLight(70, 80, 120, 0.6, 0.1, 0.8);
  }
  renderWorld(fighters, a = 1) {
    const p = this.p;
    const lerp = (o, k) => o['p' + k] === undefined ? o[k] : o['p' + k] + (o[k] - o['p' + k]) * a;
    p.background(...this.stage.bg);
    this.lights();
    this.stage.draw(p, this.t);
    for (const f of fighters) f.draw(p, this.t, a);
    for (const pr of this.projectiles) {
      p.push(); p.noStroke(); p.fill(0); p.emissiveMaterial(pr.colour); p.translate(lerp(pr, 'x'), -lerp(pr, 'y'), 0);
      // a see-through glow around every shot, so even a small one reads from far away
      const c = p.color(pr.colour), pulse = 1 + 0.12 * Math.sin(pr.age * 0.6);
      p.push(); p.fill(p.red(c), p.green(c), p.blue(c), 90); p.emissiveMaterial(c); p.sphere(Math.max(pr.r * 2.6, 40) * pulse, Q.sphereU, Q.sphereV); p.pop();
      p.push(); p.fill(0); p.emissiveMaterial(255); p.sphere(pr.r * 0.7, Q.sphereU, Q.sphereV); p.pop();   // white-hot core
      if (pr.spin) { p.rotateZ(pr.age * 0.3); p.box(pr.r * 1.6, pr.r * 1.6, pr.r * 1.6); } else p.sphere(pr.r, Q.sphereU, Q.sphereV);
      for (let i = 1; i <= Q.trail; i++) { p.translate(-pr.vx * 1.6, pr.vy * 1.6, 0); p.sphere(pr.r * (1 - i * 0.25), Q.sphereU - 4, Q.sphereV - 2); }
      p.pop();
    }
    for (const s of this.sparks) { p.push(); p.noStroke(); p.fill(0); p.emissiveMaterial(s.colour); p.translate(lerp(s, 'x'), -lerp(s, 'y'), s.z); p.sphere(s.r * Math.min(1, s.life / 8), Math.min(6, Q.sphereU), Math.min(4, Q.sphereV)); p.pop(); }
  }
  render(a = 1) { this.cam.apply(this.p, a); this.renderWorld(this.fighters, a); }
  stepPreview() {
    this.projectiles = []; this.sparks = [];
    for (const f of this.preview) { f.update(emptyPad(), this); f.grounded = true; f.y = 0; f.vy = 0; f.setState('idle'); }
  }
  renderPreview() {
    const p = this.p;
    const sway = Math.sin(this.t * 0.004) * 120;
    p.camera(sway, -220, 1050, 0, -200, 0, 0, 1, 0);
    this.renderWorld(this.preview);
  }
}
