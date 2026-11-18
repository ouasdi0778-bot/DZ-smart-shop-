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
