/**
 * Faux serveur Ecotrack, pour tester l'intégration sans appeler le vrai
 * service. Il imite les points de terminaison de la documentation :
 * get/wilayas, get/fees, create/orders, get/orders, delete/order,
 * get/order/label (bordereau PDF) et valid/order (jeton « Bearer »,
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
    statusEndpoint: 'ok',  // 'ok' | 'missing' (erreur 404) | 'weird' (réponse de forme inconnue)
    apiDisabled: false,    // true : « TOKEN_NOT_ALLOWED »
    history: {},           // n° de suivi -> étapes renvoyées par get/tracking/info
    historyShape: 'list',  // 'list' | 'weird'
    storage: 'https://storage.ecotrack.dz', // où Ecotrack range les fichiers PDF
    labelMode: 'pdf',      // 'pdf' (le PDF directement) | 'redirect' (302 vers storage) | 'json' ({ data: { url } }) | 'html'
    validateMode: 'ok',    // 'ok' | 'refuse' (erreur 422) | 'lost' (validé, mais la réponse se perd)
    validated: [],         // { tracking, ask } validés par valid/order
    reset: function () {
      fake.orders = []; fake.calls = []; fake.queue = []; fake.down = false;
      fake.createThenFail = false; fake.counter = 0; fake.badCommunes = ['xx'];
      fake.statusEndpoint = 'ok'; fake.apiDisabled = false; fake.history = {}; fake.historyShape = 'list';
      fake.labelMode = 'pdf'; fake.validateMode = 'ok'; fake.validated = [];
    },
    setStatus: function (tracking, status) {
      fake.orders.forEach(function (o) { if (o.tracking === tracking) o.status = status; });
    },
    setPayment: function (tracking, paymentId) {
      fake.orders.forEach(function (o) { if (o.tracking === tracking) o.payment_id = paymentId; });
    },
    /** Ce que vous faites dans l'interface d'Ecotrack : valider l'expédition. */
    validate: function (tracking) {
      fake.setStatus(tracking, 'en_ramassage');
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
      getContent: function () { return bytesOf(unescape(encodeURIComponent(text))); },
      getAllHeaders: function () { return headers || {}; }
    };
  }

  function bytesOf(binary) {
    var out = [];
    for (var i = 0; i < binary.length; i++) out.push(binary.charCodeAt(i) & 255);
    return out;
  }

  function respondPdf(binary) {
    return {
      getResponseCode: function () { return 200; },
      getContentText: function () { return binary; },
      getContent: function () { return bytesOf(binary); },
      getAllHeaders: function () { return { 'Content-Type': 'application/pdf' }; }
    };
  }

  /** Texte sans accents (le PDF de démonstration n'utilise que l'ASCII). */
  function ascii(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/([()\\])/g, '\\$1');
  }

  /** Bordereau de démonstration (10×15 cm), un vrai PDF lisible par la page. */
  function labelPdf(o) {
    var W = 283, H = 425;
    var c = ['0.8 w 8 8 ' + (W - 16) + ' ' + (H - 16) + ' re S', '0.8 w 14 120 ' + (W - 28) + ' 170 re S'];
    var x = 30;
    String(o.tracking).split('').forEach(function (ch, i) {
      var code = ch.charCodeAt(0) + i;
      for (var k = 0; k < 3 && x < W - 34; k++) {
        var w = 1 + ((code >> k) % 3);
        c.push(x + ' 300 ' + w + ' 46 re f');
        x += w + 1 + ((code >> (k + 1)) % 2);
      }
    });
    var text = function (font, size, y, s) { c.push('BT /' + font + ' ' + size + ' Tf 20 ' + y + ' Td (' + ascii(s) + ') Tj ET'); };
    text('F2', 13, 392, 'SOCIETE DE LIVRAISON (DEMO)');
    text('F2', 18, 356, o.tracking);
    text('F1', 10, 270, 'Destinataire : ' + o.client);
    text('F1', 10, 254, 'Telephone : ' + o.phone);
    text('F1', 10, 238, 'Wilaya : ' + o.wilaya_id);
    text('F1', 10, 222, 'Commune : ' + o.commune);
    text('F2', 12, 204, 'Montant : ' + o.montant + ' DA');
    text('F1', 10, 186, 'Produit : ' + String(o.products || '').slice(0, 40));
    text('F1', 10, 140, 'Ref : ' + o.reference);
    text('F1', 8, 100, 'Bordereau de demonstration - apercu DZ Smart Shop');
    var stream = c.join('\n');
    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'
    ];
    var out = '%PDF-1.4\n';
    var offsets = [];
    objs.forEach(function (obj, i) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\n' + obj + '\nendobj\n';
    });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' +
      offsets.map(function (n) { return ('0000000000' + n).slice(-10) + ' 00000 n \n'; }).join('') +
      'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  }

  fake.labelPdf = labelPdf;

  function findOrder(tracking) {
    return fake.orders.filter(function (x) { return x.tracking === tracking; })[0] || null;
  }

  /** get/order/label : le bordereau PDF d'un colis. */
  function labelOrder(query) {
    var o = findOrder(query.tracking);
    if (!o) return respond(404, { message: 'Not found' });
    var file = fake.storage + '/labels/' + o.tracking + '.pdf';
    if (fake.labelMode === 'redirect') return respond(302, '', { Location: file });
    if (fake.labelMode === 'json') return respond(200, { success: true, data: { url: file } });
    if (fake.labelMode === 'html') return respond(200, '<html><body>Erreur</body></html>');
    return respondPdf(labelPdf(o));
  }

  /** valid/order : expédie un colis créé (plus modifiable ensuite). */
  function validOrder(query) {
    var o = findOrder(query.tracking);
    if (!o) return respond(200, { success: false, message: 'Commande introuvable' });
    if (fake.validateMode === 'refuse') return respond(422, { message: 'The given data was invalid.', errors: { tracking: ['Colis bloqué par le dépôt.'] } });
    if (o.status !== 'prete_a_expedier') return respond(200, { success: false, message: 'Commande déjà expédiée' });
    o.status = String(query.ask_collection) === '1' ? 'en_ramassage' : 'vers_hub';
    fake.validated.push({ tracking: o.tracking, ask: String(query.ask_collection) });
    if (fake.validateMode === 'lost') throw new Error('Timeout : la connexion a été coupée');
    return respond(200, { success: true, message: 'Commande expédiée' });
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

  var ARCHIVED = ['paye_et_archive', 'retour_archive'];

  /** get/orders/status : statuts de plusieurs colis, archivés compris. */
  function statusOrders(query) {
    if (fake.statusEndpoint === 'missing') return respond(404, { message: 'Not found' });
    if (query.api_token !== fake.token) return respond(401, { message: 'Unauthenticated.' });
    if (fake.statusEndpoint === 'weird') return respond(200, { message: 'ok', count: 3 });
    var wanted = String(query.trackings || '').split(',').filter(Boolean);
    if (wanted.length > 100) return respond(422, { message: 'Maximum 100 trackings.' });
    return respond(200, { data: fake.orders.filter(function (o) { return wanted.indexOf(o.tracking) >= 0; }) });
  }

  /** get/tracking/info : étapes d'un colis. */
  function trackingInfo(query) {
    var known = fake.orders.some(function (o) { return o.tracking === query.tracking; });
    if (!known) return respond(422, { message: 'The given data was invalid.', errors: { tracking: ['Le champ tracking sélectionné est invalide.'] } });
    if (fake.historyShape === 'weird') return respond(200, { colis: { numero: query.tracking }, ok: true });
    return respond(200, { tracking: query.tracking, activities: fake.history[query.tracking] || [] });
  }

  function listOrders(query) {
    var rows = fake.orders.filter(function (o) { return ARCHIVED.indexOf(o.status) < 0; });
    if (query.tracking) rows = rows.filter(function (o) { return o.tracking === query.tracking; });
    if (query.start_date) rows = rows.filter(function (o) { return o.created_at >= query.start_date; });
    var page = Math.max(parseInt(query.page, 10) || 1, 1);
    var last = Math.max(Math.ceil(rows.length / 40), 1);
    return respond(200, {
      current_page: page, data: rows.slice((page - 1) * 40, page * 40), last_page: last, per_page: 40, total: rows.length
    });
  }

  /** delete/order : possible tant que l'expédition n'est pas validée (réponse 200 dans tous les cas). */
  function deleteOrder(query) {
    var o = fake.orders.filter(function (x) { return x.tracking === query.tracking; })[0];
    if (!o) return respond(200, { success: false, error: 'Commande introuvable' });
    if (o.status !== 'prete_a_expedier') return respond(200, { success: false, error: 'Commande non modifiable' });
    fake.remove(o.tracking);
    return respond(200, { success: true, message: 'Commande supprimée avec succès' });
  }

  g.UrlFetchApp = {
    fetchAll: function (list) {
      return list.map(function (req) { return g.UrlFetchApp.fetch(req.url, req); });
    },
    fetch: function (url, params) {
      params = params || {};
      var u = parse(url);
      if (u.origin === fake.storage) {
        // Fichiers d'Ecotrack : ils ne doivent jamais recevoir le jeton.
        fake.calls.push({ method: 'get', path: u.path, query: u.query, headers: params.headers || {}, storage: true, options: params });
        var m = u.path.match(/^\/labels\/(.+)\.pdf$/);
        var o = m ? findOrder(m[1]) : null;
        return o ? respondPdf(labelPdf(o)) : respond(404, 'Not found');
      }
      if (u.origin !== fake.host) throw new Error('DNS error : ' + u.origin);
      if (fake.down) throw new Error('Address unavailable : ' + fake.host);
      var headers = params.headers || {};
      var body = params.payload ? JSON.parse(params.payload) : null;
      fake.calls.push({ method: params.method || 'get', path: u.path, query: u.query, headers: headers, body: body, options: params });

      if (fake.queue.length) {
        var forced = fake.queue.shift();
        return respond(forced.code, forced.body || { message: 'forced' }, forced.headers);
      }
      var method = String(params.method || 'get').toUpperCase();
      if (method === 'GET' && u.path === '/api/v1/validate/token') {
        if (fake.apiDisabled) return respond(200, { success: false, message: 'TOKEN_NOT_ALLOWED' });
        return u.query.api_token === fake.token ? respond(200, { success: true, message: 'VALID_TOKEN' })
          : respond(200, { success: false, message: 'INVALID_TOKEN' });
      }
      if (headers.Authorization !== 'Bearer ' + fake.token) return respond(401, { message: 'Unauthenticated.' });
      if (method === 'GET' && u.path === '/api/v1/get/orders/status') return statusOrders(u.query);
      if (method === 'GET' && u.path === '/api/v1/get/tracking/info') return trackingInfo(u.query);
      if (method === 'GET' && u.path === '/api/v1/get/wilayas') return respond(200, wilayas());
      if (method === 'GET' && u.path === '/api/v1/get/fees') return respond(200, fees());
      if (method === 'GET' && u.path === '/api/v1/get/orders') return listOrders(u.query);
      if (method === 'DELETE' && u.path === '/api/v1/delete/order') return deleteOrder(u.query);
      if (method === 'GET' && u.path === '/api/v1/get/order/label') return labelOrder(u.query);
      if (method === 'POST' && u.path === '/api/v1/valid/order') return validOrder(u.query);
      if (method === 'POST' && u.path === '/api/v1/create/orders') {
        var res = createOrders(body);
        if (fake.createThenFail) throw new Error('Timeout : la connexion a été coupée');
        return res;
      }
      return respond(404, { message: 'Not found' });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
