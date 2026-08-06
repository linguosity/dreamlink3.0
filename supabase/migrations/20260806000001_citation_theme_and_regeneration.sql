-- 20260806000001_citation_theme_and_regeneration.sql
--
-- Two additive schema pieces for HANDOFF-v3.md §5 ("AI transparency —
-- required, not optional").
--
-- ⚠ DEPLOY ORDER: apply this migration BEFORE deploying the code that reads
--   it. app/api/bible-verses/lookup selects bible_citations.theme; against a
--   database without that column PostgREST rejects the whole select and the
--   scripture popovers go quiet. The credit path is deliberately more
--   forgiving — see the note on credit_spends below — but the citation path
--   is not, so migrate first.
--
-- ────────────────────────────────────────────────────────────────────
-- 1. bible_citations.theme
--
-- §5 item 2, "Themed verse citations": each scripture citation carries the
-- short theme it was matched on ("Isaiah 43:2 · crossing waters"), rendered
-- beside the reference itself rather than hidden behind a tooltip. The model
-- is now asked for it alongside the citation (lib/openai.ts's
-- BiblicalReferenceSchema, lib/dreamAnalysis.ts's prompts) and it is
-- persisted by lib/analysisPersistence.ts.
--
-- Nullable by design: the ~all existing citation rows predate the column and
-- will never have one, and a model that skips it must not break the render.
-- The UI falls back to the bare reference.
--
-- ────────────────────────────────────────────────────────────────────
-- 2. credit_spends
--
-- §5 item 4, "Re-generation": the "Read again · 1 credit" button. That label
-- has to be true, and today it cannot be: lib/monthlyCredits.ts measures
-- usage by COUNTING dream_entries rows, and re-reading a dream updates a row
-- rather than inserting one. A re-run would therefore be silently free —
-- which is the same class of dishonesty as §5 item 3's "never disclose cost
-- after deduction", pointed the other way.
--
-- Rather than rebuild credit accounting (a change to the live money path,
-- and out of scope for a rebrand), this adds a narrow ledger for spends that
-- are NOT a new dream row. checkMonthlyCredits() now reports
--     used = (dream_entries rows in window) + (credit_spends rows in window)
-- using the identical window for both: lifetime for free (credits are granted
-- once at signup and never refresh), current calendar month for paid.
--
-- Deliberately fail-soft on the read side: if this table is missing or the
-- count query errors, lib/monthlyCredits.ts logs and treats ledger spend as
-- zero rather than failing the free tier closed. Applying a migration and
-- shipping code are separate human actions; a gap between them must not lock
-- every free user out of creating dreams. The WRITE side (the re-generation
-- route) fails closed instead — it records the spend before calling the
-- model, and aborts if it cannot.
--
-- `kind` is text rather than an enum so a future non-dream spend (a re-drawn
-- image, say) is an insert, not a migration.
-- ────────────────────────────────────────────────────────────────────

alter table public.bible_citations
  add column if not exists theme text;

comment on column public.bible_citations.theme is
  'Short phrase (2-4 words) naming why this verse was matched to the dream, e.g. "crossing waters" for Isaiah 43:2. Rendered next to the citation itself, not behind a tooltip (HANDOFF-v3.md S5 item 2). Null for citations recorded before this column existed, or when the model omits one.';

create table if not exists public.credit_spends (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  dream_entry_id uuid references public.dream_entries (id) on delete set null,
  kind           text not null default 'regeneration',
  created_at     timestamptz not null default now()
);

comment on table public.credit_spends is
  'Ledger of credits spent by actions that do NOT create a dream_entries row. Counted alongside the dream row count by lib/monthlyCredits.ts, so "Read again - 1 credit" (HANDOFF-v3.md S5 item 4) actually costs one credit.';
comment on column public.credit_spends.dream_entry_id is
  'The dream this spend re-read. ON DELETE SET NULL: deleting a dream must not refund credits already spent on it.';
comment on column public.credit_spends.kind is
  'What was bought. Currently only "regeneration". Text, not an enum, so a new spend type is an insert rather than a migration.';

-- The only read pattern is "count this user's spends, optionally since the
-- start of the month", on the hot path of every dream submission.
create index if not exists credit_spends_user_created_idx
  on public.credit_spends (user_id, created_at desc);

alter table public.credit_spends enable row level security;

-- Users may read their own spend history (a future "where did my credits go"
-- surface). Nobody may INSERT/UPDATE/DELETE through an anon/authenticated
-- key: rows are written exclusively by the server via the service-role
-- client, which bypasses RLS. A user who could insert here could not gain
-- credits, but a user who could DELETE could refund themselves, so no write
-- policy is granted at all.
drop policy if exists "credit_spends_select_own" on public.credit_spends;
create policy "credit_spends_select_own"
  on public.credit_spends
  for select
  using (auth.uid() = user_id);
