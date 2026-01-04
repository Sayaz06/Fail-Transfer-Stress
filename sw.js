const CACHE_NAME = "fts-cache-v1";
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./upload.js",
  "./manifest.json",
  "./image-192.png",
  "./image-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  event.respondWith(
    caches.match(request).then(resp => resp || fetch(request).catch(() => {
      // Fallback to index for navigation requests
      if (request.mode === "navigate") {
        return caches.match("./index.html");
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }))
  );
});
