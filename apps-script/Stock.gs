/**
 * Stock.gs : catalogue des produits par modèle (onglet Produits) et stock.
 *
 *  - Une ligne par modèle : Produit | Modèle | Prix de vente | Coût d'achat | Stock |
 *    Seuil d'alerte | Autres noms | Actif | Photo | Contenu du pack. « Autres noms » : d'autres
 *    écritures du même modèle (séparées par « ; ») pour relier les commandes ; « Actif » = NON pour
 *    un modèle qu'on ne vend plus (gardé pour l'historique) ; « Photo » : lien de l'image.
 *  - Un pack (« Contenu du pack » rempli, ex. « Montre connectée × 1 + Écouteurs × 1 ») n'a pas de
 *    stock à lui : il réserve, sort et fait rentrer ses articles ; son disponible est celui de
 *    l'article qui en a le moins, et son coût (s'il est vide) la somme des coûts de ses articles.
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

var PRODUCT_TITLES_ = ['Produit', 'Modèle', 'Prix de vente', "Coût d'achat", 'Stock', "Seuil d'alerte", 'Autres noms', 'Actif', 'Photo', 'Contenu du pack'];
var MOVE_TITLES_ = ['Date', 'Produit', 'Modèle', 'Mouvement', 'Quantité', 'Stock après', 'Coût unitaire', 'Commande', 'Par', 'Note'];
var INVENTORY_REASONS_ = ['Comptage', 'Perte', 'Casse', 'Erreur', 'Cadeau', 'Autre'];
var STOCK_OUT_ = 'Sorti';
var STOCK_BACK_ = 'Rentré';
var STOCK_DAMAGED_ = 'Rentré (abîmé)';
var STOCK_BEFORE_ = 'Avant le suivi du stock';
/** Mouvements tapés à la main, qu'on peut annuler depuis la page Stock. */
var STOCK_UNDOABLE_ = ['Entrée', 'Inventaire', 'Stock initial'];
var STOCK_UNDO_TYPE_ = 'Annulation';

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
    threshold: col("Seuil d'alerte"), aliases: col('Autres noms'), active: col('Actif'), photo: col('Photo'), pack: col('Contenu du pack')
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
      active: !isNo_(values[r][c.active]),
      photo: cleanPhotoUrl_(text(values[r], c.photo)), packText: text(values[r], c.pack)
    });
  }
  resolvePacks_(out);
  return out;
}

/** Lien de photo accepté (http ou https), sinon ''. */
function cleanPhotoUrl_(value) {
  var s = String(value == null ? '' : value).trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
}

/** « Montre connectée × 1 + Écouteurs × 2 » (ou « 2 × Écouteurs ») → [{ label, qty }]. */
function parsePackText_(text) {
  return String(text || '').split(/\s+\+\s+|\s*\n\s*/).map(function (part) {
    var p = part.trim();
    if (!p) return null;
    var m = p.match(/^(\d+)\s*(?:×|\*|[xX]\s)\s*(.+)$/);
    if (m) return { label: m[2].trim(), qty: Math.max(1, +m[1]) };
    m = p.match(/^(.+?)\s*(?:×|\*|\s[xX])\s*(\d+)$/);
    if (m) return { label: m[1].trim(), qty: Math.max(1, +m[2]) };
    return { label: p, qty: 1 };
  }).filter(function (x) { return x; });
}

/** Texte de la colonne « Contenu du pack » : [{ label, qty }] → « A × 1 + B × 2 ». */
function packTextOf_(items) {
  return items.map(function (it) { return it.label + ' × ' + it.qty; }).join(' + ');
}

/**
 * Packs : leurs articles sont reliés aux modèles du catalogue (un pack ne contient pas de pack).
 * Un pack n'a pas de stock à lui ; son coût vide devient la somme des coûts de ses articles.
 */
function resolvePacks_(catalog) {
  var simple = { rows: catalog.rows.filter(function (r) { return !r.packText; }) };
  catalog.rows.forEach(function (r) {
    if (!r.packText) return;
    var items = [];
    var missing = [];
    parsePackText_(r.packText).forEach(function (p) {
      var c = matchCatalog_(simple, p.label);
      if (c) items.push({ key: c.key, qty: p.qty, label: rowLabel_(c) }); else missing.push(p.label);
    });
    r.pack = { items: items, missing: missing };
    r.stock = null;
    if (r.cost === null && items.length && !missing.length) {
      var sum = 0;
      var ok = items.every(function (it) {
        var c = catalogRowByKey_(simple, it.key);
        if (!c || c.cost === null) return false;
        sum += c.cost * it.qty;
        return true;
      });
      if (ok) { r.cost = sum; r.costAuto = true; }
    }
  });
}

/** Ligne du catalogue par sa clé (ou null). */
function catalogRowByKey_(catalog, key) {
  if (!catalog._byKey) {
    var m = {};
    catalog.rows.forEach(function (r) { if (m[r.key] === undefined) m[r.key] = r; });
    catalog._byKey = m;
  }
  return catalog._byKey[key] || null;
}

/**
 * Lignes de stock des articles d'une commande : un pack est remplacé par ses articles.
 * [{ row (null si absent du catalogue), qty, pack (ligne du pack ou null), label }].
 */
function stockLines_(catalog, items) {
  var out = [];
  items.forEach(function (it) {
    var row = matchCatalog_(catalog, it.label);
    if (row && row.pack) {
      row.pack.items.forEach(function (p) {
        var c = catalogRowByKey_(catalog, p.key);
        if (c) out.push({ row: c, qty: it.qty * p.qty, pack: row, label: it.label });
      });
    } else {
      out.push({ row: row, qty: it.qty, pack: null, label: it.label });
    }
  });
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

/**
 * Articles d'une commande, en tenant compte du catalogue : un nom qui contient « + » mais qui est
 * celui d'un produit ou d'un pack du catalogue (ex. « Pack Montre + Écouteurs ») reste un seul article.
 */
function catalogItems_(catalog, o) {
  var items = orderItems_(o);
  if (items.length > 1) {
    var whole = String(o.product == null ? '' : o.product).replace(/\s+/g, ' ').trim();
    if (matchCatalog_(catalog, whole)) return [{ label: whole, qty: Math.max(1, Math.round(toNumber_(o.qty)) || 1) }];
  }
  return items;
}

/** Retour reçu : Ecotrack l'a rendu (« retour reçu ») ; pour une société sans connexion, dès le statut « Retour ». */
function returnReceived_(o) {
  if (!hasEcotrackParcel_(o)) return true;
  var info = ecotrackStatusInfo_(o.carrierStatus);
  return !!(info && info.group === 'returned');
}

/**
 * Quantités réservées par modèle : commandes confirmées dont le colis n'est pas encore parti
 * (un pack réserve ses articles). extra (facultatif) : { packs: {} } reçoit les packs réservés,
 * { who: {} } les commandes qui réservent chaque modèle ou pack.
 */
function reservedByKey_(orders, catalog, extra) {
  var reserved = {};
  orders.forEach(function (o) {
    if (o.status !== STATUS.CONFIRMED || !isBlank_(o.stockMove)) return;
    var items = catalogItems_(catalog, o);
    var mine = {};
    stockLines_(catalog, items).forEach(function (l) {
      if (!l.row) return;
      reserved[l.row.key] = (reserved[l.row.key] || 0) + l.qty;
      mine[l.row.key] = (mine[l.row.key] || 0) + l.qty;
    });
    if (!extra) return;
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (row && row.pack) {
        if (extra.packs) extra.packs[row.key] = (extra.packs[row.key] || 0) + it.qty;
        mine[row.key] = (mine[row.key] || 0) + it.qty;
      }
    });
    if (extra.who) {
      Object.keys(mine).forEach(function (k) {
        (extra.who[k] = extra.who[k] || []).push({ id: String(o.id), client: String(o.client || ''), wilaya: String(o.wilaya || ''), at: iso_(o.confirmedAt), qty: mine[k] });
      });
    }
  });
  return reserved;
}

/** Photo d'un modèle : la sienne, sinon celle d'un autre modèle du même produit. */
function rowPhoto_(catalog, row) {
  if (!row) return '';
  if (row.photo) return row.photo;
  var p = normalizeLoose_(row.product);
  var other = catalog.rows.filter(function (r) { return r.photo && normalizeLoose_(r.product) === p; })[0];
  return other ? other.photo : '';
}

/** Disponible d'un pack : le plus petit nombre de packs que ses articles permettent (null si un article n'est pas suivi). */
function packAvailable_(catalog, row, reserved) {
  if (!row.pack.items.length || row.pack.missing.length) return null;
  var best = null;
  for (var i = 0; i < row.pack.items.length; i++) {
    var p = row.pack.items[i];
    var c = catalogRowByKey_(catalog, p.key);
    if (!c || c.stock === null) return null;
    var n = Math.floor((c.stock - (reserved[c.key] || 0)) / p.qty);
    best = best === null ? n : Math.min(best, n);
  }
  return best;
}

/** État du stock pour les articles d'une commande (fiche de commande, centre de confirmation). */
function orderStockInfo_(ctx, o) {
  var catalog = readCatalog_();
  var reserved = reservedByKey_(ctx.orders, catalog);
  var self = o.status === STATUS.CONFIRMED && isBlank_(o.stockMove);
  var gone = !isBlank_(o.stockMove); // déjà sortie du stock
  var waiting = QUEUE_STATUSES.concat([STATUS.UNREACHABLE, STATUS.CONFIRMED]).indexOf(o.status) >= 0;
  var items = catalogItems_(catalog, o);
  var mine = {};
  stockLines_(catalog, items).forEach(function (l) { if (l.row) mine[l.row.key] = (mine[l.row.key] || 0) + l.qty; });
  // Assez de stock pour cette ligne (les autres commandes confirmées gardent leur réservation) ?
  var enough = function (row, qty) {
    var others = (reserved[row.key] || 0) - (self ? mine[row.key] || 0 : 0);
    return row.stock - others >= qty;
  };
  return items.map(function (it) {
    var row = matchCatalog_(catalog, it.label);
    if (!row) return { label: it.label, qty: it.qty, matched: false, tracked: false, short: false };
    var photo = rowPhoto_(catalog, row);
    if (row.pack) {
      var comps = row.pack.items.map(function (p) { return { row: catalogRowByKey_(catalog, p.key), qty: p.qty }; });
      var trackedPack = comps.length > 0 && !row.pack.missing.length && comps.every(function (c) { return c.row && c.row.stock !== null; });
      var lacking = trackedPack && !gone && waiting ? comps.filter(function (c) { return !enough(c.row, c.qty * it.qty); }) : [];
      return {
        label: it.label, qty: it.qty, matched: true, tracked: trackedPack, product: row.product, model: row.model, pack: true, photo: photo,
        stock: null, reserved: 0, available: trackedPack ? packAvailable_(catalog, row, reserved) : null,
        short: lacking.length > 0, lacking: lacking.map(function (c) { return rowLabel_(c.row); })
      };
    }
    var tracked = row.stock !== null;
    var res = reserved[row.key] || 0;
    return {
      label: it.label, qty: it.qty, matched: true, tracked: tracked, product: row.product, model: row.model, photo: photo,
      stock: tracked ? row.stock : null, reserved: res, available: tracked ? row.stock - res : null,
      short: tracked && !gone && waiting && !enough(row, it.qty)
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
    stockLines_(catalog, catalogItems_(catalog, m.o)).forEach(function (l) {
      var row = l.row;
      if (!row || row.stock === null) return;
      if (current[row.row] === undefined) current[row.row] = row.stock;
      current[row.row] += m.sign * l.qty;
      changed[row.row] = true;
      moveRows.push(moveRow_(row, type, m.sign * l.qty, current[row.row], '', String(m.o.id), 'Automatique', l.pack ? 'Pack : ' + rowLabel_(l.pack) : ''));
      (lines[m.o.id] = lines[m.o.id] || []).push((m.sign < 0 ? '−' : '+') + l.qty + ' ' + rowLabel_(row));
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

/**
 * Stock par produit (total) et par modèle, stock bas, ruptures, valeur, libellés absents du catalogue.
 * Pour chaque modèle : photo, commandes qui le réservent, autres clés (anciens noms) pour l'historique.
 * Un pack a son disponible calculé et la liste de ses articles ; il ne compte pas dans les totaux.
 */
function stockData_(ctx, settings) {
  var catalog = readCatalog_();
  var extra = { packs: {}, who: {} };
  var reserved = reservedByKey_(ctx.orders, catalog, extra);
  var groups = {};
  var order = [];
  var totals = { value: 0, units: 0, low: 0, rupture: 0, models: 0, inactive: 0, packs: 0 };
  catalog.rows.forEach(function (r) {
    var gk = normalizeLoose_(r.product);
    var g = groups[gk];
    if (!g) { g = groups[gk] = { product: r.product, stock: 0, reserved: 0, available: 0, value: 0, tracked: false, photo: '', models: [] }; order.push(g); }
    if (!g.photo && r.photo) g.photo = r.photo;
    var threshold = r.threshold !== null ? r.threshold : settings.STOCK_SEUIL;
    var keys = [r.key].concat(r.aliases.map(normalizeLoose_)).filter(function (k, i, a) { return k && a.indexOf(k) === i; });
    var base = {
      row: r.row, key: r.key, keys: keys, model: r.model, price: r.price, cost: r.cost, costAuto: !!r.costAuto, threshold: threshold, ownThreshold: r.threshold,
      active: r.active, aliases: r.aliases.join('; '), photo: r.photo, orders: (extra.who[r.key] || []).slice(0, 50)
    };
    if (!r.active) totals.inactive++;
    if (r.pack) {
      var avail = packAvailable_(catalog, r, reserved);
      var packTracked = avail !== null;
      g.models.push(Object.assign(base, {
        stock: null, reserved: extra.packs[r.key] || 0, available: avail, tracked: packTracked, value: 0,
        low: r.active && packTracked && avail <= threshold, rupture: r.active && packTracked && avail <= 0,
        pack: {
          text: r.packText, missing: r.pack.missing,
          items: r.pack.items.map(function (p) {
            var c = catalogRowByKey_(catalog, p.key);
            return { key: p.key, label: p.label, qty: p.qty, available: c && c.stock !== null ? c.stock - (reserved[c.key] || 0) : null };
          })
        }
      }));
      g.pack = true;
      if (r.active) totals.packs++;
      return;
    }
    var res = reserved[r.key] || 0;
    var tracked = r.stock !== null;
    var available = tracked ? r.stock - res : null;
    var rupture = r.active && tracked && available <= 0;
    var isLow = r.active && tracked && available <= threshold;
    var value = tracked && r.cost !== null ? Math.max(r.stock, 0) * r.cost : 0;
    if (isLow) totals.low++;
    if (rupture) totals.rupture++;
    if (r.active) totals.models++;
    totals.value += value;
    if (tracked) totals.units += Math.max(r.stock, 0);
    g.models.push(Object.assign(base, {
      stock: r.stock, reserved: res, available: available, low: isLow, rupture: rupture, tracked: tracked, value: Math.round(value)
    }));
    g.reserved += res;
    g.value += value;
    if (tracked) { g.tracked = true; g.stock += r.stock; g.available += available; }
  });
  order.forEach(function (g) { g.value = Math.round(g.value); });
  totals.value = Math.round(totals.value);

  // Libellés vus dans les commandes récentes mais absents de l'onglet Produits.
  // (__n : nombre de commandes identiques, quand la version Cloudflare les donne déjà regroupées.)
  var since = new Date(Date.now() - 60 * 86400000);
  var unknown = {};
  recentOrdersForLabels_(ctx).forEach(function (o) {
    var d = toDate_(o.date);
    if (d && d < since) return;
    var w = o.__n || 1;
    var its = catalogItems_(catalog, o);
    its.forEach(function (it) {
      if (matchCatalog_(catalog, it.label)) return;
      var k = normalizeLoose_(it.label);
      var u = unknown[k] = unknown[k] || { label: it.label, orders: 0, sum: 0, n: 0 };
      u.orders += w;
      if (toNumber_(o.price) > 0 && its.length === 1) { u.sum += w * toNumber_(o.price) / it.qty; u.n += w; }
    });
  });
  var unknownList = Object.keys(unknown).map(function (k) {
    var u = unknown[k];
    var parts = splitLabel_(u.label);
    return { label: u.label, product: parts.product, model: parts.model, orders: u.orders, price: u.n ? Math.round(u.sum / u.n) : null };
  }).sort(function (a, b) { return b.orders - a.orders; });

  return { products: order, low: totals.low, rupture: totals.rupture, totals: totals, unknown: unknownList };
}

/** Commandes où chercher les libellés (absents du catalogue, modèle à supprimer). */
function recentOrdersForLabels_(ctx) { return ctx.orders; }

/** Derniers mouvements de stock (les plus récents d'abord). */
function readStockMoves_(limit) {
  var sh = ss_().getSheetByName(SHEET.MOVES);
  if (!sh || sh.getLastRow() < 2) return [];
  var n = Math.min(sh.getLastRow() - 1, limit || 300);
  var first = sh.getLastRow() - n + 1;
  var values = sh.getRange(first, 1, n, MOVE_TITLES_.length).getValues();
  return values.map(function (r, i) { return moveFromRow_(r, first + i); }).reverse();
}

/** Une ligne de l'onglet « Mouvements stock » ; ref : son numéro de ligne (Cloudflare : son n° dans la base). */
function moveFromRow_(r, ref) {
  return {
    ref: ref, date: iso_(r[0]), product: String(r[1]), model: String(r[2]), key: catalogKey_(r[1], r[2]), type: String(r[3]),
    qty: toNumber_(r[4]), after: isBlank_(r[5]) || r[5] === '' ? null : toNumber_(r[5]),
    cost: isBlank_(r[6]) || r[6] === '' ? null : toNumber_(r[6]), order: String(r[7] == null ? '' : r[7]), by: String(r[8] == null ? '' : r[8]), note: String(r[9] == null ? '' : r[9])
  };
}

/** Toutes les lignes de l'onglet « Mouvements stock » (les plus anciennes d'abord). */
function readAllMoveRows_() {
  var sh = ss_().getSheetByName(SHEET.MOVES);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, MOVE_TITLES_.length).getValues();
}

/** Nombre de mouvements liés à une commande, par modèle (clé). Cloudflare : compté par la base. */
function stockOrderMoveCounts_() {
  var out = {};
  readAllMoveRows_().forEach(function (r) {
    if (String(r[7] == null ? '' : r[7]).trim() === '') return;
    var k = catalogKey_(r[1], r[2]);
    out[k] = (out[k] || 0) + 1;
  });
  return out;
}

/** Un mouvement par sa référence (numéro de ligne), ou null. */
function stockMoveByRef_(ref) {
  var sh = ss_().getSheetByName(SHEET.MOVES);
  var n = Math.round(Number(ref));
  if (!sh || !(n >= 2) || n > sh.getLastRow()) return null;
  return moveFromRow_(sh.getRange(n, 1, 1, MOVE_TITLES_.length).getValues()[0], n);
}

/** Notes des annulations déjà faites (pour ne pas annuler deux fois le même mouvement). */
function stockUndoNotes_() {
  return readAllMoveRows_().filter(function (r) { return String(r[3]) === STOCK_UNDO_TYPE_; }).map(function (r) { return String(r[9] == null ? '' : r[9]); });
}

/** Mouvements faits après une date : [{ product, model, qty }]. Cloudflare : additionnés par la base. */
function stockMovesSince_(date) {
  var t = date.getTime();
  return readAllMoveRows_().filter(function (r) { var d = toDate_(r[0]); return d && d.getTime() > t; })
    .map(function (r) { return { product: String(r[1]), model: String(r[2]), qty: toNumber_(r[4]) }; });
}

/**
 * Note de l'annulation d'un mouvement (elle l'identifie) :
 * « Annule : Entrée +20 · Montre connectée du 19/11/2026 10:12:05 ».
 */
function undoNote_(mv) {
  var d = toDate_(mv.date);
  return 'Annule : ' + mv.type + ' ' + (mv.qty > 0 ? '+' : '') + mv.qty + ' · ' + rowLabel_(mv) +
    ' du ' + (d ? Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM/yyyy HH:mm:ss') : '?');
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
  var done = {};
  d.moves.forEach(function (m) { if (m.type === STOCK_UNDO_TYPE_) done[m.note] = true; });
  d.moves.forEach(function (m) {
    m.undoable = STOCK_UNDOABLE_.indexOf(m.type) >= 0 && m.qty !== 0;
    if (m.undoable && done[undoNote_(m)]) { m.undoable = false; m.undone = true; }
  });
  d.reasons = INVENTORY_REASONS_;
  d.averageCost = settings.COUT_MOYEN;
  d.admin = isAdmin_(user);
  d.shopify = shopifyConfig_().configured;
  return d;
}

/** Ancien nom (page Bénéfices › Stock). */
function api_stock() {
  return api_stockPage();
}

/** Ajoute des modèles au catalogue (libellés vus dans les commandes), sans doublon. */
function api_addCatalogItems(labels) {
  cloudGuardAll_();
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
  byTitle[normalizeText_('Photo')] = v.photo || '';
  byTitle[normalizeText_('Contenu du pack')] = v.pack || '';
  return header.map(function (t) { var x = byTitle[normalizeText_(t)]; return x === undefined ? '' : x; });
}

function numOrBlank_(v) {
  return v === undefined || v === null || String(v).trim() === '' ? null : toNumber_(v);
}

/** Lien de photo tapé : vide, ou un lien http(s) valide. */
function photoInput_(value) {
  var s = String(value == null ? '' : value).trim();
  if (!s) return '';
  var ok = cleanPhotoUrl_(s);
  if (!ok) throw new Error('Lien de photo invalide : il doit commencer par https:// (copiez l’adresse de l’image).');
  return ok;
}

/** Contenu d'un pack choisi dans la page : [{ label, qty }] (ou texte) → texte vérifié de la colonne « Contenu du pack ». */
function packInput_(catalog, value) {
  var list = Array.isArray(value) ? value.map(function (x) { return { label: String(x.label || '').trim(), qty: Math.max(1, Math.round(toNumber_(x.qty)) || 1) }; })
    : parsePackText_(value);
  list = list.filter(function (x) { return x.label; });
  if (!list.length) throw new Error('Choisissez les articles du pack.');
  var simple = { rows: catalog.rows.filter(function (r) { return !r.packText; }) };
  var seen = {};
  var items = [];
  list.forEach(function (x) {
    var row = matchCatalog_(simple, x.label);
    if (!row) throw new Error('« ' + x.label + ' » n’est pas un modèle du catalogue (un pack ne peut pas contenir un pack).');
    if (seen[row.key]) { seen[row.key].qty += x.qty; return; }
    seen[row.key] = { label: rowLabel_(row), qty: x.qty };
    items.push(seen[row.key]);
  });
  return packTextOf_(items);
}

/**
 * Ajoute un produit et ses modèles. input = { product, price, cost, threshold, aliases, photo,
 * models: [{ model, stock, price, cost }] } ; sans modèle, une seule ligne. Un modèle déjà présent est ignoré.
 * Pack : input.pack = [{ label, qty }] (articles du catalogue) ; il n'a pas de stock à lui.
 * Le stock de départ est noté comme mouvement « Stock initial ».
 */
function api_addProduct(input) {
  cloudGuardAll_();
  var user = requireStockAccess_();
  input = input || {};
  var product = String(input.product || '').replace(/\s+/g, ' ').trim();
  if (!product) throw new Error('Indiquez le nom du produit.');
  var photo = photoInput_(input.photo);
  var isPack = Array.isArray(input.pack) ? input.pack.length > 0 : !!String(input.pack || '').trim();
  var models = (input.models || []).map(function (m) {
    return { model: String(m.model || '').replace(/\s+/g, ' ').trim(), stock: numOrBlank_(m.stock), price: numOrBlank_(m.price), cost: numOrBlank_(m.cost) };
  }).filter(function (m) { return m.model; });
  if (!models.length || isPack) models = [{ model: isPack ? String(input.model || '').replace(/\s+/g, ' ').trim() : '', stock: isPack ? null : numOrBlank_(input.stock), price: null, cost: null }];
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var packText = isPack ? packInput_(catalog, input.pack) : '';
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows = [];
    var moves = [];
    var skipped = [];
    var seen = {};
    models.forEach(function (m) {
      var key = catalogKey_(product, m.model);
      if (seen[key] || matchCatalog_(catalog, product + ' ' + m.model)) { skipped.push(m.model || product); return; }
      seen[key] = true;
      var price = m.price !== null ? m.price : numOrBlank_(input.price);
      var cost = isPack ? numOrBlank_(input.cost) : (m.cost !== null ? m.cost : numOrBlank_(input.cost));
      rows.push(productRowValues_(header, {
        product: product, model: m.model, price: price, cost: cost,
        stock: isPack ? '' : (m.stock === null ? 0 : m.stock), threshold: numOrBlank_(input.threshold),
        aliases: m.model ? '' : String(input.aliases || '').trim(), photo: photo, pack: packText
      }));
      if (!isPack && m.stock) moves.push(moveRow_({ product: product, model: m.model }, 'Stock initial', m.stock, m.stock, cost, '', user.name, ''));
    });
    if (rows.length) {
      var r = sh.getLastRow() + 1;
      ensureRows_(sh, r + rows.length - 1);
      sh.getRange(r, 1, rows.length, header.length).setValues(rows);
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      logStockMoves_(moves);
      log_(user, '', 'Produits', isPack ? 'Pack ajouté : ' + product + ' (' + packText + ')' : product + ' : ' + rows.length + ' modèle(s) ajouté(s)');
    }
    return {
      added: rows.length, skipped: skipped,
      message: (isPack ? (rows.length ? 'Pack « ' + product + ' » ajouté.' : '') : rows.length + ' modèle(s) ajouté(s) pour « ' + product + ' ».') +
        (skipped.length ? ' Déjà présent(s) : ' + skipped.join(', ') + '.' : '')
    };
  });
}

/** Le modèle visé par la page (n° de ligne et clé), ou une erreur s'il a changé entre-temps. */
function catalogRowAt_(catalog, input) {
  var row = catalog.rows.filter(function (r) { return r.row === Number(input && input.row); })[0];
  if (!row || row.key !== String(input.key || '')) throw new Error('Ce modèle a été modifié entre-temps dans le classeur : rechargez la page.');
  return row;
}

/**
 * Modifie un modèle (nom, prix, coût, seuil, autres noms, actif, photo, contenu du pack). Le stock ne
 * se modifie pas ici : entrée de marchandise ou inventaire. Renommé, l'ancien nom est gardé dans
 * « Autres noms » pour que les commandes déjà passées restent reliées.
 */
function api_updateCatalogRow(input) {
  cloudGuardAll_();
  var user = requireStockAccess_();
  input = input || {};
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var row = catalogRowAt_(catalog, input);
    var product = String(input.product == null ? row.product : input.product).replace(/\s+/g, ' ').trim();
    var model = String(input.model == null ? row.model : input.model).replace(/\s+/g, ' ').trim();
    if (!product) throw new Error('Indiquez le nom du produit.');
    var aliases = String(input.aliases == null ? row.aliases.join('; ') : input.aliases).split(/[;\n]/).map(function (a) { return a.trim(); }).filter(function (a) { return a; });
    var newKey = catalogKey_(product, model);
    if (newKey !== row.key) {
      var clash = catalog.rows.filter(function (r) { return r.row !== row.row && r.key === newKey; })[0];
      if (clash) throw new Error('Ce modèle existe déjà : ' + rowLabel_(clash) + '. Pour réunir les deux, utilisez « Fusionner ».');
      var old = rowLabel_(row);
      if (aliases.map(normalizeLoose_).indexOf(normalizeLoose_(old)) < 0) aliases.push(old);
    }
    var fields = { product: product, model: model, aliases: aliases.join('; ') };
    if (input.active !== undefined) fields.active = input.active === false || isNo_(input.active) ? 'NON' : 'OUI';
    if (input.price !== undefined) fields.price = numOrBlank_(input.price) === null ? '' : numOrBlank_(input.price);
    if (input.cost !== undefined) fields.cost = numOrBlank_(input.cost) === null ? '' : numOrBlank_(input.cost);
    if (input.threshold !== undefined) fields.threshold = numOrBlank_(input.threshold) === null ? '' : numOrBlank_(input.threshold);
    if (input.photo !== undefined) fields.photo = photoInput_(input.photo);
    if (input.pack !== undefined && row.packText) {
      if (catalog.rows.some(function (r) { return r.pack && r.row !== row.row && r.pack.items.some(function (i) { return i.key === row.key; }); })) throw new Error('Un pack ne peut pas contenir un pack.');
      fields.pack = packInput_(catalog, input.pack);
    }
    writeCatalogCells_(sh, catalog, row.row, fields);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    log_(user, '', 'Produits', 'Modifié : ' + rowLabel_({ product: product, model: model }) + (fields.active === 'NON' ? ' (masqué)' : ''));
    return { message: 'Modèle enregistré : ' + rowLabel_({ product: product, model: model }) + '.' };
  });
}

/** Masquer un modèle qu'on ne vend plus (son historique est gardé), ou le réafficher. input = { row, key, active }. */
function api_setCatalogActive(input) {
  cloudGuardAll_();
  var user = requireStockAccess_();
  input = input || {};
  var active = !(input.active === false || isNo_(input.active));
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var row = catalogRowAt_(catalog, input);
    writeCatalogCells_(sh, catalog, row.row, { active: active ? 'OUI' : 'NON' });
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    log_(user, '', 'Produits', (active ? 'Réaffiché : ' : 'Masqué : ') + rowLabel_(row));
    return { message: active ? rowLabel_(row) + ' est de nouveau affiché.' : rowLabel_(row) + ' est masqué (il reste dans « Inactifs », avec son historique).' };
  });
}

/**
 * Supprime un modèle ajouté par erreur : seulement si aucune commande ne l'a utilisé (aucune commande
 * en cours, aucun mouvement lié à une commande) et s'il n'est dans aucun pack. Les mouvements tapés
 * à la main (stock de départ, entrées, inventaires) ne bloquent pas ; le stock restant est noté sorti.
 */
function api_deleteCatalogRow(input) {
  cloudGuardAll_();
  var user = requireStockAccess_();
  input = input || {};
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var row = catalogRowAt_(catalog, input);
    var label = rowLabel_(row);
    var inPack = catalog.rows.filter(function (r) { return r.pack && r.pack.items.some(function (i) { return i.key === row.key; }); })[0];
    if (inPack) throw new Error('Impossible de supprimer ' + label + ' : il fait partie du pack « ' + rowLabel_(inPack) + ' ». Masquez-le plutôt.');
    var used = 0;
    // Commandes en cours (Cloudflare : libellés regroupés par la base, avec leur nombre __n).
    recentOrdersForLabels_(readOrders_()).forEach(function (o) {
      if (catalogItems_(catalog, o).some(function (it) { return matchCatalog_(catalog, it.label) === row; })) used += o.__n || 1;
    });
    if (used) throw new Error('Impossible de supprimer ' + label + ' : ' + plural_(used, 'commande l’utilise', 'commandes l’utilisent') + '. Masquez-le, ou fusionnez-le avec le bon modèle.');
    var counts = stockOrderMoveCounts_();
    var keys = [row.key].concat(row.aliases.map(normalizeLoose_));
    var moved = keys.reduce(function (n, k, i) { return keys.indexOf(k) === i ? n + (counts[k] || 0) : n; }, 0);
    if (moved) throw new Error('Impossible de supprimer ' + label + ' : il a déjà ' + plural_(moved, 'mouvement lié à une commande', 'mouvements liés à des commandes') + '. Masquez-le, ou fusionnez-le avec le bon modèle.');
    sh.deleteRow(row.row);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    if (row.stock) logStockMoves_([moveRow_(row, 'Modèle supprimé', -row.stock, 0, '', '', user.name, '')]);
    log_(user, '', 'Produits', 'Supprimé : ' + label + (row.stock ? ' (stock ' + row.stock + ' retiré)' : ''));
    return { message: label + ' a été supprimé.' };
  });
}

/**
 * Fusionne un doublon (from) dans le bon modèle (to) : le stock s'ajoute, les noms du doublon deviennent
 * des « autres noms » du bon modèle (les commandes et l'historique le retrouvent), puis le doublon est retiré.
 * input = { from: { row, key }, to: { row, key } }.
 */
function api_mergeCatalogRows(input) {
  cloudGuardAll_();
  var user = requireStockAccess_();
  input = input || {};
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var from = catalogRowAt_(catalog, input.from);
    var to = catalogRowAt_(catalog, input.to);
    if (from.row === to.row) throw new Error('Choisissez un autre modèle.');
    if (from.pack || to.pack) throw new Error('Un pack ne se fusionne pas : modifiez son contenu, ou supprimez-le.');
    var aliases = to.aliases.slice();
    var known = [to.key].concat(aliases.map(normalizeLoose_));
    [rowLabel_(from)].concat(from.aliases).forEach(function (a) {
      var k = normalizeLoose_(a);
      if (k && known.indexOf(k) < 0) { aliases.push(a); known.push(k); }
    });
    var fields = { aliases: aliases.join('; ') };
    var moves = [];
    var qty = from.stock || 0;
    if (qty) {
      var after = (to.stock || 0) + qty;
      fields.stock = after;
      moves.push(moveRow_(from, 'Fusion', -qty, 0, '', '', user.name, 'Vers ' + rowLabel_(to)));
      moves.push(moveRow_(to, 'Fusion', qty, after, '', '', user.name, 'Depuis ' + rowLabel_(from)));
    } else if (to.stock === null && from.stock !== null) {
      fields.stock = 0;
    }
    if (to.cost === null && from.cost !== null) fields.cost = from.cost;
    if (to.price === null && from.price !== null) fields.price = from.price;
    if (!to.photo && from.photo) fields.photo = from.photo;
    writeCatalogCells_(sh, catalog, to.row, fields);
    sh.deleteRow(from.row);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_(moves);
    log_(user, '', 'Produits', 'Fusionné : ' + rowLabel_(from) + ' → ' + rowLabel_(to) + (qty ? ' (' + qty + ' pièce(s))' : ''));
    return { message: rowLabel_(from) + ' a été fusionné dans ' + rowLabel_(to) + (qty ? ' (' + plural_(qty, 'pièce ajoutée', 'pièces ajoutées') + ')' : '') + '.' };
  });
}

/**
 * Annule un mouvement tapé à la main (entrée, inventaire, stock de départ) : un mouvement inverse
 * « Annulation » est ajouté, les deux restent dans l'historique. input = { ref, key, type, qty, date }.
 */
function api_undoStockMove(input) {
  cloudGuardAll_();
  var user = requireStockAccess_();
  input = input || {};
  var settings = getSettings_();
  return withLock_(function () {
    var mv = stockMoveByRef_(input.ref);
    if (!mv || mv.key !== String(input.key || '') || mv.type !== String(input.type || '') || mv.qty !== toNumber_(input.qty) || mv.date !== String(input.date || '')) {
      throw new Error('Ce mouvement a changé entre-temps : rechargez la page.');
    }
    if (STOCK_UNDOABLE_.indexOf(mv.type) < 0 || !mv.qty) throw new Error('Seuls les entrées, inventaires et stocks de départ s’annulent ici.');
    var note = undoNote_(mv);
    if (stockUndoNotes_().indexOf(note) >= 0) throw new Error('Ce mouvement a déjà été annulé.');
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var row = matchCatalog_(catalog, mv.key);
    if (!row || row.pack) throw new Error('Ce modèle n’est plus dans le catalogue : faites plutôt un inventaire.');
    var before = row.stock === null ? 0 : row.stock;
    var after = before - mv.qty;
    if (after < 0) throw new Error('Impossible : le stock de ' + rowLabel_(row) + ' passerait à ' + after + ' (des pièces sont déjà parties). Faites plutôt un inventaire.');
    var fields = { stock: after };
    // Entrée avec coût moyen : le coût d'achat revient à celui d'avant l'entrée.
    if (mv.type === 'Entrée' && mv.cost && settings.COUT_MOYEN && row.cost !== null && after > 0) {
      var back = Math.round((row.cost * before - mv.qty * mv.cost) / after);
      if (back > 0) fields.cost = back;
    }
    writeCatalogCells_(sh, catalog, row.row, fields);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_([moveRow_(row, STOCK_UNDO_TYPE_, -mv.qty, after, '', '', user.name, note)]);
    log_(user, '', 'Stock : annulation', rowLabel_(row) + ' · ' + note);
    return { message: 'Mouvement annulé : ' + rowLabel_(row) + ' ' + (mv.qty > 0 ? '−' : '+') + Math.abs(mv.qty) + ' (stock ' + after + ').' };
  });
}

/**
 * Stock et valeur à la fin d'un jour (« yyyy-MM-dd », heure d'Algérie) : le stock d'aujourd'hui moins
 * les mouvements faits depuis. Valeur au coût d'achat d'aujourd'hui.
 */
function api_stockAt(day) {
  requireStockAccess_();
  day = String(day || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Choisissez une date.');
  if (day > ymd_(new Date())) throw new Error('Choisissez une date passée (ou aujourd’hui).');
  var end = new Date(addDayDays_(day, 1) + 'T00:00:00+01:00');
  var catalog = readCatalog_();
  var since = {};
  stockMovesSince_(end).forEach(function (m) {
    var row = matchCatalog_(catalog, m.product + ' ' + m.model);
    if (row && !row.pack) since[row.key] = (since[row.key] || 0) + toNumber_(m.qty);
  });
  var rows = [];
  var units = 0;
  var value = 0;
  catalog.rows.forEach(function (r) {
    if (r.pack || (r.stock === null && !since[r.key])) return;
    var stock = (r.stock || 0) - (since[r.key] || 0);
    var v = r.cost !== null ? Math.max(stock, 0) * r.cost : 0;
    units += Math.max(stock, 0);
    value += v;
    rows.push({ product: r.product, model: r.model, stock: stock, cost: r.cost, value: Math.round(v), active: r.active });
  });
  return { day: day, units: units, value: Math.round(value), rows: rows };
}

/**
 * Entrée de marchandise : items = [{ row, key, qty, cost }]. Le stock augmente ; avec
 * COUT_MOYEN = OUI, le coût d'achat devient la moyenne pondérée (ancien stock et nouvelle entrée).
 */
function api_stockEntry(input) {
  cloudGuardAll_();
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
  cloudGuardAll_();
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
  cloudGuard_();
  var user = requireStockAccess_();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (o.status !== STATUS.RETURNED || String(o.stockMove).trim() !== STOCK_BACK_) {
      throw new Error('Seul un retour reçu et remis en stock peut être marqué abîmé.');
    }
    damageReturn_(ctx, o, user);
    return { order: serializeOrder_(o), message: 'Retour ' + o.id + ' marqué abîmé : retiré du stock.' };
  });
}

/** Retire du stock un retour abîmé et le note sur la commande (sous verrou). */
function damageReturn_(ctx, o, user) {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    stockLines_(catalog, catalogItems_(catalog, o)).forEach(function (l) {
      var row = l.row;
      if (!row || row.stock === null) return;
      row.stock -= l.qty;
      writeCatalogCells_(sh, catalog, row.row, { stock: row.stock });
      moves.push(moveRow_(row, 'Retour abîmé', -l.qty, row.stock, '', String(o.id), user.name, l.pack ? 'Pack : ' + rowLabel_(l.pack) : ''));
    });
    writeFields_(ctx, o, { stockMove: STOCK_DAMAGED_, updated: new Date() });
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_(moves);
    log_(user, o.id, 'Stock : retour abîmé', moves.length ? 'Retiré du stock' : 'Produit non suivi en stock');
}
