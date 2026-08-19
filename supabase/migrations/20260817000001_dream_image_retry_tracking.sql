-- 20260817000001_dream_image_retry_tracking.sql
--
-- Self-heal for dream artwork that never generated.
--
-- Image generation is a best-effort side job fired after the analysis saves.
-- A transient provider blip (429 / 5xx / timeout) leaves a finished reading
-- with a blank artwork slot. The grid retries these on load and the detail
-- view exposes a manual "Generate artwork" button — but a safe retry needs to
-- know how many times we've already tried and when, so it can:
--   * cap automatic attempts (a content-moderated prompt must not be retried
--     on every page load forever), and
--   * serialize concurrent triggers (two page loads must not both pay to
--     generate the same image) via an atomic, conditional claim on these
--     columns.
--
-- Additive, nullable/defaulted, no backfill, no downtime.

alter table public.dream_entries
  add column if not exists image_attempts integer not null default 0,
  add column if not exists image_last_attempt_at timestamptz;

comment on column public.dream_entries.image_attempts is
  'Count of image-generation attempts for this dream. Caps the automatic self-heal retry.';
comment on column public.dream_entries.image_last_attempt_at is
  'Timestamp of the most recent image-generation attempt. Drives the self-heal cooldown / race guard.';
