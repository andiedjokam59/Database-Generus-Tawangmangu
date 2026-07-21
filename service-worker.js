const CACHE_NAME = 'generus-form-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo ppg.jpg'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Service Worker (Agar lolos syarat PWA)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return file dari cache jika ada, jika tidak ambil dari internet
        return response || fetch(event.request);
      })
  );
});