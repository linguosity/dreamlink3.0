-- Seed the landing-page testimonials into the generic site_settings store.
-- Admins edit these from the admin console (System settings). Placeholder copy
-- ships so the social-proof slot is never empty pre-launch.

INSERT INTO site_settings (key, value)
VALUES (
  'testimonials',
  '[
    {"quote": "I''ve never understood my dreams like this before — every reading points me back to scripture.", "author": "Emily M."},
    {"quote": "DreamRiver has become part of my morning devotion. It''s uncanny how relevant the verses are.", "author": "James T."},
    {"quote": "A gentle, faithful way to reflect on what God might be saying while I sleep.", "author": "Sarah R."}
  ]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
