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

  // cleared: sector id -> { difficulty id: true } for every sector won.
  const blank = () => ({ data: 0, lab: {}, wins: {}, cleared: {}, best: null, map: 'circuit', difficulty: 'normal', skin: 'neon' });
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

    // A Lab item that needs another one first (research for a locked tower, for example).
    blocked(item) {
      return !!item.requires && !this.has(item.requires);
    },

    buy(id) {
      const item = GD.lab.find((i) => i.id === id);
      const cost = this.nextCost(id);
      if (cost === null || this.state.data < cost || this.blocked(item)) return false;
      this.state.data -= cost;
      this.state.lab[id] = this.level(id) + 1;
      this.save();
      return true;
    },

    // The first sector is always open; each one after it opens when the one before it is won.
    // Express and Spiral stay open for players who bought them in version 1.
    mapUnlocked(map) {
      const i = GD.maps.indexOf(map);
      return i === 0 || this.has('map:' + map.id) || this.cleared(GD.maps[i - 1].id);
    },

    cleared(mapId, difficulty) {
      const c = this.state.cleared[mapId];
      return !!c && (difficulty ? !!c[difficulty] : Object.keys(c).length > 0);
    },

    ownsSkin(id) {
      return id === 'neon' || this.has('skin:' + id);
    },

    setSkin(id) {
      if (!this.ownsSkin(id)) return;
      this.state.skin = id;
      this.save();
    },

    difficultyUnlocked(id) {
      const d = GD.difficulties[id];
      return !d.unlock || !!this.state.wins[d.unlock];
    },

    towerUnlocked(type) {
      return !GD.towers[type].lab || this.has('tower:' + type);
    },

    runOptions(map, difficulty) {
      const levels = (prefix, ids) => Object.fromEntries(ids.map((id) => [id, this.level(prefix + id)]).filter(([, lv]) => lv > 0));
      return {
        map,
        difficulty,
        bonusGold: 25 * this.level('gold'),
        bonusHp: 3 * this.level('plating'),
        reroll: this.has('reroll'),
        unlockedCards: GD.cards.filter((c) => c.locked && this.has('card:' + c.id)).map((c) => c.id),
        towers: GD.towerOrder.filter((t) => this.towerUnlocked(t)),
        research: levels('research:', GD.towerOrder),
        abilities: levels('ability:', GD.abilityOrder),
      };
    },

    // Records a finished run and pays out Data. Returns what to tell the player.
    // unlocked lists newly opened sectors and difficulties by name.
    finishRun(g) {
      const s = this.state;
      const won = g.state === 'won';
      const mult = GD.difficulties[g.difficulty].data * g.map.data * (1 + 0.1 * this.level('miner'));
      const data = Math.round(GD.dataReward(g.stats, won) * mult);
      const diffsBefore = GD.difficultyOrder.filter((d) => this.difficultyUnlocked(d));
      const mapsBefore = GD.maps.filter((m) => this.mapUnlocked(m));
      s.data += data;
      if (won) {
        s.wins[g.difficulty] = (s.wins[g.difficulty] || 0) + 1;
        s.cleared[g.map.id] = Object.assign(s.cleared[g.map.id] || {}, { [g.difficulty]: true });
      }
      const unlocked = [
        ...GD.maps.filter((m) => this.mapUnlocked(m) && !mapsBefore.includes(m)).map((m) => 'Sector ' + (GD.maps.indexOf(m) + 1) + ' · ' + m.name + ' unlocked'),
        ...GD.difficultyOrder.filter((d) => this.difficultyUnlocked(d) && !diffsBefore.includes(d)).map((d) => GD.difficulties[d].name + ' difficulty unlocked'),
      ];
      const run = { wave: g.wave, won, difficulty: g.difficulty, map: g.map.id };
      if (score(run) > score(s.best)) s.best = run;
      this.save();
      return { data, unlocked };
    },

    loadRun() {
      const r = read(RUN_KEY);
      return r && (r.v === 1 || r.v === 2) ? r : null;
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
  // Version 1 had no campaign: count its best win as clearing that sector.
  const best = profile.state.best;
  if (best && best.won && !Object.keys(profile.state.cleared).length) profile.state.cleared[best.map] = { [best.difficulty]: true };
  if (!profile.ownsSkin(profile.state.skin)) profile.state.skin = 'neon';

  GD.profile = profile;
})(window.GD = window.GD || {});
