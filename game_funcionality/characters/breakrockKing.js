// Breakrock King — ruler of the Vulcans, the rock people of the lava river.
// A walking boulder: dark basalt skin split by glowing lava cracks, a crown
// of jagged obsidian, fists like anvils. Slowest fighter in the game, and
// nobody hits harder.
import { glow, ball } from '../rig.js';

export default {
  id: 'breakrock', name: 'Breakrock King',
  tagline: 'A mountain that walks. Slow, but every punch is an avalanche.',
  colours: { skin: '#4a4340', hair: null, suit: '#3a3330', armour: '#2e2a28', armourLight: '#5a524c',
             accent: '#ff6a1a', boots: '#262220', hands: '#3a3330', belt: '#5a524c' },
  stats: { weight: 150, walk: 5.94, run: 9.6, air: 6.3, airAccel: 0.32, jump: 18.03, jump2: 17.05, shortHop: 12.26, dash: 10.18, fall: 14.76, gravity: 0.824, dmgMul: 1.5 },
  proportions: { scale: 1.3, torsoW: 48, torsoD: 30, shoulderW: 28, armR: 10, legR: 11, handR: 9 },
  cover: { clip: 'ftilt', frame: 10 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // obsidian crown
    p.fill('#141212');
    for (let i = -2; i <= 2; i++) { p.push(); p.translate(h.x + i * 5 * s, -h.y - 14 * s, h.z + (i % 2) * 6 * s); p.rotateZ(i * 0.25); p.cone(3.5 * s, (12 + (2 - Math.abs(i)) * 5) * s, 6, 1); p.pop(); }
    // lava cracks: chest, arms, and the eyes
    const cx = (j.pelvis.x + j.chest.x) / 2, cy = (j.pelvis.y + j.chest.y) / 2;
    const pulse = 0.75 + 0.25 * Math.sin(ctx.t * 0.1);
    glow(p, p.color(255 * pulse, 106 * pulse, 26 * pulse), () => {
      p.push(); p.translate(cx + f * 6 * s, -cy - 4 * s, 15 * s); p.rotateZ(0.5); p.box(3 * s, 34 * s, 2 * s); p.pop();
      p.push(); p.translate(cx - f * 8 * s, -cy + 8 * s, 15 * s); p.rotateZ(-0.9); p.box(2.5 * s, 22 * s, 2 * s); p.pop();
      for (const a of [j.rElb, j.lElb]) { p.push(); p.translate(a.x, -a.y, a.z); p.sphere(4 * s, 6, 4); p.pop(); }
      for (const side of [-1, 1]) { p.push(); p.translate(h.x + f * 12 * s, -h.y - 2 * s, h.z + side * 5 * s); p.sphere(3 * s, 6, 4); p.pop(); }
    });
    // knuckle plates
    p.fill('#1a1716'); ball(p, { x: j.rHand.x + f * 4 * s, y: j.rHand.y, z: j.rHand.z }, 6 * s); ball(p, { x: j.lHand.x + f * 4 * s, y: j.lHand.y, z: j.lHand.z }, 6 * s);
  },

  // B: Magma Boulder — lobbed, heavy, arcs down. Terrible up close, great from a ledge.
  special: {
    name: 'Magma Boulder',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 20, y: h.y + 10, vx: f.facing * 7, vy: 9, gravity: -0.45, r: 24, life: 90, colour: '#ff6a1a',
                           dmg: 13, angle: 45, base: 48, growth: 1.05, owner: f });
    },
  },
  // Up-B: Eruption — a short, brutal launch straight up, hitting on the way.
  upSpecial: {
    name: 'Eruption',
    fire(f, game) { f.vy = 17; f.vx = f.facing * 1.5; game.spark(f.x, f.y, '#ff6a1a', 14); game.shake(8); },
    update(f, frame, game) { if (frame > 6 && frame < 18) { f.vy += 0.35; if (frame % 2 === 0) game.spark(f.x, f.y + 10, '#ff9a40', 3, true); } },
  },
};
