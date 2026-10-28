// Game data: maps, towers, enemies and waves. Everything tunable lives here.
(function (GD) {
  GD.config = {
    cols: 9,
    rows: 14,
    startGold: 120,
    coreHp: 20,
    sellRefund: 0.7,
    earlyCallBonus: 10,
  };

  // Sectors (maps) form the campaign: winning one opens the next.
  // Paths are lists of tile coordinates [col, row]. Enemies enter at the first
  // point (off the top of the grid) and the Core sits on the last point.
  // A sector with paths (instead of path) has several lanes; enemies take turns between them.
  // Twists: hpMul and speedMul scale enemies, armor is added to every enemy,
  // slowResist cuts how much slows work. data multiplies the Data a run pays.
  GD.maps = [
    {
      id: 'circuit',
      name: 'Circuit',
      theme: 'grid',
      blurb: 'Three folds. Towers between lanes cover two at once.',
      twist: 'No twist. Learn the ropes here.',
      hpMul: 1,
      speedMul: 1,
      data: 1,
      path: [[1, -1], [1, 2], [7, 2], [7, 5], [1, 5], [1, 8], [7, 8], [7, 11], [4, 11], [4, 12]],
    },
    {
      id: 'spiral',
      name: 'Spiral',
      theme: 'synth',
      blurb: 'A long coil around a buried Core.',
      twist: 'Overdrive: enemies move 10% faster.',
      hpMul: 1,
      speedMul: 1.1,
      data: 1.1,
      path: [[0, -1], [0, 12], [8, 12], [8, 3], [4, 3], [4, 8]],
    },
    {
      id: 'express',
      name: 'Express',
      theme: 'stream',
      blurb: 'A short, open route. Less time to shoot, more room to build.',
      twist: 'Short route: enemies reach the Core quickly.',
      hpMul: 1,
      speedMul: 1,
      data: 1.2,
      path: [[4, -1], [4, 3], [1, 3], [1, 7], [7, 7], [7, 11], [4, 11], [4, 12]],
    },
    {
      id: 'frost',
      name: 'Cold Storage',
      theme: 'frost',
      blurb: 'A frozen server farm. The route doubles back on itself twice.',
      twist: 'Permafrost: slows are 40% weaker, but enemies move 10% slower.',
      hpMul: 1.1,
      speedMul: 0.9,
      slowResist: 0.4,
      data: 1.3,
      path: [[7, -1], [7, 4], [4, 4], [4, 1], [1, 1], [1, 10], [4, 10], [4, 7], [7, 7], [7, 12], [4, 12]],
    },
    {
      id: 'foundry',
      name: 'Foundry',
      theme: 'forge',
      blurb: 'Molten switchbacks around a sunken Core.',
      twist: 'Slag plating: every enemy has +1 armor.',
      hpMul: 1,
      speedMul: 1,
      armor: 1,
      data: 1.4,
      path: [[8, -1], [8, 2], [1, 2], [1, 5], [5, 5], [5, 8], [1, 8], [1, 11], [7, 11], [7, 7]],
    },
    {
      id: 'nexus',
      name: 'Nexus',
      theme: 'void',
      blurb: 'Two gates, one Core. Enemies take turns between the lanes.',
      twist: 'Twin lanes: towers down the middle can cover both.',
      hpMul: 0.75,
      speedMul: 1,
      data: 1.5,
      paths: [
        [[0, -1], [0, 2], [3, 2], [3, 5], [0, 5], [0, 8], [3, 8], [3, 11], [4, 11], [4, 12]],
        [[8, -1], [8, 2], [5, 2], [5, 5], [8, 5], [8, 8], [5, 8], [5, 11], [4, 11], [4, 12]],
      ],
    },
  ];
  for (const m of GD.maps) m.paths = m.paths || [m.path];

  // Each sector has its own look. Colors are hex so they can be mixed with alpha.
  // texture: pattern drawn on buildable tiles. ambient: animated layer over the field.
  GD.themes = {
    grid: { bg: '#0b0a1a', tile: '#8276e6', lane: '#16132d', edge: '#ff3d8b', glow: '#543cbe', stream: '#ff3d8b', texture: 'traces', ambient: 'scan' },
    stream: { bg: '#05110f', tile: '#46ffaa', lane: '#0a1d18', edge: '#2dffa0', glow: '#167a58', stream: '#2dffa0', texture: 'bits', ambient: 'rain' },
    synth: { bg: '#12081c', tile: '#ff5ac8', lane: '#200d2a', edge: '#ff5ad1', glow: '#b8306a', stream: '#ffb347', texture: 'scanlines', ambient: 'horizon' },
    frost: { bg: '#07111b', tile: '#96d7ff', lane: '#0d1c2b', edge: '#bfe9ff', glow: '#2c6f9e', stream: '#bfe9ff', texture: 'frost', ambient: 'snow' },
    forge: { bg: '#140806', tile: '#ff823c', lane: '#230e07', edge: '#ff6a2a', glow: '#a8361a', stream: '#ff8a3d', texture: 'plates', ambient: 'embers' },
    void: { bg: '#040408', tile: '#d2d2ff', lane: '#0c0b17', edge: '#d9d4ff', glow: '#3b2a7a', stream: '#a77bff', texture: 'outline', ambient: 'stars' },
  };

  // Difficulty scales enemy HP and speed, and how much Data a run pays out.
  // unlock: the difficulty you must win on first.
  GD.difficulties = {
    normal: { name: 'Normal', hp: 1, speed: 1, data: 1, coreHp: 0 },
    hard: { name: 'Hard', hp: 1.2, speed: 1, data: 1.5, coreHp: 0, unlock: 'normal' },
    nightmare: { name: 'Nightmare', hp: 1.4, speed: 1.08, data: 2, coreHp: -5, unlock: 'hard' },
  };
  GD.difficultyOrder = ['normal', 'hard', 'nightmare'];

  // Each tower has three tiers. Tier I is the build cost; later tiers are upgrade costs.
  // range and splash are in tiles, rate is shots (or pulses) per second.
  // kind: bullet = homing shot, splash = shell that explodes where it lands,
  //       aura = pulse that hits everything in range, beam = instant hit,
  //       chain = lightning that jumps between enemies, laser = steady beam that heats up,
  //       support = boosts towers next to it, econ = earns gold when a wave is cleared.
  // stats: which numbers the tower panel shows. lab: Data price to unlock (towers without one are free).
  GD.towers = {
    pulse: {
      name: 'Pulse',
      role: 'Rapid fire',
      kind: 'bullet',
      color: '#3ef0ff',
      mode: 'first',
      bulletSpeed: 12,
      stats: ['damage', 'rate', 'range'],
      text: 'Cheap and fast. Your first line of defense.',
      tiers: [
        { cost: 50, damage: 4, rate: 2.5, range: 2.2 },
        { cost: 60, damage: 7, rate: 3.0, range: 2.4 },
        { cost: 100, damage: 12, rate: 3.5, range: 2.7 },
      ],
    },
    nova: {
      name: 'Nova',
      role: 'Splash',
      kind: 'splash',
      color: '#a77bff',
      mode: 'first',
      bulletSpeed: 6,
      stats: ['damage', 'splash', 'range'],
      text: 'Lobs shells that hurt everything they land on.',
      tiers: [
        { cost: 80, damage: 8, rate: 0.8, range: 2.4, splash: 0.9 },
        { cost: 90, damage: 14, rate: 0.9, range: 2.6, splash: 1.0 },
        { cost: 150, damage: 24, rate: 1.0, range: 2.8, splash: 1.2 },
      ],
    },
    cryo: {
      name: 'Cryo',
      role: 'Slow',
      kind: 'aura',
      color: '#8fd3ff',
      stats: ['slow', 'damage', 'range'],
      text: 'Chills everything around it.',
      tiers: [
        { cost: 60, damage: 1, rate: 1.0, range: 1.8, slow: 0.35, slowTime: 1.5 },
        { cost: 70, damage: 2, rate: 1.2, range: 2.0, slow: 0.45, slowTime: 1.6 },
        { cost: 110, damage: 4, rate: 1.4, range: 2.2, slow: 0.55, slowTime: 1.8 },
      ],
    },
    rail: {
      name: 'Rail',
      role: 'Sniper',
      kind: 'beam',
      color: '#ff8a3d',
      mode: 'strong',
      stats: ['damage', 'rate', 'range'],
      text: 'Long range, huge hits, slow to reload.',
      tiers: [
        { cost: 110, damage: 40, rate: 0.45, range: 4.0 },
        { cost: 130, damage: 80, rate: 0.5, range: 4.5 },
        { cost: 200, damage: 150, rate: 0.55, range: 5.0 },
      ],
    },
    tesla: {
      name: 'Tesla',
      role: 'Chain',
      kind: 'chain',
      color: '#f5f05a',
      mode: 'first',
      stats: ['damage', 'chains', 'range'],
      text: 'Lightning that jumps from enemy to enemy. Shreds packs, struggles with armor.',
      lab: 60,
      jump: 1.5, // tiles a bolt can jump
      falloff: 0.85, // damage kept on each jump
      tiers: [
        { cost: 90, damage: 8, rate: 1.0, range: 2.2, chains: 3 },
        { cost: 100, damage: 14, rate: 1.1, range: 2.4, chains: 4 },
        { cost: 160, damage: 24, rate: 1.25, range: 2.6, chains: 5 },
      ],
    },
    laser: {
      name: 'Laser',
      role: 'Burn',
      kind: 'laser',
      color: '#4dff9a',
      mode: 'strong',
      stats: ['dps', 'ramp', 'range'],
      text: 'A steady beam that heats up the longer it holds one target. Ignores armor.',
      lab: 80,
      ignoreArmor: true,
      rampTime: 2, // seconds on one target to reach full heat
      tiers: [
        { cost: 100, dps: 11, ramp: 3, range: 2.6 },
        { cost: 110, dps: 20, ramp: 3, range: 2.8 },
        { cost: 170, dps: 34, ramp: 3.5, range: 3.0 },
      ],
    },
    amp: {
      name: 'Amplifier',
      role: 'Support',
      kind: 'support',
      color: '#ff7ae0',
      stats: ['boost', 'linked'],
      text: 'Boosts the damage of every tower touching it, diagonals included. Does not shoot.',
      lab: 100,
      tiers: [
        { cost: 90, boost: 0.15, range: 1.5 },
        { cost: 100, boost: 0.25, range: 1.5 },
        { cost: 150, boost: 0.35, range: 1.5 },
      ],
    },
    harvester: {
      name: 'Harvester',
      role: 'Economy',
      kind: 'econ',
      color: '#ffc547',
      stats: ['income', 'earned'],
      text: 'Mines gold every time a wave is cleared. Does not shoot.',
      lab: 40,
      tiers: [
        { cost: 60, income: 16 },
        { cost: 80, income: 30 },
        { cost: 120, income: 50 },
      ],
    },
  };
  GD.towerOrder = ['pulse', 'nova', 'cryo', 'rail', 'tesla', 'laser', 'amp', 'harvester'];
  GD.baseTowers = GD.towerOrder.filter((t) => !GD.towers[t].lab);
  GD.isAttacker = (type) => !['support', 'econ'].includes(GD.towers[type].kind);

  // Targeting modes a player can cycle through on towers that aim.
  GD.targetModes = { first: 'First', strong: 'Strong', last: 'Last' };

  // Tower color sets, bought in the Lab. plate: the shape under each tower.
  // enemy: the two colors of the enemies' glitch effect.
  GD.skins = {
    neon: {
      name: 'Neon',
      text: 'The original look.',
      cost: 0,
      plate: 'square',
      enemy: ['#3ef0ff', '#ff3d8b'],
      towers: { pulse: '#3ef0ff', nova: '#a77bff', cryo: '#8fd3ff', rail: '#ff8a3d', tesla: '#f5f05a', laser: '#4dff9a', amp: '#ff7ae0', harvester: '#ffc547' },
    },
    vapor: {
      name: 'Vapor',
      text: 'Pastel towers on hexagon plates. Enemies glow blue and pink.',
      cost: 60,
      plate: 'hex',
      enemy: ['#6a5cff', '#ff4fa3'],
      towers: { pulse: '#7cf7ff', nova: '#ff9cf2', cryo: '#b9adff', rail: '#ffb86b', tesla: '#fff59a', laser: '#9dffc9', amp: '#ff7ab8', harvester: '#ffd889' },
    },
    toxic: {
      name: 'Toxic',
      text: 'Acid colors on round plates. Enemies glow orange and purple.',
      cost: 80,
      plate: 'circle',
      enemy: ['#ff8a1a', '#c43dff'],
      towers: { pulse: '#9dff3d', nova: '#3dffd0', cryo: '#6fe7ff', rail: '#ffef3d', tesla: '#e1ff7a', laser: '#ff5af0', amp: '#b07cff', harvester: '#ffc547' },
    },
    redline: {
      name: 'Redline',
      text: 'Hot reds on diamond plates. Enemies turn ice blue.',
      cost: 100,
      plate: 'diamond',
      enemy: ['#3dffe0', '#3d7bff'],
      towers: { pulse: '#ff5a6e', nova: '#ff9a3d', cryo: '#ffd0d6', rail: '#ffe14d', tesla: '#ffb3f0', laser: '#ff3d3d', amp: '#ff7ad9', harvester: '#ffc547' },
    },
  };
  GD.skinOrder = ['neon', 'vapor', 'toxic', 'redline'];

  // Abilities: tapped during a run, then recharge. Each Lab level unlocks or improves one.
  // Per-level values are listed by level (index 0 = level 1).
  GD.abilities = {
    strike: {
      name: 'Orbital Strike',
      short: 'Strike',
      color: '#ffc547',
      aim: true,
      text: 'Tap Strike, then tap the field to blast a small area. Bosses take half.',
      cooldown: [40, 34, 28],
      power: [1, 1.4, 1.8],
      damage: 20, // times the current wave's HP growth, so it stays useful late
      radius: 1.3,
    },
    stasis: {
      name: 'Stasis Field',
      short: 'Stasis',
      color: '#8fd3ff',
      text: 'Freezes every enemy in place for a few seconds. Bosses are only slowed.',
      cooldown: [55, 50, 45],
      duration: [2.5, 3.5, 4.5],
    },
    surge: {
      name: 'Power Surge',
      short: 'Surge',
      color: '#3ef0ff',
      text: 'Every tower fires 60% faster for a few seconds.',
      cooldown: [50, 45, 40],
      duration: [6, 8, 10],
      rate: 1.6,
    },
  };
  GD.abilityOrder = ['strike', 'stasis', 'surge'];

  // Lab research: permanent per-tower upgrades. apply(mods, level) runs when a run starts.
  const hit = (type) => ({
    text: '+8% damage and +4% range per level.',
    apply: (m, lv) => ((m.damage[type] *= 1 + 0.08 * lv), (m.range[type] *= 1 + 0.04 * lv)),
  });
  GD.research = {
    pulse: hit('pulse'),
    nova: hit('nova'),
    cryo: { text: '+4% slow and +5% range per level.', apply: (m, lv) => ((m.slowAdd += 0.04 * lv), (m.range.cryo *= 1 + 0.05 * lv)) },
    rail: hit('rail'),
    tesla: hit('tesla'),
    laser: hit('laser'),
    amp: { text: '+5% boost per level.', apply: (m, lv) => (m.ampAdd += 0.05 * lv) },
    harvester: { text: '+15% income per level.', apply: (m, lv) => (m.harvest *= 1 + 0.15 * lv) },
  };

  // speed is in tiles per second, damage is Core HP lost on reaching it.
  // armor is subtracted from every hit (each hit still does at least 1).
  GD.enemies = {
    drone: { name: 'Drone', plural: 'drones', hp: 10, speed: 1.0, reward: 4, damage: 1, size: 0.26 },
    dart: { name: 'Dart', plural: 'darts', hp: 6, speed: 1.9, reward: 3, damage: 1, size: 0.2, intro: 'Darts are fast. Cryo slows them down.' },
    brick: { name: 'Brick', plural: 'bricks', hp: 50, speed: 0.55, reward: 12, damage: 2, size: 0.34, armor: 3, intro: 'Bricks are armored. Weak shots barely scratch them.' },
    swarm: { name: 'Swarm', plural: 'swarmers', hp: 4, speed: 1.25, reward: 1, damage: 1, size: 0.13, intro: 'Swarms come in tight packs. Nova splash shreds them.' },
    splitter: { name: 'Splitter', plural: 'splitters', hp: 20, speed: 0.85, reward: 4, damage: 1, size: 0.3, split: { type: 'shard', count: 2 }, intro: 'Splitters break into two shards when destroyed.' },
    shard: { name: 'Shard', plural: 'shards', hp: 7, speed: 1.35, reward: 1, damage: 1, size: 0.17 },
    // Bosses: slowResist cuts how much Cryo slows them; summon drops minions behind them on a timer.
    warden: { name: 'Warden', plural: 'wardens', hp: 70, speed: 0.45, reward: 60, damage: 10, size: 0.46, armor: 2, boss: true, slowResist: 0.5, summon: { type: 'shard', count: 2, every: 4 } },
    overlord: { name: 'Overlord', plural: 'overlords', hp: 110, speed: 0.4, reward: 150, damage: 20, size: 0.52, armor: 4, boss: true, slowResist: 0.6, summon: { type: 'swarm', count: 4, every: 3.5 } },
  };

  // Each wave is a list of groups: [enemy, count, seconds between spawns, start time].
  const pack = (start) => ['swarm', 6, 0.12, start];
  GD.waves = [
    [['drone', 8, 1.0, 0]],
    [['drone', 10, 0.9, 0], ['dart', 4, 0.6, 5]],
    [['drone', 6, 1.0, 0], pack(3), pack(8)],
    [['drone', 12, 0.8, 0], ['brick', 2, 2.5, 4]],
    [['splitter', 6, 1.4, 0], ['dart', 8, 0.5, 3]],
    [pack(0), ['brick', 4, 2.0, 2], pack(5), pack(9), pack(13)],
    [['drone', 10, 0.7, 0], ['splitter', 8, 1.1, 2], ['dart', 6, 0.4, 8]],
    [['brick', 6, 1.6, 0], ['dart', 10, 0.4, 3], pack(6), pack(10), pack(14)],
    [['splitter', 10, 0.9, 0], ['brick', 6, 1.5, 4], pack(8), pack(12)],
    [['warden', 1, 0, 4], ['drone', 12, 0.6, 0], ['dart', 6, 0.4, 6], pack(10)],
    [['drone', 15, 0.5, 0], pack(3), ['dart', 10, 0.35, 4], ['brick', 8, 1.2, 6], pack(9), ['splitter', 8, 0.9, 10], pack(15)],
    [['splitter', 8, 1.0, 0], ['brick', 4, 1.8, 3], ['dart', 8, 0.4, 8]],
    [pack(0), ['brick', 6, 1.4, 1], pack(4), pack(8), pack(12), pack(16)],
    [['drone', 20, 0.4, 0], ['splitter', 10, 0.8, 4], ['dart', 12, 0.3, 9]],
    [['brick', 10, 1.1, 0], ['dart', 10, 0.35, 2], pack(5), pack(9), pack(13), pack(17)],
    [['splitter', 12, 0.7, 0], pack(3), ['brick', 6, 1.3, 5], pack(9), pack(14)],
    [['dart', 25, 0.25, 0], ['drone', 15, 0.4, 3], ['brick', 6, 1.2, 7]],
    [['brick', 14, 0.9, 0], ['splitter', 12, 0.7, 3], pack(6), pack(10), pack(14), pack(18)],
    [['drone', 20, 0.35, 0], ['dart', 16, 0.25, 3], ['brick', 10, 0.9, 5], ['splitter', 12, 0.6, 8], pack(4), pack(10), pack(16)],
    [['overlord', 1, 0, 6], ['brick', 8, 1.2, 0], ['splitter', 10, 0.7, 3], ['dart', 12, 0.3, 10], pack(8), pack(14)],
  ];

  // Enemy HP grows each wave, a little faster after the first boss; rewards grow a little too.
  GD.hpMul = function (n) {
    const late = Math.max(0, n - 9);
    return 1 + 0.25 * (n - 1) + 0.1 * (n - 1) * (n - 1) + 0.12 * late * late;
  };

  GD.makeWave = function (n) {
    const hpMul = GD.hpMul(n);
    const rewardBonus = Math.floor(n / 4);
    const spawns = [];
    for (const [type, count, gap, start] of GD.waves[n - 1]) {
      for (let i = 0; i < count; i++) spawns.push({ t: start + i * gap, type, hpMul, rewardBonus });
    }
    return spawns.sort((a, b) => a.t - b.t);
  };

  GD.waveClearBonus = function (n) {
    return 10 + 2 * n;
  };

  // ---- Upgrade cards ----

  // After clearing one of these waves the player picks 1 of 3 cards.
  GD.cardWaves = [3, 6, 9, 12, 15, 18];

  // Run modifiers that cards and research change. Tower-keyed values are per tower type.
  GD.newMods = function () {
    const per = (v) => Object.fromEntries(GD.towerOrder.map((t) => [t, v]));
    return {
      damage: per(1),
      rate: per(1),
      range: per(1),
      ignoreArmor: per(false),
      splash: 1,
      slowAdd: 0,
      brittle: 0,
      pierce: false,
      interest: 0,
      bounty: 0,
      discount: 0,
      repair: 0,
      chain: false,
      overcharge: false,
      refund: 0,
      chains: 0, // extra Tesla jumps
      heatRate: 1, // how fast Lasers heat up
      ampAdd: 0, // added to every Amplifier's boost
      harvest: 1, // Harvester income multiplier
      clearBonus: 1, // wave-clear gold multiplier
    };
  };

  // tower: the card boosts that tower (offered more often when you own one, never if the tower is locked).
  // kind: econ or core for cards that aren't about one tower. repeat: can be picked again.
  GD.cards = [
    { id: 'overclock', name: 'Overclock', tower: 'pulse', text: 'Pulse towers fire 30% faster.', apply: (m) => (m.rate.pulse *= 1.3) },
    { id: 'hollow', name: 'Hollow Points', tower: 'pulse', text: 'Pulse shots ignore armor.', apply: (m) => (m.ignoreArmor.pulse = true) },
    { id: 'shrapnel', name: 'Shrapnel', tower: 'nova', text: 'Nova damage +35%.', apply: (m) => (m.damage.nova *= 1.35) },
    { id: 'wideblast', name: 'Wide Blast', tower: 'nova', text: 'Nova blast radius +35%.', apply: (m) => (m.splash *= 1.35) },
    { id: 'deepfreeze', name: 'Deep Freeze', tower: 'cryo', text: 'Cryo slows 15% more.', apply: (m) => (m.slowAdd += 0.15) },
    { id: 'brittle', name: 'Brittle', tower: 'cryo', text: 'Slowed enemies take 25% more damage from everything.', apply: (m) => (m.brittle += 0.25) },
    { id: 'longbarrel', name: 'Long Barrel', tower: 'rail', text: 'Rail range +25% and fires 20% faster.', apply: (m) => ((m.range.rail *= 1.25), (m.rate.rail *= 1.2)) },
    { id: 'pierce', name: 'Piercing Rail', tower: 'rail', text: 'Rail beams hit every enemy in their line.', apply: (m) => (m.pierce = true) },
    { id: 'arcflash', name: 'Arc Flash', tower: 'tesla', text: 'Tesla lightning jumps to 2 more enemies.', apply: (m) => (m.chains += 2) },
    { id: 'lens', name: 'Focusing Lens', tower: 'laser', text: 'Lasers heat up twice as fast.', apply: (m) => (m.heatRate *= 2) },
    { id: 'resonance', name: 'Resonance', tower: 'amp', text: 'Amplifiers boost 15% more.', apply: (m) => (m.ampAdd += 0.15) },
    { id: 'yield', name: 'Compound Yield', tower: 'harvester', text: 'Harvesters mine 50% more gold.', apply: (m) => (m.harvest *= 1.5) },
    { id: 'optics', name: 'Optics', kind: 'core', text: 'All towers get 12% more range.', apply: (m) => { for (const k in m.range) m.range[k] *= 1.12; } },
    { id: 'interest', name: 'Interest', kind: 'econ', text: 'After each wave, gain 10% of your gold (up to 40).', apply: (m) => (m.interest = 0.1) },
    { id: 'bounty', name: 'Bounty', kind: 'econ', text: 'Every enemy destroyed pays 1 extra gold.', apply: (m) => (m.bounty += 1) },
    { id: 'bulk', name: 'Bulk Order', kind: 'econ', text: 'Towers and upgrades cost 15% less.', apply: (m) => (m.discount = 0.15) },
    { id: 'repair', name: 'Nano Repair', kind: 'core', text: 'Repair 1 Core HP after each wave.', apply: (m) => (m.repair += 1) },
    { id: 'reinforce', name: 'Reinforced Core', kind: 'core', repeat: true, text: '+5 max Core HP, and repair 5 now.', apply: (m, g) => ((g.maxHp += 5), (g.hp += 5)) },
    // Locked until bought in the Lab.
    { id: 'tracer', name: 'Tracer Rounds', tower: 'pulse', locked: true, text: 'Pulse range +25%.', apply: (m) => (m.range.pulse *= 1.25) },
    { id: 'chain', name: 'Chain Reaction', tower: 'nova', locked: true, text: 'Enemies destroyed by Nova burst, hurting those nearby.', apply: (m) => (m.chain = true) },
    { id: 'supercool', name: 'Supercooled', tower: 'cryo', locked: true, text: 'Cryo range +30%.', apply: (m) => (m.range.cryo *= 1.3) },
    { id: 'overcharge', name: 'Overcharge', tower: 'rail', locked: true, text: 'Rail deals double damage to bosses.', apply: (m) => (m.overcharge = true) },
    { id: 'superconductor', name: 'Superconductor', tower: 'tesla', locked: true, text: 'Tesla lightning ignores armor.', apply: (m) => (m.ignoreArmor.tesla = true) },
    { id: 'scrap', name: 'Scrap Value', kind: 'econ', locked: true, text: 'Selling a tower refunds everything you spent on it.', apply: (m) => (m.refund = 1) },
    { id: 'overflow', name: 'Overflow', kind: 'econ', locked: true, text: 'Wave-clear bonuses pay 50% more.', apply: (m) => (m.clearBonus *= 1.5) },
  ];

  // ---- Lab: permanent unlocks bought with Data ----

  // tab: which Lab page lists it. levels: Data price of each level.
  // requires: another Lab item that must be owned first. Effects are read by profile.runOptions.
  GD.labTabs = [
    { id: 'core', name: 'Core' },
    { id: 'arsenal', name: 'Arsenal' },
    { id: 'research', name: 'Research' },
    { id: 'cards', name: 'Cards' },
    { id: 'style', name: 'Style' },
  ];
  const towerItem = (t) => (GD.towers[t].lab ? 'tower:' + t : null);
  GD.lab = [
    { id: 'gold', tab: 'core', name: 'Seed Funding', text: '+25 starting gold per level.', levels: [20, 40, 80] },
    { id: 'plating', tab: 'core', name: 'Core Plating', text: '+3 Core HP per level.', levels: [25, 50, 100] },
    { id: 'reroll', tab: 'core', name: 'Reroll', text: 'Reroll each card offer once.', levels: [60] },
    { id: 'miner', tab: 'core', name: 'Data Miner', text: '+10% Data from every run per level.', levels: [60, 120, 200] },
    ...GD.towerOrder.filter((t) => GD.towers[t].lab).map((t) => ({ id: 'tower:' + t, tab: 'arsenal', tower: t, name: GD.towers[t].name, text: GD.towers[t].text, levels: [GD.towers[t].lab] })),
    ...GD.abilityOrder.map((a) => ({ id: 'ability:' + a, tab: 'arsenal', ability: a, name: GD.abilities[a].name, text: GD.abilities[a].text, more: 'Each level recharges faster and hits harder.', levels: [50, 70, 110] })),
    ...GD.towerOrder.map((t) => ({ id: 'research:' + t, tab: 'research', tower: t, name: GD.towers[t].name + ' research', text: GD.research[t].text, requires: towerItem(t), levels: [40, 80, 140] })),
    ...GD.cards.filter((c) => c.locked).map((c) => ({ id: 'card:' + c.id, tab: 'cards', name: c.name, text: c.text, requires: c.tower ? towerItem(c.tower) : null, levels: [30] })),
    ...GD.skinOrder.map((s) => ({ id: 'skin:' + s, tab: 'style', skin: s, name: GD.skins[s].name, text: GD.skins[s].text, levels: GD.skins[s].cost ? [GD.skins[s].cost] : [] })),
  ];

  // Data paid at the end of a run, before the sector, difficulty and Data Miner multipliers.
  GD.dataReward = function (stats, won) {
    return stats.wavesCleared * 2 + stats.bosses * 10 + (won ? 25 : 0);
  };
})(window.GD = window.GD || {});
