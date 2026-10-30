'use strict';
// Solder's bench (3.10, the audit's option B). Shards still level the weapon in hand; any it can't use (it's at
// its top level, or the hero has no weapon out) are kept as scrap (weapons.js, bank), and the bench turns scrap
// into parts for the suit. The bench stands by Solder's door in the Warrens all game. With Solder alive, she sets
// up her tools at the Crew Camp too; if she was lost, that bench never comes.
(function (HA) {
  const S = HA.story;
  const say = (who, text) => ({ say: who, text });
  const me = (text) => ({ say: '', text, color: S.VOICE });
  const TIER = ['I', 'II', 'III'];

  // What the bench can make, each in tiers. Costs are in scrap (a small shard is 1, a big one 4).
  const UPGRADES = [
    { id: 'plating', name: 'PLATING', what: '+2 HEALTH', costs: [30, 50, 80], line: 'PLATE. IT WON\'T STOP MUCH, BUT IT STOPS SOME.' },
    { id: 'magnet', name: 'MAGNET', what: 'PULLS SHARDS', costs: [20, 40], line: 'A COIL IN THE COLLAR. SHARDS WILL COME TO YOU.' },
    { id: 'steady', name: 'STEADY', what: 'HITS COST HALF', costs: [45], line: 'A BRACE ON THE GUN ARM. A HIT WON\'T SHAKE AS MUCH LOOSE.' },
  ];
  const BENCHES = {
    warrens: { x: 86, y: 18, open: (s) => !!s.flags.metHullfolk },
    'crew-camp': { x: 23, y: 18, open: (s) => s.people.solder === 'alive' },
  };

  // How far the magnet pulls shards from, and what a hit costs with steady hands (read by actors.js and weapons.js).
  const pull = (s) => 40 + 24 * (s.upgrades.magnet || 0);
  const steady = (s) => (s.upgrades.steady || 0) > 0;

  function apply(world, u) {
    const p = world.player;
    if (u.id === 'plating') {
      p.maxHp += 2;
      p.hp = Math.min(p.maxHp, p.hp + 2);
    }
  }

  S.SCENES.bench = function* (world) {
    const s = world.state;
    const solder = S.npcOf(world, 'solder');
    const here = !!solder && solder.state !== 'gone' && s.people.solder !== 'dead';
    HA.audio.play('terminal');
    if (!s.flags.benchSeen) {
      s.flags.benchSeen = true;
      if (here) {
        yield say('SOLDER', 'YOUR GUN CAN ONLY EAT SO MANY SHARDS. WHAT IT CAN\'T, YOU CARRY. THAT\'S SCRAP.');
        yield say('SOLDER', 'BRING ME SCRAP. I CAN BEAT IT INTO PLATE, OR A MAGNET, OR STEADIER HANDS.');
      } else yield me("SOLDER'S BENCH. HER TOOLS ARE ALL HERE, EACH IN ITS PLACE. I CAN MANAGE.");
      S.addStory(world, "SOLDER'S BENCH TURNS SCRAP INTO PARTS FOR MY SUIT. SCRAP IS THE SHARDS MY GUN CAN'T USE.");
    } else if (!here && s.people.solder === 'dead') yield me("HER TOOLS. SHE WON'T BE BACK FOR THEM.");
    for (;;) {
      const left = UPGRADES.filter((u) => (s.upgrades[u.id] || 0) < u.costs.length);
      if (!left.length) {
        yield here ? say('SOLDER', "THAT'S EVERYTHING I KNOW HOW TO MAKE. GO ON.") : me('THERE IS NOTHING LEFT HERE TO MAKE.');
        return;
      }
      const options = left.map((u) => {
        const n = s.upgrades[u.id] || 0;
        return { label: u.name + (u.costs.length > 1 ? ' ' + TIER[n] : '') + ' · ' + u.what + ' · ' + u.costs[n] };
      });
      options.push({ label: 'LEAVE' });
      const pick = yield { choice: { prompt: 'SCRAP: ' + s.scrap, options } };
      if (pick === undefined || pick >= left.length) return;
      const u = left[pick];
      const cost = u.costs[s.upgrades[u.id] || 0];
      if (s.scrap < cost) {
        yield here ? say('SOLDER', 'NOT ENOUGH SCRAP FOR THAT. COME BACK HEAVIER.') : me('NOT ENOUGH SCRAP FOR THAT.');
        continue;
      }
      s.scrap -= cost;
      s.upgrades[u.id] = (s.upgrades[u.id] || 0) + 1;
      apply(world, u);
      HA.audio.play('levelUp');
      world.burst(world.player.x + 4, world.player.y + 7, ['#5fd4e8', '#fff0a8'], 14, 1.6);
      world.floatText(world.player.x + 4, world.player.y - 6, u.what, '#5fd4e8');
      if (here) yield say('SOLDER', u.line);
      world.save();
    }
  };

  // The bench answers to Up wherever there's one open in this room: at its left end, since Solder stands at it.
  S.areas.push({
    enterRoom(world) {
      const b = BENCHES[world.def.id];
      if (!b || !b.open(world.state)) return;
      world.logs.push({ id: 'bench', scene: 'bench', label: "{up} SOLDER'S BENCH", x: b.x * 8 - 20, y: b.y * 8 - 6, w: 14, h: 14, read: true });
    },
  });

  S.bench = { UPGRADES, BENCHES, pull, steady };
})(window.HA);
