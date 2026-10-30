'use strict';
// Abel, the Stoker: a Bloomsworn giant the Steward used up and left feeding the Reactor Throat's furnace. He is
// only ever a silhouette behind its grate, and he fights from its mouth. Behind the bars he can't be hurt; he
// can be hurt while he leans out of the furnace, which he does to attack.
//   Slag   he leans out with a lump of burning slag and lobs it at the hero; where it lands, the floor burns for
//          a few seconds. In the second half, two lumps, and wider fires.
//   Jet    he leans out and draws breath (the band it will fill flickers across the room), then blows fire
//          across the whole room: low along the floor if the hero is on it (get up onto a catwalk), or high
//          over it if they're up (get down and stay down). In the second half, one of each, back to back.
//   Grates (second half) the floor grates rattle and glow, then he hauls them open over the fire for a few
//          seconds. Fall in and the fire throws the hero back out onto firm floor, burnt.
// He vents shards every 15% of his health.
(function (HA) {
  const MAX_HP = 260;
  const STEP = Math.round(MAX_HP * 0.15);
  const FLOOR = 19 * 8; // the arena floor's top
  const MOUTH = 33 * 8; // the furnace's face
  const OUT = { x: MOUTH - 26, y: 100, w: 26, h: 50 }; // where he is while he leans out
  const IN = { x: MOUTH + 6, y: 100, w: 26, h: 50 }; // and behind the grate
  const LOW = { y: FLOOR - 20, h: 20 };
  const HIGH = { y: 82, h: 42 };
  const SEQ1 = ['slag', 'jet', 'slag', 'jet', 'jet'];
  const SEQ2 = ['grates', 'slag', 'jet2', 'slag', 'grates', 'jet', 'slag'];

  function make(world, cx, feetY) {
    return Object.assign({
      boss: true,
      type: 'abel',
      name: 'THE STOKER',
      vx: 0,
      vy: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      facing: -1,
      t: 0,
      flash: 0,
      dead: false,
      spawn: { respawn: -1 },
      active: false,
      fighting: false,
      state: 'idle',
      timer: 90,
      phase: 1,
      next: 0,
      nextShards: MAX_HP - STEP,
      shownHp: MAX_HP,
      lean: 0, // 0 behind the grate, 1 fully out
      slag: [],
      jet: null,
      grates: (world.def.grates || []).map((gr) => Object.assign({ open: false }, gr)),
      gratesState: null,
    }, IN);
  }

  const set = (b, state, timer) => {
    b.state = state;
    b.timer = timer;
  };
  const exposed = (b) => b.lean > 0.6;
  const onFloor = (p) => p.y + p.h > FLOOR - 4;

  function update(world, b) {
    b.t++;
    if (b.flash > 0) b.flash--;
    b.shownHp = HA.approach(b.shownHp, b.hp, 1.2);
    updateSlag(world, b);
    updateFirePits(world, b);
    // Out of the furnace or back in. His box follows, so behind the bars no shot can reach him.
    const out = ['lean', 'windup', 'throw', 'breath', 'blow', 'hold', 'watch'].includes(b.state);
    b.lean = HA.approach(b.lean, out ? 1 : 0, 0.06);
    Object.assign(b, exposed(b) ? OUT : IN);
    if (!b.fighting || b.broken || world.scene) {
      if (b.jet) b.jet = null;
      return;
    }
    const p = world.player;
    if (b.timer > 0) b.timer--;

    switch (b.state) {
      case 'idle':
        if (b.timer > 0) break;
        b.move = (b.phase === 2 ? SEQ2 : SEQ1)[b.next++ % (b.phase === 2 ? SEQ2 : SEQ1).length];
        if (b.move === 'grates') {
          set(b, 'rattle', 60);
          HA.audio.play('grate');
          b.gratesState = 'warn';
        } else set(b, 'lean', 20);
        break;
      case 'lean':
        if (b.timer > 0) break;
        if (b.move === 'slag') {
          set(b, 'windup', 28);
          b.throws = b.phase === 2 ? 2 : 1;
        } else {
          b.jets = b.move === 'jet2' ? ['low', 'high'] : [onFloor(p) ? 'low' : 'high'];
          startBreath(b);
        }
        break;

      // Slag: the lump glows in his fist, then flies.
      case 'windup':
        if (b.timer > 0) break;
        throwSlag(world, b);
        set(b, 'throw', 22);
        break;
      case 'throw':
        if (b.timer > 0) break;
        if (--b.throws > 0) set(b, 'windup', 20);
        else set(b, 'hold', 45);
        break;

      // The jet: a breath while the band it will fill flickers, then fire across the room.
      case 'breath':
        if (b.timer === 30) HA.audio.play('telegraph');
        if (b.timer > 0) break;
        b.jet.on = true;
        set(b, 'blow', 70);
        HA.audio.play('fire');
        world.shake(3);
        break;
      case 'blow':
        if (b.jet && b.jet.on && !p.dead && HA.overlap(p, b.jet)) world.hurtPlayer(2, MOUTH);
        if (b.timer % 6 === 0) world.shake(1);
        if (b.timer > 0) break;
        b.jet = null;
        b.jets.shift();
        if (b.jets.length) {
          b.jets[0] = onFloor(p) ? 'low' : 'high';
          startBreath(b, 30);
        } else set(b, 'hold', 30);
        break;

      case 'hold':
        if (b.timer > 0) break;
        set(b, 'back', 24);
        break;
      case 'back':
        if (b.timer > 0) break;
        set(b, 'idle', b.phase === 2 ? 50 : 70);
        break;

      // The grates: they rattle and glow, then he hauls them open over the fire, and watches.
      case 'rattle':
        if (b.timer % 20 === 0) HA.audio.play('grate');
        if (b.timer > 0) break;
        openGrates(world, b, true);
        set(b, 'watch', 150);
        break;
      case 'watch':
        if (b.timer > 0) break;
        openGrates(world, b, false);
        set(b, 'back', 20);
        break;
    }
  }

  function startBreath(b, frames) {
    const band = b.jets[0] === 'low' ? LOW : HIGH;
    b.jet = { x: 2 * 8, y: band.y, w: MOUTH - 16, h: band.h, on: false, kind: b.jets[0] };
    set(b, 'breath', frames || 50);
  }

  // A lump of slag, lobbed to land where the hero is standing now.
  function throwSlag(world, b) {
    const p = world.player;
    const sx = MOUTH - 18;
    const sy = 104;
    const tx = HA.clamp(p.x + p.w / 2 + HA.rand(-10, 10), 24, MOUTH - 20);
    const vy = -3.4;
    const g = 0.2;
    const t = (-vy + Math.sqrt(vy * vy + 2 * g * (FLOOR - sy))) / g;
    b.slag.push({ x: sx, y: sy, vx: (tx - sx) / t, vy, g });
    HA.audio.play('lob');
  }

  function updateSlag(world, b) {
    const p = world.player;
    for (const s of b.slag) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += s.g;
      if (world.time % 3 === 0) world.particles.push({ x: s.x, y: s.y, vx: HA.rand(-0.3, 0.3), vy: -0.4, life: 12, max: 12, color: '#ff9b3d', size: 1, grav: 0 });
      if (!p.dead && HA.overlap(p, { x: s.x - 3, y: s.y - 3, w: 6, h: 6 })) {
        world.hurtPlayer(2, s.x);
        s.done = true;
      }
      if (s.y >= FLOOR - 2 && !s.done) {
        s.done = true;
        const w = b.phase === 2 ? 40 : 24;
        HA.hazards.add(world, { kind: 'fire', x: s.x - w / 2, y: FLOOR - 9, w, h: 9, life: b.phase === 2 ? 240 : 190, dmg: 2 });
        world.burst(s.x, FLOOR - 2, ['#ff9b3d', '#e8434f', '#fff0a8', '#3a1a10'], 14, 1.8);
        HA.audio.play('slag');
      }
    }
    b.slag = b.slag.filter((s) => !s.done && s.y < world.room.ph);
  }

  // The floor over each pit opens (empty) or shuts (solid again).
  function openGrates(world, b, open) {
    for (const gr of b.grates) {
      gr.open = open;
      for (let tx = gr.x0; tx <= gr.x1; tx++) world.room.set(tx, FLOOR / 8, open ? HA.room.EMPTY : HA.room.SOLID);
    }
    b.gratesState = open ? 'open' : null;
    HA.audio.play(open ? 'blast' : 'doorShut');
    world.shake(open ? 4 : 2);
  }

  // In the fire under an open grate: burnt, and thrown out onto the nearest firm floor.
  function updateFirePits(world, b) {
    const p = world.player;
    if (p.dead || p.y + p.h <= FLOOR + 3) return;
    const cx = p.x + p.w / 2;
    const gr = b.grates.find((g) => cx >= g.x0 * 8 - 4 && cx <= (g.x1 + 1) * 8 + 4);
    if (!gr) return;
    world.burst(cx, FLOOR + 4, ['#ff9b3d', '#e8434f', '#fff0a8'], 12, 1.8);
    world.hurtPlayer(2, cx);
    // onto the firm tile at whichever end of the grate is nearer
    const left = (gr.x0 - 1) * 8 + 4;
    const right = (gr.x1 + 1) * 8 + 4;
    const to = Math.abs(cx - left) < Math.abs(cx - right) ? left : right;
    Object.assign(p, { x: to - p.w / 2, y: FLOOR - p.h, vx: 0, vy: 0, stun: 12, jumping: false, thrusting: false });
  }

  function hurt(world, b, dmg) {
    if (!b.fighting || b.broken || b.hp <= 0) return;
    if (!exposed(b)) {
      HA.audio.play('tink');
      return;
    }
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 5;
    world.burst(b.x + 8, b.y + 14, ['#ff9b3d', '#f27ad8', '#ffffff'], 3, 1.2);
    HA.audio.play('bossHit');
    HA.boss.vent(world, b, STEP);
    if (b.phase === 1 && b.hp <= MAX_HP / 2) {
      b.phase = 2;
      b.next = 0;
      world.flash('#ff9b3d', 6);
      HA.audio.play('roar');
      HA.music.setLayers(2);
    }
    if (b.hp <= 0) {
      b.fighting = false;
      b.jet = null;
      b.slag = [];
      if (b.gratesState === 'open') openGrates(world, b, false);
      b.gratesState = null;
      world.hazards = world.hazards.filter((h) => h.kind !== 'fire');
      world.freeze(12);
      HA.story.onBossDefeated(world);
    }
  }

  // ---- Drawing: the furnace's iron face, the fire behind its grate, and Abel only ever as a shape in it ----
  function draw(g, world, b, cam) {
    const fx = Math.round(MOUTH - cam.x);
    const top = Math.round(16 - cam.y);
    const fl = Math.round(FLOOR - cam.y);
    const lit = b.fate !== 'ended';
    const t = world.time;
    // the pits under the grates: fire below the floor, seen through the bars, and open to it when they swing wide
    for (const gr of b.grates) {
      const x0 = Math.round(gr.x0 * 8 - cam.x);
      const w = (gr.x1 - gr.x0 + 1) * 8;
      g.fillStyle = '#1a0a08';
      g.fillRect(x0, fl + 8, w, 16);
      for (let i = 0; i < w; i += 2) {
        const h = (gr.open ? 10 : 5) + ((t / 3 + i * 3) % 7);
        g.fillStyle = i % 4 ? '#e8434f' : '#ff9b3d';
        g.fillRect(x0 + i, fl + 24 - h, 2, h);
      }
      if (gr.open) {
        g.fillStyle = '#1a0a08';
        g.fillRect(x0, fl, w, 8);
        for (let i = 1; i < w; i += 3) {
          g.fillStyle = (i + t) % 6 < 3 ? '#ff9b3d' : '#fff0a8';
          g.fillRect(x0 + i, fl + 8 - ((t + i * 5) % 9), 2, 3);
        }
        continue;
      }
      const warn = b.gratesState === 'warn';
      const shake = warn && t % 4 < 2 ? 1 : 0;
      g.fillStyle = '#10121c';
      g.fillRect(x0, fl, w, 8);
      g.fillStyle = warn && Math.floor(t / 5) % 2 ? '#fff0a8' : '#c96a2a';
      for (let i = 2; i < w; i += 3) g.fillRect(x0 + i, fl + 1 + shake, 1, 6);
      g.fillStyle = '#6c7894';
      g.fillRect(x0, fl + shake, w, 1);
    }
    // the furnace: an iron face over the whole east wall, its mouth near the floor
    g.fillStyle = '#10121c';
    g.fillRect(fx, top, 40, fl - top);
    g.fillStyle = '#2a2428';
    g.fillRect(fx + 2, top + 2, 38, fl - top - 2);
    g.fillStyle = '#3a3036';
    for (let y = top + 8; y < fl - 60; y += 16) g.fillRect(fx + 3, y, 36, 2);
    g.fillStyle = '#6a5a5e';
    for (let y = top + 6; y < fl - 60; y += 8) {
      g.fillRect(fx + 5, y, 1, 1);
      g.fillRect(fx + 34, y, 1, 1);
    }
    const my = fl - 54; // the mouth's top
    g.fillStyle = '#10121c';
    g.fillRect(fx, my, 40, 54);
    // the fire inside
    if (lit) {
      const glow = g.createLinearGradient(0, my, 0, fl);
      glow.addColorStop(0, '#5a1a10');
      glow.addColorStop(1, b.fighting ? '#ff9b3d' : '#c96a2a');
      g.fillStyle = glow;
      g.fillRect(fx + 2, my + 2, 36, 52);
      for (let i = 0; i < 36; i += 3) {
        const h = 8 + ((t / 2 + i * 7) % 14);
        g.fillStyle = i % 2 ? '#ffb84d' : '#e8434f';
        g.fillRect(fx + 2 + i, fl - h, 2, h);
      }
    } else {
      g.fillStyle = '#1a1414';
      g.fillRect(fx + 2, my + 2, 36, 52);
    }
    drawAbel(g, world, b, cam, fx, my, fl, lit);
    // the grate's bars, swung back like a door while he leans out through them
    const swung = b.lean > 0.3;
    for (let i = 0; i < 6; i++) {
      if (swung && i < 4) continue;
      const bx = fx + 3 + i * 6;
      g.fillStyle = '#10121c';
      g.fillRect(bx, my, 3, 54);
      g.fillStyle = '#4a3a36';
      g.fillRect(bx + 1, my + 1, 1, 52);
    }
    if (swung) {
      // the open door, edge on against the furnace face
      g.fillStyle = '#10121c';
      g.fillRect(fx - 2, my - 4, 4, 58);
      g.fillStyle = '#4a3a36';
      g.fillRect(fx - 1, my - 3, 2, 56);
    }
    g.fillStyle = '#10121c';
    g.fillRect(fx, my, 40, 3);
    // the jet: its band flickering while he breathes in, then fire
    if (b.jet) {
      const y = Math.round(b.jet.y - cam.y);
      const x = Math.round(b.jet.x - cam.x);
      if (!b.jet.on) {
        if (Math.floor(t / 4) % 2) {
          g.fillStyle = 'rgba(255,155,61,0.5)';
          g.fillRect(x, y, b.jet.w, 1);
          g.fillRect(x, y + b.jet.h - 1, b.jet.w, 1);
        }
        g.fillStyle = 'rgba(255,155,61,0.08)';
        g.fillRect(x, y, b.jet.w, b.jet.h);
      } else {
        for (let i = 0; i < b.jet.w; i += 4) {
          const wob = Math.sin((t + i) * 0.3) * 2;
          g.fillStyle = (i + t) % 8 < 4 ? '#ff9b3d' : '#e8434f';
          g.fillRect(x + i, y + 2 + wob, 4, b.jet.h - 4);
          g.fillStyle = '#fff0a8';
          g.fillRect(x + i, y + b.jet.h / 2 - 2 + wob, 4, 3);
        }
      }
    }
    // slag in the air
    for (const s of b.slag) {
      const x = Math.round(s.x - cam.x);
      const y = Math.round(s.y - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x - 3, y - 3, 6, 6);
      g.fillStyle = Math.floor(t / 3) % 2 ? '#ff9b3d' : '#ffb84d';
      g.fillRect(x - 2, y - 2, 4, 4);
      g.fillStyle = '#fff0a8';
      g.fillRect(x - 1, y - 1, 1, 1);
    }
  }

  // Abel: never more than a shape against the fire. Behind the bars he shovels; leaning out, his head and shoulders
  // come through the mouth with the Bloom's pink in his eyes; beaten, he slumps against the grate.
  function drawAbel(g, world, b, cam, fx, my, fl, lit) {
    if (b.fate === 'ended') {
      // sat down in the dark at the back of the furnace
      g.fillStyle = '#0a0808';
      g.fillRect(fx + 14, fl - 22, 18, 22);
      g.fillRect(fx + 18, fl - 30, 10, 9);
      return;
    }
    const white = b.flash > 0;
    const S = white ? '#ffffff' : '#05040a';
    const lean = b.lean;
    const shovel = !b.fighting && !b.broken ? Math.sin(world.time * 0.05) : b.state === 'idle' ? Math.sin(world.time * 0.12) : 0;
    const ox = fx + 10 - Math.round(lean * 34);
    const oy = fl - 50 + Math.round(shovel * 3) + (b.broken && !b.fate ? 10 : 0);
    // shoulders and back, a great hunched mass
    g.fillStyle = S;
    g.fillRect(ox + 4, oy + 16, 30, 34);
    g.fillRect(ox, oy + 22, 38, 20);
    // the head
    g.fillRect(ox + 8, oy + 2, 16, 16);
    g.fillRect(ox + 6, oy + 6, 20, 10);
    // the Bloom pushing through: thorns on his back, his eyes
    if (!white) {
      g.fillStyle = '#5c2479';
      g.fillRect(ox + 28, oy + 14, 3, 4);
      g.fillRect(ox + 32, oy + 20, 3, 3);
      g.fillStyle = b.broken ? '#b04ad0' : '#f27ad8';
      g.fillRect(ox + 10, oy + 9, 2, 2);
      g.fillRect(ox + 16, oy + 9, 2, 2);
    }
    // the rim of firelight around him
    if (lit && !white) {
      g.fillStyle = 'rgba(255,155,61,0.5)';
      g.fillRect(ox + 8, oy + 2, 16, 1);
      g.fillRect(ox + 4, oy + 16, 1, 6);
      g.fillRect(ox, oy + 22, 1, 20);
    }
    // the arm: a shovel behind the bars, a lump of slag held up while he winds up, his mouth lit while he breathes
    if (b.state === 'windup' || b.state === 'throw') {
      const up = b.state === 'windup' ? 14 : 4;
      g.fillStyle = S;
      g.fillRect(ox - 4, oy + 18 - up, 8, 16);
      g.fillStyle = Math.floor(world.time / 3) % 2 ? '#ff9b3d' : '#fff0a8';
      if (b.state === 'windup') g.fillRect(ox - 5, oy + 14 - up, 6, 6);
    } else if (b.state === 'breath' || b.state === 'blow') {
      g.fillStyle = b.state === 'blow' ? '#fff0a8' : Math.floor(world.time / 4) % 2 ? '#ff9b3d' : '#e8434f';
      g.fillRect(ox + 4, oy + 12, 5, 4);
    } else if (!b.broken && lean < 0.3) {
      g.fillStyle = S;
      g.fillRect(ox - 6, oy + 26 + Math.round(shovel * 4), 14, 3);
      g.fillRect(ox - 10, oy + 24 + Math.round(shovel * 4), 6, 7);
    }
  }

  const drawBar = (g, world, b) => HA.boss.bar(g, b, 'THE STOKER', { name: '#ff9b3d', fill: '#e8434f', back: '#3a1a10', marks: [1 / 2] });

  HA.bosses.abel = { MAX_HP, make, update, hurt, draw, drawBar, openGrates };
})(window.HA);
