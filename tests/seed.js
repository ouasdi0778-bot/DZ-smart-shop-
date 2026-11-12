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
      if (m.hoursAgo < 20) return;
      var carrier = i % 3 === 0 ? 'Ecotrack' : 'Yalidine';
      var tracking = (carrier === 'Yalidine' ? 'YAL-' : 'ECO-') + (500000 + i * 37);
      var status = m.hoursAgo < 50 ? 'En livraison' : (fate === 3 || fate === 5 ? 'Retour' : 'Livrée');
      api_updateOrder(m.id, { status: status, carrier: carrier, tracking: tracking });
    } catch (e) {
      // Une commande peut déjà avoir été traitée : on l'ignore.
    }
  });
  __mock.setUser('imane@example.com');
  api_setBlacklist('0555001199', true, 'Refus répétés');
  recalcAlerts();
}
