'use strict';
// Old Gasket's trust (3.11, Cody's notes): he comes round to the hero slowly, and it shows in what he says, never
// as a number. Trust is worked out from the save: the wrench hung up, Cleat's count shown, Shim told the truth about
// his mother (choice 4), Flux home (choice 6), and the village calling the hero LATE. The scenes are short, at home,
// when the hero talks to him, each once; the main conversations at home always come first. All text is original
// to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });

  S.gasketTrust = (s) =>
    [s.flags.gasketWrench, s.flags.gasketCleat, s.toldShim === 'truth', s.people.flux === 'home', S.callName(s) === 'LATE'].filter(Boolean).length;

  // ---- Losing him (3.11, Cody: two places) ----
  // After his talk at the Crew Camp, the hero can lose Old Gasket in the Barracks (the Steward wakes his guard and
  // sends them at him) and at the Helm (he goes for Marrant, who wears his brother's boots). Lost, he's
  // people.gasket 'dead', and whoever is left speaks for the crew.
  S.gasketAlive = (s) => s.people.gasket !== 'dead';
  // Who speaks for the crew when he can't: the first climber still with them (Gasket, then Solder, Flux, Brine...),
  // skipping anyone who has just spoken. Never Cotter, dosed: he does what he's told (story/cotter.js).
  S.crewVoice = (s, not = []) => S.towerCrew(s).find((id) => !not.includes(id) && id !== 'cotter') || 'brine';
  // Flux, once he's come home, is Flux, not the deserter.
  S.nameOf = (id) => (id === 'flux' ? 'FLUX' : S.PEOPLE[id] ? S.PEOPLE[id].name : id.toUpperCase());

  const STEWARD = '#c9d6e8';
  const steward = (text) => say('THE STEWARD', text, STEWARD);
  const run = (world, name) => S.run(world, name);
  const HOLD = 480; // how long he holds the Barracks' night watch off with his wrench
  const AIM = 300; // how long Marrant holds his sidearm on him at the Helm
  const near = (p, n, dx, dy) => Math.abs(p.x + p.w / 2 - (n.x + 4)) < dx && Math.abs(p.y + p.h - (n.y + n.h)) < dy;
  // The crew's cry when he falls: Shim, if he's there; else whoever speaks for them.
  function* cry(world) {
    const s = world.state;
    if (npcOf(world, 'shim')) yield say('SHIM', 'GRANDAD!');
    else yield say(S.nameOf(S.crewVoice(s)), 'GASKET!');
  }
  function lost(world, where) {
    const s = world.state;
    s.people.gasket = 'dead';
    s.flags[where] = 'lost';
  }

  const SCENES = {
    // Shim brought back: the wrench he's kept by him since the hero came down the walkway goes on its hook.
    *gasketWrench(world) {
      const g = npcOf(world, 'gasket');
      world.state.flags.gasketWrench = true;
      if (g) g.wrench = true;
      yield { wait: 20 };
      yield say('OLD GASKET', "I'VE KEPT THIS WRENCH BY ME SINCE YOU CAME DOWN THE WALKWAY.");
      yield say('OLD GASKET', "I'VE BEEN WAITING FOR YOU TO TURN INTO WHAT THE LAST ONE WAS.");
      yield { wait: 40 };
      yield say('OLD GASKET', "YOU HAVEN'T. YET.");
      if (g) g.wrench = false;
      HA.audio.play('clamp');
      yield me('HE HANGS IT ON A HOOK BY HIS DOOR.');
      S.addStory(world, "OLD GASKET HUNG UP THE WRENCH HE'D KEPT BY HIM SINCE I CAME. I HAVEN'T TURNED INTO THE LAST SLEEPER. YET, HE SAID.");
      world.save();
    },
    // The taken home: his brother Cleat's count of days on the wall by his door.
    *gasketCleat(world) {
      world.state.flags.gasketCleat = true;
      yield { wait: 20 };
      yield say('OLD GASKET', 'SEE THESE MARKS?');
      yield me('SCRATCHES IN THE WALL BY HIS DOOR. HUNDREDS OF THEM, IN FIVES.');
      yield say('OLD GASKET', 'MY BROTHER CLEAT COUNTED THE DAYS ON THIS WALL, TILL SOMEBODY CAME DOWN TO HELP US. HE GOT TO NINE HUNDRED AND TWELVE.');
      yield say('OLD GASKET', 'THEN A SLEEPER CAME DOWN.');
      yield me("I'M NOT HIM.");
      yield { wait: 40 };
      yield say('OLD GASKET', 'NO. YOU BROUGHT THEM HOME.');
      S.addStory(world, "GASKET SHOWED ME HIS BROTHER CLEAT'S MARKS ON THE WALL: NINE HUNDRED AND TWELVE DAYS, WAITING FOR SOMEBODY TO COME AND HELP. THEN A SLEEPER CAME. 'YOU BROUGHT THEM HOME,' HE SAID.");
      world.save();
    },

    // ---- The Barracks: the night watch ----
    // The first time the hero reaches the far end, the Steward wakes two of his guard in the bunks and sends them
    // at the old man by the lift. Gasket steps out in front of the crew with his wrench, and holds them off as
    // long as he can. Reaching him in time (or downing both) saves him; leaving the room, or being too slow,
    // doesn't. A fall in the fight plays it again.
    *guardWake(world) {
      const s = world.state;
      const f = s.flags;
      const g = npcOf(world, 'gasket');
      f.guardWoke = true;
      if (!g) return;
      HA.audio.play('intercom');
      yield { wait: 16 };
      yield steward('YOU BROUGHT A VILLAGE UP MY LIFT, AND LEFT THEM IN MY BARRACKS.');
      yield steward('NIGHT WATCH. UP. THE OLD ONE FIRST.');
      HA.audio.play('intercom');
      world.camTarget = { x: 24 * 8, y: 14 * 8 };
      yield { wait: 40 };
      // two of the honour guard, out of the bunks
      const guards = [31, 35].map((tx, i) => {
        const e = HA.actors.makeEnemy({ type: '9', x: tx * 8, y: 18 * 8, tx, ty: 18, respawn: -1 });
        Object.assign(e, { prey: g, nightWatch: true, facing: -1, cool: 40 + i * 50 });
        world.enemies.push(e);
        world.burst(e.x + e.w / 2, e.y + 4, ['#c9a050', '#6c7894', '#e8e8ec'], 8, 1.2);
        return e;
      });
      HA.audio.play('telegraph');
      yield { wait: 30 };
      // he steps out in front of the crew
      g.wrench = true;
      yield { walk: g, x: 20 * 8, speed: 1.2 };
      g.homeX = g.x;
      g.facing = 1;
      g.talkable = () => false;
      yield say('OLD GASKET', 'BEHIND ME. ALL OF YOU.');
      yield say('OLD GASKET', f.gasketWrench ? 'I TOOK THE WRENCH OFF ITS HOOK BEFORE WE CAME UP. FOR LUCK.' : 'GOOD THING I NEVER PUT THIS DOWN.');
      world.camTarget = null;
      world.gasketHold = { npc: g, guards, left: HOLD, max: HOLD, state: 'holding', deaths: s.deaths, x0: g.x };
      world.actors.push({ draw: drawHold });
      world.toast('GET BACK TO GASKET', 200);
    },
    // Too slow: they bring him down.
    *gasketFalls(world) {
      const hold = world.gasketHold;
      const g = hold.npc;
      hold.state = 'fallen';
      lost(world, 'gasketBarracks');
      for (const e of hold.guards) e.prey = null;
      world.camTarget = { x: g.x + 4, y: g.y };
      HA.audio.play('lunge');
      world.burst(g.x + 4, g.y + 6, ['#e8434f', '#ffffff', '#8a8f99'], 10, 1.6);
      g.wrench = false;
      g.kneel = true;
      yield { wait: 30 };
      g.kneel = false;
      g.lying = true;
      HA.audio.play('stomp');
      yield { wait: 20 };
      yield* cry(world);
      world.camTarget = null;
      S.addStory(world, 'IN THE BARRACKS THE STEWARD WOKE HIS NIGHT WATCH AND SENT THEM AT OLD GASKET. HE HELD THEM WITH HIS WRENCH AS LONG AS HE COULD. I WAS TOO FAR AWAY.');
      world.save();
    },
    // In time: he's still on his feet.
    *gasketHeld(world) {
      const s = world.state;
      const g = npcOf(world, 'gasket');
      world.gasketHold = null;
      yield { wait: 20 };
      if (g) g.facing = Math.sign(world.player.x - g.x) || 1;
      yield say('OLD GASKET', '...TOOK YOUR TIME.');
      yield say('OLD GASKET', "THIRTY YEARS SINCE I SWUNG THIS AT ANYTHING BUT A PIPE.");
      if (S.gasketTrust(s) >= 3) yield say('OLD GASKET', 'YOU CAME BACK FOR AN OLD MAN. CLEAT WOULD HAVE LIKED YOU.');
      else yield say('OLD GASKET', "GO ON, THEN. NOBODY ELSE COMES UP THAT LIFT TODAY.");
      if (g) g.wrench = false;
      S.addStory(world, 'IN THE BARRACKS THE STEWARD WOKE HIS NIGHT WATCH AND SENT THEM AT OLD GASKET. HE HELD THEM OFF WITH HIS WRENCH UNTIL I GOT BACK TO HIM.');
      world.save();
    },
    // His last words, if the hero comes to him; or, come back later, the crew's.
    *gasketLast(world) {
      const s = world.state;
      const p = world.player;
      const g = npcOf(world, 'gasket');
      const alive = !!world.gasketHold;
      world.gasketHold = null;
      s.flags.gasketLast = true;
      if (!g) return;
      yield { walk: p, x: g.x + (p.x < g.x ? -12 : 12), speed: 1.4 };
      p.facing = Math.sign(g.x - p.x) || 1;
      if (alive) {
        yield { wait: 30 };
        yield say('OLD GASKET', '...THERE YOU ARE.');
        yield say('OLD GASKET', "DON'T LOOK LIKE THAT. I ALWAYS THOUGHT I'D GO FIRST.");
        if (s.flags.gasketSky) {
          yield say('OLD GASKET', 'YOU REMEMBER WHAT YOU PROMISED ME.');
          yield me("I'LL TELL THEM YOU WANTED TO.");
        }
        yield say('OLD GASKET', "COUNT THEM TONIGHT. ALL OF THEM. DON'T SKIP ANYBODY.");
        yield { wait: 90 };
        yield me("HE DIDN'T SAY ANYTHING ELSE.");
      } else {
        const who = S.nameOf(S.crewVoice(s));
        yield say(who, 'HE ASKED WHERE YOU WERE. AT THE END.');
        if (s.flags.gasketSky) yield me("HE NEVER SAW HIS SKY. I'LL TELL THEM HE WANTED TO.");
      }
      yield say(S.nameOf(S.crewVoice(s)), "WE'LL CARRY HIM. GO ON. FINISH IT.");
      yield { fade: 'out', frames: 30 };
      g.state = 'gone';
      yield { wait: 20 };
      yield { fade: 'in', frames: 30 };
      S.addStory(world, alive ? "OLD GASKET SAID HE'D ALWAYS THOUGHT HE'D GO FIRST. HIS LAST WORDS WERE FOR ME: COUNT THEM TONIGHT, ALL OF THEM." : 'OLD GASKET DIED IN THE BARRACKS, BY THE LIFT HE WAS HOLDING FOR ME. HE ASKED WHERE I WAS.');
      world.save();
    },

    // ---- The Helm: his brother's boots ----
    // Marrant comes down off his dais in a dead man's boots, and Gasket can't hold his breath any longer. He goes
    // for him with his wrench, and Marrant turns the sidearm on him. The hero has to break off the fight and pull
    // him back, or keep fighting and lose him.
    *gasketCharge(world) {
      const b = world.boss;
      const g = npcOf(world, 'gasket');
      if (!b || !g) return;
      g.home = g.homeX;
      yield { wait: 10 };
      yield say('OLD GASKET', 'MARRANT.');
      b.facing = Math.sign(g.x - b.x) || -1;
      yield say('OLD GASKET', "THOSE ARE MY BROTHER'S BOOTS.");
      g.wrench = true;
      g.talkable = () => false;
      // out toward him, short of the first console
      const tx = b.x > g.x ? HA.clamp(b.x - 6 * 8, g.x, 21 * 8) : g.x;
      yield { walk: g, x: tx, speed: 1.3 };
      g.homeX = g.x;
      g.facing = Math.sign(b.x - g.x) || 1;
      yield steward('SIT DOWN, OLD MAN.');
      b.hostage = { npc: g, left: AIM, max: AIM, saved: pulledBack, lost: shot };
      world.toast('GASKET! PULL HIM BACK', 200);
    },
    // Too late: Marrant fires.
    *gasketShot(world) {
      const s = world.state;
      const g = npcOf(world, 'gasket');
      world.flash('#e8434f', 6);
      world.shake(3);
      if (g) {
        world.burst(g.x + 4, g.y + 6, ['#e8434f', '#ffffff'], 12, 1.6);
        g.wrench = false;
        g.lying = true;
      }
      yield { wait: 40 };
      yield* cry(world);
      yield steward('I TOLD HIM TO SIT DOWN.');
      S.addStory(world, "AT THE HELM, OLD GASKET WENT FOR THE STEWARD WITH HIS WRENCH. THOSE WERE HIS BROTHER'S BOOTS. MARRANT SHOT HIM BEFORE I COULD GET TO HIM.");
      world.save();
      if (s.flags.gasketSky) S.think(world, "HE NEVER SAW HIS SKY.", 60);
    },
  };

  // Reached in time at the Helm (or Marrant beaten first): back to the crew.
  function pulledBack(world) {
    const s = world.state;
    const g = npcOf(world, 'gasket');
    s.flags.gasketHelm = 'held';
    if (!g) return;
    g.wrench = false;
    g.homeX = g.home !== undefined ? g.home : g.homeX;
    S.bark(world, g, S.gasketTrust(s) >= 3 ? "ALL RIGHT. ALL RIGHT. I'M GOING." : '...FINE. FINE.', 120);
    S.addStory(world, "AT THE HELM, OLD GASKET WENT FOR THE STEWARD WITH HIS WRENCH. THOSE WERE HIS BROTHER'S BOOTS. MARRANT DREW ON HIM, AND I GOT TO GASKET FIRST AND PULLED HIM BACK.");
  }
  function shot(world) {
    lost(world, 'gasketHelm');
    run(world, 'gasketShot');
  }
  // The Steward's fight calls this once he's lost a quarter of himself, in his last phase (bosses/steward.js).
  S.gasketCharge = (world) => {
    const f = world.state.flags;
    if (!S.gasketAlive(world.state) || f.gasketHelm || world.playAs || !npcOf(world, 'gasket')) return;
    f.gasketHelm = 'on';
    run(world, 'gasketCharge');
  };

  // How long he can hold them off, over his head (at the screen's edge, with an arrow, when he's off it).
  function drawHold(g, world, a, cam) {
    const hold = world.gasketHold;
    if (!hold || hold.state !== 'holding' || world.scene) return;
    const n = hold.npc;
    const W = HA.VIEW_W;
    const w = 20;
    let x = Math.round(n.x + 4 - w / 2 - cam.x);
    const y = Math.round(n.y - 8 - cam.y);
    const off = x < 2 ? -1 : x > W - w - 2 ? 1 : 0;
    x = HA.clamp(x, 10, W - w - 10);
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle = '#3a1520';
    g.fillRect(x, y, w, 3);
    g.fillStyle = hold.left < hold.max / 4 && Math.floor(world.time / 6) % 2 ? '#ffffff' : '#ffb84d';
    g.fillRect(x, y, Math.ceil((w * hold.left) / hold.max), 3);
    if (off) HA.font.draw(g, off < 0 ? '<' : '>', off < 0 ? x - 8 : x + w + 3, y - 2, '#ffb84d');
  }

  // The night watch at him, frame by frame: his hold runs down until the hero is there, or both guards are down.
  function updateHold(world) {
    const hold = world.gasketHold;
    if (!hold || world.def.id !== 'barracks' || world.scene || world.player.dead || world.transition) return;
    const s = world.state;
    const g = hold.npc;
    const live = hold.guards.filter((e) => !e.dead);
    if (hold.state === 'holding') {
      if (near(world.player, g, 40, 40) || !live.length) {
        hold.state = 'reached';
        s.flags.gasketBarracks = 'held';
        for (const e of live) e.prey = null;
        S.bark(world, g, live.length ? 'ABOUT TIME!' : '...HUH.', 90);
        world.save();
      } else if (--hold.left <= 0) return run(world, 'gasketFalls');
      // a pike that reaches him stops on his wrench, and rocks him back a step (never far from where he stood)
      for (const e of live) {
        if (e.state !== 'lunge') e.knocked = false;
        else if (e.prey === g && !e.knocked && Math.abs(e.x + e.w / 2 - (g.x + 4)) < 18) {
          e.knocked = true;
          e.timer = 0;
          e.vx = 0;
          world.burst(g.x + 4 + e.facing * 3, g.y + 7, ['#e8434f', '#ffffff'], 4, 1.2);
          HA.audio.play('hit');
          g.x = g.homeX = HA.clamp(g.x + e.facing * 3, hold.x0 - 16, hold.x0 + 16);
        }
      }
      return;
    }
    if (live.length) return;
    if (hold.state === 'reached') run(world, 'gasketHeld');
    else if (hold.state === 'fallen') run(world, 'gasketLast');
  }

  S.areas.push({
    // Talking to him at home, once the main conversations there are done: the next step, if it's due.
    talk(world, npc) {
      const s = world.state;
      const f = s.flags;
      if (npc.id !== 'gasket' || world.def.id !== 'warrens' || f.running || world.nightScene) return null;
      // The wrench: between the reunion and the Gardens, or (missed then) once his grief for Wick has had its say.
      const settled = f.homeAgain && f.broadcastHeard;
      if (!f.gasketWrench && ((f.reunion && f.homeDone && !f.gardens) || settled)) return 'gasketWrench';
      if (f.gasketWrench && settled && !f.gasketCleat) return 'gasketCleat';
      return null;
    },

    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // Out of the Barracks while he was still holding them: a fall plays it again; walking out leaves him.
      const hold = world.gasketHold;
      if (hold) {
        world.gasketHold = null;
        if (hold.state === 'holding' && s.deaths > hold.deaths) f.guardWoke = false;
        else if (hold.state === 'holding') {
          lost(world, 'gasketBarracks');
          S.addStory(world, 'IN THE BARRACKS THE STEWARD WOKE HIS NIGHT WATCH AND SENT THEM AT OLD GASKET. I KEPT GOING.');
          world.save();
        }
      }
      if (id === 'helm' && f.gasketHelm === 'on') delete f.gasketHelm; // a fall at the Helm before it was settled
      if (id !== 'barracks') return;
      if (f.guardWoke && !f.gasketBarracks) f.guardWoke = false; // a game left mid-hold
      // Where he fell, until the hero has been back to him (the crew are still by the lift).
      if (f.gasketBarracks === 'lost' && !f.gasketLast && !f.stewardSeen) {
        const n = S.makeNpc(world, 'gasket', { x: 20 * 8, y: 18 * 8 });
        Object.assign(n, { state: 'out', lying: true, facing: -1, talkable: () => false });
        world.npcs.push(n);
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      updateHold(world);
      // Come back to where he fell, later: the crew's word.
      if (world.def.id === 'barracks' && f.gasketBarracks === 'lost' && !f.gasketLast && !world.gasketHold && !world.scene && !world.player.dead) {
        const g = npcOf(world, 'gasket');
        if (g && near(world.player, g, 30, 24)) run(world, 'gasketLast');
      }
    },
  });

  Object.assign(S.SCENES, SCENES);
})(window.HA);
