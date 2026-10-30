'use strict';
// The Flooded Ballast's story (Phase 3.4): finding Solder with the tram motor and a bad leg, her Foam Sprayer, the
// walk to Odell's Workshop and his pressure boots, the Silt Mother, the flood (the valves open by themselves), the
// Jammed Hatch (choice 9) and the keel tram. While the hero is down here the Bloomsworn raid the Warrens, and the
// gate holds or falls by choice 5. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const NAV = '#b8f4ff';
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const ROOMS = new Set(['silt-tank', 'settling-pools', 'valve-hall', 'long-culvert', 'jammed-hatch']); // where Solder walks with the hero, after the Silt Mother
  // The flood, on the ship grid in pixels: it comes up from four rows under the Valve Hall's floor (so Solder is on
  // her way before it reaches her feet) to the top of the Jammed Hatch, in 45 seconds.
  const FLOOD = { start: (184 + 42 + 4) * 8, top: (207 + 5) * 8, frames: 2700 };
  const LIMP = 0.8; // Solder's pace, at its best

  Object.assign(S.LOGS, {
    valves: {
      title: 'BALLAST CONTROL · YEAR 312',
      text: 'VALVES 1-9 OPENED ON NAVIGATOR AUTHORITY. NO HUMAN COMMAND RECEIVED.',
    },
  });

  // ---- Solder, limping along behind the hero: she walks the floor, steps up one tile at a time, wades, and if
  // the hero gets more than a screen ahead she stops and calls. ----
  const blocked = (room, b) => {
    for (let ty = Math.floor(b.y / 8); ty <= Math.floor((b.y + b.h - 0.01) / 8); ty++) {
      for (let tx = Math.floor(b.x / 8); tx <= Math.floor((b.x + b.w - 0.01) / 8); tx++) {
        const t = room.tile(tx, ty);
        if (t === HA.room.SOLID || t === HA.room.CRATE) return true;
      }
    }
    return false;
  };
  function limp(world, n) {
    const p = world.player;
    const room = world.room;
    const gap = p.x - n.x;
    if (Math.abs(gap) > HA.VIEW_W && !n.lost) {
      n.lost = true;
      S.bark(world, n, 'SLEEPER! WAIT! I CAN\'T SEE YOU!');
    } else if (n.lost && Math.abs(gap) < 200) n.lost = false;
    const want = !n.lost && !world.scene && Math.abs(gap) > 18 ? Math.sign(gap) : 0;
    const wet = room.tile(Math.floor((n.x + 4) / 8), Math.floor((n.y + n.h - 2) / 8)) === HA.room.WATER;
    const step = n.t % 24 < 7 ? 0.35 : 1; // the bad leg
    n.vx = want * LIMP * step * (wet ? 0.7 : 1);
    n.vy = Math.min((n.vy || 0) + 0.3, 4);
    const hit = HA.room.move(room, n, n.vx, n.vy);
    if (hit.down) n.vy = 0;
    if ((hit.left || hit.right) && want) {
      // one tile up, if there's room for her there
      const up = { x: n.x + want * 2, y: n.y - 9, w: n.w, h: n.h };
      if (!blocked(room, up)) {
        n.y -= 9;
        HA.room.move(room, n, want * 2, 0);
      }
    }
    n.walking = want !== 0;
    if (want) n.facing = want;
    n.homeX = n.x;
    n.homeY = n.y;
  }

  // Solder in a room of the escort, caught up behind the hero.
  function placeSolder(world, x) {
    const p = world.player;
    let n = npcOf(world, 'solder');
    if (!n) {
      n = S.makeNpc(world, 'solder', { x: 0, y: 0 });
      world.npcs.push(n);
    }
    n.x = HA.clamp(x === undefined ? p.x - p.facing * 16 : x, 2, world.room.pw - 12);
    n.y = p.y + p.h - n.h;
    Object.assign(n, { vy: 0, follow: false, limping: true, motor: true, state: 'out', lost: false, under: 0, homeX: n.x, homeY: n.y });
    n.lines = ["I'M RIGHT BEHIND YOU. SLOWLY."];
    return n;
  }

  // The tram motor: on the floor by Pump 3, or on Solder's back.
  function drawMotor(g, x, y) {
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 8, 7);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 1, y + 1, 6, 5);
    g.fillStyle = '#a8743a';
    g.fillRect(x + 1, y + 1, 6, 1);
    g.fillStyle = '#6c7894';
    g.fillRect(x + 3, y + 3, 2, 2);
  }

  // ---- The flood ----
  function startFlood(world) {
    world.floodLevel = FLOOD.start;
    world.floodRow = null;
    world.state.flags.flooding = true;
    world.refreshMusic();
    applyFlood(world);
    // A fall in the flood comes back to the Valve Hall, with Solder and the water down, not to the last rest pod.
    world.checkpoint = { room: 'valve-hall', x: 6 * 8, y: 42 * 8 - world.player.h, reset: endFlood };
  }
  // The water goes down as fast as it came, and Solder is back by the hero in the Valve Hall.
  function endFlood(world) {
    world.state.flags.flooding = false;
    world.state.flags.solderWith = true;
    world.floodLevel = undefined;
    world.checkpoint = null;
    const room = world.room;
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) if (room.tile(tx, ty) === HA.room.WATER) room.set(tx, ty, HA.room.EMPTY);
    room.hasWater = room.hasLiquid = false;
    if (world.def.id === 'valve-hall' && !npcOf(world, 'solder')) placeSolder(world);
    world.refreshMusic();
  }
  // Every tile at or under the water line is water now (doors and walls stay as they are).
  function applyFlood(world) {
    const room = world.room;
    const local = world.floodLevel - world.def.gy * 8;
    let ty = world.floodRow === null || world.floodRow === undefined ? room.h - 1 : world.floodRow;
    for (; ty >= 0 && ty * 8 + 4 >= local; ty--) {
      for (let tx = 0; tx < room.w; tx++) if (room.tile(tx, ty) === HA.room.EMPTY) room.set(tx, ty, HA.room.WATER);
    }
    world.floodRow = ty;
    room.hasWater = room.hasLiquid = true;
  }
  function updateFlood(world) {
    if (world.scene || world.player.dead || world.transition) return;
    world.floodLevel -= (FLOOD.start - FLOOD.top) / FLOOD.frames;
    applyFlood(world);
    if (world.time % 90 === 0) HA.audio.play('rumble');
    // Solder can't swim with that leg: under for more than two seconds and the water has her. The water at the top
    // of the hatch, or Solder lost on the way, ends it too (never a clock stopped at 0:00 with nothing happening).
    const n = npcOf(world, 'solder');
    if (n) {
      const head = world.room.tile(Math.floor((n.x + 4) / 8), Math.floor((n.y + 3) / 8)) === HA.room.WATER;
      n.under = head ? n.under + 1 : 0;
      if (n.under === 1) S.bark(world, n, 'SLEEPER! THE WATER!', 80);
    }
    if (!n || n.under > 130 || world.floodLevel <= FLOOD.top) run(world, 'floodFail');
  }
  // How long until the water reaches the top of the hatch, shown while the flood rises.
  function drawFlood(g, world) {
    if (!world.state.flags.flooding || world.floodLevel === undefined) return;
    const secs = Math.max(0, Math.ceil(((world.floodLevel - FLOOD.top) / (FLOOD.start - FLOOD.top)) * (FLOOD.frames / 60)));
    const text = 'WATER RISING · 0:' + String(secs).padStart(2, '0');
    const w = HA.font.measure(text) + 8;
    const x = Math.round((HA.VIEW_W - w) / 2);
    g.fillStyle = 'rgba(5,6,13,0.75)';
    g.fillRect(x, 4, w, 12);
    HA.font.draw(g, text, x + 4, 6, secs <= 10 && Math.floor(world.time / 15) % 2 ? '#ff8a8a' : '#6fd0b8');
  }

  // ---- The scenes ----
  const SCENES = {
    // 1. Found: Solder, by Pump 3, with the motor and a leg that won't hold her.
    *found(world) {
      const s = world.state;
      const p = world.player;
      const solder = npcOf(world, 'solder');
      s.flags.solderFound = true;
      if (!solder) return;
      solder.facing = -1;
      solder.kneel = true;
      yield { wait: 20 };
      yield say('SOLDER', 'TOOK YOU LONG ENOUGH. HELP ME CARRY THIS.');
      yield me('THE TRAM MOTOR. AND HER LEG, OUT STRAIGHT IN FRONT OF HER.');
      yield say('SOLDER', 'THE LADDER WAS WET. THE LEG LOST. THE MOTOR WAS FINE, SO THAT IS SOMETHING.');
      if (s.flags.toolbag) {
        yield me('I GIVE HER THE TOOLBAG.');
        yield say('SOLDER', '...YOU CARRIED MY BAG ALL THE WAY DOWN HERE.');
        yield say('SOLDER', "DON'T TELL ANYONE I SAID THIS. THANK YOU.");
        s.flags.toolbagBack = true;
      }
      yield say('SOLDER', 'HERE. MADE IT FOR THE BATH. DON\'T ASK.');
      // the Foam Sprayer
      if (!p.weapons.some((w) => w.id === 'foam')) {
        p.weapons.push(HA.weapons.make('foam'));
        p.wi = p.weapons.length - 1;
        world.weaponBanner = 160;
        HA.audio.play('pickup');
        S.onWeapon(world, 'foam');
        world.toast('FOAM SPRAYER · {fire} ON WATER OR SILT SETS A PLATFORM', 300);
      }
      yield say('SOLDER', 'FOAM. IT SETS ON WATER, AND ON THE PINK SILT TOO. IT WILL HOLD YOU UP FOR A FEW SECONDS. AFTER THAT, SWIM.');
      yield say('SOLDER', 'THE TRAM WINCH IS AT THE KEEL STATION, PAST THE SILT TANK. THE WAY THERE IS DOWN THROUGH THE TANKS.');
      yield say('SOLDER', 'YOU FLOAT IN THAT SUIT. YOU NEED TO SINK. ODELL KEPT PRESSURE BOOTS IN HIS WORKSHOP, ACROSS THE TANK FARM.');
      yield say('SOLDER', 'COME ON. I CAN LIMP THAT FAR.');
      solder.kneel = false;
      s.flags.solderWalk = true;
      S.setLead(world, "WALK WITH SOLDER TO ODELL'S WORKSHOP");
      S.addStory(world, "I FOUND SOLDER IN THE PUMP GALLERY WITH THE TRAM MOTOR AND A BAD LEG. SHE GAVE ME A FOAM SPRAYER. 'MADE IT FOR THE BATH.'");
      Object.assign(solder, { limping: true, lines: ["I'M RIGHT BEHIND YOU. SLOWLY."] });
      world.save();
    },

    // 2. The walk: Solder talks as she limps along the walkway, and play goes on.
    *walkTram(world) {
      const n = npcOf(world, 'solder');
      if (!n) return;
      S.bark(world, n, 'THE KEEL TRAM RUNS UNDER ALL THIS. SUMP TO THE SPINE, IN ONE GO.');
      S.bark(world, n, "IT'S HOW EVERYONE GETS TO THE CLIMB. OLD AND YOUNG CAN'T WALK THE LABYRINTH.");
    },
    *walkLift(world) {
      const n = npcOf(world, 'solder');
      if (!n) return;
      S.bark(world, n, 'THE OLD CREW HAD A LIFT THAT WENT DOWN FROM THE BRIDGE.');
      S.bark(world, n, "NOBODY'S RIDDEN IT IN TWO HUNDRED YEARS. I COULD MEND IT, IF I LIVED THAT LONG.");
    },
    *walkWick(world) {
      const n = npcOf(world, 'solder');
      if (!n) return;
      S.bark(world, n, 'WICK WOULD HAVE HATED IT DOWN HERE. NOTHING GROWS.');
      S.bark(world, n, "SHE'D HAVE TALKED THE WHOLE WAY. I KEEP LEAVING GAPS FOR HER.");
    },
    // She stops at the workshop door, and goes back to sit with the motor.
    *workshopDoor(world) {
      const s = world.state;
      const n = npcOf(world, 'solder');
      s.flags.solderWalk = false;
      world.barks = [];
      if (n) n.facing = Math.sign(world.player.x - n.x) || 1;
      yield say('SOLDER', "THAT'S ODELL'S. THE BOOTS WILL BE IN THERE SOMEWHERE, UNDER WHATEVER'S GROWN ON THEM.");
      yield say('SOLDER', "THE SILT TANK IS UNDER THE EAST TANK. SOMETHING BIG LIVES IN IT. I'VE HEARD IT TURN OVER.");
      yield say('SOLDER', "I'M GOING BACK TO SIT WITH THE MOTOR BEFORE SOMETHING EATS IT. COME AND GET ME WHEN IT'S QUIET.");
      if (n) {
        n.limping = false;
        yield { walk: n, x: 2 * 8, speed: 0.8 };
        n.state = 'gone';
      }
      S.setLead(world, "FIND ODELL'S PRESSURE BOOTS IN HIS WORKSHOP");
      world.save();
    },

    // Odell's pressure boots, at the far end of his workshop.
    *boots(world) {
      const s = world.state;
      if (s.abilities.boots) {
        yield me('THE BOX THE BOOTS CAME IN. "IF FOUND, RETURN TO ODELL."');
        return;
      }
      yield me('A BOX ON THE BENCH. "PRESSURE BOOTS. IF FOUND, RETURN TO ODELL."');
      yield me("I'LL GIVE THEM BACK. I KNOW WHERE HE'S SITTING.");
      s.abilities.boots = true;
      HA.audio.play('pickup');
      world.burst(36 * 8 + 4, 17 * 8, ['#ffb84d', '#6fd0b8', '#ffffff'], 18, 1.6);
      world.toast('PRESSURE BOOTS · YOU SINK IN WATER, AND JUMP HIGH OFF THE BOTTOM', 300);
      S.addStory(world, "ODELL'S PRESSURE BOOTS WERE IN HIS WORKSHOP, IN A BOX MARKED 'IF FOUND, RETURN TO ODELL'. NOW I SINK.");
      S.setLead(world, 'GO DOWN THROUGH THE EAST TANK TO THE SILT TANK');
      world.save();
    },

    // The Silt Mother.
    *siltIntro(world) {
      const s = world.state;
      const boss = world.boss;
      if (!boss) return;
      yield { wait: 10 };
      boss.active = true;
      world.refreshMusic();
      if (!s.flags.siltSeen) {
        s.flags.siltSeen = true;
        HA.audio.play('rumble');
        world.shake(2);
        yield { wait: 40 };
        yield me('THE WATER MOVED. ALL OF IT, AT ONCE.');
        HA.audio.play('roar');
        world.shake(4);
        yield { wait: 30 };
      }
      boss.fighting = true;
      world.refreshMusic();
      world.toast('ONLY HER HEAD · ONLY OUT OF THE WATER', 200);
    },
    *siltMotherDefeated(world) {
      const s = world.state;
      const boss = world.boss;
      s.flags.siltDown = true;
      // While the hero was down here, the Bloomsworn came to the Warrens. The gate held, or it didn't.
      s.warrensRaid = s.flags.pistolGiven ? 'held' : 'fell';
      HA.music.play(null);
      for (let i = 0; i < 5; i++) {
        if (boss) world.burst(boss.x + 9, boss.y + 7, ['#6fd0b8', '#33573f', '#f27ad8', '#ffffff'], 12, 2.2);
        HA.audio.play('boom');
        world.shake(3);
        yield { wait: 16 };
      }
      if (boss) {
        boss.broken = true;
        boss.active = false;
      }
      yield { wait: 60 };
      S.addStory(world, 'THE SILT MOTHER IS DEAD. SHE WAS ONLY AN EEL ONCE.');
      world.save();
      // Solder, who heard it go quiet, with the motor on her back.
      const p = world.player;
      const n = placeSolder(world, 1 * 8);
      n.y = 19 * 8 - n.h;
      yield { walk: n, x: Math.min(p.x - 20, 60 * 8), speed: 0.8 };
      n.facing = Math.sign(p.x - n.x) || 1;
      yield say('SOLDER', 'IT WENT QUIET. I DON\'T LIKE QUIET DOWN HERE, BUT I LIKED THAT.');
      yield { wait: 30 };
      HA.audio.play('boom');
      world.shake(1);
      yield { wait: 40 };
      yield say('SOLDER', '...LISTEN. UP THE PIPES.');
      yield me('FAR OFF, THROUGH THE HULL. SOMETHING HEAVY, OVER AND OVER.');
      yield say('SOLDER', "THAT'S THE WARRENS. THAT'S THE GATE.");
      yield say('SOLDER', s.flags.pistolGiven ? "IT'S GOT YOUR PISTOL ON IT. IT'LL HOLD. IT HAS TO." : "IT'S GOT MY OLD PISTOL ON IT. IT'S NOT ENOUGH. IT WAS NEVER GOING TO BE ENOUGH.");
      yield say('SOLDER', 'THE FASTEST WAY TO HELP THEM IS THAT TRAM. COME ON. THE KEEL STATION IS PAST THE VALVE HALL.');
      s.flags.solderWith = true;
      n.limping = true;
      S.setLead(world, 'TAKE SOLDER AND THE MOTOR TO THE KEEL TRAM STATION');
      S.addStory(world, "SOLDER CAME DOWN WHEN IT WENT QUIET. WE HEARD SOMETHING HITTING THE WARRENS' GATE, FAR UP THE PIPES.");
      world.refreshMusic();
      world.save();
    },

    // 3. The flood: the valves open on their own, and the water comes up the hall behind them.
    *flood(world) {
      const s = world.state;
      const first = !s.flags.floodSeen;
      s.flags.floodSeen = true;
      yield { wait: 10 };
      HA.audio.play('terminal');
      yield say('BALLAST CONTROL', 'VALVES 1-9: OPENING.', NAV);
      if (first) {
        yield say('SOLDER', "THAT'S NOT ME. I'M NOT TOUCHING ANYTHING.");
        HA.audio.play('rumble');
        world.shake(3);
        yield { wait: 30 };
        yield say('SOLDER', "UP THE CULVERT! THE HATCH AT THE TOP! DON'T LEAVE ME BEHIND, I'M SLOW!");
      } else yield say('SOLDER', 'NOT AGAIN. GO!');
      for (let i = 0; i < 9; i++) world.burst((22 + (i % 3) * 6) * 8, (12 + Math.floor(i / 3) * 8) * 8 + 14, ['#6fd0b8', '#d8f4ff'], 8, 2);
      startFlood(world);
      S.setLead(world, 'GET SOLDER UP THE CULVERT TO THE HATCH');
      world.toast("KEEP SOLDER CLOSE · SHE CAN'T SWIM", 200);
    },
    *floodFail(world) {
      const s = world.state;
      s.flags.flooding = false;
      s.flags.solderWith = true;
      world.floodLevel = undefined;
      world.checkpoint = null;
      yield { fade: 'out', frames: 30 };
      yield { wait: 30 };
      world.enterRoom('valve-hall', 6 * 8, 42 * 8 - 14, { noSave: true, facing: 1 });
      world.holdFade = true;
      yield { wait: 20 };
      world.holdFade = false;
      yield { fade: 'in', frames: 30 };
      yield me('THE WATER TOOK HER UNDER. I GOT HER BACK TO THE HALL, AND IT WENT DOWN AS FAST AS IT CAME.');
      yield say('SOLDER', "...ALL RIGHT. ALL RIGHT. I'M ALL RIGHT. STAY WHERE I CAN SEE YOU THIS TIME.");
    },

    // 4. The Jammed Hatch: Solder gets it open, and the beam over it comes down on her. Choice 9.
    *jammed(world) {
      const s = world.state;
      const p = world.player;
      const n = npcOf(world, 'solder');
      if (!n) return;
      n.limping = false;
      yield say('SOLDER', "IT'S STUCK. OF COURSE IT'S STUCK. HOLD STILL, I KNOW THIS KIND.");
      yield { walk: n, x: 28 * 8, speed: 0.8 };
      n.facing = 1;
      for (let i = 0; i < 3; i++) {
        HA.audio.play('clamp');
        world.shake(1);
        yield { wait: 24 };
      }
      s.flags.hatchOpen = true;
      HA.audio.play('unlock');
      yield { wait: 20 };
      // the beam over the hatch lets go
      const beam = { kind: 'beam', x: 25 * 8, y: 1 * 8, vy: 0, landed: false };
      beam.update = (w, self) => {
        if (self.landed) return;
        self.vy = Math.min(self.vy + 0.4, 6);
        self.y += self.vy;
        if (self.y >= n.y - 2) {
          self.y = n.y - 2;
          self.landed = true;
          w.shake(6);
          HA.audio.play('stomp');
          w.burst(self.x + 16, self.y + 4, ['#6c7894', '#a9b6cc', '#46291a'], 20, 2);
        }
      };
      beam.draw = (g, w, self, cam) => {
        const x = Math.round(self.x - cam.x);
        const y = Math.round(self.y - cam.y);
        g.fillStyle = '#10121c';
        g.fillRect(x, y, 36, 7);
        g.fillStyle = '#46291a';
        g.fillRect(x + 1, y + 1, 34, 5);
        g.fillStyle = '#7a4a2a';
        g.fillRect(x + 1, y + 1, 34, 1);
        if (!s.flags.solderBy) {
          g.fillStyle = '#f27ad8';
          for (let i = 3; i < 34; i += 7) g.fillRect(x + i, y - 1, 2, 2);
        }
      };
      world.actors.push(beam);
      yield { until: () => beam.landed };
      n.kneel = true;
      yield { wait: 40 };
      yield say('SOLDER', "...OH. THAT'S NOT GOOD.");
      yield me('THE BEAM HAS HER LEGS. BEHIND US, THE WATER IS COMING UP THE CULVERT.');
      yield say('SOLDER', "IT WON'T LIFT. I'VE GOT ONE CHARGE IN MY BAG. WITH YOUR LAUNCHER IT WOULD BLOW THE BEAM CLEAR. AND THE LAUNCHER WITH IT.");
      yield me('THERE IS BLOOM GROWING THICK ON THE HATCH FRAME. I KNOW WHAT EATING IT WOULD DO.');
      const last = HA.bloom.closes(s, 2);
      const pick = yield {
        choice: {
          prompt: 'THE BEAM HAS SOLDER PINNED.',
          options: [
            { label: 'BLOW THE BEAM', confirm: { title: 'BLOW THE BEAM WITH THE CHARGES?', gain: 'SOLDER LIVES', lose: 'THE BREACH CHARGES AND THE LAUNCHER, FOR GOOD' } },
            { label: 'EAT THE BLOOM ON THE HATCH', confirm: { title: 'EAT THE BLOOM TO LIFT THE BEAM?', gain: 'SOLDER LIVES', lose: last ? 'THIS WILL BE THE LAST OF YOU.' : 'MORE OF YOURSELF · THE BLOOM GROWS' } },
            { label: 'LEAVE HER', confirm: { title: 'LEAVE SOLDER UNDER THE BEAM?', gain: 'EVERYTHING YOU CARRY', lose: 'SOLDER' } },
          ],
        },
      };
      // What happened is recorded at once; the rest only plays it out.
      if (pick === 0) {
        s.people.solder = 'alive';
        s.flags.solderBy = 'charges';
        const i = p.weapons.findIndex((w) => w.id === 'charges');
        if (i >= 0) {
          p.weapons.splice(i, 1);
          p.wi = Math.min(p.wi, p.weapons.length - 1);
        }
        S.addChoice(world, "I BLEW THE BEAM OFF SOLDER WITH HER LAST CHARGE AND MY LAUNCHER. THE LAUNCHER WENT WITH IT.");
        yield say('SOLDER', 'BAG. FRONT POCKET. MIND THE FUSE.');
        world.flash('#ffb84d', 8);
        world.shake(6);
        HA.audio.play('blast');
        world.burst(beam.x + 18, beam.y, ['#ffb84d', '#fff0a8', '#e8434f', '#6c7894'], 40, 3);
        world.actors = world.actors.filter((a) => a !== beam);
        yield { wait: 40 };
        yield say('SOLDER', 'GOOD LAUNCHER. I KNEW THE MAN WHO MADE IT. HE WAS A FOOL, BUT A GOOD ONE.');
      } else if (pick === 1) {
        s.people.solder = 'alive';
        s.flags.solderBy = 'bloom';
        S.addChoice(world, 'I ATE THE BLOOM GROWING ON THE HATCH, AND LIFTED THE BEAM OFF SOLDER WITH WHAT IT GAVE ME.');
        HA.audio.play('bulb');
        world.flash('#f27ad8', 10);
        HA.bloom.add(world, 2);
        yield { wait: 30 };
        yield me('IT TASTES LIKE THE GARDENS SMELLED.');
        world.shake(3);
        HA.audio.play('stomp');
        beam.y -= 14;
        yield { wait: 20 };
        world.actors = world.actors.filter((a) => a !== beam);
        world.burst(beam.x + 18, beam.y, ['#6c7894', '#f27ad8'], 16, 2);
        yield say('SOLDER', "...YOUR EYES. SLEEPER, YOUR EYES WENT PINK. JUST FOR A SECOND.");
        yield say('SOLDER', "DON'T DO THAT AGAIN. NOT FOR ME.");
      } else {
        s.people.solder = 'dead';
        s.mercy -= 2;
        S.addChoice(world, 'I LEFT SOLDER UNDER THE BEAM AT THE HATCH, AND TOOK THE MOTOR ON TO THE TRAM.');
        yield say('SOLDER', 'GO. SOMEONE HAS TO START THE TRAM.');
        yield say('SOLDER', "TAKE THE MOTOR. IT GOES IN THE WINCH WITH THE BIG END DOWN. TELL GASKET I WAS RUDE ABOUT IT TO THE END.");
        n.motor = false;
        yield me('SHE PUSHES THE MOTOR INTO MY HANDS, AND DOESN\'T LOOK AT ME AGAIN.');
      }
      // Through the hatch, which shuts behind; the flood stays on the other side of it.
      s.flags.flooding = false;
      world.floodLevel = undefined;
      world.checkpoint = null;
      HA.music.play(null);
      if (s.people.solder === 'alive') {
        n.kneel = false;
        yield { walk: p, x: 34 * 8, speed: 1.2 };
        yield { walk: n, x: 32 * 8, speed: 0.8 };
      } else yield { walk: p, x: 34 * 8, speed: 1 };
      yield { fade: 'out', frames: 30 };
      s.flags.flooded = true;
      s.flags.solderWith = false;
      world.enterRoom('tram-station', 4 * 8, 9 * 8 - 14, { facing: 1 });
      world.holdFade = true;
      HA.audio.play('doorShut');
      yield { wait: 30 };
      world.holdFade = false;
      yield { fade: 'in', frames: 30 };
      if (s.people.solder === 'alive') {
        yield say('SOLDER', "THAT HATCH WON'T OPEN AGAIN UNTIL SOMEONE PUMPS THE CULVERT DRY. NOT ME. NOT TODAY.");
        yield say('SOLDER', 'THE VALVES WERE ON THEIR OWN. SOMEONE OPENED THEM. SOMEONE WANTED US DOWN THERE.');
        S.setLead(world, 'FIT THE MOTOR IN THE WINCH WITH SOLDER');
      } else {
        yield me('THE HATCH SHUT BEHIND ME. THE WATER WAS RIGHT BEHIND IT.');
        // A route that closes (STORYBOARD.md): nobody held the culvert, so the keel line's shutter is down.
        yield me("AND THE KEEL LINE'S SHUTTER HAS COME DOWN. THE WATER GOT IN AHEAD OF ME.");
        S.setLead(world, 'FIT THE MOTOR IN THE WINCH');
      }
      world.save();
    },

    // 5. The tram: the motor goes into the winch, and the keel tram shudders off toward the Warrens.
    *winch(world) {
      const s = world.state;
      const n = npcOf(world, 'solder');
      if (s.flags.tram) {
        yield me('THE WINCH HUMS. THE CABLE RUNS OFF WEST, TO THE WARRENS.');
        return;
      }
      if (s.people.solder === 'alive' && n) {
        yield { walk: n, x: 29 * 8, speed: 0.8 };
        n.facing = 1;
        yield say('SOLDER', 'MOTOR GOES IN HERE. HOLD THIS. NO, THE OTHER END.');
        n.motor = false;
      } else yield me("SHE'D HAVE HAD THIS IN IN A MINUTE. IT TAKES ME TEN.");
      for (let i = 0; i < 4; i++) {
        HA.audio.play('clamp');
        yield { wait: 20 };
      }
      s.flags.tram = true;
      HA.audio.play('crane');
      world.shake(2);
      world.tramGo = 1;
      yield { wait: 50 };
      if (s.people.solder === 'alive' && n) {
        yield say('SOLDER', "IT'LL RUN TO THE SUMP AND STOP. I'M GOING WITH IT. SOMEONE HAS TO TELL THEM IT'S SAFE TO GET IN.");
        yield say('SOLDER', "EVERYONE WHO CAN CLIMB. WE'LL MEET YOU AT THE FOOT OF THE SPINE. DON'T START WITHOUT ME.");
        yield say('SOLDER', 'AND KEEP OUT OF THE OVERFLOW PIPES UNDER THE PLATFORM. THEY FLOOD.');
        n.state = 'gone';
        world.tramRider = true;
      }
      yield { until: () => world.tramGo > 260 };
      if (s.people.solder === 'alive') {
        S.addStory(world, 'SOLDER AND I FITTED THE MOTOR. THE KEEL TRAM WENT OFF TO THE WARRENS FOR THE CLIMBERS, WITH SOLDER ON IT.');
        S.setLead(world, 'FOLLOW THE KEEL LINE EAST TO THE FOOT OF THE ENGINE SPINE');
      } else {
        S.addStory(world, 'I FITTED THE MOTOR ALONE. THE KEEL TRAM WENT OFF TO THE WARRENS FOR THE CLIMBERS. THE KEEL LINE FLOODED BEHIND ME: WITHOUT SOLDER, NOBODY HELD THE CULVERT. THE WAY TO THE SPINE IS THROUGH THE OVERFLOW PIPES.');
        S.setLead(world, 'THE KEEL IS SHUT. GO DOWN THROUGH THE OVERFLOW PIPES TO THE SPINE');
      }
      world.save();
    },

    // Back home after the raid: the gate held, or it fell.
    *raidSeen(world) {
      const s = world.state;
      const gasket = npcOf(world, 'gasket');
      s.flags.raidSeen = true;
      yield { wait: 30 };
      if (gasket) gasket.facing = Math.sign(world.player.x - gasket.x) || 1;
      if (s.warrensRaid === 'held') {
        yield say('OLD GASKET', 'THEY CAME WHILE YOU WERE DOWN THERE. BLOOMSWORN, A DOZEN OF THEM, AT THE GATE.');
        yield say('TAMP', 'IT HELD. YOUR LITTLE GUN HELD.');
        S.addStory(world, "THE BLOOMSWORN RAIDED THE WARRENS WHILE I WAS IN THE BALLAST. THE GATE HELD, WITH MY PISTOL ON IT.");
      } else {
        yield say('OLD GASKET', 'THEY CAME WHILE YOU WERE DOWN THERE. THE GATE WENT.');
        yield say('OLD GASKET', 'WE GOT THE LITTLE ONES AND THE OLD ONES INTO THE DEEP WALLS. TAMP HELD THE DOOR WITH HIS BACK.');
        yield me("TAMP IS LYING BY THE FIRE. HE DOESN'T GET UP.");
        yield say('OLD GASKET', 'AND WHEN THEY BROKE THE GATE, THE WEST END OF THE HALL CAME DOWN WITH IT. THE WAY OUT TO THE WAY DOWN IS UNDER IT.');
        yield say('OLD GASKET', 'WE LIVE IN THE WALLS AGAIN. LIKE BEFORE THE GATE. THE HOLE BY THE HOMES GOES DOWN, IF YOU NEED THE WAY ROUND.');
        S.addStory(world, 'THE BLOOMSWORN RAIDED THE WARRENS WHILE I WAS IN THE BALLAST. THE GATE FELL. THE YOUNG AND THE OLD HID IN THE DEEP WALLS, AND TAMP WAS HURT.');
        caveIn(world);
      }
      world.save();
    },
    *solderMourned(world) {
      const s = world.state;
      const gasket = npcOf(world, 'gasket');
      s.flags.solderMourned = true;
      if (gasket) gasket.facing = Math.sign(world.player.x - gasket.x) || 1;
      yield say('OLD GASKET', 'THE TRAM CAME IN EMPTY. WHERE IS SHE?');
      yield me('UNDER A BEAM, AT THE TOP OF THE CULVERT. SHE SENT THE TRAM.');
      yield { wait: 40 };
      yield say('OLD GASKET', 'WAS SHE RUDE ABOUT IT?');
      yield me('TO THE END.');
      yield say('OLD GASKET', 'GOOD.');
      S.addStory(world, 'I TOLD GASKET ABOUT SOLDER. SHE ASKED IF SHE WAS RUDE ABOUT IT.');
      world.save();
    },
  };

  // Lock 2 (STORYBOARD.md, "Routes that close"): the gate fell, and the hall came down with it. Said once, the first
  // time the hero learns of it, from Gasket or from the rubble itself.
  function caveIn(world) {
    const f = world.state.flags;
    if (f.caveIn) return;
    f.caveIn = true;
    S.addStory(world, 'THE GATE FELL, AND THE HALL CAME DOWN WITH IT. THE WAY WEST TO THE WAY DOWN IS UNDER THE RUBBLE, AND THE WAY ROUND IS THROUGH THE DEEP WALLS. WE LIVE IN THE WALLS AGAIN.');
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.def.area === 'ballast' && !f.ballast) {
        f.ballast = true;
        S.addStory(world, 'UNDER THE DRAIN, THE BALLAST: THE SHIP\'S HEART, HALF UNDER WATER. SOMEWHERE DOWN HERE IS SOLDER.');
        S.setLead(world, 'FIND SOLDER IN THE BALLAST');
      }
      // A flood that was cut short (the suit failed, or the game was left) starts again from the Valve Hall.
      if (f.flooding && world.floodLevel === undefined) f.flooding = false;
      if (f.flooding) {
        world.floodRow = null;
        applyFlood(world);
      }
      // The tank, once drained, stays drained.
      if (world.def.drains && f[world.def.drains]) {
        for (let ty = 0; ty < world.room.h; ty++) for (let tx = 0; tx < world.room.w; tx++) if (world.room.tile(tx, ty) === HA.room.WATER) world.room.set(tx, ty, HA.room.EMPTY);
      }
      // Solder: limping behind on the walk; by the motor while the Silt Mother lives; with the hero after.
      if (id === 'pump-gallery' && !f.siltDown) {
        const n = npcOf(world, 'solder');
        if (n) {
          n.state = 'out'; // whatever the Warrens' rules say, down here she's always out
          if (!f.solderFound) n.kneel = true;
          else if (f.solderWalk) Object.assign(n, { limping: true, lines: ["I'M RIGHT BEHIND YOU. SLOWLY."] });
          else n.lines = ["THE SILT TANK'S UNDER THE EAST TANK. SOMETHING BIG LIVES IN IT.", "I'LL BE HERE. ME AND THE MOTOR."];
        }
      }
      if (id === 'tank-farm' && f.solderWalk) placeSolder(world).motor = false;
      if (f.solderWith && !s.people.solder) {
        if (ROOMS.has(id)) placeSolder(world);
        else f.solderWith = false;
      }
      // Gone back west without her, the hero finds her waiting in the Silt Tank, and she falls in behind again.
      if (id === 'silt-tank' && f.siltDown && !f.solderWith && !s.people.solder && !world.scene) {
        f.solderWith = true;
        placeSolder(world);
      }
      if (id === 'tram-station' && s.people.solder === 'alive' && !f.tram) {
        const n = placeSolder(world, 10 * 8);
        n.y = 9 * 8 - n.h;
        n.limping = false;
        n.lines = ['THE WINCH HOUSE IS DOWN ON THE TRACK. MIND THE STEPS. I DID.'];
      }
      // The Silt Mother, under her water, or what's left of her.
      if (id === 'silt-tank' && world.bossSpawn && !f.siltDown) {
        world.boss = HA.bosses.siltMother.make(world, world.bossSpawn.x, world.bossSpawn.y);
        world.enemies.push(world.boss);
      }
      // Home: after the raid, and after Solder.
      if (id === 'warrens') {
        if (s.people.solder === 'alive' && f.tram) {
          const n = S.makeNpc(world, 'solder', { x: 86 * 8, y: 18 * 8 });
          n.lines = ["THE CLIMBERS ARE PACKING. TAMP'S COUNTED THEM TWICE.", 'MEET US AT THE SPINE.'];
          world.npcs.push(n);
        }
        if (s.warrensRaid === 'fell') {
          for (const n of world.npcs) {
            if (n.id === 'shim' || n.id === 'brine' || n.id === 'woken') n.state = 'hidden';
            if (n.id === 'tamp') Object.assign(n, { sleeping: true, lines: ['...', 'I HELD IT. NOT LONG ENOUGH.'] });
          }
        } else if (s.warrensRaid === 'held') {
          const tamp = npcOf(world, 'tamp');
          if (tamp) tamp.lines = ['IT HELD. YOUR LITTLE GUN HELD.', 'THEY BROKE THEIR TEETH ON IT.'];
        }
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      for (const n of world.npcs) if (n.limping && n.state === 'out') limp(world, n);
      if (f.flooding && world.floodLevel !== undefined) updateFlood(world);
      // Back in the culvert with the flood cut short (a game left partway up it): both go back to the Valve Hall.
      const culvert = world.def.id === 'long-culvert' || world.def.id === 'jammed-hatch';
      if (culvert && !f.flooding && !f.flooded && !world.scene && !world.transition && !world.player.dead) run(world, 'floodFail');
      if (world.tramGo) world.tramGo++;
      // The rubble, seen for the first time (on the run for the sleds too, so it doesn't stop the clock).
      const caved = s.warrensRaid === 'fell' && !world.scene && !world.transition;
      if (caved && world.def.id === 'warrens' && !f.rubbleSeen && world.player.x < 46 * 8) {
        f.rubbleSeen = true;
        S.think(world, 'THE WHOLE WEST END CAME DOWN. THE WAY OUT IS UNDER IT.');
        S.think(world, 'THE HOLE BY THE HOMES. THAT GOES DOWN INTO THE WALLS.');
        caveIn(world);
      }
      if (caved && world.def.id === 'deep-walls' && !f.deepWalls) {
        f.deepWalls = true;
        S.think(world, 'THIS IS WHERE THEY HID. THEIR CHALK IS ON EVERY WALL.', 40);
      }
      if (world.def.id !== 'warrens' || f.running || world.scene || world.player.dead || world.transition || world.fade > 0.5) return;
      if (s.warrensRaid && !f.raidSeen) run(world, 'raidSeen');
      else if (s.people.solder === 'dead' && f.tram && !f.solderMourned) run(world, 'solderMourned');
    },

    talk(world, npc) {
      if (npc.id === 'solder' && world.def.id === 'pump-gallery' && !world.state.flags.solderFound) return 'found';
      return null;
    },

    // The Silt Mother has her own track; her tank is silent once she's dead. The flood has only its alarm.
    music(world) {
      const s = world.state;
      if (s.flags.flooding) return 'flood';
      const b = world.boss;
      if (world.def.id === 'silt-tank') {
        if (b && !s.flags.siltDown) return b.fighting ? 'siltMother' : b.active ? null : 'ballastWater';
        return s.flags.siltDown && !s.flags.solderWith && !s.flags.flooded ? null : undefined;
      }
      return undefined;
    },
  });

  // The Foam Sprayer leaves a line in the journal.
  const onWeapon = S.onWeapon;
  S.onWeapon = (world, id) => {
    onWeapon(world, id);
    if (id === 'foam') S.addStory(world, 'SOLDER\'S FOAM SPRAYER SETS A PLATFORM ON WATER OR ON BLOOM SILT. IT DOESN\'T LAST.');
  };

  // Is Solder close behind? (The Jammed Hatch waits for her.)
  S.solderNear = (world) => {
    const n = npcOf(world, 'solder');
    return !!n && Math.abs(n.x - world.player.x) < 64;
  };
  S.drawMotor = drawMotor;
  S.overlays.push(drawFlood);
  Object.assign(S.SCENES, SCENES);
})(window.HA);
