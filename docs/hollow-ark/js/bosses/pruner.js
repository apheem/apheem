'use strict';
// The Pruner: the Warden that keeps the Gardens and holds the cradles' seals. Tall and spindly on its stilts,
// with two long shear-arms built for cutting crops. A short, sharp fight, about two minutes:
//   Snip     a cut at one of two heights, and the arm about to cut glows first. The low arm cuts at the feet
//            (jump it). The high arm cuts at head height (stay on the floor). In the second half it snips
//            low, then high.
//   Hedge    it drives its shears into the floor, and thorn hedges grow up around the hero for four seconds.
//   Topiary  (second half) it climbs to the ceiling rail, runs along it over the hero, and drops shear-first.
//            Its shadow on the floor shows where.
// It vents shards every 15% of its health.
(function (HA) {
  const MAX_HP = 220;
  const W = 18;
  const H = 40;
  const STEP = Math.round(MAX_HP * 0.15);
  const REACH = 60;
  const plate = HA.boss.plate;

  function make(world, cx, feetY) {
    return {
      boss: true,
      type: 'pruner',
      x: cx - W / 2,
      y: feetY - H,
      w: W,
      h: H,
      vx: 0,
      vy: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      facing: -1,
      t: 0,
      flash: 0,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      state: 'think',
      timer: 60,
      phase: 1,
      nextShards: MAX_HP - STEP,
      shownHp: MAX_HP,
      floorY: feetY,
      railY: 6 * 8, // the top of the rail it hangs from
      x0: 83 * 8, // the hall it fights in, wall to wall
      x1: 115 * 8,
      hedges: [],
      cuts: 0,
    };
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };
  const wind = (b, base) => Math.round(base * (b.phase === 2 ? 0.8 : 1));

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    updateHedges(world, b);
    if (!b.fighting || b.broken || world.scene) {
      if (b.y + b.h < b.floorY) b.y = Math.min(b.floorY - b.h, b.y + 4);
      return;
    }
    const p = world.player;
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const dist = Math.abs(px - bx);
    if (b.timer > 0) b.timer--;

    switch (b.state) {
      case 'think':
        b.vx = 0;
        if (!p.dead) b.facing = Math.sign(px - bx) || b.facing;
        // Stalk toward the hero on its stilts until it's in reach.
        if (dist > REACH - 10) b.x += b.facing * (b.phase === 2 ? 0.7 : 0.5);
        if (b.timer > 0) break;
        {
          const roll = Math.random();
          if (b.phase === 2 && roll < 0.3 && b.last !== 'topiary') pick(b, 'topiary');
          else if (dist < REACH + 6 && roll < 0.75) pick(b, 'snip');
          else if (!b.hedges.length && b.last !== 'hedge') pick(b, 'hedge');
          else pick(b, dist < REACH + 6 ? 'snip' : 'think');
        }
        break;
      case 'snipTele':
        if (b.timer === 0) {
          set(b, 'snip', 10);
          b.snipHit = false;
          HA.audio.play('snip');
          world.shake(1.5);
        }
        break;
      case 'snip': {
        const y = b.snipLow ? b.floorY - 8 : b.floorY - 27;
        const blade = { x: b.facing > 0 ? b.x + b.w : b.x - REACH, y, w: REACH, h: 8 };
        if (!b.snipHit && HA.overlap(blade, p)) {
          b.snipHit = true;
          world.hurtPlayer(3, bx);
        }
        if (b.timer === 0) {
          // In the second half a low cut is followed by a high one.
          if (b.phase === 2 && b.snipLow && !b.second) {
            b.second = true;
            b.snipLow = false;
            set(b, 'snipTele', 26);
            HA.audio.play('telegraph');
          } else {
            b.second = false;
            set(b, 'think', wind(b, 46));
          }
        }
        break;
      }
      case 'hedgeTele':
        if (b.timer === 0) {
          plantHedges(world, b, px);
          set(b, 'think', wind(b, 50));
        }
        break;
      case 'climb':
        b.y = HA.approach(b.y, b.railY + 2, 3);
        if (b.y <= b.railY + 2) set(b, 'run', 90);
        break;
      case 'run':
        b.facing = Math.sign(px - bx) || b.facing;
        b.x += b.facing * 1.7;
        if (Math.abs(px - bx) < 4 || b.timer === 0) {
          set(b, 'aim', wind(b, 40));
          HA.audio.play('telegraph');
        }
        break;
      case 'aim':
        if (b.timer === 0) {
          set(b, 'drop', 60);
          b.vy = 1;
        }
        break;
      case 'drop':
        b.vy = Math.min(b.vy + 0.8, 8);
        b.y += b.vy;
        if (b.y + b.h >= b.floorY) {
          b.y = b.floorY - b.h;
          set(b, 'stuck', 54);
          world.shake(5);
          HA.audio.play('slam');
          world.burst(bx, b.floorY - 2, ['#9fb6c8', '#6c7894', '#3f7a4a', '#b04ad0'], 16, 2);
        }
        break;
      case 'stuck':
        if (b.timer === 0) set(b, 'think', 20);
        break;
      case 'stagger':
        if (b.y + b.h < b.floorY) b.y = Math.min(b.floorY - b.h, b.y + 4);
        if (b.timer === 0) set(b, 'think', 20);
        break;
    }
    b.x = HA.clamp(b.x, b.x0, b.x1 - b.w);

    // Walking into it hurts, and so does being under it when it drops.
    const body = { x: b.x + 4, y: b.y + 6, w: b.w - 8, h: b.h - 6 };
    if (!p.dead && HA.overlap(body, p)) world.hurtPlayer(b.state === 'drop' ? 4 : 2, bx);
  }

  function pick(b, move) {
    b.last = move;
    if (move === 'snip') {
      b.snipLow = b.phase === 2 ? true : b.cuts++ % 2 === 0;
      set(b, 'snipTele', wind(b, 34));
      HA.audio.play('telegraph');
    } else if (move === 'hedge') {
      set(b, 'hedgeTele', wind(b, 28));
      HA.audio.play('telegraph');
    } else if (move === 'topiary') {
      set(b, 'climb', 40);
      HA.audio.play('jump');
    } else set(b, 'think', 30);
  }

  // Thorn hedges sprout around the hero: harmless while they grow, then thorny for four seconds.
  function plantHedges(world, b, px) {
    const n = b.phase === 2 ? 3 : 2;
    const xs = n === 3 ? [-44, 0, 44] : [-30, 30];
    for (const dx of xs) {
      const x = HA.clamp(px + dx + HA.rand(-6, 6), b.x0 + 4, b.x1 - 16);
      b.hedges.push({ x: x - 6, y: b.floorY - 14, w: 12, h: 14, t: 0, life: 24 + 240 });
    }
    world.shake(2);
    HA.audio.play('hedge');
  }

  function updateHedges(world, b) {
    for (const hd of b.hedges) {
      hd.t++;
      hd.life--;
      if (hd.t > 24 && hd.life > 10 && b.fighting && HA.overlap({ x: hd.x + 2, y: hd.y + 3, w: hd.w - 4, h: hd.h - 3 }, world.player)) world.hurtPlayer(2, hd.x + hd.w / 2);
    }
    b.hedges = b.hedges.filter((hd) => hd.life > 0);
  }

  function hurt(world, b, dmg, dir) {
    if (!b.fighting || b.broken || b.hp <= 0) return;
    if (b.state === 'stuck') dmg = Math.ceil(dmg * 1.3); // stuck in the floor, it can't turn its plates
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 4;
    world.burst(b.x + b.w / 2, b.y + b.h / 2, ['#ffb84d', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    HA.boss.vent(world, b, STEP);
    if (b.phase === 1 && b.hp <= MAX_HP / 2) {
      b.phase = 2;
      set(b, 'stagger', 40);
      world.shake(4);
      world.flash('#7ad1a0', 5);
      HA.audio.play('roar');
      HA.music.setLayers(2);
    }
    if (b.hp <= 0) {
      b.fighting = false;
      b.hedges = [];
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // ---- Drawing: plates and long thin lines, so it can reach, hang and fold ----
  function draw(g, world, b, cam) {
    drawHedges(g, world, b, cam);
    if (b.gone) return;
    if (b.state === 'aim' || b.state === 'run' || b.state === 'drop') {
      // its shadow on the floor, where it will land
      const sx = Math.round(b.x + b.w / 2 - cam.x);
      const sy = Math.round(b.floorY - cam.y);
      const big = b.state === 'aim' ? 9 + Math.floor((40 - b.timer) / 8) : 8;
      g.fillStyle = 'rgba(5,6,13,0.6)';
      g.fillRect(sx - big, sy - 2, big * 2, 2);
      if (b.state === 'aim' && Math.floor(b.timer / 4) % 2 === 0) {
        g.fillStyle = '#fff0a8';
        g.fillRect(sx - 1, sy - 3, 2, 1);
      }
    }
    const white = b.flash > 0;
    const M1 = white ? '#ffffff' : '#3a4258';
    const M2 = white ? '#ffffff' : '#6c7894';
    const M3 = white ? '#ffffff' : '#a9b6cc';
    const glow = white ? '#ffffff' : '#fff0a8';
    const x0 = Math.round(b.x - cam.x);
    const y0 = Math.round(b.y - cam.y);
    if (b.leaving) g.globalAlpha = Math.max(0, 1 - (b.leaveT = (b.leaveT || 0) + 1) / 60);
    g.save();
    g.translate(x0 + W / 2, y0);
    g.scale(b.facing || 1, 1);
    const folded = b.broken && !b.freed;
    const hanging = b.state === 'climb' || b.state === 'run' || b.state === 'aim';
    // stilts
    if (!folded) {
      const step = b.walking || (b.state === 'think' && Math.floor(b.t / 14) % 2) ? 1 : 0;
      plate(g, -6 - step, 22, 3, 18, M1, '#10121c', M2);
      plate(g, 3 + step, 22, 3, 18, M1, '#10121c', M2);
      plate(g, -8 - step, 38, 6, 2, '#262c3e');
      plate(g, 2 + step, 38, 6, 2, '#262c3e');
    } else plate(g, -8, 34, 16, 6, M1, '#10121c', M2);
    const sink = folded ? 14 : 0;
    // body
    plate(g, -5, 10 + sink, 10, 13, M2, '#10121c', M3);
    plate(g, -3, 13 + sink, 6, 6, M1);
    g.fillStyle = white ? '#ffffff' : b.cored ? '#05060d' : '#7ad1a0';
    g.fillRect(-1, 15 + sink, 2, 2);
    // neck and lens
    plate(g, -1, 4 + sink, 2, 7, M1);
    plate(g, -4, 0 + sink, 8, 6, M2, '#10121c', M3);
    let lens = '#e8434f';
    if (b.freed) lens = '#5fd4e8';
    else if (b.cored || (b.broken && Math.floor(b.t / 30) % 3 === 0)) lens = '#262c3e';
    else if (b.state === 'snipTele' || b.state === 'hedgeTele' || b.state === 'aim') lens = Math.floor(b.timer / 4) % 2 ? glow : '#e8434f';
    g.fillStyle = white ? '#ffffff' : lens;
    g.fillRect(1, 2 + sink, 2, 2);
    // hooks on its head, for the rail
    if (hanging) {
      plate(g, -3, -6, 2, 7, M1);
      plate(g, 1, -6, 2, 7, M1);
    }
    // the shear-arms: the one about to cut glows; a cut is a long blade straight out
    const teleLow = b.state === 'snipTele' && b.snipLow && Math.floor(b.timer / 3) % 2 === 0;
    const teleHigh = b.state === 'snipTele' && !b.snipLow && Math.floor(b.timer / 3) % 2 === 0;
    const cutting = b.state === 'snip';
    drawArm(g, 'high', cutting && !b.snipLow, teleHigh, folded, b.state === 'hedgeTele', M1, M2, M3, glow, sink);
    drawArm(g, 'low', cutting && b.snipLow, teleLow, folded, b.state === 'hedgeTele' || b.state === 'drop' || b.state === 'stuck', M1, M2, M3, glow, sink);
    g.restore();
    g.globalAlpha = 1;
    if (b.broken && !b.freed && world.time % 9 === 0 && Math.random() < 0.6) {
      world.particles.push({ x: b.x + 4 + Math.random() * 10, y: b.y + 16, vx: HA.rand(-0.6, 0.6), vy: -1, life: 14, max: 14, color: b.cored ? '#6c7894' : '#fff0a8', size: 1, grav: 0.08 });
    }
  }

  // An arm from the shoulder: at rest it hangs forward and down; cutting, its blade runs straight out.
  function drawArm(g, which, cutting, tele, folded, down, M1, M2, M3, glow, sink) {
    const y = which === 'high' ? 11 + sink : 16 + sink;
    if (folded) {
      plate(g, 4, y + 6, 10, 2, M1);
      return;
    }
    if (cutting) {
      // the cut, at the feet (low) or at head height (high), its full reach out from the body
      const cy = which === 'low' ? 30 : 12;
      plate(g, 4, y, 4, 3, M1);
      plate(g, 6, cy - 1, REACH + 3, 3, M3, '#10121c', '#ffffff');
      g.fillStyle = '#ffffff';
      g.fillRect(8, cy, REACH, 1);
      return;
    }
    if (down) {
      // driven into the floor
      plate(g, 4, y, 3, 40 - y, M1, '#10121c', M2);
      plate(g, 3, 36, 5, 4, M3);
      return;
    }
    const color = tele ? glow : M2;
    plate(g, 4, y, 9, 3, color, '#10121c', tele ? '#ffffff' : M3);
    plate(g, 11, y + 2, 3, 9, color, '#10121c', tele ? '#ffffff' : M3);
    plate(g, 9, y + 10, 7, 2, tele ? '#ffffff' : M3);
  }

  function drawHedges(g, world, b, cam) {
    for (const hd of b.hedges) {
      const grow = Math.min(1, hd.t / 24);
      const h = Math.round(hd.h * grow);
      const x = Math.round(hd.x - cam.x);
      const y = Math.round(hd.y + hd.h - h - cam.y);
      const fade = hd.life < 20 && Math.floor(hd.life / 3) % 2;
      if (fade) continue;
      g.fillStyle = '#1f3a28';
      g.fillRect(x + 1, y + 2, hd.w - 2, h - 2);
      g.fillStyle = hd.t > 24 ? '#2f5a3a' : '#3f7a4a';
      g.fillRect(x + 2, y + 3, hd.w - 4, h - 4);
      if (hd.t > 24) {
        for (const tx of [1, 5, 9]) {
          g.fillStyle = '#f27ad8';
          g.fillRect(x + tx, y, 1, 3);
          g.fillStyle = '#b04ad0';
          g.fillRect(x + tx + 1, y + 4, 1, 2);
        }
      }
    }
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'THE PRUNER', { name: '#a8e6a0', fill: '#4f9a5a', back: '#13281b', marks: [1 / 2] });

  // In a cutscene it stands, walks and folds like any actor.
  const actor = (world, x, feetY) => {
    const a = make(world, x, feetY);
    a.update = (w, self) => self.t++;
    a.draw = (g, w, self, cam) => draw(g, w, self, cam);
    return a;
  };

  HA.bosses.pruner = { MAX_HP, make, update, hurt, draw, drawBar, actor };
})(window.HA);
