'use strict';
// Proves every room of the ship can be crossed, using the game's own movement code (no browser needed).
// For each room it finds every floor the hero can stand on (and every water surface they can float on),
// tries runs, jumps, drops, swims and, where a room asks for them, Purge Cannon hovers, thruster burns and
// Grapple Harpoon pulls (and a burn after leaping off a hook) from each one, and checks that:
//   - every opening at a room's edge lines up with an opening in the next room, with a floor to land on;
//   - from any entrance (an edge, or a lift or hatch from another room), every other entrance and every item,
//     person, terminal, switch and rest pod can be reached with the abilities the hero always has by then (the
//     room's `abilities`; `thruster: true` means either pack, and both are tried);
//   - secrets that need something (`secret: n` for a level n Purge Cannon, or `needs: { thruster, grapple,
//     boots, charges }`) can't be reached without it, and can with it; a door with `needs` (a hatch the grapple
//     pulls, a cracked wall a Breach Charge opens) keeps the exit behind it shut without it, and open with it,
//     and so does an exit the room lists in `exitNeeds` (a ledge only a thruster reaches);
//   - a room with cranes (the Stacks) can be crossed from every way in, whichever slot each crane's stack is
//     in, by throwing the switches it can reach; a room whose doors or water follow a story flag (the Silt
//     Tank's sluices, and its water once drained) can be crossed either way;
//   - the Foam Sprayer's platforms are set and stood on as in the game, and a room with water is crossed again
//     in the pressure boots, which sink where the hero used to float;
//   - nowhere the hero can get to is a dead end they can't climb back out of;
//   - belts carry the hero as they do in the game, and containers (%) are walls;
//   - no gap is 7 tiles wide: that width looks jumpable but needs a pixel-perfect run-up;
//   - every on-screen hint sits in open air, so no wall hides part of it.
// It first runs a few small test rooms that prove each ability opens exactly what it should. Each room's floors
// and moves are simulated once per shape (crane state, doors shut or open) and set of abilities, then searched
// from each way in.
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
const { SOLID, ONEWAY, THORNS, CRATE, EMPTY, WATER, FOAM, SLUDGE } = HA.room;

// Spawns that are things to reach, as opposed to enemies, crates and doors.
const NOT_TARGETS = new Set(['c', 'f', 'w', 'k', 'q', 'j', 'b', 'r', 'd', 'v', 'u', 'i', 'x', 'B', 'D', 'P', 'o']);
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
    const open = ch !== '#' && ch !== '%' && ch !== 'B' && !doors.includes(ch);
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
  for (const y of [0, def.h - 1]) if (/[^#%]/.test(def.map[y])) fail(def, `the ${y ? 'bottom' : 'top'} edge must be solid; rooms join only at their sides`);
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
      if (b + 1 >= def.h || (def.map[b + 1][col] !== '#' && def.map[b + 1][col] !== '%')) fail(def, `${side} exit (rows ${a}-${b}) needs solid floor under it at the edge`);
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

// weapon: what the hero holds for this move. Hovers fire the Purge Cannon; grapples fire the Grapple Harpoon,
// which bites a hook in reach exactly as it does in the game.
function simulate(room, def, abilities, start, program, onFrame, weapon, frames = 300) {
  const p = HA.actors.makePlayer(start.x, start.y);
  p.weapons = [];
  if (abilities.cannon) p.weapons.push({ id: 'cannon', level: abilities.cannon, xp: 0, ammo: 40 });
  if (abilities.grapple) p.weapons.push({ id: 'harpoon', level: 1, xp: 0, ammo: 0 });
  if (abilities.foam) p.weapons.push({ id: 'foam', level: 1, xp: 0, ammo: 0 });
  p.wi = Math.max(0, p.weapons.findIndex((w) => w.id === weapon));
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
    foam: [],
    shields: [],
    assist: {},
    hurtEnemy() {},
    flash() {},
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
  try {
    return run(world, p, def, program, onFrame, () => hurt, frames);
  } finally {
    // Foam set during the move melts again, so the room is as it was for the next one.
    for (const pl of world.foam) HA.weapons.dissolve(world, pl);
  }
}

// Is the body standing on foam (the Foam Sprayer's platforms)?
function onFoam(room, p) {
  const ty = Math.floor((p.y + p.h + 0.5) / 8);
  return room.tile(Math.floor(p.x / 8), ty) === FOAM || room.tile(Math.floor((p.x + p.w - 0.01) / 8), ty) === FOAM;
}

function run(world, p, def, program, onFrame, hurt, frames) {
  const room = world.room;
  const held = {};
  const pressed = {};
  const released = {};
  let airborne = false;
  for (let f = 0; f < frames; f++) {
    const want = program(f, p);
    if (want === null) return { end: 'stop', p };
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'fire']) {
      const on = a === 'fire' ? !!(want.fire || want.grapple) : !!want[a];
      pressed[a] = on && !held[a];
      released[a] = !on && !!held[a];
      held[a] = on;
    }
    world.time++;
    HA.actors.updatePlayer(world, { held, pressed, released });
    // Only foam matters here: it sets platforms the hero can stand on.
    world.shots = world.shots.filter((s) => s.kind === 'foam');
    HA.weapons.updateShots(world);
    HA.weapons.updateFoam(world);
    if (hurt()) return { end: 'hurt' };
    onFrame(p);
    if (p.x + p.w / 2 < 0) return { end: 'exit', side: 'left', row: Math.floor((p.y + p.h - 1) / 8) };
    if (p.x + p.w / 2 > def.w * 8) return { end: 'exit', side: 'right', row: Math.floor((p.y + p.h - 1) / 8) };
    if (!p.onGround) airborne = true;
    else if ((airborne || f > 40) && !onFoam(room, p)) return { end: 'land', x: p.x, y: p.y, p };
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
function programs(abilities, onCatwalk, wet, shore, rings) {
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
          list.push({ runup: dir, weapon: 'cannon', prog: (f) => (f > 280 ? null : input(f < stop ? dir : 0, { jump: f < 30, down: f >= at, fire: f >= at })) });
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
  // Grapple: fire the harpoon forward, up or up-and-forward (standing, or at the top of a jump), hang, then
  // leap off or drop. (In a room with no rings to bite, these are only jumps, so they're left out.)
  if (abilities.grapple && rings) {
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
              weapon: 'harpoon',
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
        // With a thruster: leap off the hook, let go, then burn, steering out across.
        if (!abilities.thruster) continue;
        for (const leap of [-1, 1]) {
          list.push({
            runup: 0,
            weapon: 'harpoon',
            prog: (f, p) => {
              if (f < at) return { jump: f < 12 };
              if (!p.hangSince && p.grapple && p.grapple.phase === 'hang') p.hangSince = f;
              if (!p.hangSince) return input(aim.dir, { up: aim.up, grapple: f > at && f < at + 3, jump: at > 0 && f < 12 });
              const t = f - p.hangSince;
              if (t < 6) return {};
              return input(leap, { jump: t < 14 || (t >= 20 && t < 100) });
            },
          });
        }
      }
    }
  }
  // Foam, from water: set a platform, get up onto it, then jump from it. Floating, the glob sets right in front
  // at the surface and a stroke climbs on; on a pool's floor in the boots, it floats up and a jump goes up
  // through it.
  if (abilities.foam && wet) {
    const aims = [-1, 1].map((dir) => ({ up: false, dir }));
    if (abilities.boots) aims.push(...[-1, 1].map((dir) => ({ up: true, dir })));
    for (const aim of aims) {
      for (const hold of [8, 15, 60]) {
        for (const steer of [-1, 0, 1]) {
          list.push({
            runup: 0,
            weapon: 'foam',
            prog: (f, p) => {
              if (f === 0) p.startY = p.y;
              if (!p.footSince && p.onGround && p.y < p.startY - 4) p.footSince = f;
              if (!p.footSince) {
                if (f < 3) return input(aim.dir, { up: aim.up, fire: f > 0 });
                if (abilities.boots) return { jump: f >= 8 && f < 70 };
                return { jump: (f >= 6 && f < 22) || (f >= 40 && f < 56) };
              }
              const t = f - p.footSince;
              if (t < 4) return {};
              return input(steer, { jump: t < 4 + hold });
            },
          });
        }
      }
    }
  }
  // Foam, from the edge of the silt: lob a glob out onto it, hop onto the platform it sets, and again from there,
  // until the hero lands on something firm.
  if (abilities.foam && shore) {
    for (const dir of [-1, 1]) {
      for (const hold of [8, 12, 16, 24]) {
        for (const [wait, run] of [[16, 0], [30, 0], [24, 6]]) {
          list.push({
            runup: 0,
            weapon: 'foam',
            long: true,
            prog: (f, p) => {
              if (f === 0) p.hop = 0;
              if (p.onGround && p.flying) {
                p.flying = false;
                p.hop = f;
              }
              const t = f - p.hop;
              if (!p.onGround) p.flying = t > 2;
              if (t < 3) return input(dir, { fire: t > 0 });
              if (t < wait - run) return {};
              return input(dir, { jump: t >= wait && t < wait + hold });
            },
          });
        }
      }
    }
  }
  return list;
}

// Is there silt near this floor (a little below it, within a dozen tiles either way)? Water can be swum, so only
// silt is worth hopping across on foam.
function nearSilt(room, tx, ty) {
  for (let x = tx - 12; x <= tx + 12; x++) for (let y = ty - 1; y <= ty + 3; y++) if (room.tile(x, y) === SLUDGE) return true;
  return false;
}

// Where a room can be crossed: every floor (segment) the hero can stand on, and from each one, which floors
// the moves land on, which exits they leave by, and which targets they touch. Built once per room shape and
// set of abilities, then searched from any entrance.
function buildGraph(def, room, abilities, targets) {
  const { segs, at } = findSegments(def, room, abilities);
  const segOf = (x, y) => {
    const ty = Math.round((y + 14) / 8);
    return at.get(Math.floor((x + 4) / 8) + ',' + ty) || at.get(Math.floor(x / 8) + ',' + ty) || at.get(Math.floor((x + 7.9) / 8) + ',' + ty);
  };
  const next = segs.map(() => new Set());
  const exits = segs.map(() => new Set());
  const touch = segs.map(() => new Set());
  const lists = new Map();
  const rings = (room.hooks || (room.hooks = hooksOf(room))).length > 0;
  const progsFor = (catwalk, wet, shore) => {
    const k = catwalk + ':' + wet + ':' + shore;
    if (!lists.has(k)) lists.set(k, programs(abilities, catwalk, wet, shore, rings));
    return lists.get(k);
  };
  for (const seg of segs) {
    const touched = touch[seg.id];
    const onFrame = (p) => {
      for (const t of targets) if (!touched.has(t.id) && p.x < t.x + t.w && p.x + p.w > t.x && p.y < t.y + t.h && p.y + p.h > t.y) touched.add(t.id);
    };
    const y = seg.ty * 8 - 14;
    // Walking covers the whole floor.
    for (let tx = seg.x0; tx <= seg.x1; tx++) onFrame({ x: tx * 8, y, w: 8, h: 14 });
    // Moves are tried from every tile near a floor's ends, and from every other tile along the middle of a long
    // one. Trying fewer spots can only find fewer ways across, so nothing passes that shouldn't.
    const spots = new Set();
    for (let tx = seg.x0; tx <= seg.x1; tx++) if (tx - seg.x0 < 6 || seg.x1 - tx < 6 || (tx - seg.x0) % 2 === 0) spots.add(tx * 8);
    spots.add(seg.x0 * 8 - 5);
    spots.add(seg.x1 * 8 + 5);
    for (const x of spots) {
      const tx = Math.floor((x + 4) / 8);
      const catwalk = room.tile(tx, seg.ty) === ONEWAY;
      const wet = room.tile(tx, seg.ty - 1) === WATER;
      const shore = !!abilities.foam && !wet && nearSilt(room, tx, seg.ty);
      for (const pr of progsFor(catwalk, wet, shore)) {
        if (pr.walk && x !== (pr.walk < 0 ? seg.x0 * 8 - 5 : seg.x1 * 8 + 5)) continue;
        let vx = 0;
        if (pr.runup) {
          const back = pr.runup < 0 ? seg.x1 * 8 - x : x - seg.x0 * 8;
          if (back < 16) continue;
          vx = pr.runup * HA.actors.MOVE.run;
        }
        const r = simulate(room, def, abilities, { x, y, vx }, pr.prog, onFrame, pr.weapon, pr.long ? 700 : 300);
        if (r.end === 'land') {
          const n = segOf(r.x, r.y);
          if (n && n !== seg) next[seg.id].add(n.id);
        } else if (r.end === 'exit') exits[seg.id].add(r.side + ':' + r.row);
      }
    }
  }
  return { segs, segOf, next, exits, touch };
}

// A room as the checker sees it, in one crane state (the Stacks' container stacks), with the doors only an
// ability opens either shut or open. Every other door is open, crates are taken as already shot, glass is a wall.
function shapeOf(def, flags, gatesOpen) {
  const state = { flags, wardens: {}, people: {} };
  const rows = def.map.map((row) =>
    [...row]
      .map((ch) => {
        const L = def.legend && def.legend[ch];
        if (L && L.type === 'glass') return '#';
        if (ch === 'B') return '.';
        if (ch === '~' && def.drains && flags[def.drains]) return '.'; // the tank drained
        if (ch === 'D' || (L && L.type === 'door')) {
          if (L && (L.crane || L.state)) return L.open(state) ? '.' : '%';
          if (L && L.needs && !gatesOpen) return '#';
          return '.';
        }
        return ch;
      })
      .join(''),
  );
  const room = HA.room.load(rows);
  room.belts = def.belts || [];
  return room;
}

// A thruster that's needed without saying which pack (true) must work with both of them.
function variants(abilities) {
  if (abilities.thruster !== true) return [abilities];
  return ['odell', 'bloomfire'].map((t) => Object.assign({}, abilities, { thruster: t }));
}
const abKey = (ab) => JSON.stringify(ab);

// Everything that can be reached from some entrances, starting in one crane state. Throwing a crane's switch
// moves on to the other state of that crane, with the hero standing at the switch. With a thruster of either
// pack, only what both packs reach counts.
function makeSolver(def, targets) {
  // Each crane (and each story flag a door or the room's water follows, like the Silt Tank's sluices) doubles the
  // states the room is checked in. Only a crane has switches to move between them.
  const flagOf = (l) => l.crane || l.state;
  const cranes = [...new Set(legendChars(def, (l) => l.type === 'door' && flagOf(l)).map((c) => flagOf(def.legend[c])).concat(def.drains ? [def.drains] : []))];
  const switches = new Map();
  for (const t of targets) if (t.legend && t.legend.type === 'switch') switches.set(t.id, t);
  const graphs = new Map();
  const graph = (si, gatesOpen, ab) => {
    const k = si + ':' + gatesOpen + ':' + abKey(ab);
    if (!graphs.has(k)) {
      const flags = {};
      cranes.forEach((c, i) => (flags[c] = !!(si & (1 << i))));
      graphs.set(k, buildGraph(def, shapeOf(def, flags, gatesOpen), ab, targets));
    }
    return graphs.get(k);
  };
  function search(entries, s0, gatesOpen, ab) {
    const exitsHit = new Set();
    const reached = new Set();
    const seen = new Set();
    const queue = [];
    const push = (si, seg) => {
      if (!seg || seen.has(si + ':' + seg.id)) return;
      seen.add(si + ':' + seg.id);
      queue.push([si, seg]);
    };
    for (const e of entries) push(s0, graph(s0, gatesOpen, ab).segOf(e.x, e.y));
    while (queue.length) {
      const [si, seg] = queue.shift();
      const G = graph(si, gatesOpen, ab);
      for (const x of G.exits[seg.id]) exitsHit.add(x);
      for (const t of G.touch[seg.id]) {
        reached.add(t);
        const sw = switches.get(t);
        if (!sw) continue;
        const sj = si ^ (1 << cranes.indexOf(sw.legend.crane));
        push(sj, graph(sj, gatesOpen, ab).segOf(sw.stand.x, sw.stand.y));
      }
      for (const n of G.next[seg.id]) push(si, G.segs[n]);
    }
    return { exitsHit, reached };
  }
  return {
    states: 1 << cranes.length,
    // Floors the hero can reach from these ways in but never leave again (no exit, and no lift or hatch in
    // `goals`): a pool too deep to climb out of in the boots, say. Rooms without crane switches only, in one state.
    switches: switches.size,
    traps(entries, si, gatesOpen, abilities, goals) {
      const found = [];
      for (const ab of variants(abilities)) {
        const G = graph(si, gatesOpen, ab);
        const seen = new Set();
        const queue = [];
        const add = (i) => {
          if (i === undefined || seen.has(i)) return;
          seen.add(i);
          queue.push(i);
        };
        for (const e of entries) add((G.segOf(e.x, e.y) || {}).id);
        while (queue.length) for (const n of G.next[queue.shift()]) add(n);
        const prev = G.segs.map(() => []);
        G.next.forEach((ns, i) => ns.forEach((n) => prev[n].push(i)));
        const out = new Set();
        const back = [];
        for (const sg of G.segs) {
          if (!G.exits[sg.id].size && ![...G.touch[sg.id]].some((t) => goals.has(t))) continue;
          out.add(sg.id);
          back.push(sg.id);
        }
        while (back.length) {
          for (const j of prev[back.shift()]) {
            if (out.has(j)) continue;
            out.add(j);
            back.push(j);
          }
        }
        for (const i of seen) if (!out.has(i) && !found.some((sg) => sg.id === i)) found.push(G.segs[i]);
      }
      return found;
    },
    reach(entries, s0, gatesOpen, abilities) {
      const results = variants(abilities).map((ab) => search(entries, s0, gatesOpen, ab));
      const [first, ...rest] = results;
      for (const r of rest) {
        for (const x of [...first.exitsHit]) if (!r.exitsHit.has(x)) first.exitsHit.delete(x);
        for (const x of [...first.reached]) if (!r.reached.has(x)) first.reached.delete(x);
      }
      return first;
    },
  };
}

function targetsOf(def, room) {
  const list = [];
  for (const s of room.spawns) {
    if (NOT_TARGETS.has(s.type)) continue;
    const legend = (def.legend && def.legend[s.type]) || {};
    if (legend.reach === false || legend.type === 'door' || legend.type === 'glass') continue;
    const needs = legend.needs || (legend.secret ? { cannon: legend.secret } : null);
    list.push({ id: `${s.type}@${s.tx},${s.ty}`, name: legend.name || s.type, legend, needs, x: s.x - 4, y: s.y - 8, w: 16, h: 16, stand: { x: s.x, y: s.y + 8 - 14 } });
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
      for (let tx = Math.floor(h.x); tx <= Math.min(last, def.w - 1); tx++) if (row[tx] === '#' || row[tx] === '%') hit.push(tx);
    }
    if (hit.length) fail(def, `hint "${h.text}" at ${h.x},${h.y} runs into a wall at column ${Math.min(...hit)}; it needs ${last - Math.floor(h.x) + 1} open tiles`);
  }
}

function checkRoom(def) {
  checkShape(def);
  checkHints(def);
  // Doors are checked open, and crates as already shot: the hero always has a weapon by the first crate.
  // Glass is a wall. A door only an ability opens is checked both ways: shut without it, open with it.
  // A crane's stacks are checked in every state the cranes can be in, with the switches to move between them.
  const gated = gatedDoors(def);
  const room = shapeOf(def, {}, true);
  const exits = exitsOf(def);
  checkGaps(def, room);
  const targets = targetsOf(def, room);
  // An exit behind a gated door needs what the door needs, from either side. A room can also say an exit
  // needs an ability (exitNeeds: a high ledge only a thruster reaches).
  for (const e of exits) {
    for (const ch of gated) {
      const col = (x) => (e.side === 'left' ? x < 5 : x >= def.w - 5);
      const hit = def.map.some((row, y) => y >= e.a && y <= e.b && [...row].some((c, x) => c === ch && col(x)));
      if (hit) e.needs = def.legend[ch].needs;
    }
    for (const n of def.exitNeeds || []) if (n.side === e.side && n.row >= e.a && n.row <= e.b) e.needs = Object.assign({}, e.needs, n.needs);
  }
  const entries = exits.map((e) => ({ exit: e, x: e.side === 'left' ? 0 : def.w * 8 - 8, y: (e.b + 1) * 8 - 14 }));
  for (const s of room.spawns) if (s.type === 'P') entries.push({ start: true, x: s.x, y: s.y + 8 - 14 });
  // A lift or a hatch from another room is a way in, and a way out that must stay in reach from every other way in.
  const linkChars = legendChars(def, (l) => l.type === 'lift' || l.type === 'hatch');
  const links = targets.filter((t) => linkChars.includes(t.id[0]));
  for (const t of links) entries.push({ link: t, x: t.x + 4, y: t.y + 16 - 14 });
  if (!entries.length) {
    fail(def, 'has no way in');
    return;
  }
  const solver = makeSolver(def, targets);
  const stateName = (si) => (solver.states > 1 ? ` with the ${solver.switches ? 'cranes' : 'story flags'} in state ${si}` : '');

  // From each way in on its own, in every crane state: every exit must be reachable, so the hero can never be
  // stuck. A gated exit must stay out of reach without its ability, and come into reach with it.
  const base = def.abilities || {};
  const reaches = (hits, e) =>
    [...hits].some((h) => {
      const [side, row] = h.split(':');
      return side === e.side && +row >= e.a && +row <= e.b;
    });
  for (const entry of entries) {
    const from = entry.start ? 'start' : entry.link ? entry.link.name.replace(/^the /, '') : entry.exit.id;
    const gate = entry.exit && entry.exit.needs;
    for (let si = 0; si < solver.states; si++) {
      const { exitsHit, reached } = solver.reach([entry], si, !!gate, gate ? Object.assign({}, base, gate) : base);
      for (const t of links) if (t !== entry.link && !reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id} from the ${from}${stateName(si)}`);
      for (const e of exits) {
        if (e === entry.exit) continue;
        const ok = reaches(exitsHit, e);
        if (!ok && (gate || !e.needs)) fail(def, `can't reach the ${e.id} from the ${from}${stateName(si)}`);
        if (ok && e.needs && !gate) fail(def, `the ${e.id} is meant to need ${describe(e.needs)}, but the ${from} reaches it without${stateName(si)}`);
        if (e.needs && !gate) {
          const withIt = solver.reach([entry], si, true, Object.assign({}, base, e.needs));
          if (!reaches(withIt.exitsHit, e)) fail(def, `can't reach the ${e.id} from the ${from} even with ${describe(e.needs)}${stateName(si)}`);
        }
      }
    }
  }

  // From all ways in: every item, person, terminal, switch and rest pod, using only what each one allows.
  const plainEntries = entries.filter((e) => !(e.exit && e.exit.needs));
  const plain = solver.reach(plainEntries, 0, false, base);
  for (const t of targets) {
    if (!t.needs && !plain.reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id}`);
    if (t.needs && plain.reached.has(t.id)) fail(def, `${t.name} at ${t.id} is meant to need ${describe(t.needs)}, but it can be reached without`);
  }
  const wants = new Map();
  for (const t of targets) if (t.needs) wants.set(JSON.stringify(t.needs), t.needs);
  for (const [k, needs] of wants) {
    const withIt = solver.reach(entries, 0, true, Object.assign({}, base, needs));
    for (const t of targets) if (t.needs && JSON.stringify(t.needs) === k && !withIt.reached.has(t.id)) fail(def, `can't reach ${t.name} at ${t.id} even with ${describe(needs)}`);
  }

  // Nowhere the hero can get to may be a dead end they can't get back out of.
  const goals = new Set(links.map((t) => t.id));
  const trapped = (ab, what) => {
    if (solver.switches || (!exits.length && !links.length)) return; // the Stacks, and the closed ability test rooms
    for (let si = 0; si < solver.states; si++) {
      for (const sg of solver.traps(entries, si, true, ab, goals)) fail(def, `a hero${what} who gets onto row ${sg.ty} at x ${sg.x0}-${sg.x1} can't get back out${stateName(si)}`);
    }
  };
  trapped(base, '');

  // A room with water is crossed again later in the boots, which sink where the hero used to float. With all
  // the hero has by then (and every gate open), every way in must still lead to every way out, and to every
  // lift and hatch, with no pool they can't climb back out of.
  if (room.hasWater && !base.boots) {
    const later = Object.assign({}, base, { thruster: base.thruster || true, grapple: true, foam: true, boots: true });
    for (const entry of entries) {
      const from = entry.start ? 'start' : entry.link ? entry.link.name.replace(/^the /, '') : entry.exit.id;
      const { exitsHit, reached } = solver.reach([entry], 0, true, later);
      for (const t of links) if (t !== entry.link && !reached.has(t.id)) fail(def, `in the boots, can't reach ${t.name} at ${t.id} from the ${from}`);
      for (const e of exits) if (e !== entry.exit && !reaches(exitsHit, e)) fail(def, `in the boots, can't reach the ${e.id} from the ${from}`);
    }
    trapped(later, ' in the boots');
  }
}

function describe(needs) {
  const parts = [];
  if (needs.cannon) parts.push(`a level ${needs.cannon} Purge Cannon`);
  if (needs.thruster) parts.push(needs.thruster === true ? 'a thruster pack (either one)' : needs.thruster === 'bloomfire' ? 'the Bloomfire pack' : "Odell's thruster pack");
  if (needs.grapple) parts.push('the grapple');
  if (needs.boots) parts.push('the pressure boots');
  if (needs.foam) parts.push('the Foam Sprayer');
  if (needs.charges) parts.push('Breach Charges');
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
// Foam: a ledge four tiles over a wide pool, too high for a swimmer's stroke and too far from the bank to jump.
// In the boots, the same ledge over a pool four deep: a jump from its floor falls short.
const deep = '##' + '#'.repeat(12) + '~'.repeat(16) + '#'.repeat(8) + '##';
const ledgeOver = (top, surface, floor) => {
  const rows = { [top - 1]: put(BLANK, 34, 'T'), [surface - 1]: put(put(BLANK, 4, 'P'), 30, '#'.repeat(9)) };
  for (let y = top; y < surface - 1; y++) rows[y] = put(BLANK, 30, '#'.repeat(9));
  for (let y = surface; y < floor; y++) rows[y] = deep;
  for (let y = floor; y < 21; y++) rows[y] = '#'.repeat(40);
  return rows;
};
const foamRows = ledgeOver(9, 13, 19);
// Silt: a channel too long to clear with a thruster under its low roof, and too hot to wade.
const siltRows = { 18: put(put(BLANK, 3, 'P'), 36, 'T'), 19: '#'.repeat(6) + 's'.repeat(28) + '#'.repeat(6), 20: '#'.repeat(40) };
for (let y = 2; y < 14; y++) siltRows[y] = '#'.repeat(40);
const bootsFoamRows = ledgeOver(10, 14, 18);
const ABILITY_TESTS = [
  ledgeRoom('test-odell', { thruster: 'odell' }),
  ledgeRoom('test-bloomfire', { thruster: 'bloomfire' }),
  ledgeRoom('test-grapple', { grapple: true }, { 10: put(BLANK, 24, 'o') }),
  testRoom('test-pool', poolRows, { boots: true }),
  testRoom('test-foam', foamRows, { foam: true }),
  Object.assign(testRoom('test-boots-foam', bootsFoamRows, { foam: true }), { abilities: { boots: true } }),
  Object.assign(testRoom('test-silt', siltRows, { foam: true }), { abilities: { thruster: true, grapple: true } }),
];
ABILITY_TESTS.forEach((def) => {
  def.w = 40;
  def.h = 23;
});

// Other scripts (and debugging) can use the checker's parts without running it.
module.exports = { HA, shapeOf, targetsOf, buildGraph, findSegments, exitsOf, makeSolver };
if (require.main !== module) return;

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
