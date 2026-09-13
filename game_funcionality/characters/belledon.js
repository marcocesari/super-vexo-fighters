// Belledon — the bell knight. A paladin in bronze bell-shaped armour with a
// bell for a helmet, a clapper pendant, and a war hammer. Every hit rings.
import { glow } from '../rig.js';

export default {
  id: 'belledon', name: 'Belledon',
  tagline: 'The bell knight. Slow to swing, and you will hear it land.',
  colours: { skin: '#e0b890', hair: '#5a3a1a', suit: '#5a4020', armour: '#b8802a', armourLight: '#e0b060',
             accent: '#ffe28a', boots: '#4a3010', hands: '#b8802a', belt: '#e0b060' },
  stats: { weight: 122, walk: 7.72, run: 11.35, air: 8.1, airAccel: 0.38, jump: 19.31, jump2: 18.47, shortHop: 12.94, dash: 12.03, fall: 13.29, gravity: 0.756, dmgMul: 1.3 },
  proportions: { scale: 1.1, torsoW: 40, torsoD: 26, shoulderW: 24, armR: 8, legR: 9 },
  cover: { clip: 'bair', frame: 10 },

  extras(p, j, P, C, ctx) {
    const s = P.scale, f = ctx.facing, h = j.head;
    p.noStroke();
    // bell helmet: a dome with a flared rim, and a slit to see through
    p.fill(C.armourLight); p.push(); p.translate(h.x, -h.y - 4 * s, h.z); p.sphere(16.5 * s, 12, 8); p.pop();
    p.push(); p.translate(h.x, -h.y + 8 * s, h.z); p.rotateX(Math.PI); p.cone(19 * s, 12 * s, 14, 1); p.pop();
    p.fill('#1a1008'); p.push(); p.translate(h.x + f * 15 * s, -h.y - 2 * s, h.z); p.box(3 * s, 4 * s, 18 * s); p.pop();
    p.fill(C.accent); p.push(); p.translate(h.x, -h.y - 22 * s, h.z); p.sphere(3.5 * s, 8, 6); p.pop();   // the crown knob
    // bell-shaped torso armour flaring over the hips
    p.fill(C.armour); p.push(); p.translate(j.pelvis.x, -j.pelvis.y + 10 * s, 0); p.cone(27 * s, 28 * s, 14, 1); p.pop();
    // clapper pendant, swinging
    const sw = Math.sin(ctx.t * 0.07) * 0.25 - ctx.fighter.vx * 0.03;
    const cx = (j.pelvis.x + j.chest.x) / 2, cy = (j.pelvis.y + j.chest.y) / 2;
    p.push(); p.translate(cx, -cy - 18 * s, 14 * s); p.rotateZ(sw); p.fill('#7a5a2a'); p.translate(0, 12 * s, 0); p.cylinder(1.2 * s, 24 * s, 6, 1); p.translate(0, 13 * s, 0); p.fill(C.accent); p.sphere(4 * s, 8, 6); p.pop();
    // war hammer in the right hand
    const hd = j.rHand;
    p.push(); p.translate(hd.x, -hd.y, hd.z); p.rotateZ(f * 0.3);
    p.fill('#5a3a1a'); p.cylinder(2.2 * s, 60 * s, 8, 1);
    p.translate(0, -30 * s, 0); p.fill(C.armourLight); p.box(14 * s, 16 * s, 24 * s); p.pop();
  },
  clips: {   // his forward tilt is the hammer coming down
    ftilt: { len: 34, keys: [
      [0, { rSh: 170, rEl: 20, rOut: 0, lSh: 30, lEl: 60, lean: -14, lHip: 10, lKnee: 20, rHip: -6, rKnee: 12 }],
      [12, { rSh: 70, rEl: 0, rOut: 0, lSh: -20, lEl: 50, lean: 22, lHip: 30, lKnee: 30, rHip: -10, rKnee: 25, pelvisY: -10 }],
      [18, { rSh: 60, rEl: 0, rOut: 0, lSh: -20, lEl: 50, lean: 24, lHip: 30, lKnee: 30, rHip: -10, rKnee: 25, pelvisY: -12 }],
      [34, { lean: 4, lSh: 16, lEl: 40, lOut: 12, rSh: 24, rEl: 55, rOut: 18, lHip: 8, lKnee: 12, rHip: -6, rKnee: 10, pelvisY: -3 }]],
      hits: [{ from: 12, to: 18, joint: 'rHand', r: 30, dmg: 13, angle: 40, base: 48, growth: 1.1 }] },
  },

  // B: Bell Toll — a ringing shockwave. Short range, huge, hits like a gong.
  special: {
    name: 'Bell Toll',
    fire(f, game) {
      game.addProjectile({ x: f.x + f.facing * 50, y: f.y + 90 * f.props.scale, vx: f.facing * 5, vy: 0, r: 38, life: 22, colour: '#ffe28a',
                           dmg: 11, angle: 50, base: 48, growth: 1.0, owner: f });
      game.shake(10); game.spark(f.x, f.y + 100, '#ffe28a', 12, true);
    },
  },
  // Up-B: Chime Rise — rings himself upward.
  upSpecial: {
    name: 'Chime Rise',
    fire(f, game) { f.vy = 19; f.vx = f.facing * 2; game.spark(f.x, f.y + 80, '#ffe28a', 8, true); },
    update(f, frame, game) { if (frame > 6 && frame < 22) { f.vy += 0.4; if (frame % 4 === 0) game.spark(f.x, f.y + 80, '#ffe28a', 2, true); } },
  },
};
