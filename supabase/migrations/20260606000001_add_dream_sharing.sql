-- ============================================================
-- Opt-in dream sharing
-- ------------------------------------------------------------
-- Dreams are private by default (RLS already scopes SELECT to the
-- owner). To share a dream, the owner explicitly opts in: this sets
-- is_public = true, mints an unguessable share_token, and records the
-- chosen share_scope ('summary' = title/summary/analysis only, or
-- 'full' = also the verbatim dream text).
--
-- Public reads NEVER use the anon client (RLS would block them) and
-- NEVER use a permissive RLS policy (that would expose every column,
-- including original_text_enc). Instead they go through a dedicated
-- service-role route that looks dreams up by share_token and returns
-- only a whitelisted set of columns, gated by share_scope. The token
-- is separate from the row id so a shared link never reveals the
-- internal primary key, and revoking (is_public = false) instantly
-- kills every link that was handed out.
-- ============================================================

ALTER TABLE dream_entries
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token uuid,
  ADD COLUMN IF NOT EXISTS share_scope text;

-- Only 'summary' or 'full' are valid scopes (NULL when not shared).
ALTER TABLE dream_entries
  DROP CONSTRAINT IF EXISTS dream_entries_share_scope_check;
ALTER TABLE dream_entries
  ADD CONSTRAINT dream_entries_share_scope_check
  CHECK (share_scope IS NULL OR share_scope IN ('summary', 'full'));

-- Tokens must be unique so a lookup resolves to exactly one dream.
CREATE UNIQUE INDEX IF NOT EXISTS dream_entries_share_token_key
  ON dream_entries (share_token)
  WHERE share_token IS NOT NULL;

-- Fast lookup for the public read path (token + is_public).
CREATE INDEX IF NOT EXISTS dream_entries_public_share_idx
  ON dream_entries (share_token)
  WHERE is_public = true;

-- NOTE: deliberately NO public SELECT RLS policy is added here.
-- Public access is mediated exclusively by the service-role
-- /api/shared-dream/[token] route, which column-filters by scope.
