'use strict';
// The small, fixed set of desktop features the game may use. The page gets no other access to the system.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hollowArkDesktop', {
  platform: process.platform,
  setFullscreen: (on) => ipcRenderer.invoke('fullscreen:set', !!on),
  isFullscreen: () => ipcRenderer.invoke('fullscreen:get'),
  onFullscreenChange: (fn) => ipcRenderer.on('fullscreen:changed', (e, on) => fn(!!on)),
  quit: () => ipcRenderer.send('app:quit'),
  ready: (info) => ipcRenderer.send('app:ready', info),
  // One save file in the app-data folder. Reading happens once, at the title screen, so it can be synchronous.
  readSave: () => ipcRenderer.sendSync('save:read'),
  writeSave: (text) => ipcRenderer.send('save:write', String(text)),
});
