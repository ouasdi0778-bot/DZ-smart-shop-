/**
 * Construit preview/index.html : l'interface complète avec des données
 * d'exemple, sans Google. Le code serveur (.gs) tourne dans la page,
 * contre l'imitation du classeur (gas-mock.js).
 *
 *   npm run preview   puis ouvrir preview/index.html dans le navigateur
 *
 * Options : un dossier de sortie, et --scenario=demo|first|empty
 * Dans le navigateur, ajoutez « ?user=admin » (administrateur) ou « ?user=stock » (magasinier) à l'adresse.
 *   demo  : ~40 commandes d'exemple (par défaut)
 *   first : classeur tout juste installé + 2 premières commandes
 *   empty : classeur tout juste installé, aucune commande
 */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'apps-script');
var args = process.argv.slice(2);
var scenarioArg = args.filter(function (a) { return a.indexOf('--scenario=') === 0; })[0];
var SCENARIO = scenarioArg ? scenarioArg.split('=')[1] : 'demo';
var outArg = args.filter(function (a) { return a.indexOf('--') !== 0; })[0];
var OUT = outArg ? path.resolve(outArg) : path.join(ROOT, 'preview');
var SEEDS = { demo: 'seedDemo_();', first: 'seedFirstOrders_();', empty: 'setup();' };
if (!SEEDS[SCENARIO]) throw new Error('Scénario inconnu : ' + SCENARIO + ' (demo, first ou empty)');

function read(p) { return fs.readFileSync(p, 'utf8'); }
// Les pages sont allégées comme dans dist/Code.gs : l'aperçu teste exactement ce qui sera collé.
var bundle = require('./build-bundle.js');
function readHtml(name) { return bundle.minify(read(path.join(SRC, name + '.html'))); }
function safe(js) { return js.replace(/<\/script/gi, '<\\/script'); }

var html = readHtml('Index').replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, function (m, name) {
  return readHtml(name);
});
// Pages chargées à la demande (api_pageScript) : rangées comme dans le fichier unique.
var lazyPages = 'var HTML_FILES_ = {' + bundle.HTML.filter(function (n) { return /^Page/.test(n); }).map(function (n) {
  return JSON.stringify(n) + ': ' + JSON.stringify(readHtml(n));
}).join(',') + '};';

var server = [read(path.join(__dirname, 'gas-mock.js')), read(path.join(__dirname, 'fake-ecotrack.js')), read(path.join(__dirname, 'fake-shopify.js')), read(path.join(__dirname, 'fake-httpsms.js'))]
  .concat(fs.readdirSync(SRC).filter(function (f) { return f.endsWith('.gs'); }).sort()
    .map(function (f) { return '// ---- ' + f + '\n' + read(path.join(SRC, f)); }))
  .concat([lazyPages, read(path.join(__dirname, 'seed.js'))])
  .join('\n;\n');

var fakeRun = [
  SEEDS[SCENARIO],
  SCENARIO === 'demo' ? "__mock.setUser('imane@example.com');" : '',
  "if (/[?&]user=admin\\b/.test(location.search)) __mock.setUser('admin@example.com');",
  "if (/[?&]user=stock\\b/.test(location.search)) __mock.setUser('karim@example.com');",
  'function hasDate_(v) { if (v instanceof Date) return true; if (v && typeof v === "object") return Object.keys(v).some(function (k) { return hasDate_(v[k]); }); return false; }',
  'function runner_(handlers) {',
  '  return new Proxy({}, { get: function (t, name) {',
  '    if (name === "withSuccessHandler") return function (fn) { return runner_(Object.assign({}, handlers, { ok: fn })); };',
  '    if (name === "withFailureHandler") return function (fn) { return runner_(Object.assign({}, handlers, { ko: fn })); };',
  '    return function () {',
  '      var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));',
  '      setTimeout(function () {',
  '        try {',
  '          if (/_$/.test(name) || typeof window[name] !== "function") throw new Error("Fonction serveur inconnue ou privée : " + name);',
  '          var res = window[name].apply(null, args);',
  '          if (hasDate_(res)) throw new Error("Une Date est renvoyée par " + name + " : google.script.run la refuserait");',
  '          if (handlers.ok) handlers.ok(res === undefined ? null : JSON.parse(JSON.stringify(res)));',
  '        } catch (e) { console.error(e); if (handlers.ko) handlers.ko(e); }',
  '      }, 120);',
  '    };',
  '  } });',
  '}',
  'window.google = { script: { run: runner_({}) } };'
].join('\n');

html = html.replace('<head>', '<head>\n<script>\n' + safe(server) + '\n' + fakeRun + '\n</script>');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('Aperçu créé : ' + path.join(OUT, 'index.html'));
