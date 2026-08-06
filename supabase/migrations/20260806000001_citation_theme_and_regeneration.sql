-- 20260806000001_citation_theme_and_regeneration.sql
--
-- Two additive, independent schema pieces for HANDOFF-v3.md §5
-- ("AI transparency — required, not optional"):
--
-- 1. bible_citations.theme
--    Item 2, "Themed verse citations": each scripture citation should carry
--    the short theme it was matched on ("Isaiah 43:2 · crossing waters"),
--    rendered next to the reference itself rather than hidden behind a
--    tooltip/popover. The model is now asked for this alongside the
--    citation (see lib/openai.ts's BiblicalReferenceSchema and
--    lib/dreamAnalysis.ts's prompt instructions) and it is persisted here
--    by app/api/dream-entries/route.ts and app/api/dream-entries/[id]/
--    regenerate/route.ts. Nullable: existing citation rows, and any future
--    row where the model omits a theme, simply render without one (the UI
--    falls back to the bare reference).
--
-- 2. dream_entries.regeneration_count / last_regenerated_at
--    Item 4, "Re-generation": "Read again · 1 credit". Re-running an
--    existing interpretation doesn't create a new dream_entries row (it is
--    the same dream), so lib/monthlyCredits.ts's existing row-count gate —
--    which governs dream *creation* and is left completely untouched here
--    — can't see it. Rather than build a full monthly-resetting ledger for
--    this one action, app/api/dream-entries/[id]/regenerate additionally
--    caps regenerations per dream (regeneration_count) on top of requiring
--    the account to already be within its normal plan-level credit
--    allowance. This is a deliberate simplification — see that route's own
--    comment and the rebrand handoff report for the tradeoff — but it is
--    enough to ship a working, abuse-bounded "Read again" today.
--
-- No RLS change required for either column: bible_citations and
-- dream_entries already restrict select/update to the owning user (see
-- 20260307000001_add_rls_policies.sql), and these are additive
-- nullable/defaulted columns that inherit those existing policies.

alter table public.bible_citations
  add column if not exists theme text;

comment on column public.bible_citations.theme is
  'Short phrase (2-4 words) naming why this verse was matched to the dream, e.g. "crossing waters" for Isaiah 43:2. Rendered next to the citation itself, not behind a tooltip (HANDOFF-v3.md S5 item 2). Null for citations recorded before this column existed, or when the model omits one.';

alter table public.dream_entries
  add column if not exists regeneration_count integer not null default 0;

alter table public.dream_entries
  add column if not exists last_regenerated_at timestamptz;

comment on column public.dream_entries.regeneration_count is
  'How many times this dream''s interpretation has been re-run via "Read again" (HANDOFF-v3.md S5 item 4). Gates a small per-dream ceiling in app/api/dream-entries/[id]/regenerate, in addition to (not instead of) the account''s normal credit allowance from lib/monthlyCredits.ts, which counts dream_entries rows and does not itself see regenerations.';

comment on column public.dream_entries.last_regenerated_at is
  'Timestamp of the most recent "Read again" re-run, if any. Null until the first regeneration.';
