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
      saveSession({ t: token, e: String(data.e).toLowerCase(), x: data.x, k: shortHash('dz-smart-shop|' + String(data.e).toLowerCase()), v: 1 });
    } catch (e) { /* jeton illisible : écran de connexion */ }
    history.replaceState(null, '', location.pathname + location.search + '#/confirmation');
  }
  var session = readSession();
  if (session && !(session.x > Date.now())) session = null;
  window.DZ_DEVICE = { key: session ? session.k : '', v: VERSION };

  /* ---------------- Connexion (v1.11 : téléphone et mot de passe ; Google en option) ---------------- */

  function setSession(token, x, key) {
    session = { t: token, e: String(key || '').toLowerCase(), x: x, k: shortHash('dz-smart-shop|' + String(key || '').toLowerCase()), v: 2 };
    saveSession(session);
  }
  function clearSession() {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* rien */ }
    session = null;
  }
  /** Appel à /auth/… (connexion, mot de passe) ; withToken : avec le jeton de cet appareil. */
  function authPost(path, body, withToken) {
    var headers = { 'content-type': 'application/json' };
    if (withToken && session) headers.authorization = 'Bearer ' + session.t;
    return fetch(path, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json(); }, function () { throw new Error('Pas de connexion internet. Réessayez.'); })
      .then(function (r) {
        if (r && r.ok) return r.data;
        var e = new Error(r && r.error ? r.error : 'Erreur du serveur.');
        e.code = r && r.code;
        throw e;
      });
  }
  function logout() {
    var done = function () { clearSession(); location.reload(); };
    authPost('/auth/logout', {}, true).then(done, done);
  }

  var shown = false;
  var loginInfo = null;
  /** Écran de connexion. mode : 'login' (défaut), 'change' (choisir son mot de passe), 'forgot'. */
  function showLogin(message, mode) {
    var box = document.querySelector('.cf-login');
    if (!box) {
      if (shown && !mode) return;
      box = document.createElement('div');
      box.className = 'cf-login';
      document.body.appendChild(box);
    }
    shown = true;
    var go = function (info) { loginInfo = info || loginInfo || {}; renderLogin(box, message, mode || 'login'); };
    if (loginInfo) go(loginInfo);
    else fetch('/auth/info').then(function (r) { return r.json(); }).then(function (r) { go(r && r.data); }).catch(function () { go(null); });
  }

  function renderLogin(box, message, mode) {
    var info = loginInfo || {};
    var gw = info.gateway ? info.gateway + (info.gateway.indexOf('?') >= 0 ? '&' : '?') + 'cf=1' : '';
    var head = '<h1>' + esc(info.shop || 'DZ Smart Shop') + '</h1>' + (message ? '<p class="cf-msg" role="alert">' + esc(message) + '</p>' : '');
    var phoneField = '<label class="cf-field">Téléphone (identifiant)<input name="phone" type="tel" inputmode="tel" autocomplete="username" placeholder="0661 22 33 44" required></label>';
    var pwField = function (name, label, auto) {
      return '<label class="cf-field">' + label + '<span class="cf-pw"><input name="' + name + '" type="password" autocomplete="' + auto + '" required>' +
        '<button type="button" class="cf-eye" data-cf-eye aria-label="Afficher le mot de passe">👁</button></span></label>';
    };
    var html = '';
    if (mode === 'change') {
      html = head + '<p><strong>Choisissez votre mot de passe</strong> (au moins 6 caractères). Il remplace le mot de passe provisoire.</p>' +
        '<form class="cf-form" data-cf="change">' + pwField('password', 'Nouveau mot de passe', 'new-password') + pwField('again', 'Encore une fois', 'new-password') +
        '<button class="cf-btn" type="submit">Enregistrer et entrer</button></form>' +
        '<p class="cf-small"><button type="button" class="cf-link" data-cf-go="logout">Ce n’est pas moi : se déconnecter</button></p>';
    } else if (mode === 'forgot') {
      html = head + '<p><strong>Mot de passe oublié</strong></p>' +
        (info.sms ? '<form class="cf-form" data-cf="sms">' + phoneField + '<button class="cf-btn" type="submit">Recevoir un code par SMS</button></form>' : '') +
        '<details class="cf-more"' + (info.sms ? '' : ' open') + '><summary>J’ai un code de secours (administrateur)</summary>' +
        '<form class="cf-form" data-cf="rescue">' + phoneField + '<label class="cf-field">Code de secours<input name="code" autocomplete="off" placeholder="XXXX-XXXX-XXXX" required></label>' +
        pwField('password', 'Nouveau mot de passe', 'new-password') + pwField('again', 'Encore une fois', 'new-password') +
        '<button class="cf-btn" type="submit">Changer le mot de passe</button></form></details>' +
        '<p class="cf-small">Sinon, demandez à l’administrateur un nouveau mot de passe provisoire.</p>' +
        '<p class="cf-small"><button type="button" class="cf-link" data-cf-go="login">← Retour</button></p>';
    } else if (mode === 'code') {
      html = head + '<p>Un code à 6 chiffres vient d’être envoyé par SMS au <strong>' + esc(box.getAttribute('data-phone') || '') + '</strong>.</p>' +
        '<form class="cf-form" data-cf="sms-check"><input type="hidden" name="phone" value="' + esc(box.getAttribute('data-phone') || '') + '">' +
        '<label class="cf-field">Code reçu<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>' +
        pwField('password', 'Nouveau mot de passe', 'new-password') + pwField('again', 'Encore une fois', 'new-password') +
        '<button class="cf-btn" type="submit">Changer le mot de passe</button></form>' +
        '<p class="cf-small"><button type="button" class="cf-link" data-cf-go="forgot">← Renvoyer un code</button></p>';
    } else if (mode === 'rescue') {
      html = head + '<p><strong>Nouveau code de secours</strong> : l’ancien ne marche plus. Notez celui-ci sur papier, gardé en lieu sûr.</p>' +
        '<p class="cf-code">' + esc(box.getAttribute('data-rescue') || '') + '</p>' +
        '<button type="button" class="cf-btn" data-cf-go="enter">C’est noté, entrer</button>';
    } else {
      html = head +
        (info.password ? '<form class="cf-form" data-cf="login">' + phoneField + pwField('password', 'Mot de passe', 'current-password') +
          '<button class="cf-btn" type="submit">Se connecter</button></form>' +
          '<p class="cf-small"><button type="button" class="cf-link" data-cf-go="forgot">Mot de passe oublié ?</button></p>' : '') +
        (gw ? (info.password ? '<p class="cf-or"><span>ou</span></p>' : '<p>Connectez-vous avec votre compte Google (celui de l’équipe). Vous reviendrez ici tout seul.</p>') +
          '<a class="cf-btn' + (info.password ? ' cf-btn2' : '') + '" href="' + esc(gw) + '">Se connecter avec Google</a>' : '') +
        (!info.password && !gw ? '<p>L’application n’est pas encore reliée au classeur. Dans l’ancienne application : <strong>Administration › Connexions › Cloudflare</strong>.</p>' : '') +
        (info && !info.ready && gw ? '<p class="cf-small">Les données ne sont pas encore copiées : Administration › Connexions › Cloudflare › Copier les données.</p>' : '') +
        '<p class="cf-small">La connexion dure 30 jours sur cet appareil.</p>';
    }
    box.innerHTML = '<div class="cf-card">' + html + '</div>';
    var first = box.querySelector('input:not([type=hidden])');
    if (first) try { first.focus(); } catch (e) { /* rien */ }
  }

  function formValues(form) {
    var out = {};
    Array.prototype.forEach.call(form.querySelectorAll('input[name]'), function (el) { out[el.name] = el.value; });
    return out;
  }
  function loginMessage(form, text) {
    var p = form.parentNode.querySelector('.cf-msg');
    if (!p) { p = document.createElement('p'); p.className = 'cf-msg'; p.setAttribute('role', 'alert'); form.parentNode.insertBefore(p, form.parentNode.children[1] || null); }
    p.textContent = text;
  }
  function enter(data) {
    setSession(data.token, data.x, data.key);
    var box = document.querySelector('.cf-login');
    if (data.rescue && box) { box.setAttribute('data-rescue', data.rescue); renderLogin(box, '', 'rescue'); return; }
    if (data.change) { renderLogin(box, '', 'change'); return; }
    location.reload();
  }
  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    var kind = form && form.getAttribute ? form.getAttribute('data-cf') : '';
    if (!kind) return;
    ev.preventDefault();
    var v = formValues(form);
    if (v.again !== undefined && v.password !== v.again) { loginMessage(form, 'Les deux mots de passe ne sont pas pareils.'); return; }
    var btn = form.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    var fail = function (e) {
      if (btn) btn.disabled = false;
      if (e && e.code === 'auth') { clearSession(); renderLogin(document.querySelector('.cf-login'), e.message, 'login'); return; }
      loginMessage(form, e && e.message ? e.message : String(e));
    };
    var box = document.querySelector('.cf-login');
    if (kind === 'login') authPost('/auth/login', { phone: v.phone, password: v.password }).then(enter, fail);
    else if (kind === 'change') authPost('/auth/change', { password: v.password }, true).then(function () { location.reload(); }, fail);
    else if (kind === 'sms') authPost('/auth/sms', { phone: v.phone }).then(function () { box.setAttribute('data-phone', v.phone); renderLogin(box, '', 'code'); }, fail);
    else if (kind === 'sms-check') authPost('/auth/sms-check', { phone: v.phone, code: v.code, password: v.password }).then(enter, fail);
    else if (kind === 'rescue') authPost('/auth/rescue', { phone: v.phone, code: v.code, password: v.password }).then(enter, fail);
  });
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-cf-go], [data-cf-eye]') : null;
    if (!t || !t.closest('.cf-login')) return;
    if (t.hasAttribute('data-cf-eye')) {
      var input = t.parentNode.querySelector('input');
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
      return;
    }
    var go = t.getAttribute('data-cf-go');
    if (go === 'logout') { logout(); return; }
    if (go === 'enter') { location.reload(); return; }
    renderLogin(document.querySelector('.cf-login'), '', go);
  });
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
            if (r && r.code === 'auth') { clearSession(); showLogin(r.error); }
            if (r && r.code === 'change') showLogin('', 'change');
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
  /* ---------------- Application installable et notifications (v1.12) ---------------- */

  var installEvent = null;
  var swReady = null;
  if ('serviceWorker' in navigator) {
    swReady = navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function () { return navigator.serviceWorker.ready; }).catch(function () { return null; });
  }
  // Android (Chrome) : l'installation est proposée par l'application (bandeau « Installer »).
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    document.dispatchEvent(new CustomEvent('dz-installable'));
  });
  window.addEventListener('appinstalled', function () { installEvent = null; document.dispatchEvent(new CustomEvent('dz-installed')); });
  function standalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !window.MSStream; }
  function install() {
    if (!installEvent) return Promise.resolve(false);
    var ev = installEvent;
    installEvent = null;
    ev.prompt();
    return ev.userChoice.then(function (c) { return c && c.outcome === 'accepted'; }, function () { return false; });
  }
  function b64ToBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); });
  }
  /** Notifications de ce téléphone : état, activation (autorisation + abonnement), désactivation. */
  var push = {
    supported: function () { return !!swReady && 'PushManager' in window && 'Notification' in window; },
    permission: function () { return 'Notification' in window ? Notification.permission : 'denied'; },
    subscription: function () {
      if (!swReady) return Promise.resolve(null);
      return swReady.then(function (reg) { return reg && reg.pushManager ? reg.pushManager.getSubscription() : null; });
    },
    subscribe: function (publicKey) {
      if (!swReady) return Promise.reject(new Error('Notifications impossibles sur ce navigateur.'));
      return Notification.requestPermission().then(function (perm) {
        if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications refusées : autorisez-les dans les réglages du navigateur (cadenas à côté de l’adresse), puis réessayez.' : 'Notifications pas autorisées.');
        return swReady;
      }).then(function (reg) {
        if (!reg) throw new Error('Notifications impossibles sur ce navigateur.');
        return reg.pushManager.getSubscription().then(function (old) {
          return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
        });
      });
    },
    unsubscribe: function () {
      return push.subscription().then(function (sub) { return sub ? sub.unsubscribe().then(function () { return sub; }) : null; });
    }
  };
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.dzOpen) document.dispatchEvent(new CustomEvent('dz-open', { detail: e.data.dzOpen }));
    });
  }

  /* ---------------- v1.13 : communes d'Ecotrack (liste gardée sur l'appareil jusqu'à la suivante) ---------------- */

  var communes = (function () {
    var KEY = 'dz-communes';
    var idx = null;
    var at = '';
    var loading = null;
    function use(d) { at = d.at; idx = DZC.index(d.list); }
    function ensure(want) {
      if (!want) return Promise.resolve(false);
      if (idx && at === want) return Promise.resolve(true);
      try {
        var c = JSON.parse(window.localStorage.getItem(KEY) || 'null');
        if (c && c.at === want && c.list && c.list.length) { use(c); return Promise.resolve(true); }
      } catch (e) { /* liste illisible : on la redemande */ }
      if (loading) return loading;
      loading = new Promise(function (resolve) {
        window.google.script.run.withSuccessHandler(function (d) {
          loading = null;
          if (!d || !d.list || !d.list.length) { resolve(false); return; }
          use(d);
          try { window.localStorage.setItem(KEY, JSON.stringify({ at: d.at, list: d.list })); } catch (e) { /* mémoire pleine : gardée pour cette fois */ }
          resolve(true);
        }).withFailureHandler(function () { loading = null; resolve(false); }).api_communes();
      });
      return loading;
    }
    return {
      ensure: ensure,
      ready: function () { return !!idx; },
      list: function (w) { return idx ? (idx.byW[w] || []) : []; },
      find: function (w, t) { return idx ? DZC.find(idx, w, t) : null; },
      suggest: function (w, t, extra) { return idx ? DZC.suggest(idx, w, t, extra) : []; },
      search: function (w, q) { return idx ? DZC.search(idx, w, q) : []; }
    };
  })();

  window.DZ_CLOUD = { communes: communes, applyStep: applyStep, authPost: authPost, setSession: setSession, logout: logout, via: function () { return session && session.v === 2 ? 'password' : 'google'; },
    install: install, canInstall: function () { return !!installEvent; }, standalone: standalone, isIos: isIos, push: push };
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
