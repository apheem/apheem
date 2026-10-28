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

After waves 3, 6, 9, 12, 15 and 18, pick 1 of 3 random cards. Example pool:

- Overclock: Pulse towers fire 25% faster
- Chain Reaction: Nova kills cause a small explosion
- Brittle: slowed enemies take +25% damage
- Interest: gain 10% of banked gold after each wave
- Long Barrel: Rail range +30%
- Reinforced Core: +5 Core HP
- Discount: towers cost 15% less

More cards are unlocked through meta progression.

## Meta progression

- Each run earns **Data** based on waves cleared (with a bonus for winning).
- Spend Data on permanent unlocks: starting gold, extra Core HP, new cards, maps 2 and 3.
- Saved on the phone with `localStorage`.

## Tech

- Plain HTML, CSS and JavaScript. Canvas 2D rendering. No libraries, no build step.
- Web app manifest and service worker so it works offline and installs to the Home Screen.
- Sound: none in v1. Haptics: skipped (not supported in iPhone Safari).
- iPhone note: play from the Home Screen icon. That gives full-screen, offline play
  and keeps Safari from clearing saved progress.

## Build order

1. **Playable prototype** ✅: map, path, Pulse tower, Drones, 10 waves, gold, win/lose, pause, fast-forward.
2. **Content** ✅: all 4 towers with upgrades and targeting modes, all non-boss enemy types, hand-built 10-wave mix.
3. **Roguelite layer**: upgrade cards, boss waves, 20-wave run.
4. **Meta**: Data, unlock shop, save/load, fast-forward, difficulty tiers, 3 maps.
5. **Ship**: offline support, Home Screen icon, polish and balance, GitHub Pages.

## Code layout

The game lives in `docs/` so GitHub Pages can serve it as-is (no build step).

| File | Purpose |
|---|---|
| `docs/index.html` | Page markup: HUD, field, dock panels, overlays |
| `docs/style.css` | Styles |
| `docs/js/config.js` | All tunable data: map paths, tower tiers, enemy stats, wave recipe |
| `docs/js/game.js` | Simulation only (no DOM), so it can run headless for balance tests |
| `docs/js/render.js` | Canvas drawing and effects |
| `docs/js/main.js` | Main loop, touch input, panels, best-run save |

To play locally: `cd docs && python3 -m http.server`, then open `http://localhost:8000`.
