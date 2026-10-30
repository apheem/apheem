'use strict';
// The hands playthrough.js plays with, loaded into the game's page before it boots (window.PT).
// The hero only ever moves inside the room they're in, and only to a spot joined to where they stand by open
// tiles (a shut door, a wall or an unbroken cracked wall stops it). Crossing a room's floors and ledges is
// proven by rooms-check.js; this proves the hero arrives in every room with the abilities that check assumed.
// Rooms are left by their own exits: walking off an open edge, or riding a lift or a hatch with Up or Down.
// Scenes are read through with Confirm, and choices are made on the choice screen like a player would.
// Besides the hero's place in the room, the only thing it sets is the game's invincibility switch
// (world.assist, which the brief's assist toggles will put in a menu). Nothing here writes to the save, the
// story's flags, the hero's weapons or their abilities.
(() => {
  const PT = (window.PT = {});
  const w = () => HA.ui.world;
  const step = (n = 1, hold) => HA.debug.step(n, hold);
  PT.log = [];
  PT.problems = [];
  PT.areaChanged = false;
  PT.policy = {}; // a choice's first option -> the option to pick: an index, or a few words of its label
  const say = (line) => PT.log.push(line);

  function where() {
    const W = w();
    return W ? ` [in ${W.def.id}; lead: ${W.state.lead || '-'}]` : ' [at the title]';
  }
  const fail = (PT.fail = (msg) => {
    throw new Error(msg + where());
  });
  // The hero can't be hurt, except for a fall on purpose.
  const tick = (n = 1, hold) => {
    const W = w();
    if (W) W.assist.invincible = !PT.mortal;
    step(n, hold);
  };
  PT.tick = tick;

  // ---- Scenes: read every line, make every choice ----
  // Returns 'free' once no scene runs, 'control' if a scene hands the hero the controls and waits on them,
  // or 'title' once an ending has played out to the title screen.
  PT.settle = (max = 40000) => {
    let quiet = 0;
    for (let n = 0; n < max; n++) {
      if (HA.ui.mode !== 'play' || !w()) return 'title';
      const W = w();
      if (W.transition || W.player.dead) {
        tick(1);
        continue;
      }
      const sc = W.scene;
      if (!sc) {
        // A scene can start a frame after another ends; give it that frame before calling the room quiet.
        if (++quiet > 3) return 'free';
        tick(1);
        continue;
      }
      quiet = 0;
      if (sc !== PT.lastScene) {
        PT.lastScene = sc;
        say(`scene ${sc.name}`);
      }
      const st = sc.step;
      if (st && st.choice) {
        answer(sc, st);
        continue;
      }
      if (sc.control && st && st.until) {
        // The scene waits on the hero (a fight, an escort). Let it run a while in case it's only a timer.
        sc.ptWait = (sc.ptWait || 0) + 1;
        if (sc.ptWait > 900) return 'control';
      }
      tick(1, n % 2 ? {} : { confirm: true });
    }
    fail(`the scene "${w() && w().scene && w().scene.name}" never ended`);
  };

  // A choice is known by its first option. PT.once answers the next choice only (a ride on the crew's lift).
  function answer(sc, st) {
    const opts = st.choice.options.map((o) => o.label);
    let want = PT.once !== undefined ? PT.once : PT.policy[opts[0]];
    PT.once = undefined;
    if (typeof want === 'string') want = opts.findIndex((o) => o.includes(want));
    if (typeof want !== 'number' || want < 0 || want >= opts.length) fail(`no answer planned for the choice in "${sc.name}": ${JSON.stringify(opts)}`);
    tick(1); // let go of whatever was held, so the next press is a press
    for (let k = 0; k < 10 && st.sel !== want; k++) {
      tick(1, { down: true });
      tick(1);
    }
    const asks = !!st.choice.options[want].confirm;
    tick(1, { confirm: true });
    tick(1);
    if (asks) {
      if (!st.confirming) fail(`the gain-and-loss screen did not open for "${opts[want]}"`);
      tick(1, { up: true });
      tick(1);
      tick(1, { confirm: true });
      tick(1);
    }
    say(`choice in ${sc.name}: ${opts[want]}`);
  }

  // ---- Where the hero can go without leaving the room ----
  const open = (room, tx, ty) => {
    const t = room.tiles[ty * room.w + tx];
    return t !== HA.room.SOLID && t !== HA.room.CRATE;
  };
  function heroTile() {
    const W = w();
    const p = W.player;
    const tx = HA.clamp(Math.floor((p.x + p.w / 2) / 8), 0, W.room.w - 1);
    let ty = HA.clamp(Math.floor((p.y + p.h - 1) / 8), 0, W.room.h - 1);
    if (!open(W.room, tx, ty) && ty > 0) ty--;
    return [tx, ty];
  }
  // Every tile joined to the hero's by open tiles (four ways). Height and reach don't count here.
  PT.region = () => {
    const room = w().room;
    const seen = new Uint8Array(room.w * room.h);
    const [sx, sy] = heroTile();
    const todo = [sy * room.w + sx];
    seen[todo[0]] = 1;
    while (todo.length) {
      const i = todo.pop();
      const x = i % room.w;
      const y = (i - x) / room.w;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= room.w || ny >= room.h) continue;
        const j = ny * room.w + nx;
        if (seen[j] || !open(room, nx, ny)) continue;
        seen[j] = 1;
        todo.push(j);
      }
    }
    return seen;
  };
  // (HA isn't there yet when this file loads, so the list is made on first use.)
  const floors = () => [HA.room.SOLID, HA.room.ONEWAY, HA.room.CRATE, HA.room.FOAM, HA.room.THORNS];
  // The open tile a person stands in above a floor, at or below row ty in column tx.
  function floorAt(room, tx, ty) {
    for (let y = ty; y < room.h; y++) {
      if (!open(room, tx, y)) return y > ty ? y - 1 : -1;
      if (y === room.h - 1) return y;
      const below = room.tiles[(y + 1) * room.w + tx];
      if (floors().includes(below)) return y;
    }
    return -1;
  }

  // Stand at tile (tx, ty): the hero's feet on the bottom of that tile.
  PT.go = (tx, ty, opts = {}) => {
    const W = w();
    const room = W.room;
    const p = W.player;
    if (W.scene && !W.scene.control) fail(`can't move during the scene "${W.scene.name}"`);
    tx = Math.round(tx);
    ty = Math.round(ty);
    if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h || !open(room, tx, ty)) fail(`tile ${tx},${ty} is not open`);
    if (!opts.any && !PT.region()[ty * room.w + tx]) fail(`tile ${tx},${ty} can't be reached from ${heroTile()} without passing a shut door or a wall`);
    p.x = tx * 8 + 4 - p.w / 2;
    p.y = ty * 8 + 8 - p.h;
    p.vx = 0;
    p.vy = 0;
    p.grapple = null;
    tick(opts.frames === undefined ? 3 : opts.frames);
  };

  // Stand on the lowest floor in column tx that the hero can get to.
  PT.goCol = (tx) => {
    const room = w().room;
    const reg = PT.region();
    for (let y = room.h - 1; y >= 0; y--) {
      if (reg[y * room.w + tx] && floorAt(room, tx, y) === y) return PT.go(tx, y);
    }
    fail(`no floor in column ${tx} can be reached`);
  };

  // Stand in reach of something with x, y, w, h (a person, a log, a pod, a pickup, a lift).
  PT.near = (o, opts) => {
    const room = w().room;
    const tx = HA.clamp(Math.floor((o.x + o.w / 2) / 8), 0, room.w - 1);
    const ty = HA.clamp(Math.floor((o.y + o.h - 1) / 8), 0, room.h - 1);
    const reg = PT.region();
    for (const dx of [0, -1, 1, -2, 2]) {
      const x = tx + dx;
      if (x < 0 || x >= room.w) continue;
      for (let y = Math.max(0, ty - 2); y <= Math.min(room.h - 1, ty + 1); y++) {
        if (open(room, x, y) && reg[y * room.w + x]) return PT.go(x, y, opts);
      }
    }
    fail(`nothing near ${tx},${ty} can be reached`);
  };

  // ---- Things to do in a room ----
  const press = (key) => {
    tick(1, { [key]: true });
    tick(1);
  };
  const hold = (key, n) => tick(n, { [key]: true });

  PT.talk = (id) => {
    const n = w().npcs.find((x) => x.id === id);
    if (!n) fail(`${id} is not here (${w().npcs.map((x) => x.id)})`);
    PT.near(n);
    if (!(w().near && w().near.o === n)) fail(`${id} can't be talked to now (state ${n.state})`);
    press('up');
    say(`talked to ${id}`);
    return PT.settle();
  };
  PT.read = (id) => {
    const l = w().logs.find((x) => (!id && !x.read) || x.id === id || x.scene === id);
    if (!l) fail(`no log ${id} here`);
    PT.near(l);
    press('up');
    say(`read ${l.id || l.scene}`);
    return PT.settle();
  };
  PT.restAtPods = true;
  PT.rest = () => {
    // A scene can start while the hero walks to the pod (the tram pulling in below); read it, then try again.
    for (let tries = 0; tries < 4; tries++) {
      PT.settle();
      const pod = w().pods[0];
      if (!pod) fail('no rest pod here');
      PT.near(pod);
      while (pod.cool > 0) tick(1);
      press('up');
      if (w().state.rest && w().state.rest.room === w().def.id && pod.cool > 0) {
        say(`rested in ${w().def.id}`);
        return PT.settle();
      }
    }
    fail('resting did not take');
  };
  PT.take = (what) => {
    const k = w().pickups.find((x) => x.kind === what || x.id === what);
    if (!k) fail(`no ${what} to pick up here (${w().pickups.map((x) => x.id || x.kind)})`);
    PT.near(k, { frames: 10 });
    if (w().pickups.includes(k)) fail(`the ${what} was not picked up`);
    say(`took ${k.id || k.kind}`);
    return PT.settle();
  };
  PT.eat = () => {
    tick(1);
    press('item');
    say('ate a Bloom bulb');
    return PT.settle();
  };
  // Change weapons with the next-weapon button until this one is in hand.
  PT.wield = (id) => {
    const p = w().player;
    if (!p.weapons.some((x) => x.id === id)) fail(`the hero has no ${id}`);
    for (let n = 0; n < 12 && p.weapons[p.wi].id !== id; n++) press('next');
    if (p.weapons[p.wi].id !== id) fail(`could not change to the ${id}`);
  };
  // Blow a cracked wall (or the ice) with a Breach Charge, from whichever side of it the hero can stand on.
  PT.blast = (id) => {
    const W = w();
    const d = W.doors.find((x) => x.id === id);
    if (!d) fail(`no wall ${id} here`);
    if (d.open) return say(`${id} is already open`);
    const reg = PT.region();
    const xs = d.cells.map((c) => c.tx);
    const ys = d.cells.map((c) => c.ty);
    let spot = null;
    for (const [x, face] of [
      [Math.min(...xs) - 2, 1],
      [Math.max(...xs) + 2, -1],
    ]) {
      for (let y = Math.max(...ys); y >= Math.min(...ys) && !spot; y--) {
        const f = floorAt(W.room, x, y);
        if (f >= Math.min(...ys) && f <= Math.max(...ys) && reg[f * W.room.w + x]) spot = [x, f, face];
      }
    }
    if (!spot) fail(`no side of ${id} can be reached`);
    PT.wield('charges');
    PT.go(spot[0], spot[1]);
    hold(spot[2] > 0 ? 'right' : 'left', 1);
    tick(1);
    press('fire');
    for (let n = 0; n < 120 && !d.open; n++) tick(1);
    if (!d.open) fail(`the charge did not open ${id}`);
    say(`blew ${id} open`);
    return PT.settle();
  };
  // Throw a crane's switch: the first one for that crane the hero can get to.
  PT.flip = (crane) => {
    const W = w();
    const reg = PT.region();
    const sw = W.switches.find((x) => x.legend.crane === crane && reg[Math.floor((x.y + x.h - 1) / 8) * W.room.w + Math.floor((x.x + 4) / 8)]);
    if (!sw) fail(`no switch for ${crane} can be reached`);
    const was = !!W.state.flags[crane];
    PT.near(sw);
    press('up');
    for (let n = 0; n < 400 && w().craneMove; n++) tick(1);
    if (!!w().state.flags[crane] === was) fail(`${crane}'s switch did nothing${W.toastTime > 0 ? ' ("' + W.toastText + '")' : ''}`);
    say(`threw ${crane}'s switch`);
    return PT.settle();
  };
  // Every story trigger in this room that would fire now, in the order the room lists them.
  PT.triggers = () => {
    const W = w();
    const out = [];
    (W.def.triggers || []).forEach((t, i) => {
      if (W.fired.has(i) || (t.when && !t.when(W.state, W))) return;
      out.push(i);
    });
    return out;
  };
  // Walk into trigger i, as a player crossing the room would.
  PT.trigger = (i) => {
    const W = w();
    const t = W.def.triggers[i];
    const room = W.room;
    const reg = PT.region();
    const ys = [];
    for (let y = t.y0 !== undefined ? t.y0 : 0; y <= (t.y1 !== undefined ? t.y1 : room.h - 1); y++) ys.push(y);
    for (let x = Math.max(0, Math.floor(t.x0)); x <= Math.min(room.w - 1, Math.ceil(t.x1)); x++) {
      for (const y of ys) {
        const f = floorAt(room, x, y);
        if (f < 0 || reg[f * room.w + x] !== 1) continue;
        if (t.y1 !== undefined && f > t.y1 + 1) continue;
        PT.go(x, f);
        say(`walked into ${W.def.id}'s trigger`);
        return PT.settle();
      }
    }
    fail(`trigger ${t.run} can't be reached`);
  };
  PT.sweep = () => {
    for (let k = 0; k < 8; k++) {
      const live = PT.triggers();
      if (!live.length || w().scene) return;
      const [i] = live;
      const before = w().def.id;
      try {
        PT.trigger(i);
      } catch (e) {
        if (!/can't be reached/.test(e.message)) throw e;
        return; // a trigger on a part of the room the hero hasn't got to yet
      }
      if (HA.ui.mode !== 'play' || w().def.id !== before) return;
    }
  };

  // ---- Leaving rooms by their exits ----
  const EDGE_OPEN = (ch) => ch !== '#' && ch !== '%' && ch !== 'B';
  function edgeRuns(def, side) {
    const col = side === 'left' ? 0 : def.w - 1;
    const runs = [];
    let start = -1;
    for (let y = 0; y <= def.h; y++) {
      const ok = y < def.h && EDGE_OPEN(def.map[y][col]);
      if (ok && start < 0) start = y;
      if (!ok && start >= 0) {
        const next = HA.rooms.at(def.gx * 8 + (side === 'left' ? -4 : def.w * 8 + 4), (def.gy + y - 1) * 8 + 4);
        if (next) runs.push({ y0: start, y1: y - 1, to: next.id });
        start = -1;
      }
    }
    return runs;
  }
  // The rooms each room leads to, by its edges and its lifts and hatches.
  PT.graph = () => {
    const g = {};
    for (const def of HA.rooms.list) {
      const ways = (g[def.id] = []);
      for (const side of ['left', 'right']) for (const r of edgeRuns(def, side)) ways.push({ side, to: r.to, y1: r.y1 });
      for (const lg of Object.values(def.legend || {})) if (lg.to && HA.rooms.byId[lg.to]) ways.push({ link: true, to: lg.to });
    }
    return g;
  };

  function arrived(from) {
    for (let n = 0; n < 200 && w() && w().transition; n++) tick(1);
    tick(2);
    const W = w();
    if (!W) return;
    const def = W.def;
    PT.rooms = (PT.rooms || 0) + 1;
    // The room checker assumed these abilities for this room; the hero must really have them by now.
    const has = W.state.abilities;
    const weapons = W.player.weapons.map((x) => x.id);
    for (const [k, v] of Object.entries(def.abilities || {})) {
      if (!v) continue;
      const ok = k === 'foam' || k === 'charges' ? weapons.includes(k) : !!has[k];
      if (!ok && !W.playAs) PT.problems.push(`${def.id} was entered from ${from} without ${k}, which rooms-check assumes the hero has there`);
    }
    if (HA.rooms.byId[from] && HA.rooms.byId[from].area !== def.area) PT.areaChanged = true;
    say(`${from} -> ${def.id}`);
    if (!PT.areaChanged) PT.restHere();
  }
  // A careful player rests at every pod they find, the first time they find it (not in the middle of a fight).
  PT.restHere = () => {
    PT.settle();
    const W = w();
    if (!W) return;
    if (PT.restAtPods && W.pods.length && !W.state.rested[W.def.id] && !W.scene && !(W.boss && W.boss.fighting) && !W.state.flags.scuttle) PT.rest();
  };

  PT.exit = (side, to) => {
    const W = w();
    const def = W.def;
    const from = def.id;
    const room = W.room;
    const col = side === 'left' ? 0 : room.w - 1;
    const reg = PT.region();
    const runs = edgeRuns(def, side).filter((r) => !to || r.to === to);
    if (!runs.length) fail(`no way ${side} to ${to || 'anywhere'}`);
    let spot = null;
    for (const r of runs) {
      for (let y = r.y1; y >= r.y0 && !spot; y--) {
        const f = floorAt(room, col, y);
        if (f >= r.y0 && f <= r.y1 && reg[f * room.w + col]) spot = [col, f];
      }
      if (spot) break;
    }
    if (!spot) fail(`the ${side} way out${to ? ' to ' + to : ''} can't be reached from here (shut, or walled off)`);
    PT.go(spot[0], spot[1]);
    for (let n = 0; n < 90 && w() && w().def.id === from && !w().transition && !w().scene; n++) tick(1, { [side]: true });
    if (w().scene && w().def.id === from && !w().transition) {
      PT.settle();
      if (w().def.id === from && !w().transition) return PT.exit(side, to);
    }
    if (w().def.id === from && !w().transition) fail(`walking off the ${side} edge did not leave ${from}${W.toastTime > 0 ? ' ("' + W.toastText + '")' : ''}`);
    arrived(from);
    return PT.areaChanged ? 'area' : PT.settle();
  };

  PT.link = (to) => {
    const W = w();
    const from = W.def.id;
    const l = W.links.find((x) => !to || x.legend.to === to);
    if (!l) fail(`no lift or hatch to ${to} here (${W.links.map((x) => x.legend.to)})`);
    PT.near(l);
    const key = l.legend.type === 'lift' || l.legend.up ? 'up' : 'down';
    if (!(W.near && W.near.o === l)) fail(`the way to ${l.legend.to} can't be used now`);
    press(key);
    for (let n = 0; n < 4000 && w() && w().def.id === from; n++) {
      if (w().scene) PT.settle(4000);
      else tick(1);
      if (HA.ui.mode !== 'play') return 'title';
    }
    if (w().def.id === from) fail(`the way to ${l.legend.to} did not go anywhere`);
    arrived(from);
    return PT.areaChanged ? 'area' : PT.settle();
  };

  // Cross the ship to a room by the shortest way through exits, stopping for whatever happens on the way.
  PT.walkTo = (target, opts = {}) => {
    const g = PT.graph();
    // Ways found shut on the way (a door between where an exit drops the hero and the rest of the room).
    const blocked = new Set();
    let came = null;
    for (let hops = 0; hops < 60; hops++) {
      if (HA.ui.mode !== 'play') return 'title';
      const here = w().def.id;
      if (here === target) {
        if (opts.sweep !== false) PT.sweep();
        return 'free';
      }
      if (opts.sweep !== false) PT.sweep();
      if (HA.ui.mode !== 'play' || w().def.id !== here) continue;
      const prev = { [here]: null };
      const q = [here];
      while (q.length && !(target in prev)) {
        const r = q.shift();
        for (const way of g[r] || []) {
          if (way.to in prev || (opts.avoid || []).includes(way.to) || blocked.has(r + '>' + way.to)) continue;
          prev[way.to] = { from: r, way };
          q.push(way.to);
        }
      }
      if (!(target in prev)) fail(`no way from ${here} to ${target}${blocked.size ? ' (found shut: ' + [...blocked] + ')' : ''}`);
      let hop = target;
      while (prev[hop].from !== here) hop = prev[hop].from;
      const way = prev[hop].way;
      try {
        if (way.link) PT.link(way.to);
        else PT.exit(way.side, way.to);
      } catch (e) {
        if (!/can't be reached|can't be used now|did not go anywhere|did not leave/.test(e.message)) throw e;
        // Shut from here: don't come this way again, and go round.
        blocked.add(here + '>' + way.to);
        if (came) blocked.add(came + '>' + here);
        say(`the way from ${here} to ${way.to} is shut from here; going round`);
        continue;
      }
      came = here;
      // A new area: hand back, so the game can be quit and continued there.
      if (PT.areaChanged && opts.stopAtArea !== false) return 'area';
    }
    fail(`never got to ${target}`);
  };

  // ---- Walking with someone: real steps, waiting whenever they fall behind ----
  PT.scene = () => (w() && w().scene ? w().scene.name : null);
  PT.pace = (id, done, opts = {}) => {
    const side = opts.side || 'right';
    for (let i = 0; i < (opts.max || 12000); i++) {
      if (HA.ui.mode !== 'play') return 'title';
      if (done()) return say(`walked with ${id} to ${w().def.id}`);
      const W = w();
      if (W.scene && !W.scene.control) {
        tick(1, i % 2 ? {} : { confirm: true });
        continue;
      }
      const n = HA.story.npcOf(W, id);
      const lag = n ? (side === 'right' ? W.player.x - n.x : n.x - W.player.x) : 0;
      tick(1, lag > (opts.gap || 60) ? {} : { [side]: true, jump: i % 30 < 10 });
    }
    fail(`walking with ${id} never got anywhere`);
  };

  // Walk with real steps (and a jump now and then) until done() says so.
  PT.walk = (side, done, max = 3000) => {
    for (let i = 0; i < max; i++) {
      if (HA.ui.mode !== 'play' || done()) return say(`walked ${side} in ${w() ? w().def.id : 'the end'}`);
      if (w().scene && !w().scene.control) PT.settle();
      else tick(1, { [side]: true, jump: i % 40 < 8 });
    }
    fail(`walking ${side} never got there`);
  };

  // ---- Fights ----
  // Whatever a shot could hurt right now: the boss, its parts, and anything fighting for it.
  PT.targets = () => w().enemies.filter((e) => !e.dead && !e.ghost && !e.broken);
  // Hit whatever can be hit, every few frames, until done() says the fight is over. The hero can't be hurt
  // except for one fall, on purpose, to prove the fight comes back after it.
  PT.fight = (done, opts = {}) => {
    const every = opts.every || 8;
    for (let n = 0; n < (opts.max || 30000); n++) {
      if (HA.ui.mode !== 'play' || done()) return 'done';
      const now = w();
      if (now.scene && !now.scene.control) {
        PT.settle();
        continue;
      }
      if (n % every === 0) for (const e of PT.targets()) now.hurtEnemy(e, opts.dmg || 4, Math.sign(e.x - now.player.x) || 1);
      if (opts.each) opts.each(n);
      tick(1);
    }
    fail('the fight never ended');
  };
  // Shoot down every enemy the test picks (by a field it has, like collector), standing in reach of each.
  PT.clear = (field) => {
    for (let n = 0; n < 3000; n++) {
      const W = w();
      if (W.scene && !W.scene.control) PT.settle();
      const left = w().enemies.filter((e) => !e.dead && (!field || e[field]));
      if (!left.length) return say(`cleared ${field || 'the room'}`);
      if (n % 6 === 0) for (const e of left) w().hurtEnemy(e, 4, Math.sign(e.x - W.player.x) || 1);
      tick(1);
    }
    fail(`could not clear ${field}`);
  };

  // Fall in a fight on purpose: one blow the size of the hero's health, as a boss's hit would land.
  PT.fall = () => {
    const W = w();
    const p = W.player;
    PT.mortal = true;
    for (let n = 0; n < 300 && (p.invuln > 0 || W.scene); n++) tick(1);
    W.assist.invincible = false;
    W.hurtPlayer(p.hp, p.x + 20);
    if (!p.dead) fail('the hero could not be hurt');
    for (let n = 0; n < 400 && (w().player.dead || w().transition); n++) tick(1);
    PT.mortal = false;
    tick(30);
    say(`fell; up again in ${w().def.id}`);
    return PT.settle();
  };

  // Note the save as it stands when an ending starts (it's cleared once the ending has played), and its lines.
  PT.watch = () => {
    if (HA.endings.watched) return;
    const play = HA.endings.play;
    HA.endings.play = function (world, id) {
      const s = world.state;
      PT.ending = {
        id,
        mercy: s.mercy,
        bloom: s.bloom,
        crew: s.crew,
        takenHome: s.takenHome,
        toldShim: s.toldShim,
        warrensRaid: s.warrensRaid,
        podsLaunched: s.podsLaunched,
        people: Object.assign({}, s.people),
        wardens: Object.assign({}, s.wardens),
        deaths: s.deaths,
        time: s.time,
        areaTime: Object.assign({}, s.areaTime),
        choices: s.journal.choices.length,
        lines: HA.endings.lines(id, s),
      };
      return play.apply(this, arguments);
    };
    HA.endings.watched = true;
  };

  PT.state = () => {
    const W = w();
    if (!W) return null;
    const s = W.state;
    return {
      room: W.def.id,
      area: W.def.area,
      lead: s.lead,
      scene: W.scene && W.scene.name,
      mercy: s.mercy,
      bloom: s.bloom,
      crew: s.crew,
      hp: W.player.hp,
      weapons: W.player.weapons.map((x) => x.id),
      abilities: s.abilities,
      people: s.people,
      wardens: s.wardens,
      npcs: W.npcs.map((n) => n.id + ':' + n.state),
      logs: W.logs.filter((l) => !l.read).map((l) => l.id),
      pickups: W.pickups.filter((k) => k.kind !== 'shard').map((k) => k.id || k.kind),
      links: W.links.map((l) => l.legend.to),
      triggers: PT.triggers().map((i) => W.def.triggers[i].run),
      exits: ['left', 'right'].map((side) => side + ':' + edgeRuns(W.def, side).map((r) => r.to)),
      boss: W.boss && { type: W.boss.type, hp: W.boss.hp, fighting: W.boss.fighting },
      time: s.time,
    };
  };
})();
