/**
 * Profit.gs : bénéfice des commandes, dépenses (la publicité en fait partie),
 * rentabilité par produit, par campagne et par plateforme (Facebook, TikTok…).
 *
 * Bénéfice d'une commande (comptée à sa date de commande) :
 *  - livrée : ventes des produits (total encaissé − livraison payée par le client)
 *             − livraison (prix de la société de livraison − livraison payée par le client :
 *               positif = elle vous coûte, négatif = vous gagnez dessus)
 *             − coût d'achat × quantité (onglet Produits) − emballage ;
 *             (c'est la même chose que : total encaissé − prix de la société − achat − emballage)
 *  - retour : − frais de retour (FRAIS_RETOUR) − emballage ;
 *  - autres : rien (pas encore terminée, ou annulée).
 * Bénéfice net = bénéfice des commandes − dépenses de la période + gains de la période.
 *
 * Onglet Dépenses : Date | Catégorie | Campagne | Montant | Devise (DA ou USD) | Taux | Note | Fin | Type | Produit.
 *  - Fin : dernier jour d'une dépense étalée (ex. publicité du 1er au 10) ; vide = un seul jour.
 *    Le montant est réparti à parts égales sur chaque jour : une période ne compte que ses jours.
 *  - Type : « Dépense » (vide = dépense) ou « Gain » (argent reçu en dehors des commandes :
 *    remboursement, vente directe, bonus…), ajouté au bénéfice net.
 *  - Produit (publicité seulement) : le produit dont parle la pub. « Montre connectée » = tout le
 *    produit (tous ses modèles) ; « cover iPhone — iphone 15 » = un modèle ; plusieurs séparés par
 *    « ; », avec leur part facultative (« Montre connectée 60 %; Écouteurs 40 % »). Sans part, la pub
 *    est partagée selon les commandes de chacun. Le coût de la pub compte alors dans le bénéfice du
 *    produit (Bénéfices › Produits : « Après pub »). Une campagne garde son produit (mémoire).
 * Une dépense en dollars reçoit le taux du jour (TAUX_DOLLAR) la première fois
 * qu'elle est lue : changer le taux plus tard ne modifie pas les anciennes dépenses.
 */

var EXPENSE_TITLES_ = ['Date', 'Catégorie', 'Campagne', 'Montant', 'Devise', 'Taux', 'Note', 'Fin', 'Type', 'Produit'];
var CURRENCIES_ = ['DA', 'USD'];
var EXPENSE_TYPES_ = ['Dépense', 'Gain'];

function setupExpensesSheet_(ss) {
  var sh = setupSimpleSheet_(ss, SHEET.EXPENSES, EXPENSE_TITLES_, [110, 170, 220, 110, 80, 80, 260, 110, 90, 260]);
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normalizeText_);
  var col = function (t) { return header.indexOf(normalizeText_(t)) + 1; };
  var n = dataRows_(sh);
  var list = function (values) { return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build(); };
  var settings = getSettings_();
  sh.getRange(2, col('Date'), n, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, col('Fin'), n, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, col('Montant'), n, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, col('Taux'), n, 1).setNumberFormat('#,##0.##');
  sh.getRange(2, col('Catégorie'), n, 1).setDataValidation(list(settings.categories.concat(settings.gainCategories.filter(function (c) { return settings.categories.indexOf(c) < 0; }))));
  sh.getRange(2, col('Devise'), n, 1).setDataValidation(list(CURRENCIES_));
  sh.getRange(2, col('Type'), n, 1).setDataValidation(list(EXPENSE_TYPES_));
  return sh;
}

/** Facebook, TikTok… à partir d'une source UTM ou d'une catégorie de dépense ; '' si inconnue. */
function adPlatform_(text) {
  var t = normalizeText_(text);
  if (!t) return '';
  if (/facebook|instagram|\bmeta\b|^fb\b|\bfb\b|^ig\b/.test(t)) return 'Facebook';
  if (/tik ?tok|^tt\b/.test(t)) return 'TikTok';
  if (/google|youtube/.test(t)) return 'Google';
  if (/snap/.test(t)) return 'Snapchat';
  return '';
}

function isAdCategory_(category) {
  var t = normalizeText_(category);
  return /publicit|\bpub\b|\bads?\b|sponsor/.test(t) || !!adPlatform_(category);
}

function expensesSheetInfo_() {
  var sh = ss_().getSheetByName(SHEET.EXPENSES);
  if (!sh) return null;
  var header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  var idx = {};
  header.forEach(function (t, i) { var k = normalizeText_(t); if (k && idx[k] === undefined) idx[k] = i; });
  var col = function (t) { var i = idx[normalizeText_(t)]; return i === undefined ? -1 : i; };
  return { sh: sh, header: header, c: { date: col('Date'), category: col('Catégorie'), campaign: col('Campagne'), amount: col('Montant'), currency: col('Devise'), rate: col('Taux'), note: col('Note'), end: col('Fin'), type: col('Type'), product: col('Produit') } };
}

/** « Gain » dans la colonne Type (sinon : dépense). */
function isGainType_(v) {
  return /^(gain|revenu|entree|recette)/.test(normalizeText_(v));
}

/** Part d'une dépense (ou d'un gain) dans les jours from..to (aaaa-mm-jj ; from vide = depuis toujours). */
function expenseShare_(e, from, to) {
  if (!e.startKey) return from ? 0 : e.amountDA; // sans date : seulement dans « Tout »
  var a = !from || e.startKey > from ? e.startKey : from;
  var b = !to || e.endKey < to ? e.endKey : to;
  if (a > b) return 0;
  return e.amountDA * dayCount_(a, b) / e.days;
}

/** Empreinte d'une ligne : une correction ou une suppression vérifie que la ligne n'a pas changé entre-temps. */
function expenseSig_(e) {
  return [e.startKey, e.endKey, e.gain ? 'G' : 'D', e.category, e.amount, e.currency].join('|');
}

function isUsd_(currency) {
  return /^(usd|\$|dollars?|us ?d)$/i.test(String(currency || '').trim());
}

/** Dépenses de l'onglet Dépenses, montant converti en dinars. */
function readExpenses_(settings) {
  var info = expensesSheetInfo_();
  if (!info || info.sh.getLastRow() < 2 || info.c.amount < 0) return [];
  var c = info.c;
  var values = info.sh.getRange(2, 1, info.sh.getLastRow() - 1, info.header.length).getValues();
  var out = [];
  values.forEach(function (r, i) {
    var amount = toNumber_(r[c.amount]);
    if (!amount) return;
    var usd = c.currency >= 0 && isUsd_(r[c.currency]);
    var rate = c.rate >= 0 && !isBlank_(r[c.rate]) && toNumber_(r[c.rate]) > 0 ? toNumber_(r[c.rate]) : null;
    var category = c.category >= 0 ? String(r[c.category]).trim() : '';
    var start = c.date >= 0 ? toDate_(r[c.date]) : null;
    var end = c.end >= 0 ? toDate_(r[c.end]) : null;
    var startKey = start ? ymd_(start) : '';
    var endKey = end && startKey ? ymd_(end) : startKey;
    if (endKey < startKey) { var k = startKey; startKey = endKey; endKey = k; var d0 = start; start = end; end = d0; }
    var gain = c.type >= 0 && isGainType_(r[c.type]);
    var e = {
      row: i + 2,
      date: start,
      end: endKey !== startKey ? end : null,
      startKey: startKey,
      endKey: endKey,
      days: startKey ? dayCount_(startKey, endKey) : 1,
      gain: gain,
      category: category || 'Autre',
      campaign: c.campaign >= 0 ? String(r[c.campaign]).replace(/\s+/g, ' ').trim() : '',
      amount: amount,
      currency: usd ? 'USD' : 'DA',
      rate: usd ? (rate || settings.TAUX_DOLLAR) : null,
      rateMissing: usd && !rate,
      amountDA: usd ? amount * (rate || settings.TAUX_DOLLAR) : amount,
      note: c.note >= 0 ? String(r[c.note]).trim() : '',
      ad: !gain && isAdCategory_(category),
      platform: gain ? '' : adPlatform_(category),
      product: ''
    };
    if (e.ad && c.product >= 0) e.product = String(r[c.product] == null ? '' : r[c.product]).replace(/\s+/g, ' ').trim();
    e.sig = expenseSig_(e);
    out.push(e);
  });
  return out;
}

/* ---------------- Pub reliée à un produit (colonne Produit) ---------------- */

/** « Montre connectée 60 %; Écouteurs » → [{ label: 'Montre connectée', pct: 60 }, { label: 'Écouteurs', pct: null }]. */
function adProductParts_(text) {
  return String(text == null ? '' : text).split(/\s*[;\n]\s*/).map(function (part) {
    var p = part.replace(/\s+/g, ' ').trim();
    if (!p) return null;
    var m = p.match(/^(.+?)\s*[=:(]?\s*(\d+(?:[.,]\d+)?)\s*%\s*\)?$/);
    return m ? { label: m[1].trim(), pct: Number(m[2].replace(',', '.')) } : { label: p, pct: null };
  }).filter(function (x) { return x; });
}

/** Modèles visés par un nom : tout un produit (tous ses modèles) ou un seul modèle (ou un de ses autres noms) ; null si inconnu. */
function adTargetRows_(catalog, label) {
  var k = normalizeLoose_(label);
  if (!k) return null;
  var rows = catalog.rows.filter(function (r) { return normalizeLoose_(r.product) === k; });
  if (rows.length) return { name: rows[0].product, product: rows[0].product, rows: rows };
  var row = matchCatalog_(catalog, label);
  return row ? { name: rowLabel_(row), product: row.product, rows: [row] } : null;
}

/** Produits d'une pub : { targets: [{ name, product, keys, pct, whole }], unknown: [noms introuvables] }. */
function adTargets_(catalog, text) {
  var out = { targets: [], unknown: [] };
  var seen = {};
  adProductParts_(text).forEach(function (p) {
    var t = adTargetRows_(catalog, p.label);
    if (!t) { out.unknown.push(p.label); return; }
    var id = normalizeLoose_(t.name);
    if (seen[id]) return;
    seen[id] = true;
    out.targets.push({ name: t.name, product: t.product, keys: t.rows.map(function (r) { return r.key; }), pct: p.pct, whole: t.rows.length > 1 });
  });
  return out;
}

/** Texte rangé dans la colonne Produit : les noms du catalogue, avec leur part. */
function adProductText_(targets) {
  return targets.map(function (t) {
    return t.name + (t.pct === null ? '' : ' ' + (Math.round(t.pct * 10) / 10) + ' %');
  }).join('; ');
}

/** Produits d'une pub tapés dans l'application, vérifiés : texte de la colonne Produit ('' = aucun). */
function adProductValue_(text) {
  if (!String(text == null ? '' : text).trim()) return '';
  var at = adTargets_(readCatalog_(), text);
  if (at.unknown.length) throw new Error('Produit introuvable dans l’onglet Produits : « ' + at.unknown[0] + ' ».');
  if (!at.targets.length) return '';
  var given = 0;
  var free = 0;
  at.targets.forEach(function (t) { if (t.pct === null) free++; else given += t.pct; });
  if (given > 100.5) throw new Error('Les parts dépassent 100 % (' + Math.round(given) + ' %).');
  if (!free && at.targets.length > 1 && Math.abs(given - 100) > 0.5) throw new Error('Les parts doivent faire 100 % (ici ' + Math.round(given) + ' %).');
  if (at.targets.length === 1) at.targets[0].pct = null; // un seul produit : toute la pub
  return adProductText_(at.targets);
}

/**
 * Part de chaque produit d'une pub : les pourcentages donnés ; le reste est partagé entre les
 * produits sans pourcentage selon leurs commandes (weight), à parts égales s'ils n'en ont pas.
 */
function adShares_(targets, weight) {
  var shares = targets.map(function (t) { return t.pct === null ? 0 : Math.max(t.pct, 0) / 100; });
  var free = [];
  targets.forEach(function (t, i) { if (t.pct === null) free.push(i); });
  var given = shares.reduce(function (a, x) { return a + x; }, 0);
  if (!free.length) return shares.map(function (x) { return given ? x / given : 1 / shares.length; });
  var rest = Math.max(0, 1 - given);
  var w = free.map(function (i) { return weight(targets[i]); });
  var tw = w.reduce(function (a, x) { return a + x; }, 0);
  free.forEach(function (i, j) { shares[i] = rest * (tw ? w[j] / tw : 1 / free.length); });
  return shares;
}

/**
 * Publicité reliée aux produits pour les jours from..to : chaque pub est partagée entre ses produits
 * (voir adShares_), puis entre les modèles d'un produit selon leurs commandes. Ajoute à chaque groupe
 * de products (clé du catalogue) : spend (sa pub) et adBy (par campagne). Un produit relié sans
 * commande sur la période reçoit une ligne à lui. Renvoie la pub par produit (tous ses modèles),
 * sans arrondi : { clé du produit : { product, ad, adBy } }.
 */
function profitAdsByProduct_(products, expenses, catalog, from, to) {
  var perProduct = {};
  var addBy = function (holder, e, a) {
    var by = holder.adBy || (holder.adBy = {});
    var label = normalizeLoose_(e.campaign || e.category);
    var b = by[label] || (by[label] = { campaign: e.campaign, category: e.category, platform: e.platform, amount: 0 });
    b.amount += a;
  };
  var ordersOf = function (keys) { return keys.reduce(function (a, k) { return a + (products[k] ? products[k].orders : 0); }, 0); };
  expenses.forEach(function (e) {
    if (!e.ad || !e.product) return;
    var part = expenseShare_(e, from, to);
    if (!part) return;
    var at = adTargets_(catalog, e.product);
    if (!at.targets.length) return;
    var shares = adShares_(at.targets, function (t) { return ordersOf(t.keys); });
    at.targets.forEach(function (t, i) {
      var amount = part * shares[i];
      if (!amount) return;
      var pk = normalizeLoose_(t.product);
      var pp = perProduct[pk] || (perProduct[pk] = { product: t.product, ad: 0 });
      pp.ad += amount;
      addBy(pp, e, amount);
      var keys = t.keys.filter(function (k) { return products[k] && products[k].orders; });
      if (!keys.length) {
        var key = t.keys.length === 1 ? t.keys[0] : 'produit:' + normalizeLoose_(t.product);
        if (!products[key]) products[key] = emptyGroup_(t.keys.length === 1 ? t.name : t.product);
        keys = [key];
      }
      var total = ordersOf(keys);
      keys.forEach(function (k) {
        var g = products[k];
        var a = total ? amount * g.orders / total : amount / keys.length;
        g.spend += a;
        addBy(g, e, a);
      });
    });
  });
  return perProduct;
}

/** { campaign: { campaign, category, platform, amount } } → liste arrondie, la plus grosse d'abord. */
function adByList_(by) {
  return Object.keys(by || {}).map(function (k) {
    var x = by[k];
    return { campaign: x.campaign, category: x.category, platform: x.platform, amount: Math.round(x.amount) };
  }).filter(function (x) { return x.amount; }).sort(function (a, b) { return b.amount - a.amount; });
}

/** Produit proposé pour une pub sans produit : un mot du nom de la campagne (ou de la note) dans le nom d'un produit. */
function adSuggest_(catalog, text) {
  var root = function (w) { return w.length > 4 ? w.replace(/(es|s|x)$/, '') : w; };
  var words = String(text == null ? '' : text).split(/[^0-9A-Za-zÀ-ÿء-ي]+/).filter(function (w) { return normalizeLoose_(w).length >= 4; });
  if (!words.length) return null;
  var best = null;
  var seen = {};
  catalog.rows.forEach(function (r) {
    var pk = normalizeLoose_(r.product);
    if (seen[pk]) return;
    seen[pk] = true;
    var pw = pk.split(' ').map(root);
    var hits = words.filter(function (w) { return pw.indexOf(root(normalizeLoose_(w))) >= 0; });
    if (!hits.length) return;
    var score = hits.length * 10 + (r.active ? 1 : 0);
    if (!best || score > best.score) best = { product: r.product, word: hits[0], score: score };
  });
  return best ? { product: best.product, word: best.word } : null;
}

/** Produits proposés dans la case « Produit de cette pub » : chaque produit (et ses modèles s'il en a plusieurs). */
function adProductOptions_(catalog) {
  var map = {};
  var order = [];
  catalog.rows.forEach(function (r) {
    var k = normalizeLoose_(r.product);
    if (!map[k]) { map[k] = { product: r.product, models: [], active: false }; order.push(k); }
    map[k].active = map[k].active || r.active;
    if (r.model && r.active) map[k].models.push(rowLabel_(r));
  });
  return order.map(function (k) { return map[k]; }).filter(function (p) { return p.active; })
    .sort(function (a, b) { return String(a.product).localeCompare(String(b.product)); })
    .map(function (p) { return { product: p.product, models: p.models.length > 1 ? p.models : [] }; });
}

/** Écrit le taux du jour sur les dépenses en dollars qui n'en ont pas encore. */
function fillExpenseRates_(settings) {
  var info = expensesSheetInfo_();
  if (!info || info.sh.getLastRow() < 2 || info.c.rate < 0 || info.c.currency < 0 || !settings.TAUX_DOLLAR) return 0;
  var n = info.sh.getLastRow() - 1;
  var cur = info.sh.getRange(2, info.c.currency + 1, n, 1).getValues();
  var rates = info.sh.getRange(2, info.c.rate + 1, n, 1).getValues();
  var amounts = info.sh.getRange(2, info.c.amount + 1, n, 1).getValues();
  var filled = 0;
  rates.forEach(function (r, i) {
    if (isUsd_(cur[i][0]) && toNumber_(amounts[i][0]) && (isBlank_(r[0]) || !(toNumber_(r[0]) > 0))) { r[0] = settings.TAUX_DOLLAR; filled++; }
  });
  if (filled) info.sh.getRange(2, info.c.rate + 1, n, 1).setValues(rates);
  return filled;
}

/** Bénéfice d'une commande (null si elle n'est ni livrée ni retournée). */
function orderProfit_(o, env, catalog) {
  var s = env.settings;
  var res = { profit: null, revenue: 0, sales: 0, clientShipping: 0, fee: 0, deliveryNet: 0, cost: 0, returnFee: 0, packaging: 0,
    missingCost: false, missingFee: false, items: [] };
  var items = catalogItems_(catalog, o);
  if (o.status === STATUS.DELIVERED) {
    var cost = 0;
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      var c = row && row.cost !== null ? row.cost * it.qty : null;
      if (c === null) res.missingCost = true; else cost += c;
      res.items.push({ label: row ? row.product + (row.model ? ' — ' + row.model : '') : it.label, qty: it.qty, cost: c });
    });
    if (!items.length) res.missingCost = true;
    res.revenue = toNumber_(o.total);
    // Livraison payée par le client : la colonne Frais livraison (sinon total − prix des produits).
    res.clientShipping = isBlank_(o.shipping) ? Math.max(res.revenue - toNumber_(o.price), 0) : toNumber_(o.shipping);
    res.sales = res.revenue - res.clientShipping;
    var fee = shippingFee_(env, o.wilaya, o.carrier || s.SOCIETE_PAR_DEFAUT, o.mode);
    if (fee === null) { fee = res.clientShipping; res.missingFee = true; }
    res.fee = fee;
    res.deliveryNet = fee - res.clientShipping;
    res.cost = cost;
    res.packaging = s.COUT_EMBALLAGE;
    res.profit = res.sales - res.deliveryNet - cost - res.packaging;
  } else if (o.status === STATUS.RETURNED) {
    res.returnFee = s.FRAIS_RETOUR;
    res.packaging = s.COUT_EMBALLAGE;
    res.profit = -(res.returnFee + res.packaging);
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      res.items.push({ label: row ? row.product + (row.model ? ' — ' + row.model : '') : it.label, qty: it.qty, cost: 0 });
    });
  }
  return res;
}

function emptyGroup_(name) {
  return { name: name, orders: 0, confirmed: 0, delivered: 0, returned: 0, inTransit: 0, cancelled: 0, revenue: 0, sales: 0, deliveryNet: 0, profit: 0, spend: 0 };
}

function addToGroup_(g, o, p, share) {
  g.orders++;
  if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) g.confirmed++;
  if (o.status === STATUS.DELIVERED) g.delivered++;
  if (o.status === STATUS.RETURNED) g.returned++;
  if (o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) g.inTransit++;
  if (o.status === STATUS.CANCELLED) g.cancelled++;
  if (p.profit !== null) {
    g.revenue += p.revenue * share;
    g.sales += p.sales * share;
    g.deliveryNet += p.deliveryNet * share;
    g.profit += p.profit * share;
  }
}

function finishGroup_(g) {
  g.revenue = Math.round(g.revenue);
  g.sales = Math.round(g.sales);
  g.deliveryNet = Math.round(g.deliveryNet);
  g.profit = Math.round(g.profit);
  g.spend = Math.round(g.spend);
  g.net = g.profit - g.spend;
  g.deliveryRate = g.delivered + g.returned ? g.delivered / (g.delivered + g.returned) : null;
  g.costPerOrder = g.spend && g.orders ? Math.round(g.spend / g.orders) : null;
  g.costPerDelivered = g.spend && g.delivered ? Math.round(g.spend / g.delivered) : null;
  g.profitPerDelivered = g.delivered ? Math.round(g.profit / g.delivered) : null;
  // ROAS : encaissé ÷ publicité (3 = 3 DA encaissés pour 1 DA de publicité).
  g.roas = g.spend ? Math.round(g.revenue / g.spend * 100) / 100 : null;
  return g;
}

/** Découpage du graphique : par jour (≤ 62 jours), par semaine (≤ 1 an) ou par mois. */
function profitBuckets_(from, to) {
  var len = dayCount_(from, to);
  var unit = len <= 62 ? 'day' : len <= 366 ? 'week' : 'month';
  var out = [];
  var a = from;
  while (a <= to) {
    var b;
    if (unit === 'day') b = a;
    else if (unit === 'week') b = addDayDays_(a, 6);
    else {
      var next = (Number(a.slice(5, 7)) === 12 ? (Number(a.slice(0, 4)) + 1) + '-01' : a.slice(0, 5) + ('0' + (Number(a.slice(5, 7)) + 1)).slice(-2)) + '-01';
      b = addDayDays_(next, -1);
    }
    if (b > to) b = to;
    out.push({ from: a, to: b, revenue: 0, profit: 0, expenses: 0, gains: 0, net: 0 });
    a = addDayDays_(b, 1);
  }
  return { unit: unit, list: out };
}

/**
 * Bénéfice des commandes, en deux temps (pour pouvoir additionner des résumés par jour, voir
 * daySummaries_) : profitAccumulate_ additionne des commandes ; profitMerge_ ajoute un résumé déjà
 * fait ; profitFinish_ ajoute les dépenses de la période, arrondit et calcule les taux.
 */
function profitAcc_() {
  return {
    t: { orders: 0, confirmed: 0, delivered: 0, returned: 0, inTransit: 0, cancelled: 0, revenue: 0, productSales: 0, clientShipping: 0,
      deliveryFees: 0, deliveryNet: 0, productCost: 0, returnFees: 0, packaging: 0, ordersProfit: 0, expenses: 0, adSpend: 0, gains: 0,
      deliveredProfit: 0, returnLoss: 0 },
    warn: { missingCost: 0, missingFee: 0, missingCostLabels: {} },
    products: {}, campaigns: {}, platforms: {}, perDay: {}
  };
}

function profitAccumulate_(orders, env, catalog, acc, detail) {
  acc = acc || profitAcc_();
  var t = acc.t;
  var group = function (map, key, name) { return map[key] || (map[key] = emptyGroup_(name)); };
  orders.forEach(function (o) {
    var p = orderProfit_(o, env, catalog);
    t.orders++;
    if (CONFIRMED_STATUSES.indexOf(o.status) >= 0) t.confirmed++;
    if (o.status === STATUS.DELIVERED) t.delivered++;
    if (o.status === STATUS.RETURNED) t.returned++;
    if (o.status === STATUS.SHIPPED || o.status === STATUS.IN_DELIVERY) t.inTransit++;
    if (o.status === STATUS.CANCELLED) t.cancelled++;
    if (p.profit !== null) {
      t.revenue += p.revenue;
      t.productSales += p.sales;
      t.clientShipping += p.clientShipping;
      t.deliveryFees += p.fee;
      t.deliveryNet += p.deliveryNet;
      t.productCost += p.cost;
      t.returnFees += p.returnFee;
      t.packaging += p.packaging;
      t.ordersProfit += p.profit;
      if (o.status === STATUS.DELIVERED) t.deliveredProfit += p.profit; else t.returnLoss -= p.profit;
      if (p.missingCost) {
        acc.warn.missingCost++;
        p.items.forEach(function (it) { if (it.cost === null) acc.warn.missingCostLabels[it.label] = true; });
      }
      if (p.missingFee) acc.warn.missingFee++;
      if (detail) {
        var key = ymd_(toDate_(o.date));
        var d = acc.perDay[key] || (acc.perDay[key] = { revenue: 0, profit: 0 });
        d.revenue += p.revenue;
        d.profit += p.profit;
      }
    }
    if (!detail) return;
    // Par produit : une commande à plusieurs articles est partagée selon les quantités.
    var items = catalogItems_(catalog, o);
    var totalQty = items.reduce(function (a, it) { return a + it.qty; }, 0) || 1;
    items.forEach(function (it) {
      var row = matchCatalog_(catalog, it.label);
      var name = row ? row.product + (row.model ? ' — ' + row.model : '') : it.label;
      addToGroup_(group(acc.products, row ? row.key : normalizeLoose_(it.label), name), o, p, it.qty / totalQty);
    });
    var campaign = String(o.campaign || '').trim();
    addToGroup_(group(acc.campaigns, normalizeLoose_(campaign) || '-', campaign || '(sans campagne)'), o, p, 1);
    var platform = adPlatform_(o.adSource) || (String(o.adSource || '').trim() ? String(o.adSource).trim() : 'Sans publicité suivie');
    addToGroup_(group(acc.platforms, normalizeLoose_(platform), platform), o, p, 1);
  });
  return acc;
}

/** Ajoute un résumé (d'un autre jour) à acc. */
function profitMerge_(acc, other) {
  if (!other) return acc;
  Object.keys(other.t || {}).forEach(function (k) { acc.t[k] = (acc.t[k] || 0) + (other.t[k] || 0); });
  var w = other.warn || {};
  acc.warn.missingCost += w.missingCost || 0;
  acc.warn.missingFee += w.missingFee || 0;
  Object.keys(w.missingCostLabels || {}).forEach(function (l) { acc.warn.missingCostLabels[l] = true; });
  ['products', 'campaigns', 'platforms'].forEach(function (m) {
    Object.keys(other[m] || {}).forEach(function (k) {
      var g = other[m][k];
      var a = acc[m][k] || (acc[m][k] = emptyGroup_(g.name));
      Object.keys(g).forEach(function (f) { if (f !== 'name') a[f] = (a[f] || 0) + (g[f] || 0); });
    });
  });
  Object.keys(other.perDay || {}).forEach(function (k) {
    var d = acc.perDay[k] || (acc.perDay[k] = { revenue: 0, profit: 0 });
    d.revenue += other.perDay[k].revenue;
    d.profit += other.perDay[k].profit;
  });
  return acc;
}

/** Totaux finaux : dépenses de la période, arrondis, taux. (acc n'est pas modifié.) */
function profitFinish_(acc, expenses, from, to, detail) {
  var t = {};
  Object.keys(acc.t).forEach(function (k) { t[k] = acc.t[k]; });
  var copy = function (map) { var out = {}; Object.keys(map).forEach(function (k) { out[k] = Object.assign({}, map[k]); }); return out; };
  var campaigns = copy(acc.campaigns);
  var platforms = copy(acc.platforms);
  var group = function (map, key, name) { return map[key] || (map[key] = emptyGroup_(name)); };
  var byCategory = {};
  var gainsByCategory = {};
  var unassigned = 0;
  expenses.forEach(function (e) {
    var part = expenseShare_(e, from, to);
    if (!part) return;
    if (e.gain) {
      t.gains += part;
      gainsByCategory[e.category] = (gainsByCategory[e.category] || 0) + part;
      return;
    }
    t.expenses += part;
    byCategory[e.category] = (byCategory[e.category] || 0) + part;
    if (!e.ad) return;
    t.adSpend += part;
    if (!detail) return;
    var ck = normalizeLoose_(e.campaign);
    if (ck) group(campaigns, ck, e.campaign).spend += part;
    else unassigned += part;
    if (e.platform) group(platforms, normalizeLoose_(e.platform), e.platform).spend += part;
  });
  Object.keys(t).forEach(function (k) { t[k] = Math.round(t[k]); });
  t.net = t.ordersProfit - t.expenses + t.gains;
  t.deliveryRate = t.delivered + t.returned ? t.delivered / (t.delivered + t.returned) : null;
  t.costPerDelivered = t.adSpend && t.delivered ? Math.round(t.adSpend / t.delivered) : null;
  t.profitPerDelivered = t.delivered ? Math.round(t.ordersProfit / t.delivered) : null;
  t.roas = t.adSpend ? Math.round(t.revenue / t.adSpend * 100) / 100 : null;
  var sorted = function (map) {
    return Object.keys(map).map(function (k) { return { category: k, amount: Math.round(map[k]) }; }).sort(function (a, b) { return b.amount - a.amount; });
  };
  return { t: t, warn: acc.warn, products: copy(acc.products), campaigns: campaigns, platforms: platforms, byCategory: sorted(byCategory), gainsByCategory: sorted(gainsByCategory), unassigned: unassigned, perDay: acc.perDay };
}

/** Totaux d'une liste de commandes (et des dépenses de la période). */
function profitTotals_(orders, env, catalog, expenses, from, to, detail) {
  return profitFinish_(profitAccumulate_(orders, env, catalog, null, detail), expenses, from, to, detail);
}

/**
 * Tout ce que montre la page Bénéfices pour une période (voir periodRange_) :
 * totaux, comparaison avec la période d'avant, bénéfice par jour (ou semaine, ou mois),
 * seuil de rentabilité, données du simulateur, produits, publicité, dépenses et gains.
 */
function profitData_(ctx, env, range) {
  var catalog = readCatalog_();
  var orders = ctx.orders.filter(function (o) { return inDayRange_(o.date, range.from, range.to); });
  if (range.all) orders = orders.concat(readArchivedOrders_());
  var cur = profitAccumulate_(orders, env, catalog, null, true);
  // Période d'avant, de même durée (pas pour « Tout »).
  var prev = null;
  if (!range.all) {
    var before = ctx.orders.filter(function (o) { return inDayRange_(o.date, range.prevFrom, range.prevTo); });
    prev = profitAccumulate_(before, env, catalog, null, false);
  }
  var known = {};
  ctx.orders.forEach(function (o) { var c = String(o.campaign || '').trim(); if (c) known[c] = true; });
  return profitReport_(cur, prev, range, env.settings, readExpenses_(env.settings), Object.keys(known));
}

/**
 * La page Bénéfices à partir des résumés de la période (cur) et de la période d'avant (prev) :
 * le même calcul pour la version Google (résumés faits à la volée) et la version Cloudflare
 * (résumés par jour gardés dans la base).
 */
function profitReport_(curAcc, prevAcc, range, settings, expenses, knownCampaigns) {
  var env = { settings: settings };
  var cur = profitFinish_(curAcc, expenses, range.from, range.to, true);
  var t = cur.t;
  var prev = prevAcc ? profitFinish_(prevAcc, expenses, range.prevFrom, range.prevTo, false).t : null;

  // Bénéfice par jour (ou semaine, ou mois) : commandes à leur date, dépenses et gains répartis par jour.
  var first = range.from;
  if (!first) {
    first = range.to;
    Object.keys(cur.perDay).forEach(function (k) { if (k && k < first) first = k; });
    expenses.forEach(function (e) { if (e.startKey && e.startKey < first) first = e.startKey; });
  }
  var buckets = profitBuckets_(first, range.to);
  var findBucket = function (key) {
    for (var i = 0; i < buckets.list.length; i++) if (key >= buckets.list[i].from && key <= buckets.list[i].to) return buckets.list[i];
    return null;
  };
  Object.keys(cur.perDay).forEach(function (key) {
    var b = key ? findBucket(key) : null;
    if (b) { b.revenue += cur.perDay[key].revenue; b.profit += cur.perDay[key].profit; }
  });
  buckets.list.forEach(function (b) {
    expenses.forEach(function (e) {
      var part = expenseShare_(e, b.from, b.to);
      if (e.gain) b.gains += part; else b.expenses += part;
    });
    ['revenue', 'profit', 'expenses', 'gains'].forEach(function (k) { b[k] = Math.round(b[k]); });
    b.net = b.profit - b.expenses + b.gains;
  });
  var days = dayCount_(first, range.to);

  // Seuil de rentabilité : livrées par jour pour couvrir les dépenses (moins les gains).
  var needPerDay = Math.max(t.expenses - t.gains, 0) / Math.max(days, 1);
  var margin = t.delivered ? t.ordersProfit / t.delivered : null;
  var breakEven = {
    days: days,
    needPerDay: Math.round(needPerDay),
    margin: margin === null ? null : Math.round(margin),
    perDayNeeded: margin && margin > 0 ? Math.round(needPerDay / margin * 100) / 100 : null,
    perDayNow: Math.round(t.delivered / Math.max(days, 1) * 100) / 100,
    ok: t.net >= 0
  };

  // Simulateur du taux de livraison.
  var sim = {
    finished: t.delivered + t.returned,
    rate: t.deliveryRate,
    avgDelivered: t.delivered ? Math.round(t.deliveredProfit / t.delivered) : null,
    avgReturnLoss: t.returned ? Math.round(t.returnLoss / t.returned) : Math.round(env.settings.FRAIS_RETOUR + env.settings.COUT_EMBALLAGE)
  };

  var list = function (map) {
    return Object.keys(map).map(function (k) { return finishGroup_(map[k]); })
      .sort(function (a, b) { return (b.orders - a.orders) || (b.spend - a.spend) || String(a.name).localeCompare(String(b.name)); });
  };
  var known = {};
  (knownCampaigns || []).forEach(function (c) { if (c) known[c] = true; });
  expenses.forEach(function (e) { if (e.campaign) known[e.campaign] = true; });
  var shown = expenses.filter(function (e) { return range.all || expenseShare_(e, range.from, range.to); });
  var ads = profitAdsReport_(cur.products, expenses, shown, range);
  return {
    period: range.period || '30',
    range: { from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo, days: days, all: !!range.all, unit: buckets.unit },
    totals: t,
    prev: prev,
    series: buckets.list,
    breakEven: breakEven,
    sim: sim,
    expensesByCategory: cur.byCategory,
    gainsByCategory: cur.gainsByCategory,
    adUnassigned: Math.round(cur.unassigned),
    products: ads.products,
    adAlerts: ads.alerts,
    adByProduct: ads.byProduct,
    adLinks: ads.links,
    adUnlinked: ads.unlinked,
    adProducts: ads.options,
    adCategories: env.settings.categories.filter(isAdCategory_),
    campaigns: list(cur.campaigns),
    platforms: list(cur.platforms),
    expenses: shown.sort(function (a, b) { return String(b.startKey).localeCompare(String(a.startKey)) || b.row - a.row; })
      .slice(0, 300).map(function (e) {
        return { id: String(e.row), sig: e.sig, date: e.startKey, end: e.endKey !== e.startKey ? e.endKey : '', days: e.days, gain: e.gain,
          category: e.category, campaign: e.campaign, amount: e.amount, currency: e.currency, rate: e.rate,
          amountDA: Math.round(e.amountDA), inPeriod: Math.round(range.all ? e.amountDA : expenseShare_(e, range.from, range.to)), note: e.note, ad: e.ad,
          product: e.product, linked: e.ad && !!e.product && !!adTargetsOf_(e).targets.length };
      }),
    warnings: { missingCost: cur.warn.missingCost, missingFee: cur.warn.missingFee, missingCostLabels: Object.keys(cur.warn.missingCostLabels).slice(0, 20) },
    categories: env.settings.categories,
    gainCategories: env.settings.gainCategories,
    knownCampaigns: Object.keys(known).sort(),
    rate: env.settings.TAUX_DOLLAR,
    returnFee: env.settings.FRAIS_RETOUR
  };
}

/** Produits de la pub e (gardés sur la ligne, le catalogue ne change pas pendant un calcul). */
function adTargetsOf_(e, catalog) {
  if (!e._targets) e._targets = adTargets_(catalog || readCatalog_(), e.product);
  return e._targets;
}

/**
 * Bénéfices › Produits avec la publicité reliée : bénéfice avant pub, pub, après pub, pub par livrée,
 * pub maximum rentable (ce que rapporte une livrée avant pub) ; alertes ; pubs sans produit ;
 * mémoire des campagnes (le dernier produit choisi pour chaque campagne) ; produits proposés.
 */
function profitAdsReport_(products, expenses, shown, range) {
  var catalog = readCatalog_();
  expenses.forEach(function (e) { if (e.ad && e.product) adTargetsOf_(e, catalog); });
  var perProduct = profitAdsByProduct_(products, expenses, catalog, range.from, range.to);
  var list = Object.keys(products).map(function (k) {
    var g = finishGroup_(products[k]);
    var row = catalogRowByKey_(catalog, k);
    g.key = k;
    g.product = row ? row.product : g.name;
    g.ad = g.spend;
    g.afterAd = g.net;
    g.adPerDelivered = g.costPerDelivered;
    g.maxAdPerDelivered = g.profitPerDelivered;
    g.adBy = adByList_(g.adBy);
    return g;
  }).sort(function (a, b) { return (b.orders - a.orders) || (b.ad - a.ad) || String(a.name).localeCompare(String(b.name)); });

  // Alerte (par produit, tous ses modèles) : la pub coûte plus que ce que le produit rapporte,
  // seulement quand des commandes sont terminées (livrées ou retournées) : sinon c'est trop tôt pour le dire.
  var byProduct = {};
  var names = [];
  list.forEach(function (g) {
    var k = normalizeLoose_(g.product);
    var a = byProduct[k];
    if (!a) {
      a = byProduct[k] = { name: g.product, models: 0, ad: Math.round(perProduct[k] ? perProduct[k].ad : 0), profit: 0, delivered: 0, returned: 0, inTransit: 0 };
      names.push(k);
    }
    a.models++;
    if (a.models === 1) a.single = g.name;
    ['profit', 'delivered', 'returned', 'inTransit'].forEach(function (f) { a[f] += g[f]; });
  });
  var alerts = names.map(function (k) { return byProduct[k]; })
    .filter(function (a) { return a.ad > 0 && a.profit - a.ad < 0 && a.delivered + a.returned > 0; })
    .map(function (a) {
      return { name: a.models === 1 ? a.single : a.name, ad: a.ad, profit: a.profit, afterAd: a.profit - a.ad, delivered: a.delivered, inTransit: a.inTransit,
        adPerDelivered: a.delivered ? Math.round(a.ad / a.delivered) : null, maxAdPerDelivered: a.delivered ? Math.round(a.profit / a.delivered) : null };
    })
    .sort(function (a, b) { return a.afterAd - b.afterAd; }).slice(0, 3);

  // Mémoire : le produit de la dernière pub de chaque campagne.
  var links = {};
  expenses.slice().sort(function (a, b) { return String(a.startKey).localeCompare(String(b.startKey)) || a.row - b.row; })
    .forEach(function (e) {
      if (!e.ad || !e.campaign || !e.product || !adTargetsOf_(e, catalog).targets.length) return;
      links[normalizeLoose_(e.campaign)] = { campaign: e.campaign, product: e.product };
    });

  // Pubs sans produit (de la période), regroupées par campagne.
  var groups = {};
  var order = [];
  shown.forEach(function (e) {
    if (!e.ad || (e.product && adTargetsOf_(e, catalog).targets.length)) return;
    var key = e.campaign ? 'c:' + normalizeLoose_(e.campaign) : 'r:' + e.row;
    var g = groups[key];
    if (!g) {
      g = groups[key] = { campaign: e.campaign, category: e.category, date: '', amount: 0, count: 0, id: String(e.row), sig: e.sig, product: e.product,
        suggestion: adSuggest_(catalog, e.campaign || e.note) };
      order.push(key);
    }
    g.count++;
    g.amount += range.all ? e.amountDA : expenseShare_(e, range.from, range.to);
    if (String(e.startKey) > g.date) g.date = e.startKey;
  });
  var unlinked = order.map(function (k) { var g = groups[k]; g.amount = Math.round(g.amount); return g; })
    .sort(function (a, b) { return b.amount - a.amount; });

  return {
    products: list,
    byProduct: names.map(function (k) { return byProduct[k]; }).filter(function (a) { return a.ad; }).map(function (a) {
      return { product: a.name, ad: a.ad, profit: a.profit, delivered: a.delivered, models: a.models, adBy: adByList_(perProduct[normalizeLoose_(a.name)].adBy) };
    }),
    alerts: alerts,
    links: Object.keys(links).map(function (k) { return links[k]; }),
    unlinked: unlinked,
    options: adProductOptions_(catalog)
  };
}

/** Page Bénéfices (administrateur). */
/** Bénéfices : mesurée (Administration › État de l'outil). */
function api_profit() {
  var a = arguments;
  return timed_('Bénéfices', function () { return profitApi_.apply(null, a); });
}

/** period : today, yesterday, 7, 30, month, lastmonth, all ; ou from / to (aaaa-mm-jj) pour une période libre. */
function profitApi_(period, from, to) {
  requireAdmin_();
  var settings = getSettings_();
  if (expensesNeedRate_(settings)) withLock_(function () { fillExpenseRates_(settings); });
  var ctx = readOrders_();
  var range = periodRange_(String(period || '30'), from, to);
  range.period = from && to ? 'custom' : String(period || '30');
  return profitData_(ctx, makeEnv_(ctx), range);
}

function expensesNeedRate_(settings) {
  return readExpenses_(settings).some(function (e) { return e.rateMissing; });
}

/** Valeurs d'une dépense (ou d'un gain) saisie dans l'application, vérifiées. */
function expenseValues_(input, settings) {
  input = input || {};
  var amount = toNumber_(input.amount);
  if (!(amount > 0)) throw new Error('Indiquez un montant.');
  var usd = isUsd_(input.currency);
  var rate = usd ? (toNumber_(input.rate) > 0 ? toNumber_(input.rate) : settings.TAUX_DOLLAR) : '';
  if (usd && !(rate > 0)) throw new Error('Indiquez le taux du dollar (réglage TAUX_DOLLAR dans Paramètres).');
  var date = toDate_(input.date) || new Date();
  var end = toDate_(input.end);
  if (end && ymd_(end) < ymd_(date)) throw new Error('La date de fin est avant la date de début.');
  if (end && dayCount_(ymd_(date), ymd_(end)) > 366) throw new Error('Une dépense ne peut pas s’étaler sur plus d’un an.');
  var gain = isGainType_(input.type);
  var category = String(input.category || '').trim() || 'Autre';
  return {
    date: date,
    end: end && ymd_(end) !== ymd_(date) ? end : '',
    type: gain ? 'Gain' : 'Dépense',
    category: category,
    product: !gain && isAdCategory_(category) ? adProductValue_(input.product) : '',
    campaign: gain ? '' : String(input.campaign || '').replace(/\s+/g, ' ').trim(),
    amount: amount,
    currency: usd ? 'USD' : 'DA',
    rate: rate,
    note: String(input.note || '').trim()
  };
}

function expenseText_(v) {
  var days = v.end ? dayCount_(ymd_(v.date), ymd_(v.end)) : 1;
  return v.type + ' · ' + v.category + (v.campaign ? ' · ' + v.campaign : '') + (v.product ? ' · ' + v.product : '') + ' · ' + v.amount + ' ' + v.currency +
    (days > 1 ? ' · du ' + Utilities.formatDate(v.date, 'Africa/Algiers', 'dd/MM') + ' au ' + Utilities.formatDate(v.end, 'Africa/Algiers', 'dd/MM') + ' (' + days + ' j)' : '');
}

function writeExpenseRow_(info, r, values) {
  var c = info.c;
  var cur = info.sh.getRange(r, 1, 1, info.header.length).getValues()[0];
  Object.keys(c).forEach(function (k) { if (c[k] >= 0 && values[k] !== undefined) cur[c[k]] = values[k]; });
  info.sh.getRange(r, 1, 1, cur.length).setValues([cur]);
}

/** Ajoute une dépense ou un gain depuis l'application (le taux du jour est écrit pour une dépense en dollars). */
function api_addExpense(input) {
  cloudGuardAll_();
  var user = requireAdmin_();
  var v = expenseValues_(input, getSettings_());
  return withLock_(function () {
    var sh = ss_().getSheetByName(SHEET.EXPENSES) || setupExpensesSheet_(ss_());
    ensureHeaders_(sh, EXPENSE_TITLES_);
    var info = expensesSheetInfo_();
    var r = sh.getLastRow() + 1;
    ensureRows_(sh, r);
    var row = info.header.map(function () { return ''; });
    Object.keys(info.c).forEach(function (k) { if (info.c[k] >= 0 && v[k] !== undefined) row[info.c[k]] = v[k]; });
    sh.getRange(r, 1, 1, row.length).setValues([row]);
    log_(user, '', v.type === 'Gain' ? 'Gain' : 'Dépense', expenseText_(v));
    var da = fmtAmount_(v.currency === 'USD' ? v.amount * v.rate : v.amount);
    return { message: (v.type === 'Gain' ? 'Gain ajouté : ' : 'Dépense ajoutée : ') + da + ' DA' + (v.end ? ', réparti sur ' + dayCount_(ymd_(v.date), ymd_(v.end)) + ' jours' : '') + '.' };
  });
}

/** Retrouve une ligne de l'onglet Dépenses et vérifie qu'elle n'a pas changé (empreinte). */
function expenseAt_(row, sig, settings) {
  var r = Math.round(toNumber_(row));
  var list = readExpenses_(settings);
  for (var i = 0; i < list.length; i++) {
    if (list[i].row !== r) continue;
    if (sig && list[i].sig !== String(sig)) throw new Error('Cette ligne a changé dans le classeur entre-temps : rechargez la page.');
    return list[i];
  }
  throw new Error('Dépense introuvable (ligne ' + r + ') : rechargez la page.');
}

/** Corrige une dépense ou un gain (toutes les valeurs du formulaire). */
function api_updateExpense(row, sig, input) {
  cloudGuardAll_();
  var user = requireAdmin_();
  var settings = getSettings_();
  var v = expenseValues_(input, settings);
  return withLock_(function () {
    var e = expenseAt_(row, sig, settings);
    var sh = ss_().getSheetByName(SHEET.EXPENSES);
    ensureHeaders_(sh, EXPENSE_TITLES_);
    // Un taux déjà écrit est gardé si la devise ne change pas et qu'aucun taux n'est donné.
    if (v.currency === 'USD' && e.currency === 'USD' && !(toNumber_(input && input.rate) > 0) && e.rate) v.rate = e.rate;
    writeExpenseRow_(expensesSheetInfo_(), e.row, v);
    log_(user, '', 'Dépense corrigée', 'Ligne ' + e.row + ' : ' + expenseText_(v));
    return { message: (v.type === 'Gain' ? 'Gain' : 'Dépense') + ' corrigé' + (v.type === 'Gain' ? '' : 'e') + '.' };
  });
}

/**
 * Relie une pub à son produit (bloc « Pubs sans produit ») : toutes les pubs sans produit de la
 * campagne (les suivantes le prendront aussi, voir la mémoire des campagnes) ; sans campagne,
 * seulement la ligne id (empreinte sig).
 */
function api_linkCampaign(campaign, product, id, sig) {
  cloudGuardAll_();
  var user = requireAdmin_();
  var settings = getSettings_();
  var text = adProductValue_(product);
  if (!text) throw new Error('Choisissez un produit.');
  return withLock_(function () {
    var sh = ss_().getSheetByName(SHEET.EXPENSES);
    if (!sh) throw new Error('Onglet Dépenses introuvable.');
    ensureHeaders_(sh, EXPENSE_TITLES_);
    var info = expensesSheetInfo_();
    var catalog = readCatalog_();
    var ck = normalizeLoose_(campaign);
    var rows = ck
      ? readExpenses_(settings).filter(function (e) {
        return e.ad && normalizeLoose_(e.campaign) === ck && !(e.product && adTargets_(catalog, e.product).targets.length);
      })
      : [expenseAt_(id, sig, settings)];
    if (!rows.length || rows.some(function (e) { return !e.ad; })) throw new Error('Aucune pub à relier : rechargez la page.');
    var n = info.sh.getLastRow() - 1;
    var range = info.sh.getRange(2, info.c.product + 1, n, 1);
    var values = range.getValues();
    rows.forEach(function (e) { values[e.row - 2][0] = text; });
    range.setValues(values);
    log_(user, '', 'Pub reliée', (campaign ? 'Campagne ' + campaign : 'Ligne ' + rows[0].row) + ' → ' + text + ' (' + plural_(rows.length, 'ligne', 'lignes') + ')');
    return { linked: rows.length, product: text, message: 'Pub reliée à « ' + text + ' »' + (rows.length > 1 ? ' (' + rows.length + ' dépenses de la campagne)' : '') + '.' };
  });
}

/** Supprime des dépenses ou des gains : items = [{ id: n° de ligne, sig }]. */
function api_deleteExpenses(items) {
  cloudGuardAll_();
  var user = requireAdmin_();
  var list = (Array.isArray(items) ? items : [items]).filter(function (x) { return x && x.id; });
  if (!list.length) throw new Error('Cochez au moins une dépense.');
  var settings = getSettings_();
  return withLock_(function () {
    var found = list.map(function (x) { return expenseAt_(x.id, x.sig, settings); });
    var info = expensesSheetInfo_();
    deleteSheetRows_(info.sh, found.map(function (e) { return e.row; }));
    found.forEach(function (e) {
      log_(user, '', 'Dépense supprimée', (e.gain ? 'Gain' : 'Dépense') + ' · ' + e.category + (e.campaign ? ' · ' + e.campaign : '') + ' · ' + e.amount + ' ' + e.currency + ' · ' + (e.startKey || 'sans date'));
    });
    return { deleted: found.length, message: plural_(found.length, 'ligne supprimée', 'lignes supprimées') + '.' };
  });
}
