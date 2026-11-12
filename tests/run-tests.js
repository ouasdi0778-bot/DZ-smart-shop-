/**
 * Tests du code Apps Script, lancés avec Node (npm test).
 * Le code de apps-script/*.gs tourne contre une imitation du classeur.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'apps-script');

function load(file) { vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file }); }
load(path.join(__dirname, 'gas-mock.js'));
fs.readdirSync(SRC).filter(function (f) { return f.endsWith('.gs'); }).sort()
  .forEach(function (f) { load(path.join(SRC, f)); });
load(path.join(__dirname, 'seed.js'));

var tests = [];
function test(name, fn) { tests.push([name, fn]); }

/* ---------------- Outils de test ---------------- */

/** google.script.run refuse les Date : on vérifie qu'aucune ne s'échappe. */
function assertSerializable(value, where) {
  where = where || 'résultat';
  if (value instanceof Date) throw new Error('Date non autorisée dans ' + where);
  if (typeof value === 'function' || value === undefined) throw new Error('Valeur non autorisée dans ' + where);
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(function (k) { assertSerializable(value[k], where + '.' + k); });
  }
}

function sheet(name) { return __mock.ss().getSheetByName(name); }
function headerOf(name) { var s = sheet(name); return s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; }
function setRate(wilaya, values) {
  var s = sheet('Tarifs');
  var rows = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === wilaya) { s.getRange(i + 2, 2, 1, 4).setValues([values]); return; }
  }
  throw new Error('Wilaya absente : ' + wilaya);
}
/** Ajoute une ligne brute dans Commandes, comme le ferait Shopify. */
function addRaw(fields) {
  var s = sheet('Commandes');
  var header = headerOf('Commandes');
  var row = header.map(function () { return ''; });
  Object.keys(fields).forEach(function (title) {
    var i = header.indexOf(title);
    if (i < 0) throw new Error('Colonne absente : ' + title);
    row[i] = fields[title];
  });
  s.appendRow(row);
}
function order(id) { return api_getOrder(id).order; }
function baseSetup() {
  setup();
  setRate('16 - Alger', [600, 400, 700, 350]);
  setRate('31 - Oran', [650, 450, 700, 400]);
}

/* ---------------- Téléphones et utilitaires ---------------- */

test('normalizePhone : formats algériens', function () {
  assert.deepStrictEqual(normalizePhone('0550 12 34 56'), { phone: '0550123456', valid: true });
  assert.strictEqual(normalizePhone('+213 661 45 78 90').phone, '0661457890');
  assert.strictEqual(normalizePhone('00213779102030').phone, '0779102030');
  assert.strictEqual(normalizePhone(770981122).phone, '0770981122');
  assert.strictEqual(normalizePhone('021 23 45 67').phone, '021234567');
  assert.strictEqual(normalizePhone('12345').valid, false);
  assert.strictEqual(normalizePhone('0812345678').valid, false);
  assert.strictEqual(intlPhone_('0550123456'), '213550123456');
});

test('toNumber_ et toDate_', function () {
  assert.strictEqual(toNumber_('4 900 DA'), 4900);
  assert.strictEqual(toNumber_('4900,50'), 4900.5);
  assert.strictEqual(toNumber_(''), 0);
  var d = toDate_('12/11/2026 10:42');
  assert.strictEqual(d.getDate(), 12);
  assert.strictEqual(d.getMonth(), 10);
  assert.strictEqual(d.getHours(), 10);
  assert.strictEqual(toDate_('pas une date'), null);
});

test('wilayas : code, nom, accents', function () {
  assert.strictEqual(wilayaCode_('16 - Alger'), 16);
  assert.strictEqual(wilayaCode_('alger'), 16);
  assert.strictEqual(wilayaCode_('Ghardaia'), 47);
  assert.strictEqual(wilayaCode_('09'), 9);
  assert.strictEqual(matchWilaya_('bejaia'), '06 - Béjaïa');
  assert.strictEqual(matchWilaya_("m'sila"), "28 - M'Sila");
  assert.strictEqual(matchWilaya_('Paris'), null);
});

/* ---------------- Installation ---------------- */

test('setup : crée les onglets, en-têtes, réglages et le déclencheur', function () {
  setup();
  ['Commandes', 'Clients', 'Produits', 'Tarifs', 'Équipe', 'Paramètres', 'Journal'].forEach(function (n) {
    assert.ok(sheet(n), 'onglet manquant : ' + n);
  });
  assert.strictEqual(sheet('Feuille 1'), null, 'la feuille vide par défaut doit être supprimée');
  var header = headerOf('Commandes');
  assert.deepStrictEqual(header, ORDER_COLUMNS.map(function (c) { return c.title; }));
  assert.strictEqual(sheet('Tarifs').getLastRow(), 59);
  assert.strictEqual(sheet('Paramètres').getLastRow(), DEFAULT_SETTINGS.length + 1);
  assert.strictEqual(__mock.state.triggers.length, 1);
  assert.strictEqual(__mock.state.triggers[0].minutes, 5);
  var statusCol = header.indexOf('Statut') + 1;
  assert.ok(sheet('Commandes')._validations.some(function (v) { return v.col === statusCol; }));
  assert.strictEqual(sheet('Commandes')._cf.length, STATUS_LIST.length + 7);
});

test('setup : relancé deux fois, ne duplique rien', function () {
  setup();
  sheet('Paramètres').getRange(3, 2).setValue(5); // MAX_TENTATIVES modifié par l'utilisateur
  setup();
  assert.deepStrictEqual(headerOf('Commandes'), ORDER_COLUMNS.map(function (c) { return c.title; }));
  assert.strictEqual(sheet('Paramètres').getLastRow(), DEFAULT_SETTINGS.length + 1);
  assert.strictEqual(sheet('Paramètres').getRange(3, 2).getValue(), 5);
  assert.strictEqual(sheet('Tarifs').getLastRow(), 59);
  assert.strictEqual(sheet('Équipe').getLastRow(), 2);
  assert.strictEqual(__mock.state.triggers.length, 1);
  assert.strictEqual(sheet('Commandes')._cf.length, STATUS_LIST.length + 7);
});

test('setup : garde les colonnes d’une application Shopify et ajoute les manquantes', function () {
  var s = __mock.ss().insertSheet('Commandes');
  s.getRange(1, 1, 1, 6).setValues([['Order ID', 'Nom complet', 'Phone', 'Province', 'City', 'Price']]);
  setup();
  var header = headerOf('Commandes');
  assert.deepStrictEqual(header.slice(0, 6), ['Order ID', 'Nom complet', 'Phone', 'Province', 'City', 'Price']);
  assert.ok(header.indexOf('Statut') > 5);
  assert.strictEqual(header.indexOf('Téléphone'), -1, 'pas de 2e colonne téléphone');
  setRate('16 - Alger', [600, 400, 700, 350]);
  s.appendRow(['#9001', 'Ali Test', '550112233', 'Alger', 'Kouba', 3000]);
  assert.strictEqual(processNewRows(), 1);
  var o = order('#9001');
  assert.strictEqual(o.phone, '0550112233');
  assert.strictEqual(o.wilaya, '16 - Alger');
  assert.strictEqual(o.total, 3600);
});

/* ---------------- Nouvelles commandes ---------------- */

test('processNewRows : prépare les lignes venues de Shopify', function () {
  baseSetup();
  addRaw({ 'N°': '#1001', 'Date': '12/11/2026 10:42', 'Client': 'Yacine B', 'Téléphone': 550123456, 'Wilaya': 'alger', 'Commune': 'Kouba', 'Produit': 'Montre', 'Quantité': 1, 'Prix': 4300 });
  addRaw({ 'Client': 'Sans numéro', 'Téléphone': '+213 661 45 78 90', 'Wilaya': 'Oran', 'Produit': 'Sac', 'Prix': '3 700 DA', 'Livraison': 'Bureau / stop desk' });
  assert.strictEqual(processNewRows(), 2);
  assert.strictEqual(processNewRows(), 0, 'déjà traitées');

  var a = order('#1001');
  assert.strictEqual(a.status, 'À confirmer');
  assert.strictEqual(a.phone, '0550123456');
  assert.strictEqual(a.wilaya, '16 - Alger');
  assert.strictEqual(a.mode, 'Domicile');
  assert.strictEqual(a.shipping, 600);
  assert.strictEqual(a.total, 4900);
  assert.strictEqual(a.alert, 'Nouveau client');
  assert.strictEqual(a.attempts, 0);
  assert.strictEqual(new Date(a.date).getDate(), 12);

  var b = order('M0001');
  assert.strictEqual(b.mode, 'Stop desk');
  assert.strictEqual(b.shipping, 450);
  assert.strictEqual(b.total, 4150);
  assert.strictEqual(b.qty, 1);
  assert.ok(sheet('Journal').getLastRow() >= 3);
});

test('processNewRows : garde frais et total déjà remplis, et wilaya sans tarif', function () {
  baseSetup();
  addRaw({ 'N°': '#2001', 'Client': 'A', 'Téléphone': '0550000001', 'Wilaya': 'Alger', 'Prix': 1000, 'Frais livraison': 300, 'Total': 1300 });
  addRaw({ 'N°': '#2002', 'Client': 'B', 'Téléphone': '0550000002', 'Wilaya': 'Djelfa', 'Prix': 1000 });
  processNewRows();
  assert.strictEqual(order('#2001').shipping, 300);
  assert.strictEqual(order('#2001').total, 1300);
  assert.strictEqual(order('#2002').shipping, null, 'pas de tarif pour Djelfa');
  assert.strictEqual(order('#2002').total, 1000);
});

test('alertes : doublon, liste noire, numéro invalide, historique', function () {
  baseSetup();
  addRaw({ 'N°': '#3001', 'Client': 'C', 'Téléphone': '0661000001', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#3002', 'Client': 'C', 'Téléphone': '+213661000001', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#3003', 'Client': 'D', 'Téléphone': '123', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  assert.strictEqual(order('#3001').alert, 'Doublon');
  assert.strictEqual(order('#3002').alert, 'Doublon');
  assert.strictEqual(order('#3003').alert, 'Numéro invalide');
  assert.strictEqual(order('#3003').alertLevel, 'bad');

  // Client avec historique : 2 livrées, 1 retour, il y a longtemps.
  var old = new Date(Date.now() - 30 * 86400000);
  ['#3101', '#3102', '#3103'].forEach(function (id) {
    addRaw({ 'N°': id, 'Date': old, 'Client': 'E', 'Téléphone': '0770000009', 'Wilaya': 'Alger', 'Prix': 1000 });
  });
  processNewRows();
  api_updateOrder('#3101', { status: 'Livrée' });
  api_updateOrder('#3102', { status: 'Livrée' });
  api_updateOrder('#3103', { status: 'Retour' });
  addRaw({ 'N°': '#3104', 'Client': 'E', 'Téléphone': '0770000009', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  assert.strictEqual(order('#3104').alert, 'Fiable · 2/3 livrées');
  assert.strictEqual(order('#3104').alertLevel, 'ok');

  api_setBlacklist('0770 00 00 09', true, 'test');
  assert.strictEqual(order('#3104').alert, 'Liste noire', 'alerte mise à jour tout de suite');
  assert.strictEqual(api_getOrder('#3104').blacklisted, true);
  api_setBlacklist('0770000009', false);
  assert.strictEqual(sheet('Clients').getLastRow(), 2, 'pas de ligne en double dans Clients');
  assert.strictEqual(order('#3104').alert, 'Fiable · 2/3 livrées');
});

/* ---------------- Centre de confirmation ---------------- */

test('file d’appels : ordre, rappels, confirmation avec modifications', function () {
  baseSetup();
  var now = Date.now();
  addRaw({ 'N°': '#4001', 'Date': new Date(now - 3 * 3600000), 'Client': 'Ancienne', 'Téléphone': '0550000011', 'Wilaya': 'Alger', 'Prix': 2000, 'Quantité': 1 });
  addRaw({ 'N°': '#4002', 'Date': new Date(now - 1 * 3600000), 'Client': 'Récente', 'Téléphone': '0550000012', 'Wilaya': 'Alger', 'Prix': 2000 });
  addRaw({ 'N°': '#4003', 'Date': new Date(now - 2 * 3600000), 'Client': 'Rappel', 'Téléphone': '0550000013', 'Wilaya': 'Alger', 'Prix': 2000 });
  processNewRows();

  __mock.setUser('imane@example.com');
  sheet('Équipe').appendRow(['imane@example.com', 'Imane', 'Confirmatrice']);
  api_recordCall('#4003', 'callback', { callback: new Date(now + 3600000).toISOString() });

  var q = api_queue();
  assertSerializable(q, 'api_queue');
  assert.deepStrictEqual(q.due.map(function (x) { return x.id; }), ['#4001', '#4002']);
  assert.deepStrictEqual(q.later.map(function (x) { return x.id; }), ['#4003']);

  var o = api_recordCall('#4001', 'confirm', { fields: { wilaya: 'Oran', mode: 'Stop desk', qty: '2', commune: 'Es Senia', phone: '0550 00 00 11' } });
  assertSerializable(o, 'api_recordCall');
  assert.strictEqual(o.status, 'Confirmée');
  assert.strictEqual(o.agent, 'Imane');
  assert.strictEqual(o.attempts, 1);
  assert.strictEqual(o.wilaya, '31 - Oran');
  assert.strictEqual(o.qty, 2);
  assert.strictEqual(o.price, 4000);
  assert.strictEqual(o.shipping, 450);
  assert.strictEqual(o.total, 4450);
  assert.strictEqual(o.commune, 'Es Senia');
  assert.strictEqual(o.phone, '0550000011');

  assert.throws(function () { api_recordCall('#4001', 'cancel', {}); }, /déjà été traitée/);
  assert.throws(function () { api_recordCall('#4002', 'callback', { callback: new Date(now - 1000).toISOString() }); }, /futur/);
  assert.throws(function () { api_recordCall('#4002', 'n_importe_quoi', {}); }, /inconnu/);

  var stats = api_queue().stats;
  assert.strictEqual(stats.confirmedToday, 1);
  assert.strictEqual(stats.due, 1);
});

test('pas de réponse : rappel automatique puis « Injoignable »', function () {
  baseSetup();
  addRaw({ 'N°': '#5001', 'Client': 'Silence', 'Téléphone': '0550000021', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  var o1 = api_recordCall('#5001', 'no_answer', {});
  assert.strictEqual(o1.status, 'Pas de réponse');
  assert.strictEqual(o1.attempts, 1);
  var delay = (new Date(o1.callback).getTime() - Date.now()) / 60000;
  assert.ok(delay > 115 && delay <= 120, 'rappel dans 2 h');
  assert.strictEqual(api_queue().later.length, 1);
  api_recordCall('#5001', 'no_answer', {});
  var o3 = api_recordCall('#5001', 'no_answer', {});
  assert.strictEqual(o3.status, 'Injoignable');
  assert.strictEqual(o3.callback, '');
  assert.strictEqual(api_queue().due.length + api_queue().later.length, 0);
});

test('annulation avec motif', function () {
  baseSetup();
  addRaw({ 'N°': '#6001', 'Client': 'Non', 'Téléphone': '0550000031', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  var o = api_recordCall('#6001', 'cancel', { reason: 'Trop cher' });
  assert.strictEqual(o.status, 'Annulée');
  assert.strictEqual(o.cancelReason, 'Trop cher');
});

/* ---------------- Création, modification, liste ---------------- */

test('api_createOrder : validation et ajout', function () {
  baseSetup();
  assert.throws(function () { api_createOrder({ client: '', phone: '0550000000', wilaya: 'Alger' }); }, /nom du client/);
  assert.throws(function () { api_createOrder({ client: 'X', phone: '12', wilaya: 'Alger' }); }, /invalide/);
  var o = api_createOrder({ client: 'Manuel', phone: '0661 22 33 44', wilaya: '16 - Alger', commune: 'Hydra', product: 'Sac', qty: '2', price: '7400', mode: 'Domicile' });
  assertSerializable(o, 'api_createOrder');
  assert.strictEqual(o.id, 'M0001');
  assert.strictEqual(o.status, 'À confirmer');
  assert.strictEqual(o.source, 'Manuel');
  assert.strictEqual(o.total, 8000);
  assert.strictEqual(o.phone, '0661223344');
  var o2 = api_createOrder({ client: 'Deux', phone: '0661223345', wilaya: 'Alger', price: 1000, shipping: 0 });
  assert.strictEqual(o2.id, 'M0002');
  assert.strictEqual(o2.shipping, 0, 'livraison offerte respectée');
  assert.strictEqual(o2.total, 1000);
});

test('api_updateOrder : statut, société, suivi, téléphone', function () {
  baseSetup();
  addRaw({ 'N°': '#7001', 'Client': 'Modif', 'Téléphone': '0550000041', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  var o = api_updateOrder('#7001', { status: 'Expédiée', carrier: 'Ecotrack', tracking: 'ECO-1' });
  assert.strictEqual(o.status, 'Expédiée');
  assert.strictEqual(o.carrier, 'Ecotrack');
  assert.strictEqual(o.shipping, 700, 'tarif Ecotrack domicile');
  assert.strictEqual(o.total, 1700);
  assert.strictEqual(o.tracking, 'ECO-1');
  assert.throws(function () { api_updateOrder('#7001', { status: 'Volée' }); }, /inconnu/);
  assert.throws(function () { api_updateOrder('#nope', {}); }, /introuvable/);
  var o2 = api_updateOrder('#7001', { phone: '12' });
  assert.strictEqual(o2.alert, 'Numéro invalide');
  var o3 = api_updateOrder('#7001', { status: 'Annulée', cancelReason: 'Doublon' });
  assert.strictEqual(o3.cancelReason, 'Doublon');
  var journal = sheet('Journal').getRange(2, 4, sheet('Journal').getLastRow() - 1, 2).getValues();
  assert.ok(journal.some(function (r) { return /Expédiée/.test(r[1]); }));
});

test('api_listOrders : filtres, compteurs, recherche, tri', function () {
  baseSetup();
  var now = Date.now();
  addRaw({ 'N°': '#8001', 'Date': new Date(now - 40 * 86400000), 'Client': 'Vieille', 'Téléphone': '0550000051', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#8002', 'Date': new Date(now - 2 * 86400000), 'Client': 'Karim Oran', 'Téléphone': '0550000052', 'Wilaya': 'Oran', 'Prix': 1000 });
  addRaw({ 'N°': '#8003', 'Date': new Date(now - 3600000), 'Client': 'Amina', 'Téléphone': '0661999888', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  api_recordCall('#8002', 'confirm', {});

  var all30 = api_listOrders({ period: '30' });
  assertSerializable(all30, 'api_listOrders');
  assert.deepStrictEqual(all30.rows.map(function (r) { return r.id; }), ['#8003', '#8002'], 'récentes d’abord, sans la vieille');
  assert.strictEqual(all30.counts.all, 2);
  assert.strictEqual(all30.counts['Confirmée'], 1);
  assert.strictEqual(all30.counts.queue, 1);
  assert.strictEqual(api_listOrders({ period: 'all' }).total, 3);
  assert.strictEqual(api_listOrders({ period: 'all', status: 'Confirmée' }).rows[0].id, '#8002');
  assert.strictEqual(api_listOrders({ period: 'all', q: '999 888' }).rows[0].id, '#8003', 'recherche par téléphone');
  assert.strictEqual(api_listOrders({ period: 'all', q: 'karim' }).rows[0].id, '#8002');
  assert.strictEqual(api_listOrders({ period: 'all', wilaya: '31 - Oran' }).total, 1);
  assert.strictEqual(api_listOrders({ period: 'all', limit: 1 }).rows.length, 1);
});

test('api_dashboard : chiffres cohérents', function () {
  baseSetup();
  ['#9001', '#9002', '#9003', '#9004', '#9005'].forEach(function (id, i) {
    addRaw({ 'N°': id, 'Client': 'K' + i, 'Téléphone': '055000006' + i, 'Wilaya': i < 3 ? 'Alger' : 'Oran', 'Produit': 'Sac', 'Prix': 1000 });
  });
  processNewRows();
  api_recordCall('#9001', 'confirm', {});
  api_recordCall('#9002', 'confirm', {});
  api_recordCall('#9003', 'confirm', {});
  api_recordCall('#9004', 'cancel', { reason: 'Trop cher' });
  api_updateOrder('#9001', { status: 'Livrée' });
  api_updateOrder('#9002', { status: 'Retour' });
  api_updateOrder('#9003', { status: 'En livraison' });

  var d = api_dashboard('7');
  assertSerializable(d, 'api_dashboard');
  assert.strictEqual(d.received, 5);
  assert.strictEqual(d.waiting, 1);
  assert.strictEqual(d.decided, 4);
  assert.strictEqual(d.confirmed, 3);
  assert.strictEqual(d.shipped, 3);
  assert.strictEqual(d.delivered, 1);
  assert.strictEqual(d.returned, 1);
  assert.strictEqual(d.cancelled, 1);
  assert.strictEqual(d.revenueDelivered, 1600);
  assert.strictEqual(d.inTransitCount, 1);
  assert.strictEqual(d.todo.toConfirm, 1);
  assert.strictEqual(d.byWilaya[0].name, '16 - Alger');
  assert.strictEqual(d.byWilaya[0].delivered, 1);
  assert.strictEqual(d.byProduct[0].orders, 5);
});

test('api_bootstrap : données de démarrage sans Date', function () {
  baseSetup();
  var b = api_bootstrap();
  assertSerializable(b, 'api_bootstrap');
  assert.strictEqual(b.wilayas.length, 58);
  assert.strictEqual(b.rates['16'].Yalidine.Domicile, 600);
  assert.strictEqual(b.rates['16'].Ecotrack['Stop desk'], 350);
  assert.strictEqual(b.user.name, 'Admin');
  assert.ok(b.cancelReasons.indexOf('Trop cher') >= 0);
});

test('données d’exemple : le jeu de démonstration se charge sans erreur', function () {
  seedDemo_();
  var d = api_dashboard('30');
  assert.ok(d.received >= 30);
  assert.ok(d.delivered > 0 && d.returned > 0 && d.cancelled > 0);
  var q = api_queue();
  assert.ok(q.due.length > 0);
  assertSerializable(api_getOrder(q.due[0].id), 'api_getOrder');
});

test('menu et application web : pas d’erreur', function () {
  setup();
  onOpen();
  menuOpenApp();
  menuProcess();
  menuRecalc();
  assert.ok(doGet());
  assert.strictEqual(typeof include('Styles'), 'string');
});

test('fichier unique dist/Code.gs : à jour et fonctionnel', function () {
  var bundle = require('./build-bundle.js');
  var expected = bundle.build();
  var current = fs.existsSync(bundle.OUT) ? fs.readFileSync(bundle.OUT, 'utf8') : '';
  assert.ok(current === expected, 'dist/Code.gs n’est pas à jour : lancez « npm run bundle »');

  // Le fichier unique doit tourner seul, dans un environnement neuf.
  var sandbox = { console: console, Proxy: Proxy };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'gas-mock.js'), 'utf8'), sandbox);
  vm.runInContext(expected, sandbox, { filename: 'dist/Code.gs' });
  vm.runInContext([
    'setup();',
    "SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes').appendRow(['#1', '', 'Test', '0550123456', 'Alger']);",
    'var n = processNewRows();',
    'var page = doGet().getContent();',
    "var styles = include('Styles');"
  ].join('\n'), sandbox);
  assert.strictEqual(sandbox.n, 1);
  assert.ok(/<\?!= include\('Styles'\)/.test(sandbox.page), 'page Index intégrée');
  assert.ok(/--brand/.test(sandbox.styles), 'styles intégrés');
  assert.strictEqual(sandbox.__mock.ss().timeZone, 'Africa/Algiers');
});

/* ---------------- Lancement ---------------- */

var failed = 0;
tests.forEach(function (t) {
  __mock.reset();
  try {
    t[1]();
    console.log('  ok  ' + t[0]);
  } catch (e) {
    failed++;
    console.log('  ÉCHEC  ' + t[0]);
    console.log(String(e && e.stack || e).split('\n').map(function (l) { return '        ' + l; }).join('\n'));
  }
});
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' tests réussis');
if (failed) process.exitCode = 1;
