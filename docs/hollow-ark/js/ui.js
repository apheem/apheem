'use strict';
// Title screen, pause menu, map and journal, settings and controls. Everything is reachable with keyboard
// or controller alone.
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const S = HA.settings;

  const ui = { mode: 'title', stack: [], world: null, time: 0, nav: { up: 0, down: 0, left: 0, right: 0 } };

  // ---- Mouse and touch: never needed, but menus answer to them, and a click moves dialogue on ----
  const pointer = { x: -1, y: -1, moved: false, click: false, back: false, wheel: 0 };
  ui.pointer = pointer;
  (function listen() {
    const canvas = document.getElementById('screen');
    if (!canvas) return;
    const at = (e) => {
      const v = HA.display.view;
      const dpr = window.devicePixelRatio || 1;
      pointer.x = (e.clientX * dpr - v.ox) / v.s;
      pointer.y = (e.clientY * dpr - v.oy) / v.s;
    };
    canvas.addEventListener('pointermove', (e) => {
      at(e);
      pointer.moved = true;
    });
    canvas.addEventListener('pointerdown', (e) => {
      at(e);
      if (e.button === 2) pointer.back = true;
      else if (e.button === 0) pointer.click = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        pointer.wheel += Math.sign(e.deltaY);
      },
      { passive: false }
    );
  })();
  const inside = (r) => r && pointer.x >= r.x && pointer.x < r.x + r.w && pointer.y >= r.y && pointer.y < r.y + r.h;

  const cycle = (list, value, dir) => list[(list.indexOf(value) + dir + list.length) % list.length];
  const save = () => HA.saveSettings();

  function option(label, list, names, getter, setter) {
    return {
      label,
      value: () => names[list.indexOf(getter())],
      change: (dir) => {
        setter(cycle(list, getter(), dir));
        save();
      },
    };
  }
  function volume(label, keyName) {
    return {
      label,
      value: () => String(S[keyName]),
      bar: () => S[keyName] / 10,
      change: (dir) => {
        S[keyName] = HA.clamp(S[keyName] + dir, 0, 10);
        HA.audio.applyVolumes();
        save();
      },
    };
  }

  function settingsMenu() {
    return {
      title: 'SETTINGS',
      items: [
        option('DISPLAY', [false, true], ['WINDOWED', 'FULLSCREEN'], () => S.fullscreen, (v) => HA.display.setFullscreen(v)),
        option('SCALING', ['pixel', 'fill'], ['PIXEL PERFECT', 'FILL WINDOW'], () => S.scaling, (v) => {
          S.scaling = v;
          HA.display.resize(true);
        }),
        option('SCREEN SHAKE', ['full', 'reduced', 'off'], ['FULL', 'REDUCED', 'OFF'], () => S.shake, (v) => (S.shake = v)),
        option('FLASHING', ['full', 'reduced'], ['FULL', 'REDUCED'], () => S.flashes, (v) => (S.flashes = v)),
        option('FIRE BUTTON', ['hold', 'toggle'], ['HOLD', 'TOGGLE'], () => S.held, (v) => (S.held = v)),
        option('TEXT SPEED', ['slow', 'normal', 'fast', 'instant'], ['SLOW', 'NORMAL', 'FAST', 'INSTANT'], () => S.textSpeed, (v) => (S.textSpeed = v)),
        volume('MUSIC', 'music'),
        volume('SOUND', 'sfx'),
        option('SHOW FPS', [false, true], ['OFF', 'ON'], () => S.fps, (v) => (S.fps = v)),
        { label: 'BACK', action: pop },
      ],
      sel: 0,
    };
  }

  function controlsMenu() {
    return { title: 'CONTROLS', controls: true, items: [{ label: 'BACK', action: pop }], sel: 0 };
  }

  function titleMenu() {
    const saved = HA.save.exists();
    const items = [];
    if (saved) items.push({ label: 'CONTINUE', action: continueGame });
    items.push({ label: 'NEW GAME', action: () => (saved ? push(confirmMenu('START A NEW GAME?', 'YOUR SAVE WILL BE REPLACED.', newGame)) : newGame()) });
    items.push({ label: 'SETTINGS', action: () => push(settingsMenu()) });
    items.push({ label: 'CONTROLS', action: () => push(controlsMenu()) });
    if (HA.desktop) items.push({ label: 'QUIT', action: () => HA.desktop.quit() });
    return { title: null, items, sel: 0, root: true, endings: HA.save.endings() };
  }

  function confirmMenu(title, note, yes) {
    return { title, note, items: [{ label: 'NO', action: pop }, { label: 'YES', action: yes }], sel: 0 };
  }

  function pauseMenu() {
    const world = ui.world;
    const items = [{ label: 'RESUME', action: resume }];
    if (world.scene && world.scene.skippable) items.push({ label: 'SKIP SCENE', action: skipScene });
    items.push({ label: 'MAP', action: () => push(screen('map')) });
    items.push({ label: 'JOURNAL', action: () => push(screen('journal')) });
    items.push({ label: 'SETTINGS', action: () => push(settingsMenu()) });
    items.push({ label: 'CONTROLS', action: () => push(controlsMenu()) });
    items.push({ label: 'QUIT TO TITLE', action: toTitle });
    return { title: 'PAUSED', lead: world.state.lead, note: 'PLAY TIME ' + HA.clock(world.state.time), items, sel: 0, pause: true };
  }

  function screen(tab) {
    return { screen: HA.mapscreen.create(ui.world, tab), items: [], sel: 0 };
  }

  function push(menu) {
    ui.stack.push(menu);
  }
  function pop() {
    if (ui.stack.length > 1 || ui.mode === 'play') {
      ui.stack.pop();
      HA.audio.play('menuBack');
    }
    if (ui.mode === 'play' && !ui.stack.length) HA.audio.setPaused(false);
  }
  // Keys still held from the menu don't fire again: a press only counts on the way down.
  function resume() {
    ui.stack = [];
    HA.audio.setPaused(false);
  }
  function skipScene() {
    HA.scenes.skip(ui.world);
    resume();
  }
  function begin(state) {
    ui.world = HA.world.create(state);
    ui.mode = 'play';
    ui.stack = [];
    HA.audio.setPaused(false);
  }
  function newGame() {
    HA.save.clear();
    begin(HA.save.newState());
  }
  function continueGame() {
    const state = HA.save.load();
    if (state) begin(state);
    else newGame();
  }
  function toTitle() {
    if (ui.world && !ui.world.state.fresh) HA.save.write(ui.world);
    ui.mode = 'title';
    ui.world = null;
    ui.stack = [titleMenu()];
    HA.audio.setPaused(false);
    HA.audio.charge(0);
    HA.music.bloomVoice = false;
    HA.music.play('title');
  }

  ui.pause = () => {
    if (ui.mode === 'play' && !ui.stack.length) {
      push(pauseMenu());
      HA.audio.setPaused(true);
      HA.audio.charge(0);
    }
  };

  // Held directions repeat after a short delay, for quick menu travel.
  function navPressed(input, dir) {
    if (input.pressed[dir]) {
      ui.nav[dir] = 1;
      return true;
    }
    if (!input.held[dir]) {
      ui.nav[dir] = 0;
      return false;
    }
    const n = ui.nav[dir]++;
    return n > 18 && (n - 18) % 5 === 0;
  }

  function updateMenu(input) {
    const m = ui.stack[ui.stack.length - 1];
    if (m.screen) {
      if (HA.mapscreen.update(m.screen, input, pointer) === 'close') {
        ui.stack.pop();
        HA.audio.play('menuBack');
        if (ui.mode === 'play' && !ui.stack.length) HA.audio.setPaused(false);
      }
      return;
    }
    if (navPressed(input, 'up')) {
      m.sel = (m.sel - 1 + m.items.length) % m.items.length;
      HA.audio.play('menuMove');
    }
    if (navPressed(input, 'down')) {
      m.sel = (m.sel + 1) % m.items.length;
      HA.audio.play('menuMove');
    }
    // The pointer picks the row under it; a click on a row is the same as confirming it.
    const hit = m.items.findIndex((it) => inside(it.rect));
    if (pointer.moved && hit >= 0 && hit !== m.sel) {
      m.sel = hit;
      HA.audio.play('menuMove');
    }
    if (pointer.wheel) {
      m.sel = HA.clamp(m.sel + pointer.wheel, 0, m.items.length - 1);
      HA.audio.play('menuMove');
    }
    let clicked = false;
    if (pointer.click && hit >= 0) {
      m.sel = hit;
      clicked = true;
    }
    const item = m.items[m.sel];
    if (clicked && item.change && !item.action) {
      // A click on the left half of a setting's value steps it back; anywhere else steps it on.
      const v = item.valueRect;
      item.change(v && pointer.x >= v.x - 4 && pointer.x < v.x + v.w / 2 ? -1 : 1);
      HA.audio.play('menuMove');
      return;
    }
    if (pointer.back) {
      if (m.pause) resume();
      else pop();
      return;
    }
    for (const [dir, d] of [
      ['left', -1],
      ['right', 1],
    ]) {
      if (navPressed(input, dir) && item.change) {
        item.change(d);
        HA.audio.play('menuMove');
      }
    }
    if (input.pressed.confirm || clicked) {
      if (item.action) {
        HA.audio.play('menuOk');
        item.action();
      } else if (item.change) {
        item.change(1);
        HA.audio.play('menuMove');
      }
    } else if (input.pressed.back || (m.pause && input.pressed.pause && !input.pressed.confirm)) {
      if (m.pause) resume();
      else pop();
    }
  }

  ui.update = () => {
    const input = HA.input;
    ui.time++;
    const done = () => {
      pointer.moved = pointer.click = pointer.back = false;
      pointer.wheel = 0;
    };
    if (ui.stack.length) {
      updateMenu(input);
      done();
      return;
    }
    // Outside menus a click moves dialogue on, and a right click pauses.
    if (pointer.click) input.pressed.confirm = true;
    if (pointer.back && ui.mode === 'play') {
      done();
      ui.pause();
      return;
    }
    done();
    if (ui.mode === 'play') {
      const world = ui.world;
      // Enter both pauses and confirms; while someone is talking it confirms.
      const step = world.scene && world.scene.step;
      const talking = step && (step.say !== undefined || step.choice || step.card);
      if (input.pressed.pause && !(talking && input.pressed.confirm)) {
        ui.pause();
        return;
      }
      if (input.pressed.map && !world.scene && !world.transition && !world.player.dead) {
        push(screen('map'));
        HA.audio.setPaused(true);
        HA.audio.charge(0);
        HA.audio.play('menuOk');
        return;
      }
      HA.world.update(world, input);
      if (world.exitToTitle) toTitle(); // an ending has played to its last card
    }
  };

  // ---- Drawing ----
  function drawTitleBackground(g) {
    HA.art.drawStars(g, W, H, ui.time);
    HA.art.drawArk(g, 220 + Math.sin(ui.time * 0.01) * 2, 96 + Math.sin(ui.time * 0.013) * 2, 1, ui.time);
  }

  function drawPanel(g, x, y, w, h) {
    g.fillStyle = 'rgba(5,6,13,0.92)';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#3a4258';
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h);
    g.fillRect(x + w - 1, y, 1, h);
  }

  function drawMenu(g, m) {
    if (m.screen) return HA.mapscreen.draw(m.screen, g);
    if (m.controls) return drawControls(g, m);
    const rowH = 12;
    const hasValues = m.items.some((it) => it.value);
    const extra = (m.lead ? 22 : 0) + (m.note ? 12 : 0);
    const pw = hasValues ? 240 : m.lead || m.note ? 284 : 140;
    const ph = m.items.length * rowH + (m.title ? 30 : 14) + extra;
    const px = Math.round(W / 2 - pw / 2);
    const py = m.root ? 96 : Math.round(H / 2 - ph / 2);
    if (!m.root) drawPanel(g, px, py, pw, ph);
    let y = py + 8;
    if (m.title) {
      HA.font.draw(g, m.title, W / 2, y, '#ffb84d', { align: 'center' });
      y += 18;
    }
    if (m.lead) {
      HA.font.draw(g, 'LEAD', W / 2, y - 4, '#6c7894', { align: 'center' });
      HA.font.draw(g, m.lead, W / 2, y + 6, '#fff0a8', { align: 'center' });
      y += 22;
    }
    if (m.note) {
      HA.font.draw(g, m.note, W / 2, y - 4, '#9fb6c8', { align: 'center' });
      y += 12;
    }
    m.items.forEach((it, i) => {
      const sel = i === m.sel;
      const color = sel ? '#fff0a8' : '#9fb6c8';
      it.rect = { x: px + 4, y: y - 3, w: pw - 8, h: rowH };
      if (hasValues && it.value) {
        HA.font.draw(g, it.label, px + 16, y, color);
        const v = it.value();
        if (it.bar) {
          const bx = px + pw - 76;
          for (let k = 0; k < 10; k++) {
            g.fillStyle = k < it.bar() * 10 ? (sel ? '#ffb84d' : '#6c7894') : '#262e44';
            g.fillRect(bx + k * 5, y + 1, 4, 5);
          }
          HA.font.draw(g, v, px + pw - 16, y, color, { align: 'right' });
          it.valueRect = { x: bx, w: px + pw - 16 - bx };
        } else {
          const text = '< ' + v + ' >';
          HA.font.draw(g, sel ? text : v, px + pw - 16, y, color, { align: 'right' });
          const tw = HA.font.measure(text);
          it.valueRect = { x: px + pw - 16 - tw, w: tw };
        }
        if (sel) HA.font.draw(g, '>', px + 7, y, '#ffb84d');
      } else {
        HA.font.draw(g, it.label, W / 2, y, color, { align: 'center' });
        if (sel) {
          const lw = HA.font.measure(it.label);
          HA.font.draw(g, '>', W / 2 - lw / 2 - 9, y, '#ffb84d');
          HA.font.draw(g, '<', W / 2 + lw / 2 + 4, y, '#ffb84d');
        }
      }
      y += rowH;
    });
  }

  function drawControls(g, m) {
    const pw = 300;
    const ph = 174;
    const px = Math.round(W / 2 - pw / 2);
    const py = Math.round(H / 2 - ph / 2);
    drawPanel(g, px, py, pw, ph);
    HA.font.draw(g, 'CONTROLS', W / 2, py + 7, '#ffb84d', { align: 'center' });
    const rows = [
      ['MOVE', 'ARROWS / WASD', 'STICK / D-PAD'],
      ['JUMP', 'Z / SPACE / J', 'A'],
      ['FIRE', 'X / K', 'X / B / RT'],
      ['AIM', 'UP / DOWN IN AIR', 'STICK / D-PAD'],
      ['WEAPON', 'Q E  (OR C V)', 'LB / RB'],
      ['EAT A BLOOM BULB', 'F / L', 'Y'],
      ['DROP DOWN', 'DOWN + JUMP', 'DOWN + A'],
      ['TALK, READ, REST', 'UP', 'UP'],
      ['CLIMB DOWN', 'DOWN', 'DOWN'],
      ['THRUSTER, IN AIR', 'JUMP AGAIN, HOLD', 'A AGAIN, HOLD'],
      ['MAP, JOURNAL', 'TAB / M', 'VIEW / BACK'],
      ['PAUSE', 'ESC / ENTER / P', 'START'],
      ['FULLSCREEN', 'ALT+ENTER' + (HA.desktop ? ' / F11' : ''), 'SETTINGS MENU'],
    ];
    HA.font.draw(g, 'KEYBOARD', px + 104, py + 21, '#6c7894');
    HA.font.draw(g, 'CONTROLLER', px + 206, py + 21, '#6c7894');
    rows.forEach((r, i) => {
      const y = py + 32 + i * 10;
      HA.font.draw(g, r[0], px + 8, y, '#9fb6c8');
      HA.font.draw(g, r[1], px + 104, y, '#eef4f6');
      HA.font.draw(g, r[2], px + 206, y, '#eef4f6');
    });
    HA.font.draw(g, '> BACK <', W / 2, py + ph - 12, '#fff0a8', { align: 'center' });
    m.items[0].rect = { x: px, y: py, w: pw, h: ph };
  }

  ui.draw = (g) => {
    // Whatever sits under a menu is dimmed and kept free of text, so nothing shows through it.
    if (ui.mode === 'play' && ui.world) {
      HA.world.draw(ui.world, g, ui.stack.length > 0);
      if (ui.stack.length) {
        g.fillStyle = 'rgba(5,6,13,0.72)';
        g.fillRect(0, 0, W, H);
      }
    } else {
      drawTitleBackground(g);
      if (ui.stack.length <= 1) {
        HA.font.draw(g, 'HOLLOW ARK', W / 2, 30, '#eef4f6', { align: 'center', scale: 3, shadow: '#2f5fb3' });
        HA.font.draw(g, 'PHASE 3 · IN PROGRESS', W / 2, 62, '#ffb84d', { align: 'center' });
      } else {
        g.fillStyle = 'rgba(5,6,13,0.72)';
        g.fillRect(0, 0, W, H);
      }
    }
    const top = ui.stack[ui.stack.length - 1];
    if (top) drawMenu(g, top);
    if (top && !top.screen) {
      const hint = top.root ? '{confirm} SELECT' : '{confirm} SELECT   {back} BACK';
      HA.font.draw(g, hint, W / 2, H - 12, '#6c7894', { align: 'center' });
    }
    if (ui.mode === 'title' && ui.stack.length <= 1) {
      const seen = ui.stack[0] && ui.stack[0].endings;
      if (seen && seen.length) HA.font.draw(g, HA.endings.seenLine(seen), W / 2, 74, '#6c7894', { align: 'center' });
      HA.font.draw(g, 'V' + HA.VERSION, 4, H - 10, '#3a4258');
      HA.font.draw(g, HA.display.platformName(), W - 4, H - 10, '#3a4258', { align: 'right' });
    }
  };

  ui.toTitle = toTitle;
  ui.newGame = newGame;
  ui.continueGame = continueGame;
  ui.stack.push(titleMenu());
  HA.music.play('title');
  HA.ui = ui;
})(window.HA);
