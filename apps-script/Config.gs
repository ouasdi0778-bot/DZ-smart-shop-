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
  EXPENSES: 'Dépenses'
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
  { key: 'adSource', title: 'Source pub', kind: 'auto', width: 100, aliases: ['UTM source', 'Plateforme pub'] },
  { key: 'shopifyId', title: 'ID Shopify', kind: 'auto', width: 130, aliases: ['Shopify ID'] },
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
  ['MAX_TENTATIVES', 3, 'Appels sans réponse avant de passer la commande en « Injoignable »'],
  ['DELAI_RAPPEL_MINUTES', 120, "Délai avant de rappeler un client qui n'a pas répondu"],
  ['DOUBLON_HEURES', 48, 'Deux commandes du même numéro dans ce délai = alerte « Doublon »'],
  ['SOCIETE_PAR_DEFAUT', 'Yalidine', "Société utilisée pour calculer les frais quand aucune n'est choisie"],
  ['MOTIFS_ANNULATION', "Faux numéro; Client a changé d'avis; Trop cher; Doublon; Commande test; Délai trop long; Autre", "Motifs proposés à l'annulation, séparés par des points-virgules"],
  ['SUIVI_ALERTE_HEURES', 26, "Un colis sans mouvement depuis ce nombre d'heures (ou créé chez Ecotrack mais pas encore validé) est signalé dans la page Suivi"],
  ['SHOPIFY_TAG', 'releasit_cod_form', "Seules les commandes Shopify portant cette étiquette sont importées (celle de Releasit COD). Laissez vide pour tout importer"],
  ['SHOPIFY_JOURS_INITIAL', 3, "Première importation : commandes des N derniers jours seulement (les plus anciennes sont ignorées)"],
  ['SHOPIFY_API_VERSION', '2026-04', "Version de l'API Shopify utilisée. À changer seulement si Shopify signale que cette version n'est plus prise en charge"],
  ['FRAIS_RETOUR', 50, 'Frais payés à la société de livraison pour un colis retourné (DA)'],
  ['COUT_EMBALLAGE', 0, 'Coût d’emballage par commande expédiée (DA). 0 = pas compté'],
  ['TAUX_DOLLAR', 250, 'Prix d’un dollar en dinars, pour les dépenses en USD (publicité). Mettez-le à jour quand il change : les dépenses déjà saisies gardent leur taux'],
  ['CATEGORIES_DEPENSES', 'Publicité Facebook; Publicité TikTok; Emballage; Salaires; Loyer; Autre', 'Catégories proposées dans l’onglet Dépenses, séparées par des points-virgules'],
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
