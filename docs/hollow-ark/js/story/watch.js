'use strict';
// The last watchman (STORYBOARD.md, "The other side quests", 5). Watch 4's standing orders keep the gate to the
// Drain shut. Thirty years ago the Steward's people thawed four colonists for the watches; three took the dose when
// it came and went up to the Tower, and nobody ever brought the fourth hers, or came back to relieve her. She hides
// in the pipes when the dosed guard come through, shoots the rats, counts the rest, and every night sends her count
// to the Tally Yard, which always answered "RECEIVED, WATCH 4. HOLD." On the way to the Drain she counts the hero
// through, unseen. With the Tallyman broken nobody answers her, so she calls every station on the ship, and once the
// hero is home from the Ballast the Warrens' old speakers carry it: "REQUEST RELIEF." Back in the Watch Gallery
// she has come down out of the pipes to see who heard. The choice: relieve her (tell her nobody is coming; she opens
// her own gate and goes home to the Warrens; Mercy +1), or leave her the gate (Mercy 0), with an order: if the
// Ballast ever comes up the Drain, shut the gate on it. On the run for the sleds it does, and she holds it, and the
// keel stays dry for longer: HA.RUN.watch seconds more on the clock (story/scuttle.js).
// Flags: watchCount (counted through, on the way down), watchCall (her call heard). people.watch: 'relieved' |
// 'held'. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: S.VOICE });
  const FLOOR = (ty) => ty * 8;
  const WATCH = '#cfd8a8'; // her voice, in person and on the speakers
  const watch = (text) => say('WATCH 4', text, WATCH);
  const speakers = (text) => say('THE SPEAKERS', text, WATCH);
  const ROOM = 'watch-gallery';
  const POST = 14; // where she stands in the watch room, between the orders' terminal and the way out
  const LEVER = 4; // the aisle gate's lever, at the back of the watch room
  const WAY_DOWN = 1; // the watch room's west end, out into the City Hold and down to the Drain (it was a hatch)
  const ROOM_EDGE = 23; // walking in this far, she sees the hero
  const HOME = 96; // where she stands in the Warrens: up on the platform over the gate, watching it
  const STEEL = '#8a93a6'; // her rifle: an old crew piece, a long steel barrel on a wooden stock
  const STOCK = '#8a6a4a';
  const QUIET = 90; // frames home has to be quiet (no scene) before her call comes over the speakers

  S.PEOPLE.watch = { name: 'WATCH 4', sprite: 'watch', away: true };
  S.TALK.watch = {};

  // Relieved, or left at her post with orders, or heard on the speakers and never gone back to.
  const fate = (s) => s.people.watch || (s.flags.watchCall ? 'never' : null);
  S.watchFate = fate;
  // At her post, where the hero can find her: from her call until she's relieved (the run never comes this way).
  const atPost = (s) => !!s.flags.watchCall && s.people.watch !== 'relieved' && !s.flags.running;
  // Her call: once the hero is home from the Ballast and has heard everything home was waiting to tell, while the
  // pods still carry the hero back down (before the Tower Lift).
  const callDue = (s) => !s.flags.watchCall && !!s.warrensRaid && S.newsTold(s) && !s.flags.towerUp && !s.flags.running;
  // Left with orders, she holds the gate on the Ballast when it comes up the Drain (the run for the sleds).
  S.watchHolds = (s) => s.people.watch === 'held';

  function eddaLines() {
    return ['I WATCH THE GATE. NOBODY ASKED ME TO.', "THEY KEEP ASKING ME WHAT I'D LIKE TO DO. NOBODY'S ASKED ME THAT SINCE THE STACKS. I'M THINKING ABOUT IT."];
  }
  function postLines() {
    return ['WATCH 4 HOLDS.', 'FOUR HUNDRED AND TWELVE. BACK AGAIN.'];
  }

  const SCENES = {
    // On the way to the Drain: a voice up in the pipes, counting the hero through.
    *watchCount(world) {
      const p = world.player;
      world.state.flags.watchCount = true;
      yield { wait: 20 };
      // dust, shaken down out of the pipes overhead
      for (let i = 0; i < 8; i++) world.particles.push({ x: p.x + p.w / 2 + HA.rand(-24, 24), y: 4 * 8 + HA.rand(0, 6), vx: 0, vy: HA.rand(0.3, 0.8), life: 60, max: 60, color: '#9fb6c8', size: 1, grav: 0.02 });
      yield say('A VOICE, OVERHEAD', '...FOUR HUNDRED AND TWELVE.', WATCH);
      yield me("SOMEONE'S UP IN THE PIPES.");
      yield me('COUNTING ME.');
      S.addStory(world, 'SOMEONE UP IN THE PIPES OVER THE WATCH ROOM COUNTED ME THROUGH TO THE DRAIN: FOUR HUNDRED AND TWELVE.');
    },

    // Home from the Ballast: the Warrens' old speakers, and a voice nobody has heard on them before.
    *watchCall(world) {
      const s = world.state;
      const f = s.flags;
      const p = world.player;
      const gasket = npcOf(world, 'gasket');
      f.watchCall = true;
      yield { wait: 30 };
      HA.audio.play('intercom');
      yield { wait: 24 };
      yield speakers('WATCH 4 TO THE TALLY YARD. WATCH 4 TO THE TALLY YARD.');
      yield { wait: 40 };
      yield speakers('NO ANSWER. WATCH 4 TO ANY STATION. ANY STATION AT ALL.');
      yield speakers('COUNT FOR THE DAY: NONE THROUGH. NONE BACK. WATCH 4 HOLDS.');
      yield speakers('REQUEST RELIEF.');
      HA.audio.play('intercom');
      yield { wait: 60 };
      if (gasket) {
        gasket.facing = Math.sign(p.x - gasket.x) || 1;
        yield say('OLD GASKET', 'NEVER HEARD THAT ONE ON THE SPEAKERS BEFORE.');
      }
      yield me(f.watchCount ? 'I HAVE. IN THE GALLERY OVER THE LONG AISLE, ON THE WAY TO THE DRAIN. SHE COUNTED ME THROUGH.' : 'WATCH 4. THE GALLERY OVER THE LONG AISLE, ON THE WAY TO THE DRAIN.');
      yield me("SHE CALLS THE TALLY YARD. I BROKE ITS WARDEN. THERE'S NOBODY LEFT TO ANSWER HER.");
      if (gasket) yield say('OLD GASKET', "REQUEST RELIEF. SHE SOUNDS LIKE SHE'S BEEN ASKING A LONG TIME.");
      world.toast('THE WATCH GALLERY · WEST, IN THE LABYRINTH', 300);
      S.addStory(world, "THE WARRENS' OLD SPEAKERS CARRIED A CALL FROM WATCH 4, IN THE GALLERY OVER THE LONG AISLE, TO A TALLY YARD THAT NO LONGER ANSWERS: REQUEST RELIEF.");
      world.save();
    },

    // Back in the Watch Gallery: she's come down out of the pipes to see who heard.
    *watchFound(world) {
      const s = world.state;
      const f = s.flags;
      const p = world.player;
      const w = npcOf(world, 'watch');
      if (!w) return;
      w.facing = Math.sign(p.x - w.x) || 1;
      p.facing = Math.sign(w.x - p.x) || -1;
      w.rifle = 'aim';
      HA.audio.play('switch');
      yield { wait: 20 };
      yield watch("HALT. NOBODY THROUGH TO THE DRAIN WITHOUT A STEWARD'S MARK.");
      yield me('I HEARD YOU ON THE SPEAKERS. IN THE WARRENS.');
      yield { wait: 30 };
      yield watch('...SOMEBODY HEARD.');
      w.rifle = 'port';
      yield watch('I KNOW YOU. FOUR HUNDRED AND TWELVE. YOU WENT DOWN THE DRAIN AND NEVER CAME BACK THROUGH. NOBODY COMES BACK THROUGH.');
      yield watch('FOUR HUNDRED AND ELEVEN HAD NO MARK EITHER. HULLFOLK, WITH A TOOLBAG, IN A HURRY. I LET HIM THROUGH.');
      yield me('SOLDER.');
      yield me("SHE'S THIN AS A RAIL. NO PINK IN HER AT ALL. THE RIFLE'S OLDER THAN ANYTHING THE STEWARD'S MEN CARRY.");
      yield watch('ARE YOU MY RELIEF?');
      yield me('WHO WAS MEANT TO RELIEVE YOU?');
      yield watch("THE STEWARD'S PEOPLE THAWED FOUR OF US FOR THE WATCHES. THIRTY YEARS AGO.");
      yield watch('THE OTHER THREE TOOK THE DOSE WHEN IT CAME, AND WENT UP TO THE TOWER. NOBODY BROUGHT ME MINE.');
      yield watch("SO I KEEP THE ORDERS. I SHOOT THE RATS. I COUNT THE REST. WHEN THE DOSED ONES COME THROUGH, I GO UP IN THE PIPES. THEY DON'T SEE ME.");
      yield watch('EVERY NIGHT I SEND THE COUNT TO THE YARD, AND THE YARD SAYS: RECEIVED, WATCH 4. HOLD.');
      yield watch('NOW IT SAYS NOTHING.');
      yield me('THIRTY YEARS. THE STEWARD DOSES EVERYONE HE MEANS TO KEEP, AND HE NEVER SENT HER HERS.');
      yield me('NOBODY WAS EVER COMING FOR HER.');
      const pick = yield {
        choice: {
          prompt: 'WATCH 4, THIRTY YEARS AT THE GATE. NOBODY IS COMING.',
          options: [
            { label: 'RELIEVE HER', confirm: { title: 'TELL HER NOBODY IS COMING?', gain: 'WATCH 4 STOOD DOWN · THE WARRENS', lose: "THE DRAIN'S LAST WATCH" } },
            { label: 'LEAVE HER THE GATE', confirm: { title: 'LEAVE HER AT HER POST?', gain: 'WATCH 4 HOLDS THE DRAIN · ON YOUR ORDERS', lose: 'HER RELIEF' } },
          ],
        },
      };
      if (pick === 0) {
        s.people.watch = 'relieved';
        s.mercy += 1;
        S.addChoice(world, 'I TOLD WATCH 4 NOBODY WAS COMING TO RELIEVE HER, AND RELIEVED HER MYSELF. SHE OPENED HER GATE AND WENT HOME TO THE WARRENS.');
        world.save();
        yield me("NOBODY'S COMING. THE STEWARD NEVER MEANT TO RELIEVE YOU.");
        yield me('SO I WILL. WATCH 4: STAND DOWN.');
        yield { wait: 50 };
        w.rifle = 'down';
        HA.audio.play('land');
        yield watch('...THIRTY YEARS.');
        yield { wait: 30 };
        yield watch('WHAT DO I DO NOW?');
        yield me(S.callName(s) === 'COUNTER' ? "THERE'S A VILLAGE IN THE WARRENS, EAST ALONG THE KEEL. THEY DON'T THINK MUCH OF ME. THEY'LL STILL FEED YOU." : "THERE'S A VILLAGE IN THE WARRENS, EAST ALONG THE KEEL. IT'S WARM. THEY'LL FEED YOU.");
        yield watch('EDDA.');
        w.name = 'EDDA';
        yield say('EDDA', "MY NAME. EDDA VOSS. NOBODY'S SAID IT IN THIRTY YEARS.", WATCH);
        // She leans the rifle by the lever, and goes out through her own gate.
        w.walking = true;
        yield { walk: w, x: (LEVER + 1) * 8, speed: 0.8 };
        w.walking = false;
        w.facing = -1;
        w.rifle = 'none';
        world.watchRifle = true;
        HA.audio.play('clamp');
        yield { wait: 30 };
        if (!f.aisleGate) {
          f.aisleGate = true;
          HA.audio.play('switch');
          yield { wait: 20 };
          HA.audio.play('shutter');
          world.shake(1.5);
          yield me('BELOW US, THE AISLE GATE GRINDS OPEN.');
          yield say('EDDA', 'THIRTY YEARS I KEPT THAT SHUT.', WATCH);
        } else yield say('EDDA', 'YOU LEFT THE GATE OPEN, THE DAY YOU WENT THROUGH. I NEVER SHUT IT AGAIN. NOBODY SAID I HAD TO.', WATCH);
        w.walking = true;
        yield { walk: w, x: WAY_DOWN * 8, speed: 0.8 };
        w.walking = false;
        w.state = 'gone';
        HA.audio.play('clamp');
        yield { wait: 30 };
        yield me('SHE WENT OUT THROUGH HER OWN GATE.');
        S.addStory(world, "WATCH 4 WAS EDDA VOSS, A COLONIST THE STEWARD'S PEOPLE THAWED FOR THE WATCH THIRTY YEARS AGO AND NEVER CAME BACK FOR. I RELIEVED HER, AND SHE WENT HOME TO THE WARRENS.");
        world.save();
        return;
      }
      s.people.watch = 'held';
      S.addChoice(world, 'I LEFT WATCH 4 AT HER GATE, WITH AN ORDER: IF THE BALLAST EVER COMES UP THE DRAIN, SHUT THE GATE ON IT.');
      world.save();
      yield me('WATCH 4 HOLDS.');
      yield watch('...WATCH 4 HOLDS.');
      yield me("AND IF THE BALLAST EVER COMES UP THAT DRAIN, SHUT THE GATE ON IT. THAT'S AN ORDER.");
      yield watch('AN ORDER.');
      yield { wait: 30 };
      yield watch('THIRTY YEARS, AND AN ORDER.');
      w.rifle = 'port';
      yield watch('FOUR HUNDRED AND TWELVE. BACK.');
      yield me("THE FIRST ONE SHE'S EVER COUNTED BACK.");
      w.lines = postLines();
      S.addStory(world, "WATCH 4 IS A COLONIST THE STEWARD'S PEOPLE THAWED FOR THE WATCH THIRTY YEARS AGO, AND NEVER CAME BACK FOR. I LEFT HER AT HER GATE, WITH ORDERS.");
      world.save();
    },
  };

  // ---- The run for the sleds (scuttle.js): the speakers at the sump, as the clock starts ----
  S.watchRun = function* (world, voice) {
    const f = fate(world.state);
    if (f === 'held') {
      HA.audio.play('intercom');
      yield { wait: 20 };
      yield speakers('WATCH 4 TO ANY STATION. THE BALLAST IS COMING UP THE DRAIN.');
      yield speakers('GATE SHUT ON IT, AS ORDERED. THE KEEL IS DRY BEHIND IT. WATCH 4 HOLDS.');
      HA.audio.play('intercom');
      world.runLeft += 60 * HA.RUN.watch;
      world.watchFlash = 150;
      yield say(voice, "SHE'S HOLDING THE WATER OFF THE KEEL. THAT'S TIME, SLEEPER. USE IT!");
    } else if (f === 'never') {
      HA.audio.play('intercom');
      yield { wait: 20 };
      yield speakers('WATCH 4 TO ANY STATION. REQUEST RELIEF.');
      yield me('WATCH 4. STILL ASKING.');
    }
  };
  // At the sleds, Tamp says who came.
  S.watchSleds = function* (world) {
    const f = fate(world.state);
    if (f === 'relieved') {
      yield say('TAMP', 'EDDA COUNTED THE VILLAGE ON. EVERY ONE OF THEM.');
      yield say('EDDA', 'AND ONE MORE.', WATCH);
    } else if (f === 'held') yield say('TAMP', 'THE CREW CALLED WATCH 4 ON THE SPEAKERS TO COME. SHE SAID SHE HAD ORDERS.');
  };

  // ---- In the watch room: her rifle, in her hands or leant by the lever she left it on ----
  function drawWatch(g, world, a, cam) {
    const w = npcOf(world, 'watch');
    if (w && w.state === 'out' && w.rifle && w.rifle !== 'none') {
      const fx = Math.round(w.x + 4 - cam.x);
      const fy = Math.round(w.y - cam.y);
      const d = w.facing || 1;
      g.fillStyle = STEEL;
      if (w.rifle === 'aim') {
        // levelled at chest height
        for (let i = 0; i < 12; i++) g.fillRect(fx + d * i, fy + 8, 1, 1);
        g.fillStyle = STOCK;
        g.fillRect(fx + (d > 0 ? -2 : 0), fy + 8, 3, 2);
      } else if (w.rifle === 'port') {
        // held across the body, muzzle up
        for (let i = 0; i < 10; i++) g.fillRect(fx - d * 3 + d * Math.round(i * 0.6), fy + 11 - i, 1, 1);
        g.fillStyle = STOCK;
        g.fillRect(fx - d * 3 - 1, fy + 10, 2, 2);
      } else if (w.rifle === 'down') {
        // muzzle down, along her leg
        for (let i = 0; i < 9; i++) g.fillRect(fx + d * 3, fy + 5 + i, 1, 1);
        g.fillStyle = STOCK;
        g.fillRect(fx + d * 3 - 1, fy + 4, 2, 2);
      }
    }
    if (world.watchRifle) {
      // leant on the wall by the lever, muzzle up
      const x = Math.round(LEVER * 8 - 6 - cam.x);
      const y = Math.round(FLOOR(19) - cam.y);
      g.fillStyle = STEEL;
      for (let i = 0; i < 13; i++) g.fillRect(x + Math.round(i * 0.25), y - 1 - i, 1, 1);
      g.fillStyle = STOCK;
      g.fillRect(x - 1, y - 4, 2, 4);
    }
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const id = world.def.id;
      world.watchRifle = false;
      if (id === ROOM) {
        world.watchRifle = s.people.watch === 'relieved';
        if (atPost(s)) {
          const w = S.makeNpc(world, 'watch', { x: POST * 8, y: FLOOR(18) });
          Object.assign(w, { state: 'out', facing: 1, rifle: s.people.watch ? 'port' : 'down', lines: postLines(), talkable: (wd, self) => self.state === 'out' && !!wd.state.people.watch });
          world.npcs.push(w);
        }
        world.actors.push({ draw: drawWatch });
      }
      // Home: up on the platform over the Warrens' gate, until the run for the sleds.
      if (id === 'warrens' && s.people.watch === 'relieved' && !s.flags.running && !(s.warrensRaid === 'fell' && !s.flags.wallsOut)) {
        const n = S.makeNpc(world, 'watch', { x: HOME * 8, y: FLOOR(15) });
        Object.assign(n, { name: 'EDDA', state: 'out', facing: 1, lines: eddaLines() });
        world.npcs.push(n);
      }
    },

    update(world) {
      const s = world.state;
      const p = world.player;
      if (world.scene || p.dead || world.transition || world.fade > 0.5 || world.nightScene) {
        world.watchQuiet = 0;
        return;
      }
      world.watchQuiet = (world.watchQuiet || 0) + 1;
      if (world.def.id === 'warrens' && callDue(s) && world.watchQuiet > QUIET) return run(world, 'watchCall');
      if (world.def.id !== ROOM || !atPost(s) || s.people.watch) return;
      if (p.x + p.w / 2 < ROOM_EDGE * 8) run(world, 'watchFound');
    },
  });

  // ---- The endings' cards (endings.js) ----
  S.watchCards = function (s, id) {
    const f = fate(s);
    if (!f) return [];
    const cards = {
      relieved: {
        homecoming: ['EDDA VOSS WALKED OFF THE SHIP WITH THE WARRENS.', 'SHE COUNTED EVERY ONE OF US OUT. THEN SHE STOPPED.'],
        crash: ['EDDA VOSS COUNTED THE VILLAGE ONTO THE SLEDS.', 'ON THE GROUND, SHE NEVER STOOD A WATCH AGAIN.'],
        dominion: ['EDDA VOSS LIVES IN THE WARRENS.', "SHE WON'T STAND A WATCH FOR ME. I'VE ASKED."],
        overgrown: ['EDDA VOSS HAD A FEW WARM DAYS IN THE WARRENS', 'BEFORE THE PINK CAME.'],
      },
      held: {
        homecoming: ['WHEN THE SHIP SET DOWN, WATCH 4 WAS STILL AT HER GATE.', 'SHE ASKED WHO WAS RELIEVING HER.'],
        crash: ['WATCH 4 HELD THE DRAIN SHUT UNTIL THE SHIP CAME DOWN.', 'SHE NEVER ASKED FOR RELIEF AGAIN.'],
        dominion: ['WATCH 4 STILL HOLDS THE GATE. SHE SENDS HER COUNT TO ME.', 'I ANSWER: RECEIVED, WATCH 4. HOLD.'],
        overgrown: ['WATCH 4 COUNTED THE PINK COMING UP THE AISLE.', 'SHE HELD THE GATE ANYWAY.'],
      },
      never: {
        homecoming: ['WHEN THE SHIP SET DOWN, THE OLD SPEAKERS', "WERE STILL ASKING FOR WATCH 4'S RELIEF."],
        crash: ["THE SPEAKERS WERE STILL ASKING FOR WATCH 4'S RELIEF", 'WHEN THE SLEDS FELL AWAY.'],
        dominion: ['EVERY NIGHT, WATCH 4 STILL ASKS FOR HER RELIEF.', "I'VE NEVER ANSWERED."],
        overgrown: ["THE LAST VOICE ON THE SHIP'S SPEAKERS ASKED FOR RELIEF."],
      },
    };
    return cards[f][id] ? [cards[f][id]] : [];
  };
  // Relieved, she lives in the Warrens: outside their twenty, like Sorrel, Cotter and Rivet, and counted with them.
  S.watchCounted = (s) => s.people.watch === 'relieved';

  Object.assign(S.SCENES, SCENES);
})(window.HA);
