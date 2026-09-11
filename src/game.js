// The match itself: states, the fixed 60 fps step, hits, projectiles, and the render pass.
import { MODES, HITLAG_CAP } from './config.js';
import { Input, emptyPad } from './input.js';
import { Fighter } from './fighter.js';
import { CPU } from './cpu.js';
import { Camera } from './camera.js';
import { HUD } from './hud.js';
import { Menu } from './menu.js';
import { Cover } from './cover.js';
import { Intro } from './intro.js';
import { Music } from './music.js';
import { Sfx } from './sfx.js';

const MENU_MUSIC = 'assets/menu_music.mp3';
const BATTLE_MUSIC = 'assets/battle_music.mp3';
import { CHARACTERS } from './characters/index.js';
import { STAGES } from './stages/index.js';

export class Game {
  constructor(p) { this.p = p; this.t = 0; }

  setup() {
    const p = this.p;
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    p.frameRate(60); p.setAttributes('antialias', true);
    this.setPerspective();
    this.input = new Input(); this.hud = new HUD(); this.menu = new Menu(this); this.cam = new Camera();
    this.fighters = []; this.projectiles = []; this.sparks = [];
    this.stage = STAGES[0];
    this.cover = new Cover(); this.music = new Music(); this.intro = new Intro(this.music); this.sfx = new Sfx();
    this.refreshPreview();
    this.state = 'splash'; this.menu.splash();
    const begin = () => { if (this.state === 'splash') this.beginTitle(); };
    window.addEventListener('pointerdown', begin);
    // if the browser lets us play sound straight away, skip the splash
    this.intro.start().then(ok => { if (ok && this.state === 'splash') { this.state = 'title'; this.menu.title(); } });
  }
  setPerspective() { const p = this.p; p.perspective(Math.PI / 3.2, p.width / p.height, 10, 20000); }
  resize() { this.p.resizeCanvas(this.p.windowWidth, this.p.windowHeight); this.setPerspective(); }

  // ------------------------------------------------------------ flow
  refreshPreview() {
    const c = this.menu.cfg; this.stage = STAGES[c.stage];
    const ids = [CHARACTERS[c.p1].id, CHARACTERS[c.p2].id];
    if (this.preview && this.preview.map(f => f.char.id).join() === ids.join() && this.previewStage === this.stage) return;
    this.preview = ids.map((id, i) => { const f = new Fighter(CHARACTERS.find(x => x.id === id), i, c.mode); f._stage = this.stage; f.spawn(this.stage.spawns[i][0], i === 0 ? 1 : -1, 0); f.grounded = true; f.setState('idle'); return f; });
    this.previewStage = this.stage;
  }

  startMatch() {
    const c = this.menu.cfg; this.stage = STAGES[c.stage]; this.mode = c.mode;
    this.fighters = [CHARACTERS[c.p1], CHARACTERS[c.p2]].map((ch, i) => {
      const f = new Fighter(ch, i, c.mode); f._stage = this.stage; f.isCPU = i === 1 && c.p2cpu;
      f.spawn(this.stage.spawns[i][0], i === 0 ? 1 : -1, 260); return f;
    });
    this.cpu = c.p2cpu ? new CPU(c.cpuLevel) : null;
    this.projectiles = []; this.sparks = []; this.frames = 0; this.endTimer = 0; this.winner = null;
    this.cam = new Camera(); this.cam.x = 0; this.cam.y = 200;
    this.music.play(BATTLE_MUSIC, { volume: 0.5, fadeIn: 0.5 });
    this.menu.clear(); this.hud.show(true); this.hud.announce('GO!', 60); this.state = 'fight';
  }

  draw() {
    const p = this.p, inp = this.input; this.t++;
    inp.beginFrame();
    const m = inp.menu;
    switch (this.state) {
      case 'splash':
        this.cover.draw(p, this, 0.25);
        if (m.any) this.beginTitle();
        break;
      case 'title':
        this.intro.tick(document.getElementById('menu'));
        this.cover.draw(p, this, 0.25 + 0.75 * this.intro.build);
        if (m.any) { this.intro.stop(); this.state = 'setup'; this.menu.setup(this.input); }
        break;
      case 'setup':
        this.music.update(1);
        if (this.menu.handleSetupKey(inp)) this.startMatch();
        else { this.refreshPreview(); this.renderPreview(); }
        break;
      case 'fight':
        if (m.start) { this.state = 'paused'; this.menu.pause(); break; }
        this.music.update(1);
        this.step(); this.render();
        break;
      case 'paused':
        this.render();
        if (m.start) { this.state = 'fight'; this.menu.clear(); }
        else if (inp.wasPressed('KeyQ') || m.back) this.toSetup();
        break;
      case 'result':
        this.music.update(0.35);                                  // battle music sits back under the result
        this.stepIdle(); this.render();
        if (m.confirm) this.startMatch();
        else if (m.back) this.toSetup();
        break;
    }
    inp.endFrame();
  }
  beginTitle() { this.state = 'title'; this.menu.title(); this.intro.start(); }
  toSetup() { this.hud.show(false); this.state = 'setup'; this.menu.setup(this.input); this.refreshPreview(); this.music.play(MENU_MUSIC, { volume: 0.55, fadeIn: 0.8 }); }

  // ------------------------------------------------------------ simulation
  step() {
    const [a, b] = this.fighters;
    const pads = [this.input.pad(0), this.cpu ? this.cpu.think(b, a, this.stage) : this.input.pad(1)];
    if (this.endTimer === 0) this.fighters.forEach((f, i) => f.update(pads[i], this));
    else { this.fighters.forEach(f => { if (!f.dead) f.update({ ...pads[0], x: 0, left: false, right: false, up: false, down: false, attack: false, special: false, shield: false, upP: false, downP: false, attackP: false, specialP: false, shieldP: false }, this); }); }
    this.separateBodies(); this.resolveHits(); this.stepProjectiles(); this.stepSparks();
    this.cam.update(this.fighters, this.stage);
    this.frames++;
    this.hud.update(this.fighters, this.mode, this.clock(), this.p.frameRate());
    if (this.endTimer > 0 && --this.endTimer === 0) { this.state = 'result'; this.menu.result(`${this.winner.name.toUpperCase()} WINS!`); }
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

  addProjectile(pr) { this.projectiles.push({ gravity: 0, ...pr, age: 0 }); }
  stepProjectiles() {
    for (const pr of this.projectiles) {
      pr.x += pr.vx; pr.y += pr.vy; pr.vy += pr.gravity; pr.life--; pr.age++;
      for (const o of this.fighters) if (o !== pr.owner && !o.dead && o.overlaps(pr.x, pr.y, pr.r)) {
        if (o.takeHit({ ...pr, owner: pr.owner, projectile: true }, this)) { pr.life = 0; }
      }
      for (const pl of this.stage.platforms) if (pl.solid && Math.abs(pr.x - pl.x) < pl.w / 2 && pr.y < pl.y && pr.y > pl.y - pl.h) { pr.life = 0; this.spark(pr.x, pr.y, pr.colour, 5); }
    }
    this.projectiles = this.projectiles.filter(pr => pr.life > 0);
  }
  spark(x, y, colour, n = 8, soft = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = soft ? 1 + Math.random() * 2 : 3 + Math.random() * 7;
      this.sparks.push({ x, y, z: (Math.random() - 0.5) * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: soft ? 14 : 18 + Math.random() * 10, colour, r: soft ? 4 : 3 + Math.random() * 5 });
    }
  }
  stepSparks() { for (const s of this.sparks) { s.x += s.vx; s.y += s.vy; s.vy -= 0.25; s.life--; } this.sparks = this.sparks.filter(s => s.life > 0); }
  shake(a) { this.cam.shake(a); }

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
  renderWorld(fighters) {
    const p = this.p;
    p.background(...this.stage.bg);
    this.lights();
    this.stage.draw(p, this.t);
    for (const f of fighters) f.draw(p, this.t);
    for (const pr of this.projectiles) {
      p.push(); p.noStroke(); p.fill(0); p.emissiveMaterial(pr.colour); p.translate(pr.x, -pr.y, 0);
      if (pr.spin) { p.rotateZ(pr.age * 0.3); p.box(pr.r * 1.6, pr.r * 1.6, pr.r * 1.6); } else p.sphere(pr.r, 10, 8);
      for (let i = 1; i <= 3; i++) { p.translate(-pr.vx * 1.6, pr.vy * 1.6, 0); p.sphere(pr.r * (1 - i * 0.25), 8, 6); }
      p.pop();
    }
    for (const s of this.sparks) { p.push(); p.noStroke(); p.fill(0); p.emissiveMaterial(s.colour); p.translate(s.x, -s.y, s.z); p.sphere(s.r * Math.min(1, s.life / 8), 6, 4); p.pop(); }
  }
  render() { this.cam.apply(this.p); this.renderWorld(this.fighters); }
  renderPreview() {
    const p = this.p; this.projectiles = []; this.sparks = [];
    p.noLights();
    for (const f of this.preview) { f.update(emptyPad(), this); f.grounded = true; f.y = 0; f.vy = 0; f.setState('idle'); }
    const sway = Math.sin(this.t * 0.004) * 120;
    p.camera(sway, -220, 1050, 0, -200, 0, 0, 1, 0);
    this.renderWorld(this.preview);
  }
}
