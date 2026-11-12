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
load(path.join(__dirname, 'fake-ecotrack.js'));
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
  assert.deepStrictEqual(__mock.state.triggers.map(function (t) { return t.fn + '/' + t.minutes; }),
    ['processNewRows/5', 'syncEcotrackStatuses/30']);
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
  assert.strictEqual(__mock.state.triggers.length, 2);
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

/* ---------------- Ecotrack ---------------- */

var FAKE = globalThis.__fakeEcotrack;
var phoneSeq = 0;

function ecoSetup() {
  setup();
  saveEcotrackConfig_(FAKE.host, FAKE.token);
}
/** Ajoute une commande déjà confirmée, prête à partir (comme après un appel). */
function addConfirmed(id, extra) {
  phoneSeq++;
  var fields = {
    'N°': id, 'Date': new Date(), 'Client': 'Client ' + id, 'Téléphone': '0550' + ('000000' + phoneSeq).slice(-6),
    'Wilaya': '16 - Alger', 'Commune': 'Kouba', 'Adresse': 'Rue des Oliviers 12', 'Produit': 'Sac à main', 'Quantité': 1,
    'Prix': 3000, 'Livraison': 'Domicile', 'Frais livraison': 450, 'Total': 3450, 'Statut': 'Confirmée', 'Source': 'Test'
  };
  Object.keys(extra || {}).forEach(function (k) { fields[k] = extra[k]; });
  addRaw(fields);
}
function ship(ids) { return shipToEcotrack_(ids, { name: 'Imane' }); }
function results(res) { var m = {}; res.forEach(function (r) { m[r.id] = r; }); return m; }

test('Ecotrack : enregistrement de l’adresse et du jeton', function () {
  assert.strictEqual(normalizeEcotrackUrl_('http://Demo.ecotrack.dz/api/v1/'), 'https://Demo.ecotrack.dz');
  assert.strictEqual(normalizeEcotrackUrl_('demo.ecotrack.dz'), 'https://demo.ecotrack.dz');
  assert.strictEqual(normalizeEcotrackUrl_('pas une adresse !'), '');
  assert.strictEqual(ecotrackConfig_().configured, false);
  assert.throws(function () { saveEcotrackConfig_('???', 'x'.repeat(20)); }, /Adresse invalide/);
  assert.throws(function () { saveEcotrackConfig_('demo.ecotrack.dz', 'court'); }, /Jeton trop court/);
  saveEcotrackConfig_(' http://demo.ecotrack.dz/ ', 'Bearer  ' + FAKE.token + ' \n');
  var cfg = ecotrackConfig_();
  assert.strictEqual(cfg.url, 'https://demo.ecotrack.dz');
  assert.strictEqual(cfg.token, FAKE.token);
  // Le jeton ne doit jamais apparaître dans le classeur.
  setup();
  api_ecotrackSyncFees();
  __mock.ss().getSheets().forEach(function (s) {
    s.data.forEach(function (row) { row.forEach(function (v) { assert.ok(String(v).indexOf(FAKE.token) < 0, 'jeton dans ' + s.name); }); });
  });
});

test('Ecotrack : test de connexion et messages d’erreur clairs', function () {
  setup();
  assert.throws(function () { api_ecotrackTest(); }, /pas configuré/);
  saveEcotrackConfig_(FAKE.host, FAKE.token);
  var ok = api_ecotrackTest();
  assert.ok(/45 wilayas/.test(ok.message), ok.message);
  assert.strictEqual(FAKE.lastCall('/api/v1/get/wilayas').headers.Authorization, 'Bearer ' + FAKE.token);
  assert.strictEqual(FAKE.lastCall('/api/v1/get/wilayas').options.followRedirects, false);

  saveEcotrackConfig_(FAKE.host, 'AUTRE-JETON-1234567890');
  assert.throws(function () { api_ecotrackTest(); }, /refusé le jeton \(erreur 401\)/);
  saveEcotrackConfig_('autre.ecotrack.dz', FAKE.token);
  assert.throws(function () { api_ecotrackTest(); }, /Impossible de joindre Ecotrack/);
  saveEcotrackConfig_(FAKE.host, FAKE.token);
  FAKE.queue.push({ code: 503, body: '<html>maintenance</html>' });
  assert.throws(function () { api_ecotrackTest(); }, /indisponible \(erreur 503\)/);
  FAKE.queue.push({ code: 200, body: '<html>page de connexion</html>' });
  assert.throws(function () { api_ecotrackTest(); }, /Réponse inattendue/);
});

test('Ecotrack : tarifs récupérés dans l’onglet Tarifs', function () {
  ecoSetup();
  setRate('16 - Alger', [111, 222, 0, 0]); // prix Yalidine saisis à la main
  var res = api_ecotrackSyncFees();
  assert.ok(/stop desk disponible/i.test(res.message));
  var rows = sheet('Tarifs').getRange(1, 1, 59, 5).getValues();
  var byName = {};
  rows.forEach(function (r) { byName[r[0]] = r; });
  assert.deepStrictEqual(byName['16 - Alger'].slice(1), [111, 222, 450, 300], 'Yalidine intact, Ecotrack rempli');
  assert.deepStrictEqual(byName['31 - Oran'].slice(3), [800, 450]);
  assert.strictEqual(byName['14 - Tiaret'][3], 850);
  assert.strictEqual(byName['14 - Tiaret'][4], '', 'stop desk à 0 chez Ecotrack = case vide');
  assert.strictEqual(byName['12 - Tébessa'][3], '', 'wilaya non desservie = vide');
  assert.strictEqual(res.stats.inactive, 13);
  assert.ok(res.stats.withoutStopDesk >= 2);
  // Les frais sont ensuite calculés avec ces prix.
  addRaw({ 'N°': '#F1', 'Client': 'F', 'Téléphone': '0550000099', 'Wilaya': 'Alger', 'Prix': 1000, 'Société': 'Ecotrack', 'Livraison': 'Stop desk' });
  processNewRows();
  assert.strictEqual(order('#F1').shipping, 300);
  assert.strictEqual(order('#F1').total, 1300);
});

test('Ecotrack : vérifications avant envoi', function () {
  ecoSetup();
  var cat = ecotrackCatalog_(true);
  var base = { id: '#P', status: 'Confirmée', tracking: '', carrier: '', client: 'A B', phone: '0550123456', address: 'Rue 1', commune: 'Kouba', wilaya: '16 - Alger', mode: 'Domicile', total: 3000 };
  var with_ = function (x) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; }); Object.keys(x).forEach(function (k) { o[k] = x[k]; }); return ecotrackProblems_(o, cat); };
  assert.deepStrictEqual(with_({}), []);
  assert.ok(/Téléphone invalide/.test(with_({ phone: '123' })));
  assert.ok(/Adresse manquante/.test(with_({ address: ' ' })));
  assert.ok(/Commune manquante/.test(with_({ commune: '' })));
  assert.ok(/non desservie/.test(with_({ wilaya: '12 - Tébessa' })));
  assert.ok(/Stop desk indisponible/.test(with_({ wilaya: '14 - Tiaret', mode: 'Stop desk' })));
  assert.deepStrictEqual(with_({ wilaya: '16 - Alger', mode: 'Stop desk' }), []);
  assert.ok(/Wilaya manquante/.test(with_({ wilaya: '' })));
  assert.ok(/Montant/.test(with_({ total: 0 })));
  assert.ok(/seules les commandes confirmées/.test(with_({ status: 'À confirmer' })));
  assert.ok(/Déjà envoyée/.test(with_({ tracking: 'ECT1' })));
  assert.ok(/Société choisie : Yalidine/.test(with_({ carrier: 'Yalidine' })));
  assert.deepStrictEqual(with_({ carrier: 'Ecotrack' }), []);
});

test('Ecotrack : envoi réussi, n° de suivi et statut écrits dans le classeur', function () {
  ecoSetup();
  addConfirmed('#E1', { 'Quantité': 2, 'Total': 6450, 'Notes': 'Sonner 2 fois' });
  addConfirmed('#E2', { 'Livraison': 'Stop desk', 'Wilaya': '31 - Oran', 'Commune': 'Bir El Djir', 'Total': 3400 });
  var out = results(ship(['#E1', '#E2']));
  assert.ok(out['#E1'].ok && /^ECT\d{8}$/.test(out['#E1'].tracking));
  assert.ok(out['#E2'].ok);

  var call = FAKE.lastCall('/api/v1/create/orders');
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 1, 'un seul appel pour les 2 commandes');
  assert.strictEqual(call.headers.Authorization, 'Bearer ' + FAKE.token);
  var p1 = call.body.orders['0'];
  assert.deepStrictEqual(p1, {
    reference: '#E1', nom_client: 'Client #E1', telephone: p1.telephone, adresse: 'Rue des Oliviers 12', commune: 'Kouba',
    code_wilaya: 16, montant: 6450, remarque: 'Sonner 2 fois', produit: 'Sac à main x2', stock: 0, type: 1, stop_desk: 0
  });
  assert.ok(/^05\d{8}$/.test(p1.telephone));
  var p2 = call.body.orders['1'];
  assert.strictEqual(p2.stop_desk, 1);
  assert.strictEqual(p2.code_wilaya, 31);
  assert.strictEqual(p2.montant, 3400);

  var o1 = order('#E1');
  assert.strictEqual(o1.status, 'Expédiée');
  assert.strictEqual(o1.carrier, 'Ecotrack');
  assert.strictEqual(o1.tracking, out['#E1'].tracking);
  assert.strictEqual(o1.total, 6450, 'le total annoncé au client ne change pas');
  var journal = sheet('Journal').getRange(2, 3, sheet('Journal').getLastRow() - 1, 3).getValues();
  assert.ok(journal.some(function (r) { return r[0] === '#E1' && r[1] === 'Envoyée à Ecotrack' && r[2].indexOf(o1.tracking) >= 0; }));
  assert.ok(!__mock.state.cache['ship:#E1'], 'réservation libérée');

  // Une 2e tentative ne doit rien renvoyer.
  var again = results(ship(['#E1']));
  assert.ok(!again['#E1'].ok && /seules les commandes confirmées|Déjà envoyée/.test(again['#E1'].message));
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 1);
  assert.strictEqual(FAKE.orders.length, 2);
});

test('Ecotrack : refus par commande (commune mal écrite) sans bloquer les autres', function () {
  ecoSetup();
  addConfirmed('#R1');
  addConfirmed('#R2', { 'Commune': 'xx Mauvaise commune' });
  addConfirmed('#R3', { 'Téléphone': '123' });
  addConfirmed('#R4', { 'Statut': 'À confirmer' });
  var out = results(ship(['#R1', '#R2', '#R3', '#R4', '#nope']));
  assert.ok(out['#R1'].ok);
  assert.ok(!out['#R2'].ok && /Commune : Commune mal écrite/.test(out['#R2'].message), out['#R2'].message);
  assert.ok(/Téléphone invalide/.test(out['#R3'].message));
  assert.ok(/seules les commandes confirmées/.test(out['#R4'].message));
  assert.ok(/introuvable/.test(out['#nope'].message));
  assert.strictEqual(order('#R1').status, 'Expédiée');
  assert.strictEqual(order('#R2').status, 'Confirmée');
  assert.strictEqual(order('#R2').tracking, '');
  assert.strictEqual(FAKE.orders.length, 1);
  assert.strictEqual(FAKE.lastCall('/api/v1/create/orders').body.orders['0'].reference, '#R1', 'les commandes déjà refusées localement ne partent pas');
  assert.throws(function () { ship([]); }, /Aucune commande/);
});

test('Ecotrack : plus de 100 commandes = plusieurs requêtes', function () {
  ecoSetup();
  var ids = [];
  for (var i = 1; i <= 120; i++) { ids.push('#B' + i); addConfirmed('#B' + i); }
  var out = ship(ids);
  assert.strictEqual(out.filter(function (r) { return r.ok; }).length, 120);
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 2);
  assert.strictEqual(Object.keys(FAKE.calls.filter(function (c) { return c.path === '/api/v1/create/orders'; })[0].body.orders).length, 100);
  assert.strictEqual(FAKE.orders.length, 120);
  assert.strictEqual(order('#B120').status, 'Expédiée');
  var tooMany = [];
  for (var k = 0; k < 201; k++) tooMany.push('#X' + k);
  assert.throws(function () { ship(tooMany); }, /200 commandes/);
});

test('Ecotrack : connexion coupée après la création : le colis est retrouvé, pas de doublon', function () {
  ecoSetup();
  addConfirmed('#T1');
  FAKE.createThenFail = true;
  var out = results(ship(['#T1']));
  assert.ok(out['#T1'].ok, out['#T1'].message);
  assert.strictEqual(order('#T1').tracking, FAKE.orders[0].tracking);
  assert.strictEqual(order('#T1').status, 'Expédiée');
  assert.strictEqual(FAKE.orders.length, 1);
});

test('Ecotrack : Ecotrack injoignable : rien n’est modifié et on peut réessayer', function () {
  ecoSetup();
  addConfirmed('#D1');
  ecotrackCatalog_(true); // le catalogue est déjà en mémoire
  FAKE.down = true;
  var out = results(ship(['#D1']));
  assert.ok(!out['#D1'].ok);
  assert.ok(/Impossible de joindre Ecotrack/.test(out['#D1'].message) && /Résultat incertain/.test(out['#D1'].message), out['#D1'].message);
  assert.strictEqual(order('#D1').status, 'Confirmée');
  assert.ok(!__mock.state.cache['ship:#D1']);
  FAKE.down = false;
  assert.ok(results(ship(['#D1']))['#D1'].ok);
  assert.strictEqual(FAKE.orders.length, 1);
});

test('Ecotrack : colis non créé après une erreur serveur : message clair, réessai possible', function () {
  ecoSetup();
  addConfirmed('#S1');
  ecotrackCatalog_(true);
  FAKE.queue.push({ code: 502, body: '<html>Bad gateway</html>' });
  var out = results(ship(['#S1']));
  assert.ok(!out['#S1'].ok && /indisponible \(erreur 502\)/.test(out['#S1'].message) && /vous pouvez réessayer/.test(out['#S1'].message), out['#S1'].message);
  assert.strictEqual(order('#S1').status, 'Confirmée');
  assert.ok(results(ship(['#S1']))['#S1'].ok);
});

test('Ecotrack : limite de requêtes (429) attendue puis réessayée', function () {
  ecoSetup();
  addConfirmed('#L1');
  ecotrackCatalog_(true);
  FAKE.queue.push({ code: 429, headers: { 'Retry-After': '3' } });
  assert.ok(results(ship(['#L1']))['#L1'].ok);
  assert.deepStrictEqual(__mock.state.sleeps, [3000]);
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 2);
  assert.strictEqual(FAKE.orders.length, 1);
});

test('Ecotrack : jeton refusé à l’envoi', function () {
  ecoSetup();
  addConfirmed('#K1');
  // Jeton changé : l'erreur est signalée tout de suite, avant toute création de colis.
  saveEcotrackConfig_(FAKE.host, 'JETON-PERIME-1234567890');
  assert.throws(function () { ship(['#K1']); }, /refusé le jeton/);
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 0);

  // Jeton périmé entre la lecture des tarifs (gardée en mémoire) et l'envoi.
  saveEcotrackConfig_(FAKE.host, FAKE.token);
  ecotrackCatalog_(true);
  PropertiesService.getScriptProperties().setProperty(ECO.PROP_TOKEN, 'JETON-PERIME-1234567890');
  var out = results(ship(['#K1']));
  assert.ok(!out['#K1'].ok && /refusé le jeton/.test(out['#K1'].message));
  assert.strictEqual(order('#K1').status, 'Confirmée');
  assert.strictEqual(order('#K1').tracking, '');
  assert.strictEqual(FAKE.orders.length, 0);
});

test('Ecotrack : une commande déjà en cours d’envoi n’est pas envoyée deux fois', function () {
  ecoSetup();
  addConfirmed('#C1');
  __mock.state.cache['ship:#C1'] = '1';
  var out = results(ship(['#C1']));
  assert.ok(/déjà en cours/.test(out['#C1'].message));
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 0);
});

test('Ecotrack : correspondance des statuts', function () {
  var m = mapEcotrackStatus_;
  assert.strictEqual(m('prete_a_expedier'), 'Expédiée');
  assert.strictEqual(m('en_attente'), 'Expédiée');
  assert.strictEqual(m('en_transit'), 'En livraison');
  assert.strictEqual(m('sorti_en_livraison'), 'En livraison');
  assert.strictEqual(m('tentative_echouee'), 'En livraison');
  assert.strictEqual(m('livre_non_encaisse'), 'Livrée');
  assert.strictEqual(m('livré'), 'Livrée');
  assert.strictEqual(m('payé_et_archivé'), 'Livrée');
  assert.strictEqual(m('encaissé'), 'Livrée');
  assert.strictEqual(m('retour_en_cours'), 'Retour');
  assert.strictEqual(m('retourné'), 'Retour');
  assert.strictEqual(m('refusé_par_le_client'), 'Retour');
  assert.strictEqual(m('non_livre'), 'En livraison');
  assert.strictEqual(m('statut_bizarre'), null);
  assert.strictEqual(m(''), null);
  assert.strictEqual(m(null), null);
});

test('Ecotrack : suivi des statuts, statut inconnu signalé une seule fois', function () {
  ecoSetup();
  ['#M1', '#M2', '#M3', '#M4'].forEach(function (id) { addConfirmed(id); });
  var shipped = results(ship(['#M1', '#M2', '#M3', '#M4']));
  FAKE.setStatus(shipped['#M1'].tracking, 'payé_et_archivé');
  FAKE.setStatus(shipped['#M2'].tracking, 'en_livraison');
  FAKE.setStatus(shipped['#M3'].tracking, 'retour_en_cours');
  FAKE.setStatus(shipped['#M4'].tracking, 'statut_bizarre');

  var calls = FAKE.count('/api/v1/get/orders');
  var s = syncEcotrackStatuses_();
  assert.deepStrictEqual([s.checked, s.updated, s.unknown, s.missing], [4, 3, 1, 0]);
  assert.strictEqual(FAKE.count('/api/v1/get/orders') - calls, 4, 'un appel par colis (peu de colis)');
  assert.strictEqual(order('#M1').status, 'Livrée');
  assert.strictEqual(order('#M2').status, 'En livraison');
  assert.strictEqual(order('#M3').status, 'Retour');
  assert.strictEqual(order('#M4').status, 'Expédiée');
  assert.strictEqual(order('#M1').carrierStatus, 'payé_et_archivé');
  assert.strictEqual(order('#M4').carrierStatus, 'statut_bizarre');

  var unknownLogs = function () {
    var s = sheet('Journal');
    return s.getRange(2, 4, s.getLastRow() - 1, 2).getValues().filter(function (r) { return r[0] === 'Statut Ecotrack inconnu'; }).length;
  };
  assert.strictEqual(unknownLogs(), 1);
  syncEcotrackStatuses_();
  assert.strictEqual(unknownLogs(), 1, 'pas de répétition');

  // Un statut ne revient jamais en arrière : « En livraison » ne redevient pas « Expédiée ».
  FAKE.setStatus(shipped['#M2'].tracking, 'prete_a_expedier');
  syncEcotrackStatuses_();
  assert.strictEqual(order('#M2').status, 'En livraison');
  // Les commandes terminées (livrée, retour) ne sont plus interrogées : il reste 2 colis en cours.
  calls = FAKE.count('/api/v1/get/orders');
  syncEcotrackStatuses_();
  assert.strictEqual(FAKE.count('/api/v1/get/orders') - calls, 2);
});

test('Ecotrack : suivi de nombreux colis par pages, colis disparu signalé', function () {
  ecoSetup();
  var ids = [];
  for (var i = 1; i <= 20; i++) { ids.push('#N' + i); addConfirmed('#N' + i); }
  var shipped = results(ship(ids));
  FAKE.setStatus(shipped['#N1'].tracking, 'livre');
  FAKE.remove(shipped['#N2'].tracking); // archivé chez Ecotrack
  var calls = FAKE.count('/api/v1/get/orders');
  var s = syncEcotrackStatuses_();
  assert.strictEqual(s.checked, 20);
  assert.strictEqual(s.updated, 1);
  assert.strictEqual(s.missing, 1);
  // 1 page pour les 19 colis, plus 1 recherche individuelle pour le colis manquant.
  assert.strictEqual(FAKE.count('/api/v1/get/orders') - calls, 2);
  assert.strictEqual(order('#N1').status, 'Livrée');
  assert.strictEqual(order('#N2').status, 'Expédiée', 'statut inchangé quand le colis est introuvable');
  assert.strictEqual(order('#N2').carrierStatus, 'Introuvable chez Ecotrack');
  syncEcotrackStatuses_();
  var journal = sheet('Journal').getRange(2, 4, sheet('Journal').getLastRow() - 1, 1).getValues();
  assert.strictEqual(journal.filter(function (r) { return r[0] === 'Colis introuvable'; }).length, 1);
});

test('Ecotrack : le déclencheur automatique ne plante pas et n’écrit l’erreur qu’une fois', function () {
  setup();
  assert.strictEqual(syncEcotrackStatuses().configured, false, 'sans effet tant que non configuré');
  ecoSetup();
  addConfirmed('#Q1');
  var shipped = results(ship(['#Q1']));
  saveEcotrackConfig_(FAKE.host, 'JETON-PERIME-1234567890');
  assert.strictEqual(syncEcotrackStatuses(), null);
  assert.strictEqual(syncEcotrackStatuses(), null);
  var log = sheet('Journal').getRange(2, 4, sheet('Journal').getLastRow() - 1, 2).getValues();
  var errors = log.filter(function (r) { return r[0] === 'Erreur Ecotrack'; });
  assert.strictEqual(errors.length, 1);
  assert.ok(/refusé le jeton/.test(errors[0][1]));
  saveEcotrackConfig_(FAKE.host, FAKE.token);
  FAKE.setStatus(shipped['#Q1'].tracking, 'livre');
  assert.strictEqual(syncEcotrackStatuses().updated, 1);
  assert.strictEqual(order('#Q1').status, 'Livrée');
});

test('Ecotrack : données de la page Expéditions', function () {
  setup();
  addConfirmed('#V1');
  var d0 = api_shippingList();
  assertSerializable(d0, 'api_shippingList');
  assert.strictEqual(d0.configured, false);
  assert.strictEqual(d0.toShip.length, 1);

  saveEcotrackConfig_(FAKE.host, FAKE.token);
  addConfirmed('#V2', { 'Wilaya': '12 - Tébessa' });
  addConfirmed('#V3', { 'Livraison': 'Stop desk', 'Wilaya': '14 - Tiaret' });
  addConfirmed('#V4', { 'Société': 'Yalidine' });
  addConfirmed('#V0', { 'Date': new Date(Date.now() - 86400000) });
  var d = api_shippingList();
  assertSerializable(d, 'api_shippingList');
  assert.strictEqual(d.configured, true);
  assert.strictEqual(d.host, 'demo.ecotrack.dz');
  assert.deepStrictEqual(d.toShip.map(function (x) { return x.id; }), ['#V0', '#V1', '#V2', '#V3', '#V4'], 'les plus anciennes d’abord');
  var by = {};
  d.toShip.forEach(function (x) { by[x.id] = x; });
  assert.deepStrictEqual(by['#V1'].problems, []);
  assert.ok(/non desservie/.test(by['#V2'].problems.join()));
  assert.ok(/Stop desk indisponible/.test(by['#V3'].problems.join()));
  assert.ok(/Yalidine/.test(by['#V4'].problems.join()));

  var sent = results(api_shipEcotrack(['#V1']));
  assert.ok(sent['#V1'].ok);
  var d2 = api_shippingList();
  assert.strictEqual(d2.toShip.length, 4);
  assert.strictEqual(d2.inTransit.length, 1);
  assert.strictEqual(d2.inTransit[0].tracking, sent['#V1'].tracking);
  assert.strictEqual(d2.inTransit[0].status, 'Expédiée');
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
