// The camel body shared by the two queens of the Camelloo. Everything hangs on
// the normal skeleton (so every pose and move still works) and is drawn in
// profile, the way the fighters are seen: a long muzzle with a drooping lip,
// big lashed eyes, floppy ears, a hump on the back and a tufted tail.
//   C.skin  fur      C.boots  hooves
//   o.dark  muzzle / tail colour   o.eye  iris   o.sleepy  half-closed lids
import { seg, ball } from '../rig.js';

export function camel(p, j, P, C, ctx, o = {}) {
  const s = P.scale, f = ctx.facing, h = j.head, fur = C.skin, dark = o.dark || C.boots;
  p.noStroke();
  // the long neck (the rig leaves the neck bare; the queens set theirs long)
  p.fill(fur); seg(p, j.chest, j.neck, 7 * s); ball(p, j.chest, 8 * s);
  // muzzle: a long snout out the front of the head, the lower lip hanging a little
  p.fill(fur); p.push(); p.translate(h.x + f * 15 * s, -h.y + 2 * s, h.z); p.ellipsoid(11.5 * s, 6.5 * s, 6.5 * s, 12, 8); p.pop();
  p.fill(dark); p.push(); p.translate(h.x + f * 23 * s, -h.y + 5 * s, h.z); p.ellipsoid(4 * s, 3 * s, 5 * s, 8, 6); p.pop();
  p.fill('#1a120c'); for (const z of [-1, 1]) { p.push(); p.translate(h.x + f * 25 * s, -h.y + 0.5 * s, h.z + z * 2.5 * s); p.sphere(1.1 * s, 6, 4); p.pop(); }
  // eyes: big and dark, with a heavy lash line (the queens' lids droop)
  for (const z of [-1, 1]) {
    p.fill('#fff'); p.push(); p.translate(h.x + f * 9 * s, -h.y - 4 * s, h.z + z * 9 * s); p.sphere(3.2 * s, 8, 6); p.pop();
    p.fill(o.eye || '#2a1a10'); p.push(); p.translate(h.x + f * 10.5 * s, -h.y - 4 * s, h.z + z * 10 * s); p.sphere(2 * s, 8, 6); p.pop();
    p.fill(fur); p.push(); p.translate(h.x + f * 9 * s, -h.y - (o.sleepy ? 5 : 7) * s, h.z + z * 9.5 * s); p.box(7 * s, o.sleepy ? 3.5 * s : 2 * s, 5 * s); p.pop();   // lid
    p.fill('#1a120c'); p.push(); p.translate(h.x + f * 10 * s, -h.y - (o.sleepy ? 3.2 : 6) * s, h.z + z * 10 * s); p.rotateZ(f * 0.25); p.box(7 * s, 1 * s, 3 * s); p.pop();   // lashes
  }
  // ears, flopped out to the sides
  p.fill(fur); for (const z of [-1, 1]) { p.push(); p.translate(h.x - f * 2 * s, -h.y - 11 * s, h.z + z * 12 * s); p.rotateX(z * 0.7); p.ellipsoid(2.5 * s, 6.5 * s, 3.5 * s, 8, 6); p.pop(); }
  p.fill(dark); for (const z of [-1, 1]) { p.push(); p.translate(h.x - f * 1 * s, -h.y - 12 * s, h.z + z * 13 * s); p.rotateX(z * 0.7); p.ellipsoid(1.2 * s, 4 * s, 2 * s, 6, 4); p.pop(); }
  // the hump, riding on the upper back
  p.fill(fur); p.push(); p.translate(j.chest.x - f * (P.torsoW / 2 + 1) * s, -j.chest.y + 10 * s, 0); p.sphere((o.hump || 11) * s, 12, 8); p.pop();
  // tail: a thin rope off the rump with a dark tuft, swinging with the walk
  const a = 0.6 + Math.sin(ctx.t * 0.08) * 0.15 + ctx.fighter.vx * 0.02, len = 26 * s;
  const rx = j.pelvis.x - f * 10 * s, ry = -j.pelvis.y + 2 * s, dx = -f * Math.sin(a), dy = Math.cos(a);
  p.fill(fur); p.push(); p.translate(rx + dx * len / 2, ry + dy * len / 2, 0); p.rotateZ(f * a); p.cylinder(1.6 * s, len, 6, 1); p.pop();
  p.fill(dark); p.push(); p.translate(rx + dx * len, ry + dy * len, 0); p.sphere(3.5 * s, 8, 6); p.pop();
}
