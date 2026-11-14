/**
 * Labels.gs : bordereaux Ecotrack (impression) et validation de l'expédition.
 *
 * - Les bordereaux sont ceux d'Ecotrack (PDF avec leur code-barres) : le
 *   serveur les télécharge (get/order/label), la page les met en page
 *   (A4, 4 par feuille, ou étiquette 10×15) dans un seul PDF à imprimer.
 * - La colonne « Bordereau imprimé » garde la date, la personne et le n° de
 *   suivi imprimé : si le colis est recréé (nouveau n°), il faut réimprimer.
 * - « Valider l'expédition » (valid/order) expédie les colis chez Ecotrack,
 *   avec ou sans demande de ramassage. Ensuite, Ecotrack ne permet plus de
 *   modifier ni de supprimer le colis.
 */

var LABEL = {
  PER_CALL: 6,        // bordereaux renvoyés par appel (taille de la réponse)
  PARALLEL: 6,        // requêtes envoyées en même temps à Ecotrack
  MAX_VALIDATE: 100,  // colis validés au maximum en une fois
  SEP: ' · '
};

/* ------------------------------------------------------------------ */
/* « Bordereau imprimé »                                              */
/* ------------------------------------------------------------------ */

/** Texte de la colonne : « 14/11/2026 à 10:05 · Sara · ECN123 ». */
function labelMark_(date, user, tracking) {
  return [stamp_(date), String((user && user.name) || 'Utilisateur').replace(/·/g, '-'), String(tracking).trim()].join(LABEL.SEP);
}

/**
 * État du bordereau d'une commande :
 * { printed, reprint, at, by } — reprint = imprimé pour un autre n° de suivi (colis recréé).
 */
function labelState_(o) {
  var raw = String(o.label == null ? '' : o.label).trim();
  if (!raw) return { printed: false, reprint: false, at: '', by: '' };
  var parts = raw.split(LABEL.SEP);
  var tracking = parts.length >= 3 ? parts[parts.length - 1].trim() : '';
  var current = String(o.tracking == null ? '' : o.tracking).trim();
  var same = !tracking || !current || tracking === current;
  return { printed: same, reprint: !same, at: parts[0] || '', by: parts.length >= 3 ? parts.slice(1, -1).join(LABEL.SEP) : (parts[1] || '') };
}

/** Ajoute la colonne si le classeur n'a pas encore été réparé (installation plus ancienne). */
function ensureOrderColumn_(ctx, key) {
  if (ctx.map[key] !== undefined) return;
  var col = ORDER_COLUMNS.filter(function (c) { return c.key === key; })[0];
  var sh = ctx.sheet;
  var at = Math.max(sh.getLastColumn(), ctx.width || 0); // nouvelle colonne = at + 1
  if (at + 1 > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), at + 1 - sh.getMaxColumns());
  sh.getRange(1, at + 1).setValue(col.title).setFontWeight('bold').setBackground(HEADER_BG_[col.kind] || '#EEF0F3');
  ctx.map[key] = at;
  ctx.width = at + 1;
}

/** Colis Ecotrack dont on peut imprimer le bordereau : créé, ou déjà expédié. */
function canPrintLabel_(o) {
  var stage = orderStage_(o);
  return hasEcotrackParcel_(o) && (stage === STAGE.PARCEL || stage === STAGE.SHIPPING);
}

/* ------------------------------------------------------------------ */
/* Téléchargement des bordereaux                                      */
/* ------------------------------------------------------------------ */

function headerOf_(resp, name) {
  try {
    var headers = resp.getAllHeaders() || {};
    var keys = Object.keys(headers);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === name) return String(headers[keys[i]]);
    }
  } catch (e) { /* pas d'en-têtes */ }
  return '';
}

function isPdfBytes_(bytes) {
  return !!bytes && bytes.length > 4 && bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70; // %PDF
}

/** Une adresse de fichier dans une réponse JSON d'Ecotrack ({ url }, { label }, { data: { url } }…). */
function labelUrlIn_(json) {
  if (!json || typeof json !== 'object') return '';
  var keys = ['url', 'label', 'link', 'file', 'pdf', 'path', 'data'];
  for (var i = 0; i < keys.length; i++) {
    var v = json[keys[i]];
    if (typeof v === 'string' && /^https:\/\//i.test(v.trim())) return v.trim();
    if (v && typeof v === 'object') {
      var inner = labelUrlIn_(v);
      if (inner) return inner;
    }
  }
  return '';
}

/**
 * Lit une réponse : { pdf } (octets), { next } (fichier à télécharger ailleurs,
 * sans le jeton) ou { error }.
 */
function readLabelResponse_(resp) {
  var code = resp.getResponseCode();
  if (code >= 300 && code < 400) {
    var location = headerOf_(resp, 'location');
    return /^https:\/\//i.test(location) ? { next: location } : { error: 'Ecotrack a renvoyé une adresse de bordereau invalide.' };
  }
  var bytes = null;
  try { bytes = resp.getContent(); } catch (e) { bytes = null; }
  if (code >= 200 && code < 300 && isPdfBytes_(bytes)) return { pdf: bytes };
  var text = '';
  try { text = resp.getContentText() || ''; } catch (e) { text = ''; }
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  if (code === 404) return { error: 'Bordereau introuvable chez Ecotrack (colis supprimé ?).' };
  if (code < 200 || code >= 300) return { error: ecotrackFail_({ code: code, json: json }).message };
  var url = labelUrlIn_(json);
  if (url) return { next: url };
  var detail = json ? (flattenEcotrackErrors_(json.errors || json.error) || String(json.message || '')) : '';
  return { error: 'Ecotrack n’a pas renvoyé de PDF' + (detail ? ' : ' + detail : '.') };
}

/**
 * Envoie des requêtes par paquets (en parallèle), avec une nouvelle tentative
 * pour celles refusées par la limite de débit (erreur 429).
 * Renvoie une réponse (ou une erreur) par requête.
 */
function fetchAllSafe_(requests) {
  var out = [];
  for (var i = 0; i < requests.length; i += LABEL.PARALLEL) {
    var chunk = requests.slice(i, i + LABEL.PARALLEL);
    var resps;
    try {
      resps = UrlFetchApp.fetchAll(chunk);
    } catch (e) {
      // Une requête injoignable fait échouer tout le paquet : on les refait une par une.
      resps = chunk.map(function (req) {
        try { return UrlFetchApp.fetch(req.url, req); } catch (err) { return { error: err }; }
      });
    }
    resps.forEach(function (resp, k) {
      if (resp && !resp.error && resp.getResponseCode() === 429) {
        Utilities.sleep(retryAfterMs_(resp));
        try { resp = UrlFetchApp.fetch(chunk[k].url, chunk[k]); } catch (err) { resp = { error: err }; }
      }
      out.push(resp);
    });
  }
  return out;
}

function ecotrackRequest_(method, path, query) {
  var cfg = ecotrackConfig_();
  return {
    url: cfg.url + path + ecotrackQuery_(query),
    method: method,
    muteHttpExceptions: true,
    followRedirects: false, // le jeton ne suit jamais une redirection
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/pdf, application/json' }
  };
}

/**
 * Bordereaux de quelques commandes (6 au plus par appel : la page appelle
 * plusieurs fois). Renvoie [{ id, tracking, client, ok, pdf (base64), message }].
 */
function api_labelFiles(rawIds) {
  currentUser_();
  var ids = uniqueIds_(rawIds);
  if (!ids.length) throw new Error('Aucun colis sélectionné.');
  if (ids.length > LABEL.PER_CALL) throw new Error('Trop de bordereaux demandés à la fois (' + LABEL.PER_CALL + ' au plus).');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);

  var ctx = readOrders_();
  var results = [];
  var asked = [];
  ids.forEach(function (id) {
    var o = findOrder_(ctx, id);
    var r = { id: id, tracking: o ? String(o.tracking).trim() : '', client: o ? String(o.client) : '', ok: false, pdf: '', message: '' };
    results.push(r);
    if (!o) r.message = 'Commande introuvable.';
    else if (!canPrintLabel_(o)) r.message = hasEcotrackParcel_(o) ? 'Colis terminé : plus de bordereau à imprimer.' : 'Pas encore de colis chez Ecotrack : envoyez d’abord la commande à Ecotrack.';
    else asked.push(r);
  });
  if (!asked.length) return results;

  // 1. Ecotrack (avec le jeton).
  var first = fetchAllSafe_(asked.map(function (r) { return ecotrackRequest_('get', '/api/v1/get/order/label', { tracking: r.tracking }); }));
  var follow = [];
  asked.forEach(function (r, i) {
    var resp = first[i];
    if (!resp || resp.error) { r.message = 'Impossible de joindre Ecotrack. Réessayez.'; return; }
    var got = readLabelResponse_(resp);
    if (got.pdf) { r.ok = true; r.pdf = Utilities.base64Encode(got.pdf); }
    else if (got.next) follow.push({ r: r, url: got.next });
    else r.message = got.error;
  });

  // 2. Fichier rangé ailleurs (ex. storage.ecotrack.dz) : téléchargé sans le jeton.
  if (follow.length) {
    var second = fetchAllSafe_(follow.map(function (f) {
      return { url: f.url, method: 'get', muteHttpExceptions: true, followRedirects: true };
    }));
    follow.forEach(function (f, i) {
      var resp = second[i];
      if (!resp || resp.error) { f.r.message = 'Impossible de télécharger le bordereau. Réessayez.'; return; }
      var bytes = null;
      try { bytes = resp.getContent(); } catch (e) { bytes = null; }
      if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300 && isPdfBytes_(bytes)) {
        f.r.ok = true;
        f.r.pdf = Utilities.base64Encode(bytes);
      } else {
        f.r.message = 'Le bordereau téléchargé n’est pas un PDF (erreur ' + resp.getResponseCode() + ').';
      }
    });
  }
  return results;
}

/** Note « Bordereau imprimé » sur les commandes : items = [{ id, tracking }]. */
function api_markLabelsPrinted(items) {
  var user = currentUser_();
  var list = (items || []).filter(function (it) { return it && it.id; }).slice(0, 500);
  if (!list.length) return { marked: 0, labels: {} };
  return withLock_(function () {
    var ctx = readOrders_();
    ensureOrderColumn_(ctx, 'label');
    var now = new Date();
    var labels = {};
    var marked = 0;
    list.forEach(function (it) {
      var o = findOrder_(ctx, String(it.id));
      var tracking = String(it.tracking || '').trim();
      if (!o || !tracking || String(o.tracking).trim() !== tracking) return;
      var before = labelState_(o);
      writeFields_(ctx, o, { label: labelMark_(now, user, tracking) });
      log_(user, o.id, before.printed ? 'Bordereau réimprimé' : 'Bordereau imprimé', 'Suivi ' + tracking);
      labels[o.id] = labelState_(o);
      marked++;
    });
    return { marked: marked, labels: labels };
  });
}

function uniqueIds_(rawIds) {
  var ids = [];
  (rawIds || []).forEach(function (id) {
    id = String(id == null ? '' : id).trim();
    if (id && ids.indexOf(id) < 0) ids.push(id);
  });
  return ids;
}

/* ------------------------------------------------------------------ */
/* Validation de l'expédition                                         */
/* ------------------------------------------------------------------ */

/** Réponse de valid/order : '' si c'est bon, sinon le motif du refus. */
function validateRefusal_(resp) {
  if (!resp || resp.error) return null; // injoignable : résultat incertain
  var code = resp.getResponseCode();
  var text = '';
  try { text = resp.getContentText() || ''; } catch (e) { text = ''; }
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  if (code < 200 || code >= 300) {
    var detail = json ? (flattenEcotrackErrors_(json.errors || json.error) || String(json.message || '')) : '';
    return code === 401 || code === 403 || code === 429 || code >= 500 ? ecotrackFail_({ code: code, json: json }).message
      : 'Refusé par Ecotrack (erreur ' + code + ')' + (detail ? ' : ' + detail : '.');
  }
  if (json && (json.success === false || json.error)) {
    var why = flattenEcotrackErrors_(json.error || json.errors) || String(json.message || '');
    return 'Refusé par Ecotrack' + (why ? ' : ' + why : '.');
  }
  return '';
}

/**
 * Valide l'expédition de colis créés (valid/order), avec ou sans demande de
 * ramassage. Réservé à l'administrateur et au magasinier : c'est définitif.
 * Renvoie { results: [{ id, client, tracking, ok, message }], counts }.
 */
function api_validateParcels(rawIds, pickup) {
  var user = requireStockAccess_();
  var ids = uniqueIds_(rawIds);
  if (!ids.length) throw new Error('Aucun colis sélectionné.');
  if (ids.length > LABEL.MAX_VALIDATE) throw new Error('Validez ' + LABEL.MAX_VALIDATE + ' colis au maximum à la fois.');
  if (!ecotrackConfig_().configured) throw new Error(ECO_NOT_CONFIGURED_);
  var ask = pickup ? 1 : 0;
  var cache = CacheService.getScriptCache();
  var results = {};
  var queue = [];

  // 1. Vérifications, et « réservation » pour éviter une double validation.
  withLock_(function () {
    var ctx = readOrders_();
    ids.forEach(function (id) {
      var o = findOrder_(ctx, id);
      var r = { id: id, client: o ? String(o.client) : '', tracking: o ? String(o.tracking).trim() : '', ok: false, message: '' };
      results[id] = r;
      if (!o) { r.message = 'Commande introuvable.'; return; }
      if (orderStage_(o) !== STAGE.PARCEL) {
        r.message = orderStage_(o) === STAGE.SHIPPING ? 'Déjà expédiée.' : 'Pas de colis Ecotrack à valider pour cette commande.';
        return;
      }
      if (cache.get('valid:' + id)) { r.message = 'Une validation est déjà en cours pour ce colis.'; return; }
      cache.put('valid:' + id, '1', ECO.CLAIM_SECONDS);
      queue.push(r);
    });
  });

  try {
    // 2. Validation chez Ecotrack (le classeur n'est pas bloqué pendant l'attente).
    var resps = fetchAllSafe_(queue.map(function (r) {
      return ecotrackRequest_('post', '/api/v1/valid/order', { tracking: r.tracking, ask_collection: ask });
    }));
    var unsure = [];
    queue.forEach(function (r, i) {
      var refusal = validateRefusal_(resps[i]);
      if (refusal === '') r.ok = true;
      else { r.message = refusal || 'Pas de réponse d’Ecotrack.'; unsure.push(r); }
    });

    // 3. Statut réel chez Ecotrack : colis déjà validé sur leur site, ou réponse perdue.
    var statuses = {};
    try {
      statuses = ecotrackStatusLookup_(queue.map(function (r) { return r.tracking; }));
    } catch (e) {
      statuses = {};
    }
    unsure.forEach(function (r) {
      var rec = statuses[r.tracking];
      var info = rec ? ecotrackStatusInfo_(rec.status) : null;
      if (info && ['draft', 'missing', 'unknown', 'cancelled'].indexOf(info.group) < 0) {
        r.ok = true;
        r.message = 'Validé (vérifié chez Ecotrack).';
      }
    });

    // 4. Commandes « Expédiée » : le stock baisse et le SMS « expédiée » part.
    var okList = queue.filter(function (r) { return r.ok; });
    if (okList.length) {
      lockedWithRetry_(function () {
        var ctx = readOrders_();
        var now = new Date();
        okList.forEach(function (r) {
          var o = findOrder_(ctx, r.id);
          if (!o || String(o.tracking).trim() !== r.tracking || o.status !== STATUS.CONFIRMED) return;
          var rec = statuses[r.tracking];
          var raw = rec && rec.status != null ? String(rec.status).trim() : '';
          var info = ecotrackStatusInfo_(raw);
          writeFields_(ctx, o, {
            status: STATUS.SHIPPED,
            carrierStatus: info && info.group !== 'draft' ? raw : '',
            carrierMoved: now,
            updated: now
          });
          log_(user, o.id, 'Expédition validée', 'Suivi ' + r.tracking + (ask ? ' · ramassage demandé' : ' · sans ramassage (dépôt à l’agence)') +
            (labelState_(o).printed ? '' : ' · bordereau non imprimé dans l’outil'));
        });
        applyStockMoves_(ctx);
      });
    }
  } finally {
    queue.forEach(function (r) { cache.remove('valid:' + r.id); });
  }
  var ctxAfter = readOrders_();
  return { results: ids.map(function (id) { return results[id]; }), counts: countsData_(ctxAfter, null) };
}

/** À l'ouverture de « Créés, à valider » : relit chez Ecotrack les colis pas encore validés. */
function api_refreshCreated() {
  var s = syncEcotrackStatuses_({ onlyCreated: true });
  var parts = [];
  if (s.updated) parts.push(plural_(s.updated, 'colis validé chez Ecotrack est passé', 'colis validés chez Ecotrack sont passés') + ' dans Suivi');
  if (s.missing) parts.push(plural_(s.missing, 'colis introuvable', 'colis introuvables') + ' chez Ecotrack');
  return { checked: s.checked, updated: s.updated, missing: s.missing, message: parts.join(' · ') };
}

function plural_(n, one, many) {
  return n + ' ' + (n > 1 ? many : one);
}
