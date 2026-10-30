'use strict';
// The Warrens return (Phase 3.2): the woken are home before the hero, and Gasket sees Wick's lantern before
// anyone speaks. The hero tells Shim (choice 4), the Steward asks for the hero over the old speakers, Solder
// makes a plan, the Rivet Pistol goes to the gate or becomes a Repeater (choice 5), and in the night Solder builds
// the new gate and goes down the floor hatch. Also what the Hullfolk call the hero: LATE, SLEEPER or COUNTER.
// All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const FLOOR = (ty) => ty * 8;
  const VOICE = S.VOICE;
  const STEWARD = '#c9d6e8';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const name = (world) => S.callName(world.state);

  Object.assign(S.LOGS, {
    tram: {
      title: 'KEEL TRAM · YEAR 118',
      text: 'SERVICE TO THE SPINE FOOT SUSPENDED. THE MOTOR IS NEEDED AT BALLAST PUMP 3. THE PUMPS COME FIRST.',
    },
  });

  // ---- The woken, home: each has one thing to say ----
  const WOKEN_AT = [27, 30, 33, 50, 52, 55, 58, 24, 61, 21, 18];
  const WOKEN_RELEASE = [
    'I DREAMED THE WHOLE TIME. THE SAME FIELD, OVER AND OVER.',
    "MY HANDS STILL WON'T GET WARM.",
    'THE HEALER TALKED TO US WHILE WE SLEPT. I HEARD EVERY WORD.',
    'A COUNTER CUT US LOOSE. IT COUNTED US OUT, ONE BY ONE.',
    'THEY CALLED IT A DOSE. LIKE IT WAS MEDICINE.',
    (w) => 'THANK YOU, ' + name(w) + ". THAT'S ALL. THANK YOU.",
    'WE SANG ON THE WAY DOWN. THE LIFT HAS AN ECHO.',
    'IS IT TRUE THE SHIP IS LATE? HOW LATE?',
    "SORREL WASN'T IN HER CRADLE. BRINE KEEPS ASKING US WHERE SHE WENT.",
    "I KEEP COUNTING THE CHILDREN AT LIGHTS-OUT. THEY'RE ALL HERE.",
    'I SLEPT FOR MONTHS, THEY SAY. MY GIRL GREW WHILE I WAS GONE.',
  ];
  const WOKEN_SALVAGE = [
    'I DREAMED THE WHOLE TIME. THE SAME FIELD, OVER AND OVER.',
    "MY HANDS STILL WON'T GET WARM.",
    'THE HEALER TALKED TO US WHILE WE SLEPT. I HEARD EVERY WORD.',
    'FOUR OF US NEVER WOKE. WE LEFT THEM UP THERE, UNDER THE GLASS.',
    "MY BROTHER'S CRADLE WENT DARK. I WATCHED IT GO.",
    (w) => 'THANK YOU, ' + name(w) + '. I THINK. THANK YOU.',
    "SORREL WASN'T IN HER CRADLE. BRINE KEEPS ASKING US WHERE SHE WENT.",
  ];
  S.TALK.woken = {};

  function spawnWoken(world) {
    const s = world.state;
    const lines = s.wardens.pruner === 'salvage' ? WOKEN_SALVAGE : WOKEN_RELEASE;
    for (let i = 0; i < Math.min(s.takenHome, WOKEN_AT.length); i++) {
      const n = S.makeNpc(world, 'woken', { x: WOKEN_AT[i] * 8, y: FLOOR(18) });
      n.sprite = HA.art.people['woken' + (1 + (i % 4))];
      n.facing = i % 2 ? -1 : 1;
      n.kneel = i % 3 === 0;
      n.lines = [lines[i % lines.length]];
      world.npcs.push(n);
    }
  }

  // Where everyone is, by how far the evening has gone. Everyone stands on the village floor.
  function onFloor(n, tx, extra) {
    if (!n) return;
    Object.assign(n, { x: tx * 8, homeX: tx * 8, y: FLOOR(19) - n.h, homeY: FLOOR(19) - n.h, kneel: false, sleeping: false, lantern: false }, extra);
  }
  function arrange(world) {
    const s = world.state;
    const f = s.flags;
    const morning = !!f.climbPlanned;
    onFloor(npcOf(world, 'gasket'), 43, { kneel: !!f.homeAgain && !morning });
    onFloor(npcOf(world, 'solder'), f.broadcastHeard ? 86 : 47);
    onFloor(npcOf(world, 'tamp'), morning ? 110 : 36, { facing: morning ? 1 : -1 });
    const withShim = f.lanternWith === 'shim';
    onFloor(npcOf(world, 'shim'), s.toldShim && withShim ? 39 : 10, { kneel: !morning, lantern: withShim, facing: 1 });
  }

  // ---- The scenes ----
  const SCENES = {
    // Home. The fire is loud with the woken and their families, until Gasket sees what the hero is carrying.
    *homeAgain(world) {
      const s = world.state;
      const p = world.player;
      const gasket = npcOf(world, 'gasket');
      const woken = world.npcs.filter((n) => n.id === 'woken');
      s.flags.homeAgain = true;
      s.lead = 'TELL SHIM';
      if (woken[0]) S.bark(world, woken[0], 'YOU GOT OLD, TAMP.');
      if (woken[3]) S.bark(world, woken[3], 'AND THEN THE LIFT JUST STOPPED, AND THERE WAS THE FIRE.');
      if (p.x > 52 * 8) yield { walk: p, x: 52 * 8, speed: 1.1 };
      p.facing = -1;
      world.camTarget = { x: 46 * 8, y: FLOOR(19) - 34 };
      yield { wait: 80 };
      // Gasket looks up from the families, and sees the lantern. The fire goes quiet.
      if (gasket) gasket.facing = Math.sign(p.x - gasket.x) || 1;
      yield { wait: 50 };
      world.barks = [];
      HA.music.play(null);
      for (const n of world.npcs) if (n.state === 'out' && n.id !== 'shim') n.facing = Math.sign(p.x - n.x) || n.facing;
      yield { wait: 100 };
      yield say('OLD GASKET', '...');
      if (gasket) {
        gasket.facing = -1;
        gasket.kneel = true;
      }
      yield { wait: 70 };
      yield me('NOBODY SAID ANYTHING. SHE KNEW FROM THE LANTERN.');
      yield say('TAMP', "SHE'S MAKING THE BROTH.");
      yield say('TAMP', "THAT WAS WICK'S JOB.");
      yield { wait: 40 };
      yield say('A WOKEN VILLAGER', "THE BOY'S BEEN SITTING BY HIS DOOR SINCE WE CAME DOWN. HE SAYS SHE'LL BE BACK BY LIGHTS-OUT.");
      world.camTarget = null;
      S.setLead(world, 'TELL SHIM');
      S.addStory(world, "THE TAKEN WERE HOME BEFORE ME. GASKET SAW WICK'S LANTERN BEFORE ANYONE SPOKE. SHIM IS WAITING BY HIS DOOR FOR HIS MOTHER.");
      yield* naming(world);
      world.refreshMusic();
      world.save();
    },

    // Choice 4: what to tell Shim. The hero never speaks aloud; what they tell him is in their own voice.
    *tellShim(world) {
      const s = world.state;
      const p = world.player;
      const shim = npcOf(world, 'shim');
      const gasket = npcOf(world, 'gasket');
      shim.kneel = false;
      shim.facing = Math.sign(p.x - shim.x) || 1;
      p.facing = -shim.facing;
      yield { wait: 20 };
      yield say('SHIM', "YOU'RE BACK.");
      yield say('SHIM', 'WHERE IS SHE? SHE SAID LIGHTS-OUT.');
      yield { wait: 50 };
      yield say('SHIM', 'WHY HAVE YOU GOT HER LANTERN?');
      const pick = yield {
        choice: {
          prompt: 'WHAT DO YOU TELL SHIM?',
          options: [
            { label: 'TELL HIM EVERYTHING', confirm: { title: 'TELL SHIM EVERYTHING?', gain: 'SHIM KNOWS · HE KEEPS HER LANTERN', lose: 'HIS HOPE' } },
            { label: "TELL HIM SHE WASN'T SCARED", confirm: { title: "TELL HIM SHE WASN'T SCARED?", gain: 'SHIM KNOWS', lose: 'HIS HOPE' } },
            { label: 'LIE, WITH THE LANTERN', confirm: { title: 'LIE TO SHIM?', gain: 'SHIM KEEPS HOPING', lose: 'THE TRUTH. GASKET WILL KNOW' } },
          ],
        },
      };
      // The choice is recorded at once; what follows only plays it out.
      s.toldShim = ['truth', 'notScared', 'lie'][pick];
      s.mercy += pick === 2 ? -1 : 1;
      s.flags.lantern = false;
      s.flags.lanternWith = pick === 1 ? 'fire' : 'shim';
      s.lead = 'SIT WITH GASKET BY THE FIRE';
      S.addChoice(
        world,
        [
          "I TOLD SHIM EVERYTHING WICK SAID AT THE END: SHE WASN'T SCARED, AND THEN THAT SHE WAS, A LITTLE. HE HAS HER LANTERN.",
          "I TOLD SHIM HIS MOTHER WASN'T SCARED. I DIDN'T TELL HIM THE REST.",
          "I GAVE SHIM HIS MOTHER'S LANTERN AND TOLD HIM SHE'S HIDING, SAFE. GASKET KNOWS I LIED.",
        ][pick],
      );
      p.kneel = 900; // down at his height while they tell him
      if (pick === 0) {
        yield me("I TOLD HIM WHAT SHE SAID AT THE END. THAT SHE WASN'T SCARED.");
        yield { wait: 50 };
        yield me('THEN THE REST. THAT SHE WAS, A LITTLE.');
        yield { wait: 60 };
        yield say('SHIM', '...');
        shim.lantern = true;
        yield { wait: 50 };
        yield say('SHIM', "IT'S STILL LIT.");
        yield { wait: 40 };
        yield say('SHIM', 'SHE SAYS A LITTLE SCARED IS ALLOWED.');
        yield { wait: 80 };
        yield say('SHIM', '...SAID.');
      } else if (pick === 1) {
        yield me("I TOLD HIM WHAT SHE SAID AT THE END. THAT SHE WASN'T SCARED.");
        yield { wait: 50 };
        yield me("I DIDN'T TELL HIM THE REST.");
        yield { wait: 40 };
        yield say('SHIM', "SHE'S NEVER SCARED. NOT OF ANYTHING.");
        yield { wait: 60 };
        yield say('SHIM', "I DON'T WANT IT. IT'S HERS.");
        yield me("HE WOULDN'T TAKE THE LANTERN. I HUNG IT BY THE FIRE, WHERE SHE'D HAVE SEEN IT.");
      } else {
        shim.lantern = true;
        yield me("I GAVE HIM THE LANTERN. I TOLD HIM SHE SENT IT HOME SO HE'D KNOW SHE'S SAFE. THAT SHE'S HIDING.");
        yield say('SHIM', 'HIDING? FROM THE COUNTERS?');
        yield { wait: 40 };
        yield say('SHIM', "SHE'S GOOD AT HIDING. SHE ALWAYS FINDS ME FIRST.");
        // Across the room, Gasket sees him with it, and knows.
        if (gasket) {
          world.camTarget = { x: gasket.x, y: FLOOR(19) - 30 };
          yield { wait: 50 };
          gasket.kneel = false;
          gasket.facing = Math.sign(p.x - gasket.x) || 1;
          yield { wait: 90 };
          gasket.facing = -gasket.facing;
          gasket.kneel = true;
          yield { wait: 40 };
          world.camTarget = null;
        }
      }
      p.kneel = 0;
      shim.kneel = true;
      if (pick !== 1) {
        // He goes to sit by the fire with it.
        shim.homeX = 39 * 8;
      }
      S.setLead(world, 'SIT WITH GASKET BY THE FIRE');
      yield* naming(world);
      world.save();
    },

    // Gasket's grief, at the pot. Then the old speakers crackle.
    *grief(world) {
      const s = world.state;
      const gasket = npcOf(world, 'gasket');
      if (gasket) gasket.kneel = true;
      yield { wait: 20 };
      if (s.toldShim === 'lie') {
        yield say('OLD GASKET', "HE SAYS SHE'S HIDING.");
        yield { wait: 50 };
        yield say('OLD GASKET', 'YOU GAVE HIM A LANTERN AND A LIE. ONE OF THEM WILL GO OUT.');
      } else {
        yield say('OLD GASKET', "SIT. EAT. IT ISN'T AS GOOD AS HERS.");
        yield say('OLD GASKET', s.toldShim === 'truth' ? "YOU TOLD HIM ALL OF IT. GOOD. HE'D HAVE KNOWN IF YOU HADN'T." : "YOU TOLD HIM. THAT'S ENOUGH FOR ONE NIGHT.");
      }
      yield { wait: 70 };
      yield say('OLD GASKET', 'SHE WAS ALWAYS GOING TO GO.');
      yield { wait: 40 };
      yield say('OLD GASKET', "I JUST THOUGHT I'D GO FIRST.");
      yield { wait: 90 };
      yield* broadcast(world);
    },

    // Choice 5, at Solder's bench before she goes.
    *pistol(world) {
      const s = world.state;
      const p = world.player;
      const pistol = p.weapons.find((w) => w.id === 'pistol');
      if (!pistol) {
        // A hero who never took the pistol from the Cryo Deck has nothing to trade: Solder arms the gate herself.
        s.flags.pistolDone = true;
        s.flags.pistolGiven = true;
        yield say('SOLDER', "NO PISTOL? THEN THE GATE GETS MY OLD RIVET GUN. IT JAMS, BUT IT BITES.");
      } else {
        yield say('SOLDER', 'THAT RIVET PISTOL. I CAN DO ONE OF TWO THINGS WITH IT BEFORE I GO.');
        yield say('SOLDER', "BOLT IT TO THE NEW GATE, SO TAMP HAS SOMETHING THAT BITES WHILE WE'RE GONE.");
        yield say('SOLDER', "OR GIVE IT A SECOND BARREL AND A TEMPER, FOR YOU. IT'S YOUR GUN.");
        const pick = yield {
          choice: {
            prompt: 'THE RIVET PISTOL',
            options: [
              { label: 'GIVE IT TO THE GATE', confirm: { title: 'GIVE THE PISTOL TO THE GATE?', gain: 'IF THEY COME, THE GATE HOLDS', lose: 'THE RIVET PISTOL, FOR GOOD' } },
              { label: 'UPGRADE IT', confirm: { title: 'UPGRADE THE PISTOL?', gain: 'THE RIVET REPEATER', lose: "THE GATE'S GUN. IF THEY COME, IT FALLS" } },
            ],
          },
        };
        // The choice is recorded at once; what follows only plays it out.
        s.flags.pistolDone = true;
        if (pick === 0) {
          s.flags.pistolGiven = true;
          s.mercy += 1;
          const i = p.weapons.indexOf(pistol);
          p.weapons.splice(i, 1);
          if (p.wi >= i) p.wi = Math.max(0, p.wi - 1);
          p.charge = 0;
          world.weaponBanner = 120;
          S.addChoice(world, "I GAVE MY RIVET PISTOL TO THE WARRENS' NEW GATE. TAMP WILL KEEP IT FED.");
          HA.audio.play('unlock');
          yield say('SOLDER', "TAMP WILL KEEP IT FED. IT'LL BE HERE WHEN YOU'RE BACK. SO WILL WE.");
        } else {
          s.flags.repeater = true;
          pistol.id = 'repeater';
          p.wi = p.weapons.indexOf(pistol);
          world.weaponBanner = 160;
          S.addChoice(world, 'SOLDER TURNED MY RIVET PISTOL INTO A REPEATER. THE NEW GATE HAS NO GUN.');
          world.toast('RIVET REPEATER · TWIN BOLTS', 240);
          HA.audio.play('levelUp');
          yield say('SOLDER', "THERE. TWO BARRELS. DON'T WASTE THEM ON CRAWLERS.");
          yield say('SOLDER', 'THE GATE WILL HAVE TO HOLD ON ITS OWN.');
        }
      }
      s.lead = 'REST AT THE VILLAGE POD';
      yield say('SOLDER', 'GO REST, ' + name(world) + ". I'LL BE GONE BEFORE YOU WAKE.");
      S.setLead(world, 'REST AT THE VILLAGE POD');
      yield* naming(world);
      world.save();
    },

    // That night: Solder builds the new gate, opens the floor hatch, and goes. Shim is awake to see it.
    *solderLeaves(world) {
      const s = world.state;
      const p = world.player;
      const solder = npcOf(world, 'solder');
      const shim = npcOf(world, 'shim');
      yield { fade: 'out', frames: 40 };
      HA.music.play(null);
      yield { card: ['LIGHTS-OUT.'], hold: 110 };
      world.nightScene = true;
      p.hidden = true; // asleep in the pod
      if (solder) Object.assign(solder, { x: 109 * 8, homeX: 109 * 8, facing: 1, kneel: false, lantern: true });
      if (shim) Object.assign(shim, { x: 74 * 8, homeX: 74 * 8, facing: 1, kneel: true });
      world.camTarget = { x: 104 * 8, y: FLOOR(19) - 34 };
      yield { fade: 'in', frames: 50 };
      for (let i = 0; i < 6; i++) {
        world.burst(112 * 8 + 4, FLOOR(15) + (i % 3) * 8, ['#fff0a8', '#ffb84d', '#ffffff'], 8, 1.4);
        HA.audio.play('tink');
        yield { wait: 28 };
      }
      s.flags.newGate = true;
      HA.audio.play('doorShut');
      yield { wait: 60 };
      if (solder) {
        world.camTarget = { x: 82 * 8, y: FLOOR(19) - 34 };
        yield { walk: solder, x: 79 * 8, speed: 1.2 };
        solder.facing = -1;
      }
      HA.audio.play('clamp');
      s.flags.hatch = true;
      yield { wait: 40 };
      if (shim) {
        yield say('SHIM', 'WHERE ARE YOU GOING?');
        yield say('SOLDER', 'TO FETCH A MOTOR. GO TO SLEEP, SHIM.');
        yield { wait: 50 };
        yield say('SHIM', 'EVERYONE SAYS THAT.');
        yield { wait: 60 };
      }
      if (solder) {
        solder.state = 'gone';
        HA.audio.play('vent');
      }
      yield { wait: 70 };
      yield { fade: 'out', frames: 50 };
      // Morning. The hero wakes at the village pod. Solder is gone, and the hatch is open.
      s.flags.solderLeft = true;
      s.flags.climbPlanned = true;
      s.lead = 'FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH';
      world.nightScene = false;
      world.camTarget = null;
      p.hidden = false;
      arrange(world);
      const pod = world.pods[0];
      if (pod) {
        p.x = pod.x + 4;
        p.y = pod.y + pod.h - p.h;
        s.rest = { room: world.def.id, x: p.x, y: p.y };
      }
      p.hp = p.maxHp;
      p.facing = -1;
      S.addStory(world, 'SOLDER BUILT A NEW GATE IN THE NIGHT, ONE THAT OPENS FROM OUR SIDE. THEN SHE WENT DOWN THE FLOOR HATCH TO FETCH A MOTOR FOR THE OLD KEEL TRAM. THE TRAM GOES TO THE ENGINE SPINE, AND THE SPINE GOES UP TO THE STEWARD.');
      world.refreshMusic();
      world.save();
      yield { wait: 30 };
      yield { fade: 'in', frames: 50 };
      S.setLead(world, 'FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH');
      yield* naming(world);
      world.save();
    },

    // What the Hullfolk call the hero changed while the hero was away.
    *named(world) {
      yield { wait: 30 };
      yield* naming(world);
      world.save();
    },

    // Down the floor hatch to the sump, and back up its ladder.
    *hatch(world) {
      HA.audio.play('clamp');
      yield { fade: 'out', frames: 20 };
      world.travel(world.link);
      yield { wait: 10 };
      yield { fade: 'in', frames: 20 };
    },
  };

  // The Steward's broadcast, and the plan it starts.
  function* broadcast(world) {
    const s = world.state;
    const p = world.player;
    const gasket = npcOf(world, 'gasket');
    const solder = npcOf(world, 'solder');
    HA.audio.play('intercom');
    yield { wait: 24 };
    yield say('THE SPEAKERS', 'TO THE PEOPLE IN THE WALLS.', STEWARD);
    yield say('THE SPEAKERS', 'SEND ME THE SLEEPER, AND NO ONE ELSE WILL BE COUNTED.', STEWARD);
    HA.audio.play('intercom');
    s.flags.broadcastHeard = true;
    s.lead = 'TALK TO SOLDER BEFORE SHE GOES';
    S.addStory(world, "THE STEWARD SPOKE OVER THE WARRENS' OLD SPEAKERS: SEND HIM THE SLEEPER, AND NO ONE ELSE WILL BE COUNTED. NOBODY MOVED.");
    // Everyone looks at the hero. Nobody moves.
    for (const n of world.npcs) if (n.state === 'out') n.facing = Math.sign(p.x - n.x) || n.facing;
    yield { wait: 120 };
    yield me("THE VOICE FROM THE LOCKUP'S INTERCOM.");
    if (gasket) gasket.kneel = false;
    yield say('OLD GASKET', "THE STEWARD. TWENTY YEARS HE'S HELD THAT KEY, AND HE'S NEVER ONCE SPOKEN TO US.");
    yield { wait: 40 };
    yield say('OLD GASKET', "WE DON'T HAND OVER LOST THINGS.");
    yield { wait: 40 };
    yield say('TAMP', "HE'LL SEND HIS PINK-EYED SOLDIERS DOWN EITHER WAY.");
    yield say('OLD GASKET', 'THEN WHOEVER HOLDS THAT KEY DECIDES WHAT HAPPENS TO US. IT ALWAYS HAS.');
    yield say('SOLDER', 'SO IF THE KEY CHANGES HANDS, WE WANT TO BE IN THE ROOM.');
    yield say('SOLDER', "THERE'S A TRAM UNDER US. THE OLD CREW'S. IT RUNS FROM THE SUMP, ALONG THE KEEL, TO THE FOOT OF THE ENGINE SPINE.");
    yield say('SOLDER', 'THE CREW LIFTS IN THE SPINE GO ALL THE WAY UP TO THE TOWER. TO HIM.');
    yield say('TAMP', "THAT TRAM HASN'T MOVED SINCE MY GRANDMOTHER WAS SMALL.");
    yield say('SOLDER', "ITS MOTOR'S GONE. THERE'S A WORKING ONE IN THE BALLAST PUMP ROOMS. I'LL FETCH IT. TONIGHT.");
    yield say('OLD GASKET', 'THROUGH THE CARGO DECKS. ALONE.');
    yield say('SOLDER', "I'LL CHALK THE WALLS AS I GO. YOU CAN FOLLOW MY CHALK, " + name(world) + '.');
    yield say('OLD GASKET', 'ONLY THE ABLE CLIMB. THE YOUNG AND THE OLD STAY BEHIND THE GATE, WITH TAMP.');
    yield say('SOLDER', 'THEN THE GATE COMES FIRST. ONE THAT OPENS FROM OUR SIDE. I PROMISED.');
    const armed = p.weapons.some((w) => w.id === 'pistol');
    yield say('SOLDER', armed ? 'COME TO MY BENCH BEFORE I GO. BRING THAT PISTOL.' : 'COME TO MY BENCH BEFORE I GO.');
    if (gasket) gasket.kneel = true;
    if (solder) solder.homeX = 86 * 8;
    S.setLead(world, 'TALK TO SOLDER BEFORE SHE GOES');
    world.save();
  }

  // Shim names the hero LATE once Mercy is high enough, and the village starts saying COUNTER once it's low.
  function* naming(world) {
    const s = world.state;
    const f = s.flags;
    if (world.def.id !== 'warrens') return;
    if (s.mercy <= -3 && !f.namedCounter) {
      f.namedCounter = true;
      yield { wait: 30 };
      yield say('TAMP', '...COUNTER.');
      yield me("COUNTER. IT'S WHAT THEY CALL THE WARDENS.");
      S.addStory(world, "THE HULLFOLK HAVE STARTED CALLING ME COUNTER. IT'S WHAT THEY CALL THE WARDENS.");
      return;
    }
    const shim = npcOf(world, 'shim');
    if (s.mercy < 4 || f.namedLate || !f.climbPlanned || !shim) return;
    const p = world.player;
    f.namedLate = true;
    shim.kneel = false;
    if (Math.abs(shim.x - p.x) > 80) shim.x = p.x + (shim.x < p.x ? -64 : 64);
    yield { walk: shim, x: p.x + (shim.x < p.x ? -14 : 14), speed: 1.2 };
    shim.facing = Math.sign(p.x - shim.x) || 1;
    p.facing = -shim.facing;
    yield say('SHIM', "GRAN SAYS IF YOU'RE GOING TO KEEP COMING BACK, YOU NEED A PROPER NAME.");
    yield say('SHIM', "YOU'RE NOT A SLEEPER ANYMORE. YOU'RE LATE.");
    yield say('SHIM', "THAT'S YOUR NAME.");
    shim.homeX = shim.x;
    S.addStory(world, 'SHIM GAVE ME A NAME. NOT SLEEPER ANY MORE: LATE.');
  }

  // ---- What people say, now ----
  const lie = (s) => s.toldShim === 'lie';
  Object.assign(S.TALK.gasket, {
    home: (w) => {
      const s = w.state;
      if (!s.toldShim) return [["GO TO THE BOY FIRST. HE'S BY HIS DOOR."]];
      if (lie(s)) return [["SOLDER'S AT HER BENCH."], ['...']];
      return [["SOLDER'S AT HER BENCH. SHE'S GOING TONIGHT, WHATEVER I SAY."], ['THE SHIP HUMS AT NIGHT. MY MOTHER SAID IT WAS SINGING.']];
    },
    climb: (w) => {
      if (lie(w.state)) return [["SOLDER'S CHALK GOES DOWN THROUGH THE HATCH. GO ON."], ['...']];
      return [
        [(w2) => "SOLDER'S CHALK GOES DOWN THROUGH THE HATCH BY HER BENCH. FOLLOW IT, " + name(w2) + '.'],
        ["THE CREW'S LIFTS UP THE SPINE ARE BIG. A LIFT THAT BIG NEEDS HANDS. YOU'LL HAVE THEM IF THEY TRUST YOU."],
        ['THE SHIP HUMS AT NIGHT. MY MOTHER SAID IT WAS SINGING.'],
      ];
    },
  });
  Object.assign(S.TALK.shim, {
    home: (w) =>
      ({
        truth: [["IT'S STILL LIT. I'M GOING TO KEEP IT LIT."]],
        notScared: [["I DON'T WANT TO TALK ABOUT IT."]],
        lie: [["WHEN SHE COMES BACK, I'M GOING TO HIDE. SEE HOW SHE LIKES IT."]],
      })[w.state.toldShim] || [['...']],
    climb: (w) =>
      ({
        truth: [[(w2) => 'COME BACK, ' + name(w2) + '. PEOPLE KEEP NOT COMING BACK.']],
        notScared: [["MUM'S LANTERN IS STILL BY THE FIRE. I DON'T LOOK AT IT."]],
        lie: [["IF YOU SEE MUM DOWN THERE, TELL HER I'VE GOT HER LANTERN."]],
      })[w.state.toldShim] || [['...']],
  });
  Object.assign(S.TALK.solder, {
    home: (w) => (w.state.flags.pistolDone ? [[(w2) => 'GO REST, ' + name(w2) + ". I'LL BE GONE BEFORE YOU WAKE."]] : [["I DON'T KNOW WHAT TO SAY. I ALWAYS KNOW WHAT TO SAY."]]),
  });
  Object.assign(S.TALK.tamp, {
    home: [["WICK STITCHED MY HAND ONCE. SHE TALKED THE WHOLE TIME SO I WOULDN'T LOOK."]],
    climb: (w) => [[w.state.flags.pistolGiven ? "SOLDER BOLTED YOUR PISTOL TO THE GATE. I'LL KEEP IT FED." : "THE GATE OPENS FROM OUR SIDE NOW. THAT'LL HAVE TO BE ENOUGH."], ['MANY HANDS. COUNT THEM. THAT WAS ON THE WALL BEFORE I WAS BORN.']],
  });
  Object.assign(S.TALK.brine, {
    home: [["SORREL WASN'T WITH THEM. HER CRADLE WAS EMPTY, THEY SAID."], ["EMPTY ISN'T DEAD. EMPTY IS SOMEWHERE ELSE."]],
    climb: [['IF YOU SEE ANOTHER EMPTY CRADLE ANYWHERE, LOOK FOR HER NAME. SORREL.']],
  });

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      if (world.def.id !== 'warrens' || !f.cradles) return;
      spawnWoken(world);
      if (f.wickDead) arrange(world);
    },

    // A name that came due while the hero was away is given as soon as they're home and free.
    update(world) {
      const s = world.state;
      const f = s.flags;
      if (world.def.id !== 'warrens' || !f.homeAgain || f.running || world.scene || world.player.dead || world.transition) return;
      const due = (s.mercy <= -3 && !f.namedCounter) || (s.mercy >= 4 && !f.namedLate && f.climbPlanned && npcOf(world, 'shim'));
      if (due) run(world, 'named');
    },

    // Talking to Shim, then Gasket, then Solder moves the evening on.
    talk(world, npc) {
      const s = world.state;
      const f = s.flags;
      if (world.def.id !== 'warrens' || !f.homeAgain) return null;
      if (npc.id === 'shim' && !s.toldShim) return 'tellShim';
      if (npc.id === 'gasket' && s.toldShim && !f.broadcastHeard) return 'grief';
      if (npc.id === 'solder' && f.broadcastHeard && !f.pistolDone) return 'pistol';
      return null;
    },

    // The village's own music is back once the hero is home, quieter for the evening, and quiet again for COUNTER.
    music(world) {
      const s = world.state;
      const f = s.flags;
      if (world.def.id !== 'warrens' || !f.wickDead) return undefined;
      if (world.nightScene) return null;
      if (!f.homeAgain) return 'warrens';
      if (!f.climbPlanned) return 'warrensHush';
      return S.callName(s) === 'COUNTER' ? 'warrensHush' : 'warrens';
    },
  });

  Object.assign(S.SCENES, SCENES);
})(window.HA);
