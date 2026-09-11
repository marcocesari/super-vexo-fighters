// Queen Coma — queen of the Dream Realm, where the whole kingdom goes when
// it sleeps. Pale as moonlight, eyes always half-closed, a midnight gown
// scattered with stars, a silver crescent tiara, and little stars that
// orbit her wherever she drifts. Floaty and strange.
import { glow } from '../rig.js';

export default {
  id: 'coma', name: 'Queen Coma',
  tagline: 'Queen of dreams. Drifts, dazes, and never seems to touch the ground.',
  colours: { skin: '#efe3ea', hair: '#1b1b4a', suit: '#3a1f6b', armour: '#5a2d9a', armourLight: '#8a5ad0',
             accent: '#c9c0ff', boots: '#2a1550', hands: '#efe3ea', belt: '#c9c0ff' },
  stats: { weight: 84, walk: 8.61, run: 12.22, air: 11.7, airAccel: 0.41, jump: 19.31, jump2: 21.31, shortHop: 13.62, dash: 12.95, fall: 9.2, gravity: 0.55, dmgMul: 0.95 },
  proportions: { scale: 0.98, torsoW: 30, torsoD: 18, shoulderW: 18, armR: 5.5, legR: 7 },
  cover: { clip: 'upspecial', frame: 14 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head, t = ctx.t;
    p.noStroke();
    // long dark hair, hanging almost to the knees
    p.fill(C.hair); p.push(); p.translate(h.x - f * 10 * s, -h.y + 30 * s, h.z); p.box(10 * s, 80 * s, 24 * s); p.pop();
    p.push(); p.translate(h.x + f * 6 * s, -h.y - 8 * s, h.z); p.sphere(13 * s, 10, 8); p.pop();   // fringe
    // half-closed eyes
    p.fill('#3a2a6a'); for (const side of [-1, 1]) { p.push(); p.translate(h.x + f * 12.5 * s, -h.y - 1 * s, h.z + side * 5 * s); p.box(2 * s, 1.4 * s, 4 * s); p.pop(); }
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
