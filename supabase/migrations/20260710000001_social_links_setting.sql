-- Social links for the landing footer, stored in the generic site_settings
-- store (key = 'social_links') so an admin can paste real profile URLs from
-- the admin console without a deploy — same pattern as the coming-soon flag
-- and testimonials.
--
-- Value shape: JSONB object mapping platform key -> https profile URL, e.g.
--   {"x": "https://x.com/dreamriver", "instagram": "https://instagram.com/dreamriver"}
-- Platforms with no (or a blank) URL simply don't render an icon. Seeded
-- empty so every icon stays hidden until a real URL is saved in /admin.

INSERT INTO site_settings (key, value)
VALUES ('social_links', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS: the landing footer renders for anonymous visitors and reads this key
-- through the anon-key client, so it needs a public SELECT.
--
-- PUBLIC-KEYS PATTERN: site_settings stays admin/service-role-only by
-- default (policies from 20260425000002_create_site_settings.sql). The keys
-- named in the policy below are the explicit exceptions — they may contain
-- ONLY public marketing content, never secrets or user data. To expose a
-- future key publicly, re-create this policy in a new migration with the key
-- added to the IN (...) list.
--
-- Writes stay admin-only: this policy is SELECT-only and the existing
-- admin-only INSERT/UPDATE policies are untouched.
DROP POLICY IF EXISTS "Public can read public site_settings keys" ON site_settings;
CREATE POLICY "Public can read public site_settings keys"
  ON site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('social_links'));
