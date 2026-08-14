-- Enable pgvector.
--
-- Purpose: tag canonicalisation. Tags are written free-form by the model, so
-- "flood waters", "rising water" and "floodwater" persist as three separate
-- strings for one concept. lib/tags.ts dedupes exact lowercase matches only —
-- which is why the casing bug it documents ("divine calling" x18 vs "Divine
-- Calling" x7) was fixable there and synonymy is not. Embedding each new tag
-- and snapping it to an existing canonical is the fix, and it needs a vector
-- column to compare against.
--
-- This migration ONLY enables the extension. The canonical-tag table lands
-- with the code that uses it, so the schema and its consumer can be reviewed
-- as one change rather than leaving an unused table in production.
--
-- No billing implication: pgvector ships with every Supabase project on every
-- plan. It is a Postgres extension, not a paid add-on.
--
-- Reversible with `drop extension vector;` while nothing depends on it.

create extension if not exists vector;
