/**
 * Partage des commandes entre les confirmatrices (v1.20).
 *
 * - Chaque commande a une responsable : la colonne « Confirmatrice » (agent). Les commandes à appeler
 *   sont données à tour de rôle aux confirmatrices présentes (réglage PARTAGE = OUI).
 * - Présente : active depuis moins de PARTAGE_ABSENCE_HEURES heures, et pas en pause. Absente (ou en
 *   pause) depuis ce délai : ses commandes à appeler repartent chez les présentes.
 * - Personne de présent (la nuit) : les commandes attendent « à partager ».
 * - Au plus PARTAGE_AVANCE commandes à appeler d'avance par confirmatrice (× sa part, colonne Part de
 *   l'onglet Équipe) : les autres attendent et arrivent au fur et à mesure (personne n'a tout le matin).
 * - Une 2e commande d'un client va chez la confirmatrice de sa 1re, si elle est présente.
 * - L'administrateur voit et reçoit tout. Une commande confirmée ou annulée par lui devient la sienne ;
 *   « pas de réponse » ou « rappeler » la laissent à la confirmatrice.
 * - Expédier et Suivi : cachés aux confirmatrices, sauf si l'administrateur les ouvre (colonnes
 *   Expédier et Suivi de l'onglet Équipe) ; elles n'y voient que leurs commandes.
 */

var PRESENCE_PREFIX_ = 'PRES_';
var PRESENCE_TOUCH_MS_ = 5 * 60000;   // activité notée au plus toutes les 5 minutes
var SHARE_LAST_PROP_ = 'SHARE_LAST';  // dernière confirmatrice servie (tour de rôle)

function yesNo_(v) { return /^(oui|o|yes|y|1|true|vrai|x)$/i.test(String(v == null ? '' : v).trim()); }

/** Rôle Confirmatrice (une personne de l'équipe sans rôle est confirmatrice). */
function isConfirmatrice_(user) {
  if (!user) return false;
  var r = normalizeText_(user.role);
  return /^confirm/.test(r) || (!r && !!user.inTeam);
}

/** Partage à tour de rôle actif (réglage PARTAGE). */
function shareOn_(settings) {
  return !!(settings || getSettings_()).PARTAGE;
}

/** Confirmatrices de l'onglet Équipe : [{ key, name, part, ship, track }]. */
function teamConfirmatrices_() {
  return readTeam_().filter(function (t) {
    return isConfirmatrice_({ role: t[2], inTeam: true }) && String(t[1] || '').trim();
  }).map(teamPerson_);
}

function teamPerson_(t) {
  var part = Math.round(toNumber_(t[4]));
  return { key: t[0], name: String(t[1] || '').trim(), role: t[2], part: part >= 1 && part <= 5 ? part : 1, ship: yesNo_(t[5]), track: yesNo_(t[6]) };
}

/* ---------------- Présence ---------------- */

function presenceOf_(key) {
  var raw = key ? PropertiesService.getScriptProperties().getProperty(PRESENCE_PREFIX_ + key) : '';
  var p = readJsonProp_(raw, null) || {};
  return { seen: toDate_(p.seen), pause: toDate_(p.pause) };
}

function writePresence_(key, p) {
  PropertiesService.getScriptProperties().setProperty(PRESENCE_PREFIX_ + key,
    JSON.stringify({ seen: p.seen ? p.seen.toISOString() : '', pause: p.pause ? p.pause.toISOString() : '' }));
}

/** Activité de la personne connectée (au plus toutes les 5 minutes). */
function touchPresence_(user, force) {
  if (!user || !user.key || !user.inTeam) return;
  var p = presenceOf_(user.key);
  var now = new Date();
  if (!force && p.seen && now.getTime() - p.seen.getTime() < PRESENCE_TOUCH_MS_) return;
  p.seen = now;
  writePresence_(user.key, p);
}

/**
 * État d'une confirmatrice : present (reçoit des commandes), away (absente ou en pause depuis le délai :
 * ses commandes à appeler repartent), pause, seen.
 */
function presenceState_(key, now, settings) {
  var p = presenceOf_(key);
  var delay = (settings || getSettings_()).PARTAGE_ABSENCE_HEURES * 3600000;
  var recent = !!p.seen && now.getTime() - p.seen.getTime() < delay;
  var present = recent && !p.pause;
  var away = !present && (p.pause ? now.getTime() - p.pause.getTime() >= delay : true);
  return { present: present, away: away, pause: p.pause ? p.pause.toISOString() : '', seen: p.seen ? p.seen.toISOString() : '' };
}

/* ---------------- Droits et portée ---------------- */

/** Nom de la confirmatrice dont on ne montre que les commandes dans la file et la liste, sinon null (tout). */
function queueScope_(user, settings) {
  return shareOn_(settings) && isConfirmatrice_(user) ? user.name : null;
}

/** Expédier et Suivi : une confirmatrice n'y voit que ses commandes (null = tout). */
function ownScope_(user) {
  return isConfirmatrice_(user) ? user.name : null;
}

/** Pages Expédier et Suivi ouvertes à cette personne. */
function pageAccess_(user) {
  if (!isConfirmatrice_(user)) return { ship: true, track: true };
  return { ship: !!user.ship, track: !!user.track };
}

function requirePage_(user, page) {
  var a = pageAccess_(user);
  if (page === 'ship' ? a.ship : a.track) return;
  throw new Error('Page ' + (page === 'ship' ? 'Expédier' : 'Suivi') + ' non ouverte pour vous : demandez à l’administrateur (Administration › Équipe).');
}

function isMine_(o, scope) {
  return scope === null || String(o.agent == null ? '' : o.agent).trim() === scope;
}

function requireOwn_(o, user) {
  var scope = ownScope_(user);
  if (o && !isMine_(o, scope)) throw new Error('La commande ' + o.id + ' est suivie par ' + (String(o.agent || '').trim() || 'une autre personne') + '.');
}

/**
 * Responsable après un appel : une confirmatrice prend la commande ; l'administrateur (ou le magasinier)
 * la prend s'il la confirme ou l'annule, sinon elle reste à la confirmatrice. null = pas de changement.
 */
function agentAfterCall_(o, user, outcome, settings) {
  if (!shareOn_(settings) || isConfirmatrice_(user)) return user.name;
  if (outcome === 'confirm' || outcome === 'cancel') return user.name;
  return null;
}

/* ---------------- Partage ---------------- */

/** Commande à appeler maintenant (pas de rappel, ou rappel arrivé à son heure). */
function isDueNow_(o, now) {
  if (QUEUE_STATUSES.indexOf(o.status) < 0) return false;
  var cb = toDate_(o.callback);
  return !cb || cb <= now;
}

/**
 * Donne une responsable aux commandes à appeler qui n'en ont pas (ou dont la confirmatrice est absente).
 * opts.ids : seulement ces commandes (arrivée) ; opts.exclude : nom à ne pas servir (« reprendre ses
 * commandes »). Renvoie { n, to: { nom: nombre } }. À appeler sous le verrou.
 */
function shareOrders_(ctx, opts) {
  opts = opts || {};
  var settings = getSettings_();
  var out = { n: 0, to: {} };
  if (!shareOn_(settings)) return out;
  var team = teamConfirmatrices_();
  if (!team.length) return out;
  var now = new Date();
  var byName = {};
  team.forEach(function (m) {
    m.state = presenceState_(m.key, now, settings);
    m.load = 0;
    byName[m.name] = m;
  });
  var present = team.filter(function (m) { return m.state.present && m.name !== opts.exclude; });
  var cap = settings.PARTAGE_AVANCE;
  var only = null;
  if (opts.ids) { only = {}; opts.ids.forEach(function (id) { only[String(id)] = true; }); }

  // Charge de chaque présente, et confirmatrice de chaque client (une 2e commande va chez elle).
  var phoneOwner = {};
  ctx.orders.forEach(function (o) {
    var a = String(o.agent == null ? '' : o.agent).trim();
    var m = byName[a];
    if (!m) return;
    if (isDueNow_(o, now)) m.load++;
    var ph = normalizePhone(o.phone).phone;
    if (ph && (!phoneOwner[ph] || (toDate_(o.date) || 0) > (toDate_(phoneOwner[ph].date) || 0))) phoneOwner[ph] = { name: a, date: o.date };
  });

  var need = ctx.orders.filter(function (o) {
    if (QUEUE_STATUSES.indexOf(o.status) < 0 || o.archived) return false;
    if (only && !only[String(o.id)]) return false;
    var m = byName[String(o.agent == null ? '' : o.agent).trim()];
    if (!m) return true;                                   // personne, ou pas une confirmatrice
    if (m.name === opts.exclude) return isDueNow_(o, now); // « reprendre ses commandes »
    return m.state.away && isDueNow_(o, now);              // absente depuis le délai
  });
  if (!present.length) return out;
  var recent = settings.ORDRE_FILE !== 'anciennes';
  var queueOrder = function (a, b) {
    var da = toDate_(a.date) ? toDate_(a.date).getTime() : 0;
    var db = toDate_(b.date) ? toDate_(b.date).getTime() : 0;
    return recent ? db - da : da - db;
  };
  need.sort(queueOrder);

  var props = PropertiesService.getScriptProperties();
  var last = String(props.getProperty(SHARE_LAST_PROP_) || '');
  var order = team.map(function (m) { return m.name; });
  var turn = function (m) { // après la dernière servie, dans l'ordre de l'onglet Équipe
    var i = order.indexOf(m.name);
    var j = order.indexOf(last);
    return (i - j - 1 + order.length * 2) % order.length;
  };
  need.forEach(function (o) {
    var ph = normalizePhone(o.phone).phone;
    var owner = ph && phoneOwner[ph] ? byName[phoneOwner[ph].name] : null;
    var pick = owner && owner.state.present && owner.name !== opts.exclude ? owner : null;
    if (!pick) {
      var free = present.filter(function (m) { return !cap || m.load < cap * m.part; });
      free.sort(function (a, b) { return a.load / a.part - b.load / b.part || turn(a) - turn(b); });
      pick = free[0] || null;
    }
    if (!pick) return; // toutes pleines : la commande attend
    if (String(o.agent || '').trim() === pick.name) return;
    writeFields_(ctx, o, { agent: pick.name });
    pick.load++;
    last = pick.name;
    if (ph) phoneOwner[ph] = { name: pick.name, date: o.date };
    out.n++;
    out.to[pick.name] = (out.to[pick.name] || 0) + 1;
  });
  // Une confirmatrice qui arrive reçoit sa part des nouvelles commandes jamais appelées, prises chez celle
  // qui en a le plus, à la fin de sa file (jamais la première : elle est peut-être en train de l'appeler).
  if (!only && present.length > 1) {
    var fresh = {};
    present.forEach(function (m) { fresh[m.name] = []; });
    ctx.orders.forEach(function (o) {
      var a = String(o.agent == null ? '' : o.agent).trim();
      if (fresh[a] && o.status === STATUS.TO_CONFIRM && !(toNumber_(o.attempts) > 0) && isBlank_(o.callback) && !o.archived) fresh[a].push(o);
    });
    present.forEach(function (m) { fresh[m.name].sort(queueOrder); });
    var ratio = function (m) { return fresh[m.name].length / m.part; };
    for (var guard = 0; guard < 500; guard++) {
      var byLoad = present.slice().sort(function (a, b) { return ratio(a) - ratio(b) || turn(a) - turn(b); });
      var lo = byLoad[0];
      var hi = byLoad[byLoad.length - 1];
      var hn = fresh[hi.name].length;
      var ln = fresh[lo.name].length;
      if (hn <= 1 || (hn - 1) / hi.part < (ln + 1) / lo.part) break; // équilibré
      if (cap && lo.load >= cap * lo.part) break;
      var moved = fresh[hi.name].pop();
      writeFields_(ctx, moved, { agent: lo.name });
      fresh[lo.name].push(moved);
      hi.load--;
      lo.load++;
      out.n++;
      out.to[lo.name] = (out.to[lo.name] || 0) + 1;
    }
  }
  if (out.n) {
    props.setProperty(SHARE_LAST_PROP_, last);
    log_({ name: 'Partage' }, '', 'Partage des commandes', Object.keys(out.to).map(function (k) { return k + ' ' + out.to[k]; }).join(' · '));
  }
  return out;
}

/** Tâche de chaque minute (et arrivée d'une confirmatrice) : partage de la file, sous le verrou. */
function shareQueue_() {
  if (!shareOn_()) return { n: 0, to: {} };
  return withLock_(function () { return shareOrders_(readOrders_()); });
}

/** Résumé du partage pour la file : moi (présence) ; pour l'administrateur, l'équipe et « à partager ». */
function shareInfo_(ctx, user, settings) {
  var on = shareOn_(settings);
  var info = { on: on, confirm: isConfirmatrice_(user) };
  if (!on) return info;
  var now = new Date();
  if (info.confirm) {
    var me = presenceState_(user.key, now, settings);
    info.me = { name: user.name, present: me.present, pause: me.pause };
    return info;
  }
  var team = teamConfirmatrices_();
  var names = {};
  team.forEach(function (m) { names[m.name] = m; m.due = 0; });
  var pool = 0;
  ctx.orders.forEach(function (o) {
    if (!isDueNow_(o, now)) return;
    var m = names[String(o.agent == null ? '' : o.agent).trim()];
    if (m) m.due++; else pool++;
  });
  info.pool = pool;
  info.team = team.map(function (m) {
    var s = presenceState_(m.key, now, settings);
    return { name: m.name, present: s.present, pause: s.pause, due: m.due };
  });
  return info;
}

/* ---------------- Actions ---------------- */

/** « En pause » / « Je suis là » (la confirmatrice elle-même). */
function api_presence(pause) {
  cloudGuard_();
  var user = currentUser_();
  if (!user.inTeam) throw new Error('Vous n’êtes pas dans l’onglet Équipe.');
  return withLock_(function () {
    var now = new Date();
    writePresence_(user.key, { seen: now, pause: pause ? now : null });
    log_(user, '', pause ? 'En pause' : 'Présente', '');
    var shared = pause ? { n: 0 } : shareOrders_(readOrders_());
    return { pause: !!pause, shared: shared.n, message: pause ? 'En pause : vous ne recevez plus de nouvelles commandes.' : 'Vous êtes présente : les commandes à appeler arrivent.' };
  });
}

/** Administration › Équipe : mettre une confirmatrice en pause, ou la remettre présente. */
function api_teamPresence(key, pause) {
  cloudGuard_();
  var admin = requireAdmin_();
  var m = teamConfirmatrices_().filter(function (t) { return t.key === String(key || '').trim().toLowerCase(); })[0];
  if (!m) throw new Error('Confirmatrice introuvable dans l’équipe.');
  return withLock_(function () {
    var now = new Date();
    var p = presenceOf_(m.key);
    writePresence_(m.key, { seen: pause ? p.seen : now, pause: pause ? now : null });
    log_(admin, '', pause ? 'Équipe : pause' : 'Équipe : présente', m.name);
    if (!pause) shareOrders_(readOrders_());
    return { message: m.name + (pause ? ' est en pause : elle ne reçoit plus de commandes.' : ' est présente : elle reçoit des commandes.') };
  });
}

/** Administration › Équipe : ses commandes à appeler repartent chez les autres présentes. */
function api_teamReclaim(key) {
  cloudGuard_();
  var admin = requireAdmin_();
  var m = teamConfirmatrices_().filter(function (t) { return t.key === String(key || '').trim().toLowerCase(); })[0];
  if (!m) throw new Error('Confirmatrice introuvable dans l’équipe.');
  return withLock_(function () {
    var ctx = readOrders_();
    var now = new Date();
    var mine = ctx.orders.filter(function (o) { return String(o.agent || '').trim() === m.name && isDueNow_(o, now); });
    var res = shareOrders_(ctx, { exclude: m.name });
    var left = mine.length - res.n;
    log_(admin, '', 'Équipe : commandes reprises', m.name + ' · ' + res.n + ' redonnée(s)');
    return { moved: res.n, message: !mine.length ? m.name + ' n’a pas de commande à appeler.'
      : res.n + ' commande(s) de ' + m.name + ' redonnée(s) aux autres.' + (left > 0 ? ' ' + left + ' restent chez elle (personne d’autre de présent, ou toutes pleines).' : '') };
  });
}

/** Commandes › Liste (administrateur) : attribuer des commandes à une confirmatrice (vide = à partager). */
function api_assignOrders(ids, name) {
  cloudGuard_();
  var admin = requireAdmin_();
  ids = uniqueIds_(ids);
  if (!ids.length) throw new Error('Aucune commande choisie.');
  name = String(name || '').trim();
  if (name && !teamConfirmatrices_().some(function (m) { return m.name === name; })) throw new Error('« ' + name + ' » n’est pas une confirmatrice de l’équipe.');
  return withLock_(function () {
    var ctx = readOrders_();
    var n = 0;
    ids.forEach(function (id) {
      var o = findOrder_(ctx, id);
      if (!o || String(o.agent || '').trim() === name) return;
      writeFields_(ctx, o, { agent: name, updated: new Date() });
      n++;
    });
    log_(admin, ids.join(', '), 'Attribuée', name || 'à partager');
    return { assigned: n, message: n ? n + ' commande(s) ' + (name ? 'attribuée(s) à ' + name : 'remise(s) à partager') + '.' : 'Rien à changer.', counts: countsData_(ctx, null) };
  });
}

/** Loupe « le client rappelle » : une confirmatrice prend une commande à appeler d'une collègue. */
function api_takeOrder(id) {
  cloudGuard_();
  var user = currentUser_();
  return withLock_(function () {
    var ctx = readOrders_();
    var o = findOrder_(ctx, id);
    if (!o) throw new Error('Commande ' + id + ' introuvable.');
    if (!isCallable_(o)) throw new Error('La commande ' + id + ' n’est plus à appeler (statut « ' + o.status + ' »).');
    var before = String(o.agent || '').trim();
    if (before !== user.name) {
      writeFields_(ctx, o, { agent: user.name });
      log_(user, o.id, 'Commande prise', before ? 'à ' + before : 'à partager');
    }
    return { id: String(o.id), agent: user.name, message: 'Commande ' + o.id + ' prise.' };
  });
}

/** Administration › Équipe : part, et pages Expédier / Suivi ouvertes à une confirmatrice. */
function api_teamAccess(key, changes) {
  cloudGuardAll_();
  var admin = requireAdmin_();
  key = String(key || '').trim().toLowerCase();
  changes = changes || {};
  var label = '';
  withLock_(function () {
    var t = teamRows_();
    var row = 0;
    var found = null;
    t.rows.forEach(function (r, i) { if (teamRowKey_(r) === key) { row = i + 2; found = r; } });
    if (!row) throw new Error('Personne introuvable dans l’équipe : rechargez la page.');
    var part = changes.part !== undefined ? Math.min(5, Math.max(1, Math.round(toNumber_(changes.part)) || 1)) : (toNumber_(found[4]) || 1);
    var ship = changes.ship !== undefined ? !!changes.ship : yesNo_(found[5]);
    var track = changes.track !== undefined ? !!changes.track : yesNo_(found[6]);
    t.sh.getRange(row, 5, 1, 3).setValues([[part, ship ? 'OUI' : 'NON', track ? 'OUI' : 'NON']]);
    clearConfigCache_(configKeysFor_(SHEET.TEAM));
    label = String(found[1] || key) + ' · part ' + part + ' · Expédier ' + (ship ? 'oui' : 'non') + ' · Suivi ' + (track ? 'oui' : 'non');
    log_(admin, '', 'Équipe : droits', label);
  });
  return { message: label, team: api_teamList() };
}
