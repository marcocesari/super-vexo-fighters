// Princess Astra — not waiting to be rescued this time. Light, quick, floaty.
// Silver-white armoured dress with gold trim, long golden hair, a tiara.
import { glow } from '../rig.js';

export default {
  id: 'astra', name: 'Astra',
  tagline: 'Light and quick, with a star in her hand.',
  colours: { skin: '#f0c8a8', hair: '#f2cf62', suit: '#dfe6f2', armour: '#f6f8ff', armourLight: '#c9d6ea',
             accent: '#7ec8ff', boots: '#c9a94a', hands: '#f0c8a8', belt: '#d9b34c', gold: '#e8c04a' },
  stats: { weight: 82, walk: 10.09, run: 15.05, air: 11.25, airAccel: 0.56, jump: 21.24, jump2: 22.02, shortHop: 14.98, dash: 15.95, fall: 10.6, gravity: 0.62, dmgMul: 0.9 },
  proportions: { scale: 0.95, torsoW: 30, torsoD: 18, shoulderW: 18, armR: 5.5, legR: 7 },
  cover: { clip: 'uair', frame: 9 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // long hair, down the back, swinging with movement
    const sway = -ctx.fighter.vx * 1.5;
    p.fill(C.hair);
    p.push(); p.translate(h.x - f * 12 * s + sway * 0.4, -h.y + 22 * s, h.z - 2 * s); p.rotateZ(f * 0.2 + sway * 0.015); p.box(10 * s, 60 * s, 18 * s); p.pop();
    // tiara: a gold band with a blue jewel
    p.push(); p.translate(h.x, -h.y - 9 * s, h.z); p.rotateX(Math.PI / 2); p.fill(C.gold); p.torus(12.5 * s, 1.8 * s, 16, 6); p.pop();
    glow(p, C.accent, () => { p.translate(h.x + f * 12 * s, -h.y - 10 * s, h.z); p.sphere(3 * s, 8, 6); });
    // eyes
    p.fill('#3a5a8a');
    for (const side of [-1, 1]) { p.push(); p.translate(h.x + f * 12.5 * s, -h.y - 1 * s, h.z + side * 5 * s); p.sphere(1.8 * s, 6, 4); p.pop(); }
    // skirt plates around the hips
    p.fill(C.armourLight);
    p.push(); p.translate(j.pelvis.x, -j.pelvis.y + 14 * s, 0); p.cone(24 * s, 30 * s, 12, 1); p.pop();
    // gold chest trim
    p.push(); p.translate((j.pelvis.x + j.chest.x) / 2 + f * 2 * s, -(j.pelvis.y + j.chest.y) / 2 - 12 * s, 11 * s); p.fill(C.gold); p.box(24 * s, 3 * s, 2 * s); p.pop();
  },

  // B: Star Bolt — a fast twinkling shot with a slight upward arc.
  special: {
    name: 'Star Bolt',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 12, y: h.y, vx: f.facing * 17, vy: 1.5, r: 9, life: 50, colour: '#fff3a0',
                           dmg: 4, angle: 55, base: 24, growth: 0.75, owner: f, spin: true, gravity: -0.05 });
    },
  },
  // Up-B: Comet Leap — a huge floaty leap.
  upSpecial: {
    name: 'Comet Leap',
    fire(f) { f.vy = 24; f.vx = f.facing * 4; },
    update(f, frame, game) { if (frame > 6 && frame < 20 && frame % 2 === 0) game.spark(f.x, f.y + 20, '#fff3a0', 2, true); },
  },
};
