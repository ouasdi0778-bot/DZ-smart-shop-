-- DZ Smart Shop sur Cloudflare D1 : la base de données (remplace l'onglet Commandes comme source).
-- Une commande = une ligne : les champs utiles aux recherches en colonnes (avec index),
-- et la commande entière en JSON (mêmes champs que les colonnes du classeur).

CREATE TABLE IF NOT EXISTS orders (
  id        TEXT PRIMARY KEY,
  rev       INTEGER NOT NULL DEFAULT 0,      -- version : deux personnes ne peuvent pas écraser la même commande
  stage     TEXT NOT NULL DEFAULT 'todo',    -- todo | other | confirmed | transit | delivered | returned | cancelled
  status    TEXT NOT NULL DEFAULT '',
  day       TEXT NOT NULL DEFAULT '',        -- jour de la commande (aaaa-mm-jj, heure d'Algérie)
  date      TEXT NOT NULL DEFAULT '',        -- date de la commande (ISO)
  phone     TEXT NOT NULL DEFAULT '',
  wilaya    TEXT NOT NULL DEFAULT '',
  agent     TEXT NOT NULL DEFAULT '',
  product   TEXT NOT NULL DEFAULT '',
  total     REAL NOT NULL DEFAULT 0,
  callback  TEXT NOT NULL DEFAULT '',        -- prochain rappel (ISO)
  carrier   TEXT NOT NULL DEFAULT '',
  tracking  TEXT NOT NULL DEFAULT '',
  updated   TEXT NOT NULL DEFAULT '',
  archived  INTEGER NOT NULL DEFAULT 0,      -- 1 : venue de l'onglet Archive du classeur
  seq       INTEGER NOT NULL DEFAULT 0,      -- ordre d'arrivée (ligne du classeur)
  search    TEXT NOT NULL DEFAULT '',        -- n°, client, téléphone, commune, produit, suivi, wilaya (sans accents)
  data      TEXT NOT NULL DEFAULT '{}',
  track     INTEGER NOT NULL DEFAULT 0       -- 1 : colis Ecotrack à suivre (statuts, argent, retour)
);
CREATE INDEX IF NOT EXISTS orders_stage ON orders(stage, callback);
CREATE INDEX IF NOT EXISTS orders_day ON orders(day, status);
CREATE INDEX IF NOT EXISTS orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS orders_tracking ON orders(tracking);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS orders_track ON orders(track);
CREATE INDEX IF NOT EXISTS orders_updated ON orders(updated);

-- Réglages, tarifs, équipe, clients, produits : tels que l'outil les calcule (JSON), un par clé.
CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL DEFAULT '');

-- Petites valeurs de l'outil (équivalent des propriétés du script).
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS journal (
  at TEXT NOT NULL, who TEXT NOT NULL DEFAULT '', order_id TEXT NOT NULL DEFAULT '', action TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS journal_at ON journal(at);

CREATE TABLE IF NOT EXISTS trash (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, deleted_at TEXT NOT NULL, deleted_by TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS blocked (id TEXT PRIMARY KEY, at TEXT NOT NULL, by TEXT NOT NULL DEFAULT '');

-- Commandes modifiées, pour recopier les changements dans le classeur Google.
CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'update', at TEXT NOT NULL, info TEXT NOT NULL DEFAULT '');

-- Garde-fou : une écriture qui ne trouve pas la version attendue de la commande annule tout l'enregistrement.
CREATE TABLE IF NOT EXISTS guard (ok INTEGER CHECK (ok > 0));
