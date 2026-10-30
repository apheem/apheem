'use strict';
// Wick, in the Bloom. Fast and erratic, and never cruel:
//   Lunge   she crouches (her eyes flash) and dashes across the room. Jump over her.
//   Fan     she raises her arm and throws a fan of her own lancets.
//   Spores  hit hard, she bursts a cloud of spores around herself and springs away.
// Between phases she speaks, plainly, as herself. At a quarter of her health she collapses on her own: the
// player never lands the last blow.
(function (HA) {
  const MAX_HP = 160;
  const W = 10;
  const H = 16;
  const STEP = Math.round(MAX_HP * 0.15);
  const DOWN = MAX_HP / 4; // where she falls
  const LINES = { 2: "IT'S SO LOUD, SLEEPER.", 3: 'RUN. PLEASE RUN.' };

  function make(world, cx, feetY) {
    return {
      boss: true,
      type: 'wick',
      x: cx - W / 2,
      y: feetY - H,
      w: W,
      h: H,
      vx: 0,
      vy: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      facing: 1,
      t: 0,
      flash: 0,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      state: 'kneel',
      timer: 0,
      phase: 1,
      nextShards: MAX_HP - STEP,
      shownHp: MAX_HP,
      recent: 0, // damage taken in the last half second, for the spore burst
      onGround: true,
    };
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    if (b.recent > 0) b.recent = Math.max(0, b.recent - 0.35);
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    b.vy = Math.min(b.vy + 0.3, 5);
    const hit = HA.room.move(world.room, b, b.vx, b.vy);
    if (hit.down) b.vy = 0;
    b.onGround = hit.down;
    if (hit.left || hit.right) b.vx = -b.vx * 0.3;
    if (!b.fighting || world.scene) {
      b.vx = HA.approach(b.vx, 0, 0.3);
      return;
    }
    const p = world.player;
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const dist = Math.abs(px - bx);
    if (b.timer > 0) b.timer--;
    const quick = [0, 1, 0.85, 0.7][b.phase];

    switch (b.state) {
      case 'think':
        if (b.onGround) b.vx = HA.approach(b.vx, 0, 0.3);
        if (!p.dead) b.facing = Math.sign(px - bx) || b.facing;
        if (b.timer > 0) break;
        {
          const roll = Math.random();
          if (dist > 34 && roll < 0.45 && b.last !== 'lunge') {
            set(b, 'lungeTele', Math.round(24 * quick));
            HA.audio.play('telegraph');
          } else if (roll < 0.8 && b.last !== 'fan') {
            set(b, 'fanTele', Math.round(26 * quick));
            HA.audio.play('telegraph');
          } else {
            // a twitchy hop to somewhere else
            b.vx = HA.rand(-2.2, 2.2);
            b.vy = -3.6;
            set(b, 'hop', 30);
          }
          b.last = b.state === 'lungeTele' ? 'lunge' : b.state === 'fanTele' ? 'fan' : 'hop';
        }
        break;
      case 'lungeTele':
        b.vx = 0;
        if (b.timer === 0) {
          b.vx = b.facing * 4.4;
          b.vy = -1.4;
          b.lungeFrom = bx;
          set(b, 'lunge', 42);
          HA.audio.play('lunge');
        }
        break;
      case 'lunge':
        if (world.time % 2 === 0) world.particles.push({ x: bx, y: b.y + b.h - 2, vx: -b.facing * 0.3, vy: -0.2, life: 10, max: 10, color: '#f27ad8', size: 1, grav: 0 });
        if (b.timer === 0 || (b.onGround && Math.abs(b.vx) < 0.5) || (Math.sign(bx - px) === b.facing && Math.abs(bx - px) > 40)) {
          b.vx *= 0.3;
          set(b, 'think', Math.round(46 * quick));
        }
        break;
      case 'fanTele':
        b.vx = 0;
        if (b.timer === 0) {
          const n = b.phase === 1 ? 3 : 5;
          const ang = Math.atan2(p.y + p.h / 2 - (b.y + 5), px - bx);
          for (let i = 0; i < n; i++) {
            const a = ang + (i - (n - 1) / 2) * 0.24;
            world.shots.push({ owner: 'enemy', kind: 'lancetE', x: bx, y: b.y + 5, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, life: 160, dmg: 2, pierce: 0, hits: new Set() });
          }
          HA.audio.play('lancet', 1);
          set(b, 'think', Math.round(50 * quick));
        }
        break;
      case 'hop':
        if (b.onGround && b.timer < 22) set(b, 'think', Math.round(20 * quick));
        break;
      case 'stagger':
        b.vx = HA.approach(b.vx, 0, 0.3);
        if (b.timer === 0) set(b, 'think', 20);
        break;
    }

    if (!p.dead && HA.overlap({ x: b.x + 1, y: b.y + 2, w: b.w - 2, h: b.h - 2 }, p)) world.hurtPlayer(b.state === 'lunge' ? 3 : 2, bx);
  }

  function hurt(world, b, dmg, dir) {
    if (!b.fighting || b.hp <= DOWN) return;
    b.hp = Math.max(DOWN, b.hp - dmg);
    b.flash = 4;
    b.recent += dmg;
    world.burst(b.x + b.w / 2, b.y + b.h / 2, ['#f27ad8', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    HA.boss.vent(world, b, STEP);
    // Hit hard, the Bloom in her bursts out as spores, and she springs away.
    if (b.recent >= 12 && b.state !== 'stagger') {
      b.recent = 0;
      HA.actors.sporeCloud(world, b.x + b.w / 2, b.y + b.h, 34, 24, 150);
      HA.audio.play('spores');
      b.vx = -Math.sign(world.player.x - b.x) * 2.4;
      b.vy = -3.4;
      set(b, 'hop', 30);
    }
    const phase = b.hp <= MAX_HP / 2 ? 3 : b.hp <= (MAX_HP * 3) / 4 ? 2 : 1;
    if (phase > b.phase) {
      b.phase = phase;
      set(b, 'stagger', 70);
      world.shake(3);
      HA.story.bark(world, b, LINES[phase], 150);
      HA.music.setLayers(phase);
    }
    if (b.hp <= DOWN) {
      // She falls on her own.
      b.fighting = false;
      b.vx = 0;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.actors = world.actors.filter((a) => a.kind !== 'cloud');
      world.freeze(10);
      HA.story.onBossDefeated(world);
    }
  }

  // Her own sprite, with the Bloom on her: pink growths through the cloth, and eyes that glow.
  function draw(g, world, b, cam) {
    const spr = HA.art.people.wick;
    let frame = spr.idle;
    if (b.state === 'kneel' || b.state === 'lungeTele') frame = spr.kneel;
    else if (b.still || b.state === 'down') frame = spr.sleep;
    else if (Math.abs(b.vx) > 0.4 && b.onGround) frame = Math.floor(b.t / 5) % 2 ? spr.walk : spr.idle;
    const img = b.flash > 0 ? frame.white : frame.img;
    const cx = Math.round(b.x + b.w / 2 - cam.x);
    const top = Math.round(b.y + b.h - frame.h - cam.y);
    g.save();
    g.translate(cx, top);
    g.scale(b.facing || 1, 1);
    const ox = -Math.floor(frame.w / 2);
    g.drawImage(img, ox, 0);
    if (b.flash <= 0 && !b.healed) {
      const k = frame === spr.idle || frame === spr.walk ? 0 : frame.h < spr.h ? spr.h - frame.h : 0;
      g.fillStyle = '#b04ad0';
      for (const [x, y] of [[1, 7], [2, 8], [6, 9], [7, 10], [3, 11], [0, 1], [7, 2]]) if (y - k >= 0) g.fillRect(ox + x, y - k, 1, 1);
      g.fillStyle = '#f27ad8';
      for (const [x, y] of [[1, 6], [6, 8], [8, 1], [4, 12]]) if (y - k >= 0) g.fillRect(ox + x, y - k, 1, 1);
      // eyes
      if (!b.still && b.state !== 'down' && frame !== spr.sleep) {
        const flare = b.state === 'lungeTele' || b.state === 'fanTele' ? Math.floor(b.timer / 3) % 2 === 0 : Math.floor(b.t / 40) % 3 === 0;
        g.fillStyle = flare ? '#ffffff' : '#f27ad8';
        g.fillRect(ox + 3, 3 - (frame === spr.kneel ? 0 : 0), 1, 2);
        g.fillRect(ox + 5, 3, 1, 2);
      }
    }
    // the arm raised to throw
    if (b.state === 'fanTele') {
      g.fillStyle = '#10121c';
      g.fillRect(ox + 6, -3, 3, 8);
      g.fillStyle = Math.floor(b.timer / 3) % 2 ? '#eef4f6' : '#f27ad8';
      g.fillRect(ox + 7, -3, 1, 4);
    }
    g.restore();
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'WICK', { name: '#f27ad8', fill: '#b04ad0', back: '#2a1238', marks: [1 / 4, 1 / 2, 3 / 4] });

  HA.bosses.wick = { MAX_HP, DOWN, make, update, hurt, draw, drawBar };
})(window.HA);
