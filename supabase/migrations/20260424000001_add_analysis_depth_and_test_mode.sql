-- Adds the analysis-depth tier feature plus an admin "test mode" that fans
-- out a single dream submission across multiple settings combinations so
-- the admin can compare outputs side-by-side.
--
-- Tier names are water-themed to match DreamRiver branding:
--   shallow    — free for everyone (current behavior)
--   deep       — visionary plan
--   profound   — prophet plan (and admins)
--
-- Reading-level + image-aesthetic dimensions are also recorded per dream
-- row so comparison groups can vary along multiple axes simultaneously.

-- ── profile: per-user depth preference + admin test-mode config ────────
ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS analysis_depth text DEFAULT 'shallow',
  ADD COLUMN IF NOT EXISTS test_mode_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_mode_depths text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS test_mode_reading_levels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS test_mode_aesthetics text[] DEFAULT '{}';

ALTER TABLE public.profile
  ADD CONSTRAINT profile_analysis_depth_check
  CHECK (analysis_depth IN ('shallow', 'deep', 'profound'));

COMMENT ON COLUMN public.profile.analysis_depth IS
  'User preferred depth tier. Server clamps to the user''s plan ceiling.';
COMMENT ON COLUMN public.profile.test_mode_enabled IS
  'Admin-only. When true with non-empty test_mode_* arrays, dream submissions fan out across all selected combinations.';
COMMENT ON COLUMN public.profile.test_mode_depths IS
  'Admin-only. Subset of {shallow,deep,profound} to compare. Empty = use saved analysis_depth only.';

-- ── dream_entries: capture which settings produced each row ────────────
-- These are nullable to keep legacy rows untouched per the "skip existing
-- data" migration policy. The API layer treats NULL as the legacy default.
ALTER TABLE public.dream_entries
  ADD COLUMN IF NOT EXISTS analysis_depth text,
  ADD COLUMN IF NOT EXISTS reading_level_used text,
  ADD COLUMN IF NOT EXISTS image_aesthetic_used text,
  ADD COLUMN IF NOT EXISTS comparison_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_dream_entries_comparison_group
  ON public.dream_entries (comparison_group_id)
  WHERE comparison_group_id IS NOT NULL;

COMMENT ON COLUMN public.dream_entries.analysis_depth IS
  'Depth tier (shallow|deep|profound) used for this row''s analysis.';
COMMENT ON COLUMN public.dream_entries.reading_level_used IS
  'Reading level used to generate this row''s analysis (snapshot, not a live preference).';
COMMENT ON COLUMN public.dream_entries.image_aesthetic_used IS
  'Image aesthetic used to generate this row''s image (snapshot).';
COMMENT ON COLUMN public.dream_entries.comparison_group_id IS
  'Shared id linking rows produced from the same admin-test-mode submission. NULL for normal submissions.';
