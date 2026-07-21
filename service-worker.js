const CACHE_NAME = 'generus-form-v2'; // Naikkan versi jika Anda mengedit file HTML/SW[cite: 2]
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo ppg.jpg'
]; //[cite: 2]

// 1. Install Event & skipWaiting agar SW baru langsung aktif
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE); //[cite: 2]
      })
  );
});

// 2. Activate Event: Bersihkan cache versi lama secara otomatis
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Hapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Strategi gabungan (Aman untuk Update)
self.addEventListener('fetch', event => {
  // Abaikan request ke Supabase atau ekstensi browser (hanya cache request internal)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jika ada koneksi internet, ambil versi terbaru dari jaringan & perbarui cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline / koneksi gagal, baru ambil dari cache[cite: 2]
        return caches.match(event.request); //[cite: 2]
      })
  );
});