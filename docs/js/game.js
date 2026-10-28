// Game simulation. No DOM or canvas access here, so it can also run headless in tests.
// Units: positions are in tiles (tile centers sit on .5), time is in seconds.
(function (GD) {
  const TILE = { EMPTY: 0, PATH: 1, CORE: 2 };
  GD.TILE = TILE;

  class Game {
    // opts: map id, difficulty id, and Lab bonuses (bonusGold, bonusHp, unlockedCards, reroll).
    constructor(opts) {
      opts = opts || {};
      const cfg = GD.config;
      this.opts = opts;
      this.cols = cfg.cols;
      this.rows = cfg.rows;
      this.map = GD.maps.find((m) => m.id === opts.map) || GD.maps[0];
      this.difficulty = GD.difficulties[opts.difficulty] ? opts.difficulty : 'normal';
      const diff = GD.difficulties[this.difficulty];
      this.enemyHp = diff.hp * this.map.hpMul;
      this.enemySpeed = diff.speed * this.map.speedMul;
      this.unlockedCards = opts.unlockedCards || [];
      this.canReroll = !!opts.reroll;
      this.gold = cfg.startGold + (opts.bonusGold || 0);
      this.hp = cfg.coreHp + diff.coreHp + (opts.bonusHp || 0);
      this.maxHp = this.hp;
      this.wave = 0;
      this.totalWaves = GD.waves.length;
      this.state = 'playing'; // playing | won | lost
      this.time = 0;
      this.towers = [];
      this.enemies = [];
      this.bullets = [];
      this.spawnQueue = [];
      this.waveTime = 0;
      this.waveRemaining = {};
      this.seen = {}; // enemy types that have appeared in an earlier wave
      this.events = []; // drained by the renderer for effects and sounds
      this.stats = { kills: 0, leaks: 0, wavesCleared: 0, bosses: 0 };
      this.mods = GD.newMods();
      this.cards = []; // ids of cards picked this run
      this.offers = []; // pending card choices: { ids, rerolled }
      this.buildGrid();
    }

    buildGrid() {
      this.grid = [];
      for (let r = 0; r < this.rows; r++) this.grid.push(new Array(this.cols).fill(TILE.EMPTY));

      const pts = this.map.path.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 }));
      this.pathPts = pts;
      this.segLen = [];
      this.cumLen = [0];
      for (let i = 1; i < pts.length; i++) {
        const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        this.segLen.push(len);
        this.cumLen.push(this.cumLen[i - 1] + len);
      }
      this.pathLen = this.cumLen[this.cumLen.length - 1];

      const path = this.map.path;
      for (let i = 1; i < path.length; i++) {
        const [c0, r0] = path[i - 1];
        const [c1, r1] = path[i];
        const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
        for (let s = 0; s <= steps; s++) {
          const c = c0 + Math.sign(c1 - c0) * s;
          const r = r0 + Math.sign(r1 - r0) * s;
          if (this.inBounds(c, r)) this.grid[r][c] = TILE.PATH;
        }
      }
      const [cc, cr] = path[path.length - 1];
      this.grid[cr][cc] = TILE.CORE;
      this.core = { c: cc, r: cr, x: cc + 0.5, y: cr + 0.5 };
    }

    inBounds(c, r) {
      return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
    }

    posAt(d) {
      const pts = this.pathPts;
      d = Math.max(0, d);
      for (let i = 1; i < pts.length; i++) {
        if (d <= this.cumLen[i]) {
          const t = (d - this.cumLen[i - 1]) / this.segLen[i - 1];
          return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
        }
      }
      return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    }

    // ---- Player actions ----

    towerAt(c, r) {
      return this.towers.find((t) => t.c === c && t.r === r) || null;
    }

    canBuild(c, r) {
      return this.inBounds(c, r) && this.grid[r][c] === TILE.EMPTY && !this.towerAt(c, r);
    }

    price(cost) {
      return Math.round(cost * (1 - this.mods.discount));
    }

    buildCost(type) {
      return this.price(GD.towers[type].tiers[0].cost);
    }

    build(type, c, r) {
      const def = GD.towers[type];
      const cost = this.buildCost(type);
      if (this.state !== 'playing' || !this.canBuild(c, r) || this.gold < cost) return null;
      this.gold -= cost;
      const tower = { type, tier: 0, c, r, x: c + 0.5, y: r + 0.5, cooldown: 0, angle: -Math.PI / 2, spent: cost, recoil: 0, mode: def.mode || null };
      this.towers.push(tower);
      this.events.push({ type: 'build', tower: type, x: tower.x, y: tower.y, range: this.towerStats(tower).range });
      return tower;
    }

    // Tier stats with this run's card modifiers applied.
    statsFor(type, tier) {
      const base = GD.towers[type].tiers[tier];
      const m = this.mods;
      return {
        damage: base.damage * m.damage[type],
        rate: base.rate * m.rate[type],
        range: base.range * m.range[type],
        splash: (base.splash || 0) * m.splash,
        slow: base.slow ? Math.min(0.8, base.slow + m.slowAdd) : 0,
        slowTime: base.slowTime || 0,
      };
    }

    towerStats(t) {
      return this.statsFor(t.type, t.tier);
    }

    upgradeCost(t) {
      const tiers = GD.towers[t.type].tiers;
      return t.tier < tiers.length - 1 ? this.price(tiers[t.tier + 1].cost) : null;
    }

    upgrade(t) {
      const cost = this.upgradeCost(t);
      if (this.state !== 'playing' || cost === null || this.gold < cost) return false;
      this.gold -= cost;
      t.spent += cost;
      t.tier++;
      this.events.push({ type: 'upgrade', tower: t.type, x: t.x, y: t.y, range: this.towerStats(t).range });
      return true;
    }

    cycleMode(t) {
      if (!t.mode) return;
      const modes = Object.keys(GD.targetModes);
      t.mode = modes[(modes.indexOf(t.mode) + 1) % modes.length];
    }

    sellValue(t) {
      return Math.floor(t.spent * Math.max(GD.config.sellRefund, this.mods.refund));
    }

    sell(t) {
      if (this.state !== 'playing') return;
      this.gold += this.sellValue(t);
      this.towers.splice(this.towers.indexOf(t), 1);
      this.events.push({ type: 'sell', x: t.x, y: t.y });
    }

    canStartWave() {
      return this.state === 'playing' && this.spawnQueue.length === 0 && this.wave < this.totalWaves;
    }

    startNextWave() {
      if (!this.canStartWave()) return false;
      const early = this.enemies.length > 0;
      const preview = this.nextWavePreview();
      this.wave++;
      this.spawnQueue = GD.makeWave(this.wave);
      this.waveTime = 0;
      this.waveRemaining[this.wave] = this.spawnQueue.length;
      for (const s of this.spawnQueue) this.seen[s.type] = true;
      this.events.push({ type: 'waveStart', wave: this.wave, newType: preview.newType, boss: preview.boss });
      if (early) {
        this.gold += GD.config.earlyCallBonus;
        this.events.push({ type: 'earlyBonus', amount: GD.config.earlyCallBonus });
      }
      return true;
    }

    // What the next wave holds: counts per enemy type, and the first type the player hasn't met yet.
    nextWavePreview() {
      if (this.wave >= this.totalWaves) return null;
      const counts = {};
      for (const [type, count] of GD.waves[this.wave]) counts[type] = (counts[type] || 0) + count;
      const types = Object.keys(counts);
      const newType = this.wave > 0 ? types.find((t) => !this.seen[t] && GD.enemies[t].intro) || null : null;
      const boss = types.find((t) => GD.enemies[t].boss) || null;
      return { wave: this.wave + 1, counts, newType, boss };
    }

    // ---- Saving a run ----

    // A run can be saved whenever the field is clear (between waves).
    canSave() {
      return this.state === 'playing' && !this.enemies.length && !this.spawnQueue.length && !this.bullets.length;
    }

    snapshot() {
      return {
        v: 1,
        opts: this.opts,
        gold: this.gold,
        hp: this.hp,
        maxHp: this.maxHp,
        wave: this.wave,
        time: this.time,
        cards: this.cards.slice(),
        offers: this.offers.map((o) => ({ ids: o.ids.slice(), rerolled: o.rerolled })),
        seen: Object.assign({}, this.seen),
        stats: Object.assign({}, this.stats),
        towers: this.towers.map((t) => ({ type: t.type, tier: t.tier, c: t.c, r: t.r, spent: t.spent, mode: t.mode, angle: t.angle })),
      };
    }

    static restore(snap) {
      const g = new Game(snap.opts);
      // Re-apply cards so run modifiers match, then restore the saved numbers over them.
      for (const id of snap.cards) {
        const card = GD.cards.find((c) => c.id === id);
        if (card) card.apply(g.mods, g);
      }
      g.cards = snap.cards.slice();
      Object.assign(g, { gold: snap.gold, hp: snap.hp, maxHp: snap.maxHp, wave: snap.wave, time: snap.time || 0 });
      g.offers = snap.offers.map((o) => ({ ids: o.ids.slice(), rerolled: o.rerolled }));
      g.seen = Object.assign({}, snap.seen);
      g.stats = Object.assign(g.stats, snap.stats);
      for (const t of snap.towers) {
        g.towers.push({ type: t.type, tier: t.tier, c: t.c, r: t.r, x: t.c + 0.5, y: t.r + 0.5, cooldown: 0, angle: t.angle, spent: t.spent, recoil: 0, mode: t.mode });
      }
      return g;
    }

    // ---- Simulation ----

    update(dt) {
      if (this.state !== 'playing') return;
      this.time += dt;

      if (this.spawnQueue.length) {
        this.waveTime += dt;
        while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveTime) {
          const s = this.spawnQueue.shift();
          this.spawn(s.type, 0, s.hpMul, s.rewardBonus, this.wave);
        }
      }

      for (const e of this.enemies.slice()) {
        if (e.slowLeft > 0) {
          e.slowLeft -= dt;
          if (e.slowLeft <= 0) e.slow = 0;
        }
        e.curSpeed = e.speed * (1 - e.slow);
        e.dist += e.curSpeed * dt;
        const p = this.posAt(e.dist);
        if (p.x !== e.x || p.y !== e.y) e.angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x = p.x;
        e.y = p.y;
        if (e.summon && !e.dead) {
          e.summonT -= dt;
          if (e.summonT <= 0) {
            e.summonT = e.summon.every;
            this.waveRemaining[e.wave] += e.summon.count;
            for (let i = 0; i < e.summon.count; i++) this.spawn(e.summon.type, e.dist - 0.3 - i * 0.2, e.hpMul * 0.6, 0, e.wave);
            this.events.push({ type: 'summon', x: e.x, y: e.y });
          }
        }
        if (e.dist >= this.pathLen) this.leak(e);
      }

      for (const t of this.towers) this.updateTower(t, dt);
      this.updateBullets(dt);

      if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);

      if (this.state === 'playing' && this.wave >= this.totalWaves && !this.spawnQueue.length && !this.enemies.length) {
        this.state = 'won';
        this.events.push({ type: 'won' });
      }
    }

    spawn(type, dist, hpMul, rewardBonus, wave) {
      const def = GD.enemies[type];
      const hp = Math.round(def.hp * hpMul * this.enemyHp);
      const p = this.posAt(dist);
      const e = {
        type,
        hp,
        maxHp: hp,
        hpMul,
        speed: def.speed * this.enemySpeed,
        curSpeed: def.speed * this.enemySpeed,
        armor: def.armor || 0,
        reward: def.reward + (rewardBonus || 0),
        damage: def.damage,
        size: def.size,
        dist,
        x: p.x,
        y: p.y,
        angle: Math.PI / 2,
        slow: 0,
        slowLeft: 0,
        slowResist: def.slowResist || 0,
        boss: !!def.boss,
        summon: def.summon || null,
        summonT: def.summon ? def.summon.every : 0,
        wave,
        dead: false,
        seed: Math.random() * 1000,
      };
      this.enemies.push(e);
      return e;
    }

    leak(e) {
      if (e.dead) return;
      e.dead = true;
      this.stats.leaks++;
      this.hp = Math.max(0, this.hp - e.damage);
      this.events.push({ type: 'leak', x: this.core.x, y: this.core.y });
      this.enemyGone(e);
      if (this.hp <= 0 && this.state === 'playing') {
        this.state = 'lost';
        this.offers = [];
        this.events.push({ type: 'lost' });
      }
    }

    kill(e, tower) {
      e.dead = true;
      this.stats.kills++;
      if (e.boss) this.stats.bosses++;
      const reward = e.reward + this.mods.bounty;
      this.gold += reward;
      this.events.push({ type: 'kill', x: e.x, y: e.y, reward, enemy: e.type });
      const split = GD.enemies[e.type].split;
      if (split) {
        // Children count toward the parent's wave so the wave isn't "clear" until they're gone too.
        this.waveRemaining[e.wave] += split.count;
        for (let i = 0; i < split.count; i++) this.spawn(split.type, e.dist - i * 0.25, e.hpMul, 0, e.wave);
      }
      if (tower === 'nova' && this.mods.chain) {
        // Chain Reaction: a small blast that can't set off further chains.
        const s = this.statsFor('nova', 0);
        this.events.push({ type: 'explode', tower: 'nova', x: e.x, y: e.y, radius: 0.8 });
        for (const o of this.enemies.slice()) {
          if (!o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= 0.64) this.damage(o, s.damage * 0.5 + e.maxHp * 0.1, 'chain');
        }
      }
      this.enemyGone(e);
    }

    enemyGone(e) {
      this.waveRemaining[e.wave]--;
      if (this.waveRemaining[e.wave] === 0 && this.state === 'playing') {
        const m = this.mods;
        const interest = m.interest ? Math.min(40, Math.floor(this.gold * m.interest)) : 0;
        const bonus = GD.waveClearBonus(e.wave) + interest;
        this.gold += bonus;
        if (m.repair) this.hp = Math.min(this.maxHp, this.hp + m.repair);
        this.stats.wavesCleared++;
        this.events.push({ type: 'waveClear', wave: e.wave, bonus });
        if (GD.cardWaves.includes(e.wave)) this.offers.push({ ids: this.rollCards(), rerolled: false });
      }
    }

    // ---- Upgrade cards ----

    // Three different cards, weighted toward towers the player has built.
    rollCards() {
      const owned = new Set(this.towers.map((t) => t.type));
      let pool = GD.cards.filter((c) => (c.repeat || !this.cards.includes(c.id)) && (!c.locked || this.unlockedCards.includes(c.id)));
      const picks = [];
      while (picks.length < 3 && pool.length) {
        const weights = pool.map((c) => (c.tower ? (owned.has(c.tower) ? 3 : 1) : 2));
        let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
        let i = 0;
        while (roll >= weights[i]) roll -= weights[i++];
        picks.push(pool[i].id);
        pool = pool.filter((_, j) => j !== i);
      }
      return picks;
    }

    reroll() {
      const offer = this.offers[0];
      if (!offer || offer.rerolled || !this.canReroll) return false;
      offer.ids = this.rollCards();
      offer.rerolled = true;
      return true;
    }

    pickCard(id) {
      const offer = this.offers[0];
      if (!offer || !offer.ids.includes(id)) return false;
      const card = GD.cards.find((c) => c.id === id);
      card.apply(this.mods, this);
      this.cards.push(id);
      this.offers.shift();
      this.events.push({ type: 'card', id });
      return true;
    }

    damage(e, amount, tower) {
      if (e.dead) return;
      if (e.slow > 0 && this.mods.brittle) amount *= 1 + this.mods.brittle;
      if (e.boss && tower === 'rail' && this.mods.overcharge) amount *= 2;
      const armor = tower && this.mods.ignoreArmor[tower] ? 0 : e.armor;
      e.hp -= Math.max(1, amount - armor);
      e.hitFlash = 1;
      if (e.hp <= 0) this.kill(e, tower);
    }

    pickTarget(t, range) {
      const r2 = range * range;
      let best = null;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy > r2) continue;
        if (!best) best = e;
        else if (t.mode === 'last' ? e.dist < best.dist : t.mode === 'strong' ? e.hp > best.hp || (e.hp === best.hp && e.dist > best.dist) : e.dist > best.dist) best = e;
      }
      return best;
    }

    updateTower(t, dt) {
      const def = GD.towers[t.type];
      const s = def.tiers[t.tier];
      t.cooldown = Math.max(0, t.cooldown - dt);
      t.recoil = Math.max(0, t.recoil - dt * 6);

      if (def.kind === 'aura') {
        if (t.cooldown > 0) return;
        const r2 = s.range * s.range;
        const inRange = this.enemies.filter((e) => !e.dead && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r2);
        if (!inRange.length) return;
        t.cooldown = 1 / s.rate;
        t.recoil = 1;
        for (const e of inRange) {
          const slow = s.slow * (1 - e.slowResist);
          if (slow >= e.slow || e.slowLeft <= 0) e.slow = slow;
          e.slowLeft = Math.max(e.slowLeft, s.slowTime);
          this.damage(e, s.damage, t.type);
        }
        this.events.push({ type: 'pulse', tower: t.type, x: t.x, y: t.y, range: s.range });
        return;
      }

      const target = this.pickTarget(t, s.range);
      if (!target) return;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / s.rate;
      t.recoil = 1;
      const muzzle = def.kind === 'beam' ? 0.42 : 0.32;
      const mx = t.x + Math.cos(t.angle) * muzzle;
      const my = t.y + Math.sin(t.angle) * muzzle;

      if (def.kind === 'beam') {
        if (!this.mods.pierce) {
          this.events.push({ type: 'beam', tower: t.type, x: mx, y: my, x2: target.x, y2: target.y });
          this.damage(target, s.damage, t.type);
          return;
        }
        // Piercing: the beam runs to the edge of range and hits everything close to the line.
        const ex = t.x + Math.cos(t.angle) * s.range;
        const ey = t.y + Math.sin(t.angle) * s.range;
        this.events.push({ type: 'beam', tower: t.type, x: mx, y: my, x2: ex, y2: ey });
        for (const e of this.enemies.slice()) {
          if (!e.dead && distToSegment(e.x, e.y, mx, my, ex, ey) <= e.size + 0.12) this.damage(e, s.damage, t.type);
        }
        return;
      }

      let tx = target.x;
      let ty = target.y;
      if (def.kind === 'splash') {
        // Lead the target: aim where it will be when the shell lands.
        const flight = Math.hypot(tx - mx, ty - my) / def.bulletSpeed;
        const p = this.posAt(target.dist + target.curSpeed * flight);
        tx = p.x;
        ty = p.y;
      }
      this.bullets.push({ tower: t.type, kind: def.kind, x: mx, y: my, target, tx, ty, damage: s.damage, splash: s.splash, speed: def.bulletSpeed, done: false });
      this.events.push({ type: 'shoot', tower: t.type, x: mx, y: my, angle: t.angle });
    }

    updateBullets(dt) {
      for (const b of this.bullets) {
        const homing = b.kind === 'bullet';
        if (homing && !b.target.dead) {
          b.tx = b.target.x;
          b.ty = b.target.y;
        }
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const dist = Math.hypot(dx, dy);
        const step = b.speed * dt;
        const reach = step + (homing && !b.target.dead ? b.target.size : 0);
        if (dist > reach) {
          b.x += (dx / dist) * step;
          b.y += (dy / dist) * step;
          continue;
        }
        b.done = true;
        if (b.kind === 'splash') this.explode(b);
        else if (!b.target.dead) {
          this.events.push({ type: 'hit', tower: b.tower, x: b.target.x, y: b.target.y });
          this.damage(b.target, b.damage, b.tower);
        } else this.events.push({ type: 'fizzle', x: b.tx, y: b.ty });
      }
      if (this.bullets.some((b) => b.done)) this.bullets = this.bullets.filter((b) => !b.done);
    }

    explode(b) {
      const r2 = b.splash * b.splash;
      this.events.push({ type: 'explode', tower: b.tower, x: b.tx, y: b.ty, radius: b.splash });
      // Snapshot: splitter shards spawned by this blast shouldn't take the same hit.
      for (const e of this.enemies.slice()) {
        if (!e.dead && (e.x - b.tx) ** 2 + (e.y - b.ty) ** 2 <= r2) this.damage(e, b.damage, b.tower);
      }
    }
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  GD.Game = Game;
})(window.GD = window.GD || {});
