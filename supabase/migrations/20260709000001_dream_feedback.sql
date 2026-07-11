-- ============================================================
-- One-tap interpretation feedback
-- ------------------------------------------------------------
-- "Was this reading meaningful?" Yes/No shown at the end of each
-- interpretation (owner-only, in DreamCard's analysis view).
--
--   meaningful   null = no vote yet; true/false = latest vote.
--   feedback_at  when the latest vote was cast; re-votes overwrite
--                both columns (idempotent by design).
--
-- Owner-only state — existing RLS on dream_entries already scopes
-- both SELECT and UPDATE to auth.uid() = user_id, so a user can
-- only ever rate their own dreams. The public share path
-- (lib/sharedDream.ts) whitelists columns and never exposes these.
-- ============================================================

ALTER TABLE dream_entries
  ADD COLUMN IF NOT EXISTS meaningful boolean;

ALTER TABLE dream_entries
  ADD COLUMN IF NOT EXISTS feedback_at timestamptz;
