# Hollow Ark

A dark, retro pixel-art action-exploration game set aboard a colony ship drifting off course for 300 years. This folder holds **Phase 2, the vertical slice** (the Cryo Deck, the Hullfolk Warrens, the Warden Lockup and the first boss, with saving, a map, a journal and one moral choice), and **Phase 3 in progress**, the full main path. Today the story runs about 25 to 35 minutes and stops at the door to the Hydroponic Gardens, the next area to be built.

The game direction lives in the [Hollow Ark game direction brief](https://claude.ai/artifact/1DQU8Exivvskbjp3ykeMXY). Every place the build departs from it is in [DECISIONS.md](DECISIONS.md). The plan for the rest of the game, Phase 3 onward, is in [STORYBOARD.md](STORYBOARD.md): the whole story area by area, every boss, weapon, choice and ending, and the build order with a checklist. Start there to pick up the work.

## Play it on Windows, macOS or Linux

One build runs everywhere: in any modern browser, or as a desktop app.

| Where | How |
| --- | --- |
| Any computer, in a browser | Once merged to `main`: **https://apheem.github.io/apheem/hollow-ark/** in Chrome, Edge, Firefox or Safari. |
| Any computer, offline | Download the `Hollow-Ark-Browser` artifact (or copy `docs/hollow-ark/`), unzip it and open `index.html`. |
| Windows 10 or 11 (x64 or ARM) | `Hollow-Ark-Windows` artifact: run `Hollow-Ark-0.3.0-windows-setup.exe` (one installer for both chip types). Or unzip the `x64` zip (the `arm64` one on Snapdragon PCs) and run `Hollow Ark.exe`. |
| macOS on Apple Silicon or Intel | `Hollow-Ark-macOS` artifact: open the `.dmg` and drag Hollow Ark to Applications. One file works on both chip types. |
| Linux x64 or ARM64, including Steam Deck desktop mode | `Hollow-Ark-Linux` artifact: make the `.AppImage` executable and run it. On Debian or Ubuntu you can instead run `sudo apt install ./Hollow-Ark-0.3.0-linux-amd64.deb`. |

The desktop artifacts come from the **Hollow Ark** workflow: open the repository's **Actions** tab, pick the latest run, and scroll to **Artifacts** (you need to be signed in to GitHub). Each run also launches every app on its own OS and plays a few seconds before uploading it.

The desktop apps aren't signed with a paid certificate yet, so each OS asks once on first launch:

- **Windows:** SmartScreen says "Windows protected your PC". Click **More info**, then **Run anyway**.
- **macOS:** the app says it can't be checked for malware. Open **System Settings > Privacy & Security**, scroll down and click **Open Anyway** next to Hollow Ark.
- **Linux:** if double-clicking the AppImage does nothing, right-click it, open **Properties** and allow it to run as a program.

## Controls

No mouse is needed anywhere. On-screen prompts switch between keyboard keys and controller buttons (Xbox, PlayStation, Switch Pro, Steam Deck) depending on what you last pressed. Menus, the map and the journal also answer to a mouse or touch if you reach for one: point and click, scroll the wheel, right-click to go back. A click also moves dialogue on.

| Action | Keyboard | Controller |
| --- | --- | --- |
| Move | Arrow keys or WASD | Left stick or D-pad |
| Jump (hold for higher) | Z, Space or J | A |
| Fire | X or K | X, B or RT |
| Aim | Hold Up; hold Down while in the air | Stick or D-pad |
| Switch weapon | Q / E (or C / V) | LB / RB |
| Drop through a catwalk | Down + Jump | Down + A |
| Talk, read a ship log, rest at a rest pod | Up | Up |
| Next line of dialogue | Z, Space, Enter or X | A or X |
| Map and journal | Tab or M (Q / E switch tabs) | View / Back (LB / RB switch tabs) |
| Pause (also: skip a scene) | Esc, Enter or P | Start |
| Fullscreen | Alt+Enter (F11 in the desktop app), or Settings | Settings menu |

## Saving

The game saves by itself every time you go through a doorway into another room, and whenever you rest at a rest pod (which also heals you). Quitting never costs more than the room you're in. One save slot; **Continue** on the title screen picks it up.

| Where you play | Where the save lives |
| --- | --- |
| Browser | The browser's storage for the page (clearing site data deletes it) |
| Windows app | `%APPDATA%\Hollow Ark\save1.json` |
| macOS app | `~/Library/Application Support/Hollow Ark/save1.json` |
| Linux app | `~/.config/Hollow Ark/save1.json` |

The file is the same on every OS, so a save can be copied from one computer to another.

## What's in Phase 2

- **Eight rooms in three areas,** each with its own look and music: the Cryo Deck (cold and alone), the Hullfolk Warrens (warm, lilting, home), and the Warden Lockup (machines). The music crossfades as you move between areas.
- **The story's first two beats:** waking in pod 0417, meeting the Hullfolk, the night the Wardens come for Shim, and following them into the Lockup.
- **The first boss, the Bailiff.** Every attack has a wind-up you can read. It has three phases, and each adds a move and a layer to the music. It vents energy shards every 15% of its health, so a weapon that lost a level can climb back mid-fight. A rest pod sits just outside its hall.
- **One moral choice,** permanent, shown with exactly what it gains and loses before you confirm. The Warrens look and sound different afterwards depending on what you chose.
- **Map** that fills in as you explore, with markers you can drop anywhere. **Journal** with your current lead, the story so far, choices made, ship logs found, and every conversation, to re-read.
- **Scenes can be skipped** from the pause menu, and text speed is a setting.
- **Phase 1 is all still here:** the movement, the three weapons and their levels, and the XP rules. The Arc Coil's charge hum now stops when you switch or pick up a weapon mid-charge.

Phase 2 gate (from the brief): *three first-time testers finish it without help.*

### Since Cody's Phase 2 playtest

- **Menus no longer glitch.** Nothing from the game shows through a menu any more, the map centres on what you've explored (zoomed in while it's small, scrolling once it's big), and the Controls screen no longer overlaps the bottom line.
- **No hint is hidden behind a wall.** "HOLD ↑ TO AIM UP" in the Cryo Bay ran into the wall at the end of the room; the room checker now fails any hint that touches a wall.
- **A new opening:** the Ark drifts far off among the stars behind the opening lines, then the hero's pod drops from its rack, the lid blows off, and the hero climbs out.
- **The max-health pickup is now a suit cell** (its old name belonged to another game).
- **New music for the Way Down** (the orange shaft above the Warrens): a slower, sparser take on the Warrens song, in the same key and time, with a hand drum that comes up as you near the village.

## Phase 3.0: foundations

The groundwork every later area stands on. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **The slice no longer ends at the reunion.** Gasket says where the taken really go ("THEY GO UP, TO THE GARDENS"), and the new lead is **FIND THE TAKEN IN THE GARDENS**. That night, with no music, Wick sits with Shim at the fire, promises to be back by lights-out, and asks to come along: "THE ONES THEY TOOK ARE MY PATIENTS." In the morning she has gone ahead to the Bailiff's Hall, whose east wall now has a door. Past it, for now, a note says the Gardens come in the next build.
- **Mara's pod (0418)** hangs beside the hero's empty clamps in the Cryo Bay. Its plate can be read, and it's the first line in the hero's own voice: "MARA IS STILL ASLEEP IN 0418. I PROMISED I'D BE THERE WHEN SHE WOKE."
- **The Steward speaks first** over the Lockup's intercom: "WHOEVER YOU ARE, YOU ARE NOT IN THE COUNT. THAT CAN BE FIXED."
- **The Hullfolk's lines after the reunion** point to the Gardens, and differ by what you did to the Bailiff. Solder explains shards in her own voice; the exact rule ("A HIT COSTS SHARDS · NEVER MORE THAN ONE LEVEL") is on the wall above her bench.
- **Dialogue moves out of the way.** In a one-screen-high room the box sits at the top, so the people talking stay in view.
- **Saves carry everything Phase 3 needs** (each Warden's fate, abilities, who lived, the crew, endings reached). A Phase 2 save loads and picks up with the night after the reunion.
- **Movement abilities for later areas** (the thruster pack, the grapple's pull and hang, pressure boots, swimming) live in one place, `js/abilities.js`, which both the hero and the room checker use. None is handed out yet.
- **The ending runner** plays any of the five endings: its closing scene, an epilogue built from what you did (Shim, Gasket, Solder, the Warrens, the Wardens in their own counts, the sleepers and Mara, the Navigator, and whoever else still matters), the credits, then back to the title. Endings you've reached show on the title screen and survive a new game. No ending can be reached in play yet; the first, Deserter, arrives with the Cargo Labyrinth.

## How the rooms are checked

Every gap on the main path can be jumped with room to spare: 5 tiles or less (a running jump reaches 7, but only with a pixel-perfect run-up). Gaps that aren't meant to be jumped are 9 tiles or more, with another route in view. `hollow-ark/tests/rooms-check.js` plays every room with the game's own movement code, swimming, thruster and grapple included. It fails the build if any entrance, item, person or rest pod can't be reached with the abilities the hero has by then, if a secret meant for an ability can be reached without it, if a gap is exactly 7 tiles wide, or if a hint runs into a wall. Before the real rooms it plays four small test rooms, one per ability, to prove each one opens exactly what it should.

## How it's built

| Path | What it is |
| --- | --- |
| `docs/hollow-ark/` | The game: HTML5 canvas and plain JavaScript, with no engine and no build step. GitHub Pages serves it from here. |
| `hollow-ark/desktop/` | Electron shell that packages those same files as Windows, macOS and Linux apps (Steam-ready in Phase 5). |
| `docs/hollow-ark/js/areas/` | The rooms, one file per area, drawn as text maps (the legend is at the top of each file). |
| `hollow-ark/tests/` | The room checker, and a check that plays the whole story so far, upgrades a Phase 2 save and plays all five endings, in Chromium, Firefox and WebKit (Safari's engine). |
| `.github/workflows/hollow-ark.yml` | CI. On Windows, macOS and Linux it checks the rooms, plays the slice in all three browser engines, builds each desktop app, launches it, plays a few seconds and uploads it. |

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

Run the checks:

```bash
cd hollow-ark/tests
npm install
npm run rooms
```

```bash
npx playwright install chromium firefox webkit
```

```bash
npm run check
```
