// Queen Caza — camel queen of the Camelloo, the camel kingdom of the sand sea.
// A tall sand-gold camel, regal in golden silks, a high crescent headdress,
// turquoise jewels, and a long cloak that trails like a dune in the wind.
import { glow } from '../rig.js';
import { camel } from './camel.js';

export default {
  id: 'caza', name: 'Queen Caza',
  tagline: 'Camel queen of the sand sea. Graceful, and the desert fights with her.',
  colours: { skin: '#d2a86a', suit: '#e8c377', armour: '#d9a441', armourLight: '#f2d58a',
             accent: '#2fb8c9', boots: '#4a3220', hands: '#d2a86a', belt: '#2fb8c9', gold: '#f0c040' },
  stats: { weight: 92, walk: 9.8, run: 14.4, air: 10.35, airAccel: 0.5, jump: 20.6, jump2: 20.6, shortHop: 14.3, dash: 15.26, fall: 11.71, gravity: 0.683, dmgMul: 1.0 },
  proportions: { neck: 20, scale: 1.04, torsoW: 32, torsoD: 19, shoulderW: 19, armR: 6, legR: 7.5 },
  cover: { clip: 'fair', frame: 12 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    camel(p, j, P, C, ctx, { dark: '#8f6a3c' });
    // headdress: gold band, tall crescent, turquoise jewel
    p.push(); p.translate(h.x, -h.y - 8 * s, h.z); p.rotateX(Math.PI / 2); p.fill(C.gold); p.torus(13 * s, 2.2 * s, 16, 6); p.pop();
    p.push(); p.translate(h.x, -h.y - 24 * s, h.z); p.fill(C.gold); p.torus(11 * s, 2.5 * s, 16, 6); p.pop();
    p.push(); p.translate(h.x, -h.y - 34 * s, h.z); p.fill('#7a4f2a'); p.box(3 * s, 20 * s, 22 * s); p.pop();   // fills the crescent
    glow(p, C.accent, () => { p.translate(h.x + f * 12 * s, -h.y - 9 * s, h.z); p.sphere(3.2 * s, 8, 6); });
    // cloak, trailing behind (hung off the hump)
    const sway = Math.sin(ctx.t * 0.06) * 3 - ctx.fighter.vx * 2;
    p.fill('#f2d58a'); p.push(); p.translate(j.chest.x - f * 22 * s + sway * 0.3, -j.chest.y + 58 * s, -3); p.rotateZ(f * (0.16 + sway * 0.01)); p.box(5 * s, 110 * s, 40 * s); p.pop();
    // skirt and sash
    p.fill(C.suit); p.push(); p.translate(j.pelvis.x, -j.pelvis.y + 16 * s, 0); p.cone(22 * s, 34 * s, 12, 1); p.pop();
    p.fill(C.accent); p.push(); p.translate((j.pelvis.x + j.chest.x) / 2, -(j.pelvis.y + j.chest.y) / 2 + 4 * s, 11 * s); p.rotateZ(f * 0.5); p.box(30 * s, 5 * s, 2 * s); p.pop();
    // gold bangles
    p.fill(C.gold); for (const w of [j.rHand, j.lHand]) { p.push(); p.translate(w.x - f * 4 * s, -w.y - 4 * s, w.z); p.rotateZ(Math.PI / 2); p.torus(5 * s, 1.5 * s, 10, 5); p.pop(); }
  },

  // B: Sandstorm — a wide, slow cloud that lingers in the way.
  special: {
    name: 'Sandstorm',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 26, y: h.y, vx: f.facing * 4, vy: 0, r: 30, life: 70, colour: '#e8c377',
                           dmg: 8, angle: 60, base: 36, growth: 0.9, owner: f });
    },
  },
  // Up-B: Mirage Leap — a long, floaty leap with a shimmer.
  upSpecial: {
    name: 'Mirage Leap',
    fire(f) { f.vy = 22; f.vx = f.facing * 5; },
    update(f, frame, game) { if (frame > 6 && frame < 24 && frame % 2 === 0) game.spark(f.x, f.y + 60, '#2fb8c9', 2, true); },
  },
};
