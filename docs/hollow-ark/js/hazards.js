'use strict';
// Hazards that come and go: the Engine Spine's pistons and steam, and the short-lived harm other things leave
// behind (a heat slug's embers, a steam drone's blast, the Stoker's burning slag and his fire jet). None of them
// are walls, so tests/rooms-check.js crosses a room as if they were quiet; the player times them instead.
//   A room's `pistons: [{ x, y, len, dir, period, offset }]` are rams that slam out of a wall (dir 'left' or
//   'right', two rows tall from row y) or down from a ceiling (dir 'down', two columns wide from column x),
//   covering `len` tiles from (x, y) when out. Each hisses before it strikes.
//   A room's `vents` (see abilities.js) are drawn here as steam rising from a grate.
//   Anything else adds itself with HA.hazards.add(world, { kind, x, y, w, h, life, dmg }).
(function (HA) {
  const HISS = 40; // frames of warning before a piston strikes
  const OUT = 6; // frames to slam out
  const HOLD = 24;
  const BACK = 20;

  function enter(world) {
    world.hazards = [];
    world.pistons = (world.def.pistons || []).map((d) => Object.assign({ period: 180, offset: 0, out: 0, state: 'rest' }, d));
  }

  function add(world, h) {
    world.hazards.push(Object.assign({ t: 0, dmg: 2 }, h));
  }

  // Where a piston's ram reaches when fully out, in pixels.
  function ramBox(pn, out) {
    const len = pn.len * 8 * out;
    if (pn.dir === 'down') return { x: pn.x * 8, y: pn.y * 8, w: 16, h: len };
    if (pn.dir === 'left') return { x: (pn.x + 1) * 8 - len, y: pn.y * 8, w: len, h: 16 };
    return { x: pn.x * 8, y: pn.y * 8, w: len, h: 16 };
  }

  function updatePiston(world, pn) {
    const t = (world.time + pn.offset) % pn.period;
    const hiss = pn.period - HISS - OUT - HOLD - BACK;
    const strike = hiss + HISS;
    const was = pn.state;
    if (t < hiss) {
      pn.state = 'rest';
      pn.out = 0;
    } else if (t < strike) pn.state = 'hiss';
    else if (t < strike + OUT) {
      pn.state = 'out';
      pn.out = (t - strike + 1) / OUT;
    } else if (t < strike + OUT + HOLD) pn.out = 1;
    else {
      pn.state = 'back';
      pn.out = Math.max(0, 1 - (t - strike - OUT - HOLD) / BACK);
    }
    const near = Math.abs(world.player.x - pn.x * 8) < 200 && Math.abs(world.player.y - pn.y * 8) < 140;
    if (near && was !== pn.state) {
      if (pn.state === 'hiss') HA.audio.play('hiss');
      if (pn.state === 'out') {
        HA.audio.play('piston');
        world.shake(1);
      }
    }
    if (pn.out < 0.3 || world.player.dead) return;
    const box = ramBox(pn, pn.out);
    if (!HA.overlap(world.player, box)) return;
    const p = world.player;
    // Knocked away from the wall it came out of (or sideways off a ram from above).
    const from = pn.dir === 'right' ? box.x - 8 : pn.dir === 'left' ? box.x + box.w + 8 : p.x + p.w / 2 < box.x + 8 ? box.x + 16 : box.x;
    world.hurtPlayer(2, from);
  }

  function update(world) {
    for (const pn of world.pistons) updatePiston(world, pn);
    const p = world.player;
    for (const h of world.hazards) {
      h.t++;
      h.life--;
      if (h.update) h.update(world, h);
      const live = h.armed === undefined || h.armed;
      if (live && h.dmg && !p.dead && HA.overlap(p, h)) world.hurtPlayer(h.dmg, h.x + h.w / 2);
    }
    world.hazards = world.hazards.filter((h) => h.life > 0);
  }

  // ---- Drawing ----
  function drawPiston(g, world, pn, cam) {
    const W = HA.VIEW_W;
    const H = HA.VIEW_H;
    const bx = pn.x * 8 - cam.x;
    const by = pn.y * 8 - cam.y;
    if (bx < -pn.len * 8 - 16 || bx > W + pn.len * 8 + 16 || by < -pn.len * 8 - 16 || by > H + 16) return;
    const box = ramBox(pn, Math.max(pn.out, 0.001));
    const x = Math.round(box.x - cam.x);
    const y = Math.round(box.y - cam.y);
    const shake = pn.state === 'hiss' && world.time % 4 < 2 ? 1 : 0;
    // the housing in the wall, and the ram's head
    g.fillStyle = '#10121c';
    if (pn.dir === 'down') {
      g.fillRect(x - 2 + shake, y - 6, 20, 6);
      g.fillStyle = '#6c7894';
      g.fillRect(x - 1 + shake, y - 5, 18, 4);
      if (box.h > 2) {
        g.fillStyle = '#a9b6cc';
        g.fillRect(x + 6, y, 4, Math.max(0, box.h - 5));
        g.fillStyle = '#10121c';
        g.fillRect(x, y + box.h - 6, 16, 6);
        g.fillStyle = '#c96a2a';
        g.fillRect(x + 1, y + box.h - 5, 14, 4);
        g.fillStyle = '#ffb84d';
        g.fillRect(x + 1, y + box.h - 5, 14, 1);
      }
    } else {
      const right = pn.dir === 'right';
      const hx = right ? x - 6 : x + box.w;
      g.fillRect(hx, y - 2 + shake, 6, 20);
      g.fillStyle = '#6c7894';
      g.fillRect(hx + 1, y - 1 + shake, 4, 18);
      if (box.w > 2) {
        g.fillStyle = '#a9b6cc';
        g.fillRect(right ? x : x + 5, y + 6, Math.max(0, box.w - 5), 4);
        const fx = right ? x + box.w - 6 : x;
        g.fillStyle = '#10121c';
        g.fillRect(fx, y, 6, 16);
        g.fillStyle = '#c96a2a';
        g.fillRect(fx + 1, y + 1, 4, 14);
        g.fillStyle = '#ffb84d';
        g.fillRect(fx + (right ? 4 : 1), y + 1, 1, 14);
      }
    }
    // steam leaking from the housing while it hisses, and its warning lamp blinking
    if (pn.state === 'hiss') {
      const lamp = Math.floor(world.time / 4) % 2 ? '#fff0a8' : '#e8434f';
      g.fillStyle = lamp;
      if (pn.dir === 'down') g.fillRect(x + 6, y - 5, 4, 3);
      else g.fillRect(pn.dir === 'right' ? x - 5 : x + box.w + 2, y + 6, 3, 4);
      for (let i = 0; i < 6; i++) {
        const k = (world.time * 2 + i * 9) % 18;
        const sx = pn.dir === 'down' ? x + 1 + (i % 3) * 6 : pn.dir === 'right' ? x - 2 + k * 0.9 : x + box.w + 2 - k * 0.9;
        const sy = pn.dir === 'down' ? y - 6 - k * 0.6 : y + 1 + (i % 3) * 6 - k * 0.5;
        g.fillStyle = k < 9 ? 'rgba(238,244,246,0.7)' : 'rgba(238,244,246,0.35)';
        g.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      }
    }
  }

  // Steam rising from a grate, thinning as it climbs.
  function drawVent(g, world, v, cam) {
    const x0 = v.x0 * 8 - cam.x;
    const top = v.y0 * 8 - cam.y;
    const bottom = (v.y1 + 1) * 8 - cam.y;
    const w = (v.x1 - v.x0 + 1) * 8;
    if (x0 > HA.VIEW_W || x0 + w < 0 || bottom < 0 || top > HA.VIEW_H) return;
    const span = bottom - top;
    const fog = g.createLinearGradient(0, top, 0, bottom);
    fog.addColorStop(0, 'rgba(238,244,246,0)');
    fog.addColorStop(1, 'rgba(238,244,246,0.2)');
    g.fillStyle = fog;
    g.fillRect(Math.round(x0), Math.round(top), w, span);
    for (let i = 0; i < w / 2 + span / 6; i++) {
      const k = (world.time * 2.2 + i * 37) % span;
      const px = x0 + ((i * 13 + Math.floor((world.time + i * 7) / 9)) % w);
      const py = bottom - k;
      const a = 0.85 * (1 - k / span) + 0.1;
      g.fillStyle = `rgba(238,244,246,${a.toFixed(2)})`;
      g.fillRect(Math.round(px), Math.round(py), i % 3 ? 2 : 3, i % 2 ? 2 : 3);
    }
    // the grate it rises from
    g.fillStyle = '#10121c';
    g.fillRect(Math.round(x0), Math.round(bottom), w, 2);
    g.fillStyle = '#ffb84d';
    for (let x = 1; x < w; x += 3) g.fillRect(Math.round(x0 + x), Math.round(bottom), 1, 1);
  }

  function drawHazard(g, world, h, cam) {
    const x = Math.round(h.x - cam.x);
    const y = Math.round(h.y - cam.y);
    if (x > HA.VIEW_W || x + h.w < 0 || y > HA.VIEW_H || y + h.h < 0) return;
    if (h.draw) return h.draw(g, world, h, cam);
    const fade = h.life < 30 ? h.life / 30 : 1;
    if (h.kind === 'ember') {
      g.globalAlpha = fade;
      g.fillStyle = (h.t >> 3) % 2 ? '#ff9b3d' : '#ffb84d';
      g.fillRect(x + 1, y + h.h - 2, h.w - 2, 2);
      g.fillStyle = '#fff0a8';
      g.fillRect(x + ((h.t >> 2) % (h.w - 2)) + 1, y + h.h - 3, 1, 1);
      g.globalAlpha = 1;
    } else if (h.kind === 'fire') {
      g.globalAlpha = fade;
      for (let i = 0; i < h.w; i += 3) {
        const f = 3 + ((h.t / 3 + i * 5) % 5);
        g.fillStyle = i % 2 ? '#ff9b3d' : '#e8434f';
        g.fillRect(x + i, y + h.h - f, 2, f);
        g.fillStyle = '#ffb84d';
        g.fillRect(x + i, y + h.h - 2, 2, 2);
      }
      g.globalAlpha = 1;
    } else if (h.kind === 'steam') {
      // a blast straight down; harmless while it gathers
      const on = h.armed;
      for (let i = 0; i < (on ? 14 : 4); i++) {
        const k = (h.t * 3 + i * 11) % h.h;
        g.fillStyle = on ? 'rgba(238,244,246,0.75)' : 'rgba(238,244,246,0.35)';
        g.fillRect(x + ((i * 5) % h.w), y + (on ? k : Math.min(k, 6)), 3, 2);
      }
    }
  }

  function draw(g, world, cam) {
    for (const v of world.room.vents || []) drawVent(g, world, v, cam);
    for (const pn of world.pistons || []) drawPiston(g, world, pn, cam);
    for (const h of world.hazards || []) drawHazard(g, world, h, cam);
  }

  HA.hazards = { enter, add, update, draw, ramBox };
})(window.HA);
