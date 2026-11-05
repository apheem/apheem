'use strict';
// Pod 1130 (STORYBOARD.md, "The other side quests", 3). When Abel's fires change, the ship's power goes elsewhere,
// and on the Cryo Deck one sleeper's pod drops onto its reserve cell: 1130, a colonist the Navigator never woke, on
// the ledge by the Pod Stacks' door. The ship pages an attendant there hasn't been for three hundred years. The hero
// woke late too. At the pod they decide: thaw him with the last of the cell (Mercy +1; Hugo Marsh, agronomist, wakes
// 232 years late and goes down to the Warrens), or let the pod fail and take its cell for the suit (a Suit Cell, max
// health +4; Mercy -1). Unanswered by the time the hero rides the Tower Lift, the cell runs out on its own.
// Flags: pod1130Alarm (the ship's page, heard). people.pod1130: 'thawed' | 'cell'. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: S.VOICE });
  const FLOOR = (ty) => ty * 8;
  const SHIP = '#9fd8e8'; // the ship's own page, ship-wide
  const READOUT = '#5fd4e8'; // the pod's readout
  const POD = { room: 'pod-stacks', x: 60, floor: 19 * 8 }; // on the ledge by the door in from the Thaw Corridor
  const FIRE = 45; // where Hugo sits in the Warrens, by the fire

  S.PEOPLE.hugo = { name: 'HUGO MARSH', sprite: 'hugo', away: true };
  S.TALK.hugo = {};

  // Settled one way or the other, or (heard, and never answered before the Tower) run out on its own.
  const fate = (s) => s.people.pod1130 || (s.flags.pod1130Alarm && s.flags.tower ? 'failed' : null);
  const alarmOn = (s) => !!s.flags.pod1130Alarm && !fate(s);
  S.pod1130Fate = fate;
  // Hugo, thawed, came down with the Hullfolk: on the new ground, or on the sleds.
  S.pod1130Landed = (s, id) => (s.people.pod1130 === 'thawed' && (id === 'homecoming' || id === 'crash') ? 1 : 0);

  function hugoLines() {
    return ['THEY CALL ME THE OTHER SLEEPER.', "THEY GROW MUSHROOMS DOWN HERE. GIVE ME SOIL AND A SKY, AND I'LL GROW THEM BEANS."];
  }

  // ---- The ship's page, when Abel's fires change ----
  function* alarm(world) {
    const s = world.state;
    s.flags.pod1130Alarm = true;
    yield { wait: 40 };
    HA.audio.play('alarm');
    yield { wait: 40 };
    HA.audio.play('intercom');
    yield say('THE SHIP', 'POWER REROUTED. CRYO DECK, POD STACKS: POD 1130 ON ITS RESERVE CELL.', SHIP);
    yield say('THE SHIP', 'RESERVE CELL FAILING. ATTENDANT TO THE STACKS.', SHIP);
    yield me(s.people.abel === 'ended' ? "WITH ABEL'S FIRES OUT, THE SHIP IS RUNNING ON WHAT'S LEFT. SOMETHING HAS TO GO WITHOUT." : "ABEL'S FIRES ARE FEEDING THE CREW'S LIFTS NOW. SOMETHING ELSE HAS TO GO WITHOUT.");
    yield me("AN ATTENDANT. THERE HASN'T BEEN ONE IN THREE HUNDRED YEARS.");
    yield me('POD 1130. SOMEBODY STILL ASLEEP DOWN THERE, THE WAY I WAS.');
    world.toast('POD 1130 · THE POD STACKS, ON THE CRYO DECK', 300);
    S.addStory(world, "WHEN ABEL'S FIRES CHANGED, THE SHIP'S POWER WENT ELSEWHERE. ON THE CRYO DECK, POD 1130 WENT ONTO ITS RESERVE CELL, AND ITS ALARM STARTED. THE REST PODS CAN TAKE ME BACK DOWN.");
    world.save();
  }
  const alarmDue = (s) => !!s.people.abel && !s.flags.pod1130Alarm && !s.flags.tower && !s.flags.running;
  // It follows choice 10, whichever way it went (story/spine.js).
  for (const name of ['abelDefeated', 'abelChoice']) {
    const base = S.SCENES[name];
    S.SCENES[name] = function* (world) {
      yield* base(world);
      if (alarmDue(world.state)) yield* alarm(world);
    };
  }

  const SCENES = {
    // A game quit before the page was heard: it comes again on the way up to the camp.
    *pod1130Alarm(world) {
      yield* alarm(world);
    },

    // ---- At the pod ----
    *pod1130(world) {
      const s = world.state;
      const p = world.player;
      HA.audio.play('terminal');
      yield say('POD 1130', 'MARSH, HUGO. AGRONOMIST. FIRST FIELDS CREW.', READOUT);
      yield say('POD 1130', 'RESERVE CELL: FAILING. THAW: MANUAL. AUTHORITY: ANY.', READOUT);
      yield me('HE LOOKS ASLEEP. I MUST HAVE LOOKED LIKE THAT, IN 0417.');
      yield me("THE CELL CAN'T KEEP HIM FROZEN MUCH LONGER. IN A SUIT, IT WOULD RUN FOR YEARS.");
      yield me("THAWING HIM WOULD TAKE WHAT'S LEFT IN IT.");
      const pick = yield {
        choice: {
          prompt: 'POD 1130. THE RESERVE CELL IS FAILING.',
          options: [
            { label: 'THAW HIM', confirm: { title: 'THAW POD 1130?', gain: 'HUGO MARSH, AWAKE · 232 YEARS LATE', lose: "THE POD'S CELL" } },
            { label: 'TAKE THE CELL', confirm: { title: "TAKE POD 1130'S CELL?", gain: 'A SUIT CELL · MAX HEALTH +4', lose: 'HUGO MARSH' } },
          ],
        },
      };
      world.logs = world.logs.filter((l) => l.id !== 'pod1130');
      if (pick === 0) {
        s.people.pod1130 = 'thawed';
        s.mercy += 1;
        S.addChoice(world, 'I THAWED POD 1130 WITH THE LAST OF ITS CELL. HUGO MARSH WOKE 232 YEARS LATE, THE WAY I DID.');
        world.save();
        HA.audio.play('hiss');
        world.flash('#d8f4ff', 8);
        world.burst(POD.x + 7, POD.floor - 15, ['#d8f4ff', '#9fd8e8', '#ffffff'], 24, 1.4);
        yield { wait: 50 };
        const n = S.makeNpc(world, 'hugo', { x: POD.x + 3, y: POD.floor - 8 });
        Object.assign(n, { state: 'out', kneel: true, facing: Math.sign(p.x - POD.x) || -1, talkable: () => false });
        world.npcs.push(n);
        yield { wait: 40 };
        yield say('HUGO MARSH', '...COLD. SO COLD.');
        n.kneel = false;
        yield say('HUGO MARSH', 'IS THIS IT? IS THIS THE NEW WORLD?');
        yield me("NOT YET. YOU'RE STILL ON THE SHIP.");
        yield say('HUGO MARSH', 'HOW LATE?');
        yield me('TWO HUNDRED AND THIRTY-TWO YEARS. I WOKE TO IT TOO.');
        yield { wait: 30 };
        yield say('HUGO MARSH', 'I WAS MEANT TO PLANT THE FIRST FIELDS.');
        yield say('HUGO MARSH', "...THERE AREN'T ANY, ARE THERE.");
        yield me(S.callName(s) === 'COUNTER' ? "GO DOWN TO THE WARRENS, PAST THE COOLANT HALL. THEY DON'T THINK MUCH OF ME. THEY'LL TAKE YOU IN." : "GO DOWN TO THE WARRENS, PAST THE COOLANT HALL. THEY TOOK ME IN. THEY'LL TAKE YOU.");
        yield say('HUGO MARSH', 'THE WARRENS. ...ALL RIGHT.');
        yield { walk: n, x: 9 * 8 - 6, speed: 0.6 };
        yield { fade: 'out', frames: 20 };
        n.state = 'gone';
        yield { wait: 20 };
        yield { fade: 'in', frames: 20 };
        yield me('HE TOOK THE STACKS ONE LEDGE AT A TIME. AT THE BOTTOM, HE WAVED.');
        S.addStory(world, 'I THAWED POD 1130. HUGO MARSH, AN AGRONOMIST, WOKE 232 YEARS LATE. HE WENT DOWN TO THE WARRENS. THEY CALL HIM THE OTHER SLEEPER.');
      } else {
        s.people.pod1130 = 'cell';
        s.mercy -= 1;
        HA.audio.play('clamp');
        yield { wait: 30 };
        HA.audio.play('hiss');
        world.burst(POD.x + 7, POD.floor - 4, ['#9fd8e8', '#3a4258'], 10, 1);
        yield { wait: 40 };
        p.maxHp += 4;
        p.hp = p.maxHp;
        HA.audio.play('pickup');
        world.toast('SUIT CELL · MAX HEALTH +4', 300);
        S.addChoice(world, "I TOOK POD 1130'S CELL FOR MY SUIT. HUGO MARSH NEVER WOKE.");
        yield me('THE CELL CAME OUT WARM. THE LIGHT ON POD 1130 WENT FROM RED TO NOTHING.');
        yield me("HE NEVER WOKE. HE'LL NEVER KNOW HOW LATE IT GOT.");
        S.addStory(world, "I TOOK POD 1130'S RESERVE CELL FOR MY SUIT. THE SLEEPER IN IT, HUGO MARSH, NEVER WOKE.");
      }
      world.save();
    },
  };

  // ---- How it looks: a pod pulled out of the stack onto the ledge, its own cable to the wall ----
  function drawPod(g, world, a, cam) {
    const s = world.state;
    const f = fate(s);
    const x = Math.round(POD.x - cam.x);
    const y = Math.round(POD.floor - 30 - cam.y);
    const open = f === 'thawed';
    const dark = f === 'cell' || f === 'failed';
    const on = alarmOn(s);
    g.fillStyle = '#10121c';
    g.fillRect(x - 6, y + 26, 6, 1);
    g.fillStyle = '#1a2238';
    g.fillRect(x, y, 14, 30);
    g.fillStyle = open ? '#0c1120' : dark ? '#101a26' : '#1d3b52';
    g.fillRect(x + 2, y + 3, 10, 22);
    if (!open) {
      // the sleeper behind the glass, frosted over once the pod's gone dark
      g.fillStyle = dark ? '#1e2e3e' : '#3f6f8a';
      g.fillRect(x + 3, y + 4, 2, 12);
      g.fillStyle = dark ? '#18263a' : '#2a4d64';
      g.fillRect(x + 5, y + 10, 5, 9);
      if (dark) {
        g.fillStyle = '#3a5068';
        g.fillRect(x + 2, y + 3, 3, 1);
        g.fillRect(x + 9, y + 22, 3, 2);
      }
    } else {
      // the lid swung out, and frost melting on the ledge
      g.fillStyle = '#3f6f8a';
      g.fillRect(x + 14, y + 3, 2, 22);
      g.fillStyle = '#9fd8e8';
      g.fillRect(x + 1, y + 29, 4, 1);
      g.fillRect(x + 9, y + 29, 3, 1);
    }
    if (on && Math.floor(world.time / 15) % 2) {
      g.fillStyle = 'rgba(232,67,79,0.22)';
      g.fillRect(x + 2, y + 3, 10, 22);
    }
    // its number on a plate, and the light at its foot: blue asleep, red on the reserve, dark after
    g.fillStyle = '#3a4258';
    g.fillRect(x + 2, y - 4, 10, 3);
    g.fillStyle = '#9fb6c8';
    for (let i = 0; i < 4; i++) g.fillRect(x + 3 + i * 2, y - 3, 1, 1);
    g.fillStyle = on ? (Math.floor(world.time / 15) % 2 ? '#e8434f' : '#5a1a20') : open || dark ? '#10121c' : '#5fd4e8';
    g.fillRect(x + 6, y + 27, 2, 1);
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const id = world.def.id;
      if (id === POD.room) {
        world.actors.push({ draw: drawPod });
        world.pod1130Noted = false;
      }
      // Thawed, Hugo sits by the Warrens' fire with the village, until the run for the sleds.
      const f = s.flags;
      if (id === 'warrens' && s.people.pod1130 === 'thawed' && !f.running && !(s.warrensRaid === 'fell' && !f.wallsOut)) {
        const n = S.makeNpc(world, 'hugo', { x: FIRE * 8, y: FLOOR(18) });
        Object.assign(n, { state: 'out', facing: -1, kneel: true, lines: hugoLines() });
        world.npcs.push(n);
      }
    },

    update(world) {
      const s = world.state;
      const id = world.def.id;
      if (world.scene || world.player.dead || world.transition || world.fade > 0.5 || world.nightScene) return;
      // A game quit before the page was heard: it comes again on the way up to the camp.
      if (world.def.area === 'spine' && !s.flags.camp && alarmDue(s)) return run(world, 'pod1130Alarm');
      if (id !== POD.room || !alarmOn(s)) return;
      if (!world.logs.some((l) => l.id === 'pod1130')) world.logs.push({ id: 'pod1130', scene: 'pod1130', label: '{up} POD 1130', x: POD.x + 2, y: POD.floor - 12, w: 10, h: 12, read: true });
      if (world.time % 150 === 0) HA.audio.play('alarm');
      if (world.time % 20 === 0) world.particles.push({ x: POD.x + 4 + HA.rand(0, 6), y: POD.floor - 28, vx: HA.rand(-0.2, 0.2), vy: -0.25, life: 30, max: 30, color: '#d8f4ff', size: 1, grav: 0 });
      if (!world.pod1130Noted) {
        world.pod1130Noted = true;
        S.think(world, 'THERE. BY THE DOOR, BLINKING RED: POD 1130.', 20);
      }
    },
  });

  // ---- The endings' cards (endings.js) ----
  S.pod1130Cards = function (s, id) {
    const f = fate(s);
    if (!f) return [];
    const cards = {
      thawed: {
        homecoming: ['HUGO MARSH PLANTED THE FIRST FIELD.', '232 YEARS LATE, HE SAID, AND RIGHT ON TIME.'],
        crash: ['HUGO MARSH RODE THE SLEDS DOWN WITH THE HULLFOLK.', 'THEY STILL CALL HIM THE OTHER SLEEPER.'],
        dominion: ["HUGO MARSH GROWS BEANS UNDER THE WARRENS' LAMPS.", "HE NEVER ASKS ME WHEN WE'LL LAND."],
        overgrown: ['HUGO MARSH WOKE 232 YEARS LATE,', 'IN TIME FOR THE PINK.'],
      },
      cell: {
        homecoming: ['POD 1130 STAYED DARK WHEN THE OTHERS OPENED.', 'I STILL HAVE ITS CELL.'],
        crash: ['POD 1130 WAS DARK LONG BEFORE THE SHIP CAME DOWN.', 'ITS CELL CAME DOWN WITH ME.'],
        dominion: ["POD 1130'S CELL KEPT ME ON MY FEET.", 'IT WAS NEVER MINE TO TAKE.'],
        overgrown: ["POD 1130'S CELL KEPT ME GOING A LITTLE LONGER.", "IT DIDN'T MATTER."],
      },
      failed: {
        homecoming: ["POD 1130 DIDN'T OPEN WITH THE OTHERS.", 'ITS ALARM HAD STOPPED WHILE I WAS CLIMBING.'],
        crash: ["POD 1130'S ALARM STOPPED WHILE I WAS CLIMBING.", 'NOBODY ELSE HEARD IT.'],
        dominion: ["POD 1130'S ALARM STOPPED ON ITS OWN.", 'I WAS BUSY WITH THE KEY.'],
        overgrown: ["POD 1130'S ALARM STOPPED ON ITS OWN."],
      },
    };
    return cards[f][id] ? [cards[f][id]] : [];
  };

  Object.assign(S.SCENES, SCENES);
})(window.HA);
