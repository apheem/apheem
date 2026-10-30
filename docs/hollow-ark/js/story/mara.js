'use strict';
// Mara's thread (3.10): the hero's dreams on the story's four nights, each one clearer and longer than the last.
// Mara is the hero's younger sister, but nothing says so before the end; 312 years asleep took the hero's memory,
// and it comes back a night at a time (STORYBOARD.md, "Mara, and the dreams"). The scene that holds a night calls
// yield* HA.story.dream(world, n). The people in the dreams are silhouettes, and nobody says the hero's name.
(function (HA) {
  const S = HA.story;
  const MARA = '#d8c8ff'; // her voice: pale lilac (the Navigator has the pale cyan)
  const MOTHER = '#bfe0b8'; // their mother's: a soft green, unlike anyone awake
  const her = (text, named) => ({ say: named ? 'MARA' : '', text, color: MARA, voice: 'MARA' });
  const me = (text) => ({ say: '', text, color: S.VOICE });
  const mother = (text) => ({ say: '', text, color: MOTHER, voice: 'MOTHER' });

  const DREAMS = [
    // 1. The raid night: the cold, two pods, a promise she doesn't finish. The first blast at the gate wakes the hero.
    function* (world) {
      yield { dream: 'pods', clarity: 0.2 };
      yield { wait: 70 };
      yield her('...IS IT ALWAYS THIS COLD?');
      yield me('ONLY AT FIRST.');
      yield her("PROMISE YOU'LL BE...");
      HA.audio.play('rumble');
      world.shake(3);
      world.dream = null; // cut off, not faded
      S.addStory(world, 'I DREAMED OF TWO PODS IN THE DARK. SOMEONE SMALL ASKED IF IT WAS ALWAYS THIS COLD.');
    },
    // 2. Wick's goodbye night: a lamp, and a list.
    function* (world) {
      yield { dream: 'list', clarity: 0.45 };
      yield { wait: 60 };
      yield her("I'M MAKING A LIST. FOR WHEN WE GET THERE.");
      yield me('READ ME ONE.');
      yield her('NUMBER ONE. SEE A REAL SKY.');
      yield her('NUMBER TWO. EAT SOMETHING THAT GREW IN DIRT.');
      yield me("THAT'S DISGUSTING.");
      yield her("THAT'S WHY IT'S ON THE LIST.");
      yield { wait: 40 };
      yield { dream: false };
      S.addStory(world, "I DREAMED OF A LAMP, AND A LIST: SEE A REAL SKY. EAT SOMETHING THAT GREW IN DIRT. I DON'T KNOW WHOSE LIST IT WAS.");
    },
    // 3. The night Solder leaves: a kitchen in the rain, two places on the Ark, and a third person at the table.
    function* (world) {
      yield { dream: 'tickets', clarity: 0.7 };
      yield { wait: 60 };
      yield mother("TWO PLACES. THAT'S ALL THEY'D GIVE ME.");
      yield her('THEN YOU HAVE MINE.');
      yield mother('NO. YOU GO. BOTH OF YOU.');
      yield mother('YOU KEEP HOLD OF HER HAND. THE WHOLE WAY. YOU HEAR ME?');
      yield me('THE WHOLE WAY.');
      yield her('NUMBER THREE. SLEEP OUTSIDE. ALL THREE OF US.');
      yield { wait: 40 };
      yield mother('...THEN SAVE ME A SPOT.');
      yield { wait: 50 };
      yield { dream: false };
      S.addStory(world, 'I DREAMED OF A KITCHEN IN THE RAIN, AND TWO TICKETS. SOMEONE TOLD ME TO KEEP HOLD OF HER HAND THE WHOLE WAY. I SAID I WOULD.');
    },
    // 4. The Crew Camp: boarding day, clear at last. She goes under first, and her name comes back.
    function* (world) {
      yield { dream: 'boarding', clarity: 0.95 };
      yield { wait: 60 };
      yield her('YOU GO FIRST.', true);
      yield me("NO. YOU FIRST. I'LL WATCH THE WHOLE TIME.");
      yield her("WHAT IF I WAKE UP AND YOU'RE NOT THERE?", true);
      yield me("THEN I'M LATE, AND YOU CAN SHOUT AT ME.");
      yield her("I'M PUTTING IT ON THE LIST. NUMBER FIVE. DON'T BE LATE.", true);
      yield me("I WON'T BE. I'LL BE THE FIRST THING YOU SEE.");
      yield her('PROMISE?', true);
      yield me('PROMISE.');
      yield { wait: 90 };
      yield { dream: false };
      S.addStory(world, "I DREAMED OF THE DAY WE BOARDED. MARA WENT UNDER FIRST, AND I WATCHED. I PROMISED I'D BE THE FIRST THING SHE SAW. I PROMISED I WOULDN'T BE LATE.");
    },
  ];

  S.dream = function* (world, n) {
    world.state.flags['dream' + n] = true;
    yield* DREAMS[n - 1](world);
  };

  // Number four on the list comes back the first time the hero is in water over their head, in the Ballast.
  S.areas.push({
    update(world) {
      const f = world.state.flags;
      if (f.swimList || world.scene || world.def.area !== 'ballast' || !world.player.wet) return;
      f.swimList = true;
      S.think(world, 'NUMBER FOUR. LEARN TO SWIM.');
    },
  });
})(window.HA);
