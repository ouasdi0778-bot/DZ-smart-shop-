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
  const again = await cron(env);
  assert.ok(!again.ecotrack, 'pas avant l’intervalle réglé (60 min)');
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

/* ================================================================ */

let cron;
let smsQueueStatement;
const K_ORDER_KEYS = ORDER_COLUMNS.map((c) => c.key);
function releasitTab_() {
  const s = __mock.ss().getSheetByName('RELEASIT') || __mock.ss().insertSheet('RELEASIT');
  return s;
}
function releasitRow_(id, phone) {
  const sh = releasitTab_();
  const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  const col = releasitColumns_(head);
  const row = head.map(() => '');
  const set = (k, v) => { if (col[k] !== undefined) row[col[k]] = v; };
  set('id', id); set('client', 'Client Test'); set('phone', phone); set('wilaya', 'bejaia'); set('commune', 'Bejaia'); set('address', 'Rue test');
  set('product', 'cover iPhone  - iphone 13'); set('qty', '1'); set('line', '1800'); set('sub', '1800'); set('ship', '450'); set('total', '2250');
  set('date', new Date(Date.now() - 60000).toISOString());
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
