'use strict';
// Desktop shell for Hollow Ark on Windows, macOS and Linux.
// It opens the same game files as the browser version (docs/hollow-ark), so every platform plays the same build.
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

const smokeTest = process.argv.includes('--smoke-test');
const smokeOutArg = process.argv.find((a) => a.startsWith('--smoke-test-out='));
const smokeOut = smokeOutArg ? smokeOutArg.slice('--smoke-test-out='.length) : null;

const gameDir = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..', '..', 'docs', 'hollow-ark');

if (!smokeTest && !app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    useContentSize: true,
    backgroundColor: '#05060d',
    title: 'Hollow Ark',
    autoHideMenuBar: true,
    show: false,
    icon: process.platform === 'linux' ? path.join(gameDir, 'icon.png') : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      spellcheck: false,
    },
  });

  // The game only ever shows its own local files.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => win.webContents.send('fullscreen:changed', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen:changed', false));
  win.on('closed', () => (win = null));

  if (smokeTest) watchSmokeTest(win);
  win.loadFile(path.join(gameDir, 'index.html'));
}

// macOS expects an app menu (Cmd+Q, Cmd+H, Ctrl+Cmd+F). Windows and Linux get no menu bar at all.
function setMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { label: 'View', submenu: [{ role: 'togglefullscreen' }] },
      { role: 'windowMenu' },
    ])
  );
}

ipcMain.handle('fullscreen:set', (e, on) => {
  if (win) win.setFullScreen(!!on);
  return win ? win.isFullScreen() : false;
});
ipcMain.handle('fullscreen:get', () => (win ? win.isFullScreen() : false));
ipcMain.on('app:quit', () => app.quit());

// ---- The save file: Windows %APPDATA%\Hollow Ark, macOS ~/Library/Application Support/Hollow Ark,
// Linux ~/.config/Hollow Ark. Written to a temporary file first, then renamed, so a crash mid-write
// never leaves a broken save. A launch check uses its own folder and never touches the player's save.
if (smokeTest) app.setPath('userData', path.join(app.getPath('temp'), 'hollow-ark-smoke-' + process.pid));
const saveFile = () => path.join(app.getPath('userData'), 'save1.json');
ipcMain.on('save:read', (e) => {
  try {
    e.returnValue = fs.readFileSync(saveFile(), 'utf8');
  } catch (err) {
    e.returnValue = null;
  }
});
ipcMain.on('save:write', (e, text) => {
  try {
    fs.mkdirSync(path.dirname(saveFile()), { recursive: true });
    if (!text) {
      fs.rmSync(saveFile(), { force: true });
      return;
    }
    const tmp = saveFile() + '.tmp';
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, saveFile());
  } catch (err) {
    console.error('Could not write the save: ' + err.message);
  }
});

// ---- Launch check, used by CI on each OS: boot the game, start a run, walk right, then exit ----
function watchSmokeTest(w) {
  const errors = [];
  const finish = (result) => {
    const ok = result.ok && errors.length === 0;
    const report = JSON.stringify({ ok, platform: process.platform, arch: process.arch, electron: process.versions.electron, errors, ...result });
    console.log('SMOKE ' + report);
    if (smokeOut) fs.writeFileSync(smokeOut, report);
    try {
      fs.rmSync(app.getPath('userData'), { recursive: true, force: true });
    } catch (err) {
      /* the OS cleans its temp folder eventually */
    }
    app.exit(ok ? 0 : 1);
  };
  const timeout = setTimeout(() => finish({ ok: false, reason: 'timed out waiting for the game to boot' }), 45000);
  w.webContents.on('console-message', (e, level, message) => {
    const lvl = e && e.level !== undefined ? e.level : level;
    const msg = e && e.message !== undefined ? e.message : message;
    if (lvl === 'error' || lvl === 3) errors.push(String(msg));
  });
  w.webContents.on('render-process-gone', (e, details) => finish({ ok: false, reason: 'renderer gone: ' + details.reason }));
  ipcMain.once('app:ready', async (e, info) => {
    clearTimeout(timeout);
    try {
      const js = (code) => w.webContents.executeJavaScript(code);
      const key = async (keyCode, ms) => {
        w.webContents.sendInputEvent({ type: 'keyDown', keyCode });
        await new Promise((r) => setTimeout(r, ms));
        w.webContents.sendInputEvent({ type: 'keyUp', keyCode });
        await new Promise((r) => setTimeout(r, 150));
      };
      if (process.platform === 'darwin') app.focus({ steal: true });
      w.focus();
      await js("window.__smokeKeys = []; addEventListener('keydown', (e) => __smokeKeys.push(e.code), true); true");
      await key('Enter', 120);
      const mode = await js('HA.ui.mode');
      // A new game opens on a short cutscene; skip it as a player can from the pause menu.
      await js('HA.debug.skipScene(); true');
      await new Promise((r) => setTimeout(r, 400));
      const playerX = () => js('HA.debug.world ? HA.debug.world.player.x : -1');
      // CI machines may not keep the window focused, and the game pauses when focus is lost, so keep resuming.
      const holdFor = async (ms) => {
        for (let t = 0; t < ms; t += 100) {
          await js('HA.ui.stack.length = 0; HA.audio.setPaused(false); true');
          await new Promise((r) => setTimeout(r, 100));
        }
      };
      const x0 = await playerX();
      // First through the OS input path, as a real key press arrives.
      w.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' });
      await holdFor(600);
      w.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' });
      let x1 = await playerX();
      let keyPath = 'os';
      // Some CI desktops (macOS) don't pass injected keys to a background window; then check the game's own input handling.
      if (x1 - x0 < 10) {
        keyPath = 'page';
        await js("dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' })); true");
        await holdFor(600);
        await js("dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight' })); true");
        x1 = await playerX();
      }
      const keysSeen = await js('__smokeKeys');
      const focused = await js('document.hasFocus()');
      // The save file: write it, read it back, and check it holds the room the hero is in.
      const saved = await js('HA.save.write(HA.debug.world); (HA.save.load() || {}).room === HA.debug.world.def.id');
      const saveFileWritten = fs.existsSync(saveFile());
      finish({ ok: !info.error && mode === 'play' && x1 - x0 >= 10 && saved && saveFileWritten, info, mode, moved: x1 - x0, keyPath, keysSeen, focused, saved, saveFileWritten });
    } catch (err) {
      finish({ ok: false, reason: String(err) });
    }
  });
}

app.whenReady().then(() => {
  setMenu();
  createWindow();
  app.on('activate', () => {
    if (!win) createWindow();
  });
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => app.quit());
