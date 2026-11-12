/**
 * DZ Smart Shop 0.1.0 — gestion des commandes COD (fichier unique).
 *
 * INSTALLATION
 * 1. Dans le classeur : Extensions › Apps Script.
 * 2. Effacez tout le contenu de Code.gs, collez ce fichier à la place, puis Enregistrer.
 * 3. Revenez au classeur, rechargez la page : menu « DZ Smart Shop › Installer / réparer le classeur ».
 *
 * Fichier généré automatiquement (npm run bundle) depuis le dossier apps-script/.
 * Pour modifier le code, modifiez apps-script/ puis régénérez ce fichier.
 */

/* ======================= Config.gs ======================= */

/**
 * DZ Smart Shop — gestion des commandes COD sur Google Sheets.
 *
 * Config.gs : noms des onglets, colonnes, statuts et réglages par défaut.
 * Tout le reste du code lit ces constantes : pour renommer un statut ou
 * une colonne, c'est ici qu'il faut le faire.
 */

var APP_NAME = 'DZ Smart Shop';
var APP_VERSION = '0.1.0';

/** Noms des onglets du classeur. */
var SHEET = {
  ORDERS: 'Commandes',
  CLIENTS: 'Clients',
  PRODUCTS: 'Produits',
  RATES: 'Tarifs',
  TEAM: 'Équipe',
  SETTINGS: 'Paramètres',
  LOG: 'Journal'
};

/**
 * Colonnes de l'onglet Commandes.
 * - key     : nom interne utilisé par le code
 * - title   : titre affiché dans le classeur
 * - kind    : 'in' (rempli par Shopify / à la main), 'list' (liste déroulante), 'auto' (calculé)
 * - aliases : autres titres acceptés (ex. colonnes créées par une application Shopify)
 *
 * Les colonnes sont retrouvées par leur titre : vous pouvez les déplacer
 * dans le classeur sans casser l'outil.
 */
var ORDER_COLUMNS = [
  { key: 'id', title: 'N°', kind: 'in', width: 90, aliases: ['N', 'Numéro', 'Commande', 'Order', 'Order ID', 'Order number', 'Order name', 'ID'] },
  { key: 'date', title: 'Date', kind: 'in', width: 130, aliases: ['Date de commande', 'Created at', 'Order date'] },
  { key: 'client', title: 'Client', kind: 'in', width: 160, aliases: ['Nom', 'Nom complet', 'Name', 'Full name', 'Customer', 'Nom et prénom'] },
  { key: 'phone', title: 'Téléphone', kind: 'in', width: 120, aliases: ['Tel', 'Tél', 'Phone', 'Numéro de téléphone', 'Mobile'] },
  { key: 'wilaya', title: 'Wilaya', kind: 'list', width: 150, aliases: ['Province', 'State', 'Région'] },
  { key: 'commune', title: 'Commune', kind: 'in', width: 140, aliases: ['City', 'Ville', 'Daira'] },
  { key: 'address', title: 'Adresse', kind: 'in', width: 200, aliases: ['Address', 'Adresse complète', 'Address 1'] },
  { key: 'product', title: 'Produit', kind: 'in', width: 180, aliases: ['Produits', 'Product', 'Article', 'Lineitem name'] },
  { key: 'qty', title: 'Quantité', kind: 'in', width: 80, aliases: ['Qté', 'Qty', 'Quantity'] },
  { key: 'price', title: 'Prix', kind: 'in', width: 100, aliases: ['Prix produits', 'Montant produits', 'Price', 'Subtotal', 'Sous-total'] },
  { key: 'mode', title: 'Livraison', kind: 'list', width: 110, aliases: ['Mode de livraison', 'Type de livraison', 'Delivery'] },
  { key: 'shipping', title: 'Frais livraison', kind: 'auto', width: 110, aliases: ['Frais de livraison', 'Shipping'] },
  { key: 'total', title: 'Total', kind: 'auto', width: 110, aliases: ['Total à encaisser', 'Montant total'] },
  { key: 'status', title: 'Statut', kind: 'list', width: 130, aliases: ['Status', 'État'] },
  { key: 'agent', title: 'Confirmatrice', kind: 'list', width: 130, aliases: ['Agent', 'Confirmateur'] },
  { key: 'attempts', title: 'Tentatives', kind: 'auto', width: 90, aliases: ['Appels'] },
  { key: 'callback', title: 'Rappeler le', kind: 'auto', width: 130, aliases: ['Rappel'] },
  { key: 'cancelReason', title: 'Motif annulation', kind: 'list', width: 150, aliases: ["Motif d'annulation", 'Motif'] },
  { key: 'carrier', title: 'Société', kind: 'list', width: 110, aliases: ['Société de livraison', 'Transporteur', 'Carrier'] },
  { key: 'tracking', title: 'N° de suivi', kind: 'auto', width: 130, aliases: ['Suivi', 'Tracking'] },
  { key: 'alert', title: 'Alerte client', kind: 'auto', width: 160, aliases: ['Alerte'] },
  { key: 'notes', title: 'Notes', kind: 'in', width: 200, aliases: ['Note', 'Remarque', 'Commentaire'] },
  { key: 'source', title: 'Source', kind: 'auto', width: 90, aliases: [] },
  { key: 'updated', title: 'Mis à jour', kind: 'auto', width: 130, aliases: ['Dernière mise à jour'] }
];

/** Les statuts d'une commande. */
var STATUS = {
  TO_CONFIRM: 'À confirmer',
  NO_ANSWER: 'Pas de réponse',
  CALLBACK: 'Rappeler',
  UNREACHABLE: 'Injoignable',
  CONFIRMED: 'Confirmée',
  SHIPPED: 'Expédiée',
  IN_DELIVERY: 'En livraison',
  DELIVERED: 'Livrée',
  RETURNED: 'Retour',
  CANCELLED: 'Annulée'
};

var STATUS_LIST = [
  STATUS.TO_CONFIRM, STATUS.NO_ANSWER, STATUS.CALLBACK, STATUS.UNREACHABLE,
  STATUS.CONFIRMED, STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.DELIVERED,
  STATUS.RETURNED, STATUS.CANCELLED
];

/** Couleurs des statuts (classeur et application). */
var STATUS_STYLE = {
  'À confirmer': { bg: '#E6EEFB', fg: '#1E4FA8' },
  'Pas de réponse': { bg: '#EEF0F3', fg: '#3D4350' },
  'Rappeler': { bg: '#FFF3DC', fg: '#8A5200' },
  'Injoignable': { bg: '#F3E6E6', fg: '#7A2E2E' },
  'Confirmée': { bg: '#E3F2EC', fg: '#0B6B4C' },
  'Expédiée': { bg: '#EFE9FB', fg: '#5B34A8' },
  'En livraison': { bg: '#E6F3F7', fg: '#0E6177' },
  'Livrée': { bg: '#DDF0E4', fg: '#146C2E' },
  'Retour': { bg: '#FCEBDD', fg: '#9A4200' },
  'Annulée': { bg: '#FBE7E7', fg: '#A12626' }
};

/** Statuts qui apparaissent dans la file du centre de confirmation. */
var QUEUE_STATUSES = [STATUS.TO_CONFIRM, STATUS.NO_ANSWER, STATUS.CALLBACK];
/** Statuts d'une commande confirmée (même si elle a été expédiée ensuite). */
var CONFIRMED_STATUSES = [STATUS.CONFIRMED, STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.DELIVERED, STATUS.RETURNED];
/** Statuts d'une commande remise à une société de livraison. */
var SHIPPED_STATUSES = [STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.DELIVERED, STATUS.RETURNED];

var MODES = ['Domicile', 'Stop desk'];
var CARRIERS = ['Yalidine', 'Ecotrack'];

/** Réglages modifiables dans l'onglet Paramètres : [clé, valeur par défaut, description]. */
var DEFAULT_SETTINGS = [
  ['NOM_BOUTIQUE', 'DZ Smart Shop', "Nom affiché dans l'application et dans les messages"],
  ['MAX_TENTATIVES', 3, 'Appels sans réponse avant de passer la commande en « Injoignable »'],
  ['DELAI_RAPPEL_MINUTES', 120, "Délai avant de rappeler un client qui n'a pas répondu"],
  ['DOUBLON_HEURES', 48, 'Deux commandes du même numéro dans ce délai = alerte « Doublon »'],
  ['SOCIETE_PAR_DEFAUT', 'Yalidine', "Société utilisée pour calculer les frais quand aucune n'est choisie"],
  ['MOTIFS_ANNULATION', "Faux numéro; Client a changé d'avis; Trop cher; Doublon; Commande test; Délai trop long; Autre", "Motifs proposés à l'annulation, séparés par des points-virgules"],
  ['MESSAGE_WHATSAPP', 'Bonjour {prenom}, ici {boutique}. Nous avons bien reçu votre commande {numero} : {produit}, total {total}, livraison à {commune}. Pouvez-vous nous la confirmer ? Merci !', 'Modèle du message WhatsApp. Champs : {prenom} {client} {numero} {produit} {total} {commune} {wilaya} {boutique}']
];

/** Les 58 wilayas (liste modifiable ensuite dans l'onglet Tarifs). */
var WILAYAS = [
  '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi', '05 - Batna', '06 - Béjaïa',
  '07 - Biskra', '08 - Béchar', '09 - Blida', '10 - Bouira', '11 - Tamanrasset', '12 - Tébessa',
  '13 - Tlemcen', '14 - Tiaret', '15 - Tizi Ouzou', '16 - Alger', '17 - Djelfa', '18 - Jijel',
  '19 - Sétif', '20 - Saïda', '21 - Skikda', '22 - Sidi Bel Abbès', '23 - Annaba', '24 - Guelma',
  '25 - Constantine', '26 - Médéa', '27 - Mostaganem', "28 - M'Sila", '29 - Mascara', '30 - Ouargla',
  '31 - Oran', '32 - El Bayadh', '33 - Illizi', '34 - Bordj Bou Arréridj', '35 - Boumerdès', '36 - El Tarf',
  '37 - Tindouf', '38 - Tissemsilt', '39 - El Oued', '40 - Khenchela', '41 - Souk Ahras', '42 - Tipaza',
  '43 - Mila', '44 - Aïn Defla', '45 - Naâma', '46 - Aïn Témouchent', '47 - Ghardaïa', '48 - Relizane',
  '49 - Timimoun', '50 - Bordj Badji Mokhtar', '51 - Ouled Djellal', '52 - Béni Abbès', '53 - In Salah',
  '54 - In Guezzam', '55 - Touggourt', '56 - Djanet', "57 - El M'Ghair", '58 - El Meniaa'
];

/* ======================= Utils.gs ======================= */

/**
 * Utils.gs : petites fonctions communes (classeur, téléphones, dates,
 * nombres, réglages, utilisateur, journal).
 */

/** Le classeur : celui qui contient le script, ou celui enregistré à l'installation. */
function ss_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error('Classeur introuvable. Ouvrez le classeur et lancez le menu « DZ Smart Shop › Installer / réparer le classeur ».');
  }
  return SpreadsheetApp.openById(id);
}

/** Un onglet du classeur, avec un message clair s'il manque. */
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Onglet « ' + name + ' » introuvable. Lancez « DZ Smart Shop › Installer / réparer le classeur ».');
  return sh;
}

/** Texte simplifié pour comparer : minuscules, sans accents ni ponctuation. */
function normalizeText_(value) {
  return String(value == null ? '' : value)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isBlank_(value) {
  return value === '' || value === null || value === undefined;
}

/**
 * Numéro algérien normalisé : 0550123456 (mobile) ou 021234567 (fixe).
 * Accepte +213, 00213, 213, les espaces, les tirets, et les numéros
 * dont le 0 a été perdu par le tableur (550123456).
 */
function normalizePhone(raw) {
  var original = String(raw == null ? '' : raw).trim();
  var digits = original.replace(/\D/g, '');
  if (digits.indexOf('00213') === 0) digits = digits.slice(5);
  else if (digits.indexOf('213') === 0 && digits.length >= 11) digits = digits.slice(3);
  if (digits.length === 9 && /^[567]/.test(digits)) digits = '0' + digits;
  if (digits.length === 8 && /^[234]/.test(digits)) digits = '0' + digits;
  var valid = /^0[567]\d{8}$/.test(digits) || /^0[234]\d{7}$/.test(digits);
  return { phone: valid ? digits : original, valid: valid };
}

/** Numéro au format international sans « + » (pour WhatsApp) : 213550123456. */
function intlPhone_(phone) {
  var p = normalizePhone(phone);
  return p.valid ? '213' + p.phone.slice(1) : '';
}

/** Nombre à partir de « 4 900 DA », « 4900,00 » ou d'un nombre. */
function toNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  if (isBlank_(value)) return 0;
  var s = String(value).replace(/[\s  ]/g, '').replace(/da|dzd/ig, '').replace(',', '.');
  var n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Date à partir d'une date du tableur, d'un texte « 12/11/2026 10:42 » ou ISO. */
function toDate_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (isBlank_(value)) return null;
  var s = String(value).trim();
  var m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Date au format ISO (texte), ou '' : seul format accepté par google.script.run. */
function iso_(value) {
  var d = toDate_(value);
  return d ? d.toISOString() : '';
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Début de la période : 'today', '7', '30' (jours) ou 'all'. */
function periodStart_(period, now) {
  if (period === 'all') return null;
  if (period === 'today') return startOfDay_(now);
  var days = toNumber_(period) || 7;
  var d = startOfDay_(now);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/** Exécute fn avec un verrou, pour éviter que deux personnes écrivent en même temps. */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Le classeur est occupé, réessayez dans quelques secondes.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Réglages de l'onglet Paramètres, complétés par les valeurs par défaut. */
function getSettings_() {
  var s = {};
  DEFAULT_SETTINGS.forEach(function (d) { s[d[0]] = d[1]; });
  var sh = ss_().getSheetByName(SHEET.SETTINGS);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var key = String(r[0]).trim();
      if (key && !isBlank_(r[1])) s[key] = r[1];
    });
  }
  s.MAX_TENTATIVES = Math.max(1, toNumber_(s.MAX_TENTATIVES) || 3);
  s.DELAI_RAPPEL_MINUTES = Math.max(5, toNumber_(s.DELAI_RAPPEL_MINUTES) || 120);
  s.DOUBLON_HEURES = Math.max(0, toNumber_(s.DOUBLON_HEURES));
  s.SOCIETE_PAR_DEFAUT = String(s.SOCIETE_PAR_DEFAUT || CARRIERS[0]).trim();
  s.NOM_BOUTIQUE = String(s.NOM_BOUTIQUE || APP_NAME).trim();
  s.MESSAGE_WHATSAPP = String(s.MESSAGE_WHATSAPP || '');
  s.motifs = String(s.MOTIFS_ANNULATION || '').split(';')
    .map(function (m) { return m.trim(); })
    .filter(function (m) { return m; });
  if (!s.motifs.length) s.motifs = ['Autre'];
  return s;
}

/** L'utilisateur connecté, avec son nom pris dans l'onglet Équipe. */
function currentUser_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || ''); } catch (e) { email = ''; }
  var name = '';
  var role = '';
  var sh = ss_().getSheetByName(SHEET.TEAM);
  if (sh && sh.getLastRow() > 1 && email) {
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toLowerCase() === email.toLowerCase()) {
        name = String(rows[i][1]).trim();
        role = String(rows[i][2]).trim();
        break;
      }
    }
  }
  if (!name) name = email ? email.split('@')[0] : 'Utilisateur';
  return { email: email, name: name, role: role };
}

/** Ajoute une ligne dans l'onglet Journal (qui a fait quoi, quand). */
function log_(user, orderId, action, detail) {
  var sh = ss_().getSheetByName(SHEET.LOG);
  if (!sh) return;
  sh.appendRow([new Date(), user ? user.name : '', orderId ? String(orderId) : '', action, detail || '']);
}

/* ======================= Orders.gs ======================= */

/**
 * Orders.gs : lecture et écriture des commandes, wilayas, tarifs,
 * alertes clients, et traitement automatique des nouvelles lignes.
 */

/* ------------------------------------------------------------------ */
/* Lecture / écriture de l'onglet Commandes                           */
/* ------------------------------------------------------------------ */

/** Associe chaque clé de ORDER_COLUMNS à son numéro de colonne (0 = A). */
function headerMap_(header) {
  var byTitle = {};
  header.forEach(function (title, i) {
    var k = normalizeText_(title);
    if (k && byTitle[k] === undefined) byTitle[k] = i;
  });
  var map = {};
  ORDER_COLUMNS.forEach(function (col) {
    var names = [col.title].concat(col.aliases || []);
    for (var i = 0; i < names.length; i++) {
      var idx = byTitle[normalizeText_(names[i])];
      if (idx !== undefined) { map[col.key] = idx; break; }
    }
  });
  return map;
}

/** Lit toutes les commandes. Chaque commande garde son numéro de ligne (_row). */
function readOrders_() {
  var sh = sheet_(SHEET.ORDERS);
  var lastRow = sh.getLastRow();
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var values = lastRow ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [[]];
  var header = values[0];
  var map = headerMap_(header);
  if (map.status === undefined || map.phone === undefined) {
    throw new Error('Colonnes « Statut » ou « Téléphone » introuvables dans l’onglet Commandes. Lancez « Installer / réparer le classeur ».');
  }
  var orders = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var empty = row.every(function (v) { return isBlank_(v); });
    if (empty) continue;
    var o = { _row: r + 1 };
    ORDER_COLUMNS.forEach(function (col) {
      var idx = map[col.key];
      o[col.key] = idx === undefined ? '' : row[idx];
    });
    o.status = String(o.status).trim();
    orders.push(o);
  }
  return { sheet: sh, map: map, width: header.length, orders: orders };
}

function findOrder_(ctx, id) {
  var key = String(id).trim();
  for (var i = 0; i < ctx.orders.length; i++) {
    if (String(ctx.orders[i].id).trim() === key) return ctx.orders[i];
  }
  return null;
}

/** Colonnes à garder en texte (sinon le tableur enlève le 0 du téléphone). */
var TEXT_KEYS_ = ['id', 'phone', 'tracking'];

/** Écrit seulement les cases modifiées d'une commande. */
function writeFields_(ctx, order, fields) {
  Object.keys(fields).forEach(function (key) {
    var idx = ctx.map[key];
    order[key] = fields[key];
    if (idx === undefined) return;
    var cell = ctx.sheet.getRange(order._row, idx + 1);
    if (TEXT_KEYS_.indexOf(key) >= 0) cell.setNumberFormat('@');
    cell.setValue(fields[key]);
  });
}

/** Ajoute une commande en bas de l'onglet. */
function appendOrder_(ctx, order) {
  var row = [];
  for (var i = 0; i < ctx.width; i++) row.push('');
  Object.keys(ctx.map).forEach(function (key) {
    if (!isBlank_(order[key])) row[ctx.map[key]] = order[key];
  });
  var r = ctx.sheet.getLastRow() + 1;
  TEXT_KEYS_.forEach(function (key) {
    if (ctx.map[key] !== undefined) ctx.sheet.getRange(r, ctx.map[key] + 1).setNumberFormat('@');
  });
  ctx.sheet.getRange(r, 1, 1, ctx.width).setValues([row]);
  order._row = r;
  ctx.orders.push(order);
  return order;
}

/** Prochain numéro pour une commande saisie à la main : M0001, M0002… */
function nextManualId_(ctx) {
  var max = 0;
  ctx.orders.forEach(function (o) {
    var m = String(o.id).match(/^M(\d+)$/);
    if (m) max = Math.max(max, +m[1]);
  });
  return 'M' + ('000' + (max + 1)).slice(-4);
}

/** Commande prête à envoyer au navigateur (aucune Date : seulement du texte et des nombres). */
function serializeOrder_(o) {
  return {
    id: String(o.id),
    date: iso_(o.date),
    client: String(o.client),
    phone: String(o.phone),
    wilaya: String(o.wilaya),
    commune: String(o.commune),
    address: String(o.address),
    product: String(o.product),
    qty: toNumber_(o.qty) || 1,
    price: toNumber_(o.price),
    mode: String(o.mode),
    shipping: isBlank_(o.shipping) ? null : toNumber_(o.shipping),
    total: toNumber_(o.total),
    status: String(o.status),
    agent: String(o.agent),
    attempts: toNumber_(o.attempts),
    callback: iso_(o.callback),
    cancelReason: String(o.cancelReason),
    carrier: String(o.carrier),
    tracking: String(o.tracking),
    alert: String(o.alert),
    alertLevel: alertLevel_(o.alert),
    notes: String(o.notes),
    source: String(o.source),
    updated: iso_(o.updated)
  };
}

/* ------------------------------------------------------------------ */
/* Wilayas et tarifs                                                  */
/* ------------------------------------------------------------------ */

/** Liste des wilayas : celle de l'onglet Tarifs, sinon les 58 par défaut. */
function getWilayaList_() {
  var sh = ss_().getSheetByName(SHEET.RATES);
  if (sh && sh.getLastRow() > 1) {
    var list = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
      .map(function (r) { return String(r[0]).trim(); })
      .filter(function (w) { return w; });
    if (list.length) return list;
  }
  return WILAYAS.slice();
}

/** Code de la wilaya : « 16 - Alger », « 16 », « Alger » ou « alger » donnent 16. */
function wilayaCode_(value, list) {
  var s = String(value == null ? '' : value).trim();
  if (!s) return null;
  var m = s.match(/^0*(\d{1,2})\b/);
  if (m) return +m[1];
  var key = normalizeText_(s);
  var all = list || WILAYAS;
  for (var i = 0; i < all.length; i++) {
    var parts = String(all[i]).split(' - ');
    var name = normalizeText_(parts.slice(1).join(' - ') || parts[0]);
    if (name === key) {
      var c = String(all[i]).match(/^0*(\d{1,2})/);
      return c ? +c[1] : null;
    }
  }
  return null;
}

/** Wilaya écrite comme dans la liste (« 16 - Alger »), ou null si inconnue. */
function matchWilaya_(value, list) {
  var all = list || WILAYAS;
  var code = wilayaCode_(value, all);
  if (code === null) return null;
  for (var i = 0; i < all.length; i++) {
    var m = String(all[i]).match(/^0*(\d{1,2})/);
    if (m && +m[1] === code) return all[i];
  }
  return null;
}

/**
 * Tarifs de l'onglet Tarifs, par code de wilaya :
 * { '16': { Yalidine: { Domicile: 600, 'Stop desk': 400 }, Ecotrack: {...} } }
 * Les colonnes sont reconnues par leur titre : « Yalidine domicile », « Ecotrack stop desk »…
 */
function readRates_(wilayas) {
  var rates = {};
  var sh = ss_().getSheetByName(SHEET.RATES);
  if (!sh || sh.getLastRow() < 2) return rates;
  var values = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 1)).getValues();
  var cols = [];
  values[0].forEach(function (title, i) {
    if (i === 0) return;
    var t = normalizeText_(title);
    CARRIERS.forEach(function (carrier) {
      if (t.indexOf(normalizeText_(carrier)) !== 0) return;
      var mode = t.indexOf('stop') >= 0 ? 'Stop desk' : (t.indexOf('domicile') >= 0 ? 'Domicile' : null);
      if (mode) cols.push({ i: i, carrier: carrier, mode: mode });
    });
  });
  for (var r = 1; r < values.length; r++) {
    var code = wilayaCode_(values[r][0], wilayas);
    if (code === null) continue;
    cols.forEach(function (c) {
      var v = values[r][c.i];
      if (isBlank_(v)) return;
      rates[code] = rates[code] || {};
      rates[code][c.carrier] = rates[code][c.carrier] || {};
      rates[code][c.carrier][c.mode] = toNumber_(v);
    });
  }
  return rates;
}

/** Frais de livraison, ou null si le tarif n'est pas renseigné. */
function shippingFee_(env, wilaya, carrier, mode) {
  var code = wilayaCode_(wilaya, env.wilayas);
  var c = String(carrier || env.settings.SOCIETE_PAR_DEFAUT);
  var m = MODES.indexOf(mode) >= 0 ? mode : MODES[0];
  var r = code !== null && env.rates[code];
  if (r && r[c] && r[c][m] !== undefined) return r[c][m];
  return null;
}

/* ------------------------------------------------------------------ */
/* Clients : historique, liste noire, alertes                         */
/* ------------------------------------------------------------------ */

/** Numéros en liste noire (onglet Clients, case « Liste noire » cochée). */
function readBlacklist_() {
  var set = {};
  var sh = ss_().getSheetByName(SHEET.CLIENTS);
  if (!sh || sh.getLastRow() < 2) return set;
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (r) {
    if (r[2] === true || String(r[2]).toLowerCase() === 'vrai' || String(r[2]).toLowerCase() === 'true') {
      var p = normalizePhone(r[0]);
      if (p.phone) set[p.phone] = true;
    }
  });
  return set;
}

/** Index téléphone → commandes, pour retrouver vite l'historique d'un client. */
function phoneIndex_(orders) {
  var index = {};
  orders.forEach(function (o) {
    var p = normalizePhone(o.phone).phone;
    if (!p) return;
    (index[p] = index[p] || []).push(o);
  });
  return index;
}

/** Historique d'un numéro (sans la commande en cours). */
function clientHistory_(phone, index, excludeId) {
  var list = (index[normalizePhone(phone).phone] || []).filter(function (o) {
    return String(o.id) !== String(excludeId);
  });
  var h = { orders: list.length, delivered: 0, returned: 0, cancelled: 0, list: list };
  list.forEach(function (o) {
    if (o.status === STATUS.DELIVERED) h.delivered++;
    else if (o.status === STATUS.RETURNED) h.returned++;
    else if (o.status === STATUS.CANCELLED) h.cancelled++;
  });
  return h;
}

/** Texte de la colonne « Alerte client ». */
function computeAlert_(order, env) {
  var p = normalizePhone(order.phone);
  if (!p.valid) return 'Numéro invalide';
  if (env.blacklist[p.phone]) return 'Liste noire';
  var h = clientHistory_(p.phone, env.index, order.id);
  var windowMs = env.settings.DOUBLON_HEURES * 3600 * 1000;
  var t = toDate_(order.date) || env.now;
  if (windowMs > 0) {
    var duplicate = h.list.some(function (o) {
      var d = toDate_(o.date);
      return o.status !== STATUS.CANCELLED && d && Math.abs(d.getTime() - t.getTime()) <= windowMs;
    });
    if (duplicate) return 'Doublon';
  }
  var finished = h.delivered + h.returned;
  if (h.returned >= 2 && h.returned >= h.delivered) return 'Risque · ' + h.returned + ' refus';
  if (h.delivered > 0) return 'Fiable · ' + h.delivered + '/' + finished + ' livrées';
  if (h.returned > 0) return 'Attention · ' + h.returned + ' refus';
  return 'Nouveau client';
}

/** Niveau de l'alerte, pour la couleur : bad, warn, ok ou new. */
function alertLevel_(alert) {
  var a = String(alert || '');
  if (a.indexOf('Liste noire') === 0 || a.indexOf('Numéro invalide') === 0) return 'bad';
  if (a.indexOf('Doublon') === 0 || a.indexOf('Risque') === 0 || a.indexOf('Attention') === 0) return 'warn';
  if (a.indexOf('Fiable') === 0) return 'ok';
  return 'new';
}

/** Tout ce dont les calculs ont besoin, lu une seule fois. */
function makeEnv_(ctx) {
  var wilayas = getWilayaList_();
  return {
    settings: getSettings_(),
    wilayas: wilayas,
    rates: readRates_(wilayas),
    blacklist: readBlacklist_(),
    index: phoneIndex_(ctx.orders),
    now: new Date()
  };
}

/* ------------------------------------------------------------------ */
/* Modifications d'une commande                                       */
/* ------------------------------------------------------------------ */

/**
 * Calcule les cases à modifier à partir de ce que l'utilisateur a saisi.
 * Recalcule le prix si la quantité change, les frais si la wilaya, le mode
 * ou la société changent, et le total si le prix ou les frais changent.
 */
function applyEdits_(o, input, env, allowShippingOverride) {
  input = input || {};
  var f = {};
  var has = function (k) { return Object.prototype.hasOwnProperty.call(input, k); };

  ['client', 'commune', 'address', 'product', 'notes', 'tracking'].forEach(function (k) {
    if (!has(k)) return;
    var v = String(input[k] == null ? '' : input[k]).trim();
    if (v !== String(o[k])) f[k] = v;
  });
  if (has('phone')) {
    var p = normalizePhone(input.phone);
    if (p.phone !== String(o.phone)) f.phone = p.phone;
  }
  if (has('wilaya')) {
    var w = matchWilaya_(input.wilaya, env.wilayas) || String(input.wilaya || '').trim();
    if (w !== String(o.wilaya)) f.wilaya = w;
  }
  if (has('mode') && MODES.indexOf(input.mode) >= 0 && input.mode !== String(o.mode)) f.mode = input.mode;
  if (has('carrier')) {
    var c = String(input.carrier || '').trim();
    if (c !== String(o.carrier)) f.carrier = c;
  }

  var oldQty = toNumber_(o.qty) || 1;
  var price = toNumber_(o.price);
  if (has('qty')) {
    var q = Math.max(1, Math.round(toNumber_(input.qty)) || 1);
    if (q !== oldQty || isBlank_(o.qty)) {
      f.qty = q;
      if (!has('price') && q !== oldQty) {
        price = Math.round(price / oldQty * q);
        f.price = price;
      }
    }
  }
  if (has('price') && !isBlank_(input.price)) {
    var pr = toNumber_(input.price);
    if (pr !== toNumber_(o.price) || isBlank_(o.price)) { price = pr; f.price = pr; }
  }

  var merged = {};
  Object.keys(o).forEach(function (k) { merged[k] = o[k]; });
  Object.keys(f).forEach(function (k) { merged[k] = f[k]; });

  var shipping = toNumber_(o.shipping);
  if (allowShippingOverride && has('shipping') && !isBlank_(input.shipping) &&
      (toNumber_(input.shipping) !== shipping || isBlank_(o.shipping))) {
    shipping = toNumber_(input.shipping);
    f.shipping = shipping;
  } else if (f.wilaya !== undefined || f.mode !== undefined || f.carrier !== undefined || isBlank_(o.shipping)) {
    var fee = shippingFee_(env, merged.wilaya, merged.carrier, merged.mode);
    if (fee !== null && (fee !== shipping || isBlank_(o.shipping))) { shipping = fee; f.shipping = fee; }
  }
  if (f.price !== undefined || f.shipping !== undefined || isBlank_(o.total)) {
    f.total = price + shipping;
  }
  return f;
}

/* ------------------------------------------------------------------ */
/* Traitement des nouvelles lignes (Shopify, import, saisie à la main) */
/* ------------------------------------------------------------------ */

/**
 * Prépare chaque ligne dont le Statut est vide : numéro, date, téléphone,
 * wilaya, frais, total, alerte, puis la met « À confirmer ».
 * Lancé automatiquement toutes les 5 minutes (voir Setup.gs).
 */
function processNewRows() {
  return withLock_(function () {
    var ctx = readOrders_();
    var fresh = ctx.orders.filter(function (o) { return !o.status; });
    if (!fresh.length) return 0;
    var env = makeEnv_(ctx);
    var user = { name: 'Automatique' };

    // 1. Nettoyage (avant les alertes, pour que les doublons se voient entre eux).
    var pending = fresh.map(function (o) {
      var f = {};
      if (isBlank_(o.id)) { f.id = nextManualId_(ctx); o.id = f.id; }
      var d = toDate_(o.date);
      if (!(o.date instanceof Date)) f.date = d || env.now;
      var p = normalizePhone(o.phone);
      if (p.phone !== String(o.phone)) f.phone = p.phone;
      if (!isBlank_(o.wilaya)) {
        var w = matchWilaya_(o.wilaya, env.wilayas);
        if (w && w !== o.wilaya) f.wilaya = w;
      }
      if (MODES.indexOf(String(o.mode)) < 0) f.mode = /stop|bureau|agence|desk/i.test(String(o.mode)) ? 'Stop desk' : 'Domicile';
      if (isBlank_(o.qty)) f.qty = 1;
      Object.keys(f).forEach(function (k) { o[k] = f[k]; });
      return { order: o, fields: f };
    });
    env.index = phoneIndex_(ctx.orders);

    // 2. Calculs et écriture.
    pending.forEach(function (item) {
      var o = item.order;
      var f = item.fields;
      if (isBlank_(o.shipping)) {
        var fee = shippingFee_(env, o.wilaya, o.carrier, o.mode);
        if (fee !== null) f.shipping = fee;
      }
      if (isBlank_(o.total)) f.total = toNumber_(o.price) + toNumber_(f.shipping !== undefined ? f.shipping : o.shipping);
      f.status = STATUS.TO_CONFIRM;
      f.attempts = 0;
      f.alert = computeAlert_(o, env);
      if (isBlank_(o.source)) f.source = 'Import';
      f.updated = env.now;
      writeFields_(ctx, o, f);
      log_(user, o.id, 'Nouvelle commande', 'Ajoutée à la file de confirmation · ' + f.alert);
    });
    return pending.length;
  });
}

/** Recalcule la colonne « Alerte client » des commandes en attente de confirmation. */
function recalcAlerts() {
  return withLock_(function () {
    var ctx = readOrders_();
    var env = makeEnv_(ctx);
    var changed = 0;
    ctx.orders.forEach(function (o) {
      if (QUEUE_STATUSES.indexOf(o.status) < 0 && o.status !== STATUS.UNREACHABLE) return;
      var a = computeAlert_(o, env);
      if (a !== String(o.alert)) { writeFields_(ctx, o, { alert: a }); changed++; }
    });
    return changed;
  });
}

/* ======================= Api.gs ======================= */

/**
 * Api.gs : l'application web (doGet), le menu du classeur, et les
 * fonctions appelées par l'interface avec google.script.run.
 *
 * Les fonctions qui finissent par « _ » sont privées : le navigateur
 * ne peut pas les appeler.
 */

/* ------------------------------------------------------------------ */
/* Application web et menu                                            */
/* ------------------------------------------------------------------ */

/**
 * Version « un seul fichier » (dist/Code.gs) : les pages HTML sont
 * rangées dans HTML_FILES_ au lieu de fichiers séparés.
 */
function hasBundledHtml_() {
  return typeof HTML_FILES_ !== 'undefined';
}

function doGet() {
  var template = hasBundledHtml_()
    ? HtmlService.createTemplate(HTML_FILES_.Index)
    : HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle(APP_NAME + ' · Commandes COD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** Insère un fichier HTML dans un autre (Styles, App). */
function include(name) {
  if (hasBundledHtml_() && HTML_FILES_[name] !== undefined) return HTML_FILES_[name];
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP_NAME)
    .addItem('Ouvrir l’application', 'menuOpenApp')
    .addSeparator()
    .addItem('Traiter les nouvelles commandes', 'menuProcess')
    .addItem('Recalculer les alertes clients', 'menuRecalc')
    .addSeparator()
    .addItem('Installer / réparer le classeur', 'setup')
    .addToUi();
}

function menuOpenApp() {
  var ui = SpreadsheetApp.getUi();
  var url = ScriptApp.getService().getUrl();
  if (!url) {
    ui.alert('Application pas encore déployée',
      'Dans Apps Script : Déployer › Nouveau déploiement › Application Web. Voir le fichier README.',
      ui.ButtonSet.OK);
    return;
  }
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Lien de l’application (à garder en favori, aussi sur votre téléphone) :</p>' +
    '<p style="font-family:sans-serif"><a href="' + url + '" target="_blank">Ouvrir ' + APP_NAME + '</a></p>'
  ).setWidth(420).setHeight(140);
  ui.showModalDialog(html, APP_NAME);
}

function menuProcess() {
  var n = processNewRows();
  SpreadsheetApp.getActiveSpreadsheet().toast(n + ' nouvelle(s) commande(s) ajoutée(s) à la file de confirmation.', APP_NAME);
}

function menuRecalc() {
  var n = recalcAlerts();
  SpreadsheetApp.getActiveSpreadsheet().toast(n + ' alerte(s) mise(s) à jour.', APP_NAME);
}

/* ------------------------------------------------------------------ */
/* Démarrage de l'interface                                           */
/* ------------------------------------------------------------------ */

function api_bootstrap() {
  var s = getSettings_();
  var wilayas = getWilayaList_();
  var products = [];
  var sh = ss_().getSheetByName(SHEET.PRODUCTS);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var name = String(r[0]).trim();
      if (name) products.push({ name: name, price: toNumber_(r[1]) });
    });
  }
  return {
    app: { name: APP_NAME, version: APP_VERSION },
    shop: s.NOM_BOUTIQUE,
    user: currentUser_(),
    statuses: STATUS_LIST,
    queueStatuses: QUEUE_STATUSES,
    styles: STATUS_STYLE,
    wilayas: wilayas,
    modes: MODES,
    carriers: CARRIERS,
    defaultCarrier: s.SOCIETE_PAR_DEFAUT,
    cancelReasons: s.motifs,
    maxAttempts: s.MAX_TENTATIVES,
    callbackDelay: s.DELAI_RAPPEL_MINUTES,
    waTemplate: s.MESSAGE_WHATSAPP,
    rates: readRates_(wilayas),
    products: products
  };
}

/* ------------------------------------------------------------------ */
/* Tableau de bord                                                    */
/* ------------------------------------------------------------------ */

function api_dashboard(period) {
  var ctx = readOrders_();
  var now = new Date();
  var since = periodStart_(period || '7', now);
  var inPeriod = ctx.orders.filter(function (o) {
    if (!since) return true;
    var d = toDate_(o.date);
    return d && d >= since;
  });
  var has = function (list) { return function (o) { return list.indexOf(o.status) >= 0; }; };
  var count = function (arr, list) { return arr.filter(has(list)).length; };
  var sum = function (arr) { return arr.reduce(function (a, o) { return a + toNumber_(o.total); }, 0); };

  var received = inPeriod.length;
  var waiting = count(inPeriod, QUEUE_STATUSES);
  var confirmed = count(inPeriod, CONFIRMED_STATUSES);
  var shipped = count(inPeriod, SHIPPED_STATUSES);
  var delivered = count(inPeriod, [STATUS.DELIVERED]);
  var returned = count(inPeriod, [STATUS.RETURNED]);
  var cancelled = count(inPeriod, [STATUS.CANCELLED]);
  var unreachable = count(inPeriod, [STATUS.UNREACHABLE]);
  var decided = received - waiting;

  // À faire : toutes périodes confondues.
  var dueQueue = 0;
  var callbacksToday = 0;
  var endOfDay = startOfDay_(now);
  endOfDay.setDate(endOfDay.getDate() + 1);
  ctx.orders.forEach(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0) return;
    var cb = toDate_(o.callback);
    if (!cb || cb <= now) dueQueue++;
    else if (cb < endOfDay) callbacksToday++;
  });
  var inTransit = ctx.orders.filter(has([STATUS.SHIPPED, STATUS.IN_DELIVERY]));

  var group = function (keyFn, keep) {
    var map = {};
    inPeriod.forEach(function (o) {
      if (keep && !keep(o)) return;
      var k = String(keyFn(o) || '').trim() || '—';
      var g = map[k] = map[k] || { name: k, orders: 0, confirmed: 0, delivered: 0, returned: 0, cancelled: 0 };
      g.orders++;
      if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) g.confirmed++;
      if (o.status === STATUS.DELIVERED) g.delivered++;
      if (o.status === STATUS.RETURNED) g.returned++;
      if (o.status === STATUS.CANCELLED) g.cancelled++;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.orders - a.orders; });
  };

  return {
    period: period || '7',
    received: received,
    waiting: waiting,
    decided: decided,
    confirmed: confirmed,
    shipped: shipped,
    delivered: delivered,
    returned: returned,
    cancelled: cancelled,
    unreachable: unreachable,
    revenueDelivered: sum(inPeriod.filter(has([STATUS.DELIVERED]))),
    inTransitAmount: sum(inTransit),
    inTransitCount: inTransit.length,
    todo: {
      toConfirm: dueQueue,
      callbacksToday: callbacksToday,
      toShip: ctx.orders.filter(has([STATUS.CONFIRMED])).length,
      unreachable: ctx.orders.filter(has([STATUS.UNREACHABLE])).length
    },
    byWilaya: group(function (o) { return o.wilaya; }, has(SHIPPED_STATUSES)).slice(0, 10),
    byAgent: group(function (o) { return o.agent; }, function (o) {
      return !isBlank_(o.agent) && QUEUE_STATUSES.indexOf(o.status) < 0;
    }).slice(0, 10),
    byProduct: group(function (o) { return o.product; }).slice(0, 8),
    generatedAt: now.toISOString()
  };
}

/* ------------------------------------------------------------------ */
/* Liste des commandes                                                */
/* ------------------------------------------------------------------ */

/**
 * filter = { status: 'all' | 'queue' | un statut, q: texte, wilaya, period: 'today'|'7'|'30'|'all', limit }
 */
function api_listOrders(filter) {
  filter = filter || {};
  var ctx = readOrders_();
  var now = new Date();
  var since = periodStart_(filter.period || '30', now);
  var q = normalizeText_(filter.q || '');
  var qDigits = String(filter.q || '').replace(/\D/g, '');
  var wcode = filter.wilaya ? wilayaCode_(filter.wilaya) : null;

  var base = ctx.orders.filter(function (o) {
    if (since) {
      var d = toDate_(o.date);
      if (!d || d < since) return false;
    }
    if (wcode !== null && wilayaCode_(o.wilaya) !== wcode) return false;
    if (q) {
      var text = normalizeText_([o.id, o.client, o.commune, o.product, o.tracking, o.wilaya].join(' '));
      var phoneHit = qDigits.length >= 4 && String(o.phone).replace(/\D/g, '').indexOf(qDigits) >= 0;
      if (text.indexOf(q) < 0 && !phoneHit) return false;
    }
    return true;
  });

  var counts = { all: base.length, queue: 0 };
  base.forEach(function (o) {
    var s = o.status || '—';
    counts[s] = (counts[s] || 0) + 1;
    if (QUEUE_STATUSES.indexOf(o.status) >= 0) counts.queue++;
  });

  var status = filter.status || 'all';
  var rows = base.filter(function (o) {
    if (status === 'all') return true;
    if (status === 'queue') return QUEUE_STATUSES.indexOf(o.status) >= 0;
    return o.status === status;
  });
  rows.sort(function (a, b) {
    var da = toDate_(a.date);
    var db = toDate_(b.date);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });
  var limit = Math.min(Math.max(Math.round(toNumber_(filter.limit)) || 100, 1), 1000);
  return { rows: rows.slice(0, limit).map(serializeOrder_), total: rows.length, counts: counts };
}

/* ------------------------------------------------------------------ */
/* Centre de confirmation                                             */
/* ------------------------------------------------------------------ */

function queueItem_(o) {
  return {
    id: String(o.id),
    client: String(o.client),
    wilaya: String(o.wilaya),
    commune: String(o.commune),
    product: String(o.product),
    total: toNumber_(o.total),
    date: iso_(o.date),
    status: o.status,
    attempts: toNumber_(o.attempts),
    callback: iso_(o.callback),
    alert: String(o.alert),
    alertLevel: alertLevel_(o.alert)
  };
}

/** File d'appels : à appeler maintenant (due) et rappels programmés plus tard (later). */
function api_queue() {
  var ctx = readOrders_();
  var now = new Date();
  var user = currentUser_();
  var due = [];
  var later = [];
  var rank = {};
  rank[STATUS.CALLBACK] = 0;
  rank[STATUS.TO_CONFIRM] = 1;
  rank[STATUS.NO_ANSWER] = 2;

  ctx.orders.forEach(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0) return;
    var cb = toDate_(o.callback);
    var item = { o: o, cb: cb, d: toDate_(o.date) };
    if (cb && cb > now) later.push(item); else due.push(item);
  });
  due.sort(function (a, b) {
    var r = rank[a.o.status] - rank[b.o.status];
    if (r) return r;
    var ta = (a.o.status === STATUS.TO_CONFIRM ? a.d : a.cb || a.d);
    var tb = (b.o.status === STATUS.TO_CONFIRM ? b.d : b.cb || b.d);
    return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
  });
  later.sort(function (a, b) { return a.cb.getTime() - b.cb.getTime(); });

  var today = startOfDay_(now);
  var mine = { handled: 0, confirmed: 0 };
  ctx.orders.forEach(function (o) {
    var u = toDate_(o.updated);
    if (String(o.agent) !== user.name || !u || u < today) return;
    if (QUEUE_STATUSES.indexOf(o.status) < 0) mine.handled++;
    if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) mine.confirmed++;
  });

  return {
    due: due.map(function (x) { return queueItem_(x.o); }),
    later: later.map(function (x) { return queueItem_(x.o); }),
    stats: { due: due.length, later: later.length, handledToday: mine.handled, confirmedToday: mine.confirmed },
    now: now.toISOString()
  };
}

/** Une commande avec l'historique du client. */
function api_getOrder(id) {
  var ctx = readOrders_();
  var o = findOrder_(ctx, id);
  if (!o) throw new Error('Commande ' + id + ' introuvable.');
  var env = makeEnv_(ctx);
  var h = clientHistory_(o.phone, env.index, o.id);
  var recent = h.list.slice().sort(function (a, b) {
    var da = toDate_(a.date);
    var db = toDate_(b.date);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  }).slice(0, 5).map(function (x) {
    return { id: String(x.id), date: iso_(x.date), status: x.status, total: toNumber_(x.total), product: String(x.product) };
  });
  var phone = normalizePhone(o.phone);
  return {
    order: serializeOrder_(o),
    history: { orders: h.orders, delivered: h.delivered, returned: h.returned, cancelled: h.cancelled, recent: recent },
    blacklisted: !!env.blacklist[phone.phone],
    phoneValid: phone.valid,
    intlPhone: intlPhone_(o.phone)
  };
}

/**
 * Enregistre le résultat d'un appel.
 * outcome : 'confirm' | 'no_answer' | 'callback' | 'cancel'
 * payload : { fields: {client, wilaya, commune, address, mode, qty, notes}, callback: date ISO, reason: motif }
 */
function api_recordCall(id, outcome, payload) {
  payload = payload || {};
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (QUEUE_STATUSES.indexOf(o.status) < 0) {
      throw new Error('La commande ' + id + ' a déjà été traitée (statut « ' + o.status + ' »' +
        (o.agent ? ', par ' + o.agent : '') + ').');
    }
    var env = makeEnv_(ctx);
    var user = currentUser_();
    var f = applyEdits_(o, payload.fields, env, false);
    var attempts = toNumber_(o.attempts);
    var detail = '';

    if (outcome === 'confirm') {
      f.status = STATUS.CONFIRMED;
      f.attempts = attempts + 1;
      f.callback = '';
      detail = 'Confirmée';
    } else if (outcome === 'no_answer') {
      f.attempts = attempts + 1;
      if (f.attempts >= env.settings.MAX_TENTATIVES) {
        f.status = STATUS.UNREACHABLE;
        f.callback = '';
        detail = 'Pas de réponse (' + f.attempts + ' appels) : injoignable';
      } else {
        f.status = STATUS.NO_ANSWER;
        f.callback = new Date(env.now.getTime() + env.settings.DELAI_RAPPEL_MINUTES * 60000);
        detail = 'Pas de réponse (appel ' + f.attempts + '), rappel prévu';
      }
    } else if (outcome === 'callback') {
      var when = toDate_(payload.callback);
      if (!when || when <= env.now) throw new Error('Choisissez une date de rappel dans le futur.');
      f.status = STATUS.CALLBACK;
      f.callback = when;
      detail = 'Rappel programmé le ' + Utilities.formatDate(when, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    } else if (outcome === 'cancel') {
      f.status = STATUS.CANCELLED;
      f.cancelReason = String(payload.reason || 'Autre');
      f.attempts = attempts + 1;
      f.callback = '';
      detail = 'Annulée : ' + f.cancelReason;
    } else {
      throw new Error('Résultat d’appel inconnu : ' + outcome);
    }

    if (f.phone !== undefined) {
      var merged = {};
      Object.keys(o).forEach(function (k) { merged[k] = o[k]; });
      merged.phone = f.phone;
      f.alert = computeAlert_(merged, env);
    }
    f.agent = user.name;
    f.updated = env.now;
    writeFields_(ctx, o, f);
    log_(user, o.id, 'Appel', detail);
    return serializeOrder_(o);
  });
}

/* ------------------------------------------------------------------ */
/* Création et modification                                           */
/* ------------------------------------------------------------------ */

var EDIT_KEYS_ = ['client', 'phone', 'wilaya', 'commune', 'address', 'product', 'qty', 'price', 'mode',
  'shipping', 'carrier', 'tracking', 'notes'];

function pickEdits_(input) {
  var out = {};
  EDIT_KEYS_.forEach(function (k) {
    if (input && Object.prototype.hasOwnProperty.call(input, k)) out[k] = input[k];
  });
  return out;
}

/** Modifie une commande depuis la page Commandes (y compris son statut). */
function api_updateOrder(id, input) {
  input = input || {};
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    var env = makeEnv_(ctx);
    var user = currentUser_();
    var f = applyEdits_(o, pickEdits_(input), env, true);
    var changes = [];

    if (input.status && input.status !== o.status) {
      if (STATUS_LIST.indexOf(input.status) < 0) throw new Error('Statut inconnu : ' + input.status);
      f.status = input.status;
      if (QUEUE_STATUSES.indexOf(input.status) < 0) f.callback = '';
      changes.push('Statut : ' + (o.status || '—') + ' → ' + input.status);
    }
    var finalStatus = f.status || o.status;
    if (finalStatus === STATUS.CANCELLED) {
      var reason = String(input.cancelReason || o.cancelReason || 'Autre');
      if (reason !== String(o.cancelReason)) f.cancelReason = reason;
    }
    if (f.phone !== undefined) {
      var merged = {};
      Object.keys(o).forEach(function (k) { merged[k] = o[k]; });
      merged.phone = f.phone;
      f.alert = computeAlert_(merged, env);
    }
    var edited = Object.keys(f).filter(function (k) { return k !== 'status'; });
    if (!changes.length && !edited.length) return serializeOrder_(o);
    if (edited.length) changes.push('Modifié : ' + edited.join(', '));
    f.updated = env.now;
    writeFields_(ctx, o, f);
    log_(user, o.id, 'Modification', changes.join(' · '));
    return serializeOrder_(o);
  });
}

/** Ajoute une commande saisie à la main. */
function api_createOrder(input) {
  input = input || {};
  if (!String(input.client || '').trim()) throw new Error('Le nom du client est obligatoire.');
  if (!normalizePhone(input.phone).valid) throw new Error('Numéro de téléphone invalide (ex. 0550 12 34 56).');
  if (!String(input.wilaya || '').trim()) throw new Error('La wilaya est obligatoire.');
  return withLock_(function () {
    var ctx = readOrders_();
    var env = makeEnv_(ctx);
    var user = currentUser_();
    var blank = {};
    ORDER_COLUMNS.forEach(function (c) { blank[c.key] = ''; });
    var data = pickEdits_(input);
    if (isBlank_(data.mode)) data.mode = MODES[0];
    if (isBlank_(data.qty)) data.qty = 1;
    var f = applyEdits_(blank, data, env, true);
    var o = blank;
    Object.keys(f).forEach(function (k) { o[k] = f[k]; });
    o.id = nextManualId_(ctx);
    o.date = env.now;
    o.status = STATUS.TO_CONFIRM;
    o.attempts = 0;
    o.source = 'Manuel';
    o.updated = env.now;
    o.alert = computeAlert_(o, env);
    appendOrder_(ctx, o);
    log_(user, o.id, 'Nouvelle commande', 'Saisie à la main · ' + o.alert);
    return serializeOrder_(o);
  });
}

/** Ajoute ou retire un numéro de la liste noire (onglet Clients). */
function api_setBlacklist(phone, on, note) {
  var p = normalizePhone(phone);
  if (!p.valid) throw new Error('Numéro invalide.');
  return withLock_(function () {
    var sh = sheet_(SHEET.CLIENTS);
    var user = currentUser_();
    var last = sh.getLastRow();
    var row = 0;
    if (last > 1) {
      var values = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        if (normalizePhone(values[i][0]).phone === p.phone) { row = i + 2; break; }
      }
    }
    if (!row) {
      row = last + 1;
      sh.getRange(row, 1).setNumberFormat('@');
      sh.getRange(row, 1, 1, 4).setValues([[p.phone, '', !!on, note || '']]);
    } else {
      sh.getRange(row, 3).setValue(!!on);
      if (note) sh.getRange(row, 4).setValue(note);
    }
    // Met à jour l'alerte des commandes en attente de ce client.
    var ctx = readOrders_();
    var env = makeEnv_(ctx);
    ctx.orders.forEach(function (o) {
      if (normalizePhone(o.phone).phone !== p.phone) return;
      if (QUEUE_STATUSES.indexOf(o.status) < 0 && o.status !== STATUS.UNREACHABLE) return;
      var a = computeAlert_(o, env);
      if (a !== String(o.alert)) writeFields_(ctx, o, { alert: a });
    });
    log_(user, '', on ? 'Liste noire : ajout' : 'Liste noire : retrait', p.phone);
    return { phone: p.phone, blacklisted: !!on };
  });
}

/* ======================= Setup.gs ======================= */

/**
 * Setup.gs : crée ou répare les onglets du classeur, les listes
 * déroulantes, les couleurs, et le traitement automatique.
 *
 * Sans danger à relancer : rien n'est effacé, il complète ce qui manque.
 */

var HEADER_BG_ = { 'in': '#EEF0F3', 'list': '#DCE7FA', 'auto': '#D3EDE2' };

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  setupSettingsSheet_(ss);
  setupTeamSheet_(ss);
  setupRatesSheet_(ss);
  setupSimpleSheet_(ss, SHEET.PRODUCTS, ['Produit', 'Prix de vente', "Coût d'achat", 'Stock'], [220, 120, 120, 90]);
  setupClientsSheet_(ss);
  setupSimpleSheet_(ss, SHEET.LOG, ['Date', 'Utilisateur', 'Commande', 'Action', 'Détail'], [140, 130, 90, 160, 420]);
  setupOrdersSheet_(ss);
  removeEmptyDefaultSheet_(ss);
  installTriggers_();

  ss.setActiveSheet(ss.getSheetByName(SHEET.ORDERS));
  try { ss.setSpreadsheetTimeZone('Africa/Algiers'); } catch (e) { /* droits insuffisants : sans importance */ }
  var tzWarning = Session.getScriptTimeZone() === 'Africa/Algiers' ? '' :
    '\n\nAttention : le fuseau horaire du script est « ' + Session.getScriptTimeZone() + ' ». ' +
    'Dans Apps Script › ⚙ Paramètres du projet, choisissez « (GMT+01:00) Alger ».';
  try {
    SpreadsheetApp.getUi().alert(APP_NAME,
      'Classeur prêt.\n\n1. Remplissez l’onglet Tarifs (prix de livraison par wilaya).\n' +
      '2. Ajoutez vos confirmatrices dans l’onglet Équipe.\n' +
      '3. Déployez l’application web (voir README).' + tzWarning,
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // Pas d'interface (lancement depuis l'éditeur ou un test) : rien à afficher.
  }
  return 'ok';
}

/* ------------------------------------------------------------------ */

function ensureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/** Écrit les titres s'ils manquent ; ajoute à droite les titres absents. */
function ensureHeaders_(sh, titles) {
  var lastCol = sh.getLastColumn();
  var current = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var known = current.map(normalizeText_);
  var missing = titles.filter(function (t) { return known.indexOf(normalizeText_(t)) < 0; });
  if (!current.some(function (v) { return !isBlank_(v); })) {
    sh.getRange(1, 1, 1, titles.length).setValues([titles]);
  } else if (missing.length) {
    sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
  sh.setFrozenRows(1);
  var width = Math.max(sh.getLastColumn(), titles.length);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#EEF0F3').setFontColor('#15181E');
}

function dataRows_(sh) {
  return Math.max(sh.getMaxRows() - 1, 1);
}

function setupSimpleSheet_(ss, name, titles, widths) {
  var sh = ensureSheet_(ss, name);
  ensureHeaders_(sh, titles);
  (widths || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  return sh;
}

function setupSettingsSheet_(ss) {
  var sh = setupSimpleSheet_(ss, SHEET.SETTINGS, ['Clé', 'Valeur', 'Description'], [200, 380, 420]);
  var existing = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); })
    : [];
  var toAdd = DEFAULT_SETTINGS.filter(function (d) { return existing.indexOf(d[0]) < 0; });
  if (toAdd.length) sh.getRange(sh.getLastRow() + 1, 1, toAdd.length, 3).setValues(toAdd);
  sh.getRange(2, 2, dataRows_(sh), 1).setWrap(true);
}

function setupTeamSheet_(ss) {
  var sh = setupSimpleSheet_(ss, SHEET.TEAM, ['Email', 'Nom', 'Rôle'], [240, 160, 160]);
  if (sh.getLastRow() < 2) {
    var email = '';
    try { email = Session.getEffectiveUser().getEmail(); } catch (e) { email = ''; }
    if (email) sh.getRange(2, 1, 1, 3).setValues([[email, 'Admin', 'Administrateur']]);
  }
}

function setupRatesSheet_(ss) {
  var titles = ['Wilaya'];
  CARRIERS.forEach(function (c) { titles.push(c + ' domicile', c + ' stop desk'); });
  var sh = setupSimpleSheet_(ss, SHEET.RATES, titles, [200, 130, 130, 130, 130]);
  if (sh.getLastRow() < 2) {
    sh.getRange(2, 1, WILAYAS.length, 1).setValues(WILAYAS.map(function (w) { return [w]; }));
  }
  sh.getRange(2, 2, dataRows_(sh), titles.length - 1).setNumberFormat('#,##0');
}

function setupClientsSheet_(ss) {
  var sh = setupSimpleSheet_(ss, SHEET.CLIENTS, ['Téléphone', 'Nom', 'Liste noire', 'Note'], [130, 180, 100, 320]);
  sh.getRange(2, 1, dataRows_(sh), 1).setNumberFormat('@');
  sh.getRange(2, 3, dataRows_(sh), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
}

function setupOrdersSheet_(ss) {
  var sh = ensureSheet_(ss, SHEET.ORDERS);
  // Ajoute seulement les colonnes vraiment absentes (un alias suffit).
  var lastCol = sh.getLastColumn();
  var header = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var map = headerMap_(header);
  var empty = !header.some(function (v) { return !isBlank_(v); });
  var missing = ORDER_COLUMNS.filter(function (c) { return map[c.key] === undefined; })
    .map(function (c) { return c.title; });
  if (empty) {
    sh.getRange(1, 1, 1, missing.length).setValues([missing]);
  } else if (missing.length) {
    sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
  header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  map = headerMap_(header);
  sh.setFrozenRows(1);

  var n = dataRows_(sh);
  var col = function (key) { return map[key] + 1; };
  var range = function (key) { return sh.getRange(2, col(key), n, 1); };

  ORDER_COLUMNS.forEach(function (c) {
    var cell = sh.getRange(1, col(c.key));
    cell.setFontWeight('bold').setFontColor('#15181E').setBackground(HEADER_BG_[c.kind] || '#EEF0F3');
    sh.setColumnWidth(col(c.key), c.width || 120);
  });

  // Formats
  ['date', 'callback', 'updated'].forEach(function (k) { range(k).setNumberFormat('dd/MM/yyyy HH:mm'); });
  TEXT_KEYS_.forEach(function (k) { range(k).setNumberFormat('@'); });
  ['price', 'shipping', 'total'].forEach(function (k) { range(k).setNumberFormat('#,##0 "DA"'); });
  ['qty', 'attempts'].forEach(function (k) { range(k).setNumberFormat('0'); });

  // Listes déroulantes
  var list = function (values, strict) {
    return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(!strict).build();
  };
  var fromRange = function (sheetName, column) {
    var src = ss.getSheetByName(sheetName);
    return SpreadsheetApp.newDataValidation()
      .requireValueInRange(src.getRange(2, column, dataRows_(src), 1), true)
      .setAllowInvalid(true).build();
  };
  range('status').setDataValidation(list(STATUS_LIST, true));
  range('mode').setDataValidation(list(MODES, false));
  range('carrier').setDataValidation(list(CARRIERS, false));
  range('cancelReason').setDataValidation(list(getSettings_().motifs, false));
  range('wilaya').setDataValidation(fromRange(SHEET.RATES, 1));
  range('agent').setDataValidation(fromRange(SHEET.TEAM, 2));

  // Couleurs automatiques : statut et alerte client (les autres règles sont gardées).
  var statusCol = col('status');
  var alertCol = col('alert');
  var kept = sh.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (r) {
      return r.getColumn() === statusCol || r.getColumn() === alertCol;
    });
  });
  var rules = [];
  STATUS_LIST.forEach(function (s) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s)
      .setBackground(STATUS_STYLE[s].bg).setFontColor(STATUS_STYLE[s].fg)
      .setRanges([range('status')]).build());
  });
  [
    ['Liste noire', '#FBE7E7', '#A12626'], ['Numéro invalide', '#FBE7E7', '#A12626'],
    ['Doublon', '#FCEBDD', '#9A4200'], ['Risque', '#FCEBDD', '#9A4200'], ['Attention', '#FFF3DC', '#8A5200'],
    ['Fiable', '#DDF0E4', '#146C2E'], ['Nouveau', '#E6EEFB', '#1E4FA8']
  ].forEach(function (a) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith(a[0])
      .setBackground(a[1]).setFontColor(a[2]).setRanges([range('alert')]).build());
  });
  sh.setConditionalFormatRules(kept.concat(rules));
  return sh;
}

function removeEmptyDefaultSheet_(ss) {
  ['Feuille 1', 'Feuille1', 'Sheet1', 'Sheet 1'].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
}

/** Traitement automatique des nouvelles lignes toutes les 5 minutes. */
function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processNewRows') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processNewRows').timeBased().everyMinutes(5).create();
}

/* ======================= Pages HTML ======================= */

var HTML_FILES_ = {
  Index: "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap\" rel=\"stylesheet\">\n  <?!= include('Styles'); ?>\n</head>\n<body>\n  <div class=\"app\">\n    <aside class=\"sidebar\" aria-label=\"Navigation principale\">\n      <div class=\"brand\">\n        <span class=\"brand-name\" data-shop>DZ Smart Shop</span>\n        <span class=\"brand-sub\">Gestion des commandes COD</span>\n      </div>\n      <nav class=\"nav\">\n        <a href=\"#/tableau\" data-route=\"tableau\">Tableau de bord</a>\n        <a href=\"#/commandes\" data-route=\"commandes\">Commandes</a>\n        <a href=\"#/confirmation\" data-route=\"confirmation\">Confirmation <span class=\"badge\" data-queue-count hidden></span></a>\n      </nav>\n      <div class=\"side-user\">\n        <span class=\"side-user-name\" data-user-name></span>\n        <span class=\"side-user-mail\" data-user-mail></span>\n      </div>\n    </aside>\n\n    <div class=\"main\">\n      <header class=\"mobile-top\">\n        <span class=\"brand-name\" data-shop>DZ Smart Shop</span>\n        <span class=\"mobile-user\" data-user-name></span>\n      </header>\n      <main id=\"view\" class=\"content\" tabindex=\"-1\">\n        <p class=\"loading\">Chargement…</p>\n      </main>\n    </div>\n  </div>\n\n  <nav class=\"bottom-nav\" aria-label=\"Navigation\">\n    <a href=\"#/tableau\" data-route=\"tableau\">Tableau</a>\n    <a href=\"#/commandes\" data-route=\"commandes\">Commandes</a>\n    <a href=\"#/confirmation\" data-route=\"confirmation\">Confirmer <span class=\"badge\" data-queue-count hidden></span></a>\n  </nav>\n\n  <div id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n  <div id=\"modal-root\"></div>\n\n  <?!= include('App'); ?>\n</body>\n</html>\n",
  Styles: "<style>\n  :root {\n    --bg: #F4F5F7;\n    --surface: #FFFFFF;\n    --ink: #15181E;\n    --ink-2: #3D4350;\n    --muted: #5B6270;\n    --line: #E2E5EA;\n    --line-2: #CFD4DB;\n    --soft: #F8F9FA;\n    --brand: #0B6B4C;\n    --brand-dark: #084F38;\n    --side: #10241C;\n    --side-ink: #D5E2DC;\n    --side-muted: #A9C2B7;\n    --side-active: #1F4A39;\n    --accent: #F2B25C;\n    --radius: 12px;\n    --font: Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n    --font-title: \"Space Grotesk\", Inter, system-ui, sans-serif;\n  }\n  * { box-sizing: border-box; }\n  html, body { margin: 0; background: var(--bg); color: var(--ink); font: 400 14px/1.45 var(--font); }\n  h1, h2, h3, p { margin: 0; }\n  h1 { font: 700 26px/1.2 var(--font-title); }\n  h2 { font-size: 16px; font-weight: 600; }\n  h3 { font-size: 15px; font-weight: 600; }\n  button, input, select, textarea { font: inherit; color: inherit; }\n  a { color: var(--brand); }\n  [hidden] { display: none !important; }\n  :focus-visible { outline: 3px solid #7FB8A2; outline-offset: 2px; }\n\n  /* Structure */\n  .app { display: flex; min-height: 100vh; }\n  .sidebar {\n    width: 232px; flex: 0 0 232px; background: var(--side); padding: 22px 14px;\n    display: flex; flex-direction: column; gap: 4px; position: sticky; top: 0; height: 100vh;\n  }\n  .brand { display: flex; flex-direction: column; gap: 2px; padding: 0 12px 22px; }\n  .brand-name { font: 700 19px var(--font-title); color: #FFFFFF; }\n  .brand-sub { font-size: 12px; color: var(--side-muted); }\n  .nav { display: flex; flex-direction: column; gap: 4px; }\n  .nav a {\n    display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 12px;\n    border-radius: 8px; color: var(--side-ink); text-decoration: none; font-weight: 500;\n  }\n  .nav a:hover { background: #18352A; }\n  .nav a.active { background: var(--side-active); color: #FFFFFF; font-weight: 600; }\n  .badge { background: var(--accent); color: var(--side); font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }\n  .side-user { margin-top: auto; padding: 12px; border-top: 1px solid #2A4A3D; display: flex; flex-direction: column; gap: 2px; }\n  .side-user-name { color: #FFFFFF; font-weight: 600; }\n  .side-user-mail { color: var(--side-muted); font-size: 12px; overflow-wrap: anywhere; }\n  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }\n  .mobile-top { display: none; }\n  .content { padding: 26px 30px 60px; outline: none; }\n  .bottom-nav { display: none; }\n\n  /* Éléments communs */\n  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 18px; }\n  .sub { color: var(--muted); margin-top: 4px; }\n  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }\n  .card > h2, .card > h3 { margin-bottom: 12px; }\n  .stack { display: flex; flex-direction: column; gap: 16px; }\n  .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }\n  .row > * { flex: 1 1 340px; min-width: 0; }\n  .grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }\n  .kpi { display: flex; flex-direction: column; gap: 6px; }\n  .kpi .label { color: var(--muted); font-size: 13px; font-weight: 500; }\n  .kpi .value { font: 700 28px/1.1 var(--font-title); }\n  .kpi .note { color: var(--muted); font-size: 13px; }\n  .small { font-size: 12px; color: var(--muted); }\n  .muted { color: var(--muted); }\n  .strong { font-weight: 600; }\n  .loading, .empty { color: var(--muted); padding: 36px 0; text-align: center; }\n  .error-box { background: #FBE7E7; color: #A12626; border-radius: 10px; padding: 14px 16px; font-weight: 600; }\n\n  .btn {\n    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px;\n    border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink);\n    font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap;\n  }\n  .btn:hover { background: var(--soft); }\n  .btn.primary { background: var(--brand); border-color: var(--brand); color: #FFFFFF; }\n  .btn.primary:hover { background: var(--brand-dark); }\n  .btn.warn { background: #FFF3DC; border-color: #E8B45C; color: #8A5200; }\n  .btn.danger { background: #FBE7E7; border-color: #E7B4B4; color: #A12626; }\n  .btn.ghost { border-style: dashed; color: var(--brand); border-color: var(--brand); }\n  .btn.big { min-height: 52px; font-size: 15px; }\n  .btn[disabled], .btn[aria-disabled=\"true\"] { opacity: .5; cursor: default; pointer-events: none; }\n\n  .seg { display: inline-flex; gap: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 4px; }\n  .seg button { min-height: 38px; padding: 0 14px; border: 0; border-radius: 7px; background: transparent; font-weight: 500; color: var(--ink-2); cursor: pointer; }\n  .seg button[aria-pressed=\"true\"] { background: var(--brand); color: #FFFFFF; font-weight: 600; }\n\n  .chips { display: flex; flex-wrap: wrap; gap: 8px; }\n  .chip { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink-2); font-weight: 500; cursor: pointer; }\n  .chip[aria-pressed=\"true\"] { background: var(--ink); border-color: var(--ink); color: #FFFFFF; font-weight: 600; }\n\n  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }\n\n  .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted); min-width: 0; }\n  .field input, .field select, .field textarea {\n    min-height: 44px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface);\n    font-size: 14px; font-weight: 400; color: var(--ink); width: 100%;\n  }\n  .field textarea { padding: 10px 12px; min-height: 70px; resize: vertical; }\n  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }\n  .form-grid .full { grid-column: 1 / -1; }\n\n  .filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 14px 0; }\n  .filters .field { flex: 1 1 170px; }\n  .filters .field.wide { flex: 2 1 260px; }\n\n  /* Tableaux */\n  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }\n  table.data { width: 100%; border-collapse: collapse; }\n  table.data th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--soft); padding: 11px 10px; font-weight: 600; white-space: nowrap; }\n  table.data td { padding: 11px 10px; border-top: 1px solid #EEF0F3; vertical-align: top; }\n  table.data td.num { text-align: right; white-space: nowrap; }\n  table.data tbody tr.clickable { cursor: pointer; }\n  table.data tbody tr.clickable:hover td { background: #FAFBFC; }\n  .link-btn { background: none; border: 0; padding: 0; color: var(--ink); font-weight: 600; cursor: pointer; text-align: left; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }\n\n  /* Tableau de bord */\n  .funnel { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }\n  .funnel div { border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }\n  .funnel .n { font: 700 24px var(--font-title); }\n  .todo { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-top: 1px solid #EEF0F3; }\n  .todo:first-of-type { border-top: 0; }\n  .todo .n { min-width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font: 700 18px var(--font-title); }\n  .todo .t { flex: 1 1 auto; }\n  .bars { display: flex; flex-direction: column; gap: 12px; }\n  .bar-row { display: grid; grid-template-columns: minmax(110px, 160px) minmax(0, 1fr) 56px; gap: 12px; align-items: center; font-size: 13px; }\n  .bar { height: 10px; background: #EEF0F3; border-radius: 999px; overflow: hidden; }\n  .bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); }\n  .bar span.low { background: #C2620A; }\n\n  /* Centre de confirmation */\n  .stats { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; }\n  .stats span { padding: 8px 12px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); }\n  .confirm { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }\n  .queue { flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 150px); overflow: auto; padding: 2px; }\n  .queue-title { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 6px; }\n  .q-item { width: 100%; text-align: left; padding: 13px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; display: flex; flex-direction: column; gap: 6px; }\n  .q-item[aria-current=\"true\"] { border: 2px solid var(--brand); padding: 12px; }\n  .q-top { display: flex; justify-content: space-between; gap: 8px; }\n  .q-tags { display: flex; flex-wrap: wrap; gap: 6px; }\n  .detail { flex: 3 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }\n  .detail-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }\n  .detail-head h2 { font: 700 22px var(--font-title); }\n  .history { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; }\n  .sum { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; margin-top: 14px; border-top: 1px solid #EEF0F3; }\n  .sum div { display: flex; justify-content: space-between; gap: 12px; }\n  .sum .total { font-size: 16px; font-weight: 700; }\n  .outcomes { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }\n  .panel { margin-top: 12px; padding: 14px; border-radius: 10px; background: var(--soft); display: flex; flex-direction: column; gap: 12px; }\n  .quick { display: flex; flex-wrap: wrap; gap: 8px; }\n  .message { padding: 14px; border-radius: 10px; background: var(--soft); line-height: 1.55; white-space: pre-wrap; }\n  .queue-toggle { display: none; }\n\n  /* Fenêtre (modale) */\n  .modal-backdrop { position: fixed; inset: 0; background: rgba(16, 24, 28, .45); display: flex; align-items: flex-start; justify-content: center; padding: 32px 16px; overflow: auto; z-index: 50; }\n  .modal { background: var(--surface); border-radius: 14px; width: 100%; max-width: 760px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }\n  .modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }\n  .modal-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }\n  .icon-btn { min-width: 44px; min-height: 44px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); cursor: pointer; font-size: 20px; line-height: 1; }\n\n  #toast {\n    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 60; max-width: calc(100% - 32px);\n    background: var(--ink); color: #FFFFFF; padding: 12px 18px; border-radius: 10px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,.18);\n    opacity: 0; pointer-events: none; transition: opacity .2s;\n  }\n  #toast.show { opacity: 1; }\n  #toast.error { background: #A12626; }\n\n  @media (max-width: 860px) {\n    .sidebar { display: none; }\n    .mobile-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--side); padding: 14px 16px; position: sticky; top: 0; z-index: 30; }\n    .mobile-user { color: var(--side-muted); font-size: 13px; }\n    .content { padding: 16px 14px 96px; }\n    h1 { font-size: 22px; }\n    .bottom-nav {\n      display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;\n      background: var(--side); padding: 6px 6px calc(6px + env(safe-area-inset-bottom));\n    }\n    .bottom-nav a { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--side-ink); text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 10px; }\n    .bottom-nav a.active { background: var(--side-active); color: #FFFFFF; }\n    #toast { bottom: 84px; }\n    .queue { max-height: none; }\n    .queue:not(.open) { display: none; }\n    .queue-toggle { display: inline-flex; }\n    .stats { display: none; }\n    table.cards thead { display: none; }\n    table.cards tr { display: block; padding: 10px 12px; border-top: 1px solid #EEF0F3; }\n    table.cards tbody tr:first-child { border-top: 0; }\n    table.cards td { display: flex; justify-content: space-between; gap: 12px; border: 0; padding: 3px 0; text-align: right; }\n    table.cards td::before { content: attr(data-label); color: var(--muted); font-size: 12px; text-align: left; }\n    table.cards td.num { text-align: right; }\n    .modal-backdrop { padding: 0; }\n    .modal { border-radius: 0; min-height: 100%; }\n  }\n</style>\n",
  App: "<script>\n(function () {\n  'use strict';\n\n  /* ================================================================ */\n  /* État et outils                                                   */\n  /* ================================================================ */\n\n  var S = {\n    boot: null,\n    route: '',\n    period: '7',\n    filter: { status: 'all', q: '', wilaya: '', period: '30', limit: 100 },\n    queue: null,\n    currentId: null,\n    current: null,\n    busy: false,\n    token: 0,\n    detailToken: 0\n  };\n  var TZ = 'Africa/Algiers';\n  var ALERT = {\n    bad: { bg: '#FBE7E7', fg: '#A12626' },\n    warn: { bg: '#FCEBDD', fg: '#9A4200' },\n    ok: { bg: '#DDF0E4', fg: '#146C2E' },\n    'new': { bg: '#E6EEFB', fg: '#1E4FA8' }\n  };\n  var view = document.getElementById('view');\n\n  /** Appelle une fonction du serveur (Api.gs) et renvoie une promesse. */\n  function call(fn) {\n    var args = Array.prototype.slice.call(arguments, 1);\n    return new Promise(function (resolve, reject) {\n      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);\n      runner[fn].apply(runner, args);\n    });\n  }\n\n  function $(sel, root) { return (root || document).querySelector(sel); }\n  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }\n\n  function h(value) {\n    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"']/g, function (c) {\n      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c];\n    });\n  }\n  function errText(e) { return (e && e.message) ? e.message : String(e || 'Erreur inconnue'); }\n  function errorBox(e) { return '<div class=\"error-box\" role=\"alert\">' + h(errText(e)) + '</div>'; }\n\n  function money(n) {\n    var v = Math.round(Number(n) || 0);\n    return String(v).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ') + ' DA';\n  }\n  function pct(a, b) { return b ? Math.round(a / b * 100) + ' %' : '—'; }\n  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }\n\n  function fmtDate(iso, withDay) {\n    if (!iso) return '—';\n    var d = new Date(iso);\n    var o = { timeZone: TZ, hour: '2-digit', minute: '2-digit' };\n    if (withDay !== false) { o.day = '2-digit'; o.month = '2-digit'; }\n    try { return d.toLocaleString('fr-FR', o); } catch (e) { return d.toLocaleString('fr-FR'); }\n  }\n  function ago(iso) {\n    if (!iso) return '';\n    var diff = Date.now() - new Date(iso).getTime();\n    var future = diff < 0;\n    var m = Math.round(Math.abs(diff) / 60000);\n    var txt = m < 1 ? 'à l’instant' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' j';\n    if (m < 1) return txt;\n    return future ? 'dans ' + txt : 'il y a ' + txt;\n  }\n  function fmtPhone(p) {\n    var s = String(p || '');\n    if (/^0\\d{9}$/.test(s)) return s.replace(/^(\\d{4})(\\d{2})(\\d{2})(\\d{2})$/, '$1 $2 $3 $4');\n    return s;\n  }\n  function wilayaName(w) { return String(w || '').replace(/^\\d+\\s*-\\s*/, ''); }\n\n  function pill(status) {\n    var st = (S.boot && S.boot.styles[status]) || { bg: '#EEF0F3', fg: '#3D4350' };\n    return '<span class=\"pill\" style=\"background:' + st.bg + ';color:' + st.fg + '\">' + h(status || '—') + '</span>';\n  }\n  function alertPill(text, level) {\n    if (!text) return '';\n    var st = ALERT[level] || ALERT['new'];\n    return '<span class=\"pill\" style=\"background:' + st.bg + ';color:' + st.fg + '\">' + h(text) + '</span>';\n  }\n\n  /** Liste d'options ; garde une valeur inconnue pour ne pas la perdre. */\n  function options(list, selected, emptyLabel) {\n    var out = emptyLabel !== undefined ? '<option value=\"\">' + h(emptyLabel) + '</option>' : '';\n    if (selected && list.indexOf(selected) < 0) out += '<option selected>' + h(selected) + '</option>';\n    return out + list.map(function (v) {\n      return '<option' + (v === selected ? ' selected' : '') + '>' + h(v) + '</option>';\n    }).join('');\n  }\n  function field(label, control, cls) {\n    return '<label class=\"field' + (cls ? ' ' + cls : '') + '\">' + h(label) + control + '</label>';\n  }\n  function input(name, value, attrs) {\n    return '<input name=\"' + name + '\" value=\"' + h(value) + '\"' + (attrs || '') + '>';\n  }\n  function readForm(root) {\n    var out = {};\n    $all('[name]', root).forEach(function (el) {\n      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;\n    });\n    return out;\n  }\n\n  var toastTimer = null;\n  function toast(msg, isError) {\n    var t = $('#toast');\n    t.textContent = msg;\n    t.className = 'show' + (isError ? ' error' : '');\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(function () { t.className = ''; }, isError ? 6000 : 3200);\n  }\n\n  /** Frais de livraison d'après l'onglet Tarifs, ou null. */\n  function feeFor(wilaya, carrier, mode) {\n    var code = parseInt(String(wilaya || ''), 10);\n    var r = S.boot.rates[code];\n    var c = carrier || S.boot.defaultCarrier;\n    if (r && r[c] && r[c][mode] !== undefined) return r[c][mode];\n    return null;\n  }\n\n  /* ================================================================ */\n  /* Navigation                                                       */\n  /* ================================================================ */\n\n  var ROUTES = ['tableau', 'commandes', 'confirmation'];\n\n  function go() {\n    var r = (location.hash || '').replace(/^#\\/?/, '');\n    if (ROUTES.indexOf(r) < 0) r = 'tableau';\n    S.route = r;\n    $all('[data-route]').forEach(function (a) {\n      var on = a.getAttribute('data-route') === r;\n      a.classList.toggle('active', on);\n      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');\n    });\n    closeModal();\n    if (r === 'tableau') pageDashboard();\n    else if (r === 'commandes') pageOrders();\n    else pageConfirm();\n    view.focus({ preventScroll: true });\n    window.scrollTo(0, 0);\n  }\n\n  function navigate(route, status) {\n    if (status) { S.filter.status = status; S.filter.limit = 100; }\n    if (location.hash === '#/' + route) go(); else location.hash = '#/' + route;\n  }\n\n  function setQueueCount(n) {\n    $all('[data-queue-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });\n  }\n  function refreshCount() {\n    call('api_queue').then(function (q) { setQueueCount(q.stats.due); }).catch(function () {});\n  }\n\n  /* ================================================================ */\n  /* Tableau de bord                                                  */\n  /* ================================================================ */\n\n  function pageDashboard() {\n    var t = ++S.token;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 jours'], ['30', '30 jours'], ['all', 'Tout']];\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Tableau de bord</h1><p class=\"sub\">Vue d’ensemble de vos commandes COD</p></div>' +\n      '<div class=\"seg\" role=\"group\" aria-label=\"Période\">' + periods.map(function (p) {\n        return '<button type=\"button\" data-act=\"period\" data-period=\"' + p[0] + '\" aria-pressed=\"' + (S.period === p[0]) + '\">' + p[1] + '</button>';\n      }).join('') + '</div></div>' +\n      '<div id=\"dash\"><p class=\"loading\">Chargement…</p></div>';\n    call('api_dashboard', S.period).then(function (d) {\n      if (t === S.token) renderDashboard(d);\n    }).catch(function (e) {\n      if (t === S.token) $('#dash').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderDashboard(d) {\n    var st = S.boot.styles;\n    var kpis = [\n      ['Commandes reçues', d.received, plural(d.waiting, 'commande en attente', 'commandes en attente')],\n      ['Taux de confirmation', pct(d.confirmed, d.decided), d.confirmed + ' confirmées sur ' + d.decided + ' traitées'],\n      ['Taux de livraison', pct(d.delivered, d.delivered + d.returned), d.delivered + ' livrées · ' + d.returned + ' retours'],\n      ['Montant livré', money(d.revenueDelivered), 'Commandes livrées sur la période'],\n      ['Argent en route', money(d.inTransitAmount), plural(d.inTransitCount, 'colis pas encore livré', 'colis pas encore livrés')]\n    ];\n    var funnel = [\n      ['Reçues', d.received, '#EEF0F3', '#3D4350'],\n      ['Confirmées', d.confirmed, st['Confirmée'].bg, st['Confirmée'].fg],\n      ['Expédiées', d.shipped, st['Expédiée'].bg, st['Expédiée'].fg],\n      ['Livrées', d.delivered, st['Livrée'].bg, st['Livrée'].fg],\n      ['Retours', d.returned, st['Retour'].bg, st['Retour'].fg],\n      ['Annulées', d.cancelled, st['Annulée'].bg, st['Annulée'].fg]\n    ];\n    var todo = [\n      [d.todo.toConfirm, 'à appeler maintenant', 'confirmation', '', 'Confirmer', st['À confirmer']],\n      [d.todo.callbacksToday, 'rappels prévus plus tard aujourd’hui', 'confirmation', '', 'Voir', st['Rappeler']],\n      [d.todo.toShip, 'commandes confirmées à expédier', 'commandes', 'Confirmée', 'Voir', st['Confirmée']],\n      [d.todo.unreachable, 'clients injoignables', 'commandes', 'Injoignable', 'Voir', st['Injoignable']]\n    ];\n\n    var html = '<div class=\"stack\">';\n    html += '<section class=\"grid-kpi\" aria-label=\"Chiffres clés\">' + kpis.map(function (k) {\n      return '<div class=\"card kpi\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + h(k[1]) + '</span><span class=\"note\">' + h(k[2]) + '</span></div>';\n    }).join('') + '</section>';\n\n    html += '<section class=\"card\"><h2>Parcours des commandes</h2><div class=\"funnel\">' + funnel.map(function (f) {\n      return '<div style=\"background:' + f[2] + ';color:' + f[3] + '\"><span class=\"strong\">' + f[0] + '</span><span class=\"n\">' + f[1] + '</span><span class=\"small\" style=\"color:' + f[3] + '\">' + (d.received ? pct(f[1], d.received) + ' des reçues' : 'aucune commande') + '</span></div>';\n    }).join('') + '</div></section>';\n\n    html += '<div class=\"row\">';\n    html += '<section class=\"card\"><h2>À faire</h2>' + todo.map(function (t) {\n      return '<div class=\"todo\"><span class=\"n\" style=\"background:' + t[5].bg + ';color:' + t[5].fg + '\">' + t[0] + '</span>' +\n        '<span class=\"t\">' + h(t[1]) + '</span>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"goto\" data-route=\"' + t[2] + '\" data-status=\"' + h(t[3]) + '\">' + t[4] + '</button></div>';\n    }).join('') + '</section>';\n\n    html += '<section class=\"card\"><h2>Taux de livraison par wilaya</h2>';\n    if (!d.byWilaya.length) {\n      html += '<p class=\"empty\">Pas encore de colis expédiés sur la période.</p>';\n    } else {\n      html += '<div class=\"bars\">' + d.byWilaya.map(function (w) {\n        var done = w.delivered + w.returned;\n        var rate = done ? Math.round(w.delivered / done * 100) : null;\n        return '<div class=\"bar-row\"><span>' + h(w.name) + '<br><span class=\"small\">' + plural(w.orders, 'colis', 'colis') + '</span></span>' +\n          '<span class=\"bar\" aria-hidden=\"true\"><span class=\"' + (rate !== null && rate < 70 ? 'low' : '') + '\" style=\"width:' + (rate || 0) + '%\"></span></span>' +\n          '<span class=\"strong\" style=\"text-align:right\">' + (rate === null ? '—' : rate + ' %') + '</span></div>';\n      }).join('') + '</div><p class=\"small\" style=\"margin-top:12px\">Orange : moins de 70 % livrés. « — » : aucun colis terminé.</p>';\n    }\n    html += '</section></div>';\n\n    html += '<div class=\"row\">';\n    html += '<section class=\"card\"><h2>Par confirmatrice</h2>' + (d.byAgent.length ? table(\n      ['Confirmatrice', 'Traitées', 'Confirmées', 'Taux'],\n      d.byAgent.map(function (a) { return [h(a.name), a.orders, a.confirmed, pct(a.confirmed, a.orders)]; }), [1, 2, 3]\n    ) : '<p class=\"empty\">Aucune commande traitée sur la période.</p>') + '</section>';\n    html += '<section class=\"card\"><h2>Par produit</h2>' + (d.byProduct.length ? table(\n      ['Produit', 'Commandes', 'Confirmées', 'Livrées', 'Retours'],\n      d.byProduct.map(function (p) { return [h(p.name), p.orders, p.confirmed, p.delivered, p.returned]; }), [1, 2, 3, 4]\n    ) : '<p class=\"empty\">Aucune commande sur la période.</p>') + '</section>';\n    html += '</div></div>';\n    $('#dash').innerHTML = html;\n  }\n\n  function table(head, rows, numCols) {\n    numCols = numCols || [];\n    return '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' + head.map(function (t) {\n      return '<th scope=\"col\">' + h(t) + '</th>';\n    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {\n      return '<tr>' + r.map(function (c, i) {\n        return '<td data-label=\"' + h(head[i]) + '\"' + (numCols.indexOf(i) >= 0 ? ' class=\"num\"' : '') + '>' + c + '</td>';\n      }).join('') + '</tr>';\n    }).join('') + '</tbody></table></div>';\n  }\n\n  /* ================================================================ */\n  /* Commandes                                                        */\n  /* ================================================================ */\n\n  function pageOrders() {\n    var f = S.filter;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 derniers jours'], ['30', '30 derniers jours'], ['all', 'Tout']];\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Commandes</h1><p class=\"sub\">Toutes les commandes du classeur. Cliquez sur une commande pour la modifier.</p></div>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"new-order\">+ Nouvelle commande</button></div>' +\n      '<div class=\"chips\" id=\"chips\" role=\"group\" aria-label=\"Filtrer par statut\"></div>' +\n      '<div class=\"filters\">' +\n        field('Rechercher', '<input type=\"search\" id=\"f-q\" value=\"' + h(f.q) + '\" placeholder=\"Nom, téléphone, n° de commande ou de suivi\">', 'wide') +\n        field('Wilaya', '<select id=\"f-wilaya\">' + options(S.boot.wilayas, f.wilaya, 'Toutes les wilayas') + '</select>') +\n        field('Période', '<select id=\"f-period\">' + periods.map(function (p) {\n          return '<option value=\"' + p[0] + '\"' + (f.period === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';\n        }).join('') + '</select>') +\n      '</div>' +\n      '<div id=\"orders-list\"><p class=\"loading\">Chargement…</p></div>';\n    loadOrders();\n  }\n\n  function loadOrders() {\n    var t = ++S.token;\n    call('api_listOrders', S.filter).then(function (res) {\n      if (t !== S.token || S.route !== 'commandes') return;\n      renderChips(res.counts);\n      renderOrderList(res);\n    }).catch(function (e) {\n      if (t === S.token) $('#orders-list').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderChips(counts) {\n    var list = [['all', 'Toutes'], ['queue', 'À traiter']].concat(S.boot.statuses.map(function (s) { return [s, s]; }));\n    $('#chips').innerHTML = list.filter(function (c) {\n      return c[0] === 'all' || c[0] === S.filter.status || counts[c[0]];\n    }).map(function (c) {\n      return '<button type=\"button\" class=\"chip\" data-act=\"chip\" data-status=\"' + h(c[0]) + '\" aria-pressed=\"' + (S.filter.status === c[0]) + '\">' +\n        h(c[1]) + ' · ' + (counts[c[0]] || 0) + '</button>';\n    }).join('');\n  }\n\n  function renderOrderList(res) {\n    var box = $('#orders-list');\n    if (!res.rows.length) {\n      box.innerHTML = '<div class=\"card\"><p class=\"empty\">Aucune commande ne correspond à ces filtres.</p></div>';\n      return;\n    }\n    var head = ['N°', 'Client', 'Wilaya', 'Produit', 'Total', 'Statut', 'Alerte', 'Livraison'];\n    var html = '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' + head.map(function (t) {\n      return '<th scope=\"col\">' + t + '</th>';\n    }).join('') + '</tr></thead><tbody>';\n    res.rows.forEach(function (o) {\n      html += '<tr class=\"clickable\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' +\n        '<td data-label=\"N°\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' + h(o.id) + '</button><div class=\"small\">' + fmtDate(o.date) + '</div></td>' +\n        '<td data-label=\"Client\">' + h(o.client) + '<div class=\"small\">' + h(fmtPhone(o.phone)) + '</div></td>' +\n        '<td data-label=\"Wilaya\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"Produit\">' + h(o.product) + (o.qty > 1 ? ' ×' + o.qty : '') + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"Statut\">' + pill(o.status) + '</td>' +\n        '<td data-label=\"Alerte\">' + alertPill(o.alert, o.alertLevel) + '</td>' +\n        '<td data-label=\"Livraison\">' + h(o.mode) + '<div class=\"small\">' + h([o.carrier, o.tracking].filter(Boolean).join(' · ')) + '</div></td>' +\n      '</tr>';\n    });\n    html += '</tbody></table></div>';\n    html += '<p class=\"small\" style=\"margin-top:10px\">' + res.rows.length + ' sur ' + res.total + ' commande(s)</p>';\n    if (res.total > res.rows.length) html += '<p style=\"margin-top:10px\"><button type=\"button\" class=\"btn\" data-act=\"more\">Afficher plus</button></p>';\n    box.innerHTML = html;\n  }\n\n  /* ---------------- Fenêtre de commande ---------------- */\n\n  function showModal(html) {\n    $('#modal-root').innerHTML = '<div class=\"modal-backdrop\"><div class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"modal-title\">' + html + '</div></div>';\n    var first = $('#modal-root input, #modal-root select, #modal-root button');\n    if (first) first.focus();\n  }\n  function closeModal() { $('#modal-root').innerHTML = ''; }\n  function modalOpen() { return !!$('#modal-root .modal'); }\n  function modalHead(title, extra) {\n    return '<div class=\"modal-head\"><div><h2 id=\"modal-title\" style=\"font:700 20px var(--font-title)\">' + title + '</h2>' + (extra || '') + '</div>' +\n      '<button type=\"button\" class=\"icon-btn\" data-act=\"close-modal\" aria-label=\"Fermer\">×</button></div>';\n  }\n\n  function orderFields(o) {\n    var b = S.boot;\n    return '<div class=\"form-grid\">' +\n      field('Client', input('client', o.client)) +\n      field('Téléphone', input('phone', o.phone, ' inputmode=\"tel\"')) +\n      field('Wilaya', '<select name=\"wilaya\">' + options(b.wilayas, o.wilaya, 'Choisir…') + '</select>') +\n      field('Commune', input('commune', o.commune)) +\n      field('Adresse', input('address', o.address), 'full') +\n      field('Produit', input('product', o.product, ' list=\"product-list\"')) +\n      field('Quantité', input('qty', o.qty || 1, ' type=\"number\" min=\"1\" step=\"1\"')) +\n      field('Prix des produits (DA)', input('price', o.price || '', ' type=\"number\" min=\"0\" step=\"10\"')) +\n      field('Livraison', '<select name=\"mode\">' + options(b.modes, o.mode || b.modes[0]) + '</select>') +\n      field('Société', '<select name=\"carrier\">' + options(b.carriers, o.carrier, 'Par défaut (' + b.defaultCarrier + ')') + '</select>') +\n      field('Frais de livraison (DA)', input('shipping', o.shipping === null || o.shipping === undefined ? '' : o.shipping, ' type=\"number\" min=\"0\" step=\"10\" placeholder=\"Calcul automatique\"')) +\n      (o.id ? field('N° de suivi', input('tracking', o.tracking)) : '') +\n      field('Notes', '<textarea name=\"notes\">' + h(o.notes) + '</textarea>', 'full') +\n      '</div>' +\n      '<datalist id=\"product-list\">' + b.products.map(function (p) { return '<option value=\"' + h(p.name) + '\">'; }).join('') + '</datalist>';\n  }\n\n  function openOrder(id) {\n    showModal(modalHead('Commande ' + h(id)) + '<p class=\"loading\">Chargement…</p>');\n    call('api_getOrder', id).then(renderOrderModal).catch(function (e) {\n      showModal(modalHead('Commande ' + h(id)) + errorBox(e));\n    });\n  }\n\n  function renderOrderModal(data) {\n    var o = data.order;\n    var hist = data.history;\n    var b = S.boot;\n    var meta = '<p class=\"small\" style=\"margin-top:4px\">Reçue le ' + fmtDate(o.date) + ' · source : ' + h(o.source || '—') +\n      (o.agent ? ' · traitée par ' + h(o.agent) : '') + (o.attempts ? ' · ' + plural(o.attempts, 'appel', 'appels') : '') + '</p>' +\n      '<p style=\"margin-top:8px;display:flex;gap:6px;flex-wrap:wrap\">' + pill(o.status) + alertPill(o.alert, o.alertLevel) + '</p>';\n    var histText = hist.orders\n      ? 'Autres commandes de ce numéro : ' + hist.orders + ' (' + hist.delivered + ' livrées, ' + hist.returned + ' retours, ' + hist.cancelled + ' annulées)'\n      : 'Première commande avec ce numéro.';\n    showModal(\n      modalHead('Commande ' + h(o.id), meta) +\n      '<p class=\"small\">' + h(histText) + '</p>' +\n      '<div id=\"order-form\" data-id=\"' + h(o.id) + '\">' +\n        '<div class=\"form-grid\">' +\n          field('Statut', '<select name=\"status\" data-role=\"status\">' + options(b.statuses, o.status) + '</select>') +\n          field('Motif d’annulation', '<select name=\"cancelReason\">' + options(b.cancelReasons, o.cancelReason, 'Choisir…') + '</select>') +\n        '</div>' +\n        '<div style=\"height:12px\"></div>' +\n        orderFields(o) +\n      '</div>' +\n      '<div class=\"modal-actions\">' +\n        (data.phoneValid ? '<button type=\"button\" class=\"btn ' + (data.blacklisted ? '' : 'danger') + '\" data-act=\"toggle-blacklist\" data-phone=\"' + h(o.phone) + '\" data-on=\"' + (!data.blacklisted) + '\">' +\n          (data.blacklisted ? 'Retirer de la liste noire' : 'Mettre en liste noire') + '</button>' : '') +\n        '<button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button>' +\n        '<button type=\"button\" class=\"btn primary\" data-act=\"save-order\" data-id=\"' + h(o.id) + '\">Enregistrer</button>' +\n      '</div>'\n    );\n    toggleCancelField();\n  }\n\n  function toggleCancelField() {\n    var st = $('#order-form [data-role=\"status\"]');\n    var reason = $('#order-form [name=\"cancelReason\"]');\n    if (!st || !reason) return;\n    reason.closest('.field').hidden = st.value !== 'Annulée';\n  }\n\n  function openNewOrder() {\n    showModal(\n      modalHead('Nouvelle commande', '<p class=\"small\" style=\"margin-top:4px\">Elle sera ajoutée au classeur et à la file de confirmation.</p>') +\n      '<div id=\"order-form\">' + orderFields({ qty: 1, mode: S.boot.modes[0] }) + '</div>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"create-order\">Ajouter la commande</button></div>'\n    );\n  }\n\n  function afterOrderChange() {\n    if (S.route === 'commandes') loadOrders();\n    else if (S.route === 'tableau') pageDashboard();\n    refreshCount();\n  }\n\n  function saveOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    var data = readForm($('#order-form'));\n    btn.disabled = true;\n    call('api_updateOrder', id, data).then(function (o) {\n      closeModal();\n      toast('Commande ' + o.id + ' enregistrée');\n      afterOrderChange();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function createOrder(btn) {\n    var data = readForm($('#order-form'));\n    btn.disabled = true;\n    call('api_createOrder', data).then(function (o) {\n      closeModal();\n      toast('Commande ' + o.id + ' ajoutée');\n      afterOrderChange();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function toggleBlacklist(btn) {\n    var on = btn.getAttribute('data-on') === 'true';\n    btn.disabled = true;\n    call('api_setBlacklist', btn.getAttribute('data-phone'), on).then(function (r) {\n      toast(r.blacklisted ? 'Numéro ajouté à la liste noire' : 'Numéro retiré de la liste noire');\n      btn.setAttribute('data-on', String(!r.blacklisted));\n      btn.textContent = r.blacklisted ? 'Retirer de la liste noire' : 'Mettre en liste noire';\n      btn.classList.toggle('danger', !r.blacklisted);\n      btn.disabled = false;\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Centre de confirmation                                           */\n  /* ================================================================ */\n\n  function pageConfirm() {\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Centre de confirmation</h1><p class=\"sub\">Connecté(e) : ' + h(S.boot.user.name) + '</p></div>' +\n      '<div class=\"stats\" id=\"cstats\"></div></div>' +\n      '<div class=\"confirm\">' +\n        '<section class=\"queue\" id=\"queue\" aria-label=\"File d’appels\"><p class=\"loading\">Chargement…</p></section>' +\n        '<section class=\"detail\" id=\"detail\"></section>' +\n      '</div>';\n    S.currentId = null;\n    loadQueue(true);\n  }\n\n  function loadQueue(selectFirst) {\n    return call('api_queue').then(function (q) {\n      if (S.route !== 'confirmation') return;\n      S.queue = q;\n      setQueueCount(q.stats.due);\n      renderQueue();\n      var ids = q.due.concat(q.later).map(function (x) { return x.id; });\n      if (selectFirst || !S.currentId || ids.indexOf(S.currentId) < 0) {\n        if (!selectFirst && S.currentId && !S.busy) toast('La commande ' + S.currentId + ' a été traitée par une autre personne.');\n        if (q.due.length) openInDetail(q.due[0].id);\n        else renderEmptyDetail();\n      }\n    }).catch(function (e) {\n      if (S.route === 'confirmation') $('#queue').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderQueue() {\n    var q = S.queue;\n    $('#cstats').innerHTML =\n      '<span>À appeler : <strong>' + q.stats.due + '</strong></span>' +\n      '<span>Rappels plus tard : <strong>' + q.stats.later + '</strong></span>' +\n      '<span style=\"background:#E3F2EC;color:#0B6B4C;border-color:#BFE0D2\">Mes confirmations aujourd’hui : <strong>' + q.stats.confirmedToday + '</strong></span>';\n    var item = function (x) {\n      var when = x.status === 'À confirmer' ? 'reçue ' + ago(x.date) : (x.callback ? 'rappel ' + fmtDate(x.callback) : ago(x.date));\n      return '<button type=\"button\" class=\"q-item\" data-act=\"q-open\" data-id=\"' + h(x.id) + '\" aria-current=\"' + (x.id === S.currentId) + '\">' +\n        '<span class=\"q-top\"><strong>' + h(x.client || 'Sans nom') + '</strong><span class=\"small\">' + h(when) + '</span></span>' +\n        '<span class=\"small\" style=\"color:var(--ink-2)\">' + h(x.id) + ' · ' + h(wilayaName(x.wilaya)) + ' · ' + money(x.total) + '</span>' +\n        '<span class=\"q-tags\">' + alertPill(x.alert, x.alertLevel) + (x.status !== 'À confirmer' ? pill(x.status) : '') +\n          (x.attempts ? '<span class=\"pill\" style=\"background:#EEF0F3;color:#3D4350\">' + plural(x.attempts, 'appel', 'appels') + '</span>' : '') +\n        '</span></button>';\n    };\n    var html = '<div class=\"q-top\"><span class=\"queue-title\">À appeler · ' + q.due.length + '</span>' +\n      '<button type=\"button\" class=\"btn\" style=\"min-height:36px;padding:0 10px\" data-act=\"refresh-queue\">Actualiser</button></div>';\n    html += q.due.length ? q.due.map(item).join('') : '<p class=\"small\">Personne à appeler pour le moment.</p>';\n    if (q.later.length) html += '<span class=\"queue-title\">Rappels programmés · ' + q.later.length + '</span>' + q.later.map(item).join('');\n    $('#queue').innerHTML = html;\n  }\n\n  function markCurrent() {\n    $all('#queue .q-item').forEach(function (b) {\n      b.setAttribute('aria-current', String(b.getAttribute('data-id') === S.currentId));\n    });\n  }\n\n  function renderEmptyDetail() {\n    S.currentId = null;\n    S.current = null;\n    var next = S.queue && S.queue.later[0];\n    $('#detail').innerHTML = '<div class=\"card\"><h2>La file est vide</h2><p class=\"sub\">Les nouvelles commandes arrivent automatiquement (toutes les 5 minutes).' +\n      (next ? ' Prochain rappel : ' + h(next.client) + ', ' + fmtDate(next.callback) + '.' : '') + '</p></div>';\n  }\n\n  function openInDetail(id) {\n    S.currentId = id;\n    markCurrent();\n    $('#queue').classList.remove('open');\n    $('#detail').innerHTML = '<div class=\"card\"><p class=\"loading\">Chargement…</p></div>';\n    var t = ++S.detailToken;\n    call('api_getOrder', id).then(function (data) {\n      if (t !== S.detailToken || S.route !== 'confirmation') return;\n      S.current = data;\n      renderDetail();\n    }).catch(function (e) {\n      if (t === S.detailToken) $('#detail').innerHTML = '<div class=\"card\">' + errorBox(e) + '</div>';\n    });\n  }\n\n  function renderDetail() {\n    var d = S.current;\n    var o = d.order;\n    var b = S.boot;\n    var hist = d.history;\n    var a = ALERT[o.alertLevel] || ALERT['new'];\n    var histText = hist.orders\n      ? plural(hist.orders, 'autre commande', 'autres commandes') + ' : ' + hist.delivered + ' livrée(s), ' + hist.returned + ' retour(s), ' + hist.cancelled + ' annulée(s)'\n      : 'Première commande avec ce numéro';\n    var dueCount = S.queue ? S.queue.due.length : 0;\n    var callBtn = d.phoneValid\n      ? '<a class=\"btn primary\" href=\"tel:' + h(o.phone) + '\" target=\"_top\">Appeler</a>'\n      : '<span class=\"btn\" aria-disabled=\"true\">Numéro invalide</span>';\n    var waBtn = d.intlPhone\n      ? '<a class=\"btn\" id=\"d-wa\" href=\"#\" target=\"_blank\" rel=\"noopener\">WhatsApp</a>'\n      : '';\n\n    $('#detail').innerHTML =\n      '<div class=\"card\">' +\n        '<div class=\"detail-head\"><div><h2>' + h(o.client || 'Client sans nom') + ' · ' + h(o.id) + '</h2>' +\n          '<p class=\"muted\">' + h(fmtPhone(o.phone)) + ' · reçue ' + h(ago(o.date)) + (o.attempts ? ' · ' + plural(o.attempts, 'appel', 'appels') : '') + '</p></div>' +\n          '<div class=\"quick\"><button type=\"button\" class=\"btn queue-toggle\" data-act=\"toggle-queue\">File (' + dueCount + ')</button>' + callBtn + waBtn + '</div>' +\n        '</div>' +\n        '<div class=\"history\" style=\"background:' + a.bg + '\"><span class=\"strong\" style=\"color:' + a.fg + '\">' + h(o.alert || 'Nouveau client') + '</span><span>' + h(histText) + '</span></div>' +\n        '<div class=\"form-grid\" id=\"d-form\">' +\n          field('Client', input('client', o.client)) +\n          field('Téléphone', input('phone', o.phone, ' inputmode=\"tel\"')) +\n          field('Wilaya', '<select name=\"wilaya\">' + options(b.wilayas, o.wilaya, 'Choisir…') + '</select>') +\n          field('Commune', input('commune', o.commune)) +\n          field('Livraison', '<select name=\"mode\">' + options(b.modes, o.mode || b.modes[0]) + '</select>') +\n          field('Quantité', input('qty', o.qty, ' type=\"number\" min=\"1\" step=\"1\"')) +\n          field('Adresse', input('address', o.address), 'full') +\n          field('Notes', '<textarea name=\"notes\">' + h(o.notes) + '</textarea>', 'full') +\n        '</div>' +\n        '<div class=\"sum\" id=\"d-sum\"></div>' +\n      '</div>' +\n      '<div class=\"card\"><h3>Résultat de l’appel</h3>' +\n        '<div class=\"outcomes\">' +\n          '<button type=\"button\" class=\"btn primary big\" data-act=\"confirm\">Confirmer</button>' +\n          '<button type=\"button\" class=\"btn big\" data-act=\"no_answer\">Pas de réponse</button>' +\n          '<button type=\"button\" class=\"btn warn big\" data-act=\"show-callback\">Rappeler plus tard</button>' +\n          '<button type=\"button\" class=\"btn danger big\" data-act=\"show-cancel\">Annuler</button>' +\n        '</div><div id=\"d-panel\"></div>' +\n      '</div>' +\n      '<div class=\"card\"><h3>Message WhatsApp</h3><p class=\"message\" id=\"d-msg\"></p>' +\n        '<p class=\"small\" style=\"margin-top:8px\">Modèle modifiable dans l’onglet Paramètres (MESSAGE_WHATSAPP).</p></div>';\n    updateSummary();\n  }\n\n  /** Recalcule prix, frais, total et message quand la confirmatrice modifie la commande. */\n  function updateSummary() {\n    if (!S.current || !$('#d-form')) return;\n    var o = S.current.order;\n    var f = readForm($('#d-form'));\n    var qty = Math.max(1, parseInt(f.qty, 10) || 1);\n    var unit = o.qty ? o.price / o.qty : o.price;\n    var price = qty === o.qty ? o.price : Math.round(unit * qty);\n    var changed = f.wilaya !== o.wilaya || f.mode !== o.mode;\n    var fee = feeFor(f.wilaya, o.carrier, f.mode);\n    var shipping = (changed || o.shipping === null) && fee !== null ? fee : (o.shipping || 0);\n    var total = (price !== o.price || shipping !== (o.shipping || 0)) ? price + shipping : o.total;\n    var carrier = o.carrier || S.boot.defaultCarrier;\n    $('#d-sum').innerHTML =\n      '<div><span>' + h(f.product || o.product || 'Produits') + ' ×' + qty + '</span><span>' + money(price) + '</span></div>' +\n      '<div class=\"muted\"><span>Livraison ' + h(f.mode) + ' · ' + h(carrier) + (fee === null ? ' (tarif non renseigné)' : '') + '</span><span>' + money(shipping) + '</span></div>' +\n      '<div class=\"total\"><span>Total à encaisser</span><span>' + money(total) + '</span></div>';\n    var msg = fillTemplate(S.boot.waTemplate, {\n      client: f.client, id: o.id, product: o.product, qty: qty, total: total, commune: f.commune, wilaya: f.wilaya\n    });\n    $('#d-msg').textContent = msg;\n    var wa = $('#d-wa');\n    if (wa) wa.href = 'https://wa.me/' + S.current.intlPhone + '?text=' + encodeURIComponent(msg);\n  }\n\n  function fillTemplate(tpl, x) {\n    var first = String(x.client || '').trim().split(/\\s+/)[0] || '';\n    var map = {\n      prenom: first,\n      client: x.client || '',\n      numero: x.id,\n      produit: (x.product || '') + (x.qty > 1 ? ' ×' + x.qty : ''),\n      total: money(x.total),\n      commune: x.commune || '',\n      wilaya: wilayaName(x.wilaya),\n      boutique: S.boot.shop\n    };\n    return String(tpl || '').replace(/\\{(\\w+)\\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });\n  }\n\n  function showPanel(kind) {\n    var p = $('#d-panel');\n    if (kind === 'callback') {\n      p.innerHTML = '<div class=\"panel\"><span class=\"strong\">Quand rappeler ?</span><div class=\"quick\">' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-min=\"60\">Dans 1 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-min=\"180\">Dans 3 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-tomorrow=\"10\">Demain 10 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-tomorrow=\"17\">Demain 17 h</button></div>' +\n        '<div class=\"form-grid\">' + field('Autre date et heure', '<input type=\"datetime-local\" id=\"cb-when\">') + '</div>' +\n        '<div><button type=\"button\" class=\"btn warn\" data-act=\"callback\">Programmer le rappel</button></div></div>';\n    } else {\n      p.innerHTML = '<div class=\"panel\"><div class=\"form-grid\">' +\n        field('Motif d’annulation', '<select id=\"cancel-reason\">' + options(S.boot.cancelReasons, '') + '</select>') + '</div>' +\n        '<label style=\"display:flex;gap:10px;align-items:center;min-height:44px\"><input type=\"checkbox\" id=\"cancel-black\" style=\"width:20px;height:20px\"> Ajouter ce numéro à la liste noire</label>' +\n        '<div><button type=\"button\" class=\"btn danger\" data-act=\"cancel\">Confirmer l’annulation</button></div></div>';\n    }\n    var first = p.querySelector('button, select, input');\n    if (first) first.focus();\n  }\n\n  function submit(outcome, extra) {\n    if (S.busy || !S.currentId) return;\n    S.busy = true;\n    $all('#detail button').forEach(function (b) { b.disabled = true; });\n    var id = S.currentId;\n    var payload = { fields: readForm($('#d-form')) };\n    Object.keys(extra || {}).forEach(function (k) { payload[k] = extra[k]; });\n    var blacklist = outcome === 'cancel' && $('#cancel-black') && $('#cancel-black').checked;\n    var phone = S.current.order.phone;\n\n    call('api_recordCall', id, outcome, payload).then(function (o) {\n      var msgs = {\n        confirm: 'Commande ' + o.id + ' confirmée',\n        no_answer: o.status === 'Injoignable' ? 'Commande ' + o.id + ' : client injoignable' : 'Pas de réponse noté, rappel ' + fmtDate(o.callback),\n        callback: 'Rappel programmé ' + fmtDate(o.callback),\n        cancel: 'Commande ' + o.id + ' annulée'\n      };\n      toast(msgs[outcome]);\n      if (blacklist) call('api_setBlacklist', phone, true).catch(function (e) { toast(errText(e), true); });\n      var due = S.queue.due;\n      var idx = -1;\n      for (var i = 0; i < due.length; i++) if (due[i].id === id) idx = i;\n      if (idx >= 0) due.splice(idx, 1);\n      S.queue.stats.due = due.length;\n      if (outcome === 'confirm') S.queue.stats.confirmedToday++;\n      setQueueCount(due.length);\n      S.busy = false;\n      var next = due[Math.max(idx, 0)] || due[0];\n      renderQueue();\n      if (next) openInDetail(next.id); else renderEmptyDetail();\n      loadQueue(false);\n    }).catch(function (e) {\n      S.busy = false;\n      $all('#detail button').forEach(function (b) { b.disabled = false; });\n      toast(errText(e), true);\n      if (/déjà été traitée/.test(errText(e))) loadQueue(true);\n    });\n  }\n\n  /* ================================================================ */\n  /* Événements                                                       */\n  /* ================================================================ */\n\n  var ACTIONS = {\n    'goto': function (el) { navigate(el.getAttribute('data-route'), el.getAttribute('data-status')); },\n    'period': function (el) { S.period = el.getAttribute('data-period'); pageDashboard(); },\n    'chip': function (el) { S.filter.status = el.getAttribute('data-status'); S.filter.limit = 100; loadOrders(); },\n    'more': function () { S.filter.limit += 100; loadOrders(); },\n    'open-order': function (el) { openOrder(el.getAttribute('data-id')); },\n    'new-order': openNewOrder,\n    'close-modal': closeModal,\n    'save-order': saveOrder,\n    'create-order': createOrder,\n    'toggle-blacklist': toggleBlacklist,\n    'refresh-queue': function () { loadQueue(false); },\n    'q-open': function (el) { if (!S.busy) openInDetail(el.getAttribute('data-id')); },\n    'toggle-queue': function () { $('#queue').classList.toggle('open'); },\n    'confirm': function () { submit('confirm'); },\n    'no_answer': function () { submit('no_answer'); },\n    'show-callback': function () { showPanel('callback'); },\n    'show-cancel': function () { showPanel('cancel'); },\n    'cb-quick': function (el) {\n      var d = new Date();\n      if (el.hasAttribute('data-min')) d = new Date(Date.now() + Number(el.getAttribute('data-min')) * 60000);\n      else { d.setDate(d.getDate() + 1); d.setHours(Number(el.getAttribute('data-tomorrow')), 0, 0, 0); }\n      submit('callback', { callback: d.toISOString() });\n    },\n    'callback': function () {\n      var v = $('#cb-when').value;\n      if (!v) { toast('Choisissez une date et une heure.', true); return; }\n      submit('callback', { callback: new Date(v).toISOString() });\n    },\n    'cancel': function () { submit('cancel', { reason: $('#cancel-reason').value }); }\n  };\n\n  document.addEventListener('click', function (e) {\n    if (e.target.classList && e.target.classList.contains('modal-backdrop')) { closeModal(); return; }\n    var el = e.target.closest('[data-act]');\n    if (!el || el.disabled) return;\n    var fn = ACTIONS[el.getAttribute('data-act')];\n    if (!fn) return;\n    e.preventDefault();\n    e.stopPropagation();\n    fn(el, e);\n  });\n\n  var searchTimer = null;\n  document.addEventListener('input', function (e) {\n    if (e.target.id === 'f-q') {\n      clearTimeout(searchTimer);\n      searchTimer = setTimeout(function () { S.filter.q = e.target.value; S.filter.limit = 100; loadOrders(); }, 350);\n    } else if (e.target.closest('#d-form')) {\n      updateSummary();\n    }\n  });\n  document.addEventListener('change', function (e) {\n    if (e.target.id === 'f-wilaya') { S.filter.wilaya = e.target.value; S.filter.limit = 100; loadOrders(); }\n    else if (e.target.id === 'f-period') { S.filter.period = e.target.value; S.filter.limit = 100; loadOrders(); }\n    else if (e.target.getAttribute('data-role') === 'status') toggleCancelField();\n    else if (e.target.closest('#d-form')) updateSummary();\n  });\n  document.addEventListener('keydown', function (e) {\n    if (e.key === 'Escape' && modalOpen()) closeModal();\n  });\n\n  function tick() {\n    if (document.visibilityState !== 'visible' || S.busy || modalOpen()) return;\n    if (S.route === 'confirmation') loadQueue(false); else refreshCount();\n  }\n\n  /* ================================================================ */\n  /* Démarrage                                                        */\n  /* ================================================================ */\n\n  call('api_bootstrap').then(function (b) {\n    S.boot = b;\n    $all('[data-shop]').forEach(function (el) { el.textContent = b.shop; });\n    $all('[data-user-name]').forEach(function (el) { el.textContent = b.user.name; });\n    $all('[data-user-mail]').forEach(function (el) { el.textContent = b.user.email; });\n    window.addEventListener('hashchange', go);\n    go();\n    if (S.route !== 'confirmation') refreshCount();\n    setInterval(tick, 60000);\n  }).catch(function (e) {\n    view.innerHTML = errorBox(e) +\n      '<p class=\"sub\" style=\"margin-top:12px\">Vérifiez que le classeur est partagé avec votre adresse Google (en Éditeur), puis rechargez la page.</p>';\n  });\n})();\n</script>\n"
};
