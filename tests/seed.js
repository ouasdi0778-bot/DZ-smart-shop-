/** Connecte l'outil au faux Shopify et importe quelques commandes Releasit (aperçu uniquement). */
function seedShopify_() {
  if (typeof __fakeShopify === 'undefined') return;
  saveShopifyConfig_('algerie-smart.myshopify.com', __fakeShopify.token, '');
  var minutes = function (m) { return new Date(Date.now() - m * 60000).toISOString(); };
  __fakeShopify.add({ name: '#2001', client: 'قصي', phoneInput: '672063914', wilaya: 'سطيف', address: 'العلمة', createdAt: minutes(40),
    items: [{ title: "LED d'ambiance voiture", quantity: 1, variantTitle: null }], subtotal: 3300, total: 3750 });
  __fakeShopify.add({ name: '#2002', client: 'Soufiane', phoneInput: '0660894700', wilaya: 'Ouargla', address: 'Ouargla', createdAt: minutes(12), utm: '120252610599940199' });
  __fakeShopify.add({ name: '#2003', client: 'سعد', phoneInput: '0663253847', wilaya: 'الجزائر', address: 'في الحراش', shipTitle: 'التوصيل للمنزل', createdAt: minutes(3),
    items: [{ title: 'chargeur moto', quantity: 2, variantTitle: null }], subtotal: 2400, total: 2850 });
  importShopifyOrders_();
}

/**
 * Onglet RELEASIT tel que Releasit COD le remplit (aperçu uniquement, noms inventés).
 * Une ligne est déjà transférée ; les deux suivantes arrivent à l'ouverture de la page Commandes.
 */
function seedReleasit_() {
  var sh = ss_().getSheetByName('RELEASIT') || ss_().insertSheet('RELEASIT');
  var header = ['Order ID', 'Date', 'Client', 'Wilaya', 'Commune', 'Adresse', 'Téléphone', 'Produit et variant', 'Quantité',
    'prix de produit ', 'sous total ', 'prix de livraison  ', 'prix total ', 'type de livraison '];
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  var stamp = function (m) {
    var d = new Date(Date.now() - m * 60000);
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  };
  sh.appendRow(['#2004', stamp(25), 'Nadir B.', 'bejaia', 'البلدية أقبو', 'Cité 100 logements', '+2130551234567', 'cover iPhone  - iphone 15 PRO MAX', '3', '5400', '5400', '450', '5850', 'توصيل للمكتب ']);
  transferReleasitOrders_();
  sh.appendRow(['#2005', stamp(4), 'Lina K.', 'Oran', 'البلدية بئر الجير', 'Hai Khemisti', '+2130662345678', 'cover iPhone  - iphone 13', '1', '1800', '1800', '650', '2450', 'التوصيل للمنزل']);
  sh.appendRow(['#2006', stamp(1), 'Walid M.', 'الجزائر', 'البلدية باب الزوار', 'Rue des frères', '+2130773456789', 'chargeur moto', '2', '2400', '2400', '400', '2800', 'توصيل للمكتب ']);
}

/** Connecte l'outil au faux Ecotrack (aperçu et tests uniquement). */
function seedEcotrackConnection_() {
  saveEcotrackConfig_(__fakeEcotrack.host, __fakeEcotrack.token);
}

/**
 * Envoie des commandes confirmées au faux Ecotrack, puis fait « avancer » leurs
 * colis (livré, retour, en livraison) et relit les statuts, comme en vrai.
 */
function seedEcotrack_(list) {
  seedEcotrackConnection_();
  syncEcotrackFees_();
  var sent = shipToEcotrack_(list.map(function (x) { return x.id; }), { name: 'Imane' });
  var tracking = {};
  sent.forEach(function (r) { if (r.ok) tracking[r.id] = r.tracking; });

  // Vous validez dans l'interface d'Ecotrack, puis les colis avancent chez Ecotrack.
  var cycle = ['paye_et_archive', 'en_livraison', 'suspendu', 'en_hub', 'livre_non_encaisse',
    'retour_en_traitement', 'encaisse_non_paye', 'retour_recu', 'en_livraison', 'paiements_prets'];
  var moved = {};
  list.forEach(function (x, idx) {
    var t = tracking[x.id];
    if (!t) return;
    __fakeEcotrack.validate(t);
    var at = function (hoursBack) {
      var d = new Date(Date.now() - hoursBack * 3600000);
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + ' ' +
        ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':00';
    };
    __fakeEcotrack.history[t] = [
      { activity: 'order_information_received_by_carrier', date: at(60), content: 'Validé par le vendeur' },
      { activity: 'picked', date: at(50) },
      { activity: 'accepted_by_carrier', date: at(36) },
      { activity: 'dispatched_to_driver', date: at(20) },
      { activity: 'attempt_delivery', date: at(18), remarque: 'Client absent, nouvelle tentative demain' }
    ];
    var s = cycle[idx % cycle.length];
    __fakeEcotrack.setStatus(t, s);
    if (s === 'paye_et_archive') __fakeEcotrack.setPayment(t, idx % 2 ? 312 : 318);
    if (s === 'suspendu') moved[x.id] = 3;
    if (s === 'en_hub') moved[x.id] = 40;              // sans mouvement depuis plus de 26 h
    if (s === 'retour_en_traitement') moved[x.id] = 6;
  });
  syncEcotrackStatuses_();

  // Deux colis créés mais jamais validés : l'un depuis longtemps.
  var ready = api_shippingList().toShip.filter(function (o) { return !o.problems.length; }).slice(0, 2);
  var created = ready.length ? shipToEcotrack_(ready.map(function (o) { return o.id; }), { name: 'Imane' }) : [];
  if (created[0] && created[0].ok) moved[created[0].id] = 30;
  syncEcotrackStatuses_();

  // Dates de dernier mouvement réalistes pour la page Suivi.
  var ctx = readOrders_();
  Object.keys(moved).forEach(function (id) {
    var o = findOrder_(ctx, id);
    if (o) writeFields_(ctx, o, { carrierMoved: new Date(Date.now() - moved[id] * 3600000) });
  });
}

/**
 * Premier jour : classeur installé, quelques tarifs, et 2 commandes
 * qui viennent d'arriver de Shopify (pour montrer le démarrage).
 */
function seedFirstOrders_() {
  setup();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rates = ss.getSheetByName('Tarifs');
  rates.getRange(17, 2, 1, 4).setValues([[600, 400, 650, 380]]); // 16 - Alger
  rates.getRange(32, 2, 1, 4).setValues([[750, 450, 700, 420]]); // 31 - Oran
  var sh = ss.getSheetByName('Commandes');
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var add = function (fields) {
    var row = header.map(function (t) { return fields[t] === undefined ? '' : fields[t]; });
    sh.appendRow(row);
  };
  var now = Date.now();
  add({ 'N°': '#1001', 'Date': new Date(now - 25 * 60000), 'Client': 'Yacine Boudiaf', 'Téléphone': '+213 550 12 34 56',
    'Wilaya': 'Alger', 'Commune': 'Bab Ezzouar', 'Adresse': 'Cité 2068 logements, bât. 14', 'Produit': 'Montre connectée',
    'Quantité': 1, 'Prix': 4300, 'Source': 'Shopify' });
  add({ 'N°': '#1002', 'Date': new Date(now - 8 * 60000), 'Client': 'Amina Kaci', 'Téléphone': '661457890',
    'Wilaya': 'oran', 'Commune': 'Bir El Djir', 'Adresse': 'Cité USTO, bloc C', 'Produit': 'Sac à main',
    'Quantité': 2, 'Prix': 7400, 'Livraison': 'Stop desk', 'Source': 'Shopify' });
  processNewRows();
  if (typeof __fakeEcotrack !== 'undefined') seedEcotrackConnection_();
  seedShopify_();
}

/**
 * Données d'exemple : remplit un classeur imité avec ~40 commandes,
 * comme si elles venaient de Shopify, puis en fait avancer une partie
 * (confirmées, expédiées, livrées, retours, annulées).
 * Utilisé par l'aperçu local (npm run preview), jamais dans Google.
 */
function seedDemo_() {
  setup();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tarifs d'exemple (à remplacer par les vôtres).
  var south = [1, 8, 11, 30, 33, 37, 39, 47, 49, 50, 52, 53, 54, 55, 56, 57, 58];
  var rates = ss.getSheetByName('Tarifs');
  var rateRows = rates.getRange(2, 1, WILAYAS.length, 5).getValues().map(function (row, i) {
    var code = i + 1;
    var base = code === 16 ? 400 : (south.indexOf(code) >= 0 ? 800 : 550);
    return [row[0], base + 200, base, base + 150, base - 50];
  });
  rates.getRange(2, 1, rateRows.length, 5).setValues(rateRows);

  ss.getSheetByName('Équipe').getRange(2, 1, 3, 3).setValues([
    ['admin@example.com', 'Admin', 'Administrateur'],
    ['imane@example.com', 'Imane', 'Confirmatrice'],
    ['sonia@example.com', 'Sonia', 'Confirmatrice']
  ]);
  ss.getSheetByName('Produits').getRange(2, 1, 4, 4).setValues([
    ['Montre connectée', 4300, 2100, 40],
    ['Sac à main', 3700, 1600, 25],
    ['Écouteurs sans fil', 2600, 1100, 60],
    ['Crème visage', 1700, 600, 80]
  ]);

  var people = [
    ['Yacine Boudiaf', '0550 12 34 56'], ['Amina Kaci', '+213 661 45 78 90'], ['Karim Saadi', 770981122],
    ['Sara Mebarki', '0552334455'], ['Mohamed Amrani', '0698-76-54-32'], ['Nadia Hamdi', '0541226688'],
    ['Rachid Touati', '00213779102030'], ['Lina Djebbar', '0555001199'], ['Walid Zerrouki', '0697551240'],
    ['Souad Larbi', '0540876521'], ['Hichem Rahmani', '0662110022'], ['Meriem Ferhat', '0771234500'],
    ['Omar Kadri', '0556778899'], ['Yasmine Belkacem', '0660990011'], ['Fares Mansouri', '12345']
  ];
  var places = [
    ['alger', 'Bab Ezzouar'], ['Oran', 'Bir El Djir'], ['25', 'El Khroub'], ['Sétif', 'El Eulma'],
    ['09 - Blida', 'Boufarik'], ['Ghardaia', 'Metlili'], ['Tizi Ouzou', 'Azazga'], ['Béjaïa', 'Akbou'],
    ['Constantine', 'Ali Mendjeli'], ['Ouargla', 'Hassi Messaoud'], ['Tlemcen', 'Maghnia'], ['Batna', 'Barika'],
    ['Annaba', 'El Bouni'], ['Tamanrasset', 'In Amguel']
  ];
  var products = [['Montre connectée', 4300], ['Sac à main', 3700], ['Écouteurs sans fil', 2600], ['Crème visage', 1700]];

  var seed = 7;
  var rnd = function (n) { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };

  var sh = ss.getSheetByName('Commandes');
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var col = function (title) { return header.indexOf(title); };
  var now = Date.now();
  var made = [];
  for (var i = 0; i < 42; i++) {
    var person = people[i % people.length];
    var place = places[rnd(places.length)];
    var product = products[rnd(products.length)];
    var qty = rnd(5) === 0 ? 2 : 1;
    var hoursAgo = i < 9 ? i * 0.6 + 0.2 : 6 + (i - 9) * 11 + rnd(8);
    var row = header.map(function () { return ''; });
    row[col('N°')] = '#' + (1100 + 42 - i);
    row[col('Date')] = new Date(now - hoursAgo * 3600000);
    row[col('Client')] = person[0];
    row[col('Téléphone')] = person[1];
    row[col('Wilaya')] = place[0];
    row[col('Commune')] = place[1];
    row[col('Adresse')] = 'Cité ' + (100 + rnd(400)) + ' logements, bât. ' + (1 + rnd(20));
    row[col('Produit')] = product[0];
    row[col('Quantité')] = qty;
    row[col('Prix')] = product[1] * qty;
    row[col('Livraison')] = rnd(3) === 0 ? 'Stop desk' : '';
    row[col('Source')] = 'Shopify';
    sh.appendRow(row);
    made.push({ id: row[col('N°')], hoursAgo: hoursAgo });
  }
  processNewRows();

  // Faire avancer les commandes plus anciennes.
  var viaEcotrack = [];
  var agents = ['imane@example.com', 'sonia@example.com'];
  made.forEach(function (m, i) {
    if (m.hoursAgo < 5) return;
    __mock.setUser(agents[i % 2]);
    var fate = i % 10;
    try {
      if (fate === 0 || fate === 7) {
        api_recordCall(m.id, 'cancel', { reason: fate === 0 ? 'Faux numéro' : "Client a changé d'avis" });
        return;
      }
      if (fate === 9 && m.hoursAgo < 60) {
        api_recordCall(m.id, 'no_answer', {});
        return;
      }
      if (fate === 8 && m.hoursAgo < 60) {
        api_recordCall(m.id, 'callback', { callback: new Date(now + 3 * 3600000).toISOString() });
        return;
      }
      api_recordCall(m.id, 'confirm', {});
      // Les plus récentes restent « confirmées, à expédier » (dont 2 avec un numéro invalide).
      if (m.hoursAgo < 20 || i % 5 === 2 || i === 14 || i === 29) return;
      var carrier = i % 3 === 0 ? 'Ecotrack' : 'Yalidine';
      var status = m.hoursAgo < 50 ? 'En livraison' : (fate === 3 || fate === 5 ? 'Retour' : 'Livrée');
      if (carrier === 'Ecotrack' && typeof __fakeEcotrack !== 'undefined') {
        // Les colis Ecotrack passent par le faux serveur : envoi, n° de suivi, statuts.
        viaEcotrack.push({ id: m.id, status: status });
        return;
      }
      var tracking = (carrier === 'Yalidine' ? 'YAL-' : 'ECO-') + (500000 + i * 37);
      api_updateOrder(m.id, { status: status, carrier: carrier, tracking: tracking });
    } catch (e) {
      // Une commande peut déjà avoir été traitée : on l'ignore.
    }
  });
  if (viaEcotrack.length) seedEcotrack_(viaEcotrack);
  __mock.setUser('imane@example.com');
  api_setBlacklist('0555001199', true, 'Refus répétés');
  seedShopify_();
  seedReleasit_();
  recalcAlerts();
}
