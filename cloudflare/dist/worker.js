// DZ Smart Shop 1.4.0 — version Cloudflare (fichier généré par cloudflare/build.js, ne pas modifier).

function makeApp() {
var REQ = null;
/*
 * Remplaçants des services Google Apps Script, pour faire tourner le code de apps-script/*.gs
 * dans Cloudflare Workers. Placé dans la fonction makeApp (voir build.js), avant ce code.
 *
 * Tout ce que le code lit ou écrit pendant une requête passe par REQ (préparé par server.js) :
 * les commandes utiles à la requête, les réglages, les propriétés. Les écritures sont gardées
 * dans REQ, puis enregistrées dans D1 en une fois, à la fin de la requête.
 */

var ALGIERS_OFFSET_MS_ = 3600000; // Algérie : UTC+1 toute l'année

/** Date découpée à l'heure d'Algérie. */
function algiersParts_(d) {
  var t = new Date(d.getTime() + ALGIERS_OFFSET_MS_);
  return {
    y: t.getUTCFullYear(), M: t.getUTCMonth() + 1, d: t.getUTCDate(), H: t.getUTCHours(),
    m: t.getUTCMinutes(), s: t.getUTCSeconds(), wd: t.getUTCDay()
  };
}

function pad2_(n) { return ('0' + n).slice(-2); }

var Utilities = {
  /** Formats utilisés par l'outil : yyyy, yy, MM, dd, HH, H, mm, ss, EEE, et du texte entre apostrophes. */
  formatDate: function (date, tz, fmt) {
    var d = date instanceof Date ? date : new Date(date);
    var p = algiersParts_(d);
    var out = '';
    var i = 0;
    while (i < fmt.length) {
      var c = fmt[i];
      if (c === "'") {
        var j = fmt.indexOf("'", i + 1);
        if (j < 0) j = fmt.length;
        out += fmt.slice(i + 1, j);
        i = j + 1;
        continue;
      }
      var k = i;
      while (k < fmt.length && fmt[k] === c) k++;
      var n = k - i;
      if (c === 'y') out += n === 2 ? String(p.y).slice(-2) : String(p.y);
      else if (c === 'M') out += pad2_(p.M);
      else if (c === 'd') out += pad2_(p.d);
      else if (c === 'H') out += n === 1 ? String(p.H) : pad2_(p.H);
      else if (c === 'm') out += pad2_(p.m);
      else if (c === 's') out += pad2_(p.s);
      else if (c === 'E') out += ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][p.wd];
      else out += fmt.slice(i, k);
      i = k;
    }
    return out;
  },
  getUuid: function () { return crypto.randomUUID(); },
  sleep: function () {},
  DigestAlgorithm: { SHA_256: 'SHA-256', MD5: 'MD5' },
  Charset: { UTF_8: 'UTF-8' }
};

var Session = {
  getActiveUser: function () { return { getEmail: function () { return REQ && REQ.user ? REQ.user.email : ''; } }; },
  getEffectiveUser: function () { return { getEmail: function () { return REQ && REQ.user ? REQ.user.email : ''; } }; },
  getScriptTimeZone: function () { return 'Africa/Algiers'; }
};

/** Mémoire de la requête (CacheService) : vide au début de chaque requête. */
var CacheService = {
  getScriptCache: function () {
    var c = REQ ? REQ.cache : {};
    return {
      get: function (k) { return Object.prototype.hasOwnProperty.call(c, k) ? c[k] : null; },
      put: function (k, v) { c[k] = String(v); },
      remove: function (k) { delete c[k]; },
      removeAll: function (keys) { (keys || []).forEach(function (k) { delete c[k]; }); },
      getAll: function (keys) { var o = {}; (keys || []).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(c, k)) o[k] = c[k]; }); return o; },
      putAll: function (v) { Object.keys(v || {}).forEach(function (k) { c[k] = String(v[k]); }); }
    };
  }
};

/** Propriétés du script : table kv de D1 (lues au début de la requête, écrites à la fin). */
var PropertiesService = {
  getScriptProperties: function () {
    var p = REQ ? REQ.props : {};
    var w = REQ ? REQ.propWrites : {};
    return {
      getProperty: function (k) { return Object.prototype.hasOwnProperty.call(p, k) ? p[k] : null; },
      setProperty: function (k, v) { p[k] = String(v); w[k] = String(v); return this; },
      deleteProperty: function (k) { delete p[k]; w[k] = null; return this; },
      getProperties: function () { return Object.assign({}, p); },
      setProperties: function (o) { var self = this; Object.keys(o || {}).forEach(function (k) { self.setProperty(k, o[k]); }); return this; },
      getKeys: function () { return Object.keys(p); }
    };
  }
};
PropertiesService.getUserProperties = PropertiesService.getScriptProperties;

/** Pas de verrou : chaque commande a un n° de version, vérifié à l'enregistrement (voir server.js). */
var LockService = {
  getScriptLock: function () { return { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {}, hasLock: function () { return true; } }; },
  getDocumentLock: function () { return LockService.getScriptLock(); }
};

function notOnCloudflare_(what) {
  return function () { throw new Error('« ' + what + ' » n’est pas encore disponible dans la version Cloudflare.'); };
}

var SpreadsheetApp = {
  getActiveSpreadsheet: function () { return null; },
  openById: notOnCloudflare_('Classeur Google'),
  getUi: notOnCloudflare_('Menu du classeur'),
  newDataValidation: notOnCloudflare_('Classeur Google'),
  newConditionalFormatRule: notOnCloudflare_('Classeur Google')
};
var UrlFetchApp = { fetch: notOnCloudflare_('Appel à un service extérieur'), fetchAll: notOnCloudflare_('Appel à un service extérieur') };
var HtmlService = { createHtmlOutput: notOnCloudflare_('Page Apps Script'), createTemplate: notOnCloudflare_('Page Apps Script') };
var ScriptApp = { getProjectTriggers: function () { return []; }, newTrigger: notOnCloudflare_('Déclencheur'), getService: function () { return { getUrl: function () { return ''; } }; } };
var MailApp = { sendEmail: function () {}, getRemainingDailyQuota: function () { return 0; } };
var DriveApp = {};
var Logger = { log: function () {} };

/* ---- Config.gs ---- */
/**
 * DZ Smart Shop — gestion des commandes COD sur Google Sheets.
 *
 * Config.gs : noms des onglets, colonnes, statuts et réglages par défaut.
 * Tout le reste du code lit ces constantes : pour renommer un statut ou
 * une colonne, c'est ici qu'il faut le faire.
 */

var APP_NAME = 'DZ Smart Shop';
var APP_VERSION = '1.4.0';

/** Noms des onglets du classeur. */
var SHEET = {
  ORDERS: 'Commandes',
  CLIENTS: 'Clients',
  PRODUCTS: 'Produits',
  RATES: 'Tarifs',
  TEAM: 'Équipe',
  SETTINGS: 'Paramètres',
  LOG: 'Journal',
  ARCHIVE: 'Archive',
  EXPENSES: 'Dépenses',
  MOVES: 'Mouvements stock'
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
  { key: 'label', title: 'Bordereau imprimé', kind: 'auto', width: 230, aliases: ['Bordereau'] },
  { key: 'followNext', title: 'Relance suivi le', kind: 'auto', width: 140, aliases: [] },
  { key: 'followCalls', title: 'Appels suivi', kind: 'auto', width: 100, aliases: [] },
  { key: 'courierNote', title: 'Remarque livreur', kind: 'auto', width: 240, aliases: ['Remarque du livreur'] },
  { key: 'deliveredAt', title: 'Livrée le', kind: 'auto', width: 130, aliases: ['Date de livraison'] },
  { key: 'alert', title: 'Alerte client', kind: 'auto', width: 160, aliases: ['Alerte'] },
  { key: 'notes', title: 'Notes', kind: 'in', width: 200, aliases: ['Note', 'Remarque', 'Commentaire'] },
  { key: 'source', title: 'Source', kind: 'auto', width: 90, aliases: [] },
  { key: 'campaign', title: 'Campagne', kind: 'auto', width: 150, aliases: ['Campagne pub', 'UTM campaign'] },
  { key: 'adSource', title: 'Source pub', kind: 'auto', width: 100, aliases: ['UTM source', 'Plateforme pub'] },
  { key: 'shopifyId', title: 'ID Shopify', kind: 'auto', width: 130, aliases: ['Shopify ID'] },
  { key: 'dayCalls', title: 'Appels du jour', kind: 'auto', width: 120, aliases: [] },
  { key: 'stockMove', title: 'Mouvement stock', kind: 'auto', width: 120, aliases: [] },
  { key: 'sms', title: 'SMS envoyés', kind: 'auto', width: 160, aliases: [] },
  { key: 'callLog', title: 'Historique appels', kind: 'auto', width: 280, aliases: ['Historique des appels'] },
  { key: 'confirmedAt', title: 'Confirmée le', kind: 'auto', width: 130, aliases: ['Date de confirmation'] },
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
  ['APPELS_PAR_JOUR', 3, 'Appels sans réponse au maximum par jour (espacés de DELAI_RAPPEL_MINUTES). Ensuite, rappel le lendemain'],
  ['JOURS_D_APPELS', 3, 'Nombre de jours d’appels, comptés depuis l’arrivée de la commande'],
  ['ANNULATION_AUTO', 'OUI', 'OUI : sans réponse après les jours d’appels, la commande est annulée (motif « Injoignable »). NON : elle passe « Injoignable »'],
  ['HEURE_DEBUT_APPELS', 9, 'Heure du premier rappel du lendemain (heure d’Algérie)'],
  ['ORDRE_FILE', 'récentes', 'Ordre des nouvelles commandes dans la file d’appels : « récentes » (les plus récentes d’abord) ou « anciennes »'],
  ['DELAI_RAPPEL_MINUTES', 120, "Délai avant de rappeler un client qui n'a pas répondu"],
  ['ATTENTE_MAX_HEURES', 24, 'Une commande ni confirmée ni annulée qui attend depuis ce nombre d’heures est marquée « en retard » dans Confirmation'],
  ['DOUBLON_HEURES', 48, 'Deux commandes du même numéro dans ce délai = alerte « Doublon »'],
  ['SOCIETE_PAR_DEFAUT', 'Yalidine', "Société utilisée pour calculer les frais quand aucune n'est choisie"],
  ['MOTIFS_ANNULATION', "Faux numéro; Client a changé d'avis; Trop cher; Doublon; Commande test; Délai trop long; Autre", "Motifs proposés à l'annulation, séparés par des points-virgules"],
  ['SUIVI_ECOTRACK_MINUTES', 60, 'Lecture automatique des statuts Ecotrack : toutes les 30, 60 ou 120 minutes. Le bouton « Actualiser les statuts » du Suivi lit tout de suite'],
  ['SUIVI_ALERTE_HEURES', 26, "Un colis créé chez Ecotrack mais pas encore validé depuis ce nombre d'heures est signalé"],
  ['SUIVI_HEURES_TRI', 48, 'Colis au ramassage ou au centre de tri sans mouvement depuis ce nombre d’heures : alerte « sans mouvement »'],
  ['SUIVI_HEURES_ROUTE', 72, 'Colis en route vers la wilaya (ou en préparation avant livraison) sans mouvement depuis ce nombre d’heures : alerte « sans mouvement »'],
  ['SUIVI_HEURES_SUD', 120, 'Même délai pour les wilayas du Sud (liste WILAYAS_SUD)'],
  ['SUIVI_HEURES_LIVRAISON', 24, 'Colis « en livraison » depuis ce nombre d’heures sans être livré : alerte « sans mouvement »'],
  ['WILAYAS_SUD', '1; 8; 11; 30; 33; 37; 47; 49; 50; 52; 53; 54; 55; 56; 57; 58', 'Wilayas du Sud (numéros ou noms, séparés par des points-virgules) : délai SUIVI_HEURES_SUD au lieu de SUIVI_HEURES_ROUTE'],
  ['RETOUR_BLOQUE_JOURS', 7, 'Un retour en route depuis ce nombre de jours sans arriver : alerte « retour bloqué » (réclamez-le à la société de livraison)'],
  ['ARGENT_RETARD_JOURS', 5, 'Un colis livré depuis ce nombre de jours et toujours pas payé : alerte « argent en retard »'],
  ['MOTS_INJOIGNABLE', 'injoignable; ne repond pas; repond pas; pas de reponse; ne decroche pas; eteint; messagerie; لا يرد; ما يردش; مايردش; ميردش; مغلق; خارج التغطية', 'Mots d’une remarque du livreur qui veulent dire « client injoignable », séparés par des points-virgules (accents et majuscules ignorés)'],
  ['MOTS_REFUS', 'refus; annule; ne veut plus; ne veut pas; رفض; رافض; ما حبش; ماحبش; ملغي; الغاء', 'Mots d’une remarque du livreur qui veulent dire « refus »'],
  ['MOTS_REPORTE', 'report; demain; plus tard; absent; pas disponible; indisponible; voyage; غدا; غدوة; من بعد; مسافر; غير موجود', 'Mots d’une remarque du livreur qui veulent dire « reporté »'],
  ['MOTS_ADRESSE', 'adresse; introuvable; localisation; عنوان', 'Mots d’une remarque du livreur qui veulent dire « problème d’adresse »'],
  ['FORMAT_BORDEREAU', 'A4', 'Format proposé pour imprimer les bordereaux : « A4 » (4 par feuille, imprimante normale) ou « 10x15 » (1 par étiquette, imprimante thermique). Chaque appareil retient ensuite son propre choix'],
  ['RAMASSAGE', 'OUI', 'OUI : « Demander le ramassage » est coché par défaut quand vous validez l’expédition depuis l’outil. NON : décoché (vous déposez les colis à l’agence)'],
  ['SHOPIFY_TAG', 'releasit_cod_form', "Seules les commandes Shopify portant cette étiquette sont importées (celle de Releasit COD). Laissez vide pour tout importer"],
  ['SHOPIFY_JOURS_INITIAL', 3, "Première importation : commandes des N derniers jours seulement (les plus anciennes sont ignorées)"],
  ['SHOPIFY_API_VERSION', '2026-04', "Version de l'API Shopify utilisée. À changer seulement si Shopify signale que cette version n'est plus prise en charge"],
  ['FRAIS_RETOUR', 50, 'Frais payés à la société de livraison pour un colis retourné (DA)'],
  ['COUT_EMBALLAGE', 0, 'Coût d’emballage par commande expédiée (DA). 0 = pas compté'],
  ['TAUX_DOLLAR', 250, 'Prix d’un dollar en dinars, pour les dépenses en USD (publicité). Mettez-le à jour quand il change : les dépenses déjà saisies gardent leur taux'],
  ['PRIMES', '', 'Prime des confirmatrices par commande livrée, en dinars, avec sa date de début : « 2026-11-01=50; 2027-01-01=60 ». Chaque commande prend le montant valable à sa date (se règle dans Statistiques › Équipe). Vide = pas de prime'],
  ['CATEGORIES_DEPENSES', 'Publicité Facebook; Publicité TikTok; Emballage; Salaires; Loyer; Autre', 'Catégories proposées dans l’onglet Dépenses, séparées par des points-virgules'],
  ['CATEGORIES_GAINS', 'Remboursement; Vente directe; Bonus; Autre', 'Catégories proposées pour les gains (argent reçu en dehors des commandes), séparées par des points-virgules'],
  ['COUT_MOYEN', 'OUI', 'OUI : à chaque entrée de marchandise, le coût d’achat devient la moyenne (ancien stock et nouvelle entrée). NON : le coût d’achat ne change que si vous le modifiez'],
  ['STOCK_SEUIL', 2, 'Un modèle dont le stock disponible tombe à ce nombre (ou moins) est signalé « stock bas ». Le seuil d’une ligne de l’onglet Produits passe avant'],
  ['SMS_HEURES', '0-24', 'Heures d’envoi des SMS (heure d’Algérie), par exemple 8-21 : en dehors, ils attendent. 0-24 ou vide = à toute heure'],
  ['SMS_A_CONFIRMER', 'شكرا {prenom}، وصلنا طلبك {numero}. سنتصل بك قريبا للتأكيد. {boutique}', 'SMS envoyé quand la commande arrive (« À confirmer »). Vide = pas de SMS. Champs : {prenom} {client} {numero} {produit} {total} {suivi} {commune} {wilaya} {boutique}'],
  ['SMS_PAS_DE_REPONSE', 'اتصلنا بك لتأكيد طلبك {numero}. نرجو الرد على مكالمتنا. {boutique}', 'SMS « Pas de réponse » (vide = pas de SMS)'],
  ['SMS_RAPPELER', '', 'SMS « Rappeler » (vide = pas de SMS)'],
  ['SMS_INJOIGNABLE', '', 'SMS « Injoignable » (vide = pas de SMS)'],
  ['SMS_CONFIRMEE', 'تم تأكيد طلبك {numero}. التوصيل خلال 24 إلى 72 ساعة. {boutique}', 'SMS « Confirmée » (vide = pas de SMS)'],
  ['SMS_EXPEDIEE', 'طلبك {numero} في الطريق. رقم التتبع: {suivi}', 'SMS « Expédiée » (vide = pas de SMS)'],
  ['SMS_EN_LIVRAISON', 'طلبك مع الموزع اليوم. حضّر {total} دج من فضلك. {boutique}', 'SMS « En livraison » (vide = pas de SMS)'],
  ['SMS_LIVREE', '', 'SMS « Livrée » (vide = pas de SMS)'],
  ['SMS_LIVREUR_INJOIGNABLE', 'حاول الموزع الاتصال بك لتوصيل طلبك {numero}. يرجى الرد على المكالمة أو الاتصال بنا. {boutique}', 'SMS quand le livreur signale le client injoignable (ou suspend le colis sans remarque). Une seule fois par commande. Vide = pas de SMS'],
  ['SMS_SANS_REPONSE_LIVRAISON', 'اتصلنا بك بخصوص طلبك {numero} الموجود عند الموزع. يرجى الرد أو الاتصال بنا لتأكيد التوصيل. {boutique}', 'SMS quand vous appelez un client pendant la livraison et qu’il ne répond pas (au premier appel seulement). Vide = pas de SMS'],
  ['SMS_RETOUR', '', 'SMS « Retour » (vide = pas de SMS)'],
  ['SMS_ANNULEE', '', 'SMS « Annulée » (vide = pas de SMS)'],
  ['LIMITE_MINUTES_JOUR', 90, 'Temps de travail des tâches automatiques permis par Google chaque jour (environ 90 minutes pour un compte Gmail, 360 pour Google Workspace). Un e-mail vous prévient à 80 %'],
  ['ARCHIVE_JOURS', 100, "Chaque nuit, les commandes terminées sans mouvement depuis ce nombre de jours partent dans l'onglet Archive (une commande livrée dont l'argent n'est pas encore versé reste). 0 = ne jamais archiver"],
  ['CORBEILLE_JOURS', 0, 'Chaque nuit, les commandes dans la corbeille depuis ce nombre de jours sont effacées pour de bon (leur numéro reste bloqué : elles ne reviennent pas). 0 = jamais'],
  ['JOURNAL_JOURS', 90, "Chaque nuit, les lignes du Journal plus anciennes que ce nombre de jours sont effacées. 0 = tout garder"],
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

/* ---- Utils.gs ---- */
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
/**
 * Date envoyée par Ecotrack : { date, dayOnly } ou null.
 * Sans fuseau indiqué, l'heure est celle d'Algérie (UTC+1, sans heure d'été),
 * quel que soit le fuseau du projet Apps Script. timeValue : heure envoyée à part.
 */
function ecoDate_(value, timeValue) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : { date: value, dayOnly: false };
  if (value && typeof value === 'object') return value.date ? ecoDate_(value.date, timeValue) : null; // { date, timezone }
  if (isBlank_(value)) return null;
  var s = String(value).trim();
  if (/^\d{10}(\d{3})?$/.test(s)) return { date: new Date(s.length === 10 ? +s * 1000 : +s), dayOnly: false };
  var y, mo, d, hh, mi, ss, zone = '';
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; hh = m[4]; mi = m[5]; ss = m[6]; zone = m[7] || ''; }
  else {
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:[ T,à]+(\d{1,2})[:h](\d{2})(?::(\d{2}))?)?$/i);
    if (!m) { var any = new Date(s); return isNaN(any.getTime()) ? null : { date: any, dayOnly: false }; }
    d = +m[1]; mo = +m[2]; y = +m[3]; hh = m[4]; mi = m[5]; ss = m[6];
  }
  var dayOnly = hh === undefined;
  if (dayOnly && !isBlank_(timeValue)) {
    var t = String(timeValue).match(/(\d{1,2})[:h](\d{2})(?::(\d{2}))?/);
    if (t) { hh = t[1]; mi = t[2]; ss = t[3]; dayOnly = false; }
  }
  var ms = Date.UTC(y, mo - 1, d, +(hh || 0), +(mi || 0), +(ss || 0));
  if (/^z$/i.test(zone)) { /* déjà en UTC */ }
  else if (zone) {
    var z = zone.match(/([+-])(\d{2}):?(\d{2})/);
    ms -= (z[1] === '-' ? -1 : 1) * (+z[2] * 60 + +z[3]) * 60000;
  } else ms -= 3600000; // heure d'Algérie
  var date = new Date(ms);
  return isNaN(date.getTime()) ? null : { date: date, dayOnly: dayOnly };
}

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
  if (!LOCK_DEPTH_) LOCK_SESSION_++;
  LOCK_DEPTH_++;
  try {
    return withLogBatch_(fn);
  } finally {
    LOCK_DEPTH_--;
    // Ce qui a été fait sous le verrou a peut-être modifié les commandes : la copie en mémoire est oubliée.
    if (!LOCK_DEPTH_) invalidateOrdersCache_();
    // Les SMS des statuts changés sont mis en file d'attente (envoyés en arrière-plan).
    try { flushSmsPending_(); } catch (e) { /* ne bloque jamais l'action */ }
    lock.releaseLock();
  }
}

/** Réglages de l'onglet Paramètres, complétés par les valeurs par défaut (gardés en mémoire). */
function getSettings_() {
  return cached_('cfg:settings', readSettings_);
}

function readSettings_() {
  var s = {};
  DEFAULT_SETTINGS.forEach(function (d) { s[d[0]] = d[1]; });
  var sh = ss_().getSheetByName(SHEET.SETTINGS);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var key = String(r[0]).trim();
      if (key && !isBlank_(r[1])) s[key] = r[1];
      // Ces cases peuvent volontairement rester vides : « pas de filtre », « pas de SMS ».
      else if (key === 'SHOPIFY_TAG' || /^SMS_/.test(key)) s[key] = '';
    });
  }
  var between = function (v, def, min, max) { var n = Math.round(toNumber_(v)); return n >= min && n <= max ? n : def; };
  s.APPELS_PAR_JOUR = between(s.APPELS_PAR_JOUR, 3, 1, 10);
  s.JOURS_D_APPELS = between(s.JOURS_D_APPELS, 3, 1, 15);
  s.HEURE_DEBUT_APPELS = between(s.HEURE_DEBUT_APPELS, 9, 0, 23);
  s.ANNULATION_AUTO = !/^(non|no|false|faux|0)$/i.test(String(s.ANNULATION_AUTO == null ? 'OUI' : s.ANNULATION_AUTO).trim());
  s.ORDRE_FILE = /anc/i.test(String(s.ORDRE_FILE || '')) ? 'anciennes' : 'récentes';
  s.MAX_TENTATIVES = s.APPELS_PAR_JOUR * s.JOURS_D_APPELS; // total des appels possibles
  s.DELAI_RAPPEL_MINUTES = Math.max(5, toNumber_(s.DELAI_RAPPEL_MINUTES) || 120);
  s.DOUBLON_HEURES = Math.max(0, toNumber_(s.DOUBLON_HEURES));
  s.SOCIETE_PAR_DEFAUT = String(s.SOCIETE_PAR_DEFAUT || CARRIERS[0]).trim();
  s.NOM_BOUTIQUE = String(s.NOM_BOUTIQUE || APP_NAME).trim();
  s.MESSAGE_WHATSAPP = String(s.MESSAGE_WHATSAPP || '');
  s.SUIVI_ALERTE_HEURES = Math.max(1, toNumber_(s.SUIVI_ALERTE_HEURES) || 26);
  // 30, 60 ou 120 minutes (la valeur la plus proche).
  var every = toNumber_(s.SUIVI_ECOTRACK_MINUTES) || 60;
  s.SUIVI_ECOTRACK_MINUTES = every <= 45 ? 30 : every <= 90 ? 60 : 120;
  s.ATTENTE_MAX_HEURES = Math.max(1, toNumber_(s.ATTENTE_MAX_HEURES) || 24);
  s.FORMAT_BORDEREAU = /10|15|therm|etiq/i.test(normalizeText_(s.FORMAT_BORDEREAU)) ? '10x15' : 'A4';
  var hoursOf = function (v, def) { var n = toNumber_(v); return n >= 1 ? n : def; };
  s.SUIVI_HEURES_TRI = hoursOf(s.SUIVI_HEURES_TRI, 48);
  s.SUIVI_HEURES_ROUTE = hoursOf(s.SUIVI_HEURES_ROUTE, 72);
  s.SUIVI_HEURES_SUD = hoursOf(s.SUIVI_HEURES_SUD, 120);
  s.SUIVI_HEURES_LIVRAISON = hoursOf(s.SUIVI_HEURES_LIVRAISON, 24);
  s.RETOUR_BLOQUE_JOURS = hoursOf(s.RETOUR_BLOQUE_JOURS, 7);
  s.ARGENT_RETARD_JOURS = hoursOf(s.ARGENT_RETARD_JOURS, 5);
  s.southCodes = {};
  String(s.WILAYAS_SUD || '').split(/[;,]/).forEach(function (w) {
    var code = wilayaCode_(w);
    if (code) s.southCodes[code] = true;
  });
  // Mots-clés des remarques du livreur, écrits comme les remarques comparées (sans accents, arabe simplifié).
  var words = function (v) { return String(v || '').split(';').map(normalizeLoose_).filter(function (w) { return w; }); };
  s.remarkWords = { refus: words(s.MOTS_REFUS), injoignable: words(s.MOTS_INJOIGNABLE), adresse: words(s.MOTS_ADRESSE), reporte: words(s.MOTS_REPORTE) };
  s.RAMASSAGE = !/^(non|no|false|faux|0)$/i.test(String(s.RAMASSAGE == null ? 'OUI' : s.RAMASSAGE).trim());
  // 0 = jamais ; sinon au moins 30 jours, pour ne rien archiver ou effacer par erreur.
  var days = function (v) { var n = Math.round(toNumber_(v)); return n <= 0 ? 0 : Math.max(n, 30); };
  s.ARCHIVE_JOURS = days(s.ARCHIVE_JOURS);
  s.LIMITE_MINUTES_JOUR = Math.max(10, toNumber_(s.LIMITE_MINUTES_JOUR) || 90);
  s.FRAIS_RETOUR = Math.max(0, toNumber_(s.FRAIS_RETOUR));
  s.COUT_EMBALLAGE = Math.max(0, toNumber_(s.COUT_EMBALLAGE));
  s.TAUX_DOLLAR = Math.max(0, toNumber_(s.TAUX_DOLLAR));
  s.STOCK_SEUIL = Math.max(0, Math.round(toNumber_(s.STOCK_SEUIL)));
  s.COUT_MOYEN = !/^(non|no|false|faux|0)$/i.test(String(s.COUT_MOYEN == null ? 'OUI' : s.COUT_MOYEN).trim());
  s.categories = String(s.CATEGORIES_DEPENSES || '').split(';').map(function (c) { return c.trim(); }).filter(function (c) { return c; });
  if (!s.categories.length) s.categories = ['Autre'];
  s.gainCategories = String(s.CATEGORIES_GAINS == null ? '' : s.CATEGORIES_GAINS).split(';').map(function (c) { return c.trim(); }).filter(function (c) { return c; });
  if (!s.gainCategories.length) s.gainCategories = ['Autre'];
  // Heures d'envoi des SMS : « 8-21 » ; vide ou illisible = à toute heure.
  var hours = String(s.SMS_HEURES || '').match(/(\d{1,2})\D+(\d{1,2})/);
  s.smsFrom = hours ? Math.min(+hours[1], 23) : 0;
  s.smsTo = hours ? Math.min(Math.max(+hours[2], s.smsFrom + 1), 24) : 24;
  s.JOURNAL_JOURS = days(s.JOURNAL_JOURS);
  // Corbeille : 0 = jamais ; sinon au moins 7 jours.
  var trashDays = Math.round(toNumber_(s.CORBEILLE_JOURS));
  s.CORBEILLE_JOURS = trashDays <= 0 ? 0 : Math.max(trashDays, 7);
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
  var rows = email ? readTeam_() : [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === email.toLowerCase()) {
      name = rows[i][1];
      role = rows[i][2];
      break;
    }
  }
  if (!name) name = email ? email.split('@')[0] : 'Utilisateur';
  return { email: email, name: name, role: role };
}

/* ------------------------------------------------------------------ */
/* Journal                                                            */
/* ------------------------------------------------------------------ */

/** Lignes du Journal en attente : écrites en une seule fois (voir withLogBatch_). */
var LOG_BATCH_ = null;

/** Lignes de l'onglet Équipe : [email en minuscules, nom, rôle] (gardées en mémoire). */
function readTeam_() {
  return cached_('cfg:team', function () {
    var sh = ss_().getSheetByName(SHEET.TEAM);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().map(function (r) {
      return [String(r[0]).trim().toLowerCase(), String(r[1]).trim(), String(r[2]).trim()];
    }).filter(function (r) { return r[0]; });
  });
}

/** Ajoute une ligne dans l'onglet Journal (qui a fait quoi, quand). */
function log_(user, orderId, action, detail) {
  var row = [new Date(), user ? String(user.name || '') : '', orderId ? String(orderId) : '', action, detail || ''];
  if (LOG_BATCH_) { LOG_BATCH_.push(row); return; }
  writeLogRows_([row]);
}

function writeLogRows_(rows) {
  if (!rows.length) return;
  var sh = ss_().getSheetByName(SHEET.LOG);
  if (!sh) return;
  // Une seule ligne (le cas courant) : un seul appel au classeur, qui s'agrandit tout seul.
  if (rows.length === 1) { sh.appendRow(rows[0]); return; }
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + rows.length - 1);
  sh.getRange(r, 1, rows.length, 5).setValues(rows);
}

/** Exécute fn ; les lignes du Journal qu'il ajoute sont écrites ensemble, à la fin. */
function withLogBatch_(fn) {
  if (LOG_BATCH_) return fn();
  LOG_BATCH_ = [];
  try {
    return fn();
  } finally {
    var rows = LOG_BATCH_;
    LOG_BATCH_ = null;
    writeLogRows_(rows);
  }
}

/**
 * Agrandit l'onglet si la ligne `lastNeeded` dépasse sa taille (écrire au-delà
 * provoque une erreur). Renvoie true si des lignes ont été ajoutées.
 */
function ensureRows_(sh, lastNeeded) {
  var max = sh.getMaxRows();
  if (lastNeeded <= max) return false;
  sh.insertRowsAfter(max, lastNeeded - max + 200);
  return true;
}

/* ------------------------------------------------------------------ */
/* Mémoire des onglets de réglages (Paramètres, Tarifs, Équipe…)      */
/* ------------------------------------------------------------------ */

var CONFIG_TTL_ = 600; // 10 minutes au plus ; vidée dès qu'un de ces onglets est modifié

/** Clés de mémoire à vider quand un onglet change. */
function configKeysFor_(sheetName) {
  var map = {};
  map[SHEET.SETTINGS] = ['cfg:settings'];
  map[SHEET.RATES] = ['cfg:wilayas', 'cfg:rates'];
  map[SHEET.CLIENTS] = ['cfg:clients'];
  map[SHEET.TEAM] = ['cfg:team'];
  map[SHEET.PRODUCTS] = ['cfg:products'];
  return map[sheetName] || [];
}

function allConfigKeys_() {
  return ['cfg:settings', 'cfg:wilayas', 'cfg:rates', 'cfg:clients', 'cfg:team', 'cfg:products'];
}

/** 2850 → « 2 850 » (sans dépendre de la langue du serveur). */
function fmtAmount_(n) {
  return String(Math.round(toNumber_(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Réglages déjà lus pendant cette exécution (texte JSON) : un même réglage n'est lu
 * qu'une fois par action, et tous les onglets de réglages sont demandés à la mémoire
 * en un seul aller-retour (getAll) au premier besoin. Chaque appel de l'application
 * est une nouvelle exécution : rien ne reste d'une action à l'autre.
 */
var CFG_MEMO_ = {};
var CFG_PREFETCHED_ = false;

/** Valeur gardée en mémoire (CacheService) ; calculée par compute() si absente. */
function cached_(key, compute) {
  if (Object.prototype.hasOwnProperty.call(CFG_MEMO_, key)) {
    try { return JSON.parse(CFG_MEMO_[key]); } catch (e) { delete CFG_MEMO_[key]; }
  }
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) { cache = null; }
  if (cache) {
    var hit = null;
    if (!CFG_PREFETCHED_ && allConfigKeys_().indexOf(key) >= 0) {
      // Premier réglage demandé : tous les autres arrivent avec lui.
      CFG_PREFETCHED_ = true;
      try {
        var all = cache.getAll(allConfigKeys_()) || {};
        Object.keys(all).forEach(function (k) { if (all[k] !== null && all[k] !== undefined) CFG_MEMO_[k] = all[k]; });
      } catch (e) { /* mémoire indisponible : lecture une par une */ }
      if (Object.prototype.hasOwnProperty.call(CFG_MEMO_, key)) {
        try { return JSON.parse(CFG_MEMO_[key]); } catch (e) { delete CFG_MEMO_[key]; }
      }
    } else {
      try { hit = cache.get(key); } catch (e) { hit = null; }
      if (hit !== null && hit !== undefined) {
        try { var parsed = JSON.parse(hit); CFG_MEMO_[key] = hit; return parsed; } catch (e) { /* valeur abîmée : on relit l'onglet */ }
      }
    }
  }
  var value = compute();
  try {
    var text = JSON.stringify(value);
    CFG_MEMO_[key] = text;
    if (cache && text.length < 90000) cache.put(key, text, CONFIG_TTL_);
  } catch (e) { /* trop gros ou mémoire indisponible : sans importance */ }
  return value;
}

/** Vide la mémoire (toute, ou seulement certaines clés). */
function clearConfigCache_(keys) {
  (keys || allConfigKeys_()).forEach(function (k) { delete CFG_MEMO_[k]; });
  try { CacheService.getScriptCache().removeAll(keys || allConfigKeys_()); } catch (e) { /* sans importance */ }
}

/* ---- Orders.gs ---- */
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
  var sh = null;
  var values = cachedOrderValues_(); // mémoire courte (30 s), jamais sous le verrou : voir Speed.gs
  if (!values) {
    var gen = ordersGen_();
    sh = sheet_(SHEET.ORDERS);
    var lastRow = sh.getLastRow();
    var lastCol = Math.max(sh.getLastColumn(), 1);
    values = lastRow ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [[]];
    storeOrderValues_(values, gen);
  }
  var header = values[0];
  var map = headerMap_(header);
  if (map.status === undefined || map.phone === undefined) {
    throw new Error('Colonnes « Statut » ou « Téléphone » introuvables dans l’onglet Commandes. Lancez « Installer / réparer le classeur ».');
  }
  // Lue dans le classeur sous le verrou : ses lignes pourront être réécrites d'un seul bloc (writeFields_).
  var session = sh && LOCK_DEPTH_ ? LOCK_SESSION_ : 0;
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
    if (session) Object.defineProperty(o, '_raw', { value: row, enumerable: false, writable: true });
    orders.push(o);
  }
  var ctx = { map: map, width: header.length, orders: orders, session: session };
  // L'onglet n'est ouvert que si on en a besoin (écriture) : une page lue depuis la mémoire n'ouvre pas le classeur.
  Object.defineProperty(ctx, 'sheet', {
    enumerable: true, configurable: true,
    get: function () { if (!sh) sh = sheet_(SHEET.ORDERS); return sh; },
    set: function (v) { sh = v; }
  });
  return ctx;
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

/**
 * Écrit seulement les cases modifiées d'une commande, en regroupant les
 * cases voisines : une seule écriture par groupe au lieu d'une par case.
 */
function writeFields_(ctx, order, fields) {
  if (fields.status !== undefined && String(fields.status) !== String(order.status)) {
    noteStatusChange_(order, fields.status);
    // Date de la confirmation (statistiques de l'équipe), notée une seule fois.
    if (fields.status === STATUS.CONFIRMED && ctx.map.confirmedAt !== undefined && isBlank_(order.confirmedAt) && fields.confirmedAt === undefined) {
      fields = Object.assign({}, fields, { confirmedAt: new Date() });
    }
  }
  var cells = [];
  Object.keys(fields).forEach(function (key) {
    order[key] = fields[key];
    var idx = ctx.map[key];
    if (idx !== undefined) cells.push({ col: idx, key: key, value: fields[key] });
  });
  if (!cells.length) return;
  cells.sort(function (a, b) { return a.col - b.col; });
  // Ligne lue sous ce même verrou : les cases entre deux cases modifiées sont connues et peuvent être
  // réécrites telles quelles, pour tout écrire en un seul appel au classeur (chaque appel coûte ~150 ms).
  var raw = order._raw && ctx.session && ctx.session === LOCK_SESSION_ && LOCK_DEPTH_ ? order._raw : null;
  var known = raw ? knownColumns_(ctx) : null;
  var canBridge = function (from, to) { // colonnes from+1 … to-1
    if (!raw || to - from - 1 > WRITE_MAX_GAP_) return false;
    for (var c = from + 1; c < to; c++) if (!known[c] || c >= raw.length) return false;
    return true;
  };
  var write = function (run) {
    run.forEach(function (c) {
      if (TEXT_KEYS_.indexOf(c.key) >= 0) ctx.sheet.getRange(order._row, c.col + 1).setNumberFormat('@');
    });
    var first = run[0].col;
    var last = run[run.length - 1].col;
    var byCol = {};
    run.forEach(function (c) { byCol[c.col] = c.value; });
    var row = [];
    for (var c = first; c <= last; c++) row.push(Object.prototype.hasOwnProperty.call(byCol, c) ? byCol[c] : raw[c]);
    ctx.sheet.getRange(order._row, first + 1, 1, row.length).setValues([row]);
    if (raw) run.forEach(function (c) { raw[c.col] = c.value; });
  };
  var run = [cells[0]];
  for (var i = 1; i < cells.length; i++) {
    var prev = run[run.length - 1].col;
    if (cells[i].col === prev + 1 || canBridge(prev, cells[i].col)) run.push(cells[i]);
    else { write(run); run = [cells[i]]; }
  }
  write(run);
}

/**
 * Au plus ce nombre de cases inchangées réécrites entre deux cases modifiées (au-delà : deux écritures).
 * Réécrire 40 cases ne coûte presque rien ; un appel de plus au classeur coûte ~150 ms.
 */
var WRITE_MAX_GAP_ = 60;

/** Colonnes de l'outil (ORDER_COLUMNS) : seules celles-là sont réécrites telles quelles ; une colonne ajoutée à la main ne l'est jamais. */
function knownColumns_(ctx) {
  var out = {};
  Object.keys(ctx.map).forEach(function (k) { out[ctx.map[k]] = true; });
  return out;
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
  // Onglet plein : on ajoute des lignes vides, avec les listes et les couleurs.
  if (ensureRows_(ctx.sheet, r + list.length - 1)) applyOrdersRules_(ctx.sheet);
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
    label: labelState_(o),
    courierNote: String(o.courierNote == null ? '' : o.courierNote),
    followCalls: toNumber_(o.followCalls),
    campaign: String(o.campaign),
    adSource: String(o.adSource == null ? '' : o.adSource),
    shopifyId: String(o.shopifyId),
    stockMove: String(o.stockMove == null ? '' : o.stockMove),
    callDay: callDay_(o, new Date()),
    callsToday: parseDayCalls_(o.dayCalls).day === dayKey_(new Date()) ? parseDayCalls_(o.dayCalls).n : 0,
    sms: String(o.sms == null ? '' : o.sms),
    calls: parseCallLog_(o.callLog).map(function (c) { return { when: c.when, text: c.text }; }),
    alert: String(o.alert),
    alertLevel: alertLevel_(o.alert),
    notes: String(o.notes),
    source: String(o.source),
    updated: iso_(o.updated),
    stage: orderStage_(o),
    locked: isLockedStage_(orderStage_(o)),
    page: pageOf_(o)
  };
}

/* ------------------------------------------------------------------ */
/* Wilayas et tarifs                                                  */
/* ------------------------------------------------------------------ */

/** Liste des wilayas : celle de l'onglet Tarifs, sinon les 58 par défaut (gardée en mémoire). */
function getWilayaList_() {
  return cached_('cfg:wilayas', readWilayaList_);
}

function readWilayaList_() {
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
  return cached_('cfg:rates', function () { return readRatesFromSheet_(wilayas); });
}

function readRatesFromSheet_(wilayas) {
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

/** Titres des colonnes de l'onglet Clients (les 3 dernières sont remplies par l'archivage). */
var CLIENT_TITLES_ = ['Téléphone', 'Nom', 'Liste noire', 'Note', 'Livrées archivées', 'Retours archivés', 'Annulées archivées', 'Signalé'];

/**
 * Onglet Clients, gardé en mémoire : numéros en liste noire (case cochée), et
 * résultats des commandes archivées par numéro { '0550…': [livrées, retours, annulées] }.
 */
function readClients_() {
  return cached_('cfg:clients', function () {
    var out = { blacklist: {}, archived: {}, flags: {} };
    var sh = ss_().getSheetByName(SHEET.CLIENTS);
    if (!sh || sh.getLastRow() < 2) return out;
    var lastCol = Math.max(sh.getLastColumn(), 3);
    var values = sh.getRange(1, 1, sh.getLastRow(), lastCol).getValues();
    var idx = {};
    values[0].forEach(function (t, i) { var k = normalizeText_(t); if (k && idx[k] === undefined) idx[k] = i; });
    var col = function (title, fallback) { var i = idx[normalizeText_(title)]; return i === undefined ? fallback : i; };
    var cPhone = col('Téléphone', 0);
    var cBlack = col('Liste noire', 2);
    var cDel = col('Livrées archivées', -1);
    var cRet = col('Retours archivés', -1);
    var cCan = col('Annulées archivées', -1);
    var cFlag = col('Signalé', -1);
    for (var r = 1; r < values.length; r++) {
      var p = normalizePhone(values[r][cPhone]).phone;
      if (!p) continue;
      var b = values[r][cBlack];
      if (b === true || /^(vrai|true|oui)$/i.test(String(b))) out.blacklist[p] = true;
      if (cFlag >= 0 && !isBlank_(values[r][cFlag])) out.flags[p] = String(values[r][cFlag]).trim();
      var counts = [cDel, cRet, cCan].map(function (c) { return c < 0 ? 0 : toNumber_(values[r][c]); });
      if (counts[0] || counts[1] || counts[2]) out.archived[p] = counts;
    }
    return out;
  });
}

/** Numéros en liste noire (onglet Clients, case « Liste noire » cochée). */
function readBlacklist_() {
  return readClients_().blacklist;
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

/** Historique d'un numéro (sans la commande en cours), commandes archivées comprises. */
function clientHistory_(phone, index, excludeId, archived) {
  var p = normalizePhone(phone).phone;
  var list = (index[p] || []).filter(function (o) {
    return String(o.id) !== String(excludeId);
  });
  var old = (archived && archived[p]) || [0, 0, 0];
  var h = { orders: list.length + old[0] + old[1] + old[2], delivered: old[0], returned: old[1], cancelled: old[2], list: list };
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
  var h = clientHistory_(p.phone, env.index, order.id, env.archived);
  var windowMs = env.settings.DOUBLON_HEURES * 3600 * 1000;
  var t = toDate_(order.date) || env.now;
  if (windowMs > 0) {
    var duplicate = h.list.some(function (o) {
      var d = toDate_(o.date);
      return o.status !== STATUS.CANCELLED && d && Math.abs(d.getTime() - t.getTime()) <= windowMs;
    });
    if (duplicate) return 'Doublon';
  }
  if (env.flags && env.flags[p.phone]) return 'Signalé · a refusé un colis';
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
  if (a.indexOf('Doublon') === 0 || a.indexOf('Risque') === 0 || a.indexOf('Attention') === 0 || a.indexOf('Signalé') === 0) return 'warn';
  if (a.indexOf('Fiable') === 0) return 'ok';
  return 'new';
}

/** Tout ce dont les calculs ont besoin, lu une seule fois. */
function makeEnv_(ctx) {
  var wilayas = getWilayaList_();
  var clients = readClients_();
  return {
    settings: getSettings_(),
    wilayas: wilayas,
    rates: readRates_(wilayas),
    blacklist: clients.blacklist,
    archived: clients.archived,
    flags: clients.flags || {},
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
  if (!hasNewRows_()) return 0; // rien de nouveau : pas de lecture complète, pas de verrou
  return processNewRowsNow_();
}

/**
 * Lecture rapide (trois colonnes) : y a-t-il une ligne sans statut, avec au
 * moins un nom ou un téléphone ?
 */
function hasNewRows_() {
  var sh = ss_().getSheetByName(SHEET.ORDERS);
  if (!sh) return false;
  var last = sh.getLastRow();
  if (last < 2) return false;
  var map = headerMap_(sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0]);
  if (map.status === undefined || map.phone === undefined) return true; // la lecture complète donnera une erreur claire
  var column = function (key) {
    return map[key] === undefined ? [] : sh.getRange(2, map[key] + 1, last - 1, 1).getValues();
  };
  var status = column('status');
  var phone = column('phone');
  var client = column('client');
  for (var i = 0; i < status.length; i++) {
    if (String(status[i][0]).trim()) continue;
    if (String(phone[i][0]).trim() || (client[i] && String(client[i][0]).trim())) return true;
  }
  return false;
}

/** Prépare tout de suite les lignes sans statut (après une importation, ou depuis le menu). */
function processNewRowsNow_() {
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

/* ---- Ecotrack.gs ---- */
/**
 * Ecotrack.gs : création des colis chez Ecotrack, tarifs et statuts.
 *
 * L'adresse de votre plateforme Ecotrack et votre jeton API sont enregistrés
 * dans les « Propriétés du script » (menu DZ Smart Shop › Ecotrack ›
 * Enregistrer l'adresse et le jeton). Ils ne sont jamais écrits dans le
 * classeur ni dans le code.
 *
 * L'outil CRÉE les colis (create/orders). La VALIDATION de l'expédition se
 * fait ensuite depuis l'outil (Labels.gs, avec l'impression des bordereaux)
 * ou dans l'interface d'Ecotrack : l'outil la détecte alors tout seul en
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
    clearConfigCache_(configKeysFor_(SHEET.RATES));
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
 * Crée les colis chez Ecotrack (sans les expédier : vous les validez ensuite,
 * depuis l'outil ou dans l'interface d'Ecotrack) et écrit le n° de suivi. La commande reste
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
        log_(user, o.id, 'Colis créé chez Ecotrack', 'Suivi ' + r.tracking + ' (à valider)' + (r.message ? ' · ' + r.message : ''));
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
  if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return false;
  if (isEcotrackActive_(o)) return true;
  // Après la livraison ou le retour, on suit encore l'argent (jusqu'au versement) et le colis (jusqu'à sa réception).
  var info = ecotrackStatusInfo_(o.carrierStatus);
  if (o.status === STATUS.DELIVERED) return !(info && (info.group === 'paid' || info.group === 'missing'));
  if (o.status === STATUS.RETURNED) return !(info && (info.group === 'returned' || info.group === 'missing'));
  return false;
}

/** Colis pas encore arrivé : créé, expédié ou en livraison. */
function isEcotrackActive_(o) {
  return o.status === STATUS.CONFIRMED || o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;
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

/**
 * Met à jour le statut de tous les colis Ecotrack à suivre. Renvoie un résumé.
 * opts.onlyCreated : seulement les colis créés pas encore validés (page Expédier).
 */
function syncEcotrackStatuses_(opts) {
  var onlyCreated = !!(opts && opts.onlyCreated);
  var summary = { configured: true, checked: 0, updated: 0, missing: 0, unknown: 0 };
  if (!ecotrackConfig_().configured) { summary.configured = false; return summary; }

  // Lecture sans verrou : les clics des confirmatrices ne l'attendent pas.
  var tracked = readOrders_().orders.filter(function (o) {
    return isEcotrackTracked_(o) && (!onlyCreated || orderStage_(o) === STAGE.PARCEL);
  }).map(function (o) {
    return { id: String(o.id), tracking: String(o.tracking).trim(), date: toDate_(o.date), carrierStatus: String(o.carrierStatus || '').trim() };
  });
  summary.checked = tracked.length;
  if (!tracked.length) { if (!onlyCreated) markSynced_(); return summary; }

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

  // 3. Colis qui passent « suspendu » ou « retour » : remarques du livreur (motif).
  var watched = tracked.filter(function (t) {
    var rec = found[t.tracking];
    var raw = rec ? String(rec.status == null ? '' : rec.status).trim() : '';
    var info = raw && raw !== t.carrierStatus ? ecotrackStatusInfo_(raw) : null;
    return !!info && (info.group === 'suspended' || info.group === 'returning');
  });
  var remarks = {};
  try {
    remarks = courierRemarks_(watched.slice(0, FOLLOW.MAX_REMARKS).map(function (t) { return t.tracking; }));
  } catch (e) {
    remarks = {};
  }
  var settings = getSettings_();

  withLock_(function () {
    var ctx = readOrders_();
    var hasRaw = ctx.map.carrierStatus !== undefined;
    var now = new Date();
    var actor = { name: 'Ecotrack' };
    if (Object.keys(remarks).length) ensureOrderColumn_(ctx, 'courierNote');
    tracked.forEach(function (t) {
      var o = findOrder_(ctx, t.id);
      if (!o || !isEcotrackTracked_(o) || String(o.tracking).trim() !== t.tracking) return;
      var rec = found[t.tracking];
      var f = {};
      if (!rec) {
        // Un colis déjà livré ou retourné qui n'apparaît plus n'est pas « introuvable » : on le laisse tel quel.
        if (!looked[t.tracking] || !isEcotrackActive_(o)) return;
        summary.missing++;
        if (String(o.carrierStatus) !== ECO.MISSING) {
          f.carrierStatus = ECO.MISSING;
          f.carrierMoved = now;
          log_(actor, o.id, 'Colis introuvable', 'Le suivi ' + t.tracking + ' n’apparaît pas chez Ecotrack. Vérifiez dans Ecotrack.');
        }
      } else {
        var raw = String(rec.status == null ? '' : rec.status).trim();
        var mapped = mapEcotrackStatus_(raw);
        // Date réelle du changement chez Ecotrack quand la réponse la donne (sinon : l'heure de la lecture).
        var real = ecoRecordDate_(rec, now);
        if (raw && raw !== String(o.carrierStatus)) {
          f.carrierStatus = raw;
          // Le premier statut lu ne remet pas à zéro l'horloge du colis (date de création).
          if (real) f.carrierMoved = real;
          else if (!isBlank_(o.carrierStatus) || isBlank_(o.carrierMoved)) f.carrierMoved = now;
        }
        if (raw && raw !== String(o.carrierStatus)) {
          // Nouvelle étape : les appels de suivi de l'étape précédente ne comptent plus.
          if (!isBlank_(o.followCalls)) f.followCalls = '';
          if (!isBlank_(o.followNext)) f.followNext = '';
          var rem = remarks[t.tracking];
          var last = rem && rem.ok ? rem.last : null;
          if (last) {
            var noteText = courierNoteText_(last);
            if (noteText !== String(o.courierNote || '')) f.courierNote = noteText;
          }
          var stepInfo = ecotrackStatusInfo_(raw);
          // SMS « le livreur n'a pas pu vous joindre » : client injoignable, ou colis suspendu sans remarque.
          if (stepInfo && stepInfo.group === 'suspended') {
            var tag = last ? remarkTag_(last.text, settings) : '';
            if (!tag || tag === 'injoignable') noteSmsEvent_(o, 'courier');
            log_(actor, o.id, 'Colis suspendu', last ? 'Livreur : ' + last.text : 'Sans remarque du livreur');
          }
        }
        var payment = rec.payment_id == null ? '' : String(rec.payment_id).trim();
        if (payment && payment !== String(o.paymentId)) f.paymentId = payment;
        if (mapped && mapped !== o.status && STATUS_RANK_[mapped] > STATUS_RANK_[o.status]) {
          f.status = mapped;
          if (mapped === STATUS.CANCELLED) f.cancelReason = 'Annulée chez Ecotrack';
          if (mapped === STATUS.DELIVERED && isBlank_(o.deliveredAt)) {
            ensureOrderColumn_(ctx, 'deliveredAt');
            f.deliveredAt = real || now;
          }
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
    applyStockMoves_(ctx); // colis partis, retours reçus
  });
  if (!onlyCreated) markSynced_();
  return summary;
}

/** Date du dernier changement de statut chez Ecotrack, si la réponse la donne (sinon null). */
function ecoRecordDate_(rec, now) {
  var d = ecoDate_(firstOf_(rec, ['status_updated_at', 'status_date', 'date_status', 'last_status_date', 'last_update', 'updated_at']));
  if (!d || d.dayOnly) return null;
  var t = d.date.getTime();
  // Une date dans le futur ou vieille de plus de 60 jours est ignorée (réponse mal comprise).
  if (t > now.getTime() + 300000 || t < now.getTime() - 60 * 86400000) return null;
  return d.date;
}

function markSynced_() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty(ECO.PROP_LAST_SYNC, new Date().toISOString());
  clearEcotrackError_();
}

/** Point d'entrée de la lecture automatique (toutes les SUIVI_ECOTRACK_MINUTES minutes). */
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
/** Expédier : mesurée (Administration › État de l'outil). */
function api_shippingList() {
  var a = arguments;
  return timed_('Expédier', function () { return shippingListApi_.apply(null, a); });
}

function shippingListApi_() {
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
      base.label = labelState_(o);
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
    labelFormat: settings.FORMAT_BORDEREAU,
    pickup: settings.RAMASSAGE,
    canValidate: canSeeStock_(currentUser_()),
    labelsPerCall: LABEL.PER_CALL,
    toShip: items(toShip),
    created: items(created)
  };
}

/** Crée les colis chez Ecotrack (la validation se fait ensuite : bouton « Valider l'expédition » ou interface d'Ecotrack). */
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

/* ---- Tracking.gs ---- */
/**
 * Tracking.gs : page « Suivi » des colis Ecotrack.
 *
 *  - colis en cours (statut en direct, relu toutes les SUIVI_ECOTRACK_MINUTES minutes) ;
 *  - alertes « à traiter » : colis suspendu, retour en cours, retour bloqué,
 *    sans mouvement (délai selon l'étape et le Sud), créé mais pas validé,
 *    argent en retard, introuvable, statut inconnu ; le résultat de l'appel au
 *    client et les remarques du livreur sont dans FollowUp.gs ;
 *  - argent (trackingMoney_) : chez le livreur, livré pas encaissé, encaissé
 *    pas payé, prêt à verser, payé, et versements — affiché dans Statistiques › Argent ;
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

/** Étapes « ramassage et centre de tri » (délai SUIVI_HEURES_TRI). */
var STAGE_SORTING_ = ['en_ramassage', 'en_preparation_stock', 'vers_hub', 'en_hub'];

/** Délai « sans mouvement » d'un colis selon son étape, et le Sud : { hours, where }. */
function staleLimit_(o, settings) {
  var key = normalizeText_(o.carrierStatus).replace(/ /g, '_');
  if (STAGE_SORTING_.indexOf(key) >= 0) return { hours: settings.SUIVI_HEURES_TRI, where: 'ramassage ou centre de tri' };
  if (key === 'en_livraison') return { hours: settings.SUIVI_HEURES_LIVRAISON, where: 'en livraison' };
  var code = wilayaCode_(o.wilaya);
  var south = !!(code && settings.southCodes && settings.southCodes[code]);
  return { hours: south ? settings.SUIVI_HEURES_SUD : settings.SUIVI_HEURES_ROUTE, where: south ? 'en route vers le Sud' : 'en route vers la wilaya' };
}

/**
 * Colis Ecotrack qui demandent une action. Une alerte traitée (résultat de
 * l'appel, ou « Marquer comme traité ») disparaît : jusqu'au prochain
 * changement du colis pour une alerte liée à un événement, ou pendant le délai
 * de l'alerte pour une alerte liée au temps. « Relance suivi le » la fait
 * revenir à une heure précise (rappel, livraison reportée).
 */
function trackingAlerts_(orders, settings, now) {
  var DAY = 86400000;
  var draftLimit = settings.SUIVI_ALERTE_HEURES * 3600000;
  var alerts = [];
  orders.forEach(function (o) {
    if (String(o.carrier) !== ECO.NAME || isBlank_(o.tracking)) return;
    var info = ecotrackStatusInfo_(o.carrierStatus);
    var group = info ? info.group : (o.status === STATUS.CONFIRMED ? 'draft' : 'transit');
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    var touched = toDate_(o.followUp);
    var next = toDate_(o.followNext);
    var due = !!next && now.getTime() >= next.getTime();
    var handled = !!touched && touched.getTime() >= moved.getTime() && !due;
    var base = touched && touched.getTime() > moved.getTime() ? touched : moved;
    var age = function (from) { return now.getTime() - from.getTime(); };
    var label = info ? info.label : '';
    var calls = Math.round(toNumber_(o.followCalls)) || 0;
    var note = String(o.courierNote == null ? '' : o.courierNote).trim();
    var tag = note ? remarkTag_(note, settings) : '';
    var inDelivery = o.status === STATUS.IN_DELIVERY;
    // Alertes où l'on appelle le client : boutons « résultat de l'appel ».
    var client = { callable: true, canReturn: inDelivery, proposeReturn: inDelivery && calls >= FOLLOW.MAX_CALLS };
    var make = function (kind, level, title, detail, since, extra) {
      var a = {
        id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya),
        tracking: String(o.tracking), carrierStatus: String(o.carrierStatus), carrierLabel: label, status: o.status,
        kind: kind, level: level, title: title, detail: detail, since: since.toISOString(),
        courierNote: note, tag: tag, tagLabel: remarkTagLabel_(tag), calls: calls,
        next: next ? next.toISOString() : '', callable: false, canReturn: false, proposeReturn: false
      };
      Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
      return a;
    };
    var inTransit = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;

    if (group === 'suspended') {
      if (!handled) {
        alerts.push(make('suspended', 'urgent', 'Colis suspendu',
          'Le livreur n’a pas pu terminer la livraison : appelez le client.', moved, client));
      }
    } else if (group === 'returning') {
      var stuck = settings.RETOUR_BLOQUE_JOURS * DAY;
      if (age(moved) >= stuck) {
        if (age(base) >= stuck) {
          alerts.push(make('return_stuck', 'urgent', 'Retour bloqué',
            'Retour en route depuis ' + durationText_(age(moved)) + ' sans arriver chez vous : réclamez-le à Ecotrack.', moved));
        }
      } else if (!handled) {
        alerts.push(make('returning', 'urgent', 'Retour en cours',
          'Le colis (' + label.toLowerCase() + ') revient : rappelez le client pour tenter de sauver la commande.', moved, { callable: true }));
      }
    } else if (group === 'draft' && o.status === STATUS.CONFIRMED && age(base) >= draftLimit) {
      alerts.push(make('draft', 'warn', 'À valider chez Ecotrack',
        'Colis créé depuis ' + durationText_(age(base)) + ' et pas encore validé : validez-le (page Expédier), sinon il ne partira pas.', base));
    } else if ((group === 'transit' || group === 'delivery') && inTransit) {
      var lim = staleLimit_(o, settings);
      var limitMs = lim.hours * 3600000;
      var show = next ? (due && age(moved) >= limitMs) : age(base) >= limitMs;
      if (show) {
        alerts.push(make('stale', 'warn', 'Sans mouvement',
          'Aucun changement depuis ' + durationText_(age(moved)) + ' (' + (label || lim.where).toLowerCase() + ' ; alerte après ' + lim.hours + ' h).', base,
          group === 'delivery' ? client : {}));
      }
    } else if (o.status === STATUS.DELIVERED && (group === 'delivered' || group === 'cashed' || group === 'ready')) {
      var deliveredAt = toDate_(o.deliveredAt) || moved;
      var late = settings.ARGENT_RETARD_JOURS * DAY;
      var since = touched && touched.getTime() > deliveredAt.getTime() ? touched : deliveredAt;
      if (age(deliveredAt) >= late && age(since) >= late) {
        alerts.push(make('money_late', 'warn', 'Argent en retard',
          'Livré depuis ' + durationText_(age(deliveredAt)) + ' (' + label.toLowerCase() + ') et toujours pas payé : vérifiez avec Ecotrack.', deliveredAt));
      }
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
      events.push({ code: e, label: activityLabel_(e), date: '', dayOnly: false, dateText: '', note: '', order: i });
      return;
    }
    if (typeof e !== 'object') return;
    var code = String(firstOf_(e, ['activity', 'status', 'statut', 'event', 'type', 'name', 'label']));
    var note = String(firstOf_(e, ['content', 'remarque', 'message', 'comment', 'note', 'description', 'details']));
    var rawDate = firstOf_(e, ['date', 'created_at', 'datetime', 'date_time', 'at', 'updated_at', 'time']);
    if (!code && !note) return;
    // Heure envoyée à part (« date » = jour seulement) ; les dates sans fuseau sont à l'heure d'Algérie.
    var d = ecoDate_(rawDate, rawDate === e.time ? '' : firstOf_(e, ['time', 'heure', 'hour']));
    events.push({
      code: code,
      label: code ? activityLabel_(code) : note,
      date: d ? d.date.toISOString() : '',
      dayOnly: !!(d && d.dayOnly),
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
    return { code: e.code, label: e.label, date: e.date, dayOnly: e.dayOnly, dateText: e.dateText, note: e.note };
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
  var settings = getSettings_();
  var remarks = courierRemarks_([tracking])[tracking];
  var noteText = remarks.ok && remarks.last ? courierNoteText_(remarks.last) : '';
  if (noteText && noteText !== String(o.courierNote || '')) {
    withLock_(function () {
      var ctx = readOrders_();
      var cur = findOrder_(ctx, id);
      if (!cur || String(cur.tracking).trim() !== tracking) return;
      ensureOrderColumn_(ctx, 'courierNote');
      writeFields_(ctx, cur, { courierNote: noteText });
    });
  }
  return {
    id: String(o.id), client: String(o.client), tracking: tracking,
    carrierLabel: ecotrackLabel_(o.carrierStatus),
    events: events,
    raw: JSON.stringify(json).slice(0, 2000),
    remarksOk: remarks.ok,
    remarksError: remarks.ok ? '' : remarks.message,
    remarks: remarks.notes.map(function (n) {
      var tag = n.mine ? '' : remarkTag_(n.text, settings);
      return { text: n.text, date: n.date, dateText: n.dateText, author: n.author, mine: n.mine, tag: tag, tagLabel: remarkTagLabel_(tag) };
    })
  };
}

/* ------------------------------------------------------------------ */
/* Page Suivi                                                         */
/* ------------------------------------------------------------------ */

/**
 * Données de la page Suivi. days = période de l'onglet « Terminées » : 7, 30 ou 90 jours.
 * L'argent (où est l'argent, versements) est dans Statistiques › Argent.
 */
/** Suivi : mesurée (Administration › État de l'outil). */
function api_trackingOverview() {
  var a = arguments;
  return timed_('Suivi', function () { return trackingOverviewApi_.apply(null, a); });
}

function trackingOverviewApi_(days) {
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
    // Colis créés mais pas encore validés : ils sont dans la page Expédier (onglet « à valider »).
    var active = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY ||
      (o.status === STATUS.RETURNED && group === 'returning');
    if (!active) return;
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date) || now;
    parcels.push({
      id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya),
      tracking: String(o.tracking), carrierStatus: String(o.carrierStatus),
      carrierLabel: info ? info.label : (o.status === STATUS.CONFIRMED ? 'Créé, à valider chez Ecotrack' : ''),
      group: group, status: o.status, total: toNumber_(o.total),
      since: moved.toISOString(), ageHours: Math.floor((now.getTime() - moved.getTime()) / 3600000),
      stale: !!staleIds[String(o.id)],
      courierNote: String(o.courierNote == null ? '' : o.courierNote),
      tagLabel: remarkTagLabel_(remarkTag_(o.courierNote, settings))
    });
  });
  parcels.sort(function (a, b) { return String(a.since).localeCompare(String(b.since)); });

  // Terminées : livrées et retours reçus de la période (toutes sociétés), les plus récentes d'abord.
  var since = new Date(now.getTime() - days * 86400000);
  var finished = [];
  ctx.orders.forEach(function (o) {
    if (pageOf_(o) !== 'terminees') return;
    var moved = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date);
    if (!moved || moved < since) return;
    var info = hasEcotrackParcel_(o) ? ecotrackStatusInfo_(o.carrierStatus) : null;
    var group = info ? info.group : '';
    finished.push({
      id: String(o.id), client: String(o.client), wilaya: String(o.wilaya), status: o.status, total: toNumber_(o.total),
      carrier: String(o.carrier || ''), tracking: String(o.tracking || ''), paymentId: String(o.paymentId || ''),
      label: info ? info.label : o.status,
      unpaid: o.status === STATUS.DELIVERED && (group === 'delivered' || group === 'cashed' || group === 'ready'),
      canDamage: o.status === STATUS.RETURNED && String(o.stockMove || '').trim() === STOCK_BACK_,
      damaged: String(o.stockMove || '').trim() === STOCK_DAMAGED_,
      since: moved.toISOString()
    });
  });
  finished.sort(function (a, b) { return String(b.since).localeCompare(String(a.since)); });

  return {
    finished: finished.slice(0, 300),
    finishedTotal: finished.length,
    configured: cfg.configured,
    lastSync: String(props.getProperty(ECO.PROP_LAST_SYNC) || ''),
    every: settings.SUIVI_ECOTRACK_MINUTES,
    lastError: String(props.getProperty(ECO.PROP_LAST_ERROR) || ''),
    alertHours: settings.SUIVI_ALERTE_HEURES,
    days: days,
    alerts: alerts,
    parcels: parcels,
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
    var f = { followUp: new Date() };
    if (ctx.map.followNext !== undefined) f.followNext = '';
    writeFields_(ctx, o, f);
    log_(currentUser_(), o.id, 'Suivi traité', 'Alerte traitée pour le colis ' + o.tracking);
    return { id: String(o.id) };
  });
}

/** Pastilles du menu : appels à faire et alertes de suivi (urgentes ou à surveiller). */
function api_counts() {
  return countsData_(readOrders_(), getSettings_());
}

/** Compteurs du menu : commandes à appeler maintenant, alertes de la page Suivi. */
function countsData_(ctx, settings) {
  var now = new Date();
  var due = 0;
  ctx.orders.forEach(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0) return;
    var cb = toDate_(o.callback);
    if (!cb || cb <= now) due++;
  });
  var alerts = trackingAlerts_(ctx.orders, settings || getSettings_(), now).filter(function (a) { return a.level !== 'info'; });
  var toShip = ctx.orders.filter(function (o) { return o.status === STATUS.CONFIRMED && isBlank_(o.tracking); }).length;
  return { queue: due, pending: pendingCount_(ctx), alerts: alerts.length, toShip: toShip };
}

/** Commandes ni confirmées ni annulées : à confirmer, pas de réponse, rappeler, injoignable. */
function pendingCount_(ctx) {
  return ctx.orders.filter(function (o) { return !o.status || TODO_STATUSES_.indexOf(o.status) >= 0; }).length;
}

/* ---- Labels.gs ---- */
/**
 * Labels.gs : bordereaux Ecotrack (impression) et validation de l'expédition.
 *
 * - Les bordereaux sont ceux d'Ecotrack (PDF avec leur code-barres) : le
 *   serveur les télécharge (get/order/label), la page les met en page
 *   (A4, 4 par feuille, ou étiquette 10×15) dans un seul PDF à imprimer.
 * - La colonne « Bordereau imprimé » garde la date, la personne et le n° de
 *   suivi imprimé : si le colis est recréé (nouveau n°), il faut réimprimer.
 * - « Valider l'expédition » (valid/order) expédie les colis chez Ecotrack,
 *   avec ou sans demande de ramassage. Ensuite, Ecotrack ne permet plus de
 *   modifier ni de supprimer le colis.
 */

var LABEL = {
  PER_CALL: 6,        // bordereaux renvoyés par appel (taille de la réponse)
  PARALLEL: 6,        // requêtes envoyées en même temps à Ecotrack
  MAX_VALIDATE: 100,  // colis validés au maximum en une fois
  SEP: ' · '
};

/* ------------------------------------------------------------------ */
/* « Bordereau imprimé »                                              */
/* ------------------------------------------------------------------ */

/** Texte de la colonne : « 14/11/2026 à 10:05 · Sara · ECN123 ». */
function labelMark_(date, user, tracking) {
  return [stamp_(date), String((user && user.name) || 'Utilisateur').replace(/·/g, '-'), String(tracking).trim()].join(LABEL.SEP);
}

/**
 * État du bordereau d'une commande :
 * { printed, reprint, at, by } — reprint = imprimé pour un autre n° de suivi (colis recréé).
 */
function labelState_(o) {
  var raw = String(o.label == null ? '' : o.label).trim();
  if (!raw) return { printed: false, reprint: false, at: '', by: '' };
  var parts = raw.split(LABEL.SEP);
  var tracking = parts.length >= 3 ? parts[parts.length - 1].trim() : '';
  var current = String(o.tracking == null ? '' : o.tracking).trim();
  var same = !tracking || !current || tracking === current;
  return { printed: same, reprint: !same, at: parts[0] || '', by: parts.length >= 3 ? parts.slice(1, -1).join(LABEL.SEP) : (parts[1] || '') };
}

/** Ajoute la colonne si le classeur n'a pas encore été réparé (installation plus ancienne). */
function ensureOrderColumn_(ctx, key) {
  if (ctx.map[key] !== undefined) return;
  var col = ORDER_COLUMNS.filter(function (c) { return c.key === key; })[0];
  var sh = ctx.sheet;
  var at = Math.max(sh.getLastColumn(), ctx.width || 0); // nouvelle colonne = at + 1
  if (at + 1 > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), at + 1 - sh.getMaxColumns());
  sh.getRange(1, at + 1).setValue(col.title).setFontWeight('bold').setBackground(HEADER_BG_[col.kind] || '#EEF0F3');
  ctx.map[key] = at;
  ctx.width = at + 1;
}

/** Colis Ecotrack dont on peut imprimer le bordereau : créé, ou déjà expédié. */
function canPrintLabel_(o) {
  var stage = orderStage_(o);
  return hasEcotrackParcel_(o) && (stage === STAGE.PARCEL || stage === STAGE.SHIPPING);
}

/* ------------------------------------------------------------------ */
/* Téléchargement des bordereaux                                      */
/* ------------------------------------------------------------------ */

function headerOf_(resp, name) {
  try {
    var headers = resp.getAllHeaders() || {};
    var keys = Object.keys(headers);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === name) return String(headers[keys[i]]);
    }
  } catch (e) { /* pas d'en-têtes */ }
  return '';
}

function isPdfBytes_(bytes) {
  return !!bytes && bytes.length > 4 && bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70; // %PDF
}

/** Une adresse de fichier dans une réponse JSON d'Ecotrack ({ url }, { label }, { data: { url } }…). */
function labelUrlIn_(json) {
  if (!json || typeof json !== 'object') return '';
  var keys = ['url', 'label', 'link', 'file', 'pdf', 'path', 'data'];
  for (var i = 0; i < keys.length; i++) {
    var v = json[keys[i]];
    if (typeof v === 'string' && /^https:\/\//i.test(v.trim())) return v.trim();
    if (v && typeof v === 'object') {
      var inner = labelUrlIn_(v);
      if (inner) return inner;
    }
  }
  return '';
}

/**
 * Lit une réponse : { pdf } (octets), { next } (fichier à télécharger ailleurs,
 * sans le jeton) ou { error }.
 */
function readLabelResponse_(resp) {
  var code = resp.getResponseCode();
  if (code >= 300 && code < 400) {
    var location = headerOf_(resp, 'location');
    return /^https:\/\//i.test(location) ? { next: location } : { error: 'Ecotrack a renvoyé une adresse de bordereau invalide.' };
  }
  var bytes = null;
  try { bytes = resp.getContent(); } catch (e) { bytes = null; }
  if (code >= 200 && code < 300 && isPdfBytes_(bytes)) return { pdf: bytes };
  var text = '';
  try { text = resp.getContentText() || ''; } catch (e) { text = ''; }
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  if (code === 404) return { error: 'Bordereau introuvable chez Ecotrack (colis supprimé ?).' };
  if (code < 200 || code >= 300) return { error: ecotrackFail_({ code: code, json: json }).message };
  var url = labelUrlIn_(json);
  if (url) return { next: url };
  var detail = json ? (flattenEcotrackErrors_(json.errors || json.error) || String(json.message || '')) : '';
  return { error: 'Ecotrack n’a pas renvoyé de PDF' + (detail ? ' : ' + detail : '.') };
}

/**
 * Envoie des requêtes par paquets (en parallèle), avec une nouvelle tentative
 * pour celles refusées par la limite de débit (erreur 429).
 * Renvoie une réponse (ou une erreur) par requête.
 */
function fetchAllSafe_(requests) {
  var out = [];
  for (var i = 0; i < requests.length; i += LABEL.PARALLEL) {
    var chunk = requests.slice(i, i + LABEL.PARALLEL);
    var resps;
    try {
      resps = UrlFetchApp.fetchAll(chunk);
    } catch (e) {
      // Une requête injoignable fait échouer tout le paquet : on les refait une par une.
      resps = chunk.map(function (req) {
        try { return UrlFetchApp.fetch(req.url, req); } catch (err) { return { error: err }; }
      });
    }
    resps.forEach(function (resp, k) {
      if (resp && !resp.error && resp.getResponseCode() === 429) {
        Utilities.sleep(retryAfterMs_(resp));
        try { resp = UrlFetchApp.fetch(chunk[k].url, chunk[k]); } catch (err) { resp = { error: err }; }
      }
      out.push(resp);
    });
  }
  return out;
}

function ecotrackRequest_(method, path, query) {
  var cfg = ecotrackConfig_();
  return {
    url: cfg.url + path + ecotrackQuery_(query),
    method: method,
    muteHttpExceptions: true,
    followRedirects: false, // le jeton ne suit jamais une redirection
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/pdf, application/json' }
  };
}

/**
 * Bordereaux de quelques commandes (6 au plus par appel : la page appelle
 * plusieurs fois). Renvoie [{ id, tracking, client, ok, pdf (base64), message }].
 */
function api_labelFiles(rawIds) {
  currentUser_();
  var ids = uniqueIds_(rawIds);
  if (!ids.length) throw new Error('Aucun colis sélectionné.');
  if (ids.length > LABEL.PER_CALL) throw new Error('Trop de bordereaux demandés à la fois (' + LABEL.PER_CALL + ' au plus).');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);

  var ctx = readOrders_();
  var results = [];
  var asked = [];
  ids.forEach(function (id) {
    var o = findOrder_(ctx, id);
    var r = { id: id, tracking: o ? String(o.tracking).trim() : '', client: o ? String(o.client) : '', ok: false, pdf: '', message: '' };
    results.push(r);
    if (!o) r.message = 'Commande introuvable.';
    else if (!canPrintLabel_(o)) r.message = hasEcotrackParcel_(o) ? 'Colis terminé : plus de bordereau à imprimer.' : 'Pas encore de colis chez Ecotrack : envoyez d’abord la commande à Ecotrack.';
    else asked.push(r);
  });
  if (!asked.length) return results;

  // 1. Ecotrack (avec le jeton).
  var first = fetchAllSafe_(asked.map(function (r) { return ecotrackRequest_('get', '/api/v1/get/order/label', { tracking: r.tracking }); }));
  var follow = [];
  asked.forEach(function (r, i) {
    var resp = first[i];
    if (!resp || resp.error) { r.message = 'Impossible de joindre Ecotrack. Réessayez.'; return; }
    var got = readLabelResponse_(resp);
    if (got.pdf) { r.ok = true; r.pdf = Utilities.base64Encode(got.pdf); }
    else if (got.next) follow.push({ r: r, url: got.next });
    else r.message = got.error;
  });

  // 2. Fichier rangé ailleurs (ex. storage.ecotrack.dz) : téléchargé sans le jeton.
  if (follow.length) {
    var second = fetchAllSafe_(follow.map(function (f) {
      return { url: f.url, method: 'get', muteHttpExceptions: true, followRedirects: true };
    }));
    follow.forEach(function (f, i) {
      var resp = second[i];
      if (!resp || resp.error) { f.r.message = 'Impossible de télécharger le bordereau. Réessayez.'; return; }
      var bytes = null;
      try { bytes = resp.getContent(); } catch (e) { bytes = null; }
      if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300 && isPdfBytes_(bytes)) {
        f.r.ok = true;
        f.r.pdf = Utilities.base64Encode(bytes);
      } else {
        f.r.message = 'Le bordereau téléchargé n’est pas un PDF (erreur ' + resp.getResponseCode() + ').';
      }
    });
  }
  return results;
}

/** Note « Bordereau imprimé » sur les commandes : items = [{ id, tracking }]. */
function api_markLabelsPrinted(items) {
  var user = currentUser_();
  var list = (items || []).filter(function (it) { return it && it.id; }).slice(0, 500);
  if (!list.length) return { marked: 0, labels: {} };
  return withLock_(function () {
    var ctx = readOrders_();
    ensureOrderColumn_(ctx, 'label');
    var now = new Date();
    var labels = {};
    var marked = 0;
    list.forEach(function (it) {
      var o = findOrder_(ctx, String(it.id));
      var tracking = String(it.tracking || '').trim();
      if (!o || !tracking || String(o.tracking).trim() !== tracking) return;
      var before = labelState_(o);
      writeFields_(ctx, o, { label: labelMark_(now, user, tracking) });
      log_(user, o.id, before.printed ? 'Bordereau réimprimé' : 'Bordereau imprimé', 'Suivi ' + tracking);
      labels[o.id] = labelState_(o);
      marked++;
    });
    return { marked: marked, labels: labels };
  });
}

function uniqueIds_(rawIds) {
  var ids = [];
  (rawIds || []).forEach(function (id) {
    id = String(id == null ? '' : id).trim();
    if (id && ids.indexOf(id) < 0) ids.push(id);
  });
  return ids;
}

/* ------------------------------------------------------------------ */
/* Validation de l'expédition                                         */
/* ------------------------------------------------------------------ */

/** Réponse de valid/order : '' si c'est bon, sinon le motif du refus. */
function validateRefusal_(resp) {
  if (!resp || resp.error) return null; // injoignable : résultat incertain
  var code = resp.getResponseCode();
  var text = '';
  try { text = resp.getContentText() || ''; } catch (e) { text = ''; }
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  if (code < 200 || code >= 300) {
    var detail = json ? (flattenEcotrackErrors_(json.errors || json.error) || String(json.message || '')) : '';
    return code === 401 || code === 403 || code === 429 || code >= 500 ? ecotrackFail_({ code: code, json: json }).message
      : 'Refusé par Ecotrack (erreur ' + code + ')' + (detail ? ' : ' + detail : '.');
  }
  if (json && (json.success === false || json.error)) {
    var why = flattenEcotrackErrors_(json.error || json.errors) || String(json.message || '');
    return 'Refusé par Ecotrack' + (why ? ' : ' + why : '.');
  }
  return '';
}

/**
 * Valide l'expédition de colis créés (valid/order), avec ou sans demande de
 * ramassage. Réservé à l'administrateur et au magasinier : c'est définitif.
 * Renvoie { results: [{ id, client, tracking, ok, message }], counts }.
 */
function api_validateParcels(rawIds, pickup) {
  var user = requireStockAccess_();
  var ids = uniqueIds_(rawIds);
  if (!ids.length) throw new Error('Aucun colis sélectionné.');
  if (ids.length > LABEL.MAX_VALIDATE) throw new Error('Validez ' + LABEL.MAX_VALIDATE + ' colis au maximum à la fois.');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);
  var ask = pickup ? 1 : 0;
  var cache = CacheService.getScriptCache();
  var results = {};
  var queue = [];

  // 1. Vérifications, et « réservation » pour éviter une double validation.
  withLock_(function () {
    var ctx = readOrders_();
    ids.forEach(function (id) {
      var o = findOrder_(ctx, id);
      var r = { id: id, client: o ? String(o.client) : '', tracking: o ? String(o.tracking).trim() : '', ok: false, message: '' };
      results[id] = r;
      if (!o) { r.message = 'Commande introuvable.'; return; }
      if (orderStage_(o) !== STAGE.PARCEL) {
        r.message = orderStage_(o) === STAGE.SHIPPING ? 'Déjà expédiée.' : 'Pas de colis Ecotrack à valider pour cette commande.';
        return;
      }
      if (cache.get('valid:' + id)) { r.message = 'Une validation est déjà en cours pour ce colis.'; return; }
      cache.put('valid:' + id, '1', ECO.CLAIM_SECONDS);
      queue.push(r);
    });
  });

  try {
    // 2. Validation chez Ecotrack (le classeur n'est pas bloqué pendant l'attente).
    var resps = fetchAllSafe_(queue.map(function (r) {
      return ecotrackRequest_('post', '/api/v1/valid/order', { tracking: r.tracking, ask_collection: ask });
    }));
    var unsure = [];
    queue.forEach(function (r, i) {
      var refusal = validateRefusal_(resps[i]);
      if (refusal === '') r.ok = true;
      else { r.message = refusal || 'Pas de réponse d’Ecotrack.'; unsure.push(r); }
    });

    // 3. Statut réel chez Ecotrack : colis déjà validé sur leur site, ou réponse perdue.
    var statuses = {};
    try {
      statuses = ecotrackStatusLookup_(queue.map(function (r) { return r.tracking; }));
    } catch (e) {
      statuses = {};
    }
    unsure.forEach(function (r) {
      var rec = statuses[r.tracking];
      var info = rec ? ecotrackStatusInfo_(rec.status) : null;
      if (info && ['draft', 'missing', 'unknown', 'cancelled'].indexOf(info.group) < 0) {
        r.ok = true;
        r.message = 'Validé (vérifié chez Ecotrack).';
      }
    });

    // 4. Commandes « Expédiée » : le stock baisse et le SMS « expédiée » part.
    var okList = queue.filter(function (r) { return r.ok; });
    if (okList.length) {
      lockedWithRetry_(function () {
        var ctx = readOrders_();
        var now = new Date();
        okList.forEach(function (r) {
          var o = findOrder_(ctx, r.id);
          if (!o || String(o.tracking).trim() !== r.tracking || o.status !== STATUS.CONFIRMED) return;
          var rec = statuses[r.tracking];
          var raw = rec && rec.status != null ? String(rec.status).trim() : '';
          var info = ecotrackStatusInfo_(raw);
          writeFields_(ctx, o, {
            status: STATUS.SHIPPED,
            carrierStatus: info && info.group !== 'draft' ? raw : '',
            carrierMoved: now,
            updated: now
          });
          log_(user, o.id, 'Expédition validée', 'Suivi ' + r.tracking + (ask ? ' · ramassage demandé' : ' · sans ramassage (dépôt à l’agence)') +
            (labelState_(o).printed ? '' : ' · bordereau non imprimé dans l’outil'));
        });
        applyStockMoves_(ctx);
      });
    }
  } finally {
    queue.forEach(function (r) { cache.remove('valid:' + r.id); });
  }
  var ctxAfter = readOrders_();
  return { results: ids.map(function (id) { return results[id]; }), counts: countsData_(ctxAfter, null) };
}

/** À l'ouverture de « Créés, à valider » : relit chez Ecotrack les colis pas encore validés. */
function api_refreshCreated() {
  var s = syncEcotrackStatuses_({ onlyCreated: true });
  var parts = [];
  if (s.updated) parts.push(plural_(s.updated, 'colis validé chez Ecotrack est passé', 'colis validés chez Ecotrack sont passés') + ' dans Suivi');
  if (s.missing) parts.push(plural_(s.missing, 'colis introuvable', 'colis introuvables') + ' chez Ecotrack');
  return { checked: s.checked, updated: s.updated, missing: s.missing, message: parts.join(' · ') };
}

function plural_(n, one, many) {
  return n + ' ' + (n > 1 ? many : one);
}

/* ---- FollowUp.gs ---- */
/**
 * FollowUp.gs : suivi des problèmes de livraison (page Suivi).
 *
 * - Remarques du colis chez Ecotrack (get/maj) : celles du livreur (« client
 *   injoignable », « refusé »…) et les vôtres. Lues quand un colis passe
 *   « suspendu » ou « retour », et à l'ouverture de sa chronologie. La dernière
 *   remarque du livreur est gardée dans la colonne « Remarque livreur », avec
 *   une étiquette trouvée par mots-clés (Paramètres MOTS_*).
 * - SMS « livreur : injoignable » (colis suspendu, client injoignable ou sans
 *   remarque) et « sans réponse » (votre premier appel sans réponse) : une fois par commande.
 * - Résultat de l'appel au client : prévenu, reporter (remarque au livreur),
 *   nouvelle adresse ou nouveau téléphone (remarque), refus (demande de retour
 *   + client signalé, sans liste noire), pas de réponse (rappel dans 2 h, 3 fois),
 *   retour demandé.
 */

var FOLLOW = {
  MAX_CALLS: 3,          // appels sans réponse avant de proposer le retour
  MAX_REMARKS: 20,       // colis dont on lit les remarques à chaque lecture des statuts
  PREFIX: 'Vendeur : ',  // vos remarques chez Ecotrack commencent par ce texte
  MAX_LENGTH: 255        // limite d'Ecotrack pour une remarque
};

var REMARK_TAGS_ = [
  { key: 'refus', label: 'Refus' },
  { key: 'injoignable', label: 'Injoignable' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'reporte', label: 'Reporté' }
];

/** Étiquette d'une remarque du livreur ('refus', 'injoignable', 'adresse', 'reporte' ou ''). */
function remarkTag_(text, settings) {
  var t = normalizeLoose_(text);
  if (!t) return '';
  var words = (settings && settings.remarkWords) || {};
  for (var i = 0; i < REMARK_TAGS_.length; i++) {
    var list = words[REMARK_TAGS_[i].key] || [];
    for (var k = 0; k < list.length; k++) {
      if (list[k] && t.indexOf(list[k]) >= 0) return REMARK_TAGS_[i].key;
    }
  }
  return '';
}

function remarkTagLabel_(tag) {
  for (var i = 0; i < REMARK_TAGS_.length; i++) if (REMARK_TAGS_[i].key === tag) return REMARK_TAGS_[i].label;
  return '';
}

/* ------------------------------------------------------------------ */
/* Remarques du colis (get/maj)                                       */
/* ------------------------------------------------------------------ */

/**
 * Remarques d'une réponse get/maj, de la plus ancienne à la plus récente :
 * [{ text, date, author, mine }]. La documentation ne montre pas la forme exacte
 * de la réponse : on cherche une liste, puis le texte, la date et l'auteur.
 */
function parseRemarks_(json) {
  var list = listOf_(json, ['data', 'maj', 'majs', 'updates', 'remarques', 'results', 'list']);
  if (!list.length && json && typeof json === 'object' && !Array.isArray(json)) {
    Object.keys(json).some(function (k) {
      if (Array.isArray(json[k]) && json[k].length) { list = json[k]; return true; }
      return false;
    });
  }
  var notes = [];
  list.forEach(function (e, i) {
    if (e === null || e === undefined) return;
    var text = '';
    var rawDate = '';
    var author = '';
    if (typeof e === 'string') {
      text = e;
    } else if (typeof e === 'object') {
      text = String(firstOf_(e, ['content', 'contenu', 'remarque', 'message', 'text', 'comment', 'note', 'maj', 'description', 'details']));
      rawDate = firstOf_(e, ['created_at', 'date', 'datetime', 'updated_at', 'at', 'time']);
      var who = firstOf_(e, ['user', 'author', 'by', 'created_by', 'livreur', 'driver', 'source', 'from', 'type', 'role']);
      author = who && typeof who === 'object' ? String(firstOf_(who, ['name', 'nom', 'full_name', 'username', 'role', 'type'])) : String(who || '');
    }
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    var ed = ecoDate_(rawDate);
    var d = ed ? ed.date : null;
    var mine = text.indexOf(FOLLOW.PREFIX.trim()) === 0 || /exp[eé]diteur|vendeur|seller|partenaire|client_api|api/i.test(author);
    notes.push({ text: text, date: d ? d.toISOString() : '', dateText: d || isBlank_(rawDate) ? '' : String(rawDate), author: author, mine: mine, order: i });
  });
  if (notes.length && notes.every(function (n) { return n.date; })) {
    notes.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || a.order - b.order; });
  }
  return notes.map(function (n) { return { text: n.text, date: n.date, dateText: n.dateText, author: n.author, mine: n.mine }; });
}

/** Texte gardé dans « Remarque livreur » : « 14/11 10:05 · client injoignable ». */
function courierNoteText_(note) {
  if (!note) return '';
  var d = note.date ? new Date(note.date) : null;
  var when = d ? Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM HH:mm') + ' · ' : '';
  return (when + note.text).slice(0, 300);
}

/** Dernière remarque du livreur (pas une des vôtres), ou null. */
function lastCourierRemark_(notes) {
  for (var i = notes.length - 1; i >= 0; i--) if (!notes[i].mine) return notes[i];
  return null;
}

/** Remarques de plusieurs colis : { tracking: { ok, notes, last, message } }. */
function courierRemarks_(trackings) {
  var out = {};
  if (!trackings.length) return out;
  var resps = fetchAllSafe_(trackings.map(function (t) { return ecotrackRequest_('get', '/api/v1/get/maj', { tracking: t }); }));
  trackings.forEach(function (t, i) {
    var resp = resps[i];
    if (!resp || resp.error) { out[t] = { ok: false, notes: [], last: null, message: 'Ecotrack injoignable.' }; return; }
    var code = resp.getResponseCode();
    var json = null;
    try { json = JSON.parse(resp.getContentText() || 'null'); } catch (e) { json = null; }
    if (code < 200 || code >= 300 || json === null) {
      out[t] = { ok: false, notes: [], last: null, message: code >= 200 && code < 300 ? 'Réponse inattendue d’Ecotrack.' : ecotrackFail_({ code: code, json: json }).message };
      return;
    }
    var notes = parseRemarks_(json);
    out[t] = { ok: true, notes: notes, last: lastCourierRemark_(notes), message: '' };
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Demandes à Ecotrack : remarque au livreur, demande de retour       */
/* ------------------------------------------------------------------ */

/**
 * Envoie une demande (POST, ou GET si Ecotrack refuse la méthode) et lit la
 * réponse : { ok, message }.
 */
function ecotrackAsk_(path, query) {
  var res = ecotrackCall_('POST', path, { query: query });
  if (res.code === 405) res = ecotrackCall_('GET', path, { query: query });
  var json = res.json || {};
  if (!res.ok) {
    var detail = flattenEcotrackErrors_(json.errors || json.error) || String(json.message || '');
    if (res.code === 401 || res.code === 403 || res.code === 429 || res.code >= 500) return { ok: false, message: ecotrackFail_(res).message };
    return { ok: false, message: 'Ecotrack a refusé la demande (erreur ' + res.code + ')' + (detail ? ' : ' + detail : '.') };
  }
  if (json.success === false || json.error) {
    var why = flattenEcotrackErrors_(json.error || json.errors) || String(json.message || '');
    return { ok: false, message: 'Ecotrack a refusé la demande' + (why ? ' : ' + why : '.') };
  }
  return { ok: true, message: String(json.message || '') };
}

/** Remarque au livreur (add/maj), 255 caractères au plus, précédée de « Vendeur : ». */
function sendCourierRemark_(tracking, text) {
  var content = (FOLLOW.PREFIX + String(text).replace(/\s+/g, ' ').trim()).slice(0, FOLLOW.MAX_LENGTH);
  return ecotrackAsk_('/api/v1/add/maj', { tracking: tracking, content: content });
}

/** Demande de retour (possible seulement quand le colis est en livraison). */
function askReturn_(tracking) {
  var r = ecotrackAsk_('/api/v1/ask/for/order/return', { tracking: tracking });
  if (!r.ok) r.message += ' La demande de retour n’est possible que pour un colis en livraison.';
  return r;
}

/* ------------------------------------------------------------------ */
/* Client signalé (sans liste noire)                                  */
/* ------------------------------------------------------------------ */

/** Écrit le signalement dans l'onglet Clients (colonne « Signalé »). À appeler sous verrou. */
function flagClient_(ctx, o, text) {
  var p = normalizePhone(o.phone);
  if (!p.valid) return false;
  var sh = sheet_(SHEET.CLIENTS);
  ensureHeaders_(sh, CLIENT_TITLES_);
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = function (title) {
    for (var i = 0; i < header.length; i++) if (normalizeText_(header[i]) === normalizeText_(title)) return i + 1;
    return 0;
  };
  var cPhone = col('Téléphone') || 1;
  var cName = col('Nom') || 2;
  var cFlag = col('Signalé');
  var last = sh.getLastRow();
  var row = 0;
  if (last > 1) {
    var phones = sh.getRange(2, cPhone, last - 1, 1).getValues();
    for (var i = 0; i < phones.length; i++) {
      if (normalizePhone(phones[i][0]).phone === p.phone) { row = i + 2; break; }
    }
  }
  if (!row) {
    row = last + 1;
    ensureRows_(sh, row);
    sh.getRange(row, cPhone).setNumberFormat('@').setValue(p.phone);
    sh.getRange(row, cName).setValue(String(o.client || ''));
  }
  sh.getRange(row, cFlag).setValue(text);
  clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
  refreshClientAlerts_(ctx, p.phone);
  return true;
}

/* ------------------------------------------------------------------ */
/* Résultat de l'appel                                                */
/* ------------------------------------------------------------------ */

var FOLLOW_RESULTS_ = ['informed', 'postpone', 'address', 'refused', 'no_answer', 'return'];

function shortDate_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM');
}

/**
 * Ce qui s'est passé après l'appel au client (alerte de la page Suivi) :
 *   informed  : prévenu, il attend le livreur
 *   postpone  : { when } livraison reportée (remarque au livreur ; l'alerte revient ce jour-là)
 *   address   : { text } nouvelle adresse ou nouveau téléphone (remarque au livreur)
 *   refused   : refus (demande de retour, client signalé)
 *   no_answer : pas de réponse (rappel dans DELAI_RAPPEL_MINUTES, 3 fois ; SMS au premier)
 *   return    : demande de retour (client injoignable)
 */
function api_followUpResult(id, result, data) {
  var user = currentUser_();
  data = data || {};
  id = String(id);
  if (FOLLOW_RESULTS_.indexOf(result) < 0) throw new Error('Résultat inconnu.');
  var settings = getSettings_();
  var o0 = findOrder_(readOrders_(), id);
  if (!o0) throw new Error('Commande ' + id + ' introuvable.');
  if (!hasEcotrackParcel_(o0)) throw new Error('Cette commande n’a pas de colis Ecotrack.');
  if ([STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.RETURNED].indexOf(o0.status) < 0) throw new Error('Ce colis n’est plus en cours de livraison.');
  var tracking = String(o0.tracking).trim();
  var info = ecotrackStatusInfo_(o0.carrierStatus);
  var returning = !!info && (info.group === 'returning' || info.group === 'returned');
  var now = new Date();

  // 1. Ce qui part chez Ecotrack (avant d'écrire quoi que ce soit).
  var when = null;
  var text = '';
  var remark = '';
  if (result === 'postpone') {
    when = toDate_(data.when);
    if (!when || when.getTime() <= now.getTime()) throw new Error('Choisissez un jour et une heure à venir.');
    var extra = String(data.note || '').replace(/\s+/g, ' ').trim();
    remark = 'client disponible le ' + shortDate_(when) + ' à partir de ' + Utilities.formatDate(when, 'Africa/Algiers', 'HH:mm').replace(':', 'h') +
      (extra ? ' · ' + extra : '') + '. Merci de relivrer.';
  } else if (result === 'address') {
    text = String(data.text || '').replace(/\s+/g, ' ').trim();
    if (text.length < 4) throw new Error('Écrivez la nouvelle adresse ou le nouveau numéro.');
    remark = text;
  }
  if (remark) {
    var sent = sendCourierRemark_(tracking, remark);
    if (!sent.ok) throw new Error(sent.message);
  }
  var returnProblem = '';
  if (result === 'return' || (result === 'refused' && !returning)) {
    var asked = askReturn_(tracking);
    if (!asked.ok && result === 'return') throw new Error(asked.message);
    if (!asked.ok) returnProblem = asked.message;
  }

  // 2. Classeur.
  return withLock_(function () {
    var ctx = readOrders_();
    ['followNext', 'followCalls'].forEach(function (k) { ensureOrderColumn_(ctx, k); });
    var o = findOrder_(ctx, id);
    if (!o || String(o.tracking).trim() !== tracking) throw new Error('La commande a changé entre-temps : rechargez la page.');
    var f = { followUp: now, followNext: '', followCalls: '' };
    var message = '';
    if (result === 'informed') {
      log_(user, o.id, 'Suivi : client prévenu', 'Colis ' + tracking);
      message = 'Noté : le client est prévenu.';
    } else if (result === 'postpone') {
      f.followNext = when;
      log_(user, o.id, 'Suivi : livraison reportée', 'Au livreur : ' + remark);
      message = 'Remarque envoyée au livreur. L’alerte reviendra le ' + shortDate_(when) + ' si le colis n’est pas livré.';
    } else if (result === 'address') {
      var line = '[' + shortDate_(now) + '] Au livreur : ' + text;
      f.notes = String(o.notes || '').trim() ? String(o.notes).trim() + '\n' + line : line;
      log_(user, o.id, 'Suivi : information au livreur', text);
      message = 'Information envoyée au livreur.';
    } else if (result === 'refused') {
      flagClient_(ctx, o, 'A refusé un colis (' + o.id + ', ' + Utilities.formatDate(now, 'Africa/Algiers', 'dd/MM/yyyy') + ')');
      log_(user, o.id, 'Suivi : refus du client', returning ? 'Colis déjà en retour · client signalé'
        : (returnProblem ? 'Demande de retour refusée par Ecotrack · client signalé' : 'Retour demandé à Ecotrack · client signalé'));
      message = returning ? 'Le client est signalé « a refusé un colis ».'
        : returnProblem ? returnProblem + ' Le client est quand même signalé « a refusé un colis ».'
        : 'Retour demandé à Ecotrack. Le client est signalé « a refusé un colis ».';
    } else if (result === 'return') {
      log_(user, o.id, 'Suivi : retour demandé', 'Client injoignable · ' + plural_(Math.round(toNumber_(o.followCalls)) || 0, 'appel', 'appels') + ' sans réponse');
      message = 'Retour demandé à Ecotrack (la société de livraison peut l’ignorer).';
    } else if (result === 'no_answer') {
      var n = (Math.round(toNumber_(o.followCalls)) || 0) + 1;
      f.followCalls = n;
      if (n < FOLLOW.MAX_CALLS) {
        f.followNext = new Date(now.getTime() + settings.DELAI_RAPPEL_MINUTES * 60000);
        message = 'Pas de réponse (' + n + '/' + FOLLOW.MAX_CALLS + ') : rappel dans ' + durationText_(settings.DELAI_RAPPEL_MINUTES * 60000) + '.';
      } else {
        f.followUp = ''; // l'alerte reste affichée, avec la proposition de retour
        message = n + ' appels sans réponse : demandez le retour, ou laissez le livreur réessayer.';
      }
      var enRoute = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;
      if (n === 1 && enRoute) {
        noteSmsEvent_(o, 'noanswer');
        if (String(settings.SMS_SANS_REPONSE_LIVRAISON || '').trim() && smsConfig_().configured && !smsAlreadySent_(o, SMS_EVENTS_.noanswer.name)) {
          message += ' Un SMS part au client.';
        }
      }
      log_(user, o.id, 'Suivi : pas de réponse', n + '/' + FOLLOW.MAX_CALLS);
    }
    writeFields_(ctx, o, f);
    return { id: o.id, result: result, message: message, counts: countsData_(ctx, settings) };
  });
}

/* ---- Health.gs ---- */
/**
 * Health.gs : la tâche automatique de chaque minute, l'état de l'outil et
 * les alertes de panne par e-mail.
 *
 * - Une seule tâche chaque minute (everyMinute) fait tout le travail régulier :
 *   commandes Releasit (chaque minute), SMS (s'il y en a en attente),
 *   nouvelles lignes du classeur et Shopify (toutes les 5 minutes), statuts
 *   Ecotrack (toutes les SUIVI_ECOTRACK_MINUTES minutes, 60 par défaut). Quand il n'y a rien à faire, elle s'arrête
 *   tout de suite : Google limite le temps de travail des tâches automatiques
 *   (environ 90 minutes par jour pour un compte Gmail).
 * - L'état de chaque tâche (dernier passage, erreur, durée) et les minutes
 *   consommées dans la journée sont gardés dans une propriété du script : la page
 *   « État de l'outil » les lit sans ouvrir le classeur.
 * - Un e-mail part au propriétaire (lui seul) quand une tâche échoue 2 fois
 *   de suite, ne passe plus, ou quand la consommation dépasse 80 % : une fois
 *   par problème, puis « c'est réparé ».
 */

var HEALTH = {
  PROP: 'HEALTH_V1',
  PROP_NIGHT: 'HEALTH_NIGHT',
  PROP_OWNER: 'OWNER_EMAIL',
  CLAIM_SECONDS: 600,       // une tâche longue n'est jamais lancée deux fois en même temps
  QUOTA_ALERT: 0.8,         // e-mail au-delà de 80 % de la limite du jour
  MINUTE_LATE_MS: 10 * 60000
};

/** Les tâches : toutes les « every » minutes, alerte si aucun passage réussi depuis « staleMin » minutes. */
var TASKS_ = [
  { key: 'releasit', label: 'Commandes Releasit', every: 1, staleMin: 30 },
  { key: 'sms', label: 'SMS automatiques', every: 1, staleMin: 60 },
  { key: 'newrows', label: 'Nouvelles lignes du classeur', every: 5, staleMin: 60 },
  { key: 'shopify', label: 'Importation Shopify', every: 5, staleMin: 90 },
  { key: 'ecotrack', label: 'Statuts des colis Ecotrack', every: 60, staleMin: 180 },
  { key: 'nightly', label: 'Entretien de nuit', every: 1440, staleMin: 27 * 60 }
];

function taskInfo_(key) {
  for (var i = 0; i < TASKS_.length; i++) {
    if (TASKS_[i].key !== key) continue;
    if (key !== 'ecotrack') return TASKS_[i];
    // Lecture Ecotrack : intervalle réglable (30, 60 ou 120 minutes).
    var every = ecotrackEvery_();
    return { key: key, label: TASKS_[i].label, every: every, staleMin: Math.max(TASKS_[i].staleMin, every * 3) };
  }
  return null;
}

/** Minutes entre deux lectures automatiques des statuts Ecotrack (réglage SUIVI_ECOTRACK_MINUTES). */
function ecotrackEvery_() {
  try { return getSettings_().SUIVI_ECOTRACK_MINUTES; } catch (e) { return 60; }
}

function readJsonProp_(raw, fallback) {
  try {
    var v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : fallback;
  } catch (e) {
    return fallback;
  }
}

function emptyHealth_() {
  return { day: '', ms: 0, runs: 0, minute: '', tasks: {}, alerted: {}, releasitOffUntil: '' };
}

/* ------------------------------------------------------------------ */
/* La tâche de chaque minute                                          */
/* ------------------------------------------------------------------ */

/** Point d'entrée du déclencheur (chaque minute). */
function everyMinute() {
  var t0 = Date.now();
  var p = PropertiesService.getScriptProperties();
  var h = readJsonProp_(p.getProperty(HEALTH.PROP), emptyHealth_());
  h.tasks = h.tasks || {};
  h.alerted = h.alerted || {};
  var now = new Date();
  var day = ymd_(now);
  if (h.day !== day) { h.day = day; h.ms = 0; h.runs = 0; }
  var due = function (key) {
    var t = h.tasks[key];
    return !t || !t.at || now.getTime() - new Date(t.at).getTime() >= taskInfo_(key).every * 60000 - 30000;
  };

  // Commandes Releasit : chaque minute (sauf si l'onglet n'existe pas : nouvel essai dans une heure).
  if (!h.releasitOffUntil || now.getTime() >= new Date(h.releasitOffUntil).getTime()) {
    runTask_(h, 'releasit', function () {
      var s = transferReleasitOrders();
      h.releasitOffUntil = s && !s.found ? new Date(now.getTime() + 3600000).toISOString() : '';
      if (s && !s.found) return 'off';
      return s === null ? null : s;
    }, RELEASIT.PROP_LAST_ERROR);
  }
  // SMS : seulement s'il y en a en attente (lecture d'une propriété).
  if (smsConfig_().configured && readSmsQueue_(p).length) {
    runTask_(h, 'sms', function () {
      var s = sendSmsQueue();
      return s && s.error ? { error: s.error } : s;
    }, SMS.PROP_LAST_ERROR);
  }
  if (due('newrows')) runClaimed_(h, 'newrows', function () { return processNewRows(); }, '');
  if (shopifyConfig_().configured && due('shopify')) runClaimed_(h, 'shopify', function () { return importShopifyOrders(); }, SHOP.PROP_LAST_ERROR);
  if (ecotrackConfig_().configured && due('ecotrack')) runClaimed_(h, 'ecotrack', function () { return syncEcotrackStatuses(); }, ECO.PROP_LAST_ERROR);

  h.minute = new Date().toISOString();
  h.ms += Date.now() - t0;
  h.runs++;
  try { checkHealthAlerts_(h, p, new Date()); } catch (e) { /* une alerte ne doit jamais bloquer la tâche */ }
  p.setProperty(HEALTH.PROP, JSON.stringify(h));
  return h;
}

/** Lance une tâche et note le résultat. fn renvoie null en cas d'échec (erreur gardée dans errorProp). */
function runTask_(h, key, fn, errorProp) {
  var t = Date.now();
  var prev = h.tasks[key] || {};
  var ok = true;
  var err = '';
  try {
    var r = fn();
    if (r === 'off') { h.tasks[key] = { at: new Date().toISOString(), ok: true, off: true, ms: 0, err: '', fails: 0, lastOk: prev.lastOk || '' }; return; }
    if (r === null || (r && r.error)) {
      ok = false;
      err = (r && r.error) || (errorProp ? String(PropertiesService.getScriptProperties().getProperty(errorProp) || '') : '') || 'Erreur inconnue';
    }
  } catch (e) {
    ok = false;
    err = String(e && e.message ? e.message : e);
  }
  var iso = new Date().toISOString();
  h.tasks[key] = { at: iso, ok: ok, ms: Date.now() - t, err: ok ? '' : String(err).slice(0, 300), fails: ok ? 0 : (prev.fails || 0) + 1, lastOk: ok ? iso : (prev.lastOk || '') };
}

/** Même chose, mais une tâche longue n'est jamais lancée deux fois en même temps. */
function runClaimed_(h, key, fn, errorProp) {
  var cache = CacheService.getScriptCache();
  if (cache.get('run:' + key)) return;
  cache.put('run:' + key, '1', HEALTH.CLAIM_SECONDS);
  try {
    runTask_(h, key, fn, errorProp);
  } finally {
    cache.remove('run:' + key);
  }
}

/** L'entretien de nuit note son passage à part (il tourne dans une autre tâche). */
function noteNightly_(ms, errors) {
  var p = PropertiesService.getScriptProperties();
  var prev = readJsonProp_(p.getProperty(HEALTH.PROP_NIGHT), {});
  var iso = new Date().toISOString();
  var ok = !errors.length;
  p.setProperty(HEALTH.PROP_NIGHT, JSON.stringify({
    at: iso, day: ymd_(new Date()), ok: ok, ms: ms, err: ok ? '' : errors.join(' · ').slice(0, 300),
    fails: ok ? 0 : (prev.fails || 0) + 1, lastOk: ok ? iso : (prev.lastOk || '')
  }));
}

/* ------------------------------------------------------------------ */
/* Problèmes et e-mails                                               */
/* ------------------------------------------------------------------ */

/** Tâche configurée (sinon elle ne doit pas être signalée). */
function taskEnabled_(key) {
  if (key === 'shopify') return shopifyConfig_().configured;
  if (key === 'ecotrack') return ecotrackConfig_().configured;
  if (key === 'sms') return smsConfig_().configured;
  return true;
}

/** Problèmes actuels : { clé: texte }. */
function healthProblems_(h, night, now, limitMin) {
  var out = {};
  var ago = function (iso) { return durationText_(now.getTime() - new Date(iso).getTime()); };
  TASKS_.forEach(function (base) {
    var info = taskInfo_(base.key);
    var t = info.key === 'nightly' ? night : (h.tasks || {})[info.key];
    if (!t || !t.at || t.off || !taskEnabled_(info.key)) return;
    if (t.fails >= 2) out['fail:' + info.key] = info.label + ' : ' + plural_(t.fails, 'échec', 'échecs') + ' de suite (' + t.err + ')';
    else if (t.lastOk && now.getTime() - new Date(t.lastOk).getTime() > info.staleMin * 60000) {
      out['stale:' + info.key] = info.label + ' : pas de passage réussi depuis ' + ago(t.lastOk);
    }
  });
  if (h.minute && now.getTime() - new Date(h.minute).getTime() > HEALTH.MINUTE_LATE_MS) {
    out.minute = 'La tâche automatique de chaque minute ne tourne plus depuis ' + ago(h.minute);
  }
  var used = todayMinutes_(h, night, now);
  if (used >= limitMin * HEALTH.QUOTA_ALERT) {
    out.quota = 'Consommation du jour : ' + Math.round(used) + ' minutes sur environ ' + limitMin + ' permises par Google';
  }
  return out;
}

function todayMinutes_(h, night, now) {
  var day = ymd_(now);
  var ms = (h.day === day ? h.ms || 0 : 0) + (night && night.day === day ? night.ms || 0 : 0);
  return ms / 60000;
}

function ownerEmail_() {
  var stored = PropertiesService.getScriptProperties().getProperty(HEALTH.PROP_OWNER);
  if (stored) return stored;
  try { return Session.getEffectiveUser().getEmail(); } catch (e) { return ''; }
}

/** Compare avec les problèmes déjà signalés : e-mail pour les nouveaux et pour ceux qui sont réglés. */
function checkHealthAlerts_(h, p, now) {
  var night = readJsonProp_(p.getProperty(HEALTH.PROP_NIGHT), null);
  var problems = healthProblems_(h, night, now, getSettings_().LIMITE_MINUTES_JOUR);
  delete problems.minute; // cette tâche tourne : elle n'est pas en retard
  var fresh = Object.keys(problems).filter(function (k) { return !h.alerted[k]; });
  var solved = Object.keys(h.alerted).filter(function (k) { return k !== 'minute' && !problems[k]; });
  if (!fresh.length && !solved.length) return;
  var lines = [];
  if (fresh.length) {
    lines.push('Problème détecté :');
    fresh.forEach(function (k) { lines.push('• ' + problems[k]); });
    lines.push('', 'Que faire : ouvrez l’application › Administration › État de l’outil. Si une connexion est en cause (jeton Ecotrack, clé SMS, téléphone httpSMS éteint), corrigez-la dans Administration › Connexions.');
  }
  if (solved.length) {
    if (lines.length) lines.push('');
    lines.push('C’est réparé :');
    solved.forEach(function (k) { lines.push('• ' + h.alerted[k].text); });
  }
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { url = ''; }
  if (url) lines.push('', 'Application : ' + url);
  var subject = APP_NAME + ' : ' + (fresh.length ? 'problème à vérifier' : 'c’est réparé');
  var to = ownerEmail_();
  if (to && MailApp.getRemainingDailyQuota() > 0) MailApp.sendEmail(to, subject, lines.join('\n'));
  fresh.forEach(function (k) { h.alerted[k] = { at: now.toISOString(), text: problems[k] }; });
  solved.forEach(function (k) { delete h.alerted[k]; });
}

/* ------------------------------------------------------------------ */
/* Déclencheurs                                                       */
/* ------------------------------------------------------------------ */

var TRIGGER_HANDLERS_ = ['everyMinute', 'nightlyMaintenance', 'processNewRows', 'syncEcotrackStatuses', 'importShopifyOrders', 'transferReleasitOrders', 'sendSmsQueue'];

/** Deux tâches seulement : chaque minute, et chaque nuit à 3 h. Elles tournent au nom du propriétaire. */
function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_HANDLERS_.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('everyMinute').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('nightlyMaintenance').timeBased().everyDays(1).atHour(3).create();
  var email = '';
  try { email = Session.getEffectiveUser().getEmail(); } catch (e) { email = ''; }
  if (email) PropertiesService.getScriptProperties().setProperty(HEALTH.PROP_OWNER, email);
}

/* ------------------------------------------------------------------ */
/* Page « État de l'outil »                                           */
/* ------------------------------------------------------------------ */

/** Résumé léger (bandeau de l'administrateur) : la tâche tourne-t-elle, combien de problèmes. */
function healthSummary_() {
  var p = PropertiesService.getScriptProperties();
  var h = readJsonProp_(p.getProperty(HEALTH.PROP), null);
  if (!h) return { installed: false, late: false, problems: 0 };
  var now = new Date();
  var late = !!h.minute && now.getTime() - new Date(h.minute).getTime() > HEALTH.MINUTE_LATE_MS;
  return { installed: true, late: late, problems: Object.keys(h.alerted || {}).length + (late ? 1 : 0) };
}

function healthData_() {
  var p = PropertiesService.getScriptProperties();
  var h = readJsonProp_(p.getProperty(HEALTH.PROP), emptyHealth_());
  var night = readJsonProp_(p.getProperty(HEALTH.PROP_NIGHT), null);
  var now = new Date();
  var settings = getSettings_();
  var problems = healthProblems_(h, night, now, settings.LIMITE_MINUTES_JOUR);
  var tasks = TASKS_.map(function (base) {
    var info = taskInfo_(base.key);
    var t = info.key === 'nightly' ? night : (h.tasks || {})[info.key];
    var enabled = taskEnabled_(info.key) && !(info.key === 'releasit' && t && t.off);
    var state = !enabled ? 'off' : !t || !t.at ? 'wait'
      : problems['fail:' + info.key] || problems['stale:' + info.key] ? 'bad' : t.ok ? 'ok' : 'warn';
    return {
      key: info.key, label: info.label, every: info.every, state: state,
      at: t && t.at ? t.at : '', lastOk: t && t.lastOk ? t.lastOk : '', ms: t ? t.ms || 0 : 0, err: t ? t.err || '' : '', fails: t ? t.fails || 0 : 0,
      note: info.key === 'releasit' && t && t.off ? 'Onglet RELEASIT absent' : !taskEnabled_(info.key) ? 'Pas configuré' : ''
    };
  });
  var user = currentUser_();
  var owner = ownerEmail_();
  var mine = [];
  try { mine = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }); } catch (e) { mine = []; }
  return {
    running: !!h.minute && now.getTime() - new Date(h.minute).getTime() <= HEALTH.MINUTE_LATE_MS,
    minute: h.minute || '',
    tasks: tasks,
    today: { minutes: Math.round(todayMinutes_(h, night, now) * 10) / 10, limit: settings.LIMITE_MINUTES_JOUR, runs: h.day === ymd_(now) ? h.runs || 0 : 0 },
    problems: Object.keys(problems).map(function (k) { return { key: k, text: problems[k] }; }),
    owner: owner,
    isOwner: !owner || String(user.email || '').toLowerCase() === String(owner).toLowerCase(),
    triggers: user.email && owner && String(user.email).toLowerCase() === String(owner).toLowerCase()
      ? { checked: true, minute: mine.indexOf('everyMinute') >= 0, nightly: mine.indexOf('nightlyMaintenance') >= 0, old: mine.filter(function (n) { return n !== 'everyMinute' && n !== 'nightlyMaintenance' && TRIGGER_HANDLERS_.indexOf(n) >= 0; }).length }
      : { checked: false },
    errors: recentErrors_(8)
  };
}

/** Dernières erreurs du Journal (lecture des 300 dernières lignes seulement). */
function recentErrors_(n) {
  var sh = ss_().getSheetByName(SHEET.LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  var last = sh.getLastRow();
  var count = Math.min(300, last - 1);
  var rows = sh.getRange(last - count + 1, 1, count, 5).getValues();
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < n; i--) {
    if (/erreur|non envoyé|échec/i.test(String(rows[i][3]))) {
      out.push({ date: iso_(rows[i][0]), who: String(rows[i][1]), action: String(rows[i][3]), detail: String(rows[i][4]).slice(0, 300) });
    }
  }
  return out;
}

/** Réinstalle les deux tâches automatiques (le propriétaire seulement : elles tournent à son nom). */
function api_reinstallTriggers() {
  requireAdmin_();
  var owner = PropertiesService.getScriptProperties().getProperty(HEALTH.PROP_OWNER);
  var me = String(currentUser_().email || '').toLowerCase();
  if (owner && me && owner.toLowerCase() !== me) {
    throw new Error('Seul le propriétaire du classeur (' + owner + ') peut réinstaller les tâches automatiques : elles tournent à son nom.');
  }
  installTriggers_();
  return { message: 'Tâches automatiques réinstallées : chaque minute, et chaque nuit à 3 h.', health: healthData_() };
}

/* ---- Stats.gs ---- */
/**
 * Stats.gs : page Statistiques (administrateur) : commandes et argent.
 *
 * Pour rester rapide même sur un an : chaque nuit, l'outil calcule un résumé
 * par jour (date de commande) dans l'onglet caché « Stats » : une ligne par
 * jour, le résumé en JSON. La page lit seulement les lignes de la période ;
 * la journée en cours (et celle du dernier calcul) est calculée en direct.
 * Bouton « Recalculer » pour tout refaire tout de suite.
 *
 * Prime des confirmatrices : montant en dinars par commande livrée, avec sa
 * date de début (réglage PRIMES, ex. « 2026-11-01=50; 2027-01-01=60 ») ;
 * chaque commande prend le montant valable à sa date de commande.
 */

var STATS = {
  SHEET: 'Stats',
  TITLES: ['Jour', 'Résumé'],
  PROP_BUILT: 'STATS_BUILT',
  // Colonnes des groupes : [commandes, confirmées, livrées, retours, annulées, encaissé, bénéfice, heures de livraison, livrées datées]
  N: 0, C: 1, D: 2, R: 3, X: 4, REV: 5, PROFIT: 6, DH: 7, DN: 8, SIZE: 9
};

/* ------------------------------------------------------------------ */
/* Résumé d'un jour                                                   */
/* ------------------------------------------------------------------ */

function emptyDay_() {
  return { n: 0, c: 0, s: 0, d: 0, r: 0, x: 0, q: 0, t: 0, rev: 0, sales: 0, fee: 0, dnet: 0, cost: 0, retf: 0, pack: 0, profit: 0,
    dh: 0, dn: 0, w: {}, p: {}, a: {}, src: {}, cp: {}, cr: {}, tag: {}, h: [] };
}

function groupRow_(map, key) {
  if (!map[key]) { map[key] = []; for (var i = 0; i < STATS.SIZE; i++) map[key].push(0); }
  return map[key];
}

/** Ajoute une commande à un groupe (share = part de la commande, pour un article parmi plusieurs). */
function addToRow_(row, o, p, share, hours) {
  row[STATS.N] += share;
  if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) row[STATS.C] += share;
  if (o.status === STATUS.DELIVERED) row[STATS.D] += share;
  if (o.status === STATUS.RETURNED) row[STATS.R] += share;
  if (o.status === STATUS.CANCELLED) row[STATS.X] += share;
  if (p.profit !== null) {
    row[STATS.REV] += p.revenue * share;
    row[STATS.PROFIT] += p.profit * share;
  }
  if (hours !== null) { row[STATS.DH] += hours * share; row[STATS.DN] += share; }
}

function hoursBetween_(a, b) {
  var da = toDate_(a);
  var db = toDate_(b);
  if (!da || !db || db < da) return null;
  return (db.getTime() - da.getTime()) / 3600000;
}

/** Ajoute une commande au résumé de son jour. */
function addOrderToDay_(day, o, env, catalog) {
  var p = orderProfit_(o, env, catalog);
  var settings = env.settings;
  day.n++;
  if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) day.c++;
  if (SHIPPED_STATUSES.indexOf(o.status) >= 0) day.s++;
  if (o.status === STATUS.DELIVERED) day.d++;
  if (o.status === STATUS.RETURNED) day.r++;
  if (o.status === STATUS.CANCELLED) day.x++;
  if (TODO_STATUSES_.indexOf(o.status) >= 0) day.q++;
  if (o.status === STATUS.CONFIRMED || o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) day.t++;
  if (p.profit !== null) {
    day.rev += p.revenue; day.sales += p.sales; day.fee += p.fee; day.dnet += p.deliveryNet; day.cost += p.cost;
    day.retf += p.returnFee; day.pack += p.packaging; day.profit += p.profit;
  }
  var dh = o.status === STATUS.DELIVERED ? hoursBetween_(o.date, o.deliveredAt) : null;
  if (dh !== null) { day.dh += dh; day.dn++; }

  var wilaya = String(o.wilaya || '').trim() || '(sans wilaya)';
  addToRow_(groupRow_(day.w, wilaya), o, p, 1, dh);
  var agent = String(o.agent || '').trim() || '(sans confirmatrice)';
  var aRow = groupRow_(day.a, agent);
  addToRow_(aRow, o, p, 1, null);
  var ch = hoursBetween_(o.date, o.confirmedAt);
  if (ch !== null) { aRow[STATS.DH] += ch; aRow[STATS.DN]++; } // pour l'équipe : délai avant confirmation
  var platform = adPlatform_(o.adSource) || (String(o.adSource || '').trim() || 'Sans publicité suivie');
  addToRow_(groupRow_(day.src, platform), o, p, 1, null);
  var campaign = String(o.campaign || '').replace(/\s+/g, ' ').trim() || '(sans campagne)';
  addToRow_(groupRow_(day.cp, campaign), o, p, 1, null);

  var items = orderItems_(o);
  var totalQty = items.reduce(function (a, it) { return a + it.qty; }, 0) || 1;
  items.forEach(function (it) {
    var row = matchCatalog_(catalog, it.label);
    var name = row ? row.product + (row.model ? ' — ' + row.model : '') : it.label;
    addToRow_(groupRow_(day.p, name), o, p, it.qty / totalQty, null);
  });
  if (o.status === STATUS.CANCELLED) {
    var reason = String(o.cancelReason || '').trim() || '(sans motif)';
    day.cr[reason] = (day.cr[reason] || 0) + 1;
  }
  if (o.courierNote && (o.status === STATUS.RETURNED || o.status === STATUS.IN_DELIVERY)) {
    var tag = remarkTag_(o.courierNote, settings) || 'autre';
    day.tag[tag] = (day.tag[tag] || 0) + 1;
  }
  var d = toDate_(o.date);
  if (d) {
    var hour = +Utilities.formatDate(d, 'Africa/Algiers', 'H');
    while (day.h.length < 24) day.h.push(0);
    day.h[hour]++;
  }
}

/** Arrondit les montants d'un résumé (JSON plus court). */
function roundDay_(day) {
  ['rev', 'sales', 'fee', 'dnet', 'cost', 'retf', 'pack', 'profit', 'dh'].forEach(function (k) { day[k] = Math.round(day[k]); });
  ['w', 'p', 'a', 'src', 'cp'].forEach(function (g) {
    Object.keys(day[g]).forEach(function (k) {
      day[g][k] = day[g][k].map(function (v, i) { return i === STATS.N || i === STATS.C || i === STATS.D || i === STATS.R || i === STATS.X || i === STATS.DN ? Math.round(v * 100) / 100 : Math.round(v); });
    });
  });
  return day;
}

/** Résumés par jour d'une liste de commandes : { 'aaaa-mm-jj': résumé }. */
function summarizeDays_(orders, env, catalog, sinceDay) {
  var days = {};
  orders.forEach(function (o) {
    var d = toDate_(o.date);
    if (!d) return;
    var key = ymd_(d);
    if (sinceDay && key < sinceDay) return;
    addOrderToDay_(days[key] || (days[key] = emptyDay_()), o, env, catalog);
  });
  Object.keys(days).forEach(function (k) { roundDay_(days[k]); });
  return days;
}

/* ------------------------------------------------------------------ */
/* Onglet caché « Stats »                                             */
/* ------------------------------------------------------------------ */

function statsSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(STATS.SHEET);
  if (!sh) {
    sh = ss.insertSheet(STATS.SHEET);
    sh.getRange(1, 1, 1, 2).setValues([STATS.TITLES]);
    sh.setFrozenRows(1);
    try { sh.hideSheet(); } catch (e) { /* sans importance */ }
  }
  return sh;
}

/** Recalcule tous les résumés (commandes + archive). Chaque nuit, et sur demande. */
function rebuildStats_() {
  var ctx = readOrders_();
  var env = makeEnv_(ctx);
  var catalog = readCatalog_();
  var days = summarizeDays_(ctx.orders.concat(readArchivedOrders_()), env, catalog, '');
  var keys = Object.keys(days).sort();
  var sh = statsSheet_();
  withLock_(function () {
    var last = sh.getLastRow();
    if (keys.length) {
      ensureRows_(sh, keys.length + 1);
      sh.getRange(2, 1, keys.length, 1).setNumberFormat('@');
      sh.getRange(2, 1, keys.length, 2).setValues(keys.map(function (k) { return [k, JSON.stringify(days[k])]; }));
    }
    // Anciennes lignes en trop (jours qui n'existent plus) : supprimées.
    if (last > keys.length + 1) sh.deleteRows(keys.length + 2, last - keys.length - 1);
  });
  PropertiesService.getScriptProperties().setProperty(STATS.PROP_BUILT, new Date().toISOString());
  return { days: keys.length };
}

/** Résumés enregistrés entre deux jours (lecture des seules lignes utiles). */
function readStoredDays_(fromDay, toDay) {
  var sh = ss_().getSheetByName(STATS.SHEET);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var keys = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).slice(0, 10); });
  var first = -1;
  var last = -1;
  keys.forEach(function (k, i) {
    if (k >= fromDay && k <= toDay) { if (first < 0) first = i; last = i; }
  });
  if (first < 0) return out;
  sh.getRange(first + 2, 1, last - first + 1, 2).getValues().forEach(function (r) {
    var k = String(r[0]).slice(0, 10);
    try { out[k] = JSON.parse(r[1]); } catch (e) { /* ligne abîmée : ignorée */ }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Prime des confirmatrices                                           */
/* ------------------------------------------------------------------ */

/** « 2026-11-01=50; 2027-01-01=60 » → [{ from, amount }] triés. */
function parsePrimes_(text) {
  return String(text || '').split(/[;\n]/).map(function (part) {
    var m = part.match(/(\d{4}-\d{2}-\d{2})\s*[=:]\s*(\d+(?:[.,]\d+)?)/);
    return m ? { from: m[1], amount: toNumber_(m[2]) } : null;
  }).filter(function (x) { return x; }).sort(function (a, b) { return a.from.localeCompare(b.from); });
}

function primeAt_(primes, day) {
  var amount = 0;
  primes.forEach(function (p) { if (p.from <= day) amount = p.amount; });
  return amount;
}

/** Nouveau montant de la prime à partir d'un jour (les jours d'avant gardent l'ancien). */
function api_setPrime(amount, fromDay) {
  requireAdmin_();
  var a = Math.round(toNumber_(amount));
  if (!(a >= 0)) throw new Error('Montant invalide.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDay || ''))) throw new Error('Date de début invalide.');
  var list = parsePrimes_(getSettings_().PRIMES).filter(function (p) { return p.from !== fromDay; });
  list.push({ from: fromDay, amount: a });
  list.sort(function (x, y) { return x.from.localeCompare(y.from); });
  var text = list.map(function (p) { return p.from + '=' + p.amount; }).join('; ');
  writeSettings_({ PRIMES: text }, currentUser_());
  return { primes: list, message: 'Prime : ' + a + ' DA par commande livrée à partir du ' + fromDay.split('-').reverse().join('/') + '.' };
}

/* ------------------------------------------------------------------ */
/* Page Statistiques                                                  */
/* ------------------------------------------------------------------ */

function addDayDays_(day, n) {
  var d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayCount_(from, to) {
  return Math.round((new Date(to + 'T12:00:00Z').getTime() - new Date(from + 'T12:00:00Z').getTime()) / 86400000) + 1;
}

/** Additionne des résumés de jours. */
function mergeDays_(days, keys, primes) {
  var t = emptyDay_();
  var groups = { w: {}, p: {}, a: {}, src: {}, cp: {} };
  var prime = {};
  keys.forEach(function (k) {
    var d = days[k];
    if (!d) return;
    ['n', 'c', 's', 'd', 'r', 'x', 'q', 't', 'rev', 'sales', 'fee', 'dnet', 'cost', 'retf', 'pack', 'profit', 'dh', 'dn'].forEach(function (f) { t[f] += d[f] || 0; });
    Object.keys(groups).forEach(function (g) {
      Object.keys(d[g] || {}).forEach(function (name) {
        var row = groupRow_(groups[g], name);
        d[g][name].forEach(function (v, i) { row[i] += v; });
        if (g === 'a' && primes) prime[name] = (prime[name] || 0) + d[g][name][STATS.D] * primeAt_(primes, k);
      });
    });
    Object.keys(d.cr || {}).forEach(function (r) { t.cr[r] = (t.cr[r] || 0) + d.cr[r]; });
    Object.keys(d.tag || {}).forEach(function (r) { t.tag[r] = (t.tag[r] || 0) + d.tag[r]; });
    (d.h || []).forEach(function (v, i) { while (t.h.length < 24) t.h.push(0); t.h[i] += v; });
  });
  t.groups = groups;
  t.prime = prime;
  return t;
}

function ratio_(a, b) { return b ? a / b : null; }

/** Indicateurs d'une période. */
function kpis_(t, expenses, gains) {
  var finished = t.d + t.r;
  gains = gains || 0;
  return {
    orders: t.n, confirmed: t.c, shipped: t.s, delivered: t.d, returned: t.r, cancelled: t.x, pending: t.q, inProgress: t.t,
    confirmRate: ratio_(t.c, t.n), deliveryRate: ratio_(t.d, finished), returnRate: ratio_(t.r, finished), cancelRate: ratio_(t.x, t.n),
    revenue: t.rev, sales: t.sales, deliveryFees: t.fee, deliveryNet: t.dnet, productCost: t.cost, returnFees: t.retf, packaging: t.pack,
    ordersProfit: t.profit, expenses: Math.round(expenses), gains: Math.round(gains), net: Math.round(t.profit - expenses + gains),
    lostToReturns: t.retf + (t.r ? Math.round(t.pack * t.r / Math.max(t.d + t.r, 1)) : 0),
    avgBasket: t.d ? Math.round(t.rev / t.d) : null,
    profitPerDelivered: t.d ? Math.round(t.profit / t.d) : null,
    avgDeliveryHours: t.dn ? Math.round(t.dh / t.dn) : null
  };
}

function groupList_(map, extra) {
  return Object.keys(map).map(function (name) {
    var r = map[name];
    var finished = r[STATS.D] + r[STATS.R];
    var g = {
      name: name, orders: Math.round(r[STATS.N] * 10) / 10, confirmed: Math.round(r[STATS.C] * 10) / 10, delivered: Math.round(r[STATS.D] * 10) / 10,
      returned: Math.round(r[STATS.R] * 10) / 10, cancelled: Math.round(r[STATS.X] * 10) / 10, revenue: Math.round(r[STATS.REV]), profit: Math.round(r[STATS.PROFIT]),
      confirmRate: ratio_(r[STATS.C], r[STATS.N]), deliveryRate: ratio_(r[STATS.D], finished), returnRate: ratio_(r[STATS.R], finished),
      avgHours: r[STATS.DN] ? Math.round(r[STATS.DH] / r[STATS.DN]) : null
    };
    if (extra) extra(g, name, r);
    return g;
  }).sort(function (a, b) { return b.orders - a.orders; });
}

/** Période : « today », « 7 », « 30 », « month », « lastmonth », ou dates « aaaa-mm-jj ». */
function statsRange_(period, from, to) {
  var today = ymd_(new Date());
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) return from <= to ? { from: from, to: to } : { from: to, to: from };
  if (period === 'today') return { from: today, to: today };
  if (period === 'yesterday') { var y = addDayDays_(today, -1); return { from: y, to: y }; }
  if (period === 'month') return { from: today.slice(0, 8) + '01', to: today };
  if (period === 'lastmonth') {
    var first = today.slice(0, 8) + '01';
    var lastPrev = addDayDays_(first, -1);
    return { from: lastPrev.slice(0, 8) + '01', to: lastPrev };
  }
  var n = Math.min(Math.max(Math.round(toNumber_(period)) || 30, 1), 366);
  return { from: addDayDays_(today, -(n - 1)), to: today };
}

/**
 * Période des pages Bénéfices et Tableau de bord : comme statsRange_, plus « all » (tout,
 * from = '') ; renvoie aussi la période précédente de même durée (sauf pour « all »).
 */
function periodRange_(period, from, to) {
  var today = ymd_(new Date());
  if (period === 'all' && !(from && to)) return { from: '', to: today, prevFrom: '', prevTo: '', days: 0, all: true };
  var r = statsRange_(period, from, to);
  var len = dayCount_(r.from, r.to);
  return { from: r.from, to: r.to, prevFrom: addDayDays_(r.from, -len), prevTo: addDayDays_(r.from, -1), days: len, all: false };
}

/** Commande dont la date (heure d'Algérie) est dans la période. */
function inDayRange_(date, from, to) {
  var d = toDate_(date);
  if (!d) return false;
  var k = ymd_(d);
  return (!from || k >= from) && (!to || k <= to);
}

/** Statistiques : mesurée (Administration › État de l'outil). */
function api_stats() {
  var a = arguments;
  return timed_('Statistiques', function () { return statsApi_.apply(null, a); });
}

function statsApi_(period, from, to) {
  requireAdmin_();
  var settings = getSettings_();
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty(STATS.PROP_BUILT)) rebuildStats_(); // premier passage : tout est calculé une fois
  var built = toDate_(p.getProperty(STATS.PROP_BUILT));
  var range = statsRange_(period, from, to);
  var len = dayCount_(range.from, range.to);
  var prevTo = addDayDays_(range.from, -1);
  var prevFrom = addDayDays_(range.from, -len);
  var days = readStoredDays_(prevFrom, range.to);

  // En direct : depuis le jour du dernier calcul (les commandes de ces jours sont dans l'onglet Commandes).
  var ctx = readOrders_();
  var env = makeEnv_(ctx);
  var liveFrom = built ? ymd_(built) : prevFrom;
  if (liveFrom <= range.to) {
    var live = summarizeDays_(ctx.orders, env, readCatalog_(), liveFrom);
    Object.keys(days).forEach(function (k) { if (k >= liveFrom) delete days[k]; });
    Object.keys(live).forEach(function (k) { days[k] = live[k]; });
  }

  var list = function (a, b) { var out = []; for (var k = a; k <= b; k = addDayDays_(k, 1)) out.push(k); return out; };
  var curKeys = list(range.from, range.to);
  var prevKeys = list(prevFrom, prevTo);
  var primes = parsePrimes_(settings.PRIMES);
  var cur = mergeDays_(days, curKeys, primes);
  var prev = mergeDays_(days, prevKeys, null);

  // Dépenses (publicité comprise) de chaque période.
  // Une dépense sur plusieurs jours est répartie par jour ; les gains s'ajoutent au bénéfice net.
  var expenses = readExpenses_(settings);
  var spend = function (a, b) { return expenses.reduce(function (s, e) { return e.gain ? s : s + expenseShare_(e, a, b); }, 0); };
  var gains = function (a, b) { return expenses.reduce(function (s, e) { return e.gain ? s + expenseShare_(e, a, b) : s; }, 0); };
  var adBy = { cp: {}, src: {} };
  expenses.forEach(function (e) {
    if (!e.ad || e.gain) return;
    var part = expenseShare_(e, range.from, range.to);
    if (!part) return;
    var ck = normalizeLoose_(e.campaign);
    if (ck) adBy.cp[ck] = (adBy.cp[ck] || 0) + part;
    if (e.platform) adBy.src[normalizeLoose_(e.platform)] = (adBy.src[normalizeLoose_(e.platform)] || 0) + part;
  });
  var withSpend = function (kind) {
    return function (g, name) {
      var s = adBy[kind][normalizeLoose_(name)] || 0;
      g.spend = Math.round(s);
      g.costPerDelivered = s && g.delivered ? Math.round(s / g.delivered) : null;
      g.net = g.profit - g.spend;
    };
  };

  var k = kpis_(cur, spend(range.from, range.to), gains(range.from, range.to));
  var kp = kpis_(prev, spend(prevFrom, prevTo), gains(prevFrom, prevTo));
  // Argent maintenant (colis en cours) : à recevoir, et prévu selon votre taux de livraison.
  // Versements d'Ecotrack : ceux qui ont bougé depuis le début de la période.
  var sinceDays = Math.max(dayCount_(range.from, ymd_(new Date())), 1);
  var tm = trackingMoney_(ctx.orders, new Date(), sinceDays);
  var m = tm.money;
  var rate = k.deliveryRate !== null ? k.deliveryRate : kp.deliveryRate;
  var wilayas = groupList_(cur.groups.w, function (g, name, r) { g.lost = Math.round(r[STATS.R] * settings.FRAIS_RETOUR); });
  var overallReturn = k.returnRate || 0;
  wilayas.forEach(function (g) { g.bad = g.returnRate !== null && (g.delivered + g.returned) >= 5 && g.returnRate >= overallReturn + 0.1; });

  return {
    range: { from: range.from, to: range.to, prevFrom: prevFrom, prevTo: prevTo, days: len },
    builtAt: built ? built.toISOString() : '',
    kpis: k,
    prev: kp,
    series: curKeys.map(function (key) {
      var d = days[key] || emptyDay_();
      return { day: key, orders: d.n, confirmed: d.c, delivered: d.d, returned: d.r, revenue: d.rev, profit: d.profit };
    }),
    money: {
      toReceive: m.delivered.amount + m.cashed.amount + m.ready.amount,
      enRoute: m.enRoute.amount,
      expected: rate !== null ? Math.round(m.enRoute.amount * rate) : null,
      deliveryRate: rate,
      buckets: m,
      paidDays: sinceDays,
      payments: tm.payments
    },
    wilayas: wilayas,
    products: groupList_(cur.groups.p),
    agents: groupList_(cur.groups.a, function (g, name, r) {
      g.avgConfirmHours = r[STATS.DN] ? Math.round(r[STATS.DH] / r[STATS.DN] * 10) / 10 : null;
      g.avgHours = null;
      g.prime = Math.round(cur.prime[name] || 0);
    }),
    sources: groupList_(cur.groups.src, withSpend('src')),
    campaigns: groupList_(cur.groups.cp, withSpend('cp')),
    cancelReasons: Object.keys(cur.cr).map(function (r) { return { name: r, count: cur.cr[r] }; }).sort(function (a, b) { return b.count - a.count; }),
    courierTags: Object.keys(cur.tag).map(function (t) { return { name: remarkTagLabel_(t) || 'Autre remarque', count: cur.tag[t] }; }).sort(function (a, b) { return b.count - a.count; }),
    hours: cur.h.length ? cur.h : [],
    weekdays: weekdayCounts_(days, curKeys),
    primes: primes,
    primeNow: primeAt_(primes, ymd_(new Date()))
  };
}

/** Commandes par jour de la semaine (lundi d'abord). */
function weekdayCounts_(days, keys) {
  var out = [0, 0, 0, 0, 0, 0, 0];
  keys.forEach(function (k) {
    if (!days[k]) return;
    var wd = new Date(k + 'T12:00:00Z').getUTCDay(); // 0 = dimanche
    out[(wd + 6) % 7] += days[k].n;
  });
  return out;
}

/** « Recalculer » : refait tous les résumés tout de suite. */
function api_rebuildStats() {
  requireAdmin_();
  var r = rebuildStats_();
  return { message: plural_(r.days, 'jour recalculé', 'jours recalculés') + '.' };
}

/* ---- Admin.gs ---- */
/**
 * Admin.gs : page Administration (administrateur seulement), à la place du
 * menu du classeur : connexions (Ecotrack, SMS, Shopify, Releasit), réglages
 * en formulaires, équipe (avec partage du classeur), clients (liste noire,
 * signalés), entretien du classeur, état de l'outil.
 *
 * Les clés et jetons ne sont jamais renvoyés à la page : seulement leur fin
 * (« ••••1234 »). Chaque changement est noté dans le Journal, sans la clé.
 *
 * Les pages lourdes (Stock, Bénéfices, Statistiques, Administration) sont
 * envoyées au navigateur seulement quand on les ouvre (api_pageScript).
 */

var ROLES_ = ['Administrateur', 'Confirmatrice', 'Magasinier'];

/** Groupes de réglages, dans l'ordre de la page. Les réglages non listés vont dans « Autres ». */
var SETTING_GROUPS_ = [
  { title: 'Boutique', keys: ['NOM_BOUTIQUE', 'SOCIETE_PAR_DEFAUT', 'MESSAGE_WHATSAPP'] },
  { title: 'Appels et confirmation', keys: ['APPELS_PAR_JOUR', 'JOURS_D_APPELS', 'ANNULATION_AUTO', 'HEURE_DEBUT_APPELS', 'ORDRE_FILE', 'DELAI_RAPPEL_MINUTES', 'ATTENTE_MAX_HEURES', 'DOUBLON_HEURES', 'MOTIFS_ANNULATION'] },
  { title: 'Suivi des colis', keys: ['SUIVI_ECOTRACK_MINUTES', 'SUIVI_ALERTE_HEURES', 'SUIVI_HEURES_TRI', 'SUIVI_HEURES_ROUTE', 'SUIVI_HEURES_SUD', 'SUIVI_HEURES_LIVRAISON', 'WILAYAS_SUD', 'RETOUR_BLOQUE_JOURS', 'ARGENT_RETARD_JOURS', 'MOTS_INJOIGNABLE', 'MOTS_REFUS', 'MOTS_REPORTE', 'MOTS_ADRESSE'] },
  { title: 'Expédition', keys: ['FORMAT_BORDEREAU', 'RAMASSAGE'] },
  { title: 'SMS', keys: ['SMS_HEURES'], prefix: 'SMS_' },
  { title: 'Stock', keys: ['COUT_MOYEN', 'STOCK_SEUIL'] },
  { title: 'Bénéfices et primes', keys: ['FRAIS_RETOUR', 'COUT_EMBALLAGE', 'TAUX_DOLLAR', 'CATEGORIES_DEPENSES', 'CATEGORIES_GAINS', 'PRIMES'] },
  { title: 'Shopify', keys: ['SHOPIFY_TAG', 'SHOPIFY_JOURS_INITIAL', 'SHOPIFY_API_VERSION'] },
  { title: 'Entretien', keys: ['ARCHIVE_JOURS', 'JOURNAL_JOURS', 'CORBEILLE_JOURS', 'LIMITE_MINUTES_JOUR'] }
];

/** Réglages à choix (fonction : CARRIERS est défini dans un autre fichier). */
function settingChoices_(key) {
  var map = { ORDRE_FILE: ['récentes', 'anciennes'], FORMAT_BORDEREAU: ['A4', '10x15'], SOCIETE_PAR_DEFAUT: CARRIERS, SUIVI_ECOTRACK_MINUTES: ['30', '60', '120'] };
  return map[key] || null;
}
var LONG_SETTINGS_ = ['MESSAGE_WHATSAPP', 'MOTIFS_ANNULATION', 'MOTS_INJOIGNABLE', 'MOTS_REFUS', 'MOTS_REPORTE', 'MOTS_ADRESSE', 'CATEGORIES_DEPENSES', 'CATEGORIES_GAINS', 'WILAYAS_SUD', 'PRIMES'];

function settingType_(key, def) {
  if (settingChoices_(key)) return 'choice';
  if (/^SMS_/.test(key) && key !== 'SMS_HEURES') return 'sms';
  if (LONG_SETTINGS_.indexOf(key) >= 0) return 'long';
  if (typeof def === 'number') return 'num';
  if (def === 'OUI' || def === 'NON') return 'yesno';
  return 'text';
}

/** Fin d'une clé, pour la reconnaître sans la montrer. */
function maskSecret_(v) {
  var s = String(v || '');
  return s ? '••••' + s.slice(-4) : '';
}

function adminLog_(user, action, detail) {
  withLogBatch_(function () { log_(user, '', action, detail || ''); });
}

/* ------------------------------------------------------------------ */
/* Pages chargées à la demande                                        */
/* ------------------------------------------------------------------ */

var LAZY_PAGES_ = {
  stock: { file: 'PageStock', access: 'stock', fn: 'api_stockPage' },
  benefices: { file: 'PageProfit', access: 'admin', fn: 'api_profit' },
  stats: { file: 'PageStats', access: 'admin', fn: 'api_stats' },
  admin: { file: 'PageAdmin', access: 'admin', fn: 'api_adminOverview' }
};

/**
 * Code d'une page lourde, envoyé seulement quand on l'ouvre (et seulement si on y a droit),
 * avec ses premières données (spec = { fn, args }) : un seul aller-retour.
 */
function api_pageScript(name, spec) {
  var page = LAZY_PAGES_[name];
  if (!page) throw new Error('Page inconnue.');
  if (page.access === 'admin') requireAdmin_(); else requireStockAccess_();
  var out = { code: include(page.file), preload: null };
  if (spec && spec.fn === page.fn) {
    var args = Array.isArray(spec.args) ? JSON.parse(JSON.stringify(spec.args)) : [];
    try {
      out.preload = { key: spec.fn + '|' + JSON.stringify(args), data: globalApi_(spec.fn).apply(null, args) };
    } catch (e) {
      out.preload = null; // la page demandera ses données elle-même et affichera l'erreur
    }
  }
  return out;
}

function globalApi_(fn) {
  var map = { api_stockPage: api_stockPage, api_profit: api_profit, api_stats: api_stats, api_adminOverview: api_adminOverview };
  return map[fn];
}

/* ------------------------------------------------------------------ */
/* Connexions                                                         */
/* ------------------------------------------------------------------ */

function connectionsData_() {
  var p = PropertiesService.getScriptProperties();
  var eco = ecotrackConfig_();
  var sms = smsConfig_();
  var shop = shopifyConfig_();
  var smsInfo = smsStatus_();
  var rel = { found: false, missing: [] };
  try { rel = releasitColumnsReport_(); } catch (e) { rel = { found: false, missing: [] }; }
  return {
    ecotrack: {
      configured: eco.configured, url: eco.url, token: maskSecret_(eco.token),
      lastSync: String(p.getProperty(ECO.PROP_LAST_SYNC) || ''), lastError: String(p.getProperty(ECO.PROP_LAST_ERROR) || '')
    },
    sms: {
      configured: sms.configured, from: smsInfo.from, key: maskSecret_(sms.key), hours: smsInfo.hours, waiting: smsInfo.waiting,
      lastRun: smsInfo.lastRun, lastError: smsInfo.lastError, statuses: smsInfo.statuses
    },
    shopify: {
      configured: shop.configured, shop: shop.shop, mode: shop.configured ? shop.mode : '',
      key: maskSecret_(shop.token || shop.clientId),
      lastRun: String(p.getProperty(SHOP.PROP_LAST_RUN) || ''), lastError: String(p.getProperty(SHOP.PROP_LAST_ERROR) || '')
    },
    releasit: {
      found: rel.found, missing: rel.missing || [],
      lastRun: String(p.getProperty(RELEASIT.PROP_LAST_RUN) || ''), lastError: String(p.getProperty(RELEASIT.PROP_LAST_ERROR) || '')
    },
    cloud: cloudStatus_()
  };
}

/** Page Administration : tout ce qu'il faut pour la première vue (état et connexions). */
/** Administration : mesurée (Administration › État de l'outil). */
function api_adminOverview() {
  var a = arguments;
  return timed_('Administration', function () { return adminOverviewApi_.apply(null, a); });
}

function adminOverviewApi_() {
  requireAdmin_();
  return { health: healthData_(), connections: connectionsData_(), version: APP_VERSION, perf: readPerf_() };
}

/** Ecotrack : adresse et jeton (jeton vide = garder l'actuel), puis test. */
function api_saveEcotrack(url, token) {
  var user = requireAdmin_();
  var cur = ecotrackConfig_();
  var t = String(token || '').trim() || cur.token;
  if (!t) throw new Error('Collez le jeton API de votre compte Ecotrack.');
  saveEcotrackConfig_(url || cur.url, t);
  adminLog_(user, 'Connexion Ecotrack enregistrée', normalizeEcotrackUrl_(url || cur.url) + (String(token || '').trim() ? ' · nouveau jeton' : ''));
  var res = { saved: true, ok: true, message: '' };
  try {
    var r = ecotrackTest_();
    res.message = 'Enregistré. Connexion réussie : jeton valide, ' + r.wilayas + ' wilayas desservies.';
  } catch (e) {
    res.ok = false;
    res.message = 'Enregistré, mais le test échoue : ' + (e && e.message ? e.message : e);
  }
  res.connections = connectionsData_();
  return res;
}

/** SMS : clé httpSMS (vide = garder l'actuelle) et numéro de la carte SIM. */
function api_saveSms(key, from) {
  var user = requireAdmin_();
  var cur = smsConfig_();
  var k = String(key || '').trim() || cur.key;
  if (!k) throw new Error('Collez la clé API de la page Settings de httpsms.com.');
  var r = saveSmsConfig_(k, from || ('0' + String(cur.from || '').replace(/^\+213/, '')));
  adminLog_(user, 'SMS enregistrés', 'Numéro ' + r.from + (String(key || '').trim() ? ' · nouvelle clé' : ''));
  return { saved: true, message: 'Enregistré : les SMS partiront du ' + r.from + '.', connections: connectionsData_() };
}

/** Shopify : boutique et accès (jeton shpat_, ou identifiant client + secret). */
function api_saveShopify(shop, key, secret) {
  var user = requireAdmin_();
  var cur = shopifyConfig_();
  var k = String(key || '').trim();
  if (!k) {
    if (!cur.configured) throw new Error('Collez le jeton d’accès Shopify (shpat_…) ou l’identifiant client.');
    k = cur.mode === 'token' ? cur.token : cur.clientId;
    if (!String(secret || '').trim() && cur.mode === 'client') secret = cur.clientSecret;
  }
  saveShopifyConfig_(shop || cur.shop, k, secret || '');
  adminLog_(user, 'Connexion Shopify enregistrée', normalizeShopifyDomain_(shop || cur.shop));
  var res = { saved: true, ok: true, message: '' };
  try {
    res.message = 'Enregistré. ' + api_shopifyTest().message;
  } catch (e) {
    res.ok = false;
    res.message = 'Enregistré, mais le test échoue : ' + (e && e.message ? e.message : e);
  }
  res.connections = connectionsData_();
  return res;
}

/* ------------------------------------------------------------------ */
/* Réglages                                                           */
/* ------------------------------------------------------------------ */

/** Valeurs brutes de l'onglet Paramètres : { clé: { row, value } }. */
function readSettingRows_() {
  var sh = sheet_(SHEET.SETTINGS);
  var out = {};
  if (sh.getLastRow() < 2) return { sh: sh, rows: out };
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r, i) {
    var k = String(r[0]).trim();
    if (k) out[k] = { row: i + 2, value: r[1] };
  });
  return { sh: sh, rows: out };
}

function api_settingsGet() {
  requireAdmin_();
  var raw = readSettingRows_().rows;
  var defaults = {};
  DEFAULT_SETTINGS.forEach(function (d) { defaults[d[0]] = d; });
  var used = {};
  var item = function (key) {
    var d = defaults[key];
    if (!d) return null;
    used[key] = true;
    var v = raw[key] ? raw[key].value : d[1];
    return {
      key: key, value: v instanceof Date ? iso_(v) : String(v == null ? '' : v), description: d[2],
      type: settingType_(key, d[1]), choices: settingChoices_(key)
    };
  };
  var groups = SETTING_GROUPS_.map(function (g) {
    var keys = g.keys.slice();
    if (g.prefix) DEFAULT_SETTINGS.forEach(function (d) { if (d[0].indexOf(g.prefix) === 0 && keys.indexOf(d[0]) < 0) keys.push(d[0]); });
    return { title: g.title, items: keys.map(item).filter(function (x) { return x; }) };
  });
  var others = DEFAULT_SETTINGS.filter(function (d) { return !used[d[0]]; }).map(function (d) { return item(d[0]); });
  if (others.length) groups.push({ title: 'Autres', items: others });
  return { groups: groups };
}

/** Vérifie une valeur ; renvoie la valeur à écrire, ou lève une erreur claire. */
function checkSetting_(key, value, def) {
  var type = settingType_(key, def);
  var v = String(value == null ? '' : value).trim();
  if (type === 'num') {
    if (v === '') return def;
    var n = toNumber_(v);
    if (!(n >= 0) || !/\d/.test(v)) throw new Error(key + ' : nombre attendu.');
    return n;
  }
  if (type === 'yesno') return /^(non|no|false|faux|0)$/i.test(v) ? 'NON' : 'OUI';
  if (type === 'choice') {
    if (settingChoices_(key).indexOf(v) < 0) throw new Error(key + ' : choisissez ' + settingChoices_(key).join(' ou ') + '.');
    return v;
  }
  var max = type === 'sms' ? 600 : type === 'long' ? 2000 : 300;
  if (v.length > max) throw new Error(key + ' : texte trop long (' + max + ' caractères au plus).');
  return String(value == null ? '' : value).replace(/\r/g, '');
}

/** Écrit des réglages dans l'onglet Paramètres (ajoute la ligne si elle manque). */
function writeSettings_(changes, user) {
  var keys = Object.keys(changes);
  if (!keys.length) return 0;
  withLock_(function () {
    var info = readSettingRows_();
    keys.forEach(function (k) {
      if (info.rows[k]) {
        info.sh.getRange(info.rows[k].row, 2).setValue(changes[k]);
      } else {
        var d = DEFAULT_SETTINGS.filter(function (x) { return x[0] === k; })[0];
        var row = info.sh.getLastRow() + 1;
        ensureRows_(info.sh, row);
        info.sh.getRange(row, 1, 1, 3).setValues([[k, changes[k], d ? d[2] : '']]);
        info.rows[k] = { row: row, value: changes[k] };
      }
      log_(user, '', 'Réglage modifié', k + (/^SMS_/.test(k) ? '' : ' = ' + String(changes[k]).slice(0, 80)));
    });
    clearConfigCache_(configKeysFor_(SHEET.SETTINGS));
  });
  return keys.length;
}

function api_settingsSave(changes) {
  var user = requireAdmin_();
  var defaults = {};
  DEFAULT_SETTINGS.forEach(function (d) { defaults[d[0]] = d[1]; });
  var clean = {};
  Object.keys(changes || {}).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(defaults, k)) throw new Error('Réglage inconnu : ' + k);
    clean[k] = checkSetting_(k, changes[k], defaults[k]);
  });
  var n = writeSettings_(clean, user);
  return { message: n ? plural_(n, 'réglage enregistré', 'réglages enregistrés') + '.' : 'Rien à enregistrer.', settings: api_settingsGet() };
}

/** Aperçu d'un texte de SMS avec une commande d'exemple. */
function api_smsPreview(text) {
  requireAdmin_();
  var sample = { client: 'Amine Kaci', id: '#1234', product: 'Montre sport — Noire', total: 4250, tracking: 'ECN123456789', commune: 'Béjaïa', wilaya: '06 - Béjaïa' };
  var out = fillSmsTemplate_(String(text || ''), sample, getSettings_());
  var arabic = /[؀-ۿ]/.test(out);
  var per = arabic ? 70 : 160;
  return { text: out, length: out.length, parts: out.length ? Math.ceil(out.length / per) : 0, perPart: per };
}

/* ------------------------------------------------------------------ */
/* Équipe                                                             */
/* ------------------------------------------------------------------ */

function teamRows_() {
  var sh = sheet_(SHEET.TEAM);
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues() : [];
  return { sh: sh, rows: rows };
}

function api_teamList() {
  requireAdmin_();
  var editors = {};
  var ss = ss_();
  try { ss.getEditors().forEach(function (u) { editors[String(u.getEmail()).toLowerCase()] = true; }); } catch (e) { editors = null; }
  var owner = ownerEmail_();
  return {
    roles: ROLES_,
    owner: owner,
    me: String(currentUser_().email || '').toLowerCase(),
    members: teamRows_().rows.filter(function (r) { return String(r[0]).trim(); }).map(function (r) {
      var email = String(r[0]).trim().toLowerCase();
      return { email: email, name: String(r[1] || '').trim(), role: String(r[2] || '').trim() || 'Confirmatrice', access: editors ? !!editors[email] : null };
    })
  };
}

/** Ajoute ou modifie une personne, et lui partage le classeur (sinon elle ne peut pas ouvrir l'application). */
function api_teamSave(member) {
  var user = requireAdmin_();
  member = member || {};
  var email = String(member.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  var role = ROLES_.indexOf(member.role) >= 0 ? member.role : 'Confirmatrice';
  var name = String(member.name || '').trim() || email.split('@')[0];
  var me = String(currentUser_().email || '').toLowerCase();
  if (email === me && role !== 'Administrateur') throw new Error('Vous ne pouvez pas retirer votre propre rôle d’administrateur.');
  var created = false;
  withLock_(function () {
    var t = teamRows_();
    var row = 0;
    t.rows.forEach(function (r, i) { if (String(r[0]).trim().toLowerCase() === email) row = i + 2; });
    if (!row) { row = t.sh.getLastRow() + 1; ensureRows_(t.sh, row); created = true; }
    t.sh.getRange(row, 1, 1, 3).setValues([[email, name, role]]);
    clearConfigCache_(configKeysFor_(SHEET.TEAM));
    log_(user, '', created ? 'Équipe : ajout' : 'Équipe : modification', name + ' · ' + role);
  });
  var shared = '';
  try {
    var already = ss_().getEditors().some(function (u) { return String(u.getEmail()).toLowerCase() === email; });
    if (!already) { ss_().addEditor(email); shared = ' Le classeur lui est partagé : elle reçoit un e-mail de Google.'; }
  } catch (e) {
    shared = ' Attention : le partage automatique a échoué (' + (e && e.message ? e.message : e) + ') : partagez le classeur avec ' + email + ' à la main.';
  }
  return { message: (created ? name + ' ajouté(e) comme ' + role.toLowerCase() + '.' : name + ' : ' + role.toLowerCase() + '.') + shared, team: api_teamList() };
}

/** Retire une personne de l'équipe, et son accès au classeur. */
function api_teamRemove(email) {
  var user = requireAdmin_();
  email = String(email || '').trim().toLowerCase();
  var me = String(currentUser_().email || '').toLowerCase();
  var owner = String(ownerEmail_() || '').toLowerCase();
  if (email === me) throw new Error('Vous ne pouvez pas vous retirer vous-même.');
  if (email === owner) throw new Error('Le propriétaire du classeur ne peut pas être retiré.');
  var found = false;
  withLock_(function () {
    var t = teamRows_();
    for (var i = t.rows.length - 1; i >= 0; i--) {
      if (String(t.rows[i][0]).trim().toLowerCase() === email) { t.sh.deleteRow(i + 2); found = true; }
    }
    clearConfigCache_(configKeysFor_(SHEET.TEAM));
    if (found) log_(user, '', 'Équipe : retrait', email);
  });
  if (!found) throw new Error('Personne introuvable dans l’équipe.');
  var access = '';
  try { ss_().removeEditor(email); access = ' Son accès au classeur est retiré.'; } catch (e) { access = ' Retirez aussi son accès au classeur à la main (bouton Partager).'; }
  return { message: email + ' retiré(e) de l’équipe.' + access, team: api_teamList() };
}

/* ------------------------------------------------------------------ */
/* Clients : liste noire et signalés                                  */
/* ------------------------------------------------------------------ */

function api_clientsAdmin() {
  requireAdmin_();
  var sh = sheet_(SHEET.CLIENTS);
  var out = { blacklist: [], flagged: [] };
  if (sh.getLastRow() < 2) return out;
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(normalizeText_);
  var col = function (t) { return header.indexOf(normalizeText_(t)); };
  var cPhone = col('Téléphone');
  var cName = col('Nom');
  var cBlack = col('Liste noire');
  var cNote = col('Note');
  var cFlag = col('Signalé');
  sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues().forEach(function (r) {
    var phone = normalizePhone(r[cPhone < 0 ? 0 : cPhone]).phone || String(r[cPhone < 0 ? 0 : cPhone]);
    if (!phone) return;
    var name = cName >= 0 ? String(r[cName] || '') : '';
    var b = cBlack >= 0 ? r[cBlack] : false;
    if (b === true || /^(vrai|true|oui)$/i.test(String(b))) out.blacklist.push({ phone: phone, name: name, note: cNote >= 0 ? String(r[cNote] || '') : '' });
    if (cFlag >= 0 && !isBlank_(r[cFlag])) out.flagged.push({ phone: phone, name: name, flag: String(r[cFlag]) });
  });
  return out;
}

/** Retire le signalement « a refusé un colis ». */
function api_clearFlag(phone) {
  var user = requireAdmin_();
  var p = normalizePhone(phone);
  if (!p.valid) throw new Error('Numéro invalide.');
  withLock_(function () {
    var sh = sheet_(SHEET.CLIENTS);
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normalizeText_);
    var cFlag = header.indexOf(normalizeText_('Signalé'));
    var cPhone = Math.max(header.indexOf(normalizeText_('Téléphone')), 0);
    if (cFlag < 0 || sh.getLastRow() < 2) return;
    sh.getRange(2, cPhone + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r, i) {
      if (normalizePhone(r[0]).phone === p.phone) sh.getRange(i + 2, cFlag + 1).setValue('');
    });
    clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
    refreshClientAlerts_(readOrders_(), p.phone);
    log_(user, '', 'Client : signalement retiré', p.phone);
  });
  return { message: 'Signalement retiré pour le ' + p.phone + '.', clients: api_clientsAdmin() };
}

/* ------------------------------------------------------------------ */
/* Classeur                                                           */
/* ------------------------------------------------------------------ */

/** « Réparer le classeur » depuis l'application (les tâches automatiques : seulement par le propriétaire). */
function api_repair() {
  requireAdmin_();
  var owner = PropertiesService.getScriptProperties().getProperty(HEALTH.PROP_OWNER);
  var me = String(currentUser_().email || '').toLowerCase();
  var isOwner = !owner || owner.toLowerCase() === me;
  setupSheets_(isOwner);
  return { message: 'Classeur vérifié et réparé : onglets, colonnes, listes et réglages manquants ajoutés.' +
    (isOwner ? ' Tâches automatiques réinstallées.' : ' (Les tâches automatiques restent au nom du propriétaire.)') };
}

/** « Archiver et alléger maintenant » (et recalcul des statistiques). */
function api_archiveNow() {
  requireAdmin_();
  var r = nightlyMaintenance();
  return { message: r.autoCancelled + ' commande(s) sans réponse annulée(s), ' + r.archived + ' archivée(s), ' + r.journal +
    ' ligne(s) de Journal effacée(s), ' + r.rows + ' ligne(s) vide(s) supprimée(s), statistiques recalculées.' +
    (r.errors.length ? ' Problème : ' + r.errors.join(' · ') : '') };
}

function api_health() {
  requireAdmin_();
  return healthData_();
}

/* ---- Speed.gs ---- */
/**
 * Speed.gs : vitesse de l'application.
 *
 * - Mémoire courte des commandes : quand on change de page plusieurs fois de
 *   suite, Google garde l'onglet Commandes 30 secondes en mémoire (CacheService)
 *   au lieu de le relire. Jamais utilisée pendant une modification (sous le
 *   verrou, la lecture est toujours fraîche), et oubliée à chaque modification
 *   (fin du verrou, ou modification à la main dans l'onglet Commandes).
 * - Préchargement : en un seul appel, les données des pages principales.
 * - Mesure : temps de chaque page côté Google (moyenne, maximum), affiché dans
 *   Administration › État de l'outil.
 */

var SPEED = {
  GEN: 'orders:gen',       // change à chaque modification : une copie plus ancienne n'est plus utilisée
  META: 'orders:meta',
  PART: 'orders:part:',
  TTL: 30,                 // secondes
  CHUNK: 40000,            // caractères par morceau (une case de la mémoire contient au plus 100 Ko)
  MAX: 1600000,            // au-delà, pas de copie (classeur trop gros pour la mémoire)
  PERF: 'perf:v1'
};

/** Mémoire courte activée (les tests la coupent pour écrire directement dans l'imitation du classeur). */
var ORDERS_CACHE_ON_ = true;
/** Profondeur du verrou en cours (voir withLock_) : sous le verrou, jamais de copie. */
var LOCK_DEPTH_ = 0;
/** N° de la prise du verrou en cours : une ligne lue sous ce verrou peut être réécrite d'un seul bloc (writeFields_). */
var LOCK_SESSION_ = 0;

function ordersGen_() {
  try { return CacheService.getScriptCache().get(SPEED.GEN) || ''; } catch (e) { return ''; }
}

/** Oublie la copie des commandes (après toute modification). */
function invalidateOrdersCache_() {
  try { CacheService.getScriptCache().put(SPEED.GEN, Date.now() + '-' + Math.random().toString(36).slice(2, 8), 21600); } catch (e) { /* sans importance */ }
}

function encodeCell_(key, value) {
  var raw = this[key];
  return raw instanceof Date ? { $d: raw.getTime() } : value;
}

function decodeCell_(key, value) {
  return value && typeof value === 'object' && value.$d !== undefined && Object.keys(value).length === 1 ? new Date(value.$d) : value;
}

/** Copie récente de l'onglet Commandes (valeurs), ou null. */
function cachedOrderValues_() {
  if (!ORDERS_CACHE_ON_ || LOCK_DEPTH_) return null;
  try {
    var c = CacheService.getScriptCache();
    var head = c.getAll([SPEED.GEN, SPEED.META]);
    var meta = head[SPEED.META] ? JSON.parse(head[SPEED.META]) : null;
    if (!meta || meta.gen !== (head[SPEED.GEN] || '')) return null;
    var keys = [];
    for (var i = 0; i < meta.n; i++) keys.push(SPEED.PART + i);
    var parts = c.getAll(keys);
    var text = '';
    for (var k = 0; k < keys.length; k++) {
      if (parts[keys[k]] === undefined || parts[keys[k]] === null) return null;
      text += parts[keys[k]];
    }
    return JSON.parse(text, decodeCell_);
  } catch (e) {
    return null;
  }
}

/** Garde une copie (si rien n'a été modifié pendant la lecture). */
function storeOrderValues_(values, gen) {
  if (!ORDERS_CACHE_ON_ || LOCK_DEPTH_) return;
  try {
    var text = JSON.stringify(values, encodeCell_);
    if (text.length > SPEED.MAX) return;
    var c = CacheService.getScriptCache();
    if ((c.get(SPEED.GEN) || '') !== gen) return;
    var put = {};
    var n = 0;
    for (var i = 0; i < text.length; i += SPEED.CHUNK) put[SPEED.PART + (n++)] = text.slice(i, i + SPEED.CHUNK);
    put[SPEED.META] = JSON.stringify({ gen: gen, n: n });
    c.putAll(put, SPEED.TTL);
  } catch (e) {
    // La mémoire est pleine ou indisponible : la lecture suivante relira le classeur.
  }
}

/* ------------------------------------------------------------------ */
/* Mesure du temps des pages                                          */
/* ------------------------------------------------------------------ */

/** Exécute fn et note sa durée sous le nom `label`. */
function timed_(label, fn) {
  var t0 = Date.now();
  try {
    return fn();
  } finally {
    notePerf_(label, Date.now() - t0);
  }
}

function notePerf_(label, ms) {
  try {
    var c = CacheService.getScriptCache();
    var all = JSON.parse(c.get(SPEED.PERF) || '{}');
    var p = all[label] || { n: 0, total: 0, max: 0, last: 0 };
    p.n++;
    p.total += ms;
    p.max = Math.max(p.max, ms);
    p.last = ms;
    if (p.n > 200) { p.total = Math.round(p.total / p.n * 100); p.n = 100; } // moyenne des derniers passages
    all[label] = p;
    c.put(SPEED.PERF, JSON.stringify(all), 21600);
  } catch (e) {
    // La mesure ne doit jamais gêner la page.
  }
}

/** Temps des pages côté Google (les 6 dernières heures). */
function readPerf_() {
  var all = {};
  try { all = JSON.parse(CacheService.getScriptCache().get(SPEED.PERF) || '{}'); } catch (e) { all = {}; }
  return Object.keys(all).map(function (label) {
    var p = all[label];
    return { label: label, avg: p.n ? Math.round(p.total / p.n) : 0, max: p.max, last: p.last, n: p.n };
  }).sort(function (a, b) { return b.avg - a.avg; });
}

/* ------------------------------------------------------------------ */
/* Préchargement                                                      */
/* ------------------------------------------------------------------ */

var PRELOADABLE_ = {
  api_dashboard: function (args) { return dashboardApi_(args[0]); },
  api_listOrders: function (args) { var f = args[0] || {}; f.sync = false; f.withStatus = false; return listOrdersApi_(f); },
  api_queue: function () { return queueApi_(); },
  api_shippingList: function () { return shippingListApi_(); },
  api_trackingOverview: function (args) { return trackingOverviewApi_(args[0]); }
};

/**
 * Données de plusieurs pages en un seul appel (après la première page, en
 * arrière-plan) : l'onglet Commandes n'est lu qu'une fois grâce à la mémoire courte.
 * specs = [{ fn, args }] → [{ key, data }] (data = null si la page a échoué).
 */
function api_preloadPages(specs) {
  return timed_('Préchargement', function () {
    return (specs || []).slice(0, 8).map(function (s) {
      var run = s && PRELOADABLE_[s.fn];
      var args = s && Array.isArray(s.args) ? s.args : [];
      var key = s ? s.fn + '|' + JSON.stringify(args) : '';
      if (!run) return { key: key, data: null };
      try { return { key: key, data: run(JSON.parse(JSON.stringify(args))) }; } catch (e) { return { key: key, data: null }; }
    });
  });
}

/* ---- Shopify.gs ---- */
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
    adSource: pick(['UTM source']),
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
  if (summary.imported) processNewRowsNow_();
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
    ui.alert('Shopify', api_shopifyTest().message + '\n\nL’importation automatique se fait toutes les 5 minutes.', ui.ButtonSet.OK);
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

/* ---- Releasit.gs ---- */
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
  { key: 'adSource', label: 'Source pub', names: ['UTM source', 'utm_source', 'Source pub', 'Plateforme'] },
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
    campaign: texts('campaign')[0] || '',
    adSource: texts('adSource')[0] || ''
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
  var seenRows = {};
  values.slice(Math.max(start, 0)).forEach(function (row) {
    if (row.every(function (v) { return releasitText_(v) === ''; })) return;
    var id = releasitText_(row[col.id]);
    if (!id) { summary.ignored++; return; }
    // Releasit écrit parfois deux fois la même ligne : ce n'est pas un 2e produit.
    var sig = row.map(releasitText_).join('|');
    if (seenRows[sig]) return;
    seenRows[sig] = true;
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
  if (summary.added) processNewRowsNow_();
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
  var s = releasitSafe_();
  // SMS « commande reçue » tout de suite, dans le même passage (sans attendre la minute suivante).
  if (s && s.added) {
    try { sendSmsQueue(); } catch (e) { /* signalé par sendSmsQueue */ }
  }
  return s;
}

/** Transfert sans jamais lever d'erreur (elle est gardée et affichée dans la page Commandes). */
function releasitSafe_() {
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

/** Vérification rapide avant d'afficher une liste : nombre de commandes arrivées (0 en cas de souci). */
function releasitQuickSync_() {
  var s = releasitSafe_(); // à l'ouverture d'une page : les SMS partent en arrière-plan, la page n'attend pas
  return s && s.added ? s.added : 0;
}

/** Vérification rapide à l'ouverture des pages Commandes et Confirmation. */
function api_releasitSync() {
  var s = releasitSafe_();
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
    shopify: api_shopifyStatus(),
    sms: smsStatus_()
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
  var running = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'everyMinute' || t.getHandlerFunction() === 'transferReleasitOrders'; });
  text += running ? '\n\nTransfert automatique : actif (chaque minute).'
    : '\n\nTransfert automatique : pas encore actif. Lancez « Installer / réparer le classeur ».';
  ui.alert('Releasit', text, ui.ButtonSet.OK);
}

/* ---- Rules.gs ---- */
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
  EXTRA: ['Supprimée le', 'Supprimée par', 'Motif de suppression'],
  // Onglet caché : n° des commandes effacées de la corbeille (elles ne doivent pas revenir).
  BLOCKED: 'Numéros effacés',
  BLOCKED_TITLES: ['N°', 'Effacée le', 'Par']
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

/** Statuts de la page Commandes : pas encore confirmées. */
var TODO_STATUSES_ = [STATUS.TO_CONFIRM, STATUS.NO_ANSWER, STATUS.CALLBACK, STATUS.UNREACHABLE];

/**
 * Page où se trouve une commande : 'commandes' (à confirmer), 'expedier' (confirmée),
 * 'suivi' (en route, retour en cours), 'terminees' (livrée, retour reçu), 'annulees'.
 */
function pageOf_(o) {
  var s = String(o.status || '');
  if (s === STATUS.CANCELLED) return 'annulees';
  if (s === STATUS.CONFIRMED) return 'expedier';
  if (s === STATUS.SHIPPED || s === STATUS.IN_DELIVERY) return 'suivi';
  if (s === STATUS.RETURNED) return returnReceived_(o) ? 'terminees' : 'suivi';
  if (s === STATUS.DELIVERED) return 'terminees';
  return 'commandes';
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
    canPrintLabel: canPrintLabel_(o),
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
    return { order: serializeOrder_(o), counts: countsData_(ctx, null),
      message: 'Colis ' + tracking + ' annulé chez Ecotrack. La commande ' + o.id + ' est de nouveau modifiable.' };
  });
}

function api_cancelParcel(id) {
  return cancelParcel_(String(id), currentUser_());
}

/* ------------------------------------------------------------------ */
/* Corbeille                                                          */
/* ------------------------------------------------------------------ */

/** N° des commandes à la corbeille ou effacées : les importations ne les recréent pas. */
function trashIds_() {
  var set = {};
  [TRASH.SHEET, TRASH.BLOCKED].forEach(function (name) {
    var sh = ss_().getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    var map = headerMap_(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
    if (map.id === undefined) return;
    sh.getRange(2, map.id + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var id = String(r[0]).trim();
      if (id) set[id] = true;
    });
  });
  return set;
}

function requireAdminFor_(what) {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Seul un administrateur (onglet Équipe) peut ' + what + '.');
  return user;
}

/** Liste de n° propre (sans doublons ni vides). */
function idList_(ids) {
  var seen = {};
  return (Array.isArray(ids) ? ids : [ids]).map(function (x) { return String(x == null ? '' : x).trim(); })
    .filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
}

/** Supprime des lignes (n° de ligne du classeur), de la dernière à la première, par blocs. */
function deleteSheetRows_(sh, rows) {
  rows = rows.slice().sort(function (a, b) { return b - a; });
  if (!rows.length) return;
  // Le classeur refuse de supprimer toutes les lignes non figées : on garde une ligne vide en dessous.
  ensureRows_(sh, sh.getLastRow() + 1);
  var i = 0;
  while (i < rows.length) {
    var end = rows[i];
    var start = end;
    while (i + 1 < rows.length && rows[i + 1] === start - 1) { i++; start--; }
    if (start === end) sh.deleteRow(start); else sh.deleteRows(start, end - start + 1);
    i++;
  }
}

/** Met des commandes à la corbeille (sous verrou). Renvoie { deleted, skipped: [{ id, why }] }. */
function trashOrders_(ctx, ids, why, user) {
  var out = { deleted: [], skipped: [] };
  var titles = ctx.sheet.getRange(1, 1, 1, ctx.width).getValues()[0];
  var picked = [];
  ids.forEach(function (id) {
    var o = findOrder_(ctx, id);
    if (!o) { out.skipped.push({ id: id, why: 'introuvable' }); return; }
    if (!orderRules_(o, user, null).canDelete) { out.skipped.push({ id: id, why: 'déjà envoyée à une société de livraison' }); return; }
    picked.push(o);
  });
  if (!picked.length) return out;
  var sh = ss_().getSheetByName(TRASH.SHEET) || ss_().insertSheet(TRASH.SHEET);
  ensureHeaders_(sh, titles.map(function (t) { return String(t).trim(); }).filter(function (t) { return t; }).concat(TRASH.EXTRA));
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var now = new Date();
  var rows = picked.map(function (o) {
    var values = ctx.sheet.getRange(o._row, 1, 1, ctx.width).getValues()[0];
    var extra = {};
    extra[TRASH.EXTRA[0]] = now;
    extra[TRASH.EXTRA[1]] = user.name;
    extra[TRASH.EXTRA[2]] = why;
    return rowForHeader_(titles, values, header, extra);
  });
  appendArchiveRows_(sh, rows);
  deleteSheetRows_(ctx.sheet, picked.map(function (o) { return o._row; }));
  picked.forEach(function (o) {
    log_(user, o.id, 'Suppression', 'Mise à la corbeille' + (why ? ' · Motif : ' + why : ''));
    out.deleted.push(String(o.id));
  });
  ctx.orders = ctx.orders.filter(function (x) { return picked.indexOf(x) < 0; });
  return out;
}

/**
 * Met une commande à la corbeille (administrateur, avant tout envoi à une
 * société de livraison). La ligne est déplacée dans l'onglet Corbeille.
 */
function api_deleteOrder(id, reason) {
  var user = requireAdminFor_('supprimer une commande');
  var why = String(reason == null ? '' : reason).trim();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (!orderRules_(o, user, null).canDelete) {
      throw new Error('Une commande envoyée à une société de livraison ne peut pas être supprimée. Annulez-la, ou annulez d’abord son colis.');
    }
    trashOrders_(ctx, [String(o.id)], why, user);
    return { id: String(o.id), counts: countsData_(ctx, null), message: 'Commande ' + o.id + ' mise à la corbeille.' };
  });
}

/** Met plusieurs commandes à la corbeille ; celles déjà envoyées à une société de livraison sont ignorées. */
function api_deleteOrders(ids, reason) {
  var user = requireAdminFor_('supprimer des commandes');
  var list = idList_(ids);
  if (!list.length) throw new Error('Cochez au moins une commande.');
  var why = String(reason == null ? '' : reason).trim();
  return withLock_(function () {
    var ctx = readOrders_();
    var r = trashOrders_(ctx, list, why, user);
    var msg = plural_(r.deleted.length, 'commande mise', 'commandes mises') + ' à la corbeille';
    if (r.skipped.length) msg += ' · ' + plural_(r.skipped.length, 'ignorée', 'ignorées') + ' (' + r.skipped.slice(0, 5).map(function (x) { return x.id + ' : ' + x.why; }).join(', ') + (r.skipped.length > 5 ? '…' : '') + ')';
    return { deleted: r.deleted, skipped: r.skipped, counts: countsData_(ctx, null), message: msg + '.' };
  });
}

/** Commandes à la corbeille (administrateur), les dernières supprimées d'abord. */
function api_listTrash() {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Seul un administrateur (onglet Équipe) peut voir la corbeille.');
  var sh = ss_().getSheetByName(TRASH.SHEET);
  if (!sh || sh.getLastRow() < 2) return { rows: [] };
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var map = headerMap_(values[0]);
  var extra = {};
  values[0].forEach(function (t, i) { extra[normalizeText_(t)] = i; });
  var cell = function (row, title) { var i = extra[normalizeText_(title)]; return i === undefined ? '' : row[i]; };
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var o = {};
    ORDER_COLUMNS.forEach(function (c) { o[c.key] = map[c.key] === undefined ? '' : values[r][map[c.key]]; });
    if (!String(o.id).trim()) continue;
    rows.push({
      id: String(o.id), client: String(o.client), phone: String(o.phone), wilaya: String(o.wilaya), product: String(o.product),
      total: toNumber_(o.total), status: String(o.status), date: iso_(o.date),
      deletedAt: iso_(cell(values[r], TRASH.EXTRA[0])), deletedBy: String(cell(values[r], TRASH.EXTRA[1])),
      reason: String(cell(values[r], TRASH.EXTRA[2]))
    });
  }
  rows.sort(function (a, b) { return String(b.deletedAt).localeCompare(String(a.deletedAt)); });
  return { rows: rows, autoDays: getSettings_().CORBEILLE_JOURS };
}

/** Remet une commande de la corbeille dans l'onglet Commandes (administrateur). */
function api_restoreOrder(id) {
  var r = api_restoreOrders([id]);
  if (r.skipped.length) throw new Error(r.skipped[0].why);
  return { id: r.restored[0], message: 'Commande ' + r.restored[0] + ' remise dans l’onglet Commandes.' };
}

/** Lignes de la corbeille : { sh, values, map, rowsById: { n° : [index de ligne…] } }. */
function readTrash_() {
  var sh = ss_().getSheetByName(TRASH.SHEET);
  if (!sh || sh.getLastRow() < 2) return null;
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var map = headerMap_(values[0]);
  var rowsById = {};
  for (var r = 1; r < values.length && map.id !== undefined; r++) {
    var id = String(values[r][map.id]).trim();
    if (id) (rowsById[id] = rowsById[id] || []).push(r);
  }
  return { sh: sh, values: values, map: map, rowsById: rowsById };
}

/** Remet plusieurs commandes de la corbeille dans l'onglet Commandes. */
function api_restoreOrders(ids) {
  var user = requireAdminFor_('restaurer une commande');
  var list = idList_(ids);
  if (!list.length) throw new Error('Cochez au moins une commande.');
  return withLock_(function () {
    var t = readTrash_();
    if (!t) throw new Error('La corbeille est vide.');
    var ctx = readOrders_();
    var out = { restored: [], skipped: [] };
    var toAdd = [];
    var toDelete = [];
    list.forEach(function (key) {
      var rows = t.rowsById[key];
      if (!rows) { out.skipped.push({ id: key, why: 'Commande ' + key + ' absente de la corbeille.' }); return; }
      if (findOrder_(ctx, key)) { out.skipped.push({ id: key, why: 'La commande ' + key + ' est déjà dans l’onglet Commandes.' }); return; }
      var found = rows[rows.length - 1];
      var o = {};
      ORDER_COLUMNS.forEach(function (c) { o[c.key] = t.map[c.key] === undefined ? '' : t.values[found][t.map[c.key]]; });
      toAdd.push(o);
      toDelete.push(found + 1);
      out.restored.push(key);
    });
    if (toAdd.length) appendOrders_(ctx, toAdd);
    deleteSheetRows_(t.sh, toDelete);
    out.restored.forEach(function (key) { log_(user, key, 'Restauration', 'Sortie de la corbeille'); });
    out.message = plural_(out.restored.length, 'commande remise', 'commandes remises') + ' dans l’onglet Commandes' +
      (out.skipped.length ? ' · ' + plural_(out.skipped.length, 'ignorée', 'ignorées') : '') + '.';
    return out;
  });
}

/** Note des n° effacés pour de bon (onglet caché « Numéros effacés »). */
function blockIds_(ids, user) {
  if (!ids.length) return;
  var ss = ss_();
  var sh = ss.getSheetByName(TRASH.BLOCKED);
  if (!sh) {
    sh = ss.insertSheet(TRASH.BLOCKED);
    ensureHeaders_(sh, TRASH.BLOCKED_TITLES);
    try { sh.hideSheet(); } catch (e) { /* sans importance */ }
  }
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + ids.length - 1);
  var now = new Date();
  sh.getRange(r, 1, ids.length, 3).setValues(ids.map(function (id) { return [id, now, user ? user.name : '']; }));
}

/**
 * Efface pour de bon des commandes de la corbeille (ids vide ou absent : toute la corbeille).
 * Leur n° est gardé : Releasit et Shopify ne les recréent pas.
 */
function purgeTrash_(ids, user, olderThanDays) {
  var t = readTrash_();
  if (!t) return { purged: [] };
  var wanted = ids && ids.length ? idList_(ids) : Object.keys(t.rowsById);
  var limit = olderThanDays ? Date.now() - olderThanDays * 86400000 : null;
  var dateCol = -1;
  t.values[0].forEach(function (title, i) { if (normalizeText_(title) === normalizeText_(TRASH.EXTRA[0])) dateCol = i; });
  var rows = [];
  var purged = [];
  wanted.forEach(function (id) {
    (t.rowsById[id] || []).forEach(function (r) {
      if (limit !== null) {
        var d = dateCol >= 0 ? toDate_(t.values[r][dateCol]) : null;
        if (!d || d.getTime() > limit) return;
      }
      rows.push(r + 1);
      if (purged.indexOf(id) < 0) purged.push(id);
    });
  });
  if (!rows.length) return { purged: [] };
  blockIds_(purged, user);
  deleteSheetRows_(t.sh, rows);
  log_(user, '', 'Corbeille vidée', plural_(purged.length, 'commande effacée', 'commandes effacées') + ' pour de bon : ' + purged.slice(0, 20).join(', ') + (purged.length > 20 ? '…' : ''));
  return { purged: purged };
}

/** « Vider la corbeille » (ids absent) ou « Supprimer définitivement » les commandes cochées. */
function api_purgeTrash(ids) {
  var user = requireAdminFor_('vider la corbeille');
  return withLock_(function () {
    var r = purgeTrash_(ids, user, 0);
    return { purged: r.purged, message: r.purged.length ? plural_(r.purged.length, 'commande effacée', 'commandes effacées') + ' pour de bon. Leur n° reste bloqué : elles ne reviendront pas.' : 'Rien à effacer.' };
  });
}

/** Entretien de nuit : efface les commandes à la corbeille depuis CORBEILLE_JOURS jours (0 = jamais). */
function purgeOldTrash_() {
  var days = getSettings_().CORBEILLE_JOURS;
  if (!days) return 0;
  return withLock_(function () { return purgeTrash_(null, { name: 'Automatique' }, days).purged.length; });
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

/* ---- Maintenance.gs ---- */
/**
 * Maintenance.gs : chaque nuit (vers 3 h), le classeur reste léger.
 *
 *  - Archivage : les commandes terminées depuis longtemps (ARCHIVE_JOURS, 100 par
 *    défaut) partent dans l'onglet Archive. Une commande livrée dont l'argent
 *    n'est pas encore versé par Ecotrack, ou un retour pas encore reçu, reste
 *    dans Commandes (la page Suivi en a besoin). Le bilan de chaque client
 *    (livrées, retours, annulées) est gardé dans l'onglet Clients : les alertes
 *    « Fiable » et « Risque » restent justes.
 *  - Journal : les lignes plus anciennes que JOURNAL_JOURS (90 par défaut) sont effacées.
 *  - Onglets allégés : les lignes et colonnes vides en trop sont supprimées.
 */

var ARCHIVE_EXTRA_ = ['Archivée le'];
var FINAL_STATUSES_ = [STATUS.DELIVERED, STATUS.RETURNED, STATUS.CANCELLED];

/** Commande terminée, sans mouvement depuis la date limite, et sans argent ou colis en attente. */
function isArchivable_(o, limit) {
  var s = String(o.status);
  if (FINAL_STATUSES_.indexOf(s) < 0) return false;
  if (hasEcotrackParcel_(o)) {
    var info = ecotrackStatusInfo_(o.carrierStatus);
    if (s === STATUS.DELIVERED && !(info && info.group === 'paid')) return false;
    if (s === STATUS.RETURNED && !(info && info.group === 'returned')) return false;
  }
  var last = toDate_(o.carrierMoved) || toDate_(o.updated) || toDate_(o.date);
  return !!last && last < limit;
}

/** Valeurs d'une ligne rangées selon les titres d'un autre onglet (colonnes retrouvées par leur titre). */
function rowForHeader_(srcTitles, srcRow, destHeader, extra) {
  var byTitle = {};
  srcTitles.forEach(function (t, i) {
    var k = normalizeText_(t);
    if (k && byTitle[k] === undefined) byTitle[k] = srcRow[i];
  });
  Object.keys(extra || {}).forEach(function (t) { byTitle[normalizeText_(t)] = extra[t]; });
  return destHeader.map(function (t) {
    var v = byTitle[normalizeText_(t)];
    return v === undefined ? '' : v;
  });
}

/** Ajoute des lignes en bas d'un onglet d'archive (Archive, Corbeille), colonnes texte comprises. */
function appendArchiveRows_(sh, rows) {
  if (!rows.length) return;
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + rows.length - 1);
  var map = headerMap_(header);
  TEXT_KEYS_.forEach(function (k) {
    if (map[k] !== undefined) sh.getRange(r, map[k] + 1, rows.length, 1).setNumberFormat('@');
  });
  sh.getRange(r, 1, rows.length, header.length).setValues(rows);
}

/** Supprime des lignes (numéros quelconques), du bas vers le haut, par blocs voisins. */
function deleteRowNumbers_(sh, numbers) {
  var list = numbers.slice().sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < list.length) {
    var end = list[i];
    var start = end;
    while (i + 1 < list.length && list[i + 1] === start - 1) { i++; start--; }
    sh.deleteRows(start, end - start + 1);
    i++;
  }
}

/** Archive les commandes terminées depuis plus de ARCHIVE_JOURS jours. */
function archiveOldOrders_() {
  var days = getSettings_().ARCHIVE_JOURS;
  var summary = { archived: 0, days: days };
  if (!days) return summary;
  var limit = new Date(Date.now() - days * 86400000);
  return withLock_(function () {
    var ctx = readOrders_();
    var list = ctx.orders.filter(function (o) { return isArchivable_(o, limit); });
    if (!list.length) return summary;

    var titles = ctx.sheet.getRange(1, 1, 1, ctx.width).getValues()[0];
    var all = ctx.sheet.getRange(2, 1, ctx.sheet.getLastRow() - 1, ctx.width).getValues();
    var arch = ss_().getSheetByName(SHEET.ARCHIVE) || ss_().insertSheet(SHEET.ARCHIVE);
    ensureHeaders_(arch, titles.map(function (t) { return String(t).trim(); }).filter(function (t) { return t; }).concat(ARCHIVE_EXTRA_));
    var header = arch.getRange(1, 1, 1, arch.getLastColumn()).getValues()[0];
    var now = new Date();
    var extra = {};
    extra[ARCHIVE_EXTRA_[0]] = now;
    appendArchiveRows_(arch, list.map(function (o) { return rowForHeader_(titles, all[o._row - 2], header, extra); }));

    addArchivedCounts_(list);
    deleteRowNumbers_(ctx.sheet, list.map(function (o) { return o._row; }));
    log_({ name: 'Automatique' }, '', 'Archivage', list.length + ' commande(s) terminée(s) depuis plus de ' + days + ' jours déplacée(s) dans l’onglet Archive');
    summary.archived = list.length;
    return summary;
  });
}

/** Onglet Clients : ajoute au bilan de chaque numéro ses commandes archivées. */
function addArchivedCounts_(orders) {
  var sh = sheet_(SHEET.CLIENTS);
  ensureHeaders_(sh, CLIENT_TITLES_);
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = function (title) {
    for (var i = 0; i < header.length; i++) if (normalizeText_(header[i]) === normalizeText_(title)) return i;
    return -1;
  };
  var cPhone = col('Téléphone');
  var cName = col('Nom');
  var cBlack = col('Liste noire');
  var cCounts = [col('Livrées archivées'), col('Retours archivés'), col('Annulées archivées')];

  var add = {};
  var names = {};
  orders.forEach(function (o) {
    var p = normalizePhone(o.phone);
    if (!p.valid) return;
    var c = add[p.phone] = add[p.phone] || [0, 0, 0];
    c[o.status === STATUS.DELIVERED ? 0 : o.status === STATUS.RETURNED ? 1 : 2]++;
    if (!names[p.phone] && o.client) names[p.phone] = String(o.client);
  });
  var phones = Object.keys(add);
  if (!phones.length) return;

  var last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2, 1, last - 1, lastCol).getValues() : [];
  var rowOf = {};
  values.forEach(function (r, i) {
    var p = normalizePhone(r[cPhone]).phone;
    if (p && rowOf[p] === undefined) rowOf[p] = i;
  });
  var fresh = [];
  phones.forEach(function (p) {
    if (rowOf[p] !== undefined) {
      var row = values[rowOf[p]];
      cCounts.forEach(function (c, k) { row[c] = toNumber_(row[c]) + add[p][k]; });
    } else {
      var nr = header.map(function () { return ''; });
      nr[cPhone] = p;
      if (cName >= 0) nr[cName] = names[p] || '';
      if (cBlack >= 0) nr[cBlack] = false;
      cCounts.forEach(function (c, k) { nr[c] = add[p][k]; });
      fresh.push(nr);
    }
  });
  // Les trois colonnes de bilan sont voisines : une seule écriture pour les clients déjà connus.
  if (values.length) {
    var first = Math.min.apply(null, cCounts);
    var block = values.map(function (r) { return cCounts.map(function (c) { return r[c] === '' ? '' : toNumber_(r[c]); }); });
    if (Math.max.apply(null, cCounts) - first === 2) {
      sh.getRange(2, first + 1, block.length, 3).setValues(block);
    } else {
      cCounts.forEach(function (c, k) { sh.getRange(2, c + 1, block.length, 1).setValues(block.map(function (b) { return [b[k]]; })); });
    }
  }
  if (fresh.length) {
    var r = sh.getLastRow() + 1;
    ensureRows_(sh, r + fresh.length - 1);
    sh.getRange(r, cPhone + 1, fresh.length, 1).setNumberFormat('@');
    sh.getRange(r, 1, fresh.length, header.length).setValues(fresh);
  }
  clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
}

/** Commandes archivées (pour le tableau de bord sur « Tout »), avec les champs utiles. */
function readArchivedOrders_() {
  var sh = ss_().getSheetByName(SHEET.ARCHIVE);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var map = headerMap_(values[0]);
  var keys = ['id', 'date', 'status', 'total', 'wilaya', 'agent', 'product', 'qty', 'price', 'carrier', 'mode', 'shipping', 'campaign', 'adSource', 'carrierStatus', 'tracking',
    'cancelReason', 'courierNote', 'deliveredAt', 'confirmedAt'];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var o = { archived: true };
    keys.forEach(function (k) { o[k] = map[k] === undefined ? '' : values[r][map[k]]; });
    o.status = String(o.status).trim();
    if (o.status) out.push(o);
  }
  return out;
}

/** Efface les lignes du Journal plus anciennes que `days` jours (elles sont en haut, par date). */
function trimJournal_(days) {
  if (!days) return 0;
  var sh = ss_().getSheetByName(SHEET.LOG);
  if (!sh || sh.getLastRow() < 2) return 0;
  var limit = Date.now() - days * 86400000;
  var dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var n = 0;
  while (n < dates.length) {
    var d = toDate_(dates[n][0]);
    if (d && d.getTime() < limit) n++; else break;
  }
  if (n) sh.deleteRows(2, n);
  return n;
}

/** Supprime les lignes vides en trop (en gardant `spare` lignes libres) et, si demandé, les colonnes vides. */
function trimSheet_(sh, spare, trimColumns) {
  var lastRow = Math.max(sh.getLastRow(), 1);
  var want = lastRow + spare;
  var maxRows = sh.getMaxRows();
  var removed = 0;
  if (maxRows > want) { sh.deleteRows(want + 1, maxRows - want); removed += maxRows - want; }
  if (trimColumns) {
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var maxCols = sh.getMaxColumns();
    if (maxCols > lastCol) sh.deleteColumns(lastCol + 1, maxCols - lastCol);
  }
  return removed;
}

/** Allège les onglets : lignes vides en trop, colonnes vides inutiles. L'onglet RELEASIT n'est jamais touché. */
function lightenSheets_() {
  var ss = ss_();
  var plan = [
    [SHEET.ORDERS, 300, false],
    [SHEET.LOG, 100, true],
    [SHEET.ARCHIVE, 100, true],
    [TRASH.SHEET, 50, true],
    [TRASH.BLOCKED, 50, true],
    [SHEET.CLIENTS, 200, true],
    [SHEET.SETTINGS, 20, true],
    [SHEET.TEAM, 20, true],
    [SHEET.PRODUCTS, 100, true],
    [SHEET.MOVES, 200, true]
  ];
  var removed = 0;
  plan.forEach(function (p) {
    var sh = ss.getSheetByName(p[0]);
    if (sh) removed += trimSheet_(sh, p[1], p[2]);
  });
  return removed;
}

/** Déclencheur de nuit : archivage, Journal raccourci, onglets allégés. */
function nightlyMaintenance() {
  var t0 = Date.now();
  var out = { archived: 0, journal: 0, rows: 0, autoCancelled: 0, stats: 0, trash: 0, errors: [] };
  var step = function (name, fn) {
    try { fn(); } catch (e) { out.errors.push(name + ' : ' + (e && e.message ? e.message : e)); }
  };
  step('appels', function () { out.autoCancelled = autoCancelUnreachable_(); });
  step('stock', function () { withLock_(function () { applyStockMoves_(readOrders_()); }); });
  step('archivage', function () { out.archived = archiveOldOrders_().archived; });
  step('journal', function () { out.journal = trimJournal_(getSettings_().JOURNAL_JOURS); });
  step('corbeille', function () { out.trash = purgeOldTrash_(); });
  step('allègement', function () { out.rows = lightenSheets_(); });
  step('statistiques', function () { out.stats = rebuildStats_().days; });
  if (out.errors.length) log_({ name: 'Automatique' }, '', 'Erreur maintenance', out.errors.join(' · '));
  try { noteNightly_(Date.now() - t0, out.errors); } catch (e) { /* l'état de l'outil ne doit pas bloquer l'entretien */ }
  return out;
}

function menuMaintenance() {
  var ui = SpreadsheetApp.getUi();
  var r = nightlyMaintenance();
  ui.alert(APP_NAME,
    r.autoCancelled + ' commande(s) sans réponse annulée(s), ' + r.archived + ' commande(s) archivée(s), ' + r.journal + ' ligne(s) de Journal effacée(s), ' + r.rows + ' ligne(s) vide(s) supprimée(s).' +
    (r.errors.length ? '\n\nProblème : ' + r.errors.join(' · ') : ''),
    ui.ButtonSet.OK);
}

/* ---- Stock.gs ---- */
/**
 * Stock.gs : catalogue des produits par modèle (onglet Produits) et stock.
 *
 *  - Une ligne par modèle : Produit | Modèle | Prix de vente | Coût d'achat | Stock |
 *    Seuil d'alerte | Autres noms | Actif. « Autres noms » : d'autres écritures du même
 *    modèle (séparées par « ; ») pour relier les commandes ; « Actif » = NON pour un modèle
 *    qu'on ne vend plus (gardé pour l'historique).
 *  - Une commande « Confirmée » RÉSERVE ses produits : Disponible = Stock − Réservé.
 *    Le centre de confirmation prévient quand il n'en reste pas assez.
 *  - Quand le colis part (Expédiée, En livraison, Livrée), le Stock baisse.
 *    Quand le retour est reçu (ou si un colis parti est annulé), il remonte ; un retour
 *    abîmé peut ensuite être retiré du stock. La colonne « Mouvement stock » des
 *    commandes garantit qu'une commande ne compte qu'une fois.
 *  - Entrées de marchandise (coût moyen recalculé si COUT_MOYEN = OUI) et inventaires
 *    se font depuis la page Stock. Chaque changement est noté dans l'onglet « Mouvements stock ».
 *  - Une commande est reliée à son modèle par son libellé : « cover iPhone - iphone 15 PRO MAX »
 *    correspond à la ligne Produit « cover iPhone », Modèle « iphone 15 PRO MAX »
 *    (sans tenir compte des majuscules, accents et tirets), ou à l'un de ses autres noms.
 *  - Page Stock : administrateur et rôle « Magasinier » (onglet Équipe).
 */

var PRODUCT_TITLES_ = ['Produit', 'Modèle', 'Prix de vente', "Coût d'achat", 'Stock', "Seuil d'alerte", 'Autres noms', 'Actif'];
var MOVE_TITLES_ = ['Date', 'Produit', 'Modèle', 'Mouvement', 'Quantité', 'Stock après', 'Coût unitaire', 'Commande', 'Par', 'Note'];
var INVENTORY_REASONS_ = ['Comptage', 'Perte', 'Casse', 'Erreur', 'Cadeau', 'Autre'];
var STOCK_OUT_ = 'Sorti';
var STOCK_BACK_ = 'Rentré';
var STOCK_DAMAGED_ = 'Rentré (abîmé)';
var STOCK_BEFORE_ = 'Avant le suivi du stock';

function catalogKey_(product, model) {
  return normalizeLoose_(String(product || '') + ' ' + String(model || ''));
}

function isNo_(value) {
  return /^(non|no|false|faux|0)$/i.test(String(value == null ? '' : value).trim());
}

/** Lecture de l'onglet Produits (sans la mémoire). */
function readCatalogFromSheet_() {
  var out = { rows: [], stockCol: -1, cols: {}, width: 0 };
  var sh = ss_().getSheetByName(SHEET.PRODUCTS);
  if (!sh || sh.getLastRow() < 1) return out;
  var values = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 1)).getValues();
  var index = {};
  values[0].forEach(function (t, i) { var k = normalizeText_(t); if (k && index[k] === undefined) index[k] = i; });
  var col = function (title) { var i = index[normalizeText_(title)]; return i === undefined ? -1 : i; };
  var c = {
    product: col('Produit'), model: col('Modèle'), price: col('Prix de vente'), cost: col("Coût d'achat"), stock: col('Stock'),
    threshold: col("Seuil d'alerte"), aliases: col('Autres noms'), active: col('Actif')
  };
  out.cols = c;
  out.width = values[0].length;
  if (c.product < 0) return out;
  out.stockCol = c.stock;
  var num = function (row, i) { return i < 0 || isBlank_(row[i]) || String(row[i]).trim() === '' ? null : toNumber_(row[i]); };
  var text = function (row, i) { return i < 0 ? '' : String(row[i] == null ? '' : row[i]).replace(/\s+/g, ' ').trim(); };
  for (var r = 1; r < values.length; r++) {
    var product = text(values[r], c.product);
    if (!product) continue;
    var model = text(values[r], c.model);
    out.rows.push({
      row: r + 1, product: product, model: model, key: catalogKey_(product, model),
      price: num(values[r], c.price), cost: num(values[r], c.cost), stock: num(values[r], c.stock), threshold: num(values[r], c.threshold),
      aliases: text(values[r], c.aliases).split(/[;\n]/).map(function (a) { return a.trim(); }).filter(function (a) { return a; }),
      active: !isNo_(values[r][c.active])
    });
  }
  return out;
}

/** Catalogue gardé en mémoire (vidée quand l'onglet Produits change). */
function readCatalog_() {
  return cached_('cfg:products', readCatalogFromSheet_);
}

/** Modèle du catalogue correspondant à un libellé de commande (ou à un de ses autres noms), ou null. */
function matchCatalog_(catalog, label) {
  if (!catalog._index) {
    var index = {};
    catalog.rows.forEach(function (r) { if (index[r.key] === undefined) index[r.key] = r; });
    catalog.rows.forEach(function (r) {
      (r.aliases || []).forEach(function (a) { var k = normalizeLoose_(a); if (k && index[k] === undefined) index[k] = r; });
    });
    catalog._index = index;
  }
  return catalog._index[normalizeLoose_(label)] || null;
}

/** « cover iPhone - iphone 15 PRO MAX » → { product: 'cover iPhone', model: 'iphone 15 PRO MAX' }. */
function splitLabel_(label) {
  var m = String(label).match(/^(.+?)\s+[—–-]\s+(.+)$/);
  return m ? { product: m[1].trim(), model: m[2].trim() } : { product: String(label).trim(), model: '' };
}

function rowLabel_(row) {
  return row.product + (row.model ? ' — ' + row.model : '');
}

/**
 * Articles d'une commande : « A ×2 + B » donne [{A, 2}, {B, 1}] ; un seul
 * article prend la quantité de la commande.
 */
function orderItems_(o) {
  var text = String(o.product == null ? '' : o.product).replace(/\s+/g, ' ').trim();
  if (!text) return [];
  var parts = text.split(/\s\+\s/);
  var single = parts.length === 1;
  return parts.map(function (part) {
    var label = part.trim();
    var qty = single ? Math.max(1, Math.round(toNumber_(o.qty)) || 1) : 1;
    var m = label.match(/^(.*\S)\s*×\s*(\d+)$/);
    if (m && !single) { label = m[1].trim(); qty = Math.max(1, +m[2]); }
    return { label: label, qty: qty };
  }).filter(function (it) { return it.label; });
}

/** Retour reçu : Ecotrack l'a rendu (« retour reçu ») ; pour une société sans connexion, dès le statut « Retour ». */
function returnReceived_(o) {
  if (!hasEcotrackParcel_(o)) return true;
  var info = ecotrackStatusInfo_(o.carrierStatus);
  return !!(info && info.group === 'returned');
}

/** Quantités réservées par modèle : commandes confirmées dont le colis n'est pas encore parti. */
function reservedByKey_(orders, catalog) {
  var reserved = {};
  orders.forEach(function (o) {
    if (o.status !== STATUS.CONFIRMED || !isBlank_(o.stockMove)) return;
    orderItems_(o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (row) reserved[row.key] = (reserved[row.key] || 0) + it.qty;
    });
  });
  return reserved;
}

/** État du stock pour les articles d'une commande (fiche de commande, centre de confirmation). */
function orderStockInfo_(ctx, o) {
  var catalog = readCatalog_();
  var reserved = reservedByKey_(ctx.orders, catalog);
  var self = o.status === STATUS.CONFIRMED && isBlank_(o.stockMove);
  var gone = !isBlank_(o.stockMove); // déjà sortie du stock
  return orderItems_(o).map(function (it) {
    var row = matchCatalog_(catalog, it.label);
    if (!row) return { label: it.label, qty: it.qty, matched: false, tracked: false, short: false };
    var tracked = row.stock !== null;
    var res = reserved[row.key] || 0;
    var others = res - (self ? it.qty : 0);
    return {
      label: it.label, qty: it.qty, matched: true, tracked: tracked, product: row.product, model: row.model,
      stock: tracked ? row.stock : null, reserved: res, available: tracked ? row.stock - res : null,
      short: tracked && !gone && QUEUE_STATUSES.concat([STATUS.UNREACHABLE, STATUS.CONFIRMED]).indexOf(o.status) >= 0 && row.stock - others < it.qty
    };
  });
}

/* ------------------------------------------------------------------ */
/* Écritures dans les onglets Produits et Mouvements stock            */
/* ------------------------------------------------------------------ */

function productsSheet_() {
  var sh = ss_().getSheetByName(SHEET.PRODUCTS) || ss_().insertSheet(SHEET.PRODUCTS);
  ensureHeaders_(sh, PRODUCT_TITLES_);
  return sh;
}

/** Écrit des cases d'une ligne de l'onglet Produits : { stock: 12, cost: 600 }… */
function writeCatalogCells_(sh, catalog, rowNum, fields) {
  Object.keys(fields).forEach(function (k) {
    var c = catalog.cols[k];
    if (c === undefined || c < 0) return;
    sh.getRange(rowNum, c + 1).setValue(fields[k]);
  });
}

/** Ajoute des lignes à l'onglet « Mouvements stock » (créé s'il manque). */
function logStockMoves_(rows) {
  if (!rows.length) return;
  var sh = ss_().getSheetByName(SHEET.MOVES);
  if (!sh) {
    sh = ss_().insertSheet(SHEET.MOVES);
    ensureHeaders_(sh, MOVE_TITLES_);
  }
  var r = sh.getLastRow() + 1;
  ensureRows_(sh, r + rows.length - 1);
  sh.getRange(r, 1, rows.length, MOVE_TITLES_.length).setValues(rows);
}

function moveRow_(row, type, qty, after, unitCost, orderId, by, note) {
  return [new Date(), row.product, row.model, type, qty, after === null ? '' : after, unitCost || '', orderId || '', by || '', note || ''];
}

/**
 * Applique les mouvements de stock en attente : colis partis (le stock baisse),
 * retours reçus ou colis partis puis annulés (il remonte). Chaque commande ne
 * compte qu'une fois. À appeler sous verrou, avec les commandes à jour.
 */
function applyStockMoves_(ctx) {
  var summary = { out: 0, back: 0 };
  if (ctx.map.stockMove === undefined) return summary;
  var moves = [];
  ctx.orders.forEach(function (o) {
    var mark = String(o.stockMove == null ? '' : o.stockMove).trim();
    var s = o.status;
    var left = s === STATUS.SHIPPED || s === STATUS.IN_DELIVERY || s === STATUS.DELIVERED;
    var back = s === STATUS.RETURNED && returnReceived_(o);
    if (!mark) {
      if (left || (s === STATUS.RETURNED && !back)) moves.push({ o: o, marker: STOCK_OUT_, sign: -1 });
      else if (back) moves.push({ o: o, marker: STOCK_BACK_, sign: 0 }); // parti et revenu : rien ne change
    } else if (mark === STOCK_OUT_ && (back || s === STATUS.CANCELLED)) {
      moves.push({ o: o, marker: STOCK_BACK_, sign: 1 });
    }
  });
  if (!moves.length) return summary;

  var catalog = readCatalogFromSheet_();
  var current = {};
  var changed = {};
  var moveRows = [];
  var lines = {};
  moves.forEach(function (m) {
    if (!m.sign) return;
    var type = m.sign < 0 ? 'Colis parti' : (m.o.status === STATUS.CANCELLED ? 'Colis annulé (rentré)' : 'Retour reçu');
    orderItems_(m.o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (!row || row.stock === null) return;
      if (current[row.row] === undefined) current[row.row] = row.stock;
      current[row.row] += m.sign * it.qty;
      changed[row.row] = true;
      moveRows.push(moveRow_(row, type, m.sign * it.qty, current[row.row], '', String(m.o.id), 'Automatique', ''));
      (lines[m.o.id] = lines[m.o.id] || []).push((m.sign < 0 ? '−' : '+') + it.qty + ' ' + rowLabel_(row));
    });
  });
  var rows = Object.keys(changed);
  if (rows.length && catalog.stockCol >= 0) {
    var sh = ss_().getSheetByName(SHEET.PRODUCTS);
    var last = sh.getLastRow();
    var col = sh.getRange(2, catalog.stockCol + 1, last - 1, 1).getValues();
    rows.forEach(function (r) { col[r - 2][0] = current[r]; });
    sh.getRange(2, catalog.stockCol + 1, last - 1, 1).setValues(col);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
  }
  logStockMoves_(moveRows);
  var actor = { name: 'Stock' };
  moves.forEach(function (m) {
    writeFields_(ctx, m.o, { stockMove: m.marker });
    if (m.sign < 0) summary.out++;
    if (m.sign > 0) summary.back++;
    if (lines[m.o.id]) log_(actor, m.o.id, m.sign < 0 ? 'Stock : colis parti' : 'Stock : retour reçu', lines[m.o.id].join(', '));
  });
  return summary;
}

/** À l'ajout de la colonne « Mouvement stock » : les commandes déjà parties ne retouchent pas le stock. */
function markStockBefore_(sh, map) {
  var last = sh.getLastRow();
  if (last < 2 || map.stockMove === undefined || map.status === undefined) return 0;
  var status = sh.getRange(2, map.status + 1, last - 1, 1).getValues();
  var marks = sh.getRange(2, map.stockMove + 1, last - 1, 1).getValues();
  var done = [STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.DELIVERED, STATUS.RETURNED, STATUS.CANCELLED];
  var n = 0;
  var out = marks.map(function (m, i) {
    if (isBlank_(m[0]) && done.indexOf(String(status[i][0]).trim()) >= 0) { n++; return [STOCK_BEFORE_]; }
    return [m[0]];
  });
  if (n) sh.getRange(2, map.stockMove + 1, last - 1, 1).setValues(out);
  return n;
}

/* ------------------------------------------------------------------ */
/* Accès : administrateur et magasinier                              */
/* ------------------------------------------------------------------ */

/** Rôle « Magasinier » (ou « Stock ») dans l'onglet Équipe. */
function isStockKeeper_(user) {
  return /^(magasin|stock)/.test(normalizeText_(user && user.role));
}

function canSeeStock_(user) {
  return isAdmin_(user) || isStockKeeper_(user);
}

function requireStockAccess_() {
  var user = currentUser_();
  if (!canSeeStock_(user)) throw new Error('Réservé à l’administrateur et au magasinier (rôle dans l’onglet Équipe).');
  return user;
}

/** Réservé à l'administrateur (onglet Équipe). */
function requireAdmin_() {
  var user = currentUser_();
  if (!isAdmin_(user)) throw new Error('Réservé à l’administrateur (rôle « Administrateur » dans l’onglet Équipe).');
  return user;
}

/* ------------------------------------------------------------------ */
/* Page Stock                                                         */
/* ------------------------------------------------------------------ */

/** Stock par produit (total) et par modèle, stock bas, ruptures, valeur, libellés absents du catalogue. */
function stockData_(ctx, settings) {
  var catalog = readCatalog_();
  var reserved = reservedByKey_(ctx.orders, catalog);
  var groups = {};
  var order = [];
  var totals = { value: 0, units: 0, low: 0, rupture: 0, models: 0 };
  catalog.rows.forEach(function (r) {
    var gk = normalizeLoose_(r.product);
    var g = groups[gk];
    if (!g) { g = groups[gk] = { product: r.product, stock: 0, reserved: 0, available: 0, value: 0, tracked: false, models: [] }; order.push(g); }
    var res = reserved[r.key] || 0;
    var tracked = r.stock !== null;
    var available = tracked ? r.stock - res : null;
    var threshold = r.threshold !== null ? r.threshold : settings.STOCK_SEUIL;
    var rupture = r.active && tracked && available <= 0;
    var isLow = r.active && tracked && available <= threshold;
    var value = tracked && r.cost !== null ? Math.max(r.stock, 0) * r.cost : 0;
    if (isLow) totals.low++;
    if (rupture) totals.rupture++;
    if (r.active) totals.models++;
    totals.value += value;
    if (tracked) totals.units += Math.max(r.stock, 0);
    g.models.push({
      row: r.row, key: r.key, model: r.model, price: r.price, cost: r.cost, stock: r.stock, reserved: res, available: available,
      threshold: threshold, ownThreshold: r.threshold, low: isLow, rupture: rupture, tracked: tracked, active: r.active,
      aliases: r.aliases.join('; '), value: Math.round(value)
    });
    g.reserved += res;
    g.value += value;
    if (tracked) { g.tracked = true; g.stock += r.stock; g.available += available; }
  });
  order.forEach(function (g) { g.value = Math.round(g.value); });
  totals.value = Math.round(totals.value);

  // Libellés vus dans les commandes récentes mais absents de l'onglet Produits.
  var since = new Date(Date.now() - 60 * 86400000);
  var unknown = {};
  ctx.orders.forEach(function (o) {
    var d = toDate_(o.date);
    if (d && d < since) return;
    orderItems_(o).forEach(function (it) {
      if (matchCatalog_(catalog, it.label)) return;
      var k = normalizeLoose_(it.label);
      var u = unknown[k] = unknown[k] || { label: it.label, orders: 0, sum: 0, n: 0 };
      u.orders++;
      if (toNumber_(o.price) > 0 && orderItems_(o).length === 1) { u.sum += toNumber_(o.price) / it.qty; u.n++; }
    });
  });
  var unknownList = Object.keys(unknown).map(function (k) {
    var u = unknown[k];
    var parts = splitLabel_(u.label);
    return { label: u.label, product: parts.product, model: parts.model, orders: u.orders, price: u.n ? Math.round(u.sum / u.n) : null };
  }).sort(function (a, b) { return b.orders - a.orders; });

  return { products: order, low: totals.low, rupture: totals.rupture, totals: totals, unknown: unknownList };
}

/** Derniers mouvements de stock (les plus récents d'abord). */
function readStockMoves_(limit) {
  var sh = ss_().getSheetByName(SHEET.MOVES);
  if (!sh || sh.getLastRow() < 2) return [];
  var n = Math.min(sh.getLastRow() - 1, limit || 300);
  var values = sh.getRange(sh.getLastRow() - n + 1, 1, n, MOVE_TITLES_.length).getValues();
  return values.reverse().map(function (r) {
    return {
      date: iso_(r[0]), product: String(r[1]), model: String(r[2]), key: catalogKey_(r[1], r[2]), type: String(r[3]),
      qty: toNumber_(r[4]), after: isBlank_(r[5]) || r[5] === '' ? null : toNumber_(r[5]),
      cost: isBlank_(r[6]) || r[6] === '' ? null : toNumber_(r[6]), order: String(r[7]), by: String(r[8]), note: String(r[9])
    };
  });
}

/** Page Stock (administrateur et magasinier). */
/** Stock : mesurée (Administration › État de l'outil). */
function api_stockPage() {
  var a = arguments;
  return timed_('Stock', function () { return stockPageApi_.apply(null, a); });
}

function stockPageApi_() {
  var user = requireStockAccess_();
  var settings = getSettings_();
  var d = stockData_(readOrders_(), settings);
  d.moves = readStockMoves_(300);
  d.reasons = INVENTORY_REASONS_;
  d.averageCost = settings.COUT_MOYEN;
  d.admin = isAdmin_(user);
  return d;
}

/** Ancien nom (page Bénéfices › Stock). */
function api_stock() {
  return api_stockPage();
}

/** Ajoute des modèles au catalogue (libellés vus dans les commandes), sans doublon. */
function api_addCatalogItems(labels) {
  var user = requireStockAccess_();
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var ctx = readOrders_();
    var info = {};
    stockData_(ctx, getSettings_()).unknown.forEach(function (u) { info[normalizeLoose_(u.label)] = u; });
    var seen = {};
    var rows = [];
    (labels || []).forEach(function (label) {
      var k = normalizeLoose_(label);
      if (!k || seen[k] || matchCatalog_(catalog, label)) return;
      seen[k] = true;
      var parts = splitLabel_(String(label).replace(/\s+/g, ' ').trim());
      var u = info[k];
      rows.push(productRowValues_(header, { product: parts.product, model: parts.model, price: u && u.price !== null ? u.price : '' }));
    });
    if (rows.length) {
      var r = sh.getLastRow() + 1;
      ensureRows_(sh, r + rows.length - 1);
      sh.getRange(r, 1, rows.length, header.length).setValues(rows);
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      log_(user, '', 'Produits', rows.length + ' modèle(s) ajouté(s) à l’onglet Produits');
    }
    return { added: rows.length, message: rows.length + ' modèle(s) ajouté(s) à l’onglet Produits. Indiquez leur coût d’achat et leur stock.' };
  });
}

/** Une ligne de l'onglet Produits rangée selon ses titres. */
function productRowValues_(header, v) {
  var byTitle = {};
  byTitle[normalizeText_('Produit')] = v.product;
  byTitle[normalizeText_('Modèle')] = v.model || '';
  byTitle[normalizeText_('Prix de vente')] = v.price === undefined || v.price === null ? '' : v.price;
  byTitle[normalizeText_("Coût d'achat")] = v.cost === undefined || v.cost === null ? '' : v.cost;
  byTitle[normalizeText_('Stock')] = v.stock === undefined || v.stock === null ? '' : v.stock;
  byTitle[normalizeText_("Seuil d'alerte")] = v.threshold === undefined || v.threshold === null ? '' : v.threshold;
  byTitle[normalizeText_('Autres noms')] = v.aliases || '';
  byTitle[normalizeText_('Actif')] = 'OUI';
  return header.map(function (t) { var x = byTitle[normalizeText_(t)]; return x === undefined ? '' : x; });
}

function numOrBlank_(v) {
  return v === undefined || v === null || String(v).trim() === '' ? null : toNumber_(v);
}

/**
 * Ajoute un produit et ses modèles. input = { product, price, cost, threshold, aliases,
 * models: [{ model, stock }] } ; sans modèle, une seule ligne. Un modèle déjà présent est ignoré.
 * Le stock de départ est noté comme mouvement « Stock initial ».
 */
function api_addProduct(input) {
  var user = requireStockAccess_();
  input = input || {};
  var product = String(input.product || '').replace(/\s+/g, ' ').trim();
  if (!product) throw new Error('Indiquez le nom du produit.');
  var models = (input.models || []).map(function (m) {
    return { model: String(m.model || '').replace(/\s+/g, ' ').trim(), stock: numOrBlank_(m.stock) };
  }).filter(function (m) { return m.model; });
  if (!models.length) models = [{ model: '', stock: numOrBlank_(input.stock) }];
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows = [];
    var moves = [];
    var skipped = [];
    var seen = {};
    models.forEach(function (m) {
      var key = catalogKey_(product, m.model);
      if (seen[key] || matchCatalog_(catalog, product + ' ' + m.model)) { skipped.push(m.model || product); return; }
      seen[key] = true;
      rows.push(productRowValues_(header, {
        product: product, model: m.model, price: numOrBlank_(input.price), cost: numOrBlank_(input.cost),
        stock: m.stock === null ? 0 : m.stock, threshold: numOrBlank_(input.threshold), aliases: m.model ? '' : String(input.aliases || '').trim()
      }));
      if (m.stock) moves.push(moveRow_({ product: product, model: m.model }, 'Stock initial', m.stock, m.stock, numOrBlank_(input.cost), '', user.name, ''));
    });
    if (rows.length) {
      var r = sh.getLastRow() + 1;
      ensureRows_(sh, r + rows.length - 1);
      sh.getRange(r, 1, rows.length, header.length).setValues(rows);
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      logStockMoves_(moves);
      log_(user, '', 'Produits', product + ' : ' + rows.length + ' modèle(s) ajouté(s)');
    }
    return {
      added: rows.length, skipped: skipped,
      message: rows.length + ' modèle(s) ajouté(s) pour « ' + product + ' ».' + (skipped.length ? ' Déjà présent(s) : ' + skipped.join(', ') + '.' : '')
    };
  });
}

/**
 * Modifie un modèle (nom, prix, coût, seuil, autres noms, actif). Le stock ne se modifie pas
 * ici : entrée de marchandise ou inventaire. Renommé, l'ancien nom est gardé dans « Autres noms »
 * pour que les commandes déjà passées restent reliées.
 */
function api_updateCatalogRow(input) {
  var user = requireStockAccess_();
  input = input || {};
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var row = catalog.rows.filter(function (r) { return r.row === Number(input.row); })[0];
    if (!row || row.key !== input.key) throw new Error('Ce modèle a été modifié entre-temps dans le classeur : rechargez la page.');
    var product = String(input.product == null ? row.product : input.product).replace(/\s+/g, ' ').trim();
    var model = String(input.model == null ? row.model : input.model).replace(/\s+/g, ' ').trim();
    if (!product) throw new Error('Indiquez le nom du produit.');
    var aliases = String(input.aliases == null ? row.aliases.join('; ') : input.aliases).split(/[;\n]/).map(function (a) { return a.trim(); }).filter(function (a) { return a; });
    var newKey = catalogKey_(product, model);
    if (newKey !== row.key) {
      var clash = catalog.rows.filter(function (r) { return r.row !== row.row && r.key === newKey; })[0];
      if (clash) throw new Error('Ce modèle existe déjà : ' + rowLabel_(clash) + '.');
      var old = rowLabel_(row);
      if (aliases.map(normalizeLoose_).indexOf(normalizeLoose_(old)) < 0) aliases.push(old);
    }
    var fields = { product: product, model: model, aliases: aliases.join('; '), active: input.active === false || isNo_(input.active) ? 'NON' : 'OUI' };
    if (input.price !== undefined) fields.price = numOrBlank_(input.price) === null ? '' : numOrBlank_(input.price);
    if (input.cost !== undefined) fields.cost = numOrBlank_(input.cost) === null ? '' : numOrBlank_(input.cost);
    if (input.threshold !== undefined) fields.threshold = numOrBlank_(input.threshold) === null ? '' : numOrBlank_(input.threshold);
    writeCatalogCells_(sh, catalog, row.row, fields);
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    log_(user, '', 'Produits', 'Modifié : ' + rowLabel_({ product: product, model: model }) + (fields.active === 'NON' ? ' (désactivé)' : ''));
    return { message: 'Modèle enregistré : ' + rowLabel_({ product: product, model: model }) + '.' };
  });
}

/**
 * Entrée de marchandise : items = [{ row, key, qty, cost }]. Le stock augmente ; avec
 * COUT_MOYEN = OUI, le coût d'achat devient la moyenne pondérée (ancien stock et nouvelle entrée).
 */
function api_stockEntry(input) {
  var user = requireStockAccess_();
  input = input || {};
  var settings = getSettings_();
  var items = (input.items || []).map(function (it) {
    return { row: Number(it.row), key: String(it.key || ''), qty: Math.round(toNumber_(it.qty)), cost: numOrBlank_(it.cost) };
  }).filter(function (it) { return it.qty > 0; });
  if (!items.length) throw new Error('Indiquez au moins une quantité reçue.');
  var note = [String(input.supplier || '').trim() ? 'Fournisseur : ' + String(input.supplier).trim() : '', String(input.note || '').trim()]
    .filter(function (x) { return x; }).join(' · ');
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    var units = 0;
    items.forEach(function (it) {
      var row = catalog.rows.filter(function (r) { return r.row === it.row && (!it.key || r.key === it.key); })[0];
      if (!row) throw new Error('Un modèle a été modifié entre-temps dans le classeur : rechargez la page.');
      var before = row.stock === null ? 0 : row.stock;
      var after = before + it.qty;
      var fields = { stock: after };
      if (it.cost !== null && it.cost > 0) {
        if (settings.COUT_MOYEN && row.cost !== null && before > 0) {
          fields.cost = Math.round((before * row.cost + it.qty * it.cost) / (before + it.qty));
        } else if (settings.COUT_MOYEN || row.cost === null) {
          fields.cost = it.cost;
        }
      }
      writeCatalogCells_(sh, catalog, row.row, fields);
      row.stock = after;
      if (fields.cost !== undefined) row.cost = fields.cost;
      units += it.qty;
      moves.push(moveRow_(row, 'Entrée', it.qty, after, it.cost, '', user.name, note));
    });
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_(moves);
    log_(user, '', 'Stock : entrée', units + ' pièce(s)' + (note ? ' · ' + note : ''));
    return { message: 'Entrée enregistrée : ' + units + ' pièce(s) ajoutée(s) au stock.' };
  });
}

/** Inventaire : items = [{ row, key, counted }] ; l'écart avec le stock est noté avec le motif. */
function api_stockInventory(input) {
  var user = requireStockAccess_();
  input = input || {};
  var reason = String(input.reason || 'Comptage').trim() || 'Comptage';
  var items = (input.items || []).filter(function (it) { return String(it.counted == null ? '' : it.counted).trim() !== ''; })
    .map(function (it) { return { row: Number(it.row), key: String(it.key || ''), counted: Math.round(toNumber_(it.counted)) }; });
  if (!items.length) throw new Error('Indiquez au moins une quantité comptée.');
  return withLock_(function () {
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    items.forEach(function (it) {
      var row = catalog.rows.filter(function (r) { return r.row === it.row && (!it.key || r.key === it.key); })[0];
      if (!row) throw new Error('Un modèle a été modifié entre-temps dans le classeur : rechargez la page.');
      var before = row.stock === null ? 0 : row.stock;
      if (row.stock !== null && it.counted === before) return;
      writeCatalogCells_(sh, catalog, row.row, { stock: it.counted });
      moves.push(moveRow_(row, 'Inventaire', it.counted - before, it.counted, '', '', user.name, reason));
    });
    if (moves.length) {
      clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
      logStockMoves_(moves);
      log_(user, '', 'Stock : inventaire', moves.length + ' modèle(s) corrigé(s) · ' + reason);
    }
    return { changed: moves.length, message: moves.length ? moves.length + ' modèle(s) corrigé(s).' : 'Aucun écart : rien à corriger.' };
  });
}

/** Retour reçu abîmé : il ne peut pas être revendu, on le retire du stock. */
function api_markReturnDamaged(id) {
  var user = requireStockAccess_();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (o.status !== STATUS.RETURNED || String(o.stockMove).trim() !== STOCK_BACK_) {
      throw new Error('Seul un retour reçu et remis en stock peut être marqué abîmé.');
    }
    var sh = productsSheet_();
    var catalog = readCatalogFromSheet_();
    var moves = [];
    orderItems_(o).forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      if (!row || row.stock === null) return;
      row.stock -= it.qty;
      writeCatalogCells_(sh, catalog, row.row, { stock: row.stock });
      moves.push(moveRow_(row, 'Retour abîmé', -it.qty, row.stock, '', String(o.id), user.name, ''));
    });
    writeFields_(ctx, o, { stockMove: STOCK_DAMAGED_, updated: new Date() });
    clearConfigCache_(configKeysFor_(SHEET.PRODUCTS));
    logStockMoves_(moves);
    log_(user, o.id, 'Stock : retour abîmé', moves.length ? 'Retiré du stock' : 'Produit non suivi en stock');
    return { order: serializeOrder_(o), message: 'Retour ' + o.id + ' marqué abîmé : retiré du stock.' };
  });
}

/* ---- Profit.gs ---- */
/**
 * Profit.gs : bénéfice des commandes, dépenses (la publicité en fait partie),
 * rentabilité par produit, par campagne et par plateforme (Facebook, TikTok…).
 *
 * Bénéfice d'une commande (comptée à sa date de commande) :
 *  - livrée : ventes des produits (total encaissé − livraison payée par le client)
 *             − livraison (prix de la société de livraison − livraison payée par le client :
 *               positif = elle vous coûte, négatif = vous gagnez dessus)
 *             − coût d'achat × quantité (onglet Produits) − emballage ;
 *             (c'est la même chose que : total encaissé − prix de la société − achat − emballage)
 *  - retour : − frais de retour (FRAIS_RETOUR) − emballage ;
 *  - autres : rien (pas encore terminée, ou annulée).
 * Bénéfice net = bénéfice des commandes − dépenses de la période + gains de la période.
 *
 * Onglet Dépenses : Date | Catégorie | Campagne | Montant | Devise (DA ou USD) | Taux | Note | Fin | Type.
 *  - Fin : dernier jour d'une dépense étalée (ex. publicité du 1er au 10) ; vide = un seul jour.
 *    Le montant est réparti à parts égales sur chaque jour : une période ne compte que ses jours.
 *  - Type : « Dépense » (vide = dépense) ou « Gain » (argent reçu en dehors des commandes :
 *    remboursement, vente directe, bonus…), ajouté au bénéfice net.
 * Une dépense en dollars reçoit le taux du jour (TAUX_DOLLAR) la première fois
 * qu'elle est lue : changer le taux plus tard ne modifie pas les anciennes dépenses.
 */

var EXPENSE_TITLES_ = ['Date', 'Catégorie', 'Campagne', 'Montant', 'Devise', 'Taux', 'Note', 'Fin', 'Type'];
var CURRENCIES_ = ['DA', 'USD'];
var EXPENSE_TYPES_ = ['Dépense', 'Gain'];

function setupExpensesSheet_(ss) {
  var sh = setupSimpleSheet_(ss, SHEET.EXPENSES, EXPENSE_TITLES_, [110, 170, 220, 110, 80, 80, 260, 110, 90]);
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normalizeText_);
  var col = function (t) { return header.indexOf(normalizeText_(t)) + 1; };
  var n = dataRows_(sh);
  var list = function (values) { return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build(); };
  var settings = getSettings_();
  sh.getRange(2, col('Date'), n, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, col('Fin'), n, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, col('Montant'), n, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, col('Taux'), n, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, col('Catégorie'), n, 1).setDataValidation(list(settings.categories.concat(settings.gainCategories.filter(function (c) { return settings.categories.indexOf(c) < 0; }))));
  sh.getRange(2, col('Devise'), n, 1).setDataValidation(list(CURRENCIES_));
  sh.getRange(2, col('Type'), n, 1).setDataValidation(list(EXPENSE_TYPES_));
  return sh;
}

/** Facebook, TikTok… à partir d'une source UTM ou d'une catégorie de dépense ; '' si inconnue. */
function adPlatform_(text) {
  var t = normalizeText_(text);
  if (!t) return '';
  if (/facebook|instagram|\bmeta\b|^fb\b|\bfb\b|^ig\b/.test(t)) return 'Facebook';
  if (/tik ?tok|^tt\b/.test(t)) return 'TikTok';
  if (/google|youtube/.test(t)) return 'Google';
  if (/snap/.test(t)) return 'Snapchat';
  return '';
}

function isAdCategory_(category) {
  var t = normalizeText_(category);
  return /publicit|\bpub\b|\bads?\b|sponsor/.test(t) || !!adPlatform_(category);
}

function expensesSheetInfo_() {
  var sh = ss_().getSheetByName(SHEET.EXPENSES);
  if (!sh) return null;
  var header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  var idx = {};
  header.forEach(function (t, i) { var k = normalizeText_(t); if (k && idx[k] === undefined) idx[k] = i; });
  var col = function (t) { var i = idx[normalizeText_(t)]; return i === undefined ? -1 : i; };
  return { sh: sh, header: header, c: { date: col('Date'), category: col('Catégorie'), campaign: col('Campagne'), amount: col('Montant'), currency: col('Devise'), rate: col('Taux'), note: col('Note'), end: col('Fin'), type: col('Type') } };
}

/** « Gain » dans la colonne Type (sinon : dépense). */
function isGainType_(v) {
  return /^(gain|revenu|entree|recette)/.test(normalizeText_(v));
}

/** Part d'une dépense (ou d'un gain) dans les jours from..to (aaaa-mm-jj ; from vide = depuis toujours). */
function expenseShare_(e, from, to) {
  if (!e.startKey) return from ? 0 : e.amountDA; // sans date : seulement dans « Tout »
  var a = !from || e.startKey > from ? e.startKey : from;
  var b = !to || e.endKey < to ? e.endKey : to;
  if (a > b) return 0;
  return e.amountDA * dayCount_(a, b) / e.days;
}

/** Empreinte d'une ligne : une correction ou une suppression vérifie que la ligne n'a pas changé entre-temps. */
function expenseSig_(e) {
  return [e.startKey, e.endKey, e.gain ? 'G' : 'D', e.category, e.amount, e.currency].join('|');
}

function isUsd_(currency) {
  return /^(usd|\$|dollars?|us ?d)$/i.test(String(currency || '').trim());
}

/** Dépenses de l'onglet Dépenses, montant converti en dinars. */
function readExpenses_(settings) {
  var info = expensesSheetInfo_();
  if (!info || info.sh.getLastRow() < 2 || info.c.amount < 0) return [];
  var c = info.c;
  var values = info.sh.getRange(2, 1, info.sh.getLastRow() - 1, info.header.length).getValues();
  var out = [];
  values.forEach(function (r, i) {
    var amount = toNumber_(r[c.amount]);
    if (!amount) return;
    var usd = c.currency >= 0 && isUsd_(r[c.currency]);
    var rate = c.rate >= 0 && !isBlank_(r[c.rate]) && toNumber_(r[c.rate]) > 0 ? toNumber_(r[c.rate]) : null;
    var category = c.category >= 0 ? String(r[c.category]).trim() : '';
    var start = c.date >= 0 ? toDate_(r[c.date]) : null;
    var end = c.end >= 0 ? toDate_(r[c.end]) : null;
    var startKey = start ? ymd_(start) : '';
    var endKey = end && startKey ? ymd_(end) : startKey;
    if (endKey < startKey) { var k = startKey; startKey = endKey; endKey = k; var d0 = start; start = end; end = d0; }
    var gain = c.type >= 0 && isGainType_(r[c.type]);
    var e = {
      row: i + 2,
      date: start,
      end: endKey !== startKey ? end : null,
      startKey: startKey,
      endKey: endKey,
      days: startKey ? dayCount_(startKey, endKey) : 1,
      gain: gain,
      category: category || 'Autre',
      campaign: c.campaign >= 0 ? String(r[c.campaign]).replace(/\s+/g, ' ').trim() : '',
      amount: amount,
      currency: usd ? 'USD' : 'DA',
      rate: usd ? (rate || settings.TAUX_DOLLAR) : null,
      rateMissing: usd && !rate,
      amountDA: usd ? amount * (rate || settings.TAUX_DOLLAR) : amount,
      note: c.note >= 0 ? String(r[c.note]).trim() : '',
      ad: !gain && isAdCategory_(category),
      platform: gain ? '' : adPlatform_(category)
    };
    e.sig = expenseSig_(e);
    out.push(e);
  });
  return out;
}

/** Écrit le taux du jour sur les dépenses en dollars qui n'en ont pas encore. */
function fillExpenseRates_(settings) {
  var info = expensesSheetInfo_();
  if (!info || info.sh.getLastRow() < 2 || info.c.rate < 0 || info.c.currency < 0 || !settings.TAUX_DOLLAR) return 0;
  var n = info.sh.getLastRow() - 1;
  var cur = info.sh.getRange(2, info.c.currency + 1, n, 1).getValues();
  var rates = info.sh.getRange(2, info.c.rate + 1, n, 1).getValues();
  var amounts = info.sh.getRange(2, info.c.amount + 1, n, 1).getValues();
  var filled = 0;
  rates.forEach(function (r, i) {
    if (isUsd_(cur[i][0]) && toNumber_(amounts[i][0]) && (isBlank_(r[0]) || !(toNumber_(r[0]) > 0))) { r[0] = settings.TAUX_DOLLAR; filled++; }
  });
  if (filled) info.sh.getRange(2, info.c.rate + 1, n, 1).setValues(rates);
  return filled;
}

/** Bénéfice d'une commande (null si elle n'est ni livrée ni retournée). */
function orderProfit_(o, env, catalog) {
  var s = env.settings;
  var res = { profit: null, revenue: 0, sales: 0, clientShipping: 0, fee: 0, deliveryNet: 0, cost: 0, returnFee: 0, packaging: 0,
    missingCost: false, missingFee: false, items: [] };
  var items = orderItems_(o);
  if (o.status === STATUS.DELIVERED) {
    var cost = 0;
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      var c = row && row.cost !== null ? row.cost * it.qty : null;
      if (c === null) res.missingCost = true; else cost += c;
      res.items.push({ label: row ? row.product + (row.model ? ' — ' + row.model : '') : it.label, qty: it.qty, cost: c });
    });
    if (!items.length) res.missingCost = true;
    res.revenue = toNumber_(o.total);
    // Livraison payée par le client : la colonne Frais livraison (sinon total − prix des produits).
    res.clientShipping = isBlank_(o.shipping) ? Math.max(res.revenue - toNumber_(o.price), 0) : toNumber_(o.shipping);
    res.sales = res.revenue - res.clientShipping;
    var fee = shippingFee_(env, o.wilaya, o.carrier || s.SOCIETE_PAR_DEFAUT, o.mode);
    if (fee === null) { fee = res.clientShipping; res.missingFee = true; }
    res.fee = fee;
    res.deliveryNet = fee - res.clientShipping;
    res.cost = cost;
    res.packaging = s.COUT_EMBALLAGE;
    res.profit = res.sales - res.deliveryNet - cost - res.packaging;
  } else if (o.status === STATUS.RETURNED) {
    res.returnFee = s.FRAIS_RETOUR;
    res.packaging = s.COUT_EMBALLAGE;
    res.profit = -(res.returnFee + res.packaging);
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      res.items.push({ label: row ? row.product + (row.model ? ' — ' + row.model : '') : it.label, qty: it.qty, cost: 0 });
    });
  }
  return res;
}

function emptyGroup_(name) {
  return { name: name, orders: 0, confirmed: 0, delivered: 0, returned: 0, inTransit: 0, cancelled: 0, revenue: 0, sales: 0, deliveryNet: 0, profit: 0, spend: 0 };
}

function addToGroup_(g, o, p, share) {
  g.orders++;
  if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) g.confirmed++;
  if (o.status === STATUS.DELIVERED) g.delivered++;
  if (o.status === STATUS.RETURNED) g.returned++;
  if (o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) g.inTransit++;
  if (o.status === STATUS.CANCELLED) g.cancelled++;
  if (p.profit !== null) {
    g.revenue += p.revenue * share;
    g.sales += p.sales * share;
    g.deliveryNet += p.deliveryNet * share;
    g.profit += p.profit * share;
  }
}

function finishGroup_(g) {
  g.revenue = Math.round(g.revenue);
  g.sales = Math.round(g.sales);
  g.deliveryNet = Math.round(g.deliveryNet);
  g.profit = Math.round(g.profit);
  g.spend = Math.round(g.spend);
  g.net = g.profit - g.spend;
  g.deliveryRate = g.delivered + g.returned ? g.delivered / (g.delivered + g.returned) : null;
  g.costPerOrder = g.spend && g.orders ? Math.round(g.spend / g.orders) : null;
  g.costPerDelivered = g.spend && g.delivered ? Math.round(g.spend / g.delivered) : null;
  g.profitPerDelivered = g.delivered ? Math.round(g.profit / g.delivered) : null;
  // ROAS : encaissé ÷ publicité (3 = 3 DA encaissés pour 1 DA de publicité).
  g.roas = g.spend ? Math.round(g.revenue / g.spend * 100) / 100 : null;
  return g;
}

/** Découpage du graphique : par jour (≤ 62 jours), par semaine (≤ 1 an) ou par mois. */
function profitBuckets_(from, to) {
  var len = dayCount_(from, to);
  var unit = len <= 62 ? 'day' : len <= 366 ? 'week' : 'month';
  var out = [];
  var a = from;
  while (a <= to) {
    var b;
    if (unit === 'day') b = a;
    else if (unit === 'week') b = addDayDays_(a, 6);
    else {
      var next = (Number(a.slice(5, 7)) === 12 ? (Number(a.slice(0, 4)) + 1) + '-01' : a.slice(0, 5) + ('0' + (Number(a.slice(5, 7)) + 1)).slice(-2)) + '-01';
      b = addDayDays_(next, -1);
    }
    if (b > to) b = to;
    out.push({ from: a, to: b, revenue: 0, profit: 0, expenses: 0, gains: 0, net: 0 });
    a = addDayDays_(b, 1);
  }
  return { unit: unit, list: out };
}

/** Totaux d'une liste de commandes (et des dépenses de la période). */
function profitTotals_(orders, env, catalog, expenses, from, to, detail) {
  var t = { orders: 0, confirmed: 0, delivered: 0, returned: 0, inTransit: 0, cancelled: 0, revenue: 0, productSales: 0, clientShipping: 0,
    deliveryFees: 0, deliveryNet: 0, productCost: 0, returnFees: 0, packaging: 0, ordersProfit: 0, expenses: 0, adSpend: 0, gains: 0,
    deliveredProfit: 0, returnLoss: 0 };
  var warn = { missingCost: 0, missingFee: 0, missingCostLabels: {} };
  var products = {};
  var campaigns = {};
  var platforms = {};
  var group = function (map, key, name) { return map[key] || (map[key] = emptyGroup_(name)); };
  var perOrder = [];

  orders.forEach(function (o) {
    var p = orderProfit_(o, env, catalog);
    t.orders++;
    if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) t.confirmed++;
    if (o.status === STATUS.DELIVERED) t.delivered++;
    if (o.status === STATUS.RETURNED) t.returned++;
    if (o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) t.inTransit++;
    if (o.status === STATUS.CANCELLED) t.cancelled++;
    if (p.profit !== null) {
      t.revenue += p.revenue;
      t.productSales += p.sales;
      t.clientShipping += p.clientShipping;
      t.deliveryFees += p.fee;
      t.deliveryNet += p.deliveryNet;
      t.productCost += p.cost;
      t.returnFees += p.returnFee;
      t.packaging += p.packaging;
      t.ordersProfit += p.profit;
      if (o.status === STATUS.DELIVERED) t.deliveredProfit += p.profit; else t.returnLoss -= p.profit;
      if (p.missingCost) {
        warn.missingCost++;
        p.items.forEach(function (it) { if (it.cost === null) warn.missingCostLabels[it.label] = true; });
      }
      if (p.missingFee) warn.missingFee++;
      if (detail) perOrder.push({ key: ymd_(toDate_(o.date)), revenue: p.revenue, profit: p.profit });
    }
    if (!detail) return;
    // Par produit : une commande à plusieurs articles est partagée selon les quantités.
    var items = orderItems_(o);
    var totalQty = items.reduce(function (a, it) { return a + it.qty; }, 0) || 1;
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      var name = row ? row.product + (row.model ? ' — ' + row.model : '') : it.label;
      addToGroup_(group(products, row ? row.key : normalizeLoose_(it.label), name), o, p, it.qty / totalQty);
    });
    var campaign = String(o.campaign || '').trim();
    addToGroup_(group(campaigns, normalizeLoose_(campaign) || '-', campaign || '(sans campagne)'), o, p, 1);
    var platform = adPlatform_(o.adSource) || (String(o.adSource || '').trim() ? String(o.adSource).trim() : 'Sans publicité suivie');
    addToGroup_(group(platforms, normalizeLoose_(platform), platform), o, p, 1);
  });

  var byCategory = {};
  var gainsByCategory = {};
  var unassigned = 0;
  expenses.forEach(function (e) {
    var part = expenseShare_(e, from, to);
    if (!part) return;
    if (e.gain) {
      t.gains += part;
      gainsByCategory[e.category] = (gainsByCategory[e.category] || 0) + part;
      return;
    }
    t.expenses += part;
    byCategory[e.category] = (byCategory[e.category] || 0) + part;
    if (!e.ad) return;
    t.adSpend += part;
    if (!detail) return;
    var ck = normalizeLoose_(e.campaign);
    if (ck) group(campaigns, ck, e.campaign).spend += part;
    else unassigned += part;
    if (e.platform) group(platforms, normalizeLoose_(e.platform), e.platform).spend += part;
  });
  Object.keys(t).forEach(function (k) { t[k] = Math.round(t[k]); });
  t.net = t.ordersProfit - t.expenses + t.gains;
  t.deliveryRate = t.delivered + t.returned ? t.delivered / (t.delivered + t.returned) : null;
  t.costPerDelivered = t.adSpend && t.delivered ? Math.round(t.adSpend / t.delivered) : null;
  t.profitPerDelivered = t.delivered ? Math.round(t.ordersProfit / t.delivered) : null;
  t.roas = t.adSpend ? Math.round(t.revenue / t.adSpend * 100) / 100 : null;
  var sorted = function (map) {
    return Object.keys(map).map(function (k) { return { category: k, amount: Math.round(map[k]) }; }).sort(function (a, b) { return b.amount - a.amount; });
  };
  return { t: t, warn: warn, products: products, campaigns: campaigns, platforms: platforms, byCategory: sorted(byCategory), gainsByCategory: sorted(gainsByCategory), unassigned: unassigned, perOrder: perOrder };
}

/**
 * Tout ce que montre la page Bénéfices pour une période (voir periodRange_) :
 * totaux, comparaison avec la période d'avant, bénéfice par jour (ou semaine, ou mois),
 * seuil de rentabilité, données du simulateur, produits, publicité, dépenses et gains.
 */
function profitData_(ctx, env, range) {
  var catalog = readCatalog_();
  var orders = ctx.orders.filter(function (o) { return inDayRange_(o.date, range.from, range.to); });
  if (range.all) orders = orders.concat(readArchivedOrders_());
  var expenses = readExpenses_(env.settings);
  var cur = profitTotals_(orders, env, catalog, expenses, range.from, range.to, true);
  var t = cur.t;

  // Période d'avant, de même durée (pas pour « Tout »).
  var prev = null;
  if (!range.all) {
    var before = ctx.orders.filter(function (o) { return inDayRange_(o.date, range.prevFrom, range.prevTo); });
    prev = profitTotals_(before, env, catalog, expenses, range.prevFrom, range.prevTo, false).t;
  }

  // Bénéfice par jour (ou semaine, ou mois) : commandes à leur date, dépenses et gains répartis par jour.
  var first = range.from;
  if (!first) {
    first = range.to;
    cur.perOrder.forEach(function (x) { if (x.key && x.key < first) first = x.key; });
    expenses.forEach(function (e) { if (e.startKey && e.startKey < first) first = e.startKey; });
  }
  var buckets = profitBuckets_(first, range.to);
  var findBucket = function (key) {
    for (var i = 0; i < buckets.list.length; i++) if (key >= buckets.list[i].from && key <= buckets.list[i].to) return buckets.list[i];
    return null;
  };
  cur.perOrder.forEach(function (x) {
    var b = x.key ? findBucket(x.key) : null;
    if (b) { b.revenue += x.revenue; b.profit += x.profit; }
  });
  buckets.list.forEach(function (b) {
    expenses.forEach(function (e) {
      var part = expenseShare_(e, b.from, b.to);
      if (e.gain) b.gains += part; else b.expenses += part;
    });
    ['revenue', 'profit', 'expenses', 'gains'].forEach(function (k) { b[k] = Math.round(b[k]); });
    b.net = b.profit - b.expenses + b.gains;
  });
  var days = dayCount_(first, range.to);

  // Seuil de rentabilité : livrées par jour pour couvrir les dépenses (moins les gains).
  var needPerDay = Math.max(t.expenses - t.gains, 0) / Math.max(days, 1);
  var margin = t.delivered ? t.ordersProfit / t.delivered : null;
  var breakEven = {
    days: days,
    needPerDay: Math.round(needPerDay),
    margin: margin === null ? null : Math.round(margin),
    perDayNeeded: margin && margin > 0 ? Math.round(needPerDay / margin * 100) / 100 : null,
    perDayNow: Math.round(t.delivered / Math.max(days, 1) * 100) / 100,
    ok: t.net >= 0
  };

  // Simulateur du taux de livraison.
  var sim = {
    finished: t.delivered + t.returned,
    rate: t.deliveryRate,
    avgDelivered: t.delivered ? Math.round(t.deliveredProfit / t.delivered) : null,
    avgReturnLoss: t.returned ? Math.round(t.returnLoss / t.returned) : Math.round(env.settings.FRAIS_RETOUR + env.settings.COUT_EMBALLAGE)
  };

  var list = function (map) {
    return Object.keys(map).map(function (k) { return finishGroup_(map[k]); })
      .sort(function (a, b) { return (b.orders - a.orders) || (b.spend - a.spend); });
  };
  var known = {};
  ctx.orders.forEach(function (o) { var c = String(o.campaign || '').trim(); if (c) known[c] = true; });
  expenses.forEach(function (e) { if (e.campaign) known[e.campaign] = true; });
  var shown = expenses.filter(function (e) { return range.all || expenseShare_(e, range.from, range.to); });
  return {
    period: range.period || '30',
    range: { from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo, days: days, all: !!range.all, unit: buckets.unit },
    totals: t,
    prev: prev,
    series: buckets.list,
    breakEven: breakEven,
    sim: sim,
    expensesByCategory: cur.byCategory,
    gainsByCategory: cur.gainsByCategory,
    adUnassigned: Math.round(cur.unassigned),
    products: list(cur.products),
    campaigns: list(cur.campaigns),
    platforms: list(cur.platforms),
    expenses: shown.sort(function (a, b) { return String(b.startKey).localeCompare(String(a.startKey)) || b.row - a.row; })
      .slice(0, 300).map(function (e) {
        return { id: String(e.row), sig: e.sig, date: e.startKey, end: e.endKey !== e.startKey ? e.endKey : '', days: e.days, gain: e.gain,
          category: e.category, campaign: e.campaign, amount: e.amount, currency: e.currency, rate: e.rate,
          amountDA: Math.round(e.amountDA), inPeriod: Math.round(range.all ? e.amountDA : expenseShare_(e, range.from, range.to)), note: e.note, ad: e.ad };
      }),
    warnings: { missingCost: cur.warn.missingCost, missingFee: cur.warn.missingFee, missingCostLabels: Object.keys(cur.warn.missingCostLabels).slice(0, 20) },
    categories: env.settings.categories,
    gainCategories: env.settings.gainCategories,
    knownCampaigns: Object.keys(known).sort(),
    rate: env.settings.TAUX_DOLLAR,
    returnFee: env.settings.FRAIS_RETOUR
  };
}

/** Page Bénéfices (administrateur). */
/** Bénéfices : mesurée (Administration › État de l'outil). */
function api_profit() {
  var a = arguments;
  return timed_('Bénéfices', function () { return profitApi_.apply(null, a); });
}

/** period : today, yesterday, 7, 30, month, lastmonth, all ; ou from / to (aaaa-mm-jj) pour une période libre. */
function profitApi_(period, from, to) {
  requireAdmin_();
  var settings = getSettings_();
  if (expensesNeedRate_(settings)) withLock_(function () { fillExpenseRates_(settings); });
  var ctx = readOrders_();
  var range = periodRange_(String(period || '30'), from, to);
  range.period = from && to ? 'custom' : String(period || '30');
  return profitData_(ctx, makeEnv_(ctx), range);
}

function expensesNeedRate_(settings) {
  return readExpenses_(settings).some(function (e) { return e.rateMissing; });
}

/** Valeurs d'une dépense (ou d'un gain) saisie dans l'application, vérifiées. */
function expenseValues_(input, settings) {
  input = input || {};
  var amount = toNumber_(input.amount);
  if (!(amount > 0)) throw new Error('Indiquez un montant.');
  var usd = isUsd_(input.currency);
  var rate = usd ? (toNumber_(input.rate) > 0 ? toNumber_(input.rate) : settings.TAUX_DOLLAR) : '';
  if (usd && !(rate > 0)) throw new Error('Indiquez le taux du dollar (réglage TAUX_DOLLAR dans Paramètres).');
  var date = toDate_(input.date) || new Date();
  var end = toDate_(input.end);
  if (end && ymd_(end) < ymd_(date)) throw new Error('La date de fin est avant la date de début.');
  if (end && dayCount_(ymd_(date), ymd_(end)) > 366) throw new Error('Une dépense ne peut pas s’étaler sur plus d’un an.');
  var gain = isGainType_(input.type);
  return {
    date: date,
    end: end && ymd_(end) !== ymd_(date) ? end : '',
    type: gain ? 'Gain' : 'Dépense',
    category: String(input.category || '').trim() || 'Autre',
    campaign: gain ? '' : String(input.campaign || '').replace(/\s+/g, ' ').trim(),
    amount: amount,
    currency: usd ? 'USD' : 'DA',
    rate: rate,
    note: String(input.note || '').trim()
  };
}

function expenseText_(v) {
  var days = v.end ? dayCount_(ymd_(v.date), ymd_(v.end)) : 1;
  return v.type + ' · ' + v.category + (v.campaign ? ' · ' + v.campaign : '') + ' · ' + v.amount + ' ' + v.currency +
    (days > 1 ? ' · du ' + Utilities.formatDate(v.date, 'Africa/Algiers', 'dd/MM') + ' au ' + Utilities.formatDate(v.end, 'Africa/Algiers', 'dd/MM') + ' (' + days + ' j)' : '');
}

function writeExpenseRow_(info, r, values) {
  var c = info.c;
  var cur = info.sh.getRange(r, 1, 1, info.header.length).getValues()[0];
  Object.keys(c).forEach(function (k) { if (c[k] >= 0 && values[k] !== undefined) cur[c[k]] = values[k]; });
  info.sh.getRange(r, 1, 1, cur.length).setValues([cur]);
}

/** Ajoute une dépense ou un gain depuis l'application (le taux du jour est écrit pour une dépense en dollars). */
function api_addExpense(input) {
  var user = requireAdmin_();
  var v = expenseValues_(input, getSettings_());
  return withLock_(function () {
    var sh = ss_().getSheetByName(SHEET.EXPENSES) || setupExpensesSheet_(ss_());
    ensureHeaders_(sh, EXPENSE_TITLES_);
    var info = expensesSheetInfo_();
    var r = sh.getLastRow() + 1;
    ensureRows_(sh, r);
    var row = info.header.map(function () { return ''; });
    Object.keys(info.c).forEach(function (k) { if (info.c[k] >= 0 && v[k] !== undefined) row[info.c[k]] = v[k]; });
    sh.getRange(r, 1, 1, row.length).setValues([row]);
    log_(user, '', v.type === 'Gain' ? 'Gain' : 'Dépense', expenseText_(v));
    var da = fmtAmount_(v.currency === 'USD' ? v.amount * v.rate : v.amount);
    return { message: (v.type === 'Gain' ? 'Gain ajouté : ' : 'Dépense ajoutée : ') + da + ' DA' + (v.end ? ', réparti sur ' + dayCount_(ymd_(v.date), ymd_(v.end)) + ' jours' : '') + '.' };
  });
}

/** Retrouve une ligne de l'onglet Dépenses et vérifie qu'elle n'a pas changé (empreinte). */
function expenseAt_(row, sig, settings) {
  var r = Math.round(toNumber_(row));
  var list = readExpenses_(settings);
  for (var i = 0; i < list.length; i++) {
    if (list[i].row !== r) continue;
    if (sig && list[i].sig !== String(sig)) throw new Error('Cette ligne a changé dans le classeur entre-temps : rechargez la page.');
    return list[i];
  }
  throw new Error('Dépense introuvable (ligne ' + r + ') : rechargez la page.');
}

/** Corrige une dépense ou un gain (toutes les valeurs du formulaire). */
function api_updateExpense(row, sig, input) {
  var user = requireAdmin_();
  var settings = getSettings_();
  var v = expenseValues_(input, settings);
  return withLock_(function () {
    var e = expenseAt_(row, sig, settings);
    var sh = ss_().getSheetByName(SHEET.EXPENSES);
    ensureHeaders_(sh, EXPENSE_TITLES_);
    // Un taux déjà écrit est gardé si la devise ne change pas et qu'aucun taux n'est donné.
    if (v.currency === 'USD' && e.currency === 'USD' && !(toNumber_(input && input.rate) > 0) && e.rate) v.rate = e.rate;
    writeExpenseRow_(expensesSheetInfo_(), e.row, v);
    log_(user, '', 'Dépense corrigée', 'Ligne ' + e.row + ' : ' + expenseText_(v));
    return { message: (v.type === 'Gain' ? 'Gain' : 'Dépense') + ' corrigé' + (v.type === 'Gain' ? '' : 'e') + '.' };
  });
}

/** Supprime des dépenses ou des gains : items = [{ id: n° de ligne, sig }]. */
function api_deleteExpenses(items) {
  var user = requireAdmin_();
  var list = (Array.isArray(items) ? items : [items]).filter(function (x) { return x && x.id; });
  if (!list.length) throw new Error('Cochez au moins une dépense.');
  var settings = getSettings_();
  return withLock_(function () {
    var found = list.map(function (x) { return expenseAt_(x.id, x.sig, settings); });
    var info = expensesSheetInfo_();
    deleteSheetRows_(info.sh, found.map(function (e) { return e.row; }));
    found.forEach(function (e) {
      log_(user, '', 'Dépense supprimée', (e.gain ? 'Gain' : 'Dépense') + ' · ' + e.category + (e.campaign ? ' · ' + e.campaign : '') + ' · ' + e.amount + ' ' + e.currency + ' · ' + (e.startKey || 'sans date'));
    });
    return { deleted: found.length, message: plural_(found.length, 'ligne supprimée', 'lignes supprimées') + '.' };
  });
}

/* ---- Sms.gs ---- */
/**
 * Sms.gs : SMS automatiques selon le statut de la commande, envoyés par votre
 * téléphone Android avec l'application httpSMS (https://httpsms.com).
 *
 *  - Un texte par statut dans Paramètres (SMS_A_CONFIRMER, SMS_CONFIRMEE…) ;
 *    texte vide = pas de SMS pour ce statut.
 *  - Quand le statut d'une commande change (centre de confirmation, Ecotrack,
 *    modification, nouvelle commande), le SMS est mis en file d'attente ; il part
 *    dans la minute qui suit, en arrière-plan (l'application reste rapide).
 *  - Une seule fois par statut et par commande (colonne « SMS envoyés »).
 *  - Heures d'envoi : SMS_HEURES (0-24 par défaut : à toute heure ; par exemple 8-21 pour
 *    que les SMS de la nuit attendent le matin).
 *  - Le SMS « commande reçue » part dans le même passage que le transfert depuis RELEASIT
 *    (30 secondes en moyenne après la commande), sans attendre la minute suivante.
 *  - Pas de SMS aux numéros invalides ni à la liste noire, ni pour un statut déjà
 *    dépassé, ni pour une vieille commande (au premier transfert depuis RELEASIT).
 *
 * La clé API (page Settings de httpsms.com) et le numéro de la carte SIM sont
 * gardés dans les propriétés du script (menu DZ Smart Shop › SMS), jamais dans le classeur.
 */

var SMS = {
  URL: 'https://api.httpsms.com/v1/messages/send',
  PROP_KEY: 'SMS_API_KEY',
  PROP_FROM: 'SMS_FROM',
  PROP_QUEUE: 'SMS_QUEUE',
  PROP_LAST_RUN: 'SMS_LAST_RUN',
  PROP_LAST_ERROR: 'SMS_LAST_ERROR',
  MAX_PER_RUN: 25,
  QUEUE_MAX: 180,                 // une propriété du script contient au plus 9 Ko
  MAX_AGE_MS: 18 * 3600000,       // un statut vieux de plus de 18 h n'est plus annoncé
  NEW_ORDER_MAX_AGE_MS: 24 * 3600000,
  MAX_TRIES: 5
};

var SMS_NOT_CONFIGURED_ = 'Les SMS ne sont pas configurés. Menu « DZ Smart Shop › SMS (httpSMS) › Enregistrer la clé et le numéro ».';

/** Statuts changés pendant cette exécution : mis en file à la fin du verrou (voir withLock_). */
var SMS_PENDING_ = [];

/**
 * SMS liés au suivi d'un colis, et non à un statut : code dans la file (100 et plus),
 * réglage du texte, et nom noté dans la colonne « SMS envoyés » (une fois par commande).
 */
var SMS_EVENTS_ = {
  courier: { code: 100, key: 'SMS_LIVREUR_INJOIGNABLE', name: 'Livreur : injoignable' },
  noanswer: { code: 101, key: 'SMS_SANS_REPONSE_LIVRAISON', name: 'Sans réponse (livraison)' }
};

function smsEventByCode_(code) {
  var keys = Object.keys(SMS_EVENTS_);
  for (var i = 0; i < keys.length; i++) if (SMS_EVENTS_[keys[i]].code === code) return SMS_EVENTS_[keys[i]];
  return null;
}

/** Demande un SMS de suivi (« courier » ou « noanswer ») ; il part à la fin du verrou. */
function noteSmsEvent_(order, event) {
  if (SMS_EVENTS_[event]) SMS_PENDING_.push({ id: String(order.id), event: event });
}

function smsConfig_() {
  var p = PropertiesService.getScriptProperties();
  var key = String(p.getProperty(SMS.PROP_KEY) || '').trim();
  var from = String(p.getProperty(SMS.PROP_FROM) || '').trim();
  return { key: key, from: from, configured: !!(key && from) };
}

/** 0550123456 → +213550123456, ou '' si le numéro n'est pas un mobile algérien. */
function smsNumber_(raw) {
  var p = normalizePhone(raw);
  return p.valid && /^0[567]/.test(p.phone) ? '+213' + p.phone.slice(1) : '';
}

function saveSmsConfig_(rawKey, rawFrom) {
  var key = String(rawKey == null ? '' : rawKey).replace(/\s+/g, '');
  if (key.length < 10) throw new Error('Clé API trop courte : copiez la clé de la page Settings de httpsms.com (pas la « Phone API key »).');
  var from = smsNumber_(rawFrom);
  if (!from) throw new Error('Numéro de la carte SIM invalide. Exemple : 0550 12 34 56');
  var p = PropertiesService.getScriptProperties();
  p.setProperty(SMS.PROP_KEY, key);
  p.setProperty(SMS.PROP_FROM, from);
  p.deleteProperty(SMS.PROP_LAST_ERROR);
  return { from: from };
}

function smsSettingKey_(status) {
  return 'SMS_' + normalizeText_(status).toUpperCase().replace(/ /g, '_');
}

function smsTemplate_(settings, status) {
  return String(settings[smsSettingKey_(status)] || '').trim();
}

/** Texte du SMS : les champs {prenom}, {numero}, {total}… sont remplacés. */
function fillSmsTemplate_(template, o, settings) {
  var client = String(o.client || '').trim();
  var values = {
    prenom: client.split(/\s+/)[0] || '',
    client: client,
    numero: String(o.id || ''),
    produit: String(o.product || ''),
    total: String(Math.round(toNumber_(o.total))),
    suivi: String(o.tracking || ''),
    commune: String(o.commune || ''),
    wilaya: String(o.wilaya || '').replace(/^\d+\s*-\s*/, ''),
    boutique: String(settings.NOM_BOUTIQUE || '')
  };
  return String(template).replace(/\{(\w+)\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : m;
  }).replace(/\s+/g, ' ').trim();
}

function readSmsQueue_(p) {
  try {
    var q = JSON.parse(p.getProperty(SMS.PROP_QUEUE) || '[]');
    return Array.isArray(q) ? q : [];
  } catch (e) {
    return [];
  }
}

function writeSmsQueue_(p, q) {
  if (q.length > SMS.QUEUE_MAX) q = q.slice(q.length - SMS.QUEUE_MAX);
  if (q.length) p.setProperty(SMS.PROP_QUEUE, JSON.stringify(q));
  else if (p.getProperty(SMS.PROP_QUEUE) !== null) p.deleteProperty(SMS.PROP_QUEUE);
}

/** Note un changement de statut (appelé par writeFields_). */
function noteStatusChange_(order, status) {
  if (status) SMS_PENDING_.push({ id: String(order.id), status: String(status) });
}

/** Met en file les SMS des statuts changés (à la fin du verrou). Ne fait jamais échouer l'action. */
function flushSmsPending_() {
  var pending = SMS_PENDING_;
  SMS_PENDING_ = [];
  if (!pending.length) return 0;
  try {
    if (!smsConfig_().configured) return 0;
    var settings = getSettings_();
    var list = pending.filter(function (e) {
      return e.event ? String(settings[SMS_EVENTS_[e.event].key] || '').trim() : smsTemplate_(settings, e.status);
    });
    if (!list.length) return 0;
    var p = PropertiesService.getScriptProperties();
    var q = readSmsQueue_(p);
    var now = Math.round(Date.now() / 1000);
    list.forEach(function (e) {
      var s = e.event ? SMS_EVENTS_[e.event].code : STATUS_LIST.indexOf(e.status);
      q = q.filter(function (x) { return !(x.i === e.id && x.s === s); });
      q.push({ i: e.id, s: s, t: now, n: 0 });
    });
    writeSmsQueue_(p, q);
    return list.length;
  } catch (err) {
    return 0;
  }
}

function smsAlreadySent_(o, status) {
  return String(o.sms || '').split(',').map(function (x) { return x.trim(); }).indexOf(status) >= 0;
}

/** Envoi à httpSMS. Renvoie { ok, code, message }. */
function httpsmsSend_(cfg, to, content, requestId) {
  var resp;
  try {
    resp = UrlFetchApp.fetch(SMS.URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': cfg.key, Accept: 'application/json' },
      payload: JSON.stringify({ from: cfg.from, to: to, content: content, request_id: requestId || '' }),
      muteHttpExceptions: true,
      followRedirects: false
    });
  } catch (e) {
    return { ok: false, code: 0, message: 'httpSMS injoignable (' + (e && e.message ? e.message : e) + ').' };
  }
  var code = resp.getResponseCode();
  var json = null;
  try { json = JSON.parse(resp.getContentText() || 'null'); } catch (e) { json = null; }
  if (code >= 200 && code < 300) return { ok: true, code: code, message: '' };
  var detail = json ? (json.data && typeof json.data === 'object' ? flattenEcotrackErrors_(json.data) : '') || json.message || '' : '';
  var msg = code === 401 || code === 403
    ? 'httpSMS a refusé la clé API (erreur ' + code + '). Enregistrez la clé de la page Settings de httpsms.com : menu DZ Smart Shop › SMS (httpSMS).'
    : 'httpSMS a refusé le SMS (erreur ' + code + ')' + (detail ? ' : ' + detail : '.');
  return { ok: false, code: code, message: msg };
}

/** Heure d'Algérie (0 à 23). */
function algiersHour_(d) {
  return +Utilities.formatDate(d || new Date(), 'Africa/Algiers', 'H');
}

/** Envoie les SMS en attente. Renvoie un résumé. */
function sendSmsQueue_(options) {
  options = options || {};
  var summary = { configured: true, sent: 0, skipped: 0, failed: 0, waiting: 0, night: false };
  var cfg = smsConfig_();
  if (!cfg.configured) { summary.configured = false; return summary; }
  var p = PropertiesService.getScriptProperties();
  if (!readSmsQueue_(p).length) return summary;
  var settings = getSettings_();
  var hour = algiersHour_(new Date());
  if (!options.anyHour && (hour < settings.smsFrom || hour >= settings.smsTo)) {
    summary.night = true;
    summary.waiting = readSmsQueue_(p).length;
    return summary;
  }

  // 1. On prend un lot dans la file (sous verrou : rien n'est envoyé deux fois).
  var batch = withLock_(function () {
    var all = readSmsQueue_(p);
    writeSmsQueue_(p, all.slice(SMS.MAX_PER_RUN));
    return all.slice(0, SMS.MAX_PER_RUN);
  });

  // 2. Envoi (sans verrou : les confirmatrices ne l'attendent pas).
  var ctx = readOrders_();
  var blacklist = readBlacklist_();
  var now = Date.now();
  var done = [];
  var retry = [];
  var problems = [];
  var authError = '';
  for (var i = 0; i < batch.length; i++) {
    var e = batch[i];
    if (authError) { retry.push(e); continue; }
    var ev = e.s >= 100 ? smsEventByCode_(e.s) : null;
    var status = ev ? ev.name : STATUS_LIST[e.s];
    var o = status ? findOrder_(ctx, e.i) : null;
    var tpl = ev ? String(settings[ev.key] || '').trim() : status ? smsTemplate_(settings, status) : '';
    var to = o ? smsNumber_(o.phone) : '';
    var orderDate = o ? toDate_(o.date) : null;
    // Un SMS de suivi ne part que si le colis est encore en route ; un SMS de statut, que si le statut n'a pas changé.
    var current = !o ? false : ev ? (o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) : o.status === status;
    if (!o || !current || !tpl || smsAlreadySent_(o, status) || now - e.t * 1000 > SMS.MAX_AGE_MS ||
        (status === STATUS.TO_CONFIRM && orderDate && now - orderDate.getTime() > SMS.NEW_ORDER_MAX_AGE_MS)) {
      summary.skipped++;
      continue;
    }
    if (!to || blacklist[normalizePhone(o.phone).phone]) { summary.skipped++; continue; }
    var res = httpsmsSend_(cfg, to, fillSmsTemplate_(tpl, o, settings), String(o.id) + ':' + e.s);
    if (res.ok) {
      done.push({ id: String(o.id), status: status });
      summary.sent++;
    } else if (res.code === 401 || res.code === 403) {
      authError = res.message;
      retry.push(e);
    } else if (res.code === 0 || res.code === 429 || res.code >= 500) {
      e.n = (e.n || 0) + 1;
      if (e.n < SMS.MAX_TRIES) retry.push(e); else { summary.failed++; problems.push({ id: o.id, status: status, message: res.message }); }
    } else {
      summary.failed++;
      problems.push({ id: o.id, status: status, message: res.message });
    }
  }

  // 3. Commandes marquées, file remise à jour, Journal.
  withLock_(function () {
    if (done.length) {
      var ctx2 = readOrders_();
      done.forEach(function (d) {
        var o = findOrder_(ctx2, d.id);
        if (!o) return;
        var list = String(o.sms || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x; });
        if (list.indexOf(d.status) < 0) list.push(d.status);
        writeFields_(ctx2, o, { sms: list.join(', ') });
        log_({ name: 'SMS' }, d.id, 'SMS envoyé', d.status);
      });
    }
    problems.forEach(function (x) { log_({ name: 'SMS' }, x.id, 'SMS non envoyé', x.status + ' · ' + x.message); });
    if (retry.length) writeSmsQueue_(p, retry.concat(readSmsQueue_(p)));
  });
  p.setProperty(SMS.PROP_LAST_RUN, new Date().toISOString());
  if (authError) {
    smsRecordError_(authError);
  } else if (summary.sent && p.getProperty(SMS.PROP_LAST_ERROR) !== null) {
    p.deleteProperty(SMS.PROP_LAST_ERROR);
  }
  summary.waiting = readSmsQueue_(p).length;
  if (authError) summary.error = authError;
  return summary;
}

function smsRecordError_(msg) {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty(SMS.PROP_LAST_ERROR) !== msg) {
    p.setProperty(SMS.PROP_LAST_ERROR, msg);
    log_({ name: 'SMS' }, '', 'Erreur SMS', msg);
  }
}

/** Déclencheur automatique (chaque minute, seulement si les SMS sont configurés). */
function sendSmsQueue() {
  try {
    return sendSmsQueue_({});
  } catch (e) {
    smsRecordError_(String(e && e.message ? e.message : e));
    return null;
  }
}

/** État des SMS pour la page Commandes. */
function smsStatus_() {
  var cfg = smsConfig_();
  var p = PropertiesService.getScriptProperties();
  var settings = getSettings_();
  return {
    configured: cfg.configured,
    from: cfg.from ? '0' + cfg.from.replace(/^\+213/, '') : '',
    waiting: readSmsQueue_(p).length,
    lastRun: String(p.getProperty(SMS.PROP_LAST_RUN) || ''),
    lastError: String(p.getProperty(SMS.PROP_LAST_ERROR) || ''),
    hours: settings.smsFrom === 0 && settings.smsTo === 24 ? 'à toute heure' : settings.smsFrom + ' h – ' + settings.smsTo + ' h',
    statuses: STATUS_LIST.filter(function (s) { return smsTemplate_(settings, s); })
      .concat(Object.keys(SMS_EVENTS_).filter(function (k) { return String(settings[SMS_EVENTS_[k].key] || '').trim(); })
        .map(function (k) { return SMS_EVENTS_[k].name; }))
  };
}

function smsSendMessage_(s) {
  if (!s.configured) return SMS_NOT_CONFIGURED_;
  if (s.night) return 'Hors des heures d’envoi : ' + s.waiting + ' SMS partiront le matin.';
  return s.sent + ' SMS envoyé(s)' + (s.failed ? ', ' + s.failed + ' refusé(s) (voir le Journal)' : '') +
    (s.waiting ? ', ' + s.waiting + ' encore en attente' : '') + '.' + (s.error ? ' ' + s.error : '');
}

/** SMS de test vers le numéro de la carte SIM. */
function api_smsTest() {
  requireAdmin_();
  var cfg = smsConfig_();
  if (!cfg.configured) throw new Error(SMS_NOT_CONFIGURED_);
  var res = httpsmsSend_(cfg, cfg.from, 'رسالة تجربة من ' + getSettings_().NOM_BOUTIQUE + ' ✓', 'test');
  if (!res.ok) { if (res.code === 401 || res.code === 403) smsRecordError_(res.message); throw new Error(res.message); }
  return { message: 'SMS de test envoyé à votre téléphone : il part de la carte SIM et arrive sur le même numéro.' };
}

function api_smsSendNow() {
  requireAdmin_();
  var s = sendSmsQueue_({});
  return { summary: s, message: smsSendMessage_(s) };
}

function menuSmsSetup() {
  var ui = SpreadsheetApp.getUi();
  var first = ui.prompt('SMS (1/2)', 'Collez la clé API de votre compte httpSMS (page Settings de httpsms.com, pas la « Phone API key »). Elle est gardée dans les propriétés protégées du script, jamais dans le classeur :', ui.ButtonSet.OK_CANCEL);
  if (first.getSelectedButton() !== ui.Button.OK) return;
  var second = ui.prompt('SMS (2/2)', 'Numéro de la carte SIM qui enverra les SMS (téléphone avec l’application httpSMS), par exemple 0550 12 34 56 :', ui.ButtonSet.OK_CANCEL);
  if (second.getSelectedButton() !== ui.Button.OK) return;
  try {
    var r = saveSmsConfig_(first.getResponseText(), second.getResponseText());
    ui.alert('SMS', 'Enregistré : les SMS partiront du ' + r.from + ', dans la minute qui suit chaque changement de statut (' + smsStatus_().hours + ').\n\nLes textes se modifient dans l’onglet Paramètres (SMS_A_CONFIRMER, SMS_CONFIRMEE…). Texte vide = pas de SMS.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('SMS : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuSmsTest() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('SMS', api_smsTest().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('SMS : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

function menuSmsSend() {
  var ui = SpreadsheetApp.getUi();
  try {
    ui.alert('SMS', api_smsSendNow().message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('SMS : échec', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

/* ---- Calls.gs ---- */
/**
 * Calls.gs : les appels sans réponse.
 *
 *  - Jusqu'à APPELS_PAR_JOUR appels par jour (3), espacés de DELAI_RAPPEL_MINUTES (2 h).
 *  - Après le dernier appel du jour : rappel le lendemain à HEURE_DEBUT_APPELS (9 h).
 *  - Pendant JOURS_D_APPELS jours (3), comptés en jours de calendrier depuis l'arrivée
 *    de la commande. Ensuite, si ANNULATION_AUTO = OUI, la commande est annulée
 *    (motif « Injoignable (annulation automatique) ») ; sinon elle passe « Injoignable ».
 *  - Chaque nuit, les commandes sans réponse dont les jours d'appels sont passés sont
 *    annulées (même si tous les appels n'ont pas été faits).
 *  - Une commande « Rappeler » (le client a répondu) ou jamais appelée n'est jamais annulée
 *    automatiquement.
 */

var AUTO_CANCEL_REASON_ = 'Injoignable (annulation automatique)';
var CALL_LOG_MAX_ = 12; // appels gardés dans « Historique appels »

/**
 * Commande qu'on peut encore appeler depuis Confirmation : à confirmer, pas de réponse,
 * rappeler, injoignable (nouvel essai), ou sans statut.
 */
function isCallable_(o) {
  return isBlank_(o.status) || QUEUE_STATUSES.indexOf(o.status) >= 0 || o.status === STATUS.UNREACHABLE;
}

/** « Historique appels » : « 17/11 10:05 Pas de réponse · Sara | 17/11 14:30 … » → [{ when, text }]. */
function parseCallLog_(value) {
  return String(value == null ? '' : value).split('|').map(function (x) { return x.trim(); })
    .filter(function (x) { return x; })
    .map(function (raw) {
      var m = raw.match(/^(\d{2}\/\d{2} \d{2}:\d{2}) (.*)$/);
      return { raw: raw, when: m ? m[1] : '', text: m ? m[2] : raw };
    });
}

/** Ajoute un appel à l'historique (les CALL_LOG_MAX_ derniers sont gardés). */
function addCallLog_(o, now, text, user) {
  var entry = (Utilities.formatDate(now, 'Africa/Algiers', 'dd/MM HH:mm') + ' ' + text + (user && user.name ? ' · ' + user.name : '')).replace(/\|/g, '/');
  var list = parseCallLog_(o.callLog).map(function (x) { return x.raw; });
  list.push(entry);
  return list.slice(-CALL_LOG_MAX_).join(' | ');
}

/** Pourquoi une commande ni confirmée ni annulée n'est pas dans la file d'appels ('' si elle y est ou si elle est traitée). */
function waitingReason_(o) {
  if (QUEUE_STATUSES.indexOf(o.status) >= 0) return '';
  if (isBlank_(o.status)) return 'Sans statut : à appeler';
  if (o.status === STATUS.UNREACHABLE) {
    var n = toNumber_(o.attempts);
    return 'Injoignable' + (n ? ' : ' + n + ' appel' + (n > 1 ? 's' : '') + ' sans réponse' : '') + '. Vous pouvez réessayer ou annuler';
  }
  if (STATUS_LIST.indexOf(o.status) < 0) return 'Statut inconnu « ' + String(o.status).slice(0, 40) + ' » : ouvrez la fiche pour le corriger (ligne du classeur à vérifier)';
  return '';
}

/** « 2026-11-14 » en heure d'Algérie. */
function dayKey_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'yyyy-MM-dd');
}

/** Colonne « Appels du jour » : « 2026-11-14 : 2 » → { day: '2026-11-14', n: 2 }. */
function parseDayCalls_(value) {
  var m = String(value == null ? '' : value).match(/(\d{4}-\d{2}-\d{2})\D+(\d+)/);
  return m ? { day: m[1], n: +m[2] } : { day: '', n: 0 };
}

/** Jour d'appel : 1 le jour où la commande est arrivée, 2 le lendemain… */
function callDay_(o, now) {
  var start = startOfDay_(toDate_(o.date) || now);
  return Math.round((startOfDay_(now).getTime() - start.getTime()) / 86400000) + 1;
}

/** Demain à l'heure donnée. */
function tomorrowAt_(now, hour) {
  var d = startOfDay_(now);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Ce qui suit un appel sans réponse : statut, prochain rappel, ou annulation. */
function noAnswerFields_(o, env) {
  var s = env.settings;
  var now = env.now;
  var f = { attempts: toNumber_(o.attempts) + 1 };
  var today = dayKey_(now);
  var prev = parseDayCalls_(o.dayCalls);
  var n = prev.day === today ? prev.n + 1 : 1;
  f.dayCalls = today + ' : ' + n;
  var day = callDay_(o, now);
  var label = 'appel ' + n + '/' + s.APPELS_PAR_JOUR + ' du jour ' + Math.min(day, s.JOURS_D_APPELS) + '/' + s.JOURS_D_APPELS;
  var finished = day > s.JOURS_D_APPELS || (day >= s.JOURS_D_APPELS && n >= s.APPELS_PAR_JOUR);
  if (finished) {
    f.callback = '';
    if (s.ANNULATION_AUTO) {
      f.status = STATUS.CANCELLED;
      f.cancelReason = AUTO_CANCEL_REASON_;
      return { fields: f, detail: 'Pas de réponse (' + label + ') : ' + f.attempts + ' appels sans réponse, commande annulée automatiquement' };
    }
    f.status = STATUS.UNREACHABLE;
    return { fields: f, detail: 'Pas de réponse (' + label + ') : injoignable' };
  }
  f.status = STATUS.NO_ANSWER;
  if (n < s.APPELS_PAR_JOUR) {
    f.callback = new Date(now.getTime() + s.DELAI_RAPPEL_MINUTES * 60000);
    return { fields: f, detail: 'Pas de réponse (' + label + '), rappel dans ' + Math.round(s.DELAI_RAPPEL_MINUTES / 60 * 10) / 10 + ' h' };
  }
  f.callback = tomorrowAt_(now, s.HEURE_DEBUT_APPELS);
  return { fields: f, detail: 'Pas de réponse (' + label + '), rappel demain à ' + s.HEURE_DEBUT_APPELS + ' h' };
}

/**
 * Annule les commandes restées sans réponse après leurs jours d'appels
 * (lancé chaque nuit). Renvoie le nombre de commandes annulées.
 */
function autoCancelUnreachable_() {
  var settings = getSettings_();
  if (!settings.ANNULATION_AUTO) return 0;
  return withLock_(function () {
    var ctx = readOrders_();
    var now = new Date();
    var actor = { name: 'Automatique' };
    var n = 0;
    ctx.orders.forEach(function (o) {
      if (o.status !== STATUS.NO_ANSWER && o.status !== STATUS.UNREACHABLE) return;
      if (!(toNumber_(o.attempts) > 0) || callDay_(o, now) <= settings.JOURS_D_APPELS) return;
      writeFields_(ctx, o, { status: STATUS.CANCELLED, cancelReason: AUTO_CANCEL_REASON_, callback: '', updated: now });
      log_(actor, o.id, 'Annulation automatique', toNumber_(o.attempts) + ' appels sans réponse en ' + settings.JOURS_D_APPELS + ' jours');
      n++;
    });
    return n;
  });
}

/* ---- Cloud.gs ---- */
/**
 * Cloud.gs : lien avec la version Cloudflare de l'application (plus rapide).
 *
 * Étape 1 (essai) : la version Cloudflare travaille sur une COPIE des données ; cette application
 * Google reste la vraie. On peut recopier les données à tout moment.
 *
 *  - Administration › Connexions › Cloudflare : l'adresse de l'application Cloudflare, puis
 *    « Relier et copier les données ». Une clé partagée est créée ici et enregistrée là-bas au
 *    premier contact ; elle n'est jamais affichée.
 *  - Connexion : l'application Cloudflare renvoie vers le lien de CETTE application avec « ?cf=1 ».
 *    Google sait qui vous êtes ; un jeton signé avec la clé (valable 30 jours) vous renvoie
 *    vers Cloudflare. Seuls les membres de l'onglet Équipe (et le propriétaire) y entrent.
 */

var CLOUD = {
  PROP_URL: 'CF_URL',
  PROP_SECRET: 'CF_SECRET',
  PROP_LAST: 'CF_LAST_COPY',
  CHUNK: 250,
  TOKEN_DAYS: 30
};

function cloudConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    url: String(p.getProperty(CLOUD.PROP_URL) || '').replace(/\/+$/, ''),
    secret: String(p.getProperty(CLOUD.PROP_SECRET) || ''),
    last: String(p.getProperty(CLOUD.PROP_LAST) || '')
  };
}

/** Appel à l'application Cloudflare (pont), avec la clé partagée. */
function cloudFetch_(path, payload) {
  var cfg = cloudConfig_();
  if (!cfg.url) throw new Error('Adresse de l’application Cloudflare non enregistrée.');
  var res = UrlFetchApp.fetch(cfg.url + path, {
    method: payload ? 'post' : 'get',
    contentType: 'application/json',
    payload: payload ? JSON.stringify(payload) : undefined,
    headers: { 'X-DZ-Key': cfg.secret },
    muteHttpExceptions: true,
    followRedirects: false
  });
  var code = res.getResponseCode();
  var body = null;
  try { body = JSON.parse(res.getContentText()); } catch (e) { body = null; }
  if (code >= 300 || !body || !body.ok) {
    throw new Error('Cloudflare : ' + (body && body.error ? body.error : 'réponse inattendue (erreur ' + code + '). Vérifiez l’adresse.'));
  }
  return body.data;
}

/** Une commande « à plat » : les champs des colonnes, les dates en texte. */
function plainOrder_(o) {
  var out = {};
  ORDER_COLUMNS.forEach(function (c) {
    var v = o[c.key];
    out[c.key] = v instanceof Date ? (isNaN(v.getTime()) ? '' : v.toISOString()) : (v === undefined || v === null ? '' : v);
  });
  return out;
}

/** Tout ce qui est copié : réglages (tels que l'outil les calcule), commandes, archive, corbeille. */
function cloudSnapshot_() {
  var wilayas = getWilayaList_();
  var config = {
    'cfg:settings': JSON.stringify(getSettings_()),
    'cfg:wilayas': JSON.stringify(wilayas),
    'cfg:rates': JSON.stringify(readRates_(wilayas)),
    'cfg:team': JSON.stringify(readTeam_()),
    'cfg:clients': JSON.stringify(readClients_()),
    'cfg:products': JSON.stringify(readCatalog_())
  };
  var trash = [];
  var t = readTrash_();
  if (t) {
    var extra = {};
    t.values[0].forEach(function (title, i) { extra[normalizeText_(title)] = i; });
    var cell = function (row, title) { var i = extra[normalizeText_(title)]; return i === undefined ? '' : row[i]; };
    for (var r = 1; r < t.values.length; r++) {
      var o = {};
      ORDER_COLUMNS.forEach(function (c) { o[c.key] = t.map[c.key] === undefined ? '' : t.values[r][t.map[c.key]]; });
      if (!String(o.id).trim()) continue;
      trash.push({
        order: plainOrder_(o), deletedAt: iso_(cell(t.values[r], TRASH.EXTRA[0])),
        deletedBy: String(cell(t.values[r], TRASH.EXTRA[1])), reason: String(cell(t.values[r], TRASH.EXTRA[2]))
      });
    }
  }
  var blocked = [];
  var sh = ss_().getSheetByName(TRASH.BLOCKED);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (row) { var id = String(row[0]).trim(); if (id) blocked.push(id); });
  }
  var owner = String(PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL') || '');
  return {
    config: config,
    kv: owner ? { OWNER_EMAIL: owner } : {},
    orders: readOrders_().orders.map(plainOrder_),
    archive: readArchivedOrders_().map(plainOrder_),
    trash: trash,
    blocked: blocked
  };
}

/** Copie complète (remplace tout ce que contient la version Cloudflare). */
function cloudImport_() {
  var snap = cloudSnapshot_();
  cloudFetch_('/bridge/import', { reset: true, config: snap.config, kv: snap.kv, trash: snap.trash, blocked: snap.blocked });
  for (var i = 0; i < snap.orders.length; i += CLOUD.CHUNK) {
    cloudFetch_('/bridge/import', { orders: snap.orders.slice(i, i + CLOUD.CHUNK), seqFrom: i });
  }
  for (var j = 0; j < snap.archive.length; j += CLOUD.CHUNK) {
    cloudFetch_('/bridge/import', { archive: snap.archive.slice(j, j + CLOUD.CHUNK) });
  }
  cloudFetch_('/bridge/import', { done: true });
  PropertiesService.getScriptProperties().setProperty(CLOUD.PROP_LAST, new Date().toISOString());
  return { orders: snap.orders.length, archive: snap.archive.length, trash: snap.trash.length };
}

/** Administration › Connexions › Cloudflare : relie l'application Cloudflare, puis copie les données. */
function api_cloudConnect(url) {
  var user = requireAdmin_();
  url = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(url)) throw new Error('Adresse invalide. Exemple : https://dz-smart-shop.votre-nom.workers.dev');
  var p = PropertiesService.getScriptProperties();
  var secret = p.getProperty(CLOUD.PROP_SECRET) || (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  p.setProperty(CLOUD.PROP_URL, url);
  p.setProperty(CLOUD.PROP_SECRET, secret);
  var gateway = '';
  try { gateway = ScriptApp.getService().getUrl() || ''; } catch (e) { gateway = ''; }
  cloudFetch_('/bridge/register', { secret: secret, gateway: gateway, shop: getSettings_().NOM_BOUTIQUE });
  var r = cloudImport_();
  adminLog_(user, 'Cloudflare', 'Relié à ' + url + ' · ' + r.orders + ' commandes copiées');
  return { message: 'Relié. ' + plural_(r.orders, 'commande copiée', 'commandes copiées') + (r.archive ? ' (+ ' + r.archive + ' archivées)' : '') + '. Ouvrez la version Cloudflare.', connections: connectionsData_() };
}

/** Recopie les données (la version Cloudflare repart de l'état actuel du classeur). */
function api_cloudCopy() {
  var user = requireAdmin_();
  if (!cloudConfig_().secret) throw new Error('Reliez d’abord l’application Cloudflare.');
  var r = cloudImport_();
  adminLog_(user, 'Cloudflare', 'Données recopiées · ' + r.orders + ' commandes');
  return { message: plural_(r.orders, 'commande recopiée', 'commandes recopiées') + '.', connections: connectionsData_() };
}

function cloudStatus_() {
  var cfg = cloudConfig_();
  return { url: cfg.url, linked: !!(cfg.url && cfg.secret), last: cfg.last };
}

/** Jeton de connexion pour la version Cloudflare : « v1.<données>.<signature> » (voir server.js). */
function cloudToken_(email, secret) {
  var data = Utilities.base64EncodeWebSafe(JSON.stringify({ e: email, x: Date.now() + CLOUD.TOKEN_DAYS * 86400000 })).replace(/=+$/, '');
  var head = 'v1.' + data;
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(head, secret)).replace(/=+$/, '');
  return head + '.' + sig;
}

/** Page de connexion (lien de l'application avec ?cf=1) : renvoie vers Cloudflare avec un jeton. */
function cloudGateway_() {
  var cfg = cloudConfig_();
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { email = ''; }
  var body;
  if (!cfg.url || !cfg.secret) {
    body = '<p>La version Cloudflare n’est pas encore reliée. Administrateur : Administration › Connexions › Cloudflare.</p>';
  } else if (!email) {
    body = '<p>Google ne donne pas votre adresse. Ouvrez ce lien avec le compte Google de l’équipe.</p>';
  } else {
    var link = cfg.url + '/#jeton=' + encodeURIComponent(cloudToken_(email, cfg.secret));
    body = '<p>Connecté(e) : <strong>' + escapeHtml_(email) + '</strong></p>' +
      '<a class="btn" href="' + escapeHtml_(link) + '" target="_top">Ouvrir DZ Smart Shop</a>' +
      '<p class="small">La connexion dure 30 jours sur cet appareil.</p>';
  }
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#10241B;font:15px/1.5 system-ui,sans-serif;color:#15181E}' +
    '.c{background:#fff;border-radius:16px;padding:28px 24px;max-width:420px;width:calc(100% - 32px);display:grid;gap:14px}' +
    'h1{margin:0;font-size:22px}p{margin:0}.btn{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:10px;background:#0B6B4C;color:#fff;font-weight:600;text-decoration:none}' +
    '.small{font-size:13px;color:#5B6170}</style></head><body><div class="c"><h1>' + escapeHtml_(APP_NAME) + '</h1>' + body + '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(APP_NAME).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/* ---- Api.gs ---- */
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

function doGet(e) {
  // Connexion à la version Cloudflare (Cloud.gs) : ce lien avec « ?cf=1 ».
  if (e && e.parameter && e.parameter.cf) return cloudGateway_();
  var template = hasBundledHtml_()
    ? HtmlService.createTemplate(HTML_FILES_.Index)
    : HtmlService.createTemplateFromFile('Index');
  template.device = deviceInfo_();
  return template.evaluate()
    .setTitle(APP_NAME + ' · Commandes COD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/**
 * Ce que la page sait avant tout appel au serveur : une clé propre à l'utilisateur (pas son adresse)
 * pour la mémoire sur l'appareil, et la version. Texte JSON inséré dans la page.
 */
function deviceInfo_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { email = ''; }
  return JSON.stringify({ key: email ? shortHash_('dz-smart-shop|' + email) : '', v: APP_VERSION });
}

/** Empreinte courte (16 caractères) d'un texte : sert à distinguer deux comptes sur un même appareil. */
function shortHash_(text) {
  var h1 = 0x811c9dc5;
  var h2 = 0x01000193 ^ 0x5bd1e995;
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
}

/** Insère un fichier HTML dans un autre (Styles, App). */
function include(name) {
  if (hasBundledHtml_() && HTML_FILES_[name] !== undefined) return HTML_FILES_[name];
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * À chaque modification faite à la main dans le classeur : si c'est un onglet
 * de réglages (Paramètres, Tarifs, Équipe, Clients, Produits), la mémoire est
 * vidée pour que l'application voie tout de suite le changement.
 */
function onEdit(e) {
  try {
    var name = e && e.range ? e.range.getSheet().getName() : '';
    if (name === SHEET.ORDERS) invalidateOrdersCache_();
    var keys = configKeysFor_(name);
    if (keys.length) clearConfigCache_(keys);
  } catch (err) {
    // Ne doit jamais gêner la saisie.
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Menu de secours : tout le reste se fait dans l'application (page Administration).
  ui.createMenu(APP_NAME)
    .addItem('Ouvrir l’application', 'menuOpenApp')
    .addSeparator()
    .addItem('Installer / réparer le classeur', 'setup')
    .addItem('Archiver et alléger le classeur maintenant', 'menuMaintenance')
    .addItem('Restaurer une commande de la corbeille', 'menuTrashRestore')
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
  var n = processNewRowsNow_();
  SpreadsheetApp.getActiveSpreadsheet().toast(n + ' nouvelle(s) commande(s) ajoutée(s) à la file de confirmation.', APP_NAME);
}

function menuRecalc() {
  var n = recalcAlerts();
  SpreadsheetApp.getActiveSpreadsheet().toast(n + ' alerte(s) mise(s) à jour.', APP_NAME);
}

/* ------------------------------------------------------------------ */
/* Démarrage de l'interface                                           */
/* ------------------------------------------------------------------ */

/**
 * Données de démarrage. `preload` = { fn, args } : la première page est
 * calculée tout de suite, dans le même aller-retour (api_dashboard,
 * api_listOrders ou api_queue), ainsi que les compteurs du menu.
 */
/** Démarrage : mesurée (Administration › État de l'outil). */
function api_bootstrap() {
  var a = arguments;
  return timed_('Démarrage', function () { return bootstrapApi_.apply(null, a); });
}

function bootstrapApi_(preload) {
  var s = getSettings_();
  var wilayas = getWilayaList_();
  // Produits proposés dans « + Nouvelle commande » : les modèles actifs du catalogue.
  var products = readCatalog_().rows.filter(function (r) { return r.active; }).map(function (r) {
    return { name: r.product + (r.model ? ' — ' + r.model : ''), price: r.price || 0 };
  });
  var me = currentUser_();
  var first = null;
  var counts = null;
  try {
    var allowed = { api_dashboard: 1, api_listOrders: 1, api_queue: 1 };
    var args = preload && Array.isArray(preload.args) ? preload.args : [];
    var arrived = 0;
    if (preload && allowed[preload.fn]) {
      var opt = args[0] || {};
      if (preload.fn !== 'api_dashboard' && opt.sync) arrived = releasitQuickSync_();
    }
    var ctx = readOrders_();
    counts = countsData_(ctx, s);
    if (preload && allowed[preload.fn]) {
      var data = preload.fn === 'api_dashboard' ? dashboardData_(ctx, args[0])
        : preload.fn === 'api_listOrders' ? listData_(ctx, args[0] || {})
        : queueData_(ctx, currentUser_());
      if (preload.fn !== 'api_dashboard') data.arrived = arrived;
      if (preload.fn === 'api_queue' && args[0] && args[0].first) data.firstDetail = firstQueueDetail_(ctx, data, currentUser_());
      if (preload.fn === 'api_listOrders' && args[0] && args[0].withStatus) data.importStatus = api_importStatus();
      first = { key: typeof preload.key === 'string' ? preload.key : preload.fn + '|' + JSON.stringify(args), data: data };
    }
  } catch (e) {
    first = null; // la page se chargera normalement et affichera l'erreur
  }
  return {
    preload: first,
    counts: counts,
    app: { name: APP_NAME, version: APP_VERSION },
    shop: s.NOM_BOUTIQUE,
    user: { email: me.email, name: me.name, role: me.role, admin: isAdmin_(me), stock: canSeeStock_(me) },
    health: isAdmin_(me) ? healthSummary_() : null,
    statuses: STATUS_LIST,
    queueStatuses: QUEUE_STATUSES,
    styles: STATUS_STYLE,
    wilayas: wilayas,
    modes: MODES,
    carriers: CARRIERS,
    defaultCarrier: s.SOCIETE_PAR_DEFAUT,
    cancelReasons: s.motifs,
    maxAttempts: s.MAX_TENTATIVES,
    callsPerDay: s.APPELS_PAR_JOUR,
    callDays: s.JOURS_D_APPELS,
    callbackDelay: s.DELAI_RAPPEL_MINUTES,
    waTemplate: s.MESSAGE_WHATSAPP,
    rates: readRates_(wilayas),
    products: products
  };
}

/* ------------------------------------------------------------------ */
/* Tableau de bord                                                    */
/* ------------------------------------------------------------------ */

/** Tableau de bord : mesurée (Administration › État de l'outil). */
function api_dashboard() {
  var a = arguments;
  return timed_('Tableau de bord', function () { return dashboardApi_.apply(null, a); });
}

/** period : today, yesterday, 7, 30, month, lastmonth, all ; ou from / to (aaaa-mm-jj) pour une période libre. */
function dashboardApi_(period, from, to) {
  return dashboardData_(readOrders_(), period, from, to);
}

function dashboardData_(ctx, period, from, to) {
  var now = new Date();
  var settings = getSettings_();
  var range = periodRange_(String(period || '7'), from, to);
  var inPeriod = ctx.orders.filter(function (o) { return inDayRange_(o.date, range.from, range.to); });
  // Sur « Tout », les commandes archivées comptent aussi (elles sont toutes terminées).
  if (range.all) inPeriod = inPeriod.concat(readArchivedOrders_());
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
    period: from && to ? 'custom' : String(period || '7'),
    range: { from: range.from, to: range.to, all: !!range.all },
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
      waitingLong: ctx.orders.filter(function (o) { return neverCalledLong_(o, now, settings.ATTENTE_MAX_HEURES); }).length,
      parcelAlerts: trackingAlerts_(ctx.orders, settings, now).filter(function (a) { return a.level !== 'info'; }).length,
      stockLow: canSeeStock_(currentUser_()) ? stockData_(ctx, settings).low : 0
    },
    byWilaya: group(function (o) { return o.wilaya; }, has(SHIPPED_STATUSES)).slice(0, 10),
    byAgent: group(function (o) { return o.agent; }, function (o) {
      return !isBlank_(o.agent) && QUEUE_STATUSES.indexOf(o.status) < 0;
    }).slice(0, 10),
    byProduct: group(function (o) { return o.product; }).slice(0, 8),
    spark: sparkSeries_(ctx.orders, now),
    generatedAt: now.toISOString()
  };
}

/** Les 7 derniers jours (date de commande) : reçues, confirmées, livrées, montant livré. */
function sparkSeries_(orders, now) {
  var keys = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(now.getTime() - i * 86400000);
    keys.push(ymd_(d));
  }
  var idx = {};
  keys.forEach(function (k, i) { idx[k] = i; });
  var zero = function () { return [0, 0, 0, 0, 0, 0, 0]; };
  var out = { received: zero(), confirmed: zero(), delivered: zero(), revenue: zero() };
  orders.forEach(function (o) {
    var d = toDate_(o.date);
    if (!d) return;
    var i = idx[ymd_(d)];
    if (i === undefined) return;
    out.received[i]++;
    if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) out.confirmed[i]++;
    if (o.status === STATUS.DELIVERED) { out.delivered[i]++; out.revenue[i] += toNumber_(o.total); }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Liste des commandes                                                */
/* ------------------------------------------------------------------ */

/**
 * filter = { status: 'all' | 'queue' | un statut, q: texte, wilaya, period: 'today'|'7'|'30'|'all', limit }
 */
/** Commandes : mesurée (Administration › État de l'outil). */
function api_listOrders() {
  var a = arguments;
  return timed_('Commandes', function () { return listOrdersApi_.apply(null, a); });
}

function listOrdersApi_(filter) {
  filter = filter || {};
  var arrived = filter.sync ? releasitQuickSync_() : 0;
  var ctx = readOrders_();
  var res = listData_(ctx, filter);
  res.arrived = arrived;
  if (arrived) res.menuCounts = countsData_(ctx, null);
  if (filter.withStatus) res.importStatus = api_importStatus();
  return res;
}

function listData_(ctx, filter) {
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

  var counts = { all: base.length, queue: 0, todo: 0 };
  base.forEach(function (o) {
    var s = o.status || '—';
    counts[s] = (counts[s] || 0) + 1;
    if (QUEUE_STATUSES.indexOf(o.status) >= 0) counts.queue++;
    if (!o.status || TODO_STATUSES_.indexOf(o.status) >= 0) counts.todo++;
  });

  var status = filter.status || 'all';
  var rows = base.filter(function (o) {
    if (status === 'all') return true;
    if (status === 'queue') return QUEUE_STATUSES.indexOf(o.status) >= 0;
    if (status === 'todo') return !o.status || TODO_STATUSES_.indexOf(o.status) >= 0; // page Commandes : pas encore confirmées
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

function queueItem_(o, now, settings) {
  now = now || new Date();
  var d = toDate_(o.date);
  var calls = parseCallLog_(o.callLog);
  var lateHours = settings ? settings.ATTENTE_MAX_HEURES : 24;
  var waitHours = d ? Math.floor((now.getTime() - d.getTime()) / 3600000) : 0;
  var cb = toDate_(o.callback);
  return {
    id: String(o.id),
    client: String(o.client),
    wilaya: String(o.wilaya),
    commune: String(o.commune),
    product: String(o.product),
    total: toNumber_(o.total),
    date: iso_(o.date),
    status: String(o.status == null ? '' : o.status),
    attempts: toNumber_(o.attempts),
    callback: iso_(o.callback),
    // Rappel dont l'heure est arrivée (pas de réponse ou rappel demandé).
    recall: !!cb && cb <= now && (o.status === STATUS.NO_ANSWER || o.status === STATUS.CALLBACK),
    alert: String(o.alert),
    alertLevel: alertLevel_(o.alert),
    waitingLong: neverCalledLong_(o, now, lateHours),
    late: waitHours >= lateHours,
    waitHours: waitHours,
    calls: calls.slice(-6).map(function (c) { return { when: c.when, text: c.text }; }),
    callable: isCallable_(o),
    reason: waitingReason_(o)
  };
}

/** Commande jamais appelée, arrivée depuis plus de « hours » heures (ATTENTE_MAX_HEURES). */
function neverCalledLong_(o, now, hours) {
  var d = toDate_(o.date);
  return o.status === STATUS.TO_CONFIRM && !(toNumber_(o.attempts) > 0) && !!d && now.getTime() - d.getTime() > (hours || 24) * 3600000;
}

/** File d'appels : à appeler maintenant (due) et rappels programmés plus tard (later). */
/** opts.sync : vérifie d'abord l'onglet RELEASIT ; opts.first : joint la fiche de la première commande à appeler. */
/** Confirmation : mesurée (Administration › État de l'outil). */
function api_queue() {
  var a = arguments;
  return timed_('Confirmation', function () { return queueApi_.apply(null, a); });
}

function queueApi_(opts) {
  opts = opts || {};
  var arrived = opts.sync ? releasitQuickSync_() : 0;
  var ctx = readOrders_();
  var user = currentUser_();
  var q = queueData_(ctx, user);
  q.arrived = arrived;
  if (arrived) q.menuCounts = countsData_(ctx, null);
  if (opts.first) q.firstDetail = firstQueueDetail_(ctx, q, user);
  return q;
}

function firstQueueDetail_(ctx, q, user) {
  var first = q.due.length ? findOrder_(ctx, q.due[0].id) : null;
  return first ? orderDetail_(ctx, makeEnv_(ctx), first, user) : null;
}

function queueData_(ctx, user) {
  var now = new Date();
  var settings = getSettings_();
  var recentFirst = settings.ORDRE_FILE !== 'anciennes';
  var due = [];
  var later = [];
  var waiting = [];
  var rank = {};
  rank[STATUS.CALLBACK] = 0;
  rank[STATUS.TO_CONFIRM] = 1;
  rank[STATUS.NO_ANSWER] = 2;

  ctx.orders.forEach(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0) {
      // Ni confirmée ni annulée, mais hors de la file : elle reste visible avec son motif.
      if (waitingReason_(o)) waiting.push({ o: o, d: toDate_(o.date) });
      return;
    }
    var cb = toDate_(o.callback);
    var item = { o: o, cb: cb, d: toDate_(o.date) };
    if (cb && cb > now) later.push(item); else due.push(item);
  });
  waiting.sort(function (a, b) { return (b.d ? b.d.getTime() : 0) - (a.d ? a.d.getTime() : 0); });
  // Rappels dont l'heure est arrivée (rappel demandé, ou pas de réponse) : en tête de file.
  var rankOf = function (x) { return x.cb && (x.o.status === STATUS.CALLBACK || x.o.status === STATUS.NO_ANSWER) ? 0 : rank[x.o.status]; };
  due.sort(function (a, b) {
    var r = rankOf(a) - rankOf(b);
    if (r) return r;
    // Nouvelles commandes : les plus récentes d'abord (réglage ORDRE_FILE). Rappels : l'heure prévue d'abord.
    if (a.o.status === STATUS.TO_CONFIRM && recentFirst) return (b.d ? b.d.getTime() : 0) - (a.d ? a.d.getTime() : 0);
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

  var item = function (x) { return queueItem_(x.o, now, settings); };
  return {
    due: due.map(item),
    later: later.map(item),
    waiting: waiting.map(item),
    lateHours: settings.ATTENTE_MAX_HEURES,
    stats: { due: due.length, later: later.length, waiting: waiting.length, pending: pendingCount_(ctx), handledToday: mine.handled, confirmedToday: mine.confirmed },
    now: now.toISOString()
  };
}

/** Une commande avec l'historique du client. */
/** Fiche commande : mesurée (Administration › État de l'outil). */
function api_getOrder() {
  var a = arguments;
  return timed_('Fiche commande', function () { return getOrderApi_.apply(null, a); });
}

function getOrderApi_(id) {
  var ctx = readOrders_();
  var o = findOrder_(ctx, id);
  if (!o) throw new Error('Commande ' + id + ' introuvable.');
  return orderDetail_(ctx, makeEnv_(ctx), o, currentUser_());
}

/** Fiche d'une commande : la commande, l'historique du client, et ce qui est permis. */
function orderDetail_(ctx, env, o, user) {
  var h = clientHistory_(o.phone, env.index, o.id, env.archived);
  var recent = h.list.slice().sort(function (a, b) {
    var da = toDate_(a.date);
    var db = toDate_(b.date);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  }).slice(0, 5).map(function (x) {
    return { id: String(x.id), date: iso_(x.date), status: x.status, total: toNumber_(x.total), product: String(x.product) };
  });
  var phone = normalizePhone(o.phone);
  var rules = orderRules_(o, user, env.settings);
  return {
    order: serializeOrder_(o),
    rules: rules,
    history: { orders: h.orders, delivered: h.delivered, returned: h.returned, cancelled: h.cancelled, recent: recent },
    stock: orderStockInfo_(ctx, o),
    blacklisted: !!env.blacklist[phone.phone],
    phoneValid: phone.valid,
    intlPhone: intlPhone_(o.phone)
  };
}

/**
 * Enregistre le résultat d'un appel.
 * outcome : 'confirm' | 'no_answer' | 'callback' | 'cancel'
 * payload : { fields: {client, phone, wilaya, commune, address, product, qty, price, mode, carrier, shipping, notes},
 *             callback: date ISO, reason: motif } ; price et shipping seulement s'ils ont été tapés à la main
 */
function api_recordCall(id, outcome, payload, opts) {
  payload = payload || {};
  opts = opts || {};
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (!isCallable_(o)) {
      throw new Error('La commande ' + id + ' a déjà été traitée (statut « ' + o.status + ' »' +
        (o.agent ? ', par ' + o.agent : '') + ').');
    }
    var env = makeEnv_(ctx);
    var user = currentUser_();
    // Toutes les informations de la commande sont modifiables ; des frais de livraison tapés à la main sont gardés.
    var f = applyEdits_(o, payload.fields, env, true);
    var attempts = toNumber_(o.attempts);
    var detail = '';
    var logText = '';

    if (outcome === 'confirm') {
      f.status = STATUS.CONFIRMED;
      f.attempts = attempts + 1;
      f.callback = '';
      detail = 'Confirmée';
      logText = 'Confirmée';
    } else if (outcome === 'no_answer') {
      var plan = noAnswerFields_(o, env);
      Object.keys(plan.fields).forEach(function (k) { f[k] = plan.fields[k]; });
      detail = plan.detail;
      logText = 'Pas de réponse' + (f.status === STATUS.CANCELLED ? ', annulée automatiquement' : f.status === STATUS.UNREACHABLE ? ', injoignable' : '');
    } else if (outcome === 'callback') {
      var when = toDate_(payload.callback);
      if (!when || when <= env.now) throw new Error('Choisissez une date de rappel dans le futur.');
      f.status = STATUS.CALLBACK;
      f.callback = when;
      detail = 'Rappel programmé le ' + Utilities.formatDate(when, 'Africa/Algiers', 'dd/MM/yyyy HH:mm');
      logText = 'A répondu, rappel demandé pour le ' + Utilities.formatDate(when, 'Africa/Algiers', 'dd/MM HH:mm');
    } else if (outcome === 'cancel') {
      f.status = STATUS.CANCELLED;
      f.cancelReason = String(payload.reason || 'Autre');
      f.attempts = attempts + 1;
      f.callback = '';
      detail = 'Annulée : ' + f.cancelReason;
      logText = 'Annulée : ' + f.cancelReason;
    } else {
      throw new Error('Résultat d’appel inconnu : ' + outcome);
    }
    // Historique des appels de la commande (affiché dans Confirmation).
    ensureOrderColumn_(ctx, 'callLog');
    f.callLog = addCallLog_(o, env.now, logText, user);

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
    // En un seul aller-retour : la commande suivante, la file à jour et les compteurs.
    var res = serializeOrder_(o);
    if (opts.next) {
      var next = findOrder_(ctx, opts.next);
      if (next && isCallable_(next)) {
        env.index = phoneIndex_(ctx.orders);
        res.next = orderDetail_(ctx, env, next, user);
      }
    }
    if (opts.queue) res.queue = queueData_(ctx, user);
    res.counts = countsData_(ctx, env.settings);
    return res;
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
    if (f.status !== undefined) applyStockMoves_(ctx);
    if (force) log_(user, o.id, 'Déverrouillage', 'Motif : ' + why + ' · ' + changes.join(' · '));
    else log_(user, o.id, 'Modification', changes.join(' · '));
    var res = serializeOrder_(o);
    res.counts = countsData_(ctx, env.settings);
    return res;
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
    var res = serializeOrder_(o);
    res.counts = countsData_(ctx, env.settings);
    return res;
  });
}

/** Met à jour l'« Alerte client » des commandes en attente d'un numéro (après la liste noire ou un signalement). */
function refreshClientAlerts_(ctx, phone) {
  var env = makeEnv_(ctx);
  ctx.orders.forEach(function (o) {
    if (normalizePhone(o.phone).phone !== phone) return;
    if (QUEUE_STATUSES.indexOf(o.status) < 0 && o.status !== STATUS.UNREACHABLE && o.status !== STATUS.CONFIRMED) return;
    var a = computeAlert_(o, env);
    if (a !== String(o.alert)) writeFields_(ctx, o, { alert: a });
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
      ensureRows_(sh, row);
      sh.getRange(row, 1).setNumberFormat('@');
      sh.getRange(row, 1, 1, 4).setValues([[p.phone, '', !!on, note || '']]);
    } else {
      sh.getRange(row, 3).setValue(!!on);
      if (note) sh.getRange(row, 4).setValue(note);
    }
    clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
    refreshClientAlerts_(readOrders_(), p.phone);
    log_(user, '', on ? 'Liste noire : ajout' : 'Liste noire : retrait', p.phone);
    return { phone: p.phone, blacklisted: !!on };
  });
}

/* ---- Setup.gs ---- */
/**
 * Setup.gs : crée ou répare les onglets du classeur, les listes
 * déroulantes, les couleurs, et le traitement automatique.
 *
 * Sans danger à relancer : rien n'est effacé, il complète ce qui manque.
 */

var HEADER_BG_ = { 'in': '#EEF0F3', 'list': '#DCE7FA', 'auto': '#D3EDE2' };

function setup() {
  return setupSheets_(true);
}

/** Crée ou répare tout ; withTriggers : réinstalle aussi les tâches automatiques (au nom de celui qui lance). */
function setupSheets_(withTriggers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || ss_();
  invalidateOrdersCache_();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  clearConfigCache_();

  setupSettingsSheet_(ss);
  setupTeamSheet_(ss);
  setupRatesSheet_(ss);
  setupSimpleSheet_(ss, SHEET.PRODUCTS, PRODUCT_TITLES_, [220, 180, 120, 120, 90, 110, 240, 70]);
  setupSimpleSheet_(ss, SHEET.MOVES, MOVE_TITLES_, [140, 180, 160, 150, 90, 90, 100, 90, 120, 260]);
  setupExpensesSheet_(ss);
  setupClientsSheet_(ss);
  setupSimpleSheet_(ss, SHEET.LOG, ['Date', 'Utilisateur', 'Commande', 'Action', 'Détail'], [140, 130, 90, 160, 420]);
  setupOrdersSheet_(ss);
  removeEmptyDefaultSheet_(ss);
  clearConfigCache_();
  if (withTriggers) installTriggers_();

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
  migrateSettings_(sh);
  sh.getRange(2, 2, dataRows_(sh), 1).setWrap(true);
}

/**
 * Changements de réglages par défaut, faits une seule fois :
 *  - SMS_HEURES : « 8-21 » devient « 0-24 » (SMS à toute heure), seulement si vous ne l'aviez pas changé.
 */
function migrateSettings_(sh) {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('MIGRATION_SMS_HEURES') || sh.getLastRow() < 2) {
    migrateOnce_(sh, 'MIGRATION_TENTATIVES', function (row, key) {
      if (key === 'MAX_TENTATIVES') sh.getRange(row, 3).setValue('N’est plus utilisé : remplacé par APPELS_PAR_JOUR et JOURS_D_APPELS');
    });
    return;
  }
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === 'SMS_HEURES' && String(rows[i][1]).trim() === '8-21') {
      var d = DEFAULT_SETTINGS.filter(function (x) { return x[0] === 'SMS_HEURES'; })[0];
      sh.getRange(i + 2, 2, 1, 2).setValues([[d[1], d[2]]]);
    }
  }
  p.setProperty('MIGRATION_SMS_HEURES', '1');
  migrateOnce_(sh, 'MIGRATION_TENTATIVES', function (row, key) {
    if (key === 'MAX_TENTATIVES') sh.getRange(row, 3).setValue('N’est plus utilisé : remplacé par APPELS_PAR_JOUR et JOURS_D_APPELS');
  });
}

/** Passe une fois sur chaque réglage (clé de propriété `flag` pour ne pas recommencer). */
function migrateOnce_(sh, flag, fn) {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty(flag) || sh.getLastRow() < 2) return;
  sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r, i) { fn(i + 2, String(r[0]).trim()); });
  p.setProperty(flag, '1');
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
  var sh = setupSimpleSheet_(ss, SHEET.CLIENTS, CLIENT_TITLES_, [130, 180, 100, 320, 120, 120, 120, 260]);
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
  var newStockColumn = !empty && map.stockMove === undefined;
  var missing = ORDER_COLUMNS.filter(function (c) { return map[c.key] === undefined; })
    .map(function (c) { return c.title; });
  if (empty) {
    sh.getRange(1, 1, 1, missing.length).setValues([missing]);
  } else if (missing.length) {
    sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
  header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  map = headerMap_(header);
  // Nouvelle colonne « Mouvement stock » : les commandes déjà parties ne retouchent pas le stock.
  if (newStockColumn) markStockBefore_(sh, map);
  sh.setFrozenRows(1);
  ORDER_COLUMNS.forEach(function (c) {
    var cell = sh.getRange(1, map[c.key] + 1);
    cell.setFontWeight('bold').setFontColor('#15181E').setBackground(HEADER_BG_[c.kind] || '#EEF0F3');
    sh.setColumnWidth(map[c.key] + 1, c.width || 120);
  });
  applyOrdersRules_(sh);
  return sh;
}

/**
 * Formats, listes déroulantes et couleurs de l'onglet Commandes, sur toutes
 * ses lignes. Relancé quand l'onglet est agrandi (voir appendOrders_).
 */
function applyOrdersRules_(sh) {
  var ss = sh.getParent();
  var map = headerMap_(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
  var n = dataRows_(sh);
  var col = function (key) { return map[key] + 1; };
  var range = function (key) { return sh.getRange(2, col(key), n, 1); };

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
 *  - envoi des SMS en attente chaque minute (seulement si les SMS sont configurés) ;
 *  - traitement des nouvelles lignes toutes les 5 minutes ;
 *  - suivi des colis Ecotrack toutes les 30 minutes (sans effet tant qu'Ecotrack n'est pas configuré) ;
 *  - maintenance chaque nuit vers 3 h : archivage, Journal raccourci, onglets allégés (Maintenance.gs).
 * Google limite le temps de calcul quotidien : rien n'est lancé inutilement.
 */

/*
 * Ce qui change par rapport à Apps Script : placé dans makeApp APRÈS le code de apps-script/*.gs.
 * Une fonction déclarée ici remplace celle du même nom (même portée de fonction).
 *
 * Principe : server.js charge depuis D1 les commandes utiles à la requête (REQ.orders), puis appelle
 * les fonctions de l'outil, qui lisent et modifient ces commandes en mémoire ; server.js enregistre
 * ensuite les changements dans D1 en une seule fois.
 */

/* ---------------- Classeur : jamais utilisé ---------------- */

function ss_() { throw new Error('Le classeur Google n’est pas utilisé par la version Cloudflare.'); }
function sheet_(name) { throw new Error('Onglet « ' + name + ' » : pas dans la version Cloudflare.'); }

/** Position de chaque champ (les fonctions de l'outil s'en servent pour savoir qu'une colonne existe). */
var CF_ORDER_MAP_ = (function () { var m = {}; ORDER_COLUMNS.forEach(function (c, i) { m[c.key] = i; }); return m; })();

/** Les commandes de la requête (chargées depuis D1 par server.js). */
function readOrders_() {
  return {
    map: CF_ORDER_MAP_, width: ORDER_COLUMNS.length, orders: REQ.orders, session: 0,
    get sheet() { throw new Error('Le classeur Google n’est pas utilisé par la version Cloudflare.'); }
  };
}

/** Modifie une commande en mémoire ; elle sera enregistrée dans D1 à la fin de la requête. */
function writeFields_(ctx, order, fields) {
  if (fields.status !== undefined && String(fields.status) !== String(order.status)) {
    noteStatusChange_(order, fields.status);
    if (fields.status === STATUS.CONFIRMED && isBlank_(order.confirmedAt) && fields.confirmedAt === undefined) {
      fields = Object.assign({}, fields, { confirmedAt: new Date() });
    }
  }
  Object.keys(fields).forEach(function (key) { order[key] = fields[key]; });
  if (!order.__new) REQ.dirty[String(order.id)] = order;
}

/** Nouvelles commandes : ajoutées à la requête, insérées dans D1 à la fin. */
function appendOrders_(ctx, list) {
  list.forEach(function (o) {
    ORDER_COLUMNS.forEach(function (c) { if (o[c.key] === undefined) o[c.key] = ''; });
    Object.defineProperty(o, '__new', { value: true, enumerable: false, writable: true });
    REQ.inserts.push(o);
    ctx.orders.push(o);
  });
  return list;
}

function ensureOrderColumn_() {}

/** Réglages, tarifs, équipe, clients, produits : copiés dans D1 (table config), lus une fois par requête. */
function cached_(key, compute) {
  if (REQ && REQ.config && Object.prototype.hasOwnProperty.call(REQ.config, key)) return JSON.parse(REQ.config[key]);
  var value = compute();
  if (REQ) REQ.config[key] = JSON.stringify(value);
  return value;
}
function clearConfigCache_() {}

/** Journal : lignes ajoutées dans D1 à la fin de la requête. */
function writeLogRows_(rows) {
  rows.forEach(function (r) { REQ.journal.push(r); });
}

/** N° des commandes à la corbeille ou effacées (empêchent un n° d'être réutilisé). */
function trashIds_() { return REQ.trashIds || {}; }

/** Prochain n° de commande saisie à la main (le plus grand n° M… est calculé par server.js). */
function nextManualId_() {
  REQ.manualMax = (REQ.manualMax || 0) + 1;
  return 'M' + ('000' + REQ.manualMax).slice(-4);
}

function readArchivedOrders_() { return REQ.archived || []; }

/* ---------------- Heure d'Algérie (le serveur Cloudflare est à l'heure UTC) ---------------- */

function startOfDay_(d) {
  var p = algiersParts_(d);
  return new Date(Date.UTC(p.y, p.M - 1, p.d) - ALGIERS_OFFSET_MS_);
}
function tomorrowAt_(now, hour) {
  var p = algiersParts_(now);
  return new Date(Date.UTC(p.y, p.M - 1, p.d + 1, hour) - ALGIERS_OFFSET_MS_);
}

/* ---------------- Pas encore dans la version Cloudflare (étape 2) ---------------- */

function invalidateOrdersCache_() {}
function applyStockMoves_() { return 0; }
function releasitQuickSync_() { return 0; }
function timed_(label, fn) { return fn(); }
function notePerf_() {}
function healthSummary_() { return null; }
function api_importStatus() {
  return {
    releasit: { found: false, missing: [], lastRun: '', lastError: '' },
    shopify: { configured: false },
    sms: null,
    cloud: true
  };
}

/** Compteurs du menu : calculés par server.js avec D1, après l'enregistrement (voir fastCounts). */
function countsData_() { return { __fast: true }; }

return {
  fns: {algiersParts_: algiersParts_, pad2_: pad2_, notOnCloudflare_: notOnCloudflare_, ss_: ss_, sheet_: sheet_, normalizeText_: normalizeText_, isBlank_: isBlank_, normalizePhone: normalizePhone, intlPhone_: intlPhone_, toNumber_: toNumber_, ecoDate_: ecoDate_, toDate_: toDate_, iso_: iso_, startOfDay_: startOfDay_, periodStart_: periodStart_, withLock_: withLock_, getSettings_: getSettings_, readSettings_: readSettings_, currentUser_: currentUser_, readTeam_: readTeam_, log_: log_, writeLogRows_: writeLogRows_, withLogBatch_: withLogBatch_, ensureRows_: ensureRows_, configKeysFor_: configKeysFor_, allConfigKeys_: allConfigKeys_, fmtAmount_: fmtAmount_, cached_: cached_, clearConfigCache_: clearConfigCache_, headerMap_: headerMap_, readOrders_: readOrders_, findOrder_: findOrder_, writeFields_: writeFields_, knownColumns_: knownColumns_, appendOrder_: appendOrder_, appendOrders_: appendOrders_, nextManualId_: nextManualId_, serializeOrder_: serializeOrder_, getWilayaList_: getWilayaList_, readWilayaList_: readWilayaList_, wilayaCode_: wilayaCode_, matchWilaya_: matchWilaya_, readRates_: readRates_, readRatesFromSheet_: readRatesFromSheet_, shippingFee_: shippingFee_, readClients_: readClients_, readBlacklist_: readBlacklist_, phoneIndex_: phoneIndex_, clientHistory_: clientHistory_, computeAlert_: computeAlert_, alertLevel_: alertLevel_, makeEnv_: makeEnv_, applyEdits_: applyEdits_, processNewRows: processNewRows, hasNewRows_: hasNewRows_, processNewRowsNow_: processNewRowsNow_, recalcAlerts: recalcAlerts, ecotrackConfig_: ecotrackConfig_, normalizeEcotrackUrl_: normalizeEcotrackUrl_, saveEcotrackConfig_: saveEcotrackConfig_, ecotrackError_: ecotrackError_, ecotrackQuery_: ecotrackQuery_, retryAfterMs_: retryAfterMs_, ecotrackCall_: ecotrackCall_, flattenEcotrackErrors_: flattenEcotrackErrors_, ecotrackFail_: ecotrackFail_, ecotrackGet_: ecotrackGet_, listOf_: listOf_, ymd_: ymd_, lockedWithRetry_: lockedWithRetry_, ecotrackTest_: ecotrackTest_, ecotrackCatalog_: ecotrackCatalog_, syncEcotrackFees_: syncEcotrackFees_, ecotrackProblems_: ecotrackProblems_, ecotrackPayload_: ecotrackPayload_, shipToEcotrack_: shipToEcotrack_, sendEcotrackChunk_: sendEcotrackChunk_, ecotrackFindByReferences_: ecotrackFindByReferences_, writeShipResults_: writeShipResults_, ecotrackStatusInfo_: ecotrackStatusInfo_, ecotrackLabel_: ecotrackLabel_, mapEcotrackStatus_: mapEcotrackStatus_, isEcotrackTracked_: isEcotrackTracked_, isEcotrackActive_: isEcotrackActive_, ecotrackRecords_: ecotrackRecords_, ecotrackListSince_: ecotrackListSince_, ecotrackLookup_: ecotrackLookup_, ecotrackStatusLookup_: ecotrackStatusLookup_, clearEcotrackError_: clearEcotrackError_, syncEcotrackStatuses_: syncEcotrackStatuses_, ecoRecordDate_: ecoRecordDate_, markSynced_: markSynced_, syncEcotrackStatuses: syncEcotrackStatuses, api_ecotrackTest: api_ecotrackTest, api_ecotrackSyncFees: api_ecotrackSyncFees, api_ecotrackSyncStatuses: api_ecotrackSyncStatuses, api_shippingList: api_shippingList, shippingListApi_: shippingListApi_, api_shipEcotrack: api_shipEcotrack, menuEcotrackSetup: menuEcotrackSetup, menuEcotrackTest: menuEcotrackTest, menuEcotrackFees: menuEcotrackFees, menuEcotrackStatuses: menuEcotrackStatuses, durationText_: durationText_, staleLimit_: staleLimit_, trackingAlerts_: trackingAlerts_, trackingMoney_: trackingMoney_, activityLabel_: activityLabel_, firstOf_: firstOf_, parseTrackingInfo_: parseTrackingInfo_, api_parcelHistory: api_parcelHistory, api_trackingOverview: api_trackingOverview, trackingOverviewApi_: trackingOverviewApi_, api_markFollowUp: api_markFollowUp, api_counts: api_counts, countsData_: countsData_, pendingCount_: pendingCount_, labelMark_: labelMark_, labelState_: labelState_, ensureOrderColumn_: ensureOrderColumn_, canPrintLabel_: canPrintLabel_, headerOf_: headerOf_, isPdfBytes_: isPdfBytes_, labelUrlIn_: labelUrlIn_, readLabelResponse_: readLabelResponse_, fetchAllSafe_: fetchAllSafe_, ecotrackRequest_: ecotrackRequest_, api_labelFiles: api_labelFiles, api_markLabelsPrinted: api_markLabelsPrinted, uniqueIds_: uniqueIds_, validateRefusal_: validateRefusal_, api_validateParcels: api_validateParcels, api_refreshCreated: api_refreshCreated, plural_: plural_, remarkTag_: remarkTag_, remarkTagLabel_: remarkTagLabel_, parseRemarks_: parseRemarks_, courierNoteText_: courierNoteText_, lastCourierRemark_: lastCourierRemark_, courierRemarks_: courierRemarks_, ecotrackAsk_: ecotrackAsk_, sendCourierRemark_: sendCourierRemark_, askReturn_: askReturn_, flagClient_: flagClient_, shortDate_: shortDate_, api_followUpResult: api_followUpResult, taskInfo_: taskInfo_, ecotrackEvery_: ecotrackEvery_, readJsonProp_: readJsonProp_, emptyHealth_: emptyHealth_, everyMinute: everyMinute, runTask_: runTask_, runClaimed_: runClaimed_, noteNightly_: noteNightly_, taskEnabled_: taskEnabled_, healthProblems_: healthProblems_, todayMinutes_: todayMinutes_, ownerEmail_: ownerEmail_, checkHealthAlerts_: checkHealthAlerts_, installTriggers_: installTriggers_, healthSummary_: healthSummary_, healthData_: healthData_, recentErrors_: recentErrors_, api_reinstallTriggers: api_reinstallTriggers, emptyDay_: emptyDay_, groupRow_: groupRow_, addToRow_: addToRow_, hoursBetween_: hoursBetween_, addOrderToDay_: addOrderToDay_, roundDay_: roundDay_, summarizeDays_: summarizeDays_, statsSheet_: statsSheet_, rebuildStats_: rebuildStats_, readStoredDays_: readStoredDays_, parsePrimes_: parsePrimes_, primeAt_: primeAt_, api_setPrime: api_setPrime, addDayDays_: addDayDays_, dayCount_: dayCount_, mergeDays_: mergeDays_, ratio_: ratio_, kpis_: kpis_, groupList_: groupList_, statsRange_: statsRange_, periodRange_: periodRange_, inDayRange_: inDayRange_, api_stats: api_stats, statsApi_: statsApi_, weekdayCounts_: weekdayCounts_, api_rebuildStats: api_rebuildStats, settingChoices_: settingChoices_, settingType_: settingType_, maskSecret_: maskSecret_, adminLog_: adminLog_, api_pageScript: api_pageScript, globalApi_: globalApi_, connectionsData_: connectionsData_, api_adminOverview: api_adminOverview, adminOverviewApi_: adminOverviewApi_, api_saveEcotrack: api_saveEcotrack, api_saveSms: api_saveSms, api_saveShopify: api_saveShopify, readSettingRows_: readSettingRows_, api_settingsGet: api_settingsGet, checkSetting_: checkSetting_, writeSettings_: writeSettings_, api_settingsSave: api_settingsSave, api_smsPreview: api_smsPreview, teamRows_: teamRows_, api_teamList: api_teamList, api_teamSave: api_teamSave, api_teamRemove: api_teamRemove, api_clientsAdmin: api_clientsAdmin, api_clearFlag: api_clearFlag, api_repair: api_repair, api_archiveNow: api_archiveNow, api_health: api_health, ordersGen_: ordersGen_, invalidateOrdersCache_: invalidateOrdersCache_, encodeCell_: encodeCell_, decodeCell_: decodeCell_, cachedOrderValues_: cachedOrderValues_, storeOrderValues_: storeOrderValues_, timed_: timed_, notePerf_: notePerf_, readPerf_: readPerf_, api_preloadPages: api_preloadPages, shopifyConfig_: shopifyConfig_, normalizeShopifyDomain_: normalizeShopifyDomain_, saveShopifyConfig_: saveShopifyConfig_, shopifyError_: shopifyError_, shopifyAccessToken_: shopifyAccessToken_, shopifyErrorText_: shopifyErrorText_, shopifyGraphql_: shopifyGraphql_, shopifyTest_: shopifyTest_, latinDigits_: latinDigits_, normalizeLoose_: normalizeLoose_, wilayaLookup_: wilayaLookup_, wilayaFromText_: wilayaFromText_, wilayaName_: wilayaName_, stripLabel_: stripLabel_, pickPhone_: pickPhone_, deliveryModeFromTitle_: deliveryModeFromTitle_, shopifyAmount_: shopifyAmount_, shopifyNodeToOrder_: shopifyNodeToOrder_, hasTag_: hasTag_, importShopifyOrders_: importShopifyOrders_, importShopifyOrders: importShopifyOrders, api_shopifyStatus: api_shopifyStatus, shopifyImportMessage_: shopifyImportMessage_, api_shopifyImport: api_shopifyImport, api_shopifyTest: api_shopifyTest, menuShopifySetup: menuShopifySetup, menuShopifyTest: menuShopifyTest, menuShopifyImport: menuShopifyImport, releasitColumns_: releasitColumns_, releasitText_: releasitText_, releasitDate_: releasitDate_, releasitEnv_: releasitEnv_, releasitModeFromFee_: releasitModeFromFee_, releasitRowsToOrder_: releasitRowsToOrder_, releasitMark_: releasitMark_, transferReleasitOrders_: transferReleasitOrders_, releasitRecordError_: releasitRecordError_, transferReleasitOrders: transferReleasitOrders, releasitSafe_: releasitSafe_, releasitMessage_: releasitMessage_, releasitColumnsReport_: releasitColumnsReport_, releasitQuickSync_: releasitQuickSync_, api_releasitSync: api_releasitSync, api_releasitTransfer: api_releasitTransfer, api_importStatus: api_importStatus, menuReleasitTransfer: menuReleasitTransfer, menuReleasitCheck: menuReleasitCheck, hasEcotrackParcel_: hasEcotrackParcel_, orderStage_: orderStage_, pageOf_: pageOf_, isLockedStage_: isLockedStage_, isAdmin_: isAdmin_, stamp_: stamp_, orderRules_: orderRules_, statusRefusal_: statusRefusal_, cancelParcel_: cancelParcel_, api_cancelParcel: api_cancelParcel, trashIds_: trashIds_, requireAdminFor_: requireAdminFor_, idList_: idList_, deleteSheetRows_: deleteSheetRows_, trashOrders_: trashOrders_, api_deleteOrder: api_deleteOrder, api_deleteOrders: api_deleteOrders, api_listTrash: api_listTrash, api_restoreOrder: api_restoreOrder, readTrash_: readTrash_, api_restoreOrders: api_restoreOrders, blockIds_: blockIds_, purgeTrash_: purgeTrash_, api_purgeTrash: api_purgeTrash, purgeOldTrash_: purgeOldTrash_, menuTrashRestore: menuTrashRestore, isArchivable_: isArchivable_, rowForHeader_: rowForHeader_, appendArchiveRows_: appendArchiveRows_, deleteRowNumbers_: deleteRowNumbers_, archiveOldOrders_: archiveOldOrders_, addArchivedCounts_: addArchivedCounts_, readArchivedOrders_: readArchivedOrders_, trimJournal_: trimJournal_, trimSheet_: trimSheet_, lightenSheets_: lightenSheets_, nightlyMaintenance: nightlyMaintenance, menuMaintenance: menuMaintenance, catalogKey_: catalogKey_, isNo_: isNo_, readCatalogFromSheet_: readCatalogFromSheet_, readCatalog_: readCatalog_, matchCatalog_: matchCatalog_, splitLabel_: splitLabel_, rowLabel_: rowLabel_, orderItems_: orderItems_, returnReceived_: returnReceived_, reservedByKey_: reservedByKey_, orderStockInfo_: orderStockInfo_, productsSheet_: productsSheet_, writeCatalogCells_: writeCatalogCells_, logStockMoves_: logStockMoves_, moveRow_: moveRow_, applyStockMoves_: applyStockMoves_, markStockBefore_: markStockBefore_, isStockKeeper_: isStockKeeper_, canSeeStock_: canSeeStock_, requireStockAccess_: requireStockAccess_, requireAdmin_: requireAdmin_, stockData_: stockData_, readStockMoves_: readStockMoves_, api_stockPage: api_stockPage, stockPageApi_: stockPageApi_, api_stock: api_stock, api_addCatalogItems: api_addCatalogItems, productRowValues_: productRowValues_, numOrBlank_: numOrBlank_, api_addProduct: api_addProduct, api_updateCatalogRow: api_updateCatalogRow, api_stockEntry: api_stockEntry, api_stockInventory: api_stockInventory, api_markReturnDamaged: api_markReturnDamaged, setupExpensesSheet_: setupExpensesSheet_, adPlatform_: adPlatform_, isAdCategory_: isAdCategory_, expensesSheetInfo_: expensesSheetInfo_, isGainType_: isGainType_, expenseShare_: expenseShare_, expenseSig_: expenseSig_, isUsd_: isUsd_, readExpenses_: readExpenses_, fillExpenseRates_: fillExpenseRates_, orderProfit_: orderProfit_, emptyGroup_: emptyGroup_, addToGroup_: addToGroup_, finishGroup_: finishGroup_, profitBuckets_: profitBuckets_, profitTotals_: profitTotals_, profitData_: profitData_, api_profit: api_profit, profitApi_: profitApi_, expensesNeedRate_: expensesNeedRate_, expenseValues_: expenseValues_, expenseText_: expenseText_, writeExpenseRow_: writeExpenseRow_, api_addExpense: api_addExpense, expenseAt_: expenseAt_, api_updateExpense: api_updateExpense, api_deleteExpenses: api_deleteExpenses, smsEventByCode_: smsEventByCode_, noteSmsEvent_: noteSmsEvent_, smsConfig_: smsConfig_, smsNumber_: smsNumber_, saveSmsConfig_: saveSmsConfig_, smsSettingKey_: smsSettingKey_, smsTemplate_: smsTemplate_, fillSmsTemplate_: fillSmsTemplate_, readSmsQueue_: readSmsQueue_, writeSmsQueue_: writeSmsQueue_, noteStatusChange_: noteStatusChange_, flushSmsPending_: flushSmsPending_, smsAlreadySent_: smsAlreadySent_, httpsmsSend_: httpsmsSend_, algiersHour_: algiersHour_, sendSmsQueue_: sendSmsQueue_, smsRecordError_: smsRecordError_, sendSmsQueue: sendSmsQueue, smsStatus_: smsStatus_, smsSendMessage_: smsSendMessage_, api_smsTest: api_smsTest, api_smsSendNow: api_smsSendNow, menuSmsSetup: menuSmsSetup, menuSmsTest: menuSmsTest, menuSmsSend: menuSmsSend, isCallable_: isCallable_, parseCallLog_: parseCallLog_, addCallLog_: addCallLog_, waitingReason_: waitingReason_, dayKey_: dayKey_, parseDayCalls_: parseDayCalls_, callDay_: callDay_, tomorrowAt_: tomorrowAt_, noAnswerFields_: noAnswerFields_, autoCancelUnreachable_: autoCancelUnreachable_, cloudConfig_: cloudConfig_, cloudFetch_: cloudFetch_, plainOrder_: plainOrder_, cloudSnapshot_: cloudSnapshot_, cloudImport_: cloudImport_, api_cloudConnect: api_cloudConnect, api_cloudCopy: api_cloudCopy, cloudStatus_: cloudStatus_, cloudToken_: cloudToken_, cloudGateway_: cloudGateway_, escapeHtml_: escapeHtml_, hasBundledHtml_: hasBundledHtml_, doGet: doGet, deviceInfo_: deviceInfo_, shortHash_: shortHash_, include: include, onEdit: onEdit, onOpen: onOpen, menuOpenApp: menuOpenApp, menuProcess: menuProcess, menuRecalc: menuRecalc, api_bootstrap: api_bootstrap, bootstrapApi_: bootstrapApi_, api_dashboard: api_dashboard, dashboardApi_: dashboardApi_, dashboardData_: dashboardData_, sparkSeries_: sparkSeries_, api_listOrders: api_listOrders, listOrdersApi_: listOrdersApi_, listData_: listData_, queueItem_: queueItem_, neverCalledLong_: neverCalledLong_, api_queue: api_queue, queueApi_: queueApi_, firstQueueDetail_: firstQueueDetail_, queueData_: queueData_, api_getOrder: api_getOrder, getOrderApi_: getOrderApi_, orderDetail_: orderDetail_, api_recordCall: api_recordCall, pickEdits_: pickEdits_, api_updateOrder: api_updateOrder, api_createOrder: api_createOrder, refreshClientAlerts_: refreshClientAlerts_, api_setBlacklist: api_setBlacklist, setup: setup, setupSheets_: setupSheets_, ensureSheet_: ensureSheet_, ensureHeaders_: ensureHeaders_, dataRows_: dataRows_, setupSimpleSheet_: setupSimpleSheet_, setupSettingsSheet_: setupSettingsSheet_, migrateSettings_: migrateSettings_, migrateOnce_: migrateOnce_, setupTeamSheet_: setupTeamSheet_, setupRatesSheet_: setupRatesSheet_, setupClientsSheet_: setupClientsSheet_, setupOrdersSheet_: setupOrdersSheet_, applyOrdersRules_: applyOrdersRules_, removeEmptyDefaultSheet_: removeEmptyDefaultSheet_},
  consts: {APP_NAME: APP_NAME, APP_VERSION: APP_VERSION, SHEET: SHEET, ORDER_COLUMNS: ORDER_COLUMNS, STATUS: STATUS, STATUS_LIST: STATUS_LIST, STATUS_STYLE: STATUS_STYLE, QUEUE_STATUSES: QUEUE_STATUSES, CONFIRMED_STATUSES: CONFIRMED_STATUSES, SHIPPED_STATUSES: SHIPPED_STATUSES, MODES: MODES, CARRIERS: CARRIERS, DEFAULT_SETTINGS: DEFAULT_SETTINGS, WILAYAS: WILAYAS, WILAYAS_AR: WILAYAS_AR, WILAYA_ALIASES: WILAYA_ALIASES, LOG_BATCH_: LOG_BATCH_, CONFIG_TTL_: CONFIG_TTL_, CFG_MEMO_: CFG_MEMO_, CFG_PREFETCHED_: CFG_PREFETCHED_, TEXT_KEYS_: TEXT_KEYS_, WRITE_MAX_GAP_: WRITE_MAX_GAP_, CLIENT_TITLES_: CLIENT_TITLES_, ECO: ECO, ECO_NOT_CONFIGURED_: ECO_NOT_CONFIGURED_, ECO_STATUSES_: ECO_STATUSES_, STATUS_RANK_: STATUS_RANK_, ALERT_LEVEL_RANK_: ALERT_LEVEL_RANK_, STAGE_SORTING_: STAGE_SORTING_, ECO_ACTIVITIES_: ECO_ACTIVITIES_, LABEL: LABEL, FOLLOW: FOLLOW, REMARK_TAGS_: REMARK_TAGS_, FOLLOW_RESULTS_: FOLLOW_RESULTS_, HEALTH: HEALTH, TASKS_: TASKS_, TRIGGER_HANDLERS_: TRIGGER_HANDLERS_, STATS: STATS, ROLES_: ROLES_, SETTING_GROUPS_: SETTING_GROUPS_, LONG_SETTINGS_: LONG_SETTINGS_, LAZY_PAGES_: LAZY_PAGES_, SPEED: SPEED, ORDERS_CACHE_ON_: ORDERS_CACHE_ON_, LOCK_DEPTH_: LOCK_DEPTH_, LOCK_SESSION_: LOCK_SESSION_, PRELOADABLE_: PRELOADABLE_, SHOP: SHOP, SHOPIFY_NOT_CONFIGURED_: SHOPIFY_NOT_CONFIGURED_, WILAYA_LOOKUP_: WILAYA_LOOKUP_, SHOPIFY_ORDERS_QUERY_: SHOPIFY_ORDERS_QUERY_, RELEASIT: RELEASIT, RELEASIT_COLUMNS_: RELEASIT_COLUMNS_, RELEASIT_IMPORTANT_: RELEASIT_IMPORTANT_, STAGE: STAGE, TRASH: TRASH, TODO_STATUSES_: TODO_STATUSES_, ARCHIVE_EXTRA_: ARCHIVE_EXTRA_, FINAL_STATUSES_: FINAL_STATUSES_, PRODUCT_TITLES_: PRODUCT_TITLES_, MOVE_TITLES_: MOVE_TITLES_, INVENTORY_REASONS_: INVENTORY_REASONS_, STOCK_OUT_: STOCK_OUT_, STOCK_BACK_: STOCK_BACK_, STOCK_DAMAGED_: STOCK_DAMAGED_, STOCK_BEFORE_: STOCK_BEFORE_, EXPENSE_TITLES_: EXPENSE_TITLES_, CURRENCIES_: CURRENCIES_, EXPENSE_TYPES_: EXPENSE_TYPES_, SMS: SMS, SMS_NOT_CONFIGURED_: SMS_NOT_CONFIGURED_, SMS_PENDING_: SMS_PENDING_, SMS_EVENTS_: SMS_EVENTS_, AUTO_CANCEL_REASON_: AUTO_CANCEL_REASON_, CALL_LOG_MAX_: CALL_LOG_MAX_, CLOUD: CLOUD, EDIT_KEYS_: EDIT_KEYS_, HEADER_BG_: HEADER_BG_},
  begin: function (r) { REQ = r; CFG_MEMO_ = {}; CFG_PREFETCHED_ = false; LOG_BATCH_ = null; LOCK_DEPTH_ = 0; SMS_PENDING_ = []; },
  end: function () { REQ = null; LOG_BATCH_ = null; }
};
}

/*
 * DZ Smart Shop sur Cloudflare Workers : le moteur (API), la connexion et la copie des données.
 *
 * Ce fichier est placé APRÈS la fonction makeApp générée par build.js, qui contient tout le code
 * de apps-script/*.gs (les mêmes règles que la version Google), gas-shim.js et overrides.js.
 *
 *   GET  /auth/info          adresse de connexion (lien Apps Script), nom de la boutique
 *   POST /api/<fonction>     les fonctions appelées par l'interface (comme google.script.run)
 *   POST /bridge/register    premier contact d'Apps Script : enregistre la clé partagée
 *   POST /bridge/import      copie des onglets du classeur (par paquets)
 *   GET  /bridge/status      ce que contient la base
 *   tout le reste            l'interface (fichiers du dossier public/)
 */

const APP = makeApp();
const F = APP.fns;
const K = APP.consts;

const TOKEN_DAYS = 30;
const TODO = K.TODO_STATUSES_;
const QUEUE = K.QUEUE_STATUSES;
const S = K.STATUS;

/* ================================================================ */
/* Outils                                                           */
/* ================================================================ */

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || ''; }
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function b64url(bytes) {
  let s = '';
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlText(text) { return b64url(new TextEncoder().encode(text)); }
function fromB64url(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

/** Comparaison sans fuite de temps (clé partagée, signatures). */
function sameText(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length || !a.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Jeton de connexion : « v1.<données>.<signature> », signé par Apps Script avec la clé partagée
 * (voir Cloud.gs). Données : { e: adresse, x: fin de validité en ms }.
 */
async function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !secret) return null;
  const sig = await hmac(secret, parts[0] + '.' + parts[1]);
  if (!sameText(sig, parts[2])) return null;
  let p;
  try { p = JSON.parse(fromB64url(parts[1])); } catch (e) { return null; }
  if (!p || !p.e || !(p.x > Date.now())) return null;
  return { email: String(p.e).toLowerCase() };
}

/** Étape d'une commande (colonne stage) : pour lire seulement les commandes utiles. */
function stageOf(status) {
  const s = String(status == null ? '' : status).trim();
  if (!s || TODO.indexOf(s) >= 0) return 'todo';
  if (s === S.CONFIRMED) return 'confirmed';
  if (s === S.SHIPPED || s === S.IN_DELIVERY) return 'transit';
  if (s === S.DELIVERED) return 'delivered';
  if (s === S.RETURNED) return 'returned';
  if (s === S.CANCELLED) return 'cancelled';
  return 'other'; // statut inconnu : visible dans Confirmation › En attente
}

function isoOf(v) {
  if (v === '' || v === null || v === undefined) return '';
  const d = v instanceof Date ? v : F.toDate_(v);
  return d && !isNaN(d.getTime()) ? d.toISOString() : '';
}

/** Commande « à plat » : les champs des colonnes de l'outil, les dates en texte ISO. */
function plain(o) {
  const out = {};
  K.ORDER_COLUMNS.forEach((c) => {
    let v = o[c.key];
    if (v instanceof Date) v = isNaN(v.getTime()) ? '' : v.toISOString();
    out[c.key] = v === undefined || v === null ? '' : v;
  });
  return out;
}

/** Ligne de la table orders pour une commande. */
function rowOf(o) {
  const p = plain(o);
  const d = F.toDate_(p.date);
  const phone = F.normalizePhone(p.phone).phone || String(p.phone || '').trim();
  const text = [p.id, p.client, p.commune, p.product, p.tracking, p.wilaya].join(' ');
  return {
    id: String(p.id).trim(),
    stage: stageOf(p.status),
    status: String(p.status == null ? '' : p.status).trim(),
    day: d ? F.ymd_(d) : '',
    date: d ? d.toISOString() : '',
    phone: phone,
    wilaya: String(p.wilaya || '').trim(),
    agent: String(p.agent || '').trim(),
    product: String(p.product || '').trim(),
    total: Number(F.toNumber_(p.total)) || 0,
    callback: isoOf(p.callback),
    carrier: String(p.carrier || '').trim(),
    tracking: String(p.tracking || '').trim(),
    updated: isoOf(p.updated),
    search: (F.normalizeText_(text) + ' ' + text.toLowerCase() + ' ' + String(p.phone || '').replace(/\D/g, '')).slice(0, 2000),
    data: JSON.stringify(p)
  };
}

const ROW_COLS = ['stage', 'status', 'day', 'date', 'phone', 'wilaya', 'agent', 'product', 'total', 'callback', 'carrier', 'tracking', 'updated', 'search', 'data'];

function toOrder(row) {
  const o = JSON.parse(row.data);
  Object.defineProperty(o, '__rev', { value: row.rev, writable: true, enumerable: false });
  return o;
}

function placeholders(n) { return new Array(n).fill('?').join(','); }

/* ================================================================ */
/* Requête : réglages, commandes utiles, enregistrement             */
/* ================================================================ */

/** Réglages (table config) et propriétés (table kv) : une seule lecture groupée. */
async function loadBase(env) {
  const [cfg, kv] = await env.DB.batch([
    env.DB.prepare('SELECT key, value FROM config'),
    env.DB.prepare('SELECT key, value FROM kv')
  ]);
  const config = {};
  (cfg.results || []).forEach((r) => { config[r.key] = r.value; });
  const props = {};
  const secret = {};
  (kv.results || []).forEach((r) => { if (r.key.indexOf('cf:') === 0) secret[r.key] = r.value; else props[r.key] = r.value; });
  return { config, props, secret };
}

function newReq(base, user) {
  return {
    now: new Date(), user: user, config: base.config, props: Object.assign({}, base.props), propWrites: {}, cache: {},
    orders: [], byId: {}, dirty: {}, inserts: [], journal: [], configWrites: {}, extra: [], changed: [],
    trashIds: null, archived: [], manualMax: 0
  };
}

/** Ajoute des commandes à la requête (sans doublon). */
function addOrders(R, list) {
  list.forEach((o) => {
    const id = String(o.id);
    if (R.byId[id]) return;
    R.byId[id] = o;
    R.orders.push(o);
  });
}

async function loadWhere(env, R, where, binds) {
  const r = await env.DB.prepare('SELECT id, rev, data FROM orders WHERE ' + where).bind(...(binds || [])).all();
  addOrders(R, (r.results || []).map(toOrder));
}

/** Plusieurs lectures en un seul aller-retour. */
async function loadMany(env, R, queries) {
  if (!queries.length) return;
  const res = await env.DB.batch(queries.map((q) => env.DB.prepare('SELECT id, rev, data FROM orders WHERE ' + q[0]).bind(...(q[1] || []))));
  res.forEach((r) => addOrders(R, (r.results || []).map(toOrder)));
}

function phonesOf(values) {
  const out = [];
  values.forEach((v) => {
    const p = F.normalizePhone(v).phone;
    if (p && out.indexOf(p) < 0) out.push(p);
  });
  return out;
}
function phoneQuery(phones) {
  return phones.length ? ['archived = 0 AND phone IN (' + placeholders(phones.length) + ')', phones] : null;
}

/** Exécute une fonction de l'outil (synchrone) sur les commandes chargées. */
function run(R, fn) {
  APP.begin(R);
  try { return fn(); } finally { APP.end(); }
}

/** Enregistre dans D1 tout ce que la requête a modifié, en une transaction. */
async function flush(env, R) {
  const db = env.DB;
  const st = [];
  const now = new Date().toISOString();
  let guarded = false;
  Object.keys(R.dirty).forEach((id) => {
    const o = R.dirty[id];
    const row = rowOf(o);
    st.push(db.prepare('UPDATE orders SET rev = rev + 1, ' + ROW_COLS.map((c) => c + ' = ?').join(', ') + ' WHERE id = ? AND rev = ?')
      .bind(...ROW_COLS.map((c) => row[c]), id, o.__rev || 0));
    st.push(db.prepare('INSERT INTO guard(ok) VALUES (changes())'));
    guarded = true;
    st.push(db.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(id, 'update', now));
  });
  R.inserts.forEach((o) => {
    const row = rowOf(o);
    st.push(db.prepare('INSERT INTO orders (id, rev, seq, ' + ROW_COLS.join(', ') + ') VALUES (?, 0, (SELECT COALESCE(MAX(seq), 0) + 1 FROM orders), ' + placeholders(ROW_COLS.length) + ')')
      .bind(row.id, ...ROW_COLS.map((c) => row[c])));
    st.push(db.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(row.id, 'insert', now));
  });
  R.extra.forEach((s) => st.push(s));
  R.journal.forEach((r) => {
    const at = r[0] instanceof Date ? r[0].toISOString() : now;
    st.push(db.prepare('INSERT INTO journal (at, who, order_id, action, detail) VALUES (?, ?, ?, ?, ?)')
      .bind(at, String(r[1] || ''), String(r[2] || ''), String(r[3] || ''), String(r[4] || '').slice(0, 2000)));
  });
  Object.keys(R.propWrites).forEach((k) => {
    const v = R.propWrites[k];
    st.push(v === null ? db.prepare('DELETE FROM kv WHERE key = ?').bind(k)
      : db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, v));
  });
  Object.keys(R.configWrites).forEach((k) => {
    st.push(db.prepare('INSERT INTO config (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
      .bind(k, R.configWrites[k], now));
  });
  if (!st.length) return;
  if (guarded) st.push(db.prepare('DELETE FROM guard'));
  try {
    await db.batch(st);
  } catch (e) {
    if (/CHECK constraint/i.test(String(e && e.message))) {
      throw new HttpError(409, 'Cette commande vient d’être modifiée par quelqu’un d’autre. Rechargez-la, puis recommencez.', 'conflict');
    }
    throw e;
  }
}

/** Compteurs du menu (à appeler / en attente / à expédier) : trois comptes lus sur l'index. */
async function fastCounts(env) {
  const now = new Date().toISOString();
  const r = await env.DB.prepare(
    'SELECT ' +
    "SUM(CASE WHEN stage = 'todo' AND status IN (" + placeholders(QUEUE.length) + ") AND (callback = '' OR callback <= ?) THEN 1 ELSE 0 END) AS queue, " +
    "SUM(CASE WHEN stage = 'todo' THEN 1 ELSE 0 END) AS pending, " +
    "SUM(CASE WHEN stage = 'confirmed' AND tracking = '' THEN 1 ELSE 0 END) AS toShip " +
    "FROM orders WHERE archived = 0 AND stage IN ('todo', 'confirmed')"
  ).bind(...QUEUE, now).first();
  return { queue: (r && r.queue) || 0, pending: (r && r.pending) || 0, toShip: (r && r.toShip) || 0, alerts: 0 };
}

/** Remplace les compteurs marqués par l'outil (countsData_) par ceux de D1, après l'enregistrement. */
async function withCounts(env, res) {
  if (!res || typeof res !== 'object') return res;
  const need = ['counts', 'menuCounts'].filter((k) => res[k] && res[k].__fast);
  if (!need.length) return res;
  const c = await fastCounts(env);
  need.forEach((k) => { res[k] = c; });
  return res;
}

/* ================================================================ */
/* Pages                                                            */
/* ================================================================ */

/** Commandes traitées aujourd'hui par cette personne (« mes confirmations ») : lues avec la file. */
function todayStartIso() { return F.startOfDay_(new Date()).toISOString(); }

async function loadQueueSet(env, R) {
  const name = (R.userName || '');
  await loadMany(env, R, [
    ["archived = 0 AND stage IN ('todo', 'other')", []],
    ["archived = 0 AND stage = 'confirmed'", []],
    ['archived = 0 AND updated >= ? AND agent = ?', [todayStartIso(), name]]
  ]);
}

/** Nom de la personne connectée (onglet Équipe), pour les requêtes. */
function userName(R) { return run(R, () => F.currentUser_().name); }

const PAGES = {
  async api_bootstrap(env, R, args) {
    const preload = args[0] || null;
    const boot = run(R, () => F.bootstrapApi_(null));
    boot.counts = await fastCounts(env);
    boot.cloud = { version: K.APP_VERSION, step: 1 };
    if (preload && preload.fn && PAGES[preload.fn] && ['api_dashboard', 'api_listOrders', 'api_queue'].indexOf(preload.fn) >= 0) {
      const R2 = newReq({ config: R.config, props: R.props }, R.user);
      R2.userName = R.userName;
      const data = await PAGES[preload.fn](env, R2, Array.isArray(preload.args) ? preload.args : []);
      await flush(env, R2);
      boot.preload = { key: typeof preload.key === 'string' ? preload.key : preload.fn + '|' + JSON.stringify(preload.args || []), data: data };
    }
    return boot;
  },

  async api_counts(env) { return fastCounts(env); },

  async api_queue(env, R, args) {
    const opts = args[0] || {};
    await loadQueueSet(env, R);
    let q = run(R, () => F.queueData_(F.readOrders_(), F.currentUser_()));
    if (opts.first && q.due.length) {
      const first = R.byId[q.due[0].id];
      const pq = first ? phoneQuery(phonesOf([first.phone])) : null;
      if (pq) await loadWhere(env, R, pq[0], pq[1]);
      q.firstDetail = run(R, () => F.firstQueueDetail_(F.readOrders_(), q, F.currentUser_()));
    }
    q.arrived = 0;
    return q;
  },

  async api_getOrder(env, R, args) {
    const id = String(args[0] == null ? '' : args[0]).trim();
    await loadWhere(env, R, 'id = ?', [id]);
    const o = R.byId[id];
    if (!o) throw new HttpError(404, 'Commande ' + id + ' introuvable.');
    const pq = phoneQuery(phonesOf([o.phone]));
    await loadMany(env, R, [["archived = 0 AND stage = 'confirmed'", []]].concat(pq ? [pq] : []));
    return run(R, () => F.getOrderApi_(id));
  },

  async api_recordCall(env, R, args) {
    const id = String(args[0] == null ? '' : args[0]).trim();
    const payload = args[2] || {};
    const opts = args[3] || {};
    await loadQueueSet(env, R);
    await loadWhere(env, R, 'id = ?', [id]);
    const o = R.byId[id];
    if (!o) throw new HttpError(404, 'Commande ' + id + ' introuvable.');
    const next = opts.next ? String(opts.next) : '';
    if (next) await loadWhere(env, R, 'id = ?', [next]);
    const phones = phonesOf([o.phone, payload.fields && payload.fields.phone, next && R.byId[next] ? R.byId[next].phone : '']);
    const pq = phoneQuery(phones);
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    const res = run(R, () => F.api_recordCall.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_updateOrder(env, R, args) {
    const id = String(args[0] == null ? '' : args[0]).trim();
    const input = args[1] || {};
    await loadWhere(env, R, 'id = ?', [id]);
    const o = R.byId[id];
    if (!o) throw new HttpError(404, 'Commande ' + id + ' introuvable.');
    const pq = phoneQuery(phonesOf([o.phone, input.phone]));
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    const res = run(R, () => F.api_updateOrder.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_createOrder(env, R, args) {
    const input = args[0] || {};
    const pq = phoneQuery(phonesOf([input.phone]));
    if (pq) await loadWhere(env, R, pq[0], pq[1]);
    R.manualMax = await manualMax(env);
    const res = run(R, () => F.api_createOrder.apply(null, args));
    await flush(env, R);
    return withCounts(env, res);
  },

  async api_setBlacklist(env, R, args) {
    const p = F.normalizePhone(args[0]);
    if (!p.valid) throw new HttpError(400, 'Numéro invalide.');
    const on = !!args[1];
    const note = String(args[2] || '');
    await loadWhere(env, R, 'archived = 0 AND phone = ?', [p.phone]);
    const res = run(R, () => {
      const user = F.currentUser_();
      const clients = F.readClients_();
      if (on) clients.blacklist[p.phone] = true; else delete clients.blacklist[p.phone];
      if (note) { clients.notes = clients.notes || {}; clients.notes[p.phone] = note; }
      R.config['cfg:clients'] = JSON.stringify(clients);
      R.configWrites['cfg:clients'] = R.config['cfg:clients'];
      F.refreshClientAlerts_(F.readOrders_(), p.phone);
      F.log_(user, '', on ? 'Liste noire : ajout' : 'Liste noire : retrait', p.phone);
      return { phone: p.phone, blacklisted: on };
    });
    await flush(env, R);
    return res;
  },

  async api_dashboard(env, R, args) { return dashboard(env, R, args); },
  async api_listOrders(env, R, args) { return listOrders(env, R, args[0] || {}); },

  async api_preloadPages(env, R, args) {
    const specs = Array.isArray(args[0]) ? args[0].slice(0, 6) : [];
    const out = [];
    for (const s of specs) {
      if (!s || ['api_dashboard', 'api_listOrders', 'api_queue'].indexOf(s.fn) < 0) { out.push(null); continue; }
      try {
        const R2 = newReq({ config: R.config, props: R.props }, R.user);
        R2.userName = R.userName;
        out.push({ data: await PAGES[s.fn](env, R2, Array.isArray(s.args) ? s.args : []) });
      } catch (e) { out.push(null); }
    }
    return out;
  },

  async api_importStatus() { return run(newReq({ config: {}, props: {} }, null), () => F.api_importStatus()); },

  /* ---------------- Corbeille ---------------- */

  async api_listTrash(env, R) {
    requireAdmin(R);
    const r = await env.DB.prepare('SELECT data, deleted_at, deleted_by, reason FROM trash ORDER BY deleted_at DESC LIMIT 1000').all();
    const rows = (r.results || []).map((t) => {
      const o = JSON.parse(t.data);
      return {
        id: String(o.id), client: String(o.client || ''), phone: String(o.phone || ''), wilaya: String(o.wilaya || ''), product: String(o.product || ''),
        total: Number(F.toNumber_(o.total)) || 0, status: String(o.status || ''), date: isoOf(o.date),
        deletedAt: t.deleted_at, deletedBy: t.deleted_by, reason: t.reason
      };
    });
    const s = run(R, () => F.getSettings_());
    return { rows: rows, autoDays: s.CORBEILLE_JOURS };
  },

  async api_deleteOrder(env, R, args) {
    const r = await PAGES.api_deleteOrders(env, R, [[args[0]], args[1]]);
    if (r.skipped.length && !r.deleted.length) {
      const why = r.skipped[0].why;
      throw new HttpError(400, why === 'introuvable' ? 'Commande ' + args[0] + ' introuvable.'
        : 'Une commande envoyée à une société de livraison ne peut pas être supprimée. Annulez-la, ou annulez d’abord son colis.');
    }
    return { id: r.deleted[0], counts: r.counts, message: 'Commande ' + r.deleted[0] + ' mise à la corbeille.' };
  },

  async api_deleteOrders(env, R, args) {
    const user = requireAdmin(R, 'supprimer des commandes');
    const ids = run(R, () => F.idList_(args[0]));
    if (!ids.length) throw new HttpError(400, 'Cochez au moins une commande.');
    const why = String(args[1] == null ? '' : args[1]).trim();
    await loadWhere(env, R, 'id IN (' + placeholders(ids.length) + ')', ids);
    const out = { deleted: [], skipped: [] };
    const now = new Date().toISOString();
    run(R, () => {
      ids.forEach((id) => {
        const o = R.byId[id];
        if (!o) { out.skipped.push({ id: id, why: 'introuvable' }); return; }
        if (!F.orderRules_(o, user, null).canDelete) { out.skipped.push({ id: id, why: 'déjà envoyée à une société de livraison' }); return; }
        R.extra.push(env.DB.prepare('INSERT OR REPLACE INTO trash (id, data, deleted_at, deleted_by, reason) VALUES (?, ?, ?, ?, ?)').bind(id, JSON.stringify(plain(o)), now, user.name, why));
        R.extra.push(env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id));
        R.extra.push(env.DB.prepare('INSERT INTO changes(order_id, kind, at) VALUES (?, ?, ?)').bind(id, 'delete', now));
        F.log_(user, id, 'Suppression', 'Mise à la corbeille' + (why ? ' · Motif : ' + why : ''));
        out.deleted.push(id);
      });
    });
    await flush(env, R);
    let msg = F.plural_(out.deleted.length, 'commande mise', 'commandes mises') + ' à la corbeille';
    if (out.skipped.length) msg += ' · ' + F.plural_(out.skipped.length, 'ignorée', 'ignorées') + ' (' + out.skipped.slice(0, 5).map((x) => x.id + ' : ' + x.why).join(', ') + (out.skipped.length > 5 ? '…' : '') + ')';
    return { deleted: out.deleted, skipped: out.skipped, counts: await fastCounts(env), message: msg + '.' };
  },

  async api_restoreOrder(env, R, args) {
    const r = await PAGES.api_restoreOrders(env, R, [[args[0]]]);
    if (r.skipped.length) throw new HttpError(400, r.skipped[0].why);
    return { id: r.restored[0], message: 'Commande ' + r.restored[0] + ' remise dans l’onglet Commandes.' };
  },

  async api_restoreOrders(env, R, args) {
    const user = requireAdmin(R, 'restaurer une commande');
    const ids = run(R, () => F.idList_(args[0]));
    if (!ids.length) throw new HttpError(400, 'Cochez au moins une commande.');
    const any = await env.DB.prepare('SELECT COUNT(*) AS n FROM trash').first();
    if (!any || !any.n) throw new HttpError(400, 'La corbeille est vide.');
    const t = await env.DB.prepare('SELECT id, data FROM trash WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all();
    const found = {};
    (t.results || []).forEach((x) => { found[x.id] = JSON.parse(x.data); });
    const ex = await env.DB.prepare('SELECT id FROM orders WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all();
    const exists = {};
    (ex.results || []).forEach((x) => { exists[x.id] = true; });
    const out = { restored: [], skipped: [] };
    run(R, () => {
      ids.forEach((id) => {
        if (!found[id]) { out.skipped.push({ id: id, why: 'Commande ' + id + ' absente de la corbeille.' }); return; }
        if (exists[id]) { out.skipped.push({ id: id, why: 'La commande ' + id + ' est déjà dans l’onglet Commandes.' }); return; }
        F.appendOrders_(F.readOrders_(), [found[id]]);
        R.extra.push(env.DB.prepare('DELETE FROM trash WHERE id = ?').bind(id));
        F.log_(user, id, 'Restauration', 'Sortie de la corbeille');
        out.restored.push(id);
      });
    });
    await flush(env, R);
    out.message = F.plural_(out.restored.length, 'commande remise', 'commandes remises') + ' dans l’onglet Commandes' +
      (out.skipped.length ? ' · ' + F.plural_(out.skipped.length, 'ignorée', 'ignorées') : '') + '.';
    return out;
  },

  async api_purgeTrash(env, R, args) {
    const user = requireAdmin(R, 'vider la corbeille');
    const wanted = args[0] ? run(R, () => F.idList_(args[0])) : null;
    const t = wanted ? await env.DB.prepare('SELECT id FROM trash WHERE id IN (' + placeholders(wanted.length) + ')').bind(...wanted).all()
      : await env.DB.prepare('SELECT id FROM trash').all();
    const ids = (t.results || []).map((x) => x.id);
    if (!ids.length) return { purged: [], message: 'Rien à effacer.' };
    const now = new Date().toISOString();
    ids.forEach((id) => {
      R.extra.push(env.DB.prepare('INSERT OR REPLACE INTO blocked (id, at, by) VALUES (?, ?, ?)').bind(id, now, user.name));
      R.extra.push(env.DB.prepare('DELETE FROM trash WHERE id = ?').bind(id));
    });
    run(R, () => F.log_(user, '', 'Corbeille vidée', F.plural_(ids.length, 'commande effacée', 'commandes effacées') + ' pour de bon : ' + ids.slice(0, 20).join(', ') + (ids.length > 20 ? '…' : '')));
    await flush(env, R);
    return { purged: ids, message: F.plural_(ids.length, 'commande effacée', 'commandes effacées') + ' pour de bon. Leur n° reste bloqué : elles ne reviendront pas.' };
  }
};

function requireAdmin(R, what) {
  return run(R, () => {
    const user = F.currentUser_();
    if (!F.isAdmin_(user)) throw new HttpError(403, 'Seul un administrateur (onglet Équipe) peut ' + (what || 'voir la corbeille') + '.');
    return user;
  });
}

async function manualMax(env) {
  const r = await env.DB.batch([
    env.DB.prepare("SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS m FROM orders WHERE id GLOB 'M[0-9]*'"),
    env.DB.prepare("SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS m FROM trash WHERE id GLOB 'M[0-9]*'"),
    env.DB.prepare("SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) AS m FROM blocked WHERE id GLOB 'M[0-9]*'")
  ]);
  return Math.max(...r.map((x) => (x.results && x.results[0] && x.results[0].m) || 0));
}

/* ---------------- Tableau de bord (comptes faits par la base) ---------------- */

async function dashboard(env, R, args) {
  const period = String(args[0] || '7');
  const range = run(R, () => F.periodRange_(period, args[1], args[2]));
  const settings = run(R, () => F.getSettings_());
  const db = env.DB;
  const where = range.all ? "day <= ?" : 'archived = 0 AND day >= ? AND day <= ?';
  const wb = range.all ? [range.to] : [range.from, range.to];
  const now = new Date();
  const endOfDay = new Date(F.startOfDay_(now).getTime() + 86400000).toISOString();
  const nowIso = now.toISOString();
  const longAgo = new Date(now.getTime() - settings.ATTENTE_MAX_HEURES * 3600000).toISOString();
  const confirmed = K.CONFIRMED_STATUSES;
  const shipped = K.SHIPPED_STATUSES;
  const sparkFrom = F.addDayDays_(F.ymd_(now), -6);
  const group = (col, extra, limit) => db.prepare(
    'SELECT CASE WHEN TRIM(' + col + ") = '' THEN '—' ELSE " + col + ' END AS name, COUNT(*) AS orders, ' +
    'SUM(CASE WHEN status IN (' + placeholders(confirmed.length) + ') THEN 1 ELSE 0 END) AS confirmed, ' +
    "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS returned, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS cancelled " +
    // À égalité, l'ordre d'arrivée (comme la version Google : première commande vue d'abord).
    'FROM orders WHERE ' + where + extra[0] + ' GROUP BY name ORDER BY orders DESC, MIN(CASE WHEN archived = 1 THEN 1000000000 ELSE seq END) ASC LIMIT ' + limit
  ).bind(...confirmed, S.DELIVERED, S.RETURNED, S.CANCELLED, ...wb, ...extra[1]);

  const [byStatus, transit, todo, byWilaya, byAgent, byProduct, spark] = await db.batch([
    db.prepare('SELECT status, COUNT(*) AS n, SUM(total) AS t FROM orders WHERE ' + where + ' GROUP BY status').bind(...wb),
    db.prepare("SELECT COUNT(*) AS n, SUM(total) AS t FROM orders WHERE archived = 0 AND stage = 'transit'"),
    db.prepare('SELECT ' +
      'SUM(CASE WHEN status IN (' + placeholders(QUEUE.length) + ") AND (callback = '' OR callback <= ?) THEN 1 ELSE 0 END) AS due, " +
      'SUM(CASE WHEN status IN (' + placeholders(QUEUE.length) + ") AND callback > ? AND callback < ? THEN 1 ELSE 0 END) AS today, " +
      'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS toShip, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS unreachable, ' +
      "SUM(CASE WHEN status = ? AND COALESCE(json_extract(data, '$.attempts'), 0) IN (0, '') AND date != '' AND date < ? THEN 1 ELSE 0 END) AS waitingLong " +
      "FROM orders WHERE archived = 0 AND stage IN ('todo', 'confirmed')")
      .bind(...QUEUE, nowIso, ...QUEUE, nowIso, endOfDay, S.CONFIRMED, S.UNREACHABLE, S.TO_CONFIRM, longAgo),
    group('wilaya', [' AND status IN (' + placeholders(shipped.length) + ')', shipped], 10),
    group('agent', [" AND TRIM(agent) != '' AND status NOT IN (" + placeholders(QUEUE.length) + ')', QUEUE], 10),
    group('product', ['', []], 8),
    db.prepare('SELECT day, COUNT(*) AS received, SUM(CASE WHEN status IN (' + placeholders(confirmed.length) + ') THEN 1 ELSE 0 END) AS confirmed, ' +
      'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status = ? THEN total ELSE 0 END) AS revenue ' +
      'FROM orders WHERE archived = 0 AND day >= ? GROUP BY day').bind(...confirmed, S.DELIVERED, S.DELIVERED, sparkFrom)
  ]);

  const count = {};
  let received = 0;
  let revenueDelivered = 0;
  (byStatus.results || []).forEach((r) => {
    count[r.status] = r.n;
    received += r.n;
    if (r.status === S.DELIVERED) revenueDelivered = r.t || 0;
  });
  const sum = (list) => list.reduce((a, s) => a + (count[s] || 0), 0);
  const waiting = sum(QUEUE);
  const t = (todo.results && todo.results[0]) || {};
  const tr = (transit.results && transit.results[0]) || {};
  const keys = [];
  for (let i = 6; i >= 0; i--) keys.push(F.addDayDays_(F.ymd_(now), -i));
  const sp = { received: [0, 0, 0, 0, 0, 0, 0], confirmed: [0, 0, 0, 0, 0, 0, 0], delivered: [0, 0, 0, 0, 0, 0, 0], revenue: [0, 0, 0, 0, 0, 0, 0] };
  (spark.results || []).forEach((r) => {
    const i = keys.indexOf(r.day);
    if (i < 0) return;
    sp.received[i] = r.received; sp.confirmed[i] = r.confirmed; sp.delivered[i] = r.delivered; sp.revenue[i] = r.revenue || 0;
  });
  const clean = (rows) => (rows.results || []).map((r) => ({ name: r.name, orders: r.orders, confirmed: r.confirmed, delivered: r.delivered, returned: r.returned, cancelled: r.cancelled }));
  return {
    period: args[1] && args[2] ? 'custom' : period,
    range: { from: range.from, to: range.to, all: !!range.all },
    received: received,
    waiting: waiting,
    decided: received - waiting,
    confirmed: sum(confirmed),
    shipped: sum(shipped),
    delivered: count[S.DELIVERED] || 0,
    returned: count[S.RETURNED] || 0,
    cancelled: count[S.CANCELLED] || 0,
    unreachable: count[S.UNREACHABLE] || 0,
    revenueDelivered: revenueDelivered,
    inTransitAmount: tr.t || 0,
    inTransitCount: tr.n || 0,
    todo: {
      toConfirm: t.due || 0, callbacksToday: t.today || 0, toShip: t.toShip || 0, unreachable: t.unreachable || 0,
      waitingLong: t.waitingLong || 0, parcelAlerts: 0, stockLow: 0
    },
    byWilaya: clean(byWilaya),
    byAgent: clean(byAgent),
    byProduct: clean(byProduct),
    spark: sp,
    generatedAt: now.toISOString()
  };
}

/* ---------------- Liste des commandes (recherche faite par la base) ---------------- */

async function listOrders(env, R, filter) {
  const db = env.DB;
  const conds = ['archived = 0'];
  const binds = [];
  const period = String(filter.period || '30');
  if (period !== 'all') {
    const since = run(R, () => {
      const d = F.periodStart_(period, new Date()); // minuit à l'heure d'Algérie
      return d ? F.ymd_(d) : '';
    });
    if (since) { conds.push('day >= ?'); binds.push(since); }
  }
  if (filter.wilaya) {
    const code = run(R, () => F.wilayaCode_(filter.wilaya));
    if (code) { conds.push("(wilaya LIKE ? OR wilaya = ?)"); binds.push(('0' + code).slice(-2) + ' -%', String(filter.wilaya)); }
  }
  const qText = String(filter.q || '').trim();
  if (qText) {
    const qn = F.normalizeText_(qText);
    const digits = qText.replace(/\D/g, '');
    const parts = [];
    if (qn) { parts.push('search LIKE ?'); binds.push('%' + qn + '%'); }
    parts.push('search LIKE ?'); binds.push('%' + qText.toLowerCase() + '%');
    if (digits.length >= 4) { parts.push('search LIKE ?'); binds.push('%' + digits + '%'); }
    conds.push('(' + parts.join(' OR ') + ')');
  }
  const base = conds.join(' AND ');
  const status = String(filter.status || 'all');
  const limit = Math.min(Math.max(Math.round(Number(filter.limit)) || 100, 1), 1000);
  let rowWhere = base;
  const rowBinds = binds.slice();
  if (status === 'queue') { rowWhere += ' AND status IN (' + placeholders(QUEUE.length) + ')'; rowBinds.push(...QUEUE); }
  else if (status === 'todo') { rowWhere += " AND stage = 'todo'"; }
  else if (status !== 'all') { rowWhere += ' AND status = ?'; rowBinds.push(status); }
  const [cnt, rows] = await db.batch([
    db.prepare('SELECT status, stage, COUNT(*) AS n FROM orders WHERE ' + base + ' GROUP BY status, stage').bind(...binds),
    db.prepare('SELECT id, rev, data FROM orders WHERE ' + rowWhere + ' ORDER BY date DESC, seq DESC LIMIT ?').bind(...rowBinds, limit)
  ]);
  const counts = { all: 0, queue: 0, todo: 0 };
  (cnt.results || []).forEach((r) => {
    const key = r.status || '—';
    counts[key] = (counts[key] || 0) + r.n;
    counts.all += r.n;
    if (QUEUE.indexOf(r.status) >= 0) counts.queue += r.n;
    if (r.stage === 'todo') counts.todo += r.n;
  });
  const total = status === 'all' ? counts.all : status === 'queue' ? counts.queue : status === 'todo' ? counts.todo : (counts[status] || 0);
  const list = (rows.results || []).map(toOrder);
  const out = run(R, () => list.map((o) => F.serializeOrder_(o)));
  const res = { rows: out, total: total, counts: counts, arrived: 0 };
  if (filter.withStatus) res.importStatus = await PAGES.api_importStatus();
  return res;
}

/* ================================================================ */
/* Pont avec Apps Script (clé partagée)                             */
/* ================================================================ */

async function bridge(request, env, path) {
  const db = env.DB;
  const kv = await db.prepare("SELECT key, value FROM kv WHERE key LIKE 'cf:%'").all();
  const cf = {};
  (kv.results || []).forEach((r) => { cf[r.key] = r.value; });
  const given = request.headers.get('x-dz-key') || '';
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

  if (path === '/bridge/register') {
    const secret = String(body.secret || '');
    if (secret.length < 32) throw new HttpError(400, 'Clé trop courte.');
    // Premier contact : la clé est enregistrée. Ensuite, seule l'ancienne clé permet d'en changer.
    if (cf['cf:secret'] && !sameText(given, cf['cf:secret'])) throw new HttpError(403, 'Cette application Cloudflare est déjà reliée à un autre classeur.');
    await db.batch([
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:secret', secret),
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:gateway', String(body.gateway || '')),
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:shop', String(body.shop || ''))
    ]);
    return { ok: true };
  }
  if (!cf['cf:secret'] || !sameText(given, cf['cf:secret'])) throw new HttpError(403, 'Clé refusée.');

  if (path === '/bridge/status') {
    const r = await db.batch([
      db.prepare('SELECT COUNT(*) AS n FROM orders WHERE archived = 0'),
      db.prepare('SELECT COUNT(*) AS n FROM orders WHERE archived = 1'),
      db.prepare('SELECT COUNT(*) AS n FROM trash'),
      db.prepare("SELECT value FROM kv WHERE key = 'cf:imported'")
    ]);
    return { orders: r[0].results[0].n, archived: r[1].results[0].n, trash: r[2].results[0].n, importedAt: r[3].results[0] ? r[3].results[0].value : '' };
  }

  if (path === '/bridge/import') {
    const st = [];
    if (body.reset) {
      ['orders', 'trash', 'blocked', 'changes', 'journal', 'guard'].forEach((t) => st.push(db.prepare('DELETE FROM ' + t)));
      st.push(db.prepare("DELETE FROM kv WHERE key NOT LIKE 'cf:%'"));
    }
    Object.keys(body.config || {}).forEach((k) => {
      st.push(db.prepare('INSERT INTO config (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
        .bind(k, String(body.config[k]), new Date().toISOString()));
    });
    Object.keys(body.kv || {}).forEach((k) => {
      if (k.indexOf('cf:') === 0) return;
      st.push(db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, String(body.kv[k])));
    });
    // Toutes les commandes du paquet en une seule instruction (json_each) : D1 limite le nombre d'instructions par requête.
    const rows = [];
    (body.orders || []).forEach((o, i) => { const r = rowOf(o); if (r.id) { r.seq = (Number(body.seqFrom) || 0) + i + 1; r.archived = 0; rows.push(r); } });
    (body.archive || []).forEach((o) => { const r = rowOf(o); if (r.id) { r.seq = 0; r.archived = 1; rows.push(r); } });
    if (rows.length) {
      const cols = ['id', 'seq', 'archived'].concat(ROW_COLS);
      st.push(db.prepare('INSERT OR REPLACE INTO orders (rev, ' + cols.join(', ') + ') SELECT 0, ' +
        cols.map((c) => "json_extract(value, '$." + c + "')").join(', ') + ' FROM json_each(?)').bind(JSON.stringify(rows)));
    }
    const trash = (body.trash || []).filter((t) => t && t.order && t.order.id).map((t) => ({
      id: String(t.order.id), data: JSON.stringify(plain(t.order)), at: isoOf(t.deletedAt) || new Date().toISOString(), by: String(t.deletedBy || ''), reason: String(t.reason || '')
    }));
    if (trash.length) {
      st.push(db.prepare("INSERT OR REPLACE INTO trash (id, data, deleted_at, deleted_by, reason) SELECT json_extract(value, '$.id'), json_extract(value, '$.data'), " +
        "json_extract(value, '$.at'), json_extract(value, '$.by'), json_extract(value, '$.reason') FROM json_each(?)").bind(JSON.stringify(trash)));
    }
    const blocked = (body.blocked || []).filter((id) => id).map((id) => String(id));
    if (blocked.length) {
      st.push(db.prepare("INSERT OR REPLACE INTO blocked (id, at, by) SELECT value, ?, 'Import' FROM json_each(?)").bind(new Date().toISOString(), JSON.stringify(blocked)));
    }
    if (body.done) st.push(db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('cf:imported', new Date().toISOString()));
    if (st.length) await db.batch(st);
    return { ok: true, written: st.length };
  }
  throw new HttpError(404, 'Inconnu.');
}

/* ================================================================ */
/* Point d'entrée                                                   */
/* ================================================================ */

async function api(request, env, fn) {
  if (request.method !== 'POST') throw new HttpError(405, 'Méthode non permise.');
  const base = await loadBase(env);
  const auth = request.headers.get('authorization') || '';
  const user = await verifyToken(auth.replace(/^Bearer\s+/i, ''), base.secret['cf:secret']);
  if (!user) throw new HttpError(401, 'Connexion expirée : reconnectez-vous.', 'auth');
  const R = newReq(base, user);
  // Seuls les membres de l'onglet Équipe (et le propriétaire du classeur) entrent.
  const owner = String(base.props.OWNER_EMAIL || '').toLowerCase();
  const team = run(R, () => F.readTeam_());
  if (user.email !== owner && !team.some((t) => t[0] === user.email)) {
    throw new HttpError(403, 'Votre adresse n’est pas dans l’onglet Équipe du classeur. Demandez à l’administrateur de vous ajouter.', 'auth');
  }
  R.userName = userName(R);
  const handler = PAGES[fn];
  if (!handler) throw new HttpError(404, 'Cette page n’est pas encore dans la version Cloudflare (étape 2).', 'later');
  let args = [];
  try { args = await request.json(); } catch (e) { args = []; }
  if (!Array.isArray(args)) args = [];
  return handler(env, R, args);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/auth/info') {
        const r = await env.DB.prepare("SELECT key, value FROM kv WHERE key IN ('cf:gateway', 'cf:shop', 'cf:imported')").all();
        const kv = {};
        (r.results || []).forEach((x) => { kv[x.key] = x.value; });
        return json({ ok: true, data: { gateway: kv['cf:gateway'] || '', shop: kv['cf:shop'] || 'DZ Smart Shop', ready: !!kv['cf:imported'], version: K.APP_VERSION } });
      }
      if (path.indexOf('/api/') === 0) return json({ ok: true, data: await api(request, env, path.slice(5)) });
      if (path.indexOf('/bridge/') === 0) return json({ ok: true, data: await bridge(request, env, path) });
      return env.ASSETS.fetch(request);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const code = e instanceof HttpError ? e.code : '';
      // Erreurs de l'outil (« déjà traitée »…) et pages pas encore portées : réponse normale (200) avec ok: false.
      const http = !(e instanceof HttpError) || code === 'later' ? 200 : status;
      return json({ ok: false, error: String(e && e.message ? e.message : e), code: code }, http);
    }
  }
};

export { stageOf, rowOf, plain, hmac, b64urlText, verifyToken };
