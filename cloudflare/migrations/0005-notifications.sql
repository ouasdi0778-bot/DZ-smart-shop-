-- v1.12 : notifications (Web Push) : un abonnement par appareil, avec ses choix.
CREATE TABLE IF NOT EXISTS push_subs (
  id TEXT PRIMARY KEY, member TEXT NOT NULL DEFAULT '', endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  prefs TEXT NOT NULL DEFAULT '{}', device TEXT NOT NULL DEFAULT '', created TEXT NOT NULL DEFAULT '', last_ok TEXT NOT NULL DEFAULT '', fails INTEGER NOT NULL DEFAULT 0
);
