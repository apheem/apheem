# Hollow Ark

A dark, retro pixel-art action-exploration game set aboard a colony ship drifting off course for 300 years. This folder holds **Phase 2, the vertical slice** (the Cryo Deck, the Hullfolk Warrens, the Warden Lockup and the first boss, with saving, a map, a journal and one moral choice), and **Phase 3 in progress**, the full main path. Today the story runs from waking in pod 0417, through the Hydroponic Gardens, home to the Warrens, and down through the Cargo Labyrinth, and stops at the drain into the Flooded Ballast, the next area to be built. The first of the five endings, Deserter, can be reached in play.

The game direction lives in the [Hollow Ark game direction brief](https://claude.ai/artifact/1DQU8Exivvskbjp3ykeMXY). Every place the build departs from it is in [DECISIONS.md](DECISIONS.md). The plan for the rest of the game, Phase 3 onward, is in [STORYBOARD.md](STORYBOARD.md): the whole story area by area, every boss, weapon, choice and ending, and the build order with a checklist. Start there to pick up the work.

## Play it on Windows, macOS or Linux

One build runs everywhere: in any modern browser, or as a desktop app.

| Where | How |
| --- | --- |
| Any computer, in a browser | Once merged to `main`: **https://apheem.github.io/apheem/hollow-ark/** in Chrome, Edge, Firefox or Safari. |
| Any computer, offline | Download the `Hollow-Ark-Browser` artifact (or copy `docs/hollow-ark/`), unzip it and open `index.html`. |
| Windows 10 or 11 (x64 or ARM) | `Hollow-Ark-Windows` artifact: run `Hollow-Ark-0.3.3-windows-setup.exe` (one installer for both chip types). Or unzip the `x64` zip (the `arm64` one on Snapdragon PCs) and run `Hollow Ark.exe`. |
| macOS on Apple Silicon or Intel | `Hollow-Ark-macOS` artifact: open the `.dmg` and drag Hollow Ark to Applications. One file works on both chip types. |
| Linux x64 or ARM64, including Steam Deck desktop mode | `Hollow-Ark-Linux` artifact: make the `.AppImage` executable and run it. On Debian or Ubuntu you can instead run `sudo apt install ./Hollow-Ark-0.3.3-linux-amd64.deb`. |

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
| Eat a Bloom bulb (never on touch) | F or L | Y |
| Drop through a catwalk | Down + Jump | Down + A |
| Talk, read a ship log, rest at a rest pod, ride a lift, climb a ladder, throw a crane switch | Up | Up |
| Climb down an open floor hatch | Down | Down |
| Thruster pack (once you have one) | In the air, press Jump again and hold | In the air, press A again and hold |
| Grapple Harpoon | Aim at a ring (Up, or Up and a direction) and Fire; Jump to leap off, Down to let go | The same, with A and Down |
| Travel to another rest pod (from the Cargo Labyrinth on) | At a rest pod, open the map and pick a ringed pod | The same |
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

- **The slice no longer ends at the reunion.** Gasket says where the taken really go ("THEY GO UP, TO THE GARDENS"), and the new lead is **FIND THE TAKEN IN THE GARDENS**. That night, with no music, Wick sits with Shim at the fire, promises to be back by lights-out, and asks to come along: "THE ONES THEY TOOK ARE MY PATIENTS." In the morning she has gone ahead to the Bailiff's Hall, whose east wall now has a door up to the Gardens.
- **Mara's pod (0418)** hangs beside the hero's empty clamps in the Cryo Bay. Its plate can be read, and it's the first line in the hero's own voice: "MARA IS STILL ASLEEP IN 0418. I PROMISED I'D BE THERE WHEN SHE WOKE."
- **The Steward speaks first** over the Lockup's intercom: "WHOEVER YOU ARE, YOU ARE NOT IN THE COUNT. THAT CAN BE FIXED."
- **The Hullfolk's lines after the reunion** point to the Gardens, and differ by what you did to the Bailiff. Solder explains shards in her own voice; the exact rule ("A HIT COSTS SHARDS · NEVER MORE THAN ONE LEVEL") is on the wall above her bench.
- **Dialogue moves out of the way.** In a one-screen-high room the box sits at the top, so the people talking stay in view.
- **Saves carry everything Phase 3 needs** (each Warden's fate, abilities, who lived, the crew, endings reached). A Phase 2 save loads and picks up with the night after the reunion.
- **Movement abilities for later areas** (the thruster pack, the grapple's pull and hang, pressure boots, swimming) live in one place, `js/abilities.js`, which both the hero and the room checker use. None is handed out yet.
- **The ending runner** plays any of the five endings: its closing scene, an epilogue built from what you did (Shim, Gasket, Solder, the Warrens, the Wardens in their own counts, the sleepers and Mara, the Navigator, and whoever else still matters), the credits, then back to the title. Endings you've reached show on the title screen and survive a new game. No ending can be reached in play yet; the first, Deserter, arrives with the Cargo Labyrinth.

## Phase 3.1: the Hydroponic Gardens

The third story beat, and the first new area of Phase 3: ten rooms under the ship's glass dome, green and warm, with the Bloom creeping through all of it.

- **Wick comes with you.** She waits in the Bailiff's Hall, walks into the Gardens a step behind you, and names the plants as you go. In the Root Cellar the taken lie asleep in old cryo cradles, dosed as they sleep, pink at the seams. Sorrel's cradle is empty. The seals are locked from above, so Wick stays to keep them breathing and sends you up.
- **The rooms:** the Root Cellar, the Garden Lift (a stairwell down to a sealed vault hatch and the vats), the Terraces (stepped farm decks), the Irrigation Works (pools to swim), the Spore Beds (a tall greenhouse), the Seal Room (a long deck under the glass, then the Pruner's hall), the Dome Stair (a switchback down, ending in a shutter that opens a shortcut back into the Terraces), the Seed Vault (a secret behind a hatch only the grapple can pull, from the Cargo Labyrinth on), the Vat Walk and the Vat House.
- **New enemies:** spore pods that swell, then burst into a stinging cloud; Warden pickers, slow on their stilts, with a picking arm that glows before it shoots out a long way; and the Bloomsworn, the Steward's dosed soldiers, who roar, charge in a frenzy for up to eight seconds, then stagger.
- **The Scatter Launcher** (on the Terraces) lobs grenades that bounce, then roll along floors and off ledges and down stairs. They're weak against flyers.
- **Bloom bulbs and the Bloom track.** Bulbs are picked up and carried (three at most) and are only ever eaten on a press of their own button (F or L, Y on a controller): full health and double damage for 20 seconds, but the Bloom grows in you, for good. The first bulb, and any that would close an ending, asks first and says what it costs. The Bloom shows on the hero as it grows: a pink visor and veins, then a thorn through the shoulder, then eyes that glow, and a voice that sings along with the music, slightly flat. Each stage adds a line to the journal.
- **The Pruner,** the Warden that keeps the seals: a short, sharp fight. Its snips come at two heights, and the arm about to cut glows first; it grows thorn hedges around you, and in its second half it drops from the ceiling rail, with its shadow on the floor showing where. Then it asks you to finish it. Release it and it cuts the Bloom from the cradles: **eleven come home**. Finish it and its core opens the seals: **seven come home**, and the Scatter Launcher never drops below level 2.
- **The cradles open,** the taken wake and go home by the Garden Lift, but Wick is gone. Her lantern is on the floor, still lit.
- **The Vat House.** The Gardener watches from behind thick glass. Wick is on her knees in the Bloom, and you have to fight her: fast, lunging, throwing fans of her own lancets, bursting into spores when hit hard. She speaks between phases, and at a quarter of her health she falls on her own; you never land the last blow. Her last words are for Shim, and she gives you her lancets (a fan of thrown blades; at level 3 every sixth hit heals you). Then the Gardener offers the Bloom Thorn for them. Keep them, and she says she'll ask again in the Tower.
- **The music:** a waltz in F for the Gardens, which turns sour near the vats; the Pruner's own fight track; for Wick, the Warrens' song, broken, with a heartbeat for a drum. From her fall there's no music until you're home.
- **No going home without Wick.** Until her fate is known, the Garden Lift and the walk back through the Lockup both stop at the hero's own thought: "NOT WITHOUT WICK."

## Phase 3.2: the Warrens return

An interlude at home, between the Gardens and the Cargo Labyrinth. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **The way home.** The Garden Lift runs down to a new stop in the Warrens, and back up again; the walk home through the Lockup is open too.
- **The woken are home first.** Eleven, or seven, of them sit around the fire with their families, a sound the Warrens haven't made in years, and each has something to say. Then Gasket sees Wick's lantern at the hero's hip before anyone speaks, and goes back to the pot. She makes the broth now. It was Wick's job.
- **What to tell Shim** (choice 4). He's sitting by his door, waiting for his mother to be back by lights-out. Tell him everything she said at the end, and he keeps her lantern. Tell him only that she wasn't scared, and he won't take it: it hangs by the fire. Or give him the lantern and a lie (she's hiding, she's safe), and Gasket knows. The hero never speaks aloud; what they tell him is in their own voice.
- **Gasket's grief,** and then the Steward over the Warrens' old speakers: "SEND ME THE SLEEPER, AND NO ONE ELSE WILL BE COUNTED." Nobody moves. "WE DON'T HAND OVER LOST THINGS."
- **The plan.** An old crew tram runs from the sump under the village, along the keel, to the foot of the Engine Spine. Its motor is gone, and Solder will fetch a working one from the Ballast pump rooms, alone, through the cargo decks, chalking the walls as she goes. The new lead: **FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH**.
- **The Rivet Pistol** (choice 5). Solder bolts it to the new gate, so the Warrens can hold if the Steward's soldiers come; or she turns it into the **Rivet Repeater** (twin bolts from level 1, piercing from level 2, twice the rate at level 3), and the gate has no gun. Both screens say so.
- **The night she leaves.** Rest at the village pod: Solder builds the gate she promised, one that opens from the Hullfolk's side (it opens as you come near it, from either side), opens the floor hatch by her bench, and goes. Shim is awake to see it.
- **The Sump,** down the hatch: the old keel tram dead at its platform under its cable, a ship log about where its motor went, and Solder's chalk at the way into the Cargo Labyrinth, which is the next build.
- **What the Hullfolk call you.** Release the Wardens and tell Shim the truth, and in the morning he gives you a name: "YOU'RE NOT A SLEEPER ANYMORE. YOU'RE LATE." Be cruel enough and the village starts calling you COUNTER, the word they use for the Wardens, and hides from you. Everyone else calls you SLEEPER, and the people in the Warrens say whichever name is yours.

## Phase 3.3: the Cargo Labyrinth

The old crew's stores under the Warrens: eleven rooms of stacked containers, belts and cranes. Getting lost is part of it, and the game points out the map's markers on the way in. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **The way in.** West from the sump, the Hatch Drop falls past the containers to the Stacks. Solder's chalk marks her route: "LEFT. NO, YOUR OTHER LEFT." "DON'T TOUCH THE YELLOW ONES." "IF YOU'RE READING THIS, YOU'RE SLOW." Her notes stop on the Sorting Floor.
- **The Stacks** are a container maze with two cranes. A crane's switch moves its yellow stack from one slot to the other: one stack either blocks the corridor or plugs the hole under it; the other either blocks the way out or hangs up in its bay. Each crane has a switch on both sides of its stack, so whichever way you come in, the way on can be moved.
- **The Sorting Floor** is a tall shaft of conveyor belts and chutes, and the main floor's belts carry you toward the chute. Up the shaft is the Armory. At the top, past a ledge only a thruster reaches and a ring only the harpoon can cross on, a rest pod waits outside the Tallyman's Yard. Down the chute there's a cracked wall.
- **New enemies:** Bloom rats that scurry in packs and rush you on their level; cargo drones that fly their lines and drop a bolt on anyone below (their lamp blinks first); stack-crawlers that hang under the containers and let go when you pass beneath; and squads of Bloomsworn.
- **The Grapple Harpoon,** in the Armory, where the Steward kept it for "collection work." Aim at a ring and fire: it bites and winches you up to hang there. Jump to leap off, or press Down to let go. Fired at anything else, it's a light barb on a line that drags small things back to your feet, stunned. It opens the Gardens' Seed Vault now too.
- **The deserter** (choice 6). A Bloomsworn man sits by the Lifeboat Dock, shaking, the Steward's Bloomfire thruster on his back, trying to get home before his next dose: "IT DOESN'T STOP. IT JUST GETS QUIETER." Take his pack (a strong, short burn, and the Bloom grows in you) and he sits down where he is. Or let him fly home: his pack melts the ice over the Cold Store's door on his way, and an older pack waits in there, on a dead man. That's the long way round.
- **Chief Engineer Odell** sits frozen at a dead terminal in the Cold Store, where he came to make his complaint in person in year 41: "I AM STANDING IN FRONT OF YOU. ANSWER ME." No reply. His pack (a longer, steadier burn) is still on his back. The Cold Store's old lift runs up to the Coolant Hall on the Cryo Deck once it has been called from below: a shortcut home.
- **The Purser** (choice 7) stands by the last lifeboat with a pilot's seat: "THE STEWARD WANTS YOU GONE. I WANT A QUIET LIFE. THE BOAT WANTS A PILOT. EVERYONE WINS." Say no, and the offer stands. Say yes, and it's the **Deserter ending**, the first ending you can reach in play: the Ark shrinking in the boat's window, the Wardens' counts on the radio, fading, and the hero alone on the new world.
- **The Tallyman,** the Warden that has counted every crate on the ship for 300 years, rides a gantry crane across its yard's ceiling. It lines up over you and counts out loud, a crate falling on every count; it swings its hook across the yard at knee height; it stamps red audit marks on the floor that go off two seconds later; and in its second half it stacks crates into cover. Its cab is armoured. After it drops its crates, the hold under the cab hangs open and its core shows, with a ring on it: harpoon the ring and the winch drives you into the core. Shots count only while the hold is open.
- **Its core is the Vault's lock** (choice 8). It asks to finish its count. Let it, and it counts the Hullfolk by name, not as stock, and tells you where Solder went: "ITEM: ONE TINKERER. LOCATION: BALLAST." Take its core, and the Breach Charges hold 5 instead of 3, but its last count breaks off halfway through the answer.
- **Breach Charges,** in the Vault: a few heavy rockets that open cracked walls, restocked at any rest pod. One opens the way through the Long Aisle to the Drain, where Solder's toolbag lies by a grate she levered up. Down there is the Flooded Ballast, the next build.
- **Travel between rest pods.** From the Labyrinth on, open the map while standing at a rest pod: every other pod you've rested at is ringed, and picking one takes you there, rested.
- **Home, if you go.** Let the deserter fly home, and he's at the Warrens' fire with Shim asleep on his knee: Flux, Shim's father. Take his pack, and once you've read the page of the Steward's lists in the Purser's office, Gasket reads his name out from it.
- **The music:** a mechanical track in D Dorian, with a clock that ticks and tocks and the Ark's theme in pieces, each note in a different octave; only a hum in the Lifeboat Dock; a frozen drone in the Cold Store; and the Tallyman's own fight, counting in threes.
- **Every Warden's core screen says when taking it would close the true ending,** the Bailiff's and the Pruner's now included.

## How the rooms are checked

Every gap on the main path can be jumped with room to spare: 5 tiles or less (a running jump reaches 7, but only with a pixel-perfect run-up). Gaps that aren't meant to be jumped are 9 tiles or more, with another route in view. `hollow-ark/tests/rooms-check.js` plays every room with the game's own movement code: swimming, belts, both thruster packs, and the Grapple Harpoon fired as it is in the game (including a burn straight after leaping off a ring). It fails the build if any entrance (an edge, or a lift or ladder from another room), item, person, switch or rest pod can't be reached with the abilities the hero has by then, if a secret meant for an ability can be reached without it (that includes a way through a door only an ability opens, like the Seed Vault's hatch or a cracked wall, and an exit a room marks as needing one, like the Sorting Floor's way up to the Yard), if a room with cranes can't be crossed from every way in whichever slots its stacks are in, if a gap is exactly 7 tiles wide, or if a hint runs into a wall. Before the real rooms it plays four small test rooms, one per ability, to prove each one opens exactly what it should.

## How it's built

| Path | What it is |
| --- | --- |
| `docs/hollow-ark/` | The game: HTML5 canvas and plain JavaScript, with no engine and no build step. GitHub Pages serves it from here. |
| `hollow-ark/desktop/` | Electron shell that packages those same files as Windows, macOS and Linux apps (Steam-ready in Phase 5). |
| `docs/hollow-ark/js/areas/` | The rooms, one file per area, drawn as text maps (the legend is at the top of each file). |
| `docs/hollow-ark/js/story/`, `js/bosses/` | Each area's story (scenes, lines, logs) and each boss, one file each, from Phase 3 on. |
| `hollow-ark/tests/` | The room checker, and a check that plays the whole story so far (the Gardens, the Warrens return and the Cargo Labyrinth included, to the Deserter ending), upgrades a Phase 2 save and plays all five endings, in Chromium, Firefox and WebKit (Safari's engine). |
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
