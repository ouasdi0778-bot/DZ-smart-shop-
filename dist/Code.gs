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
  { key: 'carrierStatus', title: 'Statut société', kind: 'auto', width: 150, aliases: ['Statut transporteur', 'Statut Ecotrack'] },
  { key: 'carrierMoved', title: 'Dernier mouvement colis', kind: 'auto', width: 150, aliases: ['Mouvement colis'] },
  { key: 'paymentId', title: 'N° de versement', kind: 'auto', width: 110, aliases: ['Versement', 'Paiement'] },
  { key: 'followUp', title: 'Suivi traité le', kind: 'auto', width: 140, aliases: ['Suivi traite'] },
  { key: 'alert', title: 'Alerte client', kind: 'auto', width: 160, aliases: ['Alerte'] },
  { key: 'notes', title: 'Notes', kind: 'in', width: 200, aliases: ['Note', 'Remarque', 'Commentaire'] },
  { key: 'source', title: 'Source', kind: 'auto', width: 90, aliases: [] },
  { key: 'campaign', title: 'Campagne', kind: 'auto', width: 150, aliases: ['Campagne pub', 'UTM campaign'] },
  { key: 'shopifyId', title: 'ID Shopify', kind: 'auto', width: 130, aliases: ['Shopify ID'] },
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
  ['SUIVI_ALERTE_HEURES', 26, "Un colis sans mouvement depuis ce nombre d'heures (ou créé chez Ecotrack mais pas encore validé) est signalé dans la page Suivi"],
  ['SHOPIFY_TAG', 'releasit_cod_form', "Seules les commandes Shopify portant cette étiquette sont importées (celle de Releasit COD). Laissez vide pour tout importer"],
  ['SHOPIFY_JOURS_INITIAL', 3, "Première importation : commandes des N derniers jours seulement (les plus anciennes sont ignorées)"],
  ['SHOPIFY_API_VERSION', '2026-04', "Version de l'API Shopify utilisée. À changer seulement si Shopify signale que cette version n'est plus prise en charge"],
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

/** Noms arabes des 58 wilayas, dans l'ordre des codes (la 1re = Adrar = code 1). */
var WILAYAS_AR = [
  'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية',
  'بسكرة', 'بشار', 'البليدة', 'البويرة', 'تمنراست', 'تبسة',
  'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر', 'الجلفة', 'جيجل',
  'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة',
  'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة',
  'وهران', 'البيض', 'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف',
  'تندوف', 'تيسمسيلت', 'الوادي', 'خنشلة', 'سوق أهراس', 'تيبازة',
  'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت', 'غرداية', 'غليزان',
  'تيميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس', 'عين صالح',
  'عين قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة'
];

/** Autres écritures courantes (arabe ou latin) : [code, écriture]. */
var WILAYA_ALIASES = [
  [16, 'الجزائر العاصمة'], [16, 'algiers'], [16, 'alger centre'], [16, 'el djazair'], [16, 'dzayer'],
  [25, 'قسنطينه'], [31, 'وهران '], [53, 'ان صالح'], [53, 'in salah'], [54, 'ان قزام'], [54, 'in guezzam'],
  [49, 'تيميمون'], [57, 'el meghaier'], [58, 'el menia'], [58, 'المنيعه'], [9, 'البليده'],
  [5, 'باتنه'], [6, 'بجايه'], [7, 'بسكره'], [12, 'تبسه'], [14, 'تيارات'], [20, 'سعيده'], [18, 'جيجل'],
  [28, 'مسيلة'], [28, 'msila'], [22, 'سيدي بلعباس'], [22, 'sba'], [34, 'bba'], [34, 'برج بوعريريج'],
  [43, 'ميله'], [48, 'غليزان'], [48, 'relizane'], [46, 'عين تيموشنت'], [46, 'ain temouchent']
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
      // Cette case peut volontairement rester vide : « pas de filtre ».
      else if (key === 'SHOPIFY_TAG') s[key] = '';
    });
  }
  s.MAX_TENTATIVES = Math.max(1, toNumber_(s.MAX_TENTATIVES) || 3);
  s.DELAI_RAPPEL_MINUTES = Math.max(5, toNumber_(s.DELAI_RAPPEL_MINUTES) || 120);
  s.DOUBLON_HEURES = Math.max(0, toNumber_(s.DOUBLON_HEURES));
  s.SOCIETE_PAR_DEFAUT = String(s.SOCIETE_PAR_DEFAUT || CARRIERS[0]).trim();
  s.NOM_BOUTIQUE = String(s.NOM_BOUTIQUE || APP_NAME).trim();
  s.MESSAGE_WHATSAPP = String(s.MESSAGE_WHATSAPP || '');
  s.SUIVI_ALERTE_HEURES = Math.max(1, toNumber_(s.SUIVI_ALERTE_HEURES) || 26);
  s.SHOPIFY_TAG = String(s.SHOPIFY_TAG == null ? '' : s.SHOPIFY_TAG).trim();
  s.SHOPIFY_JOURS_INITIAL = Math.min(Math.max(toNumber_(s.SHOPIFY_JOURS_INITIAL) || 3, 1), 60);
  s.SHOPIFY_API_VERSION = /^\d{4}-\d{2}$/.test(String(s.SHOPIFY_API_VERSION || '').trim()) ? String(s.SHOPIFY_API_VERSION).trim() : '2026-04';
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
var TEXT_KEYS_ = ['id', 'phone', 'tracking', 'paymentId', 'shopifyId'];

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
  return appendOrders_(ctx, [order])[0];
}

/** Ajoute plusieurs commandes en bas de l'onglet, en une seule écriture. */
function appendOrders_(ctx, list) {
  if (!list.length) return list;
  var rows = list.map(function (order) {
    var row = [];
    for (var i = 0; i < ctx.width; i++) row.push('');
    Object.keys(ctx.map).forEach(function (key) {
      if (!isBlank_(order[key])) row[ctx.map[key]] = order[key];
    });
    return row;
  });
  var r = ctx.sheet.getLastRow() + 1;
  TEXT_KEYS_.forEach(function (key) {
    if (ctx.map[key] !== undefined) ctx.sheet.getRange(r, ctx.map[key] + 1, list.length, 1).setNumberFormat('@');
  });
  ctx.sheet.getRange(r, 1, list.length, ctx.width).setValues(rows);
  list.forEach(function (order, i) {
    order._row = r + i;
    ctx.orders.push(order);
  });
  return list;
}

/** Prochain numéro pour une commande saisie à la main : M0001, M0002… */
function nextManualId_(ctx) {
  var max = 0;
  var ids = ctx.orders.map(function (o) { return String(o.id); }).concat(Object.keys(trashIds_()));
  ids.forEach(function (id) {
    var m = id.match(/^M(\d+)$/);
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
    carrierStatus: String(o.carrierStatus),
    carrierLabel: ecotrackLabel_(o.carrierStatus),
    carrierMoved: iso_(o.carrierMoved),
    paymentId: String(o.paymentId),
    followUp: iso_(o.followUp),
    campaign: String(o.campaign),
    shopifyId: String(o.shopifyId),
    alert: String(o.alert),
    alertLevel: alertLevel_(o.alert),
    notes: String(o.notes),
    source: String(o.source),
    updated: iso_(o.updated),
    stage: orderStage_(o),
    locked: isLockedStage_(orderStage_(o))
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

/* ======================= Ecotrack.gs ======================= */

/**
 * Ecotrack.gs : création des colis chez Ecotrack, tarifs et statuts.
 *
 * L'adresse de votre plateforme Ecotrack et votre jeton API sont enregistrés
 * dans les « Propriétés du script » (menu DZ Smart Shop › Ecotrack ›
 * Enregistrer l'adresse et le jeton). Ils ne sont jamais écrits dans le
 * classeur ni dans le code.
 *
 * L'outil CRÉE les colis (create/orders). La VALIDATION de l'expédition se
 * fait ensuite dans l'interface d'Ecotrack : l'outil la détecte tout seul en
 * relisant les statuts (voir Tracking.gs pour le suivi, les alertes et l'argent).
 *
 * Documentation de l'API : https://documenter.getpostman.com/view/14517169/Tz5je15g
 */

var ECO = {
  NAME: 'Ecotrack',
  PROP_URL: 'ECOTRACK_URL',
  PROP_TOKEN: 'ECOTRACK_TOKEN',
  PROP_LAST_ERROR: 'ECOTRACK_LAST_ERROR',
  PROP_LAST_SYNC: 'ECOTRACK_LAST_SYNC',
  BATCH: 100,              // commandes créées par requête (limite d'Ecotrack)
  STATUS_BATCH: 100,       // colis interrogés par requête de statuts (limite d'Ecotrack)
  MAX_PAGES: 15,           // pages lues au maximum en secours (40 colis par page)
  SINGLE_LOOKUPS: 15,      // colis interrogés un par un quand les autres méthodes ne les trouvent pas
  CACHE_KEY: 'eco:catalog:v1',
  CACHE_SECONDS: 6 * 3600,
  CLAIM_SECONDS: 300,
  MISSING: 'Introuvable chez Ecotrack',
  FIELD_LABELS: {
    nom_client: 'Client', telephone: 'Téléphone', adresse: 'Adresse', commune: 'Commune',
    code_wilaya: 'Wilaya', montant: 'Montant', type: 'Type', reference: 'Référence'
  }
};

/* ------------------------------------------------------------------ */
/* Configuration                                                      */
/* ------------------------------------------------------------------ */

function ecotrackConfig_() {
  var p = PropertiesService.getScriptProperties();
  var url = String(p.getProperty(ECO.PROP_URL) || '').trim();
  var token = String(p.getProperty(ECO.PROP_TOKEN) || '').trim();
  return { url: url, token: token, configured: !!(url && token) };
}

/** https://societe.ecotrack.dz (sans « / » final ni « /api »), ou '' si l'adresse est invalide. */
function normalizeEcotrackUrl_(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  s = s.replace(/^http:\/\//i, 'https://');
  if (!/^https:\/\//i.test(s)) s = 'https://' + s;
  s = s.replace(/[\/\s]+$/, '').replace(/\/api(\/v1)?$/i, '');
  return /^https:\/\/[a-z0-9]([a-z0-9.\-]*[a-z0-9])?(:\d+)?$/i.test(s) ? s : '';
}

function saveEcotrackConfig_(rawUrl, rawToken) {
  var url = normalizeEcotrackUrl_(rawUrl);
  if (!url) throw new Error('Adresse invalide. Exemple : https://monsociete.ecotrack.dz');
  var token = String(rawToken == null ? '' : rawToken).replace(/^\s*Bearer\s+/i, '').replace(/\s+/g, '');
  if (token.length < 10) throw new Error('Jeton trop court : copiez le jeton complet depuis votre compte Ecotrack.');
  var p = PropertiesService.getScriptProperties();
  p.setProperty(ECO.PROP_URL, url);
  p.setProperty(ECO.PROP_TOKEN, token);
  CacheService.getScriptCache().remove(ECO.CACHE_KEY);
  return { url: url };
}

function ecotrackError_(message, ambiguous, code) {
  var e = new Error(message);
  e.ambiguous = !!ambiguous;
  e.code = code || 0;
  return e;
}

var ECO_NOT_CONFIGURED_ = 'Ecotrack n’est pas configuré. Menu « DZ Smart Shop › Ecotrack › Enregistrer l’adresse et le jeton ».';

/* ------------------------------------------------------------------ */
/* Appels HTTP                                                        */
/* ------------------------------------------------------------------ */

function ecotrackQuery_(query) {
  if (!query) return '';
  var parts = [];
  Object.keys(query).forEach(function (k) {
    if (isBlank_(query[k])) return;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(query[k])));
  });
  return parts.length ? '?' + parts.join('&') : '';
}

function retryAfterMs_(resp) {
  var seconds = 0;
  try {
    var headers = resp.getAllHeaders() || {};
    Object.keys(headers).forEach(function (k) {
      if (k.toLowerCase() === 'retry-after') seconds = toNumber_(headers[k]);
    });
  } catch (e) { seconds = 0; }
  return Math.min(Math.max(seconds, 1), 15) * 1000;
}

/**
 * Appelle l'API. Renvoie { code, ok, json, text }. Ne lève une erreur que si
 * Ecotrack est injoignable (erreur « ambiguë » : la requête est peut-être partie).
 * Les limites de débit (erreur 429) sont attendues puis réessayées.
 */
function ecotrackCall_(method, path, opts) {
  opts = opts || {};
  var cfg = ecotrackConfig_();
  if (!cfg.configured) throw ecotrackError_(ECO_NOT_CONFIGURED_, false);
  var params = {
    method: method,
    muteHttpExceptions: true,
    followRedirects: false, // le jeton ne doit jamais suivre une redirection vers un autre site
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/json' }
  };
  if (opts.body !== undefined) {
    params.contentType = 'application/json';
    params.payload = JSON.stringify(opts.body);
  }
  var url = cfg.url + path + ecotrackQuery_(opts.query);
  var resp = null;
  for (var attempt = 0; attempt < 3; attempt++) {
    try {
      resp = UrlFetchApp.fetch(url, params);
    } catch (e) {
      throw ecotrackError_('Impossible de joindre Ecotrack (' + (e && e.message ? e.message : e) + '). Vérifiez l’adresse enregistrée et votre connexion.', true);
    }
    if (resp.getResponseCode() !== 429 || attempt === 2) break;
    Utilities.sleep(retryAfterMs_(resp));
  }
  var code = resp.getResponseCode();
  var text = resp.getContentText() || '';
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  return { code: code, ok: code >= 200 && code < 300, json: json, text: text };
}

/** « Champ : message · Champ : message » à partir des erreurs d'Ecotrack. */
function flattenEcotrackErrors_(errors) {
  if (!errors) return '';
  if (typeof errors === 'string') return errors;
  var parts = [];
  Object.keys(errors).forEach(function (k) {
    var v = errors[k];
    if (k === 'success' || (k === 'tracking' && typeof v === 'string')) return; // « tracking » = le n° d'un colis créé, pas une erreur
    var text = Array.isArray(v) ? v.join(' ') : (v && typeof v === 'object' ? flattenEcotrackErrors_(v) : String(v));
    var label = ECO.FIELD_LABELS[k];
    parts.push(label ? label + ' : ' + text : text);
  });
  return parts.join(' · ');
}

/** Message clair pour une réponse d'erreur d'Ecotrack. */
function ecotrackFail_(res) {
  var code = res.code;
  var msg;
  if (code === 401 || code === 403) {
    msg = 'Ecotrack a refusé le jeton (erreur ' + code + '). Enregistrez-le de nouveau : menu « DZ Smart Shop › Ecotrack › Enregistrer l’adresse et le jeton ».';
  } else if (code === 404) {
    msg = 'Adresse Ecotrack introuvable (erreur 404). Vérifiez l’adresse enregistrée.';
  } else if (code === 429) {
    msg = 'Trop de requêtes envoyées à Ecotrack. Réessayez dans quelques minutes.';
  } else if (code >= 300 && code < 400) {
    msg = 'L’adresse Ecotrack enregistrée redirige ailleurs (erreur ' + code + '). Vérifiez l’adresse.';
  } else if (code >= 500) {
    msg = 'Ecotrack est indisponible (erreur ' + code + '). Réessayez plus tard.';
  } else {
    var detail = res.json ? flattenEcotrackErrors_(res.json.errors) || res.json.message || '' : '';
    msg = 'Ecotrack a refusé la demande (erreur ' + code + ')' + (detail ? ' : ' + detail : '.');
  }
  return ecotrackError_(msg, code >= 500, code);
}

/** GET qui renvoie le JSON, ou lève une erreur claire. */
function ecotrackGet_(path, query) {
  var res = ecotrackCall_('GET', path, { query: query });
  if (!res.ok) throw ecotrackFail_(res);
  if (res.json === null) throw ecotrackError_('Réponse inattendue d’Ecotrack. Vérifiez l’adresse enregistrée : elle doit être celle de votre plateforme Ecotrack.', false);
  return res.json;
}

function listOf_(json, keys) {
  if (Array.isArray(json)) return json;
  for (var i = 0; json && i < keys.length; i++) {
    if (Array.isArray(json[keys[i]])) return json[keys[i]];
  }
  return [];
}

function ymd_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'yyyy-MM-dd');
}

/** Exécute fn avec le verrou ; 2 essais, car ce qui est écrit ici ne doit pas être perdu. */
function lockedWithRetry_(fn) {
  var lastError = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      return withLock_(fn);
    } catch (e) {
      lastError = e;
      Utilities.sleep(2000);
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ */
/* Test de connexion                                                  */
/* ------------------------------------------------------------------ */

/** Vérifie le jeton (validate/token) puis lit la liste des wilayas. */
function ecotrackTest_() {
  var cfg = ecotrackConfig_();
  if (!cfg.configured) throw ecotrackError_(ECO_NOT_CONFIGURED_, false);
  var res = ecotrackCall_('GET', '/api/v1/validate/token', { query: { api_token: cfg.token } });
  var msg = res.json && res.json.message ? String(res.json.message) : '';
  if (msg === 'INVALID_TOKEN') {
    throw ecotrackError_('Ecotrack a refusé le jeton (jeton invalide). Enregistrez-le de nouveau : menu « DZ Smart Shop › Ecotrack › Enregistrer l’adresse et le jeton ».', false, 401);
  }
  if (msg === 'TOKEN_NOT_ALLOWED') {
    throw ecotrackError_('L’accès à l’API est désactivé pour ce compte Ecotrack. Demandez son activation à Ecotrack.', false, 403);
  }
  if (!res.ok && res.code !== 404) throw ecotrackFail_(res);
  if (res.ok && res.json === null) {
    throw ecotrackError_('Réponse inattendue d’Ecotrack. Vérifiez l’adresse enregistrée : elle doit être celle de votre plateforme Ecotrack.', false);
  }
  var list = listOf_(ecotrackGet_('/api/v1/get/wilayas'), ['data', 'wilayas']);
  return { ok: true, wilayas: list.length };
}

/* ------------------------------------------------------------------ */
/* Wilayas et tarifs                                                  */
/* ------------------------------------------------------------------ */

/**
 * Wilayas desservies et tarifs de livraison d'Ecotrack :
 * { wilayas: [16, 31, …], fees: { '16': [domicile, stopDesk], … } }
 * Gardé 6 heures en mémoire pour ne pas solliciter l'API à chaque écran.
 */
function ecotrackCatalog_(force) {
  var cache = CacheService.getScriptCache();
  if (!force) {
    var hit = cache.get(ECO.CACHE_KEY);
    if (hit) {
      try { return JSON.parse(hit); } catch (e) { /* cache illisible : on relit */ }
    }
  }
  var wilayaList = listOf_(ecotrackGet_('/api/v1/get/wilayas'), ['data', 'wilayas']);
  var feesJson = ecotrackGet_('/api/v1/get/fees');
  var active = {};
  wilayaList.forEach(function (w) {
    var id = parseInt(w && w.wilaya_id, 10);
    if (id > 0) active[id] = true;
  });
  var fees = {};
  listOf_(feesJson && feesJson.livraison, []).forEach(function (x) {
    var id = parseInt(x && x.wilaya_id, 10);
    if (!(id > 0)) return;
    fees[id] = [toNumber_(x.tarif), toNumber_(x.tarif_stopdesk)];
    active[id] = true;
  });
  var catalog = {
    wilayas: Object.keys(active).map(Number).sort(function (a, b) { return a - b; }),
    fees: fees,
    at: new Date().toISOString()
  };
  cache.put(ECO.CACHE_KEY, JSON.stringify(catalog), ECO.CACHE_SECONDS);
  return catalog;
}

/**
 * Remplit les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de
 * l'onglet Tarifs. Une case reste vide quand le service n'existe pas (stop
 * desk à 0 chez Ecotrack, ou wilaya non desservie). Les colonnes Yalidine
 * ne sont pas touchées.
 */
function syncEcotrackFees_() {
  var catalog = ecotrackCatalog_(true);
  return withLock_(function () {
    var sh = sheet_(SHEET.RATES);
    var lastRow = sh.getLastRow();
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var values = sh.getRange(1, 1, Math.max(lastRow, 1), lastCol).getValues();
    var homeCol = -1;
    var deskCol = -1;
    values[0].forEach(function (title, i) {
      var k = normalizeText_(title);
      if (k === 'ecotrack domicile') homeCol = i;
      else if (k === 'ecotrack stop desk') deskCol = i;
    });
    if (homeCol < 0 || deskCol < 0) {
      throw new Error('Colonnes « Ecotrack domicile » et « Ecotrack stop desk » introuvables dans l’onglet Tarifs. Lancez « DZ Smart Shop › Installer / réparer le classeur ».');
    }
    var n = lastRow - 1;
    if (n < 1) throw new Error('L’onglet Tarifs est vide. Lancez « DZ Smart Shop › Installer / réparer le classeur ».');
    var wilayaList = getWilayaList_();
    var home = [];
    var desk = [];
    var stats = { rows: 0, withStopDesk: 0, withoutStopDesk: 0, inactive: 0 };
    for (var r = 1; r < values.length; r++) {
      var code = wilayaCode_(values[r][0], wilayaList);
      var fee = code !== null ? catalog.fees[code] : null;
      if (code === null) {
        home.push([values[r][homeCol]]);
        desk.push([values[r][deskCol]]);
        continue;
      }
      stats.rows++;
      if (!fee) {
        stats.inactive++;
        home.push(['']);
        desk.push(['']);
        continue;
      }
      home.push([fee[0] > 0 ? fee[0] : '']);
      if (fee[1] > 0) { desk.push([fee[1]]); stats.withStopDesk++; } else { desk.push(['']); stats.withoutStopDesk++; }
    }
    sh.getRange(2, homeCol + 1, n, 1).setValues(home);
    sh.getRange(2, deskCol + 1, n, 1).setValues(desk);
    log_(currentUser_(), '', 'Tarifs Ecotrack', stats.rows - stats.inactive + ' wilayas mises à jour');
    return stats;
  });
}

/* ------------------------------------------------------------------ */
/* Vérifications avant l'envoi                                        */
/* ------------------------------------------------------------------ */

/** Liste des problèmes qui empêchent d'envoyer cette commande (vide = prête). */
function ecotrackProblems_(o, catalog) {
  var p = [];
  if (o.status !== STATUS.CONFIRMED) p.push('Statut « ' + (o.status || '—') + ' » : seules les commandes confirmées partent');
  if (!isBlank_(o.tracking)) p.push('Déjà envoyée (suivi ' + o.tracking + ')');
  if (o.carrier && String(o.carrier) !== ECO.NAME) p.push('Société choisie : ' + o.carrier + ' (mettez Ecotrack pour envoyer ici)');
  if (!String(o.client).trim()) p.push('Nom du client manquant');
  if (!normalizePhone(o.phone).valid) p.push('Téléphone invalide');
  if (!String(o.address).trim()) p.push('Adresse manquante');
  if (!String(o.commune).trim()) p.push('Commune manquante');
  var code = wilayaCode_(o.wilaya);
  if (code === null) {
    p.push('Wilaya manquante ou inconnue');
  } else if (catalog) {
    if (catalog.wilayas.indexOf(code) < 0) {
      p.push('Wilaya non desservie par Ecotrack');
    } else if (o.mode === 'Stop desk') {
      var fee = catalog.fees[code];
      if (fee && !(fee[1] > 0)) p.push('Stop desk indisponible dans cette wilaya');
    }
  }
  if (!(toNumber_(o.total) > 0)) p.push('Montant à encaisser à 0');
  return p;
}

/** Une commande au format attendu par /api/v1/create/orders. */
function ecotrackPayload_(o) {
  var qty = toNumber_(o.qty) || 1;
  return {
    reference: String(o.id),
    nom_client: String(o.client).trim().slice(0, 255),
    telephone: normalizePhone(o.phone).phone,
    adresse: String(o.address).trim().slice(0, 255),
    commune: String(o.commune).trim().slice(0, 255),
    code_wilaya: wilayaCode_(o.wilaya),
    montant: Math.round(toNumber_(o.total)),
    remarque: String(o.notes || '').slice(0, 255),
    produit: (String(o.product || '').trim() + (qty > 1 ? ' x' + qty : '')).slice(0, 255),
    stock: 0,
    type: 1,
    stop_desk: o.mode === 'Stop desk' ? 1 : 0
  };
}

/* ------------------------------------------------------------------ */
/* Création des colis                                                 */
/* ------------------------------------------------------------------ */

/**
 * Crée les colis chez Ecotrack (sans les expédier : vous les validez dans
 * l'interface d'Ecotrack) et écrit le n° de suivi. La commande reste
 * « Confirmée » jusqu'à ce que la validation soit détectée. Renvoie une ligne
 * par commande : { id, client, ok, tracking, message }.
 */
function shipToEcotrack_(rawIds, user) {
  var ids = [];
  (rawIds || []).forEach(function (id) {
    id = String(id);
    if (id && ids.indexOf(id) < 0) ids.push(id);
  });
  if (!ids.length) throw new Error('Aucune commande sélectionnée.');
  if (ids.length > 200) throw new Error('Envoyez 200 commandes au maximum à la fois.');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);
  var catalog = ecotrackCatalog_(false);
  var cache = CacheService.getScriptCache();
  var results = {};
  var queue = [];
  var fail = function (id, client, message) {
    results[id] = { id: id, client: String(client || ''), ok: false, tracking: '', message: message };
  };

  // 1. Vérifications, puis « réservation » des commandes pour éviter un double envoi.
  withLock_(function () {
    var ctx = readOrders_();
    ids.forEach(function (id) {
      var o = findOrder_(ctx, id);
      if (!o) { fail(id, '', 'Commande introuvable.'); return; }
      var problems = ecotrackProblems_(o, catalog);
      if (problems.length) { fail(id, o.client, problems.join(' · ')); return; }
      if (cache.get('ship:' + id)) { fail(id, o.client, 'Un envoi est déjà en cours pour cette commande.'); return; }
      cache.put('ship:' + id, '1', ECO.CLAIM_SECONDS);
      queue.push({ id: id, client: String(o.client), payload: ecotrackPayload_(o) });
    });
  });

  // 2. Création (le classeur n'est pas bloqué pendant que l'on attend Ecotrack).
  try {
    for (var i = 0; i < queue.length; i += ECO.BATCH) {
      sendEcotrackChunk_(queue.slice(i, i + ECO.BATCH), results);
    }
    writeShipResults_(queue, results, user);
  } finally {
    queue.forEach(function (it) { cache.remove('ship:' + it.id); });
  }
  return ids.map(function (id) { return results[id]; });
}

function sendEcotrackChunk_(chunk, results) {
  var orders = {};
  chunk.forEach(function (it, i) { orders[String(i)] = it.payload; });

  var res = null;
  var error = null;
  try {
    res = ecotrackCall_('POST', '/api/v1/create/orders', { body: { orders: orders } });
  } catch (e) {
    error = e;
  }
  var byRef = (res && res.json && res.json.results && typeof res.json.results === 'object') ? res.json.results : null;
  if (!byRef && !error) {
    error = res.ok ? ecotrackError_('Réponse inattendue d’Ecotrack.', true) : ecotrackFail_(res);
  }

  var unsure = [];
  chunk.forEach(function (it) {
    var r = byRef ? byRef[it.payload.reference] : null;
    if (r && r.success && r.tracking) {
      results[it.id] = { id: it.id, client: it.client, ok: true, tracking: String(r.tracking), message: '' };
    } else if (r) {
      results[it.id] = { id: it.id, client: it.client, ok: false, tracking: '', message: flattenEcotrackErrors_(r) || 'Refusée par Ecotrack.' };
    } else if (!error || error.ambiguous) {
      unsure.push(it); // la requête est peut-être partie : on vérifie chez Ecotrack avant de conclure
    } else {
      results[it.id] = { id: it.id, client: it.client, ok: false, tracking: '', message: error.message };
    }
  });
  if (!unsure.length) return;

  var lookup = ecotrackFindByReferences_(unsure.map(function (it) { return it.payload.reference; }));
  unsure.forEach(function (it) {
    var tracking = lookup.found[it.payload.reference];
    if (tracking) {
      results[it.id] = { id: it.id, client: it.client, ok: true, tracking: tracking, message: '' };
    } else if (lookup.checked) {
      results[it.id] = { id: it.id, client: it.client, ok: false, tracking: '',
        message: (error ? error.message + ' ' : 'Pas de réponse d’Ecotrack pour cette commande. ') + 'Elle n’a pas été créée : vous pouvez réessayer.' };
    } else {
      results[it.id] = { id: it.id, client: it.client, ok: false, tracking: '',
        message: (error ? error.message + ' ' : '') + 'Résultat incertain : vérifiez dans Ecotrack si le colis existe avant de réessayer.' };
    }
  });
}

/** Retrouve chez Ecotrack des colis créés il y a peu, grâce à notre référence. */
function ecotrackFindByReferences_(refs) {
  var out = { checked: false, found: {} };
  try {
    var since = ymd_(new Date(Date.now() - 2 * 86400000));
    for (var page = 1; page <= 5; page++) {
      var json = ecotrackGet_('/api/v1/get/orders', { page: page, start_date: since });
      ecotrackRecords_(json).forEach(function (r) {
        if (!isBlank_(r.reference) && refs.indexOf(String(r.reference)) >= 0) out.found[String(r.reference)] = String(r.tracking);
      });
      if (page >= (parseInt(json && json.last_page, 10) || 1)) break;
    }
    out.checked = true;
  } catch (e) {
    out.checked = false;
  }
  return out;
}

/** Écrit le n° de suivi. Un colis créé ne doit jamais être perdu : 2 essais. */
function writeShipResults_(queue, results, user) {
  var okItems = queue.filter(function (it) { return results[it.id] && results[it.id].ok; });
  if (!okItems.length) return;
  try {
    lockedWithRetry_(function () {
      var ctx = readOrders_();
      var now = new Date();
      okItems.forEach(function (it) {
        var r = results[it.id];
        var o = findOrder_(ctx, it.id);
        if (!o || String(o.tracking).trim() === r.tracking) return;
        if (o.status !== STATUS.CONFIRMED) {
          r.message = 'Colis créé, mais la commande est passée en « ' + o.status + ' » entre-temps : vérifiez.';
        }
        // carrierMoved = date de création du colis : sert à signaler un colis jamais validé.
        writeFields_(ctx, o, { carrier: ECO.NAME, tracking: r.tracking, carrierStatus: '', carrierMoved: now, updated: now });
        log_(user, o.id, 'Colis créé chez Ecotrack', 'Suivi ' + r.tracking + ' (à valider dans Ecotrack)' + (r.message ? ' · ' + r.message : ''));
      });
    });
  } catch (e) {
    var lines = okItems.map(function (it) { return it.id + ' → ' + results[it.id].tracking; }).join(' ; ');
    throw new Error('Les colis ont été créés chez Ecotrack, mais le classeur n’a pas pu être mis à jour (' + e.message + '). Notez les numéros de suivi : ' + lines);
  }
}

/* ------------------------------------------------------------------ */
/* Statuts Ecotrack                                                   */
/* ------------------------------------------------------------------ */

/**
 * Statuts d'Ecotrack (liste de la documentation, point get/orders/status) :
 *   tool  = statut correspondant dans l'outil ('' = ne change rien)
 *   group = famille, utilisée par le suivi (alertes, argent)
 *   label = texte affiché
 */
var ECO_STATUSES_ = {
  prete_a_expedier: { tool: '', group: 'draft', label: 'Créé, à valider chez Ecotrack' },
  en_ramassage: { tool: 'Expédiée', group: 'transit', label: 'Ramassage en cours' },
  en_preparation_stock: { tool: 'Expédiée', group: 'transit', label: 'Préparation (stock)' },
  vers_hub: { tool: 'Expédiée', group: 'transit', label: 'En route vers le centre de tri' },
  en_hub: { tool: 'Expédiée', group: 'transit', label: 'Au centre de tri' },
  vers_wilaya: { tool: 'Expédiée', group: 'transit', label: 'En route vers la wilaya' },
  en_preparation: { tool: 'Expédiée', group: 'transit', label: 'Préparation avant livraison' },
  en_livraison: { tool: 'En livraison', group: 'delivery', label: 'En livraison' },
  suspendu: { tool: 'En livraison', group: 'suspended', label: 'Suspendu' },
  livre_non_encaisse: { tool: 'Livrée', group: 'delivered', label: 'Livré, pas encore encaissé' },
  encaisse_non_paye: { tool: 'Livrée', group: 'cashed', label: 'Encaissé, pas encore payé' },
  paiements_prets: { tool: 'Livrée', group: 'ready', label: 'Paiement prêt à être versé' },
  paye_et_archive: { tool: 'Livrée', group: 'paid', label: 'Payé' },
  retour_chez_livreur: { tool: 'Retour', group: 'returning', label: 'Retour chez le livreur' },
  retour_transit_entrepot: { tool: 'Retour', group: 'returning', label: 'Retour en transit' },
  retour_en_traitement: { tool: 'Retour', group: 'returning', label: 'Retour en traitement' },
  retour_recu: { tool: 'Retour', group: 'returned', label: 'Retour reçu' },
  retour_archive: { tool: 'Retour', group: 'returned', label: 'Retour archivé' },
  annule: { tool: 'Annulée', group: 'cancelled', label: 'Annulé' }
};

/** { tool, group, label } d'un statut Ecotrack, ou null si le champ est vide. */
function ecotrackStatusInfo_(raw) {
  var text = String(raw == null ? '' : raw).trim();
  if (!text) return null;
  var key = normalizeText_(text).replace(/ /g, '_');
  if (Object.prototype.hasOwnProperty.call(ECO_STATUSES_, key)) return ECO_STATUSES_[key];
  if (text === ECO.MISSING) return { tool: null, group: 'missing', label: text };
  // Variantes proches d'un statut connu (au cas où Ecotrack en renommerait un).
  if (/^retour/.test(key)) return { tool: STATUS.RETURNED, group: 'returning', label: text };
  if (/^paye|^encaisse|^livre\b/.test(key)) return { tool: STATUS.DELIVERED, group: 'delivered', label: text };
  return { tool: null, group: 'unknown', label: text };
}

function ecotrackLabel_(raw) {
  var info = ecotrackStatusInfo_(raw);
  return info ? info.label : '';
}

/**
 * Statut de l'outil pour un statut Ecotrack : un statut (« Livrée »…), '' si
 * le statut est connu mais ne change rien, ou null s'il est inconnu : il est
 * alors affiché tel quel dans « Statut société » et noté dans le Journal.
 */
function mapEcotrackStatus_(raw) {
  var info = ecotrackStatusInfo_(raw);
  return info ? info.tool : null;
}

var STATUS_RANK_ = {};
STATUS_RANK_[STATUS.CONFIRMED] = 0;
STATUS_RANK_[STATUS.SHIPPED] = 1;
STATUS_RANK_[STATUS.IN_DELIVERY] = 2;
STATUS_RANK_[STATUS.DELIVERED] = 3;
STATUS_RANK_[STATUS.RETURNED] = 3;
STATUS_RANK_[STATUS.CANCELLED] = 3;

/** Colis Ecotrack à suivre : créés (même pas encore validés), expédiés ou en livraison. */
function isEcotrackTracked_(o) {
  return String(o.carrier) === ECO.NAME && !isBlank_(o.tracking) &&
    (o.status === STATUS.CONFIRMED || o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY);
}

/** Les lignes de colis d'une réponse (plusieurs présentations possibles). */
function ecotrackRecords_(json) {
  var rows = listOf_(json, ['data', 'orders', 'results']);
  if (!rows.length && json && !Array.isArray(json) && json.tracking) rows = [json];
  return rows.filter(function (r) { return r && typeof r === 'object' && r.tracking; });
}

/** Lit les commandes Ecotrack créées depuis une date (40 par page). En secours. */
function ecotrackListSince_(since) {
  var map = {};
  var query = {};
  if (since) query.start_date = ymd_(since);
  for (var page = 1; page <= ECO.MAX_PAGES; page++) {
    query.page = page;
    var json = ecotrackGet_('/api/v1/get/orders', query);
    ecotrackRecords_(json).forEach(function (r) { map[String(r.tracking)] = r; });
    if (page >= (parseInt(json && json.last_page, 10) || 1)) break;
  }
  return map;
}

/** Un colis à la fois. En secours. */
function ecotrackLookup_(tracking) {
  var rows = ecotrackRecords_(ecotrackGet_('/api/v1/get/orders', { tracking: tracking }));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].tracking) === tracking) return rows[i];
  }
  return null;
}

/**
 * Statuts de jusqu'à 100 colis par requête (get/orders/status), y compris les
 * colis archivés. Un colis sans statut dans la réponse est ignoré : la forme
 * exacte de la réponse n'est pas décrite dans la documentation.
 */
function ecotrackStatusLookup_(trackings) {
  var token = ecotrackConfig_().token;
  var found = {};
  for (var i = 0; i < trackings.length; i += ECO.STATUS_BATCH) {
    var chunk = trackings.slice(i, i + ECO.STATUS_BATCH);
    var json = ecotrackGet_('/api/v1/get/orders/status', { api_token: token, trackings: chunk.join(','), status: 'all' });
    ecotrackRecords_(json).forEach(function (r) {
      if (r.status !== undefined && r.status !== null) found[String(r.tracking)] = r;
    });
  }
  return found;
}

function clearEcotrackError_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty(ECO.PROP_LAST_ERROR) !== null) p.deleteProperty(ECO.PROP_LAST_ERROR);
}

/** Met à jour le statut de tous les colis Ecotrack à suivre. Renvoie un résumé. */
function syncEcotrackStatuses_() {
  var summary = { configured: true, checked: 0, updated: 0, missing: 0, unknown: 0 };
  if (!ecotrackConfig_().configured) { summary.configured = false; return summary; }

  var tracked = withLock_(function () {
    return readOrders_().orders.filter(isEcotrackTracked_).map(function (o) {
      return { id: String(o.id), tracking: String(o.tracking).trim(), date: toDate_(o.date) };
    });
  });
  summary.checked = tracked.length;
  if (!tracked.length) { markSynced_(); return summary; }

  // 1. Lecture groupée des statuts (100 colis par requête).
  var found = {};
  try {
    found = ecotrackStatusLookup_(tracked.map(function (t) { return t.tracking; }));
  } catch (e) {
    // Jeton refusé, limite atteinte ou Ecotrack coupé : inutile d'insister avec d'autres méthodes.
    if (e.ambiguous || e.code === 401 || e.code === 403 || e.code === 429) throw e;
    found = {};
  }
  // 2. Secours : liste par pages, puis un appel par colis, pour ceux que la lecture groupée n'a pas trouvés.
  var missing = tracked.filter(function (t) { return !found[t.tracking]; });
  if (missing.length > ECO.SINGLE_LOOKUPS) {
    var oldest = missing.reduce(function (min, t) { return t.date && (!min || t.date < min) ? t.date : min; }, null);
    var listed = ecotrackListSince_(oldest ? new Date(oldest.getTime() - 86400000) : null);
    missing.forEach(function (t) { if (listed[t.tracking]) found[t.tracking] = listed[t.tracking]; });
  }
  var looked = {};
  tracked.filter(function (t) { return !found[t.tracking]; }).slice(0, ECO.SINGLE_LOOKUPS).forEach(function (t) {
    looked[t.tracking] = true;
    var rec = ecotrackLookup_(t.tracking);
    if (rec) found[t.tracking] = rec;
  });

  withLock_(function () {
    var ctx = readOrders_();
    var hasRaw = ctx.map.carrierStatus !== undefined;
    var now = new Date();
    var actor = { name: 'Ecotrack' };
    tracked.forEach(function (t) {
      var o = findOrder_(ctx, t.id);
      if (!o || !isEcotrackTracked_(o) || String(o.tracking).trim() !== t.tracking) return;
      var rec = found[t.tracking];
      var f = {};
      if (!rec) {
        if (!looked[t.tracking]) return;
        summary.missing++;
        if (String(o.carrierStatus) !== ECO.MISSING) {
          f.carrierStatus = ECO.MISSING;
          f.carrierMoved = now;
          log_(actor, o.id, 'Colis introuvable', 'Le suivi ' + t.tracking + ' n’apparaît pas chez Ecotrack. Vérifiez dans Ecotrack.');
        }
      } else {
        var raw = String(rec.status == null ? '' : rec.status).trim();
        var mapped = mapEcotrackStatus_(raw);
        if (raw && raw !== String(o.carrierStatus)) {
          f.carrierStatus = raw;
          // Le premier statut lu ne remet pas à zéro l'horloge du colis (date de création).
          if (!isBlank_(o.carrierStatus) || isBlank_(o.carrierMoved)) f.carrierMoved = now;
        }
        var payment = rec.payment_id == null ? '' : String(rec.payment_id).trim();
        if (payment && payment !== String(o.paymentId)) f.paymentId = payment;
        if (mapped && mapped !== o.status && STATUS_RANK_[mapped] > STATUS_RANK_[o.status]) {
          f.status = mapped;
          if (mapped === STATUS.CANCELLED) f.cancelReason = 'Annulée chez Ecotrack';
          summary.updated++;
          log_(actor, o.id, 'Statut du colis', raw + ' → ' + mapped);
        } else if (mapped === null && raw) {
          summary.unknown++;
          if (hasRaw && raw !== String(o.carrierStatus)) {
            log_(actor, o.id, 'Statut Ecotrack inconnu', raw + ' (la commande reste « ' + o.status + ' » : mettez-la à jour à la main si besoin)');
          }
        }
      }
      if (Object.keys(f).length) {
        f.updated = now;
        writeFields_(ctx, o, f);
      }
    });
  });
  markSynced_();
  return summary;
}

function markSynced_() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty(ECO.PROP_LAST_SYNC, new Date().toISOString());
  clearEcotrackError_();
}

/** Point d'entrée du déclencheur automatique (toutes les 30 minutes). */
function syncEcotrackStatuses() {
  try {
    return syncEcotrackStatuses_();
  } catch (e) {
    var msg = String(e && e.message ? e.message : e);
    var p = PropertiesService.getScriptProperties();
    if (p.getProperty(ECO.PROP_LAST_ERROR) !== msg) {
      p.setProperty(ECO.PROP_LAST_ERROR, msg);
      log_({ name: 'Ecotrack' }, '', 'Erreur Ecotrack', msg);
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fonctions appelées par l'interface                                 */
/* ------------------------------------------------------------------ */

function api_ecotrackTest() {
  var r = ecotrackTest_();
  return { ok: true, message: 'Connexion réussie : jeton valide, ' + r.wilayas + ' wilayas desservies.' };
}

function api_ecotrackSyncFees() {
  var s = syncEcotrackFees_();
  return {
    stats: s,
    message: (s.rows - s.inactive) + ' wilayas mises à jour. Stop desk disponible dans ' + s.withStopDesk + ' wilayas' +
      (s.inactive ? ' ; ' + s.inactive + ' wilaya(s) non desservie(s) laissée(s) vide(s)' : '') + '.'
  };
}

function api_ecotrackSyncStatuses() {
  var s = syncEcotrackStatuses_();
  var message = s.checked + ' colis vérifié(s), ' + s.updated + ' mis à jour' +
    (s.unknown ? ', ' + s.unknown + ' statut(s) inconnu(s) (voir l’onglet Journal)' : '') +
    (s.missing ? ', ' + s.missing + ' introuvable(s) chez Ecotrack' : '') + '.';
  return { summary: s, message: message };
}

/** Données de la page Expéditions : commandes à expédier, et colis créés qui attendent votre validation. */
function api_shippingList() {
  var cfg = ecotrackConfig_();
  var settings = getSettings_();
  var ctx = readOrders_();
  var now = new Date();
  var catalog = null;
  var catalogError = '';
  if (cfg.configured) {
    try { catalog = ecotrackCatalog_(false); } catch (e) { catalogError = String(e && e.message ? e.message : e); }
  }
  var toShip = [];
  var created = [];
  ctx.orders.forEach(function (o) {
    var base = {
      id: String(o.id), client: String(o.client), wilaya: String(o.wilaya), commune: String(o.commune),
      mode: String(o.mode), total: toNumber_(o.total), product: String(o.product), date: iso_(o.date)
    };
    if (o.status === STATUS.CONFIRMED && isBlank_(o.tracking)) {
      base.problems = ecotrackProblems_(o, catalog);
      toShip.push({ o: o, item: base });
    } else if (o.status === STATUS.CONFIRMED && String(o.carrier) === ECO.NAME && !isBlank_(o.tracking)) {
      var since = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date);
      base.tracking = String(o.tracking);
      base.carrierStatus = String(o.carrierStatus);
      base.carrierLabel = ecotrackLabel_(o.carrierStatus) || ecotrackLabel_('prete_a_expedier');
      base.since = iso_(since);
      base.ageHours = since ? Math.floor((now.getTime() - since.getTime()) / 3600000) : 0;
      base.late = base.ageHours >= settings.SUIVI_ALERTE_HEURES;
      created.push({ o: o, item: base });
    }
  });
  var oldestFirst = function (a, b) {
    var da = toDate_(a.o.date);
    var db = toDate_(b.o.date);
    return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
  };
  toShip.sort(oldestFirst);
  created.sort(oldestFirst);
  var items = function (list) { return list.map(function (x) { return x.item; }); };
  return {
    configured: cfg.configured,
    host: cfg.url.replace(/^https?:\/\//, ''),
    catalogError: catalogError,
    alertHours: settings.SUIVI_ALERTE_HEURES,
    toShip: items(toShip),
    created: items(created)
  };
}

/** Crée les colis chez Ecotrack (la validation se fait dans l'interface d'Ecotrack). */
function api_shipEcotrack(ids) {
  return shipToEcotrack_(ids, currentUser_());
}

/* ------------------------------------------------------------------ */
/* Menu du classeur                                                   */
/* ------------------------------------------------------------------ */

function menuEcotrackSetup() {
  var ui = SpreadsheetApp.getUi();
  var first = ui.prompt('Ecotrack (1/2)',
    'Adresse de votre plateforme Ecotrack, par exemple https://monsociete.ecotrack.dz :', ui.ButtonSet.OK_CANCEL);
  if (first.getSelectedButton() !== ui.Button.OK) return;
  var second = ui.prompt('Ecotrack (2/2)',
    'Jeton API (à copier depuis votre compte Ecotrack). Il est enregistré dans les propriétés protégées du script, jamais dans le classeur :',
    ui.ButtonSet.OK_CANCEL);
  if (second.getSelectedButton() !== ui.Button.OK) return;
  try {
    saveEcotrackConfig_(first.getResponseText(), second.getResponseText());
    var r = ecotrackTest_();
    ui.alert('Ecotrack', 'Connexion réussie : jeton valide, ' + r.wilayas + ' wilayas desservies.\n\nÉtape suivante : DZ Smart Shop › Ecotrack › Récupérer les tarifs.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Ecotrack : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuEcotrackTest() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Ecotrack', api_ecotrackTest().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Ecotrack : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuEcotrackFees() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert('Récupérer les tarifs Ecotrack',
    'Les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de l’onglet Tarifs vont être remplacées par les prix d’Ecotrack. ' +
    'Les colonnes Yalidine ne changent pas. Continuer ?', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;
  try {
    ui.alert('Ecotrack', api_ecotrackSyncFees().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Ecotrack : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuEcotrackStatuses() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Ecotrack', api_ecotrackSyncStatuses().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Ecotrack : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

/* ======================= Tracking.gs ======================= */

/**
 * Tracking.gs : page « Suivi » des colis Ecotrack.
 *
 *  - colis en cours (statut en direct, relu toutes les 30 minutes) ;
 *  - alertes « à traiter » : colis suspendu, retour en cours, sans mouvement
 *    depuis N heures (réglage SUIVI_ALERTE_HEURES, 26 par défaut), créé mais
 *    pas validé, introuvable, statut inconnu ;
 *  - argent : chez le livreur, livré pas encaissé, encaissé pas payé, prêt à
 *    verser, payé, et versements ;
 *  - chronologie d'un colis (get/tracking/info).
 *
 * Les statuts viennent d'Ecotrack.gs (ECO_STATUSES_), qui les relit.
 */

/* ------------------------------------------------------------------ */
/* Alertes « à traiter »                                              */
/* ------------------------------------------------------------------ */

var ALERT_LEVEL_RANK_ = { urgent: 0, warn: 1, info: 2 };

/** « 5 h », « 2 j » : durée lisible. */
function durationText_(ms) {
  var hours = Math.floor(Math.max(ms, 0) / 3600000);
  if (hours < 1) return 'moins d’1 h';
  if (hours < 48) return hours + ' h';
  return Math.floor(hours / 24) + ' j';
}

/**
 * Colis Ecotrack qui demandent une action. Un colis « traité » (bouton
 * « Marquer comme traité ») disparaît : jusqu'à son prochain changement de
 * statut pour une alerte liée à un événement, ou pendant N heures pour une
 * alerte liée au temps.
 */
function trackingAlerts_(orders, settings, now) {
  var limit = settings.SUIVI_ALERTE_HEURES * 3600000;
  var alerts = [];
  orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : (o.status === STATUS.CONFIRMED ? 'draft' : 'transit');
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    var touched = toDate_(o.followUp);
    var handled = !!touched && touched.getTime() >= moved.getTime();
    var base = touched && touched.getTime() > moved.getTime() ? touched : moved;
    var label = info ? info.label : '';
    var make = function (kind, level, title, detail, since) {
      return {
        id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya),
        tracking: String(o.tracking), carrierStatus: String(o.carrierStatus), carrierLabel: label, status: o.status,
        kind: kind, level: level, title: title, detail: detail, since: since.toISOString()
      };
    };
    var inTransit = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;

    if (group === 'suspended' && !handled) {
      alerts.push(make('suspended', 'urgent', 'Colis suspendu',
        'Le livreur n’a pas pu terminer la livraison : appelez le client.', moved));
    } else if (group === 'returning' && !handled) {
      alerts.push(make('returning', 'urgent', 'Retour en cours',
        'Le colis (' + label.toLowerCase() + ') revient : rappelez le client pour tenter de sauver la commande.', moved));
    } else if (group === 'draft' && o.status === STATUS.CONFIRMED && now.getTime() - base.getTime() >= limit) {
      alerts.push(make('draft', 'warn', 'À valider chez Ecotrack',
        'Colis créé depuis ' + durationText_(now.getTime() - base.getTime()) + ' et pas encore validé : validez-le dans Ecotrack, sinon il ne partira pas.', base));
    } else if ((group === 'transit' || group === 'delivery') && inTransit && now.getTime() - base.getTime() >= limit) {
      alerts.push(make('stale', 'warn', 'Sans mouvement',
        'Aucun changement depuis ' + durationText_(now.getTime() - base.getTime()) + (label ? ' (' + label.toLowerCase() + ')' : '') + '.', base));
    } else if (group === 'missing' && !handled) {
      alerts.push(make('missing', 'warn', 'Introuvable chez Ecotrack',
        'Le suivi ' + o.tracking + ' n’apparaît pas chez Ecotrack : vérifiez dans Ecotrack.', moved));
    } else if (group === 'unknown' && !handled) {
      alerts.push(make('unknown', 'info', 'Statut inconnu',
        'Ecotrack a envoyé « ' + o.carrierStatus + ' » : l’outil ne le connaît pas. Mettez la commande à jour à la main si besoin.', moved));
    }
  });
  alerts.sort(function (a, b) {
    var r = ALERT_LEVEL_RANK_[a.level] - ALERT_LEVEL_RANK_[b.level];
    return r || String(a.since).localeCompare(String(b.since));
  });
  return alerts;
}

/* ------------------------------------------------------------------ */
/* Argent                                                             */
/* ------------------------------------------------------------------ */

/**
 * Où est l'argent des colis Ecotrack (montants à encaisser, avant déduction
 * des frais d'Ecotrack) :
 *   enRoute   : colis pas encore livrés
 *   delivered : livrés, pas encore encaissés par le livreur
 *   cashed    : encaissés, pas encore payés par Ecotrack
 *   ready     : paiement prêt à être versé
 *   paid      : payés (sur les `days` derniers jours)
 */
function trackingMoney_(orders, now, days) {
  var since = new Date(now.getTime() - days * 86400000);
  var bucket = function () { return { count: 0, amount: 0 }; };
  var money = { enRoute: bucket(), delivered: bucket(), cashed: bucket(), ready: bucket(), paid: bucket() };
  var payments = {};
  var add = function (b, amount) { b.count++; b.amount += amount; };
  orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : '';
    var amount = toNumber_(o.total);
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    var shipped = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;
    if (group === 'transit' || group === 'delivery' || group === 'suspended' || (!group && shipped)) {
      if (shipped) add(money.enRoute, amount);
    } else if (group === 'delivered') add(money.delivered, amount);
    else if (group === 'cashed') add(money.cashed, amount);
    else if (group === 'ready') add(money.ready, amount);
    else if (group === 'paid' && moved.getTime() >= since.getTime()) add(money.paid, amount);

    var pid = String(o.paymentId).trim();
    if (pid && moved.getTime() >= since.getTime()) {
      var p = payments[pid] = payments[pid] || { id: pid, count: 0, amount: 0, paid: true, last: moved };
      p.count++;
      p.amount += amount;
      if (group !== 'paid') p.paid = false;
      if (moved.getTime() > p.last.getTime()) p.last = moved;
    }
  });
  var list = Object.keys(payments).map(function (k) {
    var p = payments[k];
    return { id: p.id, count: p.count, amount: p.amount, paid: p.paid, last: p.last.toISOString() };
  }).sort(function (a, b) { return String(b.last).localeCompare(String(a.last)); }).slice(0, 20);
  return { money: money, payments: list };
}

/* ------------------------------------------------------------------ */
/* Chronologie d'un colis                                             */
/* ------------------------------------------------------------------ */

/** Étapes renvoyées par get/tracking/info (liste de la documentation). */
var ECO_ACTIVITIES_ = {
  order_information_received_by_carrier: 'Commande enregistrée et validée par le vendeur',
  picked: 'Colis récupéré par le transporteur',
  accepted_by_carrier: 'Colis réceptionné par le centre de tri',
  dispatched_to_driver: 'Colis confié au livreur',
  attempt_delivery: 'Tentative de livraison',
  return_asked: 'Retour initié par le centre de tri',
  return_in_transit: 'Retour en transit',
  return_received: 'Retour réceptionné par le vendeur',
  livred: 'Colis livré',
  encaissed: 'Commande encaissée',
  payed: 'Paiement effectué'
};

function activityLabel_(code) {
  var key = normalizeText_(code).replace(/ /g, '_');
  return Object.prototype.hasOwnProperty.call(ECO_ACTIVITIES_, key) ? ECO_ACTIVITIES_[key] : String(code);
}

function firstOf_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

/**
 * Étapes d'un colis, de la plus ancienne à la plus récente. La documentation
 * ne montre pas la forme exacte de la réponse : on cherche une liste et, dans
 * chaque élément, le nom de l'étape, la date et une remarque.
 */
function parseTrackingInfo_(json) {
  var list = listOf_(json, ['activities', 'data', 'history', 'tracking', 'events', 'trackings']);
  if (!list.length && json && typeof json === 'object' && !Array.isArray(json)) {
    Object.keys(json).some(function (k) {
      if (Array.isArray(json[k]) && json[k].length) { list = json[k]; return true; }
      return false;
    });
  }
  var events = [];
  list.forEach(function (e, i) {
    if (e === null || e === undefined) return;
    if (typeof e === 'string') {
      events.push({ code: e, label: activityLabel_(e), date: '', dateText: '', note: '', order: i });
      return;
    }
    if (typeof e !== 'object') return;
    var code = String(firstOf_(e, ['activity', 'status', 'statut', 'event', 'type', 'name', 'label']));
    var note = String(firstOf_(e, ['content', 'remarque', 'message', 'comment', 'note', 'description', 'details']));
    var rawDate = firstOf_(e, ['date', 'created_at', 'datetime', 'at', 'time', 'updated_at']);
    if (!code && !note) return;
    var d = toDate_(rawDate);
    events.push({
      code: code,
      label: code ? activityLabel_(code) : note,
      date: d ? d.toISOString() : '',
      dateText: d || isBlank_(rawDate) ? '' : String(rawDate),
      note: code ? note : '',
      order: i
    });
  });
  var allDated = events.length > 0 && events.every(function (e) { return e.date; });
  if (allDated) {
    events.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || a.order - b.order; });
  }
  return events.map(function (e) {
    return { code: e.code, label: e.label, date: e.date, dateText: e.dateText, note: e.note };
  });
}

/** Chronologie d'un colis. Si la réponse n'est pas reconnue, elle est renvoyée telle quelle. */
function api_parcelHistory(id) {
  var o = findOrder_(readOrders_(), id);
  if (!o) throw new Error('Commande introuvable.');
  var tracking = String(o.tracking).trim();
  if (!tracking) throw new Error('Cette commande n’a pas de n° de suivi.');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);
  var json = ecotrackGet_('/api/v1/get/tracking/info', { tracking: tracking });
  var events = parseTrackingInfo_(json);
  return {
    id: String(o.id), client: String(o.client), tracking: tracking,
    carrierLabel: ecotrackLabel_(o.carrierStatus),
    events: events,
    raw: events.length ? '' : JSON.stringify(json).slice(0, 2000)
  };
}

/* ------------------------------------------------------------------ */
/* Page Suivi                                                         */
/* ------------------------------------------------------------------ */

/**
 * Données de la page Suivi. days = période de l'argent « payé » et des
 * versements : 7, 30 ou 90 jours.
 */
function api_trackingOverview(days) {
  days = [7, 30, 90].indexOf(Number(days)) >= 0 ? Number(days) : 30;
  var cfg = ecotrackConfig_();
  var settings = getSettings_();
  var ctx = readOrders_();
  var now = new Date();
  var props = PropertiesService.getScriptProperties();
  var limit = settings.SUIVI_ALERTE_HEURES * 3600000;
  var alerts = trackingAlerts_(ctx.orders, settings, now);

  var staleIds = {};
  alerts.forEach(function (a) { if (a.kind === 'stale' || a.kind === 'draft') staleIds[a.id] = true; });
  var parcels = [];
  ctx.orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : (o.status === STATUS.CONFIRMED ? 'draft' : 'transit');
    var active = o.status === STATUS.CONFIRMED || o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY ||
      (o.status === STATUS.RETURNED && group === 'returning');
    if (!active) return;
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    parcels.push({
      id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya),
      tracking: String(o.tracking), carrierStatus: String(o.carrierStatus),
      carrierLabel: info ? info.label : (o.status === STATUS.CONFIRMED ? 'Créé, à valider chez Ecotrack' : ''),
      group: group, status: o.status, total: toNumber_(o.total),
      since: moved.toISOString(), ageHours: Math.floor((now.getTime() - moved.getTime()) / 3600000),
      stale: !!staleIds[String(o.id)]
    });
  });
  parcels.sort(function (a, b) { return String(a.since).localeCompare(String(b.since)); });

  var m = trackingMoney_(ctx.orders, now, days);
  return {
    configured: cfg.configured,
    lastSync: String(props.getProperty(ECO.PROP_LAST_SYNC) || ''),
    lastError: String(props.getProperty(ECO.PROP_LAST_ERROR) || ''),
    alertHours: settings.SUIVI_ALERTE_HEURES,
    days: days,
    alerts: alerts,
    parcels: parcels,
    money: m.money,
    payments: m.payments,
    limitMs: limit
  };
}

/** « J'ai traité cette alerte » : elle disparaît jusqu'au prochain changement du colis. */
function api_markFollowUp(id) {
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (ctx.map.followUp === undefined) {
      throw new Error('Colonne « Suivi traité le » absente du classeur. Lancez « DZ Smart Shop › Installer / réparer le classeur ».');
    }
    writeFields_(ctx, o, { followUp: new Date() });
    log_(currentUser_(), o.id, 'Suivi traité', 'Alerte traitée pour le colis ' + o.tracking);
    return { id: String(o.id) };
  });
}

/** Pastilles du menu : appels à faire et alertes de suivi (urgentes ou à surveiller). */
function api_counts() {
  var ctx = readOrders_();
  var now = new Date();
  var due = 0;
  ctx.orders.forEach(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0) return;
    var cb = toDate_(o.callback);
    if (!cb || cb <= now) due++;
  });
  var alerts = trackingAlerts_(ctx.orders, getSettings_(), now).filter(function (a) { return a.level !== 'info'; });
  return { queue: due, alerts: alerts.length };
}

/* ======================= Shopify.gs ======================= */

/**
 * Shopify.gs : importation automatique des commandes Shopify (Releasit COD).
 *
 * Une autre voie, sans accès Shopify : Releasit COD écrit lui-même les commandes
 * dans l'onglet RELEASIT (voir Releasit.gs). Les deux peuvent tourner ensemble :
 * le n° de commande (#1038) évite les doublons.
 *
 * Toutes les 5 minutes, les nouvelles commandes de la boutique sont ajoutées à
 * l'onglet Commandes (statut vide), puis préparées comme n'importe quelle autre
 * ligne (téléphone, wilaya, alertes… voir processNewRows). Les commandes déjà
 * présentes ne sont jamais ajoutées deux fois (le n° de commande Shopify sert
 * de clé).
 *
 * L'accès à Shopify est en LECTURE seule (permission « read_orders »). Il est
 * enregistré dans les « Propriétés du script » (menu DZ Smart Shop › Shopify),
 * jamais dans le classeur ni dans le code. Deux façons de s'authentifier :
 *  - un jeton d'accès (commence par shpat_) ;
 *  - un identifiant client + un secret (application créée dans le Dev Dashboard) :
 *    l'outil demande lui-même un jeton à Shopify et le renouvelle.
 */

var SHOP = {
  PROP_SHOP: 'SHOPIFY_SHOP',
  PROP_TOKEN: 'SHOPIFY_TOKEN',
  PROP_CLIENT_ID: 'SHOPIFY_CLIENT_ID',
  PROP_CLIENT_SECRET: 'SHOPIFY_CLIENT_SECRET',
  PROP_TOKEN_CACHE: 'SHOPIFY_TOKEN_CACHE',
  PROP_LAST_IMPORT: 'SHOPIFY_LAST_IMPORT',
  PROP_LAST_RUN: 'SHOPIFY_LAST_RUN',
  PROP_LAST_ERROR: 'SHOPIFY_LAST_ERROR',
  PAGE: 25,                 // commandes par requête (la limite de coût d'une requête GraphQL est de 1000 points)
  MAX_PAGES: 16,            // 400 commandes au maximum par importation
  OVERLAP_MS: 15 * 60000    // on relit les 15 dernières minutes : les doublons sont ignorés
};

var SHOPIFY_NOT_CONFIGURED_ = 'Shopify n’est pas configuré. Menu « DZ Smart Shop › Shopify › Enregistrer la boutique et l’accès ».';

/* ------------------------------------------------------------------ */
/* Configuration                                                      */
/* ------------------------------------------------------------------ */

function shopifyConfig_() {
  var p = PropertiesService.getScriptProperties();
  var shop = String(p.getProperty(SHOP.PROP_SHOP) || '').trim();
  var token = String(p.getProperty(SHOP.PROP_TOKEN) || '').trim();
  var clientId = String(p.getProperty(SHOP.PROP_CLIENT_ID) || '').trim();
  var clientSecret = String(p.getProperty(SHOP.PROP_CLIENT_SECRET) || '').trim();
  return {
    shop: shop, token: token, clientId: clientId, clientSecret: clientSecret,
    mode: token ? 'token' : 'client',
    configured: !!(shop && (token || (clientId && clientSecret)))
  };
}

/** algerie-smart.myshopify.com, ou '' si l'adresse n'est pas celle d'une boutique Shopify. */
function normalizeShopifyDomain_(raw) {
  var s = String(raw == null ? '' : raw).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(s)) s += '.myshopify.com';
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s) ? s : '';
}

/** Enregistre la boutique et l'accès : un jeton (secret vide) ou un identifiant client + son secret. */
function saveShopifyConfig_(rawShop, rawKey, rawSecret) {
  var shop = normalizeShopifyDomain_(rawShop);
  if (!shop) throw new Error('Adresse de boutique invalide. Exemple : ma-boutique.myshopify.com');
  var key = String(rawKey == null ? '' : rawKey).replace(/\s+/g, '');
  var secret = String(rawSecret == null ? '' : rawSecret).replace(/\s+/g, '');
  if (key.length < 8) throw new Error('Jeton ou identifiant client trop court : copiez-le en entier.');
  var p = PropertiesService.getScriptProperties();
  p.setProperty(SHOP.PROP_SHOP, shop);
  p.deleteProperty(SHOP.PROP_TOKEN_CACHE);
  if (secret) {
    if (secret.length < 8) throw new Error('Secret trop court : copiez-le en entier.');
    p.setProperty(SHOP.PROP_CLIENT_ID, key);
    p.setProperty(SHOP.PROP_CLIENT_SECRET, secret);
    p.deleteProperty(SHOP.PROP_TOKEN);
  } else {
    p.setProperty(SHOP.PROP_TOKEN, key);
    p.deleteProperty(SHOP.PROP_CLIENT_ID);
    p.deleteProperty(SHOP.PROP_CLIENT_SECRET);
  }
  return { shop: shop, mode: secret ? 'client' : 'token' };
}

/* ------------------------------------------------------------------ */
/* Appels à l'API                                                     */
/* ------------------------------------------------------------------ */

function shopifyError_(message, code) {
  var e = new Error(message);
  e.code = code || 0;
  return e;
}

/** Jeton d'accès : celui enregistré, ou un jeton demandé (puis gardé) avec l'identifiant client et son secret. */
function shopifyAccessToken_(forceRefresh) {
  var cfg = shopifyConfig_();
  if (!cfg.configured) throw shopifyError_(SHOPIFY_NOT_CONFIGURED_);
  if (cfg.token) return cfg.token;
  var p = PropertiesService.getScriptProperties();
  if (!forceRefresh) {
    try {
      var cached = JSON.parse(p.getProperty(SHOP.PROP_TOKEN_CACHE) || 'null');
      if (cached && cached.token && cached.exp > Date.now() + 10 * 60000) return cached.token;
    } catch (e) { /* cache illisible : on redemande un jeton */ }
  }
  var resp;
  try {
    resp = UrlFetchApp.fetch('https://' + cfg.shop + '/admin/oauth/access_token', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'client_credentials' }),
      muteHttpExceptions: true,
      followRedirects: false
    });
  } catch (e) {
    throw shopifyError_('Impossible de joindre Shopify (' + (e && e.message ? e.message : e) + ').');
  }
  var json = null;
  try { json = JSON.parse(resp.getContentText() || 'null'); } catch (e) { json = null; }
  if (resp.getResponseCode() !== 200 || !json || !json.access_token) {
    throw shopifyError_('Shopify a refusé l’identifiant client et son secret (erreur ' + resp.getResponseCode() +
      '). Vérifiez-les, et que l’application est bien installée sur la boutique ' + cfg.shop + '.', resp.getResponseCode());
  }
  var seconds = Number(json.expires_in) > 0 ? Number(json.expires_in) : 86399;
  p.setProperty(SHOP.PROP_TOKEN_CACHE, JSON.stringify({ token: json.access_token, exp: Date.now() + seconds * 1000 }));
  return json.access_token;
}

function shopifyErrorText_(errors) {
  if (!errors) return '';
  if (typeof errors === 'string') return errors;
  if (Array.isArray(errors)) {
    return errors.map(function (e) { return e && e.message ? e.message : String(e); }).join(' ; ');
  }
  return JSON.stringify(errors).slice(0, 300);
}

/** Exécute une requête GraphQL (lecture) et renvoie `data`. Gère la limite de débit et le renouvellement du jeton. */
function shopifyGraphql_(query, variables) {
  var cfg = shopifyConfig_();
  if (!cfg.configured) throw shopifyError_(SHOPIFY_NOT_CONFIGURED_);
  var url = 'https://' + cfg.shop + '/admin/api/' + getSettings_().SHOPIFY_API_VERSION + '/graphql.json';
  var refreshed = false;
  for (var attempt = 0; attempt < 4; attempt++) {
    var token = shopifyAccessToken_(false);
    var resp;
    try {
      resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'X-Shopify-Access-Token': token },
        payload: JSON.stringify({ query: query, variables: variables || {} }),
        muteHttpExceptions: true,
        followRedirects: false
      });
    } catch (e) {
      throw shopifyError_('Impossible de joindre Shopify (' + (e && e.message ? e.message : e) + '). Vérifiez l’adresse de la boutique et votre connexion.');
    }
    var code = resp.getResponseCode();
    var text = resp.getContentText() || '';
    var json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }

    if (code === 401) {
      if (cfg.mode === 'client' && !refreshed) { refreshed = true; shopifyAccessToken_(true); continue; }
      throw shopifyError_('Shopify a refusé l’accès (jeton invalide, expiré ou révoqué). Enregistrez-le de nouveau : menu « DZ Smart Shop › Shopify › Enregistrer la boutique et l’accès ».', 401);
    }
    if (code === 402 || code === 403) {
      throw shopifyError_('Shopify refuse l’accès à cette boutique (erreur ' + code + '). Vérifiez que l’application est installée et active.', code);
    }
    if (code === 404) {
      throw shopifyError_('Boutique ou version d’API introuvable (erreur 404). Vérifiez l’adresse ' + cfg.shop + ' et le réglage SHOPIFY_API_VERSION.', 404);
    }
    if (code === 429) { Utilities.sleep(2000 * (attempt + 1)); continue; }
    if (code >= 500) throw shopifyError_('Shopify est indisponible (erreur ' + code + '). Réessayez plus tard.', code);
    if (json === null) throw shopifyError_('Réponse inattendue de Shopify (erreur ' + code + ').', code);

    if (json.errors) {
      var throttled = Array.isArray(json.errors) && json.errors.some(function (e) { return e && e.extensions && e.extensions.code === 'THROTTLED'; });
      if (throttled) { Utilities.sleep(2000 * (attempt + 1)); continue; }
      var msg = shopifyErrorText_(json.errors);
      if (/access denied|read_orders|ACCESS_DENIED/i.test(msg)) {
        throw shopifyError_('Shopify refuse l’accès aux commandes : l’application n’a pas la permission « read_orders ». Ajoutez-la dans la configuration de l’application Shopify, puis réinstallez l’application sur la boutique.', 403);
      }
      throw shopifyError_('Shopify a refusé la demande : ' + msg, code);
    }
    return json.data;
  }
  throw shopifyError_('Shopify est trop sollicité en ce moment : réessayez dans quelques minutes.', 429);
}

/** Vérifie l'accès : nom de la boutique, devise, et permission de lire les commandes. */
function shopifyTest_() {
  var data = shopifyGraphql_('query { shop { name myshopifyDomain currencyCode } orders(first: 1) { nodes { name } } }');
  var shop = (data && data.shop) || {};
  var out = { shop: String(shop.name || ''), domain: String(shop.myshopifyDomain || ''), currency: String(shop.currencyCode || ''), warning: '' };
  if (out.currency && out.currency !== 'DZD') {
    out.warning = 'Attention : cette boutique est en ' + out.currency + ', pas en dinars algériens (DZD). L’outil est prévu pour l’Algérie.';
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Nettoyage des champs (Releasit COD)                                */
/* ------------------------------------------------------------------ */

/** Chiffres arabes-indiens (٠١٢…) et persans en chiffres latins. */
function latinDigits_(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
    .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
}

/** Texte comparable : minuscules, sans accents ni voyelles arabes, alef/ya/ta marbouta unifiés. */
function normalizeLoose_(value) {
  return latinDigits_(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064A ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

var WILAYA_LOOKUP_ = null;
function wilayaLookup_() {
  if (WILAYA_LOOKUP_) return WILAYA_LOOKUP_;
  var map = {};
  var add = function (name, code) {
    var key = normalizeLoose_(name);
    if (!key) return;
    map[key] = code;
    if (key.indexOf('ال') === 0 && key.length > 4) map[key.slice(2)] = code; // sans l'article « ال »
  };
  WILAYAS_AR.forEach(function (n, i) { add(n, i + 1); });
  WILAYA_ALIASES.forEach(function (a) { add(a[1], a[0]); });
  WILAYAS.forEach(function (w) {
    var parts = w.split(' - ');
    add(parts.slice(1).join(' - '), parseInt(parts[0], 10));
  });
  WILAYA_LOOKUP_ = map;
  return map;
}

/**
 * Code de la wilaya (1 à 58) d'un texte libre : « 16 », « Alger », « الجزائر »,
 * « ولاية سطيف », « wilaya de Sétif »… ou null si elle n'est pas reconnue.
 */
function wilayaFromText_(text) {
  var raw = latinDigits_(text).trim();
  if (!raw) return null;
  var byCode = wilayaCode_(raw);
  if (byCode !== null) return byCode;
  var map = wilayaLookup_();
  var key = normalizeLoose_(raw).replace(/^(ولايه|ولايت|wilaya|willaya|w)\s+/, '').replace(/^(de|d)\s+/, '').trim();
  if (!key) return null;
  if (map[key] !== undefined) return map[key];
  var bare = key.indexOf('ال') === 0 ? key.slice(2) : key;
  if (map[bare] !== undefined) return map[bare];
  // Mot par mot : « سطيف العلمة », « wilaya de Sétif ».
  var padded = ' ' + key + ' ';
  var best = null;
  var bestLength = 0;
  Object.keys(map).forEach(function (k) {
    if (k.length >= 4 && k.length > bestLength && padded.indexOf(' ' + k + ' ') >= 0) { best = map[k]; bestLength = k.length; }
  });
  return best;
}

/** « 16 - Alger » pour un code, ou null. */
function wilayaName_(code) {
  return code >= 1 && code <= WILAYAS.length ? WILAYAS[code - 1] : null;
}

/** Retire le titre du champ collé devant sa valeur (« العنوان Rue 5 » devient « Rue 5 »). */
function stripLabel_(value, labels) {
  var v = String(value == null ? '' : value).trim();
  labels.forEach(function (label) {
    if (v.length > label.length && v.toLowerCase().indexOf(label.toLowerCase()) === 0) {
      v = v.slice(label.length).replace(/^[\s:\-–]+/, '');
    }
  });
  return v.trim();
}

/** Premier numéro valide parmi plusieurs écritures (« +2130660… », « 672063914 », « ٠٦٦٠… »). */
function pickPhone_(candidates) {
  var first = '';
  for (var i = 0; i < candidates.length; i++) {
    var raw = latinDigits_(candidates[i]).trim();
    if (!raw) continue;
    if (!first) first = raw;
    var p = normalizePhone(raw);
    if (p.valid) return p.phone;
  }
  return first;
}

/** « Stop desk » pour une livraison au bureau, « Domicile » à domicile, '' si le titre n'est pas reconnu. */
function deliveryModeFromTitle_(title) {
  var t = String(title == null ? '' : title);
  if (/مكتب|bureau|stop ?desk|relais|agence/i.test(t)) return 'Stop desk';
  if (/منزل|بيت|domicile|home/i.test(t)) return 'Domicile';
  return '';
}

function shopifyAmount_(set) {
  return toNumber_(set && set.shopMoney ? set.shopMoney.amount : 0);
}

var SHOPIFY_ORDERS_QUERY_ =
  'query($first: Int!, $after: String, $query: String) {' +
  ' orders(first: $first, after: $after, sortKey: CREATED_AT, query: $query) {' +
  '  pageInfo { hasNextPage endCursor }' +
  '  nodes { id name createdAt cancelledAt phone note tags' +
  '   customAttributes { key value }' +
  '   shippingAddress { name firstName lastName phone address1 address2 city province }' +
  '   shippingLines(first: 2) { nodes { title originalPriceSet { shopMoney { amount } } } }' +
  '   totalPriceSet { shopMoney { amount } } subtotalPriceSet { shopMoney { amount } }' +
  '   lineItems(first: 10) { nodes { title quantity variantTitle } }' +
  '  }' +
  ' }' +
  '}';

/**
 * Une commande Shopify (Releasit COD) devient une ligne de l'onglet Commandes,
 * ou null si elle doit être ignorée (annulée, sans nom…). Les frais de livraison
 * et le total sont ceux annoncés au client dans Shopify.
 */
function shopifyNodeToOrder_(node) {
  if (!node || node.cancelledAt) return null;
  var attrs = {};
  (node.customAttributes || []).forEach(function (a) {
    if (a && a.key != null) attrs[normalizeLoose_(a.key)] = String(a.value == null ? '' : a.value).trim();
  });
  var pick = function (names) {
    for (var i = 0; i < names.length; i++) {
      var v = attrs[normalizeLoose_(names[i])];
      if (v) return v;
    }
    return '';
  };
  var ship = node.shippingAddress || {};

  var client = pick(['الاسم و اللقب', 'الاسم الكامل', 'الاسم', 'nom et prénom', 'nom', 'name', 'full name']);
  if (!client) client = String(ship.name || '').replace(/(^|\s)-(\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!client) return null;

  var phone = pickPhone_([pick(['رقم الهاتف', 'الهاتف', 'téléphone', 'telephone', 'phone', 'tel']), node.phone, ship.phone]);

  var address = stripLabel_(pick(['العنوان كاملا', 'العنوان', 'adresse', 'address']) || ship.address1 || '', ['العنوان كاملا', 'العنوان', 'Adresse', 'Address']);
  if (ship.address2) address = (address ? address + ', ' : '') + String(ship.address2).trim();
  var commune = stripLabel_(pick(['البلدية', 'الدائرة', 'commune', 'daira', 'municipality']), ['البلدية', 'Commune']);

  var wilayaTexts = [pick(['الولاية', 'wilaya', 'province', 'state']), ship.city, ship.province]
    .map(function (t) { return stripLabel_(t, ['الولاية', 'المدينة', 'Wilaya', 'City', 'Ville']); });
  var wilaya = '';
  for (var w = 0; w < wilayaTexts.length && !wilaya; w++) {
    var code = wilayaFromText_(wilayaTexts[w]);
    if (code !== null) wilaya = wilayaName_(code) || '';
  }
  if (!wilaya) wilaya = wilayaTexts.filter(function (t) { return t; })[0] || '';

  var items = ((node.lineItems && node.lineItems.nodes) || []).filter(function (it) { return it; });
  var product = items.map(function (it) {
    var variant = String(it.variantTitle || '').trim();
    var label = String(it.title || '').trim() + (variant && !/^default title$/i.test(variant) ? ' — ' + variant : '');
    return items.length > 1 && toNumber_(it.quantity) > 1 ? label + ' ×' + toNumber_(it.quantity) : label;
  }).join(' + ');
  var qty = items.length === 1 ? Math.max(toNumber_(items[0].quantity), 1) : 1;

  var lines = ((node.shippingLines && node.shippingLines.nodes) || []).filter(function (l) { return l; });
  var shipTitle = lines.length ? String(lines[0].title || '') : '';
  var mode = deliveryModeFromTitle_(shipTitle);
  var shipping = lines.reduce(function (sum, l) { return sum + shopifyAmount_(l.originalPriceSet); }, 0);

  var notes = [];
  if (node.note) notes.push(String(node.note).trim());
  if (shipTitle && !mode) notes.push('Livraison Shopify : ' + shipTitle);

  return {
    id: String(node.name || '').trim(),
    date: node.createdAt ? new Date(node.createdAt) : new Date(),
    client: client,
    phone: phone,
    wilaya: wilaya,
    commune: commune,
    address: address,
    product: product,
    qty: qty,
    price: shopifyAmount_(node.subtotalPriceSet),
    mode: mode || 'Domicile',
    shipping: shipping,
    total: shopifyAmount_(node.totalPriceSet),
    notes: notes.join(' · '),
    source: 'Shopify',
    campaign: pick(['UTM campaign']),
    shopifyId: String(node.id || '').replace(/^.*\//, '')
  };
}

/* ------------------------------------------------------------------ */
/* Importation                                                        */
/* ------------------------------------------------------------------ */

function hasTag_(node, tag) {
  var want = String(tag).toLowerCase();
  return (node.tags || []).some(function (t) { return String(t).toLowerCase() === want; });
}

/** Importe les nouvelles commandes Shopify. Renvoie un résumé. */
function importShopifyOrders_() {
  var summary = { configured: true, fetched: 0, imported: 0, skipped: 0, more: false };
  if (!shopifyConfig_().configured) { summary.configured = false; return summary; }
  var settings = getSettings_();
  var props = PropertiesService.getScriptProperties();
  var last = toDate_(props.getProperty(SHOP.PROP_LAST_IMPORT));
  var since = last ? new Date(last.getTime() - SHOP.OVERLAP_MS) : new Date(Date.now() - settings.SHOPIFY_JOURS_INITIAL * 86400000);
  var search = 'created_at:>=' + since.toISOString().replace(/\.\d{3}Z$/, 'Z');
  if (settings.SHOPIFY_TAG) search += ' tag:' + settings.SHOPIFY_TAG;

  // 1. Lecture chez Shopify (de la plus ancienne à la plus récente), sans bloquer le classeur.
  var nodes = [];
  var after = null;
  for (var page = 0; page < SHOP.MAX_PAGES; page++) {
    var data = shopifyGraphql_(SHOPIFY_ORDERS_QUERY_, { first: SHOP.PAGE, after: after, query: search });
    var conn = (data && data.orders) || { nodes: [], pageInfo: {} };
    nodes = nodes.concat(conn.nodes || []);
    if (!(conn.pageInfo && conn.pageInfo.hasNextPage)) break;
    after = conn.pageInfo.endCursor;
    if (page === SHOP.MAX_PAGES - 1) summary.more = true;
  }
  summary.fetched = nodes.length;

  // 2. Ajout des commandes absentes du classeur.
  var wanted = nodes.filter(function (n) { return !settings.SHOPIFY_TAG || hasTag_(n, settings.SHOPIFY_TAG); });
  var rows = [];
  wanted.forEach(function (n) {
    var o = shopifyNodeToOrder_(n);
    if (o && o.id) rows.push(o); else summary.skipped++;
  });
  if (rows.length) {
    summary.imported = withLock_(function () {
      var ctx = readOrders_();
      var known = trashIds_(); // une commande mise à la corbeille ne revient pas
      ctx.orders.forEach(function (o) { known[String(o.id).trim()] = true; });
      var added = 0;
      rows.forEach(function (o) {
        if (known[o.id]) { summary.skipped++; return; }
        known[o.id] = true;
        appendOrder_(ctx, o);
        added++;
      });
      if (added) log_({ name: 'Shopify' }, '', 'Importation Shopify', added + ' nouvelle(s) commande(s)');
      return added;
    });
  }

  // 3. Mémoire du point d'arrêt : la plus récente des commandes lues.
  var newest = nodes.reduce(function (max, n) {
    var d = toDate_(n.createdAt);
    return d && (!max || d > max) ? d : max;
  }, null);
  if (newest) props.setProperty(SHOP.PROP_LAST_IMPORT, newest.toISOString());
  props.setProperty(SHOP.PROP_LAST_RUN, new Date().toISOString());
  if (props.getProperty(SHOP.PROP_LAST_ERROR) !== null) props.deleteProperty(SHOP.PROP_LAST_ERROR);

  // 4. Préparation des nouvelles lignes (téléphone, wilaya, alertes, statut « À confirmer »).
  if (summary.imported) processNewRows();
  return summary;
}

/** Point d'entrée du déclencheur automatique (toutes les 5 minutes). */
function importShopifyOrders() {
  try {
    return importShopifyOrders_();
  } catch (e) {
    var msg = String(e && e.message ? e.message : e);
    var p = PropertiesService.getScriptProperties();
    if (p.getProperty(SHOP.PROP_LAST_ERROR) !== msg) {
      p.setProperty(SHOP.PROP_LAST_ERROR, msg);
      log_({ name: 'Shopify' }, '', 'Erreur Shopify', msg);
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fonctions appelées par l'interface et le menu                      */
/* ------------------------------------------------------------------ */

function api_shopifyStatus() {
  var cfg = shopifyConfig_();
  var p = PropertiesService.getScriptProperties();
  return {
    configured: cfg.configured,
    shop: cfg.shop,
    mode: cfg.configured ? cfg.mode : '',
    lastRun: String(p.getProperty(SHOP.PROP_LAST_RUN) || ''),
    lastError: String(p.getProperty(SHOP.PROP_LAST_ERROR) || '')
  };
}

function shopifyImportMessage_(s) {
  if (!s.configured) return SHOPIFY_NOT_CONFIGURED_;
  return s.imported + ' nouvelle(s) commande(s) importée(s) sur ' + s.fetched + ' lue(s)' +
    (s.more ? ' (il en reste : relancez l’importation)' : '') + '.';
}

function api_shopifyImport() {
  var s = importShopifyOrders_();
  return { summary: s, message: shopifyImportMessage_(s) };
}

function api_shopifyTest() {
  var r = shopifyTest_();
  return { ok: true, warning: r.warning, message: 'Connexion réussie : boutique « ' + r.shop + ' » (' + r.currency + ').' + (r.warning ? ' ' + r.warning : '') };
}

function menuShopifySetup() {
  var ui = SpreadsheetApp.getUi();
  var first = ui.prompt('Shopify (1/2)', 'Adresse de votre boutique, par exemple ma-boutique.myshopify.com :', ui.ButtonSet.OK_CANCEL);
  if (first.getSelectedButton() !== ui.Button.OK) return;
  var second = ui.prompt('Shopify (2/2)',
    'Collez le jeton d’accès (il commence par shpat_). Si votre application Shopify fournit plutôt un « Identifiant client » (Client ID) et un « Secret », collez ici l’identifiant client. ' +
    'Ces informations sont enregistrées dans les propriétés protégées du script, jamais dans le classeur :', ui.ButtonSet.OK_CANCEL);
  if (second.getSelectedButton() !== ui.Button.OK) return;
  var key = String(second.getResponseText() || '').trim();
  var secret = '';
  if (!/^shp(at|ca|ua)_/i.test(key)) {
    var third = ui.prompt('Shopify : secret', 'Collez maintenant le « Secret » de l’application :', ui.ButtonSet.OK_CANCEL);
    if (third.getSelectedButton() !== ui.Button.OK) return;
    secret = String(third.getResponseText() || '').trim();
  }
  try {
    saveShopifyConfig_(first.getResponseText(), key, secret);
    installTriggers_(); // l'importation automatique ne tourne que si Shopify est configuré
    ui.alert('Shopify', api_shopifyTest().message + '\n\nL’importation automatique se fait toutes les 5 minutes. Pour importer tout de suite : DZ Smart Shop › Shopify › Importer les commandes maintenant.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Shopify : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuShopifyTest() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Shopify', api_shopifyTest().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Shopify : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuShopifyImport() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Shopify', api_shopifyImport().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Shopify : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

/* ======================= Releasit.gs ======================= */

/**
 * Releasit.gs : transfert automatique des commandes écrites par Releasit COD.
 *
 * Releasit COD ajoute chaque nouvelle commande dans l'onglet « RELEASIT » du
 * classeur (intégration Google Sheets de Releasit). Chaque minute, l'outil
 * recopie les nouvelles lignes dans l'onglet Commandes, puis les prépare comme
 * toute autre commande (téléphone, wilaya, alertes, statut « À confirmer » :
 * voir processNewRows).
 *
 * Règles :
 *  - l'onglet RELEASIT n'est jamais modifié : il est seulement lu ;
 *  - les colonnes sont reconnues par leur titre (l'ordre n'a pas d'importance) ;
 *  - le n° de commande (« Order ID », par exemple #1038) sert de clé : une
 *    commande déjà présente dans Commandes n'est jamais ajoutée une seconde fois
 *    (même si elle vient aussi de l'import Shopify) ;
 *  - l'outil retient la dernière ligne lue : seules les lignes ajoutées ensuite
 *    sont transférées. Si cette ligne a disparu (onglet nettoyé), il relit les
 *    lignes des RELEASIT.DAYS derniers jours.
 *  - plusieurs lignes avec le même n° (une par produit) forment une seule commande.
 */

var RELEASIT = {
  SHEET: 'RELEASIT',
  WINDOW: 1000,             // lignes relues au maximum (les plus récentes, en bas de l'onglet)
  DAYS: 7,                  // sans repère : seules les lignes des 7 derniers jours sont transférées
  PROP_MARK: 'RELEASIT_MARK',
  PROP_LAST_RUN: 'RELEASIT_LAST_RUN',
  PROP_LAST_ERROR: 'RELEASIT_LAST_ERROR'
};

/**
 * Titres reconnus pour chaque information, dans l'ordre de préférence.
 * La comparaison ignore les majuscules, les accents, la ponctuation et les espaces en trop.
 */
var RELEASIT_COLUMNS_ = [
  { key: 'id', label: 'N°', names: ['Order ID', 'Order name', 'Order number', 'N° de commande', 'N° commande', 'Numéro de commande', 'Commande', 'رقم الطلب'] },
  { key: 'date', label: 'Date', names: ['Date', 'Date de commande', 'Created at', 'التاريخ'] },
  { key: 'client', label: 'Client', names: ['Client', 'Nom', 'Nom complet', 'Nom et prénom', 'Name', 'Full name', 'Customer', 'الاسم و اللقب', 'الاسم'] },
  { key: 'phone', label: 'Téléphone', names: ['Téléphone', 'Tél', 'Tel', 'Phone', 'Phone number', 'رقم الهاتف', 'الهاتف'] },
  { key: 'wilaya', label: 'Wilaya', names: ['Wilaya', 'Province', 'State', 'الولاية'] },
  { key: 'commune', label: 'Commune', names: ['Commune', 'Ville', 'City', 'البلدية'] },
  { key: 'address', label: 'Adresse', names: ['Adresse', 'Address', 'العنوان'] },
  { key: 'product', label: 'Produit', names: ['Produit et variant', 'Produit et variante', 'Produit', 'Produits', 'Product', 'Products', 'المنتج'] },
  { key: 'variant', label: 'Produit (variante)', names: ['Variant', 'Variante'] },
  { key: 'qty', label: 'Quantité', names: ['Quantité', 'Quantity', 'Qty', 'الكمية'] },
  { key: 'linePrice', label: 'Prix (si pas de total)', names: ['Prix de produit', 'Prix du produit', 'Prix produit', 'Prix', 'Price', 'Product price'] },
  { key: 'subtotal', label: 'Prix (si pas de total)', names: ['Sous total', 'Subtotal'] },
  { key: 'shipping', label: 'Frais livraison', names: ['Prix de livraison', 'Frais de livraison', 'Frais livraison', 'Shipping', 'Shipping price'] },
  { key: 'total', label: 'Total', names: ['Prix total', 'Total', 'Total price'] },
  { key: 'mode', label: 'Livraison', names: ['Type de livraison', 'Mode de livraison', 'Méthode de livraison', 'Livraison', 'Shipping method', 'Shipping rate'] },
  { key: 'campaign', label: 'Campagne', names: ['UTM campaign', 'utm_campaign', 'Campagne'] },
  { key: 'notes', label: 'Notes', names: ['Note', 'Notes', 'Remarque', 'Commentaire'] }
];

/** Informations dont l'absence est signalée (les autres sont facultatives). */
var RELEASIT_IMPORTANT_ = ['id', 'client', 'phone', 'wilaya', 'product', 'total', 'mode'];

/* ------------------------------------------------------------------ */
/* Lecture de l'onglet                                                */
/* ------------------------------------------------------------------ */

/** Numéro de colonne (0 = A) de chaque information reconnue. */
function releasitColumns_(header) {
  var byTitle = {};
  header.forEach(function (title, i) {
    var k = normalizeLoose_(title);
    if (k && byTitle[k] === undefined) byTitle[k] = i;
  });
  var col = {};
  var used = {};
  RELEASIT_COLUMNS_.forEach(function (c) {
    for (var i = 0; i < c.names.length; i++) {
      var idx = byTitle[normalizeLoose_(c.names[i])];
      if (idx !== undefined && !used[idx]) { col[c.key] = idx; used[idx] = true; break; }
    }
  });
  return col;
}

function releasitText_(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/** Date d'une ligne : une vraie date, « 2026-11-13 18:01:14 » (heure d'Algérie) ou « 13/11/2026 18:01 ». */
function releasitDate_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  var s = latinDigits_(value).trim();
  if (!s) return null;
  if (/\d[T ]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[+\-]\d{2}:?\d{2})$/i.test(s)) {
    var exact = new Date(s.replace(' ', 'T'));
    if (!isNaN(exact.getTime())) return exact;
  }
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  return null;
}

function releasitEnv_() {
  var wilayas = getWilayaList_();
  return { settings: getSettings_(), wilayas: wilayas, rates: readRates_(wilayas) };
}

/**
 * Domicile ou Stop desk deviné d'après les frais payés par le client, comparés
 * à l'onglet Tarifs. '' si les deux tarifs sont identiques ou ne correspondent pas.
 */
function releasitModeFromFee_(env, wilaya, fee) {
  if (!(fee > 0)) return '';
  var code = wilayaCode_(wilaya, env.wilayas);
  if (code === null || !env.rates[code]) return '';
  var carriers = [env.settings.SOCIETE_PAR_DEFAUT].concat(CARRIERS);
  for (var i = 0; i < carriers.length; i++) {
    var r = env.rates[code][carriers[i]];
    if (!r) continue;
    var home = r.Domicile === fee;
    var desk = r['Stop desk'] === fee;
    if (home && !desk) return 'Domicile';
    if (desk && !home) return 'Stop desk';
  }
  return '';
}

/**
 * Les lignes RELEASIT d'une même commande (même n°) deviennent une ligne de
 * l'onglet Commandes, ou null si elles sont inutilisables (ni nom ni téléphone).
 * Le total est celui annoncé au client ; le prix est le total moins la livraison.
 */
function releasitRowsToOrder_(rows, col, envFn) {
  var cell = function (row, key) { return col[key] === undefined ? '' : row[col[key]]; };
  var texts = function (key) {
    return rows.map(function (r) { return releasitText_(cell(r, key)); }).filter(function (t) { return t; });
  };
  var numbers = function (key) {
    return rows.map(function (r) { return cell(r, key); })
      .filter(function (v) { return releasitText_(v) !== ''; })
      .map(toNumber_);
  };
  var allSame = function (list) { return list.every(function (v) { return v === list[0]; }); };
  var sum = function (list) { return list.reduce(function (a, b) { return a + b; }, 0); };

  var id = releasitText_(cell(rows[0], 'id'));
  var client = texts('client')[0] || '';
  var phone = pickPhone_(rows.map(function (r) { return cell(r, 'phone'); }));
  if (!client && !phone) return null;

  var wilayaText = stripLabel_(texts('wilaya')[0] || '', ['الولاية', 'Wilaya']);
  var code = wilayaFromText_(wilayaText);
  var wilaya = (code !== null && wilayaName_(code)) || wilayaText;

  // Produits : une ligne par produit possible.
  var items = rows.map(function (r) {
    var label = releasitText_(cell(r, 'product'));
    var variant = releasitText_(cell(r, 'variant'));
    if (variant && label.toLowerCase().indexOf(variant.toLowerCase()) < 0) label = (label ? label + ' — ' : '') + variant;
    return { label: label, qty: Math.max(1, Math.round(toNumber_(cell(r, 'qty'))) || 1) };
  }).filter(function (it) { return it.label; });
  var product = items.length > 1
    ? items.map(function (it) { return it.qty > 1 ? it.label + ' ×' + it.qty : it.label; }).join(' + ')
    : (items[0] ? items[0].label : '');
  var qty = items.length === 1 ? items[0].qty : 1;

  // Montants.
  var shipList = numbers('shipping');
  var hasShip = shipList.length > 0;
  var shipping = hasShip ? Math.max.apply(null, shipList) : '';
  var totals = numbers('total');
  var orderTotal = totals.length && allSame(totals) ? totals[0] : null;
  var subtotals = numbers('subtotal');
  var lines = numbers('linePrice');
  var price = '';
  if (orderTotal !== null && hasShip && orderTotal - shipping >= 0) price = orderTotal - shipping;
  else if (subtotals.length && allSame(subtotals)) price = subtotals[0];
  else if (lines.length) price = sum(lines);
  var total = orderTotal !== null ? orderTotal : (price !== '' && hasShip ? price + shipping : '');

  // Type de livraison : écrit par Releasit, sinon deviné d'après les tarifs.
  var notes = texts('notes').slice(0, 1);
  var modeText = texts('mode')[0] || '';
  var mode = deliveryModeFromTitle_(modeText);
  if (!mode && hasShip) mode = releasitModeFromFee_(envFn(), wilaya, shipping);
  if (!mode) notes.push('Type de livraison à vérifier' + (modeText ? ' (Releasit : « ' + modeText + ' »)' : ''));

  return {
    id: id,
    date: releasitDate_(cell(rows[0], 'date')) || new Date(),
    client: client,
    phone: phone,
    wilaya: wilaya,
    commune: stripLabel_(texts('commune')[0] || '', ['البلدية', 'بلدية', 'Commune']),
    address: stripLabel_(texts('address')[0] || '', ['العنوان', 'Adresse']),
    product: product,
    qty: qty,
    price: price,
    mode: mode || 'Domicile',
    shipping: shipping,
    total: total,
    notes: notes.join(' · '),
    source: 'Releasit',
    campaign: texts('campaign')[0] || ''
  };
}

function releasitMark_(props) {
  try {
    var m = JSON.parse(props.getProperty(RELEASIT.PROP_MARK) || 'null');
    return m && typeof m.row === 'number' ? m : null;
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Transfert                                                          */
/* ------------------------------------------------------------------ */

/**
 * Recopie les nouvelles lignes de l'onglet RELEASIT dans Commandes.
 * options.force : relit l'onglet même si sa dernière ligne n'a pas changé.
 * Renvoie un résumé : { found, added, skipped, ignored, read, quick }.
 */
function transferReleasitOrders_(options) {
  options = options || {};
  var summary = { found: false, read: 0, added: 0, skipped: 0, ignored: 0, quick: false };
  var sh = ss_().getSheetByName(RELEASIT.SHEET);
  if (!sh) return summary;
  summary.found = true;
  var props = PropertiesService.getScriptProperties();
  var nowIso = new Date().toISOString();
  var mark = releasitMark_(props);
  var lastRow = sh.getLastRow();

  // 1. Rien de nouveau : même dernière ligne qu'au passage précédent (lecture d'une seule case).
  if (!options.force && mark && mark.row === lastRow &&
      (lastRow < 2 || releasitText_(sh.getRange(lastRow, mark.col || 1).getValue()) === mark.id)) {
    summary.quick = true;
    props.setProperty(RELEASIT.PROP_LAST_RUN, nowIso);
    return summary;
  }

  if (lastRow < 2) {
    props.setProperty(RELEASIT.PROP_MARK, JSON.stringify({ row: lastRow, id: '', col: 1 }));
    props.setProperty(RELEASIT.PROP_LAST_RUN, nowIso);
    if (props.getProperty(RELEASIT.PROP_LAST_ERROR) !== null) props.deleteProperty(RELEASIT.PROP_LAST_ERROR);
    return summary;
  }

  // 2. Lecture des dernières lignes.
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = releasitColumns_(header);
  if (col.id === undefined) {
    throw new Error('Onglet RELEASIT : colonne « Order ID » (n° de commande) introuvable. Ne renommez pas les titres de la première ligne.');
  }
  var first = Math.max(2, lastRow - RELEASIT.WINDOW + 1);
  var values = sh.getRange(first, 1, lastRow - first + 1, lastCol).getValues();
  var lastId = releasitText_(values[values.length - 1][col.id]);

  // 3. Lignes à examiner : celles après la dernière ligne déjà lue.
  var start = -1;
  if (mark && mark.id) {
    for (var i = values.length - 1; i >= 0; i--) {
      if (releasitText_(values[i][col.id]) === mark.id) { start = i + 1; break; }
    }
  }
  var since = start < 0 ? new Date(Date.now() - RELEASIT.DAYS * 86400000) : null;
  var groups = [];
  var byId = {};
  values.slice(Math.max(start, 0)).forEach(function (row) {
    if (row.every(function (v) { return releasitText_(v) === ''; })) return;
    var id = releasitText_(row[col.id]);
    if (!id) { summary.ignored++; return; }
    if (!byId[id]) { byId[id] = []; groups.push(byId[id]); }
    byId[id].push(row);
  });

  var env = null;
  var envFn = function () { return env || (env = releasitEnv_()); };
  var candidates = [];
  groups.forEach(function (rows) {
    var o = releasitRowsToOrder_(rows, col, envFn);
    if (!o) { summary.ignored++; return; }
    if (since && col.date !== undefined && releasitDate_(rows[0][col.date]) && o.date < since) return;
    candidates.push(o);
  });
  summary.read = candidates.length;

  // 4. Ajout des commandes absentes de l'onglet Commandes.
  if (candidates.length) {
    summary.added = withLock_(function () {
      var ctx = readOrders_();
      var known = trashIds_(); // une commande mise à la corbeille ne revient pas
      ctx.orders.forEach(function (o) { known[String(o.id).trim()] = true; });
      var fresh = candidates.filter(function (o) {
        if (known[o.id]) { summary.skipped++; return false; }
        known[o.id] = true;
        return true;
      });
      if (fresh.length) {
        appendOrders_(ctx, fresh);
        log_({ name: 'Releasit' }, '', 'Transfert Releasit', fresh.length + ' nouvelle(s) commande(s) : ' +
          fresh.map(function (o) { return o.id; }).join(', '));
      }
      return fresh.length;
    });
  }
  if (summary.ignored) {
    log_({ name: 'Releasit' }, '', 'Transfert Releasit', summary.ignored + ' ligne(s) de l’onglet RELEASIT ignorée(s) : sans n° de commande, ou sans nom ni téléphone');
  }

  // 5. Repère : la dernière ligne lue.
  props.setProperty(RELEASIT.PROP_MARK, JSON.stringify({ row: lastRow, id: lastId, col: col.id + 1 }));
  props.setProperty(RELEASIT.PROP_LAST_RUN, nowIso);
  if (props.getProperty(RELEASIT.PROP_LAST_ERROR) !== null) props.deleteProperty(RELEASIT.PROP_LAST_ERROR);

  // 6. Préparation des nouvelles lignes (téléphone, wilaya, alertes, statut « À confirmer »).
  if (summary.added) processNewRows();
  return summary;
}

/** Garde la dernière erreur ; ne l'écrit dans le Journal qu'une fois. */
function releasitRecordError_(e) {
  var msg = String(e && e.message ? e.message : e);
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty(RELEASIT.PROP_LAST_ERROR) !== msg) {
    p.setProperty(RELEASIT.PROP_LAST_ERROR, msg);
    log_({ name: 'Releasit' }, '', 'Erreur Releasit', msg);
  }
  return msg;
}

/** Point d'entrée du déclencheur automatique (chaque minute). */
function transferReleasitOrders() {
  try {
    return transferReleasitOrders_({});
  } catch (e) {
    releasitRecordError_(e);
    return null;
  }
}

function releasitMessage_(s) {
  if (!s.found) return 'Onglet « ' + RELEASIT.SHEET + ' » introuvable : créez-le, puis connectez-y Releasit COD (voir le README).';
  return s.added + ' nouvelle(s) commande(s) transférée(s) depuis l’onglet ' + RELEASIT.SHEET + '.' +
    (s.ignored ? ' ' + s.ignored + ' ligne(s) ignorée(s) (sans n° de commande, ou sans nom ni téléphone).' : '');
}

/** Ce que l'outil reconnaît dans l'onglet RELEASIT, pour vérifier l'intégration. */
function releasitColumnsReport_() {
  var sh = ss_().getSheetByName(RELEASIT.SHEET);
  if (!sh) return { found: false, recognized: [], missing: [], unknown: [] };
  var lastCol = sh.getLastColumn();
  var header = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var col = releasitColumns_(header);
  var used = {};
  var recognized = [];
  RELEASIT_COLUMNS_.forEach(function (c) {
    if (col[c.key] === undefined) return;
    used[col[c.key]] = true;
    recognized.push({ title: releasitText_(header[col[c.key]]), target: c.label });
  });
  var missing = RELEASIT_IMPORTANT_.filter(function (k) { return col[k] === undefined; }).map(function (k) {
    return RELEASIT_COLUMNS_.filter(function (c) { return c.key === k; })[0].label;
  });
  var unknown = header.map(releasitText_).filter(function (t, i) { return t && !used[i]; });
  return { found: true, recognized: recognized, missing: missing, unknown: unknown };
}

/* ------------------------------------------------------------------ */
/* Fonctions appelées par l'interface et le menu                      */
/* ------------------------------------------------------------------ */

/** Vérification rapide à l'ouverture des pages Commandes et Confirmation. */
function api_releasitSync() {
  var s = transferReleasitOrders();
  return s ? { found: s.found, added: s.added, message: releasitMessage_(s) } : { found: true, added: 0, error: true };
}

/** Bouton « Transférer maintenant » : relit l'onglet, et affiche l'erreur s'il y en a une. */
function api_releasitTransfer() {
  try {
    var s = transferReleasitOrders_({ force: true });
    return { summary: s, message: releasitMessage_(s) };
  } catch (e) {
    throw new Error(releasitRecordError_(e));
  }
}

/** État des arrivées automatiques de commandes (Releasit et Shopify), pour la page Commandes. */
function api_importStatus() {
  var p = PropertiesService.getScriptProperties();
  var report = releasitColumnsReport_();
  return {
    releasit: {
      found: report.found,
      lastRun: String(p.getProperty(RELEASIT.PROP_LAST_RUN) || ''),
      lastError: String(p.getProperty(RELEASIT.PROP_LAST_ERROR) || ''),
      missing: report.missing
    },
    shopify: api_shopifyStatus()
  };
}

function menuReleasitTransfer() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('Releasit', api_releasitTransfer().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Releasit : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuReleasitCheck() {
  var ui = SpreadsheetApp.getUi();
  var r = releasitColumnsReport_();
  if (!r.found) { ui.alert('Releasit', releasitMessage_(r), ui.ButtonSet.OK); return; }
  var text = 'Colonnes reconnues :\n' + (r.recognized.length ? r.recognized.map(function (c) {
    return '• ' + c.title + ' → ' + c.target;
  }).join('\n') : '(aucune)');
  if (r.missing.length) text += '\n\nInformations absentes : ' + r.missing.join(', ') + '.';
  if (r.unknown.length) text += '\n\nColonnes non utilisées : ' + r.unknown.join(', ') + '.';
  var running = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'transferReleasitOrders'; });
  text += running ? '\n\nTransfert automatique : actif (chaque minute).'
    : '\n\nTransfert automatique : pas encore actif. Lancez « Installer / réparer le classeur ».';
  ui.alert('Releasit', text, ui.ButtonSet.OK);
}

/* ======================= Rules.gs ======================= */

/**
 * Rules.gs : ce qu'on peut faire d'une commande selon son étape,
 * l'annulation d'un colis Ecotrack, et la corbeille.
 *
 * Étapes :
 *  1. queue      en confirmation (À confirmer, Pas de réponse, Rappeler, Injoignable) : tout est modifiable ;
 *  2. confirmed  confirmée, pas encore envoyée : tout est modifiable ;
 *  3. parcel     colis créé chez Ecotrack, pas encore validé : verrouillée, sauf les notes.
 *                « Annuler le colis » le supprime chez Ecotrack et déverrouille la commande ;
 *  4. shipping   expédiée ou en livraison : verrouillée ; pour Ecotrack, le statut vient d'Ecotrack ;
 *  5. done       livrée, retour ou annulée : lecture seule (une commande annulée avant
 *                l'envoi peut être remise « À confirmer »).
 * Un administrateur (onglet Équipe) peut déverrouiller une commande en donnant un motif.
 */

var STAGE = { QUEUE: 'queue', CONFIRMED: 'confirmed', PARCEL: 'parcel', SHIPPING: 'shipping', DONE: 'done' };

var TRASH = {
  SHEET: 'Corbeille',
  EXTRA: ['Supprimée le', 'Supprimée par', 'Motif de suppression']
};

function hasEcotrackParcel_(o) {
  return String(o.carrier) === ECO.NAME && !isBlank_(o.tracking);
}

function orderStage_(o) {
  var s = String(o.status || '');
  if (s === STATUS.DELIVERED || s === STATUS.RETURNED || s === STATUS.CANCELLED) return STAGE.DONE;
  if (s === STATUS.SHIPPED || s === STATUS.IN_DELIVERY) return STAGE.SHIPPING;
  if (hasEcotrackParcel_(o)) return STAGE.PARCEL;
  return s === STATUS.CONFIRMED ? STAGE.CONFIRMED : STAGE.QUEUE;
}

function isLockedStage_(stage) {
  return stage === STAGE.PARCEL || stage === STAGE.SHIPPING || stage === STAGE.DONE;
}

/** Rôle « Administrateur » (ou « Admin ») dans l'onglet Équipe. */
function isAdmin_(user) {
  return /^admin/.test(normalizeText_(user && user.role));
}

function stamp_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM/yyyy à HH:mm');
}

/**
 * Ce qui est permis pour cette commande : verrou, motif affiché, statuts
 * possibles, et boutons (annuler le colis, remettre à confirmer, supprimer, déverrouiller).
 */
function orderRules_(o, user, settings) {
  var stage = orderStage_(o);
  var status = String(o.status || '');
  var admin = isAdmin_(user);
  var carrier = String(o.carrier || (settings && settings.SOCIETE_PAR_DEFAUT) || '');
  var manualCarrier = carrier !== ECO.NAME; // société sans API : les statuts de livraison se saisissent à la main
  var allowed = [status];
  var reason = '';

  if (stage === STAGE.QUEUE || stage === STAGE.CONFIRMED) {
    allowed = STATUS_LIST.filter(function (s) { return manualCarrier || SHIPPED_STATUSES.indexOf(s) < 0; });
  } else if (stage === STAGE.PARCEL) {
    var since = toDate_(o.carrierMoved);
    reason = 'Colis créé chez Ecotrack' + (since ? ' le ' + stamp_(since) : '') + ' (n° ' + o.tracking + ') : la commande est verrouillée. ' +
      'Pour la modifier ou l’annuler, annulez d’abord le colis.';
  } else if (stage === STAGE.SHIPPING) {
    if (hasEcotrackParcel_(o)) {
      reason = 'Colis validé et en route : la commande ne peut plus être modifiée. Son statut est mis à jour par Ecotrack.';
    } else {
      reason = 'Commande expédiée : elle ne peut plus être modifiée. Mettez à jour son statut quand le livreur vous informe.';
      allowed = SHIPPED_STATUSES.filter(function (s) { return STATUS_RANK_[s] >= STATUS_RANK_[status]; });
    }
  } else {
    reason = status === STATUS.DELIVERED ? 'Commande livrée : elle ne peut plus être modifiée.'
      : status === STATUS.RETURNED ? 'Commande retournée : elle ne peut plus être modifiée.'
      : 'Commande annulée : elle ne peut plus être modifiée.';
  }

  var canReopen = status === STATUS.CANCELLED && isBlank_(o.tracking);
  if (canReopen) {
    allowed = [STATUS.CANCELLED, STATUS.TO_CONFIRM];
    reason += ' Si le client la veut finalement, remettez-la « À confirmer ».';
  }
  var locked = isLockedStage_(stage);
  var neverSent = isBlank_(o.tracking) && SHIPPED_STATUSES.indexOf(status) < 0;
  return {
    stage: stage,
    locked: locked,
    reason: reason,
    statuses: STATUS_LIST.filter(function (s) { return allowed.indexOf(s) >= 0; }),
    canCancelParcel: stage === STAGE.PARCEL,
    canReopen: canReopen,
    canDelete: admin && neverSent,
    canUnlock: admin && locked,
    admin: admin
  };
}

/** Message quand un statut n'est pas permis. */
function statusRefusal_(o, rules, wanted) {
  if (rules.stage === STAGE.PARCEL) return 'Colis créé chez Ecotrack : annulez d’abord le colis pour changer le statut.';
  if (rules.stage === STAGE.SHIPPING && hasEcotrackParcel_(o)) return 'Le statut de ce colis est mis à jour par Ecotrack : il ne se change pas à la main.';
  if (rules.stage === STAGE.SHIPPING) return 'Une commande expédiée ne peut pas revenir à « ' + wanted + ' ».';
  if (rules.stage === STAGE.DONE) return rules.reason;
  return 'Avec Ecotrack, le statut « ' + wanted + ' » arrive tout seul : créez le colis depuis la page Expéditions.';
}

/* ------------------------------------------------------------------ */
/* Annuler un colis Ecotrack (avant sa validation)                    */
/* ------------------------------------------------------------------ */

/**
 * Supprime le colis chez Ecotrack (possible tant que l'expédition n'est pas
 * validée), puis efface le n° de suivi : la commande redevient « Confirmée »,
 * modifiable, et peut être renvoyée depuis la page Expéditions.
 */
function cancelParcel_(id, user) {
  var tracking = withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (orderStage_(o) !== STAGE.PARCEL) throw new Error('La commande ' + id + ' n’a pas de colis Ecotrack en attente de validation.');
    return String(o.tracking).trim();
  });

  var res = ecotrackCall_('DELETE', '/api/v1/delete/order', { query: { tracking: tracking } });
  if (!res.ok) throw ecotrackFail_(res);
  var json = res.json || {};
  if (json.success === false || json.error) {
    var detail = flattenEcotrackErrors_(json.error || json.errors) || String(json.message || '');
    throw new Error('Ecotrack refuse d’annuler le colis ' + tracking + (detail ? ' (' + detail + ')' : '') + '. ' +
      'S’il est déjà validé, il ne peut plus être annulé depuis l’outil : faites une demande de retour chez Ecotrack.');
  }

  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (String(o.tracking).trim() === tracking) {
      writeFields_(ctx, o, { tracking: '', carrierStatus: '', carrierMoved: '', paymentId: '', followUp: '', updated: new Date() });
    }
    log_(user, o.id, 'Colis annulé', 'Colis ' + tracking + ' supprimé chez Ecotrack · la commande redevient modifiable');
    return { order: serializeOrder_(o), message: 'Colis ' + tracking + ' annulé chez Ecotrack. La commande ' + o.id + ' est de nouveau modifiable.' };
  });
}

function api_cancelParcel(id) {
  return cancelParcel_(String(id), currentUser_());
}

/* ------------------------------------------------------------------ */
/* Corbeille                                                          */
/* ------------------------------------------------------------------ */

/** N° des commandes à la corbeille : les importations ne les recréent pas. */
function trashIds_() {
  var set = {};
  var sh = ss_().getSheetByName(TRASH.SHEET);
  if (!sh || sh.getLastRow() < 2) return set;
  var map = headerMap_(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
  if (map.id === undefined) return set;
  sh.getRange(2, map.id + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
    var id = String(r[0]).trim();
    if (id) set[id] = true;
  });
  return set;
}

/**
 * Met une commande à la corbeille (administrateur, avant tout envoi à une
 * société de livraison). La ligne est déplacée dans l'onglet Corbeille.
 */
function api_deleteOrder(id, reason) {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Seul un administrateur (onglet Équipe) peut supprimer une commande.');
  var why = String(reason == null ? '' : reason).trim();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (!orderRules_(o, user, null).canDelete) {
      throw new Error('Une commande envoyée à une société de livraison ne peut pas être supprimée. Annulez-la, ou annulez d’abord son colis.');
    }
    var titles = ctx.sheet.getRange(1, 1, 1, ctx.width).getValues()[0];
    var values = ctx.sheet.getRange(o._row, 1, 1, ctx.width).getValues()[0];
    var sh = ss_().getSheetByName(TRASH.SHEET) || ss_().insertSheet(TRASH.SHEET);
    ensureHeaders_(sh, titles.map(function (t) { return String(t).trim(); }).filter(function (t) { return t; }).concat(TRASH.EXTRA));
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

    var byTitle = {};
    titles.forEach(function (t, i) {
      var k = normalizeText_(t);
      if (k && byTitle[k] === undefined) byTitle[k] = values[i];
    });
    byTitle[normalizeText_(TRASH.EXTRA[0])] = new Date();
    byTitle[normalizeText_(TRASH.EXTRA[1])] = user.name;
    byTitle[normalizeText_(TRASH.EXTRA[2])] = why;
    var row = header.map(function (t) {
      var v = byTitle[normalizeText_(t)];
      return v === undefined ? '' : v;
    });
    var r = sh.getLastRow() + 1;
    var tmap = headerMap_(header);
    TEXT_KEYS_.forEach(function (k) { if (tmap[k] !== undefined) sh.getRange(r, tmap[k] + 1).setNumberFormat('@'); });
    sh.getRange(r, 1, 1, row.length).setValues([row]);
    ctx.sheet.deleteRow(o._row);
    log_(user, o.id, 'Suppression', 'Mise à la corbeille' + (why ? ' · Motif : ' + why : ''));
    return { id: String(o.id), message: 'Commande ' + o.id + ' mise à la corbeille.' };
  });
}

/** Remet une commande de la corbeille dans l'onglet Commandes (administrateur). */
function api_restoreOrder(id) {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Seul un administrateur (onglet Équipe) peut restaurer une commande.');
  var key = String(id == null ? '' : id).trim();
  return withLock_(function () {
    var sh = ss_().getSheetByName(TRASH.SHEET);
    if (!sh || sh.getLastRow() < 2) throw new Error('La corbeille est vide.');
    var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var map = headerMap_(values[0]);
    var found = -1;
    for (var r = values.length - 1; r >= 1 && map.id !== undefined; r--) {
      if (String(values[r][map.id]).trim() === key) { found = r; break; }
    }
    if (found < 0) throw new Error('Commande ' + key + ' absente de la corbeille.');
    var ctx = readOrders_();
    if (findOrder_(ctx, key)) throw new Error('La commande ' + key + ' est déjà dans l’onglet Commandes.');
    var o = {};
    ORDER_COLUMNS.forEach(function (c) { o[c.key] = map[c.key] === undefined ? '' : values[found][map[c.key]]; });
    appendOrders_(ctx, [o]);
    sh.deleteRow(found + 1);
    log_(user, key, 'Restauration', 'Sortie de la corbeille');
    return { id: key, message: 'Commande ' + key + ' remise dans l’onglet Commandes.' };
  });
}

function menuTrashRestore() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.prompt('Corbeille', 'N° de la commande à remettre dans l’onglet Commandes (par exemple #1038) :', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  try {
    ui.alert('Corbeille', api_restoreOrder(answer.getResponseText()).message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Corbeille : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
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
  var ui = SpreadsheetApp.getUi();
  ui.createMenu(APP_NAME)
    .addItem('Ouvrir l’application', 'menuOpenApp')
    .addSeparator()
    .addItem('Traiter les nouvelles commandes', 'menuProcess')
    .addItem('Recalculer les alertes clients', 'menuRecalc')
    .addItem('Restaurer une commande de la corbeille', 'menuTrashRestore')
    .addSeparator()
    .addSubMenu(ui.createMenu('Releasit')
      .addItem('Transférer les commandes maintenant', 'menuReleasitTransfer')
      .addItem('Vérifier les colonnes de l’onglet RELEASIT', 'menuReleasitCheck'))
    .addSubMenu(ui.createMenu('Shopify')
      .addItem('Enregistrer la boutique et l’accès', 'menuShopifySetup')
      .addItem('Tester la connexion', 'menuShopifyTest')
      .addItem('Importer les commandes maintenant', 'menuShopifyImport'))
    .addSubMenu(ui.createMenu('Ecotrack')
      .addItem('Enregistrer l’adresse et le jeton', 'menuEcotrackSetup')
      .addItem('Tester la connexion', 'menuEcotrackTest')
      .addItem('Récupérer les tarifs', 'menuEcotrackFees')
      .addItem('Mettre à jour les statuts des colis', 'menuEcotrackStatuses'))
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
      unreachable: ctx.orders.filter(has([STATUS.UNREACHABLE])).length,
      parcelAlerts: trackingAlerts_(ctx.orders, getSettings_(), now).filter(function (a) { return a.level !== 'info'; }).length
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
  var rules = orderRules_(o, currentUser_(), env.settings);
  return {
    order: serializeOrder_(o),
    rules: rules,
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

/**
 * Modifie une commande depuis la page Commandes (y compris son statut).
 * Une commande verrouillée (colis créé, expédiée, terminée : voir Rules.gs)
 * n'accepte que ses notes et les statuts permis, sauf déverrouillage par un
 * administrateur : input.force = true et input.forceReason = motif.
 */
function api_updateOrder(id, input) {
  input = input || {};
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    var env = makeEnv_(ctx);
    var user = currentUser_();
    var rules = orderRules_(o, user, env.settings);
    var force = input.force === true || input.force === 'true';
    var why = String(input.forceReason || '').trim();
    if (force && !rules.admin) throw new Error('Seul un administrateur (onglet Équipe) peut modifier une commande verrouillée.');
    if (force && !why) throw new Error('Indiquez le motif du déverrouillage.');

    var edits = pickEdits_(input);
    var f;
    if (rules.locked && !force) {
      // Seules les notes changent ; toute autre modification est refusée.
      var others = {};
      Object.keys(edits).forEach(function (k) { if (k !== 'notes') others[k] = edits[k]; });
      var tried = applyEdits_(o, others, env, true);
      if (Object.keys(tried).some(function (k) { return Object.prototype.hasOwnProperty.call(others, k); })) throw new Error(rules.reason);
      f = {};
      if (Object.prototype.hasOwnProperty.call(edits, 'notes')) {
        var notes = String(edits.notes == null ? '' : edits.notes).trim();
        if (notes !== String(o.notes)) f.notes = notes;
      }
    } else {
      f = applyEdits_(o, edits, env, true);
    }
    var changes = [];

    if (input.status && input.status !== o.status) {
      if (STATUS_LIST.indexOf(input.status) < 0) throw new Error('Statut inconnu : ' + input.status);
      // Statuts permis ; la société choisie dans le même enregistrement compte.
      var target = {};
      Object.keys(o).forEach(function (k) { target[k] = o[k]; });
      if (f.carrier !== undefined) target.carrier = f.carrier;
      var targetRules = orderRules_(target, user, env.settings);
      if (!force && targetRules.statuses.indexOf(input.status) < 0) throw new Error(statusRefusal_(target, targetRules, input.status));
      f.status = input.status;
      if (QUEUE_STATUSES.indexOf(input.status) < 0) f.callback = '';
      changes.push('Statut : ' + (o.status || '—') + ' → ' + input.status);
    }
    var finalStatus = f.status || o.status;
    if (finalStatus === STATUS.CANCELLED) {
      var reason = String(input.cancelReason || o.cancelReason || 'Autre');
      if (reason !== String(o.cancelReason)) f.cancelReason = reason;
    } else if (o.status === STATUS.CANCELLED && !isBlank_(o.cancelReason)) {
      f.cancelReason = ''; // commande remise « À confirmer »
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
    if (force) log_(user, o.id, 'Déverrouillage', 'Motif : ' + why + ' · ' + changes.join(' · '));
    else log_(user, o.id, 'Modification', changes.join(' · '));
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
  ['date', 'callback', 'updated', 'carrierMoved', 'followUp'].forEach(function (k) { range(k).setNumberFormat('dd/MM/yyyy HH:mm'); });
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

/**
 * Déclencheurs automatiques :
 *  - transfert des commandes de l'onglet RELEASIT chaque minute (si l'onglet existe) ;
 *  - importation Shopify toutes les 5 minutes (seulement si Shopify est configuré) ;
 *  - traitement des nouvelles lignes toutes les 5 minutes ;
 *  - suivi des colis Ecotrack toutes les 30 minutes (sans effet tant qu'Ecotrack n'est pas configuré).
 * Google limite le temps de calcul quotidien : rien n'est lancé inutilement.
 */
function installTriggers_() {
  var handlers = ['processNewRows', 'syncEcotrackStatuses', 'importShopifyOrders', 'transferReleasitOrders'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  if (ss_().getSheetByName(RELEASIT.SHEET)) ScriptApp.newTrigger('transferReleasitOrders').timeBased().everyMinutes(1).create();
  if (shopifyConfig_().configured) ScriptApp.newTrigger('importShopifyOrders').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('processNewRows').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('syncEcotrackStatuses').timeBased().everyMinutes(30).create();
}

/* ======================= Pages HTML ======================= */

var HTML_FILES_ = {
  Index: "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap\" rel=\"stylesheet\">\n  <?!= include('Styles'); ?>\n</head>\n<body>\n  <div class=\"app\">\n    <aside class=\"sidebar\" aria-label=\"Navigation principale\">\n      <div class=\"brand\">\n        <span class=\"brand-name\" data-shop>DZ Smart Shop</span>\n        <span class=\"brand-sub\">Gestion des commandes COD</span>\n      </div>\n      <nav class=\"nav\">\n        <a href=\"#/tableau\" data-route=\"tableau\">Tableau de bord</a>\n        <a href=\"#/commandes\" data-route=\"commandes\">Commandes</a>\n        <a href=\"#/confirmation\" data-route=\"confirmation\">Confirmation <span class=\"badge\" data-queue-count hidden></span></a>\n        <a href=\"#/expeditions\" data-route=\"expeditions\">Expéditions</a>\n        <a href=\"#/suivi\" data-route=\"suivi\">Suivi <span class=\"badge\" data-alert-count hidden></span></a>\n      </nav>\n      <div class=\"side-user\">\n        <span class=\"side-user-name\" data-user-name></span>\n        <span class=\"side-user-mail\" data-user-mail></span>\n      </div>\n    </aside>\n\n    <div class=\"main\">\n      <header class=\"mobile-top\">\n        <span class=\"brand-name\" data-shop>DZ Smart Shop</span>\n        <span class=\"mobile-user\" data-user-name></span>\n      </header>\n      <main id=\"view\" class=\"content\" tabindex=\"-1\">\n        <p class=\"loading\">Chargement…</p>\n      </main>\n    </div>\n  </div>\n\n  <nav class=\"bottom-nav\" aria-label=\"Navigation\">\n    <a href=\"#/tableau\" data-route=\"tableau\">Tableau</a>\n    <a href=\"#/commandes\" data-route=\"commandes\">Commandes</a>\n    <a href=\"#/confirmation\" data-route=\"confirmation\">Confirmer <span class=\"badge\" data-queue-count hidden></span></a>\n    <a href=\"#/expeditions\" data-route=\"expeditions\">Expédier</a>\n    <a href=\"#/suivi\" data-route=\"suivi\">Suivi <span class=\"badge\" data-alert-count hidden></span></a>\n  </nav>\n\n  <div id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n  <div id=\"modal-root\"></div>\n\n  <?!= include('App'); ?>\n</body>\n</html>\n",
  Styles: "<style>\n  :root {\n    --bg: #F4F5F7;\n    --surface: #FFFFFF;\n    --ink: #15181E;\n    --ink-2: #3D4350;\n    --muted: #5B6270;\n    --line: #E2E5EA;\n    --line-2: #CFD4DB;\n    --soft: #F8F9FA;\n    --brand: #0B6B4C;\n    --brand-dark: #084F38;\n    --side: #10241C;\n    --side-ink: #D5E2DC;\n    --side-muted: #A9C2B7;\n    --side-active: #1F4A39;\n    --accent: #F2B25C;\n    --radius: 12px;\n    --font: Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n    --font-title: \"Space Grotesk\", Inter, system-ui, sans-serif;\n  }\n  * { box-sizing: border-box; }\n  html, body { margin: 0; background: var(--bg); color: var(--ink); font: 400 14px/1.45 var(--font); }\n  h1, h2, h3, p { margin: 0; }\n  h1 { font: 700 26px/1.2 var(--font-title); }\n  h2 { font-size: 16px; font-weight: 600; }\n  h3 { font-size: 15px; font-weight: 600; }\n  button, input, select, textarea { font: inherit; color: inherit; }\n  a { color: var(--brand); }\n  [hidden] { display: none !important; }\n  :focus-visible { outline: 3px solid #7FB8A2; outline-offset: 2px; }\n\n  /* Structure */\n  .app { display: flex; min-height: 100vh; }\n  .sidebar {\n    width: 232px; flex: 0 0 232px; background: var(--side); padding: 22px 14px;\n    display: flex; flex-direction: column; gap: 4px; position: sticky; top: 0; height: 100vh;\n  }\n  .brand { display: flex; flex-direction: column; gap: 2px; padding: 0 12px 22px; }\n  .brand-name { font: 700 19px var(--font-title); color: #FFFFFF; }\n  .brand-sub { font-size: 12px; color: var(--side-muted); }\n  .nav { display: flex; flex-direction: column; gap: 4px; }\n  .nav a {\n    display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 12px;\n    border-radius: 8px; color: var(--side-ink); text-decoration: none; font-weight: 500;\n  }\n  .nav a:hover { background: #18352A; }\n  .nav a.active { background: var(--side-active); color: #FFFFFF; font-weight: 600; }\n  .badge { background: var(--accent); color: var(--side); font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }\n  .side-user { margin-top: auto; padding: 12px; border-top: 1px solid #2A4A3D; display: flex; flex-direction: column; gap: 2px; }\n  .side-user-name { color: #FFFFFF; font-weight: 600; }\n  .side-user-mail { color: var(--side-muted); font-size: 12px; overflow-wrap: anywhere; }\n  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }\n  .mobile-top { display: none; }\n  .content { padding: 26px 30px 60px; outline: none; }\n  .bottom-nav { display: none; }\n\n  /* Éléments communs */\n  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 18px; }\n  .sub { color: var(--muted); margin-top: 4px; }\n  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }\n  .card > h2, .card > h3 { margin-bottom: 12px; }\n  .stack { display: flex; flex-direction: column; gap: 16px; }\n  .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }\n  .row > * { flex: 1 1 340px; min-width: 0; }\n  .grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }\n  .kpi { display: flex; flex-direction: column; gap: 6px; }\n  .kpi .label { color: var(--muted); font-size: 13px; font-weight: 500; }\n  .kpi .value { font: 700 28px/1.1 var(--font-title); }\n  .kpi .note { color: var(--muted); font-size: 13px; }\n  .small { font-size: 12px; color: var(--muted); }\n  .muted { color: var(--muted); }\n  .strong { font-weight: 600; }\n  .loading, .empty { color: var(--muted); padding: 36px 0; text-align: center; }\n  .error-box { background: #FBE7E7; color: #A12626; border-radius: 10px; padding: 14px 16px; font-weight: 600; }\n\n  .btn {\n    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px;\n    border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink);\n    font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap;\n  }\n  .btn:hover { background: var(--soft); }\n  .btn.primary { background: var(--brand); border-color: var(--brand); color: #FFFFFF; }\n  .btn.primary:hover { background: var(--brand-dark); }\n  .btn.warn { background: #FFF3DC; border-color: #E8B45C; color: #8A5200; }\n  .btn.danger { background: #FBE7E7; border-color: #E7B4B4; color: #A12626; }\n  .btn.ghost { border-style: dashed; color: var(--brand); border-color: var(--brand); }\n  .btn.big { min-height: 52px; font-size: 15px; }\n  .btn[disabled], .btn[aria-disabled=\"true\"] { opacity: .5; cursor: default; pointer-events: none; }\n\n  .seg { display: inline-flex; gap: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 4px; }\n  .seg button { min-height: 38px; padding: 0 14px; border: 0; border-radius: 7px; background: transparent; font-weight: 500; color: var(--ink-2); cursor: pointer; }\n  .seg button[aria-pressed=\"true\"] { background: var(--brand); color: #FFFFFF; font-weight: 600; }\n\n  .chips { display: flex; flex-wrap: wrap; gap: 8px; }\n  .chip { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink-2); font-weight: 500; cursor: pointer; }\n  .chip[aria-pressed=\"true\"] { background: var(--ink); border-color: var(--ink); color: #FFFFFF; font-weight: 600; }\n\n  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }\n\n  .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted); min-width: 0; }\n  .field input, .field select, .field textarea {\n    min-height: 44px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface);\n    font-size: 14px; font-weight: 400; color: var(--ink); width: 100%;\n  }\n  .field textarea { padding: 10px 12px; min-height: 70px; resize: vertical; }\n  .field input:disabled, .field select:disabled, .field textarea:disabled {\n    background: #F1F2F4; border-color: var(--line); color: #5B6270; cursor: not-allowed; opacity: 1; -webkit-text-fill-color: #5B6270;\n  }\n  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }\n  .form-grid .full { grid-column: 1 / -1; }\n\n  .filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 14px 0; }\n  .filters .field { flex: 1 1 170px; }\n  .filters .field.wide { flex: 2 1 260px; }\n\n  /* Tableaux */\n  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }\n  table.data { width: 100%; border-collapse: collapse; }\n  table.data th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--soft); padding: 11px 10px; font-weight: 600; white-space: nowrap; }\n  table.data td { padding: 11px 10px; border-top: 1px solid #EEF0F3; vertical-align: top; }\n  table.data td.num { text-align: right; white-space: nowrap; }\n  table.data tbody tr.clickable { cursor: pointer; }\n  table.data tbody tr.clickable:hover td { background: #FAFBFC; }\n  .link-btn { background: none; border: 0; padding: 0; color: var(--ink); font-weight: 600; cursor: pointer; text-align: left; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }\n\n  /* Tableau de bord */\n  .funnel { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }\n  .funnel div { border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }\n  .funnel .n { font: 700 24px var(--font-title); }\n  .todo { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-top: 1px solid #EEF0F3; }\n  .todo:first-of-type { border-top: 0; }\n  .todo .n { min-width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font: 700 18px var(--font-title); }\n  .todo .t { flex: 1 1 auto; }\n  .bars { display: flex; flex-direction: column; gap: 12px; }\n  .bar-row { display: grid; grid-template-columns: minmax(110px, 160px) minmax(0, 1fr) 56px; gap: 12px; align-items: center; font-size: 13px; }\n  .bar { height: 10px; background: #EEF0F3; border-radius: 999px; overflow: hidden; }\n  .bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); }\n  .bar span.low { background: #C2620A; }\n\n  /* Centre de confirmation */\n  .stats { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; }\n  .stats span { padding: 8px 12px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); }\n  .confirm { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }\n  .queue { flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 150px); overflow: auto; padding: 2px; }\n  .queue-title { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 6px; }\n  .q-item { width: 100%; text-align: left; padding: 13px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; display: flex; flex-direction: column; gap: 6px; }\n  .q-item[aria-current=\"true\"] { border: 2px solid var(--brand); padding: 12px; }\n  .q-top { display: flex; justify-content: space-between; gap: 8px; }\n  .q-tags { display: flex; flex-wrap: wrap; gap: 6px; }\n  .detail { flex: 3 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }\n  .detail-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }\n  .detail-head h2 { font: 700 22px var(--font-title); }\n  .lock-box { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: #EEF0F3; color: #2A2F3A; border-radius: 10px; padding: 12px 14px; margin: 12px 0 4px; }\n  .lock-box p { flex: 1 1 260px; margin: 0; font-weight: 600; }\n  .lock-box.warn { background: #FFF3DC; color: #6B4100; }\n  .lock-icon { font-size: 12px; }\n  .history { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; }\n  .sum { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; margin-top: 14px; border-top: 1px solid #EEF0F3; }\n  .sum div { display: flex; justify-content: space-between; gap: 12px; }\n  .sum .total { font-size: 16px; font-weight: 700; }\n  .outcomes { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }\n  .panel { margin-top: 12px; padding: 14px; border-radius: 10px; background: var(--soft); display: flex; flex-direction: column; gap: 12px; }\n  .quick { display: flex; flex-wrap: wrap; gap: 8px; }\n  .message { padding: 14px; border-radius: 10px; background: var(--soft); line-height: 1.55; white-space: pre-wrap; }\n  .queue-toggle { display: none; }\n  .check { width: 20px; height: 20px; }\n  .problems { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #A12626; }\n  .result-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid #EEF0F3; }\n  .result-row:first-of-type { border-top: 0; }\n  .result-row .grow { flex: 1 1 240px; min-width: 0; }\n  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }\n  .timeline { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 0; }\n  .timeline li { display: flex; gap: 14px; padding: 10px 0 10px 22px; position: relative; border-top: 1px solid #EEF0F3; }\n  .timeline li:first-child { border-top: 0; }\n  .timeline li::before { content: \"\"; position: absolute; left: 2px; top: 16px; width: 10px; height: 10px; border-radius: 999px; background: var(--brand); }\n  .timeline .t-date { flex: 0 0 110px; color: var(--muted); font-size: 13px; }\n  .timeline .t-body { flex: 1 1 auto; min-width: 0; }\n\n  /* Fenêtre (modale) */\n  .modal-backdrop { position: fixed; inset: 0; background: rgba(16, 24, 28, .45); display: flex; align-items: flex-start; justify-content: center; padding: 32px 16px; overflow: auto; z-index: 50; }\n  .modal { background: var(--surface); border-radius: 14px; width: 100%; max-width: 760px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }\n  .modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }\n  .modal-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }\n  .icon-btn { min-width: 44px; min-height: 44px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); cursor: pointer; font-size: 20px; line-height: 1; }\n\n  #toast {\n    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 60; max-width: calc(100% - 32px);\n    background: var(--ink); color: #FFFFFF; padding: 12px 18px; border-radius: 10px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,.18);\n    opacity: 0; pointer-events: none; transition: opacity .2s;\n  }\n  #toast.show { opacity: 1; }\n  #toast.error { background: #A12626; }\n\n  @media (max-width: 860px) {\n    .sidebar { display: none; }\n    .mobile-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--side); padding: 14px 16px; position: sticky; top: 0; z-index: 30; }\n    .mobile-user { color: var(--side-muted); font-size: 13px; }\n    .content { padding: 16px 14px 96px; }\n    h1 { font-size: 22px; }\n    .bottom-nav {\n      display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;\n      background: var(--side); padding: 6px 6px calc(6px + env(safe-area-inset-bottom));\n    }\n    .bottom-nav a { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 4px; color: var(--side-ink); text-decoration: none; font-size: 11.5px; font-weight: 600; border-radius: 10px; padding: 0 1px; }\n    .bottom-nav .badge { font-size: 11px; padding: 0 6px; }\n    .timeline .t-date { flex-basis: 84px; }\n    .bottom-nav a.active { background: var(--side-active); color: #FFFFFF; }\n    #toast { bottom: 84px; }\n    .queue { max-height: none; }\n    .queue:not(.open) { display: none; }\n    .queue-toggle { display: inline-flex; }\n    .stats { display: none; }\n    table.cards thead { display: none; }\n    table.cards tr { display: block; padding: 10px 12px; border-top: 1px solid #EEF0F3; }\n    table.cards tbody tr:first-child { border-top: 0; }\n    table.cards td { display: flex; justify-content: space-between; gap: 12px; border: 0; padding: 3px 0; text-align: right; }\n    table.cards td::before { content: attr(data-label); color: var(--muted); font-size: 12px; text-align: left; }\n    table.cards td.num { text-align: right; }\n    table.cards td.multi { display: block; text-align: right; }\n    table.cards td.multi::before { display: block; text-align: left; margin-bottom: 2px; }\n    .modal-backdrop { padding: 0; }\n    .modal { border-radius: 0; min-height: 100%; }\n  }\n</style>\n",
  App: "<script>\n(function () {\n  'use strict';\n\n  /* ================================================================ */\n  /* État et outils                                                   */\n  /* ================================================================ */\n\n  var S = {\n    boot: null,\n    route: '',\n    period: '7',\n    filter: { status: 'all', q: '', wilaya: '', period: '30', limit: 100 },\n    queue: null,\n    currentId: null,\n    current: null,\n    busy: false,\n    token: 0,\n    detailToken: 0,\n    ship: { data: null, tab: 'toship', selected: {}, busy: false, results: null },\n    track: { data: null, days: 30, filter: 'all' },\n    order: null,      // dernière commande affichée dans la fenêtre (pour la réafficher)\n    unlockId: null    // commande déverrouillée par un administrateur\n  };\n  var TZ = 'Africa/Algiers';\n  var ALERT = {\n    bad: { bg: '#FBE7E7', fg: '#A12626' },\n    warn: { bg: '#FCEBDD', fg: '#9A4200' },\n    ok: { bg: '#DDF0E4', fg: '#146C2E' },\n    'new': { bg: '#E6EEFB', fg: '#1E4FA8' }\n  };\n  var view = document.getElementById('view');\n\n  /** Appelle une fonction du serveur (Api.gs) et renvoie une promesse. */\n  function call(fn) {\n    var args = Array.prototype.slice.call(arguments, 1);\n    return new Promise(function (resolve, reject) {\n      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);\n      runner[fn].apply(runner, args);\n    });\n  }\n\n  function $(sel, root) { return (root || document).querySelector(sel); }\n  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }\n\n  function h(value) {\n    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"']/g, function (c) {\n      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c];\n    });\n  }\n  function errText(e) { return (e && e.message) ? e.message : String(e || 'Erreur inconnue'); }\n  function errorBox(e) { return '<div class=\"error-box\" role=\"alert\">' + h(errText(e)) + '</div>'; }\n\n  function money(n) {\n    var v = Math.round(Number(n) || 0);\n    return String(v).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ') + ' DA';\n  }\n  function pct(a, b) { return b ? Math.round(a / b * 100) + ' %' : '—'; }\n  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }\n\n  function fmtDate(iso, withDay) {\n    if (!iso) return '—';\n    var d = new Date(iso);\n    var o = { timeZone: TZ, hour: '2-digit', minute: '2-digit' };\n    if (withDay !== false) { o.day = '2-digit'; o.month = '2-digit'; }\n    try { return d.toLocaleString('fr-FR', o); } catch (e) { return d.toLocaleString('fr-FR'); }\n  }\n  function ago(iso) {\n    if (!iso) return '';\n    var diff = Date.now() - new Date(iso).getTime();\n    var future = diff < 0;\n    var m = Math.round(Math.abs(diff) / 60000);\n    var txt = m < 1 ? 'à l’instant' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' j';\n    if (m < 1) return txt;\n    return future ? 'dans ' + txt : 'il y a ' + txt;\n  }\n  function fmtPhone(p) {\n    var s = String(p || '');\n    if (/^0\\d{9}$/.test(s)) return s.replace(/^(\\d{4})(\\d{2})(\\d{2})(\\d{2})$/, '$1 $2 $3 $4');\n    return s;\n  }\n  function wilayaName(w) { return String(w || '').replace(/^\\d+\\s*-\\s*/, ''); }\n\n  function pill(status) {\n    var st = (S.boot && S.boot.styles[status]) || { bg: '#EEF0F3', fg: '#3D4350' };\n    return '<span class=\"pill\" style=\"background:' + st.bg + ';color:' + st.fg + '\">' + h(status || '—') + '</span>';\n  }\n  function alertPill(text, level) {\n    if (!text) return '';\n    var st = ALERT[level] || ALERT['new'];\n    return '<span class=\"pill\" style=\"background:' + st.bg + ';color:' + st.fg + '\">' + h(text) + '</span>';\n  }\n\n  /** Liste d'options ; garde une valeur inconnue pour ne pas la perdre. */\n  function options(list, selected, emptyLabel) {\n    var out = emptyLabel !== undefined ? '<option value=\"\">' + h(emptyLabel) + '</option>' : '';\n    if (selected && list.indexOf(selected) < 0) out += '<option selected>' + h(selected) + '</option>';\n    return out + list.map(function (v) {\n      return '<option' + (v === selected ? ' selected' : '') + '>' + h(v) + '</option>';\n    }).join('');\n  }\n  function field(label, control, cls) {\n    return '<label class=\"field' + (cls ? ' ' + cls : '') + '\">' + h(label) + control + '</label>';\n  }\n  function input(name, value, attrs) {\n    return '<input name=\"' + name + '\" value=\"' + h(value) + '\"' + (attrs || '') + '>';\n  }\n  function readForm(root) {\n    var out = {};\n    $all('[name]', root).forEach(function (el) {\n      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;\n    });\n    return out;\n  }\n\n  var toastTimer = null;\n  function toast(msg, isError) {\n    var t = $('#toast');\n    t.textContent = msg;\n    t.className = 'show' + (isError ? ' error' : '');\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(function () { t.className = ''; }, isError ? 6000 : 3200);\n  }\n\n  /** Frais de livraison d'après l'onglet Tarifs, ou null. */\n  function feeFor(wilaya, carrier, mode) {\n    var code = parseInt(String(wilaya || ''), 10);\n    var r = S.boot.rates[code];\n    var c = carrier || S.boot.defaultCarrier;\n    if (r && r[c] && r[c][mode] !== undefined) return r[c][mode];\n    return null;\n  }\n\n  /* ================================================================ */\n  /* Navigation                                                       */\n  /* ================================================================ */\n\n  var ROUTES = ['tableau', 'commandes', 'confirmation', 'expeditions', 'suivi'];\n\n  function go() {\n    var r = (location.hash || '').replace(/^#\\/?/, '');\n    if (ROUTES.indexOf(r) < 0) r = 'tableau';\n    S.route = r;\n    $all('[data-route]').forEach(function (a) {\n      var on = a.getAttribute('data-route') === r;\n      a.classList.toggle('active', on);\n      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');\n    });\n    closeModal();\n    if (r === 'tableau') pageDashboard();\n    else if (r === 'commandes') pageOrders();\n    else if (r === 'expeditions') pageShipping();\n    else if (r === 'suivi') pageTracking();\n    else pageConfirm();\n    view.focus({ preventScroll: true });\n    window.scrollTo(0, 0);\n  }\n\n  function navigate(route, status) {\n    if (status) { S.filter.status = status; S.filter.limit = 100; }\n    if (location.hash === '#/' + route) go(); else location.hash = '#/' + route;\n  }\n\n  function setQueueCount(n) {\n    $all('[data-queue-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });\n  }\n  function setAlertCount(n) {\n    $all('[data-alert-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });\n  }\n  function refreshCount() {\n    call('api_counts').then(function (c) { setQueueCount(c.queue); setAlertCount(c.alerts); }).catch(function () {});\n  }\n\n  /* ================================================================ */\n  /* Tableau de bord                                                  */\n  /* ================================================================ */\n\n  function pageDashboard() {\n    var t = ++S.token;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 jours'], ['30', '30 jours'], ['all', 'Tout']];\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Tableau de bord</h1><p class=\"sub\">Vue d’ensemble de vos commandes COD</p></div>' +\n      '<div class=\"seg\" role=\"group\" aria-label=\"Période\">' + periods.map(function (p) {\n        return '<button type=\"button\" data-act=\"period\" data-period=\"' + p[0] + '\" aria-pressed=\"' + (S.period === p[0]) + '\">' + p[1] + '</button>';\n      }).join('') + '</div></div>' +\n      '<div id=\"dash\"><p class=\"loading\">Chargement…</p></div>';\n    call('api_dashboard', S.period).then(function (d) {\n      if (t === S.token) renderDashboard(d);\n    }).catch(function (e) {\n      if (t === S.token) $('#dash').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderDashboard(d) {\n    var st = S.boot.styles;\n    var kpis = [\n      ['Commandes reçues', d.received, plural(d.waiting, 'commande en attente', 'commandes en attente')],\n      ['Taux de confirmation', pct(d.confirmed, d.decided), d.confirmed + ' confirmées sur ' + d.decided + ' traitées'],\n      ['Taux de livraison', pct(d.delivered, d.delivered + d.returned), d.delivered + ' livrées · ' + d.returned + ' retours'],\n      ['Montant livré', money(d.revenueDelivered), 'Commandes livrées sur la période'],\n      ['Argent en route', money(d.inTransitAmount), plural(d.inTransitCount, 'colis pas encore livré', 'colis pas encore livrés')]\n    ];\n    var funnel = [\n      ['Reçues', d.received, '#EEF0F3', '#3D4350'],\n      ['Confirmées', d.confirmed, st['Confirmée'].bg, st['Confirmée'].fg],\n      ['Expédiées', d.shipped, st['Expédiée'].bg, st['Expédiée'].fg],\n      ['Livrées', d.delivered, st['Livrée'].bg, st['Livrée'].fg],\n      ['Retours', d.returned, st['Retour'].bg, st['Retour'].fg],\n      ['Annulées', d.cancelled, st['Annulée'].bg, st['Annulée'].fg]\n    ];\n    var todo = [\n      [d.todo.toConfirm, 'à appeler maintenant', 'confirmation', '', 'Confirmer', st['À confirmer']],\n      [d.todo.callbacksToday, 'rappels prévus plus tard aujourd’hui', 'confirmation', '', 'Voir', st['Rappeler']],\n      [d.todo.toShip, 'commandes confirmées à expédier', 'expeditions', '', 'Expédier', st['Confirmée']],\n      [d.todo.unreachable, 'clients injoignables', 'commandes', 'Injoignable', 'Voir', st['Injoignable']],\n      [d.todo.parcelAlerts, 'colis à traiter (suspendus, retours, sans mouvement…)', 'suivi', '', 'Suivi', st['Retour']]\n    ];\n\n    var html = '<div class=\"stack\">';\n    html += '<section class=\"grid-kpi\" aria-label=\"Chiffres clés\">' + kpis.map(function (k) {\n      return '<div class=\"card kpi\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + h(k[1]) + '</span><span class=\"note\">' + h(k[2]) + '</span></div>';\n    }).join('') + '</section>';\n\n    html += '<section class=\"card\"><h2>Parcours des commandes</h2><div class=\"funnel\">' + funnel.map(function (f) {\n      return '<div style=\"background:' + f[2] + ';color:' + f[3] + '\"><span class=\"strong\">' + f[0] + '</span><span class=\"n\">' + f[1] + '</span><span class=\"small\" style=\"color:' + f[3] + '\">' + (d.received ? pct(f[1], d.received) + ' des reçues' : 'aucune commande') + '</span></div>';\n    }).join('') + '</div></section>';\n\n    html += '<div class=\"row\">';\n    html += '<section class=\"card\"><h2>À faire</h2>' + todo.map(function (t) {\n      return '<div class=\"todo\"><span class=\"n\" style=\"background:' + t[5].bg + ';color:' + t[5].fg + '\">' + t[0] + '</span>' +\n        '<span class=\"t\">' + h(t[1]) + '</span>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"goto\" data-route=\"' + t[2] + '\" data-status=\"' + h(t[3]) + '\">' + t[4] + '</button></div>';\n    }).join('') + '</section>';\n\n    html += '<section class=\"card\"><h2>Taux de livraison par wilaya</h2>';\n    if (!d.byWilaya.length) {\n      html += '<p class=\"empty\">Pas encore de colis expédiés sur la période.</p>';\n    } else {\n      html += '<div class=\"bars\">' + d.byWilaya.map(function (w) {\n        var done = w.delivered + w.returned;\n        var rate = done ? Math.round(w.delivered / done * 100) : null;\n        return '<div class=\"bar-row\"><span>' + h(w.name) + '<br><span class=\"small\">' + plural(w.orders, 'colis', 'colis') + '</span></span>' +\n          '<span class=\"bar\" aria-hidden=\"true\"><span class=\"' + (rate !== null && rate < 70 ? 'low' : '') + '\" style=\"width:' + (rate || 0) + '%\"></span></span>' +\n          '<span class=\"strong\" style=\"text-align:right\">' + (rate === null ? '—' : rate + ' %') + '</span></div>';\n      }).join('') + '</div><p class=\"small\" style=\"margin-top:12px\">Orange : moins de 70 % livrés. « — » : aucun colis terminé.</p>';\n    }\n    html += '</section></div>';\n\n    html += '<div class=\"row\">';\n    html += '<section class=\"card\"><h2>Par confirmatrice</h2>' + (d.byAgent.length ? table(\n      ['Confirmatrice', 'Traitées', 'Confirmées', 'Taux'],\n      d.byAgent.map(function (a) { return [h(a.name), a.orders, a.confirmed, pct(a.confirmed, a.orders)]; }), [1, 2, 3]\n    ) : '<p class=\"empty\">Aucune commande traitée sur la période.</p>') + '</section>';\n    html += '<section class=\"card\"><h2>Par produit</h2>' + (d.byProduct.length ? table(\n      ['Produit', 'Commandes', 'Confirmées', 'Livrées', 'Retours'],\n      d.byProduct.map(function (p) { return [h(p.name), p.orders, p.confirmed, p.delivered, p.returned]; }), [1, 2, 3, 4]\n    ) : '<p class=\"empty\">Aucune commande sur la période.</p>') + '</section>';\n    html += '</div></div>';\n    $('#dash').innerHTML = html;\n  }\n\n  function table(head, rows, numCols) {\n    numCols = numCols || [];\n    return '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' + head.map(function (t) {\n      return '<th scope=\"col\">' + h(t) + '</th>';\n    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {\n      return '<tr>' + r.map(function (c, i) {\n        return '<td data-label=\"' + h(head[i]) + '\"' + (numCols.indexOf(i) >= 0 ? ' class=\"num\"' : '') + '>' + c + '</td>';\n      }).join('') + '</tr>';\n    }).join('') + '</tbody></table></div>';\n  }\n\n  /* ================================================================ */\n  /* Commandes                                                        */\n  /* ================================================================ */\n\n  function pageOrders() {\n    var f = S.filter;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 derniers jours'], ['30', '30 derniers jours'], ['all', 'Tout']];\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Commandes</h1><p class=\"sub\">Toutes les commandes du classeur. Cliquez sur une commande pour la modifier.</p></div>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"new-order\">+ Nouvelle commande</button></div>' +\n      '<div id=\"shop-status\"></div>' +\n      '<div class=\"chips\" id=\"chips\" role=\"group\" aria-label=\"Filtrer par statut\"></div>' +\n      '<div class=\"filters\">' +\n        field('Rechercher', '<input type=\"search\" id=\"f-q\" value=\"' + h(f.q) + '\" placeholder=\"Nom, téléphone, n° de commande ou de suivi\">', 'wide') +\n        field('Wilaya', '<select id=\"f-wilaya\">' + options(S.boot.wilayas, f.wilaya, 'Toutes les wilayas') + '</select>') +\n        field('Période', '<select id=\"f-period\">' + periods.map(function (p) {\n          return '<option value=\"' + p[0] + '\"' + (f.period === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';\n        }).join('') + '</select>') +\n      '</div>' +\n      '<div id=\"orders-list\"><p class=\"loading\">Chargement…</p></div>';\n    loadOrders();\n    loadShopStatus();\n    syncReleasit(function () { if (S.route === 'commandes') { loadOrders(); loadShopStatus(); } });\n  }\n\n  /* Arrivée automatique des commandes (Releasit, Shopify) : état, et transfert à la demande. */\n  function statusCard(inner) {\n    return '<div class=\"card\" style=\"display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px;padding:12px 16px\">' + inner + '</div>';\n  }\n\n  function loadShopStatus() {\n    call('api_importStatus').then(function (st) {\n      var box = $('#shop-status');\n      if (!box || S.route !== 'commandes') return;\n      var r = st.releasit;\n      var s = st.shopify;\n      var html = '';\n      if (r.found) {\n        html += statusCard('<span><strong>Releasit</strong> · ' + (r.lastRun ? 'dernière lecture ' + h(ago(r.lastRun)) : 'pas encore lu') +\n          ' · transfert automatique chaque minute</span>' +\n          '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"releasit-transfer\">Transférer maintenant</button>');\n        if (r.missing.length) {\n          html += '<div class=\"error-box\" role=\"alert\" style=\"margin-bottom:14px;background:#FFF3DC;color:#8A5200\">Onglet RELEASIT : colonne(s) absente(s) : ' +\n            h(r.missing.join(', ')) + '. Ajoutez-les dans les réglages Google Sheets de Releasit.</div>';\n        }\n        if (r.lastError) html += '<div style=\"margin-bottom:14px\">' + errorBox(r.lastError) + '</div>';\n      }\n      if (s.configured) {\n        html += statusCard('<span><strong>Shopify</strong> · ' + h(s.shop) + ' · ' + (s.lastRun ? 'dernière importation ' + h(ago(s.lastRun)) : 'pas encore importé') +\n          ' · importation automatique toutes les 5 minutes</span>' +\n          '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"shop-import\">Importer maintenant</button>') +\n          (s.lastError ? '<div style=\"margin-bottom:14px\">' + errorBox(s.lastError) + '</div>' : '');\n      }\n      if (!r.found && !s.configured) {\n        html += statusCard('<span class=\"muted\">Les commandes n’arrivent pas encore automatiquement. Connectez Releasit COD à un onglet <strong>RELEASIT</strong> du classeur, ' +\n          'ou connectez Shopify (dans le classeur, sur ordinateur : menu <strong>DZ Smart Shop</strong>).</span>');\n      }\n      box.innerHTML = html;\n    }).catch(function () {});\n  }\n\n  /* Vérifie l'onglet RELEASIT sans bloquer la page ; recharge si des commandes sont arrivées. */\n  function syncReleasit(onAdded) {\n    call('api_releasitSync').then(function (r) {\n      if (!r || !r.added) return;\n      toast(r.added > 1 ? r.added + ' nouvelles commandes reçues' : '1 nouvelle commande reçue');\n      refreshCount();\n      if (onAdded) onAdded();\n    }).catch(function () {});\n  }\n\n  function loadOrders() {\n    var t = ++S.token;\n    call('api_listOrders', S.filter).then(function (res) {\n      if (t !== S.token || S.route !== 'commandes') return;\n      renderChips(res.counts);\n      renderOrderList(res);\n    }).catch(function (e) {\n      if (t === S.token) $('#orders-list').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderChips(counts) {\n    var list = [['all', 'Toutes'], ['queue', 'À traiter']].concat(S.boot.statuses.map(function (s) { return [s, s]; }));\n    $('#chips').innerHTML = list.filter(function (c) {\n      return c[0] === 'all' || c[0] === S.filter.status || counts[c[0]];\n    }).map(function (c) {\n      return '<button type=\"button\" class=\"chip\" data-act=\"chip\" data-status=\"' + h(c[0]) + '\" aria-pressed=\"' + (S.filter.status === c[0]) + '\">' +\n        h(c[1]) + ' · ' + (counts[c[0]] || 0) + '</button>';\n    }).join('');\n  }\n\n  function renderOrderList(res) {\n    var box = $('#orders-list');\n    if (!res.rows.length) {\n      box.innerHTML = '<div class=\"card\"><p class=\"empty\">Aucune commande ne correspond à ces filtres.</p></div>';\n      return;\n    }\n    var head = ['N°', 'Client', 'Wilaya', 'Produit', 'Total', 'Statut', 'Alerte', 'Livraison'];\n    var html = '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' + head.map(function (t) {\n      return '<th scope=\"col\">' + t + '</th>';\n    }).join('') + '</tr></thead><tbody>';\n    res.rows.forEach(function (o) {\n      html += '<tr class=\"clickable\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' +\n        '<td data-label=\"N°\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' + h(o.id) + '</button>' +\n          (o.locked ? ' <span class=\"lock-icon\" title=\"Verrouillée\" aria-label=\"Verrouillée\">🔒</span>' : '') + '<div class=\"small\">' + fmtDate(o.date) + '</div></td>' +\n        '<td data-label=\"Client\" class=\"multi\">' + h(o.client) + '<div class=\"small\">' + h(fmtPhone(o.phone)) + '</div></td>' +\n        '<td data-label=\"Wilaya\" class=\"multi\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"Produit\">' + h(o.product) + (o.qty > 1 ? ' ×' + o.qty : '') + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"Statut\">' + pill(o.status) + '</td>' +\n        '<td data-label=\"Alerte\">' + alertPill(o.alert, o.alertLevel) + '</td>' +\n        '<td data-label=\"Livraison\" class=\"multi\">' + h(o.mode) + '<div class=\"small\">' + h([o.carrier, o.tracking].filter(Boolean).join(' · ')) + '</div></td>' +\n      '</tr>';\n    });\n    html += '</tbody></table></div>';\n    html += '<p class=\"small\" style=\"margin-top:10px\">' + res.rows.length + ' sur ' + res.total + ' commande(s)</p>';\n    if (res.total > res.rows.length) html += '<p style=\"margin-top:10px\"><button type=\"button\" class=\"btn\" data-act=\"more\">Afficher plus</button></p>';\n    box.innerHTML = html;\n  }\n\n  /* ---------------- Fenêtre de commande ---------------- */\n\n  function showModal(html) {\n    $('#modal-root').innerHTML = '<div class=\"modal-backdrop\"><div class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"modal-title\">' + html + '</div></div>';\n    var first = $('#modal-root input, #modal-root select, #modal-root button');\n    if (first) first.focus();\n  }\n  function closeModal() { $('#modal-root').innerHTML = ''; }\n  function modalOpen() { return !!$('#modal-root .modal'); }\n  function modalHead(title, extra) {\n    return '<div class=\"modal-head\"><div><h2 id=\"modal-title\" style=\"font:700 20px var(--font-title)\">' + title + '</h2>' + (extra || '') + '</div>' +\n      '<button type=\"button\" class=\"icon-btn\" data-act=\"close-modal\" aria-label=\"Fermer\">×</button></div>';\n  }\n\n  function orderFields(o) {\n    var b = S.boot;\n    return '<div class=\"form-grid\">' +\n      field('Client', input('client', o.client)) +\n      field('Téléphone', input('phone', o.phone, ' inputmode=\"tel\"')) +\n      field('Wilaya', '<select name=\"wilaya\">' + options(b.wilayas, o.wilaya, 'Choisir…') + '</select>') +\n      field('Commune', input('commune', o.commune)) +\n      field('Adresse', input('address', o.address), 'full') +\n      field('Produit', input('product', o.product, ' list=\"product-list\"')) +\n      field('Quantité', input('qty', o.qty || 1, ' type=\"number\" min=\"1\" step=\"1\"')) +\n      field('Prix des produits (DA)', input('price', o.price || '', ' type=\"number\" min=\"0\" step=\"10\"')) +\n      field('Livraison', '<select name=\"mode\">' + options(b.modes, o.mode || b.modes[0]) + '</select>') +\n      field('Société', '<select name=\"carrier\">' + options(b.carriers, o.carrier, 'Par défaut (' + b.defaultCarrier + ')') + '</select>') +\n      field('Frais de livraison (DA)', input('shipping', o.shipping === null || o.shipping === undefined ? '' : o.shipping, ' type=\"number\" min=\"0\" step=\"10\" placeholder=\"Calcul automatique\"')) +\n      (o.id ? field('N° de suivi', input('tracking', o.tracking)) : '') +\n      field('Notes', '<textarea name=\"notes\">' + h(o.notes) + '</textarea>', 'full') +\n      '</div>' +\n      '<datalist id=\"product-list\">' + b.products.map(function (p) { return '<option value=\"' + h(p.name) + '\">'; }).join('') + '</datalist>';\n  }\n\n  function openOrder(id) {\n    S.unlockId = null;\n    showModal(modalHead('Commande ' + h(id)) + '<p class=\"loading\">Chargement…</p>');\n    call('api_getOrder', id).then(renderOrderModal).catch(function (e) {\n      showModal(modalHead('Commande ' + h(id)) + errorBox(e));\n    });\n  }\n\n  /* Verrou : message, et boutons Annuler le colis / Remettre à confirmer / Modifier quand même. */\n  function lockBox(o, r, unlocked) {\n    if (unlocked) {\n      return '<div class=\"lock-box warn\"><p>Déverrouillage administrateur : la modification sera notée dans le Journal avec son motif. ' +\n        (o.tracking ? 'Attention : le colis chez Ecotrack, lui, ne change pas.' : '') + '</p></div>' +\n        field('Motif du déverrouillage (obligatoire)', input('forceReason', '', ' data-role=\"force-reason\" placeholder=\"Ex. adresse corrigée à la demande d’Ecotrack\"'), 'full');\n    }\n    if (!r.locked) return '';\n    return '<div class=\"lock-box\"><p>🔒 ' + h(r.reason) + '</p>' +\n      (r.canCancelParcel ? '<button type=\"button\" class=\"btn danger\" data-act=\"parcel-cancel-ask\" data-id=\"' + h(o.id) + '\" data-tracking=\"' + h(o.tracking) + '\">Annuler le colis</button>' : '') +\n      (r.canReopen ? '<button type=\"button\" class=\"btn\" data-act=\"order-reopen\" data-id=\"' + h(o.id) + '\">Remettre à confirmer</button>' : '') +\n      (r.canUnlock ? '<button type=\"button\" class=\"link-btn\" data-act=\"order-unlock\" data-id=\"' + h(o.id) + '\">Modifier quand même (administrateur)</button>' : '') +\n      '</div>';\n  }\n\n  function renderOrderModal(data) {\n    S.order = data;\n    var o = data.order;\n    var r = data.rules || { locked: false, statuses: S.boot.statuses };\n    var unlocked = r.locked && S.unlockId === o.id;\n    var locked = r.locked && !unlocked;\n    var statuses = unlocked ? S.boot.statuses : r.statuses;\n    var hist = data.history;\n    var b = S.boot;\n    var meta = '<p class=\"small\" style=\"margin-top:4px\">Reçue le ' + fmtDate(o.date) + ' · source : ' + h(o.source || '—') +\n      (o.agent ? ' · traitée par ' + h(o.agent) : '') + (o.attempts ? ' · ' + plural(o.attempts, 'appel', 'appels') : '') + '</p>' +\n      '<p style=\"margin-top:8px;display:flex;gap:6px;flex-wrap:wrap\">' + pill(o.status) + alertPill(o.alert, o.alertLevel) + '</p>';\n    var histText = hist.orders\n      ? 'Autres commandes de ce numéro : ' + hist.orders + ' (' + hist.delivered + ' livrées, ' + hist.returned + ' retours, ' + hist.cancelled + ' annulées)'\n      : 'Première commande avec ce numéro.';\n    showModal(\n      modalHead('Commande ' + h(o.id), meta) +\n      '<p class=\"small\">' + h(histText) + '</p>' +\n      (o.tracking ?\n        '<div class=\"history\" style=\"background:#F4F5F7;margin-bottom:0\"><span class=\"strong\">Colis Ecotrack</span><span class=\"mono\">' + h(o.tracking) + '</span>' +\n        '<span>' + (o.carrierLabel ? h(o.carrierLabel) : 'statut pas encore lu') + (o.carrierMoved ? ' · mouvement ' + h(ago(o.carrierMoved)) : '') + '</span>' +\n        '<button type=\"button\" class=\"btn\" style=\"min-height:36px;margin-left:auto\" data-act=\"track-history\" data-id=\"' + h(o.id) + '\">Voir la chronologie</button></div>' +\n        '<div id=\"parcel-history\"></div>' : '') +\n      lockBox(o, r, unlocked) +\n      '<div id=\"order-form\" data-id=\"' + h(o.id) + '\" data-locked=\"' + (locked ? '1' : '') + '\" data-force=\"' + (unlocked ? '1' : '') + '\">' +\n        '<div class=\"form-grid\">' +\n          field('Statut', '<select name=\"status\" data-role=\"status\"' + (statuses.length < 2 ? ' disabled' : '') + '>' + options(statuses, o.status) + '</select>') +\n          field('Motif d’annulation', '<select name=\"cancelReason\">' + options(b.cancelReasons, o.cancelReason, 'Choisir…') + '</select>') +\n        '</div>' +\n        '<div style=\"height:12px\"></div>' +\n        orderFields(o) +\n      '</div>' +\n      '<div class=\"modal-actions\">' +\n        (data.phoneValid ? '<button type=\"button\" class=\"btn ' + (data.blacklisted ? '' : 'danger') + '\" data-act=\"toggle-blacklist\" data-phone=\"' + h(o.phone) + '\" data-on=\"' + (!data.blacklisted) + '\">' +\n          (data.blacklisted ? 'Retirer de la liste noire' : 'Mettre en liste noire') + '</button>' : '') +\n        (r.canDelete ? '<button type=\"button\" class=\"btn danger\" data-act=\"order-delete-ask\" data-id=\"' + h(o.id) + '\">Supprimer</button>' : '') +\n        '<button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button>' +\n        '<button type=\"button\" class=\"btn primary\" data-act=\"save-order\" data-id=\"' + h(o.id) + '\">' + (locked ? 'Enregistrer les notes' : 'Enregistrer') + '</button>' +\n      '</div>'\n    );\n    if (locked) {\n      // Seules les notes (et les statuts permis) restent modifiables.\n      $all('#order-form [name]').forEach(function (el) {\n        if (['notes', 'status', 'cancelReason'].indexOf(el.name) < 0) el.disabled = true;\n      });\n    }\n    toggleCancelField();\n  }\n\n  function askCancelParcel(id, tracking, fromShipping) {\n    showModal(modalHead('Annuler le colis ?') +\n      '<p>Le colis <span class=\"mono\">' + h(tracking) + '</span> sera supprimé chez Ecotrack. C’est possible seulement s’il n’est pas encore validé.</p>' +\n      '<p class=\"small\" style=\"margin-top:8px\">La commande ' + h(id) + ' redeviendra « Confirmée » et modifiable. Après correction, recréez le colis depuis la page Expéditions.</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"' + (fromShipping ? 'close-modal' : 'open-order') + '\" data-id=\"' + h(id) + '\">Retour</button>' +\n      '<button type=\"button\" class=\"btn danger\" data-act=\"parcel-cancel\" data-id=\"' + h(id) + '\" data-from=\"' + (fromShipping ? 'ship' : 'order') + '\">Annuler le colis</button></div>');\n  }\n\n  function cancelParcel(btn) {\n    var id = btn.getAttribute('data-id');\n    var fromShipping = btn.getAttribute('data-from') === 'ship';\n    btn.disabled = true;\n    toast('Annulation du colis chez Ecotrack…');\n    call('api_cancelParcel', id).then(function (r) {\n      toast(r.message);\n      afterOrderChange();\n      if (fromShipping) closeModal(); else openOrder(id);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function askDeleteOrder(id) {\n    showModal(modalHead('Supprimer la commande ' + h(id) + ' ?') +\n      '<p>Elle sera déplacée dans l’onglet <strong>Corbeille</strong> du classeur. Releasit et Shopify ne la feront pas revenir.</p>' +\n      '<p class=\"small\" style=\"margin-top:8px\">Pour la récupérer : dans le classeur, menu DZ Smart Shop › Restaurer une commande de la corbeille.</p>' +\n      '<div style=\"height:10px\"></div>' + field('Motif (facultatif)', input('trashReason', '', ' data-role=\"trash-reason\" placeholder=\"Ex. commande test\"'), 'full') +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"open-order\" data-id=\"' + h(id) + '\">Retour</button>' +\n      '<button type=\"button\" class=\"btn danger\" data-act=\"order-delete\" data-id=\"' + h(id) + '\">Mettre à la corbeille</button></div>');\n  }\n\n  function deleteOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    var reason = ($('[data-role=\"trash-reason\"]') || {}).value || '';\n    btn.disabled = true;\n    call('api_deleteOrder', id, reason).then(function (r) {\n      closeModal();\n      toast(r.message);\n      afterOrderChange();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function reopenOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    btn.disabled = true;\n    call('api_updateOrder', id, { status: 'À confirmer' }).then(function () {\n      toast('Commande ' + id + ' remise « À confirmer »');\n      afterOrderChange();\n      openOrder(id);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function toggleCancelField() {\n    var st = $('#order-form [data-role=\"status\"]');\n    var reason = $('#order-form [name=\"cancelReason\"]');\n    if (!st || !reason) return;\n    reason.closest('.field').hidden = st.value !== 'Annulée';\n  }\n\n  function openNewOrder() {\n    showModal(\n      modalHead('Nouvelle commande', '<p class=\"small\" style=\"margin-top:4px\">Elle sera ajoutée au classeur et à la file de confirmation.</p>') +\n      '<div id=\"order-form\">' + orderFields({ qty: 1, mode: S.boot.modes[0] }) + '</div>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"create-order\">Ajouter la commande</button></div>'\n    );\n  }\n\n  function afterOrderChange() {\n    if (S.route === 'commandes') loadOrders();\n    else if (S.route === 'tableau') pageDashboard();\n    else if (S.route === 'expeditions') loadShipping();\n    else if (S.route === 'suivi') loadTracking();\n    refreshCount();\n  }\n\n  function saveOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    var form = $('#order-form');\n    var data = readForm(form);\n    if (form.getAttribute('data-locked') === '1') {\n      data = { notes: data.notes, status: data.status, cancelReason: data.cancelReason };\n    } else if (form.getAttribute('data-force') === '1') {\n      data.force = true;\n      data.forceReason = ($('[data-role=\"force-reason\"]') || {}).value || '';\n      if (!String(data.forceReason).trim()) { toast('Indiquez le motif du déverrouillage.', true); return; }\n    }\n    btn.disabled = true;\n    call('api_updateOrder', id, data).then(function (o) {\n      closeModal();\n      toast('Commande ' + o.id + ' enregistrée');\n      afterOrderChange();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function createOrder(btn) {\n    var data = readForm($('#order-form'));\n    btn.disabled = true;\n    call('api_createOrder', data).then(function (o) {\n      closeModal();\n      toast('Commande ' + o.id + ' ajoutée');\n      afterOrderChange();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function toggleBlacklist(btn) {\n    var on = btn.getAttribute('data-on') === 'true';\n    btn.disabled = true;\n    call('api_setBlacklist', btn.getAttribute('data-phone'), on).then(function (r) {\n      toast(r.blacklisted ? 'Numéro ajouté à la liste noire' : 'Numéro retiré de la liste noire');\n      btn.setAttribute('data-on', String(!r.blacklisted));\n      btn.textContent = r.blacklisted ? 'Retirer de la liste noire' : 'Mettre en liste noire';\n      btn.classList.toggle('danger', !r.blacklisted);\n      btn.disabled = false;\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Centre de confirmation                                           */\n  /* ================================================================ */\n\n  function pageConfirm() {\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Centre de confirmation</h1><p class=\"sub\">Connecté(e) : ' + h(S.boot.user.name) + '</p></div>' +\n      '<div class=\"stats\" id=\"cstats\"></div></div>' +\n      '<div class=\"confirm\">' +\n        '<section class=\"queue\" id=\"queue\" aria-label=\"File d’appels\"><p class=\"loading\">Chargement…</p></section>' +\n        '<section class=\"detail\" id=\"detail\"></section>' +\n      '</div>';\n    S.currentId = null;\n    loadQueue(true);\n    syncReleasit(function () { if (S.route === 'confirmation') loadQueue(false); });\n  }\n\n  function loadQueue(selectFirst) {\n    return call('api_queue').then(function (q) {\n      if (S.route !== 'confirmation') return;\n      S.queue = q;\n      setQueueCount(q.stats.due);\n      renderQueue();\n      var ids = q.due.concat(q.later).map(function (x) { return x.id; });\n      if (selectFirst || !S.currentId || ids.indexOf(S.currentId) < 0) {\n        if (!selectFirst && S.currentId && !S.busy) toast('La commande ' + S.currentId + ' a été traitée par une autre personne.');\n        if (q.due.length) openInDetail(q.due[0].id);\n        else renderEmptyDetail();\n      }\n    }).catch(function (e) {\n      if (S.route === 'confirmation') $('#queue').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderQueue() {\n    var q = S.queue;\n    $('#cstats').innerHTML =\n      '<span>À appeler : <strong>' + q.stats.due + '</strong></span>' +\n      '<span>Rappels plus tard : <strong>' + q.stats.later + '</strong></span>' +\n      '<span style=\"background:#E3F2EC;color:#0B6B4C;border-color:#BFE0D2\">Mes confirmations aujourd’hui : <strong>' + q.stats.confirmedToday + '</strong></span>';\n    var item = function (x) {\n      var when = x.status === 'À confirmer' ? 'reçue ' + ago(x.date) : (x.callback ? 'rappel ' + fmtDate(x.callback) : ago(x.date));\n      return '<button type=\"button\" class=\"q-item\" data-act=\"q-open\" data-id=\"' + h(x.id) + '\" aria-current=\"' + (x.id === S.currentId) + '\">' +\n        '<span class=\"q-top\"><strong>' + h(x.client || 'Sans nom') + '</strong><span class=\"small\">' + h(when) + '</span></span>' +\n        '<span class=\"small\" style=\"color:var(--ink-2)\">' + h(x.id) + ' · ' + h(wilayaName(x.wilaya)) + ' · ' + money(x.total) + '</span>' +\n        '<span class=\"q-tags\">' + alertPill(x.alert, x.alertLevel) + (x.status !== 'À confirmer' ? pill(x.status) : '') +\n          (x.attempts ? '<span class=\"pill\" style=\"background:#EEF0F3;color:#3D4350\">' + plural(x.attempts, 'appel', 'appels') + '</span>' : '') +\n        '</span></button>';\n    };\n    var html = '<div class=\"q-top\"><span class=\"queue-title\">À appeler · ' + q.due.length + '</span>' +\n      '<button type=\"button\" class=\"btn\" style=\"min-height:36px;padding:0 10px\" data-act=\"refresh-queue\">Actualiser</button></div>';\n    html += q.due.length ? q.due.map(item).join('') : '<p class=\"small\">Personne à appeler pour le moment.</p>';\n    if (q.later.length) html += '<span class=\"queue-title\">Rappels programmés · ' + q.later.length + '</span>' + q.later.map(item).join('');\n    $('#queue').innerHTML = html;\n  }\n\n  function markCurrent() {\n    $all('#queue .q-item').forEach(function (b) {\n      b.setAttribute('aria-current', String(b.getAttribute('data-id') === S.currentId));\n    });\n  }\n\n  function renderEmptyDetail() {\n    S.currentId = null;\n    S.current = null;\n    var next = S.queue && S.queue.later[0];\n    $('#detail').innerHTML = '<div class=\"card\"><h2>La file est vide</h2><p class=\"sub\">Les nouvelles commandes arrivent automatiquement (toutes les 5 minutes).' +\n      (next ? ' Prochain rappel : ' + h(next.client) + ', ' + fmtDate(next.callback) + '.' : '') + '</p></div>';\n  }\n\n  function openInDetail(id) {\n    S.currentId = id;\n    markCurrent();\n    $('#queue').classList.remove('open');\n    $('#detail').innerHTML = '<div class=\"card\"><p class=\"loading\">Chargement…</p></div>';\n    var t = ++S.detailToken;\n    call('api_getOrder', id).then(function (data) {\n      if (t !== S.detailToken || S.route !== 'confirmation') return;\n      S.current = data;\n      renderDetail();\n    }).catch(function (e) {\n      if (t === S.detailToken) $('#detail').innerHTML = '<div class=\"card\">' + errorBox(e) + '</div>';\n    });\n  }\n\n  function renderDetail() {\n    var d = S.current;\n    var o = d.order;\n    var b = S.boot;\n    var hist = d.history;\n    var a = ALERT[o.alertLevel] || ALERT['new'];\n    var histText = hist.orders\n      ? plural(hist.orders, 'autre commande', 'autres commandes') + ' : ' + hist.delivered + ' livrée(s), ' + hist.returned + ' retour(s), ' + hist.cancelled + ' annulée(s)'\n      : 'Première commande avec ce numéro';\n    var dueCount = S.queue ? S.queue.due.length : 0;\n    var callBtn = d.phoneValid\n      ? '<a class=\"btn primary\" href=\"tel:' + h(o.phone) + '\" target=\"_top\">Appeler</a>'\n      : '<span class=\"btn\" aria-disabled=\"true\">Numéro invalide</span>';\n    var waBtn = d.intlPhone\n      ? '<a class=\"btn\" id=\"d-wa\" href=\"#\" target=\"_blank\" rel=\"noopener\">WhatsApp</a>'\n      : '';\n\n    $('#detail').innerHTML =\n      '<div class=\"card\">' +\n        '<div class=\"detail-head\"><div><h2>' + h(o.client || 'Client sans nom') + ' · ' + h(o.id) + '</h2>' +\n          '<p class=\"muted\">' + h(fmtPhone(o.phone)) + ' · reçue ' + h(ago(o.date)) + (o.attempts ? ' · ' + plural(o.attempts, 'appel', 'appels') : '') + '</p></div>' +\n          '<div class=\"quick\"><button type=\"button\" class=\"btn queue-toggle\" data-act=\"toggle-queue\">File (' + dueCount + ')</button>' + callBtn + waBtn + '</div>' +\n        '</div>' +\n        '<div class=\"history\" style=\"background:' + a.bg + '\"><span class=\"strong\" style=\"color:' + a.fg + '\">' + h(o.alert || 'Nouveau client') + '</span><span>' + h(histText) + '</span></div>' +\n        '<div class=\"form-grid\" id=\"d-form\">' +\n          field('Client', input('client', o.client)) +\n          field('Téléphone', input('phone', o.phone, ' inputmode=\"tel\"')) +\n          field('Wilaya', '<select name=\"wilaya\">' + options(b.wilayas, o.wilaya, 'Choisir…') + '</select>') +\n          field('Commune', input('commune', o.commune)) +\n          field('Livraison', '<select name=\"mode\">' + options(b.modes, o.mode || b.modes[0]) + '</select>') +\n          field('Quantité', input('qty', o.qty, ' type=\"number\" min=\"1\" step=\"1\"')) +\n          field('Adresse', input('address', o.address), 'full') +\n          field('Notes', '<textarea name=\"notes\">' + h(o.notes) + '</textarea>', 'full') +\n        '</div>' +\n        '<div class=\"sum\" id=\"d-sum\"></div>' +\n      '</div>' +\n      '<div class=\"card\"><h3>Résultat de l’appel</h3>' +\n        '<div class=\"outcomes\">' +\n          '<button type=\"button\" class=\"btn primary big\" data-act=\"confirm\">Confirmer</button>' +\n          '<button type=\"button\" class=\"btn big\" data-act=\"no_answer\">Pas de réponse</button>' +\n          '<button type=\"button\" class=\"btn warn big\" data-act=\"show-callback\">Rappeler plus tard</button>' +\n          '<button type=\"button\" class=\"btn danger big\" data-act=\"show-cancel\">Annuler</button>' +\n        '</div><div id=\"d-panel\"></div>' +\n      '</div>' +\n      '<div class=\"card\"><h3>Message WhatsApp</h3><p class=\"message\" id=\"d-msg\"></p>' +\n        '<p class=\"small\" style=\"margin-top:8px\">Modèle modifiable dans l’onglet Paramètres (MESSAGE_WHATSAPP).</p></div>';\n    updateSummary();\n  }\n\n  /** Recalcule prix, frais, total et message quand la confirmatrice modifie la commande. */\n  function updateSummary() {\n    if (!S.current || !$('#d-form')) return;\n    var o = S.current.order;\n    var f = readForm($('#d-form'));\n    var qty = Math.max(1, parseInt(f.qty, 10) || 1);\n    var unit = o.qty ? o.price / o.qty : o.price;\n    var price = qty === o.qty ? o.price : Math.round(unit * qty);\n    var changed = f.wilaya !== o.wilaya || f.mode !== o.mode;\n    var fee = feeFor(f.wilaya, o.carrier, f.mode);\n    var shipping = (changed || o.shipping === null) && fee !== null ? fee : (o.shipping || 0);\n    var total = (price !== o.price || shipping !== (o.shipping || 0)) ? price + shipping : o.total;\n    var carrier = o.carrier || S.boot.defaultCarrier;\n    $('#d-sum').innerHTML =\n      '<div><span>' + h(f.product || o.product || 'Produits') + ' ×' + qty + '</span><span>' + money(price) + '</span></div>' +\n      '<div class=\"muted\"><span>Livraison ' + h(f.mode) + ' · ' + h(carrier) + (fee === null ? ' (tarif non renseigné)' : '') + '</span><span>' + money(shipping) + '</span></div>' +\n      '<div class=\"total\"><span>Total à encaisser</span><span>' + money(total) + '</span></div>';\n    var msg = fillTemplate(S.boot.waTemplate, {\n      client: f.client, id: o.id, product: o.product, qty: qty, total: total, commune: f.commune, wilaya: f.wilaya\n    });\n    $('#d-msg').textContent = msg;\n    var wa = $('#d-wa');\n    if (wa) wa.href = 'https://wa.me/' + S.current.intlPhone + '?text=' + encodeURIComponent(msg);\n  }\n\n  function fillTemplate(tpl, x) {\n    var first = String(x.client || '').trim().split(/\\s+/)[0] || '';\n    var map = {\n      prenom: first,\n      client: x.client || '',\n      numero: x.id,\n      produit: (x.product || '') + (x.qty > 1 ? ' ×' + x.qty : ''),\n      total: money(x.total),\n      commune: x.commune || '',\n      wilaya: wilayaName(x.wilaya),\n      boutique: S.boot.shop\n    };\n    return String(tpl || '').replace(/\\{(\\w+)\\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });\n  }\n\n  function showPanel(kind) {\n    var p = $('#d-panel');\n    if (kind === 'callback') {\n      p.innerHTML = '<div class=\"panel\"><span class=\"strong\">Quand rappeler ?</span><div class=\"quick\">' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-min=\"60\">Dans 1 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-min=\"180\">Dans 3 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-tomorrow=\"10\">Demain 10 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-tomorrow=\"17\">Demain 17 h</button></div>' +\n        '<div class=\"form-grid\">' + field('Autre date et heure', '<input type=\"datetime-local\" id=\"cb-when\">') + '</div>' +\n        '<div><button type=\"button\" class=\"btn warn\" data-act=\"callback\">Programmer le rappel</button></div></div>';\n    } else {\n      p.innerHTML = '<div class=\"panel\"><div class=\"form-grid\">' +\n        field('Motif d’annulation', '<select id=\"cancel-reason\">' + options(S.boot.cancelReasons, '') + '</select>') + '</div>' +\n        '<label style=\"display:flex;gap:10px;align-items:center;min-height:44px\"><input type=\"checkbox\" id=\"cancel-black\" style=\"width:20px;height:20px\"> Ajouter ce numéro à la liste noire</label>' +\n        '<div><button type=\"button\" class=\"btn danger\" data-act=\"cancel\">Confirmer l’annulation</button></div></div>';\n    }\n    var first = p.querySelector('button, select, input');\n    if (first) first.focus();\n  }\n\n  function submit(outcome, extra) {\n    if (S.busy || !S.currentId) return;\n    S.busy = true;\n    $all('#detail button').forEach(function (b) { b.disabled = true; });\n    var id = S.currentId;\n    var payload = { fields: readForm($('#d-form')) };\n    Object.keys(extra || {}).forEach(function (k) { payload[k] = extra[k]; });\n    var blacklist = outcome === 'cancel' && $('#cancel-black') && $('#cancel-black').checked;\n    var phone = S.current.order.phone;\n\n    call('api_recordCall', id, outcome, payload).then(function (o) {\n      var msgs = {\n        confirm: 'Commande ' + o.id + ' confirmée',\n        no_answer: o.status === 'Injoignable' ? 'Commande ' + o.id + ' : client injoignable' : 'Pas de réponse noté, rappel ' + fmtDate(o.callback),\n        callback: 'Rappel programmé ' + fmtDate(o.callback),\n        cancel: 'Commande ' + o.id + ' annulée'\n      };\n      toast(msgs[outcome]);\n      if (blacklist) call('api_setBlacklist', phone, true).catch(function (e) { toast(errText(e), true); });\n      var due = S.queue.due;\n      var idx = -1;\n      for (var i = 0; i < due.length; i++) if (due[i].id === id) idx = i;\n      if (idx >= 0) due.splice(idx, 1);\n      S.queue.stats.due = due.length;\n      if (outcome === 'confirm') S.queue.stats.confirmedToday++;\n      setQueueCount(due.length);\n      S.busy = false;\n      var next = due[Math.max(idx, 0)] || due[0];\n      renderQueue();\n      if (next) openInDetail(next.id); else renderEmptyDetail();\n      loadQueue(false);\n    }).catch(function (e) {\n      S.busy = false;\n      $all('#detail button').forEach(function (b) { b.disabled = false; });\n      toast(errText(e), true);\n      if (/déjà été traitée/.test(errText(e))) loadQueue(true);\n    });\n  }\n\n  /* ================================================================ */\n  /* Expéditions (Ecotrack)                                           */\n  /* ================================================================ */\n\n  function pageShipping() {\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Expéditions</h1><p class=\"sub\">Envoi des commandes confirmées à Ecotrack et suivi des colis</p></div>' +\n      '<button type=\"button\" class=\"btn\" data-act=\"ship-reload\">Actualiser</button></div>' +\n      '<div id=\"ship\"><p class=\"loading\">Chargement…</p></div>';\n    loadShipping();\n  }\n\n  function loadShipping() {\n    var t = ++S.token;\n    return call('api_shippingList').then(function (d) {\n      if (t !== S.token || S.route !== 'expeditions') return;\n      S.ship.data = d;\n      var ready = {};\n      d.toShip.forEach(function (o) { if (!o.problems.length) ready[o.id] = true; });\n      Object.keys(S.ship.selected).forEach(function (id) { if (!ready[id]) delete S.ship.selected[id]; });\n      renderShipping();\n    }).catch(function (e) {\n      if (t === S.token && S.route === 'expeditions') $('#ship').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderShipping() {\n    var box = $('#ship');\n    var sh = S.ship;\n    var d = sh.data;\n    if (!box || !d) return;\n    var ready = d.toShip.filter(function (o) { return !o.problems.length; });\n    var picked = Object.keys(sh.selected).length;\n    var html = '<div class=\"stack\">';\n\n    // Connexion\n    html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Ecotrack</h2><p class=\"muted\">' +\n      (d.configured ? 'Connecté à ' + h(d.host) : 'Pas encore configuré') + '</p></div>';\n    if (d.configured) {\n      html += '<div class=\"quick\">' +\n        '<button type=\"button\" class=\"btn\" data-act=\"eco-test\">Tester la connexion</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"eco-fees-ask\">Récupérer les tarifs</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"eco-status\">Mettre à jour les statuts</button></div>';\n    }\n    html += '</div>';\n    if (!d.configured) {\n      html += '<p>Pour envoyer vos colis, enregistrez l’adresse de votre plateforme Ecotrack et votre jeton API. ' +\n        'Dans le classeur, sur ordinateur : menu <strong>DZ Smart Shop › Ecotrack › Enregistrer l’adresse et le jeton</strong>. ' +\n        'Le jeton reste dans les propriétés protégées du script, jamais dans le classeur.</p>';\n    }\n    if (d.catalogError) html += '<div style=\"margin-top:12px\">' + errorBox(d.catalogError) + '</div>';\n    html += '</section>';\n\n    // Résultat du dernier envoi\n    if (sh.results) {\n      var okCount = sh.results.filter(function (r) { return r.ok; }).length;\n      html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Résultat de l’envoi</h2><p class=\"muted\">' +\n        plural(okCount, 'colis créé', 'colis créés') + (sh.results.length - okCount ? ' · ' + plural(sh.results.length - okCount, 'refusé', 'refusés') : '') +\n        '</p></div><button type=\"button\" class=\"btn\" data-act=\"ship-dismiss\">Fermer</button></div>';\n      if (okCount) {\n        html += '<p style=\"margin-bottom:8px\">Ces colis sont <strong>créés</strong> chez Ecotrack mais <strong>pas encore expédiés</strong> : validez-les dans l’interface d’Ecotrack. ' +\n          'L’outil détecte la validation tout seul (au plus tard 30 minutes plus tard).</p>';\n      }\n      html += sh.results.map(function (r) {\n        return '<div class=\"result-row\"><span class=\"pill\" style=\"background:' + (r.ok ? '#DDF0E4;color:#146C2E' : '#FBE7E7;color:#A12626') + '\">' + (r.ok ? 'Créé' : 'Refusé') + '</span>' +\n          '<span class=\"grow\"><strong>' + h(r.id) + '</strong>' + (r.client ? ' · ' + h(r.client) : '') +\n          (r.message ? '<br><span class=\"small\" style=\"color:' + (r.ok ? 'var(--muted)' : '#A12626') + '\">' + h(r.message) + '</span>' : '') + '</span>' +\n          (r.ok ? '<span class=\"mono strong\">' + h(r.tracking) + '</span>' : '') + '</div>';\n      }).join('');\n      html += '</section>';\n    }\n\n    // Onglets\n    html += '<div class=\"chips\" role=\"group\" aria-label=\"Vue\">' +\n      '<button type=\"button\" class=\"chip\" data-act=\"ship-tab\" data-tab=\"toship\" aria-pressed=\"' + (sh.tab === 'toship') + '\">À expédier · ' + d.toShip.length + '</button>' +\n      '<button type=\"button\" class=\"chip\" data-act=\"ship-tab\" data-tab=\"created\" aria-pressed=\"' + (sh.tab === 'created') + '\">Créés, à valider chez Ecotrack · ' + d.created.length + '</button></div>';\n\n    if (sh.tab === 'toship') html += renderToShip(d, ready, picked);\n    else html += renderCreated(d);\n    html += '</div>';\n    box.innerHTML = html;\n  }\n\n  function renderToShip(d, ready, picked) {\n    var sh = S.ship;\n    if (!d.toShip.length) return '<div class=\"card\"><p class=\"empty\">Aucune commande confirmée à expédier.</p></div>';\n    var allPicked = ready.length > 0 && picked === ready.length;\n    var html = '<div class=\"quick\" style=\"align-items:center;justify-content:space-between\">' +\n      '<label style=\"display:flex;align-items:center;gap:10px;min-height:44px\"><input type=\"checkbox\" class=\"check\" data-ship-all' + (allPicked ? ' checked' : '') + (ready.length ? '' : ' disabled') + '> ' +\n      'Tout sélectionner (' + ready.length + ' prêtes)</label>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"ship-ask\"' + ((!picked || !d.configured || sh.busy) ? ' disabled' : '') + '>' +\n      (sh.busy ? 'Création en cours…' : 'Envoyer ' + plural(picked, 'colis', 'colis') + ' à Ecotrack') + '</button></div>';\n    html += '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' +\n      ['', 'Commande', 'Destination', 'Livraison', 'Total', 'État', ''].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>';\n    d.toShip.forEach(function (o) {\n      var ok = !o.problems.length;\n      html += '<tr>' +\n        '<td data-label=\"Choisir\">' + (ok ? '<input type=\"checkbox\" class=\"check\" data-ship-check=\"' + h(o.id) + '\"' + (sh.selected[o.id] ? ' checked' : '') + ' aria-label=\"Sélectionner la commande ' + h(o.id) + '\">' : '') + '</td>' +\n        '<td data-label=\"Commande\" class=\"multi\"><strong>' + h(o.id) + '</strong> · ' + h(o.client) + '<div class=\"small\">' + h(o.product) + '</div></td>' +\n        '<td data-label=\"Destination\" class=\"multi\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"Livraison\">' + h(o.mode) + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"État\">' + (ok ? '<span class=\"pill\" style=\"background:#DDF0E4;color:#146C2E\">Prête</span>' :\n          '<span class=\"problems\">' + o.problems.map(function (p) { return '<span>' + h(p) + '</span>'; }).join('') + '</span>') + '</td>' +\n        '<td data-label=\"\"><button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">Modifier</button></td></tr>';\n    });\n    return html + '</tbody></table></div>' +\n      '<p class=\"small\">Les colis partent chez Ecotrack avec le total affiché (livraison comprise). La commune doit être écrite comme chez Ecotrack : sinon le colis est refusé et vous en êtes prévenu ici.</p>';\n  }\n\n  function renderCreated(d) {\n    if (!d.created.length) return '<div class=\"card\"><p class=\"empty\">Aucun colis en attente de validation chez Ecotrack.</p></div>';\n    var html = '<p class=\"small\">Ces colis existent chez Ecotrack mais ne partent pas tant que vous ne les avez pas validés dans l’interface d’Ecotrack. ' +\n      'Une fois validés, la commande passe « Expédiée » toute seule. Un colis non validé depuis plus de ' + d.alertHours + ' h est signalé.</p>';\n    html += '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' +\n      ['Commande', 'Destination', 'N° de suivi', 'Statut Ecotrack', 'Créé depuis', 'Total', ''].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>';\n    d.created.forEach(function (o) {\n      html += '<tr>' +\n        '<td data-label=\"Commande\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' + h(o.id) + '</button> · ' + h(o.client) + '</td>' +\n        '<td data-label=\"Destination\" class=\"multi\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"N° de suivi\" class=\"mono\">' + h(o.tracking) + '</td>' +\n        '<td data-label=\"Statut Ecotrack\">' + h(o.carrierLabel) + '</td>' +\n        '<td data-label=\"Créé depuis\">' + h(hoursText(o.ageHours)) + (o.late ? ' <span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">à valider</span>' : '') + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"\"><button type=\"button\" class=\"btn danger\" style=\"min-height:36px\" data-act=\"parcel-cancel-ask\" data-from=\"ship\" data-id=\"' + h(o.id) + '\" data-tracking=\"' + h(o.tracking) + '\">Annuler le colis</button></td></tr>';\n    });\n    return html + '</tbody></table></div>' +\n      '<p class=\"small\">Une erreur dans un colis pas encore validé ? « Annuler le colis » le supprime chez Ecotrack : la commande redevient modifiable, puis vous recréez le colis.</p>';\n  }\n\n  /** « 5 h », « 2 j » à partir d'un nombre d'heures. */\n  function hoursText(hours) {\n    var n = Math.max(Number(hours) || 0, 0);\n    if (n < 1) return 'moins d’1 h';\n    return n < 48 ? n + ' h' : Math.floor(n / 24) + ' j';\n  }\n\n  function confirmModal(title, text, okAct, okLabel) {\n    showModal(modalHead(h(title)) + '<p>' + h(text) + '</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"' + okAct + '\">' + h(okLabel) + '</button></div>');\n  }\n\n  function askShip() {\n    var n = Object.keys(S.ship.selected).length;\n    if (!n || S.ship.busy) return;\n    confirmModal('Créer les colis chez Ecotrack ?', plural(n, 'colis va être créé', 'colis vont être créés') +\n      ' chez Ecotrack, avec le total affiché comme montant à encaisser. Ils ne seront pas expédiés : vous les validez ensuite dans l’interface d’Ecotrack.',\n      'ship-confirm', 'Créer les colis');\n  }\n\n  function doShip() {\n    var ids = Object.keys(S.ship.selected);\n    closeModal();\n    if (!ids.length || S.ship.busy) return;\n    S.ship.busy = true;\n    renderShipping();\n    toast('Envoi à Ecotrack en cours…');\n    call('api_shipEcotrack', ids).then(function (res) {\n      S.ship.busy = false;\n      S.ship.selected = {};\n      S.ship.results = res;\n      var ok = res.filter(function (r) { return r.ok; }).length;\n      toast(plural(ok, 'colis créé', 'colis créés') + (res.length - ok ? ', ' + (res.length - ok) + ' refusé(s)' : '') + (ok ? '. À valider dans Ecotrack.' : ''), ok === 0);\n      loadShipping();\n      refreshCount();\n    }).catch(function (e) {\n      S.ship.busy = false;\n      toast(errText(e), true);\n      renderShipping();\n    });\n  }\n\n  function ecoAction(fn, busyText) {\n    toast(busyText);\n    call(fn).then(function (r) {\n      toast(r.message);\n      if (fn === 'api_ecotrackSyncStatuses') loadShipping();\n    }).catch(function (e) { toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Suivi des colis                                                  */\n  /* ================================================================ */\n\n  var LEVELS = {\n    urgent: { label: 'Urgent', bg: '#FBE7E7', fg: '#A12626' },\n    warn: { label: 'À surveiller', bg: '#FFF3DC', fg: '#8A5200' },\n    info: { label: 'Info', bg: '#E6EEFB', fg: '#1E4FA8' }\n  };\n  var GROUPS = [\n    ['all', 'Tous'], ['draft', 'À valider'], ['transit', 'En route'], ['delivery', 'En livraison'],\n    ['suspended', 'Suspendus'], ['returning', 'Retours']\n  ];\n\n  function waLink(phone) {\n    var p = String(phone || '').replace(/\\D/g, '');\n    return /^0[567]\\d{8}$/.test(p) ? 'https://wa.me/213' + p.slice(1) : '';\n  }\n\n  function pageTracking() {\n    view.innerHTML = '<div id=\"track\"><p class=\"loading\">Chargement…</p></div>';\n    loadTracking();\n  }\n\n  function loadTracking() {\n    var t = ++S.token;\n    return call('api_trackingOverview', S.track.days).then(function (d) {\n      if (t !== S.token || S.route !== 'suivi') return;\n      S.track.data = d;\n      setAlertCount(d.alerts.filter(function (a) { return a.level !== 'info'; }).length);\n      renderTracking();\n    }).catch(function (e) {\n      if (t === S.token && S.route === 'suivi') $('#track').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderTracking() {\n    var d = S.track.data;\n    var box = $('#track');\n    if (!d || !box) return;\n    var m = d.money;\n    var toReceive = m.delivered.amount + m.cashed.amount + m.ready.amount;\n    var html = '<div class=\"page-head\"><div><h1>Suivi des colis</h1><p class=\"sub\">' +\n      (d.lastSync ? 'Statuts relus ' + h(ago(d.lastSync)) + ' · automatiquement toutes les 30 minutes' : 'Statuts pas encore relus') + '</p></div>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"track-sync\">Actualiser les statuts</button></div>';\n    html += '<div class=\"stack\">';\n    if (!d.configured) {\n      html += '<div class=\"card\"><h2>Ecotrack n’est pas encore configuré</h2><p class=\"sub\">Enregistrez l’adresse et le jeton dans le classeur (menu DZ Smart Shop › Ecotrack), puis créez vos premiers colis dans la page Expéditions.</p></div>';\n    }\n    if (d.lastError) html += errorBox(d.lastError);\n\n    // Argent\n    var periods = [[7, '7 jours'], [30, '30 jours'], [90, '90 jours']];\n    html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Où est l’argent</h2><p class=\"muted\">Montants à encaisser, avant déduction des frais d’Ecotrack. À recevoir : <strong>' + money(toReceive) + '</strong></p></div>' +\n      '<div class=\"seg\" role=\"group\" aria-label=\"Période des paiements reçus\">' + periods.map(function (p) {\n        return '<button type=\"button\" data-act=\"track-days\" data-days=\"' + p[0] + '\" aria-pressed=\"' + (d.days === p[0]) + '\">' + p[1] + '</button>';\n      }).join('') + '</div></div>' +\n      '<div class=\"grid-kpi\">' + [\n        ['Chez le livreur', m.enRoute, 'Colis pas encore livrés'],\n        ['Livrés, pas encaissés', m.delivered, 'Le livreur n’a pas encore remis l’argent'],\n        ['Encaissés, pas payés', m.cashed, 'Ecotrack a l’argent, pas encore versé'],\n        ['Prêts à être versés', m.ready, 'Paiement prêt chez Ecotrack'],\n        ['Payés (' + d.days + ' jours)', m.paid, 'Argent reçu']\n      ].map(function (k) {\n        return '<div class=\"kpi\" style=\"padding:4px 0\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + money(k[1].amount) + '</span><span class=\"note\">' + plural(k[1].count, 'colis', 'colis') + ' · ' + h(k[2]) + '</span></div>';\n      }).join('') + '</div></section>';\n\n    // Alertes\n    html += '<section class=\"card\"><h2>À traiter · ' + d.alerts.length + '</h2>';\n    if (!d.alerts.length) {\n      html += '<p class=\"empty\" style=\"padding:18px 0\">Rien à traiter : vos colis avancent normalement (alerte après ' + d.alertHours + ' h sans mouvement).</p>';\n    } else {\n      html += d.alerts.map(function (a) {\n        var lv = LEVELS[a.level] || LEVELS.info;\n        var wa = waLink(a.phone);\n        return '<div class=\"result-row\"><span class=\"pill\" style=\"min-width:96px;text-align:center;background:' + lv.bg + ';color:' + lv.fg + '\">' + lv.label + '</span>' +\n          '<span class=\"grow\"><strong>' + h(a.title) + '</strong> · <button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(a.id) + '\">' + h(a.id) + '</button> · ' + h(a.client) + ' · ' + h(wilayaName(a.wilaya)) +\n          '<br><span class=\"small\" style=\"color:var(--ink-2)\">' + h(a.detail) + '</span>' +\n          '<br><span class=\"small mono\">' + h(a.tracking) + ' · ' + h(a.carrierLabel || 'statut pas encore lu') + ' · depuis ' + h(ago(a.since).replace(/^il y a /, '')) + '</span></span>' +\n          '<span class=\"quick\">' +\n            (/^0\\d{8,9}$/.test(String(a.phone).replace(/\\D/g, '')) ? '<a class=\"btn\" style=\"min-height:40px\" href=\"tel:' + h(a.phone) + '\" target=\"_top\">Appeler</a>' : '') +\n            (wa ? '<a class=\"btn\" style=\"min-height:40px\" href=\"' + h(wa) + '\" target=\"_blank\" rel=\"noopener\">WhatsApp</a>' : '') +\n            '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"track-history\" data-id=\"' + h(a.id) + '\">Chronologie</button>' +\n            '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"track-done\" data-id=\"' + h(a.id) + '\">Marquer comme traité</button></span></div>';\n      }).join('');\n    }\n    html += '</section>';\n\n    // Colis en cours\n    var f = S.track.filter;\n    var shown = d.parcels.filter(function (p) { return f === 'all' || p.group === f; });\n    html += '<section class=\"card\"><h2>Colis en cours · ' + d.parcels.length + '</h2><div class=\"chips\" role=\"group\" aria-label=\"Filtrer les colis\" style=\"margin-bottom:12px\">' +\n      GROUPS.map(function (g) {\n        var n = g[0] === 'all' ? d.parcels.length : d.parcels.filter(function (p) { return p.group === g[0]; }).length;\n        return '<button type=\"button\" class=\"chip\" data-act=\"track-filter\" data-group=\"' + g[0] + '\" aria-pressed=\"' + (f === g[0]) + '\">' + g[1] + ' · ' + n + '</button>';\n      }).join('') + '</div>';\n    if (!shown.length) {\n      html += '<p class=\"empty\" style=\"padding:18px 0\">Aucun colis dans cette catégorie.</p>';\n    } else {\n      html += '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' +\n        ['Commande', 'Wilaya', 'N° de suivi', 'Statut Ecotrack', 'Depuis', 'Total', ''].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>' +\n        shown.map(function (p) {\n          return '<tr><td data-label=\"Commande\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(p.id) + '\">' + h(p.id) + '</button><div class=\"small\">' + h(p.client) + '</div></td>' +\n            '<td data-label=\"Wilaya\">' + h(wilayaName(p.wilaya)) + '</td>' +\n            '<td data-label=\"N° de suivi\" class=\"mono\">' + h(p.tracking) + '</td>' +\n            '<td data-label=\"Statut Ecotrack\">' + h(p.carrierLabel || '—') + (p.stale ? ' <span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">' + (p.group === 'draft' ? 'à valider' : 'sans mouvement') + '</span>' : '') + '</td>' +\n            '<td data-label=\"Depuis\">' + h(hoursText(p.ageHours)) + '</td>' +\n            '<td data-label=\"Total\" class=\"num strong\">' + money(p.total) + '</td>' +\n            '<td data-label=\"\"><button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"track-history\" data-id=\"' + h(p.id) + '\">Chronologie</button></td></tr>';\n        }).join('') + '</tbody></table></div>';\n    }\n    html += '</section>';\n\n    // Versements\n    html += '<section class=\"card\"><h2>Versements d’Ecotrack (' + d.days + ' jours)</h2>';\n    if (!d.payments.length) {\n      html += '<p class=\"empty\" style=\"padding:18px 0\">Aucun versement sur la période. Le n° de versement s’affiche dès qu’Ecotrack le fournit.</p>';\n    } else {\n      html += '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' +\n        ['Versement', 'Colis', 'Montant', 'État', 'Dernier mouvement'].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>' +\n        d.payments.map(function (p) {\n          return '<tr><td data-label=\"Versement\" class=\"mono\">n° ' + h(p.id) + '</td><td data-label=\"Colis\">' + p.count + '</td>' +\n            '<td data-label=\"Montant\" class=\"num strong\">' + money(p.amount) + '</td>' +\n            '<td data-label=\"État\"><span class=\"pill\" style=\"background:' + (p.paid ? '#DDF0E4;color:#146C2E' : '#FFF3DC;color:#8A5200') + '\">' + (p.paid ? 'Payé' : 'En cours') + '</span></td>' +\n            '<td data-label=\"Dernier mouvement\" class=\"small\">' + fmtDate(p.last) + '</td></tr>';\n        }).join('') + '</tbody></table></div>';\n    }\n    html += '</section></div>';\n    box.innerHTML = html;\n  }\n\n  /* Chronologie d'un colis : dans la fiche de la commande si elle est ouverte, sinon dans une fenêtre. */\n  function historyHtml(d) {\n    var html = '<div style=\"margin-top:12px\"><p class=\"small\">Colis <span class=\"mono\">' + h(d.tracking) + '</span>' + (d.carrierLabel ? ' · ' + h(d.carrierLabel) : '') + '</p>';\n    if (!d.events.length) {\n      html += '<p>Ecotrack n’a renvoyé aucune étape que l’outil sache lire.</p>' +\n        (d.raw ? '<details><summary class=\"small\">Réponse brute d’Ecotrack (à m’envoyer si besoin)</summary><pre class=\"mono\" style=\"white-space:pre-wrap;font-size:12px;overflow:auto\">' + h(d.raw) + '</pre></details>' : '');\n    } else {\n      html += '<ol class=\"timeline\">' + d.events.map(function (e) {\n        return '<li><span class=\"t-date\">' + (e.date ? fmtDate(e.date) : h(e.dateText || '—')) + '</span><span class=\"t-body\"><strong>' + h(e.label) + '</strong>' +\n          (e.note ? '<br><span class=\"small\">' + h(e.note) + '</span>' : '') + '</span></li>';\n      }).join('') + '</ol>';\n    }\n    return html + '</div>';\n  }\n\n  function openHistory(id) {\n    var inOrder = !!$('#parcel-history') && !!$('#order-form');\n    if (inOrder) {\n      $('#parcel-history').innerHTML = '<p class=\"loading\" style=\"padding:12px 0\">Chargement…</p>';\n    } else {\n      showModal(modalHead('Chronologie · ' + h(id)) + '<div id=\"history-body\"><p class=\"loading\">Chargement…</p></div>' +\n        '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button></div>');\n    }\n    call('api_parcelHistory', id).then(function (d) {\n      var el = inOrder ? $('#parcel-history') : $('#history-body');\n      if (el) el.innerHTML = historyHtml(d);\n    }).catch(function (e) {\n      var el = inOrder ? $('#parcel-history') : $('#history-body');\n      if (el) el.innerHTML = '<div style=\"margin-top:12px\">' + errorBox(e) + '</div>';\n    });\n  }\n\n  /* ================================================================ */\n  /* Événements                                                       */\n  /* ================================================================ */\n\n  var ACTIONS = {\n    'goto': function (el) { navigate(el.getAttribute('data-route'), el.getAttribute('data-status')); },\n    'period': function (el) { S.period = el.getAttribute('data-period'); pageDashboard(); },\n    'chip': function (el) { S.filter.status = el.getAttribute('data-status'); S.filter.limit = 100; loadOrders(); },\n    'more': function () { S.filter.limit += 100; loadOrders(); },\n    'open-order': function (el) { openOrder(el.getAttribute('data-id')); },\n    'new-order': openNewOrder,\n    'releasit-transfer': function () {\n      toast('Lecture de l’onglet RELEASIT…');\n      call('api_releasitTransfer').then(function (r) {\n        toast(r.message);\n        loadShopStatus();\n        loadOrders();\n        refreshCount();\n      }).catch(function (e) { toast(errText(e), true); loadShopStatus(); });\n    },\n    'shop-import': function () {\n      toast('Importation depuis Shopify…');\n      call('api_shopifyImport').then(function (r) {\n        toast(r.message);\n        loadShopStatus();\n        loadOrders();\n        refreshCount();\n      }).catch(function (e) { toast(errText(e), true); loadShopStatus(); });\n    },\n    'close-modal': closeModal,\n    'save-order': saveOrder,\n    'parcel-cancel-ask': function (el) { askCancelParcel(el.getAttribute('data-id'), el.getAttribute('data-tracking'), el.getAttribute('data-from') === 'ship'); },\n    'parcel-cancel': cancelParcel,\n    'order-delete-ask': function (el) { askDeleteOrder(el.getAttribute('data-id')); },\n    'order-delete': deleteOrder,\n    'order-reopen': reopenOrder,\n    'order-unlock': function (el) { S.unlockId = el.getAttribute('data-id'); if (S.order) renderOrderModal(S.order); },\n    'create-order': createOrder,\n    'toggle-blacklist': toggleBlacklist,\n    'refresh-queue': function () {\n      loadQueue(false);\n      syncReleasit(function () { if (S.route === 'confirmation') loadQueue(false); });\n    },\n    'q-open': function (el) { if (!S.busy) openInDetail(el.getAttribute('data-id')); },\n    'toggle-queue': function () { $('#queue').classList.toggle('open'); },\n    'confirm': function () { submit('confirm'); },\n    'no_answer': function () { submit('no_answer'); },\n    'show-callback': function () { showPanel('callback'); },\n    'show-cancel': function () { showPanel('cancel'); },\n    'cb-quick': function (el) {\n      var d = new Date();\n      if (el.hasAttribute('data-min')) d = new Date(Date.now() + Number(el.getAttribute('data-min')) * 60000);\n      else { d.setDate(d.getDate() + 1); d.setHours(Number(el.getAttribute('data-tomorrow')), 0, 0, 0); }\n      submit('callback', { callback: d.toISOString() });\n    },\n    'callback': function () {\n      var v = $('#cb-when').value;\n      if (!v) { toast('Choisissez une date et une heure.', true); return; }\n      submit('callback', { callback: new Date(v).toISOString() });\n    },\n    'cancel': function () { submit('cancel', { reason: $('#cancel-reason').value }); },\n    'ship-reload': function () { loadShipping(); },\n    'ship-tab': function (el) { S.ship.tab = el.getAttribute('data-tab'); renderShipping(); },\n    'ship-dismiss': function () { S.ship.results = null; renderShipping(); },\n    'ship-ask': askShip,\n    'ship-confirm': doShip,\n    'eco-test': function () { ecoAction('api_ecotrackTest', 'Test de la connexion…'); },\n    'eco-status': function () { ecoAction('api_ecotrackSyncStatuses', 'Lecture des statuts chez Ecotrack…'); },\n    'eco-fees-ask': function () {\n      confirmModal('Récupérer les tarifs Ecotrack ?',\n        'Les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de l’onglet Tarifs seront remplacées par les prix d’Ecotrack. Les prix Yalidine ne changent pas.',\n        'eco-fees', 'Récupérer');\n    },\n    'eco-fees': function () { closeModal(); ecoAction('api_ecotrackSyncFees', 'Récupération des tarifs…'); },\n    'track-sync': function () {\n      toast('Lecture des statuts chez Ecotrack…');\n      call('api_ecotrackSyncStatuses').then(function (r) { toast(r.message); loadTracking(); refreshCount(); })\n        .catch(function (e) { toast(errText(e), true); });\n    },\n    'track-days': function (el) { S.track.days = Number(el.getAttribute('data-days')); loadTracking(); },\n    'track-filter': function (el) { S.track.filter = el.getAttribute('data-group'); renderTracking(); },\n    'track-history': function (el) { openHistory(el.getAttribute('data-id')); },\n    'track-done': function (el) {\n      el.disabled = true;\n      call('api_markFollowUp', el.getAttribute('data-id')).then(function () {\n        toast('Alerte marquée comme traitée');\n        loadTracking();\n        refreshCount();\n      }).catch(function (e) { el.disabled = false; toast(errText(e), true); });\n    }\n  };\n\n  document.addEventListener('click', function (e) {\n    if (e.target.classList && e.target.classList.contains('modal-backdrop')) { closeModal(); return; }\n    var el = e.target.closest('[data-act]');\n    if (!el || el.disabled) return;\n    var fn = ACTIONS[el.getAttribute('data-act')];\n    if (!fn) return;\n    e.preventDefault();\n    e.stopPropagation();\n    fn(el, e);\n  });\n\n  var searchTimer = null;\n  document.addEventListener('input', function (e) {\n    if (e.target.id === 'f-q') {\n      clearTimeout(searchTimer);\n      searchTimer = setTimeout(function () { S.filter.q = e.target.value; S.filter.limit = 100; loadOrders(); }, 350);\n    } else if (e.target.closest('#d-form')) {\n      updateSummary();\n    }\n  });\n  document.addEventListener('change', function (e) {\n    if (e.target.hasAttribute('data-ship-check')) {\n      var sid = e.target.getAttribute('data-ship-check');\n      if (e.target.checked) S.ship.selected[sid] = true; else delete S.ship.selected[sid];\n      renderShipping();\n      return;\n    }\n    if (e.target.hasAttribute('data-ship-all')) {\n      S.ship.selected = {};\n      if (e.target.checked && S.ship.data) {\n        S.ship.data.toShip.forEach(function (o) { if (!o.problems.length) S.ship.selected[o.id] = true; });\n      }\n      renderShipping();\n      return;\n    }\n    if (e.target.id === 'f-wilaya') { S.filter.wilaya = e.target.value; S.filter.limit = 100; loadOrders(); }\n    else if (e.target.id === 'f-period') { S.filter.period = e.target.value; S.filter.limit = 100; loadOrders(); }\n    else if (e.target.getAttribute('data-role') === 'status') toggleCancelField();\n    else if (e.target.closest('#d-form')) updateSummary();\n  });\n  document.addEventListener('keydown', function (e) {\n    if (e.key === 'Escape' && modalOpen()) closeModal();\n  });\n\n  function tick() {\n    if (document.visibilityState !== 'visible' || S.busy || modalOpen()) return;\n    if (S.route === 'confirmation') loadQueue(false);\n    else if (S.route === 'suivi') loadTracking();\n    else refreshCount();\n  }\n\n  /* ================================================================ */\n  /* Démarrage                                                        */\n  /* ================================================================ */\n\n  call('api_bootstrap').then(function (b) {\n    S.boot = b;\n    $all('[data-shop]').forEach(function (el) { el.textContent = b.shop; });\n    $all('[data-user-name]').forEach(function (el) { el.textContent = b.user.name; });\n    $all('[data-user-mail]').forEach(function (el) { el.textContent = b.user.email; });\n    window.addEventListener('hashchange', go);\n    go();\n    if (S.route !== 'confirmation') refreshCount();\n    setInterval(tick, 60000);\n  }).catch(function (e) {\n    view.innerHTML = errorBox(e) +\n      '<p class=\"sub\" style=\"margin-top:12px\">Vérifiez que le classeur est partagé avec votre adresse Google (en Éditeur), puis rechargez la page.</p>';\n  });\n})();\n</script>\n"
};
