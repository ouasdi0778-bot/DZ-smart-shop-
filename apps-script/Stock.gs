/**
 * Stock.gs : catalogue des produits par modèle (onglet Produits) et stock.
 *
 *  - Une ligne par modèle : Produit | Modèle | Prix de vente | Coût d'achat | Stock | Seuil d'alerte.
 *  - Une commande « Confirmée » RÉSERVE ses produits : Disponible = Stock − Réservé.
 *    Le centre de confirmation prévient quand il n'en reste pas assez.
 *  - Quand le colis part (Expédiée, En livraison, Livrée), le Stock baisse.
 *    Quand le retour est reçu (ou si un colis parti est annulé), il remonte.
 *    La colonne « Mouvement stock » des commandes garantit qu'une commande ne
 *    compte qu'une fois (« Sorti », puis « Rentré »).
 *  - Une commande est reliée à son modèle par son libellé : « cover iPhone - iphone 15 PRO MAX »
 *    correspond à la ligne Produit « cover iPhone », Modèle « iphone 15 PRO MAX »
 *    (sans tenir compte des majuscules, accents et tirets).
 */

var PRODUCT_TITLES_ = ['Produit', 'Modèle', 'Prix de vente', "Coût d'achat", 'Stock', "Seuil d'alerte"];
var STOCK_OUT_ = 'Sorti';
var STOCK_BACK_ = 'Rentré';
var STOCK_BEFORE_ = 'Avant le suivi du stock';

function catalogKey_(product, model) {
  return normalizeLoose_(String(product || '') + ' ' + String(model || ''));
}

/** Lecture de l'onglet Produits (sans la mémoire). */
function readCatalogFromSheet_() {
  var out = { rows: [], stockCol: -1 };
  var sh = ss_().getSheetByName(SHEET.PRODUCTS);
  if (!sh || sh.getLastRow() < 1) return out;
  var values = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 1)).getValues();
  var index = {};
  values[0].forEach(function (t, i) { var k = normalizeText_(t); if (k && index[k] === undefined) index[k] = i; });
  var col = function (title) { var i = index[normalizeText_(title)]; return i === undefined ? -1 : i; };
  var c = { product: col('Produit'), model: col('Modèle'), price: col('Prix de vente'), cost: col("Coût d'achat"), stock: col('Stock'), threshold: col("Seuil d'alerte") };
  if (c.product < 0) return out;
  out.stockCol = c.stock;
  var num = function (row, i) { return i < 0 || isBlank_(row[i]) || String(row[i]).trim() === '' ? null : toNumber_(row[i]); };
  for (var r = 1; r < values.length; r++) {
    var product = String(values[r][c.product] == null ? '' : values[r][c.product]).replace(/\s+/g, ' ').trim();
    if (!product) continue;
    var model = c.model < 0 ? '' : String(values[r][c.model] == null ? '' : values[r][c.model]).replace(/\s+/g, ' ').trim();
    out.rows.push({
      row: r + 1, product: product, model: model, key: catalogKey_(product, model),
      price: num(values[r], c.price), cost: num(values[r], c.cost), stock: num(values[r], c.stock), threshold: num(values[r], c.threshold)
    });
  }
  return out;
}

/** Catalogue gardé en mémoire (vidée quand l'onglet Produits change). */
function readCatalog_() {
  return cached_('cfg:products', readCatalogFromSheet_);
}

/** Modèle du catalogue correspondant à un libellé de commande, ou null. */
function matchCatalog_(catalog, label) {
  if (!catalog._index) {
    catalog._index = {};
    catalog.rows.forEach(function (r) { if (catalog._index[r.key] === undefined) catalog._index[r.key] = r; });
  }
  return catalog._index[normalizeLoose_(label)] || null;
}

/** « cover iPhone - iphone 15 PRO MAX » → { product: 'cover iPhone', model: 'iphone 15 PRO MAX' }. */
function splitLabel_(label) {
  var m = String(label).match(/^(.+?)\s+[—–-]\s+(.+)$/);
  return m ? { product: m[1].trim(), model: m[2].trim() } : { product: String(label).trim(), model: '' };
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
  var deltas = {};
  var lines = {};
  moves.forEach(function (m) {
    if (!m.sign) return;
    orderItems_(m.o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (!row || row.stock === null) return;
      deltas[row.row] = (deltas[row.row] || 0) + m.sign * it.qty;
      (lines[m.o.id] = lines[m.o.id] || []).push((m.sign < 0 ? '−' : '+') + it.qty + ' ' + row.product + (row.model ? ' — ' + row.model : ''));
    });
  });
  var rows = Object.keys(deltas);
  if (rows.length && catalog.stockCol >= 0) {
    var sh = ss_().getSheetByName(SHEET.PRODUCTS);
    var last = sh.getLastRow();
    var col = sh.getRange(2, catalog.stockCol + 1, last - 1, 1).getValues();
    rows.forEach(function (r) { col[r - 2][0] = toNumber_(col[r - 2][0]) + deltas[r]; });
    sh.getRange(2, catalog.stockCol + 1, last - 1, 1).setValues(col);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
  }
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
/* Page Stock                                                         */
/* ------------------------------------------------------------------ */

/** Stock par produit (total) et par modèle, modèles en stock bas, libellés de commandes absents du catalogue. */
function stockData_(ctx, settings) {
  var catalog = readCatalog_();
  var reserved = reservedByKey_(ctx.orders, catalog);
  var groups = {};
  var order = [];
  var low = 0;
  catalog.rows.forEach(function (r) {
    var g = groups[normalizeLoose_(r.product)];
    if (!g) { g = groups[normalizeLoose_(r.product)] = { product: r.product, stock: 0, reserved: 0, available: 0, tracked: false, models: [] }; order.push(g); }
    var res = reserved[r.key] || 0;
    var tracked = r.stock !== null;
    var available = tracked ? r.stock - res : null;
    var threshold = r.threshold !== null ? r.threshold : settings.STOCK_SEUIL;
    var isLow = tracked && available <= threshold;
    if (isLow) low++;
    g.models.push({ model: r.model, price: r.price, cost: r.cost, stock: r.stock, reserved: res, available: available, threshold: threshold, low: isLow, tracked: tracked });
    g.reserved += res;
    if (tracked) { g.tracked = true; g.stock += r.stock; g.available += available; }
  });

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

  return { products: order, low: low, unknown: unknownList };
}

function api_stock() {
  requireAdmin_();
  return stockData_(readOrders_(), getSettings_());
}

/** Ajoute des modèles au catalogue (libellés vus dans les commandes), sans doublon. */
function api_addCatalogItems(labels) {
  requireAdmin_();
  return withLock_(function () {
    var sh = ss_().getSheetByName(SHEET.PRODUCTS) || ss_().insertSheet(SHEET.PRODUCTS);
    ensureHeaders_(sh, PRODUCT_TITLES_);
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
      var values = {};
      values.Produit = parts.product;
      values['Modèle'] = parts.model;
      values['Prix de vente'] = u && u.price !== null ? u.price : '';
      rows.push(header.map(function (t) {
        var key = Object.keys(values).filter(function (v) { return normalizeText_(v) === normalizeText_(t); })[0];
        return key ? values[key] : '';
      }));
    });
    if (rows.length) {
      var r = sh.getLastRow() + 1;
      ensureRows_(sh, r + rows.length - 1);
      sh.getRange(r, 1, rows.length, header.length).setValues(rows);
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      log_(currentUser_(), '', 'Produits', rows.length + ' modèle(s) ajouté(s) à l’onglet Produits');
    }
    return { added: rows.length, message: rows.length + ' modèle(s) ajouté(s) à l’onglet Produits. Indiquez leur coût d’achat et leur stock.' };
  });
}

/** Réservé à l'administrateur (onglet Équipe). */
function requireAdmin_() {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Réservé à l’administrateur (rôle « Administrateur » dans l’onglet Équipe).');
  return user;
}
