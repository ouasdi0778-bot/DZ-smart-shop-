/**
 * Tests de la version Cloudflare, sans compte Cloudflare : le moteur (dist/worker.js) tourne sous
 * Node avec une imitation de D1 (SQLite). Les mêmes données d'exemple sont chargées dans la version
 * Google (imitation du classeur) puis copiées comme le fait Cloud.gs : les deux versions doivent
 * donner les mêmes résultats.
 *
 *   node cloudflare/test/run.js
 */
'use strict';
// Comme Apps Script (fuseau du script : Africa/Algiers) : les jours sont comptés à l'heure d'Algérie des deux côtés.
process.env.TZ = 'Africa/Algiers';
process.removeAllListeners('warning'); // « SQLite is an experimental feature »
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { D1 } = require('./d1');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const SRC = path.join(ROOT, 'apps-script');

/* ---------- La version Google (imitation du classeur), avec les données d'exemple ---------- */
globalThis.require = require; // HMAC de l'imitation (Utilities.computeHmacSha256Signature)
function load(file) { vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file }); }
['gas-mock.js', 'fake-ecotrack.js', 'fake-shopify.js', 'fake-httpsms.js', 'fake-cloud.js'].forEach((f) => load(path.join(ROOT, 'tests', f)));
fs.readdirSync(SRC).filter((f) => f.endsWith('.gs')).sort().forEach((f) => load(path.join(SRC, f)));
load(path.join(ROOT, 'tests', 'seed.js'));
ORDERS_CACHE_ON_ = false;

/* ---------- La version Cloudflare ---------- */
require('../build').build();
const tmp = path.join(os.tmpdir(), 'dz-worker-' + process.pid + '.mjs');
fs.copyFileSync(path.join(HERE, '..', 'dist', 'worker.js'), tmp);

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

let worker;
let env;
let SECRET;
const HOST = 'https://dz-test.workers.dev';

async function fresh(live, full) {
  __mock.reset();
  __fakeEcotrack.reset();
  __fakeHttpsms.reset();
  CFG_MEMO_ = {}; CFG_PREFETCHED_ = false;
  seedDemo_();
  __mock.setUser('admin@example.com');
  transferReleasitOrders_(); // commandes en attente dans l'onglet RELEASIT : copiées avant, comme dans la vraie vie
  if (live) {
    saveEcotrackConfig_(__fakeEcotrack.host, __fakeEcotrack.token);
    saveSmsConfig_(__fakeHttpsms.key, '0550 12 34 56');
    PropertiesService.getScriptProperties().deleteProperty('SMS_QUEUE');
  }
  env = { DB: new D1(':memory:'), ASSETS: { fetch: async () => new Response('<!doctype html>page', { headers: { 'content-type': 'text/html' } }) } };
  await env.DB.exec(fs.readFileSync(path.join(HERE, '..', 'schema.sql'), 'utf8'));
  SECRET = 'cle-de-test-0123456789abcdef0123456789abcdef';
  await bridge('/bridge/register', { secret: SECRET, gateway: 'https://script.google.com/macros/s/MOCK/exec', shop: 'Boutique test' });
  const snap = cloudSnapshot_();
  await bridge('/bridge/import', { reset: true, config: snap.config, kv: snap.kv, trash: snap.trash, blocked: snap.blocked });
  for (let i = 0; i < snap.orders.length; i += 250) await bridge('/bridge/import', { orders: snap.orders.slice(i, i + 250), seqFrom: i });
  if (snap.archive.length) await bridge('/bridge/import', { archive: snap.archive });
  await bridge('/bridge/import', { done: true });
  if (live) {
    await bridge('/bridge/live', { live: true });
    const props = {};
    ['ECOTRACK_URL', 'ECOTRACK_TOKEN', 'SMS_API_KEY', 'SMS_FROM', 'OWNER_EMAIL'].forEach((k) => { props[k] = String(PropertiesService.getScriptProperties().getProperty(k) || ''); });
    await bridge('/bridge/config', { props: props });
  }
  if (full) {
    // Étape 3, comme cloudGoFull_ : onglets envoyés, puis tout dans Cloudflare.
    const tabs = {};
    ['Clients', 'Produits', 'Tarifs', 'Équipe', 'Paramètres', 'Dépenses'].forEach((n) => { if (__mock.ss().getSheetByName(n)) tabs[n] = cloudTabValues_(n); });
    await bridge('/bridge/tabs', { tabs: tabs });
    await bridge('/bridge/moves', { reset: true, rows: readAllMoveRows_().map((r) => r.map(cloudCellOut_)) });
    await bridge('/bridge/full', { full: true });
    await bridge('/bridge/config', { editors: ['admin@example.com'] });
    await env.DB.prepare("INSERT INTO kv (key, value) VALUES ('cf:nightDay', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(ymd_(new Date())).run();
  }
  return snap;
}

/** Tous les résumés par jour calculés (comme après quelques minutes de tâche automatique). */
async function settleDays() {
  for (let i = 0; i < 60; i++) {
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM days WHERE stale > 0').first();
    if (!r.n) return i;
    await cron(env);
  }
  throw new Error('résumés par jour pas finis');
}
const round = (x) => JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'number' ? Math.round(v) : v)));

/* Appels extérieurs du moteur Cloudflare (fetch) → faux Ecotrack et faux httpSMS de la version Google. */
globalThis.fetch = async (url, init) => {
  init = init || {};
  const headers = Object.assign({}, init.headers || {});
  const params = { method: String(init.method || 'GET').toLowerCase(), headers: headers, muteHttpExceptions: true, followRedirects: init.redirect !== 'manual' };
  if (init.body !== undefined) { params.payload = init.body; params.contentType = headers['content-type'] || ''; }
  const r = UrlFetchApp.fetch(String(url), params);
  const content = r.getContent ? r.getContent() : null;
  const bytes = content ? Uint8Array.from(content, (b) => b & 255) : new TextEncoder().encode(r.getContentText());
  const h = new Headers();
  Object.entries(r.getAllHeaders ? r.getAllHeaders() : {}).forEach(([k, v]) => h.set(k, String(v)));
  return new Response(bytes, { status: r.getResponseCode(), headers: h });
};

async function dbOrder(id) {
  const r = await env.DB.prepare('SELECT data FROM orders WHERE id = ?').bind(String(id)).first();
  return r ? JSON.parse(r.data) : null;
}
function sheetOrder(id) { return plainOrder_(findOrder_(readOrders_(), id)); }
const pick = (o) => ({ status: String(o.status), carrier: String(o.carrier), tracking: String(o.tracking), carrierStatus: String(o.carrierStatus), label: String(o.label || '') });
/** État du faux Ecotrack : remis comme avant pour jouer la même action dans les deux versions. */
function ecoState() { const E = __fakeEcotrack; return JSON.stringify({ orders: E.orders, counter: E.counter, validated: E.validated }); }
function ecoRestore(s) { const E = __fakeEcotrack; const x = JSON.parse(s); E.orders = x.orders; E.counter = x.counter; E.validated = x.validated; }
async function kvQueue() {
  const r = await env.DB.prepare("SELECT value FROM kv WHERE key = 'SMS_QUEUE'").first();
  return r ? JSON.parse(r.value) : [];
}

async function call(req) { const res = await worker.fetch(req, env); return { status: res.status, body: await res.json() }; }
async function bridge(p, body, key) {
  const r = await call(new Request(HOST + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dz-key': key === undefined ? (SECRET || '') : key }, body: JSON.stringify(body) }));
  if (!r.body.ok) throw new Error('pont ' + p + ' : ' + r.body.error);
  return r.body.data;
}
function tokenFor(email) { return cloudToken_(email, SECRET); }
async function apiRaw(email, fn, args) {
  return call(new Request(HOST + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tokenFor(email) }, body: JSON.stringify(args || []) }));
}
async function api(fn, ...args) {
  const before = env.DB.queries;
  const r = await apiRaw('admin@example.com', fn, args);
  api.lastQueries = env.DB.queries - before;
  if (!r.body.ok) throw new Error(fn + ' : ' + r.body.error);
  return r.body.data;
}
/** Même appel dans la version Google (même utilisateur). */
function gas(fn, ...args) {
  CFG_MEMO_ = {}; CFG_PREFETCHED_ = false;
  return JSON.parse(JSON.stringify(globalThis[fn].apply(null, args)));
}
const ids = (list) => list.map((x) => x.id);

/* ================================================================ */

test('Connexion : jeton signé par Apps Script accepté ; faux, expiré ou hors Équipe refusé', async () => {
  await fresh();
  const ok = await apiRaw('admin@example.com', 'api_counts', []);
  assert.strictEqual(ok.body.ok, true);
  const bad = await call(new Request(HOST + '/api/api_counts', { method: 'POST', headers: { authorization: 'Bearer v1.abc.def' }, body: '[]' }));
  assert.deepStrictEqual([bad.status, bad.body.code], [401, 'auth']);
  const forged = tokenFor('admin@example.com').replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
  const f = await call(new Request(HOST + '/api/api_counts', { method: 'POST', headers: { authorization: 'Bearer ' + forged }, body: '[]' }));
  assert.strictEqual(f.status, 401);
  const old = 'v1.' + Utilities.base64EncodeWebSafe(JSON.stringify({ e: 'admin@example.com', x: Date.now() - 1000 })).replace(/=+$/, '');
  const expired = old + '.' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(old, SECRET)).replace(/=+$/, '');
  const e = await call(new Request(HOST + '/api/api_counts', { method: 'POST', headers: { authorization: 'Bearer ' + expired }, body: '[]' }));
  assert.strictEqual(e.status, 401, 'jeton expiré');
  const stranger = await apiRaw('inconnu@example.com', 'api_counts', []);
  assert.deepStrictEqual([stranger.status, stranger.body.code], [403, 'auth']);
  assert.ok(/onglet Équipe/.test(stranger.body.error));
  // Le pont refuse une autre clé, et une deuxième liaison sans l'ancienne clé.
  const r = await call(new Request(HOST + '/bridge/status', { headers: { 'x-dz-key': 'autre' } }));
  assert.strictEqual(r.status, 403);
  const again = await call(new Request(HOST + '/bridge/register', { method: 'POST', headers: { 'x-dz-key': '' }, body: JSON.stringify({ secret: 'x'.repeat(40) }) }));
  assert.strictEqual(again.status, 403);
  const info = await call(new Request(HOST + '/auth/info'));
  assert.deepStrictEqual([info.body.data.gateway, info.body.data.shop, info.body.data.ready], ['https://script.google.com/macros/s/MOCK/exec', 'Boutique test', true]);
});

test('Copie : toutes les commandes, l’archive, la corbeille ; mêmes compteurs que la version Google', async () => {
  const snap = await fresh();
  const st = await bridge('/bridge/status', null);
  assert.strictEqual(st.orders, snap.orders.length);
  const counts = await api('api_counts');
  const g = gas('api_counts');
  assert.deepStrictEqual([counts.queue, counts.pending, counts.toShip], [g.queue, g.pending, g.toShip]);
  const boot = await api('api_bootstrap', null);
  assert.strictEqual(boot.user.email, 'admin@example.com');
  assert.strictEqual(boot.user.admin, true);
  assert.deepStrictEqual(boot.wilayas.length, gas('api_bootstrap', null).wilayas.length);
  assert.strictEqual(boot.cloud.step, 1);
});

test('Confirmation : même file que la version Google (à appeler, rappels, en attente, fiche jointe)', async () => {
  await fresh();
  const q = await api('api_queue', { sync: true, first: true });
  const g = gas('api_queue', { sync: true, first: true });
  assert.deepStrictEqual(ids(q.due), ids(g.due));
  assert.deepStrictEqual(ids(q.later), ids(g.later));
  assert.deepStrictEqual(ids(q.waiting), ids(g.waiting));
  assert.deepStrictEqual(q.stats, g.stats);
  assert.strictEqual(q.firstDetail.order.id, g.firstDetail.order.id);
  assert.deepStrictEqual(q.firstDetail.history, g.firstDetail.history);
  assert.deepStrictEqual(q.firstDetail.rules, g.firstDetail.rules);
  assert.deepStrictEqual(q.firstDetail.stock, g.firstDetail.stock);
  assert.ok(api.lastQueries <= 12, 'peu de lectures : ' + api.lastQueries);
});

test('Confirmation : confirmer, pas de réponse (historique), modifier pendant l’appel, file et compteurs renvoyés', async () => {
  await fresh();
  const q = await api('api_queue', {});
  const a = q.due[0].id;
  const b = q.due[1].id;
  const r = await api('api_recordCall', a, 'confirm', { fields: { address: 'Nouvelle adresse', price: '5000', shipping: '300' } }, { next: b, queue: true });
  assert.deepStrictEqual([r.status, r.address, r.price, r.shipping, r.total], ['Confirmée', 'Nouvelle adresse', 5000, 300, 5300]);
  assert.strictEqual(r.next.order.id, b);
  assert.ok(ids(r.queue.due).indexOf(a) < 0, 'la commande confirmée quitte la file');
  assert.ok(r.counts && r.counts.queue >= 0 && r.counts.__fast === undefined, 'compteurs calculés après l’enregistrement');
  assert.ok(api.lastQueries < 50, 'moins de 50 instructions D1 : ' + api.lastQueries);
  const n = await api('api_recordCall', b, 'no_answer', {}, {});
  assert.strictEqual(n.status, 'Pas de réponse');
  assert.ok(/^Pas de réponse · Admin$/.test(n.calls[0].text));
  const again = await api('api_getOrder', a);
  assert.strictEqual(again.order.status, 'Confirmée');
  assert.ok(again.order.calls.length >= 1);
  const j = await env.DB.prepare('SELECT action, order_id FROM journal ORDER BY rowid DESC LIMIT 2').all();
  assert.deepStrictEqual(j.results.map((x) => x.order_id).sort(), [a, b].sort());
  await assert.rejects(api('api_recordCall', a, 'confirm', {}, {}), /déjà été traitée/);
});

test('Deux personnes sur la même commande : la deuxième est refusée, rien n’est écrasé', async () => {
  await fresh();
  const q = await api('api_queue', {});
  const id = q.due[0].id;
  // La version de la commande change entre la lecture et l'écriture (autre confirmatrice).
  const orig = env.DB.batch.bind(env.DB);
  let once = true;
  env.DB.batch = async (list) => {
    if (once && list.some((s) => /^UPDATE orders/.test(s.sql))) {
      once = false;
      env.DB.db.prepare('UPDATE orders SET rev = rev + 1 WHERE id = ?').run(id);
    }
    return orig(list);
  };
  const r = await apiRaw('admin@example.com', 'api_recordCall', [id, 'confirm', {}, {}]);
  env.DB.batch = orig;
  assert.deepStrictEqual([r.status, r.body.code], [409, 'conflict']);
  const row = await env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(id).first();
  assert.notStrictEqual(row.status, 'Confirmée', 'rien d’enregistré');
  const j = await env.DB.prepare('SELECT COUNT(*) AS n FROM journal').first();
  assert.strictEqual(j.n, 0, 'pas de ligne de Journal non plus (transaction annulée)');
});

test('Commandes : même liste, mêmes comptes, recherche (nom, téléphone, arabe), période, wilaya', async () => {
  await fresh();
  for (const f of [{ status: 'todo', period: '30', limit: 100 }, { status: 'all', period: 'all', limit: 500 }, { status: 'Annulée', period: '30' }, { status: 'queue', period: '7' }]) {
    const l = await api('api_listOrders', f);
    const g = gas('api_listOrders', f);
    assert.deepStrictEqual(ids(l.rows).sort(), ids(g.rows).sort(), JSON.stringify(f));
    assert.strictEqual(l.total, g.total, JSON.stringify(f));
    Object.keys(g.counts).forEach((k) => assert.strictEqual(l.counts[k] || 0, g.counts[k], k + ' ' + JSON.stringify(f)));
  }
  const all = gas('api_listOrders', { status: 'all', period: 'all', limit: 500 }).rows;
  const one = all.filter((o) => /[a-z]{3}/i.test(o.client))[0];
  const byName = await api('api_listOrders', { status: 'all', period: 'all', q: one.client.split(' ')[0] });
  assert.ok(ids(byName.rows).indexOf(one.id) >= 0, 'recherche par nom');
  const byPhone = await api('api_listOrders', { status: 'all', period: 'all', q: one.phone.slice(-6) });
  assert.ok(ids(byPhone.rows).indexOf(one.id) >= 0, 'recherche par téléphone');
  const arabic = all.filter((o) => /[؀-ۿ]/.test(o.client))[0];
  if (arabic) {
    const r = await api('api_listOrders', { status: 'all', period: 'all', q: arabic.client });
    assert.ok(ids(r.rows).indexOf(arabic.id) >= 0, 'recherche en arabe');
  }
  const w = all.filter((o) => o.wilaya)[0].wilaya;
  const lw = await api('api_listOrders', { status: 'all', period: 'all', wilaya: w });
  const gw = gas('api_listOrders', { status: 'all', period: 'all', wilaya: w });
  assert.deepStrictEqual(ids(lw.rows).sort(), ids(gw.rows).sort(), 'filtre wilaya');
  const sample = lw.rows[0];
  const gs = gw.rows.filter((x) => x.id === sample.id)[0];
  assert.deepStrictEqual(sample, gs, 'même fiche (mêmes champs)');
});

test('Tableau de bord : mêmes chiffres que la version Google (7 jours, tout, période libre)', async () => {
  await fresh();
  const pick = (d) => ({
    received: d.received, waiting: d.waiting, decided: d.decided, confirmed: d.confirmed, shipped: d.shipped, delivered: d.delivered,
    returned: d.returned, cancelled: d.cancelled, unreachable: d.unreachable, revenueDelivered: d.revenueDelivered,
    inTransitAmount: d.inTransitAmount, inTransitCount: d.inTransitCount,
    todo: { toConfirm: d.todo.toConfirm, callbacksToday: d.todo.callbacksToday, toShip: d.todo.toShip, unreachable: d.todo.unreachable, waitingLong: d.todo.waitingLong },
    byWilaya: d.byWilaya, byProduct: d.byProduct, spark: d.spark
  });
  const sortGroups = (x) => { ['byWilaya', 'byProduct'].forEach((k) => x[k] = x[k].slice().sort((a, b) => b.orders - a.orders || String(a.name).localeCompare(String(b.name)))); return x; };
  for (const args of [['7'], ['all'], ['today'], ['', ymd_(new Date(Date.now() - 20 * 86400000)), ymd_(new Date())]]) {
    const c = sortGroups(pick(await api('api_dashboard', ...args)));
    const g = sortGroups(pick(gas('api_dashboard', ...args)));
    if (JSON.stringify(c) !== JSON.stringify(g)) {
      Object.keys(g).forEach((k) => { if (JSON.stringify(c[k]) !== JSON.stringify(g[k])) console.log('      diff', k, JSON.stringify(c[k]), '\n      gas ', JSON.stringify(g[k])); });
    }
    assert.deepStrictEqual(c, g, JSON.stringify(args));
  }
  const agents = await api('api_dashboard', '30');
  assert.deepStrictEqual(agents.byAgent.map((x) => x.name).sort(), gas('api_dashboard', '30').byAgent.map((x) => x.name).sort());
});

test('Fiche, modification, nouvelle commande, liste noire : comme la version Google', async () => {
  await fresh();
  const g = gas('api_listOrders', { status: 'all', period: 'all', limit: 500 }).rows;
  const id = g[3].id;
  const d = await api('api_getOrder', id);
  const gd = gas('api_getOrder', id);
  assert.deepStrictEqual(d.history, gd.history);
  assert.deepStrictEqual(d.rules, gd.rules);
  const u = await api('api_updateOrder', id, { notes: 'Note Cloudflare', commune: 'Nouvelle commune' });
  assert.deepStrictEqual([u.notes, u.commune], ['Note Cloudflare', 'Nouvelle commune']);
  const c = await api('api_createOrder', { client: 'Saisie Cloud', phone: '0550 11 22 33', wilaya: '16 - Alger', product: 'Sac à main', price: 3000 });
  assert.ok(/^M\d{4}$/.test(c.id), c.id);
  const c2 = await api('api_createOrder', { client: 'Saisie Cloud 2', phone: '0550 11 22 34', wilaya: '16 - Alger', product: 'Sac à main', price: 3000 });
  assert.strictEqual(Number(c2.id.slice(1)), Number(c.id.slice(1)) + 1, 'numéros à la suite');
  const q = await api('api_queue', {});
  assert.ok(ids(q.due).indexOf(c.id) >= 0, 'la nouvelle commande est dans la file');
  const bl = await api('api_setBlacklist', '0550 11 22 33', true);
  assert.deepStrictEqual(bl, { phone: '0550112233', blacklisted: true });
  const after = await api('api_getOrder', c.id);
  assert.strictEqual(after.blacklisted, true);
  assert.ok(/Liste noire/i.test(after.order.alert), after.order.alert);
});

test('Corbeille : en plusieurs (expédiées protégées), restaurer, vider, numéros bloqués', async () => {
  await fresh();
  const all = gas('api_listOrders', { status: 'all', period: 'all', limit: 500 }).rows;
  const todo = all.filter((o) => o.page === 'commandes').slice(0, 2).map((o) => o.id);
  const shipped = all.filter((o) => o.status === 'Expédiée')[0].id;
  const r = await api('api_deleteOrders', todo.concat([shipped, '#nope']), 'Essai');
  assert.deepStrictEqual(r.deleted.sort(), todo.slice().sort());
  assert.deepStrictEqual(r.skipped.map((x) => x.id), [shipped, '#nope']);
  const t = await api('api_listTrash');
  assert.deepStrictEqual(t.rows.map((x) => x.id).sort(), todo.slice().sort());
  assert.strictEqual(t.rows[0].reason, 'Essai');
  const back = await api('api_restoreOrders', [todo[0]]);
  assert.deepStrictEqual(back.restored, [todo[0]]);
  const purge = await api('api_purgeTrash');
  assert.deepStrictEqual(purge.purged, [todo[1]]);
  const blocked = await env.DB.prepare('SELECT id FROM blocked').all();
  assert.ok(blocked.results.some((x) => x.id === todo[1]));
  await assert.rejects(api('api_restoreOrders', [todo[1]]), /corbeille est vide/);
});

test('Base : les lectures fréquentes passent par un index (rapide et dans la limite gratuite)', async () => {
  await fresh();
  const plans = [
    ["SELECT id FROM orders WHERE archived = 0 AND stage IN ('todo', 'other')", []],
    ["SELECT id FROM orders WHERE archived = 0 AND stage = 'confirmed'", []],
    ['SELECT id FROM orders WHERE archived = 0 AND phone IN (?)', ['0550000000']],
    ['SELECT status, COUNT(*) FROM orders WHERE archived = 0 AND day >= ? AND day <= ? GROUP BY status', ['2026-01-01', '2026-12-31']],
    ['SELECT id FROM orders WHERE id = ?', ['#1']]
  ];
  plans.forEach((p) => {
    const plan = env.DB.plan(p[0], p[1]);
    assert.ok(/USING (COVERING )?INDEX|USING INTEGER PRIMARY KEY|PRIMARY KEY/.test(plan), p[0] + ' → ' + plan);
  });
});

test('Pendant l’essai : Expédier se lit, mais Ecotrack et les SMS restent dans l’application Google', async () => {
  await fresh();
  const list = await api('api_shippingList');
  assert.ok(Array.isArray(list.rows || list.orders || list.toShip || []));
  const r = await apiRaw('admin@example.com', 'api_shipEcotrack', [['1001']]);
  assert.deepStrictEqual([r.status, r.body.ok, r.body.code], [200, false, 'later']);
  assert.ok(/essai/.test(r.body.error));
});

/* ---------------- Étape 2 : après le basculement ---------------- */

test('Étape 2 · Expédier : créer les colis, bordereaux, valider — comme la version Google ; SMS envoyés par la tâche automatique', async () => {
  await fresh(true);
  let conf = readOrders_().orders.filter((o) => o.status === STATUS.CONFIRMED && !String(o.tracking).trim()).slice(0, 4).map((o) => String(o.id));
  assert.ok(conf.length >= 2, 'commandes confirmées dans les données d’exemple');
  const list = await api('api_shippingList');
  const gl = gas('api_shippingList');
  assert.deepStrictEqual(JSON.stringify(list.rows ? list.rows.map((r) => r.id) : Object.keys(list)), JSON.stringify(gl.rows ? gl.rows.map((r) => r.id) : Object.keys(gl)));
  // Créer les colis : même résultat (le faux Ecotrack est remis dans le même état entre les deux).
  let before = ecoState();
  const g = gas('api_shipEcotrack', conf);
  const gOrders = conf.map((id) => pick(sheetOrder(id)));
  ecoRestore(before);
  const w = await api('api_shipEcotrack', conf);
  assert.deepStrictEqual((await Promise.all(conf.map(dbOrder))).map(pick), gOrders);
  assert.deepStrictEqual(w, g, 'même réponse (colis créés, refus expliqués)');
  conf = conf.filter((id, i) => gOrders[i].tracking);
  assert.ok(conf.length >= 1, 'au moins un colis créé');
  // Bordereaux (PDF) : mêmes fichiers.
  const lw = await api('api_labelFiles', conf);
  const lg = gas('api_labelFiles', conf);
  assert.deepStrictEqual(JSON.stringify(lw).length, JSON.stringify(lg).length);
  await api('api_markLabelsPrinted', conf.map((id) => ({ id: id, format: 'A4' })));
  gas('api_markLabelsPrinted', conf.map((id) => ({ id: id, format: 'A4' })));
  // Valider l'expédition : « Expédiée », SMS mis en file.
  before = ecoState();
  const gv = gas('api_validateParcels', conf, false);
  const gOrders2 = conf.map((id) => pick(sheetOrder(id)));
  ecoRestore(before);
  const wv = await api('api_validateParcels', conf, false);
  assert.strictEqual(wv.message, gv.message);
  const wOrders2 = (await Promise.all(conf.map(dbOrder))).map(pick);
  assert.deepStrictEqual(wOrders2.map((o) => [o.status, o.tracking]), gOrders2.map((o) => [o.status, o.tracking]));
  assert.ok(wOrders2.every((o) => o.status === STATUS.SHIPPED), JSON.stringify(wOrders2));
  const q = await kvQueue();
  assert.strictEqual(q.length, conf.length, 'un SMS « Expédiée » par colis');
  // Tâche automatique : les SMS partent.
  const sent = __fakeHttpsms.calls.length;
  const out = await cron(env);
  assert.ok(!out.smsError, out.smsError);
  assert.strictEqual(__fakeHttpsms.calls.length - sent, conf.length);
  assert.deepStrictEqual(await kvQueue(), []);
  assert.ok(/في الطريق/.test(__fakeHttpsms.calls[__fakeHttpsms.calls.length - 1].body.content));
});

test('Étape 2 · Suivi : statuts Ecotrack lus (bouton et tâche automatique), alertes, historique — comme la version Google', async () => {
  await fresh(true);
  let before = ecoState();
  const conf = gas('api_shipEcotrack', readOrders_().orders.filter((o) => o.status === STATUS.CONFIRMED && !String(o.tracking).trim()).map((o) => String(o.id)))
    .filter((x) => x.ok).map((x) => x.id).slice(0, 1);
  assert.strictEqual(conf.length, 1, 'un colis créé');
  gas('api_validateParcels', conf, false);
  ecoRestore(before);
  await api('api_shipEcotrack', conf);
  await api('api_validateParcels', conf, false);
  const tracking = (await dbOrder(conf[0])).tracking;
  assert.strictEqual(tracking, sheetOrder(conf[0]).tracking);
  // Bouton « Actualiser » : même lecture que la version Google.
  __fakeEcotrack.setStatus(tracking, 'en_livraison');
  const gs = gas('api_ecotrackSyncStatuses');
  const ws = await api('api_ecotrackSyncStatuses');
  assert.strictEqual(ws.message, gs.message);
  assert.deepStrictEqual(pick(await dbOrder(conf[0])), pick(sheetOrder(conf[0])));
  assert.strictEqual((await dbOrder(conf[0])).status, STATUS.IN_DELIVERY);
  const ov = await api('api_trackingOverview', 30);
  const go = gas('api_trackingOverview', 30);
  assert.deepStrictEqual(Object.keys(ov).sort(), Object.keys(go).sort());
  assert.strictEqual(JSON.stringify(ov.alerts || ov.groups || ov.counts || ''), JSON.stringify(go.alerts || go.groups || go.counts || ''));
  const hw = await api('api_parcelHistory', conf[0]);
  const hg = gas('api_parcelHistory', conf[0]);
  assert.deepStrictEqual(Object.keys(hw).sort(), Object.keys(hg).sort());
  // Tâche automatique (chaque minute, lecture Ecotrack selon l'intervalle réglé).
  __fakeEcotrack.setStatus(tracking, 'livre_non_encaisse');
  await env.DB.prepare("DELETE FROM kv WHERE key = 'cf:ecoLast'").run();
  const out = await cron(env);
  assert.ok(out.ecotrack && !out.ecotrackError, JSON.stringify(out));
  assert.strictEqual((await dbOrder(conf[0])).status, STATUS.DELIVERED);
  // Communes d'Ecotrack (objet { "0": …, "1": … } comme l'API) : gardées à part, pas lues à chaque requête.
  assert.strictEqual(out.communes && out.communes.communes, 5, JSON.stringify(out.communes));
  const big = JSON.parse((await env.DB.prepare("SELECT value FROM kv WHERE key = 'big:ecoCommunes'").first()).value);
  assert.deepStrictEqual(big.list[1], { w: 16, n: 'Bab Ezzouar', p: '16024', s: 1, a: 'باب الزوار' });
  const again = await cron(env);
  assert.ok(!again.ecotrack, 'pas avant l’intervalle réglé (60 min)');
  assert.ok(!again.communes, 'communes : une fois par semaine');
  // Revenu en essai : la tâche automatique ne fait plus rien.
  await bridge('/bridge/live', { live: false });
  assert.deepStrictEqual(await cron(env), { live: false });
});

test('Étape 2 · Pont : nouvelles commandes reçues, changements recopiés dans le classeur, marques de stock, réglages', async () => {
  await fresh(true);
  const cut = (await bridge('/bridge/status', null));
  assert.strictEqual(cut.live, true);
  // Recopie depuis le classeur refusée après le basculement (sauf au basculement lui-même).
  const r = await call(new Request(HOST + '/bridge/import', { method: 'POST', headers: { 'x-dz-key': SECRET }, body: JSON.stringify({ reset: true }) }));
  assert.strictEqual(r.status, 409);
  // Nouvelle commande préparée par Apps Script.
  releasitTab_();
  const s0 = (await bridge('/bridge/changes', { after: 0 })).last;
  releasitRow_('9101', '0550887766');
  transferReleasitOrders_();
  const fresh9101 = sheetOrder('9101');
  assert.strictEqual(fresh9101.status, STATUS.TO_CONFIRM);
  const existing = readOrders_().orders[0];
  const added = await bridge('/bridge/orders', { orders: [fresh9101, plainOrder_(existing)] });
  assert.deepStrictEqual(added.added, ['9101']);
  assert.strictEqual(added.skipped, 1, 'déjà là : pas de doublon');
  const q = await api('api_queue', {});
  assert.ok(q.due.concat(q.later, q.waiting).some((x) => x.id === '9101'), 'dans la file de Confirmation');
  assert.strictEqual((await bridge('/bridge/changes', { after: s0 })).changes.length, 0, 'pas renvoyée au classeur');
  // Confirmée dans Cloudflare → recopiée dans le classeur (sans 2e SMS côté Google).
  await api('api_recordCall', '9101', 'confirm', { fields: {} }, {});
  await api('api_updateOrder', '9101', { notes: 'Appeler après 17 h' });
  const ch = await bridge('/bridge/changes', { after: s0 });
  assert.strictEqual(ch.changes.filter((c) => c.id === '9101').length, 1, 'une seule fois, son état actuel');
  const smsG = readSmsQueue_(PropertiesService.getScriptProperties()).length;
  const applied = cloudApplyChanges_(ch.changes);
  assert.ok(applied.updated >= 1);
  const a = sheetOrder('9101');
  const b = await dbOrder('9101');
  K_ORDER_KEYS.forEach((k) => { if (k !== 'stockMove') assert.strictEqual(String(a[k]), String(b[k]), k); });
  assert.strictEqual(a.status, STATUS.CONFIRMED);
  assert.strictEqual(readSmsQueue_(PropertiesService.getScriptProperties()).length, smsG);
  // Marque de stock posée par Apps Script : enregistrée sans repartir dans les changements.
  const last = ch.last;
  await bridge('/bridge/marks', { marks: [{ id: '9101', stockMove: 'Sorti' }] });
  assert.strictEqual((await dbOrder('9101')).stockMove, 'Sorti');
  assert.strictEqual((await bridge('/bridge/changes', { after: last })).changes.length, 0);
  // Liste noire, suppression, corbeille vidée : notés pour le classeur.
  await api('api_setBlacklist', '0550887766', true, 'Test');
  const del = readOrders_().orders.filter((o) => o.status === STATUS.TO_CONFIRM && String(o.id) !== '9101')[0];
  await api('api_deleteOrders', [String(del.id)], 'Doublon');
  await api('api_purgeTrash', [String(del.id)]);
  const ch2 = (await bridge('/bridge/changes', { after: last })).changes;
  assert.deepStrictEqual(ch2.map((c) => c.kind).filter((k) => k !== 'update'), ['blacklist:on', 'delete', 'purge']);
  cloudApplyChanges_(ch2);
  assert.strictEqual(readClients_().blacklist['0550887766'], true);
  assert.strictEqual(findOrder_(readOrders_(), del.id), null);
  assert.ok(trashIds_()[String(del.id)]);
  // Une commande effacée ne revient pas par Releasit/Shopify.
  const again = await bridge('/bridge/orders', { orders: [Object.assign({}, fresh9101, { id: String(del.id) })] });
  assert.deepStrictEqual(again.added, []);
  // Réglages renvoyés par Apps Script : lus par la version Cloudflare.
  const cfg = cloudConfigSnapshot_();
  const settings = JSON.parse(cfg['cfg:settings']);
  settings.NOM_BOUTIQUE = 'Boutique renommée';
  await bridge('/bridge/config', { config: { 'cfg:settings': JSON.stringify(settings) }, props: { ECOTRACK_TOKEN: 'x'.repeat(30), PAS_PERMIS: 'non' } });
  assert.strictEqual((await api('api_bootstrap', null)).shop, 'Boutique renommée');
  const kv = await env.DB.prepare("SELECT key FROM kv WHERE key IN ('ECOTRACK_TOKEN', 'PAS_PERMIS')").all();
  assert.deepStrictEqual(kv.results.map((x) => x.key), ['ECOTRACK_TOKEN'], 'seules les clés prévues');
  assert.strictEqual((await api('api_bootstrap', null)).cloud.step, 2);
});

test('Étape 2 · File des SMS : deux actions en même temps ne s’effacent pas', async () => {
  await fresh(true);
  const set = (v) => env.DB.prepare("INSERT INTO kv (key, value) VALUES ('SMS_QUEUE', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(v)).run();
  const A = { i: 'A', s: 'x' }; const B = { i: 'B', s: 'x' }; const C = { i: 'C', s: 'x' }; const D = { i: 'D', s: 'x' };
  // Lue [A] ; une autre action a ajouté C entre-temps ; celle-ci ajoute B.
  await set([A, C]);
  await smsQueueStatement(env.DB, { base: { props: { SMS_QUEUE: JSON.stringify([A]) } } }, JSON.stringify([A, B])).run();
  assert.deepStrictEqual(await kvQueue(), [A, C, B]);
  // Lue [A, C] ; A envoyé ; D ajouté entre-temps par une autre.
  await set([A, C, B, D]);
  await smsQueueStatement(env.DB, { base: { props: { SMS_QUEUE: JSON.stringify([A, C, B]) } } }, JSON.stringify([C, B])).run();
  assert.deepStrictEqual(await kvQueue(), [C, B, D]);
  // File vide au départ.
  await env.DB.prepare("DELETE FROM kv WHERE key = 'SMS_QUEUE'").run();
  await smsQueueStatement(env.DB, { base: { props: {} } }, JSON.stringify([A])).run();
  assert.deepStrictEqual(await kvQueue(), [A]);
});

/* ---------------- Étape 3 : tout dans Cloudflare ---------------- */

test('Étape 3 · Stock : même page que la version Google ; entrée de stock et expédition : onglet Produits et mouvements dans la base', async () => {
  await fresh(true, true);
  const w = await api('api_stockPage');
  const g = gas('api_stockPage');
  assert.deepStrictEqual(w.products, g.products);
  assert.deepStrictEqual([w.totals, w.low, w.rupture], [g.totals, g.low, g.rupture]);
  assert.deepStrictEqual(w.unknown.map((u) => [u.label, u.orders, u.price]), g.unknown.map((u) => [u.label, u.orders, u.price]));
  // Entrée de stock : même résultat ; l'onglet Produits de la base est à jour, le mouvement noté.
  const m = g.products[0].models[0];
  const input = { items: [{ row: m.row, key: m.key, qty: 5, cost: 1000 }], supplier: 'Fournisseur test' };
  const s0 = (await bridge('/bridge/changes', { after: 0 })).last;
  const we = await api('api_stockEntry', input);
  const ge = gas('api_stockEntry', input);
  assert.strictEqual(we.message, ge.message);
  const w2 = await api('api_stockPage');
  const g2 = gas('api_stockPage');
  assert.deepStrictEqual(w2.products, g2.products, 'même stock et même coût moyen');
  assert.deepStrictEqual(w2.moves.map((x) => [x.type, x.qty, x.after, x.order]), g2.moves.slice(0, w2.moves.length).map((x) => [x.type, x.qty, x.after, x.order]));
  assert.strictEqual((await api('api_bootstrap', null)).products.length, gas('api_bootstrap', null).products.length);
  // Changements pour le classeur : l'onglet Produits (paquet de lignes) et le mouvement.
  const ch = await bridge('/bridge/changes', { after: s0 });
  const tab = ch.changes.find((c) => c.kind === 'tab' && c.id === 'Produits');
  assert.ok(tab && tab.tab.parts[0].length >= 2, 'onglet Produits à recopier');
  assert.ok(ch.changes.some((c) => c.kind === 'moves'), 'mouvement à recopier');
  // Expédition (Ecotrack) : le stock baisse ici, comme dans la version Google.
  const conf = readOrders_().orders.filter((o) => o.status === STATUS.CONFIRMED && !String(o.tracking).trim()).map((o) => String(o.id));
  const before = ecoState();
  const ok = gas('api_shipEcotrack', conf).filter((x) => x.ok).map((x) => x.id);
  gas('api_validateParcels', ok, false);
  ecoRestore(before);
  await api('api_shipEcotrack', conf);
  await api('api_validateParcels', ok, false);
  const w3 = await api('api_stockPage');
  const g3 = gas('api_stockPage');
  assert.deepStrictEqual(w3.products.map((p) => p.models.map((x) => [x.key, x.stock, x.reserved])), g3.products.map((p) => p.models.map((x) => [x.key, x.stock, x.reserved])));
  assert.strictEqual((await dbOrder(ok[0])).stockMove, sheetOrder(ok[0]).stockMove);
  assert.strictEqual((await dbOrder(ok[0])).stockMove, 'Sorti');
});

test('Étape 3 · Stock v1.8 : packs, masquer, fusionner, supprimer, annuler un mouvement, valeur à une date — comme la version Google', async () => {
  await fresh(true, true);
  const both = async (fn, ...args) => {
    let w = null;
    let g = null;
    try { w = await api(fn, ...args); } catch (e) { w = { error: e.message.replace(fn + ' : ', '') }; }
    try { g = gas(fn, ...args); } catch (e) { g = { error: e.message }; }
    assert.deepStrictEqual(w, g, fn);
    return w;
  };
  const model = (d, product, name) => { let out = null; d.products.forEach((p) => p.models.forEach((m) => { if (p.product === product && m.model === (name || '')) out = m; })); return out; };
  await both('api_addProduct', { product: 'Pack Montre + Écouteurs', price: 6200, pack: [{ label: 'Montre connectée', qty: 1 }, { label: 'Écouteurs sans fil', qty: 2 }] });
  await both('api_addProduct', { product: 'Coque', models: [{ model: 'A14', stock: 3, cost: 400, price: 1500 }, { model: 'A-14', stock: 2 }, { model: 'A24', stock: 0 }] });
  let w = await api('api_stockPage');
  let g = gas('api_stockPage');
  assert.deepStrictEqual(w.products, g.products, 'même page (pack, réservations, photos)');
  const pack = model(w, 'Pack Montre + Écouteurs');
  assert.ok(pack.pack && pack.available !== null && pack.costAuto);
  // Masquer, fusionner, supprimer.
  const a24 = model(w, 'Coque', 'A24');
  await both('api_setCatalogActive', { row: a24.row, key: a24.key, active: false });
  const dup = model(w, 'Coque', 'A-14');
  const good = model(w, 'Coque', 'A14');
  await both('api_mergeCatalogRows', { from: { row: dup.row, key: dup.key }, to: { row: good.row, key: good.key } });
  w = await api('api_stockPage');
  g = gas('api_stockPage');
  assert.deepStrictEqual(w.products, g.products, 'après la fusion');
  assert.deepStrictEqual([model(w, 'Coque', 'A14').stock, !!model(w, 'Coque', 'A-14')], [5, false]);
  const used = model(w, 'Montre connectée');
  const r1 = await both('api_deleteCatalogRow', { row: used.row, key: used.key });
  assert.ok(/fait partie du pack/.test(r1.error), r1.error);
  const inPack = ['Montre connectée', 'Écouteurs sans fil'];
  const shipped = w.products.find((p) => inPack.indexOf(p.product) < 0 && p.models.some((m) => m.reserved > 0));
  const res = shipped.models.find((m) => m.reserved > 0);
  const r2 = await both('api_deleteCatalogRow', { row: res.row, key: res.key });
  assert.ok(/commandes? l’utilise/.test(r2.error), r2.error);
  const a24b = model(w, 'Coque', 'A24');
  await both('api_deleteCatalogRow', { row: a24b.row, key: a24b.key });
  w = await api('api_stockPage');
  g = gas('api_stockPage');
  assert.deepStrictEqual(w.products, g.products, 'après la suppression');
  // Annuler l'entrée « Stock initial » de A14 (chaque version a ses propres références).
  const wm = w.moves.find((m) => m.type === 'Stock initial' && m.model === 'A14');
  const gm = g.moves.find((m) => m.type === 'Stock initial' && m.model === 'A14');
  assert.ok(wm.undoable && gm.undoable);
  const wu = await api('api_undoStockMove', { ref: wm.ref, key: wm.key, type: wm.type, qty: wm.qty, date: wm.date });
  const gu = gas('api_undoStockMove', { ref: gm.ref, key: gm.key, type: gm.type, qty: gm.qty, date: gm.date });
  assert.strictEqual(wu.message, gu.message);
  await assert.rejects(api('api_undoStockMove', { ref: wm.ref, key: wm.key, type: wm.type, qty: wm.qty, date: wm.date }), /déjà été annulé/);
  w = await api('api_stockPage');
  g = gas('api_stockPage');
  assert.deepStrictEqual(w.products, g.products, 'après l’annulation');
  assert.ok(w.moves.find((m) => m.ref === wm.ref).undone);
  // Valeur à une date : aujourd'hui = stock actuel ; hier = sans les mouvements d'aujourd'hui.
  const today = ymd_(new Date());
  const wt = await api('api_stockAt', today);
  const gt = gas('api_stockAt', today);
  assert.deepStrictEqual([wt.units, wt.value], [gt.units, gt.value]);
  const y = ymd_(new Date(Date.now() - 86400000));
  const wy = await api('api_stockAt', y);
  const gy = gas('api_stockAt', y);
  assert.deepStrictEqual([wy.units, wy.value], [gy.units, gy.value]);
  assert.notStrictEqual(wy.units, wt.units, 'les mouvements d’aujourd’hui (colis partis, ajouts) ne comptent pas hier');
  // Le classeur reçoit l'onglet Produits (ligne supprimée) et les mouvements.
  const ch = await bridge('/bridge/changes', { after: 0 });
  const tab = ch.changes.filter((c) => c.kind === 'tab' && c.id === 'Produits').pop();
  assert.strictEqual(tab.tab.n, __mock.ss().getSheetByName('Produits').getLastRow(), 'même nombre de lignes que l’onglet Google');
  assert.ok(ch.changes.some((c) => c.kind === 'moves' && /Annulation/.test(c.info)));
});

test('Étape 3 · Bénéfices et Statistiques : mêmes chiffres que la version Google (résumés par jour), dépenses, prime, recalcul', async () => {
  await fresh(true, true);
  const n = await settleDays();
  assert.ok(n >= 1, 'résumés calculés par la tâche automatique');
  for (const period of ['30', '7', 'all']) {
    const w = await api('api_profit', period);
    const g = gas('api_profit', period);
    assert.deepStrictEqual(round(w.totals), round(g.totals), 'totaux ' + period);
    assert.deepStrictEqual(round(w.series), round(g.series), 'courbe ' + period);
    assert.deepStrictEqual(round(w.products), round(g.products), 'produits ' + period);
    assert.deepStrictEqual(round(w.campaigns), round(g.campaigns), 'campagnes ' + period);
    assert.deepStrictEqual(round(w.breakEven), round(g.breakEven));
    assert.deepStrictEqual(w.prev && round(w.prev), g.prev && round(g.prev));
    assert.strictEqual(w.pending, 0);
  }
  // Dépense ajoutée dans Cloudflare : onglet Dépenses de la base, bénéfice net mis à jour.
  const exp = { category: 'Publicité Facebook', campaign: 'Promo', amount: 1000, currency: 'DA', date: new Date(Date.now() - 2 * 86400000).toISOString() };
  await api('api_addExpense', exp);
  gas('api_addExpense', exp);
  const w = await api('api_profit', '30');
  const g = gas('api_profit', '30');
  assert.deepStrictEqual([w.totals.expenses, w.totals.net], [g.totals.expenses, g.totals.net]);
  assert.strictEqual(w.expenses.length, g.expenses.length);
  // v1.10 : pub reliée à un produit (case Produit), pubs sans produit, Relier : comme la version Google.
  const prod = g.adProducts[0].product;
  assert.deepStrictEqual(w.adProducts, g.adProducts);
  const ad = { category: 'Publicité TikTok', campaign: 'TT produit', amount: 3000, currency: 'DA', date: new Date(Date.now() - 86400000).toISOString(), product: prod };
  await api('api_addExpense', ad);
  gas('api_addExpense', ad);
  const w2 = await api('api_profit', '30');
  const g2 = gas('api_profit', '30');
  assert.ok(w2.products.some((x) => x.product === prod && x.ad > 0), 'la pub compte dans le produit');
  assert.deepStrictEqual(round(w2.products), round(g2.products), 'produits après pub');
  assert.deepStrictEqual([w2.adLinks, w2.adAlerts, w2.adUnlinked], [g2.adLinks, g2.adAlerts, g2.adUnlinked]);
  assert.ok(w2.adUnlinked.some((u) => u.campaign === 'Promo'));
  const lk = await api('api_linkCampaign', 'Promo', prod);
  gas('api_linkCampaign', 'Promo', prod);
  assert.strictEqual(lk.linked, 1);
  const w3 = await api('api_profit', '30');
  const g3 = gas('api_profit', '30');
  assert.ok(!w3.adUnlinked.some((u) => u.campaign === 'Promo'), 'campagne reliée');
  assert.deepStrictEqual(round(w3.products), round(g3.products), 'produits après Relier');
  assert.ok((await bridge('/bridge/changes', { after: 0 })).changes.some((c) => c.id === 'Dépenses'), 'onglet Dépenses recopié dans le classeur');
  // Statistiques.
  for (const period of ['30', 'month']) {
    const ws = await api('api_stats', period);
    const gs = gas('api_stats', period);
    assert.deepStrictEqual(round(ws.kpis), round(gs.kpis), 'kpis ' + period);
    assert.deepStrictEqual(round(ws.series), round(gs.series), 'courbe ' + period);
    assert.deepStrictEqual(round(ws.wilayas), round(gs.wilayas));
    assert.deepStrictEqual(round(ws.products), round(gs.products));
    assert.deepStrictEqual(round(ws.agents), round(gs.agents));
    assert.deepStrictEqual(round(ws.money.toReceive), round(gs.money.toReceive));
    assert.deepStrictEqual(ws.hours, gs.hours);
    // v1.9 : appels, vitesse, grille, sources (qualité), phrases, objectif du jour.
    assert.deepStrictEqual([ws.calls, round(ws.speed), ws.heat], [gs.calls, round(gs.speed), gs.heat], 'appels, vitesse, grille ' + period);
    assert.deepStrictEqual(round(ws.sources), round(gs.sources), 'sources ' + period);
    assert.deepStrictEqual(round(ws.campaigns), round(gs.campaigns), 'campagnes ' + period);
    assert.deepStrictEqual(ws.insights, gs.insights, 'ce qui a changé ' + period);
    assert.deepStrictEqual(ws.goal, gs.goal, 'objectif du jour ' + period);
  }
  // Filtre croisé : la base choisit les commandes du filtre ; mêmes chiffres que la version Google.
  const big = gas('api_stats', '30');
  const filters = [{ kind: 'w', value: big.wilayas[0].name }, { kind: 'p', value: big.products[0].name }, { kind: 'a', value: big.agents[0].name },
    { kind: 'cp', value: big.campaigns[0].name }, { kind: 'src', value: big.sources[0].name }];
  for (const f of filters) {
    const wf = await api('api_stats', '30', '', '', f);
    const gf = gas('api_stats', '30', '', '', f);
    assert.ok(wf.filter && wf.kpis.orders > 0, 'filtre ' + f.kind);
    assert.deepStrictEqual(round(wf.kpis), round(gf.kpis), 'filtre ' + f.kind + ' : chiffres');
    assert.deepStrictEqual(round(wf.wilayas), round(gf.wilayas), 'filtre ' + f.kind + ' : wilayas');
    assert.deepStrictEqual(round(wf.products), round(gf.products), 'filtre ' + f.kind + ' : produits');
    assert.deepStrictEqual(round(wf.series), round(gf.series), 'filtre ' + f.kind + ' : courbe');
  }
  // Objectif du jour (réglage Paramètres, recopié dans le classeur).
  const goal = await api('api_setGoal', 20);
  gas('api_setGoal', 20);
  assert.ok(/20 commandes/.test(goal.message));
  assert.strictEqual((await api('api_stats', '7')).goal.perDay, 20);
  // Une commande change : son jour est recalculé (au plus tard à l'ouverture de la page).
  const o = readOrders_().orders.filter((x) => x.status === STATUS.TO_CONFIRM)[0];
  await api('api_recordCall', String(o.id), 'confirm', { fields: {} }, {});
  gas('api_recordCall', String(o.id), 'confirm', { fields: {} }, {});
  const after = await api('api_stats', '30');
  assert.strictEqual(after.kpis.confirmed, gas('api_stats', '30').kpis.confirmed);
  // Prime (Paramètres) puis « Recalculer » : tous les jours à refaire, la page le dit.
  const pr = await api('api_setPrime', 50, '2026-01-01');
  assert.ok(/50 DA/.test(pr.message));
  assert.ok(/PRIMES/.test(JSON.stringify((await bridge('/bridge/changes', { after: 0 })).changes.filter((c) => c.id === 'Paramètres').map((c) => c.tab))));
  const rb = await api('api_rebuildStats');
  assert.ok(/recalculé/.test(rb.message));
  const pending = await api('api_stats', '30');
  assert.ok(pending.pending > 0, 'jours encore en calcul');
  await settleDays();
  assert.strictEqual((await api('api_stats', '30')).pending, 0);
});

test('Étape 3 · Administration : réglages, équipe (partage via le classeur), état de l’outil, pages chargées à la demande', async () => {
  await fresh(true, true);
  const ws = await api('api_settingsGet');
  const gs = gas('api_settingsGet');
  assert.deepStrictEqual(Object.keys(ws).sort(), Object.keys(gs).sort());
  await api('api_settingsSave', { NOM_BOUTIQUE: 'Boutique Cloudflare' });
  assert.strictEqual((await api('api_bootstrap', null)).shop, 'Boutique Cloudflare', 'réglage recalculé depuis l’onglet');
  const t = await api('api_teamSave', { email: 'nouvelle@example.com', name: 'Nouvelle', role: 'Confirmatrice' });
  assert.ok(/ajouté/.test(t.message), t.message);
  assert.ok(t.team.members.some((m) => m.email === 'nouvelle@example.com' && m.access === true));
  const ch = (await bridge('/bridge/changes', { after: 0 })).changes;
  assert.ok(ch.some((c) => c.kind === 'share:add' && c.id === 'nouvelle@example.com'), 'partage demandé au classeur');
  assert.ok(ch.some((c) => c.kind === 'tab' && c.id === 'Équipe'));
  // La nouvelle personne peut entrer.
  const st = await apiRaw('nouvelle@example.com', 'api_counts', []);
  assert.strictEqual(st.body.ok, true);
  const ov = await api('api_adminOverview');
  assert.strictEqual(ov.health.cloud, true);
  assert.ok(ov.health.tasks.some((x) => x.key === 'days'));
  assert.strictEqual(ov.connections.cloud.inCloud, true);
  assert.strictEqual(ov.connections.ecotrack.configured, true);
  const page = await api('api_pageScript', 'stock', { fn: 'api_stockPage', args: [] });
  assert.ok(page.code.length > 1000 && page.preload && page.preload.data.products.length);
  const boot = await api('api_bootstrap', null);
  assert.strictEqual(boot.cloud.step, 3);
  // Modification à la main dans le classeur : reprise ; refusée si Cloudflare a changé l'onglet depuis.
  const values = cloudTabValues_('Tarifs');
  const last = (await bridge('/bridge/changes', { after: 0 })).last;
  const okPush = await bridge('/bridge/tabs', { tabs: { Tarifs: values }, base: { Tarifs: last } });
  assert.deepStrictEqual(okPush.saved, ['Tarifs']);
  const eq = cloudTabValues_('Équipe');
  const refused = await bridge('/bridge/tabs', { tabs: { 'Équipe': eq }, base: { 'Équipe': 0 } });
  assert.deepStrictEqual(refused.refused, ['Équipe'], 'Cloudflare a modifié l’équipe depuis : sa version l’emporte');
  // Pas encore à l'étape 3 : ces pages restent dans Google.
  await bridge('/bridge/full', { full: false });
  const later = await apiRaw('admin@example.com', 'api_stockPage', []);
  assert.strictEqual(later.body.code, 'later');
});

test('Étape 3 · Shopify lu par Cloudflare ; SMS « reçue » ; entretien de nuit (archivage, stock)', async () => {
  await fresh(true, true);
  // Shopify configuré (faux serveur), clés envoyées comme le fait Apps Script.
  saveShopifyConfig_(__fakeShopify.host.replace('https://', ''), __fakeShopify.token, '');
  const pp = PropertiesService.getScriptProperties();
  await bridge('/bridge/config', { props: { SHOPIFY_SHOP: pp.getProperty('SHOPIFY_SHOP'), SHOPIFY_TOKEN: pp.getProperty('SHOPIFY_TOKEN') } });
  const first = await api('api_shopifyImport'); // commandes d'exemple déjà là : écartées
  assert.strictEqual(first.imported, 0, JSON.stringify(first));
  __fakeShopify.add({ name: '#7001', client: 'Nouveau Shopify', phoneInput: '0661009988' });
  const r = await api('api_shopifyImport');
  assert.strictEqual(r.imported, 1, JSON.stringify(r));
  const o7 = await dbOrder('#7001');
  assert.strictEqual(o7.status, STATUS.TO_CONFIRM, 'préparée comme avant (statut, téléphone, frais)');
  assert.strictEqual(o7.phone, '0661009988');
  const q = await api('api_queue', {});
  assert.ok(q.due.concat(q.later, q.waiting).some((x) => x.id === '#7001'), 'dans la file de Confirmation');
  assert.ok((await kvQueue()).some((x) => x.i === '#7001'), 'SMS « reçue » en file');
  const again = await api('api_shopifyImport');
  assert.strictEqual(again.imported, 0, 'pas de doublon');
  // Commande Releasit reçue du classeur : SMS « reçue » mis en file ici.
  releasitTab_();
  releasitRow_('9401', '0550776655');
  transferReleasitOrders_();
  await bridge('/bridge/orders', { orders: [sheetOrder('9401')] });
  assert.ok((await kvQueue()).some((x) => x.i === '9401'), 'SMS « commande reçue » en file');
  // Entretien de nuit : une vieille commande livrée et payée est archivée (et recopiée dans l'archive du classeur).
  const old = readOrders_().orders.filter((o) => o.status === STATUS.DELIVERED)[0];
  const d = await dbOrder(old.id);
  d.date = new Date(Date.now() - 200 * 86400000).toISOString(); d.updated = d.date; d.carrierMoved = d.date; d.carrier = ''; d.tracking = '';
  await env.DB.prepare('UPDATE orders SET data = ?, updated = ? WHERE id = ?').bind(JSON.stringify(d), d.updated, String(old.id)).run();
  await env.DB.prepare("DELETE FROM kv WHERE key = 'cf:nightDay'").run();
  const s0 = (await bridge('/bridge/changes', { after: 0 })).last;
  const night = await api('api_archiveNow');
  assert.ok(/1 archivée/.test(night.message), night.message);
  assert.strictEqual((await env.DB.prepare('SELECT archived FROM orders WHERE id = ?').bind(String(old.id)).first()).archived, 1);
  const ch = (await bridge('/bridge/changes', { after: s0 })).changes;
  assert.ok(ch.some((c) => c.kind === 'archive' && c.id === String(old.id)));
});

test('v1.11 · Relais RELEASIT : mêmes commandes que la version Google, SMS « reçue » tout de suite, mode relais (plus de recopie)', async () => {
  await fresh(true, true);
  // Le relais (dist/Relais.gs) tourne dans son propre environnement, sur le même classeur.
  const relay = { console: console, SpreadsheetApp: SpreadsheetApp, Utilities: Utilities };
  const store = {};
  relay.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: (k) => { delete store[k]; } }) };
  vm.createContext(relay);
  vm.runInContext(require('../../tests/build-bundle.js').buildRelay(), relay, { filename: 'dist/Relais.gs' });
  /** Un passage du relais : ses lots envoyés au moteur, son repère mis à jour. */
  async function relayPass(resync) {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const job = relay.relaisPrepare_(resync);
      const res = await bridge('/bridge/releasit', JSON.parse(JSON.stringify(job.payload)));
      relay.relaisApply_(job, res);
      out.push(res);
      if (!job.payload.rows || !job.payload.more) break;
    }
    return out;
  }
  // Installation : mode relais, plus de connexion par Google, changements en attente oubliés.
  const before = (await bridge('/bridge/changes', { after: 0 })).changes.length;
  await bridge('/bridge/releasit', { install: true, version: APP_VERSION });
  assert.ok(before >= 0);
  const info = await call(new Request(HOST + '/auth/info'));
  assert.strictEqual(info.body.data.gateway, '', 'plus de lien Google');
  assert.strictEqual((await env.DB.prepare('SELECT COUNT(*) AS n FROM changes').first()).n, 0);
  // Repère de l'ancien code (onglet déjà lu) : le relais reprend après.
  store.RELEASIT_MARK = PropertiesService.getScriptProperties().getProperty('RELEASIT_MARK');
  const first = await relayPass(false);
  assert.deepStrictEqual(first.map((r) => r.added.length), [0], 'rien de nouveau : « je suis là »');
  // Nouvelles lignes Releasit : une commande à deux produits (deux lignes), une simple.
  releasitTab_();
  releasitRow_('9501', '0550112233');
  releasitRow_('9501', '0550112233');
  const sh = releasitTab_();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const pcol = releasitColumns_(head).product;
  sh.getRange(sh.getLastRow(), pcol + 1).setValue('Montre connectée');
  releasitRow_('9502', '0661223344');
  const mark0 = JSON.parse(store.RELEASIT_MARK);
  const sent = __fakeHttpsms.messages.length;
  const res = await relayPass(false);
  assert.deepStrictEqual(res[0].added, ['9501', '9502']);
  // La version Google, sur les mêmes lignes, donne les mêmes commandes.
  transferReleasitOrders_();
  for (const id of ['9501', '9502']) {
    const w = await dbOrder(id);
    const g = sheetOrder(id);
    ['client', 'phone', 'wilaya', 'commune', 'address', 'product', 'qty', 'price', 'shipping', 'total', 'mode', 'status', 'source', 'alert'].forEach((k) => {
      assert.strictEqual(String(w[k]), String(g[k]), id + ' ' + k);
    });
    assert.strictEqual(Math.abs(Date.parse(w.date) - Date.parse(g.date)) < 1000, true, id + ' date');
  }
  assert.ok(/\+/.test((await dbOrder('9501')).product), 'deux lignes = une commande à deux produits');
  // SMS « commande reçue » envoyé tout de suite (pas en file pour la minute suivante).
  assert.strictEqual(__fakeHttpsms.messages.length - sent, 2, 'deux SMS partis');
  assert.ok(!(await kvQueue()).some((x) => x.i === '9501'));
  assert.strictEqual(JSON.parse(store.RELEASIT_MARK).row, mark0.row + 3);
  // Mode relais : rien n'est noté pour une recopie dans le classeur.
  assert.strictEqual((await env.DB.prepare('SELECT COUNT(*) AS n FROM changes').first()).n, 0);
  // Pas de doublon : lignes renvoyées après un repère perdu.
  delete store.RELEASIT_MARK;
  const again = await relayPass(false);
  assert.deepStrictEqual(again.map((r) => r.added.length), [0]);
  // État du relais dans l'application (Administration, état de l'outil).
  const ov = await api('api_adminOverview');
  assert.ok(ov.connections.releasit.relay && ov.connections.releasit.relay.on);
  assert.deepStrictEqual(ov.connections.releasit.relay.lastIds, ['9501', '9502']);
  const relayTask = ov.health.tasks.filter((t) => t.key === 'sheet')[0];
  assert.strictEqual(relayTask.state, 'ok');
  assert.ok(/Relais RELEASIT/.test(relayTask.label));
  // Onglet sans colonne « Order ID » : erreur gardée et renvoyée au relais.
  await assert.rejects(bridge('/bridge/releasit', { header: ['Nom'], rows: [['x']], from: 2 }), /Order ID/);
  assert.ok(/Order ID/.test((await api('api_adminOverview')).connections.releasit.lastError));
});

test('v1.11 · Connexion par téléphone et mot de passe : provisoire, 5 essais, code SMS, code de secours, appareils, mot de passe seulement', async () => {
  await fresh(true, true);
  const post = async (p, body, token) => call(new Request(HOST + p, { method: 'POST', headers: { 'content-type': 'application/json', authorization: token ? 'Bearer ' + token : '', 'user-agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/120' }, body: JSON.stringify(body || {}) }));
  const apiTok = async (token, fn, ...args) => call(new Request(HOST + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(args) }));
  const info0 = (await call(new Request(HOST + '/auth/info'))).body.data;
  assert.strictEqual(info0.password, true, 'étape 3 : connexion par mot de passe proposée');
  assert.ok(info0.gateway, 'et encore par Google');

  // L'administrateur (connecté par Google) crée son mot de passe : son téléphone devient son identifiant.
  const boot0 = await api('api_bootstrap');
  assert.deepStrictEqual([boot0.cloud.auth.via, boot0.cloud.auth.hasPassword], ['google', false]);
  await assert.rejects(api('api_authMine', { phone: '0550 11 22 33', password: '123' }), /trop court/);
  await assert.rejects(api('api_authMine', { phone: '0550 11 22 33', password: '0550112233' }), /numéro de téléphone/);
  const mine = await api('api_authMine', { phone: '0550 11 22 33', password: 'motdepasse1' });
  assert.ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(mine.rescue), 'code de secours donné une fois');
  assert.ok(/^v2\./.test(mine.token), 'cet appareil passe au mot de passe');
  assert.ok((await teamTabCf()).some((r) => r[0] === 'admin@example.com' && String(r[3]) === '0550112233'), 'téléphone écrit dans l’onglet Équipe');
  const boot1 = (await apiTok(mine.token, 'api_bootstrap')).body.data;
  assert.deepStrictEqual([boot1.cloud.auth.via, boot1.user.admin], ['password', true]);
  const pwRow = await env.DB.prepare("SELECT hash, salt, iter FROM auth WHERE phone = '0550112233'").first();
  assert.ok(pwRow.hash && pwRow.hash.indexOf('motdepasse1') < 0 && pwRow.iter >= 10000, 'mot de passe gardé chiffré');

  // Une confirmatrice sans Gmail : téléphone + mot de passe provisoire.
  const add = await api('api_teamSave', { name: 'Sara', phone: '0661 22 33 44', role: 'Confirmatrice' });
  assert.strictEqual(add.key, 'tel:0661223344');
  assert.ok(!/partagé/.test(add.message), 'sans Gmail : pas de partage du classeur');
  const sara = add.team.members.filter((m) => m.key === 'tel:0661223344')[0];
  assert.deepStrictEqual([sara.phone, sara.auth.password], ['0661223344', false]);
  await assert.rejects(api('api_teamSave', { name: 'Autre', phone: '0661223344', role: 'Confirmatrice' }), /déjà utilisé/);
  const temp = await api('api_authTemp', 'tel:0661223344');
  assert.ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(temp.password));
  // Première connexion : le provisoire (même tapé en minuscules, sans tiret), puis son propre mot de passe.
  let r = await post('/auth/login', { phone: '+213 661 22 33 44', password: temp.password.replace('-', '').toLowerCase() });
  assert.strictEqual(r.body.ok, true, JSON.stringify(r.body));
  assert.strictEqual(r.body.data.change, true);
  const tTemp = r.body.data.token;
  r = await apiTok(tTemp, 'api_bootstrap');
  assert.strictEqual(r.body.code, 'change', 'provisoire : il faut d’abord choisir son mot de passe');
  r = await post('/auth/change', { password: 'sara2026' }, tTemp);
  assert.strictEqual(r.body.ok, true, JSON.stringify(r.body));
  r = await apiTok(tTemp, 'api_bootstrap');
  assert.strictEqual(r.body.ok, true);
  assert.deepStrictEqual([r.body.data.user.name, r.body.data.user.admin], ['Sara', false]);
  assert.strictEqual((await apiTok(tTemp, 'api_teamList')).body.ok, false, 'pas l’administration');
  // Mauvais mot de passe : refusé, message identique pour un numéro inconnu.
  r = await post('/auth/login', { phone: '0661223344', password: 'faux' });
  assert.deepStrictEqual([r.status, r.body.error], [401, 'Téléphone ou mot de passe incorrect.']);
  r = await post('/auth/login', { phone: '0699999999', password: 'faux' });
  assert.deepStrictEqual([r.status, r.body.error], [401, 'Téléphone ou mot de passe incorrect.']);
  // Deuxième appareil.
  r = await post('/auth/login', { phone: '0661223344', password: 'sara2026' });
  const tSara2 = r.body.data.token;
  const team1 = await api('api_teamList');
  assert.strictEqual(team1.members.filter((m) => m.key === 'tel:0661223344')[0].auth.devices, 2);

  // Mot de passe oublié : code par SMS (sur son téléphone), 10 minutes.
  const before = __fakeHttpsms.messages.length;
  r = await post('/auth/sms', { phone: '0661 22 33 44' });
  assert.ok(r.body.ok && /code/.test(r.body.data.message), JSON.stringify(r.body));
  const sms = __fakeHttpsms.messages.slice(before)[0];
  assert.ok(/0661223344$/.test(sms.to.replace(/\D/g, '')) || /661223344/.test(sms.to), sms.to);
  const code = sms.content.match(/(\d{6})/)[1];
  r = await post('/auth/sms-check', { phone: '0661223344', code: '000000', password: 'nouveau22' });
  assert.ok(!r.body.ok && /Code incorrect/.test(r.body.error));
  r = await post('/auth/sms-check', { phone: '0661223344', code: code, password: 'nouveau22' });
  assert.ok(r.body.ok, JSON.stringify(r.body));
  assert.strictEqual((await apiTok(tSara2, 'api_bootstrap')).body.code, 'auth', 'nouveau mot de passe : les autres appareils sont déconnectés');
  const tSara3 = r.body.data.token;
  assert.strictEqual((await apiTok(tSara3, 'api_bootstrap')).body.ok, true);

  // 5 essais faux : bloqué 15 minutes, même avec le bon mot de passe.
  for (let i = 0; i < 5; i++) await post('/auth/login', { phone: '0661223344', password: 'mauvais' + i });
  r = await post('/auth/login', { phone: '0661223344', password: 'nouveau22' });
  assert.deepStrictEqual([r.status, /réessayez dans 15 min/.test(r.body.error)], [429, true]);
  await env.DB.prepare("UPDATE auth SET locked = '' WHERE phone = '0661223344'").run();

  // Téléphone perdu : l'administrateur déconnecte tous ses appareils.
  const rv = await api('api_authRevoke', 'tel:0661223344');
  assert.ok(/déconnectée/.test(rv.message));
  assert.strictEqual((await apiTok(tSara3, 'api_bootstrap')).body.code, 'auth');

  // Code de secours de l'administrateur : nouveau mot de passe, et un nouveau code (l'ancien ne sert qu'une fois).
  r = await post('/auth/rescue', { phone: '0550112233', code: mine.rescue.toLowerCase(), password: 'secours99' });
  assert.ok(r.body.ok && r.body.data.rescue && r.body.data.rescue !== mine.rescue, JSON.stringify(r.body));
  r = await post('/auth/rescue', { phone: '0550112233', code: mine.rescue, password: 'secours98' });
  assert.ok(!r.body.ok, 'ancien code refusé');
  r = await post('/auth/login', { phone: '0550112233', password: 'secours99' });
  const tAdmin = r.body.data.token;

  // Mot de passe seulement : la connexion par Google est coupée.
  const set = (await apiTok(tAdmin, 'api_authSettings', { pwdOnly: true })).body;
  assert.ok(set.ok && set.data.pwdOnly, JSON.stringify(set));
  r = await apiRaw('admin@example.com', 'api_bootstrap', []);
  assert.deepStrictEqual([r.status, r.body.code], [401, 'auth']);
  assert.strictEqual((await call(new Request(HOST + '/auth/info'))).body.data.gateway, '');
  assert.strictEqual((await apiTok(tAdmin, 'api_bootstrap')).body.ok, true);

  // Retirée de l'équipe : plus de connexion possible.
  r = await post('/auth/login', { phone: '0661223344', password: 'nouveau22' });
  const tSara4 = r.body.data.token;
  assert.ok((await apiTok(tAdmin, 'api_teamRemove', 'tel:0661223344')).body.ok);
  assert.strictEqual((await apiTok(tSara4, 'api_bootstrap')).body.ok, false);
  r = await post('/auth/login', { phone: '0661223344', password: 'nouveau22' });
  assert.strictEqual(r.status, 401);
  // Journal : connexions, refus, mots de passe.
  const j = (await env.DB.prepare("SELECT action FROM journal WHERE action LIKE 'Connexion%' OR action LIKE 'Mot de passe%'").all()).results.map((x) => x.action);
  ['Connexion', 'Connexion refusée', 'Mot de passe provisoire', 'Mot de passe changé', 'Mot de passe changé (code SMS)', 'Mot de passe changé (code de secours)'].forEach((a) => assert.ok(j.indexOf(a) >= 0, a));
});

test('v1.11 · Alertes par SMS (relais muet puis rétabli) ; sauvegarde « Tout exporter »', async () => {
  await fresh(true, true);
  await api('api_authMine', { phone: '0550112233', password: 'motdepasse1' }); // l'administrateur a un téléphone
  await bridge('/bridge/releasit', { install: true, version: APP_VERSION });
  await cron(env);
  const n0 = __fakeHttpsms.messages.length;
  // Le relais ne répond plus depuis 15 minutes : un SMS à l'administrateur, une seule fois.
  await env.DB.prepare("UPDATE kv SET value = ? WHERE key = 'cf:relayAt'").bind(new Date(Date.now() - 15 * 60000).toISOString()).run();
  await cron(env);
  await cron(env);
  const alerts = __fakeHttpsms.messages.slice(n0).filter((m) => /problème/.test(m.content));
  assert.strictEqual(alerts.length, 1, JSON.stringify(__fakeHttpsms.messages.slice(n0)));
  assert.ok(/Relais RELEASIT/.test(alerts[0].content) && /550112233/.test(alerts[0].to));
  const h = await api('api_health');
  assert.ok(h.problems.some((p) => p.key === 'sheet'), 'visible dans l’état de l’outil');
  // Il revient : SMS « rétabli ».
  await bridge('/bridge/releasit', { version: APP_VERSION, lastRow: 1 });
  await cron(env);
  assert.ok(__fakeHttpsms.messages.slice(n0).some((m) => /rétabli/.test(m.content)));
  assert.ok((await env.DB.prepare("SELECT COUNT(*) AS n FROM journal WHERE action = 'Alerte SMS'").first()).n >= 2);

  // Tout exporter : commandes (archive comprise) par morceaux, onglets, mouvements, Journal.
  const meta = await api('api_exportAll', 'meta');
  assert.ok(meta.orders > 0 && meta.columns.some((c) => c.key === 'phone' && c.title === 'Téléphone'));
  let rows = [];
  for (let off = 0; off >= 0;) { const r = await api('api_exportAll', 'orders', off); rows = rows.concat(r.rows); off = r.next; }
  assert.strictEqual(rows.length, meta.orders);
  const tabs = await api('api_exportAll', 'tabs');
  assert.ok(tabs.tabs['Produits'].length > 1 && tabs.tabs['Équipe'].length > 1);
  assert.ok(!JSON.stringify(tabs).includes('motdepasse1') && !JSON.stringify(tabs).includes('cf:authKey'), 'pas de mot de passe dans l’export');
  assert.ok((await api('api_exportAll', 'journal')).rows.length > 0);
  await api('api_exportAll', 'done');
  assert.ok((await api('api_bootstrap')).cloud.lastExport, 'date du dernier export (rappel chaque semaine)');
});

/* Faux service de notifications (comme ceux de Google, Apple, Mozilla) : note chaque envoi. */
const pushBox = { calls: [], gone: {} };
(function () {
  const prev = UrlFetchApp.fetch;
  UrlFetchApp.fetch = function (url, params) {
    if (String(url).indexOf('https://push.example.test/') !== 0) return prev.call(UrlFetchApp, url, params);
    pushBox.calls.push({ url: String(url), headers: (params && params.headers) || {}, body: params && params.payload });
    const code = pushBox.gone[url] ? 410 : 201;
    return { getResponseCode: () => code, getContentText: () => '', getAllHeaders: () => ({}), getContent: () => [] };
  };
})();

test('v1.13 · Communes d’Ecotrack : noms arabes, commune reconnue à l’arrivée, liste pour l’appareil, Expédier refuse une commune inconnue', async () => {
  await fresh(true, true);
  await api('api_settingsSave', { SOCIETE_PAR_DEFAUT: 'Ecotrack' });
  // La liste officielle, lue par la tâche de chaque minute (une fois par semaine), avec les noms arabes.
  await env.DB.prepare("DELETE FROM kv WHERE key LIKE 'cf:ecoCommunes%' OR key = 'big:ecoCommunes'").run();
  const out = await cron(env);
  assert.strictEqual(out.communes && out.communes.communes, 5, JSON.stringify(out.communes));
  const big = JSON.parse((await env.DB.prepare("SELECT value FROM kv WHERE key = 'big:ecoCommunes'").first()).value);
  assert.strictEqual(big.list.filter((c) => c.n === 'Bab Ezzouar')[0].a, 'باب الزوار');
  assert.ok(!(await cron(env)).communes, 'pas avant une semaine');
  // Ecotrack en panne : la liste d'avant reste.
  await env.DB.prepare("DELETE FROM kv WHERE key = 'cf:ecoCommunesAt'").run();
  __fakeEcotrack.queue.push({ code: 500 });
  await env.DB.prepare("UPDATE kv SET value = '1' WHERE key = 'cf:ecoCommunesV'").run();
  const failed = await cron(env);
  assert.ok(failed.communes && failed.communes.error, JSON.stringify(failed.communes));
  assert.strictEqual(JSON.parse((await env.DB.prepare("SELECT value FROM kv WHERE key = 'big:ecoCommunes'").first()).value).n, 5);
  await env.DB.prepare("UPDATE kv SET value = '2' WHERE key = 'cf:ecoCommunesV'").run();
  // L'appareil : la liste, et sa version au démarrage.
  const boot = await api('api_bootstrap');
  assert.ok(boot.cloud.communesAt);
  const cm = await api('api_communes');
  assert.deepStrictEqual([cm.n, cm.at], [5, boot.cloud.communesAt]);
  // Arrivée par le relais : « باب الزوار » devient « Bab Ezzouar » (l'écrit du client est gardé) ; « حي 500 مسكن » reste (à vérifier).
  await bridge('/bridge/releasit', { install: true, version: APP_VERSION });
  releasitTab_();
  releasitRow_('9601', '0550112244', { wilaya: 'Alger', commune: 'باب الزوار' });
  releasitRow_('9602', '0661223355', { wilaya: 'Alger', commune: 'حي 500 مسكن' });
  const vals = releasitTab_().getDataRange().getValues();
  const res = await bridge('/bridge/releasit', { header: vals[0], rows: vals.slice(-2), from: vals.length - 1, more: false });
  assert.deepStrictEqual(res.added, ['9601', '9602']);
  const o1 = await dbOrder('9601');
  assert.deepStrictEqual([o1.commune, o1.communeRaw, o1.wilaya], ['Bab Ezzouar', 'باب الزوار', '16 - Alger']);
  const o2 = await dbOrder('9602');
  assert.deepStrictEqual([o2.commune, o2.communeRaw], ['حي 500 مسكن', '']);
  assert.strictEqual((await api('api_getOrder', '9601')).order.communeRaw, 'باب الزوار');
  // Expédier : commune inconnue d'Ecotrack → pas d'envoi, la commune proche est proposée.
  await api('api_updateOrder', '9602', { status: 'Confirmée', commune: 'Hydre' });
  let ship = await api('api_shippingList');
  let it = ship.toShip.filter((x) => x.id === '9602')[0];
  assert.ok(it.problems.indexOf('Commune inconnue d’Ecotrack : « Hydre »') >= 0, JSON.stringify(it.problems));
  assert.deepStrictEqual([it.communeBad, it.communeFix], [true, 'Hydra']);
  const sent = await api('api_shipEcotrack', ['9602']);
  const r = (sent.results || sent).filter ? (sent.results || sent).filter((x) => x.id === '9602')[0] : null;
  assert.ok(r && !r.ok && /Commune inconnue/.test(r.message), JSON.stringify(sent));
  assert.strictEqual((await dbOrder('9602')).tracking, '');
  await api('api_updateOrder', '9602', { commune: 'Hydra' });
  // Commune écrite en arabe (commande d'avant) : le colis part avec le nom d'Ecotrack.
  await api('api_updateOrder', '9601', { status: 'Confirmée', commune: 'باب الزوار' });
  const both = await api('api_shipEcotrack', ['9601']);
  assert.ok((both.results || both)[0].ok, JSON.stringify(both));
  assert.strictEqual(__fakeEcotrack.orders.filter((x) => x.reference === '9601')[0].commune, 'Bab Ezzouar');
  ship = await api('api_shippingList');
  it = ship.toShip.filter((x) => x.id === '9602')[0];
  assert.ok(!it.communeBad && !it.problems.some((p) => /Commune/.test(p)), JSON.stringify(it));
});

test('v1.12 · Application installable ; notifications chiffrées (RFC 8291) et signées (VAPID) : nouvelle commande, choix, rappel à l’heure, essai, abonnement expiré', async () => {
  await fresh(true, true);
  // Application installable : manifeste, service worker, icônes.
  const man = await worker.fetch(new Request(HOST + '/manifest.webmanifest'), env);
  const m = await man.json();
  assert.deepStrictEqual([m.name, m.display, m.start_url, m.icons.length], ['Boutique test', 'standalone', '/?app=1#/confirmation', 3]);
  const sw = await (await worker.fetch(new Request(HOST + '/sw.js'), env)).text();
  assert.ok(/addEventListener\('push'/.test(sw) && /notificationclick/.test(sw) && /Pas de connexion internet/.test(sw));
  const ic = await worker.fetch(new Request(HOST + '/icons/icon-192.png'), env);
  assert.deepStrictEqual([ic.status, ic.headers.get('content-type')], [200, 'image/png']);
  assert.ok((await ic.arrayBuffer()).byteLength > 1000);
  const page = await (await worker.fetch(new Request(HOST + '/'), env)).text();
  assert.ok(/rel="manifest"/.test(page) && /apple-touch-icon/.test(page));

  // Un téléphone s'abonne (ses clés, comme celles que donne le navigateur).
  const wc = require('crypto').webcrypto;
  const b64u = (b) => Buffer.from(b).toString('base64url');
  const ua = await wc.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPub = new Uint8Array(await wc.subtle.exportKey('raw', ua.publicKey));
  const auth = wc.getRandomValues(new Uint8Array(16));
  const info = await api('api_pushInfo', '');
  assert.ok(info.publicKey && info.admin && !info.subscribed);
  const sub = { endpoint: 'https://push.example.test/sub/admin', keys: { p256dh: b64u(uaPub), auth: b64u(auth) } };
  const sr = await api('api_pushSubscribe', sub, { orders: true, callbacks: true, tracking: true, problems: true, quiet: false }, 'Android · Chrome');
  assert.ok(/activées/.test(sr.message));
  assert.strictEqual((await api('api_pushInfo', sub.endpoint)).subscribed, true);

  /** Ce que le téléphone lit : déchiffrement comme le navigateur. */
  async function open(body) {
    body = Buffer.from(body);
    const salt = body.subarray(0, 16);
    const idlen = body[20];
    const asPub = body.subarray(21, 21 + idlen);
    const ct = body.subarray(21 + idlen);
    const asKey = await wc.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await wc.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
    const hk = async (sl, ikm, inf, len) => new Uint8Array(await wc.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sl, info: inf },
      await wc.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), len * 8));
    const enc = new TextEncoder();
    const ikm = await hk(auth, shared, Buffer.concat([enc.encode('WebPush: info\u0000'), uaPub, asPub]), 32);
    const key = await wc.subtle.importKey('raw', await hk(salt, ikm, enc.encode('Content-Encoding: aes128gcm\u0000'), 16), 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await wc.subtle.decrypt({ name: 'AES-GCM', iv: await hk(salt, ikm, enc.encode('Content-Encoding: nonce\u0000'), 12) }, key, ct));
    assert.strictEqual(plain[plain.length - 1], 2, 'dernier bloc');
    return JSON.parse(new TextDecoder().decode(plain.subarray(0, plain.length - 1)));
  }
  async function vapidOk(hd) {
    const mm = String(hd.authorization).match(/^vapid t=([^,]+), k=(.+)$/);
    const [a, b, sg] = mm[1].split('.');
    const key = await wc.subtle.importKey('raw', Buffer.from(mm[2], 'base64url'), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await wc.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(sg, 'base64url'), new TextEncoder().encode(a + '.' + b));
    const claims = JSON.parse(Buffer.from(b, 'base64url').toString());
    return ok && claims.aud === 'https://push.example.test' && claims.exp > Date.now() / 1000 && mm[2] === info.publicKey && /^https:/.test(claims.sub);
  }
  const mine = () => pushBox.calls.filter((c) => c.url === sub.endpoint);

  // Nouvelle commande reçue par le relais : notification tout de suite.
  await bridge('/bridge/releasit', { install: true, version: APP_VERSION });
  const sh = releasitTab_();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const send = async (id, phone) => {
    releasitRow_(id, phone);
    const row = sh.getRange(sh.getLastRow(), 1, 1, head.length).getValues()[0];
    return bridge('/bridge/releasit', { header: head.map(cloudCellOut_), rows: [row.map(cloudCellOut_)], from: sh.getLastRow() });
  };
  const n0 = mine().length;
  assert.deepStrictEqual((await send('9601', '0550998877')).added, ['9601']);
  const c1 = mine()[n0];
  assert.ok(c1, 'notification envoyée');
  assert.deepStrictEqual([c1.headers['content-encoding'], c1.headers.urgency, c1.headers['content-type']], ['aes128gcm', 'high', 'application/octet-stream']);
  assert.ok(await vapidOk(c1.headers), 'signature VAPID valable');
  const msg = await open(c1.body);
  assert.strictEqual(msg.title, 'Nouvelle commande 9601');
  assert.ok(/Client Test/.test(msg.body) && /2 250 DA/.test(msg.body) && !/^\d+ - /.test(msg.body), msg.body);
  assert.deepStrictEqual([msg.url, msg.tag], ['/?o=9601#/confirmation', 'new-9601']);

  // Choix : plus de nouvelles commandes sur ce téléphone.
  await api('api_pushPrefs', sub.endpoint, { orders: false, callbacks: true, quiet: false });
  const n1 = mine().length;
  await send('9602', '0550998866');
  assert.strictEqual(mine().length, n1, 'nouvelles commandes coupées');

  // Rappel arrivé à son heure : notification (une seule fois).
  const o = (await env.DB.prepare("SELECT id FROM orders WHERE stage = 'todo' AND archived = 0 LIMIT 1").first()).id;
  await env.DB.prepare('UPDATE orders SET callback = ? WHERE id = ?').bind(new Date(Date.now() - 30000).toISOString(), o).run();
  await env.DB.prepare("DELETE FROM kv WHERE key = 'cf:pushCbAt'").run();
  await cron(env);
  await cron(env);
  const cbs = [];
  for (const c of mine().slice(n1)) cbs.push(await open(c.body));
  assert.deepStrictEqual(cbs.filter((x) => /^Rappel/.test(x.title)).map((x) => x.url), ['/?o=' + encodeURIComponent(o) + '#/confirmation']);

  // Essai ; puis abonnement expiré chez le service : effacé.
  assert.ok(/essai/.test((await api('api_pushTest', sub.endpoint)).message));
  assert.strictEqual((await open(mine()[mine().length - 1].body)).title, 'Essai : ça marche ✓');
  pushBox.gone[sub.endpoint] = true;
  await assert.rejects(api('api_pushTest', sub.endpoint), /pas partie/);
  assert.strictEqual((await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first()).n, 0);
  // Désactiver.
  delete pushBox.gone[sub.endpoint];
  await api('api_pushSubscribe', sub, null, 'Android · Chrome');
  await api('api_pushOff', sub.endpoint);
  assert.strictEqual((await api('api_pushInfo', sub.endpoint)).subscribed, false);
});

/** Onglet Équipe tel que gardé dans la base (étape 3). */
test('v1.20 · Partage des commandes : file et compteurs par confirmatrice, tâche de chaque minute, Expédier fermé, liste et loupe', async () => {
  await fresh(true, true);
  const as = async (email, fn, ...args) => { const r = await apiRaw(email, fn, args); if (!r.body.ok) throw new Error(fn + ' : ' + r.body.error); return r.body.data; };
  // À partager : commandes à appeler sans confirmatrice (vides, ou au nom d'une autre personne avant la v1.20).
  const pool = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE archived = 0 AND stage = 'todo' AND agent NOT IN ('Imane', 'Sonia') AND status IN ('À confirmer', 'Pas de réponse', 'Rappeler')").first()).n;
  const before = await pool();
  assert.ok(before > 0, 'commandes du jeu d’exemple à partager');
  await api('api_settingsSave', { PARTAGE_AVANCE: 5 }); // 5 d'avance chacune : il en reste pour la suivante
  const dueOf = async (name) => (await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE archived = 0 AND stage = 'todo' AND agent = ? AND status IN ('À confirmer', 'Pas de réponse', 'Rappeler') AND (callback = '' OR callback <= ?)").bind(name, new Date().toISOString()).first()).n;
  const had = await dueOf('Imane'); // ses appels du jeu d'exemple (pas de réponse…) lui restent
  // Imane ouvre sa file : elle est présente, ses commandes arrivent tout de suite (au plus 15 d'avance).
  const q = await as('imane@example.com', 'api_queue', {});
  assert.ok(q.due.length > 0 && q.due.every((x) => x.agent === 'Imane'), 'elle ne voit que ses commandes');
  assert.deepStrictEqual([q.share.on, q.share.confirm, q.share.me.present], [true, true, true]);
  const mine = await dueOf('Imane');
  assert.strictEqual(q.due.length, mine);
  assert.ok(mine > had, 'ses commandes arrivent : ' + had + ' → ' + mine);
  assert.strictEqual((await as('imane@example.com', 'api_counts')).queue, mine, 'compteur du menu : ses commandes');
  assert.ok((await env.DB.prepare("SELECT value FROM kv WHERE key = 'PRES_imane@example.com'").first()), 'présence notée');

  // Une nouvelle commande arrive (relais RELEASIT) pendant que Sonia est là : la tâche de chaque minute
  // et l'arrivée la donnent à une présente ; il ne reste rien « à partager » tant qu'il y a de la place.
  await as('sonia@example.com', 'api_counts');
  await api('api_settingsSave', { PARTAGE_AVANCE: 0 }); // sans limite
  const out = await cron(env);
  assert.ok(out.share && !out.share.error, JSON.stringify(out.share));
  assert.strictEqual(await pool(), 0, 'tout est partagé entre les présentes');
  assert.ok((await dueOf('Sonia')) > 0, 'Sonia a reçu sa part');

  // L'administrateur voit tout, avec l'équipe et « à partager ».
  const qa = await api('api_queue', {});
  assert.ok(qa.due.length >= q.due.length + 1);
  assert.deepStrictEqual(qa.share.team.map((m) => m.name + ':' + m.present), ['Imane:true', 'Sonia:true']);
  const list = await api('api_listOrders', { status: 'all', period: 'all', agent: 'Sonia', limit: 500 });
  assert.ok(list.rows.length && list.rows.every((o) => o.agent === 'Sonia'), 'filtre par confirmatrice');

  // Imane : liste limitée à ses commandes, la loupe cherche partout ; Expédier fermé par défaut.
  const li = await as('imane@example.com', 'api_listOrders', { status: 'all', period: 'all', limit: 500 });
  assert.ok(li.rows.every((o) => o.agent === 'Imane'));
  const all = await as('imane@example.com', 'api_listOrders', { status: 'all', period: 'all', limit: 500, scope: 'all' });
  assert.ok(all.total > li.total, 'la loupe trouve aussi les commandes des autres');
  const refused = await apiRaw('imane@example.com', 'api_shippingList', []);
  assert.ok(!refused.body.ok && /Page Expédier non ouverte/.test(refused.body.error), refused.body.error);
  // Ouvert par l'administrateur : ses commandes seulement.
  await api('api_teamAccess', 'imane@example.com', { ship: true });
  const ship = await as('imane@example.com', 'api_shippingList');
  const shipAll = await api('api_shippingList');
  assert.ok(ship.toShip.length < shipAll.toShip.length, 'Expédier : ses commandes seulement');
  assert.strictEqual((await as('imane@example.com', 'api_counts')).toShip, ship.toShip.length);
  const team = await api('api_teamList');
  assert.deepStrictEqual(team.members.filter((m) => m.name === 'Imane').map((m) => [m.ship, m.track, m.presence.present]), [[true, false, true]]);
});

async function teamTabCf() {
  const r = await env.DB.prepare("SELECT rows FROM tabs WHERE name = 'Équipe' ORDER BY part").all();
  return (r.results || []).reduce((a, x) => a.concat(JSON.parse(x.rows)), []);
}

/* ================================================================ */

let cron;
let smsQueueStatement;
const K_ORDER_KEYS = ORDER_COLUMNS.map((c) => c.key);
function releasitTab_() {
  const s = __mock.ss().getSheetByName('RELEASIT') || __mock.ss().insertSheet('RELEASIT');
  return s;
}
function releasitRow_(id, phone, more) {
  const sh = releasitTab_();
  const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  const col = releasitColumns_(head);
  const row = head.map(() => '');
  const set = (k, v) => { if (col[k] !== undefined) row[col[k]] = v; };
  set('id', id); set('client', 'Client Test'); set('phone', phone); set('wilaya', 'bejaia'); set('commune', 'Bejaia'); set('address', 'Rue test');
  set('product', 'cover iPhone  - iphone 13'); set('qty', '1'); set('line', '1800'); set('sub', '1800'); set('ship', '450'); set('total', '2250');
  set('date', new Date(Date.now() - 60000).toISOString());
  Object.keys(more || {}).forEach((k) => set(k, more[k]));
  sh.appendRow(row);
}

(async () => {
  const mod = await import(pathToFileURL(tmp).href);
  worker = mod.default;
  cron = mod.cron;
  smsQueueStatement = mod.smsQueueStatement;
  let failed = 0;
  for (const t of tests) {
    try {
      await t[1]();
      console.log('  ok  ' + t[0]);
    } catch (e) {
      failed++;
      console.log('  ÉCHEC  ' + t[0]);
      console.log(String(e && e.stack || e).split('\n').slice(0, 8).map((l) => '        ' + l).join('\n'));
    }
  }
  fs.unlinkSync(tmp);
  console.log('\n' + (tests.length - failed) + '/' + tests.length + ' tests Cloudflare réussis');
  process.exit(failed ? 1 : 0);
})();
