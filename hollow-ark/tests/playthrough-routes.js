'use strict';
// The routes playthrough.js plays. Each is a choice policy (a choice is known by its first option) and a list of
// segments, one per stretch of the story, shared by every route. A segment's steps are PT.<something> run in the
// page (see playthrough-lib.js); r.to walks the ship to a room, and r.boss falls once in a fight and then wins it.

const slice = {
  name: 'slice',
  async play(r) {
    await r.do('PT.read("mara")');
    await r.do('PT.take("pistol")');
    await r.to('warrens');
    await r.do('PT.rest()'); // the raid
    await r.do('PT.clear("collector")');
    await r.to('arena');
    await r.boss('arena', 'HA.ui.world.state.flags.bossDefeated');
  },
};

const gardens = {
  name: 'gardens',
  async play(r) {
    await r.to('arena'); // Wick waits in the Bailiff's Hall in the morning
    await r.to('root-cellar'); // the racks are empty: the Wardens hoisted the taken up to the Nursery
    await r.bulbs();
    await r.to('terraces');
    await r.do('PT.take("scatter")');
    await r.to('nursery'); // up through the water works (Wick's sit-down) and the Spore Beds; the taken, found
    // The planters go up to the ceiling now: out of the potting floor's west end into the Intake (the tenth batch of
    // new rooms), the standing order and the bins, and back into the Nursery along the duct over the planters.
    await r.to('intake');
    await r.do('PT.read("intake")');
    await r.do('PT.read("bins")');
    await r.do('PT.exit("right", "nursery", 29)');
    await r.to('seal-room');
    await r.boss('seal-room');
    await r.to('nursery'); // the cradles open
    // Released, the Pruner cut the Old Greenhouse's door in the wake, and someone ran: Sorrel's trail starts.
    if (await r.get('!!HA.ui.world.state.flags.greenhouse')) {
      await r.to('greenhouse');
      await r.do('PT.read("sorrelGlass")');
    }
    // The Vat House's door is barred from inside: down the mash hatch onto the Mash Floor's gantry, round through
    // the Dark Bay (the grower's notes, 0391's cradle) to the troughs, and up the vat drain.
    await r.to('mash-floor');
    await r.to('dark-bay');
    await r.do('PT.read("grower")');
    await r.do('PT.goCol(18)');
    await r.do('PT.exit("right", "mash-floor", 16)'); // the lower way out, onto the troughs
    await r.to('vat-house');
    await r.boss('vat-house');
    // The quick way back: the bar, lifted from the Vat House's side.
    await r.to('vat-walk');
    await r.do('PT.read("vatBar")');
    await r.to('warrens');
  },
};

const home = {
  name: 'home',
  async play(r) {
    await r.do('PT.talk("shim")');
    await r.do('PT.talk("gasket")');
    await r.do('PT.talk("solder")');
    // Hasp at her door, asking after her son (story/cotter.js), on the routes that go and find him.
    if (r.route.cotter) {
      await r.do('PT.near(HA.ui.world.npcs.find((n) => n.id === "hasp"))');
      await r.do('PT.settle()');
    }
    // Wick's notebook on her doorstep (story/remedy.js), on the routes that make her remedy.
    if (r.route.remedy) await r.do('PT.read("wickNotebook")');
    await r.do('PT.rest()'); // the night Solder leaves
    await r.to('sump');
  },
};

const cargo = {
  name: 'cargo',
  async play(r) {
    await r.to('stacks');
    await r.do('PT.flip("craneA")');
    await r.do('PT.flip("craneB")');
    await r.to('armory');
    await r.do('PT.take("harpoon")');
    // The Muster's girder no longer drops into the dosing hall: east along it into the Dose Line (the tenth batch of
    // new rooms), the standing order and the shift's rack, and back into the hall from the counting room.
    await r.to('muster');
    await r.to('dose-line');
    await r.do('PT.read("doseline")');
    await r.do('PT.read("doserack")');
    await r.do('PT.exit("left", "muster", 17)');
    // Cotter in the Muster's chairs: told his mother's name, he fights the dose until the fit breaks; then the choice.
    if (r.route.cotter) {
      await r.do('PT.clear()');
      await r.do('PT.talk("cotter")');
      await r.do('PT.fight(() => !!HA.ui.world.state.people.cotter)');
      await r.do('PT.settle()');
    }
    await r.to('lifeboat-dock'); // through the Muster and down its hatch (the office door is bolted): the deserter
    await r.do('PT.talk("purser")');
    // With Flux's Bloomfire the Yard is in reach at once, and the Cold Store's ice waits for a Breach Charge.
    const bloomfire = (await r.get('HA.ui.world.state.abilities.thruster')) === 'bloomfire';
    // The first of Wick's three things grows under the Cold Store's ice, by Odell.
    const lichen = async () => r.route.remedy && (await r.do('PT.read("remedyLichen")'));
    if (!bloomfire) {
      await r.to('cold-store');
      await r.do('PT.read()'); // Odell, and his pack
      await lichen();
    }
    await r.to('tally-yard');
    await r.boss('tally-yard');
    await r.to('vault');
    await r.do('PT.take("charges")');
    if (bloomfire) {
      await r.to('hatch-drop');
      await r.do('PT.blast("ice")');
      await r.to('cold-store');
      await r.do('PT.read()');
      await lichen();
    }
    await r.to('sorting-floor');
    await r.do('PT.blast("aisle")');
    // The aisle gate is shut: up into the Watch Gallery, out of the watch room into the City Hold (the manifest),
    // and down past the First City's crates into the Drain.
    await r.to('city-hold');
    await r.do('PT.read("city")');
    await r.to('drain');
    await r.do('PT.read()'); // Solder's toolbag
    await r.to('ballast-intake');
  },
};

const ballast = {
  name: 'ballast',
  async play(r) {
    await r.to('pump-heads'); // the Pump Gallery's door from the Intake is wedged: round over the pump heads
    await r.to('pump-gallery'); // down Solder's ladder: Solder, and the Foam Sprayer
    await r.bulbs();
    await r.to('tank-farm');
    await r.to('test-tank'); // up from Odell's Workshop
    await r.do('PT.read("boots")');
    await r.do('PT.link("odell-workshop")'); // Odell's drain beside the stand, the shortcut back (0.3.23)
    await r.to('silt-tank');
    await r.boss('silt-tank', undefined, { enter: 'PT.trigger(0)' }); // out over her water, and the shutters come down
    // The second of Wick's three things, at the bottom of the Settling Pools' deep sump.
    if (r.route.remedy) {
      await r.to('settling-pools');
      await r.do('PT.read("remedySilt")');
    }
    // The glass said down the drain: the hatch at the bottom of the Settling Pools, and Sorrel at the Dry Pumps.
    if (await r.get('!!HA.ui.world.state.logs.sorrelGlass')) {
      await r.to('dry-pumps');
      await r.do('PT.settle()');
    }
    await r.to('valve-hall');
    await r.bulbs();
    await r.do('PT.pace("solder", () => PT.scene() === "flood")');
    await r.do('PT.settle()');
    await r.do('PT.pace("solder", () => PT.scene() === "jammed")');
    await r.do('PT.settle()');
    await r.do('PT.read("winch")'); // and the tram home, to the sump
    await r.to('warrens'); // the raid's news, Solder's, Flux's; then the tram waits
    // Once home is quiet, Watch 4's call on the old speakers (story/watch.js). Answered: back west through the
    // Labyrinth to the Watch Gallery, into the watch room for her choice, and home again for the tram.
    await r.do('PT.tick(120)');
    await r.do('PT.settle()');
    if (r.route.watch) {
      await r.to('watch-gallery');
      await r.do('PT.goCol(20)');
      await r.do('PT.settle()');
      await r.to('warrens');
    }
  },
};

const spine = {
  name: 'spine',
  async play(r) {
    await r.to('spine-foot'); // east on the tram with the climbers (or to the Ballast stop, and through the pipes)
    await r.bulbs();
    // Off the Foot's top ledge into the Crew Mess (the ninth batch of new rooms; it was a ladder): the old crew's
    // notice and the door frame, and out into the foot of the Boiler Stair.
    await r.to('crew-mess');
    await r.do('PT.read("mess")');
    await r.do('PT.read("heights")');
    await r.to('boiler-stair');
    // Main 3 has burst across the Boiler Stair over its midway shelf: into the Condenser off the shelf, shut it at
    // both its valves (B on the coil tops, then A at the far end), and up the ladder by A to the stair above the
    // burst, the shortcut back (the fourth batch of new rooms, and its shortcuts in 0.3.23).
    await r.to('condenser');
    await r.do('PT.read("condenser")');
    await r.do('PT.read("valveB")');
    await r.do('PT.read("valveA")');
    await r.do('PT.link("boiler-stair")');
    await r.to('stokers-bunks'); // the Piston Run's shaft is plated over: round through the bunks, out above the plate
    await r.to('reactor-throat');
    await r.boss('reactor-throat');
    if (r.route.remedy) await r.do('PT.read("remedyAsh")'); // the last of Wick's three things, by the furnace mouth
    await r.to('crew-camp'); // the night, and the Purser's last call
    if (r.route.remedy) await r.do('PT.read("bench")'); // Solder binds Wick's remedy; then the choice
    // Pod 1130's alarm started after choice 10: back down by the pods to the Pod Stacks, and up again.
    if (r.route.pod) {
      await r.do('PT.travel("thaw-corridor")');
      await r.to('pod-stacks');
      await r.do('PT.read("pod1130")');
      await r.to('thaw-corridor');
      await r.do('PT.travel("crew-camp")');
    }
    // In the morning, someone new at Abel's furnace (story/stoker.js): down the camp's hatch to the Throat, through
    // the shutter to the Fireman's offer, and, told to let his stoker go, his fight.
    if (r.route.stoker) {
      await r.to('reactor-throat');
      await r.do('PT.goCol(12)');
      await r.do('PT.settle()');
      if (await r.get('HA.ui.world.state.people.rivet === "unchain"')) await r.boss('reactor-throat', 'HA.ui.world.state.people.rivet === "freed"', { enter: 'PT.goCol(12)' });
      await r.to('crew-camp');
    }
    // The camp's way on is the Winding House (the sixth batch of new rooms): up through the Tower Lift's engine,
    // and the clutch in at the top, by the way out onto the lift's deck.
    await r.to('winding-house');
    await r.do('PT.read("winding")');
    await r.do('PT.read("clutch")');
    await r.to('tower-lift'); // the crew's verdict
  },
};

const tower = {
  name: 'tower',
  async play(r) {
    // The far end of the Barracks wakes the Steward's night watch, and they go for Old Gasket by the lift
    // (story/gasket.js). Most runs go back for him; a run that leaves him walks on, out into the Dome.
    await r.to('barracks');
    await r.do('PT.goCol(70)');
    await r.do('PT.settle()');
    if (!r.route.leaveGasket) {
      await r.do('PT.walk("left", () => !HA.ui.world.gasketHold || HA.ui.world.gasketHold.state !== "holding")');
      await r.do('PT.clear("nightWatch")');
    }
    // The bulkhead to the Dome is bolted for the night from the Guard Room, west of the lift. Drawing the bolt rings
    // the bell, three of the racked guard step out, and the turnout car's brake comes off: ride it back to the
    // bulkhead (the fourth batch of new rooms, and its shortcuts in 0.3.23).
    await r.to('guard-room');
    await r.do('PT.read("standing")');
    await r.do('PT.read("guardBolt")');
    await r.do('PT.link("barracks")');
    await r.to('observation-dome');
    // The Dome's ladder went: east through the Arrival Hall, up by the flagpoles' rings, and the terms on the
    // lectern (the seventh batch of new rooms).
    await r.to('arrival-hall');
    await r.do('PT.read("arrivalTerms")');
    await r.to('garden-gallery'); // the Gardener
    await r.to('steward-rooms'); // the Bridge Stair is shut above: round through his rooms, out above the shutter
    // The Helm's hatch is dogged down: the Steward sends the hero round by his Listening Room (the sixth batch).
    await r.to('listening-room');
    await r.do('PT.read("listenTape")');
    await r.to('helm');
    await r.boss('helm', 'HA.ui.world.state.people.steward');
  },
};

// The true path: Lift B down to the Dreaming Deck, the Navigator, and choice 14.
const deck = {
  name: 'deck',
  async play(r) {
    // the memory halls, down through the Thaw (the seventh batch of new rooms) to the Helm hall, and out of its east
    // end down through the Burn (the ninth) to the Sphere
    await r.to('hall-thaw');
    await r.to('hall-burn');
    await r.to('sphere');
    await r.boss('sphere', 'HA.ui.world.state.flags.navTurned');
    await r.to('quiet');
  },
};

// The scuttle: down to the sump with the crew, then the run for the sleds, launching the pods on the way.
// A game quit during the run starts it again from the sump, so the run is quit once on purpose.
const scuttle = {
  name: 'scuttle',
  async play(r) {
    await r.to('warrens');
    await r.reload('sump');
    // Up through the Warrens, as the run is meant to go (the Cold Store's lift is a way round it).
    await r.to('pod-stacks', { avoid: ['hatch-drop'] });
    await r.do('PT.read("podLaunch")');
    await r.to('cryo-bay');
    await r.do('PT.goCol(22)');
    // How much of the clock a runner who knows the way, and stops for the pods, has left at the sleds.
    const left = await r.get('Math.round(HA.ui.world.runLeft / 60)');
    const clock = await r.get('Math.round(HA.story.runClock / 60)');
    r.log.push(`the run: ${left}s of ${clock}s left at the sleds`);
    await r.do('PT.walk("left", () => PT.scene() === "sledsAway")');
    await r.do('PT.settle()');
  },
};

// Overgrown: the crew fight what the hero became.
const overgrown = {
  name: 'overgrown',
  async play(r) {
    await r.boss('helm', 'HA.ui.mode !== "play"');
  },
};

const TRUE = {
  'RELEASE IT': 'RELEASE IT',
  'EAT IT': 'NOT NOW',
  'GIVE IT SOMETHING ELSE TO CUT': 'GIVE IT',
  "KEEP WICK'S LANCETS": 'KEEP',
  'TELL HIM EVERYTHING': 'EVERYTHING',
  'GIVE IT TO THE GATE': 'GIVE IT',
  'LET HIM FLY HOME': 'FLY HOME',
  STAY: 'STAY',
  'LET IT FINISH ITS COUNT': 'FINISH ITS COUNT',
  'BLOW THE BEAM': 'BLOW THE BEAM',
  'LEAVE HIM HIS FIRES': 'LEAVE HIM',
  'TELL HIM THE TRUTH': 'TRUTH',
  'SPARE HER': 'SPARE HER',
  'SPARE HIM': 'SPARE HIM',
  'BRING HER HOME': 'BRING HER HOME',
  'WALK HIM HOME DRY': 'DRY',
  'CUT IT INTO THE WATER': 'WATER',
  'THAW HIM': 'THAW',
  'UNCHAIN HIM': 'UNCHAIN',
  'RELIEVE HER': 'RELIEVE',
  'LAUNCH THE PODS': 'LAUNCH',
  'TAKE ITS CORE TO THE NEW WORLD': 'LET IT REST',
};
const THROUGH_TOWER = [slice, gardens, home, cargo, ballast, spine, tower];

module.exports = {
  // Every Homecoming requirement met, the Navigator's course cut, and the Navigator let rest.
  homecoming: {
    ending: 'homecoming',
    policy: TRUE,
    cotter: true,
    remedy: true,
    pod: true,
    stoker: true,
    watch: true,
    segments: [...THROUGH_TOWER, deck],
    check: {
      'every requirement met': (e) => e.crew >= 8 && e.bloom <= 2 && e.people.solder === 'alive' && Object.values(e.wardens).every((x) => x === 'release'),
      'Gasket held the night watch, and was pulled back at the Helm': (e) => e.people.gasket === null && e.lines.includes("HE SAID CLEAT'S NAME TO THE SKY."),
      'the Navigator let rest': (e) => e.people.navigator === 'rest',
      'the freed Wardens remember their names': (e) => e.lines.includes('MY NAME WAS USHER.'),
      'Sorrel brought home': (e) => e.people.sorrel === 'home' && e.lines.includes('SORREL COUNTED THEM IN.'),
      'Cotter walked home dry': (e) => e.people.cotter === 'dry' && e.lines.includes('HASP WALKED BEHIND HIM, IN CASE.'),
      "Wick's remedy cut into the water": (e) => e.lines.includes('AND DREAMED OF IT.'),
      'Pod 1130 thawed': (e) => e.people.pod1130 === 'thawed' && e.lines.includes('232 YEARS LATE, HE SAID, AND RIGHT ON TIME.'),
      'Rivet unchained, and home': (e) => e.people.rivet === 'freed' && e.lines.includes('HE SAID THE WIND WAS THE COOLEST THING HE EVER FELT.'),
      'Watch 4 relieved, and home': (e) => e.people.watch === 'relieved' && e.lines.includes('SHE COUNTED EVERY ONE OF US OUT. THEN SHE STOPPED.'),
      'Shim carries the lantern': (e) => e.lines.includes("HE CARRIED HIS MOTHER'S LANTERN."),
    },
  },
  // Some kindness, some harm: a Warden's core torn out, Solder left behind, the pistol upgraded (the gate falls).
  crash: {
    ending: 'crash',
    policy: {
      ...TRUE,
      'GIVE IT SOMETHING ELSE TO CUT': 'FINISH IT',
      'TELL HIM EVERYTHING': "SHE WASN'T SCARED",
      'GIVE IT TO THE GATE': 'UPGRADE',
      'LET IT FINISH ITS COUNT': 'TAKE ITS CORE',
      'BLOW THE BEAM': 'LEAVE HIM',
      'LEAVE HIM HIS FIRES': 'PUT THE FIRES OUT',
      'SPARE HER': 'WALK PAST',
      'SPARE HIM': "WARDENS' COUNT",
      'RELIEVE HER': 'THE GATE',
    },
    leaveGasket: true,
    watch: true,
    segments: [...THROUGH_TOWER, scuttle],
    check: {
      'Solder left behind, the gate fallen': (e) => e.people.solder === 'dead' && e.warrensRaid === 'fell',
      'Gasket left to the night watch': (e) => e.people.gasket === 'dead' && e.lines.includes('TAMP COUNTED THEM AT LIGHTS-OUT NOW.'),
      'the pods launched': (e) => e.podsLaunched > 0 && e.lines.includes('THE PODS CAME DOWN LIKE SEEDS.'),
      'the Old Greenhouse stayed welded': (e) => !e.people.sorrel,
      'two cores taken': (e) => e.wardens.pruner === 'salvage' && e.wardens.tallyman === 'salvage' && e.lines.includes('COUNT: WARDENS, 1.'),
      "Pod 1130's alarm never answered": (e) => !e.people.pod1130 && e.lines.includes("POD 1130'S ALARM STOPPED WHILE I WAS CLIMBING."),
      'the new stoker never gone to see': (e) => !e.people.rivet && e.lines.includes('I NEVER WENT DOWN TO SEE WHO WAS FEEDING IT.'),
      'Watch 4 left her gate, and held the Drain': (e) => e.people.watch === 'held' && e.lines.includes('SHE NEVER ASKED FOR RELIEF AGAIN.'),
    },
  },
  // Mercy far below -3: every Warden's core, the lie, Flux's pack, the Gardener dosed, the Steward ended, the Key kept.
  dominion: {
    ending: 'dominion',
    policy: {
      ...TRUE,
      'RELEASE IT': 'SALVAGE',
      'GIVE IT SOMETHING ELSE TO CUT': 'FINISH IT',
      'TELL HIM EVERYTHING': 'LIE',
      'GIVE IT TO THE GATE': 'UPGRADE',
      'LET HIM FLY HOME': 'TAKE HIS PACK',
      'LET IT FINISH ITS COUNT': 'TAKE ITS CORE',
      'LEAVE HIM HIS FIRES': 'PUT THE FIRES OUT',
      'TELL HIM THE TRUTH': 'KEEP LYING',
      'SPARE HER': 'OWN DOSE',
      'SPARE HIM': 'END HIM',
      'CLAIM THE KEY': 'CLAIM',
      'WALK HIM HOME DRY': 'DOSE',
      'CUT IT INTO THE WATER': 'YOURSELF',
      'THAW HIM': 'TAKE THE CELL',
      'UNCHAIN HIM': 'TAKE THE SACK',
    },
    cotter: true,
    remedy: true,
    pod: true,
    stoker: true,
    segments: THROUGH_TOWER,
    check: {
      'Mercy -3 or less': (e) => e.mercy <= -3,
      'every Warden counted for a new master': (e) => Object.values(e.wardens).every((x) => x === 'salvage') && e.lines.includes('COUNT THEM.'),
      'Cotter given his dose, and climbing': (e) => e.people.cotter === 'dosed' && e.lines.includes('I HAD THE RACKS NOW.'),
      "Wick's remedy taken by the hero": (e) => e.lines.includes("WICK'S REMEDY WENT INTO ME."),
      "Pod 1130's cell taken": (e) => e.people.pod1130 === 'cell' && e.lines.includes("POD 1130'S CELL KEPT ME ON MY FEET."),
      "Rivet left at the fires for the Steward's sack": (e) => e.people.rivet === 'left' && e.lines.includes('RIVET STILL FEEDS THE FIRES. I SEND HIM HIS DOSE.'),
      "Watch 4's call heard, never answered": (e) => !e.people.watch && e.lines.includes("I'VE NEVER ANSWERED."),
    },
  },
  // Bloom 8 and more: the Thorn, Bloomfire, the Bloom on the hatch, and every bulb eaten. Mercy stays kind.
  overgrown: {
    ending: 'overgrown',
    eatBulbs: true,
    policy: {
      ...TRUE,
      'EAT IT': 'EAT IT',
      "KEEP WICK'S LANCETS": 'THORN',
      'BRING HER HOME': 'LEAVE HER COUNTING',
      'LET HIM FLY HOME': 'TAKE HIS PACK',
      'BLOW THE BEAM': 'EAT THE BLOOM',
    },
    segments: [...THROUGH_TOWER, overgrown],
    check: {
      'Bloom 8 or more': (e) => e.bloom >= 8,
      'the pod glass': (e) => e.lines.includes('ON 0418 FIRST.'),
      'Sorrel left counting': (e) => e.people.sorrel === 'stayed' && e.lines.includes('THEN THE COUNTING DID.'),
      'the new stoker never gone to see': (e) => !e.people.rivet && e.lines.includes('THE FURNACE WENT OUT WHEN THE PINK CAME UP THE SPINE.'),
      "Watch 4's call heard, never answered": (e) => !e.people.watch && e.lines.includes("THE LAST VOICE ON THE SHIP'S SPEAKERS ASKED FOR RELIEF."),
    },
  },
  // The Purser's boat, taken in the Labyrinth, from the save the Homecoming run left as it went down the hatch.
  deserter: {
    ending: 'deserter',
    from: 'homecoming-home',
    policy: { ...TRUE, STAY: 'TAKE THE BOAT' },
    segments: [cargo],
    check: { 'Mara left behind': (e) => e.lines.includes('I LEFT MARA IN 0418.') },
  },
};
