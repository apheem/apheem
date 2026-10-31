'use strict';
// The scuttle, on the way to the Crash ending (Phase 3.6): with the Helm Key broken, the Navigator starts to break
// the ship apart. The crew run: down the Tower and the Spine, home along the keel on the tram, and then the hero
// runs alone, against the clock, from the sump up through the Warrens and the Cryo Deck to the old crew's sleds in
// Cryo Bay 4, where they woke. On the way, in the Pod Stacks, one console can launch the sleepers' pods, and it
// costs time. The ceilings come down; the Wardens, let go, are gone. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const VOICE = S.VOICE;
  const NAV = '#b8f4ff';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const FLOOR = (ty) => (ty - 1) * 8;

  const CLOCK = 60 * (4 * 60 + 30); // the run, from the sump to the sleds
  const LAUNCH = 60 * 20; // what the pod launch costs on the clock
  // (The deep walls are on it if the gate fell: the cave-in shuts the Warrens' way west, lock 2 in STORYBOARD.md.)
  const ROUTE = ['sump', 'warrens', 'deep-walls', 'warrens-gate', 'coolant-hall', 'pod-stacks', 'thaw-corridor', 'cryo-bay'];
  // Which way the sleds are from each room of the run, shown under the clock.
  const WAY = {
    sump: 'UP THE HATCH ↑',
    warrens: (s) => (s.warrensRaid === 'fell' ? '← THEN DOWN THE HOLE ↓' : '←'),
    'deep-walls': '← DOWN, THEN →',
    'warrens-gate': '→',
    'coolant-hall': '→',
    'pod-stacks': '←',
    'thaw-corridor': '←',
    'cryo-bay': '←',
  };
  const START = { room: 'sump', x: 44 * 8, ty: 19 };
  const LEAD = 'RUN BACK TO THE SLEDS IN CRYO BAY 4, WHERE I WOKE';
  const WARDENS = ['warden', 'walker', 'turret', 'picker'];

  function startRun(world) {
    const s = world.state;
    s.flags.running = true;
    s.flags.scuttle = true;
    world.runLeft = CLOCK;
    world.alarm = 1;
    world.checkpoint = { room: START.room, x: START.x, y: START.ty * 8 - world.player.h, reset: (w) => (w.runLeft = CLOCK) };
    world.refreshMusic();
  }

  // ---- The scenes ----
  const SCENES = {
    // The clock ran out: the deck gives way, and it's back to the sump to try again.
    *runFail(world) {
      world.runLeft = undefined;
      yield { fade: 'out', frames: 30 };
      HA.audio.play('crash');
      world.shake(6);
      yield { card: ['THE DECK GAVE WAY UNDER ME.'], hold: 120 };
      restart(world);
      yield { wait: 20 };
      yield { fade: 'in', frames: 30 };
      yield me('NO. AGAIN. FASTER.');
    },
    // A game left during the run starts it again from the sump.
    *runRestart(world) {
      yield { fade: 'out', frames: 20 };
      yield { card: ['THE SHIP WAS COMING APART.', 'I HAD TO GET TO THE SLEDS.'], hold: 140 };
      restart(world);
      yield { wait: 20 };
      yield { fade: 'in', frames: 30 };
    },

    // The Pod Stacks' launch console: every sleeper's pod, sent down to the world. It takes time to do by hand.
    *podLaunch(world) {
      const s = world.state;
      if (s.podsLaunched) {
        yield me("THE STACKS ARE EMPTY. THEY'RE ALL AWAY.");
        return;
      }
      HA.audio.play('terminal');
      yield say('POD STACKS', 'EMERGENCY LAUNCH. CLAMPS RELEASE BY HAND, STACK BY STACK.', NAV);
      const pick = yield {
        choice: {
          prompt: 'THE POD STACKS. FOUR THOUSAND SLEEPERS, AND THE CLOCK.',
          options: [
            { label: 'LAUNCH THE PODS', confirm: { title: 'STOP AND LAUNCH THE PODS?', gain: 'THE SLEEPERS GO DOWN TO THE WORLD', lose: 'TWENTY SECONDS YOU MAY NOT HAVE' } },
            { label: 'KEEP RUNNING' },
          ],
        },
      };
      if (pick !== 0) return;
      world.runLeft = Math.max(60, world.runLeft - LAUNCH);
      world.launchFlash = 90;
      for (let i = 0; i < 6; i++) {
        HA.audio.play(i % 2 ? 'clamp' : 'launch');
        world.shake(2);
        for (let k = 0; k < 6; k++) world.particles.push({ x: 24 + Math.random() * 280, y: 360 - Math.random() * 200, vx: 0, vy: -3 - Math.random() * 2, life: 60, max: 60, color: k % 2 ? '#b8f4ff' : '#5fd4e8', size: 2, grav: 0 });
        yield { wait: 18 };
      }
      s.podsLaunched = 3986;
      S.addChoice(world, 'I STOPPED IN THE POD STACKS AND LAUNCHED THE SLEEPERS. EVERY POD, STACK BY STACK. IT COST ME TIME I DIDN\'T HAVE.');
      yield me('THE STACKS EMPTIED UP THE SHAFTS, A RACK AT A TIME. GO. GO.');
      world.save();
    },

    // Cryo Bay 4: Mara's clamps, as the hero runs past them.
    *maraRun(world) {
      const s = world.state;
      s.flags.maraRun = true;
      if (s.podsLaunched) {
        yield me("0418'S CLAMPS WERE EMPTY. SHE WENT WITH THE OTHERS. SHE'S FALLING TOWARD THE WORLD, ASLEEP.");
        yield me("HOLD ON, MAR. I WON'T BE LATE.");
      } else {
        yield me("MARA. STILL IN 0418. THE CLAMPS WON'T OPEN BY HAND, AND THERE'S NO TIME.");
        yield me("I PROMISED I'D BE THERE WHEN SHE WOKE.");
        yield me("I'M SORRY, MAR.");
      }
    },

    // The sleds: Tamp holds the last one open. Then the Crash ending.
    *sledsAway(world) {
      const s = world.state;
      const p = world.player;
      world.runLeft = undefined;
      s.flags.running = false;
      world.checkpoint = null;
      yield say('TAMP', "THERE YOU ARE! THE VILLAGE IS IN. GASKET'S CREW CAME UP THE COLD LIFT. ALL OF THEM.");
      yield say('TAMP', 'ALL BUT YOU. IN! GET IN!');
      yield { walk: p, x: 1 * 8, speed: 1.4 };
      p.hidden = true;
      HA.audio.play('doorShut');
      S.addStory(world, s.podsLaunched ? 'WE MADE THE SLEDS. THE PODS WERE ALREADY FALLING AHEAD OF US.' : 'WE MADE THE SLEDS. THE POD STACKS WERE STILL FULL BEHIND US.');
      yield* HA.endings.play(world, 'crash');
    },
  };

  // Back to the sump, with a full clock.
  function restart(world) {
    S.setLead(world, LEAD);
    world.enterRoom(START.room, START.x, START.ty * 8 - world.player.h, { noSave: true, facing: -1 });
    world.runLeft = CLOCK;
    world.player.hp = world.player.maxHp;
  }

  // From the Helm (keyBreaks in tower.js): the crew run, the tram takes them home, and the clock starts.
  function* scuttleRun(world) {
    const s = world.state;
    const lifts = (s.flags.lifts || 0) >= 1;
    // Why all the way back down: the ship is coming apart, and the only way off it is at the bottom.
    yield say('OLD GASKET', "IT'S TEARING ITSELF APART. NOBODY'S TAKING THIS SHIP DOWN NOW. WE HAVE TO GET OFF IT.");
    yield say('OLD GASKET', 'THE SLEDS! THE OLD CREW KEPT LANDING SLEDS IN CRYO BAY 4. BY YOUR POD, SLEEPER. WHERE YOU WOKE!');
    yield say('OLD GASKET', 'WE CLIMBED ALL THIS WAY TO TAKE THE SHIP DOWN TO THAT WORLD. NOW WE GO BACK DOWN, AND GET THERE OURSELVES.');
    if (s.people.solder === 'alive') yield say('SOLDER', "THE TRAM'S STILL AT THE FOOT. EVERYONE, MOVE!");
    yield { fade: 'out', frames: 40 };
    HA.music.play('scuttle');
    world.holdFade = true;
    yield { card: ['WE RAN.'], hold: 90 };
    yield { card: ['DOWN THE STAIR, DOWN THE TOWER LIFT,', lifts ? "DOWN THE SPINE IN THE CREW'S LIFT," : 'DOWN THE SPINE LADDER BY LADDER,', 'WITH THE SHIP SHAKING UNDER US.'], hold: 220 };
    const pipes = s.flags.tramEast && s.people.solder === 'dead'; // the tram waited at the Ballast stop (story/tram.js)
    yield { card: pipes ? ['BACK THROUGH THE OVERFLOW PIPES, AND', 'THE KEEL TRAM HOME FROM THE BALLAST STOP.', 'NOBODY SPOKE.'] : ['THE KEEL TRAM TOOK US HOME.', 'NOBODY SPOKE.'], hold: pipes ? 200 : 160 };
    world.enterRoom(START.room, START.x, START.ty * 8 - world.player.h, { facing: -1 });
    startRun(world);
    const g = S.makeNpc(world, 'gasket', { x: 50 * 8, y: FLOOR(19) });
    Object.assign(g, { state: 'out', facing: -1, talkable: () => false });
    world.npcs.push(g);
    world.holdFade = false;
    yield { fade: 'in', frames: 30 };
    yield say('OLD GASKET', "TAMP'S TAKEN THE VILLAGE UP TO THE SLEDS. THE CREW'S GOING ROUND BY THE COLD LIFT.");
    yield say('OLD GASKET', "YOU'RE FASTER THROUGH THE WARRENS ALONE. BACK UP TO WHERE YOU WOKE. GO! WE'LL SEE YOU AT THE SLEDS!");
    if (s.warrensRaid === 'fell') yield say('OLD GASKET', "THE HALL'S STILL DOWN AT THE WEST END. GO ROUND THROUGH THE WALLS: THE HOLE BY THE HOMES!");
    yield { walk: g, x: 70 * 8, speed: 1.2 };
    g.state = 'gone';
    S.addStory(world, "THE SHIP IS COMING APART, AND NOBODY CAN TAKE IT DOWN TO THE NEW WORLD NOW. THE WAY OFF IS THE OLD CREW'S LANDING SLEDS IN CRYO BAY 4, WHERE I WOKE, AT THE BOTTOM OF THE SHIP. I HAVE TO GET THERE BEFORE IT COMES APART.");
    S.setLead(world, LEAD);
    world.save();
  }

  // ---- The ceilings coming down ----
  function dropDebris(world) {
    const p = world.player;
    const room = world.room;
    const x = HA.clamp(p.x + p.w / 2 + p.facing * HA.rand(16, 64), 12, room.pw - 12);
    const tx = Math.floor(x / 8);
    let ty = Math.floor(p.y / 8);
    if (room.tile(tx, ty) !== HA.room.EMPTY) return;
    while (ty > 0 && room.tile(tx, ty - 1) === HA.room.EMPTY) ty--;
    if (p.y - ty * 8 < 24) return;
    HA.hazards.add(world, { kind: 'debris', x: x - 5, y: ty * 8, w: 10, h: 8, life: 240, dmg: 2, armed: false, vy: 0, update: debrisFall, draw: debrisDraw });
  }
  function debrisFall(world, h) {
    if (h.t < 45) return; // dust trickles down first
    h.armed = true;
    h.vy = Math.min(h.vy + 0.35, 6);
    h.y += h.vy;
    const t = world.room.tile(Math.floor((h.x + 5) / 8), Math.floor((h.y + h.h) / 8));
    if (t === HA.room.SOLID || t === HA.room.ONEWAY || t === HA.room.CRATE || h.y > world.room.ph) {
      h.life = 0;
      world.burst(h.x + 5, h.y + h.h, ['#6c7894', '#3a4258', '#a9b6cc'], 10, 1.6);
      HA.audio.play('debris');
      world.shake(1.5);
    }
  }
  function debrisDraw(g, world, h, cam) {
    const x = Math.round(h.x - cam.x);
    const y = Math.round(h.y - cam.y);
    if (h.t < 45) {
      g.fillStyle = '#9fb6c8';
      for (let i = 0; i < 3; i++) g.fillRect(x + 2 + i * 3, y + ((h.t * 2 + i * 9) % 30), 1, 1);
      return;
    }
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y - 1, h.w + 2, h.h + 2);
    g.fillStyle = '#5a6b87';
    g.fillRect(x, y, h.w, h.h);
    g.fillStyle = '#9fb6c8';
    g.fillRect(x, y, h.w, 1);
  }

  // ---- The clock, across the top of the screen ----
  function drawClock(g, world) {
    if (!world.state.flags.running || world.runLeft === undefined) return;
    const secs = Math.max(0, Math.ceil(world.runLeft / 60));
    const text = 'THE SHIP IS COMING APART · ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    const w = HA.font.measure(text) + 8;
    const x = Math.round((HA.VIEW_W - w) / 2);
    g.fillStyle = 'rgba(5,6,13,0.75)';
    g.fillRect(x, 4, w, 12);
    const warn = secs <= 30 && Math.floor(world.time / 15) % 2;
    HA.font.draw(g, text, x + 4, 6, warn ? '#ff8a8a' : '#ffb84d');
    // Under it, where the sleds are: the room the hero woke in, and which way from here.
    const way = typeof WAY[world.def.id] === 'function' ? WAY[world.def.id](world.state) : WAY[world.def.id];
    const where = 'SLEDS · WHERE I WOKE' + (way ? ' · ' + way : '');
    const ww = HA.font.measure(where) + 8;
    g.fillStyle = 'rgba(5,6,13,0.75)';
    g.fillRect(Math.round((HA.VIEW_W - ww) / 2), 16, ww, 11);
    HA.font.draw(g, where, Math.round((HA.VIEW_W - ww) / 2) + 4, 18, '#9fb6c8');
    if (world.launchFlash > 0) {
      world.launchFlash--;
      HA.font.draw(g, '-0:' + LAUNCH / 60, x + w + 4, 6, '#ff8a8a');
    }
  }
  S.overlays.push(drawClock);

  // The launch console in the Pod Stacks, on the ledge by the way out to the Thaw Corridor.
  function drawConsole(g, world, a, cam) {
    const l = world.logs.find((x) => x.id === 'podConsole');
    if (!l) return;
    const x = Math.round(l.x - cam.x);
    const y = Math.round(l.y - cam.y);
    const done = world.state.podsLaunched > 0;
    g.fillStyle = '#10121c';
    g.fillRect(x - 2, y, 14, 12);
    g.fillStyle = '#3a4258';
    g.fillRect(x - 1, y + 1, 12, 10);
    g.fillStyle = done ? '#1a2e24' : Math.floor(world.time / 12) % 2 ? '#e8434f' : '#ffb84d';
    g.fillRect(x + 1, y + 2, 8, 4);
  }
  // The old crew's sleds, docked at the bay's west wall behind an open hull door, and Tamp holding the last.
  function drawSled(g, world, a, cam) {
    const x = Math.round(0 - cam.x);
    const y = Math.round(11 * 8 - cam.y);
    g.fillStyle = '#05060d';
    g.fillRect(x, y, 16, 64);
    g.fillStyle = '#6c7894';
    g.fillRect(x + 14, y, 2, 64);
    g.fillStyle = '#a9b6cc';
    g.fillRect(x, y + 20, 14, 30);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 2, y + 24, 10, 10);
    g.fillStyle = Math.floor(world.time / 20) % 2 ? '#7ad1a0' : '#3f7a4a';
    g.fillRect(x + 10, y + 22, 2, 2);
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (!f.running) return;
      world.alarm = 1;
      // The Navigator has let the Wardens go; nothing else is left to stop the hero but the ship itself.
      world.enemies = world.enemies.filter((e) => !WARDENS.includes(e.type));
      // Everyone has gone ahead to the sleds.
      for (const n of world.npcs) n.state = 'gone';
      if (id === 'pod-stacks') {
        world.logs.push({ id: 'podConsole', scene: 'podLaunch', label: '{up} LAUNCH THE PODS', x: 5 * 8, y: 19 * 8 - 12, w: 10, h: 12, read: false });
        world.actors.push({ draw: drawConsole });
      }
      if (id === 'cryo-bay') {
        world.actors.push({ draw: drawSled });
        const t = S.makeNpc(world, 'tamp', { x: 3 * 8, y: FLOOR(19) });
        Object.assign(t, { state: 'out', facing: 1, talkable: () => false });
        world.npcs.push(t);
        if (s.podsLaunched) {
          world.maraPod = null;
          world.logs = world.logs.filter((l) => l.id !== 'mara');
        }
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      if (!f.running) return;
      const p = world.player;
      if (world.runLeft === undefined) {
        if (!world.scene && !world.transition && !p.dead && ROUTE.includes(world.def.id)) run(world, 'runRestart');
        return;
      }
      if (world.scene || p.dead || world.transition) return;
      world.runLeft--;
      if (world.runLeft <= 0) return run(world, 'runFail');
      if (world.time % 110 === 0) dropDebris(world);
      if (world.time % 150 === 0) {
        world.shake(1.5);
        HA.audio.play('rumble');
      }
      const id = world.def.id;
      const tx = (p.x + p.w / 2) / 8;
      if (id === 'cryo-bay' && tx < 20 && !f.maraRun) run(world, 'maraRun');
      else if (id === 'cryo-bay' && tx < 6) run(world, 'sledsAway');
    },

    music(world) {
      return world.state.flags.running ? 'scuttle' : undefined;
    },
  });

  S.scuttleRun = scuttleRun;
  S.runClock = CLOCK;
  Object.assign(S.SCENES, SCENES);
})(window.HA);
