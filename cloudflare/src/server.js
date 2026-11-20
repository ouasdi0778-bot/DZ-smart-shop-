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
const TAB_PART = 250; // lignes par paquet d'onglet (même valeur que TAB_PART_ dans gas-shim.js)
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
  Object.defineProperty(o, '__day', { value: row.day || '', writable: true, enumerable: false }); // jour avant modification (résumés par jour)
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
    env.DB.prepare("SELECT key, value FROM kv WHERE key NOT LIKE 'big:%'") // big:… : gros contenus, lus à la demande
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
  return { config, props, secret, cache, full: !!secret['cf:full'] };
}

function newReq(base, user) {
  return {
    now: new Date(), user: user, config: Object.assign({}, base.config), props: Object.assign({}, base.props), propWrites: {},
    cache: Object.assign({}, base.cache || {}), cacheWrites: {},
    orders: [], byId: {}, raw: {}, dirty: {}, inserts: [], journal: [], configWrites: {}, configDrop: {}, extra: [], notes: [],
    trashIds: null, archived: [], manualMax: 0,
    fetched: {}, fetchUsed: {}, needFetch: null, needTabs: null, base: base,
    // Étape 3 : onglets gardés dans D1 (lus à la demande), mouvements de stock, résumés par jour.
    full: !!base.full, tabStore: base.full ? {} : null, tabs: {}, moveRows: [], moves: [], days: {}, labelRows: null,
    editors: parseList(base.secret && base.secret['cf:editors']), cfInfo: cfInfo(base), healthSummary: null, rebuildDays: false
  };
}
function parseList(text) { try { const v = JSON.parse(text || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; } }
/** Ce que la version Cloudflare sait du lien avec le classeur (page Administration). */
function cfInfo(base) {
  const s = base.secret || {};
  const gw = s['cf:gateway'] || '';
  return { live: s['cf:live'] || '', full: s['cf:full'] || '', bridgeAt: s['cf:bridgeAt'] || '', lastIngest: s['cf:lastIngest'] || '',
    google: gw ? gw + (gw.indexOf('?') >= 0 ? '&' : '?') + 'google=1' : '' };
}

/* ---------------- Rejeu : appels extérieurs et onglets lus à la demande ---------------- */

/** État de la requête avant une action (pour la rejouer à l'identique). */
function snapshot(R) {
  return {
    orders: R.orders.map((o) => {
      const id = String(o.id);
      const changed = !!R.dirty[id] || !!o.__new;
      return { id: id, rev: o.__rev, day: o.__day, data: !changed && R.raw[id] ? R.raw[id] : JSON.stringify(o), isNew: !!o.__new, dirty: !!R.dirty[id] };
    }),
    props: Object.assign({}, R.props), propWrites: Object.assign({}, R.propWrites),
    cache: Object.assign({}, R.cache), cacheWrites: Object.assign({}, R.cacheWrites),
    config: Object.assign({}, R.config), configWrites: Object.assign({}, R.configWrites), configDrop: Object.assign({}, R.configDrop),
    journal: R.journal.slice(), extra: R.extra.slice(), notes: R.notes.slice(), moveRows: R.moveRows.slice(),
    tabs: cloneTabs(R.tabs)
  };
}
function cloneTabs(tabs) {
  const out = {};
  Object.keys(tabs).forEach((n) => {
    const t = tabs[n];
    out[n] = Object.assign({}, t, { rows: t.own ? t.rows.map((r) => r.slice()) : t.rows, dirty: Object.assign({}, t.dirty) });
  });
  return out;
}
function restore(R, s) {
  R.orders = []; R.byId = {}; R.dirty = {}; R.inserts = [];
  s.orders.forEach((x) => {
    const o = toOrder({ rev: x.rev, day: x.day, data: x.data });
    if (x.isNew) { Object.defineProperty(o, '__new', { value: true, enumerable: false, writable: true }); R.inserts.push(o); }
    R.byId[x.id] = o;
    R.orders.push(o);
    if (x.dirty) R.dirty[x.id] = o;
  });
  R.props = Object.assign({}, s.props); R.propWrites = Object.assign({}, s.propWrites);
  R.cache = Object.assign({}, s.cache); R.cacheWrites = Object.assign({}, s.cacheWrites);
  R.config = Object.assign({}, s.config); R.configWrites = Object.assign({}, s.configWrites); R.configDrop = Object.assign({}, s.configDrop);
  R.journal = s.journal.slice(); R.extra = s.extra.slice(); R.notes = s.notes.slice(); R.moveRows = s.moveRows.slice();
  R.tabs = cloneTabs(s.tabs);
}

/**
 * Exécute une fonction de l'outil. Si elle a besoin d'un appel extérieur (Ecotrack, httpSMS) ou d'un
 * onglet pas encore lu (étape 3), elle s'arrête : l'appel est fait (ou l'onglet lu dans D1), puis
 * l'action est rejouée depuis le début, avec tout tel que c'était. Seul le dernier passage compte.
 * Après l'action, les réglages touchés (onglets Paramètres, Produits…) sont recalculés.
 */
async function exec(env, R, fn) {
  const before = snapshot(R);
  for (let attempt = 0; attempt < 40; attempt++) {
    if (attempt) restore(R, before);
    R.fetchUsed = {}; R.needFetch = null; R.needTabs = null;
    let result;
    let error = null;
    APP.begin(R);
    try {
      result = fn();
      if (R.full) F.cfRefreshConfig_();
    } catch (e) { error = e; } finally { APP.end(); }
    if (R.needTabs) { await loadTabs(env, R, R.needTabs); continue; }
    if (R.needFetch) { await doFetches(R.needFetch, R.fetched); continue; }
    if (error) throw error;
    return result;
  }
  throw new Error('Trop d’appels extérieurs pour une seule action : réessayez.');
}

/** Lit des onglets dans D1 (étape 3) ; un onglet absent est noté comme tel. */
async function loadTabs(env, R, names) {
  const want = names.filter((n) => !R.tabStore[n]);
  if (!want.length) return;
  const r = await env.DB.prepare('SELECT name, part, rev, rows FROM tabs WHERE name IN (' + placeholders(want.length) + ') ORDER BY name, part').bind(...want).all();
  want.forEach((n) => { R.tabStore[n] = { exists: false, rows: [], revs: {}, parts: 0 }; });
  (r.results || []).forEach((x) => {
    const t = R.tabStore[x.name];
    t.exists = true;
    t.revs[x.part] = x.rev;
    t.parts = Math.max(t.parts, x.part + 1);
    const rows = JSON.parse(x.rows).map((line) => line.map(F.cfCellIn_));
    for (let i = 0; i < rows.length; i++) t.rows[x.part * TAB_PART + i] = rows[i];
  });
  want.forEach((n) => { const t = R.tabStore[n]; for (let i = 0; i < t.rows.length; i++) if (!t.rows[i]) t.rows[i] = []; });
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

function addRows(R, rows) {
  (rows || []).forEach((row) => {
    if (R.byId[String(row.id)]) return;
    R.raw[String(row.id)] = row.data;
    addOrders(R, [toOrder(row)]);
  });
}

async function loadWhere(env, R, where, binds) {
  const r = await env.DB.prepare('SELECT id, rev, day, data FROM orders WHERE ' + where).bind(...(binds || [])).all();
  addRows(R, r.results);
}

/** Plusieurs lectures en un seul aller-retour. */
async function loadMany(env, R, queries) {
  if (!queries.length) return;
  const res = await env.DB.batch(queries.map((q) => env.DB.prepare('SELECT id, rev, day, data FROM orders WHERE ' + q[0]).bind(...(q[1] || []))));
  res.forEach((r) => addRows(R, r.results));
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

/** Exécute une fonction de l'outil (synchrone) sur les commandes chargées, sans appel extérieur ni onglet à lire. */
function run(R, fn) {
  R.needTabs = null; R.needFetch = null;
  APP.begin(R);
  try {
    return fn();
  } catch (e) {
    if (R.needTabs || R.needFetch) throw new Error('Action à rejouer (onglet ou appel extérieur) : ' + (R.needTabs || []).join(', '));
    throw e;
  } finally { APP.end(); }
}

/**
 * Changements à recopier dans le classeur Google (onglet Commandes…) : pas en mode relais (v1.11),
 * où Apps Script ne fait plus que lire l'onglet RELEASIT (voir Relais.gs) : rien ne les lirait.
 */
function recopy(R) { return !(R && R.base && R.base.secret && R.base.secret['cf:relay']); }

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
    if (recopy(R)) st.push(db.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(id, 'update', now));
  });
  R.inserts.forEach((o) => {
    const row = rowOf(o);
    st.push(db.prepare('INSERT INTO orders (id, rev, seq, ' + ROW_COLS.join(', ') + ') VALUES (?, 0, (SELECT COALESCE(MAX(seq), 0) + 1 FROM orders), ' + placeholders(ROW_COLS.length) + ')')
      .bind(row.id, ...ROW_COLS.map((c) => row[c])));
    if (recopy(R)) st.push(db.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(row.id, 'insert', now));
  });
  R.extra.forEach((s) => st.push(s));
  // Autres changements à recopier dans le classeur (liste noire, client signalé…).
  if (recopy(R)) R.notes.forEach((n) => st.push(db.prepare('INSERT INTO changes(order_id, kind, at, info) VALUES (?, ?, ?, ?)').bind(String(n.id), n.kind, now, String(n.info || ''))));
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
  if (tabStatements(db, R, st, now)) guarded = true;
  // Mouvements de stock (étape 3) : ajoutés à la table moves, recopiés dans l'onglet « Mouvements stock ».
  if (R.moveRows.length) {
    const rows = R.moveRows.map((r) => r.map(F.cfCellOut_));
    st.push(db.prepare("INSERT INTO moves (at, row) SELECT ?, value FROM json_each(?)").bind(now, JSON.stringify(rows)));
    if (recopy(R)) st.push(db.prepare("INSERT INTO changes(order_id, kind, at, info) VALUES ('Mouvements stock', 'moves', ?, ?)").bind(now, JSON.stringify(rows)));
  }
  // Résumés par jour (Statistiques, Bénéfices) : les jours des commandes modifiées sont à recalculer.
  const days = {};
  Object.keys(R.dirty).forEach((id) => { const o = R.dirty[id]; if (o.__day) days[o.__day] = true; const d = rowOf(o).day; if (d) days[d] = true; });
  R.inserts.forEach((o) => { const d = rowOf(o).day; if (d) days[d] = true; });
  Object.keys(days).forEach((d) => st.push(db.prepare('INSERT INTO days (day, stale) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET stale = stale + 1').bind(d)));
  if (R.full && (R.rebuildDays || statsInputsChanged(R))) {
    st.push(db.prepare("INSERT OR IGNORE INTO days (day, stale) SELECT DISTINCT day, 1 FROM orders WHERE day != ''"));
    st.push(db.prepare('UPDATE days SET stale = stale + 1'));
  }
  if (R.full && R.editors && JSON.stringify(R.editors) !== JSON.stringify(parseList(R.base.secret['cf:editors']))) {
    st.push(db.prepare("INSERT INTO kv (key, value) VALUES ('cf:editors', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(R.editors)));
  }
  if (!st.length) return;
  if (guarded) st.push(db.prepare('DELETE FROM guard'));
  try {
    await db.batch(st);
  } catch (e) {
    if (/CHECK constraint/i.test(String(e && e.message))) {
      const err = new HttpError(409, 'Cette commande vient d’être modifiée par quelqu’un d’autre. Rechargez-la, puis recommencez.', 'conflict');
      // Seul un onglet a changé entre-temps (pas une commande) : l'action peut être rejouée telle quelle.
      err.retry = !Object.keys(R.dirty).length;
      throw err;
    }
    throw e;
  }
}

/**
 * Onglets modifiés (étape 3) : seuls les paquets de lignes touchés sont réécrits, chacun avec son
 * n° de version (deux personnes en même temps : la deuxième est rejouée sur l'onglet à jour).
 * Le changement est noté pour être recopié dans le classeur Google.
 */
function tabStatements(db, R, st, now) {
  let guarded = false;
  Object.keys(R.tabs || {}).forEach((name) => {
    const t = R.tabs[name];
    const stored = R.tabStore[name];
    if (!t.own && !Object.keys(t.dirty).length) return;
    // Lignes vides en fin d'onglet : pas gardées.
    const rows = t.rows.slice(0, F.tabLastRow_(t));
    const parts = Math.max(Math.ceil(rows.length / TAB_PART), t.exists ? 1 : 0);
    const write = {};
    Object.keys(t.dirty).forEach((p) => { if (Number(p) < parts) write[p] = true; });
    if (t.cut >= 0) for (let p = Math.floor(t.cut / TAB_PART); p < parts; p++) write[p] = true;
    if (t.exists && !stored.exists) write[0] = true;
    const list = Object.keys(write).map(Number).sort((a, b) => a - b);
    list.forEach((p) => {
      const chunk = rows.slice(p * TAB_PART, (p + 1) * TAB_PART).map((r) => r.map(F.cfCellOut_));
      st.push(db.prepare('INSERT INTO tabs (name, part, rev, rows) VALUES (?, ?, 1, ?) ON CONFLICT(name, part) DO UPDATE SET rows = excluded.rows, rev = tabs.rev + 1 WHERE tabs.rev = ?')
        .bind(name, p, JSON.stringify(chunk), stored.revs[p] || 0));
      st.push(db.prepare('INSERT INTO guard(ok) VALUES (changes())'));
      guarded = true;
    });
    if (stored.parts > parts) st.push(db.prepare('DELETE FROM tabs WHERE name = ? AND part >= ?').bind(name, parts));
    if (recopy(R) && (list.length || stored.parts > parts)) {
      st.push(db.prepare("INSERT INTO changes(order_id, kind, at, info) VALUES (?, 'tab', ?, ?)").bind(name, now, JSON.stringify({ parts: list, n: rows.length })));
    }
  });
  return guarded;
}

/** Réglages qui changent les résumés par jour (coûts, frais, tarifs) : tous les jours sont à recalculer. */
function statsInputsChanged(R) {
  const sig = (key, src) => {
    let v = null;
    try { v = JSON.parse(src[key] || 'null'); } catch (e) { v = null; }
    if (!v) return '';
    if (key === 'cfg:products') return JSON.stringify((v.rows || []).map((r) => [r.key, r.product, r.model, r.cost, r.aliases]));
    if (key === 'cfg:settings') return JSON.stringify([v.FRAIS_RETOUR, v.COUT_EMBALLAGE, v.SOCIETE_PAR_DEFAUT, v.REMARQUES_MOTS]);
    return JSON.stringify(v);
  };
  return ['cfg:products', 'cfg:settings', 'cfg:rates'].some((k) => R.configWrites[k] !== undefined && sig(k, R.configWrites) !== sig(k, R.base.config));
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
    if (R.full) R.healthSummary = workerHealth(R).summary;
    const boot = run(R, () => F.bootstrapApi_(null));
    boot.counts = await fastCounts(env);
    boot.cloud = { version: K.APP_VERSION, step: R.full ? 3 : isLive(R) ? 2 : 1, google: R.cfInfo.google,
      auth: { via: R.user.sid ? 'password' : 'google', phone: R.user.phone || '', pwdOnly: !!R.base.secret['cf:pwdOnly'], relay: !!R.base.secret['cf:relay'] },
      lastExport: R.base.secret['cf:lastExport'] || '' };
    if (!R.user.sid && R.full) {
      const mine = run(R, () => F.readTeam_()).filter((t) => t[0] === String(R.user.email || ''))[0];
      const row = mine && mine[3] ? await authRow(env, mine[3]) : null;
      boot.cloud.auth.phone = mine ? mine[3] : '';
      boot.cloud.auth.hasPassword = !!(row && row.hash && !row.temp);
    } else boot.cloud.auth.hasPassword = !!R.user.sid;
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
    const res = await exec(env, R, () => F.api_recordCall.apply(null, args));
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
    const res = await exec(env, R, () => F.api_updateOrder.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_createOrder(env, R, args) {
    const input = args[0] || {};
    const pq = phoneQuery(phonesOf([input.phone]));
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    R.manualMax = await manualMax(env);
    const res = await exec(env, R, () => F.api_createOrder.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_setBlacklist(env, R, args) {
    const p = F.normalizePhone(args[0]);
    if (!p.valid) throw new HttpError(400, 'Numéro invalide.');
    const on = !!args[1];
    const note = String(args[2] || '');
    await loadWhere(env, R, 'archived = 0 AND phone = ?', [p.phone]);
    if (R.full) { // étape 3 : onglet Clients dans la base
      const r3 = await exec(env, R, () => F.api_setBlacklist.apply(null, args));
      await flush(env, R);
      return r3;
    }
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
    const ri = relayInfo(R);
    return {
      releasit: ri.on ? { found: true, missing: ri.missing, lastRun: ri.at, lastError: ri.error, relay: true } : { found: !!live, missing: [], lastRun: last, lastError: '' },
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
        if (recopy(R)) R.extra.push(env.DB.prepare('INSERT INTO changes(order_id, kind, at, info) VALUES (?, ?, ?, ?)').bind(id, 'delete', now, JSON.stringify({ by: user.name, reason: why })));
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
  const res = await exec(env, R, fn);
  if (opts && opts.alerts) R.extra.push(alertStatement(env, R));
  await flush(env, R);
  return withCounts(env, res);
}

Object.assign(PAGES, {
  async api_shippingList(env, R) {
    await loadWhere(env, R, "archived = 0 AND stage = 'confirmed'", []);
    if (!isLive(R)) return run(R, () => F.api_shippingList());
    return exec(env, R, () => F.api_shippingList());
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
    const res = await exec(env, R, () => F.api_markLabelsPrinted(args[0]));
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
    const res = await exec(env, R, () => F.api_markFollowUp(args[0]));
    R.extra.push(alertStatement(env, R));
    await flush(env, R);
    return res;
  },
  async api_markReturnDamaged(env, R, args) {
    await loadIds(env, R, idsOf([args[0]]));
    const res = await exec(env, R, () => F.api_markReturnDamaged(args[0]));
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

/** Note le résultat d'une tâche (page Administration › État de l'outil). */
async function noteTask(env, base, key, fn) {
  const t0 = Date.now();
  let prev = null;
  try { prev = JSON.parse(base.secret['cf:task:' + key] || 'null'); } catch (e) { prev = null; }
  let res;
  let err = '';
  try { res = await fn(); if (res && res.error) err = String(res.error); } catch (e) { err = String(e && e.message ? e.message : e); }
  const at = new Date().toISOString();
  const ok = !err;
  const t = { at: at, ok: ok, ms: Date.now() - t0, err: err.slice(0, 300), fails: ok ? 0 : ((prev && prev.fails) || 0) + 1, lastOk: ok ? at : (prev && prev.lastOk) || '' };
  await env.DB.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:task:' + key, JSON.stringify(t)).run();
  return ok ? res : { error: err };
}

function due(base, key, minutes) {
  const last = Date.parse(base.secret[key] || '') || 0;
  return Date.now() - last >= minutes * 60000 - 30000;
}
function kvSet(env, key, value) {
  return env.DB.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value);
}

async function cron(env) {
  const base = await loadBase(env);
  if (!base.secret['cf:live']) return { live: false };
  const robot = { email: '' };
  const out = {};
  const settings = (() => { try { return JSON.parse(base.config['cfg:settings'] || '{}'); } catch (e) { return {}; } })();
  // 1. SMS en attente.
  out.sms = await noteTask(env, base, 'sms', () => sendSmsNow(env, base));
  if (out.sms && out.sms.error) out.smsError = out.sms.error;
  // 2. Statuts Ecotrack (toutes les SUIVI_ECOTRACK_MINUTES minutes).
  if (due(base, 'cf:ecoLast', Number(settings.SUIVI_ECOTRACK_MINUTES) || 60)) {
    await kvSet(env, 'cf:ecoLast', new Date().toISOString()).run();
    out.ecotrack = await noteTask(env, base, 'ecotrack', async () => {
      const R = newReq(base, robot);
      await loadWhere(env, R, 'archived = 0 AND track = 1', []);
      const r = await exec(env, R, () => F.syncEcotrackStatuses_());
      R.extra.push(alertStatement(env, R));
      await flush(env, R);
      // Nouveaux colis à traiter (refus, retour, colis bloqué) : notification aux administrateurs.
      const before = Number(base.secret['cf:alerts']) || 0;
      const after = Number((await env.DB.prepare("SELECT value FROM kv WHERE key = 'cf:alerts'").first() || {}).value) || 0;
      if (after > before) {
        await pushTo(env, base, 'tracking', { title: 'Suivi : ' + F.plural_(after, 'colis à traiter', 'colis à traiter'), body: (after - before) + ' de plus : refus, retour ou colis bloqué. Ouvrez Suivi.', tag: 'suivi', url: '/#/suivi' }).catch(() => null);
      }
      return r;
    });
    if (out.ecotrack && out.ecotrack.error) out.ecotrackError = out.ecotrack.error;
  }
  if (base.full) {
    // 3. Shopify (toutes les 5 minutes), lu par Cloudflare à l'étape 3.
    if (base.props.SHOPIFY_SHOP && due(base, 'cf:shopLast', 5)) {
      await kvSet(env, 'cf:shopLast', new Date().toISOString()).run();
      out.shopify = await noteTask(env, base, 'shopify', () => shopifyImport(env, newReq(base, robot)));
    }
    // 4. Résumés par jour (Statistiques, Bénéfices) : quelques jours à refaire par minute.
    out.days = await noteTask(env, base, 'days', async () => {
      const r = await env.DB.prepare('SELECT day, stale FROM days WHERE stale > 0 ORDER BY day DESC LIMIT 6').all();
      const list = r.results || [];
      if (list.length) await refreshDays(env, newReq(base, robot), list);
      return { refreshed: list.length };
    });
  }
  // 5. Entretien de nuit (vers 3 h, heure d'Algérie).
  const today = F.ymd_(new Date());
  const hour = new Date(Date.now() + 3600000).getUTCHours(); // heure d'Algérie (UTC+1)
  if (hour >= 3 && base.secret['cf:nightDay'] !== today) {
    await kvSet(env, 'cf:nightDay', today).run();
    out.night = await noteTask(env, base, 'nightly', () => nightly(env, base));
    if (out.night && !out.night.error) Object.assign(out, out.night);
  }
  // 6. Alertes (problèmes de l'outil) : SMS aux administrateurs en mode relais, notifications pour qui les a choisies.
  if (base.full) out.alerts = await alertCheck(env, await loadBase(env)).catch((e) => ({ error: String(e && e.message ? e.message : e) }));
  // 7. Notifications : rappels arrivés à leur heure.
  if (base.full) out.callbacks = await notifyCallbacks(env, base).catch((e) => ({ error: String(e && e.message ? e.message : e) }));
  // 8. Communes d'Ecotrack : la liste officielle, relue une fois par semaine (une heure après un échec).
  if (base.props.ECOTRACK_TOKEN && due(base, 'cf:ecoCommunesAt', base.secret['cf:ecoCommunesOk'] ? 7 * 1440 : 60)) {
    await kvSet(env, 'cf:ecoCommunesAt', new Date().toISOString()).run();
    out.communes = await ecotrackCommunes(env, base).catch((e) => ({ error: String(e && e.message ? e.message : e) }));
  }
  let runs = { day: today, n: 0 };
  try { const c = JSON.parse(base.secret['cf:runs'] || 'null'); if (c && c.day === today) runs = c; } catch (e) { /* nouveau jour */ }
  runs.n++;
  await env.DB.batch([kvSet(env, 'cf:cronAt', new Date().toISOString()), kvSet(env, 'cf:runs', JSON.stringify(runs))]);
  return out;
}

/**
 * Communes desservies par Ecotrack (GET /api/v1/get/communes) : [{ w: n° de wilaya, n: nom, p: code postal,
 * s: 1 si bureau stop desk }], gardées dans kv « big:ecoCommunes » (lu seulement quand on en a besoin).
 */
function communeList(raw) {
  const items = Array.isArray(raw) ? raw : raw && Array.isArray(raw.data) ? raw.data : raw && typeof raw === 'object' ? Object.values(raw) : [];
  return items.filter((c) => c && typeof c === 'object').map((c) => ({
    w: parseInt(c.wilaya_id, 10) || 0,
    n: String(c.nom || c.name || c.commune || '').trim(),
    p: String(c.code_postal || ''),
    s: Number(c.has_stop_desk) === 1 ? 1 : 0
  })).filter((c) => c.n);
}
async function ecotrackCommunes(env, base) {
  const R = newReq(base, { email: '' });
  let raw = null;
  let err = '';
  try { raw = await exec(env, R, () => F.ecotrackGet_('/api/v1/get/communes')); } catch (e) { err = String(e && e.message ? e.message : e); }
  const list = communeList(raw);
  const at = new Date().toISOString();
  const shape = raw === null ? '' : (Array.isArray(raw) ? 'liste' : typeof raw) + ' · ' + Object.keys(raw || {}).slice(0, 5).join(',') + ' · ' +
    JSON.stringify(Array.isArray(raw) ? raw[0] : raw && raw.data ? raw.data[0] : raw && typeof raw === 'object' ? raw[Object.keys(raw)[0]] : raw).slice(0, 300);
  await env.DB.batch([kvSet(env, 'big:ecoCommunes', JSON.stringify({ at: at, n: list.length, error: err.slice(0, 300), shape: shape, list: list })),
    kvSet(env, 'cf:ecoCommunesOk', list.length ? at : '')]);
  return { communes: list.length, error: err };
}

/**
 * Alertes par SMS (mode relais) : un problème de l'état de l'outil (relais RELEASIT muet depuis 10 min,
 * Ecotrack ou Shopify en panne, entretien de nuit pas fait…) envoie UN SMS aux administrateurs qui ont
 * un téléphone dans l'onglet Équipe ; quand il est réglé, un SMS « rétabli ». Pas de SMS pour une panne
 * des SMS eux-mêmes (ils ne partiraient pas) : elle reste visible dans l'application.
 */
async function alertCheck(env, base) {
  const sms = !!(base.secret['cf:relay'] && base.props.SMS_API_KEY);
  if (!sms) {
    const has = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first();
    if (!has || !has.n) return { sent: 0, off: true };
  }
  const R = newReq(base, { email: '' });
  const problems = workerHealth(R).data.problems.filter((p) => p.key !== 'sms' && p.key !== 'cron');
  let state = {};
  try { state = JSON.parse(base.secret['cf:alertState'] || '{}') || {}; } catch (e) { state = {}; }
  const keys = problems.map((p) => p.key);
  const fresh = problems.filter((p) => !state[p.key]);
  const fixed = Object.keys(state).filter((k) => keys.indexOf(k) < 0);
  if (!fresh.length && !fixed.length) return { sent: 0 };
  const team = await exec(env, R, () => F.readTeam_());
  const phones = team.filter((t) => t[3] && run(R, () => F.isAdmin_({ role: t[2] }))).map((t) => t[3]);
  const shop = run(R, () => F.getSettings_().NOM_BOUTIQUE) || 'DZ Smart Shop';
  const texts = [];
  if (fresh.length) texts.push(shop + ' : problème. ' + fresh.map((p) => p.text).join(' ; ').slice(0, 300) + ' (Administration › État de l’outil)');
  if (fixed.length) texts.push(shop + ' : c’est rétabli (' + fixed.map((k) => state[k].label || k).join(', ') + ').');
  let sent = 0;
  // Identifiant d'envoi fixé avant : l'action peut être rejouée (appels extérieurs), chaque SMS ne part qu'une fois.
  const stamp = Date.now();
  await pushTo(env, base, 'problems', { title: fresh.length ? 'Problème : ' + fresh[0].text.split(' : ')[0] : 'C’est rétabli', body: texts.join(' ').slice(0, 300), tag: 'outil', url: '/#/admin' }, { team: team }).catch(() => null);
  if (sms && phones.length) {
    await exec(env, R, () => {
      sent = 0;
      const cfg = F.smsConfig_();
      phones.forEach((ph) => texts.forEach((t, i) => { if (F.httpsmsSend_(cfg, F.smsNumber_(ph), t, 'alerte-' + stamp + '-' + ph + '-' + i).ok) sent++; }));
    });
  }
  const now = new Date().toISOString();
  fixed.forEach((k) => { delete state[k]; });
  fresh.forEach((p) => { state[p.key] = { at: now, label: p.text.split(' : ')[0].slice(0, 60) }; });
  await env.DB.batch([kvSet(env, 'cf:alertState', JSON.stringify(state)),
    env.DB.prepare('INSERT INTO journal (at, who, order_id, action, detail) VALUES (?, ?, ?, ?, ?)').bind(now, 'Automatique', '', sms ? 'Alerte SMS' : 'Alerte', texts.join(' / ').slice(0, 500) + (sms && !phones.length ? ' (aucun administrateur avec un téléphone)' : ''))]);
  return { sent: sent, problems: keys };
}

/**
 * Entretien de nuit : appels sans réponse annulés, corbeille et Journal raccourcis ; à l'étape 3 aussi :
 * mouvements de stock oubliés, archivage des commandes terminées (recopié dans le classeur).
 */
async function nightly(env, base) {
  const robot = { email: '' };
  const out = {};
  const settings = (() => { try { return JSON.parse(base.config['cfg:settings'] || '{}'); } catch (e) { return {}; } })();
  const R = newReq(base, robot);
  await loadWhere(env, R, 'archived = 0 AND status IN (?, ?)', [S.NO_ANSWER, S.UNREACHABLE]);
  out.autoCancelled = await exec(env, R, () => F.autoCancelUnreachable_());
  const now = Date.now();
  const trashDays = Number(settings.CORBEILLE_JOURS) || 0;
  if (trashDays > 0) {
    const cut = new Date(now - trashDays * 86400000).toISOString();
    const old = await env.DB.prepare('SELECT id FROM trash WHERE deleted_at < ?').bind(cut).all();
    (old.results || []).forEach((x) => R.notes.push({ id: x.id, kind: 'purge', info: 'Automatique' }));
    R.extra.push(env.DB.prepare("INSERT OR REPLACE INTO blocked (id, at, by) SELECT id, ?, 'Automatique' FROM trash WHERE deleted_at < ?").bind(new Date().toISOString(), cut));
    R.extra.push(env.DB.prepare('DELETE FROM trash WHERE deleted_at < ?').bind(cut));
  }
  const journalDays = Number(settings.JOURNAL_JOURS) || 0;
  if (journalDays > 0) R.extra.push(env.DB.prepare('DELETE FROM journal WHERE at < ?').bind(new Date(now - journalDays * 86400000).toISOString()));
  R.extra.push(env.DB.prepare('DELETE FROM changes WHERE at < ?').bind(new Date(now - 30 * 86400000).toISOString()));
  await flush(env, R);
  if (base.full) {
    // Stock : colis partis ou revenus dont le mouvement n'a pas encore été fait.
    const R2 = newReq(base, robot);
    await loadWhere(env, R2, "archived = 0 AND ((IFNULL(json_extract(data, '$.stockMove'), '') = '' AND stage IN ('transit', 'delivered', 'returned')) " +
      "OR (json_extract(data, '$.stockMove') = ? AND stage IN ('returned', 'cancelled')))", [K.STOCK_OUT_]);
    if (R2.orders.length) {
      const r = await exec(env, R2, () => F.applyStockMoves_(F.readOrders_()));
      out.stock = (r.out || 0) + (r.back || 0);
      await flush(env, R2);
    }
    // Archivage : commandes terminées depuis plus de ARCHIVE_JOURS jours (déplacées dans l'onglet Archive du classeur).
    const days = Number(settings.ARCHIVE_JOURS) || 0;
    if (days) {
      const R3 = newReq(base, robot);
      const limit = new Date(now - days * 86400000);
      await loadWhere(env, R3, "archived = 0 AND stage IN ('delivered', 'returned', 'cancelled') AND (updated = '' OR updated < ?) LIMIT 400", [limit.toISOString()]);
      const list = await exec(env, R3, () => {
        const picked = R3.orders.filter((o) => F.isArchivable_(o, limit));
        if (picked.length) F.addArchivedCounts_(picked);
        return picked.map((o) => String(o.id));
      });
      const at = new Date().toISOString();
      list.forEach((id) => {
        R3.extra.push(env.DB.prepare('UPDATE orders SET archived = 1, rev = rev + 1 WHERE id = ?').bind(id));
        if (recopy(R3)) R3.extra.push(env.DB.prepare("INSERT INTO changes(order_id, kind, at) VALUES (?, 'archive', ?)").bind(id, at));
      });
      if (list.length) run(R3, () => F.log_({ name: 'Automatique' }, '', 'Archivage', list.length + ' commande(s) terminée(s) depuis plus de ' + days + ' jours archivée(s)'));
      await flush(env, R3);
      out.archived = list.length;
    }
  }
  return out;
}

/* ================================================================ */
/* Étape 3 : Stock, Bénéfices, Statistiques, Administration          */
/* ================================================================ */

function needFull(R) {
  if (!R.full) throw new HttpError(400, 'Cette page est encore dans l’application Google (étape 3 pas encore faite).', 'later');
}

/** Onglets lus d'avance par chaque action (sinon lus à la demande, l'action étant alors rejouée). */
const FN_TABS = {
  api_stockEntry: ['Produits'], api_stockInventory: ['Produits'], api_addProduct: ['Produits'], api_updateCatalogRow: ['Produits'], api_addCatalogItems: ['Produits'],
  api_setCatalogActive: ['Produits'], api_deleteCatalogRow: ['Produits'], api_mergeCatalogRows: ['Produits'], api_undoStockMove: ['Produits', 'Paramètres'],
  api_stockAt: ['Produits'], api_shopifyPhotos: ['Produits'],
  api_markReturnDamaged: ['Produits'], api_validateParcels: ['Produits'], api_ecotrackSyncStatuses: ['Produits'], api_updateOrder: [], api_recordCall: [],
  api_addExpense: ['Dépenses', 'Produits'], api_updateExpense: ['Dépenses', 'Produits'], api_deleteExpenses: ['Dépenses'], api_linkCampaign: ['Dépenses', 'Produits'],
  api_profit: ['Dépenses', 'Produits'], api_stats: ['Dépenses'],
  api_settingsGet: ['Paramètres'], api_settingsSave: ['Paramètres'], api_setPrime: ['Paramètres'], api_setGoal: ['Paramètres'],
  api_teamList: ['Équipe'], api_teamSave: ['Équipe'], api_teamRemove: ['Équipe'], api_authMine: ['Équipe'], api_clientsAdmin: ['Clients'], api_clearFlag: ['Clients'], api_setBlacklist: ['Clients']
};
async function preloadTabs(env, R, fn) {
  if (R.full && FN_TABS[fn] && FN_TABS[fn].length) await loadTabs(env, R, FN_TABS[fn]);
}

/** Une fonction de l'outil, telle quelle (onglets lus à la demande), puis enregistrement. */
function gasPage(fnName, before) {
  return async function (env, R, args) {
    needFull(R);
    await preloadTabs(env, R, fnName);
    if (before) await before(env, R, args);
    const res = await exec(env, R, () => F[fnName].apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  };
}

/** Stock : commandes confirmées (stock réservé), libellés des 60 derniers jours (regroupés), derniers mouvements. */
async function loadStockSet(env, R) {
  await loadWhere(env, R, "archived = 0 AND stage = 'confirmed'", []);
  const since = F.ymd_(new Date(Date.now() - 60 * 86400000));
  const r = await env.DB.batch([
    env.DB.prepare("SELECT json_extract(data, '$.product') AS product, json_extract(data, '$.qty') AS qty, json_extract(data, '$.price') AS price, " +
      "MAX(date) AS date, COUNT(*) AS n FROM orders WHERE archived = 0 AND day >= ? GROUP BY 1, 2, 3").bind(since),
    env.DB.prepare('SELECT seq, row FROM moves ORDER BY seq DESC LIMIT 300')
  ]);
  R.labelRows = (r[0].results || []).map((x) => ({ product: x.product || '', qty: x.qty, price: x.price, date: x.date, __n: x.n }));
  R.moves = (r[1].results || []).map((x) => ({ seq: x.seq, row: JSON.parse(x.row).map(F.cfCellIn_) }));
}

/*
 * Actions rares de la page Stock : la base fait les comptes (une lecture de la table moves,
 * mais peu de travail pour le moteur), l'outil fait le reste.
 */
/** Supprimer un modèle : mouvements liés à une commande (par modèle) et libellés des commandes en cours. */
async function loadDeleteCheck(env, R) {
  const r = await env.DB.batch([
    env.DB.prepare("SELECT json_extract(row, '$[1]') AS p, json_extract(row, '$[2]') AS m, COUNT(*) AS n FROM moves " +
      "WHERE IFNULL(json_extract(row, '$[7]'), '') != '' GROUP BY 1, 2"),
    env.DB.prepare("SELECT json_extract(data, '$.product') AS product, json_extract(data, '$.qty') AS qty, COUNT(*) AS n FROM orders WHERE archived = 0 GROUP BY 1, 2")
  ]);
  R.moveCounts = (r[0].results || []).map((x) => ({ p: x.p || '', m: x.m || '', n: x.n }));
  R.labelRows = (r[1].results || []).map((x) => ({ product: x.product || '', qty: x.qty, __n: x.n }));
}
/** Annuler un mouvement : ce mouvement, et les annulations déjà faites. */
async function loadUndoCheck(env, R, args) {
  const ref = Math.round(Number((args[0] || {}).ref)) || 0;
  const r = await env.DB.batch([
    env.DB.prepare('SELECT seq, row FROM moves WHERE seq = ?').bind(ref),
    env.DB.prepare("SELECT json_extract(row, '$[9]') AS note FROM moves WHERE json_extract(row, '$[3]') = ?").bind(K.STOCK_UNDO_TYPE_)
  ]);
  const one = (r[0].results || [])[0];
  R.oneMove = one ? { seq: one.seq, row: JSON.parse(one.row).map(F.cfCellIn_) } : null;
  R.undoNotes = (r[1].results || []).map((x) => String(x.note || ''));
}
/** Stock à une date : mouvements faits depuis la fin de ce jour (heure d'Algérie), additionnés par modèle. */
async function loadMovesSince(env, R, args) {
  const day = String(args[0] || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const end = new Date(F.addDayDays_(day, 1) + 'T00:00:00+01:00').toISOString();
  const r = await env.DB.prepare("SELECT json_extract(row, '$[1]') AS p, json_extract(row, '$[2]') AS m, SUM(json_extract(row, '$[4]')) AS q FROM moves " +
    'WHERE at > ? GROUP BY 1, 2').bind(end).all();
  R.movesSince = (r.results || []).map((x) => ({ product: x.p || '', model: x.m || '', qty: Number(x.q) || 0 }));
}

/**
 * Statistiques filtrées (wilaya, produit, campagne, source, confirmatrice) : la base donne les valeurs
 * du champ vues sur la période, l'outil garde celles du filtre, puis seules ces commandes sont lues.
 */
const STATS_FILTER_FIELD = { w: 'wilaya', a: 'agent', cp: 'campaign', src: 'adSource', p: 'product' };
async function loadStatsFilter(env, R, filter, from, to) {
  const field = STATS_FILTER_FIELD[filter.kind];
  const path = "json_extract(data, '$." + field + "')";
  const vals = await env.DB.prepare('SELECT DISTINCT ' + path + ' AS v FROM orders WHERE day >= ? AND day <= ?').bind(from, to).all();
  const catalog = filter.kind === 'p' ? run(R, () => F.readCatalog_()) : null;
  const keep = (vals.results || []).map((x) => (x.v === null || x.v === undefined ? '' : x.v))
    .filter((v) => run(R, () => F.statsFilterMatch_({ [field]: v, qty: 1 }, filter, catalog)));
  if (!keep.length) return;
  const blank = keep.indexOf('') >= 0;
  const where = 'day >= ? AND day <= ? AND (' + path + ' IN (SELECT value FROM json_each(?))' + (blank ? ' OR IFNULL(' + path + ", '') = ''" : '') + ')';
  const binds = [from, to, JSON.stringify(keep.filter((v) => v !== ''))];
  // Limite de calcul de la version gratuite : au-delà, une période plus courte est demandée.
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE ' + where).bind(...binds).first();
  if (c.n > STATS_FILTER_MAX) {
    throw new HttpError(400, 'Ce filtre compte ' + c.n + ' commandes (période et période d’avant) : c’est trop pour la version gratuite de Cloudflare. Choisissez une période plus courte (par exemple 7 jours), puis filtrez de nouveau.');
  }
  await loadWhere(env, R, where, binds);
}
const STATS_FILTER_MAX = 800;

/** Résumés par jour d'une période (table days) ; les jours à refaire le sont d'abord, au plus `cap` (les plus récents). */
async function loadDays(env, R, from, to, cap) {
  const db = env.DB;
  const r = from ? await db.prepare('SELECT day, data, stale FROM days WHERE day >= ? AND day <= ?').bind(from, to).all()
    : await db.prepare('SELECT day, data, stale FROM days WHERE day <= ?').bind(to).all();
  const rows = r.results || [];
  const stale = rows.filter((x) => x.stale > 0).sort((a, b) => (a.day < b.day ? 1 : -1));
  const fresh = await refreshDays(env, R, stale.slice(0, cap));
  R.daysPending = Math.max(stale.length - cap, 0);
  rows.forEach((x) => {
    if (Object.prototype.hasOwnProperty.call(fresh, x.day)) { if (fresh[x.day]) R.days[x.day] = fresh[x.day]; return; }
    if (x.data) { try { R.days[x.day] = JSON.parse(x.data); } catch (e) { /* ignoré */ } }
  });
  return R.days;
}

/** Recalcule des jours à partir de leurs commandes (archivées comprises) et les enregistre. */
async function refreshDays(env, R, list) {
  const out = {};
  if (!list.length) return out;
  const days = list.map((x) => x.day);
  const r = await env.DB.prepare('SELECT data FROM orders WHERE day IN (' + placeholders(days.length) + ')').bind(...days).all();
  const orders = (r.results || []).map((x) => JSON.parse(x.data));
  const sums = run(R, () => F.daySummaries_(orders, F.makeEnv_({ orders: [] }), F.readCatalog_()));
  const st = list.map((x) => {
    const v = sums[x.day] || null;
    out[x.day] = v;
    // Seulement si personne ne l'a touché entre-temps (sinon il reste à refaire).
    return env.DB.prepare('UPDATE days SET data = ?, stale = 0 WHERE day = ? AND stale = ?').bind(v ? JSON.stringify(v) : '', x.day, x.stale);
  });
  await env.DB.batch(st);
  return out;
}

/* ---------------- État de l'outil (tâches de Cloudflare) ---------------- */

const CF_TASKS = [
  { key: 'sheet', label: 'Lien avec le classeur Google (commandes Releasit, recopie)', every: 1, staleMin: 30 },
  { key: 'sms', label: 'SMS automatiques', every: 1, staleMin: 60 },
  { key: 'shopify', label: 'Importation Shopify', every: 5, staleMin: 90 },
  { key: 'ecotrack', label: 'Statuts des colis Ecotrack', every: 60, staleMin: 180 },
  { key: 'days', label: 'Résumés par jour (Statistiques, Bénéfices)', every: 1, staleMin: 60 },
  { key: 'nightly', label: 'Entretien de nuit (appels, archivage, stock, corbeille)', every: 1440, staleMin: 27 * 60 }
];

/** État du relais RELEASIT (mode relais) : dernier passage, erreur, colonnes absentes. */
function relayInfo(R) {
  const s = (R && R.base && R.base.secret) || {};
  let info = {};
  try { info = JSON.parse(s['cf:relayInfo'] || '{}') || {}; } catch (e) { info = {}; }
  return { on: !!s['cf:relay'], installed: s['cf:relay'] || '', at: s['cf:relayAt'] || info.at || '', error: info.error || '', missing: info.missing || [],
    lastAdd: info.lastAdd || '', lastIds: info.lastIds || [], lastRow: info.lastRow || 0, version: info.version || '' };
}

function workerHealth(R) {
  const s = R.base.secret || {};
  const settings = (() => { try { return JSON.parse(R.base.config['cfg:settings'] || '{}'); } catch (e) { return {}; } })();
  const props = R.base.props || {};
  const now = Date.now();
  const problems = [];
  const tasks = CF_TASKS.map((base) => {
    const info = Object.assign({}, base);
    if (info.key === 'ecotrack') { info.every = Number(settings.SUIVI_ECOTRACK_MINUTES) || 60; info.staleMin = Math.max(180, info.every * 3); }
    let t = null;
    try { t = JSON.parse(s['cf:task:' + info.key] || 'null'); } catch (e) { t = null; }
    if (info.key === 'sheet' && s['cf:relay']) {
      // Mode relais : le petit script Google (Relais.gs) envoie l'onglet RELEASIT chaque minute.
      const ri = relayInfo(R);
      info.label = 'Relais RELEASIT (petit script Google)';
      info.staleMin = 10;
      t = ri.at ? { at: ri.at, ok: !ri.error, ms: 0, lastOk: ri.error ? (ri.lastOk || '') : ri.at, err: ri.error, fails: ri.error ? 1 : 0 } : null;
    } else if (info.key === 'sheet') t = s['cf:bridgeAt'] ? { at: s['cf:bridgeAt'], ok: true, ms: 0, lastOk: s['cf:bridgeAt'] } : null;
    const enabled = info.key === 'shopify' ? !!props.SHOPIFY_SHOP : info.key === 'ecotrack' ? !!props.ECOTRACK_TOKEN : info.key === 'sms' ? !!props.SMS_API_KEY : true;
    const late = t && t.lastOk ? now - Date.parse(t.lastOk) > info.staleMin * 60000 : !!t;
    const state = !enabled ? 'off' : !t ? 'wait' : (t.fails >= 3 || late) ? 'bad' : t.ok ? 'ok' : 'warn';
    if (enabled && state === 'bad') problems.push({ key: info.key, text: info.label + (t && t.err ? ' : ' + t.err : ' : pas de passage réussi depuis ' + Math.round((now - Date.parse(t.lastOk || t.at)) / 60000) + ' min') });
    return { key: info.key, label: info.label, every: info.every, state: state, at: t ? t.at : '', lastOk: t ? t.lastOk || '' : '', ms: t ? t.ms || 0 : 0, err: t ? t.err || '' : '', fails: t ? t.fails || 0 : 0,
      note: !enabled ? 'Pas configuré' : info.key === 'sheet' ? (s['cf:relay'] ? 'Le relais Google envoie l’onglet RELEASIT chaque minute' : 'Fait par Apps Script, chaque minute') : '' };
  });
  const minute = s['cf:cronAt'] || '';
  const running = !!minute && now - Date.parse(minute) <= 10 * 60000;
  if (!running) problems.unshift({ key: 'cron', text: minute ? 'Les tâches de chaque minute ne tournent plus.' : 'Les tâches de chaque minute n’ont pas encore tourné.' });
  let runs = 0;
  try { const c = JSON.parse(s['cf:runs'] || 'null'); if (c && c.day === F.ymd_(new Date())) runs = c.n; } catch (e) { runs = 0; }
  return {
    data: { cloud: true, running: running, minute: minute, tasks: tasks, today: { minutes: 0, limit: 0, runs: runs }, problems: problems,
      owner: String(props.OWNER_EMAIL || ''), isOwner: true, triggers: { checked: false }, errors: [] },
    summary: { installed: true, late: !running, problems: problems.length }
  };
}

Object.assign(PAGES, {
  /* Stock */
  api_stockPage: gasPage('api_stockPage', loadStockSet),
  api_stock: gasPage('api_stockPage', loadStockSet),
  api_addCatalogItems: gasPage('api_addCatalogItems'),
  api_addProduct: gasPage('api_addProduct'),
  api_updateCatalogRow: gasPage('api_updateCatalogRow'),
  api_stockEntry: gasPage('api_stockEntry'),
  api_stockInventory: gasPage('api_stockInventory'),
  api_setCatalogActive: gasPage('api_setCatalogActive'),
  api_deleteCatalogRow: gasPage('api_deleteCatalogRow', loadDeleteCheck),
  api_mergeCatalogRows: gasPage('api_mergeCatalogRows'),
  api_undoStockMove: gasPage('api_undoStockMove', loadUndoCheck),
  api_stockAt: gasPage('api_stockAt', loadMovesSince),
  api_shopifyPhotos: gasPage('api_shopifyPhotos'),

  /* Bénéfices : résumés par jour additionnés (période et période d'avant), dépenses de l'onglet Dépenses. */
  async api_profit(env, R, args) {
    needFull(R);
    requireAdmin(R, 'voir les bénéfices');
    const period = String(args[0] || '30');
    const range = run(R, () => F.periodRange_(period, args[1], args[2]));
    range.period = args[1] && args[2] ? 'custom' : period;
    await loadDays(env, R, range.all ? null : (range.prevFrom || range.from), range.to, 6);
    const camp = await env.DB.prepare("SELECT DISTINCT json_extract(data, '$.campaign') AS c FROM orders WHERE archived = 0 AND day >= ?")
      .bind(F.ymd_(new Date(Date.now() - 365 * 86400000))).all();
    const known = (camp.results || []).map((x) => String(x.c || '').trim()).filter(Boolean);
    const res = await exec(env, R, () => {
      const settings = F.getSettings_();
      if (F.expensesNeedRate_(settings)) F.fillExpenseRates_(settings);
      const cur = F.profitAcc_();
      const prev = range.all ? null : F.profitAcc_();
      Object.keys(R.days).forEach((k) => {
        const d = R.days[k];
        if (!d || !d.pr) return;
        if (range.all ? k <= range.to : (k >= range.from && k <= range.to)) F.profitMerge_(cur, d.pr);
        else if (prev && k >= range.prevFrom && k <= range.prevTo) F.profitMerge_(prev, d.pr);
      });
      return F.profitReport_(cur, prev, range, settings, F.readExpenses_(settings), known);
    });
    await flush(env, R);
    res.pending = R.daysPending;
    return res;
  },
  api_addExpense: gasPage('api_addExpense'),
  api_updateExpense: gasPage('api_updateExpense'),
  api_deleteExpenses: gasPage('api_deleteExpenses'),
  api_linkCampaign: gasPage('api_linkCampaign'),

  /* Statistiques : résumés par jour ; la journée en cours, les colis en route et les versements en direct. */
  async api_stats(env, R, args) {
    needFull(R);
    requireAdmin(R, 'voir les statistiques');
    const range = run(R, () => F.statsRange_(String(args[0] || '30'), args[1], args[2]));
    const len = run(R, () => F.dayCount_(range.from, range.to));
    const prevFrom = run(R, () => F.addDayDays_(range.from, -len));
    const today = F.ymd_(new Date());
    const filter = run(R, () => F.statsFilter_(args[3]));
    if (filter) {
      // Filtre croisé : seulement les commandes du filtre (période et période d'avant, archives comprises).
      await loadStatsFilter(env, R, filter, prevFrom, range.to);
    } else {
      await loadDays(env, R, prevFrom, range.to, 6);
      const back = Math.min(Math.max(run(R, () => F.dayCount_(range.from, today)), 1), 120);
      const since = new Date(Date.now() - back * 86400000).toISOString();
      await loadMany(env, R, [['archived = 0 AND track = 1', []], ['archived = 0 AND day = ?', [today]]]);
      // Colis terminés (payés…) de la période : regroupés par la base (versement, statut), pas lus un par un.
      const moved = "COALESCE(NULLIF(json_extract(data, '$.carrierMoved'), ''), NULLIF(updated, ''), date)";
      const paid = await env.DB.prepare("SELECT json_extract(data, '$.carrierStatus') AS cs, json_extract(data, '$.paymentId') AS pid, status, " +
        'SUM(total) AS amount, COUNT(*) AS n, MAX(' + moved + ') AS moved FROM orders WHERE archived = 0 AND track = 0 AND carrier = ? AND tracking != \'\' ' +
        'AND day != ? AND ' + moved + ' >= ? GROUP BY 1, 2, 3').bind(K.ECO.NAME, today, since).all();
      R.moneyRows = (paid.results || []).map((x) => ({ carrier: K.ECO.NAME, tracking: '-', carrierStatus: x.cs || '', paymentId: x.pid || '', status: x.status,
        total: x.amount, __n: x.n, carrierMoved: x.moved, updated: x.moved, date: x.moved }));
    }
    // Objectif du jour : confirmations faites aujourd'hui (heure d'Algérie), comptées par la base.
    const start = new Date(today + 'T00:00:00+01:00').toISOString();
    const end = new Date(F.addDayDays_(today, 1) + 'T00:00:00+01:00').toISOString();
    const goal = await env.DB.prepare("SELECT json_extract(data, '$.agent') AS a, COUNT(*) AS n FROM orders WHERE archived = 0 AND day >= ? " +
      "AND json_extract(data, '$.confirmedAt') >= ? AND json_extract(data, '$.confirmedAt') < ? AND json_extract(data, '$.status') IN (SELECT value FROM json_each(?)) GROUP BY 1")
      .bind(F.addDayDays_(today, -20), start, end, JSON.stringify(K.CONFIRMED_STATUSES)).all();
    R.goalCounts = (goal.results || []).map((x) => ({ a: x.a || '', n: x.n }));
    R.props.STATS_BUILT = new Date().toISOString(); // résumés à jour : seule la journée en cours est calculée en direct
    const res = await exec(env, R, () => F.api_stats.apply(null, args));
    await flush(env, R);
    res.pending = R.daysPending;
    return res;
  },
  api_setPrime: gasPage('api_setPrime'),
  api_setGoal: gasPage('api_setGoal'),
  async api_rebuildStats(env, R) {
    needFull(R);
    requireAdmin(R, 'recalculer les statistiques');
    const n = await env.DB.prepare("SELECT COUNT(DISTINCT day) AS n FROM orders WHERE day != ''").first();
    R.rebuildDays = true;
    await flush(env, R);
    return { message: F.plural_(n.n || 0, 'jour sera recalculé', 'jours seront recalculés') + ' dans les minutes qui viennent (quelques jours par minute).' };
  },

  /* Administration */
  async api_pageScript(env, R, args) {
    needFull(R);
    const name = String(args[0] || '');
    const spec = args[1] || null;
    const page = K.LAZY_PAGES_[name];
    if (!page) throw new HttpError(404, 'Page inconnue.');
    run(R, () => { if (page.access === 'admin') F.requireAdmin_(); else F.requireStockAccess_(); });
    const out = { code: run(R, () => F.include(page.file)), preload: null };
    if (spec && spec.fn === page.fn && PAGES[spec.fn]) {
      try {
        const R2 = newReq(R.base, R.user);
        R2.userName = R.userName;
        const a = Array.isArray(spec.args) ? spec.args : [];
        out.preload = { key: spec.fn + '|' + JSON.stringify(a), data: await PAGES[spec.fn](env, R2, a) };
      } catch (e) { out.preload = null; }
    }
    return out;
  },
  async api_adminOverview(env, R) {
    needFull(R);
    requireAdmin(R, 'voir l’administration');
    const res = await exec(env, R, () => ({ connections: F.connectionsData_(), perf: F.readPerf_() }));
    // Releasit : les commandes arrivent par le classeur Google (onglet RELEASIT), puis ici (par le relais en v1.11).
    const ri = relayInfo(R);
    res.connections.releasit = ri.on
      ? { found: true, relay: ri, missing: ri.missing, lastRun: ri.at, lastError: ri.error }
      : { found: true, missing: [], lastRun: R.cfInfo.lastIngest || R.cfInfo.bridgeAt, lastError: '' };
    res.health = workerHealth(R).data;
    res.health.errors = await recentErrors(env);
    res.version = K.APP_VERSION;
    return res;
  },
  async api_health(env, R) {
    needFull(R);
    requireAdmin(R, 'voir l’état de l’outil');
    const h = workerHealth(R).data;
    h.errors = await recentErrors(env);
    return h;
  },
  api_saveEcotrack: gasPage('api_saveEcotrack'),
  api_saveSms: gasPage('api_saveSms'),
  api_saveShopify: gasPage('api_saveShopify'),
  api_settingsGet: gasPage('api_settingsGet'),
  api_settingsSave: gasPage('api_settingsSave'),
  api_smsPreview: gasPage('api_smsPreview'),
  api_smsTest: gasPage('api_smsTest'),
  api_clientsAdmin: gasPage('api_clientsAdmin'),
  api_clearFlag: gasPage('api_clearFlag', async (env, R, args) => {
    const pq = phoneQuery(phonesOf([args[0]]));
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
  }),
  api_ecotrackTest: gasPage('api_ecotrackTest'),
  api_ecotrackSyncFees: gasPage('api_ecotrackSyncFees'),
  api_shopifyTest: gasPage('api_shopifyTest'),
  api_shopifyStatus: gasPage('api_shopifyStatus'),
  api_repair: gasPage('api_repair'),
  api_reinstallTriggers: gasPage('api_reinstallTriggers'),
  async api_shopifyImport(env, R) {
    if (!R.full) return { imported: 0, message: 'Les commandes Shopify arrivent par le classeur Google, toutes les 5 minutes.' };
    const s = await shopifyImport(env, R);
    return Object.assign(s, { message: run(R, () => F.shopifyImportMessage_(s)) });
  },
  async api_archiveNow(env, R) {
    needFull(R);
    requireAdmin(R, 'lancer l’entretien');
    const out = await nightly(env, await loadBase(env));
    return { message: (out.autoCancelled || 0) + ' commande(s) sans réponse annulée(s), ' + (out.archived || 0) + ' archivée(s), ' +
      (out.stock || 0) + ' mouvement(s) de stock, statistiques à jour dans les minutes qui viennent.' };
  }
});

/** Dernières erreurs notées dans le Journal. */
async function recentErrors(env) {
  const r = await env.DB.prepare("SELECT at, who, action, detail FROM journal WHERE action LIKE 'Erreur%' ORDER BY at DESC LIMIT 8").all();
  return (r.results || []).map((x) => ({ date: x.at, who: x.who, action: x.action, detail: x.detail }));
}

/**
 * Shopify (étape 3) : lu par Cloudflare. 1. lecture chez Shopify (rejouée avec les réponses) ;
 * 2. les n° déjà connus (commandes, corbeille, numéros effacés) sont écartés par la base ;
 * 3. les nouvelles sont ajoutées et préparées comme avant (téléphone, wilaya, frais, alerte, SMS).
 */
async function shopifyImport(env, R) {
  const f = await exec(env, R, () => F.shopifyFetch_());
  if (!f.summary.configured) return f.summary;
  const ids = f.rows.map((o) => String(o.id).trim());
  const known = {};
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const ph = placeholders(part.length);
    const r = await env.DB.batch([
      env.DB.prepare('SELECT id FROM orders WHERE id IN (' + ph + ')').bind(...part),
      env.DB.prepare('SELECT id FROM trash WHERE id IN (' + ph + ')').bind(...part),
      env.DB.prepare('SELECT id FROM blocked WHERE id IN (' + ph + ')').bind(...part)
    ]);
    r.forEach((x) => (x.results || []).forEach((y) => { known[y.id] = true; }));
  }
  const fresh = f.rows.filter((o) => !known[String(o.id).trim()]);
  f.summary.skipped += f.rows.length - fresh.length;
  const pq = phoneQuery(phonesOf(fresh.map((o) => o.phone)));
  if (pq) await loadWhere(env, R, pq[0], pq[1]); // doublons et historique du client (alerte)
  R.trashIds = Object.assign({}, known);
  await exec(env, R, () => {
    const ctx = F.readOrders_();
    f.summary.imported = fresh.length ? F.shopifyAddRows_(ctx, fresh, f.summary) : 0;
    F.shopifyDone_(f.newest);
    if (f.summary.imported) F.processNewRowsNow_();
  });
  await flush(env, R);
  if (f.summary.imported) await notifyNewOrders(env, R.base, R.inserts.map((o) => ({ id: String(o.id), client: o.client, wilaya: o.wilaya, product: o.product, total: o.total }))).catch(() => null);
  return f.summary;
}

/* ---------------- Relais RELEASIT (v1.11) ---------------- */

/** n° déjà connus (commandes, corbeille, numéros effacés) : une commande n'est jamais ajoutée deux fois. */
async function knownIds(env, ids) {
  const known = {};
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const ph = placeholders(part.length);
    const r = await env.DB.batch([
      env.DB.prepare('SELECT id FROM orders WHERE id IN (' + ph + ')').bind(...part),
      env.DB.prepare('SELECT id FROM trash WHERE id IN (' + ph + ')').bind(...part),
      env.DB.prepare('SELECT id FROM blocked WHERE id IN (' + ph + ')').bind(...part)
    ]);
    r.forEach((x) => (x.results || []).forEach((y) => { known[y.id] = true; }));
  }
  return known;
}

/**
 * Lignes de l'onglet RELEASIT envoyées par le relais (Relais.gs) : transformées en commandes avec la
 * même logique que la version Google (Releasit.gs), puis préparées (téléphone, wilaya, alerte…).
 * body : { header, rows, from (n° de la 1re ligne envoyée), more (lot coupé : d'autres lignes suivent),
 * resync (repère perdu : seulement les 7 derniers jours) }.
 * Réponse : { next (prochaine ligne à envoyer), col (colonne du n° de commande, 1 = A), added, skipped, ignored, missing }.
 */
async function releasitIngest(env, base, body) {
  const R = newReq(base, { email: '' });
  const header = Array.isArray(body.header) ? body.header : [];
  const rows = (Array.isArray(body.rows) ? body.rows : []).map((r) => (Array.isArray(r) ? r.map(F.cfCellIn_) : []));
  const from = Math.max(2, Math.round(Number(body.from)) || 2);
  const col = run(R, () => F.releasitColumns_(header));
  const missing = run(R, () => F.releasitMissing_(col));
  if (col.id === undefined) throw new HttpError(400, 'Onglet RELEASIT : colonne « Order ID » (n° de commande) introuvable. Ne renommez pas les titres de la première ligne.');
  // Lot coupé : la dernière commande attend le lot suivant (ses autres lignes, une par produit, peuvent suivre).
  let use = rows.length;
  if (body.more && rows.length > 1) {
    const text = (r) => F.releasitText_(r[col.id]);
    let i = rows.length - 1;
    while (i > 0 && text(rows[i - 1]) === text(rows[rows.length - 1])) i--;
    if (i > 0) use = i;
  }
  const since = body.resync ? new Date(Date.now() - K.RELEASIT.DAYS * 86400000) : null;
  const found = run(R, () => F.releasitCandidates_(col, rows.slice(0, use), since));
  const known = await knownIds(env, found.candidates.map((o) => String(o.id).trim()));
  const fresh = found.candidates.filter((o) => !known[String(o.id).trim()]);
  if (fresh.length) {
    const pq = phoneQuery(phonesOf(fresh.map((o) => o.phone)));
    if (pq) await loadWhere(env, R, pq[0], pq[1]); // doublons et historique du client (alerte)
    R.trashIds = Object.assign({}, known);
  }
  await exec(env, R, () => {
    if (fresh.length) {
      F.appendOrders_(F.readOrders_(), fresh);
      F.log_({ name: 'Releasit' }, '', 'Transfert Releasit', fresh.length + ' nouvelle(s) commande(s) : ' + fresh.map((o) => o.id).join(', '));
      F.processNewRowsNow_();
    }
    if (found.ignored) F.log_({ name: 'Releasit' }, '', 'Transfert Releasit', found.ignored + ' ligne(s) de l’onglet RELEASIT ignorée(s) : sans n° de commande, ou sans nom ni téléphone');
  });
  if (fresh.length) R.extra.push(kvSet(env, 'cf:lastIngest', new Date().toISOString()));
  await flush(env, R);
  return { next: from + use, col: col.id + 1, added: fresh.map((o) => String(o.id)), skipped: found.candidates.length - fresh.length, ignored: found.ignored, missing: missing,
    orders: fresh.map((o) => ({ id: String(o.id), client: o.client, wilaya: o.wilaya, product: o.product, total: o.total })) };
}

/**
 * Un seul envoi de SMS à la fois (tâche de chaque minute, ou commande qui vient d'arriver) : sinon,
 * deux envois en même temps pourraient envoyer deux fois le même SMS. Verrou de 90 s au plus.
 */
async function smsLock(env) {
  const now = Date.now();
  const r = await env.DB.prepare("INSERT INTO kv (key, value) VALUES ('cf:smsLock', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value " +
    'WHERE CAST(kv.value AS INTEGER) < ?2 RETURNING value').bind(String(now), now - 90000).all();
  return (r.results || []).length ? String(now) : '';
}
async function smsUnlock(env, lock) {
  if (lock) await env.DB.prepare("DELETE FROM kv WHERE key = 'cf:smsLock' AND value = ?").bind(lock).run();
}

/** Envoie les SMS en attente (SMS_QUEUE), sous le verrou. */
async function sendSmsNow(env, base) {
  const lock = await smsLock(env);
  if (!lock) return { sent: 0, busy: true };
  try {
    const R = newReq(base, { email: '' });
    if (!(await loadSmsOrders(env, R))) return { sent: 0 };
    const r = await exec(env, R, () => F.sendSmsQueue_({}));
    await flush(env, R);
    return r;
  } finally {
    await smsUnlock(env, lock);
  }
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
    return { orders: r[0].results[0].n, archived: r[1].results[0].n, trash: r[2].results[0].n, importedAt: r[3].results[0] ? r[3].results[0].value : '', live: !!cf['cf:live'], full: !!cf['cf:full'] };
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
    const allowed = ['ECOTRACK_URL', 'ECOTRACK_TOKEN', 'SMS_API_KEY', 'SMS_FROM', 'OWNER_EMAIL',
      'SHOPIFY_SHOP', 'SHOPIFY_TOKEN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'SHOPIFY_LAST_IMPORT'];
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
    // Personnes qui ont accès au classeur (page Équipe de la version Cloudflare).
    if (Array.isArray(body.editors)) st.push(db.prepare("INSERT INTO kv (key, value) VALUES ('cf:editors', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(body.editors.map((e) => String(e).toLowerCase()))));
    if (st.length) await db.batch(st);
    return { ok: true, written: st.length };
  }

  // Étape 3 : tout dans Cloudflare (stock, Bénéfices, Statistiques, Administration ; Shopify lu d'ici).
  if (path === '/bridge/full') {
    const st = [];
    if (body.full === false) st.push(db.prepare("DELETE FROM kv WHERE key = 'cf:full'"));
    else {
      st.push(db.prepare("INSERT INTO kv (key, value) VALUES ('cf:full', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(new Date().toISOString()));
      // Résumés par jour : tous calculés une première fois (quelques jours par minute).
      st.push(db.prepare("INSERT OR IGNORE INTO days (day, stale) SELECT DISTINCT day, 1 FROM orders WHERE day != ''"));
      st.push(db.prepare('UPDATE days SET stale = stale + 1'));
    }
    await db.batch(st);
    const m = await db.prepare('SELECT COALESCE(MAX(seq), 0) AS m FROM changes').first();
    return { full: body.full !== false, seq: m.m };
  }

  /*
   * Onglets envoyés par Apps Script (étape 3) : au passage à l'étape 3 (tous), puis quand un onglet est
   * modifié à la main dans le classeur. base[nom] = dernier changement de cet onglet recopié dans le
   * classeur : si la version Cloudflare l'a modifié depuis, la modification à la main est refusée
   * (la version Cloudflare l'emporte et sera recopiée).
   */
  if (path === '/bridge/tabs') {
    const tabs = body.tabs || {};
    const names = Object.keys(tabs).filter((n) => F.isCfTab_(n));
    const out = { saved: [], refused: [] };
    for (const name of names) {
      if (body.base && body.base[name] !== undefined) {
        const last = await db.prepare("SELECT MAX(seq) AS m FROM changes WHERE kind = 'tab' AND order_id = ?").bind(name).first();
        if (last && last.m !== null && last.m > Number(body.base[name])) { out.refused.push(name); continue; }
      }
      const rows = (tabs[name] || []).map((r) => (Array.isArray(r) ? r : []));
      const st = [db.prepare('DELETE FROM tabs WHERE name = ?').bind(name)];
      const parts = Math.max(Math.ceil(rows.length / TAB_PART), 1);
      for (let p = 0; p < parts; p++) st.push(db.prepare('INSERT INTO tabs (name, part, rev, rows) VALUES (?, ?, 1, ?)').bind(name, p, JSON.stringify(rows.slice(p * TAB_PART, (p + 1) * TAB_PART))));
      await db.batch(st);
      out.saved.push(name);
    }
    // Réglages recalculés depuis les onglets reçus (et résumés par jour à refaire si les coûts ou frais changent).
    if (out.saved.length) {
      const base = await loadBase(env);
      const R = newReq(base, { email: '' });
      R.full = true; R.tabStore = R.tabStore || {};
      const keys = [];
      out.saved.forEach((n) => run(R, () => F.configKeysFor_(n)).forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); }));
      await exec(env, R, () => F.clearConfigCache_(keys));
      await flush(env, R);
    }
    return out;
  }

  // Étape 3 : historique des mouvements de stock du classeur (copié au passage à l'étape 3, sans repartir vers le classeur).
  if (path === '/bridge/moves') {
    const now = new Date().toISOString();
    const rows = (body.rows || []).filter((r) => Array.isArray(r)).map((r) => [r[0] && r[0].$d ? String(r[0].$d) : now, JSON.stringify(r)]);
    const st = [];
    if (body.reset) st.push(db.prepare('DELETE FROM moves'));
    if (rows.length) st.push(db.prepare("INSERT INTO moves (at, row) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)").bind(JSON.stringify(rows)));
    if (st.length) await db.batch(st);
    return { saved: rows.length };
  }

  /*
   * Relais RELEASIT (v1.11, Relais.gs) : le petit script Google envoie chaque minute les nouvelles
   * lignes de l'onglet RELEASIT (ou seulement « je suis là »). Installer le relais passe en mode relais :
   * plus de recopie vers le classeur, plus de connexion par Google.
   */
  if (path === '/bridge/releasit') {
    if (!cf['cf:full']) throw new HttpError(409, 'Passez d’abord à l’étape 3 (Administration › Connexions › Cloudflare).');
    const now = new Date().toISOString();
    const st = [kvSet(env, 'cf:relayAt', now)];
    if (body.install) {
      st.push(kvSet(env, 'cf:relay', now));
      st.push(db.prepare("DELETE FROM kv WHERE key IN ('cf:gateway', 'cf:editors')"));
      st.push(db.prepare('DELETE FROM changes'));
    }
    await db.batch(st);
    const info = { at: now, lastRow: Number(body.lastRow) || 0, version: String(body.version || ''), error: '' };
    let res = { next: Number(body.from) || 0, added: [], skipped: 0, ignored: 0, missing: [] };
    try {
      if (Array.isArray(body.rows) && body.rows.length) res = await releasitIngest(env, await loadBase(env), body);
    } catch (e) {
      info.error = String(e && e.message ? e.message : e).slice(0, 300);
    }
    let prev = {};
    try { prev = JSON.parse(cf['cf:relayInfo'] || '{}') || {}; } catch (e) { prev = {}; }
    info.missing = res.missing && res.missing.length ? res.missing : (Array.isArray(body.rows) && body.rows.length ? [] : prev.missing || []);
    info.lastAdd = res.added.length ? now : prev.lastAdd || '';
    info.lastIds = res.added.length ? res.added.slice(-5) : prev.lastIds || [];
    await kvSet(env, 'cf:relayInfo', JSON.stringify(info)).run();
    if (info.error) throw new HttpError(400, info.error);
    // SMS « commande reçue » tout de suite (sans attendre la tâche de la minute suivante), et notifications.
    if (res.added.length) {
      const base = await loadBase(env);
      if (base.props.SMS_API_KEY) await sendSmsNow(env, base).catch(() => null);
      await notifyNewOrders(env, base, res.orders || []).catch(() => null);
    }
    delete res.orders;
    return res;
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
    const freshDays = {};
    fresh.forEach((o) => { const d = rowOf(o).day; if (d) freshDays[d] = true; });
    Object.keys(freshDays).forEach((d) => st.push(db.prepare('INSERT INTO days (day, stale) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET stale = stale + 1').bind(d)));
    await db.batch(st);
    // Étape 3 : le SMS « commande reçue » part d'ici (plus du classeur).
    if (cf['cf:full'] && fresh.length) {
      const base = await loadBase(env);
      const R = newReq(base, { email: '' });
      run(R, () => {
        fresh.forEach((o) => { if (o.status) F.noteStatusChange_(o, o.status); });
        F.flushSmsPending_();
      });
      await flush(env, R);
      await notifyNewOrders(env, base, fresh).catch(() => null);
    }
    return { added: fresh.map((o) => String(o.id).trim()), skipped: list.length - fresh.length };
  }

  // Changements à recopier dans le classeur, dans l'ordre (seq).
  if (path === '/bridge/changes') {
    await db.prepare("INSERT INTO kv (key, value) VALUES ('cf:bridgeAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(new Date().toISOString()).run();
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
    // Un onglet changé plusieurs fois : ses paquets de lignes touchés, tels qu'ils sont maintenant.
    const seen = {};
    const out = [];
    const tabs = {};
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const k = r.kind + '|' + r.order_id;
      if (r.kind === 'tab') {
        let info = {};
        try { info = JSON.parse(r.info || '{}'); } catch (e) { info = {}; }
        const t = tabs[r.order_id] || (tabs[r.order_id] = { seq: r.seq, n: info.n, parts: {} });
        (info.parts || []).forEach((p) => { t.parts[p] = true; });
        continue;
      }
      if (r.kind === 'moves') { out.unshift({ seq: r.seq, id: r.order_id, kind: r.kind, info: r.info || '' }); continue; }
      if (/^(insert|update)$/.test(r.kind)) { if (seen['o|' + r.order_id]) continue; seen['o|' + r.order_id] = true; }
      else if (seen[k]) continue;
      seen[k] = true;
      out.unshift({ seq: r.seq, id: r.order_id, kind: r.kind, info: r.info || '', order: data[r.order_id] || null });
    }
    for (const name of Object.keys(tabs)) {
      const t = tabs[name];
      const want = Object.keys(t.parts).map(Number).filter((p) => p * TAB_PART < t.n);
      const parts = {};
      if (want.length) {
        const r = await db.prepare('SELECT part, rows FROM tabs WHERE name = ? AND part IN (' + placeholders(want.length) + ')').bind(name, ...want).all();
        (r.results || []).forEach((x) => { parts[x.part] = JSON.parse(x.rows); });
      }
      out.push({ seq: t.seq, id: name, kind: 'tab', info: '', tab: { n: t.n, size: TAB_PART, parts: parts } });
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
      ['orders', 'trash', 'blocked', 'changes', 'journal', 'guard', 'tabs', 'moves', 'days'].forEach((t) => st.push(db.prepare('DELETE FROM ' + t)));
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
/* Notifications sur le téléphone (Web Push, v1.12)                 */
/* ================================================================ */

/*
 * Chaque téléphone qui active les notifications donne un « abonnement » (adresse chez Google, Apple ou
 * Mozilla + deux clés). Pour envoyer, le moteur chiffre le message (aes128gcm, RFC 8291) et signe la
 * demande avec sa propre clé (VAPID, RFC 8292) : seul ce téléphone peut lire le message.
 * Choix par appareil : nouvelles commandes, rappels à l'heure, colis à traiter et problèmes de l'outil
 * (administrateur), silence la nuit (22 h à 8 h).
 */
const PUSH_KINDS = ['orders', 'callbacks', 'tracking', 'problems'];

function bytesOf(b64) {
  let s = String(b64 || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function concatBytes(...parts) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return out;
}

/** Clés VAPID de l'application (créées une fois, gardées dans la base). */
async function vapidKeys(env, base) {
  let v = null;
  try { v = JSON.parse(base.secret['cf:vapid'] || 'null'); } catch (e) { v = null; }
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const made = { jwk: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64url(await crypto.subtle.exportKey('raw', kp.publicKey)) };
    await env.DB.prepare("INSERT OR IGNORE INTO kv (key, value) VALUES ('cf:vapid', ?)").bind(JSON.stringify(made)).run();
    const r = await env.DB.prepare("SELECT value FROM kv WHERE key = 'cf:vapid'").first();
    base.secret['cf:vapid'] = r.value;
    v = JSON.parse(r.value);
  }
  return v;
}

/** En-tête « vapid t=…, k=… » pour un service de notifications (un par service et par envoi groupé). */
async function vapidHeader(v, endpoint, origin, cache) {
  const aud = new URL(endpoint).origin;
  if (cache[aud]) return cache[aud];
  const head = b64urlText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64urlText(JSON.stringify({ aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: origin || 'https://dz-smart-shop.workers.dev' }));
  const key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + body));
  cache[aud] = 'vapid t=' + head + '.' + body + '.' + b64url(sig) + ', k=' + v.pub;
  return cache[aud];
}

/** Message chiffré pour un abonnement (RFC 8291, aes128gcm, un seul bloc). */
async function encryptPush(sub, text) {
  const uaPub = bytesOf(sub.p256dh);
  const authSecret = bytesOf(sub.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const hkdf = async (salt, ikm, info, len) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: info }, k, len * 8));
  };
  const enc = new TextEncoder();
  const ikm = await hkdf(authSecret, shared, concatBytes(enc.encode('WebPush: info\u0000'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\u0000'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\u0000'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concatBytes(enc.encode(text), new Uint8Array([2]))));
  const head = new Uint8Array(21 + asPub.length);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPub.length;
  head.set(asPub, 21);
  return concatBytes(head, ct);
}

function pushPrefs(row, role) {
  let p = {};
  try { p = JSON.parse(row && row.prefs || '{}') || {}; } catch (e) { p = {}; }
  const admin = /^admin/.test(F.normalizeText_(role || ''));
  const def = { orders: !/^magasin/.test(F.normalizeText_(role || '')), callbacks: !/^magasin/.test(F.normalizeText_(role || '')), tracking: admin, problems: admin, quiet: true };
  const out = {};
  Object.keys(def).forEach((k) => { out[k] = typeof p[k] === 'boolean' ? p[k] : def[k]; });
  if (!admin) { out.tracking = false; out.problems = false; }
  return out;
}
function algiersHourNow() { return new Date(Date.now() + 3600000).getUTCHours(); }

/**
 * Envoie une notification à tous les appareils dont les choix acceptent ce genre (kind), à des personnes
 * encore dans l'équipe ; members : seulement ces personnes (clés), si la liste n'est pas vide.
 * Abonnement expiré (404, 410) : effacé. Renvoie le nombre de notifications parties.
 */
async function pushTo(env, base, kind, payload, opts) {
  opts = opts || {};
  const subs = (await env.DB.prepare('SELECT * FROM push_subs').all()).results || [];
  if (!subs.length) return { sent: 0 };
  const team = opts.team || await teamRows(env, base);
  const byKey = {};
  team.forEach((t) => { byKey[t[0]] = t; });
  const night = (() => { const hr = algiersHourNow(); return hr >= 22 || hr < 8; })();
  const targets = subs.filter((s) => {
    const m = byKey[s.member];
    if (!m) return false;
    if (opts.members && opts.members.length && opts.members.indexOf(s.member) < 0) return false;
    const p = pushPrefs(s, m[2]);
    if (opts.test) return true;
    return !!p[kind] && !(p.quiet && night);
  });
  if (!targets.length) return { sent: 0 };
  const v = await vapidKeys(env, base);
  const cache = {};
  const text = JSON.stringify(Object.assign({ at: Date.now() }, payload));
  const now = new Date().toISOString();
  const st = [];
  let sent = 0;
  for (const s of targets) {
    let status = 0;
    try {
      const res = await fetch(s.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream', 'content-encoding': 'aes128gcm', ttl: String(opts.ttl || 6 * 3600), urgency: 'high',
          authorization: await vapidHeader(v, s.endpoint, base.secret['cf:origin'], cache) },
        body: await encryptPush(s, text)
      });
      status = res.status;
    } catch (e) { status = 0; }
    if (status >= 200 && status < 300) { sent++; st.push(env.DB.prepare('UPDATE push_subs SET last_ok = ?, fails = 0 WHERE id = ?').bind(now, s.id)); }
    else if (status === 404 || status === 410) st.push(env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(s.id));
    else st.push(env.DB.prepare('UPDATE push_subs SET fails = fails + 1 WHERE id = ?').bind(s.id));
  }
  if (st.length) await env.DB.batch(st);
  return { sent: sent, targets: targets.length };
}

function wilayaShort(w) { return String(w || '').replace(/^\d+\s*-\s*/, ''); }
function orderLink(id, route) { return '/?o=' + encodeURIComponent(String(id)) + '#/' + (route || 'confirmation'); }

/** Nouvelles commandes (relais RELEASIT, Shopify) : une notification par commande (au plus 3), sinon une seule. */
async function notifyNewOrders(env, base, orders) {
  const list = (orders || []).filter((o) => o && o.id);
  if (!list.length) return { sent: 0 };
  const has = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first();
  if (!has || !has.n) return { sent: 0 };
  const team = await teamRows(env, base);
  if (list.length > 3) {
    return pushTo(env, base, 'orders', { title: list.length + ' nouvelles commandes', body: list.slice(0, 6).map((o) => o.id).join(', ') + (list.length > 6 ? '…' : ''), tag: 'new-batch', url: '/#/confirmation' }, { team: team });
  }
  let sent = 0;
  for (const o of list) {
    const total = Number(F.toNumber_(o.total)) || 0;
    const r = await pushTo(env, base, 'orders', {
      title: 'Nouvelle commande ' + o.id,
      body: [String(o.client || '').trim(), wilayaShort(o.wilaya), String(o.product || '').trim(), total ? F.fmtAmount_(total) + ' DA' : ''].filter(Boolean).join(' · '),
      tag: 'new-' + o.id, url: orderLink(o.id)
    }, { team: team });
    sent += r.sent;
  }
  return { sent: sent };
}

/** Rappels à l'heure : commandes dont l'heure de rappel est passée depuis le dernier passage. */
async function notifyCallbacks(env, base) {
  const has = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first();
  const now = new Date().toISOString();
  const last = base.secret['cf:pushCbAt'] || new Date(Date.now() - 2 * 60000).toISOString();
  await kvSet(env, 'cf:pushCbAt', now).run();
  if (!has || !has.n) return { sent: 0 };
  const r = await env.DB.prepare("SELECT id, data FROM orders WHERE archived = 0 AND stage = 'todo' AND callback > ? AND callback <= ? LIMIT 20").bind(last, now).all();
  const list = (r.results || []).map((x) => JSON.parse(x.data));
  if (!list.length) return { sent: 0 };
  const team = await teamRows(env, base);
  let sent = 0;
  for (const o of list) {
    // La confirmatrice qui a programmé le rappel (si elle a les notifications), sinon toute l'équipe.
    const who = team.filter((t) => t[1] && String(o.agent || '').trim() && t[1] === String(o.agent).trim()).map((t) => t[0]);
    const res = await pushTo(env, base, 'callbacks', {
      title: 'Rappel : à appeler maintenant',
      body: [String(o.client || '').trim() + ' (' + o.id + ')', wilayaShort(o.wilaya), o.attempts ? 'appel n° ' + (Number(o.attempts) + 1) : ''].filter(Boolean).join(' · '),
      tag: 'cb-' + o.id, url: orderLink(o.id)
    }, { team: team, members: who });
    if (!res.sent && who.length) sent += (await pushTo(env, base, 'callbacks', { title: 'Rappel : à appeler maintenant', body: String(o.client || '').trim() + ' (' + o.id + ')', tag: 'cb-' + o.id, url: orderLink(o.id) }, { team: team })).sent;
    else sent += res.sent;
  }
  return { sent: sent };
}

/* ================================================================ */
/* Connexion par téléphone et mot de passe (v1.11)                  */
/* ================================================================ */

/*
 * Chaque personne de l'équipe se connecte avec son téléphone (colonne Téléphone de l'onglet Équipe) et
 * un mot de passe. Le mot de passe n'est jamais gardé tel quel : seulement son empreinte (PBKDF2, avec
 * un sel par personne et une clé de l'application). Un mot de passe provisoire (donné par
 * l'administrateur) doit être changé à la première connexion. 5 essais faux : bloqué 15 minutes.
 * Chaque appareil reçoit un jeton « v2.<données>.<signature> » valable 30 jours, qu'on peut couper
 * (table sessions). Secours : code de secours (administrateur) ou code reçu par SMS.
 */
const SESSION_DAYS = 30;
const PW_ITER = 20000;        // assez pour la version gratuite (calcul de quelques ms)
const PW_MIN = 6;
const LOCK_FAILS = 5;
const LOCK_MIN = 15;
const CODE_MIN = 10;          // code SMS valable 10 minutes
const CODE_PER_HOUR = 3;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomText(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[b[i] % ALPHABET.length];
  return out;
}
/** Mot de passe provisoire : « K7M4-QXPA » (sans 0/O ni 1/I, majuscules ou minuscules acceptées). */
function provisionalPassword() { const t = randomText(8); return t.slice(0, 4) + '-' + t.slice(4); }
/** Code de secours de l'administrateur : « 7KQ2-M9XA-4TPL ». */
function rescueCodeText() { const t = randomText(12); return t.slice(0, 4) + '-' + t.slice(4, 8) + '-' + t.slice(8); }
function cleanCode(c) { return String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

async function authKey(env, base) {
  let k = base.secret['cf:authKey'];
  if (!k) {
    await env.DB.prepare("INSERT OR IGNORE INTO kv (key, value) VALUES ('cf:authKey', ?)").bind(b64url(crypto.getRandomValues(new Uint8Array(32)))).run();
    k = (await env.DB.prepare("SELECT value FROM kv WHERE key = 'cf:authKey'").first()).value;
    base.secret['cf:authKey'] = k;
  }
  return k;
}

/** Empreinte d'un mot de passe (ou d'un code) : PBKDF2-SHA256, sel propre, clé de l'application. */
async function pwHash(key, text, salt, iter) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(key + '\u0000' + text), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: iter }, material, 256);
  return b64url(bits);
}

function phoneOf(raw) {
  const p = F.normalizePhone(raw);
  return p.valid ? p.phone : '';
}

function checkNewPassword(pw, phone) {
  pw = String(pw == null ? '' : pw).trim();
  if (pw.length < PW_MIN) throw new HttpError(400, 'Mot de passe trop court : au moins ' + PW_MIN + ' caractères.', 'input');
  if (pw.length > 100) throw new HttpError(400, 'Mot de passe trop long.', 'input');
  if (pw.replace(/\D/g, '') === phone || cleanCode(pw) === cleanCode(phone)) throw new HttpError(400, 'Le mot de passe ne doit pas être votre numéro de téléphone.', 'input');
  return pw;
}

async function authRow(env, phone) {
  return env.DB.prepare('SELECT * FROM auth WHERE phone = ?').bind(phone).first();
}

/** Enregistre un mot de passe (provisoire : temp = 1). Renvoie les instructions D1 (pas encore exécutées). */
async function setPasswordStatements(env, base, phone, password, temp) {
  const key = await authKey(env, base);
  const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const text = temp ? cleanCode(password) : String(password).trim();
  const hash = await pwHash(key, text, salt, PW_ITER);
  const now = new Date().toISOString();
  return [env.DB.prepare("INSERT INTO auth (phone, hash, salt, iter, temp, fails, locked, code, code_until, code_tries, updated) VALUES (?, ?, ?, ?, ?, 0, '', '', '', 0, ?) " +
    "ON CONFLICT(phone) DO UPDATE SET hash = excluded.hash, salt = excluded.salt, iter = excluded.iter, temp = excluded.temp, fails = 0, locked = '', code = '', code_until = '', code_tries = 0, updated = excluded.updated")
    .bind(phone, hash, salt, PW_ITER, temp ? 1 : 0, now)];
}

async function passwordMatches(env, base, row, password) {
  if (!row || !row.hash) return false;
  const key = await authKey(env, base);
  const text = row.temp ? cleanCode(password) : String(password == null ? '' : password).trim();
  return sameText(await pwHash(key, text, row.salt, row.iter || PW_ITER), row.hash);
}

/** Essai faux : compté ; au 5e, le compte est bloqué 15 minutes. */
function failStatement(env, row) {
  const fails = (row.fails || 0) + 1;
  if (fails >= LOCK_FAILS) {
    return env.DB.prepare("UPDATE auth SET fails = 0, locked = ? WHERE phone = ?").bind(new Date(Date.now() + LOCK_MIN * 60000).toISOString(), row.phone);
  }
  return env.DB.prepare('UPDATE auth SET fails = ? WHERE phone = ?').bind(fails, row.phone);
}
function lockedMessage(row) {
  if (!row || !row.locked || Date.parse(row.locked) <= Date.now()) return '';
  const min = Math.max(1, Math.ceil((Date.parse(row.locked) - Date.now()) / 60000));
  return 'Trop d’essais faux : réessayez dans ' + min + ' min (ou demandez un nouveau mot de passe à l’administrateur).';
}

function deviceLabel(request) {
  const ua = String(request.headers.get('user-agent') || '');
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iPhone' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : '';
  const br = /samsungbrowser/i.test(ua) ? 'Samsung Internet' : /edg\//i.test(ua) ? 'Edge' : /firefox|fxios/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : '';
  return [os, br].filter(Boolean).join(' · ') || 'Appareil';
}

/** Nouvel appareil connecté : jeton signé (30 jours). */
async function newSession(env, base, phone, temp, device) {
  const key = await authKey(env, base);
  const id = b64url(crypto.getRandomValues(new Uint8Array(18)));
  const now = new Date();
  const x = now.getTime() + SESSION_DAYS * 86400000;
  const head = 'v2.' + b64urlText(JSON.stringify({ s: id, x: x }));
  const token = head + '.' + await hmac(key, head);
  return {
    token: token, x: x, id: id,
    statement: env.DB.prepare('INSERT INTO sessions (id, phone, created, seen, device, temp, revoked) VALUES (?, ?, ?, ?, ?, ?, 0)')
      .bind(id, phone, now.toISOString(), now.toISOString(), String(device || '').slice(0, 60), temp ? 1 : 0)
  };
}

/** Jeton « v2 » valable : la ligne de l'appareil (non coupée, moins de 30 jours), sinon null. */
async function verifySession(env, base, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v2') return null;
  const key = await authKey(env, base);
  if (!sameText(await hmac(key, parts[0] + '.' + parts[1]), parts[2])) return null;
  let p;
  try { p = JSON.parse(fromB64url(parts[1])); } catch (e) { return null; }
  if (!p || !p.s || !(p.x > Date.now())) return null;
  const s = await env.DB.prepare('SELECT id, phone, temp, revoked, seen, created FROM sessions WHERE id = ?').bind(String(p.s)).first();
  if (!s || s.revoked || Date.parse(s.created) + SESSION_DAYS * 86400000 < Date.now()) return null;
  if (Date.now() - Date.parse(s.seen) > 15 * 60000) await env.DB.prepare('UPDATE sessions SET seen = ? WHERE id = ?').bind(new Date().toISOString(), s.id).run();
  return s;
}

function revokeStatement(env, phone, keepId) {
  return env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE phone = ? AND revoked = 0 AND id != ?').bind(phone, keepId || '');
}

/** Lignes de l'onglet Équipe (avec le téléphone de chaque personne). */
async function teamRows(env, base) {
  const R = newReq(base, { email: '' });
  const team = await exec(env, R, () => F.readTeam_());
  await flush(env, R);
  return team;
}
function teamByPhone(team, phone) { return team.filter((t) => t[3] === phone)[0] || null; }

function journalStatement(env, who, action, detail) {
  return env.DB.prepare('INSERT INTO journal (at, who, order_id, action, detail) VALUES (?, ?, ?, ?, ?)').bind(new Date().toISOString(), String(who || ''), '', action, String(detail || '').slice(0, 500));
}

/**
 * Pages publiques de connexion :
 *   POST /auth/login      { phone, password }                 → { token, x, key, change }
 *   POST /auth/change     { password, old } (jeton)           → nouveau mot de passe (le provisoire, ou depuis Mon compte)
 *   POST /auth/sms        { phone }                           → code à 6 chiffres envoyé par SMS
 *   POST /auth/sms-check  { phone, code, password }           → nouveau mot de passe avec le code SMS
 *   POST /auth/rescue     { phone, code, password }           → nouveau mot de passe avec le code de secours
 *   POST /auth/logout     (jeton)                             → cet appareil est déconnecté
 */
async function authRoute(request, env, path) {
  if (request.method !== 'POST') throw new HttpError(405, 'Méthode non permise.');
  const base = await loadBase(env);
  let body = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  body = body || {};
  const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const device = deviceLabel(request);

  if (path === '/auth/login') {
    const phone = phoneOf(body.phone);
    const wrong = new HttpError(401, 'Téléphone ou mot de passe incorrect.', 'login');
    if (!phone) throw new HttpError(400, 'Tapez votre numéro de téléphone (ex. 0661 22 33 44).', 'login');
    const row = await authRow(env, phone);
    const locked = lockedMessage(row);
    if (locked) throw new HttpError(429, locked, 'login');
    const team = await teamRows(env, base);
    const member = teamByPhone(team, phone);
    if (!row || !member) {
      await pwHash(await authKey(env, base), 'x', 'x', PW_ITER); // même durée de réponse
      throw wrong;
    }
    if (!(await passwordMatches(env, base, row, body.password))) {
      await env.DB.batch([failStatement(env, row), journalStatement(env, member[1], 'Connexion refusée', 'Mot de passe faux (' + device + ')')]);
      throw wrong;
    }
    const s = await newSession(env, base, phone, row.temp, device);
    await env.DB.batch([s.statement, env.DB.prepare("UPDATE auth SET fails = 0, locked = '' WHERE phone = ?").bind(phone),
      journalStatement(env, member[1], 'Connexion', device)]);
    return { token: s.token, x: s.x, key: member[0], name: member[1], change: !!row.temp };
  }

  if (path === '/auth/change') {
    const s = await verifySession(env, base, bearer);
    if (!s) throw new HttpError(401, 'Connexion expirée : reconnectez-vous.', 'auth');
    const row = await authRow(env, s.phone);
    if (!row) throw new HttpError(401, 'Connexion expirée : reconnectez-vous.', 'auth');
    if (!s.temp && !row.temp && !(await passwordMatches(env, base, row, body.old))) {
      await env.DB.batch([failStatement(env, row)]);
      throw new HttpError(400, 'Mot de passe actuel incorrect.', 'input');
    }
    const pw = checkNewPassword(body.password, s.phone);
    const team = await teamRows(env, base);
    const member = teamByPhone(team, s.phone);
    const st = await setPasswordStatements(env, base, s.phone, pw, false);
    st.push(env.DB.prepare('UPDATE sessions SET temp = 0 WHERE id = ?').bind(s.id));
    st.push(revokeStatement(env, s.phone, s.id)); // les autres appareils sont déconnectés
    st.push(journalStatement(env, member ? member[1] : s.phone, 'Mot de passe changé', device));
    await env.DB.batch(st);
    return { ok: true, message: 'Mot de passe enregistré.' };
  }

  if (path === '/auth/sms') {
    const phone = phoneOf(body.phone);
    if (!phone) throw new HttpError(400, 'Tapez votre numéro de téléphone (ex. 0661 22 33 44).', 'input');
    if (!base.props.SMS_API_KEY) throw new HttpError(400, 'Les SMS ne sont pas configurés : demandez un nouveau mot de passe à l’administrateur.', 'input');
    const done = { message: 'Si ce numéro est dans l’équipe, un code vient de lui être envoyé par SMS (valable ' + CODE_MIN + ' minutes).' };
    const team = await teamRows(env, base);
    const member = teamByPhone(team, phone);
    if (!member) return done;
    const row = await authRow(env, phone);
    let sent = [];
    try { sent = JSON.parse((row && row.code_sent) || '[]').filter((t) => Date.now() - Date.parse(t) < 3600000); } catch (e) { sent = []; }
    if (sent.length >= CODE_PER_HOUR) throw new HttpError(429, 'Déjà ' + CODE_PER_HOUR + ' codes envoyés cette heure-ci : réessayez plus tard.', 'input');
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    const salt = b64url(crypto.getRandomValues(new Uint8Array(12)));
    const hash = await pwHash(await authKey(env, base), 'sms:' + code, salt, 2000);
    const R = newReq(base, { email: '' });
    const reqId = 'auth-' + phone + '-' + Date.now();
    const r = await exec(env, R, () => F.httpsmsSend_(F.smsConfig_(), F.smsNumber_(phone), 'DZ Smart Shop : votre code est ' + code + ' (valable ' + CODE_MIN + ' minutes). Ne le donnez à personne.', reqId));
    if (!r || !r.ok) throw new HttpError(502, 'Le SMS n’est pas parti' + (r && r.message ? ' : ' + r.message : '.'), 'input');
    sent.push(new Date().toISOString());
    await env.DB.batch([
      env.DB.prepare("INSERT INTO auth (phone, code, code_until, code_tries, code_sent, updated) VALUES (?, ?, ?, 0, ?, ?) " +
        'ON CONFLICT(phone) DO UPDATE SET code = excluded.code, code_until = excluded.code_until, code_tries = 0, code_sent = excluded.code_sent')
        .bind(phone, salt + '.' + hash, new Date(Date.now() + CODE_MIN * 60000).toISOString(), JSON.stringify(sent), new Date().toISOString()),
      journalStatement(env, member[1], 'Code de connexion envoyé par SMS', device)
    ]);
    return done;
  }

  if (path === '/auth/sms-check' || path === '/auth/rescue') {
    const phone = phoneOf(body.phone);
    if (!phone) throw new HttpError(400, 'Tapez votre numéro de téléphone (ex. 0661 22 33 44).', 'input');
    const row = await authRow(env, phone);
    const locked = lockedMessage(row);
    if (locked) throw new HttpError(429, locked, 'input');
    const team = await teamRows(env, base);
    const member = teamByPhone(team, phone);
    const sms = path === '/auth/sms-check';
    const wrong = new HttpError(400, sms ? 'Code incorrect ou expiré : demandez un nouveau code.' : 'Code de secours incorrect.', 'input');
    if (!row || !member) throw wrong;
    let ok = false;
    const key = await authKey(env, base);
    if (sms) {
      const parts = String(row.code || '').split('.');
      ok = parts.length === 2 && Date.parse(row.code_until) > Date.now() && (row.code_tries || 0) < 5 &&
        sameText(await pwHash(key, 'sms:' + String(body.code || '').replace(/\D/g, ''), parts[0], 2000), parts[1]);
      if (!ok) { await env.DB.prepare('UPDATE auth SET code_tries = code_tries + 1 WHERE phone = ?').bind(phone).run(); throw wrong; }
    } else {
      const parts = String(row.rescue || '').split('.');
      ok = parts.length === 2 && sameText(await pwHash(key, 'secours:' + cleanCode(body.code), parts[0], PW_ITER), parts[1]);
      if (!ok) { await env.DB.batch([failStatement(env, row)]); throw wrong; }
    }
    const pw = checkNewPassword(body.password, phone);
    const st = await setPasswordStatements(env, base, phone, pw, false);
    st.push(revokeStatement(env, phone, ''));
    const out = {};
    if (!sms) {
      // Le code de secours sert une fois : un nouveau est donné (à noter).
      out.rescue = rescueCodeText();
      const salt = b64url(crypto.getRandomValues(new Uint8Array(12)));
      st.push(env.DB.prepare('UPDATE auth SET rescue = ? WHERE phone = ?').bind(salt + '.' + await pwHash(key, 'secours:' + cleanCode(out.rescue), salt, PW_ITER), phone));
    }
    const s = await newSession(env, base, phone, false, device);
    st.push(s.statement);
    st.push(journalStatement(env, member[1], sms ? 'Mot de passe changé (code SMS)' : 'Mot de passe changé (code de secours)', device));
    await env.DB.batch(st);
    return Object.assign(out, { token: s.token, x: s.x, key: member[0], name: member[1], change: false });
  }

  if (path === '/auth/logout') {
    const s = await verifySession(env, base, bearer);
    if (s) await env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').bind(s.id).run();
    return { ok: true };
  }
  throw new HttpError(404, 'Inconnu.');
}

/** Ce que la page Équipe montre en plus dans la version Cloudflare : mot de passe, appareils connectés. */
async function enrichTeam(env, R, team) {
  if (!team || !Array.isArray(team.members)) return team;
  const phones = team.members.map((m) => m.phone).filter(Boolean);
  const auth = {};
  const devices = {};
  if (phones.length) {
    const ph = placeholders(phones.length);
    const r = await env.DB.batch([
      env.DB.prepare('SELECT phone, hash, temp, locked, rescue FROM auth WHERE phone IN (' + ph + ')').bind(...phones),
      env.DB.prepare('SELECT phone, COUNT(*) AS n, MAX(seen) AS seen FROM sessions WHERE revoked = 0 AND created > ? AND phone IN (' + ph + ') GROUP BY phone')
        .bind(new Date(Date.now() - SESSION_DAYS * 86400000).toISOString(), ...phones)
    ]);
    (r[0].results || []).forEach((x) => { auth[x.phone] = x; });
    (r[1].results || []).forEach((x) => { devices[x.phone] = x; });
  }
  team.members.forEach((m) => {
    const a = auth[m.phone] || null;
    const d = devices[m.phone] || null;
    m.auth = { password: !!(a && a.hash), temp: !!(a && a.temp), locked: !!(a && a.locked && Date.parse(a.locked) > Date.now()),
      rescue: !!(a && a.rescue), devices: d ? d.n : 0, seen: d ? d.seen : '' };
  });
  const s = R.base.secret;
  team.auth = { on: true, pwdOnly: !!s['cf:pwdOnly'], smsReady: !!R.base.props.SMS_API_KEY, via: R.user.sid ? 'password' : 'google' };
  return team;
}

Object.assign(PAGES, {
  async api_teamList(env, R, args) {
    needFull(R);
    return enrichTeam(env, R, await gasPage('api_teamList')(env, R, args));
  },
  async api_teamSave(env, R, args) {
    needFull(R);
    const res = await gasPage('api_teamSave')(env, R, args);
    res.team = await enrichTeam(env, R, res.team);
    return res;
  },
  async api_teamRemove(env, R, args) {
    needFull(R);
    // La personne retirée est déconnectée tout de suite (ses appareils et son mot de passe).
    const key = String(args[0] || '').trim().toLowerCase();
    const before = run(R, () => F.readTeam_()).filter((t) => t[0] === key)[0];
    const res = await gasPage('api_teamRemove')(env, R, args);
    if (before && before[3]) await env.DB.batch([revokeStatement(env, before[3], ''), env.DB.prepare('DELETE FROM auth WHERE phone = ?').bind(before[3])]);
    if (before) await env.DB.prepare('DELETE FROM push_subs WHERE member = ?').bind(before[0]).run();
    res.team = await enrichTeam(env, R, res.team);
    return res;
  },

  /** Administrateur : mot de passe provisoire pour une personne (à lui envoyer, par exemple par WhatsApp). */
  async api_authTemp(env, R, args) {
    needFull(R);
    const admin = requireAdmin(R, 'donner un mot de passe');
    const key = String(args[0] || '').trim().toLowerCase();
    const m = run(R, () => F.readTeam_()).filter((t) => t[0] === key)[0];
    if (!m) throw new HttpError(404, 'Personne introuvable dans l’équipe : rechargez la page.');
    if (!m[3]) throw new HttpError(400, 'Ajoutez d’abord son téléphone (Modifier) : c’est son identifiant de connexion.');
    if (key === String(R.user.email || '') && R.user.sid) throw new HttpError(400, 'Pour vous-même : Mon mot de passe.');
    const pw = provisionalPassword();
    const st = await setPasswordStatements(env, R.base, m[3], pw, true);
    st.push(revokeStatement(env, m[3], ''));
    st.push(journalStatement(env, admin.name, 'Mot de passe provisoire', m[1] + ' (' + m[3] + ')'));
    await env.DB.batch(st);
    return { password: pw, phone: m[3], name: m[1], message: 'Mot de passe provisoire créé pour ' + m[1] + '. Ses autres appareils sont déconnectés.' };
  },

  /** Administrateur (ou soi-même) : déconnecter tous les appareils d'une personne (téléphone perdu…). */
  async api_authRevoke(env, R, args) {
    needFull(R);
    const key = String(args[0] || '').trim().toLowerCase();
    const self = key === String(R.user.email || '');
    const who = self ? run(R, () => F.currentUser_()) : requireAdmin(R, 'déconnecter une personne');
    const m = run(R, () => F.readTeam_()).filter((t) => t[0] === key)[0];
    if (!m || !m[3]) throw new HttpError(404, 'Personne introuvable (ou sans téléphone).');
    await env.DB.batch([revokeStatement(env, m[3], self ? R.user.sid : ''), journalStatement(env, who.name, 'Appareils déconnectés', m[1])]);
    return { message: self ? 'Vos autres appareils sont déconnectés.' : m[1] + ' est déconnectée de tous ses appareils.' };
  },

  /**
   * Mon mot de passe : la personne connectée crée ou change le sien (avec son téléphone, qui devient son
   * identifiant). Connectée par mot de passe : l'ancien est demandé. Un administrateur reçoit son code de
   * secours la première fois (ou sur demande). Renvoie un jeton « mot de passe » pour cet appareil.
   */
  async api_authMine(env, R, args) {
    needFull(R);
    const input = args[0] || {};
    const me = run(R, () => F.currentUser_());
    const key = String(R.user.email || '').toLowerCase();
    const phone = phoneOf(input.phone);
    if (!phone) throw new HttpError(400, 'Numéro de téléphone invalide (ex. 0661 22 33 44).', 'input');
    const team = run(R, () => F.readTeam_());
    const mine = team.filter((t) => t[0] === key)[0];
    const other = teamByPhone(team, phone);
    if (other && other[0] !== key) throw new HttpError(400, 'Ce téléphone est déjà celui de ' + other[1] + '.', 'input');
    const pw = checkNewPassword(input.password, phone);
    const row = await authRow(env, phone);
    if (R.user.sid && row && row.hash && !row.temp && !(await passwordMatches(env, R.base, row, input.old))) {
      await env.DB.batch([failStatement(env, row)]);
      throw new HttpError(400, 'Mot de passe actuel incorrect.', 'input');
    }
    if (!mine || mine[3] !== phone) {
      await exec(env, R, () => F.teamSetPhone_(key, phone, me.name));
      await flush(env, R);
    }
    const st = await setPasswordStatements(env, R.base, phone, pw, false);
    st.push(revokeStatement(env, phone, R.user.sid || ''));
    const out = { message: 'Mot de passe enregistré. Identifiant : ' + phone + '.' };
    const admin = run(R, () => F.isAdmin_({ role: mine ? mine[2] : 'Administrateur' }));
    if (admin && (!row || !row.rescue || input.newRescue)) {
      out.rescue = rescueCodeText();
      const salt = b64url(crypto.getRandomValues(new Uint8Array(12)));
      st.push(env.DB.prepare('UPDATE auth SET rescue = ? WHERE phone = ?').bind(salt + '.' + await pwHash(await authKey(env, R.base), 'secours:' + cleanCode(out.rescue), salt, PW_ITER), phone));
    }
    if (!R.user.sid) {
      const s = await newSession(env, R.base, phone, false, 'Cet appareil');
      st.push(s.statement);
      out.token = s.token; out.x = s.x; out.key = key;
    }
    st.push(journalStatement(env, me.name, 'Mot de passe changé', 'depuis l’application'));
    await env.DB.batch(st);
    return out;
  },

  /**
   * Sauvegarde (Administration › Classeur › Tout exporter) : les données par morceaux, assemblées en un
   * fichier Excel sur l'appareil. part : 'meta', 'orders' (offset), 'tabs', 'journal', 'moves', 'done'.
   */
  async api_exportAll(env, R, args) {
    needFull(R);
    requireAdmin(R, 'tout exporter');
    const part = String(args[0] || 'meta');
    const offset = Math.max(0, Math.round(Number(args[1]) || 0));
    const db = env.DB;
    if (part === 'meta') {
      const r = await db.batch([db.prepare('SELECT COUNT(*) AS n FROM orders'), db.prepare('SELECT COUNT(*) AS n FROM trash')]);
      return { orders: r[0].results[0].n, trash: r[1].results[0].n, columns: K.ORDER_COLUMNS.map((c) => ({ key: c.key, title: c.title })), shop: run(R, () => F.getSettings_().NOM_BOUTIQUE) };
    }
    if (part === 'orders') {
      const r = await db.prepare('SELECT data, archived FROM orders ORDER BY seq LIMIT 400 OFFSET ?').bind(offset).all();
      return { rows: (r.results || []).map((x) => { const o = JSON.parse(x.data); o.__archived = x.archived ? 'Oui' : ''; return o; }), next: (r.results || []).length === 400 ? offset + 400 : -1 };
    }
    if (part === 'tabs') {
      const r = await db.prepare('SELECT name, part, rows FROM tabs ORDER BY name, part').all();
      const tabs = {};
      (r.results || []).forEach((x) => { tabs[x.name] = (tabs[x.name] || []).concat(JSON.parse(x.rows)); });
      const t = await db.prepare('SELECT id, data, deleted_at, deleted_by, reason FROM trash ORDER BY deleted_at DESC LIMIT 2000').all();
      return { tabs: tabs, trash: (t.results || []).map((x) => Object.assign(JSON.parse(x.data), { __deleted: x.deleted_at, __by: x.deleted_by, __reason: x.reason })) };
    }
    if (part === 'journal') {
      const r = await db.prepare('SELECT at, who, order_id, action, detail FROM journal ORDER BY at DESC LIMIT 3000').all();
      return { rows: r.results || [] };
    }
    if (part === 'moves') {
      const r = await db.prepare('SELECT row FROM moves ORDER BY seq DESC LIMIT 5000').all();
      return { rows: (r.results || []).map((x) => JSON.parse(x.row)) };
    }
    if (part === 'done') {
      await kvSet(env, 'cf:lastExport', new Date().toISOString()).run();
      return { ok: true };
    }
    throw new HttpError(400, 'Morceau inconnu.');
  },

  /** Notifications : clé publique de l'application, et choix de cet appareil (s'il est abonné). */
  async api_pushInfo(env, R, args) {
    const v = await vapidKeys(env, R.base);
    const endpoint = String(args[0] || '');
    const me = run(R, () => F.currentUser_());
    let row = null;
    if (endpoint) row = await env.DB.prepare('SELECT * FROM push_subs WHERE endpoint = ?').bind(endpoint).first();
    return { publicKey: v.pub, subscribed: !!row, prefs: pushPrefs(row, me.role), admin: run(R, () => F.isAdmin_(me)), device: row ? row.device : '' };
  },
  /** Abonne cet appareil (ou met à jour son abonnement) ; prefs : ses choix (facultatif). */
  async api_pushSubscribe(env, R, args) {
    const sub = args[0] || {};
    const endpoint = String(sub.endpoint || '');
    const keys = sub.keys || {};
    if (!/^https:\/\//.test(endpoint) || !keys.p256dh || !keys.auth) throw new HttpError(400, 'Abonnement aux notifications invalide.');
    const id = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))).slice(0, 32);
    const old = await env.DB.prepare('SELECT prefs FROM push_subs WHERE id = ?').bind(id).first();
    const me = run(R, () => F.currentUser_());
    const prefs = args[1] && typeof args[1] === 'object' ? pushPrefs({ prefs: JSON.stringify(args[1]) }, me.role) : pushPrefs(old, me.role);
    await env.DB.prepare('INSERT INTO push_subs (id, member, endpoint, p256dh, auth, prefs, device, created, last_ok, fails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'\', 0) ' +
      'ON CONFLICT(id) DO UPDATE SET member = excluded.member, p256dh = excluded.p256dh, auth = excluded.auth, prefs = excluded.prefs, device = excluded.device')
      .bind(id, String(R.user.email || ''), endpoint, String(keys.p256dh), String(keys.auth), JSON.stringify(prefs), String(args[2] || '').slice(0, 60), new Date().toISOString()).run();
    return { prefs: prefs, message: old ? 'Notifications à jour.' : 'Notifications activées sur ce téléphone.' };
  },
  /** Choix de cet appareil (nouvelles commandes, rappels…). */
  async api_pushPrefs(env, R, args) {
    const row = await env.DB.prepare('SELECT * FROM push_subs WHERE endpoint = ? AND member = ?').bind(String(args[0] || ''), String(R.user.email || '')).first();
    if (!row) throw new HttpError(404, 'Notifications pas activées sur ce téléphone.');
    const me = run(R, () => F.currentUser_());
    const prefs = pushPrefs({ prefs: JSON.stringify(args[1] || {}) }, me.role);
    await env.DB.prepare('UPDATE push_subs SET prefs = ? WHERE id = ?').bind(JSON.stringify(prefs), row.id).run();
    return { prefs: prefs, message: 'Choix enregistrés.' };
  },
  /** Notification d'essai sur cet appareil. */
  async api_pushTest(env, R, args) {
    const row = await env.DB.prepare('SELECT id FROM push_subs WHERE endpoint = ? AND member = ?').bind(String(args[0] || ''), String(R.user.email || '')).first();
    if (!row) throw new HttpError(404, 'Notifications pas activées sur ce téléphone.');
    const r = await pushTo(env, R.base, 'orders', { title: 'Essai : ça marche ✓', body: 'Les notifications de DZ Smart Shop arrivent sur ce téléphone.', tag: 'essai', url: '/#/confirmation' },
      { members: [String(R.user.email || '')], test: true });
    if (!r.sent) throw new HttpError(502, 'La notification n’est pas partie : désactivez puis réactivez les notifications.');
    return { message: 'Notification d’essai envoyée.' };
  },
  /** Désactive les notifications de cet appareil. */
  async api_pushOff(env, R, args) {
    await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND member = ?').bind(String(args[0] || ''), String(R.user.email || '')).run();
    return { message: 'Notifications désactivées sur ce téléphone.' };
  },

  /** Administrateur : nouveau code de secours (l'ancien ne marche plus). */
  async api_authRescueNew(env, R) {
    needFull(R);
    const admin = requireAdmin(R, 'créer un code de secours');
    const mine = run(R, () => F.readTeam_()).filter((t) => t[0] === String(R.user.email || ''))[0];
    const row = mine && mine[3] ? await authRow(env, mine[3]) : null;
    if (!row || !row.hash) throw new HttpError(400, 'Créez d’abord votre mot de passe (Mon mot de passe).');
    const code = rescueCodeText();
    const salt = b64url(crypto.getRandomValues(new Uint8Array(12)));
    await env.DB.batch([env.DB.prepare('UPDATE auth SET rescue = ? WHERE phone = ?').bind(salt + '.' + await pwHash(await authKey(env, R.base), 'secours:' + cleanCode(code), salt, PW_ITER), mine[3]),
      journalStatement(env, admin.name, 'Nouveau code de secours', '')]);
    return { rescue: code, message: 'Nouveau code de secours : notez-le. L’ancien ne marche plus.' };
  },

  /** Administrateur : connexion par mot de passe seulement (plus par Google). */
  async api_authSettings(env, R, args) {
    needFull(R);
    const admin = requireAdmin(R, 'changer la connexion');
    const on = !!(args[0] && args[0].pwdOnly);
    if (on) {
      const mine = run(R, () => F.readTeam_()).filter((t) => t[0] === String(R.user.email || ''))[0];
      const row = mine && mine[3] ? await authRow(env, mine[3]) : null;
      if (!row || !row.hash || row.temp) throw new HttpError(400, 'Créez d’abord votre propre mot de passe (Mon mot de passe) : sinon vous ne pourriez plus entrer.');
    }
    await env.DB.batch([on ? kvSet(env, 'cf:pwdOnly', new Date().toISOString()) : env.DB.prepare("DELETE FROM kv WHERE key = 'cf:pwdOnly'"),
      journalStatement(env, admin.name, 'Connexion', on ? 'par mot de passe seulement' : 'par mot de passe ou par Google')]);
    return { pwdOnly: on, message: on ? 'Connexion par mot de passe seulement : la connexion par Google est coupée.' : 'La connexion par Google est de nouveau possible.' };
  }
});

/* ================================================================ */
/* Point d'entrée                                                   */
/* ================================================================ */

async function api(request, env, fn) {
  if (request.method !== 'POST') throw new HttpError(405, 'Méthode non permise.');
  const base = await loadBase(env);
  // Adresse de l'application (pour les notifications, envoyées aussi par les tâches automatiques).
  const origin = new URL(request.url).origin;
  if (base.secret['cf:origin'] !== origin && /^https:/.test(origin)) await kvSet(env, 'cf:origin', origin).run();
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const R = newReq(base, { email: '' });
  // Seuls les membres de l'onglet Équipe (et le propriétaire du classeur) entrent.
  const team = run(R, () => F.readTeam_());
  let user;
  if (token.indexOf('v2.') === 0) {
    // Connexion par téléphone et mot de passe (v1.11).
    const s = await verifySession(env, base, token);
    if (!s) throw new HttpError(401, 'Connexion expirée : reconnectez-vous.', 'auth');
    if (s.temp) throw new HttpError(401, 'Choisissez votre mot de passe.', 'change');
    const m = teamByPhone(team, s.phone);
    if (!m) throw new HttpError(403, 'Vous n’êtes plus dans l’équipe. Demandez à l’administrateur.', 'auth');
    user = { email: m[0], sid: s.id, phone: s.phone };
  } else {
    // Connexion par Google (jeton signé par Apps Script), sauf si l'administrateur l'a coupée.
    user = await verifyToken(token, base.secret['cf:secret']);
    if (!user) throw new HttpError(401, 'Connexion expirée : reconnectez-vous.', 'auth');
    if (base.secret['cf:pwdOnly']) throw new HttpError(401, 'Connectez-vous avec votre téléphone et votre mot de passe.', 'auth');
    const owner = String(base.props.OWNER_EMAIL || '').toLowerCase();
    if (user.email !== owner && !team.some((t) => t[0] === user.email)) {
      throw new HttpError(403, 'Votre adresse n’est pas dans l’onglet Équipe du classeur. Demandez à l’administrateur de vous ajouter.', 'auth');
    }
  }
  R.user = user;
  R.userName = userName(R);
  const handler = PAGES[fn];
  if (!handler) throw new HttpError(404, 'Cette page n’est pas encore dans la version Cloudflare (étape 2).', 'later');
  if (fn !== 'api_stockPage') await preloadTabs(env, R, fn);
  let args = [];
  try { args = await request.json(); } catch (e) { args = []; }
  if (!Array.isArray(args)) args = [];
  return handler(env, R, args);
}

/** Application installable (v1.12) : nom de la boutique, ouverture en plein écran sur Confirmation. */
async function manifest(env) {
  let shop = 'DZ Smart Shop';
  try { const r = await env.DB.prepare("SELECT value FROM kv WHERE key = 'cf:shop'").first(); if (r && r.value) shop = String(r.value); } catch (e) { /* nom par défaut */ }
  const m = {
    name: shop, short_name: shop.length > 14 ? 'DZ Smart Shop' : shop, description: 'Commandes, confirmation, expéditions et suivi (paiement à la livraison)',
    id: '/', start_url: '/?app=1#/confirmation', scope: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#10241B', theme_color: '#10241B', lang: 'fr', dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  return new Response(JSON.stringify(m), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
function icon(name) {
  const b64 = ICONS[name];
  if (!b64) return new Response('Introuvable.', { status: 404 });
  return new Response(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=604800' } });
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
        const r = await env.DB.prepare("SELECT key, value FROM kv WHERE key IN ('cf:gateway', 'cf:shop', 'cf:imported', 'cf:pwdOnly', 'cf:full', 'SMS_API_KEY')").all();
        const kv = {};
        (r.results || []).forEach((x) => { kv[x.key] = x.value; });
        // Connexion par mot de passe (étape 3) ; par Google tant que l'administrateur ne l'a pas coupée.
        return json({ ok: true, data: { gateway: kv['cf:pwdOnly'] ? '' : kv['cf:gateway'] || '', password: !!kv['cf:full'], sms: !!kv.SMS_API_KEY,
          shop: kv['cf:shop'] || 'DZ Smart Shop', ready: !!kv['cf:imported'], version: K.APP_VERSION } });
      }
      if (path === '/manifest.webmanifest') return manifest(env);
      if (path === '/sw.js') return new Response(SW_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } });
      if (path.indexOf('/icons/') === 0) return icon(path.slice(7));
      if (path.indexOf('/auth/') === 0) return json({ ok: true, data: await authRoute(request, env, path) });
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
