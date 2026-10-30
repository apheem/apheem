# Hollow Ark: where the work stands

This file is for the next session, on this account or another, so that nothing is lost if a session runs out. Read it first, then `STORYBOARD.md` ("How to pick this up") and `DECISIONS.md`. Update it in every commit that changes what's in progress.

## Right now

- **Branch:** `claude/practical-heisenberg-1chpy5`. It restarts from `main` after each merge. Open a draft PR for it if there isn't an open one.
- **Last merged:** 0.3.9, Cody's first full play fixes (PR #15).
- **Working on:** Phase 3.10, Cody's calls on the story audit. The checklist is in `STORYBOARD.md` under "3.10". The Mara plan (who she is, the rules, and where each dream and line goes) is in `STORYBOARD.md` under "Mara, and the dreams".
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
