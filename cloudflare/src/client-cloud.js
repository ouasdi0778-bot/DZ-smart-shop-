/*
 * Version Cloudflare de l'interface : remplace google.script.run par des appels à /api/<fonction>,
 * gère la connexion (jeton reçu du lien Apps Script) et masque les pages pas encore disponibles.
 * Placé dans la page AVANT le code de l'application (App.html), qui ne change pas.
 */
(function () {
  'use strict';
  var KEY = 'dz-smart-shop:session';
  var STEP_KEY = 'dz-smart-shop:step';
  /** Pages restées dans l'application Google (étape 3) : ouvertes là-bas. */
  var EXTERNAL = ['benefices', 'stock', 'stats', 'admin'];
  var VERSION = '__VERSION__';

  /** Même empreinte que shortHash_ (Api.gs) : clé de la mémoire sur l'appareil, sans l'adresse. */
  function shortHash(text) {
    var h1 = 0x811c9dc5;
    var h2 = 0x01000193 ^ 0x5bd1e995;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
    }
    return ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
  }
  function readSession() {
    try { return JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function saveSession(s) {
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* navigation privée : à refaire à chaque ouverture */ }
  }

  // Retour de la connexion Google : « #jeton=… » dans l'adresse.
  var m = String(location.hash || '').match(/jeton=([^&]+)/);
  if (m) {
    try {
      var token = decodeURIComponent(m[1]);
      var data = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      saveSession({ t: token, e: String(data.e).toLowerCase(), x: data.x, k: shortHash('dz-smart-shop|' + String(data.e).toLowerCase()) });
    } catch (e) { /* jeton illisible : écran de connexion */ }
    history.replaceState(null, '', location.pathname + location.search + '#/confirmation');
  }
  var session = readSession();
  if (session && !(session.x > Date.now())) session = null;
  window.DZ_DEVICE = { key: session ? session.k : '', v: VERSION };

  /* ---------------- Écran de connexion ---------------- */

  var shown = false;
  function showLogin(message) {
    if (shown) return;
    shown = true;
    var render = function (info) {
      var box = document.createElement('div');
      box.className = 'cf-login';
      var gw = info && info.gateway ? info.gateway + (info.gateway.indexOf('?') >= 0 ? '&' : '?') + 'cf=1' : '';
      box.innerHTML = '<div class="cf-card"><h1>' + esc(info && info.shop || 'DZ Smart Shop') + '</h1>' +
        (message ? '<p class="cf-msg">' + esc(message) + '</p>' : '') +
        (gw ? '<p>Connectez-vous avec votre compte Google (celui de l’équipe). Vous reviendrez ici tout seul.</p>' +
          '<a class="cf-btn" href="' + esc(gw) + '">Se connecter avec Google</a>'
          : '<p>L’application n’est pas encore reliée au classeur. Dans l’ancienne application : <strong>Administration › Connexions › Cloudflare</strong>.</p>') +
        (info && !info.ready && gw ? '<p class="cf-small">Les données ne sont pas encore copiées : Administration › Connexions › Cloudflare › Copier les données.</p>' : '') +
        '<p class="cf-small">La connexion dure 30 jours sur cet appareil.</p></div>';
      document.body.appendChild(box);
    };
    fetch('/auth/info').then(function (r) { return r.json(); }).then(function (r) { render(r && r.data); }).catch(function () { render(null); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- google.script.run → /api ---------------- */

  function runner(handlers) {
    return new Proxy({}, {
      get: function (t, name) {
        if (name === 'withSuccessHandler') return function (fn) { return runner(Object.assign({}, handlers, { ok: fn })); };
        if (name === 'withFailureHandler') return function (fn) { return runner(Object.assign({}, handlers, { ko: fn })); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var fail = function (e) { if (handlers.ko) handlers.ko(e); };
          if (!session) { showLogin(); fail(new Error('Connexion nécessaire.')); return; }
          fetch('/api/' + name, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.t },
            body: JSON.stringify(args),
            keepalive: name === 'api_recordCall' // envoyé même si l'application est fermée juste après
          }).then(function (r) { return r.json(); }).then(function (r) {
            if (r && r.ok) {
              if (name === 'api_bootstrap' && r.data && r.data.cloud) applyStep(r.data.cloud);
              if (handlers.ok) handlers.ok(r.data === undefined ? null : r.data);
              return;
            }
            if (r && r.code === 'auth') { try { window.localStorage.removeItem(KEY); } catch (e) {} session = null; showLogin(r.error); }
            fail(new Error(r && r.error ? r.error : 'Erreur du serveur.'));
          }).catch(function () { fail(new Error('Pas de connexion internet. Réessayez.')); });
        };
      }
    });
  }
  window.google = { script: { run: runner({}) } };

  /* ---------------- Étape : 1 (essai, sur une copie) ou 2 (la vraie application) ---------------- */

  var root = document.documentElement;
  var step = { n: 1, google: '' };
  try { step = JSON.parse(window.localStorage.getItem(STEP_KEY) || 'null') || step; } catch (e) { /* première ouverture */ }
  function applyStep(info) {
    if (info && info.step) {
      step = { n: info.step, google: info.google || '' };
      try { window.localStorage.setItem(STEP_KEY, JSON.stringify(step)); } catch (e) { /* sans importance */ }
    }
    root.classList.toggle('cf-step1', step.n < 2);
    root.classList.toggle('cf-step2', step.n === 2);
    root.classList.toggle('cf-step3', step.n >= 3);
  }
  applyStep(null);
  window.DZ_CLOUD = { applyStep: applyStep };
  function googleLink(route) { return step.google ? step.google + '&page=' + route : ''; }
  // Une page de l'application Google demandée ici (lien, menu « Plus ») : ouverte dans l'application Google.
  // Étape 3 : toutes les pages sont ici.
  function external(route) { return step.n === 2 && EXTERNAL.indexOf(route) >= 0; }
  var startRoute = String(location.hash || '').replace(/^#\/?/, '');
  if (step.n < 3 && EXTERNAL.indexOf(startRoute) >= 0) history.replaceState(null, '', location.pathname + location.search + '#/tableau');
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('[data-route], a[href^="#/"]') : null;
    var route = a ? (a.getAttribute('data-route') || String(a.getAttribute('href') || '').replace(/^#\/?/, '')) : '';
    if (!external(route)) return;
    var link = googleLink(route);
    if (!link) return;
    ev.preventDefault();
    ev.stopPropagation();
    window.open(link, '_blank', 'noopener');
  }, true);
  window.addEventListener('hashchange', function () {
    var r = String(location.hash || '').replace(/^#\/?/, '');
    if (step.n < 3 && EXTERNAL.indexOf(r) >= 0) {
      history.replaceState(null, '', location.pathname + location.search + '#/tableau');
      if (external(r) && googleLink(r)) window.open(googleLink(r), '_blank', 'noopener');
    }
  }, true);
  if (!session) document.addEventListener('DOMContentLoaded', function () { showLogin(); });
})();
