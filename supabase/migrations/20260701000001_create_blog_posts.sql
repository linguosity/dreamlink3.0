-- ============================================================
-- Blog posts — in-app authoring for non-technical admins (SEO blog)
-- ------------------------------------------------------------
-- Content is stored as Markdown; the admin editor provides a
-- WYSIWYG-ish toolbar but persists plain Markdown so posts stay
-- portable. Public pages render published posts server-side.
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,                        -- short teaser, also default meta description
  content_md text NOT NULL DEFAULT '', -- Markdown body
  cover_image_url text,
  author_name text NOT NULL DEFAULT 'DreamRiver Team',
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  -- SEO overrides (fall back to title/excerpt when null)
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fast public queries: newest published first.
CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON blog_posts (status, published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (anon included) can read published posts.
CREATE POLICY "blog_posts_public_read" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Admins can do everything (read drafts, write, delete).
CREATE POLICY "blog_posts_admin_all" ON blog_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid() AND profile.is_admin
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid() AND profile.is_admin
    )
  );

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION set_blog_posts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_blog_posts_updated_at();
