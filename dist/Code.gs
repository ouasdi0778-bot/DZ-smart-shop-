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
  ['DOUBLON_HEURES', 48, 'Deux commandes du même numéro dans ce délai = alerte « Doublon »'],
  ['SOCIETE_PAR_DEFAUT', 'Yalidine', "Société utilisée pour calculer les frais quand aucune n'est choisie"],
  ['MOTIFS_ANNULATION', "Faux numéro; Client a changé d'avis; Trop cher; Doublon; Commande test; Délai trop long; Autre", "Motifs proposés à l'annulation, séparés par des points-virgules"],
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
  ['CATEGORIES_DEPENSES', 'Publicité Facebook; Publicité TikTok; Emballage; Salaires; Loyer; Autre', 'Catégories proposées dans l’onglet Dépenses, séparées par des points-virgules'],
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
  ['ARCHIVE_JOURS', 100, "Chaque nuit, les commandes terminées sans mouvement depuis ce nombre de jours partent dans l'onglet Archive (une commande livrée dont l'argent n'est pas encore versé reste). 0 = ne jamais archiver"],
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
    return withLogBatch_(fn);
  } finally {
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
  s.FRAIS_RETOUR = Math.max(0, toNumber_(s.FRAIS_RETOUR));
  s.COUT_EMBALLAGE = Math.max(0, toNumber_(s.COUT_EMBALLAGE));
  s.TAUX_DOLLAR = Math.max(0, toNumber_(s.TAUX_DOLLAR));
  s.STOCK_SEUIL = Math.max(0, Math.round(toNumber_(s.STOCK_SEUIL)));
  s.COUT_MOYEN = !/^(non|no|false|faux|0)$/i.test(String(s.COUT_MOYEN == null ? 'OUI' : s.COUT_MOYEN).trim());
  s.categories = String(s.CATEGORIES_DEPENSES || '').split(';').map(function (c) { return c.trim(); }).filter(function (c) { return c; });
  if (!s.categories.length) s.categories = ['Autre'];
  // Heures d'envoi des SMS : « 8-21 » ; vide ou illisible = à toute heure.
  var hours = String(s.SMS_HEURES || '').match(/(\d{1,2})\D+(\d{1,2})/);
  s.smsFrom = hours ? Math.min(+hours[1], 23) : 0;
  s.smsTo = hours ? Math.min(Math.max(+hours[2], s.smsFrom + 1), 24) : 24;
  s.JOURNAL_JOURS = days(s.JOURNAL_JOURS);
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

/** Valeur gardée en mémoire (CacheService) ; calculée par compute() si absente. */
function cached_(key, compute) {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) { cache = null; }
  if (cache) {
    var hit = null;
    try { hit = cache.get(key); } catch (e) { hit = null; }
    if (hit !== null && hit !== undefined) {
      try { return JSON.parse(hit); } catch (e) { /* valeur abîmée : on relit l'onglet */ }
    }
  }
  var value = compute();
  if (cache) {
    try {
      var text = JSON.stringify(value);
      if (text.length < 90000) cache.put(key, text, CONFIG_TTL_);
    } catch (e) { /* trop gros ou mémoire indisponible : sans importance */ }
  }
  return value;
}

/** Vide la mémoire (toute, ou seulement certaines clés). */
function clearConfigCache_(keys) {
  try { CacheService.getScriptCache().removeAll(keys || allConfigKeys_()); } catch (e) { /* sans importance */ }
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

/**
 * Écrit seulement les cases modifiées d'une commande, en regroupant les
 * cases voisines : une seule écriture par groupe au lieu d'une par case.
 */
function writeFields_(ctx, order, fields) {
  if (fields.status !== undefined && String(fields.status) !== String(order.status)) noteStatusChange_(order, fields.status);
  var cells = [];
  Object.keys(fields).forEach(function (key) {
    order[key] = fields[key];
    var idx = ctx.map[key];
    if (idx !== undefined) cells.push({ col: idx, key: key, value: fields[key] });
  });
  if (!cells.length) return;
  cells.sort(function (a, b) { return a.col - b.col; });
  var write = function (run) {
    run.forEach(function (c) {
      if (TEXT_KEYS_.indexOf(c.key) >= 0) ctx.sheet.getRange(order._row, c.col + 1).setNumberFormat('@');
    });
    ctx.sheet.getRange(order._row, run[0].col + 1, 1, run.length).setValues([run.map(function (c) { return c.value; })]);
  };
  var run = [cells[0]];
  for (var i = 1; i < cells.length; i++) {
    if (cells[i].col === run[run.length - 1].col + 1) run.push(cells[i]);
    else { write(run); run = [cells[i]]; }
  }
  write(run);
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
        if (raw && raw !== String(o.carrierStatus)) {
          f.carrierStatus = raw;
          // Le premier statut lu ne remet pas à zéro l'horloge du colis (date de création).
          if (!isBlank_(o.carrierStatus) || isBlank_(o.carrierMoved)) f.carrierMoved = now;
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
            f.deliveredAt = now;
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

/* ======================= Tracking.gs ======================= */

/**
 * Tracking.gs : page « Suivi » des colis Ecotrack.
 *
 *  - colis en cours (statut en direct, relu toutes les 30 minutes) ;
 *  - alertes « à traiter » : colis suspendu, retour en cours, retour bloqué,
 *    sans mouvement (délai selon l'étape et le Sud), créé mais pas validé,
 *    argent en retard, introuvable, statut inconnu ; le résultat de l'appel au
 *    client et les remarques du livreur sont dans FollowUp.gs ;
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
    raw: events.length ? '' : JSON.stringify(json).slice(0, 2000),
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

  var m = trackingMoney_(ctx.orders, now, days);
  return {
    finished: finished.slice(0, 300),
    finishedTotal: finished.length,
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

/* ======================= Labels.gs ======================= */

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

/* ======================= FollowUp.gs ======================= */

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
    var d = toDate_(rawDate);
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
    var extra = {};
    extra[TRASH.EXTRA[0]] = new Date();
    extra[TRASH.EXTRA[1]] = user.name;
    extra[TRASH.EXTRA[2]] = why;
    appendArchiveRows_(sh, [rowForHeader_(titles, values, header, extra)]);
    ctx.sheet.deleteRow(o._row);
    log_(user, o.id, 'Suppression', 'Mise à la corbeille' + (why ? ' · Motif : ' + why : ''));
    ctx.orders = ctx.orders.filter(function (x) { return x !== o; });
    return { id: String(o.id), counts: countsData_(ctx, null), message: 'Commande ' + o.id + ' mise à la corbeille.' };
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
  return { rows: rows };
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

/* ======================= Maintenance.gs ======================= */

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
  var keys = ['id', 'date', 'status', 'total', 'wilaya', 'agent', 'product', 'qty', 'price', 'carrier', 'mode', 'shipping', 'campaign', 'adSource', 'carrierStatus', 'tracking'];
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
  var out = { archived: 0, journal: 0, rows: 0, autoCancelled: 0, errors: [] };
  var step = function (name, fn) {
    try { fn(); } catch (e) { out.errors.push(name + ' : ' + (e && e.message ? e.message : e)); }
  };
  step('appels', function () { out.autoCancelled = autoCancelUnreachable_(); });
  step('stock', function () { withLock_(function () { applyStockMoves_(readOrders_()); }); });
  step('archivage', function () { out.archived = archiveOldOrders_().archived; });
  step('journal', function () { out.journal = trimJournal_(getSettings_().JOURNAL_JOURS); });
  step('allègement', function () { out.rows = lightenSheets_(); });
  if (out.errors.length) log_({ name: 'Automatique' }, '', 'Erreur maintenance', out.errors.join(' · '));
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

/* ======================= Stock.gs ======================= */

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
function api_stockPage() {
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

/* ======================= Profit.gs ======================= */

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
 * Bénéfice net = bénéfice des commandes − dépenses de la période.
 *
 * Onglet Dépenses : Date | Catégorie | Campagne | Montant | Devise (DA ou USD) | Taux | Note.
 * Une dépense en dollars reçoit le taux du jour (TAUX_DOLLAR) la première fois
 * qu'elle est lue : changer le taux plus tard ne modifie pas les anciennes dépenses.
 */

var EXPENSE_TITLES_ = ['Date', 'Catégorie', 'Campagne', 'Montant', 'Devise', 'Taux', 'Note'];
var CURRENCIES_ = ['DA', 'USD'];

function setupExpensesSheet_(ss) {
  var sh = setupSimpleSheet_(ss, SHEET.EXPENSES, EXPENSE_TITLES_, [110, 170, 220, 110, 80, 80, 260]);
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normalizeText_);
  var col = function (t) { return header.indexOf(normalizeText_(t)) + 1; };
  var n = dataRows_(sh);
  var list = function (values) { return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build(); };
  sh.getRange(2, col('Date'), n, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, col('Montant'), n, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, col('Taux'), n, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, col('Catégorie'), n, 1).setDataValidation(list(getSettings_().categories));
  sh.getRange(2, col('Devise'), n, 1).setDataValidation(list(CURRENCIES_));
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
  return { sh: sh, header: header, c: { date: col('Date'), category: col('Catégorie'), campaign: col('Campagne'), amount: col('Montant'), currency: col('Devise'), rate: col('Taux'), note: col('Note') } };
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
    out.push({
      row: i + 2,
      date: c.date >= 0 ? toDate_(r[c.date]) : null,
      category: category || 'Autre',
      campaign: c.campaign >= 0 ? String(r[c.campaign]).replace(/\s+/g, ' ').trim() : '',
      amount: amount,
      currency: usd ? 'USD' : 'DA',
      rate: usd ? (rate || settings.TAUX_DOLLAR) : null,
      rateMissing: usd && !rate,
      amountDA: usd ? amount * (rate || settings.TAUX_DOLLAR) : amount,
      note: c.note >= 0 ? String(r[c.note]).trim() : '',
      ad: isAdCategory_(category),
      platform: adPlatform_(category)
    });
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
  return g;
}

/** Tout ce que montre la page Bénéfices pour une période. */
function profitData_(ctx, env, period) {
  var now = new Date();
  var since = periodStart_(period || '30', now);
  var catalog = readCatalog_();
  var orders = ctx.orders.filter(function (o) {
    if (!since) return true;
    var d = toDate_(o.date);
    return d && d >= since;
  });
  if (!since) orders = orders.concat(readArchivedOrders_());
  var expenses = readExpenses_(env.settings).filter(function (e) { return !since || (e.date && e.date >= since); });

  var t = { orders: 0, confirmed: 0, delivered: 0, returned: 0, inTransit: 0, cancelled: 0, revenue: 0, productSales: 0, clientShipping: 0,
    deliveryFees: 0, deliveryNet: 0, productCost: 0, returnFees: 0, packaging: 0, ordersProfit: 0, expenses: 0, adSpend: 0 };
  var warn = { missingCost: 0, missingFee: 0, missingCostLabels: {} };
  var products = {};
  var campaigns = {};
  var platforms = {};
  var group = function (map, key, name) { return map[key] || (map[key] = emptyGroup_(name)); };

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
      if (p.missingCost) {
        warn.missingCost++;
        p.items.forEach(function (it) { if (it.cost === null) warn.missingCostLabels[it.label] = true; });
      }
      if (p.missingFee) warn.missingFee++;
    }
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
  var unassigned = 0;
  expenses.forEach(function (e) {
    t.expenses += e.amountDA;
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amountDA;
    if (!e.ad) return;
    t.adSpend += e.amountDA;
    var ck = normalizeLoose_(e.campaign);
    if (ck) group(campaigns, ck, e.campaign).spend += e.amountDA;
    else unassigned += e.amountDA;
    if (e.platform) group(platforms, normalizeLoose_(e.platform), e.platform).spend += e.amountDA;
  });

  var list = function (map) {
    return Object.keys(map).map(function (k) { return finishGroup_(map[k]); })
      .sort(function (a, b) { return (b.orders - a.orders) || (b.spend - a.spend); });
  };
  Object.keys(t).forEach(function (k) { t[k] = Math.round(t[k]); });
  t.net = t.ordersProfit - t.expenses;
  t.deliveryRate = t.delivered + t.returned ? t.delivered / (t.delivered + t.returned) : null;
  t.costPerDelivered = t.adSpend && t.delivered ? Math.round(t.adSpend / t.delivered) : null;

  var known = {};
  ctx.orders.forEach(function (o) { var c = String(o.campaign || '').trim(); if (c) known[c] = true; });
  return {
    period: period || '30',
    totals: t,
    expensesByCategory: Object.keys(byCategory).map(function (k) { return { category: k, amount: Math.round(byCategory[k]) }; })
      .sort(function (a, b) { return b.amount - a.amount; }),
    adUnassigned: Math.round(unassigned),
    products: list(products),
    campaigns: list(campaigns),
    platforms: list(platforms),
    expenses: expenses.slice().sort(function (a, b) { return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0); })
      .slice(0, 200).map(function (e) {
        return { date: iso_(e.date), category: e.category, campaign: e.campaign, amount: e.amount, currency: e.currency,
          rate: e.rate, amountDA: Math.round(e.amountDA), note: e.note, ad: e.ad };
      }),
    warnings: { missingCost: warn.missingCost, missingFee: warn.missingFee, missingCostLabels: Object.keys(warn.missingCostLabels).slice(0, 20) },
    categories: env.settings.categories,
    knownCampaigns: Object.keys(known).sort(),
    rate: env.settings.TAUX_DOLLAR,
    returnFee: env.settings.FRAIS_RETOUR
  };
}

/** Page Bénéfices (administrateur). */
function api_profit(period) {
  requireAdmin_();
  var settings = getSettings_();
  if (expensesNeedRate_(settings)) withLock_(function () { fillExpenseRates_(settings); });
  var ctx = readOrders_();
  return profitData_(ctx, makeEnv_(ctx), period);
}

function expensesNeedRate_(settings) {
  return readExpenses_(settings).some(function (e) { return e.rateMissing; });
}

/** Ajoute une dépense depuis l'application (le taux du jour est écrit pour une dépense en dollars). */
function api_addExpense(input) {
  var user = requireAdmin_();
  input = input || {};
  var settings = getSettings_();
  var amount = toNumber_(input.amount);
  if (!(amount > 0)) throw new Error('Indiquez un montant.');
  var usd = isUsd_(input.currency);
  var rate = usd ? (toNumber_(input.rate) > 0 ? toNumber_(input.rate) : settings.TAUX_DOLLAR) : '';
  if (usd && !(rate > 0)) throw new Error('Indiquez le taux du dollar (réglage TAUX_DOLLAR dans Paramètres).');
  var date = toDate_(input.date) || new Date();
  var category = String(input.category || '').trim() || 'Autre';
  return withLock_(function () {
    var sh = ss_().getSheetByName(SHEET.EXPENSES) || setupExpensesSheet_(ss_());
    ensureHeaders_(sh, EXPENSE_TITLES_);
    var info = expensesSheetInfo_();
    var values = {};
    values.date = date;
    values.category = category;
    values.campaign = String(input.campaign || '').replace(/\s+/g, ' ').trim();
    values.amount = amount;
    values.currency = usd ? 'USD' : 'DA';
    values.rate = rate;
    values.note = String(input.note || '').trim();
    var row = info.header.map(function () { return ''; });
    Object.keys(info.c).forEach(function (k) { if (info.c[k] >= 0) row[info.c[k]] = values[k]; });
    var r = sh.getLastRow() + 1;
    ensureRows_(sh, r);
    sh.getRange(r, 1, 1, row.length).setValues([row]);
    log_(user, '', 'Dépense', category + (values.campaign ? ' · ' + values.campaign : '') + ' · ' + amount + ' ' + values.currency);
    return { message: 'Dépense ajoutée : ' + fmtAmount_(usd ? amount * rate : amount) + ' DA.' };
  });
}

/* ======================= Sms.gs ======================= */

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
    installTriggers_();
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

/* ======================= Calls.gs ======================= */

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

/**
 * À chaque modification faite à la main dans le classeur : si c'est un onglet
 * de réglages (Paramètres, Tarifs, Équipe, Clients, Produits), la mémoire est
 * vidée pour que l'application voie tout de suite le changement.
 */
function onEdit(e) {
  try {
    var name = e && e.range ? e.range.getSheet().getName() : '';
    var keys = configKeysFor_(name);
    if (keys.length) clearConfigCache_(keys);
  } catch (err) {
    // Ne doit jamais gêner la saisie.
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu(APP_NAME)
    .addItem('Ouvrir l’application', 'menuOpenApp')
    .addSeparator()
    .addItem('Traiter les nouvelles commandes', 'menuProcess')
    .addItem('Recalculer les alertes clients', 'menuRecalc')
    .addItem('Restaurer une commande de la corbeille', 'menuTrashRestore')
    .addItem('Archiver et alléger le classeur maintenant', 'menuMaintenance')
    .addSeparator()
    .addSubMenu(ui.createMenu('Releasit')
      .addItem('Transférer les commandes maintenant', 'menuReleasitTransfer')
      .addItem('Vérifier les colonnes de l’onglet RELEASIT', 'menuReleasitCheck'))
    .addSubMenu(ui.createMenu('SMS (httpSMS)')
      .addItem('Enregistrer la clé et le numéro', 'menuSmsSetup')
      .addItem('Envoyer un SMS de test', 'menuSmsTest')
      .addItem('Envoyer les SMS en attente maintenant', 'menuSmsSend'))
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
function api_bootstrap(preload) {
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

function api_dashboard(period) {
  return dashboardData_(readOrders_(), period);
}

function dashboardData_(ctx, period) {
  var now = new Date();
  var since = periodStart_(period || '7', now);
  var inPeriod = ctx.orders.filter(function (o) {
    if (!since) return true;
    var d = toDate_(o.date);
    return d && d >= since;
  });
  // Sur « Tout », les commandes archivées comptent aussi (elles sont toutes terminées).
  if (!since) inPeriod = inPeriod.concat(readArchivedOrders_());
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
      waitingLong: ctx.orders.filter(function (o) { return neverCalledLong_(o, now); }).length,
      parcelAlerts: trackingAlerts_(ctx.orders, getSettings_(), now).filter(function (a) { return a.level !== 'info'; }).length,
      stockLow: canSeeStock_(currentUser_()) ? stockData_(ctx, getSettings_()).low : 0
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
    alertLevel: alertLevel_(o.alert),
    waitingLong: neverCalledLong_(o, new Date())
  };
}

/** Commande jamais appelée, arrivée depuis plus de 24 h. */
function neverCalledLong_(o, now) {
  var d = toDate_(o.date);
  return o.status === STATUS.TO_CONFIRM && !(toNumber_(o.attempts) > 0) && !!d && now.getTime() - d.getTime() > 24 * 3600000;
}

/** File d'appels : à appeler maintenant (due) et rappels programmés plus tard (later). */
/** opts.sync : vérifie d'abord l'onglet RELEASIT ; opts.first : joint la fiche de la première commande à appeler. */
function api_queue(opts) {
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
  var recentFirst = getSettings_().ORDRE_FILE !== 'anciennes';
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

  return {
    due: due.map(function (x) { return queueItem_(x.o); }),
    later: later.map(function (x) { return queueItem_(x.o); }),
    stats: { due: due.length, later: later.length, pending: pendingCount_(ctx), handledToday: mine.handled, confirmedToday: mine.confirmed },
    now: now.toISOString()
  };
}

/** Une commande avec l'historique du client. */
function api_getOrder(id) {
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
 * payload : { fields: {client, wilaya, commune, address, mode, qty, notes}, callback: date ISO, reason: motif }
 */
function api_recordCall(id, outcome, payload, opts) {
  payload = payload || {};
  opts = opts || {};
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
      var plan = noAnswerFields_(o, env);
      Object.keys(plan.fields).forEach(function (k) { f[k] = plan.fields[k]; });
      detail = plan.detail;
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
    // En un seul aller-retour : la commande suivante, la file à jour et les compteurs.
    var res = serializeOrder_(o);
    if (opts.next) {
      var next = findOrder_(ctx, opts.next);
      if (next && QUEUE_STATUSES.indexOf(next.status) >= 0) {
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
function installTriggers_() {
  var handlers = ['processNewRows', 'syncEcotrackStatuses', 'importShopifyOrders', 'transferReleasitOrders', 'nightlyMaintenance', 'sendSmsQueue'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  if (ss_().getSheetByName(RELEASIT.SHEET)) ScriptApp.newTrigger('transferReleasitOrders').timeBased().everyMinutes(1).create();
  if (shopifyConfig_().configured) ScriptApp.newTrigger('importShopifyOrders').timeBased().everyMinutes(5).create();
  if (smsConfig_().configured) ScriptApp.newTrigger('sendSmsQueue').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('processNewRows').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('syncEcotrackStatuses').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('nightlyMaintenance').timeBased().everyDays(1).atHour(3).create();
}

/* ======================= Pages HTML ======================= */

var HTML_FILES_ = {
  Index: "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap\" rel=\"stylesheet\">\n  <?!= include('Styles'); ?>\n</head>\n<body>\n  <div class=\"app\">\n    <aside class=\"sidebar\" aria-label=\"Navigation principale\">\n      <div class=\"brand\">\n        <span class=\"brand-name\" data-shop>DZ Smart Shop</span>\n        <span class=\"brand-sub\">Gestion des commandes COD</span>\n      </div>\n      <nav class=\"nav\">\n        <a href=\"#/tableau\" data-route=\"tableau\">Tableau de bord</a>\n        <a href=\"#/commandes\" data-route=\"commandes\">Commandes</a>\n        <a href=\"#/confirmation\" data-route=\"confirmation\">Confirmation <span class=\"badge\" data-queue-count hidden></span></a>\n        <a href=\"#/expeditions\" data-route=\"expeditions\">Expédier <span class=\"badge\" data-ship-count hidden></span></a>\n        <a href=\"#/suivi\" data-route=\"suivi\">Suivi <span class=\"badge\" data-alert-count hidden></span></a>\n        <a href=\"#/benefices\" data-route=\"benefices\" data-admin hidden>Bénéfices</a>\n        <a href=\"#/stock\" data-route=\"stock\" data-stockrole hidden>Stock</a>\n      </nav>\n      <div class=\"side-user\">\n        <span class=\"side-user-name\" data-user-name></span>\n        <span class=\"side-user-mail\" data-user-mail></span>\n      </div>\n    </aside>\n\n    <div class=\"main\">\n      <header class=\"mobile-top\">\n        <span class=\"brand-name\" data-shop>DZ Smart Shop</span>\n        <span class=\"mobile-user\" data-user-name></span>\n      </header>\n      <main id=\"view\" class=\"content\" tabindex=\"-1\">\n        <p class=\"loading\">Chargement…</p>\n      </main>\n    </div>\n  </div>\n\n  <nav class=\"bottom-nav\" aria-label=\"Navigation\">\n    <a href=\"#/tableau\" data-route=\"tableau\">Tableau</a>\n    <a href=\"#/commandes\" data-route=\"commandes\">Commandes</a>\n    <a href=\"#/confirmation\" data-route=\"confirmation\">Confirmer <span class=\"badge\" data-queue-count hidden></span></a>\n    <a href=\"#/expeditions\" data-route=\"expeditions\">Expédier <span class=\"badge\" data-ship-count hidden></span></a>\n    <a href=\"#/suivi\" data-route=\"suivi\">Suivi <span class=\"badge\" data-alert-count hidden></span></a>\n    <button type=\"button\" class=\"more-btn\" data-act=\"more-menu\" data-more hidden aria-label=\"Plus de pages\">☰ Plus</button>\n  </nav>\n\n  <div id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n  <div id=\"modal-root\"></div>\n\n  <?!= include('App'); ?>\n</body>\n</html>\n",
  Styles: "<style>\n  :root {\n    --bg: #F4F5F7;\n    --surface: #FFFFFF;\n    --ink: #15181E;\n    --ink-2: #3D4350;\n    --muted: #5B6270;\n    --line: #E2E5EA;\n    --line-2: #CFD4DB;\n    --soft: #F8F9FA;\n    --brand: #0B6B4C;\n    --brand-dark: #084F38;\n    --side: #10241C;\n    --side-ink: #D5E2DC;\n    --side-muted: #A9C2B7;\n    --side-active: #1F4A39;\n    --accent: #F2B25C;\n    --radius: 12px;\n    --font: Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n    --font-title: \"Space Grotesk\", Inter, system-ui, sans-serif;\n  }\n  * { box-sizing: border-box; }\n  html, body { margin: 0; background: var(--bg); color: var(--ink); font: 400 14px/1.45 var(--font); }\n  h1, h2, h3, p { margin: 0; }\n  h1 { font: 700 26px/1.2 var(--font-title); }\n  h2 { font-size: 16px; font-weight: 600; }\n  h3 { font-size: 15px; font-weight: 600; }\n  button, input, select, textarea { font: inherit; color: inherit; }\n  a { color: var(--brand); }\n  [hidden] { display: none !important; }\n  :focus-visible { outline: 3px solid #7FB8A2; outline-offset: 2px; }\n\n  /* Structure */\n  .app { display: flex; min-height: 100vh; }\n  .sidebar {\n    width: 232px; flex: 0 0 232px; background: var(--side); padding: 22px 14px;\n    display: flex; flex-direction: column; gap: 4px; position: sticky; top: 0; height: 100vh;\n  }\n  .brand { display: flex; flex-direction: column; gap: 2px; padding: 0 12px 22px; }\n  .brand-name { font: 700 19px var(--font-title); color: #FFFFFF; }\n  .brand-sub { font-size: 12px; color: var(--side-muted); }\n  .nav { display: flex; flex-direction: column; gap: 4px; }\n  .nav a {\n    display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 12px;\n    border-radius: 8px; color: var(--side-ink); text-decoration: none; font-weight: 500;\n  }\n  .nav a:hover { background: #18352A; }\n  .nav a.active { background: var(--side-active); color: #FFFFFF; font-weight: 600; }\n  .badge { background: var(--accent); color: var(--side); font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }\n  .side-user { margin-top: auto; padding: 12px; border-top: 1px solid #2A4A3D; display: flex; flex-direction: column; gap: 2px; }\n  .side-user-name { color: #FFFFFF; font-weight: 600; }\n  .side-user-mail { color: var(--side-muted); font-size: 12px; overflow-wrap: anywhere; }\n  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }\n  .mobile-top { display: none; }\n  .content { padding: 26px 30px 60px; outline: none; }\n  .bottom-nav { display: none; }\n\n  /* Éléments communs */\n  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 18px; }\n  .sub { color: var(--muted); margin-top: 4px; }\n  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }\n  .card > h2, .card > h3 { margin-bottom: 12px; }\n  .stack { display: flex; flex-direction: column; gap: 16px; }\n  .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }\n  .row > * { flex: 1 1 340px; min-width: 0; }\n  .grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }\n  .kpi { display: flex; flex-direction: column; gap: 6px; }\n  .kpi .label { color: var(--muted); font-size: 13px; font-weight: 500; }\n  .kpi .value { font: 700 28px/1.1 var(--font-title); }\n  .kpi .note { color: var(--muted); font-size: 13px; }\n  .small { font-size: 12px; color: var(--muted); }\n  .muted { color: var(--muted); }\n  .strong { font-weight: 600; }\n  .loading, .empty { color: var(--muted); padding: 36px 0; text-align: center; }\n  .error-box { background: #FBE7E7; color: #A12626; border-radius: 10px; padding: 14px 16px; font-weight: 600; }\n\n  .btn {\n    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px;\n    border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink);\n    font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap;\n  }\n  .btn:hover { background: var(--soft); }\n  .btn.primary { background: var(--brand); border-color: var(--brand); color: #FFFFFF; }\n  .btn.primary:hover { background: var(--brand-dark); }\n  .btn.warn { background: #FFF3DC; border-color: #E8B45C; color: #8A5200; }\n  .btn.danger { background: #FBE7E7; border-color: #E7B4B4; color: #A12626; }\n  .btn.ghost { border-style: dashed; color: var(--brand); border-color: var(--brand); }\n  .btn.big { min-height: 52px; font-size: 15px; }\n  .btn[disabled], .btn[aria-disabled=\"true\"] { opacity: .5; cursor: default; pointer-events: none; }\n\n  .seg { display: inline-flex; gap: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 4px; }\n  .seg button { min-height: 38px; padding: 0 14px; border: 0; border-radius: 7px; background: transparent; font-weight: 500; color: var(--ink-2); cursor: pointer; }\n  .seg button[aria-pressed=\"true\"] { background: var(--brand); color: #FFFFFF; font-weight: 600; }\n\n  .chips { display: flex; flex-wrap: wrap; gap: 8px; }\n  .chip { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink-2); font-weight: 500; cursor: pointer; }\n  .chip[aria-pressed=\"true\"] { background: var(--ink); border-color: var(--ink); color: #FFFFFF; font-weight: 600; }\n\n  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }\n\n  .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted); min-width: 0; }\n  .field input, .field select, .field textarea {\n    min-height: 44px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface);\n    font-size: 14px; font-weight: 400; color: var(--ink); width: 100%;\n  }\n  .field textarea { padding: 10px 12px; min-height: 70px; resize: vertical; }\n  .field input:disabled, .field select:disabled, .field textarea:disabled {\n    background: #F1F2F4; border-color: var(--line); color: #5B6270; cursor: not-allowed; opacity: 1; -webkit-text-fill-color: #5B6270;\n  }\n  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }\n  .form-grid .full { grid-column: 1 / -1; }\n\n  .filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 14px 0; }\n  .filters .field { flex: 1 1 170px; }\n  .filters .field.wide { flex: 2 1 260px; }\n\n  /* Tableaux */\n  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }\n  table.data { width: 100%; border-collapse: collapse; }\n  table.data th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--soft); padding: 11px 10px; font-weight: 600; white-space: nowrap; }\n  table.data td { padding: 11px 10px; border-top: 1px solid #EEF0F3; vertical-align: top; }\n  table.data td.num { text-align: right; white-space: nowrap; }\n  table.data tbody tr.clickable { cursor: pointer; }\n  table.data tbody tr.clickable:hover td { background: #FAFBFC; }\n  .link-btn { background: none; border: 0; padding: 0; color: var(--ink); font-weight: 600; cursor: pointer; text-align: left; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }\n\n  /* Tableau de bord */\n  .funnel { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }\n  .funnel div { border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }\n  .funnel .n { font: 700 24px var(--font-title); }\n  .todo { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-top: 1px solid #EEF0F3; }\n  .todo:first-of-type { border-top: 0; }\n  .todo .n { min-width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font: 700 18px var(--font-title); }\n  .todo .t { flex: 1 1 auto; }\n  .bars { display: flex; flex-direction: column; gap: 12px; }\n  .bar-row { display: grid; grid-template-columns: minmax(110px, 160px) minmax(0, 1fr) 56px; gap: 12px; align-items: center; font-size: 13px; }\n  .bar { height: 10px; background: #EEF0F3; border-radius: 999px; overflow: hidden; }\n  .bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); }\n  .bar span.low { background: #C2620A; }\n\n  /* Centre de confirmation */\n  .stats { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; }\n  .stats span { padding: 8px 12px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); }\n  .confirm { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }\n  .queue { flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 150px); overflow: auto; padding: 2px; }\n  .queue-title { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 6px; }\n  .q-item { width: 100%; text-align: left; padding: 13px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; display: flex; flex-direction: column; gap: 6px; }\n  .q-item[aria-current=\"true\"] { border: 2px solid var(--brand); padding: 12px; }\n  .q-top { display: flex; justify-content: space-between; gap: 8px; }\n  .q-tags { display: flex; flex-wrap: wrap; gap: 6px; }\n  .detail { flex: 3 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }\n  .detail-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }\n  .detail-head h2 { font: 700 22px var(--font-title); }\n  .lock-box { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: #EEF0F3; color: #2A2F3A; border-radius: 10px; padding: 12px 14px; margin: 12px 0 4px; }\n  .lock-box p { flex: 1 1 260px; margin: 0; font-weight: 600; }\n  .lock-box.warn { background: #FFF3DC; color: #6B4100; }\n  .lock-icon { font-size: 12px; }\n  .stock-warn { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; background: #FFF3DC; color: #6B4100; border-radius: 10px; padding: 10px 14px; margin: 10px 0; font-weight: 600; }\n  .stock-warn.info { background: #EEF0F3; color: #3D4350; font-weight: 500; }\n  .chip-sep { width: 1px; align-self: stretch; background: var(--line-2); margin: 0 4px; }\n  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }\n  .money-lines { display: grid; gap: 6px; max-width: 520px; }\n  .money-lines div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px dashed var(--line); }\n  .money-lines div.total { border-bottom: 0; font-weight: 700; font-size: 16px; }\n  .pos { color: #146C2E; }\n  .neg { color: #A12626; }\n  .model-row.low td { background: #FFF6E6; }\n  .model-row.off td { color: var(--muted); }\n  .more-list { display: grid; gap: 10px; }\n  .more-list a { display: block; padding: 16px; border: 1px solid var(--line); border-radius: 12px; text-decoration: none; color: var(--ink); font-weight: 600; }\n  .move-in { color: #146C2E; font-weight: 600; }\n  .move-out { color: #A12626; font-weight: 600; }\n  .lines { display: grid; gap: 8px; margin-top: 10px; }\n  .lines .line { display: grid; grid-template-columns: 1fr 110px; gap: 10px; align-items: center; }\n  .history { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; }\n  .sum { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; margin-top: 14px; border-top: 1px solid #EEF0F3; }\n  .sum div { display: flex; justify-content: space-between; gap: 12px; }\n  .sum .total { font-size: 16px; font-weight: 700; }\n  .outcomes { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }\n  .panel { margin-top: 12px; padding: 14px; border-radius: 10px; background: var(--soft); display: flex; flex-direction: column; gap: 12px; }\n  .quick { display: flex; flex-wrap: wrap; gap: 8px; }\n  .message { padding: 14px; border-radius: 10px; background: var(--soft); line-height: 1.55; white-space: pre-wrap; }\n  .queue-toggle { display: none; }\n  .check { width: 20px; height: 20px; }\n  .problems { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #A12626; }\n  .result-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid #EEF0F3; }\n  .result-row:first-of-type { border-top: 0; }\n  .result-row .grow { flex: 1 1 240px; min-width: 0; }\n  .label-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; }\n  .label-bar .chips { align-items: center; }\n  .check-line { display: flex; align-items: center; gap: 10px; min-height: 44px; }\n  .courier-note { color: #5B34A8; }\n  .follow-choices { display: grid; gap: 8px; margin: 6px 0 4px; }\n  .follow-choice { display: flex; gap: 12px; align-items: flex-start; text-align: left; width: 100%; padding: 12px 14px; border: 1px solid var(--line-2); border-radius: 12px; background: var(--surface); color: var(--ink); cursor: pointer; font: inherit; }\n  .follow-choice .icon { font-size: 20px; line-height: 1.2; }\n  .follow-choice[aria-pressed=\"true\"] { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink) inset; }\n  .follow-form { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line-2); }\n  .follow-form textarea, .follow-form input { width: 100%; }\n  .remarks { display: flex; flex-direction: column; gap: 8px; }\n  .remark { max-width: 85%; align-self: flex-start; background: #F3F0FA; border-radius: 12px 12px 12px 4px; padding: 8px 12px; }\n  .remark.mine { align-self: flex-end; background: #E3F2EC; border-radius: 12px 12px 4px 12px; }\n  .progress { height: 8px; border-radius: 999px; background: #EEF0F3; overflow: hidden; margin-top: 10px; }\n  .progress span { display: block; height: 100%; background: var(--ink); transition: width .2s; }\n  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }\n  .timeline { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 0; }\n  .timeline li { display: flex; gap: 14px; padding: 10px 0 10px 22px; position: relative; border-top: 1px solid #EEF0F3; }\n  .timeline li:first-child { border-top: 0; }\n  .timeline li::before { content: \"\"; position: absolute; left: 2px; top: 16px; width: 10px; height: 10px; border-radius: 999px; background: var(--brand); }\n  .timeline .t-date { flex: 0 0 110px; color: var(--muted); font-size: 13px; }\n  .timeline .t-body { flex: 1 1 auto; min-width: 0; }\n\n  /* Fenêtre (modale) */\n  .modal-backdrop { position: fixed; inset: 0; background: rgba(16, 24, 28, .45); display: flex; align-items: flex-start; justify-content: center; padding: 32px 16px; overflow: auto; z-index: 50; }\n  .modal { background: var(--surface); border-radius: 14px; width: 100%; max-width: 760px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }\n  .modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }\n  .modal-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }\n  .icon-btn { min-width: 44px; min-height: 44px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); cursor: pointer; font-size: 20px; line-height: 1; }\n\n  #toast {\n    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 60; max-width: calc(100% - 32px);\n    background: var(--ink); color: #FFFFFF; padding: 12px 18px; border-radius: 10px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,.18);\n    opacity: 0; pointer-events: none; transition: opacity .2s;\n  }\n  #toast.show { opacity: 1; }\n  #toast.error { background: #A12626; }\n\n  @media (max-width: 860px) {\n    .sidebar { display: none; }\n    .mobile-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--side); padding: 14px 16px; position: sticky; top: 0; z-index: 30; }\n    .mobile-user { color: var(--side-muted); font-size: 13px; }\n    .content { padding: 16px 14px 96px; }\n    h1 { font-size: 22px; }\n    .bottom-nav {\n      display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;\n      background: var(--side); padding: 6px 6px calc(6px + env(safe-area-inset-bottom));\n    }\n    .bottom-nav .more-btn { min-height: 52px; border: 0; background: transparent; color: var(--side-ink); font: inherit; font-size: 11.5px; font-weight: 600; border-radius: 10px; cursor: pointer; }\n    .bottom-nav a { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 4px; color: var(--side-ink); text-decoration: none; font-size: 11.5px; font-weight: 600; border-radius: 10px; padding: 0 1px; }\n    .bottom-nav .badge { font-size: 10.5px; padding: 0 5px; white-space: nowrap; }\n    .bottom-nav a, .bottom-nav .more-btn { flex-direction: column; gap: 2px; line-height: 1.1; }\n    .timeline .t-date { flex-basis: 84px; }\n    .bottom-nav a.active { background: var(--side-active); color: #FFFFFF; }\n    #toast { bottom: 84px; }\n    .queue { max-height: none; }\n    .queue:not(.open) { display: none; }\n    .queue-toggle { display: inline-flex; }\n    .stats { display: none; }\n    table.cards thead { display: none; }\n    table.cards tr { display: block; padding: 10px 12px; border-top: 1px solid #EEF0F3; }\n    table.cards tbody tr:first-child { border-top: 0; }\n    table.cards td { display: flex; justify-content: space-between; gap: 12px; border: 0; padding: 3px 0; text-align: right; }\n    table.cards td::before { content: attr(data-label); color: var(--muted); font-size: 12px; text-align: left; }\n    table.cards td.num { text-align: right; }\n    table.cards td.multi { display: block; text-align: right; }\n    table.cards td.multi::before { display: block; text-align: left; margin-bottom: 2px; }\n    .modal-backdrop { padding: 0; }\n    .modal { border-radius: 0; min-height: 100%; }\n  }\n</style>\n",
  App: "<script>\n(function () {\n  'use strict';\n\n  /* ================================================================ */\n  /* État et outils                                                   */\n  /* ================================================================ */\n\n  var S = {\n    boot: null,\n    route: '',\n    period: '7',\n    filter: { status: 'todo', q: '', wilaya: '', period: '30', limit: 100 },\n    queue: null,\n    currentId: null,\n    current: null,\n    busy: false,\n    token: 0,\n    detailToken: 0,\n    ship: {\n      data: null, tab: 'toship', selected: {}, busy: false, results: null,\n      created: { sel: {}, filter: 'all' }, // onglet « Créés, à valider » : sélection et filtre\n      vbusy: false, vresults: null,         // validation de l'expédition\n      printing: false, pdf: null,           // dernier PDF de bordereaux { url, items, marked }\n      refreshedAt: 0                        // dernière relecture des colis créés chez Ecotrack\n    },\n    track: { data: null, days: 30, filter: 'all', view: 'active', done: 'all' },\n    follow: null,     // alerte en cours : { id, result } (fenêtre « Résultat de l'appel »)\n    followBusy: false,\n    order: null,      // dernière commande affichée dans la fenêtre (pour la réafficher)\n    unlockId: null,   // commande déverrouillée par un administrateur\n    list: null,       // dernière liste de la page Commandes (mise à jour sur place)\n    preloaded: {},    // réponses déjà reçues avec le démarrage (clé : fonction + arguments)\n    prefetch: null,   // commande suivante préparée à l'avance { id, data }\n    pending: {},      // commandes envoyées, en cours d'enregistrement\n    cooldown: 0,      // évite qu'un double clic traite aussi la commande suivante\n    profit: { period: '30', tab: 'resume', data: null },\n    stock: { data: null },\n    pendingTotal: 0   // commandes ni confirmées ni annulées (compteur « 5 / 12 »)\n  };\n  var TZ = 'Africa/Algiers';\n  var ALERT = {\n    bad: { bg: '#FBE7E7', fg: '#A12626' },\n    warn: { bg: '#FCEBDD', fg: '#9A4200' },\n    ok: { bg: '#DDF0E4', fg: '#146C2E' },\n    'new': { bg: '#E6EEFB', fg: '#1E4FA8' }\n  };\n  var view = document.getElementById('view');\n\n  /** Appelle une fonction du serveur (Api.gs) et renvoie une promesse. */\n  function call(fn) {\n    var args = Array.prototype.slice.call(arguments, 1);\n    var key = fn + '|' + JSON.stringify(args);\n    if (S.preloaded && Object.prototype.hasOwnProperty.call(S.preloaded, key)) {\n      var ready = S.preloaded[key];\n      delete S.preloaded[key];\n      return Promise.resolve(ready);\n    }\n    return new Promise(function (resolve, reject) {\n      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);\n      runner[fn].apply(runner, args);\n    });\n  }\n\n  function $(sel, root) { return (root || document).querySelector(sel); }\n  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }\n\n  function h(value) {\n    return String(value === null || value === undefined ? '' : value).replace(/[&<>\"']/g, function (c) {\n      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c];\n    });\n  }\n  function errText(e) { return (e && e.message) ? e.message : String(e || 'Erreur inconnue'); }\n  function errorBox(e) { return '<div class=\"error-box\" role=\"alert\">' + h(errText(e)) + '</div>'; }\n\n  function money(n) {\n    var v = Math.round(Number(n) || 0);\n    return String(v).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' ') + ' DA';\n  }\n  function pct(a, b) { return b ? Math.round(a / b * 100) + ' %' : '—'; }\n  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }\n\n  function fmtDate(iso, withDay) {\n    if (!iso) return '—';\n    var d = new Date(iso);\n    var o = { timeZone: TZ, hour: '2-digit', minute: '2-digit' };\n    if (withDay !== false) { o.day = '2-digit'; o.month = '2-digit'; }\n    try { return d.toLocaleString('fr-FR', o); } catch (e) { return d.toLocaleString('fr-FR'); }\n  }\n  function ago(iso) {\n    if (!iso) return '';\n    var diff = Date.now() - new Date(iso).getTime();\n    var future = diff < 0;\n    var m = Math.round(Math.abs(diff) / 60000);\n    var txt = m < 1 ? 'à l’instant' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' j';\n    if (m < 1) return txt;\n    return future ? 'dans ' + txt : 'il y a ' + txt;\n  }\n  function fmtPhone(p) {\n    var s = String(p || '');\n    if (/^0\\d{9}$/.test(s)) return s.replace(/^(\\d{4})(\\d{2})(\\d{2})(\\d{2})$/, '$1 $2 $3 $4');\n    return s;\n  }\n  function wilayaName(w) { return String(w || '').replace(/^\\d+\\s*-\\s*/, ''); }\n\n  function pill(status) {\n    var st = (S.boot && S.boot.styles[status]) || { bg: '#EEF0F3', fg: '#3D4350' };\n    return '<span class=\"pill\" style=\"background:' + st.bg + ';color:' + st.fg + '\">' + h(status || '—') + '</span>';\n  }\n  function alertPill(text, level) {\n    if (!text) return '';\n    var st = ALERT[level] || ALERT['new'];\n    return '<span class=\"pill\" style=\"background:' + st.bg + ';color:' + st.fg + '\">' + h(text) + '</span>';\n  }\n\n  /** Liste d'options ; garde une valeur inconnue pour ne pas la perdre. */\n  function options(list, selected, emptyLabel) {\n    var out = emptyLabel !== undefined ? '<option value=\"\">' + h(emptyLabel) + '</option>' : '';\n    if (selected && list.indexOf(selected) < 0) out += '<option selected>' + h(selected) + '</option>';\n    return out + list.map(function (v) {\n      return '<option' + (v === selected ? ' selected' : '') + '>' + h(v) + '</option>';\n    }).join('');\n  }\n  function field(label, control, cls) {\n    return '<label class=\"field' + (cls ? ' ' + cls : '') + '\">' + h(label) + control + '</label>';\n  }\n  function input(name, value, attrs) {\n    return '<input name=\"' + name + '\" value=\"' + h(value) + '\"' + (attrs || '') + '>';\n  }\n  function readForm(root) {\n    var out = {};\n    $all('[name]', root).forEach(function (el) {\n      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;\n    });\n    return out;\n  }\n\n  var toastTimer = null;\n  function toast(msg, isError) {\n    var t = $('#toast');\n    t.textContent = msg;\n    t.className = 'show' + (isError ? ' error' : '');\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(function () { t.className = ''; }, isError ? 6000 : 3200);\n  }\n\n  /** Frais de livraison d'après l'onglet Tarifs, ou null. */\n  function feeFor(wilaya, carrier, mode) {\n    var code = parseInt(String(wilaya || ''), 10);\n    var r = S.boot.rates[code];\n    var c = carrier || S.boot.defaultCarrier;\n    if (r && r[c] && r[c][mode] !== undefined) return r[c][mode];\n    return null;\n  }\n\n  /* ================================================================ */\n  /* Navigation                                                       */\n  /* ================================================================ */\n\n  var ROUTES = ['tableau', 'commandes', 'confirmation', 'expeditions', 'suivi', 'benefices', 'stock'];\n  /** Statuts de la page Commandes (pas encore confirmées). */\n  var TODO_STATUSES = ['À confirmer', 'Pas de réponse', 'Rappeler', 'Injoignable'];\n  /** Page où se trouve une commande trouvée par la recherche. */\n  var PAGE_LABELS = { expedier: 'Expédier', suivi: 'Suivi', terminees: 'Suivi › Terminées', annulees: 'Annulées' };\n\n  function currentRoute() {\n    var r = (location.hash || '').replace(/^#\\/?/, '');\n    return ROUTES.indexOf(r) < 0 ? 'tableau' : r;\n  }\n\n  /** Arguments de la liste des commandes ; à l'ouverture de la page : vérifie RELEASIT et l'état des importations. */\n  function listArgs(first) {\n    var f = {};\n    Object.keys(S.filter).forEach(function (k) { f[k] = S.filter[k]; });\n    if (String(f.q || '').trim()) f.status = 'all'; // une recherche trouve les commandes de toutes les pages\n    if (first) { f.sync = true; f.withStatus = true; }\n    return f;\n  }\n\n  /** Ce que la première page demandera : calculé par le serveur avec le démarrage, en un seul aller-retour. */\n  function preloadSpec(route) {\n    var spec = route === 'tableau' ? { fn: 'api_dashboard', args: [S.period] }\n      : route === 'commandes' ? { fn: 'api_listOrders', args: [listArgs(true)] }\n      : route === 'confirmation' ? { fn: 'api_queue', args: [{ sync: true, first: true }] }\n      : null;\n    if (spec) spec.key = spec.fn + '|' + JSON.stringify(spec.args);\n    return spec;\n  }\n\n  function go() {\n    var r = currentRoute();\n    S.route = r;\n    $all('[data-route]').forEach(function (a) {\n      var on = a.getAttribute('data-route') === r;\n      a.classList.toggle('active', on);\n      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');\n    });\n    closeModal();\n    if (r === 'tableau') pageDashboard();\n    else if (r === 'commandes') pageOrders();\n    else if (r === 'expeditions') pageShipping();\n    else if (r === 'suivi') pageTracking();\n    else if (r === 'benefices') { if (S.boot.user.admin) pageProfit(); else { location.hash = '#/tableau'; return; } }\n    else if (r === 'stock') { if (S.boot.user.stock) pageStock(); else { location.hash = '#/tableau'; return; } }\n    else pageConfirm();\n    view.focus({ preventScroll: true });\n    window.scrollTo(0, 0);\n  }\n\n  function navigate(route, status) {\n    if (status) { S.filter.status = status; S.filter.limit = 100; }\n    if (location.hash === '#/' + route) go(); else location.hash = '#/' + route;\n  }\n\n  /** Compteur de Confirmation : « à appeler maintenant / total en attente » (ni confirmées ni annulées). */\n  function setQueueCount(n, pending) {\n    if (pending !== undefined && pending !== null) S.pendingTotal = pending;\n    var total = Math.max(S.pendingTotal || 0, n || 0);\n    $all('[data-queue-count]').forEach(function (el) {\n      el.textContent = (n || 0) + '/' + total;\n      el.title = (n || 0) + ' à appeler maintenant, ' + total + ' en attente au total';\n      el.hidden = !total;\n    });\n  }\n  function setAlertCount(n) {\n    $all('[data-alert-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });\n  }\n  function applyCounts(c) {\n    if (!c) return;\n    setQueueCount(c.queue, c.pending);\n    setAlertCount(c.alerts);\n    if (c.toShip !== undefined) $all('[data-ship-count]').forEach(function (el) { el.textContent = c.toShip; el.hidden = !c.toShip; });\n  }\n  function refreshCount() {\n    call('api_counts').then(applyCounts).catch(function () {});\n  }\n  function arrivedText(n) {\n    return n > 1 ? n + ' nouvelles commandes reçues' : '1 nouvelle commande reçue';\n  }\n\n  /* ================================================================ */\n  /* Tableau de bord                                                  */\n  /* ================================================================ */\n\n  function pageDashboard() {\n    var t = ++S.token;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 jours'], ['30', '30 jours'], ['all', 'Tout']];\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Tableau de bord</h1><p class=\"sub\">Vue d’ensemble de vos commandes COD</p></div>' +\n      '<div class=\"seg\" role=\"group\" aria-label=\"Période\">' + periods.map(function (p) {\n        return '<button type=\"button\" data-act=\"period\" data-period=\"' + p[0] + '\" aria-pressed=\"' + (S.period === p[0]) + '\">' + p[1] + '</button>';\n      }).join('') + '</div></div>' +\n      '<div id=\"dash\"><p class=\"loading\">Chargement…</p></div>';\n    call('api_dashboard', S.period).then(function (d) {\n      if (t === S.token) renderDashboard(d);\n    }).catch(function (e) {\n      if (t === S.token) $('#dash').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderDashboard(d) {\n    var st = S.boot.styles;\n    var kpis = [\n      ['Commandes reçues', d.received, plural(d.waiting, 'commande en attente', 'commandes en attente')],\n      ['Taux de confirmation', pct(d.confirmed, d.decided), d.confirmed + ' confirmées sur ' + d.decided + ' traitées'],\n      ['Taux de livraison', pct(d.delivered, d.delivered + d.returned), d.delivered + ' livrées · ' + d.returned + ' retours'],\n      ['Montant livré', money(d.revenueDelivered), 'Commandes livrées sur la période'],\n      ['Argent en route', money(d.inTransitAmount), plural(d.inTransitCount, 'colis pas encore livré', 'colis pas encore livrés')]\n    ];\n    var funnel = [\n      ['Reçues', d.received, '#EEF0F3', '#3D4350'],\n      ['Confirmées', d.confirmed, st['Confirmée'].bg, st['Confirmée'].fg],\n      ['Expédiées', d.shipped, st['Expédiée'].bg, st['Expédiée'].fg],\n      ['Livrées', d.delivered, st['Livrée'].bg, st['Livrée'].fg],\n      ['Retours', d.returned, st['Retour'].bg, st['Retour'].fg],\n      ['Annulées', d.cancelled, st['Annulée'].bg, st['Annulée'].fg]\n    ];\n    var todo = [\n      [d.todo.toConfirm, 'à appeler maintenant', 'confirmation', '', 'Confirmer', st['À confirmer']],\n      [d.todo.callbacksToday, 'rappels prévus plus tard aujourd’hui', 'confirmation', '', 'Voir', st['Rappeler']],\n      [d.todo.toShip, 'commandes confirmées à expédier', 'expeditions', '', 'Expédier', st['Confirmée']],\n      [d.todo.unreachable, 'clients injoignables', 'commandes', 'Injoignable', 'Voir', st['Injoignable']],\n      [d.todo.waitingLong, 'commandes jamais appelées depuis plus de 24 h', 'confirmation', '', 'Appeler', st['Annulée']],\n      [d.todo.parcelAlerts, 'colis à traiter (suspendus, retours, sans mouvement…)', 'suivi', '', 'Suivi', st['Retour']]\n    ];\n    if (d.todo.stockLow) todo.push([d.todo.stockLow, 'modèles en stock bas ou en rupture', 'stock', '', 'Stock', st['Rappeler']]);\n\n    var html = '<div class=\"stack\">';\n    html += '<section class=\"grid-kpi\" aria-label=\"Chiffres clés\">' + kpis.map(function (k) {\n      return '<div class=\"card kpi\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + h(k[1]) + '</span><span class=\"note\">' + h(k[2]) + '</span></div>';\n    }).join('') + '</section>';\n\n    html += '<section class=\"card\"><h2>Parcours des commandes</h2><div class=\"funnel\">' + funnel.map(function (f) {\n      return '<div style=\"background:' + f[2] + ';color:' + f[3] + '\"><span class=\"strong\">' + f[0] + '</span><span class=\"n\">' + f[1] + '</span><span class=\"small\" style=\"color:' + f[3] + '\">' + (d.received ? pct(f[1], d.received) + ' des reçues' : 'aucune commande') + '</span></div>';\n    }).join('') + '</div></section>';\n\n    html += '<div class=\"row\">';\n    html += '<section class=\"card\"><h2>À faire</h2>' + todo.map(function (t) {\n      return '<div class=\"todo\"><span class=\"n\" style=\"background:' + t[5].bg + ';color:' + t[5].fg + '\">' + t[0] + '</span>' +\n        '<span class=\"t\">' + h(t[1]) + '</span>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"goto\" data-route=\"' + t[2] + '\" data-status=\"' + h(t[3]) + '\"' + (t[6] ? ' data-tab=\"' + t[6] + '\"' : '') + '>' + t[4] + '</button></div>';\n    }).join('') + '</section>';\n\n    html += '<section class=\"card\"><h2>Taux de livraison par wilaya</h2>';\n    if (!d.byWilaya.length) {\n      html += '<p class=\"empty\">Pas encore de colis expédiés sur la période.</p>';\n    } else {\n      html += '<div class=\"bars\">' + d.byWilaya.map(function (w) {\n        var done = w.delivered + w.returned;\n        var rate = done ? Math.round(w.delivered / done * 100) : null;\n        return '<div class=\"bar-row\"><span>' + h(w.name) + '<br><span class=\"small\">' + plural(w.orders, 'colis', 'colis') + '</span></span>' +\n          '<span class=\"bar\" aria-hidden=\"true\"><span class=\"' + (rate !== null && rate < 70 ? 'low' : '') + '\" style=\"width:' + (rate || 0) + '%\"></span></span>' +\n          '<span class=\"strong\" style=\"text-align:right\">' + (rate === null ? '—' : rate + ' %') + '</span></div>';\n      }).join('') + '</div><p class=\"small\" style=\"margin-top:12px\">Orange : moins de 70 % livrés. « — » : aucun colis terminé.</p>';\n    }\n    html += '</section></div>';\n\n    html += '<div class=\"row\">';\n    html += '<section class=\"card\"><h2>Par confirmatrice</h2>' + (d.byAgent.length ? table(\n      ['Confirmatrice', 'Traitées', 'Confirmées', 'Taux'],\n      d.byAgent.map(function (a) { return [h(a.name), a.orders, a.confirmed, pct(a.confirmed, a.orders)]; }), [1, 2, 3]\n    ) : '<p class=\"empty\">Aucune commande traitée sur la période.</p>') + '</section>';\n    html += '<section class=\"card\"><h2>Par produit</h2>' + (d.byProduct.length ? table(\n      ['Produit', 'Commandes', 'Confirmées', 'Livrées', 'Retours'],\n      d.byProduct.map(function (p) { return [h(p.name), p.orders, p.confirmed, p.delivered, p.returned]; }), [1, 2, 3, 4]\n    ) : '<p class=\"empty\">Aucune commande sur la période.</p>') + '</section>';\n    html += '</div></div>';\n    $('#dash').innerHTML = html;\n  }\n\n  function table(head, rows, numCols) {\n    numCols = numCols || [];\n    return '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' + head.map(function (t) {\n      return '<th scope=\"col\">' + h(t) + '</th>';\n    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {\n      return '<tr>' + r.map(function (c, i) {\n        return '<td data-label=\"' + h(head[i]) + '\"' + (numCols.indexOf(i) >= 0 ? ' class=\"num\"' : '') + '>' + c + '</td>';\n      }).join('') + '</tr>';\n    }).join('') + '</tbody></table></div>';\n  }\n\n  /* ================================================================ */\n  /* Commandes                                                        */\n  /* ================================================================ */\n\n  function pageOrders() {\n    var f = S.filter;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 derniers jours'], ['30', '30 derniers jours'], ['all', 'Tout']];\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Commandes</h1><p class=\"sub\">Commandes pas encore confirmées. Une commande confirmée passe dans <strong>Expédier</strong>, puis <strong>Suivi</strong>. La recherche trouve toutes les commandes.</p></div>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"new-order\">+ Nouvelle commande</button></div>' +\n      '<div id=\"shop-status\"></div>' +\n      '<div class=\"chips\" id=\"chips\" role=\"group\" aria-label=\"Filtrer par statut\"></div>' +\n      '<div class=\"filters\">' +\n        field('Rechercher', '<input type=\"search\" id=\"f-q\" value=\"' + h(f.q) + '\" placeholder=\"Nom, téléphone, n° de commande ou de suivi\">', 'wide') +\n        field('Wilaya', '<select id=\"f-wilaya\">' + options(S.boot.wilayas, f.wilaya, 'Toutes les wilayas') + '</select>') +\n        field('Période', '<select id=\"f-period\">' + periods.map(function (p) {\n          return '<option value=\"' + p[0] + '\"' + (f.period === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';\n        }).join('') + '</select>') +\n      '</div>' +\n      '<div id=\"orders-list\"><p class=\"loading\">Chargement…</p></div>';\n    loadOrders(true);\n  }\n\n  /* Arrivée automatique des commandes (Releasit, Shopify) : état, et transfert à la demande. */\n  function statusCard(inner) {\n    return '<div class=\"card\" style=\"display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px;padding:12px 16px\">' + inner + '</div>';\n  }\n\n  function loadShopStatus() {\n    call('api_importStatus').then(renderShopStatus).catch(function () {});\n  }\n\n  function renderShopStatus(st) {\n    (function () {\n      var box = $('#shop-status');\n      if (!box || S.route !== 'commandes') return;\n      var r = st.releasit;\n      var s = st.shopify;\n      var html = '';\n      if (r.found) {\n        html += statusCard('<span><strong>Releasit</strong> · ' + (r.lastRun ? 'dernière lecture ' + h(ago(r.lastRun)) : 'pas encore lu') +\n          ' · transfert automatique chaque minute</span>' +\n          '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"releasit-transfer\">Transférer maintenant</button>');\n        if (r.missing.length) {\n          html += '<div class=\"error-box\" role=\"alert\" style=\"margin-bottom:14px;background:#FFF3DC;color:#8A5200\">Onglet RELEASIT : colonne(s) absente(s) : ' +\n            h(r.missing.join(', ')) + '. Ajoutez-les dans les réglages Google Sheets de Releasit.</div>';\n        }\n        if (r.lastError) html += '<div style=\"margin-bottom:14px\">' + errorBox(r.lastError) + '</div>';\n      }\n      if (s.configured) {\n        html += statusCard('<span><strong>Shopify</strong> · ' + h(s.shop) + ' · ' + (s.lastRun ? 'dernière importation ' + h(ago(s.lastRun)) : 'pas encore importé') +\n          ' · importation automatique toutes les 5 minutes</span>' +\n          '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"shop-import\">Importer maintenant</button>') +\n          (s.lastError ? '<div style=\"margin-bottom:14px\">' + errorBox(s.lastError) + '</div>' : '');\n      }\n      var sm = st.sms;\n      if (sm && sm.configured) {\n        html += statusCard('<span><strong>SMS</strong> · depuis le ' + h(sm.from) + ' · ' + h(sm.hours) + ' · ' +\n          (sm.waiting ? sm.waiting + ' en attente' : 'aucun en attente') + (sm.lastRun ? ' · dernier passage ' + h(ago(sm.lastRun)) : '') +\n          '<br><span class=\"small\">Statuts avec SMS : ' + h(sm.statuses.join(', ') || 'aucun') + '</span></span>' +\n          (S.boot.user.admin && sm.waiting ? '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"sms-send\">Envoyer maintenant</button>' : '')) +\n          (sm.lastError ? '<div style=\"margin-bottom:14px\">' + errorBox(sm.lastError) + '</div>' : '');\n      }\n      if (!r.found && !s.configured) {\n        html += statusCard('<span class=\"muted\">Les commandes n’arrivent pas encore automatiquement. Connectez Releasit COD à un onglet <strong>RELEASIT</strong> du classeur, ' +\n          'ou connectez Shopify (dans le classeur, sur ordinateur : menu <strong>DZ Smart Shop</strong>).</span>');\n      }\n      box.innerHTML = html;\n    })();\n  }\n\n  function loadOrders(first) {\n    var t = ++S.token;\n    if (S.filter.status === 'trash' && !String(S.filter.q || '').trim()) { loadTrash(t); return; }\n    call('api_listOrders', listArgs(first)).then(function (res) {\n      if (t !== S.token || S.route !== 'commandes') return;\n      S.list = res;\n      renderChips(res.counts);\n      renderOrderList(res);\n      if (res.importStatus) renderShopStatus(res.importStatus);\n      if (res.arrived) { toast(arrivedText(res.arrived)); if (res.menuCounts) applyCounts(res.menuCounts); }\n    }).catch(function (e) {\n      if (t === S.token) $('#orders-list').innerHTML = errorBox(e);\n    });\n  }\n\n  /** Corbeille (administrateur) : commandes supprimées, avec « Restaurer ». */\n  function loadTrash(t) {\n    $('#orders-list').innerHTML = '<p class=\"loading\">Chargement…</p>';\n    call('api_listTrash').then(function (res) {\n      if (t !== S.token || S.route !== 'commandes') return;\n      renderChips(S.list ? S.list.counts : {});\n      var box = $('#orders-list');\n      if (!res.rows.length) { box.innerHTML = '<div class=\"card\"><p class=\"empty\">La corbeille est vide.</p></div>'; return; }\n      box.innerHTML = '<p class=\"small\" style=\"margin-bottom:10px\">Commandes supprimées avec le bouton « Supprimer ». Elles sont aussi dans l’onglet <strong>Corbeille</strong> du classeur. Releasit et Shopify ne les font pas revenir.</p>' +\n        table(['N°', 'Client', 'Produit', 'Total', 'Statut', 'Supprimée', ''], res.rows.map(function (o) {\n          return [h(o.id) + '<div class=\"small\">' + fmtDate(o.date) + '</div>', h(o.client) + '<div class=\"small\">' + h(fmtPhone(o.phone)) + '</div>',\n            h(o.product), money(o.total), pill(o.status),\n            h(fmtDate(o.deletedAt)) + '<div class=\"small\">par ' + h(o.deletedBy || '—') + (o.reason ? ' · ' + h(o.reason) : '') + '</div>',\n            '<button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"trash-restore\" data-id=\"' + h(o.id) + '\">Restaurer</button>'];\n        }), [3]);\n    }).catch(function (e) {\n      if (t === S.token) $('#orders-list').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderChips(counts) {\n    if (String(S.filter.q || '').trim()) {\n      $('#chips').innerHTML = '<span class=\"small\">Recherche dans toutes les commandes (toutes les pages) · ' + plural(counts.all || 0, 'résultat', 'résultats') + '</span>';\n      return;\n    }\n    var list = [['todo', 'À traiter']].concat(TODO_STATUSES.map(function (s) { return [s, s]; }));\n    var chip = function (c, n) {\n      return '<button type=\"button\" class=\"chip\" data-act=\"chip\" data-status=\"' + h(c[0]) + '\" aria-pressed=\"' + (S.filter.status === c[0]) + '\">' +\n        h(c[1]) + (n === null ? '' : ' · ' + (n || 0)) + '</button>';\n    };\n    $('#chips').innerHTML = list.filter(function (c) {\n      return c[0] === 'todo' || c[0] === S.filter.status || counts[c[0]];\n    }).map(function (c) { return chip(c, counts[c[0]]); }).join('') +\n      '<span class=\"chip-sep\" aria-hidden=\"true\"></span>' +\n      chip(['Annulée', '✕ Annulées'], counts['Annulée']) +\n      (S.boot.user.admin ? chip(['trash', '🗑 Corbeille'], null) : '');\n  }\n\n  function renderOrderList(res) {\n    var box = $('#orders-list');\n    if (!res.rows.length) {\n      box.innerHTML = '<div class=\"card\"><p class=\"empty\">Aucune commande ne correspond à ces filtres.</p></div>';\n      return;\n    }\n    var head = ['N°', 'Client', 'Wilaya', 'Produit', 'Total', 'Statut', 'Alerte', 'Livraison'];\n    var html = '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' + head.map(function (t) {\n      return '<th scope=\"col\">' + t + '</th>';\n    }).join('') + '</tr></thead><tbody>';\n    res.rows.forEach(function (o) {\n      html += '<tr class=\"clickable\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' +\n        '<td data-label=\"N°\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' + h(o.id) + '</button>' +\n          (o.locked ? ' <span class=\"lock-icon\" title=\"Verrouillée\" aria-label=\"Verrouillée\">🔒</span>' : '') + '<div class=\"small\">' + fmtDate(o.date) + '</div></td>' +\n        '<td data-label=\"Client\" class=\"multi\">' + h(o.client) + '<div class=\"small\">' + h(fmtPhone(o.phone)) + '</div></td>' +\n        '<td data-label=\"Wilaya\" class=\"multi\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"Produit\">' + h(o.product) + (o.qty > 1 ? ' ×' + o.qty : '') + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"Statut\">' + pill(o.status) +\n          (o.status === 'Annulée' && o.cancelReason ? '<div class=\"small strong\" style=\"color:#A12626\">Motif : ' + h(o.cancelReason) + '</div>' : '') +\n          (PAGE_LABELS[o.page] && S.filter.status !== 'Annulée' ? '<div class=\"small\">→ ' + PAGE_LABELS[o.page] + '</div>' : '') + '</td>' +\n        '<td data-label=\"Alerte\">' + alertPill(o.alert, o.alertLevel) + '</td>' +\n        '<td data-label=\"Livraison\" class=\"multi\">' + h(o.mode) + '<div class=\"small\">' + h([o.carrier, o.tracking].filter(Boolean).join(' · ')) + '</div></td>' +\n      '</tr>';\n    });\n    html += '</tbody></table></div>';\n    html += '<p class=\"small\" style=\"margin-top:10px\">' + res.rows.length + ' sur ' + res.total + ' commande(s)</p>';\n    if (res.total > res.rows.length) html += '<p style=\"margin-top:10px\"><button type=\"button\" class=\"btn\" data-act=\"more\">Afficher plus</button></p>';\n    box.innerHTML = html;\n  }\n\n  /* ---------------- Fenêtre de commande ---------------- */\n\n  function showModal(html) {\n    $('#modal-root').innerHTML = '<div class=\"modal-backdrop\"><div class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"modal-title\">' + html + '</div></div>';\n    var first = $('#modal-root input, #modal-root select, #modal-root button');\n    if (first) first.focus();\n  }\n  function closeModal() { $('#modal-root').innerHTML = ''; }\n  function modalOpen() { return !!$('#modal-root .modal'); }\n  function modalHead(title, extra) {\n    return '<div class=\"modal-head\"><div><h2 id=\"modal-title\" style=\"font:700 20px var(--font-title)\">' + title + '</h2>' + (extra || '') + '</div>' +\n      '<button type=\"button\" class=\"icon-btn\" data-act=\"close-modal\" aria-label=\"Fermer\">×</button></div>';\n  }\n\n  function orderFields(o) {\n    var b = S.boot;\n    return '<div class=\"form-grid\">' +\n      field('Client', input('client', o.client)) +\n      field('Téléphone', input('phone', o.phone, ' inputmode=\"tel\"')) +\n      field('Wilaya', '<select name=\"wilaya\">' + options(b.wilayas, o.wilaya, 'Choisir…') + '</select>') +\n      field('Commune', input('commune', o.commune)) +\n      field('Adresse', input('address', o.address), 'full') +\n      field('Produit', input('product', o.product, ' list=\"product-list\"')) +\n      field('Quantité', input('qty', o.qty || 1, ' type=\"number\" min=\"1\" step=\"1\"')) +\n      field('Prix des produits (DA)', input('price', o.price || '', ' type=\"number\" min=\"0\" step=\"10\"')) +\n      field('Livraison', '<select name=\"mode\">' + options(b.modes, o.mode || b.modes[0]) + '</select>') +\n      field('Société', '<select name=\"carrier\">' + options(b.carriers, o.carrier, 'Par défaut (' + b.defaultCarrier + ')') + '</select>') +\n      field('Frais de livraison (DA)', input('shipping', o.shipping === null || o.shipping === undefined ? '' : o.shipping, ' type=\"number\" min=\"0\" step=\"10\" placeholder=\"Calcul automatique\"')) +\n      (o.id ? field('N° de suivi', input('tracking', o.tracking)) : '') +\n      field('Notes', '<textarea name=\"notes\">' + h(o.notes) + '</textarea>', 'full') +\n      '</div>' +\n      '<datalist id=\"product-list\">' + b.products.map(function (p) { return '<option value=\"' + h(p.name) + '\">'; }).join('') + '</datalist>';\n  }\n\n  function openOrder(id) {\n    S.unlockId = null;\n    showModal(modalHead('Commande ' + h(id)) + '<p class=\"loading\">Chargement…</p>');\n    call('api_getOrder', id).then(renderOrderModal).catch(function (e) {\n      showModal(modalHead('Commande ' + h(id)) + errorBox(e));\n    });\n  }\n\n  /* Verrou : message, et boutons Annuler le colis / Remettre à confirmer / Modifier quand même. */\n  function lockBox(o, r, unlocked) {\n    if (unlocked) {\n      return '<div class=\"lock-box warn\"><p>Déverrouillage administrateur : la modification sera notée dans le Journal avec son motif. ' +\n        (o.tracking ? 'Attention : le colis chez Ecotrack, lui, ne change pas.' : '') + '</p></div>' +\n        field('Motif du déverrouillage (obligatoire)', input('forceReason', '', ' data-role=\"force-reason\" placeholder=\"Ex. adresse corrigée à la demande d’Ecotrack\"'), 'full');\n    }\n    if (!r.locked) return '';\n    return '<div class=\"lock-box\"><p>🔒 ' + h(r.reason) + '</p>' +\n      (r.canPrintLabel ? '<button type=\"button\" class=\"btn\" data-act=\"label-one\" data-id=\"' + h(o.id) + '\">🖨 Bordereau</button>' +\n        (o.label && (o.label.printed || o.label.reprint) ? '<span class=\"small\">' + (o.label.reprint ? 'Bordereau à réimprimer (colis recréé)' : 'Imprimé le ' + h(o.label.at) + (o.label.by ? ' · ' + h(o.label.by) : '')) + '</span>' : '') : '') +\n      (r.canCancelParcel ? '<button type=\"button\" class=\"btn danger\" data-act=\"parcel-cancel-ask\" data-id=\"' + h(o.id) + '\" data-tracking=\"' + h(o.tracking) + '\">Annuler le colis</button>' : '') +\n      (r.canReopen ? '<button type=\"button\" class=\"btn\" data-act=\"order-reopen\" data-id=\"' + h(o.id) + '\">Remettre à confirmer</button>' : '') +\n      (r.canUnlock ? '<button type=\"button\" class=\"link-btn\" data-act=\"order-unlock\" data-id=\"' + h(o.id) + '\">Modifier quand même (administrateur)</button>' : '') +\n      '</div>';\n  }\n\n  function renderOrderModal(data) {\n    S.order = data;\n    var o = data.order;\n    var r = data.rules || { locked: false, statuses: S.boot.statuses };\n    var unlocked = r.locked && S.unlockId === o.id;\n    var locked = r.locked && !unlocked;\n    var statuses = unlocked ? S.boot.statuses : r.statuses;\n    var hist = data.history;\n    var b = S.boot;\n    var meta = '<p class=\"small\" style=\"margin-top:4px\">Reçue le ' + fmtDate(o.date) + ' · source : ' + h(o.source || '—') +\n      (o.campaign ? ' · campagne : ' + h(o.campaign) + (o.adSource ? ' (' + h(o.adSource) + ')' : '') : '') +\n      (o.agent ? ' · traitée par ' + h(o.agent) : '') + (o.attempts ? ' · ' + plural(o.attempts, 'appel', 'appels') : '') +\n      (o.sms ? ' · SMS envoyés : ' + h(o.sms) : '') + '</p>' +\n      '<p style=\"margin-top:8px;display:flex;gap:6px;flex-wrap:wrap\">' + pill(o.status) + alertPill(o.alert, o.alertLevel) + '</p>';\n    var histText = hist.orders\n      ? 'Autres commandes de ce numéro : ' + hist.orders + ' (' + hist.delivered + ' livrées, ' + hist.returned + ' retours, ' + hist.cancelled + ' annulées)'\n      : 'Première commande avec ce numéro.';\n    showModal(\n      modalHead('Commande ' + h(o.id), meta) +\n      '<p class=\"small\">' + h(histText) + '</p>' +\n      (o.tracking ?\n        '<div class=\"history\" style=\"background:#F4F5F7;margin-bottom:0\"><span class=\"strong\">Colis Ecotrack</span><span class=\"mono\">' + h(o.tracking) + '</span>' +\n        '<span>' + (o.carrierLabel ? h(o.carrierLabel) : 'statut pas encore lu') + (o.carrierMoved ? ' · mouvement ' + h(ago(o.carrierMoved)) : '') + '</span>' +\n        '<button type=\"button\" class=\"btn\" style=\"min-height:36px;margin-left:auto\" data-act=\"track-history\" data-id=\"' + h(o.id) + '\">Voir la chronologie</button></div>' +\n        '<div id=\"parcel-history\"></div>' : '') +\n      stockNote(data.stock) +\n      lockBox(o, r, unlocked) +\n      '<div id=\"order-form\" data-id=\"' + h(o.id) + '\" data-locked=\"' + (locked ? '1' : '') + '\" data-force=\"' + (unlocked ? '1' : '') + '\">' +\n        '<div class=\"form-grid\">' +\n          field('Statut', '<select name=\"status\" data-role=\"status\"' + (statuses.length < 2 ? ' disabled' : '') + '>' + options(statuses, o.status) + '</select>') +\n          field('Motif d’annulation', '<select name=\"cancelReason\">' + options(b.cancelReasons, o.cancelReason, 'Choisir…') + '</select>') +\n        '</div>' +\n        '<div style=\"height:12px\"></div>' +\n        orderFields(o) +\n      '</div>' +\n      '<div class=\"modal-actions\">' +\n        (data.phoneValid ? '<button type=\"button\" class=\"btn ' + (data.blacklisted ? '' : 'danger') + '\" data-act=\"toggle-blacklist\" data-phone=\"' + h(o.phone) + '\" data-on=\"' + (!data.blacklisted) + '\">' +\n          (data.blacklisted ? 'Retirer de la liste noire' : 'Mettre en liste noire') + '</button>' : '') +\n        (r.canDelete ? '<button type=\"button\" class=\"btn danger\" data-act=\"order-delete-ask\" data-id=\"' + h(o.id) + '\">Supprimer</button>' : '') +\n        '<button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button>' +\n        '<button type=\"button\" class=\"btn primary\" data-act=\"save-order\" data-id=\"' + h(o.id) + '\">' + (locked ? 'Enregistrer les notes' : 'Enregistrer') + '</button>' +\n      '</div>'\n    );\n    if (locked) {\n      // Seules les notes (et les statuts permis) restent modifiables.\n      $all('#order-form [name]').forEach(function (el) {\n        if (['notes', 'status', 'cancelReason'].indexOf(el.name) < 0) el.disabled = true;\n      });\n    }\n    toggleCancelField();\n  }\n\n  /** Sociétés sans connexion : l'expédition se note à la main. */\n  function manualCarriers() {\n    return S.boot.carriers.filter(function (c) { return c !== 'Ecotrack'; });\n  }\n\n  function askManualShip(id) {\n    var list = manualCarriers();\n    showModal(modalHead('Expédiée avec une autre société') +\n      '<p class=\"small\">La commande ' + h(id) + ' passe dans <strong>Suivi</strong>. Vous mettrez son statut à jour (en livraison, livrée, retour) quand le livreur vous informe.</p>' +\n      '<div style=\"height:10px\"></div><div class=\"form-grid\" id=\"manual-ship\">' +\n        field('Société', '<select name=\"carrier\">' + options(list, list[0]) + '</select>') +\n        field('N° de suivi (facultatif)', input('tracking', '')) +\n      '</div>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Retour</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"manual-ship\" data-id=\"' + h(id) + '\">Marquer expédiée</button></div>');\n  }\n\n  function manualShip(btn) {\n    var id = btn.getAttribute('data-id');\n    var data = readForm($('#manual-ship'));\n    btn.disabled = true;\n    call('api_updateOrder', id, { status: 'Expédiée', carrier: data.carrier, tracking: data.tracking }).then(function (o) {\n      closeModal();\n      toast('Commande ' + id + ' expédiée : elle est maintenant dans Suivi');\n      afterOrderChange(o.counts);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function askCancelParcel(id, tracking, fromShipping) {\n    showModal(modalHead('Annuler le colis ?') +\n      '<p>Le colis <span class=\"mono\">' + h(tracking) + '</span> sera supprimé chez Ecotrack. C’est possible seulement s’il n’est pas encore validé.</p>' +\n      '<p class=\"small\" style=\"margin-top:8px\">La commande ' + h(id) + ' redeviendra « Confirmée » et modifiable. Après correction, recréez le colis depuis la page Expéditions.</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"' + (fromShipping ? 'close-modal' : 'open-order') + '\" data-id=\"' + h(id) + '\">Retour</button>' +\n      '<button type=\"button\" class=\"btn danger\" data-act=\"parcel-cancel\" data-id=\"' + h(id) + '\" data-from=\"' + (fromShipping ? 'ship' : 'order') + '\">Annuler le colis</button></div>');\n  }\n\n  function cancelParcel(btn) {\n    var id = btn.getAttribute('data-id');\n    var fromShipping = btn.getAttribute('data-from') === 'ship';\n    btn.disabled = true;\n    toast('Annulation du colis chez Ecotrack…');\n    call('api_cancelParcel', id).then(function (r) {\n      toast(r.message);\n      if (fromShipping) { closeModal(); afterOrderChange(r.counts); } else { afterOrderSaved(r.order, null, r.counts); openOrder(id); }\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function askDeleteOrder(id) {\n    showModal(modalHead('Supprimer la commande ' + h(id) + ' ?') +\n      '<p>Elle sera déplacée dans l’onglet <strong>Corbeille</strong> du classeur. Releasit et Shopify ne la feront pas revenir.</p>' +\n      '<p class=\"small\" style=\"margin-top:8px\">Pour la récupérer : dans le classeur, menu DZ Smart Shop › Restaurer une commande de la corbeille.</p>' +\n      '<div style=\"height:10px\"></div>' + field('Motif (facultatif)', input('trashReason', '', ' data-role=\"trash-reason\" placeholder=\"Ex. commande test\"'), 'full') +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"open-order\" data-id=\"' + h(id) + '\">Retour</button>' +\n      '<button type=\"button\" class=\"btn danger\" data-act=\"order-delete\" data-id=\"' + h(id) + '\">Mettre à la corbeille</button></div>');\n  }\n\n  function deleteOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    var reason = ($('[data-role=\"trash-reason\"]') || {}).value || '';\n    btn.disabled = true;\n    call('api_deleteOrder', id, reason).then(function (r) {\n      closeModal();\n      toast(r.message);\n      afterOrderSaved(null, id, r.counts);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function reopenOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    btn.disabled = true;\n    call('api_updateOrder', id, { status: 'À confirmer' }).then(function (o) {\n      toast('Commande ' + id + ' remise « À confirmer »');\n      afterOrderSaved(o);\n      openOrder(id);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /** Avertissement de stock pour les articles d'une commande. */\n  function stockNote(items) {\n    if (!items || !items.length) return '';\n    var short = items.filter(function (it) { return it.short; });\n    var html = short.map(function (it) {\n      return '<div class=\"stock-warn\">⚠ Stock insuffisant : ' + h(it.model || it.product) + ' — disponible ' + Math.max(it.available, 0) +\n        (it.reserved ? ' (' + it.reserved + ' réservé' + (it.reserved > 1 ? 's' : '') + ')' : '') + ', demandé ' + it.qty + '</div>';\n    }).join('');\n    if (!short.length && S.boot.user.admin) {\n      var unknown = items.filter(function (it) { return !it.matched; });\n      if (unknown.length) html += '<div class=\"stock-warn info\">Produit absent de l’onglet Produits : stock et bénéfice non suivis (' + h(unknown.map(function (u) { return u.label; }).join(', ')) + ').</div>';\n    }\n    return html;\n  }\n\n  function toggleCancelField() {\n    var st = $('#order-form [data-role=\"status\"]');\n    var reason = $('#order-form [name=\"cancelReason\"]');\n    if (!st || !reason) return;\n    reason.closest('.field').hidden = st.value !== 'Annulée';\n  }\n\n  /** Nouvelle commande : un produit choisi dans la liste remplit le prix (prix de vente × quantité). */\n  function fillNewOrderPrice() {\n    var form = $('#order-form');\n    var name = String(($('[name=\"product\"]', form) || {}).value || '').trim();\n    var p = S.boot.products.filter(function (x) { return x.name === name; })[0];\n    if (!p || !p.price) return;\n    var qty = Math.max(1, Number(($('[name=\"qty\"]', form) || {}).value) || 1);\n    $('[name=\"price\"]', form).value = p.price * qty;\n  }\n\n  function openNewOrder() {\n    showModal(\n      modalHead('Nouvelle commande', '<p class=\"small\" style=\"margin-top:4px\">Elle sera ajoutée au classeur et à la file de confirmation.</p>') +\n      '<div id=\"order-form\">' + orderFields({ qty: 1, mode: S.boot.modes[0] }) + '</div>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"create-order\">Ajouter la commande</button></div>'\n    );\n  }\n\n  /** Après une modification : recharge la page affichée ; les compteurs viennent de la réponse quand elle les donne. */\n  function afterOrderChange(counts) {\n    if (S.route === 'commandes') loadOrders();\n    else if (S.route === 'tableau') pageDashboard();\n    else if (S.route === 'expeditions') loadShipping();\n    else if (S.route === 'suivi') loadTracking();\n    if (counts) applyCounts(counts); else refreshCount();\n  }\n\n  function inStatusFilter(o) {\n    var f = String(S.filter.q || '').trim() ? 'all' : S.filter.status;\n    if (f === 'all') return true;\n    if (f === 'todo') return !o.status || TODO_STATUSES.indexOf(o.status) >= 0;\n    if (f === 'queue') return S.boot.queueStatuses.indexOf(o.status) >= 0;\n    return o.status === f;\n  }\n\n  /**\n   * Page Commandes : met à jour la ligne modifiée (ou la retire) sans recharger\n   * toute la liste. Ailleurs, recharge la page comme avant.\n   */\n  function afterOrderSaved(o, removedId, counts) {\n    counts = counts || (o && o.counts);\n    if (S.route !== 'commandes' || !S.list) { afterOrderChange(counts); return; }\n    applyCounts(counts);\n    var id = removedId || o.id;\n    var rows = S.list.rows;\n    var idx = -1;\n    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) idx = i;\n    if (idx < 0) { loadOrders(); return; }\n    var old = rows[idx];\n    var c = S.list.counts;\n    var bump = function (st, n) {\n      c[st || '—'] = Math.max((c[st || '—'] || 0) + n, 0);\n      if (S.boot.queueStatuses.indexOf(st) >= 0) c.queue = Math.max((c.queue || 0) + n, 0);\n      if (!st || TODO_STATUSES.indexOf(st) >= 0) c.todo = Math.max((c.todo || 0) + n, 0);\n    };\n    bump(old.status, -1);\n    if (removedId) c.all = Math.max((c.all || 0) - 1, 0); else bump(o.status, 1);\n    if (!removedId && inStatusFilter(o)) {\n      rows[idx] = o;\n    } else {\n      rows.splice(idx, 1);\n      S.list.total = Math.max(S.list.total - 1, 0);\n    }\n    renderChips(c);\n    renderOrderList(S.list);\n  }\n\n  function saveOrder(btn) {\n    var id = btn.getAttribute('data-id');\n    var form = $('#order-form');\n    var data = readForm(form);\n    if (form.getAttribute('data-locked') === '1') {\n      data = { notes: data.notes, status: data.status, cancelReason: data.cancelReason };\n    } else if (form.getAttribute('data-force') === '1') {\n      data.force = true;\n      data.forceReason = ($('[data-role=\"force-reason\"]') || {}).value || '';\n      if (!String(data.forceReason).trim()) { toast('Indiquez le motif du déverrouillage.', true); return; }\n    }\n    btn.disabled = true;\n    call('api_updateOrder', id, data).then(function (o) {\n      closeModal();\n      toast('Commande ' + o.id + ' enregistrée');\n      afterOrderSaved(o);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function createOrder(btn) {\n    var data = readForm($('#order-form'));\n    btn.disabled = true;\n    call('api_createOrder', data).then(function (o) {\n      closeModal();\n      toast('Commande ' + o.id + ' ajoutée');\n      afterOrderChange(o.counts);\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function toggleBlacklist(btn) {\n    var on = btn.getAttribute('data-on') === 'true';\n    btn.disabled = true;\n    call('api_setBlacklist', btn.getAttribute('data-phone'), on).then(function (r) {\n      toast(r.blacklisted ? 'Numéro ajouté à la liste noire' : 'Numéro retiré de la liste noire');\n      btn.setAttribute('data-on', String(!r.blacklisted));\n      btn.textContent = r.blacklisted ? 'Retirer de la liste noire' : 'Mettre en liste noire';\n      btn.classList.toggle('danger', !r.blacklisted);\n      btn.disabled = false;\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Centre de confirmation                                           */\n  /* ================================================================ */\n\n  function pageConfirm() {\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Centre de confirmation</h1><p class=\"sub\">Connecté(e) : ' + h(S.boot.user.name) + '</p></div>' +\n      '<div class=\"stats\" id=\"cstats\"></div></div>' +\n      '<div class=\"confirm\">' +\n        '<section class=\"queue\" id=\"queue\" aria-label=\"File d’appels\"><p class=\"loading\">Chargement…</p></section>' +\n        '<section class=\"detail\" id=\"detail\"></section>' +\n      '</div>';\n    S.currentId = null;\n    S.prefetch = null;\n    loadQueue(true, true);\n  }\n\n  /** Retire de la file les commandes déjà envoyées au serveur, pas encore enregistrées. */\n  function setQueue(q) {\n    q.due = q.due.filter(function (x) { return !S.pending[x.id]; });\n    q.later = q.later.filter(function (x) { return !S.pending[x.id]; });\n    q.stats.due = q.due.length;\n    q.stats.later = q.later.length;\n    S.queue = q;\n  }\n\n  function loadQueue(selectFirst, sync) {\n    var opts = sync ? (selectFirst ? { sync: true, first: true } : { sync: true }) : null;\n    return (opts ? call('api_queue', opts) : call('api_queue')).then(function (q) {\n      if (S.route !== 'confirmation') return;\n      if (q.arrived) toast(arrivedText(q.arrived));\n      if (q.menuCounts) applyCounts(q.menuCounts);\n      setQueue(q);\n      setQueueCount(q.stats.due, q.stats.pending);\n      renderQueue();\n      var ids = q.due.concat(q.later).map(function (x) { return x.id; });\n      if (selectFirst || !S.currentId || ids.indexOf(S.currentId) < 0) {\n        if (!selectFirst && S.currentId && !S.busy) toast('La commande ' + S.currentId + ' a été traitée par une autre personne.');\n        if (q.firstDetail && q.due.length && q.firstDetail.order.id === q.due[0].id) {\n          // Fiche jointe à la file : affichée sans nouvel aller-retour.\n          S.currentId = q.due[0].id; S.current = q.firstDetail; ++S.detailToken;\n          markCurrent(); renderDetail();\n        } else if (q.due.length) openInDetail(q.due[0].id);\n        else renderEmptyDetail();\n      }\n    }).catch(function (e) {\n      if (S.route === 'confirmation') $('#queue').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderQueue() {\n    var q = S.queue;\n    $('#cstats').innerHTML =\n      '<span>À appeler : <strong>' + q.stats.due + '</strong></span>' +\n      '<span>Rappels plus tard : <strong>' + q.stats.later + '</strong></span>' +\n      '<span>En attente au total : <strong>' + Math.max(S.pendingTotal || 0, q.stats.due) + '</strong></span>' +\n      '<span style=\"background:#E3F2EC;color:#0B6B4C;border-color:#BFE0D2\">Mes confirmations aujourd’hui : <strong>' + q.stats.confirmedToday + '</strong></span>';\n    var item = function (x) {\n      var when = x.status === 'À confirmer' ? 'reçue ' + ago(x.date) : (x.callback ? 'rappel ' + fmtDate(x.callback) : ago(x.date));\n      return '<button type=\"button\" class=\"q-item\" data-act=\"q-open\" data-id=\"' + h(x.id) + '\" aria-current=\"' + (x.id === S.currentId) + '\">' +\n        '<span class=\"q-top\"><strong>' + h(x.client || 'Sans nom') + '</strong><span class=\"small\">' + h(when) + '</span></span>' +\n        '<span class=\"small\" style=\"color:var(--ink-2)\">' + h(x.id) + ' · ' + h(wilayaName(x.wilaya)) + ' · ' + money(x.total) + '</span>' +\n        '<span class=\"q-tags\">' + alertPill(x.alert, x.alertLevel) + (x.status !== 'À confirmer' ? pill(x.status) : '') +\n          (x.attempts ? '<span class=\"pill\" style=\"background:#EEF0F3;color:#3D4350\">' + plural(x.attempts, 'appel', 'appels') + '</span>' : '') +\n          (x.waitingLong ? '<span class=\"pill\" style=\"background:#FBE7E7;color:#A12626\">jamais appelée · +24 h</span>' : '') +\n        '</span></button>';\n    };\n    var html = '<div class=\"q-top\"><span class=\"queue-title\">À appeler · ' + q.due.length + '</span>' +\n      '<button type=\"button\" class=\"btn\" style=\"min-height:36px;padding:0 10px\" data-act=\"refresh-queue\">Actualiser</button></div>';\n    html += q.due.length ? q.due.map(item).join('') : '<p class=\"small\">Personne à appeler pour le moment.</p>';\n    if (q.later.length) html += '<span class=\"queue-title\">Rappels programmés · ' + q.later.length + '</span>' + q.later.map(item).join('');\n    $('#queue').innerHTML = html;\n  }\n\n  function markCurrent() {\n    $all('#queue .q-item').forEach(function (b) {\n      b.setAttribute('aria-current', String(b.getAttribute('data-id') === S.currentId));\n    });\n  }\n\n  function renderEmptyDetail() {\n    S.currentId = null;\n    S.current = null;\n    var next = S.queue && S.queue.later[0];\n    $('#detail').innerHTML = '<div class=\"card\"><h2>La file est vide</h2><p class=\"sub\">Les nouvelles commandes arrivent automatiquement (toutes les 5 minutes).' +\n      (next ? ' Prochain rappel : ' + h(next.client) + ', ' + fmtDate(next.callback) + '.' : '') + '</p></div>';\n  }\n\n  function openInDetail(id) {\n    S.currentId = id;\n    markCurrent();\n    $('#queue').classList.remove('open');\n    $('#detail').innerHTML = '<div class=\"card\"><p class=\"loading\">Chargement…</p></div>';\n    var t = ++S.detailToken;\n    call('api_getOrder', id).then(function (data) {\n      if (t !== S.detailToken || S.route !== 'confirmation') return;\n      S.current = data;\n      renderDetail();\n    }).catch(function (e) {\n      if (t === S.detailToken) $('#detail').innerHTML = '<div class=\"card\">' + errorBox(e) + '</div>';\n    });\n  }\n\n  function renderDetail() {\n    var d = S.current;\n    var o = d.order;\n    var b = S.boot;\n    var hist = d.history;\n    var a = ALERT[o.alertLevel] || ALERT['new'];\n    var histText = hist.orders\n      ? plural(hist.orders, 'autre commande', 'autres commandes') + ' : ' + hist.delivered + ' livrée(s), ' + hist.returned + ' retour(s), ' + hist.cancelled + ' annulée(s)'\n      : 'Première commande avec ce numéro';\n    var dueCount = S.queue ? S.queue.due.length : 0;\n    var callBtn = d.phoneValid\n      ? '<a class=\"btn primary\" href=\"tel:' + h(o.phone) + '\" target=\"_top\">Appeler</a>'\n      : '<span class=\"btn\" aria-disabled=\"true\">Numéro invalide</span>';\n    var waBtn = d.intlPhone\n      ? '<a class=\"btn\" id=\"d-wa\" href=\"#\" target=\"_blank\" rel=\"noopener\">WhatsApp</a>'\n      : '';\n\n    $('#detail').innerHTML =\n      '<div class=\"card\">' +\n        '<div class=\"detail-head\"><div><h2>' + h(o.client || 'Client sans nom') + ' · ' + h(o.id) + '</h2>' +\n          '<p class=\"muted\">' + h(fmtPhone(o.phone)) + ' · reçue ' + h(ago(o.date)) + (o.attempts ? ' · ' + plural(o.attempts, 'appel', 'appels') : '') +\n            ' · jour ' + Math.min(o.callDay, S.boot.callDays) + '/' + S.boot.callDays + ' · ' + o.callsToday + '/' + S.boot.callsPerDay + ' appels aujourd’hui</p></div>' +\n          '<div class=\"quick\"><button type=\"button\" class=\"btn queue-toggle\" data-act=\"toggle-queue\">File (' + dueCount + ')</button>' + callBtn + waBtn + '</div>' +\n        '</div>' +\n        '<div class=\"history\" style=\"background:' + a.bg + '\"><span class=\"strong\" style=\"color:' + a.fg + '\">' + h(o.alert || 'Nouveau client') + '</span><span>' + h(histText) + '</span></div>' +\n        stockNote(d.stock) +\n        '<div class=\"form-grid\" id=\"d-form\">' +\n          field('Client', input('client', o.client)) +\n          field('Téléphone', input('phone', o.phone, ' inputmode=\"tel\"')) +\n          field('Wilaya', '<select name=\"wilaya\">' + options(b.wilayas, o.wilaya, 'Choisir…') + '</select>') +\n          field('Commune', input('commune', o.commune)) +\n          field('Livraison', '<select name=\"mode\">' + options(b.modes, o.mode || b.modes[0]) + '</select>') +\n          field('Quantité', input('qty', o.qty, ' type=\"number\" min=\"1\" step=\"1\"')) +\n          field('Adresse', input('address', o.address), 'full') +\n          field('Notes', '<textarea name=\"notes\">' + h(o.notes) + '</textarea>', 'full') +\n        '</div>' +\n        '<div class=\"sum\" id=\"d-sum\"></div>' +\n      '</div>' +\n      '<div class=\"card\"><h3>Résultat de l’appel</h3>' +\n        '<div class=\"outcomes\">' +\n          '<button type=\"button\" class=\"btn primary big\" data-act=\"confirm\">Confirmer</button>' +\n          '<button type=\"button\" class=\"btn big\" data-act=\"no_answer\">Pas de réponse</button>' +\n          '<button type=\"button\" class=\"btn warn big\" data-act=\"show-callback\">Rappeler plus tard</button>' +\n          '<button type=\"button\" class=\"btn danger big\" data-act=\"show-cancel\">Annuler</button>' +\n        '</div><div id=\"d-panel\"></div>' +\n      '</div>' +\n      '<div class=\"card\"><h3>Message WhatsApp</h3><p class=\"message\" id=\"d-msg\"></p>' +\n        '<p class=\"small\" style=\"margin-top:8px\">Modèle modifiable dans l’onglet Paramètres (MESSAGE_WHATSAPP).</p></div>';\n    updateSummary();\n    prefetchNext();\n  }\n\n  /** La commande suivante de la file (après `id`), ou null. */\n  function nextDueAfter(id) {\n    var due = S.queue ? S.queue.due : [];\n    for (var i = 0; i < due.length; i++) {\n      if (due[i].id === id) return due[i + 1] || (i > 0 ? due[0] : null);\n    }\n    return due[0] && due[0].id !== id ? due[0] : null;\n  }\n\n  /** Prépare en arrière-plan la commande suivante : elle s'affichera tout de suite. */\n  function prefetchNext() {\n    var next = S.currentId ? nextDueAfter(S.currentId) : null;\n    if (!next || (S.prefetch && S.prefetch.id === next.id)) return;\n    var id = next.id;\n    S.prefetch = { id: id, data: null };\n    call('api_getOrder', id).then(function (d) {\n      if (S.prefetch && S.prefetch.id === id) S.prefetch.data = d;\n    }).catch(function () {\n      if (S.prefetch && S.prefetch.id === id) S.prefetch = null;\n    });\n  }\n\n  /** Recalcule prix, frais, total et message quand la confirmatrice modifie la commande. */\n  function updateSummary() {\n    if (!S.current || !$('#d-form')) return;\n    var o = S.current.order;\n    var f = readForm($('#d-form'));\n    var qty = Math.max(1, parseInt(f.qty, 10) || 1);\n    var unit = o.qty ? o.price / o.qty : o.price;\n    var price = qty === o.qty ? o.price : Math.round(unit * qty);\n    var changed = f.wilaya !== o.wilaya || f.mode !== o.mode;\n    var fee = feeFor(f.wilaya, o.carrier, f.mode);\n    var shipping = (changed || o.shipping === null) && fee !== null ? fee : (o.shipping || 0);\n    var total = (price !== o.price || shipping !== (o.shipping || 0)) ? price + shipping : o.total;\n    var carrier = o.carrier || S.boot.defaultCarrier;\n    $('#d-sum').innerHTML =\n      '<div><span>' + h(f.product || o.product || 'Produits') + ' ×' + qty + '</span><span>' + money(price) + '</span></div>' +\n      '<div class=\"muted\"><span>Livraison ' + h(f.mode) + ' · ' + h(carrier) + (fee === null ? ' (tarif non renseigné)' : '') + '</span><span>' + money(shipping) + '</span></div>' +\n      '<div class=\"total\"><span>Total à encaisser</span><span>' + money(total) + '</span></div>';\n    var msg = fillTemplate(S.boot.waTemplate, {\n      client: f.client, id: o.id, product: o.product, qty: qty, total: total, commune: f.commune, wilaya: f.wilaya\n    });\n    $('#d-msg').textContent = msg;\n    var wa = $('#d-wa');\n    if (wa) wa.href = 'https://wa.me/' + S.current.intlPhone + '?text=' + encodeURIComponent(msg);\n  }\n\n  function fillTemplate(tpl, x) {\n    var first = String(x.client || '').trim().split(/\\s+/)[0] || '';\n    var map = {\n      prenom: first,\n      client: x.client || '',\n      numero: x.id,\n      produit: (x.product || '') + (x.qty > 1 ? ' ×' + x.qty : ''),\n      total: money(x.total),\n      commune: x.commune || '',\n      wilaya: wilayaName(x.wilaya),\n      boutique: S.boot.shop\n    };\n    return String(tpl || '').replace(/\\{(\\w+)\\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });\n  }\n\n  function showPanel(kind) {\n    var p = $('#d-panel');\n    if (kind === 'callback') {\n      p.innerHTML = '<div class=\"panel\"><span class=\"strong\">Quand rappeler ?</span><div class=\"quick\">' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-min=\"60\">Dans 1 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-min=\"180\">Dans 3 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-tomorrow=\"10\">Demain 10 h</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"cb-quick\" data-tomorrow=\"17\">Demain 17 h</button></div>' +\n        '<div class=\"form-grid\">' + field('Autre date et heure', '<input type=\"datetime-local\" id=\"cb-when\">') + '</div>' +\n        '<div><button type=\"button\" class=\"btn warn\" data-act=\"callback\">Programmer le rappel</button></div></div>';\n    } else {\n      p.innerHTML = '<div class=\"panel\"><div class=\"form-grid\">' +\n        field('Motif d’annulation', '<select id=\"cancel-reason\">' + options(S.boot.cancelReasons, '') + '</select>') + '</div>' +\n        '<label style=\"display:flex;gap:10px;align-items:center;min-height:44px\"><input type=\"checkbox\" id=\"cancel-black\" style=\"width:20px;height:20px\"> Ajouter ce numéro à la liste noire</label>' +\n        '<div><button type=\"button\" class=\"btn danger\" data-act=\"cancel\">Confirmer l’annulation</button></div></div>';\n    }\n    var first = p.querySelector('button, select, input');\n    if (first) first.focus();\n  }\n\n  function submit(outcome, extra) {\n    if (S.busy || !S.currentId || Date.now() < S.cooldown) return;\n    var id = S.currentId;\n    var payload = { fields: readForm($('#d-form')) };\n    Object.keys(extra || {}).forEach(function (k) { payload[k] = extra[k]; });\n    var blacklist = outcome === 'cancel' && $('#cancel-black') && $('#cancel-black').checked;\n    var phone = S.current.order.phone;\n    var next = nextDueAfter(id);\n    var ready = next && S.prefetch && S.prefetch.id === next.id && S.prefetch.data ? S.prefetch.data : null;\n    var waitingFor = next && !ready ? next.id : null;\n\n    // 1. La commande traitée quitte la file, la suivante s'affiche tout de suite.\n    S.pending[id] = true;\n    setQueue(S.queue);\n    if (outcome === 'confirm') S.queue.stats.confirmedToday++;\n    if (outcome === 'confirm' || outcome === 'cancel') S.pendingTotal = Math.max((S.pendingTotal || 0) - 1, 0);\n    setQueueCount(S.queue.due.length);\n    S.cooldown = Date.now() + 800;\n    renderQueue();\n    if (ready) {\n      S.currentId = next.id; S.current = ready; S.prefetch = null;\n      markCurrent(); renderDetail();\n    } else if (next) {\n      S.currentId = next.id; S.current = null; ++S.detailToken;\n      markCurrent();\n      $('#detail').innerHTML = '<div class=\"card\"><p class=\"loading\">Chargement…</p></div>';\n    } else {\n      renderEmptyDetail();\n    }\n\n    // 2. Enregistrement : un seul aller-retour (résultat, commande suivante si besoin, file, compteurs).\n    call('api_recordCall', id, outcome, payload, { next: waitingFor, queue: true }).then(function (o) {\n      delete S.pending[id];\n      var msgs = {\n        confirm: 'Commande ' + o.id + ' confirmée',\n        no_answer: o.status === 'Annulée' ? 'Commande ' + o.id + ' annulée automatiquement : aucune réponse en ' + S.boot.callDays + ' jours'\n          : o.status === 'Injoignable' ? 'Commande ' + o.id + ' : client injoignable'\n          : 'Pas de réponse (' + o.callsToday + '/' + S.boot.callsPerDay + ' aujourd’hui), rappel ' + fmtDate(o.callback),\n        callback: 'Rappel programmé ' + fmtDate(o.callback),\n        cancel: 'Commande ' + o.id + ' annulée'\n      };\n      toast(msgs[outcome]);\n      if (blacklist) call('api_setBlacklist', phone, true).catch(function (e) { toast(errText(e), true); });\n      applyCounts(o.counts);\n      if (S.route !== 'confirmation') return;\n      if (o.queue) { setQueue(o.queue); setQueueCount(S.queue.due.length); renderQueue(); }\n      if (waitingFor && S.currentId === waitingFor && !S.current) {\n        if (o.next) { S.current = o.next; renderDetail(); } else openInDetail(waitingFor);\n      }\n    }).catch(function (e) {\n      delete S.pending[id];\n      toast('Commande ' + id + ' non enregistrée : ' + errText(e), true);\n      if (S.route !== 'confirmation') return;\n      loadQueue(!S.currentId);\n      if (waitingFor && S.currentId === waitingFor && !S.current) openInDetail(waitingFor);\n    });\n  }\n\n  /* ================================================================ */\n  /* Expéditions (Ecotrack)                                           */\n  /* ================================================================ */\n\n  function pageShipping() {\n    view.innerHTML =\n      '<div class=\"page-head\"><div><h1>Expéditions</h1><p class=\"sub\">Envoi à Ecotrack, bordereaux et validation de l’expédition</p></div>' +\n      '<button type=\"button\" class=\"btn\" data-act=\"ship-reload\">Actualiser</button></div>' +\n      '<div id=\"ship\"><p class=\"loading\">Chargement…</p></div>';\n    loadShipping();\n  }\n\n  function loadShipping() {\n    var t = ++S.token;\n    return call('api_shippingList').then(function (d) {\n      if (t !== S.token || S.route !== 'expeditions') return;\n      S.ship.data = d;\n      var ready = {};\n      d.toShip.forEach(function (o) { if (!o.problems.length) ready[o.id] = true; });\n      Object.keys(S.ship.selected).forEach(function (id) { if (!ready[id]) delete S.ship.selected[id]; });\n      var created = {};\n      d.created.forEach(function (o) { created[o.id] = true; });\n      Object.keys(S.ship.created.sel).forEach(function (id) { if (!created[id]) delete S.ship.created.sel[id]; });\n      renderShipping();\n      maybeRefreshCreated(d);\n    }).catch(function (e) {\n      if (t === S.token && S.route === 'expeditions') $('#ship').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderShipping() {\n    var box = $('#ship');\n    var sh = S.ship;\n    var d = sh.data;\n    if (!box || !d) return;\n    var ready = d.toShip.filter(function (o) { return !o.problems.length; });\n    var picked = Object.keys(sh.selected).length;\n    var html = '<div class=\"stack\">';\n\n    // Connexion\n    html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Ecotrack</h2><p class=\"muted\">' +\n      (d.configured ? 'Connecté à ' + h(d.host) : 'Pas encore configuré') + '</p></div>';\n    if (d.configured) {\n      html += '<div class=\"quick\">' +\n        '<button type=\"button\" class=\"btn\" data-act=\"eco-test\">Tester la connexion</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"eco-fees-ask\">Récupérer les tarifs</button>' +\n        '<button type=\"button\" class=\"btn\" data-act=\"eco-status\">Mettre à jour les statuts</button></div>';\n    }\n    html += '</div>';\n    if (!d.configured) {\n      html += '<p>Pour envoyer vos colis, enregistrez l’adresse de votre plateforme Ecotrack et votre jeton API. ' +\n        'Dans le classeur, sur ordinateur : menu <strong>DZ Smart Shop › Ecotrack › Enregistrer l’adresse et le jeton</strong>. ' +\n        'Le jeton reste dans les propriétés protégées du script, jamais dans le classeur.</p>';\n    }\n    if (d.catalogError) html += '<div style=\"margin-top:12px\">' + errorBox(d.catalogError) + '</div>';\n    html += '</section>';\n\n    // Résultat du dernier envoi\n    if (sh.results) {\n      var okCount = sh.results.filter(function (r) { return r.ok; }).length;\n      html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Résultat de l’envoi</h2><p class=\"muted\">' +\n        plural(okCount, 'colis créé', 'colis créés') + (sh.results.length - okCount ? ' · ' + plural(sh.results.length - okCount, 'refusé', 'refusés') : '') +\n        '</p></div><button type=\"button\" class=\"btn\" data-act=\"ship-dismiss\">Fermer</button></div>';\n      if (okCount) {\n        html += '<p style=\"margin-bottom:8px\">Ces colis sont <strong>créés</strong> chez Ecotrack mais <strong>pas encore expédiés</strong> : ' +\n          'imprimez les bordereaux, puis validez l’expédition (onglet « Créés, à valider »).</p>' +\n          '<div class=\"quick\" style=\"margin-bottom:8px\"><button type=\"button\" class=\"btn primary\" data-act=\"labels-from-results\">🖨 Imprimer les bordereaux de ces colis</button></div>';\n      }\n      html += sh.results.map(function (r) {\n        return '<div class=\"result-row\"><span class=\"pill\" style=\"background:' + (r.ok ? '#DDF0E4;color:#146C2E' : '#FBE7E7;color:#A12626') + '\">' + (r.ok ? 'Créé' : 'Refusé') + '</span>' +\n          '<span class=\"grow\"><strong>' + h(r.id) + '</strong>' + (r.client ? ' · ' + h(r.client) : '') +\n          (r.message ? '<br><span class=\"small\" style=\"color:' + (r.ok ? 'var(--muted)' : '#A12626') + '\">' + h(r.message) + '</span>' : '') + '</span>' +\n          (r.ok ? '<span class=\"mono strong\">' + h(r.tracking) + '</span>' : '') + '</div>';\n      }).join('');\n      html += '</section>';\n    }\n\n    // Résultat de la dernière validation\n    if (sh.vresults) {\n      var vOk = sh.vresults.filter(function (r) { return r.ok; }).length;\n      html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Résultat de la validation</h2><p class=\"muted\">' +\n        plural(vOk, 'colis validé', 'colis validés') + (sh.vresults.length - vOk ? ' · ' + plural(sh.vresults.length - vOk, 'refusé', 'refusés') : '') +\n        '</p></div><button type=\"button\" class=\"btn\" data-act=\"ship-vdismiss\">Fermer</button></div>';\n      if (vOk) html += '<p style=\"margin-bottom:8px\">Ces colis sont <strong>expédiés</strong> : ils sont maintenant dans la page <a href=\"#/suivi\">Suivi</a>.</p>';\n      html += sh.vresults.map(function (r) {\n        return '<div class=\"result-row\"><span class=\"pill\" style=\"background:' + (r.ok ? '#DDF0E4;color:#146C2E' : '#FBE7E7;color:#A12626') + '\">' + (r.ok ? 'Validé' : 'Refusé') + '</span>' +\n          '<span class=\"grow\"><strong>' + h(r.id) + '</strong>' + (r.client ? ' · ' + h(r.client) : '') +\n          (r.message ? '<br><span class=\"small\" style=\"color:' + (r.ok ? 'var(--muted)' : '#A12626') + '\">' + h(r.message) + '</span>' : '') + '</span>' +\n          (r.tracking ? '<span class=\"mono strong\">' + h(r.tracking) + '</span>' : '') + '</div>';\n      }).join('');\n      html += '</section>';\n    }\n\n    // Onglets\n    html += '<div class=\"chips\" role=\"group\" aria-label=\"Vue\">' +\n      '<button type=\"button\" class=\"chip\" data-act=\"ship-tab\" data-tab=\"toship\" aria-pressed=\"' + (sh.tab === 'toship') + '\">À expédier · ' + d.toShip.length + '</button>' +\n      '<button type=\"button\" class=\"chip\" data-act=\"ship-tab\" data-tab=\"created\" aria-pressed=\"' + (sh.tab === 'created') + '\">Créés, à valider · ' + d.created.length + '</button></div>';\n\n    if (sh.tab === 'toship') html += renderToShip(d, ready, picked);\n    else html += renderCreated(d);\n    html += '</div>';\n    box.innerHTML = html;\n  }\n\n  function renderToShip(d, ready, picked) {\n    var sh = S.ship;\n    if (!d.toShip.length) return '<div class=\"card\"><p class=\"empty\">Aucune commande confirmée à expédier.</p></div>';\n    var allPicked = ready.length > 0 && picked === ready.length;\n    var html = '<div class=\"quick\" style=\"align-items:center;justify-content:space-between\">' +\n      '<label style=\"display:flex;align-items:center;gap:10px;min-height:44px\"><input type=\"checkbox\" class=\"check\" data-ship-all' + (allPicked ? ' checked' : '') + (ready.length ? '' : ' disabled') + '> ' +\n      'Tout sélectionner (' + ready.length + ' prêtes)</label>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"ship-ask\"' + ((!picked || !d.configured || sh.busy) ? ' disabled' : '') + '>' +\n      (sh.busy ? 'Création en cours…' : 'Envoyer ' + plural(picked, 'colis', 'colis') + ' à Ecotrack') + '</button></div>';\n    html += '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' +\n      ['', 'Commande', 'Destination', 'Livraison', 'Total', 'État', ''].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>';\n    d.toShip.forEach(function (o) {\n      var ok = !o.problems.length;\n      html += '<tr>' +\n        '<td data-label=\"Choisir\">' + (ok ? '<input type=\"checkbox\" class=\"check\" data-ship-check=\"' + h(o.id) + '\"' + (sh.selected[o.id] ? ' checked' : '') + ' aria-label=\"Sélectionner la commande ' + h(o.id) + '\">' : '') + '</td>' +\n        '<td data-label=\"Commande\" class=\"multi\"><strong>' + h(o.id) + '</strong> · ' + h(o.client) + '<div class=\"small\">' + h(o.product) + '</div></td>' +\n        '<td data-label=\"Destination\" class=\"multi\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"Livraison\">' + h(o.mode) + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"État\">' + (ok ? '<span class=\"pill\" style=\"background:#DDF0E4;color:#146C2E\">Prête</span>' :\n          '<span class=\"problems\">' + o.problems.map(function (p) { return '<span>' + h(p) + '</span>'; }).join('') + '</span>') + '</td>' +\n        '<td data-label=\"\"><span class=\"quick\"><button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">Modifier</button>' +\n          (manualCarriers().length ? '<button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"manual-ship-ask\" data-id=\"' + h(o.id) + '\">Expédiée (autre société)</button>' : '') + '</span></td></tr>';\n    });\n    return html + '</tbody></table></div>' +\n      '<p class=\"small\">Les colis partent chez Ecotrack avec le total affiché (livraison comprise). La commune doit être écrite comme chez Ecotrack : sinon le colis est refusé et vous en êtes prévenu ici.</p>';\n  }\n\n  function renderCreated(d) {\n    var sh = S.ship;\n    var c = sh.created;\n    if (!d.created.length) return '<div class=\"card\"><p class=\"empty\">Aucun colis en attente de validation.</p></div>';\n    var unprinted = d.created.filter(function (o) { return !o.label.printed; });\n    var list = c.filter === 'unprinted' ? unprinted : d.created;\n    var n = pickedCreated().length;\n    var allPicked = list.length > 0 && list.every(function (o) { return c.sel[o.id]; });\n    var fmt = labelFormat();\n    var html = '<p class=\"small\"><strong>1.</strong> Imprimez les bordereaux et collez-les sur les colis. ' +\n      '<strong>2.</strong> Validez l’expédition, ici ou sur le site d’Ecotrack : la commande passe « Expédiée » et va dans Suivi. ' +\n      'Un colis pas validé depuis plus de ' + d.alertHours + ' h est signalé.</p>';\n    html += '<div class=\"chips\" role=\"group\" aria-label=\"Filtre des colis\">' +\n      '<button type=\"button\" class=\"chip\" data-act=\"created-filter\" data-filter=\"all\" aria-pressed=\"' + (c.filter !== 'unprinted') + '\">Tous · ' + d.created.length + '</button>' +\n      '<button type=\"button\" class=\"chip\" data-act=\"created-filter\" data-filter=\"unprinted\" aria-pressed=\"' + (c.filter === 'unprinted') + '\">Pas encore imprimés · ' + unprinted.length + '</button></div>';\n    html += '<section class=\"card label-bar\">' +\n      '<label class=\"check-line\"><input type=\"checkbox\" class=\"check\" data-created-all' + (allPicked ? ' checked' : '') + (list.length ? '' : ' disabled') + '> ' +\n      'Tout sélectionner (' + list.length + ')</label>' +\n      '<div class=\"chips\" role=\"group\" aria-label=\"Format d’impression\">' +\n      '<span class=\"small strong\">Format :</span>' +\n      '<button type=\"button\" class=\"chip\" data-act=\"label-format\" data-format=\"A4\" aria-pressed=\"' + (fmt === 'A4') + '\">A4 · 4 par feuille</button>' +\n      '<button type=\"button\" class=\"chip\" data-act=\"label-format\" data-format=\"10x15\" aria-pressed=\"' + (fmt === '10x15') + '\">Étiquette 10×15</button></div>' +\n      '<div class=\"quick\">' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"labels-print\"' + ((!n || sh.printing) ? ' disabled' : '') + '>🖨 Imprimer les bordereaux (' + n + ')</button>' +\n      (d.canValidate ? '<button type=\"button\" class=\"btn\" data-act=\"validate-ask\"' + ((!n || sh.vbusy) ? ' disabled' : '') + '>' +\n        (sh.vbusy ? 'Validation en cours…' : '✓ Valider l’expédition (' + n + ')') + '</button>' : '') +\n      '</div></section>';\n    if (!list.length) return html + '<div class=\"card\"><p class=\"empty\">Tous les bordereaux sont imprimés.</p></div>';\n    html += '<div class=\"table-wrap\"><table class=\"data cards\"><thead><tr>' +\n      ['', 'Commande', 'Destination', 'N° de suivi', 'Bordereau', 'Créé depuis', 'Total', ''].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>';\n    list.forEach(function (o) {\n      html += '<tr>' +\n        '<td data-label=\"Choisir\"><input type=\"checkbox\" class=\"check\" data-created-check=\"' + h(o.id) + '\"' + (c.sel[o.id] ? ' checked' : '') + ' aria-label=\"Sélectionner le colis ' + h(o.id) + '\"></td>' +\n        '<td data-label=\"Commande\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(o.id) + '\">' + h(o.id) + '</button> · ' + h(o.client) + '</td>' +\n        '<td data-label=\"Destination\" class=\"multi\">' + h(o.wilaya) + '<div class=\"small\">' + h(o.commune) + '</div></td>' +\n        '<td data-label=\"N° de suivi\" class=\"mono\">' + h(o.tracking) + '</td>' +\n        '<td data-label=\"Bordereau\" class=\"multi\">' + labelBadge(o.label) + '</td>' +\n        '<td data-label=\"Créé depuis\">' + h(hoursText(o.ageHours)) + (o.late ? ' <span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">à valider</span>' : '') + '</td>' +\n        '<td data-label=\"Total\" class=\"num strong\">' + money(o.total) + '</td>' +\n        '<td data-label=\"\"><button type=\"button\" class=\"btn danger\" style=\"min-height:36px\" data-act=\"parcel-cancel-ask\" data-from=\"ship\" data-id=\"' + h(o.id) + '\" data-tracking=\"' + h(o.tracking) + '\">Annuler le colis</button></td></tr>';\n    });\n    return html + '</tbody></table></div>' +\n      (d.canValidate ? '' : '<p class=\"small\">La validation de l’expédition est réservée à l’administrateur et au magasinier (onglet Équipe).</p>') +\n      '<p class=\"small\">Une erreur dans un colis pas encore validé ? « Annuler le colis » le supprime chez Ecotrack : la commande redevient modifiable, puis vous recréez le colis (et réimprimez son bordereau).</p>';\n  }\n\n  function pickedCreated() {\n    var d = S.ship.data;\n    if (!d) return [];\n    return d.created.filter(function (o) { return S.ship.created.sel[o.id]; }).map(function (o) { return o.id; });\n  }\n\n  /** « Imprimé le … par … », « Pas imprimé » ou « À réimprimer ». */\n  function labelBadge(l) {\n    l = l || {};\n    if (l.reprint) return '<span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">À réimprimer</span><div class=\"small\">colis recréé : nouveau n° de suivi</div>';\n    if (l.printed) return '<span class=\"pill\" style=\"background:#DDF0E4;color:#146C2E\">🖨 Imprimé</span><div class=\"small\">le ' + h(l.at) + (l.by ? ' · ' + h(l.by) : '') + '</div>';\n    return '<span class=\"pill\" style=\"background:#EEF0F3;color:#3D4350\">Pas imprimé</span>';\n  }\n\n  /* ---------------- Bordereaux : téléchargement, mise en page, impression ---------------- */\n\n  var LABEL_FORMAT_KEY = 'dz-smart-shop:format-bordereau';\n  /** Format de cet appareil (retenu), sinon celui des Paramètres. */\n  function labelFormat() {\n    var v = '';\n    try { v = window.localStorage.getItem(LABEL_FORMAT_KEY) || ''; } catch (e) { v = ''; }\n    if (v === 'A4' || v === '10x15') return v;\n    return (S.ship.data && S.ship.data.labelFormat) || 'A4';\n  }\n  function setLabelFormat(v) {\n    try { window.localStorage.setItem(LABEL_FORMAT_KEY, v); } catch (e) { /* navigation privée : choix non retenu */ }\n  }\n\n  // Outil PDF (pdf-lib), chargé seulement au moment d'imprimer. L'empreinte vérifie que le fichier n'a pas été modifié.\n  var PDFLIB_URLS = [\n    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',\n    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'\n  ];\n  var PDFLIB_SRI = 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI';\n  var pdfLibLoading = null;\n  function loadPdfLib() {\n    if (window.PDFLib) return Promise.resolve(window.PDFLib);\n    if (pdfLibLoading) return pdfLibLoading;\n    var attempt = function (i) {\n      return new Promise(function (resolve, reject) {\n        var tag = document.createElement('script');\n        tag.src = PDFLIB_URLS[i];\n        tag.integrity = PDFLIB_SRI;\n        tag.crossOrigin = 'anonymous';\n        tag.onload = function () { if (window.PDFLib) resolve(window.PDFLib); else reject(new Error('pdf-lib')); };\n        tag.onerror = function () { tag.parentNode.removeChild(tag); reject(new Error('pdf-lib')); };\n        document.head.appendChild(tag);\n      }).catch(function () {\n        if (i + 1 < PDFLIB_URLS.length) return attempt(i + 1);\n        throw new Error('Impossible de charger l’outil de mise en page des PDF. Vérifiez la connexion internet, puis réessayez.');\n      });\n    };\n    pdfLibLoading = attempt(0).catch(function (e) { pdfLibLoading = null; throw e; });\n    return pdfLibLoading;\n  }\n\n  function base64Bytes(b64) {\n    var bin = atob(b64);\n    var out = new Uint8Array(bin.length);\n    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);\n    return out;\n  }\n\n  var MM = 72 / 25.4; // points par millimètre\n  /** Pose une page de bordereau dans une case, sans la déformer, centrée. */\n  function placeLabel(page, emb, x, y, w, hgt, margin) {\n    var scale = Math.min((w - 2 * margin) / emb.width, (hgt - 2 * margin) / emb.height);\n    var dw = emb.width * scale;\n    var dh = emb.height * scale;\n    page.drawPage(emb, { x: x + (w - dw) / 2, y: y + (hgt - dh) / 2, width: dw, height: dh });\n  }\n  function layoutLabels(L, out, pages, format) {\n    if (format === '10x15') {\n      pages.forEach(function (emb) { placeLabel(out.addPage([100 * MM, 150 * MM]), emb, 0, 0, 100 * MM, 150 * MM, 0); });\n      return;\n    }\n    var W = 210 * MM;\n    var H = 297 * MM;\n    var grey = L.rgb(0.6, 0.6, 0.6);\n    for (var i = 0; i < pages.length; i += 4) {\n      var page = out.addPage([W, H]);\n      for (var k = 0; k < 4 && i + k < pages.length; k++) {\n        placeLabel(page, pages[i + k], (k % 2) * W / 2, H - (Math.floor(k / 2) + 1) * H / 2, W / 2, H / 2, 5 * MM);\n      }\n      // Traits de coupe\n      page.drawLine({ start: { x: W / 2, y: 0 }, end: { x: W / 2, y: H }, thickness: 0.5, color: grey, dashArray: [4, 4] });\n      page.drawLine({ start: { x: 0, y: H / 2 }, end: { x: W, y: H / 2 }, thickness: 0.5, color: grey, dashArray: [4, 4] });\n    }\n  }\n\n  /** Un seul PDF avec tous les bordereaux : { bytes, pages, done, bad }. */\n  function buildLabelsPdf(L, files, format) {\n    return L.PDFDocument.create().then(function (out) {\n      var pages = [];\n      var done = [];\n      var bad = [];\n      var step = files.reduce(function (p, f) {\n        return p.then(function () {\n          return L.PDFDocument.load(base64Bytes(f.pdf), { ignoreEncryption: true })\n            .then(function (src) { return out.embedPdf(src, src.getPageIndices()); })\n            .then(function (embedded) { embedded.forEach(function (e) { pages.push(e); }); done.push(f); })\n            .catch(function () { f.message = 'PDF d’Ecotrack illisible.'; bad.push(f); });\n        });\n      }, Promise.resolve());\n      return step.then(function () {\n        if (!pages.length) return { bytes: null, pages: 0, done: done, bad: bad };\n        layoutLabels(L, out, pages, format);\n        return out.save().then(function (bytes) { return { bytes: bytes, pages: out.getPageCount(), done: done, bad: bad }; });\n      });\n    });\n  }\n\n  function failedList(failed) {\n    if (!failed.length) return '';\n    return '<div class=\"lock-box warn\"><p>' + plural(failed.length, 'bordereau non reçu', 'bordereaux non reçus') + ' :</p></div>' +\n      failed.map(function (r) {\n        return '<div class=\"result-row\"><span class=\"pill\" style=\"background:#FBE7E7;color:#A12626\">Erreur</span>' +\n          '<span class=\"grow\"><strong>' + h(r.id) + '</strong>' + (r.client ? ' · ' + h(r.client) : '') +\n          '<br><span class=\"small\" style=\"color:#A12626\">' + h(r.message || 'Erreur inconnue') + '</span></span></div>';\n      }).join('');\n  }\n\n  function printProgress(done, total) {\n    var p = total ? Math.round(done / total * 100) : 0;\n    showModal(modalHead('Bordereaux') + '<p>Préparation des bordereaux… ' + done + ' / ' + total + '</p>' +\n      '<div class=\"progress\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"' + total + '\" aria-valuenow=\"' + done + '\"><span style=\"width:' + p + '%\"></span></div>');\n  }\n\n  /** Télécharge les bordereaux chez Ecotrack (par petits paquets), puis les réunit en un seul PDF. */\n  function printLabels(ids) {\n    if (S.ship.printing || !ids.length) return;\n    var format = labelFormat();\n    var per = (S.ship.data && S.ship.data.labelsPerCall) || 6;\n    var files = [];\n    var failed = [];\n    S.ship.printing = true;\n    if (S.route === 'expeditions') renderShipping();\n    printProgress(0, ids.length);\n    var lib = loadPdfLib();\n    lib.catch(function () { /* l'erreur est affichée plus bas */ });\n    var chunks = [];\n    for (var i = 0; i < ids.length; i += per) chunks.push(ids.slice(i, i + per));\n    chunks.reduce(function (p, chunk) {\n      return p.then(function () {\n        return call('api_labelFiles', chunk).then(function (res) {\n          res.forEach(function (r) { (r.ok ? files : failed).push(r); });\n          printProgress(files.length + failed.length, ids.length);\n        });\n      });\n    }, Promise.resolve()).then(function () {\n      if (!files.length) return { bytes: null, pages: 0, done: [], bad: [] };\n      return lib.then(function (L) { return buildLabelsPdf(L, files, format); });\n    }).then(function (res) {\n      S.ship.printing = false;\n      if (S.route === 'expeditions') renderShipping();\n      failed = failed.concat(res.bad);\n      if (!res.bytes) {\n        showModal(modalHead('Bordereaux') + '<p>Aucun bordereau n’a pu être préparé.</p>' + failedList(failed) +\n          '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button></div>');\n        return;\n      }\n      showLabelsReady(res, failed, format);\n    }).catch(function (e) {\n      S.ship.printing = false;\n      if (S.route === 'expeditions') renderShipping();\n      showModal(modalHead('Bordereaux') + errorBox(e) + failedList(failed) +\n        '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button></div>');\n    });\n  }\n\n  function showLabelsReady(res, failed, format) {\n    if (S.ship.pdf && S.ship.pdf.url) URL.revokeObjectURL(S.ship.pdf.url);\n    var url = URL.createObjectURL(new Blob([res.bytes], { type: 'application/pdf' }));\n    S.ship.pdf = { url: url, marked: false, items: res.done.map(function (f) { return { id: f.id, tracking: f.tracking }; }) };\n    var now = new Date();\n    var name = 'bordereaux-' + now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2) +\n      '-' + ('0' + now.getHours()).slice(-2) + 'h' + ('0' + now.getMinutes()).slice(-2) + '.pdf';\n    var tip = format === '10x15'\n      ? 'Puis, dans la fenêtre d’impression : papier <strong>100 × 150 mm</strong>, échelle <strong>taille réelle (100 %)</strong>, <strong>aucune marge</strong>.'\n      : 'Puis, dans la fenêtre d’impression : papier <strong>A4</strong>, échelle <strong>taille réelle (100 %)</strong>. Découpez ensuite le long des pointillés.';\n    showModal(modalHead('Bordereaux prêts') +\n      '<p><strong>' + plural(res.done.length, 'bordereau', 'bordereaux') + '</strong> · ' + plural(res.pages, 'page', 'pages') + ' ' +\n      (format === '10x15' ? 'étiquette 10×15' : 'A4 (4 par feuille)') + '</p>' +\n      '<p class=\"small\" style=\"margin:8px 0 12px\">Le PDF s’ouvre dans un nouvel onglet : cliquez sur l’imprimante (ou Ctrl+P). ' + tip +\n      ' Sur téléphone, ouvrez le fichier puis « Imprimer » ou « Partager » vers l’application de l’imprimante.</p>' +\n      failedList(failed) +\n      '<div class=\"modal-actions\">' +\n      '<a class=\"btn\" href=\"' + h(url) + '\" download=\"' + h(name) + '\" data-label-download>Télécharger</a>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"labels-open\">🖨 Ouvrir et imprimer</button></div>');\n  }\n\n  /** Note « imprimé » (une fois par PDF) dès que vous l'ouvrez, l'imprimez ou le téléchargez. */\n  function markLabelsPrinted() {\n    var pdf = S.ship.pdf;\n    if (!pdf || pdf.marked || !pdf.items.length) return;\n    pdf.marked = true;\n    call('api_markLabelsPrinted', pdf.items).then(function (r) {\n      var d = S.ship.data;\n      if (d) d.created.forEach(function (o) { if (r.labels[o.id]) o.label = r.labels[o.id]; });\n      if (S.route === 'expeditions') renderShipping();\n    }).catch(function (e) { pdf.marked = false; toast(errText(e), true); });\n  }\n\n  /**\n   * Ouvre le PDF dans un nouvel onglet, où le lecteur PDF du navigateur l'imprime.\n   * (L'application tourne dans un cadre protégé de Google : un PDF ne s'y affiche pas.)\n   */\n  function openLabelsPdf() {\n    if (!S.ship.pdf) return;\n    markLabelsPrinted();\n    var win = window.open(S.ship.pdf.url, '_blank');\n    if (!win) toast('Le navigateur a bloqué le nouvel onglet : autorisez les fenêtres pop-up, ou utilisez « Télécharger ».', true);\n  }\n\n  /* ---------------- Validation de l'expédition ---------------- */\n\n  function askValidate() {\n    var d = S.ship.data;\n    var ids = pickedCreated();\n    if (!d || !ids.length || S.ship.vbusy) return;\n    var notPrinted = d.created.filter(function (o) { return S.ship.created.sel[o.id] && !o.label.printed; }).length;\n    showModal(modalHead('Valider l’expédition ?') +\n      '<p>' + plural(ids.length, 'colis va être validé', 'colis vont être validés') + ' chez Ecotrack. Ensuite, <strong>plus de modification ni d’annulation possible</strong> : ' +\n      'en cas de problème, il faudra faire une demande de retour.</p>' +\n      (notPrinted ? '<div class=\"lock-box warn\"><p>⚠ ' + plural(notPrinted, 'colis n’a pas', 'colis n’ont pas') + ' de bordereau imprimé dans l’outil.</p></div>' : '') +\n      '<label class=\"check-line\" style=\"margin:14px 0\"><input type=\"checkbox\" class=\"check\" id=\"v-pickup\"' + (d.pickup ? ' checked' : '') + '> ' +\n      'Demander le ramassage <span class=\"small\">(décoché : vous déposez les colis à l’agence)</span></label>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"validate-go\">' + (notPrinted ? 'Valider quand même' : 'Valider ' + plural(ids.length, 'colis', 'colis')) + '</button></div>');\n  }\n\n  function doValidate() {\n    var ids = pickedCreated();\n    var box = $('#v-pickup');\n    var pickup = box ? box.checked : !!(S.ship.data && S.ship.data.pickup);\n    closeModal();\n    if (!ids.length || S.ship.vbusy) return;\n    S.ship.vbusy = true;\n    renderShipping();\n    toast('Validation chez Ecotrack en cours…');\n    call('api_validateParcels', ids, pickup).then(function (res) {\n      S.ship.vbusy = false;\n      S.ship.vresults = res.results;\n      S.ship.created.sel = {};\n      applyCounts(res.counts);\n      var ok = res.results.filter(function (r) { return r.ok; }).length;\n      var ko = res.results.length - ok;\n      toast(plural(ok, 'colis validé', 'colis validés') + (ko ? ', ' + plural(ko, 'refusé', 'refusés') : '') + (ok ? '. Ils passent dans Suivi.' : ''), ok === 0);\n      loadShipping();\n    }).catch(function (e) {\n      S.ship.vbusy = false;\n      toast(errText(e), true);\n      renderShipping();\n    });\n  }\n\n  /** Colis validés sur le site d'Ecotrack : relus à l'ouverture de la page (au plus une fois par minute). */\n  function maybeRefreshCreated(d) {\n    if (!d.configured || !d.created.length || Date.now() - S.ship.refreshedAt < 60000) return;\n    S.ship.refreshedAt = Date.now();\n    call('api_refreshCreated').then(function (r) {\n      if (!r.updated && !r.missing) return;\n      if (r.message) toast(r.message);\n      if (S.route === 'expeditions') loadShipping();\n      refreshCount();\n    }).catch(function () { /* silencieux : la mise à jour automatique repassera */ });\n  }\n\n  /** « 5 h », « 2 j » à partir d'un nombre d'heures. */\n  function hoursText(hours) {\n    var n = Math.max(Number(hours) || 0, 0);\n    if (n < 1) return 'moins d’1 h';\n    return n < 48 ? n + ' h' : Math.floor(n / 24) + ' j';\n  }\n\n  function confirmModal(title, text, okAct, okLabel) {\n    showModal(modalHead(h(title)) + '<p>' + h(text) + '</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"' + okAct + '\">' + h(okLabel) + '</button></div>');\n  }\n\n  function askShip() {\n    var n = Object.keys(S.ship.selected).length;\n    if (!n || S.ship.busy) return;\n    confirmModal('Créer les colis chez Ecotrack ?', plural(n, 'colis va être créé', 'colis vont être créés') +\n      ' chez Ecotrack, avec le total affiché comme montant à encaisser. Ils ne seront pas encore expédiés : vous imprimez ensuite les bordereaux et validez l’expédition (onglet « Créés, à valider »).',\n      'ship-confirm', 'Créer les colis');\n  }\n\n  function doShip() {\n    var ids = Object.keys(S.ship.selected);\n    closeModal();\n    if (!ids.length || S.ship.busy) return;\n    S.ship.busy = true;\n    renderShipping();\n    toast('Envoi à Ecotrack en cours…');\n    call('api_shipEcotrack', ids).then(function (res) {\n      S.ship.busy = false;\n      S.ship.selected = {};\n      S.ship.results = res;\n      S.ship.created.sel = {};\n      res.forEach(function (r) { if (r.ok) S.ship.created.sel[r.id] = true; });\n      var ok = res.filter(function (r) { return r.ok; }).length;\n      toast(plural(ok, 'colis créé', 'colis créés') + (res.length - ok ? ', ' + (res.length - ok) + ' refusé(s)' : '') + (ok ? '. Imprimez les bordereaux, puis validez.' : ''), ok === 0);\n      loadShipping();\n      refreshCount();\n    }).catch(function (e) {\n      S.ship.busy = false;\n      toast(errText(e), true);\n      renderShipping();\n    });\n  }\n\n  function ecoAction(fn, busyText) {\n    toast(busyText);\n    call(fn).then(function (r) {\n      toast(r.message);\n      if (fn === 'api_ecotrackSyncStatuses') loadShipping();\n    }).catch(function (e) { toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Suivi des colis                                                  */\n  /* ================================================================ */\n\n  var LEVELS = {\n    urgent: { label: 'Urgent', bg: '#FBE7E7', fg: '#A12626' },\n    warn: { label: 'À surveiller', bg: '#FFF3DC', fg: '#8A5200' },\n    info: { label: 'Info', bg: '#E6EEFB', fg: '#1E4FA8' }\n  };\n  var GROUPS = [\n    ['all', 'Tous'], ['transit', 'En route'], ['delivery', 'En livraison'],\n    ['suspended', 'Suspendus'], ['returning', 'Retours']\n  ];\n\n  /** Onglet « Terminées » de Suivi : livrées (avec l'état de l'argent) et retours reçus. */\n  function finishedSection(d) {\n    var f = S.track.done;\n    var tests = {\n      all: function () { return true; },\n      delivered: function (x) { return x.status === 'Livrée'; },\n      unpaid: function (x) { return x.unpaid; },\n      returned: function (x) { return x.status === 'Retour'; }\n    };\n    var chips = [['all', 'Toutes'], ['delivered', 'Livrées'], ['unpaid', 'Argent pas encore reçu'], ['returned', 'Retours reçus']];\n    var shown = d.finished.filter(tests[f] || tests.all);\n    var html = '<section class=\"card\"><h2>Commandes terminées</h2><div class=\"chips\" role=\"group\" aria-label=\"Filtrer\" style=\"margin-bottom:12px\">' +\n      chips.map(function (c) {\n        return '<button type=\"button\" class=\"chip\" data-act=\"track-done-filter\" data-done=\"' + c[0] + '\" aria-pressed=\"' + (f === c[0]) + '\">' + c[1] + ' · ' + d.finished.filter(tests[c[0]]).length + '</button>';\n      }).join('') + '</div>';\n    if (!shown.length) return html + '<p class=\"empty\" style=\"padding:18px 0\">Aucune commande dans cette catégorie sur la période.</p></section>';\n    html += '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' +\n      ['Commande', 'Wilaya', 'Résultat', 'Argent / colis', 'Le', 'Total'].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>' +\n      shown.map(function (x) {\n        return '<tr><td data-label=\"Commande\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(x.id) + '\">' + h(x.id) + '</button><div class=\"small\">' + h(x.client) + '</div></td>' +\n          '<td data-label=\"Wilaya\">' + h(wilayaName(x.wilaya)) + '</td>' +\n          '<td data-label=\"Résultat\">' + pill(x.status) + '</td>' +\n          '<td data-label=\"Argent / colis\">' + h(x.label) + (x.unpaid ? ' <span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">à recevoir</span>' : '') +\n            (x.damaged ? ' <span class=\"pill\" style=\"background:#FBE7E7;color:#A12626\">abîmé, retiré du stock</span>' : '') +\n            (x.canDamage && S.boot.user.stock ? ' <button type=\"button\" class=\"btn\" style=\"min-height:32px;padding:0 10px\" data-act=\"return-damaged\" data-id=\"' + h(x.id) + '\">Abîmé ?</button>' : '') +\n            (x.paymentId ? '<div class=\"small\">Versement ' + h(x.paymentId) + '</div>' : '') + '</td>' +\n          '<td data-label=\"Le\">' + h(fmtDate(x.since)) + '</td>' +\n          '<td data-label=\"Total\" class=\"num strong\">' + money(x.total) + '</td></tr>';\n      }).join('') + '</tbody></table></div>';\n    if (d.finishedTotal > d.finished.length) html += '<p class=\"small\" style=\"margin-top:10px\">Les ' + d.finished.length + ' plus récentes sur ' + d.finishedTotal + '.</p>';\n    return html + '</section>';\n  }\n\n  function waLink(phone) {\n    var p = String(phone || '').replace(/\\D/g, '');\n    return /^0[567]\\d{8}$/.test(p) ? 'https://wa.me/213' + p.slice(1) : '';\n  }\n\n  function pageTracking() {\n    view.innerHTML = '<div id=\"track\"><p class=\"loading\">Chargement…</p></div>';\n    loadTracking();\n  }\n\n  function loadTracking() {\n    var t = ++S.token;\n    return call('api_trackingOverview', S.track.days).then(function (d) {\n      if (t !== S.token || S.route !== 'suivi') return;\n      S.track.data = d;\n      setAlertCount(d.alerts.filter(function (a) { return a.level !== 'info'; }).length);\n      renderTracking();\n    }).catch(function (e) {\n      if (t === S.token && S.route === 'suivi') $('#track').innerHTML = errorBox(e);\n    });\n  }\n\n  function renderTracking() {\n    var d = S.track.data;\n    var box = $('#track');\n    if (!d || !box) return;\n    var m = d.money;\n    var toReceive = m.delivered.amount + m.cashed.amount + m.ready.amount;\n    var html = '<div class=\"page-head\"><div><h1>Suivi des colis</h1><p class=\"sub\">' +\n      (d.lastSync ? 'Statuts relus ' + h(ago(d.lastSync)) + ' · automatiquement toutes les 30 minutes' : 'Statuts pas encore relus') + '</p></div>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"track-sync\">Actualiser les statuts</button></div>';\n    html += '<div class=\"stack\">';\n    if (!d.configured) {\n      html += '<div class=\"card\"><h2>Ecotrack n’est pas encore configuré</h2><p class=\"sub\">Enregistrez l’adresse et le jeton dans le classeur (menu DZ Smart Shop › Ecotrack), puis créez vos premiers colis dans la page Expéditions.</p></div>';\n    }\n    if (d.lastError) html += errorBox(d.lastError);\n\n    // Argent\n    var periods = [[7, '7 jours'], [30, '30 jours'], [90, '90 jours']];\n    html += '<section class=\"card\"><div class=\"detail-head\"><div><h2>Où est l’argent</h2><p class=\"muted\">Montants à encaisser, avant déduction des frais d’Ecotrack. À recevoir : <strong>' + money(toReceive) + '</strong></p></div>' +\n      '<div class=\"seg\" role=\"group\" aria-label=\"Période des paiements reçus\">' + periods.map(function (p) {\n        return '<button type=\"button\" data-act=\"track-days\" data-days=\"' + p[0] + '\" aria-pressed=\"' + (d.days === p[0]) + '\">' + p[1] + '</button>';\n      }).join('') + '</div></div>' +\n      '<div class=\"grid-kpi\">' + [\n        ['Chez le livreur', m.enRoute, 'Colis pas encore livrés'],\n        ['Livrés, pas encaissés', m.delivered, 'Le livreur n’a pas encore remis l’argent'],\n        ['Encaissés, pas payés', m.cashed, 'Ecotrack a l’argent, pas encore versé'],\n        ['Prêts à être versés', m.ready, 'Paiement prêt chez Ecotrack'],\n        ['Payés (' + d.days + ' jours)', m.paid, 'Argent reçu']\n      ].map(function (k) {\n        return '<div class=\"kpi\" style=\"padding:4px 0\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + money(k[1].amount) + '</span><span class=\"note\">' + plural(k[1].count, 'colis', 'colis') + ' · ' + h(k[2]) + '</span></div>';\n      }).join('') + '</div></section>';\n\n    // Alertes\n    html += '<section class=\"card\"><h2>À traiter · ' + d.alerts.length + '</h2>';\n    if (!d.alerts.length) {\n      html += '<p class=\"empty\" style=\"padding:18px 0\">Rien à traiter : vos colis avancent normalement.</p>';\n    } else {\n      html += d.alerts.map(function (a) {\n        var lv = LEVELS[a.level] || LEVELS.info;\n        var wa = waLink(a.phone);\n        return '<div class=\"result-row\"><span class=\"pill\" style=\"min-width:96px;text-align:center;background:' + lv.bg + ';color:' + lv.fg + '\">' + lv.label + '</span>' +\n          '<span class=\"grow\"><strong>' + h(a.title) + '</strong> · <button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(a.id) + '\">' + h(a.id) + '</button> · ' + h(a.client) + ' · ' + h(wilayaName(a.wilaya)) +\n          (a.tagLabel ? ' ' + tagPill(a.tag, a.tagLabel) : '') +\n          '<br><span class=\"small\" style=\"color:var(--ink-2)\">' + h(a.detail) + '</span>' +\n          (a.courierNote ? '<br><span class=\"small courier-note\">🛵 Livreur : ' + h(a.courierNote) + '</span>' : '') +\n          (a.calls && !a.proposeReturn ? '<br><span class=\"small strong\">' + plural(a.calls, 'appel sans réponse', 'appels sans réponse') + '</span>' : '') +\n          '<br><span class=\"small mono\">' + h(a.tracking) + ' · ' + h(a.carrierLabel || 'statut pas encore lu') + ' · depuis ' + h(ago(a.since).replace(/^il y a /, '')) + '</span>' +\n          (a.proposeReturn ? '<span class=\"lock-box warn\" style=\"margin-top:8px\"><p>' + plural(a.calls, 'appel', 'appels') + ' sans réponse : demander le retour du colis ?</p>' +\n            '<button type=\"button\" class=\"btn danger\" style=\"min-height:40px\" data-act=\"follow-return\" data-id=\"' + h(a.id) + '\">Demander le retour</button>' +\n            '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"follow-quick\" data-result=\"informed\" data-id=\"' + h(a.id) + '\">Laisser le livreur réessayer</button></span>' : '') +\n          '</span>' +\n          '<span class=\"quick\">' +\n            (/^0\\d{8,9}$/.test(String(a.phone).replace(/\\D/g, '')) ? '<a class=\"btn\" style=\"min-height:40px\" href=\"tel:' + h(a.phone) + '\" target=\"_top\">Appeler</a>' : '') +\n            (wa ? '<a class=\"btn\" style=\"min-height:40px\" href=\"' + h(wa) + '\" target=\"_blank\" rel=\"noopener\">WhatsApp</a>' : '') +\n            '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"track-history\" data-id=\"' + h(a.id) + '\">Chronologie</button>' +\n            (a.callable\n              ? '<button type=\"button\" class=\"btn primary\" style=\"min-height:40px\" data-act=\"follow-open\" data-id=\"' + h(a.id) + '\">Résultat de l’appel</button>'\n              : '<button type=\"button\" class=\"btn\" style=\"min-height:40px\" data-act=\"track-done\" data-id=\"' + h(a.id) + '\">Marquer comme traité</button>') +\n          '</span></div>';\n      }).join('');\n    }\n    html += '</section>';\n\n    // Colis : en cours, ou terminés (livrés, retours reçus)\n    var view = S.track.view;\n    html += '<div class=\"seg\" role=\"group\" aria-label=\"Colis\" style=\"align-self:flex-start\">' +\n      '<button type=\"button\" data-act=\"track-view\" data-view=\"active\" aria-pressed=\"' + (view === 'active') + '\">En cours · ' + d.parcels.length + '</button>' +\n      '<button type=\"button\" data-act=\"track-view\" data-view=\"done\" aria-pressed=\"' + (view === 'done') + '\">Terminées (' + d.days + ' j) · ' + d.finishedTotal + '</button></div>';\n    if (view === 'done') html += finishedSection(d);\n    else html += activeSection(d);\n\n    // Versements\n    html += paymentsSection(d) + '</div>';\n    box.innerHTML = html;\n  }\n\n  /** Colis en cours (en route, en livraison, suspendus, retours en cours). */\n  function activeSection(d) {\n    var html = '';\n    var f = S.track.filter;\n    var shown = d.parcels.filter(function (p) { return f === 'all' || p.group === f; });\n    html += '<section class=\"card\"><h2>Colis en cours · ' + d.parcels.length + '</h2><div class=\"chips\" role=\"group\" aria-label=\"Filtrer les colis\" style=\"margin-bottom:12px\">' +\n      GROUPS.map(function (g) {\n        var n = g[0] === 'all' ? d.parcels.length : d.parcels.filter(function (p) { return p.group === g[0]; }).length;\n        return '<button type=\"button\" class=\"chip\" data-act=\"track-filter\" data-group=\"' + g[0] + '\" aria-pressed=\"' + (f === g[0]) + '\">' + g[1] + ' · ' + n + '</button>';\n      }).join('') + '</div>';\n    if (!shown.length) {\n      html += '<p class=\"empty\" style=\"padding:18px 0\">Aucun colis dans cette catégorie.</p>';\n    } else {\n      html += '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' +\n        ['Commande', 'Wilaya', 'N° de suivi', 'Statut Ecotrack', 'Depuis', 'Total', ''].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>' +\n        shown.map(function (p) {\n          return '<tr><td data-label=\"Commande\" class=\"multi\"><button type=\"button\" class=\"link-btn\" data-act=\"open-order\" data-id=\"' + h(p.id) + '\">' + h(p.id) + '</button><div class=\"small\">' + h(p.client) + '</div></td>' +\n            '<td data-label=\"Wilaya\">' + h(wilayaName(p.wilaya)) + '</td>' +\n            '<td data-label=\"N° de suivi\" class=\"mono\">' + h(p.tracking) + '</td>' +\n            '<td data-label=\"Statut Ecotrack\" class=\"multi\">' + h(p.carrierLabel || '—') + (p.stale ? ' <span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">' + (p.group === 'draft' ? 'à valider' : 'sans mouvement') + '</span>' : '') +\n              (p.courierNote && (p.group === 'suspended' || p.group === 'returning') ? '<div class=\"small courier-note\">' + (p.tagLabel ? tagPill('', p.tagLabel) + ' ' : '') + h(p.courierNote) + '</div>' : '') + '</td>' +\n            '<td data-label=\"Depuis\">' + h(hoursText(p.ageHours)) + '</td>' +\n            '<td data-label=\"Total\" class=\"num strong\">' + money(p.total) + '</td>' +\n            '<td data-label=\"\"><button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"track-history\" data-id=\"' + h(p.id) + '\">Chronologie</button></td></tr>';\n        }).join('') + '</tbody></table></div>';\n    }\n    return html + '</section>';\n  }\n\n  function paymentsSection(d) {\n    var html = '<section class=\"card\"><h2>Versements d’Ecotrack (' + d.days + ' jours)</h2>';\n    if (!d.payments.length) {\n      html += '<p class=\"empty\" style=\"padding:18px 0\">Aucun versement sur la période. Le n° de versement s’affiche dès qu’Ecotrack le fournit.</p>';\n    } else {\n      html += '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' +\n        ['Versement', 'Colis', 'Montant', 'État', 'Dernier mouvement'].map(function (t) { return '<th scope=\"col\">' + t + '</th>'; }).join('') + '</tr></thead><tbody>' +\n        d.payments.map(function (p) {\n          return '<tr><td data-label=\"Versement\" class=\"mono\">n° ' + h(p.id) + '</td><td data-label=\"Colis\">' + p.count + '</td>' +\n            '<td data-label=\"Montant\" class=\"num strong\">' + money(p.amount) + '</td>' +\n            '<td data-label=\"État\"><span class=\"pill\" style=\"background:' + (p.paid ? '#DDF0E4;color:#146C2E' : '#FFF3DC;color:#8A5200') + '\">' + (p.paid ? 'Payé' : 'En cours') + '</span></td>' +\n            '<td data-label=\"Dernier mouvement\" class=\"small\">' + fmtDate(p.last) + '</td></tr>';\n        }).join('') + '</tbody></table></div>';\n    }\n    return html + '</section>';\n  }\n\n  /* Chronologie d'un colis : dans la fiche de la commande si elle est ouverte, sinon dans une fenêtre. */\n  /** Remarques du colis : le livreur à gauche, vous à droite. */\n  function remarksHtml(d) {\n    if (!d.remarks) return '';\n    var html = '<h3 class=\"small strong\" style=\"margin:14px 0 6px\">Échanges avec le livreur</h3>';\n    if (!d.remarksOk) return html + '<p class=\"small\">Remarques non disponibles : ' + h(d.remarksError || 'erreur') + '</p>';\n    if (!d.remarks.length) return html + '<p class=\"small\">Aucune remarque sur ce colis.</p>';\n    return html + '<div class=\"remarks\">' + d.remarks.map(function (r) {\n      return '<div class=\"remark' + (r.mine ? ' mine' : '') + '\"><span class=\"small strong\">' + (r.mine ? 'Vous' : '🛵 ' + h(r.author || 'Livreur')) + '</span>' +\n        (r.tagLabel ? ' ' + tagPill(r.tag, r.tagLabel) : '') +\n        '<div>' + h(r.mine ? r.text.replace(/^Vendeur\\s*:\\s*/, '') : r.text) + '</div>' +\n        '<span class=\"small\">' + (r.date ? fmtDate(r.date) : h(r.dateText || '')) + '</span></div>';\n    }).join('') + '</div>';\n  }\n\n  var TAG_STYLE = {\n    injoignable: '#FFF3DC;color:#8A5200', refus: '#FBE7E7;color:#A12626', reporte: '#E6EEFB;color:#1E4FA8', adresse: '#EFE9FB;color:#5B34A8'\n  };\n  function tagPill(tag, label) {\n    var key = tag || ({ Injoignable: 'injoignable', Refus: 'refus', 'Reporté': 'reporte', Adresse: 'adresse' })[label] || '';\n    return '<span class=\"pill\" style=\"background:' + (TAG_STYLE[key] || '#EEF0F3;color:#3D4350') + '\">' + h(label) + '</span>';\n  }\n\n  /* ---------------- Résultat de l'appel (alertes de suivi) ---------------- */\n\n  function alertById(id) {\n    var d = S.track.data;\n    return d ? d.alerts.filter(function (a) { return a.id === id; })[0] : null;\n  }\n\n  function openFollow(id) {\n    var a = alertById(id);\n    if (!a) return;\n    S.follow = { id: id };\n    showModal(modalHead('Résultat de l’appel · ' + h(id), '<p class=\"small\">' + h(a.client) + ' · ' + h(fmtPhone(a.phone)) + ' · ' + h(wilayaName(a.wilaya)) + '</p>') +\n      (a.courierNote ? '<p class=\"small courier-note\" style=\"margin-bottom:10px\">🛵 Livreur : ' + h(a.courierNote) + '</p>' : '') +\n      '<div class=\"follow-choices\">' +\n      followChoice('informed', '✅', 'Prévenu, il attend le livreur', 'L’alerte se ferme.') +\n      followChoice('postpone', '📅', 'Reporter la livraison', 'Remarque au livreur avec le jour et l’heure ; l’alerte revient ce jour-là si le colis n’est pas livré.') +\n      followChoice('address', '📍', 'Nouvelle adresse ou nouveau téléphone', 'Remarque au livreur, et ligne dans les notes de la commande.') +\n      followChoice('refused', '❌', 'Il refuse le colis', (a.canReturn ? 'Demande de retour chez Ecotrack, et client signalé' : 'Client signalé') + ' « a refusé un colis » (sans liste noire).') +\n      followChoice('no_answer', '📵', 'Pas de réponse', a.calls ? 'Appel ' + (a.calls + 1) + ' sur 3.'\n        : 'Rappel dans 2 h (3 essais)' + (a.canReturn ? ' ; un SMS part au client au premier appel sans réponse.' : '.')) +\n      '</div><div id=\"follow-form\"></div>');\n  }\n\n  function followChoice(result, icon, title, note) {\n    return '<button type=\"button\" class=\"follow-choice\" data-act=\"follow-pick\" data-result=\"' + result + '\"><span class=\"icon\" aria-hidden=\"true\">' + icon + '</span>' +\n      '<span><strong>' + h(title) + '</strong><br><span class=\"small\">' + h(note) + '</span></span></button>';\n  }\n\n  function localInput(d) {\n    var p = function (n) { return ('0' + n).slice(-2); };\n    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());\n  }\n\n  function pickFollow(result) {\n    if (!S.follow) return;\n    S.follow.result = result;\n    $all('.follow-choice').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-result') === result)); });\n    var box = $('#follow-form');\n    if (result === 'informed' || result === 'no_answer') { sendFollow(result, {}); return; }\n    var html = '';\n    if (result === 'postpone') {\n      var t = new Date();\n      t.setDate(t.getDate() + 1);\n      t.setHours(14, 0, 0, 0);\n      html = field('Le client est disponible le', '<input type=\"datetime-local\" id=\"follow-when\" value=\"' + localInput(t) + '\">', 'full') +\n        '<div class=\"quick\" style=\"margin:-4px 0 10px\">' +\n        '<button type=\"button\" class=\"chip\" data-act=\"follow-when\" data-days=\"1\" data-hour=\"9\">Demain 9 h</button>' +\n        '<button type=\"button\" class=\"chip\" data-act=\"follow-when\" data-days=\"1\" data-hour=\"14\">Demain 14 h</button>' +\n        '<button type=\"button\" class=\"chip\" data-act=\"follow-when\" data-days=\"2\" data-hour=\"9\">Après-demain 9 h</button></div>' +\n        field('Précision pour le livreur (facultatif)', '<input id=\"follow-note\" maxlength=\"120\" placeholder=\"Ex. appeler avant de passer\">', 'full');\n    } else if (result === 'address') {\n      html = field('Nouvelle adresse ou nouveau numéro', '<textarea id=\"follow-text\" rows=\"3\" maxlength=\"240\" placeholder=\"Ex. nouveau numéro 0661 22 33 44, ou : cité 200 logements, bâtiment 12\"></textarea>', 'full');\n    } else if (result === 'refused') {\n      var a = alertById(S.follow.id) || {};\n      html = '<p>' + (a.canReturn ? 'Une <strong>demande de retour</strong> part chez Ecotrack (la société de livraison peut l’ignorer). ' : '') +\n        'Le client est <strong>signalé</strong> « a refusé un colis » : ses prochaines commandes l’afficheront. Pas de liste noire.</p>';\n    }\n    box.innerHTML = '<div class=\"follow-form\">' + html + '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"follow-send\">' + (result === 'refused' ? 'Confirmer le refus' : 'Envoyer au livreur') + '</button></div></div>';\n    var first = $('#follow-form input, #follow-form textarea');\n    if (first) first.focus();\n  }\n\n  function submitFollow() {\n    var f = S.follow;\n    if (!f || !f.result) return;\n    var data = {};\n    if (f.result === 'postpone') {\n      var v = $('#follow-when') ? $('#follow-when').value : '';\n      if (!v) { toast('Choisissez le jour et l’heure.', true); return; }\n      data = { when: new Date(v).toISOString(), note: $('#follow-note') ? $('#follow-note').value : '' };\n    } else if (f.result === 'address') {\n      data = { text: $('#follow-text') ? $('#follow-text').value : '' };\n    }\n    sendFollow(f.result, data);\n  }\n\n  function sendFollow(result, data, id) {\n    id = id || (S.follow && S.follow.id);\n    if (!id || S.followBusy) return;\n    S.followBusy = true;\n    $all('#modal-root button').forEach(function (b) { b.disabled = true; });\n    toast(result === 'refused' || result === 'return' ? 'Demande envoyée à Ecotrack…' : (result === 'postpone' || result === 'address') ? 'Envoi au livreur…' : 'Enregistrement…');\n    call('api_followUpResult', id, result, data || {}).then(function (r) {\n      S.followBusy = false;\n      S.follow = null;\n      closeModal();\n      toast(r.message);\n      applyCounts(r.counts);\n      if (S.route === 'suivi') loadTracking();\n    }).catch(function (e) {\n      S.followBusy = false;\n      $all('#modal-root button').forEach(function (b) { b.disabled = false; });\n      toast(errText(e), true);\n    });\n  }\n\n  function historyHtml(d) {\n    var html = '<div style=\"margin-top:12px\"><p class=\"small\">Colis <span class=\"mono\">' + h(d.tracking) + '</span>' + (d.carrierLabel ? ' · ' + h(d.carrierLabel) : '') + '</p>';\n    if (!d.events.length) {\n      html += '<p>Ecotrack n’a renvoyé aucune étape que l’outil sache lire.</p>' +\n        (d.raw ? '<details><summary class=\"small\">Réponse brute d’Ecotrack (à m’envoyer si besoin)</summary><pre class=\"mono\" style=\"white-space:pre-wrap;font-size:12px;overflow:auto\">' + h(d.raw) + '</pre></details>' : '');\n    } else {\n      html += '<ol class=\"timeline\">' + d.events.map(function (e) {\n        return '<li><span class=\"t-date\">' + (e.date ? fmtDate(e.date) : h(e.dateText || '—')) + '</span><span class=\"t-body\"><strong>' + h(e.label) + '</strong>' +\n          (e.note ? '<br><span class=\"small\">' + h(e.note) + '</span>' : '') + '</span></li>';\n      }).join('') + '</ol>';\n    }\n    return html + remarksHtml(d) + '</div>';\n  }\n\n  function openHistory(id) {\n    var inOrder = !!$('#parcel-history') && !!$('#order-form');\n    if (inOrder) {\n      $('#parcel-history').innerHTML = '<p class=\"loading\" style=\"padding:12px 0\">Chargement…</p>';\n    } else {\n      showModal(modalHead('Chronologie · ' + h(id)) + '<div id=\"history-body\"><p class=\"loading\">Chargement…</p></div>' +\n        '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button></div>');\n    }\n    call('api_parcelHistory', id).then(function (d) {\n      var el = inOrder ? $('#parcel-history') : $('#history-body');\n      if (el) el.innerHTML = historyHtml(d);\n    }).catch(function (e) {\n      var el = inOrder ? $('#parcel-history') : $('#history-body');\n      if (el) el.innerHTML = '<div style=\"margin-top:12px\">' + errorBox(e) + '</div>';\n    });\n  }\n\n  /* ================================================================ */\n  /* Bénéfices (administrateur)                                       */\n  /* ================================================================ */\n\n  function pageProfit() {\n    view.innerHTML = '<div id=\"profit\"><p class=\"loading\">Chargement…</p></div>';\n    if (S.profit.tab === 'stock') S.profit.tab = 'resume';\n    loadProfit();\n  }\n\n  function loadProfit() {\n    var t = ++S.token;\n    var p = S.profit;\n    var box = $('#profit-body');\n    if (box) box.innerHTML = '<p class=\"loading\">Chargement…</p>';\n    return call('api_profit', p.period).then(function (d) {\n      if (t !== S.token || S.route !== 'benefices') return;\n      p.data = d;\n      renderProfit();\n    }).catch(function (e) {\n      if (t === S.token && S.route === 'benefices') $('#profit').innerHTML = errorBox(e);\n    });\n  }\n\n  function signed(n) {\n    return '<span class=\"' + (n < 0 ? 'neg' : 'pos') + '\">' + money(n) + '</span>';\n  }\n\n  function renderProfit() {\n    var p = S.profit;\n    var d = p.data;\n    var box = $('#profit');\n    if (!box || !d) return;\n    var periods = [['today', 'Aujourd’hui'], ['7', '7 jours'], ['30', '30 jours'], ['all', 'Tout']];\n    var tabs = [['resume', 'Résumé'], ['produits', 'Produits'], ['campagnes', 'Publicité'], ['depenses', 'Dépenses']];\n    var html = '<div class=\"page-head\"><div><h1>Bénéfices</h1><p class=\"sub\">Commandes comptées à leur date de commande · visible seulement par l’administrateur</p></div>' +\n      '<div class=\"seg\" role=\"group\" aria-label=\"Période\">' + periods.map(function (x) {\n        return '<button type=\"button\" data-act=\"profit-period\" data-period=\"' + x[0] + '\" aria-pressed=\"' + (p.period === x[0]) + '\">' + x[1] + '</button>';\n      }).join('') + '</div></div>' +\n      '<div class=\"tabs\" role=\"group\" aria-label=\"Rubrique\">' + tabs.map(function (x) {\n        return '<button type=\"button\" class=\"chip\" data-act=\"profit-tab\" data-tab=\"' + x[0] + '\" aria-pressed=\"' + (p.tab === x[0]) + '\">' + x[1] + '</button>';\n      }).join('') + '</div><div id=\"profit-body\"></div>';\n    box.innerHTML = html;\n    var body = $('#profit-body');\n    if (p.tab === 'produits') body.innerHTML = profitProducts(d);\n    else if (p.tab === 'campagnes') body.innerHTML = profitCampaigns(d);\n    else if (p.tab === 'depenses') body.innerHTML = profitExpenses(d);\n    else body.innerHTML = profitSummary(d);\n  }\n\n  function profitSummary(d) {\n    var t = d.totals;\n    var kpis = [\n      ['Ventes des produits', money(t.productSales), plural(t.delivered, 'commande livrée', 'commandes livrées') + ' · encaissé ' + money(t.revenue)],\n      ['Livraison', signed(-t.deliveryNet), t.deliveryNet > 0 ? 'Elle vous coûte (Ecotrack − payé par les clients)' : t.deliveryNet < 0 ? 'Vous gagnez dessus (payé par les clients − Ecotrack)' : 'Ni gain ni perte'],\n      ['Bénéfice des commandes', signed(t.ordersProfit), 'Après livraison, achat et retours'],\n      ['Dépenses', money(t.expenses), 'Dont publicité : ' + money(t.adSpend)],\n      ['Bénéfice net', signed(t.net), 'Ce qui vous reste sur la période'],\n      ['Publicité par commande livrée', t.costPerDelivered === null ? '—' : money(t.costPerDelivered), t.deliveryRate === null ? 'Aucune commande terminée' : 'Taux de livraison : ' + Math.round(t.deliveryRate * 100) + ' %']\n    ];\n    var html = '<div class=\"stack\"><section class=\"grid-kpi\" aria-label=\"Chiffres clés\">' + kpis.map(function (k) {\n      return '<div class=\"card kpi\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + k[1] + '</span><span class=\"note\">' + h(k[2]) + '</span></div>';\n    }).join('') + '</section>';\n    var warn = [];\n    if (d.warnings.missingCost) warn.push(plural(d.warnings.missingCost, 'commande livrée sans coût d’achat', 'commandes livrées sans coût d’achat') + ' (' + h(d.warnings.missingCostLabels.join(', ')) + ') : complétez la page Stock.');\n    if (d.warnings.missingFee) warn.push(plural(d.warnings.missingFee, 'commande sans tarif de livraison', 'commandes sans tarif de livraison') + ' dans l’onglet Tarifs : les frais payés par le client sont utilisés.');\n    if (warn.length) html += '<div class=\"stock-warn\" style=\"flex-direction:column;align-items:flex-start\">' + warn.map(function (w) { return '<span>⚠ ' + w + '</span>'; }).join('') + '</div>';\n    html += '<section class=\"card\"><h2>Détail</h2><div class=\"money-lines\">' +\n      '<div><span>Ventes des produits livrés (sans la livraison)</span><span>' + money(t.productSales) + '</span></div>' +\n      '<div><span>Livraison : Ecotrack ' + money(t.deliveryFees) + ' − payé par les clients ' + money(t.clientShipping) + '</span>' + signed(-t.deliveryNet) + '</div>' +\n      '<div><span>Coût d’achat des produits livrés</span>' + signed(-t.productCost) + '</div>' +\n      '<div><span>Frais de retour (' + t.returned + ' × ' + money(d.returnFee) + ')</span>' + signed(-t.returnFees) + '</div>' +\n      (t.packaging ? '<div><span>Emballage</span>' + signed(-t.packaging) + '</div>' : '') +\n      '<div class=\"total\"><span>Bénéfice des commandes</span>' + signed(t.ordersProfit) + '</div>' +\n      d.expensesByCategory.map(function (e) { return '<div><span>' + h(e.category) + '</span>' + signed(-e.amount) + '</div>'; }).join('') +\n      '<div class=\"total\"><span>Bénéfice net</span>' + signed(t.net) + '</div>' +\n      '</div><p class=\"small\" style=\"margin-top:10px\">' + t.inTransit + ' commande(s) encore en route ne sont pas comptées : leur bénéfice arrivera à la livraison.</p></section></div>';\n    return html;\n  }\n\n  function groupRows(list, first) {\n    return list.map(function (g) {\n      return [first(g), g.orders, g.delivered, g.returned, g.deliveryRate === null ? '—' : Math.round(g.deliveryRate * 100) + ' %',\n        money(g.sales), signed(-g.deliveryNet), signed(g.profit)];\n    });\n  }\n\n  function profitProducts(d) {\n    if (!d.products.length) return '<div class=\"card\"><p class=\"empty\">Aucune commande sur la période.</p></div>';\n    return '<section class=\"card\"><h2>Par produit</h2>' +\n      table(['Produit', 'Commandes', 'Livrées', 'Retours', 'Taux de livraison', 'Ventes', 'Livraison', 'Bénéfice'], groupRows(d.products, function (g) { return h(g.name); }), [1, 2, 3, 4, 5, 6, 7]) +\n      '<p class=\"small\" style=\"margin-top:10px\">Livraison : en rouge, ce que la livraison vous coûte (Ecotrack plus cher que ce que paie le client) ; en vert, ce que vous gagnez dessus. ' +\n      'Une commande à plusieurs produits est partagée selon les quantités. Bénéfice avant dépenses (publicité…).</p></section>';\n  }\n\n  function adRows(list) {\n    return list.map(function (g) {\n      return [h(g.name), g.orders, g.delivered, g.deliveryRate === null ? '—' : Math.round(g.deliveryRate * 100) + ' %', signed(g.profit),\n        money(g.spend), signed(g.net), g.costPerDelivered === null ? '—' : money(g.costPerDelivered)];\n    });\n  }\n\n  function profitCampaigns(d) {\n    var head = ['', 'Commandes', 'Livrées', 'Livraison', 'Bénéfice', 'Publicité', 'Net', 'Pub / livrée'];\n    var html = '<div class=\"stack\"><section class=\"card\"><h2>Par plateforme</h2>' +\n      table(['Plateforme'].concat(head.slice(1)), adRows(d.platforms), [1, 2, 3, 4, 5, 6, 7]) + '</section>' +\n      '<section class=\"card\"><h2>Par campagne</h2>' +\n      table(['Campagne'].concat(head.slice(1)), adRows(d.campaigns), [1, 2, 3, 4, 5, 6, 7]) +\n      (d.adUnassigned ? '<p class=\"small\" style=\"margin-top:10px\">' + money(d.adUnassigned) + ' de publicité sans campagne : comptés pour la plateforme, pas pour une campagne.</p>' : '') +\n      '<p class=\"small\" style=\"margin-top:10px\">Pour relier vos commandes à vos publicités : ajoutez « UTM source » et « UTM campaign » à la fin de l’onglet RELEASIT, et dans le lien de vos annonces : ' +\n      '<span class=\"mono\">utm_source=facebook&amp;utm_campaign={{campaign.name}}</span> (Facebook) ou <span class=\"mono\">utm_source=tiktok&amp;utm_campaign=__CAMPAIGN_NAME__</span> (TikTok). ' +\n      'Dans vos dépenses, écrivez le même nom de campagne.</p></section></div>';\n    return html;\n  }\n\n  function profitExpenses(d) {\n    var today = new Date();\n    var iso = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);\n    var html = '<div class=\"stack\"><section class=\"card\"><h2>Ajouter une dépense</h2><div class=\"form-grid\" id=\"expense-form\">' +\n      field('Date', '<input name=\"date\" type=\"date\" value=\"' + iso + '\">') +\n      field('Catégorie', '<select name=\"category\">' + options(d.categories, d.categories[0]) + '</select>') +\n      field('Campagne (facultatif)', input('campaign', '', ' list=\"campaign-list\" placeholder=\"Nom de la campagne\"')) +\n      field('Montant', input('amount', '', ' type=\"number\" min=\"0\" step=\"0.01\" inputmode=\"decimal\"')) +\n      field('Devise', '<select name=\"currency\"><option>USD</option><option>DA</option></select>') +\n      field('Note', input('note', ''), 'full') +\n      '</div><datalist id=\"campaign-list\">' + d.knownCampaigns.map(function (c) { return '<option value=\"' + h(c) + '\">'; }).join('') + '</datalist>' +\n      '<p class=\"small\" style=\"margin:10px 0\">Dollar : ' + money(d.rate) + ' (réglage TAUX_DOLLAR dans Paramètres). Une dépense garde le taux du jour où elle est saisie.</p>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"expense-add\">Ajouter la dépense</button></section>';\n    html += '<section class=\"card\"><h2>Dépenses de la période</h2>' + (d.expenses.length ? table(\n      ['Date', 'Catégorie', 'Campagne', 'Montant', 'En dinars'],\n      d.expenses.map(function (e) {\n        return [h(fmtDay(e.date)), h(e.category), h(e.campaign || '—'),\n          e.currency === 'USD' ? h(e.amount + ' $ × ' + e.rate) : money(e.amount), money(e.amountDA)];\n      }), [3, 4]\n    ) : '<p class=\"empty\">Aucune dépense sur la période.</p>') +\n      '<p class=\"small\" style=\"margin-top:10px\">Pour corriger ou supprimer une dépense : onglet Dépenses du classeur.</p></section></div>';\n    return html;\n  }\n\n  function fmtDay(iso) {\n    if (!iso) return '—';\n    var d = new Date(iso);\n    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();\n  }\n\n  function addExpense(btn) {\n    var data = readForm($('#expense-form'));\n    btn.disabled = true;\n    call('api_addExpense', data).then(function (r) {\n      toast(r.message);\n      btn.disabled = false;\n      loadProfit();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Stock (administrateur et magasinier)                             */\n  /* ================================================================ */\n\n  function pageStock() {\n    view.innerHTML = '<div id=\"stock\"><p class=\"loading\">Chargement…</p></div>';\n    loadStockPage();\n  }\n\n  function loadStockPage() {\n    var t = ++S.token;\n    return call('api_stockPage').then(function (d) {\n      if (t !== S.token || S.route !== 'stock') return;\n      S.stock.data = d;\n      renderStock();\n    }).catch(function (e) {\n      if (t === S.token && S.route === 'stock') $('#stock').innerHTML = errorBox(e);\n    });\n  }\n\n  function modelName(g, m) { return g.product + (m.model ? ' — ' + m.model : ''); }\n\n  /** Tous les modèles, avec leur produit (pour les formulaires). */\n  function allModels(d, activeOnly) {\n    var out = [];\n    d.products.forEach(function (g) {\n      g.models.forEach(function (m) { if (!activeOnly || m.active) out.push({ g: g, m: m }); });\n    });\n    return out;\n  }\n\n  function moveQty(q) {\n    return '<span class=\"' + (q < 0 ? 'move-out' : 'move-in') + '\">' + (q > 0 ? '+' : '') + q + '</span>';\n  }\n\n  function renderStock() {\n    var d = S.stock.data;\n    var box = $('#stock');\n    if (!box || !d) return;\n    var t = d.totals;\n    var html = '<div class=\"page-head\"><div><h1>Stock</h1><p class=\"sub\">Une commande confirmée réserve ses produits ; le stock baisse quand le colis part et remonte quand le retour est reçu.</p></div>' +\n      '<div class=\"quick\"><button type=\"button\" class=\"btn primary\" data-act=\"product-new\">+ Produit</button>' +\n      '<button type=\"button\" class=\"btn\" data-act=\"stock-entry\">Entrée de marchandise</button>' +\n      '<button type=\"button\" class=\"btn\" data-act=\"stock-inventory\">Inventaire</button></div></div><div class=\"stack\">';\n    html += '<section class=\"grid-kpi\" aria-label=\"Chiffres du stock\">' + [\n      ['Valeur du stock', money(t.value), 'Stock × coût d’achat'],\n      ['Pièces en stock', t.units, plural(t.models, 'modèle actif', 'modèles actifs')],\n      ['Stock bas', t.low, 'Disponible au seuil d’alerte ou moins'],\n      ['En rupture', t.rupture, 'Plus rien de disponible']\n    ].map(function (k) {\n      return '<div class=\"card kpi\"><span class=\"label\">' + h(k[0]) + '</span><span class=\"value\">' + h(k[1]) + '</span><span class=\"note\">' + h(k[2]) + '</span></div>';\n    }).join('') + '</section>';\n\n    if (!d.products.length) {\n      html += '<div class=\"card\"><p class=\"empty\">Aucun produit. Cliquez sur « + Produit », ou ajoutez ci-dessous les modèles vus dans vos commandes.</p></div>';\n    }\n    d.products.forEach(function (g) {\n      html += '<section class=\"card\"><h2>' + h(g.product) + '</h2>' +\n        '<p class=\"sub\" style=\"margin:-4px 0 10px\">' + (g.tracked ? 'Stock ' + g.stock + ' · réservé ' + g.reserved + ' · <strong>disponible ' + g.available + '</strong> · valeur ' + money(g.value) : 'Stock non suivi') + '</p>' +\n        '<div class=\"table-wrap\" style=\"border:0\"><table class=\"data cards\"><thead><tr>' +\n        ['Modèle', 'Stock', 'Réservé', 'Disponible', 'Coût d’achat', 'Prix de vente', ''].map(function (x) { return '<th scope=\"col\">' + x + '</th>'; }).join('') +\n        '</tr></thead><tbody>' + g.models.map(function (m) {\n          var tag = !m.active ? '<span class=\"pill\" style=\"background:#EEF0F3;color:#3D4350\">désactivé</span>'\n            : m.rupture ? '<span class=\"pill\" style=\"background:#FBE7E7;color:#A12626\">rupture</span>'\n            : m.low ? '<span class=\"pill\" style=\"background:#FFF3DC;color:#8A5200\">stock bas</span>' : '';\n          return '<tr class=\"model-row' + (m.low && m.active ? ' low' : '') + (!m.active ? ' off' : '') + '\">' +\n            '<td data-label=\"Modèle\">' + h(m.model || '—') + ' ' + tag + (m.aliases ? '<div class=\"small\">Autres noms : ' + h(m.aliases) + '</div>' : '') + '</td>' +\n            '<td data-label=\"Stock\" class=\"num\">' + (m.tracked ? m.stock : '—') + '</td>' +\n            '<td data-label=\"Réservé\" class=\"num\">' + m.reserved + '</td>' +\n            '<td data-label=\"Disponible\" class=\"num strong\">' + (m.tracked ? m.available : '—') + '</td>' +\n            '<td data-label=\"Coût d’achat\" class=\"num\">' + (m.cost === null ? '<span class=\"neg\">à remplir</span>' : money(m.cost)) + '</td>' +\n            '<td data-label=\"Prix de vente\" class=\"num\">' + (m.price === null ? '—' : money(m.price)) + '</td>' +\n            '<td data-label=\"\"><span class=\"quick\">' +\n              '<button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"model-edit\" data-key=\"' + h(m.key) + '\">Modifier</button>' +\n              '<button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"model-history\" data-key=\"' + h(m.key) + '\">Historique</button></span></td></tr>';\n        }).join('') + '</tbody></table></div></section>';\n    });\n    if (d.unknown.length) {\n      html += '<section class=\"card\"><h2>Modèles vus dans les commandes, absents du catalogue</h2>' +\n        table(['Produit', 'Modèle', 'Commandes', ''], d.unknown.map(function (u) {\n          return [h(u.product), h(u.model || '—'), u.orders, '<button type=\"button\" class=\"btn\" style=\"min-height:36px\" data-act=\"catalog-add\" data-label=\"' + h(u.label) + '\">Ajouter</button>'];\n        }), [2]) +\n        '<p style=\"margin-top:12px\"><button type=\"button\" class=\"btn primary\" data-act=\"catalog-add\">Tout ajouter</button></p>' +\n        '<p class=\"small\" style=\"margin-top:8px\">Ensuite, indiquez leur coût d’achat (Modifier) et leur stock (Entrée de marchandise).</p></section>';\n    }\n    html += '<section class=\"card\"><h2>Derniers mouvements</h2>' + (d.moves.length ? movesTable(d.moves.slice(0, 30)) : '<p class=\"empty\">Aucun mouvement pour l’instant.</p>') +\n      '<p class=\"small\" style=\"margin-top:10px\">Historique complet : onglet « Mouvements stock » du classeur.</p></section></div>';\n    box.innerHTML = html;\n  }\n\n  function movesTable(list) {\n    return table(['Date', 'Modèle', 'Mouvement', 'Quantité', 'Stock après', 'Détail'], list.map(function (x) {\n      return [h(fmtDate(x.date)), h(x.product + (x.model ? ' — ' + x.model : '')), h(x.type), moveQty(x.qty), x.after === null ? '—' : x.after,\n        h([x.order ? 'Commande ' + x.order : '', x.cost ? 'coût ' + x.cost + ' DA' : '', x.note, x.by ? 'par ' + x.by : ''].filter(Boolean).join(' · '))];\n    }), [3, 4]);\n  }\n\n  function findModel(key) {\n    var found = null;\n    allModels(S.stock.data).forEach(function (x) { if (x.m.key === key) found = x; });\n    return found;\n  }\n\n  function askNewProduct() {\n    showModal(modalHead('Nouveau produit') +\n      '<div class=\"form-grid\" id=\"product-form\">' +\n        field('Nom du produit', input('product', '', ' placeholder=\"Ex. cover iPhone\"'), 'full') +\n        field('Prix de vente (DA)', input('price', '', ' type=\"number\" min=\"0\" step=\"10\"')) +\n        field('Coût d’achat (DA)', input('cost', '', ' type=\"number\" min=\"0\" step=\"10\"')) +\n        field('Seuil d’alerte', input('threshold', '', ' type=\"number\" min=\"0\" step=\"1\" placeholder=\"Réglage général\"')) +\n        field('Modèles et stock de départ : un par ligne, « modèle = quantité »', '<textarea name=\"models\" rows=\"5\" placeholder=\"iphone 13 = 10&#10;iphone 15 PRO MAX = 4\"></textarea>', 'full') +\n        field('Stock de départ (produit sans modèle)', input('stock', '', ' type=\"number\" min=\"0\" step=\"1\"')) +\n      '</div><p class=\"small\" style=\"margin-top:8px\">Le nom doit être écrit comme dans vos commandes (ex. « cover iPhone - iphone 13 ») pour que le stock suive tout seul. Sinon, ajoutez des « autres noms » avec Modifier.</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"product-save\">Ajouter le produit</button></div>');\n  }\n\n  function saveNewProduct(btn) {\n    var f = readForm($('#product-form'));\n    var models = String(f.models || '').split('\\n').map(function (line) {\n      var m = line.match(/^(.*?)(?:\\s*[=:;]\\s*(\\d+))?\\s*$/);\n      return m && m[1].trim() ? { model: m[1].trim(), stock: m[2] || '' } : null;\n    }).filter(Boolean);\n    btn.disabled = true;\n    call('api_addProduct', { product: f.product, price: f.price, cost: f.cost, threshold: f.threshold, stock: f.stock, models: models }).then(function (r) {\n      closeModal();\n      toast(r.message);\n      loadStockPage();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function askEditModel(key) {\n    var x = findModel(key);\n    if (!x) return;\n    var m = x.m;\n    showModal(modalHead('Modifier ' + h(modelName(x.g, m))) +\n      '<div class=\"form-grid\" id=\"model-form\" data-row=\"' + m.row + '\" data-key=\"' + h(m.key) + '\">' +\n        field('Produit', input('product', x.g.product)) +\n        field('Modèle', input('model', m.model)) +\n        field('Prix de vente (DA)', input('price', m.price === null ? '' : m.price, ' type=\"number\" min=\"0\" step=\"10\"')) +\n        field('Coût d’achat (DA)', input('cost', m.cost === null ? '' : m.cost, ' type=\"number\" min=\"0\" step=\"10\"')) +\n        field('Seuil d’alerte', input('threshold', m.ownThreshold === null ? '' : m.ownThreshold, ' type=\"number\" min=\"0\" step=\"1\" placeholder=\"Réglage général\"')) +\n        field('Autres noms (séparés par « ; »)', input('aliases', m.aliases, ' placeholder=\"Écritures de ce modèle dans les commandes\"'), 'full') +\n        '<label class=\"field full\" style=\"flex-direction:row;align-items:center;gap:10px\"><input type=\"checkbox\" name=\"active\"' + (m.active ? ' checked' : '') + ' style=\"width:auto;min-height:0\"> Actif (décochez s’il n’est plus vendu)</label>' +\n      '</div><p class=\"small\" style=\"margin-top:8px\">Le stock se change avec « Entrée de marchandise » ou « Inventaire ». Si vous renommez, l’ancien nom est gardé dans « autres noms ».</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"model-save\">Enregistrer</button></div>');\n  }\n\n  function saveModel(btn) {\n    var form = $('#model-form');\n    var f = readForm(form);\n    f.row = Number(form.getAttribute('data-row'));\n    f.key = form.getAttribute('data-key');\n    btn.disabled = true;\n    call('api_updateCatalogRow', f).then(function (r) {\n      closeModal();\n      toast(r.message);\n      loadStockPage();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function showHistory(key) {\n    var x = findModel(key);\n    if (!x) return;\n    var list = S.stock.data.moves.filter(function (mv) { return mv.key === key; });\n    showModal(modalHead('Historique · ' + h(modelName(x.g, x.m))) +\n      (list.length ? movesTable(list) : '<p class=\"empty\">Aucun mouvement récent pour ce modèle.</p>') +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Fermer</button></div>');\n  }\n\n  /** Entrée de marchandise ou inventaire : un produit, puis ses modèles. */\n  function askStockForm(kind) {\n    var d = S.stock.data;\n    var products = d.products.filter(function (g) { return g.models.some(function (m) { return m.active; }); });\n    if (!products.length) { toast('Ajoutez d’abord un produit.', true); return; }\n    var entry = kind === 'entry';\n    showModal(modalHead(entry ? 'Entrée de marchandise' : 'Inventaire') +\n      '<div class=\"form-grid\" id=\"stock-form\" data-kind=\"' + kind + '\">' +\n        field('Produit', '<select name=\"product\" data-role=\"stock-product\">' + products.map(function (g, i) {\n          return '<option value=\"' + i + '\">' + h(g.product) + '</option>';\n        }).join('') + '</select>', 'full') +\n        (entry ? field('Coût unitaire (DA, facultatif)', input('cost', '', ' type=\"number\" min=\"0\" step=\"10\"')) + field('Fournisseur (facultatif)', input('supplier', ''))\n          : field('Motif', '<select name=\"reason\">' + options(d.reasons, d.reasons[0]) + '</select>')) +\n        field('Note (facultatif)', input('note', ''), 'full') +\n      '</div><div class=\"lines\" id=\"stock-lines\"></div>' +\n      '<p class=\"small\" style=\"margin-top:8px\">' + (entry ? (d.averageCost ? 'Avec un coût unitaire, le coût d’achat devient la moyenne de l’ancien stock et de cette entrée.' : 'Le coût d’achat ne change pas (réglage COUT_MOYEN = NON).')\n        : 'Tapez la quantité comptée ; laissez vide les modèles non comptés. L’écart est noté avec le motif.') + '</p>' +\n      '<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-act=\"close-modal\">Annuler</button>' +\n      '<button type=\"button\" class=\"btn primary\" data-act=\"stock-save\">' + (entry ? 'Enregistrer l’entrée' : 'Enregistrer l’inventaire') + '</button></div>');\n    S.stock.formProducts = products;\n    renderStockLines();\n  }\n\n  function renderStockLines() {\n    var form = $('#stock-form');\n    if (!form) return;\n    var entry = form.getAttribute('data-kind') === 'entry';\n    var g = S.stock.formProducts[Number($('[data-role=\"stock-product\"]').value) || 0];\n    $('#stock-lines').innerHTML = g.models.filter(function (m) { return m.active; }).map(function (m) {\n      return '<label class=\"line\"><span>' + h(m.model || g.product) + ' <span class=\"small\">· stock ' + (m.tracked ? m.stock : '—') + '</span></span>' +\n        '<input type=\"number\" min=\"0\" step=\"1\" inputmode=\"numeric\" data-line-row=\"' + m.row + '\" data-line-key=\"' + h(m.key) + '\" placeholder=\"' + (entry ? 'Reçu' : (m.tracked ? m.stock : 'Compté')) + '\"></label>';\n    }).join('');\n  }\n\n  function saveStockForm(btn) {\n    var form = $('#stock-form');\n    var f = readForm(form);\n    var entry = form.getAttribute('data-kind') === 'entry';\n    var items = $all('[data-line-row]').map(function (el) {\n      var v = String(el.value).trim();\n      if (!v) return null;\n      return entry ? { row: Number(el.getAttribute('data-line-row')), key: el.getAttribute('data-line-key'), qty: v, cost: f.cost }\n        : { row: Number(el.getAttribute('data-line-row')), key: el.getAttribute('data-line-key'), counted: v };\n    }).filter(Boolean);\n    btn.disabled = true;\n    call(entry ? 'api_stockEntry' : 'api_stockInventory', entry ? { items: items, supplier: f.supplier, note: f.note } : { items: items, reason: f.reason + (f.note ? ' · ' + f.note : '') }).then(function (r) {\n      closeModal();\n      toast(r.message);\n      loadStockPage();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  function addToCatalog(labels, btn) {\n    var list = labels || (S.stock.data ? S.stock.data.unknown.map(function (u) { return u.label; }) : []);\n    if (!list.length) return;\n    btn.disabled = true;\n    call('api_addCatalogItems', list).then(function (r) {\n      toast(r.message);\n      loadStockPage();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /** Menu « Plus » (téléphone) : les pages qui ne tiennent pas dans la barre du bas. */\n  function showMoreMenu() {\n    var u = S.boot.user;\n    showModal(modalHead('Plus') + '<div class=\"more-list\">' +\n      (u.admin ? '<a href=\"#/benefices\">Bénéfices<div class=\"small\" style=\"font-weight:400\">Résumé, produits, publicité, dépenses</div></a>' : '') +\n      (u.stock ? '<a href=\"#/stock\">Stock<div class=\"small\" style=\"font-weight:400\">Produits, entrées, inventaire, historique</div></a>' : '') +\n      '</div>');\n  }\n\n  function markDamaged(btn) {\n    var id = btn.getAttribute('data-id');\n    btn.disabled = true;\n    call('api_markReturnDamaged', id).then(function (r) {\n      toast(r.message);\n      loadTracking();\n    }).catch(function (e) { btn.disabled = false; toast(errText(e), true); });\n  }\n\n  /* ================================================================ */\n  /* Événements                                                       */\n  /* ================================================================ */\n\n  var ACTIONS = {\n    'goto': function (el) {\n      if (el.getAttribute('data-tab')) S.profit.tab = el.getAttribute('data-tab');\n      navigate(el.getAttribute('data-route'), el.getAttribute('data-status'));\n    },\n    'profit-period': function (el) { S.profit.period = el.getAttribute('data-period'); loadProfit(); },\n    'profit-tab': function (el) { S.profit.tab = el.getAttribute('data-tab'); renderProfit(); },\n    'expense-add': addExpense,\n    'catalog-add': function (el) { addToCatalog(el.getAttribute('data-label') ? [el.getAttribute('data-label')] : null, el); },\n    'product-new': askNewProduct,\n    'product-save': saveNewProduct,\n    'model-edit': function (el) { askEditModel(el.getAttribute('data-key')); },\n    'model-save': saveModel,\n    'model-history': function (el) { showHistory(el.getAttribute('data-key')); },\n    'stock-entry': function () { askStockForm('entry'); },\n    'stock-inventory': function () { askStockForm('inventory'); },\n    'stock-save': saveStockForm,\n    'more-menu': showMoreMenu,\n    'return-damaged': markDamaged,\n    'sms-send': function (el) {\n      el.disabled = true;\n      call('api_smsSendNow').then(function (r) { toast(r.message); loadShopStatus(); }).catch(function (e) { el.disabled = false; toast(errText(e), true); });\n    },\n    'period': function (el) { S.period = el.getAttribute('data-period'); pageDashboard(); },\n    'chip': function (el) { S.filter.status = el.getAttribute('data-status'); S.filter.limit = 100; loadOrders(); },\n    'trash-restore': function (el) {\n      el.disabled = true;\n      call('api_restoreOrder', el.getAttribute('data-id')).then(function (r) {\n        toast(r.message);\n        loadOrders();\n        refreshCount();\n      }).catch(function (e) { el.disabled = false; toast(errText(e), true); });\n    },\n    'more': function () { S.filter.limit += 100; loadOrders(); },\n    'open-order': function (el) { openOrder(el.getAttribute('data-id')); },\n    'new-order': openNewOrder,\n    'releasit-transfer': function () {\n      toast('Lecture de l’onglet RELEASIT…');\n      call('api_releasitTransfer').then(function (r) {\n        toast(r.message);\n        loadShopStatus();\n        if (r.summary && r.summary.added) { loadOrders(); refreshCount(); }\n      }).catch(function (e) { toast(errText(e), true); loadShopStatus(); });\n    },\n    'shop-import': function () {\n      toast('Importation depuis Shopify…');\n      call('api_shopifyImport').then(function (r) {\n        toast(r.message);\n        loadShopStatus();\n        loadOrders();\n        refreshCount();\n      }).catch(function (e) { toast(errText(e), true); loadShopStatus(); });\n    },\n    'close-modal': closeModal,\n    'save-order': saveOrder,\n    'parcel-cancel-ask': function (el) { askCancelParcel(el.getAttribute('data-id'), el.getAttribute('data-tracking'), el.getAttribute('data-from') === 'ship'); },\n    'parcel-cancel': cancelParcel,\n    'manual-ship-ask': function (el) { askManualShip(el.getAttribute('data-id')); },\n    'manual-ship': manualShip,\n    'track-view': function (el) { S.track.view = el.getAttribute('data-view'); renderTracking(); },\n    'track-done-filter': function (el) { S.track.done = el.getAttribute('data-done'); renderTracking(); },\n    'order-delete-ask': function (el) { askDeleteOrder(el.getAttribute('data-id')); },\n    'order-delete': deleteOrder,\n    'order-reopen': reopenOrder,\n    'order-unlock': function (el) { S.unlockId = el.getAttribute('data-id'); if (S.order) renderOrderModal(S.order); },\n    'create-order': createOrder,\n    'toggle-blacklist': toggleBlacklist,\n    'refresh-queue': function () { loadQueue(false, true); },\n    'q-open': function (el) { if (!S.busy) openInDetail(el.getAttribute('data-id')); },\n    'toggle-queue': function () { $('#queue').classList.toggle('open'); },\n    'confirm': function () { submit('confirm'); },\n    'no_answer': function () { submit('no_answer'); },\n    'show-callback': function () { showPanel('callback'); },\n    'show-cancel': function () { showPanel('cancel'); },\n    'cb-quick': function (el) {\n      var d = new Date();\n      if (el.hasAttribute('data-min')) d = new Date(Date.now() + Number(el.getAttribute('data-min')) * 60000);\n      else { d.setDate(d.getDate() + 1); d.setHours(Number(el.getAttribute('data-tomorrow')), 0, 0, 0); }\n      submit('callback', { callback: d.toISOString() });\n    },\n    'callback': function () {\n      var v = $('#cb-when').value;\n      if (!v) { toast('Choisissez une date et une heure.', true); return; }\n      submit('callback', { callback: new Date(v).toISOString() });\n    },\n    'cancel': function () { submit('cancel', { reason: $('#cancel-reason').value }); },\n    'ship-reload': function () { loadShipping(); },\n    'ship-tab': function (el) { S.ship.tab = el.getAttribute('data-tab'); renderShipping(); },\n    'ship-dismiss': function () { S.ship.results = null; renderShipping(); },\n    'ship-vdismiss': function () { S.ship.vresults = null; renderShipping(); },\n    'created-filter': function (el) { S.ship.created.filter = el.getAttribute('data-filter'); renderShipping(); },\n    'label-format': function (el) { setLabelFormat(el.getAttribute('data-format')); renderShipping(); },\n    'labels-print': function () { printLabels(pickedCreated()); },\n    'labels-from-results': function () {\n      var ids = (S.ship.results || []).filter(function (r) { return r.ok; }).map(function (r) { return r.id; });\n      S.ship.tab = 'created';\n      renderShipping();\n      printLabels(ids);\n    },\n    'label-one': function (el) { printLabels([el.getAttribute('data-id')]); },\n    'labels-open': openLabelsPdf,\n    'validate-ask': askValidate,\n    'validate-go': doValidate,\n    'ship-ask': askShip,\n    'ship-confirm': doShip,\n    'eco-test': function () { ecoAction('api_ecotrackTest', 'Test de la connexion…'); },\n    'eco-status': function () { ecoAction('api_ecotrackSyncStatuses', 'Lecture des statuts chez Ecotrack…'); },\n    'eco-fees-ask': function () {\n      confirmModal('Récupérer les tarifs Ecotrack ?',\n        'Les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de l’onglet Tarifs seront remplacées par les prix d’Ecotrack. Les prix Yalidine ne changent pas.',\n        'eco-fees', 'Récupérer');\n    },\n    'eco-fees': function () { closeModal(); ecoAction('api_ecotrackSyncFees', 'Récupération des tarifs…'); },\n    'track-sync': function () {\n      toast('Lecture des statuts chez Ecotrack…');\n      call('api_ecotrackSyncStatuses').then(function (r) { toast(r.message); loadTracking(); refreshCount(); })\n        .catch(function (e) { toast(errText(e), true); });\n    },\n    'track-days': function (el) { S.track.days = Number(el.getAttribute('data-days')); loadTracking(); },\n    'track-filter': function (el) { S.track.filter = el.getAttribute('data-group'); renderTracking(); },\n    'track-history': function (el) { openHistory(el.getAttribute('data-id')); },\n    'follow-open': function (el) { openFollow(el.getAttribute('data-id')); },\n    'follow-pick': function (el) { pickFollow(el.getAttribute('data-result')); },\n    'follow-send': submitFollow,\n    'follow-when': function (el) {\n      var d = new Date();\n      d.setDate(d.getDate() + Number(el.getAttribute('data-days')));\n      d.setHours(Number(el.getAttribute('data-hour')), 0, 0, 0);\n      if ($('#follow-when')) $('#follow-when').value = localInput(d);\n    },\n    'follow-quick': function (el) { sendFollow(el.getAttribute('data-result'), {}, el.getAttribute('data-id')); },\n    'follow-return': function (el) {\n      var id = el.getAttribute('data-id');\n      S.follow = { id: id, result: 'return' };\n      confirmModal('Demander le retour ?', 'Une demande de retour part chez Ecotrack pour le colis ' + id + '. La société de livraison peut l’ignorer. Le client n’est pas signalé (il était injoignable).',\n        'follow-return-go', 'Demander le retour');\n    },\n    'follow-return-go': function () { sendFollow('return', {}); },\n    'track-done': function (el) {\n      el.disabled = true;\n      call('api_markFollowUp', el.getAttribute('data-id')).then(function () {\n        toast('Alerte marquée comme traitée');\n        loadTracking();\n        refreshCount();\n      }).catch(function (e) { el.disabled = false; toast(errText(e), true); });\n    }\n  };\n\n  document.addEventListener('click', function (e) {\n    if (e.target.classList && e.target.classList.contains('modal-backdrop')) { closeModal(); return; }\n    if (e.target.closest && e.target.closest('[data-label-download]')) { markLabelsPrinted(); return; }\n    var el = e.target.closest('[data-act]');\n    if (!el || el.disabled) return;\n    var fn = ACTIONS[el.getAttribute('data-act')];\n    if (!fn) return;\n    e.preventDefault();\n    e.stopPropagation();\n    fn(el, e);\n  });\n\n  var searchTimer = null;\n  document.addEventListener('input', function (e) {\n    if (e.target.id === 'f-q') {\n      clearTimeout(searchTimer);\n      searchTimer = setTimeout(function () { S.filter.q = e.target.value; S.filter.limit = 100; loadOrders(); }, 350);\n    } else if (e.target.closest('#d-form')) {\n      updateSummary();\n    }\n  });\n  document.addEventListener('change', function (e) {\n    if (e.target.hasAttribute('data-ship-check')) {\n      var sid = e.target.getAttribute('data-ship-check');\n      if (e.target.checked) S.ship.selected[sid] = true; else delete S.ship.selected[sid];\n      renderShipping();\n      return;\n    }\n    if (e.target.hasAttribute('data-created-check')) {\n      var cid = e.target.getAttribute('data-created-check');\n      if (e.target.checked) S.ship.created.sel[cid] = true; else delete S.ship.created.sel[cid];\n      renderShipping();\n      return;\n    }\n    if (e.target.hasAttribute('data-created-all')) {\n      var d0 = S.ship.data;\n      var shown = !d0 ? [] : S.ship.created.filter === 'unprinted' ? d0.created.filter(function (o) { return !o.label.printed; }) : d0.created;\n      shown.forEach(function (o) { if (e.target.checked) S.ship.created.sel[o.id] = true; else delete S.ship.created.sel[o.id]; });\n      renderShipping();\n      return;\n    }\n    if (e.target.hasAttribute('data-ship-all')) {\n      S.ship.selected = {};\n      if (e.target.checked && S.ship.data) {\n        S.ship.data.toShip.forEach(function (o) { if (!o.problems.length) S.ship.selected[o.id] = true; });\n      }\n      renderShipping();\n      return;\n    }\n    if (e.target.id === 'f-wilaya') { S.filter.wilaya = e.target.value; S.filter.limit = 100; loadOrders(); }\n    else if (e.target.id === 'f-period') { S.filter.period = e.target.value; S.filter.limit = 100; loadOrders(); }\n    else if (e.target.getAttribute('data-role') === 'status') toggleCancelField();\n    else if (e.target.getAttribute('data-role') === 'stock-product') renderStockLines();\n    else if (e.target.closest('#order-form') && !$('#order-form').getAttribute('data-id') && (e.target.name === 'product' || e.target.name === 'qty')) fillNewOrderPrice();\n    else if (e.target.closest('#d-form')) updateSummary();\n  });\n  document.addEventListener('keydown', function (e) {\n    if (e.key === 'Escape' && modalOpen()) closeModal();\n  });\n\n  function tick() {\n    if (document.visibilityState !== 'visible' || S.busy || modalOpen()) return;\n    if (S.route === 'confirmation') { if (!Object.keys(S.pending).length) loadQueue(false, true); }\n    else if (S.route === 'suivi') loadTracking();\n    else refreshCount();\n  }\n\n  /* ================================================================ */\n  /* Démarrage                                                        */\n  /* ================================================================ */\n\n  var firstSpec = preloadSpec(currentRoute());\n  call('api_bootstrap', firstSpec).then(function (b) {\n    S.boot = b;\n    if (b.preload && firstSpec && b.preload.key === firstSpec.key) S.preloaded[firstSpec.key] = b.preload.data;\n    applyCounts(b.counts);\n    $all('[data-shop]').forEach(function (el) { el.textContent = b.shop; });\n    $all('[data-user-name]').forEach(function (el) { el.textContent = b.user.name; });\n    $all('[data-user-mail]').forEach(function (el) { el.textContent = b.user.email; });\n    $all('[data-admin]').forEach(function (el) { el.hidden = !b.user.admin; });\n    $all('[data-stockrole]').forEach(function (el) { el.hidden = !b.user.stock; });\n    $all('[data-more]').forEach(function (el) { el.hidden = !(b.user.admin || b.user.stock); });\n    window.addEventListener('hashchange', go);\n    go();\n    if (!b.counts) refreshCount();\n    setInterval(tick, 60000);\n  }).catch(function (e) {\n    view.innerHTML = errorBox(e) +\n      '<p class=\"sub\" style=\"margin-top:12px\">Vérifiez que le classeur est partagé avec votre adresse Google (en Éditeur), puis rechargez la page.</p>';\n  });\n})();\n</script>\n"
};
