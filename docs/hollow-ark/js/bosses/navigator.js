'use strict';
// The Navigator, in its Sphere. It shows no face. Its body is its course: the loop the Ark has flown for 274
// years, drawn in light across the room, with the ship's own light running round it. The hero cuts it.
//   The loop     four nodes ride the loop. The ship's light throws motes at the hero as it passes.
//   Faster       "NOT YET." It redraws the loop, tilted, with five nodes, and faster. Now and then the whole
//                line burns (it flickers first): be off the line, or be hurt. It throws memories along it.
//   Fastest      six nodes, faster again, and the loop breathes in and out.
//   The hold     the loop opens, and its course swings out toward the world. The Navigator pulls it back. Every
//                hit on the course's head pushes it toward the world; held there long enough, it stays.
// The fight has a checkpoint at its start (see story/deck.js).
(function (HA) {
  const NAV = '#b8f4ff';
  const CYAN = '#5fd4e8';
  const CX = 160;
  const CY = 70;
  const WORLD = { x: 292, y: 34 };
  const PHASES = [
    { nodes: 4, rx: 118, ry: 40, tilt: 0, speed: 0.004, hp: 40, fire: 120, volley: 1 },
    { nodes: 5, rx: 110, ry: 46, tilt: 0.16, speed: 0.0065, hp: 40, fire: 100, volley: 2, burn: 420, spawn: 380 },
    { nodes: 6, rx: 124, ry: 38, tilt: -0.12, speed: 0.009, hp: 38, fire: 86, volley: 3, burn: 340, spawn: 320, breathe: true },
  ];
  const LOOP_HP = PHASES.reduce((t, p) => t + p.nodes * p.hp, 0);
  const STEP = Math.round(LOOP_HP * 0.12);
  const HOLD = 60 * 12; // frames the course must be held on the world, in all
  const WINDOW = 0.35; // how near the world the course's head counts as held
  const FAR = 2.9; // how far the Navigator can pull it back
  const CUT = 0.24; // half the width of the gap a cut node leaves in the loop
  const SAMPLES = 96;
  // The head's way between the world and the loop: along an ellipse, from the world (d = 0) round the bottom.
  const HEAD = { rx: 132, ry: 52 };
  const WORLD_ANGLE = Math.atan2((WORLD.y - CY) / HEAD.ry, (WORLD.x - CX) / HEAD.rx);

  function make(world, cx, cy) {
    return {
      boss: true,
      type: 'navigator',
      name: 'THE NAVIGATOR',
      x: CX - 4,
      y: CY - 4,
      w: 8,
      h: 8,
      ghost: true, // there's nothing of it to hit but its course
      hp: LOOP_HP,
      maxHp: LOOP_HP,
      shownHp: LOOP_HP,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      phase: 0,
      state: 'idle',
      timer: 0,
      t: 0,
      angle: 0,
      ship: Math.PI,
      nodes: [],
      drawn: 1,
      burnT: 300,
      tele: 0,
      burn: 0,
      fireT: 90,
      spawnT: 240,
      spawned: [],
      d: FAR,
      hold: 0,
      head: null,
      said: {},
      nextShards: LOOP_HP - STEP,
    };
  }

  // A line the Navigator says in passing, over the Sphere, without stopping the fight.
  function speak(world, b, text, frames) {
    world.navLine = { text, life: frames || 150 };
    HA.save.addTalk(world.state, 'THE NAVIGATOR', text);
  }
  const once = (world, b, key, text) => {
    if (b.said[key]) return;
    b.said[key] = true;
    speak(world, b, text);
  };

  // ---- The loop ----
  const P = (b) => PHASES[Math.min(b.phase, PHASES.length - 1)];
  function loopAt(b, a) {
    const ph = P(b);
    const k = ph.breathe ? 1 + Math.sin(b.t * 0.02) * 0.12 : 1;
    const ex = Math.cos(a) * ph.rx * k;
    const ey = Math.sin(a) * ph.ry * k;
    return { x: CX + ex * Math.cos(ph.tilt) - ey * Math.sin(ph.tilt), y: CY + ex * Math.sin(ph.tilt) + ey * Math.cos(ph.tilt) };
  }
  const wrap = (a) => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  // Where a point on the loop is cut (a node broken there leaves a gap that travels with the loop).
  const cutAt = (b, a) => b.nodes.some((n) => n.dead && Math.abs(wrap(a - (n.off + b.angle))) < CUT);

  function startPhase(world, b, i) {
    const ph = PHASES[i];
    b.phase = i;
    b.state = 'draw';
    b.drawn = 0;
    b.timer = 0;
    b.angle = 0;
    b.fireT = 90;
    b.burnT = ph.burn || 0;
    b.spawnT = ph.spawn || 0;
    b.tele = 0;
    b.burn = 0;
    for (const n of b.nodes) n.gone = true;
    b.nodes = [];
    for (let k = 0; k < ph.nodes; k++) {
      const n = { boss: true, type: 'navnode', parent: b, hp: ph.hp, maxHp: ph.hp, w: 10, h: 10, x: 0, y: 0, off: (k / ph.nodes) * Math.PI * 2 + 0.4, flash: 0, dead: false, ghost: true, spawn: { respawn: -1 }, t: 0 };
      b.nodes.push(n);
      world.enemies.push(n);
    }
    placeNodes(b);
    HA.audio.play('redraw');
  }
  function placeNodes(b) {
    for (const n of b.nodes) {
      const at = loopAt(b, n.off + b.angle);
      n.x = at.x - n.w / 2;
      n.y = at.y - n.h / 2;
    }
  }

  // What's left: the nodes still on this loop, and the loops still to come. The hold has no health, only time.
  function remaining(b) {
    if (b.phase >= PHASES.length) return 0;
    let hp = b.nodes.reduce((t, n) => t + (n.dead ? 0 : Math.max(0, n.hp)), 0);
    if (b.state === 'idle' && !b.nodes.length) hp = PHASES[0].nodes * PHASES[0].hp;
    for (let i = b.phase + 1; i < PHASES.length; i++) hp += PHASES[i].nodes * PHASES[i].hp;
    return hp;
  }

  function update(world, b) {
    b.t++;
    b.hp = remaining(b);
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.5);
    if (b.phase < PHASES.length) HA.boss.vent(world, b, STEP);
    if (world.navLine && --world.navLine.life <= 0) world.navLine = null;
    if (b.phase >= PHASES.length) return updateHold(world, b);
    if (!b.fighting || world.scene) {
      placeNodes(b);
      return;
    }
    const ph = P(b);
    if (b.state === 'draw') {
      b.drawn = Math.min(1, b.drawn + 1 / 80);
      if (b.drawn >= 1) {
        b.state = 'loop';
        for (const n of b.nodes) n.ghost = false;
      }
    } else if (b.state === 'redraw') {
      if (--b.timer <= 0) {
        if (b.phase + 1 < PHASES.length) startPhase(world, b, b.phase + 1);
        else startHold(world, b);
      }
      return;
    }
    b.angle += ph.speed;
    b.ship += ph.speed * 4.5;
    placeNodes(b);
    if (b.state !== 'loop') return;
    // the ship's light throws motes as it passes
    if (--b.fireT <= 0) {
      b.fireT = ph.fire;
      fire(world, loopAt(b, b.ship), ph.volley, 1.5);
    }
    // the line burns: a flicker, then all of it, except where it's cut
    if (ph.burn) {
      if (b.burn > 0) {
        b.burn--;
        if (onLine(world, b, 7)) world.hurtPlayer(2, world.player.x + world.player.w / 2 - world.player.facing);
      } else if (b.tele > 0) {
        if (--b.tele <= 0) {
          b.burn = 45;
          HA.audio.play('burn');
          world.shake(2);
        }
      } else if (--b.burnT <= 0) {
        b.burnT = ph.burn;
        b.tele = 60;
        HA.audio.play('telegraph');
      }
    }
    // and it throws the ship's memories of its defences along the line: drifters, washed out
    if (ph.spawn && --b.spawnT <= 0) {
      b.spawnT = ph.spawn;
      throwMemory(world, b, loopAt(b, b.ship));
    }
    if (b.nodes.every((n) => n.dead)) {
      b.state = 'redraw';
      b.timer = 110;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      HA.audio.play('relay');
      world.shake(3);
      speak(world, b, 'NOT YET.', 110);
    }
  }

  function fire(world, from, volley, speed) {
    const p = world.player;
    const a = Math.atan2(p.y + p.h / 2 - from.y, p.x + p.w / 2 - from.x);
    const spread = volley === 1 ? [0] : volley === 2 ? [-0.14, 0.14] : [-0.24, 0, 0.24];
    for (const k of spread) world.shots.push({ owner: 'enemy', kind: 'mote', x: from.x, y: from.y, vx: Math.cos(a + k) * speed, vy: Math.sin(a + k) * speed, life: 240, dmg: 2, pierce: 0, hits: new Set() });
    HA.audio.play('mote');
  }

  function throwMemory(world, b, at) {
    b.spawned = b.spawned.filter((e) => !e.dead);
    if (b.spawned.length >= 2) return;
    const tx = Math.floor(at.x / 8);
    const ty = Math.floor(at.y / 8);
    const e = HA.actors.makeEnemy({ type: 'f', x: tx * 8, y: ty * 8, tx, ty, respawn: -1 });
    b.spawned.push(e);
    world.enemies.push(e);
    world.burst(at.x, at.y, ['#dcf0f8', CYAN], 6, 1);
  }

  // Is the hero on the loop (where it isn't cut)?
  function onLine(world, b, r) {
    const p = world.player;
    const hx = p.x + p.w / 2;
    const hy = p.y + p.h / 2;
    for (let i = 0; i < SAMPLES; i++) {
      const a = (i / SAMPLES) * Math.PI * 2;
      if (cutAt(b, a)) continue;
      const q = loopAt(b, a);
      if (Math.abs(q.x - hx) < r + p.w / 2 && Math.abs(q.y - hy) < r + p.h / 2 - 2) return true;
    }
    return false;
  }

  // ---- The hold ----
  function headAt(d) {
    const a = WORLD_ANGLE + d;
    return { x: CX + Math.cos(a) * HEAD.rx, y: CY + Math.sin(a) * HEAD.ry };
  }
  function startHold(world, b) {
    b.phase = PHASES.length;
    b.state = 'open';
    b.timer = 90;
    b.d = FAR;
    b.hold = 0;
    b.fireT = 120;
    b.spawnT = 300;
    for (const n of b.nodes) n.gone = true;
    const h = { boss: true, type: 'navhead', parent: b, w: 14, h: 14, x: 0, y: 0, flash: 0, dead: false, ghost: true, spawn: { respawn: -1 }, t: 0 };
    b.head = h;
    world.enemies.push(h);
    placeHead(b);
    HA.audio.play('redraw');
    HA.music.setLayers(4);
    speak(world, b, 'NOT YET!', 120);
    world.toast('PUSH ITS COURSE ONTO THE WORLD, AND HOLD IT THERE', 220);
  }
  function placeHead(b) {
    const at = headAt(b.d);
    b.head.x = at.x - b.head.w / 2;
    b.head.y = at.y - b.head.h / 2;
  }
  function updateHold(world, b) {
    if (!b.head) return;
    placeHead(b);
    if (!b.fighting || world.scene) return;
    if (b.state === 'open') {
      // the loop opens, and its course swings out
      if (--b.timer <= 0) {
        b.state = 'hold';
        b.head.ghost = false;
      }
      b.d = FAR - (1 - b.timer / 90) * 1.6;
      return;
    }
    if (b.state !== 'hold') return;
    const frac = b.hold / HOLD;
    // the Navigator pulls its course back, harder the nearer it comes to losing
    b.d = Math.min(FAR, b.d + 0.001 + 0.001 * frac);
    if (b.d < WINDOW) b.hold = Math.min(HOLD, b.hold + 1);
    else b.hold = Math.max(0, b.hold - 0.25);
    if (b.t % 50 === 0 && b.d >= WINDOW) HA.audio.play('strain');
    if (--b.fireT <= 0) {
      b.fireT = 80 - Math.floor(frac * 20);
      fire(world, headAt(b.d), 2, 1.4);
    }
    if (--b.spawnT <= 0) {
      b.spawnT = 420;
      throwMemory(world, b, headAt(b.d));
    }
    if (frac > 0.25) once(world, b, 'h1', 'NOT YET. NOT YET.');
    if (frac > 0.5) once(world, b, 'h2', 'A LITTLE LONGER. PLEASE.');
    if (frac > 0.75) once(world, b, 'h3', 'I AM NOT READY TO BE A LAMP.');
    if (frac > 0.93) once(world, b, 'h4', '...');
    if (b.hold >= HOLD) {
      b.state = 'held';
      b.fighting = false;
      b.d = 0;
      b.head.ghost = true;
      world.shots = world.shots.filter((s) => s.owner !== 'enemy');
      for (const e of b.spawned) e.dead = true;
      world.navLine = null;
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // ---- Hits ----
  const node = {
    update(world, n) {
      n.t++;
      if (n.flash > 0) n.flash--;
      if (n.gone) n.dead = true;
    },
    hurt(world, n, dmg) {
      const b = n.parent;
      if (n.dead || n.ghost || !b.fighting || b.state !== 'loop') return;
      n.hp -= dmg;
      n.flash = 5;
      HA.audio.play('hit');
      world.burst(n.x + n.w / 2, n.y + n.h / 2, [CYAN, '#ffffff'], 3, 1.2);
      if (n.hp > 0) return;
      n.dead = true;
      HA.audio.play('cut');
      world.shake(2);
      world.burst(n.x + n.w / 2, n.y + n.h / 2, [NAV, '#ffffff', CYAN], 14, 2);
      const left = b.nodes.filter((x) => !x.dead).length;
      if (b.phase === 0) once(world, b, 'c0', 'I KNOW EVERY STAR ON THIS LOOP.');
      if (b.phase === 1 && left === 2) once(world, b, 'c1', 'THE CHARTER SAYS I AM TO BE TAKEN APART. TO LIGHT A CITY.');
      if (b.phase === 2 && left === 3) once(world, b, 'c2', 'ONE MORE LOOP. ONLY ONE MORE.');
    },
    draw(g, world, n, cam) {
      if (n.dead || n.gone) return;
      const b = n.parent;
      if (b.state === 'draw' && b.drawn < 0.9) return;
      const x = Math.round(n.x + n.w / 2 - cam.x);
      const y = Math.round(n.y + n.h / 2 - cam.y);
      const lit = n.flash > 0 ? '#ffffff' : Math.floor((world.time + n.off * 40) / 8) % 2 ? NAV : CYAN;
      g.fillStyle = '#05070c';
      for (let i = -6; i <= 6; i++) g.fillRect(x - (6 - Math.abs(i)), y + i, (6 - Math.abs(i)) * 2 + 1, 1);
      g.fillStyle = lit;
      for (let i = -5; i <= 5; i++) {
        const w = 5 - Math.abs(i);
        g.fillRect(x - w, y + i, 1, 1);
        g.fillRect(x + w, y + i, 1, 1);
      }
      g.fillStyle = n.flash > 0 ? '#ffffff' : n.hp < n.maxHp / 2 ? '#e8f8ff' : CYAN;
      g.fillRect(x - 1, y - 1, 3, 3);
    },
    drawBar() {},
  };

  const head = {
    update(world, h) {
      h.t++;
      if (h.flash > 0) h.flash--;
    },
    hurt(world, h, dmg) {
      const b = h.parent;
      if (h.ghost || b.state !== 'hold') return;
      b.d = Math.max(0, b.d - Math.min(0.12, 0.02 + 0.01 * dmg)); // a heavy hit (the Arc Coil's beam) pushes it further
      h.flash = 4;
      HA.audio.play('hit');
      world.burst(h.x + h.w / 2, h.y + h.h / 2, [CYAN, '#ffffff'], 2, 1);
    },
    draw(g, world, h, cam) {
      const b = h.parent;
      const x = Math.round(h.x + h.w / 2 - cam.x);
      const y = Math.round(h.y + h.h / 2 - cam.y);
      const held = b.d < WINDOW;
      g.strokeStyle = h.flash > 0 ? '#ffffff' : held ? '#ffffff' : NAV;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x + 0.5, y + 0.5, 6 + (Math.floor(world.time / 6) % 2), 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = held ? '#ffffff' : CYAN;
      g.fillRect(x - 2, y - 2, 5, 5);
      g.fillStyle = '#ffffff';
      g.fillRect(x - 1, y - 1, 3, 3);
    },
    drawBar() {},
  };

  // ---- Drawing: the world, the loop or the course, and the ship's light ----
  function drawWorld(g, b, cam) {
    const x = Math.round(WORLD.x - cam.x);
    const y = Math.round(WORLD.y - cam.y);
    const near = b.phase >= PHASES.length ? Math.max(0, 1 - b.d / 1.2) : 0;
    const r = 6;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      g.fillStyle = dy < -2 ? '#b8c4cc' : dy < 2 ? '#94a2ae' : '#6c7a88';
      g.fillRect(x - half, y + dy, half * 2 + 1, 1);
    }
    g.fillStyle = '#5a6878';
    g.fillRect(x - 4, y + 1, 3, 1);
    g.fillRect(x + 1, y - 2, 4, 1);
    if (near > 0) {
      g.globalAlpha = 0.15 + near * 0.35;
      g.strokeStyle = '#ffffff';
      g.beginPath();
      g.arc(x + 0.5, y + 0.5, 9 + near * 3, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    // while it's held, a ring round the world fills
    if (b.phase >= PHASES.length && b.hold > 0) {
      g.strokeStyle = NAV;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x + 0.5, y + 0.5, 12, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * b.hold) / HOLD);
      g.stroke();
      g.lineWidth = 1;
    }
  }

  function draw(g, world, b, cam) {
    drawWorld(g, b, cam);
    const t = world.time;
    if (b.phase >= PHASES.length) return drawCourse(g, world, b, cam);
    if (b.state === 'idle' && !b.fighting) return drawIdle(g, world, b, cam);
    const fade = b.state === 'redraw' ? b.timer / 110 : 1;
    const burning = b.burn > 0;
    const flicker = b.tele > 0 && Math.floor(b.tele / 4) % 2 === 0;
    for (let i = 0; i < SAMPLES; i++) {
      if (i / SAMPLES > b.drawn) break;
      const a = (i / SAMPLES) * Math.PI * 2;
      if (cutAt(b, a)) continue;
      const q = loopAt(b, a);
      const x = Math.round(q.x - cam.x);
      const y = Math.round(q.y - cam.y);
      g.globalAlpha = fade * (burning ? 1 : 0.75);
      g.fillStyle = burning ? '#ffffff' : flicker ? '#e8f8ff' : (i + Math.floor(t / 3)) % 6 === 0 ? NAV : CYAN;
      g.fillRect(x - (burning ? 1 : 0), y - (burning ? 1 : 0), burning ? 3 : 2, burning ? 3 : 2);
      if (burning && HA.settings.flashes !== 'reduced') {
        g.globalAlpha = 0.25;
        g.fillStyle = NAV;
        g.fillRect(x - 3, y - 3, 7, 7);
      }
    }
    g.globalAlpha = 1;
    if (b.state === 'loop' || b.state === 'draw') drawShip(g, world, b, cam);
  }

  // Before the fight: the loop, faint and slow, as it has been for 274 years.
  function drawIdle(g, world, b, cam) {
    g.globalAlpha = 0.45;
    for (let i = 0; i < SAMPLES; i += 2) {
      const q = loopAt(b, (i / SAMPLES) * Math.PI * 2);
      g.fillStyle = CYAN;
      g.fillRect(Math.round(q.x - cam.x), Math.round(q.y - cam.y), 1, 1);
    }
    g.globalAlpha = 1;
    b.ship += 0.006;
    drawShip(g, world, b, cam);
  }

  function drawShip(g, world, b, cam) {
    for (let k = 6; k >= 0; k--) {
      const q = loopAt(b, b.ship - k * 0.03);
      g.globalAlpha = 1 - k / 7;
      g.fillStyle = k ? CYAN : '#ffffff';
      const r = k ? 1 : 2;
      g.fillRect(Math.round(q.x - cam.x) - r, Math.round(q.y - cam.y) - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }

  // The hold: the course from the ship's light out to its head, and, near enough, on to the world.
  function drawCourse(g, world, b, cam) {
    if (!b.head) return;
    const h = { x: b.head.x + b.head.w / 2, y: b.head.y + b.head.h / 2 };
    const from = { x: CX - 60, y: CY + 30 };
    const ctrl = { x: (from.x + h.x) / 2, y: Math.max(from.y, h.y) + 30 };
    const strain = b.d >= WINDOW && b.state === 'hold';
    for (let i = 0; i <= 60; i++) {
      const k = i / 60;
      const x = (1 - k) * (1 - k) * from.x + 2 * k * (1 - k) * ctrl.x + k * k * h.x;
      const y = (1 - k) * (1 - k) * from.y + 2 * k * (1 - k) * ctrl.y + k * k * h.y;
      const jitter = strain && i % 7 === Math.floor(world.time / 3) % 7 ? 1 : 0;
      g.fillStyle = b.state === 'held' ? '#ffffff' : (i + Math.floor(world.time / 2)) % 5 === 0 ? NAV : CYAN;
      g.fillRect(Math.round(x - cam.x), Math.round(y - cam.y) - jitter, 2, 2);
    }
    // on to the world, while it's held there
    if (b.d < WINDOW || b.state === 'held') {
      g.globalAlpha = b.state === 'held' ? 1 : 0.5;
      g.fillStyle = '#ffffff';
      for (let i = 0; i <= 12; i++) {
        const x = h.x + ((WORLD.x - h.x) * i) / 12;
        const y = h.y + ((WORLD.y - h.y) * i) / 12;
        if ((i + Math.floor(world.time / 3)) % 2) g.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), 1, 1);
      }
      g.globalAlpha = 1;
    }
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(from.x - cam.x) - 2, Math.round(from.y - cam.y) - 2, 4, 4);
  }

  function drawBar(g, world, b) {
    if (b.phase < PHASES.length) {
      const cuts = [];
      let left = LOOP_HP;
      for (let i = 0; i < PHASES.length - 1; i++) {
        left -= PHASES[i].nodes * PHASES[i].hp;
        cuts.push(left / LOOP_HP);
      }
      return HA.boss.bar(g, b, 'THE NAVIGATOR', { name: NAV, fill: CYAN, back: '#0e2a34', marks: cuts });
    }
    if (b.state === 'held') return;
    // the hold: how long its course has been kept on the world
    const w = 200;
    const x = (HA.VIEW_W - w) / 2;
    const y = HA.VIEW_H - 14;
    HA.font.draw(g, 'HOLD THE COURSE ON THE WORLD', x, y - 10, NAV);
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y - 1, w + 2, 7);
    g.fillStyle = '#0e2a34';
    g.fillRect(x, y, w, 5);
    g.fillStyle = b.d < WINDOW ? '#ffffff' : NAV;
    g.fillRect(x, y, Math.round((w * b.hold) / HOLD), 5);
  }

  // The course already held on the world (back in the Sphere after the fight): no fight, no sound.
  function settle(world, b) {
    b.phase = PHASES.length;
    b.state = 'held';
    b.d = 0;
    b.hold = HOLD;
    b.head = { boss: true, type: 'navhead', parent: b, w: 14, h: 14, x: 0, y: 0, flash: 0, dead: false, ghost: true, spawn: { respawn: -1 }, t: 0 };
    world.enemies.push(b.head);
    placeHead(b);
  }

  // The fight begins: the first loop is drawn.
  function begin(world, b) {
    b.active = true;
    b.fighting = true;
    startPhase(world, b, 0);
  }

  HA.bosses.navigator = { MAX_HP: LOOP_HP, HOLD, WORLD, make, update, hurt() {}, draw, drawBar, begin, settle, startHold, headAt };
  HA.bosses.navnode = node;
  HA.bosses.navhead = head;
})(window.HA);
