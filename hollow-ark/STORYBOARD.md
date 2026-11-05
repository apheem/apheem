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
| `js/story/*.js` | Each later area's story: `gardens.js`, `warrens.js` (the return), `cargo.js` (the Labyrinth, Flux's homecoming, and travel between pods), `ballast.js` (Solder, the flood, choice 9, the tram, and the raid at home; Solder's limping walk and the rising water live here too), `spine.js` (the crew and the lift they build, `crewOf`, Abel and choice 10, the camp's night, the verdict), `tower.js` (the Tower Lift ride, the Dome and choice 4b, the Gardener and choice 11, the Steward and choice 12, the ending branch: Overgrown, choice 13, the Key breaking, Lift B), `scuttle.js` (the run for the sleds: the clock, the falling ceilings, the pod launch, Mara's clamps, the sleds), `deck.js` (Lift B down, the seal, the memory halls and their checkpoints, the wake log, the Navigator's fight, the song and the turn, choice 14), and the threads that cross areas: `mara.js`, `bench.js`, `tram.js`, `gasket.js` and `sorrel.js` (her trail, her choice, her homecoming, her epilogue cards), add their scenes, lines and logs to the tables in `story.js` and push their own `{ enterRoom, update, music, talk }` hooks onto `HA.story.areas` (and anything they draw over the screen, like a clock, onto `HA.story.overlays`) (`talk` can hand a conversation to a scene). `story.js` also holds `callName` (LATE, SLEEPER or COUNTER). A person met away from the Warrens says so with `away: true` in `PEOPLE` |
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
| Engine Spine | 480 – 520 | −64 – 230 (one shaft of six rooms, joined by ladders and hatches) | built (3.5); the Stokers' Bunks (3.14) sit beside the Piston Run, at 520 – 600, 5 – 28 |
| Command Tower | 520 – 640 | −156 – −64 (five rooms above the Tower Lift) | built (3.6); the Steward's Rooms (3.14) beside the Bridge Stair, at 560 – 640, −133 – −110 |
| The Dreaming Deck (hidden) | 520 – 640 | 46 – 138 | built (3.7): six rooms under the Helm, reached only by Lift B |

These are starting reservations, not exact room positions. Keep areas inside their boxes so the map reads as one ship. The Gardens' east bulkhead into the Spine is choked with Bloom and can't be opened, so the Spine is reached only from its foot.

**Route:** Lockup → Gardens → Warrens → Cargo Labyrinth → Ballast → (the keel tram home to the Warrens, and back east with the climbers; 3.10) → Engine Spine → Command Tower → the Dreaming Deck (true path only).

**The keel tram** is the old crew's cable car from the Warrens' sump, along the keel under the Ballast, to the Spine Foot. Its motor is dead. Solder goes to the Ballast to fetch a working one, and once the hero starts it, the hero rides it home, and the Hullfolk ride it with the hero to the Spine (3.10, "The tram home"). The tram is how the people get to the climb, and the hero's journey is what gets it running.

### Factions and cast

**The Hullfolk** live in the walls. They are descendants of the maintenance crew. They call the hero "Sleeper" until they decide otherwise (see the Mercy track).

- **Old Gasket** is the elder: gruff, careful, and hard to move. He is Wick's father and Shim's grandfather. His brother was shot for his boots by the last sleeper to wake. His arc goes from "WE SEAL THE GATE AND HOLD OUR BREATH" to leading the climb.
- **Wick** is the healer: warm, curious and brave. She is Shim's mother, and she dies in the Gardens (beat 3).
- **Solder** is the tinkerer, in goggles and an apron. He levels weapons, makes trades and invents things (the Foam Sprayer is his). He is dry and funny, and he's the lost companion (beat 4). He speaks through chalk notes in the Cargo Labyrinth before the player finds him.
- **Shim** is a child, curious and stubborn. He was taken in the raid and rescued at the end of the slice. He wants to stand "ON THE GROUND. NOT A FLOOR."
- **Flux** is Shim's father, who "went up the shafts" years ago (built line) and was collected and dosed into a Bloomsworn. He is the deserter in the Cargo Labyrinth (choice 6).
- **Tamp** holds the Warrens' gate while the others climb.
- **Brine** is a villager. Her sister **Sorrel** was taken before the game began, and her cradle in the Gardens is empty. Where she went is a side quest (3.13, "Sorrel" below).

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
- **A person.** Mara is still asleep in pod 0418, hanging in the rack beside the hero's empty clamps in the Cryo Bay. She is the hero's younger sister, but the game never says so: the player works it out from dreams that come back a little clearer each night, and from the memory at the end (Cody's calls, Oct 30 and 31; see **Mara, and the dreams** below). The hero's journal starts with only: "MARA IS STILL ASLEEP IN 0418. I PROMISED I'D BE THERE WHEN SHE WOKE." Every ending says what happens to her.
- **A voice.** The first-person journal ("I WOKE IN POD 0417...") is the hero's inner monologue, one or two lines per area. It shifts with the tracks. At Bloom 5: "THE GARDENS SMELLED LIKE HOME." At low Mercy the entries get shorter and start counting things.
- **A name the Hullfolk give or withhold.** See the Mercy track.

The arc runs from a sleeper who arrived 232 years too late to someone who decides whether to stay.

### Mara, and the dreams (3.10)

Cody's call (Oct 30): Mara is the hero's sister, revealed slowly. The hero dreams about her on each night they sleep, and each dream is a little clearer and a little longer. The hero stays a mystery. Cody's call (Oct 31): "sister" is never said, not even at the end. The build-up makes it plain, and leaving the word unsaid is the nicer touch.

**The truth (what the player pieces together).** Mara is the hero's younger sister, about ten when they boarded. Their mother won two places on the Ark and stayed behind. She told the hero to keep hold of Mara's hand the whole way. In the cryo bay Mara was scared, so she went under first while the hero watched. She made the hero promise to be there when she woke, the first thing she'd see, and not late. She kept a list of things to do on the new world:

1. See a real sky.
2. Eat something that grew in dirt.
3. Sleep outside. All three of us.
4. Learn to swim.
5. (Added for the hero, in the cryo bay.) Don't be late.

**Rules.**
- "Sister" is never said (Cody, Oct 31). The end gives the memory and her name: the Dreaming Deck's First Night hall (true path) and the epilogue (every ending).
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
| Gasket | Crew Camp | His brother. "YOU'VE GOT THE LOOK HE HAD. LIKE SOMEBODY'S WAITING ON YOU." |
| Dream 4 | The Crew Camp night | Boarding day, clear: the bright new cryo bay, two open pods. "YOU GO FIRST." "NO. YOU FIRST. I'LL WATCH THE WHOLE TIME." Item 5. "PROMISE?" "PROMISE." |
| The Dome | Command Tower | The window: "NOT A REAL SKY. NOT YET." (item 1) |
| The reveal | First Night hall (true path) | The Navigator remembers 0417 holding the glass until the frost came. The hero: "MARA." |
| The reveal | Every epilogue | Mara's card follows what happened to her, without saying what she is to the hero. Homecoming: "MARA WOKE UNDER A REAL SKY." "I WASN'T LATE." Then "THAT NIGHT WE SLEPT OUTSIDE." "MARA AND ME." |

**As built (3.10).** The dreams are in `js/story/mara.js` (`HA.story.dream(world, n)`), drawn by `js/pictures.js` (`pods`, `list`, `tickets`, `boarding`) at clarity 0.2, 0.45, 0.7 and 0.95. Each dream leaves a line in the journal and sets `flags.dream1` to `dream4`. The list items while awake are thoughts over the hero's head that don't stop play (`HA.story.think`), apart from the Dome, which is in its scene. Additions to the table:
- Shim, the morning after the second dream: "YOU TALK IN YOUR SLEEP. YOU SAID 'MAR'." "WHO'S MAR?" The hero doesn't answer.
- Wick's question is part of her talk at the cradles (optional).
- Gasket, at lights-out before the fourth dream: "MY BROTHER HAD A LOOK LIKE YOURS. LIKE SOMEBODY WAS WAITING ON HIM." "GO TO SLEEP. WHOEVER IT IS, THEY CAN WAIT ONE MORE NIGHT."
- The First Night hall: "ONE SLEEPER WOULD NOT LIE DOWN UNTIL THE ONE IN 0418 WAS UNDER." "YOU HELD THE GLASS UNTIL THE FROST CAME. THE CREW HAD TO LIFT YOU INTO 0417." "I REMEMBER NOW. ALL OF IT." "I HAVE COUNTED HER EVERY NIGHT SINCE. FOR YOU." "MARA. MY LITTLE SISTER."
- The run for the sleds, at her clamps: "HOLD ON, MAR. I WON'T BE LATE." (pods launched) or "I'M SORRY, MAR." (not).
- The epilogue's lines for each ending are in `js/endings.js`; the Overgrown one is what's left of the hero, in pink: "I'M RIGHT HERE, LITTLE ONE." "I'M NOT LATE."

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

**Gasket's grief.** He doesn't cry where anyone can see. He makes the broth, which was Wick's job. Later he says to the hero: "SHE WAS ALWAYS GOING TO GO. I JUST THOUGHT I'D GO FIRST."

**Choice 4, what to tell Shim:**
- **Tell him everything:** "SHE WASN'T SCARED. ...SHE WAS, A LITTLE." Mercy +1. Gain: Shim knows. Lose: his hope. Later, at the camp, he says: "I'M SCARED. A LITTLE. SHE SAID THAT'S ALLOWED."
- **Tell him she wasn't scared:** Mercy +1. Gain: Shim knows. Lose: his hope. Later: "SHE WASN'T SCARED. YOU SAID."
- **Lie, with the lantern:** "SHE SENT HER LANTERN HOME SO YOU'D KNOW SHE'S SAFE. SHE'S HIDING." Mercy −1. Gain: Shim keeps hoping. Lose: the truth. Gasket knows it's a lie and goes cold toward the hero. On this path Shim follows the climb later, through the vents, to find her (see beat 6).

**The Steward's broadcast.** The Warrens' old speakers crackle: "TO THE PEOPLE IN THE WALLS. SEND ME THE SLEEPER, AND NO ONE ELSE WILL BE COUNTED." Nobody moves. Gasket: "WE DON'T HAND OVER LOST THINGS." (an echo of Shim's slice line). The Hullfolk decide the Bloomsworn will come either way, and that whoever holds the Key decides what happens to them. "IF THE KEY CHANGES HANDS, WE WANT TO BE IN THE ROOM."

**The plan.** Solder knows the old keel tram runs from the Warrens' sump to the foot of the Engine Spine, where the crew's lifts climb to the Tower. Its motor is dead. There's a working one in the Ballast pump rooms, and he leaves in the night to fetch it through the Cargo Labyrinth. Before he goes he builds the new gate he promised in the slice ("ONE THAT OPENS FROM OUR SIDE") and opens the floor hatch to the Labyrinth. New lead: **FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH.** Only the able will climb. The young and the old stay behind the gate with Tamp.

**Choice 5, the Rivet Pistol** (Solder offers both before he leaves):
- **Give it to the gate:** Mercy +1. Gain: the Warrens can hold their gate. Lose: the Rivet Pistol, for good.
- **Upgrade it:** Gain: the Rivet Repeater. Lose: the Warrens' defence.
- The cost shows before the ending. While the hero is in the Ballast, the Bloomsworn raid the Warrens. With the pistol, the gate holds, and Tamp says, "IT HELD. YOUR LITTLE GUN HELD." Without it, the gate falls, the young and old hide deep in the walls, and Tamp is hurt. The hub changes to match, and every ending's Warrens card follows from it.

**Flags:** `toldShim` (`'truth'` / `'notScared'` / `'lie'`), `pistolGiven`, `repeater`, `climbPlanned`, `broadcastHeard`.

**As built (3.2).** The Garden Lift runs to a new stop in the Warrens hub (east of the fire) and back; the Lockup's way home opens once Wick's fate is known. The return plays as an arrival near the fire (the woken, then Gasket sees the lantern), then three conversations: Shim by his door (choice 4), Gasket at the pot (his grief, the broadcast, after which he names the Steward, and the plan), and Solder at his bench (choice 5). Resting at the village pod plays the night he leaves: he builds the gate, opens the floor hatch by his bench and goes, while Shim watches. The sump (80, 69, two screens wide) holds the dead keel tram and log `tram` ("KEEL TRAM · YEAR 118: ... THE MOTOR IS NEEDED AT BALLAST PUMP 3"); its west side is the way into the Labyrinth, marked with Solder's first chalk. The woken are people in the hub from now on, `takenHome` of them, one line each. On the half-truth Shim won't take the lantern, and it hangs by the fire (`flags.lanternWith` is `'shim'` or `'fire'`). Choice 5 without a pistol isn't asked: Solder arms the gate with his own. Extra flags: `homeAgain`, `lanternWith`, `pistolDone`, `newGate`, `hatch`, `solderLeft`, `namedLate`, `namedCounter`.

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
1. **Solder's chalk.** His arrows and notes mark the way he went: "LEFT. NO, YOUR OTHER LEFT." "DON'T TOUCH THE YELLOW ONES." "IF YOU'RE READING THIS, YOU'RE SLOW." This gives him a voice before his life is on the line. The notes stop at the Sorting Floor.
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
1. **Found.** Solder is in the Pump Gallery with the tram motor and a bad leg: "TOOK YOU LONG ENOUGH. HELP ME CARRY THIS." He gives the hero the Foam Sprayer: "MADE IT FOR THE BATH. DON'T ASK."
2. **The walk.** A walk-and-talk through the Tank Farm with Solder limping behind. He talks about the keel tram, the old crew lift under the Helm ("THE OLD CREW HAD A LIFT THAT WENT DOWN FROM THE BRIDGE. NOBODY'S RIDDEN IT IN TWO HUNDRED YEARS. I COULD MEND IT, IF I LIVED THAT LONG." — a Homecoming hint), and Wick. He waits in the Pump Gallery while the hero fights the Silt Mother.
3. **The flood.** In the Valve Hall the valves open by themselves. The water rises: a timed escape through the Long Culvert with Solder following. He keeps up as long as the hero doesn't leave him more than a screen behind; if he falls back, the hero hears him call.
4. **The Jammed Hatch.** A beam falls and pins Solder as the water climbs. Choice 9 (the timer pauses).
5. **The tram.** At the station the hero fits the motor, carrying it alone if Solder died, and starts the tram. It shudders off toward the Warrens to fetch the climbers.

**Boss: the Silt Mother** is a vast, Bloom-swollen eel in a half-flooded tank, fought from foam platforms. It surfaces to bite, with its shadow and bubbles warning first. It spits Bloom jellies and lashes its tail across the water line. In phase 2 it drains the tank, and the fight moves to the floor with the boots on.

**Choice 9, Solder's fate:**
- **Blow the beam:** use the Breach Charge launcher and Solder's own spare charge. This works even with no charges left. Solder lives. Lose: the Breach Charge launcher and every charge, for good.
- **Eat the Bloom growing on the hatch** for the strength to lift the beam: Solder lives. Bloom +2. If this would take Bloom to 8, the screen says: "THIS WILL BE THE LAST OF YOU."
- **Leave him:** Solder dies, saying "GO. SOMEONE HAS TO START THE TRAM." The hero keeps everything. Mercy −2.

**Music:** no music in the water rooms, only muffled engine thrum. A sparse, low-passed version of the theme plays in the dry rooms. The flood brings only alarms and water.

**Flags:** `ballast`, `boots`, `foam`, `solder` (`'alive'` / `'dead'`), `solderBy` (`'charges'` / `'bloom'` / `null`), `warrensRaid` (`'held'` / `'fell'`), `tram`.

**As built (3.4).** Ten rooms: the Drain Shaft (0, 161; room id `ballast-intake`, under the Drain's grate), the Pump Gallery (40, 184), the Tank Farm (80, 161, three bands tall), Odell's Workshop (160, 184), the Silt Tank (160, 207), the Settling Pools (240, 184), the Valve Hall (280, 184), the Long Culvert (320, 207), the Jammed Hatch (400, 207) and the Keel Tram Station (440, 207), whose keel tunnel east is `unbuilt` until 3.5. Rest pods: the Pump Gallery, the Workshop and the station. The hero already has a thruster and the harpoon here, so foam's gates are **Bloom silt** (`s`), a new hazard: it burns, and throws the hero back to firm ground; channels of it under low roofs guard the boots, a Tank Farm suit cell and a Settling Pools bulb. Deep water (the Drain Shaft's sump and the Tank Farm's tanks) is marked with PRESSURE stripes; the way down to the Silt Tank is through the bottom of the Tank Farm's east tank, in the boots. Solder walks with the hero along the Tank Farm's walkway (three pairs of barks), turns back at the Workshop, and comes down to the Silt Tank by himself once the Silt Mother falls; from there he follows through the escort rooms (`solderWith`). The raid is settled when the Silt Mother falls (`warrensRaid` from `pistolGiven`). The flood is a 45-second rise from under the Valve Hall's floor to the top of the Jammed Hatch; if it closes over Solder, both are back in the Valve Hall. The beam falls as Solder gets the hatch open. The tram leaves for the Warrens with Solder on it (or empty), and the valves log is on the station's terminal. Extra flags: `solderFound`, `solderWalk`, `toolbagBack`, `siltSeen`, `siltDown`, `solderWith`, `floodSeen`, `flooding`, `flooded`, `hatchOpen`, `raidSeen`, `solderMourned`; the boots are `abilities.boots`, Solder's fate is `people.solder`.

### Beat 5: the climb. Engine Spine (3.5)

**Role:** an industrial vertical climb, and the clearest picture of the Mercy track. The survivors build their way up behind the hero, and how many come depends on what kind of person the hero has been.

**What the Spine is:** the ship's power spine, not its drive. The reactor runs up the middle, and its heat and power keep the habitat alive. The drive engines at the stern have been dead for 274 years.

**Palette:** reactor white-orange, steel grey, white steam.

**How it works:** the Spine is a few very tall rooms (90 tiles each). The hero climbs ahead through steam vents, pistons and heat. At each landing they reach, Hullfolk arrive on the tram and build a lift behind them, which becomes a short-cut and a safe point. The crew grows with Mercy, and the map shows each lift built. If Solder lives he leads the building; if not, Gasket does, badly, and says so. Flux is in the crew if he came home.

**Rooms (6):**
- the Spine Foot (the tram arrives here)
- the Boiler Stair
- the Piston Run
- the Reactor Throat (boss)
- the Crew Camp
- the Tower Lift

**Enemies:** Bloomsworn climbers, steam drones, and heat slugs.

**Scenes:**
1. **The camp.** Before the Tower, the Hullfolk stop and rest. The hero can talk to everyone; this is the quiet before the end. The hero can use Wick's Lancets to stitch a hurt climber (if they still carry them). Gasket counts the children of the climbers' families at lights-out, the scrawl from the slice. On the lie path he comes up one short. Shim has gone into the vents to find his mother: "WHERE WOULD HE GO, SLEEPER? WHERE WOULD HE GO?" His last line here closes his arc: "I SPENT MY WHOLE LIFE HOLDING MY BREATH. I'D LIKE TO BREATHE OUT BEFORE THE END."
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
| 9. Solder: leave him | −2 |
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

The journal's lines are shown after a Crash, Dominion or Overgrown ending, on the card of what closed the other way. A hero on those paths never saw the lift or the seal, so each line says what was there and why it stayed shut (3.11, after Cody found "the seal read the Bloom" made no sense).

| Requirement | Why, in the story | What the journal says if it's missing |
| --- | --- | --- |
| All three Wardens released | The freed Wardens open the sealed lift and hold the doors against the scuttle | "THE OLD CREW LIFT UNDER THE HELM GOES DOWN TO A SEALED DECK. ONLY FREED WARDENS OPEN IT." |
| Solder alive | Only he can mend the old crew lift under the Helm | "THE OLD CREW LIFT UNDER THE HELM WAS BROKEN. ONLY SOLDER COULD HAVE MENDED IT." |
| A crew of eight (Mercy 7 or more at the Crew Camp) | The lift's brake takes many hands to release ("I CAN MEND IT. I CAN'T LIFT IT ALONE.") | "THE OLD LIFT'S BRAKE NEEDS EIGHT PAIRS OF HANDS. TOO FEW CLIMBED WITH ME." |
| Bloom 2 or less | The navigation deck is sealed against Bloom carriers | "THE DECK UNDER THE HELM LETS ONLY THE CLEAN IN. THE BLOOM WAS TOO DEEP IN ME." |

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
  - Solder's pistol tutorial line is in his own voice, with the XP rule moved to a hint.
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
- [x] Add `ballast-intake` under the Drain (the Drain's grate is already a hatch to it), and take Solder's toolbag back to him
- [x] Water physics, Pressure Boots, Foam Sprayer (all in the checker)
- [x] Rooms, the Silt Mother, log `valves`
- [x] Finding Solder, the walk, the flood escape, choice 9, the tram
- [x] The Warrens raid while the hero is away (the gate holds or falls)

### 3.5 Engine Spine
- [x] The keel tunnel east from the Ballast's tram station (its `unbuilt` note) to the Spine Foot, where the tram brings the climbers (Solder with them if he lived)
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
- [x] Pictures behind the epilogue cards, all five endings (each ending's Mara card said "sister" until 3.11, which takes the word out)
- [x] Spare shards bank as scrap; Solder's bench turns scrap into suit upgrades (`js/story/bench.js`: Plating, Magnet, Steady Hands; benches in the Warrens and, with Solder alive, the Crew Camp)
- [x] Routes that close: the design (below, "Routes that close")
- [x] Routes that close, lock 1: Solder left under the beam floods the keel, and the way to the Spine is the Overflow Pipes (the station's `Z` shutter and `e` hatch; `overflow-pipes`; the Spine Foot's `e`)
- [x] Routes that close, lock 2: the gate fell, and the west end of the Warrens' hall is rubble; the way round is the deep walls (the `R` cave-in in the Warrens and the Way Down, the Warrens' `g` hole, the Way Down's `Z` door; `deep-walls`)
- [x] Routes that close, lock 3a: Flux's morning with Shim, after a rest at home with Flux back (`fluxMorning` in `story/cargo.js`; 30 scrap from his stripped pack). Taking his pack (choice 6) shuts it, and `fluxNamed` says so in the journal
- [x] Routes that close, lock 3b: the Pruner finished (choice 2) leaves the Old Greenhouse welded shut with Sorrel inside, so her trail never starts; the hero hears her counting, and the journal says why (built with Sorrel's quest, below, "Sorrel")
- [x] The rest of the audit's story fixes: Shim on every path (4: on the camp's line phone on the truth path, and the morning with his father, lock 3a), the villains set up early (6: "THIS IS IVO MARRANT, STEWARD OF THE ARK" in his broadcast; Hester Vale names herself and makes the Bloom's case in the Vat House; Abel at the end of the Steward's lists, and the hero knows the name in his furnace if they read them), the small payoffs (7: Gasket's brother is Cleat, named at lights-out and in the Homecoming epilogue; the Homecoming epilogue opens the seed vault, gives Dunn's girl her star if Dunn climbed, and returns Odell's boots, with three new pictures: `seeds`, `star`, `odell`)
- [x] Length: the tram home after the Ballast (5; design and as built below, "The tram home")
- [x] Length: Wick's longer escort (8; design and as built below, "Wick's longer escort")
- [ ] Length: new rooms on the main path (the Ballast and the Labyrinth first). First batch built: the Watch Gallery and Odell's Test Tank; second batch built: the Muster and the Pump Heads; third batch built: the Stokers' Bunks and the Steward's Rooms (below, "New rooms on the main path")
- [x] Length: Sorrel (9, with lock 3b; design and as built below, "Sorrel")
- [ ] Length: the other side quests (design below, "The other side quests"). Hasp's boy built (0.3.17), Wick's remedy (0.3.18), Pod 1130 (0.3.19); next, the new stoker and the last watchman

### 3.11 Cody's notes from playing 0.3.10
Cody's notes (Oct 31) are listed in full in `HANDOFF.md`. They come before the rest of 3.10's length work. Bugs first, then what's unclear, then the bigger builds. Each bigger build gets its design written here before it's built.
- [x] Bugs: the confirm screen's text wraps inside its box (choice 9's lose line ran off it); Solder walks along the floor at the tram station, not in a straight line through the air; the tram waits for him to finish, and he's seen getting in; the wall during the flood countdown is too tall to jump; the run for the sleds keeps its music in the Warrens. As built: `confirmLayout` in `scenes.js` wraps each line to the box and grows it; `keepToFloor` in `story.js` keeps anyone walking (in a scene's `walk`, or going home or following) on the floor, stepping up one or two tiles and dropping off ledges, and still hopping a gap with floor just past it; in `rideWest` (`story/tram.js`) Solder walks to the car and gets in, shown in its front window (`world.tramRiders`), then the hero, then it goes; the Jammed Hatch's `X` now fills its passage from floor to ceiling (the passage was six tiles high, the hatch four); `HA.story.music` plays the run's track first while `flags.running`, before any area's own choice.
- [x] Who is talking: a marker over whoever speaks, and the voices from the walls shown at their doorway. As built: `drawSay` in `scenes.js` finds the speaker by name among the room's people (or the hero, for their own lines, in blue) and draws a bobbing marker over them; someone still hidden in their home gets it at their doorway, and their tag reads "NAME, IN THE WALLS"
- [x] Mara: "sister" is never said; the build-up says it (this replaces the Oct 30 call, "sister" only at the end). As built: the First Night hall's last line is "MARA."; every epilogue's Mara card keeps what happened to her and drops the word (the browser check fails if any ending says it)
- [x] The seal at the foot of Lift B: say why it reads the Bloom, where it happens. As built: at the seal the hero says what it's reading for; the four lines on the card of what closed the other way say what's under the Helm (the old crew lift, the sealed deck) and why it stayed shut, since a hero on those paths never saw them ("Homecoming's requirements" below)
- [x] The Gardener poisoned Wick: made plain before choice 11. As built: in the Vat House she says she gave Wick a full dose, straight from the vat, and the hero sees Wick's hands going pink; Wick's journal line names her; in the Tower Garden Gallery the hero remembers it on arrival and sees the doses on her bench before choice 11, whose dose option now gains "SHE GOES THE WAY SHE SENT WICK"
- [x] Why the villagers climb the Spine, and why they go back down to the Cryo Bay on the run: made plain where it happens. As built: in the plan (`story/warrens.js`), Gasket says the Helm key steers the Ark, with a world close enough to land on, and Solder says they'll take the Helm and take the ship down; the journal says so. At the start of the run (`story/scuttle.js`), Gasket says the ship is tearing itself apart and nobody can take it down now, the only way off is the old crew's landing sleds in Cryo Bay 4, and they climbed to take the ship down and now go back down to get there themselves
- [x] Gasket's trust, a thread of its own (below, "Gasket's trust", as built)
- [x] After his talk at the Crew Camp, times when the hero could lose Gasket. Cody (Nov 4): two places. As built: the Barracks and the Helm (below, "Losing him")
- [x] The way to the Bailiff built up: the Counting House (below, "The Counting House")
- [x] The way into the Gardens built up: the taken found deeper, in the Nursery at the top of the Gardens (Cody, Nov 4: "the taken are found too soon"). As built: below, "The way into the Gardens"
- [x] The run for the sleds: the ship mangled as it falls apart, ways that change, and a clock that bites (launching the pods should cost something real). As built: below, "The run for the sleds, coming apart"

### Routes that close (3.10 design)

Cody's call: when someone dies, doesn't make it, or the hero makes a certain choice, a main way can shut, and the hero goes round a harder way (pipes, tunnels). Choices can also close side content. Each closure gets a journal line, in the style of the Homecoming requirements, so the player knows it was their doing. Build them in this order.

1. **Solder left under the beam (choice 9) floods the keel.** Nobody holds the culvert, so its water comes through the Jammed Hatch after the hero. In the Keel Tram Station the lower trench fills, and the shutter on its east exit to the Spine Foot jams shut under the water. The way to the Spine is the old **Overflow Pipes**: two new rooms on the grid beside the station (a long crawl above the flooded keel, with steam leaks, eels in the sumps and grapple rings; then a riser that comes up through a floor hatch in the Spine Foot). It takes about five minutes and has no rest pod. With Solder alive the station stays dry. He warns the hero off the pipes, which then open as an optional side path with a Suit Cell at the far end. Journal: "THE KEEL FLOODED BEHIND ME. WITHOUT SOLDER, NOBODY HELD THE CULVERT."
2. **The gate fell (the pistol upgraded, choice 5) leaves the Warrens' hall in rubble.** After the raid, the west end of the hall is caved in, over the way out to the Way Down. The way round is a crawl through the **deep walls**, where the village hid: tight vents and Bloomsworn nests, one new room. On the Crash run, against the clock, it makes the run longer. Journal: "THE GATE FELL. THE HALL CAME DOWN WITH IT. WE LIVE IN THE WALLS AGAIN."

   **As built (lock 2).** The cave-in is a door (`R`, `caveIn`, drawn as rubble) that is open unless `warrensRaid` is `'fell'`. It sits on both sides of the way between the Warrens (its west end, heaped up the wall) and the Way Down (its bottom right corner), so the hall keeps the village, the bench, the floor hatch and the pod, and only the way west is shut. (The design first put it between the pod and the sump hatch. Building it, the west end was better: Solder's bench and the pod stay with the village, and the run for the sleds, which goes west, is the route it lengthens.) The deep walls (`deep-walls`, 80x23 at −80, 46, west of the Way Down) are entered by a hole in the Warrens' floor by the homes (`g`, open only if the gate fell). Inside: a vent two tiles high going west, with rats; a shaft down with ledges to climb back; then east along the bottom through two Bloomsworn nests (spore pods, thorns, a stack of crates) to an opening onto the Way Down's west wall, where the Hullfolk's plank door (`Z`, `deepDoor`) stands open. With the gate held, the hole and the door stay shut and the hall is whole. Gasket says it in the raid's aftermath, the hero thinks it on walking up to the rubble, and the journal gets one line either way (`flags.caveIn`): "THE GATE FELL, AND THE HALL CAME DOWN WITH IT. THE WAY WEST TO THE WAY DOWN IS UNDER THE RUBBLE, AND THE WAY ROUND IS THROUGH THE DEEP WALLS. WE LIVE IN THE WALLS AGAIN." On the run for the sleds, Gasket adds a line, the bar under the clock reads "← THEN DOWN THE HOLE ↓" in the Warrens and "← DOWN, THEN →" in the deep walls, and the clock stays at 4:30 (by distance, the deep walls add about 15 seconds of running, plus their fights; no one has timed it by hand yet). The Cold Store's lift is still a way round, as before. The Crash playthrough finds the cave-in and goes round through the deep walls; the browser check looks at both sides of the cave-in with the gate held and fallen.
3. **Side content each choice shuts.** The Pruner salvaged (choice 2): the greenhouse wing it guarded stays sealed, and Sorrel's trail starts there, so her side quest never opens. Flux's pack taken (choice 6): he never comes home, so there's no morning with Shim. Each one gets a journal line when it shuts.

   **As built (lock 3a).** With Flux home, the first rest at the Warrens' pod after his homecoming is a morning (`fluxMorning`, from the Warrens' `onRest`): Shim shows the hero his father ("THIS IS MY DAD. HE CAN FLY." "WE MET."), and Flux gives the pieces of his spent pack for Solder's bench, 30 scrap, one Plating. If Shim is hidden or gone, Flux is there alone. With the pack taken, there's no morning; when Gasket reads the Steward's lists (`fluxNamed`), the journal line ends "THERE WON'T BE A MORNING AT HOME FOR SHIM AND HIS FATHER." The browser check rests at home with Flux home and with his pack taken. Lock 3b is built with Sorrel's quest (below, "Sorrel").

### The tram home (3.10 design, the audit's fix 5)

Until now the keel tram left the Ballast for the Warrens without the hero, who walked on east to the Spine. Whatever happened at home (the raid, Solder's news, Flux back with Shim, the morning after) played only if the player went back by pod, and most won't. Now the hero rides the tram home, and back east with the climbers. The main path becomes: Ballast → (the tram, west) → the Warrens → (the tram, east, with the climbers) → the Spine. It adds a few minutes on the way, and 5 to 8 more for the goodbye at Mara's pod, which is optional.

1. **West.** At the winch, once the motor is in, the hero gets in, with Solder if he lived ("GET IN. THEY'LL WANT TO SEE YOU WITH THEIR OWN EYES BEFORE THEY GET IN A BOX ON A STRING."). The ride is two cards over a new picture, `tram` (the car in the keel tunnel, lamps going by): "THE KEEL TRAM TOOK US WEST, UNDER THE BALLAST, UNDER THE LABYRINTH." Then "SOLDER SLEPT THE WHOLE WAY. HE SAYS HE DIDN'T.", or "I RODE IT ALONE, AND KEPT HIS SEAT." It stops at the sump. `flags.tramWest`.
2. **Home, live.** Up the ladder, the scenes that were waiting play in order: the raid (`raidSeen`); if the gate fell, the hero talks the young and the old out of the walls, Shim first (`wallsOut`: the eyes in the doorways come out one by one, and stay out); Solder's news, if he died ("THE TRAM CAME IN WITH JUST YOU ON IT. WHERE IS HE?"); Flux by the fire, or Gasket reading the lists. Flux's homecoming waits for the raid's news.
3. **The tram waits.** Once those are done, Gasket (or Solder) says the climbers are packing, and that "SHIM SAYS THERE'S ONE STILL UNDER GLASS UP WHERE YOU WOKE. GO AND SEE THEM BEFORE THE CLIMB, IF YOU WANT. THE TRAM WAITS." Also: "AND SLEEP FIRST, IF YOU NEED IT." (Flux's morning, lock 3a, plays on that rest.) `flags.tramWaits`. The lead: the climbers wait on the tram in the sump.
4. **Mara (optional).** At her pod, before the climb: "I'M GOING UP TO THE MAN WITH THE KEY. THEN I'M COMING BACK FOR YOU." and a journal line (`flags.maraBye`). With the gate fallen, the way there is through the deep walls.
5. **East.** In the sump, the climbers stand on the platform, and the tram (`t`, a lift-type link with its own scene, `tramEast`) takes them. Who leads says how many came, as the Boiler Landing used to: "MORE OF US THAN I THOUGHT." or "THERE AREN'T MANY OF US." Two cards: "THE KEEL TRAM TOOK US EAST, ALL THE WAY UNDER THE SHIP." and "THERE WEREN'T SEATS ENOUGH. NOBODY MINDED." (or "THERE WERE SEATS TO SPARE."). `flags.tramEast`.
   - **Solder alive:** the tram stops at the Spine Foot. The crew get off ("GO ON UP. A LIFT A LANDING: YOU CLIMB, WE BUILD BEHIND YOU."), and the tram waits there, as before.
   - **Solder dead (lock 1):** the water is over the line past the Ballast stop, so the tram stops there. Gasket: "WE CAN'T TAKE THE TRAM ANY FURTHER." The hero: "THE OVERFLOW PIPES. I'LL GO FIRST AND CLEAR THEM." The crew come through behind. The tram stays at the Ballast stop, and on the run for the sleds the crew go back through the pipes to it.
6. **The Spine.** At the Boiler Landing the crew build the first lift behind the hero as before, but they're already there: "BELOW ME, THE CREW HAD THE FIRST LIFT'S FRAME UP." (or "...CAME UP OUT OF THE PIPES, COUGHING."). The count is said in the sump instead.

**As built.** The ride and the scenes are in `js/story/tram.js` (`S.rideWest` from the winch in `story/ballast.js`; `tramWaits`; `tramEast`), the talking-out of the walls is `wallsOut` in `story/ballast.js` (inside `raidSeen`; `flags.wallsOut` keeps them out), the goodbye is in the `mara` scene in `story.js`, and the tram east is the sump's `t` (a lift-type link with `tram: true`, which draws nothing, and `label` for its prompt). Flux's homecoming in `story/cargo.js` waits for the raid's news and Solder's. A link can now be held shut by the story with `shut: (state) => note` (the pipes' ladder up into the Spine Foot); the station uses `holdBack`. The crew stand in the sump (not Solder, who waits by the car), at the Spine Foot (with him) or at the station until they reach the Boiler Landing, where `crewArrives` has their new lines. The tram's car is drawn at the Ballast stop again once the flooded keel stopped it there, and the run for the sleds goes "BACK THROUGH THE OVERFLOW PIPES, AND THE KEEL TRAM HOME FROM THE BALLAST STOP." The playthroughs go home after the winch and then to the Spine (Crash: the Ballast stop, then the pipes); the browser check rides west, finds the way east held, comes home, says goodbye at Mara's pod and rides east.

Gates: until the climbers are on the tram, the station's way east holds the hero back ("NOT WITHOUT THE CLIMBERS. THE TRAM WAITS IN THE SUMP."), and so does the pipes' ladder up into the Spine Foot; the tram east isn't there until the tram waits (3). A save from before this change with the tram already gone (`flags.tram` without `tramWest`) keeps the old way: the crew follow on the tram by themselves. The playthroughs go home after the winch and then to the Spine; the Crash route stops at the Ballast stop and goes through the pipes.

### Wick's longer escort (3.10 design, the audit's fix 8)

Wick walks with the hero only as far as the cradles, in the first room, so the player has a minute with her before the Gardens take her. Now she goes on up with the hero as far as the Irrigation Works, about five minutes more.

1. **At the cradles** she doesn't stay behind. "THE AIR IN THESE IS BAD. THE CRADLES BREATHE THROUGH THE WATER WORKS, UP TOP. THERE'S A VALVE." "I'LL SHOW YOU THE WAY UP, AND OPEN IT ON THE WAY. THEN I COME BACK AND SIT WITH THEM." (`flags.wickUp`.)
2. **The way up:** the Garden Lift's hall and the Terraces, with Wick behind the hero. A few barks that don't stop play: the Terraces were the bean terraces, Gasket picked there as a boy before the Gardener locked the Hullfolk out; "IF YOU FALL, FALL ON THE BEANS. THEY'VE HAD WORSE."; near the top, "NEARLY THERE. DON'T LOOK DOWN. I NEVER DO."
3. **Keeping up.** A companion left on another floor (the hero climbed, or swam) catches up out of sight: once the hero is on firm ground and she's off the screen, she comes in behind them along the same floor. (A general rule for anyone who follows the hero.)
4. **The sit-down.** On the Irrigation Works' east ledge, where the Terraces come out, there's a new rest pod. Wick sits the hero down on it: "HOLD STILL. WHO PATCHED YOU BEFORE?" The hero: "...SOMEONE SMALL. BADLY." (Mara, not named: the hero doesn't remember yet.) "THEN I'LL DO IT BADLY TOO, SO IT FEELS LIKE HOME." The hero's health is full. Then she opens the valve ("THERE. NOW THEY'LL BREATHE EASY."), tells the hero the way on ("THROUGH THE WATER, AND UP THE SPORE BEDS. MIND THE PODS; THEY SPIT."), and goes back down. Journal: "WICK WALKED ME UP AS FAR AS THE WATER WORKS, AND PATCHED ME UP ON A POD. SHE OPENED THE CRADLES' AIR, AND WENT BACK DOWN TO SIT WITH THEM." (`flags.wickPatched`.)
5. Back in the Root Cellar she's kneeling by the cradles, as before, and the rest of the Gardens is unchanged. (Since 3.12 the cradles are in the Nursery, and she waits by the hoist in the Root Cellar until the hero sends it down: "The way into the Gardens".)

If the hero leaves the escort's rooms (the Root Cellar, the Garden Lift, the Terraces, the Irrigation Works) before the sit-down, Wick isn't with them there, and she's with them again when they come back. A save from before this, with the cradles already seen, has her at the cradles as before.

**As built.** `story/gardens.js`: the cradles scene's new lines and `flags.wickUp`; `wickLift`, `wickTerraces` and `wickTop` (barks, from triggers in `areas/gardens.js`: by the Garden Lift, at the Terraces' foot, near their top); `wickPatch` (the Irrigation Works' trigger on its east ledge, with the new pod `S` at column 73). The catch-up is `catchUp` in `story.js` (`updateNpc`), for anyone with `follow`: every quarter second, if the hero is on the ground and the companion is off the screen on another floor, the companion is put up to six tiles behind the hero on the same floor (stopping at a wall or a drop) and fades in. The browser check leaves Wick on the Terraces' floor, stands the hero on the top ledge, and checks she catches up; then plays the sit-down, and finds her kneeling at the cradles again.

### New rooms on the main path (3.10 design, first batch)

The audit's step 4: about double each area, the Labyrinth and the Ballast first. That's a lot of rooms, so they come in batches, each one on the main path (not a side room), each with one idea of its own, and each built and checked before the next. Free space on the grid: in the Labyrinth's box, 0–80 × 114–137 (under the Cold Store and the Hatch Drop, over the Drain and the Long Aisle's west end), 240–280 × 92–115 and 200–240 × 138–160, and the whole of 280–480 × 92–161; in the Ballast, 40–80 × 161–184, 160–280 × 161–184, 320–440 × 161–207 and everything under y 230 but the Overflow Pipes.

1. **The Watch Gallery** (Labyrinth, 0, 114; 80x23). The Steward's soldiers watch the Long Aisle from a gallery over it. Its west end is now shut by the aisle gate (a door, `aisleGate`), worked from the gallery. The way on from the aisle is a ladder up near its west end into the gallery's east end, then west through the watch post: guards (`9`), a turret (`7`), a pit of live grating, crates up to a catwalk, and a Suit Cell high up for whoever finds the way to it. At the west end, over the Drain: the watch room, with the watch orders on a terminal ("NOBODY THROUGH TO THE DRAIN WITHOUT A STEWARD'S MARK. COUNT THE REST."), the gate's lever (it opens the gate: the way back is the aisle again), and a floor hatch down into the Drain, beside Solder's toolbag.
2. **Odell's Test Tank** (Ballast, 160, 161; 80x23). Odell's boots move from the far end of his workshop to the far end of his test tank, above it. A ladder at the workshop's far end goes up into the tank's west end: his observation deck, with his trial notes on a terminal ("TRIAL 41: HELD AT NINE FATHOMS. TRIAL 42: THE SUIT HELD. I DIDN'T. TRIAL 43: WITH THE NEW SEALS, BOTH OF US HELD."). East of it, the trial channel: silt floors under low roofs, crossed on foam, a shallow pool with eels, and a raised cage of crates; the boots at the end on their stand. The way back is the way in.

Each room adds two to four minutes for a first-time player. The playthroughs go through both; the browser check finds the gate shut until the lever is thrown, and the boots in the tank.

**As built (first batch).** `areas/cargo.js`: `watch-gallery` (two turrets, a guard, rats, two pits of live grating, crates up to a catwalk, the Suit Cell on a ledge over the watch room's roof, reached by the grapple ring), the Long Aisle's gate `D` (`aisleGate`; `G` is a weapon pickup's letter, so not that) and ladder `a`, the Drain's ladder `a`; the lever is a `lever` prop (drawn like a crane switch) with the log `L` that runs `aisleGate`, and the orders are log `watch` (`story/cargo.js`, with the thought at the shut gate, `aisleShut`). `areas/ballast.js`: `test-tank` (the deck with log `trials`, the low channel with three silt pits, a walled pool with an eel and a jelly, the boots `K`), and the workshop's ladder `a` where the boots were (the workshop now lists the foam among its abilities, which the hero always has by then). The playthroughs find the gate shut and go round through the gallery, and take the boots in the tank.

**Second batch (design, 3.12).** Two more rooms, one in each area again, each a step the hero must take on the main path:
3. **The Muster** (Labyrinth, 240, 92; 80x23). East of the Armory, over the Lifeboat Dock: where the Steward's soldiers line up for their doses. The Armory's east wall opens into it. Its west end is a pit of live grating too wide to jump, with two grapple rings over it: the first use of the harpoon, straight after picking it up. Past the pit, a girder runs east along the top of the room, and the muster floor is under it: the dosing chairs in a row, with Bloomsworn soldiers sitting in them who get up when the hero comes down; a scrawl in a soldier's hand ("I HAD A NAME"); the dose book on a terminal (log `muster`: "MUSTER · DOSE BOOK: EVERY HAND, EVERY SHIFT. A HAND THAT MISSES A DOSE STARTS TO REMEMBER. A HAND THAT REMEMBERS GOES OVER THE SIDE IN A LIFEBOAT, IF IT CAN FIND ONE."). The girder's east end drops to the floor, with a ring to climb back by. In the floor, a hatch down into the Lifeboat Dock. The dock's door to the Purser's Office is bolted on the dock's side, so the Muster is the way in; the deserter unbolts it in his scene, and the office is the way back.
4. **The Pump Heads** (Ballast, 40, 161; 40x23). Over the Pump Gallery, between the Intake and the Tank Farm: the heads of the three great pumps, their motors, and the wet catwalks between them. The Pump Gallery's door from the Intake is wedged shut from inside (Solder did it, to keep the eels out), so the way to him is round: up the Intake's east wall into the Pump Heads, over the pump heads (jellies drifting between them, a shallow pool with an eel), to Solder's wet ladder down at the east end, chalked "WET. HOLD ON. — S". It comes down beside him in the Pump Gallery. Once he's found, the wedge is knocked out (`open` once `flags.solderFound`), and the Intake's door is the way back.

Each adds two or three minutes for a first-time player. The playthroughs go through both (the Labyrinth's route to the dock through the Muster, the Ballast's to Solder through the Pump Heads), and the browser check finds the dock's bolt shut until the deserter's scene and the Pump Gallery's wedge shut until Solder is found.

**As built (second batch).** `areas/cargo.js`: `muster` (240, 92): the Armory's east wall open into it; the pit (columns 12–26, live grating at the bottom) with a ring each side of a hanging rack in the middle (the room checker fires the harpoon only from standing or the top of a jump, so the rack is where the second shot is taken from); the girder (row 11, columns 27–69) with Bloomsworn on it and drones over it; the muster floor under it with six dosing chairs (`dosechairs`, a new prop in `scenery.js`), Bloomsworn, a rat, crates, the log `muster`, the scrawl, and the hatch `h` down into the Lifeboat Dock (its ladder up `a`, column 32); a ring at the east end to climb back onto the girder. The Purser's Office has the bolted door `D` (`dockBolt`, columns 36–37, open once `people.flux` is set) and a thought at it (`dockBolt` in `story/cargo.js`); in the deserter's scene the Purser says he's drawn the bolt. `areas/ballast.js`: `pump-heads` (40, 161): in from the Drain Shaft's east wall (now open at rows 12–15, over a new ledge, with Solder's chalk "UP HERE"); the three pump heads with their motors (`pumps` drawn on them), a puddle, a pool with an eel, and a puddle between them; jellies; Solder's ladder `h` at the east end, coming down by him in the Pump Gallery (`a`, column 36). The Drain Shaft's way into the Pump Gallery has the wedged door `D` (`wedge`, columns 36–37 at the bottom, open once `flags.solderFound`), with a thought at it (`wedged` in `story/ballast.js`), and Solder mentions the wedge when he's found. The playthroughs go Armory, Muster, dock, and back by the office; and Drain Shaft, Pump Heads, Pump Gallery. The browser check finds the bolt shut before the deserter and open after, the Muster's hatch, the wedge shut before Solder and open after, and his ladder.

**Third batch (design, 3.14).** The Labyrinth and the Ballast have had two batches each, so this batch builds up the bosses of the Spine and the Tower, the way the Counting House builds up the Bailiff (Cody's note 2). Each room is a step the hero must take, with the same shape: the shaft the hero is climbing is shut from above, so the way on is out through a low door, round through the new room, and back in through a high door above the block. Coming out on top, the hero opens the block from that side, so it becomes the short way down, as with the dock's bolt and the Pump Gallery's wedge.
5. **The Stokers' Bunks** (Spine, 520, 5; 80x23). East of the Piston Run's top screen: where the Steward kept the stokers he took from the walls. The Piston Run's way up to its landing is plated over, bolted on the landing's side, and a door in the shaft's east wall is stencilled "STOKERS". Inside, the lower level is the bunks: bunks bolted to the wall, heat slugs, a strip of hot grilles in the floor, and the stokers' roster on a terminal (log `stokers`: "REACTOR · STOKERS' ROSTER. A STOKER LASTS A YEAR AT THE FIRES; TWO ON A FULL DOSE, WHEN THEY STOP FEELING THE HEAT. KEEP THEM ON A FULL DOSE. WHEN ONE IS USED UP, TAKE ANOTHER FROM THE WALLS. LAST IN: ABEL, YEAR 307."). The last bunk, alone at the east end, has a Hullfolk count scratched into its frame, in fives, for a year; then the fives come apart and it's only scratches (log `abelCount`, "the last bunk"). Through the wall, over the fires, someone is humming the tune the Hullfolk hum. A steam vent at the east end carries the hero up to the fuel line, a belt running west to the furnace, with steam drones and a gap in it, and the fuel line comes out on the Piston Landing. There the hero draws the plate's bolt (`flags.stokersPlate`), and the shaft is the short way down. After Abel's "I WAS ABEL.", a hero who read the last bunk thinks of the count.
6. **The Steward's Rooms** (Tower, 560, −133; 80x23). Over the Garden Gallery, east of the Bridge Stair's top screen. The Bridge Stair's way up to its landing is shut by a shutter, bolted on the landing's side, and a door in the stair's east wall leads into his rooms. The lower level is his study: ledgers floor to ceiling, his desk, the honour guard and a turret, and his daybook on a terminal (log `daybook`: "THE STEWARD'S DAYBOOK · YEAR 312. ASKED THE NAVIGATOR FOR ARRIVAL. NOT YET. IT HAS SAID NOT YET FOR TWENTY YEARS. IT IS GIVING ME TIME, AND I WILL NOT WASTE IT. THE GUARD: TWO HUNDRED HANDS. THE GARDENS WILL GIVE ME FOUR HUNDRED MORE. WHOEVER IS DOWN THERE, WE WILL NOT ARRIVE AS BEGGARS."). As the hero comes in, he speaks for the first time since the Lockup's intercom, in the same voice: "YOU'RE IN MY ROOMS. LOOK AROUND. I HAVE NOTHING TO HIDE FROM A SLEEPER." A climb of shelves at the east end goes up to the upper level, his bedroom: a narrow bed, the tall windows, and on a stand under glass a pair of old Hullfolk boots, mended so often there's more mending than boot ("EVERYTHING ELSE IN HERE IS NEW"). Out on the landing the hero draws the shutter's bolt (`flags.stewardShutter`), and he speaks once more: "COME UP, THEN. I'VE WAITED FORTY-TWO YEARS FOR SOMEONE WORTH TALKING TO." At the Helm, after Gasket's "...THOSE WERE HIS BOOTS.", a hero who saw the boots thinks of the glass case.

Each adds two or three minutes for a first-time player. The playthroughs go round through both, and the browser check finds the plate and the shutter shut until the hero comes out above them, and open after.

**As built (third batch).** `areas/spine.js`: the Piston Run's plate `D` (`stokersPlate`, rows 9–10, columns 26–37, open once `flags.stokersPlate`), its east wall open at rows 5–8 (the landing) and 13–15 (over the row-16 ledge, now run to the wall), the ram that came out of the wall at row 14 gone, a "STOKERS →" stencil, and the triggers `plateShut` (on the ledge) and `plateBolt` (on the landing, west of the plate, so the hero is never standing on it when it opens; after `liftTwo`). `stokers-bunks` (520, 5): the bunks (two `bunks` props), heat slugs, hot grilles in the floor (columns 34–38), the roster `T` (log `stokers`), the last bunk (`lastbunk`, a new prop: the count in fives, then scratches, and the name) with its log `l` (`abelCount`, read by the scene `abelBunk`), the trigger `stokers` (the humming) at the low door, a vent at the east end (columns 72–75) up to the fuel line, two belts running west with a gap between them (columns 46–49), and drones. In `story/spine.js`, Abel's "I WAS ABEL." is followed by the bunk if it was read (the Steward's lists otherwise). `areas/tower.js`: the Bridge Stair's shutter `D` (`stewardShutter`, rows 9–10, columns 23–37), its east wall open at rows 5–8 and 17–20 (over the row-21 catwalk, now run to the wall), a "PRIVATE →" stencil, and the triggers `shutterShut` and `shutterBolt`. `steward-rooms` (560, −133): the study (shelves, his `desk`, the daybook `T`, a guard and a turret), the shelves' ledges up the east end, and the bedroom (`cot` and `bootcase`, new props; tall windows, banners, a guard and a turret). The triggers `stewardRooms` (his voice, and the hero knows it if the Lockup's intercom was heard) and `bootcase`. In `story/tower.js`, the Helm's speech adds the hero's "THE BOOTS UNDER GLASS, IN HIS ROOMS." after Gasket's line if they were seen. The playthroughs go round through both (`playthrough-routes.js`), and the playthrough runner now rests at a room's pod only once the pod can be reached (the Piston Landing's and the Bridge Stair's are above the shut ways). The browser check finds the plate and the shutter shut, plays the bunks, the last bunk, his rooms, the daybook and the boots, draws both bolts, and hears both payoffs.

How to build lock 1:
- Put the two pipe rooms on the grid in free space next to the station (440, 207) and the Spine Foot (480, 185). Rooms join only at their sides, so use a floor hatch or ladder where the shapes don't line up, as the Spine does.
- Make the station's east shutter a door whose `open` is `s.people.solder !== 'dead'`. Fill the trench with water (`~`) on entry when he's dead, the way the flood fills rooms.
- Add the rooms to `rooms-check.js`'s expectations as usual, and give the Crash route in `playthrough-routes.js` a step through the pipes, since that route leaves Solder.

### The run for the sleds, coming apart (3.11 design, Cody's note 13)

Cody launched the pods ("TWENTY SECONDS YOU MAY NOT HAVE") and still found the run fast and easy. Measured: the shortest way from the sump to the sleds is about 500 tiles, about 55 seconds for a runner who knows the way (about 71 through the deep walls), against a clock of 4:30. The clock was five times what the run needs. The fix is a clock that bites, and a ship that looks and plays like it's falling apart.

1. **The clock.** 2:40, from 4:30. Launching the pods costs 30 seconds, up from 20. A check (in `rooms-check.js`) works out the run's par from the maps, with the run's collapses in, and fails if the clock leaves less than half the par again, or more than twice it, after the pods.
2. **Ways that change.** While the clock runs, parts of the run's rooms are not where they were: doors that follow `flags.running` (`wreck: 'hole'`, floor that is there until the run and gone in it; `wreck: 'beam'`, a girder or rack that's only there in the run). Each is drawn for what it is: the floor plates look cracked before they go, and a fallen girder looks like one. Coming into the room, the hero sees the dust still settling on each.
   - **The Warrens:** a girder pile comes down across the hall, floor to ceiling, west of the old platforms. The way west is up the platforms and over it.
   - **The Coolant Hall:** its floor gives way over the coolant, a long stretch west of the middle. The way across is the girders that fell into it, standing up out of the coolant.
   - **The Cryo Bay:** the floor east of the cable pit goes too, so the pit is too wide to jump. A fallen pod rack lies across it.
3. **The ship falling apart, everywhere on the run.** Fires on the floor in the Warrens, the Coolant Hall and the Thaw Corridor (they hurt, like the Stoker's). Sparks from cut cables. Cracks across the walls, plates hanging loose. The ceilings come down more often: every 80 frames, not 110.
4. **What stays.** The bar under the clock still says which way. A fall, or the clock running out, still starts the run again from the sump with a full clock. The pods are still a choice.

**As built.** The clock and the launch's cost are `HA.RUN` in `core.js` (160 and 30 seconds); `checkRun` in `rooms-check.js` works out the par (the usual way 58 seconds over 520 tiles, round by the deep walls 73 seconds over 661) and holds the clock between half again the longest par and two and a half times the usual one, after the pods (`node rooms-check.js run` runs it alone). The ways that change are doors with `state: 'running'` and `wreck` (`drawWreck` in `scenery.js`), which the room checker crosses with the run on and off: in the Warrens a girder pile (`W`, columns 37–41, rows 12–18), climbed from the old platforms on its east side or the raised block on its west; in the Coolant Hall the floor at columns 22–40 (`X`) over a channel of coolant, with girders (`W`) standing a tile proud at columns 25–26, 30–31 and 35–36 (the crawler that stood there moved east); in the Thaw Corridor the ceiling down across the top passage (`W`, columns 30–33, rows 5–7), leaving a squeeze two tiles high over it. The Cryo Bay keeps its floor (its pit is the first room's, and live cables there would change the opening): it gets the fire and the wreckage. In `story/scuttle.js`, every room of the run gets its fires (`FIRES`, two tiles wide, where a jump clears them), cracks and hanging cables that spit sparks (`wreckOf`, the same each time), and the dust settling on what changed as the hero comes in; the ceilings come down every 80 frames. The browser check finds the Coolant Hall come apart in the run, and the clock at 2:40.

### The Counting House: the way to the first Warden (3.11 design, Cody's note 2)

Cody: the way to the first Warden (the Bailiff) is too short and not built up. Today the hero follows the taken from the Warrens through the Lockup (two screens) straight into the Bailiff's Hall. The free space above the Lockup and the hall (200–280 × 0–46) takes one tall room between them.

1. **The Counting House** (200, 0, 80x45; four screens). The Lockup's east end has a ladder up into it. The way through it climbs from the floor of the counting hall, where Wardens sort the taken into cages: desks, tally boards, an empty cage with a Hullfolk scarf in it. It goes up through the tiers to the cage rail that runs under the roof, then east along the rail, and down the cage chute at its east end into the Bailiff's Hall. Wardens on every tier (walkers, pickers), and a turret over the rail.
2. **Seeing the Bailiff first.** Halfway up, through a grate in the floor of the rail, the hero sees Shim's cage being carried along under them, and down the chute. At the chute's top they look down into the hall and see the Bailiff below, waiting by the cage. Then they drop in.
3. **The Lockup's way east into the hall is the Bailiff's own door,** shut from his side until he falls. The way back after is through it.
4. **A log** on the counting floor: the Wardens' tally of the night's raid ("COLLECTED: 3. SMALL: 1. HEALTHY: 3. TO THE GARDENS: 3."), which is how the hero first sees that the taken go up to the Gardens.

**As built.** `counting-house` (`areas/lockup.js`, 200, 0, 80x45). The Collection Block has a ladder up (`a`, column 58) and the Bailiff's outer door at its east end (`E`, `bailiffOuter`, open once the hero has come down the chute, `flags.chute`, or the Bailiff has fallen); walking up to it, the hero thinks "SHUT FROM THE FAR SIDE. THE WARDENS TOOK SHIM UP THE LADDER." and the lead becomes "CLIMB THE COUNTING HOUSE AFTER SHIM". Inside: the counting floor with the tally (`T`, log `tally`: "COLLECTED FROM THE WALLS: ONE. SMALL. HEALTHY. NOT UP TO THE GARDENS WITH THE REST: HOLD IN THE BAILIFF'S HALL. THE SLEEPER WILL COME FOR IT.") and a desk to start the climb; seven tiers four rows apart with walkers and a warden; the rail's catwalk under the roof, east to the chute's three-tile mouth; the chute's ledges down to its foot, with a stack of empty cages there to climb back by; the cage store at the rail's end (crawlers and crates). At the top tier Shim's cage goes along the rail and down the chute (`cageRail`: "SLEEPER! UP HERE!"), at the mouth the hero sees what's below (`chuteTop`), and at the foot the hatch (`g`) drops into the Bailiff's Hall at its new ladder (`a`, column 7), right where his fight starts. The design's tally said three were taken; the raid takes only Shim, so the tally says one, and that he's bait for the hero. The view of the Bailiff from above is the thought at the chute's mouth, not a picture. The playthroughs go round through it to the Bailiff (one room more on every route).

### The way into the Gardens: the taken found deeper (3.12 design, Cody's note 2 and answer of Nov 4)

Cody: the way to the Gardens is too short and not built up enough. The Gardens are where the taken are hidden, so getting there should feel like an achievement. Asked whether that meant the walk there or the taken being found too soon, Cody said (Nov 4): "The taken are found too soon. It doesn't feel worked for." In 0.3.12 the cradles are in the Root Cellar, the first room past the Bailiff's Hall.

The taken move to the top of the Gardens, and the hero climbs the whole of it to find them.

1. **The Root Cellar: they were here.** Wick leads the hero to the back wall, and the cradle racks are empty: brackets, cut air hoses, and scrapes on the floor all going one way, to a cradle hoist at the east end. The hoist has been run up to the top and locked there ("THE WARDENS KNEW SOMEBODY WOULD COME LOOKING", after the Counting House's tally). Wick: the cradles breathe through the water works, so wherever they are, the air goes there. "SO WE GO UP. ALL THE WAY UP." The lead becomes "FIND WHERE THE WARDENS TOOK THE TAKEN".
2. **The climb, with Wick** (as built in 0.3.11, "Wick's longer escort"): the Garden Lift's hall, the Terraces, and the Irrigation Works, where she patches the hero up on the pod and opens the cradles' air. Now the air tells them where: it runs up the pipe through the roof, over the Spore Beds, to the old Nursery, where Wick used to sneak in among the seedlings as a girl. She can't climb the Spore Beds without a suit, so she goes back down to wait by the hoist: "FIND THEM, AND SEND IT DOWN FOR ME, SLEEPER." The lead becomes "FIND THE NURSERY, OVER THE SPORE BEDS".
3. **The Spore Beds** as now, but the way out at the top no longer runs east into the Seal Room: it's a ladder up, into the Nursery.
4. **The Nursery** (new, 280, -23, 120x23: three screens over the Spore Beds and the Seal Room). Pink grow-light, too warm. The potting floor: pickers and a spore pod among the benches, and a wall of planters to climb over. A pit of Bloom thorns crossed on hanging planters. Then the cradles, in two racks along the back wall, with the taken asleep in them. When the hero reaches them the music stops: "THEY'RE HERE." The hero sends the hoist down, and it comes back up with Wick, who has the cradles scene from before (dosed in their sleep, Sorrel's empty cradle, the Bloom shutting doors in people). She stays with them. The seals are worked from the room underneath: at the far end, past the hoist and the dosing station with its dose book (log `dosebook`), a hatch drops into the Seal Room's top deck. The lead becomes "FIND THE WARDEN THAT HOLDS THE SEALS".
5. **The Seal Room and the Pruner** as now. The way back up to the Nursery is the hatch's ladder, and the cradles open there (the wake scene, as before). The woken ride the hoist down to the Root Cellar, and walk on to the Garden Lift. The hoist works both ways from then on, a shortcut from the top of the Gardens to the bottom.

The taken are now six rooms in, past the Gardens' climb and a guarded room of their own, instead of one. The playthroughs and the browser check follow the new way: the empty racks, the hoist shut from below, the sit-down, the find, the wake in the Nursery.

**As built.** `nursery` in `areas/gardens.js` (280, -23, 120x23): the potting floor under a low roof (a picker, a spore pod on the benches, Bloomsworn past a wall of planters five tiles high with the Bloom bulb on top); the thorn pit (columns 42–56, two hanging planters over it); the cradles (the `cradles` prop at column 59, the same twelve, drawn live); the hoist `Y` at column 90; the hatch down `e` at column 98, over the Seal Room's top deck; the dose book `T` and a Bloom tank at the dosing station, with two more Wardens and a drifter over the gantry. The Spore Beds' way east at the top is walled, and a ladder up (`a`) stands on the ledge where it was; the Seal Room's west edge is walled, and its ladder up (`a`, column 58) is where the hatch drops the hero. The Root Cellar's cradles became `racksEmpty` (a new prop in `scenery.js`: brackets, cut hoses, scrapes to the hoist) and the hoist `Y` (`shut` until `flags.hoist`). In `story/gardens.js`: `berths` (the empty racks, `flags.berths`; it replaces `cradles`, and the Hall's Wick and her walk in stop at `berths` too, in `areas/lockup.js`), `hoist` (the ride, both ways), `nurseryIn` (a thought) and `nursery` (the find, the music stopped; the hoist sent down and Wick up it; `flags.cradlesSeen` and `flags.hoist`), Wick's lines by where she is (`TALK.wick.cellar`), her sit-down pointing up to the Nursery, and the wake moved to the Nursery (a trigger anywhere past the thorns, so the walk never crosses them), with the woken riding the hoist down. Old saves past the old cradles scene pick up in the Nursery: Wick is there, and the hoist works once ridden from the top. The playthroughs go root cellar, Garden Lift, Terraces, Irrigation Works, Spore Beds, Nursery, Seal Room, Nursery, and down the hoist to the vats; the browser check finds the racks empty, the hoist shut from below, the lead pointing up after the sit-down, the find with Wick come up the hoist, and the wake in the Nursery.

### Gasket's trust (3.11 design, Cody's notes 1 and 8)

Cody: old Gasket should slowly come to trust the hero, as one of the story's character threads. After his talk at the Crew Camp about breathing out before the end, there should be times the hero could lose him. (On Nov 4 Cody said the names read as men's, so Gasket and Solder are men now: Gasket is Shim's grandad, Wick's father and Cleat's brother.)

**The thread.** Gasket's trust grows with what the hero does for him and the village, and shows in what he says, never as a number. It's worked out from the save (`gasketTrust` in `story.js`): one each for the wrench put away, Cleat's count shown, Wick's lantern left with the fire (choice 4), Flux home (choice 6), and the village calling the hero LATE. Each step is a short scene when the hero talks to him at home, optional, once.
1. **The wrench** (built): "ONE NIGHT, SLEEPER. TOUCH NOTHING."
2. **Shim brought back** (after the Bailiff, talking to him at home): he hangs the wrench up. "I'VE BEEN WAITING FOR YOU TO TURN INTO WHAT THE LAST ONE WAS." "YOU HAVEN'T. YET." Journal: "OLD GASKET HUNG HIS WRENCH ON ITS HOOK. FOR NOW, HE SAID."
3. **The taken home** (after the cradles, talking to him at home): he shows the hero his brother Cleat's marks on the wall, a count of days. "CLEAT COUNTED THE DAYS ON THIS WALL TILL SOMEBODY CAME DOWN TO HELP US. HE GOT TO NINE HUNDRED AND TWELVE." "THEN A SLEEPER CAME DOWN." The hero: "I'M NOT HIM." "NO. YOU BROUGHT THEM HOME."
4. **The lantern** (choice 4, built): left with the fire, it counts.
5. **The plan** (built): he climbs too.
6. **The Crew Camp** (built: "I SPENT MY WHOLE LIFE HOLDING MY BREATH. I'D LIKE TO BREATHE OUT BEFORE THE END."): with trust 3 or more, he adds what he's never told anyone. "I'VE NEVER SEEN A SKY. CLEAT SAID IT'S LIKE A CEILING NOBODY BUILT." "IF I DON'T MAKE IT TO THE GROUND, YOU TELL THEM I WANTED TO." With less, he only says goodnight.

**As built (the thread).** `js/story/gasket.js` (after `tram.js` in `index.html`): `S.gasketTrust`, and the scenes `gasketWrench` and `gasketCleat`, which a talk hook plays when the hero talks to him in the Warrens, after any of the main conversations there that are due (the hook comes after the Warrens' own). The wrench plays between the reunion and the Gardens, or, if missed, once the broadcast is past; Cleat's count plays after the wrench, once the broadcast is past. Cleat's marks are on the wall by his door all game (`tallymarks` in `scenery.js`). At the Crew Camp (`story/spine.js`), with trust 3 or more he says what he's never told anyone (`flags.gasketSky`), and the journal keeps it. The browser check talks to him at home (the wrench, then Cleat, then nothing new) and hears the sky at the camp.

**Times the hero could lose him** (after the Crew Camp). The first design had three: the Barracks (a shutter, and a hurt that slows him on the run), the Helm (Marrant takes him at a rail), and the run for the sleds (a hurt Gasket falls behind at the Cold Store's lift). Cody (Nov 4): "we could lose Gasket in 2 places." The two built are the Barracks and the Helm, because those are the places he's with the hero; on the run he goes round by the Cold Lift with the crew, and the hero runs alone.

**Losing him (3.11, as built).** `js/story/gasket.js`, with the Barracks' trigger in `areas/tower.js` and Marrant's side of it in `bosses/steward.js`.
1. **The Barracks: the night watch.** The first time the hero reaches the Barracks' far end (columns 64 to 77) with the crew by the lift, the intercom: "YOU BROUGHT A VILLAGE UP MY LIFT, AND LEFT THEM IN MY BARRACKS." "NIGHT WATCH. UP. THE OLD ONE FIRST." The camera goes back to the bunks: two of the honour guard, shields up, come for the old man. Gasket steps out in front of the crew with his wrench ("BEHIND ME. ALL OF YOU." and "I TOOK THE WRENCH OFF ITS HOOK BEFORE WE CAME UP. FOR LUCK.", or, if he never hung it up, "GOOD THING I NEVER PUT THIS DOWN."). Toast: GET BACK TO GASKET. A bar over his head (at the screen's edge with an arrow, when he's off it) runs down over 8 seconds; a pike that reaches him stops on his wrench and rocks him back a step. The guards go for him, not the hero (an enemy's `prey`, in `actors.js`), until the hero hurts one or reaches him.
   - **In time** (the hero within 5 tiles of him, or both guards down): `flags.gasketBarracks = 'held'`; "ABOUT TIME!", the guards turn on the hero, and once they're down: "...TOOK YOUR TIME." "THIRTY YEARS SINCE I SWUNG THIS AT ANYTHING BUT A PIPE." With trust 3 or more, "YOU CAME BACK FOR AN OLD MAN. CLEAT WOULD HAVE LIKED YOU."; with less, "GO ON, THEN. NOBODY ELSE COMES UP THAT LIFT TODAY." From the far end it's about 4 seconds' run, with a jump over the block halfway.
   - **Too slow:** they bring him down (`people.gasket = 'dead'`, `flags.gasketBarracks = 'lost'`, saved at once); the crew's cry ("GASKET!", or Shim's "GRANDAD!"), and the guards turn on the hero. Once they're down, the hero goes to him, and he's still there: "...THERE YOU ARE." "DON'T LOOK LIKE THAT. I ALWAYS THOUGHT I'D GO FIRST." (his line about Wick, turned round); with the sky (`gasketSky`), "YOU REMEMBER WHAT YOU PROMISED ME." and the hero: "I'LL TELL THEM YOU WANTED TO."; then "COUNT THEM TONIGHT. ALL OF THEM. DON'T SKIP ANYBODY." The crew carry him.
   - **Out of the room** while he's holding: he's lost ("I KEPT GOING."), and when the hero comes back he's lying where he fell, and the crew say "HE ASKED WHERE YOU WERE. AT THE END." A fall in the fight, or a game left in it, plays the night watch again.
2. **The Helm: his brother's boots.** In Marrant's last phase, once he's lost a quarter of himself, Gasket can't hold his breath any longer: "MARRANT." "THOSE ARE MY BROTHER'S BOOTS." He walks out at him with the wrench (no further than the first console), and Marrant: "SIT DOWN, OLD MAN." Marrant stands and holds the sidearm's sight on him for 5 seconds, whatever the hero does to him meanwhile. Toast: GASKET! PULL HIM BACK.
   - **Reached:** the hero gets to him, and he goes back to the crew ("ALL RIGHT. ALL RIGHT. I'M GOING." with trust 3 or more, "...FINE. FINE." without); the shot Marrant readied comes at the hero instead. Beating Marrant before he fires also saves him. `flags.gasketHelm = 'held'`.
   - **Kept fighting:** Marrant fires. Gasket falls; the crew's cry; "I TOLD HIM TO SIT DOWN." (`people.gasket = 'dead'`, `flags.gasketHelm = 'lost'`, saved at once). After the fight, "THE OTHERS WERE KNEELING BY GASKET." before choice 12, and END HIM: "NOBODY SAID ANYTHING. SOMEONE TOOK THE BOOTS OFF HIM, TO BURY WITH GASKET." A fall before it's settled plays it again.
3. **Without him** (`S.gasketAlive`, and `S.crewVoice`: whoever speaks for the crew, the first climber left in order, Gasket, Solder, Flux, Brine, then the others):
   - the Tower's crew (`towerCrew`) leave him out, and nobody takes his place: the Key counts one fewer;
   - lost in the Barracks, he isn't at the Helm to say "...THOSE WERE HIS BOOTS.": the hero says "CLEAT'S BOOTS. GASKET'S BROTHER. THE LAST SLEEPER SHOT HIM FOR THEM.";
   - Lift B's brake: eight pairs of hands means eight still with the hero (`hands` in `endings.js`), and the line for what closed it: "...WITHOUT GASKET'S, THERE WERE TOO FEW."; "THEN WE ALL LIFT. GASKET WOULD HAVE SAID SO. ON THREE." from whoever is left beside Solder;
   - the Dreaming Deck: his lines go to whoever speaks for the crew ("GASKET'S MOTHER SAID THE SHIP SANG IT AT NIGHT."), and Shim: "I'M NOT SCARED. GRANDAD WASN'T.";
   - the run for the sleds is opened by whoever speaks for the crew, and Tamp at the sleds: "THE CREW CAME UP THE COLD LIFT. THEY TOLD ME ABOUT GASKET.";
   - Overgrown is fought by Solder, or Gasket, or the first climber left (Brine, if no one else; any climber's sprite can stand in);
   - the epilogues: Homecoming, "OLD GASKET NEVER SAW THE SKY." with "I TOLD THEM HE WANTED TO." (with the sky) or "WE SAID HIS NAME TO IT, AND CLEAT'S." over his wrench on a cairn; Crash, "TAMP COUNTED THEM AT LIGHTS-OUT NOW." / "HE ALWAYS COUNTED GASKET TOO." (Tamp at the fire in his place); Dominion, "THEY BURIED OLD GASKET IN THE WALLS." / "NOBODY ASKED ME TO COME."; the Hullfolk who reach the new world are one fewer.

**Tests.** The browser check: the Tower run saves him in the Barracks (running back from the far end) and pulls him back at the Helm; a second run walks out on him in the Barracks, comes back to where he fell, plays the Helm without him (no boots line, the Key's count, no charge) and the run's opener (Flux's); a third lets Marrant fire; and the endings with him lost are read card by card (his three cards, Brine's Overgrown, Lift B's eight hands, the Hullfolk count). The Crash playthrough leaves him to the night watch; the others go back for him, and the runner's fight beats Marrant while he's holding the sight.

### Sorrel (3.13 design, the audit's 9, with lock 3b)

Brine's sister Sorrel was taken with the others, and her cradle in the Nursery has been empty all along. The Pruner counts her before its fight ("COUNT: ONE. UNPLANTED." "WHAT IS NOT PLANTED IS A WEED."), the Tallyman has her as "NOT FOUND", and Brine says "EMPTY ISN'T DEAD. EMPTY IS SOMEWHERE ELSE." This is where she went. It adds about 15 to 25 minutes, all of it optional, and uses only what the hero already has at each step.

**What happened to her.** The dose never held her: she counted to stay awake, the way she and Brine always counted at lights-out. She climbed out of her cradle and hid in the old greenhouse at the end of the Nursery, and the Pruner, which keeps the Gardens tidy, welded its door shut on her: a weed, left for the Bloom. She lived in there on old bean plants, counting the days on the glass, with the drain under the potting bench as her way out if the cutter ever came back in. The Bloom is in her (pink to the knuckles), and counting keeps it out: "IF I STOP COUNTING, IT STARTS COUNTING ME."

1. **The welded door** (the Nursery, east end, past the dosing station). Its seams are the Pruner's welds, fresh, and from the outside. Walking up to it the first time, the hero: "WELDED SHUT. FROM THIS SIDE."
   - **The Pruner released (choice 2):** in the wake, once the cradles are open, the Pruner doesn't just go. It goes to the door: "COUNT: ONE. UNPLANTED. IT RAN IN THERE." "I CUT THE DOOR SHUT ON IT. NOW I WILL CUT IT OPEN." It cuts the welds and the door falls in. Feet run, somewhere inside, and a woken villager says "...SORREL?" The woken take the news home. `flags.greenhouse`.
   - **The Pruner finished (lock 3b):** the welds stay. In the wake, after the woken have gone, the hero hears it: "SOMEONE'S COUNTING, BEHIND THAT DOOR." "THE PRUNER WELDED IT. NOTHING ELSE ON THE SHIP CUTS LIKE THAT, AND I FINISHED IT." Journal: "A DOOR AT THE END OF THE NURSERY IS WELDED SHUT, AND SOMEONE BEHIND IT IS COUNTING. ONLY THE PRUNER COULD HAVE CUT IT OPEN, AND I FINISHED THE PRUNER." Sorrel stays in there, and her trail never starts: the clues below are only there if she ran.
2. **The Old Greenhouse** (new, Gardens, 400, -23, 80x23, off the Nursery's east end through the cut door). The first glasshouse, and the Bloom's first garden: everything pink, the glass roof cracked, Bloomsworn and a spore pod among the dead beds, a thorn bed to cross on hanging planters, and a Suit Cell up in the roof frames. At the far end, under a potting bench, her nest, still warm: sacking, bean husks, and the days scratched into the glass in fives. Her message for Brine on the glass (log `sorrelGlass`): "BRINE. IF THE CUTTER EVER LETS YOU IN HERE, I'VE GONE DOWN THE DRAIN, WHERE THE WATER GOES. COUNT TO A HUNDRED AND COME FIND ME. S." The drain's grate is pried up, and the hole is too narrow for the suit. Reading it sets `flags.sorrelNote`, and the journal: "SORREL GOT OUT OF HER CRADLE AND HID IN THE OLD GREENHOUSE, UNTIL THE PRUNER WELDED HER IN. WHEN THE DOOR CAME OPEN SHE RAN, DOWN A DRAIN, 'WHERE THE WATER GOES'. SHE LEFT BRINE A GAME: COUNT TO A HUNDRED AND COME FIND ME." The lead stays on the main path; side quests never take it.
3. **Home** (talking to Brine, with `sorrelNote`): "COUNT TO A HUNDRED. THAT WAS OUR GAME. SHE ALWAYS HID WHERE THE WATER WENT. DOWN, ALWAYS DOWN." "FOLLOW THE WATER DOWN, SLEEPER. AND DON'T CHEAT. SHE KNOWS." That points the hero down, through the Labyrinth to the Ballast. (Before that, with the door cut but the note unread, Brine has the woken's news: "THEY SAID SOMEONE RAN, IN THE GARDENS. IT'S HER. I KNOW IT IS.")
4. **The Seed Vault** (optional, the grapple; the drain comes out here). With `greenhouse`: frost on the walls with her tally going on, seed packets torn open on the floor (beans, mostly), and, scratched in the frost by the floor grate (log `sorrelFrost`): "TOO COLD. DOWN TO THE BOXES. S." The hero: "SHE CAME DOWN THE DRAIN. THE FIRST PERSON IN HERE SINCE LAUNCH, AND SHE ATE THE BEANS." The journal adds a line.
5. **The Long Aisle** (the Labyrinth, on the main path). With `greenhouse`: chalk low on the shelving near the west end, in a smaller, rounder hand than Solder's: "SORREL · DOWN WITH THE WATER ↓". Passing it, the hero: "NOT SOLDER'S HAND. SORREL. SHE'S GOING DOWN, TO THE BALLAST." The journal adds a line.
6. **The Settling Pools** (the Ballast, the boots). One of the floor's pools is a deep sump (PRESSURE), and at its bottom is a hatch down. With `greenhouse`, her tally is scratched along the sump's lip. Without the boots the hero floats over it; with them, they sink to the hatch. It's barred from below. Without the note, the hatch only says "BARRED FROM BELOW." With it, the hero knocks and plays the game: "...NINETY-NINE. A HUNDRED. COMING TO FIND YOU, SORREL." The bar slides back (`flags.sorrelOpen`). (On the finished path the sump and its hatch are there, rusted shut: "RUSTED SHUT. NOBODY'S OPENED THIS IN A HUNDRED YEARS.")
7. **The Dry Pumps** (new, Ballast, 240, 229, 40x23, under the Settling Pools; in by the sump's hatch). A pump room that still runs dry: three old pumps thumping in time, lamps, a gauge, her nest and her tally over every wall. Sorrel works the pump lever, counting strokes, and doesn't turn round. "FOUR THOUSAND AND TWELVE. FOUR THOUSAND AND THIRTEEN." "YOU'RE NOT BRINE. BRINE CAN'T COUNT PAST TWENTY WITHOUT CHEATING." The hero: "SHE SENT ME. SHE'S STILL LOOKING." Sorrel: the glass box, the pink, the counting; "IF I STOP COUNTING, IT STARTS COUNTING ME." "THE PUMPS KEEP TIME. ONE STROKE, ONE NUMBER. AS LONG AS THEY RUN, I'M ME." The hero sees her hands. "TELL BRINE I'M ALIVE. TELL HER I'M STILL PLAYING."

**Choice (Sorrel's).** Prompt: "SORREL KEEPS COUNTING."
- **BRING HER HOME.** Confirm: gain "SORREL HOME TO BRINE · SHE CLIMBS WITH THEM", lose "HER PUMPS, AND HER COUNT". The hero: "GASKET COUNTS EVERYONE AT LIGHTS-OUT. EVERY NIGHT. YOU CAN COUNT WITH HIM." She stops on a stroke: "...FOUR THOUSAND AND THIRTY-ONE. THAT'S A GOOD NUMBER TO STOP ON." The pumps run down. "I KNOW EVERY PIPE BETWEEN HERE AND THE WARRENS. I'LL BE HOME BEFORE YOU. AND I'LL HIDE, AND SHE CAN FIND ME." Mercy +1. `people.sorrel = 'home'`. Journal: "I FOUND SORREL IN A DRY PUMP ROOM UNDER THE SETTLING POOLS, COUNTING TO KEEP THE BLOOM OUT. SHE STOPPED AT FOUR THOUSAND AND THIRTY-ONE, AND WENT HOME BY THE PIPES."
- **LEAVE HER COUNTING.** Confirm: gain "SHE KEEPS HERSELF, HER WAY", lose "BRINE GOES ON LOOKING". The hero: "THEN KEEP COUNTING. I'LL TELL HER." Sorrel: "TELL HER WHERE. NOT YET, THOUGH. WHEN SHE CAN COUNT TO A HUNDRED WITHOUT CHEATING." `people.sorrel = 'stayed'`. She stays at her pumps, and answers if spoken to. Journal: "I FOUND SORREL IN A DRY PUMP ROOM UNDER THE SETTLING POOLS. THE PUMPS KEEP HER COUNT, AND HER COUNT KEEPS THE BLOOM OUT. I LEFT HER COUNTING."

**Home again.**
- **Brought home:** the next time the hero comes into the Warrens (after the raid's news and Solder's, if those are waiting), Brine is at her door: "SHE'S HIDING. SHE CAME HOME BY THE PIPES AND HID, AND SHE SAYS I HAVE TO FIND HER." Brine counts, too fast. Sorrel comes out of the doorway: "YOU CHEATED. YOU STARTED AT FIFTY." Brine to the hero: "EMPTY ISN'T DEAD. I TOLD THEM." (`flags.sorrelHome`; the tram east waits for it.) From then on she's at home with Brine, and she climbs, counted after her sister: "SISTER. FOUND HER." "COUNTS." If the climbers have already gone up the Spine, she goes up after them, and she's at the camp with them.
- **Left counting:** talking to Brine at home: "ALIVE. COUNTING. THAT'S HER." "WHEN THIS IS OVER I'LL GO DOWN AND FIND HER MYSELF. AND I WON'T CHEAT."

**The count.** The Hullfolk who can reach the new world go from 31 to 32 (the Warrens' twenty and all twelve taken). Brought home, she's counted wherever the village is; left counting, she's counted only on Homecoming, when the ship comes down whole.

**Epilogue cards** (with the people whose fates only matter where the story reached them):

| | Brought home | Left counting |
|---|---|---|
| Homecoming | "SORREL AND BRINE PLANTED THE FIRST ROW OF BEANS." "SORREL COUNTED THEM IN." | "WHEN THE ARK CAME DOWN, SORREL WALKED OUT OF THE BALLAST, COUNTING." "SHE STOPPED AT A HUNDRED. BRINE WAS THERE." |
| Crash | "SORREL COUNTED THE SLEDS DOWN. EVERY ONE." | "THE PUMPS UNDER THE SETTLING POOLS RAN TO THE END." "SOMEONE WAS COUNTING THEM." |
| Dominion | "SORREL STILL COUNTS AT LIGHTS-OUT, BEHIND THE GATE." | "UNDER THE BALLAST, THE PUMPS KEPT TIME." "SORREL NEVER LOST COUNT." |
| Overgrown | "SORREL COUNTED UNTIL SHE COULDN'T." "BRINE KEPT COUNTING FOR HER." | "THE PUMPS UNDER THE SETTLING POOLS STOPPED." "THEN THE COUNTING DID." |

The Deserter's radio counts the Hullfolk with her if she's home.

**As built (3.13).** `js/story/sorrel.js` (new, after `gasket.js` in `index.html`) holds her logs, scenes, hooks and cards; the rooms are `greenhouse` (`areas/gardens.js`) and `dry-pumps` (`areas/ballast.js`). What changed from the design while building it:
- **The welded door** is the Nursery's `W` (a door with `welded: true`, drawn by `drawWelded` in `scenery.js`: a plate with beaded weld seams that glow). Released, the Pruner walks to it in the wake (`S.cutGreenhouse`, called from the `wake` scene in `story/gardens.js`) and cuts it; the hero adds "SOMEONE RAN. IN THERE." Finished, the wake ends with `S.weldedIn`: a tally scratch through the wall, "SOMEONE'S COUNTING. BEHIND THAT WELDED DOOR AT THE END." and the lock's journal line (`flags.weldShut`). A game quit in the middle of the wake settles the same way the next time a room is entered, since the wake doesn't play twice.
- **The greenhouse note** is the log `sorrelGlass` (reading it is what `flags.sorrelNote` was in the design: `logs.sorrelGlass`). Going in, and reaching her nest, the hero thinks a line without stopping (`greenhouseIn`, `sorrelNest`). The hero reads the drain for themself: "THE DRAIN UNDER THE BENCH. ITS GRATE IS PRIED UP, AND IT GOES STRAIGHT DOWN. TOO NARROW FOR THE SUIT." "WHERE THE WATER GOES. DOWN."
- **Brine at home** has three talks, one at a time: the woken's news before the glass is read (`brineRan`), the game once it's read (`brineGame`, where the hero tells her the message first), and, left counting, `brineAlive`.
- **The Seed Vault's frost** is a log (`F`) that only exists once she has run: a log legend can now carry `when` (`world.js`). The Long Aisle's chalk is drawn near its west end, and walking past it runs `sorrelAisle` (two thoughts and a journal line). Her tally marks, the frost, the packets, the chalk, her nest, the drain and the pumps are the scenery kind `sorrel` (`drawSorrel`), which draws nothing on the finished path.
- **The sump's hatch** (`h` in the Settling Pools, at the bottom of the east pool) says "RUSTED SHUT. NOBODY'S OPENED THIS IN A HUNDRED YEARS." on the finished path, and "BARRED FROM BELOW." before the glass is read. Knowing her game, the first time down plays `knock`: "BARRED FROM BELOW. I KNOW THIS GAME." "...NINETY-EIGHT. NINETY-NINE. A HUNDRED." "COMING TO FIND YOU, SORREL." Then the bar slides back (`flags.sorrelOpen`), and it's an ordinary hatch.
- **At the pumps** the hero says "YOUR SISTER'S STILL LOOKING FOR YOU.", and she keeps counting through the talk ("...FOUR THOUSAND AND TWENTY. DON'T MAKE ME LOSE COUNT."); the numbers are written out by `S.countWords`. Brought home, she walks off to the ladder, and Solder, if he came down with the hero, says "I'VE KNOWN THAT GIRL SINCE SHE WAS SIX. SHE USED TO COUNT MY RIVETS." (Solder follows the hero into the Dry Pumps.) Left counting, the pumps keep running, and she counts a stroke over her head every couple of seconds while the hero is in the room, carrying on from where she was.
- **Brine finds her** in the Warrens (`sorrelHome`) once the news that was waiting there is told (`S.newsTold(s, false)` in `story/tram.js`; the tram east waits for her too). Brine: "(the name the village gives the hero)! SHE'S HOME. SHE CAME UP THE PIPES BEFORE YOU, AND NOW SHE'S HIDING, AND SHE SAYS I HAVE TO FIND HER." "ONE, TWO, FIFTY, A HUNDRED. COMING TO FIND YOU!" Sorrel: "YOU CHEATED. YOU STARTED AT FIFTY." Then "EMPTY ISN'T DEAD. I TOLD THEM.", and Sorrel takes the lights-out count off Gasket ("HE'S TOO SLOW"). With the village hiding in the walls, it's voices from Brine's doorway. Her sprite is `sorrel` in `art.js`, and her voice is 520 in `audio.js`.
- **The climb:** `crewList` (`story/spine.js`) counts her after Brine; she has a line at the camp, and in the crew's count Brine says "SISTER. FOUND HER." and Sorrel "COUNTS." Brought home after the climbers have gone, she's one of them if there's a place for her. If there isn't, she's at home: with Brine, or, if Brine climbed, alone, keeping the count ("SOMEONE HAS TO."), and Brine says so at the camp.
- **The count:** `hullfolkCount(s, id)` in `endings.js` adds her (`S.sorrelCounted`), and the most the results card can count is 32. Her cards come first among the others' in each epilogue (`S.sorrelCards`).
- **Tests:** the browser check opens the door in the replayed wake (the cut, the glass, the journal), takes the hatch both shut ways and then knocks, brings her home (the choice, mercy, the journal), sees her and Brine at home and in the climb, and checks a card for each fate. The Homecoming playthrough goes into the greenhouse after the wake and brings her home; the Overgrown run leaves her counting; the Crash run finishes the Pruner, and the door stays welded.

### The other side quests (3.15 design)

The brief asks for six side quests, each with a moral choice that feeds Mercy or Bloom, and gives one as its example: "a Hullfolk mother asks you to find her son, who has eaten Bloom." Sorrel is the first. These are the other five, in the order the hero can first reach them. Each one starts in a place the main path already goes, never takes the lead, and uses only what the hero has by then. Two carry the optional fights that bring the bosses to the brief's "about 10" (eight on the main path, the Overgrown ending's, and these two). Hasp's boy is designed in full and built first; the other four are sketches for Cody to pick from or change before they're built.

**1. Hasp's boy (the brief's example; Warrens, Lockup, the Labyrinth's Muster).** Hasp is a Hullfolk woman who lives at the west end of the Warrens. Her son Cotter is nineteen. The night the Wardens took Shim, Cotter went up the Way Down after them with a length of pipe, to bring the taken back himself, and he didn't come home.
- **She asks.** From the hero's return from the Gardens until the climb, Hasp is at her door, and the first time the hero passes she calls them over (`haspAsks`): "SLEEPER. YOU CAME BACK FROM UP THERE. DID YOU SEE A BOY? NINETEEN. TALL. HE THINKS THAT MAKES HIM A WALL." "COTTER. HE WENT UP AFTER THE COUNTERS THE NIGHT THEY TOOK SHIM. WITH A PIPE." "IF HE'S DEAD, TELL ME. I'D RATHER KNOW." Journal: "HASP'S SON COTTER WENT UP THE WAY DOWN AFTER THE WARDENS, THE NIGHT THEY TOOK SHIM. HE NEVER CAME HOME."
- **The Counting House** (on the main path, before the Bailiff): the Wardens' tally on the floor's terminal gains a line once she has asked, or reads it the first time if the hero goes back (log `tallyCotter`): "COLLECTED, OUTSIDE THE COUNT: 1. MALE. ADULT. RESISTED. NOT FOR THE GARDENS. SENT TO THE MUSTER." The hero: "NOT FOR THE GARDENS. THE MUSTER. THEY MADE A SOLDIER OF HIM."
- **The Muster.** In the dosing chairs, one soldier doesn't get up when the others do: young, pink to the elbows, strapped in, asleep with his eyes open. The scrawl "I HAD A NAME" is over his chair, in his hand. Before Hasp has asked, the hero only notices: "THIS ONE DIDN'T GET UP. HE'S YOUNG. HULLFOLK, UNDER THE PINK." Once she has, talking to him plays `cotterFound`: the hero says his mother's name, and the dose fights it. ("A HAND THAT MISSES A DOSE STARTS TO REMEMBER," says the dose book.) "...HASP?" He tears the straps.
- **The fight: Cotter, remembering** (optional boss). He isn't trying to kill the hero; he's trying to get the Bloom out of his head, and the hero is what's in front of him. It can't be won by hurting him: the hero's shots only knock him back and stagger him. What runs down is the fit, a bar over the fight that empties over about forty seconds while the hero stays on their feet. He has three moves, each telegraphed: a pipe lunge along the floor (he winds back, then crosses half the room), an overhead slam that sends a crack along the grating both ways (jump it), and a leap up to the girder and a drop where the hero stands (a shadow first). Shards vent from the dose racks on a schedule. The fight has its checkpoint at its start: a fall puts him back in his chair, and talking to him starts it again. When the fit breaks he goes down on his knees: "...MA'S GOING TO KILL ME."
- **The choice (Cotter's).** Prompt: "COTTER IS SHAKING. THE NEXT SHIFT'S DOSE IS IN THE RACK."
  - **WALK HIM HOME DRY.** Confirm: gain "HASP'S SON, HIMSELF", lose "HE'LL BE SICK FOR WEEKS · HE CAN'T CLIMB". Mercy +1. The hero: "NO MORE. YOU'RE GOING HOME." Cotter: "IT'LL BE BAD. I CAN FEEL IT WAITING." "...I KNOW THE WAY DOWN. I CAME UP IT. TELL HER I'M COMING." He goes down the hatch, shaking. `people.cotter = 'dry'`. Journal: "I FOUND COTTER IN THE MUSTER'S CHAIRS. I SAID HIS MOTHER'S NAME, AND HE FOUGHT THE BLOOM UNTIL IT LET GO. HE WALKED HOME DRY."
  - **GIVE HIM HIS DOSE.** Confirm: gain "HE WALKS HOME STRONG · ONE MORE PAIR OF HANDS", lose "HE'LL NEED IT EVERY SHIFT · HE DOES WHAT THE DOSE SAYS". Mercy −1. The hero takes a dose from the rack and gives it to him. He stops shaking at once. "...THAT'S BETTER." "WHO GIVES THE DOSE GIVES THE ORDERS. WHAT ARE MINE?" The hero: "GO HOME. TO HASP." "YES." He goes. `people.cotter = 'dosed'`. Journal: "I FOUND COTTER IN THE MUSTER'S CHAIRS. THE BLOOM LET GO OF HIM, AND I GAVE IT BACK. HE WENT HOME BECAUSE I TOLD HIM TO."
- **Home.** Dry: the next time the hero is in the Warrens, it's voices from Hasp's doorway (Cotter is in bed): "HE SHAKES ALL NIGHT. HE ASKS FOR IT. I SAY NO, AND HE SAYS THANK YOU." Later, when the climbers go: "HE'S UP. HE WALKED TO THE GATE AND BACK TODAY. NEXT TIME, HE SAYS." Dosed: Cotter is out in front of her door, standing very straight. Hasp: "HE CALLS ME MA'AM." "HE CARRIED THE WATER IN, AND THEN HE STOOD THERE UNTIL I TOLD HIM HE COULD SIT DOWN."
- **The climb.** Dosed, Cotter climbs whatever the village thinks of the hero ("HE GOES WHERE THE DOSE GOES"): he's one more of the crew, past the number the trust allows, and a pair of hands for Lift B's brake. The seal at the foot of Lift B won't take him ("THE SEAL WON'T LET ME DOWN. I'LL HOLD THE BRAKE."), so he stays at the top. Dry, he stays home.
- **The count.** Like Sorrel, Cotter is outside the Warrens' twenty, so the most the results card can count goes from 32 to 33; home either way, he's counted wherever the village is.
- **Epilogue cards:**

| | Walked home dry | Dosed | Never found (Hasp asked) |
|---|---|---|---|
| Homecoming | "COTTER WALKED OUT ONTO THE GROUND ON HIS OWN FEET." "HASP WALKED BEHIND HIM, IN CASE." | "THE DOSES RAN OUT A MONTH AFTER LANDING." "COTTER SHOOK FOR A SEASON. THEN HE ASKED HASP WHAT HIS NAME WAS." | "HASP WAITED AT THE SHIP'S DOOR UNTIL EVERYONE WAS OUT." |
| Crash | "COTTER CARRIED HASP DOWN TO THE SLEDS. HE SAID IT WAS HIS TURN." | "COTTER HELD THE SLED DOORS UNTIL HE WAS TOLD HE COULD STOP." | "HASP LEFT A LIGHT IN HER DOOR, IN THE SHIP, WHEN THE SLEDS WENT." |
| Dominion | "COTTER STANDS AT THE GATE NOW. HE NEVER DID GET STRONG." | "COTTER CAME UP TO THE TOWER FOR HIS DOSE EVERY SHIFT." "I HAD THE RACKS NOW." | "HASP STILL ASKS EVERYONE WHO COMES DOWN THE WAY DOWN." |
| Overgrown | "COTTER HAD BEEN DRY FOR A MONTH WHEN THE PINK CAME BACK FOR EVERYONE." | "COTTER DIDN'T NOTICE ANY DIFFERENCE." | "THE MUSTER'S CHAIRS ARE EMPTY NOW. THEY ALL WENT TO THE GARDENS." |

**As built (0.3.17).** `js/story/cotter.js` (after `sorrel.js` in `index.html`) holds Hasp's and Cotter's scenes, hooks, cards and count; `js/bosses/cotter.js` (after `navigator.js`) is his fight. What changed from the design while building it:
- **Hasp's door** is east of the Garden Lift (col 72), not at the west end. She's out from the hero's return from the Gardens until the run for the sleds; while the hero is called COUNTER, or the gate fell and the walls haven't come out, she's behind her door, and asks from the doorway.
- **The tally line** is its own terminal on the Counting House's floor (`V`, log `tallyCotter`), readable whether or not Hasp has asked: "COLLECTED, OUTSIDE THE COUNT: ONE. MALE. ADULT. RESISTED, WITH A PIPE. NOT FOR THE GARDENS: TOO OLD TO PLANT. SENT TO THE MUSTER." Before she's asked, the hero only says "SOMEONE FOUGHT THEM. THEY DIDN'T COUNT HIM WITH THE OTHERS." Hasp's own scene picks up whichever of the tally and the chair the hero has already seen.
- **The Muster.** His chair is at col 46, under the girder. The "I HAD A NAME" scrawl stays where it was, over the hatch. Talking to him starts nothing while a Bloomsworn is up within 160 px of his chair ("NOT WITH THE OTHERS STILL ON THEIR FEET."), and nothing comes back into the room once his fight starts.
- **The fight.** The fit is 2400 frames (40 s), shown as his bar; it runs down only while the hero is alive, and quickens at 2/3 and 1/3. Shots knock him back, and stagger him only in a wind-up or between moves. Touching him costs 2 (3 in a lunge or a drop). The slam sends floor waves both ways; the leap only goes for the girder while both of them are under it (it ends at col 69), and he hangs there before he drops: his shadow is a dark bar with blinking pink edges. At each quarter of the fit the rack nearest the hero vents shards, and a heart if the hero is hurt. The music is the Wick's track. The checkpoint is at col 34; a fall, or leaving the room, puts him back in his chair.
- **Late.** Settled after the climbers have gone (`flags.cotterLate`), he goes home either way and never climbs: the crew is already counted.
- **Home.** Hasp's news (`cotterHome`) plays in the Warrens once the hero's own news has been told. Dry, he's a voice from the doorway, in bed, until the climbers have gone; then he's out, in his own clothes (`cotterDry`): "I WALKED TO THE GATE AND BACK TODAY." "NEXT TIME, ALL THE WAY UP." Dosed, he's out by her door from the start, in the Steward's uniform: "ORDERS?"
- **The climb.** Dosed (and not late), he's one more of the crew past what the trust allows, listed right after Gasket, and the Key can count TWELVE ("DOES AS HE'S TOLD."). He's never the one who speaks for the crew, nor the one who fights what the hero became. At the Lift Down he stays with the lift: "THE SEAL WON'T TAKE ME. I'LL HOLD THE LIFT." "NOBODY'S TOLD ME TO STOP."
- **Tests.** `browser-check.js` plays Hasp's ask, the tally, the chair, a fall in the fight, the whole fit, both choices, both homecomings, the count (32 with Sorrel not home) and the cards. In `playthrough.js` the Homecoming route walks him home dry and the Dominion route gives him his dose.

**2. Wick's remedy (Bloom; the Warrens, the Cold Store, the Settling Pools, the Reactor Throat).** Wick was the healer, and on her doorstep, after she dies, is her notebook: she was working on a way to draw the dose out of the taken, so they'd stop dreaming pink. Cody, Nov 4, on this sketch and the others: "Looks good." Built in 0.3.18 (`js/story/remedy.js`):
- **The notebook** (log `wickNotebook`, on Wick's platform in the Warrens, col 57, from the hero's return from the Gardens): "THE DOSE ISN'T POISON. IT'S A SEED. IT WANTS WARM AND WET AND DARK, AND IT HATES THREE THINGS." "LICHEN OFF ICE THAT NEVER THAWS. SILT FROM THE BOTTOM OF STANDING WATER. ASH FROM A FURNACE MOUTH." "BOUND TOGETHER, ONE DOSE: ENOUGH TO DRAW IT OUT OF ONE OF US. OR CUT INTO THE WATER, ENOUGH THAT THE TAKEN STOP DREAMING PINK." "MY LEGS WON'T TAKE ME THAT FAR ANY MORE. SOMEONE'S WILL." The hero: "WICK WAS MAKING A CURE. SHE NEVER GOT TO FINISH IT." It doesn't take the lead; the toast and the journal say what to look for, in Wick's words, not the places'.
- **The three things**, only once the notebook's been read, each drawn where it is and picked up with Up:
  - **Lichen** up the wall under the Cold Store's ice, by Odell (col 3). This is the one change from the sketch, which had the Seed Vault: the Vault's hatch needs the grapple, so it isn't on the main path, and the Cold Store's ice is.
  - **Silt** at the bottom of the Settling Pools' deep sump, beside Sorrel's hatch (col 32): the Pressure Boots take the hero down to it.
  - **Ash** by the Reactor Throat's furnace mouth (col 23), once Abel is down; it appears in the same room as soon as he is.
  - Each says how many of three the hero has; the third says "NOW A BENCH TO BIND THEM ON."
- **The bench.** At either bench (the Warrens', or Solder's at the Crew Camp) with all three in hand, the bench makes the remedy first. Solder binds it if he's there ("THAT'S WICK'S HAND. I'D KNOW IT ANYWHERE."); otherwise the hero does, from her notes. Pods carry the hero home from the Spine until the Tower Lift, so the Warrens' bench is always in reach. The sketch's Tamp isn't needed: the hero can manage alone.
- **The choice (Wick's remedy).** Prompt: "WICK'S REMEDY. ONE DOSE."
  - **CUT IT INTO THE WATER.** Confirm: gain "ELEVEN WHO STOP DREAMING PINK" (SEVEN if the Pruner's core was taken), lose "THE ONLY CURE THERE IS". Mercy +1. Solder sends it down the lifts to Tamp for the barrel by the gate. The woken at home stop dreaming of the field: "I SLEPT LAST NIGHT, AND THERE WAS NO FIELD. JUST DARK. IT WAS WONDERFUL." "THE WATER TASTES OF ASH. I DON'T CARE." "WICK DID THIS? EVEN NOW?"
  - **TAKE IT YOURSELF.** Confirm: gain "THE BLOOM IN YOU, PUSHED BACK" (or "NOTHING. THERE'S NO BLOOM IN YOU" at 0, or "NOTHING. THE BLOOM HAS YOU" at 8), lose "THE WOKEN KEEP DREAMING". Bloom −2, never below 0, and nothing once Overgrown is locked in (`HA.bloom.ease`). The stages it falls back below are forgotten, so the hero looks as they are now, and the world says so again if the Bloom comes back. Below 3, the seal at Lift B reads the hero clean again: the remedy is the one way back to the true ending, and the confirm screen doesn't say so.
- **Epilogue cards:**

| | Into the water | Taken by the hero |
|---|---|---|
| Homecoming | "THE WOKEN SLEPT ON THE NEW GROUND, AND DREAMED OF IT." | "I NEVER TOLD ANYONE WHERE WICK'S REMEDY WENT." |
| Crash | "THE WOKEN SLEPT IN THE SLEDS ON THE WAY DOWN. NONE OF THEM DREAMED PINK." | "THE WOKEN STILL DREAM OF THE FIELD. I KEPT WICK'S CURE FOR MYSELF." |
| Dominion | "THE WARRENS' WATER STILL TASTES OF ASH. NOBODY DOWN THERE DREAMS PINK." | "WICK'S REMEDY WENT INTO ME. IT WASN'T ENOUGH TO STOP ME." |
| Overgrown | "WICK'S REMEDY KEPT THE WOKEN CLEAR FOR A YEAR. THEN THE PINK CAME BACK FOR THEM TOO." | "WICK'S REMEDY WASN'T ENOUGH." |

- **Tests.** `browser-check.js` reads the notebook, picks up all three, takes the remedy at the Warrens' bench alone (Bloom 4 to 2, stage 0), cuts it into the water at the camp with Solder (Mercy +1, the woken's new lines), checks Bloom 8, and every card. In `playthrough.js` the Homecoming route cuts it into the water and the Dominion route takes it.

**3. Pod 1130 (Mercy; the Cryo Deck's Pod Stacks, from Abel on).** The sketch: once the reactor's been stoked for the climb, the power in the Pod Stacks shifts, and one pod's alarm starts: 1130, a colonist the Navigator never woke, failing. The hero knows what waking late is. Thaw him, or let it fail and take the pod's cell. Built in 0.3.19 (`js/story/pod1130.js`, after `remedy.js` in `index.html`):
- **The page.** Right after choice 10, either way, the ship's power goes elsewhere (spared, Abel's fires feed the crew's lifts; ended, the ship runs on what's left), and the ship pages ship-wide, in pale cyan as THE SHIP: "POWER REROUTED. CRYO DECK, POD STACKS: POD 1130 ON ITS RESERVE CELL." "RESERVE CELL FAILING. ATTENDANT TO THE STACKS." The hero: "AN ATTENDANT. THERE HASN'T BEEN ONE IN THREE HUNDRED YEARS." "POD 1130. SOMEBODY STILL ASLEEP DOWN THERE, THE WAY I WAS." The toast names the place, and the journal says the rest pods can take the hero back down; the lead doesn't change. A game quit before the page was heard hears it on the way up to the camp. (`flags.pod1130Alarm`.)
- **The pod.** It stands on the ledge just inside the Pod Stacks, by the door from the Thaw Corridor, pulled out of the stack with its own cable to the wall: there from the first minute of the game, asleep, its light blue. Paged, its light blinks red, the glass flushes red with it, frost lifts off it, and the alarm sounds while the hero is in the room. The first time in, the hero sees it: "THERE. BY THE DOOR, BLINKING RED: POD 1130." Up reads it: "MARSH, HUGO. AGRONOMIST. FIRST FIELDS CREW." "RESERVE CELL: FAILING. THAW: MANUAL. AUTHORITY: ANY." (the hero's own pod said AUTHORITY: NAV). The hero: "HE LOOKS ASLEEP. I MUST HAVE LOOKED LIKE THAT, IN 0417." "THE CELL CAN'T KEEP HIM FROZEN MUCH LONGER. IN A SUIT, IT WOULD RUN FOR YEARS." "THAWING HIM WOULD TAKE WHAT'S LEFT IN IT."
- **The choice (Pod 1130's).** Prompt: "POD 1130. THE RESERVE CELL IS FAILING."
  - **THAW HIM.** Confirm: gain "HUGO MARSH, AWAKE · 232 YEARS LATE", lose "THE POD'S CELL". Mercy +1. The pod hisses open and he comes out on his knees: "...COLD. SO COLD." "IS THIS IT? IS THIS THE NEW WORLD?" "NOT YET. YOU'RE STILL ON THE SHIP." "HOW LATE?" "TWO HUNDRED AND THIRTY-TWO YEARS. I WOKE TO IT TOO." "I WAS MEANT TO PLANT THE FIRST FIELDS." "...THERE AREN'T ANY, ARE THERE." The hero sends him down to the Warrens, past the Coolant Hall ("THEY TOOK ME IN. THEY'LL TAKE YOU.", or, called COUNTER, "THEY DON'T THINK MUCH OF ME. THEY'LL TAKE YOU IN."), and he goes: "HE TOOK THE STACKS ONE LEDGE AT A TIME. AT THE BOTTOM, HE WAVED." `people.pod1130 = 'thawed'`. From then until the run for the sleds he sits by the Warrens' fire (col 45), unless the gate fell and the walls haven't come out: "THEY CALL ME THE OTHER SLEEPER." "THEY GROW MUSHROOMS DOWN HERE. GIVE ME SOIL AND A SKY, AND I'LL GROW THEM BEANS."
  - **TAKE THE CELL.** Confirm: gain "A SUIT CELL · MAX HEALTH +4", lose "HUGO MARSH". Mercy −1. Max health +4, like any Suit Cell. "THE CELL CAME OUT WARM. THE LIGHT ON POD 1130 WENT FROM RED TO NOTHING." "HE NEVER WOKE. HE'LL NEVER KNOW HOW LATE IT GOT." `people.pod1130 = 'cell'`; the pod stays dark, frosted over.
  - **Never answered.** The pods carry the hero only until the Tower Lift; ridden with the alarm still going, the cell runs out on its own, and the pod is dark from then on.
- **The count.** Settled any way, 1130 is out of the stacks, so the sleepers who reach the new world are one fewer; thawed, Hugo comes down with the Hullfolk (in Homecoming, and on the sleds in Crash, where he's one of the survivors counted), so they're whole again. Pods not launched in Crash, he's the one sleeper who made it.
- **Epilogue cards:**

| | Thawed | Cell taken | Never answered |
|---|---|---|---|
| Homecoming | "HUGO MARSH PLANTED THE FIRST FIELD." "232 YEARS LATE, HE SAID, AND RIGHT ON TIME." | "POD 1130 STAYED DARK WHEN THE OTHERS OPENED." "I STILL HAVE ITS CELL." | "POD 1130 DIDN'T OPEN WITH THE OTHERS." "ITS ALARM HAD STOPPED WHILE I WAS CLIMBING." |
| Crash | "HUGO MARSH RODE THE SLEDS DOWN WITH THE HULLFOLK." "THEY STILL CALL HIM THE OTHER SLEEPER." | "POD 1130 WAS DARK LONG BEFORE THE SHIP CAME DOWN." "ITS CELL CAME DOWN WITH ME." | "POD 1130'S ALARM STOPPED WHILE I WAS CLIMBING." "NOBODY ELSE HEARD IT." |
| Dominion | "HUGO MARSH GROWS BEANS UNDER THE WARRENS' LAMPS." "HE NEVER ASKS ME WHEN WE'LL LAND." | "POD 1130'S CELL KEPT ME ON MY FEET." "IT WAS NEVER MINE TO TAKE." | "POD 1130'S ALARM STOPPED ON ITS OWN." "I WAS BUSY WITH THE KEY." |
| Overgrown | "HUGO MARSH WOKE 232 YEARS LATE," "IN TIME FOR THE PINK." | "POD 1130'S CELL KEPT ME GOING A LITTLE LONGER." "IT DIDN'T MATTER." | "POD 1130'S ALARM STOPPED ON ITS OWN." |

- **What changed from the sketch.** The sketch's "once the reactor's been stoked for the climb" is built as the moment Abel's fires change, which is the reactor changing for the climb, and a moment the player sees happen. The sketch didn't say what happens if the hero never goes; built, the cell runs out at the Tower Lift, and every ending says so.
- **Tests.** `browser-check.js` hears the page after choice 10 (in the Spine's own run) and again from a save quit before it, finds the pod on the ledge, thaws Hugo (Mercy +1, the Warrens' fire, his counts), takes the cell from another save (max health +4, Mercy −1), lets it run out, and checks every card. In `playthrough.js` the Homecoming route travels down from the camp and thaws him, the Dominion route takes the cell, and the Crash route never goes.

**4. The new stoker (Mercy; the Spine's Reactor Throat).** After Abel, the furnace still needs a stoker, and the Steward's people have taken one from the walls: a Hullfolk man chained at the fires, with a Bloomsworn foreman over him (the second optional fight, the Fireman: a heat fight around the furnace mouth). Freed, he'd go home, but nobody stokes, and the Spine's lifts run slow for the climb (the crew's lifts take longer to build; on the run for the sleds, the Spine is darker). The choice: **free him** (Mercy +1; the climb costs time) or **leave him stoking** (Mercy −1; the lifts run).

**5. The last watchman (Mercy; the Labyrinth's Watch Gallery, revisited).** Watch 4's standing orders say the gate to the drain stays shut. One sentry still keeps them: a woken colonist with no Bloom in her, thin, who has held that gate for thirty years because nobody came to relieve her, shooting rats and counting the rest. The choice: **relieve her** (tell her the Steward never meant to; she comes down to the Warrens; Mercy +1), or **leave her the gate** (she holds it; on the run for the sleds, the drain is held for the village, and the run is shorter; Mercy 0).

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
