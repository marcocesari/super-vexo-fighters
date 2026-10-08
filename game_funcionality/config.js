// Tuning knobs. A fighter is ~180 units tall; speeds are per frame at 60 fps.
//
// Physics is calibrated to Super Smash Bros. Ultimate: 1 Smash unit ≈ 8.2 of
// ours (Mario is ~22 units tall there, our fighters 180 here). Mario's gravity
// 0.087, fall speed 1.5, run 1.76, full hop 36.33 units etc. become the
// defaults below; each character scales them in its stats.
export const SMASH_UNIT = 8.2;

// ---------------------------------------------------------------- the clock
// The fight is simulated in whole 1/60 s steps, however often the screen
// actually gets drawn (see Game.draw). Everything below is in milliseconds.
export const STEP_MS = 1000 / 60;
// A gap longer than this (alt-tab, loading a sound) counts as this long, so the
// match can never fast-forward through six frames of action unseen. It is also
// what sets the floor: a machine drawing 10 pictures a second still gets its
// full 60 steps; slower than that and the fight goes into slow motion, which at
// least stays playable.
export const MAX_FRAME_MS = 100;
export const MAX_CATCHUP_STEPS = 8;      // a safety net on top of MAX_FRAME_MS, so one frame can never run away

// How many pictures a second we ask the browser for. p5 caps itself at 60
// unless told otherwise, which on a 120 Hz screen throws away every other
// frame. The fight still steps 60 times a second whatever this says — the extra
// pictures are drawn *between* steps (see Game.draw), which is what makes them
// worth asking for. A screen slower than this simply gives what it can.
export const TARGET_FPS = 120;
export const SNAP_TOLERANCE = 0.1;       // a frame within 10% of a whole number of steps counts as exactly that many

// How fast the fight runs, as a share of Ultimate's own pace. This stretches
// time itself — every move, jump and launch keeps exactly its authored frame
// data, there is just more of a second between frames — so nothing below has to
// be re-tuned and nothing goes out of sync. Menus always run at full speed.
export const SPEEDS = [
  { label: '50% · half speed', mul: 0.5 },
  { label: '65%', mul: 0.65 },
  { label: '75%', mul: 0.75 },
  { label: '85%', mul: 0.85 },
  { label: '100% · Ultimate speed', mul: 1 },
];
export const DEFAULT_SPEED = 2;

export const GRAVITY = 0.71;             // Mario: 0.087 u/f²
export const FALL = 12.3;                // Mario: 1.5 u/f
export const FAST_FALL_MUL = 1.6;        // Ultimate: fast fall = 1.6 × fall speed
export const GROUND_FRICTION = 0.66;     // Mario: 0.081 u/f
export const AIR_FRICTION = 0.08;

export const JUMPSQUAT = 3;              // universal in Ultimate
export const LANDING_LAG = 2;            // a normal landing; aerials have their own
export const AIRDODGE_LANDING_LAG = 10;
export const INPUT_BUFFER = 8;           // frames a press is remembered while busy

// Knockback → motion. Ultimate launches at kb × 0.03 u/f and slows that
// launch speed by 0.051 u/f every frame (linear, not a fade).
export const LAUNCH_SPEED = 0.03 * SMASH_UNIT;
export const LAUNCH_DECAY = 0.051 * SMASH_UNIT;
export const TUMBLE_KB = 80;             // knockback above this puts you in a tumble
export const HITLAG_CAP = 30;

export const SHIELD_HP = 50;
export const SHIELD_DRAIN = 0.12, SHIELD_REGEN = 0.1;
export const SHIELD_BREAK_STUN = 150;

export const MODES = { STOCK: 'stock', STAMINA: 'stamina' };
export const STOCKS = 3;
export const STAMINA_HP = 150;
export const RESPAWN_INVINCIBLE = 120;
export const RESPAWN_DELAY = 70;

// The super meter: hitting the other fighter fills it (a blocked hit fills a
// little); when it's full, B (neutral special) fires the super instead.
export const SUPER_MAX = 100;
export const SUPER_GAIN = 2.5;           // meter per 1% of damage dealt → about 40% of damage fills it
export const SUPER_BLOCK_GAIN = 0.8;     // per 1% that hits a shield
export const SUPER_FREEZE = 24;          // frames the other fighter is frozen when the super starts
