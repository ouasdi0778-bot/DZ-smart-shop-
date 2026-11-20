/**
 * Prépare cloudflare/src/communes-ar.js (v1.13) : les noms arabes des communes, sous forme de table
 * { « wilaya:nom » : nom arabe } prête à lire. Le rapprochement des orthographes proches (« Baba Hesen » chez
 * Ecotrack, « BABA HASSEN » dans la liste arabe) est fait ici, une fois, et pas dans le moteur Cloudflare.
 *
 *   node cloudflare/tools/communes-ar.js <WilayaList.json de @dzcode-io/leblad> [<communes Ecotrack .json>]
 *
 * Le second fichier : la réponse de /api/v1/get/communes, ou la liste de l'application ([{ w, n }]).
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HERE = __dirname;
var OUT = path.join(HERE, '..', 'src', 'communes-ar.js');
var args = process.argv.slice(2);
if (!args[0]) { console.error('Usage : node cloudflare/tools/communes-ar.js <WilayaList.json> [<communes Ecotrack .json>]'); process.exit(1); }

var ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(HERE, '..', 'src', 'communes-core.js'), 'utf8') + ';this.DZC = DZC;', ctx);

var rows = [];
JSON.parse(fs.readFileSync(args[0], 'utf8')).forEach(function (w) {
  (w.dairats || []).forEach(function (d) {
    (d.baladyiats || []).forEach(function (b) { rows.push([+w.mattricule, String(b.name).trim(), String(b.name_ar).trim()]); });
  });
});
var eco = [];
if (args[1]) {
  var raw = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  var items = Array.isArray(raw) ? raw : raw && Array.isArray(raw.data) ? raw.data : Object.keys(raw).map(function (k) { return raw[k]; });
  eco = items.map(function (c) { return { w: +(c.w || c.wilaya_id), n: String(c.n || c.nom || '') }; }).filter(function (c) { return c.n; });
}
var table = ctx.DZC.arabicTable(rows, eco);
var keys = Object.keys(table).sort();
var head = [
  '/*',
  ' * Noms arabes des communes d\'Algérie (v1.13), pour reconnaître une commune écrite en arabe par le client',
  ' * (Releasit) et l\'afficher à côté du nom d\'Ecotrack. { « wilaya d\'avant 2019:nom » : nom arabe } ; « 0:nom »',
  ' * pour un nom unique en Algérie. Fichier préparé par cloudflare/tools/communes-ar.js (ne pas modifier à la main).',
  ' *',
  ' * Données tirées de @dzcode-io/leblad 1.0.3 (data/WilayaList.json), licence MIT :',
  ' *   Copyright (c) 2020 dzCode.io',
  ' *   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and',
  ' *   associated documentation files (the "Software"), to deal in the Software without restriction, including',
  ' *   without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
  ' *   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the',
  ' *   following conditions: The above copyright notice and this permission notice shall be included in all',
  ' *   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF',
  ' *   ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS',
  ' *   FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE',
  ' *   LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,',
  ' *   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
  ' */'
].join('\n');
fs.writeFileSync(OUT, head + '\nvar COMMUNES_AR = {\n' + keys.map(function (k) { return JSON.stringify(k) + ': ' + JSON.stringify(table[k]); }).join(',\n') + '\n};\n');
console.log('Noms arabes : ' + keys.length + ' entrées (' + rows.length + ' communes, ' + eco.length + ' noms Ecotrack rapprochés) → ' + path.relative(process.cwd(), OUT));
