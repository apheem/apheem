'use strict';
// The running game: the room the hero is in and everything in it, moving between rooms, effects, camera and HUD.
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const A = HA.actors;
  const key = (tx, ty) => tx + ',' + ty;
  const has = (w, id) => w.player.weapons.some((x) => x.id === id);
  const FADE = 10; // frames for each half of a room change

  const ENEMY_CHARS = { c: 1, f: 1, w: 1, k: 1, q: 1, j: 1, b: 1, r: 1, d: 1, v: 1, u: 1, i: 1, x: 1 };
  // Weapons placed by a map character everywhere, or by a room's legend ({ type: 'weapon', id }).
  const WEAPON_CHARS = { G: 'pistol', U: 'cannon', A: 'coil', Q: 'scatter' };
  const WEAPON_TEXT = {
    pistol: 'RIVET PISTOL · {fire} TO FIRE',
    cannon: 'PURGE CANNON · IN THE AIR, HOLD {down}+{fire} TO HOVER',
    coil: 'ARC COIL · HOLD {fire} TO CHARGE, LET GO TO FIRE',
    scatter: 'SCATTER LAUNCHER · {fire} LOBS GRENADES THAT ROLL',
    harpoon: 'GRAPPLE HARPOON · AIM AT A RING AND {fire} TO PULL UP',
    charges: 'BREACH CHARGES · {fire} BLOWS OPEN CRACKED WALLS',
    foam: 'FOAM SPRAYER · {fire} ON WATER SETS A PLATFORM',
  };

  function create(state) {
    const world = {
      state,
      time: 0,
      player: A.makePlayer(0, 0),
      def: null,
      area: null,
      room: null,
      layers: null,
      enemies: [],
      shots: [],
      beams: [],
      pickups: [],
      particles: [],
      flashes: [],
      texts: [],
      crates: new Map(),
      pods: [],
      npcs: [],
      logs: [],
      doors: [],
      actors: [],
      boss: null,
      cage: null,
      cam: { x: 0, y: 0, look: 0 },
      shakeAmt: 0,
      shakeX: 0,
      shakeY: 0,
      flashColor: null,
      flashTime: 0,
      freezeTime: 0,
      queued: {},
      toastText: '',
      toastTime: 0,
      weaponBanner: 0,
      areaBanner: 0,
      fade: 1,
      transition: null,
      scene: null,
      near: null,
      alarm: 0,
      assist: {},
    };
    addEffects(world);
    HA.save.toPlayer(state, world.player);
    HA.bloom.syncMusic(world);
    enterRoom(world, state.room, state.x, state.y, { noSave: true, facing: state.facing });
    HA.story.begin(world);
    return world;
  }

  // ---- Effects and events other modules call ----
  function addEffects(world) {
    world.shake = (amount) => {
      world.shakeAmt = Math.max(world.shakeAmt, amount * HA.shakeScale());
    };
    world.flash = (color, frames) => {
      if (HA.settings.flashes === 'reduced') return;
      world.flashColor = color;
      world.flashTime = frames;
    };
    world.freeze = (frames) => {
      world.freezeTime = Math.max(world.freezeTime, frames);
    };
    // A toast during a scene that hides the HUD waits until the scene is over, so it isn't missed.
    world.pendingToasts = [];
    world.toast = (text, frames = 180) => {
      if (world.scene && !world.scene.showHud) {
        world.pendingToasts.push([text, frames]);
        return;
      }
      world.toastText = text;
      world.toastTime = frames;
    };
    world.floatText = (x, y, text, color) => world.texts.push({ x, y, text, color, life: 50 });
    world.burst = (x, y, colors, n, speed, size = 1) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = HA.rand(0.3, 1) * speed;
        const life = HA.randInt(14, 30);
        world.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life, max: life, color: colors[i % colors.length], size: Math.random() < 0.3 ? size + 1 : size, grav: 0.06 });
      }
    };
    world.dust = (x, y, n) => {
      for (let i = 0; i < n; i++) {
        const life = HA.randInt(10, 18);
        world.particles.push({ x: x + HA.rand(-3, 3), y: y - 1, vx: HA.rand(-0.9, 0.9), vy: HA.rand(-0.5, -0.1), life, max: life, color: i % 2 ? '#9fb6c8' : '#5a6b87', size: 1, grav: 0 });
      }
    };
    world.muzzleFlash = (x, y, level) => world.flashes.push({ x, y, life: 3, r: 1 + level });
    // While a Bloom bulb's rush lasts, the hero hits twice as hard. Shots still flying after the hero falls
    // do nothing, so a boss can't be beaten (and its scene start) while the suit reboots.
    world.hurtEnemy = (e, dmg, dir) => {
      if (world.player.dead) return;
      A.hurtEnemy(world, e, world.player.rush > 0 ? dmg * 2 : dmg, dir);
    };

    world.hurtPlayer = (dmg, srcX) => {
      const p = world.player;
      if (p.dead || p.invuln > 0 || world.assist.invincible || world.scene) return;
      p.hp = Math.max(0, p.hp - dmg);
      p.invuln = 70;
      p.stun = 10;
      p.vx = (p.x + p.w / 2 < srcX ? -1 : 1) * 1.6;
      p.vy = -2.4;
      p.jumping = false;
      p.grapple = null; // a hit knocks the hero off the grapple
      p.thrusting = false;
      HA.weapons.loseXp(world);
      world.floatText(p.x + 4, p.y - 4, '-' + dmg, '#ff8a8a');
      world.burst(p.x + 4, p.y + 7, ['#e8434f', '#ff8a8a', '#eef4f6'], 8, 1.6);
      world.shake(3);
      world.flash('#e8434f', 5);
      world.freeze(4);
      HA.audio.play('hurt');
      if (p.hp <= 0) {
        p.dead = true;
        p.deadTimer = 100;
        p.charge = 0;
        HA.audio.charge(0);
        world.burst(p.x + 4, p.y + 7, ['#eef4f6', '#ffb84d', '#9fb6c8', '#e8434f'], 30, 2.6, 2);
        world.shake(5);
        HA.audio.play('die');
      }
    };

    // After a defeat the suit reboots at the last rest pod (or, before any rest, where the hero entered the room).
    world.respawn = () => {
      const s = world.state;
      const p = world.player;
      s.deaths++;
      const rest = s.rest || { room: s.room, x: s.x, y: s.y };
      Object.assign(p, { vx: 0, vy: 0, hp: p.maxHp, dead: false, invuln: 90, stun: 0, charge: 0, fireToggle: false, rush: 0 });
      enterRoom(world, rest.room, rest.x, rest.y, { noSave: true });
      world.fade = 1;
      world.toast(s.rest ? 'SUIT REBOOTED AT THE REST POD' : 'SUIT REBOOTED', 150);
    };

    world.damageCrate = (tx, ty, dmg) => {
      const c = world.crates.get(key(tx, ty));
      if (!c || c.broken) return;
      c.hp -= dmg;
      c.flash = 4;
      if (c.hp > 0) {
        HA.audio.play('hit');
        return;
      }
      c.broken = true;
      c.timer = 2400;
      world.room.set(tx, ty, HA.room.EMPTY);
      const cx = tx * 8 + 4;
      const cy = ty * 8 + 4;
      world.burst(cx, cy, ['#b5793a', '#8a5a2b', '#5a3a1c', '#fff0a8'], 12, 1.8);
      world.pickups.push(A.makeShard(cx, cy, true));
      world.shake(1.5);
      HA.audio.play('crate');
    };

    // A weapon or suit cell was picked up: it stays gone for good.
    world.collected = (k) => {
      world.state.taken[k.key] = true;
      if (k.kind === 'weapon') {
        world.weaponBanner = 120;
        HA.story.onWeapon(world, k.id);
      }
      HA.save.write(world);
    };

    world.save = () => HA.save.write(world);
    // A lift or a hatch takes the hero to its other end, in another room: the spot whose legend leads back here.
    world.travel = (link) => {
      const def = HA.rooms.byId[link.legend.to];
      const ch = Object.keys(def.legend || {}).find((c) => def.legend[c].to === world.def.id);
      const ty = def.map.findIndex((row) => row.includes(ch));
      enterRoom(world, def.id, def.map[ty].indexOf(ch) * 8, ty * 8 + 8 - world.player.h, { facing: world.player.facing });
    };
    world.refreshMusic = () => HA.music.play(musicFor(world));
    world.enterRoom = (id, x, y, opts) => enterRoom(world, id, x, y, opts);
  }

  // ---- Rooms ----
  function enterRoom(world, id, x, y, opts = {}) {
    const def = HA.rooms.byId[id];
    if (!def) throw new Error('No room called ' + id);
    const s = world.state;
    const areaChanged = !world.def || world.def.area !== def.area;
    world.def = def;
    world.area = HA.rooms.AREAS[def.area];
    world.room = HA.room.load(def.map);
    world.layers = HA.scenery.layers(def, world.room);
    world.enemies = [];
    world.shots = [];
    world.beams = [];
    world.pickups = [];
    world.particles = [];
    world.flashes = [];
    world.texts = [];
    world.crates = new Map();
    world.pods = [];
    world.npcs = [];
    world.logs = [];
    world.doors = [];
    world.hooks = [];
    world.links = [];
    world.switches = [];
    world.foam = [];
    world.shields = [];
    world.craneMove = null;
    world.glass = [];
    world.barks = [];
    world.actors = [];
    world.boss = null;
    world.cage = null;
    world.start = null;
    world.bossSpawn = null;
    world.near = null;
    world.fired = new Set();

    const counts = {};
    for (const sp of world.room.spawns) {
      const ch = sp.type;
      const legend = (def.legend && def.legend[ch]) || {};
      const n = (counts[ch] = (counts[ch] || 0) + 1);
      const id = def.id + ':' + ch + (n > 1 ? n : '');
      if (ch === 'P') world.start = { x: sp.x, y: sp.y + 8 - 14 };
      else if (ch === 'S') world.pods.push({ x: sp.x - 4, y: sp.y + 8 - 24, w: 16, h: 24, cool: 0 });
      else if (ENEMY_CHARS[ch]) {
        sp.respawn = def.noRespawn ? -1 : 0;
        world.enemies.push(A.makeEnemy(sp));
      } else if (ch === 'B') world.crates.set(key(sp.tx, sp.ty), { tx: sp.tx, ty: sp.ty, hp: 3, broken: false, timer: 0, flash: 0 });
      else if (ch === 'n') {
        if (!s.taken[id]) world.pickups.push({ kind: 'bulb', key: id, x: sp.x, y: sp.y - 1, w: 8, h: 9, life: Infinity, t: 0 });
      } else if (WEAPON_CHARS[ch] || legend.type === 'weapon') {
        const wid = WEAPON_CHARS[ch] || legend.id;
        const shown = !legend.when || legend.when(s, world);
        if (!s.taken[id] && !has(world, wid) && shown) world.pickups.push({ kind: 'weapon', id: wid, key: id, x: sp.x - 2, y: sp.y - 8, w: 12, h: 10, life: Infinity, t: 0, message: WEAPON_TEXT[wid] });
      } else if (legend.type === 'switch') world.switches.push({ legend, x: sp.x, y: sp.y + 8 - 16, w: 8, h: 16 });
      else if (ch === 'H') {
        if (!s.taken[id]) world.pickups.push({ kind: 'capsule', key: id, x: sp.x, y: sp.y - 2, w: 8, h: 10, life: Infinity, t: 0 });
      } else if (legend.type === 'log') world.logs.push({ id: legend.id, scene: legend.scene, x: sp.x - 1, y: sp.y + 8 - 12, w: 10, h: 12, read: !!s.logs[legend.id] });
      else if (legend.type === 'npc') {
        if (!legend.when || legend.when(s, world)) world.npcs.push(HA.story.makeNpc(world, legend.id, sp));
      } else if (legend.type === 'door') addDoorCell(world, legend, sp);
      else if (legend.type === 'glass') {
        world.room.set(sp.tx, sp.ty, HA.room.SOLID);
        world.glass.push({ tx: sp.tx, ty: sp.ty });
      } else if (legend.type === 'lift') world.links.push({ legend, tx: sp.tx, ty: sp.ty, x: sp.x - 8, y: sp.y + 8 - 22, w: 24, h: 22 });
      else if (legend.type === 'hatch') world.links.push({ legend, tx: sp.tx, ty: sp.ty, x: sp.x - 4, y: sp.y + 8 - 16, w: 16, h: 16 });
      else if (ch === 'o') world.hooks.push({ x: sp.x + 4, y: sp.y + 4 });
      else if (legend.type === 'boss') world.bossSpawn = { x: sp.x + 4, y: sp.y + 8 };
      else if (legend.type === 'cage') world.cage = { x: sp.x - 8, y: sp.y - 8, w: 24, h: 22, open: false, t: 0 };
    }
    // A door with a ring (the Seed Vault's hatch) is opened by the grapple biting the ring and pulling.
    for (const d of world.doors) {
      if (!d.legend.ring || world.state.flags[d.legend.ring]) continue;
      const xs = d.cells.map((c) => c.tx);
      const c = d.cells[Math.floor(d.cells.length / 2)];
      const x0 = Math.min(...xs) * 8;
      const x1 = (Math.max(...xs) + 1) * 8;
      world.hooks.push({ x: (x0 + x1) / 2, y: c.ty * 8 + 4, hatch: d.legend.ring, x0, x1 });
    }

    world.room.belts = def.belts || [];

    const p = world.player;
    p.x = x;
    p.y = y;
    p.grapple = null;
    p.thrusting = false;
    if (!opts.keepVelocity) {
      p.vx = 0;
      p.vy = 0;
    }
    if (opts.facing) p.facing = opts.facing;
    p.safe = { x, y }; // where Bloom silt throws the hero back to, until they stand somewhere else
    updateDoors(world, true);
    s.room = id;
    if (areaChanged) world.areaBanner = 160;
    HA.story.enterRoom(world);
    HA.music.play(musicFor(world));
    HA.music.setLayers(def.musicLayers || 1); // near the vats, the Gardens' track turns sour
    updateCamera(world, true);
    HA.save.reveal(world, true);
    // Where a continued game starts: always the latest room entrance, even when this entry doesn't save.
    s.x = x;
    s.y = y;
    s.facing = p.facing;
    if (!opts.noSave) HA.save.write(world);
  }

  function musicFor(world) {
    const story = HA.story.music(world);
    if (story !== undefined) return story;
    return world.def.music !== undefined ? world.def.music : world.area.music;
  }

  // Doors are columns of cells marked D. A closed door is solid; the room's legend says when it opens.
  function addDoorCell(world, legend, sp) {
    let door = world.doors.find((d) => d.id === legend.id);
    if (!door) {
      door = { id: legend.id, legend, cells: [], open: null };
      world.doors.push(door);
    }
    door.cells.push({ tx: sp.tx, ty: sp.ty });
  }

  // A gate someone keeps (legend `kept`, like Solder's new gate) opens as the hero comes near it from either side,
  // and shuts again once they're well past.
  function nearDoor(world, d) {
    const p = world.player;
    const xs = d.cells.map((c) => c.tx * 8 + 4);
    const ys = d.cells.map((c) => c.ty * 8);
    const reach = d.open ? 48 : 32;
    const dx = Math.abs(p.x + p.w / 2 - (Math.min(...xs) + Math.max(...xs)) / 2);
    return dx < reach && p.y + p.h > Math.min(...ys) - 8 && p.y < Math.max(...ys) + 16;
  }

  function updateDoors(world, instant) {
    for (const d of world.doors) {
      const kept = !!(d.legend.kept && d.legend.kept(world.state));
      const open = !!d.legend.open(world.state, world) && (!kept || nearDoor(world, d));
      if (open === d.open) continue;
      d.open = open;
      for (const c of d.cells) world.room.set(c.tx, c.ty, open ? HA.room.EMPTY : HA.room.SOLID);
      if (instant || d.legend.crane) continue; // a crane's stack shows its own move (see throwSwitch)
      const c = d.cells[Math.floor(d.cells.length / 2)];
      if (d.legend.cracked) {
        // A cracked wall comes down in rubble, for good.
        for (const cell of d.cells) world.burst(cell.tx * 8 + 4, cell.ty * 8 + 4, d.legend.ice ? ['#d8f4ff', '#9fd8e8', '#ffffff'] : ['#6c7894', '#3a4258', '#a9b6cc'], 4, 1.6);
        HA.audio.play('crate');
        continue;
      }
      if (kept) {
        world.burst(c.tx * 8 + 4, c.ty * 8, ['#a8743a', '#6c7894'], 6, 1);
        HA.audio.play(open ? 'unlock' : 'doorShut');
        continue;
      }
      world.burst(c.tx * 8 + 4, c.ty * 8, open ? ['#ffb84d', '#fff0a8', '#6c7894'] : ['#6c7894', '#a9b6cc'], open ? 30 : 10, open ? 2.4 : 1.2);
      world.shake(open ? 4 : 2);
      HA.audio.play(open ? 'blast' : 'doorShut');
    }
  }

  const boxOf = (d) => {
    const xs = d.cells.map((c) => c.tx);
    const ys = d.cells.map((c) => c.ty);
    return { x: Math.min(...xs) * 8, y: Math.min(...ys) * 8, w: (Math.max(...xs) - Math.min(...xs) + 1) * 8, h: (Math.max(...ys) - Math.min(...ys) + 1) * 8 };
  };

  // A crane switch (the Stacks) hoists its stack of containers from one slot to the other. It won't drop a
  // stack on anyone. The stack is solid in its new slot at once; the crane's move is shown over a second.
  function throwSwitch(world, sw) {
    const flag = sw.legend.crane;
    const to = world.doors.find((d) => d.legend.crane === flag && d.open);
    const from = world.doors.find((d) => d.legend.crane === flag && !d.open);
    if (!to || !from || world.craneMove) return;
    const box = boxOf(to);
    if (HA.overlap(world.player, box) || world.enemies.some((e) => !e.dead && HA.overlap(e, box))) {
      HA.audio.play('empty');
      world.toast('SOMETHING IS IN THE WAY OF THE STACK', 120);
      return;
    }
    world.state.flags[flag] = !world.state.flags[flag];
    updateDoors(world, true);
    world.craneMove = { flag, from: boxOf(from), to: box, door: to, t: 0, frames: 60 };
    world.shake(1.5);
    HA.audio.play('crane');
  }

  // Walking off an open edge leads into the next room on the ship grid.
  function checkEdges(world) {
    const p = world.player;
    const room = world.room;
    const cx = p.x + p.w / 2;
    if (cx >= 0 && cx <= room.pw) return;
    const def = world.def;
    const gx = def.gx * 8 + (cx < 0 ? -4 : room.pw + 4);
    const gy = def.gy * 8 + p.y + p.h - 4;
    const next = HA.rooms.at(gx, gy);
    const side = cx < 0 ? 'left' : 'right';
    // A way the story holds shut for now (the hero won't go home without Wick) says why, in its own words.
    const held = def.holdBack && def.holdBack[side] && def.holdBack[side](world.state);
    if (!next || world.scene || p.dead || held) {
      p.x = HA.clamp(p.x, -p.w / 2, room.pw - p.w / 2);
      p.vx = 0;
      // An opening into an area that isn't built yet says so instead of just stopping the hero.
      const unbuilt = !next && def.unbuilt && def.unbuilt[side];
      const note = held || (unbuilt && unbuilt + ' · COMING IN THE NEXT BUILD');
      if (note && (world.toastText !== note || world.toastTime < 30)) world.toast(note, 150);
      return;
    }
    world.transition = { t: 0, to: next.id, x: def.gx * 8 + p.x - next.gx * 8, y: def.gy * 8 + p.y - next.gy * 8 };
    HA.audio.charge(0);
  }

  const onScreen = (world, x, y, margin = 16) => {
    const c = world.cam;
    return x > c.x - margin && x < c.x + W + margin && y > c.y - margin && y < c.y + H + margin;
  };

  // ---- One update (1/60 s) ----
  function update(world, rawInput) {
    world.time++;
    world.state.time++;

    // Room change: fade out with the world held still, swap rooms, fade back in while play goes on.
    const tr = world.transition;
    if (tr) {
      tr.t++;
      world.fade = Math.min(1, tr.t / FADE);
      if (tr.t < FADE) return;
      world.transition = null;
      enterRoom(world, tr.to, tr.x, tr.y, { keepVelocity: true });
    }
    if (world.fade > 0 && !world.holdFade) world.fade = Math.max(0, world.fade - 1 / FADE);

    // A trip picked on the map, from one rest pod to another.
    if (world.travelTo && !world.scene) {
      HA.story.travel(world, world.travelTo);
      world.travelTo = null;
    }

    // Scenes (talk, cutscenes, choices) take the controls while they run.
    const input = HA.scenes.update(world, rawInput);
    // Toasts held back during a scene: the first replaces whatever is showing when it ends, the rest follow.
    const sceneEnded = world.sceneWas && !world.scene;
    world.sceneWas = !!world.scene;
    if (!world.scene && world.pendingToasts.length && (sceneEnded || world.toastTime < 30)) {
      const [text, frames] = world.pendingToasts.shift();
      world.toast(text, frames);
    }

    // Hit-stop: a few frozen frames sell big hits. Presses made during it still count afterwards.
    if (world.freezeTime > 0) {
      world.freezeTime--;
      for (const a of ['jump', 'fire', 'prev', 'next', 'up', 'item']) if (input.pressed[a]) world.queued[a] = true;
      return;
    }
    for (const a of Object.keys(world.queued)) input.pressed[a] = true;
    world.queued = {};

    const p = world.player;
    A.updatePlayer(world, input);
    checkEdges(world);
    if (world.transition) return;

    updateDoors(world, false);
    if (world.craneMove && ++world.craneMove.t >= world.craneMove.frames) {
      world.craneMove = null;
      world.shake(2);
      HA.audio.play('stomp');
    }
    updateInteractions(world, input);
    checkTriggers(world);
    HA.story.update(world);

    for (const e of world.enemies) {
      if (e.dead) continue;
      A.updateEnemy(world, e);
      if (!e.boss) e.x = HA.clamp(e.x, 0, world.room.pw - e.w);
    }
    // Defeated enemies come back after a while, out of sight, so there is always energy to collect.
    for (let i = 0; i < world.enemies.length; i++) {
      const e = world.enemies[i];
      if (!e.dead || e.spawn.respawn < 0) continue;
      if (e.spawn.respawn > 0) e.spawn.respawn--;
      else if (!onScreen(world, e.spawn.x + 4, e.spawn.y + 4, 40)) world.enemies[i] = A.makeEnemy(e.spawn);
    }
    for (const a of world.actors) if (a.update) a.update(world, a);

    HA.weapons.updateShots(world);
    HA.weapons.updateFoam(world);

    for (const k of world.pickups) A.updatePickup(world, k);
    world.pickups = world.pickups.filter((k) => k.life > 0);

    for (const c of world.crates.values()) {
      if (c.flash > 0) c.flash--;
      if (!c.broken) continue;
      if (c.timer > 0) c.timer--;
      else if (!onScreen(world, c.tx * 8, c.ty * 8, 24) && !HA.overlap(p, { x: c.tx * 8, y: c.ty * 8, w: 8, h: 8 })) {
        c.broken = false;
        c.hp = 3;
        world.room.set(c.tx, c.ty, HA.room.CRATE);
      }
    }

    for (const q of world.particles) {
      q.x += q.vx;
      q.y += q.vy;
      q.vy += q.grav || 0;
      q.vx *= 0.96;
      q.life--;
    }
    world.particles = world.particles.filter((q) => q.life > 0);
    if (world.particles.length > 600) world.particles.splice(0, world.particles.length - 600);
    for (const b of world.beams) b.life--;
    world.beams = world.beams.filter((b) => b.life > 0);
    for (const f of world.flashes) f.life--;
    world.flashes = world.flashes.filter((f) => f.life > 0);
    for (const t of world.texts) {
      t.y -= 0.35;
      t.life--;
    }
    world.texts = world.texts.filter((t) => t.life > 0);

    if (world.toastTime > 0) world.toastTime--;
    if (world.weaponBanner > 0) world.weaponBanner--;
    if (world.areaBanner > 0) world.areaBanner--;
    if (world.flashTime > 0) world.flashTime--;
    world.shakeAmt *= 0.84;
    if (world.shakeAmt < 0.1) world.shakeAmt = 0;
    world.shakeX = (Math.random() - 0.5) * 2 * world.shakeAmt;
    world.shakeY = (Math.random() - 0.5) * 2 * world.shakeAmt;
    updateCamera(world, false);
    HA.save.reveal(world, false);
  }

  // Rest pods, people, ship logs and lifts answer to Up, and an open floor hatch to Down. The closest one in
  // reach shows its prompt.
  function updateInteractions(world, input) {
    const p = world.player;
    let best = null;
    let bestD = 999;
    const consider = (kind, o, label, key = 'up') => {
      const reach = { x: o.x - 6, y: o.y - 4, w: o.w + 12, h: o.h + 8 };
      if (!HA.overlap(p, reach)) return;
      const d = Math.abs(p.x + p.w / 2 - (o.x + o.w / 2));
      if (d < bestD) {
        bestD = d;
        best = { kind, o, label, key };
      }
    };
    if (!p.dead && !world.scene) {
      const travel = world.state.flags.cargo ? '{up} REST  {map} TRAVEL' : '{up} REST';
      for (const pod of world.pods) if (pod.cool === 0) consider('pod', pod, travel);
      for (const n of world.npcs) if (n.talkable && n.talkable(world, n)) consider('npc', n, '{up} TALK');
      for (const l of world.logs) consider('log', l, '{up} READ');
      for (const sw of world.switches) if (!world.craneMove) consider('switch', sw, '{up} THROW THE SWITCH');
      for (const l of world.links) {
        if (l.legend.type === 'lift') consider('link', l, '{up} USE THE LIFT');
        else if (l.legend.up) consider('link', l, '{up} CLIMB UP');
        else if (l.legend.open(world.state)) consider('link', l, '{down} CLIMB DOWN', 'down');
      }
    }
    for (const pod of world.pods) if (pod.cool > 0) pod.cool--;
    world.near = best;
    if (!best || !input.pressed[best.key]) return;
    if (best.kind === 'pod') rest(world, best.o);
    else if (best.kind === 'npc') HA.story.talk(world, best.o);
    else if (best.kind === 'log') HA.story.readLog(world, best.o);
    else if (best.kind === 'switch') throwSwitch(world, best.o);
    else if (best.kind === 'link') HA.story.useLink(world, best.o);
  }

  // Story moments that start when the hero reaches a spot (tiles x0-x1, and between rows y0 and y1 if given).
  function checkTriggers(world) {
    if (world.scene || world.player.dead) return;
    const p = world.player;
    const tx = (p.x + p.w / 2) / 8;
    const ty = (p.y + p.h - 1) / 8;
    (world.def.triggers || []).forEach((t, i) => {
      if (world.fired.has(i) || world.scene) return;
      if (tx < t.x0 || tx > t.x1 + 1 || (t.y1 !== undefined && ty > t.y1 + 1) || (t.y0 !== undefined && ty < t.y0)) return;
      if (t.when && !t.when(world.state, world)) return;
      world.fired.add(i); // once per visit to the room
      HA.story.run(world, t.run);
    });
  }

  function rest(world, pod) {
    const p = world.player;
    const s = world.state;
    pod.cool = 90;
    p.hp = p.maxHp;
    // A pod restocks the Breach Charges, and is remembered for travel between pods (see mapscreen.js).
    for (const w of p.weapons) if (w.id === 'charges') w.ammo = HA.weapons.chargesMax(s);
    s.rest = { room: world.def.id, x: pod.x + 4, y: pod.y + pod.h - p.h };
    s.rested[world.def.id] = true;
    s.x = s.rest.x;
    s.y = s.rest.y;
    world.burst(pod.x + 8, pod.y + 10, ['#5fd4e8', '#b8f4ff', '#ffffff'], 16, 1.4);
    world.toast('RESTED · HEALTH RESTORED · GAME SAVED', 150);
    HA.audio.play('rest');
    HA.save.write(world);
    const then = world.def.onRest && world.def.onRest(world);
    if (then) HA.story.run(world, then);
  }

  function updateCamera(world, snap) {
    const p = world.player;
    const c = world.cam;
    const target = world.camTarget;
    c.look = snap ? p.facing * 26 : HA.approach(c.look, p.facing * 26, 0.9);
    const tx = target ? target.x - W / 2 : p.x + p.w / 2 + c.look - W / 2;
    const ty = target ? target.y - H / 2 : p.y + p.h / 2 - H / 2 - 8 + HA.clamp(p.vy * 5, 0, 26);
    c.x = snap ? tx : c.x + (tx - c.x) * 0.12;
    c.y = snap ? ty : c.y + (ty - c.y) * 0.1;
    c.x = HA.clamp(c.x, 0, Math.max(0, world.room.pw - W));
    c.y = HA.clamp(c.y, 0, Math.max(0, world.room.ph - H));
  }

  // ---- Drawing ----
  // quiet: a menu is open on top, so banners, labels and dialogue stay hidden instead of showing through it.
  function draw(world, g, quiet) {
    const cam = { x: Math.round(world.cam.x + world.shakeX), y: Math.round(world.cam.y + world.shakeY) };
    g.fillStyle = '#05060d';
    g.fillRect(0, 0, W, H);
    g.drawImage(world.layers.bg, -cam.x, -cam.y);
    HA.scenery.drawBack(g, world, cam);

    for (const pod of world.pods) drawPod(g, world, pod, cam);
    for (const l of world.links) if (l.legend.type === 'lift' || l.legend.up) HA.scenery.drawLink(g, world, l, cam);
    for (const l of world.logs) if (!l.scene) HA.scenery.drawTerminal(g, world, l, cam);
    for (const sw of world.switches) HA.scenery.drawSwitch(g, world, sw, cam);
    HA.abilities.drawHooks(g, world, cam);
    drawHints(g, world, cam);
    for (const n of world.npcs) HA.story.drawNpc(g, world, n, cam);
    g.drawImage(world.layers.tiles, -cam.x, -cam.y);
    if (world.room.belts.length) HA.scenery.drawBelts(g, world, cam);
    for (const d of world.doors) if (!d.open && !(world.craneMove && world.craneMove.door === d)) HA.scenery.drawDoor(g, world, d, cam);
    if (world.craneMove) HA.scenery.drawCraneMove(g, world, world.craneMove, cam);
    for (const l of world.links) if (l.legend.type === 'hatch' && !l.legend.up) HA.scenery.drawLink(g, world, l, cam);
    if (world.glass.length) HA.scenery.drawGlass(g, world, cam);
    if (world.cage) HA.scenery.drawCage(g, world, world.cage, cam);
    for (const c of world.crates.values()) if (!c.broken) drawCrate(g, c, cam);

    for (const k of world.pickups) A.drawPickup(g, world, k, cam);
    for (const e of world.enemies) if (!e.dead) A.drawEnemy(g, world, e, cam);
    for (const a of world.actors) if (a.draw) a.draw(g, world, a, cam);
    A.drawPlayer(g, world, cam);
    HA.abilities.draw(g, world, cam);
    HA.abilities.drawWater(g, world, cam);
    drawFoam(g, world, cam);
    for (const s of world.shots) drawShot(g, world, s, cam);
    for (const b of world.beams) drawBeam(g, b, cam);
    for (const q of world.particles) {
      g.fillStyle = q.color;
      g.fillRect(Math.round(q.x - cam.x), Math.round(q.y - cam.y), q.size, q.size);
    }
    for (const f of world.flashes) {
      g.fillStyle = f.life > 1 ? '#ffffff' : '#fff0a8';
      g.fillRect(Math.round(f.x - cam.x - f.r), Math.round(f.y - cam.y - 1), f.r * 2 + 1, 3);
      g.fillRect(Math.round(f.x - cam.x - 1), Math.round(f.y - cam.y - f.r), 3, f.r * 2 + 1);
    }
    for (const t of world.texts) HA.font.draw(g, t.text, t.x - cam.x, t.y - cam.y, t.color, { align: 'center' });
    if (!quiet) HA.story.drawBarks(g, world, cam);

    // Coil charge spark at the muzzle once fully charged
    const p = world.player;
    const w = p.weapons[p.wi];
    if (!p.dead && w && w.id === 'coil' && p.charge > 6) {
      const L = HA.weapons.DEFS.coil.levels[w.level - 1];
      if (p.charge >= L.charge && Math.floor(world.time / 3) % 2) {
        const m = HA.weapons.muzzle(p);
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(m.x - cam.x) - 1, Math.round(m.y - cam.y) - 1, 3, 3);
      }
    }

    HA.scenery.drawLight(g, world);
    if (world.alarm > 0 && Math.floor(world.time / 20) % 2 === 0 && HA.settings.flashes !== 'reduced') {
      g.fillStyle = 'rgba(232,67,79,0.13)';
      g.fillRect(0, 0, W, H);
    }
    if (world.flashTime > 0 && world.flashColor) {
      g.globalAlpha = 0.18 * (world.flashTime / 5);
      g.fillStyle = world.flashColor;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    if (p.dead) {
      g.globalAlpha = Math.min(0.7, (100 - p.deadTimer) / 60);
      g.fillStyle = '#05060d';
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
      if (p.deadTimer < 70) HA.font.draw(g, 'SUIT FAILURE', W / 2, H / 2 - 4, '#ff8a8a', { align: 'center' });
    }
    if (world.near && !world.scene && !quiet) {
      const o = world.near.o;
      HA.font.draw(g, world.near.label, Math.round(o.x + o.w / 2 - cam.x), Math.round(o.y - cam.y) - 12, '#eef4f6', { align: 'center' });
    }
    if (!world.scene || world.scene.showHud) drawHud(g, world, quiet);
    if (!quiet && HA.story.drawFlood) HA.story.drawFlood(g, world);
    if (world.leadBanner > 0 && !quiet && !(world.scene && world.scene.step && (world.scene.step.say !== undefined || world.scene.step.choice))) drawLead(g, world);
    if (world.boss && world.boss.active) HA.bosses[world.boss.type].drawBar(g, world, world.boss);
    HA.scenes.draw(world, g, quiet);
    if (world.fade > 0) {
      g.globalAlpha = world.fade;
      g.fillStyle = '#05060d';
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    HA.scenes.drawCard(world, g, quiet);
  }

  // The Foam Sprayer's platforms afloat (they blink before they go) and its shields on land.
  function drawFoam(g, world, cam) {
    for (const pl of world.foam || []) {
      if (pl.life < 90 && Math.floor(pl.life / 6) % 2) continue;
      for (const c of pl.cells) {
        const x = c.tx * 8 - cam.x;
        const y = c.ty * 8 - cam.y;
        g.fillStyle = '#9fb6c8';
        g.fillRect(x, y + 1, 8, 5);
        g.fillStyle = '#f4f0e0';
        g.fillRect(x, y, 8, 4);
        g.fillStyle = '#ffffff';
        g.fillRect(x + ((c.tx * 3) % 5), y, 2, 1);
        g.fillStyle = '#d8e4ea';
        g.fillRect(x + ((c.tx * 5 + 2) % 6), y + 2, 2, 2);
      }
    }
    for (const sh of world.shields || []) {
      if (sh.life < 60 && Math.floor(sh.life / 5) % 2) continue;
      const x = Math.round(sh.x - cam.x);
      const y = Math.round(sh.y - cam.y);
      g.fillStyle = '#9fb6c8';
      g.fillRect(x, y + 2, sh.w, sh.h - 2);
      g.fillStyle = '#f4f0e0';
      g.fillRect(x + 1, y, sh.w - 2, sh.h - 1);
      g.fillStyle = '#ffffff';
      g.fillRect(x + 1, y + 2, 2, 2);
      g.fillRect(x + 3, y + 8, 1, 1);
    }
  }

  function drawHints(g, world, cam) {
    const p = world.player;
    for (const h of world.def.hints || []) {
      if (h.when && !h.when(world)) continue;
      const hx = h.x * 8;
      const hy = h.y * 8;
      const d = Math.hypot(p.x - hx - 40, p.y - hy);
      if (d > 190 || !onScreen(world, hx + 40, hy, 120)) continue;
      g.globalAlpha = HA.clamp((190 - d) / 70, 0, 0.85);
      HA.font.draw(g, h.text, hx - cam.x, hy - cam.y, '#9fb6c8');
      g.globalAlpha = 1;
    }
  }

  function drawPod(g, world, pod, cam) {
    const x = Math.round(pod.x - cam.x);
    const y = Math.round(pod.y - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 16, 24);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 1, y + 1, 14, 22);
    g.fillStyle = '#123247';
    g.fillRect(x + 3, y + 3, 10, 15);
    const pulse = Math.floor(world.time / 20) % 2;
    g.fillStyle = pulse ? '#5fd4e8' : '#3f8fa8';
    g.fillRect(x + 4, y + 4, 2, 13);
    g.fillStyle = '#b8f4ff';
    g.fillRect(x + 4, y + 4, 1, 4);
    g.fillStyle = '#6c7894';
    g.fillRect(x + 2, y + 19, 12, 2);
    g.fillStyle = '#7ad1a0';
    g.fillRect(x + 7, y + 20, 2, 1);
  }

  function drawCrate(g, c, cam) {
    const x = c.tx * 8 - cam.x;
    const y = c.ty * 8 - cam.y;
    if (x < -8 || y < -8 || x > W || y > H) return;
    if (c.flash > 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(x, y, 8, 8);
      return;
    }
    g.fillStyle = '#3d2814';
    g.fillRect(x, y, 8, 8);
    g.fillStyle = '#8a5a2b';
    g.fillRect(x + 1, y + 1, 6, 6);
    g.fillStyle = '#b5793a';
    g.fillRect(x + 1, y + 1, 6, 1);
    g.fillStyle = '#5a3a1c';
    g.fillRect(x + 2, y + 3, 4, 2);
    g.fillStyle = '#ffb84d';
    g.fillRect(x + 3, y + 3, 2, 1);
  }

  function drawShot(g, world, s, cam) {
    if (s.delay > 0) return;
    const x = Math.round(s.x - cam.x);
    const y = Math.round(s.y - cam.y);
    if (s.kind === 'bolt') {
      const horiz = Math.abs(s.vx) > Math.abs(s.vy);
      const len = s.len;
      g.fillStyle = s.level === 1 ? '#ffb84d' : '#fff0a8';
      if (horiz) g.fillRect(s.vx > 0 ? x - len : x, y - 1, len, 2);
      else g.fillRect(x - 1, s.vy > 0 ? y - len : y, 2, len);
      g.fillStyle = '#ffffff';
      if (horiz) g.fillRect(s.vx > 0 ? x - 2 : x, y - 1, 2, 2);
      else g.fillRect(x - 1, s.vy > 0 ? y - 2 : y, 2, 2);
    } else if (s.kind === 'pellet') {
      const r = s.level === 3 ? 2 : 1;
      g.fillStyle = '#ff9b3d';
      g.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
      g.fillStyle = '#fff0a8';
      g.fillRect(x, y, 1, 1);
    } else if (s.kind === 'orb') {
      const big = Math.floor(world.time / 5) % 2;
      g.fillStyle = '#10121c';
      g.fillRect(x - 3, y - 3, 7, 7);
      g.fillStyle = '#e8434f';
      g.fillRect(x - 2, y - 2, 5, 5);
      g.fillStyle = big ? '#ffffff' : '#ff8a8a';
      g.fillRect(x - 1, y - 1, 3, 3);
    } else if (s.kind === 'grenade') {
      g.fillStyle = '#10121c';
      g.fillRect(x - 2, y - 2, 5, 5);
      g.fillStyle = '#3f7a4a';
      g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = s.life < 30 && Math.floor(s.life / 3) % 2 ? '#ffffff' : '#ffb84d';
      g.fillRect(x, y - 2, 1, 1);
    } else if (s.kind === 'lancet' || s.kind === 'lancetE') {
      const ux = Math.sign(Math.round(s.vx * 2));
      const uy = Math.sign(Math.round(s.vy * 2));
      g.fillStyle = s.kind === 'lancetE' ? '#f27ad8' : '#eef4f6';
      for (let i = 0; i < 5; i++) g.fillRect(x - ux * i, y - uy * i, 1, 1);
      g.fillStyle = s.kind === 'lancetE' ? '#b04ad0' : '#a9b6cc';
      g.fillRect(x - ux * 5, y - uy * 5, 1, 1);
    } else if (s.kind === 'thorn') {
      const ux = Math.sign(s.vx);
      const uy = Math.sign(s.vy);
      for (let i = 0; i < 12; i++) {
        g.fillStyle = i < 3 ? '#ffc2dc' : i < 8 ? '#f27ad8' : '#b04ad0';
        g.fillRect(x - ux * i, y - uy * i - (uy ? 0 : i > 3 ? 1 : 0), ux ? 1 : 2, uy ? 1 : i > 3 ? 3 : 2);
      }
    } else if (s.kind === 'harpoon') {
      // the barb, and its line back to the gun
      const m = HA.weapons.muzzle(world.player);
      line(g, Math.round(m.x - cam.x), Math.round(m.y - cam.y), x, y, '#6c7894', 1);
      g.fillStyle = '#c9d6e8';
      g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = '#ffffff';
      g.fillRect(x + Math.sign(s.vx), y + Math.sign(s.vy), 1, 1);
    } else if (s.kind === 'charge') {
      const horiz = Math.abs(s.vx) >= Math.abs(s.vy);
      const ux = Math.sign(s.vx);
      const uy = Math.sign(s.vy);
      g.fillStyle = '#10121c';
      g.fillRect(x - (horiz ? 3 : 2), y - (horiz ? 2 : 3), horiz ? 7 : 5, horiz ? 5 : 7);
      g.fillStyle = '#a9b6cc';
      g.fillRect(x - (horiz ? 2 : 1), y - (horiz ? 1 : 2), horiz ? 5 : 3, horiz ? 3 : 5);
      g.fillStyle = '#e8434f';
      g.fillRect(x + (horiz ? ux * 2 : -1), y + (horiz ? -1 : uy * 2), horiz ? 1 : 3, horiz ? 3 : 1);
      g.fillStyle = Math.floor(world.time / 2) % 2 ? '#fff0a8' : '#ff9b3d';
      g.fillRect(x - (horiz ? ux * 4 : 0), y - (horiz ? 0 : uy * 4), 1, 1); // the flame at its tail
    } else if (s.kind === 'foam') {
      g.fillStyle = '#9fb6c8';
      g.fillRect(x - 2, y - 1, 5, 3);
      g.fillRect(x - 1, y - 2, 3, 5);
      g.fillStyle = '#f4f0e0';
      g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = '#ffffff';
      g.fillRect(x - 1, y - 1, 1, 1);
    } else if (s.kind === 'wave') {
      g.fillStyle = '#10121c';
      g.fillRect(x - 3, y - s.h, 7, s.h);
      g.fillStyle = Math.floor(world.time / 3) % 2 ? '#ffb84d' : '#ff8a8a';
      g.fillRect(x - 2, y - s.h + 1, 5, s.h - 1);
      g.fillStyle = '#fff0a8';
      g.fillRect(x - 1, y - s.h + 2, 3, 2);
    }
  }

  function drawBeam(g, b, cam) {
    const dx = b.x1 - b.x0;
    const dy = b.y1 - b.y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const segs = Math.max(2, Math.floor(len / 6));
    const jag = b.level === 0 ? 1.5 : 3;
    let px = b.x0;
    let py = b.y0;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const off = i === segs ? 0 : (Math.random() - 0.5) * 2 * jag;
      const qx = b.x0 + dx * t + nx * off;
      const qy = b.y0 + dy * t + ny * off;
      line(g, px - cam.x, py - cam.y, qx - cam.x, qy - cam.y, b.life > 6 ? '#ffffff' : '#b8f4ff', b.level >= 2 && b.life > 4 ? 2 : 1);
      px = qx;
      py = qy;
    }
  }

  function line(g, x0, y0, x1, y1, color, size) {
    g.fillStyle = color;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), size, size);
    }
  }

  // A new lead: what to do next, also kept in the journal.
  function drawLead(g, world) {
    const a = Math.min(1, world.leadBanner / 30, (240 - world.leadBanner) / 15);
    const text = world.state.lead;
    const w = HA.font.measure(text) + 20;
    g.globalAlpha = Math.max(0, a);
    g.fillStyle = 'rgba(5,6,13,0.9)';
    g.fillRect(Math.round(W / 2 - w / 2), 72, w, 26);
    g.fillStyle = '#ffb84d';
    g.fillRect(Math.round(W / 2 - w / 2), 72, w, 1);
    HA.font.draw(g, 'NEW LEAD', W / 2, 76, '#ffb84d', { align: 'center' });
    HA.font.draw(g, text, W / 2, 87, '#fff0a8', { align: 'center' });
    g.globalAlpha = 1;
  }

  // ---- HUD: health, weapon level and XP are always readable at a glance ----
  function drawHud(g, world, quiet) {
    const p = world.player;
    // health
    HA.font.draw(g, '♥', 6, 6, '#e8434f');
    const barW = 4 * p.maxHp;
    g.fillStyle = '#10121c';
    g.fillRect(13, 6, barW + 2, 7);
    g.fillStyle = '#3a1520';
    g.fillRect(14, 7, barW, 5);
    g.fillStyle = p.hp <= 4 && Math.floor(world.time / 15) % 2 ? '#ff8a8a' : '#e8434f';
    g.fillRect(14, 7, 4 * p.hp, 5);
    g.fillStyle = '#ff8a8a';
    g.fillRect(14, 7, 4 * p.hp, 1);
    for (let i = 4; i < p.maxHp; i += 4) {
      g.fillStyle = '#10121c';
      g.fillRect(14 + i * 4, 7, 1, 5);
    }
    HA.font.draw(g, String(p.hp), 18 + barW, 6, '#eef4f6');
    // Bloom bulbs carried, and the rush while one is working
    const bulbs = world.state.bulbs;
    if (bulbs > 0) {
      const bx = 32 + barW;
      g.drawImage(HA.art.items.bulbIcon.img, bx, 6);
      HA.font.draw(g, String(bulbs), bx + 9, 6, '#f27ad8');
    }
    if (p.rush > 0) {
      g.fillStyle = '#10121c';
      g.fillRect(13, 14, barW + 2, 3);
      g.fillStyle = Math.floor(world.time / 6) % 2 ? '#f27ad8' : '#b04ad0';
      g.fillRect(14, 15, Math.ceil((barW * p.rush) / HA.bloom.RUSH), 1);
    }

    const w = p.weapons[p.wi];
    if (w) {
      const def = HA.weapons.DEFS[w.id];
      g.drawImage(HA.art.icons[w.id].img, 4, 16);
      HA.font.draw(g, 'LV' + w.level, 18, 17, '#fff0a8');
      const xpX = 39;
      const xpW = 44;
      const max = HA.weapons.isMax(w);
      const locked = p.xpLock > 0 && !def.keepsXp;
      g.fillStyle = locked && Math.floor(world.time / 6) % 2 ? '#5fd4e8' : '#10121c';
      g.fillRect(xpX - 1, 17, xpW + 2, 7);
      g.fillStyle = '#2a2236';
      g.fillRect(xpX, 18, xpW, 5);
      const fill = max ? xpW : Math.floor((xpW * w.xp) / HA.weapons.cap(w));
      g.fillStyle = max ? (Math.floor(world.time / 8) % 2 ? '#fff0a8' : '#ffb84d') : '#ffb84d';
      g.fillRect(xpX, 18, fill, 5);
      g.fillStyle = '#fff0a8';
      g.fillRect(xpX, 18, fill, 1);
      if (max) HA.font.draw(g, 'MAX', xpX + xpW + 4, 17, '#fff0a8');
      if (w.id === 'cannon') {
        g.fillStyle = '#10121c';
        g.fillRect(xpX - 1, 25, xpW + 2, 4);
        g.fillStyle = w.ammo > 0 ? '#5fd4e8' : '#e8434f';
        g.fillRect(xpX, 26, Math.round((xpW * w.ammo) / def.ammoMax), 2);
      } else if (w.id === 'charges') {
        // one pip per charge in the rack
        const max = HA.weapons.chargesMax(world.state);
        for (let i = 0; i < max; i++) {
          g.fillStyle = '#10121c';
          g.fillRect(xpX - 1 + i * 7, 25, 6, 5);
          g.fillStyle = i < w.ammo ? '#ffb84d' : '#3a1520';
          g.fillRect(xpX + i * 7, 26, 4, 3);
        }
      } else if (w.id === 'coil' && p.charge > 0) {
        const L = def.levels[w.level - 1];
        g.fillStyle = '#10121c';
        g.fillRect(xpX - 1, 25, xpW + 2, 4);
        g.fillStyle = p.charge >= L.charge ? '#ffffff' : '#b8f4ff';
        g.fillRect(xpX, 26, Math.round((xpW * p.charge) / L.charge), 2);
      }
      if (world.weaponBanner > 0) HA.font.draw(g, def.name, 4, 31, '#9fb6c8');
    }

    // owned weapons, top right
    if (p.weapons.length > 1) {
      let x = W - 6;
      for (let i = p.weapons.length - 1; i >= 0; i--) {
        x -= 14;
        const sel = i === p.wi;
        g.fillStyle = sel ? '#ffb84d' : '#10121c';
        g.fillRect(x - 1, 5, 14, 9);
        g.fillStyle = sel ? '#2a2236' : '#161a28';
        g.fillRect(x, 6, 12, 7);
        g.drawImage(HA.art.icons[p.weapons[i].id].img, x, 6);
      }
      HA.font.draw(g, '{prev}{next}', W - 6, 17, '#9fb6c8', { align: 'right' });
    }

    if (quiet) return;
    // area name, when arriving in a new part of the ship
    if (world.areaBanner > 0) {
      const a = Math.min(1, world.areaBanner / 30, (160 - world.areaBanner) / 20);
      g.globalAlpha = Math.max(0, a);
      HA.font.draw(g, world.area.name, W / 2, 30, world.area.mapColor, { align: 'center' });
      HA.font.draw(g, world.def.name, W / 2, 40, '#9fb6c8', { align: 'center' });
      g.globalAlpha = 1;
    }

    // toast
    if (world.toastTime > 0) {
      const tw = HA.font.measure(world.toastText) + 14;
      const ty = 54;
      g.globalAlpha = Math.min(1, world.toastTime / 20);
      g.fillStyle = '#10121c';
      g.fillRect(Math.round(W / 2 - tw / 2), ty - 5, tw, 18);
      g.fillStyle = '#3a4258';
      g.fillRect(Math.round(W / 2 - tw / 2), ty - 5, tw, 1);
      g.fillRect(Math.round(W / 2 - tw / 2), ty + 12, tw, 1);
      HA.font.draw(g, world.toastText, W / 2, ty, '#eef4f6', { align: 'center' });
      g.globalAlpha = 1;
    }
  }

  HA.world = { create, update, draw, musicFor };
})(window.HA);
