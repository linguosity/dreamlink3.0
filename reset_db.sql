-- ============================================================
-- Dreamlink 3.0 — Full Database Reset
-- Run this in Supabase SQL Editor OR via psql to wipe and
-- re-initialize the schema before running `supabase db push`
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_extract_missing_analysis_fields ON dream_entries;

-- Drop functions
DROP FUNCTION IF EXISTS extract_missing_analysis_fields();
DROP FUNCTION IF EXISTS build_citation_reference(TEXT, INT, INT);

-- Drop tables in reverse FK dependency order
DROP TABLE IF EXISTS chatgpt_interactions CASCADE;
DROP TABLE IF EXISTS bible_citations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS dream_entries CASCADE;
DROP TABLE IF EXISTS profile CASCADE;

-- Drop migration history so supabase db push re-runs all migrations cleanly
DELETE FROM supabase_migrations.schema_migrations;

-- Confirm
SELECT 'Reset complete. Run: supabase db push' AS status;
