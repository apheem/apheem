'use strict';
// The map and the journal, one screen with two tabs ({prev} / {next} switch).
// The map fills in as rooms come on screen; the player can drop markers anywhere on it.
// The journal keeps the current lead, the story so far, choices made, ship logs, and every past conversation.
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const MARKS = [
    ['!', '#ffb84d'],
    ['?', '#5fd4e8'],
    ['♥', '#e8434f'],
    ['×', '#eef4f6'],
  ];
  const SECTIONS = ['LEAD', 'STORY', 'CHOICES', 'LOGS', 'TALK'];
  const MAP_BOX = { x: 10, y: 24, w: 300, h: 124 };

  function create(world, tab) {
    const p = world.player;
    const def = world.def;
    const here = { x: def.gx + Math.floor((p.x + p.w / 2) / 8), y: def.gy + Math.floor((p.y + p.h / 2) / 8) };
    return { world, tab: tab || 'map', cursor: Object.assign({}, here), here, section: 0, scroll: 0, image: null, bounds: null, t: 0, rep: {} };
  }

  // ---- Map image: one pixel per tile, only what has been seen ----
  function buildMap(scr) {
    const world = scr.world;
    const rooms = HA.rooms.list.filter((r) => world.state.visited[r.id]);
    const all = HA.rooms.list;
    const minX = Math.min(...all.map((r) => r.gx));
    const minY = Math.min(...all.map((r) => r.gy));
    const maxX = Math.max(...all.map((r) => r.gx + r.w));
    const maxY = Math.max(...all.map((r) => r.gy + r.h));
    const img = HA.art.canvas(maxX - minX, maxY - minY);
    const g = img.getContext('2d');
    for (const r of rooms) {
      const color = HA.rooms.AREAS[r.area].mapColor;
      const ox = r.gx - minX;
      const oy = r.gy - minY;
      for (let ty = 0; ty < r.h; ty++) {
        for (let tx = 0; tx < r.w; tx++) {
          if (!HA.save.isSeen(world, r, tx, ty)) continue;
          const ch = r.map[ty][tx];
          const solid = ch === '#';
          if (!solid) {
            g.fillStyle = ch === '^' ? '#5c2479' : ch === '=' ? '#3a4258' : '#141a2c';
            g.fillRect(ox + tx, oy + ty, 1, 1);
            continue;
          }
          const edge = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => {
            const row = r.map[ty + dy];
            const c = row && row[tx + dx];
            return c !== undefined && c !== '#';
          });
          if (edge) {
            g.fillStyle = color;
            g.globalAlpha = 0.75;
            g.fillRect(ox + tx, oy + ty, 1, 1);
            g.globalAlpha = 1;
          }
        }
      }
      // rest pods
      r.map.forEach((row, ty) => {
        for (let tx = 0; tx < row.length; tx++) {
          if (row[tx] === 'S' && HA.save.isSeen(world, r, tx, ty)) {
            g.fillStyle = '#5fd4e8';
            g.fillRect(ox + tx - 1, oy + ty - 1, 3, 3);
          }
        }
      });
    }
    scr.image = img;
    scr.bounds = { minX, minY, maxX, maxY };
  }

  function update(scr, input) {
    scr.t++;
    const world = scr.world;
    if (input.pressed.prev || input.pressed.next) {
      scr.tab = scr.tab === 'map' ? 'journal' : 'map';
      HA.audio.play('menuMove');
    }
    if (input.pressed.back || input.pressed.map || (input.pressed.pause && !input.pressed.confirm)) return 'close';
    if (scr.tab === 'map') {
      const step = (dir) => {
        if (input.pressed[dir]) {
          scr.rep[dir] = 0;
          return true;
        }
        if (!input.held[dir]) return false;
        scr.rep[dir] = (scr.rep[dir] || 0) + 1;
        return scr.rep[dir] > 12 && scr.rep[dir] % 2 === 0;
      };
      if (step('left')) scr.cursor.x -= 2;
      if (step('right')) scr.cursor.x += 2;
      if (step('up')) scr.cursor.y -= 2;
      if (step('down')) scr.cursor.y += 2;
      if (scr.bounds) {
        scr.cursor.x = HA.clamp(scr.cursor.x, scr.bounds.minX, scr.bounds.maxX - 1);
        scr.cursor.y = HA.clamp(scr.cursor.y, scr.bounds.minY, scr.bounds.maxY - 1);
      }
      if (input.pressed.confirm || input.pressed.jump) {
        // Drop a marker, or change the one under the cursor, or (after the last kind) remove it.
        const list = world.state.markers;
        const at = list.findIndex((m) => Math.abs(m.x - scr.cursor.x) <= 2 && Math.abs(m.y - scr.cursor.y) <= 2);
        if (at < 0) list.push({ x: scr.cursor.x, y: scr.cursor.y, kind: 0 });
        else if (list[at].kind < MARKS.length - 1) list[at].kind++;
        else list.splice(at, 1);
        HA.audio.play('menuOk');
      }
    } else {
      if (input.pressed.left || input.pressed.right) {
        scr.section = (scr.section + (input.pressed.left ? -1 : 1) + SECTIONS.length) % SECTIONS.length;
        scr.scroll = SECTIONS[scr.section] === 'TALK' ? Infinity : 0;
        HA.audio.play('menuMove');
      }
      if (input.held.up) scr.scroll -= input.pressed.up ? 1 : scr.t % 4 === 0 ? 1 : 0;
      if (input.held.down) scr.scroll += input.pressed.down ? 1 : scr.t % 4 === 0 ? 1 : 0;
    }
    return null;
  }

  function panel(g, x, y, w, h, edge = '#3a4258') {
    g.fillStyle = 'rgba(5,6,13,0.96)';
    g.fillRect(x, y, w, h);
    g.fillStyle = edge;
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h);
    g.fillRect(x + w - 1, y, 1, h);
  }

  function draw(scr, g) {
    const world = scr.world;
    panel(g, 4, 4, W - 8, H - 8);
    // tabs
    [['MAP', 'map'], ['JOURNAL', 'journal']].forEach(([label, id], i) => {
      const x = W / 2 + (i ? 34 : -34);
      const sel = scr.tab === id;
      HA.font.draw(g, label, x, 10, sel ? '#ffb84d' : '#6c7894', { align: 'center' });
      if (sel) {
        g.fillStyle = '#ffb84d';
        g.fillRect(Math.round(x - HA.font.measure(label) / 2), 19, HA.font.measure(label), 1);
      }
    });
    HA.font.draw(g, '{prev}', 10, 10, '#6c7894');
    HA.font.draw(g, '{next}', W - 10, 10, '#6c7894', { align: 'right' });
    if (scr.tab === 'map') drawMap(scr, g);
    else drawJournal(scr, g);
  }

  function drawMap(scr, g) {
    const world = scr.world;
    if (!scr.image) buildMap(scr);
    const b = scr.bounds;
    const img = scr.image;
    const ox = Math.round(MAP_BOX.x + (MAP_BOX.w - img.width) / 2);
    const oy = Math.round(MAP_BOX.y + (MAP_BOX.h - img.height) / 2);
    g.drawImage(img, ox, oy);
    // room outlines for visited rooms
    for (const r of HA.rooms.list) {
      if (!world.state.visited[r.id]) continue;
      g.strokeStyle = r.id === world.def.id ? 'rgba(238,244,246,0.5)' : 'rgba(108,120,148,0.35)';
      g.lineWidth = 1;
      g.strokeRect(ox + r.gx - b.minX + 0.5, oy + r.gy - b.minY + 0.5, r.w - 1, r.h - 1);
    }
    for (const m of world.state.markers) HA.font.draw(g, MARKS[m.kind][0], ox + m.x - b.minX, oy + m.y - b.minY - 3, MARKS[m.kind][1], { align: 'center' });
    if (Math.floor(scr.t / 15) % 2) {
      g.fillStyle = '#ffffff';
      g.fillRect(ox + scr.here.x - b.minX - 1, oy + scr.here.y - b.minY - 1, 3, 3);
    }
    // cursor
    const cx = ox + scr.cursor.x - b.minX;
    const cy = oy + scr.cursor.y - b.minY;
    g.fillStyle = '#fff0a8';
    g.fillRect(cx - 4, cy, 3, 1);
    g.fillRect(cx + 2, cy, 3, 1);
    g.fillRect(cx, cy - 4, 1, 3);
    g.fillRect(cx, cy + 2, 1, 3);
    const room = HA.rooms.at(scr.cursor.x * 8, scr.cursor.y * 8);
    const known = room && world.state.visited[room.id];
    HA.font.draw(g, known ? HA.rooms.AREAS[room.area].name + ' · ' + room.name : '', W / 2, 150, known ? HA.rooms.AREAS[room.area].mapColor : '#6c7894', { align: 'center' });
    HA.font.draw(g, '{confirm} MARKER   {back} CLOSE', W / 2, 161, '#6c7894', { align: 'center' });
  }

  const wrap = (text) => [].concat(...HA.scenes.paginate(text));

  function journalLines(world, section) {
    const s = world.state;
    const out = [];
    const add = (text, color) => wrap(text).forEach((l, i) => out.push([l, color, i === 0]));
    if (section === 'LEAD') {
      add(s.lead || 'NOTHING YET.', '#fff0a8');
      out.push(['']);
      add('WHERE YOU ARE: ' + scrHere(world), '#9fb6c8');
    } else if (section === 'STORY') {
      if (!s.journal.story.length) add('NOTHING YET.', '#6c7894');
      s.journal.story.forEach((t) => {
        add('· ' + t, '#eef4f6');
        out.push(['']);
      });
    } else if (section === 'CHOICES') {
      if (!s.journal.choices.length) add('NO CHOICES MADE YET. THEY WILL BE WRITTEN HERE AFTER THEY HAPPEN.', '#6c7894');
      s.journal.choices.forEach((t) => {
        add('· ' + t, '#eef4f6');
        out.push(['']);
      });
    } else if (section === 'LOGS') {
      const read = Object.keys(s.logs).filter((k) => s.logs[k] && HA.story.LOGS[k]);
      if (!read.length) add('NO SHIP LOGS FOUND YET. TERMINALS ON THE WALLS HOLD THEM.', '#6c7894');
      read.forEach((k) => {
        add(HA.story.LOGS[k].title, '#5fd4e8');
        add(HA.story.LOGS[k].text, '#eef4f6');
        out.push(['']);
      });
    } else if (section === 'TALK') {
      if (!s.journal.talk.length) add('NO CONVERSATIONS YET.', '#6c7894');
      s.journal.talk.forEach((t) => {
        if (t.who) add(t.who, '#ffb84d');
        add(t.text, '#eef4f6');
      });
    }
    return out;
  }

  const scrHere = (world) => world.area.name + ' · ' + world.def.name;

  function drawJournal(scr, g) {
    const world = scr.world;
    SECTIONS.forEach((name, i) => {
      const x = 22 + i * 58;
      const sel = i === scr.section;
      HA.font.draw(g, name, x + 24, 26, sel ? '#fff0a8' : '#6c7894', { align: 'center' });
    });
    const lines = journalLines(world, SECTIONS[scr.section]);
    const rows = 10;
    const maxScroll = Math.max(0, lines.length - rows);
    scr.scroll = HA.clamp(scr.scroll, 0, maxScroll);
    const top = Math.round(scr.scroll);
    for (let i = 0; i < rows && top + i < lines.length; i++) {
      const [text, color] = lines[top + i];
      HA.font.draw(g, text, 14, 40 + i * 11, color || '#eef4f6');
    }
    if (top > 0) HA.font.draw(g, '↑', W - 14, 40, '#6c7894');
    if (top < maxScroll) HA.font.draw(g, '↓', W - 14, 140, '#6c7894');
    HA.font.draw(g, '{left}{right} SECTION   {up}{down} SCROLL   {back} CLOSE', W / 2, 161, '#6c7894', { align: 'center' });
  }

  HA.mapscreen = { create, update, draw, MARKS };
})(window.HA);
