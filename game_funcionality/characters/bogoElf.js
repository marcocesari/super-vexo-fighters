// Bogo Elf — a small, quick, mischievous Dweller. Green cap with a red
// feather, big pointed ears, ginger hair, brown tunic, curly-toed boots.
// Lightest fighter in the game: hard to hit, easy to launch.
export default {
  id: 'bogo', name: 'Bogo Elf',
  tagline: 'Tiny, cheeky, and never where you just hit.',
  colours: { skin: '#f0c9a0', hair: '#c8642a', suit: '#7a5a2a', armour: '#3f8a48', armourLight: '#5aa85a',
             accent: '#e8383a', boots: '#5a3d28', hands: '#f0c9a0', belt: '#e8b040' },
  stats: { weight: 68, walk: 10.69, run: 16.15, air: 12.15, airAccel: 0.64, jump: 21.89, jump2: 22.73, shortHop: 15.66, dash: 17.12, fall: 10.46, gravity: 0.625, dmgMul: 0.8 },
  proportions: { scale: 0.85, torsoW: 30, torsoD: 18, shoulderW: 18, headR: 16, armR: 6, legR: 7 },
  cover: { clip: 'nair', frame: 8 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // big ears
    p.fill(C.skin); for (const side of [-1, 1]) { p.push(); p.translate(h.x - f * 3 * s, -h.y + 1 * s, h.z + side * 16 * s); p.rotateX(-side * Math.PI / 2); p.rotateZ(-f * 0.4); p.cone(4.5 * s, 16 * s, 6, 1); p.pop(); }
    // cap, tilted back, with a feather
    p.fill(C.armour); p.push(); p.translate(h.x - f * 3 * s, -h.y - 16 * s, h.z); p.rotateZ(-f * 0.35); p.cone(16 * s, 28 * s, 10, 1); p.pop();
    p.fill(C.accent); p.push(); p.translate(h.x - f * 12 * s, -h.y - 22 * s, h.z + 6 * s); p.rotateZ(-f * 0.9); p.box(3 * s, 22 * s, 1.5 * s); p.pop();
    // eyes and freckles
    p.fill('#2a4a2a'); for (const side of [-1, 1]) { p.push(); p.translate(h.x + f * 14 * s, -h.y - 1 * s, h.z + side * 5.5 * s); p.sphere(2.2 * s, 6, 4); p.pop(); }
    p.fill('#c8905a'); for (let i = 0; i < 3; i++) { p.push(); p.translate(h.x + f * 14 * s, -h.y + (3 + (i % 2)) * s, h.z + (i - 1) * 5 * s); p.sphere(1 * s, 4, 3); p.pop(); }
    // curly boot tips
    p.fill(C.boots); for (const t of [j.rToe, j.lToe]) { p.push(); p.translate(t.x + f * 3 * s, -t.y - 6 * s, t.z); p.sphere(4 * s, 6, 4); p.pop(); }
  },

  // B: Acorn Toss — a little bouncing acorn.
  special: {
    name: 'Acorn Toss',
    fire(f, game) {
      const j = f.joints(); const h = f.worldJoint(j, 'rHand');
      game.addProjectile({ x: h.x + f.facing * 10, y: h.y, vx: f.facing * 9, vy: 7, gravity: -0.4, r: 9, life: 80, colour: '#8a5a2a',
                           dmg: 5, angle: 70, base: 30, growth: 0.8, owner: f, spin: true });
    },
  },
  // Up-B: Leaf Spin — spins up on a gust of leaves. Goes very high.
  upSpecial: {
    name: 'Leaf Spin',
    fire(f) { f.vy = 21; f.vx = f.facing * 3; },
    update(f, frame, game) { if (frame > 6 && frame < 28) { f.vy += 0.45; if (frame % 2 === 0) game.spark(f.x, f.y + 40, '#5aa85a', 2, true); } },
  },
};
