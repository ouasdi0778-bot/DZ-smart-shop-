/**
 * Admin.gs : page Administration (administrateur seulement), à la place du
 * menu du classeur : connexions (Ecotrack, SMS, Shopify, Releasit), réglages
 * en formulaires, équipe (avec partage du classeur), clients (liste noire,
 * signalés), entretien du classeur, état de l'outil.
 *
 * Les clés et jetons ne sont jamais renvoyés à la page : seulement leur fin
 * (« ••••1234 »). Chaque changement est noté dans le Journal, sans la clé.
 *
 * Les pages lourdes (Stock, Bénéfices, Statistiques, Administration) sont
 * envoyées au navigateur seulement quand on les ouvre (api_pageScript).
 */

var ROLES_ = ['Administrateur', 'Confirmatrice', 'Magasinier'];

/** Groupes de réglages, dans l'ordre de la page. Les réglages non listés vont dans « Autres ». */
var SETTING_GROUPS_ = [
  { title: 'Boutique', keys: ['NOM_BOUTIQUE', 'SOCIETE_PAR_DEFAUT', 'MESSAGE_WHATSAPP'] },
  { title: 'Appels et confirmation', keys: ['APPELS_PAR_JOUR', 'JOURS_D_APPELS', 'ANNULATION_AUTO', 'HEURE_DEBUT_APPELS', 'ORDRE_FILE', 'DELAI_RAPPEL_MINUTES', 'DOUBLON_HEURES', 'MOTIFS_ANNULATION'] },
  { title: 'Suivi des colis', keys: ['SUIVI_ALERTE_HEURES', 'SUIVI_HEURES_TRI', 'SUIVI_HEURES_ROUTE', 'SUIVI_HEURES_SUD', 'SUIVI_HEURES_LIVRAISON', 'WILAYAS_SUD', 'RETOUR_BLOQUE_JOURS', 'ARGENT_RETARD_JOURS', 'MOTS_INJOIGNABLE', 'MOTS_REFUS', 'MOTS_REPORTE', 'MOTS_ADRESSE'] },
  { title: 'Expédition', keys: ['FORMAT_BORDEREAU', 'RAMASSAGE'] },
  { title: 'SMS', keys: ['SMS_HEURES'], prefix: 'SMS_' },
  { title: 'Stock', keys: ['COUT_MOYEN', 'STOCK_SEUIL'] },
  { title: 'Bénéfices et primes', keys: ['FRAIS_RETOUR', 'COUT_EMBALLAGE', 'TAUX_DOLLAR', 'CATEGORIES_DEPENSES', 'PRIMES'] },
  { title: 'Shopify', keys: ['SHOPIFY_TAG', 'SHOPIFY_JOURS_INITIAL', 'SHOPIFY_API_VERSION'] },
  { title: 'Entretien', keys: ['ARCHIVE_JOURS', 'JOURNAL_JOURS', 'LIMITE_MINUTES_JOUR'] }
];

/** Réglages à choix (fonction : CARRIERS est défini dans un autre fichier). */
function settingChoices_(key) {
  var map = { ORDRE_FILE: ['récentes', 'anciennes'], FORMAT_BORDEREAU: ['A4', '10x15'], SOCIETE_PAR_DEFAUT: CARRIERS };
  return map[key] || null;
}
var LONG_SETTINGS_ = ['MESSAGE_WHATSAPP', 'MOTIFS_ANNULATION', 'MOTS_INJOIGNABLE', 'MOTS_REFUS', 'MOTS_REPORTE', 'MOTS_ADRESSE', 'CATEGORIES_DEPENSES', 'WILAYAS_SUD', 'PRIMES'];

function settingType_(key, def) {
  if (settingChoices_(key)) return 'choice';
  if (/^SMS_/.test(key) && key !== 'SMS_HEURES') return 'sms';
  if (LONG_SETTINGS_.indexOf(key) >= 0) return 'long';
  if (typeof def === 'number') return 'num';
  if (def === 'OUI' || def === 'NON') return 'yesno';
  return 'text';
}

/** Fin d'une clé, pour la reconnaître sans la montrer. */
function maskSecret_(v) {
  var s = String(v || '');
  return s ? '••••' + s.slice(-4) : '';
}

function adminLog_(user, action, detail) {
  withLogBatch_(function () { log_(user, '', action, detail || ''); });
}

/* ------------------------------------------------------------------ */
/* Pages chargées à la demande                                        */
/* ------------------------------------------------------------------ */

var LAZY_PAGES_ = {
  stock: { file: 'PageStock', access: 'stock' },
  benefices: { file: 'PageProfit', access: 'admin' },
  stats: { file: 'PageStats', access: 'admin' },
  admin: { file: 'PageAdmin', access: 'admin' }
};

/** Code d'une page lourde, envoyé seulement quand on l'ouvre (et seulement si on y a droit). */
function api_pageScript(name) {
  var page = LAZY_PAGES_[name];
  if (!page) throw new Error('Page inconnue.');
  if (page.access === 'admin') requireAdmin_(); else requireStockAccess_();
  return include(page.file);
}

/* ------------------------------------------------------------------ */
/* Connexions                                                         */
/* ------------------------------------------------------------------ */

function connectionsData_() {
  var p = PropertiesService.getScriptProperties();
  var eco = ecotrackConfig_();
  var sms = smsConfig_();
  var shop = shopifyConfig_();
  var smsInfo = smsStatus_();
  var rel = { found: false, missing: [] };
  try { rel = releasitColumnsReport_(); } catch (e) { rel = { found: false, missing: [] }; }
  return {
    ecotrack: {
      configured: eco.configured, url: eco.url, token: maskSecret_(eco.token),
      lastSync: String(p.getProperty(ECO.PROP_LAST_SYNC) || ''), lastError: String(p.getProperty(ECO.PROP_LAST_ERROR) || '')
    },
    sms: {
      configured: sms.configured, from: smsInfo.from, key: maskSecret_(sms.key), hours: smsInfo.hours, waiting: smsInfo.waiting,
      lastRun: smsInfo.lastRun, lastError: smsInfo.lastError, statuses: smsInfo.statuses
    },
    shopify: {
      configured: shop.configured, shop: shop.shop, mode: shop.configured ? shop.mode : '',
      key: maskSecret_(shop.token || shop.clientId),
      lastRun: String(p.getProperty(SHOP.PROP_LAST_RUN) || ''), lastError: String(p.getProperty(SHOP.PROP_LAST_ERROR) || '')
    },
    releasit: {
      found: rel.found, missing: rel.missing || [],
      lastRun: String(p.getProperty(RELEASIT.PROP_LAST_RUN) || ''), lastError: String(p.getProperty(RELEASIT.PROP_LAST_ERROR) || '')
    }
  };
}

/** Page Administration : tout ce qu'il faut pour la première vue (état et connexions). */
function api_adminOverview() {
  requireAdmin_();
  return { health: healthData_(), connections: connectionsData_(), version: APP_VERSION };
}

/** Ecotrack : adresse et jeton (jeton vide = garder l'actuel), puis test. */
function api_saveEcotrack(url, token) {
  var user = requireAdmin_();
  var cur = ecotrackConfig_();
  var t = String(token || '').trim() || cur.token;
  if (!t) throw new Error('Collez le jeton API de votre compte Ecotrack.');
  saveEcotrackConfig_(url || cur.url, t);
  adminLog_(user, 'Connexion Ecotrack enregistrée', normalizeEcotrackUrl_(url || cur.url) + (String(token || '').trim() ? ' · nouveau jeton' : ''));
  var res = { saved: true, ok: true, message: '' };
  try {
    var r = ecotrackTest_();
    res.message = 'Enregistré. Connexion réussie : jeton valide, ' + r.wilayas + ' wilayas desservies.';
  } catch (e) {
    res.ok = false;
    res.message = 'Enregistré, mais le test échoue : ' + (e && e.message ? e.message : e);
  }
  res.connections = connectionsData_();
  return res;
}

/** SMS : clé httpSMS (vide = garder l'actuelle) et numéro de la carte SIM. */
function api_saveSms(key, from) {
  var user = requireAdmin_();
  var cur = smsConfig_();
  var k = String(key || '').trim() || cur.key;
  if (!k) throw new Error('Collez la clé API de la page Settings de httpsms.com.');
  var r = saveSmsConfig_(k, from || ('0' + String(cur.from || '').replace(/^\+213/, '')));
  adminLog_(user, 'SMS enregistrés', 'Numéro ' + r.from + (String(key || '').trim() ? ' · nouvelle clé' : ''));
  return { saved: true, message: 'Enregistré : les SMS partiront du ' + r.from + '.', connections: connectionsData_() };
}

/** Shopify : boutique et accès (jeton shpat_, ou identifiant client + secret). */
function api_saveShopify(shop, key, secret) {
  var user = requireAdmin_();
  var cur = shopifyConfig_();
  var k = String(key || '').trim();
  if (!k) {
    if (!cur.configured) throw new Error('Collez le jeton d’accès Shopify (shpat_…) ou l’identifiant client.');
    k = cur.mode === 'token' ? cur.token : cur.clientId;
    if (!String(secret || '').trim() && cur.mode === 'client') secret = cur.clientSecret;
  }
  saveShopifyConfig_(shop || cur.shop, k, secret || '');
  adminLog_(user, 'Connexion Shopify enregistrée', normalizeShopifyDomain_(shop || cur.shop));
  var res = { saved: true, ok: true, message: '' };
  try {
    res.message = 'Enregistré. ' + api_shopifyTest().message;
  } catch (e) {
    res.ok = false;
    res.message = 'Enregistré, mais le test échoue : ' + (e && e.message ? e.message : e);
  }
  res.connections = connectionsData_();
  return res;
}

/* ------------------------------------------------------------------ */
/* Réglages                                                           */
/* ------------------------------------------------------------------ */

/** Valeurs brutes de l'onglet Paramètres : { clé: { row, value } }. */
function readSettingRows_() {
  var sh = sheet_(SHEET.SETTINGS);
  var out = {};
  if (sh.getLastRow() < 2) return { sh: sh, rows: out };
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r, i) {
    var k = String(r[0]).trim();
    if (k) out[k] = { row: i + 2, value: r[1] };
  });
  return { sh: sh, rows: out };
}

function api_settingsGet() {
  requireAdmin_();
  var raw = readSettingRows_().rows;
  var defaults = {};
  DEFAULT_SETTINGS.forEach(function (d) { defaults[d[0]] = d; });
  var used = {};
  var item = function (key) {
    var d = defaults[key];
    if (!d) return null;
    used[key] = true;
    var v = raw[key] ? raw[key].value : d[1];
    return {
      key: key, value: v instanceof Date ? iso_(v) : String(v == null ? '' : v), description: d[2],
      type: settingType_(key, d[1]), choices: settingChoices_(key)
    };
  };
  var groups = SETTING_GROUPS_.map(function (g) {
    var keys = g.keys.slice();
    if (g.prefix) DEFAULT_SETTINGS.forEach(function (d) { if (d[0].indexOf(g.prefix) === 0 && keys.indexOf(d[0]) < 0) keys.push(d[0]); });
    return { title: g.title, items: keys.map(item).filter(function (x) { return x; }) };
  });
  var others = DEFAULT_SETTINGS.filter(function (d) { return !used[d[0]]; }).map(function (d) { return item(d[0]); });
  if (others.length) groups.push({ title: 'Autres', items: others });
  return { groups: groups };
}

/** Vérifie une valeur ; renvoie la valeur à écrire, ou lève une erreur claire. */
function checkSetting_(key, value, def) {
  var type = settingType_(key, def);
  var v = String(value == null ? '' : value).trim();
  if (type === 'num') {
    if (v === '') return def;
    var n = toNumber_(v);
    if (!(n >= 0) || !/\d/.test(v)) throw new Error(key + ' : nombre attendu.');
    return n;
  }
  if (type === 'yesno') return /^(non|no|false|faux|0)$/i.test(v) ? 'NON' : 'OUI';
  if (type === 'choice') {
    if (settingChoices_(key).indexOf(v) < 0) throw new Error(key + ' : choisissez ' + settingChoices_(key).join(' ou ') + '.');
    return v;
  }
  var max = type === 'sms' ? 600 : type === 'long' ? 2000 : 300;
  if (v.length > max) throw new Error(key + ' : texte trop long (' + max + ' caractères au plus).');
  return String(value == null ? '' : value).replace(/\r/g, '');
}

/** Écrit des réglages dans l'onglet Paramètres (ajoute la ligne si elle manque). */
function writeSettings_(changes, user) {
  var keys = Object.keys(changes);
  if (!keys.length) return 0;
  withLock_(function () {
    var info = readSettingRows_();
    keys.forEach(function (k) {
      if (info.rows[k]) {
        info.sh.getRange(info.rows[k].row, 2).setValue(changes[k]);
      } else {
        var d = DEFAULT_SETTINGS.filter(function (x) { return x[0] === k; })[0];
        var row = info.sh.getLastRow() + 1;
        ensureRows_(info.sh, row);
        info.sh.getRange(row, 1, 1, 3).setValues([[k, changes[k], d ? d[2] : '']]);
        info.rows[k] = { row: row, value: changes[k] };
      }
      log_(user, '', 'Réglage modifié', k + (/^SMS_/.test(k) ? '' : ' = ' + String(changes[k]).slice(0, 80)));
    });
    clearConfigCache_(configKeysFor_(SHEET.SETTINGS));
  });
  return keys.length;
}

function api_settingsSave(changes) {
  var user = requireAdmin_();
  var defaults = {};
  DEFAULT_SETTINGS.forEach(function (d) { defaults[d[0]] = d[1]; });
  var clean = {};
  Object.keys(changes || {}).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(defaults, k)) throw new Error('Réglage inconnu : ' + k);
    clean[k] = checkSetting_(k, changes[k], defaults[k]);
  });
  var n = writeSettings_(clean, user);
  return { message: n ? plural_(n, 'réglage enregistré', 'réglages enregistrés') + '.' : 'Rien à enregistrer.', settings: api_settingsGet() };
}

/** Aperçu d'un texte de SMS avec une commande d'exemple. */
function api_smsPreview(text) {
  requireAdmin_();
  var sample = { client: 'Amine Kaci', id: '#1234', product: 'Montre sport — Noire', total: 4250, tracking: 'ECN123456789', commune: 'Béjaïa', wilaya: '06 - Béjaïa' };
  var out = fillSmsTemplate_(String(text || ''), sample, getSettings_());
  var arabic = /[؀-ۿ]/.test(out);
  var per = arabic ? 70 : 160;
  return { text: out, length: out.length, parts: out.length ? Math.ceil(out.length / per) : 0, perPart: per };
}

/* ------------------------------------------------------------------ */
/* Équipe                                                             */
/* ------------------------------------------------------------------ */

function teamRows_() {
  var sh = sheet_(SHEET.TEAM);
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues() : [];
  return { sh: sh, rows: rows };
}

function api_teamList() {
  requireAdmin_();
  var editors = {};
  var ss = ss_();
  try { ss.getEditors().forEach(function (u) { editors[String(u.getEmail()).toLowerCase()] = true; }); } catch (e) { editors = null; }
  var owner = ownerEmail_();
  return {
    roles: ROLES_,
    owner: owner,
    me: String(currentUser_().email || '').toLowerCase(),
    members: teamRows_().rows.filter(function (r) { return String(r[0]).trim(); }).map(function (r) {
      var email = String(r[0]).trim().toLowerCase();
      return { email: email, name: String(r[1] || '').trim(), role: String(r[2] || '').trim() || 'Confirmatrice', access: editors ? !!editors[email] : null };
    })
  };
}

/** Ajoute ou modifie une personne, et lui partage le classeur (sinon elle ne peut pas ouvrir l'application). */
function api_teamSave(member) {
  var user = requireAdmin_();
  member = member || {};
  var email = String(member.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  var role = ROLES_.indexOf(member.role) >= 0 ? member.role : 'Confirmatrice';
  var name = String(member.name || '').trim() || email.split('@')[0];
  var me = String(currentUser_().email || '').toLowerCase();
  if (email === me && role !== 'Administrateur') throw new Error('Vous ne pouvez pas retirer votre propre rôle d’administrateur.');
  var created = false;
  withLock_(function () {
    var t = teamRows_();
    var row = 0;
    t.rows.forEach(function (r, i) { if (String(r[0]).trim().toLowerCase() === email) row = i + 2; });
    if (!row) { row = t.sh.getLastRow() + 1; ensureRows_(t.sh, row); created = true; }
    t.sh.getRange(row, 1, 1, 3).setValues([[email, name, role]]);
    clearConfigCache_(configKeysFor_(SHEET.TEAM));
    log_(user, '', created ? 'Équipe : ajout' : 'Équipe : modification', name + ' · ' + role);
  });
  var shared = '';
  try {
    var already = ss_().getEditors().some(function (u) { return String(u.getEmail()).toLowerCase() === email; });
    if (!already) { ss_().addEditor(email); shared = ' Le classeur lui est partagé : elle reçoit un e-mail de Google.'; }
  } catch (e) {
    shared = ' Attention : le partage automatique a échoué (' + (e && e.message ? e.message : e) + ') : partagez le classeur avec ' + email + ' à la main.';
  }
  return { message: (created ? name + ' ajouté(e) comme ' + role.toLowerCase() + '.' : name + ' : ' + role.toLowerCase() + '.') + shared, team: api_teamList() };
}

/** Retire une personne de l'équipe, et son accès au classeur. */
function api_teamRemove(email) {
  var user = requireAdmin_();
  email = String(email || '').trim().toLowerCase();
  var me = String(currentUser_().email || '').toLowerCase();
  var owner = String(ownerEmail_() || '').toLowerCase();
  if (email === me) throw new Error('Vous ne pouvez pas vous retirer vous-même.');
  if (email === owner) throw new Error('Le propriétaire du classeur ne peut pas être retiré.');
  var found = false;
  withLock_(function () {
    var t = teamRows_();
    for (var i = t.rows.length - 1; i >= 0; i--) {
      if (String(t.rows[i][0]).trim().toLowerCase() === email) { t.sh.deleteRow(i + 2); found = true; }
    }
    clearConfigCache_(configKeysFor_(SHEET.TEAM));
    if (found) log_(user, '', 'Équipe : retrait', email);
  });
  if (!found) throw new Error('Personne introuvable dans l’équipe.');
  var access = '';
  try { ss_().removeEditor(email); access = ' Son accès au classeur est retiré.'; } catch (e) { access = ' Retirez aussi son accès au classeur à la main (bouton Partager).'; }
  return { message: email + ' retiré(e) de l’équipe.' + access, team: api_teamList() };
}

/* ------------------------------------------------------------------ */
/* Clients : liste noire et signalés                                  */
/* ------------------------------------------------------------------ */

function api_clientsAdmin() {
  requireAdmin_();
  var sh = sheet_(SHEET.CLIENTS);
  var out = { blacklist: [], flagged: [] };
  if (sh.getLastRow() < 2) return out;
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(normalizeText_);
  var col = function (t) { return header.indexOf(normalizeText_(t)); };
  var cPhone = col('Téléphone');
  var cName = col('Nom');
  var cBlack = col('Liste noire');
  var cNote = col('Note');
  var cFlag = col('Signalé');
  sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues().forEach(function (r) {
    var phone = normalizePhone(r[cPhone < 0 ? 0 : cPhone]).phone || String(r[cPhone < 0 ? 0 : cPhone]);
    if (!phone) return;
    var name = cName >= 0 ? String(r[cName] || '') : '';
    var b = cBlack >= 0 ? r[cBlack] : false;
    if (b === true || /^(vrai|true|oui)$/i.test(String(b))) out.blacklist.push({ phone: phone, name: name, note: cNote >= 0 ? String(r[cNote] || '') : '' });
    if (cFlag >= 0 && !isBlank_(r[cFlag])) out.flagged.push({ phone: phone, name: name, flag: String(r[cFlag]) });
  });
  return out;
}

/** Retire le signalement « a refusé un colis ». */
function api_clearFlag(phone) {
  var user = requireAdmin_();
  var p = normalizePhone(phone);
  if (!p.valid) throw new Error('Numéro invalide.');
  withLock_(function () {
    var sh = sheet_(SHEET.CLIENTS);
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normalizeText_);
    var cFlag = header.indexOf(normalizeText_('Signalé'));
    var cPhone = Math.max(header.indexOf(normalizeText_('Téléphone')), 0);
    if (cFlag < 0 || sh.getLastRow() < 2) return;
    sh.getRange(2, cPhone + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r, i) {
      if (normalizePhone(r[0]).phone === p.phone) sh.getRange(i + 2, cFlag + 1).setValue('');
    });
    clearConfigCache_(configKeysFor_(SHEET.CLIENTS));
    refreshClientAlerts_(readOrders_(), p.phone);
    log_(user, '', 'Client : signalement retiré', p.phone);
  });
  return { message: 'Signalement retiré pour le ' + p.phone + '.', clients: api_clientsAdmin() };
}

/* ------------------------------------------------------------------ */
/* Classeur                                                           */
/* ------------------------------------------------------------------ */

/** « Réparer le classeur » depuis l'application (les tâches automatiques : seulement par le propriétaire). */
function api_repair() {
  requireAdmin_();
  var owner = PropertiesService.getScriptProperties().getProperty(HEALTH.PROP_OWNER);
  var me = String(currentUser_().email || '').toLowerCase();
  var isOwner = !owner || owner.toLowerCase() === me;
  setupSheets_(isOwner);
  return { message: 'Classeur vérifié et réparé : onglets, colonnes, listes et réglages manquants ajoutés.' +
    (isOwner ? ' Tâches automatiques réinstallées.' : ' (Les tâches automatiques restent au nom du propriétaire.)') };
}

/** « Archiver et alléger maintenant » (et recalcul des statistiques). */
function api_archiveNow() {
  requireAdmin_();
  var r = nightlyMaintenance();
  return { message: r.autoCancelled + ' commande(s) sans réponse annulée(s), ' + r.archived + ' archivée(s), ' + r.journal +
    ' ligne(s) de Journal effacée(s), ' + r.rows + ' ligne(s) vide(s) supprimée(s), statistiques recalculées.' +
    (r.errors.length ? ' Problème : ' + r.errors.join(' · ') : '') };
}

function api_health() {
  requireAdmin_();
  return healthData_();
}
