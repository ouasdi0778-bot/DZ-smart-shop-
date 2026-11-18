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
    data: JSON.stringify(p)
  };
}

const ROW_COLS = ['stage', 'status', 'day', 'date', 'phone', 'wilaya', 'agent', 'product', 'total', 'callback', 'carrier', 'tracking', 'updated', 'search', 'data'];

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
  (kv.results || []).forEach((r) => { if (r.key.indexOf('cf:') === 0) secret[r.key] = r.value; else props[r.key] = r.value; });
  return { config, props, secret };
}

function newReq(base, user) {
  return {
    now: new Date(), user: user, config: base.config, props: Object.assign({}, base.props), propWrites: {}, cache: {},
    orders: [], byId: {}, dirty: {}, inserts: [], journal: [], configWrites: {}, extra: [], changed: [],
    trashIds: null, archived: [], manualMax: 0
  };
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
  R.journal.forEach((r) => {
    const at = r[0] instanceof Date ? r[0].toISOString() : now;
    st.push(db.prepare('INSERT INTO journal (at, who, order_id, action, detail) VALUES (?, ?, ?, ?, ?)')
      .bind(at, String(r[1] || ''), String(r[2] || ''), String(r[3] || ''), String(r[4] || '').slice(0, 2000)));
  });
  Object.keys(R.propWrites).forEach((k) => {
    const v = R.propWrites[k];
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

/** Compteurs du menu (à appeler / en attente / à expédier) : trois comptes lus sur l'index. */
async function fastCounts(env) {
  const now = new Date().toISOString();
  const r = await env.DB.prepare(
    'SELECT ' +
    "SUM(CASE WHEN stage = 'todo' AND status IN (" + placeholders(QUEUE.length) + ") AND (callback = '' OR callback <= ?) THEN 1 ELSE 0 END) AS queue, " +
    "SUM(CASE WHEN stage = 'todo' THEN 1 ELSE 0 END) AS pending, " +
    "SUM(CASE WHEN stage = 'confirmed' AND tracking = '' THEN 1 ELSE 0 END) AS toShip " +
    "FROM orders WHERE archived = 0 AND stage IN ('todo', 'confirmed')"
  ).bind(...QUEUE, now).first();
  return { queue: (r && r.queue) || 0, pending: (r && r.pending) || 0, toShip: (r && r.toShip) || 0, alerts: 0 };
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
    boot.cloud = { version: K.APP_VERSION, step: 1 };
    if (preload && preload.fn && PAGES[preload.fn] && ['api_dashboard', 'api_listOrders', 'api_queue'].indexOf(preload.fn) >= 0) {
      const R2 = newReq({ config: R.config, props: R.props }, R.user);
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
        const R2 = newReq({ config: R.config, props: R.props }, R.user);
        R2.userName = R.userName;
        out.push({ data: await PAGES[s.fn](env, R2, Array.isArray(s.args) ? s.args : []) });
      } catch (e) { out.push(null); }
    }
    return out;
  },

  async api_importStatus() { return run(newReq({ config: {}, props: {} }, null), () => F.api_importStatus()); },

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
        R.extra.push(env.DB.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(id, 'delete', now));
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
  if (filter.withStatus) res.importStatus = await PAGES.api_importStatus();
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
    return { orders: r[0].results[0].n, archived: r[1].results[0].n, trash: r[2].results[0].n, importedAt: r[3].results[0] ? r[3].results[0].value : '' };
  }

  if (path === '/bridge/import') {
    const st = [];
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

export default {
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
      return env.ASSETS.fetch(request);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const code = e instanceof HttpError ? e.code : '';
      // Erreurs de l'outil (« déjà traitée »…) et pages pas encore portées : réponse normale (200) avec ok: false.
      const http = !(e instanceof HttpError) || code === 'later' ? 200 : status;
      return json({ ok: false, error: String(e && e.message ? e.message : e), code: code }, http);
    }
  }
};

export { stageOf, rowOf, plain, hmac, b64urlText, verifyToken };
