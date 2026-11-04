'use strict';
// Sorrel (3.13, the story audit's 9, with lock 3b; STORYBOARD.md, "Sorrel"). Brine's sister woke in her cradle and
// hid in the Old Greenhouse, until the Pruner welded its door shut on her. Released (choice 2), the Pruner cuts the
// door open in the wake, and she runs: down the drain, through the Seed Vault and the Long Aisle, to a pump room
// under the Settling Pools that still runs dry, where she keeps the Bloom out by counting the strokes. Finished, the
// Pruner's welds stay, and so does she. Found, she can come home to Brine (and climb), or be left counting.
// Flags: weldSeen, greenhouse (the door cut open, she ran), greenhouseIn, sorrelNest, sorrelAisle, sorrelOpen (the
// hatch unbarred), sorrelHome (home, and found by Brine), weldShut (lock 3b's line), brineRan, brineGame,
// brineAlive. The greenhouse message is the log sorrelGlass, which is how the hero knows her game.
// people.sorrel: 'home' or 'stayed'. All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const run = (world, name) => S.run(world, name);
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });
  const FLOOR = (ty) => ty * 8;
  const COUNT = '#ff8a8a'; // a Warden, counting
  const FREED = '#b8f4ff'; // a Warden, freed
  const LOG = '#b8f4ff';
  const DOOR = 114; // the welded door's column in the Nursery
  const LEVER = 26; // where Sorrel works the pumps in the Dry Pumps
  // Lock 3b's journal line: the Pruner finished, its welds stay.
  const WELDED = 'A DOOR AT THE END OF THE NURSERY IS WELDED SHUT, AND SOMEONE BEHIND IT IS COUNTING. ONLY THE PRUNER COULD HAVE CUT IT OPEN, AND I FINISHED THE PRUNER.';

  S.PEOPLE.sorrel = { name: 'SORREL', sprite: 'sorrel', away: true };
  S.TALK.sorrel = {};

  Object.assign(S.LOGS, {
    sorrelGlass: {
      title: 'SCRATCHED IN THE GLASS',
      text: "BRINE. IF THE CUTTER EVER LETS YOU IN HERE, I'VE GONE DOWN THE DRAIN, WHERE THE WATER GOES. COUNT TO A HUNDRED AND COME FIND ME. S.",
    },
    sorrelFrost: {
      title: 'SCRATCHED IN THE FROST',
      text: 'TOO COLD. DOWN TO THE BOXES. S.',
    },
  });

  // Numbers the way she says them: FOUR THOUSAND AND THIRTEEN.
  const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const under100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
  function words(n) {
    const out = [];
    if (n >= 1000) out.push(ONES[Math.floor(n / 1000)] + ' THOUSAND');
    if (n % 1000 >= 100) out.push(ONES[Math.floor((n % 1000) / 100)] + ' HUNDRED');
    const rest = n % 100;
    if (rest) out.push((out.length ? 'AND ' : '') + under100(rest));
    return out.join(' ') || 'NOUGHT';
  }
  S.countWords = words;

  // ---- The welded door, and the wake (story/gardens.js calls these) ----
  // Released, the Pruner goes to the door it welded, and cuts it open. She runs.
  S.cutGreenhouse = function* (world, pruner, woken) {
    const s = world.state;
    const p = world.player;
    world.camTarget = { x: 102 * 8, y: FLOOR(19) - 40 };
    pruner.walking = true;
    yield { walk: pruner, x: (DOOR - 5) * 8, speed: 0.6 };
    pruner.walking = false;
    pruner.facing = 1;
    yield { wait: 20 };
    yield say('THE PRUNER', 'COUNT: ONE. UNPLANTED. IT RAN IN THERE.', FREED);
    yield say('THE PRUNER', 'I CUT THE DOOR SHUT ON IT. NOW I WILL CUT IT OPEN.', FREED);
    for (let i = 0; i < 6; i++) {
      world.burst(DOOR * 8, FLOOR(15 + (i % 4)), ['#ffb84d', '#fff0a8', '#ff6a2a'], 6, 1.4);
      HA.audio.play('snip');
      yield { wait: 14 };
    }
    // What happened is recorded now: the door is open (and stays open), and she has run.
    s.flags.greenhouse = true;
    world.save();
    yield { wait: 40 };
    for (let i = 0; i < 4; i++) {
      HA.audio.play('land');
      yield { wait: 9 };
    }
    yield { wait: 20 };
    if (woken) woken.facing = 1;
    yield say('A WOKEN VILLAGER', '...SORREL?');
    p.facing = 1;
    yield me('SOMEONE RAN. IN THERE.');
    world.camTarget = null;
  };

  // Finished, the welds stay, and the hero hears who is behind them (lock 3b).
  S.weldedIn = function* (world) {
    const s = world.state;
    if (s.flags.weldShut) return;
    s.flags.weldShut = true;
    s.flags.weldSeen = true;
    yield { wait: 40 };
    HA.audio.play('tally');
    yield { wait: 30 };
    yield me("SOMEONE'S COUNTING. BEHIND THAT WELDED DOOR AT THE END.");
    yield me('THE PRUNER WELDED IT. NOTHING ELSE ON THE SHIP CUTS LIKE THAT, AND I FINISHED IT.');
    S.addStory(world, WELDED);
    world.save();
  };

  const SCENES = {
    *weldSeen(world) {
      world.state.flags.weldSeen = true;
      S.think(world, 'WELDED SHUT. FROM THIS SIDE.');
    },

    // ---- The Old Greenhouse ----
    *greenhouseIn(world) {
      world.state.flags.greenhouseIn = true;
      S.think(world, "THE FIRST GLASSHOUSE. THE BLOOM'S BEEN GROWING IN HERE LONGEST.");
    },
    *sorrelNest(world) {
      world.state.flags.sorrelNest = true;
      S.think(world, "SOMEONE'S BEEN LIVING UNDER THIS BENCH. THE SACKING'S STILL WARM.");
    },
    // Her message for Brine, scratched in the glass: the hero learns her game.
    *sorrelGlass(world) {
      const s = world.state;
      const first = !s.logs.sorrelGlass;
      s.logs.sorrelGlass = true;
      HA.audio.play('tally');
      const L = S.LOGS.sorrelGlass;
      yield { say: L.title, text: L.text, color: LOG };
      if (!first) return;
      yield me('THE DRAIN UNDER THE BENCH. ITS GRATE IS PRIED UP, AND IT GOES STRAIGHT DOWN. TOO NARROW FOR THE SUIT.');
      yield me('WHERE THE WATER GOES. DOWN.');
      S.addStory(world, "SORREL GOT OUT OF HER CRADLE AND HID IN THE OLD GREENHOUSE, UNTIL THE PRUNER WELDED HER IN. WHEN THE DOOR CAME OPEN SHE RAN, DOWN A DRAIN, 'WHERE THE WATER GOES'. SHE LEFT BRINE A GAME: COUNT TO A HUNDRED AND COME FIND ME.");
      world.toast('SAVED TO THE JOURNAL', 150);
      world.save();
    },

    // ---- The Seed Vault, the Long Aisle: the trail ----
    *sorrelFrost(world) {
      const s = world.state;
      const first = !s.logs.sorrelFrost;
      s.logs.sorrelFrost = true;
      HA.audio.play('tally');
      const L = S.LOGS.sorrelFrost;
      yield { say: L.title, text: L.text, color: LOG };
      if (!first) return;
      yield me('SHE CAME DOWN THE DRAIN. THE FIRST PERSON IN HERE SINCE LAUNCH, AND SHE ATE THE BEANS.');
      S.addStory(world, "SORREL CAME DOWN THE DRAIN INTO THE SEED VAULT, AND LIVED ON SEEDS UNTIL THE COLD DROVE HER ON DOWN, 'TO THE BOXES'.");
      world.save();
    },
    *sorrelAisle(world) {
      const s = world.state;
      s.flags.sorrelAisle = true;
      S.think(world, "NOT SOLDER'S HAND. SORREL.");
      S.think(world, "SHE'S GOING DOWN THE DRAIN, TO THE BALLAST.", 120);
      S.addStory(world, "SORREL CHALKED HER NAME IN THE LONG AISLE, BY THE WAY DOWN TO THE BALLAST: 'DOWN WITH THE WATER'.");
      world.save();
    },

    // ---- The hatch in the Settling Pools' sump ----
    // The first time, the hero plays her game, and she unbars it; then it's an ordinary hatch.
    *knock(world) {
      const s = world.state;
      if (!s.flags.sorrelOpen) {
        HA.audio.play('stomp');
        yield { wait: 30 };
        yield me('BARRED FROM BELOW. I KNOW THIS GAME.');
        yield me('...NINETY-EIGHT. NINETY-NINE. A HUNDRED.');
        yield me('COMING TO FIND YOU, SORREL.');
        yield { wait: 60 };
        HA.audio.play('grate');
        yield { wait: 30 };
        s.flags.sorrelOpen = true;
        world.save();
      }
      HA.audio.play('clamp');
      yield { fade: 'out', frames: 20 };
      world.travel(world.link);
      yield { wait: 10 };
      yield { fade: 'in', frames: 20 };
    },

    // ---- The Dry Pumps: Sorrel, and her choice ----
    *sorrel(world) {
      const s = world.state;
      const p = world.player;
      const n = npcOf(world, 'sorrel');
      if (!n) return;
      world.barks = [];
      HA.music.play(null);
      yield { wait: 40 };
      yield say('SORREL', 'FOUR THOUSAND AND TWELVE. FOUR THOUSAND AND THIRTEEN.');
      yield { walk: p, x: (LEVER - 7) * 8, speed: 0.7 };
      p.facing = 1;
      yield { wait: 30 };
      yield say('SORREL', "YOU'RE NOT BRINE. BRINE CAN'T COUNT PAST TWENTY WITHOUT CHEATING.");
      yield me("YOUR SISTER'S STILL LOOKING FOR YOU.");
      yield say('SORREL', "...FOUR THOUSAND AND TWENTY. DON'T MAKE ME LOSE COUNT.");
      yield say('SORREL', 'I WOKE UP IN THE GLASS BOX, COUNTING. THE PINK STUFF WAS IN ME. EVERY TIME I STOPPED, IT GOT LOUDER.');
      yield say('SORREL', 'IF I STOP COUNTING, IT STARTS COUNTING ME.');
      yield say('SORREL', "THE PUMPS KEEP TIME. ONE STROKE, ONE NUMBER. AS LONG AS THEY RUN, I'M ME.");
      yield me('HER HANDS ARE PINK TO THE KNUCKLE.');
      yield say('SORREL', "TELL BRINE I'M ALIVE. TELL HER I'M STILL PLAYING.");
      const pick = yield {
        choice: {
          prompt: 'SORREL KEEPS COUNTING.',
          options: [
            { label: 'BRING HER HOME', confirm: { title: 'BRING SORREL HOME?', gain: 'SORREL HOME TO BRINE · SHE CLIMBS WITH THEM', lose: 'HER PUMPS, AND HER COUNT' } },
            { label: 'LEAVE HER COUNTING', confirm: { title: 'LEAVE SORREL WITH HER PUMPS?', gain: 'SHE KEEPS HERSELF, HER WAY', lose: 'BRINE GOES ON LOOKING' } },
          ],
        },
      };
      // The choice is recorded at once; what follows only plays it out.
      if (pick === 0) {
        s.people.sorrel = 'home';
        s.mercy += 1;
        S.addChoice(world, 'I BROUGHT SORREL HOME. SHE STOPPED COUNTING AT FOUR THOUSAND AND THIRTY-ONE.');
        S.addStory(world, 'I FOUND SORREL IN A DRY PUMP ROOM UNDER THE SETTLING POOLS, COUNTING TO KEEP THE BLOOM OUT. SHE STOPPED AT FOUR THOUSAND AND THIRTY-ONE, AND WENT HOME BY THE PIPES.');
      } else {
        s.people.sorrel = 'stayed';
        s.flags.sorrelCount = 4021;
        S.addChoice(world, 'I LEFT SORREL COUNTING, UNDER THE SETTLING POOLS.');
        S.addStory(world, 'I FOUND SORREL IN A DRY PUMP ROOM UNDER THE SETTLING POOLS. THE PUMPS KEEP HER COUNT, AND HER COUNT KEEPS THE BLOOM OUT. I LEFT HER COUNTING.');
      }
      world.save();
      if (pick === 0) {
        yield me('GASKET COUNTS EVERYONE AT LIGHTS-OUT. EVERY NIGHT. YOU CAN COUNT WITH HIM.');
        yield say('SORREL', '...FOUR THOUSAND AND THIRTY.');
        yield { wait: 50 };
        yield say('SORREL', "FOUR THOUSAND AND THIRTY-ONE. THAT'S A GOOD NUMBER TO STOP ON.");
        HA.audio.play('clamp');
        world.shake(2);
        yield { wait: 70 };
        n.facing = -1;
        yield say('SORREL', "I KNOW EVERY PIPE BETWEEN HERE AND THE WARRENS. I'LL BE HOME BEFORE YOU.");
        yield say('SORREL', "AND THEN I'LL HIDE, AND SHE CAN FIND ME.");
        n.walking = true;
        yield { walk: n, x: 5 * 8, speed: 1.1 };
        n.walking = false;
        n.state = 'gone';
        HA.audio.play('clamp');
        // Solder, if he came down with the hero after the Silt Mother.
        const solder = npcOf(world, 'solder');
        if (solder && solder.state === 'out') {
          yield { wait: 30 };
          yield say('SOLDER', "I'VE KNOWN THAT GIRL SINCE SHE WAS SIX. SHE USED TO COUNT MY RIVETS.");
        }
      } else {
        yield me("THEN KEEP COUNTING. I'LL TELL HER.");
        yield say('SORREL', 'TELL HER WHERE. NOT YET, THOUGH.');
        yield say('SORREL', 'WHEN SHE CAN COUNT TO A HUNDRED WITHOUT CHEATING.');
        n.lines = stayedLines();
      }
      world.refreshMusic();
      world.save();
    },

    // ---- Home: Brine finds her ----
    *sorrelHome(world) {
      const s = world.state;
      const f = s.flags;
      const brine = npcOf(world, 'brine');
      const sorrel = npcOf(world, 'sorrel');
      f.sorrelHome = true;
      yield { wait: 30 };
      if (brine) world.camTarget = { x: brine.x + 6, y: brine.y - 20 };
      const out = brine && brine.state === 'out';
      if (out) {
        brine.facing = Math.sign(world.player.x - brine.x) || 1;
        yield say('BRINE', S.callName(s) + "! SHE'S HOME. SHE CAME UP THE PIPES BEFORE YOU, AND NOW SHE'S HIDING, AND SHE SAYS I HAVE TO FIND HER.");
        brine.facing = 1;
        yield say('BRINE', 'ONE, TWO, FIFTY, A HUNDRED. COMING TO FIND YOU!');
        yield { wait: 40 };
        if (sorrel) {
          sorrel.state = 'out';
          sorrel.fadeIn = 20;
          sorrel.facing = -1;
          world.burst(sorrel.x + 4, sorrel.y + 8, ['#e8c8d8', '#a8a0b8'], 6, 0.8);
        }
        yield { wait: 30 };
        yield say('SORREL', 'YOU CHEATED. YOU STARTED AT FIFTY.');
        brine.facing = Math.sign(world.player.x - brine.x) || 1;
        yield say('BRINE', "EMPTY ISN'T DEAD. I TOLD THEM.");
      } else {
        // Hiding in the walls (the village calls the hero COUNTER, or the gate fell): voices from the doorway.
        yield say('BRINE', "SHE CAME HOME. SHE'S IN HERE WITH ME.");
        yield say('SORREL', 'SHE CHEATED. SHE STARTED AT FIFTY.');
        yield say('BRINE', "EMPTY ISN'T DEAD. I TOLD THEM.");
      }
      yield say('SORREL', "GASKET SAYS I CAN DO THE COUNT AT LIGHTS-OUT. HE'S TOO SLOW.");
      world.camTarget = null;
      if (brine) brine.lines = homeLines('brine');
      if (sorrel) sorrel.lines = homeLines('sorrel');
      S.addStory(world, "SORREL CAME HOME BY THE PIPES AND HID, AND LET BRINE FIND HER. BRINE SAYS EMPTY ISN'T DEAD. SHE TOLD THEM.");
      world.save();
    },

    // ---- Brine, as the news comes in ----
    *brineRan(world) {
      world.state.flags.brineRan = true;
      yield say('BRINE', 'THEY SAID SOMEONE RAN, UP IN THE GARDENS, WHEN THE CUTTER OPENED A DOOR.');
      yield say('BRINE', "IT'S HER. I KNOW IT IS.");
      world.save();
    },
    *brineGame(world) {
      const s = world.state;
      s.flags.brineGame = true;
      yield me("SHE LEFT YOU A MESSAGE ON THE GLASS. 'COUNT TO A HUNDRED AND COME FIND ME.'");
      yield say('BRINE', 'COUNT TO A HUNDRED. THAT WAS OUR GAME.');
      yield say('BRINE', 'SHE ALWAYS HID WHERE THE WATER WENT. DOWN, ALWAYS DOWN.');
      yield say('BRINE', 'FOLLOW THE WATER DOWN, ' + S.callName(s) + ". AND DON'T CHEAT. SHE KNOWS.");
      world.save();
    },
    *brineAlive(world) {
      world.state.flags.brineAlive = true;
      yield me("I FOUND HER. UNDER THE SETTLING POOLS, IN THE BALLAST. SHE'S COUNTING, TO KEEP THE BLOOM OUT. SHE WANTED TO STAY.");
      yield say('BRINE', "ALIVE. COUNTING. THAT'S HER.");
      yield say('BRINE', "WHEN THIS IS OVER I'LL GO DOWN AND FIND HER MYSELF. AND I WON'T CHEAT.");
      S.addStory(world, "I TOLD BRINE WHERE SORREL IS. SHE'LL GO DOWN AND FIND HER HERSELF, WHEN THIS IS OVER.");
      world.save();
    },
  };

  const stayedLines = () => ['...FOUR THOUSAND AND SIXTY.', "STILL HERE. STILL ME. TELL HER I'M WINNING."];
  function homeLines(id) {
    return {
      brine: ['SHE COUNTS IN HER SLEEP NOW. I DON\'T MIND.', "EMPTY ISN'T DEAD."],
      sorrel: ['FOUR THOUSAND AND THIRTY-ONE STROKES. THEN I STOPPED, AND I WAS STILL ME.', 'GASKET COUNTS TOO SLOW. I DO IT NOW.'],
      alone: ["BRINE WENT UP THE SPINE WITH THEM. I'M DOING THE COUNT HERE TILL SHE'S BACK.", 'SOMEONE HAS TO.'],
    }[id];
  }

  // ---- Hooks the world calls ----
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // A game quit in the wake after the cradles opened, but before the Pruner reached the door (or before the hero
      // heard the counting), keeps what the choice settled: the wake doesn't play again.
      if (f.cradles && s.wardens.pruner === 'release' && !f.greenhouse) f.greenhouse = true;
      if (f.cradles && s.wardens.pruner === 'salvage' && !f.weldShut && !world.scene) {
        Object.assign(f, { weldShut: true, weldSeen: true });
        S.addStory(world, WELDED);
      }
      // At her pumps, unless she's gone home.
      if (id === 'dry-pumps' && s.people.sorrel !== 'home') {
        const n = S.makeNpc(world, 'sorrel', { x: LEVER * 8, y: FLOOR(18) });
        n.facing = -1;
        if (s.people.sorrel === 'stayed') n.lines = stayedLines();
        world.npcs.push(n);
      }
      // Home with Brine, by her door, unless she went up the Spine with the climbers (spine.js). If Brine climbed
      // and there wasn't a place for her, she keeps the count at home, and there's no one to find her.
      const climbing = f.crewCame && S.crewList(s).includes('sorrel');
      const brine = id === 'warrens' && npcOf(world, 'brine');
      if (brine && s.people.sorrel === 'home' && !climbing && !f.running) {
        const alone = f.crewCame && S.crewList(s).includes('brine');
        if (alone) f.sorrelHome = true;
        const n = S.makeNpc(world, 'sorrel', { x: brine.homeX + 12, y: brine.homeY + brine.h - 8 });
        n.state = !f.sorrelHome ? 'hidden' : !alone ? brine.state : S.callName(s) === 'COUNTER' ? 'hidden' : 'out';
        n.facing = -1;
        if (alone) n.lines = homeLines('alone');
        else if (f.sorrelHome) {
          n.lines = homeLines('sorrel');
          brine.lines = homeLines('brine');
        }
        world.npcs.push(n);
      }
    },

    update(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      if (world.scene || world.player.dead || world.transition || world.fade > 0.5) return;
      // Down the hatch for the first time: she's at her pumps, counting.
      if (id === 'dry-pumps' && !s.people.sorrel && npcOf(world, 'sorrel')) return run(world, 'sorrel');
      // Left counting, she keeps on, a stroke at a time (over her head, not in the talk log).
      if (id === 'dry-pumps' && s.people.sorrel === 'stayed' && world.time % 112 === 0) {
        const n = npcOf(world, 'sorrel');
        f.sorrelCount = (f.sorrelCount || 4021) + 1;
        if (n && !world.barks.some((b) => b.n === n)) world.barks.push({ n, text: words(f.sorrelCount) + '.', life: 90, wait: 0 });
      }
      // Brought home: once the news that was waiting is told, Brine finds her.
      if (id === 'warrens' && s.people.sorrel === 'home' && !f.sorrelHome && !f.running && npcOf(world, 'sorrel') && S.newsTold(s, false)) run(world, 'sorrelHome');
    },

    talk(world, npc) {
      const s = world.state;
      const f = s.flags;
      if (npc.id !== 'brine') return null;
      if (s.people.sorrel === 'stayed' && !f.brineAlive) return 'brineAlive';
      if (s.people.sorrel) return null;
      if (s.logs.sorrelGlass && !f.brineGame) return 'brineGame';
      if (f.greenhouse && !s.logs.sorrelGlass && !f.brineRan) return 'brineRan';
      return null;
    },
  });

  // ---- The endings' cards (endings.js) ----
  S.sorrelCards = function (s, id) {
    const home = s.people.sorrel === 'home';
    const stayed = s.people.sorrel === 'stayed';
    if (!home && !stayed) return [];
    const cards = {
      homecoming: home ? ['SORREL AND BRINE PLANTED THE FIRST ROW OF BEANS.', 'SORREL COUNTED THEM IN.'] : ['WHEN THE ARK CAME DOWN, SORREL WALKED OUT OF THE BALLAST, COUNTING.', 'SHE STOPPED AT A HUNDRED. BRINE WAS THERE.'],
      crash: home ? ['SORREL COUNTED THE SLEDS DOWN. EVERY ONE.'] : ['THE PUMPS UNDER THE SETTLING POOLS RAN TO THE END.', 'SOMEONE WAS COUNTING THEM.'],
      dominion: home ? ['SORREL STILL COUNTS AT LIGHTS-OUT, BEHIND THE GATE.'] : ['UNDER THE BALLAST, THE PUMPS KEPT TIME.', 'SORREL NEVER LOST COUNT.'],
      overgrown: home ? ["SORREL COUNTED UNTIL SHE COULDN'T.", 'BRINE KEPT COUNTING FOR HER.'] : ['THE PUMPS UNDER THE SETTLING POOLS STOPPED.', 'THEN THE COUNTING DID.'],
    };
    return cards[id] ? [cards[id]] : [];
  };
  // Who of the Hullfolk she adds to the count: home, wherever the village is; left counting, only if the ship came
  // down whole (Homecoming).
  S.sorrelCounted = (s, id) => s.people.sorrel === 'home' || (id === 'homecoming' && s.people.sorrel === 'stayed');

  Object.assign(S.SCENES, SCENES);
})(window.HA);
