// Headless smoke test: two CPUs fight on every stage with no renderer.
// Run: node tools/smoke.mjs
import { Fighter } from '../game_funcionality/fighter.js';
import { CPU } from '../game_funcionality/cpu.js';
import { CHARACTERS } from '../game_funcionality/characters/index.js';
import { STAGES } from '../game_funcionality/maps/index.js';
import { MODES, HITLAG_CAP } from '../game_funcionality/config.js';

class FakeGame {
  constructor(stage, mode) { this.stage = stage; this.mode = mode; this.projectiles = []; this.kos = 0; this.hits = 0; this.sparks = 0; }
  hitlag(d) { return Math.min(HITLAG_CAP, Math.floor(d * 0.65 + 6)); }
  spark() { this.sparks++; }
  shake() {}
  addProjectile(pr) { this.projectiles.push({ gravity: 0, ...pr, age: 0 }); }
  onKO(f) { if (f.dead) return; f.kill(); this.kos++; if (this.mode === MODES.STOCK) f.stocks--; else f.stocks = 0; }
}

let failures = 0;
// every character's paint job, against a fake p5 that just counts calls
const fakeP = new Proxy({}, { get: (_, k) => k === 'color' ? (...a) => a : (...a) => fakeP });
for (const c of CHARACTERS) {
  try {
    const f = new Fighter(c, 0, MODES.STOCK); f._stage = STAGES[0]; f.spawn(0, 1, 0); f.update({ x: 0 }, new FakeGame(STAGES[0], MODES.STOCK)); f.draw(fakeP, 1);
    for (const clip in f.clips) f.clips[clip].keys.forEach(([fr]) => { f.state = clip; f.frame = fr; f.activeHits(); });
  } catch (e) { failures++; console.log(`FAIL draw ${c.name}: ${e.stack}`); }
}
console.log(`${CHARACTERS.length} characters drawn`);

const matchups = [];
for (const stage of STAGES) for (const mode of Object.values(MODES)) matchups.push([stage, mode, CHARACTERS[0], CHARACTERS[2]]);
for (let i = 3; i < CHARACTERS.length; i++) matchups.push([STAGES[i % STAGES.length], MODES.STOCK, CHARACTERS[i], CHARACTERS[0]]);
for (const [stage, mode, A, B] of matchups) {
  const game = new FakeGame(stage, mode);
  const fs = [A, B].map((c, i) => { const f = new Fighter(c, i, mode); f._stage = stage; f.spawn(stage.spawns[i][0], i ? -1 : 1, 200); return f; });
  const cpus = [new CPU(4), new CPU(4)];
  let maxPct = 0, frames = 0, overlaps = 0;
  try {
    for (frames = 0; frames < 6000; frames++) {
      const pads = fs.map((f, i) => cpus[i].think(f, fs[1 - i], stage));
      fs.forEach((f, i) => f.update(pads[i], game));
      { const [a, b] = fs; if (!a.dead && !b.dead) { const ha = a.hurt(), hb = b.hurt(); if (!(ha.y0 > hb.y1 || hb.y0 > ha.y1)) { const md = ha.r + hb.r + 4, dx = b.x - a.x; if (Math.abs(dx) < md) { const dir = Math.sign(dx) || 1, push = Math.min(md - Math.abs(dx), 5); a.x -= dir * push / 2; b.x += dir * push / 2; overlaps++; } } } }
      for (const f of fs) { if (f.dead) continue; for (const h of f.activeHits()) for (const o of fs) if (o !== f && !o.dead && o.overlaps(h.x, h.y, h.r) && o.takeHit(h, game)) { f.hitsDone.add(h.id); game.hits++; } }
      for (const pr of game.projectiles) { pr.x += pr.vx; pr.y += pr.vy; pr.vy += pr.gravity; pr.life--; for (const o of fs) if (o !== pr.owner && !o.dead && o.overlaps(pr.x, pr.y, pr.r) && o.takeHit({ ...pr, projectile: true }, game)) { pr.life = 0; game.hits++; } }
      game.projectiles = game.projectiles.filter(p => p.life > 0);
      for (const f of fs) { maxPct = Math.max(maxPct, f.percent); if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) throw new Error('NaN position'); }
      if (fs.some(f => f.stocks <= 0)) break;
    }
  } catch (e) { failures++; console.log(`FAIL ${stage.name} ${mode}: ${e.stack}`); continue; }
  console.log(`${(A.name + ' vs ' + B.name).padEnd(28)} ${stage.name.padEnd(16)} ${mode.padEnd(8)} frames=${frames} hits=${game.hits} KOs=${game.kos} maxPct=${Math.round(maxPct)} shoves=${overlaps} stocks=${fs.map(f => f.stocks)} hp=${fs.map(f => Math.round(f.hp))}`);
}
process.exit(failures ? 1 : 0);
