'use strict';
// The hero, enemies and pickups.
(function (HA) {
  const { approach, clamp, sign } = HA;

  // ---- Hero movement tuning (pixels per frame at 60 fps) ----
  const MOVE = {
    run: 1.5,
    accel: 0.16, // speeding up on the ground
    decel: 0.24, // slowing down on the ground
    turn: 0.34, // reversing direction on the ground
    airAccel: 0.11,
    airDecel: 0.045,
    jump: 4.05, // full jump is about 4.5 tiles
    gravityUp: 0.22,
    gravityDown: 0.38, // falls are faster than rises
    hang: 0.5, // gravity is halved near the top of a held jump
    maxFall: 4.6,
    cut: 0.45, // letting go of jump early keeps this much upward speed
    coyote: 6, // frames after leaving a ledge when a jump still works
    buffer: 7, // frames before landing when a jump press is remembered
  };

  function makePlayer(x, y) {
    return {
      x,
      y,
      w: 8,
      h: 14,
      vx: 0,
      vy: 0,
      facing: 1,
      aim: 'fwd',
      onGround: false,
      ground: false,
      coyote: 0,
      buffer: 0,
      jumping: false,
      jumpTime: 0,
      dropTimer: 0,
      hp: 12,
      maxHp: 12,
      invuln: 0,
      stun: 0,
      xpLock: 0,
      weapons: [HA.weapons.make('pistol')],
      wi: 0,
      cooldown: 0,
      charge: 0,
      rechargeWait: 0,
      fireToggle: false,
      fireWasHeld: false,
      anim: 0,
      land: 0,
      dead: false,
      deadTimer: 0,
      restX: x,
      restY: y,
      combo: 0,
      comboTimer: 0,
    };
  }

  function updatePlayer(world, input) {
    const p = world.player;
    const room = world.room;
    if (p.dead) {
      if (--p.deadTimer <= 0) world.respawn();
      return;
    }
    const { held, pressed } = input;

    // Weapon switching
    if (p.weapons.length > 1 && (pressed.prev || pressed.next)) {
      p.wi = (p.wi + (pressed.next ? 1 : -1) + p.weapons.length) % p.weapons.length;
      p.charge = 0;
      p.fireToggle = false;
      HA.audio.charge(0);
      HA.audio.play('switch');
      world.weaponBanner = 90;
    }

    // Horizontal movement with momentum
    const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    if (p.stun > 0) {
      p.stun--;
    } else if (dir) {
      p.facing = dir;
      const a = p.onGround ? (p.vx * dir < 0 ? MOVE.turn : MOVE.accel) : MOVE.airAccel;
      p.vx = approach(p.vx, dir * MOVE.run, a);
    } else {
      p.vx = approach(p.vx, 0, p.onGround ? MOVE.decel : MOVE.airDecel);
    }
    if (Math.abs(p.vx) > MOVE.run * 1.6) p.vx = sign(p.vx) * MOVE.run * 1.6;

    // Aim: up any time, down only in the air
    p.aim = held.up ? 'up' : held.down && !p.onGround ? 'down' : 'fwd';

    // Jumping: buffered presses, coyote time, variable height, drop-through catwalks
    p.buffer = pressed.jump ? MOVE.buffer : Math.max(0, p.buffer - 1);
    p.coyote = p.onGround ? MOVE.coyote : Math.max(0, p.coyote - 1);
    if (p.dropTimer > 0) p.dropTimer--;
    if (p.buffer > 0 && p.onGround && p.ground === 'oneway' && held.down) {
      p.dropTimer = 12;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      p.y += 1;
    } else if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -MOVE.jump;
      p.jumping = true;
      p.jumpTime = 0;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      world.dust(p.x + p.w / 2, p.y + p.h, 4);
      HA.audio.play('jump');
    }
    if (p.jumping) p.jumpTime++;
    // A released jump is cut short, but never below a small hop.
    if (p.jumping && !held.jump && p.vy < 0 && p.jumpTime >= 4) {
      p.vy *= MOVE.cut;
      p.jumping = false;
    }
    if (p.vy >= 0) p.jumping = false;

    // Gravity
    let g = p.vy < 0 ? MOVE.gravityUp : MOVE.gravityDown;
    if (!p.onGround && held.jump && Math.abs(p.vy) < MOVE.hang) g *= 0.5;
    p.vy = Math.min(p.vy + g, MOVE.maxFall);

    // Fire (hold or toggle, per settings)
    // A tap shorter than one frame still fires: it arrives as pressed and released together.
    const fire = { held: held.fire, pressed: pressed.fire, released: input.released.fire };
    if (HA.settings.held === 'toggle') {
      if (pressed.fire) p.fireToggle = !p.fireToggle;
      fire.held = p.fireToggle;
      fire.pressed = p.fireToggle && !p.fireWasHeld;
      fire.released = !p.fireToggle && p.fireWasHeld;
    }
    p.fireWasHeld = fire.held;
    HA.weapons.update(world, fire);

    // Move and collide
    const fallSpeed = p.vy;
    const wasGround = p.onGround;
    const hit = HA.room.move(room, p, p.vx, p.vy, { dropThrough: p.dropTimer > 0 });
    if (hit.left || hit.right) p.vx = 0;
    if (hit.up) {
      p.vy = 0.5;
      p.jumping = false;
    }
    p.ground = HA.room.grounded(room, p, { dropThrough: p.dropTimer > 0 });
    p.onGround = !!p.ground && p.vy >= 0;
    if (p.onGround) p.vy = 0;
    if (p.onGround && !wasGround && fallSpeed > 1.5) {
      p.land = 5;
      world.dust(p.x + p.w / 2, p.y + p.h, fallSpeed > 3.5 ? 6 : 3);
      HA.audio.play('land');
    }
    p.x = clamp(p.x, 0, room.pw - p.w);

    // Thorns
    if (HA.room.touchesThorns(room, p)) {
      world.hurtPlayer(2, p.x + p.w / 2 - p.facing);
      p.vy = -3.2;
    }

    // Timers and animation
    if (p.invuln > 0) p.invuln--;
    if (p.xpLock > 0) p.xpLock--;
    if (p.land > 0) p.land--;
    if (p.comboTimer > 0 && --p.comboTimer === 0) p.combo = 0;
    p.anim += p.onGround ? Math.abs(p.vx) * 0.11 : 0;
  }

  function drawPlayer(ctx, world, cam) {
    const p = world.player;
    if (p.dead) return;
    if (p.invuln > 0 && p.invuln < 60 && Math.floor(p.invuln / 3) % 2) return;
    const H = HA.art.hero;
    let spr = H.idle;
    let bob = 0;
    if (!p.onGround) spr = p.vy < 0 ? H.jump : H.fall;
    else if (p.land > 0) {
      spr = H.jump;
      bob = 1;
    } else if (Math.abs(p.vx) > 0.2) {
      const f = Math.floor(p.anim) % 4;
      spr = [H.runA, H.idle, H.runB, H.idle][f];
      bob = f % 2 ? -1 : 0;
    }
    const flash = p.invuln > 60;
    const img = flash ? spr.white : spr.img;
    const cx = Math.round(p.x + p.w / 2 - cam.x);
    const top = Math.round(p.y - 2 - cam.y + bob);
    ctx.save();
    ctx.translate(cx, top);
    ctx.scale(p.facing, 1);
    ctx.drawImage(img, -6, 0);
    // Gun in hand, pointed where the hero aims
    const gun = HA.art.guns[p.weapons[p.wi].id];
    const gimg = flash ? gun.white : gun.img;
    if (p.aim === 'up') {
      ctx.translate(1, 9);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(gimg, 0, -2);
    } else if (p.aim === 'down') {
      ctx.translate(1, 11);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(gimg, 0, -2);
    } else {
      ctx.drawImage(gimg, 1, 8);
    }
    ctx.restore();
  }

  // ---- Enemies ----
  const ENEMY = {
    crawler: { w: 12, h: 8, hp: 4, dmg: 2, drops: { small: 2, big: 0, heart: 0.12 } },
    drifter: { w: 10, h: 10, hp: 3, dmg: 2, drops: { small: 2, big: 0, heart: 0.25 } },
    warden: { w: 14, h: 12, hp: 9, dmg: 2, drops: { small: 2, big: 1, heart: 0.4 } },
  };
  const TYPES = { c: 'crawler', f: 'drifter', w: 'warden' };

  function makeEnemy(spawn) {
    const type = TYPES[spawn.type];
    const d = ENEMY[type];
    return {
      type,
      spawn,
      x: spawn.x + 4 - d.w / 2,
      y: spawn.y + 8 - d.h,
      w: d.w,
      h: d.h,
      vx: type === 'crawler' ? (Math.random() < 0.5 ? -0.45 : 0.45) : 0,
      vy: 0,
      hp: d.hp,
      flash: 0,
      dead: false,
      t: Math.floor(Math.random() * 200),
      homeX: spawn.x + 4 - d.w / 2,
      homeY: spawn.y + 8 - d.h,
      cool: 90 + Math.floor(Math.random() * 60),
      tele: 0,
      facing: 1,
    };
  }

  function updateEnemy(world, e) {
    const p = world.player;
    const room = world.room;
    e.t++;
    if (e.flash > 0) e.flash--;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dist = Math.hypot(px - ex, py - ey);

    if (e.type === 'crawler') {
      e.vy = Math.min(e.vy + 0.3, 4);
      const speed = 0.45 * sign(e.vx);
      e.vx = approach(e.vx, speed, 0.05);
      const hit = HA.room.move(room, e, e.vx, e.vy);
      if (hit.down) e.vy = 0;
      // Turn around at walls and ledges.
      const aheadX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      const footY = e.y + e.h + 2;
      const t = room.tile(Math.floor(aheadX / 8), Math.floor(footY / 8));
      const ledge = hit.down && t !== HA.room.SOLID && t !== HA.room.ONEWAY && t !== HA.room.CRATE;
      if (hit.left || hit.right || ledge) e.vx = -e.vx || 0.45;
      e.facing = sign(e.vx);
    } else if (e.type === 'drifter') {
      const chase = dist < 130 && !p.dead;
      const tx = chase ? px - e.w / 2 : e.homeX;
      const ty = (chase ? py - e.h / 2 - 6 : e.homeY) + Math.sin(e.t * 0.05) * 10;
      e.vx = clamp(e.vx + sign(tx - e.x) * 0.025, -0.6, 0.6);
      e.vy = clamp(e.vy + sign(ty - e.y) * 0.025, -0.6, 0.6);
      e.x += e.vx;
      e.y += e.vy;
      e.facing = sign(px - ex);
    } else if (e.type === 'warden') {
      e.x = approach(e.x, e.homeX + Math.sin(e.t * 0.02) * 16, 0.4);
      e.y = e.homeY + Math.sin(e.t * 0.05) * 3;
      e.facing = sign(px - ex);
      if (e.tele > 0) {
        if (--e.tele === 0) {
          const ang = Math.atan2(py - ey, px - ex);
          world.shots.push({ owner: 'enemy', kind: 'orb', x: ex, y: ey, vx: Math.cos(ang) * 1.35, vy: Math.sin(ang) * 1.35, life: 200, dmg: 2, pierce: 0, hits: new Set() });
          HA.audio.play('orb');
        }
      } else if (--e.cool <= 0) {
        e.cool = 130 + Math.floor(Math.random() * 50);
        if (dist < 150 && !p.dead) {
          e.tele = 36;
          HA.audio.play('telegraph');
        }
      }
    }

    // Touch damage
    if (!p.dead && HA.overlap(e, p)) world.hurtPlayer(ENEMY[e.type].dmg, ex);
  }

  function hurtEnemy(world, e, dmg, dir) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 5;
    if (e.type === 'crawler') e.vx = 0.45 * sign(e.vx) || 0.45;
    else {
      e.x += dir * 1.5;
    }
    world.burst(e.x + e.w / 2, e.y + e.h / 2, ['#f27ad8', '#ffffff'], 3, 1.2);
    if (e.hp <= 0) {
      e.dead = true;
      e.spawn.respawn = 300;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      world.burst(cx, cy, ['#f27ad8', '#b04ad0', '#5c2479', '#fff0a8'], 16, 2.2);
      const d = ENEMY[e.type].drops;
      for (let i = 0; i < d.small; i++) world.pickups.push(makeShard(cx, cy, false));
      for (let i = 0; i < d.big; i++) world.pickups.push(makeShard(cx, cy, true));
      if (Math.random() < d.heart && world.player.hp < world.player.maxHp) world.pickups.push(makeHeart(cx, cy));
      world.shake(2);
      world.freeze(3);
      HA.audio.play('kill');
    } else {
      HA.audio.play('hit');
    }
  }

  function drawEnemy(ctx, world, e, cam) {
    const frames = HA.art.enemies[e.type];
    const spr = frames[Math.floor(e.t / (e.type === 'crawler' ? 10 : 14)) % frames.length];
    const img = e.flash > 0 ? spr.white : spr.img;
    const x = Math.round(e.x + e.w / 2 - cam.x);
    const y = Math.round(e.y + e.h - spr.h - cam.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e.facing, 1);
    ctx.drawImage(img, -Math.floor(spr.w / 2), 0);
    ctx.restore();
    // Warden telegraph: the eye glows before it fires.
    if (e.type === 'warden' && e.tele > 0 && Math.floor(e.tele / 4) % 2 === 0) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x - 3, y + 4, 6, 2);
    }
  }

  // ---- Pickups ----
  function makeShard(x, y, big) {
    return { kind: 'shard', big, x, y, vx: HA.rand(-1.4, 1.4), vy: HA.rand(-2.6, -1.2), w: big ? 5 : 3, h: big ? 5 : 3, life: 600, t: 0 };
  }
  function makeHeart(x, y) {
    return { kind: 'heart', x, y, vx: HA.rand(-0.6, 0.6), vy: -2, w: 7, h: 7, life: 600, t: 0 };
  }

  function updatePickup(world, k) {
    const p = world.player;
    k.t++;
    if (k.kind === 'shard' || k.kind === 'heart') {
      k.life--;
      const dx = p.x + p.w / 2 - (k.x + k.w / 2);
      const dy = p.y + p.h / 2 - (k.y + k.h / 2);
      const d = Math.hypot(dx, dy);
      if (k.kind === 'shard' && d < 40 && !p.dead && k.t > 14) {
        // Energy is pulled toward the hero.
        k.vx += (dx / d) * 0.35;
        k.vy += (dy / d) * 0.35;
        k.vx *= 0.92;
        k.vy *= 0.92;
        k.x += k.vx;
        k.y += k.vy;
      } else {
        k.vy = Math.min(k.vy + 0.15, 3);
        k.vx *= 0.98;
        const hit = HA.room.move(world.room, k, k.vx, k.vy);
        if (hit.down) {
          k.vy = Math.abs(k.vy) > 0.6 ? -k.vy * 0.45 : 0;
          k.vx *= 0.8;
        }
        if (hit.left || hit.right) k.vx = -k.vx * 0.6;
      }
    }
    if (p.dead || !HA.overlap(k, { x: p.x - 1, y: p.y - 1, w: p.w + 2, h: p.h + 2 })) return;
    if (k.kind === 'shard') {
      k.life = 0;
      p.combo++;
      p.comboTimer = 40;
      HA.weapons.addXp(world, k.big ? 4 : 1);
      HA.audio.play('shard', p.combo);
    } else if (k.kind === 'heart') {
      if (p.hp >= p.maxHp) return;
      k.life = 0;
      p.hp = Math.min(p.maxHp, p.hp + 3);
      world.floatText(p.x + 4, p.y - 6, '+3', '#ff8a8a');
      HA.audio.play('heart');
    } else if (k.kind === 'weapon') {
      k.life = 0;
      p.weapons.push(HA.weapons.make(k.id));
      p.wi = p.weapons.length - 1;
      p.charge = 0;
      world.burst(k.x + 6, k.y, ['#fff0a8', '#5fd4e8'], 20, 2);
      HA.audio.play('pickup');
      world.toast(k.message, 360);
    } else if (k.kind === 'capsule') {
      k.life = 0;
      p.maxHp += 4;
      p.hp = p.maxHp;
      world.burst(k.x + 4, k.y + 5, ['#ff8a8a', '#ffffff', '#b8f4ff'], 24, 2.2);
      HA.audio.play('pickup');
      world.toast('LIFE CAPSULE · MAX HEALTH +4', 300);
    }
  }

  function drawPickup(ctx, world, k, cam) {
    const I = HA.art.items;
    if ((k.kind === 'shard' || k.kind === 'heart') && k.life < 120 && Math.floor(k.life / 4) % 2) return;
    const x = Math.round(k.x - cam.x);
    const y = Math.round(k.y - cam.y);
    if (k.kind === 'shard') {
      const frames = k.big ? I.shardBig : I.shardSmall;
      ctx.drawImage(frames[Math.floor(k.t / 8) % 2].img, x, y);
    } else if (k.kind === 'heart') {
      ctx.drawImage(I.heart.img, x, y);
    } else if (k.kind === 'weapon') {
      const bob = Math.round(Math.sin(k.t * 0.08) * 2);
      drawPedestal(ctx, x - 2, y + 9);
      ctx.drawImage(HA.art.icons[k.id].img, x, y - 4 + bob);
      if (Math.floor(k.t / 20) % 3 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 9, y - 4 + bob, 1, 1);
      }
    } else if (k.kind === 'capsule') {
      const bob = Math.round(Math.sin(k.t * 0.06) * 1.5);
      ctx.drawImage(I.capsule.img, x, y - 2 + bob);
      // Glint: every interactable has one, so nothing is hidden in an unmarked pixel.
      if (Math.floor(k.t / 16) % 4 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y - 1 + bob, 1, 1);
      }
    }
  }

  function drawPedestal(ctx, x, y) {
    ctx.fillStyle = '#10121c';
    ctx.fillRect(x, y, 16, 7);
    ctx.fillStyle = '#3a4258';
    ctx.fillRect(x + 1, y + 1, 14, 6);
    ctx.fillStyle = '#5fd4e8';
    ctx.fillRect(x + 2, y + 1, 12, 1);
    ctx.fillStyle = '#6c7894';
    ctx.fillRect(x + 3, y + 3, 10, 1);
  }

  HA.actors = { MOVE, makePlayer, updatePlayer, drawPlayer, makeEnemy, updateEnemy, hurtEnemy, drawEnemy, makeShard, makeHeart, updatePickup, drawPickup };
})(window.HA);
