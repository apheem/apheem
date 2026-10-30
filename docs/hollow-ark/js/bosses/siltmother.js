'use strict';
// The Silt Mother: a silt eel the Bloom has swollen to the length of her tank. She lives under the water and is
// fought from the gantries over it, and from foam. Only her head can be hurt, and only while it's out of the water.
//   Bite   her shadow and a boil of bubbles gather under the hero, then her head bursts up out of the water and
//          hangs there, open to fire, before she sinks back.
//   Spit   her head rises at one end of the tank and spits Bloom jellies.
//   Lash   her tail rises at one end, thrashing, then sweeps the whole water line. Jump it, or stand on a gate.
// At half health she tears the drain open and the tank empties. On the floor:
//   Charge her head lowers and rattles, then she drives along the floor end to end. Jump her, or get up high.
//            At the far end she rears up, open.
//   Strike she rears back over the hero and strikes down where they stood, and sticks there for a moment.
//   Spit   as before.
// Underwater she lunges at anyone who falls in. She vents shards every 15% of her health.
(function (HA) {
  const MAX_HP = 280;
  const HEAD_W = 18;
  const HEAD_H = 14;
  const STEP = Math.round(MAX_HP * 0.15);
  const SEGMENTS = 14; // body segments after the head, each a step further back along her path
  const GAP = 6; // path points between segments
  const plate = HA.boss.plate;

  function make(world, cx, feetY) {
    const b = {
      boss: true,
      type: 'siltMother',
      name: 'THE SILT MOTHER',
      x: cx - HEAD_W / 2,
      y: feetY - 30,
      w: HEAD_W,
      h: HEAD_H,
      vx: 0,
      vy: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      facing: -1,
      t: 0,
      flash: 0,
      dead: false,
      ghost: true,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      state: 'swim',
      timer: 90,
      phase: 1,
      nextShards: MAX_HP - STEP,
      shownHp: MAX_HP,
      surface: 10 * 8, // the top of the water while the tank is full
      floor: 19 * 8,
      x0: 13 * 8,
      x1: 67 * 8,
      next: 0,
      path: [],
      tail: null,
      drainRow: 10,
    };
    for (let i = 0; i < SEGMENTS * GAP; i++) b.path.push({ x: b.x + HEAD_W / 2 + i * 2, y: b.y + HEAD_H / 2 });
    return b;
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };
  const fast = (b, n) => Math.round(n * (b.phase === 2 ? 0.8 : 1));
  const head = (b) => ({ x: b.x + HEAD_W / 2, y: b.y + HEAD_H / 2 });
  const WATER_MOVES = ['bite', 'spit', 'bite', 'lash', 'bite', 'spit', 'lash'];
  const FLOOR_MOVES = ['charge', 'strike', 'spit', 'strike', 'charge'];

  // Steer the head toward a point at a top speed.
  function steer(b, x, y, speed) {
    const h = head(b);
    const dx = x - h.x;
    const dy = y - h.y;
    const d = Math.hypot(dx, dy);
    if (d < speed) {
      b.x = x - HEAD_W / 2;
      b.y = y - HEAD_H / 2;
      return true;
    }
    b.x += (dx / d) * speed;
    b.y += (dy / d) * speed;
    if (Math.abs(dx) > 0.5) b.facing = Math.sign(dx);
    return false;
  }

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    // the body follows the path the head has taken
    const h = head(b);
    b.path.unshift({ x: h.x, y: h.y });
    b.path.length = SEGMENTS * GAP;
    updateTail(world, b);
    if (!b.fighting || b.broken || world.scene) return;
    const p = world.player;
    const px = HA.clamp(p.x + p.w / 2, b.x0 + 12, b.x1 - 12);
    const dry = b.phase === 2 && b.state !== 'drain';
    b.timer--;
    b.ghost = !dry && h.y > b.surface + 4; // under the water, nothing can reach her
    switch (b.state) {
      case 'swim': {
        // circling deep, under the hero; lunging at anyone who has fallen in
        steer(b, px + Math.sin(b.t * 0.03) * 30, b.floor - 20 + Math.sin(b.t * 0.05) * 6, 1.4);
        if (p.wet && p.y > b.surface && !p.dead && b.timer < 40 && Math.abs(px - h.x) < 70) {
          set(b, 'lunge', 24);
          b.aim = { x: px, y: p.y + p.h / 2 };
          HA.audio.play('telegraph');
        } else if (b.timer <= 0) choose(world, b, px);
        break;
      }
      case 'lunge':
        if (b.timer > 10) break;
        steer(b, b.aim.x, b.aim.y, 3.4);
        if (b.timer <= 0) set(b, 'swim', 60);
        break;
      case 'rise': // her shadow and bubbles gather under the target
        steer(b, b.target, b.surface + 30, 2);
        if (world.time % 3 === 0) world.particles.push({ x: b.target + HA.rand(-10, 10), y: b.surface + HA.rand(4, 30), vx: 0, vy: -0.8, life: 24, max: 24, color: '#9fd8e8', size: 1, grav: 0 });
        if (b.timer <= 0) {
          set(b, 'bite', 12);
          HA.audio.play('roar');
          splash(world, b.target, b.surface);
        }
        break;
      case 'bite': // bursting up out of the water
        steer(b, b.target, b.surface - 36, 6);
        if (b.timer <= 0) set(b, 'hang', fast(b, 70));
        break;
      case 'hang':
        steer(b, b.target + Math.sin(b.t * 0.12) * 6, b.surface - 30 + Math.sin(b.t * 0.08) * 3, 1);
        if (b.timer <= 0) {
          set(b, 'dive', 20);
          splash(world, h.x, b.surface);
        }
        break;
      case 'dive':
        steer(b, h.x, b.floor - 20, 3);
        if (b.timer <= 0) set(b, 'swim', fast(b, 80));
        break;
      case 'spit': // up at one end of the tank, and out with the jellies
        steer(b, b.target, b.surface - (b.phase === 2 ? -40 : 14), 3);
        if (b.timer === fast(b, 40)) {
          const n = world.enemies.filter((e) => e.type === 'jelly' && !e.dead).length;
          for (let i = 0; i < Math.min(b.phase === 2 ? 3 : 2, 5 - n); i++) spawnJelly(world, b, i);
          HA.audio.play('spores');
        }
        if (b.timer <= 0) set(b, dry ? 'coil' : 'dive', dry ? 50 : 20);
        break;
      case 'lash':
        if (!b.tail) set(b, 'swim', fast(b, 70));
        else if (b.timer <= 0 && b.tail.state === 'rise') b.tail.state = 'sweep';
        break;
      case 'drain': {
        // she tears the drain open; the water goes, row by row
        steer(b, (b.x0 + b.x1) / 2 + Math.sin(b.t * 0.1) * 40, b.floor - 30, 2.5);
        if (b.timer % 8 === 0) drainRow(world, b);
        if (b.timer % 10 === 0) world.shake(1.5);
        if (b.drainRow > 18 && b.timer <= 0) {
          set(b, 'coil', 50);
          HA.audio.play('stomp');
        }
        break;
      }
      case 'coil': // on the floor, head up, watching
        steer(b, HA.clamp(px + (h.x < px ? -60 : 60), b.x0 + 16, b.x1 - 16), b.floor - 20, 1.2);
        if (b.timer <= 0) choose(world, b, px);
        break;
      case 'charge':
        if (b.timer > 30) {
          // the head lowers to the floor and rattles
          steer(b, b.from, b.floor - 8, 2);
          if (b.timer % 6 === 0) HA.audio.play('tink');
        } else if (steer(b, b.to, b.floor - 8, 3.2) || b.timer < -120) {
          set(b, 'rear', fast(b, 60));
          world.shake(2);
        }
        break;
      case 'rear': // up, open, after a charge or a strike
        steer(b, h.x, b.floor - 40 + Math.sin(b.t * 0.1) * 3, 1.5);
        if (b.timer <= 0) set(b, 'coil', fast(b, 50));
        break;
      case 'strike':
        if (b.timer > 16) steer(b, b.target - b.facing * 30, b.floor - 56, 1.8);
        else if (steer(b, b.target, b.floor - 8, 5) && b.timer <= 0) {
          set(b, 'rear', fast(b, 40));
          world.shake(3);
          HA.audio.play('stomp');
        }
        break;
    }
    // Her head bites whoever it touches, out of the water or in it.
    if (!p.dead && HA.overlap(b, p) && ['bite', 'hang', 'lunge', 'charge', 'strike', 'rear', 'spit'].includes(b.state)) world.hurtPlayer(3, h.x);
  }

  // The next move, in a fixed order with a little variety, aimed where the hero is now.
  function choose(world, b, px) {
    const list = b.phase === 2 ? FLOOR_MOVES : WATER_MOVES;
    const move = list[b.next++ % list.length];
    if (move === 'bite') {
      b.target = px;
      set(b, 'rise', fast(b, 55));
      HA.audio.play('swell');
    } else if (move === 'spit') {
      const left = px > (b.x0 + b.x1) / 2;
      b.target = left ? b.x0 + 24 : b.x1 - 24;
      set(b, 'spit', fast(b, 70));
    } else if (move === 'lash') {
      const left = Math.random() < 0.5;
      b.tail = { x: left ? b.x0 : b.x1 - 16, dir: left ? 1 : -1, y: b.surface - 12, w: 16, h: 14, state: 'rise', t: 0 };
      set(b, 'lash', fast(b, 50));
      HA.audio.play('telegraph');
    } else if (move === 'charge') {
      const fromLeft = px > (b.x0 + b.x1) / 2;
      b.from = fromLeft ? b.x0 + 12 : b.x1 - 12;
      b.to = fromLeft ? b.x1 - 12 : b.x0 + 12;
      set(b, 'charge', fast(b, 70));
      HA.audio.play('telegraph');
    } else if (move === 'strike') {
      b.target = px;
      b.facing = Math.sign(px - head(b).x) || 1;
      set(b, 'strike', fast(b, 50));
      HA.audio.play('telegraph');
    }
  }

  // The tail: rising and thrashing at one end, then sweeping the water line to the other. Foam it meets breaks up.
  function updateTail(world, b) {
    const tl = b.tail;
    if (!tl) return;
    tl.t++;
    if (tl.state === 'rise') {
      if (world.time % 4 === 0) splash(world, tl.x + 8, b.surface, 3);
      return;
    }
    tl.x += tl.dir * 3;
    const room = world.room;
    for (const pl of world.foam || []) {
      if (pl.cells.some((c) => Math.abs(c.tx * 8 + 4 - (tl.x + 8)) < 10)) pl.life = Math.min(pl.life, 1);
    }
    const p = world.player;
    if (!p.dead && HA.overlap(tl, p)) world.hurtPlayer(2, tl.x + 8);
    if (world.time % 3 === 0) splash(world, tl.x + 8, b.surface, 2);
    if (tl.x < b.x0 - 16 || tl.x > b.x1) {
      b.tail = null;
      if (b.state === 'lash') set(b, 'swim', fast(b, 60));
    }
    void room;
  }

  function splash(world, x, y, n = 10) {
    world.burst(x, y, ['#6fd0b8', '#d8f4ff', '#2a6a64'], n, 1.8);
  }

  function spawnJelly(world, b, i) {
    const h = head(b);
    const e = HA.actors.makeEnemy({ type: 'i', tx: Math.floor(h.x / 8), ty: Math.floor(h.y / 8), x: h.x - 4 + i * 6, y: h.y - 16, respawn: -1 });
    e.vy = -1.2;
    e.vx = (i - 1) * 0.6;
    world.enemies.push(e);
  }

  // One row of the tank's water drains away (and any foam floating on it goes too).
  function drainRow(world, b) {
    const room = world.room;
    const ty = b.drainRow;
    if (ty > 18) return;
    for (let tx = 13; tx <= 66; tx++) {
      const t = room.tile(tx, ty);
      if (t === HA.room.WATER || t === HA.room.FOAM) room.set(tx, ty, HA.room.EMPTY);
    }
    for (const pl of world.foam || []) if (pl.cells.some((c) => c.ty <= ty)) pl.life = Math.min(pl.life, 1);
    b.drainRow++;
    b.surface = b.drainRow * 8;
    HA.audio.play('rumble');
  }

  // The gantries over the water (the row above it) come down when she tears the drain open: the rest is on the floor.
  function dropGantries(world, b) {
    const room = world.room;
    const ty = b.surface / 8 - 1;
    for (let tx = 13; tx <= 66; tx++) {
      if (room.tile(tx, ty) !== HA.room.ONEWAY) continue;
      room.set(tx, ty, HA.room.EMPTY);
      world.burst(tx * 8 + 4, ty * 8 + 2, ['#6c7894', '#a9b6cc', '#46291a'], 3, 1.6);
    }
    HA.audio.play('stomp');
  }

  function damage(world, b, dmg) {
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 6;
    HA.boss.vent(world, b, STEP);
    if (b.phase === 1 && b.hp <= MAX_HP / 2) {
      b.phase = 2;
      b.tail = null;
      set(b, 'drain', 90);
      dropGantries(world, b);
      world.flash('#6fd0b8', 5);
      HA.audio.play('roar');
      HA.music.setLayers(2);
      world.toast('SHE TORE THE DRAIN OPEN', 150);
    }
    if (b.hp <= 0) {
      b.fighting = false;
      b.tail = null;
      for (const e of world.enemies) if (e.type === 'jelly' && e.spawn.respawn === -1) e.dead = true;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  function hurt(world, b, dmg, dir) {
    if (!b.fighting || b.broken || b.hp <= 0 || b.ghost || b.state === 'drain') return;
    world.burst(head(b).x, head(b).y, ['#6fd0b8', '#ffffff', '#f27ad8'], 3, 1.2);
    HA.audio.play('bossHit');
    damage(world, b, dmg);
    void dir;
  }

  // ---- Drawing: segments from the tail up to the head, dimmed where they're under the water ----
  function draw(g, world, b, cam) {
    const white = b.flash > 0;
    const under = (y) => y > b.surface + 2;
    for (let i = SEGMENTS - 1; i >= 0; i--) {
      const pt = b.path[Math.min(b.path.length - 1, (i + 1) * GAP)];
      const r = Math.round(7 - i * 0.3);
      const x = Math.round(pt.x - cam.x);
      const y = Math.round(pt.y - cam.y);
      g.globalAlpha = under(pt.y) && !b.broken ? 0.45 : 1;
      g.fillStyle = '#10121c';
      g.fillRect(x - r - 1, y - r, r * 2 + 2, r * 2);
      g.fillStyle = white ? '#ffffff' : i % 2 ? '#2a4a3a' : '#33573f';
      g.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2);
      g.fillStyle = white ? '#ffffff' : '#4a6a4a';
      g.fillRect(x - r, y - r + 1, r * 2, 1);
      if (i % 3 === 1) {
        g.fillStyle = '#f27ad8';
        g.fillRect(x - 1, y - 2, 2, 2);
      }
    }
    g.globalAlpha = 1;
    const h = head(b);
    const hx = Math.round(b.x - cam.x);
    const hy = Math.round(b.y - cam.y);
    g.globalAlpha = b.ghost && !b.broken ? 0.5 : 1;
    plate(g, hx, hy, HEAD_W, HEAD_H, white ? '#ffffff' : '#2f5240', '#10121c', white ? '#ffffff' : '#4a7a5a');
    // her jaw, open when she bites, spits or rears
    const open = ['bite', 'hang', 'spit', 'rear', 'strike', 'lunge'].includes(b.state) && !b.broken;
    const fx = b.facing > 0 ? hx + HEAD_W - 6 : hx;
    g.fillStyle = '#10121c';
    g.fillRect(fx, hy + (open ? 6 : 8), 6, open ? 6 : 2);
    if (open) {
      g.fillStyle = '#f27ad8';
      g.fillRect(fx + 1, hy + 8, 4, 3);
      g.fillStyle = '#eef4f6';
      for (let i = 0; i < 3; i++) g.fillRect(fx + i * 2, hy + 6, 1, 2);
    }
    // eyes, and the Bloom growths on her crown
    g.fillStyle = b.broken ? '#3a4258' : '#ffd84d';
    g.fillRect(b.facing > 0 ? hx + HEAD_W - 8 : hx + 6, hy + 3, 2, 2);
    g.fillStyle = '#f27ad8';
    g.fillRect(hx + 4, hy - 2, 3, 2);
    g.fillRect(hx + 9, hy - 3, 2, 3);
    g.fillStyle = '#b04ad0';
    g.fillRect(hx + 12, hy - 1, 3, 1);
    g.globalAlpha = 1;
    // her shadow under the surface where she's about to bite
    if (b.state === 'rise') {
      const sx = Math.round(b.target - cam.x);
      const sy = Math.round(b.surface - cam.y);
      g.fillStyle = 'rgba(5,6,13,0.55)';
      g.fillRect(sx - 14, sy + 2, 28, 3);
      if (Math.floor(b.timer / 5) % 2) {
        g.fillStyle = '#d8f4ff';
        g.fillRect(sx - 6, sy, 2, 1);
        g.fillRect(sx + 4, sy - 1, 2, 1);
      }
    }
    // the tail fin
    const tl = b.tail;
    if (tl) {
      const tx = Math.round(tl.x - cam.x);
      const ty = Math.round(tl.y - cam.y + (tl.state === 'rise' ? Math.sin(tl.t * 0.5) * 3 : 0));
      g.fillStyle = '#10121c';
      g.fillRect(tx, ty, tl.w, tl.h);
      g.fillStyle = white ? '#ffffff' : '#33573f';
      g.fillRect(tx + 1, ty + 1, tl.w - 2, tl.h - 2);
      g.fillStyle = '#4a7a5a';
      for (let i = 2; i < tl.w - 2; i += 3) g.fillRect(tx + i, ty + 1, 1, tl.h - 3);
    }
    void h;
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'THE SILT MOTHER', { name: '#6fd0b8', fill: '#2f8a74', back: '#123a32', marks: [1 / 2] });

  HA.bosses.siltMother = { MAX_HP, make, update, hurt, draw, drawBar };
})(window.HA);
