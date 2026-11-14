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
  N: 0, C: 1, D: 2, R: 3, X: 4, REV: 5, PROFIT: 6, DH: 7, DN: 8, SIZE: 9
};

/* ------------------------------------------------------------------ */
/* Résumé d'un jour                                                   */
/* ------------------------------------------------------------------ */

function emptyDay_() {
  return { n: 0, c: 0, s: 0, d: 0, r: 0, x: 0, q: 0, t: 0, rev: 0, sales: 0, fee: 0, dnet: 0, cost: 0, retf: 0, pack: 0, profit: 0,
    dh: 0, dn: 0, w: {}, p: {}, a: {}, src: {}, cp: {}, cr: {}, tag: {}, h: [] };
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

  var items = orderItems_(o);
  var totalQty = items.reduce(function (a, it) { return a + it.qty; }, 0) || 1;
  items.forEach(function (it) {
    var row = matchCatalog_(catalog, it.label);
    var name = row ? row.product + (row.model ? ' — ' + row.model : '') : it.label;
    addToRow_(groupRow_(day.p, name), o, p, it.qty / totalQty, null);
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

/** Arrondit les montants d'un résumé (JSON plus court). */
function roundDay_(day) {
  ['rev', 'sales', 'fee', 'dnet', 'cost', 'retf', 'pack', 'profit', 'dh'].forEach(function (k) { day[k] = Math.round(day[k]); });
  ['w', 'p', 'a', 'src', 'cp'].forEach(function (g) {
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
  var groups = { w: {}, p: {}, a: {}, src: {}, cp: {} };
  var prime = {};
  keys.forEach(function (k) {
    var d = days[k];
    if (!d) return;
    ['n', 'c', 's', 'd', 'r', 'x', 'q', 't', 'rev', 'sales', 'fee', 'dnet', 'cost', 'retf', 'pack', 'profit', 'dh', 'dn'].forEach(function (f) { t[f] += d[f] || 0; });
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
function kpis_(t, expenses) {
  var finished = t.d + t.r;
  return {
    orders: t.n, confirmed: t.c, shipped: t.s, delivered: t.d, returned: t.r, cancelled: t.x, pending: t.q, inProgress: t.t,
    confirmRate: ratio_(t.c, t.n), deliveryRate: ratio_(t.d, finished), returnRate: ratio_(t.r, finished), cancelRate: ratio_(t.x, t.n),
    revenue: t.rev, sales: t.sales, deliveryFees: t.fee, deliveryNet: t.dnet, productCost: t.cost, returnFees: t.retf, packaging: t.pack,
    ordersProfit: t.profit, expenses: Math.round(expenses), net: Math.round(t.profit - expenses),
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
  }).sort(function (a, b) { return b.orders - a.orders; });
}

/** Période : « today », « 7 », « 30 », « month », « lastmonth », ou dates « aaaa-mm-jj ». */
function statsRange_(period, from, to) {
  var today = ymd_(new Date());
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) return from <= to ? { from: from, to: to } : { from: to, to: from };
  if (period === 'today') return { from: today, to: today };
  if (period === 'month') return { from: today.slice(0, 8) + '01', to: today };
  if (period === 'lastmonth') {
    var first = today.slice(0, 8) + '01';
    var lastPrev = addDayDays_(first, -1);
    return { from: lastPrev.slice(0, 8) + '01', to: lastPrev };
  }
  var n = Math.min(Math.max(Math.round(toNumber_(period)) || 30, 1), 366);
  return { from: addDayDays_(today, -(n - 1)), to: today };
}

/** Statistiques : mesurée (Administration › État de l'outil). */
function api_stats() {
  var a = arguments;
  return timed_('Statistiques', function () { return statsApi_.apply(null, a); });
}

function statsApi_(period, from, to) {
  requireAdmin_();
  var settings = getSettings_();
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty(STATS.PROP_BUILT)) rebuildStats_(); // premier passage : tout est calculé une fois
  var built = toDate_(p.getProperty(STATS.PROP_BUILT));
  var range = statsRange_(period, from, to);
  var len = dayCount_(range.from, range.to);
  var prevTo = addDayDays_(range.from, -1);
  var prevFrom = addDayDays_(range.from, -len);
  var days = readStoredDays_(prevFrom, range.to);

  // En direct : depuis le jour du dernier calcul (les commandes de ces jours sont dans l'onglet Commandes).
  var ctx = readOrders_();
  var env = makeEnv_(ctx);
  var liveFrom = built ? ymd_(built) : prevFrom;
  if (liveFrom <= range.to) {
    var live = summarizeDays_(ctx.orders, env, readCatalog_(), liveFrom);
    Object.keys(days).forEach(function (k) { if (k >= liveFrom) delete days[k]; });
    Object.keys(live).forEach(function (k) { days[k] = live[k]; });
  }

  var list = function (a, b) { var out = []; for (var k = a; k <= b; k = addDayDays_(k, 1)) out.push(k); return out; };
  var curKeys = list(range.from, range.to);
  var prevKeys = list(prevFrom, prevTo);
  var primes = parsePrimes_(settings.PRIMES);
  var cur = mergeDays_(days, curKeys, primes);
  var prev = mergeDays_(days, prevKeys, null);

  // Dépenses (publicité comprise) de chaque période.
  var expenses = readExpenses_(settings);
  var inRange = function (e, a, b) { var k = e.date ? ymd_(e.date) : ''; return k && k >= a && k <= b; };
  var spend = function (a, b) { return expenses.filter(function (e) { return inRange(e, a, b); }).reduce(function (s, e) { return s + e.amountDA; }, 0); };
  var adBy = { cp: {}, src: {} };
  expenses.forEach(function (e) {
    if (!e.ad || !inRange(e, range.from, range.to)) return;
    var ck = normalizeLoose_(e.campaign);
    if (ck) adBy.cp[ck] = (adBy.cp[ck] || 0) + e.amountDA;
    if (e.platform) adBy.src[normalizeLoose_(e.platform)] = (adBy.src[normalizeLoose_(e.platform)] || 0) + e.amountDA;
  });
  var withSpend = function (kind) {
    return function (g, name) {
      var s = adBy[kind][normalizeLoose_(name)] || 0;
      g.spend = Math.round(s);
      g.costPerDelivered = s && g.delivered ? Math.round(s / g.delivered) : null;
      g.net = g.profit - g.spend;
    };
  };

  var k = kpis_(cur, spend(range.from, range.to));
  var kp = kpis_(prev, spend(prevFrom, prevTo));
  // Argent maintenant (colis en cours) : à recevoir, et prévu selon votre taux de livraison.
  var m = trackingMoney_(ctx.orders, new Date(), 30).money;
  var rate = k.deliveryRate !== null ? k.deliveryRate : kp.deliveryRate;
  var wilayas = groupList_(cur.groups.w, function (g, name, r) { g.lost = Math.round(r[STATS.R] * settings.FRAIS_RETOUR); });
  var overallReturn = k.returnRate || 0;
  wilayas.forEach(function (g) { g.bad = g.returnRate !== null && (g.delivered + g.returned) >= 5 && g.returnRate >= overallReturn + 0.1; });

  return {
    range: { from: range.from, to: range.to, prevFrom: prevFrom, prevTo: prevTo, days: len },
    builtAt: built ? built.toISOString() : '',
    kpis: k,
    prev: kp,
    series: curKeys.map(function (key) {
      var d = days[key] || emptyDay_();
      return { day: key, orders: d.n, confirmed: d.c, delivered: d.d, returned: d.r, revenue: d.rev, profit: d.profit };
    }),
    money: {
      toReceive: m.delivered.amount + m.cashed.amount + m.ready.amount,
      enRoute: m.enRoute.amount,
      expected: rate !== null ? Math.round(m.enRoute.amount * rate) : null,
      deliveryRate: rate
    },
    wilayas: wilayas,
    products: groupList_(cur.groups.p),
    agents: groupList_(cur.groups.a, function (g, name, r) {
      g.avgConfirmHours = r[STATS.DN] ? Math.round(r[STATS.DH] / r[STATS.DN] * 10) / 10 : null;
      g.avgHours = null;
      g.prime = Math.round(cur.prime[name] || 0);
    }),
    sources: groupList_(cur.groups.src, withSpend('src')),
    campaigns: groupList_(cur.groups.cp, withSpend('cp')),
    cancelReasons: Object.keys(cur.cr).map(function (r) { return { name: r, count: cur.cr[r] }; }).sort(function (a, b) { return b.count - a.count; }),
    courierTags: Object.keys(cur.tag).map(function (t) { return { name: remarkTagLabel_(t) || 'Autre remarque', count: cur.tag[t] }; }).sort(function (a, b) { return b.count - a.count; }),
    hours: cur.h.length ? cur.h : [],
    weekdays: weekdayCounts_(days, curKeys),
    primes: primes,
    primeNow: primeAt_(primes, ymd_(new Date()))
  };
}

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
  requireAdmin_();
  var r = rebuildStats_();
  return { message: plural_(r.days, 'jour recalculé', 'jours recalculés') + '.' };
}
