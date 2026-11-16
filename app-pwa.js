/* Веб-приложение для iPhone и браузеров: регистрация service worker и подсказка,
   как добавить сайт на экран «Домой». Внутри Android-приложения (Capacitor) ничего не делает. */
(function () {
  'use strict';

  var cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var HINT_KEY = 'ksk-ios-hint';
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (!isIOS || standalone) return;
  try { if (localStorage.getItem(HINT_KEY)) return; } catch (e) {}

  function showHint() {
    if (document.getElementById('ios-install-hint')) return;
    var box = document.createElement('div');
    box.id = 'ios-install-hint';
    box.setAttribute('role', 'status');
    box.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:60;display:flex;gap:.75rem;align-items:center;' +
      'padding:.85rem 1rem;border-radius:1rem;background:rgba(30,15,22,.94);color:#fff;border:1px solid rgba(244,114,182,.35);' +
      'box-shadow:0 10px 30px rgba(0,0,0,.45);font:500 .9rem/1.35 system-ui,-apple-system,sans-serif';
    var text = document.createElement('div');
    text.style.flex = '1';
    text.textContent = 'Установите как приложение: нажмите «Поделиться» в Safari и выберите «На экран “Домой”».';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Понятно';
    btn.style.cssText = 'flex:none;border:0;border-radius:.7rem;padding:.55rem .9rem;font:600 .85rem system-ui,-apple-system,sans-serif;color:#fff;background:linear-gradient(135deg,#f472b6,#e11d48)';
    btn.addEventListener('click', function () {
      try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
      box.remove();
    });
    box.appendChild(text);
    box.appendChild(btn);
    document.body.appendChild(box);
  }

  // Показываем чуть позже, чтобы не мешать выбору группы при первом входе.
  window.addEventListener('load', function () { setTimeout(showHint, 4000); });
})();
