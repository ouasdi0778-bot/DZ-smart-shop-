/**
 * Stats.gs : page Statistiques (administrateur) : commandes et argent.
 *
 * Pour rester rapide même sur un an : chaque nuit, l'outil calcule un résumé
 * par jour (date de commande) dans l'onglet caché « Stats » : une ligne par
 * jour, le résumé en JSON. La page lit seulement les lignes de la période ;
 * la journée en cours (et celle du dernier calcul) est calculée en direct.
 * Bouton « Recalculer » pour tout refaire tout de suite.
 *
 * Prime des confirmatrices : montant en dinars par commande livrée, avec sa
 * date de début (réglage PRIMES, ex. « 2026-11-01=50; 2027-01-01=60 ») ;
 * chaque commande prend le montant valable à sa date de commande.
 */

var STATS = {
  SHEET: 'Stats',
  TITLES: ['Jour', 'Résumé'],
  PROP_BUILT: 'STATS_BUILT',
  // Colonnes des groupes : [commandes, confirmées, livrées, retours, annulées, encaissé, bénéfice, heures de livraison, livrées datées]
  N: 0, C: 1, D: 2, R: 3, X: 4, REV: 5, PROFIT: 6, DH: 7, DN: 8, SIZE: 9,
  // Version des résumés : une nouvelle version les fait tous recalculer (nouveaux chiffres).
  VERSION: 2, PROP_VERSION: 'STATS_VERSION',
  // Délais avant confirmation (heures) : moins d'1 h, 1 à 6 h, 6 à 24 h, plus de 24 h.
  SPEED: [1, 6, 24]
};

/** Qualité d'une source : [commandes, faux numéros, doublons, liste noire, refus au livreur, terminées]. */
var QUALITY_SIZE_ = 6;

/* ------------------------------------------------------------------ */
/* Résumé d'un jour                                                   */
/* ------------------------------------------------------------------ */

/**
 * Résumé vide d'un jour. Depuis la version 2 : appels par heure (ch) et réponses (ah), vitesse (sp :
 * [livrées, terminées] par délai avant confirmation), délai de confirmation (cfh, cfn), bureau ou
 * domicile par wilaya (wm), qualité des sources (qa), appels (ag) et annulations (ax) par confirmatrice.
 */
function emptyDay_() {
  return { v: STATS.VERSION, n: 0, c: 0, s: 0, d: 0, r: 0, x: 0, q: 0, t: 0, rev: 0, sales: 0, fee: 0, dnet: 0, cost: 0, retf: 0, pack: 0, profit: 0,
    dh: 0, dn: 0, w: {}, p: {}, a: {}, src: {}, cp: {}, cr: {}, tag: {}, h: [],
    ch: [], ah: [], sp: [0, 0, 0, 0, 0, 0, 0, 0], cfh: 0, cfn: 0, wm: {}, qa: {}, ag: {}, ax: {} };
}

/** Un appel de l'historique : la cliente a-t-elle répondu ? (« Pas de réponse », faux numéro, injoignable : non) */
function callAnswered_(text) {
  var t = String(text || '');
  if (/^Confirm|^A répondu/i.test(t)) return true;
  if (/^Annul/i.test(t)) return !/faux|injoign|ne r[ée]pond|pas de r[ée]ponse|ferm[ée]|messagerie/i.test(t);
  return false;
}

/** Délai avant confirmation → n° de la tranche (0 : moins d'1 h … 3 : plus de 24 h). */
function speedBucket_(hours) {
  for (var i = 0; i < STATS.SPEED.length; i++) if (hours < STATS.SPEED[i]) return i;
  return STATS.SPEED.length;
}

function groupRow_(map, key) {
  if (!map[key]) { map[key] = []; for (var i = 0; i < STATS.SIZE; i++) map[key].push(0); }
  return map[key];
}

/** Ajoute une commande à un groupe (share = part de la commande, pour un article parmi plusieurs). */
function addToRow_(row, o, p, share, hours) {
  row[STATS.N] += share;
  if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) row[STATS.C] += share;
  if (o.status === STATUS.DELIVERED) row[STATS.D] += share;
  if (o.status === STATUS.RETURNED) row[STATS.R] += share;
  if (o.status === STATUS.CANCELLED) row[STATS.X] += share;
  if (p.profit !== null) {
    row[STATS.REV] += p.revenue * share;
    row[STATS.PROFIT] += p.profit * share;
  }
  if (hours !== null) { row[STATS.DH] += hours * share; row[STATS.DN] += share; }
}

function hoursBetween_(a, b) {
  var da = toDate_(a);
  var db = toDate_(b);
  if (!da || !db || db < da) return null;
  return (db.getTime() - da.getTime()) / 3600000;
}

/** Ajoute une commande au résumé de son jour. */
function addOrderToDay_(day, o, env, catalog) {
  var p = orderProfit_(o, env, catalog);
  var settings = env.settings;
  day.n++;
  if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) day.c++;
  if (SHIPPED_STATUSES.indexOf(o.status) >= 0) day.s++;
  if (o.status === STATUS.DELIVERED) day.d++;
  if (o.status === STATUS.RETURNED) day.r++;
  if (o.status === STATUS.CANCELLED) day.x++;
  if (TODO_STATUSES_.indexOf(o.status) >= 0) day.q++;
  if (o.status === STATUS.CONFIRMED || o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) day.t++;
  if (p.profit !== null) {
    day.rev += p.revenue; day.sales += p.sales; day.fee += p.fee; day.dnet += p.deliveryNet; day.cost += p.cost;
    day.retf += p.returnFee; day.pack += p.packaging; day.profit += p.profit;
  }
  var dh = o.status === STATUS.DELIVERED ? hoursBetween_(o.date, o.deliveredAt) : null;
  if (dh !== null) { day.dh += dh; day.dn++; }

  var wilaya = String(o.wilaya || '').trim() || '(sans wilaya)';
  addToRow_(groupRow_(day.w, wilaya), o, p, 1, dh);
  var agent = String(o.agent || '').trim() || '(sans confirmatrice)';
  var aRow = groupRow_(day.a, agent);
  addToRow_(aRow, o, p, 1, null);
  var ch = hoursBetween_(o.date, o.confirmedAt);
  if (ch !== null) { aRow[STATS.DH] += ch; aRow[STATS.DN]++; } // pour l'équipe : délai avant confirmation
  var platform = adPlatform_(o.adSource) || (String(o.adSource || '').trim() || 'Sans publicité suivie');
  addToRow_(groupRow_(day.src, platform), o, p, 1, null);
  var campaign = String(o.campaign || '').replace(/\s+/g, ' ').trim() || '(sans campagne)';
  addToRow_(groupRow_(day.cp, campaign), o, p, 1, null);

  var items = catalogItems_(catalog, o);
  var totalQty = items.reduce(function (a, it) { return a + it.qty; }, 0) || 1;
  items.forEach(function (it) {
    var row = matchCatalog_(catalog, it.label);
    var name = row ? row.product + (row.model ? ' — ' + row.model : '') : it.label;
    addToRow_(groupRow_(day.p, name), o, p, it.qty / totalQty, null);
  });

  // Bureau ou domicile, par wilaya.
  var mode = String(o.mode || '') === 'Stop desk' ? 'Stop desk' : 'Domicile';
  addToRow_(groupRow_(day.wm, wilaya + '\t' + mode), o, p, 1, null);
  var finished = o.status === STATUS.DELIVERED || o.status === STATUS.RETURNED;
  // Vitesse : livrées selon le délai avant confirmation.
  if (ch !== null) {
    day.cfh += ch;
    day.cfn++;
    if (finished) {
      var b = speedBucket_(ch);
      day.sp[b * 2 + 1]++;
      if (o.status === STATUS.DELIVERED) day.sp[b * 2]++;
    }
  }
  // Appels (historique) : heure, réponse, confirmatrice.
  parseCallLog_(o.callLog).forEach(function (c) {
    var m = String(c.when).match(/ (\d{1,2}):\d{2}$/);
    if (!m) return;
    var hour = Math.min(+m[1], 23);
    var text = String(c.text).replace(/ · [^·]*$/, '');
    var who = (String(c.text).match(/ · ([^·]+)$/) || [])[1];
    who = who ? who.trim() : '(inconnue)';
    var ans = callAnswered_(text);
    while (day.ch.length < 24) { day.ch.push(0); day.ah.push(0); }
    day.ch[hour]++;
    if (ans) day.ah[hour]++;
    var g = day.ag[who] || (day.ag[who] = [0, 0]);
    g[0]++;
    if (ans) g[1]++;
  });
  // Motifs d'annulation par confirmatrice.
  if (o.status === STATUS.CANCELLED) {
    var why = String(o.cancelReason || '').trim() || '(sans motif)';
    var ax = day.ax[agent] || (day.ax[agent] = {});
    ax[why] = (ax[why] || 0) + 1;
  }
  // Qualité des sources : faux numéros, doublons, liste noire, refus au livreur.
  var alertText = String(o.alert || '');
  var fake = /^Numéro invalide/.test(alertText) || /faux num/i.test(String(o.cancelReason || ''));
  var dup = /^Doublon/.test(alertText);
  var black = /^Liste noire/.test(alertText);
  var refus = o.status === STATUS.RETURNED && remarkTag_(o.courierNote, settings) === 'refus';
  ['src\t' + platform, 'cp\t' + campaign].forEach(function (k) {
    var q = day.qa[k];
    if (!q) { q = day.qa[k] = []; for (var i = 0; i < QUALITY_SIZE_; i++) q.push(0); }
    q[0]++;
    if (fake) q[1]++;
    if (dup) q[2]++;
    if (black) q[3]++;
    if (refus) q[4]++;
    if (finished) q[5]++;
  });
  if (o.status === STATUS.CANCELLED) {
    var reason = String(o.cancelReason || '').trim() || '(sans motif)';
    day.cr[reason] = (day.cr[reason] || 0) + 1;
  }
  if (o.courierNote && (o.status === STATUS.RETURNED || o.status === STATUS.IN_DELIVERY)) {
    var tag = remarkTag_(o.courierNote, settings) || 'autre';
    day.tag[tag] = (day.tag[tag] || 0) + 1;
  }
  var d = toDate_(o.date);
  if (d) {
    var hour = +Utilities.formatDate(d, 'Africa/Algiers', 'H');
    while (day.h.length < 24) day.h.push(0);
    day.h[hour]++;
  }
}

/**
 * Résumés d'une liste de commandes, par jour de commande, pour Statistiques (st) et Bénéfices (pr) :
 * la version Cloudflare les garde dans sa base et ne recalcule que les jours qui ont changé.
 */
function daySummaries_(orders, env, catalog) {
  var byDay = {};
  orders.forEach(function (o) {
    var d = toDate_(o.date);
    if (d) (byDay[ymd_(d)] = byDay[ymd_(d)] || []).push(o);
  });
  var st = summarizeDays_(orders, env, catalog, '');
  var out = {};
  Object.keys(byDay).forEach(function (k) { out[k] = { st: st[k], pr: profitAccumulate_(byDay[k], env, catalog, null, true) }; });
  return out;
}

/** Arrondit les montants d'un résumé (JSON plus court). */
function roundDay_(day) {
  ['rev', 'sales', 'fee', 'dnet', 'cost', 'retf', 'pack', 'profit', 'dh'].forEach(function (k) { day[k] = Math.round(day[k] || 0); });
  day.cfh = Math.round((day.cfh || 0) * 10) / 10;
  ['w', 'p', 'a', 'src', 'cp', 'wm'].forEach(function (g) {
    Object.keys(day[g]).forEach(function (k) {
      day[g][k] = day[g][k].map(function (v, i) { return i === STATS.N || i === STATS.C || i === STATS.D || i === STATS.R || i === STATS.X || i === STATS.DN ? Math.round(v * 100) / 100 : Math.round(v); });
    });
  });
  return day;
}

/** Résumés par jour d'une liste de commandes : { 'aaaa-mm-jj': résumé }. */
function summarizeDays_(orders, env, catalog, sinceDay) {
  var days = {};
  orders.forEach(function (o) {
    var d = toDate_(o.date);
    if (!d) return;
    var key = ymd_(d);
    if (sinceDay && key < sinceDay) return;
    addOrderToDay_(days[key] || (days[key] = emptyDay_()), o, env, catalog);
  });
  Object.keys(days).forEach(function (k) { roundDay_(days[k]); });
  return days;
}

/* ------------------------------------------------------------------ */
/* Onglet caché « Stats »                                             */
/* ------------------------------------------------------------------ */

function statsSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(STATS.SHEET);
  if (!sh) {
    sh = ss.insertSheet(STATS.SHEET);
    sh.getRange(1, 1, 1, 2).setValues([STATS.TITLES]);
    sh.setFrozenRows(1);
    try { sh.hideSheet(); } catch (e) { /* sans importance */ }
  }
  return sh;
}

/** Recalcule tous les résumés (commandes + archive). Chaque nuit, et sur demande. */
function rebuildStats_() {
  var ctx = readOrders_();
  var env = makeEnv_(ctx);
  var catalog = readCatalog_();
  var days = summarizeDays_(ctx.orders.concat(readArchivedOrders_()), env, catalog, '');
  var keys = Object.keys(days).sort();
  var sh = statsSheet_();
  withLock_(function () {
    var last = sh.getLastRow();
    if (keys.length) {
      ensureRows_(sh, keys.length + 1);
      sh.getRange(2, 1, keys.length, 1).setNumberFormat('@');
      sh.getRange(2, 1, keys.length, 2).setValues(keys.map(function (k) { return [k, JSON.stringify(days[k])]; }));
    }
    // Anciennes lignes en trop (jours qui n'existent plus) : supprimées.
    if (last > keys.length + 1) sh.deleteRows(keys.length + 2, last - keys.length - 1);
  });
  PropertiesService.getScriptProperties().setProperty(STATS.PROP_BUILT, new Date().toISOString());
  return { days: keys.length };
}

/** Résumés enregistrés entre deux jours (lecture des seules lignes utiles). */
function readStoredDays_(fromDay, toDay) {
  var sh = ss_().getSheetByName(STATS.SHEET);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var keys = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).slice(0, 10); });
  var first = -1;
  var last = -1;
  keys.forEach(function (k, i) {
    if (k >= fromDay && k <= toDay) { if (first < 0) first = i; last = i; }
  });
  if (first < 0) return out;
  sh.getRange(first + 2, 1, last - first + 1, 2).getValues().forEach(function (r) {
    var k = String(r[0]).slice(0, 10);
    try { out[k] = JSON.parse(r[1]); } catch (e) { /* ligne abîmée : ignorée */ }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Prime des confirmatrices                                           */
/* ------------------------------------------------------------------ */

/** « 2026-11-01=50; 2027-01-01=60 » → [{ from, amount }] triés. */
function parsePrimes_(text) {
  return String(text || '').split(/[;\n]/).map(function (part) {
    var m = part.match(/(\d{4}-\d{2}-\d{2})\s*[=:]\s*(\d+(?:[.,]\d+)?)/);
    return m ? { from: m[1], amount: toNumber_(m[2]) } : null;
  }).filter(function (x) { return x; }).sort(function (a, b) { return a.from.localeCompare(b.from); });
}

function primeAt_(primes, day) {
  var amount = 0;
  primes.forEach(function (p) { if (p.from <= day) amount = p.amount; });
  return amount;
}

/** Nouveau montant de la prime à partir d'un jour (les jours d'avant gardent l'ancien). */
function api_setPrime(amount, fromDay) {
  cloudGuardAll_();
  requireAdmin_();
  var a = Math.round(toNumber_(amount));
  if (!(a >= 0)) throw new Error('Montant invalide.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDay || ''))) throw new Error('Date de début invalide.');
  var list = parsePrimes_(getSettings_().PRIMES).filter(function (p) { return p.from !== fromDay; });
  list.push({ from: fromDay, amount: a });
  list.sort(function (x, y) { return x.from.localeCompare(y.from); });
  var text = list.map(function (p) { return p.from + '=' + p.amount; }).join('; ');
  writeSettings_({ PRIMES: text }, currentUser_());
  return { primes: list, message: 'Prime : ' + a + ' DA par commande livrée à partir du ' + fromDay.split('-').reverse().join('/') + '.' };
}

/* ------------------------------------------------------------------ */
/* Page Statistiques                                                  */
/* ------------------------------------------------------------------ */

function addDayDays_(day, n) {
  var d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayCount_(from, to) {
  return Math.round((new Date(to + 'T12:00:00Z').getTime() - new Date(from + 'T12:00:00Z').getTime()) / 86400000) + 1;
}

/** Additionne des résumés de jours. */
function mergeDays_(days, keys, primes) {
  var t = emptyDay_();
  var groups = { w: {}, p: {}, a: {}, src: {}, cp: {}, wm: {} };
  var prime = {};
  var addArr = function (to, from) { (from || []).forEach(function (v, i) { while (to.length <= i) to.push(0); to[i] += v || 0; }); };
  keys.forEach(function (k) {
    var d = days[k];
    if (!d) return;
    ['n', 'c', 's', 'd', 'r', 'x', 'q', 't', 'rev', 'sales', 'fee', 'dnet', 'cost', 'retf', 'pack', 'profit', 'dh', 'dn', 'cfh', 'cfn'].forEach(function (f) { t[f] += d[f] || 0; });
    addArr(t.ch, d.ch);
    addArr(t.ah, d.ah);
    addArr(t.sp, d.sp);
    Object.keys(d.qa || {}).forEach(function (q) { addArr(t.qa[q] || (t.qa[q] = []), d.qa[q]); });
    Object.keys(d.ag || {}).forEach(function (a) { addArr(t.ag[a] || (t.ag[a] = []), d.ag[a]); });
    Object.keys(d.ax || {}).forEach(function (a) {
      var to = t.ax[a] || (t.ax[a] = {});
      Object.keys(d.ax[a]).forEach(function (r) { to[r] = (to[r] || 0) + d.ax[a][r]; });
    });
    Object.keys(groups).forEach(function (g) {
      Object.keys(d[g] || {}).forEach(function (name) {
        var row = groupRow_(groups[g], name);
        d[g][name].forEach(function (v, i) { row[i] += v; });
        if (g === 'a' && primes) prime[name] = (prime[name] || 0) + d[g][name][STATS.D] * primeAt_(primes, k);
      });
    });
    Object.keys(d.cr || {}).forEach(function (r) { t.cr[r] = (t.cr[r] || 0) + d.cr[r]; });
    Object.keys(d.tag || {}).forEach(function (r) { t.tag[r] = (t.tag[r] || 0) + d.tag[r]; });
    (d.h || []).forEach(function (v, i) { while (t.h.length < 24) t.h.push(0); t.h[i] += v; });
  });
  t.groups = groups;
  t.prime = prime;
  return t;
}

function ratio_(a, b) { return b ? a / b : null; }

/** Indicateurs d'une période. */
function kpis_(t, expenses, gains) {
  var finished = t.d + t.r;
  gains = gains || 0;
  return {
    orders: t.n, confirmed: t.c, shipped: t.s, delivered: t.d, returned: t.r, cancelled: t.x, pending: t.q, inProgress: t.t,
    confirmRate: ratio_(t.c, t.n), deliveryRate: ratio_(t.d, finished), returnRate: ratio_(t.r, finished), cancelRate: ratio_(t.x, t.n),
    revenue: t.rev, sales: t.sales, deliveryFees: t.fee, deliveryNet: t.dnet, productCost: t.cost, returnFees: t.retf, packaging: t.pack,
    ordersProfit: t.profit, expenses: Math.round(expenses), gains: Math.round(gains), net: Math.round(t.profit - expenses + gains),
    lostToReturns: t.retf + (t.r ? Math.round(t.pack * t.r / Math.max(t.d + t.r, 1)) : 0),
    avgBasket: t.d ? Math.round(t.rev / t.d) : null,
    profitPerDelivered: t.d ? Math.round(t.profit / t.d) : null,
    avgDeliveryHours: t.dn ? Math.round(t.dh / t.dn) : null
  };
}

function groupList_(map, extra) {
  return Object.keys(map).map(function (name) {
    var r = map[name];
    var finished = r[STATS.D] + r[STATS.R];
    var g = {
      name: name, orders: Math.round(r[STATS.N] * 10) / 10, confirmed: Math.round(r[STATS.C] * 10) / 10, delivered: Math.round(r[STATS.D] * 10) / 10,
      returned: Math.round(r[STATS.R] * 10) / 10, cancelled: Math.round(r[STATS.X] * 10) / 10, revenue: Math.round(r[STATS.REV]), profit: Math.round(r[STATS.PROFIT]),
      confirmRate: ratio_(r[STATS.C], r[STATS.N]), deliveryRate: ratio_(r[STATS.D], finished), returnRate: ratio_(r[STATS.R], finished),
      avgHours: r[STATS.DN] ? Math.round(r[STATS.DH] / r[STATS.DN]) : null
    };
    if (extra) extra(g, name, r);
    return g;
  }).sort(function (a, b) { return (b.orders - a.orders) || String(a.name).localeCompare(String(b.name)); });
}

/** Période : « today », « 7 », « 30 », « month », « lastmonth », ou dates « aaaa-mm-jj ». */
function statsRange_(period, from, to) {
  var today = ymd_(new Date());
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) return from <= to ? { from: from, to: to } : { from: to, to: from };
  if (period === 'today') return { from: today, to: today };
  if (period === 'yesterday') { var y = addDayDays_(today, -1); return { from: y, to: y }; }
  if (period === 'month') return { from: today.slice(0, 8) + '01', to: today };
  if (period === 'lastmonth') {
    var first = today.slice(0, 8) + '01';
    var lastPrev = addDayDays_(first, -1);
    return { from: lastPrev.slice(0, 8) + '01', to: lastPrev };
  }
  var n = Math.min(Math.max(Math.round(toNumber_(period)) || 30, 1), 366);
  return { from: addDayDays_(today, -(n - 1)), to: today };
}

/**
 * Période des pages Bénéfices et Tableau de bord : comme statsRange_, plus « all » (tout,
 * from = '') ; renvoie aussi la période précédente de même durée (sauf pour « all »).
 */
function periodRange_(period, from, to) {
  var today = ymd_(new Date());
  if (period === 'all' && !(from && to)) return { from: '', to: today, prevFrom: '', prevTo: '', days: 0, all: true };
  var r = statsRange_(period, from, to);
  var len = dayCount_(r.from, r.to);
  return { from: r.from, to: r.to, prevFrom: addDayDays_(r.from, -len), prevTo: addDayDays_(r.from, -1), days: len, all: false };
}

/** Commande dont la date (heure d'Algérie) est dans la période. */
function inDayRange_(date, from, to) {
  var d = toDate_(date);
  if (!d) return false;
  var k = ymd_(d);
  return (!from || k >= from) && (!to || k <= to);
}

/** Statistiques : mesurée (Administration › État de l'outil). */
function api_stats() {
  var a = arguments;
  return timed_('Statistiques', function () { return statsApi_.apply(null, a); });
}

/* ---------------- Filtre croisé (wilaya, produit, campagne, source, confirmatrice) ---------------- */

var STATS_FILTERS_ = { w: 'Wilaya', p: 'Produit', cp: 'Campagne', src: 'Source', a: 'Confirmatrice' };

/** Filtre demandé par la page : { kind, value } vérifié, ou null. */
function statsFilter_(f) {
  if (!f || typeof f !== 'object') return null;
  var kind = String(f.kind || '');
  var value = String(f.value == null ? '' : f.value).trim();
  if (!STATS_FILTERS_[kind] || !value) return null;
  return { kind: kind, value: value, label: STATS_FILTERS_[kind] };
}

/** La commande fait-elle partie du filtre ? (mêmes noms que les groupes des résumés) */
function statsFilterMatch_(o, f, catalog) {
  if (f.kind === 'w') return (String(o.wilaya || '').trim() || '(sans wilaya)') === f.value;
  if (f.kind === 'a') return (String(o.agent || '').trim() || '(sans confirmatrice)') === f.value;
  if (f.kind === 'cp') return (String(o.campaign || '').replace(/\s+/g, ' ').trim() || '(sans campagne)') === f.value;
  if (f.kind === 'src') return (adPlatform_(o.adSource) || (String(o.adSource || '').trim() || 'Sans publicité suivie')) === f.value;
  if (f.kind === 'p') {
    return catalogItems_(catalog, o).some(function (it) {
      var row = matchCatalog_(catalog, it.label);
      return (row ? row.product + (row.model ? ' — ' + row.model : '') : it.label) === f.value;
    });
  }
  return false;
}

/** Commandes où chercher pour un filtre (Cloudflare : déjà choisies par la base, archives comprises). */
function statsFilterOrders_(ctx) {
  return ctx.orders.concat(readArchivedOrders_());
}

/** Confirmations faites aujourd'hui, par confirmatrice (objectif du jour). Cloudflare : comptées par la base. */
function confirmationsToday_(ctx) {
  var today = ymd_(new Date());
  var out = {};
  ctx.orders.forEach(function (o) {
    if (CONFIRMED_STATUSES.indexOf(o.status) < 0) return;
    var d = toDate_(o.confirmedAt);
    if (!d || ymd_(d) !== today) return;
    var a = String(o.agent || '').trim();
    if (a) out[a] = (out[a] || 0) + 1;
  });
  return out;
}

/* ---------------- Calculs de la page ---------------- */

/** Commandes par heure et par jour de la semaine : [lundi … dimanche][0 … 23]. */
function heatOf_(days, keys) {
  var out = [];
  for (var i = 0; i < 7; i++) { var row = []; for (var j = 0; j < 24; j++) row.push(0); out.push(row); }
  keys.forEach(function (k) {
    var d = days[k];
    if (!d || !d.h) return;
    var wd = (new Date(k + 'T12:00:00Z').getUTCDay() + 6) % 7;
    d.h.forEach(function (v, hr) { out[wd][hr] += v || 0; });
  });
  return out;
}

/** Tendance de chaque ligne d'un groupe : commandes par tranche de jours (30 tranches au plus). */
function trendOf_(days, keys, g) {
  var n = Math.min(keys.length, 30);
  var out = {};
  keys.forEach(function (k, i) {
    var d = days[k];
    if (!d || !d[g]) return;
    var b = Math.floor(i * n / keys.length);
    Object.keys(d[g]).forEach(function (name) {
      var t = out[name];
      if (!t) { t = out[name] = []; for (var x = 0; x < n; x++) t.push(0); }
      t[b] += d[g][name][STATS.N] || 0;
    });
  });
  Object.keys(out).forEach(function (name) { out[name] = out[name].map(function (v) { return Math.round(v * 10) / 10; }); });
  return out;
}

/** Qualité d'une source ou d'une campagne (à partir de 10 commandes). */
function qualityOf_(q) {
  if (!q || !q[0]) return null;
  var n = q[0];
  var out = { orders: n, fake: q[1] / n, dup: q[2] / n, black: q[3] / n, refus: q[5] ? q[4] / q[5] : null };
  var bad = out.fake + out.dup + out.black;
  out.score = n < 10 ? '' : (bad >= 0.2 || (out.refus !== null && out.refus >= 0.2)) ? 'Faible' : (bad >= 0.1 || (out.refus !== null && out.refus >= 0.12)) ? 'Moyenne' : 'Bonne';
  return out;
}

/** Ce qui a changé par rapport à la période d'avant : quelques phrases, les plus importantes d'abord. */
function statsInsights_(cur, prev, k, kp, settings) {
  var out = [];
  var pts = function (a, b) { return Math.round((a - b) * 100); };
  var pct = function (r) { return Math.round(r * 100) + ' %'; };
  var rateOf = function (row) { var f = row[STATS.D] + row[STATS.R]; return f ? row[STATS.D] / f : null; };
  // 1. Taux de livraison.
  if (k.deliveryRate !== null && kp.deliveryRate !== null && (k.delivered + k.returned) >= 10) {
    var dd = pts(k.deliveryRate, kp.deliveryRate);
    if (Math.abs(dd) >= 3) {
      var worst = null;
      Object.keys(cur.groups.w).forEach(function (name) {
        var r = cur.groups.w[name];
        var rc = rateOf(r);
        var pr = prev.groups.w[name] ? rateOf(prev.groups.w[name]) : null;
        if (rc === null) return;
        var impact = (rc - (pr === null ? kp.deliveryRate : pr)) * (r[STATS.D] + r[STATS.R]);
        if (!worst || (dd < 0 ? impact < worst.impact : impact > worst.impact)) worst = { name: name, impact: impact, returned: r[STATS.R] };
      });
      var tag = Object.keys(cur.tag).sort(function (a, b) { return cur.tag[b] - cur.tag[a]; })[0];
      var w = worst ? String(worst.name).replace(/^\d+\s*-\s*/, '') : '';
      out.push({ level: dd < 0 ? 'bad' : 'good', weight: Math.abs(dd) * 3,
        text: 'Taux de livraison **' + (dd > 0 ? '+' : '−') + Math.abs(dd) + ' points** (' + pct(k.deliveryRate) + ' au lieu de ' + pct(kp.deliveryRate) + ')' +
          (worst ? (dd < 0 ? ' : surtout **' + w + '** (' + plural_(Math.round(worst.returned), 'retour', 'retours') + ')' : ', surtout grâce à **' + w + '**') : '') +
          (dd < 0 && tag ? ', motif principal du livreur « ' + (remarkTagLabel_(tag) || tag).toLowerCase() + ' »' : '') + '.',
        filter: worst ? { kind: 'w', value: worst.name } : null, link: worst ? 'Voir ' + w : '' });
    }
  }
  // 2. Nombre de commandes.
  if (kp.orders >= 10) {
    var dn = Math.round((k.orders - kp.orders) / kp.orders * 100);
    if (Math.abs(dn) >= 10) {
      var best = null;
      ['cp', 'src'].forEach(function (g) {
        Object.keys(cur.groups[g]).concat(Object.keys(prev.groups[g])).forEach(function (name) {
          if (/^\(sans|^Sans publicit/.test(name)) return;
          var c = cur.groups[g][name] ? cur.groups[g][name][STATS.N] : 0;
          var pv = prev.groups[g][name] ? prev.groups[g][name][STATS.N] : 0;
          var diff = c - pv;
          if (!best || (dn > 0 ? diff > best.diff : diff < best.diff)) best = { g: g, name: name, diff: diff };
        });
      });
      var useful = best && (dn > 0 ? best.diff > 0 : best.diff < 0);
      out.push({ level: dn > 0 ? 'good' : 'bad', weight: Math.abs(dn),
        text: 'Commandes **' + (dn > 0 ? '+' : '−') + Math.abs(dn) + ' %** (' + Math.round(k.orders) + ' au lieu de ' + Math.round(kp.orders) + ')' +
          (useful ? (dn > 0 ? ', grâce à ' : ', surtout ') + (best.g === 'cp' ? 'la campagne' : 'la source') + ' **« ' + best.name + ' »** (' + (best.diff > 0 ? '+' : '−') + Math.abs(Math.round(best.diff)) + ' commandes)' : '') + '.',
        filter: useful ? { kind: best.g, value: best.name } : null, link: useful ? (best.g === 'cp' ? 'Voir la campagne' : 'Voir la source') : '' });
    }
  }
  // 3. Taux de confirmation.
  if (k.confirmRate !== null && kp.confirmRate !== null && k.orders >= 20) {
    var dc = pts(k.confirmRate, kp.confirmRate);
    if (Math.abs(dc) >= 3) {
      var top = Object.keys(cur.cr).sort(function (a, b) { return cur.cr[b] - cur.cr[a]; })[0];
      out.push({ level: dc < 0 ? 'bad' : 'good', weight: Math.abs(dc) * 2,
        text: 'Taux de confirmation **' + (dc > 0 ? '+' : '−') + Math.abs(dc) + ' points** (' + pct(k.confirmRate) + ')' +
          (dc < 0 && top ? ' : premier motif d’annulation « ' + top + ' » (' + cur.cr[top] + ')' : '') + '.', tab: 'orders', link: 'Voir les motifs' });
    }
  }
  // 4. Vitesse de confirmation.
  var sp = cur.sp || [];
  if ((sp[7] || 0) >= 10 && (sp[1] || 0) >= 10) {
    var fast = sp[0] / sp[1];
    var slow = sp[6] / sp[7];
    if (fast - slow >= 0.1) {
      out.push({ level: 'warn', weight: Math.round((fast - slow) * 100),
        text: 'Les commandes confirmées après **24 h** sont livrées à ' + pct(slow) + ' seulement, contre ' + pct(fast) + ' avant 1 h : **' + plural_(sp[7], 'commande', 'commandes') + '** ont attendu plus de 24 h.',
        tab: 'orders', link: 'Voir' });
    }
  }
  // 5. Bénéfice net.
  if (kp.net && Math.abs(kp.net) >= 1000) {
    var dp = Math.round((k.net - kp.net) / Math.abs(kp.net) * 100);
    if (Math.abs(dp) >= 15) {
      out.push({ level: dp > 0 ? 'good' : 'bad', weight: Math.abs(dp) / 2,
        text: 'Bénéfice net **' + (dp > 0 ? '+' : '−') + Math.abs(dp) + ' %** (' + String(Math.round(k.net)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DA).', tab: 'money', link: 'Voir l’argent' });
    }
  }
  // 6. Un produit qui revient souvent.
  var overall = k.returnRate || 0;
  var worstP = null;
  Object.keys(cur.groups.p).forEach(function (name) {
    var r = cur.groups.p[name];
    var f = r[STATS.D] + r[STATS.R];
    if (f < 8) return;
    var rr = r[STATS.R] / f;
    if (rr >= overall + 0.15 && (!worstP || rr > worstP.rate)) worstP = { name: name, rate: rr };
  });
  if (worstP) {
    out.push({ level: 'warn', weight: Math.round((worstP.rate - overall) * 100),
      text: 'Le produit **' + worstP.name + '** revient souvent : ' + pct(worstP.rate) + ' de retours (moyenne ' + pct(overall) + ').',
      filter: { kind: 'p', value: worstP.name }, link: 'Voir le produit' });
  }
  return out.sort(function (a, b) { return b.weight - a.weight; }).slice(0, 4).map(function (x) { delete x.weight; return x; });
}

function statsApi_(period, from, to, filterIn) {
  requireAdmin_();
  var settings = getSettings_();
  var p = PropertiesService.getScriptProperties();
  // Premier passage, ou nouvelle version des résumés : tout est recalculé une fois.
  if (!p.getProperty(STATS.PROP_BUILT) || p.getProperty(STATS.PROP_VERSION) !== String(STATS.VERSION)) {
    rebuildStats_();
    p.setProperty(STATS.PROP_VERSION, String(STATS.VERSION));
  }
  var built = toDate_(p.getProperty(STATS.PROP_BUILT));
  var range = statsRange_(period, from, to);
  var len = dayCount_(range.from, range.to);
  var prevTo = addDayDays_(range.from, -1);
  var prevFrom = addDayDays_(range.from, -len);
  var filter = statsFilter_(filterIn);
  var ctx = readOrders_();
  var env = makeEnv_(ctx);
  var catalog = readCatalog_();
  var days;
  var picked = null;
  if (filter) {
    // Filtre : résumés refaits à partir des seules commandes du filtre (période et période d'avant).
    picked = statsFilterOrders_(ctx).filter(function (o) { return inDayRange_(o.date, prevFrom, range.to) && statsFilterMatch_(o, filter, catalog); });
    days = summarizeDays_(picked, env, catalog, prevFrom);
  } else {
    days = readStoredDays_(prevFrom, range.to);
    // En direct : depuis le jour du dernier calcul (les commandes de ces jours sont dans l'onglet Commandes).
    var liveFrom = built ? ymd_(built) : prevFrom;
    if (liveFrom <= range.to) {
      var live = summarizeDays_(ctx.orders, env, catalog, liveFrom);
      Object.keys(days).forEach(function (k) { if (k >= liveFrom) delete days[k]; });
      Object.keys(live).forEach(function (k) { days[k] = live[k]; });
    }
  }

  var list = function (a, b) { var out = []; for (var k = a; k <= b; k = addDayDays_(k, 1)) out.push(k); return out; };
  var curKeys = list(range.from, range.to);
  var prevKeys = list(prevFrom, prevTo);
  var primes = parsePrimes_(settings.PRIMES);
  var cur = mergeDays_(days, curKeys, primes);
  var prev = mergeDays_(days, prevKeys, null);

  // Dépenses (publicité comprise) de chaque période.
  // Une dépense sur plusieurs jours est répartie par jour ; les gains s'ajoutent au bénéfice net.
  // Avec un filtre : seulement la publicité de la campagne ou de la source choisie.
  var expenses = readExpenses_(settings);
  var ofFilter = function (e) {
    if (!filter) return true;
    if (filter.kind === 'cp') return !!e.ad && !e.gain && normalizeLoose_(e.campaign) === normalizeLoose_(filter.value);
    if (filter.kind === 'src') return !!e.ad && !e.gain && normalizeLoose_(e.platform) === normalizeLoose_(filter.value);
    return false;
  };
  var spend = function (a, b) { return expenses.reduce(function (s, e) { return e.gain || !ofFilter(e) ? s : s + expenseShare_(e, a, b); }, 0); };
  var gains = function (a, b) { return filter ? 0 : expenses.reduce(function (s, e) { return e.gain ? s + expenseShare_(e, a, b) : s; }, 0); };
  var adBy = { cp: {}, src: {} };
  expenses.forEach(function (e) {
    if (!e.ad || e.gain) return;
    var part = expenseShare_(e, range.from, range.to);
    if (!part) return;
    var ck = normalizeLoose_(e.campaign);
    if (ck) adBy.cp[ck] = (adBy.cp[ck] || 0) + part;
    if (e.platform) adBy.src[normalizeLoose_(e.platform)] = (adBy.src[normalizeLoose_(e.platform)] || 0) + part;
  });
  var withSpend = function (kind, trends) {
    return function (g, name) {
      var s = adBy[kind][normalizeLoose_(name)] || 0;
      g.spend = Math.round(s);
      g.costPerDelivered = s && g.delivered ? Math.round(s / g.delivered) : null;
      g.net = g.profit - g.spend;
      g.quality = qualityOf_(cur.qa[kind + '\t' + name]);
      g.trend = trends[name] || [];
    };
  };

  var k = kpis_(cur, spend(range.from, range.to), gains(range.from, range.to));
  var kp = kpis_(prev, spend(prevFrom, prevTo), gains(prevFrom, prevTo));
  // Argent maintenant (colis en cours) : à recevoir, et prévu selon votre taux de livraison.
  // Versements d'Ecotrack : ceux qui ont bougé depuis le début de la période. Avec un filtre : ses commandes seulement.
  var sinceDays = Math.max(dayCount_(range.from, ymd_(new Date())), 1);
  var tm = trackingMoney_(filter ? picked : moneyOrders_(ctx), new Date(), sinceDays);
  var m = tm.money;
  var rate = k.deliveryRate !== null ? k.deliveryRate : kp.deliveryRate;

  // Bureau ou domicile, par wilaya.
  var modes = {};
  groupList_(cur.groups.wm).forEach(function (g) {
    var parts = String(g.name).split('\t');
    (modes[parts[0]] = modes[parts[0]] || {})[parts[1] === 'Stop desk' ? 'desk' : 'home'] = { orders: g.orders, delivered: g.delivered, returned: g.returned, deliveryRate: g.deliveryRate };
  });
  var trendW = trendOf_(days, curKeys, 'w');
  var wilayas = groupList_(cur.groups.w, function (g, name, r) {
    g.lost = Math.round(r[STATS.R] * settings.FRAIS_RETOUR);
    g.code = wilayaCode_(name);
    g.modes = modes[name] || {};
    g.trend = trendW[name] || [];
  });
  var overallReturn = k.returnRate || 0;
  wilayas.forEach(function (g) { g.bad = g.returnRate !== null && (g.delivered + g.returned) >= 5 && g.returnRate >= overallReturn + 0.1; });
  var trendP = trendOf_(days, curKeys, 'p');

  // Équipe : appels (historique), réponses, motifs d'annulation, objectif du jour.
  var todayCounts = confirmationsToday_(ctx);
  var speed = [];
  for (var b = 0; b <= STATS.SPEED.length; b++) {
    var lim = STATS.SPEED;
    speed.push({ label: b === 0 ? 'moins d’1 h' : b === lim.length ? 'plus de ' + lim[b - 1] + ' h' : lim[b - 1] + ' h à ' + lim[b] + ' h',
      delivered: cur.sp[b * 2] || 0, finished: cur.sp[b * 2 + 1] || 0, rate: ratio_(cur.sp[b * 2] || 0, cur.sp[b * 2 + 1] || 0) });
  }

  return {
    range: { from: range.from, to: range.to, prevFrom: prevFrom, prevTo: prevTo, days: len },
    builtAt: built ? built.toISOString() : '',
    filter: filter,
    kpis: k,
    prev: kp,
    insights: statsInsights_(cur, prev, k, kp, settings),
    series: curKeys.map(function (key) {
      var d = days[key] || emptyDay_();
      return { day: key, orders: d.n, confirmed: d.c, delivered: d.d, returned: d.r, revenue: d.rev, profit: d.profit };
    }),
    money: {
      toReceive: m.delivered.amount + m.cashed.amount + m.ready.amount,
      enRoute: m.enRoute.amount,
      expected: rate !== null ? Math.round(m.enRoute.amount * rate) : null,
      deliveryRate: rate,
      buckets: m,
      paidDays: sinceDays,
      payments: tm.payments
    },
    wilayas: wilayas,
    products: groupList_(cur.groups.p, function (g, name) { g.trend = trendP[name] || []; }),
    agents: groupList_(cur.groups.a, function (g, name, r) {
      g.avgConfirmHours = r[STATS.DN] ? Math.round(r[STATS.DH] / r[STATS.DN] * 10) / 10 : null;
      g.avgHours = null;
      g.prime = Math.round(cur.prime[name] || 0);
      var calls = cur.ag[name] || [0, 0];
      g.calls = calls[0] || 0;
      g.answerRate = ratio_(calls[1] || 0, calls[0] || 0);
      g.callsPerConfirmation = g.confirmed ? Math.round(g.calls / g.confirmed * 10) / 10 : null;
      var ax = cur.ax[name] || {};
      var topCancel = Object.keys(ax).sort(function (a, c) { return ax[c] - ax[a]; })[0];
      g.topCancel = topCancel ? { name: topCancel, count: ax[topCancel] } : null;
      g.today = todayCounts[name] || 0;
    }),
    sources: groupList_(cur.groups.src, withSpend('src', trendOf_(days, curKeys, 'src'))),
    campaigns: groupList_(cur.groups.cp, withSpend('cp', trendOf_(days, curKeys, 'cp'))),
    cancelReasons: Object.keys(cur.cr).map(function (r) { return { name: r, count: cur.cr[r] }; }).sort(function (a, c) { return c.count - a.count; }),
    courierTags: Object.keys(cur.tag).map(function (t) { return { name: remarkTagLabel_(t) || 'Autre remarque', count: cur.tag[t] }; }).sort(function (a, c) { return c.count - a.count; }),
    hours: cur.h.length ? cur.h : [],
    weekdays: weekdayCounts_(days, curKeys),
    heat: heatOf_(days, curKeys),
    calls: { hours: cur.ch.length ? cur.ch : [], answered: cur.ah.length ? cur.ah : [] },
    speed: { buckets: speed, confirmHours: cur.cfn ? Math.round(cur.cfh / cur.cfn * 10) / 10 : null, deliveryHours: k.avgDeliveryHours },
    goal: { perDay: settings.OBJECTIF_JOUR, today: todayCounts },
    primes: primes,
    primeNow: primeAt_(primes, ymd_(new Date()))
  };
}

/** Objectif du jour : nombre de commandes confirmées par confirmatrice (0 = pas d'objectif). */
function api_setGoal(n) {
  cloudGuardAll_();
  var user = requireAdmin_();
  var v = Math.round(toNumber_(n));
  if (!(v >= 0) || v > 1000) throw new Error('Objectif invalide.');
  writeSettings_({ OBJECTIF_JOUR: v }, user);
  return { message: v ? 'Objectif : ' + v + ' commandes confirmées par jour et par confirmatrice.' : 'Objectif du jour retiré.' };
}

/** Commandes comptées dans « Où est l'argent » et les versements. */
function moneyOrders_(ctx) { return ctx.orders; }

/** Commandes par jour de la semaine (lundi d'abord). */
function weekdayCounts_(days, keys) {
  var out = [0, 0, 0, 0, 0, 0, 0];
  keys.forEach(function (k) {
    if (!days[k]) return;
    var wd = new Date(k + 'T12:00:00Z').getUTCDay(); // 0 = dimanche
    out[(wd + 6) % 7] += days[k].n;
  });
  return out;
}

/** « Recalculer » : refait tous les résumés tout de suite. */
function api_rebuildStats() {
  cloudGuardAll_();
  requireAdmin_();
  var r = rebuildStats_();
  return { message: plural_(r.days, 'jour recalculé', 'jours recalculés') + '.' };
}
