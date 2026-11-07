'use strict';
// The Engine Spine's story (Phase 3.5): the climbers come in on the keel tram and build the crew's lift up the
// Spine behind the hero, a landing at a time, as far as they have hands for; Abel, the Stoker, in his furnace
// (choice 10); the night at the Crew Camp (Wick's Lancets for a hurt climber, Gasket's count at lights-out, the
// Purser's last call); and the crew counting themselves off before the Tower Lift. How many climb is the Mercy
// track made visible: crewOf(). All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const ABEL = '#f2a0c8'; // Abel's voice, from inside the furnace
  const LINE = '#c9a070'; // a voice down the line phone
  const LOG = '#b8f4ff'; // something read off a wall
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const name = (w) => S.callName(w.state);
  const FLOOR = (ty) => (ty - 1) * 8; // a person stands on map row ty

  Object.assign(S.LOGS, {
    brake: {
      title: 'SPINE FOOT · LIFT NOTICES',
      text: 'SPINE LIFTS 1-6: CREW OF TWO. LIFT B (BRIDGE): CREW OF EIGHT REQUIRED TO RELEASE THE BRAKE.',
    },
    sealed: {
      title: 'SECURITY · YEAR 40',
      text: 'NAVIGATION DECK SEALED. ACCESS: WARDENS ONLY, ON RELEASE FROM THE HELM KEY.',
    },
    // The Crew Mess, between the Spine Foot and the Boiler Stair (the ninth batch of new rooms)
    mess: {
      title: 'CREW DECK · YEAR 110',
      text: 'THE CREW DECK CLOSES TODAY. NO MORE SHIFTS: THE NAVIGATOR FLIES THE SHIP. MAINTENANCE FAMILIES TO THE SERVICE WAYS. TAKE WHAT YOU CAN CARRY, AND STRIP THE SPINE LIFTS FOR PARTS. COUNT YOUR CHILDREN.',
    },
    heights: {
      title: 'THE DOOR FRAME',
      text: "CHILDREN'S HEIGHTS, MARKED IN PEN UP THE FRAME, A NAME AND A YEAR BY EACH. THE LAST MARKS ARE ALL YEAR 110.",
    },
    // The Stokers' Bunks, beside the Piston Run (the third batch of new rooms)
    stokers: {
      title: "REACTOR · STOKERS' ROSTER",
      text: 'A STOKER LASTS A YEAR AT THE FIRES. TWO, ON A FULL DOSE, WHEN THEY STOP FEELING THE HEAT. KEEP THEM ON A FULL DOSE. WHEN ONE IS USED UP, TAKE ANOTHER FROM THE WALLS. LAST IN: ABEL, YEAR 307. ABEL HAS NOT NEEDED REPLACING.',
    },
    // The Condenser, off the Boiler Stair (the fourth batch of new rooms)
    condenser: {
      title: 'CONDENSER HALL · MAIN 3',
      text: "IF MAIN 3 BURSTS ACROSS THE STAIR, SHUT IT OFF AT BOTH VALVES: A IS PAST THE SUMP, B IS ON THE COIL TOPS. THEN TAKE THE LADDER BY A, UP THE WELL BESIDE THE MAIN, BACK TO THE STAIR ABOVE IT. SINCE THE STEWARD'S PEOPLE DROVE THE FIRES HOT, IT BURSTS EVERY YEAR. NOBODY COMES DOWN TO SHUT IT.",
    },
    // The Winding House, between the camp and the Tower Lift (the sixth batch of new rooms)
    winding: {
      title: 'WINDING HOUSE · TOWER LIFT',
      text: "BY THE STEWARD'S ORDER, THE CLUTCH STAYS OUT AND THE CAR STAYS UP. IT COMES DOWN WHEN THE TOWER SENDS DOWN STOKERS, AND GOES BACK UP EMPTY.",
    },
    abelCount: {
      title: 'THE LAST BUNK',
      text: 'SCRATCHED INTO THE FRAME: A COUNT IN FIVES, THE WAY THE HULLFOLK COUNT DAYS. IT RUNS FOR A YEAR. THEN THE FIVES COME APART, AND IT IS ONLY SCRATCHES, ALL OVER THE FRAME, UNTIL THERE IS NO ROOM LEFT. CUT DEEP AT THE TOP, IN THE FIRST HAND: ABEL.',
    },
  });

  // ---- The crew ----
  // How many climb is how far the Hullfolk trust the hero: one more than their Mercy, at least two, at most eleven.
  // Eight is enough hands for any lift on the ship. Cotter, given his dose back in the Muster (story/cotter.js), climbs
  // whatever the village thinks of the hero (he goes where the dose goes): one more pair of hands, past the trust.
  // Settled after the climbers had gone (cotterLate), he goes home instead.
  const dosed = (s) => (s.people.cotter === 'dosed' && !s.flags.cotterLate ? 1 : 0);
  const crewOf = (s) => HA.clamp(s.mercy + 1, 2, 11) + dosed(s);
  // Each lift up the Spine takes this many hands to build: the Boiler Landing's, the Piston Landing's, the camp's.
  const HANDS = [0, 2, 5, 8];
  const SLOW = 200; // the Winding House's cranks, once the clutch is in (they run at 120 with nothing on them)
  const WOKEN = ['toller', 'mave', 'pell', 'corra', 'dunn', 'iska', 'rook', 'hale', 'wren'];
  for (const [i, id] of WOKEN.entries()) S.PEOPLE[id] = { name: id.toUpperCase(), sprite: 'woken' + (1 + (i % 4)), away: true };
  for (const id of WOKEN) S.TALK[id] = {};

  // Who climbs, in the order they count off: Gasket always, Cotter if he's dosed, Solder if he lived, Flux if he came
  // home, Brine, and as many of the woken as there are places left.
  function crewList(s) {
    const out = ['gasket'];
    if (dosed(s)) out.push('cotter');
    if (s.people.solder === 'alive') out.push('solder');
    if (s.people.flux === 'home') out.push('flux');
    out.push('brine');
    if (s.people.sorrel === 'home') out.push('sorrel'); // brought home from the Dry Pumps (story/sorrel.js)
    out.push(...WOKEN);
    return out.slice(0, crewOf(s));
  }
  const leader = (s) => (s.people.solder === 'alive' ? 'SOLDER' : 'OLD GASKET');
  const WORDS = ['NONE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];

  // ---- The crew's lift ----
  const STOPS = [
    { n: 0, room: 'spine-foot', name: 'THE FOOT' },
    { n: 1, room: 'boiler-stair', name: 'THE BOILER LANDING' },
    { n: 2, room: 'piston-run', name: 'THE PISTON LANDING' },
    { n: 3, room: 'crew-camp', name: 'THE CAMP' },
  ];
  const builtTo = (s, n) => (s.flags.lifts || 0) >= Math.max(1, n);

  // The lift arrives at this room's stop: its car comes up out of the floor into place.
  function raiseLift(world) {
    const sp = world.room.spawns.find((x) => x.type === 'L');
    if (!sp) return null;
    const legend = world.def.legend.L;
    let link = world.links.find((l) => l.legend === legend);
    if (!link) {
      link = { legend, tx: sp.tx, ty: sp.ty, x: sp.x - 8, y: sp.y + 8 - 22, w: 24, h: 22 };
      world.links.push(link);
    }
    link.rise = 64;
    world.actors.push({
      update(w, a) {
        link.rise = Math.max(0, link.rise - 0.8);
        if (w.time % 8 === 0 && link.rise > 0) HA.audio.play('clamp');
        if (!link.rise) w.actors = w.actors.filter((x) => x !== a);
      },
    });
    return link;
  }

  // Someone of the crew, standing on map row ty at column tx, with things to say.
  function crewNpc(world, id, tx, ty, lines) {
    const n = S.makeNpc(world, id, { x: tx * 8, y: FLOOR(ty) });
    if (id === 'flux') n.name = 'FLUX';
    n.state = 'out';
    n.lines = lines;
    world.npcs.push(n);
    return n;
  }

  // ---- What each of them says at the camp ----
  function campLines(world, id) {
    const s = world.state;
    const f = s.flags;
    const lie = s.toldShim === 'lie';
    const lines = {
      gasket: lie ? ['...', 'GO AND TALK TO THE OTHERS.'] : ["A LIFT THAT BIG NEEDS HANDS. THAT'S WHAT I KEPT TELLING THEM ON THE TRAM.", 'THE SHIP HUMS LOUDER UP HERE. MY MOTHER WOULD HAVE LIKED THAT.'],
      solder: ["MY LEG'S WORSE. DON'T TELL GASKET.", 'THE BRIDGE HAS A LIFT OF ITS OWN. LIFT B. IT GOES DOWN, NOT OUT. NOBODY KNOWS WHERE TO.'].concat(f.solderBy === 'bloom' ? ["YOUR EYES ARE STILL A LITTLE PINK. I'M NOT SAYING ANYTHING. I'M JUST SAYING."] : []),
      flux: ["I FLEW HOME ON THAT PACK. NOW I'M CLIMBING BACK UP. SHIM THINKS IT'S FUNNY.", "IT'S STILL GETTING QUIETER. A LITTLE EVERY DAY."],
      brine:
        s.people.sorrel === 'home'
          ? crewList(s).includes('sorrel')
            ? ["SHE COUNTED EVERY RUNG ON THE WAY UP. OUT LOUD. I'D FORGOTTEN HOW ANNOYING SHE IS.", "EMPTY ISN'T DEAD."]
            : ["SHE STAYED HOME TO DO THE COUNT. SOMEONE HAS TO.", "EMPTY ISN'T DEAD."]
          : s.people.sorrel === 'stayed'
            ? ["SHE'S DOWN THERE COUNTING. WHEN THIS IS DONE I'LL GO AND GET HER."]
            : ["IF SORREL'S UP THERE, I'LL KNOW HER. EVEN PINK. EVEN COUNTED."],
      sorrel: ['FOUR HUNDRED AND TWELVE RUNGS FROM THE FOOT TO HERE. NOBODY ELSE COUNTED.', "GASKET LETS ME DO THE COUNT AT LIGHTS-OUT NOW. HE'S TOO SLOW."],
      toller: f.stitched ? ["NEATER THAN I'D HAVE DONE IT. NOT AS NEAT AS WICK."] : ["A STEAM PIPE GOT MY ARM ON THE STAIR. IT'S NOTHING.", "IT'S SOMETHING."],
      mave: ['I DREAMED THE SAME FIELD THE WHOLE TIME I WAS UNDER. I WANT TO SEE IF IT\'S REAL.'],
      pell: ["I DON'T LIKE LIFTS. I DON'T LIKE LADDERS. I CAME ANYWAY."],
      corra: ["THE STEWARD'S UP THERE. I WANT TO SEE HIS FACE WHEN WE WALK IN."],
      dunn: ["MY GIRL'S BEHIND THE GATE WITH TAMP. I TOLD HER I'D BRING HER BACK A STAR."],
      iska: s.people.abel === 'ended' ? ['THE FURNACE WAS DARK WHEN WE CAME UP. COLD AS THE BALLAST.'] : ['DID YOU HEAR THE MAN IN THE FURNACE? I THOUGHT HE WAS SINGING.'],
      rook: ["COUNT ME TWICE. I'M BIG ENOUGH."],
      hale: ['THE LAST TIME ANYONE CLIMBED THE SPINE, I WAS A BABY. MY FATHER CARRIED ME.'],
      wren: ["WHEN WE GET THERE I'M GOING TO SIT DOWN ON THE GROUND AND NOT GET UP."],
    };
    return lines[id];
  }
  // Where each of them sits at the camp, and stands on the Tower Lift's deck (columns, on floor row 19).
  const CAMP_AT = [16, 25, 20, 13, 10, 22, 31, 6, 18.5, 14.5, 11.5];
  const DECK_AT = [18, 20, 16, 28, 10, 30, 8, 32, 6, 21.5, 4]; // clear of the Tower Lift (14) and the terminal (24)

  function placeCamp(world) {
    const s = world.state;
    crewList(s).forEach((id, i) => {
      const n = crewNpc(world, id, CAMP_AT[i], 19, campLines(world, id));
      n.facing = CAMP_AT[i] < 18 ? 1 : -1;
      if (id === 'toller') n.kneel = true;
      if (world.nightScene) n.sleeping = id !== 'gasket';
    });
  }
  function placeDeck(world) {
    const s = world.state;
    crewList(s).forEach((id, i) => {
      const n = crewNpc(world, id, DECK_AT[i], 19, [s.flags.verdict ? 'UP, THEN.' : 'ALL OF US HERE?']);
      n.facing = DECK_AT[i] < 20 ? 1 : -1;
    });
  }

  // How each counts themselves off before the Tower Lift, Warden-style.
  function countLine(s, id) {
    return {
      gasket: 'OLD. STUBBORN.',
      solder: 'TINKERER. RUDE ABOUT IT.',
      flux: 'FATHER. HOME, MOSTLY.',
      brine: s.people.sorrel === 'home' ? 'SISTER. FOUND HER.' : 'SISTER. STILL LOOKING.',
      sorrel: 'COUNTS.',
      cotter: "DOES AS HE'S TOLD.",
      toller: s.flags.stitched ? 'STITCHED.' : 'SORE ARM.',
      mave: 'WOKE UP. STAYING UP.',
      pell: 'AFRAID OF LIFTS.',
      corra: 'ANGRY.',
      dunn: 'OWES HIS GIRL A STAR.',
      iska: 'SMALL. LOUD.',
      rook: 'COUNT ME TWICE.',
      hale: 'CARRIED, ONCE.',
      wren: 'TIRED.',
    }[id];
  }

  // Turning one of the Condenser's valves (the fourth batch of new rooms).
  function* valve(world, flag) {
    const f = world.state.flags;
    if (f[flag]) {
      yield me(f.condenser ? "IT'S SHUT. SO IS THE OTHER ONE. THE STAIR'S CLEAR." : "IT'S SHUT. THE OTHER ONE ISN'T.");
      return;
    }
    f[flag] = true;
    HA.audio.play('switch');
    for (let i = 0; i < 3; i++) {
      HA.audio.play('clamp');
      yield { wait: 14 };
    }
    HA.audio.play('steam');
    world.shake(1);
    yield { wait: 20 };
    if (!(f.condenserA && f.condenserB)) {
      yield me('THROUGH THE WALL, THE STEAM IN THE SHAFT THINNED. NOT ENOUGH.');
      world.save();
      return;
    }
    f.condenser = true;
    yield { wait: 20 };
    yield me('THROUGH THE WALL, THE STEAM IN THE SHAFT DIED TO A HISS. THE WAY UP THE STAIR IS CLEAR.');
    yield me(world.def.id === 'condenser' && world.player.x > 50 * 8 ? 'AND THE LADDER WELL BESIDE ME WENT QUIET.' : 'AND THE LADDER WELL BY A WENT QUIET.');
    S.addStory(world, "MAIN 3 HAD BURST ACROSS THE BOILER STAIR. I SHUT IT OFF AT BOTH ITS VALVES, IN THE CONDENSER, AND WENT ON UP.");
    world.save();
  }

  // ---- The scenes ----
  const SCENES = {
    // The Crew Mess (the ninth batch of new rooms): the old crew's mess and quarters under the Boiler Stair, shut the
    // year the maintenance families went into the walls. The crew, coming on behind, go through it off screen.
    *messIn(world) {
      world.state.flags.messIn = true;
      S.think(world, "THE OLD CREW'S MESS. THE PLATES ARE STILL ON THE TABLES.", 60);
    },
    *messHeights(world) {
      const s = world.state;
      const first = !s.logs.heights;
      s.logs.heights = true;
      HA.audio.play('tally');
      const L = S.LOGS.heights;
      yield { say: L.title, text: L.text, color: LOG };
      if (!first) return;
      // With the notice read, the hero knows what year 110 was.
      if (s.logs.mess) {
        yield me('THE YEAR THEY WENT INTO THE WALLS.');
        yield me("THEY'VE COUNTED THEIR CHILDREN EVERY NIGHT SINCE.");
      } else yield me('YEAR 110. NOBODY MARKED THE FRAME AFTER THAT.');
      S.addStory(world, s.logs.mess
        ? "UNDER THE BOILER STAIR IS THE OLD CREW'S MESS, SHUT IN YEAR 110, WHEN THE MAINTENANCE FAMILIES WENT INTO THE WALLS. ON ITS DOOR FRAME ARE THEIR CHILDREN'S HEIGHTS, AND THE LAST MARKS ARE ALL THAT YEAR."
        : "UNDER THE BOILER STAIR IS THE OLD CREW'S MESS. ON ITS DOOR FRAME ARE CHILDREN'S HEIGHTS, AND THE LAST MARKS ARE ALL YEAR 110.");
      world.toast('SAVED TO THE JOURNAL', 150);
      world.save();
    },
    // The Boiler Landing: far below, the keel tram comes in with the climbers, and they build the first lift.
    *crewArrives(world) {
      const s = world.state;
      const f = s.flags;
      const n = crewOf(s);
      f.crewCame = true;
      const who = leader(s);
      yield { wait: 20 };
      HA.audio.play('rumble');
      world.shake(2);
      yield { wait: 30 };
      // On the tram home (story/tram.js) the crew came east with the hero, and how many came was said in the sump.
      // A save from before that has them come in on the tram by themselves, and count here.
      const pipes = f.tramEast && s.people.solder === 'dead';
      if (f.tramEast) {
        yield me(pipes ? 'FAR BELOW, THE CREW CAME UP OUT OF THE PIPES, COUGHING.' : "FAR BELOW, THE CREW HAD THE FIRST LIFT'S FRAME UP.");
        yield say(who, name(world) + "! WE'RE RIGHT BEHIND YOU!");
      } else {
        yield me('FAR BELOW, THE KEEL TRAM CAME IN. I HEARD IT STOP, AND VOICES.');
        yield say(who, name(world) + "! WE'RE AT THE FOOT!");
        // How many came shows here first; they count themselves properly at the camp.
        if (n < 5) yield say(who, "THERE AREN'T MANY OF US. SOME WOULDN'T COME. NOT FOR " + name(world) + '.');
        else yield say(who, 'MORE OF US THAN I THOUGHT. ' + (who === 'SOLDER' ? 'GASKET COUNTED THEM ONTO THE TRAM TWICE.' : 'I COUNTED THEM ONTO THE TRAM TWICE.'));
      }
      yield say(who, "STAY THERE. WE'LL BRING THE LIFT UP TO YOU.");
      for (let i = 0; i < 5; i++) {
        HA.audio.play(i % 2 ? 'clamp' : 'stomp');
        world.shake(1);
        yield { wait: 26 };
      }
      f.lifts = 1;
      HA.music.setLayers(2);
      const link = raiseLift(world);
      HA.audio.play('lift');
      yield { until: () => !link || !link.rise };
      const lx = link ? link.x + 8 : world.player.x;
      const lead = crewNpc(world, who === 'SOLDER' ? 'solder' : 'gasket', lx / 8, 9, []);
      lead.facing = Math.sign(world.player.x - lead.x) || -1;
      yield { wait: 20 };
      if (who === 'SOLDER') {
        yield say('SOLDER', "A LIFT A LANDING. THAT'S THE DEAL. YOU CLIMB, WE BUILD BEHIND YOU.");
        yield say('SOLDER', "IT'LL TAKE YOU DOWN TO THE FOOT AND BACK, ANY TIME. DON'T BOUNCE IN IT.");
      } else {
        yield say('OLD GASKET', 'SOLDER WOULD HAVE HAD THIS UP IN HALF THE TIME. AND TOLD ME SO, ALL THE WAY UP.');
        yield say('OLD GASKET', "IT'LL HOLD. PROBABLY. IT GOES DOWN TO THE FOOT AND BACK.");
      }
      // Main 3, shut by the hero on the way up (the Condenser): the old crew never got round to it.
      if (f.condenser) {
        if (who === 'SOLDER') yield say('SOLDER', "AND SOMEBODY SHUT MAIN 3. THAT STAIR'S NOT BEEN DRY IN YEARS. NICE WORK.");
        else yield say('OLD GASKET', "AND THE STAIR'S DRY. SOLDER ALWAYS SAID SOMEBODY OUGHT TO SHUT MAIN 3.");
      }
      lead.state = 'gone';
      HA.audio.play('lift');
      if (f.tramEast) S.addStory(world, pipes ? 'THE CREW CAME THROUGH THE OVERFLOW PIPES BEHIND ME, AND BUILT THE FIRST LIFT UP THE SPINE.' : 'THE CREW BUILT THE FIRST LIFT UP THE SPINE BEHIND ME.');
      else S.addStory(world, n < 5 ? 'THE CLIMBERS CAME UP THE KEEL ON THE TRAM. NOT MANY. THEY BUILT THE FIRST LIFT UP THE SPINE BEHIND ME.' : 'THE CLIMBERS CAME UP THE KEEL ON THE TRAM, MORE OF THEM THAN I HAD HOPED. THEY BUILT THE FIRST LIFT UP THE SPINE BEHIND ME.');
      S.setLead(world, 'CLIMB ON. THE CREW WILL BUILD BEHIND YOU');
      world.save();
    },

    // The Boiler Stair's midway shelf: Main 3 has burst across the shaft above it (the fourth batch of new rooms).
    *steamShut(world) {
      yield me("A MAIN'S BURST ACROSS THE SHAFT ABOVE ME. LIVE STEAM, WALL TO WALL. THE DOOR ON THE SHELF SAYS CONDENSER.");
    },
    *condenserIn(world) {
      world.state.flags.condenserIn = true;
      yield { wait: 20 };
      yield me('COILS, UP TO THE ROOF, AND A SUMP OF HOT WATER UNDER THEM. THE NOTICE BY THE DOOR SHOULD SAY WHERE MAIN 3 SHUTS OFF.');
    },
    // Main 3's two valves: A past the sump, B on the coil tops. Both shut, the steam in the stair dies.
    *valveA(world) {
      yield* valve(world, 'condenserA');
    },
    *valveB(world) {
      yield* valve(world, 'condenserB');
    },
    // The shortcut back: the ladder by valve A, up the well beside Main 3 to the stair above the burst. While the
    // main is open, its steam fills the well.
    *chaseLadder(world) {
      const f = world.state.flags;
      if (!f.condenser && !f.crewCame) {
        HA.audio.play('steam');
        yield me("LIVE STEAM, ROLLING DOWN THE LADDER WELL. IT RUNS UP BESIDE MAIN 3, SO IT'S FULL OF WHAT THE MAIN'S LOSING.");
        return;
      }
      HA.audio.play('clamp');
      yield { fade: 'out', frames: 20 };
      world.travel(world.link);
      yield { wait: 10 };
      yield { fade: 'in', frames: 20 };
      if (!f.wellClimbed) {
        f.wellClimbed = true;
        yield me('OUT ON THE STAIR, ABOVE WHERE MAIN 3 BURST. QUICKER THAN THE WAY I WENT DOWN.');
      }
    },
    // The Piston Run's way up is plated over, bolted on the landing's side; the stokers' door is beside it.
    *plateShut(world) {
      yield me("THE SHAFT'S PLATED OVER ABOVE ME, BOLTED FROM THE TOP. THE DOOR BESIDE IT SAYS STOKERS.");
    },
    // Come round through the bunks onto the landing: the plate's bolt is on this side.
    *plateBolt(world) {
      yield { wait: 20 };
      world.state.flags.stokersPlate = true;
      yield { wait: 30 };
      yield me("THE PLATE OVER THE SHAFT WAS BOLTED ON THIS SIDE. I DREW THE BOLT. IT'S THE SHORT WAY DOWN NOW.");
      world.save();
    },
    // The Stokers' Bunks: where the Steward kept the stokers he took from the walls. Someone above is humming.
    *stokers(world) {
      world.state.flags.stokersSeen = true;
      yield { wait: 30 };
      yield me('BUNKS, BOLTED TO THE WALL, IN THE HEAT OFF THE REACTOR. NOBODY COULD SLEEP IN HERE. SOMEBODY HAD TO.');
      yield { wait: 40 };
      yield me('FROM SOMEWHERE ABOVE, OVER THE ROAR OF THE FIRES, SOMEONE IS HUMMING.');
      yield say('THE FURNACE', 'MM. MM-MM. MM-MM-MM.', ABEL);
      yield me('I KNOW THAT TUNE. THEY HUM IT IN THE WARRENS.');
      S.addStory(world, "THE STEWARD KEPT HIS STOKERS IN BUNKS BESIDE THE PISTON RUN. SOMEONE UP IN THE FURNACE WAS HUMMING THE TUNE THEY HUM IN THE WARRENS.");
    },
    // The last bunk, alone at the east end: a count kept for a year, and a name.
    *abelBunk(world) {
      const s = world.state;
      const first = !s.logs.abelCount;
      s.logs.abelCount = true;
      HA.audio.play('tally');
      const L = S.LOGS.abelCount;
      yield { say: L.title, text: L.text, color: LOG };
      if (!first) return;
      S.addStory(world, "THE LAST STOKER'S BUNK HAS A HULLFOLK COUNT SCRATCHED INTO ITS FRAME: A YEAR OF FIVES, THEN ONLY SCRATCHES. THE NAME CUT AT THE TOP IS ABEL.");
      world.toast('SAVED TO THE JOURNAL', 150);
      world.save();
    },

    // The Piston Landing: the second lift, if there are hands enough.
    *liftTwo(world) {
      const s = world.state;
      const f = s.flags;
      const who = leader(s);
      f.liftTwoSeen = true;
      yield { wait: 20 };
      if (crewOf(s) >= HANDS[2]) {
        for (let i = 0; i < 4; i++) {
          HA.audio.play(i % 2 ? 'clamp' : 'stomp');
          yield { wait: 22 };
        }
        f.lifts = 2;
        HA.music.setLayers(3);
        const link = raiseLift(world);
        HA.audio.play('lift');
        yield { until: () => !link || !link.rise };
        yield say(who, 'THE SECOND LIFT. AND THE RAMS ARE BEHIND YOU NOW. THEY NEARLY HAD ME, TWICE.');
        S.addStory(world, 'THE CREW BUILT A SECOND LIFT, UP PAST THE PISTONS.');
      } else {
        yield say(who, name(world) + "! WE HAVEN'T THE HANDS TO TAKE THE LIFT ANY HIGHER!", undefined);
        yield say(who, "WE'LL CLIMB. IT'LL TAKE US ALL NIGHT.");
        S.addStory(world, "THE CREW COULDN'T BUILD THE LIFT PAST THE BOILERS. TOO FEW HANDS. THEY CLIMBED.");
      }
      yield say(who, "THERE'S SOMETHING IN THE FURNACE ABOVE YOU. WE CAN HEAR IT FROM HERE. IT SOUNDS LIKE SINGING.");
      S.setLead(world, 'GET PAST THE FURNACE IN THE REACTOR THROAT');
      world.save();
    },

    // The Reactor Throat: someone is feeding the furnace.
    *abelIntro(world) {
      const s = world.state;
      const boss = world.boss;
      if (!boss) return;
      yield { wait: 10 };
      boss.active = true;
      world.refreshMusic();
      if (!s.flags.abelSeen) {
        s.flags.abelSeen = true;
        yield { wait: 40 };
        yield me('SOMEONE IS IN THE FURNACE. SHOVELLING. HUGE.');
        yield say('THE FURNACE', 'MORE. IT WANTS MORE.', ABEL);
        yield { wait: 20 };
        boss.lean = 0.5;
        HA.audio.play('roar');
        world.shake(3);
        yield say('THE FURNACE', 'WHO LET THE COLD IN?', ABEL);
      }
      boss.fighting = true;
      boss.timer = 40;
      world.refreshMusic();
      world.toast('HE CAN ONLY BE HURT LEANING OUT OF THE FURNACE', 220);
    },

    *abelDefeated(world) {
      const s = world.state;
      const boss = world.boss;
      s.flags.abelDown = true;
      HA.music.play(null);
      if (boss) {
        boss.broken = true;
        boss.active = false;
      }
      for (let i = 0; i < 3; i++) {
        HA.audio.play('stomp');
        world.shake(2);
        yield { wait: 24 };
      }
      yield { wait: 40 };
      yield say('THE FURNACE', 'I WAS ABEL.', ABEL);
      if (world.state.logs.abelCount) yield me('ABEL. THE NAME CUT INTO THE LAST BUNK, OVER A YEAR OF FIVES.');
      else if (world.state.logs.lists) yield me("ABEL. THE NAME AT THE END OF THE STEWARD'S LISTS: TO THE REACTOR, TO STOKE.");
      yield say('THE FURNACE', 'I FED THE FIRES.', ABEL);
      yield { wait: 30 };
      yield say('ABEL', "DON'T PUT THEM OUT.", ABEL);
      S.addStory(world, 'THE STOKER IN THE REACTOR THROAT WAS A MAN ONCE. ABEL. THE STEWARD USED HIM UP AND LEFT HIM FEEDING THE FIRES.');
      world.save();
      yield* abelChoice(world);
    },
    // A game quit before choice 10 picks it up again.
    *abelChoice(world) {
      yield { wait: 30 };
      yield* abelChoice(world);
    },

    // The crew's lift: down or up to any landing they've built it to.
    *crewLift(world) {
      const s = world.state;
      const here = world.link.legend.stop;
      const stops = STOPS.filter((st) => st.n !== here && builtTo(s, st.n));
      const pick = yield {
        choice: {
          prompt: "THE CREW'S LIFT",
          options: stops.map((st) => ({ label: (st.n > here ? 'UP TO ' : 'DOWN TO ') + st.name })).concat([{ label: 'STAY' }]),
        },
      };
      if (pick >= stops.length) return;
      const to = HA.rooms.byId[stops[pick].room];
      const ty = to.map.findIndex((row) => row.includes('L'));
      HA.audio.play('lift');
      yield { fade: 'out', frames: 30 };
      yield { wait: 30 };
      world.enterRoom(to.id, to.map[ty].indexOf('L') * 8, ty * 8 + 8 - world.player.h, { facing: world.player.facing });
      yield { fade: 'in', frames: 30 };
    },

    // The camp's way on: the Winding House's door, chained until the crew have slept (and had the chain off).
    *windingShut(world) {
      const g = npcOf(world, 'gasket');
      if (g) yield say('OLD GASKET', 'NOBODY GOES INTO THE TOWER TIRED. REST FIRST. THAT MEANS YOU.');
      else yield me('THE CREW ARE STOPPING HERE FOR THE NIGHT. SO AM I.');
    },
    // The Winding House: the Tower Lift's engine, running with nothing on it.
    *windingIn(world) {
      world.state.flags.windingSeen = true;
      yield { wait: 20 };
      yield me("THE TOWER LIFT'S ENGINE. IT'S RUNNING FLAT OUT, WITH NOTHING ON IT.");
    },
    // The clutch, by the way out onto the lift's deck: in, and the car comes down for the crew.
    *clutch(world) {
      const f = world.state.flags;
      if (f.winding) {
        yield me("IT'S IN. THE LIFT'S ON ITS WAY DOWN.");
        return;
      }
      f.winding = true;
      HA.audio.play('clamp');
      world.shake(3);
      for (const pn of world.pistons) pn.period = SLOW;
      yield { wait: 40 };
      HA.audio.play('lift');
      yield me('THE CRANKS SLOWED. THE CABLE WENT TIGHT, AND A LONG WAY UP, SOMETHING HEAVY STARTED DOWN.');
      S.addStory(world, "THE TOWER LIFT'S CLUTCH WAS OUT, BY THE STEWARD'S ORDER: THE LIFT ONLY EVER CAME DOWN FOR STOKERS. I THREW IT IN, AND THE CAR CAME DOWN FOR THE CREW.");
      world.save();
    },

    // The Crew Camp: the climbers catch up, by the third lift or the ladders.
    *campArrival(world) {
      const s = world.state;
      const f = s.flags;
      const n = crewOf(s);
      const who = leader(s);
      f.camp = true;
      s.crew = n;
      yield { wait: 30 };
      yield me('THE OLD CREW\'S CAMP: BUNKS, A STOVE, AND A PHONE ON A WIRE THAT RUNS ALL THE WAY DOWN THE SHAFT.');
      if (n >= HANDS[3]) {
        for (let i = 0; i < 4; i++) {
          HA.audio.play(i % 2 ? 'clamp' : 'stomp');
          yield { wait: 22 };
        }
        f.lifts = 3;
        HA.music.setLayers(4);
        const link = raiseLift(world);
        HA.audio.play('lift');
        yield { until: () => !link || !link.rise };
      } else {
        HA.audio.play('clamp');
        yield { wait: 40 };
      }
      yield { fade: 'out', frames: 20 };
      placeCamp(world);
      yield { wait: 20 };
      yield { fade: 'in', frames: 20 };
      if (n >= HANDS[3]) yield say(who, who === 'SOLDER' ? 'THE THIRD LIFT. EVERYONE RODE IT. EVEN GASKET, AND HE HATES LIFTS.' : 'I HATE LIFTS. I RODE IT ANYWAY. EVERYONE DID.');
      else yield say(who, "WE CLIMBED. ALL OF IT. DON'T ASK ME TO DO IT AGAIN.");
      yield say('OLD GASKET', 'WE STOP HERE TONIGHT. NOBODY GOES INTO THE TOWER TIRED.');
      S.addStory(world, 'THE CREW CAMPED AT THE TOP OF THE SPINE. ' + WORDS[n] + ' OF THEM CLIMBED WITH ME.');
      S.setLead(world, 'TALK TO THE CREW, THEN REST AT THE CAMP');
      world.refreshMusic();
      world.save();
    },

    // Wick's Lancets, for a climber's burnt arm.
    *stitch(world) {
      const s = world.state;
      const toller = npcOf(world, 'toller');
      yield say('TOLLER', "A STEAM PIPE GOT MY ARM ON THE STAIR. IT'S NOTHING.");
      yield me("IT'S NOT NOTHING. WICK'S LANCETS ARE SHARP ENOUGH TO STITCH WITH. SHE'D HAVE HAD IT CLOSED IN A MINUTE.");
      for (let i = 0; i < 3; i++) {
        HA.audio.play('lancet');
        yield { wait: 24 };
      }
      s.flags.stitched = true;
      if (toller) toller.lines = campLines(world, 'toller');
      yield say('TOLLER', 'SHE STITCHED MY BROTHER ONCE. SHE SANG THE WHOLE TIME, SO HE WOULDN\'T LOOK.');
      yield say('TOLLER', "NEATER THAN I'D HAVE DONE IT.");
      S.addStory(world, "I STITCHED TOLLER'S ARM WITH WICK'S LANCETS. HE SAID SHE'D HAVE SUNG.");
      world.save();
    },

    // Lights-out: Gasket's count down the line, the last of his held breath, and the Purser's last call.
    *lightsOut(world) {
      const s = world.state;
      const f = s.flags;
      const p = world.player;
      f.lightsOut = true;
      yield { fade: 'out', frames: 40 };
      world.nightScene = true;
      world.refreshMusic();
      for (const n of world.npcs) if (n.id !== 'gasket') n.sleeping = true;
      const g = npcOf(world, 'gasket');
      if (g) Object.assign(g, { x: 13 * 8, homeX: 13 * 8, facing: -1, kneel: false });
      yield { wait: 30 };
      yield { fade: 'in', frames: 40 };
      yield say('OLD GASKET', "TAMP. IT'S LIGHTS-OUT. COUNT THEM.");
      HA.audio.play('intercom');
      yield { wait: 30 };
      const deep = s.warrensRaid === 'fell';
      yield say('THE LINE', (deep ? '...DOWN HERE IN THE DEEP WALLS. ' : '') + 'ONE. TWO. THREE. FOUR...', LINE);
      yield { wait: 40 };
      if (s.toldShim === 'lie') {
        yield say('THE LINE', '...ONE SHORT.', LINE);
        yield say('THE LINE', "SHIM. HE'S NOT IN HIS BED. HE'S NOT ANYWHERE.", LINE);
        yield { wait: 30 };
        yield say('OLD GASKET', 'WHERE WOULD HE GO, ' + name(world) + '? WHERE WOULD HE GO?');
        yield me('I KNOW WHERE. TO FIND WHERE HIS MOTHER IS HIDING. WHERE I TOLD HIM SHE WAS.');
        yield me('UP. HE WENT UP THE VENTS.');
        f.shimRanOff = true;
        S.addStory(world, 'AT LIGHTS-OUT TAMP COUNTED THE CHILDREN DOWN THE LINE. ONE SHORT: SHIM HAD GONE INTO THE VENTS, TO FIND HIS MOTHER.');
      } else {
        const lantern = f.lanternWith === 'shim';
        yield say('THE LINE', lantern ? "...ALL HERE. SHIM'S UP WITH THE LANTERN. HE WANTS THE PHONE." : '...ALL HERE. SHIM WANTS THE PHONE.', LINE);
        yield say('SHIM', 'IS THE SLEEPER THERE?', LINE);
        yield me("I'M HERE.");
        yield say('SHIM', lantern ? "I'VE STILL GOT HER LANTERN. IT'S NOT SO DARK DOWN HERE." : "TAMP SAYS YOU'RE GOING TO THE VERY TOP. IS THERE A WINDOW?", LINE);
        yield me(lantern ? 'KEEP IT LIT FOR ME.' : 'THERE WILL BE.');
        yield say('SHIM', lantern ? 'OKAY. NIGHT, SLEEPER.' : 'LOOK OUT OF IT FOR ME. NIGHT, SLEEPER.', LINE);
        yield say('OLD GASKET', 'GOOD.');
      }
      HA.audio.play('intercom');
      yield { wait: 60 };
      if (g) g.kneel = true;
      yield say('OLD GASKET', 'I SPENT MY WHOLE LIFE HOLDING MY BREATH.');
      yield say('OLD GASKET', "I'D LIKE TO BREATHE OUT BEFORE THE END.");
      // With his trust (story/gasket.js), what he's never told anyone.
      if (S.gasketTrust(s) >= 3) {
        yield { wait: 30 };
        yield say('OLD GASKET', "I'VE NEVER SEEN A SKY. NOBODY DOWN THERE HAS. THEY SAY IT'S A CEILING NOBODY BUILT.");
        yield say('OLD GASKET', "IF I DON'T MAKE IT TO THE GROUND, YOU TELL THEM I WANTED TO.");
        f.gasketSky = true;
        S.addStory(world, "GASKET TOLD ME HE'S NEVER SEEN A SKY. IF HE DOESN'T MAKE IT TO THE GROUND, I'M TO TELL THEM HE WANTED TO.");
      }
      yield { wait: 40 };
      yield say('OLD GASKET', 'MY BROTHER CLEAT HAD A LOOK LIKE YOURS. LIKE SOMEBODY WAS WAITING ON HIM.');
      yield say('OLD GASKET', 'GO TO SLEEP. WHOEVER IT IS, THEY CAN WAIT ONE MORE NIGHT.');
      S.addStory(world, 'GASKET SAID HE HAD SPENT HIS WHOLE LIFE HOLDING HIS BREATH. HE WANTS TO BREATHE OUT BEFORE THE END.');
      if (g) g.sleeping = true;
      yield { wait: 90 };
      // The Purser, if the hero turned his boat down: it's still waiting, and this is the last time he'll ask.
      if (f.deserterOffered && !f.purserGone) {
        HA.audio.play('intercom');
        yield { wait: 30 };
        yield say('THE PURSER', 'LAST CALL, PILOT.');
        yield say('THE PURSER', "THEY START UP INTO THE TOWER AT FIRST LIGHT, AND I WON'T WAIT PAST IT. THE BOAT'S STILL IN ITS CRADLE. NOBODY WOULD SEE YOU GO.");
        const pick = yield {
          choice: {
            prompt: 'THE BOAT IS STILL WAITING.',
            options: [{ label: 'STAY' }, { label: 'TAKE THE BOAT', confirm: { title: 'TAKE THE BOAT AND GO?', gain: 'YOU LIVE', lose: 'EVERYONE ELSE, AND MARA', note: 'THE GAME ENDS HERE.' } }],
          },
        };
        if (pick === 1) {
          S.addChoice(world, "I LEFT THE CAMP WHILE THEY SLEPT, AND TOOK THE PURSER'S BOAT.");
          yield me("NOBODY WOKE. I DIDN'T LOOK AT GASKET.");
          yield { walk: p, x: 3 * 8, speed: 0.6 };
          p.hidden = true;
          yield { wait: 40 };
          yield* HA.endings.play(world, 'deserter');
          return;
        }
        f.purserGone = true;
        yield say('THE PURSER', "...SUIT YOURSELF. THEN I'LL FLY IT MYSELF, AND BADLY.");
        HA.audio.play('intercom');
        S.addStory(world, "THE PURSER CALLED ONE LAST TIME, OVER THE CAMP'S INTERCOM. I STAYED. I THINK HE TOOK THE BOAT HIMSELF.");
      }
      // Morning, after the clearest dream yet.
      yield { fade: 'out', frames: 50 };
      yield* S.dream(world, 4);
      world.nightScene = false;
      f.campDone = true;
      for (const n of world.npcs) n.sleeping = false;
      if (g) g.kneel = false;
      yield { wait: 40 };
      yield { fade: 'in', frames: 40 };
      yield say(leader(s), "UP. EVERYONE UP. THE CHAIN'S OFF THE WINDING HOUSE DOOR. THE TOWER LIFT'S UP THROUGH THERE.");
      for (const n of world.npcs) n.state = 'gone';
      world.refreshMusic();
      S.setLead(world, 'CLIMB THE WINDING HOUSE TO THE TOWER LIFT');
      world.save();
    },

    // The crew's verdict: before the Tower Lift they count themselves off, the way the Wardens count.
    *verdict(world) {
      const s = world.state;
      const f = s.flags;
      const list = crewList(s);
      f.verdict = true;
      s.crew = list.length;
      yield { wait: 30 };
      yield say('OLD GASKET', 'BEFORE WE GO UP.');
      yield say('OLD GASKET', 'THE COUNTERS COUNT EVERYTHING. LET\'S SEE HOW THEY LIKE IT.');
      for (const [i, id] of list.entries()) {
        const n = npcOf(world, id);
        if (n) n.facing = Math.sign(world.player.x - n.x) || 1;
        yield say(S.PEOPLE[id].name === 'THE DESERTER' ? 'FLUX' : S.PEOPLE[id].name, 'COUNT: ' + WORDS[i + 1] + '. ' + countLine(s, id));
      }
      yield { wait: 30 };
      const n = list.length;
      if (n >= HANDS[3]) {
        yield say('OLD GASKET', "THAT'S " + WORDS[n] + '. ENOUGH HANDS FOR ANY LIFT ON THIS SHIP.');
        yield me('NOBODY LAUGHED. THEN EVERYBODY DID.');
      } else {
        yield say('OLD GASKET', "THAT'S " + WORDS[n] + ". IT'LL HAVE TO DO.");
        yield me('NOBODY LAUGHED.');
      }
      S.addStory(world, 'BEFORE THE TOWER LIFT, THE CREW COUNTED THEMSELVES OFF, LIKE WARDENS. ' + WORDS[n] + ' OF THEM.');
      S.setLead(world, 'RIDE THE TOWER LIFT UP TO THE STEWARD');
      world.save();
    },
  };

  // Choice 10: Abel, beaten, asks that the fires be left burning.
  function* abelChoice(world) {
    const s = world.state;
    const boss = world.boss;
    const pick = yield {
      choice: {
        prompt: 'ABEL, ON HIS KNEES IN THE FURNACE.',
        options: [
          { label: 'LEAVE HIM HIS FIRES', confirm: { title: 'SPARE ABEL?', gain: 'ABEL LIVES, FEEDING THE FIRES', lose: 'HIS REST' } },
          { label: 'PUT THE FIRES OUT OF HIM', confirm: { title: 'END IT FOR ABEL?', gain: 'HE RESTS', lose: 'ABEL' } },
        ],
      },
    };
    if (pick === 0) {
      s.people.abel = 'spared';
      s.mercy += 1;
      if (boss) Object.assign(boss, { broken: false, fate: 'spared' });
      S.addChoice(world, 'I LEFT ABEL, THE STOKER, FEEDING HIS FIRES. HE WAS STILL SHOVELLING WHEN I CLIMBED ON.');
      yield say('ABEL', 'THE FIRES. THE FIRES.', ABEL);
      yield me("HE PICKED UP HIS SHOVEL AGAIN. HE DIDN'T LOOK AT ME.");
    } else {
      s.people.abel = 'ended';
      S.addChoice(world, "I OPENED THE QUENCH ON ABEL'S FURNACE. THE FIRES WENT OUT OF HIM, AND HE SAT DOWN IN THE DARK.");
      yield me('THE QUENCH VALVE WAS STIFF. IT TOOK BOTH HANDS.');
      HA.audio.play('steam');
      world.flash('#eef4f6', 10);
      world.shake(3);
      for (let i = 0; i < 20; i++) world.particles.push({ x: 33 * 8 + HA.rand(0, 36), y: 19 * 8 - HA.rand(0, 50), vx: HA.rand(-0.6, 0.2), vy: HA.rand(-1.2, -0.4), life: 40, max: 40, color: '#eef4f6', size: 2, grav: 0 });
      if (boss) boss.fate = 'ended';
      yield { wait: 50 };
      yield say('ABEL', "...IT'S QUIET.", ABEL);
    }
    S.setLead(world, 'CLIMB TO THE CREW CAMP');
    world.refreshMusic();
    world.save();
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.def.area === 'spine' && !f.spine) {
        f.spine = true;
        S.addStory(world, 'THE KEEL LINE ENDS AT THE FOOT OF THE ENGINE SPINE: THE SHIP\'S POWER, ONE SHAFT ALL THE WAY UP TO THE TOWER.');
        S.setLead(world, f.tramEast ? 'CLIMB THE ENGINE SPINE. THE CREW WILL BUILD BEHIND YOU' : 'CLIMB THE ENGINE SPINE. THE CREW WILL FOLLOW ON THE TRAM');
      }
      // Abel, in his furnace: fighting, waiting on his fate (see update), or left to it.
      if (id === 'reactor-throat' && world.bossSpawn) {
        const b = HA.bosses.abel.make(world, world.bossSpawn.x, world.bossSpawn.y);
        world.boss = b;
        world.enemies.push(b);
        if (f.abelDown) {
          b.broken = !s.people.abel;
          b.fate = s.people.abel;
        }
      }
      // Someone of the crew minds each stop of the lift until they've all come up to the camp.
      const crew = f.crewCame && !f.camp ? crewList(s) : [];
      const tramAway = f.tramEast && s.people.solder === 'dead'; // left at the Ballast stop, the keel flooded past it
      if (id === 'spine-foot' && crew[3]) crewNpc(world, crew[3], 15, 41, [tramAway ? "THE TRAM'S BACK AT THE BALLAST STOP. IF IT ALL GOES WRONG UP THERE, IT'S THE PIPES AND THEN THE TRAM." : "THE TRAM WAITS HERE. IF IT ALL GOES WRONG UP THERE, IT'S OUR WAY HOME."]);
      if (id === 'boiler-stair' && crew[4] && f.lifts >= 1) crewNpc(world, crew[4], 28, 9, ["I'M MINDING THE LIFT. IT DOESN'T NEED MINDING. I NEED A SIT DOWN."]);
      if (id === 'piston-run' && crew[5] && f.lifts >= 2) crewNpc(world, crew[5], 13, 9, ['THE RAMS NEARLY HAD ME. TWICE. TAKE THE LIFT.']);
      // The camp, before and after the night; the crew on the Tower Lift's deck in the morning.
      if (id === 'crew-camp' && f.camp && !f.campDone) placeCamp(world);
      if (id === 'tower-lift' && f.campDone && !f.towerUp) placeDeck(world);
      if (id === 'winding-house' && f.winding) for (const pn of world.pistons) pn.period = SLOW;
      // Home, once the climbers have gone up the Spine: only those who stayed behind the gate are left (and Shim,
      // unless he went into the vents).
      if (id === 'warrens' && f.crewCame) {
        const crew = crewList(s);
        let woken = crew.filter((c) => WOKEN.includes(c)).length;
        for (const n of world.npcs) {
          if (crew.includes(n.id) || (n.id === 'woken' && woken-- > 0) || (n.id === 'shim' && f.shimRanOff)) n.state = 'gone';
          if (n.id === 'tamp' && !n.sleeping) n.lines = ['THEY WENT UP THE SPINE, ALL WHO COULD. THE REST OF US KEEP THE GATE.'];
        }
      }
    },

    // Once the hero is in and free (not still on the ladder up): the climbers reach the camp, and a game quit
    // before choice 10 asks it again.
    update(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.scene || world.player.dead || world.transition || world.fade > 0.5) return;
      if (id === 'crew-camp' && f.abelDown && !f.camp) run(world, 'campArrival');
      else if (id === 'reactor-throat' && f.abelDown && !s.people.abel) run(world, 'abelChoice');
    },

    talk(world, npc) {
      const s = world.state;
      if (npc.id === 'toller' && world.def.id === 'crew-camp' && !s.flags.stitched && world.player.weapons.some((w) => w.id === 'lancets')) return 'stitch';
      return null;
    },

    // Abel has his own track; his throat is silent while he waits on his fate, and after it's put out. The camp is
    // quiet and warm until morning.
    music(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (id === 'reactor-throat') {
        const b = world.boss;
        if (b && b.fighting) return 'abel';
        if ((b && b.active) || (f.abelDown && !s.people.abel) || s.people.abel === 'ended') return null;
      }
      if (id === 'crew-camp' && f.camp && !f.campDone) return world.nightScene ? null : 'camp';
      return undefined;
    },
  });

  S.crewOf = crewOf;
  S.crewList = crewList;
  Object.assign(S.SCENES, SCENES);
})(window.HA);
