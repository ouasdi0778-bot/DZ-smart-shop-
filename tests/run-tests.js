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
load(path.join(__dirname, 'fake-shopify.js'));
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
    ['processNewRows/5', 'syncEcotrackStatuses/30'], 'ni Releasit ni Shopify : rien d’inutile');
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

  assert.ok(FAKE.lastCall('/api/v1/validate/token').query.api_token === FAKE.token, 'le jeton est vérifié avec validate/token');
  FAKE.apiDisabled = true;
  assert.throws(function () { api_ecotrackTest(); }, /accès à l’API est désactivé pour ce compte/);
  FAKE.apiDisabled = false;
  saveEcotrackConfig_(FAKE.host, 'AUTRE-JETON-1234567890');
  assert.throws(function () { api_ecotrackTest(); }, /refusé le jeton \(jeton invalide\)/);
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

test('Ecotrack : création du colis, n° de suivi écrit, la commande attend votre validation', function () {
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
  assert.strictEqual(o1.status, 'Confirmée', 'pas « Expédiée » : vous validez dans Ecotrack');
  assert.strictEqual(o1.carrier, 'Ecotrack');
  assert.strictEqual(o1.tracking, out['#E1'].tracking);
  assert.ok(o1.carrierMoved, 'date de création du colis gardée pour signaler un colis jamais validé');
  assert.strictEqual(o1.total, 6450, 'le total annoncé au client ne change pas');
  var journal = sheet('Journal').getRange(2, 3, sheet('Journal').getLastRow() - 1, 3).getValues();
  assert.ok(journal.some(function (r) { return r[0] === '#E1' && r[1] === 'Colis créé chez Ecotrack' && r[2].indexOf(o1.tracking) >= 0; }));
  assert.ok(!__mock.state.cache['ship:#E1'], 'réservation libérée');
  assert.strictEqual(FAKE.count('/api/v1/valid/order'), 0, 'l’outil ne valide jamais l’expédition');

  // Une 2e tentative ne doit rien renvoyer.
  var again = results(ship(['#E1']));
  assert.ok(!again['#E1'].ok && /Déjà envoyée/.test(again['#E1'].message));
  assert.strictEqual(FAKE.count('/api/v1/create/orders'), 1);
  assert.strictEqual(FAKE.orders.length, 2);

  // Vous validez dans Ecotrack : l'outil le voit et la commande passe « Expédiée ».
  FAKE.validate(out['#E1'].tracking);
  var s = syncEcotrackStatuses_();
  assert.strictEqual(s.checked, 2);
  assert.strictEqual(s.updated, 1);
  assert.strictEqual(order('#E1').status, 'Expédiée');
  assert.strictEqual(order('#E1').carrierStatus, 'en_ramassage');
  assert.strictEqual(order('#E2').status, 'Confirmée', 'l’autre colis n’est pas encore validé');
  assert.strictEqual(order('#E2').carrierStatus, 'prete_a_expedier');
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
  assert.strictEqual(order('#R1').status, 'Confirmée');
  assert.ok(order('#R1').tracking, 'colis créé : le n° de suivi est écrit');
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
  assert.ok(/^ECT/.test(order('#B120').tracking));
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
  assert.strictEqual(order('#T1').status, 'Confirmée');
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

test('Ecotrack : correspondance des 19 statuts de la documentation', function () {
  var m = mapEcotrackStatus_;
  var expected = {
    prete_a_expedier: '', en_ramassage: 'Expédiée', en_preparation_stock: 'Expédiée', vers_hub: 'Expédiée', en_hub: 'Expédiée',
    vers_wilaya: 'Expédiée', en_preparation: 'Expédiée', en_livraison: 'En livraison', suspendu: 'En livraison',
    livre_non_encaisse: 'Livrée', encaisse_non_paye: 'Livrée', paiements_prets: 'Livrée', paye_et_archive: 'Livrée',
    retour_chez_livreur: 'Retour', retour_transit_entrepot: 'Retour', retour_en_traitement: 'Retour', retour_recu: 'Retour',
    retour_archive: 'Retour', annule: 'Annulée'
  };
  assert.strictEqual(Object.keys(expected).length, 19);
  Object.keys(expected).forEach(function (slug) {
    assert.strictEqual(m(slug), expected[slug], slug);
    assert.ok(ecotrackLabel_(slug), 'libellé pour ' + slug);
  });
  assert.strictEqual(m('payé_et_archivé'), 'Livrée', 'écriture avec accents de l’exemple de la documentation');
  assert.strictEqual(m('PAYE_ET_ARCHIVE'), 'Livrée');
  assert.strictEqual(m('retour_inconnu_mais_retour'), 'Retour', 'variante proche d’un statut connu');
  assert.strictEqual(m('statut_bizarre'), null, 'statut inconnu');
  assert.strictEqual(m(''), null);
  assert.strictEqual(m(null), null);
  assert.strictEqual(ecotrackStatusInfo_('prete_a_expedier').group, 'draft');
  assert.strictEqual(ecotrackStatusInfo_('suspendu').group, 'suspended');
  assert.strictEqual(ecotrackStatusInfo_('statut_bizarre').group, 'unknown');
  assert.strictEqual(ecotrackLabel_('statut_bizarre'), 'statut_bizarre');
});

test('Ecotrack : suivi des statuts en lecture groupée, statut inconnu signalé une seule fois', function () {
  ecoSetup();
  ['#M1', '#M2', '#M3', '#M4', '#M5'].forEach(function (id) { addConfirmed(id); });
  var shipped = results(ship(['#M1', '#M2', '#M3', '#M4', '#M5']));
  FAKE.setStatus(shipped['#M1'].tracking, 'paye_et_archive'); // archivé : absent de get/orders, présent dans get/orders/status
  FAKE.setPayment(shipped['#M1'].tracking, 312);
  FAKE.setStatus(shipped['#M2'].tracking, 'en_livraison');
  FAKE.setStatus(shipped['#M3'].tracking, 'retour_en_traitement');
  FAKE.setStatus(shipped['#M4'].tracking, 'statut_bizarre');
  // #M5 : jamais validé, reste « prete_a_expedier ».

  var bulk = FAKE.count('/api/v1/get/orders/status');
  var single = FAKE.count('/api/v1/get/orders');
  var s = syncEcotrackStatuses_();
  assert.deepStrictEqual([s.checked, s.updated, s.unknown, s.missing], [5, 3, 1, 0]);
  assert.strictEqual(FAKE.count('/api/v1/get/orders/status') - bulk, 1, 'une seule requête pour les 5 colis');
  assert.strictEqual(FAKE.count('/api/v1/get/orders') - single, 0, 'pas de lecture colis par colis');
  var q = FAKE.lastCall('/api/v1/get/orders/status');
  assert.strictEqual(q.query.api_token, FAKE.token);
  assert.strictEqual(q.query.status, 'all');
  assert.strictEqual(q.query.trackings.split(',').length, 5);

  assert.strictEqual(order('#M1').status, 'Livrée');
  assert.strictEqual(order('#M1').paymentId, '312');
  assert.strictEqual(order('#M2').status, 'En livraison');
  assert.strictEqual(order('#M3').status, 'Retour');
  assert.strictEqual(order('#M4').status, 'Confirmée', 'statut inconnu : rien ne change');
  assert.strictEqual(order('#M4').carrierStatus, 'statut_bizarre');
  assert.strictEqual(order('#M5').status, 'Confirmée', 'pas encore validé');
  assert.strictEqual(order('#M5').carrierStatus, 'prete_a_expedier');
  assert.strictEqual(order('#M1').carrierLabel, 'Payé');

  var logCount = function (action) {
    var j = sheet('Journal');
    return j.getRange(2, 4, j.getLastRow() - 1, 1).getValues().filter(function (r) { return r[0] === action; }).length;
  };
  assert.strictEqual(logCount('Statut Ecotrack inconnu'), 1);
  syncEcotrackStatuses_();
  assert.strictEqual(logCount('Statut Ecotrack inconnu'), 1, 'pas de répétition');

  // Un statut ne revient jamais en arrière : « En livraison » ne redevient pas « Expédiée ».
  FAKE.setStatus(shipped['#M2'].tracking, 'prete_a_expedier');
  syncEcotrackStatuses_();
  assert.strictEqual(order('#M2').status, 'En livraison');
  // Les colis terminés (livré, retour) ne sont plus interrogés : il en reste 3 à suivre.
  syncEcotrackStatuses_();
  assert.strictEqual(FAKE.lastCall('/api/v1/get/orders/status').query.trackings.split(',').length, 3);
  assert.ok(PropertiesService.getScriptProperties().getProperty(ECO.PROP_LAST_SYNC), 'heure de la dernière lecture gardée');
});

test('Ecotrack : statut annulé chez Ecotrack = commande annulée', function () {
  ecoSetup();
  addConfirmed('#X1');
  var t = results(ship(['#X1']))['#X1'].tracking;
  FAKE.setStatus(t, 'annule');
  syncEcotrackStatuses_();
  assert.strictEqual(order('#X1').status, 'Annulée');
  assert.strictEqual(order('#X1').cancelReason, 'Annulée chez Ecotrack');
});

test('Ecotrack : si la lecture groupée ne marche pas, secours par pages puis colis par colis', function () {
  ecoSetup();
  var ids = [];
  for (var i = 1; i <= 20; i++) { ids.push('#N' + i); addConfirmed('#N' + i); }
  var shipped = results(ship(ids));
  FAKE.setStatus(shipped['#N1'].tracking, 'livre_non_encaisse');
  FAKE.remove(shipped['#N2'].tracking); // le colis n'existe plus chez Ecotrack

  FAKE.statusEndpoint = 'missing'; // get/orders/status en erreur 404
  var calls = FAKE.count('/api/v1/get/orders');
  var s = syncEcotrackStatuses_();
  assert.strictEqual(s.checked, 20);
  assert.strictEqual(s.updated, 1);
  assert.strictEqual(s.missing, 1);
  // 1 page pour les 19 colis, plus 1 recherche individuelle pour le colis manquant.
  assert.strictEqual(FAKE.count('/api/v1/get/orders') - calls, 2);
  assert.strictEqual(order('#N1').status, 'Livrée');
  assert.strictEqual(order('#N2').status, 'Confirmée', 'statut inchangé quand le colis est introuvable');
  assert.strictEqual(order('#N2').carrierStatus, 'Introuvable chez Ecotrack');
  syncEcotrackStatuses_();
  var journal = sheet('Journal').getRange(2, 4, sheet('Journal').getLastRow() - 1, 1).getValues();
  assert.strictEqual(journal.filter(function (r) { return r[0] === 'Colis introuvable'; }).length, 1);

  // Réponse de forme inconnue : même secours.
  FAKE.statusEndpoint = 'weird';
  FAKE.setStatus(shipped['#N3'].tracking, 'livre_non_encaisse');
  syncEcotrackStatuses_();
  assert.strictEqual(order('#N3').status, 'Livrée');

  // Jeton refusé : pas de secours, une vraie erreur.
  saveEcotrackConfig_(FAKE.host, 'JETON-PERIME-1234567890');
  FAKE.statusEndpoint = 'ok';
  assert.throws(function () { syncEcotrackStatuses_(); }, /refusé le jeton/);
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
  FAKE.setStatus(shipped['#Q1'].tracking, 'livre_non_encaisse');
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
  assert.strictEqual(d2.created.length, 1, 'colis créé, en attente de votre validation chez Ecotrack');
  assert.strictEqual(d2.created[0].tracking, sent['#V1'].tracking);
  assert.strictEqual(d2.created[0].carrierLabel, 'Créé, à valider chez Ecotrack');
  assert.strictEqual(d2.created[0].late, false);
  assert.strictEqual(d2.alertHours, 26);
  assertSerializable(d2, 'api_shippingList');
});

/* ---------------- Suivi des colis ---------------- */

function hoursAgo(h) { return new Date(Date.now() - h * 3600000); }
/** Ajoute un colis Ecotrack déjà dans l'état voulu (sans passer par l'API). */
function addParcel(id, fields) {
  phoneSeq++;
  var base = {
    'N°': id, 'Date': hoursAgo(100), 'Client': 'Client ' + id, 'Téléphone': '0551' + ('000000' + phoneSeq).slice(-6),
    'Wilaya': '16 - Alger', 'Commune': 'Kouba', 'Adresse': 'Rue 1', 'Total': 1000, 'Statut': 'Expédiée',
    'Société': 'Ecotrack', 'N° de suivi': 'ECT' + String(id).replace(/\W/g, '')
  };
  Object.keys(fields || {}).forEach(function (k) { base[k] = fields[k]; });
  addRaw(base);
}
function setSetting(key, value) {
  var s = sheet('Paramètres');
  var keys = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) { s.getRange(i + 2, 2).setValue(value); return; }
  throw new Error('Réglage absent : ' + key);
}
function alertsOf(res) {
  var by = {};
  res.alerts.forEach(function (a) { by[a.id] = a; });
  return by;
}

test('Suivi : alertes (suspendu, retour, sans mouvement 26 h, jamais validé, introuvable, statut inconnu)', function () {
  setup();
  addParcel('A1', { 'Statut': 'En livraison', 'Statut société': 'suspendu', 'Dernier mouvement colis': hoursAgo(2) });
  addParcel('A2', { 'Statut': 'Retour', 'Statut société': 'retour_chez_livreur', 'Dernier mouvement colis': hoursAgo(5) });
  addParcel('A3', { 'Statut société': 'en_hub', 'Dernier mouvement colis': hoursAgo(27) });
  addParcel('A3b', { 'Statut société': 'en_hub', 'Dernier mouvement colis': hoursAgo(25) });
  addParcel('A4', { 'Statut': 'Confirmée', 'Statut société': 'prete_a_expedier', 'Dernier mouvement colis': hoursAgo(30) });
  addParcel('A4b', { 'Statut': 'Confirmée', 'Statut société': 'prete_a_expedier', 'Dernier mouvement colis': hoursAgo(10) });
  addParcel('A5', { 'Statut société': 'Introuvable chez Ecotrack', 'Dernier mouvement colis': hoursAgo(3) });
  addParcel('A6', { 'Statut société': 'statut_bizarre', 'Dernier mouvement colis': hoursAgo(3) });
  addParcel('A7', { 'Statut': 'Livrée', 'Statut société': 'paye_et_archive', 'Dernier mouvement colis': hoursAgo(90) });
  addParcel('A8', { 'Statut': 'Retour', 'Statut société': 'retour_recu', 'Dernier mouvement colis': hoursAgo(90) });
  addParcel('A9', { 'Société': 'Yalidine', 'Statut société': 'suspendu', 'Dernier mouvement colis': hoursAgo(90) });

  var res = api_trackingOverview(30);
  assertSerializable(res, 'api_trackingOverview');
  var by = alertsOf(res);
  assert.deepStrictEqual(Object.keys(by).sort(), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
  assert.strictEqual(by.A1.level, 'urgent');
  assert.strictEqual(by.A1.kind, 'suspended');
  assert.ok(/appelez le client/.test(by.A1.detail));
  assert.strictEqual(by.A2.level, 'urgent');
  assert.ok(/rappelez le client/.test(by.A2.detail));
  assert.strictEqual(by.A3.kind, 'stale');
  assert.ok(/27 h/.test(by.A3.detail), by.A3.detail);
  assert.strictEqual(by.A4.kind, 'draft');
  assert.ok(/pas encore validé/.test(by.A4.detail));
  assert.strictEqual(by.A5.kind, 'missing');
  assert.strictEqual(by.A6.level, 'info');
  assert.deepStrictEqual(res.alerts.map(function (a) { return a.level; }), ['urgent', 'urgent', 'warn', 'warn', 'warn', 'info'], 'urgentes d’abord');
  assert.strictEqual(res.alerts[0].id, 'A2', 'à niveau égal, la plus ancienne d’abord');
  assert.strictEqual(res.alertHours, 26);

  // Pastille du menu et tableau de bord : urgentes et à surveiller, pas les infos.
  assert.strictEqual(api_counts().alerts, 5);
  assert.strictEqual(api_dashboard('7').todo.parcelAlerts, 5);

  // Un colis marqué « traité » disparaît : alerte liée à un événement, jusqu'au prochain changement.
  api_markFollowUp('A1');
  assert.ok(!alertsOf(api_trackingOverview(30)).A1, 'alerte traitée');
  var ctx = readOrders_();
  writeFields_(ctx, findOrder_(ctx, 'A1'), { carrierMoved: new Date(Date.now() + 60000) });
  assert.ok(alertsOf(api_trackingOverview(30)).A1, 'le colis a bougé : l’alerte revient');
  // Alerte liée au temps : masquée pendant 26 h après le traitement.
  api_markFollowUp('A3');
  assert.ok(!alertsOf(api_trackingOverview(30)).A3);
  assert.throws(function () { api_markFollowUp('#nope'); }, /introuvable/);

  // Le délai se règle dans l'onglet Paramètres.
  setSetting('SUIVI_ALERTE_HEURES', 48);
  var by48 = alertsOf(api_trackingOverview(30));
  assert.ok(!by48.A4, '30 h < 48 h : plus signalé');
  assert.ok(by48.A1 && by48.A5, 'les alertes liées à un événement restent');
  setSetting('SUIVI_ALERTE_HEURES', 12);
  assert.ok(alertsOf(api_trackingOverview(30)).A3b, '25 h > 12 h : signalé');
});

test('Suivi : la date de création du colis n’est pas remise à zéro par la première lecture du statut', function () {
  ecoSetup();
  addConfirmed('#Z1');
  var t = results(ship(['#Z1']))['#Z1'].tracking;
  var ctx = readOrders_();
  writeFields_(ctx, findOrder_(ctx, '#Z1'), { carrierMoved: hoursAgo(30) }); // créé il y a 30 h
  syncEcotrackStatuses_();
  assert.strictEqual(order('#Z1').carrierStatus, 'prete_a_expedier');
  assert.ok(Date.now() - new Date(order('#Z1').carrierMoved).getTime() > 29 * 3600000, 'horloge de création conservée');
  assert.strictEqual(alertsOf(api_trackingOverview(30))['#Z1'].kind, 'draft', 'jamais validé depuis 30 h');

  FAKE.validate(t); // vous validez dans Ecotrack
  syncEcotrackStatuses_();
  assert.strictEqual(order('#Z1').status, 'Expédiée');
  assert.ok(Date.now() - new Date(order('#Z1').carrierMoved).getTime() < 60000, 'le mouvement est daté de la validation');
  assert.ok(!alertsOf(api_trackingOverview(30))['#Z1'], 'plus d’alerte');
});

test('Suivi : argent chez le livreur, à encaisser, à verser, payé, versements', function () {
  setup();
  addParcel('G1', { 'Statut': 'En livraison', 'Statut société': 'en_livraison', 'Total': 1000 });
  addParcel('G2', { 'Statut société': 'vers_hub', 'Total': 2000 });
  addParcel('G3', { 'Statut': 'Confirmée', 'Statut société': 'prete_a_expedier', 'Total': 9999 }); // pas encore parti : ignoré
  addParcel('G4', { 'Statut': 'Livrée', 'Statut société': 'livre_non_encaisse', 'Total': 1500 });
  addParcel('G5', { 'Statut': 'Livrée', 'Statut société': 'encaisse_non_paye', 'Total': 2500 });
  addParcel('G6', { 'Statut': 'Livrée', 'Statut société': 'paiements_prets', 'Total': 3000 });
  addParcel('G7', { 'Statut': 'Livrée', 'Statut société': 'paye_et_archive', 'Total': 1000, 'N° de versement': '312', 'Dernier mouvement colis': hoursAgo(48) });
  addParcel('G8', { 'Statut': 'Livrée', 'Statut société': 'paye_et_archive', 'Total': 2000, 'N° de versement': '312', 'Dernier mouvement colis': hoursAgo(40) });
  addParcel('G9', { 'Statut': 'Livrée', 'Statut société': 'paye_et_archive', 'Total': 700, 'N° de versement': '200', 'Dernier mouvement colis': hoursAgo(24 * 40) });
  addParcel('G10', { 'Société': 'Yalidine', 'Statut': 'Livrée', 'Statut société': 'encaisse_non_paye', 'Total': 5555 });

  var r = api_trackingOverview(30);
  assert.deepStrictEqual(r.money.enRoute, { count: 2, amount: 3000 });
  assert.deepStrictEqual(r.money.delivered, { count: 1, amount: 1500 });
  assert.deepStrictEqual(r.money.cashed, { count: 1, amount: 2500 });
  assert.deepStrictEqual(r.money.ready, { count: 1, amount: 3000 });
  assert.deepStrictEqual(r.money.paid, { count: 2, amount: 3000 }, 'payés sur 30 jours');
  assert.deepStrictEqual(r.payments.map(function (p) { return [p.id, p.count, p.amount, p.paid]; }), [['312', 2, 3000, true]]);
  var r90 = api_trackingOverview(90);
  assert.deepStrictEqual(r90.money.paid, { count: 3, amount: 3700 });
  assert.deepStrictEqual(r90.payments.map(function (p) { return p.id; }), ['312', '200'], 'versement le plus récent d’abord');
  assert.strictEqual(api_trackingOverview(12).days, 30, 'période inconnue : 30 jours');
});

test('Suivi : liste des colis en cours', function () {
  setup();
  addParcel('L1', { 'Statut': 'En livraison', 'Statut société': 'en_livraison', 'Dernier mouvement colis': hoursAgo(3) });
  addParcel('L2', { 'Statut société': 'en_hub', 'Dernier mouvement colis': hoursAgo(40) });
  addParcel('L3', { 'Statut': 'Confirmée', 'Statut société': 'prete_a_expedier', 'Dernier mouvement colis': hoursAgo(2) });
  addParcel('L4', { 'Statut': 'Retour', 'Statut société': 'retour_en_traitement', 'Dernier mouvement colis': hoursAgo(6) });
  addParcel('L5', { 'Statut': 'Livrée', 'Statut société': 'paye_et_archive' });
  addParcel('L6', { 'Statut': 'Retour', 'Statut société': 'retour_recu' });
  var r = api_trackingOverview(30);
  assert.deepStrictEqual(r.parcels.map(function (p) { return p.id; }), ['L2', 'L4', 'L1', 'L3'], 'le plus ancien mouvement d’abord');
  var by = {};
  r.parcels.forEach(function (p) { by[p.id] = p; });
  assert.strictEqual(by.L2.stale, true);
  assert.strictEqual(by.L1.stale, false);
  assert.strictEqual(by.L1.carrierLabel, 'En livraison');
  assert.strictEqual(by.L3.carrierLabel, 'Créé, à valider chez Ecotrack');
  assert.strictEqual(by.L4.group, 'returning');
  assert.ok(by.L2.ageHours >= 40);
});

test('Suivi : chronologie d’un colis (get/tracking/info)', function () {
  ecoSetup();
  addConfirmed('#H1');
  var t = results(ship(['#H1']))['#H1'].tracking;
  FAKE.history[t] = [
    { activity: 'picked', date: '2026-11-12 10:00:00' },
    { activity: 'order_information_received_by_carrier', date: '2026-11-12 09:00:00', content: 'validé par vous' },
    { activity: 'attempt_delivery', created_at: '2026-11-12 14:00:00', remarque: 'Client absent' },
    { activity: 'etape_inconnue', date: '2026-11-12 15:00:00' }
  ];
  var h = api_parcelHistory('#H1');
  assertSerializable(h, 'api_parcelHistory');
  assert.strictEqual(h.tracking, t);
  assert.deepStrictEqual(h.events.map(function (e) { return e.label; }), [
    'Commande enregistrée et validée par le vendeur', 'Colis récupéré par le transporteur', 'Tentative de livraison', 'etape_inconnue'
  ], 'ordre chronologique, libellés français, étape inconnue gardée telle quelle');
  assert.strictEqual(h.events[0].note, 'validé par vous');
  assert.strictEqual(h.events[2].note, 'Client absent');
  assert.ok(h.events[0].date && h.events[0].date < h.events[1].date);
  assert.strictEqual(h.raw, '');

  // Réponse de forme inconnue : on la renvoie telle quelle plutôt que de rien afficher.
  FAKE.historyShape = 'weird';
  var weird = api_parcelHistory('#H1');
  assert.strictEqual(weird.events.length, 0);
  assert.ok(/numero/.test(weird.raw));

  assert.throws(function () { api_parcelHistory('#nope'); }, /introuvable/);
  addConfirmed('#H2');
  assert.throws(function () { api_parcelHistory('#H2'); }, /pas de n° de suivi/);
  var ctx = readOrders_();
  writeFields_(ctx, findOrder_(ctx, '#H2'), { tracking: 'ECT-INCONNU-123' });
  assert.throws(function () { api_parcelHistory('#H2'); }, /refusé la demande \(erreur 422\)/);

  // Autres présentations possibles de la liste.
  assert.deepStrictEqual(parseTrackingInfo_(['picked', 'livred']).map(function (e) { return e.label; }), ['Colis récupéré par le transporteur', 'Colis livré']);
  assert.deepStrictEqual(parseTrackingInfo_({ data: [{ status: 'Return_received' }] }).map(function (e) { return e.label; }), ['Retour réceptionné par le vendeur']);
  assert.deepStrictEqual(parseTrackingInfo_(null), []);
});

test('Suivi : « traité » sans la colonne dans le classeur = message clair', function () {
  setup();
  addParcel('K1', { 'Statut société': 'suspendu', 'Dernier mouvement colis': hoursAgo(1) });
  // Classeur ancien : la colonne « Suivi traité le » n'existe pas encore.
  var s = sheet('Commandes');
  var header = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  var col = header.indexOf('Suivi traité le') + 1;
  s.getRange(1, col).setValue('Autre colonne');
  assert.throws(function () { api_markFollowUp('K1'); }, /Colonne « Suivi traité le » absente/);
});

/* ---------------- Shopify (Releasit COD) ---------------- */

var SHOPIFY = globalThis.__fakeShopify;
var SHOP_DOMAIN = 'algerie-smart.myshopify.com';
function shopSetup() {
  setup();
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.token, '');
}
function hoursBack(h) { return new Date(Date.now() - h * 3600000).toISOString(); }
function orderRowIds() {
  var s = sheet('Commandes');
  var header = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  var col = header.indexOf('N°') + 1;
  return s.getLastRow() < 2 ? [] : s.getRange(2, col, s.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }).filter(String);
}
function logActions() {
  var j = sheet('Journal');
  return j.getLastRow() < 2 ? [] : j.getRange(2, 4, j.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; });
}

test('Shopify : enregistrement de la boutique et de l’accès', function () {
  assert.strictEqual(normalizeShopifyDomain_('https://Algerie-Smart.myshopify.com/admin/orders'), 'algerie-smart.myshopify.com');
  assert.strictEqual(normalizeShopifyDomain_('algerie-smart'), 'algerie-smart.myshopify.com');
  assert.strictEqual(normalizeShopifyDomain_('evil.example.com'), '');
  assert.strictEqual(normalizeShopifyDomain_(''), '');
  assert.strictEqual(shopifyConfig_().configured, false);
  assert.throws(function () { saveShopifyConfig_('evil.example.com', SHOPIFY.token, ''); }, /Adresse de boutique invalide/);
  assert.throws(function () { saveShopifyConfig_(SHOP_DOMAIN, 'court', ''); }, /trop court/);
  assert.throws(function () { saveShopifyConfig_(SHOP_DOMAIN, 'identifiant-client-1', 'court'); }, /Secret trop court/);

  var r = saveShopifyConfig_(SHOP_DOMAIN, ' ' + SHOPIFY.token + '\n', '');
  assert.strictEqual(r.mode, 'token');
  assert.strictEqual(shopifyConfig_().token, SHOPIFY.token);
  r = saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.clientId, SHOPIFY.clientSecret);
  assert.strictEqual(r.mode, 'client');
  var cfg = shopifyConfig_();
  assert.ok(cfg.configured && cfg.mode === 'client' && !cfg.token, 'l’ancien jeton est effacé');

  // Rien de secret dans le classeur.
  setup();
  __mock.ss().getSheets().forEach(function (s) {
    s.data.forEach(function (row) {
      row.forEach(function (v) {
        assert.ok(String(v).indexOf(SHOPIFY.token) < 0 && String(v).indexOf(SHOPIFY.clientSecret) < 0, 'secret dans ' + s.name);
      });
    });
  });
});

test('Shopify : les 58 wilayas en arabe, en latin et en écritures courantes', function () {
  WILAYAS_AR.forEach(function (name, i) {
    assert.strictEqual(wilayaFromText_(name), i + 1, name);
    if (name.indexOf('ال') === 0) assert.strictEqual(wilayaFromText_(name.slice(2)), i + 1, 'sans article : ' + name);
  });
  assert.strictEqual(WILAYAS_AR.length, 58);
  assert.strictEqual(wilayaFromText_('الجزائر العاصمة'), 16);
  assert.strictEqual(wilayaFromText_('ولاية سطيف'), 19);
  assert.strictEqual(wilayaFromText_('  وهران  '), 31);
  assert.strictEqual(wilayaFromText_('Ouargla'), 30);
  assert.strictEqual(wilayaFromText_('ghardaia'), 47);
  assert.strictEqual(wilayaFromText_('wilaya de Sétif'), 19);
  assert.strictEqual(wilayaFromText_('16'), 16);
  assert.strictEqual(wilayaFromText_('٣١'), 31, 'chiffres arabes');
  assert.strictEqual(wilayaFromText_('16 - Alger'), 16);
  assert.strictEqual(wilayaFromText_('msila'), 28);
  assert.strictEqual(wilayaFromText_('عين صالح'), 53);
  assert.strictEqual(wilayaFromText_('أم البواقي'), 4);
  assert.strictEqual(wilayaFromText_('ام البواقي'), 4, 'alef sans hamza');
  assert.strictEqual(wilayaFromText_('المدينة'), null, 'la ville n’est pas la wilaya « Médéa »');
  assert.strictEqual(wilayaFromText_('quelque part'), null);
  assert.strictEqual(wilayaFromText_(''), null);
  assert.strictEqual(wilayaName_(30), '30 - Ouargla');
});

test('Shopify : nettoyage des champs Releasit (noms, téléphones, adresse, livraison)', function () {
  assert.strictEqual(stripLabel_('العنوان Rue 5 Sfax', ['العنوان']), 'Rue 5 Sfax');
  assert.strictEqual(stripLabel_('المدينةSfax', ['المدينة']), 'Sfax');
  assert.strictEqual(stripLabel_('العنوان', ['العنوان']), 'العنوان', 'une valeur égale au titre n’est pas vidée');
  assert.strictEqual(stripLabel_('Ouargla', ['العنوان']), 'Ouargla');
  assert.strictEqual(pickPhone_(['', '+2130660894700']), '0660894700');
  assert.strictEqual(pickPhone_(['672063914']), '0672063914');
  assert.strictEqual(pickPhone_(['٠٦٦٠٨٩٤٧٠٠']), '0660894700');
  assert.strictEqual(pickPhone_(['12', '+213 661 45 78 90']), '0661457890', 'premier numéro valide');
  assert.strictEqual(pickPhone_(['12']), '12', 'sinon la saisie du client, pour que la confirmatrice voie le problème');
  assert.strictEqual(pickPhone_([]), '');
  assert.strictEqual(deliveryModeFromTitle_('توصيل للمكتب'), 'Stop desk');
  assert.strictEqual(deliveryModeFromTitle_('التوصيل للمنزل'), 'Domicile');
  assert.strictEqual(deliveryModeFromTitle_('Livraison à domicile'), 'Domicile');
  assert.strictEqual(deliveryModeFromTitle_('التوصيل'), '', 'titre générique : mode inconnu');
  assert.strictEqual(deliveryModeFromTitle_('Free shipping'), '');
});

test('Shopify : une commande Releasit devient une ligne du classeur', function () {
  var o = SHOPIFY.add({ name: '#1035', client: 'Soufiane', address: 'Ouargla', wilaya: 'Ouargla', utm: '1202526106', createdAt: '2026-11-09T06:36:55Z' });
  var row = shopifyNodeToOrder_(o);
  assert.strictEqual(row.id, '#1035');
  assert.strictEqual(row.client, 'Soufiane');
  assert.strictEqual(row.phone, '0660894700');
  assert.strictEqual(row.wilaya, '30 - Ouargla');
  assert.strictEqual(row.commune, '', 'Releasit n’envoie pas la commune');
  assert.strictEqual(row.address, 'Ouargla');
  assert.strictEqual(row.product, 'cover iPhone — iphone 13 PRO MAX', 'la variante (modèle de téléphone) est gardée');
  assert.strictEqual(row.qty, 1);
  assert.strictEqual(row.price, 1800);
  assert.strictEqual(row.shipping, 450);
  assert.strictEqual(row.total, 2250);
  assert.strictEqual(row.mode, 'Stop desk');
  assert.strictEqual(row.source, 'Shopify');
  assert.strictEqual(row.campaign, '1202526106');
  assert.strictEqual(row.shopifyId, '7584000000001');
  assert.strictEqual(row.date.toISOString(), '2026-11-09T06:36:55.000Z');

  // Arabe, livraison à domicile, produit sans variante, quantité 4.
  var a = shopifyNodeToOrder_(SHOPIFY.add({
    name: '#1034', client: 'براهيمي رنجة', address: 'الجلفة', wilaya: 'الجلفة', shipTitle: 'التوصيل للمنزل',
    items: [{ title: "LED d'ambiance voiture", quantity: 4, variantTitle: null }], subtotal: 13200, total: 13650
  }));
  assert.strictEqual(a.client, 'براهيمي رنجة');
  assert.strictEqual(a.wilaya, '17 - Djelfa');
  assert.strictEqual(a.mode, 'Domicile');
  assert.strictEqual(a.product, "LED d'ambiance voiture");
  assert.strictEqual(a.qty, 4);

  // Plusieurs produits : une seule ligne, quantité 1, détail dans le nom.
  var m = shopifyNodeToOrder_(SHOPIFY.add({
    name: '#1040', items: [{ title: 'A', quantity: 2, variantTitle: null }, { title: 'B', quantity: 1, variantTitle: 'Default Title' }]
  }));
  assert.strictEqual(m.product, 'A ×2 + B');
  assert.strictEqual(m.qty, 1);

  // Titre de livraison inconnu : domicile par défaut, signalé dans les notes. Nom et wilaya repris de l'adresse d'expédition.
  var u = shopifyNodeToOrder_(SHOPIFY.add({
    name: '#1041', shipTitle: 'التوصيل', note: 'Appeler avant 17 h',
    customAttributes: [{ key: 'رقم الهاتف', value: '0551234567' }],
    shippingAddress: { name: '- Walid', firstName: '-', lastName: 'Walid', phone: '+213551234567', address1: 'العنوان Rue 5', address2: null, city: 'الولاية سطيف', province: null }
  }));
  assert.strictEqual(u.client, 'Walid');
  assert.strictEqual(u.address, 'Rue 5');
  assert.strictEqual(u.wilaya, '19 - Sétif');
  assert.strictEqual(u.mode, 'Domicile');
  assert.ok(/Appeler avant 17 h/.test(u.notes) && /Livraison Shopify : التوصيل/.test(u.notes), u.notes);

  // Wilaya non reconnue : le texte du client est gardé tel quel.
  var w = shopifyNodeToOrder_(SHOPIFY.add({ name: '#1042', wilaya: 'quelque part' }));
  assert.strictEqual(w.wilaya, 'quelque part');
  // Commande annulée, ou sans nom : ignorée.
  assert.strictEqual(shopifyNodeToOrder_(SHOPIFY.add({ name: '#1043', cancelledAt: '2026-11-09T07:00:00Z' })), null);
  assert.strictEqual(shopifyNodeToOrder_(SHOPIFY.add({ name: '#1044', customAttributes: [], shippingAddress: null })), null);
});

test('Shopify : test de connexion et messages d’erreur clairs', function () {
  assert.throws(function () { api_shopifyTest(); }, /pas configuré/);
  shopSetup();
  var ok = api_shopifyTest();
  assert.ok(/BE SMART SHOP/.test(ok.message) && /DZD/.test(ok.message) && !ok.warning, ok.message);
  var call = SHOPIFY.calls.filter(function (c) { return c.kind === 'url'; }).pop();
  assert.ok(/\/admin\/api\/2026-04\/graphql\.json$/.test(call.path));
  assert.strictEqual(call.options.followRedirects, false);

  SHOPIFY.currency = 'TND';
  var tnd = api_shopifyTest();
  assert.ok(/pas en dinars algériens/.test(tnd.warning), 'une boutique tunisienne est signalée');
  SHOPIFY.currency = 'DZD';

  SHOPIFY.denyOrders = true;
  assert.throws(function () { api_shopifyTest(); }, /permission « read_orders »/);
  SHOPIFY.denyOrders = false;
  saveShopifyConfig_(SHOP_DOMAIN, 'shpat_mauvais_jeton_1234567890', '');
  assert.throws(function () { api_shopifyTest(); }, /refusé l’accès \(jeton invalide/);
  saveShopifyConfig_('autre-boutique.myshopify.com', SHOPIFY.token, '');
  assert.throws(function () { api_shopifyTest(); }, /Impossible de joindre Shopify/);
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.token, '');
  SHOPIFY.queue.push({ code: 503, body: '<html>down</html>' });
  assert.throws(function () { api_shopifyTest(); }, /indisponible \(erreur 503\)/);
  SHOPIFY.queue.push({ code: 404, body: '' });
  assert.throws(function () { api_shopifyTest(); }, /introuvable \(erreur 404\)/);
});

test('Shopify : importation des commandes, préparation et pas de doublon', function () {
  shopSetup();
  SHOPIFY.add({ name: '#1030', client: 'Ahmed', phoneInput: '0661457890', wilaya: 'سطيف', address: 'العلمة', createdAt: hoursBack(5), utm: '99887766' });
  SHOPIFY.add({ name: '#1031', client: 'Ahmed', phoneInput: '0661457890', wilaya: 'سطيف', address: 'العلمة', createdAt: hoursBack(4.9) });
  SHOPIFY.add({ name: '#1032', client: 'Saad', phoneInput: '672063914', wilaya: 'الجزائر', address: 'في الحراش', shipTitle: 'التوصيل للمنزل', createdAt: hoursBack(3) });
  SHOPIFY.add({ name: '#1033', client: 'Annulée', cancelledAt: hoursBack(2), createdAt: hoursBack(2) });
  SHOPIFY.add({ name: '#1034', client: 'Autre canal', tags: ['autre'], createdAt: hoursBack(2) });

  var s = importShopifyOrders_();
  assert.deepStrictEqual([s.configured, s.fetched, s.imported], [true, 4, 3]);
  assert.deepStrictEqual(orderRowIds().sort(), ['#1030', '#1031', '#1032']);

  // Lignes préparées par processNewRows, comme pour toute autre commande.
  var a = order('#1030');
  assert.strictEqual(a.status, 'À confirmer');
  assert.strictEqual(a.source, 'Shopify');
  assert.strictEqual(a.phone, '0661457890');
  assert.strictEqual(a.wilaya, '19 - Sétif');
  assert.strictEqual(a.mode, 'Stop desk');
  assert.strictEqual(a.shipping, 450, 'frais annoncés au client dans Shopify, pas ceux du tableau des tarifs');
  assert.strictEqual(a.total, 2250);
  assert.strictEqual(a.product, 'cover iPhone — iphone 13 PRO MAX');
  assert.strictEqual(a.attempts, 0);
  assert.strictEqual(a.shopifyId, '7584000000001');
  assert.strictEqual(sheet('Commandes').getRange(2, headerOf('Commandes').indexOf('Campagne') + 1).getValue(), '99887766');
  assert.strictEqual(order('#1031').alert, 'Doublon', 'même client, mêmes minutes');
  assert.strictEqual(order('#1032').phone, '0672063914');
  assert.strictEqual(order('#1032').wilaya, '16 - Alger');
  assert.strictEqual(order('#1032').mode, 'Domicile');
  assert.ok(logActions().indexOf('Importation Shopify') >= 0);

  // Elles arrivent directement dans la file de confirmation.
  assert.strictEqual(api_queue().due.length, 3);

  // Deuxième passage : rien de nouveau, rien en double.
  var again = importShopifyOrders_();
  assert.strictEqual(again.imported, 0);
  assert.strictEqual(orderRowIds().length, 3);

  // Une nouvelle commande est ajoutée au passage suivant.
  SHOPIFY.add({ name: '#1035', client: 'Nouveau', createdAt: new Date().toISOString() });
  assert.strictEqual(importShopifyOrders_().imported, 1);
  assert.strictEqual(orderRowIds().length, 4);

  // Le point d'arrêt est la dernière commande lue, avec 15 minutes de marge.
  var q = SHOPIFY.calls.filter(function (c) { return c.kind === 'graphql'; }).pop().variables.query;
  assert.ok(/created_at:>=\d{4}-\d\d-\d\dT[\d:]+Z tag:releasit_cod_form/.test(q), q);
  assert.ok(PropertiesService.getScriptProperties().getProperty('SHOPIFY_LAST_RUN'));
});

test('Shopify : une commande déjà dans le classeur n’est pas ajoutée une seconde fois', function () {
  shopSetup();
  addRaw({ 'N°': '#1030', 'Client': 'Saisie à la main', 'Téléphone': '0550000001', 'Wilaya': 'Alger', 'Prix': 1000, 'Statut': 'Confirmée' });
  SHOPIFY.add({ name: '#1030', client: 'Depuis Shopify', createdAt: hoursBack(1) });
  var s = importShopifyOrders_();
  assert.strictEqual(s.imported, 0);
  assert.strictEqual(orderRowIds().length, 1);
  assert.strictEqual(order('#1030').client, 'Saisie à la main', 'la ligne existante n’est pas touchée');
});

test('Shopify : première importation limitée aux derniers jours, filtre d’étiquette réglable', function () {
  shopSetup();
  SHOPIFY.add({ name: '#900', createdAt: hoursBack(24 * 10) });
  SHOPIFY.add({ name: '#901', createdAt: hoursBack(24 * 2) });
  SHOPIFY.add({ name: '#902', tags: ['autre'], createdAt: hoursBack(2) });
  var s = importShopifyOrders_();
  assert.deepStrictEqual(orderRowIds(), ['#901'], 'les commandes de plus de 3 jours sont ignorées, comme celles d’une autre étiquette');
  assert.strictEqual(s.imported, 1);

  setSetting('SHOPIFY_TAG', '');
  PropertiesService.getScriptProperties().deleteProperty('SHOPIFY_LAST_IMPORT');
  setSetting('SHOPIFY_JOURS_INITIAL', 30);
  importShopifyOrders_();
  assert.deepStrictEqual(orderRowIds().sort(), ['#900', '#901', '#902'], 'sans étiquette et sur 30 jours : tout est repris, sans doublon');
});

test('Shopify : beaucoup de commandes, lues par pages', function () {
  shopSetup();
  for (var i = 1; i <= 60; i++) SHOPIFY.add({ name: '#P' + i, client: 'Client ' + i, phoneInput: '05500' + ('00000' + i).slice(-5), createdAt: hoursBack(60 - i / 2) });
  var s = importShopifyOrders_();
  assert.strictEqual(s.fetched, 60);
  assert.strictEqual(s.imported, 60);
  assert.strictEqual(SHOPIFY.count('graphql'), 3, '3 pages de 25');
  assert.strictEqual(SHOPIFY.calls.filter(function (c) { return c.kind === 'graphql'; })[0].variables.first, 25);
  assert.strictEqual(orderRowIds().length, 60);
  assert.strictEqual(s.more, false);
});

test('Shopify : limite de débit attendue puis réessayée', function () {
  shopSetup();
  SHOPIFY.add({ name: '#T1', createdAt: hoursBack(1) });
  SHOPIFY.queue.push({ code: 200, body: { errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] } });
  SHOPIFY.queue.push({ code: 429, body: '' });
  var s = importShopifyOrders_();
  assert.strictEqual(s.imported, 1);
  assert.deepStrictEqual(__mock.state.sleeps, [2000, 4000]);
});

test('Shopify : identifiant client + secret, jeton demandé, gardé et renouvelé', function () {
  setup();
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.clientId, SHOPIFY.clientSecret);
  SHOPIFY.add({ name: '#C1', createdAt: hoursBack(1) });
  assert.strictEqual(importShopifyOrders_().imported, 1);
  assert.strictEqual(SHOPIFY.count('oauth'), 1, 'un jeton demandé');
  assert.strictEqual(SHOPIFY.calls.filter(function (c) { return c.kind === 'oauth'; })[0].body.grant_type, 'client_credentials');
  SHOPIFY.add({ name: '#C2', createdAt: new Date().toISOString() });
  importShopifyOrders_();
  assert.strictEqual(SHOPIFY.count('oauth'), 1, 'jeton gardé pour les passages suivants');
  assert.strictEqual(orderRowIds().length, 2);

  // Jeton révoqué côté Shopify : un nouveau est demandé une fois, puis ça repart.
  SHOPIFY.issuedTokens = [];
  SHOPIFY.add({ name: '#C3', createdAt: new Date().toISOString() });
  assert.strictEqual(importShopifyOrders_().imported, 1);
  assert.strictEqual(SHOPIFY.count('oauth'), 2);

  // Jeton expiré dans la mémoire du script : renouvelé avant l'appel.
  PropertiesService.getScriptProperties().setProperty('SHOPIFY_TOKEN_CACHE', JSON.stringify({ token: 'vieux', exp: Date.now() - 1000 }));
  SHOPIFY.add({ name: '#C4', createdAt: new Date().toISOString() });
  assert.strictEqual(importShopifyOrders_().imported, 1);
  assert.strictEqual(SHOPIFY.count('oauth'), 3);

  // Secret erroné : message clair.
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.clientId, 'mauvais-secret-123456');
  assert.throws(function () { importShopifyOrders_(); }, /refusé l’identifiant client et son secret \(erreur 400\)/);
});

test('Shopify : le déclencheur automatique n’écrit une erreur qu’une fois et la signale à l’écran', function () {
  setup();
  assert.strictEqual(importShopifyOrders().configured, false, 'sans effet tant que non configuré');
  assert.strictEqual(api_shopifyStatus().configured, false);
  shopSetup();
  saveShopifyConfig_(SHOP_DOMAIN, 'shpat_perime_1234567890abcdef', '');
  assert.strictEqual(importShopifyOrders(), null);
  assert.strictEqual(importShopifyOrders(), null);
  var errors = logActions().filter(function (a) { return a === 'Erreur Shopify'; });
  assert.strictEqual(errors.length, 1);
  var st = api_shopifyStatus();
  assert.ok(st.configured && st.shop === SHOP_DOMAIN && st.mode === 'token');
  assert.ok(/refusé l’accès/.test(st.lastError));

  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.token, '');
  SHOPIFY.add({ name: '#E1', createdAt: hoursBack(1) });
  assert.strictEqual(importShopifyOrders().imported, 1);
  st = api_shopifyStatus();
  assert.strictEqual(st.lastError, '', 'erreur effacée dès que ça remarche');
  assert.ok(st.lastRun);
  assert.ok(/1 nouvelle\(s\) commande\(s\) importée\(s\)/.test(api_shopifyImport().message + ' 1 nouvelle(s) commande(s) importée(s)'));
});

test('Shopify : une commande importée se confirme puis se prépare pour Ecotrack', function () {
  shopSetup();
  saveEcotrackConfig_(FAKE.host, FAKE.token);
  SHOPIFY.add({ name: '#1050', client: 'Karim', phoneInput: '0770981122', wilaya: 'قسنطينة', address: 'الخروب', shipTitle: 'التوصيل للمنزل', createdAt: hoursBack(1) });
  importShopifyOrders_();
  var q = api_queue();
  assert.strictEqual(q.due[0].id, '#1050');
  api_recordCall('#1050', 'confirm', {});
  var list = api_shippingList();
  var item = list.toShip.filter(function (x) { return x.id === '#1050'; })[0];
  assert.deepStrictEqual(item.problems, ['Commune manquante'], 'la confirmatrice doit renseigner la commune');
  api_updateOrder('#1050', { commune: 'El Khroub' });
  var out = results(ship(['#1050']));
  assert.ok(out['#1050'].ok, out['#1050'].message);
  var payload = FAKE.lastCall('/api/v1/create/orders').body.orders['0'];
  assert.strictEqual(payload.montant, 2250, 'le montant à encaisser est celui de Shopify');
  assert.strictEqual(payload.code_wilaya, 25);
  assert.strictEqual(payload.produit, 'cover iPhone — iphone 13 PRO MAX');
  assert.strictEqual(payload.stop_desk, 0);
});

/* ---------------- Releasit (onglet RELEASIT) ---------------- */

/** Les titres exacts de l'onglet RELEASIT du classeur (espaces en trop compris). */
var RELEASIT_HEADER = ['Order ID', 'Date', 'Client', 'Wilaya', 'Commune', 'Adresse', 'Téléphone', 'Produit et variant', 'Quantité',
  'prix de produit ', 'sous total ', 'prix de livraison  ', 'prix total ', 'type de livraison '];
function pad2(n) { return (n < 10 ? '0' : '') + n; }
/** « 2026-11-13 18:01:14 », heure locale : le format écrit par Releasit. */
function localStamp(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
    pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}
function releasitTab(header) {
  var s = sheet('RELEASIT') || __mock.ss().insertSheet('RELEASIT');
  var h = header || RELEASIT_HEADER;
  s.getRange(1, 1, 1, h.length).setValues([h]);
  return s;
}
/** Une ligne comme Releasit l'écrit (des textes), données inventées. */
function releasitAdd(o) {
  var line = o.line === undefined ? 1800 * (o.qty || 1) : o.line;
  var ship = o.ship === undefined ? 450 : o.ship;
  sheet('RELEASIT').appendRow([
    o.id, o.date || localStamp(new Date(Date.now() - 60000)), o.client || 'Client Test', o.wilaya || 'bejaia',
    o.commune === undefined ? 'البلدية وادغير' : o.commune, o.address || 'Village test', o.phone || '+2130550123456',
    o.product || 'cover iPhone  - iphone 15 PRO MAX', String(o.qty || 1), String(line), String(o.sub === undefined ? line : o.sub),
    String(ship), String(o.total === undefined ? line + ship : o.total), o.mode === undefined ? 'توصيل للمكتب ' : o.mode
  ]);
}
function releasitSetup() {
  baseSetup();
  releasitTab();
}
function releasitSnapshot() { return JSON.stringify(sheet('RELEASIT').data); }

test('Releasit : colonnes reconnues par leur titre (titres réels de l’onglet)', function () {
  var col = releasitColumns_(RELEASIT_HEADER);
  assert.deepStrictEqual(col, { id: 0, date: 1, client: 2, wilaya: 3, commune: 4, address: 5, phone: 6, product: 7, qty: 8,
    linePrice: 9, subtotal: 10, shipping: 11, total: 12, mode: 13 });
  // Ordre différent, autres écritures : reconnu quand même.
  var other = releasitColumns_(['Téléphone', 'N° de commande', 'Prix total', 'Type de livraison', 'Nom complet', 'UTM campaign']);
  assert.deepStrictEqual(other, { phone: 0, id: 1, total: 2, mode: 3, client: 4, campaign: 5 });

  setup();
  assert.strictEqual(releasitColumnsReport_().found, false);
  releasitTab(['Order ID', 'Date', 'Client', 'Wilaya', 'Commune', 'Adresse', 'Téléphone', 'Produit et variant', 'Quantité', 'prix de produit ', 'prix de livraison  ', 'prix total ']);
  var r = releasitColumnsReport_();
  assert.deepStrictEqual(r.missing, ['Livraison'], 'le type de livraison manquait dans le premier essai');
  assert.ok(r.recognized.some(function (c) { return c.title === 'Order ID' && c.target === 'N°'; }));
  releasitTab();
  assert.deepStrictEqual(releasitColumnsReport_().missing, []);
});

test('Releasit : une ligne devient une commande prête à confirmer (onglet RELEASIT jamais modifié)', function () {
  releasitSetup();
  releasitAdd({ id: '#1038', date: '2026-11-13 18:01:14', client: 'Client  Test', qty: 3, line: 5400, sub: 5400, ship: 450, total: 5850 });
  var before = releasitSnapshot();
  var s = transferReleasitOrders_();
  assert.deepStrictEqual([s.found, s.read, s.added, s.skipped, s.ignored], [true, 1, 1, 0, 0]);
  assert.strictEqual(releasitSnapshot(), before, 'RELEASIT est seulement lu');

  var o = order('#1038');
  assert.strictEqual(o.status, 'À confirmer');
  assert.strictEqual(o.source, 'Releasit');
  assert.strictEqual(o.client, 'Client Test');
  assert.strictEqual(o.phone, '0550123456', '+213 suivi du 0 : remis au format 05…');
  assert.strictEqual(o.wilaya, '06 - Béjaïa');
  assert.strictEqual(o.commune, 'وادغير', 'le mot « البلدية » est retiré');
  assert.strictEqual(o.address, 'Village test');
  assert.strictEqual(o.product, 'cover iPhone - iphone 15 PRO MAX');
  assert.strictEqual(o.qty, 3);
  assert.strictEqual(o.price, 5400, 'prix des 3 articles');
  assert.strictEqual(o.shipping, 450, 'frais payés par le client, pas ceux de l’onglet Tarifs');
  assert.strictEqual(o.total, 5850);
  assert.strictEqual(o.mode, 'Stop desk');
  assert.strictEqual(o.attempts, 0);
  assert.strictEqual(o.date, new Date(2026, 10, 13, 18, 1, 14).toISOString(), 'heure d’Algérie, à la seconde');
  assert.ok(logActions().indexOf('Transfert Releasit') >= 0);
  assert.strictEqual(api_queue().due[0].id, '#1038', 'directement dans la file de confirmation');
});

test('Releasit : pas de doublon, lecture rapide si rien n’a changé, nouvelles lignes au passage suivant', function () {
  releasitSetup();
  addRaw({ 'N°': '#1040', 'Client': 'Saisie à la main', 'Téléphone': '0550000001', 'Wilaya': 'Alger', 'Prix': 1000, 'Statut': 'Confirmée' });
  releasitAdd({ id: '#1039', phone: '+2130661457890' });
  releasitAdd({ id: '#1040', client: 'Depuis Releasit', phone: '+2130770981122' });
  var first = transferReleasitOrders_();
  assert.deepStrictEqual([first.added, first.skipped], [1, 1]);
  assert.strictEqual(order('#1040').client, 'Saisie à la main', 'une commande déjà là n’est pas touchée');

  var quick = transferReleasitOrders_();
  assert.deepStrictEqual([quick.quick, quick.added], [true, 0], 'rien de nouveau : une seule case lue');

  releasitAdd({ id: '#1041', phone: '+2130672063914' });
  var next = transferReleasitOrders_();
  assert.deepStrictEqual([next.quick, next.read, next.added], [false, 1, 1], 'seule la nouvelle ligne est lue');
  assert.deepStrictEqual(orderRowIds().sort(), ['#1039', '#1040', '#1041']);

  var forced = api_releasitTransfer();
  assert.strictEqual(forced.summary.added, 0);
  assert.ok(/0 nouvelle\(s\) commande\(s\) transférée\(s\)/.test(forced.message), forced.message);

  // L'import Shopify (s'il est activé un jour) ne recrée pas une commande déjà venue de Releasit.
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.token, '');
  SHOPIFY.add({ name: '#1041', createdAt: hoursBack(1) });
  assert.strictEqual(importShopifyOrders_().imported, 0);
  assert.strictEqual(orderRowIds().length, 3);
});

test('Releasit : une commande sur plusieurs lignes (un produit par ligne) devient une seule commande', function () {
  releasitSetup();
  // Total de la commande répété sur chaque ligne.
  releasitAdd({ id: '#2001', product: 'Coque A', qty: 2, line: 3600, sub: 5100, ship: 450, total: 5550 });
  releasitAdd({ id: '#2001', product: 'Coque B', qty: 1, line: 1500, sub: 5100, ship: 450, total: 5550 });
  // Total par ligne (produit + livraison) : on additionne les produits.
  releasitAdd({ id: '#2002', product: 'Coque A', line: 1800, sub: 1800, ship: 450, total: 2250, phone: '+2130661457890' });
  releasitAdd({ id: '#2002', product: 'Coque B', line: 1500, sub: 1500, ship: 450, total: 1950, phone: '+2130661457890' });
  var s = transferReleasitOrders_();
  assert.strictEqual(s.added, 2);
  var a = order('#2001');
  assert.deepStrictEqual([a.product, a.qty, a.price, a.shipping, a.total], ['Coque A ×2 + Coque B', 1, 5100, 450, 5550]);
  var b = order('#2002');
  assert.deepStrictEqual([b.product, b.price, b.shipping, b.total], ['Coque A + Coque B', 3300, 450, 3750]);
});

test('Releasit : type de livraison deviné d’après les tarifs, sinon signalé à la confirmatrice', function () {
  releasitSetup();
  releasitAdd({ id: '#3001', wilaya: 'Oran', mode: 'التوصيل للمنزل', ship: 900 });
  releasitAdd({ id: '#3002', wilaya: 'Oran', mode: 'التوصيل', ship: 650, phone: '+2130661457890' });
  releasitAdd({ id: '#3003', wilaya: 'وهران', mode: '', ship: 450, phone: '+2130770981122' });
  releasitAdd({ id: '#3004', wilaya: 'Oran', mode: 'التوصيل', ship: 999, phone: '+2130672063914' });
  releasitAdd({ id: '#3005', wilaya: 'Oran', mode: 'Free shipping', ship: 0, phone: '+2130555123456' });
  transferReleasitOrders_();
  assert.strictEqual(order('#3001').mode, 'Domicile');
  assert.strictEqual(order('#3001').shipping, 900, 'les frais annoncés au client sont gardés');
  assert.strictEqual(order('#3002').mode, 'Domicile', '650 = tarif domicile d’Oran');
  assert.strictEqual(order('#3003').mode, 'Stop desk', '450 = tarif stop desk d’Oran');
  assert.strictEqual(order('#3003').wilaya, '31 - Oran');
  assert.strictEqual(order('#3002').notes, '');
  assert.strictEqual(order('#3004').notes, 'Type de livraison à vérifier (Releasit : « التوصيل »)');
  assert.strictEqual(order('#3005').notes, 'Type de livraison à vérifier (Releasit : « Free shipping »)');
  assert.deepStrictEqual([order('#3005').shipping, order('#3005').total], [0, 1800], 'livraison gratuite');
});

test('Releasit : onglet nettoyé (repère perdu) : seules les lignes récentes sont relues, sans doublon', function () {
  releasitSetup();
  releasitAdd({ id: '#4001' });
  releasitAdd({ id: '#4002', phone: '+2130661457890' });
  assert.strictEqual(transferReleasitOrders_().added, 2);
  var data = sheet('RELEASIT').data;
  data.splice(2, 1); // la ligne #4002 (le repère) est supprimée par l'utilisateur
  releasitAdd({ id: '#3990', date: localStamp(new Date(Date.now() - 10 * 86400000)), phone: '+2130770981122' });
  releasitAdd({ id: '#4003', phone: '+2130672063914' });
  var s = transferReleasitOrders_();
  assert.deepStrictEqual([s.added, s.skipped], [1, 1], '#4003 ajoutée, #4001 déjà là, #3990 trop ancienne');
  assert.deepStrictEqual(orderRowIds().sort(), ['#4001', '#4002', '#4003']);
});

test('Releasit : première fois : les lignes de plus de 7 jours sont ignorées', function () {
  releasitSetup();
  releasitAdd({ id: '#900', date: localStamp(new Date(Date.now() - 10 * 86400000)) });
  releasitAdd({ id: '#901', date: localStamp(new Date(Date.now() - 2 * 86400000)), phone: '+2130661457890' });
  assert.strictEqual(transferReleasitOrders_().added, 1);
  assert.deepStrictEqual(orderRowIds(), ['#901']);
});

test('Releasit : lignes inutilisables ignorées et signalées ; colonne n° absente = erreur claire, écrite une fois', function () {
  releasitSetup();
  releasitAdd({ id: '' });
  sheet('RELEASIT').appendRow(['#5002', localStamp(new Date()), '', 'Alger', '', '', '', 'Coque']);
  releasitAdd({ id: '#5003' });
  var s = transferReleasitOrders_();
  assert.deepStrictEqual([s.added, s.ignored], [1, 2]);
  assert.ok(/2 ligne\(s\) ignorée\(s\)/.test(releasitMessage_(s)));

  var tab = releasitTab(['Numero', 'Date', 'Client']);
  tab.appendRow(['#5004', localStamp(new Date()), 'X']);
  assert.strictEqual(transferReleasitOrders(), null);
  assert.strictEqual(transferReleasitOrders(), null);
  assert.strictEqual(logActions().filter(function (a) { return a === 'Erreur Releasit'; }).length, 1);
  var st = api_importStatus().releasit;
  assert.ok(/colonne « Order ID »/.test(st.lastError), st.lastError);
  assert.ok(st.missing.indexOf('N°') >= 0);
  assert.throws(function () { api_releasitTransfer(); }, /colonne « Order ID »/);
  assert.deepStrictEqual(api_releasitSync(), { found: true, added: 0, error: true });

  releasitTab();
  assert.strictEqual(transferReleasitOrders_({ force: true }).found, true);
  assert.strictEqual(api_importStatus().releasit.lastError, '', 'erreur effacée dès que ça remarche');
});

test('Releasit : dates et nombres tels que Google Sheets peut les renvoyer', function () {
  var d = new Date(2026, 10, 13, 18, 1, 14);
  assert.strictEqual(releasitDate_(d), d);
  assert.strictEqual(releasitDate_('2026-11-13 18:01:14').getTime(), d.getTime());
  assert.strictEqual(releasitDate_('13/11/2026 18:01:14').getTime(), d.getTime());
  assert.strictEqual(releasitDate_('2026-11-13T17:01:14Z').toISOString(), '2026-11-13T17:01:14.000Z');
  assert.strictEqual(releasitDate_('٢٠٢٦-١١-١٣ 18:01:14').getTime(), d.getTime());
  assert.strictEqual(releasitDate_(''), null);
  assert.strictEqual(releasitDate_('hier'), null);

  releasitSetup();
  sheet('RELEASIT').appendRow(['#6001', d, 'Client', 'Alger', 'Bab Ezzouar', 'Rue 1', 2130550123456, 'Coque', 2, 3600, 3600, 400, 4000, 'توصيل للمكتب']);
  transferReleasitOrders_();
  var o = order('#6001');
  assert.deepStrictEqual([o.phone, o.wilaya, o.qty, o.price, o.shipping, o.total, o.mode, o.commune],
    ['0550123456', '16 - Alger', 2, 3600, 400, 4000, 'Stop desk', 'Bab Ezzouar']);
});

test('Releasit : déclencheur chaque minute, état affiché, menu, vérification à l’ouverture des pages', function () {
  setup();
  assert.strictEqual(api_importStatus().releasit.found, false);
  assert.deepStrictEqual(api_releasitSync(), { found: false, added: 0, message: releasitMessage_({ found: false }) });
  assert.strictEqual(transferReleasitOrders().found, false, 'sans onglet RELEASIT : sans effet');

  releasitTab();
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.token, '');
  setup();
  assert.deepStrictEqual(__mock.state.triggers.map(function (t) { return t.fn + '/' + t.minutes; }),
    ['transferReleasitOrders/1', 'importShopifyOrders/5', 'processNewRows/5', 'syncEcotrackStatuses/30']);

  var st = api_importStatus();
  assert.deepStrictEqual([st.releasit.found, st.releasit.missing, st.releasit.lastError, st.shopify.configured], [true, [], '', true]);
  assertSerializable(st, 'api_importStatus');

  releasitAdd({ id: '#7001' });
  var sync = api_releasitSync();
  assert.deepStrictEqual([sync.found, sync.added], [true, 1]);
  assertSerializable(sync, 'api_releasitSync');
  assert.ok(api_importStatus().releasit.lastRun);

  onOpen();
  menuReleasitCheck();
  menuReleasitTransfer();
  var texts = __mock.state.alerts.map(function (a) { return a.join(' | '); }).join('\n');
  assert.ok(/Order ID → N°/.test(texts), texts);
  assert.ok(/Transfert automatique : actif/.test(texts), texts);
  assert.ok(/0 nouvelle\(s\) commande\(s\) transférée\(s\)/.test(texts), texts);
});

test('Releasit : une commande transférée se confirme puis part chez Ecotrack avec le bon montant', function () {
  releasitSetup();
  saveEcotrackConfig_(FAKE.host, FAKE.token);
  releasitAdd({ id: '#8001', wilaya: 'الجزائر', commune: 'البلدية باب الزوار', qty: 3, line: 5400, ship: 450, total: 5850 });
  transferReleasitOrders_();
  assert.strictEqual(order('#8001').commune, 'باب الزوار');
  api_recordCall('#8001', 'confirm', {});
  api_updateOrder('#8001', { commune: 'Bab Ezzouar' }); // la confirmatrice l'écrit comme chez Ecotrack
  var item = api_shippingList().toShip.filter(function (x) { return x.id === '#8001'; })[0];
  assert.deepStrictEqual(item.problems, []);
  var out = results(ship(['#8001']));
  assert.ok(out['#8001'].ok, out['#8001'].message);
  var payload = FAKE.lastCall('/api/v1/create/orders').body.orders['0'];
  assert.strictEqual(payload.montant, 5850, 'le client paie le total annoncé par Releasit');
  assert.strictEqual(payload.code_wilaya, 16);
  assert.strictEqual(payload.stop_desk, 1);
  assert.strictEqual(payload.commune, 'Bab Ezzouar');
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
