// Canvas renderer. Reads game state, turns game events into effects, never changes the simulation.
(function (GD) {
  const C = {
    bg: '#0b0a1a',
    tile: 'rgba(130, 118, 230, 0.07)',
    tileEdge: 'rgba(150, 140, 255, 0.10)',
    lane: '#16132d',
    laneEdge: 'rgba(255, 61, 139, 0.32)',
    cyan: '#3ef0ff',
    magenta: '#ff3d8b',
    amber: '#ffc547',
    ice: '#8fd3ff',
    text: '#ece9ff',
    plate: '#121433',
  };
  GD.colors = C;
  const FONT = '"Chakra Petch", "Avenir Next Condensed", "Arial Narrow", system-ui, sans-serif';

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')';
  }
  GD.rgba = rgba;

  const towerColor = (type) => (GD.towers[type] ? GD.towers[type].color : C.cyan);

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
      this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.reset();
    }

    reset() {
      this.particles = [];
      this.rings = [];
      this.beams = [];
      this.texts = [];
      this.banner = null;
      this.shake = 0;
      this.flash = 0;
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

    pathLine(ctx, game) {
      const pts = game.pathPts;
      ctx.beginPath();
      ctx.moveTo(this.X(pts[0].x), this.Y(Math.max(0, pts[0].y)));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(this.X(pts[i].x), this.Y(pts[i].y));
    }

    buildBackground(game) {
      const b = this.bg;
      b.width = this.canvas.width;
      b.height = this.canvas.height;
      const g = b.getContext('2d');
      const ts = this.ts;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.fillStyle = C.bg;
      g.fillRect(0, 0, this.w, this.h);

      const fw = ts * game.cols;
      const fh = ts * game.rows;
      const glow = g.createRadialGradient(this.ox + fw / 2, this.oy + fh * 0.45, 0, this.ox + fw / 2, this.oy + fh * 0.45, fh * 0.7);
      glow.addColorStop(0, 'rgba(84, 60, 190, 0.20)');
      glow.addColorStop(1, 'rgba(84, 60, 190, 0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, this.w, this.h);

      const pad = Math.max(2, ts * 0.07);
      for (let r = 0; r < game.rows; r++) {
        for (let c = 0; c < game.cols; c++) {
          if (game.grid[r][c] !== GD.TILE.EMPTY) continue;
          g.beginPath();
          g.roundRect(this.X(c) + pad, this.Y(r) + pad, ts - pad * 2, ts - pad * 2, ts * 0.1);
          g.fillStyle = C.tile;
          g.fill();
          g.strokeStyle = C.tileEdge;
          g.lineWidth = 1;
          g.stroke();
        }
      }

      g.lineJoin = 'miter';
      g.lineCap = 'butt';
      this.pathLine(g, game);
      g.strokeStyle = C.laneEdge;
      g.lineWidth = ts * 0.8;
      g.stroke();
      g.strokeStyle = C.lane;
      g.lineWidth = ts * 0.8 - 3;
      g.stroke();

      // Entry gate where enemies come in at the top edge.
      const ex = this.X(game.pathPts[0].x);
      const ey = this.Y(0);
      const half = ts * 0.46;
      g.strokeStyle = C.magenta;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(ex - half, ey + ts * 0.25);
      g.lineTo(ex - half, ey + 1);
      g.lineTo(ex - half * 0.5, ey + 1);
      g.moveTo(ex + half * 0.5, ey + 1);
      g.lineTo(ex + half, ey + 1);
      g.lineTo(ex + half, ey + ts * 0.25);
      g.stroke();
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
            this.beams.push({ x1: ev.x, y1: ev.y, x2: ev.x2, y2: ev.y2, life: 0.22, max: 0.22, color });
            this.spark(ev.x2, ev.y2, 8, color, 3.5, 0.4);
            break;
          case 'explode':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.15, r1: ev.radius, life: 0.3, max: 0.3, color, width: 3 });
            this.spark(ev.x, ev.y, 14, color, 3, 0.45);
            break;
          case 'pulse':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.3, r1: ev.range, life: 0.45, max: 0.45, color, width: 2 });
            break;
          case 'kill':
            this.spark(ev.x, ev.y, ev.enemy === 'swarm' ? 5 : 12, C.magenta, 3.5, 0.6);
            this.spark(ev.x, ev.y, 4, C.cyan, 2.5, 0.5);
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.1, r1: ev.enemy === 'brick' ? 0.9 : 0.6, life: 0.35, max: 0.35, color: C.magenta });
            this.texts.push({ x: ev.x, y: ev.y - 0.2, text: '+' + ev.reward, life: 0.9, max: 0.9, color: C.amber });
            break;
          case 'leak':
            this.shake = 1;
            this.flash = 1;
            this.coreHit = 1;
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.3, r1: 1.4, life: 0.5, max: 0.5, color: C.magenta });
            break;
          case 'build':
          case 'upgrade':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: 0.9, life: 0.4, max: 0.4, color });
            // Show the tower's reach for a moment so the player sees what it covers.
            this.rings.push({ x: ev.x, y: ev.y, r0: ev.range, r1: ev.range, life: 1.1, max: 1.1, color, dashed: true });
            this.spark(ev.x, ev.y, 8, color, 2, 0.4);
            break;
          case 'summon':
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: 0.8, life: 0.4, max: 0.4, color: C.magenta });
            this.spark(ev.x, ev.y, 6, C.magenta, 2, 0.4);
            break;
          case 'sell':
            this.spark(ev.x, ev.y, 10, C.amber, 2, 0.5);
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
            this.texts.push({ x: game.pathPts[0].x, y: 0.8, text: 'EARLY +' + ev.amount, life: 1.2, max: 1.2, color: C.amber, big: true });
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
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.bg, sx * dpr, sy * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);

      this.drawStream(game);
      this.drawSelection(game, sel);
      for (const t of game.towers) this.drawTower(t, sel && sel.tower === t);
      this.drawCore(game, edt);
      for (const e of game.enemies) this.drawEnemy(e, edt);
      this.drawBullets(game);
      this.drawEffects(edt);
      this.drawBanner(game, edt);

      if (this.flash > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(255, 61, 139, ' + (this.flash * 0.22).toFixed(3) + ')';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.flash = Math.max(0, this.flash - edt * 4);
      }
    }

    drawStream(game) {
      const ctx = this.ctx;
      const ts = this.ts;
      ctx.save();
      ctx.setLineDash([ts * 0.12, ts * 0.55]);
      ctx.lineDashOffset = -this.time * ts * 1.4;
      ctx.strokeStyle = 'rgba(255, 61, 139, 0.45)';
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
      if (t) {
        ctx.beginPath();
        ctx.arc(this.X(c + 0.5), this.Y(r + 0.5), game.towerStats(t).range * ts, 0, Math.PI * 2);
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

    drawTower(t, selected) {
      const ctx = this.ctx;
      const ts = this.ts;
      const color = towerColor(t.type);
      const s = ts * 0.72;

      ctx.save();
      ctx.translate(this.X(t.x), this.Y(t.y));
      ctx.beginPath();
      ctx.roundRect(-s / 2, -s / 2, s, s, ts * 0.12);
      ctx.fillStyle = C.plate;
      ctx.fill();
      ctx.strokeStyle = selected ? color : rgba(color, 0.45);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tier pips along the bottom edge.
      const pip = ts * 0.07;
      ctx.fillStyle = color;
      for (let i = 0; i <= t.tier; i++) ctx.fillRect(-s / 2 + ts * 0.08 + i * pip * 1.8, s / 2 - ts * 0.12, pip, pip * 0.6);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (t.type === 'pulse') this.drawPulse(t, ts);
      else if (t.type === 'nova') this.drawNova(t, ts);
      else if (t.type === 'cryo') this.drawCryo(t, ts);
      else if (t.type === 'rail') this.drawRail(t, ts);
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

    drawEnemy(e, edt) {
      const ctx = this.ctx;
      const ts = this.ts;
      const x = this.X(e.x);
      const y = this.Y(e.y);
      const s = e.size * ts * 0.75;
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - edt * 8);

      // Glitch: every so often an enemy jumps sideways for a frame or two.
      const g = Math.sin(this.time * 7 + e.seed) > 0.96 && !this.reducedMotion ? (Math.random() - 0.5) * ts * 0.25 : 0;
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
      ctx.fillStyle = C.cyan;
      ctx.fill();
      ctx.globalAlpha = 1;
      layer(ts * 0.03, s);
      ctx.fillStyle = C.magenta;
      ctx.fill();
      ctx.restore();

      if (e.type !== 'swarm') {
        layer(0, s * (e.type === 'brick' ? 0.6 : 0.5));
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : C.bg;
        ctx.fill();
      }
      if (e.armor) {
        layer(0, s * 0.6);
        ctx.strokeStyle = C.magenta;
        ctx.lineWidth = Math.max(1, ts * 0.04);
        ctx.stroke();
      }

      if (e.slow > 0) {
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
        ctx.strokeStyle = rgba(C.magenta, 0.55);
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
      for (const b of this.beams) {
        b.life -= edt;
        const a = Math.max(0, b.life / b.max);
        ctx.globalAlpha = a;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = ts * 0.14 * a + 1;
        ctx.beginPath();
        ctx.moveTo(this.X(b.x1), this.Y(b.y1));
        ctx.lineTo(this.X(b.x2), this.Y(b.y2));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, ts * 0.04 * a);
        ctx.stroke();
      }
      this.beams = this.beams.filter((b) => b.life > 0);

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
      ctx.font = '700 ' + Math.round(ts * 0.95) + 'px ' + FONT;
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
