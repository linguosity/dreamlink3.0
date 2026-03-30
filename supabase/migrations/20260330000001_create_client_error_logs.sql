-- Create client_error_logs table for tracking client-side errors
-- This helps debug issues like Justin's iPhone submission problem
-- where Vercel logs expire before we can investigate.

CREATE TABLE IF NOT EXISTS client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL,           -- e.g. 'dream_submission', 'auth', 'image_generation'
  error_message text NOT NULL,
  error_context jsonb DEFAULT '{}'::jsonb, -- any extra info (route, status code, device, etc.)
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for querying recent errors
CREATE INDEX idx_client_error_logs_created_at ON client_error_logs (created_at DESC);
CREATE INDEX idx_client_error_logs_user_id ON client_error_logs (user_id);

-- RLS: users can insert their own errors, admins can read all
ALTER TABLE client_error_logs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert error logs
CREATE POLICY "Users can insert their own error logs"
  ON client_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all error logs
CREATE POLICY "Admins can read all error logs"
  ON client_error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid()
      AND profile.is_admin = true
    )
  );
