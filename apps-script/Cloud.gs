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
 *
 * Étape 2 (après le basculement, Administration › Connexions › Cloudflare › Basculer) : la version
 * Cloudflare devient la vraie application pour Commandes, Confirmation, Expédier et Suivi (Ecotrack,
 * SMS des changements de statut, tâches automatiques). Ce classeur reste :
 *  - la porte d'entrée des commandes : RELEASIT et Shopify arrivent ici, sont préparées comme avant,
 *    puis envoyées à Cloudflare (chaque minute) ;
 *  - une copie à jour : chaque minute, les changements faits dans Cloudflare sont recopiés dans
 *    l'onglet Commandes (et Corbeille, Clients) ; le stock (onglet Produits) est mis à jour ici ;
 *  - l'application des pages Bénéfices, Stock, Statistiques et Administration (lien « ?google=1 »).
 * Les réglages (onglets Paramètres, Équipe, Produits…) et les clés Ecotrack et SMS sont renvoyés à
 * Cloudflare quand ils changent.
 */

var CLOUD = {
  PROP_URL: 'CF_URL',
  PROP_SECRET: 'CF_SECRET',
  PROP_LAST: 'CF_LAST_COPY',
  PROP_LIVE: 'CF_LIVE',           // date du basculement (vide : essai)
  PROP_SEQ: 'CF_SEQ',             // dernier changement recopié
  PROP_OUTBOX: 'CF_OUTBOX',       // n° des nouvelles commandes à envoyer
  PROP_DIRTY: 'CF_CONFIG_DIRTY',  // réglages à renvoyer
  PROP_SYNC: 'CF_LAST_SYNC',
  PROP_ERROR: 'CF_LAST_ERROR',
  SECRETS: ['ECOTRACK_URL', 'ECOTRACK_TOKEN', 'SMS_API_KEY', 'SMS_FROM', 'OWNER_EMAIL'],
  PAGES: 4,                       // au plus 4 × 300 changements recopiés par minute
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
/** Réglages tels que l'outil les calcule (lus par la version Cloudflare). */
function cloudConfigSnapshot_() {
  var wilayas = getWilayaList_();
  return {
    'cfg:settings': JSON.stringify(getSettings_()),
    'cfg:wilayas': JSON.stringify(wilayas),
    'cfg:rates': JSON.stringify(readRates_(wilayas)),
    'cfg:team': JSON.stringify(readTeam_()),
    'cfg:clients': JSON.stringify(readClients_()),
    'cfg:products': JSON.stringify(readCatalog_())
  };
}

function cloudSnapshot_() {
  var config = cloudConfigSnapshot_();
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
function cloudImport_(goLive) {
  var snap = cloudSnapshot_();
  cloudFetch_('/bridge/import', { reset: true, goLive: !!goLive, config: snap.config, kv: snap.kv, trash: snap.trash, blocked: snap.blocked });
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
  if (cloudLive_()) throw new Error('La version Cloudflare est déjà la vraie application : revenez d’abord à l’application Google pour la relier à nouveau.');
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
  if (cloudLive_()) throw new Error('Après le basculement, les données ne sont plus recopiées depuis le classeur : c’est l’inverse (chaque minute).');
  var r = cloudImport_();
  adminLog_(user, 'Cloudflare', 'Données recopiées · ' + r.orders + ' commandes');
  return { message: plural_(r.orders, 'commande recopiée', 'commandes recopiées') + '.', connections: connectionsData_() };
}

function cloudStatus_() {
  var cfg = cloudConfig_();
  var p = PropertiesService.getScriptProperties();
  return {
    url: cfg.url, linked: !!(cfg.url && cfg.secret), last: cfg.last,
    live: String(p.getProperty(CLOUD.PROP_LIVE) || ''), sync: String(p.getProperty(CLOUD.PROP_SYNC) || ''),
    error: String(p.getProperty(CLOUD.PROP_ERROR) || ''), waiting: readJsonProp_(p.getProperty(CLOUD.PROP_OUTBOX), []).length
  };
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

/* ================================================================ */
/* Étape 2 : après le basculement                                   */
/* ================================================================ */

/** La version Cloudflare est-elle la vraie application ? */
function cloudLive_() {
  return !!PropertiesService.getScriptProperties().getProperty(CLOUD.PROP_LIVE);
}

/** Pour la page : après le basculement, les pages des commandes sont sur Cloudflare. */
function cloudBootInfo_() {
  if (!cloudLive_()) return null;
  return { live: true, url: cloudConfig_().url };
}

/** Actions sur les commandes : refusées ici après le basculement (elles se font dans Cloudflare). */
function cloudGuard_() {
  if (!cloudLive_()) return;
  throw new Error('Les commandes se gèrent maintenant dans la version Cloudflare : ' + cloudConfig_().url);
}

/** Un réglage a changé : il sera renvoyé à Cloudflare à la prochaine minute. */
function cloudConfigChanged_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty(CLOUD.PROP_LIVE)) p.setProperty(CLOUD.PROP_DIRTY, '1');
}

/** Nouvelles commandes préparées (processNewRowsNow_) : envoyées à Cloudflare à la prochaine minute. */
function cloudOutboxAdd_(ids) {
  if (!ids || !ids.length || !cloudLive_()) return;
  var p = PropertiesService.getScriptProperties();
  var list = readJsonProp_(p.getProperty(CLOUD.PROP_OUTBOX), []);
  ids.forEach(function (id) { if (list.indexOf(id) < 0) list.push(id); });
  p.setProperty(CLOUD.PROP_OUTBOX, JSON.stringify(list.slice(-2000)));
}

/** Réglages et clés (Ecotrack, SMS) envoyés à Cloudflare. */
function cloudPushConfig_() {
  var p = PropertiesService.getScriptProperties();
  var props = {};
  CLOUD.SECRETS.forEach(function (k) { props[k] = String(p.getProperty(k) || ''); });
  CFG_MEMO_ = {}; // relus dans les onglets
  cloudFetch_('/bridge/config', { config: cloudConfigSnapshot_(), props: props, dropCache: true });
}

/** Une case telle qu'on la compare (une date et son texte ISO sont la même valeur). */
function cloudCell_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  return v === null || v === undefined ? '' : String(v);
}

var CLOUD_ISO_ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Commande reçue de Cloudflare : les dates (texte ISO) redeviennent des dates du classeur. */
function cloudOrderIn_(plain) {
  var o = {};
  ORDER_COLUMNS.forEach(function (c) {
    var v = plain[c.key];
    o[c.key] = typeof v === 'string' && CLOUD_ISO_.test(v) ? new Date(v) : (v === null || v === undefined ? '' : v);
  });
  return o;
}

/**
 * Recopie dans le classeur les changements faits dans Cloudflare (sous verrou), puis met le stock à
 * jour. Renvoie les marques de stock posées ici, à renvoyer à Cloudflare.
 * La colonne « Mouvement stock » appartient au classeur : elle n'est jamais écrasée par Cloudflare.
 */
function cloudApplyChanges_(changes) {
  var out = { updated: 0, added: 0, removed: 0, purged: 0, notes: 0, marks: [] };
  if (!changes || !changes.length) return out;
  return withLock_(function () {
    var ctx = readOrders_();
    var byId = {};
    ctx.orders.forEach(function (o) { byId[String(o.id).trim()] = o; });
    var adds = [];
    var damaged = [];
    var deletes = {};
    var purges = [];
    var notes = [];
    changes.forEach(function (c) {
      var id = String(c.id || '').trim();
      if (!id) return;
      if (c.kind === 'insert' || c.kind === 'update') {
        if (!c.order) return; // commande supprimée depuis : un changement « delete » suit
        var inc = cloudOrderIn_(c.order);
        var o = byId[id];
        if (!o) {
          inc.stockMove = '';
          adds.push(inc);
          byId[id] = inc;
          return;
        }
        var fields = {};
        ORDER_COLUMNS.forEach(function (col) {
          if (col.key === 'id' || col.key === 'stockMove') return;
          if (cloudCell_(o[col.key]) !== cloudCell_(inc[col.key])) fields[col.key] = inc[col.key];
        });
        if (String(c.order.stockMove || '').trim() === STOCK_DAMAGED_ && String(o.stockMove || '').trim() === STOCK_BACK_) damaged.push(o);
        if (Object.keys(fields).length) { writeFields_(ctx, o, fields); out.updated++; }
      } else if (c.kind === 'delete') {
        var info = readJsonProp_(c.info, {});
        var k = String(info.by || '') + '\n' + String(info.reason || '');
        (deletes[k] = deletes[k] || []).push(id);
      } else if (c.kind === 'purge') {
        purges.push(id);
      } else {
        notes.push(c);
      }
    });
    // 1. Commandes créées (ou sorties de la corbeille) dans Cloudflare.
    if (adds.length) {
      appendOrders_(ctx, adds);
      out.added = adds.length;
      var t = readTrash_();
      if (t) {
        var rows = [];
        adds.forEach(function (o) { (t.rowsById[String(o.id).trim()] || []).forEach(function (r) { rows.push(r + 1); }); });
        if (rows.length) deleteSheetRows_(t.sh, rows);
      }
    }
    // 2. Retours abîmés : retirés du stock ici.
    damaged.forEach(function (o) { damageReturn_(ctx, o, { name: 'Cloudflare' }); });
    // 3. Liste noire et clients signalés (onglet Clients).
    notes.forEach(function (c) {
      var kind = String(c.kind);
      if (kind === 'blacklist:on' || kind === 'blacklist:off') {
        var p = normalizePhone(c.id);
        if (p.valid) { writeBlacklist_(p, kind === 'blacklist:on', String(c.info || '')); out.notes++; }
      } else if (kind === 'flag') {
        var f = readJsonProp_(c.info, {});
        if (flagClient_(ctx, { phone: c.id, client: f.name || '' }, String(f.text || ''))) out.notes++;
      }
    });
    // 4. Stock : colis partis, retours reçus (comme avant, avec l'onglet Commandes à jour).
    var before = {};
    ctx.orders.forEach(function (o) { before[String(o.id).trim()] = String(o.stockMove == null ? '' : o.stockMove); });
    applyStockMoves_(ctx);
    ctx.orders.forEach(function (o) {
      var id = String(o.id).trim();
      var now = String(o.stockMove == null ? '' : o.stockMove);
      if (now !== before[id]) out.marks.push({ id: id, stockMove: now });
    });
    damaged.forEach(function (o) { out.marks.push({ id: String(o.id).trim(), stockMove: STOCK_DAMAGED_ }); });
    // 5. Corbeille (en dernier : supprimer des lignes décale les suivantes).
    Object.keys(deletes).forEach(function (k) {
      var parts = k.split('\n');
      out.removed += trashOrders_(ctx, deletes[k], parts[1], { name: parts[0] || 'Cloudflare' }, true).deleted.length;
    });
    if (purges.length) out.purged = purgeTrash_(purges, { name: 'Cloudflare' }).purged.length;
    // Les SMS de ces changements de statut ont déjà été mis en file par Cloudflare.
    SMS_PENDING_ = [];
    return out;
  });
}

/** Envoie à Cloudflare les nouvelles commandes préparées ici. */
function cloudSendOutbox_() {
  var p = PropertiesService.getScriptProperties();
  var ids = readJsonProp_(p.getProperty(CLOUD.PROP_OUTBOX), []);
  if (!ids.length) return 0;
  var ctx = readOrders_();
  var list = [];
  ids.forEach(function (id) { var o = findOrder_(ctx, id); if (o && o.status) list.push(plainOrder_(o)); });
  var added = 0;
  for (var i = 0; i < list.length; i += CLOUD.CHUNK) {
    added += (cloudFetch_('/bridge/orders', { orders: list.slice(i, i + CLOUD.CHUNK) }).added || []).length;
  }
  // Retirées de la liste (d'autres ont pu y être ajoutées pendant l'envoi).
  withLock_(function () {
    var cur = readJsonProp_(p.getProperty(CLOUD.PROP_OUTBOX), []).filter(function (id) { return ids.indexOf(id) < 0; });
    if (cur.length) p.setProperty(CLOUD.PROP_OUTBOX, JSON.stringify(cur)); else p.deleteProperty(CLOUD.PROP_OUTBOX);
  });
  return added;
}

/**
 * Chaque minute, après le basculement : nouvelles commandes → Cloudflare ; changements de Cloudflare
 * → classeur (et stock) ; marques de stock et réglages → Cloudflare.
 */
function cloudSync_() {
  if (!cloudLive_()) return null;
  var p = PropertiesService.getScriptProperties();
  var out = { sent: 0, updated: 0, added: 0, removed: 0, marks: 0, config: false };
  try {
    out.sent = cloudSendOutbox_();
    var after = Number(p.getProperty(CLOUD.PROP_SEQ)) || 0;
    for (var page = 0; page < CLOUD.PAGES; page++) {
      var data = cloudFetch_('/bridge/changes', { after: after, limit: 300 });
      var r = cloudApplyChanges_(data.changes || []);
      out.updated += r.updated; out.added += r.added; out.removed += r.removed;
      if (r.marks.length) { cloudFetch_('/bridge/marks', { marks: r.marks }); out.marks += r.marks.length; }
      after = Number(data.last) || after;
      p.setProperty(CLOUD.PROP_SEQ, String(after));
      if (!data.more) break;
    }
    if (p.getProperty(CLOUD.PROP_DIRTY)) {
      p.deleteProperty(CLOUD.PROP_DIRTY); // effacé avant : un changement pendant l'envoi sera renvoyé
      cloudPushConfig_();
      out.config = true;
    }
    p.setProperty(CLOUD.PROP_SYNC, new Date().toISOString());
    if (p.getProperty(CLOUD.PROP_ERROR) !== null) p.deleteProperty(CLOUD.PROP_ERROR);
    return out;
  } catch (e) {
    p.setProperty(CLOUD.PROP_ERROR, String(e && e.message ? e.message : e).slice(0, 300));
    return { error: String(e && e.message ? e.message : e) };
  }
}

/**
 * Basculer (administrateur) : la version Cloudflare devient la vraie application.
 * opts.clear : vider d'abord les onglets Commandes et Corbeille (commandes de test) ; leurs n° sont
 * gardés dans « Numéros effacés » pour que Releasit et Shopify ne les recréent pas.
 */
function api_cloudGoLive(opts) {
  var user = requireAdmin_();
  opts = opts || {};
  if (!cloudConfig_().secret) throw new Error('Reliez d’abord l’application Cloudflare.');
  if (cloudLive_()) throw new Error('C’est déjà fait : la version Cloudflare est la vraie application.');
  var cleared = 0;
  if (opts.clear) {
    cleared = withLock_(function () {
      var ctx = readOrders_();
      var ids = ctx.orders.map(function (o) { return String(o.id).trim(); }).filter(function (id) { return id; });
      var t = readTrash_();
      if (t) Object.keys(t.rowsById).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      blockIds_(ids, user);
      deleteSheetRows_(ctx.sheet, ctx.orders.map(function (o) { return o._row; }));
      if (t) {
        var rows = [];
        Object.keys(t.rowsById).forEach(function (id) { t.rowsById[id].forEach(function (r) { rows.push(r + 1); }); });
        deleteSheetRows_(t.sh, rows);
      }
      invalidateOrdersCache_();
      return ids.length;
    });
  }
  var p = PropertiesService.getScriptProperties();
  var r = cloudImport_(true);
  var live = cloudFetch_('/bridge/live', { live: true });
  p.setProperty(CLOUD.PROP_SEQ, String(live.seq || 0));
  p.deleteProperty(CLOUD.PROP_OUTBOX);
  p.setProperty(CLOUD.PROP_LIVE, new Date().toISOString());
  cloudPushConfig_();
  p.deleteProperty(CLOUD.PROP_DIRTY);
  adminLog_(user, 'Cloudflare', 'Basculement : la version Cloudflare est la vraie application' + (opts.clear ? ' · ' + cleared + ' commandes de test effacées' : ''));
  return {
    message: 'C’est fait : utilisez maintenant la version Cloudflare' + (opts.clear ? ' (' + plural_(cleared, 'commande de test effacée', 'commandes de test effacées') + ')' : ' (' + plural_(r.orders, 'commande copiée', 'commandes copiées') + ')') + '.',
    connections: connectionsData_()
  };
}

/** Revenir à l'application Google (secours) : dernière recopie, puis Cloudflare repasse en essai. */
function api_cloudStopLive() {
  var user = requireAdmin_();
  if (!cloudLive_()) throw new Error('La version Cloudflare n’est pas la vraie application.');
  var s = cloudSync_();
  if (s && s.error) throw new Error('Dernière recopie impossible : ' + s.error + ' Réessayez dans une minute.');
  cloudFetch_('/bridge/live', { live: false });
  var p = PropertiesService.getScriptProperties();
  [CLOUD.PROP_LIVE, CLOUD.PROP_SEQ, CLOUD.PROP_OUTBOX, CLOUD.PROP_DIRTY].forEach(function (k) { p.deleteProperty(k); });
  adminLog_(user, 'Cloudflare', 'Retour à l’application Google');
  return { message: 'L’application Google est de nouveau la vraie. La version Cloudflare repasse en essai.', connections: connectionsData_() };
}
