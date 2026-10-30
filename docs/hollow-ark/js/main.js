'use strict';
// Boot, the fixed-step game loop, window scaling and fullscreen.
(function (HA) {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  const buffer = HA.art.canvas(HA.VIEW_W, HA.VIEW_H);
  const g = buffer.getContext('2d');
  const view = { s: 1, w: HA.VIEW_W, h: HA.VIEW_H, ox: 0, oy: 0, dpr: 0, cw: 0, ch: 0 };

  // The game draws at 320x180 and is scaled up. Sizes are worked out in device pixels, so pixels stay
  // square and sharp on Retina MacBooks and on Windows and Linux displays scaled to 125% or 150%.
  function resize(force) {
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(window.innerWidth * dpr));
    const ch = Math.max(1, Math.round(window.innerHeight * dpr));
    if (!force && dpr === view.dpr && cw === view.cw && ch === view.ch) return;
    Object.assign(view, { dpr, cw, ch });
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const fit = Math.min(cw / HA.VIEW_W, ch / HA.VIEW_H);
    view.s = HA.settings.scaling === 'fill' ? fit : Math.max(1, Math.floor(fit));
    view.w = Math.round(HA.VIEW_W * view.s);
    view.h = Math.round(HA.VIEW_H * view.s);
    view.ox = Math.floor((cw - view.w) / 2);
    view.oy = Math.floor((ch - view.h) / 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);
  }

  function present() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, view.ox, view.oy, view.w, view.h);
  }

  // ---- Fullscreen: the desktop app asks the window; the browser uses the Fullscreen API ----
  const docFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const isMac = () => /mac/i.test((HA.desktop && HA.desktop.platform) || navigator.platform || '');

  function setFullscreen(on) {
    HA.settings.fullscreen = on;
    HA.saveSettings();
    if (HA.desktop) {
      HA.desktop.setFullscreen(on);
      return;
    }
    const el = document.documentElement;
    try {
      if (on && !docFull()) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        const p = req && req.call(el);
        if (p && p.catch) p.catch(() => fullscreenRefused());
        else if (!req) fullscreenRefused();
      } else if (!on && docFull()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    } catch (e) {
      fullscreenRefused();
    }
  }

  // Browsers only allow fullscreen right after a key press, not a controller button.
  function fullscreenRefused() {
    HA.settings.fullscreen = docFull();
    if (HA.ui.world) HA.ui.world.toast(isMac() ? 'PRESS CTRL+CMD+F FOR FULLSCREEN' : 'PRESS F11 FOR FULLSCREEN', 200);
  }

  const onFullscreenChange = () => {
    HA.settings.fullscreen = docFull();
    HA.saveSettings();
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  function platformName() {
    const p = ((HA.desktop && HA.desktop.platform) || (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '').toLowerCase();
    const os = /win/.test(p) ? 'WINDOWS' : /mac|darwin/.test(p) ? 'MACOS' : /linux|x11|cros/.test(p) ? 'LINUX' : 'WEB';
    return (HA.desktop ? 'DESKTOP' : 'BROWSER') + ' · ' + os;
  }

  HA.display = { resize, setFullscreen, platformName, view };
  HA.input.onFullscreenKey = () => setFullscreen(!HA.settings.fullscreen);

  if (HA.desktop) {
    if (HA.desktop.onFullscreenChange) {
      HA.desktop.onFullscreenChange((on) => {
        HA.settings.fullscreen = on;
        HA.saveSettings();
      });
    }
    if (HA.settings.fullscreen) HA.desktop.setFullscreen(true);
  } else {
    HA.settings.fullscreen = docFull(); // a browser can't start in fullscreen by itself
  }

  // ---- Pause when the window loses focus; hide the mouse pointer when it isn't moving ----
  window.addEventListener('blur', () => HA.ui.pause());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) HA.ui.pause();
  });
  let cursorTimer = 0;
  window.addEventListener('mousemove', () => {
    document.body.classList.remove('hide-cursor');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => document.body.classList.add('hide-cursor'), 1500);
  });
  document.body.classList.add('hide-cursor');
  window.addEventListener('pointerdown', () => HA.audio.unlock());

  // Errors are drawn on screen so a tester can report them.
  let lastError = '';
  window.addEventListener('error', (e) => {
    lastError = String(e.message || e.error || 'error').slice(0, 60);
  });

  // ---- Fixed 60 updates per second, whatever the display's refresh rate ----
  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let fps = 60;
  let fpsTime = last;
  let fpsCount = 0;
  let readySent = false;

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (Math.abs(dt - HA.STEP) < 0.002) dt = HA.STEP; // a 60 Hz display gets exactly one update per frame
    acc += dt;
    resize(false);
    HA.input.poll();
    let steps = 0;
    while (acc >= HA.STEP - 0.0005 && steps < 4) {
      HA.input.update();
      HA.ui.update();
      acc -= HA.STEP;
      steps++;
    }
    if (steps === 4) acc = 0;

    HA.ui.draw(g);
    if (HA.settings.fps) HA.font.draw(g, fps + ' FPS', HA.VIEW_W - 4, HA.VIEW_H - 20, '#7ad1a0', { align: 'right' });
    if (lastError) HA.font.draw(g, 'ERROR: ' + lastError, 4, HA.VIEW_H - 20, '#ff8a8a');
    present();

    fpsCount++;
    if (now - fpsTime >= 500) {
      fps = Math.round((fpsCount * 1000) / (now - fpsTime));
      fpsTime = now;
      fpsCount = 0;
    }
    frames++;
    // Tells the desktop app's launch check that the game booted and is drawing.
    if (!readySent && frames >= 30 && HA.desktop && HA.desktop.ready) {
      readySent = true;
      HA.desktop.ready({ frames, error: lastError, view: [view.cw, view.ch, view.s], audio: !!window.AudioContext });
    }
    requestAnimationFrame(frame);
  }

  resize(true);
  requestAnimationFrame((t) => {
    last = t;
    requestAnimationFrame(frame);
  });
  canvas.focus();
  // Helpers for the automated checks (and for testers who open the browser console).
  HA.debug = {
    get world() {
      return HA.ui.world;
    },
    view,
    get frames() {
      return frames;
    },
    // Run the game forward n updates at once, with these actions held (for scripted playthroughs).
    step(n, hold = {}) {
      HA.input.force = hold;
      for (let i = 0; i < n; i++) {
        HA.input.update();
        HA.ui.update();
      }
      HA.input.force = null;
    },
    skipScene() {
      const w = HA.ui.world;
      if (w && w.scene) HA.scenes.skip(w);
    },
    goto(room, tx, ty) {
      const w = HA.ui.world;
      w.enterRoom(room, tx * 8, ty * 8 + 8 - w.player.h);
    },
    // Play an ending from wherever the game is, with the save as it stands.
    ending(id) {
      HA.endings.run(HA.ui.world, id);
    },
  };
})(window.HA);
