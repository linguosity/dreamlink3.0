-- ============================================================
-- Starred dreams
-- ------------------------------------------------------------
-- Lets a user "star" (favorite) a dream so it can be pulled up
-- quickly via the "Starred" gallery filter. Private, owner-only
-- state — existing RLS on dream_entries already scopes both the
-- SELECT and the UPDATE to auth.uid() = user_id, so a user can
-- only ever star/unstar their own dreams.
-- ============================================================

ALTER TABLE dream_entries
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false;

-- Partial index: the "Starred" filter only ever queries the small
-- subset of rows where is_starred = true, so index just those.
CREATE INDEX IF NOT EXISTS dream_entries_starred_idx
  ON dream_entries (user_id)
  WHERE is_starred = true;
