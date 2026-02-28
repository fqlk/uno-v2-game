const CACHE_NAME = 'uno-v2-cache-v2'; // Bumped version
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/ui.js',
    '/js/socket.js',
    '/js/game.js',
    '/js/audio.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force update
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// Network First strategy for dev friendliness
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
