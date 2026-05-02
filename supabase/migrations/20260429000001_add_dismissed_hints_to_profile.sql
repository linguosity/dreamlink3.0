-- One-shot UI hints (coach marks). When a user dismisses a hint, its id is
-- pushed into this array so it never auto-opens again. Empty array = nothing
-- dismissed yet (i.e. all hints eligible).
ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS dismissed_hints text[] NOT NULL DEFAULT '{}';
