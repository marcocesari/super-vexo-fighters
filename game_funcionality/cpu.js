// A computer opponent that produces the same "pad" a keyboard would.
// It thinks every few frames and holds an intent in between, so it moves
// like a player rather than twitching. Difficulty scales reaction + aggression.
import { emptyPad } from './input.js';

export class CPU {
  constructor(level = 2) { this.level = level; this.timer = 0; this.intent = { x: 0, hold: 0 }; this.pad = emptyPad(); }

  think(me, opp, stage) {
    const pad = emptyPad();
    if (me.dead || !opp) return pad;
    const main = stage.platforms[0];
    const offStage = Math.abs(me.x) > main.w / 2 + 10 || me.y < main.y - 40;
    const dx = opp.x - me.x, dy = opp.y - me.y, dist = Math.abs(dx);
    const rand = Math.random();
    const aggro = 0.12 + this.level * 0.08;

    if (me.state === 'ledge') {                               // ON THE LEDGE: climb, or ledge-jump when the enemy is close
      if (me.ledgeTime < 8) return pad;
      if (dist < 200 && rand < 0.5) { pad.jumpP = pad.jump = true; } else { pad.x = Math.sign(-me.x); pad.left = pad.x < 0; pad.right = pad.x > 0; }
      return pad;
    }
    if (offStage) {                                           // RECOVER
      pad.x = Math.sign(-me.x);
      if (me.y < main.y - 120 && Math.abs(me.x) < main.w / 2 + 60) pad.x = Math.sign(me.x) || 1;   // under the stage: get out from under it first
      if (me.vy < 0 && me.jumpsLeft > 0 && rand < 0.3) pad.jumpP = pad.jump = true;
      else if (me.vy < 2 && me.jumpsLeft === 0 && !me.usedUpSpecial) { pad.up = true; pad.specialP = true; }
      return pad;
    }
    this.timer--;
    if (this.timer <= 0) {                                    // pick a new intent
      this.timer = 8 + Math.floor(Math.random() * 10) - this.level;
      if (dist > 320) this.intent = { x: Math.sign(dx), hold: 0 };              // far: run in
      else if (dist > 150) this.intent = { x: Math.sign(dx) * 0.5, hold: 0 };   // closing: walk, keep control
      else this.intent = { x: rand < 0.25 ? -Math.sign(dx) * 0.5 : 0, hold: 0 };   // in range: plant the feet (or step back)
    }
    pad.x = this.intent.x;
    if (pad.x) { pad.left = pad.x < 0; pad.right = pad.x > 0; }

    if (!me.busy) {
      const running = me.grounded && Math.abs(me.vx) > 10;
      if (dist < 130 && Math.abs(dy) < 160 && rand < aggro && (!running || rand < aggro * 0.3)) {   // ATTACK (a dash attack only now and then)
        pad.attackP = true;
        if (dy > 90) pad.up = true;
        else if (dy < -90 && me.inAir) pad.down = true;
        else if (rand < aggro * 0.5) pad.up = true;
        else if (rand < aggro * 0.75) { pad.x = Math.sign(dx); pad.left = pad.x < 0; pad.right = pad.x > 0; }   // forward tilt…
        else { pad.x = 0; pad.left = pad.right = false; }                                                       // …or a jab
      } else if (dist > 320 && rand < 0.03 + this.level * 0.01 && me.grounded) {
        pad.specialP = true;                                   // ZONE
      } else if (opp.isAttacking && dist < 140 && me.grounded && rand < 0.25 + this.level * 0.1) {
        pad.shield = true;                                     // BLOCK
        if (rand < 0.08 * this.level) { pad.shieldP = true; pad.x = rand < 0.04 * this.level ? -Math.sign(dx) : Math.sign(dx); pad.left = pad.x < 0; pad.right = pad.x > 0; }   // ...or roll
      } else if (dy > 120 && me.grounded && rand < 0.06) {
        pad.jumpP = pad.jump = true;                               // CHASE UPWARD
      } else if (me.grounded && rand < 0.008) {
        pad.jumpP = pad.jump = true;
      }
    }
    return pad;
  }
}
