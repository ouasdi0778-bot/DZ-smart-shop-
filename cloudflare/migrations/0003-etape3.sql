-- Étape 3 : onglets gardés dans la base, mouvements de stock, résumés par jour.
CREATE TABLE IF NOT EXISTS tabs (name TEXT NOT NULL, part INTEGER NOT NULL, rev INTEGER NOT NULL DEFAULT 0, rows TEXT NOT NULL DEFAULT '[]', PRIMARY KEY (name, part));
CREATE TABLE IF NOT EXISTS moves (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, row TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '', stale INTEGER NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS days_stale ON days(stale);
-- Les jours des commandes déjà là : à calculer une première fois.
INSERT OR IGNORE INTO days (day, stale) SELECT DISTINCT day, 1 FROM orders WHERE day != '';
