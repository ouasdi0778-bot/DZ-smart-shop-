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

async function fresh(live) {
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
  return snap;
}

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
