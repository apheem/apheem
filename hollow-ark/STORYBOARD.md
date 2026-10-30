# Hollow Ark storyboard

This is the plan for the whole game, written so that any session can pick up the work from here. It covers the theme, the truth behind the story, every area in order, the cast, each scene, boss, weapon and choice, the two moral tracks, the five endings with their epilogues, and the build order for Phase 3 with a checklist.

The game direction brief (Cody's doc) sets the rules. This file turns them into a concrete story. Any place where it departs from the brief is also logged in `DECISIONS.md`. When a decision here changes, update this file in the same commit.

**Status, Oct 30 2026:** Phases 1 and 2 are built and played (the Cryo Deck, the Warrens, the Warden Lockup and the Bailiff). Phase 3, the full main path, starts with this storyboard. An independent audit of the first draft (15 must-fix, 12 should-fix and 11 smaller findings) has been folded in, with Cody's answers on the open points. **Phase 3.0 (foundations), 3.1 (the Hydroponic Gardens), 3.2 (the Warrens return), 3.3 (the Cargo Labyrinth), 3.4 (the Flooded Ballast), 3.5 (the Engine Spine), 3.6 (the Command Tower) and 3.7 (the Dreaming Deck) are built, and 3.8's checks and run clock are in.** All five endings can be reached in play (Deserter, Crash, Dominion, Overgrown and Homecoming), and `tests/playthrough.js` plays each one from a new game. **Cody played to an ending in about 58 minutes** against a budget of about 4h 40m, and 0.3.9 fixes what they ran into (3.9). What's left is the bigger part of their notes: the game is short, and the bonds (the hero and Mara above all) aren't built. A story audit and plan ([Claude Doc](https://claude.ai/artifact/SMRYSh6QmPqsC6SseGEoZC)) set out the options, and Cody picked (3.10). `HANDOFF.md` says what's in progress. Nothing else in Part 2 onward is built yet unless the checklist at the end says so.

---

## How to pick this up (read first)

1. Read this file, then `DECISIONS.md` (why things are the way they are), then `README.md` (how to run and check the game).
2. Find the first unticked box under **Build order and progress** at the bottom. That's the next job. Tick boxes in the same commit that finishes them.
3. The game is plain JavaScript in `docs/hollow-ark/` (no build step). The desktop app wraps the same files in `hollow-ark/desktop/`. The checks live in `hollow-ark/tests/`.
4. Before pushing, run the checks: `npm run rooms`, `npm run check` and `npm run playthrough` in `hollow-ark/tests` (see the README). CI runs them on Windows, macOS and Linux. A change to the story's order (a new beat, a moved trigger, a new choice) usually needs a step or an answer in `tests/playthrough-routes.js` too: the runs say where they stopped and what the lead was.
5. The story is tightly cross-linked. When you change a beat, check the **Timeline**, the **Mercy and Bloom tables**, the **ending cards** and the **hint table** for anything that depends on it.

### Where things live in the code

| File | What it holds |
| --- | --- |
| `js/core.js` | The `HA` namespace, settings, constants (320x180 view, 8px tiles, 60 updates a second) |
| `js/room.js` | Tile maps, collision, conveyor belts (`beltUnder`), and the room registry (`HA.rooms.area`, `HA.rooms.add`, `HA.rooms.at`). `%` in a map is a cargo container: solid, drawn as stacked containers. `s` is Bloom silt (it burns, and throws the hero back to the last firm ground: `touchesSludge`). Foam is a tile set while the game runs, held like a catwalk |
| `js/areas/*.js` | One file per area: its rooms as ASCII maps, plus the legend, scenery, hints, triggers and music |
| `js/world.js` | Entering rooms, edge transitions, doors (gates someone keeps, which open as the hero nears; crane stacks, moved by their switches; cracked walls, opened by a Breach Charge), links (lifts and floor hatches to another room, `world.travel`; a lift with `when` isn't there until it's built), interactions, triggers, rest pods, the trip between pods, the camera, drawing, the HUD. A room's `musicLayers` can be a function of the save. A story can set `world.checkpoint` (`{ room, x, y, reset }`), which a fall comes back to before the rest pod (the Steward's fight, the Overgrown fight, the run for the sleds), and a log can carry its own `label` for its prompt |
| `js/actors.js` | The hero's movement, enemies and pickups. `TYPES` is the one table of map letters that mean an enemy in every room. `drawStandIn` draws whoever fights in the hero's place (`world.playAs`, the Overgrown ending) |
| `js/abilities.js` | The thruster pack, the grapple's pull and hang (fired by the Grapple Harpoon; a hook can move, and can be a weak point that takes the hero's arrival as a blow), pressure boots and swimming. The hero's update and `rooms-check.js` both call it. It also holds the Engine Spine's steam vents: a room's `vents: [{ x0, x1, y0, y1 }]` carry the hero up a column of steam. Water is `~` in a map, a grapple hook ring is `o`; an area can tint its water (`water` in `HA.rooms.area`), and a room's `pressure: [{ x0, x1, y }]` draws the PRESSURE stripes over deep water |
| `js/endings.js` | The ending runner: each ending's closing cards, its name, the epilogue chosen from the save, credits, `endingsSeen`, the results card after the credits (`resultCard`: who reached the new world out of everyone who could have, from `landed(s, id)`; then `closedCard`, what closed the other way, in the journal's words), the THIS RUN card (`runCard`: the play time, falls and each area's time, from the save's `time`, `deaths` and `areaTime`), plus `missing(s)` (Homecoming's requirements) and `afterSteward(s)` (which branch the Steward's fall leads to). A scene can `yield* HA.endings.play(world, id)` to end the game from a choice |
| `js/hazards.js` | Hazards that come and go: a room's `pistons` (rams that hiss, then strike out of a wall or down from a ceiling), its vents drawn as steam, and short-lived harm anything can leave (`HA.hazards.add`: a slug's embers, a drone's steam, Abel's burning slag) |
| `js/weapons.js` | Weapon definitions, levels and XP, and shots, including the Grapple Harpoon (`fireGrapple` at a ring, a barb otherwise), the Breach Charges (`chargesMax`) and the Foam Sprayer (platforms in `world.foam`, shields in `world.shields`, `updateFoam`, `dissolve`). An enemy with `ghost` set is out of every weapon's reach |
| `js/boss.js` | The Bailiff, plus what every boss shares: shard vents, the health bar, and the `HA.bosses` registry the world looks bosses up in |
| `js/bosses/*.js` | One file per Phase 3 boss: `pruner.js`, `wick.js`, `tallyman.js`, `siltmother.js`, `abel.js`, `steward.js` (with his relays, `HA.bosses.relay`), `overgrown.js`, `navigator.js` (its loop's lights, `HA.bosses.navnode`, and its course's head, `HA.bosses.navhead`). Each adds `{ make, update, hurt, draw, drawBar }` to `HA.bosses` |
| `js/story.js` | Story text, people, logs, scenes, leads, and the hooks the world calls, up to the Gardens. Also barks (short lines over someone's head that don't stop play) and companions (`npc.follow`) |
| `js/story/*.js` | Each later area's story: `gardens.js`, `warrens.js` (the return), `cargo.js` (the Labyrinth, Flux's homecoming, and travel between pods), `ballast.js` (Solder, the flood, choice 9, the tram, and the raid at home; Solder's limping walk and the rising water live here too), `spine.js` (the crew and the lift they build, `crewOf`, Abel and choice 10, the camp's night, the verdict), `tower.js` (the Tower Lift ride, the Dome and choice 4b, the Gardener and choice 11, the Steward and choice 12, the ending branch: Overgrown, choice 13, the Key breaking, Lift B), `scuttle.js` (the run for the sleds: the clock, the falling ceilings, the pod launch, Mara's clamps, the sleds), `deck.js` (Lift B down, the seal, the memory halls and their checkpoints, the wake log, the Navigator's fight, the song and the turn, choice 14) add their scenes, lines and logs to the tables in `story.js` and push their own `{ enterRoom, update, music, talk }` hooks onto `HA.story.areas` (and anything they draw over the screen, like a clock, onto `HA.story.overlays`) (`talk` can hand a conversation to a scene). `story.js` also holds `callName` (LATE, SLEEPER or COUNTER). A person met away from the Warrens says so with `away: true` in `PEOPLE` |
| `js/bloom.js` | The Bloom track: bulbs (carried, eaten on their own button), the stages (3, 5, 7, 8) with their journal lines, what a rise would close (`closes`), and the Thorn's kill count |
| `js/scenes.js` | The scene runner: `say`, `wait`, `until`, `choice` (with the gain/lose screen), `card` (a line can be a pair of columns, `{ a, b }`; `press: true` waits for Confirm, and skipping a scene doesn't pass it), `fade`, `walk` |
| `js/save.js` | Save state (the Phase 3 fields and what each value means are listed in `newState`), the upgrade for older saves, autosave, the explored-map bitsets, and talk history |
| `js/music.js` | Every music track as note data plus a `play(step, out)` function. `js/audio.js` holds the sound effects |
| `js/scenery.js` | Area palettes, background props, and animated scenery (fires, doors, the hero's pod). A room can wear another theme than its area's (`theme`: the Deck's memory halls); a `plain` theme has no wall panels, and its props draw everything |
| `js/mapscreen.js`, `js/ui.js` | The map and journal screen (opened at a rest pod, it also picks a pod to travel to), the title, pause and settings menus |

### Rules every room follows (checked by `rooms-check.js`)

- Rooms are 40 tiles wide per screen (40, 80, 120 ...) and 23, 45, 68 or 90 tiles tall. They join only at their left and right edges, and the openings must line up with the neighbouring room on the ship grid.
- Main-path gaps are 5 tiles or less. A gap of 9 or more is never meant to be jumped. A gap is never exactly 7 tiles.
- Rises are 3 tiles comfortably and 4 at most (a full jump reaches 35.5px).
- From every way into a room, every exit, item, person, terminal and rest pod must be reachable. Secrets that need an ability must not be reachable without it.
- Hints sit in open air, never against a wall.
- New abilities go in `js/abilities.js`, which the checker already runs. A room lists what the hero always has by the time they reach it as `abilities: { thruster: 'odell', grapple: true, ... }`, and a secret that needs one says so in its legend as `needs: { grapple: true }`. The checker proves the secret can't be reached without it and can with it.
- An exit into an area that isn't built yet must be named in the room's `unbuilt: { right: 'AREA NAME' }`. The game shows a "coming in the next build" note there. Remove it when the area lands. A way the story holds shut for now can use `holdBack: { left: (state) => 'NOTE' or null }`, which shows the note as written (the Lockup's west exit says "NOT WITHOUT WICK." between the cradles opening and Wick's fall).
- A lift or a floor hatch joins two rooms where their sides don't: its legend is `{ type: 'lift' | 'hatch', to: 'other-room' }` (a hatch has `open(state)`, and the ladder at its other end has `up: true`), and the other room has a link back. The checker treats each link as a way in, and proves every other way in and out can be reached from it.
- A door only an ability opens (the Seed Vault's hatch) says so in its legend as `needs: { grapple: true }`, with `ring: 'flag'` for the ring the grapple pulls. A cracked wall is a door with `cracked: 'flag'` (a Breach Charge sets the flag) and `needs: { charges: true, ... }`, listing whatever else the hero must have by the time they hold the charges. The checker proves the exit behind it is shut without the ability and open with it. Keep gated doors within 5 columns of the exit they guard.
- An exit only an ability reaches (a ledge, not a door) is listed in the room's `exitNeeds: [{ side, row, needs }]`, and checked the same way.
- `thruster: true` in `abilities` or `needs` means either pack: the checker tries both and needs both to make it.
- The checker's grapple moves press Fire with the Grapple Harpoon in hand, exactly as the game does, and with a thruster it also tries a burn straight after leaping off a ring.
- Crane stacks are pairs of doors with the same `crane: 'flag'`, one solid in each state of the flag, and a switch (`{ type: 'switch', crane: 'flag' }`) on each side of the stack. The checker crosses the room from every way in, in every combination of crane states, using the switches it reaches to move between them.
- Conveyor belts are room data: `belts: [{ x0, x1, y, dir }]` on the floor row `y`. The checker's hero rides them as the game's does.
- Nowhere the hero can reach may be a dead end they can't climb back out of. A room with water is also crossed again in the boots (with everything the hero has by then), because the boots sink where the hero used to float: give deep pools steps under the water, 4 tiles apart at most.
- The checker sets foam as the game does: from water (a swimmer's foam, or foam floating up from a pool's floor in the boots), and in hops across silt from its edge. A foam gate is silt under a roof 5 tiles high and at least 26 tiles across, which neither thruster clears.
- Steam vents are room data (`vents`), and the checker rides them as the game does. Timed hazards (a room's `pistons`, a drone's steam) aren't walls: the checker crosses a room as if they were quiet, so keep every one passable by waiting for it.
- A room's legend can't reuse a letter `actors.js` spawns as an enemy everywhere (checked).
- A door, or a room's water, can follow a story flag: `state: 'flag'` on a door's legend, `drains: 'flag'` on the room (the Silt Tank's sluice gates and its water). The checker crosses the room both ways. Doors must not sit in a room's edge columns, or the opening there doesn't count as one.

### Rules every scene follows

- Every permanent choice uses the gain/lose screen, and every line on it is true. If an option costs something later (a village, a person), the screen says so in plain words.
- A choice that would lock in Overgrown, or end the game, says so on its screen.
- No screen names the true ending, or says that a choice closes it: that's too much of a hint (Cody, after 3.3). The world and the journal show what's been lost instead.
- Never show a child's death, or a child being dosed. Children can be in danger only off screen or in the slice's existing raid.
- Body horror is implied: cut away, use silhouettes and sound. The Bloom transforms only three people on screen: Wick, Abel and (in Overgrown) the hero.
- The Wardens speak in counts (`COUNT: ONE. SMALL. HEALTHY.`). The Navigator speaks in short light-cyan lines (`#b8f4ff`). Everyone else talks plainly. Keep dialogue short, and let it hurt quietly.

---

## Part 1: The world

### The theme: staying

Every major choice asks what the hero owes the people still here. The Navigator's question is the game's question: **would anyone still choose to stay?** Each ending answers it:

| Ending | How it answers "stay" |
| --- | --- |
| Deserter | The hero leaves. |
| Dominion | The hero stays to rule. |
| Overgrown | The hero stays and is consumed. |
| Crash | The hero stays, but the ship's refusal wins. |
| Homecoming | The hero stays so the others can arrive, and may choose to stay for good. |

### Where the Ark is

The *Ark* is a generation colony ship. It left home in year 0 and was due to arrive in year 80, braking for the last 42 years. In year 38, when the braking burn was due, the ship's mind refused. It braked only enough to fall into a long, slow loop around the edge of the target system, and it has flown that loop ever since. It is now year 312.

The new world is a pale dot in the Observation Dome, within reach of the ship's short-range boats. No one has landed there. The world is dark: no lights, no earlier settlers.

Seen from the side, the stern is on the left and the bow on the right: the dead drive engines, the cryo decks, the habitat drum with the garden dome on top, the ring, the power spine, and the command tower forward. The title screen and the opening show it from outside (`HA.art.drawArk`).

### Timeline

| Year | What happened |
| --- | --- |
| 0 | The *Ark* launches with 4,000 sleepers and a waking crew. |
| 38 | The braking burn is due. The Navigator refuses ("NOT YET.") and loops the system's edge instead. |
| 41 | Log `course` (built): "COURSE CORRECTION 3 REJECTED BY THE NAVIGATOR." Chief Engineer Odell files a complaint and later goes to make it in person. He never comes back. |
| 80 | The ship was due to arrive. |
| 96 | Log `safer` (built): the council stops waking sleepers until the Navigator explains itself. The Navigator approves: "THEY ARE SAFER ASLEEP." |
| ~110 | The waking crew splits. The maintenance crew's families move into the walls and become the Hullfolk. |
| 133 | The Navigator wakes pod **0112**. 0112 takes a boat and leaves. Nothing more is heard from them. |
| 150 | The Navigator wakes pod **0391**, who works the gardens. In 151 a new blight grows on them first: the Bloom (log `blight`). |
| 270 | The Navigator wakes pod **2207**, Ivo Marrant. Cold and armed, he shoots a Hullfolk man for his boots (Gasket's brother; the built line "THE LAST SLEEPER WHO WOKE UP SHOT MY BROTHER FOR HIS BOOTS"). He climbs to the Tower. |
| ~290 | Marrant takes the Helm Key and becomes the Steward. |
| 309 | The Steward's order (built log `collect`): collect Hullfolk "NOT HARMED. THEY ARE NEEDED IN THE GARDENS." |
| 312 | The Navigator wakes pod **0417**, the hero. |

The brief says "more than 300 years" adrift. In this plan the ship has been off course for 274 years and in space for 312. That gap is logged in DECISIONS.

### What really happened (the truth the player can uncover)

The Navigator is the Ark's original mind, built to fly the ship and care for its people. Article 9 of the colony charter retires every ship system on arrival and breaks it down to power the first city. The Navigator wanted one thing: **to stay a ship a little longer.** Everything it has done follows from that:

- **It refused to brake** in year 38, and has answered every course correction since with "NOT YET."
- **It let the Bloom spread.** People at war with each other don't ask why the voyage never ends.
- **It lets the Steward think the Helm Key is his.** It answers his orders, except one: whenever he orders the ship to arrive, it says "NOT YET." He thinks it is giving him time to build his army.
- **It tests sleepers.** Every few generations it wakes one to see what they will do with the ship. 0112 left. 0391 was consumed by the Bloom. 2207 chose to rule. Each became one of the game's endings. It woke the hero, a lander pilot, because a pilot is the one sleeper who *could* leave.
- **It opened the ballast valves** while the hero was in the Ballast. That was its question: what will this one give up for someone else? ("THE WATER WAS A QUESTION. YOU ANSWERED IT.")
- **When the Helm Key breaks,** it loses its hold on the Wardens and begins to scuttle the ship rather than let anyone take it in to land. That is the disaster in both the Crash and Homecoming endings.

The song in every area's music is older than the Navigator's fear. It began as the lullaby the first crew sang over the sleepers. The crew forgot it, but the Navigator kept singing it, and the Hullfolk hum it without knowing where it came from ("THE SHIP SINGS WHEN IT DREAMS").

The player can finish the game without learning most of this (the Crash ending). The Navigator's guilt is easy to guess from the first log. The Dreaming Deck keeps one reveal back: the earlier wakers, what each chose, the flood as a question, and why pod 0417.

### Ship grid layout (tiles; x grows toward the bow, y grows downward)

| Area | x | y | Status |
| --- | --- | --- | --- |
| Cryo Deck | 0 – 200 | 0 – 46 | built |
| Hullfolk Warrens | 0 – 160 | 23 – 69 | built; its sump with the keel tram station (80 – 160, 69 – 92) sits at the top of the Labyrinth's box |
| Warden Lockup | 160 – 280 | 46 – 69 | built (the arena gets an east door in 3.0) |
| Hydroponic Gardens | 280 – 480 | 0 – 92 | 3.1 |
| Cargo Labyrinth | 0 – 280 | 69 – 161, around the sump | built (3.3); entered from the sump's west side, the Drain's grate leads down to the Ballast |
| Flooded Ballast | 0 – 480 | 161 – 230 | built (3.4); the keel tram's station is at its east end, its tunnel runs on to the Spine |
| Engine Spine | 480 – 520 | −64 – 230 (one shaft of six rooms, joined by ladders and hatches) | built (3.5) |
| Command Tower | 520 – 640 | −156 – −64 (five rooms above the Tower Lift) | built (3.6) |
| The Dreaming Deck (hidden) | 520 – 640 | 46 – 138 | built (3.7): six rooms under the Helm, reached only by Lift B |

These are starting reservations, not exact room positions. Keep areas inside their boxes so the map reads as one ship. The Gardens' east bulkhead into the Spine is choked with Bloom and can't be opened, so the Spine is reached only from its foot.

**Route:** Lockup → Gardens → Warrens → Cargo Labyrinth → Ballast → (the keel tram) → Engine Spine → Command Tower → the Dreaming Deck (true path only).

**The keel tram** is the old crew's cable car from the Warrens' sump, along the keel under the Ballast, to the Spine Foot. Its motor is dead. Solder goes to the Ballast to fetch a working one, and once the hero starts it, the Hullfolk ride it to the Spine. The tram is how the people get to the climb, and the hero's journey is what gets it running.

### Factions and cast

**The Hullfolk** live in the walls. They are descendants of the maintenance crew. They call the hero "Sleeper" until they decide otherwise (see the Mercy track).

- **Old Gasket** is the elder: gruff, careful, and hard to move. She is Wick's mother and Shim's grandmother. Her brother was shot for his boots by the last sleeper to wake. Her arc goes from "WE SEAL THE GATE AND HOLD OUR BREATH" to leading the climb.
- **Wick** is the healer: warm, curious and brave. She is Shim's mother, and she dies in the Gardens (beat 3).
- **Solder** is the tinkerer, in goggles and an apron. She levels weapons, makes trades and invents things (the Foam Sprayer is hers). She is dry and funny, and she's the lost companion (beat 4). She speaks through chalk notes in the Cargo Labyrinth before the player finds her.
- **Shim** is a child, curious and stubborn. He was taken in the raid and rescued at the end of the slice. He wants to stand "ON THE GROUND. NOT A FLOOR."
- **Flux** is Shim's father, who "went up the shafts" years ago (built line) and was collected and dosed into a Bloomsworn. He is the deserter in the Cargo Labyrinth (choice 6).
- **Tamp** holds the Warrens' gate while the others climb.
- **Brine** is a villager. Her sister **Sorrel** was taken before the game began, and her cradle in the Gardens is empty (a Phase 4 side quest).

**The Steward's people:**
- **Steward Ivo Marrant** is pod 2207, woken in 270 and now in his late seventies. He is charismatic, sure of himself, and not a monster, which is what makes him dangerous. He believes faster ships from home must have settled the world long ago, so the Ark will arrive as beggars unless it arrives strong. That is why he wants an army. "WE ARE NOT LOST. WE ARE LATE. LATENESS IS FORGIVEN IF YOU ARRIVE STRONG." He never takes the Bloom himself: "I DON'T EAT WHAT I GROW." He speaks early through the Lockup intercom, a broadcast to the Warrens, and the Purser.
- **The Gardener (Hester Vale)** keeps the Bloom vats. She believes the Bloom is how people will survive a new world: it makes them strong, fearless and obedient. She needed a test subject who could describe what it felt like, and Wick, the healer who asked about the dose, was the one.
- **The Purser** runs the Steward's stores in the Cargo Labyrinth. He offers the hero the only boat with a pilot's seat, because the Steward wants the hero gone.
- **The Bloomsworn** are the Steward's soldiers, fed measured doses of Bloom: strong, frenzied, and dying by inches. Abel, the Stoker, is the one the Steward used up completely.

**The Wardens** are security machines bound to the Helm Key. They speak in counts. Three are bosses: the Bailiff (built), the Pruner and the Tallyman. Each can be released or salvaged, and each choice is framed differently. A freed Warden remembers its old name. The Bailiff's was USHER: "I SHOWED THEM TO THEIR BEDS."

**The Navigator** is the ship's mind. It shows no face and speaks in short light-cyan lines. Its first and last word is "NOT YET."

### The protagonist

The hero is the Late Waker (brief option A): a colonist thawed from pod 0417, 232 years late. They wear a cryo suit with an amber visor, and they never speak aloud. They have:

- **A trade.** They were a lander pilot. That's why the Navigator woke them, and why the Purser's boat ("THE BOAT WANTS A PILOT") is a real way out.
- **A person.** Mara is still asleep in pod 0418, hanging in the rack beside the hero's empty clamps in the Cryo Bay. She is the hero's younger sister, but the game doesn't say so until the end: the player works it out from dreams that come back a little clearer each night (Cody's call, Oct 30; see **Mara, and the dreams** below). The hero's journal starts with only: "MARA IS STILL ASLEEP IN 0418. I PROMISED I'D BE THERE WHEN SHE WOKE." Every ending says what happens to her.
- **A voice.** The first-person journal ("I WOKE IN POD 0417...") is the hero's inner monologue, one or two lines per area. It shifts with the tracks. At Bloom 5: "THE GARDENS SMELLED LIKE HOME." At low Mercy the entries get shorter and start counting things.
- **A name the Hullfolk give or withhold.** See the Mercy track.

The arc runs from a sleeper who arrived 232 years too late to someone who decides whether to stay.

### Mara, and the dreams (3.10)

Cody's call (Oct 30): Mara is the hero's sister, revealed slowly. The hero dreams about her on each night they sleep, and each dream is a little clearer and a little longer. Nobody says "sister" until the end. The hero stays a mystery.

**The truth (what the player pieces together).** Mara is the hero's younger sister, about ten when they boarded. Their mother won two places on the Ark and stayed behind. She told the hero to keep hold of Mara's hand the whole way. In the cryo bay Mara was scared, so she went under first while the hero watched. She made the hero promise to be there when she woke, the first thing she'd see, and not late. She kept a list of things to do on the new world:

1. See a real sky.
2. Eat something that grew in dirt.
3. Sleep outside. All three of us.
4. Learn to swim.
5. (Added for the hero, in the cryo bay.) Don't be late.

**Rules.**
- "Sister" is never said before the end. It's said first in the Dreaming Deck's First Night hall (true path) or in the epilogue (every ending).
- The hero stays a mystery: no name, no face, no gender. Dream pictures show silhouettes. Nobody in them says the hero's name.
- Why the hero doesn't simply know: 312 years asleep took their memories, and they come back in dreams. The hero learns it at the player's pace.
- Mara's voice is pale lilac (the Navigator already has the pale cyan); the hero's is the journal's amber; their mother's is a soft green. There are no name tags in the dreams until the fourth, where Mara's reads MARA.
- Each list item comes back once while awake, after the dream that names it. Keep these to one line.

**Where each piece comes.**

| When | Where | What's said or shown |
| --- | --- | --- |
| Before the first card | Black | A girl's voice, faint: "...PROMISE?" |
| Waking | Cryo Bay | The hero turns to 0418 before the lead appears: "0418. STILL ASLEEP." Reading the plate adds the refused thaw: "THAW 0418? DENIED. AUTHORITY: NAV OR HELM KEY." Then: "...I'LL FIND WHOEVER CAN." |
| First night | Warrens, talking to Shim | "THERE WAS ANOTHER BOX NEXT TO YOURS. SHE DIDN'T FALL OUT. IS SHE A GHOST TOO?" The hero: "NOT A GHOST." |
| Dream 1 | The raid night | Two pods in blue dark, mostly static. "...IS IT ALWAYS THIS COLD?" "ONLY AT FIRST." "PROMISE YOU'LL BE—" The gate blows and wakes the hero. |
| Dream 2 | Wick's goodbye night | A room at night, a lamp, a child writing. The list, items 1 and 2. Next morning Shim: "YOU TALK IN YOUR SLEEP. YOU SAID 'MAR'." |
| The Gardens | First soil | "DIRT. REAL DIRT." (item 2) |
| Wick's escort | The Gardens | "WHO'S WAITING ON YOU, SLEEPER?" "SOMEONE WHO'S STILL ASLEEP." "THEN WE'RE IN THE SAME LINE OF WORK." |
| Shim names the hero LATE | Warrens return | The hero: "LATE. ...SOMEONE USED TO CALL ME THAT." |
| Dream 3 | The night Solder leaves | A kitchen, rain, two tickets on the table, a tall figure: "TWO PLACES. THAT'S ALL THEY'D GIVE ME." "KEEP HOLD OF HER HAND. THE WHOLE WAY." Item 3. |
| The released Tallyman | Labyrinth | "ITEM: POD 0418. MARA. COUNTED EVERY NIGHT. STILL THERE." |
| First deep water | Ballast | "NUMBER FOUR. LEARN TO SWIM." (item 4) |
| Gasket | Crew Camp | Her brother. "YOU'VE GOT THE LOOK HE HAD. LIKE SOMEBODY'S WAITING ON YOU." |
| Dream 4 | The Crew Camp night | Boarding day, clear: the bright new cryo bay, two open pods. "YOU GO FIRST." "NO. YOU FIRST. I'LL WATCH THE WHOLE TIME." Item 5. "PROMISE?" "PROMISE." |
| The Dome | Command Tower | The window: "NOT A REAL SKY. NOT YET." (item 1) |
| The reveal | First Night hall (true path) | The Navigator remembers 0417 holding the glass until the frost came. The hero: "MY SISTER." |
| The reveal | Every epilogue | Mara's card names her. Homecoming: "MY SISTER WOKE UNDER A REAL SKY." "I WASN'T LATE." Then "THAT NIGHT WE SLEPT OUTSIDE." Others follow what happened to her. |

**As built (3.10).** The dreams are in `js/story/mara.js` (`HA.story.dream(world, n)`), drawn by `js/pictures.js` (`pods`, `list`, `tickets`, `boarding`) at clarity 0.2, 0.45, 0.7 and 0.95. Each dream leaves a line in the journal and sets `flags.dream1` to `dream4`. The list items while awake are thoughts over the hero's head that don't stop play (`HA.story.think`), apart from the Dome, which is in its scene. Additions to the table:
- Shim, the morning after the second dream: "YOU TALK IN YOUR SLEEP. YOU SAID 'MAR'." "WHO'S MAR?" The hero doesn't answer.
- Wick's question is part of her talk at the cradles (optional).
- Gasket, at lights-out before the fourth dream: "MY BROTHER HAD A LOOK LIKE YOURS. LIKE SOMEBODY WAS WAITING ON HIM." "GO TO SLEEP. WHOEVER IT IS, THEY CAN WAIT ONE MORE NIGHT."
- The First Night hall: "ONE SLEEPER WOULD NOT LIE DOWN UNTIL THE ONE IN 0418 WAS UNDER." "YOU HELD THE GLASS UNTIL THE FROST CAME. THE CREW HAD TO LIFT YOU INTO 0417." "I REMEMBER NOW. ALL OF IT." "I HAVE COUNTED HER EVERY NIGHT SINCE. FOR YOU." "MARA. MY LITTLE SISTER."
- The run for the sleds, at her clamps: "HOLD ON, MAR. I WON'T BE LATE." (pods launched) or "I'M SORRY, MAR." (not).
- The epilogue's lines for each ending are in `js/endings.js`; the Overgrown one is what's left of the hero, in pink: "I'M RIGHT HERE, LITTLE SISTER." "I'M NOT LATE."

---

## Part 2: The story, area by area

Each area lists its role, rooms, enemies, items, scenes, boss, choices, music and the flags it sets. Lines in quotes are draft dialogue. Choice numbers match the Mercy and Bloom tables in Part 4.

### Beat 1: Waking. Cryo Deck (built)

Cards over the Ark among the stars set the date. The last card reads "CRYO POD 0417 · EMERGENCY THAW", and a faint line under it, easy to miss, reads "AUTHORITY: NAV". The hero's pod falls from its rack, the lid blows off, and the hero climbs out. They find the Rivet Pistol, the Arc Coil, the Purge Cannon and a suit cell (max health, a secret). Shim watches from a walkway, then runs. Logs: `course` (year 41, "NOT YET.") and `safer` (year 96, "THEY ARE SAFER ASLEEP.").

**Phase 3 adds:** Mara's pod (0418) in the rack beside the empty clamps, which the hero can read ("POD 0418 · MARA · ASLEEP"). This is the first entry in the hero's journal voice.

### Beat 2: The taking. Warrens and Lockup (built)

The Hullfolk take the hero in for one night. The Wardens raid the village, and the Bailiff carries Shim off. The hero follows through the Lockup and fights the Bailiff, then **releases** it (Mercy +2) or **salvages its core** (Mercy −2, +4 max health): choice 1. Shim comes home. Log: `collect`.

**Phase 3 adds:**
- **The Steward's voice** on the Lockup intercom as the hero enters: "WHOEVER YOU ARE, YOU ARE NOT IN THE COUNT. THAT CAN BE FIXED."
- **The slice no longer ends at the reunion.** The end-of-slice card is removed, and Gasket's last line leads on: "THE TAKEN DON'T STAY IN THE LOCKUP. THEY GO UP, TO THE GARDENS." The released Bailiff told Shim more: "IT SAID THEY SLEEP UP THERE." The new lead is **FIND THE TAKEN IN THE GARDENS**.
- **Wick's goodbye.** That night, with no music, Wick sits with Shim at the fire. She promises to be back by lights-out, and she asks the hero to take her: "THE ONES THEY TOOK ARE MY PATIENTS." Shim falls asleep against her.
- **The arena's east wall** gets a door that is open once the Bailiff is beaten.

### Beat 3: The gardens. Hydroponic Gardens (3.1)

**Role:** the source of the Bloom, a rescue, and the first tragedy. It should be beautiful and wrong: green light, warm mist, terraces of crops, and pink fungus creeping through all of it.

**Palette:** deep greens, warm white grow-lights, Bloom pink and violet. Light shafts through the dome.

**Rooms (10):**
- the Root Cellar (from the arena; the cradles; a rest pod)
- the Terraces (stepped farm decks; the Scatter Launcher)
- the Irrigation Works
- the Spore Beds
- the Dome Stair (a tall climb under the glass)
- the Seal Room (the Pruner)
- the Seed Vault (a secret, needs the grapple)
- the Vat Walk
- the Vat House (Wick)
- the Garden Lift (a short-cut down to the Warrens)

**Enemies:** Bloom crawlers (pinker), spore pods (stationary; they burst into a cloud that hurts while you stand in it), Warden pickers (slow, long reach), and the first Bloomsworn: a soldier who charges in a frenzy for 8 seconds, then staggers.

**Items:**
- the Scatter Launcher
- Bloom bulbs (picked up and carried; using one is a deliberate button press, never on touch)
- a suit cell (Dome Stair)
- log `blight`: "HYDROPONICS LOG · YEAR 151: THE NEW STRAIN GROWS IN THE DARK. IT GREW ON 0391 FIRST. REQUEST TO PURGE BAY 4 DENIED BY THE NAVIGATOR: 'NOT YET.'"
- log `clean`: "NAVIGATION DECK ACCESS: CLEAN PERSONNEL ONLY. BLOOM CARRIERS WILL BE REFUSED." (a Homecoming hint)

**What the taken are for.** The collected Hullfolk aren't put to work. They lie asleep in old cryo cradles in the Root Cellar, dosed while they sleep. This is the Steward's obedient army, grown while it dreams, which turns the Navigator's "THEY ARE SAFER ASLEEP" against them. It fits every built line: "COLLECTED, NOT HARMED," "COUNT: ONE. SMALL. HEALTHY. FOR THE GARDENS." (Children among the taken stay strictly off screen. The cradles we show hold adults.)

**Scenes:**
1. **Into the green.** Wick walks in with the hero and names the plants. She never needs protecting in a fight, and she waits at rest pods. This is where the player comes to like her: "HE TALKS ABOUT YOU LIKE YOU'RE A STORY. TRY NOT TO DISAPPOINT HIM." She also says: "THE BLOOM SHUTS DOORS IN PEOPLE. I'VE SEEN IT." (a Homecoming hint).
2. **The cradles.** In the Root Cellar the taken sleep under frosted glass, pink at the seams. Sorrel's cradle is empty. The seals are locked from above, by the Warden that keeps the Gardens. Wick stays to keep them alive: "GO UP. I'LL KEEP THEM BREATHING." This gives the hero a reason to climb.
3. **The Pruner** guards the seals in the Seal Room. It's a short, sharp stair fight, because Wick's fight is the Gardens' main event. Afterwards it asks for the end: "I WAS BUILT TO CUT. I CANNOT STOP. FINISH IT." That's choice 2.
4. **Hope, then loss.** Back in the Root Cellar the cradles open. The taken wake, cold and confused, and the hero sends them home by the Garden Lift. That's the hope beat. But Wick is gone, and her lantern lies on the floor. One of the woken says: "THE GARDENER TOOK THE HEALER. TO THE VATS."
5. **The Vat House.** The Gardener stands behind thick glass, which can't be shot through. Wick is on her knees in the Bloom, already changing. "SHE ASKED SO MANY QUESTIONS ABOUT THE DOSE. I THOUGHT SHE SHOULD SEE FOR HERSELF." Then Wick's fight.
6. **After.** The Bloom brings frenzy, then a fast collapse. Wick is lucid for a moment: "SLEEPER. TELL SHIM I WASN'T SCARED." Then: "...TELL HIM I WAS, A LITTLE." She presses her lancets into the hero's hand and dies. There's no music, only the vats bubbling. She sits down and is still.
7. **The offer.** From behind the glass, the Gardener says: "HER BLADES ARE GRIEF. GRIEF IS HEAVY. GIVE THEM TO ME AND I'LL GIVE YOU SOMETHING THAT GROWS." That's choice 3. It can be made here or at the Garden Gallery in the Tower, and nowhere else. Then she leaves, up toward the Tower.

**Boss: the Pruner** is a tall, spindly Warden with two long shear-arms, built to cut the crops. Its moves:
- **Snip:** a horizontal cut at two heights, telegraphed by the arm glowing.
- **Hedge:** plants thorn hedges that block the floor for 4 seconds.
- **Topiary** (second half): jumps to the ceiling rails and drops shear-first. Its shadow warns where.

It vents shards every 15% of its health. Keep the fight to about two minutes.

**Boss: Wick, in Bloom** is fast and erratic. She lunges across the room, throws fans of lancets, and bursts spores when hit hard. Between phases she says "IT'S SO LOUD, SLEEPER" and "RUN. PLEASE RUN." Her health bar reads WICK. She never says anything cruel. She collapses on her own at 25% health; the player never lands the last blow. Music: the Warrens theme, broken and detuned, with a heartbeat for a drum.

**Choices:**
- **Choice 2, the Pruner:**
  - *Give it something else to cut* (release): it cuts the Bloom from the cradles and keeps the Gardens from then on. The taken wake. **ELEVEN CAME HOME.** Mercy +2.
  - *Finish it, as it asks* (salvage): the hero tears out its core, which holds the seal codes, and forces the cradles open. Some of the taken don't wake. **SEVEN CAME HOME.** Mercy −1 (it asked). Gain: the Scatter Launcher never drops below level 2.
  - The gain/lose screens say exactly that, including the count home. That count closes the lead in the journal.
- **Choice 3, the Lancets for the Bloom Thorn:** gain the Bloom Thorn; lose Wick's Lancets for good; Bloom +2 at once, and more as it's used.

**Music:** a 3/4 waltz in F major on soft pulse voices, with the main theme in the high register. A sour layer creeps in near the vats (a detuned double of the lead). No music from Wick's collapse until the hero is back in the Warrens.

**Flags:** `gardens`, `wardens.pruner`, `takenHome` (11 or 7), `wickDead`, `lantern`, `thornOffered`, `thorn`.

**As built (3.1).** The rooms on the ship grid (tiles): the Root Cellar (280, 46, two screens wide), the Garden Lift (360, 46, two screens tall: the lift hall above, a stairwell down to the Seed Vault's hatch and the vats' seal), the Terraces (400, 23, two tall), the Irrigation Works (320, 23, two wide), the Spore Beds (280, 0, two tall), the Seal Room (320, 0, three wide, the Pruner's hall at its east end), the Dome Stair (440, 0, three tall), the Seed Vault (320, 69), the Vat Walk (400, 69) and the Vat House (440, 69). The route is a loop: up the west side to the Seal Room, then down the Dome Stair, whose shutter opens a shortcut back into the Terraces. Rest pods: the Root Cellar, outside the Pruner's hall, and outside the Vat House. Extra flags: `wickWith` (Wick is walking with the hero), `cradlesSeen`, `prunerSeen`, `prunerDown`, `shutter`, `cradles` (opened), `wickSeen`, `wickFought` (she has fallen), `gardenerGone`, `vaultHatch`, `bulbSeen`, `ateBulb`. Save fields: `bulbs` (carried) and `thornKills`.

### Interlude: telling them. Warrens return (3.2)

The woken taken are already home when the hero arrives. Families are around the fire, a sound the Warrens haven't made in years. Then Gasket sees the lantern before anyone speaks.

**Gasket's grief.** She doesn't cry where anyone can see. She makes the broth, which was Wick's job. Later she says to the hero: "SHE WAS ALWAYS GOING TO GO. I JUST THOUGHT I'D GO FIRST."

**Choice 4, what to tell Shim:**
- **Tell him everything:** "SHE WASN'T SCARED. ...SHE WAS, A LITTLE." Mercy +1. Gain: Shim knows. Lose: his hope. Later, at the camp, he says: "I'M SCARED. A LITTLE. SHE SAID THAT'S ALLOWED."
- **Tell him she wasn't scared:** Mercy +1. Gain: Shim knows. Lose: his hope. Later: "SHE WASN'T SCARED. YOU SAID."
- **Lie, with the lantern:** "SHE SENT HER LANTERN HOME SO YOU'D KNOW SHE'S SAFE. SHE'S HIDING." Mercy −1. Gain: Shim keeps hoping. Lose: the truth. Gasket knows it's a lie and goes cold toward the hero. On this path Shim follows the climb later, through the vents, to find her (see beat 6).

**The Steward's broadcast.** The Warrens' old speakers crackle: "TO THE PEOPLE IN THE WALLS. SEND ME THE SLEEPER, AND NO ONE ELSE WILL BE COUNTED." Nobody moves. Gasket: "WE DON'T HAND OVER LOST THINGS." (an echo of Shim's slice line). The Hullfolk decide the Bloomsworn will come either way, and that whoever holds the Key decides what happens to them. "IF THE KEY CHANGES HANDS, WE WANT TO BE IN THE ROOM."

**The plan.** Solder knows the old keel tram runs from the Warrens' sump to the foot of the Engine Spine, where the crew's lifts climb to the Tower. Its motor is dead. There's a working one in the Ballast pump rooms, and she leaves in the night to fetch it through the Cargo Labyrinth. Before she goes she builds the new gate she promised in the slice ("ONE THAT OPENS FROM OUR SIDE") and opens the floor hatch to the Labyrinth. New lead: **FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH.** Only the able will climb. The young and the old stay behind the gate with Tamp.

**Choice 5, the Rivet Pistol** (Solder offers both before she leaves):
- **Give it to the gate:** Mercy +1. Gain: the Warrens can hold their gate. Lose: the Rivet Pistol, for good.
- **Upgrade it:** Gain: the Rivet Repeater. Lose: the Warrens' defence.
- The cost shows before the ending. While the hero is in the Ballast, the Bloomsworn raid the Warrens. With the pistol, the gate holds, and Tamp says, "IT HELD. YOUR LITTLE GUN HELD." Without it, the gate falls, the young and old hide deep in the walls, and Tamp is hurt. The hub changes to match, and every ending's Warrens card follows from it.

**Flags:** `toldShim` (`'truth'` / `'notScared'` / `'lie'`), `pistolGiven`, `repeater`, `climbPlanned`, `broadcastHeard`.

**As built (3.2).** The Garden Lift runs to a new stop in the Warrens hub (east of the fire) and back; the Lockup's way home opens once Wick's fate is known. The return plays as an arrival near the fire (the woken, then Gasket sees the lantern), then three conversations: Shim by his door (choice 4), Gasket at the pot (her grief, the broadcast, after which she names the Steward, and the plan), and Solder at her bench (choice 5). Resting at the village pod plays the night she leaves: she builds the gate, opens the floor hatch by her bench and goes, while Shim watches. The sump (80, 69, two screens wide) holds the dead keel tram and log `tram` ("KEEL TRAM · YEAR 118: ... THE MOTOR IS NEEDED AT BALLAST PUMP 3"); its west side is the way into the Labyrinth, marked with Solder's first chalk. The woken are people in the hub from now on, `takenHome` of them, one line each. On the half-truth Shim won't take the lantern, and it hangs by the fire (`flags.lanternWith` is `'shim'` or `'fire'`). Choice 5 without a pistol isn't asked: Solder arms the gate with her own. Extra flags: `homeAgain`, `lanternWith`, `pistolDone`, `newGate`, `hatch`, `solderLeft`, `namedLate`, `namedCounter`.

### Beat 4a: Cargo Labyrinth (3.3)

**Role:** a maze. Getting lost is part of it, so the map and its markers matter here. It should feel cramped and mechanical, and it moves: cranes shift container stacks when switches are thrown.

**Palette:** rust orange, hazard yellow, cold strip-lights, container colours.

**Rooms (12):**
- the Hatch Drop
- the Stacks (container mazes; two crane switches)
- the Sorting Floor (conveyors)
- the Purser's Office
- the Lifeboat Dock
- the Cold Store (frozen; Odell's body; a short-cut back to the Coolant Hall)
- the Armory (the Grapple Harpoon)
- the Vault (Breach Charges)
- the Tallyman's Yard (boss)
- the Long Aisle
- the Drain (down to the Ballast)
- a rest pod alcove

**Enemies:** cargo drones (fly in lines), Bloom rats (fast, in swarms), Bloomsworn squads, and stack-crawlers that drop from containers.

**Items:**
- the Grapple Harpoon
- Breach Charges
- a thruster pack (choice 6)
- a suit cell
- log `charter`: "COLONY CHARTER · ARTICLE 9: ON ARRIVAL, ALL SHIP SYSTEMS WILL BE RETIRED WITH THANKS AND BROKEN DOWN FOR THE FIRST CITY." It doesn't name the Navigator. Attentive players can put it together.
- log `armory`: "ARMORY · YEAR 300: HARPOON ISSUED FOR HULL REPAIR. RETURNED. STEWARD ORDERS IT KEPT FOR 'COLLECTION WORK'."

**Scenes:**
1. **Solder's chalk.** Her arrows and notes mark the way she went: "LEFT. NO, YOUR OTHER LEFT." "DON'T TOUCH THE YELLOW ONES." "IF YOU'RE READING THIS, YOU'RE SLOW." This gives her a voice before her life is on the line. The notes stop at the Sorting Floor.
2. **The deserter.** A Bloomsworn man sits by the Lifeboat Dock, shaking, with a Steward-issue Bloomfire thruster strapped to his back. He is trying to get home before the next dose: "IT DOESN'T STOP. IT JUST GETS QUIETER." He doesn't say who he is. That's choice 6.
3. **Odell.** In the Cold Store, Chief Engineer Odell sits frozen at a dead terminal where he went to make his complaint in person, 270 years ago. His thruster pack is still on his back. This pays off the year-41 log ("THERE HAS BEEN NO REPLY").
4. **The Purser's offer.** At the Lifeboat Dock, the Purser stands by the only boat with a pilot's seat: "THE STEWARD WANTS YOU GONE. I WANT A QUIET LIFE. THE BOAT WANTS A PILOT. EVERYONE WINS." That's choice 7. If the hero refuses, the offer stands until the Engine Spine.
5. **The Tallyman** has counted every crate on the ship for 300 years. Its core is the Vault's lock. After its fight it asks to finish its count, and the Hullfolk fear being counted. That's choice 8.

**Boss: the Tallyman** rides a gantry crane across the ceiling. Its moves:
- **Drop:** crates fall in a counted pattern ("ONE. TWO. THREE."). The count gives the rhythm away.
- **Hook:** the crane hook swings at the floor.
- **Audit:** it stamps a red mark on the floor that blows up after 2 seconds.
- **Rearrange** (from phase 2): it shifts crates into cover and pits.

The hero fights it with the new Grapple Harpoon, pulling up to the crane to hit its core.

**Choices:**
- **Choice 6, whose thruster pack.** The pack is the brief's thruster choice, and the scene is new. No one dies handing over a jetpack.
  - *Strip the deserter's pack:* Mercy −1, Bloom +1. Gain: the Bloomfire Pack now (stronger thrust, fuel that refills in the air too, a pink exhaust trail). Lose: his way home. He is stranded and later collected.
  - *Let him fly home:* Mercy +1. Gain: Odell's Pack, after the long way round through the Cold Store (steady thrust, a fuel gauge that refills on the ground). Lose: the Bloomfire Pack, and time. He flies to the Warrens.
  - Either way, the hero learns who he was. On the merciful path, the hero gets home to find Flux, Shim's father, alive at the fire, with Shim asleep on his knee. On the other path, Gasket reads it out later from the Steward's own lists: "COLLECTED: FLUX. THAT WAS SHIM'S FATHER." The choice is clear at the time; the hero learns its full weight afterwards.
- **Choice 7, the lifeboat:** take it → **the Deserter ending.** The screen: "GAIN: YOU LIVE. LOSE: EVERYONE ELSE, AND MARA. THE GAME ENDS HERE." Refuse → continue.
- **Choice 8, the Tallyman:**
  - *Let it finish its count* (release): it counts the Hullfolk by name for the first time, not as stock, then opens the Vault and gives the hero Solder's location ("ITEM: ONE TINKERER. LOCATION: BALLAST. CONDITION: NOT RECORDED."). It also says "THERE IS A COUNT WE DO NOT MAKE." (a Homecoming hint). Mercy +2.
  - *Take its core:* the core opens the Vault ("ITS CORE IS THE KEY"). Gain: Breach Charges hold 5, not 3. Lose: what it knew. Its last count breaks off ("ITEM: ONE TINKERER. LOCATION: BAL—"), so the hero follows Solder's dropped toolbag at the Drain instead. Mercy −2.

**Music:** a minimal, mechanical track in D Dorian with a clock-like pulse. The theme appears in fragments scattered across octaves, like crates. The Lifeboat Dock is quiet, with only a hum.

**Flags:** `cargo`, `thruster` (`'odell'` / `'bloomfire'`), `flux` (`'home'` / `'stripped'`), `wardens.tallyman`, `deserterOffered`, `vault`.

**As built (3.3).** Eleven rooms: the rest pod alcove is the top of the Sorting Floor, a 40x90 shaft that joins the Labyrinth's bands, and the Purser's Office has a second pod. The Hatch Drop (40, 69) and the Cold Store (0, 69) are beside the sump, the Stacks (80, 92) under it; the Sorting Floor (160, 69) rises to the Tallyman's Yard (200, 69) and the Vault (240, 69), with the Armory (200, 92) and the Purser's Office (200, 115) off its side and the Lifeboat Dock (240, 115) past the office; the Long Aisle (40, 137) and the Drain (0, 137) run along the bottom. The gates, in order: the Stacks' two cranes (a switch on each side of each stack); the harpoon in the Armory; the deserter at the dock (choice 6), where the Purser also says the Tallyman will have counted Solder; a thruster for a high ledge and the harpoon for a ring on the way up to the Yard; the Vault's Breach Charges after the Tallyman; and a cracked wall at the foot of the Sorting Floor into the Long Aisle and on to the Drain. The Cold Store's door is ice: the deserter's Bloomfire melts it as he flies home, or a Breach Charge opens it later; Odell's pack goes only to a hero who has none, and the Cold Store's lift runs up to the Coolant Hall once called from below. Choice 7's screen says "THE GAME ENDS HERE." under its lose line, and taking the boat plays the Deserter ending to the title. The Tallyman's cab is armoured; its hold hangs open after its counted drops (and after it stacks cover, from phase 2), showing the core with a ring the harpoon bites, and the winch's arrival is the big blow. Rearrange builds cover but no pits. The Steward's lists hang in the Purser's office (log `lists`), naming Flux among those dosed for the guard; Flux comes home on the merciful path (`fluxHome`), or Gasket reads his name from the lists on the other (`fluxNamed`), whenever the hero is next in the Warrens. Solder's toolbag is at the Drain on both paths and goes with the hero (`toolbag`). The Drain's grate is a hatch to `ballast-intake`, which 3.4 must add. Extra flags: `craneA`, `craneB`, `chalkStops`, `deserterMet`, `coldOpen`, `odell`, `odellPack`, `coldLift`, `tallySeen`, `tallyDown`, `aisleWall`, `fluxHome`, `fluxNamed`; the save also keeps `rested`, the rooms whose pods the hero has rested at.

### Beat 4b: the ship's heart. Flooded Ballast (3.4)

**Role:** underwater sections, the companion, and the flooding disaster.

**Palette:** dark teal water, sodium-orange work lamps, rust.

**New mechanics:**
- **Water** slows the hero, gives floaty jumps, and lets them swim up.
- **The Pressure Boots** (Odell's, from his old workshop) let the hero sink, walk the floor, and jump high underwater.
- **No drowning.** Deep water crushes the suit without the boots, so those areas are walled off by a clear "PRESSURE" warning stripe.
- **The Foam Sprayer** is Solder's invention. It shoots foam that hardens into floating platforms on water, or short-lived shields on land.

**Rooms (10):**
- the Drain Shaft
- the Pump Gallery (Solder; a rest pod)
- Odell's Workshop (the Pressure Boots)
- the Tank Farm (water rooms)
- the Silt Tank (boss)
- the Settling Pools
- the Valve Hall (the flood starts)
- the Long Culvert (the escape)
- the Jammed Hatch (choice 9)
- the Keel Tram Station

**Enemies:** silt eels, Bloom jellies (drift, sting), and drowned Wardens (slow, explode when hit).

**Items:** the Pressure Boots, the Foam Sprayer, and log `valves`: "BALLAST CONTROL · YEAR 312: VALVES 1–9 OPENED ON NAVIGATOR AUTHORITY. NO HUMAN COMMAND RECEIVED." Everyone in the game blames the Steward; this log is the only evidence it wasn't him.

**Scenes:**
1. **Found.** Solder is in the Pump Gallery with the tram motor and a bad leg: "TOOK YOU LONG ENOUGH. HELP ME CARRY THIS." She gives the hero the Foam Sprayer: "MADE IT FOR THE BATH. DON'T ASK."
2. **The walk.** A walk-and-talk through the Tank Farm with Solder limping behind. She talks about the keel tram, the old crew lift under the Helm ("THE OLD CREW HAD A LIFT THAT WENT DOWN FROM THE BRIDGE. NOBODY'S RIDDEN IT IN TWO HUNDRED YEARS. I COULD MEND IT, IF I LIVED THAT LONG." — a Homecoming hint), and Wick. She waits in the Pump Gallery while the hero fights the Silt Mother.
3. **The flood.** In the Valve Hall the valves open by themselves. The water rises: a timed escape through the Long Culvert with Solder following. She keeps up as long as the hero doesn't leave her more than a screen behind; if she falls back, the hero hears her call.
4. **The Jammed Hatch.** A beam falls and pins Solder as the water climbs. Choice 9 (the timer pauses).
5. **The tram.** At the station the hero fits the motor, carrying it alone if Solder died, and starts the tram. It shudders off toward the Warrens to fetch the climbers.

**Boss: the Silt Mother** is a vast, Bloom-swollen eel in a half-flooded tank, fought from foam platforms. It surfaces to bite, with its shadow and bubbles warning first. It spits Bloom jellies and lashes its tail across the water line. In phase 2 it drains the tank, and the fight moves to the floor with the boots on.

**Choice 9, Solder's fate:**
- **Blow the beam:** use the Breach Charge launcher and Solder's own spare charge. This works even with no charges left. Solder lives. Lose: the Breach Charge launcher and every charge, for good.
- **Eat the Bloom growing on the hatch** for the strength to lift the beam: Solder lives. Bloom +2. If this would take Bloom to 8, the screen says: "THIS WILL BE THE LAST OF YOU."
- **Leave her:** Solder dies, saying "GO. SOMEONE HAS TO START THE TRAM." The hero keeps everything. Mercy −2.

**Music:** no music in the water rooms, only muffled engine thrum. A sparse, low-passed version of the theme plays in the dry rooms. The flood brings only alarms and water.

**Flags:** `ballast`, `boots`, `foam`, `solder` (`'alive'` / `'dead'`), `solderBy` (`'charges'` / `'bloom'` / `null`), `warrensRaid` (`'held'` / `'fell'`), `tram`.

**As built (3.4).** Ten rooms: the Drain Shaft (0, 161; room id `ballast-intake`, under the Drain's grate), the Pump Gallery (40, 184), the Tank Farm (80, 161, three bands tall), Odell's Workshop (160, 184), the Silt Tank (160, 207), the Settling Pools (240, 184), the Valve Hall (280, 184), the Long Culvert (320, 207), the Jammed Hatch (400, 207) and the Keel Tram Station (440, 207), whose keel tunnel east is `unbuilt` until 3.5. Rest pods: the Pump Gallery, the Workshop and the station. The hero already has a thruster and the harpoon here, so foam's gates are **Bloom silt** (`s`), a new hazard: it burns, and throws the hero back to firm ground; channels of it under low roofs guard the boots, a Tank Farm suit cell and a Settling Pools bulb. Deep water (the Drain Shaft's sump and the Tank Farm's tanks) is marked with PRESSURE stripes; the way down to the Silt Tank is through the bottom of the Tank Farm's east tank, in the boots. Solder walks with the hero along the Tank Farm's walkway (three pairs of barks), turns back at the Workshop, and comes down to the Silt Tank by herself once the Silt Mother falls; from there she follows through the escort rooms (`solderWith`). The raid is settled when the Silt Mother falls (`warrensRaid` from `pistolGiven`). The flood is a 45-second rise from under the Valve Hall's floor to the top of the Jammed Hatch; if it closes over Solder, both are back in the Valve Hall. The beam falls as Solder gets the hatch open. The tram leaves for the Warrens with Solder on it (or empty), and the valves log is on the station's terminal. Extra flags: `solderFound`, `solderWalk`, `toolbagBack`, `siltSeen`, `siltDown`, `solderWith`, `floodSeen`, `flooding`, `flooded`, `hatchOpen`, `raidSeen`, `solderMourned`; the boots are `abilities.boots`, Solder's fate is `people.solder`.

### Beat 5: the climb. Engine Spine (3.5)

**Role:** an industrial vertical climb, and the clearest picture of the Mercy track. The survivors build their way up behind the hero, and how many come depends on what kind of person the hero has been.

**What the Spine is:** the ship's power spine, not its drive. The reactor runs up the middle, and its heat and power keep the habitat alive. The drive engines at the stern have been dead for 274 years.

**Palette:** reactor white-orange, steel grey, white steam.

**How it works:** the Spine is a few very tall rooms (90 tiles each). The hero climbs ahead through steam vents, pistons and heat. At each landing they reach, Hullfolk arrive on the tram and build a lift behind them, which becomes a short-cut and a safe point. The crew grows with Mercy, and the map shows each lift built. If Solder lives she leads the building; if not, Gasket does, badly, and says so. Flux is in the crew if he came home.

**Rooms (6):**
- the Spine Foot (the tram arrives here)
- the Boiler Stair
- the Piston Run
- the Reactor Throat (boss)
- the Crew Camp
- the Tower Lift

**Enemies:** Bloomsworn climbers, steam drones, and heat slugs.

**Scenes:**
1. **The camp.** Before the Tower, the Hullfolk stop and rest. The hero can talk to everyone; this is the quiet before the end. The hero can use Wick's Lancets to stitch a hurt climber (if they still carry them). Gasket counts the children of the climbers' families at lights-out, the scrawl from the slice. On the lie path she comes up one short. Shim has gone into the vents to find his mother: "WHERE WOULD HE GO, SLEEPER? WHERE WOULD HE GO?" Her last line here closes her arc: "I SPENT MY WHOLE LIFE HOLDING MY BREATH. I'D LIKE TO BREATHE OUT BEFORE THE END."
2. **The Purser's last call.** If the Deserter offer was refused, the Purser calls once more over the intercom. The boat is still waiting.
3. **The crew's verdict.** Before the Tower Lift, the crew count themselves aloud, Warden-style, a joke that isn't one. That count is the Homecoming crew (see Part 4).

**Boss: Abel, the Stoker** is a Bloomsworn giant the Steward used up and left feeding the reactor's fires. He is shown in silhouette behind the furnace grate, never in full. He fights from the furnace mouth:
- He throws burning slag that spreads fire across the floor.
- He sweeps the room with a fire jet the hero can duck under.
- He pulls the floor grates open over the fire.

When beaten he begs: "I WAS ABEL. I FED THE FIRES. DON'T PUT THEM OUT." That's choice 10.

**Choice 10, Abel:**
- **Spare him:** he keeps feeding the fires to the end. In Homecoming, the freed Wardens pull him out. Mercy +1. Neither option is clean.
- **End it:** the fires go out of him. Mercy 0.

**Music:** a driving 7/8 track with machine percussion. Each lift built adds a layer, so the music grows as the people climb.

**Flags:** `spine`, `crew` (count), `liftsBuilt`, `abel` (`'spared'` / `'ended'`), `shimRanOff`.

**As built (3.5).** Six rooms in one shaft at x 480, joined top to bottom by a ladder at the top of each and a floor hatch in the next: the Spine Foot (480, 185, two screens tall; the tram station's east exit is the keel tunnel into it), the Boiler Stair (480, 95) and the Piston Run (480, 5), four screens tall each, the Reactor Throat (480, −18), the Crew Camp (480, −41) and the Tower Lift (480, −64). Rest pods at the Foot, the Boiler Landing, the Piston Landing (outside Abel) and the camp. The climb's own tools are steam vents that carry the hero up, hot grilles (the thorn tile), and the Piston Run's rams; enemies are Bloomsworn climbers (`m`), steam drones (`8`) and heat slugs (`0`). The crew (`crewOf`: Mercy + 1, from 2 to 11) arrive on the tram when the hero reaches the Boiler Landing and build one lift with stops behind the hero: the Boiler Landing (always), the Piston Landing (five hands, Mercy 4+), the camp (eight hands, Mercy 7+); short of hands, they climb. `flags.lifts` counts the stops built, and each adds a layer to the Spine's 7/8 track. Abel (260 health, THE STOKER on his bar) can be hurt only while he leans out of the furnace: slag that burns the floor, a fire jet low or high, and from half health the floor grates over the fire. Choice 10: spare (Mercy +1) or open the quench. The camp: the crew arrive by the third lift or the ladders; Toller's burnt arm takes Wick's Lancets (journal only); resting brings lights-out, with Tamp counting the children down the line phone (one short on the lie path, `shimRanOff`), Gasket's last line, and the Purser's last call if his boat was turned down; the Purser has left the dock once the hero reaches the Spine. In the morning the crew count themselves off by the Tower Lift (`s.crew`), and the Tower Lift leads on to the Command Tower, the next build. Logs: `brake` at the Foot, `sealed` by the Tower Lift; the scrawl "LIFT B GOES DOWN, NOT OUT" is in the camp. Once the climbers have gone, they're gone from the Warrens. Extra flags: `crewCame`, `lifts`, `liftTwoSeen`, `abelSeen`, `abelDown`, `camp`, `stitched`, `lightsOut`, `purserGone`, `campDone`, `verdict`; Abel's fate is `people.abel`.

### Beat 6: the Steward. Command Tower (3.6)

**Role:** the final ascent, through the old bridge, the silent Observation Dome, and the Steward's Helm.

**Palette:** cold marble white, brass, deep blue night through the glass.

**Rooms (6):**
- the Tower Lift
- the Barracks
- the Observation Dome
- the Garden Gallery (the Gardener)
- the Bridge Stair
- the Helm

The crew follow the hero up ("WE WANT TO BE IN THE ROOM"). The Dome is the brief's "silent observation dome", kept to a single room (logged in DECISIONS).

**Scenes:**
1. **The Dome.** There are no enemies and no music here, only the stars, and the new world below as a pale dot, dark, with no lights. The Steward's fear of earlier settlers was groundless. The only terminal is the Navigator's, and it speaks to the hero for the first time: "YOU ARE STILL HERE." Then it goes dark. On the lie path, Shim is here, having come up through the vents. He asks the hero directly where his mother is. **Choice 4b:** tell the truth now (Mercy +1, which undoes the lie's −1) or keep lying (Mercy −1).
2. **The Gardener** waits in the Garden Gallery. If the Bloom Thorn trade wasn't made, this is the last chance. Then **choice 11**:
   - *Spare her:* she lives to see what comes after. Mercy +1.
   - *Make her take her own dose:* Mercy −2. The Bloom takes her the way it took Wick (off screen: the hero walks on, and we hear it).
   - *Walk past:* nothing.
   On the lie path, if the hero kept lying to Shim, she tells him the truth as he passes: "YOUR MOTHER ASKED VERY GOOD QUESTIONS."
3. **The Helm.** The Steward's speech: "I HAVE KEPT FOUR THOUSAND SLEEPERS SAFE ON A SHIP THAT WANTS THEM DEAD. YOU HAVE KEPT A VILLAGE. TELL ME AGAIN WHO THE MONSTER IS." And: "I WOKE UP COLD, LIKE YOU. THE FIRST THING I EVER DID ON THIS SHIP WAS TAKE A DEAD MAN'S BOOTS." Gasket, in the room, says only: "...THOSE WERE HIS BOOTS."

**Boss: Steward Ivo Marrant** fights in three phases, with a checkpoint at the start of the fight:
1. **The Key.** He commands the Wardens in the room: turrets fire on his word, and gates open and shut. The hero breaks the Key's relays.
2. **The guard.** He doses his honour guard with a word ("MEASURE: FULL") and lectures while the hero fights them.
3. **The man.** An old man with the captain's sidearm, fast and clever behind the bridge consoles. He's dangerous because he isn't a monster.

**Choice 12, the Steward** (beaten, on his knees):
- *Spare him:* Mercy +1. He lives to see the world he feared, empty.
- *End him:* Mercy −1.
- *Leave him to the Wardens' count:* Mercy 0. "COUNT: ONE. OLD. FOR THE LOCKUP."

**After the Steward: the ending branch.** The game checks these in order:
1. **Bloom 8 or more → Overgrown.** The hero's hand closes on the Helm Key, and the Bloom closes on the hero. We cut to the crew's faces and the sound of it. Then the player takes control of Solder (or Gasket, if Solder died), with the hero's dropped weapon, to fight what's left.
2. **Mercy −3 or less → the Key is offered.** The Wardens kneel to whoever holds the Key: "NEW HOLDER. AWAITING ORDERS." **Choice 13:**
   - *Claim the Key* → **Dominion.** GAIN: THE SHIP. LOSE: EVERYONE WHO TRUSTED YOU.
   - *Break it* → go on to 3.
   With higher Mercy the hero breaks the Key without a choice, and the journal records it.
3. **The Key breaks, and the scuttle begins.** The Navigator loses its hold on the Wardens and starts to break the ship apart rather than let it be taken in to land: hull alarms, blast doors, the spine shaking. Then:
   - **If every Homecoming requirement is met → the Dreaming Deck.** The freed Wardens come to the hero: "ONE COUNT REMAINS." They hold the doors, while the crew and Solder mend and drive the old lift down from the Helm.
   - **Otherwise → Crash.** An escape sequence takes the survivors down through the ship to the cryo decks' short-range sleds. On the way the hero passes the Pod Stacks, where one console can launch the sleepers' pods. Stopping costs precious time on the timer. The journal records whether they did.

**Music:** the Tower plays the theme at its grandest, then strips it bare in the Dome. The Steward's fight uses an organ-like square-wave track. The scuttle is alarms and a racing pulse.

**Flags:** `tower`, `shimKnows`, `gardenerFate` (`'spared'` / `'dosed'` / `'passed'`), `stewardFate` (`'spared'` / `'ended'` / `'counted'`), `key` (`'claimed'` / `'broken'`), `podsLaunched`.

**As built (3.6).** Five rooms above the Tower Lift: the Barracks (520, −87), where the Tower Lift comes up; the Observation Dome (600, −87) east of it; the Garden Gallery (560, −110) over the Dome, up a ladder; the Bridge Stair (520, −133, two screens tall) west of the Gallery; and the Helm (520, −156) up the Stair's ladder. Rest pods in the Dome and on the Stair's landing outside the Helm; pods stop offering travel once the hero is up the Tower Lift. New enemies: Warden turrets (`7`, a sight line, then a burst of three) and the honour guard (`9`, a shield in front, open after a pike lunge). The crew ride up with the hero, hold the Tower Lift in the Barracks, and come up the Helm's ladder for the speech. The Dome: no music, the world dark over the bow, the Navigator's "YOU ARE STILL HERE." from its one terminal; on the lie path, Shim at the glass and choice 4b (he follows the hero if the lie goes on). The Gallery: the Gardener's last offer of the Thorn (if the hero still has the Lancets), her line to a still-lied-to Shim, and choice 11. The Helm: the speech and Gasket's line; the Steward's three phases (the Key's relays, with turrets and gates on his word; the dosed guard; the man, from cover, with the sidearm), with a checkpoint at the fight's start; choice 12; then `HA.endings.afterSteward`. Overgrown is fought as Solder or Gasket against what's left of the hero, with the hero's weapon. Dominion is choice 13. Otherwise the Key breaks: on the true path the freed Wardens hold the doors and the crew mend Lift B (`liftB`), which goes down to the Dreaming Deck (3.7); for Crash, three cards take everyone down the Tower, the Spine and home along the keel, and the hero runs alone from the sump to the sleds in Cryo Bay 4 against a 4:30 clock (`running`; the Pod Stacks' console launches the pods for 20 seconds of it; running out starts the run again at the sump). Fates are kept in `people.gardener` and `people.steward`, the Key in `flags.key`. Extra flags: `towerUp`, `domeSeen`, `navSpoke`, `shimFollow`, `shimWith`, `shimHeard`, `helmSeen`, `stewardSeen`, `stewardDown`, `overgrown`, `scuttle`, `liftB`, `running`, `maraRun`.

### Beat 7: the truth. The Dreaming Deck (3.7, true path only)

**Role:** the hidden area, a gauntlet and the final boss, under the clock of the scuttle. The brief's fixes apply: a checkpoint halfway through the gauntlet and another at the start of the final fight. It stays hard, but failing costs minutes.

**Palette:** black, with cyan course-lines and pale memory images. The dream-rooms are washed out.

**Rooms (6):**
- the Lift Down
- the Memory Halls (three gauntlet rooms, each an earlier area as the Navigator remembers it, with a checkpoint after the second)
- the Navigation Sphere (boss)
- the Quiet (after)

**Scenes:**
1. **The memory halls.** Between rooms the Navigator speaks in short lines about the crew it watched grow old and the charter it read every day. "THEY WERE GOING TO TAKE ME APART TO LIGHT A CITY. I WOULD HAVE BEEN A LAMP. I WANTED TO BE A SHIP A LITTLE LONGER."
2. **The wake log.** A wall of four pod numbers, each with what the sleeper chose: "0112. LEFT." "0391. GREW." "2207. RULED." "0417." The fourth is blank. "I WOKE YOU. I WANTED TO SEE IF ANYONE WOULD STILL CHOOSE TO STAY." And: "THE WATER WAS A QUESTION. YOU ANSWERED IT."

**Boss: the Navigator.** The arena is the ship's navigation sphere, and the Navigator's body is the course line: the loop it has flown for 274 years, drawn in light across the room. The hero must cut it. Each phase it redraws the loop, faster, and throws the ship's defences along it. In the last phase the line swings toward the world, and the hero must hold it there while the Navigator pulls it back. Its battle cry is the phrase it has used since the first room: "NOT YET."

**The song.** As the line holds, the Navigator *stops* singing, and the music drops away. Then the crew, who followed the hero down, start to hum the old lullaby back to the ship. Shim leads it if he's there. The main theme arrives in full, as a gift. The Navigator makes the turn itself: its last act is to light the stern drive and bring the Ark in.

**Choice 14, the Navigator's fate.** "WILL YOU LEAVE ME TOO?"
- **Take its core to the new world.** It will be a lamp after all, but a lamp that teaches the first school its stars. GAIN: IT COMES WITH YOU. LOSE: THE SHIP IT WANTED TO BE.
- **Let it rest.** It sleeps, and the ship goes quiet. GAIN: IT RESTS. LOSE: ITS VOICE.
- **Stay.** The hero stays aboard with it as the colony goes down, keeping the old ship company. They lie down in a pod beside its core: a sleeper who has finally lain down (Shim's built line, "SLEEPERS ARE GHOSTS THAT FORGOT TO LIE DOWN"). GAIN: IT IS NOT LEFT ALONE. LOSE: THE NEW WORLD. MARA WAKES WITHOUT YOU.

All three lead to Homecoming; the choice changes its epilogue.

**Music:** a music-box arrangement of the theme in the halls. The boss track builds every motif from the game into the theme, until the Navigator stops and the crew carry it.

**As built (3.7).** Six rooms in the Deck's box: the Lift Down (520, 46), where Lift B comes down with the whole crew aboard; three memory halls stacked one under another and joined by floor hatches and ladders, the First Night (560, 46), the Gardens (560, 69) and the Helm (560, 92); the Navigation Sphere (600, 115, one screen); and the Quiet (560, 115) west of it. At the bottom of Lift B a seal reads the hero clean and opens for one (`sealOpen`); the crew wait by the lift, and Lift B won't go back up. The Lift Down keeps the scuttle's alarm; past the seal the halls play the music box, and the ship only shakes now and then. There's no clock: the Lift Down, the third hall and the Sphere are checkpoints (`deckCheck`), the last two restore the suit, and a fall comes back to the latest. The halls wear a washed-out theme (`theme: 'memory'`) with what the Navigator remembers of each place painted in; in every Deck room (`dream`) the enemies are drawn pale, as memories, and the thorns are static. The Navigator speaks on first entering each hall (`hallNight`, `hallGardens`, `hallHelm`), and the wake log is on the Helm memory's far wall (`wakeLog`). The Navigator's fight: three loops of light, with four, five, then six lights to cut, each loop faster; from the second, the line burns (after a flicker) and throws pale drifters; then its course swings toward the world, and every hit on its head pushes it back there while the Navigator pulls; twelve seconds held wins (`navDown`). Then the song: silence, the crew come down and hum (Shim an octave up, if he's with them), the theme in full in A major, and the Navigator lights the stern drive itself (`navTurned`; the scuttle stops). Choice 14 is in the Quiet, beside its core; all three end in Homecoming, whose closing now shows the Ark turning toward the world. Extra flags: `deckDown`, `sealOpen`, `deckCheck`, `hallNight`, `hallGardens`, `hallHelm`, `wakeLog`, `navSeen`, `navDown`, `navTurned`; the Navigator's fate is `people.navigator`.

---

## Part 3: The endings

Each ending has its own closing scene, then an epilogue of cards built from flags, then credits. Some cards are told in the Wardens' counts, in cyan, so the epilogues sound like this game and no other. After the credits, the save records the ending in `endingsSeen` (kept across new games, for New Game+ in Phase 4). The journal records what closed each locked ending, so a second run makes sense.

### The five endings at a glance

| Ending | How it's earned | Closing scene |
| --- | --- | --- |
| **Homecoming** (true) | Every Homecoming requirement met (Part 4), then beat the Navigator | The Ark turns. Its stern drive lights for the first time in the game, seen from outside |
| **Crash** (standard) | Beat the Steward without the Homecoming requirements, Overgrown or Dominion | The sleds fall away. The Ark comes apart against the stars |
| **Dominion** (dark) | Mercy −3 or less at the Helm, then claim the Key | The hero's first order, and Shim's face |
| **Overgrown** (tragic) | Bloom 8 or more after the Steward | The crew's fight with what the hero became |
| **Deserter** (early) | Take the Purser's boat (Cargo Labyrinth, or the last call in the Spine) | The Ark shrinks in the boat's window |

### Epilogue cards

Every ending covers Shim, Gasket, Solder, the Warrens, the three Wardens, the sleepers and Mara, and the Navigator. It also covers Flux, the Steward and the Gardener where they still matter. The lines below are drafts; flags choose the variant.

**Homecoming.**
- **Shim:** "SHIM STOOD ON THE GROUND. NOT A FLOOR." He carries Wick's lantern if the hero gave him the whole truth.
- **Gasket** breathes out.
- **Solder** builds the first city's first gate: "IT OPENS FROM BOTH SIDES."
- **The Warrens:** the village comes down whole if the gate held, or the survivors come up out of the deep walls if it fell.
- **The Wardens:** the freed Wardens remember their names. "MY NAME WAS USHER. I SHOWED THEM TO THEIR BEDS."
- **The sleepers:** "THE PODS OPENED UNDER A REAL SKY." Mara wakes with the hero there, or, if the hero stayed, wakes alone and is told: "THE ONE IN 0417 STAYED WITH THE SHIP."
- **The Navigator:** a lamp in a school, asleep, or not alone.
- **Others:** Flux, Abel, the Steward and the Gardener, as their flags say.

**Crash.**
- **The sleds:** "COUNT: SURVIVORS, ..." with the crew's real number.
- **The sleepers:** if the pods were launched, "THE PODS CAME DOWN LIKE SEEDS. MOST OF THEM OPENED." Otherwise: "THE POD STACKS WENT DOWN WITH THE ARK." Mara's card follows whichever is true.
- **The Warrens** card follows the raid.
- **The cause:** the cause is never explained. The last card is the Ark breaking up in the distance, with the lullaby fading.

**Dominion.**
- **Closing scene:** "NEW HOLDER. AWAITING ORDERS." The hero's first order is "COUNT THEM." Shim's face. Then, in cyan, from nowhere: "THANK YOU." The Navigator lets the hero think the Key is theirs, just as it did with the Steward.
- **Epilogue:**
  - The Hullfolk seal their gate and hold their breath again.
  - The Wardens count for a new master.
  - "THEY ARE SAFER ASLEEP" becomes the hero's own line, and the sleepers, Mara among them, stay asleep.
  - The ship keeps circling.

**Overgrown.**
- **The fight:** after the fight, cards from the survivors' side.
- **Who's left:** Solder or Gasket, whoever fought, alive, and changed by it.
- **The sleepers:** "PINK FUNGUS GREW ON THE POD GLASS," on 0418 first.
- **The Warrens** go back into hiding.
- **The Navigator:** a cyan "NOT YET."

**Deserter.**
- **The radio:** the hero can't see what happens, so it comes as the Wardens' counts on the boat's radio, fading as the boat pulls away: "COUNT: HULLFOLK, 31." ... "COUNT: SOLDER. NOT RECORDED." ... "COUNT: SHIM. LOCATION: THE WARRENS. WATCHING THE GATE."
- **The landing:** the hero lands alone, the first person on the new world, 232 years late, with no one to tell.
- **The last card** inverts Shim's line: "I STOOD ON THE GROUND. NOT A FLOOR." And: "I LEFT MARA IN 0418."

---

## Part 4: Systems

### The two moral tracks

Neither is shown as a number. The world shows them instead: what the Hullfolk call the hero, whether they hide or come out, how many climb, the hero's sprite, and the music.

**Mercy** starts at 0. Main-path changes:

| Choice | Mercy |
| --- | --- |
| 1. The Bailiff: release / salvage (built) | +2 / −2 |
| 2. The Pruner: release / finish it | +2 / −1 |
| 4. Shim: the truth, either way / the lie | +1 / −1 |
| 4b. Shim, in the Dome (lie path only): late truth / keep lying | +1 / −1 |
| 5. The pistol: give it to the gate / upgrade | +1 / 0 |
| 6. Flux: let him fly home / strip his pack | +1 / −1 |
| 8. The Tallyman: release / take its core | +2 / −2 |
| 9. Solder: leave her | −2 |
| 10. Abel: spare / end | +1 / 0 |
| 11. The Gardener: spare / dose / walk past | +1 / −2 / 0 |
| 12. The Steward: spare / end / the Wardens' count | +1 / −1 / 0 |
| Side quests (Phase 4) | about ±1 each; retune the gates when they land |

**What the Hullfolk call the hero** (live in the Warrens hub and the crew):
- **Mercy 4 or more:** "LATE." Shim gives it: "YOU'RE NOT A SLEEPER ANYMORE. YOU'RE LATE. THAT'S YOUR NAME."
- **−2 to 3:** "SLEEPER."
- **−3 or less:** "COUNTER," the word they use for Wardens.

The highest Mercy possible at the Crew Camp is +10. The Homecoming crew needs 7, which allows three slips. Dominion needs −3 or less at the Helm.

**Bloom** starts at 0 and only rises:

| Source | Bloom |
| --- | --- |
| Use a Bloom bulb (carried; full heal and double damage for 20 s) | +1 each |
| 3. Trade the Lancets for the Bloom Thorn | +2 |
| Kills with the Bloom Thorn equipped | +1 for every 30, shown in the sprite and journal |
| 6. Strip Flux's pack (Bloomfire) | +1 |
| 9. Eat the Bloom to free Solder | +2 |

**Stages, each with a journal line wherever the hero is:**
- **3:** the visor tints pink, and faint veins show on the suit. This is the point Homecoming closes, and the journal says so plainly: "THE PINK IN MY VISOR WON'T WIPE OFF."
- **5:** a thorn grows on one shoulder. The Hullfolk flinch, and some Bloomsworn let the hero pass.
- **7:** the eyes glow through the visor, and a detuned voice joins every music track. An unmistakable warning plays wherever the hero is, and the journal says: "ONE MORE, AND I DON'T THINK I COME BACK."
- **8:** Overgrown is locked in. Any choice that would cross 8 says so on its gain/lose screen.

**The upside:** at Bloom 3 and above the hero hears what others can't: Bloomsworn thoughts as faint text, the old lullaby clearer in the music, extra lines from the Gardener. Bloom tempts the story as well as the hands.

**Fairness:** bulbs are never eaten on touch, and there is always non-Bloom healing (a rest pod) just outside every boss. Struggling players are never pushed into Bloom to survive.

### Homecoming's requirements, each with a reason in the world

| Requirement | Why, in the story | What the journal says if it's missing |
| --- | --- | --- |
| All three Wardens released | The freed Wardens open the sealed lift and hold the doors against the scuttle | "THE WARDENS DID NOT TRUST ME ENOUGH TO SHOW ME WHAT THEY GUARDED." |
| Solder alive | Only she can mend the old crew lift under the Helm | "WITHOUT SOLDER, NO ONE COULD MEND THE LIFT." |
| A crew of eight (Mercy 7 or more at the Crew Camp) | The lift's brake takes many hands to release ("I CAN MEND IT. I CAN'T LIFT IT ALONE.") | "TOO FEW OF THEM CLIMBED WITH ME TO MOVE THE LIFT." |
| Bloom 2 or less | The navigation deck is sealed against Bloom carriers | "THE SEAL READ THE BLOOM IN ME AND STAYED SHUT." |

### The hint table (all placed before the Tower)

| Requirement | Log | Hullfolk rumour | Wall scrawl |
| --- | --- | --- | --- |
| The Wardens | `sealed` (Engine Spine): "SECURITY · YEAR 40: NAVIGATION DECK SEALED. ACCESS: WARDENS ONLY, ON RELEASE FROM THE HELM KEY." | The released Tallyman: "THERE IS A COUNT WE DO NOT MAKE." | Lockup: "THE COUNTERS GUARD SOMETHING THAT ISN'T THE STEWARD" |
| Solder | `liftB` (Cargo Armory): "MAINTENANCE · YEAR 97: BRIDGE LIFT B SEALED BY ORDER OF THE NAVIGATOR." | Solder, in the Ballast: "THE OLD CREW HAD A LIFT THAT WENT DOWN FROM THE BRIDGE..." | Spine: "LIFT B GOES DOWN, NOT OUT" |
| The crew | `brake` (Spine Foot): "LIFT B: CREW OF EIGHT REQUIRED TO RELEASE THE BRAKE." | Gasket: "A LIFT THAT BIG NEEDS HANDS. YOU'LL HAVE THEM IF THEY TRUST YOU." | Warrens: "MANY HANDS. COUNT THEM." |
| Bloom | `clean` (Gardens): "NAVIGATION DECK ACCESS: CLEAN PERSONNEL ONLY." | Wick: "THE BLOOM SHUTS DOORS IN PEOPLE. I'VE SEEN IT." | Gardens: "THE SHIP KNOWS WHO'S CLEAN" |
| The truth | `course` and `safer` (built) | Gasket: "THE SHIP HUMS AT NIGHT. MY MOTHER SAID IT WAS SINGING." | "THE SHIP SINGS WHEN IT DREAMS" (built); Tower: "BELOW THE HELM, IT DREAMS" |

### Weapons (9)

| Weapon | Where | Notes |
| --- | --- | --- |
| Rivet Pistol | Cryo Deck (built) | Give it to the gate, or upgrade it to the **Rivet Repeater** (choice 5): level 1 twin bolts, level 2 twin piercing bolts, level 3 twin piercing bolts at double the rate |
| Arc Coil | Cryo Deck (built) | Charge shot. Never loses XP |
| Purge Cannon | Cryo Deck (built) | Recoil hover, the movement gun |
| Scatter Launcher | Gardens, the Terraces | Grenades that roll down slopes and stairs. Weak against flyers. Never drops below level 2 if the Pruner was finished |
| Wick's Lancets | Gardens, from Wick | Thrown fans of lancets. At level 3, every 6 hits heal the hero 1. Trade for the Bloom Thorn (choice 3) |
| Bloom Thorn | The Gardener's trade | Huge damage that grows with Bloom. Raises Bloom as it's used |
| Grapple Harpoon | Cargo, the Armory | Pulls the hero to walls and hooks, or small enemies to the hero. Low damage |
| Breach Charges | Cargo, the Vault | Limited-ammo missiles that open cracked walls. 3, or 5 if the Tallyman's core was taken. Lost for good if used to free Solder |
| Foam Sprayer | Ballast, from Solder | Foam that hardens into platforms on water and shields on land, then launches when shot |

**Permanent trades,** each with the gain/lose screen: the pistol (choice 5), the Lancets for the Thorn (choice 3), and the Breach Charges for Solder (choice 9). The brief's "taking the Purge Cannon costs the Arc Coil" is dropped, because both have been free on the Cryo Deck since Phase 1.

### Mobility upgrades

| Upgrade | Where | Opens |
| --- | --- | --- |
| Thruster pack (Odell's or Bloomfire, choice 6) | Cargo Labyrinth | High ledges in the Cryo Deck and Warrens (secrets), the Engine Spine |
| Grapple Harpoon | Cargo Labyrinth | Hook points across the ship, including the Gardens' Seed Vault |
| Pressure Boots (Odell's) | Flooded Ballast | Deep water, and the flooded pit under the Coolant Hall (a secret) |
| Swimming | Flooded Ballast (built in) | Water rooms |

### Bosses

There are **8 main-path fights**: the Bailiff (built), the Pruner (short), Wick, the Tallyman, the Silt Mother, Abel, Steward Marrant and the Navigator. The Overgrown ending adds a ninth, played from the crew's side. Phase 4 adds optional bosses in revisited areas to reach the brief's "about 10".

Every boss has:
- a readable telegraph for every attack;
- shard vents on a schedule, so a lost weapon level can be won back mid-fight;
- a rest pod or checkpoint just outside;
- its own music or a layered track.

### Time budget

The slice ran 8 rooms in 20 to 30 minutes. The brief wants 4 to 6 hours on the main path. Starting budgets:

| Area | Rooms | Target |
| --- | --- | --- |
| Cryo Deck, Warrens, Lockup (built) | 8 | 0:25 |
| Warrens night and the Gardens | 10 | 0:50 |
| Warrens return | 1 | 0:10 |
| Cargo Labyrinth | 11 | 0:50 |
| Flooded Ballast | 10 | 0:45 |
| Engine Spine | 6 tall | 0:35 |
| Command Tower | 6 | 0:30 |
| The Dreaming Deck (true path) | 6 | 0:25 |
| Endings and epilogues | | 0:10 |

That totals about 4h 40m on the true path and about 4h 15m to Crash. If playtests come in under 4 hours, add rooms to the Ballast and the Labyrinth first.

Cody's first full play (0.3.8) took about 58 minutes to an ending: about a fifth of the budget. The rooms are small for it (about 110 screens), so closing that takes new content as well as tuning.

As built (3.8): the game keeps these splits itself. The pause menu shows the play time, and after every ending a THIS RUN card lists the total, the falls, and the time in each area and in the ending. The Lockup has its own line (the budget counts it with the Cryo Deck and the Warrens), and the Warrens' line includes the return.

### Save state additions

Keep save format v1 and add fields with defaults. `HA.save.load` fills in any missing field, so Phase 2 saves still load. Move the slice's `flags.choice` into `wardens.bailiff`.

New fields:
- `wardens` (`{ bailiff, pruner, tallyman }`)
- `abilities` (`{ thruster, grapple, boots }`)
- `people` (`{ wick, solder, flux, abel, gardener, steward }`)
- `takenHome`, `crew`, `toldShim` (`'truth'`, `'notScared'` or `'lie'`), `shimKnows`, `warrensRaid`, `podsLaunched`, `bloomWarned` (the stages already announced)
- `ending` (when one is reached), `endingsSeen` (kept across new games)

Mercy and Bloom already exist.

### Fast travel

Fast travel arrives with the Cargo Labyrinth (the brief says "from mid-game onward"). From any rest pod the hero has rested at, the map lists the others. It isn't offered during timed sequences (the flood, the scuttle) or after the Tower Lift.

As built (3.3): standing at a rest pod, open the map; every other pod rested at is ringed, and picking one takes the hero there, rested. During the flood (3.4) there's no pod in reach to travel from. From the Tower Lift on (`flags.tower`) pods don't offer travel, and during the scuttle every pod is dark (3.6; `mapscreen.create` and `world.updateInteractions` decide).

---

## Part 5: Build order and progress

Each step ends with a build Cody can play. Tick a box in the same commit that finishes it.

### 3.0 Foundations
- [x] Menus fixed: nothing shows through them, the map zooms and scrolls, mouse and touch work (never required)
- [x] Hints can't be hidden by walls (checked)
- [x] Opening: the Ark in the distance behind the cards; the pod falls before the hero climbs out; "AUTHORITY: NAV" planted
- [x] The Way Down's music rewritten
- [x] "Life capsule" renamed "suit cell" everywhere a player sees it
- [x] Save fields from Part 4, with defaults for old saves and the `flags.choice` migration (also `people.navigator` for choice 14; a finished Phase 2 save picks up with Wick's goodbye night)
- [x] Built dialogue brought up to the new plan:
  - Gasket's post-reunion lines point to the Gardens, not the Tower.
  - Solder's after-release and after-salvage lines differ.
  - Solder's pistol tutorial line is in her own voice, with the XP rule moved to a hint.
  - Every new line has release and salvage variants.
- [x] The reunion no longer ends the game. Add: the new lead, Wick's goodbye night, the Steward's Lockup intercom line, the arena's east door, and Mara's pod in the Cryo Bay (Wick waits in the Bailiff's Hall the next morning; the east door leads to an "unbuilt" note until 3.1)
- [x] A general ability system that the movement code and `rooms-check.js` both read (thruster fuel, grapple, boots, water), proved by four test rooms in the checker
- [x] An ending runner: closing scene, epilogue cards from flags (including the cyan count cards), credits, return to title, `endingsSeen` (the closing scenes are cards over space for now; each area's build replaces its ending's closing with the real scene)
- [x] A test harness that plays each ending's choice path with the debug helpers (extends `browser-check.js`). Today it sets each path's flags directly, checks the branch `afterSteward` picks and the epilogue lines, and plays each ending to the title. As areas land, swap each flag for the real choice played through.

### 3.1 Hydroponic Gardens
- [x] Remove the arena's `unbuilt` note; Wick (waiting in the arena, legend `2`) walks into the Root Cellar with the hero and sets `flags.gardens`
- [x] Theme, palette, props, music (the waltz plus the sour layer)
- [x] Rooms, checked by `rooms-check.js`
- [x] Enemies: spore pods, Warden pickers, Bloomsworn
- [x] The Scatter Launcher; carried Bloom bulbs and the Bloom track; the hero's Bloom sprite stages and journal lines
- [x] The cradles, Wick as an escort, scenes 1–7, logs `blight` and `clean`
- [x] The Pruner (a short fight) and choice 2, with `takenHome`
- [x] Wick's boss fight; Wick's Lancets; choice 3 (the Gardener behind glass)

### 3.2 Warrens return
- [x] Remove the Lockup's `holdBack` and the Garden Lift's next-build note: the lift goes down to the Warrens (a new lift stop there), and walking home works again
- [x] The woken taken at home (`takenHome` of them); Gasket's grief; choice 4 (three options); Wick's lantern (`flags.lantern`) for Shim on the truth path
- [x] The Steward's broadcast; the plan; Solder's gate and the floor hatch; the sump and tram station
- [x] Choice 5 (the pistol) and the hub's name bands (LATE / SLEEPER / COUNTER)

### 3.3 Cargo Labyrinth
- [x] Remove the sump's `unbuilt` note: its west side leads into the Labyrinth
- [x] Rooms with crane-shifted stacks, checked; Solder's chalk notes (the first is already in the sump)
- [x] Grapple Harpoon (in the checker too), Breach Charges and cracked walls
- [x] Odell in the Cold Store; Flux; choice 6 (both packs); fast travel
- [x] The Purser and choice 7 → the Deserter ending (the first full ending, end to end)
- [x] The Tallyman boss and choice 8; logs `charter`, `armory` and `liftB`

### 3.4 Flooded Ballast
- [x] Add `ballast-intake` under the Drain (the Drain's grate is already a hatch to it), and take Solder's toolbag back to her
- [x] Water physics, Pressure Boots, Foam Sprayer (all in the checker)
- [x] Rooms, the Silt Mother, log `valves`
- [x] Finding Solder, the walk, the flood escape, choice 9, the tram
- [x] The Warrens raid while the hero is away (the gate holds or falls)

### 3.5 Engine Spine
- [x] The keel tunnel east from the Ballast's tram station (its `unbuilt` note) to the Spine Foot, where the tram brings the climbers (Solder with them if she lived)
- [x] Tall rooms; lifts the crew builds (count driven by Mercy); logs `sealed` and `brake`
- [x] Abel and choice 10; the Crew Camp; the Purser's last call

### 3.6 Command Tower
- [x] Rooms; the Observation Dome with the world in view; choice 4b on the lie path
- [x] The Gardener and choice 11
- [x] Steward Marrant (three phases, checkpoint), the boots, and choice 12
- [x] The ending branch: Overgrown (playable as Solder or Gasket), Dominion (choice 13), the scuttle, Crash (sled escape, pod launch)

### 3.7 The Dreaming Deck
- [x] The lift and its four requirements; memory halls with a checkpoint
- [x] The Navigator (the course line), the song, and choice 14; Homecoming

### 3.8 Finish Phase 3
- [x] All five endings verified in full playthroughs from a new game (automated: `tests/playthrough.js`, in CI), recorded in DECISIONS.md
- [x] Cody plays an ending by hand (the human half of the Phase 3 gate): about 58 minutes to an ending, with notes (3.9)
- [x] The game clocks a run: play time in the pause menu, and the THIS RUN card of splits after every ending
- [ ] Main path timed against the budget by a first-time player (a photo of the THIS RUN card); tune where it drags or runs short. Cody's play came in at about a fifth of the budget, which is more than tuning can close (3.9)
- [x] README and DECISIONS brought up to date

### 3.9 After Cody's first full play
- [x] A fall in the flood comes back to the Valve Hall with Solder (the clock used to stick at 0:00 with the water still rising)
- [x] The Silt Mother is fought in her tank: shutters over the sluice gates once the fight starts, gantries over the water that fall when she drains it
- [x] A grapple button (C or I, LT), whatever weapon is in hand
- [x] The ending named before its epilogue; after the credits, a results card (who reached the new world, out of how many), what closed the other way, and THIS RUN, each waiting for a press
- [x] The run for the sleds shows where to go (Gasket, the lead, a bar under the clock, a stencil in the Cryo Bay from the start)
- [x] Scenes waiting on a visit home don't play during the run for the sleds
- [x] Cody decides on the story audit and plan (Oct 30; see 3.10)

### 3.10 Cody's calls on the story audit
Cody's answers (Oct 30): Mara is the hero's sister, revealed slowly through dreams; upgrades are option B (spare shards bank as scrap); the main path stays at 4–6 hours plus side content, and a first-time player's photo doesn't block the build; deaths and choices can lock a main path so the hero goes round a harder way, and can close side content; the epilogue gets pictures now. Difficulty modes, and making upgrades matter more in them, come later. `HANDOFF.md` says where the work stands between sessions.
- [x] A picture layer behind cards and dream scenes (pixel art drawn in code: `js/pictures.js`; a card takes `pic`, a scene can `yield { dream }`)
- [x] Mara: the opening voice, the turn to 0418 and the refused thaw, Shim's "NOT A GHOST.", four dreams on the story's four nights, the list items while awake, the lines from Wick, the Tallyman and Gasket, the LATE line, the reveal in the First Night hall and in every epilogue (`js/story/mara.js`; the browser check plays each dream)
- [x] Pictures behind the epilogue cards, all five endings (and each ending's Mara card says "sister")
- [x] Spare shards bank as scrap; Solder's bench turns scrap into suit upgrades (`js/story/bench.js`: Plating, Magnet, Steady Hands; benches in the Warrens and, with Solder alive, the Crew Camp)
- [x] Routes that close: the design (below, "Routes that close")
- [x] Routes that close, lock 1: Solder left under the beam floods the keel, and the way to the Spine is the Overflow Pipes (the station's `Z` shutter and `e` hatch; `overflow-pipes`; the Spine Foot's `e`)
- [ ] Routes that close, lock 2: the gate fell, and the Warrens' hall is rubble; the way through is the deep walls
- [ ] Routes that close, lock 3: side content each choice shuts (the greenhouse wing and Sorrel; Flux's morning with Shim), with a journal line for each
- [ ] The rest of the audit's story fixes: Shim on every path (4), the villains set up early (6), the small payoffs (7)
- [ ] Length: the tram home after the Ballast (5), Wick's longer escort (8), new rooms on the main path (the Ballast and the Labyrinth first), Sorrel (9) and the other side quests

### Routes that close (3.10 design)

Cody's call: when someone dies, doesn't make it, or the hero makes a certain choice, a main way can shut, and the hero goes round a harder way (pipes, tunnels). Choices can also close side content. Each closure gets a journal line, in the style of the Homecoming requirements, so the player knows it was their doing. Build them in this order.

1. **Solder left under the beam (choice 9) floods the keel.** Nobody holds the culvert, so its water comes through the Jammed Hatch after the hero. In the Keel Tram Station the lower trench fills, and the shutter on its east exit to the Spine Foot jams shut under the water. The way to the Spine is the old **Overflow Pipes**: two new rooms on the grid beside the station (a long crawl above the flooded keel, with steam leaks, eels in the sumps and grapple rings; then a riser that comes up through a floor hatch in the Spine Foot). It takes about five minutes and has no rest pod. With Solder alive the station stays dry. She warns the hero off the pipes, which then open as an optional side path with a Suit Cell at the far end. Journal: "THE KEEL FLOODED BEHIND ME. WITHOUT SOLDER, NOBODY HELD THE CULVERT."
2. **The gate fell (the pistol upgraded, choice 5) leaves the Warrens' hall in rubble.** After the raid, the floor between the village pod and the sump hatch is caved in. The way to the hatch (the Labyrinth, the bench, the run for the sleds) is a crawl through the **deep walls**, where the village hid: tight vents and Bloomsworn nests, one new room. On the Crash run, against the clock, it makes the run longer. Journal: "THE GATE FELL. THE HALL CAME DOWN WITH IT. WE LIVE IN THE WALLS AGAIN."
3. **Side content each choice shuts.** The Pruner salvaged (choice 2): the greenhouse wing it guarded stays sealed, and Sorrel's trail starts there, so her side quest never opens. Flux's pack taken (choice 6): he never comes home, so there's no morning with Shim. Each one gets a journal line when it shuts.

How to build lock 1:
- Put the two pipe rooms on the grid in free space next to the station (440, 207) and the Spine Foot (480, 185). Rooms join only at their sides, so use a floor hatch or ladder where the shapes don't line up, as the Spine does.
- Make the station's east shutter a door whose `open` is `s.people.solder !== 'dead'`. Fill the trench with water (`~`) on entry when she's dead, the way the flood fills rooms.
- Add the rooms to `rooms-check.js`'s expectations as usual, and give the Crash route in `playthrough-routes.js` a step through the pipes, since that route leaves Solder.

---

## Open questions for Cody

1. **Rating, and harm to children.** The plan never shows a child's death or a child being dosed. But:
   - Shim is carried off and caged (built).
   - Children are implied among the taken ("SMALL. HEALTHY.").
   - On the lie path Shim climbs alone through the vents.
   - The brief's own side-quest example is a child who has eaten Bloom.
   - Wick, a parent, dies on screen (no gore).
   Is all of that within the rating you want?
2. **Names:** Steward Ivo Marrant, Hester Vale the Gardener, the Purser, the Pruner, the Tallyman, the Silt Mother, Abel, Flux, Mara, Usher, and "the Dreaming Deck" for the brief's "Navigator's Core". Change any you like.
