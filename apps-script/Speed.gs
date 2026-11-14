/**
 * Speed.gs : vitesse de l'application.
 *
 * - Mémoire courte des commandes : quand on change de page plusieurs fois de
 *   suite, Google garde l'onglet Commandes 30 secondes en mémoire (CacheService)
 *   au lieu de le relire. Jamais utilisée pendant une modification (sous le
 *   verrou, la lecture est toujours fraîche), et oubliée à chaque modification
 *   (fin du verrou, ou modification à la main dans l'onglet Commandes).
 * - Préchargement : en un seul appel, les données des pages principales.
 * - Mesure : temps de chaque page côté Google (moyenne, maximum), affiché dans
 *   Administration › État de l'outil.
 */

var SPEED = {
  GEN: 'orders:gen',       // change à chaque modification : une copie plus ancienne n'est plus utilisée
  META: 'orders:meta',
  PART: 'orders:part:',
  TTL: 30,                 // secondes
  CHUNK: 40000,            // caractères par morceau (une case de la mémoire contient au plus 100 Ko)
  MAX: 1600000,            // au-delà, pas de copie (classeur trop gros pour la mémoire)
  PERF: 'perf:v1'
};

/** Mémoire courte activée (les tests la coupent pour écrire directement dans l'imitation du classeur). */
var ORDERS_CACHE_ON_ = true;
/** Profondeur du verrou en cours (voir withLock_) : sous le verrou, jamais de copie. */
var LOCK_DEPTH_ = 0;

function ordersGen_() {
  try { return CacheService.getScriptCache().get(SPEED.GEN) || ''; } catch (e) { return ''; }
}

/** Oublie la copie des commandes (après toute modification). */
function invalidateOrdersCache_() {
  try { CacheService.getScriptCache().put(SPEED.GEN, Date.now() + '-' + Math.random().toString(36).slice(2, 8), 21600); } catch (e) { /* sans importance */ }
}

function encodeCell_(key, value) {
  var raw = this[key];
  return raw instanceof Date ? { $d: raw.getTime() } : value;
}

function decodeCell_(key, value) {
  return value && typeof value === 'object' && value.$d !== undefined && Object.keys(value).length === 1 ? new Date(value.$d) : value;
}

/** Copie récente de l'onglet Commandes (valeurs), ou null. */
function cachedOrderValues_() {
  if (!ORDERS_CACHE_ON_ || LOCK_DEPTH_) return null;
  try {
    var c = CacheService.getScriptCache();
    var head = c.getAll([SPEED.GEN, SPEED.META]);
    var meta = head[SPEED.META] ? JSON.parse(head[SPEED.META]) : null;
    if (!meta || meta.gen !== (head[SPEED.GEN] || '')) return null;
    var keys = [];
    for (var i = 0; i < meta.n; i++) keys.push(SPEED.PART + i);
    var parts = c.getAll(keys);
    var text = '';
    for (var k = 0; k < keys.length; k++) {
      if (parts[keys[k]] === undefined || parts[keys[k]] === null) return null;
      text += parts[keys[k]];
    }
    return JSON.parse(text, decodeCell_);
  } catch (e) {
    return null;
  }
}

/** Garde une copie (si rien n'a été modifié pendant la lecture). */
function storeOrderValues_(values, gen) {
  if (!ORDERS_CACHE_ON_ || LOCK_DEPTH_) return;
  try {
    var text = JSON.stringify(values, encodeCell_);
    if (text.length > SPEED.MAX) return;
    var c = CacheService.getScriptCache();
    if ((c.get(SPEED.GEN) || '') !== gen) return;
    var put = {};
    var n = 0;
    for (var i = 0; i < text.length; i += SPEED.CHUNK) put[SPEED.PART + (n++)] = text.slice(i, i + SPEED.CHUNK);
    put[SPEED.META] = JSON.stringify({ gen: gen, n: n });
    c.putAll(put, SPEED.TTL);
  } catch (e) {
    // La mémoire est pleine ou indisponible : la lecture suivante relira le classeur.
  }
}

/* ------------------------------------------------------------------ */
/* Mesure du temps des pages                                          */
/* ------------------------------------------------------------------ */

/** Exécute fn et note sa durée sous le nom `label`. */
function timed_(label, fn) {
  var t0 = Date.now();
  try {
    return fn();
  } finally {
    notePerf_(label, Date.now() - t0);
  }
}

function notePerf_(label, ms) {
  try {
    var c = CacheService.getScriptCache();
    var all = JSON.parse(c.get(SPEED.PERF) || '{}');
    var p = all[label] || { n: 0, total: 0, max: 0, last: 0 };
    p.n++;
    p.total += ms;
    p.max = Math.max(p.max, ms);
    p.last = ms;
    if (p.n > 200) { p.total = Math.round(p.total / p.n * 100); p.n = 100; } // moyenne des derniers passages
    all[label] = p;
    c.put(SPEED.PERF, JSON.stringify(all), 21600);
  } catch (e) {
    // La mesure ne doit jamais gêner la page.
  }
}

/** Temps des pages côté Google (les 6 dernières heures). */
function readPerf_() {
  var all = {};
  try { all = JSON.parse(CacheService.getScriptCache().get(SPEED.PERF) || '{}'); } catch (e) { all = {}; }
  return Object.keys(all).map(function (label) {
    var p = all[label];
    return { label: label, avg: p.n ? Math.round(p.total / p.n) : 0, max: p.max, last: p.last, n: p.n };
  }).sort(function (a, b) { return b.avg - a.avg; });
}

/* ------------------------------------------------------------------ */
/* Préchargement                                                      */
/* ------------------------------------------------------------------ */

var PRELOADABLE_ = {
  api_dashboard: function (args) { return dashboardApi_(args[0]); },
  api_listOrders: function (args) { var f = args[0] || {}; f.sync = false; f.withStatus = false; return listOrdersApi_(f); },
  api_queue: function () { return queueApi_(); },
  api_shippingList: function () { return shippingListApi_(); },
  api_trackingOverview: function (args) { return trackingOverviewApi_(args[0]); }
};

/**
 * Données de plusieurs pages en un seul appel (après la première page, en
 * arrière-plan) : l'onglet Commandes n'est lu qu'une fois grâce à la mémoire courte.
 * specs = [{ fn, args }] → [{ key, data }] (data = null si la page a échoué).
 */
function api_preloadPages(specs) {
  return timed_('Préchargement', function () {
    return (specs || []).slice(0, 8).map(function (s) {
      var run = s && PRELOADABLE_[s.fn];
      var args = s && Array.isArray(s.args) ? s.args : [];
      var key = s ? s.fn + '|' + JSON.stringify(args) : '';
      if (!run) return { key: key, data: null };
      try { return { key: key, data: run(JSON.parse(JSON.stringify(args))) }; } catch (e) { return { key: key, data: null }; }
    });
  });
}
