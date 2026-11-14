/**
 * FollowUp.gs : suivi des problèmes de livraison (page Suivi).
 *
 * - Remarques du colis chez Ecotrack (get/maj) : celles du livreur (« client
 *   injoignable », « refusé »…) et les vôtres. Lues quand un colis passe
 *   « suspendu » ou « retour », et à l'ouverture de sa chronologie. La dernière
 *   remarque du livreur est gardée dans la colonne « Remarque livreur », avec
 *   une étiquette trouvée par mots-clés (Paramètres MOTS_*).
 * - SMS « livreur : injoignable » (colis suspendu, client injoignable ou sans
 *   remarque) et « sans réponse » (votre premier appel sans réponse) : une fois par commande.
 * - Résultat de l'appel au client : prévenu, reporter (remarque au livreur),
 *   nouvelle adresse ou nouveau téléphone (remarque), refus (demande de retour
 *   + client signalé, sans liste noire), pas de réponse (rappel dans 2 h, 3 fois),
 *   retour demandé.
 */

var FOLLOW = {
  MAX_CALLS: 3,          // appels sans réponse avant de proposer le retour
  MAX_REMARKS: 20,       // colis dont on lit les remarques à chaque lecture des statuts
  PREFIX: 'Vendeur : ',  // vos remarques chez Ecotrack commencent par ce texte
  MAX_LENGTH: 255        // limite d'Ecotrack pour une remarque
};

var REMARK_TAGS_ = [
  { key: 'refus', label: 'Refus' },
  { key: 'injoignable', label: 'Injoignable' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'reporte', label: 'Reporté' }
];

/** Étiquette d'une remarque du livreur ('refus', 'injoignable', 'adresse', 'reporte' ou ''). */
function remarkTag_(text, settings) {
  var t = normalizeLoose_(text);
  if (!t) return '';
  var words = (settings && settings.remarkWords) || {};
  for (var i = 0; i < REMARK_TAGS_.length; i++) {
    var list = words[REMARK_TAGS_[i].key] || [];
    for (var k = 0; k < list.length; k++) {
      if (list[k] && t.indexOf(list[k]) >= 0) return REMARK_TAGS_[i].key;
    }
  }
  return '';
}

function remarkTagLabel_(tag) {
  for (var i = 0; i < REMARK_TAGS_.length; i++) if (REMARK_TAGS_[i].key === tag) return REMARK_TAGS_[i].label;
  return '';
}

/* ------------------------------------------------------------------ */
/* Remarques du colis (get/maj)                                       */
/* ------------------------------------------------------------------ */

/**
 * Remarques d'une réponse get/maj, de la plus ancienne à la plus récente :
 * [{ text, date, author, mine }]. La documentation ne montre pas la forme exacte
 * de la réponse : on cherche une liste, puis le texte, la date et l'auteur.
 */
function parseRemarks_(json) {
  var list = listOf_(json, ['data', 'maj', 'majs', 'updates', 'remarques', 'results', 'list']);
  if (!list.length && json && typeof json === 'object' && !Array.isArray(json)) {
    Object.keys(json).some(function (k) {
      if (Array.isArray(json[k]) && json[k].length) { list = json[k]; return true; }
      return false;
    });
  }
  var notes = [];
  list.forEach(function (e, i) {
    if (e === null || e === undefined) return;
    var text = '';
    var rawDate = '';
    var author = '';
    if (typeof e === 'string') {
      text = e;
    } else if (typeof e === 'object') {
      text = String(firstOf_(e, ['content', 'contenu', 'remarque', 'message', 'text', 'comment', 'note', 'maj', 'description', 'details']));
      rawDate = firstOf_(e, ['created_at', 'date', 'datetime', 'updated_at', 'at', 'time']);
      var who = firstOf_(e, ['user', 'author', 'by', 'created_by', 'livreur', 'driver', 'source', 'from', 'type', 'role']);
      author = who && typeof who === 'object' ? String(firstOf_(who, ['name', 'nom', 'full_name', 'username', 'role', 'type'])) : String(who || '');
    }
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    var d = toDate_(rawDate);
    var mine = text.indexOf(FOLLOW.PREFIX.trim()) === 0 || /exp[eé]diteur|vendeur|seller|partenaire|client_api|api/i.test(author);
    notes.push({ text: text, date: d ? d.toISOString() : '', dateText: d || isBlank_(rawDate) ? '' : String(rawDate), author: author, mine: mine, order: i });
  });
  if (notes.length && notes.every(function (n) { return n.date; })) {
    notes.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || a.order - b.order; });
  }
  return notes.map(function (n) { return { text: n.text, date: n.date, dateText: n.dateText, author: n.author, mine: n.mine }; });
}

/** Texte gardé dans « Remarque livreur » : « 14/11 10:05 · client injoignable ». */
function courierNoteText_(note) {
  if (!note) return '';
  var d = note.date ? new Date(note.date) : null;
  var when = d ? Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM HH:mm') + ' · ' : '';
  return (when + note.text).slice(0, 300);
}

/** Dernière remarque du livreur (pas une des vôtres), ou null. */
function lastCourierRemark_(notes) {
  for (var i = notes.length - 1; i >= 0; i--) if (!notes[i].mine) return notes[i];
  return null;
}

/** Remarques de plusieurs colis : { tracking: { ok, notes, last, message } }. */
function courierRemarks_(trackings) {
  var out = {};
  if (!trackings.length) return out;
  var resps = fetchAllSafe_(trackings.map(function (t) { return ecotrackRequest_('get', '/api/v1/get/maj', { tracking: t }); }));
  trackings.forEach(function (t, i) {
    var resp = resps[i];
    if (!resp || resp.error) { out[t] = { ok: false, notes: [], last: null, message: 'Ecotrack injoignable.' }; return; }
    var code = resp.getResponseCode();
    var json = null;
    try { json = JSON.parse(resp.getContentText() || 'null'); } catch (e) { json = null; }
    if (code < 200 || code >= 300 || json === null) {
      out[t] = { ok: false, notes: [], last: null, message: code >= 200 && code < 300 ? 'Réponse inattendue d’Ecotrack.' : ecotrackFail_({ code: code, json: json }).message };
      return;
    }
    var notes = parseRemarks_(json);
    out[t] = { ok: true, notes: notes, last: lastCourierRemark_(notes), message: '' };
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Demandes à Ecotrack : remarque au livreur, demande de retour       */
/* ------------------------------------------------------------------ */

/**
 * Envoie une demande (POST, ou GET si Ecotrack refuse la méthode) et lit la
 * réponse : { ok, message }.
 */
function ecotrackAsk_(path, query) {
  var res = ecotrackCall_('POST', path, { query: query });
  if (res.code === 405) res = ecotrackCall_('GET', path, { query: query });
  var json = res.json || {};
  if (!res.ok) {
    var detail = flattenEcotrackErrors_(json.errors || json.error) || String(json.message || '');
    if (res.code === 401 || res.code === 403 || res.code === 429 || res.code >= 500) return { ok: false, message: ecotrackFail_(res).message };
    return { ok: false, message: 'Ecotrack a refusé la demande (erreur ' + res.code + ')' + (detail ? ' : ' + detail : '.') };
  }
  if (json.success === false || json.error) {
    var why = flattenEcotrackErrors_(json.error || json.errors) || String(json.message || '');
    return { ok: false, message: 'Ecotrack a refusé la demande' + (why ? ' : ' + why : '.') };
  }
  return { ok: true, message: String(json.message || '') };
}

/** Remarque au livreur (add/maj), 255 caractères au plus, précédée de « Vendeur : ». */
function sendCourierRemark_(tracking, text) {
  var content = (FOLLOW.PREFIX + String(text).replace(/\s+/g, ' ').trim()).slice(0, FOLLOW.MAX_LENGTH);
  return ecotrackAsk_('/api/v1/add/maj', { tracking: tracking, content: content });
}

/** Demande de retour (possible seulement quand le colis est en livraison). */
function askReturn_(tracking) {
  var r = ecotrackAsk_('/api/v1/ask/for/order/return', { tracking: tracking });
  if (!r.ok) r.message += ' La demande de retour n’est possible que pour un colis en livraison.';
  return r;
}

/* ------------------------------------------------------------------ */
/* Client signalé (sans liste noire)                                  */
/* ------------------------------------------------------------------ */

/** Écrit le signalement dans l'onglet Clients (colonne « Signalé »). À appeler sous verrou. */
function flagClient_(ctx, o, text) {
  var p = normalizePhone(o.phone);
  if (!p.valid) return false;
  var sh = sheet_(SHEET.CLIENTS);
  ensureHeaders_(sh, CLIENT_TITLES_);
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = function (title) {
    for (var i = 0; i < header.length; i++) if (normalizeText_(header[i]) === normalizeText_(title)) return i + 1;
    return 0;
  };
  var cPhone = col('Téléphone') || 1;
  var cName = col('Nom') || 2;
  var cFlag = col('Signalé');
  var last = sh.getLastRow();
  var row = 0;
  if (last > 1) {
    var phones = sh.getRange(2, cPhone, last - 1, 1).getValues();
    for (var i = 0; i < phones.length; i++) {
      if (normalizePhone(phones[i][0]).phone === p.phone) { row = i + 2; break; }
    }
  }
  if (!row) {
    row = last + 1;
    ensureRows_(sh, row);
    sh.getRange(row, cPhone).setNumberFormat('@').setValue(p.phone);
    sh.getRange(row, cName).setValue(String(o.client || ''));
  }
  sh.getRange(row, cFlag).setValue(text);
  clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
  refreshClientAlerts_(ctx, p.phone);
  return true;
}

/* ------------------------------------------------------------------ */
/* Résultat de l'appel                                                */
/* ------------------------------------------------------------------ */

var FOLLOW_RESULTS_ = ['informed', 'postpone', 'address', 'refused', 'no_answer', 'return'];

function shortDate_(d) {
  return Utilities.formatDate(d, 'Africa/Algiers', 'dd/MM');
}

/**
 * Ce qui s'est passé après l'appel au client (alerte de la page Suivi) :
 *   informed  : prévenu, il attend le livreur
 *   postpone  : { when } livraison reportée (remarque au livreur ; l'alerte revient ce jour-là)
 *   address   : { text } nouvelle adresse ou nouveau téléphone (remarque au livreur)
 *   refused   : refus (demande de retour, client signalé)
 *   no_answer : pas de réponse (rappel dans DELAI_RAPPEL_MINUTES, 3 fois ; SMS au premier)
 *   return    : demande de retour (client injoignable)
 */
function api_followUpResult(id, result, data) {
  var user = currentUser_();
  data = data || {};
  id = String(id);
  if (FOLLOW_RESULTS_.indexOf(result) < 0) throw new Error('Résultat inconnu.');
  var settings = getSettings_();
  var o0 = findOrder_(readOrders_(), id);
  if (!o0) throw new Error('Commande ' + id + ' introuvable.');
  if (!hasEcotrackParcel_(o0)) throw new Error('Cette commande n’a pas de colis Ecotrack.');
  if ([STATUS.SHIPPED, STATUS.IN_DELIVERY, STATUS.RETURNED].indexOf(o0.status) < 0) throw new Error('Ce colis n’est plus en cours de livraison.');
  var tracking = String(o0.tracking).trim();
  var info = ecotrackStatusInfo_(o0.carrierStatus);
  var returning = !!info && (info.group === 'returning' || info.group === 'returned');
  var now = new Date();

  // 1. Ce qui part chez Ecotrack (avant d'écrire quoi que ce soit).
  var when = null;
  var text = '';
  var remark = '';
  if (result === 'postpone') {
    when = toDate_(data.when);
    if (!when || when.getTime() <= now.getTime()) throw new Error('Choisissez un jour et une heure à venir.');
    var extra = String(data.note || '').replace(/\s+/g, ' ').trim();
    remark = 'client disponible le ' + shortDate_(when) + ' à partir de ' + Utilities.formatDate(when, 'Africa/Algiers', 'HH:mm').replace(':', 'h') +
      (extra ? ' · ' + extra : '') + '. Merci de relivrer.';
  } else if (result === 'address') {
    text = String(data.text || '').replace(/\s+/g, ' ').trim();
    if (text.length < 4) throw new Error('Écrivez la nouvelle adresse ou le nouveau numéro.');
    remark = text;
  }
  if (remark) {
    var sent = sendCourierRemark_(tracking, remark);
    if (!sent.ok) throw new Error(sent.message);
  }
  var returnProblem = '';
  if (result === 'return' || (result === 'refused' && !returning)) {
    var asked = askReturn_(tracking);
    if (!asked.ok && result === 'return') throw new Error(asked.message);
    if (!asked.ok) returnProblem = asked.message;
  }

  // 2. Classeur.
  return withLock_(function () {
    var ctx = readOrders_();
    ['followNext', 'followCalls'].forEach(function (k) { ensureOrderColumn_(ctx, k); });
    var o = findOrder_(ctx, id);
    if (!o || String(o.tracking).trim() !== tracking) throw new Error('La commande a changé entre-temps : rechargez la page.');
    var f = { followUp: now, followNext: '', followCalls: '' };
    var message = '';
    if (result === 'informed') {
      log_(user, o.id, 'Suivi : client prévenu', 'Colis ' + tracking);
      message = 'Noté : le client est prévenu.';
    } else if (result === 'postpone') {
      f.followNext = when;
      log_(user, o.id, 'Suivi : livraison reportée', 'Au livreur : ' + remark);
      message = 'Remarque envoyée au livreur. L’alerte reviendra le ' + shortDate_(when) + ' si le colis n’est pas livré.';
    } else if (result === 'address') {
      var line = '[' + shortDate_(now) + '] Au livreur : ' + text;
      f.notes = String(o.notes || '').trim() ? String(o.notes).trim() + '\n' + line : line;
      log_(user, o.id, 'Suivi : information au livreur', text);
      message = 'Information envoyée au livreur.';
    } else if (result === 'refused') {
      flagClient_(ctx, o, 'A refusé un colis (' + o.id + ', ' + Utilities.formatDate(now, 'Africa/Algiers', 'dd/MM/yyyy') + ')');
      log_(user, o.id, 'Suivi : refus du client', returning ? 'Colis déjà en retour · client signalé'
        : (returnProblem ? 'Demande de retour refusée par Ecotrack · client signalé' : 'Retour demandé à Ecotrack · client signalé'));
      message = returning ? 'Le client est signalé « a refusé un colis ».'
        : returnProblem ? returnProblem + ' Le client est quand même signalé « a refusé un colis ».'
        : 'Retour demandé à Ecotrack. Le client est signalé « a refusé un colis ».';
    } else if (result === 'return') {
      log_(user, o.id, 'Suivi : retour demandé', 'Client injoignable · ' + plural_(Math.round(toNumber_(o.followCalls)) || 0, 'appel', 'appels') + ' sans réponse');
      message = 'Retour demandé à Ecotrack (la société de livraison peut l’ignorer).';
    } else if (result === 'no_answer') {
      var n = (Math.round(toNumber_(o.followCalls)) || 0) + 1;
      f.followCalls = n;
      if (n < FOLLOW.MAX_CALLS) {
        f.followNext = new Date(now.getTime() + settings.DELAI_RAPPEL_MINUTES * 60000);
        message = 'Pas de réponse (' + n + '/' + FOLLOW.MAX_CALLS + ') : rappel dans ' + durationText_(settings.DELAI_RAPPEL_MINUTES * 60000) + '.';
      } else {
        f.followUp = ''; // l'alerte reste affichée, avec la proposition de retour
        message = n + ' appels sans réponse : demandez le retour, ou laissez le livreur réessayer.';
      }
      var enRoute = o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY;
      if (n === 1 && enRoute) {
        noteSmsEvent_(o, 'noanswer');
        if (String(settings.SMS_SANS_REPONSE_LIVRAISON || '').trim() && smsConfig_().configured && !smsAlreadySent_(o, SMS_EVENTS_.noanswer.name)) {
          message += ' Un SMS part au client.';
        }
      }
      log_(user, o.id, 'Suivi : pas de réponse', n + '/' + FOLLOW.MAX_CALLS);
    }
    writeFields_(ctx, o, f);
    return { id: o.id, result: result, message: message, counts: countsData_(ctx, settings) };
  });
}
