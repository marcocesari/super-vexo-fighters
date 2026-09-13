// One fighter: a body on the 2D plane, a state machine, and a paint job.
//
// The rules are Ultimate's (see config.js for the calibration):
//   · 3-frame jumpsquat, short hop if the button is let go, jump+attack in the
//     squat = short-hop aerial, one air jump, fast fall after the apex
//   · inputs pressed while busy are buffered and fire the moment you're free
//   · knockback = ((p/10 + p·d/20) · 200/(w+100) · 1.4 + 18) · growth + base,
//     launched at kb×0.03, slowing linearly; hitstun = kb×0.4 − 1; hitlag =
//     d×0.65 + 6 for both; tumble above 80; DI bends the launch a little
//   · shield with HP that drains, takes damage, stuns, and breaks; spot dodge,
//     rolls, directional air dodge — all with intangible frames
//   · ledge grab, ledge jump / climb / drop, double jump refreshed on grab
import { GRAVITY, FALL, FAST_FALL_MUL, GROUND_FRICTION, AIR_FRICTION, JUMPSQUAT, LANDING_LAG, AIRDODGE_LANDING_LAG, INPUT_BUFFER,
         LAUNCH_SPEED, LAUNCH_DECAY, TUMBLE_KB, HITLAG_CAP, SHIELD_HP, SHIELD_DRAIN, SHIELD_REGEN, SHIELD_BREAK_STUN,
         MODES, STOCKS, STAMINA_HP, RESPAWN_INVINCIBLE, RESPAWN_DELAY } from './config.js';
import { solveRig, drawRig, BASE_PROPS, lerpPose } from './rig.js';
import { buildClips, samplePose } from './poses.js';

const AERIALS = { neutral: 'nair', forward: 'fair', back: 'bair', up: 'uair', down: 'dair' };
const TILTS = { neutral: 'jab', forward: 'ftilt', back: 'ftilt', up: 'utilt', down: 'dtilt' };
const ATTACKS = new Set(['jab', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'nair', 'fair', 'bair', 'uair', 'dair', 'special', 'upspecial']);
const AERIAL_ATTACKS = new Set(['nair', 'fair', 'bair', 'uair', 'dair']);
const AERIAL_LAG = { nair: 6, fair: 9, bair: 9, uair: 7, dair: 12 };
// states you can't act out of
const LOCKED = new Set([...ATTACKS, 'jumpsquat', 'land', 'turn', 'hitstun', 'tumble', 'spotdodge', 'roll', 'airdodge', 'ledgeclimb', 'dazed']);
// intangible windows: [from, to] frames
const DODGE_WINDOW = { spotdodge: [3, 17], roll: [4, 17], airdodge: [2, 24] };
const DEG = Math.PI / 180;

export class Fighter {
  constructor(char, player, mode) {
    this.char = char; this.player = player; this.mode = mode;
    this.name = char.name;
    this.props = { ...BASE_PROPS, ...(char.proportions || {}) };
    this.stats = { weight: 100, walk: 9.5, run: 14.4, dash: 15, air: 9.9, airAccel: 0.5, jump: 20.6, jump2: 20.6, shortHop: 14.3,
                   fall: FALL, gravity: GRAVITY, dmgMul: 1, ...char.stats };
    this.clips = buildClips(char.clips || {});
    this.height = (this.props.hipH + this.props.torso + this.props.neck + this.props.headR * 2) * this.props.scale;
    this.percent = 0; this.hp = STAMINA_HP; this.stocks = STOCKS;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.facing = 1;
    this.kbx = 0; this.kby = 0;                                  // launch velocity, decays linearly
    this.grounded = false; this.platform = null;
    this.state = 'idle'; this.frame = 0; this.jumpsLeft = 1; this.usedUpSpecial = false; this.usedAirdodge = false;
    this.hitlag = 0; this.hitstun = 0; this.invincible = 0; this.dead = false; this.respawnTimer = 0;
    this.hitsDone = new Set(); this.shielding = false; this.shieldHP = SHIELD_HP; this.shieldStun = 0;
    this.fastFalling = false; this.spin = 0; this.spinV = 0;
    this.pose = samplePose(this.clips.idle, 0); this.blendFrom = null; this.blendT = 0;
    this.lastHitBy = null; this.flash = 0; this.buf = { attack: 0, special: 0, jump: 0, shield: 0 };
    this.ledge = null; this.ledgeCooldown = 0; this.ledgeTime = 0; this.pad = null; this.shortHopAerial = null;
    this.dodgeDir = { x: 0, y: 0 };
  }

  spawn(x, facing, y = 0) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kbx = this.kby = 0; this.facing = facing;
    this.grounded = false; this.setState('fall'); this.hitstun = 0; this.hitlag = 0; this.spin = 0; this.shieldStun = 0;
    this.jumpsLeft = 1; this.usedUpSpecial = false; this.usedAirdodge = false; this.dead = false; this.ledge = null;
    this.shieldHP = SHIELD_HP;
  }

  get clip() { return this.clips[this.state]; }
  get isAttacking() { return ATTACKS.has(this.state); }
  get inAir() { return !this.grounded; }
  get busy() { return LOCKED.has(this.state) || this.state === 'ledge'; }
  get intangible() {
    const w = DODGE_WINDOW[this.state];
    return this.invincible > 0 || (w && this.frame >= w[0] && this.frame <= w[1]) || this.state === 'ledgeclimb';
  }

  setState(s, keepFrame = false) {
    if (this.state === s && !keepFrame) return;
    this.blendFrom = this.pose; this.blendT = 5;
    this.state = s; this.frame = 0; this.hitsDone.clear();
  }

  // --------------------------------------------------------------- update
  update(pad, game) {
    this.pad = pad;
    if (this.dead) { this.respawnTimer--; if (this.respawnTimer <= 0 && this.stocks > 0) this.respawn(game); return; }
    if (this.invincible > 0) this.invincible--;
    if (this.flash > 0) this.flash--;
    if (this.ledgeCooldown > 0) this.ledgeCooldown--;
    // remember presses so they fire the moment we're free
    for (const k of ['attack', 'special', 'shield']) { if (pad[k + 'P']) this.buf[k] = INPUT_BUFFER; else if (this.buf[k] > 0) this.buf[k]--; }
    if (pad.jumpP) this.buf.jump = INPUT_BUFFER; else if (this.buf.jump > 0) this.buf.jump--;
    if (this.hitlag > 0) { this.hitlag--; return; }              // frozen on hit, both sides
    this.frame++;

    const stg = game.stage, st = this.stats;
    this.shielding = false;
    if (this.state !== 'shield') this.shieldHP = Math.min(SHIELD_HP, this.shieldHP + SHIELD_REGEN);

    if (this.state === 'ledge') return this.ledgeUpdate(pad, game);

    // ---- controls / state ----
    if (this.hitstun > 0) {
      this.hitstun--;
      if (this.state === 'tumble') { this.spin += this.spinV; this.spinV *= 0.985; }
      if (this.hitstun === 0) { this.spin = 0; this.setState(this.grounded ? 'idle' : 'fall'); }
    } else if (this.state === 'dazed') {
      if (this.frame >= SHIELD_BREAK_STUN) { this.setState('idle'); this.shieldHP = SHIELD_HP * 0.5; }
    } else if (this.state === 'jumpsquat') {
      if (this.buf.attack > 0 && !this.shortHopAerial) { this.shortHopAerial = AERIALS[this.dir({ ...pad, up: pad.up && !pad.jump ? pad.up : false }, true)]; this.buf.attack = 0; }
      if (this.frame >= JUMPSQUAT) {
        const full = pad.jump && !this.shortHopAerial;
        this.vy = full ? st.jump : st.shortHop; this.grounded = false; this.platform = null;
        this.setState('jump');
        if (this.shortHopAerial) { this.setState(this.shortHopAerial); this.shortHopAerial = null; }
      }
    } else if (this.state === 'land') {
      if (this.frame >= this.landLag) this.setState('idle');
      this.applyFriction();
    } else if (this.state === 'turn') {
      if (this.frame >= 4) this.setState(pad.x ? 'run' : 'idle');
    } else if (this.state === 'spotdodge' || this.state === 'roll') {
      if (this.state === 'roll' && this.frame >= 4 && this.frame <= 22) this.vx = this.dodgeDir.x * 10.5; else this.vx = 0;
      if (this.frame >= this.clip.len) this.setState('idle');
    } else if (this.state === 'airdodge') {
      if (this.frame <= 20 && (this.dodgeDir.x || this.dodgeDir.y)) { this.vx = this.dodgeDir.x * 13; this.vy = this.dodgeDir.y * 13; }
      else if (this.frame <= 20) { this.vy *= 0.5; this.vx *= 0.9; }
      if (this.frame >= this.clip.len) this.setState('fall');
    } else if (this.state === 'ledgeclimb') {
      this.x += (this.climbTo - this.x) * 0.25; this.y = this.ledgeY;
      if (this.frame >= this.clip.len) { this.setState('idle'); this.grounded = true; }
    } else if (this.isAttacking) {
      this.attackUpdate(pad, game);
    } else if (this.state === 'shield' && this.shieldStun > 0) {
      this.shieldStun--; this.shielding = true; this.applyFriction();
    } else if (this.grounded) {
      this.groundControl(pad, game);
    } else {
      this.airControl(pad, game);
    }

    // ---- physics ----
    const dodgingWithVel = this.state === 'airdodge' && this.frame <= 20 && (this.dodgeDir.x || this.dodgeDir.y);
    if (!this.grounded && !dodgingWithVel && this.state !== 'ledgeclimb') {
      const cap = st.fall * (this.fastFalling ? FAST_FALL_MUL : 1);
      this.vy -= st.gravity; if (this.vy < -cap) this.vy = -cap;
    }
    // launch velocity slows linearly, like Ultimate
    const ks = Math.hypot(this.kbx, this.kby);
    if (ks > 0) { const n = Math.max(0, ks - LAUNCH_DECAY) / ks; this.kbx *= n; this.kby *= n; }
    if (this.grounded && this.kby < 0) this.kby = 0;
    const prevY = this.y;
    this.x += this.vx + this.kbx; this.y += this.vy + this.kby;

    // main stage walls
    for (const pl of stg.platforms) {
      if (!pl.solid) continue;
      const inX = Math.abs(this.x - pl.x) < pl.w / 2 + 14, inY = prevY < pl.y - 2 && this.y < pl.y - 2 && this.y > pl.y - pl.h - 60;
      if (inX && inY) {
        if (this.vy > 0 && this.y + this.height > pl.y - pl.h && prevY + this.height <= pl.y - pl.h) { this.vy = 0; }
        else { this.x = pl.x + Math.sign(this.x - pl.x || 1) * (pl.w / 2 + 14); if (this.hitstun === 0) this.vx = 0; }
      }
    }
    // landing
    let landed = null;
    if (this.vy + this.kby <= 0) for (const pl of stg.platforms) {
      if (!pl.solid && pad.down && this.state !== 'tumble' && this.hitstun === 0) continue;
      if (Math.abs(this.x - pl.x) <= pl.w / 2 && prevY >= pl.y - 0.01 && this.y <= pl.y) { landed = pl; break; }
    }
    if (landed) {
      this.y = landed.y; this.vy = 0; if (this.kby < 0) this.kby = 0;
      if (!this.grounded) this.onLand(landed);
      this.grounded = true; this.platform = landed;
    } else if (this.grounded) {
      const pl = this.platform;
      if (!pl || Math.abs(this.x - pl.x) > pl.w / 2 || this.y < pl.y - 0.5) {
        if (this.state === 'roll' || this.state === 'spotdodge') { this.x = pl.x + Math.sign(this.x - pl.x) * pl.w / 2; }   // dodges never roll off
        else { this.grounded = false; this.platform = null; if (!this.busy) this.setState('fall'); }
      }
    }
    // ledge grab
    if (!this.grounded && this.hitstun === 0 && this.ledgeCooldown === 0 && !this.dead && this.state !== 'airdodge' && (this.vy + this.kby) <= 2) this.tryLedge(stg);

    // ---- blast zones ----
    const b = stg.blast;
    if (this.x < b.l || this.x > b.r || this.y < b.b || this.y > b.t) game.onKO(this);

    // ---- pose ----
    let pose = samplePose(this.clip, this.frame);
    if (this.blendT > 0 && this.blendFrom) { pose = lerpPose(pose, this.blendFrom, this.blendT / 6); this.blendT--; }
    if (this.spin) pose = { ...pose, spin: this.spin };
    this.pose = pose;
  }

  applyFriction() { const f = this.grounded ? GROUND_FRICTION : AIR_FRICTION; this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f; }

  onLand(pl) {
    this.jumpsLeft = 1; this.usedUpSpecial = false; this.usedAirdodge = false; this.fastFalling = false; this.shortHopAerial = null;
    if (this.hitstun > 0) { this.hitstun = 0; this.spin = 0; this.landLag = 12; this.setState('land'); return; }
    if (AERIAL_ATTACKS.has(this.state)) { this.landLag = AERIAL_LAG[this.state] || 8; this.setState('land'); return; }
    if (this.state === 'airdodge') { this.landLag = AIRDODGE_LANDING_LAG; this.setState('land'); return; }
    if (!this.isAttacking) { this.landLag = LANDING_LAG; this.setState('land'); }
  }

  groundControl(pad, game) {
    const st = this.stats;
    // shield / dodges
    if (pad.shield || this.buf.shield > 0) {
      if (pad.down || pad.downP) { this.buf.shield = 0; return this.setState('spotdodge'); }
      if (pad.x) { this.buf.shield = 0; this.dodgeDir = { x: Math.sign(pad.x), y: 0 }; return this.setState('roll'); }
      if (pad.shield) { this.shielding = true; this.setState('shield'); this.shieldHP -= SHIELD_DRAIN; this.applyFriction(); if (this.shieldHP <= 0) this.breakShield(game); return; }
    }
    if (this.buf.jump > 0 && pad.jumpP) { this.buf.jump = 0; this.shortHopAerial = null; return this.setState('jumpsquat'); }   // jump+attack together = short-hop aerial
    if (this.buf.attack > 0) {
      this.buf.attack = 0;
      if ((this.state === 'run' || this.state === 'dash') && Math.abs(this.vx) > st.walk) return this.setState('dashattack');
      return this.setState(TILTS[this.dir(pad)]);
    }
    if (this.buf.special > 0) { this.buf.special = 0; return this.startSpecial(pad, game); }
    if (this.buf.jump > 0) { this.buf.jump = 0; this.shortHopAerial = null; return this.setState('jumpsquat'); }
    if (pad.down) {
      if (pad.downP && this.platform && !this.platform.solid) { this.grounded = false; this.platform = null; this.y -= 2; this.setState('fall'); return; }
      this.setState('crouch'); this.applyFriction(); return;
    }
    if (pad.x) {
      const dir = Math.sign(pad.x);
      if (dir !== this.facing && (this.state === 'run' || this.state === 'dash')) { this.facing = dir; this.vx *= -0.3; return this.setState('turn'); }
      this.facing = dir;
      if (Math.abs(pad.x) < 0.6) { this.vx = dir * st.walk; return this.setState('walk'); }        // a gentle stick push walks
      if (this.state !== 'run' && this.state !== 'dash') { this.setState('dash'); this.vx = dir * st.dash; return; }
      if (this.state === 'dash' && this.frame >= 12) this.setState('run');
      this.vx = dir * (this.state === 'dash' ? st.dash : st.run);
    } else {
      this.applyFriction();
      this.setState(Math.abs(this.vx) > 2 ? 'run' : 'idle');
      if (Math.abs(this.vx) <= 2) this.vx = 0;
    }
  }

  airControl(pad, game) {
    const st = this.stats;
    if (this.buf.attack > 0) { this.buf.attack = 0; return this.setState(AERIALS[this.dir(pad)]); }
    if (this.buf.special > 0) { this.buf.special = 0; return this.startSpecial(pad, game); }
    if (this.buf.shield > 0 && !this.usedAirdodge) {
      this.buf.shield = 0; this.usedAirdodge = true;
      const dy = (pad.up ? 1 : 0) - (pad.down ? 1 : 0), dx = Math.sign(pad.x); const l = Math.hypot(dx, dy) || 1;
      this.dodgeDir = { x: dx / l, y: dy / l }; this.fastFalling = false;
      return this.setState('airdodge');
    }
    if (this.buf.jump > 0 && this.jumpsLeft > 0) { this.buf.jump = 0; this.jumpsLeft--; this.vy = st.jump2; this.fastFalling = false; if (pad.x) this.facing = Math.sign(pad.x); this.setState('jump', true); }
    if (pad.downP && this.vy <= 0) this.fastFalling = true;
    this.airDrift(pad);
    if (this.vy < 0 && this.state === 'jump') this.setState('fall');
  }

  airDrift(pad) {
    const st = this.stats;
    if (pad.x) { this.vx += Math.sign(pad.x) * st.airAccel; this.vx = Math.max(-st.air, Math.min(st.air, this.vx)); }
    else this.applyFriction();
  }

  attackUpdate(pad, game) {
    const c = this.clip;
    if (c.event && this.frame === c.event) this.fireEvent(game);
    if (this.state === 'upspecial') this.char.upSpecial?.update?.(this, this.frame, game);
    if (this.inAir) { this.airDrift(pad); if (pad.downP && this.vy <= 0) this.fastFalling = true; }
    else if (this.state === 'dashattack') this.vx *= 0.93;
    else this.applyFriction();
    if (this.frame >= c.len) this.setState(this.grounded ? 'idle' : 'fall');
  }

  startSpecial(pad, game) {
    if (pad.up) {
      if (this.usedUpSpecial) return;
      this.usedUpSpecial = true; this.setState('upspecial'); return;
    }
    this.setState('special');
  }

  fireEvent(game) {
    if (this.state === 'special') this.char.special?.fire?.(this, game);
    if (this.state === 'upspecial') { this.grounded = false; this.platform = null; this.char.upSpecial?.fire?.(this, game); }
  }

  // Which way is the stick pointing, relative to the way the fighter faces?
  dir(pad, air = this.inAir) {
    if (pad.up) return 'up';
    if (pad.down) return 'down';
    const sx = Math.sign(pad.x);
    if (sx === this.facing) return 'forward';
    if (sx === -this.facing) return air ? 'back' : (this.facing = sx, 'forward');
    return 'neutral';
  }

  // --------------------------------------------------------------- ledge
  tryLedge(stg) {
    for (const pl of stg.platforms) {
      if (!pl.solid) continue;
      for (const side of [-1, 1]) {
        const ex = pl.x + side * pl.w / 2;                       // side = -1: left ledge, grab from the left, facing right
        const outside = (this.x - ex) * side, want = -side;
        if (outside < -14 || outside > 70) continue;
        if (this.y > pl.y - 30 || this.y < pl.y - 200) continue;
        if (this.facing !== want && this.state !== 'upspecial') continue;
        this.ledge = { x: ex, y: pl.y, side, pl }; this.facing = want;
        this.x = ex + side * 26; this.y = pl.y - 190; this.vx = this.vy = this.kbx = this.kby = 0;
        this.jumpsLeft = 1; this.usedUpSpecial = false; this.usedAirdodge = false; this.fastFalling = false;
        this.invincible = Math.max(this.invincible, 40); this.ledgeTime = 0;
        this.setState('ledge'); return;
      }
    }
  }
  ledgeUpdate(pad, game) {
    const L = this.ledge, st = this.stats; this.ledgeTime++;
    const inward = -L.side;
    if (this.buf.jump > 0 || (this.ledgeTime > 6 && pad.jump)) {                              // ledge jump
      this.buf.jump = 0; this.leaveLedge(); this.vy = st.jump; this.vx = inward * st.air * 0.6; this.setState('jump'); return;
    }
    if (this.ledgeTime > 6 && Math.sign(pad.x) === inward) {                                  // climb up
      this.leaveLedge(true); this.climbTo = L.x + inward * 40; this.ledgeY = L.y; this.y = L.y; this.setState('ledgeclimb'); return;
    }
    if (this.ledgeTime > 6 && (pad.down || Math.sign(pad.x) === L.side || this.ledgeTime > 300)) {   // drop
      this.leaveLedge(); this.vy = -2; this.x += L.side * 10; this.setState('fall'); return;
    }
    this.pose = samplePose(this.clip, this.frame);
  }
  leaveLedge(climb = false) { this.ledge = null; this.ledgeCooldown = climb ? 0 : 30; this.grounded = false; this.platform = null; }

  // --------------------------------------------------------------- hits
  joints() { return solveRig(this.props, this.pose, this.facing); }
  worldJoint(j, name) { const q = j[name]; return { x: this.x + q.x, y: this.y + q.y }; }

  // Current live hitboxes in world space.
  activeHits() {
    const c = this.clip; if (!c.hits || this.hitlag) return [];
    const j = this.joints(); const out = [];
    c.hits.forEach((h, i) => {
      if (this.frame < h.from || this.frame > h.to || this.hitsDone.has(i)) return;
      const w = this.worldJoint(j, h.joint);
      out.push({ ...h, id: i, x: w.x, y: w.y, r: h.r * this.props.scale, owner: this, dmg: h.dmg * this.stats.dmgMul });
    });
    return out;
  }

  // Simple capsule hurtbox.
  hurt() { return { x: this.x, y0: this.y + 10, y1: this.y + this.height - 8, r: 18 * this.props.scale }; }

  overlaps(hx, hy, hr) {
    if (this.intangible) return false;
    const h = this.hurt();
    const cy = Math.max(h.y0, Math.min(h.y1, hy));
    return Math.hypot(hx - h.x, hy - cy) < hr + h.r;
  }

  takeHit(hit, game) {
    if (this.dead || this.intangible) return false;
    const away = Math.sign(this.x - hit.owner.x) || hit.owner.facing;
    const dmg = hit.dmg;

    if (this.shielding) {                                        // blocked
      this.shieldHP -= dmg; this.shieldStun = Math.floor(dmg * 0.8) + 3;
      this.vx = away * (2 + dmg * 0.4);
      this.hitlag = Math.floor(game.hitlag(dmg) * 0.67); if (!hit.projectile) hit.owner.hitlag = this.hitlag;
      game.spark(hit.x, hit.y, '#cfe0ff', 6); game.sfx?.play('shield', { volume: 0.7 });
      if (this.shieldHP <= 0) this.breakShield(game);
      return true;
    }

    let p;  // percent used for the formula (stamina mode: how much of the bar is gone)
    if (this.mode === MODES.STAMINA) { this.hp = Math.max(0, this.hp - dmg); p = (STAMINA_HP - this.hp) / STAMINA_HP * 120; }
    else { this.percent = Math.min(999, this.percent + dmg); p = this.percent; }

    // Ultimate's knockback formula
    const w = this.stats.weight;
    const kb = ((p / 10 + p * dmg / 20) * 200 / (w + 100) * 1.4 + 18) * hit.growth + hit.base;
    // DI: the stick bends the launch up to 18° toward where it points (perpendicular part only)
    let angle = hit.angle;
    if (this.pad && (this.pad.x || this.pad.up || this.pad.down)) {
      const a = angle * DEG, sx = Math.sign(this.pad.x) * away, sy = (this.pad.up ? 1 : 0) - (this.pad.down ? 1 : 0);
      const perp = -Math.sin(a) * sx + Math.cos(a) * sy;         // stick component perpendicular to the launch
      angle += Math.max(-1, Math.min(1, perp)) * 18;
    }
    const a = angle * DEG, speed = kb * LAUNCH_SPEED;
    this.kbx = Math.cos(a) * speed * away; this.kby = Math.sin(a) * speed;
    this.vx = 0; this.vy = 0;
    if (this.grounded && this.kby < 0) this.kby = -this.kby * 0.6;     // spiked into the floor: bounce
    if (this.kby > 0.5) { this.grounded = false; this.platform = null; }
    this.hitstun = Math.max(1, Math.round(kb * 0.4 - 1));
    this.hitlag = game.hitlag(dmg); if (!hit.projectile) hit.owner.hitlag = this.hitlag;
    this.lastHitBy = hit.owner; this.flash = 6; this.fastFalling = false; this.shieldStun = 0;
    if (this.state === 'ledge') this.leaveLedge();
    if (kb > TUMBLE_KB) { this.setState('tumble'); this.spinV = -away * this.facing * Math.min(30, kb * 0.15); this.spin = 0; }
    else this.setState('hitstun');
    game.spark(hit.x, hit.y, kb > TUMBLE_KB ? '#ffd23f' : '#fff', Math.round(6 + kb / 10));
    game.sfx?.hit(dmg, kb > TUMBLE_KB, hit.owner);
    game.shake(Math.min(16, kb * 0.09));
    if (this.mode === MODES.STAMINA && this.hp <= 0) game.onKO(this);
    return true;
  }

  breakShield(game) {
    this.shieldHP = 0; this.shielding = false; this.shieldStun = 0;
    this.vy = 12; this.grounded = false; this.platform = null;
    this.setState('dazed'); game.spark(this.x, this.y + 100, '#cfe0ff', 20); game.shake(10); game.sfx?.play('shield_break');
  }

  respawn(game) {
    const top = game.stage.respawn;
    this.percent = 0; this.spawn(top.x, this.player === 0 ? 1 : -1, top.y);
    this.invincible = RESPAWN_INVINCIBLE;
  }

  kill() { this.dead = true; this.respawnTimer = RESPAWN_DELAY; this.hitstun = 0; this.vx = this.vy = this.kbx = this.kby = 0; this.ledge = null; }

  // --------------------------------------------------------------- draw
  draw(p, t) {
    if (this.dead) return;
    if (this.invincible > 0 && this.state !== 'ledge' && this.invincible % 8 < 4) return;   // blink
    const j = this.joints();
    p.push(); p.translate(this.x, -this.y, 0);
    // ground shadow
    p.push(); p.noStroke(); p.fill(0, 0, 0, 80); p.translate(0, -1, 0); p.rotateX(Math.PI / 2);
    const gy = this.groundBelow(this.y); const sh = Math.max(0.2, 1 - (this.y - gy) / 700);
    p.translate(0, 0, -(this.y - gy)); p.ellipse(0, 0, 70 * sh, 26 * sh); p.pop();
    const ctx = { facing: this.facing, t, fighter: this };
    const ghost = this.intangible && this.invincible === 0;                      // dodging: drawn see-through
    if (this.flash > 0) {                      // hit flash: every part self-lit white
      p.push(); p.fill(40); p.emissiveMaterial(255, 235, 200); p.fill = () => {};
      drawRig(p, j, this.props, this.char.colours, this.char, ctx); delete p.fill; p.pop();
    } else if (ghost) {
      p.push(); const fill = p.fill; p.fill = (...a) => { const c = p.color(...a); c.setAlpha(120); fill.call(p, c); };
      drawRig(p, j, this.props, this.char.colours, this.char, ctx); delete p.fill; p.pop();
    } else drawRig(p, j, this.props, this.char.colours, this.char, ctx);
    if (this.shielding) {
      const k = 0.5 + 0.5 * this.shieldHP / SHIELD_HP;
      p.push(); p.fill(this.player === 0 ? p.color(255, 100, 100, 90) : p.color(100, 160, 255, 90)); p.translate(0, -this.height / 2, 0); p.sphere(this.height * 0.62 * k, 16, 12); p.pop();
    }
    p.pop();
  }

  groundBelow(y) {
    let best = -400;
    for (const pl of this._stage?.platforms || []) if (Math.abs(this.x - pl.x) <= pl.w / 2 && pl.y <= y + 1 && pl.y > best) best = pl.y;
    return best;
  }
}
