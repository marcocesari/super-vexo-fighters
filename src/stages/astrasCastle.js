// Astra's Castle — the royal battlements on a bright afternoon. Wide and
// friendly: a long stone walk, a raised keep balcony, towers each side.
import { platform, drawPlatform, box, rng } from './common.js';

const P = [platform(0, 0, 1000, 80, true), platform(0, 190, 280, 18), platform(-380, 120, 180, 16), platform(380, 120, 180, 16)];
const r = rng(3);
const clouds = []; for (let i = 0; i < 12; i++) clouds.push({ x: -2400 + r() * 4800, y: 500 + r() * 500, z: -1800 - r() * 800, s: 60 + r() * 90, v: 0.15 + r() * 0.2 });
const hills = []; for (let i = 0; i < 10; i++) hills.push({ x: -2600 + i * 600 + r() * 200, z: -2400 - r() * 400, s: 500 + r() * 400 });

export default {
  id: 'castle', name: "Astra's Castle",
  bg: [126, 190, 245], platforms: P,
  blast: { l: -1650, r: 1650, t: 1450, b: -1100 },
  spawns: [[-300, 0], [300, 0]], respawn: { x: 0, y: 450 },

  draw(p, t) {
    p.push(); p.noStroke();
    p.push(); p.translate(-900, -900, -2600); p.fill(0); p.emissiveMaterial('#fff6c8'); p.sphere(120, 16, 12); p.pop();
    p.fill('#6fb36a'); for (const h of hills) { p.push(); p.translate(h.x, 400, h.z); p.sphere(h.s, 12, 8); p.pop(); }
    p.fill('#ffffff'); for (const c of clouds) { const x = ((c.x + t * c.v + 2400) % 4800) - 2400; p.push(); p.translate(x, -c.y, c.z); p.sphere(c.s, 10, 6); p.translate(c.s * 0.9, c.s * 0.3, 0); p.sphere(c.s * 0.7, 10, 6); p.translate(-c.s * 1.8, 0, 0); p.sphere(c.s * 0.6, 10, 6); p.pop(); }
    // keep behind the walk
    box(p, 0, 120, -260, 620, 560, 300, '#d9d2c4');
    box(p, 0, 190, -105, 280, 16, 10, '#b8b0a0');
    for (let i = 0; i < 6; i++) box(p, -250 + i * 100, 300, -108, 34, 60, 6, '#3a4f7a');            // windows
    for (let i = 0; i < 12; i++) box(p, -275 + i * 50, 420, -110, 26, 30, 8, '#c9c2b4');          // crenellations
    // towers
    for (const s of [-1, 1]) {
      p.push(); p.translate(s * 560, 0, -200); p.fill('#e3dccd'); p.cylinder(90, 900, 16, 1); p.translate(0, -470, 0); p.fill('#7a3a5c'); p.cone(110, 180, 16, 1);
      p.translate(0, -160, 0); p.fill('#c0c0c0'); p.cylinder(3, 140, 6, 1); p.translate(s * -25, -50, 0); p.fill('#ffd23f'); p.box(50, 28, 2); p.pop();
    }
    // the wall below the walk
    box(p, 0, -640, -20, 940, 1200, 240, '#c9c2b4');
    for (let i = 0; i < 8; i++) for (let k = 0; k < 5; k++) box(p, -420 + i * 120 + (k % 2) * 60, -100 - k * 200, 102, 100, 3, 3, '#a89f8e');
    drawPlatform(p, P[0], '#e9e3d6', '#c9c2b4');
    for (let i = 0; i < 9; i++) box(p, -480 + i * 120, 20, 56, 40, 40, 10, '#e3dccd');   // battlements front edge
    drawPlatform(p, P[1], '#ffd23f', '#a8842a');
    drawPlatform(p, P[2], '#e9e3d6', '#a89f8e'); drawPlatform(p, P[3], '#e9e3d6', '#a89f8e');
    p.pop();
  },
};
