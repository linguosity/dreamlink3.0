-- Add per-call usage + image cost tracking to chatgpt_interactions so the
-- admin DreamCard footer can show what each dream actually costs.
--
-- Columns:
--   input_tokens     — prompt tokens reported by OpenAI Responses API
--   output_tokens    — completion tokens reported by OpenAI Responses API
--   image_generated  — whether the dream-image route successfully stored an image
--   image_cost_usd   — USD cost we attribute to that image (set from a constant
--                      in code; logged here so we can change the constant later
--                      without rewriting history)
--
-- All columns are nullable so existing rows and rows logged before the image
-- step finishes stay valid. The image fields are populated by a separate UPDATE
-- from app/api/dream-image/route.ts once the image is persisted.

ALTER TABLE public.chatgpt_interactions
  ADD COLUMN IF NOT EXISTS input_tokens    integer,
  ADD COLUMN IF NOT EXISTS output_tokens   integer,
  ADD COLUMN IF NOT EXISTS image_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_cost_usd  numeric(10, 6);

COMMENT ON COLUMN public.chatgpt_interactions.input_tokens IS
  'Prompt tokens from response.usage.input_tokens. Used by admin cost footer.';
COMMENT ON COLUMN public.chatgpt_interactions.output_tokens IS
  'Completion tokens from response.usage.output_tokens. Used by admin cost footer.';
COMMENT ON COLUMN public.chatgpt_interactions.image_generated IS
  'True if the dream-image route successfully stored an image for this dream.';
COMMENT ON COLUMN public.chatgpt_interactions.image_cost_usd IS
  'USD attributed to the image generation (constant from utils/pricing.ts at write time).';

-- Helpful index for the admin dream-list query that joins these rows back
-- onto dream_entries by dream_entry_id.
CREATE INDEX IF NOT EXISTS chatgpt_interactions_dream_entry_id_idx
  ON public.chatgpt_interactions (dream_entry_id);
