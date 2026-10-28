// Game simulation. No DOM or canvas access here, so it can also run headless in tests.
// Units: positions are in tiles (tile centers sit on .5), time is in seconds.
(function (GD) {
  const TILE = { EMPTY: 0, PATH: 1, CORE: 2 };
  GD.TILE = TILE;

  class Game {
    constructor(mapIndex) {
      const cfg = GD.config;
      this.cols = cfg.cols;
      this.rows = cfg.rows;
      this.map = GD.maps[mapIndex || 0];
      this.gold = cfg.startGold;
      this.hp = cfg.coreHp;
      this.maxHp = cfg.coreHp;
      this.wave = 0;
      this.totalWaves = cfg.totalWaves;
      this.state = 'playing'; // playing | won | lost
      this.time = 0;
      this.towers = [];
      this.enemies = [];
      this.bullets = [];
      this.spawnQueue = [];
      this.waveTime = 0;
      this.waveRemaining = {};
      this.events = []; // drained by the renderer for effects and sounds
      this.stats = { kills: 0, leaks: 0 };
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

    build(type, c, r) {
      const def = GD.towers[type];
      const cost = def.tiers[0].cost;
      if (this.state !== 'playing' || !this.canBuild(c, r) || this.gold < cost) return null;
      this.gold -= cost;
      const tower = { type, tier: 0, c, r, x: c + 0.5, y: r + 0.5, cooldown: 0, angle: -Math.PI / 2, spent: cost, recoil: 0 };
      this.towers.push(tower);
      this.events.push({ type: 'build', x: tower.x, y: tower.y });
      return tower;
    }

    towerStats(t) {
      return GD.towers[t.type].tiers[t.tier];
    }

    upgradeCost(t) {
      const tiers = GD.towers[t.type].tiers;
      return t.tier < tiers.length - 1 ? tiers[t.tier + 1].cost : null;
    }

    upgrade(t) {
      const cost = this.upgradeCost(t);
      if (this.state !== 'playing' || cost === null || this.gold < cost) return false;
      this.gold -= cost;
      t.spent += cost;
      t.tier++;
      this.events.push({ type: 'upgrade', x: t.x, y: t.y });
      return true;
    }

    sellValue(t) {
      return Math.floor(t.spent * GD.config.sellRefund);
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
      this.wave++;
      this.spawnQueue = GD.makeWave(this.wave);
      this.waveTime = 0;
      this.waveRemaining[this.wave] = this.spawnQueue.length;
      this.events.push({ type: 'waveStart', wave: this.wave });
      if (early) {
        this.gold += GD.config.earlyCallBonus;
        this.events.push({ type: 'earlyBonus', amount: GD.config.earlyCallBonus });
      }
      return true;
    }

    nextWavePreview() {
      if (this.wave >= this.totalWaves) return null;
      return { wave: this.wave + 1, count: GD.makeWave(this.wave + 1).length };
    }

    // ---- Simulation ----

    update(dt) {
      if (this.state !== 'playing') return;
      this.time += dt;

      if (this.spawnQueue.length) {
        this.waveTime += dt;
        while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveTime) this.spawn(this.spawnQueue.shift());
      }

      for (const e of this.enemies) {
        e.dist += e.speed * dt;
        const p = this.posAt(e.dist);
        e.x = p.x;
        e.y = p.y;
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

    spawn(s) {
      const def = GD.enemies[s.type];
      const hp = Math.round(def.hp * s.hpMul);
      const p = this.posAt(0);
      this.enemies.push({
        type: s.type,
        hp,
        maxHp: hp,
        speed: def.speed,
        reward: def.reward + (s.rewardBonus || 0),
        damage: def.damage,
        size: def.size,
        dist: 0,
        x: p.x,
        y: p.y,
        wave: this.wave,
        dead: false,
        seed: Math.random() * 1000,
      });
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
        this.events.push({ type: 'lost' });
      }
    }

    kill(e) {
      e.dead = true;
      this.stats.kills++;
      this.gold += e.reward;
      this.events.push({ type: 'kill', x: e.x, y: e.y, reward: e.reward, enemy: e.type });
      this.enemyGone(e);
    }

    enemyGone(e) {
      this.waveRemaining[e.wave]--;
      if (this.waveRemaining[e.wave] === 0 && this.state === 'playing') {
        const bonus = GD.waveClearBonus(e.wave);
        this.gold += bonus;
        this.events.push({ type: 'waveClear', wave: e.wave, bonus });
      }
    }

    updateTower(t, dt) {
      const s = this.towerStats(t);
      t.cooldown = Math.max(0, t.cooldown - dt);
      t.recoil = Math.max(0, t.recoil - dt * 6);

      // Target the enemy furthest along the path that is in range.
      const r2 = s.range * s.range;
      let target = null;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy <= r2 && (!target || e.dist > target.dist)) target = e;
      }
      if (!target) return;

      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / s.rate;
      t.recoil = 1;
      const muzzle = 0.32;
      const bx = t.x + Math.cos(t.angle) * muzzle;
      const by = t.y + Math.sin(t.angle) * muzzle;
      this.bullets.push({ x: bx, y: by, px: bx, py: by, target, tx: target.x, ty: target.y, damage: s.damage, speed: GD.towers[t.type].bulletSpeed, done: false });
      this.events.push({ type: 'shoot', x: bx, y: by, angle: t.angle });
    }

    updateBullets(dt) {
      for (const b of this.bullets) {
        if (!b.target.dead) {
          b.tx = b.target.x;
          b.ty = b.target.y;
        }
        b.px = b.x;
        b.py = b.y;
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const dist = Math.hypot(dx, dy);
        const step = b.speed * dt;
        const reach = step + (b.target.dead ? 0 : b.target.size);
        if (dist <= reach) {
          b.done = true;
          if (!b.target.dead) this.hit(b.target, b.damage);
          else this.events.push({ type: 'fizzle', x: b.tx, y: b.ty });
        } else {
          b.x += (dx / dist) * step;
          b.y += (dy / dist) * step;
        }
      }
      if (this.bullets.some((b) => b.done)) this.bullets = this.bullets.filter((b) => !b.done);
    }

    hit(e, damage) {
      e.hp -= damage;
      e.hitFlash = 1;
      this.events.push({ type: 'hit', x: e.x, y: e.y });
      if (e.hp <= 0) this.kill(e);
    }
  }

  GD.Game = Game;
})(window.GD = window.GD || {});
