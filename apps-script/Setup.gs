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
