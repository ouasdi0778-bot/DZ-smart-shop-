/**
 * Serveur local qui imite Cloudflare (moteur + base SQLite + fichiers de public/), avec les données
 * d'exemple déjà copiées : pour essayer l'interface dans un navigateur, sans compte Cloudflare.
 *
 *   node cloudflare/test/serve.js [port] [--latence=80] [--etape2]
 *   --etape2 : après le basculement (Expédier, Suivi, Ecotrack et SMS avec de faux serveurs).
 *   puis ouvrir l'adresse affichée (connexion déjà faite comme administrateur).
 */
'use strict';
process.removeAllListeners('warning');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { D1 } = require('./d1');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const SRC = path.join(ROOT, 'apps-script');
const args = process.argv.slice(2);
const PORT = Number(args.filter((a) => /^\d+$/.test(a))[0]) || 8787;
const LATENCY = Number((args.filter((a) => /^--latence=/.test(a))[0] || '').split('=')[1]) || 0;
const STEP2 = args.indexOf('--etape2') >= 0;
process.env.TZ = 'Africa/Algiers';

globalThis.require = require;
function load(file) { vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file }); }
['gas-mock.js', 'fake-ecotrack.js', 'fake-shopify.js', 'fake-httpsms.js', 'fake-cloud.js'].forEach((f) => load(path.join(ROOT, 'tests', f)));
fs.readdirSync(SRC).filter((f) => f.endsWith('.gs')).sort().forEach((f) => load(path.join(SRC, f)));
load(path.join(ROOT, 'tests', 'seed.js'));
ORDERS_CACHE_ON_ = false;

(async () => {
  require('../build').build();
  const tmp = path.join(os.tmpdir(), 'dz-worker-serve-' + process.pid + '.mjs');
  fs.copyFileSync(path.join(HERE, '..', 'dist', 'worker.js'), tmp);
  const worker = (await import(pathToFileURL(tmp).href)).default;
  const PUB = path.join(HERE, '..', 'public');
  const env = {
    DB: new D1(':memory:'),
    ASSETS: {
      fetch: async (req) => {
        const p = new URL(req.url).pathname;
        const file = path.join(PUB, p === '/' ? 'index.html' : p);
        if (!file.startsWith(PUB) || !fs.existsSync(file)) return new Response('Introuvable', { status: 404 });
        return new Response(fs.readFileSync(file), { headers: { 'content-type': /\.html$/.test(file) ? 'text/html; charset=utf-8' : 'application/octet-stream' } });
      }
    }
  };
  await env.DB.exec(fs.readFileSync(path.join(HERE, '..', 'schema.sql'), 'utf8'));

  // Données d'exemple copiées comme le fait Cloud.gs.
  seedDemo_();
  __mock.setUser('admin@example.com');
  transferReleasitOrders_();
  if (STEP2) {
    saveEcotrackConfig_(__fakeEcotrack.host, __fakeEcotrack.token);
    saveSmsConfig_(__fakeHttpsms.key, '0550 12 34 56');
    // Appels du moteur vers Ecotrack et httpSMS : vers les faux serveurs.
    globalThis.fetch = async (url, init) => {
      init = init || {};
      const headers = Object.assign({}, init.headers || {});
      const params = { method: String(init.method || 'GET').toLowerCase(), headers: headers, muteHttpExceptions: true, followRedirects: init.redirect !== 'manual' };
      if (init.body !== undefined) { params.payload = init.body; params.contentType = headers['content-type'] || ''; }
      const r = UrlFetchApp.fetch(String(url), params);
      const content = r.getContent ? r.getContent() : null;
      const h = new Headers();
      Object.entries(r.getAllHeaders ? r.getAllHeaders() : {}).forEach(([k, v]) => h.set(k, String(v)));
      return new Response(content ? Uint8Array.from(content, (b) => b & 255) : r.getContentText(), { status: r.getResponseCode(), headers: h });
    };
  }
  const SECRET = 'cle-locale-0123456789abcdef0123456789abcdef';
  const send = async (p, body) => {
    const res = await worker.fetch(new Request('http://local' + p, { method: 'POST', headers: { 'x-dz-key': SECRET, 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error);
  };
  await send('/bridge/register', { secret: SECRET, gateway: 'http://localhost:' + PORT + '/connexion', shop: 'DZ Smart Shop (essai local)' });
  const snap = cloudSnapshot_();
  await send('/bridge/import', { reset: true, config: snap.config, kv: snap.kv, trash: snap.trash, blocked: snap.blocked, orders: snap.orders });
  await send('/bridge/import', { done: true });
  if (STEP2) {
    await send('/bridge/live', { live: true });
    const p = PropertiesService.getScriptProperties();
    await send('/bridge/config', { props: { ECOTRACK_URL: p.getProperty('ECOTRACK_URL'), ECOTRACK_TOKEN: p.getProperty('ECOTRACK_TOKEN'), SMS_API_KEY: p.getProperty('SMS_API_KEY'), SMS_FROM: p.getProperty('SMS_FROM') } });
  }

  http.createServer(async (req, res) => {
    // « Connexion avec Google » imitée : renvoie un jeton pour la personne choisie (?qui=…).
    if (req.url.indexOf('/connexion') === 0) {
      const who = new URL(req.url, 'http://x').searchParams.get('qui') || 'admin@example.com';
      res.writeHead(302, { location: '/#jeton=' + encodeURIComponent(cloudToken_(who, SECRET)) });
      res.end();
      return;
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = new Request('http://localhost:' + PORT + req.url, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
      if (LATENCY && req.url.indexOf('/api/') === 0) await new Promise((ok) => setTimeout(ok, LATENCY));
      const out = await worker.fetch(r, env);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(Buffer.from(await out.arrayBuffer()));
    });
  }).listen(PORT, () => {
    console.log('Version Cloudflare locale : http://localhost:' + PORT + '/connexion  (puis http://localhost:' + PORT + '/)');
  });
})();
