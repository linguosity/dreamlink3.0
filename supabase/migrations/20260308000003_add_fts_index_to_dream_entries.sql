-- supabase/migrations/20260308000003_add_fts_index_to_dream_entries.sql
--
-- Add full-text search capability to dream_entries table
-- This migration creates a tsvector column for efficient text search
-- and indexes it with a GIN index for fast lookups.

-- Add full-text search vector column
-- Combines title, dream_summary, original_text, and tags with weighted importance
-- A = highest weight (title), B = medium weight, C = lower weight
ALTER TABLE dream_entries
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(dream_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(original_text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B')
) STORED;

-- Create GIN index for fast full-text search queries
CREATE INDEX IF NOT EXISTS dream_entries_search_idx ON dream_entries USING GIN (search_vector);

-- Create index on user_id and created_at for common filtering patterns
CREATE INDEX IF NOT EXISTS dream_entries_user_created_idx ON dream_entries (user_id, created_at DESC);
