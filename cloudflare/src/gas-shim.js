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
  /** Octets (signés comme Apps Script, ou non) → base64. */
  base64Encode: function (bytes) {
    if (typeof bytes === 'string') bytes = new TextEncoder().encode(bytes);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 8192) {
      var part = bytes.slice ? bytes.slice(i, i + 8192) : Array.prototype.slice.call(bytes, i, i + 8192);
      bin += String.fromCharCode.apply(null, Array.prototype.map.call(part, function (b) { return b & 255; }));
    }
    return btoa(bin);
  },
  base64EncodeWebSafe: function (bytes) { return Utilities.base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_'); },
  base64Decode: function (text) { var bin = atob(String(text)); var out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; },
  sleep: function () {},
  DigestAlgorithm: { SHA_256: 'SHA-256', MD5: 'MD5' },
  Charset: { UTF_8: 'UTF-8' }
};

var Session = {
  getActiveUser: function () { return { getEmail: function () { return REQ && REQ.user ? REQ.user.email : ''; } }; },
  getEffectiveUser: function () { return { getEmail: function () { return REQ && REQ.user ? REQ.user.email : ''; } }; },
  getScriptTimeZone: function () { return 'Africa/Algiers'; }
};

/**
 * Mémoire (CacheService) : gardée dans D1 (table kv, clés « cache: ») avec sa durée de vie, pour que
 * par exemple la liste des wilayas d'Ecotrack ne soit pas relue à chaque action.
 */
var CacheService = {
  getScriptCache: function () {
    var c = REQ ? REQ.cache : {};
    var w = REQ && REQ.cacheWrites ? REQ.cacheWrites : {};
    var has = function (k) { return Object.prototype.hasOwnProperty.call(c, k); };
    return {
      get: function (k) { return has(k) ? c[k] : null; },
      put: function (k, v, ttl) { c[k] = String(v); w[k] = { v: String(v), exp: Date.now() + (Number(ttl) || 600) * 1000 }; },
      remove: function (k) { delete c[k]; w[k] = null; },
      removeAll: function (keys) { (keys || []).forEach(function (k) { delete c[k]; w[k] = null; }); },
      getAll: function (keys) { var o = {}; (keys || []).forEach(function (k) { if (has(k)) o[k] = c[k]; }); return o; },
      putAll: function (v, ttl) { var self = this; Object.keys(v || {}).forEach(function (k) { self.put(k, v[k], ttl); }); }
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

/*
 * Étape 3 : les onglets de réglages, de produits et de dépenses sont gardés dans D1 (table tabs, par
 * paquets de TAB_PART_ lignes) et lus par le code de l'outil comme des onglets du classeur.
 * Un onglet pas encore chargé arrête l'action (REQ.needTabs) : server.js le lit dans D1, puis rejoue
 * l'action depuis le début (comme pour les appels extérieurs). Les lignes modifiées sont notées par
 * paquet (dirty) et enregistrées à la fin de la requête, puis recopiées dans le classeur Google.
 */
var CF_TABS_ = ['Clients', 'Produits', 'Tarifs', 'Équipe', 'Paramètres', 'Dépenses'];
var TAB_PART_ = 250;

function isCfTab_(name) { return CF_TABS_.indexOf(String(name)) >= 0; }

/** Une case enregistrée : les dates gardent leur type (« $d »). */
function cfCellOut_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : { $d: v.toISOString() };
  return v === undefined || v === null ? '' : v;
}
function cfCellIn_(v) { return v && typeof v === 'object' && v.$d ? new Date(v.$d) : v; }

function tabMiss_(name) {
  if (REQ && !REQ.needTabs) REQ.needTabs = [name];
  var e = new Error('Onglet « ' + name + ' » en cours de lecture.');
  e.dzTabMiss = true;
  return e;
}

/** État d'un onglet pendant la requête (copie faite à la première écriture). */
function tabState_(name) {
  if (CF_TABS_.indexOf(name) < 0) throw new Error('Onglet « ' + name + ' » : pas dans la version Cloudflare.');
  if (!REQ || !REQ.tabStore) throw new Error('Onglets indisponibles ici.');
  var t = REQ.tabs[name];
  if (t) return t;
  var stored = REQ.tabStore[name];
  if (!stored) throw tabMiss_(name);
  t = REQ.tabs[name] = { name: name, exists: stored.exists, rows: stored.rows, own: false, dirty: {}, cut: -1, maxRows: stored.rows.length + 1000, lastCol: -1 };
  return t;
}
function tabMut_(t) {
  if (!t.own) { t.rows = t.rows.map(function (r) { return r.slice(); }); t.own = true; }
  return t.rows;
}
function tabTouch_(t, rowIndex) { t.dirty[Math.floor(rowIndex / TAB_PART_)] = true; }
function tabLastRow_(t) {
  for (var i = t.rows.length - 1; i >= 0; i--) {
    var r = t.rows[i];
    for (var j = 0; j < r.length; j++) if (r[j] !== '' && r[j] !== null && r[j] !== undefined) return i + 1;
  }
  return 0;
}
function tabLastCol_(t) {
  if (t.lastCol >= 0) return t.lastCol;
  var m = 0;
  t.rows.forEach(function (r) { for (var j = r.length - 1; j >= m; j--) if (r[j] !== '' && r[j] !== null && r[j] !== undefined) { m = j + 1; break; } });
  t.lastCol = m;
  return m;
}

function VRange_(sheet, row, col, nr, nc) {
  this.sheet = sheet; this.r = row; this.c = col; this.nr = nr || 1; this.nc = nc || 1;
}
VRange_.prototype.getValues = function () {
  var rows = this.sheet.t.rows;
  var out = [];
  for (var i = 0; i < this.nr; i++) {
    var src = rows[this.r - 1 + i] || [];
    var line = [];
    for (var j = 0; j < this.nc; j++) { var v = src[this.c - 1 + j]; line.push(v === undefined || v === null ? '' : v); }
    out.push(line);
  }
  return out;
};
VRange_.prototype.getDisplayValues = function () { return this.getValues().map(function (r) { return r.map(function (v) { return v instanceof Date ? v.toISOString() : String(v); }); }); };
VRange_.prototype.getValue = function () { return this.getValues()[0][0]; };
VRange_.prototype.setValues = function (values) {
  var t = this.sheet.t;
  var rows = tabMut_(t);
  for (var i = 0; i < values.length; i++) {
    var ri = this.r - 1 + i;
    while (rows.length <= ri) rows.push([]);
    var line = rows[ri];
    for (var j = 0; j < values[i].length; j++) {
      var ci = this.c - 1 + j;
      while (line.length < ci) line.push('');
      var v = values[i][j];
      line[ci] = v === undefined || v === null ? '' : v;
      if (t.lastCol >= 0 && ci + 1 > t.lastCol && line[ci] !== '') t.lastCol = ci + 1;
    }
    tabTouch_(t, ri);
  }
  if (t.lastCol >= 0) t.lastCol = -1; // recalculé à la demande
  return this;
};
VRange_.prototype.setValue = function (v) { return this.setValues([[v]]); };
VRange_.prototype.clearContent = function () {
  var blank = [];
  for (var i = 0; i < this.nr; i++) { var l = []; for (var j = 0; j < this.nc; j++) l.push(''); blank.push(l); }
  return this.setValues(blank);
};
VRange_.prototype.getRow = function () { return this.r; };
VRange_.prototype.getColumn = function () { return this.c; };
VRange_.prototype.getNumRows = function () { return this.nr; };
VRange_.prototype.getNumColumns = function () { return this.nc; };
VRange_.prototype.getSheet = function () { return this.sheet; };
['setNumberFormat', 'setNumberFormats', 'setFontWeight', 'setFontColor', 'setBackground', 'setBackgrounds', 'setDataValidation', 'setDataValidations',
  'clearDataValidations', 'setWrap', 'setHorizontalAlignment', 'setVerticalAlignment', 'setNote', 'setFontSize', 'clearFormat', 'setBorder'].forEach(function (m) {
  VRange_.prototype[m] = function () { return this; };
});

function VSheet_(name) { this.name = name; this.t = tabState_(name); }
VSheet_.prototype.getName = function () { return this.name; };
VSheet_.prototype.getLastRow = function () { return tabLastRow_(this.t); };
VSheet_.prototype.getLastColumn = function () { return tabLastCol_(this.t); };
VSheet_.prototype.getMaxRows = function () { return Math.max(this.t.maxRows, this.t.rows.length); };
VSheet_.prototype.getMaxColumns = function () { return Math.max(tabLastCol_(this.t), 26); };
VSheet_.prototype.getRange = function (row, col, nr, nc) {
  if (typeof row !== 'number' || row < 1 || col < 1) throw new Error('Plage invalide dans l’onglet « ' + this.name + ' ».');
  return new VRange_(this, row, col, nr, nc);
};
VSheet_.prototype.getDataRange = function () { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); };
VSheet_.prototype.appendRow = function (values) {
  var r = this.getLastRow() + 1;
  this.getRange(r, 1, 1, values.length).setValues([values]);
  return this;
};
VSheet_.prototype.deleteRows = function (row, n) {
  var t = this.t;
  var rows = tabMut_(t);
  if (row - 1 < rows.length) rows.splice(row - 1, n);
  t.cut = t.cut < 0 ? row - 1 : Math.min(t.cut, row - 1);
  t.lastCol = -1;
  return this;
};
VSheet_.prototype.deleteRow = function (row) { return this.deleteRows(row, 1); };
VSheet_.prototype.insertRowsAfter = function (after, n) { this.t.maxRows = Math.max(this.t.maxRows, after) + n; return this; };
['insertColumnsAfter', 'setFrozenRows', 'hideSheet', 'showSheet', 'setColumnWidth', 'setColumnWidths', 'setConditionalFormatRules', 'setTabColor', 'activate', 'autoResizeColumns', 'setRowHeight'].forEach(function (m) {
  VSheet_.prototype[m] = function () { return this; };
});
VSheet_.prototype.getFrozenRows = function () { return 1; };
VSheet_.prototype.getConditionalFormatRules = function () { return []; };

var CF_SPREADSHEET_ = {
  getSheetByName: function (name) {
    var t = tabState_(name);
    return t.exists ? new VSheet_(name) : null;
  },
  insertSheet: function (name) {
    var t = tabState_(name);
    t.exists = true;
    tabMut_(t);
    t.dirty[0] = true;
    return new VSheet_(name);
  },
  getSheets: function () {
    return CF_TABS_.filter(function (n) { return REQ.tabs[n] && REQ.tabs[n].exists; }).map(function (n) { return new VSheet_(n); });
  },
  getId: function () { return ''; },
  getUrl: function () { return ''; },
  getName: function () { return 'DZ Smart Shop'; },
  toast: function () {},
  getSpreadsheetTimeZone: function () { return 'Africa/Algiers'; }
};

function cfValidation_() {
  var b = {};
  ['requireValueInList', 'requireNumberGreaterThanOrEqualTo', 'requireNumberBetween', 'requireDate', 'requireCheckbox', 'setAllowInvalid', 'setHelpText', 'requireTextIsEmail'].forEach(function (m) { b[m] = function () { return b; }; });
  b.build = function () { return {}; };
  return b;
}

var SpreadsheetApp = {
  getActiveSpreadsheet: function () { return REQ && REQ.tabStore ? CF_SPREADSHEET_ : null; },
  openById: notOnCloudflare_('Classeur Google'),
  getUi: notOnCloudflare_('Menu du classeur'),
  newDataValidation: cfValidation_,
  newConditionalFormatRule: notOnCloudflare_('Classeur Google'),
  flush: function () {}
};
/*
 * Appels extérieurs (Ecotrack, httpSMS…) : Cloudflare ne sait faire que des appels « asynchrones »,
 * alors que le code de l'outil attend la réponse. L'action est donc jouée plusieurs fois :
 *  - si la réponse est déjà connue (REQ.fetched), elle est rendue tout de suite ;
 *  - sinon l'appel est noté (REQ.needFetch : le PREMIER appel manquant seulement, ou le premier
 *    groupe pour fetchAll) et l'action s'arrête ; server.js fait l'appel, puis rejoue l'action
 *    depuis le début, avec les commandes telles qu'elles étaient. Rien n'est enregistré avant la fin.
 * Un appel noté après le premier manquant n'est jamais fait (il découlerait d'une réponse absente).
 */
function fetchKey_(url, params) {
  params = params || {};
  var body = params.payload === undefined || params.payload === null ? '' : (typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload));
  return String(params.method || 'get').toUpperCase() + ' ' + url + ' ' + body;
}
function fetchMiss_() {
  var e = new Error('Appel extérieur en cours.');
  e.dzFetchMiss = true;
  return e;
}
function httpResponse_(r, url, params) {
  if (r.error) throw new Error(r.error);
  if (params && params.muteHttpExceptions === false && r.code >= 400) throw new Error('Request failed for ' + url + ' returned code ' + r.code);
  var bytes = r.bytes || new Uint8Array(0);
  return {
    getResponseCode: function () { return r.code; },
    getContentText: function () { return r.text; },
    getContent: function () { return bytes; },
    getAllHeaders: function () { return r.headers || {}; },
    getHeaders: function () { return r.headers || {}; },
    getBlob: function () {
      return {
        getBytes: function () { return bytes; },
        getContentType: function () { return (r.headers || {})['content-type'] || ''; },
        getDataAsString: function () { return r.text; }
      };
    }
  };
}
function takeFetch_(url, params) {
  var key = fetchKey_(url, params);
  var list = REQ.fetched[key] || [];
  var used = REQ.fetchUsed[key] || 0;
  if (used < list.length) { REQ.fetchUsed[key] = used + 1; return list[used]; }
  return null;
}
var UrlFetchApp = {
  fetch: function (url, params) {
    if (!REQ || !REQ.fetched) throw new Error('Appel extérieur impossible ici.');
    var r = takeFetch_(url, params);
    if (r) return httpResponse_(r, url, params);
    if (!REQ.needFetch) REQ.needFetch = [{ url: url, params: params || {} }];
    throw fetchMiss_();
  },
  fetchAll: function (list) {
    if (!REQ || !REQ.fetched) throw new Error('Appel extérieur impossible ici.');
    var found = [];
    var missing = [];
    list.forEach(function (req) {
      var r = takeFetch_(req.url, req);
      if (r) found.push({ r: r, req: req }); else missing.push({ url: req.url, params: req });
    });
    if (!missing.length) return found.map(function (x) { return httpResponse_(x.r, x.req.url, x.req); });
    if (!REQ.needFetch) REQ.needFetch = missing;
    throw fetchMiss_();
  }
};
var HtmlService = { createHtmlOutput: notOnCloudflare_('Page Apps Script'), createTemplate: notOnCloudflare_('Page Apps Script') };
var ScriptApp = { getProjectTriggers: function () { return []; }, newTrigger: notOnCloudflare_('Déclencheur'), getService: function () { return { getUrl: function () { return ''; } }; } };
var MailApp = { sendEmail: function () {}, getRemainingDailyQuota: function () { return 0; } };
var DriveApp = {};
var Logger = { log: function () {} };
