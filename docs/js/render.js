// Canvas renderer. Reads game state, turns game events into effects, never changes the simulation.
(function (GD) {
  const C = {
    cyan: '#3ef0ff',
    magenta: '#ff3d8b',
    amber: '#ffc547',
    ice: '#8fd3ff',
    text: '#ece9ff',
    plate: '#121433',
    enemyA: '#3ef0ff',
    enemyB: '#ff3d8b',
  };
  GD.colors = C;
  const FONT = '"Chakra Petch", "Avenir Next Condensed", "Arial Narrow", system-ui, sans-serif';

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')';
  }
  GD.rgba = rgba;

  // Recolors towers and enemies. The renderer and the panels read colors live, so this takes effect at once.
  GD.applySkin = function (id) {
    const skin = GD.skins[id] || GD.skins.neon;
    GD.skin = skin;
    for (const type of GD.towerOrder) GD.towers[type].color = skin.towers[type];
    C.enemyA = skin.enemy[0];
    C.enemyB = skin.enemy[1];
  };
  GD.applySkin('neon');

  const towerColor = (type) => (GD.towers[type] ? GD.towers[type].color : C.cyan);

  // Repeatable pseudo-random numbers in [0, 1), so textures and ambient effects don't flicker between frames.
  function hash(a, b, c) {
    const x = Math.sin(a * 127.1 + b * 311.7 + (c || 0) * 74.7) * 43758.5453;
    return x - Math.floor(x);
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.bg = document.createElement('canvas');
      this.dpr = 1;
      this.ts = 32;
      this.ox = 0;
      this.oy = 0;
      this.w = 0;
      this.h = 0;
      this.theme = GD.themes.grid;
      this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.reset();
    }

    reset() {
      this.particles = [];
      this.rings = [];
      this.beams = [];
      this.bolts = [];
      this.texts = [];
      this.banner = null;
      this.shake = 0;
      this.flash = 0;
      this.flashColor = C.magenta;
      this.coreHit = 0;
      this.time = 0;
    }

    // reserve: pixels kept free under the grid (for the boss health bar).
    resize(w, h, game, reserve) {
      reserve = reserve || 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.w = w;
      this.h = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ts = Math.max(8, Math.floor(Math.min(w / game.cols, (h - reserve) / game.rows)));
      this.ox = Math.floor((w - this.ts * game.cols) / 2);
      this.oy = Math.floor((h - reserve - this.ts * game.rows) / 2);
      this.buildBackground(game);
    }

    X(x) {
      return this.ox + x * this.ts;
    }

    Y(y) {
      return this.oy + y * this.ts;
    }

    toTile(px, py) {
      return { c: Math.floor((px - this.ox) / this.ts), r: Math.floor((py - this.oy) / this.ts) };
    }

    // Field position (in tiles) under a point on the canvas.
    toField(px, py) {
      return { x: (px - this.ox) / this.ts, y: (py - this.oy) / this.ts };
    }

    pathLine(ctx, game) {
      ctx.beginPath();
      for (const lane of game.lanes) {
        const pts = lane.pts;
        ctx.moveTo(this.X(pts[0].x), this.Y(Math.max(0, pts[0].y)));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(this.X(pts[i].x), this.Y(pts[i].y));
      }
    }

    buildBackground(game) {
      const th = (this.theme = GD.themes[game.map.theme] || GD.themes.grid);
      const b = this.bg;
      b.width = this.canvas.width;
      b.height = this.canvas.height;
      const g = b.getContext('2d');
      const ts = this.ts;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.fillStyle = th.bg;
      g.fillRect(0, 0, this.w, this.h);

      const fw = ts * game.cols;
      const fh = ts * game.rows;
      const cx = this.ox + fw / 2;
      const glow = g.createRadialGradient(cx, this.oy + fh * 0.45, 0, cx, this.oy + fh * 0.45, fh * 0.7);
      glow.addColorStop(0, rgba(th.glow, 0.28));
      glow.addColorStop(1, rgba(th.glow, 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, this.w, this.h);
      this.backdrop(g, game, fw, fh);

      const pad = Math.max(2, ts * 0.07);
      for (let r = 0; r < game.rows; r++) {
        for (let c = 0; c < game.cols; c++) {
          if (game.grid[r][c] !== GD.TILE.EMPTY) continue;
          const x = this.X(c) + pad;
          const y = this.Y(r) + pad;
          const s = ts - pad * 2;
          g.beginPath();
          g.roundRect(x, y, s, s, ts * 0.1);
          if (th.texture === 'outline') {
            g.setLineDash([ts * 0.12, ts * 0.1]);
            g.strokeStyle = rgba(th.tile, 0.16);
            g.lineWidth = 1;
            g.stroke();
            g.setLineDash([]);
          } else {
            g.fillStyle = rgba(th.tile, 0.07);
            g.fill();
            g.strokeStyle = rgba(th.tile, 0.11);
            g.lineWidth = 1;
            g.stroke();
          }
          this.texture(g, th, c, r, x, y, s);
        }
      }

      // Lanes: a glowing rim, then the dark floor on top of it.
      g.lineJoin = 'miter';
      g.lineCap = 'butt';
      this.pathLine(g, game);
      g.shadowColor = rgba(th.edge, 0.6);
      g.shadowBlur = ts * 0.35;
      g.strokeStyle = rgba(th.edge, 0.34);
      g.lineWidth = ts * 0.8;
      g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = th.lane;
      g.lineWidth = ts * 0.8 - 3;
      g.stroke();
      g.strokeStyle = rgba(th.edge, 0.06);
      g.lineWidth = ts * 0.34;
      g.stroke();

      // Entry gates where enemies come in at the top edge.
      const half = ts * 0.46;
      g.strokeStyle = th.edge;
      g.lineWidth = 2;
      for (const lane of game.lanes) {
        const ex = this.X(lane.pts[0].x);
        const ey = this.Y(0);
        g.beginPath();
        g.moveTo(ex - half, ey + ts * 0.25);
        g.lineTo(ex - half, ey + 1);
        g.lineTo(ex - half * 0.5, ey + 1);
        g.moveTo(ex + half * 0.5, ey + 1);
        g.lineTo(ex + half, ey + 1);
        g.lineTo(ex + half, ey + ts * 0.25);
        g.stroke();
      }
    }

    // Large static shapes behind the tiles that set each sector apart.
    backdrop(g, game, fw, fh) {
      const th = this.theme;
      const ts = this.ts;
      g.save();
      if (th.ambient === 'horizon') {
        // A striped sunset low in the sky, half hidden behind the grid.
        const sx = this.ox + fw / 2;
        const sy = this.oy + fh * 0.32;
        const sr = fw * 0.42;
        const sun = g.createLinearGradient(0, sy - sr, 0, sy + sr);
        sun.addColorStop(0, rgba('#ffb347', 0.22));
        sun.addColorStop(1, rgba('#ff3d8b', 0.12));
        g.fillStyle = sun;
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = th.bg;
        for (let i = 0; i < 6; i++) g.fillRect(sx - sr, sy + sr * (0.1 + i * 0.16), sr * 2, sr * (0.03 + i * 0.012));
      } else if (th.ambient === 'stars') {
        for (const [px, py, col] of [[0.2, 0.25, '#7a4dff'], [0.8, 0.7, '#3ef0ff']]) {
          const n = g.createRadialGradient(this.ox + fw * px, this.oy + fh * py, 0, this.ox + fw * px, this.oy + fh * py, fw * 0.6);
          n.addColorStop(0, rgba(col, 0.1));
          n.addColorStop(1, rgba(col, 0));
          g.fillStyle = n;
          g.fillRect(0, 0, this.w, this.h);
        }
      } else if (th.ambient === 'embers') {
        const heat = g.createLinearGradient(0, this.oy + fh, 0, this.oy + fh * 0.4);
        heat.addColorStop(0, rgba('#ff4a1a', 0.16));
        heat.addColorStop(1, rgba('#ff4a1a', 0));
        g.fillStyle = heat;
        g.fillRect(0, 0, this.w, this.oy + fh);
      } else if (th.ambient === 'snow') {
        // Faint server racks in the margins.
        g.strokeStyle = rgba(th.tile, 0.05);
        g.lineWidth = 1;
        for (let y = this.oy; y < this.oy + fh; y += ts * 0.5) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(this.w, y);
          g.stroke();
        }
      }
      g.restore();
    }

    // Pattern on one buildable tile at (x, y) with size s.
    texture(g, th, c, r, x, y, s) {
      const h1 = hash(c, r, 1);
      const h2 = hash(c, r, 2);
      g.save();
      g.strokeStyle = rgba(th.tile, 0.22);
      g.fillStyle = rgba(th.tile, 0.26);
      g.lineWidth = 1;
      switch (th.texture) {
        case 'traces': {
          // A circuit trace from one edge to a solder pad.
          if (h1 < 0.35) break;
          const side = Math.floor(h2 * 4);
          const k = 0.3 + hash(c, r, 3) * 0.4;
          const pts = [[x + s * k, y], [x + s, y + s * k], [x + s * k, y + s], [x, y + s * k]][side];
          const px = x + s * (0.3 + hash(c, r, 4) * 0.4);
          const py = y + s * (0.3 + hash(c, r, 5) * 0.4);
          g.beginPath();
          g.moveTo(pts[0], pts[1]);
          if (side % 2) g.lineTo(px, pts[1]);
          else g.lineTo(pts[0], py);
          g.lineTo(px, py);
          g.stroke();
          g.beginPath();
          g.arc(px, py, s * 0.06, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case 'bits':
          for (let i = 0; i < 9; i++) {
            if (hash(c * 3 + (i % 3), r * 3 + Math.floor(i / 3), 6) < 0.72) continue;
            g.fillRect(x + s * (0.2 + (i % 3) * 0.24), y + s * (0.2 + Math.floor(i / 3) * 0.24), s * 0.12, s * 0.12);
          }
          break;
        case 'scanlines':
          for (let i = 1; i < 4; i++) {
            g.beginPath();
            g.moveTo(x + s * 0.12, y + s * i * 0.25);
            g.lineTo(x + s * 0.88, y + s * i * 0.25);
            g.stroke();
          }
          break;
        case 'frost': {
          // Frost cracks branching from one corner.
          const cx = h1 < 0.5 ? x + s * 0.1 : x + s * 0.9;
          const cy = h2 < 0.5 ? y + s * 0.1 : y + s * 0.9;
          const dx = h1 < 0.5 ? 1 : -1;
          const dy = h2 < 0.5 ? 1 : -1;
          g.beginPath();
          g.moveTo(cx, cy);
          g.lineTo(cx + dx * s * 0.45, cy + dy * s * 0.3);
          g.lineTo(cx + dx * s * 0.62, cy + dy * s * 0.6);
          g.moveTo(cx + dx * s * 0.45, cy + dy * s * 0.3);
          g.lineTo(cx + dx * s * 0.75, cy + dy * s * 0.2);
          g.moveTo(cx, cy);
          g.lineTo(cx + dx * s * 0.2, cy + dy * s * 0.5);
          g.stroke();
          break;
        }
        case 'plates':
          for (const [px, py] of [[0.16, 0.16], [0.84, 0.16], [0.16, 0.84], [0.84, 0.84]]) {
            g.beginPath();
            g.arc(x + s * px, y + s * py, s * 0.045, 0, Math.PI * 2);
            g.fill();
          }
          if (h1 > 0.5) {
            g.beginPath();
            g.moveTo(x + s * 0.3, y + s * 0.7);
            g.lineTo(x + s * 0.7, y + s * 0.3);
            g.stroke();
          }
          break;
        case 'outline':
          g.beginPath();
          g.moveTo(x + s * 0.42, y + s * 0.5);
          g.lineTo(x + s * 0.58, y + s * 0.5);
          g.moveTo(x + s * 0.5, y + s * 0.42);
          g.lineTo(x + s * 0.5, y + s * 0.58);
          g.stroke();
          break;
      }
      g.restore();
    }

    // ---- Events to effects ----

    consume(game) {
      for (const ev of game.events) {
        const color = towerColor(ev.tower);
        switch (ev.type) {
          case 'shoot':
            this.spark(ev.x, ev.y, 2, color, 1.5, 0.15);
            break;
          case 'hit':
            this.spark(ev.x, ev.y, 3, color, 2.5, 0.25);
            break;
          case 'beam':
            this.beams.push({ x1: ev.x, y1: ev.y, x2: ev.x2, y2: ev.y2, life: 0.22, max: 0.22, color, width: 0.14 });
            this.spark(ev.x2, ev.y2, 8, color, 3.5, 0.4);
            break;
          case 'zap':
            this.bolts.push({ pts: this.jagged(ev.pts), life: 0.2, max: 0.2, color });
            for (const p of ev.pts.slice(1)) this.spark(p.x, p.y, 3, color, 2.5, 0.25);
            break;
          case 'explode':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.15, r1: ev.radius, life: 0.3, max: 0.3, color, width: 3 });
            this.spark(ev.x, ev.y, 14, color, 3, 0.45);
            break;
          case 'pulse':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.3, r1: ev.range, life: 0.45, max: 0.45, color, width: 2 });
            break;
          case 'kill':
            this.spark(ev.x, ev.y, ev.enemy === 'swarm' ? 5 : 12, C.enemyB, 3.5, 0.6);
            this.spark(ev.x, ev.y, 4, C.enemyA, 2.5, 0.5);
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.1, r1: ev.enemy === 'brick' ? 0.9 : 0.6, life: 0.35, max: 0.35, color: C.enemyB });
            this.texts.push({ x: ev.x, y: ev.y - 0.2, text: '+' + ev.reward, life: 0.9, max: 0.9, color: C.amber });
            break;
          case 'leak':
            this.shake = 1;
            this.flash = 1;
            this.flashColor = C.magenta;
            this.coreHit = 1;
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.3, r1: 1.4, life: 0.5, max: 0.5, color: C.magenta });
            break;
          case 'build':
          case 'upgrade':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: 0.9, life: 0.4, max: 0.4, color });
            // Show the tower's reach for a moment so the player sees what it covers.
            if (ev.range) this.rings.push({ x: ev.x, y: ev.y, r0: ev.range, r1: ev.range, life: 1.1, max: 1.1, color, dashed: true });
            this.spark(ev.x, ev.y, 8, color, 2, 0.4);
            break;
          case 'mine':
            this.texts.push({ x: ev.x, y: ev.y - 0.3, text: '+' + ev.amount, life: 1.4, max: 1.4, color: C.amber, big: true });
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: 0.7, life: 0.5, max: 0.5, color: C.amber });
            this.spark(ev.x, ev.y, 10, C.amber, 2, 0.6);
            break;
          case 'summon':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: 0.8, life: 0.4, max: 0.4, color: C.enemyB });
            this.spark(ev.x, ev.y, 6, C.enemyB, 2, 0.4);
            break;
          case 'sell':
            this.spark(ev.x, ev.y, 10, C.amber, 2, 0.5);
            break;
          case 'strike': {
            const col = GD.abilities.strike.color;
            this.beams.push({ x1: ev.x, y1: -1, x2: ev.x, y2: ev.y, life: 0.35, max: 0.35, color: col, width: 0.5 });
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: ev.radius, life: 0.45, max: 0.45, color: col, width: 4 });
            this.rings.push({ x: ev.x, y: ev.y, r0: ev.radius * 0.5, r1: ev.radius * 1.5, life: 0.7, max: 0.7, color: '#ffffff', width: 1.5 });
            this.spark(ev.x, ev.y, 30, col, 5, 0.7);
            this.shake = Math.max(this.shake, 0.7);
            this.flash = 0.6;
            this.flashColor = col;
            break;
          }
          case 'stasis':
            this.rings.push({ x: game.cols / 2, y: game.rows / 2, r0: 0.5, r1: game.rows * 0.7, life: 0.7, max: 0.7, color: GD.abilities.stasis.color, width: 3 });
            this.flash = 0.5;
            this.flashColor = GD.abilities.stasis.color;
            this.banner = { text: 'STASIS', sub: '', life: 1, max: 1, small: true };
            break;
          case 'surge':
            for (const t of game.towers) if (GD.isAttacker(t.type)) this.rings.push({ x: t.x, y: t.y, r0: 0.2, r1: 0.7, life: 0.5, max: 0.5, color: towerColor(t.type), width: 2 });
            this.banner = { text: 'SURGE', sub: '', life: 1, max: 1, small: true };
            break;
          case 'waveStart': {
            let sub = ev.wave === game.totalWaves ? 'FINAL WAVE' : '';
            if (ev.newType) sub = 'NEW · ' + GD.enemies[ev.newType].name.toUpperCase();
            if (ev.boss) sub = 'BOSS · ' + GD.enemies[ev.boss].name.toUpperCase();
            this.banner = { text: 'WAVE ' + ev.wave, sub, life: 1.8, max: 1.8 };
            break;
          }
          case 'waveClear':
            this.texts.push({ x: game.core.x, y: game.core.y - 0.8, text: 'WAVE ' + ev.wave + ' CLEAR +' + ev.bonus, life: 1.6, max: 1.6, color: C.amber, big: true });
            break;
          case 'earlyBonus':
            this.texts.push({ x: game.lanes[0].pts[0].x, y: 0.8, text: 'EARLY +' + ev.amount, life: 1.2, max: 1.2, color: C.amber, big: true });
            break;
        }
      }
      game.events.length = 0;
      if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    }

    spark(x, y, n, color, speed, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.6);
        const l = life * (0.6 + Math.random() * 0.4);
        this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, color, size: 0.04 + Math.random() * 0.05 });
      }
    }

    // Breaks a lightning path into short zigzag pieces.
    jagged(pts) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const steps = Math.max(2, Math.round(len * 4));
        for (let s = 1; s < steps; s++) {
          const k = s / steps;
          const off = (Math.random() - 0.5) * 0.25;
          out.push({ x: a.x + dx * k - (dy / len) * off, y: a.y + dy * k + (dx / len) * off });
        }
        out.push(b);
      }
      return out;
    }

    // ---- Drawing ----

    // edt: effect time step (0 while paused, scaled by game speed).
    draw(game, sel, edt) {
      const ctx = this.ctx;
      const ts = this.ts;
      const dpr = this.dpr;
      this.time += edt;

      let sx = 0;
      let sy = 0;
      if (this.shake > 0 && !this.reducedMotion) {
        const s = this.shake * ts * 0.12;
        sx = (Math.random() * 2 - 1) * s;
        sy = (Math.random() * 2 - 1) * s;
      }
      this.shake = Math.max(0, this.shake - edt * 3);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.theme.bg;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.bg, sx * dpr, sy * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);

      this.drawAmbient(game);
      this.drawStream(game);
      this.drawSelection(game, sel);
      this.drawLinks(game);
      for (const t of game.towers) this.drawTower(t, sel && sel.tower === t, game.surge > 0);
      this.drawCore(game, edt);
      const frozen = game.stasis > 0;
      for (const e of game.enemies) this.drawEnemy(e, edt, frozen);
      this.drawLasers(game, edt);
      this.drawBullets(game);
      this.drawEffects(edt);
      if (frozen) this.drawStasis(game);
      if (this.aim) this.drawFrame(game, GD.abilities.strike.color);
      this.drawBanner(game, edt);

      if (this.flash > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = rgba(this.flashColor, (this.flash * 0.22).toFixed(3));
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.flash = Math.max(0, this.flash - edt * 4);
      }
    }

    // Slow moving layer over the field: code rain, snow, embers, stars and so on.
    drawAmbient(game) {
      const ctx = this.ctx;
      const ts = this.ts;
      const th = this.theme;
      const t = this.reducedMotion ? 0 : this.time;
      const fw = ts * game.cols;
      const fh = ts * game.rows;
      const rows = game.rows;
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.ox, this.oy, fw, fh);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      switch (th.ambient) {
        case 'scan': {
          // A soft band sweeping down the grid.
          const p = (t / 7) % 1;
          const y = this.oy - ts * 2 + (fh + ts * 4) * p;
          const band = ctx.createLinearGradient(0, y - ts, 0, y + ts);
          band.addColorStop(0, rgba(th.tile, 0));
          band.addColorStop(0.5, rgba(th.tile, 0.07));
          band.addColorStop(1, rgba(th.tile, 0));
          ctx.fillStyle = band;
          ctx.fillRect(this.ox, y - ts, fw, ts * 2);
          break;
        }
        case 'rain':
          for (let i = 0; i < 16; i++) {
            const x = this.ox + (Math.floor(hash(i, 1) * game.cols * 3) + 0.5) * (ts / 3);
            const speed = 1.5 + hash(i, 2) * 2.5;
            const y = ((t * speed + hash(i, 3) * (rows + 6)) % (rows + 6)) - 3;
            for (let k = 0; k < 6; k++) {
              ctx.fillStyle = rgba(th.edge, (k === 0 ? 0.35 : 0.2 - k * 0.03).toFixed(3));
              ctx.fillRect(x - ts * 0.04, this.Y(y - k * 0.28), ts * 0.08, ts * 0.16);
            }
          }
          break;
        case 'horizon':
          ctx.strokeStyle = rgba(th.tile, 0.12);
          ctx.lineWidth = 1;
          for (let k = 0; k < 7; k++) {
            const p = (t * 0.06 + k / 7) % 1;
            const y = this.oy + fh * 0.45 + fh * 0.55 * p * p;
            ctx.globalAlpha = p;
            ctx.beginPath();
            ctx.moveTo(this.ox, y);
            ctx.lineTo(this.ox + fw, y);
            ctx.stroke();
          }
          break;
        case 'snow':
          ctx.fillStyle = 'rgba(235, 248, 255, 0.4)';
          for (let i = 0; i < 36; i++) {
            const h = hash(i, 7);
            const y = ((t * (0.3 + h * 0.4) + hash(i, 8) * (rows + 1)) % (rows + 1)) - 0.5;
            const x = hash(i, 9) * game.cols + Math.sin(t * 0.8 + i) * 0.3;
            ctx.beginPath();
            ctx.arc(this.X(x), this.Y(y), ts * (0.02 + h * 0.03), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'embers':
          for (let i = 0; i < 26; i++) {
            const h = hash(i, 10);
            const y = rows - ((t * (0.4 + h * 0.6) + hash(i, 11) * (rows + 1)) % (rows + 1)) + 0.5;
            const x = hash(i, 12) * game.cols + Math.sin(t * 1.3 + i * 2) * 0.2;
            const a = 0.25 + 0.25 * Math.sin(t * 6 + i);
            ctx.fillStyle = rgba(i % 3 ? '#ff8a3d' : '#ffd36b', a.toFixed(3));
            const s = ts * (0.04 + h * 0.04);
            ctx.fillRect(this.X(x) - s / 2, this.Y(y) - s / 2, s, s);
          }
          break;
        case 'stars':
          for (let i = 0; i < 50; i++) {
            const h = hash(i, 13);
            const a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * (0.8 + h * 2) + i));
            ctx.fillStyle = rgba(i % 5 ? '#ffffff' : '#a77bff', a.toFixed(3));
            const s = ts * (0.025 + h * 0.035);
            ctx.fillRect(this.X(hash(i, 14) * game.cols) - s / 2, this.Y(hash(i, 15) * rows) - s / 2, s, s);
          }
          break;
      }
      ctx.restore();
    }

    drawStream(game) {
      const ctx = this.ctx;
      const ts = this.ts;
      ctx.save();
      ctx.setLineDash([ts * 0.12, ts * 0.55]);
      ctx.lineDashOffset = -this.time * ts * 1.4;
      ctx.strokeStyle = rgba(this.theme.stream, 0.45);
      ctx.lineWidth = Math.max(1.5, ts * 0.05);
      this.pathLine(ctx, game);
      ctx.stroke();
      ctx.restore();
    }

    drawSelection(game, sel) {
      if (!sel) return;
      const ctx = this.ctx;
      const ts = this.ts;
      const t = sel.tower;
      const c = t ? t.c : sel.c;
      const r = t ? t.r : sel.r;
      const color = t ? towerColor(t.type) : C.cyan;
      ctx.save();
      const range = t ? game.towerStats(t).range : 0;
      if (range) {
        ctx.beginPath();
        ctx.arc(this.X(c + 0.5), this.Y(r + 0.5), range * ts, 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, 0.07);
        ctx.fill();
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -this.time * 12;
        ctx.strokeStyle = rgba(color, 0.6);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.X(c) + 1, this.Y(r) + 1, ts - 2, ts - 2);
      ctx.restore();
    }

    // Amplifier links: a dashed line to each tower it boosts.
    drawLinks(game) {
      const ctx = this.ctx;
      const ts = this.ts;
      ctx.save();
      ctx.lineWidth = Math.max(1.5, ts * 0.05);
      ctx.setLineDash([ts * 0.08, ts * 0.1]);
      ctx.lineDashOffset = -this.time * ts * 0.6;
      for (const a of game.towers) {
        if (!a.links || !a.links.length) continue;
        ctx.strokeStyle = rgba(towerColor(a.type), 0.55);
        ctx.beginPath();
        for (const t of a.links) {
          ctx.moveTo(this.X(a.x), this.Y(a.y));
          ctx.lineTo(this.X(t.x), this.Y(t.y));
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // The skin's base plate under every tower.
    plate(s) {
      const ctx = this.ctx;
      const shape = GD.skin.plate;
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
      else if (shape === 'hex' || shape === 'diamond') {
        const n = shape === 'hex' ? 6 : 4;
        const r = shape === 'hex' ? s * 0.58 : s * 0.66;
        for (let i = 0; i < n; i++) {
          const a = (i * Math.PI * 2) / n + (shape === 'hex' ? 0 : Math.PI / 2);
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
      } else ctx.roundRect(-s / 2, -s / 2, s, s, this.ts * 0.12);
    }

    drawTower(t, selected, surging) {
      const ctx = this.ctx;
      const ts = this.ts;
      const color = towerColor(t.type);
      const s = ts * 0.72;

      ctx.save();
      ctx.translate(this.X(t.x), this.Y(t.y));
      if (surging && GD.isAttacker(t.type)) {
        ctx.save();
        ctx.rotate(this.time * 3);
        ctx.setLineDash([ts * 0.1, ts * 0.08]);
        ctx.strokeStyle = rgba(color, 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      this.plate(s);
      ctx.fillStyle = C.plate;
      ctx.fill();
      ctx.strokeStyle = selected ? color : rgba(color, 0.45);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tier pips along the bottom edge.
      const pip = ts * 0.07;
      ctx.fillStyle = color;
      for (let i = 0; i <= t.tier; i++) ctx.fillRect(-ts * 0.18 + i * pip * 1.8, s / 2 - ts * 0.12, pip, pip * 0.6);

      // Boosted by an Amplifier: a small chevron in the top corner.
      if (t.boost > 0) {
        ctx.fillStyle = towerColor('amp');
        ctx.beginPath();
        ctx.moveTo(s * 0.5, -s * 0.5);
        ctx.lineTo(s * 0.5, -s * 0.18);
        ctx.lineTo(s * 0.18, -s * 0.5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      switch (t.type) {
        case 'pulse': this.drawPulse(t, ts); break;
        case 'nova': this.drawNova(t, ts); break;
        case 'cryo': this.drawCryo(t, ts); break;
        case 'rail': this.drawRail(t, ts); break;
        case 'tesla': this.drawTesla(t, ts); break;
        case 'laser': this.drawLaser(t, ts); break;
        case 'amp': this.drawAmp(t, ts); break;
        case 'harvester': this.drawHarvester(t, ts); break;
      }
      ctx.restore();
    }

    drawPulse(t, ts) {
      const ctx = this.ctx;
      if (t.tier >= 2) {
        ctx.save();
        ctx.rotate(this.time * 0.8);
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([ts * 0.08, ts * 0.08]);
        ctx.beginPath();
        ctx.arc(0, 0, ts * 0.27, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.rotate(t.angle);
      const len = ts * (0.36 - t.recoil * 0.08);
      const bw = ts * 0.085;
      if (t.tier === 0) ctx.fillRect(0, -bw / 2, len, bw);
      else {
        ctx.fillRect(0, -bw * 1.2, len, bw);
        ctx.fillRect(0, bw * 0.2, len, bw);
      }
      this.hub(ts * 0.16, '#17384d');
    }

    drawNova(t, ts) {
      const ctx = this.ctx;
      ctx.rotate(t.angle);
      const len = ts * (0.26 - t.recoil * 0.06);
      ctx.fillRect(0, -ts * 0.08, len, ts * 0.16);
      this.hub(ts * 0.18, '#2a1f4d');
      // Higher tiers add an orbit ring, then charge cells circling on it.
      if (t.tier >= 1) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, ts * 0.27, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (t.tier >= 2) {
        for (let i = 0; i < 3; i++) {
          const a = this.time * 2 + (i * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * ts * 0.27, Math.sin(a) * ts * 0.27, ts * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawCryo(t, ts) {
      const ctx = this.ctx;
      const arms = 3 + t.tier;
      const r = ts * (0.26 + t.recoil * 0.05);
      ctx.rotate(this.time * 0.6);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < arms; i++) {
        const a = (i * Math.PI) / arms;
        ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = t.recoil > 0 ? '#ffffff' : C.plate;
      ctx.fill();
      ctx.stroke();
    }

    drawRail(t, ts) {
      const ctx = this.ctx;
      ctx.rotate(t.angle);
      const len = ts * (0.42 + t.tier * 0.04 - t.recoil * 0.1);
      const gap = ts * 0.06;
      ctx.fillRect(-ts * 0.05, -gap - ts * 0.04, len, ts * 0.04);
      ctx.fillRect(-ts * 0.05, gap, len, ts * 0.04);
      if (t.recoil > 0.5) {
        ctx.globalAlpha = t.recoil;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -gap * 0.5, len, gap);
        ctx.globalAlpha = 1;
        ctx.fillStyle = towerColor('rail');
      }
      this.hub(ts * 0.13, '#3a2214');
    }

    // Tesla: a charged orb inside a coil, with prongs that multiply each tier.
    drawTesla(t, ts) {
      const ctx = this.ctx;
      const prongs = 4 + t.tier * 2;
      ctx.save();
      ctx.rotate(this.time * 0.4);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < prongs; i++) {
        const a = (i * Math.PI * 2) / prongs;
        ctx.moveTo(Math.cos(a) * ts * 0.17, Math.sin(a) * ts * 0.17);
        ctx.lineTo(Math.cos(a) * ts * 0.27, Math.sin(a) * ts * 0.27);
      }
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.17, 0, Math.PI * 2);
      ctx.stroke();
      const charge = 0.5 + 0.5 * Math.sin(this.time * 9);
      ctx.beginPath();
      ctx.arc(0, 0, ts * (0.08 + 0.02 * charge), 0, Math.PI * 2);
      ctx.fillStyle = t.recoil > 0.3 ? '#ffffff' : ctx.strokeStyle;
      ctx.fill();
      if (t.recoil > 0.3) {
        // Crackle around the coil right after firing.
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          ctx.moveTo(Math.cos(a) * ts * 0.1, Math.sin(a) * ts * 0.1);
          ctx.lineTo(Math.cos(a + 0.4) * ts * 0.22, Math.sin(a + 0.4) * ts * 0.22);
          ctx.lineTo(Math.cos(a + 0.1) * ts * 0.32, Math.sin(a + 0.1) * ts * 0.32);
        }
        ctx.stroke();
      }
    }

    // Laser: a slim emitter with a lens; the hub glows white as it heats up.
    drawLaser(t, ts) {
      const ctx = this.ctx;
      ctx.rotate(t.angle);
      const len = ts * (0.34 + t.tier * 0.03);
      ctx.fillRect(0, -ts * 0.03, len, ts * 0.06);
      ctx.beginPath();
      ctx.moveTo(len + ts * 0.07, 0);
      ctx.lineTo(len, -ts * 0.06);
      ctx.lineTo(len - ts * 0.07, 0);
      ctx.lineTo(len, ts * 0.06);
      ctx.closePath();
      ctx.fill();
      if (t.tier >= 1) {
        ctx.fillRect(-ts * 0.2, -ts * 0.2, ts * 0.12, ts * 0.05);
        ctx.fillRect(-ts * 0.2, ts * 0.15, ts * 0.12, ts * 0.05);
      }
      if (t.tier >= 2) {
        ctx.lineWidth = 1;
        ctx.strokeRect(ts * 0.05, -ts * 0.08, len * 0.7, ts * 0.16);
      }
      this.hub(ts * 0.15, '#0f3322');
      if (t.heat > 0) {
        ctx.globalAlpha = t.heat;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, ts * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Amplifier: a crystal sending out rings.
    drawAmp(t, ts) {
      const ctx = this.ctx;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 2; k++) {
        const p = (this.time * 0.7 + k / 2) % 1;
        ctx.globalAlpha = 1 - p;
        ctx.beginPath();
        ctx.arc(0, 0, ts * (0.12 + 0.18 * p), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < t.tier; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, ts * (0.27 + i * 0.04), -Math.PI * 0.25, Math.PI * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, ts * (0.27 + i * 0.04), Math.PI * 0.75, Math.PI * 1.25);
        ctx.stroke();
      }
      const r = ts * 0.13;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Harvester: a turning drill gear around a gold core.
    drawHarvester(t, ts) {
      const ctx = this.ctx;
      const teeth = 6 + t.tier * 2;
      ctx.save();
      ctx.rotate(this.time * 0.9);
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i * Math.PI) / teeth;
        const r = i % 2 ? ts * 0.2 : ts * 0.27;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.plate;
      ctx.fillRect(-ts * 0.025, -ts * 0.06, ts * 0.05, ts * 0.12);
    }

    hub(r, fill) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      const stroke = ctx.strokeStyle;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = stroke;
      ctx.fill();
    }

    drawCore(game, edt) {
      const ctx = this.ctx;
      const ts = this.ts;
      const ratio = game.hp / game.maxHp;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
      const color = ratio > 0.3 ? C.cyan : C.magenta;
      this.coreHit = Math.max(0, this.coreHit - edt * 3);

      ctx.save();
      ctx.translate(this.X(game.core.x), this.Y(game.core.y));
      if (this.coreHit > 0 && !this.reducedMotion) ctx.translate((Math.random() - 0.5) * ts * 0.15, 0);

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, ts * 0.9);
      glow.addColorStop(0, rgba(color, 0.28));
      glow.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(-ts, -ts, ts * 2, ts * 2);

      const hex = (r, rot) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = rot + (i * Math.PI) / 3;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
      };
      hex(ts * 0.44, this.time * 0.4);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      hex(ts * 0.3 * (0.35 + 0.65 * ratio), -this.time * 0.7);
      ctx.fillStyle = rgba(color, (0.25 + pulse * 0.25).toFixed(3));
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = this.coreHit > 0 ? C.magenta : '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    // Enemy silhouettes, drawn around (0, 0) at size s.
    enemyShape(type, s, rot) {
      const ctx = this.ctx;
      ctx.beginPath();
      switch (type) {
        case 'dart':
          // Arrowhead pointing along the direction of travel.
          ctx.moveTo(s * 1.3, 0);
          ctx.lineTo(-s, -s * 0.9);
          ctx.lineTo(-s * 0.5, 0);
          ctx.lineTo(-s, s * 0.9);
          ctx.closePath();
          break;
        case 'brick':
          ctx.rect(-s, -s, s * 2, s * 2);
          break;
        case 'swarm':
          ctx.arc(0, 0, s, 0, Math.PI * 2);
          break;
        case 'splitter':
          // Two wedges with a seam down the middle.
          ctx.moveTo(-s * 0.12, -s * 1.1);
          ctx.lineTo(-s * 1.1, 0);
          ctx.lineTo(-s * 0.12, s * 1.1);
          ctx.closePath();
          ctx.moveTo(s * 0.12, -s * 1.1);
          ctx.lineTo(s * 1.1, 0);
          ctx.lineTo(s * 0.12, s * 1.1);
          ctx.closePath();
          break;
        case 'warden':
          // Octagon with a notch cut on each side.
          for (let i = 0; i < 16; i++) {
            const a = rot * 0.3 + (i * Math.PI) / 8;
            const r = i % 2 ? s * 0.82 : s;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          break;
        case 'overlord':
          // Spiked crown that slowly turns.
          for (let i = 0; i < 20; i++) {
            const a = rot * 0.25 + (i * Math.PI) / 10;
            const r = i % 2 ? s * 0.68 : s * 1.08;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          break;
        case 'shard':
          ctx.moveTo(s, 0);
          ctx.lineTo(-s * 0.8, -s * 0.9);
          ctx.lineTo(-s * 0.8, s * 0.9);
          ctx.closePath();
          break;
        default: {
          const a = Math.PI / 4 + Math.sin(rot) * 0.3;
          for (let i = 0; i < 4; i++) {
            const ang = a + (i * Math.PI) / 2;
            if (i === 0) ctx.moveTo(Math.cos(ang) * s * 1.41, Math.sin(ang) * s * 1.41);
            else ctx.lineTo(Math.cos(ang) * s * 1.41, Math.sin(ang) * s * 1.41);
          }
          ctx.closePath();
        }
      }
    }

    // frozen: Stasis Field is up, so non-boss enemies get an ice block around them.
    drawEnemy(e, edt, frozen) {
      const ctx = this.ctx;
      const ts = this.ts;
      const x = this.X(e.x);
      const y = this.Y(e.y);
      const s = e.size * ts * 0.75;
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - edt * 8);

      // Glitch: every so often an enemy jumps sideways for a frame or two.
      const g = Math.sin(this.time * 7 + e.seed) > 0.96 && !this.reducedMotion && !frozen ? (Math.random() - 0.5) * ts * 0.25 : 0;
      const rot = this.time * 1.5 + e.seed;
      const facing = e.type === 'dart' || e.type === 'shard';
      const turn = facing ? e.angle : e.type === 'splitter' ? Math.sin(rot) * 0.4 : 0;
      const layer = (dx, size) => {
        ctx.save();
        ctx.translate(x + dx + g, y);
        ctx.rotate(turn);
        this.enemyShape(e.type, size, rot);
        ctx.restore();
      };

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      layer(-ts * 0.05, s);
      ctx.fillStyle = C.enemyA;
      ctx.fill();
      ctx.globalAlpha = 1;
      layer(ts * 0.03, s);
      ctx.fillStyle = C.enemyB;
      ctx.fill();
      ctx.restore();

      if (e.type !== 'swarm') {
        layer(0, s * (e.type === 'brick' ? 0.6 : 0.5));
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : this.theme.bg;
        ctx.fill();
      }
      if (e.armor) {
        layer(0, s * 0.6);
        ctx.strokeStyle = C.enemyB;
        ctx.lineWidth = Math.max(1, ts * 0.04);
        ctx.stroke();
      }

      if (frozen && !e.boss) {
        ctx.save();
        ctx.fillStyle = rgba(C.ice, 0.22);
        ctx.strokeStyle = rgba(C.ice, 0.9);
        ctx.lineWidth = 1.5;
        const b = s * 1.5 + ts * 0.04;
        ctx.beginPath();
        ctx.rect(x - b, y - b, b * 2, b * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (e.slow > 0) {
        ctx.save();
        ctx.strokeStyle = rgba(C.ice, 0.85);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([ts * 0.06, ts * 0.05]);
        ctx.beginPath();
        ctx.arc(x, y, s * 1.6 + ts * 0.04, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (e.boss) {
        ctx.save();
        ctx.strokeStyle = rgba(C.enemyB, 0.55);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([ts * 0.12, ts * 0.08]);
        ctx.lineDashOffset = -this.time * ts * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, s * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (e.hp < e.maxHp && e.type !== 'swarm' && !e.boss) {
        const bw = ts * (e.type === 'brick' ? 0.75 : 0.6);
        const bh = Math.max(2, ts * 0.06);
        const bx = x - bw / 2;
        const by = y - s * 1.4 - ts * 0.16;
        ctx.fillStyle = 'rgba(236, 233, 255, 0.18)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = C.text;
        ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), bh);
      }
    }

    // Laser beams are held, not fired, so they're drawn from tower state every frame.
    drawLasers(game, edt) {
      const ctx = this.ctx;
      const ts = this.ts;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const t of game.towers) {
        const e = t.target;
        if (GD.towers[t.type].kind !== 'laser' || !e || e.dead) continue;
        const color = towerColor(t.type);
        const heat = t.heat || 0;
        const mx = this.X(t.x + Math.cos(t.angle) * 0.42);
        const my = this.Y(t.y + Math.sin(t.angle) * 0.42);
        const flicker = this.reducedMotion ? 1 : 0.85 + Math.random() * 0.15;
        ctx.strokeStyle = rgba(color, (0.5 * flicker).toFixed(3));
        ctx.lineWidth = ts * (0.05 + 0.12 * heat);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(this.X(e.x), this.Y(e.y));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, ts * (0.015 + 0.03 * heat));
        ctx.stroke();
        if (Math.random() < edt * 25 * (0.3 + heat)) this.spark(e.x, e.y, 1, color, 2, 0.3);
      }
      ctx.restore();
    }

    drawBullets(game) {
      const ctx = this.ctx;
      const ts = this.ts;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const b of game.bullets) {
        const color = towerColor(b.tower);
        const bx = this.X(b.x);
        const by = this.Y(b.y);
        if (b.kind === 'splash') {
          const glow = ctx.createRadialGradient(bx, by, 0, bx, by, ts * 0.22);
          glow.addColorStop(0, rgba(color, 0.9));
          glow.addColorStop(1, rgba(color, 0));
          ctx.fillStyle = glow;
          ctx.fillRect(bx - ts * 0.22, by - ts * 0.22, ts * 0.44, ts * 0.44);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx, by, Math.max(2, ts * 0.06), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const tail = 0.28;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, ts * 0.06);
        ctx.beginPath();
        ctx.moveTo(this.X(b.x - (dx / d) * tail), this.Y(b.y - (dy / d) * tail));
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.fillStyle = '#e6fdff';
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(1.5, ts * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawEffects(edt) {
      const ctx = this.ctx;
      const ts = this.ts;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const b of this.beams) {
        b.life -= edt;
        const a = Math.max(0, b.life / b.max);
        ctx.globalAlpha = a;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = ts * b.width * a + 1;
        ctx.beginPath();
        ctx.moveTo(this.X(b.x1), this.Y(b.y1));
        ctx.lineTo(this.X(b.x2), this.Y(b.y2));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, ts * b.width * 0.3 * a);
        ctx.stroke();
      }
      this.beams = this.beams.filter((b) => b.life > 0);

      for (const b of this.bolts) {
        b.life -= edt;
        const a = Math.max(0, b.life / b.max);
        ctx.globalAlpha = a;
        ctx.beginPath();
        b.pts.forEach((p, i) => (i ? ctx.lineTo(this.X(p.x), this.Y(p.y)) : ctx.moveTo(this.X(p.x), this.Y(p.y))));
        ctx.strokeStyle = b.color;
        ctx.lineWidth = ts * 0.09;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, ts * 0.025);
        ctx.stroke();
      }
      this.bolts = this.bolts.filter((b) => b.life > 0);

      for (const p of this.particles) {
        p.life -= edt;
        p.x += p.vx * edt;
        p.y += p.vy * edt;
        p.vx *= 1 - edt * 3;
        p.vy *= 1 - edt * 3;
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        const sz = p.size * ts;
        ctx.fillRect(this.X(p.x) - sz / 2, this.Y(p.y) - sz / 2, sz, sz);
      }
      this.particles = this.particles.filter((p) => p.life > 0);

      for (const r of this.rings) {
        r.life -= edt;
        const t = 1 - Math.max(0, r.life / r.max);
        ctx.globalAlpha = r.dashed ? (1 - t) * 0.7 : 1 - t;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width || 2;
        ctx.setLineDash(r.dashed ? [6, 6] : []);
        ctx.beginPath();
        ctx.arc(this.X(r.x), this.Y(r.y), (r.r0 + (r.r1 - r.r0) * t) * ts, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      this.rings = this.rings.filter((r) => r.life > 0);
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const t of this.texts) {
        t.life -= edt;
        const k = 1 - Math.max(0, t.life / t.max);
        ctx.globalAlpha = Math.min(1, (t.life / t.max) * 2.5);
        ctx.font = '700 ' + Math.round(ts * (t.big ? 0.36 : 0.3)) + 'px ' + FONT;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, this.X(t.x), this.Y(t.y - k * 0.6));
      }
      this.texts = this.texts.filter((t) => t.life > 0);
      ctx.restore();
    }

    // Icy tint and frame over the field while Stasis Field holds.
    drawStasis(game) {
      const ts = this.ts;
      this.ctx.fillStyle = rgba(C.ice, 0.06);
      this.ctx.fillRect(this.ox, this.oy, ts * game.cols, ts * game.rows);
      this.drawFrame(game, C.ice);
    }

    // Dashed border around the field: Stasis Field, or an ability waiting to be aimed.
    drawFrame(game, color) {
      const ctx = this.ctx;
      const ts = this.ts;
      ctx.save();
      ctx.strokeStyle = rgba(color, 0.6);
      ctx.lineWidth = 2;
      ctx.setLineDash([ts * 0.3, ts * 0.15]);
      ctx.lineDashOffset = -this.time * ts;
      ctx.strokeRect(this.ox + 1, this.oy + 1, ts * game.cols - 2, ts * game.rows - 2);
      ctx.restore();
    }

    drawBanner(game, edt) {
      const b = this.banner;
      if (!b) return;
      b.life -= edt;
      if (b.life <= 0) {
        this.banner = null;
        return;
      }
      const ctx = this.ctx;
      const ts = this.ts;
      const age = b.max - b.life;
      const x = this.X(game.cols / 2);
      const y = this.Y(game.rows * 0.42);
      ctx.save();
      ctx.globalAlpha = Math.min(1, age * 5, b.life * 3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(ts * (b.small ? 0.7 : 0.95)) + 'px ' + FONT;
      const j = age < 0.35 && !this.reducedMotion ? ts * 0.08 : ts * 0.025;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = C.cyan;
      ctx.fillText(b.text, x - j, y);
      ctx.fillStyle = C.magenta;
      ctx.fillText(b.text, x + j, y);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = C.text;
      ctx.fillText(b.text, x, y);
      if (b.sub) {
        ctx.font = '600 ' + Math.round(ts * 0.34) + 'px ' + FONT;
        ctx.fillStyle = C.magenta;
        ctx.fillText(b.sub, x, y + ts * 0.8);
      }
      ctx.restore();
    }
  }

  GD.Renderer = Renderer;
})(window.GD = window.GD || {});
