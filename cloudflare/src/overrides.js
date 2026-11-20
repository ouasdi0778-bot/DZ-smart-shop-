/*
 * Ce qui change par rapport à Apps Script : placé dans makeApp APRÈS le code de apps-script/*.gs.
 * Une fonction déclarée ici remplace celle du même nom (même portée de fonction).
 *
 * Principe : server.js charge depuis D1 les commandes utiles à la requête (REQ.orders), puis appelle
 * les fonctions de l'outil, qui lisent et modifient ces commandes en mémoire ; server.js enregistre
 * ensuite les changements dans D1 en une seule fois.
 */

/*
 * Fonctions d'origine gardées sous le nom gas_… (voir build.js) :
 * @wrap applyStockMoves_ logStockMoves_ api_markReturnDamaged flagClient_ */

/* ---------------- Classeur : seulement les onglets gardés dans D1 (étape 3) ---------------- */

/** Étape 3 : les onglets de réglages, stock et dépenses sont dans D1 (voir gas-shim.js). */
function cfFull_() { return !!(REQ && REQ.tabStore); }

function ss_() {
  if (cfFull_()) return CF_SPREADSHEET_;
  throw new Error('Le classeur Google n’est pas utilisé par la version Cloudflare.');
}

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

/**
 * Réglages, tarifs, équipe, clients, produits : tels que l'outil les calcule (table config de D1), lus
 * une fois par requête. Étape 3 : recalculés depuis les onglets quand l'un d'eux change.
 */
function cached_(key, compute) {
  if (REQ && REQ.config && Object.prototype.hasOwnProperty.call(REQ.config, key)) return JSON.parse(REQ.config[key]);
  var value = compute();
  if (REQ) {
    REQ.config[key] = JSON.stringify(value);
    if (cfFull_()) REQ.configWrites[key] = REQ.config[key];
  }
  return value;
}
function clearConfigCache_(keys) {
  if (!cfFull_()) return; // étapes 1 et 2 : réglages copiés depuis le classeur
  (keys || allConfigKeys_()).forEach(function (k) { delete REQ.config[k]; REQ.configDrop[k] = true; });
}
/** Après une action (étape 3) : les réglages dont l'onglet a changé sont recalculés et enregistrés. */
function cfRefreshConfig_() {
  var drop = REQ.configDrop || {};
  var keys = Object.keys(drop);
  if (!keys.length) return;
  var getters = {
    'cfg:settings': getSettings_, 'cfg:wilayas': getWilayaList_, 'cfg:rates': function () { return readRates_(getWilayaList_()); },
    'cfg:clients': readClients_, 'cfg:team': readTeam_, 'cfg:products': readCatalog_
  };
  keys.forEach(function (k) { delete REQ.config[k]; });
  keys.forEach(function (k) { if (getters[k]) getters[k](); });
  REQ.configDrop = {};
}

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
/** Mouvements de stock : faits ici à l'étape 3 (avant : par Apps Script, voir Cloud.gs). */
function applyStockMoves_(ctx) { return cfFull_() ? gas_applyStockMoves_(ctx) : { out: 0, back: 0 }; }
function releasitQuickSync_() { return 0; }
function timed_(label, fn) { return fn(); }
function notePerf_() {}
/** Pastille d'alerte du menu (administrateur) : calculée par server.js (tâches de Cloudflare). */
function healthSummary_() { return REQ.healthSummary || null; }
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
  if (cfFull_()) return gas_flagClient_(ctx, o, text); // étape 3 : onglet Clients dans D1
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
  if (cfFull_()) return gas_api_markReturnDamaged(id); // étape 3 : le stock est retiré ici
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

/** Mouvements de stock : table moves de D1 (étape 3), recopiée dans l'onglet « Mouvements stock ». */
function logStockMoves_(rows) {
  if (!cfFull_()) return; // étape 2 : faits par Apps Script sur le classeur (voir Cloud.gs)
  rows.forEach(function (r) { REQ.moveRows.push(r); });
}
/** Derniers mouvements de stock : lus dans D1 par server.js (REQ.moves, les plus récents d'abord ; ref = n° dans la base). */
function readStockMoves_(limit) {
  return (REQ.moves || []).slice(0, limit || 300).map(function (x) { return moveFromRow_(x.row, x.seq); });
}
/** Mouvements liés à une commande, par modèle : comptés par la base (server.js, REQ.moveCounts). */
function stockOrderMoveCounts_() {
  var out = {};
  (REQ.moveCounts || []).forEach(function (x) { var k = catalogKey_(x.p, x.m); out[k] = (out[k] || 0) + Number(x.n || 0); });
  return out;
}
/** Un mouvement par son n° dans la base (lu par server.js). */
function stockMoveByRef_(ref) {
  var m = REQ.oneMove;
  return m && String(m.seq) === String(ref) ? moveFromRow_(m.row, m.seq) : null;
}
function stockUndoNotes_() { return REQ.undoNotes || []; }
/** Mouvements faits après la date demandée : additionnés par modèle par la base (server.js). */
function stockMovesSince_() { return REQ.movesSince || []; }
function readAllMoveRows_() { throw new Error('Mouvements de stock : lus dans la base par la version Cloudflare.'); }

/* Lien avec la version Cloudflare (Cloud.gs) : ici, on EST la version Cloudflare. */
function cloudLive_() { return false; }
function cloudGuard_() {}
function cloudConfigChanged_() {}
function cloudOutboxAdd_() {}
function cloudBootInfo_() { return null; }
function cloudFull_() { return false; }
function cloudGuardAll_() {}
function cloudTabEdited_() {}

/* ---------------- Étape 3 : Stock, Statistiques, Bénéfices, Administration ---------------- */

/** Argent et versements : colis suivis (chargés un par un) + colis payés regroupés par la base (server.js, __n). */
function moneyOrders_(ctx) { return ctx.orders.concat(REQ.moneyRows || []); }

/** Confirmations du jour par confirmatrice : comptées par la base (server.js, REQ.goalCounts). */
function confirmationsToday_() {
  var out = {};
  (REQ.goalCounts || []).forEach(function (x) { var a = String(x.a || '').trim(); if (a) out[a] = (out[a] || 0) + Number(x.n || 0); });
  return out;
}

/** Libellés des commandes récentes : regroupés par la base (server.js), avec leur nombre (__n). */
function recentOrdersForLabels_(ctx) { return REQ.labelRows || ctx.orders; }

/** Résumés par jour : lus (et recalculés si besoin) dans la table days par server.js. */
function readStoredDays_(fromDay, toDay) {
  var out = {};
  Object.keys(REQ.days || {}).forEach(function (k) { if (k >= fromDay && k <= toDay && REQ.days[k] && REQ.days[k].st) out[k] = REQ.days[k].st; });
  return out;
}
/** « Recalculer » : tous les jours sont à refaire (la tâche de chaque minute s'en charge, quelques jours à la fois). */
function rebuildStats_() {
  REQ.rebuildDays = true;
  return { days: REQ.dayCount || 0 };
}

/** Accès au classeur Google (page Équipe) : liste envoyée par Apps Script ; le partage est fait par Apps Script. */
CF_SPREADSHEET_.getEditors = function () {
  if (!REQ.editors) throw new Error('Liste des accès au classeur pas encore reçue.');
  return REQ.editors.map(function (e) { return { getEmail: function () { return e; } }; });
};
CF_SPREADSHEET_.addEditor = function (email) {
  email = String(email).toLowerCase();
  REQ.notes.push({ id: email, kind: 'share:add', info: '' });
  if (REQ.editors && REQ.editors.indexOf(email) < 0) REQ.editors.push(email);
};
CF_SPREADSHEET_.removeEditor = function (email) {
  email = String(email).toLowerCase();
  REQ.notes.push({ id: email, kind: 'share:remove', info: '' });
  if (REQ.editors) REQ.editors = REQ.editors.filter(function (e) { return e !== email; });
};

/** Connexions (Administration) : Releasit arrive par le classeur ; le lien avec le classeur est vu d'ici. */
function releasitColumnsReport_() { return { found: !!(REQ.cfInfo && REQ.cfInfo.lastIngest), missing: [] }; }
function cloudStatus_() {
  var i = REQ.cfInfo || {};
  return { inCloud: true, live: i.live || '', full: i.full || '', sync: i.bridgeAt || '', lastIngest: i.lastIngest || '', google: i.google || '' };
}
function api_repair() { throw new Error('La réparation du classeur se fait dans l’application Google (lien de secours, Administration › Classeur).'); }
function api_reinstallTriggers() { throw new Error('Rien à installer : les tâches automatiques de Cloudflare tournent toutes seules (chaque minute).'); }
