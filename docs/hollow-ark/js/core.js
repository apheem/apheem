'use strict';
// Shared namespace, constants, helpers and saved settings.
window.HA = window.HA || {};

(function (HA) {
  HA.VERSION = '0.3.10';
  HA.VIEW_W = 320;
  HA.VIEW_H = 180;
  HA.TILE = 8;
  HA.STEP = 1 / 60;

  HA.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  HA.approach = (v, target, amount) => (v < target ? Math.min(v + amount, target) : Math.max(v - amount, target));
  HA.rand = (lo, hi) => lo + Math.random() * (hi - lo);
  HA.randInt = (lo, hi) => Math.floor(HA.rand(lo, hi + 1));
  HA.sign = (v) => (v < 0 ? -1 : 1);
  // A play time in frames, as H:MM:SS (or M:SS under an hour).
  HA.clock = (frames) => {
    const t = Math.floor(frames / 60);
    const pad = (n) => String(n).padStart(2, '0');
    const h = Math.floor(t / 3600);
    const m = Math.floor(t / 60) % 60;
    return (h ? h + ':' + pad(m) : m) + ':' + pad(t % 60);
  };
  HA.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // Seeded random numbers, so generated art looks the same on every machine.
  HA.seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // localStorage can be missing or blocked (private windows, some file:// setups), so every call is guarded.
  HA.store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* settings just won't persist */
      }
    },
  };

  const SETTINGS_KEY = 'hollow-ark.settings.v1';
  const DEFAULTS = {
    fullscreen: false,
    scaling: 'pixel', // 'pixel' = whole-number scaling (crisp), 'fill' = fill the window
    shake: 'full', // 'full' | 'reduced' | 'off'
    flashes: 'full', // 'full' | 'reduced'
    held: 'hold', // 'hold' | 'toggle' for fire (auto-fire, hover, charge)
    music: 6,
    sfx: 8,
    textSpeed: 'normal', // 'slow' | 'normal' | 'fast' | 'instant'
    fps: false,
  };
  HA.settings = Object.assign({}, DEFAULTS, HA.store.get(SETTINGS_KEY, {}));
  HA.saveSettings = () => HA.store.set(SETTINGS_KEY, HA.settings);
  HA.shakeScale = () => ({ full: 1, reduced: 0.35, off: 0 })[HA.settings.shake] ?? 1;

  // Present only inside the desktop app (Windows, macOS, Linux). The browser build runs without it.
  HA.desktop = window.hollowArkDesktop || null;
})(window.HA);
