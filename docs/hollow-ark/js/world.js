'use strict';
// The running game: one room, its actors, effects, camera and HUD.
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const A = HA.actors;
  const key = (tx, ty) => tx + ',' + ty;

  // Tutorial lines painted on the walls. They show the keys or buttons of whatever the player last used.
  const HINTS = [
    { x: 140, y: 294, text: '{left}{right} MOVE   {jump} JUMP' },
    { x: 140, y: 304, text: 'HOLD {jump} LONGER TO JUMP HIGHER' },
    { x: 236, y: 258, text: '{down}+{jump} DROPS THROUGH CATWALKS' },
    { x: 236, y: 270, text: '{fire} FIRE   HOLD {up} TO AIM UP' },
    { x: 236, y: 246, text: 'IN THE AIR, HOLD {down} TO AIM DOWN', when: (w) => has(w, 'cannon') },
    { x: 250, y: 120, text: 'A LEVEL 3 PURGE CANNON CAN LIFT YOU', when: (w) => has(w, 'cannon') && !w.capsuleTaken },
  ];
  const has = (w, id) => w.player.weapons.some((x) => x.id === id);

  function create() {
    const room = HA.room.load();
    const world = {
      room,
      layers: HA.art.buildRoomLayers(room),
      time: 0,
      player: null,
      enemies: [],
      shots: [],
      beams: [],
      pickups: [],
      particles: [],
      flashes: [],
      texts: [],
      crates: new Map(),
      restPods: [],
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
      assist: {},
      capsuleTaken: false,
    };

    for (const s of room.spawns) {
      if (s.type === 'P') world.player = A.makePlayer(s.x, s.y + 8 - 14);
      else if (s.type === 'S') world.restPods.push({ x: s.x - 4, y: s.y + 8 - 24, w: 16, h: 24, glow: 0, cool: 0 });
      else if (s.type === 'U') world.pickups.push({ kind: 'weapon', id: 'cannon', x: s.x - 2, y: s.y - 8, w: 12, h: 10, life: Infinity, t: 0, message: 'PURGE CANNON · IN THE AIR, HOLD {down}+{fire} TO HOVER' });
      else if (s.type === 'A') world.pickups.push({ kind: 'weapon', id: 'coil', x: s.x - 2, y: s.y - 8, w: 12, h: 10, life: Infinity, t: 0, message: 'ARC COIL · HOLD {fire} TO CHARGE, LET GO TO FIRE' });
      else if (s.type === 'H') world.pickups.push({ kind: 'capsule', x: s.x, y: s.y - 2, w: 8, h: 10, life: Infinity, t: 0 });
      else if (s.type === 'B') world.crates.set(key(s.tx, s.ty), { tx: s.tx, ty: s.ty, hp: 3, broken: false, timer: 0, flash: 0 });
      else {
        s.respawn = 0;
        world.enemies.push(A.makeEnemy(s));
      }
    }

    // ---- Effects and events other modules call ----
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
    world.toast = (text, frames = 180) => {
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
    world.hurtEnemy = (e, dmg, dir) => A.hurtEnemy(world, e, dmg, dir);

    world.hurtPlayer = (dmg, srcX) => {
      const p = world.player;
      if (p.dead || p.invuln > 0 || world.assist.invincible) return;
      p.hp = Math.max(0, p.hp - dmg);
      p.invuln = 70;
      p.stun = 10;
      p.vx = (p.x + p.w / 2 < srcX ? -1 : 1) * 1.6;
      p.vy = -2.4;
      p.jumping = false;
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

    world.respawn = () => {
      const p = world.player;
      Object.assign(p, { x: p.restX, y: p.restY, vx: 0, vy: 0, hp: p.maxHp, dead: false, invuln: 90, stun: 0, charge: 0, fireToggle: false });
      world.toast('SUIT REBOOTED AT THE REST POD', 150);
      updateCamera(world, true);
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
      room.set(tx, ty, HA.room.EMPTY);
      const cx = tx * 8 + 4;
      const cy = ty * 8 + 4;
      world.burst(cx, cy, ['#b5793a', '#8a5a2b', '#5a3a1c', '#fff0a8'], 12, 1.8);
      world.pickups.push(A.makeShard(cx, cy, true));
      world.shake(1.5);
      HA.audio.play('crate');
    };

    updateCamera(world, true);
    return world;
  }

  const onScreen = (world, x, y, margin = 16) => {
    const c = world.cam;
    return x > c.x - margin && x < c.x + W + margin && y > c.y - margin && y < c.y + H + margin;
  };

  function update(world, input) {
    world.time++;
    // Hit-stop: a few frozen frames sell big hits. Presses made during it still count afterwards.
    if (world.freezeTime > 0) {
      world.freezeTime--;
      for (const a of ['jump', 'fire', 'prev', 'next']) if (input.pressed[a]) world.queued[a] = true;
      return;
    }
    for (const a of Object.keys(world.queued)) input.pressed[a] = true;
    world.queued = {};

    const p = world.player;
    A.updatePlayer(world, input);

    // Rest pod: heal, and come back here after a defeat.
    for (const pod of world.restPods) {
      if (pod.cool > 0) pod.cool--;
      pod.near = !p.dead && HA.overlap(p, pod);
      if (pod.near && input.pressed.up && pod.cool === 0) {
        pod.cool = 60;
        p.hp = p.maxHp;
        p.restX = pod.x + 4;
        p.restY = pod.y + pod.h - p.h;
        world.burst(pod.x + 8, pod.y + 10, ['#5fd4e8', '#b8f4ff', '#ffffff'], 16, 1.4);
        world.toast('RESTED · HEALTH RESTORED', 150);
        HA.audio.play('rest');
      }
    }

    for (const e of world.enemies) if (!e.dead) A.updateEnemy(world, e);
    // Defeated enemies come back after a while, out of sight, so there is always something to shoot.
    for (let i = 0; i < world.enemies.length; i++) {
      const e = world.enemies[i];
      if (!e.dead) continue;
      if (e.spawn.respawn > 0) e.spawn.respawn--;
      else if (!onScreen(world, e.spawn.x + 4, e.spawn.y + 4, 40)) world.enemies[i] = A.makeEnemy(e.spawn);
    }

    HA.weapons.updateShots(world);

    for (const k of world.pickups) A.updatePickup(world, k);
    if (world.pickups.some((k) => k.kind === 'capsule' && k.life <= 0)) world.capsuleTaken = true;
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
    if (world.flashTime > 0) world.flashTime--;
    world.shakeAmt *= 0.84;
    if (world.shakeAmt < 0.1) world.shakeAmt = 0;
    world.shakeX = (Math.random() - 0.5) * 2 * world.shakeAmt;
    world.shakeY = (Math.random() - 0.5) * 2 * world.shakeAmt;
    updateCamera(world, false);
  }

  function updateCamera(world, snap) {
    const p = world.player;
    const c = world.cam;
    c.look = snap ? p.facing * 26 : HA.approach(c.look, p.facing * 26, 0.9);
    const tx = p.x + p.w / 2 + c.look - W / 2;
    const ty = p.y + p.h / 2 - H / 2 - 8 + HA.clamp(p.vy * 5, 0, 26);
    c.x = snap ? tx : c.x + (tx - c.x) * 0.12;
    c.y = snap ? ty : c.y + (ty - c.y) * 0.1;
    c.x = HA.clamp(c.x, 0, world.room.pw - W);
    c.y = HA.clamp(c.y, 0, world.room.ph - H);
  }

  // ---- Drawing ----
  function draw(world, g) {
    const cam = { x: Math.round(world.cam.x + world.shakeX), y: Math.round(world.cam.y + world.shakeY) };
    g.fillStyle = '#05060d';
    g.fillRect(0, 0, W, H);
    g.drawImage(world.layers.bg, -cam.x, -cam.y);

    for (const pod of world.restPods) drawPod(g, world, pod, cam);
    drawHints(g, world, cam);
    g.drawImage(world.layers.tiles, -cam.x, -cam.y);
    for (const c of world.crates.values()) if (!c.broken) drawCrate(g, c, cam);

    for (const k of world.pickups) A.drawPickup(g, world, k, cam);
    for (const e of world.enemies) if (!e.dead) A.drawEnemy(g, world, e, cam);
    A.drawPlayer(g, world, cam);
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

    // Coil charge ring around the muzzle
    const p = world.player;
    if (!p.dead && p.charge > 6) {
      const L = HA.weapons.DEFS.coil.levels[p.weapons[p.wi].level - 1];
      if (p.charge >= L.charge && Math.floor(world.time / 3) % 2) {
        const m = HA.weapons.muzzle(p);
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(m.x - cam.x) - 1, Math.round(m.y - cam.y) - 1, 3, 3);
      }
    }

    g.drawImage(HA.art.vignette, 0, 0);
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
    drawHud(g, world);
  }

  function drawHints(g, world, cam) {
    const p = world.player;
    for (const h of HINTS) {
      if (h.when && !h.when(world)) continue;
      const d = Math.hypot(p.x - h.x - 40, p.y - h.y);
      if (d > 190 || !onScreen(world, h.x + 40, h.y, 120)) continue;
      g.globalAlpha = HA.clamp((190 - d) / 70, 0, 0.85);
      HA.font.draw(g, h.text, h.x - cam.x, h.y - cam.y, '#9fb6c8');
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
    if (pod.near) HA.font.draw(g, '{up} REST', x + 8, y - 12, '#eef4f6', { align: 'center' });
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

  // ---- HUD: health, weapon level and XP are always readable at a glance ----
  function drawHud(g, world) {
    const p = world.player;
    const w = p.weapons[p.wi];
    const def = HA.weapons.DEFS[w.id];
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
    for (let i = 1; i < p.maxHp; i++) {
      if (i % 4 === 0) {
        g.fillStyle = '#10121c';
        g.fillRect(14 + i * 4, 7, 1, 5);
      }
    }
    HA.font.draw(g, String(p.hp), 18 + barW, 6, '#eef4f6');

    // weapon, level, XP
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
    } else if (w.id === 'coil' && p.charge > 0) {
      const L = def.levels[w.level - 1];
      g.fillStyle = '#10121c';
      g.fillRect(xpX - 1, 25, xpW + 2, 4);
      g.fillStyle = p.charge >= L.charge ? '#ffffff' : '#b8f4ff';
      g.fillRect(xpX, 26, Math.round((xpW * p.charge) / L.charge), 2);
    }
    if (world.weaponBanner > 0) HA.font.draw(g, def.name, 4, 31, '#9fb6c8');

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

    // toast
    if (world.toastTime > 0) {
      const tw = HA.font.measure(world.toastText) + 14;
      const ty = 42;
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

  HA.world = { create, update, draw };
})(window.HA);
