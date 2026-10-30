'use strict';
// Steward Ivo Marrant, at the Helm. An old man who holds the Helm Key, and who isn't a monster, which is what makes
// him dangerous. Three phases, each a third of his bar:
//   The Key    he stands at the helm behind the Key's field (nothing gets through it) and gives orders: the
//              ceiling turrets fire on his word, and the gates drop and lift. The Key draws on three relays,
//              one high on the west wall, one in the ceiling over the high catwalk, one low on the face of his
//              dais. Break all three and the field fails.
//   The guard  "MEASURE: FULL." He doses his honour guard, who come up the stair without their shields, and he
//              lectures while the hero fights them.
//   The man    he comes down off the dais with the captain's sidearm: from cover behind the consoles he rises,
//              paints the hero with the sidearm's sight, and fires. Close in, he rolls away. Above him, he fans.
// The fight has a checkpoint at its start (see story/tower.js).
(function (HA) {
  const FLOOR = 19 * 8;
  const DAIS = 17 * 8; // the dais's top, and the consoles'
  const RELAY_HP = 40;
  const GUARD_HP = 24;
  const MAN_HP = 120;
  const MAX_HP = RELAY_HP * 3 + GUARD_HP * 3 + MAN_HP;
  const STEP = Math.round(MAX_HP * 0.12);
  // Where the relays sit, and the turrets and gates the Key commands.
  const RELAYS = [
    { x: 16, y: 88, w: 10, h: 14 },
    { x: 282, y: 16, w: 14, h: 10 },
    { x: 484, y: 136, w: 10, h: 14 },
  ];
  const TURRETS = [20, 50];
  const GATES = [
    { tx: 36, top: 10 },
    { tx: 59, top: 14 },
  ];
  // Cover: each console, with the spot to crouch on either side of it.
  const COVER = [
    { x0: 24 * 8, x1: 27 * 8 },
    { x0: 44 * 8, x1: 47 * 8 },
  ];
  const ORDERS = ['COUNT HIM.', 'SHUT.', 'AGAIN.', 'OPEN. COUNT HIM.', 'SHUT.', 'COUNT HIM. BOTH.'];

  // ---- His sprite, painted from rows: white hair, his uniform coat, the Key's chain, and a dead man's boots ----
  const COLORS = { 0: '#10121c', W: '#e8e8ec', h: '#e2d4c0', H: '#b8a890', u: '#2e2a3e', U: '#4a4060', y: '#ffd88a', b: '#5a4028', B: '#7a5a3a', k: '#3a4258' };
  const BODY = ['....0000....', '...0WWWW0...', '..0WWhhWW0..', '..0Whhhhh0..', '..0hh0hh0h..', '..0hhhhhh0..', '...0hWWh0...', '..00uyyu00..', '.0uuuyuuuu0.', '0uUuuyuuuUu0', '0uUuuyyuuUu0', '0uUuuuuuuUu0', '0hUuuuuuuUh0', '.0Uuuuuuuu0.', '.0uuuuuuuu0.', '.0uuu00uuu0.'];
  const LEGS = ['..0uu00uu0..', '..0uu00uu0..', '..0bb00bb0..', '..0bB00bB0..', '.0bbb00bbb0.', '.00000000000'];
  const RUN = ['..0uu0.0uu0.', '.0uu0...0uu0', '.0bb0...0bb0', '.0bB0...0bB0', '0bbb0...0bbb', '00000...0000'];
  const CROUCH = ['.0uuuu0uuu0.', '0bbbb00bbbb0', '000000000000'];
  function paint(rows) {
    const img = HA.art.canvas(rows[0].length, rows.length);
    const c = img.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;
        c.fillStyle = COLORS[row[x]];
        c.fillRect(x, y, 1, 1);
      }
    });
    return { img, white: HA.art.tinted(img, '#ffffff'), w: img.width, h: img.height };
  }
  let SPR = null;
  const sprites = () =>
    SPR ||
    (SPR = {
      stand: paint(BODY.concat(LEGS)),
      run: paint(BODY.concat(RUN)),
      crouch: paint(BODY.slice(0, 13).concat(CROUCH)),
      kneel: paint(BODY.slice(0, 14).concat(['0bbbbbbbbbb0', '000000000000'])),
    });

  function make(world, cx, feetY) {
    const b = {
      boss: true,
      type: 'steward',
      name: 'STEWARD MARRANT',
      x: cx - 5,
      y: feetY - 22,
      w: 10,
      h: 22,
      vx: 0,
      vy: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      shownHp: MAX_HP,
      facing: -1,
      t: 0,
      flash: 0,
      field: 0,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      phase: 1,
      state: 'idle',
      timer: 0,
      order: 0,
      nextShards: MAX_HP - STEP,
      manHp: MAN_HP,
      relays: [],
      turrets: [],
      guards: [],
      gates: GATES.map((gt) => Object.assign({ shut: 0 }, gt)),
      helmX: cx,
      sight: null,
    };
    for (const r of RELAYS) {
      const relay = Object.assign({ boss: true, type: 'relay', parent: b, hp: RELAY_HP, flash: 0, dead: false, spawn: { respawn: -1 }, t: 0 }, r);
      b.relays.push(relay);
      world.enemies.push(relay);
    }
    for (const tx of TURRETS) {
      const t = HA.actors.makeEnemy({ type: '7', x: tx * 8, y: 16, tx, ty: 2, respawn: -1 });
      Object.assign(t, { held: true, hp: 14 });
      b.turrets.push(t);
      world.enemies.push(t);
    }
    return b;
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };
  const bark = (world, b, text, frames) => HA.story.bark(world, b, text, frames || 110);

  // What's left of him, phase by phase: the relays, then his guard, then the man.
  function remaining(b) {
    const relays = b.relays.reduce((t, r) => t + Math.max(0, r.dead ? 0 : r.hp), 0);
    const guards = b.phase < 2 ? GUARD_HP * 3 : b.phase > 2 ? 0 : b.guards.reduce((t, g) => t + Math.max(0, g.dead ? 0 : g.hp), 0) + GUARD_HP * (3 - b.guards.length);
    return relays + guards + b.manHp;
  }

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    if (b.field > 0) b.field--;
    b.hp = remaining(b);
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    HA.boss.vent(world, b, STEP);
    for (const g of b.gates) updateGate(world, b, g);
    if (b.broken || !b.fighting || world.scene) {
      b.sight = null;
      gravity(world, b);
      return;
    }
    const p = world.player;
    if (b.timer > 0) b.timer--;
    if (b.phase === 1) updateKey(world, b, p);
    else if (b.phase === 2) updateGuard(world, b, p);
    else updateMan(world, b, p);
    gravity(world, b);
  }

  function gravity(world, b) {
    b.vy = Math.min(b.vy + 0.3, 4);
    const hit = HA.room.move(world.room, b, b.vx, b.vy);
    if (hit.down) b.vy = 0;
    if (hit.left || hit.right) b.vx = 0;
  }

  // ---- The Key: orders from the helm ----
  function updateKey(world, b, p) {
    b.vx = 0;
    b.facing = HA.sign(p.x - b.x) || -1;
    if (b.timer > 0) return;
    const order = ORDERS[b.order++ % ORDERS.length];
    bark(world, b, order, 90);
    const live = b.turrets.filter((t) => !t.dead);
    if (order.includes('COUNT')) {
      // the turrets nearest the hero answer first; "BOTH" sets them all off
      live.sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x));
      for (const t of order.includes('BOTH') ? live : live.slice(0, 1)) t.order = true;
    } else if (order === 'AGAIN.') for (const t of live) t.order = true;
    if (order.includes('SHUT')) for (const g of b.gates) g.shut = 170;
    if (order.includes('OPEN')) for (const g of b.gates) g.shut = Math.min(g.shut, 1);
    // fewer relays left, faster orders
    const up = b.relays.filter((r) => !r.dead).length;
    b.timer = 120 + up * 30;
  }

  // A gate drops out of the ceiling to the floor (a wall the hero must go over), then lifts again.
  function updateGate(world, b, g) {
    const room = world.room;
    const was = g.down;
    if (g.shut > 0) g.shut--;
    g.down = g.shut > 0;
    g.drop = HA.approach(g.drop || 0, g.down ? 1 : 0, 0.12);
    if (g.down === was) return;
    for (let ty = g.top; ty <= 18; ty++) room.set(g.tx, ty, g.down ? HA.room.SOLID : HA.room.EMPTY);
    HA.audio.play('shutter');
    world.shake(1.5);
    if (!g.down) return;
    // nothing is left inside a gate as it shuts: whoever stands in it is pushed out to the side they're on
    for (const o of [world.player, b, ...world.enemies.filter((e) => !e.dead && !e.boss)]) {
      if (o.x + o.w <= g.tx * 8 || o.x >= g.tx * 8 + 8 || o.y + o.h <= g.top * 8) continue;
      o.x = o.x + o.w / 2 < g.tx * 8 + 4 ? g.tx * 8 - o.w - 0.5 : g.tx * 8 + 8.5;
    }
  }

  // A relay breaks: if it was the last, the Key's field fails and he calls his guard.
  function relayDown(world, b, r) {
    r.dead = true;
    world.burst(r.x + r.w / 2, r.y + r.h / 2, ['#5fd4e8', '#b8f4ff', '#ffffff', '#fff0a8'], 18, 2.2);
    world.shake(3);
    world.flash('#5fd4e8', 6);
    HA.audio.play('relay');
    const left = b.relays.filter((x) => !x.dead).length;
    if (left === 2) bark(world, b, 'LEAVE THAT ALONE.');
    else if (left === 1) bark(world, b, 'THAT IS NOT YOURS TO TOUCH.');
    else {
      for (const t of b.turrets) {
        if (t.dead) continue;
        t.dead = true;
        world.burst(t.x + t.w / 2, t.y + t.h / 2, ['#3a4258', '#5fd4e8', '#10121c'], 10, 1.5);
      }
      for (const g of b.gates) g.shut = Math.min(g.shut, 1);
      b.phase = 2;
      b.timer = 60;
      HA.story.run(world, 'stewardGuard');
    }
  }

  // ---- The guard: he doses them, then lectures while they fight ----
  const LECTURE = [
    'THEY VOLUNTEERED. EVERY ONE OF THEM.',
    'A FULL MEASURE. THEY FEEL NOTHING BUT SURE.',
    'WE ARRIVE STRONG, OR WE ARRIVE AS BEGGARS.',
    'SOMEONE GOT THERE FIRST. SOMEONE ALWAYS DOES.',
    'YOU KEPT A VILLAGE. I KEPT A SHIP.',
  ];
  // The scene that starts the second phase calls this: the guard come up the stair and from the lift, dosed.
  function callGuard(world, b) {
    const at = [[70, 16], [75, 16], [57, 18]];
    b.guards = [];
    at.forEach(([tx, ty], i) => {
      const g = HA.actors.makeEnemy({ type: '9', x: tx * 8, y: ty * 8, tx, ty, respawn: -1 });
      Object.assign(g, { dosed: true, hp: GUARD_HP, facing: tx < 40 ? 1 : -1, cool: 30 + i * 40 });
      b.guards.push(g);
      world.enemies.push(g);
      world.burst(g.x + 5, g.y + 6, ['#f27ad8', '#b04ad0'], 10, 1.4);
    });
    b.lecture = 0;
    b.timer = 200;
  }
  function updateGuard(world, b, p) {
    b.vx = 0;
    b.facing = HA.sign(p.x - b.x) || -1;
    if (b.timer <= 0) {
      bark(world, b, LECTURE[b.lecture++ % LECTURE.length], 160);
      b.timer = 260;
    }
    if (b.guards.length && b.guards.every((g) => g.dead)) {
      b.phase = 3;
      b.timer = 40;
      set(b, 'step', 40);
      HA.story.run(world, 'stewardMan');
    }
  }

  // ---- The man: cover, the sidearm, the roll ----
  function coverSpot(b, p) {
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    // a console between him and the hero, the nearest one to him
    let best = null;
    for (const c of COVER) {
      const spot = px < c.x0 ? c.x1 + 2 : c.x0 - b.w - 2;
      const between = px < c.x0 ? px < c.x0 && bx >= c.x0 - 40 : px > c.x1 && bx <= c.x1 + 40;
      const d = Math.abs(spot - b.x);
      if (!best || (between && !best.between) || (between === best.between && d < best.d)) best = { x: spot, d, between };
    }
    // nowhere good: away from the hero, along the floor
    if (!best.between) return HA.clamp(bx + (bx < px ? -120 : 120), 24, 61 * 8 - b.w);
    return best.x;
  }

  function aimAt(b, p) {
    const gx = b.x + b.w / 2 + b.facing * 7;
    const gy = b.y + 9;
    return { gx, gy, a: Math.atan2(p.y + p.h / 2 - gy, p.x + p.w / 2 - gx) };
  }
  function fire(world, b, a, gx, gy, speed) {
    world.shots.push({ owner: 'enemy', kind: 'round', x: gx, y: gy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 160, dmg: 3, pierce: 0, hits: new Set() });
    HA.audio.play('sidearm');
    world.flashes.push({ x: gx, y: gy, life: 3, r: 2 });
  }

  function updateMan(world, b, p) {
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    const close = Math.abs(px - bx) < 36 && Math.abs(p.y - b.y) < 24;
    const above = p.y + p.h < b.y - 10;
    const late = b.manHp < MAN_HP / 3;
    b.crouch = false;
    b.sight = null;
    b.rolling = false;
    switch (b.state) {
      case 'step':
        // off the dais, down onto the floor
        b.vx = -1.2;
        b.facing = -1;
        if (b.timer <= 0 || (b.y + b.h >= FLOOR - 1 && b.x < 60 * 8)) set(b, 'run', 0);
        break;
      case 'run': {
        if (b.target === undefined) b.target = coverSpot(b, p);
        const d = b.target - b.x;
        b.facing = HA.sign(d) || b.facing;
        b.vx = HA.clamp(d, -1.9, 1.9);
        b.runT = (b.runT || 0) + 1;
        if (Math.abs(d) < 2 || b.runT > 90) {
          b.vx = 0;
          b.target = undefined;
          b.runT = 0;
          set(b, 'crouch', late ? 30 : 50);
        }
        break;
      }
      case 'crouch':
        b.vx = 0;
        b.crouch = true;
        b.facing = HA.sign(px - bx) || b.facing;
        if (close) set(b, 'roll', 22);
        else if (b.timer <= 0) set(b, above ? 'fan' : 'aim', above ? 26 : late ? 24 : 32);
        break;
      case 'aim': {
        b.vx = 0;
        b.facing = HA.sign(px - bx) || b.facing;
        const s = aimAt(b, p);
        if (b.timer > 8 || !b.lock) b.lock = s.a;
        b.sight = { x: s.gx, y: s.gy, a: b.lock };
        if (close) set(b, 'roll', 22);
        else if (b.timer <= 0) {
          fire(world, b, b.lock, s.gx, s.gy, 3.4);
          b.shots = late ? 1 : 0;
          set(b, 'recoil', 14);
        }
        break;
      }
      case 'recoil':
        b.vx = 0;
        if (b.timer <= 0) {
          if (b.shots > 0) {
            b.shots--;
            const s = aimAt(b, p);
            fire(world, b, s.a, s.gx, s.gy, 3.4);
            set(b, 'recoil', 14);
          } else set(b, 'run', 0);
        }
        break;
      case 'fan': {
        b.vx = 0;
        const s = aimAt(b, p);
        b.sight = { x: s.gx, y: s.gy, a: s.a, fan: true };
        if (b.timer <= 0) {
          for (const k of [-0.22, 0, 0.22]) fire(world, b, s.a + k, s.gx, s.gy, 3);
          set(b, 'run', 0);
        }
        break;
      }
      case 'roll':
        // away from the hero, low and fast, and nothing touches him while he rolls
        b.rolling = true;
        b.crouch = true;
        b.vx = HA.sign(bx - px || 1) * 3;
        if (b.timer <= 0) set(b, 'aim', 18);
        break;
      default:
        set(b, 'run', 0);
    }
    // crouched, he's only as tall as the console he hides behind
    const h = b.crouch ? 13 : 22;
    b.y += b.h - h;
    b.h = h;
    // touching him hurts a little; he's an old man, but he's quick
    if (!p.dead && !b.rolling && HA.overlap(p, b)) world.hurtPlayer(2, bx);
  }

  function hurt(world, b, dmg, dir) {
    if (b.broken || b.hp <= 0 || !b.fighting) return;
    if (b.phase < 3 || b.rolling) {
      // the Key's field, while it lasts; his guard's bodies after
      b.field = 20;
      HA.audio.play('tink');
      return;
    }
    b.manHp = Math.max(0, b.manHp - dmg);
    b.flash = 5;
    world.burst(b.x + 5, b.y + 8, ['#e8434f', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    if (b.manHp === Math.floor(MAN_HP / 3) || (b.manHp < MAN_HP / 3 && !b.lateSaid)) {
      b.lateSaid = true;
      bark(world, b, 'I AM SEVENTY-NINE YEARS OLD. I AM STILL QUICKER THAN YOU.', 150);
    }
    if (b.manHp <= 0) {
      b.hp = 0;
      b.fighting = false;
      b.sight = null;
      b.vx = 0;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // ---- The relays: boxes of the Key's light, on the walls and ceiling ----
  const relay = {
    update(world, r) {
      r.t++;
      if (r.flash > 0) r.flash--;
    },
    hurt(world, r, dmg) {
      const b = r.parent;
      if (r.dead || !b.fighting || b.phase !== 1) return;
      r.hp -= dmg;
      r.flash = 5;
      HA.audio.play('hit');
      world.burst(r.x + r.w / 2, r.y + r.h / 2, ['#5fd4e8', '#ffffff'], 3, 1.2);
      if (r.hp <= 0) relayDown(world, b, r);
    },
    draw(g, world, r, cam) {
      const x = Math.round(r.x - cam.x);
      const y = Math.round(r.y - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x - 1, y - 1, r.w + 2, r.h + 2);
      g.fillStyle = r.flash > 0 ? '#ffffff' : '#3a4258';
      g.fillRect(x, y, r.w, r.h);
      const on = Math.floor((world.time + r.x) / 10) % 3;
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i === on ? '#b8f4ff' : '#5fd4e8';
        if (r.w > r.h) g.fillRect(x + 2 + i * 4, y + 3, 2, r.h - 6);
        else g.fillRect(x + 3, y + 2 + i * 4, r.w - 6, 2);
      }
    },
    drawBar() {},
  };

  // ---- Drawing: the gates, the Key at the helm, the field, the sight, and the man ----
  function draw(g, world, b, cam) {
    const t = world.time;
    // the broken relays, dark and sparking
    for (const r of b.relays) {
      if (!r.dead) continue;
      const x = Math.round(r.x - cam.x);
      const y = Math.round(r.y - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x - 1, y - 1, r.w + 2, r.h + 2);
      g.fillStyle = '#1a1e2a';
      g.fillRect(x, y, r.w, r.h);
      if (t % 40 < 3) {
        g.fillStyle = '#fff0a8';
        g.fillRect(x + (t % r.w), y + r.h - 1, 1, 2);
      }
    }
    for (const gt of b.gates) drawGate(g, world, gt, cam);
    // the Helm Key in its console: lit while the field holds
    const kx = Math.round(b.helmX + 18 - cam.x);
    const ky = Math.round(DAIS - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(kx - 6, ky - 18, 14, 18);
    g.fillStyle = '#3a4258';
    g.fillRect(kx - 5, ky - 17, 12, 16);
    const keyLit = b.phase === 1 && !b.keyGone;
    if (!b.keyGone) {
      g.fillStyle = keyLit ? (Math.floor(t / 8) % 2 ? '#b8f4ff' : '#5fd4e8') : '#c9a050';
      g.fillRect(kx, ky - 26, 2, 12);
      g.fillRect(kx - 2, ky - 30, 6, 5);
      g.fillStyle = '#10121c';
      g.fillRect(kx, ky - 29, 2, 2);
      g.fillStyle = keyLit ? '#b8f4ff' : '#c9a050';
      g.fillRect(kx + 2, ky - 19, 2, 1);
      g.fillRect(kx + 2, ky - 17, 1, 1);
    }
    if (keyLit) {
      // the Key's light running out along the cables to its relays
      g.globalAlpha = 0.35;
      g.fillStyle = '#5fd4e8';
      for (const r of b.relays) {
        if (r.dead) continue;
        const k = (t * 2 + r.x) % 60;
        const fx = r.x + r.w / 2 + ((b.helmX + 18 - (r.x + r.w / 2)) * k) / 60;
        const fy = r.y + r.h / 2 + ((DAIS - 22 - (r.y + r.h / 2)) * k) / 60;
        g.fillRect(Math.round(fx - cam.x), Math.round(fy - cam.y), 2, 2);
      }
      g.globalAlpha = 1;
    }
    drawMan(g, world, b, cam);
  }

  function drawGate(g, world, gt, cam) {
    if (!gt.drop) return;
    const x = Math.round(gt.tx * 8 - cam.x);
    const top = Math.round(16 - cam.y);
    const full = (FLOOR - gt.top * 8) * gt.drop;
    const y = Math.round(gt.top * 8 - cam.y);
    // the shutter, coming down its guides from the ceiling to its foot
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, top, 10, y - top + full);
    g.fillStyle = '#6c7894';
    g.fillRect(x, y + full - Math.min(full, FLOOR - gt.top * 8), 8, Math.min(full, FLOOR - gt.top * 8));
    for (let yy = y; yy < y + full; yy += 6) {
      g.fillStyle = '#a9b6cc';
      g.fillRect(x, yy, 8, 1);
    }
    g.fillStyle = '#ffd88a';
    g.fillRect(x, Math.round(y + full - 2), 8, 2);
  }

  function drawMan(g, world, b, cam) {
    const S = sprites();
    const p = world.player;
    let spr = S.stand;
    if (b.broken || b.kneeling) spr = S.kneel;
    else if (b.crouch) spr = S.crouch;
    else if (Math.abs(b.vx) > 0.3 && Math.floor(b.t / 6) % 2) spr = S.run;
    const x = Math.round(b.x + b.w / 2 - cam.x);
    const y = Math.round(b.y + b.h - spr.h - cam.y);
    if (b.gone) return;
    g.save();
    g.translate(x, y);
    if (b.rolling) {
      g.translate(0, spr.h / 2);
      g.rotate(((b.t * 0.5) % (Math.PI * 2)) * HA.sign(b.vx || 1));
      g.translate(0, -spr.h / 2);
    }
    g.scale(b.facing, 1);
    g.drawImage(b.flash > 0 ? spr.white : spr.img, -Math.floor(spr.w / 2), 0);
    // the captain's sidearm, out once he comes down off the dais
    if (b.phase === 3 && !b.broken && !b.rolling) {
      g.fillStyle = '#10121c';
      g.fillRect(3, 8, 7, 3);
      g.fillStyle = '#a9b6cc';
      g.fillRect(4, 8, 5, 1);
    }
    g.restore();
    // the Key's field, when something hits it
    if (b.field > 0 && HA.settings.flashes !== 'reduced') {
      g.globalAlpha = b.field / 30;
      g.strokeStyle = '#b8f4ff';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(x, y + spr.h / 2, 12, spr.h / 2 + 4, 0, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    // the sidearm's sight on the hero while he aims
    if (b.sight && (b.timer > 8 || Math.floor(b.timer / 2) % 2)) {
      g.globalAlpha = b.timer > 8 ? 0.4 : 0.85;
      g.fillStyle = '#e8434f';
      const sx = b.sight.x - cam.x;
      const sy = b.sight.y - cam.y;
      for (const k of b.sight.fan ? [-0.22, 0, 0.22] : [0]) for (let d = 4; d < 260; d += 3) g.fillRect(Math.round(sx + Math.cos(b.sight.a + k) * d), Math.round(sy + Math.sin(b.sight.a + k) * d), 1, 1);
      g.globalAlpha = 1;
    }
    if (p && b.broken && Math.floor(world.time / 30) % 2 && !b.kneeling) {
      g.fillStyle = '#e8434f';
      g.fillRect(x - 1, y - 4, 2, 2);
    }
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'STEWARD MARRANT', { name: '#c9d6e8', fill: '#c9a050', back: '#2a2418', marks: [(GUARD_HP * 3 + MAN_HP) / MAX_HP, MAN_HP / MAX_HP] });

  HA.bosses.steward = { MAX_HP, make, update, hurt, draw, drawBar, callGuard };
  HA.bosses.relay = relay;
})(window.HA);
