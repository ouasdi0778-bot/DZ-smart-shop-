/**
 * Tracking.gs : page « Suivi » des colis Ecotrack.
 *
 *  - colis en cours (statut en direct, relu toutes les 30 minutes) ;
 *  - alertes « à traiter » : colis suspendu, retour en cours, retour bloqué,
 *    sans mouvement (délai selon l'étape et le Sud), créé mais pas validé,
 *    argent en retard, introuvable, statut inconnu ; le résultat de l'appel au
 *    client et les remarques du livreur sont dans FollowUp.gs ;
 *  - argent : chez le livreur, livré pas encaissé, encaissé pas payé, prêt à
 *    verser, payé, et versements ;
 *  - chronologie d'un colis (get/tracking/info).
 *
 * Les statuts viennent d'Ecotrack.gs (ECO_STATUSES_), qui les relit.
 */

/* ------------------------------------------------------------------ */
/* Alertes « à traiter »                                              */
/* ------------------------------------------------------------------ */

var ALERT_LEVEL_RANK_ = { urgent: 0, warn: 1, info: 2 };

/** « 5 h », « 2 j » : durée lisible. */
function durationText_(ms) {
  var hours = Math.floor(Math.max(ms, 0) / 3600000);
  if (hours < 1) return 'moins d’1 h';
  if (hours < 48) return hours + ' h';
  return Math.floor(hours / 24) + ' j';
}

/** Étapes « ramassage et centre de tri » (délai SUIVI_HEURES_TRI). */
var STAGE_SORTING_ = ['en_ramassage', 'en_preparation_stock', 'vers_hub', 'en_hub'];

/** Délai « sans mouvement » d'un colis selon son étape, et le Sud : { hours, where }. */
function staleLimit_(o, settings) {
  var key = normalizeText_(o.carrierStatus).replace(/ /g, '_');
  if (STAGE_SORTING_.indexOf(key) >= 0) return { hours: settings.SUIVI_HEURES_TRI, where: 'ramassage ou centre de tri' };
  if (key === 'en_livraison') return { hours: settings.SUIVI_HEURES_LIVRAISON, where: 'en livraison' };
  var code = wilayaCode_(o.wilaya);
  var south = !!(code && settings.southCodes && settings.southCodes[code]);
  return { hours: south ? settings.SUIVI_HEURES_SUD : settings.SUIVI_HEURES_ROUTE, where: south ? 'en route vers le Sud' : 'en route vers la wilaya' };
}

/**
 * Colis Ecotrack qui demandent une action. Une alerte traitée (résultat de
 * l'appel, ou « Marquer comme traité ») disparaît : jusqu'au prochain
 * changement du colis pour une alerte liée à un événement, ou pendant le délai
 * de l'alerte pour une alerte liée au temps. « Relance suivi le » la fait
 * revenir à une heure précise (rappel, livraison reportée).
 */
function trackingAlerts_(orders, settings, now) {
  var DAY = 86400000;
  var draftLimit = settings.SUIVI_ALERTE_HEURES * 3600000;
  var alerts = [];
  orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : (o.status === STATUS.CONFIRMED ? 'draft' : 'transit');
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    var touched = toDate_(o.followUp);
    var next = toDate_(o.followNext);
    var due = !!next && now.getTime() >= next.getTime();
    var handled = !!touched && touched.getTime() >= moved.getTime() && !due;
    var base = touched && touched.getTime() > moved.getTime() ? touched : moved;
    var age = function (from) { return now.getTime() - from.getTime(); };
    var label = info ? info.label : '';
    var calls = Math.round(toNumber_(o.followCalls)) || 0;
    var note = String(o.courierNote == null ? '' : o.courierNote).trim();
    var tag = note ? remarkTag_(note, settings) : '';
    var inDelivery = o.status === STATUS.IN_DELIVERY;
    // Alertes où l'on appelle le client : boutons « résultat de l'appel ».
    var client = { callable: true, canReturn: inDelivery, proposeReturn: inDelivery && calls >= FOLLOW.MAX_CALLS };
    var make = function (kind, level, title, detail, since, extra) {
      var a = {
        id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya),
        tracking: String(o.tracking), carrierStatus: String(o.carrierStatus), carrierLabel: label, status: o.status,
        kind: kind, level: level, title: title, detail: detail, since: since.toISOString(),
        courierNote: note, tag: tag, tagLabel: remarkTagLabel_(tag), calls: calls,
        next: next ? next.toISOString() : '', callable: false, canReturn: false, proposeReturn: false
      };
      Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
      return a;
    };
    var inTransit = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;

    if (group === 'suspended') {
      if (!handled) {
        alerts.push(make('suspended', 'urgent', 'Colis suspendu',
          'Le livreur n’a pas pu terminer la livraison : appelez le client.', moved, client));
      }
    } else if (group === 'returning') {
      var stuck = settings.RETOUR_BLOQUE_JOURS * DAY;
      if (age(moved) >= stuck) {
        if (age(base) >= stuck) {
          alerts.push(make('return_stuck', 'urgent', 'Retour bloqué',
            'Retour en route depuis ' + durationText_(age(moved)) + ' sans arriver chez vous : réclamez-le à Ecotrack.', moved));
        }
      } else if (!handled) {
        alerts.push(make('returning', 'urgent', 'Retour en cours',
          'Le colis (' + label.toLowerCase() + ') revient : rappelez le client pour tenter de sauver la commande.', moved, { callable: true }));
      }
    } else if (group === 'draft' && o.status === STATUS.CONFIRMED && age(base) >= draftLimit) {
      alerts.push(make('draft', 'warn', 'À valider chez Ecotrack',
        'Colis créé depuis ' + durationText_(age(base)) + ' et pas encore validé : validez-le (page Expédier), sinon il ne partira pas.', base));
    } else if ((group === 'transit' || group === 'delivery') && inTransit) {
      var lim = staleLimit_(o, settings);
      var limitMs = lim.hours * 3600000;
      var show = next ? (due && age(moved) >= limitMs) : age(base) >= limitMs;
      if (show) {
        alerts.push(make('stale', 'warn', 'Sans mouvement',
          'Aucun changement depuis ' + durationText_(age(moved)) + ' (' + (label || lim.where).toLowerCase() + ' ; alerte après ' + lim.hours + ' h).', base,
          group === 'delivery' ? client : {}));
      }
    } else if (o.status === STATUS.DELIVERED && (group === 'delivered' || group === 'cashed' || group === 'ready')) {
      var deliveredAt = toDate_(o.deliveredAt) || moved;
      var late = settings.ARGENT_RETARD_JOURS * DAY;
      var since = touched && touched.getTime() > deliveredAt.getTime() ? touched : deliveredAt;
      if (age(deliveredAt) >= late && age(since) >= late) {
        alerts.push(make('money_late', 'warn', 'Argent en retard',
          'Livré depuis ' + durationText_(age(deliveredAt)) + ' (' + label.toLowerCase() + ') et toujours pas payé : vérifiez avec Ecotrack.', deliveredAt));
      }
    } else if (group === 'missing' && !handled) {
      alerts.push(make('missing', 'warn', 'Introuvable chez Ecotrack',
        'Le suivi ' + o.tracking + ' n’apparaît pas chez Ecotrack : vérifiez dans Ecotrack.', moved));
    } else if (group === 'unknown' && !handled) {
      alerts.push(make('unknown', 'info', 'Statut inconnu',
        'Ecotrack a envoyé « ' + o.carrierStatus + ' » : l’outil ne le connaît pas. Mettez la commande à jour à la main si besoin.', moved));
    }
  });
  alerts.sort(function (a, b) {
    var r = ALERT_LEVEL_RANK_[a.level] - ALERT_LEVEL_RANK_[b.level];
    return r || String(a.since).localeCompare(String(b.since));
  });
  return alerts;
}

/* ------------------------------------------------------------------ */
/* Argent                                                             */
/* ------------------------------------------------------------------ */

/**
 * Où est l'argent des colis Ecotrack (montants à encaisser, avant déduction
 * des frais d'Ecotrack) :
 *   enRoute   : colis pas encore livrés
 *   delivered : livrés, pas encore encaissés par le livreur
 *   cashed    : encaissés, pas encore payés par Ecotrack
 *   ready     : paiement prêt à être versé
 *   paid      : payés (sur les `days` derniers jours)
 */
function trackingMoney_(orders, now, days) {
  var since = new Date(now.getTime() - days * 86400000);
  var bucket = function () { return { count: 0, amount: 0 }; };
  var money = { enRoute: bucket(), delivered: bucket(), cashed: bucket(), ready: bucket(), paid: bucket() };
  var payments = {};
  var add = function (b, amount) { b.count++; b.amount += amount; };
  orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : '';
    var amount = toNumber_(o.total);
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    var shipped = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;
    if (group === 'transit' || group === 'delivery' || group === 'suspended' || (!group && shipped)) {
      if (shipped) add(money.enRoute, amount);
    } else if (group === 'delivered') add(money.delivered, amount);
    else if (group === 'cashed') add(money.cashed, amount);
    else if (group === 'ready') add(money.ready, amount);
    else if (group === 'paid' && moved.getTime() >= since.getTime()) add(money.paid, amount);

    var pid = String(o.paymentId).trim();
    if (pid && moved.getTime() >= since.getTime()) {
      var p = payments[pid] = payments[pid] || { id: pid, count: 0, amount: 0, paid: true, last: moved };
      p.count++;
      p.amount += amount;
      if (group !== 'paid') p.paid = false;
      if (moved.getTime() > p.last.getTime()) p.last = moved;
    }
  });
  var list = Object.keys(payments).map(function (k) {
    var p = payments[k];
    return { id: p.id, count: p.count, amount: p.amount, paid: p.paid, last: p.last.toISOString() };
  }).sort(function (a, b) { return String(b.last).localeCompare(String(a.last)); }).slice(0, 20);
  return { money: money, payments: list };
}

/* ------------------------------------------------------------------ */
/* Chronologie d'un colis                                             */
/* ------------------------------------------------------------------ */

/** Étapes renvoyées par get/tracking/info (liste de la documentation). */
var ECO_ACTIVITIES_ = {
  order_information_received_by_carrier: 'Commande enregistrée et validée par le vendeur',
  picked: 'Colis récupéré par le transporteur',
  accepted_by_carrier: 'Colis réceptionné par le centre de tri',
  dispatched_to_driver: 'Colis confié au livreur',
  attempt_delivery: 'Tentative de livraison',
  return_asked: 'Retour initié par le centre de tri',
  return_in_transit: 'Retour en transit',
  return_received: 'Retour réceptionné par le vendeur',
  livred: 'Colis livré',
  encaissed: 'Commande encaissée',
  payed: 'Paiement effectué'
};

function activityLabel_(code) {
  var key = normalizeText_(code).replace(/ /g, '_');
  return Object.prototype.hasOwnProperty.call(ECO_ACTIVITIES_, key) ? ECO_ACTIVITIES_[key] : String(code);
}

function firstOf_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

/**
 * Étapes d'un colis, de la plus ancienne à la plus récente. La documentation
 * ne montre pas la forme exacte de la réponse : on cherche une liste et, dans
 * chaque élément, le nom de l'étape, la date et une remarque.
 */
function parseTrackingInfo_(json) {
  var list = listOf_(json, ['activities', 'data', 'history', 'tracking', 'events', 'trackings']);
  if (!list.length && json && typeof json === 'object' && !Array.isArray(json)) {
    Object.keys(json).some(function (k) {
      if (Array.isArray(json[k]) && json[k].length) { list = json[k]; return true; }
      return false;
    });
  }
  var events = [];
  list.forEach(function (e, i) {
    if (e === null || e === undefined) return;
    if (typeof e === 'string') {
      events.push({ code: e, label: activityLabel_(e), date: '', dateText: '', note: '', order: i });
      return;
    }
    if (typeof e !== 'object') return;
    var code = String(firstOf_(e, ['activity', 'status', 'statut', 'event', 'type', 'name', 'label']));
    var note = String(firstOf_(e, ['content', 'remarque', 'message', 'comment', 'note', 'description', 'details']));
    var rawDate = firstOf_(e, ['date', 'created_at', 'datetime', 'at', 'time', 'updated_at']);
    if (!code && !note) return;
    var d = toDate_(rawDate);
    events.push({
      code: code,
      label: code ? activityLabel_(code) : note,
      date: d ? d.toISOString() : '',
      dateText: d || isBlank_(rawDate) ? '' : String(rawDate),
      note: code ? note : '',
      order: i
    });
  });
  var allDated = events.length > 0 && events.every(function (e) { return e.date; });
  if (allDated) {
    events.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || a.order - b.order; });
  }
  return events.map(function (e) {
    return { code: e.code, label: e.label, date: e.date, dateText: e.dateText, note: e.note };
  });
}

/** Chronologie d'un colis. Si la réponse n'est pas reconnue, elle est renvoyée telle quelle. */
function api_parcelHistory(id) {
  var o = findOrder_(readOrders_(), id);
  if (!o) throw new Error('Commande introuvable.');
  var tracking = String(o.tracking).trim();
  if (!tracking) throw new Error('Cette commande n’a pas de n° de suivi.');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);
  var json = ecotrackGet_('/api/v1/get/tracking/info', { tracking: tracking });
  var events = parseTrackingInfo_(json);
  var settings = getSettings_();
  var remarks = courierRemarks_([tracking])[tracking];
  var noteText = remarks.ok && remarks.last ? courierNoteText_(remarks.last) : '';
  if (noteText && noteText !== String(o.courierNote || '')) {
    withLock_(function () {
      var ctx = readOrders_();
      var cur = findOrder_(ctx, id);
      if (!cur || String(cur.tracking).trim() !== tracking) return;
      ensureOrderColumn_(ctx, 'courierNote');
      writeFields_(ctx, cur, { courierNote: noteText });
    });
  }
  return {
    id: String(o.id), client: String(o.client), tracking: tracking,
    carrierLabel: ecotrackLabel_(o.carrierStatus),
    events: events,
    raw: events.length ? '' : JSON.stringify(json).slice(0, 2000),
    remarksOk: remarks.ok,
    remarksError: remarks.ok ? '' : remarks.message,
    remarks: remarks.notes.map(function (n) {
      var tag = n.mine ? '' : remarkTag_(n.text, settings);
      return { text: n.text, date: n.date, dateText: n.dateText, author: n.author, mine: n.mine, tag: tag, tagLabel: remarkTagLabel_(tag) };
    })
  };
}

/* ------------------------------------------------------------------ */
/* Page Suivi                                                         */
/* ------------------------------------------------------------------ */

/**
 * Données de la page Suivi. days = période de l'argent « payé » et des
 * versements : 7, 30 ou 90 jours.
 */
function api_trackingOverview(days) {
  days = [7, 30, 90].indexOf(Number(days)) >= 0 ? Number(days) : 30;
  var cfg = ecotrackConfig_();
  var settings = getSettings_();
  var ctx = readOrders_();
  var now = new Date();
  var props = PropertiesService.getScriptProperties();
  var limit = settings.SUIVI_ALERTE_HEURES * 3600000;
  var alerts = trackingAlerts_(ctx.orders, settings, now);

  var staleIds = {};
  alerts.forEach(function (a) { if (a.kind === 'stale' || a.kind === 'draft') staleIds[a.id] = true; });
  var parcels = [];
  ctx.orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : (o.status === STATUS.CONFIRMED ? 'draft' : 'transit');
    // Colis créés mais pas encore validés : ils sont dans la page Expédier (onglet « à valider »).
    var active = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY ||
      (o.status === STATUS.RETURNED && group === 'returning');
    if (!active) return;
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    parcels.push({
      id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya),
      tracking: String(o.tracking), carrierStatus: String(o.carrierStatus),
      carrierLabel: info ? info.label : (o.status === STATUS.CONFIRMED ? 'Créé, à valider chez Ecotrack' : ''),
      group: group, status: o.status, total: toNumber_(o.total),
      since: moved.toISOString(), ageHours: Math.floor((now.getTime() - moved.getTime()) / 3600000),
      stale: !!staleIds[String(o.id)],
      courierNote: String(o.courierNote == null ? '' : o.courierNote),
      tagLabel: remarkTagLabel_(remarkTag_(o.courierNote, settings))
    });
  });
  parcels.sort(function (a, b) { return String(a.since).localeCompare(String(b.since)); });

  // Terminées : livrées et retours reçus de la période (toutes sociétés), les plus récentes d'abord.
  var since = new Date(now.getTime() - days * 86400000);
  var finished = [];
  ctx.orders.forEach(function (o) {
    if (pageOf_(o) !== 'terminees') return;
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date);
    if (!moved || moved < since) return;
    var info = hasEcotrackParcel_(o) ? ecotrackStatusInfo_(o.carrierStatus) : null;
    var group = info ? info.group : '';
    finished.push({
      id: String(o.id), client: String(o.client), wilaya: String(o.wilaya), status: o.status, total: toNumber_(o.total),
      carrier: String(o.carrier || ''), tracking: String(o.tracking || ''), paymentId: String(o.paymentId || ''),
      label: info ? info.label : o.status,
      unpaid: o.status === STATUS.DELIVERED && (group === 'delivered' || group === 'cashed' || group === 'ready'),
      canDamage: o.status === STATUS.RETURNED && String(o.stockMove || '').trim() === STOCK_BACK_,
      damaged: String(o.stockMove || '').trim() === STOCK_DAMAGED_,
      since: moved.toISOString()
    });
  });
  finished.sort(function (a, b) { return String(b.since).localeCompare(String(a.since)); });

  var m = trackingMoney_(ctx.orders, now, days);
  return {
    finished: finished.slice(0, 300),
    finishedTotal: finished.length,
    configured: cfg.configured,
    lastSync: String(props.getProperty(ECO.PROP_LAST_SYNC) || ''),
    lastError: String(props.getProperty(ECO.PROP_LAST_ERROR) || ''),
    alertHours: settings.SUIVI_ALERTE_HEURES,
    days: days,
    alerts: alerts,
    parcels: parcels,
    money: m.money,
    payments: m.payments,
    limitMs: limit
  };
}

/** « J'ai traité cette alerte » : elle disparaît jusqu'au prochain changement du colis. */
function api_markFollowUp(id) {
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (ctx.map.followUp === undefined) {
      throw new Error('Colonne « Suivi traité le » absente du classeur. Lancez « DZ Smart Shop › Installer / réparer le classeur ».');
    }
    var f = { followUp: new Date() };
    if (ctx.map.followNext !== undefined) f.followNext = '';
    writeFields_(ctx, o, f);
    log_(currentUser_(), o.id, 'Suivi traité', 'Alerte traitée pour le colis ' + o.tracking);
    return { id: String(o.id) };
  });
}

/** Pastilles du menu : appels à faire et alertes de suivi (urgentes ou à surveiller). */
function api_counts() {
  return countsData_(readOrders_(), getSettings_());
}

/** Compteurs du menu : commandes à appeler maintenant, alertes de la page Suivi. */
function countsData_(ctx, settings) {
  var now = new Date();
  var due = 0;
  ctx.orders.forEach(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0) return;
    var cb = toDate_(o.callback);
    if (!cb || cb <= now) due++;
  });
  var alerts = trackingAlerts_(ctx.orders, settings || getSettings_(), now).filter(function (a) { return a.level !== 'info'; });
  var toShip = ctx.orders.filter(function (o) { return o.status === STATUS.CONFIRMED && isBlank_(o.tracking); }).length;
  return { queue: due, pending: pendingCount_(ctx), alerts: alerts.length, toShip: toShip };
}

/** Commandes ni confirmées ni annulées : à confirmer, pas de réponse, rappeler, injoignable. */
function pendingCount_(ctx) {
  return ctx.orders.filter(function (o) { return !o.status || TODO_STATUSES_.indexOf(o.status) >= 0; }).length;
}
