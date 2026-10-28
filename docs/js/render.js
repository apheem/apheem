// Canvas renderer. Reads game state, turns game events into effects, never changes the simulation.
(function (GD) {
  const C = {
    bg: '#0b0a1a',
    tile: 'rgba(130, 118, 230, 0.07)',
    tileEdge: 'rgba(150, 140, 255, 0.10)',
    lane: '#16132d',
    laneEdge: 'rgba(255, 61, 139, 0.32)',
    cyan: '#3ef0ff',
    cyanDim: '#17384d',
    magenta: '#ff3d8b',
    amber: '#ffc547',
    text: '#ece9ff',
    plate: '#121433',
  };
  GD.colors = C;
  const FONT = '"Chakra Petch", "Avenir Next Condensed", "Arial Narrow", system-ui, sans-serif';

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
      this.texts = [];
      this.banner = null;
      this.shake = 0;
      this.flash = 0;
      this.coreHit = 0;
      this.time = 0;
    }

    resize(w, h, game) {
      this.dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.w = w;
      this.h = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ts = Math.max(8, Math.floor(Math.min(w / game.cols, h / game.rows)));
      this.ox = Math.floor((w - this.ts * game.cols) / 2);
      this.oy = Math.floor((h - this.ts * game.rows) / 2);
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
        switch (ev.type) {
          case 'shoot':
            this.spark(ev.x, ev.y, 2, C.cyan, 1.5, 0.15);
            break;
          case 'hit':
            this.spark(ev.x, ev.y, 3, C.cyan, 2.5, 0.25);
            break;
          case 'kill':
            this.spark(ev.x, ev.y, 12, C.magenta, 3.5, 0.6);
            this.spark(ev.x, ev.y, 5, C.cyan, 2.5, 0.5);
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.1, r1: 0.6, life: 0.35, max: 0.35, color: C.magenta });
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
            this.rings.push({ x: ev.x, y: ev.y, r0: 0.2, r1: 0.9, life: 0.4, max: 0.4, color: C.cyan });
            this.spark(ev.x, ev.y, 8, C.cyan, 2, 0.4);
            break;
          case 'sell':
            this.spark(ev.x, ev.y, 10, C.amber, 2, 0.5);
            break;
          case 'waveStart':
            this.banner = { text: 'WAVE ' + ev.wave, sub: ev.wave === game.totalWaves ? 'FINAL WAVE' : '', life: 1.6, max: 1.6 };
            break;
          case 'waveClear':
            this.texts.push({ x: game.core.x, y: game.core.y - 0.8, text: 'WAVE ' + ev.wave + ' CLEAR +' + ev.bonus, life: 1.6, max: 1.6, color: C.amber, big: true });
            break;
          case 'earlyBonus':
            this.texts.push({ x: game.pathPts[0].x, y: 0.8, text: 'EARLY +' + ev.amount, life: 1.2, max: 1.2, color: C.amber, big: true });
            break;
        }
      }
      game.events.length = 0;
      if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
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
      let c, r, range;
      if (sel.tower) {
        c = sel.tower.c;
        r = sel.tower.r;
        range = game.towerStats(sel.tower).range;
      } else {
        c = sel.c;
        r = sel.r;
        range = GD.towers.pulse.tiers[0].range;
      }
      const cx = this.X(c + 0.5);
      const cy = this.Y(r + 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, range * ts, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(62, 240, 255, 0.06)';
      ctx.fill();
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -this.time * 12;
      ctx.strokeStyle = 'rgba(62, 240, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.X(c) + 1, this.Y(r) + 1, ts - 2, ts - 2);
      ctx.restore();
    }

    drawTower(t, selected) {
      const ctx = this.ctx;
      const ts = this.ts;
      const x = this.X(t.x);
      const y = this.Y(t.y);
      const s = ts * 0.72;

      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.roundRect(-s / 2, -s / 2, s, s, ts * 0.12);
      ctx.fillStyle = C.plate;
      ctx.fill();
      ctx.strokeStyle = selected ? C.cyan : 'rgba(62, 240, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tier pips along the bottom edge.
      const pip = ts * 0.07;
      for (let i = 0; i <= t.tier; i++) {
        ctx.fillStyle = C.cyan;
        ctx.fillRect(-s / 2 + ts * 0.08 + i * pip * 1.8, s / 2 - ts * 0.12, pip, pip * 0.6);
      }

      if (t.tier >= 2) {
        ctx.save();
        ctx.rotate(this.time * 0.8);
        ctx.strokeStyle = 'rgba(62, 240, 255, 0.5)';
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
      ctx.fillStyle = C.cyan;
      if (t.tier === 0) {
        ctx.fillRect(0, -bw / 2, len, bw);
      } else {
        ctx.fillRect(0, -bw * 1.2, len, bw);
        ctx.fillRect(0, bw * 0.2, len, bw);
      }
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = C.cyanDim;
      ctx.fill();
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = C.cyan;
      ctx.fill();
      ctx.restore();
    }

    drawCore(game, edt) {
      const ctx = this.ctx;
      const ts = this.ts;
      const x = this.X(game.core.x);
      const y = this.Y(game.core.y);
      const ratio = game.hp / game.maxHp;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
      const color = ratio > 0.3 ? C.cyan : C.magenta;
      this.coreHit = Math.max(0, this.coreHit - edt * 3);

      ctx.save();
      ctx.translate(x, y);
      if (this.coreHit > 0 && !this.reducedMotion) ctx.translate((Math.random() - 0.5) * ts * 0.15, 0);

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, ts * 0.9);
      glow.addColorStop(0, ratio > 0.3 ? 'rgba(62, 240, 255, 0.28)' : 'rgba(255, 61, 139, 0.30)');
      glow.addColorStop(1, 'rgba(62, 240, 255, 0)');
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
      ctx.fillStyle = ratio > 0.3 ? 'rgba(62, 240, 255, ' + (0.25 + pulse * 0.25).toFixed(3) + ')' : 'rgba(255, 61, 139, ' + (0.3 + pulse * 0.3).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = this.coreHit > 0 ? C.magenta : '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    drawEnemy(e, edt) {
      const ctx = this.ctx;
      const ts = this.ts;
      const x = this.X(e.x);
      const y = this.Y(e.y);
      const s = e.size * ts;
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - edt * 8);

      // Glitch: every so often a drone jumps sideways for a frame or two.
      const g = Math.sin(this.time * 7 + e.seed) > 0.96 && !this.reducedMotion ? (Math.random() - 0.5) * ts * 0.25 : 0;
      const rot = this.time * 1.5 + e.seed;
      const diamond = (dx, size) => {
        ctx.save();
        ctx.translate(x + dx + g, y);
        ctx.rotate(Math.PI / 4 + Math.sin(rot) * 0.3);
        ctx.beginPath();
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.restore();
      };

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      diamond(-ts * 0.05, s * 0.75);
      ctx.fillStyle = C.cyan;
      ctx.fill();
      ctx.globalAlpha = 1;
      diamond(ts * 0.03, s * 0.75);
      ctx.fillStyle = C.magenta;
      ctx.fill();
      ctx.restore();

      diamond(0, s * 0.38);
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : C.bg;
      ctx.fill();

      if (e.hp < e.maxHp) {
        const bw = ts * 0.6;
        const bh = Math.max(2, ts * 0.06);
        const bx = x - bw / 2;
        const by = y - s - ts * 0.18;
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
      ctx.strokeStyle = C.cyan;
      ctx.fillStyle = '#e6fdff';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, ts * 0.06);
      for (const b of game.bullets) {
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const tail = 0.28;
        ctx.beginPath();
        ctx.moveTo(this.X(b.x - (dx / d) * tail), this.Y(b.y - (dy / d) * tail));
        ctx.lineTo(this.X(b.x), this.Y(b.y));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.X(b.x), this.Y(b.y), Math.max(1.5, ts * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawEffects(edt) {
      const ctx = this.ctx;
      const ts = this.ts;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        p.life -= edt;
        p.x += p.vx * edt;
        p.y += p.vy * edt;
        p.vx *= 1 - edt * 3;
        p.vy *= 1 - edt * 3;
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        const sz = p.size * ts;
        ctx.fillRect(this.X(p.x) - sz / 2, this.Y(p.y) - sz / 2, sz, sz);
      }
      this.particles = this.particles.filter((p) => p.life > 0);

      for (const r of this.rings) {
        r.life -= edt;
        const t = 1 - Math.max(0, r.life / r.max);
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.X(r.x), this.Y(r.y), (r.r0 + (r.r1 - r.r0) * t) * ts, 0, Math.PI * 2);
        ctx.stroke();
      }
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
