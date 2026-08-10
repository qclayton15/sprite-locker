/* The Sprite Locker — service worker for offline use */
const CACHE = 'sprite-locker-v1';
const ASSETS = ['./', './index.html', './manifest.json', './preview.png',
                './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
