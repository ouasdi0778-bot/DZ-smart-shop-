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

-- Étape 3 : onglets de réglages, de stock et de dépenses (Produits, Dépenses, Paramètres, Tarifs, Équipe,
-- Clients), par paquets de 250 lignes (JSON), chacun avec son n° de version.
CREATE TABLE IF NOT EXISTS tabs (name TEXT NOT NULL, part INTEGER NOT NULL, rev INTEGER NOT NULL DEFAULT 0, rows TEXT NOT NULL DEFAULT '[]', PRIMARY KEY (name, part));

-- Étape 3 : mouvements de stock (une ligne de l'onglet « Mouvements stock » par mouvement).
CREATE TABLE IF NOT EXISTS moves (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, row TEXT NOT NULL);

-- Résumé de chaque jour (Statistiques, Bénéfices) ; stale > 0 : à recalculer (une commande de ce jour a changé).
CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '', stale INTEGER NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS days_stale ON days(stale);

-- v1.11 : connexion par téléphone et mot de passe (sans Google). Mots de passe gardés chiffrés (PBKDF2).
CREATE TABLE IF NOT EXISTS auth (
  phone TEXT PRIMARY KEY, hash TEXT NOT NULL DEFAULT '', salt TEXT NOT NULL DEFAULT '', iter INTEGER NOT NULL DEFAULT 0,
  temp INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, locked TEXT NOT NULL DEFAULT '',
  rescue TEXT NOT NULL DEFAULT '', code TEXT NOT NULL DEFAULT '', code_until TEXT NOT NULL DEFAULT '', code_tries INTEGER NOT NULL DEFAULT 0,
  code_sent TEXT NOT NULL DEFAULT '[]', updated TEXT NOT NULL DEFAULT ''
);
-- Appareils connectés (30 jours) : un jeton par appareil, qu'on peut couper.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, phone TEXT NOT NULL, created TEXT NOT NULL, seen TEXT NOT NULL, device TEXT NOT NULL DEFAULT '',
  temp INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_phone ON sessions(phone);

-- v1.12 : notifications (Web Push) : un abonnement par appareil, avec ses choix (nouvelles commandes, rappels…).
CREATE TABLE IF NOT EXISTS push_subs (
  id TEXT PRIMARY KEY, member TEXT NOT NULL DEFAULT '', endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  prefs TEXT NOT NULL DEFAULT '{}', device TEXT NOT NULL DEFAULT '', created TEXT NOT NULL DEFAULT '', last_ok TEXT NOT NULL DEFAULT '', fails INTEGER NOT NULL DEFAULT 0
);
