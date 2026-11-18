/*
 * DZ Smart Shop sur Cloudflare Workers : le moteur (API), la connexion et la copie des données.
 *
 * Ce fichier est placé APRÈS la fonction makeApp générée par build.js, qui contient tout le code
 * de apps-script/*.gs (les mêmes règles que la version Google), gas-shim.js et overrides.js.
 *
 *   GET  /auth/info          adresse de connexion (lien Apps Script), nom de la boutique
 *   POST /api/<fonction>     les fonctions appelées par l'interface (comme google.script.run)
 *   POST /bridge/register    premier contact d'Apps Script : enregistre la clé partagée
 *   POST /bridge/import      copie des onglets du classeur (par paquets)
 *   GET  /bridge/status      ce que contient la base
 *   tout le reste            l'interface (fichiers du dossier public/)
 */

const APP = makeApp();
const F = APP.fns;
const K = APP.consts;

const TOKEN_DAYS = 30;
const TODO = K.TODO_STATUSES_;
const QUEUE = K.QUEUE_STATUSES;
const S = K.STATUS;

/* ================================================================ */
/* Outils                                                           */
/* ================================================================ */

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || ''; }
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function b64url(bytes) {
  let s = '';
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlText(text) { return b64url(new TextEncoder().encode(text)); }
function fromB64url(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

/** Comparaison sans fuite de temps (clé partagée, signatures). */
function sameText(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length || !a.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Jeton de connexion : « v1.<données>.<signature> », signé par Apps Script avec la clé partagée
 * (voir Cloud.gs). Données : { e: adresse, x: fin de validité en ms }.
 */
async function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !secret) return null;
  const sig = await hmac(secret, parts[0] + '.' + parts[1]);
  if (!sameText(sig, parts[2])) return null;
  let p;
  try { p = JSON.parse(fromB64url(parts[1])); } catch (e) { return null; }
  if (!p || !p.e || !(p.x > Date.now())) return null;
  return { email: String(p.e).toLowerCase() };
}

/** Étape d'une commande (colonne stage) : pour lire seulement les commandes utiles. */
function stageOf(status) {
  const s = String(status == null ? '' : status).trim();
  if (!s || TODO.indexOf(s) >= 0) return 'todo';
  if (s === S.CONFIRMED) return 'confirmed';
  if (s === S.SHIPPED || s === S.IN_DELIVERY) return 'transit';
  if (s === S.DELIVERED) return 'delivered';
  if (s === S.RETURNED) return 'returned';
  if (s === S.CANCELLED) return 'cancelled';
  return 'other'; // statut inconnu : visible dans Confirmation › En attente
}

function isoOf(v) {
  if (v === '' || v === null || v === undefined) return '';
  const d = v instanceof Date ? v : F.toDate_(v);
  return d && !isNaN(d.getTime()) ? d.toISOString() : '';
}

/** Commande « à plat » : les champs des colonnes de l'outil, les dates en texte ISO. */
function plain(o) {
  const out = {};
  K.ORDER_COLUMNS.forEach((c) => {
    let v = o[c.key];
    if (v instanceof Date) v = isNaN(v.getTime()) ? '' : v.toISOString();
    out[c.key] = v === undefined || v === null ? '' : v;
  });
  return out;
}

/** Ligne de la table orders pour une commande. */
function rowOf(o) {
  const p = plain(o);
  const d = F.toDate_(p.date);
  const phone = F.normalizePhone(p.phone).phone || String(p.phone || '').trim();
  const text = [p.id, p.client, p.commune, p.product, p.tracking, p.wilaya].join(' ');
  return {
    id: String(p.id).trim(),
    stage: stageOf(p.status),
    status: String(p.status == null ? '' : p.status).trim(),
    day: d ? F.ymd_(d) : '',
    date: d ? d.toISOString() : '',
    phone: phone,
    wilaya: String(p.wilaya || '').trim(),
    agent: String(p.agent || '').trim(),
    product: String(p.product || '').trim(),
    total: Number(F.toNumber_(p.total)) || 0,
    callback: isoOf(p.callback),
    carrier: String(p.carrier || '').trim(),
    tracking: String(p.tracking || '').trim(),
    updated: isoOf(p.updated),
    search: (F.normalizeText_(text) + ' ' + text.toLowerCase() + ' ' + String(p.phone || '').replace(/\D/g, '')).slice(0, 2000),
    data: JSON.stringify(p),
    track: tracked(o) ? 1 : 0
  };
}

/** Colis Ecotrack encore à suivre (statut, argent, retour) : lus par la page Suivi et la lecture automatique. */
function tracked(o) {
  try { return !!F.isEcotrackTracked_(o); } catch (e) { return false; } // fonction pure (statut, société, n° de suivi)
}

const ROW_COLS = ['stage', 'status', 'day', 'date', 'phone', 'wilaya', 'agent', 'product', 'total', 'callback', 'carrier', 'tracking', 'updated', 'search', 'data', 'track'];

function toOrder(row) {
  const o = JSON.parse(row.data);
  Object.defineProperty(o, '__rev', { value: row.rev, writable: true, enumerable: false });
  return o;
}

function placeholders(n) { return new Array(n).fill('?').join(','); }

/* ================================================================ */
/* Requête : réglages, commandes utiles, enregistrement             */
/* ================================================================ */

/** Réglages (table config) et propriétés (table kv) : une seule lecture groupée. */
async function loadBase(env) {
  const [cfg, kv] = await env.DB.batch([
    env.DB.prepare('SELECT key, value FROM config'),
    env.DB.prepare('SELECT key, value FROM kv')
  ]);
  const config = {};
  (cfg.results || []).forEach((r) => { config[r.key] = r.value; });
  const props = {};
  const secret = {};
  const cache = {};
  const now = Date.now();
  (kv.results || []).forEach((r) => {
    if (r.key.indexOf('cf:') === 0) secret[r.key] = r.value;
    else if (r.key.indexOf('cache:') === 0) {
      try { const c = JSON.parse(r.value); if (c.exp > now) cache[r.key.slice(6)] = c.v; } catch (e) { /* ignorée */ }
    } else props[r.key] = r.value;
  });
  return { config, props, secret, cache };
}

function newReq(base, user) {
  return {
    now: new Date(), user: user, config: base.config, props: Object.assign({}, base.props), propWrites: {},
    cache: Object.assign({}, base.cache || {}), cacheWrites: {},
    orders: [], byId: {}, dirty: {}, inserts: [], journal: [], configWrites: {}, extra: [], notes: [],
    trashIds: null, archived: [], manualMax: 0,
    fetched: {}, fetchUsed: {}, needFetch: null, base: base
  };
}

/**
 * Exécute une action qui appelle Ecotrack ou httpSMS (voir UrlFetchApp dans gas-shim.js) : jouée,
 * l'appel manquant est fait, puis rejouée depuis le début avec les commandes telles qu'elles étaient,
 * jusqu'à ce qu'elle aille au bout. Seul le dernier passage compte (et sera enregistré).
 */
async function runFetch(R, fn) {
  const snap = R.orders.map((o) => ({ rev: o.__rev, data: JSON.stringify(o) }));
  const props = Object.assign({}, R.props);
  const cache = Object.assign({}, R.cache);
  const config = Object.assign({}, R.config);
  for (let attempt = 0; attempt < 30; attempt++) {
    R.orders = []; R.byId = {};
    addOrders(R, snap.map((x) => toOrder({ rev: x.rev, data: x.data })));
    R.dirty = {}; R.inserts = []; R.journal = []; R.extra = []; R.notes = []; R.configWrites = {};
    R.props = Object.assign({}, props); R.propWrites = {};
    R.cache = Object.assign({}, cache); R.cacheWrites = {};
    R.config = Object.assign({}, config);
    R.fetchUsed = {}; R.needFetch = null;
    let result;
    let error = null;
    APP.begin(R);
    try { result = fn(); } catch (e) { error = e; } finally { APP.end(); }
    if (R.needFetch) { await doFetches(R.needFetch, R.fetched); continue; }
    if (error) throw error;
    return result;
  }
  throw new Error('Trop d’appels extérieurs pour une seule action : réessayez.');
}

/** Fait les appels demandés (en parallèle) et garde les réponses pour le passage suivant. */
async function doFetches(list, store) {
  await Promise.all(list.map(async (req) => {
    const p = req.params || {};
    const key = F.fetchKey_(req.url, p);
    const headers = Object.assign({}, p.headers || {});
    let body;
    if (p.payload !== undefined && p.payload !== null) {
      if (typeof p.payload === 'string') body = p.payload;
      else { body = new URLSearchParams(p.payload).toString(); if (!p.contentType) headers['content-type'] = 'application/x-www-form-urlencoded'; }
    }
    if (p.contentType) headers['content-type'] = p.contentType;
    const method = String(p.method || 'get').toUpperCase();
    let out;
    try {
      const res = await fetch(req.url, { method: method, headers: headers, body: method === 'GET' || method === 'HEAD' ? undefined : body, redirect: p.followRedirects === false ? 'manual' : 'follow' });
      const bytes = new Uint8Array(await res.arrayBuffer());
      const h = {};
      res.headers.forEach((v, k) => { h[k] = v; h[k.replace(/(^|-)([a-z])/g, (m, a, b) => a + b.toUpperCase())] = v; });
      out = { code: res.status, text: new TextDecoder().decode(bytes), bytes: bytes, headers: h };
    } catch (e) {
      out = { error: 'Address unavailable: ' + req.url + ' (' + String(e && e.message ? e.message : e) + ')' };
    }
    (store[key] = store[key] || []).push(out);
  }));
}

/** Ajoute des commandes à la requête (sans doublon). */
function addOrders(R, list) {
  list.forEach((o) => {
    const id = String(o.id);
    if (R.byId[id]) return;
    R.byId[id] = o;
    R.orders.push(o);
  });
}

async function loadWhere(env, R, where, binds) {
  const r = await env.DB.prepare('SELECT id, rev, data FROM orders WHERE ' + where).bind(...(binds || [])).all();
  addOrders(R, (r.results || []).map(toOrder));
}

/** Plusieurs lectures en un seul aller-retour. */
async function loadMany(env, R, queries) {
  if (!queries.length) return;
  const res = await env.DB.batch(queries.map((q) => env.DB.prepare('SELECT id, rev, data FROM orders WHERE ' + q[0]).bind(...(q[1] || []))));
  res.forEach((r) => addOrders(R, (r.results || []).map(toOrder)));
}

function phonesOf(values) {
  const out = [];
  values.forEach((v) => {
    const p = F.normalizePhone(v).phone;
    if (p && out.indexOf(p) < 0) out.push(p);
  });
  return out;
}
function phoneQuery(phones) {
  return phones.length ? ['archived = 0 AND phone IN (' + placeholders(phones.length) + ')', phones] : null;
}

/** Exécute une fonction de l'outil (synchrone) sur les commandes chargées. */
function run(R, fn) {
  APP.begin(R);
  try { return fn(); } finally { APP.end(); }
}

/** Enregistre dans D1 tout ce que la requête a modifié, en une transaction. */
async function flush(env, R) {
  const db = env.DB;
  const st = [];
  const now = new Date().toISOString();
  let guarded = false;
  Object.keys(R.dirty).forEach((id) => {
    const o = R.dirty[id];
    const row = rowOf(o);
    st.push(db.prepare('UPDATE orders SET rev = rev + 1, ' + ROW_COLS.map((c) => c + ' = ?').join(', ') + ' WHERE id = ? AND rev = ?')
      .bind(...ROW_COLS.map((c) => row[c]), id, o.__rev || 0));
    st.push(db.prepare('INSERT INTO guard(ok) VALUES (changes())'));
    guarded = true;
    st.push(db.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(id, 'update', now));
  });
  R.inserts.forEach((o) => {
    const row = rowOf(o);
    st.push(db.prepare('INSERT INTO orders (id, rev, seq, ' + ROW_COLS.join(', ') + ') VALUES (?, 0, (SELECT COALESCE(MAX(seq), 0) + 1 FROM orders), ' + placeholders(ROW_COLS.length) + ')')
      .bind(row.id, ...ROW_COLS.map((c) => row[c])));
    st.push(db.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(row.id, 'insert', now));
  });
  R.extra.forEach((s) => st.push(s));
  // Autres changements à recopier dans le classeur (liste noire, client signalé…).
  R.notes.forEach((n) => st.push(db.prepare('INSERT INTO changes(order_id, kind, at, info) VALUES (?, ?, ?, ?)').bind(String(n.id), n.kind, now, String(n.info || ''))));
  Object.keys(R.cacheWrites || {}).forEach((k) => {
    const v = R.cacheWrites[k];
    if (v === null) st.push(db.prepare('DELETE FROM kv WHERE key = ?').bind('cache:' + k));
    else if (v.v.length < 60000) st.push(db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cache:' + k, JSON.stringify(v)));
  });
  R.journal.forEach((r) => {
    const at = r[0] instanceof Date ? r[0].toISOString() : now;
    st.push(db.prepare('INSERT INTO journal (at, who, order_id, action, detail) VALUES (?, ?, ?, ?, ?)')
      .bind(at, String(r[1] || ''), String(r[2] || ''), String(r[3] || ''), String(r[4] || '').slice(0, 2000)));
  });
  Object.keys(R.propWrites).forEach((k) => {
    const v = R.propWrites[k];
    if (k === 'SMS_QUEUE') { st.push(smsQueueStatement(db, R, v)); return; }
    st.push(v === null ? db.prepare('DELETE FROM kv WHERE key = ?').bind(k)
      : db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, v));
  });
  Object.keys(R.configWrites).forEach((k) => {
    st.push(db.prepare('INSERT INTO config (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
      .bind(k, R.configWrites[k], now));
  });
  if (!st.length) return;
  if (guarded) st.push(db.prepare('DELETE FROM guard'));
  try {
    await db.batch(st);
  } catch (e) {
    if (/CHECK constraint/i.test(String(e && e.message))) {
      throw new HttpError(409, 'Cette commande vient d’être modifiée par quelqu’un d’autre. Rechargez-la, puis recommencez.', 'conflict');
    }
    throw e;
  }
}

/**
 * File des SMS : plusieurs actions en même temps peuvent la modifier. Au lieu de réécrire la file
 * entière (et d'effacer un SMS ajouté entre-temps par quelqu'un d'autre), seuls les SMS ajoutés
 * et retirés par CETTE requête sont appliqués à la file actuelle de la base.
 */
function smsQueueStatement(db, R, value) {
  const list = (v) => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const before = list(R.base && R.base.props ? R.base.props.SMS_QUEUE : '').map((x) => JSON.stringify(x));
  const after = list(value).map((x) => JSON.stringify(x));
  const left = before.slice();
  const added = [];
  after.forEach((x) => { const i = left.indexOf(x); if (i >= 0) left.splice(i, 1); else added.push(x); });
  const removed = left; // présents avant, plus là après (envoyés ou abandonnés)
  return db.prepare(
    "INSERT INTO kv (key, value) VALUES ('SMS_QUEUE', ?1) ON CONFLICT(key) DO UPDATE SET value = (" +
    'SELECT json_group_array(json(v)) FROM (' +
    'SELECT j.value AS v, 0 AS g, j.key AS k FROM json_each(kv.value) j WHERE j.value NOT IN (SELECT r.value FROM json_each(?2) r) ' +
    'UNION ALL SELECT a.value, 1, a.key FROM json_each(?1) a ORDER BY g, k))'
  ).bind('[' + added.join(',') + ']', '[' + removed.join(',') + ']');
}

/** Compteurs du menu (à appeler / en attente / à expédier) : trois comptes lus sur l'index. */
async function fastCounts(env) {
  const now = new Date().toISOString();
  const r = await env.DB.prepare(
    'SELECT ' +
    "SUM(CASE WHEN stage = 'todo' AND status IN (" + placeholders(QUEUE.length) + ") AND (callback = '' OR callback <= ?) THEN 1 ELSE 0 END) AS queue, " +
    "SUM(CASE WHEN stage = 'todo' THEN 1 ELSE 0 END) AS pending, " +
    "SUM(CASE WHEN stage = 'confirmed' AND tracking = '' THEN 1 ELSE 0 END) AS toShip, " +
    "(SELECT value FROM kv WHERE key = 'cf:alerts') AS alerts " +
    "FROM orders WHERE archived = 0 AND stage IN ('todo', 'confirmed')"
  ).bind(...QUEUE, now).first();
  return { queue: (r && r.queue) || 0, pending: (r && r.pending) || 0, toShip: (r && r.toShip) || 0, alerts: Number(r && r.alerts) || 0 };
}

/** Alertes de suivi (urgentes ou à surveiller) : comptées sur les colis suivis, gardées pour le menu. */
function alertStatement(env, R) {
  const list = R.orders.filter((o) => tracked(o));
  const n = run(R, () => F.trackingAlerts_(list, F.getSettings_(), new Date()).filter((a) => a.level !== 'info').length);
  return env.DB.prepare("INSERT INTO kv (key, value) VALUES ('cf:alerts', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(n));
}

/** Remplace les compteurs marqués par l'outil (countsData_) par ceux de D1, après l'enregistrement. */
async function withCounts(env, res) {
  if (!res || typeof res !== 'object') return res;
  const need = ['counts', 'menuCounts'].filter((k) => res[k] && res[k].__fast);
  if (!need.length) return res;
  const c = await fastCounts(env);
  need.forEach((k) => { res[k] = c; });
  return res;
}

/* ================================================================ */
/* Pages                                                            */
/* ================================================================ */

/** Commandes traitées aujourd'hui par cette personne (« mes confirmations ») : lues avec la file. */
function todayStartIso() { return F.startOfDay_(new Date()).toISOString(); }

async function loadQueueSet(env, R) {
  const name = (R.userName || '');
  await loadMany(env, R, [
    ["archived = 0 AND stage IN ('todo', 'other')", []],
    ["archived = 0 AND stage = 'confirmed'", []],
    ['archived = 0 AND updated >= ? AND agent = ?', [todayStartIso(), name]]
  ]);
}

/** Nom de la personne connectée (onglet Équipe), pour les requêtes. */
function userName(R) { return run(R, () => F.currentUser_().name); }

const PAGES = {
  async api_bootstrap(env, R, args) {
    const preload = args[0] || null;
    const boot = run(R, () => F.bootstrapApi_(null));
    boot.counts = await fastCounts(env);
    const gw = (R.base && R.base.secret && R.base.secret['cf:gateway']) || '';
    boot.cloud = { version: K.APP_VERSION, step: isLive(R) ? 2 : 1, google: gw ? gw + (gw.indexOf('?') >= 0 ? '&' : '?') + 'google=1' : '' };
    if (preload && preload.fn && PAGES[preload.fn] && ['api_dashboard', 'api_listOrders', 'api_queue'].indexOf(preload.fn) >= 0) {
      const R2 = newReq(R.base, R.user);
      R2.userName = R.userName;
      const data = await PAGES[preload.fn](env, R2, Array.isArray(preload.args) ? preload.args : []);
      await flush(env, R2);
      boot.preload = { key: typeof preload.key === 'string' ? preload.key : preload.fn + '|' + JSON.stringify(preload.args || []), data: data };
    }
    return boot;
  },

  async api_counts(env) { return fastCounts(env); },

  async api_queue(env, R, args) {
    const opts = args[0] || {};
    await loadQueueSet(env, R);
    let q = run(R, () => F.queueData_(F.readOrders_(), F.currentUser_()));
    if (opts.first && q.due.length) {
      const first = R.byId[q.due[0].id];
      const pq = first ? phoneQuery(phonesOf([first.phone])) : null;
      if (pq) await loadWhere(env, R, pq[0], pq[1]);
      q.firstDetail = run(R, () => F.firstQueueDetail_(F.readOrders_(), q, F.currentUser_()));
    }
    q.arrived = 0;
    return q;
  },

  async api_getOrder(env, R, args) {
    const id = String(args[0] == null ? '' : args[0]).trim();
    await loadWhere(env, R, 'id = ?', [id]);
    const o = R.byId[id];
    if (!o) throw new HttpError(404, 'Commande ' + id + ' introuvable.');
    const pq = phoneQuery(phonesOf([o.phone]));
    await loadMany(env, R, [["archived = 0 AND stage = 'confirmed'", []]].concat(pq ? [pq] : []));
    return run(R, () => F.getOrderApi_(id));
  },

  async api_recordCall(env, R, args) {
    const id = String(args[0] == null ? '' : args[0]).trim();
    const payload = args[2] || {};
    const opts = args[3] || {};
    await loadQueueSet(env, R);
    await loadWhere(env, R, 'id = ?', [id]);
    const o = R.byId[id];
    if (!o) throw new HttpError(404, 'Commande ' + id + ' introuvable.');
    const next = opts.next ? String(opts.next) : '';
    if (next) await loadWhere(env, R, 'id = ?', [next]);
    const phones = phonesOf([o.phone, payload.fields && payload.fields.phone, next && R.byId[next] ? R.byId[next].phone : '']);
    const pq = phoneQuery(phones);
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    const res = run(R, () => F.api_recordCall.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_updateOrder(env, R, args) {
    const id = String(args[0] == null ? '' : args[0]).trim();
    const input = args[1] || {};
    await loadWhere(env, R, 'id = ?', [id]);
    const o = R.byId[id];
    if (!o) throw new HttpError(404, 'Commande ' + id + ' introuvable.');
    const pq = phoneQuery(phonesOf([o.phone, input.phone]));
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    const res = run(R, () => F.api_updateOrder.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_createOrder(env, R, args) {
    const input = args[0] || {};
    const pq = phoneQuery(phonesOf([input.phone]));
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    R.manualMax = await manualMax(env);
    const res = run(R, () => F.api_createOrder.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_setBlacklist(env, R, args) {
    const p = F.normalizePhone(args[0]);
    if (!p.valid) throw new HttpError(400, 'Numéro invalide.');
    const on = !!args[1];
    const note = String(args[2] || '');
    await loadWhere(env, R, 'archived = 0 AND phone = ?', [p.phone]);
    const res = run(R, () => {
      const user = F.currentUser_();
      const clients = F.readClients_();
      if (on) clients.blacklist[p.phone] = true; else delete clients.blacklist[p.phone];
      if (note) { clients.notes = clients.notes || {}; clients.notes[p.phone] = note; }
      R.config['cfg:clients'] = JSON.stringify(clients);
      R.configWrites['cfg:clients'] = R.config['cfg:clients'];
      F.refreshClientAlerts_(F.readOrders_(), p.phone);
      F.log_(user, '', on ? 'Liste noire : ajout' : 'Liste noire : retrait', p.phone);
      R.notes.push({ id: p.phone, kind: on ? 'blacklist:on' : 'blacklist:off', info: note });
      return { phone: p.phone, blacklisted: on };
    });
    await flush(env, R);
    return res;
  },

  async api_dashboard(env, R, args) { return dashboard(env, R, args); },
  async api_listOrders(env, R, args) { return listOrders(env, R, args[0] || {}); },

  async api_preloadPages(env, R, args) {
    const specs = Array.isArray(args[0]) ? args[0].slice(0, 6) : [];
    const out = [];
    for (const s of specs) {
      if (!s || ['api_dashboard', 'api_listOrders', 'api_queue'].indexOf(s.fn) < 0) { out.push(null); continue; }
      try {
        const R2 = newReq(R.base, R.user);
        R2.userName = R.userName;
        out.push({ data: await PAGES[s.fn](env, R2, Array.isArray(s.args) ? s.args : []) });
      } catch (e) { out.push(null); }
    }
    return out;
  },

  async api_importStatus(env, R) {
    const live = R && isLive(R);
    const last = live ? (R.base.secret['cf:lastIngest'] || '') : '';
    return {
      releasit: { found: !!live, missing: [], lastRun: last, lastError: '' },
      shopify: { configured: false },
      sms: null,
      cloud: true
    };
  },

  /* ---------------- Corbeille ---------------- */

  async api_listTrash(env, R) {
    requireAdmin(R);
    const r = await env.DB.prepare('SELECT data, deleted_at, deleted_by, reason FROM trash ORDER BY deleted_at DESC LIMIT 1000').all();
    const rows = (r.results || []).map((t) => {
      const o = JSON.parse(t.data);
      return {
        id: String(o.id), client: String(o.client || ''), phone: String(o.phone || ''), wilaya: String(o.wilaya || ''), product: String(o.product || ''),
        total: Number(F.toNumber_(o.total)) || 0, status: String(o.status || ''), date: isoOf(o.date),
        deletedAt: t.deleted_at, deletedBy: t.deleted_by, reason: t.reason
      };
    });
    const s = run(R, () => F.getSettings_());
    return { rows: rows, autoDays: s.CORBEILLE_JOURS };
  },

  async api_deleteOrder(env, R, args) {
    const r = await PAGES.api_deleteOrders(env, R, [[args[0]], args[1]]);
    if (r.skipped.length && !r.deleted.length) {
      const why = r.skipped[0].why;
      throw new HttpError(400, why === 'introuvable' ? 'Commande ' + args[0] + ' introuvable.'
        : 'Une commande envoyée à une société de livraison ne peut pas être supprimée. Annulez-la, ou annulez d’abord son colis.');
    }
    return { id: r.deleted[0], counts: r.counts, message: 'Commande ' + r.deleted[0] + ' mise à la corbeille.' };
  },

  async api_deleteOrders(env, R, args) {
    const user = requireAdmin(R, 'supprimer des commandes');
    const ids = run(R, () => F.idList_(args[0]));
    if (!ids.length) throw new HttpError(400, 'Cochez au moins une commande.');
    const why = String(args[1] == null ? '' : args[1]).trim();
    await loadWhere(env, R, 'id IN (' + placeholders(ids.length) + ')', ids);
    const out = { deleted: [], skipped: [] };
    const now = new Date().toISOString();
    run(R, () => {
      ids.forEach((id) => {
        const o = R.byId[id];
        if (!o) { out.skipped.push({ id: id, why: 'introuvable' }); return; }
        if (!F.orderRules_(o, user, null).canDelete) { out.skipped.push({ id: id, why: 'déjà envoyée à une société de livraison' }); return; }
        R.extra.push(env.DB.prepare('INSERT OR REPLACE INTO trash (id, data, deleted_at, deleted_by, reason) VALUES (?, ?, ?, ?, ?)').bind(id, JSON.stringify(plain(o)), now, user.name, why));
        R.extra.push(env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id));
        R.extra.push(env.DB.prepare('INSERT INTO changes(order_id, kind, at, info) VALUES (?, ?, ?, ?)').bind(id, 'delete', now, JSON.stringify({ by: user.name, reason: why })));
        F.log_(user, id, 'Suppression', 'Mise à la corbeille' + (why ? ' · Motif : ' + why : ''));
        out.deleted.push(id);
      });
    });
    await flush(env, R);
    let msg = F.plural_(out.deleted.length, 'commande mise', 'commandes mises') + ' à la corbeille';
    if (out.skipped.length) msg += ' · ' + F.plural_(out.skipped.length, 'ignorée', 'ignorées') + ' (' + out.skipped.slice(0, 5).map((x) => x.id + ' : ' + x.why).join(', ') + (out.skipped.length > 5 ? '…' : '') + ')';
    return { deleted: out.deleted, skipped: out.skipped, counts: await fastCounts(env), message: msg + '.' };
  },

  async api_restoreOrder(env, R, args) {
    const r = await PAGES.api_restoreOrders(env, R, [[args[0]]]);
    if (r.skipped.length) throw new HttpError(400, r.skipped[0].why);
    return { id: r.restored[0], message: 'Commande ' + r.restored[0] + ' remise dans l’onglet Commandes.' };
  },

  async api_restoreOrders(env, R, args) {
    const user = requireAdmin(R, 'restaurer une commande');
    const ids = run(R, () => F.idList_(args[0]));
    if (!ids.length) throw new HttpError(400, 'Cochez au moins une commande.');
    const any = await env.DB.prepare('SELECT COUNT(*) AS n FROM trash').first();
    if (!any || !any.n) throw new HttpError(400, 'La corbeille est vide.');
    const t = await env.DB.prepare('SELECT id, data FROM trash WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all();
    const found = {};
    (t.results || []).forEach((x) => { found[x.id] = JSON.parse(x.data); });
    const ex = await env.DB.prepare('SELECT id FROM orders WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all();
    const exists = {};
    (ex.results || []).forEach((x) => { exists[x.id] = true; });
    const out = { restored: [], skipped: [] };
    run(R, () => {
      ids.forEach((id) => {
        if (!found[id]) { out.skipped.push({ id: id, why: 'Commande ' + id + ' absente de la corbeille.' }); return; }
        if (exists[id]) { out.skipped.push({ id: id, why: 'La commande ' + id + ' est déjà dans l’onglet Commandes.' }); return; }
        F.appendOrders_(F.readOrders_(), [found[id]]);
        R.extra.push(env.DB.prepare('DELETE FROM trash WHERE id = ?').bind(id));
        F.log_(user, id, 'Restauration', 'Sortie de la corbeille');
        out.restored.push(id);
      });
    });
    await flush(env, R);
    out.message = F.plural_(out.restored.length, 'commande remise', 'commandes remises') + ' dans l’onglet Commandes' +
      (out.skipped.length ? ' · ' + F.plural_(out.skipped.length, 'ignorée', 'ignorées') : '') + '.';
    return out;
  },

  async api_purgeTrash(env, R, args) {
    const user = requireAdmin(R, 'vider la corbeille');
    const wanted = args[0] ? run(R, () => F.idList_(args[0])) : null;
    const t = wanted ? await env.DB.prepare('SELECT id FROM trash WHERE id IN (' + placeholders(wanted.length) + ')').bind(...wanted).all()
      : await env.DB.prepare('SELECT id FROM trash').all();
    const ids = (t.results || []).map((x) => x.id);
    if (!ids.length) return { purged: [], message: 'Rien à effacer.' };
    const now = new Date().toISOString();
    ids.forEach((id) => {
      R.extra.push(env.DB.prepare('INSERT OR REPLACE INTO blocked (id, at, by) VALUES (?, ?, ?)').bind(id, now, user.name));
      R.extra.push(env.DB.prepare('DELETE FROM trash WHERE id = ?').bind(id));
      R.notes.push({ id: id, kind: 'purge', info: user.name });
    });
    run(R, () => F.log_(user, '', 'Corbeille vidée', F.plural_(ids.length, 'commande effacée', 'commandes effacées') + ' pour de bon : ' + ids.slice(0, 20).join(', ') + (ids.length > 20 ? '…' : '')));
    await flush(env, R);
    return { purged: ids, message: F.plural_(ids.length, 'commande effacée', 'commandes effacées') + ' pour de bon. Leur n° reste bloqué : elles ne reviendront pas.' };
  }
};

function requireAdmin(R, what) {
  return run(R, () => {
    const user = F.currentUser_();
    if (!F.isAdmin_(user)) throw new HttpError(403, 'Seul un administrateur (onglet Équipe) peut ' + (what || 'voir la corbeille') + '.');
    return user;
  });
}

async function manualMax(env) {
  const r = await env.DB.batch([
    env.DB.prepare("SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS m FROM orders WHERE id GLOB 'M[0-9]*'"),
    env.DB.prepare("SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS m FROM trash WHERE id GLOB 'M[0-9]*'"),
    env.DB.prepare("SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS m FROM blocked WHERE id GLOB 'M[0-9]*'")
  ]);
  return Math.max(...r.map((x) => (x.results && x.results[0] && x.results[0].m) || 0));
}

/* ---------------- Étape 2 : Expédier, Suivi, SMS ---------------- */

function idsOf(list) {
  const out = [];
  (Array.isArray(list) ? list : [list]).forEach((x) => {
    const id = String(x && typeof x === 'object' ? x.id : x == null ? '' : x).trim();
    if (id && out.indexOf(id) < 0) out.push(id);
  });
  return out.slice(0, 500);
}
async function loadIds(env, R, ids) {
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    await loadWhere(env, R, 'id IN (' + placeholders(part.length) + ')', part);
  }
}
function isLive(R) { return !!(R.base && R.base.secret && R.base.secret['cf:live']); }
function needLive(R) {
  if (!isLive(R)) throw new HttpError(400, 'Pendant l’essai, Ecotrack et les SMS restent dans l’application Google (la version Cloudflare travaille sur une copie).', 'later');
}
/** Action qui touche Ecotrack ou httpSMS : jouée avec les appels, enregistrée, compteurs à jour. */
async function external(env, R, fn, opts) {
  needLive(R);
  const res = await runFetch(R, fn);
  if (opts && opts.alerts) R.extra.push(alertStatement(env, R));
  await flush(env, R);
  return withCounts(env, res);
}

Object.assign(PAGES, {
  async api_shippingList(env, R) {
    await loadWhere(env, R, "archived = 0 AND stage = 'confirmed'", []);
    if (!isLive(R)) return run(R, () => F.api_shippingList());
    return runFetch(R, () => F.api_shippingList());
  },
  async api_shipEcotrack(env, R, args) {
    await loadIds(env, R, idsOf(args[0]));
    return external(env, R, () => F.api_shipEcotrack(args[0]));
  },
  async api_labelFiles(env, R, args) {
    await loadIds(env, R, idsOf(args[0]));
    return external(env, R, () => F.api_labelFiles(args[0]));
  },
  async api_markLabelsPrinted(env, R, args) {
    await loadIds(env, R, idsOf(args[0]));
    const res = run(R, () => F.api_markLabelsPrinted(args[0]));
    await flush(env, R);
    return res;
  },
  async api_validateParcels(env, R, args) {
    await loadIds(env, R, idsOf(args[0]));
    return external(env, R, () => F.api_validateParcels(args[0], args[1]));
  },
  async api_refreshCreated(env, R) {
    await loadWhere(env, R, "archived = 0 AND stage = 'confirmed' AND tracking != ''", []);
    if (!isLive(R)) return { checked: 0, updated: 0, missing: 0, message: '' };
    return external(env, R, () => F.api_refreshCreated());
  },
  async api_cancelParcel(env, R, args) {
    await loadIds(env, R, idsOf([args[0]]));
    return external(env, R, () => F.api_cancelParcel(args[0]));
  },
  async api_ecotrackSyncStatuses(env, R) {
    await loadWhere(env, R, 'archived = 0 AND track = 1', []);
    return external(env, R, () => F.api_ecotrackSyncStatuses(), { alerts: true });
  },
  async api_trackingOverview(env, R, args) {
    const days = [7, 30, 90].indexOf(Number(args[0])) >= 0 ? Number(args[0]) : 30;
    const since = new Date(Date.now() - (days + 1) * 86400000).toISOString();
    await loadMany(env, R, [['archived = 0 AND track = 1', []], ["archived = 0 AND stage IN ('delivered', 'returned') AND updated >= ?", [since]]]);
    const res = run(R, () => F.api_trackingOverview(days));
    R.extra.push(alertStatement(env, R));
    await flush(env, R);
    return res;
  },
  async api_parcelHistory(env, R, args) {
    await loadIds(env, R, idsOf([args[0]]));
    return external(env, R, () => F.api_parcelHistory(args[0]));
  },
  async api_followUpResult(env, R, args) {
    await loadIds(env, R, idsOf([args[0]]));
    const o = R.byId[String(args[0])];
    const pq = o ? phoneQuery(phonesOf([o.phone])) : null;
    await loadMany(env, R, [['archived = 0 AND track = 1', []]].concat(pq ? [pq] : []));
    return external(env, R, () => F.api_followUpResult(args[0], args[1], args[2]), { alerts: true });
  },
  async api_markFollowUp(env, R, args) {
    await loadWhere(env, R, 'archived = 0 AND track = 1', []);
    await loadIds(env, R, idsOf([args[0]]));
    const res = run(R, () => F.api_markFollowUp(args[0]));
    R.extra.push(alertStatement(env, R));
    await flush(env, R);
    return res;
  },
  async api_markReturnDamaged(env, R, args) {
    await loadIds(env, R, idsOf([args[0]]));
    const res = run(R, () => F.api_markReturnDamaged(args[0]));
    await flush(env, R);
    return res;
  },
  async api_smsSendNow(env, R) {
    await loadSmsOrders(env, R);
    return external(env, R, () => F.api_smsSendNow());
  },
  async api_releasitTransfer() { return { added: 0, message: 'Les commandes Releasit arrivent par le classeur Google, chaque minute.' }; },
  async api_shopifyImport() { return { imported: 0, message: 'Les commandes Shopify arrivent par le classeur Google, toutes les 5 minutes.' }; }
});

/** Commandes des SMS en attente (le texte se remplit avec la commande). */
async function loadSmsOrders(env, R) {
  let q = [];
  try { q = JSON.parse(R.props.SMS_QUEUE || '[]'); } catch (e) { q = []; }
  await loadIds(env, R, idsOf(q.map((x) => x && x.i)));
  return q.length;
}

/* ---------------- Tâches automatiques (chaque minute) ---------------- */

async function cron(env) {
  const base = await loadBase(env);
  if (!base.secret['cf:live']) return { live: false };
  const robot = { email: '' };
  const out = {};
  const settings = (() => { try { return JSON.parse(base.config['cfg:settings'] || '{}'); } catch (e) { return {}; } })();
  // 1. SMS en attente.
  try {
    const R = newReq(base, robot);
    if (await loadSmsOrders(env, R)) {
      out.sms = await runFetch(R, () => F.sendSmsQueue_({}));
      await flush(env, R);
    }
  } catch (e) { out.smsError = String(e && e.message ? e.message : e); }
  // 2. Statuts Ecotrack (toutes les SUIVI_ECOTRACK_MINUTES minutes).
  const every = Number(settings.SUIVI_ECOTRACK_MINUTES) || 60;
  const last = Date.parse(base.secret['cf:ecoLast'] || '') || 0;
  if (Date.now() - last >= every * 60000 - 30000) {
    const R = newReq(base, robot);
    try {
      await loadWhere(env, R, 'archived = 0 AND track = 1', []);
      out.ecotrack = await runFetch(R, () => F.syncEcotrackStatuses_());
      R.extra.push(alertStatement(env, R));
    } catch (e) { out.ecotrackError = String(e && e.message ? e.message : e); }
    R.extra.push(env.DB.prepare("INSERT INTO kv (key, value) VALUES ('cf:ecoLast', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(new Date().toISOString()));
    await flush(env, R);
  }
  // 3. Entretien de nuit (vers 3 h, heure d'Algérie) : appels sans réponse, corbeille, Journal.
  const today = F.ymd_(new Date());
  const hour = new Date(Date.now() + 3600000).getUTCHours(); // heure d'Algérie (UTC+1)
  if (hour >= 3 && base.secret['cf:nightDay'] !== today) {
    const R = newReq(base, robot);
    await loadWhere(env, R, 'archived = 0 AND status IN (?, ?)', [S.NO_ANSWER, S.UNREACHABLE]);
    out.autoCancelled = run(R, () => F.autoCancelUnreachable_());
    const now = Date.now();
    const trashDays = Number(settings.CORBEILLE_JOURS) || 0;
    if (trashDays > 0) {
      const cut = new Date(now - trashDays * 86400000).toISOString();
      R.extra.push(env.DB.prepare("INSERT OR REPLACE INTO blocked (id, at, by) SELECT id, ?, 'Automatique' FROM trash WHERE deleted_at < ?").bind(new Date().toISOString(), cut));
      R.extra.push(env.DB.prepare('DELETE FROM trash WHERE deleted_at < ?').bind(cut));
    }
    const journalDays = Number(settings.JOURNAL_JOURS) || 0;
    if (journalDays > 0) R.extra.push(env.DB.prepare('DELETE FROM journal WHERE at < ?').bind(new Date(now - journalDays * 86400000).toISOString()));
    R.extra.push(env.DB.prepare('DELETE FROM changes WHERE at < ?').bind(new Date(now - 30 * 86400000).toISOString()));
    R.extra.push(env.DB.prepare("INSERT INTO kv (key, value) VALUES ('cf:nightDay', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(today));
    await flush(env, R);
  }
  return out;
}

/* ---------------- Tableau de bord (comptes faits par la base) ---------------- */

async function dashboard(env, R, args) {
  const period = String(args[0] || '7');
  const range = run(R, () => F.periodRange_(period, args[1], args[2]));
  const settings = run(R, () => F.getSettings_());
  const db = env.DB;
  const where = range.all ? "day <= ?" : 'archived = 0 AND day >= ? AND day <= ?';
  const wb = range.all ? [range.to] : [range.from, range.to];
  const now = new Date();
  const endOfDay = new Date(F.startOfDay_(now).getTime() + 86400000).toISOString();
  const nowIso = now.toISOString();
  const longAgo = new Date(now.getTime() - settings.ATTENTE_MAX_HEURES * 3600000).toISOString();
  const confirmed = K.CONFIRMED_STATUSES;
  const shipped = K.SHIPPED_STATUSES;
  const sparkFrom = F.addDayDays_(F.ymd_(now), -6);
  const group = (col, extra, limit) => db.prepare(
    'SELECT CASE WHEN TRIM(' + col + ") = '' THEN '—' ELSE " + col + ' END AS name, COUNT(*) AS orders, ' +
    'SUM(CASE WHEN status IN (' + placeholders(confirmed.length) + ') THEN 1 ELSE 0 END) AS confirmed, ' +
    "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS returned, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS cancelled " +
    // À égalité, l'ordre d'arrivée (comme la version Google : première commande vue d'abord).
    'FROM orders WHERE ' + where + extra[0] + ' GROUP BY name ORDER BY orders DESC, MIN(CASE WHEN archived = 1 THEN 1000000000 ELSE seq END) ASC LIMIT ' + limit
  ).bind(...confirmed, S.DELIVERED, S.RETURNED, S.CANCELLED, ...wb, ...extra[1]);

  const [byStatus, transit, todo, byWilaya, byAgent, byProduct, spark] = await db.batch([
    db.prepare('SELECT status, COUNT(*) AS n, SUM(total) AS t FROM orders WHERE ' + where + ' GROUP BY status').bind(...wb),
    db.prepare("SELECT COUNT(*) AS n, SUM(total) AS t FROM orders WHERE archived = 0 AND stage = 'transit'"),
    db.prepare('SELECT ' +
      'SUM(CASE WHEN status IN (' + placeholders(QUEUE.length) + ") AND (callback = '' OR callback <= ?) THEN 1 ELSE 0 END) AS due, " +
      'SUM(CASE WHEN status IN (' + placeholders(QUEUE.length) + ") AND callback > ? AND callback < ? THEN 1 ELSE 0 END) AS today, " +
      'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS toShip, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS unreachable, ' +
      "SUM(CASE WHEN status = ? AND COALESCE(json_extract(data, '$.attempts'), 0) IN (0, '') AND date != '' AND date < ? THEN 1 ELSE 0 END) AS waitingLong " +
      "FROM orders WHERE archived = 0 AND stage IN ('todo', 'confirmed')")
      .bind(...QUEUE, nowIso, ...QUEUE, nowIso, endOfDay, S.CONFIRMED, S.UNREACHABLE, S.TO_CONFIRM, longAgo),
    group('wilaya', [' AND status IN (' + placeholders(shipped.length) + ')', shipped], 10),
    group('agent', [" AND TRIM(agent) != '' AND status NOT IN (" + placeholders(QUEUE.length) + ')', QUEUE], 10),
    group('product', ['', []], 8),
    db.prepare('SELECT day, COUNT(*) AS received, SUM(CASE WHEN status IN (' + placeholders(confirmed.length) + ') THEN 1 ELSE 0 END) AS confirmed, ' +
      'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status = ? THEN total ELSE 0 END) AS revenue ' +
      'FROM orders WHERE archived = 0 AND day >= ? GROUP BY day').bind(...confirmed, S.DELIVERED, S.DELIVERED, sparkFrom)
  ]);

  const count = {};
  let received = 0;
  let revenueDelivered = 0;
  (byStatus.results || []).forEach((r) => {
    count[r.status] = r.n;
    received += r.n;
    if (r.status === S.DELIVERED) revenueDelivered = r.t || 0;
  });
  const sum = (list) => list.reduce((a, s) => a + (count[s] || 0), 0);
  const waiting = sum(QUEUE);
  const t = (todo.results && todo.results[0]) || {};
  const tr = (transit.results && transit.results[0]) || {};
  const keys = [];
  for (let i = 6; i >= 0; i--) keys.push(F.addDayDays_(F.ymd_(now), -i));
  const sp = { received: [0, 0, 0, 0, 0, 0, 0], confirmed: [0, 0, 0, 0, 0, 0, 0], delivered: [0, 0, 0, 0, 0, 0, 0], revenue: [0, 0, 0, 0, 0, 0, 0] };
  (spark.results || []).forEach((r) => {
    const i = keys.indexOf(r.day);
    if (i < 0) return;
    sp.received[i] = r.received; sp.confirmed[i] = r.confirmed; sp.delivered[i] = r.delivered; sp.revenue[i] = r.revenue || 0;
  });
  const clean = (rows) => (rows.results || []).map((r) => ({ name: r.name, orders: r.orders, confirmed: r.confirmed, delivered: r.delivered, returned: r.returned, cancelled: r.cancelled }));
  return {
    period: args[1] && args[2] ? 'custom' : period,
    range: { from: range.from, to: range.to, all: !!range.all },
    received: received,
    waiting: waiting,
    decided: received - waiting,
    confirmed: sum(confirmed),
    shipped: sum(shipped),
    delivered: count[S.DELIVERED] || 0,
    returned: count[S.RETURNED] || 0,
    cancelled: count[S.CANCELLED] || 0,
    unreachable: count[S.UNREACHABLE] || 0,
    revenueDelivered: revenueDelivered,
    inTransitAmount: tr.t || 0,
    inTransitCount: tr.n || 0,
    todo: {
      toConfirm: t.due || 0, callbacksToday: t.today || 0, toShip: t.toShip || 0, unreachable: t.unreachable || 0,
      waitingLong: t.waitingLong || 0, parcelAlerts: 0, stockLow: 0
    },
    byWilaya: clean(byWilaya),
    byAgent: clean(byAgent),
    byProduct: clean(byProduct),
    spark: sp,
    generatedAt: now.toISOString()
  };
}

/* ---------------- Liste des commandes (recherche faite par la base) ---------------- */

async function listOrders(env, R, filter) {
  const db = env.DB;
  const conds = ['archived = 0'];
  const binds = [];
  const period = String(filter.period || '30');
  if (period !== 'all') {
    const since = run(R, () => {
      const d = F.periodStart_(period, new Date()); // minuit à l'heure d'Algérie
      return d ? F.ymd_(d) : '';
    });
    if (since) { conds.push('day >= ?'); binds.push(since); }
  }
  if (filter.wilaya) {
    const code = run(R, () => F.wilayaCode_(filter.wilaya));
    if (code) { conds.push("(wilaya LIKE ? OR wilaya = ?)"); binds.push(('0' + code).slice(-2) + ' -%', String(filter.wilaya)); }
  }
  const qText = String(filter.q || '').trim();
  if (qText) {
    const qn = F.normalizeText_(qText);
    const digits = qText.replace(/\D/g, '');
    const parts = [];
    if (qn) { parts.push('search LIKE ?'); binds.push('%' + qn + '%'); }
    parts.push('search LIKE ?'); binds.push('%' + qText.toLowerCase() + '%');
    if (digits.length >= 4) { parts.push('search LIKE ?'); binds.push('%' + digits + '%'); }
    conds.push('(' + parts.join(' OR ') + ')');
  }
  const base = conds.join(' AND ');
  const status = String(filter.status || 'all');
  const limit = Math.min(Math.max(Math.round(Number(filter.limit)) || 100, 1), 1000);
  let rowWhere = base;
  const rowBinds = binds.slice();
  if (status === 'queue') { rowWhere += ' AND status IN (' + placeholders(QUEUE.length) + ')'; rowBinds.push(...QUEUE); }
  else if (status === 'todo') { rowWhere += " AND stage = 'todo'"; }
  else if (status !== 'all') { rowWhere += ' AND status = ?'; rowBinds.push(status); }
  const [cnt, rows] = await db.batch([
    db.prepare('SELECT status, stage, COUNT(*) AS n FROM orders WHERE ' + base + ' GROUP BY status, stage').bind(...binds),
    db.prepare('SELECT id, rev, data FROM orders WHERE ' + rowWhere + ' ORDER BY date DESC, seq DESC LIMIT ?').bind(...rowBinds, limit)
  ]);
  const counts = { all: 0, queue: 0, todo: 0 };
  (cnt.results || []).forEach((r) => {
    const key = r.status || '—';
    counts[key] = (counts[key] || 0) + r.n;
    counts.all += r.n;
    if (QUEUE.indexOf(r.status) >= 0) counts.queue += r.n;
    if (r.stage === 'todo') counts.todo += r.n;
  });
  const total = status === 'all' ? counts.all : status === 'queue' ? counts.queue : status === 'todo' ? counts.todo : (counts[status] || 0);
  const list = (rows.results || []).map(toOrder);
  const out = run(R, () => list.map((o) => F.serializeOrder_(o)));
  const res = { rows: out, total: total, counts: counts, arrived: 0 };
  if (filter.withStatus) res.importStatus = await PAGES.api_importStatus(env, R);
  return res;
}

/* ================================================================ */
/* Pont avec Apps Script (clé partagée)                             */
/* ================================================================ */

async function bridge(request, env, path) {
  const db = env.DB;
  const kv = await db.prepare("SELECT key, value FROM kv WHERE key LIKE 'cf:%'").all();
  const cf = {};
  (kv.results || []).forEach((r) => { cf[r.key] = r.value; });
  const given = request.headers.get('x-dz-key') || '';
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

  if (path === '/bridge/register') {
    const secret = String(body.secret || '');
    if (secret.length < 32) throw new HttpError(400, 'Clé trop courte.');
    // Premier contact : la clé est enregistrée. Ensuite, seule l'ancienne clé permet d'en changer.
    if (cf['cf:secret'] && !sameText(given, cf['cf:secret'])) throw new HttpError(403, 'Cette application Cloudflare est déjà reliée à un autre classeur.');
    await db.batch([
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:secret', secret),
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:gateway', String(body.gateway || '')),
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:shop', String(body.shop || ''))
    ]);
    return { ok: true };
  }
  if (!cf['cf:secret'] || !sameText(given, cf['cf:secret'])) throw new HttpError(403, 'Clé refusée.');

  if (path === '/bridge/status') {
    const r = await db.batch([
      db.prepare('SELECT COUNT(*) AS n FROM orders WHERE archived = 0'),
      db.prepare('SELECT COUNT(*) AS n FROM orders WHERE archived = 1'),
      db.prepare('SELECT COUNT(*) AS n FROM trash'),
      db.prepare("SELECT value FROM kv WHERE key = 'cf:imported'")
    ]);
    return { orders: r[0].results[0].n, archived: r[1].results[0].n, trash: r[2].results[0].n, importedAt: r[3].results[0] ? r[3].results[0].value : '', live: !!cf['cf:live'] };
  }

  /* ---------------- Étape 2 : pont continu (après le basculement) ---------------- */

  // Basculement : la version Cloudflare devient la vraie (Ecotrack, SMS, tâches automatiques).
  if (path === '/bridge/live') {
    const st = [];
    if (body.reset) {
      ['orders', 'trash', 'blocked', 'changes', 'journal', 'guard'].forEach((t) => st.push(db.prepare('DELETE FROM ' + t)));
      st.push(db.prepare("DELETE FROM kv WHERE key NOT LIKE 'cf:%'"));
    }
    st.push(body.live === false ? db.prepare("DELETE FROM kv WHERE key = 'cf:live'")
      : db.prepare("INSERT INTO kv (key, value) VALUES ('cf:live', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(new Date().toISOString()));
    await db.batch(st);
    const m = await db.prepare('SELECT COALESCE(MAX(seq), 0) AS m FROM changes').first();
    return { live: body.live !== false, seq: m.m };
  }

  // Réglages et clés (Ecotrack, SMS) envoyés par Apps Script quand ils changent.
  if (path === '/bridge/config') {
    const allowed = ['ECOTRACK_URL', 'ECOTRACK_TOKEN', 'SMS_API_KEY', 'SMS_FROM', 'OWNER_EMAIL'];
    const st = [];
    Object.keys(body.config || {}).forEach((k) => {
      if (k.indexOf('cfg:') !== 0) return;
      st.push(db.prepare('INSERT INTO config (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
        .bind(k, String(body.config[k]), new Date().toISOString()));
    });
    Object.keys(body.props || {}).forEach((k) => {
      if (allowed.indexOf(k) < 0) return;
      const v = body.props[k];
      st.push(v === null || v === '' ? db.prepare('DELETE FROM kv WHERE key = ?').bind(k)
        : db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, String(v)));
    });
    if (body.dropCache) st.push(db.prepare("DELETE FROM kv WHERE key LIKE 'cache:%'"));
    if (st.length) await db.batch(st);
    return { ok: true, written: st.length };
  }

  // Nouvelles commandes (Releasit, Shopify) déjà préparées par Apps Script : ajoutées si elles n'existent pas.
  if (path === '/bridge/orders') {
    const list = (body.orders || []).filter((o) => o && String(o.id || '').trim());
    if (!list.length) return { added: [] };
    const ids = list.map((o) => String(o.id).trim());
    const known = {};
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      const ph = placeholders(part.length);
      const r = await db.batch([
        db.prepare('SELECT id FROM orders WHERE id IN (' + ph + ')').bind(...part),
        db.prepare('SELECT id FROM trash WHERE id IN (' + ph + ')').bind(...part),
        db.prepare('SELECT id FROM blocked WHERE id IN (' + ph + ')').bind(...part)
      ]);
      r.forEach((x) => (x.results || []).forEach((y) => { known[y.id] = true; }));
    }
    const fresh = list.filter((o) => !known[String(o.id).trim()]);
    const st = [];
    const now = new Date().toISOString();
    if (fresh.length) {
      const rows = fresh.map((o) => { const r = rowOf(o); r.archived = 0; return r; });
      const cols = ['id', 'archived'].concat(ROW_COLS);
      st.push(db.prepare('INSERT OR IGNORE INTO orders (rev, seq, ' + cols.join(', ') + ') SELECT 0, (SELECT COALESCE(MAX(seq), 0) FROM orders) + key + 1, ' +
        cols.map((c) => "json_extract(value, '$." + c + "')").join(', ') + ' FROM json_each(?)').bind(JSON.stringify(rows)));
    }
    st.push(db.prepare("INSERT INTO kv (key, value) VALUES ('cf:lastIngest', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(now));
    await db.batch(st);
    return { added: fresh.map((o) => String(o.id).trim()), skipped: list.length - fresh.length };
  }

  // Changements à recopier dans le classeur, dans l'ordre (seq).
  if (path === '/bridge/changes') {
    const after = Number(body.after) || 0;
    const limit = Math.min(Math.max(Number(body.limit) || 300, 1), 500);
    const ch = await db.prepare('SELECT seq, order_id, kind, info FROM changes WHERE seq > ? ORDER BY seq LIMIT ?').bind(after, limit).all();
    const rows = ch.results || [];
    const ids = [];
    rows.forEach((r) => { if (/^(insert|update)$/.test(r.kind) && ids.indexOf(r.order_id) < 0) ids.push(r.order_id); });
    const data = {};
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      const r = await db.prepare('SELECT id, data FROM orders WHERE id IN (' + placeholders(part.length) + ')').bind(...part).all();
      (r.results || []).forEach((x) => { data[x.id] = JSON.parse(x.data); });
    }
    // Une commande changée plusieurs fois n'est envoyée qu'une fois (son état actuel).
    const seen = {};
    const out = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const k = r.kind + '|' + r.order_id;
      if (/^(insert|update)$/.test(r.kind)) { if (seen['o|' + r.order_id]) continue; seen['o|' + r.order_id] = true; }
      else if (seen[k]) continue;
      seen[k] = true;
      out.unshift({ seq: r.seq, id: r.order_id, kind: r.kind, info: r.info || '', order: data[r.order_id] || null });
    }
    return { changes: out, last: rows.length ? rows[rows.length - 1].seq : after, more: rows.length === limit };
  }

  // Marques de stock posées par Apps Script (Sorti, Rentré, Abîmé…) : la commande ne repart pas dans les changements.
  if (path === '/bridge/marks') {
    const marks = (body.marks || []).filter((m) => m && m.id);
    const st = marks.map((m) => db.prepare("UPDATE orders SET rev = rev + 1, data = json_set(data, '$.stockMove', ?) WHERE id = ?").bind(String(m.stockMove || ''), String(m.id)));
    if (st.length) await db.batch(st);
    return { marked: st.length };
  }

  if (path === '/bridge/import') {
    const st = [];
    // Après le basculement, la base est la vraie : une recopie depuis le classeur l'écraserait.
    if (body.reset && cf['cf:live'] && !body.goLive) throw new HttpError(409, 'La version Cloudflare est la vraie application : la recopie depuis le classeur est désactivée.');
    if (body.reset) {
      ['orders', 'trash', 'blocked', 'changes', 'journal', 'guard'].forEach((t) => st.push(db.prepare('DELETE FROM ' + t)));
      st.push(db.prepare("DELETE FROM kv WHERE key NOT LIKE 'cf:%'"));
    }
    Object.keys(body.config || {}).forEach((k) => {
      st.push(db.prepare('INSERT INTO config (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
        .bind(k, String(body.config[k]), new Date().toISOString()));
    });
    Object.keys(body.kv || {}).forEach((k) => {
      if (k.indexOf('cf:') === 0) return;
      st.push(db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, String(body.kv[k])));
    });
    // Toutes les commandes du paquet en une seule instruction (json_each) : D1 limite le nombre d'instructions par requête.
    const rows = [];
    (body.orders || []).forEach((o, i) => { const r = rowOf(o); if (r.id) { r.seq = (Number(body.seqFrom) || 0) + i + 1; r.archived = 0; rows.push(r); } });
    (body.archive || []).forEach((o) => { const r = rowOf(o); if (r.id) { r.seq = 0; r.archived = 1; rows.push(r); } });
    if (rows.length) {
      const cols = ['id', 'seq', 'archived'].concat(ROW_COLS);
      st.push(db.prepare('INSERT OR REPLACE INTO orders (rev, ' + cols.join(', ') + ') SELECT 0, ' +
        cols.map((c) => "json_extract(value, '$." + c + "')").join(', ') + ' FROM json_each(?)').bind(JSON.stringify(rows)));
    }
    const trash = (body.trash || []).filter((t) => t && t.order && t.order.id).map((t) => ({
      id: String(t.order.id), data: JSON.stringify(plain(t.order)), at: isoOf(t.deletedAt) || new Date().toISOString(), by: String(t.deletedBy || ''), reason: String(t.reason || '')
    }));
    if (trash.length) {
      st.push(db.prepare("INSERT OR REPLACE INTO trash (id, data, deleted_at, deleted_by, reason) SELECT json_extract(value, '$.id'), json_extract(value, '$.data'), " +
        "json_extract(value, '$.at'), json_extract(value, '$.by'), json_extract(value, '$.reason') FROM json_each(?)").bind(JSON.stringify(trash)));
    }
    const blocked = (body.blocked || []).filter((id) => id).map((id) => String(id));
    if (blocked.length) {
      st.push(db.prepare("INSERT OR REPLACE INTO blocked (id, at, by) SELECT value, ?, 'Import' FROM json_each(?)").bind(new Date().toISOString(), JSON.stringify(blocked)));
    }
    if (body.done) st.push(db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:imported', new Date().toISOString()));
    if (st.length) await db.batch(st);
    return { ok: true, written: st.length };
  }
  throw new HttpError(404, 'Inconnu.');
}

/* ================================================================ */
/* Point d'entrée                                                   */
/* ================================================================ */

async function api(request, env, fn) {
  if (request.method !== 'POST') throw new HttpError(405, 'Méthode non permise.');
  const base = await loadBase(env);
  const auth = request.headers.get('authorization') || '';
  const user = await verifyToken(auth.replace(/^Bearer\s+/i, ''), base.secret['cf:secret']);
  if (!user) throw new HttpError(401, 'Connexion expirée : reconnectez-vous.', 'auth');
  const R = newReq(base, user);
  // Seuls les membres de l'onglet Équipe (et le propriétaire du classeur) entrent.
  const owner = String(base.props.OWNER_EMAIL || '').toLowerCase();
  const team = run(R, () => F.readTeam_());
  if (user.email !== owner && !team.some((t) => t[0] === user.email)) {
    throw new HttpError(403, 'Votre adresse n’est pas dans l’onglet Équipe du classeur. Demandez à l’administrateur de vous ajouter.', 'auth');
  }
  R.userName = userName(R);
  const handler = PAGES[fn];
  if (!handler) throw new HttpError(404, 'Cette page n’est pas encore dans la version Cloudflare (étape 2).', 'later');
  let args = [];
  try { args = await request.json(); } catch (e) { args = []; }
  if (!Array.isArray(args)) args = [];
  return handler(env, R, args);
}

/** L'interface : une seule page, intégrée au moteur ; le navigateur la garde et vérifie si elle a changé. */
function page(request) {
  const path = new URL(request.url).pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Méthode non permise.', { status: 405 });
  if (path !== '/' && path !== '/index.html') return new Response('Introuvable.', { status: 404 });
  const etag = '"' + INDEX_TAG + '"';
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', etag: etag, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: headers });
  return new Response(request.method === 'HEAD' ? null : INDEX_HTML, { headers: headers });
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cron(env).catch(() => {}));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/auth/info') {
        const r = await env.DB.prepare("SELECT key, value FROM kv WHERE key IN ('cf:gateway', 'cf:shop', 'cf:imported')").all();
        const kv = {};
        (r.results || []).forEach((x) => { kv[x.key] = x.value; });
        return json({ ok: true, data: { gateway: kv['cf:gateway'] || '', shop: kv['cf:shop'] || 'DZ Smart Shop', ready: !!kv['cf:imported'], version: K.APP_VERSION } });
      }
      if (path.indexOf('/api/') === 0) return json({ ok: true, data: await api(request, env, path.slice(5)) });
      if (path.indexOf('/bridge/') === 0) return json({ ok: true, data: await bridge(request, env, path) });
      return page(request);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const code = e instanceof HttpError ? e.code : '';
      // Erreurs de l'outil (« déjà traitée »…) et pages pas encore portées : réponse normale (200) avec ok: false.
      const http = !(e instanceof HttpError) || code === 'later' ? 200 : status;
      return json({ ok: false, error: String(e && e.message ? e.message : e), code: code }, http);
    }
  }
};

export { stageOf, rowOf, plain, hmac, b64urlText, verifyToken, cron, smsQueueStatement };
