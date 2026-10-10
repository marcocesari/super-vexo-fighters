# Super Vexo Fighters

> A Super Smash Bros. Ultimate–inspired brawler set in the world of
> *Super Vexo and the Mystery of the System*. Built with p5.js (WEBGL).

Fighters are 3D models built from primitives — boxes, spheres, cylinders —
fighting on a 2D plane, the way Ultimate does it. A project by Marco.

## Playing it

**▶ https://marcocesari.github.io/super-vexo-fighters/** — plays in the
browser, nothing to install.

To run it locally instead: `./start.sh` and open the address it prints (any
static server works — ES modules just can't load from `file://`).

## Playing

**Menu**: Enter on the title, then W/S or ↑↓ to pick a row, A/D or ←→ to change it, Enter to fight.

**Keyboard** — laid out like a gamepad: the left hand is the stick, the right
hand has the pad buttons on the arrow keys.

| | Key | Gamepad equivalent |
|---|---|---|
| Move | A / D | stick left / right |
| Jump (tap twice for a double jump) | W (or ←) | stick up (or X / Y) |
| Crouch · drop through platform · fast-fall | S | stick down |
| Attack | → | A |
| Special | ↓ | B |
| Shield | ↑ (or Space / Shift) | shoulders / triggers |
| Pause | Enter or Esc | Start |

Two humans and no pad? Pick the keyboard for both on the setup screen: P1 keeps
W/A/S/D + arrows, P2 gets I/J/K/L as the stick with O attack · P special · U shield.

**Gamepads** work too (Xbox, PlayStation, Switch Pro, most USB pads — plug in
and press a button; by default the first pad is Player 1 and the second Player 2,
and the **P1 / P2 controller** rows on the setup screen let either human player
pick the keyboard or any connected pad — so P1 on keys and P2 on the only
pad works too. The keyboard always works alongside): left stick / d-pad move (a gentle push walks,
hard over runs), stick up or X/Y jump, **A** attack, **B** special, any
shoulder or trigger shields, **Start** pauses. In menus: d-pad/stick to
navigate, A or Start to confirm, B to go back.

Attack + a direction picks the move, like Smash: neutral **jab**, side
**forward tilt**, up **up tilt**, down **down tilt**, attack while running
for a **dash attack**. In the air the same directions give **nair / fair /
bair / uair / dair** (dair spikes). Special + up is the **recovery move**
(once per airtime). Esc pauses.

**Super meter**: the bar under your % / lives fills every time you hit the
other fighter (about 40% of damage dealt fills it; hitting a shield fills a
little). When it's full it flashes **SUPER READY!** and your next **special
(B)** is the **super** instead: everyone else freezes, you charge up, and fire
a giant beam in your colour (28%, KOs at high damage). You can't be hit while
doing it. The meter is kept when you lose a life. A character file can swap in
its own super with `super: { fire(f, game) { … } }`.

**Movement, the Ultimate way**: everyone has a 3-frame jumpsquat; let go of
jump early for a **short hop**, press jump and attack together for a
**short-hop aerial**; one **double jump**; tap down after the apex to
**fast-fall**. On a stick, a gentle push walks and full tilt runs.
**Shield** (hold) has health that drains and takes damage — it breaks and
leaves you dazed. Shield + down is a **spot dodge**, shield + a direction a
**roll**, shield in the air a **directional air dodge** — all with
invincible frames. Fall past the edge of the stage facing it and you
**grab the ledge**: jump to ledge-jump, push toward the stage to climb, away
or down to drop. Inputs pressed during a move are **buffered** and come out
the instant you're free. Hold a direction when you're hit to **DI** the
launch a little.

**Play online** (bottom of match setup): **Create a room** or **Find rooms
nearby**, or **Join with a room code**. Location is the player's choice: the
game asks in its own screen first (**Use my location** / **Don't use
location**), and only "Use" brings up the browser's popup. With location, the
game turns it into a rough ~20 km area and only ever shares that, never the
exact spot. Without it, every room still has a **4-letter code** (no I or O) to
tell a friend. If the browser has location blocked, the game explains how to
switch it on and carries on by itself the moment it's allowed. Rooms in
your area and the ones around it are listed nearest first. Asking to join pops
up on the host's screen (**Accept / Decline**); two fight, anyone else accepted
can watch. Names are made up by the game ("Swift Rockheart 42") so nobody types
anything. There is no server: browsers find each other through public Nostr
relays (Trystero library, loaded only when you open Play online) and then talk
directly over WebRTC. The fight runs on the host; the guest sends their
buttons and gets back what to draw, so the screens can't drift apart. Code:
`game_funcionality/online.js`. Note: connected players' browsers can see each
other's internet (IP) address, as with any direct peer-to-peer game, and a few
strict networks (some schools, some phone networks) block direct connections.

**Rules**: *Stock* — damage % rises, knockback grows with it, get knocked
past the edge of the screen and lose one of 3 lives. *Stamina* — 150 HP,
first to zero (or ring-out) loses.

## Roster

| Fighter | Feel | B | ↑B |
|---|---|---|---|
| **Vexo** | balanced, quick | Tablet Pulse — a fast green bolt | Jet Boots — rocket boost |
| **Astra** | light, floaty, fastest | Star Bolt — a twinkling arcing shot | Comet Leap — huge leap |
| **Draxos** | heavy, slow, hits hardest | Void Orb — slow, fat, painful | Dark Wings — rising claw swipe |
| **King Dell** | king of the Dwellers; calm, precise | Thorn Arrow — fast, long range | Vine Lift |
| **Bogo Elf** | tiny Dweller, lightest & fastest | Acorn Toss — bouncing acorn | Leaf Spin — very high |
| **Queen Caza** | camel queen of the Camelloo; graceful | Sandstorm — slow wide cloud | Mirage Leap — long & floaty |
| **Breakrock King** | Vulcan king; slowest, strongest | Magma Boulder — lobbed, arcs | Eruption — short brutal launch |
| **Rockheart** | his son; sturdy and quicker | Heart Shard — fast crystal | Rock Climb |
| **Queen Coma** | sleepy camel queen of dreams; floaty | Sleep Dust — drifting cloud | Dream Float — slow, drifts far |
| **Headson** | Estronic security robot HS-1; heavy | Head Cannon — thick laser | Rocket Head |
| **Belledon** | the bell knight; slow hammer, hits ring | Bell Toll — huge short shockwave | Chime Rise |

## Stages

- **Estronic Tower** — the roof of the capital's tallest building, at night.
- **Astra's Castle** — the royal battlements on a bright afternoon.
- **Dwellers Castle** — the elf kingdom's castle grown out of the great trees, at dusk.

## How it's put together

```
game_funcionality/
  config.js         the physics numbers — calibrated to Ultimate (1 Smash unit ≈ 8.2 of ours)
  rig.js            the shared skeleton: pose angles → joint positions → primitives
  poses.js          every move as keyframes of joint angles + hitboxes
  fighter.js        physics, state machine, damage & knockback
  characters/       one file per fighter: colours, stats, extras (visor, horns…), specials
  maps/             one file per stage: platforms, blast zones, scenery
  cpu.js            the computer opponent
  camera.js         Smash-style framing of both fighters
  quality.js        the graphics levels, and the watchdog that picks one
  game.js           match flow, hits, projectiles, rendering
  menu.js, hud.js   DOM overlays
tools/smoke.mjs     headless CPU-vs-CPU test:  node tools/smoke.mjs
```

### Same speed on every machine

The fight is simulated in whole 1/60 s steps, and drawing is a separate thing
that happens as often as the screen can manage. `Game.draw()` is handed however
much real time has passed and pays it out in steps: `tick()` may run twice
before one `paint()` on a slow laptop, or `paint()` may be skipped entirely on a
120 Hz screen where nothing has moved yet. So a fast screen can't speed the
fight up and a slow one can't slow it down — the numbers in `config.js` mean the
same thing everywhere.

Full speed holds down to about 10 drawn frames a second. Below that the fight
goes into slow motion rather than skipping ahead, so you can still see what is
happening (`MAX_FRAME_MS` in `config.js` sets that floor).

p5 caps itself at 60 drawn frames a second unless told otherwise, which throws
away every other frame on a 120 Hz screen — so `setup()` asks for `TARGET_FPS`
(120). The fight still steps 60 times a second; the extra pictures are drawn
between steps, which is what makes them worth asking for. A slower screen or GPU
just gives what it can.

Between two steps the fighters, camera, projectiles and sparks are drawn at the
point they have actually reached (`draw(p, t, a)`, where `a` is how far along we
are). Without that, a fight stepping 45 times a second on a 60 Hz screen would
repeat every fourth frame and look like a stutter; with it, any game speed looks
smooth on any screen.

### Game speed

**Game speed** in match setup stretches time for the fight only — menus and the
title always run at full speed. It is a share of Ultimate's pace: 50%, 65%,
**75% (the default)**, 85%, 100%. Because it stretches time rather than changing
any number, every move keeps exactly its authored frame data: nothing becomes
stronger, weaker, safer or harder to punish, there is just more of a second
between frames. The match clock counts game seconds, so at 75% it runs slower
than a real clock. The speeds live in `SPEEDS` in `config.js`.

`quality.js` is the other half: **Graphics** in match setup is *Auto* by
default, which watches the real frame rate and steps between High, Medium and
Low — canvas resolution first, then the detail of round shapes, ground shadows,
spark counts and the title screen's sunburst. A level that fails twice is not
offered again, so a borderline machine settles instead of flickering between two
looks. Set it to High / Medium / Low by hand to pin it; the choice is remembered
in the browser. The in-match readout (top right) shows drawn frames per second
and the current level.

### Adding a move from a video / screenshot

Every pose is a handful of angles in degrees (conventions at the top of
`rig.js`): `lean`, `rSh`/`rEl` (right shoulder / elbow), `rHip`/`rKnee`, and
so on. A move is a list of `[frame, pose]` keyframes plus hitboxes glued to a
joint (`rHand`, `rToe`, …). To reproduce a pose from a screenshot, add or
edit a keyframe in `poses.js` (all fighters) or under `clips:` in a
character file (that fighter only).

## The title intro

The menu track ("1-02 - Menu", `assets/audio/menu_music.mp3`) runs at 137 BPM and
conducts the whole intro (`game_funcionality/intro.js`):

1. The music starts from its first note, with the crowd on the cover
   brightening from dim to full.
2. 1 s in, Marco's voice-over (`assets/audio/title_voice.mp3`, cut so its words are
   two beats and one bar apart at the track's 137 BPM) hits: **SU-PER**
   slides in from the left, **VEXO** from the right, **FIGH-TERS** flies in
   from the screen.
3. One bar after "Fighters", **PRESS Ⓐ TO START** drops in one letter per
   16th note — the line fills exactly one bar — then bobs in time with the music.
   first downbeat — then bobs in time with the music.

Everything is timed off the music's own clock, so it can't drift. If the
browser won't play sound before a click, the title animates on a plain timer
and the music joins in at the right spot on the first click or key. The menu music keeps looping through the setup screen; a match plays
`assets/audio/battle_music.mp3` ("1-03 - Battlefield") instead, which drops to a
murmur on the results screen.

## Sound effects

Every landed punch plays Marco's `assets/audio/game_hit.mp3` — a little louder
and deeper the harder the hit (Belledon's hits ring a bell on top). The other
sounds are from Kenney's [Impact Sounds](https://kenney.nl/assets/impact-sounds)
pack (CC0 — public domain, licence in `assets/audio/`), converted to `.wav`:
a metallic clank for blocked hits, glass for a shield break, and a heavy plate
for a KO — each from a few variants with a little random pitch so no two sound
the same.
