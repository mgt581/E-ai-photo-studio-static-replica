// ---- BUMP THIS WHEN YOU DEPLOY ----
const VERSION = 'v12';
const CACHE   = `photo-studio-${VERSION}`;

// Add/adjust paths to match your project
const FILES_TO_CACHE = [
  '/',                    // entry
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',       // harmless if missing
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',       // base path
  '/apple-touch-icon.png?v=3'    // cache-busted icon used in <head>
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
// - HTML/documents: network-first (so new index.html shows immediately)
// - Other GETs: stale-while-revalidate (fast, then refresh in background)
self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html') ||
    req.destination === 'document';

  if (isHTML) {
    evt.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  // Assets: SWR
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