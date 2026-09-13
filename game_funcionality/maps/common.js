// Bits every stage uses.
export function platform(x, y, w, h, solid = false) { return { x, y, w, h, solid }; }

// Deterministic "random" so background details don't flicker between frames.
export function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

export function drawPlatform(p, pl, top, side) {
  p.push(); p.noStroke();
  p.translate(pl.x, -pl.y + pl.h / 2, 0);
  p.fill(side); p.box(pl.w, pl.h, 120);
  p.translate(0, -pl.h / 2 - 1, 0); p.fill(top); p.box(pl.w + 2, 3, 122);
  p.pop();
}

export function box(p, x, y, z, w, h, d, col, emissive = false) {
  p.push(); p.noStroke(); if (emissive) { p.fill(0); p.emissiveMaterial(col); } else p.fill(col);
  p.translate(x, -y, z); p.box(w, h, d); p.pop();
}
