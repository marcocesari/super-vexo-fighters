// Headson — an Estronic security robot, model HS-1. A big square steel head
// with a single red visor-eye, an antenna, chrome plating, and a cannon in
// the chest. Heavy, methodical, and very hard to knock over.
import { glow } from '../rig.js';

export default {
  id: 'headson', name: 'Headson',
  tagline: 'Estronic security unit HS-1. Big head, bigger cannon.',
  colours: { skin: '#8fa3b8', hair: null, suit: '#3c4a5c', armour: '#6b7f95', armourLight: '#9fb3c8',
             accent: '#ff3b3b', boots: '#2b3440', hands: '#6b7f95', belt: '#9fb3c8' },
  stats: { weight: 128, walk: 7.42, run: 10.91, air: 7.65, airAccel: 0.36, jump: 18.67, jump2: 17.76, shortHop: 12.26, dash: 11.56, fall: 13.6, gravity: 0.77, dmgMul: 1.25 },
  proportions: { scale: 1.12, torsoW: 42, torsoD: 26, shoulderW: 26, armR: 8.5, legR: 9.5, headR: 15 },
  cover: { clip: 'special', frame: 12 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // the square head, over the sphere
    p.fill(C.armourLight); p.push(); p.translate(h.x, -h.y - 2 * s, h.z); p.box(30 * s, 32 * s, 32 * s); p.pop();
    p.fill(C.suit); p.push(); p.translate(h.x + f * 15 * s, -h.y - 4 * s, h.z); p.box(2 * s, 12 * s, 26 * s); p.pop();   // visor slot
    glow(p, C.accent, () => { p.translate(h.x + f * 16 * s, -h.y - 4 * s, h.z + Math.sin(ctx.t * 0.08) * 8 * s); p.box(2 * s, 6 * s, 8 * s); });   // scanning eye
    // antenna
    p.fill('#c0ccd8'); p.push(); p.translate(h.x - f * 8 * s, -h.y - 26 * s, h.z); p.cylinder(1.5 * s, 18 * s, 6, 1); p.pop();
    glow(p, Math.floor(ctx.t / 20) % 2 ? C.accent : '#602020', () => { p.translate(h.x - f * 8 * s, -h.y - 36 * s, h.z); p.sphere(3 * s, 6, 4); });
    // chest cannon + panel lights
    const cx = (j.pelvis.x + j.chest.x) / 2, cy = (j.pelvis.y + j.chest.y) / 2;
    p.fill(C.suit); p.push(); p.translate(cx + f * 10 * s, -cy - 4 * s, 14 * s); p.rotateZ(Math.PI / 2); p.cylinder(7 * s, 12 * s, 10, 1); p.pop();
    p.fill('#111'); p.push(); p.translate(cx + f * 17 * s, -cy - 4 * s, 14 * s); p.sphere(4.5 * s, 6, 4); p.pop();
    glow(p, '#53ff9d', () => { for (let i = 0; i < 3; i++) { p.push(); p.translate(cx - f * 8 * s, -cy + (6 - i * 6) * s, 14 * s); p.box(4 * s, 3 * s, 1.5 * s); p.pop(); } });
    // shoulder plates
    p.fill(C.armourLight); for (const sho of [j.rSho, j.lSho]) { p.push(); p.translate(sho.x, -sho.y - 4 * s, sho.z); p.box(16 * s, 8 * s, 16 * s); p.pop(); }
  },

  // B: Head Cannon — a thick red laser, fired from the chest.
  special: {
    name: 'Head Cannon',
    fire(f, game) {
      game.addProjectile({ x: f.x + f.facing * 40, y: f.y + 120 * f.props.scale, vx: f.facing * 18, vy: 0, r: 13, life: 55, colour: '#ff3b3b',
                           dmg: 9, angle: 25, base: 36, growth: 0.9, owner: f });
      game.shake(4);
    },
  },
  // Up-B: Rocket Head — thrusters in the boots. Not elegant. Effective.
  upSpecial: {
    name: 'Rocket Head',
    fire(f) { f.vy = 18; f.vx = f.facing * 2; },
    update(f, frame, game) { if (frame > 6 && frame < 26) { f.vy += 0.45; if (frame % 2 === 0) game.spark(f.x, f.y + 6, '#ffa040', 3, true); } },
  },
};
