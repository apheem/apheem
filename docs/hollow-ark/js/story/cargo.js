'use strict';
// The Cargo Labyrinth's story (Phase 3.3): Solder's chalk, the deserter and his pack (choice 6), Chief Engineer
// Odell in the Cold Store, the Purser's boat (choice 7, the Deserter ending), the Tallyman (choice 8), and
// Solder's toolbag at the Drain. Back home, the deserter turns out to be Flux, Shim's father. All text is
// original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const FLOOR = (ty) => ty * 8;
  const VOICE = S.VOICE;
  const COUNT = '#ff8a8a'; // a Warden, counting
  const FREED = '#b8f4ff'; // a Warden, freed
  const NAV = '#b8f4ff';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const TALLY = 'FIND THE TALLYMAN AT THE TOP OF THE SORTING FLOOR';

  Object.assign(S.LOGS, {
    charter: {
      title: 'COLONY CHARTER · ARTICLE 9',
      text: 'ON ARRIVAL, ALL SHIP SYSTEMS WILL BE RETIRED WITH THANKS AND BROKEN DOWN FOR THE FIRST CITY.',
    },
    armory: {
      title: 'ARMORY · YEAR 300',
      text: "HARPOON ISSUED FOR HULL REPAIR. RETURNED. STEWARD ORDERS IT KEPT FOR 'COLLECTION WORK'.",
    },
    liftB: {
      title: 'MAINTENANCE · YEAR 97',
      text: 'BRIDGE LIFT B SEALED BY ORDER OF THE NAVIGATOR.',
    },
    lists: {
      title: "THE STEWARD'S LISTS · YEARS 305-311",
      text: 'COLLECTED FROM THE WALLS. TO THE GARDENS: SORREL, TOLLER, MAVE, AND NINE MORE. TO THE GUARD, DOSED: BRAND, OWEN, FLUX.',
    },
  });

  Object.assign(S.PEOPLE, {
    purser: { name: 'THE PURSER', sprite: 'purser', away: true },
    flux: { name: 'THE DESERTER', sprite: 'flux', away: true },
  });

  // The Purser always talks business (see the talk hook). Flux has his own lines: the deserter's, left sitting
  // by the dock, and his own once he's home.
  Object.assign(S.TALK, { purser: {}, flux: {} });
  const FLUX_SITTING = ['...', "IT DOESN'T STOP."];
  const FLUX_HOME = ["SHIM TALKS ABOUT YOU LIKE YOU'RE A STORY.", "IT'S QUIETER HERE. I CAN NEARLY HEAR MYSELF."];

  // ---- People and things that only appear in scenes ----
  // The deserter's flight home: up off the deck on the Bloomfire pack, and away west in a pink trail.
  function flight(world, n) {
    const a = { kind: 'flight', x: n.x, y: n.y, vx: 0, vy: 0, t: 0, spr: n.sprite };
    a.update = (w, self) => {
      self.t++;
      self.vy = Math.max(self.vy - 0.12, -2.2);
      self.vx = self.t > 30 ? Math.max(self.vx - 0.08, -2.4) : 0;
      self.x += self.vx;
      self.y += self.vy;
      if (w.time % 2 === 0) w.particles.push({ x: self.x + 6, y: self.y + 12, vx: HA.rand(-0.3, 0.3), vy: 1.2, life: 16, max: 16, color: w.time % 4 ? '#ff6fae' : '#ffc2dc', size: 1, grav: 0 });
      if (self.y < -40 || self.x < -40) w.actors = w.actors.filter((x) => x !== self);
    };
    a.draw = (g, w, self, cam) => {
      g.save();
      g.translate(Math.round(self.x + 4 - cam.x), Math.round(self.y - cam.y));
      g.scale(-1, 1);
      g.drawImage(self.spr.idle.img, -Math.floor(self.spr.idle.w / 2), 0);
      drawPack(g, 2, 6, true);
      g.restore();
    };
    world.actors.push(a);
    return a;
  }

  // A thruster pack on someone's back: the Steward's pink Bloomfire, or Odell's old crew issue.
  function drawPack(g, x, y, bloomfire) {
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 4, 7);
    g.fillStyle = bloomfire ? '#4a4060' : '#6c7894';
    g.fillRect(x + 1, y + 1, 2, 5);
    g.fillStyle = bloomfire ? '#f27ad8' : '#ffb84d';
    g.fillRect(x + 1, y + 6, 2, 1);
  }

  // ---- The scenes ----
  const SCENES = {
    // The notes stop at the Sorting Floor.
    *chalkStops(world) {
      world.state.flags.chalkStops = true;
      yield { wait: 20 };
      yield me("THE CHALK STOPS HERE. SHE'D NEVER STOP WITHOUT A REASON.");
      S.setLead(world, "SOLDER'S CHALK STOPS HERE. FIND OUT WHERE SHE WENT");
      S.addStory(world, "SOLDER'S CHALK RUNS OUT ON THE SORTING FLOOR. HER LAST NOTE CALLED ME SLOW.");
      world.save();
    },

    // Choice 6: a Bloomsworn man by the Lifeboat Dock, shaking, on his way home before the next dose.
    *deserter(world) {
      const s = world.state;
      const flux = npcOf(world, 'flux');
      const purser = npcOf(world, 'purser');
      if (!flux) return;
      s.flags.deserterMet = true;
      flux.facing = 1;
      flux.alert = 40;
      yield { wait: 30 };
      yield say('THE DESERTER', "DON'T. I'M NOT ONE OF THEM. NOT ANYMORE.");
      yield me("A BLOOMSWORN. HE'S SHAKING.");
      yield say('THE DESERTER', "IT DOESN'T STOP. IT JUST GETS QUIETER.");
      yield say('THE DESERTER', "I'M GOING HOME. BEFORE THE NEXT DOSE. BEFORE I FORGET WHERE IT IS.");
      yield say('THE DESERTER', "THE PACK'S THE STEWARD'S. BLOOMFIRE. IT'LL GET ME THERE THE LONG WAY: THROUGH THE ICE AT THE COLD STORE, AND UP ITS OLD LIFT.");
      yield say('THE DESERTER', "THERE'S A DEAD MAN IN THERE WITH A PACK ON HIS BACK. CREW ISSUE. I COULDN'T GET IT OFF HIM. MY HANDS...");
      yield me("HE'S HOLDING ONE HAND WITH THE OTHER, TO KEEP IT STILL.");
      if (purser) purser.facing = -1;
      yield say('THE PURSER', "TAKE IT OFF HIM, SLEEPER. HE'LL BE COLLECTED BY MORNING. THAT ISN'T A THREAT. IT'S A SCHEDULE.");
      const closes = HA.bloom.closes(s, 1);
      const pick = yield {
        choice: {
          prompt: "THE DESERTER'S PACK",
          options: [
            { label: 'LET HIM FLY HOME', confirm: { title: 'LET HIM FLY HOME?', gain: "ODELL'S PACK, THE LONG WAY ROUND", lose: 'THE BLOOMFIRE PACK, AND TIME' } },
            { label: 'TAKE HIS PACK', confirm: { title: "STRIP THE DESERTER'S PACK?", gain: 'THE BLOOMFIRE PACK, NOW', lose: closes ? 'HIS WAY HOME, AND YOURSELF' : 'HIS WAY HOME · THE BLOOM GROWS' } },
          ],
        },
      };
      // What happened is recorded at once; the rest only plays it out.
      if (pick === 0) {
        s.people.flux = 'home';
        s.mercy += 1;
        s.flags.coldOpen = true;
        s.lead = "FIND THE DEAD MAN'S PACK IN THE COLD STORE";
        S.addChoice(world, 'I LET THE DESERTER FLY HOME ON HIS BLOOMFIRE PACK, THE LONG WAY ROUND, BY THE COLD STORE.');
        yield say('THE DESERTER', '...');
        yield say('THE DESERTER', 'THANK YOU.');
        flux.state = 'gone';
        flight(world, flux);
        HA.audio.play('charge');
        world.shake(1.5);
        yield { wait: 90 };
        yield say('THE PURSER', "SENTIMENT. IT'S A LONG WALK TO THE COLD STORE, SLEEPER.");
      } else {
        s.people.flux = 'stripped';
        s.mercy -= 1;
        s.abilities.thruster = 'bloomfire';
        s.lead = TALLY;
        S.addChoice(world, "I TOOK THE DESERTER'S BLOOMFIRE PACK. HE DIDN'T FIGHT ME. HE SAT DOWN WHERE HE WAS.");
        HA.audio.play('salvage');
        world.flash('#f27ad8', 6);
        flux.pack = false;
        flux.kneel = true;
        flux.lines = FLUX_SITTING;
        HA.bloom.add(world, 1);
        world.toast('BLOOMFIRE PACK · IN THE AIR, {jump} AGAIN AND HOLD', 300);
        yield { wait: 50 };
        yield say('THE DESERTER', "...IT DOESN'T STOP.");
        yield say('THE PURSER', 'SENSIBLE.');
      }
      // The Purser knows where Solder went: past the Tallyman, which counts everything.
      yield say('THE PURSER', 'YOUR TINKER CAME THROUGH LAST NIGHT. THE TALLYMAN WILL HAVE COUNTED HER. IT COUNTS EVERYTHING.');
      yield say('THE PURSER', 'ITS YARD IS AT THE TOP OF THE SORTING FLOOR. AND WHEN YOU WANT A WORD ABOUT THIS BOAT, I AM RIGHT HERE.');
      S.setLead(world, s.lead);
      world.save();
    },

    // Choice 7: the Purser's offer, by the last boat with a pilot's seat. It stands until the climb.
    *purser(world) {
      const s = world.state;
      const first = !s.flags.deserterOffered;
      s.flags.deserterOffered = true;
      if (first) {
        yield say('THE PURSER', 'THE STEWARD WANTS YOU GONE. I WANT A QUIET LIFE. THE BOAT WANTS A PILOT. EVERYONE WINS.');
        yield say('THE PURSER', 'LB-7. SHORT RANGE. ENOUGH TO PUT ONE PILOT DOWN ON THAT WORLD OUT THERE. NO ONE ON THIS SHIP CAN FLY IT.');
        yield me("I CAN. I FLEW LANDERS. IT'S WHAT I WAS PACKED TO DO.");
      } else yield say('THE PURSER', 'CHANGED YOUR MIND? THE BOAT HASN\'T.');
      const pick = yield {
        choice: {
          prompt: 'THE BOAT WANTS A PILOT.',
          options: [{ label: 'STAY' }, { label: 'TAKE THE BOAT', confirm: { title: 'TAKE THE BOAT AND GO?', gain: 'YOU LIVE', lose: 'EVERYONE ELSE, AND MARA', note: 'THE GAME ENDS HERE.' } }],
        },
      };
      if (pick === 0) {
        yield say('THE PURSER', "THE OFFER STANDS. I'LL BE HERE UNTIL THEY START THEIR CLIMB.");
        if (first) S.addStory(world, 'THE PURSER OFFERED ME THE LAST LIFEBOAT, AND THE NEW WORLD, ALONE. I SAID NO.');
        world.save();
        return;
      }
      yield* leave(world);
    },

    // Odell, at the terminal where he came to make his complaint in person, in year 41. His pack goes to a hero
    // who has none, whenever they come (even back after a game quit partway through).
    *odell(world) {
      const s = world.state;
      const first = !s.flags.odell;
      s.flags.odell = true;
      if (first) {
        HA.audio.play('terminal');
        yield say('TERMINAL', 'TO: THE NAVIGATOR. FROM: CHIEF ENGINEER ODELL. I AM STANDING IN FRONT OF YOU. ANSWER ME.', NAV);
        yield say('TERMINAL', 'NO REPLY.', NAV);
        yield me("CHIEF ENGINEER ODELL. HE CAME DOWN HERE TO COMPLAIN IN PERSON, 270 YEARS AGO. HE'S STILL WAITING.");
      } else if (s.abilities.thruster) {
        yield me('ODELL. STILL WAITING FOR HIS ANSWER.');
        return;
      }
      if (!s.abilities.thruster) {
        yield me('HIS PACK IS STILL ON HIS BACK. THE STRAPS ARE FROZEN, BUT THEY GIVE.');
        s.abilities.thruster = 'odell';
        s.flags.odellPack = true;
        HA.audio.play('pickup');
        world.burst(6 * 8 + 4, 10 * 8, ['#ffb84d', '#fff0a8', '#d8f4ff'], 18, 1.6);
        world.toast("ODELL'S PACK · IN THE AIR, {jump} AGAIN AND HOLD", 300);
        S.addStory(world, "I FOUND CHIEF ENGINEER ODELL IN THE COLD STORE, FROZEN AT A DEAD TERMINAL. HE CAME TO COMPLAIN IN PERSON, IN YEAR 41. I TOOK HIS PACK. I DON'T THINK HE'D MIND.");
        S.setLead(world, TALLY);
      } else if (first) {
        yield me("HIS PACK IS STILL ON HIS BACK. I'LL LEAVE IT WITH HIM.");
        S.addStory(world, 'I FOUND CHIEF ENGINEER ODELL IN THE COLD STORE, FROZEN AT A DEAD TERMINAL. HE CAME TO COMPLAIN IN PERSON, IN YEAR 41. NO ONE EVER ANSWERED.');
      }
      world.save();
    },

    // The Cold Store's lift and the Coolant Hall: it only answers once it has been called from below.
    *coldLift(world) {
      const s = world.state;
      const up = world.def.id === 'cold-store';
      if (!up && !s.flags.coldLift) {
        HA.audio.play('terminal');
        yield say('COLD STORE LIFT', 'CALL IT FROM BELOW.', '#c9d6e8');
        return;
      }
      const first = up && !s.flags.coldLift;
      s.flags.coldLift = true;
      HA.audio.play('lift');
      yield { fade: 'out', frames: 30 };
      yield { wait: 40 };
      world.travel(world.link);
      yield { fade: 'in', frames: 30 };
      if (first) world.toast('THE COLD LIFT RUNS BOTH WAYS NOW · A WAY HOME', 200);
    },

    // The Drain: Solder's toolbag, by the grate she levered up.
    *toolbag(world) {
      const s = world.state;
      if (s.flags.toolbag) {
        yield me('THE GRATE GOES DOWN TO THE BALLAST.');
        return;
      }
      s.flags.toolbag = true;
      yield me("SOLDER'S TOOLBAG. SHE'D NEVER LEAVE IT BEHIND.");
      yield me("THE GRATE'S BEEN LEVERED UP. SHE WENT DOWN, TO THE BALLAST. I'LL CARRY IT DOWN TO HER.");
      HA.audio.play('pickup');
      S.addStory(world, "SOLDER'S TOOLBAG WAS AT THE DRAIN, BY A GRATE LEVERED UP. SHE WENT DOWN INTO THE FLOODED BALLAST. I HAVE HER BAG.");
      S.setLead(world, 'FOLLOW SOLDER DOWN THE DRAIN, TO THE BALLAST');
      world.save();
    },

    // Home, on the merciful path: the deserter by the fire, with Shim asleep on his knee.
    *fluxHome(world) {
      const s = world.state;
      const p = world.player;
      const flux = npcOf(world, 'flux');
      const shim = npcOf(world, 'shim');
      const gasket = npcOf(world, 'gasket');
      s.flags.fluxHome = true;
      if (!flux) return;
      world.camTarget = { x: flux.x + 4, y: FLOOR(19) - 30 };
      yield { wait: 50 };
      yield me('THE DESERTER. BY THE FIRE.');
      if (shim) yield me("SHIM'S ASLEEP ON HIS KNEE.");
      if (gasket) gasket.facing = Math.sign(p.x - gasket.x) || 1;
      yield say('OLD GASKET', 'HE CAME IN THROUGH THE COOLANT HALL, PINK TO THE ELBOWS, ASKING FOR HIS BOY.');
      yield say('OLD GASKET', "THAT'S FLUX. SHIM'S FATHER. HE WENT UP THE SHAFTS YEARS AGO, AND WE STOPPED SAYING HIS NAME.");
      flux.name = 'FLUX';
      yield say('FLUX', 'YOU LET ME GO.');
      yield say('FLUX', "IT'S QUIETER HERE. WHEN HE'S ASLEEP ON ME, I CAN'T HEAR IT AT ALL.");
      world.camTarget = null;
      S.addStory(world, "THE DESERTER WAS FLUX, SHIM'S FATHER. HE MADE IT HOME. SHIM FELL ASLEEP ON HIS KNEE.");
      world.save();
    },

    // Home, on the other path, with the page from the Purser's wall: Gasket reads it out.
    *fluxNamed(world) {
      const s = world.state;
      const gasket = npcOf(world, 'gasket');
      s.flags.fluxNamed = true;
      if (gasket) gasket.facing = Math.sign(world.player.x - gasket.x) || 1;
      yield { wait: 20 };
      yield say('OLD GASKET', "WHAT'S THAT, SLEEPER? THE STEWARD'S LISTS?");
      yield say('OLD GASKET', 'SORREL. TOLLER. MAVE.');
      yield { wait: 40 };
      yield say('OLD GASKET', 'TO THE GUARD, DOSED: FLUX.');
      yield say('OLD GASKET', "THAT WAS SHIM'S FATHER. HE WENT UP THE SHAFTS. WE TOLD SHIM HE WAS LOST.");
      yield me('THE DESERTER. HE SAID HE WAS GOING HOME.');
      yield { wait: 40 };
      S.addStory(world, "GASKET READ THE STEWARD'S LISTS. FLUX, SHIM'S FATHER, WAS DOSED FOR THE GUARD. HE WAS THE DESERTER. I TOOK HIS WAY HOME.");
      world.save();
    },
  };

  // ---- The Tallyman ----
  Object.assign(SCENES, {
    *tallyIntro(world) {
      const s = world.state;
      const boss = world.boss;
      if (!boss) return;
      yield { wait: 10 };
      boss.active = true; // the door shuts behind the hero
      world.refreshMusic();
      yield { wait: 30 };
      if (!s.flags.tallySeen) {
        s.flags.tallySeen = true;
        yield say('THE TALLYMAN', 'COUNT: ONE. UNLISTED.', COUNT);
        yield say('THE TALLYMAN', 'ALL STOCK IS COUNTED. ALL STOCK IS LISTED. YOU ARE NOT LISTED.', COUNT);
        yield say('THE TALLYMAN', 'CORRECTING.', COUNT);
      } else yield say('THE TALLYMAN', 'RECOUNT.', COUNT);
      boss.fighting = true;
      world.refreshMusic();
    },

    *tallymanDefeated(world) {
      const boss = world.boss;
      world.state.flags.tallyDown = true;
      world.save();
      HA.music.play(null);
      for (let i = 0; i < 6; i++) {
        world.burst(boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, ['#ffd84d', '#fff0a8', '#e8434f', '#ffffff'], 12, 2.2);
        HA.audio.play('boom');
        world.shake(3);
        yield { wait: 14 };
      }
      boss.broken = true;
      boss.active = false;
      yield { wait: 60 };
      yield* tallyFate(world);
    },
    *tallymanChoice(world) {
      yield { wait: 30 };
      yield* tallyFate(world);
    },
  });

  // Choice 8: it asks to finish its count. Its core is the Vault's lock either way.
  function* tallyFate(world) {
    const s = world.state;
    const p = world.player;
    const boss = world.boss;
    if (!boss) return;
    world.camTarget = { x: (p.x + boss.x + boss.w / 2) / 2, y: 12 * 8 };
    yield say('THE TALLYMAN', 'THE COUNT IS NOT FINISHED.', '#9fb6c8');
    yield say('THE TALLYMAN', 'THREE HUNDRED YEARS, AND THE COUNT IS NOT FINISHED. LET ME FINISH IT.', '#9fb6c8');
    const pick = yield {
      choice: {
        prompt: "THE TALLYMAN'S CORE IS STILL LIT.",
        options: [
          { label: 'LET IT FINISH ITS COUNT', confirm: { title: 'LET THE TALLYMAN FINISH ITS COUNT?', gain: 'WHAT IT KNOWS · THE VAULT OPENS', lose: 'ITS CORE: THE CHARGES HOLD 3, NOT 5' } },
          { label: 'TAKE ITS CORE', confirm: { title: "TAKE THE TALLYMAN'S CORE?", gain: 'THE VAULT · THE CHARGES HOLD 5', lose: 'WHAT IT KNOWS, FOR GOOD' } },
        ],
      },
    };
    // The choice is recorded at once; what follows only plays it out.
    s.wardens.tallyman = pick === 0 ? 'release' : 'salvage';
    s.mercy += pick === 0 ? 2 : -2;
    s.lead = 'TAKE THE BREACH CHARGES FROM THE VAULT';
    S.addChoice(world, pick === 0 ? 'I LET THE TALLYMAN FINISH ITS COUNT. IT COUNTED THE HULLFOLK BY NAME, AND TOLD ME SOLDER IS IN THE BALLAST.' : "I TOOK THE TALLYMAN'S CORE. IT OPENED THE VAULT. ITS LAST COUNT BROKE OFF HALFWAY THROUGH WHERE SOLDER WENT.");
    if (pick === 0) {
      HA.audio.play('unlock');
      world.burst(boss.x + boss.w / 2, boss.y + 10, ['#b8f4ff', '#5fd4e8', '#ffffff'], 18, 1.6);
      boss.freed = true;
      yield { wait: 50 };
      yield say('THE TALLYMAN', 'COUNT: HULLFOLK. BY NAME.', FREED);
      yield say('THE TALLYMAN', 'GASKET. TAMP. BRINE. SHIM. SOLDER. SORREL, NOT FOUND.', FREED);
      yield say('THE TALLYMAN', 'I HAD THEM LISTED AS STOCK. THEY ARE NOT STOCK.', FREED);
      yield say('THE TALLYMAN', 'ITEM: ONE TINKERER. LOCATION: BALLAST. CONDITION: NOT RECORDED.', FREED);
      yield { wait: 30 };
      yield say('THE TALLYMAN', 'THERE IS A COUNT WE DO NOT MAKE.', FREED);
      S.addStory(world, 'THE TALLYMAN SAID THERE IS A COUNT THE WARDENS DO NOT MAKE. IT WOULD NOT SAY WHAT.');
    } else {
      HA.audio.play('salvage');
      world.flash('#ffffff', 6);
      world.shake(4);
      world.burst(boss.x + boss.w / 2, boss.y + 14, ['#ffd84d', '#ffb84d', '#ffffff'], 24, 2.2);
      yield { wait: 30 };
      yield say('THE TALLYMAN', 'ITEM: ONE TINKERER. LOCATION: BAL—', '#6c7894');
      boss.cored = true;
      yield { wait: 60 };
      world.toast("THE TALLYMAN'S CORE · THE VAULT'S LOCK OPENS", 220);
    }
    HA.audio.play('blast');
    world.camTarget = null;
    S.setLead(world, s.lead);
    world.refreshMusic();
    world.save();
  }

  // Travel between rest pods (it arrives with the Labyrinth): the suit seals, the ship's old pod lines carry it,
  // and it opens again at the other pod, rested.
  SCENES.travel = function* (world) {
    const s = world.state;
    const p = world.player;
    const to = world.travelPod;
    HA.audio.play('rest');
    yield { fade: 'out', frames: 30 };
    yield { wait: 20 };
    world.enterRoom(to.room, to.rx, to.ry, { noSave: true, facing: p.facing });
    world.holdFade = true;
    p.hp = p.maxHp;
    for (const w of p.weapons) if (w.id === 'charges') w.ammo = HA.weapons.chargesMax(s);
    s.rest = { room: to.room, x: to.rx, y: to.ry };
    world.save();
    yield { wait: 20 };
    yield { fade: 'in', frames: 30 };
    world.toast('TRAVELLED · ' + world.def.name, 150);
  };
  S.travel = (world, pod) => {
    world.travelPod = pod;
    run(world, 'travel');
  };

  // Taking the boat: the Purser's goodbye, the boat's hatch, and the Deserter ending.
  function* leave(world) {
    const s = world.state;
    const p = world.player;
    yield say('THE PURSER', 'PLEASURE DOING BUSINESS.');
    S.addChoice(world, 'I TOOK THE LAST LIFEBOAT AND LEFT THE ARK.');
    yield { walk: p, x: 32 * 8, speed: 1 };
    p.hidden = true;
    HA.audio.play('doorShut');
    yield { wait: 50 };
    HA.audio.play('rumble');
    world.shake(4);
    yield { wait: 40 };
    HA.audio.play('lift');
    world.shake(6);
    yield* HA.endings.play(world, 'deserter');
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // The first steps into the Labyrinth. It's easy to get lost in, so the map's markers are pointed out.
      if (world.def.area === 'cargo' && !f.cargo) {
        f.cargo = true;
        S.addStory(world, "UNDER THE SUMP, THE OLD CREW'S STORES: CONTAINERS STACKED TO THE CEILING, AND SOLDER'S CHALK ON THEM.");
        world.toast('EASY TO GET LOST IN HERE · {map} TO MARK THE MAP', 260);
      }
      if (id === 'lifeboat-dock') {
        const flux = npcOf(world, 'flux');
        if (flux) flux.pack = true;
      }
      // The Tallyman on its rail, fighting, waiting on its fate, or done.
      if (id === 'tally-yard' && world.bossSpawn) {
        const T = HA.bosses.tallyman;
        const place = () => {
          world.boss = T.make(world, world.bossSpawn.x);
          world.enemies.push(world.boss);
          return world.boss;
        };
        if (!f.tallyDown) place();
        else if (!s.wardens.tallyman) {
          place().broken = true;
          run(world, 'tallymanChoice');
        } else Object.assign(place(), { broken: true, freed: s.wardens.tallyman === 'release', cored: s.wardens.tallyman === 'salvage' });
      }
      // Home: Flux at the fire, if he made it.
      if (id === 'warrens' && s.people.flux === 'home') {
        const flux = S.makeNpc(world, 'flux', { x: 45 * 8, y: FLOOR(18) });
        Object.assign(flux, { name: 'FLUX', kneel: true, facing: -1, lines: FLUX_HOME });
        world.npcs.push(flux);
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      if (world.def.id !== 'warrens' || world.scene || world.player.dead || world.transition || world.fade > 0.5) return;
      if (s.people.flux === 'home' && !f.fluxHome) run(world, 'fluxHome');
      else if (s.people.flux === 'stripped' && s.logs.lists && !f.fluxNamed) run(world, 'fluxNamed');
    },

    // The Purser always talks business; the deserter, until choice 6 is made, is the choice.
    talk(world, npc) {
      if (npc.id === 'purser') return 'purser';
      if (npc.id === 'flux' && !world.state.people.flux && world.def.id === 'lifeboat-dock') return 'deserter';
      return null;
    },

    // The Tallyman has its own track while it fights, and the yard is silent while its door is shut on the hero.
    music(world) {
      const b = world.boss;
      if (world.def.id === 'tally-yard' && b && !world.state.wardens.tallyman) return b.fighting ? 'tallyman' : b.active || b.broken ? null : undefined;
      return undefined;
    },
  });

  // The two new weapons each leave a line in the journal, and the Breach Charges point the way on.
  const onWeapon = S.onWeapon;
  S.onWeapon = (world, id) => {
    onWeapon(world, id);
    if (id === 'harpoon') S.addStory(world, "THE HULL CREWS' GRAPPLE HARPOON WAS ON THE STEWARD'S ARMORY RACK. IT BITES A RING AND PULLS ME UP TO IT.");
    if (id === 'charges') {
      S.addStory(world, 'THE VAULT HELD BREACH CHARGES. ONE WILL OPEN A CRACKED WALL.');
      S.setLead(world, 'BLOW OPEN THE CRACKED WALL BELOW THE SORTING FLOOR');
    }
  };

  S.drawPack = drawPack;
  Object.assign(S.SCENES, SCENES);
})(window.HA);
