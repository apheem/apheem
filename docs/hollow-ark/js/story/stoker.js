'use strict';
// The new stoker (STORYBOARD.md, "The other side quests", 4). The Tower likes to be warm. Overnight, while the crew
// sleep at the camp, the Steward's Fireman comes up the fuel line with someone he's taken from the walls, and chains
// him at Abel's furnace: to stoke beside Abel if he was spared, or in his place if his fires were put out. In the
// morning the hero hears it below. In the Reactor Throat the Fireman offers the Steward's compliments, a sack of
// shards, to walk on by. The choice: unchain him (fight the Fireman, bosses/fireman.js; Rivet goes home to the
// Warrens; Mercy +1 when he's free), or take the sack (Mercy -1; he stays at the fires).
// Flags: rivetHeard (the morning). people.rivet: 'unchain' (said, and the fight not yet won) | 'freed' | 'left'.
// All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: S.VOICE });
  const FLOOR = (ty) => ty * 8;
  const FIRE = '#ffb84d'; // the Fireman's voice
  const ABEL = '#f2a0c8'; // Abel's, from inside the furnace
  const fire = (text) => say('THE FIREMAN', text, FIRE);
  const ROOM = 'reactor-throat';
  const POST = 15; // where the Fireman stands, between the door and his stoker
  const RAIL = 31; // where Rivet is chained, at the furnace mouth
  const HATCH = 4; // the Throat's hatch down to the Piston Run: Rivet's way home
  const LEDGE = 3; // the ladder down from the camp lands on the ledge here: the fight's checkpoint
  const HOME = 105; // where Rivet sits in the Warrens, by the gate, once he's home

  S.PEOPLE.rivet = { name: 'RIVET', sprite: 'rivet', away: true };
  S.TALK.rivet = {};

  // Freed, or left at the fires (the fight never won counts as left), or heard and never gone down to see.
  const fate = (s) => (s.people.rivet === 'freed' ? 'freed' : s.people.rivet ? 'left' : s.flags.rivetHeard ? 'never' : null);
  S.rivetFate = fate;
  // At the fires from the morning until he's freed (not during the run for the sleds, which never comes this way).
  const atFires = (s) => !!s.flags.rivetHeard && s.people.rivet !== 'freed' && !s.flags.running;
  // The morning's sounds follow the night at the camp. A game quit before them hears them at the camp, until the
  // crew have counted themselves off.
  const heardDue = (s) => !!s.flags.campDone && !s.flags.rivetHeard && !!s.people.abel && !s.flags.running;
  const firemanOf = (world) => world.enemies.find((e) => e.type === 'fireman');
  const abelOf = (world) => world.enemies.find((e) => e.type === 'abel') || null;

  function rivetLines(s) {
    if (s.people.rivet === 'freed') return ["IT'S COOL BY THE GATE. I SIT HERE A LOT.", 'THEY ASKED ME TO MIND THE COOKING FIRE. I SAID NO. THEY UNDERSTOOD.'];
    if (s.people.rivet === 'unchain') return ["HE'S STILL GOT THE KEY.", "I CAN'T STOP. I CAN'T."];
    return ["DON'T STOP ME. HE BURNS YOU IF YOU STOP.", '...GO ON, THEN.'];
  }

  // ---- The morning, after the night at the camp ----
  function* heard(world) {
    const s = world.state;
    const ended = s.people.abel === 'ended';
    s.flags.rivetHeard = true;
    yield { wait: 40 };
    HA.audio.play('clamp');
    world.shake(1);
    yield { wait: 26 };
    HA.audio.play('clamp');
    yield { wait: 30 };
    yield me(ended ? 'BELOW, IN THE THROAT: THE FURNACE I QUENCHED YESTERDAY. SOMEONE HAS LIT IT AGAIN.' : "BELOW, IN THE THROAT: TWO SHOVELS. ABEL'S, AND ONE THAT KEEPS STOPPING.");
    yield me('AND A CHAIN, DRAGGING ON THE GRATING.');
    world.toast('THE REACTOR THROAT · DOWN THE HATCH FROM THE CAMP', 300);
    S.addStory(world, (ended ? "IN THE MORNING SOMEONE HAD LIT ABEL'S FURNACE AGAIN" : "IN THE MORNING THERE WERE TWO SHOVELS AT ABEL'S FURNACE") + ', IN THE REACTOR THROAT BELOW THE CAMP. I HEARD A CHAIN.');
    world.save();
  }
  {
    const base = S.SCENES.lightsOut;
    S.SCENES.lightsOut = function* (world) {
      yield* base(world);
      if (heardDue(world.state)) yield* heard(world);
    };
  }

  // The fight: the Fireman takes up his rake. A fall puts the hero back on the ledge by the ladder, and him back
  // at his post; going near him starts it again.
  function* fight(world) {
    const fm = firemanOf(world);
    if (!fm) return;
    HA.audio.play('roar');
    world.shake(3);
    Object.assign(fm, { active: true, fighting: true, state: 'think', timer: 40 });
    world.boss = fm;
    world.checkpoint = { room: ROOM, x: LEDGE * 8, y: FLOOR(8) - world.player.h };
    world.toast("HE'S TOO HEAVY FOR THE CATWALKS", 220);
    world.refreshMusic();
  }

  const SCENES = {
    // A game quit between the night and the morning's sounds.
    *rivetHeard(world) {
      yield* heard(world);
    },

    // The Reactor Throat: the Fireman, his new stoker, and the Steward's compliments.
    *rivetFound(world) {
      const s = world.state;
      const p = world.player;
      const fm = firemanOf(world);
      const rv = npcOf(world, 'rivet');
      const ended = s.people.abel === 'ended';
      if (!fm) return;
      fm.facing = Math.sign(p.x - fm.x) || -1;
      p.facing = Math.sign(fm.x - p.x) || 1;
      yield { wait: 20 };
      yield fire('THE CLIMBER. THE STEWARD SAID YOU MIGHT COME DOWN AND LOOK.');
      yield fire(ended ? 'YOU PUT THE OLD ONE OUT. WE LAID HIM ON HIS BUNK, AND LIT IT AGAIN. THE TOWER LIKES TO BE WARM.' : "THE OLD ONE'S BEEN SLOW SINCE YOU HAD A GO AT HIM, AND THE TOWER LIKES TO BE WARM. SO: A SECOND SHOVEL.");
      if (rv) world.camTarget = { x: rv.x + 4, y: rv.y - 24 };
      yield me("HULLFOLK. CHAINED BY THE ANKLE TO THE FURNACE RAIL. HE HASN'T STOPPED SHOVELLING.");
      yield say('THE NEW STOKER', "DON'T STOP ME. HE BURNS YOU IF YOU STOP.");
      if (s.logs.stokers) yield me('WHEN ONE IS USED UP, TAKE ANOTHER FROM THE WALLS.');
      yield say('RIVET', 'RIVET. I KEPT TO THE WALLS OUT PAST THE BALLAST, ON MY OWN. NOBODY EVER FOUND ME. THEY DID.');
      world.camTarget = null;
      HA.audio.play('clamp');
      world.rivetSack = { x: fm.x + fm.w / 2 + fm.facing * 14, y: FLOOR(19) }; // dropped at his feet
      yield fire("THE STEWARD'S COMPLIMENTS. FOR YOUR TROUBLE.");
      yield fire("GO ON UP. HE'S EXPECTING YOU.");
      const pick = yield {
        choice: {
          prompt: "RIVET, CHAINED AT THE FIRES. THE STEWARD'S SACK.",
          options: [
            { label: 'UNCHAIN HIM', confirm: { title: 'FIGHT THE FIREMAN FOR RIVET?', gain: 'RIVET, GOING HOME', lose: ended ? "THE SACK · THE FURNACE'S FIRE" : 'THE SACK · ABEL STOKES ALONE' } },
            { label: 'TAKE THE SACK', confirm: { title: 'LEAVE RIVET AT THE FIRES?', gain: 'THE SACK OF SHARDS · NO FIGHT', lose: 'RIVET' } },
          ],
        },
      };
      if (pick === 0) {
        s.people.rivet = 'unchain';
        world.save();
        yield me('LET HIM GO.');
        world.rivetSack = null;
        yield fire('...THE STEWARD SAID YOU MIGHT BE STUPID.');
        if (rv) rv.lines = rivetLines(s);
        yield* fight(world);
        return;
      }
      s.people.rivet = 'left';
      s.mercy -= 1;
      S.addChoice(world, "I TOOK THE STEWARD'S SACK OF SHARDS, AND LEFT RIVET CHAINED AT THE FIRES.");
      world.save();
      yield fire('SENSIBLE.');
      // he kicks the sack over, and it bursts at the hero's feet
      world.rivetSack = null;
      HA.audio.play('crate');
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h - 4;
      for (let i = 0; i < 10; i++) world.pickups.push(HA.actors.makeShard(cx, cy, true));
      for (let i = 0; i < 12; i++) world.pickups.push(HA.actors.makeShard(cx, cy, false));
      yield { wait: 40 };
      yield say('RIVET', '...GO ON, THEN.');
      if (!ended) yield say('THE FURNACE', 'TWO SHOVELS. TWO.', ABEL);
      if (rv) rv.lines = rivetLines(s);
      S.addStory(world, "THE STEWARD'S FIREMAN HAD CHAINED A HULLFOLK MAN CALLED RIVET AT ABEL'S FURNACE. HE GAVE ME A SACK OF SHARDS TO WALK ON BY, AND I DID.");
      world.save();
    },

    // Back for the fight, after a fall or a way out of the room.
    *firemanAgain(world) {
      const p = world.player;
      const fm = firemanOf(world);
      if (!fm) return;
      fm.facing = Math.sign(p.x - fm.x) || -1;
      yield { wait: 10 };
      yield fire('BACK FOR MORE?');
      yield* fight(world);
    },

    // The Fireman goes down, and the key to the chain is on his belt.
    *firemanDefeated(world) {
      const s = world.state;
      const p = world.player;
      const fm = firemanOf(world);
      const rv = npcOf(world, 'rivet');
      const ended = s.people.abel === 'ended';
      world.checkpoint = null;
      HA.music.play(null);
      world.barks = [];
      world.boss = abelOf(world);
      if (fm) Object.assign(fm, { active: false, fighting: false, state: 'down', vx: 0 });
      yield { wait: 60 };
      yield fire('...THE STEWARD WILL ONLY SEND FOR ANOTHER.');
      yield me('THEN HE CAN COME DOWN AND FETCH THEM HIMSELF.');
      HA.audio.play('pickup');
      yield me('THE KEY TO THE CHAIN IS ON HIS BELT.');
      if (rv) {
        const side = p.x < rv.x ? -1 : 1;
        yield { walk: p, x: rv.x + side * 14, speed: 1.2 };
        p.facing = -side;
      }
      HA.audio.play('unlock');
      world.shake(1);
      // Free: the deed done, the choice recorded.
      s.people.rivet = 'freed';
      s.mercy += 1;
      S.addChoice(world, 'I BEAT THE FIREMAN FOR RIVET, AND UNCHAINED HIM FROM THE FURNACE.');
      world.save();
      if (rv) {
        rv.chained = false;
        rv.facing = Math.sign(p.x - rv.x) || -1;
      }
      yield { wait: 30 };
      yield say('RIVET', '...I CAN STOP?');
      if (ended) yield me('THE FIRE IS GOING DOWN ALREADY.');
      else {
        yield say('ABEL', 'GO. GO HOME.', ABEL);
        yield say('ABEL', "I'LL KEEP THEM.", ABEL);
        yield me("ABEL. HE HASN'T SAID A WORD BUT THE FIRES SINCE I BEAT HIM.");
      }
      yield say('RIVET', "THE WARRENS. GASKET'S LOT, BEHIND THEIR GATE. WILL THEY HAVE ME?");
      yield me(S.callName(s) === 'COUNTER' ? "THEY DON'T THINK MUCH OF ME. THEY'LL STILL TAKE YOU IN." : "THEY TOOK ME IN. THEY'LL TAKE YOU.");
      yield say('RIVET', 'THEN I KNOW THE WAY. DOWN THE SPINE, AND WEST ALONG THE KEEL.');
      if (rv) {
        rv.walking = true;
        yield { walk: rv, x: HATCH * 8, speed: 0.9 };
        rv.walking = false;
        rv.state = 'gone';
        HA.audio.play('clamp');
      }
      S.addStory(world, "THE STEWARD'S FIREMAN HAD CHAINED A HULLFOLK MAN CALLED RIVET AT ABEL'S FURNACE. I BEAT THE FIREMAN AND UNCHAINED HIM, AND HE WENT HOME TO THE WARRENS.");
      world.refreshMusic();
      world.save();
    },
  };

  // ---- At the furnace: the chain, the shovel, the coal at his feet, and the sack ----
  function drawThroat(g, world, a, cam) {
    const rv = npcOf(world, 'rivet');
    const t = world.time;
    const fl = Math.round(FLOOR(19) - cam.y);
    // coal spilled from the fuel line, at the furnace's foot
    g.fillStyle = '#10121c';
    g.fillRect(Math.round(RAIL * 8 + 9 - cam.x), fl - 3, 12, 3);
    g.fillStyle = '#2a2428';
    g.fillRect(Math.round(RAIL * 8 + 11 - cam.x), fl - 4, 7, 2);
    // the rail on the furnace's face
    g.fillStyle = '#6c7894';
    g.fillRect(Math.round(33 * 8 - 2 - cam.x), fl - 9, 2, 6);
    if (rv && rv.state !== 'gone') {
      const fx = Math.round(rv.x + 4 - cam.x);
      const fy = Math.round(rv.y + rv.h - cam.y);
      if (rv.chained) {
        // the chain, ankle to rail, sagging
        g.fillStyle = '#8a8f99';
        const x0 = fx;
        const x1 = Math.round(33 * 8 - 2 - cam.x);
        for (let x = x0; x < x1; x += 2) g.fillRect(x, fy - 2 + Math.round(Math.sin(((x - x0) / Math.max(1, x1 - x0)) * Math.PI) * 2), 1, 1);
        // the shovel: down into the coal, then up and into the mouth
        const swing = Math.sin(t * 0.09);
        const sx = fx + 3 + Math.round(swing * 3);
        const sy = fy - 7 - Math.round(Math.max(0, swing) * 5);
        g.fillStyle = '#5a4028';
        g.fillRect(sx, sy, 6, 1);
        g.fillStyle = '#6c7894';
        g.fillRect(sx + 5, sy - 1, 3, 3);
        if (swing > 0.9) {
          g.fillStyle = '#ff9b3d';
          g.fillRect(sx + 6, sy - 2, 1, 1);
        }
      }
    }
    if (world.rivetSack) {
      const x = Math.round(world.rivetSack.x - cam.x);
      const y = Math.round(world.rivetSack.y - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x - 4, y - 7, 9, 7);
      g.fillStyle = '#7a5a3a';
      g.fillRect(x - 3, y - 6, 7, 6);
      g.fillStyle = '#5fd4e8';
      g.fillRect(x - 1, y - 8, 2, 2);
    }
  }
  function updateThroat(world) {
    const rv = npcOf(world, 'rivet');
    if (!rv || !rv.chained || world.time % 50) return;
    // a shovelful into the mouth: sparks
    for (let i = 0; i < 3; i++) world.particles.push({ x: 33 * 8 - 4, y: FLOOR(19) - 10, vx: HA.rand(0.2, 0.8), vy: HA.rand(-1.2, -0.4), life: 16, max: 16, color: i % 2 ? '#ff9b3d' : '#fff0a8', size: 1, grav: 0.05 });
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // Out of the Throat mid-fight, the checkpoint goes too: he's back at his post next time.
      if (id !== ROOM && world.checkpoint && world.checkpoint.room === ROOM) world.checkpoint = null;
      world.rivetSack = null;
      world.rivetBarked = false;
      if (id === ROOM) {
        // Abel ended, they laid him on his bunk: the furnace is lit again while someone stokes it.
        const abel = abelOf(world);
        if (abel && s.people.abel === 'ended' && f.rivetHeard) Object.assign(abel, { moved: true, relit: atFires(s) });
        if (atFires(s)) {
          const rv = S.makeNpc(world, 'rivet', { x: RAIL * 8, y: FLOOR(18) });
          Object.assign(rv, { state: 'out', facing: 1, chained: true, lines: rivetLines(s), talkable: (w, self) => self.state === 'out' && !!w.state.people.rivet && !(w.boss && w.boss.fighting) });
          world.npcs.push(rv);
          const fm = HA.bosses.fireman.make(world, POST * 8 + 4, FLOOR(19));
          world.enemies.push(fm);
          world.actors.push({ draw: drawThroat, update: updateThroat });
        }
      }
      // Home: by the Warrens' gate, where it's cool, until the run for the sleds.
      if (id === 'warrens' && s.people.rivet === 'freed' && !f.running && !(s.warrensRaid === 'fell' && !f.wallsOut)) {
        const n = S.makeNpc(world, 'rivet', { x: HOME * 8, y: FLOOR(18) });
        Object.assign(n, { state: 'out', facing: -1, kneel: true, lines: rivetLines(s) });
        world.npcs.push(n);
      }
    },

    update(world) {
      const s = world.state;
      const p = world.player;
      if (world.scene || p.dead || world.transition || world.fade > 0.5 || world.nightScene) return;
      if (world.def.id === 'crew-camp' && heardDue(s) && !s.flags.verdict) return run(world, 'rivetHeard');
      if (world.def.id !== ROOM || !atFires(s)) return;
      const fm = firemanOf(world);
      if (!fm || fm.fighting || fm.state === 'down') return;
      // Through the shutter, from the ladder or the hatch: he's seen them.
      const inside = p.x + p.w / 2 > 8 * 8;
      if (!s.people.rivet && inside) return run(world, 'rivetFound');
      if (s.people.rivet === 'unchain' && inside) return run(world, 'firemanAgain');
      if (s.people.rivet === 'left' && Math.abs(p.x + p.w / 2 - (fm.x + fm.w / 2)) < 60 && !world.rivetBarked) {
        world.rivetBarked = true;
        S.bark(world, fm, "GO ON UP. HE'S EXPECTING YOU.", 150, { color: FIRE });
      }
    },
  });
  // His fight has the Bailiff's track (the Steward's men). This comes before the Spine's own, which keeps the
  // Throat quiet once Abel is settled.
  S.areas.unshift({
    music(world) {
      const b = world.boss;
      if (world.def.id === ROOM && b && b.type === 'fireman' && b.fighting) return 'boss';
      return undefined;
    },
  });

  // ---- The endings' cards (endings.js) ----
  S.rivetCards = function (s, id) {
    const f = fate(s);
    if (!f) return [];
    const cards = {
      freed: {
        homecoming: ['RIVET WALKED OUT OF THE SHIP WITH THE WARRENS.', 'HE SAID THE WIND WAS THE COOLEST THING HE EVER FELT.'],
        crash: ['RIVET RODE THE SLEDS DOWN WITH THE WARRENS.', 'HE NEVER SAT NEAR A FIRE AGAIN.'],
        dominion: ['RIVET KEEPS TO THE WALLS AGAIN.', 'WHEN MY WARDENS GO DOWN, HE HIDES.'],
        overgrown: ['RIVET GOT HOME', 'BEFORE THE PINK CAME FOR EVERYONE.'],
      },
      left: {
        homecoming: ['WHEN THE SHIP SET DOWN, RIVET WAS STILL AT THE FIRES.', 'SOMEBODY ELSE WENT BACK TO UNCHAIN HIM.'],
        crash: ['THE FURNACE WAS STILL BURNING WHEN THE SLEDS FELL AWAY.', 'SO WAS RIVET.'],
        dominion: ['THE TOWER IS WARM.', 'RIVET STILL FEEDS THE FIRES. I SEND HIM HIS DOSE.'],
        overgrown: ['RIVET STOKED UNTIL THE PINK CAME UP THE SPINE.'],
      },
      never: {
        homecoming: ['WHEN THE SHIP SET DOWN, THE FURNACE WAS STILL BURNING.', 'I NEVER WENT DOWN TO SEE WHO WAS FEEDING IT.'],
        crash: ['THE FURNACE WAS STILL BURNING WHEN THE SLEDS FELL AWAY.', 'I NEVER WENT DOWN TO SEE WHO WAS FEEDING IT.'],
        dominion: ['THE TOWER IS WARM.', "I'VE NEVER ASKED WHO FEEDS THE FIRES."],
        overgrown: ['THE FURNACE WENT OUT WHEN THE PINK CAME UP THE SPINE.'],
      },
    };
    return cards[f][id] ? [cards[f][id]] : [];
  };
  // Freed, he's outside the Warrens' twenty, like Sorrel and Cotter: counted wherever the village is.
  S.rivetCounted = (s) => s.people.rivet === 'freed';

  Object.assign(S.SCENES, SCENES);
})(window.HA);
