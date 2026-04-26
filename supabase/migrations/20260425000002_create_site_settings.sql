-- Site settings: small key/value store for runtime-toggleable flags an admin
-- can flip without a redeploy. First use case is `coming_soon_enabled` for
-- the pre-launch splash gate.
--
-- Pattern is intentionally generic so future flags (`new_signups_paused`,
-- `image_generation_disabled`, etc.) can land as new rows instead of new
-- columns.

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed the coming-soon flag in the OFF position so this migration is safe to
-- run without immediately gating production. The admin UI flips it on when
-- ready.
INSERT INTO site_settings (key, value)
VALUES ('coming_soon_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS: service-role reads/writes (used by middleware + admin server actions).
-- Admin reads/writes via authenticated client are not needed because the
-- admin UI uses the admin client server-side.
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read site_settings"
  ON site_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid()
        AND profile.is_admin = true
    )
  );

CREATE POLICY "Admins can update site_settings"
  ON site_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid()
        AND profile.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid()
        AND profile.is_admin = true
    )
  );

CREATE POLICY "Admins can insert site_settings"
  ON site_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid()
        AND profile.is_admin = true
    )
  );
