/**
 * Construit la version Cloudflare à partir du code de apps-script/ (aucune règle n'est réécrite) :
 *
 *   dist/worker.js     le moteur : makeApp() (code .gs + remplaçants) puis src/server.js
 *   public/index.html  l'interface : la même que la version Google, avec src/client-cloud.js
 *
 *   node cloudflare/build.js
 */
'use strict';
var fs = require('fs');
var path = require('path');

var HERE = __dirname;
var ROOT = path.join(HERE, '..');
var SRC = path.join(ROOT, 'apps-script');
var bundle = require(path.join(ROOT, 'tests', 'build-bundle.js'));

function read(p) { return fs.readFileSync(p, 'utf8'); }

function names(text, re) {
  var out = [];
  var m;
  while ((m = re.exec(text))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}

function buildWorker(page) {
  var shim = read(path.join(HERE, 'src', 'gas-shim.js'));
  var over = read(path.join(HERE, 'src', 'overrides.js'));
  var gs = bundle.ORDER.map(function (f) { return '/* ---- ' + f + ' ---- */\n' + read(path.join(SRC, f)); }).join('\n');
  // « @wrap nom_ » dans overrides.js : la fonction d'origine reste disponible sous le nom gas_nom_.
  var wrapped = [];
  (over.match(/@wrap\s+([^*]+)\*\//g) || []).forEach(function (m) {
    m.replace(/@wrap\s+/, '').replace(/\*\/$/, '').split(/\s+/).filter(Boolean).forEach(function (n) { wrapped.push(n); });
  });
  wrapped.forEach(function (n) {
    var re = new RegExp('^function ' + n.replace(/\$/g, '\\$') + '\\(', 'm');
    if (!re.test(gs)) throw new Error('@wrap : fonction ' + n + ' introuvable dans apps-script/.');
    gs = gs.replace(re, 'function gas_' + n + '(');
  });
  var all = shim + '\n' + gs + '\n' + over;
  var fns = names(all, /^function\s+([A-Za-z0-9_$]+)\s*\(/gm);
  var consts = names(gs, /^var\s+([A-Z][A-Z0-9_]*)\s*=/gm);
  var version = (read(path.join(SRC, 'Config.gs')).match(/APP_VERSION = '([^']+)'/) || [])[1] || '';
  var parts = [
    '// DZ Smart Shop ' + version + ' — version Cloudflare (fichier généré par cloudflare/build.js, ne pas modifier).',
    '',
    'function makeApp() {',
    'var REQ = null;',
    shim,
    gs,
    over,
    // Pages chargées à la demande (Stock, Bénéfices, Statistiques, Administration) : envoyées par api_pageScript.
    'var HTML_FILES_ = ' + JSON.stringify(lazyPages()) + ';',
    'return {',
    '  fns: {' + fns.map(function (n) { return n + ': ' + n; }).join(', ') + '},',
    '  consts: {' + consts.map(function (n) { return n + ': ' + n; }).join(', ') + '},',
    '  begin: function (r) { REQ = r; CFG_MEMO_ = {}; CFG_PREFETCHED_ = false; LOG_BATCH_ = null; LOCK_DEPTH_ = 0; SMS_PENDING_ = []; },',
    '  end: function () { REQ = null; LOG_BATCH_ = null; }',
    '};',
    '}',
    '',
    // La page est dans le moteur (pas de fichiers à envoyer à part) : une seule mise en ligne.
    'const INDEX_HTML = ' + JSON.stringify(page || '') + ';',
    'const INDEX_TAG = ' + JSON.stringify(require('crypto').createHash('sha256').update(page || '').digest('hex').slice(0, 16)) + ';',
    '',
    read(path.join(HERE, 'src', 'server.js'))
  ];
  return parts.join('\n');
}

function lazyPages() {
  var out = {};
  ['PageStock', 'PageProfit', 'PageStats', 'PageAdmin'].forEach(function (n) { out[n] = bundle.minify(read(path.join(SRC, n + '.html'))); });
  return out;
}

function buildPage() {
  var version = (read(path.join(SRC, 'Config.gs')).match(/APP_VERSION = '([^']+)'/) || [])[1] || '';
  var html = bundle.minify(read(path.join(SRC, 'Index.html')))
    .replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, function (m, name) { return bundle.minify(read(path.join(SRC, name + '.html'))); })
    .replace(/<script>window\.DZ_DEVICE = <\?!=\s*device\s*\?>;<\/script>/, '<script>' + read(path.join(HERE, 'src', 'client-cloud.js')).replace('__VERSION__', version) + '</script>');
  if (/<\?/.test(html)) throw new Error('Balise Apps Script restée dans la page.');
  var head = '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<title>DZ Smart Shop · Commandes COD</title><style>' + read(path.join(HERE, 'src', 'client-cloud.css')) + '</style>';
  // Index.html commence par <!DOCTYPE html><html><head> : on garde son contenu, avec notre en-tête.
  html = html.replace(/^[\s\S]*?<head>/i, head);
  return html;
}

function build() {
  fs.mkdirSync(path.join(HERE, 'dist'), { recursive: true });
  fs.mkdirSync(path.join(HERE, 'public'), { recursive: true });
  var page = buildPage();
  fs.writeFileSync(path.join(HERE, 'public', 'index.html'), page);
  fs.writeFileSync(path.join(HERE, 'dist', 'worker.js'), buildWorker(page));
}

module.exports = { build: build, buildWorker: buildWorker, buildPage: buildPage };

if (require.main === module) {
  build();
  console.log('Version Cloudflare construite : cloudflare/dist/worker.js et cloudflare/public/index.html');
}
