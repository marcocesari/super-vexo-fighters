# Super Vexo Fighters

A Super Smash Bros. Ultimate–inspired fighter set in the world of *Super Vexo*, made in JavaScript with p5.js by Marco.

Eleven fighters from the Vexo universe, three stages, Stock or Stamina rules, two players (keyboard or gamepad) or one vs. CPU. Ultimate-style moves: tilts, aerials, short hops, shield, dodges, ledge grabs — with Ultimate's real knockback formulas.

**Super meter**: the bar under your damage and lives fills every time you hit the other fighter. When it's full it flashes *SUPER READY!*: press special (B) to freeze the action, charge up and fire a giant beam in your fighter's colour.

**Play online**: from match setup, *Create a room* or *Find rooms nearby*. Rooms are found by rough area (about 20 km) — your exact location is never shared — and listed nearest first. The host accepts or declines everyone who asks; two fight and anyone else let in can watch. Players get made-up names like "Swift Rockheart 42", so nobody types anything. No server needed: browsers connect directly to each other.

**Specials** glow, sparkle and make a sound, so every B move is easy to see even when the camera is zoomed out.

**Settings** (in match setup): **Game speed** — 50%, 65%, **75%** (the default), 85% or 100% of Ultimate's pace. It stretches time for the whole fight, so every move keeps exactly its own timing; nothing becomes stronger or weaker, there is just more time to see it. **Graphics** — Auto, High, Medium or Low. Auto watches the frame rate and picks for itself, so the game looks its best on a fast machine and still plays on a slow one. The fight runs at the same speed whatever your screen does, and on a 120 Hz screen it is drawn 120 times a second.

**Play**: https://marcocesari.github.io/super-vexo-fighters/ (or locally: `./start.sh`). Keyboard is laid out like a gamepad: WASD = stick (W jump, S crouch), → attack, ↓ special, ↑ shield, ← jump, Enter pause. A second human on the same keyboard uses IJKL + O attack, P special, U shield. Gamepads: stick/d-pad move, A attack, B special, shoulders shield.
