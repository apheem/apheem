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

  // Paths are lists of tile coordinates [col, row]. Enemies enter at the first
  // point (off the top of the grid) and the Core sits on the last point.
  // hpMul and speedMul tune each map: a long path gives towers more time to shoot, so enemies get tougher or faster.
  // cost is the Data price to unlock the map in the Lab (0 = available from the start).
  GD.maps = [
    {
      id: 'circuit',
      name: 'Circuit',
      blurb: 'Three folds. Towers between lanes cover two at once.',
      cost: 0,
      hpMul: 1,
      speedMul: 1,
      path: [[1, -1], [1, 2], [7, 2], [7, 5], [1, 5], [1, 8], [7, 8], [7, 11], [4, 11], [4, 12]],
    },
    {
      id: 'express',
      name: 'Express',
      blurb: 'A short, open route. Less time to shoot, more room to build.',
      cost: 40,
      hpMul: 1,
      speedMul: 1,
      path: [[4, -1], [4, 3], [1, 3], [1, 7], [7, 7], [7, 11], [4, 11], [4, 12]],
    },
    {
      id: 'spiral',
      name: 'Spiral',
      blurb: 'A long coil around a buried Core. Enemies move faster.',
      cost: 80,
      hpMul: 1,
      speedMul: 1.1,
      path: [[0, -1], [0, 12], [8, 12], [8, 3], [4, 3], [4, 8]],
    },
  ];

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
  //       aura = pulse that hits everything in range, beam = instant hit.
  // stats: which three numbers the tower panel shows.
  GD.towers = {
    pulse: {
      name: 'Pulse',
      role: 'Rapid fire',
      kind: 'bullet',
      color: '#3ef0ff',
      mode: 'first',
      bulletSpeed: 12,
      stats: ['damage', 'rate', 'range'],
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
      tiers: [
        { cost: 110, damage: 40, rate: 0.45, range: 4.0 },
        { cost: 130, damage: 80, rate: 0.5, range: 4.5 },
        { cost: 200, damage: 150, rate: 0.55, range: 5.0 },
      ],
    },
  };
  GD.towerOrder = ['pulse', 'nova', 'cryo', 'rail'];

  // Targeting modes a player can cycle through on bullet, splash and beam towers.
  GD.targetModes = { first: 'First', strong: 'Strong', last: 'Last' };

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

  // Enemy HP grows each wave; rewards grow a little too.
  GD.hpMul = function (n) {
    return 1 + 0.25 * (n - 1) + 0.1 * (n - 1) * (n - 1);
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

  // Run modifiers that cards change. Tower-keyed values are per tower type.
  GD.newMods = function () {
    const per = (v) => ({ pulse: v, nova: v, cryo: v, rail: v });
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
    };
  };

  // tower: the card boosts that tower (offered more often when you own one).
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
    { id: 'scrap', name: 'Scrap Value', kind: 'econ', locked: true, text: 'Selling a tower refunds everything you spent on it.', apply: (m) => (m.refund = 1) },
  ];

  // ---- Lab: permanent unlocks bought with Data ----

  // levels: Data price of each level. Effects are read by the code that starts a run.
  GD.lab = [
    { id: 'gold', name: 'Seed Funding', text: '+25 starting gold per level.', levels: [20, 40, 80] },
    { id: 'plating', name: 'Core Plating', text: '+3 Core HP per level.', levels: [25, 50, 100] },
    { id: 'reroll', name: 'Reroll', text: 'Reroll each card offer once.', levels: [60] },
    { id: 'map:express', name: 'Map: Express', text: GD.maps[1].blurb, levels: [GD.maps[1].cost] },
    { id: 'map:spiral', name: 'Map: Spiral', text: GD.maps[2].blurb, levels: [GD.maps[2].cost] },
    ...GD.cards.filter((c) => c.locked).map((c) => ({ id: 'card:' + c.id, name: 'Card: ' + c.name, text: c.text, levels: [30] })),
  ];

  // Data paid at the end of a run, before the difficulty multiplier.
  GD.dataReward = function (stats, won) {
    return stats.wavesCleared * 2 + stats.bosses * 10 + (won ? 25 : 0);
  };
})(window.GD = window.GD || {});
