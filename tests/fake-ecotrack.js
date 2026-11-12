/**
 * Faux serveur Ecotrack, pour tester l'intégration sans appeler le vrai
 * service. Il imite les points de terminaison de la documentation :
 * get/wilayas, get/fees, create/orders, get/orders (jeton « Bearer »,
 * 50 requêtes par minute, pagination de 40).
 */
(function (g) {
  'use strict';

  var INACTIVE = [12, 33, 37, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58];
  var FEES = { 16: [450, 300], 31: [800, 450], 9: [650, 400], 25: [800, 450], 47: [950, 450], 11: [1500, 1100], 30: [950, 600], 14: [850, 0] };

  var fake = g.__fakeEcotrack = {
    host: 'https://demo.ecotrack.dz',
    token: 'TOKEN-SECRET-1234567890',
    orders: [],
    calls: [],
    queue: [],        // réponses forcées, utilisées dans l'ordre (ex. { code: 429 })
    down: false,      // true : aucune connexion possible
    createThenFail: false, // true : crée les colis puis « coupe » la connexion (délai dépassé)
    counter: 0,
    badCommunes: ['xx'],
    reset: function () {
      fake.orders = []; fake.calls = []; fake.queue = []; fake.down = false;
      fake.createThenFail = false; fake.counter = 0; fake.badCommunes = ['xx'];
    },
    setStatus: function (tracking, status) {
      fake.orders.forEach(function (o) { if (o.tracking === tracking) o.status = status; });
    },
    remove: function (tracking) {
      fake.orders = fake.orders.filter(function (o) { return o.tracking !== tracking; });
    },
    lastCall: function (path) {
      var found = null;
      fake.calls.forEach(function (c) { if (c.path === path) found = c; });
      return found;
    },
    count: function (path) {
      return fake.calls.filter(function (c) { return !path || c.path === path; }).length;
    }
  };

  function respond(code, body, headers) {
    var text = typeof body === 'string' ? body : JSON.stringify(body);
    return {
      getResponseCode: function () { return code; },
      getContentText: function () { return text; },
      getAllHeaders: function () { return headers || {}; }
    };
  }

  function parse(url) {
    var m = String(url).match(/^(https?:\/\/[^\/?#]+)([^?#]*)(?:\?([^#]*))?/);
    var query = {};
    if (m && m[3]) {
      m[3].split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) query[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      });
    }
    return { origin: m && m[1], path: m ? m[2] : '', query: query };
  }

  function wilayas() {
    var list = [];
    for (var id = 1; id <= 58; id++) {
      if (INACTIVE.indexOf(id) < 0) list.push({ wilaya_id: id, wilaya_name: 'Wilaya ' + id });
    }
    return list;
  }

  function fees() {
    var list = [];
    for (var id = 1; id <= 58; id++) {
      if (INACTIVE.indexOf(id) >= 0) continue;
      var f = FEES[id] || [800 + (id % 4) * 50, id % 3 === 0 ? 0 : 450];
      list.push({ wilaya_id: id, tarif: String(f[0]), tarif_stopdesk: String(f[1]) });
    }
    return { livraison: list, pickup: list, echnage: list };
  }

  function validate(o) {
    var errors = {};
    var need = function (k, label) {
      if (o[k] === undefined || o[k] === null || String(o[k]).trim() === '') errors[k] = ['Le champ ' + label + ' est obligatoire.'];
    };
    need('nom_client', 'nom client'); need('telephone', 'téléphone'); need('adresse', 'adresse');
    need('code_wilaya', 'code wilaya'); need('commune', 'commune'); need('montant', 'montant'); need('type', 'type');
    if (o.telephone && !/^\d{9,10}$/.test(String(o.telephone))) errors.telephone = ['Le champ téléphone doit contenir entre 9 et 10 chiffres.'];
    var w = parseInt(o.code_wilaya, 10);
    if (!errors.code_wilaya && (!(w >= 1 && w <= 58) || INACTIVE.indexOf(w) >= 0)) errors.code_wilaya = ['Wilaya mal écrite, ou désactivée.'];
    var c = String(o.commune || '').toLowerCase();
    if (!errors.commune && fake.badCommunes.some(function (b) { return c.indexOf(b) === 0; })) {
      errors.commune = ['Commune mal écrite, ou désactivée.', 'Wilaya mal écrite, ou désactivée.'];
    }
    return Object.keys(errors).length ? errors : null;
  }

  function createOrders(body) {
    var input = (body && body.orders) || {};
    var keys = Object.keys(input);
    if (keys.length > 100) return respond(422, { message: 'La limite est de 100 commandes par requête.' });
    var results = {};
    var anyError = false;
    keys.forEach(function (k) {
      var o = input[k];
      var errors = validate(o);
      if (errors) { results[o.reference] = errors; anyError = true; return; }
      fake.counter++;
      var tracking = 'ECT' + ('00000000' + fake.counter).slice(-8);
      fake.orders.push({
        tracking: tracking, reference: o.reference, client: o.nom_client, phone: o.telephone, phone_2: null,
        adresse: o.adresse, commune: o.commune, wilaya_id: parseInt(o.code_wilaya, 10), montant: String(o.montant),
        tarif_prestation: '400', tarif_retour: '200', type_id: 1, created_at: new Date().toISOString().slice(0, 10),
        payment_id: null, return_id: null, status: 'prete_a_expedier', products: o.produit || ''
      });
      results[o.reference] = { success: true, tracking: tracking };
    });
    return respond(anyError ? 422 : 200, { results: results });
  }

  function listOrders(query) {
    var rows = fake.orders.slice();
    if (query.tracking) rows = rows.filter(function (o) { return o.tracking === query.tracking; });
    if (query.start_date) rows = rows.filter(function (o) { return o.created_at >= query.start_date; });
    var page = Math.max(parseInt(query.page, 10) || 1, 1);
    var last = Math.max(Math.ceil(rows.length / 40), 1);
    return respond(200, {
      current_page: page, data: rows.slice((page - 1) * 40, page * 40), last_page: last, per_page: 40, total: rows.length
    });
  }

  g.UrlFetchApp = {
    fetch: function (url, params) {
      params = params || {};
      var u = parse(url);
      if (u.origin !== fake.host) throw new Error('DNS error : ' + u.origin);
      if (fake.down) throw new Error('Address unavailable : ' + fake.host);
      var headers = params.headers || {};
      var body = params.payload ? JSON.parse(params.payload) : null;
      fake.calls.push({ method: params.method || 'get', path: u.path, query: u.query, headers: headers, body: body, options: params });

      if (fake.queue.length) {
        var forced = fake.queue.shift();
        return respond(forced.code, forced.body || { message: 'forced' }, forced.headers);
      }
      if (headers.Authorization !== 'Bearer ' + fake.token) return respond(401, { message: 'Unauthenticated.' });

      var method = String(params.method || 'get').toUpperCase();
      if (method === 'GET' && u.path === '/api/v1/get/wilayas') return respond(200, wilayas());
      if (method === 'GET' && u.path === '/api/v1/get/fees') return respond(200, fees());
      if (method === 'GET' && u.path === '/api/v1/get/orders') return listOrders(u.query);
      if (method === 'POST' && u.path === '/api/v1/create/orders') {
        var res = createOrders(body);
        if (fake.createThenFail) throw new Error('Timeout : la connexion a été coupée');
        return res;
      }
      return respond(404, { message: 'Not found' });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
