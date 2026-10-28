// Game data: maps, towers, enemies and waves. Everything tunable lives here.
(function (GD) {
  GD.config = {
    cols: 9,
    rows: 14,
    startGold: 120,
    coreHp: 20,
    sellRefund: 0.7,
    earlyCallBonus: 10,
    totalWaves: 10,
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
  // range is in tiles, rate is shots per second.
  GD.towers = {
    pulse: {
      name: 'Pulse',
      blurb: 'Fast single-target shots',
      tiers: [
        { cost: 50, damage: 4, rate: 2.5, range: 2.2 },
        { cost: 60, damage: 7, rate: 3.0, range: 2.4 },
        { cost: 100, damage: 12, rate: 3.5, range: 2.7 },
      ],
      bulletSpeed: 12,
    },
  };

  // speed is in tiles per second, damage is Core HP lost on reaching it.
  GD.enemies = {
    drone: { name: 'Drone', hp: 10, speed: 1.0, reward: 4, damage: 1, size: 0.26 },
  };

  // Wave n (1-based) for the prototype: drones only, more of them and tougher each wave.
  GD.makeWave = function (n) {
    const count = 5 + 2 * n;
    const hpMul = 1 + 0.3 * (n - 1) + 0.13 * (n - 1) * (n - 1);
    const gap = Math.max(0.45, 1.0 - 0.05 * n);
    const spawns = [];
    for (let i = 0; i < count; i++) {
      spawns.push({ t: i * gap, type: 'drone', hpMul, rewardBonus: Math.floor(n / 4) });
    }
    return spawns;
  };

  GD.waveClearBonus = function (n) {
    return 10 + 2 * n;
  };
})(window.GD = window.GD || {});
