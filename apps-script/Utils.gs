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
/**
 * Textes déjà normalisés (mêmes produits, wilayas, sources… des milliers de fois dans les statistiques) :
 * gardés en mémoire pendant l'exécution, pour aller plus vite.
 */
var NORM_MEMO_ = null;
/** La mémoire (créée au premier usage : un autre fichier peut normaliser un texte avant celui-ci). */
function normMemo_() {
  if (!NORM_MEMO_ || NORM_MEMO_.n > 20000) NORM_MEMO_ = { text: Object.create(null), loose: Object.create(null), n: 0 };
  return NORM_MEMO_;
}
function memoNorm_(kind, key, value) {
  var m = normMemo_();
  m.n++;
  m[kind][key] = value;
  return value;
}

function normalizeText_(value) {
  var key = String(value == null ? '' : value);
  var hit = normMemo_().text[key];
  if (hit !== undefined) return hit;
  return memoNorm_('text', key, key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
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
  // v1.20 : partage des commandes entre les confirmatrices.
  s.PARTAGE = !/^(non|no|false|faux|0)$/i.test(String(s.PARTAGE == null ? 'OUI' : s.PARTAGE).trim());
  s.PARTAGE_ABSENCE_HEURES = Math.min(24, Math.max(0.5, toNumber_(s.PARTAGE_ABSENCE_HEURES) || 2));
  s.PARTAGE_AVANCE = Math.max(0, Math.round(toNumber_(s.PARTAGE_AVANCE)));
  s.MAX_TENTATIVES = s.APPELS_PAR_JOUR * s.JOURS_D_APPELS; // total des appels possibles
  s.OBJECTIF_JOUR = Math.max(0, Math.round(toNumber_(s.OBJECTIF_JOUR)) || 0);
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
  var row = null;
  var rows = email ? readTeam_() : [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === email.toLowerCase()) {
      row = rows[i];
      name = rows[i][1];
      role = rows[i][2];
      break;
    }
  }
  if (!name) name = email ? email.split('@')[0] : 'Utilisateur';
  // v1.20 : part du partage, pages Expédier et Suivi ouvertes (confirmatrices).
  var person = row ? teamPerson_(row) : null;
  return { email: email, key: email.toLowerCase(), name: name, role: role, inTeam: !!row,
    part: person ? person.part : 1, ship: person ? person.ship : false, track: person ? person.track : false };
}

/* ------------------------------------------------------------------ */
/* Journal                                                            */
/* ------------------------------------------------------------------ */

/** Lignes du Journal en attente : écrites en une seule fois (voir withLogBatch_). */
var LOG_BATCH_ = null;

/**
 * Lignes de l'onglet Équipe : [clé, nom, rôle, téléphone, part, Expédier, Suivi] (gardées en mémoire).
 * Part, Expédier et Suivi (v1.20) : partage des commandes et pages ouvertes aux confirmatrices. La clé est l'adresse
 * Gmail en minuscules, ou « tel:0661223344 » pour une personne sans Gmail (connexion par mot de passe,
 * version Cloudflare). Téléphone : l'identifiant de connexion, au format 0661223344.
 */
function readTeam_() {
  return cached_('cfg:team', function () {
    var sh = ss_().getSheetByName(SHEET.TEAM);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().map(function (r) {
      var phone = teamPhone_(r[3]);
      return [teamKey_(r[0], phone), String(r[1]).trim(), String(r[2]).trim(), phone, r[4] === '' || r[4] == null ? '' : r[4], String(r[5] == null ? '' : r[5]).trim(), String(r[6] == null ? '' : r[6]).trim()];
    }).filter(function (r) { return r[0]; });
  });
}

/** Téléphone d'une personne de l'équipe (identifiant de connexion) : 0661223344, ou '' s'il n'est pas valable. */
function teamPhone_(value) {
  var p = normalizePhone(value);
  return p.valid ? p.phone : '';
}

/** Clé d'une personne : son adresse Gmail, sinon « tel: » + son téléphone. */
function teamKey_(email, phone) {
  var e = String(email == null ? '' : email).trim().toLowerCase();
  return e || (phone ? 'tel:' + phone : '');
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
  try { cloudConfigChanged_(); } catch (e) { /* sans importance */ }
}
