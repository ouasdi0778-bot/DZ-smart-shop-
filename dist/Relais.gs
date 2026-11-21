/**
 * @OnlyCurrentDoc
 *
 * DZ Smart Shop — RELAIS RELEASIT (version 1.19.0).
 *
 * Quand toute l'application est dans la version Cloudflare, ce petit script remplace l'ancien Code.gs.
 * Il ne fait qu'une chose : chaque minute, il lit les nouvelles lignes de l'onglet RELEASIT (écrites
 * par Releasit COD) et les envoie à l'application Cloudflare, qui crée les commandes et envoie le SMS
 * « commande reçue ». Il ne modifie jamais le classeur.
 * Sans nouvelle ligne, il dit seulement « je suis là » : après 10 minutes sans nouvelles, l'application
 * Cloudflare vous prévient (SMS et bandeau rouge).
 *
 * INSTALLATION
 * 1. Dans le classeur : Extensions › Apps Script.
 * 2. Effacez tout le contenu de Code.gs, collez ce fichier à la place, puis Enregistrer.
 * 3. Revenez au classeur et rechargez la page : menu « DZ Smart Shop › Installer le relais ».
 *    Google demande une autorisation (lire ce classeur, appeler l'application Cloudflare) : acceptez.
 * Le lien déjà fait avec Cloudflare est gardé (propriétés CF_URL et CF_SECRET de l'ancien code).
 * Fichier généré automatiquement (npm run bundle) depuis relay/Relais.gs.
 */

var RELAIS = {
  VERSION: '1.19.0',
  SHEET: 'RELEASIT',
  PROP_URL: 'CF_URL',
  PROP_SECRET: 'CF_SECRET',
  PROP_MARK: 'RELEASIT_MARK',   // dernière ligne envoyée { row, id, col } : le même repère que l'ancien code
  PROP_STATE: 'RELAIS_ETAT',    // dernier passage, dernière erreur, commandes ajoutées
  BATCH: 50,                    // lignes par envoi
  MAX_BATCHES: 10,              // envois au plus par passage (500 lignes)
  RESYNC: 200                   // repère perdu (lignes effacées) : les 200 dernières lignes sont renvoyées
};

/* ------------------------------------------------------------------ */
/* Menu du classeur                                                   */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('DZ Smart Shop')
    .addItem('Installer le relais', 'menuInstallerRelais')
    .addItem('État du relais', 'menuEtatRelais')
    .addItem('Envoyer maintenant', 'menuEnvoyerRelais')
    .addToUi();
}

function menuInstallerRelais() {
  var ui = SpreadsheetApp.getUi();
  try { ui.alert('Relais RELEASIT', installerRelais(), ui.ButtonSet.OK); } catch (e) { ui.alert('Relais RELEASIT : échec', relaisMessage_(e), ui.ButtonSet.OK); }
}

function menuEtatRelais() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('Relais RELEASIT', etatRelais(), ui.ButtonSet.OK);
}

function menuEnvoyerRelais() {
  var ui = SpreadsheetApp.getUi();
  try {
    var s = relaisReleasit();
    ui.alert('Relais RELEASIT', s.added ? s.added + ' nouvelle(s) commande(s) envoyée(s) à l’application.' : 'Rien de nouveau dans l’onglet RELEASIT.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Relais RELEASIT : échec', relaisMessage_(e), ui.ButtonSet.OK);
  }
}

/* ------------------------------------------------------------------ */
/* Installation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Installe le relais : supprime toutes les anciennes tâches automatiques de l'ancien code, crée la
 * tâche de chaque minute, prévient l'application Cloudflare (mode relais), puis fait un premier passage.
 */
function installerRelais() {
  var cfg = relaisConfig_();
  if (!cfg.url || !cfg.secret) {
    throw new Error('Ce classeur n’est pas relié à l’application Cloudflare (propriétés CF_URL et CF_SECRET absentes). ' +
      'Remettez l’ancien Code.gs, reliez le classeur (Administration › Connexions › Cloudflare), puis recommencez.');
  }
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RELAIS.SHEET)) throw new Error('Onglet « ' + RELAIS.SHEET + ' » introuvable dans ce classeur.');
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('relaisReleasit').timeBased().everyMinutes(1).create();
  relaisFetch_({ install: true, version: RELAIS.VERSION });
  var s = relaisReleasit();
  return 'Relais installé : chaque minute, les nouvelles lignes de l’onglet RELEASIT partent vers l’application Cloudflare.' +
    (s.added ? ' ' + s.added + ' nouvelle(s) commande(s) envoyée(s).' : '') +
    ' Les anciennes tâches automatiques sont supprimées. Vérifiez dans l’application : Administration › Connexions › Releasit.';
}

/** État du relais (menu, ou Exécuter dans l'éditeur). */
function etatRelais() {
  var p = PropertiesService.getScriptProperties();
  var st = relaisState_(p);
  var mark = relaisMark_(p);
  var running = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'relaisReleasit'; });
  var lines = [
    running ? 'Tâche de chaque minute : active.' : 'Tâche de chaque minute : PAS installée (menu DZ Smart Shop › Installer le relais).',
    'Dernier passage : ' + (st.at ? relaisWhen_(st.at) : 'jamais') + '.',
    'Dernière commande envoyée : ' + (st.lastAdd ? relaisWhen_(st.lastAdd) + (st.lastIds && st.lastIds.length ? ' (' + st.lastIds.join(', ') + ')' : '') : 'aucune pour l’instant') + '.',
    'Dernière ligne lue dans RELEASIT : ' + (mark ? mark.row : '—') + '.'
  ];
  if (st.error) lines.push('Dernière erreur : ' + st.error);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Passage de chaque minute                                           */
/* ------------------------------------------------------------------ */

/** Tâche de chaque minute : envoie les nouvelles lignes (par lots), ou un simple « je suis là ». */
function relaisReleasit() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { added: 0, busy: true };
  var p = PropertiesService.getScriptProperties();
  var st = relaisState_(p);
  var added = [];
  try {
    var resync = false;
    for (var i = 0; i < RELAIS.MAX_BATCHES; i++) {
      var job = relaisPrepare_(resync);
      var res = relaisFetch_(job.payload);
      relaisApply_(job, res);
      (res && res.added || []).forEach(function (id) { added.push(id); });
      if (!job.payload.rows || !job.payload.more) break;
      resync = !!job.payload.resync;
    }
    st.at = new Date().toISOString();
    st.error = '';
    if (added.length) { st.lastAdd = st.at; st.lastIds = added.slice(-5); }
    p.setProperty(RELAIS.PROP_STATE, JSON.stringify(st));
    return { added: added.length };
  } catch (e) {
    st.at = new Date().toISOString();
    st.error = relaisMessage_(e);
    p.setProperty(RELAIS.PROP_STATE, JSON.stringify(st));
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ce qu'il faut envoyer maintenant : les lignes après le repère (au plus RELAIS.BATCH), ou rien
 * (simple « je suis là »). Repère perdu (lignes effacées dans RELEASIT) : les RELAIS.RESYNC dernières
 * lignes sont renvoyées (resync) ; l'application ne garde que les 7 derniers jours, sans doublon.
 */
function relaisPrepare_(forceResync) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RELAIS.SHEET);
  if (!sh) throw new Error('Onglet « ' + RELAIS.SHEET + ' » introuvable dans ce classeur.');
  var p = PropertiesService.getScriptProperties();
  var mark = relaisMark_(p);
  var lastRow = sh.getLastRow();
  var payload = { version: RELAIS.VERSION, lastRow: lastRow };
  if (lastRow < 2) return { payload: payload, from: 2, values: [] };
  var from;
  var resync = !!forceResync;
  var markOk = mark && mark.row >= 1 && mark.row <= lastRow &&
    (mark.row === 1 || relaisText_(sh.getRange(mark.row, mark.col || 1).getValue()) === mark.id);
  if (markOk) from = mark.row + 1;
  else { resync = true; from = Math.max(2, lastRow - RELAIS.RESYNC + 1); }
  if (from > lastRow) return { payload: payload, from: from, values: [] };
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var to = Math.min(lastRow, from + RELAIS.BATCH - 1);
  var values = sh.getRange(from, 1, to - from + 1, lastCol).getValues();
  payload.header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(relaisCell_);
  payload.rows = values.map(function (r) { return r.map(relaisCell_); });
  payload.from = from;
  payload.more = to < lastRow;
  payload.resync = resync;
  return { payload: payload, from: from, values: values };
}

/** Nouveau repère après la réponse de l'application : { next : prochaine ligne, col : colonne du n° }. */
function relaisApply_(job, res) {
  if (!res || !job.payload.rows || !(res.next > job.from)) return;
  var row = res.next - 1;
  var col = Math.max(1, Number(res.col) || 1);
  var line = job.values[row - job.from];
  var id = line ? relaisText_(line[col - 1]) : '';
  PropertiesService.getScriptProperties().setProperty(RELAIS.PROP_MARK, JSON.stringify({ row: row, id: id, col: col }));
}

/* ------------------------------------------------------------------ */
/* Outils                                                             */
/* ------------------------------------------------------------------ */

function relaisConfig_() {
  var p = PropertiesService.getScriptProperties();
  return { url: String(p.getProperty(RELAIS.PROP_URL) || '').replace(/\/+$/, ''), secret: String(p.getProperty(RELAIS.PROP_SECRET) || '') };
}

/** Appel à l'application Cloudflare, avec la clé partagée. */
function relaisFetch_(payload) {
  var cfg = relaisConfig_();
  if (!cfg.url || !cfg.secret) throw new Error('Ce classeur n’est pas relié à l’application Cloudflare (menu DZ Smart Shop › Installer le relais).');
  var res = UrlFetchApp.fetch(cfg.url + '/bridge/releasit', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { 'X-DZ-Key': cfg.secret },
    muteHttpExceptions: true,
    followRedirects: false
  });
  var code = res.getResponseCode();
  var body = null;
  try { body = JSON.parse(res.getContentText()); } catch (e) { body = null; }
  if (code >= 300 || !body || !body.ok) {
    throw new Error('Application Cloudflare : ' + (body && body.error ? body.error : 'réponse inattendue (erreur ' + code + ').'));
  }
  return body.data;
}

function relaisMark_(p) {
  try {
    var m = JSON.parse(p.getProperty(RELAIS.PROP_MARK) || 'null');
    return m && typeof m.row === 'number' ? m : null;
  } catch (e) {
    return null;
  }
}

function relaisState_(p) {
  try { return JSON.parse(p.getProperty(RELAIS.PROP_STATE) || 'null') || {}; } catch (e) { return {}; }
}

/** Même lecture que l'application (releasitText_) : espaces en trop retirés. */
function relaisText_(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/** Une case envoyée : une date garde son type (« $d », heure exacte). */
function relaisCell_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : { $d: v.toISOString() };
  return v === undefined || v === null ? '' : v;
}

function relaisWhen_(iso) {
  var d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM/yyyy à HH:mm');
}

function relaisMessage_(e) {
  return String(e && e.message ? e.message : e);
}
