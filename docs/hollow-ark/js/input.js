'use strict';
// Keyboard and controller input. No mouse needed anywhere.
// Keys are read by physical position (event.code), so WASD and Z/X sit in the same place on AZERTY, QWERTZ and other layouts.
(function (HA) {
  const KEYS = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['KeyZ', 'Space', 'KeyJ'],
    fire: ['KeyX', 'KeyK'],
    grapple: ['KeyC', 'KeyI'], // the harpoon's line, whatever weapon is in hand
    prev: ['KeyQ', 'KeyU'],
    next: ['KeyE', 'KeyO'],
    item: ['KeyF', 'KeyL'], // eat a Bloom bulb: always a deliberate press of its own button
    pause: ['Escape', 'Enter', 'KeyP'],
    map: ['Tab', 'KeyM'],
    confirm: ['Enter', 'Space', 'KeyZ', 'KeyJ'],
    back: ['Escape', 'Backspace', 'KeyX', 'KeyK'],
  };
  // Standard gamepad layout (Xbox naming): 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 12-15 D-pad.
  const PAD = {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0],
    fire: [2, 1, 7],
    grapple: [6],
    prev: [4],
    next: [5],
    item: [3],
    pause: [9],
    map: [8],
    confirm: [0],
    back: [1],
  };
  const ACTIONS = Object.keys(KEYS);
  const GAME_KEYS = new Set([].concat(...Object.values(KEYS)).concat(['Tab']));

  const keysDown = new Set();
  const tapped = {};
  const untapped = {};
  let padHeld = {};
  let prevHeld = {};
  const held = {};
  const pressed = {};
  const released = {};

  const input = {
    held,
    pressed,
    released,
    device: 'keyboard',
    padType: 'xbox',
    padName: '',
    layout: null,
    onFullscreenKey: null,
    onDeviceChange: null,
  };

  function setDevice(device) {
    if (input.device !== device) {
      input.device = device;
      if (input.onDeviceChange) input.onDeviceChange(device);
    }
  }

  window.addEventListener('keydown', (e) => {
    // Alt+Enter toggles fullscreen (the usual shortcut on Windows and Linux); F11 too in the desktop app.
    if ((e.altKey && e.code === 'Enter') || (e.code === 'F11' && HA.desktop)) {
      e.preventDefault();
      if (!e.repeat && input.onFullscreenKey) input.onFullscreenKey();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser and OS shortcuts alone
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    HA.audio.unlock();
    setDevice('keyboard');
    if (e.repeat) return;
    keysDown.add(e.code);
    for (const a of ACTIONS) if (KEYS[a].includes(e.code)) tapped[a] = true;
  });

  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
    // macOS drops keyup events for keys pressed while Cmd is held, so release everything with Cmd.
    if (e.code === 'MetaLeft' || e.code === 'MetaRight') keysDown.clear();
    for (const a of ACTIONS) if (KEYS[a].includes(e.code)) untapped[a] = true;
  });

  // Releasing everything on focus loss stops keys from sticking after Alt+Tab or Cmd+Tab.
  const releaseAll = () => {
    keysDown.clear();
    padHeld = {};
  };
  window.addEventListener('blur', releaseAll);

  window.addEventListener('gamepadconnected', (e) => {
    input.padName = e.gamepad.id;
    input.padType = padTypeOf(e.gamepad.id);
    if (input.onPadConnected) input.onPadConnected(e.gamepad);
  });

  function padTypeOf(id) {
    if (/playstation|dualshock|dualsense|sony|054c/i.test(id)) return 'ps';
    if (/nintendo|switch|pro controller|joy-con|057e/i.test(id)) return 'nintendo';
    return 'xbox'; // Xbox, Steam Deck, Steam Controller and most others use A/B/X/Y
  }

  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const next = {};
    let active = false;
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const btn = (i) => !!pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5);
      for (const a of ACTIONS) if (PAD[a].some(btn)) next[a] = true;
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      if (ax < -0.4) next.left = true;
      if (ax > 0.4) next.right = true;
      if (ay < -0.5) next.up = true;
      if (ay > 0.5) next.down = true;
      // Controllers without the standard layout (some on Linux and macOS) often report the D-pad as axes 6/7.
      if (pad.mapping !== 'standard' && pad.axes.length > 7) {
        if (pad.axes[6] < -0.5) next.left = true;
        if (pad.axes[6] > 0.5) next.right = true;
        if (pad.axes[7] < -0.5) next.up = true;
        if (pad.axes[7] > 0.5) next.down = true;
      }
      if (pad.buttons.some((b) => b && b.pressed) || Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5) {
        active = true;
        input.padType = padTypeOf(pad.id);
        input.padName = pad.id;
      }
    }
    if (active) {
      setDevice('gamepad');
      HA.audio.unlock();
    }
    padHeld = next;
  }

  // Called once per frame before the fixed updates.
  input.poll = () => pollPad();

  // Called once per fixed update. A tap shorter than one update still counts as pressed and released.
  input.update = () => {
    for (const a of ACTIONS) {
      const keyHeld = KEYS[a].some((k) => keysDown.has(k));
      held[a] = keyHeld || !!padHeld[a] || !!(input.force && input.force[a]);
      pressed[a] = !!tapped[a] || (held[a] && !prevHeld[a]);
      released[a] = (!held[a] && !!prevHeld[a]) || (!!untapped[a] && !held[a] && !!tapped[a]);
      tapped[a] = false;
      untapped[a] = false;
      prevHeld[a] = held[a];
    }
  };

  input.clear = () => {
    releaseAll();
    for (const a of ACTIONS) {
      tapped[a] = untapped[a] = false;
      held[a] = pressed[a] = released[a] = false;
    }
    prevHeld = {};
  };

  // ---- On-screen prompts that follow the last device used ----
  // Read the keyboard layout where the browser allows it (Chromium), so a German keyboard shows Y for the Z position.
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard
      .getLayoutMap()
      .then((map) => (input.layout = map))
      .catch(() => {});
  }

  const KEY_NAMES = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'SPACE',
    Enter: 'ENTER',
    Escape: 'ESC',
    Backspace: 'BKSP',
    Tab: 'TAB',
  };
  function keyLabel(code) {
    if (KEY_NAMES[code]) return KEY_NAMES[code];
    const fromLayout = input.layout && input.layout.get(code);
    if (fromLayout && fromLayout.length === 1 && HA.font.hasGlyph(fromLayout)) return fromLayout.toUpperCase();
    return code.replace(/^Key|^Digit/, '');
  }

  // Which controller button each action shows, by layout position.
  const PAD_PROMPT = { jump: 'south', fire: 'west', grapple: 'lt', item: 'north', confirm: 'south', back: 'east', prev: 'lb', next: 'rb', pause: 'start', map: 'select', up: 'dup', down: 'ddown', left: 'dleft', right: 'dright' };
  const FACE = {
    xbox: { south: ['A', '#5bd16b'], east: ['B', '#e8434f'], west: ['X', '#4a90e8'], north: ['Y', '#f2c84a'], lb: 'LB', rb: 'RB', lt: 'LT', start: 'MENU', select: 'VIEW' },
    ps: { south: ['×', '#7aa7ff'], east: ['○', '#ff6b7a'], west: ['□', '#f27ad8'], north: ['△', '#5bd1a8'], lb: 'L1', rb: 'R1', lt: 'L2', start: 'OPTIONS', select: 'CREATE' },
    nintendo: { south: ['B', '#c9d6e8'], east: ['A', '#c9d6e8'], west: ['Y', '#c9d6e8'], north: ['X', '#c9d6e8'], lb: 'L', rb: 'R', lt: 'ZL', start: '+', select: '-' },
  };

  function promptSpec(action) {
    if (input.device === 'gamepad') {
      const pos = PAD_PROMPT[action];
      const face = FACE[input.padType][pos];
      if (Array.isArray(face)) return { kind: 'face', label: face[0], color: face[1], w: 9 };
      if (pos && pos[0] === 'd') return { kind: 'dpad', dir: pos.slice(1), w: 9 };
      return { kind: 'key', label: face || '?', w: HA.font.measure(face || '?') + 4 };
    }
    const label = keyLabel(KEYS[action][0]);
    return { kind: 'key', label, w: Math.max(9, HA.font.measure(label) + 4) };
  }

  input.promptWidth = (action) => promptSpec(action).w;

  input.drawPrompt = (ctx, action, x, y) => {
    const p = promptSpec(action);
    if (p.kind === 'face') {
      ctx.fillStyle = '#05060d';
      ctx.fillRect(x + 1, y + 1, 7, 8);
      ctx.fillRect(x, y + 2, 9, 6);
      ctx.fillStyle = p.color;
      ctx.fillRect(x + 2, y, 5, 9);
      ctx.fillRect(x + 1, y + 1, 7, 7);
      ctx.fillRect(x, y + 2, 9, 5);
      const glyphX = x + Math.round((9 - HA.font.measure(p.label)) / 2);
      HA.font.draw(ctx, p.label, glyphX, y + 1, '#05060d', { shadow: null });
      return;
    }
    if (p.kind === 'dpad') {
      ctx.fillStyle = '#c9d6e8';
      ctx.fillRect(x + 3, y, 3, 9);
      ctx.fillRect(x, y + 3, 9, 3);
      ctx.fillStyle = '#05060d';
      ctx.fillRect(x + 4, y + 4, 1, 1);
      ctx.fillStyle = '#ffb84d';
      if (p.dir === 'up') ctx.fillRect(x + 3, y, 3, 3);
      if (p.dir === 'down') ctx.fillRect(x + 3, y + 6, 3, 3);
      if (p.dir === 'left') ctx.fillRect(x, y + 3, 3, 3);
      if (p.dir === 'right') ctx.fillRect(x + 6, y + 3, 3, 3);
      return;
    }
    ctx.fillStyle = '#05060d';
    ctx.fillRect(x, y + 1, p.w, 9);
    ctx.fillStyle = '#c9d6e8';
    ctx.fillRect(x, y, p.w, 9);
    ctx.fillStyle = '#eef4f6';
    ctx.fillRect(x + 1, y + 1, p.w - 2, 7);
    HA.font.draw(ctx, p.label, x + Math.round((p.w - HA.font.measure(p.label)) / 2), y + 1, '#10121c', { shadow: null });
  };

  input.KEYS = KEYS;
  input.PAD = PAD;
  input.keyLabel = keyLabel;
  HA.input = input;
})(window.HA);
