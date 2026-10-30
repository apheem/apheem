'use strict';
// The Command Tower's story (Phase 3.6): the crew ride the Tower Lift up with the hero ("WE WANT TO BE IN THE
// ROOM"); the Observation Dome, where the world shows dark and empty and the Navigator speaks for the first time
// (and on the lie path Shim, come up the vents, asks where his mother is: choice 4b); the Gardener in her gallery
// (her last offer of the Thorn, and choice 11); Steward Marrant at the Helm (his speech, the fight, choice 12);
// and what follows his fall: Overgrown (fought as Solder or Gasket), the Key offered (choice 13, Dominion), or the
// Key broken and the ship's scuttle: the lift down for the true path, the run for the sleds for Crash (see
// scuttle.js). All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const NAV = '#b8f4ff'; // the Navigator
  const COUNT = '#5fd4e8'; // the Wardens, and the Key
  const STEWARD = '#c9d6e8';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const steward = (text) => say('THE STEWARD', text, STEWARD);
  const name = (w) => S.callName(w.state);
  const FLOOR = (ty) => (ty - 1) * 8; // a person stands on map row ty
  const has = (world, id) => world.player.weapons.some((w) => w.id === id);

  // ---- The crew, up the Tower ----
  // Who climbed is settled at the verdict (s.crew); later choices don't send anyone home.
  const crewOf = (s) => S.crewList(Object.assign({}, s, { mercy: 99 })).slice(0, Math.max(2, s.crew || 0));
  const fighter = (s) => (s.people.solder === 'alive' ? 'solder' : 'gasket');
  function place(world, id, tx, ty, lines) {
    const n = S.makeNpc(world, id, { x: tx * 8, y: FLOOR(ty) });
    if (id === 'flux') n.name = 'FLUX';
    n.state = 'out';
    n.lines = lines;
    if (lines) n.talkable = (w, self) => self.state === 'out';
    world.npcs.push(n);
    return n;
  }
  // Where each stands: by the Tower Lift in the Barracks, and at the Helm's west end.
  const BARRACKS_AT = [4, 10, 12, 14, 9, 16, 3, 11, 13, 15, 5, 17];
  const HELM_AT = [3, 7, 9, 11, 4, 13, 6, 8, 10, 12, 2, 14];
  const crewLine = (s, id) =>
    ({
      gasket: ["WE'LL HOLD THE LIFT. GO ON. WE'RE RIGHT BEHIND YOU.", 'WE WANT TO BE IN THE ROOM. ALL OF US.'],
      solder: ["MARBLE. HE'S GOT MARBLE UP HERE. WE'VE GOT RUST.", "MY LEG'S FINE. STOP LOOKING AT IT."],
      shim: ["GRAN SAYS I HAVE TO STAY BEHIND HER. I'M BEHIND HER."],
    })[id] || ['WE WANT TO BE IN THE ROOM.'];
  function placeCrew(world, at, ty) {
    const s = world.state;
    const ids = crewOf(s).concat(s.flags.shimWith ? ['shim'] : []);
    ids.forEach((id, i) => {
      if (world.playAs === id) return; // the one fighting is the player now
      const n = place(world, id, at[i % at.length] + (i >= at.length ? 0.5 : 0), ty, crewLine(s, id));
      n.facing = 1;
      if (id === 'shim' && s.toldShim === 'lie') n.lantern = true;
    });
  }

  // ---- The scenes ----
  const SCENES = {
    // The Tower Lift: the first time up, the whole crew rides it with the hero.
    *towerLift(world) {
      const s = world.state;
      const f = s.flags;
      const up = world.def.id === 'tower-lift';
      if (up && !f.verdict) {
        yield me("IT'S THE CREW'S LIFT. I'M NOT GOING UP WITHOUT THEM.");
        return;
      }
      if (f.scuttle) return;
      HA.audio.play('lift');
      if (up && !f.towerUp) {
        yield say('OLD GASKET', 'ALL OF US. EVERYONE ON. WE WANT TO BE IN THE ROOM.');
        for (const n of world.npcs) {
          n.homeX = 14 * 8 + ((n.x / 8) % 3) * 4;
          n.state = 'out';
        }
        yield { wait: 40 };
      }
      yield { fade: 'out', frames: 30 };
      for (let i = 0; i < 3; i++) {
        HA.audio.play('clamp');
        yield { wait: 24 };
      }
      world.travel(world.link);
      if (up && !f.towerUp) {
        f.towerUp = true;
        placeCrew(world, BARRACKS_AT, 19);
        yield { wait: 20 };
        yield { fade: 'in', frames: 30 };
        yield me('THE TOWER. MARBLE, AND BRASS, AND THE NIGHT IN EVERY WINDOW.');
        yield say('OLD GASKET', "WE'LL HOLD THE LIFT. GO ON, " + name(world) + ". WE'RE RIGHT BEHIND YOU.");
        S.addStory(world, 'THE TOWER LIFT TOOK US ALL UP INTO THE COMMAND TOWER: MARBLE AND BRASS, AND THE NIGHT IN EVERY WINDOW. THE CREW HELD THE LIFT.');
        S.setLead(world, 'FIND THE WAY UP TO THE HELM');
        world.save();
        return;
      }
      yield { wait: 10 };
      yield { fade: 'in', frames: 30 };
    },

    // The Observation Dome, the first time: the world, close enough to see.
    *domeView(world) {
      const s = world.state;
      s.flags.domeSeen = true;
      yield { wait: 30 };
      world.camTarget = { x: 236 - HA.VIEW_W / 2, y: 0 };
      yield { wait: 60 };
      yield me('THE NEW WORLD. A PALE DOT OVER THE BOW, CLOSE ENOUGH TO SEE.');
      yield me('NO LIGHTS ON IT. NOT ONE. NOBODY GOT THERE FIRST.');
      world.camTarget = null;
      S.addStory(world, 'FROM THE OBSERVATION DOME I SAW THE NEW WORLD: A PALE DOT, DARK. NO LIGHTS ANYWHERE. NOBODY GOT THERE FIRST. THE STEWARD WAS AFRAID OF NO ONE.');
      world.save();
    },

    // The Navigator's terminal: it speaks to the hero once, and goes dark.
    *navigator(world) {
      const s = world.state;
      if (s.flags.navSpoke) {
        yield me('THE TERMINAL IS DARK. IT HAS NOTHING ELSE TO SAY TO ME.');
        return;
      }
      HA.audio.play('terminal');
      yield { wait: 40 };
      yield say('THE NAVIGATOR', 'YOU ARE STILL HERE.', NAV);
      s.flags.navSpoke = true;
      HA.audio.play('doorShut');
      yield { wait: 40 };
      yield me('IT WENT DARK. THE SHIP HAS NEVER SPOKEN TO ME BEFORE. NOT LIKE THAT.');
      S.addStory(world, "IN THE DOME, THE SHIP'S OWN TERMINAL SPOKE TO ME. 'YOU ARE STILL HERE.' THEN IT WENT DARK.");
      world.save();
    },

    // Choice 4b, the lie path: Shim came up the vents to find his mother, and asks the hero where she is.
    *shimDome(world) {
      const s = world.state;
      const shim = npcOf(world, 'shim');
      if (!shim) return;
      shim.facing = -1;
      yield { wait: 20 };
      yield say('SHIM', 'I CAME UP THE VENTS. ALL THE WAY UP. NOBODY SAW ME.');
      yield say('SHIM', 'YOU SAID SHE WAS HIDING. I LOOKED IN EVERY VENT ON THE SHIP. I CALLED AND CALLED.');
      yield say('SHIM', 'WHERE IS SHE, ' + name(world) + '? WHERE IS MY MOTHER?');
      const pick = yield {
        choice: {
          prompt: 'SHIM, WITH HIS MOTHER\'S LANTERN, ASKING.',
          options: [
            { label: 'TELL HIM THE TRUTH', confirm: { title: 'TELL SHIM THE TRUTH, NOW?', gain: 'SHIM KNOWS', lose: 'THE STORY YOU TOLD HIM' } },
            { label: 'KEEP LYING', confirm: { title: 'KEEP LYING TO SHIM?', gain: 'HE KEEPS LOOKING', lose: 'HIS TRUST, WHEN HE FINDS OUT' } },
          ],
        },
      };
      if (pick === 0) {
        s.shimKnows = true;
        s.mercy += 1;
        S.addChoice(world, 'IN THE DOME I TOLD SHIM THE TRUTH AT LAST: HIS MOTHER IS DEAD. THE BLOOM TOOK HER IN THE GARDENS. I LIED TO HIM BEFORE.');
        yield me('I TOLD HIM. ALL OF IT. THE GARDENS, THE VATS, HOW SHE FOUGHT IT. THAT I LIED.');
        yield { wait: 60 };
        yield say('SHIM', '...I KNEW. I THINK I KNEW.');
        yield say('SHIM', 'I KEPT THE LANTERN LIT ANYWAY.');
        yield say('SHIM', "I'M GOING DOWN TO GRAN.");
        yield { walk: shim, x: 2 * 8, speed: 0.7 };
        shim.state = 'gone';
        s.flags.shimWith = true;
      } else {
        s.shimKnows = false;
        s.mercy -= 1;
        S.addChoice(world, 'IN THE DOME SHIM ASKED ME WHERE HIS MOTHER WAS. I LIED TO HIM AGAIN.');
        yield me("I TOLD HIM SHE'S STILL HIDING. HIGHER UP.");
        yield say('SHIM', 'HIGHER UP. THEN I\'M COMING WITH YOU.');
        shim.follow = true;
        s.flags.shimFollow = true;
      }
      world.save();
    },

    // The Garden Gallery: the Gardener waits among her plants. Her last offer of the Thorn, then choice 11.
    *gardener(world) {
      const s = world.state;
      const p = world.player;
      const gd = npcOf(world, 'gardener');
      const shim = npcOf(world, 'shim');
      if (!gd) return;
      gd.facing = 1;
      yield { wait: 20 };
      yield say('THE GARDENER', "THE SLEEPER. I SAID I'D BE HERE.");
      if (s.bloom >= 3) {
        // a hero with the Bloom in them hears more from her
        yield say('THE GARDENER', 'YOUR VISOR HAS GONE PINK AT THE EDGES. DOES IT FEEL LIKE HOME YET? IT WILL.');
      }
      if (!s.flags.thorn && has(world, 'lancets')) {
        yield say('THE GARDENER', 'STILL CARRYING HER BLADES. LAST TIME I\'LL ASK. THE THORN GROWS. GRIEF DOESN\'T.');
        const closes = HA.bloom.closes(s, 2);
        const lose = closes ? 'THE LANCETS, AND YOURSELF' : "WICK'S LANCETS · THE BLOOM GROWS";
        const pick = yield {
          choice: {
            prompt: 'THE GARDENER HOLDS OUT A THORN.',
            options: [{ label: "KEEP WICK'S LANCETS" }, { label: 'TRADE THEM FOR THE THORN', confirm: { title: 'TRADE THE LANCETS FOR THE THORN?', gain: 'THE BLOOM THORN, A HEAVY HITTER', lose } }],
          },
        };
        s.flags.thornOffered = true;
        if (pick === 1) {
          const i = p.weapons.findIndex((w) => w.id === 'lancets');
          if (i >= 0) p.weapons.splice(i, 1);
          p.weapons.push(HA.weapons.make('thorn'));
          p.wi = p.weapons.length - 1;
          world.weaponBanner = 160;
          s.flags.thorn = true;
          S.addChoice(world, "IN HER GALLERY I GAVE WICK'S LANCETS TO THE GARDENER FOR THE BLOOM THORN.");
          world.flash('#f27ad8', 8);
          HA.bloom.add(world, 2);
          yield say('THE GARDENER', 'THERE. NOW SOMETHING OF HER GROWS WITH YOU.');
        } else {
          S.addChoice(world, "I KEPT WICK'S LANCETS. THE GARDENER DIDN'T ASK AGAIN.");
          yield say('THE GARDENER', 'HEAVY THINGS. YOU CARRY THEM, THEN.');
        }
      }
      // Still lied to, Shim hears it from her.
      if (shim && s.shimKnows === false) {
        yield say('THE GARDENER', 'AND WHO IS THIS?');
        yield say('SHIM', "I'M LOOKING FOR MY MOTHER. WICK. SHE'S HIDING.");
        yield say('THE GARDENER', '...WICK.');
        yield say('THE GARDENER', 'YOUR MOTHER ASKED VERY GOOD QUESTIONS.');
        yield say('SHIM', '...ASKED?');
        yield me("HE LOOKED AT ME. I DIDN'T SAY ANYTHING. I DIDN'T HAVE TO.");
        s.flags.shimHeard = true;
        S.addStory(world, "THE GARDENER TOLD SHIM ABOUT HIS MOTHER. 'YOUR MOTHER ASKED VERY GOOD QUESTIONS.' ASKED. HE HEARD IT. I SAID NOTHING.");
      }
      yield say('THE GARDENER', "THE STEWARD'S UP THE STAIR. I'M ONLY A GARDENER. I GREW WHAT HE ASKED FOR.");
      const pick = yield {
        choice: {
          prompt: 'THE GARDENER, AMONG HER PLANTS.',
          options: [
            { label: 'SPARE HER', confirm: { title: 'SPARE THE GARDENER?', gain: 'SHE LIVES TO SEE WHAT COMES AFTER', lose: 'NOTHING YOU CAN NAME' } },
            { label: 'MAKE HER TAKE HER OWN DOSE', confirm: { title: 'MAKE HER TAKE THE BLOOM?', gain: 'SHE GOES THE WAY WICK WENT', lose: 'SOMETHING OF YOURSELF' } },
            { label: 'WALK PAST', confirm: { title: 'WALK PAST HER?', gain: 'YOU KEEP CLIMBING', lose: 'ANY SAY IN WHAT BECOMES OF HER' } },
          ],
        },
      };
      if (pick === 0) {
        s.people.gardener = 'spared';
        s.mercy += 1;
        S.addChoice(world, 'I SPARED THE GARDENER, HESTER VALE. SHE SAID SHE WOULD BURN THE BEDS HERSELF.');
        yield say('THE GARDENER', "...I'LL BURN THE BEDS MYSELF. WHEN THIS IS OVER.");
        gd.lines = ["I'LL BURN THE BEDS MYSELF. WHEN THIS IS OVER.", 'SHE WOULD HAVE MADE A GOOD GARDENER. YOUR HEALER.'];
        gd.kneel = true;
      } else if (pick === 1) {
        s.people.gardener = 'dosed';
        s.mercy -= 2;
        S.addChoice(world, 'I MADE THE GARDENER TAKE A FULL DOSE OF HER OWN BLOOM. I DIDN\'T STAY TO WATCH.');
        yield me("I HELD OUT THE DOSE. SHE TOOK IT. SHE DIDN'T EVEN ARGUE.");
        yield say('THE GARDENER', 'IT TAKES SOME PEOPLE QUICKLY. THE KIND ONES, MOSTLY.');
        yield { walk: p, x: Math.max(4 * 8, p.x - 120), speed: 1 };
        yield { fade: 'out', frames: 30 };
        gd.state = 'gone';
        HA.audio.play('bloom');
        yield { wait: 50 };
        HA.audio.play('roar');
        yield { wait: 70 };
        yield { fade: 'in', frames: 30 };
        yield me("I DIDN'T LOOK BACK. I HEARD IT. I'LL ALWAYS HEAR IT.");
      } else {
        s.people.gardener = 'passed';
        S.addChoice(world, "I WALKED PAST THE GARDENER. I DIDN'T LOOK BACK, AND SHE DIDN'T CALL AFTER ME.");
        yield me('I WALKED PAST HER.');
        gd.lines = ['...'];
      }
      // Shim goes back down to the crew now, whatever he knows.
      if (shim) {
        if (s.shimKnows === false) yield say('SHIM', "...I'M GOING BACK TO GRAN.");
        shim.follow = false;
        yield { walk: shim, x: 70 * 8, speed: 0.8 };
        shim.state = 'gone';
        s.flags.shimFollow = false;
        s.flags.shimWith = true;
      }
      S.setLead(world, 'CLIMB THE BRIDGE STAIR TO THE HELM');
      world.save();
    },

    // Up the ladder into the Helm, the crew behind.
    *helmLadder(world) {
      const f = world.state.flags;
      if (!f.helmSeen) yield me("THE HELM'S UP THERE. SO IS HE.");
      f.helmSeen = true;
      HA.audio.play('clamp');
      yield { fade: 'out', frames: 20 };
      world.travel(world.link);
      yield { wait: 10 };
      yield { fade: 'in', frames: 20 };
    },
    // The hatch down from the Helm: not in the middle of the fight.
    *helmDown(world) {
      const b = world.boss;
      if ((b && b.fighting) || world.state.flags.scuttle) {
        yield me('NOT NOW.');
        return;
      }
      HA.audio.play('clamp');
      yield { fade: 'out', frames: 20 };
      world.travel(world.link);
      yield { wait: 10 };
      yield { fade: 'in', frames: 20 };
    },

    // The Helm: the Steward's speech, the first time; after a fall, straight back into the fight.
    *stewardIntro(world) {
      const s = world.state;
      const f = s.flags;
      const b = world.boss;
      if (!b) return;
      if (!f.stewardSeen) {
        yield { wait: 30 };
        b.facing = 1;
        yield { wait: 30 };
        yield steward('COME IN. ALL OF YOU. YOU CLIMBED A LONG WAY TO STAND IN MY ROOM.');
        // the crew come up the ladder behind the hero
        HA.audio.play('clamp');
        yield { fade: 'out', frames: 20 };
        placeCrew(world, HELM_AT, 19);
        yield { wait: 10 };
        yield { fade: 'in', frames: 20 };
        b.facing = -1;
        yield steward('WE ARE NOT LOST. WE ARE LATE. LATENESS IS FORGIVEN IF YOU ARRIVE STRONG.');
        if (f.domeSeen) yield me("I'VE SEEN THE WORLD FROM HIS DOME. THERE'S NO ONE THERE TO ARRIVE STRONG FOR.");
        yield steward('I HAVE KEPT FOUR THOUSAND SLEEPERS SAFE ON A SHIP THAT WANTS THEM DEAD.');
        yield steward('YOU HAVE KEPT A VILLAGE. TELL ME AGAIN WHO THE MONSTER IS.');
        yield { wait: 30 };
        yield steward('I WOKE UP COLD, LIKE YOU. THE FIRST THING I EVER DID ON THIS SHIP WAS TAKE A DEAD MAN\'S BOOTS.');
        yield { wait: 60 };
        const g = npcOf(world, 'gasket');
        if (g) g.facing = 1;
        yield say('OLD GASKET', '...THOSE WERE HIS BOOTS.');
        yield { wait: 50 };
        yield steward('KEY. COUNT THEM.');
        HA.audio.play('terminal');
        yield say('HELM KEY', 'COUNT: ' + (crewOf(s).length + 1 + (f.shimWith ? 1 : 0)) + '. AUTHORITY: THE STEWARD. AWAITING ORDERS.', COUNT);
        f.stewardSeen = true;
        S.addStory(world, "AT THE HELM, THE STEWARD SAID THE FIRST THING HE EVER DID ON THIS SHIP WAS TAKE A DEAD MAN'S BOOTS. GASKET SAID: THOSE WERE HIS BOOTS.");
        world.save();
      } else {
        yield { wait: 20 };
        b.facing = -1;
        yield steward('AGAIN, THEN.');
      }
      startFight(world, b);
    },

    // The Key's field fails: he doses his guard.
    *stewardGuard(world) {
      const b = world.boss;
      yield { wait: 30 };
      yield steward('...THAT KEY HAS NEVER FAILED ME.');
      yield steward('GUARD. MEASURE: FULL.');
      HA.audio.play('roar');
      HA.bosses.steward.callGuard(world, b);
      HA.music.setLayers(2);
      world.toast('HIS GUARD, DOSED', 150);
    },
    // His guard is down: he comes down off the dais himself.
    *stewardMan(world) {
      yield { wait: 30 };
      yield steward("THEN I'LL DO IT MYSELF. I ALWAYS HAVE.");
      HA.music.setLayers(3);
    },

    *stewardDefeated(world) {
      const s = world.state;
      const b = world.boss;
      s.flags.stewardDown = true;
      world.checkpoint = null;
      world.barks = world.barks.filter((k) => k.n !== b);
      HA.music.play(null);
      if (b) Object.assign(b, { broken: true, kneeling: true, active: false, vx: 0 });
      yield { wait: 60 };
      yield steward('...THE WORLD DOWN THERE.');
      yield steward('TELL ME SOMEONE GOT THERE FIRST. TELL ME I WASN\'T AFRAID OF NOTHING.');
      yield me("I DIDN'T TELL HIM ANYTHING.");
      S.addStory(world, 'I BEAT STEWARD MARRANT AT THE HELM. AN OLD MAN, ON HIS KNEES, ASKING IF ANYONE GOT TO THE WORLD FIRST.');
      world.save();
      yield* stewardChoice(world);
    },
    // A game quit before choice 12 picks it up again.
    *stewardChoice(world) {
      yield { wait: 30 };
      yield* stewardChoice(world);
    },

    // The Overgrown ending: what was left of the hero, beaten by the one who fought for them.
    *overgrownDefeated(world) {
      const s = world.state;
      const b = world.boss;
      const who = fighter(s) === 'solder' ? 'SOLDER' : 'OLD GASKET';
      HA.music.play(null);
      world.checkpoint = null;
      yield { wait: 60 };
      if (b) b.gone = true;
      world.burst(b ? b.x + b.w / 2 : 300, b ? b.y + 10 : 120, ['#f27ad8', '#b04ad0', '#5c2479', '#eef4f6'], 40, 2.4, 2);
      HA.audio.play('bloom');
      yield { wait: 60 };
      yield say(who, '...REST NOW.');
      yield say(who, 'YOU CLIMBED ALL THIS WAY. YOU DIDN\'T DESERVE THE LAST STEP.');
      const p = world.player;
      if (world.heroWeapons) p.weapons = world.heroWeapons;
      world.playAs = null;
      p.hidden = true;
      yield* HA.endings.play(world, 'overgrown');
    },
  };

  // ---- The fight ----
  function startFight(world, b) {
    b.active = true;
    b.fighting = true;
    b.timer = 60;
    world.refreshMusic();
    HA.music.setLayers(1);
    // a fall in the fight comes back here, not to the pod down the stair
    world.checkpoint = { room: 'helm', x: 16 * 8, y: 19 * 8 - world.player.h };
    world.toast("BREAK THE KEY'S RELAYS", 200);
  }

  // Choice 12: the Steward, beaten, on his knees.
  function* stewardChoice(world) {
    const s = world.state;
    const b = world.boss;
    const pick = yield {
      choice: {
        prompt: 'MARRANT, ON HIS KNEES AT THE HELM.',
        options: [
          { label: 'SPARE HIM', confirm: { title: 'SPARE THE STEWARD?', gain: 'HE LIVES TO SEE THE WORLD HE FEARED', lose: 'NOTHING YOU CAN NAME' } },
          { label: 'END HIM', confirm: { title: 'END THE STEWARD?', gain: "IT'S FINISHED", lose: 'MARRANT' } },
          { label: "LEAVE HIM TO THE WARDENS' COUNT", confirm: { title: 'LEAVE HIM TO THE WARDENS?', gain: 'THE LOCKUP KEEPS HIM', lose: 'ANY SAY IN WHAT BECOMES OF HIM' } },
        ],
      },
    };
    if (pick === 0) {
      s.people.steward = 'spared';
      s.mercy += 1;
      S.addChoice(world, 'I SPARED STEWARD MARRANT. HE WILL LIVE TO SEE THE WORLD HE WAS AFRAID OF, EMPTY.');
      yield steward('...EMPTY. ALL THIS TIME.');
      yield me('HE SAT DOWN AT THE FOOT OF HIS HELM AND DIDN\'T GET UP.');
    } else if (pick === 1) {
      s.people.steward = 'ended';
      s.mercy -= 1;
      S.addChoice(world, 'I ENDED STEWARD MARRANT AT HIS HELM.');
      yield { fade: 'out', frames: 20 };
      if (b) b.gone = true;
      HA.audio.play('kill');
      yield { wait: 50 };
      yield { fade: 'in', frames: 30 };
      yield me('NOBODY SAID ANYTHING. GASKET LOOKED AT HIS BOOTS.');
    } else {
      s.people.steward = 'counted';
      S.addChoice(world, "I LEFT STEWARD MARRANT TO THE WARDENS' COUNT. THEY TOOK HIM DOWN TO THE LOCKUP.");
      HA.audio.play('telegraph');
      yield say('THE WARDENS', 'COUNT: ONE. OLD. FOR THE LOCKUP.', COUNT);
      yield { fade: 'out', frames: 20 };
      if (b) b.gone = true;
      yield { wait: 40 };
      yield { fade: 'in', frames: 30 };
    }
    world.save();
    yield* afterSteward(world);
  }

  // ---- After the Steward: the ending branch (endings.afterSteward picks it) ----
  function* afterSteward(world) {
    const s = world.state;
    const branch = HA.endings.afterSteward(s);
    if (branch === 'overgrown') return yield* overgrownTurn(world);
    if (branch === 'dominion') {
      // the Wardens kneel to whoever holds the Key: choice 13
      yield me('THE KEY WAS STILL IN THE HELM. I TOOK IT OUT.');
      if (world.boss) world.boss.keyGone = true;
      HA.audio.play('telegraph');
      yield say('THE WARDENS', 'NEW HOLDER. AWAITING ORDERS.', COUNT);
      const pick = yield {
        choice: {
          prompt: 'THE HELM KEY, IN YOUR HAND. THE WARDENS WAIT.',
          options: [
            { label: 'CLAIM THE KEY', confirm: { title: 'CLAIM THE HELM KEY?', gain: 'THE SHIP', lose: 'EVERYONE WHO TRUSTED YOU', note: 'THE GAME ENDS HERE.' } },
            { label: 'BREAK IT', confirm: { title: 'BREAK THE HELM KEY?', gain: 'NOBODY HOLDS IT AGAIN', lose: 'THE SHIP, IN YOUR HAND' } },
          ],
        },
      };
      if (pick === 0) {
        s.flags.key = 'claimed';
        S.addChoice(world, 'I KEPT THE HELM KEY. THE WARDENS KNELT. SHIM WAS WATCHING.');
        world.save();
        return yield* HA.endings.play(world, 'dominion');
      }
      S.addChoice(world, 'THE WARDENS KNELT TO ME. I BROKE THE HELM KEY ANYWAY.');
    } else {
      yield me('THE KEY WAS STILL IN THE HELM. I TOOK IT OUT.');
      if (world.boss) world.boss.keyGone = true;
      S.addChoice(world, "I BROKE THE HELM KEY ACROSS THE STEWARD'S CONSOLE. NOBODY WILL HOLD IT AGAIN.");
    }
    yield* keyBreaks(world, branch);
  }

  // The Key breaks: the Navigator loses its hold on the Wardens, and starts to break the ship apart.
  function* keyBreaks(world, branch) {
    const s = world.state;
    s.flags.key = 'broken';
    if (world.boss) world.boss.keyGone = true;
    HA.audio.play('keybreak');
    world.flash('#b8f4ff', 12);
    world.shake(4);
    yield { wait: 60 };
    yield say('THE NAVIGATOR', 'NOT YET.', NAV);
    s.flags.scuttle = true;
    world.alarm = 1;
    HA.audio.play('rumble');
    world.shake(5);
    world.refreshMusic();
    yield { wait: 30 };
    yield say('HULL ALARM', 'HULL INTEGRITY FAILING. ALL DECKS. ALL DECKS.', NAV);
    yield { wait: 20 };
    S.addStory(world, 'WHEN THE KEY BROKE, THE SHIP SAID "NOT YET." THEN IT STARTED TO TEAR ITSELF APART.');
    if (branch === 'homecoming') return yield* liftB(world);
    yield* HA.story.scuttleRun(world);
  }

  // The true path: the freed Wardens hold the doors, and the crew mend Lift B and release its brake.
  function* liftB(world) {
    const s = world.state;
    world.wardensHold = true;
    HA.audio.play('stomp');
    yield { wait: 30 };
    yield say('THE WARDENS', 'COUNT: ALL. NONE MISSING.', COUNT);
    yield say('THE WARDENS', 'ONE COUNT REMAINS.', COUNT);
    yield say('THE WARDENS', 'WE WILL HOLD THE DOORS.', COUNT);
    yield say('SOLDER', "LIFT B. IT'S RIGHT THERE, UNDER THE PLATES. 'GOES DOWN, NOT OUT.'");
    yield say('SOLDER', "I CAN MEND IT. I CAN'T LIFT THE BRAKE ALONE.");
    yield say('OLD GASKET', 'THEN WE ALL LIFT. EVERYONE. ON THREE.');
    // the crew go to the lift, past the Wardens at the door
    world.npcs.forEach((n, i) => {
      n.homeX = (48 + i * 1.1) * 8;
      n.homeY = FLOOR(19) + 8 - n.h;
    });
    yield { wait: 90 };
    for (let i = 0; i < 3; i++) {
      HA.audio.play(i % 2 ? 'clamp' : 'stomp');
      world.shake(2);
      yield { wait: 30 };
    }
    s.flags.liftB = true;
    const sp = world.room.spawns.find((x) => x.type === 'Y');
    if (sp) world.links.push({ legend: world.def.legend.Y, tx: sp.tx, ty: sp.ty, x: sp.x - 8, y: sp.y + 8 - 22, w: 24, h: 22 });
    HA.audio.play('lift');
    yield { wait: 40 };
    yield say('SOLDER', 'THERE. SHE MOVES. DOWN, NOT OUT.');
    S.addStory(world, "THE FREED WARDENS CAME AND HELD THE DOORS. SOLDER MENDED LIFT B, AND THE CREW RELEASED ITS BRAKE TOGETHER. IT GOES DOWN, UNDER THE HELM. 'BELOW THE HELM, IT DREAMS.'");
    S.setLead(world, 'TAKE LIFT B DOWN, BELOW THE HELM');
    world.save();
  }

  // ---- Overgrown: the hero's hand closes on the Key, and the Bloom closes on the hero ----
  function* overgrownTurn(world) {
    const s = world.state;
    const p = world.player;
    const who = fighter(s) === 'solder' ? 'SOLDER' : 'OLD GASKET';
    yield me('THE KEY WAS STILL IN THE HELM. IT WAS WARM. I DIDN\'T MEAN TO PICK IT UP.');
    if (world.boss) world.boss.keyGone = true;
    yield me('THE PINK CAME UP OVER MY VISOR LIKE WATER.');
    HA.audio.play('bloom');
    world.flash('#f27ad8', 14);
    yield { fade: 'out', frames: 40 };
    s.flags.overgrown = true;
    yield { card: [['...', '#f27ad8']], hold: 60 };
    HA.audio.play('roar');
    world.shake(5);
    yield { card: ['THE CREW SAW IT HAPPEN.', 'THEY HEARD IT.'], hold: 180 };
    S.addChoice(world, 'MY HAND CLOSED ON THE HELM KEY, AND THE BLOOM CLOSED ON ME.');
    world.save();
    setupOvergrown(world);
    yield { fade: 'in', frames: 40 };
    yield say(who, '...NO. NO, NO, NO.');
    yield say(who, who === 'SOLDER' ? "SOMEBODY PICK UP THAT GUN. ...FINE. ME. IT'S ALWAYS ME." : "I'M TOO OLD FOR THIS. GIVE ME THAT GUN.");
    beginOvergrown(world);
  }

  // The fight as the one who's left: the hero's dropped weapon, full health, a checkpoint at its start.
  function setupOvergrown(world) {
    const s = world.state;
    const p = world.player;
    world.playAs = fighter(s);
    if (!world.heroWeapons) world.heroWeapons = p.weapons;
    const w = p.weapons[p.wi] || p.weapons[0];
    p.weapons = w ? [Object.assign({}, w)] : [HA.weapons.make('pistol')];
    p.wi = 0;
    p.hp = p.maxHp;
    p.hidden = false;
    p.x = 20 * 8;
    p.y = 19 * 8 - p.h;
    p.facing = 1;
    for (const n of world.npcs) if (n.id === world.playAs) n.state = 'gone';
    if (world.boss) world.boss.gone = true;
    const b = HA.bosses.overgrown.make(world, 60 * 8, 19 * 8);
    world.enemies = world.enemies.filter((e) => e !== world.boss);
    world.boss = b;
    world.enemies.push(b);
    world.checkpoint = { room: 'helm', x: 20 * 8, y: 19 * 8 - p.h };
  }
  function beginOvergrown(world) {
    const b = world.boss;
    b.active = true;
    b.fighting = true;
    b.timer = 60;
    world.refreshMusic();
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.def.area === 'tower' && !f.tower) {
        f.tower = true;
        S.addStory(world, 'THE COMMAND TOWER. THE STEWARD IS SOMEWHERE ABOVE ME.');
      }
      // The crew wait by the Tower Lift until the hero reaches the Helm.
      if (id === 'barracks' && f.towerUp && !f.stewardSeen) placeCrew(world, BARRACKS_AT, 19);
      // The Dome: the Navigator's terminal, and Shim at the glass on the lie path.
      if (id === 'observation-dome') {
        world.actors.push({ draw: drawNavTerminal });
        if (s.toldShim === 'lie' && f.shimRanOff && s.shimKnows === null) {
          const n = place(world, 'shim', 27, 19, null);
          Object.assign(n, { facing: 1, lantern: true, talkable: () => false });
        }
      }
      // The Gallery: the Gardener, until her fate is chosen (and after, if she's spared or passed by); Shim with the
      // hero if he's still being lied to.
      if (id === 'garden-gallery') {
        if (s.people.gardener !== 'dosed') {
          const n = place(world, 'gardener', 31, 19, s.people.gardener === 'spared' ? ["I'LL BURN THE BEDS MYSELF. WHEN THIS IS OVER."] : s.people.gardener === 'passed' ? ['...'] : null);
          n.kneel = s.people.gardener === 'spared';
          n.facing = 1;
          if (!s.people.gardener) n.talkable = () => false;
        }
        if (f.shimFollow) {
          const n = place(world, 'shim', 70, 19, null);
          Object.assign(n, { follow: true, lantern: true, talkable: () => false });
        }
      }
      if (id === 'helm') enterHelm(world);
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      if (world.scene || world.player.dead || world.transition || world.fade > 0.5) return;
      if (world.def.id !== 'helm') return;
      if (f.stewardDown && !s.people.steward && !f.overgrown) run(world, 'stewardChoice');
    },

    // The Dome is silent. The Helm: quiet until the fight, the Steward's organ during it, the scuttle's alarm after.
    music(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (id !== 'helm') return undefined;
      const b = world.boss;
      if (b && b.type === 'overgrown' && b.fighting) return 'overgrown';
      if (b && b.type === 'steward' && b.fighting) return 'steward';
      if (f.scuttle) return 'scuttle';
      return null;
    },
  });

  // The Helm, by how far the story has come.
  function enterHelm(world) {
    const s = world.state;
    const f = s.flags;
    if (f.overgrown && !s.ending) {
      // a fall (or a game left) in the Overgrown fight starts it again
      placeCrew(world, HELM_AT, 19);
      if (!world.playAs) world.heroWeapons = null;
      setupOvergrown(world);
      beginOvergrown(world);
      return;
    }
    if (world.bossSpawn) {
      const b = HA.bosses.steward.make(world, world.bossSpawn.x, world.bossSpawn.y);
      world.boss = b;
      world.enemies.push(b);
      if (!f.stewardSeen) b.facing = 1;
      if (f.stewardDown) {
        // the fight is over: his relays and turrets are gone with it
        for (const e of world.enemies) if (e !== b && (e.type === 'relay' || e.type === 'turret')) e.dead = true;
        b.relays.forEach((r) => (r.dead = true));
        b.phase = 3;
        b.manHp = 0;
        Object.assign(b, { broken: true, kneeling: true });
        if (s.people.steward === 'ended' || s.people.steward === 'counted') b.gone = true;
        if (f.key) b.keyGone = true;
      }
    }
    if (f.stewardSeen) placeCrew(world, HELM_AT, 19);
    if (f.scuttle) {
      world.alarm = 1;
      world.wardensHold = !!f.liftB;
    }
  }

  // The Navigator's terminal in the Dome: lit until it has spoken, dark after.
  function drawNavTerminal(g, world, a, cam) {
    const t = world.logs.find((l) => l.id === 'navigator');
    if (!t) return;
    const x = Math.round(t.x - cam.x);
    const y = Math.round(t.y - cam.y);
    const lit = !world.state.flags.navSpoke;
    g.fillStyle = '#10121c';
    g.fillRect(x - 3, y - 2, 16, 14);
    g.fillStyle = '#6a5630';
    g.fillRect(x - 2, y - 1, 14, 1);
    g.fillStyle = lit ? (Math.floor(world.time / 20) % 2 ? '#1a3a48' : '#123040') : '#0a0c14';
    g.fillRect(x - 1, y + 1, 12, 7);
    if (lit) {
      g.fillStyle = '#b8f4ff';
      g.fillRect(x + 1, y + 4, 2 + (Math.floor(world.time / 15) % 6), 1);
    }
  }

  // The freed Wardens at the Helm's west end, holding the doors (the true path).
  S.areas.push({
    enterRoom(world) {
      if (world.def.id !== 'helm') return;
      world.actors.push({
        draw(g, w, a, cam) {
          if (!w.wardensHold) return;
          const spr = HA.art.enemies.walker[0];
          for (const tx of [2.5, 5.5, 8.5]) {
            const x = Math.round(tx * 8 - cam.x);
            const y = Math.round(19 * 8 - spr.h - cam.y);
            g.save();
            g.translate(x, y);
            g.scale(-1, 1);
            g.drawImage(spr.img, -Math.floor(spr.w / 2), 0);
            g.restore();
            g.fillStyle = '#5fd4e8';
            g.fillRect(x - 2, y + 4, 3, 1);
          }
        },
      });
    },
  });

  S.towerCrew = crewOf;
  Object.assign(S.SCENES, SCENES);
})(window.HA);
