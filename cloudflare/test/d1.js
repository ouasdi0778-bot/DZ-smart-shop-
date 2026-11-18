/**
 * Imitation de Cloudflare D1 sur la base SQLite intégrée à Node (node:sqlite), pour tester le
 * moteur sans compte Cloudflare : prepare / bind / all / first / run, batch (transaction), exec.
 */
'use strict';
const { DatabaseSync } = require('node:sqlite');

class Stmt {
  constructor(d1, sql, params) { this.d1 = d1; this.sql = sql; this.params = params || []; }
  bind(...params) {
    params.forEach((v, i) => {
      if (v === undefined) throw new Error('D1_TYPE_ERROR: Type « undefined » refusé (paramètre ' + (i + 1) + ') : ' + this.sql.slice(0, 80));
      if (typeof v === 'boolean' || (v !== null && typeof v === 'object')) throw new Error('D1_TYPE_ERROR: Type « ' + typeof v + ' » refusé : ' + this.sql.slice(0, 80));
    });
    return new Stmt(this.d1, this.sql, params);
  }
  _exec() {
    this.d1.queries++;
    const st = this.d1.db.prepare(this.sql);
    const rows = st.all(...this.params).map((r) => Object.assign({}, r));
    return { results: rows, success: true, meta: { changes: 0 } };
  }
  async all() { return this._exec(); }
  async first(col) { const r = this._exec().results[0]; return r === undefined ? null : col ? r[col] : r; }
  async run() { return this._exec(); }
}

class D1 {
  constructor(file) { this.db = new DatabaseSync(file || ':memory:'); this.queries = 0; this.batches = 0; }
  prepare(sql) { return new Stmt(this, sql); }
  async batch(list) {
    this.batches++;
    this.db.exec('BEGIN');
    try {
      const out = list.map((s) => s._exec());
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw new Error('D1_ERROR: ' + e.message);
    }
  }
  async exec(sql) { this.db.exec(sql); return { count: 1 }; }
  /** Plan de la requête (pour vérifier qu'un index sert). */
  plan(sql, params) {
    return this.db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...(params || [])).map((r) => r.detail).join(' | ');
  }
}

module.exports = { D1 };
