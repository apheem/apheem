# Hollow Ark

A dark, retro pixel-art action-exploration game set aboard a colony ship drifting off course for 300 years. This folder holds **Phase 1: the feel prototype**: one room on the Cryo Deck for trying movement, recoil and three weapons that level up.

The game direction lives in the [Hollow Ark game direction brief](https://claude.ai/artifact/1DQU8Exivvskbjp3ykeMXY). Every place the build departs from it is in [DECISIONS.md](DECISIONS.md).

## Play it on Windows, macOS or Linux

One build runs everywhere: in any modern browser, or as a desktop app.

| Where | How |
| --- | --- |
| Any computer, in a browser | Once merged to `main`: **https://apheem.github.io/apheem/hollow-ark/** in Chrome, Edge, Firefox or Safari. |
| Any computer, offline | Download the `Hollow-Ark-Browser` artifact (or copy `docs/hollow-ark/`), unzip it and open `index.html`. |
| Windows 10 or 11 (x64 or ARM) | `Hollow-Ark-Windows` artifact: run `Hollow-Ark-0.1.0-windows-setup.exe` (one installer for both chip types). Or unzip the `x64` zip (the `arm64` one on Snapdragon PCs) and run `Hollow Ark.exe`. |
| macOS on Apple Silicon or Intel | `Hollow-Ark-macOS` artifact: open the `.dmg` and drag Hollow Ark to Applications. One file works on both chip types. |
| Linux x64 or ARM64, including Steam Deck desktop mode | `Hollow-Ark-Linux` artifact: make the `.AppImage` executable and run it. On Debian or Ubuntu you can instead run `sudo apt install ./Hollow-Ark-0.1.0-linux-amd64.deb`. |

The desktop artifacts come from the **Hollow Ark** workflow: open the repository's **Actions** tab, pick the latest run, and scroll to **Artifacts** (you need to be signed in to GitHub). Each run also launches every app on its own OS and plays a few seconds before uploading it.

The desktop apps aren't signed with a paid certificate yet, so each OS asks once on first launch:

- **Windows:** SmartScreen says "Windows protected your PC". Click **More info**, then **Run anyway**.
- **macOS:** the app says it can't be checked for malware. Open **System Settings > Privacy & Security**, scroll down and click **Open Anyway** next to Hollow Ark.
- **Linux:** if double-clicking the AppImage does nothing, right-click it, open **Properties** and allow it to run as a program.

## Controls

No mouse is needed anywhere. On-screen prompts switch between keyboard keys and controller buttons (Xbox, PlayStation, Switch Pro, Steam Deck) depending on what you last pressed.

| Action | Keyboard | Controller |
| --- | --- | --- |
| Move | Arrow keys or WASD | Left stick or D-pad |
| Jump (hold for higher) | Z, Space or J | A |
| Fire | X or K | X, B or RT |
| Aim | Hold Up; hold Down while in the air | Stick or D-pad |
| Switch weapon | Q / E (or C / V) | LB / RB |
| Drop through a catwalk | Down + Jump | Down + A |
| Rest at a rest pod (heal, set respawn) | Up | Up |
| Pause | Esc, Enter or P | Start or Back |
| Fullscreen | Alt+Enter (F11 in the desktop app), or Settings | Settings menu |

## What's in Phase 1

- **Movement:** acceleration and braking, variable jump height, coyote time, jump buffering, fast falls, drop-through catwalks.
- **Three weapons with three levels each.** Each level changes how the weapon behaves.
  - **Rivet Pistol:** a single bolt, then a longer piercing bolt, then twin piercing bolts.
  - **Purge Cannon:** full-auto fire with ammo that refills. Fired downward it slows a fall (level 1), holds a hover (level 2) or climbs (level 3).
  - **Arc Coil:** hold to charge, release for a lightning beam that chains to nearby enemies and pierces at level 3. It never loses XP.
- **XP loss on hit, softened as the brief asks:** a hit drops at most one level, and XP can't be lost for 2.5 seconds after a drop.
- **The room:** three enemy types that come back after a while, crates, a rest pod, and a secret life capsule that only a level 3 Purge Cannon can reach.
- **Feel:** screen shake, hit-stop, flashes, dust and sparks, plus chiptune sound effects and music synthesized live.
- **Settings:** windowed or fullscreen, pixel-perfect or fill scaling, screen shake, flashing, hold or toggle fire, music and sound volume.

Phase 1 gate (from the brief): *Cody plays 10 minutes on keyboard and controller and wants more.*

## How it's built

| Path | What it is |
| --- | --- |
| `docs/hollow-ark/` | The game: HTML5 canvas and plain JavaScript, with no engine and no build step. GitHub Pages serves it from here. |
| `hollow-ark/desktop/` | Electron shell that packages those same files as Windows, macOS and Linux apps (Steam-ready in Phase 5). |
| `hollow-ark/tests/` | Plays the browser build in Chromium, Firefox and WebKit (Safari's engine). |
| `.github/workflows/hollow-ark.yml` | CI. On Windows, macOS and Linux it runs the browser check, builds each desktop app, launches it, plays a few seconds and uploads it. |

Run the desktop app from source:

```bash
cd hollow-ark/desktop
npm install
npm start
```

Build installers for the OS you're on (they land in `hollow-ark/desktop/dist/`):

```bash
npm run dist
```

Run the cross-browser check:

```bash
cd hollow-ark/tests
npm install
npx playwright install chromium firefox webkit
npm run check
```
