-- v1.11 : connexion par téléphone et mot de passe (sans Google), appareils connectés.
CREATE TABLE IF NOT EXISTS auth (
  phone TEXT PRIMARY KEY, hash TEXT NOT NULL DEFAULT '', salt TEXT NOT NULL DEFAULT '', iter INTEGER NOT NULL DEFAULT 0,
  temp INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, locked TEXT NOT NULL DEFAULT '',
  rescue TEXT NOT NULL DEFAULT '', code TEXT NOT NULL DEFAULT '', code_until TEXT NOT NULL DEFAULT '', code_tries INTEGER NOT NULL DEFAULT 0,
  code_sent TEXT NOT NULL DEFAULT '[]', updated TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, phone TEXT NOT NULL, created TEXT NOT NULL, seen TEXT NOT NULL, device TEXT NOT NULL DEFAULT '',
  temp INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_phone ON sessions(phone);
