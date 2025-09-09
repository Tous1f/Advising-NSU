const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `coursewizard-v${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icons.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Cache static assets during installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!key.includes(CACHE_VERSION)) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// Advanced fetch handling with dynamic caching
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // HTML files: Network-first strategy
  if (request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other assets: Cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone));
          return response;
        });
      })
  );
});
