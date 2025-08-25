const CACHE = "photo-studio-cache-v1";
const filesToCache = ["/", "/index.html", "/logo-192.png", "/logo-512.png", "/manifest.json"];

self.addEventListener("install", evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(filesToCache)));
  self.skipWaiting();
});
self.addEventListener("activate", evt => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE && caches.delete(key)))));
});
self.addEventListener("fetch", evt => {
  evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request)));
});
