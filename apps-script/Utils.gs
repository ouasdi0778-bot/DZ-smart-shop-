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
