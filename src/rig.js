// The shared humanoid rig.
//
// Every fighter is the same skeleton with different proportions and paint:
// a pelvis, a torso, a head, two arms (shoulder → elbow → hand) and two legs
// (hip → knee → foot → toe). A *pose* is a bag of joint angles in degrees;
// solveRig() turns it into 3D joint positions (forward kinematics) and
// drawRig() paints primitives between them. Hitboxes hang off the same joint
// positions, so what you see is what hits.
//
// Maths space is y-UP with the fighter facing +x. p5's WEBGL is y-DOWN, so
// drawing negates y. Depth (z) points at the camera: the right arm/leg sit
// at +z (in front), the left at -z (behind).
const D = Math.PI / 180;

export const BASE_PROPS = {
  hipH: 88, torso: 54, neck: 6, headR: 14,
  upperArm: 31, foreArm: 29, handR: 6.5,
  thigh: 45, shin: 42, foot: 20,
  shoulderW: 20, hipW: 11, torsoW: 34, torsoD: 20,
  armR: 6.5, legR: 8, scale: 1,
};

// Angle conventions (degrees):
//   lean      torso tilt, forward +
//   head      extra head tilt, forward +
//   xSh       shoulder, measured from hanging straight down; forward +, 180 = straight up
//   xEl       elbow bend, forward +
//   xOut      arm swung outward (toward the camera for the right arm), +
//   xHip      hip, from straight down; forward +
//   xKnee     knee bend, backward + (knees only bend one way)
//   xFoot     foot pitch, toes down +
//   pelvisY   raise/lower the whole body (crouch = negative)
//   spin      rotate the whole body about the pelvis (tumbling)
export const BASE_POSE = {
  pelvisY: 0, lean: 0, head: 0,
  lSh: 0, lEl: 0, lOut: 0, rSh: 0, rEl: 0, rOut: 0,
  lHip: 0, lKnee: 0, lFoot: 0, rHip: 0, rKnee: 0, rFoot: 0,
  spin: 0,
};

export function fullPose(partial) { return { ...BASE_POSE, ...partial }; }

export function lerpPose(a, b, t) {
  const out = {};
  for (const k in BASE_POSE) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

const v = (x, y, z) => ({ x, y, z });
const add = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
const mul = (a, s) => v(a.x * s, a.y * s, a.z * s);
// Direction of a limb hanging at angle `th` from straight down, swung `out` toward +z.
function limbDir(th, out) {
  const s = Math.sin(th * D), c = Math.cos(th * D);
  return v(s, -c * Math.cos(out * D), c * Math.sin(out * D));
}

export function solveRig(P, pose, facing = 1) {
  const s = P.scale;
  const pelvis = v(0, (P.hipH + pose.pelvisY) * s, 0);
  const up = v(Math.sin(pose.lean * D), Math.cos(pose.lean * D), 0);
  const chest = add(pelvis, mul(up, P.torso * s));
  const headDir = v(Math.sin((pose.lean + pose.head) * D), Math.cos((pose.lean + pose.head) * D), 0);
  const neck = add(chest, mul(headDir, P.neck * s));
  const head = add(neck, mul(headDir, P.headR * s));

  const shoulderBase = add(pelvis, mul(up, P.torso * 0.93 * s));
  const arm = (side, sh, el, out) => {
    const z = side * P.shoulderW * s;
    const sho = v(shoulderBase.x, shoulderBase.y, z);
    const th1 = pose.lean + sh;
    const elb = add(sho, mul(limbDir(th1, out), P.upperArm * s));
    const hand = add(elb, mul(limbDir(th1 + el, out), P.foreArm * s));
    return { sho, elb, hand };
  };
  const leg = (side, hip, knee, foot) => {
    const hipJ = v(pelvis.x, pelvis.y, side * P.hipW * s);
    const kneeJ = add(hipJ, mul(limbDir(hip, 0), P.thigh * s));
    const th2 = hip - knee;
    const footJ = add(kneeJ, mul(limbDir(th2, 0), P.shin * s));
    const fa = (th2 + foot) * D;                        // foot points forward, follows shin a little
    const toe = add(footJ, v(Math.cos(fa) * P.foot * s, Math.sin(fa) * P.foot * s, 0));
    return { hip: hipJ, knee: kneeJ, foot: footJ, toe };
  };
  const R = arm(1, pose.rSh, pose.rEl, pose.rOut), L = arm(-1, pose.lSh, pose.lEl, -pose.lOut);
  const RL = leg(1, pose.rHip, pose.rKnee, pose.rFoot), LL = leg(-1, pose.lHip, pose.lKnee, pose.lFoot);

  const j = {
    pelvis, chest, neck, head,
    rSho: R.sho, rElb: R.elb, rHand: R.hand, lSho: L.sho, lElb: L.elb, lHand: L.hand,
    rHip: RL.hip, rKnee: RL.knee, rFoot: RL.foot, rToe: RL.toe,
    lHip: LL.hip, lKnee: LL.knee, lFoot: LL.foot, lToe: LL.toe,
  };
  if (pose.spin) {                                     // tumble: whirl everything about the pelvis
    const c = Math.cos(pose.spin * D), sn = Math.sin(pose.spin * D);
    for (const k in j) {
      const dx = j[k].x - pelvis.x, dy = j[k].y - pelvis.y;
      j[k] = v(pelvis.x + dx * c - dy * sn, pelvis.y + dx * sn + dy * c, j[k].z);
    }
  }
  if (facing < 0) for (const k in j) j[k] = v(-j[k].x, j[k].y, j[k].z);
  return j;
}

// ---------- drawing ----------
export function hex(p, h) { return p.color(h); }

// A cylinder / box laid between two joints (p5 space: y negated).
export function seg(p, a, b, r, shape = 'cyl', w = r * 2, d = r * 2) {
  const dx = b.x - a.x, dy = -(b.y - a.y), dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  p.push();
  p.translate((a.x + b.x) / 2, -(a.y + b.y) / 2, (a.z + b.z) / 2);
  const ax = dz, az = -dx, al = Math.hypot(ax, az);   // axis = up × dir
  if (al > 1e-4) p.rotate(Math.acos(Math.max(-1, Math.min(1, dy / len))), [ax / al, 0, az / al]);
  else if (dy < 0) p.rotateX(Math.PI);
  if (shape === 'cyl') p.cylinder(r, len, 10, 1);
  else p.box(w, len, d);
  p.pop();
}
// Emissive (self-lit) drawing, fenced in push/pop so it never leaks into later fills.
export function glow(p, col, fn) { p.push(); p.fill(0); p.emissiveMaterial(col); fn(); p.pop(); }
export function ball(p, a, r) { p.push(); p.translate(a.x, -a.y, a.z); p.sphere(r, 12, 8); p.pop(); }

export function drawRig(p, j, P, C, char, ctx) {
  const s = P.scale;
  p.noStroke();
  // torso + pelvis
  p.fill(C.suit); seg(p, j.pelvis, j.chest, P.torsoW * s / 2, 'box', P.torsoW * s, P.torsoD * s);
  p.fill(C.armour); seg(p, j.pelvis, j.chest, 0, 'box', (P.torsoW + 4) * s, (P.torsoD - 2) * s);
  p.fill(C.belt || C.armourLight); ball(p, j.pelvis, P.hipW * 1.15 * s);
  // arms
  p.fill(C.armourLight); seg(p, j.rSho, j.rElb, P.armR * s); seg(p, j.lSho, j.lElb, P.armR * s);
  p.fill(C.suit); seg(p, j.rElb, j.rHand, P.armR * 0.9 * s); seg(p, j.lElb, j.lHand, P.armR * 0.9 * s);
  p.fill(C.hands || C.skin); ball(p, j.rHand, P.handR * s); ball(p, j.lHand, P.handR * s);
  p.fill(C.armour); ball(p, j.rSho, P.armR * 1.6 * s); ball(p, j.lSho, P.armR * 1.6 * s);
  // legs
  p.fill(C.armour); seg(p, j.rHip, j.rKnee, P.legR * s); seg(p, j.lHip, j.lKnee, P.legR * s);
  p.fill(C.suit); seg(p, j.rKnee, j.rFoot, P.legR * 0.9 * s); seg(p, j.lKnee, j.lFoot, P.legR * 0.9 * s);
  p.fill(C.armourLight); ball(p, j.rKnee, P.legR * 1.2 * s); ball(p, j.lKnee, P.legR * 1.2 * s);
  p.fill(C.boots); seg(p, j.rFoot, j.rToe, P.legR * s, 'box', P.legR * 2.2 * s, P.legR * 2 * s);
  seg(p, j.lFoot, j.lToe, P.legR * s, 'box', P.legR * 2.2 * s, P.legR * 2 * s);
  // head
  p.fill(C.skin); ball(p, j.head, P.headR * s);
  if (C.hair) {                                        // a cap of hair, set back a touch
    p.fill(C.hair);
    p.push(); p.translate(j.head.x - ctx.facing * 2 * s, -j.head.y - 4 * s, j.head.z); p.sphere(P.headR * 0.98 * s, 12, 8); p.pop();
  }
  if (char.extras) char.extras(p, j, P, C, ctx);
}
