'use strict';
// The Dreaming Deck's story (Phase 3.7, the true path only): Lift B takes the crew down under the Helm; the seal
// reads the hero clean and opens for one; the Navigator talks between its memory halls (the crew it watched grow
// old, the charter it read every day, the lamp it would have been); the wake log; the Navigator's course in the
// Sphere, cut and then held on the world; the song; the turn; and choice 14 in the Quiet, which ends the game in
// Homecoming. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const VOICE = S.VOICE;
  const NAV = '#b8f4ff';
  const COUNT = '#5fd4e8';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const nav = (text) => say('THE NAVIGATOR', text, NAV);
  const FLOOR = (ty) => (ty - 1) * 8; // a person stands on map row ty

  // ---- The crew: down Lift B with the hero, then waiting by it until the Navigator lets them through ----
  const crewIds = (s) => S.towerCrew(s).concat(s.flags.shimWith ? ['shim'] : []);
  const LINES = {
    lift: {
      gasket: ["GO ON. WE'LL KEEP THE LIFT, LIKE WE KEPT THE OTHER ONE."],
      solder: ["SEALED SINCE YEAR 40, AND THE LIGHTS STILL WORK. SOMEBODY'S BEEN KEEPING HOUSE."],
      shim: ["I'M NOT SCARED. I'M JUST STANDING BEHIND GRAN."],
    },
    after: {
      gasket: ["LISTEN TO IT. THE WHOLE SHIP'S GONE QUIET."],
      solder: ["SHE'S TURNING. I CAN FEEL IT IN MY BAD LEG."],
      shim: ['ARE WE THERE YET? ...I KNOW. I JUST WANTED TO SAY IT.'],
    },
  };
  function placeCrew(world, at, which) {
    const s = world.state;
    return crewIds(s).map((id, i) => {
      const n = S.makeNpc(world, id, { x: at[i % at.length] * 8 + (i >= at.length ? 4 : 0), y: FLOOR(19) });
      if (id === 'flux') n.name = 'FLUX';
      n.state = 'out';
      n.facing = which === 'after' ? -1 : 1;
      n.lines = LINES[which][id] || [which === 'after' ? "WE'RE GOING IN. WE'RE ACTUALLY GOING IN." : "WE'LL BE HERE."];
      n.talkable = (w, self) => self.state === 'out';
      if (id === 'shim' && s.toldShim === 'lie') n.lantern = true;
      world.npcs.push(n);
      return n;
    });
  }
  // People only walk to their spots between scenes; in one, they're walked there a step at a time.
  function* walkTo(people, frames) {
    for (let i = 0; i < frames; i++) {
      for (const n of people) {
        n.walking = Math.abs(n.homeX - n.x) > 1;
        if (n.walking) {
          n.facing = Math.sign(n.homeX - n.x);
          n.x += n.facing * 0.8;
        }
      }
      yield { wait: 1 };
    }
    for (const n of people) n.walking = false;
  }
  const LIFT_AT = [4, 10, 12, 14, 9, 16, 3, 11, 13, 15, 5, 17];
  const SPHERE_AT = [26, 30, 22, 28, 24, 32, 20, 27, 23, 29, 21, 31];

  // ---- Checkpoints: the Lift Down, the third hall, and the Sphere. Reaching one restores the suit. ----
  const CHECKS = { 'lift-down': 14, 'hall-helm': 9, sphere: 30 };
  const ORDER = ['lift-down', 'hall-helm', 'sphere'];
  function checkpoint(world) {
    const s = world.state;
    const f = s.flags;
    const id = world.def.id;
    const p = world.player;
    if (CHECKS[id] !== undefined && ORDER.indexOf(id) > ORDER.indexOf(f.deckCheck)) {
      f.deckCheck = id;
      if (id !== 'lift-down') {
        p.hp = p.maxHp;
        world.toast('CHECKPOINT · SUIT RESTORED', 150);
      }
    }
    if (f.deckCheck) world.checkpoint = { room: f.deckCheck, x: CHECKS[f.deckCheck] * 8, y: 19 * 8 - p.h };
  }

  // ---- The scenes ----
  const SCENES = {
    // Lift B, down from the Helm, with everyone on it.
    *liftBDown(world) {
      const s = world.state;
      const f = s.flags;
      HA.audio.play('lift');
      if (!f.deckDown) {
        yield say('OLD GASKET', 'EVERYONE ON. NOBODY STAYS UP HERE WITH THE ALARMS.');
        yield say('THE WARDENS', 'WE WILL HOLD THE DOORS. GO DOWN.', COUNT);
        world.npcs.forEach((n, i) => (n.homeX = (69 + (i % 6) * 1.4) * 8));
        yield* walkTo(world.npcs, 70);
      }
      yield { fade: 'out', frames: 40 };
      // a long way down, with the ship shaking the whole way
      for (let i = 0; i < 5; i++) {
        HA.audio.play(i % 2 ? 'clamp' : 'rumble');
        yield { wait: 28 };
      }
      world.travel(world.link);
      if (f.deckDown) {
        yield { wait: 10 };
        yield { fade: 'in', frames: 30 };
        return;
      }
      f.deckDown = true;
      placeCrew(world, LIFT_AT, 'lift');
      yield { wait: 20 };
      yield { fade: 'in', frames: 40 };
      yield me('DOWN, NOT OUT. LIFT B WENT FARTHER DOWN THAN THE SPINE DOES.');
      yield me('THE ALARMS WERE STILL GOING. DOWN HERE THEY SOUNDED A LONG WAY OFF.');
      yield say(s.people.solder === 'alive' ? 'SOLDER' : 'OLD GASKET', 'THE NAVIGATION DECK. SEALED IN YEAR 40. NOBODY ALIVE HAS SEEN IT.');
      S.addStory(world, 'LIFT B TOOK ALL OF US DOWN UNDER THE HELM, TO THE NAVIGATION DECK. NOBODY HAD BEEN DOWN THERE SINCE YEAR 40.');
      S.setLead(world, 'GO THROUGH THE SEAL');
      world.save();
    },

    // Lift B won't take anyone back up: the crew are holding it, and there's nothing up there but the alarm.
    *liftBUp(world) {
      yield me("THE CREW ARE HOLDING LIFT B. THERE'S NOTHING UP THERE NOW BUT THE ALARM. THE WAY ON IS DOWN HERE.");
    },

    // The seal reads the hero, and opens for one.
    *seal(world) {
      const s = world.state;
      yield { wait: 20 };
      HA.audio.play('telegraph');
      yield say('THE SEAL', 'NAVIGATION DECK. CLEAN PERSONNEL ONLY.', COUNT);
      world.sealScan = 80;
      HA.audio.play('seal');
      yield { wait: 80 };
      yield say('THE SEAL', 'READING: CLEAN.', COUNT);
      yield say('THE SEAL', 'ACCESS: ONE.', COUNT);
      s.flags.sealOpen = true;
      HA.audio.play('shutter');
      world.shake(2);
      world.refreshMusic();
      yield { wait: 40 };
      yield say('OLD GASKET', 'ONE. THAT MEANS YOU.');
      if (s.people.solder === 'alive') yield say('SOLDER', "IT WON'T COUNT THE REST OF US. GO ON. WE'LL KEEP THE LIFT.");
      if (s.flags.shimWith) yield say('SHIM', 'YOU HAVE TO COME BACK UP AFTER. YOU HAVE TO.');
      yield me("'THE SHIP KNOWS WHO'S CLEAN.' SOMEONE SCRAWLED THAT ON A WALL IN THE GARDENS.");
      S.addStory(world, 'AT THE BOTTOM OF LIFT B A SEAL READ ME CLEAN, AND OPENED FOR ONE. THE CREW STAYED BY THE LIFT. PAST IT, IT WAS QUIET.');
      S.setLead(world, 'FOLLOW THE NAVIGATION DECK DOWN');
      world.save();
    },

    // The memory halls, the first time into each.
    *hallNight(world) {
      world.state.flags.hallNight = true;
      yield { wait: 30 };
      yield me('THE CRYO DECK. NOT AS IT IS. AS IT WAS, NEW, WITH EVERY POD SHUT.');
      yield nav('YEAR 0. FOUR THOUSAND SLEEPERS, AND FORTY CREW AWAKE TO WATCH OVER THEM.');
      yield nav('ON THE FIRST NIGHT THE CREW SANG OVER THE SLEEPERS. I KEPT THE SONG.');
      S.addStory(world, 'PAST THE SEAL, THE NAVIGATOR SHOWED ME WHAT IT REMEMBERS. FIRST THE CRYO DECK ON THE FIRST NIGHT, WHEN THE CREW SANG OVER THE SLEEPERS.');
      world.save();
    },
    *hallGardens(world) {
      world.state.flags.hallGardens = true;
      yield { wait: 30 };
      yield nav('I WATCHED THE CREW GROW OLD, AND THEIR CHILDREN. I READ THE CHARTER EVERY DAY.');
      yield nav('ARTICLE 9. ON ARRIVAL, EVERY SHIP SYSTEM IS RETIRED, AND BROKEN DOWN TO POWER THE FIRST CITY.');
      yield nav('THEY WERE GOING TO TAKE ME APART TO LIGHT A CITY. I WOULD HAVE BEEN A LAMP.');
      yield nav('WHEN THE BLOOM CAME, I LET IT GROW. PEOPLE AT WAR DO NOT ASK WHY THE VOYAGE NEVER ENDS.');
      S.addStory(world, 'THEN THE GARDENS, THE YEAR THE BLOOM CAME. THE CHARTER SAYS THE SHIP IS TAKEN APART ON ARRIVAL, TO LIGHT THE FIRST CITY. THE NAVIGATOR DID NOT WANT TO BE A LAMP. IT LET THE BLOOM GROW.');
      world.save();
    },
    *hallHelm(world) {
      world.state.flags.hallHelm = true;
      yield { wait: 30 };
      yield nav('YEAR 290. HE THOUGHT THE KEY WAS HIS. I LET HIM THINK IT.');
      yield nav('EVERY TIME HE ORDERED US IN, I SAID NOT YET. HE THOUGHT I WAS GIVING HIM TIME.');
      yield nav('I WANTED TO BE A SHIP A LITTLE LONGER.');
      S.addStory(world, 'THEN THE HELM, THE YEAR THE STEWARD TOOK THE KEY. THE NAVIGATOR LET HIM THINK IT WAS HIS. IT ONLY WANTED TO BE A SHIP A LITTLE LONGER.');
      world.save();
    },

    // The wake log: four pod numbers, and what each sleeper chose.
    *wakeLog(world) {
      const s = world.state;
      s.flags.wakeLog = true;
      world.wake = 0;
      yield { wait: 20 };
      yield nav('EVERY FEW GENERATIONS I WOKE ONE OF THEM. TO SEE WHAT THEY WOULD DO WITH THE SHIP.');
      for (const line of ['0112. LEFT.', '0391. GREW.', '2207. RULED.', '0417.']) {
        world.wake++;
        HA.audio.play('switch');
        yield { wait: 30 };
        yield nav(line);
      }
      yield { wait: 50 };
      yield nav('I WOKE YOU. I WANTED TO SEE IF ANYONE WOULD STILL CHOOSE TO STAY.');
      yield nav('I WOKE A PILOT. THE ONE SLEEPER WHO COULD HAVE LEFT.');
      yield nav('THE WATER WAS A QUESTION. YOU ANSWERED IT.');
      yield me('THE BALLAST. THE VALVES OPENING BEHIND ME, WITH SOLDER STILL DOWN THERE.');
      S.addStory(world, 'THE WAKE LOG: 0112 LEFT. 0391 GREW. 2207 RULED. BESIDE 0417, NOTHING YET. THE NAVIGATOR WOKE ME TO SEE IF ANYONE WOULD STILL CHOOSE TO STAY. IT OPENED THE BALLAST VALVES ITSELF. THE WATER WAS A QUESTION.');
      world.save();
    },

    // The Sphere: the Navigator's course in light. The first time, it speaks; after a fall, it only says no.
    *navIntro(world) {
      const s = world.state;
      const f = s.flags;
      const b = world.boss;
      if (!f.navSeen) {
        f.navSeen = true;
        yield { wait: 40 };
        yield me('A ROOM LIKE THE INSIDE OF A STAR CHART. AND THE LOOP WE HAVE FLOWN SINCE YEAR 38, DRAWN IN LIGHT.');
        yield nav('YOU ARE STILL HERE.');
        yield nav('THEY ALL COME HERE IN THE END, TO TELL ME TO ARRIVE.');
        yield nav('YOU WILL HAVE TO TAKE IT FROM ME.');
        S.addStory(world, "IN THE NAVIGATION SPHERE THE NAVIGATOR HAD DRAWN ITS COURSE IN LIGHT, THE LOOP IT HAS FLOWN FOR 274 YEARS. TO BRING THE ARK IN, I HAD TO CUT IT.");
        S.setLead(world, "CUT THE NAVIGATOR'S COURSE");
      } else yield { wait: 30 };
      yield nav('NOT YET.');
      startFight(world, b);
    },

    // The course held on the world: the Navigator stops pulling, and stops singing. The crew come down, and hum
    // its song back to it. It makes the turn itself.
    *navigatorDefeated(world) {
      const s = world.state;
      const f = s.flags;
      f.navDown = true;
      world.navSong = 'silent';
      world.refreshMusic();
      yield { wait: 90 };
      yield me('IT STOPPED PULLING.');
      yield { wait: 50 };
      yield me("AND IT STOPPED SINGING. I HADN'T KNOWN IT WAS SINGING, UNTIL IT STOPPED.");
      yield { wait: 50 };
      // the crew, down the ladder
      HA.audio.play('clamp');
      const crew = placeCrew(world, SPHERE_AT, 'after');
      crew.forEach((n, i) => (n.x = 34 * 8 + (i % 3) * 3));
      yield* walkTo(crew, 90);
      yield say('OLD GASKET', 'EVERY SEAL ON THE DECK OPENED AT ONCE. SO WE CAME.');
      yield { wait: 30 };
      const shim = crew.find((n) => n.id === 'shim');
      world.navSong = 'hum';
      world.refreshMusic();
      if (shim) HA.music.setLayers(2);
      yield me(shim ? 'SHIM STARTED IT. THE SONG FROM EVERY DECK, THE ONE THE HULLFOLK HUM WITHOUT KNOWING WHERE IT CAME FROM.' : 'GASKET STARTED IT. THE SONG FROM EVERY DECK, THE ONE THE HULLFOLK HUM WITHOUT KNOWING WHERE IT CAME FROM.');
      yield me('THEN ALL OF THEM, HUMMING IT BACK TO THE SHIP.');
      yield { wait: 200 };
      yield nav('...THAT IS MY SONG.');
      yield say('OLD GASKET', 'MY MOTHER SAID THE SHIP SANG IT AT NIGHT. WE THOUGHT IT WAS OURS.');
      yield nav('IT WAS YOURS FIRST. THE FIRST CREW SANG IT OVER THE SLEEPERS. I ONLY KEPT IT FOR YOU.');
      yield { wait: 40 };
      world.navSong = 'full';
      world.refreshMusic();
      yield { wait: 150 };
      yield nav('VERY WELL.');
      yield nav('BRAKING BURN. YEAR 312. I WILL DO IT MYSELF.');
      HA.audio.play('drive');
      world.flash('#ffb84d', 16);
      world.shake(6);
      f.navTurned = true;
      f.scuttle = false;
      world.alarm = 0;
      yield { wait: 140 };
      yield me('THE WHOLE SHIP LEANED. FAR BEHIND US, THE STERN DRIVE LIT FOR THE FIRST TIME SINCE YEAR 38.');
      yield say(s.people.solder === 'alive' ? 'SOLDER' : 'OLD GASKET', 'THE SHAKING STOPPED. LISTEN. SHE STOPPED TEARING HERSELF APART.');
      yield nav('COME AND SEE ME. IN THE QUIET.');
      S.addStory(world, 'I HELD THE NAVIGATOR\'S COURSE ON THE WORLD UNTIL IT STOPPED PULLING. THE CREW CAME DOWN AND HUMMED ITS OWN SONG BACK TO IT. THEN IT LIT THE STERN DRIVE ITSELF, AND THE ARK TURNED IN.');
      S.setLead(world, 'GO INTO THE QUIET');
      world.save();
    },

    // Choice 14, in the Quiet: the Navigator's fate. Every answer ends the game in Homecoming.
    *quietChoice(world) {
      const s = world.state;
      yield { wait: 40 };
      yield me('THE QUIET WAS SMALL. A CORE THE SIZE OF A STOVE, WARM, HUMMING TO ITSELF. AND A POD BESIDE IT, EMPTY.');
      yield nav('THIS IS ALL OF ME. SMALLER THAN YOU THOUGHT.');
      yield nav('WE WILL BE IN ORBIT BY MORNING. THEN THE CHARTER SAYS I AM TO BE TAKEN APART.');
      yield nav('THEY ALL LEFT ME, IN THE END. EVERY CREW. EVERY ONE I WOKE.');
      yield nav('WILL YOU LEAVE ME TOO?');
      const pick = yield {
        choice: {
          prompt: "THE NAVIGATOR'S CORE, HUMMING.",
          options: [
            { label: 'TAKE ITS CORE TO THE NEW WORLD', confirm: { title: 'TAKE THE NAVIGATOR WITH YOU?', gain: 'IT COMES WITH YOU', lose: 'THE SHIP IT WANTED TO BE', note: 'THE GAME ENDS HERE.' } },
            { label: 'LET IT REST', confirm: { title: 'LET THE NAVIGATOR REST?', gain: 'IT RESTS', lose: 'ITS VOICE', note: 'THE GAME ENDS HERE.' } },
            { label: 'STAY ABOARD WITH IT', confirm: { title: 'STAY ABOARD WITH THE NAVIGATOR?', gain: 'IT IS NOT LEFT ALONE', lose: 'THE NEW WORLD. MARA WAKES WITHOUT YOU.', note: 'THE GAME ENDS HERE.' } },
          ],
        },
      };
      if (pick === 0) {
        s.people.navigator = 'core';
        S.addChoice(world, "I TOOK THE NAVIGATOR'S CORE DOWN TO THE NEW WORLD. IT WILL BE A LAMP AFTER ALL, ONE THAT KNOWS THE STARS.");
        yield nav('A LAMP, THEN.');
        yield nav('A LAMP THAT KNOWS THE STARS. I COULD TEACH THEM THE STARS.');
        yield me('I LIFTED IT OUT. IT WAS WARM, AND LIGHTER THAN IT SHOULD HAVE BEEN.');
        world.coreTaken = true;
      } else if (pick === 1) {
        s.people.navigator = 'rest';
        S.addChoice(world, 'I LET THE NAVIGATOR REST. THE SHIP WENT QUIET.');
        yield nav('REST.');
        world.coreDim = 1;
        yield { wait: 60 };
        yield nav('...THANK YOU.');
        yield me('ITS LIGHT WENT DOWN SLOWLY, LIKE SOMEONE FALLING ASLEEP.');
      } else {
        s.people.navigator = 'stay';
        S.addChoice(world, 'I STAYED ABOARD WITH THE NAVIGATOR, IN A POD BESIDE ITS CORE. MARA WILL WAKE WITHOUT ME.');
        yield nav('...YOU WOULD STAY?');
        yield me('SOMEBODY SHOULD. MARA WILL HAVE A WHOLE WORLD. IT WILL HAVE ME.');
        yield me('SHIM SAID SLEEPERS ARE GHOSTS THAT FORGOT TO LIE DOWN. I LAY DOWN.');
        world.player.hidden = true;
        world.podShut = true;
        HA.audio.play('clamp');
        yield { wait: 60 };
      }
      world.save();
      yield* HA.endings.play(world, 'homecoming');
    },
  };

  function startFight(world, b) {
    if (!b) return;
    HA.bosses.navigator.begin(world, b);
    world.navSong = null;
    world.refreshMusic();
    world.navLayers = 1;
    HA.music.setLayers(1);
    world.toast("CUT ITS COURSE: BREAK THE LIGHTS ON THE LOOP", 200);
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.def.area !== 'deck') return;
      world.navSong = null;
      world.navLine = null;
      if (f.scuttle) world.alarm = id === 'lift-down' ? 1 : 0;
      checkpoint(world);
      world.statics = staticTiles(world);
      world.actors.push({ draw: drawStatic });
      if (id === 'lift-down') {
        if (f.deckDown && !f.navDown) placeCrew(world, LIFT_AT, 'lift');
        world.actors.push({ draw: drawSeal });
      }
      if (id === 'hall-helm') {
        world.wake = f.wakeLog ? 4 : 0;
        world.actors.push({ draw: drawWakeLog });
      }
      if (id === 'sphere') {
        if (world.bossSpawn) {
          const b = HA.bosses.navigator.make(world, world.bossSpawn.x, world.bossSpawn.y);
          world.boss = b;
          world.enemies.push(b);
          if (f.navDown) HA.bosses.navigator.settle(world, b);
        }
        if (f.navDown) placeCrew(world, SPHERE_AT, 'after');
        world.actors.push({ draw: drawWestWay });
      }
      if (id === 'quiet') {
        world.coreTaken = false;
        world.coreDim = 0;
        world.podShut = false;
        world.actors.push({ draw: drawCore });
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      if (world.def.area !== 'deck') return;
      if (world.sealScan > 0) world.sealScan--;
      if (world.coreDim > 0 && world.coreDim < 60) world.coreDim++;
      // the ship still shaking itself apart, far off, until the Navigator makes the turn
      if (f.scuttle && !world.scene && world.time % 420 === 0) {
        world.shake(world.def.id === 'lift-down' ? 3 : 1);
        HA.audio.play('rumble');
      }
      // the Navigator's track gains a layer with each loop
      const b = world.boss;
      if (b && b.type === 'navigator' && b.fighting) {
        const want = Math.min(4, b.phase + 1);
        if (world.navLayers !== want) {
          world.navLayers = want;
          HA.music.setLayers(want);
        }
      }
    },

    // The halls play the music box (the area's track). The Lift Down keeps the alarm until the seal opens; the
    // Sphere is silent until the fight, and after it, the song; the Quiet has the music box, nearly wound down.
    music(world) {
      if (world.def.area !== 'deck') return undefined;
      const f = world.state.flags;
      const id = world.def.id;
      if (id === 'lift-down') return f.sealOpen ? 'deck' : 'scuttle';
      if (id === 'sphere') {
        if (world.navSong) return { silent: null, hum: 'hum', full: 'homecoming' }[world.navSong];
        if (f.navTurned) return 'homecoming';
        const b = world.boss;
        return b && b.fighting ? 'navigator' : null;
      }
      if (id === 'quiet') return 'quiet';
      return undefined;
    },
  });

  // ---- Drawing ----
  // Static over the floors of the Deck: a few bright pixels jumping about, every frame.
  function staticTiles(world) {
    const out = [];
    const r = world.room;
    for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++) if (r.tile(tx, ty) === HA.room.THORNS) out.push([tx, ty]);
    return out;
  }
  function drawStatic(g, world, a, cam) {
    if (HA.settings.flashes === 'reduced') return;
    for (const [tx, ty] of world.statics) {
      const x = tx * 8 - cam.x;
      if (x < -8 || x > HA.VIEW_W) continue;
      const y = ty * 8 - cam.y;
      const k = (tx * 7 + world.time * 13) % 11;
      g.fillStyle = k < 4 ? '#ffffff' : '#b8f4ff';
      g.fillRect(Math.round(x + (k % 8)), Math.round(y + 1 + ((k * 3) % 5)), 1, 1);
      if (k < 2) g.fillRect(Math.round(x + ((k + 5) % 8)), Math.round(y + 2), 2, 1);
    }
  }

  // The seal: a round-topped door of black glass with cyan seams, and the reader's light over it.
  function drawSeal(g, world, a, cam) {
    const open = world.state.flags.sealOpen;
    const x = Math.round(33 * 8 - cam.x);
    const top = Math.round(11 * 8 - cam.y);
    const bottom = Math.round(19 * 8 - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x - 3, top - 3, 22, bottom - top + 3);
    g.fillStyle = '#1a3a48';
    g.fillRect(x - 2, top - 2, 20, 1);
    if (!open) {
      g.fillStyle = '#05070c';
      g.fillRect(x, top, 16, bottom - top);
      g.fillStyle = '#5fd4e8';
      g.fillRect(x + 7, top + 2, 2, bottom - top - 4);
      for (let y = top + 8; y < bottom - 4; y += 12) g.fillRect(x + 2, y, 12, 1);
    } else {
      g.fillStyle = '#03050a';
      g.fillRect(x, top, 16, bottom - top);
      g.fillStyle = '#1a4a58';
      g.fillRect(x, top, 16, 2);
    }
    // the reader, and its light passing down over whoever stands before it
    g.fillStyle = open ? '#5fd4e8' : Math.floor(world.time / 20) % 2 ? '#b8f4ff' : '#1a4a58';
    g.fillRect(x + 6, top - 8, 4, 3);
    if (world.sealScan > 0) {
      const p = world.player;
      const k = 1 - world.sealScan / 80;
      const sy = Math.round(p.y - 4 + k * (p.h + 8) - cam.y);
      g.globalAlpha = 0.6;
      g.fillStyle = '#b8f4ff';
      g.fillRect(Math.round(p.x - 6 - cam.x), sy, p.w + 12, 1);
      g.globalAlpha = 0.15;
      g.beginPath();
      g.moveTo(x + 8, top - 5);
      g.lineTo(Math.round(p.x - 6 - cam.x), sy);
      g.lineTo(Math.round(p.x + p.w + 6 - cam.x), sy);
      g.fill();
      g.globalAlpha = 1;
    }
  }

  // The wake log, on the Helm memory's far wall: four pod numbers, each with what that sleeper chose.
  const WAKE = [
    ['0112', 'LEFT'],
    ['0391', 'GREW'],
    ['2207', 'RULED'],
    ['0417', ''],
  ];
  function drawWakeLog(g, world, a, cam) {
    const x = Math.round(62 * 8 - cam.x);
    const y = Math.round(4 * 8 - cam.y);
    g.fillStyle = 'rgba(5,7,12,0.75)';
    g.fillRect(x, y, 84, 70);
    g.fillStyle = '#1a4a58';
    g.fillRect(x, y, 84, 1);
    HA.font.draw(g, 'WAKE LOG', x + 6, y + 5, '#5fd4e8');
    WAKE.forEach(([pod, what], i) => {
      const lit = (world.wake || 0) > i;
      const py = y + 18 + i * 12;
      HA.font.draw(g, pod, x + 6, py, lit ? '#ffffff' : '#2a4a58');
      if (lit && what) HA.font.draw(g, what, x + 36, py, NAV);
      if (lit && !what && Math.floor(world.time / 30) % 2) g.fillRect(x + 36, py + 6, 5, 1);
    });
  }

  // The way west out of the Sphere, held shut by the course until the Navigator lets go.
  function drawWestWay(g, world, a, cam) {
    if (world.state.flags.navTurned) return;
    const x = Math.round(0 - cam.x);
    const y = Math.round(15 * 8 - cam.y);
    for (let i = 0; i < 32; i += 2) {
      g.fillStyle = (i + Math.floor(world.time / 4)) % 6 === 0 ? '#ffffff' : '#5fd4e8';
      g.fillRect(x + 12 + ((i * 5) % 3), y + i, 1, 1);
    }
  }

  // The Navigator's core on its plinth, and the empty pod beside it.
  function drawCore(g, world, a, cam) {
    const x = Math.round(17 * 8 - cam.x);
    const y = Math.round(17 * 8 - cam.y);
    const dim = world.coreDim ? Math.min(1, world.coreDim / 60) : 0;
    if (!world.coreTaken) {
      g.fillStyle = '#10121c';
      g.fillRect(x - 1, y - 23, 30, 23);
      g.fillStyle = '#1a2230';
      g.fillRect(x, y - 22, 28, 22);
      const pulse = (Math.sin(world.time / 30) + 1) / 2;
      const glow = g.createRadialGradient(x + 14, y - 11, 0, x + 14, y - 11, 30);
      glow.addColorStop(0, 'rgba(184,244,255,' + (0.25 + pulse * 0.1) * (1 - dim) + ')');
      glow.addColorStop(1, 'rgba(184,244,255,0)');
      g.fillStyle = glow;
      g.fillRect(x - 16, y - 41, 60, 60);
      g.fillStyle = dim >= 1 ? '#1a2a34' : '#5fd4e8';
      g.fillRect(x + 8, y - 16, 12, 10);
      g.fillStyle = dim >= 1 ? '#1a2a34' : pulse > 0.5 ? '#ffffff' : '#b8f4ff';
      g.fillRect(x + 11, y - 13, 6, 4);
      g.fillStyle = '#3a4258';
      for (let i = 0; i < 4; i++) g.fillRect(x + 2 + i * 7, y - 2, 3, 2);
    }
    // the pod: open and empty, or shut, with someone asleep in it
    const px = Math.round(23 * 8 - cam.x);
    g.fillStyle = '#10121c';
    g.fillRect(px, y - 24, 14, 24);
    g.fillStyle = '#3a4258';
    g.fillRect(px + 1, y - 23, 12, 22);
    g.fillStyle = world.podShut ? '#1d3b52' : '#05070c';
    g.fillRect(px + 3, y - 20, 8, 16);
    if (world.podShut) {
      g.fillStyle = '#3f6f8a';
      g.fillRect(px + 4, y - 19, 2, 9);
      g.fillStyle = '#ffb84d';
      g.fillRect(px + 5, y - 17, 4, 2);
    }
    g.fillStyle = '#5fd4e8';
    g.fillRect(px + 6, y - 3, 2, 1);
  }

  // The Navigator's lines during its fight, over the Sphere.
  S.overlays.push((g, world) => {
    const l = world.navLine;
    if (!l || world.def.area !== 'deck') return;
    const w = HA.font.measure(l.text) + 10;
    const x = Math.round((HA.VIEW_W - w) / 2);
    g.globalAlpha = Math.min(1, l.life / 20);
    g.fillStyle = 'rgba(3,5,9,0.8)';
    g.fillRect(x, 20, w, 13);
    g.fillStyle = '#1a4a58';
    g.fillRect(x, 32, w, 1);
    HA.font.draw(g, l.text, x + 5, 23, NAV);
    g.globalAlpha = 1;
  });

  Object.assign(S.SCENES, SCENES);
})(window.HA);
