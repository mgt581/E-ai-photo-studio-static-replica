// ---- BUMP THIS WHEN YOU DEPLOY ----
const VERSION = 'v17';
const CACHE   = `photo-studio-${VERSION}`;

const FILES_TO_CACHE = [
  '/',                    // entry
  '/index.html',
  '/signin.html',
  '/offline.html',
  '/404.html',
  '/manifest.webmanifest',
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon.png?v=3'
];

// Install: precache core files
self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // 🔴 Do not cache OpenCV JS/WASM (avoid opaque/stale responses)
  if (url.includes('cdn.jsdelivr.net') && url.includes('opencv')) {
    evt.respondWith(fetch(req));
    return;
  }

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html') ||
    req.destination === 'document';

  if (isHTML) {
    // Network-first → cache → offline.html
    evt.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(async () => {
          return (await caches.match(req)) ||
                 (await caches.match('/offline.html')) ||
                 (await caches.match('/index.html'));
        })
    );
    return;
  }

  // Other assets: stale-while-revalidate
  evt.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((net) => {
          if (net && net.status === 200) {
            caches.open(CACHE).then((cache) => cache.put(req, net.clone()));
          }
          return net;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});