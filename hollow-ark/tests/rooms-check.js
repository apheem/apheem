'use strict';
// Proves every room of the ship can be crossed, using the game's own movement code (no browser needed).
// For each room it finds every floor the hero can stand on (and every water surface they can float on),
// tries runs, jumps, drops, swims and, where a room asks for them, Purge Cannon hovers, thruster burns and
// grapple pulls from each one, and checks that:
//   - every opening at a room's edge lines up with an opening in the next room, with a floor to land on;
//   - from any entrance, every other entrance and every item, person, terminal and rest pod can be reached
//     with the abilities the hero always has by then (the room's `abilities`);
//   - secrets that need something (`secret: n` for a level n Purge Cannon, or `needs: { thruster, grapple,
//     boots }`) can't be reached without it, and can with it; a door with `needs` (a hatch the grapple pulls)
//     keeps the exit behind it shut without the ability, and open with it;
//   - no gap is 7 tiles wide: that width looks jumpable but needs a pixel-perfect run-up;
//   - every on-screen hint sits in open air, so no wall hides part of it.
// It first runs a few small test rooms that prove each ability opens exactly what it should.
//   node rooms-check.js [room-id ...]
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const GAME = path.resolve(__dirname, '..', '..', 'docs', 'hollow-ark');
const html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
const areaScripts = [...html.matchAll(/src="(js\/areas\/[^"]+)"/g)].map((m) => m[1]);
const scripts = ['js/core.js', 'js/font.js', 'js/room.js', 'js/weapons.js', 'js/abilities.js', 'js/actors.js', ...areaScripts];

const sandbox = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, Number, String, Infinity };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(GAME, s), 'utf8'), sandbox, { filename: s });
const HA = sandbox.HA;
HA.audio = { play() {}, charge() {} };
// Button prompts inside hints, at their widest on any keyboard or controller.
HA.input = { promptWidth: (a) => ({ confirm: 34, pause: 22, map: 22, prev: 16, next: 16 })[a] || 12 };
const { SOLID, ONEWAY, THORNS, CRATE, EMPTY, WATER } = HA.room;

// Spawns that are things to reach, as opposed to enemies, crates and doors.
const NOT_TARGETS = new Set(['c', 'f', 'w', 'k', 'q', 'j', 'b', 'B', 'D', 'P', 'o']);
// Door cells: D everywhere, and any other character a room's legend calls a door.
const legendChars = (def, test) => Object.keys(def.legend || {}).filter((c) => test(def.legend[c]));
const doorChars = (def) => ['D', ...legendChars(def, (l) => l.type === 'door')];
// Doors that only an ability opens (a hatch the grapple pulls), and glass, which is always shut.
const gatedDoors = (def) => legendChars(def, (l) => l.type === 'door' && l.needs);
const glassChars = (def) => legendChars(def, (l) => l.type === 'glass');
const notes = [];
const SCREEN_W = 40;
const HEIGHTS = [23, 45, 68, 90];

const problems = [];
const fail = (room, msg) => problems.push(`${room.id}: ${msg}`);

// ---- Room shape and how rooms join ----
function openRuns(def, col) {
  const runs = [];
  const doors = doorChars(def);
  let start = -1;
  for (let y = 0; y <= def.h; y++) {
    const ch = y < def.h ? def.map[y][col] : '#';
    const open = ch !== '#' && ch !== 'B' && !doors.includes(ch);
    if (open && start < 0) start = y;
    if (!open && start >= 0) {
      runs.push([start, y - 1]);
      start = -1;
    }
  }
  return runs;
}

function checkShape(def) {
  if (def.w % SCREEN_W) fail(def, `width ${def.w} is not a whole number of screens (${SCREEN_W} tiles)`);
  if (!HEIGHTS.includes(def.h)) fail(def, `height ${def.h} should be one of ${HEIGHTS.join(', ')} tiles`);
  def.map.forEach((row, y) => row.length !== def.w && fail(def, `row ${y} is ${row.length} wide, not ${def.w}`));
  for (const y of [0, def.h - 1]) if (/[^#]/.test(def.map[y])) fail(def, `the ${y ? 'bottom' : 'top'} edge must be solid; rooms join only at their sides`);
  for (const r of HA.rooms.list) {
    if (r === def) continue;
    const overlapX = def.gx < r.gx + r.w && r.gx < def.gx + def.w;
    const overlapY = def.gy < r.gy + r.h && r.gy < def.gy + def.h;
    if (overlapX && overlapY) fail(def, `overlaps ${r.id} on the ship grid`);
  }
}

function exitsOf(def) {
  const exits = [];
  for (const side of ['left', 'right']) {
    const col = side === 'left' ? 0 : def.w - 1;
    for (const [a, b] of openRuns(def, col)) {
      exits.push({ side, a, b, id: `${side} exit (rows ${a}-${b})` });
      if (b + 1 >= def.h || def.map[b + 1][col] !== '#') fail(def, `${side} exit (rows ${a}-${b}) needs solid floor under it at the edge`);
      if (b - a < 2) fail(def, `${side} exit (rows ${a}-${b}) is too low for the hero (needs 3 rows)`);
      for (let y = a - 1; y <= b + 1; y++) {
        for (let x = 0; x < 4; x++) {
          const cx = side === 'left' ? x : def.w - 1 - x;
          if (def.map[y] && def.map[y][cx] === '^') fail(def, `thorns right at the ${side} exit: a hero arriving there could be hurt before seeing them`);
        }
      }
      const gx = side === 'left' ? def.gx - 1 : def.gx + def.w;
      const other = HA.rooms.at(gx * 8 + 4, (def.gy + a) * 8 + 4);
      if (!other) {
        // A room may open onto an area that a later build adds, if it says which.
        if (def.unbuilt && def.unbuilt[side]) notes.push(`${def.id}: the ${side} exit (rows ${a}-${b}) waits for ${def.unbuilt[side].toLowerCase()}`);
        else fail(def, `${side} exit (rows ${a}-${b}) leads nowhere: no room at ship tile ${gx},${def.gy + a}`);
        continue;
      }
      const ocol = side === 'left' ? other.w - 1 : 0;
      const match = openRuns(other, ocol).some(([oa, ob]) => other.gy + oa === def.gy + a && other.gy + ob === def.gy + b);
      if (!match) fail(def, `${side} exit (rows ${a}-${b}) doesn't line up with an opening of the same height in ${other.id}`);
    }
  }
  return exits;
}

// Gaps the same width as the hero's longest jump look jumpable but need a perfect run-up. Keep them out.
function checkGaps(def, room) {
  for (let ty = 1; ty < def.h; ty++) {
    let lastFloorEnd = -1;
    for (let tx = 0; tx < def.w; tx++) {
      if (!standable(room, tx, ty)) continue;
      const gap = tx - lastFloorEnd - 1;
      if (lastFloorEnd >= 0 && gap === 7 && clearAbove(room, lastFloorEnd + 1, tx - 1, ty) && !(def.allowGaps || []).includes(`${lastFloorEnd + 1},${ty}`)) {
        fail(def, `a 7-tile gap at x ${lastFloorEnd + 1}-${tx - 1}, row ${ty} is right at the limit of a running jump; make it 5 or less, or 9 or more`);
      }
      lastFloorEnd = tx;
    }
  }
}
function clearAbove(room, x0, x1, ty) {
  for (let x = x0; x <= x1; x++) for (let y = ty - 3; y <= ty; y++) if (room.tile(x, y) !== EMPTY && room.tile(x, y) !== THORNS) return false;
  return true;
}

// ---- Where the hero can stand ----
const blocks = (t) => t === SOLID || t === CRATE;
function standable(room, tx, ty) {
  const t = room.tile(tx, ty);
  if (!(blocks(t) || t === ONEWAY)) return false;
  for (const dy of [1, 2]) {
    const a = room.tile(tx, ty - dy);
    if (blocks(a) || a === THORNS) return false;
  }
  return true;
}

// A hero without the pressure boots floats chest-deep on a water surface, one row below its top tile:
// the same row a floor there would be, so a floating spot and a standing spot are looked up alike.
function floatable(room, tx, ty) {
  return room.tile(tx, ty - 1) === WATER && room.tile(tx, ty - 2) === EMPTY && !standable(room, tx, ty);
}

function findSegments(def, room, abilities) {
  const segs = [];
  const at = new Map();
  const kinds = abilities.boots ? [standable] : [standable, floatable];
  for (const ok of kinds) {
    for (let ty = 2; ty < def.h; ty++) {
      let start = -1;
      for (let tx = 0; tx <= def.w; tx++) {
        const here = tx < def.w && ok(room, tx, ty);
        if (here && start < 0) start = tx;
        if (!here && start >= 0) {
          const seg = { id: segs.length, ty, x0: start, x1: tx - 1, float: ok === floatable };
          segs.push(seg);
          for (let x = start; x < tx; x++) at.set(x + ',' + ty, seg);
          start = -1;
        }
      }
    }
  }
  return { segs, at };
}

// ---- Simulating the hero with the real update code ----
function hooksOf(room) {
  return room.spawns.filter((s) => s.type === 'o').map((s) => ({ x: s.x + 4, y: s.y + 4 }));
}

function simulate(room, def, abilities, start, program, onFrame) {
  const p = HA.actors.makePlayer(start.x, start.y);
  p.weapons = abilities.cannon ? [{ id: 'cannon', level: abilities.cannon, xp: 0, ammo: 40 }] : [];
  p.abilities = { thruster: abilities.thruster || null, grapple: !!abilities.grapple, boots: !!abilities.boots };
  p.vx = start.vx || 0;
  p.ground = HA.room.grounded(room, p);
  p.onGround = !!p.ground;
  let hurt = false;
  const world = {
    room,
    hooks: room.hooks || (room.hooks = hooksOf(room)),
    player: p,
    time: 0,
    shots: [],
    beams: [],
    enemies: [],
    particles: [],
    pickups: [],
    assist: {},
    dust() {},
    burst() {},
    shake() {},
    muzzleFlash() {},
    floatText() {},
    toast() {},
    hurtPlayer() {
      hurt = true;
    },
  };
  const held = {};
  const pressed = {};
  const released = {};
  let airborne = false;
  let grappled = false;
  for (let f = 0; f < 300; f++) {
    const want = program(f, p);
    if (want === null) return { end: 'stop', p };
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'fire']) {
      pressed[a] = !!want[a] && !held[a];
      released[a] = !want[a] && !!held[a];
      held[a] = !!want[a];
    }
    world.time++;
    // The Grapple Harpoon (Phase 3.3) will fire this on a press; until then the moves ask for it directly.
    if (want.grapple && !grappled) HA.abilities.fireGrapple(world, p, { held, pressed, released });
    grappled = !!want.grapple;
    HA.actors.updatePlayer(world, { held, pressed, released });
    world.shots.length = 0;
    if (hurt) return { end: 'hurt' };
    onFrame(p);
    if (p.x + p.w / 2 < 0) return { end: 'exit', side: 'left', row: Math.floor((p.y + p.h - 1) / 8) };
    if (p.x + p.w / 2 > def.w * 8) return { end: 'exit', side: 'right', row: Math.floor((p.y + p.h - 1) / 8) };
    if (!p.onGround) airborne = true;
    else if (airborne || f > 40) return { end: 'land', x: p.x, y: p.y, p };
    // Floating still on a surface counts as landing there.
    if (p.wet && !p.grapple && f > 20 && Math.abs(p.vy) < 0.06 && Math.abs(p.vx) < 0.06) return { end: 'land', x: p.x, y: p.y, p };
  }
  return { end: 'timeout' };
}

const DIRS = [-1, 0, 1];
const key = (d) => (d < 0 ? 'left' : d > 0 ? 'right' : null);
function input(dir, extra) {
  const o = Object.assign({}, extra);
  if (key(dir)) o[key(dir)] = true;
  return o;
}

// The moves tried from every spot: jumps of several heights with steering, walking off ledges,
// dropping through catwalks, and (with the cannon) hovering by firing down.
function programs(abilities, onCatwalk) {
  const list = [];
  for (const hold of [3, 7, 11, 15, 60]) {
    list.push({ runup: 0, prog: (f) => (f > 80 ? null : { jump: f < hold }) });
    for (const dir of [-1, 1]) {
      for (const delay of [0, 8]) {
        for (const stop of [Infinity, 16]) {
          for (const runup of [0, 1]) {
            list.push({ runup: runup * dir, prog: (f) => input(f >= delay && f < stop ? dir : 0, { jump: f < hold }) });
          }
        }
      }
    }
  }
  for (const dir of [-1, 1]) {
    for (const after of ['keep', 'release', 'reverse']) {
      list.push({
        walk: dir,
        prog: (f, p) => {
          if (p.onGround && !p.left) return input(dir);
          p.left = true;
          return input(after === 'keep' ? dir : after === 'reverse' ? -dir : 0);
        },
      });
    }
  }
  if (onCatwalk) for (const dir of DIRS) list.push({ runup: 0, prog: (f) => input(f > 6 ? dir : 0, { down: f < 3, jump: f === 1 }) });
  if (abilities.cannon) {
    for (const dir of DIRS) {
      for (const at of [6, 14, 22]) {
        for (const stop of [Infinity, 50, 90]) {
          list.push({ runup: dir, prog: (f) => (f > 280 ? null : input(f < stop ? dir : 0, { jump: f < 30, down: f >= at, fire: f >= at })) });
        }
      }
    }
  }
  // Thruster: jump, let go, then press Jump again and burn, steering or not.
  if (abilities.thruster) {
    for (const dir of DIRS) {
      for (const first of [4, 16]) {
        for (const second of [first + 3, 34]) {
          for (const burn of [24, 90]) {
            for (const steer of [0, 30]) {
              list.push({ runup: 0, prog: (f) => input(f >= steer ? dir : 0, { jump: f < first || (f >= second && f < second + burn) }) });
            }
          }
        }
      }
    }
  }
  // Grapple: fire forward, up or up-and-forward (standing, or at the top of a jump), hang, then leap off or drop.
  if (abilities.grapple) {
    const aims = [
      { up: false, dir: -1 },
      { up: false, dir: 1 },
      { up: true, dir: 0 },
      { up: true, dir: -1 },
      { up: true, dir: 1 },
    ];
    for (const aim of aims) {
      for (const at of [0, 14]) {
        for (const leap of [-1, 0, 1, 'drop']) {
          for (const hold of [8, 60]) {
            if (leap === 'drop' && hold !== 8) continue;
            list.push({
              runup: 0,
              prog: (f, p) => {
                if (f < at) return { jump: f < 12 };
                if (!p.hangSince && p.grapple && p.grapple.phase === 'hang') p.hangSince = f;
                // Fire a frame after turning, so a forward shot goes the way the hero now faces.
                if (!p.hangSince) return input(aim.dir, { up: aim.up, grapple: f > at && f < at + 3, jump: at > 0 && f < 12 });
                const t = f - p.hangSince;
                if (t < 6) return {};
                if (leap === 'drop') return { down: t < 9 };
                return input(leap, { jump: t < 6 + hold });
              },
            });
          }
        }
      }
    }
  }
  return list;
}

function reachability(def, room, abilities, entries, targets) {
  const { segs, at } = findSegments(def, room, abilities);
  const segOf = (x, y) => {
    const ty = Math.round((y + 14) / 8);
    return at.get(Math.floor((x + 4) / 8) + ',' + ty) || at.get(Math.floor(x / 8) + ',' + ty) || at.get(Math.floor((x + 7.9) / 8) + ',' + ty);
  };
  const reached = new Set();
  const exitsHit = new Set();
  const seen = new Set();
  const queue = [];
  const visit = (seg) => {
    if (seg && !seen.has(seg.id)) {
      seen.add(seg.id);
      queue.push(seg);
    }
  };
  const touch = (p) => {
    for (const t of targets) if (!reached.has(t.id) && p.x < t.x + t.w && p.x + p.w > t.x && p.y < t.y + t.h && p.y + p.h > t.y) reached.add(t.id);
  };
  for (const e of entries) visit(segOf(e.x, e.y));
  const progs = programs(abilities, false);
  const progsCat = programs(abilities, true);
  while (queue.length) {
    const seg = queue.shift();
    const y = seg.ty * 8 - 14;
    // Walking covers the whole floor.
    for (let tx = seg.x0; tx <= seg.x1; tx++) touch({ x: tx * 8, y, w: 8, h: 14 });
    const spots = new Set();
    for (let tx = seg.x0; tx <= seg.x1; tx++) spots.add(tx * 8);
    spots.add(seg.x0 * 8 - 5);
    spots.add(seg.x1 * 8 + 5);
    for (const x of spots) {
      const tx = Math.floor((x + 4) / 8);
      const catwalk = room.tile(tx, seg.ty) === ONEWAY;
      for (const pr of catwalk ? progsCat : progs) {
        if (pr.walk && x !== (pr.walk < 0 ? seg.x0 * 8 - 5 : seg.x1 * 8 + 5)) continue;
        let vx = 0;
        if (pr.runup) {
          const back = pr.runup < 0 ? seg.x1 * 8 - x : x - seg.x0 * 8;
          if (back < 16) continue;
          vx = pr.runup * HA.actors.MOVE.run;
        }
        const r = simulate(room, def, abilities, { x, y, vx }, pr.prog, touch);
        if (r.end === 'land') visit(segOf(r.x, r.y));
        else if (r.end === 'exit') exitsHit.add(r.side + ':' + r.row);
      }
    }
  }
  return { reached, exitsHit };
}

function targetsOf(def, room) {
  const list = [];
  for (const s of room.spawns) {
    if (NOT_TARGETS.has(s.type)) continue;
    const legend = (def.legend && def.legend[s.type]) || {};
    if (legend.reach === false || legend.type === 'door' || legend.type === 'glass') continue;
    const needs = legend.needs || (legend.secret ? { cannon: legend.secret } : null);
    list.push({ id: `${s.type}@${s.tx},${s.ty}`, name: legend.name || s.type, needs, x: s.x - 4, y: s.y - 8, w: 16, h: 16 });
  }
  return list;
}

// Hints are painted on the back wall, under the tiles: any wall they touch would cover part of the text.
function checkHints(def) {
  for (const h of def.hints || []) {
    const w = HA.font.measure(h.text);
    const last = Math.floor((h.x * 8 + w - 1) / 8);
    if (last >= def.w) fail(def, `hint "${h.text}" runs off the room's right edge`);
    const hit = [];
    for (let ty = Math.floor(h.y); ty <= Math.floor(h.y + 7 / 8); ty++) {
      const row = def.map[ty] || '';
      for (let tx = Math.floor(h.x); tx <= Math.min(last, def.w - 1); tx++) if (row[tx] === '#') hit.push(tx);
    }
    if (hit.length) fail(def, `hint "${h.text}" at ${h.x},${h.y} runs into a wall at column ${Math.min(...hit)}; it needs ${last - Math.floor(h.x) + 1} open tiles`);
  }
}

function checkRoom(def) {
  checkShape(def);
  checkHints(def);
  // Doors are checked open, and crates as already shot: the hero always has a weapon by the first crate.
  // Glass is a wall. A door only an ability opens is checked both ways: shut without it, open with it.
  const glass = new RegExp('[' + (glassChars(def).join('') || '#') + ']', 'g');
  const gated = gatedDoors(def);
  const open = new RegExp('[B' + doorChars(def).join('') + ']', 'g');
  const openGates = new RegExp('[B' + doorChars(def).filter((c) => !gated.includes(c)).join('') + ']', 'g');
  const shutGates = gated.length ? new RegExp('[' + gated.join('') + ']', 'g') : null;
  const rows = def.map.map((row) => row.replace(glass, '#'));
  const room = HA.room.load(rows.map((row) => row.replace(open, '.')));
  const shut = shutGates ? HA.room.load(rows.map((row) => row.replace(openGates, '.').replace(shutGates, '#'))) : room;
  const exits = exitsOf(def);
  checkGaps(def, room);
  const targets = targetsOf(def, room);
  // An exit behind a gated door needs what the door needs, from either side.
  for (const e of exits) {
    for (const ch of gated) {
      const col = (x) => (e.side === 'left' ? x < 5 : x >= def.w - 5);
      const hit = def.map.some((row, y) => y >= e.a && y <= e.b && [...row].some((c, x) => c === ch && col(x)));
      if (hit) e.needs = def.legend[ch].needs;
    }
  }
  const entries = exits.map((e) => ({ exit: e, x: e.side === 'left' ? 0 : def.w * 8 - 8, y: (e.b + 1) * 8 - 14 }));
  for (const s of room.spawns) if (s.type === 'P') entries.push({ start: true, x: s.x, y: s.y + 8 - 14 });
  if (!entries.length) {
    fail(def, 'has no way in');
    return;
  }

  // From each way in on its own: every exit must be reachable, so the hero can never be stuck.
  // A gated exit must stay out of reach without its ability, and come into reach with it.
  const base = def.abilities || {};
  const reaches = (hits, e) =>
    [...hits].some((h) => {
      const [side, row] = h.split(':');
      return side === e.side && +row >= e.a && +row <= e.b;
    });
  for (const entry of entries) {
    const from = entry.start ? 'start' : entry.exit.id;
    const gate = entry.exit && entry.exit.needs;
    const { exitsHit } = reachability(def, gate ? room : shut, gate ? Object.assign({}, base, gate) : base, [entry], []);
    for (const e of exits) {
      if (e === entry.exit) continue;
      const ok = reaches(exitsHit, e);
      if (!ok && (gate || !e.needs)) fail(def, `can't reach the ${e.id} from the ${from}`);
      if (ok && e.needs && !gate) fail(def, `the ${e.id} is meant to need ${describe(e.needs)}, but the ${from} reaches it without`);
      if (e.needs && !gate) {
        const withIt = reachability(def, room, Object.assign({}, base, e.needs), [entry], []);
        if (!reaches(withIt.exitsHit, e)) fail(def, `can't reach the ${e.id} from the ${from} even with ${describe(e.needs)}`);
      }
    }
  }

  // From all ways in: every item, person, terminal and rest pod, using only what each one allows.
  const plainEntries = entries.filter((e) => !(e.exit && e.exit.needs));
  const plain = reachability(def, shut, base, plainEntries, targets);
  for (const t of targets) {
    if (!t.needs && !plain.reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id}`);
    if (t.needs && plain.reached.has(t.id)) fail(def, `${t.name} at ${t.id} is meant to need ${describe(t.needs)}, but it can be reached without`);
  }
  const wants = new Map();
  for (const t of targets) if (t.needs) wants.set(JSON.stringify(t.needs), t.needs);
  for (const [k, needs] of wants) {
    const withIt = reachability(def, room, Object.assign({}, base, needs), entries, targets);
    for (const t of targets) if (t.needs && JSON.stringify(t.needs) === k && !withIt.reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id} even with ${describe(needs)}`);
  }
}

function describe(needs) {
  const parts = [];
  if (needs.cannon) parts.push(`a level ${needs.cannon} Purge Cannon`);
  if (needs.thruster) parts.push(needs.thruster === 'bloomfire' ? 'the Bloomfire pack' : "Odell's thruster pack");
  if (needs.grapple) parts.push('the grapple');
  if (needs.boots) parts.push('the pressure boots');
  return parts.join(' and ');
}

// ---- Small test rooms, one per ability: the thing on the high ledge (or the pool floor) needs it ----
function testRoom(id, rows, needs) {
  const blank = '#' + '.'.repeat(38) + '#';
  const solid = '#'.repeat(40);
  const map = [solid, solid];
  for (let y = 2; y < 21; y++) map.push(rows[y] || blank);
  map.push(solid, solid);
  return { id, gx: -1000, gy: -1000, w: 40, h: 23, map, legend: { T: { type: 'log', name: 'the test target', needs } } };
}
const put = (row, at, text) => row.slice(0, at) + text + row.slice(at + text.length);
const BLANK = '#' + '.'.repeat(38) + '#';
const FLOOR = { 19: '#'.repeat(40), 20: '#'.repeat(40) };
const ledgeRoom = (id, needs, extra) =>
  testRoom(id, Object.assign({}, FLOOR, { 8: put(BLANK, 32, 'T'), 9: put(BLANK, 26, '#'.repeat(13)), 18: put(BLANK, 4, 'P') }, extra), needs);
const pool = '##' + '#'.repeat(12) + '~'.repeat(13) + '#'.repeat(11) + '##';
const poolRows = { 12: put(put(BLANK, 4, 'P'), 32, 'R'), 19: pool, 20: put(pool, 20, 'T') };
for (let y = 13; y < 19; y++) poolRows[y] = pool;
const ABILITY_TESTS = [
  ledgeRoom('test-odell', { thruster: 'odell' }),
  ledgeRoom('test-bloomfire', { thruster: 'bloomfire' }),
  ledgeRoom('test-grapple', { grapple: true }, { 10: put(BLANK, 24, 'o') }),
  testRoom('test-pool', poolRows, { boots: true }),
];
ABILITY_TESTS.forEach((def) => {
  def.w = 40;
  def.h = 23;
});

const only = process.argv.slice(2);
if (!only.length || only.includes('abilities')) {
  for (const def of ABILITY_TESTS) {
    const t0 = Date.now();
    const before = problems.length;
    checkRoom(def);
    console.log(`${problems.length === before ? 'PASS' : 'FAIL'} ${def.id} (ability test, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
const rooms = HA.rooms.list.filter((r) => !only.length || only.includes(r.id));
if (!rooms.length && !only.includes('abilities')) {
  console.log('No rooms found. Are the area scripts listed in index.html?');
  process.exit(1);
}
for (const def of rooms) {
  const t0 = Date.now();
  const before = problems.length;
  checkRoom(def);
  console.log(`${problems.length === before ? 'PASS' : 'FAIL'} ${def.id} (${def.w}x${def.h}, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
for (const n of notes) console.log('  note: ' + n);
for (const p of problems) console.log('  - ' + p);
process.exit(problems.length ? 1 : 0);
