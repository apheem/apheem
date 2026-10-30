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
      // The suit reboots once any scene running when it failed is over, never in the middle of one.
      if (--p.deadTimer <= 0 && !world.scene) world.respawn();
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

    // A Bloom bulb is eaten only on a press of its own button (see bloom.js).
    if (pressed.item) HA.bloom.eat(world);
    if (p.rush > 0) p.rush--;

    // Water, the boots and the grapple change how the hero moves (see abilities.js).
    const AB = HA.abilities;
    p.wet = AB.inWater(room, p);

    // Horizontal movement with momentum
    const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const run = AB.runSpeed(p, MOVE.run);
    if (p.grapple) {
      // the winch has the hero
    } else if (p.stun > 0) {
      p.stun--;
    } else if (dir) {
      p.facing = dir;
      const a = p.onGround ? (p.vx * dir < 0 ? MOVE.turn : MOVE.accel) : MOVE.airAccel;
      p.vx = approach(p.vx, dir * run, a);
    } else {
      p.vx = approach(p.vx, 0, p.onGround ? MOVE.decel : MOVE.airDecel);
    }
    if (Math.abs(p.vx) > run * 1.6) p.vx = sign(p.vx) * run * 1.6;

    // Aim: up any time, down only in the air
    p.aim = held.up ? 'up' : held.down && !p.onGround ? 'down' : 'fwd';

    // Jumping: buffered presses, coyote time, variable height, drop-through catwalks
    p.buffer = pressed.jump ? MOVE.buffer : Math.max(0, p.buffer - 1);
    p.coyote = p.onGround ? MOVE.coyote : Math.max(0, p.coyote - 1);
    if (p.dropTimer > 0) p.dropTimer--;
    if (AB.jump(world, p, input)) {
      // floating in water, or hanging from the grapple: the press was a stroke, a leap off, or a drop
    } else if (p.buffer > 0 && p.onGround && p.ground === 'oneway' && held.down) {
      p.dropTimer = 12;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      p.y += 1;
    } else if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -AB.jumpPower(p, MOVE.jump);
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
    if (!AB.gravity(world, p, input)) {
      let g = p.vy < 0 ? MOVE.gravityUp : MOVE.gravityDown;
      if (!p.onGround && held.jump && Math.abs(p.vy) < MOVE.hang) g *= 0.5;
      p.vy = Math.min(p.vy + g, MOVE.maxFall);
    }
    AB.thruster(world, p, input);

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
    HA.weapons.update(world, fire, input);

    // Move and collide (unless the grapple is winching the hero in, or holding them)
    const fallSpeed = p.vy;
    const wasGround = p.onGround;
    if (!AB.updateGrapple(world, p, input)) {
      const hit = HA.room.move(room, p, p.vx, p.vy, { dropThrough: p.dropTimer > 0 });
      if (hit.left || hit.right) p.vx = 0;
      if (hit.up) {
        p.vy = 0.5;
        p.jumping = false;
        p.thrusting = false;
      }
      p.ground = HA.room.grounded(room, p, { dropThrough: p.dropTimer > 0 });
      p.onGround = !!p.ground && p.vy >= 0;
      if (p.onGround) p.vy = 0;
      // A conveyor belt carries whoever stands on it.
      const belt = p.onGround ? HA.room.beltUnder(room, p) : 0;
      if (belt) HA.room.move(room, p, belt, 0);
      if (p.onGround && !wasGround && fallSpeed > 1.5) {
        p.land = 5;
        world.dust(p.x + p.w / 2, p.y + p.h, fallSpeed > 3.5 ? 6 : 3);
        HA.audio.play('land');
      }
    }
    // Room edges are handled by the world: an opening leads to the next room, a wall stops the hero.

    // Thorns
    if (HA.room.touchesThorns(room, p)) {
      world.hurtPlayer(2, p.x + p.w / 2 - p.facing);
      p.vy = -3.2;
    }
    // Bloom silt burns, and the hero is thrown back to the last firm ground they stood on (never foam).
    const under = room.tile(Math.floor((p.x + p.w / 2) / 8), Math.floor((p.y + p.h + 0.5) / 8));
    if (p.onGround && under !== HA.room.FOAM && !p.grapple) p.safe = { x: p.x, y: p.y };
    if (HA.room.touchesSludge(room, p)) {
      world.burst(p.x + p.w / 2, p.y + p.h - 2, ['#b04ad0', '#f27ad8', '#5a3a26'], 10, 1.4);
      world.hurtPlayer(2, p.x + p.w / 2 - p.facing);
      if (!p.dead && p.safe) {
        Object.assign(p, { x: p.safe.x, y: p.safe.y, vx: 0, vy: 0, stun: 12, jumping: false, thrusting: false });
        world.flash('#b04ad0', 4);
      } else if (!p.dead) p.vy = -3.2;
    }

    // Timers and animation
    if (p.invuln > 0) p.invuln--;
    if (p.xpLock > 0) p.xpLock--;
    if (p.land > 0) p.land--;
    if (p.kneel > 0) p.kneel--;
    if (p.comboTimer > 0 && --p.comboTimer === 0) p.combo = 0;
    p.anim += p.onGround ? Math.abs(p.vx) * 0.11 : 0;
  }

  function drawPlayer(ctx, world, cam) {
    const p = world.player;
    if (p.dead || p.hidden) return;
    if (p.invuln > 0 && p.invuln < 60 && Math.floor(p.invuln / 3) % 2) return;
    if (world.playAs) return drawStandIn(ctx, world, p, cam);
    const H = HA.art.heroFor(HA.bloom.stage(world.state));
    let spr = H.idle;
    let bob = 0;
    if (!p.onGround) spr = p.vy < 0 ? H.jump : H.fall;
    else if (p.kneel > 0) spr = H.kneel;
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
    // Wick's lantern hangs at the hero's back hip from the cradles until it's given to Shim (once it's off the floor).
    if (world.state.flags.lantern && !flash && !world.actors.some((a) => a.kind === 'lantern')) HA.scenery.miniLantern(ctx, -8, 9 + (spr === H.kneel ? 2 : 0));
    ctx.drawImage(img, -6, 0);
    // A bulb's rush: the suit glows pink while the double damage lasts, and flickers as it runs out.
    if (p.rush > 0 && !flash && (p.rush > 180 || Math.floor(p.rush / 8) % 2)) {
      ctx.globalAlpha = 0.22 + 0.18 * Math.sin(world.time * 0.15);
      ctx.drawImage(spr.pink, -6, 0);
      ctx.globalAlpha = 1;
    }
    // Gun in hand, pointed where the hero aims
    const weapon = p.weapons[p.wi];
    if (!weapon) {
      ctx.restore();
      return;
    }
    const gun = HA.art.guns[weapon.id];
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

  // In the Overgrown ending someone else fights for the hero: Solder, or Old Gasket, with the hero's dropped weapon.
  function drawStandIn(ctx, world, p, cam) {
    const S = HA.art.people[world.playAs];
    let spr = S.idle;
    if (!p.onGround || (Math.abs(p.vx) > 0.2 && Math.floor(p.anim) % 2)) spr = S.walk;
    const flash = p.invuln > 60;
    ctx.save();
    ctx.translate(Math.round(p.x + p.w / 2 - cam.x), Math.round(p.y + p.h - spr.h - cam.y));
    ctx.scale(p.facing, 1);
    ctx.drawImage(flash ? spr.white : spr.img, -Math.floor(spr.w / 2), 0);
    const weapon = p.weapons[p.wi];
    if (weapon) {
      const gun = HA.art.guns[weapon.id];
      const gimg = flash ? gun.white : gun.img;
      if (p.aim === 'up') {
        ctx.translate(0, 6);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(gimg, 0, -2);
      } else if (p.aim === 'down') {
        ctx.translate(0, 8);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(gimg, 0, -2);
      } else ctx.drawImage(gimg, 0, 5);
    }
    ctx.restore();
  }

  // ---- Enemies ----
  const ENEMY = {
    crawler: { w: 12, h: 8, hp: 4, dmg: 2, drops: { small: 2, big: 0, heart: 0.12 } },
    drifter: { w: 10, h: 10, hp: 3, dmg: 2, drops: { small: 2, big: 0, heart: 0.25 } },
    warden: { w: 14, h: 12, hp: 9, dmg: 2, drops: { small: 2, big: 1, heart: 0.4 } },
    walker: { w: 12, h: 18, hp: 14, dmg: 3, drops: { small: 3, big: 1, heart: 0.5 } },
    // The Gardens: spore pods that burst into a stinging cloud, slow Warden pickers with a long reach, and the
    // Bloomsworn, the Steward's dosed soldiers, who charge in a frenzy and then stagger.
    pod: { w: 10, h: 9, hp: 2, dmg: 0, drops: { small: 1, big: 0, heart: 0.05 } },
    picker: { w: 12, h: 26, hp: 12, dmg: 2, drops: { small: 3, big: 1, heart: 0.4 } },
    bloomsworn: { w: 10, h: 16, hp: 20, dmg: 3, drops: { small: 3, big: 1, heart: 0.5 } },
    // The Cargo Labyrinth: Bloom rats that scurry in packs and rush whoever is on their level, cargo drones
    // that fly their lines and drop a bolt on anyone below, and stack-crawlers that hang under containers and
    // let go when someone passes beneath.
    rat: { w: 8, h: 5, hp: 2, dmg: 1, drops: { small: 1, big: 0, heart: 0.06 } },
    drone: { w: 12, h: 7, hp: 3, dmg: 2, drops: { small: 2, big: 0, heart: 0.15 } },
    dropper: { w: 12, h: 8, hp: 5, dmg: 2, drops: { small: 2, big: 0, heart: 0.15 } },
    // The Flooded Ballast: silt eels that lunge at anyone in their water, Bloom jellies that drift and sting, and
    // drowned Wardens, slow and waterlogged, that swell and burst once something hits them.
    eel: { w: 14, h: 6, hp: 4, dmg: 2, drops: { small: 2, big: 0, heart: 0.15 } },
    jelly: { w: 10, h: 10, hp: 2, dmg: 2, drops: { small: 1, big: 0, heart: 0.1 } },
    drowned: { w: 12, h: 18, hp: 6, dmg: 2, drops: { small: 3, big: 1, heart: 0.4 } },
    // The Engine Spine: Bloomsworn climbers who cling to the shaft's walls and throw themselves at the hero,
    // steam drones that hang overhead and blast straight down, and heat slugs that leave a burning trail.
    climber: { w: 10, h: 14, hp: 8, dmg: 2, drops: { small: 2, big: 1, heart: 0.3 } },
    steamer: { w: 12, h: 10, hp: 4, dmg: 2, drops: { small: 2, big: 0, heart: 0.15 } },
    slug: { w: 12, h: 6, hp: 5, dmg: 2, drops: { small: 2, big: 0, heart: 0.15 } },
    // The Command Tower: Warden turrets in the ceilings that paint the hero with a sight line and fire a burst, and
    // the Steward's honour guard, who come on behind a shield and lunge with a pike (and are open after it).
    turret: { w: 12, h: 8, hp: 6, dmg: 0, drops: { small: 2, big: 0, heart: 0.2 } },
    guard: { w: 10, h: 16, hp: 16, dmg: 2, drops: { small: 3, big: 1, heart: 0.5 } },
  };
  const TYPES = { c: 'crawler', f: 'drifter', w: 'warden', k: 'walker', q: 'pod', j: 'picker', b: 'bloomsworn', r: 'rat', d: 'drone', v: 'dropper', u: 'eel', i: 'jelly', x: 'drowned', m: 'climber', 8: 'steamer', 0: 'slug', 7: 'turret', 9: 'guard' };
  // What the Bloomsworn are thinking. Only a hero with the Bloom in them (stage 3 or more) can hear it.
  const THOUGHTS = ['SO LOUD', 'WHERE IS MY GIRL', 'IT HURTS WHEN IT STOPS', 'COUNT ME', 'SO WARM', 'I HAD A NAME', 'KEEP MOVING'];

  function makeEnemy(spawn) {
    const type = TYPES[spawn.type];
    const d = ENEMY[type];
    // A stack-crawler starts clinging under the ceiling of its cell, and a turret hangs there; everything else stands
    // on its cell's floor.
    const y = type === 'dropper' || type === 'turret' ? spawn.y : spawn.y + 8 - d.h;
    return {
      type,
      spawn,
      x: spawn.x + 4 - d.w / 2,
      y,
      w: d.w,
      h: d.h,
      vx: type === 'crawler' ? (Math.random() < 0.5 ? -0.45 : 0.45) : 0,
      onGround: false,
      vy: 0,
      hp: d.hp,
      flash: 0,
      dead: false,
      t: Math.floor(Math.random() * 200),
      homeX: spawn.x + 4 - d.w / 2,
      homeY: y,
      cool: 90 + Math.floor(Math.random() * 60),
      tele: 0,
      facing: 1,
      dir: type === 'drone' ? 1 : Math.random() < 0.5 ? -1 : 1,
      cling: type === 'dropper',
    };
  }

  function updateEnemy(world, e) {
    if (e.boss) return HA.bosses[e.type].update(world, e);
    const p = world.player;
    const room = world.room;
    e.t++;
    if (e.flash > 0) e.flash--;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dist = Math.hypot(px - ex, py - ey);

    // Reeled in on the harpoon's line: dragged to the hero's feet, then stunned for a moment, harmless.
    if (e.yank > 0) {
      e.yank--;
      e.cling = false;
      const tx = px + p.facing * 9 - e.w / 2;
      const ty = p.y + p.h - e.h;
      const d = Math.hypot(tx - e.x, ty - e.y);
      if (d < 3) e.yank = 0;
      else HA.room.move(room, e, ((tx - e.x) / d) * Math.min(4, d), ((ty - e.y) / d) * Math.min(4, d));
      e.vx = 0;
      e.vy = 0;
      return;
    }
    if (e.stun > 0) {
      e.stun--;
      e.grip = false; // a stunned climber loses its hold on the wall
      if (e.type !== 'drifter' && e.type !== 'drone' && e.type !== 'eel' && e.type !== 'jelly' && e.type !== 'steamer' && e.type !== 'turret') {
        e.vx = 0;
        walk(world, e);
      }
      return;
    }

    if (e.type === 'rat') updateRat(world, e, px, py, dist);
    else if (e.type === 'eel') updateEel(world, e, px, py, dist);
    else if (e.type === 'jelly') updateJelly(world, e, px, py, dist);
    else if (e.type === 'drowned') {
      if (updateDrowned(world, e, px, py, dist)) return;
    }
    else if (e.type === 'drone') updateDrone(world, e, px, py);
    else if (e.type === 'climber') updateClimber(world, e, px, py, dist);
    else if (e.type === 'steamer') updateSteamer(world, e, px, py, dist);
    else if (e.type === 'slug') updateSlug(world, e);
    else if (e.type === 'turret') updateTurret(world, e, px, py, dist);
    else if (e.type === 'guard') updateGuard(world, e, px, py, dist);
    else if (e.type === 'dropper') updateDropper(world, e, px, py, dist);
    else if (e.type === 'crawler') {
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
    } else if (e.type === 'walker') {
      // A Warden on foot: marches at the hero, stops at ledges, and fires a pair of orbs after a visible wind-up.
      e.vy = Math.min(e.vy + 0.3, 4);
      const awake = !e.hold && ((dist < 170 && Math.abs(py - ey) < 60) || e.angry);
      if (e.tele > 0) {
        e.vx = 0;
        if (--e.tele === 0) {
          for (const d of [0, 14]) world.shots.push({ owner: 'enemy', kind: 'orb', x: ex + e.facing * 6, y: e.y + 6, vx: e.facing * 1.7, vy: 0, life: 160, dmg: 2, pierce: 0, hits: new Set(), delay: d });
          HA.audio.play('orb');
        }
      } else {
        if (awake && !p.dead) e.facing = sign(px - ex);
        const want = awake && Math.abs(px - ex) > 26 ? e.facing * 0.55 : 0;
        e.vx = approach(e.vx, want, 0.05);
        if (awake && --e.cool <= 0 && !p.dead) {
          e.cool = 140 + Math.floor(Math.random() * 60);
          e.tele = 34;
          HA.audio.play('telegraph');
        }
      }
      const hit = HA.room.move(room, e, e.vx, e.vy);
      if (hit.down) e.vy = 0;
      const aheadX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      const t = room.tile(Math.floor(aheadX / 8), Math.floor((e.y + e.h + 2) / 8));
      if (hit.down && e.vx && t !== HA.room.SOLID && t !== HA.room.ONEWAY && t !== HA.room.CRATE) {
        e.x -= e.vx;
        e.vx = 0;
      }
      if (hit.left || hit.right) e.vx = 0;
    } else if (e.type === 'pod') {
      updatePod(world, e, px, py);
    } else if (e.type === 'picker') {
      updatePicker(world, e, px, py, dist);
    } else if (e.type === 'bloomsworn') {
      updateBloomsworn(world, e, px, py, dist);
    }

    // Touch damage
    if (!p.dead && ENEMY[e.type].dmg && HA.overlap(e, p)) world.hurtPlayer(ENEMY[e.type].dmg, ex);
  }

  // Gravity and footing for things that walk, stopping short of ledges. Returns the move's hits.
  function walk(world, e) {
    const room = world.room;
    e.vy = Math.min(e.vy + 0.3, 4);
    const hit = HA.room.move(room, e, e.vx, e.vy);
    if (hit.down) e.vy = 0;
    const aheadX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
    const t = room.tile(Math.floor(aheadX / 8), Math.floor((e.y + e.h + 2) / 8));
    hit.ledge = hit.down && e.vx && t !== HA.room.SOLID && t !== HA.room.ONEWAY && t !== HA.room.CRATE;
    if (hit.ledge) {
      e.x -= e.vx;
      e.vx = 0;
    }
    if (hit.left || hit.right) e.vx = 0;
    return hit;
  }

  // A spore pod swells when the hero comes close (or is shot), then bursts into a cloud that stings while
  // anyone stands in it. A burst pod grows back after a while.
  function updatePod(world, e, px, py) {
    const near = Math.abs(px - (e.x + e.w / 2)) < 30 && Math.abs(py - (e.y + e.h / 2)) < 26;
    if (e.state === 'spent') {
      if (--e.timer <= 0) e.state = 'shut';
      return;
    }
    if (e.state === 'swell') {
      if (--e.timer <= 0) burstPod(world, e);
      return;
    }
    if (near && !world.player.dead) {
      e.state = 'swell';
      e.timer = 40;
      HA.audio.play('swell');
    }
  }

  function burstPod(world, e) {
    e.state = 'spent';
    e.timer = 420;
    sporeCloud(world, e.x + e.w / 2, e.y + e.h, 30, 22, 180);
    HA.audio.play('spores');
  }

  // A stinging cloud of Bloom spores (from pods, and from Wick). It hurts while the hero stands in it.
  function sporeCloud(world, cx, floorY, w, h, life) {
    const c = { kind: 'cloud', x: cx - w / 2, y: floorY - h, w, h, life, max: life };
    c.update = (wd, self) => {
      if (--self.life <= 0) wd.actors = wd.actors.filter((a) => a !== self);
      const inner = { x: self.x + 3, y: self.y + 4, w: self.w - 6, h: self.h - 4 };
      if (self.life > 20 && HA.overlap(inner, wd.player)) wd.hurtPlayer(1, self.x + self.w / 2);
      if (wd.time % 3 === 0) {
        wd.particles.push({ x: self.x + Math.random() * self.w, y: self.y + self.h - Math.random() * self.h, vx: HA.rand(-0.2, 0.2), vy: HA.rand(-0.4, -0.1), life: 24, max: 24, color: Math.random() < 0.5 ? '#f27ad8' : '#b04ad0', size: Math.random() < 0.3 ? 2 : 1, grav: 0 });
      }
    };
    c.draw = (g, wd, self, cam) => {
      const a = Math.min(1, self.life / 30) * 0.32;
      g.globalAlpha = a;
      g.fillStyle = '#b04ad0';
      g.fillRect(Math.round(self.x + 2 - cam.x), Math.round(self.y + 4 - cam.y), self.w - 4, self.h - 4);
      g.fillStyle = '#f27ad8';
      g.fillRect(Math.round(self.x + 5 - cam.x), Math.round(self.y + 7 - cam.y), self.w - 10, self.h - 10);
      g.globalAlpha = 1;
    };
    world.actors.push(c);
    return c;
  }

  // A Warden picker: slow on its stilts, but its picking arm reaches far. The arm glows before it shoots out.
  function updatePicker(world, e, px, py, dist) {
    const p = world.player;
    const ex = e.x + e.w / 2;
    const level = Math.abs(py - (e.y + 12)) < 22;
    if (e.state === 'reach') {
      e.vx = 0;
      if (--e.timer === 0) {
        e.state = 'pick';
        e.timer = 14;
        HA.audio.play('snip');
      }
    } else if (e.state === 'pick') {
      const arm = { x: e.facing > 0 ? e.x + e.w : e.x - 44, y: e.y + 9, w: 44, h: 5 };
      if (!p.dead && HA.overlap(arm, p)) world.hurtPlayer(2, ex);
      if (--e.timer === 0) {
        e.state = 'rest';
        e.timer = 50;
      }
    } else {
      if (e.state === 'rest' && --e.timer <= 0) e.state = null;
      const awake = dist < 150 && Math.abs(py - (e.y + e.h / 2)) < 50 && !p.dead;
      if (awake && !e.state) e.facing = HA.sign(px - ex);
      const want = awake && !e.state && Math.abs(px - ex) > 30 ? e.facing * 0.3 : 0;
      e.vx = approach(e.vx, want, 0.03);
      if (awake && !e.state && level && Math.abs(px - ex) < 52) {
        e.state = 'reach';
        e.timer = 34;
        HA.audio.play('telegraph');
      }
    }
    walk(world, e);
  }

  // The Bloomsworn: a dosed soldier. On seeing the hero it roars, charges in a frenzy for up to 8 seconds,
  // then staggers, spent, and takes extra damage while it sways.
  function updateBloomsworn(world, e, px, py, dist) {
    const p = world.player;
    const ex = e.x + e.w / 2;
    const sees = dist < 150 && Math.abs(py - (e.y + e.h / 2)) < 30 && !p.dead;
    if (world.state.bloom >= 3 && dist < 120 && e.t % 240 === 0) world.floatText(ex, e.y - 6, THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)], 'rgba(242,122,216,0.6)');
    switch (e.state) {
      case 'roar':
        e.vx = 0;
        if (--e.timer === 0) {
          e.state = 'charge';
          e.timer = 480;
          e.turn = 0;
        }
        break;
      case 'charge': {
        // It turns toward the hero only now and then, so a jump over it buys time.
        if (--e.turn <= 0) {
          e.turn = 40;
          e.facing = HA.sign(px - ex);
        }
        e.vx = approach(e.vx, e.facing * 2, 0.12);
        if (world.time % 6 === 0) world.particles.push({ x: ex - e.facing * 4, y: e.y + e.h - 1, vx: -e.facing * 0.4, vy: -0.3, life: 12, max: 12, color: '#b04ad0', size: 1, grav: 0 });
        if (--e.timer <= 0) {
          e.state = 'stagger';
          e.timer = 120;
        }
        break;
      }
      case 'stagger':
        e.vx = approach(e.vx, 0, 0.1);
        if (--e.timer <= 0) {
          e.state = 'rest';
          e.timer = 60;
        }
        break;
      default:
        if (e.state === 'rest' && --e.timer <= 0) e.state = null;
        e.vx = approach(e.vx, Math.sin(e.t * 0.01) * 0.3, 0.02);
        if (e.vx) e.facing = HA.sign(e.vx);
        if (sees && !e.state) {
          e.state = 'roar';
          e.timer = 30;
          e.facing = HA.sign(px - ex);
          e.alert = 30;
          HA.audio.play('roar');
        }
    }
    const hit = walk(world, e);
    if (e.state === 'charge' && (hit.ledge || hit.left || hit.right)) {
      e.facing = -e.facing;
      e.turn = 40;
    }
  }

  // A Bloom rat scurries back and forth, turning at walls and edges. One that sees the hero on its own level
  // rushes them, and the rest of its pack soon follows.
  function updateRat(world, e, px, py, dist) {
    const p = world.player;
    const level = Math.abs(py - (e.y + e.h / 2)) < 18;
    const rush = level && dist < 120 && !p.dead;
    if (rush && e.t % 24 === 0) e.dir = HA.sign(px - (e.x + e.w / 2));
    e.vx = approach(e.vx, e.dir * (rush ? 1.5 : 0.75), 0.18);
    const hit = walk(world, e);
    if (hit.ledge || hit.left || hit.right) e.dir = -e.dir;
    e.facing = e.dir;
  }

  // A cargo drone flies its line, turning at walls. Passing over the hero, its lamp blinks, then it lets a
  // bolt fall.
  function updateDrone(world, e, px, py) {
    const room = world.room;
    if (e.tele > 0) {
      if (--e.tele === 0) {
        world.shots.push({ owner: 'enemy', kind: 'orb', x: e.x + e.w / 2, y: e.y + e.h + 2, vx: 0, vy: 1.5, life: 140, dmg: 2, pierce: 0, hits: new Set() });
        HA.audio.play('orb');
      }
    } else {
      e.x += e.dir * 0.7;
      const ahead = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      if (ahead < 0 || ahead > room.pw || room.solidAt(ahead, e.y + e.h / 2)) e.dir = -e.dir;
      if (--e.cool <= 0 && Math.abs(px - (e.x + e.w / 2)) < 8 && py > e.y && py - e.y < 110 && !world.player.dead) {
        e.cool = 120;
        e.tele = 26;
        HA.audio.play('telegraph');
      }
    }
    e.y = e.homeY + Math.sin((e.t + e.spawn.tx * 7) * 0.06) * 3;
    e.facing = e.dir;
  }

  const wallAt = (room, tx, ty) => {
    const t = room.tile(tx, ty);
    return t === HA.room.SOLID || t === HA.room.CRATE;
  };

  // A Bloomsworn climber clings to the shaft wall beside its spot, and climbs toward the hero's height. Level
  // with them and out from the wall, it tenses (its '!'), then throws itself off at them, and rushes along the
  // floor where it lands. Running into a wall again, it climbs back up.
  function updateClimber(world, e, px, py, dist) {
    const room = world.room;
    const p = world.player;
    const ex = e.x + e.w / 2;
    if (e.wall === undefined) {
      e.wall = wallAt(room, e.spawn.tx - 1, e.spawn.ty) ? -1 : wallAt(room, e.spawn.tx + 1, e.spawn.ty) ? 1 : 0;
      e.grip = e.wall !== 0;
      if (e.grip) e.x = e.wall < 0 ? e.spawn.tx * 8 : (e.spawn.tx + 1) * 8 - e.w;
      e.homeY = e.y;
    }
    if (e.grip) {
      e.facing = -e.wall;
      e.vx = 0;
      e.vy = 0;
      if (e.tele > 0) {
        if (--e.tele === 0) {
          e.grip = false;
          e.vx = -e.wall * 2.2;
          e.vy = -2.2;
          e.state = 'leap';
          HA.audio.play('lunge');
        }
        return;
      }
      // Along the wall toward the hero's height, as far as the wall goes.
      const wx = e.wall < 0 ? Math.floor(e.x / 8) - 1 : Math.floor((e.x + e.w) / 8);
      const holds = (y) => {
        for (let ty = Math.floor(y / 8); ty <= Math.floor((y + e.h - 1) / 8); ty++) if (!wallAt(room, wx, ty)) return false;
        return true;
      };
      const want = clamp(py - e.h / 2, e.homeY - 72, e.homeY + 72);
      const dy = clamp(want - e.y, -0.55, 0.55);
      const clear = (y) => {
        for (let ty = Math.floor(y / 8); ty <= Math.floor((y + e.h - 1) / 8); ty++) {
          for (let tx = Math.floor(e.x / 8); tx <= Math.floor((e.x + e.w - 1) / 8); tx++) if (wallAt(room, tx, ty)) return false;
        }
        return true;
      };
      e.climbing = Math.abs(dy) > 0.1 && holds(e.y + dy) && clear(e.y + dy);
      if (e.climbing) e.y += dy;
      const level = Math.abs(py - (e.y + e.h / 2)) < 16;
      const out = (px - ex) * e.facing > 6;
      if (--e.cool <= 0 && level && out && Math.abs(px - ex) < 120 && !p.dead) {
        e.cool = 110;
        e.tele = 28;
        e.alert = 28;
        HA.audio.play('telegraph');
      }
      return;
    }
    // Off the wall: in the air from a leap or a fall, then a rush along the floor.
    if (e.state === 'leap') {
      e.vy = Math.min(e.vy + 0.22, 4);
      const hit = HA.room.move(room, e, e.vx, e.vy);
      if (hit.left || hit.right) e.vx = 0;
      if (hit.down) {
        e.vy = 0;
        e.state = 'rush';
        e.timer = 150;
        e.turn = 0;
      }
      return;
    }
    if (e.state === 'rush') {
      if (--e.turn <= 0) {
        e.turn = 40;
        e.facing = sign(px - ex) || e.facing;
      }
      e.vx = approach(e.vx, e.facing * 1.4, 0.1);
      if (--e.timer <= 0) e.state = 'prowl';
    } else {
      e.state = 'prowl';
      e.vx = approach(e.vx, e.facing * 0.4, 0.05);
    }
    const hit = walk(world, e);
    if (hit.left || hit.right) {
      // a wall: up it again
      const side = hit.left ? -1 : 1;
      e.wall = side;
      e.grip = true;
      e.homeY = e.y;
      e.cool = 60;
      e.state = null;
    } else if (hit.ledge) e.facing = -e.facing;
  }

  // A steam drone hangs over the hero, drifting to stay above them, and when it's right overhead it hisses, then
  // blasts a column of steam straight down.
  function updateSteamer(world, e, px, py, dist) {
    const p = world.player;
    const ex = e.x + e.w / 2;
    if (e.tele > 0) {
      e.vx = approach(e.vx, 0, 0.1);
      e.vy = approach(e.vy, 0, 0.1);
      if (--e.tele === 0) {
        HA.audio.play('steam');
        HA.hazards.add(world, { kind: 'steam', x: ex - 5, y: e.y + e.h, w: 10, h: 48, life: 36, armed: true, dmg: 2 });
        e.cool = 140;
      }
      return;
    }
    const chase = dist < 150 && py > e.y && !p.dead;
    const tx = chase ? px - e.w / 2 : e.homeX;
    const ty = chase ? Math.max(e.homeY - 48, Math.min(e.homeY + 48, p.y - 34)) : e.homeY;
    e.vx = clamp(e.vx + sign(tx - e.x) * 0.03, -0.7, 0.7);
    e.vy = clamp(e.vy + sign(ty - e.y) * 0.03, -0.5, 0.5);
    const hit = HA.room.move(world.room, e, e.vx, e.vy + Math.sin(e.t * 0.08) * 0.15);
    if (hit.left || hit.right) e.vx = 0;
    if (hit.up || hit.down) e.vy = 0;
    e.facing = sign(px - ex) || 1;
    if (--e.cool <= 0 && chase && Math.abs(px - ex) < 10 && p.y > e.y + e.h && p.y - e.y < 64) {
      e.tele = 30;
      HA.audio.play('hiss');
      HA.hazards.add(world, { kind: 'steam', x: ex - 5, y: e.y + e.h, w: 10, h: 48, life: 30, armed: false, dmg: 0 });
    }
  }

  // A heat slug crawls its floor, turning at walls and ledges, and leaves embers behind it that burn for a while.
  function updateSlug(world, e) {
    if (!e.dir) e.dir = Math.random() < 0.5 ? -1 : 1;
    e.vx = e.dir * 0.3;
    const hit = walk(world, e);
    if (hit.left || hit.right || hit.ledge) e.dir = -e.dir;
    e.facing = e.dir;
    if (hit.down && e.t % 26 === 0) {
      const tail = e.facing > 0 ? e.x - 6 : e.x + e.w - 2;
      HA.hazards.add(world, { kind: 'ember', x: tail, y: e.y + e.h - 4, w: 8, h: 4, life: 150, dmg: 2 });
    }
  }

  // A stack-crawler hangs under a container until the hero passes below. It shakes loose, drops, and then
  // crawls after them.
  function updateDropper(world, e, px, py, dist) {
    const p = world.player;
    if (e.cling) {
      const below = py > e.y && py - e.y < 120 && Math.abs(px - (e.x + e.w / 2)) < 22;
      if (e.tele > 0) {
        e.x = e.homeX + (e.tele % 4 < 2 ? -1 : 1);
        if (--e.tele === 0) {
          e.cling = false;
          e.x = e.homeX;
          e.vy = 0.5;
          HA.audio.play('swipe');
        }
      } else if (below && !p.dead) {
        e.tele = 24;
        HA.audio.play('telegraph');
      }
      return;
    }
    if (e.onGround) e.vx = approach(e.vx, HA.sign(px - (e.x + e.w / 2)) * (dist < 140 ? 0.55 : 0.25), 0.05);
    const hit = walk(world, e);
    e.onGround = hit.down;
    if (hit.down && !e.landed) {
      e.landed = true;
      world.dust(e.x + e.w / 2, e.y + e.h, 5);
      world.shake(1.2);
      HA.audio.play('land');
    }
    if (e.vx) e.facing = HA.sign(e.vx);
  }

  // A silt eel stays in its water: it sways along near home, and when the hero is in the water close by, it curls
  // and lunges.
  function updateEel(world, e, px, py, dist) {
    const room = world.room;
    const p = world.player;
    const wet = (x, y) => room.tile(Math.floor(x / 8), Math.floor(y / 8)) === HA.room.WATER;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    if (e.cool > 0) e.cool--;
    if (e.tele > 0) {
      e.vx = 0;
      e.vy = 0;
      if (--e.tele === 0) {
        const a = Math.atan2(py - cy, px - cx);
        e.vx = Math.cos(a) * 2.2;
        e.vy = Math.sin(a) * 2.2;
        e.lunge = 30;
        HA.audio.play('swipe');
      }
    } else if (e.lunge > 0) {
      e.lunge--;
      e.vx *= 0.97;
      e.vy *= 0.97;
    } else {
      e.vx = approach(e.vx, e.dir * 0.5, 0.05);
      e.vy = approach(e.vy, Math.sin(e.t * 0.05) * 0.3, 0.05);
      if (Math.abs(e.x - e.homeX) > 40) e.dir = sign(e.homeX - e.x);
      if (p.wet && dist < 80 && e.cool <= 0 && !p.dead) {
        e.cool = 110;
        e.tele = 20;
        HA.audio.play('telegraph');
      }
    }
    if (!wet(cx + e.vx + sign(e.vx) * (e.w / 2), cy)) {
      e.vx = -e.vx;
      e.dir = sign(e.vx || -e.dir);
      e.lunge = 0;
    }
    if (!wet(cx, cy + e.vy + sign(e.vy) * (e.h / 2))) e.vy = -e.vy * 0.5;
    e.x += e.vx;
    e.y += e.vy;
    e.facing = sign(e.vx || e.dir);
  }

  // A Bloom jelly drifts: a pulse lifts it, then it sinks a little, and it leans after the hero when near.
  function updateJelly(world, e, px, py, dist) {
    const chase = dist < 110 && !world.player.dead;
    const tx = chase ? px : e.homeX + 5 + Math.sin(e.t * 0.012) * 20;
    const ty = chase ? py - 6 : e.homeY + 5;
    if ((e.t + e.spawn.tx * 11) % 80 === 0 && e.y + e.h / 2 > ty) {
      e.vy = -0.9;
      e.pulse = 12;
    }
    if (e.pulse > 0) e.pulse--;
    e.vy = Math.min(e.vy + 0.012, 0.3);
    e.vx = approach(e.vx, clamp((tx - (e.x + e.w / 2)) * 0.01, -0.3, 0.3), 0.01);
    const hit = HA.room.move(world.room, e, e.vx, e.vy);
    if (hit.left || hit.right) e.vx = -e.vx;
    if (hit.down) e.vy = -0.4;
    e.facing = 1;
  }

  // A drowned Warden walks at the hero, slowly. Hit, it swells, and a moment later it bursts. Returns true once it
  // has burst.
  function updateDrowned(world, e, px, py, dist) {
    if (e.fuse > 0) {
      e.vx = 0;
      walk(world, e);
      if (--e.fuse === 0) {
        burstDrowned(world, e);
        return true;
      }
      return false;
    }
    const near = dist < 140 && Math.abs(py - (e.y + e.h / 2)) < 40 && !world.player.dead;
    if (near) e.facing = sign(px - (e.x + e.w / 2));
    e.vx = approach(e.vx, near ? e.facing * 0.3 : 0, 0.02);
    walk(world, e);
    return false;
  }

  function burstDrowned(world, e) {
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const p = world.player;
    if (Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < 28) world.hurtPlayer(3, cx);
    for (const o of world.enemies) {
      if (o === e || o.dead || o.boss || Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) > 28) continue;
      world.hurtEnemy(o, 6, sign(o.x + o.w / 2 - cx));
    }
    world.burst(cx, cy, ['#6fd0b8', '#3f7a4a', '#ffffff', '#b04ad0'], 22, 2.4);
    world.flashes.push({ x: cx, y: cy, life: 4, r: 6 });
    world.shake(3);
    HA.audio.play('blast');
    kill(world, e);
  }

  // A Warden turret: it turns to follow the hero below it, paints them with a sight line while it winds up, then
  // fires a burst of three. One the Steward holds (e.held) fires only on his word (e.order).
  function updateTurret(world, e, px, py, dist) {
    const p = world.player;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h - 2;
    const want = clamp(Math.atan2(py - ey, px - ex), 0.2, Math.PI - 0.2);
    if (e.aim === undefined) e.aim = Math.PI / 2;
    if (e.burst > 0) {
      if (--e.gap <= 0) {
        e.gap = 7;
        e.burst--;
        world.shots.push({ owner: 'enemy', kind: 'round', x: ex + Math.cos(e.aim) * 7, y: ey + Math.sin(e.aim) * 7, vx: Math.cos(e.aim) * 2.6, vy: Math.sin(e.aim) * 2.6, life: 140, dmg: 2, pierce: 0, hits: new Set() });
        HA.audio.play('turret');
      }
      return;
    }
    if (e.tele > 0) {
      // it keeps tracking, slower, and holds still for the last moment before it fires
      if (e.tele > 12) e.aim += clamp(want - e.aim, -0.02, 0.02);
      if (--e.tele === 0) {
        e.burst = 3;
        e.gap = 0;
      }
      return;
    }
    e.aim += clamp(want - e.aim, -0.04, 0.04);
    if (e.cool > 0) e.cool--;
    const ready = e.held ? e.order : e.cool <= 0 && dist < 170 && py > ey;
    if (ready && !p.dead) {
      e.order = false;
      e.cool = 150 + Math.floor(Math.random() * 40);
      e.tele = 40;
      HA.audio.play('telegraph');
    }
  }

  // The honour guard: shield up, it closes on a hero on its level, then pulls back its pike and lunges. Shots that
  // meet the shield glance off; from behind, or while it recovers from a lunge with the shield down, it can be hurt.
  // Dosed by the Steward's word (e.dosed), it throws the shield away and comes on twice as fast.
  function updateGuard(world, e, px, py, dist) {
    const p = world.player;
    const ex = e.x + e.w / 2;
    const level = Math.abs(py - (e.y + e.h / 2)) < 28;
    const sees = dist < (e.dosed ? 240 : 150) && level && !p.dead;
    const speed = e.dosed ? 1.1 : 0.45;
    switch (e.state) {
      case 'wind':
        e.vx = approach(e.vx, 0, 0.2);
        if (--e.timer <= 0) {
          e.state = 'lunge';
          e.timer = 12;
          HA.audio.play('lunge');
        }
        break;
      case 'lunge':
        e.vx = e.facing * (e.dosed ? 3.2 : 2.6);
        if (--e.timer <= 0) {
          e.state = 'open';
          e.timer = e.dosed ? 30 : 50;
        }
        break;
      case 'open':
        e.vx = approach(e.vx, 0, 0.15);
        if (--e.timer <= 0) e.state = null;
        break;
      default:
        if (sees) {
          if (Math.abs(px - ex) > 4) e.facing = HA.sign(px - ex);
          e.vx = approach(e.vx, Math.abs(px - ex) > 30 ? e.facing * speed : 0, 0.05);
          if (Math.abs(px - ex) < (e.dosed ? 56 : 44) && --e.cool <= 0) {
            e.state = 'wind';
            e.timer = e.dosed ? 16 : 24;
            e.cool = e.dosed ? 30 : 60;
            e.vx = 0;
            HA.audio.play('telegraph');
          }
        } else {
          e.vx = approach(e.vx, Math.sin(e.t * 0.012) * 0.25, 0.02);
          if (Math.abs(e.vx) > 0.05) e.facing = HA.sign(e.vx);
        }
    }
    e.shield = !e.dosed && e.state !== 'open' && e.state !== 'lunge';
    const hit = walk(world, e);
    if (hit.ledge || hit.left || hit.right) {
      e.vx = 0;
      if (e.state === 'lunge') e.timer = 0;
    }
    // the pike, out in front while it lunges
    if (e.state === 'lunge' && !p.dead) {
      const tip = { x: e.facing > 0 ? e.x + e.w : e.x - 14, y: e.y + 6, w: 14, h: 3 };
      if (HA.overlap(tip, p)) world.hurtPlayer(3, ex);
    }
  }

  function hurtEnemy(world, e, dmg, dir) {
    if (e.dead) return;
    if (e.boss) return HA.bosses[e.type].hurt(world, e, dmg, dir);
    if (e.type === 'drowned') {
      // The first hit starts it swelling; killing it sets it off at once.
      e.hp -= dmg;
      e.flash = 5;
      if (!e.fuse) {
        e.fuse = 45;
        HA.audio.play('swell');
      }
      if (e.hp <= 0) e.fuse = 1;
      world.burst(e.x + e.w / 2, e.y + e.h / 2, ['#6fd0b8', '#ffffff'], 3, 1.2);
      return;
    }
    if (e.type === 'bloomsworn' && e.state === 'stagger') dmg = Math.ceil(dmg * 1.5);
    // A shot into a guard's shield glances off.
    if (e.type === 'guard' && e.shield && dir === -e.facing) {
      HA.audio.play('tink');
      world.burst(e.x + e.w / 2 + e.facing * 7, e.y + 8, ['#fff0a8', '#a9b6cc'], 3, 1);
      return;
    }
    e.hp -= dmg;
    e.flash = 5;
    if (e.type === 'crawler') e.vx = 0.45 * sign(e.vx) || 0.45;
    else if (e.type === 'walker') e.angry = true;
    else if (e.type === 'pod') {
      if (e.hp <= 0 && e.state !== 'spent') burstPod(world, e);
    } else if (e.type === 'picker' || e.type === 'bloomsworn') {
      if (!e.state) e.facing = -dir || e.facing;
    } else if (e.type === 'dropper') {
      // shot down from its perch
      if (e.cling) Object.assign(e, { cling: false, tele: 0, x: e.homeX, vy: 0.5 });
    } else if (e.type === 'climber') {
      // shot off the wall, it drops and comes at the hero from the floor
      if (e.grip) Object.assign(e, { grip: false, tele: 0, state: 'leap', vx: 0, vy: 0.5 });
    } else if (e.type === 'guard') {
      // hit from behind, it turns
      if (!e.state) e.facing = -dir || e.facing;
    } else if (e.type !== 'turret') {
      e.x += dir * 1.5;
    }
    world.burst(e.x + e.w / 2, e.y + e.h / 2, ['#f27ad8', '#ffffff'], 3, 1.2);
    if (e.hp <= 0) kill(world, e);
    else HA.audio.play('hit');
  }

  // Something dies: it bursts, drops its shards (and sometimes a heart), and comes back later out of sight.
  function kill(world, e) {
    e.dead = true;
    if (e.spawn.respawn >= 0) e.spawn.respawn = 300; // in a room where nothing comes back (-1), it stays dead
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    world.burst(cx, cy, ['#f27ad8', '#b04ad0', '#5c2479', '#fff0a8'], 16, 2.2);
    const d = ENEMY[e.type].drops;
    for (let i = 0; i < d.small; i++) world.pickups.push(makeShard(cx, cy, false));
    for (let i = 0; i < d.big; i++) world.pickups.push(makeShard(cx, cy, true));
    if (Math.random() < d.heart && world.player.hp < world.player.maxHp) world.pickups.push(makeHeart(cx, cy));
    HA.bloom.onKill(world);
    world.shake(2);
    world.freeze(3);
    HA.audio.play('kill');
  }

  function drawEnemy(ctx, world, e, cam) {
    if (e.boss) return HA.bosses[e.type].draw(ctx, world, e, cam);
    if (e.type === 'pod') return drawPod(ctx, world, e, cam);
    const frames = e.grip ? HA.art.enemies.climberGrip : HA.art.enemies[e.type];
    const walking = (e.type !== 'walker' && e.type !== 'picker' && e.type !== 'bloomsworn' && e.type !== 'guard' && e.type !== 'turret' && !e.cling && !e.grip) || Math.abs(e.vx) > 0.05 || (e.grip && e.climbing);
    const pace = { crawler: 10, rat: 5, drone: 3, dropper: 9, eel: 8, jelly: 12, drowned: 18, climber: e.state === 'rush' ? 5 : 10, steamer: 4, slug: 14, guard: e.dosed ? 6 : 12 }[e.type] || (e.state === 'charge' ? 5 : 14);
    let spr = frames[walking && !(e.stun > 0) ? Math.floor(e.t / pace) % frames.length : 0];
    if (e.type === 'bloomsworn' && e.state === 'stagger') spr = HA.art.enemies.bloomswornStagger;
    const img = e.flash > 0 ? spr.white : spr.img;
    const x = Math.round(e.x + e.w / 2 - cam.x);
    const y = Math.round(e.y + e.h - spr.h - cam.y);
    ctx.save();
    ctx.translate(x, y);
    // A clinging stack-crawler hangs upside down from the container above it.
    if (e.cling) {
      ctx.translate(0, spr.h);
      ctx.scale(e.facing, -1);
    } else ctx.scale(e.facing, 1);
    ctx.drawImage(img, -Math.floor(spr.w / 2), 0);
    ctx.restore();
    // A stunned thing, reeled in on the harpoon's line, sees stars.
    if (e.stun > 0 && Math.floor(e.t / 6) % 2) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x - 3, y - 3, 1, 1);
      ctx.fillRect(x + 3, y - 4, 1, 1);
    }
    // A drowned Warden swelling to burst, and an eel curling to lunge.
    if (e.type === 'drowned' && e.fuse > 0 && Math.floor(e.fuse / (e.fuse < 15 ? 2 : 5)) % 2 === 0) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(spr.white, x - Math.floor(spr.w / 2), y);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#6fd0b8';
      ctx.fillRect(x - 8, y + 6, 1, 1);
      ctx.fillRect(x + 7, y + 4, 1, 1);
    }
    if (e.type === 'eel' && e.tele > 0 && Math.floor(e.tele / 3) % 2 === 0) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x + e.facing * 5, y + 1, 2, 2);
    }
    if (e.type === 'drone' && e.tele > 0 && Math.floor(e.tele / 4) % 2 === 0) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x - 2, y + 4, 4, 1);
      ctx.fillRect(x - 1, y + 8, 2, 2);
    }
    // Warden telegraph: the eye glows before it fires.
    if (e.type === 'warden' && e.tele > 0 && Math.floor(e.tele / 4) % 2 === 0) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x - 3, y + 4, 6, 2);
    }
    if (e.type === 'walker' && e.tele > 0 && Math.floor(e.tele / 4) % 2 === 0) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x + (e.facing > 0 ? 0 : -4), y + 3, 4, 2);
    }
    if (e.type === 'picker') drawPickerArm(ctx, world, e, x, y);
    if (e.type === 'turret') drawTurret(ctx, world, e, cam);
    if (e.type === 'guard') drawGuardKit(ctx, world, e, x, y);
    if (e.type === 'steamer' && e.tele > 0 && Math.floor(e.tele / 3) % 2 === 0) {
      ctx.fillStyle = '#eef4f6';
      ctx.fillRect(x - 1, y + spr.h, 2, 2);
    }
    if ((e.type === 'bloomsworn' && e.state === 'roar') || (e.type === 'climber' && e.alert > 0) || (e.type === 'bloomsworn' && e.alert > 0)) {
      if (e.alert > 0) e.alert--;
      HA.font.draw(ctx, '!', x, y - 10, '#f27ad8', { align: 'center' });
    }
  }

  // A turret's barrel, pointed where it aims, and its sight line while it winds up.
  function drawTurret(ctx, world, e, cam) {
    const cx = Math.round(e.x + e.w / 2 - cam.x);
    const cy = Math.round(e.y + e.h - 2 - cam.y);
    const a = e.aim === undefined ? Math.PI / 2 : e.aim;
    if (e.tele > 0 && (e.tele > 12 || Math.floor(e.tele / 2) % 2)) {
      ctx.globalAlpha = e.tele > 12 ? 0.35 : 0.8;
      ctx.fillStyle = '#e8434f';
      for (let d = 8; d < 200; d += 2) ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 1, 1);
      ctx.globalAlpha = 1;
    }
    for (let d = 2; d < 8; d++) {
      ctx.fillStyle = d < 7 ? '#3a4258' : '#10121c';
      ctx.fillRect(Math.round(cx + Math.cos(a) * d) - 1, Math.round(cy + Math.sin(a) * d) - 1, 2, 2);
    }
    if (e.burst > 0 && e.gap > 4) {
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(Math.round(cx + Math.cos(a) * 9) - 1, Math.round(cy + Math.sin(a) * 9) - 1, 3, 3);
    }
  }

  // The honour guard's shield (up in front, or lowered while it recovers) and its pike (upright, drawn back while
  // it winds up, thrust out in the lunge). A dosed guard has thrown the shield away.
  function drawGuardKit(ctx, world, e, x, y) {
    const f = e.facing;
    if (!e.dosed) {
      const sx = x + (f > 0 ? 4 : -8);
      const low = e.state === 'open' ? 6 : 0;
      ctx.fillStyle = '#10121c';
      ctx.fillRect(sx, y + 4 + low, 5, 12 - low);
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#6c7894';
      ctx.fillRect(sx + 1, y + 5 + low, 3, 10 - low);
      ctx.fillStyle = '#ffb84d';
      ctx.fillRect(sx + 1, y + 5 + low, 3, 1);
      ctx.fillRect(sx + 2, y + 8 + low, 1, 3);
    }
    ctx.fillStyle = '#a9b6cc';
    if (e.state === 'lunge') {
      ctx.fillRect(f > 0 ? x + 2 : x - 20, y + 7, 18, 1);
      ctx.fillStyle = '#eef4f6';
      ctx.fillRect(f > 0 ? x + 18 : x - 22, y + 6, 4, 3);
    } else {
      const back = e.state === 'wind' ? -5 : 0;
      const px = x - f * 5 + f * back;
      ctx.fillRect(px, y - 4, 1, 18);
      ctx.fillStyle = '#eef4f6';
      ctx.fillRect(px - 1, y - 6, 3, 3);
    }
    if (e.dosed && Math.floor(world.time / 6) % 2) {
      ctx.fillStyle = '#f27ad8';
      ctx.fillRect(x - 3, y + 3, 1, 1);
      ctx.fillRect(x + 2, y + 3, 1, 1);
    }
  }

  // The picker's arm: folded, glowing while it winds up, then shot out to its full reach.
  function drawPickerArm(ctx, world, e, x, y) {
    const f = e.facing;
    const ay = y + 9;
    const glow = e.state === 'reach' && Math.floor(e.timer / 4) % 2 === 0;
    const len = e.state === 'pick' ? 44 : 6;
    ctx.fillStyle = '#10121c';
    ctx.fillRect(f > 0 ? x + 4 : x - 4 - len, ay - 1, len, 4);
    ctx.fillStyle = glow ? '#fff0a8' : '#a9b6cc';
    ctx.fillRect(f > 0 ? x + 4 : x - 4 - len, ay, len, 2);
    // the pickers' pincers
    ctx.fillStyle = glow ? '#fff0a8' : '#6c7894';
    const tip = f > 0 ? x + 4 + len : x - 4 - len - 3;
    ctx.fillRect(tip, ay - 2, 3, 2);
    ctx.fillRect(tip, ay + 2, 3, 2);
  }

  // A spore pod: a bulb on a short stalk that breathes, swells pink before it bursts, and lies flat once spent.
  function drawPod(ctx, world, e, cam) {
    const x = Math.round(e.x - cam.x);
    const y = Math.round(e.y + e.h - cam.y);
    const flash = e.flash > 0;
    if (e.state === 'spent') {
      ctx.fillStyle = '#3d1850';
      ctx.fillRect(x + 1, y - 2, 8, 2);
      ctx.fillStyle = '#5c2479';
      ctx.fillRect(x + 3, y - 3, 4, 1);
      return;
    }
    const swell = e.state === 'swell' ? Math.min(3, Math.floor((40 - e.timer) / 10)) : Math.floor(e.t / 30) % 2;
    const r = 3 + swell;
    const cx = x + 5;
    const cy = y - 3 - r;
    ctx.fillStyle = '#2a4a33';
    ctx.fillRect(cx, y - 3, 1, 3);
    ctx.fillStyle = flash ? '#ffffff' : '#10121c';
    ctx.fillRect(cx - r - 1, cy - r, r * 2 + 3, r * 2 + 1);
    ctx.fillStyle = flash ? '#ffffff' : e.state === 'swell' && Math.floor(e.timer / 4) % 2 ? '#f27ad8' : '#b04ad0';
    ctx.fillRect(cx - r, cy - r + 1, r * 2 + 1, r * 2 - 1);
    ctx.fillStyle = flash ? '#ffffff' : '#ffc2dc';
    ctx.fillRect(cx - 1, cy - r + 2, 2, 1);
    ctx.fillStyle = '#5c2479';
    ctx.fillRect(cx - r + 1, cy + r - 2, r * 2 - 1, 1);
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
      const w = HA.weapons.make(k.id);
      const floor = HA.weapons.DEFS[k.id].floor;
      if (floor) w.level = Math.max(w.level, floor(world)); // a launcher found after the Pruner was finished
      if (k.id === 'charges') w.ammo = HA.weapons.chargesMax(world.state);
      if (k.id === 'harpoon') world.state.abilities.grapple = true;
      p.weapons.push(w);
      p.wi = p.weapons.length - 1;
      p.charge = 0;
      world.burst(k.x + 6, k.y, ['#fff0a8', '#5fd4e8'], 20, 2);
      HA.audio.play('pickup');
      world.toast(k.message, 360);
      if (world.collected) world.collected(k);
    } else if (k.kind === 'bulb') {
      if (!HA.bloom.pickUp(world, k)) return;
      k.life = 0;
      world.burst(k.x + 4, k.y + 4, ['#f27ad8', '#b04ad0'], 10, 1.2);
      if (world.collected) world.collected(k);
    } else if (k.kind === 'capsule') {
      k.life = 0;
      p.maxHp += 4;
      p.hp = p.maxHp;
      world.burst(k.x + 4, k.y + 5, ['#ff8a8a', '#ffffff', '#b8f4ff'], 24, 2.2);
      HA.audio.play('pickup');
      world.toast('SUIT CELL · MAX HEALTH +4', 300);
      if (world.collected) world.collected(k);
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
    } else if (k.kind === 'bulb') {
      const bob = Math.round(Math.sin(k.t * 0.05) * 1);
      ctx.drawImage(I.bulb.img, x, y + bob);
      if (Math.floor(k.t / 16) % 4 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y + 1 + bob, 1, 1);
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

  HA.actors = { MOVE, ENEMY, TYPES, sporeCloud, makePlayer, updatePlayer, drawPlayer, makeEnemy, updateEnemy, hurtEnemy, drawEnemy, makeShard, makeHeart, updatePickup, drawPickup, drawPedestal };
})(window.HA);
