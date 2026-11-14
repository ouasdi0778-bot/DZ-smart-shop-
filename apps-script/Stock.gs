/**
 * Stock.gs : catalogue des produits par modèle (onglet Produits) et stock.
 *
 *  - Une ligne par modèle : Produit | Modèle | Prix de vente | Coût d'achat | Stock |
 *    Seuil d'alerte | Autres noms | Actif. « Autres noms » : d'autres écritures du même
 *    modèle (séparées par « ; ») pour relier les commandes ; « Actif » = NON pour un modèle
 *    qu'on ne vend plus (gardé pour l'historique).
 *  - Une commande « Confirmée » RÉSERVE ses produits : Disponible = Stock − Réservé.
 *    Le centre de confirmation prévient quand il n'en reste pas assez.
 *  - Quand le colis part (Expédiée, En livraison, Livrée), le Stock baisse.
 *    Quand le retour est reçu (ou si un colis parti est annulé), il remonte ; un retour
 *    abîmé peut ensuite être retiré du stock. La colonne « Mouvement stock » des
 *    commandes garantit qu'une commande ne compte qu'une fois.
 *  - Entrées de marchandise (coût moyen recalculé si COUT_MOYEN = OUI) et inventaires
 *    se font depuis la page Stock. Chaque changement est noté dans l'onglet « Mouvements stock ».
 *  - Une commande est reliée à son modèle par son libellé : « cover iPhone - iphone 15 PRO MAX »
 *    correspond à la ligne Produit « cover iPhone », Modèle « iphone 15 PRO MAX »
 *    (sans tenir compte des majuscules, accents et tirets), ou à l'un de ses autres noms.
 *  - Page Stock : administrateur et rôle « Magasinier » (onglet Équipe).
 */

var PRODUCT_TITLES_ = ['Produit', 'Modèle', 'Prix de vente', "Coût d'achat", 'Stock', "Seuil d'alerte", 'Autres noms', 'Actif'];
var MOVE_TITLES_ = ['Date', 'Produit', 'Modèle', 'Mouvement', 'Quantité', 'Stock après', 'Coût unitaire', 'Commande', 'Par', 'Note'];
var INVENTORY_REASONS_ = ['Comptage', 'Perte', 'Casse', 'Erreur', 'Cadeau', 'Autre'];
var STOCK_OUT_ = 'Sorti';
var STOCK_BACK_ = 'Rentré';
var STOCK_DAMAGED_ = 'Rentré (abîmé)';
var STOCK_BEFORE_ = 'Avant le suivi du stock';

function catalogKey_(product, model) {
  return normalizeLoose_(String(product || '') + ' ' + String(model || ''));
}

function isNo_(value) {
  return /^(non|no|false|faux|0)$/i.test(String(value == null ? '' : value).trim());
}

/** Lecture de l'onglet Produits (sans la mémoire). */
function readCatalogFromSheet_() {
  var out = { rows: [], stockCol: -1, cols: {}, width: 0 };
  var sh = ss_().getSheetByName(SHEET.PRODUCTS);
  if (!sh || sh.getLastRow() < 1) return out;
  var values = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 1)).getValues();
  var index = {};
  values[0].forEach(function (t, i) { var k = normalizeText_(t); if (k && index[k] === undefined) index[k] = i; });
  var col = function (title) { var i = index[normalizeText_(title)]; return i === undefined ? -1 : i; };
  var c = {
    product: col('Produit'), model: col('Modèle'), price: col('Prix de vente'), cost: col("Coût d'achat"), stock: col('Stock'),
    threshold: col("Seuil d'alerte"), aliases: col('Autres noms'), active: col('Actif')
  };
  out.cols = c;
  out.width = values[0].length;
  if (c.product < 0) return out;
  out.stockCol = c.stock;
  var num = function (row, i) { return i < 0 || isBlank_(row[i]) || String(row[i]).trim() === '' ? null : toNumber_(row[i]); };
  var text = function (row, i) { return i < 0 ? '' : String(row[i] == null ? '' : row[i]).replace(/\s+/g, ' ').trim(); };
  for (var r = 1; r < values.length; r++) {
    var product = text(values[r], c.product);
    if (!product) continue;
    var model = text(values[r], c.model);
    out.rows.push({
      row: r + 1, product: product, model: model, key: catalogKey_(product, model),
      price: num(values[r], c.price), cost: num(values[r], c.cost), stock: num(values[r], c.stock), threshold: num(values[r], c.threshold),
      aliases: text(values[r], c.aliases).split(/[;\n]/).map(function (a) { return a.trim(); }).filter(function (a) { return a; }),
      active: !isNo_(values[r][c.active])
    });
  }
  return out;
}

/** Catalogue gardé en mémoire (vidée quand l'onglet Produits change). */
function readCatalog_() {
  return cached_('cfg:products', readCatalogFromSheet_);
}

/** Modèle du catalogue correspondant à un libellé de commande (ou à un de ses autres noms), ou null. */
function matchCatalog_(catalog, label) {
  if (!catalog._index) {
    var index = {};
    catalog.rows.forEach(function (r) { if (index[r.key] === undefined) index[r.key] = r; });
    catalog.rows.forEach(function (r) {
      (r.aliases || []).forEach(function (a) { var k = normalizeLoose_(a); if (k && index[k] === undefined) index[k] = r; });
    });
    catalog._index = index;
  }
  return catalog._index[normalizeLoose_(label)] || null;
}

/** « cover iPhone - iphone 15 PRO MAX » → { product: 'cover iPhone', model: 'iphone 15 PRO MAX' }. */
function splitLabel_(label) {
  var m = String(label).match(/^(.+?)\s+[—–-]\s+(.+)$/);
  return m ? { product: m[1].trim(), model: m[2].trim() } : { product: String(label).trim(), model: '' };
}

function rowLabel_(row) {
  return row.product + (row.model ? ' — ' + row.model : '');
}

/**
 * Articles d'une commande : « A ×2 + B » donne [{A, 2}, {B, 1}] ; un seul
 * article prend la quantité de la commande.
 */
function orderItems_(o) {
  var text = String(o.product == null ? '' : o.product).replace(/\s+/g, ' ').trim();
  if (!text) return [];
  var parts = text.split(/\s\+\s/);
  var single = parts.length === 1;
  return parts.map(function (part) {
    var label = part.trim();
    var qty = single ? Math.max(1, Math.round(toNumber_(o.qty)) || 1) : 1;
    var m = label.match(/^(.*\S)\s*×\s*(\d+)$/);
    if (m && !single) { label = m[1].trim(); qty = Math.max(1, +m[2]); }
    return { label: label, qty: qty };
  }).filter(function (it) { return it.label; });
}

/** Retour reçu : Ecotrack l'a rendu (« retour reçu ») ; pour une société sans connexion, dès le statut « Retour ». */
function returnReceived_(o) {
  if (!hasEcotrackParcel_(o)) return true;
  var info = ecotrackStatusInfo_(o.carrierStatus);
  return !!(info && info.group === 'returned');
}

/** Quantités réservées par modèle : commandes confirmées dont le colis n'est pas encore parti. */
function reservedByKey_(orders, catalog) {
  var reserved = {};
  orders.forEach(function (o) {
    if (o.status !== STATUS.CONFIRMED || !isBlank_(o.stockMove)) return;
    orderItems_(o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (row) reserved[row.key] = (reserved[row.key] || 0) + it.qty;
    });
  });
  return reserved;
}

/** État du stock pour les articles d'une commande (fiche de commande, centre de confirmation). */
function orderStockInfo_(ctx, o) {
  var catalog = readCatalog_();
  var reserved = reservedByKey_(ctx.orders, catalog);
  var self = o.status === STATUS.CONFIRMED && isBlank_(o.stockMove);
  var gone = !isBlank_(o.stockMove); // déjà sortie du stock
  return orderItems_(o).map(function (it) {
    var row = matchCatalog_(catalog, it.label);
    if (!row) return { label: it.label, qty: it.qty, matched: false, tracked: false, short: false };
    var tracked = row.stock !== null;
    var res = reserved[row.key] || 0;
    var others = res - (self ? it.qty : 0);
    return {
      label: it.label, qty: it.qty, matched: true, tracked: tracked, product: row.product, model: row.model,
      stock: tracked ? row.stock : null, reserved: res, available: tracked ? row.stock - res : null,
      short: tracked && !gone && QUEUE_STATUSES.concat([STATUS.UNREACHABLE, STATUS.CONFIRMED]).indexOf(o.status) >= 0 && row.stock - others < it.qty
    };
  });
}

/* ------------------------------------------------------------------ */
/* Écritures dans les onglets Produits et Mouvements stock            */
/* ------------------------------------------------------------------ */

function productsSheet_() {
  var sh = ss_().getSheetByName(SHEET.PRODUCTS) || ss_().insertSheet(SHEET.PRODUCTS);
  ensureHeaders_(sh, PRODUCT_TITLES_);
  return sh;
}

/** Écrit des cases d'une ligne de l'onglet Produits : { stock: 12, cost: 600 }… */
function writeCatalogCells_(sh, catalog, rowNum, fields) {
  Object.keys(fields).forEach(function (k) {
    var c = catalog.cols[k];
    if (c === undefined || c < 0) return;
    sh.getRange(rowNum, c + 1).setValue(fields[k]);
  });
}

/** Ajoute des lignes à l'onglet « Mouvements stock » (créé s'il manque). */
function logStockMoves_(rows) {
  if (!rows.length) return;
  var sh = ss_().getSheetByName(SHEET.MOVES);
  if (!sh) {
    sh = ss_().insertSheet(SHEET.MOVES);
    ensureHeaders_(sh, MOVE_TITLES_);
  }
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + rows.length - 1);
  sh.getRange(r, 1, rows.length, MOVE_TITLES_.length).setValues(rows);
}

function moveRow_(row, type, qty, after, unitCost, orderId, by, note) {
  return [new Date(), row.product, row.model, type, qty, after === null ? '' : after, unitCost || '', orderId || '', by || '', note || ''];
}

/**
 * Applique les mouvements de stock en attente : colis partis (le stock baisse),
 * retours reçus ou colis partis puis annulés (il remonte). Chaque commande ne
 * compte qu'une fois. À appeler sous verrou, avec les commandes à jour.
 */
function applyStockMoves_(ctx) {
  var summary = { out: 0, back: 0 };
  if (ctx.map.stockMove === undefined) return summary;
  var moves = [];
  ctx.orders.forEach(function (o) {
    var mark = String(o.stockMove == null ? '' : o.stockMove).trim();
    var s = o.status;
    var left = s === STATUS.SHIPPED || s === STATUS.IN_DELIVERY || s === STATUS.DELIVERED;
    var back = s === STATUS.RETURNED && returnReceived_(o);
    if (!mark) {
      if (left || (s === STATUS.RETURNED && !back)) moves.push({ o: o, marker: STOCK_OUT_, sign: -1 });
      else if (back) moves.push({ o: o, marker: STOCK_BACK_, sign: 0 }); // parti et revenu : rien ne change
    } else if (mark === STOCK_OUT_ && (back || s === STATUS.CANCELLED)) {
      moves.push({ o: o, marker: STOCK_BACK_, sign: 1 });
    }
  });
  if (!moves.length) return summary;

  var catalog = readCatalogFromSheet_();
  var current = {};
  var changed = {};
  var moveRows = [];
  var lines = {};
  moves.forEach(function (m) {
    if (!m.sign) return;
    var type = m.sign < 0 ? 'Colis parti' : (m.o.status === STATUS.CANCELLED ? 'Colis annulé (rentré)' : 'Retour reçu');
    orderItems_(m.o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (!row || row.stock === null) return;
      if (current[row.row] === undefined) current[row.row] = row.stock;
      current[row.row] += m.sign * it.qty;
      changed[row.row] = true;
      moveRows.push(moveRow_(row, type, m.sign * it.qty, current[row.row], '', String(m.o.id), 'Automatique', ''));
      (lines[m.o.id] = lines[m.o.id] || []).push((m.sign < 0 ? '−' : '+') + it.qty + ' ' + rowLabel_(row));
    });
  });
  var rows = Object.keys(changed);
  if (rows.length && catalog.stockCol >= 0) {
    var sh = ss_().getSheetByName(SHEET.PRODUCTS);
    var last = sh.getLastRow();
    var col = sh.getRange(2, catalog.stockCol + 1, last - 1, 1).getValues();
    rows.forEach(function (r) { col[r - 2][0] = current[r]; });
    sh.getRange(2, catalog.stockCol + 1, last - 1, 1).setValues(col);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
  }
  logStockMoves_(moveRows);
  var actor = { name: 'Stock' };
  moves.forEach(function (m) {
    writeFields_(ctx, m.o, { stockMove: m.marker });
    if (m.sign < 0) summary.out++;
    if (m.sign > 0) summary.back++;
    if (lines[m.o.id]) log_(actor, m.o.id, m.sign < 0 ? 'Stock : colis parti' : 'Stock : retour reçu', lines[m.o.id].join(', '));
  });
  return summary;
}

/** À l'ajout de la colonne « Mouvement stock » : les commandes déjà parties ne retouchent pas le stock. */
function markStockBefore_(sh, map) {
  var last = sh.getLastRow();
  if (last < 2 || map.stockMove === undefined || map.status === undefined) return 0;
  var status = sh.getRange(2, map.status + 1, last - 1, 1).getValues();
  var marks = sh.getRange(2, map.stockMove + 1, last - 1, 1).getValues();
  var done = [STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.DELIVERED, STATUS.RETURNED, STATUS.CANCELLED];
  var n = 0;
  var out = marks.map(function (m, i) {
    if (isBlank_(m[0]) && done.indexOf(String(status[i][0]).trim()) >= 0) { n++; return [STOCK_BEFORE_]; }
    return [m[0]];
  });
  if (n) sh.getRange(2, map.stockMove + 1, last - 1, 1).setValues(out);
  return n;
}

/* ------------------------------------------------------------------ */
/* Accès : administrateur et magasinier                              */
/* ------------------------------------------------------------------ */

/** Rôle « Magasinier » (ou « Stock ») dans l'onglet Équipe. */
function isStockKeeper_(user) {
  return /^(magasin|stock)/.test(normalizeText_(user && user.role));
}

function canSeeStock_(user) {
  return isAdmin_(user) || isStockKeeper_(user);
}

function requireStockAccess_() {
  var user = currentUser_();
  if (!canSeeStock_(user)) throw new Error('Réservé à l’administrateur et au magasinier (rôle dans l’onglet Équipe).');
  return user;
}

/** Réservé à l'administrateur (onglet Équipe). */
function requireAdmin_() {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Réservé à l’administrateur (rôle « Administrateur » dans l’onglet Équipe).');
  return user;
}

/* ------------------------------------------------------------------ */
/* Page Stock                                                         */
/* ------------------------------------------------------------------ */

/** Stock par produit (total) et par modèle, stock bas, ruptures, valeur, libellés absents du catalogue. */
function stockData_(ctx, settings) {
  var catalog = readCatalog_();
  var reserved = reservedByKey_(ctx.orders, catalog);
  var groups = {};
  var order = [];
  var totals = { value: 0, units: 0, low: 0, rupture: 0, models: 0 };
  catalog.rows.forEach(function (r) {
    var gk = normalizeLoose_(r.product);
    var g = groups[gk];
    if (!g) { g = groups[gk] = { product: r.product, stock: 0, reserved: 0, available: 0, value: 0, tracked: false, models: [] }; order.push(g); }
    var res = reserved[r.key] || 0;
    var tracked = r.stock !== null;
    var available = tracked ? r.stock - res : null;
    var threshold = r.threshold !== null ? r.threshold : settings.STOCK_SEUIL;
    var rupture = r.active && tracked && available <= 0;
    var isLow = r.active && tracked && available <= threshold;
    var value = tracked && r.cost !== null ? Math.max(r.stock, 0) * r.cost : 0;
    if (isLow) totals.low++;
    if (rupture) totals.rupture++;
    if (r.active) totals.models++;
    totals.value += value;
    if (tracked) totals.units += Math.max(r.stock, 0);
    g.models.push({
      row: r.row, key: r.key, model: r.model, price: r.price, cost: r.cost, stock: r.stock, reserved: res, available: available,
      threshold: threshold, ownThreshold: r.threshold, low: isLow, rupture: rupture, tracked: tracked, active: r.active,
      aliases: r.aliases.join('; '), value: Math.round(value)
    });
    g.reserved += res;
    g.value += value;
    if (tracked) { g.tracked = true; g.stock += r.stock; g.available += available; }
  });
  order.forEach(function (g) { g.value = Math.round(g.value); });
  totals.value = Math.round(totals.value);

  // Libellés vus dans les commandes récentes mais absents de l'onglet Produits.
  var since = new Date(Date.now() - 60 * 86400000);
  var unknown = {};
  ctx.orders.forEach(function (o) {
    var d = toDate_(o.date);
    if (d && d < since) return;
    orderItems_(o).forEach(function (it) {
      if (matchCatalog_(catalog, it.label)) return;
      var k = normalizeLoose_(it.label);
      var u = unknown[k] = unknown[k] || { label: it.label, orders: 0, sum: 0, n: 0 };
      u.orders++;
      if (toNumber_(o.price) > 0 && orderItems_(o).length === 1) { u.sum += toNumber_(o.price) / it.qty; u.n++; }
    });
  });
  var unknownList = Object.keys(unknown).map(function (k) {
    var u = unknown[k];
    var parts = splitLabel_(u.label);
    return { label: u.label, product: parts.product, model: parts.model, orders: u.orders, price: u.n ? Math.round(u.sum / u.n) : null };
  }).sort(function (a, b) { return b.orders - a.orders; });

  return { products: order, low: totals.low, rupture: totals.rupture, totals: totals, unknown: unknownList };
}

/** Derniers mouvements de stock (les plus récents d'abord). */
function readStockMoves_(limit) {
  var sh = ss_().getSheetByName(SHEET.MOVES);
  if (!sh || sh.getLastRow() < 2) return [];
  var n = Math.min(sh.getLastRow() - 1, limit || 300);
  var values = sh.getRange(sh.getLastRow() - n + 1, 1, n, MOVE_TITLES_.length).getValues();
  return values.reverse().map(function (r) {
    return {
      date: iso_(r[0]), product: String(r[1]), model: String(r[2]), key: catalogKey_(r[1], r[2]), type: String(r[3]),
      qty: toNumber_(r[4]), after: isBlank_(r[5]) || r[5] === '' ? null : toNumber_(r[5]),
      cost: isBlank_(r[6]) || r[6] === '' ? null : toNumber_(r[6]), order: String(r[7]), by: String(r[8]), note: String(r[9])
    };
  });
}

/** Page Stock (administrateur et magasinier). */
/** Stock : mesurée (Administration › État de l'outil). */
function api_stockPage() {
  var a = arguments;
  return timed_('Stock', function () { return stockPageApi_.apply(null, a); });
}

function stockPageApi_() {
  var user = requireStockAccess_();
  var settings = getSettings_();
  var d = stockData_(readOrders_(), settings);
  d.moves = readStockMoves_(300);
  d.reasons = INVENTORY_REASONS_;
  d.averageCost = settings.COUT_MOYEN;
  d.admin = isAdmin_(user);
  return d;
}

/** Ancien nom (page Bénéfices › Stock). */
function api_stock() {
  return api_stockPage();
}

/** Ajoute des modèles au catalogue (libellés vus dans les commandes), sans doublon. */
function api_addCatalogItems(labels) {
  var user = requireStockAccess_();
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var ctx = readOrders_();
    var info = {};
    stockData_(ctx, getSettings_()).unknown.forEach(function (u) { info[normalizeLoose_(u.label)] = u; });
    var seen = {};
    var rows = [];
    (labels || []).forEach(function (label) {
      var k = normalizeLoose_(label);
      if (!k || seen[k] || matchCatalog_(catalog, label)) return;
      seen[k] = true;
      var parts = splitLabel_(String(label).replace(/\s+/g, ' ').trim());
      var u = info[k];
      rows.push(productRowValues_(header, { product: parts.product, model: parts.model, price: u && u.price !== null ? u.price : '' }));
    });
    if (rows.length) {
      var r = sh.getLastRow() + 1;
      ensureRows_(sh, r + rows.length - 1);
      sh.getRange(r, 1, rows.length, header.length).setValues(rows);
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      log_(user, '', 'Produits', rows.length + ' modèle(s) ajouté(s) à l’onglet Produits');
    }
    return { added: rows.length, message: rows.length + ' modèle(s) ajouté(s) à l’onglet Produits. Indiquez leur coût d’achat et leur stock.' };
  });
}

/** Une ligne de l'onglet Produits rangée selon ses titres. */
function productRowValues_(header, v) {
  var byTitle = {};
  byTitle[normalizeText_('Produit')] = v.product;
  byTitle[normalizeText_('Modèle')] = v.model || '';
  byTitle[normalizeText_('Prix de vente')] = v.price === undefined || v.price === null ? '' : v.price;
  byTitle[normalizeText_("Coût d'achat")] = v.cost === undefined || v.cost === null ? '' : v.cost;
  byTitle[normalizeText_('Stock')] = v.stock === undefined || v.stock === null ? '' : v.stock;
  byTitle[normalizeText_("Seuil d'alerte")] = v.threshold === undefined || v.threshold === null ? '' : v.threshold;
  byTitle[normalizeText_('Autres noms')] = v.aliases || '';
  byTitle[normalizeText_('Actif')] = 'OUI';
  return header.map(function (t) { var x = byTitle[normalizeText_(t)]; return x === undefined ? '' : x; });
}

function numOrBlank_(v) {
  return v === undefined || v === null || String(v).trim() === '' ? null : toNumber_(v);
}

/**
 * Ajoute un produit et ses modèles. input = { product, price, cost, threshold, aliases,
 * models: [{ model, stock }] } ; sans modèle, une seule ligne. Un modèle déjà présent est ignoré.
 * Le stock de départ est noté comme mouvement « Stock initial ».
 */
function api_addProduct(input) {
  var user = requireStockAccess_();
  input = input || {};
  var product = String(input.product || '').replace(/\s+/g, ' ').trim();
  if (!product) throw new Error('Indiquez le nom du produit.');
  var models = (input.models || []).map(function (m) {
    return { model: String(m.model || '').replace(/\s+/g, ' ').trim(), stock: numOrBlank_(m.stock) };
  }).filter(function (m) { return m.model; });
  if (!models.length) models = [{ model: '', stock: numOrBlank_(input.stock) }];
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows = [];
    var moves = [];
    var skipped = [];
    var seen = {};
    models.forEach(function (m) {
      var key = catalogKey_(product, m.model);
      if (seen[key] || matchCatalog_(catalog, product + ' ' + m.model)) { skipped.push(m.model || product); return; }
      seen[key] = true;
      rows.push(productRowValues_(header, {
        product: product, model: m.model, price: numOrBlank_(input.price), cost: numOrBlank_(input.cost),
        stock: m.stock === null ? 0 : m.stock, threshold: numOrBlank_(input.threshold), aliases: m.model ? '' : String(input.aliases || '').trim()
      }));
      if (m.stock) moves.push(moveRow_({ product: product, model: m.model }, 'Stock initial', m.stock, m.stock, numOrBlank_(input.cost), '', user.name, ''));
    });
    if (rows.length) {
      var r = sh.getLastRow() + 1;
      ensureRows_(sh, r + rows.length - 1);
      sh.getRange(r, 1, rows.length, header.length).setValues(rows);
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      logStockMoves_(moves);
      log_(user, '', 'Produits', product + ' : ' + rows.length + ' modèle(s) ajouté(s)');
    }
    return {
      added: rows.length, skipped: skipped,
      message: rows.length + ' modèle(s) ajouté(s) pour « ' + product + ' ».' + (skipped.length ? ' Déjà présent(s) : ' + skipped.join(', ') + '.' : '')
    };
  });
}

/**
 * Modifie un modèle (nom, prix, coût, seuil, autres noms, actif). Le stock ne se modifie pas
 * ici : entrée de marchandise ou inventaire. Renommé, l'ancien nom est gardé dans « Autres noms »
 * pour que les commandes déjà passées restent reliées.
 */
function api_updateCatalogRow(input) {
  var user = requireStockAccess_();
  input = input || {};
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var row = catalog.rows.filter(function (r) { return r.row === Number(input.row); })[0];
    if (!row || row.key !== input.key) throw new Error('Ce modèle a été modifié entre-temps dans le classeur : rechargez la page.');
    var product = String(input.product == null ? row.product : input.product).replace(/\s+/g, ' ').trim();
    var model = String(input.model == null ? row.model : input.model).replace(/\s+/g, ' ').trim();
    if (!product) throw new Error('Indiquez le nom du produit.');
    var aliases = String(input.aliases == null ? row.aliases.join('; ') : input.aliases).split(/[;\n]/).map(function (a) { return a.trim(); }).filter(function (a) { return a; });
    var newKey = catalogKey_(product, model);
    if (newKey !== row.key) {
      var clash = catalog.rows.filter(function (r) { return r.row !== row.row && r.key === newKey; })[0];
      if (clash) throw new Error('Ce modèle existe déjà : ' + rowLabel_(clash) + '.');
      var old = rowLabel_(row);
      if (aliases.map(normalizeLoose_).indexOf(normalizeLoose_(old)) < 0) aliases.push(old);
    }
    var fields = { product: product, model: model, aliases: aliases.join('; '), active: input.active === false || isNo_(input.active) ? 'NON' : 'OUI' };
    if (input.price !== undefined) fields.price = numOrBlank_(input.price) === null ? '' : numOrBlank_(input.price);
    if (input.cost !== undefined) fields.cost = numOrBlank_(input.cost) === null ? '' : numOrBlank_(input.cost);
    if (input.threshold !== undefined) fields.threshold = numOrBlank_(input.threshold) === null ? '' : numOrBlank_(input.threshold);
    writeCatalogCells_(sh, catalog, row.row, fields);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    log_(user, '', 'Produits', 'Modifié : ' + rowLabel_({ product: product, model: model }) + (fields.active === 'NON' ? ' (désactivé)' : ''));
    return { message: 'Modèle enregistré : ' + rowLabel_({ product: product, model: model }) + '.' };
  });
}

/**
 * Entrée de marchandise : items = [{ row, key, qty, cost }]. Le stock augmente ; avec
 * COUT_MOYEN = OUI, le coût d'achat devient la moyenne pondérée (ancien stock et nouvelle entrée).
 */
function api_stockEntry(input) {
  var user = requireStockAccess_();
  input = input || {};
  var settings = getSettings_();
  var items = (input.items || []).map(function (it) {
    return { row: Number(it.row), key: String(it.key || ''), qty: Math.round(toNumber_(it.qty)), cost: numOrBlank_(it.cost) };
  }).filter(function (it) { return it.qty > 0; });
  if (!items.length) throw new Error('Indiquez au moins une quantité reçue.');
  var note = [String(input.supplier || '').trim() ? 'Fournisseur : ' + String(input.supplier).trim() : '', String(input.note || '').trim()]
    .filter(function (x) { return x; }).join(' · ');
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    var units = 0;
    items.forEach(function (it) {
      var row = catalog.rows.filter(function (r) { return r.row === it.row && (!it.key || r.key === it.key); })[0];
      if (!row) throw new Error('Un modèle a été modifié entre-temps dans le classeur : rechargez la page.');
      var before = row.stock === null ? 0 : row.stock;
      var after = before + it.qty;
      var fields = { stock: after };
      if (it.cost !== null && it.cost > 0) {
        if (settings.COUT_MOYEN && row.cost !== null && before > 0) {
          fields.cost = Math.round((before * row.cost + it.qty * it.cost) / (before + it.qty));
        } else if (settings.COUT_MOYEN || row.cost === null) {
          fields.cost = it.cost;
        }
      }
      writeCatalogCells_(sh, catalog, row.row, fields);
      row.stock = after;
      if (fields.cost !== undefined) row.cost = fields.cost;
      units += it.qty;
      moves.push(moveRow_(row, 'Entrée', it.qty, after, it.cost, '', user.name, note));
    });
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_(moves);
    log_(user, '', 'Stock : entrée', units + ' pièce(s)' + (note ? ' · ' + note : ''));
    return { message: 'Entrée enregistrée : ' + units + ' pièce(s) ajoutée(s) au stock.' };
  });
}

/** Inventaire : items = [{ row, key, counted }] ; l'écart avec le stock est noté avec le motif. */
function api_stockInventory(input) {
  var user = requireStockAccess_();
  input = input || {};
  var reason = String(input.reason || 'Comptage').trim() || 'Comptage';
  var items = (input.items || []).filter(function (it) { return String(it.counted == null ? '' : it.counted).trim() !== ''; })
    .map(function (it) { return { row: Number(it.row), key: String(it.key || ''), counted: Math.round(toNumber_(it.counted)) }; });
  if (!items.length) throw new Error('Indiquez au moins une quantité comptée.');
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    items.forEach(function (it) {
      var row = catalog.rows.filter(function (r) { return r.row === it.row && (!it.key || r.key === it.key); })[0];
      if (!row) throw new Error('Un modèle a été modifié entre-temps dans le classeur : rechargez la page.');
      var before = row.stock === null ? 0 : row.stock;
      if (row.stock !== null && it.counted === before) return;
      writeCatalogCells_(sh, catalog, row.row, { stock: it.counted });
      moves.push(moveRow_(row, 'Inventaire', it.counted - before, it.counted, '', '', user.name, reason));
    });
    if (moves.length) {
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      logStockMoves_(moves);
      log_(user, '', 'Stock : inventaire', moves.length + ' modèle(s) corrigé(s) · ' + reason);
    }
    return { changed: moves.length, message: moves.length ? moves.length + ' modèle(s) corrigé(s).' : 'Aucun écart : rien à corriger.' };
  });
}

/** Retour reçu abîmé : il ne peut pas être revendu, on le retire du stock. */
function api_markReturnDamaged(id) {
  var user = requireStockAccess_();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (o.status !== STATUS.RETURNED || String(o.stockMove).trim() !== STOCK_BACK_) {
      throw new Error('Seul un retour reçu et remis en stock peut être marqué abîmé.');
    }
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    orderItems_(o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (!row || row.stock === null) return;
      row.stock -= it.qty;
      writeCatalogCells_(sh, catalog, row.row, { stock: row.stock });
      moves.push(moveRow_(row, 'Retour abîmé', -it.qty, row.stock, '', String(o.id), user.name, ''));
    });
    writeFields_(ctx, o, { stockMove: STOCK_DAMAGED_, updated: new Date() });
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_(moves);
    log_(user, o.id, 'Stock : retour abîmé', moves.length ? 'Retiré du stock' : 'Produit non suivi en stock');
    return { order: serializeOrder_(o), message: 'Retour ' + o.id + ' marqué abîmé : retiré du stock.' };
  });
}
