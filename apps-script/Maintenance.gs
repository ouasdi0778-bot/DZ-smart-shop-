/**
 * Maintenance.gs : chaque nuit (vers 3 h), le classeur reste léger.
 *
 *  - Archivage : les commandes terminées depuis longtemps (ARCHIVE_JOURS, 100 par
 *    défaut) partent dans l'onglet Archive. Une commande livrée dont l'argent
 *    n'est pas encore versé par Ecotrack, ou un retour pas encore reçu, reste
 *    dans Commandes (la page Suivi en a besoin). Le bilan de chaque client
 *    (livrées, retours, annulées) est gardé dans l'onglet Clients : les alertes
 *    « Fiable » et « Risque » restent justes.
 *  - Journal : les lignes plus anciennes que JOURNAL_JOURS (90 par défaut) sont effacées.
 *  - Onglets allégés : les lignes et colonnes vides en trop sont supprimées.
 */

var ARCHIVE_EXTRA_ = ['Archivée le'];
var FINAL_STATUSES_ = [STATUS.DELIVERED, STATUS.RETURNED, STATUS.CANCELLED];

/** Commande terminée, sans mouvement depuis la date limite, et sans argent ou colis en attente. */
function isArchivable_(o, limit) {
  var s = String(o.status);
  if (FINAL_STATUSES_.indexOf(s) < 0) return false;
  if (hasEcotrackParcel_(o)) {
    var info = ecotrackStatusInfo_(o.carrierStatus);
    if (s === STATUS.DELIVERED && !(info && info.group === 'paid')) return false;
    if (s === STATUS.RETURNED && !(info && info.group === 'returned')) return false;
  }
  var last = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date);
  return !!last && last < limit;
}

/** Valeurs d'une ligne rangées selon les titres d'un autre onglet (colonnes retrouvées par leur titre). */
function rowForHeader_(srcTitles, srcRow, destHeader, extra) {
  var byTitle = {};
  srcTitles.forEach(function (t, i) {
    var k = normalizeText_(t);
    if (k && byTitle[k] === undefined) byTitle[k] = srcRow[i];
  });
  Object.keys(extra || {}).forEach(function (t) { byTitle[normalizeText_(t)] = extra[t]; });
  return destHeader.map(function (t) {
    var v = byTitle[normalizeText_(t)];
    return v === undefined ? '' : v;
  });
}

/** Ajoute des lignes en bas d'un onglet d'archive (Archive, Corbeille), colonnes texte comprises. */
function appendArchiveRows_(sh, rows) {
  if (!rows.length) return;
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + rows.length - 1);
  var map = headerMap_(header);
  TEXT_KEYS_.forEach(function (k) {
    if (map[k] !== undefined) sh.getRange(r, map[k] + 1, rows.length, 1).setNumberFormat('@');
  });
  sh.getRange(r, 1, rows.length, header.length).setValues(rows);
}

/** Supprime des lignes (numéros quelconques), du bas vers le haut, par blocs voisins. */
function deleteRowNumbers_(sh, numbers) {
  var list = numbers.slice().sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < list.length) {
    var end = list[i];
    var start = end;
    while (i + 1 < list.length && list[i + 1] === start - 1) { i++; start--; }
    sh.deleteRows(start, end - start + 1);
    i++;
  }
}

/** Archive les commandes terminées depuis plus de ARCHIVE_JOURS jours. */
function archiveOldOrders_() {
  var days = getSettings_().ARCHIVE_JOURS;
  var summary = { archived: 0, days: days };
  if (!days) return summary;
  var limit = new Date(Date.now() - days * 86400000);
  return withLock_(function () {
    var ctx = readOrders_();
    var list = ctx.orders.filter(function (o) { return isArchivable_(o, limit); });
    if (!list.length) return summary;

    var titles = ctx.sheet.getRange(1, 1, 1, ctx.width).getValues()[0];
    var all = ctx.sheet.getRange(2, 1, ctx.sheet.getLastRow() - 1, ctx.width).getValues();
    var arch = ss_().getSheetByName(SHEET.ARCHIVE) || ss_().insertSheet(SHEET.ARCHIVE);
    ensureHeaders_(arch, titles.map(function (t) { return String(t).trim(); }).filter(function (t) { return t; }).concat(ARCHIVE_EXTRA_));
    var header = arch.getRange(1, 1, 1, arch.getLastColumn()).getValues()[0];
    var now = new Date();
    var extra = {};
    extra[ARCHIVE_EXTRA_[0]] = now;
    appendArchiveRows_(arch, list.map(function (o) { return rowForHeader_(titles, all[o._row - 2], header, extra); }));

    addArchivedCounts_(list);
    deleteRowNumbers_(ctx.sheet, list.map(function (o) { return o._row; }));
    log_({ name: 'Automatique' }, '', 'Archivage', list.length + ' commande(s) terminée(s) depuis plus de ' + days + ' jours déplacée(s) dans l’onglet Archive');
    summary.archived = list.length;
    return summary;
  });
}

/** Onglet Clients : ajoute au bilan de chaque numéro ses commandes archivées. */
function addArchivedCounts_(orders) {
  var sh = sheet_(SHEET.CLIENTS);
  ensureHeaders_(sh, CLIENT_TITLES_);
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = function (title) {
    for (var i = 0; i < header.length; i++) if (normalizeText_(header[i]) === normalizeText_(title)) return i;
    return -1;
  };
  var cPhone = col('Téléphone');
  var cName = col('Nom');
  var cBlack = col('Liste noire');
  var cCounts = [col('Livrées archivées'), col('Retours archivés'), col('Annulées archivées')];

  var add = {};
  var names = {};
  orders.forEach(function (o) {
    var p = normalizePhone(o.phone);
    if (!p.valid) return;
    var c = add[p.phone] = add[p.phone] || [0, 0, 0];
    c[o.status === STATUS.DELIVERED ? 0 : o.status === STATUS.RETURNED ? 1 : 2]++;
    if (!names[p.phone] && o.client) names[p.phone] = String(o.client);
  });
  var phones = Object.keys(add);
  if (!phones.length) return;

  var last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2, 1, last - 1, lastCol).getValues() : [];
  var rowOf = {};
  values.forEach(function (r, i) {
    var p = normalizePhone(r[cPhone]).phone;
    if (p && rowOf[p] === undefined) rowOf[p] = i;
  });
  var fresh = [];
  phones.forEach(function (p) {
    if (rowOf[p] !== undefined) {
      var row = values[rowOf[p]];
      cCounts.forEach(function (c, k) { row[c] = toNumber_(row[c]) + add[p][k]; });
    } else {
      var nr = header.map(function () { return ''; });
      nr[cPhone] = p;
      if (cName >= 0) nr[cName] = names[p] || '';
      if (cBlack >= 0) nr[cBlack] = false;
      cCounts.forEach(function (c, k) { nr[c] = add[p][k]; });
      fresh.push(nr);
    }
  });
  // Les trois colonnes de bilan sont voisines : une seule écriture pour les clients déjà connus.
  if (values.length) {
    var first = Math.min.apply(null, cCounts);
    var block = values.map(function (r) { return cCounts.map(function (c) { return r[c] === '' ? '' : toNumber_(r[c]); }); });
    if (Math.max.apply(null, cCounts) - first === 2) {
      sh.getRange(2, first + 1, block.length, 3).setValues(block);
    } else {
      cCounts.forEach(function (c, k) { sh.getRange(2, c + 1, block.length, 1).setValues(block.map(function (b) { return [b[k]]; })); });
    }
  }
  if (fresh.length) {
    var r = sh.getLastRow() + 1;
    ensureRows_(sh, r + fresh.length - 1);
    sh.getRange(r, cPhone + 1, fresh.length, 1).setNumberFormat('@');
    sh.getRange(r, 1, fresh.length, header.length).setValues(fresh);
  }
  clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
}

/** Commandes archivées (pour le tableau de bord sur « Tout »), avec les champs utiles. */
function readArchivedOrders_() {
  var sh = ss_().getSheetByName(SHEET.ARCHIVE);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var map = headerMap_(values[0]);
  var keys = ['id', 'date', 'status', 'total', 'wilaya', 'agent', 'product', 'qty', 'price', 'carrier', 'mode', 'shipping', 'campaign', 'adSource', 'carrierStatus', 'tracking',
    'cancelReason', 'courierNote', 'deliveredAt', 'confirmedAt'];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var o = { archived: true };
    keys.forEach(function (k) { o[k] = map[k] === undefined ? '' : values[r][map[k]]; });
    o.status = String(o.status).trim();
    if (o.status) out.push(o);
  }
  return out;
}

/** Efface les lignes du Journal plus anciennes que `days` jours (elles sont en haut, par date). */
function trimJournal_(days) {
  if (!days) return 0;
  var sh = ss_().getSheetByName(SHEET.LOG);
  if (!sh || sh.getLastRow() < 2) return 0;
  var limit = Date.now() - days * 86400000;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var n = 0;
  while (n < dates.length) {
    var d = toDate_(dates[n][0]);
    if (d && d.getTime() < limit) n++; else break;
  }
  if (n) sh.deleteRows(2, n);
  return n;
}

/** Supprime les lignes vides en trop (en gardant `spare` lignes libres) et, si demandé, les colonnes vides. */
function trimSheet_(sh, spare, trimColumns) {
  var lastRow = Math.max(sh.getLastRow(), 1);
  var want = lastRow + spare;
  var maxRows = sh.getMaxRows();
  var removed = 0;
  if (maxRows > want) { sh.deleteRows(want + 1, maxRows - want); removed += maxRows - want; }
  if (trimColumns) {
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var maxCols = sh.getMaxColumns();
    if (maxCols > lastCol) sh.deleteColumns(lastCol + 1, maxCols - lastCol);
  }
  return removed;
}

/** Allège les onglets : lignes vides en trop, colonnes vides inutiles. L'onglet RELEASIT n'est jamais touché. */
function lightenSheets_() {
  var ss = ss_();
  var plan = [
    [SHEET.ORDERS, 300, false],
    [SHEET.LOG, 100, true],
    [SHEET.ARCHIVE, 100, true],
    [TRASH.SHEET, 50, true],
    [SHEET.CLIENTS, 200, true],
    [SHEET.SETTINGS, 20, true],
    [SHEET.TEAM, 20, true],
    [SHEET.PRODUCTS, 100, true],
    [SHEET.MOVES, 200, true]
  ];
  var removed = 0;
  plan.forEach(function (p) {
    var sh = ss.getSheetByName(p[0]);
    if (sh) removed += trimSheet_(sh, p[1], p[2]);
  });
  return removed;
}

/** Déclencheur de nuit : archivage, Journal raccourci, onglets allégés. */
function nightlyMaintenance() {
  var t0 = Date.now();
  var out = { archived: 0, journal: 0, rows: 0, autoCancelled: 0, stats: 0, errors: [] };
  var step = function (name, fn) {
    try { fn(); } catch (e) { out.errors.push(name + ' : ' + (e && e.message ? e.message : e)); }
  };
  step('appels', function () { out.autoCancelled = autoCancelUnreachable_(); });
  step('stock', function () { withLock_(function () { applyStockMoves_(readOrders_()); }); });
  step('archivage', function () { out.archived = archiveOldOrders_().archived; });
  step('journal', function () { out.journal = trimJournal_(getSettings_().JOURNAL_JOURS); });
  step('allègement', function () { out.rows = lightenSheets_(); });
  step('statistiques', function () { out.stats = rebuildStats_().days; });
  if (out.errors.length) log_({ name: 'Automatique' }, '', 'Erreur maintenance', out.errors.join(' · '));
  try { noteNightly_(Date.now() - t0, out.errors); } catch (e) { /* l'état de l'outil ne doit pas bloquer l'entretien */ }
  return out;
}

function menuMaintenance() {
  var ui = SpreadsheetApp.getUi();
  var r = nightlyMaintenance();
  ui.alert(APP_NAME,
    r.autoCancelled + ' commande(s) sans réponse annulée(s), ' + r.archived + ' commande(s) archivée(s), ' + r.journal + ' ligne(s) de Journal effacée(s), ' + r.rows + ' ligne(s) vide(s) supprimée(s).' +
    (r.errors.length ? '\n\nProblème : ' + r.errors.join(' · ') : ''),
    ui.ButtonSet.OK);
}
