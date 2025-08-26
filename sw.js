// ---- BUMP THIS WHEN YOU DEPLOY ----
const VERSION = 'v6';
const CACHE = `photo-studio-${VERSION}`;

// Add/adjust paths to match your project
const FILES_TO_CACHE = [
  '/',                // entry
  '/index.html',
  '/manifest.webmanifest', // use '/manifest.json' if that's your file
  '/logo-192.png',
  '/logo-512.png'
];

// Install: precache core files
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
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

// Fetch strategy:
// - HTML/documents => network-first (so new index.html shows immediately)
// - other GET requests => cache-first with background refresh (SW-R)
self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Treat navigations and HTML as network-first
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
        .catch(() =>
          caches.match(req).then((c) => c || caches.match('/index.html'))
        )
    );
    return;
  }

  // For assets: stale-while-revalidate
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