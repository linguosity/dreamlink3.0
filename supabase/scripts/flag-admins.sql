-- ============================================
-- Step 1: Add the is_admin column (if not already there)
-- ============================================
ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_profile_is_admin ON public.profile (is_admin) WHERE is_admin = true;

-- ============================================
-- Step 2: Flag admin users by email
-- ============================================

-- Brandon (gmail)
UPDATE public.profile
SET is_admin = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'brandon.c.brewer@gmail.com'
);

-- Brandon (linguosity)
UPDATE public.profile
SET is_admin = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'brandon@linguosity.ai'
);

-- Justin
UPDATE public.profile
SET is_admin = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'JustinBrewer@kingdomheirsflag.org'
);

-- ============================================
-- Step 3: Add RLS policies so admins can see all data
-- ============================================

-- Admins can read all profiles
DO $$ BEGIN
  CREATE POLICY "Admins can read all profiles"
    ON public.profile FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profile p
        WHERE p.user_id = auth.uid() AND p.is_admin = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read all dream entries
DO $$ BEGIN
  CREATE POLICY "Admins can read all dream entries"
    ON public.dream_entries FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profile p
        WHERE p.user_id = auth.uid() AND p.is_admin = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read all subscriptions
DO $$ BEGIN
  CREATE POLICY "Admins can read all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profile p
        WHERE p.user_id = auth.uid() AND p.is_admin = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read all chatgpt interactions
DO $$ BEGIN
  CREATE POLICY "Admins can read all chatgpt interactions"
    ON public.chatgpt_interactions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profile p
        WHERE p.user_id = auth.uid() AND p.is_admin = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read all payments
DO $$ BEGIN
  CREATE POLICY "Admins can read all payments"
    ON public.payments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profile p
        WHERE p.user_id = auth.uid() AND p.is_admin = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Step 4: Verify
-- ============================================
SELECT
  p.user_id,
  p.is_admin,
  u.email
FROM public.profile p
JOIN auth.users u ON u.id = p.user_id
WHERE p.is_admin = true;
