'use strict';
// The tram home (3.10, the story audit's fix 5; STORYBOARD.md, "The tram home"). Once the motor is in, the hero
// rides the keel tram west to the Warrens, with Solder or with her news, and sees what the raid left. Then the hero
// rides back east with the climbers: to the Spine Foot, or, with the keel flooded behind Solder (lock 1), as far
// as the Ballast stop and on through the Overflow Pipes, the crew coming behind. Before that, Gasket gives the hero
// time to say goodbye at Mara's pod (story.js) and to sleep at home (Flux's morning, in cargo.js).
// Flags: tramWest (rode home), tramWaits (the climbers are packed, and the tram east is in the sump), maraBye,
// tramEast (rode east with them). A save from before this, with the tram gone (tram without tramWest), keeps the
// old way: the crew follow on the tram by themselves.
(function (HA) {
  const S = HA.story;
  const run = S.run;
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const name = (w) => S.callName(w.state);
  const FLOOR = (ty) => (ty - 1) * 8; // a person stands on map row ty
  const alive = (s) => s.people.solder === 'alive';
  const dry = (s) => s.people.solder !== 'dead'; // the keel line past the Ballast stop floods if she was left
  const leader = (s) => (alive(s) ? 'SOLDER' : 'OLD GASKET');

  // Between riding home and riding east with the climbers, the ways on to the Spine wait for them.
  S.tramHeld = (s) => (s.flags.tramWest && !s.flags.tramEast ? 'NOT WITHOUT THE CLIMBERS. THE TRAM WAITS IN THE SUMP.' : null);

  // Has home told the hero everything it was waiting to? (The raid, Solder, Flux: ballast.js and cargo.js.)
  function newsTold(s) {
    const f = s.flags;
    if (s.warrensRaid && !f.raidSeen) return false;
    if (s.people.solder === 'dead' && !f.solderMourned) return false;
    if (s.people.flux === 'home' && !f.fluxHome) return false;
    if (s.people.flux === 'stripped' && s.logs.lists && !f.fluxNamed) return false;
    return true;
  }

  function stand(world, id, tx, ty, lines) {
    const n = S.makeNpc(world, id, { x: tx * 8, y: FLOOR(ty) });
    if (id === 'flux') n.name = 'FLUX';
    n.state = 'out';
    n.lines = lines;
    world.npcs.push(n);
    return n;
  }
  // A few of the climbers on a platform (in the sump, not Solder, who waits by the car).
  function standCrew(world, spots, lines, solder = true) {
    const crew = S.crewList(world.state).filter((id) => solder || id !== 'solder');
    spots.forEach(([tx, ty], i) => crew[i] && stand(world, crew[i], tx, ty, [lines[i % lines.length]]));
  }

  // From the winch (ballast.js): into the car, and west under the ship to the sump.
  S.rideWest = function* (world) {
    const s = world.state;
    const p = world.player;
    const n = npcOf(world, 'solder');
    const riders = alive(s) ? 2 : 1;
    // Solder gets in first, at the car's front door, and takes the front window; then the hero, and only
    // then does it go.
    world.tramRiders = 0;
    if (n && alive(s)) {
      yield { walk: n, x: 23 * 8, speed: 0.8 };
      n.state = 'gone';
      world.tramRiders = 1;
      HA.audio.play('clamp');
      yield { wait: 20 };
    }
    yield { walk: p, x: 27 * 8, speed: 1 };
    p.hidden = true;
    world.tramRiders++;
    HA.audio.play('clamp');
    yield { wait: 30 };
    world.tramGo = 1;
    yield { wait: 90 };
    yield { fade: 'out', frames: 40 };
    world.holdFade = true;
    yield { card: ['THE KEEL TRAM TOOK ' + (alive(s) ? 'US' : 'ME') + ' WEST,', 'UNDER THE BALLAST, UNDER THE LABYRINTH.'], hold: 170, pic: 'tram', picOpts: { riders } };
    yield { card: alive(s) ? ['SOLDER SLEPT THE WHOLE WAY.', "SHE SAYS SHE DIDN'T."] : ['I RODE IT ALONE,', 'AND KEPT HER SEAT.'], hold: 160, pic: 'tram', picOpts: { riders } };
    s.flags.tramWest = true;
    world.tramGo = 0;
    world.tramRiders = 0;
    p.hidden = false;
    world.enterRoom('sump', 60 * 8, 19 * 8 - p.h, { facing: -1 });
    world.holdFade = false;
    yield { fade: 'in', frames: 40 };
    if (alive(s)) {
      yield say('SOLDER', "HOME. GO UP AND TELL THEM WE'RE BACK. I'LL GET THE CAR TURNED ROUND.");
      S.addStory(world, 'SOLDER AND I FITTED THE MOTOR, AND THE KEEL TRAM TOOK US HOME TO THE WARRENS. THE CLIMBERS WILL RIDE IT BACK EAST.');
    } else {
      yield me('HOME. THE LADDER UP IS RIGHT THERE. I STAND AT THE BOTTOM OF IT FOR A WHILE.');
      S.addStory(world, "I FITTED THE MOTOR ALONE, AND RODE THE KEEL TRAM HOME TO THE WARRENS WITH SOLDER'S NEWS. THE KEEL LINE FLOODED BEHIND ME: WITHOUT SOLDER, NOBODY HELD THE CULVERT.");
    }
    S.setLead(world, 'GO UP TO THE VILLAGE. THE TRAM WILL WAIT IN THE SUMP');
    world.save();
  };

  const SCENES = {
    // Home, once the news is told: the climbers pack, and Gasket gives the hero time.
    *tramWaits(world) {
      const s = world.state;
      const f = s.flags;
      const g = npcOf(world, 'gasket');
      f.tramWaits = true;
      yield { wait: 30 };
      if (g) g.facing = Math.sign(world.player.x - g.x) || 1;
      yield say('OLD GASKET', "THE CLIMBERS ARE PACKING. THEY'LL BE ON THE TRAM BEFORE YOU'RE DOWN THERE.");
      if (!f.maraBye) yield say('OLD GASKET', "SHIM SAYS THERE'S ONE STILL UNDER GLASS UP WHERE YOU WOKE. GO AND SEE THEM BEFORE THE CLIMB, IF YOU WANT. THE TRAM WAITS.");
      yield say('OLD GASKET', 'AND SLEEP FIRST, IF YOU NEED IT. NOBODY CLIMBS WELL TIRED.');
      S.addStory(world, "THE CLIMBERS ARE PACKING FOR THE SPINE, AND THE TRAM WAITS FOR THEM IN THE SUMP. GASKET SAYS THERE'S TIME TO GO UP TO MARA'S POD FIRST.");
      S.setLead(world, 'TAKE THE CLIMBERS EAST ON THE TRAM, FROM THE SUMP');
      world.save();
    },

    // The sump's tram (its 't'): everyone on, and east.
    *tramEast(world) {
      const s = world.state;
      const f = s.flags;
      const p = world.player;
      const n = S.crewOf(s);
      const who = leader(s);
      const lead = npcOf(world, alive(s) ? 'solder' : 'gasket');
      if (lead) lead.facing = Math.sign(p.x - lead.x) || 1;
      if (n < 5) yield say(who, "THERE AREN'T MANY OF US. SOME WOULDN'T COME. NOT FOR " + name(world) + '.');
      else yield say(who, 'MORE OF US THAN I THOUGHT. ' + (alive(s) ? 'GASKET COUNTED THEM ONTO THE TRAM TWICE.' : 'I COUNTED THEM ONTO THE TRAM TWICE.'));
      yield say(who, 'EVERYONE ON. HOLD ON TO SOMETHING.');
      yield { fade: 'out', frames: 40 };
      world.holdFade = true;
      HA.audio.play('crane');
      const riders = Math.min(n + 1, 8);
      yield { card: ['THE KEEL TRAM TOOK US EAST,', 'ALL THE WAY UNDER THE SHIP.'], hold: 170, pic: 'tram', picOpts: { riders } };
      yield { card: n < 5 ? ['THERE WERE SEATS TO SPARE.'] : ["THERE WEREN'T SEATS ENOUGH.", 'NOBODY MINDED.'], hold: 150, pic: 'tram', picOpts: { riders } };
      f.tramEast = true;
      if (dry(s)) world.enterRoom('spine-foot', 21 * 8, 38 * 8 - p.h, { facing: 1 });
      else world.enterRoom('tram-station', 26 * 8, 19 * 8 - p.h, { facing: 1 });
      world.holdFade = false;
      yield { fade: 'in', frames: 40 };
      if (dry(s)) {
        yield say(who, 'THE FOOT OF THE SPINE. GO ON UP, ' + name(world) + '.');
        yield say(who, "A LIFT A LANDING: YOU CLIMB, WE BUILD BEHIND YOU. WE'LL HAVE THE FIRST ONE UP TO THE BOILER LANDING BY THE TIME YOU'RE THERE.");
        S.addStory(world, n < 5 ? 'THE CLIMBERS RODE THE KEEL TRAM EAST WITH ME, TO THE FOOT OF THE ENGINE SPINE. NOT MANY OF THEM.' : 'THE CLIMBERS RODE THE KEEL TRAM EAST WITH ME, TO THE FOOT OF THE ENGINE SPINE. MORE OF THEM THAN I HAD HOPED.');
        S.setLead(world, 'CLIMB THE ENGINE SPINE. THE CREW WILL BUILD BEHIND YOU');
      } else {
        yield say('OLD GASKET', "THE WATER'S OVER THE LINE PAST HERE. WE CAN'T TAKE THE TRAM ANY FURTHER.");
        yield me("THE OVERFLOW PIPES. I'LL GO FIRST AND CLEAR THEM.");
        yield say('OLD GASKET', 'THEN WE COME BEHIND YOU. SLOWLY. THE OLD ONES WILL NEED A HAND ON THE LADDERS.');
        S.addStory(world, 'THE CLIMBERS RODE THE KEEL TRAM EAST WITH ME AS FAR AS THE BALLAST STOP. PAST IT THE KEEL LINE IS UNDER WATER: WITHOUT SOLDER, NOBODY HELD THE CULVERT. THE WAY TO THE SPINE IS THROUGH THE OVERFLOW PIPES, AND THE CREW ARE COMING BEHIND ME.');
        S.setLead(world, 'GO DOWN THROUGH THE OVERFLOW PIPES TO THE SPINE. THE CREW WILL COME BEHIND YOU');
      }
      world.save();
    },
  };

  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (!f.tramWest || f.crewCame) return;
      // The sump: Solder with the car, and once they're packed, the climbers on the platform (who saw off whatever
      // was down here).
      if (id === 'sump' && !f.tramEast) {
        if (alive(s)) {
          const n = stand(world, 'solder', 63, 19, [f.tramWaits ? "EVERYONE WHO'S COMING IS HERE. SAY WHEN." : 'GO UP. THEY NEED TO SEE YOU FIRST.']);
          n.facing = -1;
        }
        if (f.tramWaits) {
          world.enemies.length = 0;
          standCrew(world, [[42, 19], [45, 19], [66, 19], [69, 19], [72, 19]], ['WE ALL FIT. PROBABLY.', 'GASKET COUNTED US TWICE.', "I'VE NEVER BEEN ON ANYTHING THAT MOVES.", 'SAY WHEN, ' + name(world) + '.'], false);
        }
      }
      // Off the tram with the hero: at the Spine Foot, or at the Ballast stop if the keel is flooded.
      if (id === 'spine-foot' && f.tramEast && dry(s)) standCrew(world, [[23, 38], [28, 38], [33, 38]], ['GO ON UP. WE BUILD BEHIND YOU.', "WE'LL HAVE THE LIFT UP BEFORE YOU KNOW IT."]);
      if (id === 'tram-station' && f.tramEast && !dry(s)) standCrew(world, [[31, 19], [33, 19], [36, 19]], ["GO ON. WE'LL FIND YOU AT THE TOP OF THE PIPES.", "WE'RE RIGHT BEHIND YOU."]);
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      if (world.def.id !== 'warrens' || !f.tramWest || f.tramWaits || f.running) return;
      if (world.scene || world.player.dead || world.transition || world.fade > 0.5) return;
      if (newsTold(s)) run(world, 'tramWaits');
    },
  });

  Object.assign(S.SCENES, SCENES);
})(window.HA);
