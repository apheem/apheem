'use strict';
// Room tiles, collision and movement. Room layouts live in js/areas/, one file per area of the ship.
// Map legend shared by every room: # hull   = catwalk (jump up through, Down+Jump to drop)   ^ Bloom thorns   B crate.
// Every other character is a spawn that the room's own legend (or the shared one in world.js) explains.
(function (HA) {
  const EMPTY = 0;
  const SOLID = 1;
  const ONEWAY = 2;
  const THORNS = 3;
  const CRATE = 4;
  const CODES = { '#': SOLID, '=': ONEWAY, '^': THORNS, B: CRATE };

  function load(MAP) {
    const h = MAP.length;
    const w = MAP[0].length;
    const tiles = new Uint8Array(w * h);
    const spawns = [];
    for (let y = 0; y < h; y++) {
      if (MAP[y].length !== w) throw new Error('Room row ' + y + ' has the wrong width');
      for (let x = 0; x < w; x++) {
        const ch = MAP[y][x];
        tiles[y * w + x] = CODES[ch] || EMPTY;
        if (ch !== '.' && ch !== ' ' && !CODES[ch]) spawns.push({ type: ch, tx: x, ty: y, x: x * 8, y: y * 8 });
        if (ch === 'B') spawns.push({ type: 'B', tx: x, ty: y, x: x * 8, y: y * 8 });
      }
    }
    const room = {
      w,
      h,
      pw: w * 8,
      ph: h * 8,
      tiles,
      spawns,
      // Outside the room, the edge tile continues: walls stay walls, and openings lead on to the next room.
      tile(tx, ty) {
        tx = tx < 0 ? 0 : tx >= w ? w - 1 : tx;
        ty = ty < 0 ? 0 : ty >= h ? h - 1 : ty;
        return tiles[ty * w + tx];
      },
      set(tx, ty, t) {
        if (tx >= 0 && ty >= 0 && tx < w && ty < h) tiles[ty * w + tx] = t;
      },
      solidAt(px, py) {
        const t = room.tile(Math.floor(px / 8), Math.floor(py / 8));
        return t === SOLID || t === CRATE;
      },
    };
    return room;
  }

  // Move a body (x, y, w, h, vx, vy) through the room one axis at a time.
  // Returns which sides hit something. Catwalks only stop a body falling onto them from above.
  function move(room, body, dx, dy, opts = {}) {
    const hit = { left: false, right: false, up: false, down: false, oneway: false };
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4) || 1;
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (sx) moveX(room, body, sx, hit);
      if (sy) moveY(room, body, sy, hit, opts);
    }
    return hit;
  }

  function blocking(t) {
    return t === SOLID || t === CRATE;
  }

  function moveX(room, b, dx, hit) {
    b.x += dx;
    const top = Math.floor(b.y / 8);
    const bottom = Math.floor((b.y + b.h - 0.01) / 8);
    if (dx > 0) {
      const tx = Math.floor((b.x + b.w - 0.01) / 8);
      for (let ty = top; ty <= bottom; ty++) {
        if (blocking(room.tile(tx, ty))) {
          b.x = tx * 8 - b.w;
          hit.right = true;
          return;
        }
      }
    } else {
      const tx = Math.floor(b.x / 8);
      for (let ty = top; ty <= bottom; ty++) {
        if (blocking(room.tile(tx, ty))) {
          b.x = (tx + 1) * 8;
          hit.left = true;
          return;
        }
      }
    }
  }

  function moveY(room, b, dy, hit, opts) {
    const prevBottom = b.y + b.h;
    b.y += dy;
    const left = Math.floor(b.x / 8);
    const right = Math.floor((b.x + b.w - 0.01) / 8);
    if (dy > 0) {
      const ty = Math.floor((b.y + b.h - 0.01) / 8);
      for (let tx = left; tx <= right; tx++) {
        const t = room.tile(tx, ty);
        const catwalk = t === ONEWAY && !opts.dropThrough && prevBottom <= ty * 8 + 0.01;
        if (blocking(t) || catwalk) {
          b.y = ty * 8 - b.h;
          hit.down = true;
          hit.oneway = catwalk;
          return;
        }
      }
    } else {
      const ty = Math.floor(b.y / 8);
      for (let tx = left; tx <= right; tx++) {
        if (blocking(room.tile(tx, ty))) {
          b.y = (ty + 1) * 8;
          hit.up = true;
          return;
        }
      }
    }
  }

  // Is the body standing on something? (used for coyote time and walking off edges)
  function grounded(room, b, opts = {}) {
    const ty = Math.floor((b.y + b.h + 0.5) / 8);
    if (Math.abs(b.y + b.h - ty * 8) > 0.6) return false;
    const left = Math.floor(b.x / 8);
    const right = Math.floor((b.x + b.w - 0.01) / 8);
    for (let tx = left; tx <= right; tx++) {
      const t = room.tile(tx, ty);
      if (blocking(t) || (t === ONEWAY && !opts.dropThrough)) return t === ONEWAY ? 'oneway' : 'solid';
    }
    return false;
  }

  function touchesThorns(room, b) {
    const left = Math.floor((b.x + 1) / 8);
    const right = Math.floor((b.x + b.w - 1) / 8);
    const top = Math.floor((b.y + 2) / 8);
    const bottom = Math.floor((b.y + b.h + 0.5) / 8);
    for (let ty = top; ty <= bottom; ty++) for (let tx = left; tx <= right; tx++) if (room.tile(tx, ty) === THORNS) return true;
    return false;
  }

  HA.room = { load, move, grounded, touchesThorns, EMPTY, SOLID, ONEWAY, THORNS, CRATE };

  // ---- Every room of the ship, placed on one grid (in tiles) so neighbors and the map line up ----
  // A room def: { id, area, name, gx, gy, map: [rows], legend: { char: spawn }, hints, triggers, music, ... }
  const AREAS = {};
  const ROOMS = [];
  const byId = {};
  HA.rooms = {
    AREAS,
    list: ROOMS,
    byId,
    area(id, def) {
      AREAS[id] = Object.assign({ id }, def);
    },
    add(def) {
      def.w = def.map[0].length;
      def.h = def.map.length;
      ROOMS.push(def);
      byId[def.id] = def;
      return def;
    },
    // The room that holds a point on the ship grid (in pixels), if any.
    at(px, py) {
      const tx = Math.floor(px / 8);
      const ty = Math.floor(py / 8);
      return ROOMS.find((r) => tx >= r.gx && tx < r.gx + r.w && ty >= r.gy && ty < r.gy + r.h) || null;
    },
  };
})(window.HA);
