'use strict';
// Weapons level up from energy shards and lose XP when the hero is hit.
// Per the brief's fixes: one hit drops at most one level, and a short window after a drop protects XP.
(function (HA) {
  const DEFS = {
    pistol: {
      name: 'RIVET PISTOL',
      caps: [8, 18, 30],
      levels: [
        { cd: 9, speed: 4.2, range: 90, dmg: 2, pierce: 0, len: 4, twin: false },
        { cd: 8, speed: 5, range: 130, dmg: 3, pierce: 1, len: 6, twin: false },
        { cd: 8, speed: 5.5, range: 165, dmg: 3, pierce: 2, len: 6, twin: true },
      ],
    },
    // Solder's upgrade of the pistol (choice 5): twin bolts from level 1, piercing from level 2, twice the rate at 3.
    repeater: {
      name: 'RIVET REPEATER',
      caps: [8, 18, 30],
      levels: [
        { cd: 9, speed: 4.6, range: 110, dmg: 2, pierce: 0, len: 4, twin: true },
        { cd: 8, speed: 5.2, range: 140, dmg: 3, pierce: 1, len: 6, twin: true },
        { cd: 4, speed: 5.6, range: 170, dmg: 3, pierce: 2, len: 6, twin: true },
      ],
    },
    cannon: {
      name: 'PURGE CANNON',
      caps: [10, 22, 36],
      ammoMax: 40,
      // lift = the fall speed each downward shot caps the hero at (negative climbs)
      levels: [
        { cd: 8, pellets: 1, speed: 4.6, range: 70, dmg: 1, lift: 0.9 },
        { cd: 6, pellets: 2, speed: 4.8, range: 85, dmg: 1, lift: -0.55 },
        { cd: 4, pellets: 2, speed: 5, range: 100, dmg: 2, lift: -2.2 },
      ],
    },
    coil: {
      name: 'ARC COIL',
      caps: [12, 26, 40],
      keepsXp: true,
      levels: [
        { charge: 40, len: 96, dmg: 4, chain: 0, pierce: false },
        { charge: 34, len: 140, dmg: 5, chain: 1, pierce: false },
        { charge: 28, len: 220, dmg: 6, chain: 2, pierce: true },
      ],
    },
    // Grenades lobbed in an arc that bounce, then roll along floors and off ledges and down stairs until the
    // fuse runs out or they meet something on the ground. Weak against flyers (half damage).
    scatter: {
      name: 'SCATTER LAUNCHER',
      caps: [10, 22, 36],
      // Finishing the Pruner (choice 2) keeps it at level 2 or better for good.
      floor: (world) => (world.state.wardens.pruner === 'salvage' ? 2 : 1),
      levels: [
        { cd: 26, n: 1, speed: 2.4, dmg: 4, blast: 15, fuse: 90 },
        { cd: 22, n: 2, speed: 2.6, dmg: 5, blast: 17, fuse: 90 },
        { cd: 18, n: 3, speed: 2.8, dmg: 6, blast: 20, fuse: 90 },
      ],
    },
    // Wick's own blades, thrown in a fan. At level 3 every sixth hit stitches the hero up a little.
    lancets: {
      name: "WICK'S LANCETS",
      caps: [10, 22, 36],
      levels: [
        { cd: 14, n: 2, spread: 0.13, speed: 4.6, range: 110, dmg: 2 },
        { cd: 12, n: 3, spread: 0.14, speed: 5, range: 130, dmg: 2 },
        { cd: 10, n: 3, spread: 0.12, speed: 5.4, range: 150, dmg: 3, heal: 6 },
      ],
    },
    // The Gardener's gift: a thorn lance that hits very hard, harder the more Bloom is in the hero.
    thorn: {
      name: 'BLOOM THORN',
      caps: [12, 26, 40],
      levels: [
        { cd: 22, dmg: 8, len: 34, speed: 6 },
        { cd: 20, dmg: 10, len: 42, speed: 6.5 },
        { cd: 18, dmg: 12, len: 50, speed: 7 },
      ],
    },
  };
  const XP_LOSS = 4;
  const XP_LOCK = 150;

  function make(id) {
    return { id, level: 1, xp: 0, ammo: DEFS[id].ammoMax || 0 };
  }

  const cap = (w) => DEFS[w.id].caps[w.level - 1];
  const isMax = (w) => w.level === 3 && w.xp >= cap(w);

  function addXp(world, amount) {
    const p = world.player;
    const w = p.weapons[p.wi];
    if (!w || isMax(w)) return;
    w.xp += amount;
    if (w.xp >= cap(w)) {
      if (w.level < 3) {
        w.xp -= cap(w);
        w.level += 1;
        w.xp = Math.min(w.xp, cap(w) - 1);
        world.floatText(p.x + 4, p.y - 6, 'LEVEL UP!', '#fff0a8');
        world.burst(p.x + 4, p.y + 7, ['#fff0a8', '#ffb84d'], 14, 1.8);
        HA.audio.play('levelUp');
      } else {
        w.xp = cap(w);
        world.floatText(p.x + 4, p.y - 6, 'MAX', '#fff0a8');
      }
    }
  }

  function loseXp(world) {
    const p = world.player;
    const w = p.weapons[p.wi];
    if (!w) return;
    if (DEFS[w.id].keepsXp || p.xpLock > 0 || world.assist.noXpLoss) return;
    const floor = DEFS[w.id].floor ? DEFS[w.id].floor(world) : 1;
    if (w.xp >= XP_LOSS) {
      w.xp -= XP_LOSS;
    } else if (w.level > floor) {
      const rest = XP_LOSS - w.xp;
      w.level -= 1;
      w.xp = Math.max(1, cap(w) - rest);
      p.xpLock = XP_LOCK;
      world.floatText(p.x + 4, p.y - 6, 'LEVEL DOWN', '#ff8a8a');
      HA.audio.play('levelDown');
    } else {
      w.xp = 0;
    }
  }

  // Where shots leave the gun, by aim, relative to the hero's body.
  function muzzle(p) {
    const cx = p.x + p.w / 2;
    if (p.aim === 'up') return { x: cx + p.facing, y: p.y - 4, dx: 0, dy: -1 };
    if (p.aim === 'down') return { x: cx + p.facing, y: p.y + p.h + 4, dx: 0, dy: 1 };
    return { x: cx + p.facing * 9, y: p.y + 8, dx: p.facing, dy: 0 };
  }

  // Fire handling, called from the hero's update. fire = { held, pressed, released }.
  function update(world, fire) {
    const p = world.player;
    const w = p.weapons[p.wi];
    if (!w) return; // the hero wakes unarmed
    const def = DEFS[w.id];
    const L = def.levels[w.level - 1];
    if (p.cooldown > 0) p.cooldown--;

    if (w.id === 'pistol' || w.id === 'repeater') {
      if (p.cooldown <= 0 && (fire.pressed || fire.held)) {
        firePistol(world, L, w.level);
        p.cooldown = fire.pressed ? L.cd : Math.round(L.cd * 1.6);
      }
    } else if (w.id === 'cannon') {
      if (fire.held || fire.pressed) {
        p.rechargeWait = 20;
        if (p.cooldown <= 0) {
          if (w.ammo > 0) {
            w.ammo--;
            fireCannon(world, L, w.level);
            p.cooldown = L.cd;
          } else if (fire.pressed) {
            HA.audio.play('empty');
          }
        }
      }
    } else if (w.id === 'scatter' || w.id === 'lancets' || w.id === 'thorn') {
      if (p.cooldown <= 0 && (fire.pressed || fire.held)) {
        ({ scatter: fireScatter, lancets: fireLancets, thorn: fireThorn })[w.id](world, L, w.level);
        p.cooldown = fire.pressed ? L.cd : Math.round(L.cd * 1.3);
      }
    } else if (w.id === 'coil') {
      if (fire.held) {
        const before = p.charge;
        p.charge = Math.min(p.charge + 1, L.charge);
        if (p.charge === L.charge && before < L.charge) HA.audio.play('coilReady');
        if (p.charge > 6 && world.time % 3 === 0) {
          const m = muzzle(p);
          const a = Math.random() * Math.PI * 2;
          const r = 10 - (p.charge / L.charge) * 6;
          world.particles.push({ x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, vx: -Math.cos(a) * 0.5, vy: -Math.sin(a) * 0.5, life: 10, max: 10, color: p.charge === L.charge ? '#ffffff' : '#5fd4e8', size: 1 });
        }
      } else if (fire.released || (p.charge > 0 && !fire.held)) {
        if (p.charge >= L.charge) fireBeam(world, L, w.level, L.len, L.dmg);
        else if (p.charge >= 0) fireBeam(world, { chain: 0, pierce: false }, 0, 30, 1);
        p.charge = 0;
      }
    }
    // The charge hum follows the weapon in hand every frame, so a switch or a pickup mid-charge silences it.
    if (w.id !== 'coil') p.charge = 0;
    HA.audio.charge(w.id === 'coil' && p.charge > 0 ? p.charge / L.charge : 0);

    // Purge Cannon ammo refills when not firing, faster on the ground.
    for (const other of p.weapons) {
      if (other.id !== 'cannon') continue;
      if (p.rechargeWait > 0) p.rechargeWait--;
      else if (other.ammo < DEFS.cannon.ammoMax && world.time % (p.onGround ? 2 : 6) === 0) other.ammo++;
    }
  }

  function firePistol(world, L, level) {
    const p = world.player;
    const m = muzzle(p);
    const offsets = L.twin ? [-2, 2] : [0];
    for (const off of offsets) {
      world.shots.push({
        owner: 'player',
        kind: 'bolt',
        level,
        x: m.x + (m.dy ? off : 0),
        y: m.y + (m.dx ? off : 0),
        vx: m.dx * L.speed,
        vy: m.dy * L.speed,
        len: L.len,
        life: Math.round(L.range / L.speed),
        dmg: L.dmg,
        pierce: L.pierce,
        hits: new Set(),
      });
    }
    world.muzzleFlash(m.x, m.y, level);
    HA.audio.play('pistol', level);
  }

  function fireCannon(world, L, level) {
    const p = world.player;
    const m = muzzle(p);
    for (let i = 0; i < L.pellets; i++) {
      const spread = (Math.random() - 0.5) * 0.3;
      const ang = Math.atan2(m.dy, m.dx) + spread;
      world.shots.push({
        owner: 'player',
        kind: 'pellet',
        level,
        x: m.x,
        y: m.y,
        vx: Math.cos(ang) * L.speed,
        vy: Math.sin(ang) * L.speed,
        life: Math.round(L.range / L.speed),
        dmg: L.dmg,
        pierce: 0,
        hits: new Set(),
      });
    }
    // Recoil: firing down in the air slows a fall (L1), holds a hover (L2) or climbs (L3).
    if (p.aim === 'down' && !p.onGround) {
      p.vy = Math.min(p.vy, L.lift);
      p.jumping = false;
      world.burst(m.x, m.y + 2, ['#ffb84d', '#fff0a8', '#9fb6c8'], 2, 1.2, 1);
    } else if (p.aim === 'fwd') {
      p.vx -= p.facing * (p.onGround ? 0.12 : 0.22);
    }
    world.muzzleFlash(m.x, m.y, level);
    world.shake(0.6);
    HA.audio.play('cannon', level);
  }

  // Grenades leave in a lob: forward, higher when aimed up, dropped when aimed down in the air.
  function fireScatter(world, L, level) {
    const p = world.player;
    const m = muzzle(p);
    for (let i = 0; i < L.n; i++) {
      const spread = (i - (L.n - 1) / 2) * 0.55;
      let vx = p.facing * (L.speed + spread * p.facing) + p.vx * 0.4;
      let vy = -2.1 - Math.abs(spread) * 0.3;
      if (p.aim === 'up') {
        vx *= 0.45;
        vy = -3.6;
      } else if (p.aim === 'down') {
        vx = p.facing * 0.6 + spread * 0.4;
        vy = 1;
      }
      world.shots.push({ owner: 'player', kind: 'grenade', level, x: m.x, y: m.y, w: 4, h: 4, vx, vy, life: L.fuse + i * 4, dmg: L.dmg, blast: L.blast, pierce: 0, hits: new Set(), t: 0 });
    }
    world.muzzleFlash(m.x, m.y, 1);
    HA.audio.play('lob', level);
  }

  function fireLancets(world, L, level) {
    const p = world.player;
    const m = muzzle(p);
    const base = Math.atan2(m.dy, m.dx);
    for (let i = 0; i < L.n; i++) {
      const a = base + (i - (L.n - 1) / 2) * L.spread;
      world.shots.push({ owner: 'player', kind: 'lancet', level, x: m.x, y: m.y, vx: Math.cos(a) * L.speed, vy: Math.sin(a) * L.speed, life: Math.round(L.range / L.speed), dmg: L.dmg, pierce: 0, heal: L.heal, hits: new Set() });
    }
    HA.audio.play('lancet', level);
  }

  function fireThorn(world, L, level) {
    const p = world.player;
    const m = muzzle(p);
    const dmg = L.dmg + world.state.bloom;
    world.shots.push({ owner: 'player', kind: 'thorn', level, x: m.x, y: m.y, vx: m.dx * L.speed, vy: m.dy * L.speed, life: Math.round(L.len / L.speed), dmg, pierce: 99, hits: new Set() });
    world.shake(1);
    HA.audio.play('thorn', level);
  }

  // A grenade bursts: everything near takes the blast, flyers half of it, and crates break.
  function explode(world, s) {
    s.life = 0;
    const r = s.blast;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x + e.w / 2 - s.x, e.y + e.h / 2 - s.y);
      if (d > r + Math.max(e.w, e.h) / 2) continue;
      const flyer = e.type === 'drifter' || e.type === 'warden';
      world.hurtEnemy(e, flyer ? Math.ceil(s.dmg / 2) : s.dmg, HA.sign(e.x + e.w / 2 - s.x));
    }
    for (let ty = Math.floor((s.y - r) / 8); ty <= Math.floor((s.y + r) / 8); ty++) {
      for (let tx = Math.floor((s.x - r) / 8); tx <= Math.floor((s.x + r) / 8); tx++) {
        if (world.room.tile(tx, ty) === HA.room.CRATE && Math.hypot(tx * 8 + 4 - s.x, ty * 8 + 4 - s.y) < r + 4) world.damageCrate(tx, ty, 3);
      }
    }
    world.burst(s.x, s.y, ['#ffb84d', '#fff0a8', '#ff9b3d', '#9fb6c8'], 18, 2.2);
    world.flashes.push({ x: s.x, y: s.y, life: 3, r: 4 });
    world.shake(2);
    HA.audio.play('blast');
  }

  // Grenades fall, bounce off walls, and roll along floors (and off them) until they go off.
  function updateGrenade(world, s) {
    s.t++;
    s.life--;
    s.vy = Math.min(s.vy + 0.2, 4);
    const body = { x: s.x - 2, y: s.y - 2, w: 4, h: 4 };
    const hit = HA.room.move(world.room, body, s.vx, s.vy);
    s.x = body.x + 2;
    s.y = body.y + 2;
    if (hit.left || hit.right) s.vx = -s.vx * 0.55;
    if (hit.up) s.vy = Math.abs(s.vy) * 0.3;
    if (hit.down) {
      if (s.vy > 1.2) HA.audio.play('tink');
      s.vy = s.vy > 1.2 ? -s.vy * 0.35 : 0;
      s.vx *= s.vy === 0 ? 0.99 : 0.8;
      if (Math.abs(s.vx) < 0.35 && s.vy === 0) s.vx = HA.sign(s.vx || 1) * 0.35; // it keeps rolling
    }
    for (const e of world.enemies) {
      if (!e.dead && HA.overlap(body, e) && s.t > 4) return explode(world, s);
    }
    if (s.life <= 0) explode(world, s);
  }

  // The Arc Coil is a hitscan beam: it travels until it meets a wall (or an enemy, below level 3).
  function fireBeam(world, L, level, len, dmg) {
    const p = world.player;
    const m = muzzle(p);
    const hitList = [];
    let x = m.x;
    let y = m.y;
    let traveled = 0;
    const thick = level ? 3 : 2;
    let stopped = false;
    while (traveled < len && !stopped) {
      x += m.dx * 2;
      y += m.dy * 2;
      traveled += 2;
      const tx = Math.floor(x / 8);
      const ty = Math.floor(y / 8);
      const t = world.room.tile(tx, ty);
      if (t === HA.room.CRATE) {
        world.damageCrate(tx, ty, dmg);
        break;
      }
      if (t === HA.room.SOLID) {
        world.burst(x, y, ['#b8f4ff', '#5fd4e8'], 5, 1.4);
        break;
      }
      const probe = { x: x - thick, y: y - thick, w: thick * 2, h: thick * 2 };
      for (const e of world.enemies) {
        if (e.dead || hitList.includes(e) || !HA.overlap(probe, e)) continue;
        hitList.push(e);
        if (!L.pierce) stopped = true;
      }
      for (const s of world.shots) if (s.owner === 'enemy' && HA.overlap(probe, { x: s.x - 3, y: s.y - 3, w: 6, h: 6 })) s.life = 0;
    }
    world.beams.push({ x0: m.x, y0: m.y, x1: x, y1: y, life: level ? 12 : 6, level });
    for (const e of hitList) world.hurtEnemy(e, dmg, m.dx || p.facing);
    // Chain lightning jumps from the last enemy hit to the nearest others.
    let from = hitList[hitList.length - 1];
    const chained = new Set(hitList);
    for (let i = 0; i < (L.chain || 0) && from; i++) {
      let best = null;
      let bestD = 64;
      for (const e of world.enemies) {
        if (e.dead || chained.has(e)) continue;
        const d = Math.hypot(e.x + e.w / 2 - (from.x + from.w / 2), e.y + e.h / 2 - (from.y + from.h / 2));
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      chained.add(best);
      world.beams.push({ x0: from.x + from.w / 2, y0: from.y + from.h / 2, x1: best.x + best.w / 2, y1: best.y + best.h / 2, life: 12, level });
      world.hurtEnemy(best, Math.ceil(dmg * 0.6), HA.sign(best.x - from.x));
      from = best;
    }
    world.muzzleFlash(m.x, m.y, level || 1);
    if (level) world.shake(1.5 + level * 0.5);
    HA.audio.play(level ? 'coilBeam' : 'coilSpark', level);
  }

  // Move every shot and resolve hits against walls, crates, enemies and the hero.
  function updateShots(world) {
    const room = world.room;
    for (const s of world.shots) {
      if (s.delay > 0) {
        s.delay--;
        continue;
      }
      if (s.kind === 'wave') {
        updateWave(world, s);
        continue;
      }
      if (s.kind === 'grenade') {
        updateGrenade(world, s);
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      const tx = Math.floor(s.x / 8);
      const ty = Math.floor(s.y / 8);
      const t = room.tile(tx, ty);
      if (t === HA.room.CRATE && s.owner === 'player') {
        world.damageCrate(tx, ty, s.dmg);
        s.life = 0;
      } else if (t === HA.room.SOLID || t === HA.room.CRATE) {
        s.life = 0;
        world.burst(s.x - s.vx * 0.5, s.y - s.vy * 0.5, s.owner === 'enemy' ? ['#ff8a8a'] : ['#fff0a8', '#b8f4ff'], 3, 1);
        if (s.owner === 'player' && s.kind === 'bolt') HA.audio.play('wall');
      }
      if (s.life <= 0) continue;
      if (s.owner === 'player') {
        const box = { x: s.x - 2, y: s.y - 2, w: 4, h: 4 };
        for (const e of world.enemies) {
          if (e.dead || s.hits.has(e) || !HA.overlap(box, e)) continue;
          s.hits.add(e);
          world.hurtEnemy(e, s.dmg, HA.sign(s.vx || 0.01));
          if (s.heal) lancetHeal(world);
          if (s.pierce > 0) s.pierce--;
          else {
            s.life = 0;
            break;
          }
        }
        // Player shots knock enemy orbs out of the air.
        for (const o of world.shots) {
          if (o.owner === 'enemy' && o.life > 0 && Math.abs(o.x - s.x) < 5 && Math.abs(o.y - s.y) < 5) {
            o.life = 0;
            s.life = 0;
            world.burst(o.x, o.y, ['#ff8a8a', '#ffffff'], 6, 1.2);
          }
        }
      } else if (HA.overlap({ x: s.x - 3, y: s.y - 3, w: 6, h: 6 }, world.player)) {
        world.hurtPlayer(s.dmg || 2, s.x);
        s.life = 0;
      }
    }
    world.shots = world.shots.filter((s) => s.life > 0);
  }

  // Wick's Lancets at level 3: every sixth hit heals the hero by one.
  function lancetHeal(world) {
    const p = world.player;
    p.lancetHits = (p.lancetHits || 0) + 1;
    if (p.lancetHits % 6 || p.hp >= p.maxHp) return;
    p.hp++;
    world.floatText(p.x + 4, p.y - 6, '+1', '#7ad1a0');
    HA.audio.play('heart');
  }

  // A shockwave runs along the floor until it meets a wall or an edge. Jump over it.
  function updateWave(world, s) {
    const room = world.room;
    s.x += s.vx;
    s.life--;
    const ahead = room.tile(Math.floor((s.x + Math.sign(s.vx) * 3) / 8), Math.floor((s.y - 4) / 8));
    const below = room.tile(Math.floor(s.x / 8), Math.floor((s.y + 2) / 8));
    if (ahead === HA.room.SOLID || ahead === HA.room.CRATE || below === HA.room.EMPTY || below === HA.room.THORNS) s.life = 0;
    if (s.life > 0 && world.time % 3 === 0) world.particles.push({ x: s.x, y: s.y - 1, vx: -s.vx * 0.2, vy: -0.6, life: 10, max: 10, color: '#ffb84d', size: 1, grav: 0.05 });
    if (s.life > 0 && HA.overlap({ x: s.x - 3, y: s.y - s.h, w: 6, h: s.h }, world.player)) {
      world.hurtPlayer(s.dmg, s.x);
      s.life = 0;
    }
  }

  HA.weapons = { DEFS, make, cap, isMax, addXp, loseXp, update, updateShots, muzzle };
})(window.HA);
