# Hollow Ark: where the work stands

This file is for the next session, on this account or another, so that nothing is lost if a session runs out. Read it first, then `STORYBOARD.md` ("How to pick this up") and `DECISIONS.md`. Update it in every commit that changes what's in progress.

## Right now

- **Branch:** `claude/practical-heisenberg-1chpy5`. It restarts from `main` after each merge. Open a draft PR for it if there isn't an open one.
- **Last merged:** 0.3.11, the rest of Cody's calls on the story audit so far (PR #17, Oct 31).
- **Working on:** Cody's notes from playing 0.3.10 (below, "Cody's notes (Oct 31)"), as 0.3.12. They come before the rest of the length work. The checklist is in `STORYBOARD.md` under "3.11".
- **Paused:** the second batch of new rooms (the Muster and the Pump Heads, designed in `STORYBOARD.md` under "New rooms on the main path", not built). Pick it up after Cody's notes, unless the bigger way to the Gardens covers the length first.
- **Next step:** the first unticked box under 3.11.

## Cody's notes (Oct 31, from playing 0.3.10)

Cody played 0.3.10, not 0.3.11 yet. In their words, shortened:

1. Old Gasket should slowly gain the hero's trust: a side part of the story, one of the character developments.
2. The way to the Gardens is too short and not built up enough. The Gardens are where the taken are hidden, so it should be a bigger build, to make reaching them feel like an achievement. The same goes for the first Warden (the Bailiff).
3. Make it more obvious who is talking, especially the voices "from the walls".
4. The wall on the screen with the flood countdown must be tall enough that the hero can't jump over it.
5. Choice 9's "blow the beam" confirm screen: the line about the Breach Charges and the launcher runs off the screen.
6. Right after the beam, in the next room (the tram station), pressing Up at the winch makes Solder walk across in a straight line in the air.
7. When Solder says she's going with the tram, it leaves while she's still talking. Wait until she's done, and show her get in, then leave.
8. Gasket talks about wanting to see the outside world at the Crew Camp, the night after Abel. After that, put more pressure on him: situations where the hero might lose him.
9. Make it more obvious that the Gardener poisoned Wick, so that being asked to hear her out makes sense.
10. It isn't clear why the villagers climb to the top with the hero, and then climb back down to the Cryo Bay. Make the reason obvious.
11. During the escape, the music turns calm in the Warrens (the safe area). It should be intense everywhere while running.
12. "The seal read the Bloom" doesn't make sense. If there's a reason, make it obvious.
13. Launching the pods said it costs 20 seconds, but the escape was fast and easy anyway. The ship is falling apart: make it look mangled, with other ways out, and rooms that change as things fall.
14. Don't say "sister" at the end. The build-up makes it clear; leaving it unsaid is nicer.

## Cody's calls (Oct 30)

| Topic | Call |
| --- | --- |
| Mara | She is the hero's sister, revealed slowly. Dreams on each night the hero sleeps, clearer and longer each time. Don't be too forward, and the hero stays a mystery. Shim's "IS SHE A GHOST TOO?" gets "NOT A GHOST." and nothing more. Oct 31: "sister" is never said, at the end either. |
| Upgrades | Option B: shards still level the weapon in hand; spare shards bank as scrap for Solder's bench. Difficulty modes come later, and upgrades should matter more in them then. |
| Length | Keep the brief's 4–6 hours on the main path, plus side quests. A first-time player's photo doesn't block anything. |
| Routes | A death, someone not making it, or a choice can lock a main path, so the hero goes round a harder way (pipes, tunnels). Choices can also close side quests. |
| Epilogue pictures | Draw them now, in code, as placeholders. |
| Grapple key | Not raised; it stays C or I (LT). |

Their words are in the session log; the story audit doc is [here](https://claude.ai/artifact/SMRYSh6QmPqsC6SseGEoZC), and the game direction brief is [here](https://claude.ai/artifact/1DQU8Exivvskbjp3ykeMXY).

## Rules that carry over

- Commits end with the `Co-Authored-By` and `Claude-Session` lines the session gives. No model names in commits, PRs or files.
- Never merge or approve a PR. Cody merges.
- Cody's pronouns aren't stated: use they/them.
- Run the checks before pushing: in `hollow-ark/tests`, `npm run rooms`, `npm run check` and `npm run playthrough`. A change to the story's order usually needs a step in `tests/playthrough-routes.js`.
- Bump `HA.VERSION` in `docs/hollow-ark/js/core.js` and the desktop app's `package.json` and lock file for each release, and add a section to the README.

## Log

- **Oct 30:** 0.3.9 merged. Cody answered the audit. Plan written into `STORYBOARD.md` (3.10 and the Mara section); this file started.
- **Oct 30:** `js/pictures.js`: four dream scenes (`pods`, `list`, `tickets`, `boarding`) and the epilogue's scenes. Every ending's cards have pictures, and Mara's cards name her as the hero's sister. To see them all: the contact-sheet approach is to call `HA.pictures.draw` / `HA.pictures.dream` on a 320x180 canvas in the page; `HA.endings.epilogue(id, state)` gives an ending's cards.
- **Oct 30:** Mara's thread built (`js/story/mara.js`, plus lines in `story.js`, `story/warrens.js`, `spine.js`, `cargo.js`, `gardens.js`, `tower.js`, `deck.js`, `scuttle.js`). Hero thoughts that don't stop play: `HA.story.think`. The browser check plays each dream and checks the epilogue's pictures and sister lines. All five playthroughs pass. Next: the shard bank (option B).
- **Oct 30:** The shard bank and Solder's bench (`js/story/bench.js`, `weapons.bank`, `state.scrap`, `state.upgrades`). The browser check banks shards and buys plating. Next: routes that close (design first).
- **Oct 30:** Lock 1 built: the Overflow Pipes. The Crash playthrough goes round through them. Version 0.3.10 (README section). Next: lock 2 (the fallen gate), then lock 3, then the length work. Watch out: `Q` in a map is the Scatter Launcher's pickup, not a free letter; `b` and the other enemy letters are in `actors.js` `TYPES`.
- **Oct 30:** PR #16 (0.3.10) merged; the branch restarted from `main`. Lock 2 built: the gate's cave-in and the deep walls (`deep-walls`, west of the Way Down; `R`, `g` and `Z` in `areas/warrens.js`; the lines in `story/ballast.js`; the run's route and arrows in `story/scuttle.js`). The Crash playthrough goes round through the deep walls; the browser check looks at the cave-in with the gate held and fallen. Version 0.3.11. Next: lock 3 (side content each choice shuts).
- **Oct 30:** PR #17 opened (draft) for 0.3.11. Lock 3a built: Flux's morning with Shim (`fluxMorning` in `story/cargo.js`, from the Warrens' `onRest`), shut by taking his pack; the browser check covers both. Lock 3b (the greenhouse wing and Sorrel) is to be built with Sorrel's quest. Next: the rest of the audit's story fixes (4, 6, 7), then the length work.
- **Oct 30:** The audit's story fixes 4, 6 and 7 built (lines in `story/warrens.js`, `gardens.js`, `cargo.js`, `spine.js`; three Homecoming epilogue cards and pictures in `endings.js` and `pictures.js`; the browser check looks for the names and the new epilogue lines). Next: the length work, in the checklist's order: the tram home after the Ballast (5), Wick's longer escort (8), new rooms on the main path, then Sorrel (9, with lock 3b).
- **Oct 30:** The tram home built (the audit's fix 5; design and as-built in `STORYBOARD.md`, "The tram home"): `js/story/tram.js` (new, after `spine.js` in `index.html`), the winch in `story/ballast.js` (and `wallsOut` in `raidSeen`), the sump's `t` in `areas/warrens.js`, the station's `holdBack` and the pipes' `shut` in `areas/ballast.js`, the goodbye in `story.js`'s `mara` scene, the crew's lines in `story/spine.js`, the run's card in `story/scuttle.js`, and the `tram` picture. The playthroughs go home after the winch (`playthrough-routes.js`, end of the ballast segment); the browser check rides it both ways. Still 0.3.11 (README section updated). Next: Wick's longer escort (8), then new rooms on the main path, then Sorrel (9, with lock 3b).
- **Oct 30:** Wick's longer escort built (the audit's fix 8; design and as-built in `STORYBOARD.md`, "Wick's longer escort"): `story/gardens.js` (cradles, `wickUp`, the barks, `wickPatch`), triggers and a new pod in `areas/gardens.js` (the Irrigation Works' east ledge), and `catchUp` in `story.js` for any companion. The browser check covers the catch-up and the sit-down. Next: new rooms on the main path (the Ballast and the Labyrinth first), then Sorrel (9, with lock 3b).
- **Oct 30:** New rooms, first batch (design and as-built in `STORYBOARD.md`, "New rooms on the main path"): the Watch Gallery (`areas/cargo.js`, `story/cargo.js`; the aisle gate) and Odell's Test Tank (`areas/ballast.js`, the boots moved there). A `lever` scenery prop in `scenery.js`. Next: the second batch of new rooms (pick from the free-space list in that section), then Sorrel (9, with lock 3b).
- **Oct 31:** CI's browser check on Linux failed once at the run for the sleds' falling ceilings ("debris false"): each piece is aimed at a random spot beside the hero and skipped if that spot is a wall or under a low ceiling, and the check gave it only 300 frames (two or three tries). It now steps until a piece falls, up to 1200 frames. The full rooms check passed all 68 rooms with the first batch of new rooms in.
- **Oct 31:** PR #17 (0.3.11) merged; the branch restarted from `main`, and PR #18 opened (draft) for 0.3.12. Cody's notes from playing 0.3.10 are above. Built so far (3.11's first four boxes, and the seal and the climb): the confirm box wraps (`confirmLayout`, `scenes.js`); people walk on the floor (`keepToFloor`, `story.js`); Solder gets in the tram first and it waits for her (`rideWest`, `story/tram.js`, `world.tramRiders` in `scenery.js`); the Jammed Hatch fills its passage; the run's music in the Warrens; the speaker marker (`drawSay`); "sister" taken out of the end (`story/deck.js`, `endings.js`); the Gardener dosed Wick (`story/gardens.js`, `story/tower.js`); the climb's purpose and the run's reason (`story/warrens.js`, `story/scuttle.js`); the four lines of what closed the other way (`endings.js`). Version 0.3.12. Next: the designs for the bigger builds (the run for the sleds, the Counting House before the Bailiff, the way into the Gardens, Gasket's trust), then build them.
