-- ============================================================
-- profile.timezone + profile.reminder_hour — reminder scheduling
-- ------------------------------------------------------------
-- Consumed by the hourly morning-reminder cron
-- (app/api/cron/morning-reminders/route.ts):
--
--   timezone       IANA zone name (e.g. 'America/Phoenix'). NULL = unknown →
--                  the cron falls back to its 13:00 UTC run (~6–9am across
--                  the continental US).
--   reminder_hour  Preferred LOCAL send hour, 0–23 (only meaningful when
--                  timezone is set). NULL = not set → the cron falls back to
--                  the hour of the legacy JSONB preference
--                  (preferences->>'reminderTime', an "HH:MM" wall-clock
--                  string from the settings UI), then to 7 (7am local).
--
-- Both columns default NULL on purpose: silently guessing a wrong timezone
-- is worse than the documented UTC fallback. The settings UI does not write
-- these yet — the columns exist so it can adopt them without another
-- migration.
-- ============================================================

ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS reminder_hour smallint
    CONSTRAINT profile_reminder_hour_range
    CHECK (reminder_hour >= 0 AND reminder_hour <= 23);

COMMENT ON COLUMN profile.timezone IS
  'IANA timezone (e.g. America/Phoenix) for reminder scheduling. NULL = unknown; the reminder cron falls back to its 13:00 UTC run.';
COMMENT ON COLUMN profile.reminder_hour IS
  'Preferred local hour (0-23) for the morning dream reminder. NULL = fall back to preferences->>''reminderTime'', then 7.';
