// Tuning knobs. A fighter is ~180 units tall; speeds are per frame at 60 fps.
//
// Physics is calibrated to Super Smash Bros. Ultimate: 1 Smash unit ≈ 8.2 of
// ours (Mario is ~22 units tall there, our fighters 180 here). Mario's gravity
// 0.087, fall speed 1.5, run 1.76, full hop 36.33 units etc. become the
// defaults below; each character scales them in its stats.
export const SMASH_UNIT = 8.2;

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
