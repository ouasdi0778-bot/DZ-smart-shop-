/**
 * Construit dist/Code.gs : tout le code (scripts + pages HTML) dans un
 * seul fichier, à coller dans l'éditeur Apps Script à la place de Code.gs.
 *
 *   npm run bundle
 */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'apps-script');
var OUT = path.join(ROOT, 'dist', 'Code.gs');
var ORDER = ['Config.gs', 'Utils.gs', 'Orders.gs', 'Ecotrack.gs', 'Tracking.gs', 'Shopify.gs', 'Releasit.gs', 'Rules.gs', 'Maintenance.gs', 'Api.gs', 'Setup.gs'];
var HTML = ['Index', 'Styles', 'App'];

function build() {
  var version = (fs.readFileSync(path.join(SRC, 'Config.gs'), 'utf8').match(/APP_VERSION = '([^']+)'/) || [])[1] || '';
  var gs = fs.readdirSync(SRC).filter(function (f) { return f.endsWith('.gs'); });
  gs.forEach(function (f) { if (ORDER.indexOf(f) < 0) throw new Error('Fichier non listé dans build-bundle.js : ' + f); });

  var parts = [
    '/**',
    ' * DZ Smart Shop ' + version + ' — gestion des commandes COD (fichier unique).',
    ' *',
    ' * INSTALLATION',
    ' * 1. Dans le classeur : Extensions › Apps Script.',
    ' * 2. Effacez tout le contenu de Code.gs, collez ce fichier à la place, puis Enregistrer.',
    ' * 3. Revenez au classeur, rechargez la page : menu « DZ Smart Shop › Installer / réparer le classeur ».',
    ' *',
    ' * Fichier généré automatiquement (npm run bundle) depuis le dossier apps-script/.',
    ' * Pour modifier le code, modifiez apps-script/ puis régénérez ce fichier.',
    ' */',
    ''
  ];
  ORDER.forEach(function (f) {
    parts.push('/* ======================= ' + f + ' ======================= */', '');
    parts.push(fs.readFileSync(path.join(SRC, f), 'utf8').trim(), '');
  });
  parts.push('/* ======================= Pages HTML ======================= */', '');
  parts.push('var HTML_FILES_ = {');
  parts.push(HTML.map(function (name) {
    return '  ' + name + ': ' + JSON.stringify(fs.readFileSync(path.join(SRC, name + '.html'), 'utf8'));
  }).join(',\n'));
  parts.push('};', '');
  return parts.join('\n');
}

module.exports = { build: build, OUT: OUT };

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, build());
  console.log('Fichier unique créé : ' + path.relative(ROOT, OUT));
}
