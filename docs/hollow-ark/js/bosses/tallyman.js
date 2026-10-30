'use strict';
// The Tallyman: the Warden that has counted every crate on the ship for three hundred years. It rides a gantry
// crane along the ceiling of its yard, and its core is the Vault's lock. Its cab is armoured; its core shows only
// when the hold under the cab hangs open, after it has dropped its crates. Then the harpoon can bite the ring on
// the core and winch the hero up into it, which is the blow that counts. Shots at the open core count too.
//   Drop       it lines up over the hero and counts out loud, ONE, TWO, THREE, a crate falling on each count.
//              The count gives the rhythm away, and the crate's shadow shows where. Then the hold hangs open.
//   Hook       the crane's hook drops on its cable and swings across the yard at knee height. Jump it.
//   Audit      it stamps a red mark under the hero that goes off two seconds later. In the second half, two.
//   Rearrange  (second half) it stacks crates into cover, and the hold hangs open after this too.
// It vents shards every 15% of its health.
(function (HA) {
  const MAX_HP = 240;
  const W = 28;
  const H = 14;
  const STEP = Math.round(MAX_HP * 0.15);
  const STRIKE = 40; // the harpoon's blow on the open core
  const plate = HA.boss.plate;

  function make(world, cx) {
    return {
      boss: true,
      type: 'tallyman',
      name: 'THE TALLYMAN',
      x: cx - W / 2,
      y: 30,
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
      floorY: 19 * 8,
      x0: 2 * 8,
      x1: 38 * 8,
      next: 0,
      rope: 20, // how far the hook hangs below the cab
      swing: 0,
      marks: [],
      falling: [],
      stacked: [],
      core: null,
    };
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };
  const fast = (b, n) => Math.round(n * (b.phase === 2 ? 0.8 : 1));
  const cx = (b) => b.x + W / 2;
  const SEQUENCE = ['drop', 'hook', 'audit', 'drop', 'audit', 'hook'];
  const NUMBERS = ['ONE.', 'TWO.', 'THREE.', 'FOUR.'];

  // Slide along the rail toward a spot, never past the ends of the yard.
  function slide(b, x, speed) {
    const want = HA.clamp(x - W / 2, b.x0, b.x1 - W);
    b.vx = HA.clamp(want - b.x, -speed, speed);
    b.x += b.vx;
    if (Math.abs(b.vx) > 0.1) b.facing = Math.sign(b.vx);
    return Math.abs(want - b.x) < 1;
  }

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    updateFalling(world, b);
    updateMarks(world, b);
    updateStacked(world, b);
    if (b.core) {
      b.core.x = cx(b);
      b.core.y = b.y + H + 5;
    }
    if (!b.fighting || b.broken || world.scene) {
      b.rope = HA.approach(b.rope, 20, 2);
      return;
    }
    const p = world.player;
    const px = p.x + p.w / 2;
    if (b.timer > 0) b.timer--;

    switch (b.state) {
      case 'think':
        slide(b, px, 0.8);
        if (b.timer > 0) break;
        {
          let move = SEQUENCE[b.next++ % SEQUENCE.length];
          if (b.phase === 2 && move === 'hook' && b.last !== 'rearrange' && Math.random() < 0.5) move = 'rearrange';
          b.last = move;
          if (move === 'drop') {
            b.count = 0;
            b.counts = b.phase === 2 ? 4 : 3;
            set(b, 'line', 36);
          } else if (move === 'hook') {
            set(b, 'lower', 40);
            HA.audio.play('telegraph');
          } else if (move === 'audit') set(b, 'audit', 50);
          else set(b, 'rearrange', 30);
        }
        break;

      // Drop: line up over the hero, call the count, let the crate go.
      case 'line':
        slide(b, px, b.phase === 2 ? 2.2 : 1.6);
        if (b.timer === 0) {
          world.floatText(cx(b), b.y - 4, NUMBERS[b.count], '#ff8a8a');
          HA.audio.play('tally', b.count);
          set(b, 'count', fast(b, 22));
        }
        break;
      case 'count':
        if (b.timer === 0) {
          b.falling.push({ x: cx(b) - 6, y: b.y + H, vy: 0.5, w: 12, h: 12 });
          HA.audio.play('swipe');
          b.count++;
          if (b.count < b.counts) set(b, 'line', fast(b, 30));
          else open(world, b, b.phase === 2 ? 130 : 160);
        }
        break;

      // The hold hangs open: the core shows, with a ring the harpoon can bite.
      case 'open':
        if (b.timer === 0) shut(world, b);
        break;
      case 'reel':
        b.vx = 0;
        if (b.timer === 0) shut(world, b);
        break;

      // Hook: the cable pays out until the hook hangs at knee height, then it swings across the yard.
      case 'lower':
        b.rope = HA.approach(b.rope, b.floorY - 6 - (b.y + H), 4);
        if (b.timer === 0) {
          set(b, 'swing', fast(b, 160));
          b.swing = 0;
          HA.audio.play('swipe');
        }
        break;
      case 'swing':
        b.swing += b.phase === 2 ? 0.055 : 0.045;
        if (b.timer % 40 === 0) HA.audio.play('swipe');
        if (b.timer === 0) set(b, 'raise', 40);
        break;
      case 'raise':
        b.rope = HA.approach(b.rope, 20, 3);
        b.swing *= 0.9;
        if (b.timer === 0) set(b, 'think', fast(b, 40));
        break;

      // Audit: stamp a red mark under the hero, and another near it in the second half.
      case 'audit':
        slide(b, px, 2);
        if (b.timer === 0) {
          world.floatText(cx(b), b.y - 4, 'AUDIT.', '#ff8a8a');
          const at = [px];
          if (b.phase === 2) at.push(px + (px < (b.x0 + b.x1) / 2 ? 56 : -56));
          for (const x of at) b.marks.push({ x: HA.clamp(x, b.x0 + 12, b.x1 - 12), t: 120 });
          HA.audio.play('stamp');
          world.shake(1.5);
          set(b, 'think', fast(b, 70));
        }
        break;

      // Rearrange: two stacks of crates set down as cover, then the hold hangs open.
      case 'rearrange':
        if (b.timer === 0) {
          world.floatText(cx(b), b.y - 4, 'RECOUNT.', '#ff8a8a');
          for (const tx of [9 + Math.floor(Math.random() * 4), 26 + Math.floor(Math.random() * 4)]) {
            for (const ty of [18, 17]) b.falling.push({ x: tx * 8, y: b.y + H - (18 - ty) * 14, vy: 0.5, w: 8, h: 8, stack: true });
          }
          HA.audio.play('crane');
          open(world, b, 120);
        }
        break;
    }

    // The swinging hook hurts on contact; so does flying up into the cab.
    const hk = hookPos(b);
    if (!p.dead && (b.state === 'swing' || b.state === 'lower') && HA.overlap({ x: hk.x - 5, y: hk.y - 4, w: 10, h: 9 }, p)) world.hurtPlayer(3, hk.x);
    if (!p.dead && HA.overlap({ x: b.x + 2, y: b.y, w: W - 4, h: H }, p)) world.hurtPlayer(2, cx(b));
  }

  function hookPos(b) {
    const ax = cx(b);
    const ay = b.y + H;
    const a = b.state === 'swing' || b.state === 'raise' ? Math.sin(b.swing) * 1.05 : 0;
    return { x: ax + Math.sin(a) * b.rope, y: ay + Math.cos(a) * b.rope };
  }

  // The hold opens, and the core's ring goes up as a hook only the harpoon can bite.
  function open(world, b, frames) {
    set(b, 'open', frames);
    HA.audio.play('unlock');
    b.core = { x: cx(b), y: b.y + H + 5, move: true, strike: (w, p) => strike(w, b) };
    world.hooks.push(b.core);
  }
  function shut(world, b) {
    if (b.core) {
      b.core.gone = true;
      world.hooks = world.hooks.filter((h) => h !== b.core);
      b.core = null;
      HA.audio.play('doorShut');
    }
    set(b, 'think', fast(b, 50));
  }

  // The harpoon winches the hero up into the open core: the blow that counts. The cab bucks them off.
  function strike(world, b) {
    world.shake(5);
    world.flash('#ff8a8a', 6);
    world.freeze(6);
    world.burst(cx(b), b.y + H + 4, ['#e8434f', '#ffb84d', '#fff0a8', '#ffffff'], 24, 2.4);
    HA.audio.play('salvage');
    damage(world, b, STRIKE);
    if (b.hp > 0 && b.fighting) {
      set(b, 'reel', 60);
      if (b.core) b.core.gone = true;
      world.hooks = world.hooks.filter((h) => h !== b.core);
      b.core = null;
    }
  }

  // Crates in the air fall until they land: on the hero, it hurts; on the floor, it stays a while as cover.
  function updateFalling(world, b) {
    const p = world.player;
    for (const c of b.falling) {
      c.vy = Math.min(c.vy + 0.3, 6);
      c.y += c.vy;
      if (!p.dead && HA.overlap(c, p)) {
        world.hurtPlayer(3, c.x + c.w / 2);
        c.done = true;
        world.burst(c.x + c.w / 2, c.y + c.h / 2, ['#b5793a', '#8a5a2b', '#fff0a8'], 12, 1.8);
        HA.audio.play('crate');
        continue;
      }
      const tx = Math.floor((c.x + c.w / 2) / 8);
      let ty = Math.floor((c.y + c.h) / 8);
      if (world.room.tile(tx, ty) === HA.room.EMPTY && ty < 19) continue;
      c.done = true;
      ty -= 1;
      world.shake(1.5);
      HA.audio.play('land');
      // It sets down as a crate in the floor, unless something is standing there.
      const cell = { x: tx * 8, y: ty * 8, w: 8, h: 8 };
      if (world.room.tile(tx, ty) !== HA.room.EMPTY || HA.overlap(cell, p)) {
        world.burst(cell.x + 4, cell.y + 4, ['#b5793a', '#8a5a2b'], 8, 1.4);
        continue;
      }
      world.room.set(tx, ty, HA.room.CRATE);
      world.crates.set(tx + ',' + ty, { tx, ty, hp: 3, broken: false, timer: Infinity, flash: 0 });
      b.stacked.push({ tx, ty, life: c.stack ? 900 : 480 });
      world.dust(cell.x + 4, cell.y + 8, 4);
    }
    b.falling = b.falling.filter((c) => !c.done);
  }

  function updateStacked(world, b) {
    for (const s of b.stacked) {
      const c = world.crates.get(s.tx + ',' + s.ty);
      if (!c || c.broken) s.life = 0;
      else if (--s.life <= 0 || !b.fighting) {
        s.life = 0;
        world.room.set(s.tx, s.ty, HA.room.EMPTY);
        world.crates.delete(s.tx + ',' + s.ty);
        world.burst(s.tx * 8 + 4, s.ty * 8 + 4, ['#b5793a', '#5a3a1c'], 6, 1.2);
      }
    }
    b.stacked = b.stacked.filter((s) => s.life > 0);
  }

  // An audit mark blinks on the floor for two seconds, then goes off.
  function updateMarks(world, b) {
    const p = world.player;
    for (const m of b.marks) {
      if (--m.t > 0) continue;
      world.burst(m.x, b.floorY - 4, ['#e8434f', '#ff8a8a', '#fff0a8'], 18, 2.2);
      world.flashes.push({ x: m.x, y: b.floorY - 6, life: 4, r: 6 });
      world.shake(3);
      HA.audio.play('blast');
      if (!p.dead && HA.overlap({ x: m.x - 18, y: b.floorY - 30, w: 36, h: 30 }, p)) world.hurtPlayer(3, m.x);
    }
    b.marks = b.marks.filter((m) => m.t > 0 && b.fighting);
  }

  function damage(world, b, dmg) {
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 6;
    HA.boss.vent(world, b, STEP);
    if (b.phase === 1 && b.hp <= MAX_HP / 2) {
      b.phase = 2;
      world.flash('#ffd84d', 5);
      HA.audio.play('roar');
      HA.music.setLayers(2);
    }
    if (b.hp <= MAX_HP / 4) HA.music.setLayers(3);
    if (b.hp <= 0) {
      b.fighting = false;
      b.falling = [];
      b.marks = [];
      if (b.core) b.core.gone = true;
      world.hooks = world.hooks.filter((h) => h !== b.core);
      b.core = null;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // Shots only count while the hold hangs open; otherwise they spark off the armour.
  function hurt(world, b, dmg, dir) {
    if (!b.fighting || b.broken || b.hp <= 0) return;
    if (b.state !== 'open' && b.state !== 'reel') {
      world.burst(cx(b), b.y + H, ['#a9b6cc', '#fff0a8'], 2, 1);
      HA.audio.play('tink');
      return;
    }
    world.burst(cx(b), b.y + H + 3, ['#ffb84d', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    damage(world, b, dmg);
  }

  // ---- Drawing: a crane's cab in hazard yellow, its count on a red display, the core in the open hold ----
  function draw(g, world, b, cam) {
    for (const m of b.marks) {
      const x = Math.round(m.x - cam.x);
      const y = Math.round(b.floorY - cam.y);
      const on = m.t > 40 || Math.floor(m.t / 4) % 2;
      g.fillStyle = on ? '#e8434f' : '#3a1520';
      g.fillRect(x - 12, y - 1, 24, 1);
      g.fillRect(x - 9, y - 2, 18, 1);
      if (on) HA.font.draw(g, '×', x, y - 10, '#e8434f', { align: 'center' });
    }
    for (const c of b.falling) {
      // the shadow where it will land, and the crate
      const sx = Math.round(c.x + c.w / 2 - cam.x);
      g.fillStyle = 'rgba(5,6,13,0.6)';
      g.fillRect(sx - c.w / 2, Math.round(b.floorY - 2 - cam.y), c.w, 2);
      const x = Math.round(c.x - cam.x);
      const y = Math.round(c.y - cam.y);
      g.fillStyle = '#3d2814';
      g.fillRect(x, y, c.w, c.h);
      g.fillStyle = '#8a5a2b';
      g.fillRect(x + 1, y + 1, c.w - 2, c.h - 2);
      g.fillStyle = '#b5793a';
      g.fillRect(x + 1, y + 1, c.w - 2, 1);
    }
    if (b.state === 'line' || b.state === 'count') {
      const sx = Math.round(cx(b) - cam.x);
      g.fillStyle = 'rgba(5,6,13,0.55)';
      g.fillRect(sx - 6, Math.round(b.floorY - 2 - cam.y), 12, 2);
    }
    if (b.gone) return;
    const white = b.flash > 0;
    const Y1 = white ? '#ffffff' : '#c9a227';
    const Y2 = white ? '#ffffff' : '#ffd84d';
    const D = white ? '#ffffff' : '#3a3a40';
    const x0 = Math.round(b.x - cam.x);
    const y0 = Math.round(b.y - cam.y);
    // the trolley on the rail, and the cab under it
    plate(g, x0 + 6, y0 - 6, 16, 6, D, '#10121c', '#6c7894');
    const sag = b.broken && !b.freed ? 2 : 0;
    plate(g, x0, y0 + sag, W, H, Y1, '#10121c', Y2);
    for (let i = 2; i < W - 2; i += 6) {
      g.fillStyle = white ? '#ffffff' : '#10121c';
      g.fillRect(x0 + i, y0 + sag + 10, 3, 2);
    }
    // the count display
    g.fillStyle = '#10121c';
    g.fillRect(x0 + 6, y0 + sag + 3, 16, 6);
    const lit = b.cored ? '#262c3e' : b.freed ? '#5fd4e8' : '#e8434f';
    g.fillStyle = white ? '#ffffff' : lit;
    if (!b.cored) {
      const n = b.state === 'line' || b.state === 'count' ? b.count + 1 : Math.floor(b.t / 20) % 10;
      for (let i = 0; i < Math.min(n, 4); i++) g.fillRect(x0 + 8 + i * 3, y0 + sag + 5, 2, 2);
    }
    // the hold, and the core in it when it hangs open
    const openHold = b.state === 'open' || b.state === 'reel';
    if (openHold) {
      g.fillStyle = '#10121c';
      g.fillRect(x0 + 8, y0 + H, 12, 6);
      g.fillStyle = Math.floor(b.t / 5) % 2 ? '#ffb84d' : '#e8434f';
      g.fillRect(x0 + 11, y0 + H + 1, 6, 4);
      g.fillStyle = '#a9b6cc';
      g.fillRect(x0 + 12, y0 + H + 6, 4, 2);
      g.fillRect(x0 + 4, y0 + H, 3, 5);
      g.fillRect(x0 + W - 7, y0 + H, 3, 5);
    } else if (b.cored) {
      g.fillStyle = '#05060d';
      g.fillRect(x0 + 10, y0 + H - 2, 8, 4);
    }
    // the cable and the hook
    if (!b.broken || b.freed) {
      const hk = hookPos(b);
      const ax = Math.round(cx(b) - cam.x);
      const ay = Math.round(b.y + H - cam.y);
      const hx = Math.round(hk.x - cam.x);
      const hy = Math.round(hk.y - cam.y);
      g.fillStyle = '#6c7894';
      const n = Math.max(1, Math.ceil(Math.hypot(hx - ax, hy - ay) / 2));
      for (let i = 0; i <= n; i++) g.fillRect(Math.round(ax + ((hx - ax) * i) / n), Math.round(ay + ((hy - ay) * i) / n), 1, 1);
      const glint = b.state === 'lower' && Math.floor(b.timer / 4) % 2 === 0;
      g.fillStyle = '#10121c';
      g.fillRect(hx - 4, hy - 3, 9, 7);
      g.fillStyle = glint ? '#fff0a8' : '#a9b6cc';
      g.fillRect(hx - 3, hy - 2, 7, 4);
      g.fillStyle = '#6c7894';
      g.fillRect(hx - 3, hy + 2, 2, 2);
      g.fillRect(hx + 2, hy + 2, 2, 2);
    }
    if (b.broken && !b.freed && world.time % 9 === 0 && Math.random() < 0.6) {
      world.particles.push({ x: b.x + 4 + Math.random() * 20, y: b.y + H, vx: HA.rand(-0.5, 0.5), vy: 0.6, life: 16, max: 16, color: b.cored ? '#6c7894' : '#fff0a8', size: 1, grav: 0.1 });
    }
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'THE TALLYMAN', { name: '#ffd84d', fill: '#c9a227', back: '#3a2a10', marks: [1 / 2] });

  HA.bosses.tallyman = { MAX_HP, STRIKE, make, update, hurt, draw, drawBar };
})(window.HA);
