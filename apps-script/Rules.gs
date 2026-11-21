/**
 * Rules.gs : ce qu'on peut faire d'une commande selon son étape,
 * l'annulation d'un colis Ecotrack, et la corbeille.
 *
 * Étapes :
 *  1. queue      en confirmation (À confirmer, Pas de réponse, Rappeler, Injoignable) : tout est modifiable ;
 *  2. confirmed  confirmée, pas encore envoyée : tout est modifiable ;
 *  3. parcel     colis créé chez Ecotrack, pas encore validé : verrouillée, sauf les notes.
 *                « Annuler le colis » le supprime chez Ecotrack et déverrouille la commande ;
 *  4. shipping   expédiée ou en livraison : verrouillée ; pour Ecotrack, le statut vient d'Ecotrack ;
 *  5. done       livrée, retour ou annulée : lecture seule (une commande annulée avant
 *                l'envoi peut être remise « À confirmer »).
 * Un administrateur (onglet Équipe) peut déverrouiller une commande en donnant un motif.
 */

var STAGE = { QUEUE: 'queue', CONFIRMED: 'confirmed', PARCEL: 'parcel', SHIPPING: 'shipping', DONE: 'done' };

var TRASH = {
  SHEET: 'Corbeille',
  EXTRA: ['Supprimée le', 'Supprimée par', 'Motif de suppression'],
  // Onglet caché : n° des commandes effacées de la corbeille (elles ne doivent pas revenir).
  BLOCKED: 'Numéros effacés',
  BLOCKED_TITLES: ['N°', 'Effacée le', 'Par']
};

function hasEcotrackParcel_(o) {
  return String(o.carrier) === ECO.NAME && !isBlank_(o.tracking);
}

function orderStage_(o) {
  var s = String(o.status || '');
  if (s === STATUS.DELIVERED || s === STATUS.RETURNED || s === STATUS.CANCELLED) return STAGE.DONE;
  if (s === STATUS.SHIPPED || s === STATUS.IN_DELIVERY) return STAGE.SHIPPING;
  if (hasEcotrackParcel_(o)) return STAGE.PARCEL;
  return s === STATUS.CONFIRMED ? STAGE.CONFIRMED : STAGE.QUEUE;
}

/** Statuts de la page Commandes : pas encore confirmées. */
var TODO_STATUSES_ = [STATUS.TO_CONFIRM, STATUS.NO_ANSWER, STATUS.CALLBACK, STATUS.UNREACHABLE];

/**
 * Page où se trouve une commande : 'commandes' (à confirmer), 'expedier' (confirmée),
 * 'suivi' (en route, retour en cours), 'terminees' (livrée, retour reçu), 'annulees'.
 */
function pageOf_(o) {
  var s = String(o.status || '');
  if (s === STATUS.CANCELLED) return 'annulees';
  if (s === STATUS.CONFIRMED) return 'expedier';
  if (s === STATUS.SHIPPED || s === STATUS.IN_DELIVERY) return 'suivi';
  if (s === STATUS.RETURNED) return returnReceived_(o) ? 'terminees' : 'suivi';
  if (s === STATUS.DELIVERED) return 'terminees';
  return 'commandes';
}

function isLockedStage_(stage) {
  return stage === STAGE.PARCEL || stage === STAGE.SHIPPING || stage === STAGE.DONE;
}

/** Rôle « Administrateur » (ou « Admin ») dans l'onglet Équipe. */
function isAdmin_(user) {
  return /^admin/.test(normalizeText_(user && user.role));
}

function stamp_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM/yyyy à HH:mm');
}

/**
 * Ce qui est permis pour cette commande : verrou, motif affiché, statuts
 * possibles, et boutons (annuler le colis, remettre à confirmer, supprimer, déverrouiller).
 */
function orderRules_(o, user, settings) {
  var stage = orderStage_(o);
  var status = String(o.status || '');
  var admin = isAdmin_(user);
  var carrier = String(o.carrier || (settings && settings.SOCIETE_PAR_DEFAUT) || '');
  var manualCarrier = carrier !== ECO.NAME; // société sans API : les statuts de livraison se saisissent à la main
  var allowed = [status];
  var reason = '';

  if (stage === STAGE.QUEUE || stage === STAGE.CONFIRMED) {
    allowed = STATUS_LIST.filter(function (s) { return manualCarrier || SHIPPED_STATUSES.indexOf(s) < 0; });
  } else if (stage === STAGE.PARCEL) {
    var since = toDate_(o.carrierMoved);
    reason = 'Colis créé chez Ecotrack' + (since ? ' le ' + stamp_(since) : '') + ' (n° ' + o.tracking + ') : la commande est verrouillée. ' +
      'Pour la modifier ou l’annuler, annulez d’abord le colis.';
  } else if (stage === STAGE.SHIPPING) {
    if (hasEcotrackParcel_(o)) {
      reason = 'Colis validé et en route : la commande ne peut plus être modifiée. Son statut est mis à jour par Ecotrack.';
    } else {
      reason = 'Commande expédiée : elle ne peut plus être modifiée. Mettez à jour son statut quand le livreur vous informe.';
      allowed = SHIPPED_STATUSES.filter(function (s) { return STATUS_RANK_[s] >= STATUS_RANK_[status]; });
    }
  } else {
    reason = status === STATUS.DELIVERED ? 'Commande livrée : elle ne peut plus être modifiée.'
      : status === STATUS.RETURNED ? 'Commande retournée : elle ne peut plus être modifiée.'
      : 'Commande annulée : elle ne peut plus être modifiée.';
  }

  var canReopen = status === STATUS.CANCELLED && isBlank_(o.tracking);
  if (canReopen) {
    allowed = [STATUS.CANCELLED, STATUS.TO_CONFIRM];
    reason += ' Si le client la veut finalement, remettez-la « À confirmer ».';
  }
  var locked = isLockedStage_(stage);
  var neverSent = isBlank_(o.tracking) && SHIPPED_STATUSES.indexOf(status) < 0;
  return {
    stage: stage,
    locked: locked,
    reason: reason,
    statuses: STATUS_LIST.filter(function (s) { return allowed.indexOf(s) >= 0; }),
    canCancelParcel: stage === STAGE.PARCEL,
    canPrintLabel: canPrintLabel_(o),
    canReopen: canReopen,
    canDelete: admin && neverSent,
    canUnlock: admin && locked,
    admin: admin
  };
}

/** Message quand un statut n'est pas permis. */
function statusRefusal_(o, rules, wanted) {
  if (rules.stage === STAGE.PARCEL) return 'Colis créé chez Ecotrack : annulez d’abord le colis pour changer le statut.';
  if (rules.stage === STAGE.SHIPPING && hasEcotrackParcel_(o)) return 'Le statut de ce colis est mis à jour par Ecotrack : il ne se change pas à la main.';
  if (rules.stage === STAGE.SHIPPING) return 'Une commande expédiée ne peut pas revenir à « ' + wanted + ' ».';
  if (rules.stage === STAGE.DONE) return rules.reason;
  return 'Avec Ecotrack, le statut « ' + wanted + ' » arrive tout seul : créez le colis depuis la page Expéditions.';
}

/* ------------------------------------------------------------------ */
/* Annuler un colis Ecotrack (avant sa validation)                    */
/* ------------------------------------------------------------------ */

/**
 * Supprime le colis chez Ecotrack (possible tant que l'expédition n'est pas
 * validée), puis efface le n° de suivi : la commande redevient « Confirmée »,
 * modifiable, et peut être renvoyée depuis la page Expéditions.
 */
function cancelParcel_(id, user) {
  var tracking = withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (orderStage_(o) !== STAGE.PARCEL) throw new Error('La commande ' + id + ' n’a pas de colis Ecotrack en attente de validation.');
    return String(o.tracking).trim();
  });

  var res = ecotrackCall_('DELETE', '/api/v1/delete/order', { query: { tracking: tracking } });
  if (!res.ok) throw ecotrackFail_(res);
  var json = res.json || {};
  if (json.success === false || json.error) {
    var detail = flattenEcotrackErrors_(json.error || json.errors) || String(json.message || '');
    throw new Error('Ecotrack refuse d’annuler le colis ' + tracking + (detail ? ' (' + detail + ')' : '') + '. ' +
      'S’il est déjà validé, il ne peut plus être annulé depuis l’outil : faites une demande de retour chez Ecotrack.');
  }

  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (String(o.tracking).trim() === tracking) {
      writeFields_(ctx, o, { tracking: '', carrierStatus: '', carrierMoved: '', paymentId: '', followUp: '', updated: new Date() });
    }
    log_(user, o.id, 'Colis annulé', 'Colis ' + tracking + ' supprimé chez Ecotrack · la commande redevient modifiable');
    return { order: serializeOrder_(o), counts: countsData_(ctx, null),
      message: 'Colis ' + tracking + ' annulé chez Ecotrack. La commande ' + o.id + ' est de nouveau modifiable.' };
  });
}

function api_cancelParcel(id) {
  cloudGuard_();
  var user = currentUser_();
  if (isConfirmatrice_(user)) {
    var a = pageAccess_(user);
    if (!a.ship && !a.track) requirePage_(user, 'ship');
    requireOwn_(findOrder_(readOrders_(), String(id)), user);
  }
  return cancelParcel_(String(id), user);
}

/* ------------------------------------------------------------------ */
/* Corbeille                                                          */
/* ------------------------------------------------------------------ */

/** N° des commandes à la corbeille ou effacées : les importations ne les recréent pas. */
function trashIds_() {
  var set = {};
  [TRASH.SHEET, TRASH.BLOCKED].forEach(function (name) {
    var sh = ss_().getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    var map = headerMap_(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
    if (map.id === undefined) return;
    sh.getRange(2, map.id + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var id = String(r[0]).trim();
      if (id) set[id] = true;
    });
  });
  return set;
}

function requireAdminFor_(what) {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Seul un administrateur (onglet Équipe) peut ' + what + '.');
  return user;
}

/** Liste de n° propre (sans doublons ni vides). */
function idList_(ids) {
  var seen = {};
  return (Array.isArray(ids) ? ids : [ids]).map(function (x) { return String(x == null ? '' : x).trim(); })
    .filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
}

/** Supprime des lignes (n° de ligne du classeur), de la dernière à la première, par blocs. */
function deleteSheetRows_(sh, rows) {
  rows = rows.slice().sort(function (a, b) { return b - a; });
  if (!rows.length) return;
  // Le classeur refuse de supprimer toutes les lignes non figées : on garde une ligne vide en dessous.
  ensureRows_(sh, sh.getLastRow() + 1);
  var i = 0;
  while (i < rows.length) {
    var end = rows[i];
    var start = end;
    while (i + 1 < rows.length && rows[i + 1] === start - 1) { i++; start--; }
    if (start === end) sh.deleteRow(start); else sh.deleteRows(start, end - start + 1);
    i++;
  }
}

/** Met des commandes à la corbeille (sous verrou). Renvoie { deleted, skipped: [{ id, why }] }. */
function trashOrders_(ctx, ids, why, user, force) {
  var out = { deleted: [], skipped: [] };
  var titles = ctx.sheet.getRange(1, 1, 1, ctx.width).getValues()[0];
  var picked = [];
  ids.forEach(function (id) {
    var o = findOrder_(ctx, id);
    if (!o) { out.skipped.push({ id: id, why: 'introuvable' }); return; }
    if (!force && !orderRules_(o, user, null).canDelete) { out.skipped.push({ id: id, why: 'déjà envoyée à une société de livraison' }); return; }
    picked.push(o);
  });
  if (!picked.length) return out;
  var sh = ss_().getSheetByName(TRASH.SHEET) || ss_().insertSheet(TRASH.SHEET);
  ensureHeaders_(sh, titles.map(function (t) { return String(t).trim(); }).filter(function (t) { return t; }).concat(TRASH.EXTRA));
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var now = new Date();
  var rows = picked.map(function (o) {
    var values = ctx.sheet.getRange(o._row, 1, 1, ctx.width).getValues()[0];
    var extra = {};
    extra[TRASH.EXTRA[0]] = now;
    extra[TRASH.EXTRA[1]] = user.name;
    extra[TRASH.EXTRA[2]] = why;
    return rowForHeader_(titles, values, header, extra);
  });
  appendArchiveRows_(sh, rows);
  deleteSheetRows_(ctx.sheet, picked.map(function (o) { return o._row; }));
  picked.forEach(function (o) {
    log_(user, o.id, 'Suppression', 'Mise à la corbeille' + (why ? ' · Motif : ' + why : ''));
    out.deleted.push(String(o.id));
  });
  ctx.orders = ctx.orders.filter(function (x) { return picked.indexOf(x) < 0; });
  return out;
}

/**
 * Met une commande à la corbeille (administrateur, avant tout envoi à une
 * société de livraison). La ligne est déplacée dans l'onglet Corbeille.
 */
function api_deleteOrder(id, reason) {
  cloudGuard_();
  var user = requireAdminFor_('supprimer une commande');
  var why = String(reason == null ? '' : reason).trim();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (!orderRules_(o, user, null).canDelete) {
      throw new Error('Une commande envoyée à une société de livraison ne peut pas être supprimée. Annulez-la, ou annulez d’abord son colis.');
    }
    trashOrders_(ctx, [String(o.id)], why, user);
    return { id: String(o.id), counts: countsData_(ctx, null), message: 'Commande ' + o.id + ' mise à la corbeille.' };
  });
}

/** Met plusieurs commandes à la corbeille ; celles déjà envoyées à une société de livraison sont ignorées. */
function api_deleteOrders(ids, reason) {
  cloudGuard_();
  var user = requireAdminFor_('supprimer des commandes');
  var list = idList_(ids);
  if (!list.length) throw new Error('Cochez au moins une commande.');
  var why = String(reason == null ? '' : reason).trim();
  return withLock_(function () {
    var ctx = readOrders_();
    var r = trashOrders_(ctx, list, why, user);
    var msg = plural_(r.deleted.length, 'commande mise', 'commandes mises') + ' à la corbeille';
    if (r.skipped.length) msg += ' · ' + plural_(r.skipped.length, 'ignorée', 'ignorées') + ' (' + r.skipped.slice(0, 5).map(function (x) { return x.id + ' : ' + x.why; }).join(', ') + (r.skipped.length > 5 ? '…' : '') + ')';
    return { deleted: r.deleted, skipped: r.skipped, counts: countsData_(ctx, null), message: msg + '.' };
  });
}

/** Commandes à la corbeille (administrateur), les dernières supprimées d'abord. */
function api_listTrash() {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Seul un administrateur (onglet Équipe) peut voir la corbeille.');
  var sh = ss_().getSheetByName(TRASH.SHEET);
  if (!sh || sh.getLastRow() < 2) return { rows: [] };
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var map = headerMap_(values[0]);
  var extra = {};
  values[0].forEach(function (t, i) { extra[normalizeText_(t)] = i; });
  var cell = function (row, title) { var i = extra[normalizeText_(title)]; return i === undefined ? '' : row[i]; };
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var o = {};
    ORDER_COLUMNS.forEach(function (c) { o[c.key] = map[c.key] === undefined ? '' : values[r][map[c.key]]; });
    if (!String(o.id).trim()) continue;
    rows.push({
      id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya), product: String(o.product),
      total: toNumber_(o.total), status: String(o.status), date: iso_(o.date),
      deletedAt: iso_(cell(values[r], TRASH.EXTRA[0])), deletedBy: String(cell(values[r], TRASH.EXTRA[1])),
      reason: String(cell(values[r], TRASH.EXTRA[2]))
    });
  }
  rows.sort(function (a, b) { return String(b.deletedAt).localeCompare(String(a.deletedAt)); });
  return { rows: rows, autoDays: getSettings_().CORBEILLE_JOURS };
}

/** Remet une commande de la corbeille dans l'onglet Commandes (administrateur). */
function api_restoreOrder(id) {
  var r = api_restoreOrders([id]);
  if (r.skipped.length) throw new Error(r.skipped[0].why);
  return { id: r.restored[0], message: 'Commande ' + r.restored[0] + ' remise dans l’onglet Commandes.' };
}

/** Lignes de la corbeille : { sh, values, map, rowsById: { n° : [index de ligne…] } }. */
function readTrash_() {
  var sh = ss_().getSheetByName(TRASH.SHEET);
  if (!sh || sh.getLastRow() < 2) return null;
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var map = headerMap_(values[0]);
  var rowsById = {};
  for (var r = 1; r < values.length && map.id !== undefined; r++) {
    var id = String(values[r][map.id]).trim();
    if (id) (rowsById[id] = rowsById[id] || []).push(r);
  }
  return { sh: sh, values: values, map: map, rowsById: rowsById };
}

/** Remet plusieurs commandes de la corbeille dans l'onglet Commandes. */
function api_restoreOrders(ids) {
  cloudGuard_();
  var user = requireAdminFor_('restaurer une commande');
  var list = idList_(ids);
  if (!list.length) throw new Error('Cochez au moins une commande.');
  return withLock_(function () {
    var t = readTrash_();
    if (!t) throw new Error('La corbeille est vide.');
    var ctx = readOrders_();
    var out = { restored: [], skipped: [] };
    var toAdd = [];
    var toDelete = [];
    list.forEach(function (key) {
      var rows = t.rowsById[key];
      if (!rows) { out.skipped.push({ id: key, why: 'Commande ' + key + ' absente de la corbeille.' }); return; }
      if (findOrder_(ctx, key)) { out.skipped.push({ id: key, why: 'La commande ' + key + ' est déjà dans l’onglet Commandes.' }); return; }
      var found = rows[rows.length - 1];
      var o = {};
      ORDER_COLUMNS.forEach(function (c) { o[c.key] = t.map[c.key] === undefined ? '' : t.values[found][t.map[c.key]]; });
      toAdd.push(o);
      toDelete.push(found + 1);
      out.restored.push(key);
    });
    if (toAdd.length) appendOrders_(ctx, toAdd);
    deleteSheetRows_(t.sh, toDelete);
    out.restored.forEach(function (key) { log_(user, key, 'Restauration', 'Sortie de la corbeille'); });
    out.message = plural_(out.restored.length, 'commande remise', 'commandes remises') + ' dans l’onglet Commandes' +
      (out.skipped.length ? ' · ' + plural_(out.skipped.length, 'ignorée', 'ignorées') : '') + '.';
    return out;
  });
}

/** Note des n° effacés pour de bon (onglet caché « Numéros effacés »). */
function blockIds_(ids, user) {
  if (!ids.length) return;
  var ss = ss_();
  var sh = ss.getSheetByName(TRASH.BLOCKED);
  if (!sh) {
    sh = ss.insertSheet(TRASH.BLOCKED);
    ensureHeaders_(sh, TRASH.BLOCKED_TITLES);
    try { sh.hideSheet(); } catch (e) { /* sans importance */ }
  }
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + ids.length - 1);
  var now = new Date();
  sh.getRange(r, 1, ids.length, 3).setValues(ids.map(function (id) { return [id, now, user ? user.name : '']; }));
}

/**
 * Efface pour de bon des commandes de la corbeille (ids vide ou absent : toute la corbeille).
 * Leur n° est gardé : Releasit et Shopify ne les recréent pas.
 */
function purgeTrash_(ids, user, olderThanDays) {
  var t = readTrash_();
  if (!t) return { purged: [] };
  var wanted = ids && ids.length ? idList_(ids) : Object.keys(t.rowsById);
  var limit = olderThanDays ? Date.now() - olderThanDays * 86400000 : null;
  var dateCol = -1;
  t.values[0].forEach(function (title, i) { if (normalizeText_(title) === normalizeText_(TRASH.EXTRA[0])) dateCol = i; });
  var rows = [];
  var purged = [];
  wanted.forEach(function (id) {
    (t.rowsById[id] || []).forEach(function (r) {
      if (limit !== null) {
        var d = dateCol >= 0 ? toDate_(t.values[r][dateCol]) : null;
        if (!d || d.getTime() > limit) return;
      }
      rows.push(r + 1);
      if (purged.indexOf(id) < 0) purged.push(id);
    });
  });
  if (!rows.length) return { purged: [] };
  blockIds_(purged, user);
  deleteSheetRows_(t.sh, rows);
  log_(user, '', 'Corbeille vidée', plural_(purged.length, 'commande effacée', 'commandes effacées') + ' pour de bon : ' + purged.slice(0, 20).join(', ') + (purged.length > 20 ? '…' : ''));
  return { purged: purged };
}

/** « Vider la corbeille » (ids absent) ou « Supprimer définitivement » les commandes cochées. */
function api_purgeTrash(ids) {
  cloudGuard_();
  var user = requireAdminFor_('vider la corbeille');
  return withLock_(function () {
    var r = purgeTrash_(ids, user, 0);
    return { purged: r.purged, message: r.purged.length ? plural_(r.purged.length, 'commande effacée', 'commandes effacées') + ' pour de bon. Leur n° reste bloqué : elles ne reviendront pas.' : 'Rien à effacer.' };
  });
}

/** Entretien de nuit : efface les commandes à la corbeille depuis CORBEILLE_JOURS jours (0 = jamais). */
function purgeOldTrash_() {
  var days = getSettings_().CORBEILLE_JOURS;
  if (!days) return 0;
  return withLock_(function () { return purgeTrash_(null, { name: 'Automatique' }, days).purged.length; });
}

function menuTrashRestore() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.prompt('Corbeille', 'N° de la commande à remettre dans l’onglet Commandes (par exemple #1038) :', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  try {
    ui.alert('Corbeille', api_restoreOrder(answer.getResponseText()).message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Corbeille : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}
