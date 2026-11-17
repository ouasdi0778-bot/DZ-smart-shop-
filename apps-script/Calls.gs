/**
 * Calls.gs : les appels sans réponse.
 *
 *  - Jusqu'à APPELS_PAR_JOUR appels par jour (3), espacés de DELAI_RAPPEL_MINUTES (2 h).
 *  - Après le dernier appel du jour : rappel le lendemain à HEURE_DEBUT_APPELS (9 h).
 *  - Pendant JOURS_D_APPELS jours (3), comptés en jours de calendrier depuis l'arrivée
 *    de la commande. Ensuite, si ANNULATION_AUTO = OUI, la commande est annulée
 *    (motif « Injoignable (annulation automatique) ») ; sinon elle passe « Injoignable ».
 *  - Chaque nuit, les commandes sans réponse dont les jours d'appels sont passés sont
 *    annulées (même si tous les appels n'ont pas été faits).
 *  - Une commande « Rappeler » (le client a répondu) ou jamais appelée n'est jamais annulée
 *    automatiquement.
 */

var AUTO_CANCEL_REASON_ = 'Injoignable (annulation automatique)';
var CALL_LOG_MAX_ = 12; // appels gardés dans « Historique appels »

/**
 * Commande qu'on peut encore appeler depuis Confirmation : à confirmer, pas de réponse,
 * rappeler, injoignable (nouvel essai), ou sans statut.
 */
function isCallable_(o) {
  return isBlank_(o.status) || QUEUE_STATUSES.indexOf(o.status) >= 0 || o.status === STATUS.UNREACHABLE;
}

/** « Historique appels » : « 17/11 10:05 Pas de réponse · Sara | 17/11 14:30 … » → [{ when, text }]. */
function parseCallLog_(value) {
  return String(value == null ? '' : value).split('|').map(function (x) { return x.trim(); })
    .filter(function (x) { return x; })
    .map(function (raw) {
      var m = raw.match(/^(\d{2}\/\d{2} \d{2}:\d{2}) (.*)$/);
      return { raw: raw, when: m ? m[1] : '', text: m ? m[2] : raw };
    });
}

/** Ajoute un appel à l'historique (les CALL_LOG_MAX_ derniers sont gardés). */
function addCallLog_(o, now, text, user) {
  var entry = (Utilities.formatDate(now, 'Africa/Algiers', 'dd/MM HH:mm') + ' ' + text + (user && user.name ? ' · ' + user.name : '')).replace(/\|/g, '/');
  var list = parseCallLog_(o.callLog).map(function (x) { return x.raw; });
  list.push(entry);
  return list.slice(-CALL_LOG_MAX_).join(' | ');
}

/** Pourquoi une commande ni confirmée ni annulée n'est pas dans la file d'appels ('' si elle y est ou si elle est traitée). */
function waitingReason_(o) {
  if (QUEUE_STATUSES.indexOf(o.status) >= 0) return '';
  if (isBlank_(o.status)) return 'Sans statut : à appeler';
  if (o.status === STATUS.UNREACHABLE) {
    var n = toNumber_(o.attempts);
    return 'Injoignable' + (n ? ' : ' + n + ' appel' + (n > 1 ? 's' : '') + ' sans réponse' : '') + '. Vous pouvez réessayer ou annuler';
  }
  if (STATUS_LIST.indexOf(o.status) < 0) return 'Statut inconnu « ' + String(o.status).slice(0, 40) + ' » : ouvrez la fiche pour le corriger (ligne du classeur à vérifier)';
  return '';
}

/** « 2026-11-14 » en heure d'Algérie. */
function dayKey_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'yyyy-MM-dd');
}

/** Colonne « Appels du jour » : « 2026-11-14 : 2 » → { day: '2026-11-14', n: 2 }. */
function parseDayCalls_(value) {
  var m = String(value == null ? '' : value).match(/(\d{4}-\d{2}-\d{2})\D+(\d+)/);
  return m ? { day: m[1], n: +m[2] } : { day: '', n: 0 };
}

/** Jour d'appel : 1 le jour où la commande est arrivée, 2 le lendemain… */
function callDay_(o, now) {
  var start = startOfDay_(toDate_(o.date) || now);
  return Math.round((startOfDay_(now).getTime() - start.getTime()) / 86400000) + 1;
}

/** Demain à l'heure donnée. */
function tomorrowAt_(now, hour) {
  var d = startOfDay_(now);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Ce qui suit un appel sans réponse : statut, prochain rappel, ou annulation. */
function noAnswerFields_(o, env) {
  var s = env.settings;
  var now = env.now;
  var f = { attempts: toNumber_(o.attempts) + 1 };
  var today = dayKey_(now);
  var prev = parseDayCalls_(o.dayCalls);
  var n = prev.day === today ? prev.n + 1 : 1;
  f.dayCalls = today + ' : ' + n;
  var day = callDay_(o, now);
  var label = 'appel ' + n + '/' + s.APPELS_PAR_JOUR + ' du jour ' + Math.min(day, s.JOURS_D_APPELS) + '/' + s.JOURS_D_APPELS;
  var finished = day > s.JOURS_D_APPELS || (day >= s.JOURS_D_APPELS && n >= s.APPELS_PAR_JOUR);
  if (finished) {
    f.callback = '';
    if (s.ANNULATION_AUTO) {
      f.status = STATUS.CANCELLED;
      f.cancelReason = AUTO_CANCEL_REASON_;
      return { fields: f, detail: 'Pas de réponse (' + label + ') : ' + f.attempts + ' appels sans réponse, commande annulée automatiquement' };
    }
    f.status = STATUS.UNREACHABLE;
    return { fields: f, detail: 'Pas de réponse (' + label + ') : injoignable' };
  }
  f.status = STATUS.NO_ANSWER;
  if (n < s.APPELS_PAR_JOUR) {
    f.callback = new Date(now.getTime() + s.DELAI_RAPPEL_MINUTES * 60000);
    return { fields: f, detail: 'Pas de réponse (' + label + '), rappel dans ' + Math.round(s.DELAI_RAPPEL_MINUTES / 60 * 10) / 10 + ' h' };
  }
  f.callback = tomorrowAt_(now, s.HEURE_DEBUT_APPELS);
  return { fields: f, detail: 'Pas de réponse (' + label + '), rappel demain à ' + s.HEURE_DEBUT_APPELS + ' h' };
}

/**
 * Annule les commandes restées sans réponse après leurs jours d'appels
 * (lancé chaque nuit). Renvoie le nombre de commandes annulées.
 */
function autoCancelUnreachable_() {
  var settings = getSettings_();
  if (!settings.ANNULATION_AUTO) return 0;
  return withLock_(function () {
    var ctx = readOrders_();
    var now = new Date();
    var actor = { name: 'Automatique' };
    var n = 0;
    ctx.orders.forEach(function (o) {
      if (o.status !== STATUS.NO_ANSWER && o.status !== STATUS.UNREACHABLE) return;
      if (!(toNumber_(o.attempts) > 0) || callDay_(o, now) <= settings.JOURS_D_APPELS) return;
      writeFields_(ctx, o, { status: STATUS.CANCELLED, cancelReason: AUTO_CANCEL_REASON_, callback: '', updated: now });
      log_(actor, o.id, 'Annulation automatique', toNumber_(o.attempts) + ' appels sans réponse en ' + settings.JOURS_D_APPELS + ' jours');
      n++;
    });
    return n;
  });
}
