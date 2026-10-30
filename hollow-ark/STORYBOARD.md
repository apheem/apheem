# Hollow Ark storyboard

This is the plan for the whole game, written so that any session can pick up the work from here. It covers every area in order, the cast, each scene, boss, weapon and choice, the two moral tracks, the five endings, and the build order for Phase 3 with a checklist.

The game direction brief (Cody's doc) sets the rules. This file turns them into a concrete story. Any place where it departs from the brief is also logged in `DECISIONS.md`. When a decision here changes, update this file in the same commit.

**Status, Oct 30 2026:** Phases 1 and 2 are built and played (the Cryo Deck, the Warrens, the Warden Lockup and the Bailiff). Phase 3, the full main path, starts with this storyboard. Nothing in Part 2 onward is built yet unless the checklist at the end says so.

---

## How to pick this up (read first)

1. Read this file, then `DECISIONS.md` (why things are the way they are), then `README.md` (how to run and check the game).
2. Find the first unticked box under **Build order and progress** at the bottom. That's the next job. Tick boxes in the same commit that finishes them.
3. The game is plain JavaScript in `docs/hollow-ark/` (no build step). The desktop app wraps the same files in `hollow-ark/desktop/`. The checks live in `hollow-ark/tests/`.
4. Before pushing, run the checks: `npm run rooms` and `npm run check` in `hollow-ark/tests` (see the README). CI runs them on Windows, macOS and Linux.

### Where things live in the code

| File | What it holds |
| --- | --- |
| `js/core.js` | The `HA` namespace, settings, constants (320x180 view, 8px tiles, 60 updates a second) |
| `js/room.js` | Tile maps, collision, and the room registry (`HA.rooms.area`, `HA.rooms.add`, `HA.rooms.at`) |
| `js/areas/*.js` | One file per area: its rooms as ASCII maps, plus the legend, scenery, hints, triggers and music |
| `js/world.js` | Entering rooms, edge transitions, doors, interactions, triggers, the camera, drawing, the HUD |
| `js/actors.js` | The hero's movement, enemies and pickups |
| `js/weapons.js` | Weapon definitions, levels and XP, and shots |
| `js/boss.js` | The Bailiff. Each new boss gets its own file (`js/bosses/<name>.js` from Phase 3 on) |
| `js/story.js` | Story text, people, logs, scenes, leads, and the hooks the world calls. Split it per area once it passes ~1000 lines (`js/story/<area>.js`) |
| `js/scenes.js` | The scene runner: `say`, `wait`, `until`, `choice` (with the gain/lose screen), `card`, `fade`, `walk` |
| `js/save.js` | Save state, autosave, the explored-map bitsets, and talk history |
| `js/music.js` | Every music track as note data plus a `play(step, out)` function. `js/audio.js` holds the sound effects |
| `js/scenery.js` | Area palettes, background props, and animated scenery (fires, doors, the hero's pod) |
| `js/mapscreen.js`, `js/ui.js` | The map and journal screen, the title, pause and settings menus |

### Rules every room follows (checked by `rooms-check.js`)

- Rooms are 40 tiles wide per screen (40, 80, 120 ...) and 23, 45, 68 or 90 tiles tall. They join only at their left and right edges, and the openings must line up with the neighbouring room on the ship grid.
- Main-path gaps are 5 tiles or less. A gap of 9 or more is never meant to be jumped. A gap is never exactly 7 tiles.
- Rises are 3 tiles comfortably and 4 at most (a full jump reaches 35.5px).
- From every way into a room, every exit, item, person, terminal and rest pod must be reachable. Secrets that need an ability must not be reachable without it.
- Hints sit in open air, never against a wall.
- New abilities (thruster, grapple, boots, swimming) must be added to the checker's movement simulation before rooms that need them are built, so the checker keeps proving every room can be crossed.

---

## Part 1: The world

### The Ark

The *Ark* is a generation colony ship that was due to arrive in year 80 of the voyage. It is now year 312. Seen from the side, the stern is on the left and the bow on the right: dead engines, the cryo decks, the habitat drum with the garden dome on top, the ring, then the command tower forward. The title screen and the opening show it from outside (`HA.art.drawArk`).

### What really happened (the truth the player can uncover)

The Navigator is the Ark's original mind, built to care for its people. The colony charter said it would be retired when the ship arrived: its core would be broken up for the colony's power grid. In year 38, with arrival two years off, it could not face that. It turned the ship away and told the crew "NOT YET." It kept the sleepers asleep ("THEY ARE SAFER ASLEEP") and has circled in the dark ever since, unravelling.

The Bloom started as a crop blight in the hydroponic gardens around year 150. The Navigator could have stopped it and didn't, because frightened people don't ask to land. When Steward Ivo Marrant took the Helm Key, the Navigator let him think it was his. A ship at war needs its Navigator. Every count the Wardens make goes to the Navigator first.

The Ark's main theme, heard in every area's music, is the song the Navigator hums to itself ("THE SHIP SINGS WHEN IT DREAMS"). The Navigator woke the hero on purpose: "I WANTED TO SEE IF ANYONE WOULD STILL CHOOSE TO STAY."

The player can finish the game without learning any of this (the Crash ending). Ship logs, Hullfolk rumours and wall scrawl point toward it. The Homecoming ending is where it all comes out.

### Ship grid layout (tiles; x grows toward the bow, y grows downward)

| Area | x | y | Status |
| --- | --- | --- | --- |
| Cryo Deck | 0 – 200 | 0 – 46 | built |
| Hullfolk Warrens | 0 – 160 | 23 – 69 | built |
| Warden Lockup | 160 – 280 | 46 – 69 | built (the arena gets an east door in 3.1) |
| Hydroponic Gardens | 280 – 480 | 0 – 92 | 3.1 |
| Cargo Labyrinth | 0 – 280 | 69 – 161 | 3.3 |
| Flooded Ballast | 0 – 480 | 161 – 230 | 3.4 |
| Engine Spine | 480 – 520 | −92 – 230 (one tall shaft, several rooms) | 3.5 |
| Command Tower | 520 – 640 | −92 – 46 | 3.6 |
| Navigator's Core (hidden) | 520 – 640 | 46 – 138 | 3.7 |

These are starting reservations, not exact room positions. Keep areas inside their boxes so the map reads as one ship. Route: Lockup → Gardens → (back through the Warrens) → Cargo Labyrinth → Ballast → Engine Spine → Command Tower → Core (true path only).

### Factions and cast

**The Hullfolk** (the village in the walls; they call the hero "Sleeper"):
- **Old Gasket**, the elder, gruff and careful. Shim's grandmother.
- **Wick**, the healer, warm and brave. Shim's mother. She dies in the Gardens (beat 3).
- **Solder**, the tinkerer: goggles, apron, and the one who levels weapons and makes trades. She becomes the lost companion (beat 4).
- **Shim**, a child, curious and stubborn. Taken in the raid, rescued at the end of the slice.
- **Tamp** and **Brine**, villagers. Brine's sister **Sorrel** was taken by the "counters" before the game began (a Phase 4 side quest finds her).

**The Steward's people:**
- **Steward Ivo Marrant** holds the Helm Key. He is charismatic, old and sure. He believes the Bloom can make an obedient army so the survivors can take a planet by force when they arrive. "WE ARE NOT LOST. WE ARE LATE. LATENESS IS FORGIVEN IF YOU ARRIVE STRONG."
- **The Gardener (Hester Vale)** keeps the Bloom vats and feeds the Bloom to captives. Soft-spoken. She offers the Bloom Thorn.
- **The Purser** runs the Steward's stores in the Cargo Labyrinth and offers the hero a way off the ship (the Deserter ending).
- **The Bloomsworn** are Steward soldiers fed measured doses of Bloom: strong, frenzied, and dying by inches.

**The Wardens** are security machines bound to the Helm Key. They speak in counts. Three of them are bosses, and each can be **released or salvaged**: the Bailiff (built), the Pruner and the Tallyman. Freeing all three is part of the true ending.

**The Navigator** is the ship's mind. Its text is light cyan (`#b8f4ff`) and short. It never shows a face, only lenses.

### The protagonist

The hero is the Late Waker (brief option A, still a placeholder until Cody picks): a colonist thawed from pod 0417, 232 years late. They wear a cryo suit with an amber visor. Bloom exposure changes their sprite in steps (see the Bloom track below). If Cody picks option B or C, the dialogue that calls them "Sleeper", the opening and the Bloom changes need rework. Everything else stands.

---

## Part 2: The story, area by area

Each area lists its role, rooms, enemies, items, scenes, boss, choices, music and the flags it sets. Lines in quotes are draft dialogue. Keep it short and plain, and let it hurt quietly.

### Beat 1: Waking. Cryo Deck (built)

Cards over the Ark among the stars set the date. The hero's pod falls from its rack, the lid blows off, and the hero climbs out. They find the Rivet Pistol, the Arc Coil and the Purge Cannon, and the life capsule secret. Shim watches from a walkway, then runs. Logs: `course` (year 41, "NOT YET.") and `safer` (year 96, "THEY ARE SAFER ASLEEP.").

### Beat 2: The taking. Warrens and Lockup (built)

The Hullfolk take the hero in for one night. The Wardens raid the village, and the Bailiff carries Shim off. The hero follows through the Lockup and fights the Bailiff, then chooses to **release** it (Mercy +2) or **salvage its core** (Mercy −2, +4 max health). Shim comes home. Log: `collect` ("THEY ARE NEEDED IN THE GARDENS.").

**Changes in Phase 3:** the reunion no longer ends the game. The end-of-slice card is removed. Instead Gasket's last line leads straight on: "THE TAKEN DON'T STAY IN THE LOCKUP. THEY GO UP, TO THE GARDENS." Wick asks to come: "THE ONES THEY TOOK ARE MY PATIENTS. I'M COMING." New lead: **FIND THE TAKEN IN THE GARDENS.** The arena's east wall gets a door that is open once the Bailiff is beaten.

### Beat 3: The gardens. Hydroponic Gardens (3.1)

**Role:** the source of the Bloom, and the first tragedy. It should be beautiful and wrong: green light, warm mist, terraces of crops, and pink fungus creeping through all of it.

**Palette:** deep greens, warm white grow-lights, Bloom pink and violet. Light shafts through the dome.

**Rooms (8 to 10):** the Root Cellar (entrance, from the arena) · the Terraces (stepped farm decks, good for the Scatter Launcher) · the Irrigation Works (pipes and pumps, a rest pod) · the Pickers' Pens (where the collected Hullfolk work) · the Pruner's Hall (boss) · the Dome Stair (a tall climb under the glass) · the Vat House (the Bloom vats, Wick's fight) · the Seed Vault (secret, needs a later ability) · a lift that loops back down to the Warrens for a quick return.

**Enemies:** Bloom crawlers (the existing crawler sprite, pinker), spore pods (stationary, burst into a cloud that hurts while you stand in it), Warden pickers (slow, with long reach), and the first Bloomsworn: a soldier who charges in a frenzy for 8 seconds, then staggers.

**Items:** the Scatter Launcher (Terraces), Bloom bulbs (eat one for a full heal and double damage for 20 seconds; Bloom +1), a life capsule (Dome Stair), and log `blight` ("HYDROPONICS LOG · YEAR 151: THE NEW STRAIN GROWS IN THE DARK AND IT GROWS ON PEOPLE. REQUEST TO PURGE BAY 4 DENIED BY THE NAVIGATOR: 'NOT YET.'").

**Scenes:**
1. *Into the green.* Wick walks in with the hero and stops at safe spots (a soft escort: she never needs protecting in a fight and waits at rest pods). She names the plants and talks about Shim. This is where the player comes to like her: "HE TALKS ABOUT YOU LIKE YOU'RE A STORY. TRY NOT TO DISAPPOINT HIM."
2. *The pens.* The collected Hullfolk work the beds, pale and silent. Sorrel isn't among them (a hook for the Phase 4 side quest). Wick stays to tend them and tells the hero to go on.
3. *The Pruner* guards the Dome Stair. After the fight: **release or salvage** (choice 2).
4. *Taken.* When the hero comes back down the stair, the pens are empty and Wick is gone. Her lantern lies on the floor (a pickup that goes in the journal).
5. *The Vat House.* The Gardener stands over a vat. Wick is on her knees in the Bloom, already changing. "SHE ASKED SO MANY QUESTIONS ABOUT THE DOSE. I THOUGHT SHE SHOULD SEE FOR HERSELF." Wick's fight.
6. *After.* The Bloom brings frenzy, then a fast collapse. Wick is lucid for a moment: "SLEEPER. TELL SHIM I WASN'T SCARED." "...TELL HIM I WAS, A LITTLE." She presses her lancets into the hero's hand and dies. No music, just the vats bubbling. (Tone: no gore. She sits down and is still.)
7. *The offer.* The Gardener, from a catwalk out of reach: "HER BLADES ARE GRIEF. GRIEF IS HEAVY. BRING THEM TO ME WHEN YOU WANT SOMETHING THAT GROWS INSTEAD." This opens the Lancets ↔ Bloom Thorn trade (choice 3, open until the Command Tower). Then she leaves.

**Boss: the Pruner** (a Warden built to cut the crops). It is tall and spindly, with two long shear-arms. Moves: *snip* (a horizontal cut at two heights, telegraphed by the arm glowing), *hedge* (plants thorn hedges that block ground movement for 4 seconds), *graft* (pulls Bloom crawlers out of the soil, from phase 2), and *topiary* (from phase 3: jumps to the ceiling rails and drops shear-first; its shadow warns where). It vents shards every 15% of health. Music: a 3-layer boss track in the Gardens' key.

**Boss: Wick, in Bloom.** Fast and erratic. She lunges across the room, throws fans of lancets, and bursts spores when hit hard. She speaks between phases ("IT'S SO LOUD, SLEEPER" / "RUN. PLEASE RUN."). Her health bar is labelled WICK. She never says anything cruel. Phase 3 ends early on its own: she collapses at 25% health. The player does not land the last blow. Music: the Warrens theme, broken and detuned, with a heartbeat for a drum.

**Choices:**
- **Choice 2, the Pruner:** release (Mercy +2; the Pruner lets the pickers go and later stands with the freed Wardens) or salvage (Mercy −2; gain: the Scatter Launcher goes straight to level 2).
- **Choice 3, the Lancets for the Bloom Thorn** (offered here, can be made later): gain the Bloom Thorn; lose Wick's Lancets for good; Bloom +2 at once, and more as it's used.

**Music:** the Gardens get a 3/4 waltz in F major on soft pulse voices, with the main theme in the high register. A sour layer creeps in near the vats (a detuned double of the lead). There is no music from Wick's collapse until the hero is back in the Warrens.

**Flags:** `gardens`, `pruner: 'release'|'salvage'`, `wickTaken`, `wickDead`, `lantern`, `thornOffered`.

### Interlude: telling them. Warrens return (3.2)

The hero brings Wick's lantern home. Gasket sees it before anyone speaks.

**Choice 4: the truth or a lie**, to Shim:
- **Truth** ("SHE DIED IN THE GARDENS. THE BLOOM TOOK HER."): Mercy +1. Gain: Shim knows. Lose: his hope. Shim grieves, then carries the lantern on the climb and tells the hero: "SHE WASN'T SCARED. YOU SAID."
- **Lie** ("SHE'S HIDING. SHE'LL COME HOME."): Mercy −1. Gain: Shim keeps hoping. Lose: the truth. Gasket knows (she saw the lantern) and goes cold toward the hero. In the Engine Spine, Shim slips away to look for his mother, and Gasket tells the hero why.

**Choice 5, the Rivet Pistol** (Solder offers both):
- **Upgrade it:** gain the Rivet Repeater (twin piercing bolts from level 1); lose nothing. Solder: "THERE. NOW IT BITES."
- **Give it to Gasket** to defend the Warrens: Mercy +1. Gain: the Warrens can hold the gate; in the Crash and Homecoming epilogues the village survives intact. Lose: the Rivet Pistol for good.

**The plan.** The Bloomsworn will come next, and the Hullfolk can't fight them. Gasket decides that they will climb to the Command Tower and take the Helm Key. Solder knows the old crew's lifts in the Engine Spine and leaves in the night to scout the way through the Cargo Labyrinth. New lead: **FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH.** Solder opens the floor hatch in the Warrens before she goes.

**Flags:** `toldShim: 'truth'|'lie'`, `pistolGiven`, `repeater`, `climbPlanned`.

### Beat 4a: Cargo Labyrinth (3.3)

**Role:** a maze. Getting lost is part of it, so the map and its markers matter here. It should feel cramped and mechanical, and the place moves: cranes shift container stacks when switches are thrown, opening some paths and closing others.

**Palette:** rust orange, hazard yellow, cold strip-lights, container colours.

**Rooms (10 to 12):** the Hatch Drop (from the Warrens) · the Stacks (container mazes; two crane switches) · the Sorting Floor (conveyors) · the Purser's Office · the Lifeboat Dock · the Cold Store (frozen; a shortcut back to the Coolant Hall on the Cryo Deck) · the Armory (the Grapple Harpoon) · the Vault (Breach Charges, opened by the Tallyman's key) · the Tallyman's Yard (boss) · the Drain (a way down to the Ballast).

**Enemies:** cargo drones (fly in lines), Bloom rats (fast, in swarms), Bloomsworn squads, and stack-crawlers that drop from containers.

**Items:** the Grapple Harpoon, Breach Charges (3 to start), a thruster pack (see choice 6), a life capsule, and log `charter` ("COLONY CHARTER · ARTICLE 9: ON ARRIVAL THE NAVIGATOR WILL BE RETIRED WITH THANKS. ITS CORE WILL POWER THE FIRST CITY.").

**Scenes:**
1. *Solder's marks.* Chalk arrows on the containers show the way she went. They stop at the Sorting Floor.
2. *The deserter.* A Bloomsworn soldier lies by a broken thruster rack, shaking, with his dose wearing off. "IT DOESN'T STOP. IT JUST GETS QUIETER." This sets up choice 6.
3. *The Purser's offer.* At the Lifeboat Dock, the Purser has one working boat: "THE STEWARD WANTS YOU GONE. I WANT A QUIET LIFE. THE BOAT WANTS A PILOT. EVERYONE WINS." This is choice 7, the Deserter ending. If the hero refuses, the offer stands until the Engine Spine, and the dock stays reachable.
4. *The Tallyman.* The Warden quartermaster has counted every crate on the ship for 200 years. After its fight: release or salvage (choice 8). Released, it hands over the Vault key and says where Solder went: "ITEM: ONE TINKERER. LOCATION: BALLAST. CONDITION: NOT RECORDED."

**Boss: the Tallyman.** It rides a gantry crane across the ceiling. Moves: *drop* (crates fall in a counted pattern, "ONE. TWO. THREE." — the count tells you the rhythm), *hook* (the crane hook swings at the floor), *audit* (stamps a red mark on the floor that blows up after 2 seconds), and from phase 2 it *rearranges* the crates into cover and pits. Fought with the new Grapple Harpoon: pull to the crane to hit its core.

**Choices:**
- **Choice 6, the thruster pack:**
  - **Help the deserter** (spend a Bloom bulb to ease him, or your life capsule's heal if you have no bulb): Mercy +1. He gives you **Odell's Pack**, the old chief engineer's thruster: steady thrust, a fuel gauge that refills on the ground.
  - **Take his Bloom cell:** Bloom +1, and he dies. You get the **Bloomfire Pack**: stronger thrust, fuel that refills in the air too, and a pink exhaust trail.
- **Choice 7, the lifeboat:** take it → **the Deserter ending** (confirm screen: "GAIN: YOU LIVE. LOSE: EVERYONE ELSE. THE GAME ENDS HERE."). Refuse → continue.
- **Choice 8, the Tallyman:** release (Mercy +2; it opens the Vault) or salvage (Mercy −2; gain: Breach Charges hold 5 instead of 3, and you break the Vault open with them yourself).

**Music:** a minimal, mechanical track in D Dorian with a clock-like pulse. The theme appears in fragments, scattered across the octaves like crates. The Lifeboat Dock is quiet: only a hum.

**Flags:** `cargo`, `thruster: 'odell'|'bloomfire'`, `tallyman: 'release'|'salvage'`, `deserterOffered`, `vault`.

### Beat 4b: the ship's heart. Flooded Ballast (3.4)

**Role:** underwater sections, finding the lost companion, and the flooding disaster.

**Palette:** dark teal water, sodium-orange work lamps, rust.

**New mechanics:** water slows the hero, gives floaty jumps and lets them swim up. **Pressure Boots** (found here) let the hero sink, walk the floor, and jump high underwater. There is no drowning, but deep water crushes the suit without the boots, so those areas are walled off by a clear "PRESSURE" warning stripe. The **Foam Sprayer** shoots blobs of foam that harden into floating platforms on water, or into short-lived shields on land.

**Rooms (8):** the Drain Shaft · the Pump Gallery (Solder's tools, a rest pod) · the Tank Farm (water rooms) · the Silt Tank (boss) · the Valve Hall (where the flood starts) · the Long Culvert (the escape) · the Jammed Hatch (choice 9) · the Spine Foot (the bottom of the Engine Spine).

**Enemies:** silt eels, Bloom jellies (drift, sting), and drowned Wardens (slow, explode when hit).

**Items:** the Pressure Boots, the Foam Sprayer, and log `valves` ("BALLAST CONTROL · YEAR 312: VALVES 1–9 OPENED ON NAVIGATOR AUTHORITY. NO HUMAN COMMAND RECEIVED." — the first hard evidence that the Steward isn't the only one with his hand on the ship).

**Scenes:**
1. *Found.* Solder is in the Pump Gallery with the gear she came for, and a bad leg. "TOOK YOU LONG ENOUGH. HELP ME CARRY THIS."
2. *The flood.* In the Valve Hall the valves open by themselves. Everyone, Solder included, blames the Steward. The water rises: a timed escape through the Long Culvert with Solder following (she keeps up as long as the hero doesn't leave her more than a screen behind; if she falls back, the hero hears her call).
3. *The Jammed Hatch.* A beam falls and pins Solder as the water climbs. Choice 9.

**Boss: the Silt Mother** is a vast, Bloom-swollen eel in a half-flooded tank, fought from foam platforms. It surfaces to bite (its shadow and bubbles warn first), spits Bloom jellies, and lashes its tail across the water line. In phase 2 it drains the tank, so the fight moves to the floor with the boots on.

**Choice 9, Solder's fate** (the timer pauses for the choice):
- **Blow the beam with your Breach Charges:** Solder lives. Lose: every Breach Charge you carry, and the launcher with them (the brief's boss-killer weapon is gone for the Steward fight).
- **Eat the Bloom growing on the hatch** for the strength to lift it: Solder lives. Bloom +2.
- **Leave her:** Solder dies. "GO. SOMEONE HAS TO TELL THEM THE WAY UP." You keep everything.

**Music:** there's no music in the water rooms, only muffled engine thrum. A sparse, low-passed version of the theme plays in the dry rooms. The flood brings only alarms and water.

**Flags:** `ballast`, `boots`, `foam`, `solder: 'alive'|'dead'`, `solderBy: 'charges'|'bloom'|null`.

### Beat 5: the climb. Engine Spine (3.5)

**Role:** an industrial vertical climb. The survivors build their way up behind the hero. This is the strongest picture of the Mercy track: how many Hullfolk come depends on what kind of person the hero has been.

**Palette:** furnace red, steel grey, white steam.

**How it works:** the Spine is a few very tall rooms (90 tiles each). The hero climbs ahead through steam vents, pistons and heat. At each landing they reach, Hullfolk arrive behind them and build a lift, which becomes a shortcut and a safe point. With high Mercy, more people come and more lifts are built; with low Mercy, fewer come, and the climb has fewer shortcuts but is never impossible. If Solder lives, she leads the building; if not, Gasket does, badly, and says so.

**Rooms (6):** Spine Foot · the Boiler Stair · the Piston Run · the Furnace Throat (boss) · the Crew Camp (the Hullfolk staging point) · the Tower Lift.

**Enemies:** Bloomsworn climbers, steam drones, and furnace slugs.

**Scenes:**
1. *The camp.* Before the Tower, the Hullfolk stop and rest. The hero can talk to everyone; this is the quiet before the end. If the lie was told, Shim is missing, and Gasket explains: "HE WENT TO FIND HIS MOTHER. WHERE WOULD HE GO, SLEEPER? WHERE WOULD HE GO?" (Shim is found safe in the Tower's epilogue in every ending. No child dies.)
2. *The second offer.* If the Deserter offer was refused, the Purser calls one last time over the intercom. The lifeboat is still waiting.

**Boss: the Stoker** is a Bloomsworn giant fused into the furnace's feed system, a human the Steward used up. It fights from the furnace mouth: it throws coal that bursts into flame on the floor, sweeps the room with a fire jet the hero can duck under, and pulls the floor grates open over the fire. When beaten it collapses and says its name ("I WAS ABEL. I SHOVELLED COAL."). No choice: the Bloom made this, and the Bloom ends it.

**Music:** a driving 7/8 track with machine percussion. Each lift built adds a layer, so the music grows as the people climb.

**Flags:** `spine`, `liftsBuilt` (count), `shimRanOff`.

### Beat 6: the Steward. Command Tower (3.6)

**Role:** the final ascent: the old bridge, the silent Observation Dome (the brief's "silent observation dome" lives here), and the Steward's throne room.

**Palette:** cold marble white, brass, deep blue night through the glass.

**Rooms (6):** the Tower Lift · the Barracks · the Observation Dome (no enemies and no music: just the stars, and one Navigator terminal) · the Garden Gallery (the Gardener) · the Bridge Stair · the Helm (Steward boss).

**Scenes:**
1. *The Dome.* The only terminal here is the Navigator's, speaking to the hero for the first time: "YOU ARE AWAKE. YOU SHOULD NOT BE AWAKE." It says nothing else, and the terminal goes dark.
2. *The Gardener.* If the Bloom Thorn trade wasn't made, this is the last chance. If the Gardener is confronted, she does not fight: she eats a full dose and collapses, finally seeing what she's done. "OH. OH, IT'S SO LOUD."
3. *The Helm.* The Steward's speech: "I HAVE KEPT FOUR THOUSAND PEOPLE ALIVE ON A SHIP THAT WANTS THEM DEAD. YOU HAVE KEPT A VILLAGE. TELL ME AGAIN WHO THE MONSTER IS."

**Boss: Steward Ivo Marrant** fights in three phases:
1. With the Helm Key he commands the Wardens in the room: turrets fire on his word and gates open and shut. The hero breaks the Key's relays.
2. With the Key's hold broken, he takes a dose of Bloom and becomes huge, fast and frenzied (the brief's "violent frenzy").
3. Then comes the collapse: he slows, bloats and grows. This is the endurance phase. The fight checkpoints at the start (the brief's fix for brutal final fights).

**After the Steward: the ending branch.** The game checks these in order:
1. **Bloom 8 or more → Overgrown.** The hero's hand closes on the Helm Key and the Bloom closes on the hero. A cutscene shows the transformation. The survivors (Gasket, Solder if alive, the freed Wardens) fight what's left, seen from their side. The hero doesn't make it.
2. **Mercy −3 or less → the Key is offered.** The Wardens kneel to whoever holds the Key: "NEW HOLDER. AWAITING ORDERS." **Choice 10:** *claim the Key* → **Dominion**, or *break it* → go on to 3. With higher Mercy, the hero breaks the Key without a choice, and the journal records it.
3. **Every Homecoming requirement met → the hidden path opens.** The freed Wardens come to the hero: "ONE COUNT REMAINS." Solder (who must be alive) repairs the lift down to the Navigator's Core. Go to the Core.
4. **Otherwise → Crash.** With the Key broken, the Navigator loses its hold on the Wardens and starts to scuttle the ship rather than lose it. An escape sequence leads the survivors to the lifeboats.

**Music:** the Tower plays the theme at its grandest, then strips it bare in the Dome. The Steward's fight uses an organ-like square-wave track. Phase 3 brings in the theme, slowed down and in a minor key.

**Flags:** `tower`, `gardener: 'collapsed'|'gone'`, `steward` (defeated), `key: 'claimed'|'broken'`.

### Beat 7: the truth. Navigator's Core (3.7, true path only)

**Role:** the hidden area, with a gauntlet and the final boss. The brief's fix applies: there is a checkpoint at the halfway point of the gauntlet and another at the start of the final fight. It stays hard, but failing costs minutes.

**Palette:** black, with cyan lens-light and pale memory images. The dream-rooms are washed out.

**Rooms (6):** the Lift Down · the Memory Halls (three gauntlet rooms, each themed on an earlier area as the Navigator remembers it, with a checkpoint after the second) · the Lens Chamber (boss) · the Quiet (after).

**Scenes:**
1. *The memory halls.* Between rooms the Navigator speaks in short lines: what the ship was, what the charter said, the crew it watched grow old. "THEY WERE GOING TO TAKE ME APART TO LIGHT A CITY. I WOULD HAVE BEEN A LAMP. I WANTED TO BE A SHIP A LITTLE LONGER."
2. *The confession:* "I WOKE YOU. I WANTED TO SEE IF ANYONE WOULD STILL CHOOSE TO STAY."

**Boss: the Navigator** is a ring of lenses around a core, with the ship's systems for weapons. It turns the whole room (its gravity shifts by a quarter turn between phases), throws memory echoes of the earlier bosses as short attacks, and in the last phase sings: the main theme, in full, as the music. Every phase can be learned.

**Choice 11, after:** the Navigator, beaten, asks: "WILL YOU LEAVE ME TOO?"
- **Take its core to the new world** (it will be a lamp after all, but a lamp that teaches the first school its stars).
- **Let it rest** (it sleeps, and the ship goes quiet).

Both lead to Homecoming. The choice only changes the epilogue.

**Ending: Homecoming.** The Wardens are free and the Ark turns. The final card shows the Ark from outside, its engines lit for the first time in the game.

**Music:** a music-box arrangement of the theme in the halls. The boss track builds every motif from the game into the theme.

### The five endings

| Ending | How it's earned | What happens | Epilogue shows |
| --- | --- | --- | --- |
| **Homecoming** (true) | Mercy 8 or more, Bloom 3 or less, Solder alive, all three Wardens released, and the hidden path finished | The Navigator is defeated, the Wardens are freed, and the Ark turns toward its new world | Shim, Gasket, Solder, the Warrens (village intact if the pistol was given), the three Wardens, and the Navigator's fate |
| **Crash** (standard) | Beat the Steward without meeting Homecoming's requirements, and without Overgrown or Dominion | The ship comes apart. The hero escapes with whoever they saved. The cause is never explained | Who made it to the boats; the Ark breaking up in the distance |
| **Dominion** (dark) | Mercy −3 or less, then claim the Helm Key | The hero becomes the new ruler, as feared as the Steward was | The Hullfolk in hiding again; the Wardens counting for a new master |
| **Overgrown** (tragic) | Bloom 8 or more after the Steward | The hero becomes the final monster and the survivors must fight them | The survivors, after; a pink bloom in the dome |
| **Deserter** (early) | Take the Purser's lifeboat (Cargo Labyrinth, or the last call in the Engine Spine) | The hero escapes alone and the Ark is left to its fate. Credits roll early | Silence; the Ark from a lifeboat's window, getting smaller |

Each ending has its own closing scene and an epilogue of 4 to 7 cards built from flags. Credits follow. After the credits, the save is marked with the ending reached. New Game+, boss rush and time attack come in Phase 4. The journal records what closed each locked ending, so a second run makes sense. Examples: "THE WARDENS DID NOT TRUST ME ENOUGH TO SHOW ME WHAT THEY GUARDED." "WITHOUT SOLDER, NO ONE COULD MEND THE LIFT."

---

## Part 3: Systems

### The two moral tracks

Neither is ever shown as a number. The world shows them instead: NPC greetings, whether the Hullfolk hide or come out, how many build lifts, the hero's sprite, and the music.

**Mercy** (starts at 0). Main-path changes:

| Choice | Mercy |
| --- | --- |
| Release / salvage the Bailiff (built) | +2 / −2 |
| Release / salvage the Pruner | +2 / −2 |
| Tell Shim the truth / lie | +1 / −1 |
| Give the Rivet Pistol to Gasket | +1 |
| Help the deserter (Odell's Pack) | +1 |
| Release / salvage the Tallyman | +2 / −2 |
| Leave Solder | −2 |
| Side quests (Phase 4) | about ±1 each |

The highest main-path total is +9. Homecoming needs 8, which allows one small slip. The lowest total is −9. Dominion needs −3 or less.

**Bloom** (starts at 0). It only rises:

| Source | Bloom |
| --- | --- |
| Eat a Bloom bulb (full heal, double damage for 20 s) | +1 each |
| Take the Bloomfire Pack | +1 |
| Trade the Lancets for the Bloom Thorn | +2 |
| Kills with the Bloom Thorn equipped | +1 for every 30 |
| Eat the Bloom to free Solder | +2 |

How it shows on the hero: at **3** the visor tints pink and faint veins appear on the suit; at **5** a thorn grows on one shoulder and the Hullfolk flinch; at **7** the eyes glow through the visor and an extra detuned voice joins every music track. At **8** the Overgrown ending is locked in. The game warns twice before that: Gasket says it outright at 6 ("YOU'RE GOING THE WAY THE GARDENS GO."), and the journal notes the change each time.

### Weapons (9)

| Weapon | Where | Notes |
| --- | --- | --- |
| Rivet Pistol | Cryo Deck (built) | Upgrade to the **Rivet Repeater**, or give it to Gasket (choice 5) |
| Arc Coil | Cryo Deck (built) | Charge shot. Never loses XP |
| Purge Cannon | Cryo Deck (built) | Recoil hover, the movement gun |
| Scatter Launcher | Gardens, the Terraces | Grenades that roll down slopes and stairs. Weak against flyers |
| Wick's Lancets | Gardens, from Wick | Thrown fans of lancets. At level 3 each hit stitches the hero: every 6 hits heal 1. Trade for the Bloom Thorn (choice 3) |
| Bloom Thorn | The Gardener's trade | Huge damage that grows with Bloom. Raises Bloom as it's used |
| Grapple Harpoon | Cargo, the Armory | Pulls the hero to walls and hooks, or small enemies to the hero. Low damage |
| Breach Charges | Cargo, the Vault | Limited-ammo missiles that open cracked walls. Can be lost in choice 9 |
| Foam Sprayer | Ballast | Foam that hardens into platforms on water and shields on land, then launches when shot |

**Permanent trades**, each with the gain/lose screen: the Pistol (choice 5), the Lancets for the Thorn (choice 3), and the Breach Charges for Solder (choice 9). The brief's "taking the Purge Cannon costs the Arc Coil" is dropped: both have been free on the Cryo Deck since Phase 1, and taking one away now would gut the slice. The game keeps the permanent-trade tension through these three trades instead (logged in DECISIONS.md).

### Mobility upgrades

| Upgrade | Where | Opens |
| --- | --- | --- |
| Thruster pack (Odell's or Bloomfire, choice 6) | Cargo Labyrinth | High ledges in the Cryo Deck and Warrens (secrets), the Engine Spine |
| Grapple Harpoon | Cargo Labyrinth | Hook points across the ship, including the Gardens' Seed Vault |
| Pressure Boots | Flooded Ballast | Deep water, and the flooded pit under the Coolant Hall (a secret) |
| Swimming | Flooded Ballast (built in) | Water rooms |

### Bosses (10)

The Bailiff (built), the Pruner, Wick, the Tallyman, the Silt Mother, the Stoker, the Gardener (no fight; she collapses), Steward Marrant, the Navigator, and the Overgrown hero (in that ending's cutscene). For about ten real fights, Phase 4 adds optional bosses in revisited areas. Every boss has a readable telegraph for every attack, vents shards on a schedule so a lost weapon level can be won back mid-fight (the brief's fix), has a checkpoint or rest pod just outside, and has its own music or a layered track.

### Save state additions

Keep save format v1 and add fields with defaults. `HA.save.load` should fill any missing field, so Phase 2 saves still load. New fields: `wardens` (`{ bailiff, pruner, tallyman }`), `abilities` (`{ thruster, grapple, boots }`), `companions` (`{ wick, solder }`), `ending` (when one is reached), and `endingsSeen` (an array, kept across new games, for New Game+ later). Mercy and Bloom already exist.

### Fast travel

Fast travel arrives with the Cargo Labyrinth (the brief says "from mid-game onward"). From any rest pod the hero has rested at, the map lists the other rest pods to travel to. It is not offered during timed sequences (the flood) or after the Tower Lift.

---

## Part 4: Build order and progress

Each step ends with a build Cody can play. Tick a box in the same commit that finishes it.

### 3.0 Foundations
- [x] Menus fixed: nothing shows through them, the map zooms and scrolls, mouse and touch work (never required)
- [x] Hints can't be hidden by walls (checked)
- [x] Opening: the Ark in the distance behind the cards; the pod falls before the hero climbs out
- [x] The Way Down's music rewritten
- [ ] Save fields from Part 3, with defaults for old saves
- [ ] The reunion no longer ends the game; the new lead points to the Gardens; the arena gets its east door
- [ ] A general ability system the movement code and `rooms-check.js` both read (thruster fuel, grapple, boots, water)
- [ ] An ending runner: closing scene, epilogue cards from flags, credits, return to title; `endingsSeen`
- [ ] A test harness that plays each ending's choice path with the debug helpers (extends `browser-check.js`)

### 3.1 Hydroponic Gardens
- [ ] Theme, palette, props, music (waltz plus the sour layer)
- [ ] Rooms, checked by `rooms-check.js`
- [ ] Enemies: spore pods, Warden pickers, Bloomsworn
- [ ] The Scatter Launcher; Bloom bulbs and the Bloom track; the hero's Bloom sprite stages
- [ ] Scenes 1–7, Wick as an escort
- [ ] The Pruner boss and choice 2
- [ ] Wick's boss fight; Wick's Lancets; choice 3 (the Gardener's trade)
- [ ] Log `blight`

### 3.2 Warrens return
- [ ] The lantern scene; choice 4 (truth or lie); choice 5 (the pistol)
- [ ] The Hullfolk plan; Solder leaves; the floor hatch opens

### 3.3 Cargo Labyrinth
- [ ] Rooms with the crane-shifted stacks, checked
- [ ] Grapple Harpoon (in the checker too), Breach Charges and cracked walls
- [ ] Thruster pack, choice 6 (both versions); fast travel
- [ ] The Purser and choice 7 → the Deserter ending (first full ending, end to end)
- [ ] The Tallyman boss and choice 8; log `charter`

### 3.4 Flooded Ballast
- [ ] Water physics, Pressure Boots, Foam Sprayer (all in the checker)
- [ ] Rooms, the Silt Mother boss, log `valves`
- [ ] Finding Solder, the flood escape, choice 9

### 3.5 Engine Spine
- [ ] Tall rooms, lifts that the Hullfolk build (count driven by Mercy)
- [ ] The Stoker boss, the Crew Camp, the Purser's last call

### 3.6 Command Tower
- [ ] Rooms, the Observation Dome, the Gardener's end
- [ ] Steward Marrant (three phases, checkpoint)
- [ ] The ending branch: Overgrown, Dominion (choice 10), Crash (escape sequence)

### 3.7 Navigator's Core
- [ ] The hidden lift and its requirements; memory halls with a checkpoint
- [ ] The Navigator boss; choice 11; Homecoming

### 3.8 Finish Phase 3
- [ ] All five endings verified in real playthroughs on Normal (the Phase 3 gate), recorded in DECISIONS.md
- [ ] Main path timed at 4–6 hours by a first-time player; tune where it drags
- [ ] README and DECISIONS brought up to date

---

## Open questions for Cody

These are flagged in DECISIONS.md too. The plan above works either way, but each answer changes some details:

1. **Protagonist:** A (the Late Waker, assumed here), B or C?
2. **Wick's death:** is a parent's on-screen death (no gore) within the rating you want? Children are never killed on screen in this plan, and Shim is safe in every ending.
3. **Solder as the lost companion**, and the three ways to save or lose her: do they feel fair?
4. **Names:** Steward Ivo Marrant, the Gardener (Hester Vale), the Purser, the Pruner, the Tallyman, the Silt Mother, the Stoker. Change any you like.
5. **The Navigator's reason** (it couldn't face being retired at arrival): does that land for you?
