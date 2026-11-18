/**
 * Fausse application Cloudflare (pont), pour tester Cloud.gs sans réseau : elle note les appels
 * et répond comme server.js (/bridge/register, /bridge/import, /bridge/status).
 * À charger après les autres faux services : les autres adresses leur sont transmises.
 */
(function (g) {
  'use strict';

  var previous = g.UrlFetchApp.fetch;

  var fake = g.__fakeCloud = {
    host: 'https://dz-test.workers.dev',
    calls: [],
    secret: '',
    refuse: '',            // message d'erreur forcé
    reset: function () { fake.calls = []; fake.secret = ''; fake.refuse = ''; }
  };

  function respond(code, body) {
    var text = JSON.stringify(body);
    return { getResponseCode: function () { return code; }, getContentText: function () { return text; }, getAllHeaders: function () { return {}; } };
  }

  g.UrlFetchApp = {
    fetchAll: function (list) { return list.map(function (req) { return g.UrlFetchApp.fetch(req.url, req); }); },
    fetch: function (url, params) {
      params = params || {};
      if (String(url).indexOf(fake.host) !== 0) return previous(url, params);
      var path = String(url).slice(fake.host.length);
      var body = params.payload ? JSON.parse(params.payload) : null;
      var key = (params.headers || {})['X-DZ-Key'] || '';
      fake.calls.push({ path: path, body: body, key: key });
      if (fake.refuse) return respond(403, { ok: false, error: fake.refuse });
      if (path === '/bridge/register') {
        if (fake.secret && key !== fake.secret) return respond(403, { ok: false, error: 'Cette application Cloudflare est déjà reliée à un autre classeur.' });
        fake.secret = body.secret;
        return respond(200, { ok: true, data: { ok: true } });
      }
      if (key !== fake.secret) return respond(403, { ok: false, error: 'Clé refusée.' });
      if (path === '/bridge/import') return respond(200, { ok: true, data: { ok: true } });
      if (path === '/bridge/status') return respond(200, { ok: true, data: { orders: 0 } });
      return respond(404, { ok: false, error: 'Inconnu.' });
    }
  };
  if (g.__mock) {
    var reset = g.__mock.reset;
    g.__mock.reset = function () { reset(); fake.reset(); };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
