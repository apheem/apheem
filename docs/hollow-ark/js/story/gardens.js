'use strict';
// The Hydroponic Gardens' story (Phase 3.1): Wick walks in with the hero, the taken sleep in the cradles, the
// Pruner holds the seals (choice 2), the taken wake and go home, and Wick is lost in the Vat House. The Gardener
// offers the Bloom Thorn for her lancets (choice 3). All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const FLOOR = (ty) => ty * 8;
  const VOICE = S.VOICE;
  const COUNT = '#ff8a8a'; // a Warden, counting
  const FREED = '#b8f4ff'; // a Warden, freed
  const STEWARD = '#c9d6e8';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });

  Object.assign(S.LOGS, {
    blight: {
      title: 'HYDROPONICS LOG · YEAR 151',
      text: 'THE NEW STRAIN GROWS IN THE DARK. IT GREW ON 0391 FIRST. REQUEST TO PURGE BAY 4 DENIED BY THE NAVIGATOR: "NOT YET."',
    },
    clean: {
      title: 'NOTICE · NAVIGATION DECK',
      text: 'NAVIGATION DECK ACCESS: CLEAN PERSONNEL ONLY. BLOOM CARRIERS WILL BE REFUSED.',
    },
    seeds: {
      title: 'SEED VAULT · YEAR 0',
      text: 'SEALED FOR ARRIVAL: TWELVE THOUSAND KINDS OF SEED, AND THE SOIL TO START THEM. TO BE OPENED UNDER A REAL SKY.',
    },
  });

  // Wick at the cradles, keeping the taken breathing while the hero goes up.
  S.TALK.wick.cellar = [
    ["I'M TALKING TO THEM. GASKET SAYS THE SLEEPING CAN HEAR.", "WHO'S WAITING ON YOU, SLEEPER? EVERYBODY'S GOT SOMEBODY.", { me: "SOMEONE WHO'S STILL ASLEEP." }, "THEN WE'RE IN THE SAME LINE OF WORK.", 'GO ON, SLEEPER. THE SEALS.'],
    ["MOONWORT TEA FOR WHEN THEY WAKE. IF THEY WAKE. WHEN THEY WAKE.", "I'M NOT GOING ANYWHERE."],
  ];

  // ---- People who only appear in scenes ----
  function wokenActor(world, i, x) {
    const spr = HA.art.people['woken' + (1 + (i % 4))];
    const a = { kind: 'woken', name: 'A WOKEN VILLAGER', x, y: FLOOR(19) - spr.h, w: 8, h: spr.h, facing: i % 2 ? -1 : 1, walking: false, t: i * 17, spr, speed: 0.6 + (i % 3) * 0.15 };
    a.update = (w, self) => {
      self.t++;
      if (self.goX === undefined) return;
      const d = self.goX - self.x;
      self.walking = Math.abs(d) > 0.5;
      if (self.walking) {
        self.facing = Math.sign(d);
        self.x += HA.clamp(d, -self.speed, self.speed);
      }
    };
    a.draw = (g, w, self, cam) => {
      if (self.x > w.room.pw + 8) return;
      let f = self.spr.idle;
      if (self.walking) f = Math.floor(self.t / 8) % 2 ? self.spr.walk : self.spr.idle;
      else if (self.kneel) f = self.spr.kneel;
      g.save();
      g.translate(Math.round(self.x + 4 - cam.x), Math.round(self.y - cam.y + (self.kneel ? self.spr.h - f.h + 1 : 0)));
      g.scale(self.facing, 1);
      g.drawImage(f.img, -Math.floor(f.w / 2), 0);
      g.restore();
      // the cold: they shiver for a while after waking
      if (!self.walking && Math.floor((w.time + self.t) / 6) % 9 === 0) {
        g.fillStyle = '#d8f4ff';
        g.fillRect(Math.round(self.x + 4 - cam.x), Math.round(self.y - cam.y) - 2, 1, 1);
      }
    };
    world.actors.push(a);
    return a;
  }

  function lanternActor(world, x) {
    const a = { kind: 'lantern', x, y: FLOOR(19) - 8 };
    a.draw = (g, w, self, cam) => {
      const x0 = Math.round(self.x - cam.x);
      const y0 = Math.round(self.y - cam.y);
      const glow = g.createRadialGradient(x0 + 3, y0 + 4, 0, x0 + 3, y0 + 4, 26);
      glow.addColorStop(0, 'rgba(255,184,77,0.3)');
      glow.addColorStop(1, 'rgba(255,184,77,0)');
      g.fillStyle = glow;
      g.fillRect(x0 - 24, y0 - 22, 54, 54);
      g.save();
      g.translate(x0 + 4, y0 + 4);
      g.rotate(Math.PI / 2); // on its side, where she dropped it
      g.drawImage(HA.art.items.lantern.img, -4, -4);
      g.restore();
    };
    world.actors.push(a);
    return a;
  }

  // Wick, walking with the hero from the Bailiff's Hall to the cradles, and then up as far as the Irrigation Works.
  function spawnCompanion(world) {
    const p = world.player;
    let wick = npcOf(world, 'wick');
    if (!wick) {
      wick = S.makeNpc(world, 'wick', { x: HA.clamp(p.x - p.facing * 14, -12, world.room.pw - 4), y: FLOOR(18) });
      world.npcs.push(wick);
      // Into a room after the cradles, she comes in on the hero's floor, wherever that is.
      if (world.state.flags.cradlesSeen) wick.y = wick.homeY = p.y + p.h - wick.h;
    }
    wick.follow = true;
    wick.kneel = false;
    return wick;
  }
  // The rooms Wick walks up through with the hero after the cradles (STORYBOARD.md, "Wick's longer escort").
  const UP = new Set(['root-cellar', 'garden-lift', 'terraces', 'irrigation']);
  const goingUp = (f) => f.wickUp && !f.wickPatched;

  // ---- The scenes ----
  const SCENES = {
    // The morning after the reunion, in the Bailiff's Hall.
    *wickJoins(world) {
      const s = world.state;
      const wick = npcOf(world, 'wick');
      if (!wick) return;
      wick.facing = -1;
      const release = s.wardens.bailiff === 'release';
      yield say('WICK', release ? "THERE YOU ARE. SHIM WAS STILL ASLEEP WHEN I LEFT. GOOD." : "THERE YOU ARE. LET'S GO, BEFORE I CHANGE MY MIND.");
      yield say('WICK', 'STAY CLOSE, SLEEPER. I KNOW THE WAY.');
      wick.follow = true;
      s.flags.wickWith = true;
    },

    // 1. Into the green: Wick names the plants as they walk in. Play goes on while she talks.
    *intoGreen(world) {
      const s = world.state;
      s.flags.gardens = true;
      const wick = npcOf(world, 'wick');
      if (wick) S.bark(world, wick, 'SMELL THAT? THAT IS THINGS GROWING.');
      S.think(world, 'DIRT. REAL DIRT.', 140);
      S.addStory(world, "THE GARDENS ARE WARM. I HADN'T NOTICED HOW COLD I'D BEEN. THERE'S REAL DIRT UP HERE, AND THINGS GROWING IN IT.");
      world.save();
    },
    *wickBeans(world) {
      const wick = npcOf(world, 'wick');
      if (!wick || !wick.follow) return;
      S.bark(world, wick, 'MOONWORT, THERE. GOOD FOR FEVERS.');
      S.bark(world, wick, 'AND BEANS. NOBODY DOWN HERE HAS EATEN A BEAN IN A HUNDRED YEARS.');
      S.think(world, 'SOMETHING THAT GREW IN DIRT...', 300);
    },
    *wickStory(world) {
      const wick = npcOf(world, 'wick');
      if (!wick || !wick.follow) return;
      S.bark(world, wick, "SHIM TALKS ABOUT YOU LIKE YOU'RE A STORY.");
      S.bark(world, wick, 'TRY NOT TO DISAPPOINT HIM.');
    },

    // 2. The cradles. Wick stays to keep the taken alive, which gives the hero a reason to climb.
    *cradles(world) {
      const s = world.state;
      const wick = npcOf(world, 'wick');
      world.barks = [];
      if (wick) wick.follow = false;
      yield { wait: 20 };
      if (wick) {
        yield say('WICK', 'THERE. ALONG THE WALL.');
        yield { walk: wick, x: 56 * 8, speed: 1.6 };
        wick.kneel = true;
      }
      yield { wait: 40 };
      yield say('WICK', "THEY'RE HERE. ALL OF THEM. ASLEEP.");
      yield me('THE GLASS IS PINK AT THE SEAMS.');
      yield say('WICK', "THEY'RE BEING DOSED WHILE THEY SLEEP. THAT'S WHAT THE GARDENS ARE FOR.");
      yield { wait: 30 };
      yield say('WICK', "THAT ONE'S EMPTY. THE NAME ON IT IS SORREL. BRINE'S SISTER.");
      yield say('WICK', 'THE SEALS ARE LOCKED FROM ABOVE. THE WARDEN THAT KEEPS THE GARDENS HOLDS THE CODES.');
      yield say('WICK', "THE BLOOM SHUTS DOORS IN PEOPLE. I'VE SEEN IT. IF THEY STAY UNDER TOO LONG, THEY WON'T WAKE UP AS THEMSELVES.");
      if (wick) wick.facing = Math.sign(world.player.x - wick.x) || 1;
      // She goes up with the hero as far as the Irrigation Works, and comes back to them (wickPatch).
      yield say('WICK', "AND THE AIR IN THESE IS BAD. THE CRADLES BREATHE THROUGH THE WATER WORKS, UP TOP. THERE'S A VALVE.");
      yield say('WICK', "I'LL SHOW YOU THE WAY UP, AND OPEN IT ON THE WAY. THEN I COME BACK AND SIT WITH THEM.");
      s.flags.cradlesSeen = true;
      s.flags.wickWith = false;
      s.flags.wickUp = true;
      if (wick) {
        wick.kneel = false;
        wick.follow = true;
      }
      S.setLead(world, 'FIND THE WARDEN THAT HOLDS THE SEALS');
      S.addStory(world, "THE TAKEN SLEEP IN OLD CRYO CRADLES UNDER THE GARDENS, DOSED WITH THE BLOOM. THE SEALS ARE LOCKED FROM ABOVE. WICK IS COMING UP WITH ME AS FAR AS THE WATER WORKS, TO OPEN THE CRADLES' AIR.");
      world.save();
    },

    // On the way up: a few words from Wick that don't stop play.
    *wickLift(world) {
      const wick = npcOf(world, 'wick');
      if (!wick || !wick.follow) return;
      S.bark(world, wick, "THAT LIFT GOES DOWN TO THE WARRENS. NOBODY'S RIDDEN IT SINCE THE GARDENER CAME.");
    },
    *wickTerraces(world) {
      const wick = npcOf(world, 'wick');
      if (!wick || !wick.follow) return;
      S.bark(world, wick, 'THESE WERE THE BEAN TERRACES. MY MOTHER PICKED HERE AS A GIRL, BEFORE THE GARDENER LOCKED US OUT.');
      S.bark(world, wick, "IF YOU FALL, FALL ON THE BEANS. THEY'VE HAD WORSE.");
    },
    *wickTop(world) {
      const wick = npcOf(world, 'wick');
      if (!wick || !wick.follow) return;
      S.bark(world, wick, "NEARLY THERE. DON'T LOOK DOWN. I NEVER DO.");
    },

    // The Irrigation Works: Wick sits the hero down on the pod and patches them up, opens the cradles' air, and goes
    // back down to sit with them.
    *wickPatch(world) {
      const s = world.state;
      const p = world.player;
      const wick = npcOf(world, 'wick') || spawnCompanion(world);
      const pod = world.pods[0];
      s.flags.wickPatched = true;
      world.barks = [];
      wick.follow = false;
      yield { wait: 20 };
      yield say('WICK', 'THAT POD WILL DO FOR A BENCH. SIT.');
      if (pod) yield { walk: p, x: pod.x - 10, speed: 1 };
      yield { walk: wick, x: p.x + 14, speed: 1.2 };
      wick.facing = -1;
      wick.kneel = true;
      p.facing = 1;
      yield { wait: 30 };
      yield say('WICK', 'HOLD STILL. WHO PATCHED YOU BEFORE?');
      yield me('...SOMEONE SMALL. BADLY.');
      yield say('WICK', "THEN I'LL DO IT BADLY TOO, SO IT FEELS LIKE HOME.");
      HA.audio.play('heart');
      p.hp = p.maxHp;
      world.floatText(p.x + 4, p.y - 6, 'HEALED', '#7ad1a0');
      yield { wait: 40 };
      yield say('WICK', 'MOONWORT, BEAN-LEAF AND SPIT. I PATCHED HALF THE WARRENS WITH WHAT GREW UP HERE, BEFORE THE WAY WAS LOCKED.');
      wick.kneel = false;
      yield { walk: wick, x: 70 * 8, speed: 1.2 };
      for (let i = 0; i < 3; i++) {
        HA.audio.play('clamp');
        yield { wait: 18 };
      }
      HA.audio.play('hiss');
      yield say('WICK', "THERE. NOW THEY'LL BREATHE EASY.");
      wick.facing = Math.sign(p.x - wick.x) || -1;
      yield say('WICK', 'THIS IS AS FAR AS I GO. THROUGH THE WATER, AND UP THE SPORE BEDS. MIND THE PODS; THEY SPIT.');
      yield say('WICK', 'BRING ME THOSE CODES, SLEEPER.');
      yield { walk: wick, x: world.room.pw + 8, speed: 1.4 };
      wick.state = 'gone';
      S.addStory(world, "WICK WALKED ME UP AS FAR AS THE WATER WORKS, AND PATCHED ME UP ON A POD. SHE OPENED THE CRADLES' AIR, AND WENT BACK DOWN TO SIT WITH THEM.");
      world.save();
    },

    // 3. The Pruner, in the Seal Room.
    *prunerIntro(world) {
      const s = world.state;
      const boss = world.boss;
      if (!boss) return;
      yield { wait: 10 };
      boss.active = true; // the doors shut
      world.refreshMusic();
      yield { wait: 30 };
      if (!s.flags.prunerSeen) {
        s.flags.prunerSeen = true;
        yield say('THE PRUNER', 'COUNT: ONE. UNPLANTED.', COUNT);
        yield say('THE PRUNER', 'WHAT IS NOT PLANTED IS A WEED.', COUNT);
      } else yield say('THE PRUNER', 'RECOUNT. ONE WEED.', COUNT);
      boss.fighting = true;
      world.refreshMusic();
    },

    *prunerDefeated(world) {
      const boss = world.boss;
      world.state.flags.prunerDown = true;
      world.save();
      HA.music.play(null);
      for (let i = 0; i < 5; i++) {
        world.burst(boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, ['#ffb84d', '#fff0a8', '#7ad1a0', '#ffffff'], 12, 2.2);
        HA.audio.play('boom');
        world.shake(3);
        yield { wait: 14 };
      }
      boss.broken = true;
      boss.active = false;
      yield { wait: 60 };
      yield* prunerFate(world);
    },
    *prunerChoice(world) {
      yield { wait: 30 };
      yield* prunerFate(world);
    },

    // The Dome Stair's shutter only opens from its own side: a shortcut home.
    *shutter(world) {
      world.state.flags.shutter = true;
      world.toast('A SHUTTER OPENS BACK INTO THE TERRACES', 160);
      world.save();
    },

    // 4. Hope, then loss: the cradles open and the taken wake, but Wick is gone.
    *wake(world) {
      const s = world.state;
      const p = world.player;
      const release = s.wardens.pruner === 'release';
      const c = world.def.cradles;
      const lantern = lanternActor(world, 57 * 8);
      p.x = Math.max(p.x, 2);
      yield { wait: 30 };
      yield { walk: p, x: 50 * 8, speed: 1.2 };
      p.facing = 1;
      yield { wait: 30 };
      yield me('WICK SHOULD BE HERE.');
      let pruner = null;
      if (release) {
        pruner = HA.bosses.pruner.actor(world, 70 * 8, FLOOR(19));
        Object.assign(pruner, { freed: true, facing: -1 });
        world.actors.push(pruner);
        yield { wait: 30 };
        yield say('THE PRUNER', 'COUNT: ELEVEN. CUTTING.', FREED);
      } else {
        yield me('THE SEAL CODES. HOLD ON.');
        HA.audio.play('terminal');
      }
      for (let i = 0; i < c.n - 1; i++) {
        world.cradlesOpening = i + 1;
        const at = HA.scenery.cradleSpot(c, i);
        world.burst(at.x + 14, at.y + 5, release ? ['#7ad1a0', '#f27ad8', '#d8f4ff'] : ['#d8f4ff', '#9fd8e8'], 8, 1.2);
        HA.audio.play(release ? 'snip' : 'hiss');
        yield { wait: 12 };
      }
      // What happened is recorded now, so a game quit during the rest of the scene keeps it.
      s.flags.cradles = true;
      s.flags.lantern = true;
      s.takenHome = release ? 11 : 7;
      s.lead = 'FIND WICK IN THE VATS';
      S.addStory(world, (release ? 'ELEVEN OF THE TAKEN WOKE' : 'SEVEN OF THE TAKEN WOKE, AND FOUR NEVER DID') + '. THEY WENT HOME BY THE GARDEN LIFT. THE GARDENER HAS TAKEN WICK TO THE VATS. I HAVE HER LANTERN.');
      world.cradlesOpening = 0;
      // The woken climb down from the racks: eleven, or seven, with four cradles gone dark.
      const dark = [2, 4, 7, 9];
      const woken = [];
      for (let i = 0; i < c.n - 1; i++) {
        if (!release && dark.includes(i)) continue;
        const at = HA.scenery.cradleSpot(c, i);
        const a = wokenActor(world, woken.length, at.x + 8 + (woken.length % 3) * 3);
        a.kneel = woken.length % 3 === 0;
        world.burst(a.x + 4, a.y + 6, ['#d8f4ff', '#9fd8e8'], 6, 1);
        woken.push(a);
      }
      yield { wait: 70 };
      const first = woken[0];
      first.facing = -1;
      yield say('A WOKEN VILLAGER', 'THE HEALER... SHE WAS TALKING TO US. WE COULD HEAR HER.');
      yield say('A WOKEN VILLAGER', 'THE GARDENER TOOK THE HEALER. TO THE VATS.');
      if (!release) yield say('A WOKEN VILLAGER', "...SOME OF THEM AREN'T WAKING UP.");
      yield { walk: p, x: lantern.x - 6, speed: 1 };
      p.kneel = 50;
      yield { wait: 40 };
      world.actors = world.actors.filter((a) => a !== lantern);
      p.kneel = 0;
      yield me('HER LANTERN WAS STILL LIT.');
      yield say('A WOKEN VILLAGER', "WE'LL TAKE THE LIFT DOWN TO THE WARRENS. GO. BRING HER BACK.");
      for (const a of woken) {
        a.kneel = false;
        a.goX = world.room.pw + 24 + Math.random() * 20;
      }
      if (pruner) {
        pruner.walking = true;
        yield { walk: pruner, x: 74 * 8, speed: 0.5 };
        pruner.walking = false;
      }
      yield { until: () => woken.every((a) => a.x > world.room.pw + 8) };
      HA.audio.play('lift');
      world.actors = world.actors.filter((a) => !woken.includes(a));
      yield { wait: 40 };
      yield { card: [release ? 'ELEVEN CAME HOME.' : 'SEVEN CAME HOME.'], hold: 140 };
      S.setLead(world, 'FIND WICK IN THE VATS');
      if (pruner) {
        pruner.leaving = true;
        yield { wait: 60 };
        world.actors = world.actors.filter((a) => a !== pruner);
      }
      world.save();
    },

    // 5. The Vat House: the Gardener behind her glass, and Wick on her knees in the Bloom.
    *vatHouse(world) {
      const s = world.state;
      const boss = world.boss;
      if (!boss) return;
      yield { wait: 10 };
      boss.active = true; // the door shuts behind the hero
      world.refreshMusic();
      world.camTarget = { x: 22 * 8, y: 12 * 8 };
      yield { wait: 40 };
      if (!s.flags.wickSeen) {
        s.flags.wickSeen = true;
        yield say('THE GARDENER', "YOU'LL BE THE SLEEPER. THE STEWARD SAID YOU MIGHT COME UP.");
        yield say('WICK', '...SLEEPER?');
        yield say('THE GARDENER', 'SHE ASKED SO MANY QUESTIONS ABOUT THE DOSE. SO I GAVE HER ONE. A FULL ONE, STRAIGHT FROM THE VAT.');
        yield me("THE GARDENER DOSED HER. WICK'S HANDS ARE ALREADY GOING PINK.");
        yield say('THE GARDENER', 'IT TAKES SOME PEOPLE QUICKLY. THE KIND ONES, MOSTLY.');
        yield say('THE GARDENER', 'I AM HESTER VALE. I KEEP THE GARDENS. BEFORE THE BLOOM, THE VATS FED HALF THE SHIP, AND THE OTHER HALF FOUGHT FOR IT.');
        yield say('THE GARDENER', 'NOW NOBODY UP THERE IS HUNGRY, AND NOBODY FIGHTS. IT ASKS SO LITTLE BACK. ONLY THE PART OF YOU THAT ARGUES.');
        yield say('WICK', "DON'T COME CLOSER. I CAN'T... HOLD IT.");
      } else {
        yield say('WICK', 'SLEEPER... RUN.');
      }
      world.camTarget = null;
      boss.state = 'think';
      boss.timer = 40;
      boss.fighting = true;
      world.refreshMusic();
    },

    // 6. After: the Bloom brings frenzy, then a fast collapse. She's lucid for a moment.
    *wickDefeated(world) {
      const s = world.state;
      const p = world.player;
      const b = world.boss;
      s.flags.wickFought = true;
      HA.music.play(null);
      world.barks = [];
      b.state = 'down';
      b.vx = 0;
      world.save();
      yield { wait: 70 };
      yield { walk: p, x: b.x + (p.x < b.x ? -14 : 14), speed: 1 };
      p.facing = Math.sign(b.x - p.x) || 1;
      b.facing = -p.facing;
      yield { wait: 50 };
      b.lucid = true;
      yield say('WICK', 'SLEEPER.');
      yield { wait: 30 };
      yield say('WICK', "TELL SHIM I WASN'T SCARED.");
      yield { wait: 70 };
      yield say('WICK', '...TELL HIM I WAS, A LITTLE.');
      yield { wait: 40 };
      giveLancets(world);
      yield { wait: 100 };
      b.still = true;
      yield { wait: 130 };
      wickGone(world);
      yield* gardenerOffer(world);
    },
    // A game quit during the end of the Vat House picks it up again.
    *gardenerOffer(world) {
      giveLancets(world);
      wickGone(world);
      yield { wait: 30 };
      yield* gardenerOffer(world);
    },

    // The Garden Lift, between the Gardens and the Warrens: locked until the cradles open, and the hero won't
    // ride it home without Wick. Then it runs both ways.
    *lift(world) {
      const s = world.state;
      if (!s.flags.cradles) {
        HA.audio.play('terminal');
        yield say('GARDEN LIFT', 'LOCKED. CREW ONLY. AUTHORITY: THE STEWARD.', STEWARD);
        return;
      }
      const down = world.def.id === 'garden-lift';
      if (down && !s.flags.wickDead) {
        yield me('NOT WITHOUT WICK.');
        return;
      }
      if (down && !s.flags.homeAgain) yield me('HOME. I HAVE TO TELL THEM.');
      HA.audio.play('lift');
      yield { fade: 'out', frames: 30 };
      yield { wait: 40 };
      world.travel(world.link);
      yield { fade: 'in', frames: 30 };
    },
  };

  // Choice 2: the Pruner asks to be finished. Both screens say exactly what it costs, and the count home.
  function* prunerFate(world) {
    const s = world.state;
    const p = world.player;
    const boss = world.boss;
    if (!boss) return;
    // Frame the hero and the Pruner together while it asks.
    world.camTarget = { x: (p.x + boss.x + boss.w / 2) / 2, y: boss.floorY - 40 };
    yield say('THE PRUNER', 'I WAS BUILT TO CUT. I CANNOT STOP.', '#9fb6c8');
    yield say('THE PRUNER', 'FINISH IT.', '#9fb6c8');
    const pick = yield {
      choice: {
        prompt: "THE PRUNER'S CORE IS STILL LIT.",
        options: [
          { label: 'GIVE IT SOMETHING ELSE TO CUT', confirm: { title: 'RELEASE THE PRUNER?', gain: 'ELEVEN OF THE TAKEN COME HOME', lose: 'A CORE THAT KEEPS THE LAUNCHER LV2' } },
          { label: 'FINISH IT, AS IT ASKS', confirm: { title: "TEAR OUT THE PRUNER'S CORE?", gain: 'THE SEAL CODES · LAUNCHER STAYS LV2+', lose: 'FOUR OF THE TAKEN. SEVEN COME HOME' } },
        ],
      },
    };
    // The choice is recorded at once; what follows only plays it out.
    s.wardens.pruner = pick === 0 ? 'release' : 'salvage';
    s.mercy += pick === 0 ? 2 : -1;
    s.lead = 'GO BACK DOWN TO THE CRADLES';
    S.addChoice(world, pick === 0 ? 'I RELEASED THE PRUNER. IT WENT DOWN TO CUT THE BLOOM FROM THE CRADLES.' : 'I FINISHED THE PRUNER, AS IT ASKED, AND TOOK THE SEAL CODES FROM ITS CORE. FOUR OF THE TAKEN WILL NEVER WAKE.');
    if (pick === 0) {
      HA.audio.play('unlock');
      world.burst(boss.x + boss.w / 2, boss.y + 10, ['#b8f4ff', '#5fd4e8', '#ffffff'], 18, 1.6);
      boss.freed = true;
      yield { wait: 50 };
      yield say('THE PRUNER', 'SOMETHING ELSE TO CUT.', FREED);
      yield say('THE PRUNER', 'THE BLOOM ON THE CRADLES. IT IS ALL GROWING WRONG. I CAN CUT THAT.', FREED);
      yield say('THE PRUNER', 'COUNT: ELEVEN. I WILL GO DOWN TO THEM.', FREED);
      boss.broken = false;
      boss.walking = true;
      yield { walk: boss, x: 84 * 8, speed: 0.7 };
      boss.walking = false;
      boss.leaving = true;
      yield { wait: 60 };
      boss.gone = true;
    } else {
      HA.audio.play('salvage');
      world.flash('#ffffff', 6);
      world.shake(4);
      world.burst(boss.x + boss.w / 2, boss.y + 14, ['#7ad1a0', '#ffb84d', '#ffffff'], 24, 2.2);
      boss.cored = true;
      const sc = p.weapons.find((w) => w.id === 'scatter');
      if (sc && sc.level < 2) Object.assign(sc, { level: 2, xp: 0 });
      world.toast('THE SEAL CODES · THE CRADLES WILL OPEN', 220);
      yield { wait: 80 };
    }
    world.camTarget = null;
    S.setLead(world, 'GO BACK DOWN TO THE CRADLES');
    world.refreshMusic();
    world.save();
  }

  function giveLancets(world) {
    const p = world.player;
    if (p.weapons.some((w) => w.id === 'lancets' || w.id === 'thorn')) return;
    p.weapons.push(HA.weapons.make('lancets'));
    p.wi = p.weapons.length - 1;
    p.charge = 0;
    world.weaponBanner = 160;
    world.toast("WICK'S LANCETS · {fire} THROWS A FAN OF BLADES", 300);
    HA.audio.play('lancet', 1);
  }

  function wickGone(world) {
    const s = world.state;
    if (s.flags.wickDead) return;
    s.people.wick = 'dead';
    s.flags.wickDead = true;
    S.addStory(world, "WICK DIED IN THE VAT HOUSE. THE GARDENER, HESTER VALE, DOSED HER WITH THE BLOOM FOR ASKING QUESTIONS, AND IT TOOK HER FAST. AT THE END SHE WAS HERSELF, AND SHE GAVE ME HER LANCETS.");
    world.save();
  }

  // 7. The offer, from behind the glass. It can be taken here or in the Tower's Garden Gallery, nowhere else.
  function* gardenerOffer(world) {
    const s = world.state;
    const p = world.player;
    const gardener = npcOf(world, 'gardener');
    world.camTarget = { x: 24 * 8, y: 12 * 8 };
    yield { wait: 30 };
    yield say('THE GARDENER', 'HER BLADES ARE GRIEF. GRIEF IS HEAVY.');
    yield say('THE GARDENER', "GIVE THEM TO ME, AND I'LL GIVE YOU SOMETHING THAT GROWS.");
    const closes = HA.bloom.closes(s, 2);
    const lose = closes ? 'THE LANCETS, AND YOURSELF' : "WICK'S LANCETS · THE BLOOM GROWS";
    const pick = yield {
      choice: {
        prompt: 'THE GARDENER HOLDS OUT A THORN.',
        options: [{ label: "KEEP WICK'S LANCETS" }, { label: 'TRADE THEM FOR THE THORN', confirm: { title: 'TRADE THE LANCETS FOR THE THORN?', gain: 'THE BLOOM THORN, A HEAVY HITTER', lose } }],
      },
    };
    // The choice is recorded at once; what follows only plays it out.
    s.flags.thornOffered = true;
    s.flags.gardenerGone = true;
    s.lead = 'TAKE THE GARDEN LIFT HOME TO THE WARRENS';
    if (pick === 1) {
      const i = p.weapons.findIndex((w) => w.id === 'lancets');
      if (i >= 0) p.weapons.splice(i, 1);
      p.weapons.push(HA.weapons.make('thorn'));
      p.wi = p.weapons.length - 1;
      world.weaponBanner = 160;
      s.flags.thorn = true;
      S.addChoice(world, "I GAVE WICK'S LANCETS TO THE GARDENER FOR THE BLOOM THORN.");
      S.addStory(world, 'I HAVE TO TELL SHIM.');
      world.flash('#f27ad8', 8);
      world.toast('BLOOM THORN · IT HITS HARDER AS THE BLOOM GROWS', 300);
      HA.bloom.add(world, 2);
      yield say('THE GARDENER', 'THERE. NOW SOMETHING OF HER GROWS WITH YOU.');
    } else {
      S.addChoice(world, "I KEPT WICK'S LANCETS. THE GARDENER SAID SHE'D ASK AGAIN, IN THE TOWER.");
      S.addStory(world, 'I HAVE TO TELL SHIM.');
      yield say('THE GARDENER', "KEEP THEM, THEN. WHEN THEY GET TOO HEAVY, I'LL BE IN THE TOWER'S GARDEN GALLERY.");
    }
    // She leaves, up toward the Tower, by her own door.
    if (gardener) {
      yield { walk: gardener, x: 36 * 8, speed: 0.6 };
      gardener.state = 'gone';
    }
    world.camTarget = null;
    if (world.boss) world.boss.active = false;
    S.setLead(world, 'TAKE THE GARDEN LIFT HOME TO THE WARRENS');
    world.save();
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // Wick walks with the hero from the Hall to the cradles; anywhere else, she waits back at the Hall's door.
      if (f.wickWith && !f.cradlesSeen) {
        if (id === 'arena' || id === 'root-cellar') spawnCompanion(world);
        else f.wickWith = false;
      }
      // After the cradles she's with the hero in the rooms on the way up, until she's patched them up (and anywhere
      // else, she's with them again when they come back).
      if (goingUp(f) && UP.has(id)) spawnCompanion(world);
      if (id === 'root-cellar') {
        if (f.wickWith && !f.gardens && !world.scene) run(world, 'intoGreen');
        if (f.cradlesSeen && !s.wardens.pruner && !goingUp(f)) {
          const wick = S.makeNpc(world, 'wick', { x: 56 * 8, y: FLOOR(18) });
          wick.kneel = true;
          world.npcs.push(wick);
        }
        if (s.wardens.pruner && !f.cradles && !world.scene) run(world, 'wake');
      }
      if (id === 'seal-room' && world.bossSpawn) {
        const P = HA.bosses.pruner;
        const place = () => {
          world.boss = P.make(world, world.bossSpawn.x, world.bossSpawn.y);
          world.enemies.push(world.boss);
          return world.boss;
        };
        if (!f.prunerDown) place();
        else if (!s.wardens.pruner) {
          place().broken = true;
          run(world, 'prunerChoice');
        } else if (s.wardens.pruner === 'salvage') Object.assign(place(), { broken: true, cored: true });
      }
      if (id === 'vat-house' && world.bossSpawn) {
        const Wk = HA.bosses.wick;
        if (!f.wickFought) {
          world.boss = Wk.make(world, world.bossSpawn.x, world.bossSpawn.y);
          world.boss.name = 'WICK';
          world.enemies.push(world.boss);
        } else {
          // Where she sat down, and stayed.
          const body = Object.assign(Wk.make(world, world.bossSpawn.x, world.bossSpawn.y), { still: true, lucid: true, state: 'down' });
          body.draw = (g, w, self, cam) => Wk.draw(g, w, self, cam);
          world.actors.push(body);
          if (!f.thornOffered && !world.scene) run(world, 'gardenerOffer');
        }
      }
    },

    // No music from Wick's collapse until the hero is home (Phase 3.2). The Pruner and Wick each have their own
    // track.
    music(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (f.wickFought && !f.homeAgain && (world.def.area === 'gardens' || world.def.area === 'lockup')) return null;
      const b = world.boss;
      if (id === 'seal-room' && b && !s.wardens.pruner) return b.fighting ? 'pruner' : b.active || b.broken ? null : undefined;
      if (id === 'vat-house' && b) return b.fighting ? 'wick' : b.active ? null : undefined;
      return undefined;
    },
  });

  Object.assign(S.SCENES, SCENES);
})(window.HA);
