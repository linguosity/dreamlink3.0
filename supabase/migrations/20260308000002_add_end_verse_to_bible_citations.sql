-- Add end_verse column to bible_citations for verse ranges (e.g., "James 1:14-15")
-- This allows storing the end verse directly from OpenAI's structured response
-- instead of parsing it from the citation string with regex.

ALTER TABLE bible_citations
  ADD COLUMN IF NOT EXISTS end_verse INT DEFAULT NULL;

COMMENT ON COLUMN bible_citations.end_verse IS
  'End verse for verse ranges (e.g., 15 for "1:14-15"), NULL for single verses';
