'use strict';
// Cotter, remembering (3.15, Hasp's boy; story/cotter.js). An optional fight in the Muster, and not one the hero can
// win by hurting him: he isn't trying to kill the hero, he's trying to get the Bloom out of his head, and the hero is
// what's in front of him. Shots only knock him back and stagger him. What runs down is the fit: a bar that empties
// over about forty seconds while the hero stays on their feet. Every move has a wind-up:
//   Lunge   he draws the pipe back (his eyes flare), then crosses half the room along the floor.
//   Slam    the pipe goes up over his head, then down on the grating: a crack runs along the floor both ways.
//   Leap    he crouches and springs up under the girder, hangs there over the hero (a shadow on the floor),
//           and drops.
// Shards vent from the dose racks as the fit runs down. When it breaks, he goes down on his knees.
(function (HA) {
  const FIT = 2400; // frames: about forty seconds
  const W = 8;
  const H = 13;
  const STEP = Math.round(FIT * 0.25);
  const CEILING = 12 * 8; // the underside of the Muster's girder
  const GIRDER_END = 69 * 8; // past it, the room is open to the top
  const RACKS = [38, 42, 46, 62, 66, 70].map((c) => c * 8 + 13); // the dose racks by the chairs
  const LINES = { 2: 'GET OUT OF MY HEAD!', 3: "MA? MA, IT'S SO LOUD." };

  function make(world, cx, feetY) {
    return {
      boss: true,
      type: 'cotter',
      x: cx - W / 2,
      y: feetY - H,
      w: W,
      h: H,
      vx: 0,
      vy: 0,
      fit: FIT,
      hp: FIT,
      maxHp: FIT,
      shownHp: FIT,
      facing: -1,
      t: 0,
      flash: 0,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      state: 'kneel',
      timer: 0,
      phase: 1,
      nextShards: FIT - STEP,
      onGround: true,
    };
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };

  // Shards from a dose rack, a quarter of the way down the fit at a time.
  function vent(world, b) {
    while (b.fit <= b.nextShards && b.nextShards > 0) {
      b.nextShards -= STEP;
      const px = world.player.x + world.player.w / 2;
      const x = RACKS.reduce((best, r) => (Math.abs(r - px) < Math.abs(best - px) ? r : best), RACKS[0]);
      for (let i = 0; i < 3; i++) world.pickups.push(HA.actors.makeShard(x, 19 * 8 - 20, false));
      world.pickups.push(HA.actors.makeShard(x, 19 * 8 - 20, true));
      if (world.player.hp < world.player.maxHp) world.pickups.push(HA.actors.makeHeart(x, 19 * 8 - 20));
      world.burst(x, 19 * 8 - 18, ['#f27ad8', '#b04ad0', '#ffffff'], 8, 1.2);
      HA.audio.play('vent');
    }
  }

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 6);
    if (b.state !== 'cling') b.vy = Math.min(b.vy + 0.3, 6);
    const was = !b.onGround;
    const hit = HA.room.move(world.room, b, b.vx, b.vy);
    b.onGround = hit.down;
    if (hit.down) b.vy = 0;
    if (hit.up && b.vy < 0) b.vy = 0;
    if (hit.left || hit.right) b.vx = b.state === 'lunge' ? 0 : -b.vx * 0.3;
    if (!b.fighting || world.scene) {
      b.vx = HA.approach(b.vx, 0, 0.3);
      return;
    }
    const p = world.player;
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const dist = Math.abs(px - bx);
    if (b.timer > 0) b.timer--;
    // The fit runs down while the hero is up; it's the bar.
    if (!p.dead) b.fit = Math.max(0, b.fit - 1);
    b.hp = b.fit;
    vent(world, b);
    const phase = b.fit <= FIT / 3 ? 3 : b.fit <= (FIT * 2) / 3 ? 2 : 1;
    if (phase > b.phase) {
      b.phase = phase;
      HA.story.bark(world, b, LINES[phase], 150);
      HA.music.setLayers(phase);
      world.shake(2);
    }
    const quick = [0, 1, 0.85, 0.7][b.phase];

    switch (b.state) {
      case 'think':
        if (b.onGround) b.vx = HA.approach(b.vx, 0, 0.3);
        if (!p.dead) b.facing = Math.sign(px - bx) || b.facing;
        if (b.timer > 0) break;
        {
          const roll = Math.random();
          const under = bx < GIRDER_END && px < GIRDER_END;
          if (dist > 30 && roll < 0.45 && b.last !== 'lunge') {
            set(b, 'lungeTele', Math.round(30 * quick));
            b.last = 'lunge';
          } else if (under && roll < 0.75 && b.last !== 'leap') {
            set(b, 'leapTele', Math.round(22 * quick));
            b.last = 'leap';
          } else if (b.last !== 'slam') {
            set(b, 'slamTele', Math.round(34 * quick));
            b.last = 'slam';
          } else {
            set(b, 'lungeTele', Math.round(30 * quick));
            b.last = 'lunge';
          }
          HA.audio.play('telegraph');
        }
        break;
      case 'lungeTele':
        b.vx = 0;
        if (b.timer === 0) {
          b.vx = b.facing * 4;
          set(b, 'lunge', 36);
          HA.audio.play('lunge');
        }
        break;
      case 'lunge':
        if (world.time % 2 === 0) world.particles.push({ x: bx, y: b.y + b.h - 2, vx: -b.facing * 0.3, vy: -0.2, life: 10, max: 10, color: '#f27ad8', size: 1, grav: 0 });
        if (b.timer === 0 || Math.abs(b.vx) < 0.5) {
          b.vx *= 0.3;
          set(b, 'think', Math.round(44 * quick));
        }
        break;
      case 'slamTele':
        b.vx = 0;
        if (b.timer === 0) {
          const feet = b.y + b.h;
          for (const dir of [-1, 1]) world.shots.push({ owner: 'enemy', kind: 'wave', x: bx + dir * 8, y: feet, vx: dir * 2, vy: 0, life: 200, dmg: 2, h: 8, pierce: 0, hits: new Set() });
          world.shake(3);
          HA.audio.play('slam');
          world.burst(bx + b.facing * 6, feet - 2, ['#9fb6c8', '#6c7894', '#f27ad8'], 10, 1.6);
          set(b, 'think', Math.round(50 * quick));
        }
        break;
      case 'leapTele':
        b.vx = 0;
        if (b.timer === 0) {
          b.vy = -6;
          set(b, 'leapUp', 30);
          HA.audio.play('jump');
        }
        break;
      case 'leapUp':
        if (b.y <= CEILING + 1 || hit.up || b.timer === 0) {
          b.vy = 0;
          b.y = Math.max(b.y, CEILING);
          set(b, 'cling', Math.round(46 * quick));
        }
        break;
      case 'cling':
        // Hanging under the girder, he edges over the hero; his shadow shows where he'll come down.
        b.vy = 0;
        b.vx = HA.clamp((px - bx) * 0.08, -1.6, 1.6);
        if (b.timer === 0) {
          b.vx = 0;
          b.vy = 1;
          set(b, 'drop', 60);
        }
        break;
      case 'drop':
        if (b.onGround) {
          world.shake(3);
          HA.audio.play('stomp');
          world.burst(bx, b.y + b.h - 1, ['#9fb6c8', '#6c7894'], 8, 1.4);
          set(b, 'think', Math.round(48 * quick));
        } else if (b.timer === 0) set(b, 'think', 20);
        break;
      case 'stagger':
        b.vx = HA.approach(b.vx, 0, 0.2);
        if (b.timer === 0) set(b, 'think', 16);
        break;
    }
    if (was && b.onGround && b.state === 'think' && b.timer > 40) b.timer = 40;

    if (!p.dead && HA.overlap({ x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 1 }, p)) world.hurtPlayer(b.state === 'lunge' || b.state === 'drop' ? 3 : 2, bx);

    if (b.fit <= 0) {
      // The fit breaks, and so does he.
      b.fighting = false;
      b.vx = 0;
      b.state = 'down';
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(10);
      HA.story.onBossDefeated(world);
    }
  }

  // The hero can't hurt him: a hit knocks him back, and breaks his wind-up.
  function hurt(world, b, dmg, dir) {
    if (!b.fighting) return;
    b.flash = 4;
    world.burst(b.x + b.w / 2, b.y + b.h / 2, ['#f27ad8', '#ffffff'], 2, 1);
    HA.audio.play('hit');
    if (b.state === 'cling' || b.state === 'leapUp') return;
    b.vx = (dir || -b.facing) * 2.4;
    if (b.onGround) b.vy = -1.2;
    if (b.state === 'lungeTele' || b.state === 'slamTele' || b.state === 'leapTele' || b.state === 'think') set(b, 'stagger', 22);
  }

  // His own sprite in the Steward's uniform, with the pipe, the Bloom in his eyes, and his shadow when he hangs.
  function draw(g, world, b, cam) {
    const spr = HA.art.people.cotter;
    let frame = spr.idle;
    if (b.state === 'kneel' || b.state === 'down' || b.state === 'leapTele' || b.state === 'lungeTele') frame = spr.kneel;
    else if (b.state === 'lunge' || (Math.abs(b.vx) > 0.4 && b.onGround)) frame = Math.floor(b.t / 5) % 2 ? spr.walk : spr.idle;
    const img = b.flash > 0 ? frame.white : frame.img;
    const cx = Math.round(b.x + b.w / 2 - cam.x);
    const top = Math.round(b.y + b.h - frame.h - cam.y);
    if (b.state === 'cling' || (b.state === 'drop' && !b.onGround)) {
      // where he'll come down: his shadow on the floor, closing in, with a pink edge that blinks
      const w = 8 + Math.floor((b.state === 'cling' ? b.timer : 0) / 6);
      const fy = Math.round(19 * 8 - cam.y);
      g.fillStyle = 'rgba(16,18,28,0.75)';
      g.fillRect(cx - Math.floor(w / 2), fy - 2, w, 2);
      if (Math.floor(b.t / 4) % 2) {
        g.fillStyle = '#f27ad8';
        g.fillRect(cx - Math.floor(w / 2) - 1, fy - 1, 1, 1);
        g.fillRect(cx + Math.ceil(w / 2), fy - 1, 1, 1);
      }
    }
    g.save();
    g.translate(cx, top);
    g.scale(b.facing || 1, 1);
    const ox = -Math.floor(frame.w / 2);
    g.drawImage(img, ox, 0);
    // the pipe: drawn back for the lunge, up for the slam, down at his side otherwise
    const fl = Math.floor(b.timer / 3) % 2 === 0;
    g.fillStyle = b.flash > 0 ? '#ffffff' : '#8a8f99';
    if (b.state === 'lungeTele') g.fillRect(ox - 6, 6, 8, 1);
    else if (b.state === 'slamTele') g.fillRect(ox + 6, -6, 1, 9);
    else if (b.state === 'lunge') g.fillRect(ox + 7, 7, 8, 1);
    else if (b.state !== 'down' && b.state !== 'kneel') g.fillRect(ox + 7, 7, 1, 6);
    // eyes: pink, flaring white on a wind-up
    if (b.state !== 'down' && b.flash <= 0) {
      const tele = b.state === 'lungeTele' || b.state === 'slamTele' || b.state === 'leapTele';
      g.fillStyle = tele && fl ? '#ffffff' : '#f27ad8';
      g.fillRect(ox + 3, 3, 1, 2);
      g.fillRect(ox + 5, 3, 1, 2);
    }
    g.restore();
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'COTTER', { name: '#f27ad8', fill: '#b04ad0', back: '#2a1238', marks: [1 / 3, 2 / 3] });

  HA.bosses.cotter = { FIT, make, update, hurt, draw, drawBar };
})(window.HA);
