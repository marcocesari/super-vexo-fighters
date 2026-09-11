// Rockheart — Breakrock King's son. Younger stone, lighter grey, with a
// glowing crystal heart set in his chest and a crest of red crystal on his
// head. Sturdier than most, quicker than his father.
import { glow } from '../rig.js';

export default {
  id: 'rockheart', name: 'Rockheart',
  tagline: "The king's son. Stone outside, fire inside.",
  colours: { skin: '#7d7570', hair: null, suit: '#5a544f', armour: '#4a4440', armourLight: '#8a827a',
             accent: '#ff3c4a', boots: '#3a3532', hands: '#5a544f', belt: '#8a827a' },
  stats: { weight: 118, walk: 8.31, run: 12.22, air: 8.1, airAccel: 0.41, jump: 19.31, jump2: 18.47, shortHop: 12.94, dash: 12.95, fall: 13.08, gravity: 0.746, dmgMul: 1.2 },
  proportions: { scale: 1.08, torsoW: 40, torsoD: 24, shoulderW: 24, armR: 8, legR: 9 },
  cover: { clip: 'dashattack', frame: 9 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // crystal crest, front to back over the skull
    glow(p, C.accent, () => { for (let i = 0; i < 4; i++) { p.push(); p.translate(h.x + f * (6 - i * 5) * s, -h.y - 12 * s, h.z); p.rotateZ(f * (0.3 - i * 0.2)); p.cone(2.6 * s, (9 + (i === 1 ? 5 : 0)) * s, 5, 1); p.pop(); } });
    // the heart: a bright crystal in the chest, beating
    const beat = 1 + 0.12 * Math.max(0, Math.sin(ctx.t * 0.15)) ** 8;
    const cx = (j.pelvis.x + j.chest.x) / 2 + f * 3 * s, cy = (j.pelvis.y + j.chest.y) / 2 + 6 * s;
    glow(p, C.accent, () => { p.translate(cx, -cy, 13 * s); p.rotateZ(Math.PI / 4); p.box(9 * s * beat, 9 * s * beat, 5 * s); });
    p.fill('#3a3532'); p.push(); p.translate(cx, -cy, 11 * s); p.rotateZ(Math.PI / 4); p.box(13 * s, 13 * s, 2 * s); p.pop();
    // eyes
    glow(p, C.accent, () => { for (const side of [-1, 1]) { p.push(); p.translate(h.x + f * 12 * s, -h.y - 2 * s, h.z + side * 5 * s); p.sphere(2.2 * s, 6, 4); p.pop(); } });
  },

  // B: Heart Shard — a fast red crystal.
  special: {
    name: 'Heart Shard',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 14, y: h.y, vx: f.facing * 16, vy: 0, r: 10, life: 50, colour: '#ff3c4a',
                           dmg: 6, angle: 30, base: 30, growth: 0.82, owner: f, spin: true });
    },
  },
  // Up-B: Rock Climb — a solid vertical jump with a headbutt on the way up.
  upSpecial: {
    name: 'Rock Climb',
    fire(f) { f.vy = 20; f.vx = f.facing * 2.5; },
    update(f, frame, game) { if (frame > 6 && frame < 22) { f.vy += 0.4; if (frame % 3 === 0) game.spark(f.x, f.y, '#8a827a', 2, true); } },
  },
};
