'use strict';
// The first boss: the Bailiff, a Warden that collects Hullfolk for the Steward.
// Every attack has a wind-up the player can read: the lens flares, the clamp rises, or the legs crouch.
// Three phases; each one adds an attack, speeds it up and adds a layer to the music. Every 15% of its
// health it vents energy shards, so a weapon that lost a level can climb back mid-fight.
(function (HA) {
  const MAX_HP = 260;
  const W = 26;
  const H = 30;
  const SHARD_STEP = Math.round(MAX_HP * 0.15);

  function make(world, cx, feetY) {
    return {
      boss: true,
      type: 'bailiff',
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
      timer: 50,
      phase: 1,
      nextShards: MAX_HP - SHARD_STEP,
      summoned: false,
      onGround: true,
      shownHp: MAX_HP,
    };
  }

  const speedFor = (b) => [0, 0.7, 0.8, 0.95][b.phase];
  const windFor = (b, base) => Math.round(base * [0, 1, 0.85, 0.7][b.phase]);

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    const room = world.room;
    // Gravity and footing. The Bailiff is too heavy for catwalks, so they're the hero's refuge from its shockwaves.
    b.vy = Math.min(b.vy + 0.32, 6);
    const hit = HA.room.move(room, b, b.vx, b.vy, { dropThrough: true });
    const wasAir = !b.onGround;
    b.onGround = hit.down;
    if (hit.down) b.vy = 0;
    if (hit.left || hit.right) b.vx = 0;
    if (b.state === 'leap' && b.onGround && wasAir && b.timer < 40) land(world, b);
    if (!b.fighting || b.broken || world.scene) {
      if (b.onGround) b.vx = HA.approach(b.vx, 0, 0.2);
      return;
    }

    const p = world.player;
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const dist = Math.abs(px - bx);
    if (b.timer > 0) b.timer--;

    switch (b.state) {
      case 'think':
        b.vx = HA.approach(b.vx, 0, 0.2);
        if (!p.dead) b.facing = Math.sign(px - bx) || b.facing;
        if (b.timer > 0) break;
        if (b.phase === 3 && !b.summoned) set(b, 'summon', 50);
        else if (dist < 46) set(b, 'swipe', windFor(b, 34));
        else {
          // Mix it up at range, and never the same move three times running.
          const far = dist > 110;
          const options = [
            ['volley', far ? 5 : 3.5],
            ['march', far ? 3 : 4],
            ['crouch', b.phase >= 2 ? (far ? 2.5 : 2.5) : 0],
          ].filter(([m, weight]) => weight > 0 && !(b.last === m && b.last2 === m));
          let roll = Math.random() * options.reduce((n, o) => n + o[1], 0);
          const move = options.find((o) => (roll -= o[1]) < 0)[0];
          b.last2 = b.last;
          b.last = move;
          if (move === 'volley') set(b, 'volley', windFor(b, 38));
          else if (move === 'crouch') set(b, 'crouch', windFor(b, 30));
          else set(b, 'march', 70);
        }
        if (b.state === 'swipe' || b.state === 'volley' || b.state === 'crouch') HA.audio.play('telegraph');
        break;
      case 'march':
        b.facing = Math.sign(px - bx) || b.facing;
        b.vx = HA.approach(b.vx, b.facing * speedFor(b), 0.08);
        if (b.t % 22 === 0) {
          world.shake(0.8);
          HA.audio.play('stomp');
        }
        if (dist < 40 || b.timer === 0) set(b, 'think', 8);
        break;
      case 'swipe':
        b.vx = HA.approach(b.vx, 0, 0.3);
        if (b.timer === 0) {
          set(b, 'strike', 12);
          b.vx = b.facing * 2.2;
          HA.audio.play('swipe');
        }
        break;
      case 'strike': {
        const reach = { x: b.facing > 0 ? b.x + b.w - 4 : b.x - 22, y: b.y + 8, w: 26, h: 18 };
        if (HA.overlap(reach, p)) world.hurtPlayer(3, bx);
        b.vx = HA.approach(b.vx, 0, 0.2);
        if (b.timer === 0) {
          // It hops back after every swing, so it can't pin the hero against a wall.
          set(b, 'hop', 30);
          b.vx = -b.facing * 1.7;
          b.vy = -2.6;
        }
        break;
      }
      case 'hop':
        if (b.onGround && b.timer < 24) b.vx = HA.approach(b.vx, 0, 0.3);
        if (b.timer === 0) set(b, 'think', windFor(b, 40));
        break;
      case 'volley':
        b.vx = HA.approach(b.vx, 0, 0.3);
        b.facing = Math.sign(px - bx) || b.facing;
        if (b.timer === 0) {
          const n = b.phase === 1 ? 3 : 5;
          const ang = Math.atan2(p.y + p.h / 2 - (b.y + 7), px - (bx + b.facing * 4));
          for (let i = 0; i < n; i++) {
            const a = ang + (i - (n - 1) / 2) * 0.22;
            world.shots.push({ owner: 'enemy', kind: 'orb', x: bx + b.facing * 4, y: b.y + 7, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 220, dmg: 2, pierce: 0, hits: new Set() });
          }
          HA.audio.play('orb');
          set(b, 'think', windFor(b, 52));
        }
        break;
      case 'crouch':
        b.vx = HA.approach(b.vx, 0, 0.3);
        if (b.timer === 0) {
          // Leap to land where the hero is standing now.
          const frames = 46;
          b.vx = HA.clamp((px - bx) / frames, -3.2, 3.2);
          b.vy = -6.2;
          b.onGround = false;
          set(b, 'leap', 120);
          HA.audio.play('jump');
        }
        break;
      case 'leap':
        if (b.timer === 0) set(b, 'think', 20);
        break;
      case 'land':
        b.vx = HA.approach(b.vx, 0, 0.4);
        if (b.timer === 0) set(b, 'think', windFor(b, 40));
        break;
      case 'summon':
        b.vx = 0;
        if (b.timer === 25) {
          b.summoned = true;
          for (const dx of [-30, 30]) {
            const sp = { type: 'f', tx: 0, ty: 0, x: bx + dx, y: b.y - 16, respawn: -1 };
            world.enemies.push(HA.actors.makeEnemy(sp));
          }
          world.burst(bx, b.y, ['#e8434f', '#ff8a8a', '#ffffff'], 16, 1.8);
          HA.audio.play('summon');
        }
        if (b.timer === 0) set(b, 'think', 30);
        break;
      case 'stagger':
        b.vx = HA.approach(b.vx, 0, 0.3);
        if (b.timer === 0) set(b, 'think', 20);
        break;
    }

    // Walking into the Bailiff hurts.
    if (!p.dead && HA.overlap({ x: b.x + 3, y: b.y + 4, w: b.w - 6, h: b.h - 4 }, p)) world.hurtPlayer(2, bx);
  }

  function set(b, state, timer) {
    b.state = state;
    b.timer = timer;
  }

  function land(world, b) {
    set(b, 'land', 30);
    b.vx = 0;
    world.shake(5);
    HA.audio.play('slam');
    const feet = b.y + b.h;
    for (const dir of [-1, 1]) {
      world.shots.push({ owner: 'enemy', kind: 'wave', x: b.x + b.w / 2 + dir * 12, y: feet, vx: dir * 2.1, vy: 0, life: 240, dmg: 2, h: 10, pierce: 0, hits: new Set() });
    }
    world.burst(b.x + b.w / 2, feet - 2, ['#9fb6c8', '#6c7894', '#ffb84d'], 14, 1.8);
  }

  function hurt(world, b, dmg, dir) {
    if (!b.fighting || b.broken || b.hp <= 0) return;
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 4;
    world.burst(b.x + b.w / 2, b.y + b.h / 2, ['#ffb84d', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    // Energy vents at every 15% lost, so a weapon can be levelled back up during the fight.
    while (b.hp <= b.nextShards && b.nextShards > 0) {
      b.nextShards -= SHARD_STEP;
      const cx = b.x + b.w / 2;
      for (let i = 0; i < 3; i++) world.pickups.push(HA.actors.makeShard(cx, b.y + 6, false));
      world.pickups.push(HA.actors.makeShard(cx, b.y + 6, true));
      if (world.player.hp < world.player.maxHp && Math.random() < 0.5) world.pickups.push(HA.actors.makeHeart(cx, b.y + 6));
      HA.audio.play('vent');
    }
    const phase = b.hp <= MAX_HP / 3 ? 3 : b.hp <= (MAX_HP * 2) / 3 ? 2 : 1;
    if (phase > b.phase) {
      b.phase = phase;
      set(b, 'stagger', 40);
      world.shake(4);
      world.flash('#ffb84d', 5);
      HA.audio.play('roar');
      HA.music.setLayers(phase);
    }
    if (b.hp <= 0) {
      b.fighting = false;
      b.vx = 0;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      for (const e of world.enemies) if (!e.boss && !e.dead) e.dead = true;
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // ---- Drawing: built from plates in code, so it can crouch, raise its clamp and kneel ----
  function plate(g, x, y, w, h, fill, edge = '#10121c', top) {
    g.fillStyle = edge;
    g.fillRect(x, y, w, h);
    g.fillStyle = fill;
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
    if (top) {
      g.fillStyle = top;
      g.fillRect(x + 1, y + 1, w - 2, 1);
    }
  }

  function drawFigure(g, world, b, cam) {
    if (b.gone) return;
    const white = b.flash > 0;
    const M1 = white ? '#ffffff' : '#3a4258';
    const M2 = white ? '#ffffff' : '#6c7894';
    const M3 = white ? '#ffffff' : '#a9b6cc';
    const dark = white ? '#ffffff' : '#262c3e';
    const x0 = Math.round(b.x - cam.x);
    const y0 = Math.round(b.y - cam.y);
    if (b.leaving) g.globalAlpha = Math.max(0, 1 - (b.leaveT = (b.leaveT || 0) + 1) / 60);
    g.save();
    g.translate(x0 + W / 2, y0);
    g.scale(b.facing || 1, 1);
    const s = b.state;
    const kneel = b.broken && !b.freed ? 8 : 0;
    const crouch = s === 'crouch' ? 4 : s === 'land' ? 3 : 0;
    const drop = kneel || crouch;
    const step = (b.walking || s === 'march') && Math.floor(b.t / 11) % 2 ? 1 : 0;

    // legs
    if (!kneel) {
      plate(g, -9, 20 + crouch, 6, 10 - crouch + step, M1, '#10121c', M2);
      plate(g, 3, 20 + crouch, 6, 10 - crouch + (1 - step), M1, '#10121c', M2);
      plate(g, -10, 28 + step, 8, 2, dark);
      plate(g, 2, 29 - step, 8, 2, dark);
    } else {
      plate(g, -10, 26, 20, 4, M1, '#10121c', M2);
    }
    // rear arm
    plate(g, -13, 9 + drop, 4, 9, M1);
    // torso
    plate(g, -10, 8 + drop, 20, 14, M2, '#10121c', M3);
    plate(g, -7, 11 + drop, 14, 8, M1);
    if (b.cored) {
      g.fillStyle = '#05060d';
      g.fillRect(-3, 12 + drop, 6, 6);
      g.fillStyle = '#3a1520';
      g.fillRect(-2, 13 + drop, 4, 4);
    } else {
      const glow = s === 'stagger' || (b.fighting && Math.floor(b.t / 10) % 2);
      g.fillStyle = white ? '#ffffff' : glow ? '#fff0a8' : '#ffb84d';
      g.fillRect(-2, 13 + drop, 4, 4);
    }
    // shoulders
    plate(g, -13, 6 + drop, 26, 5, M2, '#10121c', M3);
    // cowl and lens
    plate(g, -6, 0 + drop, 12, 9, M1, '#10121c', M2);
    const tele = (s === 'volley' || s === 'swipe' || s === 'crouch') && Math.floor(b.timer / 4) % 2 === 0;
    let lens = '#e8434f';
    if (b.freed) lens = '#5fd4e8';
    else if (b.cored || (b.broken && Math.floor(b.t / 30) % 3 === 0)) lens = '#262c3e';
    else if (tele) lens = '#fff0a8';
    g.fillStyle = white ? '#ffffff' : lens;
    g.fillRect(1, 3 + drop, 4, 3);
    if (!b.cored && !b.freed && !white) {
      g.fillStyle = '#ffffff';
      g.fillRect(3, 3 + drop, 1, 1);
    }
    // clamp arm: raised during the wind-up, thrust forward on the strike
    let ax = 10;
    let ay = 10 + drop;
    if (s === 'swipe') ay = 1 + drop;
    if (s === 'strike') ax = 16;
    if (kneel) ay = 20;
    plate(g, ax, ay, 5, 7, M1, '#10121c', M2);
    plate(g, ax + 3, ay + 4, 8, 4, M2, '#10121c', M3);
    plate(g, ax + 3, ay + 10, 8, 3, M2, '#10121c', M3);
    plate(g, ax + 3, ay + 7, 3, 4, M1);
    g.restore();
    g.globalAlpha = 1;
    // sparks off a broken machine
    if (b.broken && !b.freed && world.time % 9 === 0 && Math.random() < 0.6) {
      world.particles.push({ x: b.x + 6 + Math.random() * 14, y: b.y + 10, vx: HA.rand(-0.6, 0.6), vy: -1, life: 14, max: 14, color: b.cored ? '#6c7894' : '#fff0a8', size: 1, grav: 0.08 });
    }
  }

  function draw(g, world, b, cam) {
    drawFigure(g, world, b, cam);
  }

  function drawBar(g, world, b) {
    if (!b.fighting && b.hp > 0) return;
    const w = 200;
    const x = (HA.VIEW_W - w) / 2;
    const y = HA.VIEW_H - 14;
    HA.font.draw(g, 'THE BAILIFF', x, y - 10, '#ff8a8a');
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y - 1, w + 2, 7);
    g.fillStyle = '#3a1520';
    g.fillRect(x, y, w, 5);
    g.fillStyle = '#fff0a8';
    g.fillRect(x, y, Math.round((w * b.shownHp) / b.maxHp), 5);
    g.fillStyle = '#e8434f';
    g.fillRect(x, y, Math.round((w * b.hp) / b.maxHp), 5);
    for (const f of [1 / 3, 2 / 3]) {
      g.fillStyle = '#10121c';
      g.fillRect(x + Math.round(w * f), y, 1, 5);
    }
  }

  HA.boss = { MAX_HP, make, update, hurt, draw, drawFigure, drawBar };
})(window.HA);
