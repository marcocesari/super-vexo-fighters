// Smash-style camera: frames both fighters, zooms in when they're close.
export class Camera {
  constructor() { this.x = 0; this.y = 150; this.dist = 900; this.shakeT = 0; this.shakeA = 0; this.px = this.x; this.py = this.y; this.pdist = this.dist; }
  update(fighters, stage) {
    this.px = this.x; this.py = this.y; this.pdist = this.dist;     // last step's framing, for smooth drawing in between
    const live = fighters.filter(f => !f.dead);
    let minX = -200, maxX = 200, minY = 0, maxY = 250;
    if (live.length) {
      minX = Math.min(...live.map(f => f.x)); maxX = Math.max(...live.map(f => f.x));
      minY = Math.min(...live.map(f => f.y)); maxY = Math.max(...live.map(f => f.y + f.height));
    }
    const b = stage.blast;
    const tx = Math.max(b.l + 400, Math.min(b.r - 400, (minX + maxX) / 2));
    const ty = Math.max(-100, Math.min(600, (minY + maxY) / 2 + 40));
    const span = Math.max(maxX - minX + 500, (maxY - minY) * 1.6 + 400);
    const td = Math.max(750, Math.min(1700, span * 1.05));
    this.x += (tx - this.x) * 0.08; this.y += (ty - this.y) * 0.08; this.dist += (td - this.dist) * 0.06;
    if (this.shakeT > 0) this.shakeT--;
  }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = 10; }
  apply(p, a = 1) {
    const s = this.shakeT > 0 ? this.shakeA * this.shakeT / 10 : 0;
    const ox = (Math.random() - 0.5) * s, oy = (Math.random() - 0.5) * s;
    if (this.shakeT === 0) this.shakeA = 0;
    const x = this.px + (this.x - this.px) * a + ox, y = this.py + (this.y - this.py) * a - oy;
    p.camera(x, -y, this.pdist + (this.dist - this.pdist) * a, x, -y, 0, 0, 1, 0);
  }
}
