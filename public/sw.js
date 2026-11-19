// Keeps the app shell available offline. List data is never cached here;
// the app keeps its own copy and an outbox of unsynced changes.
const CACHE = 'shopping-list-v4';
const SHELL = ['./', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'icon.svg',
  'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'fonts/atkinson-400.woff2', 'fonts/atkinson-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const apiRoot = new URL('api/', self.registration.scope).pathname;
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(apiRoot)) return;
  // Network first so updates show up right away; cache when offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then((hit) => hit || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
