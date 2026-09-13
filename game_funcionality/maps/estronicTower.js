// Estronic Tower — the roof of the tallest building in the capital, at night.
// A main roof, two side ledges and a crown platform, above a sea of neon.
import { platform, drawPlatform, box, rng } from './common.js';

const P = [platform(0, 0, 900, 70, true), platform(-290, 165, 220, 14), platform(290, 165, 220, 14), platform(0, 310, 200, 14)];

// pre-baked skyline
const r = rng(7);
const towers = [];
for (let i = 0; i < 26; i++) {
  const w = 90 + r() * 140, h = 500 + r() * 1100, x = -2200 + i * 175 + r() * 60, z = -700 - r() * 900;
  const windows = [];
  for (let k = 0; k < 40; k++) if (r() < 0.55) windows.push({ x: (r() - 0.5) * (w - 20), y: 30 + r() * (h - 60), c: r() < 0.7 ? '#ffd76a' : '#7ee8ff' });
  towers.push({ x, w, h, z, windows, col: r() < 0.5 ? '#1c2030' : '#252a3c' });
}

// The skyline is ~670 boxes. Drawn one by one that's 670 GPU calls a frame,
// which is enough to knock p5 down to 30 fps — so it's baked once into two
// meshes: the buildings (lit) and the windows (drawn unlit, so they glow).
let baked = null;
function bake(p) {
  const buildings = p.buildGeometry(() => {
    p.noStroke();
    for (const tw of towers) { p.push(); p.fill(tw.col); p.translate(tw.x, -(tw.h / 2 - 700), tw.z); p.box(tw.w, tw.h, tw.w); p.pop(); }
    p.push(); p.fill('#2a2f44'); p.translate(0, 750, -20); p.box(820, 1400, 300); p.pop();          // the tower itself
    p.push(); p.fill('#33395a'); p.translate(0, 750, 132); p.box(780, 1400, 20); p.pop();
    p.push(); p.fill('#8a90a8'); p.translate(0, -420, -60); p.box(8, 230, 8); p.pop();              // antenna
    p.push(); p.fill('#101426'); p.translate(-320, -380, -160); p.box(260, 60, 10); p.pop();        // sign board
    for (let i = 1; i < 3; i++) { p.push(); p.fill('#8a90a8'); p.translate(P[i].x, -80, -30); p.box(14, 170, 14); p.pop(); }   // struts
  });
  const windows = p.buildGeometry(() => {
    p.noStroke();
    for (const tw of towers) for (const w of tw.windows) { p.push(); p.fill(w.c); p.translate(tw.x + w.x, -(w.y - 700), tw.z + tw.w / 2 + 1); p.box(10, 14, 2); p.pop(); }
    for (let i = 0; i < 9; i++) for (let k = 0; k < 6; k++) { p.push(); p.fill((i + k) % 3 ? '#ffd76a' : '#7ee8ff'); p.translate(-360 + i * 90, 140 + k * 220, 142); p.box(40, 90, 3); p.pop(); }
  });
  baked = { buildings, windows };
}

export default {
  id: 'estronic', name: 'Estronic Tower',
  bg: [8, 10, 24], platforms: P,
  blast: { l: -1650, r: 1650, t: 1450, b: -1100 },
  spawns: [[-260, 0], [260, 0]], respawn: { x: 0, y: 450 },

  draw(p, t) {
    p.push(); p.noStroke();
    // moon
    p.push(); p.translate(700, -800, -1900); p.fill(0); p.emissiveMaterial('#f4f0d8'); p.sphere(90, 16, 12); p.pop();
    // skyline, tower, antenna, sign board, struts: two baked meshes
    if (!baked) bake(p);
    p.push(); p.fill(255); p.model(baked.buildings); p.pop();
    p.push(); p.noLights(); p.fill(255); p.model(baked.windows); p.pop();
    // the bits that move: blinking beacon, flickering neon
    box(p, 0, 540, -60, 16, 16, 16, Math.floor(t / 30) % 2 ? '#ff3b3b' : '#601010', true);
    box(p, -320, 380, -154, 230, 34, 4, Math.floor(t / 90) % 5 === 0 ? '#20303a' : '#53ff9d', true);
    // platforms
    drawPlatform(p, P[0], '#5a6180', '#3c4260');
    for (let i = 1; i < 4; i++) drawPlatform(p, P[i], '#53ff9d', '#2b7a52');
    p.pop();
  },
};
