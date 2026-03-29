-- Dream prompts table: stores admin-editable prompt templates with versioning
CREATE TABLE IF NOT EXISTS dream_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Structured prompt fields
  system_message TEXT NOT NULL DEFAULT 'You are a biblical dream interpreter who provides concise analysis with scripture references.',
  main_instructions TEXT NOT NULL DEFAULT '',
  format_instructions TEXT NOT NULL DEFAULT '',
  forbidden_phrases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Per-reading-level instructions
  reading_level_radiant_clarity TEXT NOT NULL DEFAULT '',
  reading_level_celestial_insight TEXT NOT NULL DEFAULT '',
  reading_level_prophetic_wisdom TEXT NOT NULL DEFAULT '',
  reading_level_divine_revelation TEXT NOT NULL DEFAULT '',

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT  -- optional note about what changed in this version
);

-- Only one prompt can be active at a time
CREATE UNIQUE INDEX idx_dream_prompts_active ON dream_prompts (is_active) WHERE is_active = true;

-- Fast lookups by version
CREATE INDEX idx_dream_prompts_version ON dream_prompts (version DESC);

-- RLS: only admins can read/write
ALTER TABLE dream_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dream_prompts"
  ON dream_prompts
  FOR ALL
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

-- Service role (used by the analysis API) can always read
CREATE POLICY "Service role can read dream_prompts"
  ON dream_prompts
  FOR SELECT
  USING (true);

-- Seed the first version with the current hardcoded prompt
INSERT INTO dream_prompts (
  version,
  is_active,
  system_message,
  main_instructions,
  format_instructions,
  forbidden_phrases,
  reading_level_radiant_clarity,
  reading_level_celestial_insight,
  reading_level_prophetic_wisdom,
  reading_level_divine_revelation,
  notes
) VALUES (
  1,
  true,
  'You are a biblical dream interpreter who provides concise analysis with scripture references.',

  E'You are a dream interpreter specializing in Christian biblical interpretation.\n\nAnalyze the following dream, connecting it to biblical themes, symbols, and scriptures.\n\nAdditional instruction:\n- Keep each supporting point brief but insightful\n- Include biblical references (one per supporting point)\n- Ensure each supporting point has logical connection to the dream content\n- Use parenthetical citations (Book Chapter:Verse)\n- Make the concluding sentence actionable but gentle\n- Personalize the one-sentence summary to speak directly to the dreamer about their spiritual journey\n- Additionally, provide the full Bible verse text for each citation as shown in the example: Genesis 1:1 -> "In the beginning God created the heaven and the earth."',

  E'Format your analysis using this exact structure:\n1. Start with a topic sentence that captures the main spiritual theme without using forbidden phrases. Instead, directly state what the dream reveals, represents, or contains.\n2. Provide 1-3 supporting points based on what best explains the dream''s meaning (not always exactly 3). Each point should include a direct Bible citation in parentheses.\n3. End with a concluding sentence that provides guidance based on the dream''s meaning.\n4. Create a personalized summary that addresses the dreamer directly about their dream''s significance using vivid language - just one compelling sentence.\n5. Generate a clever, memorable title (3-6 words) that captures the essence of the dream and its spiritual meaning, making it easy for the dreamer to identify this dream later (e.g., "Walking on Sacred Waters", "The Golden Key Vision", "Angels in the Storm").\n6. Generate 3-5 meaningful tags that capture the dream''s key themes, symbols, emotions, or spiritual concepts (e.g., "transformation", "divine guidance", "fear", "water symbolism", "spiritual growth").\n\nExample format:\n"God''s promise of provision shines through times of uncertainty in this dream. The water symbolizes God''s spirit bringing renewal (Isaiah 44:3), while the mountain represents the challenges you''re facing (Zechariah 4:7). Consider how God might be preparing you for upcoming changes that require faith and trust."',

  ARRAY[
    'This dream is about',
    'Your dream is about',
    'This dream symbolizes',
    'This dream represents'
  ],

  E'- Use simple, clear language suitable for a young reader (3rd grade level)\n- Use short sentences with basic vocabulary\n- Explain biblical concepts in simple terms\n- Use everyday examples to illustrate spiritual concepts\n- Avoid complex theological terms',

  E'- Use moderately sophisticated language (8th grade level)\n- Balance clarity with some spiritual terminology\n- Include some nuance in biblical interpretations\n- Use moderately complex sentence structures\n- Explain most theological concepts briefly',

  E'- Use advanced vocabulary and mature phrasing (12th grade level)\n- Include deeper theological insights and nuanced interpretation\n- Use varied sentence structures with proper flow\n- Reference biblical concepts with sophistication\n- Assume familiarity with common biblical themes',

  E'- Use scholarly theological language and advanced biblical terminology\n- Provide deep exegetical insights into dream symbolism\n- Reference biblical hermeneutics and interpretive frameworks\n- Include nuanced spiritual insights with theological precision\n- Use sophisticated language suitable for seminary-educated readers',

  'Initial version — seeded from hardcoded prompt'
);
