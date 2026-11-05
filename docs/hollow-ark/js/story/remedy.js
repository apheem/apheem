'use strict';
// Wick's remedy (STORYBOARD.md, "The other side quests", 2). Wick was the healer. Home from the Gardens without her,
// the hero finds her notebook on her doorstep: she was working out how to draw the dose out of the taken. It wants
// three things the main path passes near: lichen from under the Cold Store's ice, silt from the bottom of the
// Settling Pools' deep sump, and ash from the Reactor Throat's furnace once Abel is down. Brought to a bench (the
// Warrens', or Solder's at the Crew Camp), they make one dose, and the hero decides: cut it into the Warrens' water,
// so the woken stop dreaming pink (Mercy +1), or take it themselves (Bloom -2: the only thing that ever takes the
// Bloom down, and nothing once Overgrown is locked in).
// Flags: remedyRead, remedyLichen, remedySilt, remedyAsh; remedy 'woken' | 'hero' once it's made. Log: wickNotebook.
// All text is original to Hollow Ark.
(function (HA) {
  const S = HA.story;
  const npcOf = S.npcOf;
  const say = (who, text) => ({ say: who, text });
  const me = (text) => ({ say: '', text, color: S.VOICE });
  const NOTE = '#e8d8b0'; // Wick's hand, in pencil

  // Where each thing is: its room, the tile its log stands on (feet on the bottom of row ty), and how it looks.
  const NOTEBOOK = { room: 'warrens', tx: 57, ty: 10 };
  const PARTS = [
    { key: 'remedyLichen', room: 'cold-store', tx: 3, ty: 11, name: 'LICHEN', label: '{up} SCRAPE THE LICHEN', line: 'LICHEN, GROWING UP THE WALL UNDER THE ICE. IT CRUNCHES LIKE FROST.', when: () => true },
    { key: 'remedySilt', room: 'settling-pools', tx: 32, ty: 43, name: 'SILT', label: '{up} SCOOP THE SILT', line: 'SILT, SETTLED AT THE BOTTOM OF THE DEEPEST POOL. A HUNDRED YEARS OF IT.', when: () => true },
    { key: 'remedyAsh', room: 'reactor-throat', tx: 23, ty: 18, name: 'ASH', label: '{up} SWEEP UP THE ASH', line: "ASH FROM THE FURNACE MOUTH. IT'S STILL WARM.", when: (s) => !!s.flags.abelDown },
  ];
  const have = (s) => PARTS.filter((x) => s.flags[x.key]).length;
  S.remedyReady = (s) => !!s.flags.remedyRead && have(s) === PARTS.length && !s.flags.remedy;

  Object.assign(S.LOGS, {
    wickNotebook: {
      title: "WICK'S NOTEBOOK",
      text: "THE DOSE ISN'T POISON. IT'S A SEED, AND IT HATES THREE THINGS: LICHEN OFF ICE THAT NEVER THAWS, SILT FROM THE BOTTOM OF STANDING WATER, ASH FROM A FURNACE MOUTH. BOUND TOGETHER: ONE DOSE.",
    },
  });

  const bookOut = (s) => !!s.flags.homeAgain && !s.flags.running;
  const logAt = (o, id, scene, label) => ({ id, scene, label, x: o.tx * 8 - 1, y: (o.ty + 1) * 8 - 12, w: 10, h: 12, read: true });

  const SCENES = {
    // ---- Wick's doorstep ----
    *wickNotebook(world) {
      const s = world.state;
      const f = s.flags;
      const first = !f.remedyRead;
      f.remedyRead = true;
      s.logs.wickNotebook = true;
      HA.audio.play('terminal');
      yield { say: "WICK'S NOTEBOOK", text: "THE DOSE ISN'T POISON. IT'S A SEED. IT WANTS WARM AND WET AND DARK, AND IT HATES THREE THINGS.", color: NOTE };
      yield { say: "WICK'S NOTEBOOK", text: 'LICHEN OFF ICE THAT NEVER THAWS. SILT FROM THE BOTTOM OF STANDING WATER. ASH FROM A FURNACE MOUTH.', color: NOTE };
      yield { say: "WICK'S NOTEBOOK", text: 'BOUND TOGETHER, ONE DOSE: ENOUGH TO DRAW IT OUT OF ONE OF US. OR CUT INTO THE WATER, ENOUGH THAT THE TAKEN STOP DREAMING PINK.', color: NOTE };
      yield { say: "WICK'S NOTEBOOK", text: "MY LEGS WON'T TAKE ME THAT FAR ANY MORE. SOMEONE'S WILL.", color: NOTE };
      if (!first) return;
      yield me('WICK WAS MAKING A CURE. SHE NEVER GOT TO FINISH IT.');
      yield me('ICE THAT NEVER THAWS. STANDING WATER. A FURNACE. AND A BENCH TO BIND THEM ON.');
      world.toast("WICK'S REMEDY · LICHEN, SILT AND ASH", 300);
      S.addStory(world, "WICK'S NOTEBOOK: A CURE FOR THE DOSE, FROM LICHEN OFF ICE THAT NEVER THAWS, SILT FROM THE BOTTOM OF STANDING WATER AND ASH FROM A FURNACE MOUTH, BOUND AT A BENCH.");
      world.save();
    },

    // ---- At a bench, with all three: the dose, and the choice ----
    *remedyMade(world) {
      const s = world.state;
      const f = s.flags;
      const sol = npcOf(world, 'solder');
      const here = !!sol && sol.state !== 'gone' && s.people.solder !== 'dead';
      const maker = (text) => (here ? say('SOLDER', text) : me(text));
      HA.audio.play('terminal');
      if (here) {
        yield say('SOLDER', "THAT'S WICK'S HAND. I'D KNOW IT ANYWHERE.");
        yield say('SOLDER', 'LICHEN, SILT, ASH. SHE NEVER HAD THE LEGS TO FETCH THEM HERSELF.');
      } else yield me("WICK'S NOTES SAY HOW. BIND THEM IN THE HEAT, AND DON'T BREATHE IT IN.");
      HA.audio.play('clamp');
      world.burst(world.player.x + 4, world.player.y + 4, ['#b8c4cc', '#6a5a4a', '#e8f4f8'], 12, 1.2);
      yield { wait: 40 };
      yield maker("ONE DOSE. ENOUGH TO DRAW IT OUT OF ONE OF US. OR, CUT INTO THE WARRENS' WATER, ENOUGH THAT THE WOKEN STOP DREAMING PINK.");
      if (here && s.bloom >= 3) yield say('SOLDER', "YOU'VE GOT IT IN YOU TOO. DON'T THINK I CAN'T SEE IT.");
      const woken = { 7: 'SEVEN', 11: 'ELEVEN' }[s.takenHome] || 'THE WOKEN';
      const self = s.bloom >= HA.bloom.LOST ? 'NOTHING. THE BLOOM HAS YOU' : s.bloom > 0 ? 'THE BLOOM IN YOU, PUSHED BACK' : "NOTHING. THERE'S NO BLOOM IN YOU";
      const pick = yield {
        choice: {
          prompt: "WICK'S REMEDY. ONE DOSE.",
          options: [
            { label: 'CUT IT INTO THE WATER', confirm: { title: 'GIVE IT TO THE WOKEN?', gain: woken + ' WHO STOP DREAMING PINK', lose: 'THE ONLY CURE THERE IS' } },
            { label: 'TAKE IT YOURSELF', confirm: { title: "TAKE WICK'S REMEDY?", gain: self, lose: 'THE WOKEN KEEP DREAMING' } },
          ],
        },
      };
      if (pick === 0) {
        f.remedy = 'woken';
        s.mercy += 1;
        S.addChoice(world, "I CUT WICK'S REMEDY INTO THE WARRENS' WATER.");
        S.addStory(world, "I BROUGHT WICK HER THREE THINGS. HER REMEDY WENT INTO THE WARRENS' WATER, AND THE WOKEN STOPPED DREAMING PINK.");
        world.save();
        yield here ? say('SOLDER', "I'LL SEND IT DOWN THE LIFTS TO TAMP. HE'LL PUT IT IN THE BARREL BY THE GATE.") : me('INTO THE BARREL BY THE GATE. TONIGHT, NOBODY DREAMS OF THE FIELD.');
      } else {
        const before = s.bloom;
        f.remedy = 'hero';
        HA.bloom.ease(world, 2);
        S.addChoice(world, "I TOOK WICK'S REMEDY MYSELF.");
        S.addStory(world, "I BROUGHT WICK HER THREE THINGS, AND I TOOK HER REMEDY MYSELF. THE WOKEN STILL DREAM OF THE FIELD.");
        world.save();
        HA.audio.play('bloom');
        world.flash('#b8f4ff', 8);
        yield me(before >= HA.bloom.LOST ? 'IT TASTES OF ASH. THE BLOOM DRINKS IT DOWN LIKE WATER.' : before > 0 ? 'IT TASTES OF ASH AND COLD. SOMETHING IN ME LETS GO, A LITTLE.' : 'IT TASTES OF ASH AND COLD. THERE WAS NOTHING IN ME FOR IT TO DRAW OUT.');
        if (here) yield say('SOLDER', 'IT WAS YOURS TO GIVE.');
      }
    },
  };
  // Each of the three: picked up, counted, and the next step said once they're all in hand.
  for (const part of PARTS) {
    SCENES[part.key] = function* (world) {
      const s = world.state;
      if (s.flags[part.key]) return;
      s.flags[part.key] = true;
      world.logs = world.logs.filter((l) => l.id !== part.key);
      HA.audio.play('heart');
      world.burst(part.tx * 8 + 4, (part.ty + 1) * 8 - 3, ['#e8f4f8', '#b8c4cc'], 8, 1);
      yield me(part.line);
      const n = have(s);
      world.toast(part.name + ' · ' + n + ' OF 3 FOR WICK', 200);
      if (n === PARTS.length) yield me("THAT'S ALL THREE. NOW A BENCH TO BIND THEM ON.");
      S.addStory(world, 'FOR WICK\'S REMEDY: ' + part.name + (n === PARTS.length ? '. THAT\'S ALL THREE.' : ', ' + n + ' OF THREE.'));
      world.save();
    };
  }

  // A bench with all three in hand makes the remedy first (story/bench.js).
  const bench = S.SCENES.bench;
  S.SCENES.bench = function* (world) {
    if (S.remedyReady(world.state)) {
      yield* SCENES.remedyMade(world);
      return;
    }
    yield* bench(world);
  };

  // ---- How they look ----
  function drawBook(g, world, a, cam) {
    const x = Math.round(NOTEBOOK.tx * 8 + 1 - cam.x);
    const y = Math.round((NOTEBOOK.ty + 1) * 8 - 3 - cam.y);
    g.fillStyle = '#5a3e2a';
    g.fillRect(x, y, 7, 3);
    g.fillStyle = NOTE;
    g.fillRect(x + 1, y, 5, 2);
    g.fillStyle = '#8a7a5a';
    g.fillRect(x + 3, y, 1, 2);
    if (!world.state.flags.remedyRead && Math.floor(world.time / 40) % 2) {
      g.fillStyle = '#ffffff';
      g.fillRect(x + 6, y - 2, 1, 1);
    }
  }
  const LOOKS = {
    // Pale green-white crust up the wall under the ice, beside where it's scraped from.
    remedyLichen(g, x, y, t) {
      g.fillStyle = '#9ec8a8';
      for (let i = 0; i < 9; i++) g.fillRect(x - 9 + ((i * 3) % 4), y - 4 - i * 4, 2 + (i % 2), 2);
      g.fillStyle = '#e8f4f8';
      g.fillRect(x + 1, y - 2, 4, 2);
      g.fillRect(x + 2, y - 3, 2, 1);
      if (Math.floor(t / 30) % 2) g.fillRect(x + 5, y - 4, 1, 1);
    },
    // A dark mound on the sump floor, with a glint.
    remedySilt(g, x, y, t) {
      g.fillStyle = '#2e2a22';
      g.fillRect(x - 1, y - 2, 9, 2);
      g.fillRect(x + 1, y - 3, 5, 1);
      g.fillStyle = '#6a6048';
      g.fillRect(x + 2, y - 3, 2, 1);
      if (Math.floor(t / 36) % 2) {
        g.fillStyle = '#c8d8b0';
        g.fillRect(x + 5, y - 2, 1, 1);
      }
    },
    // Grey ash by the furnace mouth, with one ember still in it.
    remedyAsh(g, x, y, t) {
      g.fillStyle = '#6a6a6e';
      g.fillRect(x - 1, y - 2, 9, 2);
      g.fillStyle = '#9a9a9e';
      g.fillRect(x + 1, y - 3, 5, 1);
      g.fillStyle = Math.floor(t / 20) % 2 ? '#ff8a3a' : '#c84a1a';
      g.fillRect(x + 3, y - 2, 1, 1);
    },
  };

  // ---- Hooks the world calls ----
  const REMEDY_WOKEN = ['I SLEPT LAST NIGHT, AND THERE WAS NO FIELD. JUST DARK. IT WAS WONDERFUL.', "THE WATER TASTES OF ASH. I DON'T CARE.", 'WICK DID THIS? EVEN NOW?'];
  S.areas.push({
    enterRoom(world) {
      const s = world.state;
      const f = s.flags;
      const id = world.def.id;
      // Her notebook, on her doorstep, from the day the hero comes home without her (its log comes in update).
      if (id === NOTEBOOK.room) world.actors.push({ draw: (g, w, a, cam) => bookOut(w.state) && drawBook(g, w, a, cam) });
      // The three things, once the hero knows to look for them (their logs come and go in update).
      for (const part of PARTS) {
        if (part.room !== id) continue;
        const look = LOOKS[part.key];
        world.actors.push({ draw: (g, w, a, cam) => w.state.flags.remedyRead && !w.state.flags[part.key] && part.when(w.state) && look(g, part.tx * 8 - cam.x, (part.ty + 1) * 8 - cam.y, w.time) });
      }
      // Cut into the water, the woken stop dreaming of the field.
      if (id === 'warrens' && f.remedy === 'woken') {
        let i = 0;
        for (const n of world.npcs) if (n.id === 'woken') n.lines = [REMEDY_WOKEN[i++ % REMEDY_WOKEN.length]];
      }
    },

    // A thing to pick up is there once the notebook's been read and it can be reached: the ash once Abel is down,
    // in the same room, without leaving it first.
    update(world) {
      const s = world.state;
      // The notebook, the moment the hero is home from the Gardens (homeAgain is set on the way in).
      if (world.def.id === NOTEBOOK.room && bookOut(s) && !world.logs.some((l) => l.id === 'wickNotebook')) {
        world.logs.push(logAt(NOTEBOOK, 'wickNotebook', 'wickNotebook', "{up} READ WICK'S NOTEBOOK"));
      }
      if (!s.flags.remedyRead) return;
      for (const part of PARTS) {
        if (part.room !== world.def.id || s.flags[part.key] || !part.when(s)) continue;
        if (!world.logs.some((l) => l.id === part.key)) world.logs.push(logAt(part, part.key, part.key, part.label));
      }
    },
  });

  // ---- The endings' cards (endings.js) ----
  S.remedyCards = function (s, id) {
    const r = s.flags.remedy;
    if (!r) return [];
    const cards = {
      homecoming: r === 'woken' ? ['THE WOKEN SLEPT ON THE NEW GROUND,', 'AND DREAMED OF IT.'] : ["I NEVER TOLD ANYONE WHERE WICK'S REMEDY WENT."],
      crash: r === 'woken' ? ['THE WOKEN SLEPT IN THE SLEDS ON THE WAY DOWN.', 'NONE OF THEM DREAMED PINK.'] : ['THE WOKEN STILL DREAM OF THE FIELD.', "I KEPT WICK'S CURE FOR MYSELF."],
      dominion: r === 'woken' ? ["THE WARRENS' WATER STILL TASTES OF ASH.", 'NOBODY DOWN THERE DREAMS PINK.'] : ["WICK'S REMEDY WENT INTO ME.", "IT WASN'T ENOUGH TO STOP ME."],
      overgrown: r === 'woken' ? ["WICK'S REMEDY KEPT THE WOKEN CLEAR FOR A YEAR.", 'THEN THE PINK CAME BACK FOR THEM TOO.'] : ["WICK'S REMEDY WASN'T ENOUGH."],
    };
    return cards[id] ? [cards[id]] : [];
  };

  Object.assign(S.SCENES, SCENES);
})(window.HA);
