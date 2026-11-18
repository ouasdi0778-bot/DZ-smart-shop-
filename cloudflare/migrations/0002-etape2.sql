-- Étape 2 : colis à suivre (index) et détail des changements recopiés dans le classeur.
ALTER TABLE orders ADD COLUMN track INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS orders_track ON orders(track);
CREATE INDEX IF NOT EXISTS orders_updated ON orders(updated);
ALTER TABLE changes ADD COLUMN info TEXT NOT NULL DEFAULT '';
