'use strict';
// Old Gasket's trust (3.11, Cody's notes): she comes round to the hero slowly, and it shows in what she says, never
// as a number. Trust is worked out from the save: the wrench hung up, Cleat's count shown, Shim told the truth about
// his mother (choice 4), Flux home (choice 6), and the village calling the hero LATE. The scenes are short, at home,
// when the hero talks to her, each once; the main conversations at home always come first. All text is original
// to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const npcOf = S.npcOf;
  const VOICE = S.VOICE;
  const say = (who, text, color) => ({ say: who, text, color });
  const me = (text) => ({ say: '', text, color: VOICE });

  S.gasketTrust = (s) =>
    [s.flags.gasketWrench, s.flags.gasketCleat, s.toldShim === 'truth', s.people.flux === 'home', S.callName(s) === 'LATE'].filter(Boolean).length;

  const SCENES = {
    // Shim brought back: the wrench she's kept by her since the hero came down the walkway goes on its hook.
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
      yield me('SHE HANGS IT ON A HOOK BY HER DOOR.');
      S.addStory(world, "OLD GASKET HUNG UP THE WRENCH SHE'D KEPT BY HER SINCE I CAME. I HAVEN'T TURNED INTO THE LAST SLEEPER. YET, SHE SAID.");
      world.save();
    },
    // The taken home: her brother Cleat's count of days on the wall by her door.
    *gasketCleat(world) {
      world.state.flags.gasketCleat = true;
      yield { wait: 20 };
      yield say('OLD GASKET', 'SEE THESE MARKS?');
      yield me('SCRATCHES IN THE WALL BY HER DOOR. HUNDREDS OF THEM, IN FIVES.');
      yield say('OLD GASKET', 'MY BROTHER CLEAT COUNTED THE DAYS ON THIS WALL, TILL SOMEBODY CAME DOWN TO HELP US. HE GOT TO NINE HUNDRED AND TWELVE.');
      yield say('OLD GASKET', 'THEN A SLEEPER CAME DOWN.');
      yield me("I'M NOT HIM.");
      yield { wait: 40 };
      yield say('OLD GASKET', 'NO. YOU BROUGHT THEM HOME.');
      S.addStory(world, "GASKET SHOWED ME HER BROTHER CLEAT'S MARKS ON THE WALL: NINE HUNDRED AND TWELVE DAYS, WAITING FOR SOMEBODY TO COME AND HELP. THEN A SLEEPER CAME. 'YOU BROUGHT THEM HOME,' SHE SAID.");
      world.save();
    },
  };

  S.areas.push({
    // Talking to her at home, once the main conversations there are done: the next step, if it's due.
    talk(world, npc) {
      const s = world.state;
      const f = s.flags;
      if (npc.id !== 'gasket' || world.def.id !== 'warrens' || f.running || world.nightScene) return null;
      // The wrench: between the reunion and the Gardens, or (missed then) once her grief for Wick has had its say.
      const settled = f.homeAgain && f.broadcastHeard;
      if (!f.gasketWrench && ((f.reunion && f.homeDone && !f.gardens) || settled)) return 'gasketWrench';
      if (f.gasketWrench && settled && !f.gasketCleat) return 'gasketCleat';
      return null;
    },
  });

  Object.assign(S.SCENES, SCENES);
})(window.HA);
