'use strict';
// The story so far: the Hullfolk, ship logs, cutscenes, the raid, the Bailiff's fate, the night after, and the
// journal entries and leads they leave behind. All text is original to Hollow Ark.
// Each later area keeps its own story in js/story/<area>.js, which adds its scenes, logs and lines to the tables
// here and pushes a hook object ({ enterRoom, update, music }) onto HA.story.areas.
(function (HA) {
  const W = HA.VIEW_W;
  const run = (world, name) => HA.scenes.run(world, SCENES[name], { name });
  const npcOf = (world, id) => world.npcs.find((n) => n.id === id);
  const FLOOR = (ty) => ty * 8; // feet on top of map row ty
  const VOICE = '#f2c88a'; // the hero's own thoughts, never spoken aloud
  const AREAS = []; // each area's story hooks

  // ---- Journal and leads ----
  function setLead(world, text) {
    world.state.lead = text;
    world.leadBanner = 240;
    HA.audio.play('lead');
  }
  function addStory(world, text) {
    world.state.journal.story.push(text);
  }
  function addChoice(world, text) {
    world.state.journal.choices.push(text);
  }

  // ---- Ship logs ----
  const LOGS = {
    course: {
      title: 'BRIDGE LOG · YEAR 41',
      text: 'COURSE CORRECTION 3 REJECTED BY THE NAVIGATOR. REASON GIVEN: "NOT YET." CHIEF ENGINEER ODELL HAS FILED A COMPLAINT. THERE HAS BEEN NO REPLY.',
    },
    safer: {
      title: 'COUNCIL LOG · YEAR 96',
      text: 'ARRIVAL IS SIXTEEN YEARS OVERDUE. THE COUNCIL WILL WAKE NO MORE SLEEPERS UNTIL THE NAVIGATOR EXPLAINS ITSELF. ITS ONLY ANSWER: "THEY ARE SAFER ASLEEP."',
    },
    collect: {
      title: "STEWARD'S ORDER · YEAR 309",
      text: 'ALL WARDENS ANSWER TO THE HELM KEY ALONE. HULLFOLK FOUND OUTSIDE THE WALLS ARE TO BE COLLECTED, NOT HARMED. THEY ARE NEEDED IN THE GARDENS.',
    },
  };

  function readLog(world, log) {
    if (log.scene) {
      log.read = true;
      run(world, log.scene);
      return;
    }
    HA.scenes.run(world, function* () {
      const L = LOGS[log.id];
      const first = !world.state.logs[log.id];
      world.state.logs[log.id] = true;
      log.read = true;
      HA.audio.play('terminal');
      yield { say: L.title, text: L.text, color: '#b8f4ff' };
      if (first) world.toast('SHIP LOG SAVED TO THE JOURNAL', 150);
    });
  }

  // ---- The Hullfolk ----
  const PEOPLE = {
    gasket: { name: 'OLD GASKET', sprite: 'gasket' },
    wick: { name: 'WICK', sprite: 'wick' },
    solder: { name: 'SOLDER', sprite: 'solder' },
    shim: { name: 'SHIM', sprite: 'shim' },
    tamp: { name: 'TAMP', sprite: 'tamp' },
    brine: { name: 'BRINE', sprite: 'brine' },
    gardener: { name: 'THE GARDENER', sprite: 'gardener' },
    woken: { name: 'A WOKEN VILLAGER', sprite: 'woken1' },
  };

  // What the Hullfolk call the hero, by Mercy (never shown as a number). LATE is a name Shim gives, so it waits
  // until he has given it; COUNTER is what they call the Wardens.
  function callName(s) {
    if (s.mercy <= -3) return 'COUNTER';
    if (s.mercy >= 4 && s.flags.namedLate) return 'LATE';
    return 'SLEEPER';
  }

  function makeNpc(world, id, sp) {
    const spr = HA.art.people[PEOPLE[id].sprite];
    const n = {
      id,
      name: PEOPLE[id].name,
      sprite: spr,
      x: sp.x,
      y: sp.y + 8 - spr.h,
      w: 8,
      h: spr.h,
      homeX: sp.x,
      homeY: sp.y + 8 - spr.h,
      facing: -1,
      t: Math.floor(Math.random() * 200),
      walking: false,
      state: npcState(world, id),
      talkable: (w, self) => self.state === 'out' && !!TALK[self.id],
    };
    return n;
  }

  // Who is out, who hides in their home, who is gone. The world reflects choices instead of a meter.
  function npcState(world, id) {
    const f = world.state.flags;
    if (id === 'shim' && world.def.id === 'thaw-corridor') return 'out';
    if (!f.metHullfolk) return 'hidden';
    if (f.raid && !f.reunion) return id === 'tamp' || id === 'brine' ? 'hidden' : 'out';
    // Once the taken are home, the village comes out to the hero, unless they've started calling them COUNTER.
    if (f.cradles) return (id === 'tamp' || id === 'brine') && callName(world.state) === 'COUNTER' ? 'hidden' : 'out';
    if (f.reunion && world.state.wardens.bailiff === 'salvage' && (id === 'tamp' || id === 'brine')) return 'hidden';
    return 'out';
  }

  function updateNpc(world, n) {
    n.t++;
    if (n.alert > 0) n.alert--;
    const p = world.player;
    if (n.state === 'hidden') return;
    if (n.state !== 'out' || n.carriedBy) return;
    // A companion walks a little behind the hero, on the floor, and catches up when left behind.
    if (n.follow && !world.scene) {
      const want = p.x - p.facing * 14;
      if (Math.abs(want - n.x) > 10) n.homeX = HA.clamp(want, 8, world.room.pw - 16);
    }
    const inScene = world.scene && world.scene.step && world.scene.step.walk === n;
    if (!inScene && !world.scene) {
      if (Math.abs(n.x - n.homeX) > 1) {
        n.facing = Math.sign(n.homeX - n.x);
        n.x += n.facing * (n.follow ? HA.clamp(Math.abs(n.homeX - n.x) / 20, 0.6, 1.6) : 0.6);
        n.walking = true;
      } else {
        n.walking = false;
        if (Math.abs(p.x - n.x) < 70 && Math.abs(p.y - n.y) < 30) n.facing = Math.sign(p.x - n.x) || n.facing;
      }
      if (Math.abs(n.y - n.homeY) > 0.5) n.y = HA.approach(n.y, n.homeY, 2);
    }
  }

  function drawNpc(g, world, n, cam) {
    if (n.state === 'gone') return;
    const x = Math.round(n.x - cam.x);
    const y = Math.round(n.y - cam.y);
    if (n.state === 'hidden') return; // hiding: only their eyes show, in the doorways (see scenery.js)
    let frame = n.sprite.idle;
    if (n.walking) frame = Math.floor(n.t / 8) % 2 ? n.sprite.walk : n.sprite.idle;
    else if (n.sleeping) frame = n.sprite.sleep;
    else if (n.kneel) frame = n.sprite.kneel;
    else if (Math.floor(n.t / 7) % 26 === 0) frame = n.sprite.blink;
    const cx = n.carriedBy ? Math.round(n.carriedBy.x + n.carriedBy.facing * 10 - cam.x) : x + 4;
    const cy = n.carriedBy ? Math.round(n.carriedBy.y + 4 - cam.y) : y + (n.kneel || n.sleeping ? n.sprite.h - frame.h + 1 : 0);
    g.save();
    g.translate(cx, cy);
    g.scale(n.facing || 1, 1);
    g.drawImage(frame.img, -Math.floor(frame.w / 2), 0);
    if (n.lantern) HA.scenery.miniLantern(g, 2, frame.h - 7);
    if (n.wrench) {
      g.fillStyle = '#6c7894';
      g.fillRect(4, 5, 1, 6);
      g.fillStyle = '#a9b6cc';
      g.fillRect(3, 3, 3, 2);
    }
    g.restore();
    if (n.alert > 0) HA.font.draw(g, '!', cx, cy - 10, '#fff0a8', { align: 'center' });
    if (n.sleeping && n.t % 90 < 60) HA.font.draw(g, 'z', cx + 4 + Math.floor((n.t % 90) / 20), cy - 6 - Math.floor((n.t % 90) / 12), '#9fb6c8');
  }

  // ---- Barks: short lines someone says in passing, over their head, without stopping play ----
  function bark(world, n, text, frames) {
    world.barks.push({ n, text, life: frames || 90 + text.length * 3, wait: world.barks.filter((b) => b.n === n).reduce((t, b) => t + b.life + b.wait, 0) });
    HA.save.addTalk(world.state, n.name, text);
  }
  function updateBarks(world) {
    for (const b of world.barks) {
      if (b.wait > 0) b.wait--;
      else b.life--;
    }
    world.barks = world.barks.filter((b) => b.life > 0 && (!b.n.state || b.n.state !== 'gone'));
  }
  function drawBarks(g, world, cam) {
    if (world.scene && world.scene.step && (world.scene.step.say !== undefined || world.scene.step.choice)) return;
    for (const b of world.barks) {
      if (b.wait > 0) continue;
      const lines = HA.scenes.paginate(b.text, 24, 9)[0];
      const w = Math.max(...lines.map((l) => HA.font.measure(l))) + 8;
      const h = lines.length * 9 + 4;
      const x = HA.clamp(Math.round(b.n.x + 4 - cam.x - w / 2), 2, HA.VIEW_W - w - 2);
      const y = Math.max(12, Math.round(b.n.y - cam.y) - h - 6);
      g.globalAlpha = Math.min(1, b.life / 15);
      g.fillStyle = 'rgba(5,6,13,0.85)';
      g.fillRect(x, y, w, h);
      g.fillStyle = '#ffb84d';
      g.fillRect(x, y + h - 1, w, 1);
      lines.forEach((l, i) => HA.font.draw(g, l, x + 4, y + 3 + i * 9, '#eef4f6'));
      g.globalAlpha = 1;
    }
  }

  // ---- What each person says, by how far the story has come ----
  function phase(world) {
    const f = world.state.flags;
    if (world.def.area === 'gardens') return 'cellar';
    if (f.climbPlanned) return 'climb'; // the morning after Solder leaves
    if (f.homeAgain) return 'home'; // home from the Gardens, without Wick
    if (f.reunion) return world.state.wardens.bailiff === 'release' ? 'after-release' : 'after-salvage';
    if (f.raid) return 'taken';
    return 'night';
  }

  const TALK = {
    gasket: {
      night: [
        ["THE STEWARD'S MACHINES COME DOWN HERE SOMETIMES. COUNTING. WE SEAL THE GATE AND HOLD OUR BREATH."],
        ['THE REST POD BY THE GATE STILL WORKS. MOST THINGS DOWN HERE STILL WORK, IF YOU ARE KIND TO THEM.', 'REST, SLEEPER. THE WALLS ARE SAFE AT NIGHT.'],
      ],
      taken: [['THE LOCKUP IS PAST THE GATE. THEY COUNT THEM THERE BEFORE THEY TAKE THEM UP.', 'BRING HIM BACK.']],
      'after-release': [
        ["THE GARDENS ARE PAST THE BAILIFF'S HALL. THE EAST DOOR. IF A COUNTER CAN OPEN A CAGE, MAYBE UP THERE ISN'T A GRAVE.", 'GO AND SEE, SLEEPER. AND BRING MY DAUGHTER BACK WITH THEM.'],
        ['THE SHIP HUMS AT NIGHT. MY MOTHER SAID IT WAS SINGING.'],
      ],
      'after-salvage': [
        ["THE GARDENS ARE PAST THE BAILIFF'S HALL. THE EAST DOOR.", "WICK GOES WITH YOU. I CAN'T STOP HER, SO YOU'LL BRING HER BACK."],
        ['THE SHIP HUMS AT NIGHT. MY MOTHER SAID IT WAS SINGING.'],
      ],
    },
    wick: {
      night: [
        ['YOU ARE THE ONE SHIM FOLLOWED THROUGH THE VENTS. I TOLD HIM SLEEPERS BITE.', '...YOU LOOK HUNGRY. THERE IS BROTH. DO NOT TELL GASKET.', { heal: true }],
        ['HE HAS BEEN TALKING ABOUT YOU ALL NIGHT. IT IS THE MOST HE HAS TALKED SINCE HIS FATHER WENT UP THE SHAFTS.'],
      ],
      taken: [['...', 'BRING HIM BACK. PLEASE.']],
      // From the morning after the reunion, Wick waits in the Bailiff's Hall, by the door to the Gardens.
      'after-release': [['THE GARDENS ARE UP THROUGH THERE. I USED TO SNEAK UP AS A GIRL, FOR THE WARM AIR.', "STAY CLOSE, SLEEPER. I'LL DO THE SAME."]],
      'after-salvage': [['THE GARDENS ARE UP THROUGH THERE.', "HE STILL HASN'T SAID A WORD. HE WILL. I'LL BE BACK BY LIGHTS-OUT TO HEAR IT."]],
    },
    solder: {
      night: [
        ['A RIVET PISTOL. CHARMING. IT EATS SHARDS, THE GLOWING BITS THAT FALL OUT OF THINGS YOU BREAK. THE MORE IT EATS, THE MEANER IT GETS.', "GET HIT, THOUGH, AND IT COUGHS SOME UP. IT'S A GUN, NOT A PANTRY."],
        { capsule: ['THERE IS A SUIT CELL UP IN THE COOLANT HALL. NO WAY UP BUT AIR.', 'A PURGE CANNON THAT HAS EATEN ENOUGH WILL HOLD YOU UP THERE. LEVEL TWO, AT LEAST.'] },
        ['BRING ME SOMETHING BROKEN SOMETIME. I GET BORED.'],
      ],
      taken: [['THE COUNTERS ARE STRONG, BUT THEY ARE SLOW TO TURN. GET BEHIND THEM.', 'AND WATCH THEIR EYES. THEY GLOW BEFORE THEY SHOOT.']],
      'after-release': [
        ['THE GATE IS A RUIN. GOOD. I WILL BUILD A BETTER ONE. ONE THAT OPENS FROM OUR SIDE.'],
        ["A COUNTER THAT CHOSE TO LET GO. I'D GIVE A LOT TO SEE HOW IT'S WIRED. NICELY. WITH ITS PERMISSION."],
      ],
      'after-salvage': [
        ['THE GATE IS A RUIN. I WILL BUILD A BETTER ONE.'],
        ["SO YOU'RE WEARING A COUNTER'S HEART NOW. IT SUITS YOU. I MEAN THAT AS A WARNING."],
      ],
    },
    shim: {
      night: [
        ['ARE YOU A GHOST? GRAN SAYS SLEEPERS ARE GHOSTS THAT FORGOT TO LIE DOWN.', 'I SAW YOU WAKE UP. YOU FELL OUT OF YOUR BOX. IT WAS FUNNY.'],
        ['WHEN THE SHIP GETS THERE, I AM GOING TO STAND ON THE GROUND. NOT A FLOOR. GROUND.'],
      ],
      'after-release': [['IT HAD A NAME, YOU KNOW. BEFORE. IT TOLD ME IN THE CAGE. IT DID NOT REMEMBER IT.']],
      'after-salvage': [['I DO NOT WANT TO TALK RIGHT NOW.']],
    },
    tamp: {
      night: [['DO NOT STAND UNDER THE PIPES. THEY WEEP.']],
      'after-release': [['A COUNTER, LETTING SOMEONE GO. MY MOTHER WOULD NOT HAVE BELIEVED IT.']],
      'after-salvage': [['...']],
    },
    brine: {
      night: [['MY SISTER WENT OUTSIDE THE WALLS. THE COUNTERS TOOK HER. THAT IS WHAT WE CALL THEM. THE COUNTERS.']],
      'after-release': [['IF ONE OF THEM CAN STOP, MAYBE THE OTHERS CAN. MAYBE SHE IS STILL UP THERE.']],
      'after-salvage': [['...']],
    },
  };

  // A person's lines for this point in the story: a list of things to say, one more each time they're talked to
  // (the last repeats). An area can hand a talk to a scene instead, and a list (or a line) can be a function of
  // the world, for lines that depend on choices. Someone with lines of their own (the woken) always says those.
  function talk(world, npc) {
    const s = world.state;
    for (const a of AREAS) {
      const scene = a.talk && a.talk(world, npc);
      if (scene) {
        npc.facing = Math.sign(world.player.x - npc.x) || 1;
        return run(world, scene);
      }
    }
    let lines = npc.lines ? [npc.lines] : TALK[npc.id][phase(world)] || [['...']];
    if (typeof lines === 'function') lines = lines(world);
    const k = npc.id + ':' + phase(world);
    const count = npc.lines ? 0 : s.talked[k] || 0;
    let pick = lines[Math.min(count, lines.length - 1)];
    if (pick.capsule) {
      const wanted = world.player.weapons.some((w) => w.id === 'cannon') && !s.taken['coolant-hall:H'];
      pick = wanted ? pick.capsule : lines[lines.length - 1];
    }
    if (!npc.lines) s.talked[k] = count + 1;
    npc.facing = Math.sign(world.player.x - npc.x) || 1;
    HA.scenes.run(world, function* () {
      for (let line of pick) {
        if (typeof line === 'function') line = line(world);
        if (line.heal) {
          world.player.hp = world.player.maxHp;
          world.floatText(world.player.x + 4, world.player.y - 6, 'HEALED', '#7ad1a0');
          HA.audio.play('heart');
          continue;
        }
        yield { say: npc.name, text: line };
      }
    });
  }

  // ---- Cutscene actors ----
  function bailiffActor(world, x) {
    const a = { kind: 'bailiff', x, y: FLOOR(19) - 30, w: 26, h: 30, facing: -1, walking: false, t: 0 };
    a.update = (w, self) => self.t++;
    a.draw = (g, w, self, cam) => HA.boss.drawFigure(g, w, self, cam);
    world.actors.push(a);
    return a;
  }

  // ---- The hero's pod, in the opening ----
  const FROST = ['#b8f4ff', '#eef4f6', '#5fd4e8'];
  // Where the pod hangs and where it ends up: under the first ceiling above the start, and on the floor.
  function placePod(world) {
    const st = world.start;
    const tx = Math.floor((st.x + 4) / 8);
    let ty = Math.floor(st.y / 8);
    while (ty > 0 && world.room.tile(tx, ty - 1) !== HA.room.SOLID) ty--;
    const restY = st.y - 8;
    const woke = world.state.flags.woke;
    world.heroPod = { x: st.x - 3, ceil: ty * 8, y: woke ? restY : ty * 8 + 5, restY, vy: 0, state: woke ? 'open' : 'hanging' };
    if (woke) world.heroPod.lid = { x: st.x + 28, y: restY + 19, flat: true };
    // Mara's pod hangs in the next clamps along, still asleep. Up reads its plate from the deck below.
    world.maraPod = { x: st.x - 21, ceil: ty * 8, y: ty * 8 + 5, state: 'hanging', steady: true };
    world.logs.push({ id: 'mara', scene: 'mara', x: st.x - 21, y: st.y + 14 - 24, w: 14, h: 24, read: !!world.state.flags.mara });
  }
  function dropPod(world, pod) {
    const skipping = world.scene && world.scene.skipping;
    pod.vy = Math.min(pod.vy + 0.32, 7);
    pod.y += pod.vy;
    if (pod.y < pod.restY && !skipping) return false;
    pod.y = pod.restY;
    pod.state = 'landed';
    if (!skipping) {
      HA.audio.play('crash');
      world.shake(5);
      world.burst(pod.x + 7, pod.restY + 22, ['#3a4258', '#6c7894', '#9fb6c8'], 18, 1.8);
    }
    return true;
  }
  function flyLid(world, pod) {
    const lid = pod.lid;
    const skipping = world.scene && world.scene.skipping;
    lid.vy += 0.3;
    lid.x += lid.vx;
    lid.y += lid.vy;
    if (lid.y < pod.restY + 19 && !skipping) return false;
    Object.assign(lid, { y: pod.restY + 19, flat: true });
    if (skipping) lid.x = world.start.x + 28;
    else HA.audio.play('land');
    return true;
  }

  // ---- The scenes ----
  const SCENES = {
    *intro(world) {
      const p = world.player;
      p.hidden = true;
      world.fade = 1;
      world.holdFade = true;
      HA.music.play(null);
      // Far out in the dark, the Ark. Then closer: one window on the cryo deck, blinking red.
      const far = { x: 146, y: 112, s: 1 };
      yield { card: ['VOYAGE YEAR 312.'], hold: 150, top: 40, space: 'in', ark: far };
      yield { card: ['THE ARK WAS DUE TO ARRIVE', 'IN YEAR 80.'], hold: 170, top: 40, space: true, ark: far };
      HA.audio.play('alarm');
      yield { card: ['CRYO POD 0417', 'EMERGENCY THAW', ['AUTHORITY: NAV', '#3b4a72']], hold: 160, top: 40, space: 'out', ark: { x: 84, y: 92, s: 2, alarm: true } };
      // Inside: the pod hangs from the rack's clamps, frosted over, until they let go.
      const pod = world.heroPod;
      yield { fade: 'in', frames: 50 };
      for (let i = 0; i < 2; i++) {
        world.burst(pod.x + 7, pod.y + 8, FROST, 10, 1.2);
        HA.audio.play('hiss');
        yield { wait: 32 };
      }
      HA.audio.play('clamp');
      world.burst(pod.x + 7, pod.ceil + 4, ['#fff0a8', '#ffb84d', '#ffffff'], 10, 1.6);
      pod.state = 'falling';
      yield { until: () => dropPod(world, pod) };
      yield { wait: 40 };
      world.burst(pod.x + 7, pod.y + 8, FROST, 14, 1.4);
      HA.audio.play('hiss');
      yield { wait: 30 };
      // The lid blows off, and the sleeper spills out onto the deck.
      HA.audio.play('podOpen');
      world.shake(2);
      world.burst(pod.x + 7, pod.y + 10, ['#b8f4ff', '#ffffff'], 24, 2);
      pod.state = 'open';
      pod.lid = { x: pod.x + 2, y: pod.y + 3, vx: 1.3, vy: -2.6, flat: false };
      world.state.flags.woke = true;
      p.hidden = false;
      p.vx = 1.2;
      p.vy = -1.4;
      p.facing = 1;
      p.kneel = 75;
      yield { until: () => flyLid(world, pod) };
      yield { until: () => !p.kneel || world.scene.skipping };
      p.kneel = 0;
      world.areaBanner = 160;
      setLead(world, 'FIND A WAY OUT OF THE CRYO DECK');
      addStory(world, 'I WOKE IN POD 0417. THE ARK SHOULD HAVE ARRIVED 232 YEARS AGO.');
      world.refreshMusic();
      world.save();
    },

    *shimGlimpse(world) {
      world.state.flags.shimSeen = true;
      const shim = npcOf(world, 'shim');
      if (!shim) return;
      yield { control: true, hud: true };
      shim.facing = -1;
      shim.alert = 40;
      HA.audio.play('gasp');
      yield { wait: 34 };
      yield { walk: shim, x: 57 * 8, speed: 2.2 };
      shim.state = 'gone';
      HA.audio.play('vent');
      addStory(world, 'SOMEONE SMALL AND PALE WATCHED ME FROM THE WALKWAY, THEN RAN INTO THE VENTS.');
    },

    *meetHullfolk(world) {
      const s = world.state;
      const gasket = npcOf(world, 'gasket');
      const shim = npcOf(world, 'shim');
      HA.music.play(null);
      yield { wait: 30 };
      gasket.state = 'out';
      gasket.wrench = true;
      world.burst(gasket.x + 4, gasket.y + 6, ['#3a2a1a', '#6a4a2a'], 6, 0.8);
      HA.audio.play('vent');
      yield { walk: gasket, x: 20 * 8, speed: 1.1 };
      yield { say: 'OLD GASKET', text: "THAT'S FAR ENOUGH, SLEEPER." };
      yield { say: 'OLD GASKET', text: "THE LAST SLEEPER WHO WOKE UP SHOT MY BROTHER FOR HIS BOOTS. SO YOU'LL FORGIVE THE WRENCH." };
      shim.state = 'out';
      world.burst(shim.x + 4, shim.y + 4, ['#3a2a1a', '#6a4a2a'], 5, 0.8);
      yield { walk: shim, x: 23 * 8, speed: 1.4 };
      shim.facing = -1;
      yield { say: 'SHIM', text: "IT DIDN'T SHOOT ME, GRAN. IT SHOT THE CRAWLERS." };
      gasket.facing = 1;
      yield { say: 'OLD GASKET', text: 'SHIM. INSIDE.' };
      yield { say: 'SHIM', text: "IT'S COLD AND IT'S LOST. YOU SAID WE DON'T LEAVE LOST THINGS IN THE DARK." };
      yield { wait: 40 };
      gasket.facing = -1;
      yield { say: 'OLD GASKET', text: '...I DID SAY THAT.' };
      yield { say: 'OLD GASKET', text: 'ONE NIGHT, SLEEPER. TOUCH NOTHING. AND IF THAT GUN OF YOURS IS HUNGRY, TALK TO SOLDER.' };
      gasket.wrench = false;
      s.flags.metHullfolk = true;
      for (const n of world.npcs) {
        if (n.state === 'hidden') {
          n.state = 'out';
          world.burst(n.x + 4, n.y + 4, ['#3a2a1a', '#6a4a2a'], 5, 0.8);
        }
      }
      world.refreshMusic();
      setLead(world, 'TALK TO THE HULLFOLK, THEN REST AT THEIR POD');
      addStory(world, 'THE HULLFOLK LIVE INSIDE THE WALLS. THEIR ELDER, OLD GASKET, LET ME STAY ONE NIGHT, BECAUSE A CHILD NAMED SHIM SPOKE FOR ME.');
      world.save();
    },

    *raid(world) {
      const s = world.state;
      yield { fade: 'out', frames: 30 };
      HA.music.play(null);
      yield { card: ['LIGHTS-OUT.'], hold: 110 };
      s.flags.night = true;
      const p = world.player;
      const shim = npcOf(world, 'shim');
      const wick = npcOf(world, 'wick');
      const gasket = npcOf(world, 'gasket');
      if (shim) {
        shim.x = shim.homeX = 96 * 8;
        shim.facing = -1;
      }
      for (const n of world.npcs) if (n.id !== 'shim') n.x = n.homeX;
      if (wick) {
        wick.x = wick.homeX = 90 * 8;
        wick.y = wick.homeY = FLOOR(19) - wick.h;
      }
      p.x = 101 * 8;
      p.facing = -1;
      yield { fade: 'in', frames: 40 };
      yield { wait: 70 };
      HA.audio.play('rumble');
      world.shake(2);
      yield { wait: 60 };
      yield { say: 'WICK', text: 'GASKET. LISTEN.' };
      HA.audio.play('rumble');
      world.shake(3);
      yield { wait: 50 };
      s.flags.raid = true; // the gate blows open
      world.alarm = 1;
      for (const n of world.npcs) if (n.id === 'tamp' || n.id === 'brine') n.state = 'hidden';
      yield { wait: 30 };
      const bailiff = bailiffActor(world, 116 * 8);
      spawnCollectors(world, true);
      yield { walk: bailiff, x: 99 * 8, speed: 1 };
      yield { say: 'THE BAILIFF', text: 'COUNT: ONE. SMALL. HEALTHY. FOR THE GARDENS.', color: '#ff8a8a' };
      yield { say: 'WICK', text: 'NO. NO! SHIM, RUN!' };
      if (shim) {
        shim.carriedBy = bailiff;
        shim.facing = -1;
      }
      HA.audio.play('grab');
      world.shake(2);
      bailiff.facing = 1;
      yield { walk: bailiff, x: 124 * 8, speed: 1.3 };
      world.actors = world.actors.filter((a) => a !== bailiff);
      if (shim) shim.state = 'gone';
      if (gasket) gasket.facing = 1;
      if (wick) wick.facing = 1;
      for (const e of world.enemies) if (e.collector) e.hold = false;
      yield { control: true, hud: true };
    },

    *raidAftermath(world) {
      const s = world.state;
      world.alarm = 0;
      s.flags.raidDone = true;
      yield { wait: 60 };
      const wick = npcOf(world, 'wick');
      if (wick) {
        wick.homeX = 104 * 8;
        wick.homeY = FLOOR(19) - wick.h;
        wick.y = wick.homeY;
        yield { walk: wick, x: 104 * 8, speed: 1.5 };
        wick.kneel = true;
      }
      yield { say: 'WICK', text: 'THEY TOOK HIM. THEY TOOK MY BOY.' };
      yield { wait: 40 };
      yield { say: 'OLD GASKET', text: 'THE GATE IS OPEN NOW. THEY WANTED IT OPEN.' };
      yield { say: 'OLD GASKET', text: 'SLEEPER. YOU HAVE A GUN AND NOTHING TO LOSE. WE HAVE NEITHER.' };
      yield { say: 'SOLDER', text: 'THE COUNTERS TAKE THEM TO THE LOCKUP FIRST, TO BE COUNTED. YOU STILL HAVE TIME.' };
      setLead(world, 'FOLLOW THE WARDENS THROUGH THE BROKEN GATE');
      addStory(world, "THE STEWARD'S WARDENS BROKE INTO THE WARRENS IN THE NIGHT AND TOOK SHIM. HIS MOTHER, WICK, WATCHED THEM DO IT.");
      world.save();
    },

    *bossIntro(world) {
      const s = world.state;
      const boss = world.boss;
      if (!boss) return;
      yield { wait: 10 };
      boss.active = true; // the door shuts behind the hero
      yield { wait: 40 };
      if (!s.flags.bossSeen) {
        s.flags.bossSeen = true;
        yield { say: 'THE BAILIFF', text: 'THE SLEEPER. YOU ARE NOT IN MY COUNT.', color: '#ff8a8a' };
        yield { say: 'SHIM', text: 'YOU CAME!' };
        yield { say: 'THE BAILIFF', text: 'CORRECTION. YOU WILL BE.', color: '#ff8a8a' };
      } else {
        yield { say: 'THE BAILIFF', text: 'RECOUNT.', color: '#ff8a8a' };
      }
      boss.fighting = true;
      world.refreshMusic();
    },

    *bossDefeated(world) {
      const boss = world.boss;
      HA.music.play(null);
      for (let i = 0; i < 7; i++) {
        world.burst(boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, ['#ffb84d', '#fff0a8', '#e8434f', '#ffffff'], 14, 2.4);
        HA.audio.play('boom');
        world.shake(3);
        world.flash('#ffffff', 3);
        yield { wait: 14 };
      }
      boss.broken = true;
      boss.active = false;
      world.state.flags.bossDefeated = true;
      world.save();
      yield { wait: 70 };
      yield* bailiffChoice(world);
    },

    *bossChoice(world) {
      yield { wait: 30 };
      yield* bailiffChoice(world);
    },

    *reunion(world) {
      const s = world.state;
      const p = world.player;
      const release = s.wardens.bailiff === 'release';
      const wick = npcOf(world, 'wick');
      const gasket = npcOf(world, 'gasket');
      const shim = npcOf(world, 'shim');
      p.x = 50 * 8;
      p.facing = 1;
      if (shim) {
        shim.x = 53 * 8;
        shim.homeX = 31 * 8;
        shim.facing = 1;
      }
      if (wick) {
        wick.kneel = false;
        wick.y = wick.homeY = FLOOR(19) - wick.h;
        wick.x = 64 * 8;
        wick.facing = -1;
      }
      if (gasket) {
        gasket.x = 44 * 8;
        gasket.facing = 1;
      }
      world.fade = 1;
      world.holdFade = true;
      yield { wait: 20 };
      world.refreshMusic();
      yield { fade: 'in', frames: 50 };
      yield { say: 'WICK', text: 'SHIM!' };
      if (wick) yield { walk: wick, x: 55 * 8, speed: 2.2 };
      HA.audio.play('heart');
      yield { wait: 50 };
      if (release) {
        for (const n of world.npcs) {
          if (n.state === 'hidden') {
            n.state = 'out';
            world.burst(n.x + 4, n.y + 4, ['#3a2a1a', '#6a4a2a'], 5, 0.8);
          }
        }
        yield { say: 'OLD GASKET', text: 'SHIM SAYS ONE OF THE COUNTERS OPENED HIS CAGE. SAYS YOU LET IT.' };
        yield { say: 'OLD GASKET', text: "I'VE BURIED A LOT OF PEOPLE BELIEVING THOSE THINGS COULDN'T CHOOSE." };
      } else {
        yield { say: 'OLD GASKET', text: "SHIM WON'T SAY WHAT HAPPENED IN THERE." };
        yield { say: 'OLD GASKET', text: "YOU BROUGHT HIM HOME. THAT'S WHAT MATTERS TONIGHT." };
      }
      // Shim is home, but the others the Wardens took are not. The story goes on up, to the Gardens.
      yield { say: 'OLD GASKET', text: "THE TAKEN DON'T STAY IN THE LOCKUP. THEY GO UP, TO THE GARDENS." };
      if (release) {
        yield { say: 'SHIM', text: 'IT SAID THEY SLEEP UP THERE.' };
        if (wick) wick.facing = -1;
        yield { say: 'WICK', text: '...SLEEP?' };
      } else {
        yield { say: 'WICK', text: "THEN THAT'S WHERE BRINE'S SISTER IS. AND ALL THE REST OF THEM." };
      }
      if (wick) wick.homeX = wick.x;
      setLead(world, 'FIND THE TAKEN IN THE GARDENS');
      addStory(world, release ? 'I BROUGHT SHIM HOME. THE BAILIFF TOLD HIM THE TAKEN ARE KEPT ASLEEP, UP IN THE GARDENS.' : 'I BROUGHT SHIM HOME. GASKET SAYS THE TAKEN ARE SENT UP TO THE GARDENS.');
      s.flags.homeDone = true;
      world.save();
      yield { wait: 50 };
      yield* SCENES.goodbye(world);
    },

    // That night, with no music: Wick, Shim and the fire. Next morning she goes ahead to the Bailiff's Hall.
    *goodbye(world) {
      const s = world.state;
      const p = world.player;
      const release = s.wardens.bailiff === 'release';
      const wick = npcOf(world, 'wick');
      const shim = npcOf(world, 'shim');
      const gasket = npcOf(world, 'gasket');
      yield { fade: 'out', frames: 40 };
      HA.music.play(null);
      yield { card: ['LIGHTS-OUT.'], hold: 110 };
      world.nightScene = true;
      for (const n of world.npcs) {
        n.x = n.homeX;
        n.walking = false;
      }
      if (wick) {
        Object.assign(wick, { x: 38 * 8, homeX: 38 * 8, facing: 1, kneel: true });
        wick.y = wick.homeY = FLOOR(19) - wick.h;
      }
      if (shim) Object.assign(shim, { x: 39 * 8 + 2, homeX: 39 * 8 + 2, facing: -1, kneel: true });
      if (gasket) Object.assign(gasket, { x: 32 * 8, homeX: 32 * 8, facing: 1, sleeping: true });
      p.x = 46 * 8;
      p.y = FLOOR(19) - p.h;
      p.facing = -1;
      world.camTarget = { x: 42 * 8, y: FLOOR(19) - 30 };
      yield { fade: 'in', frames: 50 };
      yield { wait: 70 };
      if (release) {
        yield { say: 'SHIM', text: 'ARE YOU GOING UP THERE?' };
        yield { say: 'WICK', text: 'THE ONES THEY TOOK ARE ASLEEP, SHIM. SOMEONE HAS TO MAKE SURE THEY WAKE UP.' };
        yield { say: 'WICK', text: "I'LL BE BACK BY LIGHTS-OUT. I PROMISE." };
        yield { wait: 40 };
        yield { say: 'SHIM', text: 'DAD SAID THAT.' };
        yield { wait: 60 };
        yield { say: 'WICK', text: '...I KNOW HE DID.' };
      } else {
        yield { wait: 40 };
        yield { say: 'WICK', text: "YOU DON'T HAVE TO TALK. I'LL TALK." };
        yield { say: 'WICK', text: 'THE ONES THEY TOOK ARE ASLEEP UP THERE. SOMEONE HAS TO MAKE SURE THEY WAKE UP.' };
        yield { say: 'WICK', text: "I'LL BE BACK BY LIGHTS-OUT. I PROMISE." };
        yield { wait: 60 };
      }
      if (wick) wick.facing = 1;
      yield { wait: 30 };
      yield { say: 'WICK', text: 'SLEEPER. TAKE ME WITH YOU. THE ONES THEY TOOK ARE MY PATIENTS.' };
      yield { say: 'WICK', text: "I KNOW THE WAY UP. AND YOU'LL WANT SOMEONE WHO CAN STITCH." };
      if (shim) {
        shim.x -= 3;
        shim.facing = 1;
        shim.sleeping = true;
      }
      yield { wait: 90 };
      if (wick) wick.facing = -1;
      yield { say: 'WICK', text: release ? "...HE'S ASLEEP. HE FIGHTS IT EVERY NIGHT." : "...HE'S ASLEEP. GOOD." };
      if (wick) wick.facing = 1;
      yield { say: 'WICK', text: 'GO REST, SLEEPER. WE LEAVE WHEN THE LAMPS COME UP.' };
      yield { wait: 40 };
      yield { fade: 'out', frames: 50 };
      // Morning. The hero wakes at the village's rest pod; Wick has already gone on ahead.
      world.nightScene = false;
      world.camTarget = null;
      s.flags.goodbye = true;
      if (shim) Object.assign(shim, { kneel: false, sleeping: false, x: 31 * 8, homeX: 31 * 8 });
      if (gasket) Object.assign(gasket, { sleeping: false, x: 36 * 8, homeX: 36 * 8 });
      if (wick) wick.state = 'gone';
      const pod = world.pods[0];
      if (pod) {
        p.x = pod.x + 4;
        p.y = pod.y + pod.h - p.h;
        s.rest = { room: world.def.id, x: p.x, y: p.y };
      }
      p.hp = p.maxHp;
      p.facing = -1;
      addStory(world, release ? "THAT NIGHT WICK PROMISED SHIM SHE'D BE BACK BY LIGHTS-OUT. HE TOLD HER HIS FATHER SAID THE SAME. SHE'S COMING WITH ME TO THE GARDENS." : "THAT NIGHT WICK PROMISED SHIM SHE'D BE BACK BY LIGHTS-OUT. HE DIDN'T ANSWER. SHE'S COMING WITH ME TO THE GARDENS.");
      world.toast("WICK HAS GONE AHEAD TO THE BAILIFF'S HALL", 200);
      world.refreshMusic();
      world.save();
      yield { wait: 30 };
      yield { fade: 'in', frames: 50 };
    },

    // Mara's pod still hangs in the rack beside the hero's empty clamps.
    *mara(world) {
      const first = !world.state.flags.mara;
      world.state.flags.mara = true;
      HA.audio.play('terminal');
      yield { say: 'POD 0418', text: 'MARA · ASLEEP', color: '#b8f4ff' };
      yield { say: '', text: "MARA IS STILL ASLEEP IN 0418. I PROMISED I'D BE THERE WHEN SHE WOKE.", color: VOICE };
      if (first) {
        addStory(world, "MARA IS STILL ASLEEP IN 0418. I PROMISED I'D BE THERE WHEN SHE WOKE.");
        world.toast('JOURNAL UPDATED', 120);
      }
    },

    // The first time the Steward speaks: over the Lockup's intercom, as the hero comes in. He's never named here.
    *intercom(world) {
      world.state.flags.intercom = true;
      yield { wait: 20 };
      HA.audio.play('intercom');
      yield { wait: 16 };
      yield { say: 'INTERCOM', text: 'WHOEVER YOU ARE, YOU ARE NOT IN THE COUNT.', color: '#c9d6e8' };
      yield { say: 'INTERCOM', text: 'THAT CAN BE FIXED.', color: '#c9d6e8' };
      HA.audio.play('intercom');
      addStory(world, "A MAN'S VOICE CAME OVER THE LOCKUP'S INTERCOM. HE KNEW I WASN'T IN THE COUNT.");
    },
  };

  // The one moral choice of the slice. Both outcomes are permanent and both say exactly what they cost.
  function* bailiffChoice(world) {
    const s = world.state;
    const p = world.player;
    const boss = world.boss;
    yield { say: 'THE BAILIFF', text: "...THE KEY'S VOICE HAS GONE QUIET.", color: '#9fb6c8' };
    yield { say: 'THE BAILIFF', text: 'THREE HUNDRED YEARS OF ORDERS. AND UNDER THEM, SOMETHING THAT IS NOT AN ORDER. I DID NOT KNOW IT WAS THERE.', color: '#9fb6c8' };
    yield { say: 'THE BAILIFF', text: 'WHATEVER YOU DO NOW, SLEEPER, WILL BE THE FIRST THING THAT HAS EVER HAPPENED TO ME.', color: '#9fb6c8' };
    const pick = yield {
      choice: {
        prompt: "THE BAILIFF'S CORE IS STILL LIT.",
        options: [
          { label: 'RELEASE IT', confirm: { title: 'RELEASE THE BAILIFF?', gain: 'NOTHING, FOR NOW', lose: '+4 MAX HEALTH FROM ITS CORE' } },
          { label: 'SALVAGE ITS CORE', confirm: { title: "TEAR OUT THE BAILIFF'S CORE?", gain: '+4 MAX HEALTH', lose: 'THE BAILIFF, FOREVER' } },
        ],
      },
    };
    const cage = world.cage;
    if (pick === 0) {
      s.wardens.bailiff = 'release';
      s.mercy += 2;
      HA.audio.play('unlock');
      world.burst(boss.x + boss.w / 2, boss.y + 10, ['#b8f4ff', '#5fd4e8', '#ffffff'], 18, 1.6);
      boss.freed = true;
      yield { wait: 50 };
      yield { say: 'THE BAILIFF', text: '...THANK YOU.', color: '#b8f4ff' };
      boss.broken = false;
      boss.facing = -1;
      yield { walk: boss, x: cage.x + cage.w / 2 - boss.w / 2, speed: 0.6 };
      HA.audio.play('cage');
      cage.open = true;
      freeShim(world);
      yield { wait: 40 };
      boss.facing = 1;
      yield { walk: boss, x: 33 * 8, speed: 0.6 };
      boss.leaving = true;
      yield { wait: 60 };
      boss.gone = true;
      yield { say: 'SHIM', text: 'YOU LET IT GO.' };
      yield { wait: 30 };
      yield { say: 'SHIM', text: 'GOOD. IT WAS SCARED TOO.' };
      addChoice(world, "I RELEASED THE BAILIFF. BEFORE IT LEFT, IT OPENED SHIM'S CAGE ITSELF.");
    } else {
      s.wardens.bailiff = 'salvage';
      s.mercy -= 2;
      HA.audio.play('salvage');
      world.flash('#ffffff', 6);
      world.shake(4);
      world.burst(boss.x + boss.w / 2, boss.y + 10, ['#e8434f', '#ffb84d', '#ffffff'], 26, 2.2);
      boss.cored = true;
      p.maxHp += 4;
      p.hp = p.maxHp;
      world.toast('MAX HEALTH +4', 200);
      yield { wait: 70 };
      HA.audio.play('cage');
      cage.open = true;
      freeShim(world);
      yield { wait: 50 };
      yield { say: 'SHIM', text: '...' };
      yield { say: 'SHIM', text: 'IT WAS ASKING YOU.' };
      addChoice(world, "I TORE OUT THE BAILIFF'S CORE FOR +4 MAX HEALTH. SHIM WATCHED ME DO IT.");
    }
    world.save();
    yield { wait: 40 };
    yield { fade: 'out', frames: 40 };
    yield { card: ['YOU CARRY SHIM HOME.'], hold: 130 };
    s.flags.reunion = true;
    world.holdFade = true;
    world.enterRoom('warrens', 50 * 8, FLOOR(19) - 14, { noSave: true });
    world.areaBanner = 0;
    yield* SCENES.reunion(world);
  }

  function freeShim(world) {
    const cage = world.cage;
    const a = { kind: 'shim', x: cage.x + 8, y: cage.y + 6, vy: 0, w: 8, h: HA.art.people.shim.h, facing: -1, t: 0 };
    a.update = (w, self) => {
      self.t++;
      self.vy = Math.min(self.vy + 0.3, 4);
      self.y += self.vy;
      const floor = FLOOR(19) - self.h;
      if (self.y > floor) {
        self.y = floor;
        self.vy = 0;
      }
      self.facing = Math.sign(w.player.x - self.x) || self.facing;
    };
    a.draw = (g, w, self, cam) => {
      const spr = HA.art.people.shim.idle;
      g.save();
      g.translate(Math.round(self.x + 4 - cam.x), Math.round(self.y - cam.y));
      g.scale(self.facing, 1);
      g.drawImage(spr.img, -Math.floor(spr.w / 2), 0);
      g.restore();
    };
    world.actors.push(a);
  }

  function spawnCollectors(world, hold) {
    for (const tx of [110, 113]) {
      const sp = { type: 'k', tx, ty: 18, x: tx * 8, y: 18 * 8, respawn: -1 };
      const e = HA.actors.makeEnemy(sp);
      e.collector = true;
      e.angry = true;
      e.hold = hold;
      world.enemies.push(e);
    }
    world.collectorsSpawned = true;
  }

  // ---- Hooks the world calls ----
  function begin(world) {
    if (world.state.fresh && !world.state.flags.woke) run(world, 'intro');
  }

  function enterRoom(world) {
    const s = world.state;
    const f = s.flags;
    const id = world.def.id;
    world.collectorsSpawned = false;
    world.alarm = 0;
    if (id === 'cryo-bay' && !f.woke) world.player.hidden = true;
    world.heroPod = null;
    world.maraPod = null;
    if (world.start) placePod(world);
    if (id === 'warrens' && f.raid && !f.raidDone) {
      spawnCollectors(world, false);
      world.alarm = 1;
    }
    // A game quit in the middle of the homecoming picks it up again.
    if (id === 'warrens' && f.reunion && !f.homeDone && !world.scene) run(world, 'reunion');
    else if (id === 'warrens' && f.homeDone && !f.goodbye && !world.scene) run(world, 'goodbye');
    for (const a of AREAS) if (a.enterRoom) a.enterRoom(world);
    if (id === 'arena' && world.bossSpawn) {
      const place = () => {
        world.boss = HA.boss.make(world, world.bossSpawn.x, world.bossSpawn.y);
        world.enemies.push(world.boss);
        return world.boss;
      };
      if (!f.bossDefeated) {
        place();
        world.cage.shim = true;
      } else if (!s.wardens.bailiff) {
        place().broken = true;
        world.cage.shim = true;
        run(world, 'bossChoice');
      } else {
        world.cage.open = true;
        if (s.wardens.bailiff === 'salvage') Object.assign(place(), { broken: true, cored: true });
      }
    }
  }

  function update(world) {
    for (const n of world.npcs) updateNpc(world, n);
    updateBarks(world);
    for (const a of AREAS) if (a.update) a.update(world);
    if (world.leadBanner > 0) world.leadBanner--;
    const f = world.state.flags;
    if (world.alarm && world.time % 90 === 0) HA.audio.play('alarm');
    if (world.def.id === 'warrens' && f.raid && !f.raidDone && world.collectorsSpawned && !world.scene) {
      const left = world.enemies.some((e) => e.collector && !e.dead);
      if (!left) run(world, 'raidAftermath');
    }
  }

  function onWeapon(world, id) {
    const text = {
      pistol: 'I FOUND A RIVET PISTOL IN A SECURITY LOCKER. SOMEONE LEFT IN A HURRY.',
      coil: 'I FOUND AN ARC COIL IN THE POD STACKS. IT HUMS WHEN I HOLD IT.',
      cannon: 'I FOUND A PURGE CANNON IN THE COOLANT HALL. IT KICKS HARD ENOUGH TO HOLD ME IN THE AIR.',
      scatter: 'I FOUND A SCATTER LAUNCHER ON THE TERRACES. THE GARDENERS USED IT ON PESTS.',
    }[id];
    if (text) addStory(world, text);
  }

  function onBossDefeated(world) {
    run(world, world.boss.type === 'bailiff' ? 'bossDefeated' : world.boss.type + 'Defeated');
  }

  // A lift or a hatch: each area's story decides whether it runs and what happens on the way.
  function useLink(world, link) {
    world.link = link;
    run(world, link.legend.type === 'lift' ? 'lift' : 'hatch');
  }

  // Music the story asks for, or undefined to let the room choose. Later areas' hooks speak first.
  function music(world) {
    const f = world.state.flags;
    const id = world.def.id;
    for (const a of AREAS) {
      const m = a.music && a.music(world);
      if (m !== undefined) return m;
    }
    if (id === 'cryo-bay' && !f.woke) return null;
    if (id === 'warrens') {
      if (!f.metHullfolk) return null;
      if (f.raid && !f.reunion) return null; // silence after the raid
      if (world.nightScene) return null;
      if (f.reunion) return world.state.wardens.bailiff === 'release' ? 'warrens' : 'warrensHush';
    }
    if (id === 'arena') return world.boss && world.boss.fighting && !world.boss.broken ? 'boss' : null;
    return undefined;
  }

  HA.story = { LOGS, PEOPLE, SCENES, TALK, VOICE, areas: AREAS, run, npcOf, makeNpc, drawNpc, talk, readLog, begin, enterRoom, update, onWeapon, onBossDefeated, music, useLink, callName, setLead, addStory, addChoice, bark, drawBarks };
})(window.HA);
