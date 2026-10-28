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
  GD.maps = [
    {
      name: 'Circuit',
      path: [[1, -1], [1, 2], [7, 2], [7, 5], [1, 5], [1, 8], [7, 8], [7, 11], [4, 11], [4, 12]],
    },
  ];

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
    [['drone', 15, 0.5, 0], pack(3), ['dart', 10, 0.35, 4], ['brick', 8, 1.2, 6], pack(9), ['splitter', 8, 0.9, 10], pack(15)],
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
})(window.GD = window.GD || {});
