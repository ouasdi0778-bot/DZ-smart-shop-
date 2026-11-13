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
 *  - Pas de SMS la nuit (SMS_HEURES, 8-21 par défaut) : ils partent le matin.
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
    var list = pending.filter(function (e) { return smsTemplate_(settings, e.status); });
    if (!list.length) return 0;
    var p = PropertiesService.getScriptProperties();
    var q = readSmsQueue_(p);
    var now = Math.round(Date.now() / 1000);
    list.forEach(function (e) {
      var s = STATUS_LIST.indexOf(e.status);
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
    var status = STATUS_LIST[e.s];
    var o = status ? findOrder_(ctx, e.i) : null;
    var tpl = status ? smsTemplate_(settings, status) : '';
    var to = o ? smsNumber_(o.phone) : '';
    var orderDate = o ? toDate_(o.date) : null;
    if (!o || o.status !== status || !tpl || smsAlreadySent_(o, status) || now - e.t * 1000 > SMS.MAX_AGE_MS ||
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
    hours: settings.smsFrom + ' h – ' + settings.smsTo + ' h',
    statuses: STATUS_LIST.filter(function (s) { return smsTemplate_(settings, s); })
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
    ui.alert('SMS', 'Enregistré : les SMS partiront du ' + r.from + ', dans la minute qui suit chaque changement de statut, entre ' + smsStatus_().hours + '.\n\nLes textes se modifient dans l’onglet Paramètres (SMS_A_CONFIRMER, SMS_CONFIRMEE…). Texte vide = pas de SMS.', ui.ButtonSet.OK);
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
