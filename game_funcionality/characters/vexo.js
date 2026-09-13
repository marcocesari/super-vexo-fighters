// Vexo — captain of the Royal Space Guard, elite hacker. Colours lifted from
// super_vexo/src/world/vexo.js so he's the same person in both games.
import { ball, glow } from '../rig.js';

export default {
  id: 'vexo', name: 'Vexo',
  tagline: 'Fast, tricky, tablet in hand.',
  colours: { skin: '#d8a684', hair: '#3a2418', suit: '#23272e', armour: '#3f454f', armourLight: '#59616e',
             accent: '#53ff9d', boots: '#2e333b', glow: '#49c8ff', visor: '#7dffb0', hands: '#3f454f', belt: '#59616e' },
  stats: { weight: 100, walk: 9.5, run: 14.4, air: 9.9, airAccel: 0.5, jump: 20.6, jump2: 20.6, shortHop: 14.3, dash: 15.26, fall: 12.13, gravity: 0.702, dmgMul: 1.0 },
  proportions: { scale: 1 },
  cover: { clip: 'jab', frame: 6 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // visor — a glowing strip across the eyes
    glow(p, C.visor, () => { p.translate(h.x + f * 9 * s, -h.y - 2 * s, h.z); p.box(9 * s, 6 * s, 24 * s); });
    // headset ear cups + mic
    p.fill('#2b2f36');
    p.push(); p.translate(h.x, -h.y, h.z + 13 * s); p.sphere(5 * s, 8, 6); p.pop();
    p.push(); p.translate(h.x, -h.y, h.z - 13 * s); p.sphere(5 * s, 8, 6); p.pop();
    p.push(); p.translate(h.x + f * 8 * s, -h.y + 7 * s, h.z + 11 * s); p.sphere(2.5 * s, 6, 4); p.pop();
    // circuit lines on the chest and thighs
    const cx = (j.pelvis.x + j.chest.x) / 2, cy = (j.pelvis.y + j.chest.y) / 2;
    glow(p, C.accent, () => {
      p.push(); p.translate(cx, -cy - 6 * s, 12 * s); p.box(2 * s, 30 * s, 1.5 * s); p.pop();
      p.push(); p.translate(cx + f * 8 * s, -cy + 4 * s, 12 * s); p.box(14 * s, 2 * s, 1.5 * s); p.pop();
      p.push(); p.translate(cx - f * 8 * s, -cy - 14 * s, 12 * s); p.box(12 * s, 2 * s, 1.5 * s); p.pop();
    });
    // belt buckle
    glow(p, '#e8dcb0', () => { p.translate(j.pelvis.x + f * 12 * s, -j.pelvis.y, 0); p.sphere(4 * s, 8, 6); });
    // cyan boot glow
    glow(p, C.glow, () => {
      ball(p, { x: j.rFoot.x, y: j.rFoot.y + 4 * s, z: j.rFoot.z }, 5 * s);
      ball(p, { x: j.lFoot.x, y: j.lFoot.y + 4 * s, z: j.lFoot.z }, 5 * s);
    });
  },

  // B: Tablet Pulse — a quick green hacking bolt.
  special: {
    name: 'Tablet Pulse',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 14, y: h.y, vx: f.facing * 15, vy: 0, r: 11, life: 55, colour: '#53ff9d',
                           dmg: 5, angle: 25, base: 30, growth: 0.77, owner: f, spin: true });
    },
  },
  // Up-B: Jet Boots — a rocket boost upward.
  upSpecial: {
    name: 'Jet Boots',
    fire(f) { f.vy = 21; f.vx = f.facing * 3; },
    update(f, frame, game) {
      if (frame > 6 && frame < 26) { f.vy += 0.5; if (frame % 2 === 0) game.spark(f.x - f.facing * 6, f.y + 8, '#49c8ff', 2, true); }
    },
  },
};
