// King Dell — king of the Dwellers, the elf kingdom of the deep forest.
// Long silver hair, pointed ears, leaf-green armour with gold trim, an
// antler crown and a cape of leaves. Fights with a longbow of thorns.
import { glow } from '../rig.js';

export default {
  id: 'dell', name: 'King Dell',
  tagline: 'King of the Dwellers. Calm, precise, deadly from a distance.',
  colours: { skin: '#e9c9a8', hair: '#d8d8d8', suit: '#1f4d2a', armour: '#2f6b3a', armourLight: '#7aa85a',
             accent: '#d8b640', boots: '#4a3222', hands: '#e9c9a8', belt: '#d8b640' },
  stats: { weight: 98, walk: 9.2, run: 13.53, air: 9.45, airAccel: 0.45, jump: 19.96, jump2: 19.89, shortHop: 13.62, dash: 14.34, fall: 12.03, gravity: 0.698, dmgMul: 1.05 },
  proportions: { scale: 1.06, torsoW: 34, torsoD: 20, shoulderW: 20 },
  cover: { clip: 'utilt', frame: 8 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // pointed ears
    p.fill(C.skin); for (const side of [-1, 1]) { p.push(); p.translate(h.x - f * 2 * s, -h.y, h.z + side * 14 * s); p.rotateX(-side * Math.PI / 2); p.rotateZ(-f * 0.5); p.cone(3.5 * s, 12 * s, 6, 1); p.pop(); }
    // long silver hair
    p.fill(C.hair); p.push(); p.translate(h.x - f * 9 * s, -h.y + 20 * s, h.z); p.box(9 * s, 48 * s, 22 * s); p.pop();
    // antler crown
    p.fill(C.accent);
    for (const side of [-1, 1]) {
      p.push(); p.translate(h.x, -h.y - 12 * s, h.z + side * 8 * s); p.rotateX(side * 0.5); p.cylinder(1.8 * s, 20 * s, 6, 1);
      p.translate(f * 3 * s, -8 * s, 0); p.rotateZ(-f * 0.7); p.cylinder(1.4 * s, 12 * s, 6, 1); p.pop();
    }
    p.push(); p.translate(h.x, -h.y - 6 * s, h.z); p.rotateX(Math.PI / 2); p.torus(13 * s, 1.6 * s, 16, 6); p.pop();
    // leaf cape
    const sway = Math.sin(ctx.t * 0.05) * 3 - ctx.fighter.vx * 2;
    p.fill('#245a2e'); p.push(); p.translate(j.chest.x - f * 12 * s + sway * 0.3, -j.chest.y + 46 * s, -3); p.rotateZ(f * (0.14 + sway * 0.01)); p.box(5 * s, 100 * s, 42 * s); p.pop();
    p.fill('#7aa85a'); for (let i = 0; i < 4; i++) { p.push(); p.translate(j.chest.x - f * 14 * s, -j.chest.y + (20 + i * 22) * s, -3 + (i % 2 ? 18 : -18) * s); p.sphere(5 * s, 6, 4); p.pop(); }
    // gold chest leaf
    glow(p, C.accent, () => { p.translate((j.pelvis.x + j.chest.x) / 2 + f * 2 * s, -(j.pelvis.y + j.chest.y) / 2 - 10 * s, 11 * s); p.rotateZ(Math.PI / 4); p.box(7 * s, 7 * s, 2 * s); });
  },

  // B: Thorn Arrow — fast, flat, long range.
  special: {
    name: 'Thorn Arrow',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 14, y: h.y, vx: f.facing * 20, vy: 0, r: 8, life: 60, colour: '#7aa85a',
                           dmg: 6, angle: 20, base: 30, growth: 0.8, owner: f });
    },
  },
  // Up-B: Vine Lift — vines haul him up.
  upSpecial: {
    name: 'Vine Lift',
    fire(f) { f.vy = 20; f.vx = f.facing * 2; },
    update(f, frame, game) { if (frame > 6 && frame < 24) { f.vy += 0.4; if (frame % 3 === 0) game.spark(f.x, f.y + 20, '#7aa85a', 2, true); } },
  },
};
