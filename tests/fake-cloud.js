/**
 * Fausse application Cloudflare (pont), pour tester Cloud.gs sans réseau : elle note les appels
 * et répond comme server.js (/bridge/register, /bridge/import, /bridge/status, et après le
 * basculement /bridge/live, /bridge/config, /bridge/orders, /bridge/changes, /bridge/marks).
 * fake.changes : les changements que « Cloudflare » renverra (comme /bridge/changes).
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
    live: false,
    full: false,
    tabs: {},              // onglets reçus par /bridge/tabs
    tabSeq: {},            // dernier changement de chaque onglet (pour refuser une modification à la main dépassée)
    editors: null,
    orders: {},            // commandes reçues par /bridge/orders
    changes: [],           // { seq, id, kind, info, order }
    marks: [],
    config: null,
    reset: function () { fake.calls = []; fake.secret = ''; fake.refuse = ''; fake.live = false; fake.full = false; fake.tabs = {}; fake.tabSeq = {}; fake.editors = null; fake.orders = {}; fake.changes = []; fake.marks = []; fake.config = null; },
    /** Ajoute un changement « fait dans Cloudflare ». */
    change: function (kind, id, order, info) {
      var seq = fake.changes.length ? fake.changes[fake.changes.length - 1].seq + 1 : 1;
      fake.changes.push({ seq: seq, id: String(id), kind: kind, info: info || '', order: order || null });
    },
    /** Un onglet modifié « dans Cloudflare » : toutes ses lignes (un seul paquet). */
    changeTab: function (name, rows) {
      var seq = fake.changes.length ? fake.changes[fake.changes.length - 1].seq + 1 : 1;
      fake.tabSeq[name] = seq;
      fake.changes.push({ seq: seq, id: name, kind: 'tab', info: '', tab: { n: rows.length, size: 250, parts: { 0: rows } } });
    },
    byPath: function (path) { return fake.calls.filter(function (c) { return c.path === path; }); }
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
      if (path === '/bridge/import') {
        if (body.reset && fake.live && !body.goLive) return respond(409, { ok: false, error: 'La version Cloudflare est la vraie application : la recopie depuis le classeur est désactivée.' });
        return respond(200, { ok: true, data: { ok: true } });
      }
      if (path === '/bridge/status') return respond(200, { ok: true, data: { orders: 0, live: fake.live } });
      if (path === '/bridge/live') { fake.live = body.live !== false; return respond(200, { ok: true, data: { live: fake.live, seq: 0 } }); }
      if (path === '/bridge/config') {
        if (body.editors) fake.editors = body.editors;
        if (body.config || body.props) fake.config = body;
        return respond(200, { ok: true, data: { ok: true } });
      }
      if (path === '/bridge/full') { fake.full = body.full !== false; return respond(200, { ok: true, data: { full: fake.full, seq: 0 } }); }
      if (path === '/bridge/tabs') {
        var out = { saved: [], refused: [] };
        Object.keys(body.tabs || {}).forEach(function (n) {
          if (body.base && body.base[n] !== undefined && (fake.tabSeq[n] || 0) > body.base[n]) { out.refused.push(n); return; }
          fake.tabs[n] = body.tabs[n];
          out.saved.push(n);
        });
        return respond(200, { ok: true, data: out });
      }
      if (path === '/bridge/orders') {
        var added = [];
        (body.orders || []).forEach(function (o) { if (!fake.orders[o.id]) { fake.orders[o.id] = o; added.push(o.id); } });
        return respond(200, { ok: true, data: { added: added, skipped: (body.orders || []).length - added.length } });
      }
      if (path === '/bridge/changes') {
        var after = Number(body.after) || 0;
        var list = fake.changes.filter(function (c) { return c.seq > after; }).slice(0, body.limit || 300);
        return respond(200, { ok: true, data: { changes: list, last: list.length ? list[list.length - 1].seq : after, more: false } });
      }
      if (path === '/bridge/marks') { fake.marks = fake.marks.concat(body.marks || []); return respond(200, { ok: true, data: { marked: (body.marks || []).length } }); }
      return respond(404, { ok: false, error: 'Inconnu.' });
    }
  };
  if (g.__mock) {
    var reset = g.__mock.reset;
    g.__mock.reset = function () { reset(); fake.reset(); };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
