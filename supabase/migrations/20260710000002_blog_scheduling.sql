-- ============================================================
-- Blog scheduling — lazy publish, no cron
-- ------------------------------------------------------------
-- Adds status='scheduled' + scheduled_for. There is NO cron job
-- flipping rows to 'published': a scheduled post becomes publicly
-- visible the moment now() passes scheduled_for, because the
-- public-read RLS policy (and every public query in lib/blog.ts,
-- app/sitemap.ts) checks:
--
--   status = 'published' OR (status = 'scheduled' AND scheduled_for <= now())
--
-- Works on Vercel Hobby with zero background jobs. The effective
-- publish date for ordering/display is COALESCE(published_at,
-- scheduled_for) — see effectivePublishedAt() in lib/blog.ts.
-- ============================================================

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Extend the status CHECK to allow 'scheduled'. The original inline
-- CHECK on the column got the default constraint name.
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'scheduled', 'published'));

-- Replace the public-read policy: published posts, plus scheduled
-- posts whose go-live time has passed (lazy publish).
DROP POLICY IF EXISTS "blog_posts_public_read" ON blog_posts;
CREATE POLICY "blog_posts_public_read" ON blog_posts
  FOR SELECT USING (
    status = 'published'
    OR (status = 'scheduled' AND scheduled_for <= now())
  );

-- Fast lookups of due/undue scheduled posts.
CREATE INDEX IF NOT EXISTS blog_posts_scheduled_idx
  ON blog_posts (status, scheduled_for);
