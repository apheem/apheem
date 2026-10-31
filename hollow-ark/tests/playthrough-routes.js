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
    await r.to('root-cellar');
    await r.bulbs();
    await r.to('terraces');
    await r.do('PT.take("scatter")');
    await r.to('seal-room');
    await r.boss('seal-room');
    await r.to('root-cellar'); // the cradles open
    await r.to('vat-house');
    await r.boss('vat-house');
    await r.to('warrens');
  },
};

const home = {
  name: 'home',
  async play(r) {
    await r.do('PT.talk("shim")');
    await r.do('PT.talk("gasket")');
    await r.do('PT.talk("solder")');
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
    await r.to('lifeboat-dock'); // the deserter
    await r.do('PT.talk("purser")');
    // With Flux's Bloomfire the Yard is in reach at once, and the Cold Store's ice waits for a Breach Charge.
    const bloomfire = (await r.get('HA.ui.world.state.abilities.thruster')) === 'bloomfire';
    if (!bloomfire) {
      await r.to('cold-store');
      await r.do('PT.read()'); // Odell, and his pack
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
    }
    await r.to('sorting-floor');
    await r.do('PT.blast("aisle")');
    await r.to('drain');
    await r.do('PT.read()'); // Solder's toolbag
    await r.to('ballast-intake');
  },
};

const ballast = {
  name: 'ballast',
  async play(r) {
    await r.to('pump-gallery'); // Solder, and the Foam Sprayer
    await r.bulbs();
    await r.to('tank-farm');
    await r.to('test-tank'); // up from Odell's Workshop
    await r.do('PT.read("boots")');
    await r.to('silt-tank');
    await r.boss('silt-tank', undefined, { enter: 'PT.trigger(0)' }); // out over her water, and the shutters come down
    await r.to('valve-hall');
    await r.bulbs();
    await r.do('PT.pace("solder", () => PT.scene() === "flood")');
    await r.do('PT.settle()');
    await r.do('PT.pace("solder", () => PT.scene() === "jammed")');
    await r.do('PT.settle()');
    await r.do('PT.read("winch")'); // and the tram home, to the sump
    await r.to('warrens'); // the raid's news, Solder's, Flux's; then the tram waits
  },
};

const spine = {
  name: 'spine',
  async play(r) {
    await r.to('spine-foot'); // east on the tram with the climbers (or to the Ballast stop, and through the pipes)
    await r.bulbs();
    await r.to('boiler-stair');
    await r.to('reactor-throat');
    await r.boss('reactor-throat');
    await r.to('crew-camp'); // the night, and the Purser's last call
    await r.to('tower-lift'); // the crew's verdict
  },
};

const tower = {
  name: 'tower',
  async play(r) {
    await r.to('observation-dome');
    await r.to('garden-gallery'); // the Gardener
    await r.to('helm');
    await r.boss('helm', 'HA.ui.world.state.people.steward');
  },
};

// The true path: Lift B down to the Dreaming Deck, the Navigator, and choice 14.
const deck = {
  name: 'deck',
  async play(r) {
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
  'LAUNCH THE PODS': 'LAUNCH',
  'TAKE ITS CORE TO THE NEW WORLD': 'LET IT REST',
};
const THROUGH_TOWER = [slice, gardens, home, cargo, ballast, spine, tower];

module.exports = {
  // Every Homecoming requirement met, the Navigator's course cut, and the Navigator let rest.
  homecoming: {
    ending: 'homecoming',
    policy: TRUE,
    segments: [...THROUGH_TOWER, deck],
    check: {
      'every requirement met': (e) => e.crew >= 8 && e.bloom <= 2 && e.people.solder === 'alive' && Object.values(e.wardens).every((x) => x === 'release'),
      'the Navigator let rest': (e) => e.people.navigator === 'rest',
      'the freed Wardens remember their names': (e) => e.lines.includes('MY NAME WAS USHER.'),
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
      'BLOW THE BEAM': 'LEAVE HER',
      'LEAVE HIM HIS FIRES': 'PUT THE FIRES OUT',
      'SPARE HER': 'WALK PAST',
      'SPARE HIM': "WARDENS' COUNT",
    },
    segments: [...THROUGH_TOWER, scuttle],
    check: {
      'Solder left behind, the gate fallen': (e) => e.people.solder === 'dead' && e.warrensRaid === 'fell',
      'the pods launched': (e) => e.podsLaunched > 0 && e.lines.includes('THE PODS CAME DOWN LIKE SEEDS.'),
      'two cores taken': (e) => e.wardens.pruner === 'salvage' && e.wardens.tallyman === 'salvage' && e.lines.includes('COUNT: WARDENS, 1.'),
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
    },
    segments: THROUGH_TOWER,
    check: {
      'Mercy -3 or less': (e) => e.mercy <= -3,
      'every Warden counted for a new master': (e) => Object.values(e.wardens).every((x) => x === 'salvage') && e.lines.includes('COUNT THEM.'),
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
      'LET HIM FLY HOME': 'TAKE HIS PACK',
      'BLOW THE BEAM': 'EAT THE BLOOM',
    },
    segments: [...THROUGH_TOWER, overgrown],
    check: {
      'Bloom 8 or more': (e) => e.bloom >= 8,
      'the pod glass': (e) => e.lines.includes('ON 0418 FIRST.'),
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
