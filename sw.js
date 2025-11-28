self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("v1").then(cache => {
      return cache.addAll([
        "/index.html",
        "/offline.html"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match("/offline.html"))
  );
});
