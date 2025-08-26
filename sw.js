const CACHE = "photo-studio-cache-v1";

const filesToCache = [
  "/",
  "/index.html",
  "/logo-192.png",
  "/logo-512.png",
  "/manifest.json"
];

// Install service worker and cache essential files
self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(filesToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clean old caches
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Serve cached content when offline
self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(response => {
      return response || fetch(evt.request);
    })
  );
});
