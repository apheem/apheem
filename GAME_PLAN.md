# Glitch Defense — Game Plan

A neon sci-fi tower defense game for phones that runs offline once loaded.

## Decisions

| Topic | Choice |
|---|---|
| Genre | Fixed-path tower defense |
| Structure | Roguelite runs: ~10 min, 20 waves, upgrade cards between waves |
| Visuals | Clean geometric neon shapes drawn in code (no image files) |
| Theme | Defend a glowing Core from glitchy drones and viruses |
| Target device | iPhone (Safari, Add to Home Screen), portrait |
| Hosting | GitHub Pages from this repo's `/docs` folder |
| Towers (v1) | 4 towers with 3 upgrade tiers each |
| Extras (v1) | Fast-forward (1×/2×/3×), permanent unlocks between runs |
| Difficulty | Normal → Hard → Nightmare (each unlocked by winning the previous) |
| Maps | 3 handmade maps; 1 at start, 2 unlocked with Data |

## Core loop

- Portrait grid (about 9 × 15 tiles). Enemies follow a winding path to the Core.
- Tap an empty tile to open the build menu. Tap a tower to upgrade or sell it.
- Enemies that reach the Core deal damage. Core at 0 HP ends the run.
- Killing enemies and clearing waves earns gold.
- Waves start when you tap "Next wave" (an early start pays a small bonus).

## Towers

| Tower | Role | Notes |
|---|---|---|
| Pulse | Cheap, fast single-target | Baseline damage dealer |
| Nova | Splash | Good against swarms, slow fire rate |
| Cryo | Slow | Slows enemies in range, low damage |
| Rail | Sniper | Long range, high damage, very slow fire rate |

Each tower has 3 upgrade tiers. Selling refunds 70% of what you spent.

## Enemies

| Enemy | Trait |
|---|---|
| Drone | Basic |
| Dart | Fast, fragile |
| Brick | Slow, lots of HP, armor (each hit loses 3 damage) |
| Swarm | Comes in tight groups of small units |
| Splitter | Splits into 2 smaller enemies on death |
| Shard | Small fast piece left behind by a Splitter |
| Boss (waves 10 and 20) | Huge HP, resists slow |

## Upgrade cards

After waves 3, 6, 9, 12, 15 and 18, pick 1 of 3 random cards. Cards for towers you own come up more often.

| Card | Effect |
|---|---|
| Overclock | Pulse fires 30% faster |
| Hollow Points | Pulse ignores armor |
| Shrapnel | Nova damage +35% |
| Wide Blast | Nova blast radius +35% |
| Deep Freeze | Cryo slows 15% more |
| Brittle | Slowed enemies take 25% more damage |
| Long Barrel | Rail range +25%, fires 20% faster |
| Piercing Rail | Rail beams hit everything in their line |
| Optics | All towers +12% range |
| Interest | +10% of banked gold after each wave (max 40) |
| Bounty | +1 gold per kill |
| Bulk Order | Towers and upgrades 15% cheaper |
| Nano Repair | Repair 1 Core HP after each wave |
| Reinforced Core | +5 max Core HP and repair 5 (can repeat) |

More cards are unlocked through meta progression.

## Bosses

| Boss | Wave | Trait |
|---|---|---|
| Warden | 10 | Armored, half effect from slows, drops 2 Shards every 4 s, costs 10 Core HP if it gets through |
| Overlord | 20 | Heavier armor, mostly ignores slows, drops 4 swarmers every 3.5 s, ends the run if it gets through |

## Meta progression

- Each run pays **Data**: 2 per wave cleared, 10 per boss destroyed, 25 for a win. Hard pays 1.5×, Nightmare 2×.
- The **Lab** spends Data on permanent unlocks:

| Unlock | Cost | Effect |
|---|---|---|
| Seed Funding (3 levels) | 20 / 40 / 80 | +25 starting gold per level |
| Core Plating (3 levels) | 25 / 50 / 100 | +3 Core HP per level |
| Reroll | 60 | Reroll each card offer once |
| Map: Express | 40 | Short, open route |
| Map: Spiral | 80 | Long coil, faster enemies |
| 5 new cards | 30 each | Tracer Rounds, Chain Reaction, Supercooled, Overcharge, Scrap Value |

- **Difficulty:** Hard (+20% enemy HP) unlocks after a Normal win; Nightmare (+40% HP, +8% speed, 5 less Core HP) after a Hard win.
- The run in progress is saved whenever the field is clear, so closing the app keeps it. "Continue" on the title screen picks it up from the last cleared wave.
- Everything is stored on the phone with `localStorage`.

## Tech

- Plain HTML, CSS and JavaScript. Canvas 2D rendering. No libraries, no build step.
- Web app manifest and service worker so it works offline and installs to the Home Screen.
- Sound: none in v1. Haptics: skipped (not supported in iPhone Safari).
- iPhone note: play from the Home Screen icon. That gives full-screen, offline play
  and keeps Safari from clearing saved progress.

## Build order

1. **Playable prototype** ✅: map, path, Pulse tower, Drones, 10 waves, gold, win/lose, pause, fast-forward.
2. **Content** ✅: all 4 towers with upgrades and targeting modes, all non-boss enemy types, hand-built 10-wave mix.
3. **Roguelite layer** ✅: 14 upgrade cards, Warden (wave 10) and Overlord (wave 20) bosses, 20-wave run.
4. **Meta** ✅: Data, Lab unlock shop, run saved between waves (Continue), Normal/Hard/Nightmare, 3 maps.
5. **Ship** ✅: offline support (service worker), Home Screen icon and manifest, bundled font, screen kept awake during waves. GitHub Pages is switched on after merging (see below).

## Code layout

The game lives in `docs/` so GitHub Pages can serve it as-is (no build step).

| File | Purpose |
|---|---|
| `docs/index.html` | Page markup: HUD, field, dock panels, overlays |
| `docs/style.css` | Styles |
| `docs/js/config.js` | All tunable data: map paths, tower tiers, enemy stats, wave recipe |
| `docs/js/game.js` | Simulation only (no DOM), so it can run headless for balance tests |
| `docs/js/render.js` | Canvas drawing and effects |
| `docs/js/profile.js` | Data, Lab unlocks, wins, best run and the saved run |
| `docs/js/main.js` | Main loop, touch input, screens and panels |

| `docs/sw.js` | Service worker: caches every file so the game runs offline |
| `docs/manifest.webmanifest` | Name, icon and full-screen settings for the Home Screen |
| `docs/fonts/`, `docs/icons/` | Bundled Chakra Petch font (OFL) and app icons |

To play locally: `cd docs && python3 -m http.server`, then open `http://localhost:8000`.

## Publishing and installing

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/docs`, **Save**.
3. After a minute or two the game is live at `https://apheem.github.io/apheem/`.
4. On the iPhone: open that link in **Safari**, tap **Share → Add to Home Screen**, then launch it from the new icon.
   It opens full screen, works with no connection after that first visit, and keeps your progress.

## Releasing an update

Change the files, then bump `VERSION` in `docs/sw.js` (for example `glitch-defense-v1.1`) and push to `main`.
Phones pick up the new version the next time the game is opened with a connection, and use it from the launch after that.

