-- ============================================================
-- RLS Policies for all tables
-- Ensures users can only access their own data
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE dream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatgpt_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- dream_entries
-- ============================================================
CREATE POLICY "Users can select their own dreams"
  ON dream_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dreams"
  ON dream_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dreams"
  ON dream_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dreams"
  ON dream_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- bible_citations (access flows through parent dream entry)
-- ============================================================
CREATE POLICY "Users can select citations for their dreams"
  ON bible_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dream_entries
      WHERE id = dream_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert citations for their dreams"
  ON bible_citations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dream_entries
      WHERE id = dream_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update citations for their dreams"
  ON bible_citations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dream_entries
      WHERE id = dream_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete citations for their dreams"
  ON bible_citations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dream_entries
      WHERE id = dream_entry_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- profile
-- ============================================================
CREATE POLICY "Users can select their own profile"
  ON profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profile FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- subscriptions (read-only for users; writes go via service role)
-- ============================================================
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- payments (read-only for users; writes go via service role)
-- ============================================================
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- chatgpt_interactions (access flows through parent dream entry)
-- ============================================================
CREATE POLICY "Users can select interactions for their dreams"
  ON chatgpt_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dream_entries
      WHERE id = dream_entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert interactions for their dreams"
  ON chatgpt_interactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dream_entries
      WHERE id = dream_entry_id AND user_id = auth.uid()
    )
  );
