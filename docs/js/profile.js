// Everything kept between runs: Data, Lab unlocks, wins, best run, and a saved run in progress.
// Stored on the device with localStorage; every access tolerates storage being unavailable.
(function (GD) {
  const KEY = 'glitch-defense.profile';
  const RUN_KEY = 'glitch-defense.run';
  const LEGACY_BEST_KEY = 'glitch-defense.best';

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Private mode or full storage: progress just isn't kept.
    }
  }

  const blank = () => ({ data: 0, lab: {}, wins: {}, best: null, map: 'circuit', difficulty: 'normal' });
  const order = (id) => Math.max(0, GD.difficultyOrder.indexOf(id || 'normal'));
  // A win beats any loss, a harder difficulty beats an easier one, then the furthest wave wins.
  const score = (b) => (b ? order(b.difficulty) * 1000 + (b.won ? 100 : 0) + b.wave : 0);

  const profile = {
    state: Object.assign(blank(), read(KEY) || {}),

    save() {
      write(KEY, this.state);
    },

    level(id) {
      return this.state.lab[id] || 0;
    },

    has(id) {
      return this.level(id) > 0;
    },

    nextCost(id) {
      const item = GD.lab.find((i) => i.id === id);
      const lv = this.level(id);
      return lv < item.levels.length ? item.levels[lv] : null;
    },

    buy(id) {
      const cost = this.nextCost(id);
      if (cost === null || this.state.data < cost) return false;
      this.state.data -= cost;
      this.state.lab[id] = this.level(id) + 1;
      this.save();
      return true;
    },

    mapUnlocked(map) {
      return map.cost === 0 || this.has('map:' + map.id);
    },

    difficultyUnlocked(id) {
      const d = GD.difficulties[id];
      return !d.unlock || !!this.state.wins[d.unlock];
    },

    runOptions(map, difficulty) {
      return {
        map,
        difficulty,
        bonusGold: 25 * this.level('gold'),
        bonusHp: 3 * this.level('plating'),
        reroll: this.has('reroll'),
        unlockedCards: GD.cards.filter((c) => c.locked && this.has('card:' + c.id)).map((c) => c.id),
      };
    },

    // Records a finished run and pays out Data. Returns what to tell the player.
    finishRun(g) {
      const s = this.state;
      const won = g.state === 'won';
      const data = Math.round(GD.dataReward(g.stats, won) * GD.difficulties[g.difficulty].data);
      const before = GD.difficultyOrder.filter((d) => this.difficultyUnlocked(d));
      s.data += data;
      if (won) s.wins[g.difficulty] = (s.wins[g.difficulty] || 0) + 1;
      const unlocked = GD.difficultyOrder.filter((d) => this.difficultyUnlocked(d) && !before.includes(d));
      const run = { wave: g.wave, won, difficulty: g.difficulty, map: g.map.id };
      if (score(run) > score(s.best)) s.best = run;
      this.save();
      return { data, unlocked: unlocked.map((d) => GD.difficulties[d].name) };
    },

    loadRun() {
      const r = read(RUN_KEY);
      return r && r.v === 1 ? r : null;
    },

    saveRun(snap) {
      write(RUN_KEY, snap);
    },

    clearRun() {
      write(RUN_KEY, null);
    },
  };

  // Carry over the best run saved by earlier versions.
  if (!profile.state.best) {
    const old = read(LEGACY_BEST_KEY);
    if (old && old.wave) profile.state.best = { wave: old.wave, won: !!old.won, difficulty: 'normal', map: 'circuit' };
  }

  GD.profile = profile;
})(window.GD = window.GD || {});
