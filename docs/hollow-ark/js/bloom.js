'use strict';
// The Bloom in the hero. It only rises: a carried bulb eaten for a rush (+1 each), the Lancets traded for the
// Thorn (+2), kills with the Thorn in hand (+1 for every 30), and later Flux's pack and Solder's rescue.
// It's never shown as a number. The world shows it instead, at four stages, each announced once wherever the
// hero is, with a line in the journal:
//   3  the visor tints pink and veins show through the suit (the true ending's seal now reads it)
//   5  a thorn grows through one shoulder
//   7  the eyes glow through the visor, and a detuned voice joins every track: one more and the hero is lost
//   8  Overgrown is locked in
(function (HA) {
  const STAGES = [
    { at: 3, line: "THE PINK IN MY VISOR WON'T WIPE OFF.", toast: 'THE BLOOM IS IN YOUR SUIT' },
    { at: 5, line: 'THE GARDENS SMELLED LIKE HOME.', toast: 'A THORN HAS GROWN THROUGH YOUR SHOULDER' },
    { at: 7, line: "ONE MORE, AND I DON'T THINK I COME BACK.", toast: 'ONE MORE, AND THE BLOOM HAS YOU' },
    { at: 8, line: 'I CAN HEAR IT SINGING. IT KNOWS MY NAME.', toast: 'THE BLOOM HAS YOU' },
  ];
  const RUSH = 1200; // a bulb's double damage lasts 20 seconds
  const MAX_BULBS = 3;
  const LOST = 8; // Overgrown
  const THORN_KILLS = 30;

  // Which look the hero has: 0, 3, 5 or 7.
  const stage = (s) => (s.bloom >= 7 ? 7 : s.bloom >= 5 ? 5 : s.bloom >= 3 ? 3 : 0);

  function add(world, n) {
    const s = world.state;
    s.bloom += n;
    for (const st of STAGES) {
      if (s.bloom < st.at || s.bloomWarned >= st.at) continue;
      s.bloomWarned = st.at;
      HA.story.addStory(world, st.line);
      world.toast(st.toast, 240);
      world.flash('#f27ad8', 8);
      HA.audio.play('bloom');
    }
    syncMusic(world);
  }

  function syncMusic(world) {
    HA.music.bloomVoice = world.state.bloom >= 7;
  }

  // Whether going up by n would lock in Overgrown, said plainly on the gain-and-lose screen (null if not).
  // Crossing into stage 3 also closes Homecoming, but no screen names the true ending: that's too much of a hint.
  function closes(s, n) {
    if (s.bloom < LOST && s.bloom + n >= LOST) return 'YOURSELF. OVERGROWN IS LOCKED IN';
    return null;
  }

  // A bulb is eaten only on a press of its own button. The first one, and any that would lock in Overgrown,
  // ask first on the gain-and-lose screen.
  function eat(world) {
    const s = world.state;
    const p = world.player;
    if (!s.bulbs || p.dead || world.scene) return;
    const lose = closes(s, 1);
    if (s.flags.ateBulb && !lose) {
      consume(world);
      return;
    }
    HA.scenes.run(
      world,
      function* () {
        const pick = yield {
          choice: {
            prompt: 'EAT A BLOOM BULB?',
            options: [
              { label: 'EAT IT', confirm: { title: 'EAT THE BLOOM?', gain: 'FULL HEALTH, DOUBLE DAMAGE FOR 20 S', lose: lose || 'A LITTLE OF YOURSELF, FOR GOOD' } },
              { label: 'NOT NOW' },
            ],
          },
        };
        if (pick === 0) consume(world);
      },
      { name: 'bulb' },
    );
  }

  function consume(world) {
    const s = world.state;
    const p = world.player;
    s.bulbs--;
    s.flags.ateBulb = true;
    p.hp = p.maxHp;
    p.rush = RUSH;
    world.burst(p.x + 4, p.y + 6, ['#f27ad8', '#b04ad0', '#ffc2dc', '#ffffff'], 24, 2);
    world.floatText(p.x + 4, p.y - 6, 'HEALED', '#f27ad8');
    HA.audio.play('bulb');
    add(world, 1);
    world.save();
  }

  // A bulb on the floor goes into the suit's pouch, if there's room.
  function pickUp(world, k) {
    const s = world.state;
    if (s.bulbs >= MAX_BULBS) {
      if (!k.full) world.toast("NO ROOM FOR ANOTHER BULB · YOU CARRY " + MAX_BULBS, 150);
      k.full = true;
      return false;
    }
    s.bulbs++;
    if (!s.flags.bulbSeen) {
      s.flags.bulbSeen = true;
      world.toast('BLOOM BULB · {item} EATS IT. IT GROWS IN YOU.', 360);
    } else world.toast('BLOOM BULB · ' + s.bulbs + ' CARRIED', 120);
    HA.audio.play('heart');
    return true;
  }

  // Every 30 kills with the Thorn in hand, it drinks a little more of the hero.
  function onKill(world) {
    const p = world.player;
    const w = p.weapons[p.wi];
    if (!w || w.id !== 'thorn') return;
    const s = world.state;
    s.thornKills = (s.thornKills || 0) + 1;
    if (s.thornKills % THORN_KILLS === 0) {
      world.floatText(p.x + 4, p.y - 10, 'THE THORN DRINKS', '#f27ad8');
      add(world, 1);
    }
  }

  HA.bloom = { STAGES, RUSH, MAX_BULBS, stage, add, closes, eat, pickUp, onKill, syncMusic };
})(window.HA);
