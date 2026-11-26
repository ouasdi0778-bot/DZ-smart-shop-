/*
 * Service worker de DZ Smart Shop (v1.12) : l'application s'installe sur le téléphone (icône, plein
 * écran), affiche une page claire sans connexion, et reçoit les notifications (nouvelles commandes,
 * rappels, colis à traiter) même quand elle est fermée. Un appui ouvre la bonne commande.
 */
var SW_VERSION = '__VERSION__';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

var OFFLINE = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Pas de connexion</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;' +
  'padding:24px;box-sizing:border-box;background:#10241B;color:#fff;font:16px/1.5 system-ui,sans-serif"><div><h1 style="font-size:22px;margin:0 0 8px">Pas de connexion internet</h1>' +
  '<p style="margin:0 0 18px;opacity:.85">Vérifiez la 4G ou le Wi-Fi, puis réessayez.</p>' +
  '<button onclick="location.reload()" style="min-height:48px;padding:0 22px;border:0;border-radius:12px;background:#0B6B4C;color:#fff;font:600 15px system-ui">Réessayer</button></div></body></html>';

// Pages : toujours depuis le réseau (rien n'est gardé), une page claire si internet coupe.
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response(OFFLINE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'DZ Smart Shop', {
    body: d.body || '',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    lang: 'fr',
    timestamp: d.at || Date.now(),
    data: { url: d.url || '/#/commandes' },
    actions: d.actions || []
  }));
});

// Appui sur la notification : l'application déjà ouverte va à la commande, sinon elle s'ouvre dessus.
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
        c.postMessage({ dzOpen: url });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
