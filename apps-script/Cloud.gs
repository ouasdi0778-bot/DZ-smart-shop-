/**
 * Cloud.gs : lien avec la version Cloudflare de l'application (plus rapide).
 *
 * Étape 1 (essai) : la version Cloudflare travaille sur une COPIE des données ; cette application
 * Google reste la vraie. On peut recopier les données à tout moment.
 *
 *  - Administration › Connexions › Cloudflare : l'adresse de l'application Cloudflare, puis
 *    « Relier et copier les données ». Une clé partagée est créée ici et enregistrée là-bas au
 *    premier contact ; elle n'est jamais affichée.
 *  - Connexion : l'application Cloudflare renvoie vers le lien de CETTE application avec « ?cf=1 ».
 *    Google sait qui vous êtes ; un jeton signé avec la clé (valable 30 jours) vous renvoie
 *    vers Cloudflare. Seuls les membres de l'onglet Équipe (et le propriétaire) y entrent.
 */

var CLOUD = {
  PROP_URL: 'CF_URL',
  PROP_SECRET: 'CF_SECRET',
  PROP_LAST: 'CF_LAST_COPY',
  CHUNK: 250,
  TOKEN_DAYS: 30
};

function cloudConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    url: String(p.getProperty(CLOUD.PROP_URL) || '').replace(/\/+$/, ''),
    secret: String(p.getProperty(CLOUD.PROP_SECRET) || ''),
    last: String(p.getProperty(CLOUD.PROP_LAST) || '')
  };
}

/** Appel à l'application Cloudflare (pont), avec la clé partagée. */
function cloudFetch_(path, payload) {
  var cfg = cloudConfig_();
  if (!cfg.url) throw new Error('Adresse de l’application Cloudflare non enregistrée.');
  var res = UrlFetchApp.fetch(cfg.url + path, {
    method: payload ? 'post' : 'get',
    contentType: 'application/json',
    payload: payload ? JSON.stringify(payload) : undefined,
    headers: { 'X-DZ-Key': cfg.secret },
    muteHttpExceptions: true,
    followRedirects: false
  });
  var code = res.getResponseCode();
  var body = null;
  try { body = JSON.parse(res.getContentText()); } catch (e) { body = null; }
  if (code >= 300 || !body || !body.ok) {
    throw new Error('Cloudflare : ' + (body && body.error ? body.error : 'réponse inattendue (erreur ' + code + '). Vérifiez l’adresse.'));
  }
  return body.data;
}

/** Une commande « à plat » : les champs des colonnes, les dates en texte. */
function plainOrder_(o) {
  var out = {};
  ORDER_COLUMNS.forEach(function (c) {
    var v = o[c.key];
    out[c.key] = v instanceof Date ? (isNaN(v.getTime()) ? '' : v.toISOString()) : (v === undefined || v === null ? '' : v);
  });
  return out;
}

/** Tout ce qui est copié : réglages (tels que l'outil les calcule), commandes, archive, corbeille. */
function cloudSnapshot_() {
  var wilayas = getWilayaList_();
  var config = {
    'cfg:settings': JSON.stringify(getSettings_()),
    'cfg:wilayas': JSON.stringify(wilayas),
    'cfg:rates': JSON.stringify(readRates_(wilayas)),
    'cfg:team': JSON.stringify(readTeam_()),
    'cfg:clients': JSON.stringify(readClients_()),
    'cfg:products': JSON.stringify(readCatalog_())
  };
  var trash = [];
  var t = readTrash_();
  if (t) {
    var extra = {};
    t.values[0].forEach(function (title, i) { extra[normalizeText_(title)] = i; });
    var cell = function (row, title) { var i = extra[normalizeText_(title)]; return i === undefined ? '' : row[i]; };
    for (var r = 1; r < t.values.length; r++) {
      var o = {};
      ORDER_COLUMNS.forEach(function (c) { o[c.key] = t.map[c.key] === undefined ? '' : t.values[r][t.map[c.key]]; });
      if (!String(o.id).trim()) continue;
      trash.push({
        order: plainOrder_(o), deletedAt: iso_(cell(t.values[r], TRASH.EXTRA[0])),
        deletedBy: String(cell(t.values[r], TRASH.EXTRA[1])), reason: String(cell(t.values[r], TRASH.EXTRA[2]))
      });
    }
  }
  var blocked = [];
  var sh = ss_().getSheetByName(TRASH.BLOCKED);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (row) { var id = String(row[0]).trim(); if (id) blocked.push(id); });
  }
  var owner = String(PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL') || '');
  return {
    config: config,
    kv: owner ? { OWNER_EMAIL: owner } : {},
    orders: readOrders_().orders.map(plainOrder_),
    archive: readArchivedOrders_().map(plainOrder_),
    trash: trash,
    blocked: blocked
  };
}

/** Copie complète (remplace tout ce que contient la version Cloudflare). */
function cloudImport_() {
  var snap = cloudSnapshot_();
  cloudFetch_('/bridge/import', { reset: true, config: snap.config, kv: snap.kv, trash: snap.trash, blocked: snap.blocked });
  for (var i = 0; i < snap.orders.length; i += CLOUD.CHUNK) {
    cloudFetch_('/bridge/import', { orders: snap.orders.slice(i, i + CLOUD.CHUNK), seqFrom: i });
  }
  for (var j = 0; j < snap.archive.length; j += CLOUD.CHUNK) {
    cloudFetch_('/bridge/import', { archive: snap.archive.slice(j, j + CLOUD.CHUNK) });
  }
  cloudFetch_('/bridge/import', { done: true });
  PropertiesService.getScriptProperties().setProperty(CLOUD.PROP_LAST, new Date().toISOString());
  return { orders: snap.orders.length, archive: snap.archive.length, trash: snap.trash.length };
}

/** Administration › Connexions › Cloudflare : relie l'application Cloudflare, puis copie les données. */
function api_cloudConnect(url) {
  var user = requireAdmin_();
  url = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(url)) throw new Error('Adresse invalide. Exemple : https://dz-smart-shop.votre-nom.workers.dev');
  var p = PropertiesService.getScriptProperties();
  var secret = p.getProperty(CLOUD.PROP_SECRET) || (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  p.setProperty(CLOUD.PROP_URL, url);
  p.setProperty(CLOUD.PROP_SECRET, secret);
  var gateway = '';
  try { gateway = ScriptApp.getService().getUrl() || ''; } catch (e) { gateway = ''; }
  cloudFetch_('/bridge/register', { secret: secret, gateway: gateway, shop: getSettings_().NOM_BOUTIQUE });
  var r = cloudImport_();
  adminLog_(user, 'Cloudflare', 'Relié à ' + url + ' · ' + r.orders + ' commandes copiées');
  return { message: 'Relié. ' + plural_(r.orders, 'commande copiée', 'commandes copiées') + (r.archive ? ' (+ ' + r.archive + ' archivées)' : '') + '. Ouvrez la version Cloudflare.', connections: connectionsData_() };
}

/** Recopie les données (la version Cloudflare repart de l'état actuel du classeur). */
function api_cloudCopy() {
  var user = requireAdmin_();
  if (!cloudConfig_().secret) throw new Error('Reliez d’abord l’application Cloudflare.');
  var r = cloudImport_();
  adminLog_(user, 'Cloudflare', 'Données recopiées · ' + r.orders + ' commandes');
  return { message: plural_(r.orders, 'commande recopiée', 'commandes recopiées') + '.', connections: connectionsData_() };
}

function cloudStatus_() {
  var cfg = cloudConfig_();
  return { url: cfg.url, linked: !!(cfg.url && cfg.secret), last: cfg.last };
}

/** Jeton de connexion pour la version Cloudflare : « v1.<données>.<signature> » (voir server.js). */
function cloudToken_(email, secret) {
  var data = Utilities.base64EncodeWebSafe(JSON.stringify({ e: email, x: Date.now() + CLOUD.TOKEN_DAYS * 86400000 })).replace(/=+$/, '');
  var head = 'v1.' + data;
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(head, secret)).replace(/=+$/, '');
  return head + '.' + sig;
}

/** Page de connexion (lien de l'application avec ?cf=1) : renvoie vers Cloudflare avec un jeton. */
function cloudGateway_() {
  var cfg = cloudConfig_();
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { email = ''; }
  var body;
  if (!cfg.url || !cfg.secret) {
    body = '<p>La version Cloudflare n’est pas encore reliée. Administrateur : Administration › Connexions › Cloudflare.</p>';
  } else if (!email) {
    body = '<p>Google ne donne pas votre adresse. Ouvrez ce lien avec le compte Google de l’équipe.</p>';
  } else {
    var link = cfg.url + '/#jeton=' + encodeURIComponent(cloudToken_(email, cfg.secret));
    body = '<p>Connecté(e) : <strong>' + escapeHtml_(email) + '</strong></p>' +
      '<a class="btn" href="' + escapeHtml_(link) + '" target="_top">Ouvrir DZ Smart Shop</a>' +
      '<p class="small">La connexion dure 30 jours sur cet appareil.</p>';
  }
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#10241B;font:15px/1.5 system-ui,sans-serif;color:#15181E}' +
    '.c{background:#fff;border-radius:16px;padding:28px 24px;max-width:420px;width:calc(100% - 32px);display:grid;gap:14px}' +
    'h1{margin:0;font-size:22px}p{margin:0}.btn{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:10px;background:#0B6B4C;color:#fff;font-weight:600;text-decoration:none}' +
    '.small{font-size:13px;color:#5B6170}</style></head><body><div class="c"><h1>' + escapeHtml_(APP_NAME) + '</h1>' + body + '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(APP_NAME).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
