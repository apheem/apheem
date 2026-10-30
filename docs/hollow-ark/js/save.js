'use strict';
// Saving: an autosave at every room change and at every rest pod, in one save slot.
// The browser keeps the save in localStorage. The desktop app writes it to a file in the player's app-data
// folder (the same file on Windows, macOS and Linux), which is also where Steam Cloud can pick it up later.
(function (HA) {
  const KEY = 'hollow-ark.save.v1';
  const VERSION = 1;
  const TALK_LOG = 150;

  function newState() {
    const first = HA.rooms.byId['cryo-bay'];
    let x = 40;
    let y = 100;
    first.map.forEach((row, ty) => {
      const tx = row.indexOf('P');
      if (tx >= 0) {
        x = tx * 8;
        y = ty * 8 + 8 - 14;
      }
    });
    return {
      v: VERSION,
      room: first.id,
      x,
      y,
      facing: 1,
      hp: 12,
      maxHp: 12,
      weapons: [],
      wi: 0,
      flags: {},
      taken: {},
      logs: {},
      talked: {},
      visited: {},
      explored: {},
      markers: [],
      journal: { story: [], choices: [], talk: [] },
      lead: '',
      rest: null,
      time: 0,
      deaths: 0,
      mercy: 0,
      bloom: 0,
      fresh: true,
    };
  }

  // ---- Where the save lives ----
  function readRaw() {
    try {
      if (HA.desktop && HA.desktop.readSave) return HA.desktop.readSave();
      return window.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function writeRaw(text) {
    try {
      if (HA.desktop && HA.desktop.writeSave) HA.desktop.writeSave(text);
      else window.localStorage.setItem(KEY, text);
      return true;
    } catch (e) {
      return false; // private windows and some locked-down browsers can't store anything
    }
  }

  function load() {
    const raw = readRaw();
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!data || data.v !== VERSION || !HA.rooms.byId[data.room]) return null;
      const s = Object.assign(newState(), data);
      s.journal = Object.assign({ story: [], choices: [], talk: [] }, data.journal);
      s.fresh = false;
      return s;
    } catch (e) {
      return null;
    }
  }

  const exists = () => !!load();

  function clear() {
    if (HA.desktop && HA.desktop.writeSave) HA.desktop.writeSave('');
    else {
      try {
        window.localStorage.removeItem(KEY);
      } catch (e) {
        /* nothing stored */
      }
    }
  }

  // ---- Moving the hero's kit between the save and the running game ----
  function toPlayer(s, p) {
    p.maxHp = s.maxHp;
    p.hp = Math.max(1, Math.min(s.hp, s.maxHp));
    p.weapons = s.weapons.map((w) => Object.assign({}, w));
    p.wi = HA.clamp(s.wi, 0, Math.max(0, p.weapons.length - 1));
    p.facing = s.facing || 1;
  }

  function fromPlayer(world) {
    const s = world.state;
    const p = world.player;
    s.hp = p.dead ? p.maxHp : p.hp;
    s.maxHp = p.maxHp;
    s.weapons = p.weapons.map((w) => ({ id: w.id, level: w.level, xp: w.xp, ammo: w.ammo }));
    s.wi = p.wi;
  }

  let failedOnce = false;
  function write(world) {
    const s = world.state;
    fromPlayer(world);
    encodeExplored(world);
    s.fresh = false;
    const ok = writeRaw(JSON.stringify(s));
    if (!ok && !failedOnce) {
      failedOnce = true;
      world.toast("THIS BROWSER WON'T KEEP A SAVE", 240);
    }
  }

  // ---- The map: which tiles of each room have been on screen ----
  function seenFor(world, def) {
    world.seen = world.seen || {};
    let bits = world.seen[def.id];
    if (!bits) {
      bits = new Uint8Array(Math.ceil((def.w * def.h) / 8));
      const stored = world.state.explored[def.id];
      if (stored) {
        try {
          const bin = atob(stored);
          for (let i = 0; i < bits.length && i < bin.length; i++) bits[i] = bin.charCodeAt(i);
        } catch (e) {
          /* start this room's map fresh */
        }
      }
      world.seen[def.id] = bits;
    }
    return bits;
  }

  function reveal(world, force) {
    const def = world.def;
    const c = world.cam;
    const x0 = Math.max(0, Math.floor(c.x / 8));
    const y0 = Math.max(0, Math.floor(c.y / 8));
    const sig = def.id + ':' + x0 + ',' + y0;
    if (!force && sig === world.revealSig) return;
    world.revealSig = sig;
    world.state.visited[def.id] = true;
    const bits = seenFor(world, def);
    const x1 = Math.min(def.w - 1, Math.ceil((c.x + HA.VIEW_W) / 8));
    const y1 = Math.min(def.h - 1, Math.ceil((c.y + HA.VIEW_H) / 8));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * def.w + tx;
        bits[i >> 3] |= 1 << (i & 7);
      }
    }
    world.seenDirty = world.seenDirty || {};
    world.seenDirty[def.id] = true;
  }

  function isSeen(world, def, tx, ty) {
    const bits = seenFor(world, def);
    const i = ty * def.w + tx;
    return (bits[i >> 3] >> (i & 7)) & 1;
  }

  function encodeExplored(world) {
    if (!world.seenDirty) return;
    for (const id of Object.keys(world.seenDirty)) {
      const bits = world.seen[id];
      let bin = '';
      for (let i = 0; i < bits.length; i++) bin += String.fromCharCode(bits[i]);
      world.state.explored[id] = btoa(bin);
    }
    world.seenDirty = {};
  }

  // ---- The journal ----
  function addTalk(state, who, text) {
    const log = state.journal.talk;
    log.push({ who, text });
    if (log.length > TALK_LOG) log.splice(0, log.length - TALK_LOG);
  }

  HA.save = { newState, load, exists, clear, write, toPlayer, fromPlayer, reveal, isSeen, addTalk };
})(window.HA);
