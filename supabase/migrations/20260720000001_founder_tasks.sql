-- ============================================================
-- Founder tasks — weekly checklist surfaced on /admin
-- ------------------------------------------------------------
-- Rows are seeded from the Monday brief (briefs/YYYY-MM-DD-monday-brief.md)
-- by scripts/seed-founder-tasks.mjs, which upserts on (week, title) and
-- NEVER touches done_at — check-offs in the dashboard are the source of
-- truth for completion. The card on /admin shows the latest week only.
--
--   week     the brief date the task came from (Monday)
--   owner    'B' (Brandon) | 'J' (Justin) | 'BJ' (both/either)
--   kind     'priority' (numbered This-week items) | 'waiting_on'
--   done_at  null = open; set when checked off in the admin card
--   done_by  email of the admin who checked it off
-- ============================================================

CREATE TABLE IF NOT EXISTS founder_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week date NOT NULL,
  owner text NOT NULL CHECK (owner IN ('B', 'J', 'BJ')),
  kind text NOT NULL DEFAULT 'priority' CHECK (kind IN ('priority', 'waiting_on')),
  title text NOT NULL,
  detail text,
  sort int NOT NULL DEFAULT 0,
  done_at timestamptz,
  done_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week, title)
);

CREATE INDEX IF NOT EXISTS founder_tasks_week_idx
  ON founder_tasks (week DESC, kind, sort);

ALTER TABLE founder_tasks ENABLE ROW LEVEL SECURITY;

-- Admin-only, both read and write. No public policy — this is internal ops
-- state. The seeder uses the service role (bypasses RLS).
CREATE POLICY "founder_tasks_admin_all" ON founder_tasks
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
