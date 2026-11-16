/* Service worker: позволяет открывать расписание без сети и запускать сайт как приложение.
   Страницу берём из сети, а при отсутствии связи из кэша. Запросы к /api и админку не кэшируем:
   замены всегда должны быть свежими. */
var CACHE = 'schedule-v1';
var SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0 || url.pathname === '/admin.html' || url.pathname === '/health') return;

  // Страницы: сначала сеть, при ошибке кэш.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('/index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('/index.html').then(function (hit) { return hit || caches.match('/'); });
      })
    );
    return;
  }

  // Остальные файлы: из кэша сразу, в фоне обновляем.
  event.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
