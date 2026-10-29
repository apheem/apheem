'use strict';
// Title screen, pause menu, settings and controls. Everything is reachable with keyboard or controller alone.
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const S = HA.settings;

  const ui = { mode: 'title', stack: [], world: null, time: 0, nav: { up: 0, down: 0, left: 0, right: 0 } };

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
    const items = [
      { label: 'START', action: startGame },
      { label: 'SETTINGS', action: () => push(settingsMenu()) },
      { label: 'CONTROLS', action: () => push(controlsMenu()) },
    ];
    if (HA.desktop) items.push({ label: 'QUIT', action: () => HA.desktop.quit() });
    return { title: null, items, sel: 0, root: true };
  }

  function pauseMenu() {
    return {
      title: 'PAUSED',
      items: [
        { label: 'RESUME', action: resume },
        { label: 'SETTINGS', action: () => push(settingsMenu()) },
        { label: 'CONTROLS', action: () => push(controlsMenu()) },
        { label: 'RESTART ROOM', action: startGame },
        { label: 'QUIT TO TITLE', action: toTitle },
      ],
      sel: 0,
      pause: true,
    };
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
  function startGame() {
    ui.world = HA.world.create();
    ui.mode = 'play';
    ui.stack = [];
    HA.audio.setPaused(false);
  }
  function toTitle() {
    ui.mode = 'title';
    ui.world = null;
    ui.stack = [titleMenu()];
    HA.audio.setPaused(false);
    HA.audio.charge(0);
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
    if (navPressed(input, 'up')) {
      m.sel = (m.sel - 1 + m.items.length) % m.items.length;
      HA.audio.play('menuMove');
    }
    if (navPressed(input, 'down')) {
      m.sel = (m.sel + 1) % m.items.length;
      HA.audio.play('menuMove');
    }
    const item = m.items[m.sel];
    for (const [dir, d] of [
      ['left', -1],
      ['right', 1],
    ]) {
      if (navPressed(input, dir) && item.change) {
        item.change(d);
        HA.audio.play('menuMove');
      }
    }
    if (input.pressed.confirm) {
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
    if (HA.audio.ready) HA.audio.startMusic();
    if (ui.stack.length) {
      updateMenu(input);
      return;
    }
    if (ui.mode === 'play') {
      if (input.pressed.pause) {
        ui.pause();
        return;
      }
      HA.world.update(ui.world, input);
    }
  };

  // ---- Drawing ----
  const stars = (() => {
    const rnd = HA.seeded(3);
    return Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, z: rnd() }));
  })();

  function drawTitleBackground(g) {
    g.fillStyle = '#04050b';
    g.fillRect(0, 0, W, H);
    for (const s of stars) {
      const x = (s.x - ui.time * (0.05 + s.z * 0.2)) % W;
      g.fillStyle = s.z > 0.8 ? '#ffffff' : s.z > 0.4 ? '#8aa0c8' : '#3b4a72';
      g.fillRect(Math.floor(x < 0 ? x + W : x), Math.floor(s.y), 1, 1);
    }
    // The Ark, drifting
    const ox = 214 + Math.round(Math.sin(ui.time * 0.01) * 2);
    const oy = 104 + Math.round(Math.sin(ui.time * 0.013) * 2);
    g.fillStyle = '#161b2b';
    g.fillRect(ox, oy, 84, 12);
    g.fillRect(ox + 10, oy - 6, 50, 6);
    g.fillRect(ox + 60, oy + 12, 18, 5);
    g.fillRect(ox - 10, oy + 3, 10, 6);
    g.fillStyle = '#262e44';
    g.fillRect(ox, oy, 84, 1);
    g.fillRect(ox + 10, oy - 6, 50, 1);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = (i + Math.floor(ui.time / 40)) % 7 === 0 ? '#ffb84d' : '#2a3a5a';
      g.fillRect(ox + 6 + i * 8, oy + 5, 3, 2);
    }
    g.fillStyle = Math.floor(ui.time / 30) % 2 ? '#f27ad8' : '#5c2479';
    g.fillRect(ox + 34, oy - 4, 4, 3);
    g.fillStyle = '#5fd4e8';
    g.fillRect(ox + 84, oy + 4, 2, 4);
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
    if (m.controls) return drawControls(g, m);
    const rowH = 12;
    const hasValues = m.items.some((it) => it.value);
    const pw = hasValues ? 240 : 140;
    const ph = m.items.length * rowH + (m.title ? 30 : 14);
    const px = Math.round(W / 2 - pw / 2);
    const py = m.root ? 96 : Math.round(H / 2 - ph / 2);
    if (!m.root) drawPanel(g, px, py, pw, ph);
    let y = py + 8;
    if (m.title) {
      HA.font.draw(g, m.title, W / 2, y, '#ffb84d', { align: 'center' });
      y += 18;
    }
    m.items.forEach((it, i) => {
      const sel = i === m.sel;
      const color = sel ? '#fff0a8' : '#9fb6c8';
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
        } else {
          HA.font.draw(g, sel ? '< ' + v + ' >' : v, px + pw - 16, y, color, { align: 'right' });
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
    const pw = 296;
    const ph = 146;
    const px = Math.round(W / 2 - pw / 2);
    const py = Math.round(H / 2 - ph / 2);
    drawPanel(g, px, py, pw, ph);
    HA.font.draw(g, 'CONTROLS', W / 2, py + 8, '#ffb84d', { align: 'center' });
    const rows = [
      ['MOVE', 'ARROWS / WASD', 'STICK / D-PAD'],
      ['JUMP', 'Z / SPACE / J', 'A'],
      ['FIRE', 'X / K', 'X / B / RT'],
      ['AIM', 'UP / DOWN IN AIR', 'STICK / D-PAD'],
      ['WEAPON', 'Q E  (OR C V)', 'LB / RB'],
      ['DROP DOWN', 'DOWN + JUMP', 'DOWN + A'],
      ['REST', 'UP AT A REST POD', 'UP AT A REST POD'],
      ['PAUSE', 'ESC / ENTER / P', 'START / BACK'],
      ['FULLSCREEN', 'ALT+ENTER' + (HA.desktop ? ' / F11' : ''), 'SETTINGS MENU'],
    ];
    HA.font.draw(g, 'KEYBOARD', px + 86, py + 24, '#6c7894');
    HA.font.draw(g, 'CONTROLLER', px + 196, py + 24, '#6c7894');
    rows.forEach((r, i) => {
      const y = py + 35 + i * 10;
      HA.font.draw(g, r[0], px + 8, y, '#9fb6c8');
      HA.font.draw(g, r[1], px + 86, y, '#eef4f6');
      HA.font.draw(g, r[2], px + 196, y, '#eef4f6');
    });
    HA.font.draw(g, '> BACK <', W / 2, py + ph - 13, '#fff0a8', { align: 'center' });
  }

  ui.draw = (g) => {
    if (ui.mode === 'play' && ui.world) {
      HA.world.draw(ui.world, g);
      if (ui.stack.length) {
        g.fillStyle = 'rgba(5,6,13,0.55)';
        g.fillRect(0, 0, W, H);
      }
    } else {
      drawTitleBackground(g);
      if (ui.stack.length <= 1) {
        HA.font.draw(g, 'HOLLOW ARK', W / 2, 30, '#eef4f6', { align: 'center', scale: 3, shadow: '#2f5fb3' });
        HA.font.draw(g, 'PHASE 1 · FEEL PROTOTYPE', W / 2, 62, '#ffb84d', { align: 'center' });
      }
    }
    if (ui.stack.length) drawMenu(g, ui.stack[ui.stack.length - 1]);
    if (ui.stack.length) {
      const m = ui.stack[ui.stack.length - 1];
      const hint = m.root ? '{confirm} SELECT' : '{confirm} SELECT   {back} BACK';
      HA.font.draw(g, hint, W / 2, H - 12, '#6c7894', { align: 'center' });
    }
    if (ui.mode === 'title') {
      HA.font.draw(g, 'V' + HA.VERSION, 4, H - 10, '#3a4258');
      HA.font.draw(g, HA.display.platformName(), W - 4, H - 10, '#3a4258', { align: 'right' });
    }
  };

  ui.toTitle = toTitle;
  ui.startGame = startGame;
  ui.stack.push(titleMenu());
  HA.ui = ui;
})(window.HA);
