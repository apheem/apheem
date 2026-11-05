'use strict';
// The Fireman (3.15, the new stoker; story/stoker.js). The second optional fight: the Steward's foreman over the
// Reactor Throat's furnace, a big Bloomsworn in a riveted iron apron and furnace goggles, with a long iron rake. He
// only fights if the hero tells him to let his new stoker go. He's too heavy for the catwalks, so they're the hero's
// way out of his reach, and the furnace is behind him. Every move has a wind-up:
//   Rake     he draws the rake back (its tip glows white), then sweeps it out along the floor in front of him.
//   Coals    he turns to the furnace mouth and fills his shovel (it glows), then flings the coals in arcs at the
//            hero; where they land, the floor burns for a moment. Three, then five in the second half.
//   Draught  he hauls on the furnace's draught chain: the floor grates nearest the hero glow and shake, then
//            fire roars up out of them. One grate, then all three in the second half.
// He vents shards every quarter of his health. Beaten, he goes down on one knee and drops the key to the chain.
(function (HA) {
  const MAX_HP = 200;
  const STEP = Math.round(MAX_HP * 0.25);
  const W = 14;
  const H = 26;
  const FLOOR = 19 * 8; // the Throat's floor
  const MOUTH = 33 * 8; // the furnace's face
  const REACH = 46; // how far the rake sweeps out in front of him
  const LINES = { 2: 'HOTTER, THEN!' };

  function make(world, cx, feetY) {
    return {
      boss: true,
      type: 'fireman',
      x: cx - W / 2,
      y: feetY - H,
      w: W,
      h: H,
      vx: 0,
      vy: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      shownHp: MAX_HP,
      facing: -1,
      t: 0,
      flash: 0,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      state: 'stand',
      timer: 0,
      phase: 1,
      nextShards: MAX_HP - STEP,
      onGround: true,
      coals: [],
      fires: [],
      columns: [],
      // the grates are the Throat's (areas/spine.js), on the floor row
      grates: (world.def.grates || []).map((gr) => ({ x: gr.x0 * 8, w: (gr.x1 - gr.x0 + 1) * 8 })),
      home: cx - W / 2,
    };
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };
  const quick = (b) => (b.phase === 2 ? 0.75 : 1);

  // ---- The heat he leaves behind: coals in the air, fires on the floor, columns out of the grates ----
  function updateHeat(world, b) {
    const p = world.player;
    for (const c of b.coals) {
      c.vy += 0.18;
      c.x += c.vx;
      c.y += c.vy;
      if (world.time % 3 === 0) world.particles.push({ x: c.x, y: c.y, vx: 0, vy: -0.3, life: 10, max: 10, color: '#ff9b3d', size: 1, grav: 0 });
      if (!p.dead && HA.overlap({ x: c.x - 2, y: c.y - 2, w: 4, h: 4 }, p)) {
        world.hurtPlayer(2, c.x);
        c.done = true;
      }
      if (c.y >= FLOOR - 2 || world.room.solidAt(c.x, c.y)) {
        c.done = true;
        b.fires.push({ x: c.x - 6, w: 12, life: 110 });
        HA.audio.play('slag');
      }
    }
    b.coals = b.coals.filter((c) => !c.done && c.x > 0 && c.x < world.room.pw);
    for (const f of b.fires) {
      f.life--;
      if (!p.dead && f.life > 10 && HA.overlap({ x: f.x, y: FLOOR - 6, w: f.w, h: 6 }, p)) world.hurtPlayer(1, f.x + f.w / 2);
    }
    b.fires = b.fires.filter((f) => f.life > 0);
    for (const col of b.columns) {
      col.t--;
      if (col.t <= col.burn && !p.dead && HA.overlap({ x: col.x, y: FLOOR - 64, w: col.w, h: 64 }, p)) world.hurtPlayer(2, col.x + col.w / 2);
      if (col.t <= col.burn && world.time % 2 === 0) world.particles.push({ x: col.x + HA.rand(0, col.w), y: FLOOR - HA.rand(0, 60), vx: HA.rand(-0.3, 0.3), vy: -1.6, life: 18, max: 18, color: Math.random() < 0.5 ? '#ff9b3d' : '#fff0a8', size: 2, grav: 0 });
    }
    b.columns = b.columns.filter((col) => col.t > 0);
  }

  // The coals: lobbed to land where the hero is (and either side of them, for more than one).
  function fling(world, b) {
    const p = world.player;
    const n = b.phase === 2 ? 5 : 3;
    const sx = b.x + b.w / 2 + b.facing * 6;
    const sy = b.y + 6;
    const tx = p.x + p.w / 2;
    for (let i = 0; i < n; i++) {
      const aim = tx + (i - (n - 1) / 2) * 22;
      const frames = 46;
      b.coals.push({ x: sx, y: sy, vx: (aim - sx) / frames, vy: -4.2 });
    }
    HA.audio.play('lob');
  }

  // The draught: the grate nearest the hero (or all of them, in the second half) glows, then burns.
  function draught(world, b) {
    const px = world.player.x + world.player.w / 2;
    const near = b.grates.slice().sort((a, c) => Math.abs(a.x + a.w / 2 - px) - Math.abs(c.x + c.w / 2 - px));
    const which = b.phase === 2 ? near : near.slice(0, 1);
    for (const gr of which) b.columns.push({ x: gr.x, w: gr.w, t: 110, burn: 60 });
    HA.audio.play('grate');
  }

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.4);
    updateHeat(world, b);
    b.vy = Math.min(b.vy + 0.32, 6);
    const hit = HA.room.move(world.room, b, b.vx, b.vy, { dropThrough: true });
    b.onGround = hit.down;
    if (hit.down) b.vy = 0;
    if (hit.left || hit.right) b.vx = 0;
    if (!b.fighting || world.scene) {
      b.vx = HA.approach(b.vx, 0, 0.2);
      return;
    }
    const p = world.player;
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const dist = Math.abs(px - bx);
    const up = p.y + p.h < FLOOR - 20; // on a catwalk, out of the rake's reach
    if (b.timer > 0) b.timer--;
    const q = quick(b);

    switch (b.state) {
      case 'think':
        if (!p.dead) b.facing = Math.sign(px - bx) || b.facing;
        // he plods after the hero along the floor while he decides
        b.vx = dist > 30 && !up ? b.facing * (b.phase === 2 ? 0.8 : 0.6) : 0;
        if (b.timer > 0) break;
        b.vx = 0;
        if (!up && dist < REACH + 10 && b.last !== 'rake') {
          set(b, 'rakeTele', Math.round(34 * q));
          b.last = 'rake';
        } else if (b.last !== 'coals' && (up || dist >= REACH + 10 || Math.random() < 0.5)) {
          set(b, 'coalsTele', Math.round(40 * q));
          b.last = 'coals';
        } else if (b.last !== 'draught') {
          set(b, 'draughtTele', Math.round(30 * q));
          b.last = 'draught';
        } else {
          set(b, 'coalsTele', Math.round(40 * q));
          b.last = 'coals';
        }
        HA.audio.play('telegraph');
        break;
      case 'rakeTele':
        b.vx = 0;
        if (b.timer === 0) {
          set(b, 'rake', 16);
          HA.audio.play('lunge');
          world.shake(2);
        }
        break;
      case 'rake': {
        const box = { x: b.facing > 0 ? bx : bx - REACH, y: FLOOR - 12, w: REACH, h: 12 };
        if (!p.dead && HA.overlap(box, p)) world.hurtPlayer(3, bx);
        if (b.timer % 3 === 0) world.particles.push({ x: bx + b.facing * REACH * (1 - b.timer / 16), y: FLOOR - 2, vx: b.facing * 0.6, vy: -0.6, life: 12, max: 12, color: '#ffb84d', size: 1, grav: 0.05 });
        if (b.timer === 0) set(b, 'think', Math.round(46 * q));
        break;
      }
      case 'coalsTele':
        b.vx = 0;
        if (b.timer === 0) {
          fling(world, b);
          set(b, 'throw', 20);
        }
        break;
      case 'throw':
        if (b.timer === 0) set(b, 'think', Math.round(50 * q));
        break;
      case 'draughtTele':
        b.vx = 0;
        if (b.timer === 0) {
          draught(world, b);
          set(b, 'haul', 50);
          world.shake(2);
        }
        break;
      case 'haul':
        if (b.timer === 0) set(b, 'think', Math.round(40 * q));
        break;
      case 'stagger':
        b.vx = HA.approach(b.vx, 0, 0.2);
        if (b.timer === 0) set(b, 'think', 18);
        break;
    }

    if (!p.dead && HA.overlap({ x: b.x + 2, y: b.y + 2, w: b.w - 4, h: b.h - 2 }, p)) world.hurtPlayer(2, bx);
  }

  function hurt(world, b, dmg, dir) {
    if (!b.fighting || b.hp <= 0) return;
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 4;
    world.burst(b.x + b.w / 2, b.y + b.h / 2, ['#ff9b3d', '#f27ad8', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    HA.boss.vent(world, b, STEP);
    if (b.phase === 1 && b.hp <= MAX_HP / 2) {
      b.phase = 2;
      set(b, 'stagger', 36);
      world.shake(4);
      world.flash('#ff9b3d', 5);
      HA.audio.play('roar');
      HA.music.setLayers(2);
      HA.story.bark(world, b, LINES[2], 150, { color: '#ffb84d' });
    }
    if (b.hp <= 0) {
      b.fighting = false;
      b.vx = 0;
      b.state = 'down';
      b.coals = [];
      b.columns = [];
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // Put back where he stands over the stoker, for the fight's checkpoint.
  function reset(b) {
    Object.assign(b, { x: b.home, vx: 0, vy: 0, hp: MAX_HP, shownHp: MAX_HP, phase: 1, nextShards: MAX_HP - STEP, fighting: false, active: false, state: 'stand', timer: 0, coals: [], fires: [], columns: [], last: null, facing: -1 });
  }

  // ---- Drawing: built from plates, like the Bailiff ----
  function draw(g, world, b, cam) {
    const plate = HA.boss.plate;
    const t = world.time;
    // the grates he's about to light, and the fire out of them
    for (const col of b.columns) {
      const x = Math.round(col.x - cam.x);
      const fl = Math.round(FLOOR - cam.y);
      if (col.t > col.burn) {
        if (Math.floor(t / 4) % 2) {
          g.fillStyle = 'rgba(255,240,168,0.55)';
          g.fillRect(x, fl - 1, col.w, 2);
        }
        g.fillStyle = 'rgba(255,155,61,0.12)';
        g.fillRect(x, fl - 64, col.w, 64);
      } else {
        for (let i = 0; i < col.w; i += 3) {
          const h = 40 + ((t * 3 + i * 11) % 24);
          g.fillStyle = (i + t) % 6 < 3 ? '#ff9b3d' : '#e8434f';
          g.fillRect(x + i, fl - h, 3, h);
          g.fillStyle = '#fff0a8';
          g.fillRect(x + i + 1, fl - h + 6, 1, h - 10);
        }
      }
    }
    for (const f of b.fires) {
      const x = Math.round(f.x - cam.x);
      const fl = Math.round(FLOOR - cam.y);
      for (let i = 0; i < f.w; i += 2) {
        const h = 2 + ((t + i * 5) % 5) * (f.life > 20 ? 1 : 0.4);
        g.fillStyle = (i + t) % 4 < 2 ? '#ff9b3d' : '#e8434f';
        g.fillRect(x + i, fl - h, 2, h);
      }
    }
    for (const c of b.coals) {
      const x = Math.round(c.x - cam.x);
      const y = Math.round(c.y - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x - 2, y - 2, 4, 4);
      g.fillStyle = Math.floor(t / 3) % 2 ? '#ff9b3d' : '#fff0a8';
      g.fillRect(x - 1, y - 1, 2, 2);
    }

    const white = b.flash > 0;
    const U1 = white ? '#ffffff' : '#2e2a3e';
    const U2 = white ? '#ffffff' : '#4a4060';
    const I1 = white ? '#ffffff' : '#3a4258';
    const I2 = white ? '#ffffff' : '#6c7894';
    const SKIN = white ? '#ffffff' : '#d8cfc0';
    const s = b.state;
    const down = s === 'down';
    const kneel = down ? 7 : 0;
    const step = Math.abs(b.vx) > 0.2 && Math.floor(b.t / 10) % 2 ? 1 : 0;
    g.save();
    g.translate(Math.round(b.x + b.w / 2 - cam.x), Math.round(b.y - cam.y));
    g.scale(b.facing || 1, 1);
    // legs, or a knee down
    if (!down) {
      plate(g, -6, 18, 5, 8 - step, U1, '#10121c', U2);
      plate(g, 1, 18, 5, 8 - (1 - step), U1, '#10121c', U2);
    } else plate(g, -7, 21, 14, 5, U1, '#10121c', U2);
    // body, and the riveted apron over it
    plate(g, -7, 6 + kneel, 14, 14, U2, '#10121c', U1);
    plate(g, -5, 8 + kneel, 10, 13, I1, '#10121c', I2);
    if (!white) {
      g.fillStyle = '#a9b6cc';
      for (let i = 0; i < 3; i++) g.fillRect(-3 + i * 3, 10 + kneel, 1, 1);
      // the Bloom, through the sleeve
      g.fillStyle = '#f27ad8';
      g.fillRect(-7, 10 + kneel, 2, 2);
      g.fillStyle = '#b04ad0';
      g.fillRect(-6, 13 + kneel, 1, 2);
    }
    // the head, bare and red with the heat, with the goggles: amber, flaring white on a wind-up
    plate(g, -4, -2 + kneel, 9, 9, SKIN, '#10121c');
    const tele = (s === 'rakeTele' || s === 'coalsTele' || s === 'draughtTele') && Math.floor(b.timer / 3) % 2 === 0;
    g.fillStyle = white ? '#ffffff' : tele ? '#ffffff' : '#ffb84d';
    g.fillRect(-2, 1 + kneel, 6, 2);
    if (!white) {
      g.fillStyle = '#10121c';
      g.fillRect(1, 1 + kneel, 1, 2);
      g.fillStyle = '#f27ad8';
      g.fillRect(-3, 4 + kneel, 1, 1);
    }
    // the rake, or the shovel, or the draught chain in his fists
    const tip = Math.floor(t / 3) % 2 ? '#ff9b3d' : '#fff0a8';
    if (s === 'rakeTele') {
      g.fillStyle = I2;
      g.fillRect(-20, 9, 22, 2);
      g.fillStyle = tele ? '#ffffff' : tip;
      g.fillRect(-22, 7, 3, 6);
    } else if (s === 'rake') {
      const out = Math.round(REACH * (1 - b.timer / 16));
      g.fillStyle = I2;
      g.fillRect(4, 22, out + 4, 2);
      g.fillStyle = tip;
      g.fillRect(6 + out, 19, 3, 7);
    } else if (s === 'coalsTele' || s === 'throw') {
      const raise = s === 'throw' ? -6 : 6;
      g.fillStyle = I2;
      g.fillRect(4, 10 + raise / 2, 10, 2);
      g.fillStyle = '#3a4258';
      g.fillRect(12, 8 + raise, 6, 4);
      if (s === 'coalsTele') {
        g.fillStyle = tip;
        g.fillRect(13, 7 + raise, 4, 2);
      }
    } else if (s === 'draughtTele' || s === 'haul') {
      const pull = s === 'haul' ? 4 : 0;
      g.fillStyle = '#6c7894';
      for (let y = -24; y < 8 + pull; y += 3) g.fillRect(8, y, 2, 2);
      plate(g, 6, 6 + pull, 5, 4, SKIN, '#10121c');
    } else {
      // standing, the rake grounded beside him
      g.fillStyle = I2;
      g.fillRect(7, -6 + kneel, 2, 32 - kneel);
      g.fillStyle = down ? '#3a1a10' : '#c96a2a';
      g.fillRect(5, 23, 6, 3);
    }
    g.restore();
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'THE FIREMAN', { name: '#ffb84d', fill: '#c96a2a', back: '#3a1a10', marks: [1 / 2] });

  HA.bosses.fireman = { MAX_HP, make, update, hurt, draw, drawBar, reset };
})(window.HA);
