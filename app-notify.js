/* Уведомления о новых заменах для выбранной группы.
   Как работает: после каждой загрузки замен сайт вызывает replNotify(). Здесь сравнивается набор замен
   группы на сегодня и следующие дни с тем, что устройство уже видело. Если появилось новое или
   изменилось старое, показывается уведомление.
   Показ: в Android-приложении через плагин Capacitor LocalNotifications (его нужно добавить в сборку
   приложения), в браузере через Notification API, если пользователь разрешил.
   Замены загружаются, пока приложение открыто, и при его возвращении на экран. Когда приложение
   полностью закрыто, уведомление прийти не может: для этого нужен серверный push (FCM). */
(function () {
  'use strict';

  var SEEN_KEY = 'ksk-repl-seen';
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function nativePlugin() {
    var c = window.Capacitor;
    if (!c || typeof c.isNativePlatform !== 'function' || !c.isNativePlatform()) return null;
    if (c.Plugins && c.Plugins.LocalNotifications) return c.Plugins.LocalNotifications;
    if (typeof c.registerPlugin === 'function') {
      try { return c.registerPlugin('LocalNotifications'); } catch (e) { return null; }
    }
    return null;
  }

  function webSupported() {
    return typeof window.Notification === 'function';
  }

  function supported() {
    return !!nativePlugin() || webSupported();
  }

  function loadSeen() {
    try {
      var raw = localStorage.getItem(SEEN_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch (e) { return {}; }
  }

  function saveSeen(seen) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dateLabel(iso) {
    var p = iso.split('-');
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1];
  }

  // Одинаковый набор строк всегда даёт одну и ту же подпись, независимо от порядка.
  function signature(rows) {
    return rows.map(function (r) {
      return [Number(r.pair) || 0, r.sub || 0, r.to ? JSON.stringify(r.to) : ''].join(':');
    }).sort().join('|');
  }

  function pairsText(rows) {
    var nums = [];
    rows.forEach(function (r) {
      var n = Number(r.pair);
      if (n && nums.indexOf(n) < 0) nums.push(n);
    });
    nums.sort(function (a, b) { return a - b; });
    return nums.length ? (nums.length === 1 ? 'пара ' : 'пары ') + nums.join(', ') : '';
  }

  function show(title, body, tag) {
    var plugin = nativePlugin();
    if (plugin && typeof plugin.schedule === 'function') {
      try {
        var result = plugin.schedule({
          notifications: [{
            id: Math.floor(Date.now() / 1000) % 2147483647,
            title: title,
            body: body,
            schedule: { at: new Date(Date.now() + 500) }
          }]
        });
        if (result && typeof result.catch === 'function') result.catch(function () { showWeb(title, body, tag); });
        return;
      } catch (e) { /* пробуем вариант для браузера */ }
    }
    showWeb(title, body, tag);
  }

  function showWeb(title, body, tag) {
    if (!webSupported() || Notification.permission !== 'granted') return;
    try { new Notification(title, { body: body, tag: tag }); } catch (e) {}
  }

  /* Вызывается после загрузки замен.
     repl — объект вида { 'ГГГГ-ММ-ДД': { идентификатор_группы: [строки замен] } },
     enabled — включены ли уведомления в настройках,
     silent — только запомнить текущее состояние, ничего не показывая. */
  function check(repl, groupId, enabled, silent) {
    if (!repl || typeof repl !== 'object' || !groupId) return;
    var seen = loadSeen();
    var today = todayStr();
    var baseKey = '__g:' + groupId;
    var firstForGroup = !seen[baseKey];
    var changedDates = [];
    var pairsByDate = {};

    // Забываем уже прошедшие дни, чтобы хранилище не росло.
    Object.keys(seen).forEach(function (k) {
      if (k.indexOf('__g:') === 0) return;
      var date = k.split('|')[1];
      if (date && date < today) delete seen[k];
    });

    Object.keys(repl).sort().forEach(function (date) {
      if (date < today) return;
      var rows = (repl[date] || {})[groupId];
      var key = groupId + '|' + date;
      if (!Array.isArray(rows) || !rows.length) { delete seen[key]; return; }
      var sig = signature(rows);
      if (seen[key] !== sig) {
        changedDates.push(date);
        pairsByDate[date] = pairsText(rows);
        seen[key] = sig;
      }
    });

    seen[baseKey] = 1;
    saveSeen(seen);

    // При первом запуске для группы и при включении уведомлений только запоминаем состояние.
    if (!enabled || silent || firstForGroup || !changedDates.length) return;

    var title = 'Новые замены в расписании';
    var parts = changedDates.map(function (date) {
      var pairs = pairsByDate[date];
      return dateLabel(date) + (pairs ? ': ' + pairs : '');
    });
    show(title, parts.join('. '), 'repl-' + groupId);
  }

  // Запрашивает разрешение на показ уведомлений. Возвращает Promise<boolean>.
  function enable() {
    var plugin = nativePlugin();
    if (plugin && typeof plugin.requestPermissions === 'function') {
      return Promise.resolve(plugin.requestPermissions()).then(function (r) {
        return !!r && r.display === 'granted';
      }).catch(function () { return false; });
    }
    if (webSupported()) {
      if (Notification.permission === 'granted') return Promise.resolve(true);
      if (Notification.permission === 'denied') return Promise.resolve(false);
      try {
        return Promise.resolve(Notification.requestPermission()).then(function (p) { return p === 'granted'; });
      } catch (e) { return Promise.resolve(false); }
    }
    return Promise.resolve(false);
  }

  window.replNotify = check;
  window.replNotifyEnable = enable;
  window.replNotifySupported = supported;
})();
