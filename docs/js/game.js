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

    build(type, c, r) {
      const def = GD.towers[type];
      const cost = def.tiers[0].cost;
      if (this.state !== 'playing' || !this.canBuild(c, r) || this.gold < cost) return null;
      this.gold -= cost;
      const tower = { type, tier: 0, c, r, x: c + 0.5, y: r + 0.5, cooldown: 0, angle: -Math.PI / 2, spent: cost, recoil: 0, mode: def.mode || null };
      this.towers.push(tower);
      this.events.push({ type: 'build', tower: type, x: tower.x, y: tower.y, range: def.tiers[0].range });
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
      this.events.push({ type: 'upgrade', tower: t.type, x: t.x, y: t.y, range: this.towerStats(t).range });
      return true;
    }

    cycleMode(t) {
      if (!t.mode) return;
      const modes = Object.keys(GD.targetModes);
      t.mode = modes[(modes.indexOf(t.mode) + 1) % modes.length];
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
      const preview = this.nextWavePreview();
      this.wave++;
      this.spawnQueue = GD.makeWave(this.wave);
      this.waveTime = 0;
      this.waveRemaining[this.wave] = this.spawnQueue.length;
      for (const s of this.spawnQueue) this.seen[s.type] = true;
      this.events.push({ type: 'waveStart', wave: this.wave, newType: preview.newType });
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
      return { wave: this.wave + 1, counts, newType };
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

      for (const e of this.enemies) {
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
      const hp = Math.round(def.hp * hpMul);
      const p = this.posAt(dist);
      const e = {
        type,
        hp,
        maxHp: hp,
        hpMul,
        speed: def.speed,
        curSpeed: def.speed,
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
        this.events.push({ type: 'lost' });
      }
    }

    kill(e) {
      e.dead = true;
      this.stats.kills++;
      this.gold += e.reward;
      this.events.push({ type: 'kill', x: e.x, y: e.y, reward: e.reward, enemy: e.type });
      const split = GD.enemies[e.type].split;
      if (split) {
        // Children count toward the parent's wave so the wave isn't "clear" until they're gone too.
        this.waveRemaining[e.wave] += split.count;
        for (let i = 0; i < split.count; i++) this.spawn(split.type, e.dist - i * 0.25, e.hpMul, 0, e.wave);
      }
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

    damage(e, amount) {
      if (e.dead) return;
      e.hp -= Math.max(1, amount - e.armor);
      e.hitFlash = 1;
      if (e.hp <= 0) this.kill(e);
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
          if (s.slow >= e.slow || e.slowLeft <= 0) e.slow = s.slow;
          e.slowLeft = Math.max(e.slowLeft, s.slowTime);
          this.damage(e, s.damage);
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
        this.events.push({ type: 'beam', tower: t.type, x: mx, y: my, x2: target.x, y2: target.y });
        this.damage(target, s.damage);
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
      this.bullets.push({ tower: t.type, kind: def.kind, x: mx, y: my, target, tx, ty, damage: s.damage, splash: s.splash || 0, speed: def.bulletSpeed, done: false });
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
          this.damage(b.target, b.damage);
        } else this.events.push({ type: 'fizzle', x: b.tx, y: b.ty });
      }
      if (this.bullets.some((b) => b.done)) this.bullets = this.bullets.filter((b) => !b.done);
    }

    explode(b) {
      const r2 = b.splash * b.splash;
      this.events.push({ type: 'explode', tower: b.tower, x: b.tx, y: b.ty, radius: b.splash });
      // Snapshot: splitter shards spawned by this blast shouldn't take the same hit.
      for (const e of this.enemies.slice()) {
        if (!e.dead && (e.x - b.tx) ** 2 + (e.y - b.ty) ** 2 <= r2) this.damage(e, b.damage);
      }
    }
  }

  GD.Game = Game;
})(window.GD = window.GD || {});
