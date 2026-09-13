// Queen Coma — the sleepy camel queen of the Dream Realm, where the whole
// Camelloo goes when it sleeps. A pale moon-cream camel with heavy lids, a
// midnight mane, a star-scattered gown, a silver crescent tiara, and little
// stars that orbit her wherever she drifts. Floaty and strange.
import { glow } from '../rig.js';
import { camel } from './camel.js';

export default {
  id: 'coma', name: 'Queen Coma',
  tagline: 'Camel queen of dreams. Drifts, dazes, and never seems to touch the ground.',
  colours: { skin: '#f1e6d6', mane: '#1b1b4a', suit: '#3a1f6b', armour: '#5a2d9a', armourLight: '#8a5ad0',
             accent: '#c9c0ff', boots: '#2a1550', hands: '#f1e6d6', belt: '#c9c0ff' },
  stats: { weight: 84, walk: 8.61, run: 12.22, air: 11.7, airAccel: 0.41, jump: 19.31, jump2: 21.31, shortHop: 13.62, dash: 12.95, fall: 9.2, gravity: 0.55, dmgMul: 0.95 },
  proportions: { neck: 20, scale: 0.98, torsoW: 30, torsoD: 18, shoulderW: 18, armR: 5.5, legR: 7 },
  cover: { clip: 'upspecial', frame: 14 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head, t = ctx.t;
    camel(p, j, P, C, ctx, { dark: '#cdb8c8', eye: '#3a2a6a', sleepy: true });
    // a midnight mane down the back of the neck, on to the hump
    p.fill(C.mane); for (let i = 0; i < 5; i++) { const k = i / 4, x = h.x + (j.chest.x - h.x) * k, y = h.y + (j.chest.y - h.y) * k; p.push(); p.translate(x - f * 7 * s, -y - (i ? 0 : 6) * s, 0); p.sphere((6.5 - i * 0.5) * s, 8, 6); p.pop(); }
    // crescent tiara
    glow(p, '#e8e8ff', () => { p.translate(h.x + f * 4 * s, -h.y - 15 * s, h.z); p.rotateZ(f * 0.3); p.torus(6 * s, 1.6 * s, 12, 5); });
    // star gown
    p.fill(C.suit); p.push(); p.translate(j.pelvis.x, -j.pelvis.y + 26 * s, 0); p.cone(28 * s, 56 * s, 14, 1); p.pop();
    glow(p, C.accent, () => { for (let i = 0; i < 6; i++) { p.push(); p.translate(j.pelvis.x + Math.sin(i * 2.1) * 14 * s, -j.pelvis.y + (14 + i * 6) * s, Math.cos(i * 2.1) * 14 * s + 6 * s); p.sphere(1.6 * s, 4, 3); p.pop(); } });
    // orbiting stars
    glow(p, '#fff3b0', () => { for (let i = 0; i < 3; i++) { const a = t * 0.05 + i * 2.1; p.push(); p.translate(j.chest.x + Math.cos(a) * 34 * s, -j.chest.y - 10 * s - Math.sin(a * 1.3) * 12 * s, Math.sin(a) * 34 * s); p.sphere(2.4 * s, 5, 4); p.pop(); } });
  },

  // B: Sleep Dust — a slow, drifting cloud. Weak, but it floats forever.
  special: {
    name: 'Sleep Dust',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 20, y: h.y, vx: f.facing * 3.5, vy: 0.6, gravity: -0.02, r: 22, life: 110, colour: '#c9c0ff',
                           dmg: 6, angle: 80, base: 30, growth: 0.88, owner: f });
    },
  },
  // Up-B: Dream Float — rises slowly and drifts a long way.
  upSpecial: {
    name: 'Dream Float',
    fire(f) { f.vy = 13; f.vx = f.facing * 4; },
    update(f, frame, game) { if (frame > 6 && frame < 40) { f.vy += 0.5; if (frame % 3 === 0) game.spark(f.x, f.y + 60, '#c9c0ff', 2, true); } },
  },
};
