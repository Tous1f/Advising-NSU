const CACHE = 'batsched-v1';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './data.js', './manifest.json'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request)));
});
