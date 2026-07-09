-- Account deletion prerequisites (self-serve deletion, 2026-07-08).
--
-- Deleting a row from auth.users must cascade cleanly. Audit of existing FKs:
--   dream_entries.user_id                → ON DELETE CASCADE  (20250204054754) ✓
--   profile.user_id                      → ON DELETE CASCADE  (20250204054754) ✓
--   subscriptions.user_id                → ON DELETE CASCADE  (20250204054754) ✓
--   payments.user_id                     → ON DELETE CASCADE  (20250204054754) ✓
--   bible_citations.dream_entry_id       → CASCADE via dream_entries          ✓
--   chatgpt_interactions.dream_entry_id  → CASCADE via dream_entries          ✓
--   client_error_logs.user_id            → ON DELETE SET NULL (20260330000001) ✓
--
-- Two FKs were created with NO delete action (Postgres default: NO ACTION),
-- which makes auth.admin.deleteUser() fail with an FK violation for any user
-- who has authored a dream prompt or touched site settings (i.e. admins):
--   dream_prompts.created_by   (20260329000001)
--   site_settings.updated_by   (20260425000002)
--
-- Both columns point at GLOBAL content that must outlive its author, so we
-- use ON DELETE SET NULL (both columns are already nullable), not CASCADE.

ALTER TABLE dream_prompts
  DROP CONSTRAINT IF EXISTS dream_prompts_created_by_fkey;

ALTER TABLE dream_prompts
  ADD CONSTRAINT dream_prompts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE site_settings
  DROP CONSTRAINT IF EXISTS site_settings_updated_by_fkey;

ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
