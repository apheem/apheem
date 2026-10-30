'use strict';
// Movement the hero gains on the way down and up the ship: the thruster pack, the grapple's pull, the
// pressure boots, and water (swimming is built in). The hero's update calls these hooks, and
// tests/rooms-check.js runs exactly the same code, so a room the checker passes really can be crossed with
// the abilities it was checked with. p.abilities is the save's { thruster, grapple, boots } table.
// Map legend these add to every room: ~ water   o grapple hook (a ring the harpoon can bite)
(function (HA) {
  const { approach } = HA;

  // Two packs, one choice (choice 6): Odell's burns long and steady, Bloomfire burns hot and short.
  const THRUSTERS = {
    odell: { fuel: 54, push: 0.36, rise: 1.7, exhaust: ['#ffb84d', '#fff0a8'] },
    bloomfire: { fuel: 40, push: 0.52, rise: 2.4, exhaust: ['#ff6fae', '#ffc2dc'] },
  };
  // Without boots the hero floats chest-deep, and can swim across a surface but never down into deep water.
  const SWIM = { run: 0.85, gravity: 0.1, sink: 0.6, rise: 0.3, maxRise: 1.6, depth: 6, stroke: 3.6 };
  // With the pressure boots the hero sinks, walks the bottom, and jumps heavily.
  const BOOTS = { run: 0.75, gravity: 0.16, maxFall: 2.2, jump: 3.2 };
  // The harpoon bites a hook within range near the line of aim, then winches the hero up to hang from it.
  const GRAPPLE = { range: 96, cone: 0.42, speed: 4.5, cooldown: 12 };

  const has = (p, k) => !!(p.abilities && p.abilities[k]);
  const waterAt = (room, px, py) => room.tile(Math.floor(px / 8), Math.floor(py / 8)) === HA.room.WATER;

  // Is the body in water? Its feet are what count.
  const inWater = (room, p) => waterAt(room, p.x + p.w / 2, p.y + p.h - 2);

  // The top of the water the hero is in.
  function surfaceY(room, p) {
    const tx = Math.floor((p.x + p.w / 2) / 8);
    let ty = Math.floor((p.y + p.h - 2) / 8);
    while (ty > 0 && room.tile(tx, ty - 1) === HA.room.WATER) ty--;
    return ty * 8;
  }

  // Ground speed and gravity, given the water and the boots.
  function runSpeed(p, base) {
    if (!p.wet) return base;
    return base * (has(p, 'boots') ? BOOTS.run : SWIM.run);
  }

  // Called where the hero's update would jump. Returns true if water or a hang took the press.
  function jump(world, p, input) {
    if (p.grapple) return grappleJump(world, p, input);
    if (!p.wet || has(p, 'boots')) return false;
    // Floating: every press is a stroke, strong enough to climb out onto a ledge near the surface.
    if (input.pressed.jump) {
      p.vy = -SWIM.stroke;
      p.jumping = true;
      p.jumpTime = 0;
      p.buffer = 0;
      world.burst(p.x + p.w / 2, p.y + p.h - 2, ['#9fd8e8', '#d8f4ff'], 6, 0.9);
      HA.audio.play('jump');
    }
    return true;
  }

  // Replaces normal gravity while in water or on the grapple. Returns true if it handled the fall.
  function gravity(world, p, input) {
    if (p.grapple) return true;
    if (!p.wet) return false;
    if (has(p, 'boots')) {
      p.vy = Math.min(p.vy + BOOTS.gravity, BOOTS.maxFall);
      return true;
    }
    // A stroke carries on up out of the water; otherwise the body settles chest-deep at the surface.
    if (p.jumping) {
      p.vy += SWIM.gravity;
      return true;
    }
    const want = HA.clamp((surfaceY(world.room, p) - SWIM.depth - p.y) * 0.25, -SWIM.maxRise, 2);
    p.vy = approach(p.vy, want, p.vy > want ? SWIM.sink : SWIM.rise);
    return true;
  }

  // The boots' heavier jump from the bottom of a pool.
  const jumpPower = (p, base) => (p.wet && has(p, 'boots') ? BOOTS.jump : base);

  // ---- The thruster pack: press Jump again in the air, and hold it ----
  function thruster(world, p, input) {
    const pack = THRUSTERS[p.abilities && p.abilities.thruster];
    if (!pack) return;
    if (p.onGround || p.wet || p.grapple) {
      p.fuel = pack.fuel;
      p.thrusting = false;
      return;
    }
    if (p.fuel === undefined) p.fuel = pack.fuel;
    // The press stays buffered too, so one made just before landing still jumps.
    if (input.pressed.jump && p.coyote === 0 && !p.jumping && p.fuel > 0) p.thrusting = true;
    if (p.thrusting && (!input.held.jump || p.fuel <= 0)) p.thrusting = false;
    if (!p.thrusting) return;
    p.fuel--;
    p.vy = Math.max(p.vy - pack.push - (p.vy > 0 ? 0.3 : 0), -pack.rise);
    if (world.time % 2 === 0) {
      const c = pack.exhaust[world.time % 4 ? 0 : 1];
      world.particles.push({ x: p.x + p.w / 2 - p.facing * 3, y: p.y + p.h - 2, vx: -p.facing * 0.3, vy: 1.4, life: 10, max: 10, color: c, size: 1, grav: 0 });
    }
  }

  // ---- The grapple: fired by the Grapple Harpoon (Phase 3.3), then it pulls and hangs ----
  // Aim follows the hero's: forward, up, or up and forward while Up and a direction are held.
  function fireGrapple(world, p, input) {
    if (!has(p, 'grapple') || p.grapple || (p.grappleCool || 0) > 0) return false;
    p.grappleCool = GRAPPLE.cooldown;
    const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    let ax = p.facing;
    let ay = 0;
    if (input.held.up) {
      ax = dir ? dir * 0.707 : 0;
      ay = dir ? -0.707 : -1;
    }
    const ox = p.x + p.w / 2;
    const oy = p.y + 4;
    let best = null;
    let bestScore = Infinity;
    for (const h of world.hooks || []) {
      const dx = h.x - ox;
      const dy = h.y - oy;
      const d = Math.hypot(dx, dy);
      if (d < 6 || d > GRAPPLE.range) continue;
      const off = 1 - (dx * ax + dy * ay) / d; // 0 when dead on the line of aim
      if (off > GRAPPLE.cone || !clearLine(world.room, ox, oy, h.x, h.y)) continue;
      const score = off * 200 + d;
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    }
    HA.audio.play(best ? 'harpoon' : 'empty');
    if (!best) return false;
    p.grapple = { x: best.x, y: best.y, phase: 'pull' };
    p.vx = 0;
    p.vy = 0;
    p.jumping = false;
    p.thrusting = false;
    return true;
  }

  function clearLine(room, x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (room.solidAt(x, y)) return false;
    }
    return true;
  }

  // While pulling, the hero flies to the hook; once there they hang under it until they jump or drop.
  function updateGrapple(world, p, input) {
    if ((p.grappleCool || 0) > 0) p.grappleCool--;
    const gr = p.grapple;
    if (!gr) return false;
    const tx = gr.x - p.w / 2;
    const ty = gr.y + 3;
    if (gr.phase === 'pull') {
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= GRAPPLE.speed) {
        gr.phase = 'hang';
        p.vx = 0;
        p.vy = 0;
      } else {
        const hit = HA.room.move(world.room, p, (dx / d) * GRAPPLE.speed, (dy / d) * GRAPPLE.speed);
        if (hit.left || hit.right || hit.up || hit.down) gr.phase = 'hang'; // snagged on the way: hang there
      }
    }
    if (gr.phase === 'hang') {
      p.vx = 0;
      p.vy = 0;
      const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      if (dir) p.facing = dir;
    }
    p.onGround = false;
    p.ground = false;
    return true;
  }

  // From a hang: Jump leaps off (steered by the stick), Down lets go.
  function grappleJump(world, p, input) {
    const gr = p.grapple;
    if (gr.phase !== 'hang') return true;
    if (input.pressed.jump && !input.held.down) {
      p.grapple = null;
      p.vy = -HA.actors.MOVE.jump;
      p.jumping = true;
      p.jumpTime = 0;
      p.buffer = 0;
      HA.audio.play('jump');
    } else if (input.pressed.down || (input.pressed.jump && input.held.down)) {
      p.grapple = null;
      p.vy = 0.5;
      p.buffer = 0;
    }
    return true;
  }

  // The line from the harpoon to the hook, and the thruster's fuel while it burns.
  function draw(g, world, cam) {
    const p = world.player;
    if (p.grapple && !p.dead) {
      g.strokeStyle = '#c9d6e8';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(Math.round(p.x + p.w / 2 - cam.x) + 0.5, Math.round(p.y + 4 - cam.y) + 0.5);
      g.lineTo(Math.round(p.grapple.x - cam.x) + 0.5, Math.round(p.grapple.y - cam.y) + 0.5);
      g.stroke();
    }
    const pack = THRUSTERS[p.abilities && p.abilities.thruster];
    if (pack && !p.onGround && p.fuel < pack.fuel && !p.dead) {
      const w = Math.ceil((10 * p.fuel) / pack.fuel);
      g.fillStyle = '#10121c';
      g.fillRect(Math.round(p.x - 1 - cam.x), Math.round(p.y - 6 - cam.y), 12, 3);
      g.fillStyle = pack.exhaust[0];
      g.fillRect(Math.round(p.x - cam.x), Math.round(p.y - 5 - cam.y), w, 1);
    }
  }

  // Hooks are rings set into the hull; water is drawn over everything in it, with a moving surface line.
  function drawHooks(g, world, cam) {
    for (const h of world.hooks || []) {
      const x = Math.round(h.x - cam.x);
      const y = Math.round(h.y - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x - 3, y - 3, 6, 6);
      g.fillStyle = '#a9b6cc';
      g.fillRect(x - 2, y - 2, 4, 4);
      g.fillStyle = '#10121c';
      g.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  function drawWater(g, world, cam) {
    const room = world.room;
    if (!room.hasWater) return;
    const x0 = Math.max(0, Math.floor(cam.x / 8));
    const y0 = Math.max(0, Math.floor(cam.y / 8));
    const x1 = Math.min(room.w - 1, Math.ceil((cam.x + HA.VIEW_W) / 8));
    const y1 = Math.min(room.h - 1, Math.ceil((cam.y + HA.VIEW_H) / 8));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (room.tile(tx, ty) !== HA.room.WATER) continue;
        const x = tx * 8 - cam.x;
        const y = ty * 8 - cam.y;
        g.fillStyle = 'rgba(40,110,170,0.42)';
        g.fillRect(x, y, 8, 8);
        if (room.tile(tx, ty - 1) === HA.room.EMPTY) {
          g.fillStyle = '#9fd8e8';
          g.fillRect(x, y + ((tx + Math.floor(world.time / 20)) % 2), 8, 1);
        }
      }
    }
  }

  HA.abilities = { THRUSTERS, SWIM, BOOTS, GRAPPLE, inWater, surfaceY, runSpeed, jump, jumpPower, gravity, thruster, fireGrapple, updateGrapple, draw, drawHooks, drawWater };
})(window.HA);
