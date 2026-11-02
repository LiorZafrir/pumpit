// Service worker: caches the app shell. Bump VERSION on every release so clients refresh.
const VERSION = 'pumpit-v21';
const MEDIA_CACHE = 'pumpit-media-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/auth.js',
  './js/firebase.js',
  './js/firebase-config.js',
  './js/store.js',
  './js/session.js',
  './js/logic/onboarding.js',
  './js/logic/split.js',
  './js/logic/planner.js',
  './js/logic/week.js',
  './js/logic/progression.js',
  './js/logic/workout-state.js',
  './js/logic/streak.js',
  './js/logic/swap.js',
  './js/logic/focus.js',
  './js/logic/compose.js',
  './js/logic/warmup.js',
  './js/logic/progress.js',
  './js/logic/settings.js',
  './js/logic/shortmode.js',
  './js/data/local-exercises.js',
  './js/data/exercise-guides.js',
  './js/data/exercise-media.js',
  './js/data/warmups.js',
  './js/ui/exercise-media.js',
  './js/ui/chart.js',
  './js/ui/dom.js',
  './js/ui/icons.js',
  './js/ui/theme.js',
  './js/ui/touch.js',
  './js/ui/labels.js',
  './js/ui/sheet.js',
  './js/ui/ring.js',
  './js/services/feedback.js',
  './js/screens/login.js',
  './js/screens/onboarding.js',
  './js/screens/home.js',
  './js/screens/workout.js',
  './js/screens/summary.js',
  './js/screens/progress.js',
  './js/screens/profile.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== MEDIA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Static, version-pinned third-party files (fonts, Firebase SDK modules) are safe to cache.
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.includes('/assets/exercises/')) {
    // Exercise pictures never change at a given path: cache first, kept across app versions.
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) => cache.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })))
    );
    return;
  }

  // Firebase's own pages (/__/auth/handler, /__/firebase/init.json) change per request and must never be cached.
  if (url.origin === self.location.origin && url.pathname.startsWith('/__/')) return;

  if (url.origin === self.location.origin) {
    // Cache first: the whole app is precached per VERSION, so opening it needs no network round trips.
    // A new VERSION installs a fresh cache and the page reloads once when it takes over (app.js).
    // Files outside the precached list are fetched normally and not stored.
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) => cache.match(request, { ignoreSearch: request.mode === 'navigate' }).then((hit) => hit || fetch(request)
        .catch(() => (request.mode === 'navigate' ? cache.match('./index.html') : Response.error()))))
    );
    return;
  }

  if (CACHEABLE_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
  // Everything else (Firestore, Auth APIs) goes straight to the network.
});
