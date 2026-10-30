'use strict';
// What the hero became, in the Overgrown ending: the suit split open and the Bloom grown out through it, twice the
// hero's height, the visor lit pink. The player fights it as Solder (or Old Gasket, if Solder died), with the
// weapon the hero dropped. It still moves a little like the hero did.
//   Thorns  it presses a hand to the floor; pink shoots come up in a line toward the fighter, then thorns
//           burst out where they showed.
//   Leap    it crouches, then jumps at the fighter and lands hard.
//   Spores  it shakes, and spore clouds drift off it.
//   Throw   it throws a fan of thorns, the way the hero once threw Wick's lancets.
// From half health it does everything faster, and the thorns come up in two lines.
(function (HA) {
  const MAX_HP = 220;
  const STEP = Math.round(MAX_HP * 0.15);
  const FLOOR = 19 * 8;
  const SEQ = ['thorns', 'throw', 'leap', 'spores', 'thorns', 'leap', 'throw'];

  function make(world, cx, feetY) {
    return {
      boss: true,
      type: 'overgrown',
      name: 'WHAT WAS LEFT',
      x: cx - 10,
      y: feetY - 30,
      w: 20,
      h: 30,
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
      phase: 1,
      state: 'idle',
      timer: 60,
      next: 0,
      nextShards: MAX_HP - STEP,
      sprouts: [],
    };
  }
  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    updateSprouts(world, b);
    b.vy = Math.min(b.vy + 0.3, 5);
    const hit = HA.room.move(world.room, b, b.vx, b.vy);
    if (hit.down) {
      if (b.state === 'air') land(world, b);
      b.vy = 0;
    }
    if (!b.fighting || world.scene) {
      b.vx = 0;
      return;
    }
    const p = world.player;
    const fast = b.phase === 2;
    if (b.timer > 0) b.timer--;
    const px = p.x + p.w / 2;
    const bx = b.x + b.w / 2;
    switch (b.state) {
      case 'idle':
        // it lurches toward the fighter between attacks
        b.facing = HA.sign(px - bx) || b.facing;
        b.vx = Math.abs(px - bx) > 40 ? b.facing * (fast ? 0.8 : 0.55) : 0;
        if (b.timer <= 0) {
          b.vx = 0;
          const next = SEQ[b.next++ % SEQ.length];
          if (next === 'thorns') set(b, 'press', fast ? 30 : 40);
          else if (next === 'throw') set(b, 'draw', fast ? 22 : 30);
          else if (next === 'leap') set(b, 'crouch', fast ? 22 : 32);
          else set(b, 'shake', 40);
          HA.audio.play('telegraph');
        }
        break;
      case 'press':
        b.vx = 0;
        if (b.timer <= 0) {
          sprout(world, b, px, fast);
          set(b, 'idle', fast ? 60 : 80);
        }
        break;
      case 'draw':
        b.vx = 0;
        b.facing = HA.sign(px - bx) || b.facing;
        if (b.timer <= 0) {
          const a0 = Math.atan2(p.y + p.h / 2 - (b.y + 10), px - bx);
          for (const k of fast ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.2, 0, 0.2]) {
            world.shots.push({ owner: 'enemy', kind: 'lancetE', x: bx, y: b.y + 10, vx: Math.cos(a0 + k) * 2.4, vy: Math.sin(a0 + k) * 2.4, life: 150, dmg: 2, pierce: 0, hits: new Set() });
          }
          HA.audio.play('lancet');
          set(b, 'idle', fast ? 50 : 70);
        }
        break;
      case 'crouch':
        b.vx = 0;
        b.facing = HA.sign(px - bx) || b.facing;
        if (b.timer <= 0) {
          // a jump that lands where the fighter stands now
          const dx = HA.clamp(px - bx, -220, 220);
          b.vy = -5.2;
          b.vx = dx / 38;
          set(b, 'air', 0);
          HA.audio.play('roar');
        }
        break;
      case 'air':
        break;
      case 'shake':
        b.vx = 0;
        if (b.timer % 8 === 0) world.burst(bx, b.y + 8, ['#f27ad8', '#b04ad0'], 3, 1);
        if (b.timer <= 0) {
          for (let i = 0; i < (fast ? 5 : 3); i++) {
            const cx = HA.clamp(bx + (i - (fast ? 2 : 1)) * 36, 24, world.room.pw - 24);
            HA.actors.sporeCloud(world, cx, FLOOR, 22, 26, 200);
          }
          HA.audio.play('spores');
          set(b, 'idle', fast ? 50 : 70);
        }
        break;
      default:
        set(b, 'idle', 60);
    }
    if (!p.dead && HA.overlap(p, b)) world.hurtPlayer(3, bx);
  }

  function land(world, b) {
    b.vx = 0;
    world.shake(4);
    HA.audio.play('stomp');
    world.dust(b.x + b.w / 2, b.y + b.h, 10);
    set(b, 'idle', b.phase === 2 ? 45 : 70);
    // the landing throws a ripple along the floor both ways
    for (const dir of [-1, 1]) HA.hazards.add(world, { kind: 'ripple', x: b.x + b.w / 2 - 6 + dir * 10, y: FLOOR - 8, w: 12, h: 8, life: 40, dmg: 2, dir, update: rippleMove, draw: rippleDraw });
  }
  function rippleMove(world, h) {
    h.x += h.dir * 3;
  }
  function rippleDraw(g, world, h, cam) {
    const x = Math.round(h.x - cam.x);
    const y = Math.round(h.y - cam.y);
    g.fillStyle = '#b04ad0';
    g.fillRect(x, y + 4, h.w, 4);
    g.fillStyle = '#f27ad8';
    g.fillRect(x + 2, y + 2, h.w - 4, 2);
  }

  // Shoots come up in a line from it to the fighter (and beyond, a few at a time); then thorns burst where they were.
  function sprout(world, b, px, fast) {
    const lines = fast ? [px, px + (px < b.x ? 56 : -56)] : [px];
    for (const tx of lines) {
      const from = b.x + b.w / 2;
      const dir = HA.sign(tx - from) || 1;
      for (let i = 1; i <= 7; i++) {
        const x = from + dir * i * 22;
        if (x < 16 || x > world.room.pw - 16) break;
        b.sprouts.push({ x, t: -i * 5, life: 40 + 30 });
      }
    }
  }
  function updateSprouts(world, b) {
    for (const s of b.sprouts) {
      s.t++;
      if (s.t === 40) {
        HA.hazards.add(world, { kind: 'thornburst', x: s.x - 6, y: FLOOR - 24, w: 12, h: 24, life: 30, dmg: 3, draw: thornDraw });
        if (s.x % 3 < 1) HA.audio.play('spores');
      }
    }
    b.sprouts = b.sprouts.filter((s) => s.t < s.life);
  }
  function thornDraw(g, world, h, cam) {
    const x = Math.round(h.x - cam.x);
    const y = Math.round(h.y - cam.y);
    const up = Math.min(1, h.t / 5) * (h.life < 8 ? h.life / 8 : 1);
    const H = Math.round(h.h * up);
    g.fillStyle = '#5c2479';
    g.fillRect(x + 2, y + h.h - H, 3, H);
    g.fillRect(x + 7, y + h.h - Math.round(H * 0.7), 3, Math.round(H * 0.7));
    g.fillStyle = '#f27ad8';
    g.fillRect(x + 3, y + h.h - H, 1, 3);
    g.fillRect(x + 8, y + h.h - Math.round(H * 0.7), 1, 3);
  }

  function hurt(world, b, dmg) {
    if (!b.fighting || b.hp <= 0) return;
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 5;
    world.burst(b.x + b.w / 2, b.y + 10, ['#f27ad8', '#b04ad0', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    HA.boss.vent(world, b, STEP);
    if (b.phase === 1 && b.hp <= MAX_HP / 2) {
      b.phase = 2;
      world.flash('#f27ad8', 8);
      HA.audio.play('roar');
    }
    if (b.hp <= 0) {
      b.fighting = false;
      b.sprouts = [];
      world.hazards = world.hazards.filter((h) => h.kind !== 'thornburst' && h.kind !== 'ripple');
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      world.freeze(14);
      HA.story.onBossDefeated(world);
    }
  }

  // ---- Drawing: the suit, split, and what grew out of it ----
  function draw(g, world, b, cam) {
    const t = world.time;
    for (const s of b.sprouts) {
      if (s.t < 0 || s.t >= 40) continue;
      const x = Math.round(s.x - cam.x);
      const y = Math.round(FLOOR - cam.y);
      g.fillStyle = Math.floor(s.t / 4) % 2 ? '#f27ad8' : '#b04ad0';
      g.fillRect(x - 1, y - 2 - Math.floor(s.t / 10), 2, 2 + Math.floor(s.t / 10));
    }
    if (b.hp <= 0 && b.gone) return;
    const x = Math.round(b.x - cam.x);
    const y = Math.round(b.y - cam.y);
    const f = b.facing;
    const crouch = b.state === 'crouch' || b.state === 'press' ? 4 : 0;
    const white = b.flash > 0;
    const c = (col) => (white ? '#ffffff' : col);
    g.save();
    g.translate(x + b.w / 2, y + crouch);
    g.scale(f, 1);
    // legs, still in the suit's white
    g.fillStyle = c('#10121c');
    g.fillRect(-9, 18, 8, 12 - crouch);
    g.fillRect(2, 18, 8, 12 - crouch);
    g.fillStyle = c('#9fb6c8');
    g.fillRect(-8, 19, 6, 10 - crouch);
    g.fillRect(3, 19, 6, 10 - crouch);
    // the body, split open, the Bloom swelling out of it
    g.fillStyle = c('#10121c');
    g.fillRect(-11, 2, 22, 18);
    g.fillStyle = c('#eef4f6');
    g.fillRect(-10, 3, 20, 16);
    g.fillStyle = c('#5c2479');
    g.fillRect(-6, 6, 12, 12);
    g.fillStyle = c('#b04ad0');
    g.fillRect(-4, 8 + Math.round(Math.sin(t * 0.1)), 9, 8);
    g.fillStyle = c('#f27ad8');
    g.fillRect(-2, 10, 4, 4);
    // the head: the helmet, cracked, the visor lit pink
    g.fillStyle = c('#10121c');
    g.fillRect(-7, -8, 14, 11);
    g.fillStyle = c('#eef4f6');
    g.fillRect(-6, -7, 12, 9);
    g.fillStyle = white ? '#ffffff' : Math.floor(t / 10) % 2 ? '#f27ad8' : '#ffc2dc';
    g.fillRect(0, -5, 6, 4);
    // thorns out of its back and shoulder, swaying
    g.fillStyle = c('#5c2479');
    const sway = Math.round(Math.sin(t * 0.06) * 2);
    g.fillRect(-14, -2 + sway, 4, 10);
    g.fillRect(-18, -6 + sway, 4, 6);
    g.fillRect(8, -10, 3, 8);
    g.fillStyle = c('#f27ad8');
    g.fillRect(-18, -8 + sway, 2, 2);
    g.fillRect(9, -12, 2, 2);
    // the arm: down to the floor while it presses, back while it draws a throw
    g.fillStyle = c('#b04ad0');
    if (b.state === 'press') g.fillRect(8, 8, 4, 22 - crouch);
    else if (b.state === 'draw') g.fillRect(-16, 2, 6, 4);
    else g.fillRect(9, 6, 4, 12);
    g.restore();
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'WHAT WAS LEFT OF ME', { name: '#f27ad8', fill: '#b04ad0', back: '#2a0f36', marks: [1 / 2] });

  HA.bosses.overgrown = { MAX_HP, make, update, hurt, draw, drawBar };
})(window.HA);
