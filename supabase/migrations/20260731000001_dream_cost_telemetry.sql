-- 20260731000001_dream_cost_telemetry.sql
--
-- Adds per-dream cost telemetry to dream_entries.
--
-- WHY: utils/pricing.ts (buildDreamCost / openAiCostUsd) already computes an
-- admin cost footer from row.input_tokens / row.output_tokens / row.image_cost_usd
-- — but those columns have never existed on this table. The footer has been
-- reading nulls and reporting $0 since it shipped, and the 2026-07-31 model
-- cost review had to ESTIMATE every per-dream figure from code budgets
-- because there is no measured production data. This closes that gap.
--
-- model_used matters more than it looks: with per-tier overrides
-- (OPENAI_MODEL_PROFOUND) a single table can hold rows priced at Luna rates
-- ($0.20/$1.20 per 1M) and Terra rates ($2.00/$12.00 per 1M) simultaneously.
-- Without recording which model produced a row, any A/B of Profound quality
-- vs. cost is unanswerable after the fact.
--
-- All columns are NULLABLE with no default and no backfill: the ~138 existing
-- rows genuinely have no token data, and writing 0 would be worse than null
-- (it would silently read as "this dream was free"). Additive and reversible.

alter table public.dream_entries
  add column if not exists input_tokens   integer,
  add column if not exists output_tokens  integer,
  add column if not exists image_cost_usd numeric(10, 6),
  add column if not exists model_used     text;

comment on column public.dream_entries.input_tokens is
  'Prompt tokens summed across the core call and all Phase-B section calls. Null for rows predating 2026-07-31.';
comment on column public.dream_entries.output_tokens is
  'Completion tokens summed across all calls. On gpt-5.x this INCLUDES reasoning tokens, which bill at the output rate.';
comment on column public.dream_entries.image_cost_usd is
  'USD billed for this dream''s artwork. Null when no image was generated. FLUX.2 klein 9B = 0.015 at <=1 megapixel.';
comment on column public.dream_entries.model_used is
  'Model string that produced the analysis, e.g. gpt-5.6-luna. Required to price a row correctly when per-tier overrides are active.';

-- Partial index: the admin cost views only ever scan rows that have telemetry.
create index if not exists dream_entries_cost_telemetry_idx
  on public.dream_entries (created_at desc)
  where input_tokens is not null;

-- No RLS change required. dream_entries already restricts select/update to
-- the owning user (and admins via public.is_admin()); these columns inherit
-- that policy. They are cost metadata, not dream content, so they are
-- deliberately NOT included in the encrypted-at-rest column set.
