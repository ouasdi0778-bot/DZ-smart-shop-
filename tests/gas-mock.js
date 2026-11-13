/**
 * Imitation minimale des services Google Apps Script (SpreadsheetApp,
 * Session, LockService…), pour tester le code hors de Google.
 * Fonctionne dans Node et dans un navigateur (aperçu local).
 */
(function (g) {
  'use strict';

  /* -------------------- Plages et onglets -------------------- */

  function Range(sheet, row, col, nr, nc) {
    if (row < 1 || col < 1) throw new Error('Plage invalide : ligne ' + row + ', colonne ' + col);
    if (row + (nr || 1) - 1 > sheet.maxRows) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet (ligne ' + (row + (nr || 1) - 1) + ' > ' + sheet.maxRows + ')');
    }
    this.sheet = sheet; this.row = row; this.col = col; this.nr = nr || 1; this.nc = nc || 1;
  }
  Range.prototype.getValues = function () {
    var out = [];
    for (var r = 0; r < this.nr; r++) {
      var line = [];
      for (var c = 0; c < this.nc; c++) line.push(this.sheet._get(this.row + r, this.col + c));
      out.push(line);
    }
    return out;
  };
  Range.prototype.getValue = function () { return this.sheet._get(this.row, this.col); };
  Range.prototype.setValues = function (values) {
    if (values.length !== this.nr) throw new Error('setValues : ' + values.length + ' lignes au lieu de ' + this.nr);
    for (var r = 0; r < this.nr; r++) {
      if (values[r].length !== this.nc) throw new Error('setValues : ' + values[r].length + ' colonnes au lieu de ' + this.nc);
      for (var c = 0; c < this.nc; c++) this.sheet._set(this.row + r, this.col + c, values[r][c]);
    }
    return this;
  };
  Range.prototype.setValue = function (v) {
    for (var r = 0; r < this.nr; r++) for (var c = 0; c < this.nc; c++) this.sheet._set(this.row + r, this.col + c, v);
    return this;
  };
  Range.prototype.getRow = function () { return this.row; };
  Range.prototype.getSheet = function () { return this.sheet; };
  Range.prototype.getColumn = function () { return this.col; };
  Range.prototype.getNumRows = function () { return this.nr; };
  Range.prototype.getNumColumns = function () { return this.nc; };
  Range.prototype.setNumberFormat = function (f) { this.sheet._formats.push({ col: this.col, format: f }); return this; };
  Range.prototype.setDataValidation = function (rule) { this.sheet._validations.push({ col: this.col, rule: rule }); return this; };
  ['setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setHorizontalAlignment', 'setFontSize']
    .forEach(function (m) { Range.prototype[m] = function () { return this; }; });

  function Sheet(ss, name) {
    this.ss = ss; this.name = name; this.data = []; this.maxRows = 1000; this.maxCols = 26;
    this._formats = []; this._validations = []; this._cf = []; this.frozen = 0;
  }
  Sheet.prototype._get = function (r, c) {
    var row = this.data[r - 1];
    var v = row ? row[c - 1] : undefined;
    if (v === undefined || v === null) return '';
    return v instanceof Date ? new Date(v.getTime()) : v;
  };
  Sheet.prototype._set = function (r, c, v) {
    while (this.data.length < r) this.data.push([]);
    var row = this.data[r - 1];
    while (row.length < c) row.push('');
    if (v === undefined || v === null) v = '';
    row[c - 1] = v instanceof Date ? new Date(v.getTime()) : v;
    if (r > this.maxRows) this.maxRows = r;
    if (c > this.maxCols) this.maxCols = c;
  };
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getParent = function () { return this.ss; };
  Sheet.prototype.getLastRow = function () {
    for (var r = this.data.length; r > 0; r--) {
      if (this.data[r - 1].some(function (v) { return v !== '' && v !== null && v !== undefined; })) return r;
    }
    return 0;
  };
  Sheet.prototype.getLastColumn = function () {
    var max = 0;
    this.data.forEach(function (row) {
      for (var c = row.length; c > max; c--) {
        if (row[c - 1] !== '' && row[c - 1] !== null && row[c - 1] !== undefined) { max = c; break; }
      }
    });
    return max;
  };
  Sheet.prototype.getMaxRows = function () { return this.maxRows; };
  Sheet.prototype.getMaxColumns = function () { return this.maxCols; };
  Sheet.prototype.getRange = function (row, col, nr, nc) {
    if (typeof row !== 'number') throw new Error('Le mock ne gère que getRange(ligne, colonne, …)');
    return new Range(this, row, col, nr, nc);
  };
  Sheet.prototype.getDataRange = function () {
    return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  };
  Sheet.prototype.appendRow = function (values) {
    var r = this.getLastRow() + 1;
    var self = this;
    values.forEach(function (v, i) { self._set(r, i + 1, v); });
    return this;
  };
  Sheet.prototype.deleteRow = function (r) { this.data.splice(r - 1, 1); this.maxRows = Math.max(this.maxRows - 1, 1); return this; };
  Sheet.prototype.deleteRows = function (r, n) { this.data.splice(r - 1, n); this.maxRows = Math.max(this.maxRows - n, 1); return this; };
  Sheet.prototype.insertRowsAfter = function (r, n) {
    if (r < this.data.length) { var args = [r, 0]; for (var i = 0; i < n; i++) args.push([]); this.data.splice.apply(this.data, args); }
    this.maxRows += n;
    return this;
  };
  Sheet.prototype.deleteColumns = function (c, n) {
    this.data.forEach(function (row) { row.splice(c - 1, n); });
    this.maxCols = Math.max(this.maxCols - n, 1);
    return this;
  };
  Sheet.prototype.setFrozenRows = function (n) { this.frozen = n; return this; };
  Sheet.prototype.setColumnWidth = function () { return this; };
  Sheet.prototype.getConditionalFormatRules = function () { return this._cf.slice(); };
  Sheet.prototype.setConditionalFormatRules = function (rules) { this._cf = rules.slice(); return this; };

  function Spreadsheet() {
    this.sheets = [new Sheet(this, 'Feuille 1')];
    this.toasts = [];
  }
  Spreadsheet.prototype.getId = function () { return 'mock-spreadsheet'; };
  Spreadsheet.prototype.getSheetByName = function (n) {
    for (var i = 0; i < this.sheets.length; i++) if (this.sheets[i].name === n) return this.sheets[i];
    return null;
  };
  Spreadsheet.prototype.insertSheet = function (n) {
    if (this.getSheetByName(n)) throw new Error('Onglet déjà existant : ' + n);
    var s = new Sheet(this, n);
    this.sheets.push(s);
    return s;
  };
  Spreadsheet.prototype.getSheets = function () { return this.sheets.slice(); };
  Spreadsheet.prototype.deleteSheet = function (s) { this.sheets = this.sheets.filter(function (x) { return x !== s; }); };
  Spreadsheet.prototype.setActiveSheet = function (s) { return s; };
  Spreadsheet.prototype.toast = function (msg) { this.toasts.push(msg); };
  Spreadsheet.prototype.setSpreadsheetTimeZone = function (tz) { this.timeZone = tz; };

  /* -------------------- Constructeurs (règles) -------------------- */

  function builder(kind) {
    var spec = { kind: kind, calls: {} };
    var proxy = new Proxy({}, {
      get: function (target, prop) {
        if (prop === 'build') {
          return function () {
            return {
              kind: kind,
              calls: spec.calls,
              getRanges: function () { return (spec.calls.setRanges || [[]])[0]; }
            };
          };
        }
        return function () { spec.calls[prop] = Array.prototype.slice.call(arguments); return proxy; };
      }
    });
    return proxy;
  }

  /* -------------------- Services -------------------- */

  var state = {};

  function reset() {
    state.ss = new Spreadsheet();
    state.props = {};
    state.cache = {};
    state.triggers = [];
    state.user = 'admin@example.com';
    state.alerts = [];
    state.sleeps = [];
    state.prompts = [];
    state.alertAnswer = 'OK';
    if (g.__fakeEcotrack) g.__fakeEcotrack.reset();
    if (g.__fakeShopify) g.__fakeShopify.reset();
    if (g.__fakeHttpsms) g.__fakeHttpsms.reset();
  }
  reset();

  g.__mock = {
    reset: reset,
    state: state,
    setUser: function (email) { state.user = email; },
    ss: function () { return state.ss; }
  };

  g.SpreadsheetApp = {
    getActiveSpreadsheet: function () { return state.ss; },
    openById: function () { return state.ss; },
    newDataValidation: function () { return builder('validation'); },
    newConditionalFormatRule: function () { return builder('conditional'); },
    flush: function () {},
    getUi: function () {
      var Button = { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO' };
      var menu = {
        addItem: function () { return menu; }, addSeparator: function () { return menu; },
        addSubMenu: function () { return menu; }, addToUi: function () {}
      };
      return {
        createMenu: function () { return menu; },
        alert: function () { state.alerts.push(Array.prototype.slice.call(arguments)); return state.alertAnswer; },
        prompt: function () {
          var answer = state.prompts.shift();
          return {
            getSelectedButton: function () { return answer === undefined || answer === null ? Button.CANCEL : Button.OK; },
            getResponseText: function () { return answer === undefined || answer === null ? '' : String(answer); }
          };
        },
        showModalDialog: function () {},
        Button: Button,
        ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' }
      };
    }
  };

  g.Session = {
    getActiveUser: function () { return { getEmail: function () { return state.user; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return 'admin@example.com'; } }; },
    getScriptTimeZone: function () { return 'Africa/Algiers'; }
  };

  g.LockService = {
    getScriptLock: function () {
      return { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {} };
    }
  };

  g.PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (k) { return Object.prototype.hasOwnProperty.call(state.props, k) ? state.props[k] : null; },
        setProperty: function (k, v) { state.props[k] = String(v); },
        deleteProperty: function (k) { delete state.props[k]; }
      };
    }
  };

  g.CacheService = {
    getScriptCache: function () {
      return {
        get: function (k) { return Object.prototype.hasOwnProperty.call(state.cache, k) ? state.cache[k] : null; },
        put: function (k, v) { state.cache[k] = String(v); },
        remove: function (k) { delete state.cache[k]; },
        removeAll: function (keys) { keys.forEach(function (k) { delete state.cache[k]; }); }
      };
    }
  };

  g.ScriptApp = {
    getProjectTriggers: function () { return state.triggers.slice(); },
    deleteTrigger: function (t) { state.triggers = state.triggers.filter(function (x) { return x !== t; }); },
    newTrigger: function (fn) {
      var t = { fn: fn, getHandlerFunction: function () { return fn; } };
      var chain = {
        timeBased: function () { return chain; },
        everyMinutes: function (n) { t.minutes = n; return chain; },
        everyDays: function (n) { t.days = n; return chain; },
        atHour: function (h) { t.hour = h; return chain; },
        create: function () { state.triggers.push(t); return t; }
      };
      return chain;
    },
    getService: function () { return { getUrl: function () { return 'https://script.google.com/macros/s/MOCK/exec'; } }; }
  };

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  g.Utilities = {
    formatDate: function (d, tz, fmt) {
      if (fmt === 'H') return String(d.getHours());
      return fmt.replace('yyyy', d.getFullYear()).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate()))
        .replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds()));
    },
    sleep: function (ms) { state.sleeps.push(ms); }
  };

  function output(html) {
    var o = {
      html: html,
      setTitle: function () { return o; }, addMetaTag: function () { return o; },
      setWidth: function () { return o; }, setHeight: function () { return o; },
      getContent: function () { return o.html; }
    };
    return o;
  }
  g.HtmlService = {
    createTemplateFromFile: function (name) { return { evaluate: function () { return output('[' + name + ']'); } }; },
    createHtmlOutputFromFile: function (name) { return output('[' + name + ']'); },
    createTemplate: function (html) { return { evaluate: function () { return output(html); } }; },
    createHtmlOutput: function (html) { return output(html); }
  };

  g.Logger = { log: function () {} };
})(typeof globalThis !== 'undefined' ? globalThis : this);
