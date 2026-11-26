
var CACHE = 'schedule-v6';

var SHELL = [
  '/',
  '/index.html',
  '/college.jpg',
  '/manifest.webmanifest',
  '/app-config.js',
  '/app-pwa.js',
  '/app-update.js',
  '/app-notify.js',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.indexOf('/api/') === 0 ||
    url.pathname === '/admin.html' ||
    url.pathname === '/health'
  ) return;

  event.respondWith(
    fetch(req).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();

        caches.open(CACHE).then(function (cache) {
          cache.put(req, copy).catch(function () {});
        });
      }

      return response;
    }).catch(function () {
      if (req.mode === 'navigate') {
        return caches.match('/index.html').then(function (cached) {
          return cached || caches.match('/');
        });
      }

      return caches.match(req);
    })
  );
});
