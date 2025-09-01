// ---- BUMP THIS WHEN YOU DEPLOY ----
const VERSION = 'v13';
const CACHE   = `photo-studio-${VERSION}`;

// Precache these files (adjust if you rename/move anything)
const FILES_TO_CACHE = [
  '/',                     // entry
  '/index.html',
  '/signin.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',        // harmless if missing
  '/apple-touch-icon.png',
  '/apple-touch-icon.png?v=3',
  '/logo-192.png',
  '/logo-512.png'
];

// Install: precache core files
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch:
// - Navigations (HTML/documents): network-first, fallback to cache, then offline.html
// - Other GET requests: stale-while-revalidate
self.addEventListener('fetch', evt => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' ||
                 accept.includes('text/html') ||
                 req.destination === 'document';

  if (isHTML) {
    evt.respondWith(
      fetch(req)
        .then(resp => {
          // Cache a copy of successful responses
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return resp;
        })
        .catch(async () => {
          // Try cached page, else show offline.html
          const cached = await caches.match(req);
          return cached || (await caches.match('/offline.html'));
        })
    );
    return;
  }

  // Assets/API: SWR
  evt.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(netResp => {
          if (netResp && netResp.status === 200 && netResp.type !== 'opaqueredirect') {
            caches.open(CACHE).then(c => c.put(req, netResp.clone()));
          }
          return netResp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});