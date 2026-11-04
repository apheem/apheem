'use strict';
// Hasp's boy (3.15, the brief's own side-quest example; STORYBOARD.md, "The other side quests"). The night the
// Wardens took Shim, Hasp's son Cotter, nineteen, went up the Way Down after them with a pipe. The Wardens counted him
// outside the count, too old to plant, and sent him to the Muster, where the Steward's soldiers are made. From the
// hero's return from the Gardens, Hasp is at her door asking. In the Muster he sits in a dosing chair; told his
// mother's name, he fights the dose (bosses/cotter.js), and when the fit breaks the hero decides: walk him home dry, or
// give him back the dose that's in the rack.
// Flags: haspAsked, cotterSeen (noticed in his chair), cotterHome (Hasp's news, home), cotterLate (settled after the
// climbers had gone, so he doesn't climb). The tally line is the log
// tallyCotter in the Counting House. people.cotter: 'dry' or 'dosed'. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const FLOOR = (ty) => ty * 8;
  const LOG = '#b8f4ff';
  const DOOR = 72; // where Hasp stands, by her door in the Warrens (the home east of the Garden Lift)
  const CHAIR = 46; // Cotter's chair in the Muster
  const HATCH = 33; // the Muster's hatch down into the dock: his way out
  const near = (p, n, dx, dy) => Math.abs(p.x + p.w / 2 - (n.x + 4)) < dx && Math.abs(p.y + p.h - (n.y + n.h)) < dy;

  S.PEOPLE.hasp = { name: 'HASP', sprite: 'hasp' };
  S.PEOPLE.cotter = { name: 'COTTER', sprite: 'cotter', away: true };
  S.TALK.hasp = {};
  S.TALK.cotter = {};

  Object.assign(S.LOGS, {
    tallyCotter: {
      title: 'WARDEN TALLY · OUTSIDE THE COUNT',
      text: 'COLLECTED, OUTSIDE THE COUNT: ONE. MALE. ADULT. RESISTED, WITH A PIPE. NOT FOR THE GARDENS: TOO OLD TO PLANT. SENT TO THE MUSTER.',
    },
  });

  S.cotterHome = (s) => s.people.cotter === 'dry' || s.people.cotter === 'dosed';

  // ---- What Hasp and Cotter say, as things stand ----
  function haspLines(s) {
    if (s.people.cotter === 'dry') return ['HE ATE TODAY. HE KEPT IT DOWN.', 'HE ASKS FOR IT. I SAY NO. HE SAYS THANK YOU.'];
    if (s.people.cotter === 'dosed') return ["HE CALLS ME MA'AM.", 'HE DOES EVERYTHING I SAY. EVERYTHING.'];
    if (s.logs.tallyCotter || s.flags.cotterSeen) return ['THE MUSTER. IN THE LABYRINTH, PAST THE SUMP.', 'BRING HIM HOME, ' + S.callName(s) + '.'];
    return ["HE'S NINETEEN. HE THINKS THAT MAKES HIM A WALL.", "IF HE'S DEAD, TELL ME. I'D RATHER KNOW."];
  }
  function cotterLines(s) {
    if (s.people.cotter === 'dosed') return ['ORDERS?', "MA'AM SAYS I CAN SIT DOWN WHEN THE WATER'S IN."];
    if (s.flags.crewCame) return ['I WALKED TO THE GATE AND BACK TODAY.', 'NEXT TIME, ALL THE WAY UP.'];
    return ['...IS THAT YOU? IT STILL HURTS.', 'THANK YOU. FOR MA.'];
  }

  const SCENES = {
    // ---- The Warrens: she asks ----
    *haspAsks(world) {
      const s = world.state;
      const f = s.flags;
      const h = npcOf(world, 'hasp');
      f.haspAsked = true;
      if (h && h.state === 'out') h.facing = Math.sign(world.player.x - h.x) || 1;
      yield say('HASP', S.callName(s) + '. YOU CAME BACK FROM UP THERE. DID YOU SEE A BOY? NINETEEN. TALL.');
      yield say('HASP', 'HE THINKS THAT MAKES HIM A WALL.');
      yield say('HASP', 'COTTER. HE WENT UP THE WAY DOWN AFTER THE COUNTERS, THE NIGHT THEY TOOK SHIM. WITH A PIPE.');
      if (s.logs.tallyCotter) {
        yield me("THE WARDENS' TALLY HAD A LINE. ONE MAN, WHO FOUGHT. NOT FOR THE GARDENS. SENT TO THE MUSTER.");
        yield say('HASP', 'THE MUSTER. WHERE THEY MAKE THE SOLDIERS.');
      }
      if (f.cotterSeen) {
        yield me("THERE'S A BOY IN THE CHAIRS IN THE MUSTER, IN THE LABYRINTH. HULLFOLK, UNDER THE PINK.");
        yield say('HASP', "THAT'S HIM. IT HAS TO BE.");
      }
      yield say('HASP', "IF HE'S DEAD, TELL ME. I'D RATHER KNOW.");
      if (h) h.lines = haspLines(s);
      S.addStory(world, 'HASP\'S SON COTTER WENT UP THE WAY DOWN AFTER THE WARDENS, THE NIGHT THEY TOOK SHIM. HE NEVER CAME HOME.' + (s.logs.tallyCotter || f.cotterSeen ? ' THE WARDENS SENT HIM TO THE MUSTER.' : ''));
      world.save();
    },

    // ---- The Counting House: the line outside the count ----
    *tallyCotter(world) {
      const s = world.state;
      const first = !s.logs.tallyCotter;
      s.logs.tallyCotter = true;
      HA.audio.play('tally');
      const L = S.LOGS.tallyCotter;
      yield { say: L.title, text: L.text, color: LOG };
      if (!first) return;
      if (s.flags.haspAsked) {
        yield me('NOT FOR THE GARDENS. THE MUSTER. THEY MADE A SOLDIER OF HIM.');
        S.addStory(world, "THE WARDENS' TALLY IN THE COUNTING HOUSE HAS COTTER OUTSIDE THE COUNT: HE FOUGHT THEM WITH A PIPE, AND THEY SENT HIM TO THE MUSTER.");
      } else yield me("SOMEONE FOUGHT THEM. THEY DIDN'T COUNT HIM WITH THE OTHERS.");
      world.save();
    },

    // ---- The Muster ----
    *cotterStill(world) {
      yield me("HE DOESN'T ANSWER. HIS EYES ARE OPEN, BUT HE ISN'T IN THERE.");
    },
    // Told his mother's name, the dose fights it, and he fights the hero.
    *cotterFound(world) {
      const s = world.state;
      const p = world.player;
      const n = npcOf(world, 'cotter');
      if (!n) return;
      // Not with the Steward's soldiers still up around his chair.
      if (world.enemies.some((e) => !e.dead && !e.boss && e.type === 'bloomsworn' && Math.abs(e.x - n.x) < 160)) {
        yield me('NOT WITH THE OTHERS STILL ON THEIR FEET.');
        return;
      }
      const side = p.x < n.x ? -1 : 1;
      yield { walk: p, x: n.x + side * 16, speed: 1 };
      p.facing = -side;
      yield me('COTTER.');
      yield { wait: 30 };
      yield me('HASP SENT ME. YOUR MOTHER. SHE WANTS YOU HOME.');
      yield { wait: 50 };
      yield say('COTTER', '...HASP?');
      HA.audio.play('telegraph');
      world.shake(2);
      yield me('THE DOSE BOOK SAID IT. A HAND THAT MISSES A DOSE STARTS TO REMEMBER.');
      yield say('COTTER', "IT'S MISSED A SHIFT. IT KNOWS. IT'S SHOUTING.");
      yield say('COTTER', "GET BACK. GET BACK, I CAN'T—");
      HA.audio.play('grate');
      world.burst(n.x + 4, n.y + 6, ['#7a3a3a', '#f27ad8', '#ffffff'], 10, 1.6);
      // He tears the straps, and the fight starts. A fall puts him back in his chair (world.checkpoint).
      const b = HA.bosses.cotter.make(world, n.x + 4, FLOOR(19));
      n.state = 'gone';
      b.facing = side;
      b.active = true;
      b.fighting = true;
      b.state = 'think';
      b.timer = 40;
      world.boss = b;
      // Nothing else comes back into the room while he's fighting it.
      for (const e of world.enemies) if (!e.boss) e.spawn.respawn = -1;
      world.enemies.push(b);
      world.checkpoint = { room: 'muster', x: 34 * 8, y: FLOOR(19) - p.h };
      world.toast('STAY ON YOUR FEET UNTIL THE FIT BREAKS', 220);
      world.refreshMusic();
      S.addStory(world, 'I FOUND COTTER IN THE MUSTER, STRAPPED IN A DOSING CHAIR. I SAID HIS MOTHER\'S NAME, AND THE BLOOM IN HIM FOUGHT IT.');
    },

    // The fit breaks. The choice.
    *cotterDefeated(world) {
      const s = world.state;
      const p = world.player;
      const b = world.boss;
      world.checkpoint = null;
      HA.music.play(null);
      world.barks = [];
      // Cotter, on his knees, as himself again: a person, not a fight.
      world.enemies = world.enemies.filter((e) => e !== b);
      world.boss = null;
      const n = S.makeNpc(world, 'cotter', { x: Math.round(b.x), y: FLOOR(18) });
      Object.assign(n, { kneel: true, facing: b.facing, talkable: () => false });
      world.npcs.push(n);
      yield { wait: 60 };
      const side = p.x < n.x ? -1 : 1;
      yield { walk: p, x: n.x + side * 14, speed: 1 };
      p.facing = -side;
      n.facing = side;
      yield say('COTTER', "...MA'S GOING TO KILL ME.");
      yield say('COTTER', "IT LET GO. FOR NOW. IT'LL BE BACK AT THE NEXT SHIFT. I CAN FEEL IT WAITING.");
      yield me("HE'S SHAKING. THE NEXT SHIFT'S DOSE IS IN THE RACK BY HIS CHAIR.");
      const pick = yield {
        choice: {
          prompt: "COTTER IS SHAKING. THE NEXT SHIFT'S DOSE IS IN THE RACK.",
          options: [
            { label: 'WALK HIM HOME DRY', confirm: { title: 'SEND COTTER HOME DRY?', gain: "HASP'S SON, HIMSELF", lose: "HE'LL BE SICK FOR WEEKS · HE CAN'T CLIMB" } },
            { label: 'GIVE HIM HIS DOSE', confirm: { title: 'GIVE COTTER HIS DOSE?', gain: 'HE WALKS HOME STRONG · ONE MORE PAIR OF HANDS', lose: "HE'LL NEED IT EVERY SHIFT · HE DOES WHAT THE DOSE SAYS" } },
          ],
        },
      };
      // The choice is recorded at once; what follows only plays it out. After the climbers have gone, he goes home
      // either way: the crew is already counted.
      if (s.flags.crewCame) s.flags.cotterLate = true;
      if (pick === 0) {
        s.people.cotter = 'dry';
        s.mercy += 1;
        S.addChoice(world, 'I SENT COTTER HOME DRY.');
        S.addStory(world, 'I SAID HIS MOTHER\'S NAME, AND COTTER FOUGHT THE BLOOM UNTIL IT LET GO. HE WALKED HOME DRY.');
      } else {
        s.people.cotter = 'dosed';
        s.mercy -= 1;
        S.addChoice(world, 'I GAVE COTTER HIS DOSE BACK.');
        S.addStory(world, 'COTTER FOUGHT THE BLOOM UNTIL IT LET GO, AND I GAVE IT BACK TO HIM. HE WENT HOME BECAUSE I TOLD HIM TO.');
      }
      world.save();
      if (pick === 0) {
        yield me("NO MORE. YOU'RE GOING HOME.");
        yield say('COTTER', "IT'LL BE BAD.");
        yield say('COTTER', "...I KNOW THE WAY DOWN. I CAME UP IT. TELL HER I'M COMING.");
        n.kneel = false;
      } else {
        HA.audio.play('clamp');
        yield { wait: 30 };
        n.kneel = false;
        yield { wait: 40 };
        yield say('COTTER', "...THAT'S BETTER.");
        yield say('COTTER', 'WHO GIVES THE DOSE GIVES THE ORDERS. WHAT ARE MINE?');
        yield me('GO HOME. TO HASP.');
        yield say('COTTER', 'YES.');
      }
      n.walking = true;
      yield { walk: n, x: HATCH * 8, speed: pick === 0 ? 0.5 : 1.1 };
      n.walking = false;
      n.state = 'gone';
      HA.audio.play('clamp');
      world.refreshMusic();
      world.save();
    },

    // ---- Home: Hasp's news ----
    *cotterHome(world) {
      const s = world.state;
      const f = s.flags;
      const h = npcOf(world, 'hasp');
      const r = npcOf(world, 'cotter');
      f.cotterHome = true;
      yield { wait: 30 };
      if (h) {
        world.camTarget = { x: h.x + 6, y: h.y - 20 };
        if (h.state === 'out') h.facing = Math.sign(world.player.x - h.x) || 1;
      }
      if (s.people.cotter === 'dry') {
        yield say('HASP', 'HE CAME DOWN THE WAY DOWN ON HIS HANDS AND KNEES. HE\'S IN BED.');
        yield say('HASP', 'HE SHAKES ALL NIGHT. HE ASKS FOR IT. I SAY NO, AND HE SAYS THANK YOU.');
        yield say('COTTER', '...IS THAT THEM, MA? TELL THEM THANK YOU.');
        S.addStory(world, 'COTTER GOT HOME ON HIS HANDS AND KNEES. HE SHAKES ALL NIGHT, AND ASKS FOR IT, AND HASP SAYS NO.');
      } else {
        yield say('HASP', 'HE CAME HOME. HE CARRIED THE WATER IN, AND THEN HE STOOD THERE UNTIL I TOLD HIM HE COULD SIT DOWN.');
        yield say('HASP', "HE CALLS ME MA'AM.");
        if (r) r.facing = Math.sign((h ? h.x : r.x) - r.x) || 1;
        yield say('COTTER', "MA'AM.");
        yield say('HASP', 'WHAT DID YOU DO TO HIM?');
        yield me('HE WAS SHAKING. I GAVE HIM HIS DOSE.');
        yield say('HASP', "...HE'S HOME. HE'S HOME.");
        S.addStory(world, "COTTER IS HOME. HE CALLS HASP MA'AM, AND DOES EVERYTHING SHE SAYS.");
      }
      world.camTarget = null;
      if (h) h.lines = haspLines(s);
      if (r) r.lines = cotterLines(s);
      world.save();
    },
  };

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // Out of the Muster mid-fight, the fight's checkpoint goes too: he's back in his chair next time.
      if (id !== 'muster' && world.checkpoint && world.checkpoint.room === 'muster') world.checkpoint = null;
      // In his chair, until he's settled one way or the other.
      if (id === 'muster' && !s.people.cotter) {
        const n = S.makeNpc(world, 'cotter', { x: CHAIR * 8 + 1, y: FLOOR(18) });
        Object.assign(n, { kneel: true, facing: 1, talkable: (w, self) => self.state === 'out' && !w.boss });
        world.npcs.push(n);
      }
      // Hasp at her door, from the hero's return from the Gardens; Cotter with her, once he's home and not climbing.
      if (id === 'warrens' && f.homeAgain && !f.running) {
        const hide = S.callName(s) === 'COUNTER' || (s.warrensRaid === 'fell' && !f.wallsOut);
        const h = S.makeNpc(world, 'hasp', { x: DOOR * 8, y: FLOOR(18) });
        h.state = hide ? 'hidden' : 'out';
        h.facing = -1;
        if (f.haspAsked || s.people.cotter) h.lines = haspLines(s);
        world.npcs.push(h);
        const climbing = f.crewCame && S.crewList(s).includes('cotter');
        if (S.cotterHome(s) && !climbing) {
          const r = S.makeNpc(world, 'cotter', { x: (DOOR + 2) * 8, y: FLOOR(18) });
          if (s.people.cotter === 'dry') r.sprite = HA.art.people.cotterDry;
          // Dry, he's in bed (a voice from the doorway) until the climbers have gone; dosed, he stands at the door.
          r.state = hide || (s.people.cotter === 'dry' && !f.crewCame) ? 'hidden' : 'out';
          r.facing = -1;
          r.lines = cotterLines(s);
          world.npcs.push(r);
        }
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.scene || world.player.dead || world.transition || world.fade > 0.5 || world.nightScene) return;
      const p = world.player;
      if (id === 'warrens' && !f.running) {
        const h = npcOf(world, 'hasp');
        if (h && !f.haspAsked && !s.people.cotter && near(p, h, 44, 30)) return run(world, 'haspAsks');
        if (S.cotterHome(s) && !f.cotterHome && h && S.newsTold(s)) return run(world, 'cotterHome');
      }
      // Noticed in his chair (the first time the hero comes close, whether or not Hasp has asked).
      if (id === 'muster' && !s.people.cotter && !f.cotterSeen && !world.boss) {
        const n = npcOf(world, 'cotter');
        if (n && near(p, n, 36, 24)) {
          f.cotterSeen = true;
          S.think(world, f.haspAsked ? 'THIS ONE DIDN\'T GET UP. YOUNG. HULLFOLK, UNDER THE PINK. ...COTTER?' : "THIS ONE DIDN'T GET UP. HE'S YOUNG. HULLFOLK, UNDER THE PINK.", 240);
        }
      }
    },

    talk(world, npc) {
      const s = world.state;
      if (npc.id === 'cotter' && world.def.id === 'muster' && !s.people.cotter) return s.flags.haspAsked ? 'cotterFound' : 'cotterStill';
      return null;
    },

    // His fight has the Wick's track: someone the hero knows of, fighting the Bloom in them.
    music(world) {
      const b = world.boss;
      if (world.def.id === 'muster' && b && b.type === 'cotter') return b.fighting ? 'wick' : null;
      return undefined;
    },
  });

  // ---- The endings' cards (endings.js) ----
  S.cotterCards = function (s, id) {
    const dry = s.people.cotter === 'dry';
    const dosed = s.people.cotter === 'dosed';
    if (!dry && !dosed && !s.flags.haspAsked) return [];
    const cards = {
      homecoming: dry
        ? ['COTTER WALKED OUT ONTO THE GROUND ON HIS OWN FEET.', 'HASP WALKED BEHIND HIM, IN CASE.']
        : dosed
          ? ['THE DOSES RAN OUT A MONTH AFTER LANDING.', 'COTTER SHOOK FOR A SEASON. THEN HE ASKED HASP WHAT HIS NAME WAS.']
          : ["HASP WAITED AT THE SHIP'S DOOR UNTIL EVERYONE WAS OUT."],
      crash: dry ? ['COTTER CARRIED HASP DOWN TO THE SLEDS.', 'HE SAID IT WAS HIS TURN.'] : dosed ? ['COTTER HELD THE SLED DOORS', 'UNTIL HE WAS TOLD HE COULD STOP.'] : ['HASP LEFT A LIGHT IN HER DOOR', 'WHEN THE SLEDS WENT.'],
      dominion: dry ? ['COTTER STANDS AT THE GATE NOW.', 'HE NEVER DID GET STRONG.'] : dosed ? ['COTTER CAME UP TO THE TOWER FOR HIS DOSE EVERY SHIFT.', 'I HAD THE RACKS NOW.'] : ['HASP STILL ASKS EVERYONE', 'WHO COMES DOWN THE WAY DOWN.'],
      overgrown: dry ? ['COTTER HAD BEEN DRY FOR A MONTH', 'WHEN THE PINK CAME BACK FOR EVERYONE.'] : dosed ? ["COTTER DIDN'T NOTICE ANY DIFFERENCE."] : ["THE MUSTER'S CHAIRS ARE EMPTY NOW.", 'THEY ALL WENT TO THE GARDENS.'],
    };
    return cards[id] ? [cards[id]] : [];
  };
  // He's outside the Warrens' twenty, like Sorrel: home, either way, he's counted wherever the village is.
  S.cotterCounted = (s) => S.cotterHome(s);

  Object.assign(S.SCENES, SCENES);
})(window.HA);
