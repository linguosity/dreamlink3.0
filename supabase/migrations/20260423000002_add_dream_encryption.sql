-- App-layer AES-256-GCM encryption for privacy-sensitive dream content.
-- See lib/crypto.ts for the wire format. Ciphertext is stored base64-encoded
-- as TEXT (not bytea) to keep PostgREST JSON serialization simple and avoid
-- driver quirks around bytea hex representation.

-- New rows use the *_enc columns. Existing rows keep their plaintext columns
-- untouched per the "skip existing data" migration policy. The API layer
-- (decryptDreamRow) transparently handles both cases on read.

ALTER TABLE dream_entries
  ADD COLUMN IF NOT EXISTS original_text_enc text,
  ADD COLUMN IF NOT EXISTS raw_analysis_enc  text;

-- original_text was NOT NULL since creation; new encrypted rows leave it NULL.
ALTER TABLE dream_entries
  ALTER COLUMN original_text DROP NOT NULL;

COMMENT ON COLUMN dream_entries.original_text_enc IS
  'AES-256-GCM encrypted raw dream text. Base64 of [version(1) || iv(12) || tag(16) || ciphertext]. See lib/crypto.ts.';
COMMENT ON COLUMN dream_entries.raw_analysis_enc IS
  'AES-256-GCM encrypted full AI analysis JSON. Base64 of [version(1) || iv(12) || tag(16) || ciphertext]. See lib/crypto.ts.';

-- chatgpt_interactions was storing the dream text (in `prompt`) and analysis
-- JSON (in `response`) verbatim — a duplicate of the content now encrypted in
-- dream_entries.*_enc. Drop the NOT NULL so we can stop writing it; audit
-- metadata (model, temperature, dream_entry_id, created_at) continues to be
-- populated for observability.
ALTER TABLE chatgpt_interactions
  ALTER COLUMN prompt   DROP NOT NULL,
  ALTER COLUMN response DROP NOT NULL;
