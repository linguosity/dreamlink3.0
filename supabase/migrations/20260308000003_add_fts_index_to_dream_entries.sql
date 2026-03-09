-- supabase/migrations/20260308000003_add_fts_index_to_dream_entries.sql
--
-- Add full-text search capability to dream_entries table
-- Uses a trigger to maintain the tsvector column since generated columns
-- require immutable expressions and to_tsvector('english', ...) is not immutable.

-- Add the tsvector column (not generated — maintained by trigger)
ALTER TABLE dream_entries
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create an immutable helper function for building the search vector
CREATE OR REPLACE FUNCTION dream_entries_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.dream_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.original_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fire on INSERT and UPDATE
CREATE TRIGGER dream_entries_search_vector_trigger
  BEFORE INSERT OR UPDATE ON dream_entries
  FOR EACH ROW
  EXECUTE FUNCTION dream_entries_search_vector_update();

-- Backfill existing rows
UPDATE dream_entries SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(dream_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(original_text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B');

-- Create GIN index for fast full-text search queries
CREATE INDEX IF NOT EXISTS dream_entries_search_idx ON dream_entries USING GIN (search_vector);

-- Create index on user_id and created_at for common filtering patterns
CREATE INDEX IF NOT EXISTS dream_entries_user_created_idx ON dream_entries (user_id, created_at DESC);
