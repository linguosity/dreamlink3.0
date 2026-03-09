-- Add preferences column to profile table
-- Stores user settings like emailNotifications, darkMode, dreamReminders, etc.
ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
