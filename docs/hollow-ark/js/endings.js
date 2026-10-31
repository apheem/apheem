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
  // Each line says what was down there and why it stayed shut, since a hero who missed it never saw it: the old
  // crew lift under the Helm (Lift B), and the sealed deck it goes down to.
  const REQUIREMENTS = [
    { id: 'wardens', ok: (s) => released(s) === 3, line: 'THE OLD CREW LIFT UNDER THE HELM GOES DOWN TO A SEALED DECK. ONLY FREED WARDENS OPEN IT.' },
    { id: 'solder', ok: (s) => solderAlive(s), line: 'THE OLD CREW LIFT UNDER THE HELM WAS BROKEN. ONLY SOLDER COULD HAVE MENDED IT.' },
    { id: 'crew', ok: (s) => s.crew >= 8, line: "THE OLD LIFT'S BRAKE NEEDS EIGHT PAIRS OF HANDS. TOO FEW CLIMBED WITH ME." },
    { id: 'bloom', ok: (s) => s.bloom <= 2, line: 'THE DECK UNDER THE HELM LETS ONLY THE CLEAN IN. THE BLOOM WAS TOO DEEP IN ME.' },
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
  // A picture behind a card (pictures.js), with its variant.
  const pic = (c, name, opts = {}) => Object.assign(c, { pic: name, picOpts: opts });
  const BLOOM = '#f27ad8'; // what the Bloom left of the hero

  function warrensCard(s, whole, fell, opts) {
    return pic(card(s.warrensRaid === 'fell' ? fell : whole), 'warrens', Object.assign({ few: s.warrensRaid === 'fell' }, opts));
  }

  function shimCard(s, line, opts) {
    const lantern = s.toldShim === 'truth' || s.shimKnows === true;
    return pic(lantern ? card(line, ["HE CARRIED HIS MOTHER'S LANTERN.", DIM]) : card(line), 'shim', Object.assign({ lantern }, opts));
  }

  function wardensCount(s) {
    const n = released(s);
    if (n === 3) return [pic(count('COUNT: WARDENS, 3.', 'NAMES: REMEMBERED.'), 'wardens', { n }), pic(count('MY NAME WAS USHER.', 'I SHOWED THEM TO THEIR BEDS.'), 'wardens', { n })];
    if (n > 0) return [pic(count('COUNT: WARDENS, ' + n + '.', 'NAMES: REMEMBERED.'), 'wardens', { n })];
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

  // ---- Who reached the new world, out of everyone who could have: the results after the credits ----
  // The Warrens are twenty, plus the taken who came home from the Gardens (eleven at most). The sleepers are
  // every pod still in the stacks. Every number follows a line the epilogue says.
  const HULLFOLK_MOST = 20 + 11;
  const SLEEPERS = 3986;
  function landed(s, id) {
    const pods = id === 'homecoming' || (id === 'crash' && s.podsLaunched > 0);
    let hullfolk = 0;
    if (id === 'homecoming') hullfolk = hullfolkCount(s); // "THE WARRENS CAME DOWN WHOLE", or those who hid came too
    // On the sleds the whole village made it if the gate held; if it fell, only the few left (the crew and Tamp).
    if (id === 'crash') hullfolk = s.warrensRaid === 'fell' ? Math.min(hullfolkCount(s), s.crew + 1) : hullfolkCount(s);
    return {
      hullfolk,
      sleepers: pods ? SLEEPERS : 0,
      mara: pods,
      hero: id === 'crash' || id === 'deserter' || (id === 'homecoming' && s.people.navigator !== 'stay'),
    };
  }

  // Long lines broken to fit the screen.
  function wrap(text, width = HA.VIEW_W - 24) {
    const out = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (line && HA.font.measure(next) > width) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  const yes = (ok) => (ok ? 'YES' : 'NO');
  function resultCard(s, id) {
    const got = landed(s, id);
    const n = released(s);
    return [
      ['ENDING · ' + NAMES[id], '#ffb84d'],
      [seenLine(s.endingsSeen), DIM],
      '',
      ['WHO REACHED THE NEW WORLD', DIM],
      { a: 'HULLFOLK', b: got.hullfolk + ' OF ' + HULLFOLK_MOST },
      { a: 'SLEEPERS', b: got.sleepers + ' OF ' + SLEEPERS },
      { a: 'MARA', b: yes(got.mara) },
      { a: 'YOU', b: yes(got.hero) },
      '',
      { a: 'WARDENS FREED', b: n + ' OF 3' },
      { a: 'MERCY · BLOOM', b: s.mercy + ' · ' + s.bloom },
    ];
  }

  // What closed the way to Homecoming, in the journal's own words (Part 4: "the journal notes it afterward").
  function closedCard(s, id) {
    if (id === 'homecoming') return null;
    const why = [];
    if (id === 'deserter') why.push('I TOOK THE BOAT, AND LEFT THE REST OF IT UNFINISHED.');
    if (id === 'overgrown') why.push('THE BLOOM HAD TOO MUCH OF ME BY THE END.');
    if (id === 'dominion') why.push('BY THE END I WANTED THE KEY MORE THAN THE GROUND.');
    if (id !== 'deserter') for (const r of missing(s)) if (!why.includes(r.line)) why.push(r.line);
    if (!why.length) return null;
    const lines = [['WHAT CLOSED THE OTHER WAY', DIM], ''];
    for (const w of why) lines.push(...wrap(w).map((l) => [l, VOICE]), '');
    lines.pop();
    return lines;
  }

  const EPILOGUES = {
    homecoming(s) {
      const stayed = s.people.navigator === 'stay';
      // Mara's cards never say what she is to the hero: the build-up has said it (Cody, Oct 31; STORYBOARD.md,
      // "Mara, and the dreams").
      const mara = stayed
        ? [pic(card('MARA WOKE ALONE. THEY TOLD HER:', ['THE ONE IN 0417 STAYED WITH THE SHIP.', DIM]), 'mara', { alone: true, night: true }), pic(voice('SHE HAS HER SKY. I KEPT THE SHIP COMPANY.', 'FORGIVE ME FOR BEING LATE, MARA.'), 'mara', { alone: true, night: true })]
        : [pic(voice('MARA WOKE UNDER A REAL SKY.', "I WAS THE FIRST THING SHE SAW. I WASN'T LATE."), 'mara', { hero: true, list: true }), pic(card('THAT NIGHT WE SLEPT OUTSIDE.', ['MARA AND ME. WE LEFT ROOM FOR A THIRD.', DIM]), 'mara', { hero: true, night: true })];
      const out = [
        shimCard(s, 'SHIM STOOD ON THE GROUND. NOT A FLOOR.'),
        pic(card('OLD GASKET BREATHED OUT.', "SHE SAID CLEAT'S NAME TO THE SKY."), 'gasket'),
        pic(card("SOLDER BUILT THE FIRST CITY'S FIRST GATE.", 'IT OPENS FROM BOTH SIDES.'), 'gate'),
        warrensCard(s, 'THE WARRENS CAME DOWN WHOLE, LANTERNS AND ALL.', 'THE ONES WHO HID IN THE DEEP WALLS CAME DOWN TOO.'),
        ...wardensCount(s),
        pic(card('THE PODS OPENED UNDER A REAL SKY.'), 'sleepers'),
        // The small payoffs (the audit's fix 7): the seed vault's "TO BE OPENED UNDER A REAL SKY", Dunn's promise to
        // his girl, and Odell's "IF FOUND, RETURN TO ODELL".
        pic(card('THE SEED VAULT WAS OPENED UNDER A REAL SKY.', 'WE STARTED WITH BEANS.'), 'seeds'),
        ...(HA.story.crewList(s).includes('dunn') ? [pic(card("DUNN'S GIRL GOT HER STAR.", 'HE SHOWED HER ALL OF THEM.'), 'star')] : []),
        pic(card("ODELL'S BOOTS WENT BACK TO HIM IN THE COLD STORE.", 'RETURNED, AS ASKED. HE HAD HIS ANSWER.'), 'odell'),
        ...mara,
      ];
      if (stayed) out.push(pic({ lines: [['NOT ALONE.', NAV]] }, 'navigator'));
      else if (s.people.navigator === 'core') out.push(pic(card("THE NAVIGATOR'S CORE LIT A SCHOOL.", 'IT HUMMED AT NIGHT.'), 'navigator', { school: true }));
      else out.push(pic({ lines: [['THE NAVIGATOR SLEPT.', NAV]] }, 'navigator'));
      return out.concat(others(s));
    },

    crash(s) {
      const pods = s.podsLaunched > 0;
      return [
        pic(count('COUNT: SURVIVORS, ' + (landed(s, 'crash').hullfolk + 1) + '.'), 'warrens', { sleds: true, few: s.warrensRaid === 'fell' }),
        pods ? pic(card('THE PODS CAME DOWN LIKE SEEDS.', 'MOST OF THEM OPENED.'), 'sleepers', { falling: true }) : pic(card('THE POD STACKS WENT DOWN WITH THE ARK.'), 'sleepers', { dark: true }),
        pods ? pic(voice('0418 OPENED IN THE TALL GRASS.', 'I GOT THERE BEFORE SHE WOKE.'), 'mara', { grass: true, hero: true }) : voice("I PROMISED I'D BE THERE WHEN MARA WOKE.", 'SHE NEVER DID.'),
        shimCard(s, 'SHIM STOOD ON THE GROUND. IT WAS STILL BURNING.', { burning: true }),
        pic(card('OLD GASKET COUNTED THEM AT LIGHTS-OUT, LIKE ALWAYS.'), 'gasket', { fire: true }),
        solderAlive(s) ? pic(card('SOLDER STARTED ON A GATE', 'BEFORE THE FIRES WERE OUT.'), 'gate') : card("SOLDER'S GATE WENT DOWN WITH THE ARK."),
        warrensCard(s, 'THE WARRENS RODE THE SLEDS DOWN TOGETHER.', 'THE FEW LEFT FROM THE WARRENS RODE THE LAST SLED.', { sleds: true }),
        ...wardensCount(s),
        ...others(s),
        { lines: [], space: true, ark: { x: 124, y: 78, s: 2, broken: 1 } },
      ];
    },

    dominion(s) {
      return [
        pic(card('THE HULLFOLK SEALED THEIR GATE', 'AND HELD THEIR BREATH.'), 'shaft'),
        card('OLD GASKET NEVER SAID MY NAME AGAIN.'),
        solderAlive(s) ? pic(card('SOLDER BUILT A GATE THAT OPENED', 'FROM ONE SIDE ONLY. THEIRS.'), 'gate', { shut: true }) : card('NO ONE BUILT THE WARRENS A NEW GATE.'),
        pic(count('COUNT: WARDENS, ALL.', 'FOR THE NEW HOLDER.'), 'wardens', { holder: true }),
        voice('THEY ARE SAFER ASLEEP.'),
        pic(card('THE SLEEPERS STAYED ASLEEP.', ['MARA AMONG THEM.', DIM]), 'sleepers', { dark: true }),
        pic(voice('I HAD THE KEY. I COULD HAVE WOKEN HER.', 'I TOLD MYSELF SHE WAS SAFER ASLEEP.'), 'sleepers', { dark: true }),
        ...others(s),
        { lines: ['THE SHIP KEPT CIRCLING.'], space: true, ark: { x: 124, y: 104, s: 1 } },
      ];
    },

    overgrown(s) {
      const fighter = solderAlive(s) ? 'SOLDER' : 'OLD GASKET';
      return [
        card(fighter + ' WALKED OUT OF THE HELM ALIVE.', "SHE DIDN'T TALK ABOUT IT."),
        pic(card('SHIM STOPPED ASKING ABOUT THE GROUND.'), 'shaft'),
        card('THE WARRENS WENT BACK INTO HIDING.'),
        pic(card('PINK FUNGUS GREW ON THE POD GLASS.', ['ON 0418 FIRST.', DIM]), 'mara', { pink: true }),
        pic({ lines: [["I'M RIGHT HERE, LITTLE ONE.", BLOOM], ["I'M NOT LATE.", BLOOM]] }, 'mara', { pink: true, hero: true }),
        ...wardensCount(s),
        ...others(s),
        { lines: [['NOT YET.', NAV]] },
      ];
    },

    // The hero is gone, so the news comes as the Wardens' counts on the boat's radio, fading out.
    deserter(s) {
      // From the Crew Camp (the Purser's last call), the climbers are up the Spine, and Shim may be in the vents.
      const climbing = !!s.flags.crewCame;
      const solder = s.people.solder === 'alive' ? (climbing ? 'COUNT: SOLDER. LOCATION: THE SPINE.' : 'COUNT: SOLDER. AT THE GATE.') : s.people.solder === 'dead' ? 'COUNT: SOLDER, 0.' : 'COUNT: SOLDER. NOT RECORDED.';
      const shim = s.flags.shimRanOff ? ['COUNT: SHIM. LOCATION: THE VENTS.', 'CLIMBING.'] : ['COUNT: SHIM. LOCATION: THE WARRENS.', 'WATCHING THE GATE.'];
      return [
        count('COUNT: HULLFOLK, ' + hullfolkCount(s) + '.'),
        count(solder),
        count(...shim),
        { lines: [['...', COUNT]], hold: 90 },
        pic(voice('I LANDED ALONE. THE FIRST PERSON ON THE NEW WORLD,', '232 YEARS LATE, WITH NO ONE TO TELL.'), 'boat'),
        pic(voice('I STOOD ON THE GROUND. NOT A FLOOR.'), 'boat'),
        pic(voice('I LEFT MARA IN 0418.', "SHE'LL WAKE WITHOUT ME."), 'sleepers', { dark: true }),
      ];
    },
  };

  // ---- Closing scenes: what plays between the last choice and the epilogue ----
  const CLOSING = {
    homecoming: [
      { lines: ['THE ARK TURNED.'], space: 'in', ark: { x: 96, y: 60, s: 2, drive: 1, turn: 0.35 }, world: { x: 262, y: 140, r: 16 }, hold: 300, top: 24 },
      { lines: ['FOR THE FIRST TIME IN 274 YEARS,', 'IT WAS ON ITS WAY IN.'], space: true, ark: { x: 120, y: 92, s: 1, drive: 1 }, world: { x: 250, y: 130, r: 22 }, hold: 240, top: 24 },
    ],
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

  const step = (c, top) => ({ card: c.lines, hold: c.hold || (c.pic ? 240 : 200), space: c.space, ark: c.ark, world: c.world, pic: c.pic, picOpts: c.picOpts, top: c.top !== undefined ? c.top : top });

  function record(s, id) {
    s.ending = id;
    if (!s.endingsSeen.includes(id)) s.endingsSeen.push(id);
  }

  // After the ending's name: how long the run took, area by area, and how often the hero fell.
  function runCard(s) {
    const lines = [['THIS RUN', '#ffb84d'], '', { a: 'TIME', b: HA.clock(s.time) + ' · FALLS ' + s.deaths }, ''];
    for (const id of Object.keys(HA.rooms.AREAS)) if (s.areaTime[id]) lines.push({ a: HA.rooms.AREAS[id].name, b: HA.clock(s.areaTime[id]) });
    if (s.areaTime.endings) lines.push({ a: 'THE ENDING', b: HA.clock(s.areaTime.endings) });
    return lines;
  }

  function* play(world, id) {
    const s = world.state;
    world.ending = id;
    HA.audio.charge(0);
    yield { fade: 'out', frames: 60 };
    HA.music.play(null);
    yield { wait: 40 };
    for (const c of CLOSING[id]) yield step(c, c.space ? 40 : undefined);
    yield { card: [['ENDING · ' + NAMES[id], '#ffb84d']], hold: 160 };
    if (id === 'crash' || id === 'homecoming') HA.music.play('title');
    for (const c of EPILOGUES[id](s)) yield step(c, c.space ? 40 : undefined);
    HA.music.play('title');
    for (const lines of CREDITS) yield { card: lines, hold: 180, space: true };
    record(s, id);
    world.save();
    // The results wait for a press, so they can be read (and photographed) however the credits were skipped.
    yield { card: resultCard(s, id), press: true, gap: 11 };
    const closed = closedCard(s, id);
    if (closed) yield { card: closed, press: true, gap: closed.length > 14 ? 10 : 11 };
    yield { card: runCard(s), press: true, gap: 11 };
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

  HA.endings = { NAMES, ORDER, REQUIREMENTS, missing, afterSteward, run, play, lines, seenLine, runCard, resultCard, closedCard, landed, epilogue: (id, s) => EPILOGUES[id](s), step };
})(window.HA);
