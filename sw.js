/* The Sprite Locker — service worker (network-first for the app, cache for offline) */
const CACHE = 'sprite-locker-v2';
const ASSETS = ['./', './index.html', './manifest.json', './preview.png',
                './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isAppPage = req.mode === 'navigate' || req.destination === 'document'
                    || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isAppPage) {
    // Network-first: always try to get the latest app, fall back to cache when offline.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy).catch(() => {}));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
  } else {
    // Cache-first for static assets (icons, images).
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
        }
        return res;
      }).catch(() => caches.match('./index.html')))
    );
  }
});
