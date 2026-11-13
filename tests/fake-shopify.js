/**
 * Faux Shopify (API Admin GraphQL), pour tester l'importation sans appeler le
 * vrai service. Il répond à la requête `orders(...)` utilisée par l'outil, au
 * test de connexion (`shop`), et à la demande de jeton « client credentials ».
 * À charger après fake-ecotrack.js : les autres adresses lui sont transmises.
 */
(function (g) {
  'use strict';

  var previous = g.UrlFetchApp.fetch;

  var fake = g.__fakeShopify = {
    host: 'https://algerie-smart.myshopify.com',
    token: 'shpat_FAUX-jeton-de-test-pas-un-vrai-0001',
    clientId: 'client-id-1234567890',
    clientSecret: 'client-secret-1234567890',
    issuedTokens: [],      // jetons délivrés par la demande « client credentials »
    orders: [],
    calls: [],
    queue: [],             // réponses forcées, utilisées dans l'ordre
    currency: 'DZD',
    denyOrders: false,     // true : permission read_orders absente
    reset: function () {
      fake.orders = []; fake.calls = []; fake.queue = []; fake.issuedTokens = []; fake.currency = 'DZD'; fake.denyOrders = false;
    },
    count: function (kind) { return fake.calls.filter(function (c) { return !kind || c.kind === kind; }).length; },
    /** Ajoute une commande au format Releasit COD (les champs réels de la boutique). */
    add: function (o) {
      var order = {
        id: 'gid://shopify/Order/' + (7584000000000 + fake.orders.length + 1),
        name: o.name,
        createdAt: o.createdAt || new Date().toISOString(),
        cancelledAt: o.cancelledAt || null,
        phone: o.phone === undefined ? '+213660894700' : o.phone,
        note: o.note || null,
        tags: o.tags || ['releasit_cod_form'],
        customAttributes: o.customAttributes || [
          { key: 'الاسم و اللقب ', value: o.client || 'Client Test' },
          { key: 'رقم الهاتف', value: o.phoneInput || '0660894700' },
          { key: 'العنوان', value: o.address || 'Ouargla' },
          { key: 'الولاية', value: o.wilaya || 'Ouargla' }
        ].concat(o.utm ? [{ key: 'UTM source', value: 'facebook' }, { key: 'UTM campaign', value: o.utm }] : []),
        shippingAddress: o.shippingAddress === undefined ? {
          name: (o.client || 'Client Test') + ' -', firstName: o.client || 'Client Test', lastName: '-', phone: '+2130660894700',
          address1: o.address || 'Ouargla', address2: null, city: o.wilaya || 'Ouargla', province: null
        } : o.shippingAddress,
        shippingLines: { nodes: [{ title: o.shipTitle === undefined ? 'توصيل للمكتب' : o.shipTitle, originalPriceSet: { shopMoney: { amount: String(o.shipping === undefined ? 450 : o.shipping) } } }] },
        subtotalPriceSet: { shopMoney: { amount: String(o.subtotal === undefined ? 1800 : o.subtotal) } },
        totalPriceSet: { shopMoney: { amount: String(o.total === undefined ? 2250 : o.total) } },
        lineItems: { nodes: o.items || [{ title: 'cover iPhone', quantity: 1, variantTitle: 'iphone 13 PRO MAX' }] }
      };
      fake.orders.push(order);
      return order;
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

  /** created_at:>=2026-11-09T06:00:00Z tag:releasit_cod_form */
  function parseSearch(q) {
    var out = {};
    var m = String(q || '').match(/created_at:>=(\S+)/);
    if (m) out.since = m[1];
    var t = String(q || '').match(/tag:(\S+)/);
    if (t) out.tag = t[1];
    return out;
  }

  function ordersConnection(vars) {
    var s = parseSearch(vars.query);
    var rows = fake.orders.filter(function (o) {
      if (s.since && new Date(o.createdAt) < new Date(s.since)) return false;
      if (s.tag && o.tags.indexOf(s.tag) < 0) return false;
      return true;
    }).sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    var first = vars.first || 10;
    var start = vars.after ? parseInt(String(vars.after).replace('cursor-', ''), 10) : 0;
    var slice = rows.slice(start, start + first);
    var next = start + first;
    return {
      pageInfo: { hasNextPage: next < rows.length, endCursor: 'cursor-' + next },
      nodes: slice
    };
  }

  function graphql(body, headers) {
    var token = headers['X-Shopify-Access-Token'];
    var valid = token === fake.token || fake.issuedTokens.indexOf(token) >= 0;
    fake.calls.push({ kind: 'graphql', query: body.query, variables: body.variables, token: token });
    if (fake.queue.length) {
      var forced = fake.queue.shift();
      return respond(forced.code, forced.body || { errors: 'forced' }, forced.headers);
    }
    if (!valid) return respond(401, { errors: '[API] Invalid API key or access token (unrecognized login or wrong password)' });
    var data = {};
    if (/\bshop\b/.test(body.query)) data.shop = { name: 'BE SMART SHOP', myshopifyDomain: 'algerie-smart.myshopify.com', currencyCode: fake.currency };
    if (/orders\(/.test(body.query)) {
      if (fake.denyOrders) {
        return respond(200, { errors: [{ message: 'Access denied for orders field. Required access: `read_orders` access scope. Also: The user must have a staff permission.', extensions: { code: 'ACCESS_DENIED' } }] });
      }
      data.orders = ordersConnection(body.variables || { first: 1 });
    }
    return respond(200, { data: data });
  }

  g.UrlFetchApp = {
    fetch: function (url, params) {
      params = params || {};
      if (String(url).indexOf(fake.host) !== 0) return previous(url, params);
      var path = String(url).slice(fake.host.length);
      var headers = params.headers || {};
      var body = params.payload ? JSON.parse(params.payload) : null;
      if (path === '/admin/oauth/access_token') {
        fake.calls.push({ kind: 'oauth', body: body });
        if (body && body.grant_type === 'client_credentials' && body.client_id === fake.clientId && body.client_secret === fake.clientSecret) {
          var t = 'shpat_issued_' + (fake.issuedTokens.length + 1) + '_abcdefghijklmnop';
          fake.issuedTokens.push(t);
          return respond(200, { access_token: t, scope: 'read_orders', expires_in: 86399 });
        }
        return respond(400, { error: 'invalid_client' });
      }
      if (/^\/admin\/api\/\d{4}-\d{2}\/graphql\.json$/.test(path)) {
        fake.calls.push({ kind: 'url', path: path, options: params });
        return graphql(body, headers);
      }
      return respond(404, { errors: 'Not Found' });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
