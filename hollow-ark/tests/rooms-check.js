'use strict';
// Proves every room of the ship can be crossed, using the game's own movement code (no browser needed).
// For each room it finds every floor the hero can stand on, tries runs, jumps, drops and (where a room
// asks for it) Purge Cannon hovers from each one, and checks that:
//   - every opening at a room's edge lines up with an opening in the next room, with a floor to land on;
//   - from any entrance, every other entrance and every item, person, terminal and rest pod can be reached;
//   - secrets that need the Purge Cannon can't also be reached by jumping;
//   - no gap is 7 tiles wide: that width looks jumpable but needs a pixel-perfect run-up;
//   - every on-screen hint sits in open air, so no wall hides part of it.
//   node rooms-check.js [room-id ...]
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const GAME = path.resolve(__dirname, '..', '..', 'docs', 'hollow-ark');
const html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
const areaScripts = [...html.matchAll(/src="(js\/areas\/[^"]+)"/g)].map((m) => m[1]);
const scripts = ['js/core.js', 'js/font.js', 'js/room.js', 'js/weapons.js', 'js/actors.js', ...areaScripts];

const sandbox = { console, Math, JSON, Object, Array, Set, Map, Uint8Array, Error, Number, String, Infinity };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(GAME, s), 'utf8'), sandbox, { filename: s });
const HA = sandbox.HA;
HA.audio = { play() {}, charge() {} };
// Button prompts inside hints, at their widest on any keyboard or controller.
HA.input = { promptWidth: (a) => ({ confirm: 34, pause: 22, map: 22, prev: 16, next: 16 })[a] || 12 };
const { SOLID, ONEWAY, THORNS, CRATE, EMPTY } = HA.room;

// Spawns that are things to reach, as opposed to enemies, crates and doors.
const NOT_TARGETS = new Set(['c', 'f', 'w', 'k', 'B', 'D', 'P']);
const SCREEN_W = 40;
const HEIGHTS = [23, 45, 68, 90];

const problems = [];
const fail = (room, msg) => problems.push(`${room.id}: ${msg}`);

// ---- Room shape and how rooms join ----
function openRuns(def, col) {
  const runs = [];
  let start = -1;
  for (let y = 0; y <= def.h; y++) {
    const ch = y < def.h ? def.map[y][col] : '#';
    const open = ch !== '#' && ch !== 'B' && ch !== 'D';
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
        fail(def, `${side} exit (rows ${a}-${b}) leads nowhere: no room at ship tile ${gx},${def.gy + a}`);
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

function findSegments(def, room) {
  const segs = [];
  const at = new Map();
  for (let ty = 2; ty < def.h; ty++) {
    let start = -1;
    for (let tx = 0; tx <= def.w; tx++) {
      const ok = tx < def.w && standable(room, tx, ty);
      if (ok && start < 0) start = tx;
      if (!ok && start >= 0) {
        const seg = { id: segs.length, ty, x0: start, x1: tx - 1 };
        segs.push(seg);
        for (let x = start; x < tx; x++) at.set(x + ',' + ty, seg);
        start = -1;
      }
    }
  }
  return { segs, at };
}

// ---- Simulating the hero with the real update code ----
function simulate(room, def, abilities, start, program, onFrame) {
  const p = HA.actors.makePlayer(start.x, start.y);
  p.weapons = abilities.cannon ? [{ id: 'cannon', level: abilities.cannon, xp: 0, ammo: 40 }] : [];
  p.vx = start.vx || 0;
  p.onGround = true;
  p.ground = HA.room.grounded(room, p);
  let hurt = false;
  const world = {
    room,
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
  for (let f = 0; f < 300; f++) {
    const want = program(f, p);
    if (want === null) return { end: 'stop', p };
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'fire']) {
      pressed[a] = !!want[a] && !held[a];
      released[a] = !want[a] && !!held[a];
      held[a] = !!want[a];
    }
    world.time++;
    HA.actors.updatePlayer(world, { held, pressed, released });
    world.shots.length = 0;
    if (hurt) return { end: 'hurt' };
    onFrame(p);
    if (p.x + p.w / 2 < 0) return { end: 'exit', side: 'left', row: Math.floor((p.y + p.h - 1) / 8) };
    if (p.x + p.w / 2 > def.w * 8) return { end: 'exit', side: 'right', row: Math.floor((p.y + p.h - 1) / 8) };
    if (!p.onGround) airborne = true;
    else if (airborne || f > 40) return { end: 'land', x: p.x, y: p.y, p };
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
  return list;
}

function reachability(def, room, abilities, entries, targets) {
  const { segs, at } = findSegments(def, room);
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
    if (legend.reach === false) continue;
    list.push({ id: `${s.type}@${s.tx},${s.ty}`, name: legend.name || s.type, secret: legend.secret || 0, x: s.x - 4, y: s.y - 8, w: 16, h: 16 });
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
  const room = HA.room.load(def.map.map((row) => row.replace(/[DB]/g, '.')));
  const exits = exitsOf(def);
  checkGaps(def, room);
  const targets = targetsOf(def, room);
  const entries = exits.map((e) => ({ exit: e, x: e.side === 'left' ? 0 : def.w * 8 - 8, y: (e.b + 1) * 8 - 14 }));
  for (const s of room.spawns) if (s.type === 'P') entries.push({ start: true, x: s.x, y: s.y + 8 - 14 });
  if (!entries.length) {
    fail(def, 'has no way in');
    return;
  }

  // From each way in on its own: every exit must be reachable, so the hero can never be stuck.
  for (const entry of entries) {
    const { exitsHit } = reachability(def, room, {}, [entry], []);
    for (const e of exits) {
      if (e === entry.exit) continue;
      const ok = [...exitsHit].some((h) => {
        const [side, row] = h.split(':');
        return side === e.side && +row >= e.a && +row <= e.b;
      });
      if (!ok) fail(def, `can't reach the ${e.id} from the ${entry.start ? 'start' : entry.exit.id}`);
    }
  }

  // From all ways in: every item, person, terminal and rest pod, using only what each one allows.
  const plain = reachability(def, room, {}, entries, targets);
  for (const t of targets) {
    if (!t.secret && !plain.reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id}`);
    if (t.secret && plain.reached.has(t.id)) fail(def, `${t.name} at ${t.id} is meant to need a level ${t.secret} Purge Cannon, but a jump reaches it`);
  }
  const levels = [...new Set(targets.filter((t) => t.secret).map((t) => t.secret))];
  for (const level of levels) {
    const withCannon = reachability(def, room, { cannon: level }, entries, targets);
    for (const t of targets) if (t.secret === level && !withCannon.reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id} even with a level ${level} Purge Cannon`);
  }
}

const only = process.argv.slice(2);
const rooms = HA.rooms.list.filter((r) => !only.length || only.includes(r.id));
if (!rooms.length) {
  console.log('No rooms found. Are the area scripts listed in index.html?');
  process.exit(1);
}
for (const def of rooms) {
  const t0 = Date.now();
  const before = problems.length;
  checkRoom(def);
  console.log(`${problems.length === before ? 'PASS' : 'FAIL'} ${def.id} (${def.w}x${def.h}, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
for (const p of problems) console.log('  - ' + p);
process.exit(problems.length ? 1 : 0);
