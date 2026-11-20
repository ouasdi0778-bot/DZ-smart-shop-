/*
 * Communes d'Ecotrack (v1.13) : recherche en français ou en arabe, commune reconnue, communes proches.
 * Partagé par le moteur Cloudflare (server.js) et l'application (client-cloud.js) : mêmes règles des deux côtés.
 *
 * Une commune : { w: n° de wilaya, n: nom chez Ecotrack, p: code postal, s: 1 si bureau stop desk, a: nom arabe }.
 *
 *   find(index, wilaya, texte)      la commune écrite (même orthographe, ou même nom arabe), sinon null
 *   suggest(index, wilaya, texte, adresse)   jusqu'à 3 communes proches (orthographe, nom dans l'adresse)
 *   search(index, wilaya, recherche)          communes de la wilaya qui correspondent (début du nom d'abord)
 */
var DZC = (function () {
  'use strict';
  // Wilayas créées en 2019 : leurs communes étaient avant dans ces wilayas (table des noms arabes).
  var PARENT = { 49: 1, 50: 1, 51: 7, 52: 8, 53: 11, 54: 11, 55: 30, 56: 33, 57: 39, 58: 47 };

  function str(s) { return String(s == null ? '' : s); }
  function isArabic(s) { return /[؀-ۿ]/.test(str(s)); }
  /** « Aïn El-Turck » → « aineltruck » : minuscules, sans accents, lettres seulement. */
  function latin(s) { return str(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, ''); }
  function arabicWords(s) {
    return str(s).replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[^ء-ي]+/g, ' ').split(' ').filter(function (w) { return w && w !== 'بلديه' && w !== 'البلديه'; });
  }
  /** Nom arabe sans voyelles ni espaces, lettres proches unifiées (أ إ آ → ا, ة → ه, ى → ي). */
  function arabic(s) { return arabicWords(s).join(''); }
  /**
   * Plus souple : sans l'article « ال » (« عين البنيان » = « عين بنيان »), « وادي » = « واد »,
   * fin de mot ة / ا / ي indifférente (« السانية » = « السانيا »).
   */
  function arabicLoose(s) {
    return arabicWords(s).map(function (w) {
      if (w === 'وادي' || w === 'الوادي') return 'واد';
      if (w.length > 3) w = w.replace(/^ال/, '');
      return w.length > 3 ? w.replace(/[اهي]$/, '') : w;
    }).join('');
  }
  /** Squelette : « Azazgua » = « Azazga », « Bab zouar » = « Bab Ezzouar » (consonnes, sans lettres doublées). */
  function skel(s) {
    var l = latin(s).replace(/dj/g, 'j').replace(/ch/g, 'sh').replace(/ou/g, 'u').replace(/gh/g, 'r');
    if (!l) return '';
    return (l[0] + l.slice(1).replace(/[aeiouy]/g, '')).replace(/(.)\1+/g, '$1');
  }
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    var prev = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var cur = [i];
      for (var k = 1; k <= b.length; k++) cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  /** Ressemblance de 0 à 1 entre deux textes déjà normalisés. */
  function sim(a, b) { return a && b ? 1 - lev(a, b) / Math.max(a.length, b.length) : 0; }

  /**
   * Communes groupées par wilaya. Tri et clés de recherche préparés seulement pour la wilaya demandée
   * (peu de calcul : le moteur Cloudflare gratuit compte chaque milliseconde).
   */
  function index(list) {
    var byW = {};
    (list || []).forEach(function (c) { (byW[c.w] = byW[c.w] || []).push(c); });
    return { byW: byW, sorted: {}, keys: {}, n: (list || []).length };
  }
  function listOf(idx, w) {
    var l = idx && idx.byW[w];
    if (!l) return null;
    if (!idx.sorted[w]) { l.sort(function (x, y) { return x.n < y.n ? -1 : x.n > y.n ? 1 : 0; }); idx.sorted[w] = true; }
    return l;
  }
  function keysOf(idx, w) {
    if (!idx || !idx.byW[w]) return null;
    if (idx.keys[w]) return idx.keys[w];
    var k = {};
    var add = function (key, c) { if (key.length > 3) (k[key] = k[key] || []).push(c); };
    idx.byW[w].forEach(function (c) {
      add('l:' + latin(c.n), c);
      if (c.a) { add('a:' + arabic(c.a), c); add('A:' + arabicLoose(c.a), c); }
    });
    idx.keys[w] = k;
    return k;
  }

  function find(idx, w, text) {
    var k = keysOf(idx, w);
    var t = str(text).trim();
    if (!k || !t) return null;
    var tries = isArabic(t) ? ['a:' + arabic(t), 'A:' + arabicLoose(t)] : ['l:' + latin(t)];
    for (var i = 0; i < tries.length; i++) {
      var hit = k[tries[i]];
      if (hit && hit.length === 1) return hit[0];
    }
    return null;
  }

  function suggest(idx, w, text, extra) {
    var list = listOf(idx, w);
    if (!list) return [];
    var t = str(text).trim();
    var ar = isArabic(t);
    var tl = latin(t);
    var ta = arabic(t);
    var ts = skel(t);
    var hayL = latin(t + ' ' + str(extra));
    var hayA = arabic(t + ' ' + str(extra));
    var scored = [];
    list.forEach(function (c) {
      var cl = latin(c.n);
      var ca = c.a ? arabic(c.a) : '';
      var s = ar ? (ca ? sim(ta, ca) : 0) : Math.max(sim(tl, cl), ts && ts.length > 2 && ts === skel(c.n) ? 0.9 : 0);
      // Nom de la commune écrit dans la commune ou l'adresse (« Bab Ezzouar, cité 500 logements »).
      if (cl.length >= 4 && hayL.indexOf(cl) >= 0) s = Math.max(s, 0.85 + cl.length / 1000);
      if (ca.length >= 4 && hayA.indexOf(ca) >= 0) s = Math.max(s, 0.85 + ca.length / 1000);
      if (s >= 0.6) scored.push([s, c]);
    });
    scored.sort(function (x, y) { return y[0] - x[0] || x[1].n.localeCompare(y[1].n, 'fr'); });
    return scored.slice(0, 3).map(function (x) { return x[1]; });
  }

  function search(idx, w, q) {
    var list = listOf(idx, w) || [];
    var t = str(q).trim();
    var ar = isArabic(t);
    var key = ar ? arabic(t) : latin(t);
    if (!key) return list.slice();
    var starts = [];
    var inside = [];
    list.forEach(function (c) {
      var v = ar ? (c.a ? arabic(c.a) : '') : latin(c.n);
      var i = v.indexOf(key);
      if (i === 0) starts.push(c); else if (i > 0) inside.push(c);
    });
    return starts.concat(inside);
  }

  /**
   * Ajoute le nom arabe. Table { « wilaya d'avant 2019:nom » : nom arabe, « 0:nom » pour un nom unique en
   * Algérie } préparée une fois pour toutes (cloudflare/tools/communes-ar.js) : ici, une simple lecture.
   */
  function enrich(list, table) {
    var t = table || {};
    return (list || []).map(function (c) {
      var k = latin(c.n);
      var out = {};
      Object.keys(c).forEach(function (key) { out[key] = c[key]; });
      out.a = t[(PARENT[c.w] || c.w) + ':' + k] || t[c.w + ':' + k] || t['0:' + k] || '';
      return out;
    });
  }

  /** Préparation de la table (outil, pas à chaque lecture) : rapproche aussi les orthographes proches. */
  function arabicTable(rows, ecotrack) {
    var t = {};
    var count = {};
    var byOld = {};
    rows.forEach(function (r) {
      var k = latin(r[1]);
      t[r[0] + ':' + k] = r[2];
      count[k] = (count[k] || 0) + 1;
      (byOld[r[0]] = byOld[r[0]] || []).push({ k: k, sk: skel(r[1]), a: r[2] });
    });
    rows.forEach(function (r) { var k = latin(r[1]); if (count[k] === 1) t['0:' + k] = r[2]; });
    (ecotrack || []).forEach(function (c) {
      var old = PARENT[c.w] || c.w;
      var k = latin(c.n);
      if (t[old + ':' + k] || t['0:' + k]) return;
      var sk = skel(c.n);
      var best = null;
      var bs = 0;
      (byOld[old] || []).forEach(function (x) {
        var s = Math.max(sim(k, x.k), sk.length > 2 && sk === x.sk ? 0.86 : 0);
        if (s > bs) { bs = s; best = x; }
      });
      if (bs >= 0.75) t[old + ':' + k] = best.a;
    });
    return t;
  }

  return { isArabic: isArabic, latin: latin, arabic: arabic, skel: skel, sim: sim, index: index, list: listOf, find: find, suggest: suggest, search: search,
    enrich: enrich, arabicTable: arabicTable };
})();
