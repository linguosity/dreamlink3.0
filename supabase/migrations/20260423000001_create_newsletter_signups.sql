-- Newsletter signups captured from the public landing page footer form.
-- Writes happen via /api/subscribe using the service-role (admin) client,
-- so RLS is enabled with no policies — only the service role can read/write.

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text DEFAULT 'landing_footer',
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_newsletter_signups_created_at ON newsletter_signups (created_at DESC);

ALTER TABLE newsletter_signups ENABLE ROW LEVEL SECURITY;
-- No policies: service-role bypasses RLS; anon/authenticated cannot read.
