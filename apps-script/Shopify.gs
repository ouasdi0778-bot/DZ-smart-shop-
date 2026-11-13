/**
 * Shopify.gs : importation automatique des commandes Shopify (Releasit COD).
 *
 * Une autre voie, sans accès Shopify : Releasit COD écrit lui-même les commandes
 * dans l'onglet RELEASIT (voir Releasit.gs). Les deux peuvent tourner ensemble :
 * le n° de commande (#1038) évite les doublons.
 *
 * Toutes les 5 minutes, les nouvelles commandes de la boutique sont ajoutées à
 * l'onglet Commandes (statut vide), puis préparées comme n'importe quelle autre
 * ligne (téléphone, wilaya, alertes… voir processNewRows). Les commandes déjà
 * présentes ne sont jamais ajoutées deux fois (le n° de commande Shopify sert
 * de clé).
 *
 * L'accès à Shopify est en LECTURE seule (permission « read_orders »). Il est
 * enregistré dans les « Propriétés du script » (menu DZ Smart Shop › Shopify),
 * jamais dans le classeur ni dans le code. Deux façons de s'authentifier :
 *  - un jeton d'accès (commence par shpat_) ;
 *  - un identifiant client + un secret (application créée dans le Dev Dashboard) :
 *    l'outil demande lui-même un jeton à Shopify et le renouvelle.
 */

var SHOP = {
  PROP_SHOP: 'SHOPIFY_SHOP',
  PROP_TOKEN: 'SHOPIFY_TOKEN',
  PROP_CLIENT_ID: 'SHOPIFY_CLIENT_ID',
  PROP_CLIENT_SECRET: 'SHOPIFY_CLIENT_SECRET',
  PROP_TOKEN_CACHE: 'SHOPIFY_TOKEN_CACHE',
  PROP_LAST_IMPORT: 'SHOPIFY_LAST_IMPORT',
  PROP_LAST_RUN: 'SHOPIFY_LAST_RUN',
  PROP_LAST_ERROR: 'SHOPIFY_LAST_ERROR',
  PAGE: 25,                 // commandes par requête (la limite de coût d'une requête GraphQL est de 1000 points)
  MAX_PAGES: 16,            // 400 commandes au maximum par importation
  OVERLAP_MS: 15 * 60000    // on relit les 15 dernières minutes : les doublons sont ignorés
};

var SHOPIFY_NOT_CONFIGURED_ = 'Shopify n’est pas configuré. Menu « DZ Smart Shop › Shopify › Enregistrer la boutique et l’accès ».';

/* ------------------------------------------------------------------ */
/* Configuration                                                      */
/* ------------------------------------------------------------------ */

function shopifyConfig_() {
  var p = PropertiesService.getScriptProperties();
  var shop = String(p.getProperty(SHOP.PROP_SHOP) || '').trim();
  var token = String(p.getProperty(SHOP.PROP_TOKEN) || '').trim();
  var clientId = String(p.getProperty(SHOP.PROP_CLIENT_ID) || '').trim();
  var clientSecret = String(p.getProperty(SHOP.PROP_CLIENT_SECRET) || '').trim();
  return {
    shop: shop, token: token, clientId: clientId, clientSecret: clientSecret,
    mode: token ? 'token' : 'client',
    configured: !!(shop && (token || (clientId && clientSecret)))
  };
}

/** algerie-smart.myshopify.com, ou '' si l'adresse n'est pas celle d'une boutique Shopify. */
function normalizeShopifyDomain_(raw) {
  var s = String(raw == null ? '' : raw).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(s)) s += '.myshopify.com';
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s) ? s : '';
}

/** Enregistre la boutique et l'accès : un jeton (secret vide) ou un identifiant client + son secret. */
function saveShopifyConfig_(rawShop, rawKey, rawSecret) {
  var shop = normalizeShopifyDomain_(rawShop);
  if (!shop) throw new Error('Adresse de boutique invalide. Exemple : ma-boutique.myshopify.com');
  var key = String(rawKey == null ? '' : rawKey).replace(/\s+/g, '');
  var secret = String(rawSecret == null ? '' : rawSecret).replace(/\s+/g, '');
  if (key.length < 8) throw new Error('Jeton ou identifiant client trop court : copiez-le en entier.');
  var p = PropertiesService.getScriptProperties();
  p.setProperty(SHOP.PROP_SHOP, shop);
  p.deleteProperty(SHOP.PROP_TOKEN_CACHE);
  if (secret) {
    if (secret.length < 8) throw new Error('Secret trop court : copiez-le en entier.');
    p.setProperty(SHOP.PROP_CLIENT_ID, key);
    p.setProperty(SHOP.PROP_CLIENT_SECRET, secret);
    p.deleteProperty(SHOP.PROP_TOKEN);
  } else {
    p.setProperty(SHOP.PROP_TOKEN, key);
    p.deleteProperty(SHOP.PROP_CLIENT_ID);
    p.deleteProperty(SHOP.PROP_CLIENT_SECRET);
  }
  return { shop: shop, mode: secret ? 'client' : 'token' };
}

/* ------------------------------------------------------------------ */
/* Appels à l'API                                                     */
/* ------------------------------------------------------------------ */

function shopifyError_(message, code) {
  var e = new Error(message);
  e.code = code || 0;
  return e;
}

/** Jeton d'accès : celui enregistré, ou un jeton demandé (puis gardé) avec l'identifiant client et son secret. */
function shopifyAccessToken_(forceRefresh) {
  var cfg = shopifyConfig_();
  if (!cfg.configured) throw shopifyError_(SHOPIFY_NOT_CONFIGURED_);
  if (cfg.token) return cfg.token;
  var p = PropertiesService.getScriptProperties();
  if (!forceRefresh) {
    try {
      var cached = JSON.parse(p.getProperty(SHOP.PROP_TOKEN_CACHE) || 'null');
      if (cached && cached.token && cached.exp > Date.now() + 10 * 60000) return cached.token;
    } catch (e) { /* cache illisible : on redemande un jeton */ }
  }
  var resp;
  try {
    resp = UrlFetchApp.fetch('https://' + cfg.shop + '/admin/oauth/access_token', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'client_credentials' }),
      muteHttpExceptions: true,
      followRedirects: false
    });
  } catch (e) {
    throw shopifyError_('Impossible de joindre Shopify (' + (e && e.message ? e.message : e) + ').');
  }
  var json = null;
  try { json = JSON.parse(resp.getContentText() || 'null'); } catch (e) { json = null; }
  if (resp.getResponseCode() !== 200 || !json || !json.access_token) {
    throw shopifyError_('Shopify a refusé l’identifiant client et son secret (erreur ' + resp.getResponseCode() +
      '). Vérifiez-les, et que l’application est bien installée sur la boutique ' + cfg.shop + '.', resp.getResponseCode());
  }
  var seconds = Number(json.expires_in) > 0 ? Number(json.expires_in) : 86399;
  p.setProperty(SHOP.PROP_TOKEN_CACHE, JSON.stringify({ token: json.access_token, exp: Date.now() + seconds * 1000 }));
  return json.access_token;
}

function shopifyErrorText_(errors) {
  if (!errors) return '';
  if (typeof errors === 'string') return errors;
  if (Array.isArray(errors)) {
    return errors.map(function (e) { return e && e.message ? e.message : String(e); }).join(' ; ');
  }
  return JSON.stringify(errors).slice(0, 300);
}

/** Exécute une requête GraphQL (lecture) et renvoie `data`. Gère la limite de débit et le renouvellement du jeton. */
function shopifyGraphql_(query, variables) {
  var cfg = shopifyConfig_();
  if (!cfg.configured) throw shopifyError_(SHOPIFY_NOT_CONFIGURED_);
  var url = 'https://' + cfg.shop + '/admin/api/' + getSettings_().SHOPIFY_API_VERSION + '/graphql.json';
  var refreshed = false;
  for (var attempt = 0; attempt < 4; attempt++) {
    var token = shopifyAccessToken_(false);
    var resp;
    try {
      resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'X-Shopify-Access-Token': token },
        payload: JSON.stringify({ query: query, variables: variables || {} }),
        muteHttpExceptions: true,
        followRedirects: false
      });
    } catch (e) {
      throw shopifyError_('Impossible de joindre Shopify (' + (e && e.message ? e.message : e) + '). Vérifiez l’adresse de la boutique et votre connexion.');
    }
    var code = resp.getResponseCode();
    var text = resp.getContentText() || '';
    var json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }

    if (code === 401) {
      if (cfg.mode === 'client' && !refreshed) { refreshed = true; shopifyAccessToken_(true); continue; }
      throw shopifyError_('Shopify a refusé l’accès (jeton invalide, expiré ou révoqué). Enregistrez-le de nouveau : menu « DZ Smart Shop › Shopify › Enregistrer la boutique et l’accès ».', 401);
    }
    if (code === 402 || code === 403) {
      throw shopifyError_('Shopify refuse l’accès à cette boutique (erreur ' + code + '). Vérifiez que l’application est installée et active.', code);
    }
    if (code === 404) {
      throw shopifyError_('Boutique ou version d’API introuvable (erreur 404). Vérifiez l’adresse ' + cfg.shop + ' et le réglage SHOPIFY_API_VERSION.', 404);
    }
    if (code === 429) { Utilities.sleep(2000 * (attempt + 1)); continue; }
    if (code >= 500) throw shopifyError_('Shopify est indisponible (erreur ' + code + '). Réessayez plus tard.', code);
    if (json === null) throw shopifyError_('Réponse inattendue de Shopify (erreur ' + code + ').', code);

    if (json.errors) {
      var throttled = Array.isArray(json.errors) && json.errors.some(function (e) { return e && e.extensions && e.extensions.code === 'THROTTLED'; });
      if (throttled) { Utilities.sleep(2000 * (attempt + 1)); continue; }
      var msg = shopifyErrorText_(json.errors);
      if (/access denied|read_orders|ACCESS_DENIED/i.test(msg)) {
        throw shopifyError_('Shopify refuse l’accès aux commandes : l’application n’a pas la permission « read_orders ». Ajoutez-la dans la configuration de l’application Shopify, puis réinstallez l’application sur la boutique.', 403);
      }
      throw shopifyError_('Shopify a refusé la demande : ' + msg, code);
    }
    return json.data;
  }
  throw shopifyError_('Shopify est trop sollicité en ce moment : réessayez dans quelques minutes.', 429);
}

/** Vérifie l'accès : nom de la boutique, devise, et permission de lire les commandes. */
function shopifyTest_() {
  var data = shopifyGraphql_('query { shop { name myshopifyDomain currencyCode } orders(first: 1) { nodes { name } } }');
  var shop = (data && data.shop) || {};
  var out = { shop: String(shop.name || ''), domain: String(shop.myshopifyDomain || ''), currency: String(shop.currencyCode || ''), warning: '' };
  if (out.currency && out.currency !== 'DZD') {
    out.warning = 'Attention : cette boutique est en ' + out.currency + ', pas en dinars algériens (DZD). L’outil est prévu pour l’Algérie.';
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Nettoyage des champs (Releasit COD)                                */
/* ------------------------------------------------------------------ */

/** Chiffres arabes-indiens (٠١٢…) et persans en chiffres latins. */
function latinDigits_(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
    .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
}

/** Texte comparable : minuscules, sans accents ni voyelles arabes, alef/ya/ta marbouta unifiés. */
function normalizeLoose_(value) {
  return latinDigits_(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064A ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

var WILAYA_LOOKUP_ = null;
function wilayaLookup_() {
  if (WILAYA_LOOKUP_) return WILAYA_LOOKUP_;
  var map = {};
  var add = function (name, code) {
    var key = normalizeLoose_(name);
    if (!key) return;
    map[key] = code;
    if (key.indexOf('ال') === 0 && key.length > 4) map[key.slice(2)] = code; // sans l'article « ال »
  };
  WILAYAS_AR.forEach(function (n, i) { add(n, i + 1); });
  WILAYA_ALIASES.forEach(function (a) { add(a[1], a[0]); });
  WILAYAS.forEach(function (w) {
    var parts = w.split(' - ');
    add(parts.slice(1).join(' - '), parseInt(parts[0], 10));
  });
  WILAYA_LOOKUP_ = map;
  return map;
}

/**
 * Code de la wilaya (1 à 58) d'un texte libre : « 16 », « Alger », « الجزائر »,
 * « ولاية سطيف », « wilaya de Sétif »… ou null si elle n'est pas reconnue.
 */
function wilayaFromText_(text) {
  var raw = latinDigits_(text).trim();
  if (!raw) return null;
  var byCode = wilayaCode_(raw);
  if (byCode !== null) return byCode;
  var map = wilayaLookup_();
  var key = normalizeLoose_(raw).replace(/^(ولايه|ولايت|wilaya|willaya|w)\s+/, '').replace(/^(de|d)\s+/, '').trim();
  if (!key) return null;
  if (map[key] !== undefined) return map[key];
  var bare = key.indexOf('ال') === 0 ? key.slice(2) : key;
  if (map[bare] !== undefined) return map[bare];
  // Mot par mot : « سطيف العلمة », « wilaya de Sétif ».
  var padded = ' ' + key + ' ';
  var best = null;
  var bestLength = 0;
  Object.keys(map).forEach(function (k) {
    if (k.length >= 4 && k.length > bestLength && padded.indexOf(' ' + k + ' ') >= 0) { best = map[k]; bestLength = k.length; }
  });
  return best;
}

/** « 16 - Alger » pour un code, ou null. */
function wilayaName_(code) {
  return code >= 1 && code <= WILAYAS.length ? WILAYAS[code - 1] : null;
}

/** Retire le titre du champ collé devant sa valeur (« العنوان Rue 5 » devient « Rue 5 »). */
function stripLabel_(value, labels) {
  var v = String(value == null ? '' : value).trim();
  labels.forEach(function (label) {
    if (v.length > label.length && v.toLowerCase().indexOf(label.toLowerCase()) === 0) {
      v = v.slice(label.length).replace(/^[\s:\-–]+/, '');
    }
  });
  return v.trim();
}

/** Premier numéro valide parmi plusieurs écritures (« +2130660… », « 672063914 », « ٠٦٦٠… »). */
function pickPhone_(candidates) {
  var first = '';
  for (var i = 0; i < candidates.length; i++) {
    var raw = latinDigits_(candidates[i]).trim();
    if (!raw) continue;
    if (!first) first = raw;
    var p = normalizePhone(raw);
    if (p.valid) return p.phone;
  }
  return first;
}

/** « Stop desk » pour une livraison au bureau, « Domicile » à domicile, '' si le titre n'est pas reconnu. */
function deliveryModeFromTitle_(title) {
  var t = String(title == null ? '' : title);
  if (/مكتب|bureau|stop ?desk|relais|agence/i.test(t)) return 'Stop desk';
  if (/منزل|بيت|domicile|home/i.test(t)) return 'Domicile';
  return '';
}

function shopifyAmount_(set) {
  return toNumber_(set && set.shopMoney ? set.shopMoney.amount : 0);
}

var SHOPIFY_ORDERS_QUERY_ =
  'query($first: Int!, $after: String, $query: String) {' +
  ' orders(first: $first, after: $after, sortKey: CREATED_AT, query: $query) {' +
  '  pageInfo { hasNextPage endCursor }' +
  '  nodes { id name createdAt cancelledAt phone note tags' +
  '   customAttributes { key value }' +
  '   shippingAddress { name firstName lastName phone address1 address2 city province }' +
  '   shippingLines(first: 2) { nodes { title originalPriceSet { shopMoney { amount } } } }' +
  '   totalPriceSet { shopMoney { amount } } subtotalPriceSet { shopMoney { amount } }' +
  '   lineItems(first: 10) { nodes { title quantity variantTitle } }' +
  '  }' +
  ' }' +
  '}';

/**
 * Une commande Shopify (Releasit COD) devient une ligne de l'onglet Commandes,
 * ou null si elle doit être ignorée (annulée, sans nom…). Les frais de livraison
 * et le total sont ceux annoncés au client dans Shopify.
 */
function shopifyNodeToOrder_(node) {
  if (!node || node.cancelledAt) return null;
  var attrs = {};
  (node.customAttributes || []).forEach(function (a) {
    if (a && a.key != null) attrs[normalizeLoose_(a.key)] = String(a.value == null ? '' : a.value).trim();
  });
  var pick = function (names) {
    for (var i = 0; i < names.length; i++) {
      var v = attrs[normalizeLoose_(names[i])];
      if (v) return v;
    }
    return '';
  };
  var ship = node.shippingAddress || {};

  var client = pick(['الاسم و اللقب', 'الاسم الكامل', 'الاسم', 'nom et prénom', 'nom', 'name', 'full name']);
  if (!client) client = String(ship.name || '').replace(/(^|\s)-(\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!client) return null;

  var phone = pickPhone_([pick(['رقم الهاتف', 'الهاتف', 'téléphone', 'telephone', 'phone', 'tel']), node.phone, ship.phone]);

  var address = stripLabel_(pick(['العنوان كاملا', 'العنوان', 'adresse', 'address']) || ship.address1 || '', ['العنوان كاملا', 'العنوان', 'Adresse', 'Address']);
  if (ship.address2) address = (address ? address + ', ' : '') + String(ship.address2).trim();
  var commune = stripLabel_(pick(['البلدية', 'الدائرة', 'commune', 'daira', 'municipality']), ['البلدية', 'Commune']);

  var wilayaTexts = [pick(['الولاية', 'wilaya', 'province', 'state']), ship.city, ship.province]
    .map(function (t) { return stripLabel_(t, ['الولاية', 'المدينة', 'Wilaya', 'City', 'Ville']); });
  var wilaya = '';
  for (var w = 0; w < wilayaTexts.length && !wilaya; w++) {
    var code = wilayaFromText_(wilayaTexts[w]);
    if (code !== null) wilaya = wilayaName_(code) || '';
  }
  if (!wilaya) wilaya = wilayaTexts.filter(function (t) { return t; })[0] || '';

  var items = ((node.lineItems && node.lineItems.nodes) || []).filter(function (it) { return it; });
  var product = items.map(function (it) {
    var variant = String(it.variantTitle || '').trim();
    var label = String(it.title || '').trim() + (variant && !/^default title$/i.test(variant) ? ' — ' + variant : '');
    return items.length > 1 && toNumber_(it.quantity) > 1 ? label + ' ×' + toNumber_(it.quantity) : label;
  }).join(' + ');
  var qty = items.length === 1 ? Math.max(toNumber_(items[0].quantity), 1) : 1;

  var lines = ((node.shippingLines && node.shippingLines.nodes) || []).filter(function (l) { return l; });
  var shipTitle = lines.length ? String(lines[0].title || '') : '';
  var mode = deliveryModeFromTitle_(shipTitle);
  var shipping = lines.reduce(function (sum, l) { return sum + shopifyAmount_(l.originalPriceSet); }, 0);

  var notes = [];
  if (node.note) notes.push(String(node.note).trim());
  if (shipTitle && !mode) notes.push('Livraison Shopify : ' + shipTitle);

  return {
    id: String(node.name || '').trim(),
    date: node.createdAt ? new Date(node.createdAt) : new Date(),
    client: client,
    phone: phone,
    wilaya: wilaya,
    commune: commune,
    address: address,
    product: product,
    qty: qty,
    price: shopifyAmount_(node.subtotalPriceSet),
    mode: mode || 'Domicile',
    shipping: shipping,
    total: shopifyAmount_(node.totalPriceSet),
    notes: notes.join(' · '),
    source: 'Shopify',
    campaign: pick(['UTM campaign']),
    shopifyId: String(node.id || '').replace(/^.*\//, '')
  };
}

/* ------------------------------------------------------------------ */
/* Importation                                                        */
/* ------------------------------------------------------------------ */

function hasTag_(node, tag) {
  var want = String(tag).toLowerCase();
  return (node.tags || []).some(function (t) { return String(t).toLowerCase() === want; });
}

/** Importe les nouvelles commandes Shopify. Renvoie un résumé. */
function importShopifyOrders_() {
  var summary = { configured: true, fetched: 0, imported: 0, skipped: 0, more: false };
  if (!shopifyConfig_().configured) { summary.configured = false; return summary; }
  var settings = getSettings_();
  var props = PropertiesService.getScriptProperties();
  var last = toDate_(props.getProperty(SHOP.PROP_LAST_IMPORT));
  var since = last ? new Date(last.getTime() - SHOP.OVERLAP_MS) : new Date(Date.now() - settings.SHOPIFY_JOURS_INITIAL * 86400000);
  var search = 'created_at:>=' + since.toISOString().replace(/\.\d{3}Z$/, 'Z');
  if (settings.SHOPIFY_TAG) search += ' tag:' + settings.SHOPIFY_TAG;

  // 1. Lecture chez Shopify (de la plus ancienne à la plus récente), sans bloquer le classeur.
  var nodes = [];
  var after = null;
  for (var page = 0; page < SHOP.MAX_PAGES; page++) {
    var data = shopifyGraphql_(SHOPIFY_ORDERS_QUERY_, { first: SHOP.PAGE, after: after, query: search });
    var conn = (data && data.orders) || { nodes: [], pageInfo: {} };
    nodes = nodes.concat(conn.nodes || []);
    if (!(conn.pageInfo && conn.pageInfo.hasNextPage)) break;
    after = conn.pageInfo.endCursor;
    if (page === SHOP.MAX_PAGES - 1) summary.more = true;
  }
  summary.fetched = nodes.length;

  // 2. Ajout des commandes absentes du classeur.
  var wanted = nodes.filter(function (n) { return !settings.SHOPIFY_TAG || hasTag_(n, settings.SHOPIFY_TAG); });
  var rows = [];
  wanted.forEach(function (n) {
    var o = shopifyNodeToOrder_(n);
    if (o && o.id) rows.push(o); else summary.skipped++;
  });
  if (rows.length) {
    summary.imported = withLock_(function () {
      var ctx = readOrders_();
      var known = {};
      ctx.orders.forEach(function (o) { known[String(o.id).trim()] = true; });
      var added = 0;
      rows.forEach(function (o) {
        if (known[o.id]) { summary.skipped++; return; }
        known[o.id] = true;
        appendOrder_(ctx, o);
        added++;
      });
      if (added) log_({ name: 'Shopify' }, '', 'Importation Shopify', added + ' nouvelle(s) commande(s)');
      return added;
    });
  }

  // 3. Mémoire du point d'arrêt : la plus récente des commandes lues.
  var newest = nodes.reduce(function (max, n) {
    var d = toDate_(n.createdAt);
    return d && (!max || d > max) ? d : max;
  }, null);
  if (newest) props.setProperty(SHOP.PROP_LAST_IMPORT, newest.toISOString());
  props.setProperty(SHOP.PROP_LAST_RUN, new Date().toISOString());
  if (props.getProperty(SHOP.PROP_LAST_ERROR) !== null) props.deleteProperty(SHOP.PROP_LAST_ERROR);

  // 4. Préparation des nouvelles lignes (téléphone, wilaya, alertes, statut « À confirmer »).
  if (summary.imported) processNewRows();
  return summary;
}

/** Point d'entrée du déclencheur automatique (toutes les 5 minutes). */
function importShopifyOrders() {
  try {
    return importShopifyOrders_();
  } catch (e) {
    var msg = String(e && e.message ? e.message : e);
    var p = PropertiesService.getScriptProperties();
    if (p.getProperty(SHOP.PROP_LAST_ERROR) !== msg) {
      p.setProperty(SHOP.PROP_LAST_ERROR, msg);
      log_({ name: 'Shopify' }, '', 'Erreur Shopify', msg);
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fonctions appelées par l'interface et le menu                      */
/* ------------------------------------------------------------------ */

function api_shopifyStatus() {
  var cfg = shopifyConfig_();
  var p = PropertiesService.getScriptProperties();
  return {
    configured: cfg.configured,
    shop: cfg.shop,
    mode: cfg.configured ? cfg.mode : '',
    lastRun: String(p.getProperty(SHOP.PROP_LAST_RUN) || ''),
    lastError: String(p.getProperty(SHOP.PROP_LAST_ERROR) || '')
  };
}

function shopifyImportMessage_(s) {
  if (!s.configured) return SHOPIFY_NOT_CONFIGURED_;
  return s.imported + ' nouvelle(s) commande(s) importée(s) sur ' + s.fetched + ' lue(s)' +
    (s.more ? ' (il en reste : relancez l’importation)' : '') + '.';
}

function api_shopifyImport() {
  var s = importShopifyOrders_();
  return { summary: s, message: shopifyImportMessage_(s) };
}

function api_shopifyTest() {
  var r = shopifyTest_();
  return { ok: true, warning: r.warning, message: 'Connexion réussie : boutique « ' + r.shop + ' » (' + r.currency + ').' + (r.warning ? ' ' + r.warning : '') };
}

function menuShopifySetup() {
  var ui = SpreadsheetApp.getUi();
  var first = ui.prompt('Shopify (1/2)', 'Adresse de votre boutique, par exemple ma-boutique.myshopify.com :', ui.ButtonSet.OK_CANCEL);
  if (first.getSelectedButton() !== ui.Button.OK) return;
  var second = ui.prompt('Shopify (2/2)',
    'Collez le jeton d’accès (il commence par shpat_). Si votre application Shopify fournit plutôt un « Identifiant client » (Client ID) et un « Secret », collez ici l’identifiant client. ' +
    'Ces informations sont enregistrées dans les propriétés protégées du script, jamais dans le classeur :', ui.ButtonSet.OK_CANCEL);
  if (second.getSelectedButton() !== ui.Button.OK) return;
  var key = String(second.getResponseText() || '').trim();
  var secret = '';
  if (!/^shp(at|ca|ua)_/i.test(key)) {
    var third = ui.prompt('Shopify : secret', 'Collez maintenant le « Secret » de l’application :', ui.ButtonSet.OK_CANCEL);
    if (third.getSelectedButton() !== ui.Button.OK) return;
    secret = String(third.getResponseText() || '').trim();
  }
  try {
    saveShopifyConfig_(first.getResponseText(), key, secret);
    installTriggers_(); // l'importation automatique ne tourne que si Shopify est configuré
    ui.alert('Shopify', api_shopifyTest().message + '\n\nL’importation automatique se fait toutes les 5 minutes. Pour importer tout de suite : DZ Smart Shop › Shopify › Importer les commandes maintenant.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Shopify : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuShopifyTest() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Shopify', api_shopifyTest().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Shopify : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuShopifyImport() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Shopify', api_shopifyImport().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Shopify : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}
