// The title screen's background: every fighter in the game, frozen mid-move
// and piled into one dramatic shot, the way the Smash box art does it.
// Grows on its own as characters are added — each one gets a slot in the crowd.
import { Fighter } from './fighter.js';
import { solveRig, drawRig } from './rig.js';
import { samplePose } from './poses.js';
import { CHARACTERS, LOCKED_BUILDS } from './characters/index.js';

// Action poses to hand out if a character doesn't name its own (`cover: { clip, frame }`).
const POSES = [['jab', 6], ['uair', 9], ['upspecial', 12], ['fair', 12], ['ftilt', 10], ['nair', 8], ['bair', 10], ['dashattack', 9]];
const SHADOW = '#0b0c18';   // the not-yet-revealed fighters are all-black silhouettes, Smash style
const silhouette = b => ({ id: b.name.toLowerCase().replace(/\s+/g, '-'), name: b.name, locked: true,
  colours: { skin: SHADOW, hair: SHADOW, suit: SHADOW, armour: SHADOW, armourLight: SHADOW, boots: SHADOW, hands: SHADOW, belt: SHADOW },
  proportions: { ...b, name: undefined }, stats: {} });

export class Cover {
  constructor() {
    // Vexo in the middle of the front row; everyone else fans out behind him in
    // rows of 3, 4, 4, 5… so a growing roster still fits the shot.
    const order = CHARACTERS.filter(c => c.id !== 'vexo');
    const hero = CHARACTERS.find(c => c.id === 'vexo');
    const rows = [[order.shift(), hero, order.shift()].filter(Boolean)];
    for (let size = 4; order.length; size++) rows.push(order.splice(0, size));
    this.cast = [];
    rows.forEach((row, r) => row.forEach((char, i) => {
      const f = new Fighter(char, 0, 'stock');
      const [clip, frame] = char.cover ? [char.cover.clip, char.cover.frame] : POSES[(this.cast.length) % POSES.length];
      const slot = i - (row.length - 1) / 2;
      const spacing = [250, 300, 330, 340][Math.min(r, 3)];
      this.cast.push({
        char, props: f.props, pose: samplePose(f.clips[clip] || f.clips.idle, frame),
        x: slot * spacing, y: r * 85 + (r > 0 && i % 2 ? 30 : 0), z: -r * 300,
        facing: slot < 0 ? 1 : slot > 0 ? -1 : 1,
        yaw: -slot * 0.15, bob: this.cast.length * 1.7,
      });
    }));
    // the unrevealed ones (if any): a wide back row of silhouettes behind the real cast
    const m = LOCKED_BUILDS.length, backZ = -rows.length * 300 - 200;
    this.cast.push(...LOCKED_BUILDS.map((b, i) => {
      const char = silhouette(b), f = new Fighter(char, 0, 'stock');
      const [clip, frame] = POSES[(i + 3) % POSES.length];
      const slot = i - (m - 1) / 2;
      return { char, props: f.props, pose: samplePose(f.clips[clip], frame), x: slot * 195, y: rows.length * 85 + 60 + (i % 2) * 40, z: backZ - (i % 2) * 120,
               facing: slot < 0 ? 1 : -1, yaw: -slot * 0.08, bob: i * 2.3 + 1 };
    }));
    this.motes = Array.from({ length: 40 }, (_, i) => ({ x: (Math.random() - 0.5) * 1600, y: Math.random() * 700, z: -600 + Math.random() * 900, s: 3 + Math.random() * 6, ph: i }));
  }

  draw(p, game, exposure = 1) {
    const t = game.t, e = exposure;
    p.camera(Math.sin(t * 0.004) * 90, -300, 1180, 0, -230, -150, 0, 1, 0);
    p.background(5, 6, 18);
    p.noStroke();

    // sunburst, unlit
    p.noLights();
    p.push(); p.translate(0, -180, -1600);
    for (let i = 0; i < 18; i++) {
      p.push(); p.rotateZ(t * 0.0015 + i * Math.PI / 9); p.fill(255, 200, 60, 22 * e); p.plane(5000, 70); p.pop();
    }
    p.pop();
    p.push(); p.translate(0, -180, -1650); p.fill(255, 220, 120, 60 * e); p.sphere(360 * (0.6 + 0.4 * e), 16, 12); p.pop();   // core glow
    // floor
    p.push(); p.translate(0, 2, -200); p.rotateX(Math.PI / 2); p.fill(12, 14, 34); p.plane(6000, 3000); p.pop();
    for (const m of this.motes) {                                                                       // drifting embers
      const y = (m.y + t * 0.6 + m.ph * 30) % 760;
      p.push(); p.translate(m.x + Math.sin(t * 0.01 + m.ph) * 20, -y, m.z); p.fill(0); p.emissiveMaterial(255, 190, 80); p.sphere(m.s, 6, 4); p.pop();
    }

    // the cast
    p.ambientLight(95 * e, 95 * e, 110 * e);
    p.directionalLight(255 * e, 248 * e, 235 * e, -0.35, 0.75, -0.55);
    p.directionalLight(70 * e, 80 * e, 120 * e, 0.6, 0.1, 0.8);
    p.pointLight(255 * e, 160 * e, 80 * e, 0, -600, 600);
    for (const c of [...this.cast].sort((a, b) => a.z - b.z)) {
      const j = solveRig(c.props, c.pose, c.facing);
      p.push();
      p.translate(c.x, -(c.y + Math.sin(t * 0.03 + c.bob) * 5), c.z);
      p.rotateY(c.yaw);
      if (!c.char.locked) { p.push(); p.fill(0, 0, 0, 110); p.translate(0, -1, 0); p.rotateX(Math.PI / 2); p.ellipse(0, 0, 90, 34); p.pop(); }
      drawRig(p, j, c.props, c.char.colours, c.char, { facing: c.facing, t, fighter: { vx: 0 } });
      p.pop();
    }
  }
}
