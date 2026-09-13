// Lord Draxos — the kingdom's worst enemy. Big, slow, hits like a truck.
// Crimson-and-black plate, horns, tattered cape, purple fire in his eyes.
import { glow } from '../rig.js';

export default {
  id: 'draxos', name: 'Draxos',
  tagline: 'Heavy. Cruel. Every hit hurts.',
  colours: { skin: '#5a3a47', hair: null, suit: '#1a1016', armour: '#5b1020', armourLight: '#8a1c2c',
             accent: '#b04cff', boots: '#120a0e', hands: '#2a1a20', belt: '#8a1c2c', horn: '#d8c8a8' },
  stats: { weight: 135, walk: 7.12, run: 10.91, air: 7.2, airAccel: 0.36, jump: 19.31, jump2: 18.47, shortHop: 12.94, dash: 11.56, fall: 13.97, gravity: 0.787, dmgMul: 1.35 },
  proportions: { scale: 1.16, torsoW: 42, torsoD: 26, shoulderW: 25, armR: 8, legR: 9.5 },
  cover: { clip: 'upspecial', frame: 12 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // horns
    p.fill(C.horn);
    for (const side of [-1, 1]) {
      p.push(); p.translate(h.x - f * 2 * s, -h.y - 10 * s, h.z + side * 11 * s);
      p.rotateZ(-f * 0.5); p.rotateX(side * 0.5); p.cone(4.5 * s, 22 * s, 8, 1); p.pop();
    }
    // burning eyes
    glow(p, C.accent, () => { for (const side of [-1, 1]) { p.push(); p.translate(h.x + f * 12 * s, -h.y - 2 * s, h.z + side * 5 * s); p.sphere(2.6 * s, 6, 4); p.pop(); } });
    // shoulder spikes
    p.fill(C.armourLight);
    for (const sho of [j.rSho, j.lSho]) { p.push(); p.translate(sho.x, -sho.y - 8 * s, sho.z); p.cone(7 * s, 18 * s, 8, 1); p.pop(); }
    // cape — hangs from the shoulders, behind the body, swaying
    const sway = Math.sin(ctx.t * 0.08) * 4 + ctx.fighter.vx * -2;
    p.fill('#2a0810');
    p.push(); p.translate(j.chest.x - f * 14 * s + sway * 0.3, -j.chest.y + 48 * s, -2);
    p.rotateZ(f * (0.12 + sway * 0.01)); p.box(6 * s, 105 * s, 44 * s); p.pop();
    // chest gem
    glow(p, C.accent, () => { p.translate((j.pelvis.x + j.chest.x) / 2 + f * 2 * s, -(j.pelvis.y + j.chest.y) / 2 - 8 * s, 14 * s); p.sphere(5 * s, 8, 6); });
  },

  // B: Void Orb — slow, fat, and painful.
  special: {
    name: 'Void Orb',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 18, y: h.y, vx: f.facing * 7, vy: 0, r: 20, life: 80, colour: '#b04cff',
                           dmg: 10, angle: 40, base: 42, growth: 1.0, owner: f, spin: true });
    },
  },
  // Up-B: Dark Wings — a heavy flap that climbs and hits on the way.
  upSpecial: {
    name: 'Dark Wings',
    fire(f) { f.vy = 19; f.vx = f.facing * 2.5; },
    update(f, frame, game) { if (frame > 6 && frame < 22) { f.vy += 0.45; if (frame % 3 === 0) game.spark(f.x, f.y + 100, '#b04cff', 2, true); } },
  },
  clips: {
    // Draxos' up special is a claw swipe, bigger and stronger than the default
    upspecial: { len: 48, event: 6, keys: [
      [0, { pelvisY: -24, lean: 22, lHip: 55, lKnee: 75, rHip: 50, rKnee: 70, lSh: -40, rSh: -40, lOut: 40, rOut: 40 }],
      [6, { lean: -10, lHip: -10, lKnee: 10, rHip: 20, rKnee: 60, rSh: 170, rEl: 10, rOut: 25, lSh: 170, lEl: 10, lOut: 25 }],
      [30, { lean: -10, lHip: -10, lKnee: 10, rHip: 20, rKnee: 60, rSh: 150, rEl: 10, rOut: 60, lSh: 150, lEl: 10, lOut: 60 }],
      [48, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
      hits: [{ from: 6, to: 18, joint: 'rHand', r: 26, dmg: 8, angle: 85, base: 48, growth: 1.0 }] },
  },
};
