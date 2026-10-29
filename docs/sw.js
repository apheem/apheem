// Service worker: keeps a copy of the whole game on the device so it runs with no connection.
// Bump VERSION whenever any file below changes; the next launch then picks up the new copy.
const VERSION = 'glitch-defense-v2.0';
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/config.js',
  'js/game.js',
  'js/render.js',
  'js/profile.js',
  'js/main.js',
  'fonts/chakra-petch-500.woff2',
  'fonts/chakra-petch-600.woff2',
  'fonts/chakra-petch-700.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first: the game never waits on the network. Opening the app always loads the cached page.
// Hollow Ark (hollow-ark/) shares this site, so its requests are left alone and never get this game's page.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith(new URL('hollow-ark/', self.registration.scope).pathname)) return;
  const key = e.request.mode === 'navigate' ? 'index.html' : e.request;
  e.respondWith(caches.open(VERSION).then((c) => c.match(key, { ignoreSearch: true })).then((hit) => hit || fetch(e.request)));
});
