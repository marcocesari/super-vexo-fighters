// Every move, as keyframes of joint angles (see rig.js for the conventions).
//
// A clip is { len, loop, keys: [[frame, pose], ...], hits: [...], event }.
//   keys   poses are *partial*: anything not listed comes from the idle stance.
//   hits   hitboxes: a sphere of radius r glued to a joint, live from→to frames.
//          dmg = damage, angle = launch direction in degrees (0 = away from the
//          attacker, 90 = straight up, 270 = spike), base/growth = knockback (Ultimate's bkb and kbg/100).
//   event  the frame a special fires its projectile / burst.
//
// When Marco sends a screenshot of a pose, it becomes a keyframe here (or in
// a character's own overrides — see characters/*.js).
import { fullPose, lerpPose, BASE_POSE } from './rig.js';

const IDLE = { lean: 4, lSh: 16, lEl: 40, lOut: 12, rSh: 24, rEl: 55, rOut: 18, lHip: 8, lKnee: 12, rHip: -6, rKnee: 10, pelvisY: -3 };
const hit = (from, to, joint, r, dmg, angle, base, growth) => ({ from, to, joint, r, dmg, angle, base, growth });

export const CLIPS = {
  idle: { len: 90, loop: true, keys: [[0, IDLE], [45, { ...IDLE, pelvisY: -5, lean: 5, rEl: 60, lEl: 45 }], [90, IDLE]] },
  walk: { len: 32, loop: true, keys: [
    [0, { lHip: 24, lKnee: 8, rHip: -18, rKnee: 22, lSh: -14, lEl: 20, rSh: 16, rEl: 30, lean: 4 }],
    [8, { lHip: 4, lKnee: 20, rHip: -4, rKnee: 4, lSh: 0, lEl: 25, rSh: 0, rEl: 25, lean: 4, pelvisY: -3 }],
    [16, { lHip: -18, lKnee: 22, rHip: 24, rKnee: 8, lSh: 16, lEl: 30, rSh: -14, rEl: 20, lean: 4 }],
    [24, { lHip: -4, lKnee: 4, rHip: 4, rKnee: 20, lSh: 0, lEl: 25, rSh: 0, rEl: 25, lean: 4, pelvisY: -3 }],
    [32, { lHip: 24, lKnee: 8, rHip: -18, rKnee: 22, lSh: -14, lEl: 20, rSh: 16, rEl: 30, lean: 4 }]] },
  run: { len: 20, loop: true, keys: [
    [0, { lHip: 50, lKnee: 20, rHip: -35, rKnee: 75, lSh: -35, lEl: 70, rSh: 45, rEl: 90, lean: 14, pelvisY: 2 }],
    [5, { lHip: 15, lKnee: 60, rHip: -10, rKnee: 30, lSh: 0, lEl: 80, rSh: 0, rEl: 80, lean: 14, pelvisY: -4 }],
    [10, { lHip: -35, lKnee: 75, rHip: 50, rKnee: 20, lSh: 45, lEl: 90, rSh: -35, rEl: 70, lean: 14, pelvisY: 2 }],
    [15, { lHip: -10, lKnee: 30, rHip: 15, rKnee: 60, lSh: 0, lEl: 80, rSh: 0, rEl: 80, lean: 14, pelvisY: -4 }],
    [20, { lHip: 50, lKnee: 20, rHip: -35, rKnee: 75, lSh: -35, lEl: 70, rSh: 45, rEl: 90, lean: 14, pelvisY: 2 }]] },
  crouch: { len: 10, loop: true, keys: [[0, { pelvisY: -36, lean: 26, lHip: 80, lKnee: 115, rHip: 70, rKnee: 105, lSh: 30, lEl: 60, rSh: 40, rEl: 70 }]] },
  jumpsquat: { len: 4, keys: [[0, { pelvisY: -18, lean: 14, lHip: 45, lKnee: 60, rHip: 40, rKnee: 55, lSh: -20, rSh: -20 }]] },
  jump: { len: 20, keys: [[0, { lHip: 40, lKnee: 60, rHip: 30, rKnee: 70, lSh: 60, lEl: 60, rSh: 70, rEl: 70, lean: -4 }],
                          [20, { lHip: 20, lKnee: 30, rHip: 15, rKnee: 40, lSh: 70, lEl: 40, rSh: 80, rEl: 40, lOut: 30, rOut: 35, lean: 0 }]] },
  fall: { len: 30, loop: true, keys: [[0, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45, lean: -6 }],
                                      [15, { lHip: 18, lKnee: 30, rHip: 12, rKnee: 35, lSh: 88, lEl: 25, rSh: 96, rEl: 25, lOut: 45, rOut: 50, lean: -8 }],
                                      [30, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45, lean: -6 }]] },
  land: { len: 7, keys: [[0, { pelvisY: -22, lean: 18, lHip: 50, lKnee: 70, rHip: 45, rKnee: 65, lSh: 20, rSh: 25 }], [7, IDLE]] },
  shield: { len: 10, loop: true, keys: [[0, { pelvisY: -10, lean: 10, lHip: 25, lKnee: 35, rHip: 20, rKnee: 30, lSh: 60, lEl: 120, rSh: 65, rEl: 125, rOut: 10, lOut: 10 }]] },
  hitstun: { len: 10, loop: true, keys: [[0, { lean: -22, head: -10, lSh: -45, lEl: 30, rSh: -55, rEl: 30, lOut: 30, rOut: 30, lHip: 35, lKnee: 20, rHip: 45, rKnee: 25 }]] },
  tumble: { len: 10, loop: true, keys: [[0, { lean: 10, lSh: 100, lEl: 40, rSh: 120, rEl: 40, lOut: 40, rOut: 40, lHip: 40, lKnee: 60, rHip: 60, rKnee: 70 }]] },

  // ----- defence & ledge -----
  airdodge: { len: 30, keys: [[0, { lean: 20, lHip: 60, lKnee: 90, rHip: 55, rKnee: 85, lSh: 60, lEl: 110, rSh: 65, rEl: 115, lOut: 20, rOut: 20 }],
                              [6, { lean: 30, lHip: 90, lKnee: 120, rHip: 85, rKnee: 115, lSh: 80, lEl: 130, rSh: 85, rEl: 130, lOut: 10, rOut: 10, head: 20 }],
                              [24, { lean: 30, lHip: 90, lKnee: 120, rHip: 85, rKnee: 115, lSh: 80, lEl: 130, rSh: 85, rEl: 130, lOut: 10, rOut: 10, head: 20 }],
                              [30, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]] },
  spotdodge: { len: 22, keys: [[0, IDLE], [4, { pelvisY: -30, lean: -10, lHip: 60, lKnee: 100, rHip: 50, rKnee: 90, lSh: 30, lEl: 100, rSh: 40, rEl: 110, lOut: -30, rOut: -30 }],
                               [16, { pelvisY: -30, lean: -10, lHip: 60, lKnee: 100, rHip: 50, rKnee: 90, lSh: 30, lEl: 100, rSh: 40, rEl: 110, lOut: -30, rOut: -30 }], [22, IDLE]] },
  roll: { len: 28, keys: [[0, { pelvisY: -20, lean: 30, lHip: 70, lKnee: 100, rHip: 60, rKnee: 95, lSh: 70, lEl: 120, rSh: 75, rEl: 120 }],
                          [22, { pelvisY: -20, lean: 30, lHip: 70, lKnee: 100, rHip: 60, rKnee: 95, lSh: 70, lEl: 120, rSh: 75, rEl: 120 }], [28, IDLE]] },
  ledge: { len: 60, loop: true, keys: [[0, { lean: -8, lSh: 170, lEl: 10, rSh: 175, rEl: 5, lOut: 5, rOut: 5, lHip: 10, lKnee: 30, rHip: 5, rKnee: 25, pelvisY: -6 }],
                                       [30, { lean: -8, lSh: 172, lEl: 8, rSh: 176, rEl: 4, lOut: 5, rOut: 5, lHip: 14, lKnee: 34, rHip: 8, rKnee: 28, pelvisY: -10 }],
                                       [60, { lean: -8, lSh: 170, lEl: 10, rSh: 175, rEl: 5, lOut: 5, rOut: 5, lHip: 10, lKnee: 30, rHip: 5, rKnee: 25, pelvisY: -6 }]] },
  ledgeclimb: { len: 20, keys: [[0, { lean: 30, lSh: 120, lEl: 60, rSh: 130, rEl: 60, lHip: 80, lKnee: 100, rHip: 60, rKnee: 90, pelvisY: -20 }], [20, IDLE]] },
  dazed: { len: 60, loop: true, keys: [[0, { lean: -6, head: -15, lSh: 20, lEl: 20, rSh: 25, rEl: 20, lOut: 30, rOut: 30, lHip: 12, lKnee: 20, rHip: -8, rKnee: 15, pelvisY: -8 }],
                                       [30, { lean: 6, head: 15, lSh: 25, lEl: 20, rSh: 20, rEl: 20, lOut: 30, rOut: 30, lHip: 12, lKnee: 20, rHip: -8, rKnee: 15, pelvisY: -8 }],
                                       [60, { lean: -6, head: -15, lSh: 20, lEl: 20, rSh: 25, rEl: 20, lOut: 30, rOut: 30, lHip: 12, lKnee: 20, rHip: -8, rKnee: 15, pelvisY: -8 }]] },
  turn: { len: 4, keys: [[0, { lean: -6, lHip: 20, lKnee: 20, rHip: -15, rKnee: 30, lSh: 30, rSh: -10 }]] },

  // ----- ground attacks -----
  jab: { len: 16, keys: [
    [0, { ...IDLE, rSh: -15, rEl: 100, rOut: 5, lean: -2 }],
    [4, { ...IDLE, rSh: 88, rEl: 4, rOut: 0, lean: 14, lSh: -20, lEl: 60 }],
    [9, { ...IDLE, rSh: 88, rEl: 4, rOut: 0, lean: 14, lSh: -20, lEl: 60 }],
    [16, IDLE]],
    hits: [hit(4, 9, 'rHand', 20, 3, 60, 27, 0.72)] },
  ftilt: { len: 28, keys: [
    [0, { ...IDLE, rHip: -25, rKnee: 70, lean: 6, lKnee: 20, lHip: 12, rSh: 40, rEl: 80 }],
    [7, { ...IDLE, rHip: 85, rKnee: 5, rFoot: 20, lean: -12, lKnee: 18, lHip: 12, rSh: -30, rEl: 40, lSh: 40, lEl: 40 }],
    [13, { ...IDLE, rHip: 85, rKnee: 5, rFoot: 20, lean: -12, lKnee: 18, lHip: 12, rSh: -30, rEl: 40, lSh: 40, lEl: 40 }],
    [28, IDLE]],
    hits: [hit(7, 13, 'rToe', 22, 9, 35, 42, 1.07)] },
  utilt: { len: 26, keys: [
    [0, { ...IDLE, rSh: -30, rEl: 100, pelvisY: -14, lean: 12, lKnee: 30, rKnee: 30, lHip: 20, rHip: 20 }],
    [6, { ...IDLE, rSh: 175, rEl: 5, rOut: 0, pelvisY: 0, lean: -10, lKnee: 5, rKnee: 5 }],
    [12, { ...IDLE, rSh: 175, rEl: 5, rOut: 0, pelvisY: 0, lean: -10, lKnee: 5, rKnee: 5 }],
    [26, IDLE]],
    hits: [hit(6, 12, 'rHand', 22, 7, 85, 39, 1.05)] },
  dtilt: { len: 24, keys: [
    [0, { pelvisY: -36, lean: 26, lHip: 80, lKnee: 115, rHip: 70, rKnee: 105, lSh: 30, lEl: 60, rSh: 40, rEl: 70 }],
    [5, { pelvisY: -42, lean: 20, lHip: 85, lKnee: 120, rHip: 92, rKnee: 0, rFoot: 10, lSh: 50, lEl: 60, rSh: -30, rEl: 40 }],
    [11, { pelvisY: -42, lean: 20, lHip: 85, lKnee: 120, rHip: 92, rKnee: 0, rFoot: 10, lSh: 50, lEl: 60, rSh: -30, rEl: 40 }],
    [24, IDLE]],
    hits: [hit(5, 11, 'rToe', 22, 6, 75, 36, 0.97)] },
  dashattack: { len: 30, keys: [
    [0, { lean: 20, lHip: 50, lKnee: 30, rHip: -20, rKnee: 60, rSh: -40, rEl: 90, lSh: 20 }],
    [5, { lean: 30, lHip: 60, lKnee: 20, rHip: -10, rKnee: 60, rSh: 95, rEl: 0, rOut: 15, lSh: -30, lEl: 40, pelvisY: -8 }],
    [14, { lean: 30, lHip: 60, lKnee: 20, rHip: -10, rKnee: 60, rSh: 95, rEl: 0, rOut: 15, lSh: -30, lEl: 40, pelvisY: -8 }],
    [30, IDLE]],
    hits: [hit(5, 14, 'rHand', 24, 8, 50, 39, 1.0)] },

  // ----- aerials -----
  nair: { len: 30, keys: [
    [0, { lHip: -10, lKnee: 40, rHip: 20, rKnee: 60, lSh: 70, lEl: 40, rSh: 60, rEl: 40, lOut: 40, rOut: 40 }],
    [4, { lHip: -15, lKnee: 45, rHip: 70, rKnee: 5, rFoot: 15, lSh: 90, lEl: 30, rSh: 30, rEl: 60, lOut: 50, rOut: 30, lean: -8 }],
    [20, { lHip: -15, lKnee: 45, rHip: 55, rKnee: 15, rFoot: 15, lSh: 90, lEl: 30, rSh: 30, rEl: 60, lOut: 50, rOut: 30, lean: -8 }],
    [30, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
    hits: [hit(4, 20, 'rToe', 22, 8, 45, 36, 0.97)] },
  fair: { len: 32, keys: [
    [0, { rSh: 175, rEl: 20, rOut: 0, lSh: 60, lEl: 60, lOut: 30, lean: -12, lHip: 20, lKnee: 40, rHip: 10, rKnee: 50 }],
    [10, { rSh: 60, rEl: 0, rOut: 0, lSh: -20, lEl: 60, lOut: 30, lean: 24, lHip: 30, lKnee: 30, rHip: -10, rKnee: 60 }],
    [15, { rSh: 45, rEl: 0, rOut: 0, lSh: -20, lEl: 60, lOut: 30, lean: 26, lHip: 30, lKnee: 30, rHip: -10, rKnee: 60 }],
    [32, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
    hits: [hit(10, 15, 'rHand', 24, 10, 40, 42, 1.07)] },
  bair: { len: 30, keys: [
    [0, { lHip: 20, lKnee: 60, rHip: 30, rKnee: 50, lSh: 30, lEl: 60, rSh: 90, rEl: 40, rOut: 40, lean: 10 }],
    [7, { lHip: -95, lKnee: 5, lFoot: -10, rHip: 40, rKnee: 70, lSh: 120, lEl: 20, rSh: 60, rEl: 60, rOut: 30, lean: 30 }],
    [13, { lHip: -95, lKnee: 5, lFoot: -10, rHip: 40, rKnee: 70, lSh: 120, lEl: 20, rSh: 60, rEl: 60, rOut: 30, lean: 30 }],
    [30, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
    hits: [hit(7, 13, 'lToe', 24, 11, 30, 45, 1.1)] },
  uair: { len: 28, keys: [
    [0, { rHip: 40, rKnee: 80, lHip: 10, lKnee: 40, lSh: 80, lEl: 30, rSh: 40, rEl: 40, lOut: 40, rOut: 40, lean: 10 }],
    [6, { rHip: 165, rKnee: 15, rFoot: 20, lHip: 20, lKnee: 60, lSh: 100, lEl: 30, rSh: -30, rEl: 40, lOut: 40, rOut: 30, lean: -20, pelvisY: 6 }],
    [12, { rHip: 165, rKnee: 15, rFoot: 20, lHip: 20, lKnee: 60, lSh: 100, lEl: 30, rSh: -30, rEl: 40, lOut: 40, rOut: 30, lean: -20, pelvisY: 6 }],
    [28, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
    hits: [hit(6, 12, 'rToe', 24, 9, 80, 36, 1.05)] },
  dair: { len: 34, keys: [
    [0, { lHip: 60, lKnee: 90, rHip: 60, rKnee: 90, lSh: 150, lEl: 20, rSh: 150, rEl: 20, lOut: 20, rOut: 20, lean: 10 }],
    [10, { lHip: 5, lKnee: 0, rHip: 0, rKnee: 0, lFoot: 40, rFoot: 40, lSh: 170, lEl: 10, rSh: 170, rEl: 10, lOut: 25, rOut: 25, lean: 0 }],
    [16, { lHip: 5, lKnee: 0, rHip: 0, rKnee: 0, lFoot: 40, rFoot: 40, lSh: 170, lEl: 10, rSh: 170, rEl: 10, lOut: 25, rOut: 25, lean: 0 }],
    [34, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
    hits: [hit(10, 16, 'rToe', 24, 12, 270, 30, 1.05)] },

  // ----- specials (the fighter file decides what the event does) -----
  special: { len: 30, event: 9, keys: [
    [0, { ...IDLE, rSh: -30, rEl: 110, rOut: 10, lean: -6 }],
    [9, { ...IDLE, rSh: 90, rEl: 0, rOut: 0, lean: 12, lSh: -25, lEl: 50 }],
    [18, { ...IDLE, rSh: 90, rEl: 0, rOut: 0, lean: 12, lSh: -25, lEl: 50 }],
    [30, IDLE]] },
  upspecial: { len: 44, event: 6, keys: [
    [0, { pelvisY: -20, lean: 20, lHip: 50, lKnee: 70, rHip: 45, rKnee: 65, lSh: -30, rSh: -30 }],
    [6, { lean: -8, lHip: -10, lKnee: 10, rHip: 20, rKnee: 60, rSh: 178, rEl: 5, rOut: 0, lSh: -20, lEl: 30, lOut: 20 }],
    [30, { lean: -8, lHip: -10, lKnee: 10, rHip: 20, rKnee: 60, rSh: 178, rEl: 5, rOut: 0, lSh: -20, lEl: 30, lOut: 20 }],
    [44, { lHip: 15, lKnee: 25, rHip: 10, rKnee: 30, lSh: 80, lEl: 30, rSh: 90, rEl: 30, lOut: 40, rOut: 45 }]],
    hits: [hit(6, 16, 'rHand', 22, 6, 85, 42, 0.95)] },
};

CLIPS.dash = CLIPS.run;        // the initial dash uses the run cycle

// Fill the partial keyframes and precompute, once per character.
export function buildClips(overrides = {}) {
  const out = {};
  const src = { ...CLIPS, ...overrides };
  for (const name in src) {
    const c = src[name];
    out[name] = { ...c, keys: c.keys.map(([f, pose]) => [f, fullPose({ ...IDLE, ...pose })]) };
  }
  return out;
}

const ease = t => t * t * (3 - 2 * t);
export function samplePose(clip, frame) {
  const k = clip.keys;
  const f = clip.loop ? frame % clip.len : Math.min(frame, clip.len);
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const [f0, p0] = k[i - 1], [f1, p1] = k[i];
      return lerpPose(p0, p1, ease((f - f0) / Math.max(1, f1 - f0)));
    }
  }
  return k[k.length - 1][1];
}
export { IDLE, BASE_POSE };
