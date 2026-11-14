/**
 * Health.gs : la tâche automatique de chaque minute, l'état de l'outil et
 * les alertes de panne par e-mail.
 *
 * - Une seule tâche chaque minute (everyMinute) fait tout le travail régulier :
 *   commandes Releasit (chaque minute), SMS (s'il y en a en attente),
 *   nouvelles lignes du classeur et Shopify (toutes les 5 minutes), statuts
 *   Ecotrack (toutes les 30 minutes). Quand il n'y a rien à faire, elle s'arrête
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
  { key: 'ecotrack', label: 'Statuts des colis Ecotrack', every: 30, staleMin: 180 },
  { key: 'nightly', label: 'Entretien de nuit', every: 1440, staleMin: 27 * 60 }
];

function taskInfo_(key) {
  for (var i = 0; i < TASKS_.length; i++) if (TASKS_[i].key === key) return TASKS_[i];
  return null;
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
  TASKS_.forEach(function (info) {
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
  var tasks = TASKS_.map(function (info) {
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
