# Hollow Ark: where the work stands

This file is for the next session, on this account or another, so that nothing is lost if a session runs out. Read it first, then `STORYBOARD.md` ("How to pick this up") and `DECISIONS.md`. Update it in every commit that changes what's in progress.

## Right now

- **Branch:** `claude/practical-heisenberg-1chpy5`. It restarts from `main` after each merge. Open a draft PR for it if there isn't an open one.
- **Last merged:** 0.3.10, the first part of Cody's calls on the story audit (PR #16).
- **Working on:** Phase 3.10, Cody's calls on the story audit (0.3.11 on the branch, PR #17, not merged yet). The checklist is in `STORYBOARD.md` under "3.10". The Mara plan (who she is, the rules, and where each dream and line goes) is in `STORYBOARD.md` under "Mara, and the dreams".
- **Next step:** the first unticked box under 3.10.

## Cody's calls (Oct 30)

| Topic | Call |
| --- | --- |
| Mara | She is the hero's sister, revealed slowly. Dreams on each night the hero sleeps, clearer and longer each time. Don't be too forward: "sister" only at the end, and the hero stays a mystery. Shim's "IS SHE A GHOST TOO?" gets "NOT A GHOST." and nothing more. |
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
