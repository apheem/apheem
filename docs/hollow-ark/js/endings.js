'use strict';
// The five endings: each one's closing scene, its epilogue (cards chosen from what the player did), the
// credits, and the record of every ending reached. The story calls HA.endings.run(world, id) when an ending
// is earned; the endings themselves are reached in Phase 3.3 onward (see STORYBOARD.md, Part 3).
(function (HA) {
  const COUNT = '#5fd4e8'; // the Wardens' counts
  const NAV = '#b8f4ff'; // the Navigator
  const VOICE = '#f2c88a'; // the hero's own thoughts
  const DIM = '#6c7894';

  const NAMES = { homecoming: 'HOMECOMING', crash: 'CRASH', dominion: 'DOMINION', overgrown: 'OVERGROWN', deserter: 'DESERTER' };
  const ORDER = ['deserter', 'dominion', 'overgrown', 'crash', 'homecoming'];

  const released = (s) => ['bailiff', 'pruner', 'tallyman'].filter((k) => s.wardens[k] === 'release').length;
  const solderAlive = (s) => s.people.solder === 'alive';

  // ---- What the true ending needs (Part 4), with the journal line for each one that's missing ----
  const REQUIREMENTS = [
    { id: 'wardens', ok: (s) => released(s) === 3, line: 'THE WARDENS DID NOT TRUST ME ENOUGH TO SHOW ME WHAT THEY GUARDED.' },
    { id: 'solder', ok: (s) => solderAlive(s), line: 'WITHOUT SOLDER, NO ONE COULD MEND THE LIFT.' },
    { id: 'crew', ok: (s) => s.crew >= 8, line: 'TOO FEW OF THEM CLIMBED WITH ME TO MOVE THE LIFT.' },
    { id: 'bloom', ok: (s) => s.bloom <= 2, line: 'THE SEAL READ THE BLOOM IN ME AND STAYED SHUT.' },
  ];
  const missing = (s) => REQUIREMENTS.filter((r) => !r.ok(s));
  // Where the story goes once the Steward falls: Overgrown takes the hero, Dominion is offered, the lift
  // opens for Homecoming, or the scuttle starts and it's Crash.
  function afterSteward(s) {
    if (s.bloom >= 8) return 'overgrown';
    if (s.mercy <= -3) return 'dominion';
    if (!missing(s).length) return 'homecoming';
    return 'crash';
  }

  // ---- The epilogue: a list of cards, each a list of lines ([text, color] for a colored line) ----
  function card(...lines) {
    return { lines };
  }
  const count = (...lines) => ({ lines: lines.map((l) => [l, COUNT]) });
  const voice = (...lines) => ({ lines: lines.map((l) => [l, VOICE]) });

  function warrensCard(s, whole, fell) {
    if (s.warrensRaid === 'fell') return card(fell);
    return card(whole);
  }

  function shimCard(s, line) {
    const lantern = s.toldShim === 'truth' || s.shimKnows === true;
    return lantern ? card(line, ["HE CARRIED HIS MOTHER'S LANTERN.", DIM]) : card(line);
  }

  function wardensCount(s) {
    const n = released(s);
    if (n === 3) return [count('COUNT: WARDENS, 3.', 'NAMES: REMEMBERED.'), count('MY NAME WAS USHER.', 'I SHOWED THEM TO THEIR BEDS.')];
    if (n > 0) return [count('COUNT: WARDENS, ' + n + '.', 'NAMES: REMEMBERED.')];
    return [count('COUNT: WARDENS, 0.', 'NAMES: NOT RECORDED.')];
  }

  // The people whose fates only matter where the story reached them.
  function others(s) {
    const out = [];
    const p = s.people;
    if (p.flux === 'home') out.push(card('FLUX FLEW HOME TO THE WARRENS, AND STAYED THERE.'));
    if (p.flux === 'stripped') out.push(card('NO ONE SAW FLUX AGAIN.'));
    if (p.abel === 'spared') out.push(card('ABEL, THE STOKER, LIVED TO FEEL THE GROUND.'));
    if (p.steward === 'spared') out.push(card('MARRANT LIVED OUT HIS YEARS', "IN A COLONY HE DIDN'T RULE."));
    if (p.steward === 'ended') out.push(card('NO ONE MOURNED THE STEWARD.'));
    if (p.steward === 'counted') out.push(count('COUNT: STEWARD, 1.', 'HELD.'));
    if (p.gardener === 'spared') out.push(card('HESTER VALE NEVER GREW ANYTHING AGAIN.'));
    if (p.gardener === 'dosed') out.push(card('THE GARDENER WENT INTO THE BLOOM SHE MADE.'));
    if (p.gardener === 'passed') out.push(card('THE GARDENER WAS NEVER FOUND.'));
    return out;
  }

  function hullfolkCount(s) {
    return 20 + (s.takenHome || 0);
  }

  const EPILOGUES = {
    homecoming(s) {
      const stayed = s.people.navigator === 'stay';
      const out = [
        shimCard(s, 'SHIM STOOD ON THE GROUND. NOT A FLOOR.'),
        card('OLD GASKET BREATHED OUT.'),
        card("SOLDER BUILT THE FIRST CITY'S FIRST GATE.", 'IT OPENS FROM BOTH SIDES.'),
        warrensCard(s, 'THE WARRENS CAME DOWN WHOLE, LANTERNS AND ALL.', 'THE ONES WHO HID IN THE DEEP WALLS CAME DOWN TOO.'),
        ...wardensCount(s),
        card('THE PODS OPENED UNDER A REAL SKY.'),
        stayed ? card('MARA WOKE ALONE. THEY TOLD HER:', ['THE ONE IN 0417 STAYED WITH THE SHIP.', DIM]) : voice('MARA WOKE UNDER A REAL SKY.', 'I WAS THERE, LIKE I PROMISED.'),
      ];
      if (stayed) out.push({ lines: [['NOT ALONE.', NAV]] });
      else if (s.people.navigator === 'core') out.push(card("THE NAVIGATOR'S CORE LIT A SCHOOL.", 'IT HUMMED AT NIGHT.'));
      else out.push({ lines: [['THE NAVIGATOR SLEPT.', NAV]] });
      return out.concat(others(s));
    },

    crash(s) {
      const pods = s.podsLaunched > 0;
      return [
        count('COUNT: SURVIVORS, ' + (s.crew + 1) + '.'),
        pods ? card('THE PODS CAME DOWN LIKE SEEDS.', 'MOST OF THEM OPENED.') : card('THE POD STACKS WENT DOWN WITH THE ARK.'),
        pods ? voice('0418 OPENED IN THE TALL GRASS.', 'I GOT THERE BEFORE SHE WOKE.') : voice("I PROMISED I'D BE THERE WHEN MARA WOKE."),
        shimCard(s, 'SHIM STOOD ON THE GROUND. IT WAS STILL BURNING.'),
        card('OLD GASKET COUNTED THEM AT LIGHTS-OUT, LIKE ALWAYS.'),
        solderAlive(s) ? card('SOLDER STARTED ON A GATE', 'BEFORE THE FIRES WERE OUT.') : card("SOLDER'S GATE WENT DOWN WITH THE ARK."),
        warrensCard(s, 'THE WARRENS RODE THE SLEDS DOWN TOGETHER.', 'THE FEW LEFT FROM THE WARRENS RODE THE LAST SLED.'),
        ...wardensCount(s),
        ...others(s),
        { lines: [], space: true, ark: { x: 124, y: 78, s: 2, broken: 1 } },
      ];
    },

    dominion(s) {
      return [
        card('THE HULLFOLK SEALED THEIR GATE', 'AND HELD THEIR BREATH.'),
        card('OLD GASKET NEVER SAID MY NAME AGAIN.'),
        solderAlive(s) ? card('SOLDER BUILT A GATE THAT OPENED', 'FROM ONE SIDE ONLY. THEIRS.') : card('NO ONE BUILT THE WARRENS A NEW GATE.'),
        count('COUNT: WARDENS, ALL.', 'FOR THE NEW HOLDER.'),
        voice('THEY ARE SAFER ASLEEP.'),
        card('THE SLEEPERS STAYED ASLEEP.', ['MARA AMONG THEM.', DIM]),
        ...others(s),
        { lines: ['THE SHIP KEPT CIRCLING.'], space: true, ark: { x: 124, y: 104, s: 1 } },
      ];
    },

    overgrown(s) {
      const fighter = solderAlive(s) ? 'SOLDER' : 'OLD GASKET';
      return [
        card(fighter + ' WALKED OUT OF THE HELM ALIVE.', "SHE DIDN'T TALK ABOUT IT."),
        card('SHIM STOPPED ASKING ABOUT THE GROUND.'),
        card('THE WARRENS WENT BACK INTO HIDING.'),
        card('PINK FUNGUS GREW ON THE POD GLASS.', ['ON 0418 FIRST.', DIM]),
        ...wardensCount(s),
        ...others(s),
        { lines: [['NOT YET.', NAV]] },
      ];
    },

    // The hero is gone, so the news comes as the Wardens' counts on the boat's radio, fading out.
    deserter(s) {
      const solder = s.people.solder === 'alive' ? 'COUNT: SOLDER. AT THE GATE.' : s.people.solder === 'dead' ? 'COUNT: SOLDER, 0.' : 'COUNT: SOLDER. NOT RECORDED.';
      return [
        count('COUNT: HULLFOLK, ' + hullfolkCount(s) + '.'),
        count(solder),
        count('COUNT: SHIM. LOCATION: THE WARRENS.', 'WATCHING THE GATE.'),
        { lines: [['...', COUNT]], hold: 90 },
        voice('I LANDED ALONE. THE FIRST PERSON ON THE NEW WORLD,', '232 YEARS LATE, WITH NO ONE TO TELL.'),
        voice('I STOOD ON THE GROUND. NOT A FLOOR.'),
        voice('I LEFT MARA IN 0418.'),
      ];
    },
  };

  // ---- Closing scenes: what plays between the last choice and the epilogue ----
  const CLOSING = {
    homecoming: [{ lines: ['THE ARK TURNED.'], space: 'in', ark: { x: 124, y: 88, s: 2, drive: 1 }, hold: 260 }],
    crash: [
      { lines: ['THE SLEDS FELL AWAY.'], space: 'in', ark: { x: 124, y: 88, s: 2, broken: 0.2 }, hold: 200 },
      { lines: ['THE ARK CAME APART AGAINST THE STARS.'], space: true, ark: { x: 124, y: 88, s: 2, broken: 0.7 }, hold: 220 },
    ],
    dominion: [
      { lines: [['NEW HOLDER. AWAITING ORDERS.', COUNT]] },
      { lines: [['COUNT THEM.', VOICE]] },
      { lines: ['SHIM WAS WATCHING.'] },
      { lines: [['THANK YOU.', NAV]], hold: 120 },
    ],
    overgrown: [{ lines: ['WHAT WAS LEFT OF ME', 'WENT ON GROWING.'] }],
    deserter: [{ lines: ["THE ARK SHRANK IN THE BOAT'S WINDOW."], space: 'in', ark: { x: 150, y: 96, s: 1 }, hold: 240 }],
  };

  const CREDITS = [
    ['HOLLOW ARK'],
    [['DIRECTION', DIM], 'CODY'],
    [['BUILT WITH', DIM], 'CLAUDE CODE'],
    ['EVERY SPRITE, NOTE AND LINE', 'WAS MADE FOR THIS GAME.'],
    ['THANK YOU FOR PLAYING.'],
  ];

  const step = (c, top) => ({ card: c.lines, hold: c.hold || 200, space: c.space, ark: c.ark, top });

  function record(s, id) {
    s.ending = id;
    if (!s.endingsSeen.includes(id)) s.endingsSeen.push(id);
  }

  function* play(world, id) {
    const s = world.state;
    HA.audio.charge(0);
    yield { fade: 'out', frames: 60 };
    HA.music.play(null);
    yield { wait: 40 };
    for (const c of CLOSING[id]) yield step(c, c.space ? 40 : undefined);
    if (id === 'crash' || id === 'homecoming') HA.music.play('title');
    for (const c of EPILOGUES[id](s)) yield step(c, c.space ? 40 : undefined);
    HA.music.play('title');
    for (const lines of CREDITS) yield { card: lines, hold: 180, space: true };
    record(s, id);
    world.save();
    yield { card: [['ENDING · ' + NAMES[id], '#ffb84d'], '', seenLine(s.endingsSeen)], hold: 300 };
    world.exitToTitle = true;
  }

  const seenLine = (seen) => 'ENDINGS SEEN · ' + seen.length + ' OF ' + ORDER.length;

  function run(world, id) {
    if (!EPILOGUES[id]) throw new Error('No ending called ' + id);
    HA.scenes.run(world, () => play(world, id), { name: 'ending:' + id });
  }

  // Every line an ending would show for this save, closing scene and epilogue, for the checks.
  function lines(id, s) {
    const all = [...CLOSING[id], ...EPILOGUES[id](s)];
    return all.flatMap((c) => c.lines.map((l) => (Array.isArray(l) ? l[0] : l)));
  }

  HA.endings = { NAMES, ORDER, REQUIREMENTS, missing, afterSteward, run, play, lines, seenLine };
})(window.HA);
