-- Add image_aesthetic column to profile table
-- Stores the user's preferred AI image style (maps to ImageAesthetic enum)
ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS image_aesthetic TEXT DEFAULT 'sacred_oil_painting';
