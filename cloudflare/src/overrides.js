/*
 * Ce qui change par rapport à Apps Script : placé dans makeApp APRÈS le code de apps-script/*.gs.
 * Une fonction déclarée ici remplace celle du même nom (même portée de fonction).
 *
 * Principe : server.js charge depuis D1 les commandes utiles à la requête (REQ.orders), puis appelle
 * les fonctions de l'outil, qui lisent et modifient ces commandes en mémoire ; server.js enregistre
 * ensuite les changements dans D1 en une seule fois.
 */

/* ---------------- Classeur : jamais utilisé ---------------- */

function ss_() { throw new Error('Le classeur Google n’est pas utilisé par la version Cloudflare.'); }
function sheet_(name) { throw new Error('Onglet « ' + name + ' » : pas dans la version Cloudflare.'); }

/** Position de chaque champ (les fonctions de l'outil s'en servent pour savoir qu'une colonne existe). */
var CF_ORDER_MAP_ = (function () { var m = {}; ORDER_COLUMNS.forEach(function (c, i) { m[c.key] = i; }); return m; })();

/** Les commandes de la requête (chargées depuis D1 par server.js). */
function readOrders_() {
  return {
    map: CF_ORDER_MAP_, width: ORDER_COLUMNS.length, orders: REQ.orders, session: 0,
    get sheet() { throw new Error('Le classeur Google n’est pas utilisé par la version Cloudflare.'); }
  };
}

/** Modifie une commande en mémoire ; elle sera enregistrée dans D1 à la fin de la requête. */
function writeFields_(ctx, order, fields) {
  if (fields.status !== undefined && String(fields.status) !== String(order.status)) {
    noteStatusChange_(order, fields.status);
    if (fields.status === STATUS.CONFIRMED && isBlank_(order.confirmedAt) && fields.confirmedAt === undefined) {
      fields = Object.assign({}, fields, { confirmedAt: new Date() });
    }
  }
  Object.keys(fields).forEach(function (key) { order[key] = fields[key]; });
  if (!order.__new) REQ.dirty[String(order.id)] = order;
}

/** Nouvelles commandes : ajoutées à la requête, insérées dans D1 à la fin. */
function appendOrders_(ctx, list) {
  list.forEach(function (o) {
    ORDER_COLUMNS.forEach(function (c) { if (o[c.key] === undefined) o[c.key] = ''; });
    Object.defineProperty(o, '__new', { value: true, enumerable: false, writable: true });
    REQ.inserts.push(o);
    ctx.orders.push(o);
  });
  return list;
}

function ensureOrderColumn_() {}

/** Réglages, tarifs, équipe, clients, produits : copiés dans D1 (table config), lus une fois par requête. */
function cached_(key, compute) {
  if (REQ && REQ.config && Object.prototype.hasOwnProperty.call(REQ.config, key)) return JSON.parse(REQ.config[key]);
  var value = compute();
  if (REQ) REQ.config[key] = JSON.stringify(value);
  return value;
}
function clearConfigCache_() {}

/** Journal : lignes ajoutées dans D1 à la fin de la requête. */
function writeLogRows_(rows) {
  rows.forEach(function (r) { REQ.journal.push(r); });
}

/** N° des commandes à la corbeille ou effacées (empêchent un n° d'être réutilisé). */
function trashIds_() { return REQ.trashIds || {}; }

/** Prochain n° de commande saisie à la main (le plus grand n° M… est calculé par server.js). */
function nextManualId_() {
  REQ.manualMax = (REQ.manualMax || 0) + 1;
  return 'M' + ('000' + REQ.manualMax).slice(-4);
}

function readArchivedOrders_() { return REQ.archived || []; }

/* ---------------- Heure d'Algérie (le serveur Cloudflare est à l'heure UTC) ---------------- */

function startOfDay_(d) {
  var p = algiersParts_(d);
  return new Date(Date.UTC(p.y, p.M - 1, p.d) - ALGIERS_OFFSET_MS_);
}
function tomorrowAt_(now, hour) {
  var p = algiersParts_(now);
  return new Date(Date.UTC(p.y, p.M - 1, p.d + 1, hour) - ALGIERS_OFFSET_MS_);
}

/* ---------------- Pas encore dans la version Cloudflare (étape 2) ---------------- */

function invalidateOrdersCache_() {}
function applyStockMoves_() { return 0; }
function releasitQuickSync_() { return 0; }
function timed_(label, fn) { return fn(); }
function notePerf_() {}
function healthSummary_() { return null; }
function api_importStatus() {
  return {
    releasit: { found: false, missing: [], lastRun: '', lastError: '' },
    shopify: { configured: false },
    sms: null,
    cloud: true
  };
}

/** Compteurs du menu : calculés par server.js avec D1, après l'enregistrement (voir fastCounts). */
function countsData_() { return { __fast: true }; }

/* ---------------- Étape 2 ---------------- */

/** Client « signalé » : gardé dans les réglages clients de D1, recopié dans l'onglet Clients par Apps Script. */
function flagClient_(ctx, o, text) {
  var p = normalizePhone(o.phone);
  if (!p.valid) return false;
  var clients = readClients_();
  clients.flags = clients.flags || {};
  clients.flags[p.phone] = String(text);
  REQ.config['cfg:clients'] = JSON.stringify(clients);
  REQ.configWrites['cfg:clients'] = REQ.config['cfg:clients'];
  REQ.notes.push({ id: p.phone, kind: 'flag', info: JSON.stringify({ text: String(text), name: String(o.client || '') }) });
  refreshClientAlerts_(ctx, p.phone);
  return true;
}

/**
 * Retour abîmé : la commande est marquée ici ; le stock (onglet Produits du classeur) est corrigé
 * par Apps Script quand il recopie ce changement (voir Cloud.gs).
 */
function api_markReturnDamaged(id) {
  var user = requireStockAccess_();
  var ctx = readOrders_();
  var o = findOrder_(ctx, id);
  if (!o) throw new Error('Commande ' + id + ' introuvable.');
  if (o.status !== STATUS.RETURNED || String(o.stockMove).trim() !== STOCK_BACK_) {
    throw new Error('Seul un retour reçu et remis en stock peut être marqué abîmé.');
  }
  writeFields_(ctx, o, { stockMove: STOCK_DAMAGED_, updated: new Date() });
  log_(user, o.id, 'Stock : retour abîmé', 'Retiré du stock (onglet Produits mis à jour dans la minute)');
  return { order: serializeOrder_(o), message: 'Retour ' + o.id + ' marqué abîmé : retiré du stock.' };
}

/** Les mouvements de stock sont faits par Apps Script sur le classeur (voir Cloud.gs) : rien ici. */
function logStockMoves_() {}

/* Lien avec la version Cloudflare (Cloud.gs) : ici, on EST la version Cloudflare. */
function cloudLive_() { return false; }
function cloudGuard_() {}
function cloudConfigChanged_() {}
function cloudOutboxAdd_() {}
function cloudBootInfo_() { return null; }
