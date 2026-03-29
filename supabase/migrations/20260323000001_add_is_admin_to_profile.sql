-- Add is_admin flag to profile table for admin dashboard access
ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_profile_is_admin ON public.profile (is_admin) WHERE is_admin = true;

-- Helper function to check admin status without triggering RLS recursion.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile
    WHERE user_id = check_user_id AND is_admin = true
  );
$$;

-- RLS: admins can read all profiles (needed for admin dashboard)
CREATE POLICY "Admins can read all profiles"
  ON public.profile
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS: admins can read all dream_entries (needed for metrics)
CREATE POLICY "Admins can read all dream entries"
  ON public.dream_entries
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS: admins can read all subscriptions (needed for revenue metrics)
CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS: admins can read all chatgpt_interactions (needed for usage metrics)
CREATE POLICY "Admins can read all chatgpt interactions"
  ON public.chatgpt_interactions
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS: admins can read all payments (needed for revenue metrics)
CREATE POLICY "Admins can read all payments"
  ON public.payments
  FOR SELECT
  USING (public.is_admin(auth.uid()));
