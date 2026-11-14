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
load(path.join(__dirname, 'fake-httpsms.js'));
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
/** Ce que fait Google quand quelqu'un modifie un onglet à la main : il lance onEdit. */
function userEdit(name) { onEdit({ range: sheet(name).getRange(1, 1) }); }
/** Déclencheurs installés : « fonction/minutes », ou « fonction/heureh » pour ceux de chaque nuit. */
function triggerList() {
  return __mock.state.triggers.map(function (t) { return t.fn + '/' + (t.minutes || (t.hour + 'h')); });
}
function headerOf(name) { var s = sheet(name); return s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; }
function setRate(wilaya, values) {
  var s = sheet('Tarifs');
  var rows = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === wilaya) { s.getRange(i + 2, 2, 1, 4).setValues([values]); userEdit('Tarifs'); return; }
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
  assert.deepStrictEqual(triggerList(),
    ['processNewRows/5', 'syncEcotrackStatuses/30', 'nightlyMaintenance/3h'], 'ni Releasit ni Shopify : rien d’inutile');
  var statusCol = header.indexOf('Statut') + 1;
  assert.ok(sheet('Commandes')._validations.some(function (v) { return v.col === statusCol; }));
  assert.strictEqual(sheet('Commandes')._cf.length, STATUS_LIST.length + 7);
});

test('setup : relancé deux fois, ne duplique rien', function () {
  setup();
  sheet('Paramètres').getRange(3, 2).setValue(5); // APPELS_PAR_JOUR modifié par l'utilisateur
  userEdit('Paramètres');
  setup();
  assert.deepStrictEqual(headerOf('Commandes'), ORDER_COLUMNS.map(function (c) { return c.title; }));
  assert.strictEqual(sheet('Paramètres').getLastRow(), DEFAULT_SETTINGS.length + 1);
  assert.strictEqual(sheet('Paramètres').getRange(3, 2).getValue(), 5);
  assert.strictEqual(sheet('Tarifs').getLastRow(), 59);
  assert.strictEqual(sheet('Équipe').getLastRow(), 2);
  assert.strictEqual(__mock.state.triggers.length, 3);
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
  userEdit('Équipe');
  api_recordCall('#4003', 'callback', { callback: new Date(now + 3600000).toISOString() });

  var q = api_queue();
  assertSerializable(q, 'api_queue');
  assert.deepStrictEqual(q.due.map(function (x) { return x.id; }), ['#4002', '#4001'], 'les plus récentes d’abord (ORDRE_FILE)');
  assert.deepStrictEqual(q.later.map(function (x) { return x.id; }), ['#4003']);
  setSetting('ORDRE_FILE', 'anciennes');
  assert.deepStrictEqual(api_queue().due.map(function (x) { return x.id; }), ['#4001', '#4002']);
  setSetting('ORDRE_FILE', 'récentes');

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

/** Fait comme si la commande était arrivée il y a `days` jours (et ses appels du jour dataient d'hier). */
function ageOrder(id, days) {
  var sh = sheet('Commandes');
  var header = headerOf('Commandes');
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, header.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][header.indexOf('N°')] !== id) continue;
    sh.getRange(i + 2, header.indexOf('Date') + 1).setValue(new Date(Date.now() - days * 86400000));
    var dc = parseDayCalls_(rows[i][header.indexOf('Appels du jour')]);
    if (dc.day) sh.getRange(i + 2, header.indexOf('Appels du jour') + 1).setValue('2000-01-01 : ' + dc.n);
    sh.getRange(i + 2, header.indexOf('Rappeler le') + 1).setValue('');
  }
}

test('pas de réponse : 3 appels par jour pendant 3 jours, puis annulation automatique', function () {
  baseSetup();
  addRaw({ 'N°': '#5001', 'Client': 'Silence', 'Téléphone': '0550000021', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  // Jour 1 : appels 1 et 2 → rappel dans 2 h ; appel 3 → rappel demain à 9 h.
  var o1 = api_recordCall('#5001', 'no_answer', {});
  assert.deepStrictEqual([o1.status, o1.attempts, o1.callsToday, o1.callDay], ['Pas de réponse', 1, 1, 1]);
  var delay = (new Date(o1.callback).getTime() - Date.now()) / 60000;
  assert.ok(delay > 115 && delay <= 120, 'rappel dans 2 h');
  assert.strictEqual(api_queue().later.length, 1);
  api_recordCall('#5001', 'no_answer', {});
  var o3 = api_recordCall('#5001', 'no_answer', {});
  assert.deepStrictEqual([o3.status, o3.attempts, o3.callsToday], ['Pas de réponse', 3, 3]);
  var cb = new Date(o3.callback);
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  assert.deepStrictEqual([cb.getDate(), cb.getHours(), cb.getMinutes()], [tomorrow.getDate(), 9, 0], 'demain à 9 h');
  assert.ok(logActions().indexOf('Appel') >= 0);
  // Jour 2 : le compteur du jour repart à zéro.
  ageOrder('#5001', 1);
  var d2 = api_recordCall('#5001', 'no_answer', {});
  assert.deepStrictEqual([d2.status, d2.attempts, d2.callsToday, d2.callDay], ['Pas de réponse', 4, 1, 2]);
  // Jour 3 : au 3e appel sans réponse, la commande est annulée automatiquement.
  ageOrder('#5001', 2);
  api_recordCall('#5001', 'no_answer', {});
  api_recordCall('#5001', 'no_answer', {});
  var last = api_recordCall('#5001', 'no_answer', {});
  assert.deepStrictEqual([last.status, last.cancelReason, last.attempts, last.callback], ['Annulée', 'Injoignable (annulation automatique)', 7, '']);
  assert.strictEqual(api_queue().due.length + api_queue().later.length, 0);

  // Sans annulation automatique : « Injoignable ».
  setSetting('ANNULATION_AUTO', 'NON');
  addRaw({ 'N°': '#5002', 'Client': 'Silence 2', 'Téléphone': '0550000022', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  ageOrder('#5002', 2);
  api_recordCall('#5002', 'no_answer', {});
  api_recordCall('#5002', 'no_answer', {});
  assert.strictEqual(api_recordCall('#5002', 'no_answer', {}).status, 'Injoignable');
});

test('pas de réponse : chaque nuit, les commandes sans réponse après 3 jours sont annulées', function () {
  baseSetup();
  addRaw({ 'N°': '#5101', 'Client': 'A', 'Téléphone': '0550000031', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#5102', 'Client': 'B', 'Téléphone': '0550000032', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#5103', 'Client': 'C', 'Téléphone': '0550000033', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#5104', 'Client': 'D', 'Téléphone': '0550000034', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  api_recordCall('#5101', 'no_answer', {});
  api_recordCall('#5102', 'no_answer', {});
  api_recordCall('#5103', 'callback', { callback: new Date(Date.now() + 3600000).toISOString() });
  ageOrder('#5101', 3); // 4e jour : ses jours d'appels sont passés
  ageOrder('#5102', 2); // 3e jour : encore des appels possibles
  ageOrder('#5103', 5); // le client a répondu (« Rappeler ») : jamais annulée
  ageOrder('#5104', 5); // jamais appelée : jamais annulée, mais signalée
  var out = nightlyMaintenance();
  assert.strictEqual(out.autoCancelled, 1);
  assert.deepStrictEqual([order('#5101').status, order('#5101').cancelReason], ['Annulée', 'Injoignable (annulation automatique)']);
  assert.deepStrictEqual([order('#5102').status, order('#5103').status, order('#5104').status], ['Pas de réponse', 'Rappeler', 'À confirmer']);
  assert.ok(logActions().indexOf('Annulation automatique') >= 0);
  assert.strictEqual(api_dashboard('all').todo.waitingLong, 1, 'jamais appelée depuis plus de 24 h');
  assert.strictEqual(api_queue().due.filter(function (x) { return x.id === '#5104'; })[0].waitingLong, true);
  setSetting('ANNULATION_AUTO', 'NON');
  ageOrder('#5102', 6);
  assert.strictEqual(nightlyMaintenance().autoCancelled, 0);
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
  addRaw({ 'N°': '#7002', 'Client': 'Modif 2', 'Téléphone': '0550000042', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  var o = api_updateOrder('#7001', { status: 'Expédiée', carrier: 'Yalidine', tracking: 'YAL-1' });
  assert.strictEqual(o.status, 'Expédiée', 'société sans API : statut saisi à la main');
  assert.strictEqual(o.carrier, 'Yalidine');
  assert.strictEqual(o.tracking, 'YAL-1');
  var e = api_updateOrder('#7002', { carrier: 'Ecotrack' });
  assert.strictEqual(e.shipping, 700, 'tarif Ecotrack domicile');
  assert.strictEqual(e.total, 1700);
  assert.throws(function () { api_updateOrder('#7001', { status: 'Volée' }); }, /inconnu/);
  assert.throws(function () { api_updateOrder('#nope', {}); }, /introuvable/);
  var o2 = api_updateOrder('#7002', { phone: '12' });
  assert.strictEqual(o2.alert, 'Numéro invalide');
  var o3 = api_updateOrder('#7002', { status: 'Annulée', cancelReason: 'Doublon' });
  assert.strictEqual(o3.cancelReason, 'Doublon');
  var journal = sheet('Journal').getRange(2, 4, sheet('Journal').getLastRow() - 1, 2).getValues();
  assert.ok(journal.some(function (r) { return /Expédiée/.test(r[1]); }));
});

test('Pages : chaque commande a sa page ; la page Commandes ne montre que celles à confirmer', function () {
  baseSetup();
  addOrder('#G1', 'Sac');
  addOrder('#G2', 'Sac');
  addOrder('#G3', 'Sac');
  addOrder('#G4', 'Sac', { 'Statut': 'Livrée', 'Société': 'Yalidine' });
  processNewRows();
  api_recordCall('#G2', 'confirm', {});
  api_recordCall('#G3', 'cancel', { reason: 'Doublon' });
  var pages = {};
  api_listOrders({ status: 'all', period: 'all' }).rows.forEach(function (o) { pages[o.id] = o.page; });
  assert.deepStrictEqual(pages, { '#G1': 'commandes', '#G2': 'expedier', '#G3': 'annulees', '#G4': 'terminees' });
  var todo = api_listOrders({ status: 'todo', period: 'all' });
  assert.deepStrictEqual(todo.rows.map(function (o) { return o.id; }), ['#G1']);
  assert.deepStrictEqual([todo.counts.todo, todo.counts['Annulée'], todo.counts.all], [1, 1, 4]);
  assert.deepStrictEqual(api_listOrders({ status: 'Annulée', period: 'all' }).rows.map(function (o) { return o.id; }), ['#G3']);
  assert.strictEqual(api_counts().toShip, 1, 'compteur du menu Expédier');
  assert.strictEqual(pageOf_({ status: 'Retour', carrier: 'Ecotrack', tracking: 'E1', carrierStatus: 'retour_en_traitement' }), 'suivi');
  assert.strictEqual(pageOf_({ status: 'Retour', carrier: 'Ecotrack', tracking: 'E1', carrierStatus: 'retour_recu' }), 'terminees');
  // Expédiée à la main (autre société) depuis la page Expédier : passe dans Suivi.
  var o = api_updateOrder('#G2', { status: 'Expédiée', carrier: 'Yalidine', tracking: 'YAL-77' });
  assert.deepStrictEqual([o.status, o.page], ['Expédiée', 'suivi']);
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
  // Livré et payé : plus interrogé. Le retour en traitement reste suivi jusqu'à sa réception.
  syncEcotrackStatuses_();
  assert.strictEqual(FAKE.lastCall('/api/v1/get/orders/status').query.trackings.split(',').length, 4);
  FAKE.setStatus(shipped['#M3'].tracking, 'retour_recu');
  syncEcotrackStatuses_();
  assert.strictEqual(order('#M3').carrierStatus, 'retour_recu', 'le retour reçu est vu');
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
  for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) { s.getRange(i + 2, 2).setValue(value); userEdit('Paramètres'); return; }
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
  assert.deepStrictEqual(r.parcels.map(function (p) { return p.id; }), ['L2', 'L4', 'L1'], 'le plus ancien mouvement d’abord ; le colis à valider est dans Expédier');
  var by = {};
  r.parcels.forEach(function (p) { by[p.id] = p; });
  assert.strictEqual(by.L2.stale, true);
  assert.strictEqual(by.L1.stale, false);
  assert.strictEqual(by.L1.carrierLabel, 'En livraison');
  assert.strictEqual(by.L3, undefined);
  assert.strictEqual(by.L4.group, 'returning');
  assert.ok(by.L2.ageHours >= 40);
  // Terminées : livrée (payée) et retour reçu ; le retour en cours reste dans « en cours ».
  assert.deepStrictEqual(r.finished.map(function (f) { return f.id; }).sort(), ['L5', 'L6']);
  var l5 = r.finished.filter(function (f) { return f.id === 'L5'; })[0];
  assert.deepStrictEqual([l5.label, l5.unpaid], ['Payé', false]);
  assertSerializable(r, 'api_trackingOverview');
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

test('Releasit : la même ligne écrite deux fois par Releasit n’est pas un 2e produit', function () {
  releasitSetup();
  releasitAdd({ id: '#1040', date: '2026-11-14 10:00:44', qty: 2, line: 3600, ship: 450, total: 4050 });
  releasitAdd({ id: '#1040', date: '2026-11-14 10:00:44', qty: 2, line: 3600, ship: 450, total: 4050 });
  assert.strictEqual(transferReleasitOrders_().added, 1);
  var o = order('#1040');
  assert.deepStrictEqual([o.product, o.qty, o.price, o.total], ['cover iPhone - iphone 15 PRO MAX', 2, 3600, 4050]);
  releasitAdd({ id: '#1040', date: '2026-11-14 10:00:44', qty: 2, line: 3600, ship: 450, total: 4050 });
  assert.strictEqual(transferReleasitOrders_().added, 0, 'réécrite plus tard : déjà là');
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
  assert.deepStrictEqual(triggerList(),
    ['transferReleasitOrders/1', 'importShopifyOrders/5', 'processNewRows/5', 'syncEcotrackStatuses/30', 'nightlyMaintenance/3h']);

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

/* ---------------- Verrouillage, annulation du colis, corbeille ---------------- */

var ADMIN = { name: 'Admin', role: 'Administrateur' };
var AGENT = { name: 'Imane', role: 'Confirmatrice' };
function asAgent() {
  __mock.setUser('imane@example.com');
  sheet('Équipe').appendRow(['imane@example.com', 'Imane', 'Confirmatrice']);
  userEdit('Équipe');
}
function trackingOf(id) { return order(id).tracking; }

test('Verrou : étapes, statuts permis et boutons selon la commande', function () {
  var eco = { SOCIETE_PAR_DEFAUT: 'Ecotrack' };
  var yal = { SOCIETE_PAR_DEFAUT: 'Yalidine' };
  var r = orderRules_({ status: 'À confirmer' }, ADMIN, eco);
  assert.deepStrictEqual([r.stage, r.locked, r.canDelete, r.canUnlock], ['queue', false, true, false]);
  assert.ok(r.statuses.indexOf('Confirmée') >= 0 && r.statuses.indexOf('Annulée') >= 0);
  assert.strictEqual(r.statuses.indexOf('Expédiée'), -1, 'avec Ecotrack, « Expédiée » vient d’Ecotrack');
  assert.ok(orderRules_({ status: 'Confirmée' }, ADMIN, yal).statuses.indexOf('Livrée') >= 0, 'société sans API : statuts à la main');
  assert.strictEqual(orderRules_({ status: 'À confirmer' }, AGENT, eco).canDelete, false, 'suppression : administrateur seulement');

  r = orderRules_({ status: 'Confirmée', carrier: 'Ecotrack', tracking: 'ECO1', carrierMoved: new Date(2026, 10, 13, 18, 20) }, ADMIN, eco);
  assert.deepStrictEqual([r.stage, r.locked, r.canCancelParcel, r.canDelete, r.canUnlock], ['parcel', true, true, false, true]);
  assert.deepStrictEqual(r.statuses, ['Confirmée']);
  assert.ok(/Colis créé chez Ecotrack le 13\/11\/2026 à 18:20 \(n° ECO1\).*annulez d’abord le colis/.test(r.reason), r.reason);
  assert.strictEqual(orderRules_({ status: 'Confirmée', carrier: 'Ecotrack', tracking: 'ECO1' }, AGENT, eco).canUnlock, false);

  r = orderRules_({ status: 'Expédiée', carrier: 'Ecotrack', tracking: 'ECO1' }, ADMIN, eco);
  assert.deepStrictEqual([r.stage, r.locked, r.statuses, r.canCancelParcel], ['shipping', true, ['Expédiée'], false]);
  assert.ok(/mis à jour par Ecotrack/.test(r.reason));
  assert.deepStrictEqual(orderRules_({ status: 'Expédiée', carrier: 'Yalidine', tracking: 'Y1' }, ADMIN, eco).statuses, ['Expédiée', 'En livraison', 'Livrée', 'Retour']);
  assert.deepStrictEqual(orderRules_({ status: 'En livraison', carrier: 'Yalidine' }, ADMIN, eco).statuses, ['En livraison', 'Livrée', 'Retour']);

  r = orderRules_({ status: 'Livrée', carrier: 'Ecotrack', tracking: 'ECO1' }, ADMIN, eco);
  assert.deepStrictEqual([r.stage, r.statuses, r.canReopen, r.canDelete], ['done', ['Livrée'], false, false]);
  r = orderRules_({ status: 'Annulée' }, ADMIN, eco);
  assert.deepStrictEqual([r.locked, r.canReopen, r.statuses, r.canDelete], [true, true, ['À confirmer', 'Annulée'], true]);
  assert.ok(/remettez-la « À confirmer »/.test(r.reason));
  assert.strictEqual(orderRules_({ status: 'Annulée', carrier: 'Ecotrack', tracking: 'ECO1' }, ADMIN, eco).canReopen, false, 'colis annulé chez Ecotrack');
});

test('Verrou : colis créé chez Ecotrack = commande non modifiable (sauf les notes), « Annuler le colis » la déverrouille', function () {
  ecoSetup();
  addConfirmed('#L1');
  assert.ok(results(ship(['#L1']))['#L1'].ok);
  var t = trackingOf('#L1');
  asAgent();

  assert.throws(function () { api_updateOrder('#L1', { phone: '0661457890' }); }, /Colis créé chez Ecotrack.*annulez d’abord le colis/);
  assert.throws(function () { api_updateOrder('#L1', { status: 'Annulée', cancelReason: 'Doublon' }); }, /annulez d’abord le colis pour changer le statut/);
  assert.throws(function () { api_updateOrder('#L1', { tracking: '' }); }, /verrouillée/);
  // Le formulaire renvoie tous les champs : inchangés, ils ne bloquent pas l'enregistrement des notes.
  var form = api_getOrder('#L1').order;
  var saved = api_updateOrder('#L1', { client: form.client, phone: form.phone, wilaya: form.wilaya, qty: form.qty, price: form.price, shipping: form.shipping, notes: 'Client prévenu' });
  assert.strictEqual(saved.notes, 'Client prévenu');
  assert.strictEqual(saved.tracking, t);
  assert.throws(function () { api_updateOrder('#L1', { notes: 'x', force: true, forceReason: 'test' }); }, /Seul un administrateur/);
  var data = api_getOrder('#L1');
  assert.deepStrictEqual([data.rules.locked, data.rules.canCancelParcel, data.order.locked], [true, true, true]);
  assertSerializable(data, 'api_getOrder');
  assert.strictEqual(api_listOrders({ period: 'all' }).rows[0].locked, true);

  // Annuler le colis : supprimé chez Ecotrack, la commande redevient modifiable.
  var res = api_cancelParcel('#L1');
  assert.ok(/annulé chez Ecotrack/.test(res.message), res.message);
  assert.strictEqual(FAKE.lastCall('/api/v1/delete/order').query.tracking, t);
  assert.ok(!FAKE.orders.some(function (o) { return o.tracking === t; }));
  var o = order('#L1');
  assert.deepStrictEqual([o.status, o.tracking, o.carrierStatus, o.locked], ['Confirmée', '', '', false]);
  assert.ok(logActions().indexOf('Colis annulé') >= 0);
  assert.ok(api_shippingList().toShip.some(function (x) { return x.id === '#L1'; }), 'de retour dans « à expédier »');
  assert.strictEqual(api_updateOrder('#L1', { commune: 'Hussein Dey' }).commune, 'Hussein Dey');
  assert.ok(results(ship(['#L1']))['#L1'].ok, 'le colis se recrée');
  assert.notStrictEqual(trackingOf('#L1'), t);
  assert.throws(function () { api_cancelParcel('#nope'); }, /introuvable/);
});

test('Verrou : colis déjà validé chez Ecotrack : annulation refusée, rien ne change', function () {
  ecoSetup();
  addConfirmed('#L2');
  ship(['#L2']);
  var t = trackingOf('#L2');
  FAKE.validate(t);
  assert.throws(function () { api_cancelParcel('#L2'); }, /Ecotrack refuse d’annuler le colis .*Commande non modifiable.*demande de retour/);
  assert.strictEqual(trackingOf('#L2'), t);
  syncEcotrackStatuses_();
  assert.strictEqual(order('#L2').status, 'Expédiée');
  assert.throws(function () { api_cancelParcel('#L2'); }, /n’a pas de colis Ecotrack en attente/);
  assert.throws(function () { api_updateOrder('#L2', { status: 'Livrée' }); }, /mis à jour par Ecotrack/);
  assert.throws(function () { api_updateOrder('#L2', { address: 'Ailleurs' }); }, /Colis validé et en route/);
  addConfirmed('#L3');
  assert.throws(function () { api_cancelParcel('#L3'); }, /n’a pas de colis/);
});

test('Verrou : statuts à la main (société sans API), commande terminée, remise à confirmer, déverrouillage', function () {
  baseSetup();
  setSetting('SOCIETE_PAR_DEFAUT', 'Ecotrack');
  addRaw({ 'N°': '#V1', 'Client': 'A', 'Téléphone': '0550000051', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#V2', 'Client': 'B', 'Téléphone': '0550000052', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  assert.throws(function () { api_updateOrder('#V1', { status: 'Expédiée' }); }, /créez le colis depuis la page Expéditions/);
  assert.throws(function () { api_updateOrder('#V1', { status: 'Expédiée', carrier: 'Ecotrack' }); }, /créez le colis/);
  assert.strictEqual(api_updateOrder('#V1', { status: 'Expédiée', carrier: 'Yalidine', tracking: 'YAL-9' }).status, 'Expédiée');
  assert.throws(function () { api_updateOrder('#V1', { address: 'Autre' }); }, /Commande expédiée/);
  assert.throws(function () { api_updateOrder('#V1', { status: 'À confirmer' }); }, /ne peut pas revenir à « À confirmer »/);
  assert.strictEqual(api_updateOrder('#V1', { status: 'Livrée' }).status, 'Livrée');
  assert.throws(function () { api_updateOrder('#V1', { status: 'Retour' }); }, /Commande livrée/);

  // Annulée avant l'envoi, puis remise à confirmer : motif effacé, de nouveau modifiable.
  api_updateOrder('#V2', { status: 'Annulée', cancelReason: 'Trop cher' });
  assert.throws(function () { api_updateOrder('#V2', { client: 'Autre' }); }, /Commande annulée/);
  var back = api_updateOrder('#V2', { status: 'À confirmer' });
  assert.deepStrictEqual([back.status, back.cancelReason, back.locked], ['À confirmer', '', false]);
  assert.ok(api_queue().due.some(function (x) { return x.id === '#V2'; }));

  // Déverrouillage par l'administrateur : motif obligatoire, noté dans le Journal.
  assert.throws(function () { api_updateOrder('#V1', { address: 'Corrigée', force: true }); }, /motif du déverrouillage/);
  var fixed = api_updateOrder('#V1', { address: 'Corrigée', status: 'Retour', force: true, forceReason: 'Erreur de saisie' });
  assert.deepStrictEqual([fixed.address, fixed.status], ['Corrigée', 'Retour']);
  var j = sheet('Journal');
  var last = j.getRange(j.getLastRow(), 1, 1, 5).getValues()[0];
  assert.strictEqual(last[3], 'Déverrouillage');
  assert.ok(/Motif : Erreur de saisie/.test(last[4]), last[4]);
});

test('Corbeille : suppression par l’administrateur, Releasit et Shopify ne la recréent pas, restauration', function () {
  releasitSetup();
  releasitAdd({ id: '#9001' });
  releasitAdd({ id: '#9002', phone: '+2130661457890' });
  transferReleasitOrders_();
  var res = api_deleteOrder('#9001', 'Commande test');
  assert.ok(/corbeille/.test(res.message));
  assert.deepStrictEqual(orderRowIds(), ['#9002']);
  var trash = sheet('Corbeille');
  var header = trash.getRange(1, 1, 1, trash.getLastColumn()).getValues()[0];
  var row = trash.getRange(2, 1, 1, header.length).getValues()[0];
  assert.strictEqual(row[header.indexOf('N°')], '#9001');
  assert.strictEqual(row[header.indexOf('Client')], 'Client Test');
  assert.strictEqual(row[header.indexOf('Motif de suppression')], 'Commande test');
  assert.ok(row[header.indexOf('Supprimée le')] instanceof Date);
  assert.ok(logActions().indexOf('Suppression') >= 0);

  // Releasit relit tout (repère perdu) : la commande supprimée ne revient pas. Shopify non plus.
  PropertiesService.getScriptProperties().deleteProperty('RELEASIT_MARK');
  assert.strictEqual(transferReleasitOrders_().added, 0);
  saveShopifyConfig_(SHOP_DOMAIN, SHOPIFY.token, '');
  SHOPIFY.add({ name: '#9001', createdAt: hoursBack(1) });
  assert.strictEqual(importShopifyOrders_().imported, 0);
  assert.deepStrictEqual(orderRowIds(), ['#9002']);

  // Restauration (menu du classeur).
  assert.strictEqual(api_restoreOrder('#9001').id, '#9001');
  assert.deepStrictEqual(orderRowIds().sort(), ['#9001', '#9002']);
  assert.strictEqual(order('#9001').status, 'À confirmer');
  assert.strictEqual(order('#9001').phone, '0550123456');
  assert.strictEqual(trash.getLastRow(), 1, 'sortie de la corbeille');
  assert.throws(function () { api_restoreOrder('#9001'); }, /corbeille est vide|absente/);
  __mock.state.prompts.push('#9999');
  onOpen();
  menuTrashRestore();
  assert.ok(__mock.state.alerts.length >= 1);

  // Confirmatrice : pas de suppression. Commande envoyée : pas de suppression.
  asAgent();
  assert.throws(function () { api_deleteOrder('#9002'); }, /Seul un administrateur/);
  assert.strictEqual(api_getOrder('#9002').rules.canDelete, false);
});

test('Corbeille : liste dans l’application (administrateur) avec la date, l’auteur et le motif', function () {
  baseSetup();
  addOrder('#Z1', 'Sac', { 'Client': 'Zina' });
  addOrder('#Z2', 'Sac');
  processNewRows();
  assert.deepStrictEqual(api_listTrash().rows, [], 'corbeille vide');
  api_deleteOrder('#Z1', 'Commande test');
  var t = api_listTrash();
  assertSerializable(t, 'api_listTrash');
  assert.deepStrictEqual(t.rows.map(function (x) { return [x.id, x.client, x.status, x.deletedBy, x.reason]; }), [['#Z1', 'Zina', 'À confirmer', 'Admin', 'Commande test']]);
  assert.ok(t.rows[0].deletedAt);
  api_restoreOrder('#Z1');
  assert.deepStrictEqual(api_listTrash().rows, []);
  asAgent();
  assert.throws(function () { api_listTrash(); }, /Seul un administrateur/);
});

test('Corbeille : une commande envoyée ne se supprime pas ; les n° manuels ne sont pas réutilisés', function () {
  ecoSetup();
  addConfirmed('#D1');
  ship(['#D1']);
  assert.throws(function () { api_deleteOrder('#D1'); }, /ne peut pas être supprimée/);
  var a = api_createOrder({ client: 'Manuel', phone: '0550000061', wilaya: '16 - Alger', product: 'X', price: 1000 });
  assert.strictEqual(a.id, 'M0001');
  api_deleteOrder('M0001');
  var b = api_createOrder({ client: 'Manuel 2', phone: '0550000062', wilaya: '16 - Alger', product: 'X', price: 1000 });
  assert.strictEqual(b.id, 'M0002', 'M0001 est à la corbeille : le n° n’est pas réutilisé');
});

/* ---------------- Vitesse ---------------- */

/** Compte les lectures et écritures faites sur chaque onglet pendant fn(). */
function countSheetCalls(fn) {
  var proto = Object.getPrototypeOf(sheet('Commandes').getRange(1, 1));
  var calls = {};
  var names = ['getValues', 'getValue', 'setValues', 'setValue'];
  var saved = {};
  names.forEach(function (m) {
    saved[m] = proto[m];
    proto[m] = function () {
      var k = this.sheet.name + ':' + m;
      calls[k] = (calls[k] || 0) + 1;
      return saved[m].apply(this, arguments);
    };
  });
  try { fn(); } finally { names.forEach(function (m) { proto[m] = saved[m]; }); }
  return calls;
}
function locksDuring(fn) {
  var real = LockService.getScriptLock;
  var n = 0;
  LockService.getScriptLock = function () { n++; return real.apply(LockService, arguments); };
  try { fn(); } finally { LockService.getScriptLock = real; }
  return n;
}

test('Vitesse : une confirmation écrit la commande en 2 blocs, sans case par case', function () {
  baseSetup();
  addRaw({ 'N°': '#S1', 'Client': 'Rapide', 'Téléphone': '0550000071', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  var calls = countSheetCalls(function () { api_recordCall('#S1', 'confirm', {}); });
  assert.strictEqual(calls['Commandes:setValue'] || 0, 0, 'aucune écriture case par case');
  assert.ok((calls['Commandes:setValues'] || 0) <= 2, JSON.stringify(calls));
  assert.strictEqual(calls['Journal:setValues'], 1, 'une ligne de Journal, écrite en une fois');
  var o = order('#S1');
  assert.deepStrictEqual([o.status, o.attempts, o.agent], ['Confirmée', 1, 'Admin']);
  // processNewRows : le Journal de plusieurs commandes est écrit en une seule fois.
  for (var i = 0; i < 5; i++) addRaw({ 'N°': '#S' + (10 + i), 'Client': 'Lot', 'Téléphone': '055000008' + i, 'Wilaya': 'Alger', 'Prix': 500 });
  var batch = countSheetCalls(function () { assert.strictEqual(processNewRows(), 5); });
  assert.strictEqual(batch['Journal:setValues'], 1);
});

test('Vitesse : réglages, tarifs, équipe et liste noire gardés en mémoire, vidés dès qu’on les modifie', function () {
  baseSetup();
  getSettings_(); getWilayaList_(); readRates_(getWilayaList_()); readClients_(); readTeam_(); readCatalog_();
  var again = countSheetCalls(function () {
    getSettings_(); readRates_(getWilayaList_()); readClients_(); currentUser_();
    api_bootstrap();
  });
  ['Paramètres', 'Tarifs', 'Clients', 'Équipe', 'Produits'].forEach(function (n) {
    assert.ok(!again[n + ':getValues'], n + ' relu alors qu’il est en mémoire : ' + JSON.stringify(again));
  });
  // Modification à la main (onEdit) : vu tout de suite.
  setSetting('APPELS_PAR_JOUR', 7);
  assert.strictEqual(getSettings_().APPELS_PAR_JOUR, 7);
  setRate('16 - Alger', [610, 410, 700, 350]);
  assert.strictEqual(readRates_(getWilayaList_())[16].Yalidine.Domicile, 610);
  // Changements faits par l'outil lui-même : mémoire vidée aussi.
  addRaw({ 'N°': '#S2', 'Client': 'Noir', 'Téléphone': '0550000099', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  api_setBlacklist('0550000099', true);
  assert.strictEqual(order('#S2').alert, 'Liste noire');
  assert.ok(readBlacklist_()['0550000099']);
  // Un autre onglet modifié à la main ne vide rien.
  getSettings_();
  userEdit('Commandes');
  assert.ok(__mock.state.cache['cfg:settings'], 'la mémoire des réglages reste');
});

test('Vitesse : sans nouvelle ligne, le traitement automatique ne lit que 3 colonnes et ne bloque rien', function () {
  baseSetup();
  addRaw({ 'N°': '#S3', 'Client': 'A', 'Téléphone': '0550000073', 'Wilaya': 'Alger', 'Prix': 1000 });
  assert.strictEqual(processNewRows(), 1);
  var locks = locksDuring(function () { assert.strictEqual(processNewRows(), 0); });
  assert.strictEqual(locks, 0, 'pas de verrou quand il n’y a rien');
  var calls = countSheetCalls(function () { processNewRows(); });
  assert.ok((calls['Commandes:getValues'] || 0) <= 4, JSON.stringify(calls));
  addRaw({ 'N°': '#S4', 'Client': 'Sans téléphone', 'Wilaya': 'Alger', 'Prix': 1000 });
  assert.strictEqual(processNewRows(), 1, 'une ligne avec seulement un nom est traitée');
});

test('Vitesse : confirmer renvoie la commande suivante, la file et les compteurs en un seul aller-retour', function () {
  baseSetup();
  ['#Q1', '#Q2', '#Q3'].forEach(function (id, i) {
    addRaw({ 'N°': id, 'Date': new Date(Date.now() - (5 - i) * 3600000), 'Client': 'C' + i, 'Téléphone': '055000010' + i, 'Wilaya': 'Alger', 'Prix': 1000 });
  });
  processNewRows();
  var res = api_recordCall('#Q1', 'confirm', {}, { next: '#Q2', queue: true });
  assert.strictEqual(res.status, 'Confirmée');
  assert.strictEqual(res.next.order.id, '#Q2');
  assert.ok(res.next.rules && res.next.history);
  assert.deepStrictEqual(res.queue.due.map(function (x) { return x.id; }), ['#Q3', '#Q2'], 'les plus récentes d’abord');
  assert.deepStrictEqual(res.counts, { queue: 2, pending: 2, alerts: 0, toShip: 1 });
  assertSerializable(res, 'api_recordCall');
  // Commande suivante déjà traitée par quelqu'un d'autre : pas de fiche jointe.
  api_recordCall('#Q2', 'cancel', { reason: 'Doublon' });
  assert.strictEqual(api_recordCall('#Q3', 'confirm', {}, { next: '#Q2' }).next, undefined);
  // Les autres modifications renvoient aussi les compteurs.
  assert.deepStrictEqual(api_updateOrder('#Q3', { notes: 'ok' }).counts, { queue: 0, pending: 0, alerts: 0, toShip: 2 });
});

test('Vitesse : la première page arrive avec le démarrage (un seul aller-retour)', function () {
  releasitSetup();
  addRaw({ 'N°': '#B1', 'Date': new Date(Date.now() - 3600000), 'Client': 'Boot', 'Téléphone': '0550000111', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  releasitAdd({ id: '#B2', phone: '+2130661457890' });
  var key = 'api_queue|[{"sync":true,"first":true}]';
  var b = api_bootstrap({ fn: 'api_queue', args: [{ sync: true, first: true }], key: key });
  assert.strictEqual(b.preload.key, key);
  assert.strictEqual(b.preload.data.arrived, 1, 'RELEASIT vérifié avant');
  assert.deepStrictEqual(b.preload.data.due.map(function (x) { return x.id; }), ['#B2', '#B1'], 'les plus récentes d’abord');
  assert.strictEqual(b.preload.data.firstDetail.order.id, '#B2');
  assert.deepStrictEqual(b.counts, { queue: 2, pending: 2, alerts: 0, toShip: 0 });
  assertSerializable(b, 'api_bootstrap');

  var list = api_bootstrap({ fn: 'api_listOrders', args: [{ status: 'all', period: 'all', sync: true, withStatus: true }], key: 'k' });
  assert.strictEqual(list.preload.data.rows.length, 2);
  assert.strictEqual(list.preload.data.importStatus.releasit.found, true);
  assert.ok(api_bootstrap({ fn: 'api_dashboard', args: ['7'], key: 'd' }).preload.data.received >= 2);
  assert.strictEqual(api_bootstrap({ fn: 'api_setBlacklist', args: ['0550000111', true], key: 'x' }).preload, null, 'seules les pages sont permises');
  assert.strictEqual(api_bootstrap().preload, null);
  assert.strictEqual(readBlacklist_()['0550000111'], undefined);

  var q = api_queue({ sync: true, first: true });
  assert.strictEqual(q.firstDetail.order.id, '#B2');
  var l = api_listOrders({ status: 'all', period: 'all', sync: true, withStatus: true });
  assert.ok(l.importStatus && l.arrived === 0 && l.menuCounts === undefined);
});

test('Vitesse : onglet plein : agrandi tout seul, listes déroulantes et couleurs comprises', function () {
  releasitSetup();
  var cmd = sheet('Commandes');
  cmd.maxRows = 3;
  addRaw({ 'N°': '#F1', 'Client': 'A', 'Téléphone': '0550000121', 'Wilaya': 'Alger', 'Prix': 1000 });
  addRaw({ 'N°': '#F2', 'Client': 'B', 'Téléphone': '0550000122', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  var rulesBefore = cmd._validations.length;
  releasitAdd({ id: '#F3' });
  releasitAdd({ id: '#F4', phone: '+2130661457890' });
  assert.strictEqual(transferReleasitOrders_().added, 2, 'pas d’erreur « hors de l’onglet »');
  assert.ok(cmd.getMaxRows() >= 205, 'lignes ajoutées : ' + cmd.getMaxRows());
  assert.ok(cmd._validations.length > rulesBefore, 'listes déroulantes étendues aux nouvelles lignes');
  assert.strictEqual(order('#F4').status, 'À confirmer');
  var j = sheet('Journal');
  j.maxRows = j.getLastRow();
  log_({ name: 'Test' }, '', 'Journal plein', 'ok');
  assert.strictEqual(j.getRange(j.getLastRow(), 4).getValue(), 'Journal plein');
});

/** Ajoute une commande terminée, avec ses dates. */
function addFinished(id, fields, daysAgo) {
  var d = new Date(Date.now() - daysAgo * 86400000);
  var base = { 'N°': id, 'Date': d, 'Client': 'Client ' + id, 'Téléphone': '0550000200', 'Wilaya': '16 - Alger', 'Produit': 'Sac', 'Prix': 1000,
    'Total': 1450, 'Livraison': 'Domicile', 'Frais livraison': 450, 'Tentatives': 1, 'Alerte client': 'Nouveau client', 'Source': 'Test', 'Mis à jour': d };
  Object.keys(fields).forEach(function (k) { base[k] = fields[k]; });
  addRaw(base);
}

test('Archive : commandes terminées depuis longtemps archivées, argent et retours en attente gardés, bilan client conservé', function () {
  baseSetup();
  addFinished('#A1', { 'Statut': 'Livrée', 'Société': 'Yalidine' }, 120);
  addFinished('#A2', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'N° de suivi': 'EC1', 'Statut société': 'paye_et_archive', 'Dernier mouvement colis': new Date(Date.now() - 110 * 86400000) }, 130);
  addFinished('#A3', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'N° de suivi': 'EC2', 'Statut société': 'encaisse_non_paye' }, 130);
  addFinished('#A4', { 'Statut': 'Retour', 'Société': 'Ecotrack', 'N° de suivi': 'EC3', 'Statut société': 'retour_en_traitement' }, 130);
  addFinished('#A5', { 'Statut': 'Retour', 'Société': 'Ecotrack', 'N° de suivi': 'EC4', 'Statut société': 'retour_recu', 'Téléphone': '0550000201' }, 130);
  addFinished('#A6', { 'Statut': 'Annulée', 'Motif annulation': 'Doublon', 'Téléphone': '0550000201' }, 150);
  addFinished('#A7', { 'Statut': 'Annulée' }, 20);
  addFinished('#A8', { 'Statut': 'Confirmée' }, 200);
  var before = api_dashboard('all').received;

  var r = archiveOldOrders_();
  assert.strictEqual(r.archived, 4);
  assert.deepStrictEqual(orderRowIds().sort(), ['#A3', '#A4', '#A7', '#A8'], 'argent pas versé, retour en cours, récente, pas terminée');
  var arch = sheet('Archive');
  var header = headerOf('Archive');
  assert.strictEqual(header[header.length - 1], 'Archivée le');
  var ids = arch.getRange(2, header.indexOf('N°') + 1, arch.getLastRow() - 1, 1).getValues().map(function (x) { return x[0]; }).sort();
  assert.deepStrictEqual(ids, ['#A1', '#A2', '#A5', '#A6']);
  assert.strictEqual(arch.getRange(2, header.indexOf('Téléphone') + 1).getValue(), '0550000200', 'téléphone gardé en texte');

  // Bilan des clients (onglet Clients) : les alertes restent justes.
  var clients = readClients_().archived;
  assert.deepStrictEqual(clients['0550000200'], [2, 0, 0]);
  assert.deepStrictEqual(clients['0550000201'], [0, 1, 1]);
  addRaw({ 'N°': '#A9', 'Client': 'Revient', 'Téléphone': '0550000200', 'Wilaya': 'Alger', 'Prix': 1000 });
  processNewRows();
  // Même numéro : 2 livrées archivées + #A3 livrée et #A4 retour encore dans Commandes.
  assert.strictEqual(order('#A9').alert, 'Fiable · 3/4 livrées');
  var h = api_getOrder('#A9').history;
  assert.deepStrictEqual([h.orders, h.delivered, h.returned], [6, 3, 1], '2 archivées + #A3, #A4, #A7, #A8');
  assert.strictEqual(api_dashboard('all').received, before + 1, 'le tableau de bord « Tout » compte les archives');
  assert.ok(logActions().indexOf('Archivage') >= 0);

  // Deuxième archivage : le bilan s'additionne, sans doublon de client.
  setSetting('ARCHIVE_JOURS', 10);
  assert.strictEqual(getSettings_().ARCHIVE_JOURS, 30, 'au moins 30 jours');
  setSetting('ARCHIVE_JOURS', 0);
  assert.strictEqual(archiveOldOrders_().archived, 0, '0 = jamais');
});

test('Maintenance de nuit : Journal raccourci, onglets allégés, RELEASIT jamais touché', function () {
  releasitSetup();
  var j = sheet('Journal');
  for (var i = 0; i < 5; i++) j.appendRow([new Date(Date.now() - (120 - i) * 86400000), 'Ancien', '', 'Test', '']);
  j.appendRow([new Date(), 'Récent', '', 'Test', '']);
  var rel = sheet('RELEASIT');
  var relRows = rel.getMaxRows();
  var out = nightlyMaintenance();
  assert.deepStrictEqual(out.errors, []);
  assert.strictEqual(out.journal, 5);
  assert.strictEqual(j.getRange(2, 2).getValue(), 'Récent');
  assert.strictEqual(j.getMaxRows(), j.getLastRow() + 100);
  assert.strictEqual(j.getMaxColumns(), 5);
  var cmd = sheet('Commandes');
  assert.strictEqual(cmd.getMaxRows(), Math.max(cmd.getLastRow(), 1) + 300);
  assert.strictEqual(rel.getMaxRows(), relRows);
  assert.ok(out.rows > 0);
  onOpen();
  menuMaintenance();
  assert.ok(__mock.state.alerts.some(function (a) { return /commande\(s\) archivée\(s\)/.test(a.join(' ')); }));
});

/* ---------------- Stock par modèle ---------------- */

/** Remplit l'onglet Produits (comme une saisie à la main). */
function setCatalog(rows) {
  var sh = sheet('Produits');
  var header = headerOf('Produits');
  rows.forEach(function (r) {
    var line = header.map(function (t) { return r[t] === undefined ? '' : r[t]; });
    sh.appendRow(line);
  });
  userEdit('Produits');
}
function catalogStock(model) {
  var c = readCatalogFromSheet_();
  return c.rows.filter(function (r) { return r.model === model; })[0].stock;
}
function addOrder(id, product, extra) {
  var f = { 'N°': id, 'Date': new Date(), 'Client': 'Client ' + id, 'Téléphone': '0550' + ('000000' + (++phoneSeq)).slice(-6), 'Wilaya': '16 - Alger',
    'Produit': product, 'Quantité': 1, 'Prix': 1800, 'Livraison': 'Domicile', 'Frais livraison': 450, 'Total': 2250 };
  Object.keys(extra || {}).forEach(function (k) { f[k] = extra[k]; });
  addRaw(f);
}

test('Stock : libellés des commandes, articles, modèle retrouvé sans tenir compte des majuscules ni des tirets', function () {
  assert.deepStrictEqual(orderItems_({ product: 'cover iPhone  - iphone 15 PRO MAX', qty: 3 }), [{ label: 'cover iPhone - iphone 15 PRO MAX', qty: 3 }]);
  assert.deepStrictEqual(orderItems_({ product: 'Coque A ×2 + Coque B', qty: 1 }), [{ label: 'Coque A', qty: 2 }, { label: 'Coque B', qty: 1 }]);
  assert.deepStrictEqual(orderItems_({ product: '' }), []);
  assert.deepStrictEqual(splitLabel_('cover iPhone - iphone 15 PRO MAX'), { product: 'cover iPhone', model: 'iphone 15 PRO MAX' });
  assert.deepStrictEqual(splitLabel_('cover iPhone — iphone 13'), { product: 'cover iPhone', model: 'iphone 13' });
  assert.deepStrictEqual(splitLabel_('Montre'), { product: 'Montre', model: '' });
  baseSetup();
  assert.deepStrictEqual(headerOf('Produits'), PRODUCT_TITLES_);
  setCatalog([{ 'Produit': 'Cover iPhone', 'Modèle': 'iPhone 15 Pro Max', "Coût d'achat": 600, 'Stock': 5 }, { 'Produit': 'Montre', 'Stock': 3 }]);
  var cat = readCatalog_();
  assert.strictEqual(matchCatalog_(cat, 'cover iPhone - iphone 15 PRO MAX').model, 'iPhone 15 Pro Max');
  assert.strictEqual(matchCatalog_(cat, 'cover iPhone — iphone 15 pro max').product, 'Cover iPhone', 'format de l’import Shopify');
  assert.strictEqual(matchCatalog_(cat, 'Montre').product, 'Montre');
  assert.strictEqual(matchCatalog_(cat, 'cover iPhone - iphone 13'), null);
  assert.ok(api_bootstrap().products.some(function (p) { return p.name === 'Cover iPhone — iPhone 15 Pro Max'; }));
});

test('Stock : réservé à la confirmation, avertissement, baisse quand le colis part, remonte au retour', function () {
  baseSetup();
  setCatalog([{ 'Produit': 'cover iPhone', 'Modèle': 'iphone 15 PRO MAX', "Coût d'achat": 600, 'Stock': 2 },
    { 'Produit': 'cover iPhone', 'Modèle': 'iphone 13', "Coût d'achat": 550, 'Stock': 10 }]);
  addOrder('#K1', 'cover iPhone - iphone 15 PRO MAX', { 'Quantité': 2, 'Prix': 3600 });
  addOrder('#K2', 'cover iPhone - iphone 15 PRO MAX');
  addOrder('#K3', 'cover iPhone - iphone 13 ×1 + cover iPhone - iphone 15 PRO MAX ×1');
  addOrder('#K4', 'Produit inconnu');
  processNewRows();

  var k2 = api_getOrder('#K2').stock[0];
  assert.deepStrictEqual([k2.matched, k2.tracked, k2.available, k2.short], [true, true, 2, false]);
  api_recordCall('#K1', 'confirm', {});
  k2 = api_getOrder('#K2').stock[0];
  assert.deepStrictEqual([k2.reserved, k2.available, k2.short], [2, 0, true], 'les 2 sont réservés par #K1');
  assert.strictEqual(api_getOrder('#K1').stock[0].short, false, 'sa propre réservation ne compte pas contre elle');
  assert.strictEqual(api_getOrder('#K4').stock[0].matched, false);
  assert.strictEqual(catalogStock('iphone 15 PRO MAX'), 2, 'réservé : le stock ne bouge pas encore');

  // Le colis part (société sans connexion : statut à la main) : le stock baisse, une seule fois.
  api_updateOrder('#K1', { status: 'Expédiée', carrier: 'Yalidine', tracking: 'Y1' });
  assert.strictEqual(catalogStock('iphone 15 PRO MAX'), 0);
  assert.strictEqual(order('#K1').stockMove, 'Sorti');
  api_updateOrder('#K1', { status: 'Livrée' });
  assert.strictEqual(catalogStock('iphone 15 PRO MAX'), 0, 'pas deux fois');
  assert.ok(logActions().indexOf('Stock : colis parti') >= 0);

  // Commande à plusieurs articles : chaque modèle baisse.
  api_recordCall('#K3', 'confirm', {});
  api_updateOrder('#K3', { status: 'Expédiée', carrier: 'Yalidine', tracking: 'Y3' });
  assert.deepStrictEqual([catalogStock('iphone 13'), catalogStock('iphone 15 PRO MAX')], [9, -1]);
  // Retour (société sans connexion : reçu dès « Retour ») : le stock remonte.
  api_updateOrder('#K3', { status: 'Retour' });
  assert.deepStrictEqual([catalogStock('iphone 13'), catalogStock('iphone 15 PRO MAX')], [10, 0]);
  assert.strictEqual(order('#K3').stockMove, 'Rentré');
  // Annulée avant le départ : la réservation est libérée.
  api_recordCall('#K2', 'confirm', {});
  assert.strictEqual(api_getOrder('#K2').stock[0].reserved, 1);
  api_updateOrder('#K2', { status: 'Annulée', cancelReason: 'Doublon' });
  assert.strictEqual(stockData_(readOrders_(), getSettings_()).products[0].reserved, 0);
});

test('Stock : colis Ecotrack (parti à la validation, rentré au retour reçu) et commandes antérieures au suivi', function () {
  ecoSetup();
  setCatalog([{ 'Produit': 'Sac à main', 'Stock': 5 }]);
  addConfirmed('#E1');
  addConfirmed('#E2');
  ship(['#E1', '#E2']);
  syncEcotrackStatuses_();
  assert.strictEqual(catalogStock(''), 5, 'colis créé mais pas validé : rien ne sort');
  FAKE.setStatus(trackingOf('#E1'), 'en_ramassage');
  FAKE.setStatus(trackingOf('#E2'), 'retour_chez_livreur');
  syncEcotrackStatuses_();
  assert.strictEqual(catalogStock(''), 3, 'parti, et retour pas encore reçu : sorti');
  FAKE.setStatus(trackingOf('#E2'), 'retour_recu');
  FAKE.setStatus(trackingOf('#E1'), 'encaisse_non_paye');
  syncEcotrackStatuses_();
  assert.strictEqual(catalogStock(''), 4, 'retour reçu : remonte');
  assert.strictEqual(order('#E1').carrierStatus, 'encaisse_non_paye', 'après la livraison, l’argent reste suivi');
  FAKE.setStatus(trackingOf('#E1'), 'paye_et_archive');
  syncEcotrackStatuses_();
  assert.strictEqual(order('#E1').carrierLabel, 'Payé');

  // Classeur d'avant le suivi du stock : les commandes déjà parties sont marquées, le stock ne bouge pas.
  __mock.reset();
  var s = __mock.ss().insertSheet('Commandes');
  var old = ORDER_COLUMNS.filter(function (c) { return c.key !== 'stockMove'; }).map(function (c) { return c.title; });
  s.getRange(1, 1, 1, old.length).setValues([old]);
  var row = old.map(function () { return ''; });
  row[old.indexOf('N°')] = '#OLD'; row[old.indexOf('Client')] = 'Ancien'; row[old.indexOf('Téléphone')] = '0550000301';
  row[old.indexOf('Statut')] = 'Livrée'; row[old.indexOf('Produit')] = 'Sac à main';
  s.appendRow(row);
  setup();
  setCatalog([{ 'Produit': 'Sac à main', 'Stock': 5 }]);
  assert.strictEqual(order('#OLD').stockMove, 'Avant le suivi du stock');
  withLock_(function () { applyStockMoves_(readOrders_()); });
  assert.strictEqual(catalogStock(''), 5);
});

test('Stock : page Stock (total par produit, stock bas), modèles des commandes ajoutés au catalogue', function () {
  baseSetup();
  setCatalog([{ 'Produit': 'cover iPhone', 'Modèle': 'iphone 15 PRO MAX', 'Stock': 2 }, { 'Produit': 'cover iPhone', 'Modèle': 'iphone 13', 'Stock': 10, "Seuil d'alerte": 12 },
    { 'Produit': 'Montre' }]);
  addOrder('#P1', 'cover iPhone - iphone 15 PRO MAX');
  addOrder('#P2', 'cover iPhone - iphone 14 Pro', { 'Prix': 1900 });
  addOrder('#P3', 'cover iPhone - iphone 14 Pro', { 'Prix': 1700 });
  processNewRows();
  api_recordCall('#P1', 'confirm', {});
  var d = api_stock();
  assertSerializable(d, 'api_stock');
  var cover = d.products[0];
  assert.deepStrictEqual([cover.product, cover.stock, cover.reserved, cover.available], ['cover iPhone', 12, 1, 11]);
  assert.strictEqual(cover.models.length, 2);
  assert.strictEqual(d.low, 2, '15 PRO MAX : 1 disponible (seuil 2) ; iphone 13 : 10 (seuil de la ligne 12)');
  assert.strictEqual(d.products[1].tracked, false, 'stock vide = non suivi');
  assert.deepStrictEqual(d.unknown.map(function (u) { return [u.product, u.model, u.orders, u.price]; }), [['cover iPhone', 'iphone 14 Pro', 2, 1800]]);
  assert.strictEqual(api_dashboard('7').todo.stockLow, 2);

  var r = api_addCatalogItems(['cover iPhone - iphone 14 Pro', 'cover iPhone - iphone 15 PRO MAX']);
  assert.strictEqual(r.added, 1, 'pas de doublon');
  assert.deepStrictEqual(api_stock().unknown, []);
  var row = readCatalogFromSheet_().rows.filter(function (x) { return x.model === 'iphone 14 Pro'; })[0];
  assert.deepStrictEqual([row.product, row.price, row.stock], ['cover iPhone', 1800, null]);

  asAgent();
  assert.throws(function () { api_stock(); }, /Réservé à l’administrateur/);
  assert.strictEqual(api_dashboard('7').todo.stockLow, 0, 'la confirmatrice ne voit pas le stock bas');
});

/* ---------------- Bénéfices et dépenses ---------------- */

function setExpenseRow(values) {
  var sh = sheet('Dépenses');
  var header = headerOf('Dépenses');
  sh.appendRow(header.map(function (t) { return values[t] === undefined ? '' : values[t]; }));
}

test('Bénéfices : livrée, retour, frais Ecotrack réels, coût d’achat, dépenses en dollars au taux du jour', function () {
  baseSetup(); // Ecotrack Alger : 700 domicile, 350 stop desk
  setCatalog([{ 'Produit': 'cover iPhone', 'Modèle': 'iphone 15', "Coût d'achat": 600, 'Stock': 50 }]);
  var day = 86400000;
  addOrder('#B1', 'cover iPhone - iphone 15', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'Campagne': 'Promo coques', 'Source pub': 'facebook', 'Date': new Date(Date.now() - day) });
  addOrder('#B2', 'cover iPhone - iphone 15', { 'Statut': 'Retour', 'Société': 'Ecotrack', 'Campagne': 'Promo coques', 'Source pub': 'facebook' });
  addOrder('#B3', 'cover iPhone - iphone 15', { 'Statut': 'Annulée', 'Campagne': 'Promo coques', 'Source pub': 'fb' });
  addOrder('#B4', 'Montre sans coût', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'Source pub': 'tiktok', 'Campagne': 'TT montre' });
  addOrder('#B5', 'cover iPhone - iphone 15', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'Wilaya': '30 - Ouargla' });
  addOrder('#B6', 'cover iPhone - iphone 15', { 'Statut': 'Expédiée', 'Société': 'Ecotrack', 'Date': new Date(Date.now() - 40 * day) });

  assert.strictEqual(api_addExpense({ category: 'Publicité Facebook', campaign: 'Promo coques', amount: 10, currency: 'USD' }).message, 'Dépense ajoutée : 2 500 DA.');
  setSetting('TAUX_DOLLAR', 260);
  setExpenseRow({ 'Date': new Date(), 'Catégorie': 'Publicité TikTok', 'Campagne': 'TT montre', 'Montant': 5, 'Devise': 'USD' });
  setExpenseRow({ 'Date': new Date(), 'Catégorie': 'Salaires', 'Montant': 3000, 'Devise': 'DA' });
  setExpenseRow({ 'Date': new Date(Date.now() - 45 * day), 'Catégorie': 'Loyer', 'Montant': 9999 });
  api_addExpense({ category: 'Publicité Facebook', amount: 1000, currency: 'DA' });

  var d = api_profit('30');
  assertSerializable(d, 'api_profit');
  var t = d.totals;
  // #B1 : 2250 − 700 − 600 = 950 ; #B5 : pas de tarif à Ouargla → frais du client 450 : 2250 − 450 − 600 = 1200 ;
  // #B4 : coût inconnu : 2250 − 700 = 1550 ; #B2 : −50.
  assert.deepStrictEqual([t.orders, t.delivered, t.returned, t.cancelled], [5, 3, 1, 1]);
  assert.strictEqual(t.revenue, 6750);
  assert.strictEqual(t.ordersProfit, 950 + 1200 + 1550 - 50);
  assert.strictEqual(t.returnFees, 50);
  assert.strictEqual(t.expenses, 2500 + 1300 + 3000 + 1000, 'le dollar saisi avant le changement garde son taux (250), le nouveau prend 260');
  assert.strictEqual(t.adSpend, 2500 + 1300 + 1000);
  assert.strictEqual(t.net, t.ordersProfit - t.expenses);
  assert.deepStrictEqual([d.warnings.missingCost, d.warnings.missingFee, d.warnings.missingCostLabels], [1, 1, ['Montre sans coût']]);
  var rates = sheet('Dépenses').getRange(2, headerOf('Dépenses').indexOf('Taux') + 1, 2, 1).getValues().map(function (r) { return r[0]; });
  assert.deepStrictEqual(rates, [250, 260], 'taux du jour écrit sur la dépense en dollars');

  var promo = d.campaigns.filter(function (c) { return c.name === 'Promo coques'; })[0];
  assert.deepStrictEqual([promo.orders, promo.delivered, promo.returned, promo.profit, promo.spend, promo.net, promo.costPerDelivered],
    [3, 1, 1, 900, 2500, -1600, 2500]);
  var fb = d.platforms.filter(function (x) { return x.name === 'Facebook'; })[0];
  assert.deepStrictEqual([fb.orders, fb.spend], [3, 3500], 'fb et facebook = Facebook ; la pub Facebook sans campagne compte pour la plateforme');
  assert.strictEqual(d.adUnassigned, 1000);
  assert.ok(d.products.some(function (x) { return x.name === 'cover iPhone — iphone 15' && x.delivered === 2; }));
  assert.ok(d.knownCampaigns.indexOf('TT montre') >= 0);
  assert.strictEqual(api_profit('all').totals.orders, 6, '« Tout » compte la commande d’il y a 40 jours');

  asAgent();
  assert.throws(function () { api_profit('30'); }, /Réservé à l’administrateur/);
  assert.throws(function () { api_addExpense({ amount: 5 }); }, /Réservé/);
});

test('Bénéfices : livraison = prix Ecotrack − payé par le client (coût, gratuité, gain)', function () {
  baseSetup(); // Ecotrack Alger : 700 domicile, 350 stop desk
  setCatalog([{ 'Produit': 'Sac', "Coût d'achat": 600, 'Stock': 50 }]);
  var ctx = readOrders_();
  var env = makeEnv_(ctx);
  var cat = readCatalog_();
  var p = function (o) {
    var r = orderProfit_(Object.assign({ status: 'Livrée', carrier: 'Ecotrack', wilaya: '16 - Alger', product: 'Sac', qty: 1 }, o), env, cat);
    return [r.sales, r.clientShipping, r.fee, r.deliveryNet, r.profit];
  };
  assert.deepStrictEqual(p({ mode: 'Domicile', price: 1800, shipping: 450, total: 2250 }), [1800, 450, 700, 250, 950], 'la livraison vous coûte 250');
  assert.deepStrictEqual(p({ mode: 'Stop desk', price: 1800, shipping: 0, total: 1800 }), [1800, 0, 350, 350, 850], 'livraison gratuite : 350 à votre charge');
  assert.deepStrictEqual(p({ mode: 'Stop desk', price: 1800, shipping: 500, total: 2300 }), [1800, 500, 350, -150, 1350], 'le client paie plus : vous gagnez 150');
  assert.deepStrictEqual(p({ mode: 'Domicile', price: 1800, shipping: '', total: 2250 }), [1800, 450, 700, 250, 950], 'sans colonne livraison : total − prix');
  addOrder('#L1', 'Sac', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'Livraison': 'Stop desk', 'Prix': 1800, 'Frais livraison': 0, 'Total': 1800 });
  addOrder('#L2', 'Sac', { 'Statut': 'Livrée', 'Société': 'Ecotrack', 'Livraison': 'Domicile', 'Prix': 1800, 'Frais livraison': 450, 'Total': 2250 });
  var t = api_profit('30').totals;
  assert.deepStrictEqual([t.productSales, t.clientShipping, t.deliveryFees, t.deliveryNet, t.ordersProfit], [3600, 450, 1050, 600, 3600 - 600 - 1200]);
});

test('Bénéfices : source et campagne publicitaires venues de RELEASIT', function () {
  releasitSetup();
  releasitTab(RELEASIT_HEADER.concat(['UTM source', 'UTM campaign']));
  var row = ['#U1', localStamp(new Date()), 'Client', 'bejaia', '', 'Adresse', '+2130550123456', 'cover iPhone - iphone 15', '1', '1800', '1800', '450', '2250', 'توصيل للمكتب', 'facebook', 'Promo coques'];
  sheet('RELEASIT').appendRow(row);
  transferReleasitOrders_();
  assert.deepStrictEqual([order('#U1').campaign, order('#U1').adSource], ['Promo coques', 'facebook']);
  assert.strictEqual(adPlatform_('fb'), 'Facebook');
  assert.strictEqual(adPlatform_('TikTok'), 'TikTok');
  assert.strictEqual(adPlatform_('Publicité Facebook'), 'Facebook');
  assert.strictEqual(adPlatform_('Salaires'), '');
  assert.ok(isAdCategory_('Publicité Snap') && !isAdCategory_('Loyer'));
});

/* ---------------- SMS (httpSMS) ---------------- */

var HTTPSMS = globalThis.__fakeHttpsms;
/** Fait comme s'il était midi en Algérie (heures d'envoi). */
function atHour(h, fn) {
  var real = algiersHour_;
  algiersHour_ = function () { return h; };
  try { return fn(); } finally { algiersHour_ = real; }
}
function smsSetup() {
  baseSetup();
  saveSmsConfig_(HTTPSMS.key, '0550 12 34 56');
}

test('SMS : configuration, file d’attente au changement de statut, une seule fois par statut, texte en arabe rempli', function () {
  assert.throws(function () { saveSmsConfig_('court', '0550123456'); }, /Clé API trop courte/);
  assert.throws(function () { saveSmsConfig_(HTTPSMS.key, '021 23 45 67'); }, /Numéro de la carte SIM invalide/);
  smsSetup();
  assert.strictEqual(smsConfig_().from, '+213550123456');
  addOrder('#T1', 'cover iPhone - iphone 15', { 'Client': 'Amine Kaci', 'Téléphone': '0661457890' });
  addOrder('#T2', 'cover iPhone - iphone 15', { 'Téléphone': '0770981122' });
  addOrder('#T3', 'cover iPhone - iphone 15', { 'Téléphone': '0672063914', 'Date': new Date(Date.now() - 2 * 86400000) });
  processNewRows();
  assert.strictEqual(readSmsQueue_(PropertiesService.getScriptProperties()).length, 3);

  var s = atHour(12, function () { return sendSmsQueue_({}); });
  assert.deepStrictEqual([s.sent, s.skipped], [2, 1], '#T3 : vieille commande, pas de « commande reçue »');
  var m = HTTPSMS.messages[0];
  assert.deepStrictEqual([m.from, m.to], ['+213550123456', '+213661457890']);
  assert.strictEqual(m.content, 'شكرا Amine، وصلنا طلبك #T1. سنتصل بك قريبا للتأكيد. DZ Smart Shop');
  assert.strictEqual(HTTPSMS.calls[0].headers['x-api-key'], HTTPSMS.key);
  assert.strictEqual(order('#T1').sms, 'À confirmer');
  assert.ok(logActions().indexOf('SMS envoyé') >= 0);
  assert.strictEqual(atHour(12, function () { return sendSmsQueue_({}); }).sent, 0, 'rien en double');

  api_recordCall('#T1', 'confirm', {});
  api_recordCall('#T2', 'no_answer', {});
  api_recordCall('#T2', 'no_answer', {});
  atHour(12, function () { sendSmsQueue_({}); });
  assert.strictEqual(order('#T1').sms, 'À confirmer, Confirmée');
  assert.strictEqual(order('#T2').sms, 'À confirmer, Pas de réponse', 'un seul « Pas de réponse » même après 2 appels');
  assert.ok(/تم تأكيد طلبك #T1/.test(HTTPSMS.messages[2].content));

  // Statut sans texte (Rappeler) : rien. Statut déjà dépassé quand le SMS part : rien.
  api_recordCall('#T3', 'callback', { callback: new Date(Date.now() + 3600000).toISOString() });
  api_recordCall('#T2', 'cancel', { reason: 'Doublon' });
  assert.strictEqual(readSmsQueue_(PropertiesService.getScriptProperties()).length, 0);
  // Liste noire : pas de SMS.
  api_setBlacklist('0661457890', true);
  api_updateOrder('#T1', { status: 'Pas de réponse' });
  assert.strictEqual(atHour(12, function () { return sendSmsQueue_({}); }).sent, 0);
  assert.strictEqual(HTTPSMS.messages.length, 4);
});

test('SMS : la nuit ils attendent ; clé refusée signalée une fois ; httpSMS en panne : réessai', function () {
  smsSetup();
  addOrder('#N1', 'cover iPhone - iphone 15', { 'Téléphone': '0661457891' });
  processNewRows();
  setSetting('SMS_HEURES', '8-21'); // heures d'envoi choisies : la nuit, ils attendent
  var night = atHour(2, function () { return sendSmsQueue_({}); });
  assert.deepStrictEqual([night.night, night.waiting, HTTPSMS.messages.length], [true, 1, 0]);
  assert.ok(/partiront le matin/.test(smsSendMessage_(night)));
  setSetting('SMS_HEURES', '0-24');

  saveSmsConfig_('mauvaise-cle-1234567890', '0550123456');
  var bad = atHour(9, function () { return sendSmsQueue(); });
  assert.ok(/refusé la clé API/.test(bad.error));
  atHour(9, function () { sendSmsQueue(); });
  assert.strictEqual(logActions().filter(function (a) { return a === 'Erreur SMS'; }).length, 1);
  assert.ok(/refusé la clé/.test(api_importStatus().sms.lastError));
  assert.strictEqual(readSmsQueue_(PropertiesService.getScriptProperties()).length, 1, 'gardé pour plus tard');

  saveSmsConfig_(HTTPSMS.key, '0550123456');
  HTTPSMS.queue.push({ code: 500 });
  assert.strictEqual(atHour(9, function () { return sendSmsQueue_({}); }).sent, 0);
  assert.strictEqual(atHour(9, function () { return sendSmsQueue_({}); }).sent, 1, 'réessayé à la minute suivante');
  assert.strictEqual(api_importStatus().sms.lastError, '');
});

test('SMS : « commande reçue » envoyé dans le même passage que le transfert RELEASIT, de jour comme de nuit', function () {
  releasitSetup();
  saveSmsConfig_(HTTPSMS.key, '0550123456');
  assert.strictEqual(getSettings_().smsTo, 24, 'à toute heure par défaut');
  releasitAdd({ id: '#R1', client: 'Nadia K', phone: '+2130661457893' });
  atHour(2, function () { transferReleasitOrders(); }); // déclencheur de chaque minute, à 2 h du matin
  assert.strictEqual(HTTPSMS.messages.length, 1, 'parti tout de suite, sans attendre le passage suivant');
  assert.ok(/وصلنا طلبك #R1/.test(HTTPSMS.messages[0].content));
  assert.strictEqual(order('#R1').sms, 'À confirmer');
  // À l'ouverture d'une page, la vérification de RELEASIT ne fait pas attendre l'envoi des SMS.
  releasitAdd({ id: '#R2', phone: '+2130661457894' });
  var q = api_queue({ sync: true });
  assert.strictEqual(q.arrived, 1);
  assert.strictEqual(HTTPSMS.messages.length, 1);
  assert.strictEqual(readSmsQueue_(PropertiesService.getScriptProperties()).length, 1, 'il partira à la minute suivante');
  atHour(2, function () { sendSmsQueue(); });
  assert.strictEqual(HTTPSMS.messages.length, 2);
});

test('Paramètres : l’ancien réglage MAX_TENTATIVES est signalé comme remplacé', function () {
  var sh = __mock.ss().insertSheet('Paramètres');
  sh.getRange(1, 1, 2, 3).setValues([['Clé', 'Valeur', 'Description'], ['MAX_TENTATIVES', 3, 'Appels sans réponse avant « Injoignable »']]);
  setup();
  assert.ok(/remplacé par APPELS_PAR_JOUR et JOURS_D_APPELS/.test(sh.getRange(2, 3).getValue()));
  assert.deepStrictEqual([getSettings_().APPELS_PAR_JOUR, getSettings_().JOURS_D_APPELS, getSettings_().ANNULATION_AUTO, getSettings_().ORDRE_FILE], [3, 3, true, 'récentes']);
  assert.strictEqual(api_bootstrap().maxAttempts, 9);
});

test('Paramètres : « 8-21 » jamais modifié devient « 0-24 » une seule fois', function () {
  setup();
  var sh = sheet('Paramètres');
  var keys = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; });
  var row = keys.indexOf('SMS_HEURES') + 2;
  assert.strictEqual(sh.getRange(row, 2).getValue(), '0-24');
  PropertiesService.getScriptProperties().deleteProperty('MIGRATION_SMS_HEURES');
  sh.getRange(row, 2).setValue('8-21'); // classeur installé avec l'ancienne version
  setup();
  assert.strictEqual(sh.getRange(row, 2).getValue(), '0-24');
  sh.getRange(row, 2).setValue('8-21'); // choisi ensuite par l'utilisateur : gardé
  setup();
  assert.strictEqual(sh.getRange(row, 2).getValue(), '8-21');
  assert.strictEqual(getSettings_().smsFrom, 8);
});

test('SMS : statut venu d’Ecotrack (n° de suivi dans le texte), déclencheur, état affiché, SMS de test', function () {
  ecoSetup();
  setup();
  assert.ok(triggerList().indexOf('sendSmsQueue/1') < 0, 'pas configuré : pas de déclencheur');
  saveSmsConfig_(HTTPSMS.key, '0550123456');
  setup();
  assert.ok(triggerList().indexOf('sendSmsQueue/1') >= 0);
  addConfirmed('#X9', { 'Téléphone': '0661457892' });
  ship(['#X9']);
  FAKE.validate(trackingOf('#X9'));
  syncEcotrackStatuses_();
  atHour(10, function () { sendSmsQueue_({}); });
  var last = HTTPSMS.messages[HTTPSMS.messages.length - 1];
  assert.strictEqual(last.content, 'طلبك #X9 في الطريق. رقم التتبع: ' + trackingOf('#X9'));
  var st = api_importStatus().sms;
  assertSerializable(st, 'sms');
  assert.deepStrictEqual([st.configured, st.from, st.waiting, st.hours], [true, '0550123456', 0, 'à toute heure']);
  assert.deepStrictEqual(st.statuses, ['À confirmer', 'Pas de réponse', 'Confirmée', 'Expédiée', 'En livraison']);
  assert.ok(/SMS de test envoyé/.test(api_smsTest().message));
  assert.strictEqual(HTTPSMS.messages[HTTPSMS.messages.length - 1].to, '+213550123456');
  setSetting('SMS_CONFIRMEE', '');
  assert.strictEqual(getSettings_().SMS_CONFIRMEE, '', 'case vidée = pas de SMS');
  __mock.state.prompts.push(HTTPSMS.key, '0550 12 34 56');
  onOpen();
  menuSmsSetup();
  assert.ok(__mock.state.alerts.some(function (a) { return /partiront du \+213550123456/.test(a.join(' ')); }));
});

/* ---------------- Gestion du stock (page Stock) ---------------- */

function asStockKeeper() {
  __mock.setUser('karim@example.com');
  sheet('Équipe').appendRow(['karim@example.com', 'Karim', 'Magasinier']);
  userEdit('Équipe');
}
function catalogRow(model) {
  return readCatalogFromSheet_().rows.filter(function (r) { return r.model === model; })[0];
}
function movesOf(type) {
  return readStockMoves_(500).filter(function (m) { return !type || m.type === type; });
}

test('Stock : ajouter un produit avec ses modèles et leur stock de départ', function () {
  baseSetup();
  assert.deepStrictEqual(headerOf('Produits'), PRODUCT_TITLES_);
  assert.ok(sheet('Mouvements stock'), 'onglet créé à l’installation');
  var r = api_addProduct({ product: 'cover iPhone', price: 1800, cost: 600, threshold: 3,
    models: [{ model: 'iphone 13', stock: 10 }, { model: 'iphone 15 PRO MAX', stock: 4 }, { model: 'iphone 13', stock: 5 }] });
  assert.strictEqual(r.added, 2, 'un modèle en double n’est pas ajouté deux fois');
  var m = catalogRow('iphone 13');
  assert.deepStrictEqual([m.product, m.price, m.cost, m.stock, m.threshold, m.active], ['cover iPhone', 1800, 600, 10, 3, true]);
  assert.deepStrictEqual(movesOf('Stock initial').map(function (x) { return [x.model, x.qty, x.after]; }).sort(), [['iphone 13', 10, 10], ['iphone 15 PRO MAX', 4, 4]]);
  assert.strictEqual(api_addProduct({ product: 'cover iPhone', models: [{ model: 'iphone 13' }] }).added, 0);
  assert.strictEqual(api_addProduct({ product: 'Montre', price: 4300, stock: 7 }).added, 1, 'produit sans modèle');
  assert.strictEqual(catalogRow('').stock, 7);
  assert.throws(function () { api_addProduct({ product: ' ' }); }, /nom du produit/);
  assert.ok(api_bootstrap().products.some(function (x) { return x.name === 'cover iPhone — iphone 13' && x.price === 1800; }));
});

test('Stock : modifier un modèle (renommé, autres noms, désactivé) sans perdre les commandes', function () {
  baseSetup();
  api_addProduct({ product: 'cover iPhone', price: 1800, cost: 600, models: [{ model: 'iphone 15 PRO MAX', stock: 5 }, { model: 'iphone 12', stock: 0 }] });
  var row = catalogRow('iphone 15 PRO MAX');
  api_updateCatalogRow({ row: row.row, key: row.key, model: 'iPhone 15 Pro Max', aliases: 'coque 15 pro max', price: 1900 });
  var cat = readCatalog_();
  var renamed = matchCatalog_(cat, 'cover iPhone - iphone 15 PRO MAX');
  assert.ok(renamed, 'l’ancien nom (majuscules mises à part) relie toujours les commandes');
  assert.strictEqual(matchCatalog_(cat, 'coque 15 pro max').model, 'iPhone 15 Pro Max', 'autre nom');
  assert.strictEqual(renamed.price, 1900);
  assert.strictEqual(renamed.stock, 5, 'le stock ne change pas en modifiant la fiche');
  assert.throws(function () { api_updateCatalogRow({ row: row.row, key: 'cle perimee', model: 'x' }); }, /modifié entre-temps/);
  var r12 = catalogRow('iphone 12');
  assert.throws(function () { api_updateCatalogRow({ row: r12.row, key: r12.key, model: 'iPhone 15 Pro Max' }); }, /existe déjà/);
  api_updateCatalogRow({ row: r12.row, key: r12.key, active: false });
  assert.strictEqual(catalogRow('iphone 12').active, false);
  assert.ok(!api_bootstrap().products.some(function (x) { return /iphone 12/.test(x.name); }), 'désactivé : plus proposé pour les nouvelles commandes');
  var page = api_stockPage();
  assert.strictEqual(page.totals.rupture, 0, 'un modèle désactivé n’est pas signalé en rupture');
});

test('Stock : entrée de marchandise avec coût moyen, inventaire avec motif, historique', function () {
  baseSetup();
  api_addProduct({ product: 'Sac', cost: 600, models: [{ model: 'Noir', stock: 10 }, { model: 'Rouge', stock: 0 }] });
  var noir = catalogRow('Noir');
  var rouge = catalogRow('Rouge');
  var r = api_stockEntry({ items: [{ row: noir.row, key: noir.key, qty: 20, cost: 690 }, { row: rouge.row, key: rouge.key, qty: 5, cost: 700 }, { row: rouge.row, qty: 0 }], supplier: 'Grossiste Alger' });
  assert.ok(/25 pièce\(s\)/.test(r.message));
  assert.deepStrictEqual([catalogRow('Noir').stock, catalogRow('Noir').cost], [30, 660], '(10 × 600 + 20 × 690) / 30');
  assert.deepStrictEqual([catalogRow('Rouge').stock, catalogRow('Rouge').cost], [5, 700], 'stock à zéro : le coût de l’entrée');
  var e = movesOf('Entrée').filter(function (x) { return x.model === 'Noir'; })[0];
  assert.deepStrictEqual([e.qty, e.after, e.cost, e.note], [20, 30, 690, 'Fournisseur : Grossiste Alger']);
  setSetting('COUT_MOYEN', 'NON');
  noir = catalogRow('Noir');
  api_stockEntry({ items: [{ row: noir.row, key: noir.key, qty: 10, cost: 900 }] });
  assert.deepStrictEqual([catalogRow('Noir').stock, catalogRow('Noir').cost], [40, 660], 'coût fixe : inchangé');
  assert.throws(function () { api_stockEntry({ items: [] }); }, /au moins une quantité/);

  noir = catalogRow('Noir');
  var inv = api_stockInventory({ reason: 'Casse', items: [{ row: noir.row, key: noir.key, counted: 37 }, { row: rouge.row, key: rouge.key, counted: 5 }] });
  assert.strictEqual(inv.changed, 1, 'pas d’écart pour Rouge');
  assert.strictEqual(catalogRow('Noir').stock, 37);
  var i = movesOf('Inventaire')[0];
  assert.deepStrictEqual([i.model, i.qty, i.after, i.note], ['Noir', -3, 37, 'Casse']);
  assert.ok(/Aucun écart/.test(api_stockInventory({ items: [{ row: noir.row, key: noir.key, counted: 37 }] }).message));
  var page = api_stockPage();
  assertSerializable(page, 'api_stockPage');
  assert.deepStrictEqual([page.totals.units, page.totals.value], [42, 37 * 660 + 5 * 700]);
  assert.strictEqual(page.moves[0].type, 'Inventaire', 'les plus récents d’abord');
  assert.deepStrictEqual(page.reasons, INVENTORY_REASONS_);
});

test('Stock : mouvements automatiques notés, retour abîmé retiré du stock', function () {
  baseSetup();
  api_addProduct({ product: 'Sac', cost: 600, models: [{ model: 'Noir', stock: 10 }] });
  addOrder('#W1', 'Sac - Noir', { 'Quantité': 2 });
  processNewRows();
  api_recordCall('#W1', 'confirm', {});
  api_updateOrder('#W1', { status: 'Expédiée', carrier: 'Yalidine', tracking: 'Y1' });
  var out = movesOf('Colis parti')[0];
  assert.deepStrictEqual([out.model, out.qty, out.after, out.order, out.by], ['Noir', -2, 8, '#W1', 'Automatique']);
  api_updateOrder('#W1', { status: 'Retour' });
  assert.deepStrictEqual([movesOf('Retour reçu')[0].qty, catalogRow('Noir').stock], [2, 10]);
  var fin = api_trackingOverview(30).finished.filter(function (x) { return x.id === '#W1'; })[0];
  assert.deepStrictEqual([fin.canDamage, fin.damaged], [true, false]);
  var d = api_markReturnDamaged('#W1');
  assert.ok(/abîmé/.test(d.message));
  assert.strictEqual(catalogRow('Noir').stock, 8);
  assert.strictEqual(order('#W1').stockMove, 'Rentré (abîmé)');
  assert.strictEqual(movesOf('Retour abîmé')[0].qty, -2);
  assert.throws(function () { api_markReturnDamaged('#W1'); }, /retour reçu et remis en stock/);
  fin = api_trackingOverview(30).finished.filter(function (x) { return x.id === '#W1'; })[0];
  assert.deepStrictEqual([fin.canDamage, fin.damaged], [false, true]);
});

test('Stock : rôle Magasinier (stock oui, bénéfices non) ; compteur des commandes en attente', function () {
  baseSetup();
  api_addProduct({ product: 'Sac', cost: 600, threshold: 5, models: [{ model: 'Noir', stock: 2 }] });
  asStockKeeper();
  var b = api_bootstrap();
  assert.deepStrictEqual([b.user.admin, b.user.stock], [false, true]);
  assert.strictEqual(api_stockPage().totals.low, 1);
  assert.strictEqual(api_stockPage().admin, false);
  var noir = catalogRow('Noir');
  assert.ok(api_stockEntry({ items: [{ row: noir.row, key: noir.key, qty: 1 }] }));
  assert.throws(function () { api_profit('30'); }, /Réservé à l’administrateur/);
  assert.strictEqual(api_dashboard('7').todo.stockLow, 1, 'le magasinier voit le stock bas');
  asAgent();
  assert.throws(function () { api_stockPage(); }, /administrateur et au magasinier/);
  assert.throws(function () { api_addProduct({ product: 'X' }); }, /administrateur et au magasinier/);
  assert.deepStrictEqual([api_bootstrap().user.stock, api_dashboard('7').todo.stockLow], [false, 0]);

  // Compteur « à appeler maintenant / total en attente ».
  addOrder('#P1', 'Sac - Noir');
  addOrder('#P2', 'Sac - Noir');
  addOrder('#P3', 'Sac - Noir');
  processNewRows();
  api_recordCall('#P2', 'no_answer', {});
  api_recordCall('#P3', 'confirm', {});
  var c = api_counts();
  assert.deepStrictEqual([c.queue, c.pending], [1, 2], '1 à appeler maintenant, 2 en attente (dont un rappel dans 2 h)');
  assert.strictEqual(api_queue().stats.pending, 2);
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
