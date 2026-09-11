// Dwellers Castle — the elf kingdom's home, a castle grown out of the great
// trees, at dusk. Wooden walkways, uneven branches, lanterns in the leaves.
import { platform, drawPlatform, box, rng } from './common.js';

const P = [platform(0, 0, 860, 60, true), platform(-310, 170, 210, 16), platform(240, 250, 190, 16), platform(60, 400, 150, 14)];
const r = rng(11);
const trees = []; for (let i = 0; i < 9; i++) trees.push({ x: -1900 + i * 480 + r() * 200, z: -700 - r() * 1000, w: 120 + r() * 120, h: 1800 });
const lanterns = []; for (let i = 0; i < 14; i++) lanterns.push({ x: -1500 + r() * 3000, y: 300 + r() * 500, z: -400 - r() * 700, ph: r() * 6 });

export default {
  id: 'dwellers', name: 'Dwellers Castle',
  bg: [52, 30, 70], platforms: P,
  blast: { l: -1650, r: 1650, t: 1450, b: -1100 },
  spawns: [[-250, 0], [250, 0]], respawn: { x: 0, y: 500 },

  draw(p, t) {
    p.push(); p.noStroke();
    // dusk glow on the horizon
    box(p, 0, -200, -3000, 8000, 900, 10, '#c95a3a', true);
    // the great trees
    for (const tr of trees) {
      p.push(); p.translate(tr.x, 0, tr.z); p.fill('#4a3222'); p.cylinder(tr.w / 2, tr.h, 12, 1);
      p.translate(0, -tr.h / 2, 0); p.fill('#2f6b3a'); p.sphere(tr.w * 2.2, 12, 8);
      p.translate(tr.w, tr.w * 0.8, 0); p.fill('#3f8a48'); p.sphere(tr.w * 1.6, 12, 8); p.pop();
    }
    for (const l of lanterns) { const g = 0.6 + 0.4 * Math.sin(t * 0.05 + l.ph); p.push(); p.translate(l.x, -l.y, l.z); p.fill(0); p.emissiveMaterial(255 * g, 200 * g, 90 * g); p.sphere(9, 8, 6); p.pop(); }
    // the castle: a wooden keep wrapped round a trunk
    p.push(); p.translate(0, 300, -320); p.fill('#5a3d28'); p.cylinder(170, 2400, 16, 1); p.pop();
    box(p, 0, 120, -180, 560, 420, 200, '#7a5a3a');
    box(p, 0, 340, -180, 620, 30, 240, '#3f8a48');
    for (let i = 0; i < 5; i++) box(p, -220 + i * 110, 200, -78, 50, 80, 6, '#ffcf70', true);         // warm windows
    for (let i = 0; i < 5; i++) box(p, -220 + i * 110, 250, -76, 60, 12, 10, '#5a3d28');
    box(p, 0, 470, -250, 220, 240, 220, '#7a5a3a'); p.push(); p.translate(0, -630, -250); p.fill('#2f6b3a'); p.cone(160, 140, 12, 1); p.pop();
    // root-mass under the walkway
    p.push(); p.translate(0, 400, -40); p.rotateX(Math.PI); p.fill('#4a3222'); p.cone(480, 700, 14, 1); p.pop();
    drawPlatform(p, P[0], '#a67b4b', '#6b4a2b');
    for (let i = 0; i < 11; i++) box(p, -400 + i * 80, -3, 62, 70, 8, 4, '#8a6238');            // plank lines
    for (let i = 1; i < 4; i++) {
      drawPlatform(p, P[i], '#b98b55', '#6b4a2b');
      p.push(); p.translate(P[i].x + (P[i].x < 0 ? 60 : -60), -P[i].y + 40, -70); p.rotateZ(P[i].x < 0 ? -0.9 : 0.9); p.fill('#4a3222'); p.cylinder(14, 260, 8, 1); p.pop();   // supporting branch
    }
    p.pop();
  },
};
