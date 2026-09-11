# Super Vexo Fighters

> A Super Smash Bros. Ultimate–inspired brawler set in the world of
> *Super Vexo and the Mystery of the System*. Built with p5.js (WEBGL).

Fighters are 3D models built from primitives — boxes, spheres, cylinders —
fighting on a 2D plane, the way Ultimate does it. A project by Marco.

## Running it

```bash
./start.sh          # then open http://localhost:8080
```

(Any static server works — ES modules just can't load from `file://`.)

## Playing

**Menu**: Enter on the title, then ↑↓ to pick a row, ←→ to change it, Enter to fight.

| | P1 | P2 |
|---|---|---|
| Move | A / D | ← / → |
| Jump (tap twice for a double jump) | W | ↑ |
| Crouch · drop through platform · fast-fall | S | ↓ |
| Attack | F | K |
| Special | G | L |
| Shield | H | ; |

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
| **Queen Caza** | queen of the Camelloo; graceful | Sandstorm — slow wide cloud | Mirage Leap — long & floaty |
| **Breakrock King** | Vulcan king; slowest, strongest | Magma Boulder — lobbed, arcs | Eruption — short brutal launch |
| **Rockheart** | his son; sturdy and quicker | Heart Shard — fast crystal | Rock Climb |
| **Queen Coma** | queen of dreams; floaty, strange | Sleep Dust — drifting cloud | Dream Float — slow, drifts far |
| **Headson** | Estronic security robot HS-1; heavy | Head Cannon — thick laser | Rocket Head |
| **Belledon** | the bell knight; slow hammer, hits ring | Bell Toll — huge short shockwave | Chime Rise |

## Stages

- **Estronic Tower** — the roof of the capital's tallest building, at night.
- **Astra's Castle** — the royal battlements on a bright afternoon.
- **Dwellers Castle** — the elf kingdom's castle grown out of the great trees, at dusk.

## How it's put together

```
src/
  config.js         the physics numbers — calibrated to Ultimate (1 Smash unit ≈ 8.2 of ours)
  rig.js            the shared skeleton: pose angles → joint positions → primitives
  poses.js          every move as keyframes of joint angles + hitboxes
  fighter.js        physics, state machine, damage & knockback
  characters/       one file per fighter: colours, stats, extras (visor, horns…), specials
  stages/           one file per stage: platforms, blast zones, scenery
  cpu.js            the computer opponent
  camera.js         Smash-style framing of both fighters
  game.js           match flow, hits, projectiles, rendering
  menu.js, hud.js   DOM overlays
tools/smoke.mjs     headless CPU-vs-CPU test:  node tools/smoke.mjs
```

### Adding a move from a video / screenshot

Every pose is a handful of angles in degrees (conventions at the top of
`rig.js`): `lean`, `rSh`/`rEl` (right shoulder / elbow), `rHip`/`rKnee`, and
so on. A move is a list of `[frame, pose]` keyframes plus hitboxes glued to a
joint (`rHand`, `rToe`, …). To reproduce a pose from a screenshot, add or
edit a keyframe in `poses.js` (all fighters) or under `clips:` in a
character file (that fighter only).

## The title intro

The menu track ("1-02 - Menu", `assets/menu_music.mp3`) runs at 137 BPM and
conducts the whole intro (`src/intro.js`):

1. The music starts from its first note, with the crowd on the cover
   brightening from dim to full.
2. 1 s in, Marco's voice-over (`assets/title_voice.wav`, cut so its words are
   two beats and one bar apart at the track's 137 BPM) hits: **SU-PER**
   slides in from the left, **VEXO** from the right, **FIGH-TERS** flies in
   from the screen.
3. One bar after "Fighters", **PRESS Ⓐ TO START** drops in one letter per
   16th note — the line fills exactly one bar — then bobs in time with the music.
   first downbeat — then bobs in time with the music.

Everything is timed off the music's own clock, so it can't drift. If the
browser won't play sound before a click, a "click or press any key" screen
comes first. The menu music keeps looping through the setup screen; a match plays
`assets/battle_music.mp3` ("1-03 - Battlefield") instead, which drops to a
murmur on the results screen.

## Sound effects

Hit sounds are from Kenney's [Impact Sounds](https://kenney.nl/assets/impact-sounds)
pack (CC0 — public domain, licence in `assets/sfx/`), converted to `.wav`.
`src/sfx.js` picks a light / medium / heavy hit by damage (Belledon's hits
ring a bell), a metallic clank for blocked hits, glass for a shield break,
and a heavy plate for a KO — each from a few variants with a little random
pitch so no two hits sound the same.
