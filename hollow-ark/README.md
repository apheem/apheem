# Hollow Ark

A dark, retro pixel-art action-exploration game set aboard a colony ship drifting off course for 300 years. This folder holds **Phase 2, the vertical slice** (the Cryo Deck, the Hullfolk Warrens, the Warden Lockup and the first boss, with saving, a map, a journal and one moral choice), and **Phase 3 in progress**, the full main path. Today the story runs from waking in pod 0417, through the Hydroponic Gardens, home to the Warrens, down through the Cargo Labyrinth and the Flooded Ballast, along the keel, up the Engine Spine and the Command Tower to the Steward at the Helm, and on the true path down under the Helm into the Dreaming Deck. All five endings can be reached in play (Deserter, Crash, Dominion, Overgrown and Homecoming), and an automated check plays each one from a new game. What's left of Phase 3 is a first-time player's timed run, which the game now clocks by itself.

The game direction lives in the [Hollow Ark game direction brief](https://claude.ai/artifact/1DQU8Exivvskbjp3ykeMXY). Every place the build departs from it is in [DECISIONS.md](DECISIONS.md). The plan for the rest of the game, Phase 3 onward, is in [STORYBOARD.md](STORYBOARD.md): the whole story area by area, every boss, weapon, choice and ending, and the build order with a checklist. Start there to pick up the work.

## Play it on Windows, macOS or Linux

One build runs everywhere: in any modern browser, or as a desktop app.

| Where | How |
| --- | --- |
| Any computer, in a browser | Once merged to `main`: **https://apheem.github.io/apheem/hollow-ark/** in Chrome, Edge, Firefox or Safari. |
| Any computer, offline | Download the `Hollow-Ark-Browser` artifact (or copy `docs/hollow-ark/`), unzip it and open `index.html`. |
| Windows 10 or 11 (x64 or ARM) | `Hollow-Ark-Windows` artifact: run `Hollow-Ark-0.3.27-windows-setup.exe` (one installer for both chip types). Or unzip the `x64` zip (the `arm64` one on Snapdragon PCs) and run `Hollow Ark.exe`. |
| macOS on Apple Silicon or Intel | `Hollow-Ark-macOS` artifact: open the `.dmg` and drag Hollow Ark to Applications. One file works on both chip types. |
| Linux x64 or ARM64, including Steam Deck desktop mode | `Hollow-Ark-Linux` artifact: make the `.AppImage` executable and run it. On Debian or Ubuntu you can instead run `sudo apt install ./Hollow-Ark-0.3.27-linux-amd64.deb`. |

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
| Switch weapon | Q / E (or U / O) | LB / RB |
| Eat a Bloom bulb (never on touch) | F or L | Y |
| Drop through a catwalk | Down + Jump | Down + A |
| Talk, read a ship log, rest at a rest pod, ride a lift, climb a ladder, throw a crane switch, work a console | Up | Up |
| Climb down an open floor hatch | Down | Down |
| Thruster pack (once you have one) | In the air, press Jump again and hold | In the air, press A again and hold |
| Grapple Harpoon (once you have it, whatever weapon is in hand) | Aim at a ring (Up, or Up and a direction) and press C or I; Jump to leap off, Down to let go. With the harpoon wielded, Fire works too | LT, then A to leap off and Down to let go |
| Swim (without the pressure boots) | In water, press Jump for each stroke | In water, press A for each stroke |
| Pressure boots (once you have them) | You sink in water and walk the bottom; Jump goes high off it | The same, with A |
| Foam Sprayer | Fire: the foam sets on water or Bloom silt as a platform for a few seconds, or on land as a shield | The same |
| Travel to another rest pod (from the Cargo Labyrinth until the Tower Lift) | At a rest pod, open the map and pick a ringed pod | The same |
| Ride a steam vent (Engine Spine) | Step or jump into the steam and it carries you up; steer out to one side | The same |
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
- **The Hullfolk's lines after the reunion** point to the Gardens, and differ by what you did to the Bailiff. Solder explains shards in his own voice; the exact rule ("A HIT COSTS SHARDS · NEVER MORE THAN ONE LEVEL") is on the wall above his bench.
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
- **The woken are home first.** Eleven, or seven, of them sit around the fire with their families, a sound the Warrens haven't made in years, and each has something to say. Then Gasket sees Wick's lantern at the hero's hip before anyone speaks, and goes back to the pot. He makes the broth now. It was Wick's job.
- **What to tell Shim** (choice 4). He's sitting by his door, waiting for his mother to be back by lights-out. Tell him everything she said at the end, and he keeps her lantern. Tell him only that she wasn't scared, and he won't take it: it hangs by the fire. Or give him the lantern and a lie (she's hiding, she's safe), and Gasket knows. The hero never speaks aloud; what they tell him is in their own voice.
- **Gasket's grief,** and then the Steward over the Warrens' old speakers: "SEND ME THE SLEEPER, AND NO ONE ELSE WILL BE COUNTED." Nobody moves. "WE DON'T HAND OVER LOST THINGS."
- **The plan.** An old crew tram runs from the sump under the village, along the keel, to the foot of the Engine Spine. Its motor is gone, and Solder will fetch a working one from the Ballast pump rooms, alone, through the cargo decks, chalking the walls as he goes. The new lead: **FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH**.
- **The Rivet Pistol** (choice 5). Solder bolts it to the new gate, so the Warrens can hold if the Steward's soldiers come; or he turns it into the **Rivet Repeater** (twin bolts from level 1, piercing from level 2, twice the rate at level 3), and the gate has no gun. Both screens say so.
- **The night he leaves.** Rest at the village pod: Solder builds the gate he promised, one that opens from the Hullfolk's side (it opens as you come near it, from either side), opens the floor hatch by his bench, and goes. Shim is awake to see it.
- **The Sump,** down the hatch: the old keel tram dead at its platform under its cable, a ship log about where its motor went, and Solder's chalk at the way into the Cargo Labyrinth, which is the next build.
- **What the Hullfolk call you.** Release the Wardens and tell Shim the truth, and in the morning he gives you a name: "YOU'RE NOT A SLEEPER ANYMORE. YOU'RE LATE." Be cruel enough and the village starts calling you COUNTER, the word they use for the Wardens, and hides from you. Everyone else calls you SLEEPER, and the people in the Warrens say whichever name is yours.

## Phase 3.3: the Cargo Labyrinth

The old crew's stores under the Warrens: eleven rooms of stacked containers, belts and cranes. Getting lost is part of it, and the game points out the map's markers on the way in. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **The way in.** West from the sump, the Hatch Drop falls past the containers to the Stacks. Solder's chalk marks his route: "LEFT. NO, YOUR OTHER LEFT." "DON'T TOUCH THE YELLOW ONES." "IF YOU'RE READING THIS, YOU'RE SLOW." His notes stop on the Sorting Floor.
- **The Stacks** are a container maze with two cranes. A crane's switch moves its yellow stack from one slot to the other: one stack either blocks the corridor or plugs the hole under it; the other either blocks the way out or hangs up in its bay. Each crane has a switch on both sides of its stack, so whichever way you come in, the way on can be moved.
- **The Sorting Floor** is a tall shaft of conveyor belts and chutes, and the main floor's belts carry you toward the chute. Up the shaft is the Armory. At the top, past a ledge only a thruster reaches and a ring only the harpoon can cross on, a rest pod waits outside the Tallyman's Yard. Down the chute there's a cracked wall.
- **New enemies:** Bloom rats that scurry in packs and rush you on their level; cargo drones that fly their lines and drop a bolt on anyone below (their lamp blinks first); stack-crawlers that hang under the containers and let go when you pass beneath; and squads of Bloomsworn.
- **The Grapple Harpoon,** in the Armory, where the Steward kept it for "collection work." Aim at a ring and fire: it bites and winches you up to hang there. Jump to leap off, or press Down to let go. Fired at anything else, it's a light barb on a line that drags small things back to your feet, stunned. It opens the Gardens' Seed Vault now too.
- **The deserter** (choice 6). A Bloomsworn man sits by the Lifeboat Dock, shaking, the Steward's Bloomfire thruster on his back, trying to get home before his next dose: "IT DOESN'T STOP. IT JUST GETS QUIETER." Take his pack (a strong, short burn, and the Bloom grows in you) and he sits down where he is. Or let him fly home: his pack melts the ice over the Cold Store's door on his way, and an older pack waits in there, on a dead man. That's the long way round.
- **Chief Engineer Odell** sits frozen at a dead terminal in the Cold Store, where he came to make his complaint in person in year 41: "I AM STANDING IN FRONT OF YOU. ANSWER ME." No reply. His pack (a longer, steadier burn) is still on his back. The Cold Store's old lift runs up to the Coolant Hall on the Cryo Deck once it has been called from below: a shortcut home.
- **The Purser** (choice 7) stands by the last lifeboat with a pilot's seat: "THE STEWARD WANTS YOU GONE. I WANT A QUIET LIFE. THE BOAT WANTS A PILOT. EVERYONE WINS." Say no, and the offer stands. Say yes, and it's the **Deserter ending**, the first ending you can reach in play: the Ark shrinking in the boat's window, the Wardens' counts on the radio, fading, and the hero alone on the new world.
- **The Tallyman,** the Warden that has counted every crate on the ship for 300 years, rides a gantry crane across its yard's ceiling. It lines up over you and counts out loud, a crate falling on every count; it swings its hook across the yard at knee height; it stamps red audit marks on the floor that go off two seconds later; and in its second half it stacks crates into cover. Its cab is armoured. After it drops its crates, the hold under the cab hangs open and its core shows, with a ring on it: harpoon the ring and the winch drives you into the core. Shots count only while the hold is open.
- **Its core is the Vault's lock** (choice 8). It asks to finish its count. Let it, and it counts the Hullfolk by name, not as stock, and tells you where Solder went: "ITEM: ONE TINKERER. LOCATION: BALLAST." Take its core, and the Breach Charges hold 5 instead of 3, but its last count breaks off halfway through the answer.
- **Breach Charges,** in the Vault: a few heavy rockets that open cracked walls, restocked at any rest pod. One opens the way through the Long Aisle to the Drain, where Solder's toolbag lies by a grate he levered up. Down there is the Flooded Ballast, the next build.
- **Travel between rest pods.** From the Labyrinth on, open the map while standing at a rest pod: every other pod you've rested at is ringed, and picking one takes you there, rested.
- **Home, if you go.** Let the deserter fly home, and he's at the Warrens' fire with Shim asleep on his knee: Flux, Shim's father. Take his pack, and once you've read the page of the Steward's lists in the Purser's office, Gasket reads his name out from it.
- **The music:** a mechanical track in D Dorian, with a clock that ticks and tocks and the Ark's theme in pieces, each note in a different octave; only a hum in the Lifeboat Dock; a frozen drone in the Cold Store; and the Tallyman's own fight, counting in threes.

## Phase 3.4: the Flooded Ballast

The ship's heart, under the Labyrinth: ten rooms of tanks, pumps and water, down the Drain's grate. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **Water.** Without boots you float chest-deep, swim across, and climb out with a stroke (Jump). Deep water is marked with a yellow PRESSURE stripe: the suit can't take it without boots, so you can't dive. There's no drowning.
- **Bloom silt.** The pink sludge in the Ballast's low places burns. Step in it and you're hurt and thrown back to the last firm ground you stood on. You can't swim it, and the channels of it run under roofs too low to fly a thruster across.
- **Solder** is in the Pump Gallery with the tram motor and a leg that won't hold him: "TOOK YOU LONG ENOUGH. HELP ME CARRY THIS." Give him back his toolbag if you picked it up at the Drain. He gives you the **Foam Sprayer** ("MADE IT FOR THE BATH. DON'T ASK."): a glob that floats up through water and sets on the surface (or on silt) as a platform for a few seconds, or sets on land as a shield that stops shots. It gums up small things it hits. Three platforms float at once.
- **The walk.** He limps behind you along the Tank Farm's walkway and talks: about the keel tram, about the old crew's lift down from the bridge ("I COULD MEND IT, IF I LIVED THAT LONG."), and about Wick. At Odell's Workshop he goes back to sit with the motor.
- **The pressure boots** are at the far end of Odell's Workshop, across a floor gone under the silt, in a box marked "IF FOUND, RETURN TO ODELL." In them you sink, walk the bottom, and jump high off it. The way on is down through the Tank Farm's east tank.
- **New enemies:** silt eels that sway in their water and lunge at anyone who swims in it (they curl first); Bloom jellies that drift and sting; and drowned Wardens, slow and waterlogged, that swell when hit and burst a moment later. Keep your distance, or let one go off among the others.
- **The Silt Mother** lives in the Silt Tank, a silt eel the Bloom has swollen to the length of her tank. Only her head can be hurt, and only out of the water. Her shadow and a boil of bubbles gather under you before her head bursts up to bite and hangs there, open; she spits Bloom jellies; her tail rises at one end, thrashing, then sweeps the whole water line (jump it, or stand on a sluice gate). At half health she tears the drain open and the fight moves to the tank's floor: she charges end to end along it, and rears back over you to strike down where you stood.
- **The flood.** Solder comes down once it's quiet, and walks with you. As you cross the Valve Hall, its nine valves open by themselves: "VALVES 1-9: OPENING." The water rises behind you, and a clock shows how long until it reaches the hatch at the top of the Long Culvert. Solder can't swim with that leg, and he stops if you get more than a screen ahead. If the water closes over him, you're both back in the Valve Hall to try again.
- **The Jammed Hatch** (choice 9). Solder gets the hatch open, and the beam over it comes down on his legs. Blow the beam with his last charge and your launcher (the Breach Charges go, for good); eat the Bloom growing on the hatch for the strength to lift it (Bloom +2; "THIS WILL BE THE LAST OF YOU." if it would take you to 8); or leave him ("GO. SOMEONE HAS TO START THE TRAM.").
- **The keel tram.** Fit the motor in the winch at the Keel Tram Station, with Solder or alone, and the tram shudders off toward the Warrens to fetch the climbers. Solder rides it. The station's terminal holds the ballast control log: "VALVES 1-9 OPENED ON NAVIGATOR AUTHORITY. NO HUMAN COMMAND RECEIVED." The keel line runs on east to the Engine Spine, the next build.
- **The raid.** While you're down here, the Bloomsworn raid the Warrens, and you hear it up the pipes. Go home and see: if your pistol is on the gate, it held ("IT HELD. YOUR LITTLE GUN HELD."); if not, the gate fell, the young and the old are hiding in the deep walls, and Tamp is hurt.
- **The music:** in the dry rooms, the Ark's theme an octave down on soft voices, as if through the hull, with water dripping; in the water rooms, only the engines' muffled thrum; the Silt Mother's slow churn in 6/8; and in the flood, nothing but the alarm and the water.
- **No screen names the true ending any more.** In 3.3 every Warden's core screen said when taking it would close the true ending; Cody felt that gave too much away. The Bloom screens still warn when a choice would lock in Overgrown.
- **The Irrigation Works** in the Gardens has two steps under the water now, so a hero in the boots who sinks to the bottom of its basin can climb back out.

## Phase 3.5: the Engine Spine

The ship's power spine: one tall shaft from the keel up to the Command Tower, with the reactor glowing up its middle. Six rooms, stacked, joined top to bottom by ladders and floor hatches. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **The keel tunnel** runs east from the tram station to the Spine Foot, where the keel line ends. The log there says the bridge's lift takes a crew of eight to release its brake.
- **Steam vents** carry you up: step or jump into a column of steam and it lifts you to its top, then steer out to one side. The Spine's grilles are hot and hurt like thorns. In the Piston Run, the rams that drive the reactor's pumps slam out across the climb on their own time; each one hisses first.
- **The crew's lift.** While you climb, the climbers come up the keel on the tram and build a lift behind you, a landing at a time: up to the Boiler Landing, then the Piston Landing, then the camp. How far it gets depends on how many came, and that depends on how you've treated the Hullfolk (the Mercy track, never shown as a number). Ride it between any landings it reaches. The map marks each stop, and each lift adds a voice to the music.
- **New enemies:** Bloomsworn climbers who cling to the shaft walls, climb to your height, throw themselves at you and rush you along the floor; steam drones that hang overhead and, after a hiss, blast straight down; and heat slugs that leave a trail of embers.
- **Abel, the Stoker,** is a Bloomsworn giant the Steward used up and left feeding the Reactor Throat's furnace. You only ever see his shape against the fire. He can be hurt only while he leans out of the furnace mouth, which he does to attack. He lobs burning slag that sets the floor alight. He draws breath while the band his fire will fill flickers across the room, then blows a jet: low along the floor if you're on it (get up on a catwalk), or high if you're up (get down, and don't jump). In his second half he hauls the floor grates open over the fire; fall in and you're burnt and thrown back out.
- **Choice 10.** Beaten, he says: "I WAS ABEL. I FED THE FIRES. DON'T PUT THEM OUT." Leave him his fires, or open the furnace's quench and put them out of him.
- **The Crew Camp** is the old crew's bunks and stove at the top of the Spine. The climbers stop there for the night, and you can talk to every one of them. If you still carry Wick's Lancets, you can stitch a climber's burnt arm. At lights-out Gasket has Tamp count the children down the line phone to the Warrens; if you lied to Shim about his mother, he comes up one short. If you turned down the Purser's boat, he calls one last time over the intercom. Going still ends the game as the Deserter.
- **The crew's verdict.** In the morning, by the Tower Lift, the climbers count themselves off the way the Wardens count ("COUNT: ONE. OLD. STUBBORN."). Then the Tower Lift takes everyone up into the Command Tower.
- **Home, if you go back:** everyone who climbed is gone from the Warrens, and the rest keep the gate with Tamp.
- **The music:** a driving 7/8 on machine percussion, with the Ark's theme bent to fit the bar. It starts as only the engine, and each lift the crew builds adds a voice. Abel's fight slows it to a shovel's swing; the camp has the theme slow, by the stove.

## Phase 3.6: the Command Tower

The old bridge at the bow, high over the Spine: cold marble and brass, and the night in every window. Five rooms above the Tower Lift. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **The crew ride up with you** ("WE WANT TO BE IN THE ROOM") and hold the Tower Lift in the Barracks, the honour guard's quarters, until you reach the Helm. Pods stop offering travel once you're up here.
- **New enemies:** Warden turrets in the ceilings that paint you with a red sight line before a burst of three, and the Steward's honour guard, who come on behind a shield (shots glance off it; get behind them, or catch them open after they lunge with the pike).
- **The Observation Dome** has no music and nothing to fight: only the stars, and the new world over the bow, a pale dot with no lights on it anywhere. Its one terminal is the Navigator's, and it speaks to you for the first time: "YOU ARE STILL HERE." There's a rest pod.
- **Choice 4b, if you lied to Shim:** he came up the vents to find his mother, and he's at the Dome's glass. Tell him the truth now, or keep lying.
- **The Garden Gallery:** the Gardener, among her potted Bloom. If you still carry Wick's Lancets, she offers the Thorn one last time. Then **choice 11**: spare her, make her take her own dose (you walk on, and you hear it), or walk past. If you kept lying to Shim, she tells him the truth as he passes: "YOUR MOTHER ASKED VERY GOOD QUESTIONS."
- **The Bridge Stair** climbs to the Helm, with a rest pod on the landing outside it.
- **Steward Ivo Marrant** speaks first ("I WOKE UP COLD, LIKE YOU. THE FIRST THING I EVER DID ON THIS SHIP WAS TAKE A DEAD MAN'S BOOTS." Gasket: "...THOSE WERE HIS BOOTS."), then fights in three phases. The Key: he stands at the helm behind its field and gives orders, the turrets fire on his word and the gates drop and lift, and you break the three relays the Key draws on. The guard: "MEASURE: FULL." He doses his honour guard and lectures while you fight them. The man: an old man with the captain's sidearm, ducking behind the consoles, rising to aim (watch the sight), rolling away if you close in. A fall in the fight brings you back to its start, not down the stair. **Choice 12**: spare him, end him, or leave him to the Wardens' count.
- **After the Steward,** the game picks the ending:
  - **Bloom 8 or more: Overgrown.** Your hand closes on the Helm Key, and the Bloom closes on you. You play the last fight as Solder (or Old Gasket, if Solder died), with the weapon you dropped, against what's left of you.
  - **Mercy −3 or less: the Key is offered.** The Wardens kneel: "NEW HOLDER. AWAITING ORDERS." **Choice 13**: claim the Key (Dominion), or break it.
  - **Otherwise the Key breaks,** and the Navigator says "NOT YET." and starts to break the ship apart. With every Homecoming requirement met, the freed Wardens hold the doors while the crew mend Lift B under the Helm, and it goes down to the Dreaming Deck (Phase 3.7, below). Without them, it's **the run for the sleds:** the tram takes everyone home, and you run alone against the clock from the sump through the Warrens and the Cryo Deck to the old crew's sleds in Cryo Bay 4, where you woke. The ceilings come down, the Wardens are gone, and the pods have no power. In the Pod Stacks one console can launch every sleeper's pod, and it costs 20 seconds. Run out of time and you start the run again. Reach the sleds for the Crash ending.
- **The music:** the Ark's theme at its grandest, brass on a marching bass; silence in the Dome; an organ of square pipes for the Steward, adding a march for his guard and the theme for the man; a racing heartbeat under the hull alarm for the scuttle; and the Gardens' waltz gone wrong for what the hero became.

## Phase 3.7: the Dreaming Deck

The navigation deck under the Helm, sealed since year 40, where the Navigator keeps its memories. It's only on the true path: every Warden released, Solder alive, a crew of eight, and Bloom 2 or less. Black, with the ship's courses drawn over it in cyan; the memories are washed out, and their edges go white. Six rooms. The checklist is at the bottom of [STORYBOARD.md](STORYBOARD.md).

- **Lift B** takes the whole crew down, while the freed Wardens hold the doors above. At the bottom, a seal reads you: "NAVIGATION DECK. CLEAN PERSONNEL ONLY." It reads you clean, and opens for one. The crew stay by the lift. Past the seal the alarms fall away, and the halls play the Ark's theme on a music box.
- **Three memory halls,** each an earlier part of the ship as the Navigator remembers it: the Cryo Deck on the first night, when the crew sang over the sleepers; the Gardens the year the Bloom came; the Helm the year the Steward took the Key. They're a gauntlet: static where the floors were (it burns like thorns), and the ship's old defences, drawn pale, as memories. The Navigator talks to you between them: the crew it watched grow old, the charter it read every day ("THEY WERE GOING TO TAKE ME APART TO LIGHT A CITY. I WOULD HAVE BEEN A LAMP."). There are no rest pods; instead the Lift Down, the third hall and the Sphere are checkpoints, and reaching the last two restores your suit. A fall comes back to the latest one.
- **The wake log,** on the Helm memory's far wall: "0112. LEFT." "0391. GREW." "2207. RULED." "0417." The fourth is blank. "I WOKE YOU. I WANTED TO SEE IF ANYONE WOULD STILL CHOOSE TO STAY." And: "THE WATER WAS A QUESTION. YOU ANSWERED IT."
- **The Navigator** has no face. Its body is its course: the loop the Ark has flown for 274 years, drawn in light across the Sphere, with the ship's own light running round it and throwing sparks at you. Cut the loop's lights (four, then five, then six) and it redraws the loop faster each time ("NOT YET."). From the second loop the whole line burns now and then (it flickers first: get off it), and it throws pale drifters along it. Then the loop opens and its course swings out toward the world, and it pulls it back: every hit on the course's head pushes it toward the world, and you have to hold it there. A fall starts the fight again from its checkpoint.
- **The song.** Once the course holds, the Navigator stops singing, and the music drops away. The crew come down and hum the old lullaby back to the ship (Shim starts it, if he's with them), and then the Ark's theme plays in full, in a major key, for the first time. The Navigator lights the stern drive itself, and the Ark turns in.
- **Choice 14,** in the Quiet, beside its core: "WILL YOU LEAVE ME TOO?" Take its core to the new world (it'll be a lamp after all), let it rest, or stay aboard with it in the pod beside it. All three end in Homecoming, and each changes its epilogue. The closing scene shows the Ark turning toward the world, its stern drive lit.
- **The music:** the theme on a music box in the halls; for the Navigator, its song driven hard, with each loop adding more of the ship (the Spine's machines and the Warrens' hand drum, the Steward's organ, the theme whole and loud while you hold its course); the crew's hum; and the theme in full.

## Phase 3.8: finishing Phase 3

- **The run clock.** The pause menu shows the play time. After an ending, following its results (0.3.9, below), a card shows **THIS RUN**: the total time and how many times you fell, then the time spent in each area and in the ending itself. A first-time player can photograph that card, and it's the whole timing against the budget in [STORYBOARD.md](STORYBOARD.md). (A save from before 0.3.8 counts the time it already had in the total, but not in any area.)
- **Every ending, played from a new game.** `hollow-ark/tests/playthrough.js` plays four whole games in Chromium, one each to Homecoming, Crash, Dominion and Overgrown, and a fifth from the Homecoming run's save in the Warrens to the Purser's boat and Deserter. Nothing is set by hand: every flag, weapon, ability and person comes from the game's own scenes, pickups, fights and choice screens. Each run quits and continues at every new area, falls once on purpose in every boss fight to prove the fight comes back, and checks the hero has every ability the room checker assumed in every room they enter. What each run chose, and how each ending came out, is in [DECISIONS.md](DECISIONS.md).

## 0.3.9: after Cody's first full play

Cody played from a new game to an ending in about 58 minutes. These are the fixes from their notes. The bigger notes (the game's length, the story's bonds, upgrades, routes that open and close with choices, and pictures behind the epilogue) are in the [story audit and plan](https://claude.ai/artifact/SMRYSh6QmPqsC6SseGEoZC), for Cody to decide on.

- **The flood's clock no longer sticks at 0:00.** A fall during the flood rebooted the suit at Odell's Workshop without Solder, and the water went on rising with no one left to fail it. A fall in the flood now comes back to the Valve Hall with Solder and the water down, like the run for the sleds does, and the flood ends if Solder is ever missing.
- **The Silt Mother can't be shelled from behind her sluice gate.** Her fight starts when you're out over her water, and shutters come down over both gates. Three gantries cross the tank just above the water. She bites up through them, so keep moving, and they collapse when she tears the drain open.
- **A grapple button.** C or I on the keyboard, LT on a controller, throws the harpoon's line whatever weapon is in hand. Weapon switching keeps Q / E and LB, and its other keys are now U / O.
- **Every ending says what it was.** The ending's name shows before its epilogue. After the credits, a results card waits for a press: the ending, how many endings you've seen, who reached the new world out of everyone who could have (Hullfolk, sleepers, Mara and you), the Wardens freed, and the final Mercy and Bloom. Then, for any ending but Homecoming, what closed the other way, in the journal's words. Then THIS RUN. None of these can be skipped by mashing or by skipping the scene.
- **The run for the sleds says where to go.** Gasket says the sleds are in Cryo Bay 4, where you woke; the lead says so; and a bar under the clock shows which way to go in every room of the run. The Cryo Bay's west wall is stencilled CREW SLEDS from the first minute of the game.
- **Home scenes stay home.** Scenes that wait for your next visit to the Warrens (the raid's outcome, mourning Solder, Flux's homecoming, Shim's name for you) no longer play during the run for the sleds, when the Warrens are empty and the clock is running.

## 0.3.27: the City Hold and the Dark Bay

- **Two new rooms on the main path, one in the Cargo Labyrinth and one in the Gardens.** Each adds a few minutes, and neither leaves you walking back the way you came.
- **The City Hold.** The watch room's hatch down to the Drain is gone. The watch room's west end now opens high up in the hold where the colony's First City is kept: houses, a school, a clinic, a town hall and four hundred street lamps, packed in crates for landing day in year 0 and never opened. The manifest is on the landing. Get down by the crate hanging off the crane's hook (harpoon its ring) and the stacked houses, then along a catwalk over the live grating and east under the crates into the Drain. On the town hall's crate, someone has painted over TOWN HALL: it says STEWARD'S HOUSE now. The Drain's ladder up is gone too, so the way back is still the aisle gate.
- **The Dark Bay.** The Mash Floor's gantry no longer drops to the troughs. Its west end goes on into Growing Bay 4, where the grow-lights failed and the Bloom began. There's no light but the Bloom's. Past the grower's notes, climb down the old grow racks, cross the bottom past a cradle under the oldest of the Bloom, with someone still in it, and climb the far side out onto the Mash Floor by the troughs, then on to the humming, the rest pod and the vat drain as before.

## 0.3.26: the Arrival Hall and the Thaw

- **Two new rooms: one in the Command Tower on every path, and a memory hall on the Dreaming Deck on the true path.** Each replaces a ladder, so each is the way on, and neither leaves you walking back the way you came.
- **The Arrival Hall.** The Observation Dome's ladder up to the Garden Gallery is gone. The Dome's east end now opens into the hall the Steward has made ready for landing day. His honour guard drill on the parade floor among crates of dress uniforms, and his arrival address plays over the speakers. Climb the grandstand at the far end, then cross back high over the floor by harpooning the brass rings at the tops of the flagpoles. The reviewing stand at the top opens into the Gallery. His terms for the new world are on the lectern. If you read them and then take the Key for yourself, the Dominion ending has one more card.
- **Memory: the Thaw.** Between the Gardens and the Helm, the Navigator remembers year 270 in the Thaw Corridor: the night it woke pod 2207, Ivo Marrant, and who came up out of the walls to meet him. The Gardens hall's hatch and the Helm hall's ladder are gone. You go in at the top of the Thaw from the Gardens hall's west end, and come out at its foot into the Helm hall.

## 0.3.25: the Winding House and the Listening Room

- **Two new rooms on the main path, one in the Engine Spine and one in the Command Tower.** Each adds a few minutes. Neither one is a dead end: you leave each by a different door from the one you came in by.
- **The Winding House.** The Crew Camp's ladder up to the Tower Lift is gone. In its place is a chained door marked WINDING HOUSE, and in the morning the chain is off. Inside is the Tower Lift's engine, running flat out with nothing on it. Cranks drive rams across the floor and down from the roof, and you climb past them up the side of the drum. The Steward's order on the wall says the clutch stays out. Throw it in at the top, and the cranks slow and the cable goes tight. The top catwalk leads out onto the Tower Lift's deck. The car comes down to meet you, and the crew are already waiting for it.
- **The Listening Room.** The Helm's hatch above the Bridge Stair is dogged down from above. The Steward sends you round by his Listening Room instead: racks of receivers, all hissing, and a dish pointed at the world below. One of his guard sits there in headphones, writing. There's a tape, one line a day for forty-one years, and his standing order. Climb the dish's feed tower and go along under the roof to the Helm's back door. If you read the tape, you have one more thing to say to him at the Helm. After his speech the hatch is open again, and it's the short way down.

## 0.3.24: the Mash Floor and the Dock

- **Two new rooms: one in the Gardens on every path, one on the Dreaming Deck on the true path.** Each adds a few minutes, and neither leaves you walking back the way you came.
- **The Mash Floor.** The Vat House's door is barred from the inside now, with Wick's bag dropped by it. The way in is down the mash hatch, into the room under the vats where everything they drain off rots pink: troughs of Bloom silt, pickers, spore pods, and the Gardener's notice. Halfway along you hear Wick humming down the pipes, and then the tune goes. A rest pod waits at the foot of the vat drain, which climbs up into the Vat House under the Gardener's gallery. Afterwards, lift the bar from the Vat House's side, and the Garden Lift is two short rooms away.
- **Memory: the Dock.** The Navigator's memory halls now include the night in year 133 when the first sleeper it ever woke, 0112, took a boat and left. It sits between the first night and the Gardens. The Gardens hall is now a checkpoint too, so there are never more than two halls between checkpoints.
- **Prompts stay on screen.** A "press up" prompt by a wall at the edge of a room no longer runs off the side of the screen.

## 0.3.23: shortcuts back

- **No more walking back the way you came.** Cody found the two new rooms' way back repetitive, so each now has a shortcut that opens once you've done what you went in for, and so does the one older dead end on the main path, Odell's Test Tank.
- **The Condenser's ladder.** A ladder by valve A, at the far end, climbs the well beside Main 3 and comes out on the Boiler Stair, just above where the main burst. While the main is open its steam rolls down the ladder and it can't be climbed; shut both valves and it goes quiet. The old crew's notice says so. The hatch at the top goes back down.
- **The turnout car.** The honour guard ride a brass car on a rail under the roof, from beside the Guard Room's bolt board to Bulkhead 1, when the bell rings. Before then it's braked: its lamp is red, and the plate on it says so (you'll see it by the bulkhead first). Draw the bolt and the brake comes off: ride it the length of the Barracks in a few seconds, over everyone's heads. It runs both ways from then on.
- **Odell's drain.** Beside the stand where his pressure boots wait, at the far end of the Test Tank's trial channel, a drain with a ladder goes straight back down to his workshop. His trial notes mention it.
- **The Barracks' bulkhead stencil** no longer runs over a window and into the wall.

## 0.3.22: the Condenser and the Guard Room

- **Two new rooms on the main path, in the Engine Spine and the Command Tower.** Each is a dead end off the way up that you have to go into and come back out of, and each changes something on the way back.
- **The Condenser.** Halfway up the Boiler Stair, a main has burst across the shaft: live steam, wall to wall. The door on the midway shelf leads into the Condenser, where the Spine's steam is turned back into water, and the old crew's notice says where Main 3 shuts off: valve A past the hot sump, valve B up on the coil tops. Shut both and the stair is clear. The crew notice, when they bring the first lift up.
- **The Guard Room.** The Barracks' bulkhead to the Dome is bolted for the night, from the Guard Room, west of the lift. The honour guard who aren't on watch stand there in racks, two tiers of them, on a full dose and eyes shut, and they don't move as you pass. One of them is awake. Drawing the bolt rings a bell down the racks, and three of them step out, between you and the way back.

## 0.3.21: the last watchman

- **The last watchman, a side quest.** On the way down to the Drain, someone up in the pipes over the Watch Gallery's watch room counts you through: "FOUR HUNDRED AND TWELVE." Home from the Ballast, the Warrens' old speakers carry a voice nobody has heard on them: Watch 4, calling a Tally Yard that no longer answers, asking for relief. Go back west through the Labyrinth to the Watch Gallery.
- **The choice.** She's a colonist the Steward's people thawed for the watch thirty years ago, and never came back for: no dose, no relief. Relieve her (Mercy +1): she gives you her name, opens the gate she kept shut, and goes home to the Warrens, where she watches the gate from the platform over it, and she's counted with the Hullfolk who reach the new world, who can now be 35. Or leave her the gate, with an order to shut it if the Ballast ever comes up the Drain (Mercy 0): on the run for the sleds it does, she holds it, and the clock gets 15 more seconds. Either way, or if you never go back, it's in every ending's epilogue.
- **The run's clock says what changed.** What it gains or loses (the pods' -0:30, Watch 4's +0:15) now shows under the way to the sleds, not beside the clock, where it ran into the weapons.

## 0.3.20: the new stoker

- **The new stoker, a side quest.** The Tower likes to be warm. While the crew sleep at the Crew Camp, the Steward's Fireman chains a man from the walls at Abel's furnace: beside Abel, if you spared him, or in his place. In the morning you hear it below: a second shovel, and a chain on the grating. Go down the camp's hatch to the Reactor Throat.
- **The choice.** The Fireman offers the Steward's compliments, a sack of shards, to walk on by. Take the sack (Mercy −1): the shards are yours, and Rivet keeps shovelling. Or tell him to let Rivet go, and fight him for it (Mercy +1 once he's unchained): Rivet goes home to the Warrens and sits by the gate, and he's counted with the Hullfolk who reach the new world, who can now be 34. Either way, or if you never go down, it's in every ending's epilogue.
- **The Fireman, the second optional fight.** A big Bloomsworn foreman with an iron rake, too heavy for the catwalks. He rakes the floor in front of him, flings burning coals from the furnace, and hauls the draught chain so fire roars up out of the grates. At half health he gets hotter: five coals, and every grate at once. A fall puts you back on the ledge by the ladder, and him back at his post.
- **Choice prompts fit their box.** A long prompt (Cotter's, the Pod Stacks') no longer runs past the edges of the choice panel.

## 0.3.19: Pod 1130

- **Pod 1130, a side quest.** When Abel's fires change, either way, the ship's power goes elsewhere, and the ship pages an attendant to the Cryo Deck: Pod 1130 is on its reserve cell, and the cell is failing. It's the pod on the ledge just inside the Pod Stacks, by the door from the Thaw Corridor, and its light is blinking red. The rest pods can take you back down.
- **The choice.** Thaw him with the last of the cell (Mercy +1): Hugo Marsh, an agronomist who was meant to plant the first fields, wakes 232 years late, like you, and goes down to the Warrens, where he sits by the fire. Or take the cell for your suit (a Suit Cell, max health +4; Mercy −1), and he never wakes.
- **If you never go,** the cell runs out on its own while you climb the Tower. Whatever happened, it's in every ending's epilogue, and the sleepers who reach the new world count him.

## 0.3.18: Wick's remedy

- **Wick's remedy, a side quest.** Home from the Gardens without Wick, look on her doorstep, up on the platform where she used to stand. Her notebook says the dose is a seed, and that it hates three things: lichen off ice that never thaws, silt from the bottom of standing water, and ash from a furnace mouth. Bound together, they make one dose.
- **The three things.** Once you've read it, they're there to find: lichen up the wall under the Cold Store's ice, silt at the bottom of the Settling Pools' deep sump, and ash by the Reactor Throat's furnace once Abel is down. Bring all three to a bench, the Warrens' or Solder's at the Crew Camp.
- **The choice.** Cut it into the Warrens' water, and the woken stop dreaming of the field (Mercy +1). Or take it yourself (Bloom −2): the only thing in the game that ever takes the Bloom down, and nothing at all once it has you. Either way it's in every ending's epilogue.

## 0.3.17: Hasp's boy

- **Hasp's boy, a side quest.** When you come home from the Gardens, Hasp is at her door in the Warrens, east of the Garden Lift. Her son Cotter, nineteen, went up the Way Down after the Wardens the night they took Shim, with a pipe, and never came home. The Wardens' tally in the Counting House has a line for him, outside the count. He's in the Muster, strapped in a dosing chair, one of the Steward's soldiers now.
- **Cotter, remembering.** Clear the room around his chair and say his mother's name, and the Bloom in him fights it, and he fights you. You can't hurt him. Stay on your feet until the fit breaks: he lunges, he slams the floor, and he leaps for the girder and hangs there, then drops where his shadow is. The dose racks vent shards as it runs down. A fall puts him back in his chair.
- **The choice.** When the fit breaks he's shaking, and his next dose is in the rack. Walk him home dry (Mercy +1): he's sick for weeks, in bed, and too weak to climb. Or give him his dose (Mercy −1): he walks home strong, does whatever he's told, and climbs with the crew as one more pair of hands. Either way he's in every ending's epilogue, and he's counted with the Hullfolk who reach the new world, who can now be 33. Settle it after the climbers have gone, and he goes home either way.

## 0.3.16: Old Gasket, in the Tower

- **The night watch.** The first time you reach the far end of the Barracks, the Steward wakes two of his honour guard in the bunks and sends them at the old man by the lift. Gasket steps out in front of the crew with his wrench and holds them off. A bar over him shows how long he can last, at the screen's edge when he's off it. Get back to him, or bring both guards down, before it runs out. Too slow, or out of the room, and he's lost.
- **His brother's boots.** In the Steward's last phase, once Marrant has come down off his dais in a dead man's boots, Gasket goes for him. Marrant turns the sidearm on him. Break off the fight and get to Gasket to pull him back, and the shot he'd readied comes at you instead. Keep fighting, and he fires.
- **Without him.** Lost, he's gone from the crew for good. The Key counts one fewer, and Lift B's brake has one fewer pair of hands, so eight climbers is no longer enough. Whoever is left speaks for the crew: they open the run for the sleds, call Lift B on three, and, if Solder is gone too, fight what the hero became. Tamp knows at the sleds. Every ending that had him says what became of him instead, and the Hullfolk who reach the new world are one fewer. If he told you he'd never seen a sky, you'll keep his promise.

## 0.3.15: the ways to Abel and the Steward

- **The Stokers' Bunks.** The Piston Run's shaft is plated over under its landing, bolted from above, so the climb goes round through a door stencilled STOKERS, into the bunks where the Steward kept the stokers he took from the walls. Read their roster, and look at the last bunk, where someone kept a Hullfolk count. Ride the steam up and the fuel line west, out onto the landing, and draw the plate's bolt: the shaft is the short way down after that. Someone up in the furnace is humming a tune you know.
- **The Steward's Rooms.** The Bridge Stair is shut above by a shutter, bolted on the landing's side, so the way to the Helm is round through the Steward's own rooms: his study, with his guard, his turrets and his daybook, and his bedroom over it, up the shelves. He talks to you there, in the voice from the Lockup's intercom. Look at what he keeps under glass. Draw the shutter's bolt from the landing, and the stair is the short way down.

## 0.3.14: Sorrel

- **Sorrel, a side quest.** Brine's sister Sorrel was taken with the others, but her cradle in the Nursery has always been empty. Release the Pruner, and in the wake it goes to a welded door at the far end of the Nursery and cuts it open, and someone runs. Follow her: through the Old Greenhouse (a new room, the Bloom's first garden, with a thorn bed and a Suit Cell in the roof frames) to the message she left Brine on the glass; home, where Brine knows her game; through the Seed Vault's frost and past chalk in the Long Aisle; down to a hatch at the bottom of the Settling Pools' deep sump, barred from below; and into the Dry Pumps under it (a new room). Then choose: bring her home to Brine, or leave her counting. Either way she's in every ending's epilogue. Brought home, she climbs with the crew, and the Hullfolk who can reach the new world go up to 32.
- **What finishing the Pruner shuts.** Finish it instead, and its welds stay: the hero hears someone counting behind the door, and the journal says why it won't open. It's the third thing a choice can close, after Flux's morning with Shim.

## 0.3.13: Cody's notes from Nov 4

- **Old Gasket and Solder are men.** Their names read as men's names, so the game now calls them he. Gasket is Shim's grandad, Wick's father and Cleat's brother.
- **The taken are found deeper in the Gardens.** The cradles aren't in the Root Cellar any more: the racks are empty, and the Wardens have hoisted the taken up and run the hoist up after them. Wick takes you up through the Gardens as far as the water works, where the cradles' air shows the way: up over the Spore Beds, to the old Nursery. Climb the Spore Beds alone, fight through the Nursery's potting floor and over its thorn pit, and find them. Send the hoist down for Wick. The Pruner's Seal Room is through a hatch under the Nursery, and the hoist is a shortcut down once it's been sent.
- **Two more rooms on the main path.** In the Labyrinth, the Muster: east of the Armory, where the Steward's soldiers are dosed. Cross its pit of live grating on the harpoon's rings, walk the girder over the dosing chairs, and drop through its hatch into the Lifeboat Dock, since the Purser keeps his office door bolted. In the Ballast, the Pump Heads: Solder wedged the Pump Gallery's door behind him, so go up the Drain Shaft's wall and over the heads of the three great pumps, and down his wet ladder.

## 0.3.12: Cody's notes from playing 0.3.10

- **Who's talking.** A small marker bobs over whoever is speaking, the hero included. Someone still hiding in their home speaks from its doorway, and their name reads "…, IN THE WALLS".
- **Choice screens fit.** The GAIN and LOSE lines wrap inside the confirm box, which grows to fit them. Blowing the beam with the charges no longer runs off the screen.
- **People walk on the floor.** Anyone walking follows the floor, down and up its steps, instead of walking straight across the air. At the tram station Solder walks down to the winch. He gets in the tram first and you see him in its window. Then you get in, and only then does it leave.
- **The Jammed Hatch can't be jumped.** It fills the passage from floor to ceiling.
- **The run keeps its music.** While the clock runs, the Warrens play the run's music like everywhere else.
- **Mara.** No one says what she is to the hero; the dreams and the memory say it.
- **Why the climb, and why back down.** In the plan at home, Gasket and Solder say what the Helm key is for: it steers the Ark, and they mean to take the ship down to the new world. When the ship starts to tear itself apart, Gasket says why everyone runs back down: the only way off is the old crew's landing sleds, at the bottom of the ship.
- **The Gardener dosed Wick.** She says so in the Vat House, and the hero sees it. The journal says it, and the hero remembers it in the Tower before choice 11.
- **Old Gasket comes round.** Talk to him at home after you bring Shim back, and he hangs up the wrench he's kept by him since you came ("YOU HAVEN'T. YET."). Later he shows you his brother Cleat's count of days on the wall by his door. What you do for him and the village adds up. At the Crew Camp, if he trusts you, he tells you what he's never told anyone.
- **The Counting House.** The way to the first Warden is longer now. The Bailiff's door is shut from his side, and the way on is up a ladder from the Collection Block into the Counting House, four screens tall, where the Wardens count the taken. Climb the counting floor's tiers to the cage rail under the roof. Shim's cage goes along it ahead of you, calling out. Then drop down the cage chute into the Bailiff's Hall.
- **The run for the sleds comes apart.** The clock is 2:40, down from 4:30, which was five times what the run needs. Launching the pods costs 30 seconds. While it runs, the ship comes apart: a girder pile across the Warrens' hall to climb over, the Coolant Hall's floor fallen into the coolant with only the girders standing up out of it, the Thaw Corridor's ceiling down to a squeeze, and fires, cracks and sparking cables everywhere, with the ceilings coming down more often.
- **What closed the other way.** The card after a Crash, Dominion or Overgrown ending says what's under the Helm and why it stayed shut, instead of "the seal read the Bloom". At the seal, the hero says what it's reading for.

## 0.3.11: the second route that closes, a morning, the tram home, Wick's longer walk, two new rooms, and the audit's story fixes

- **Two new rooms on the way.** In the Labyrinth, the Long Aisle's west end is gated now, and the way on is up into **the Watch Gallery** over it, where the Steward's men kept watch: turrets, live grating, a guard, and the gate's lever at the far end. In the Ballast, Odell's boots aren't in his workshop any more but at the end of **his Test Tank** above it, down a channel of silt pits and a pool.
- **More time with Wick.** After the cradles she doesn't stay behind straight away: she walks up with you through the Garden Lift's hall and the Terraces to open the cradles' air in the Irrigation Works, and sits you down on a pod there to patch you up before she goes back to them. Anyone walking with you now catches up when you climb or swim away from them.
- **The tram home.** Once the motor is in the winch, you ride the keel tram home to the Warrens, with Solder if he lived, and see what the raid left with your own eyes: the gate's news, the village talked out of the walls if it fell, Solder's news if he didn't come, Flux by the fire. Then the climbers pack, and Gasket gives you time: to sleep at home first, and to go up and say goodbye at Mara's pod. The climbers ride back east with you to the foot of the Engine Spine, and build the lifts behind you as before. If the keel flooded behind Solder, the tram stops at the Ballast stop, and you lead them through the Overflow Pipes.
- **The gate's cave-in.** If you upgraded the pistol instead of giving it to the gate, the Bloomsworn break the gate while you're in the Ballast, and the west end of the Warrens' hall comes down with it. The way out to the Way Down is buried. The way round is the hole by the homes, down into **the deep walls**, where the Hullfolk hid: a vent too low to stand in, a shaft, and Bloomsworn nests on the way back to a door low in the Way Down. On the run for the sleds it's the long way, with the same clock. Gasket tells you where to go, and so does the bar under the clock. With the gate held, the hall stays whole, and the deep walls stay shut.
- **The villains, met sooner, and the small things paid off.** The Steward gives his name in his broadcast, the Gardener gives hers in the Vat House and says why she grows the Bloom, and Abel's name is on the Steward's lists before you meet him. On the truth path Shim gets on the camp's line phone. Gasket's brother has a name, and the Homecoming epilogue opens the seed vault, keeps Dunn's promise of a star, and returns Odell's boots, with a new picture for each.
- **A morning that a choice can take away.** Let Flux fly home in the Labyrinth, and the first time you rest at home after, it's morning: Shim shows you his father, and Flux strips his spent pack for Solder's bench (30 scrap). Take his pack instead, and that morning never comes, and the journal says so.

## 0.3.10: Cody's calls on the story audit

Cody read the [story audit](https://claude.ai/artifact/SMRYSh6QmPqsC6SseGEoZC) and picked. This is the first part of building it; `HANDOFF.md` says what's next.

- **Mara, revealed slowly.** The hero dreams on each of the story's four nights, and each dream is clearer and longer than the last: two pods in the cold (the raid cuts it off), a lamp and a list, a kitchen in the rain with two tickets, and boarding day, when Mara goes under first. 312 years asleep took the hero's memory, and it comes back a night at a time. Around the dreams there's a voice before the first card, the hero turning to 0418 on waking, a thaw the ship refuses, Shim's "IS SHE A GHOST TOO?" ("NOT A GHOST."), and a few lines from Wick, the freed Tallyman and Gasket. Mara's list comes back while you play, as thoughts over the hero's head that don't stop you. Nobody says "sister" until the end. The hero stays a mystery: the dreams show silhouettes, and nobody says the hero's name.
- **Pictures behind the epilogue.** Every ending's cards now sit under a small pixel scene: Shim on the ground, Gasket breathing out or counting by the fire, Solder's gate, the village with its lanterns, the Wardens, the pods, Mara under the sky, the Navigator's lamp, the Deserter's boat. They're drawn in code, placeholders like the rest of the art.
- **Spare shards become scrap.** Shards still level the weapon in hand. Any it can't use (it's at level 3, or nothing's out) are kept as scrap, shown beside the XP bar. Solder's bench, by his door in the Warrens (and at the Crew Camp if he came up alive), turns scrap into Plating (+2 health, three times), a shard Magnet (twice) and Steady Hands (a hit costs half the shards).
- **A route that closes.** Leave Solder under the beam and nobody holds the culvert: the keel line floods behind you, its shutter jams, and the way to the Spine is down through the **Overflow Pipes**, a new room under the station with a flooded sump, eels and a drowned Warden. With Solder alive, the pipes are only a dare, with a Suit Cell at the end.

## How the rooms are checked

Every gap on the main path can be jumped with room to spare: 5 tiles or less (a running jump reaches 7, but only with a pixel-perfect run-up). Gaps that aren't meant to be jumped are 9 tiles or more, with another route in view. `hollow-ark/tests/rooms-check.js` plays every room with the game's own movement code: swimming, the pressure boots, belts, steam vents (ridden to the top, or partway, and stepped off), both thruster packs, the Grapple Harpoon fired as it is in the game (including a burn straight after leaping off a ring), and the Foam Sprayer's platforms set and stood on, from water or hopping across silt. It fails the build if any entrance (an edge, or a lift or ladder from another room), item, person, switch or rest pod can't be reached with the abilities the hero has by then, if a secret meant for an ability can be reached without it (that includes a way through a door only an ability opens, like the Seed Vault's hatch or a cracked wall, and an exit a room marks as needing one, like the Sorting Floor's way up to the Yard), if a room with cranes can't be crossed from every way in whichever slots its stacks are in (or a room whose doors and water follow the story, like the Silt Tank, either way), if a room with water can't be crossed again in the boots, which sink where the hero used to float, if there's anywhere the hero can get to but not get back out of, if a gap is exactly 7 tiles wide, if a hint runs into a wall, or if a room's legend reuses a letter that means an enemy everywhere. Timed hazards (the Spine's pistons, a drone's steam) aren't walls, so the checker crosses a room as if they were quiet. Before the real rooms it plays seven small test rooms (one per ability, and one for each way foam is used) to prove each one opens exactly what it should.

## How it's built

| Path | What it is |
| --- | --- |
| `docs/hollow-ark/` | The game: HTML5 canvas and plain JavaScript, with no engine and no build step. GitHub Pages serves it from here. |
| `hollow-ark/desktop/` | Electron shell that packages those same files as Windows, macOS and Linux apps (Steam-ready in Phase 5). |
| `docs/hollow-ark/js/areas/` | The rooms, one file per area, drawn as text maps (the legend is at the top of each file). |
| `docs/hollow-ark/js/story/`, `js/bosses/` | Each area's story (scenes, lines, logs) and each boss, one file each, from Phase 3 on. |
| `hollow-ark/tests/` | The room checker; `playthrough.js`, which plays every ending from a new game (see Phase 3.8); and a check that plays the whole story so far (the Gardens, the Warrens return, the Cargo Labyrinth to the Deserter ending, the Flooded Ballast to the keel tram, the Engine Spine to the Tower Lift, the Command Tower to every ending after the Steward: the run for the sleds to Crash, Dominion, Overgrown fought as Solder, and the true path down Lift B through the Dreaming Deck to Homecoming), upgrades a Phase 2 save and plays all five endings, in Chromium, Firefox and WebKit (Safari's engine). |
| `.github/workflows/hollow-ark.yml` | CI. On Windows, macOS and Linux it checks the rooms, plays the slice in all three browser engines, plays all five endings from a new game, builds each desktop app, launches it, plays a few seconds and uploads it. |

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
