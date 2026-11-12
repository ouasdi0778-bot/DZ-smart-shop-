/**
 * Construit preview/index.html : l'interface complète avec des données
 * d'exemple, sans Google. Le code serveur (.gs) tourne dans la page,
 * contre l'imitation du classeur (gas-mock.js).
 *
 *   npm run preview   puis ouvrir preview/index.html dans le navigateur
 */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'apps-script');
var OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'preview');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function safe(js) { return js.replace(/<\/script/gi, '<\\/script'); }

var html = read(path.join(SRC, 'Index.html')).replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, function (m, name) {
  return read(path.join(SRC, name + '.html'));
});

var server = [read(path.join(__dirname, 'gas-mock.js'))]
  .concat(fs.readdirSync(SRC).filter(function (f) { return f.endsWith('.gs'); }).sort()
    .map(function (f) { return '// ---- ' + f + '\n' + read(path.join(SRC, f)); }))
  .concat([read(path.join(__dirname, 'seed.js'))])
  .join('\n;\n');

var fakeRun = [
  'seedDemo_();',
  "__mock.setUser('imane@example.com');",
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
