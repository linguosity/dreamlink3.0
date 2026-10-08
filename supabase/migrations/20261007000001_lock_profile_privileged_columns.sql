-- Lock down privileged columns on public.profile.
--
-- Problem: the "Users can update their own profile" RLS policy lets a signed-in
-- user write ANY column on their own row from the browser, including
-- is_admin (admin dashboard, coming-soon bypass, every is_admin() policy) and
-- the test_mode_* flags (fan a single dream out into many paid model calls).
-- The INSERT policy has the same hole for a user who inserts their own row.
--
-- RLS is row-level, so it can't express "this row, but not these columns".
-- Column-level REVOKE would work but forces an explicit per-column GRANT list
-- that silently breaks every future column. A BEFORE trigger is the robust
-- option: it guards exactly these columns and leaves everything else alone.
--
-- Who is restricted: requests from end users through PostgREST run as the
-- `authenticated` (or `anon`) role. The service role (getAdminClient), the
-- on_auth_user_created trigger (SECURITY DEFINER, runs as postgres), and the
-- Supabase SQL editor are NOT restricted, so promoting admins still works
-- exactly as before (app/actions.ts allowlist, supabase/scripts/flag-admins.sql).
--
-- Rules for end users:
--   * is_admin can never be set or changed.
--   * test_mode_* can only be changed by a user who is already an admin
--     (keeps the admin Settings → Test mode panel working).
--
-- The function is deliberately SECURITY INVOKER (the default) so that
-- current_user reflects the caller's role, not the function owner.

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;  -- service role / postgres / migrations: trusted
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A user-created row always starts unprivileged.
    NEW.is_admin                 := false;
    NEW.test_mode_enabled        := false;
    NEW.test_mode_depths         := '{}';
    NEW.test_mode_reading_levels := '{}';
    NEW.test_mode_aesthetics     := '{}';
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'profile.is_admin cannot be changed by users'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;

  IF COALESCE(OLD.is_admin, false) = false AND (
       NEW.test_mode_enabled        IS DISTINCT FROM OLD.test_mode_enabled
    OR NEW.test_mode_depths         IS DISTINCT FROM OLD.test_mode_depths
    OR NEW.test_mode_reading_levels IS DISTINCT FROM OLD.test_mode_reading_levels
    OR NEW.test_mode_aesthetics     IS DISTINCT FROM OLD.test_mode_aesthetics
  ) THEN
    RAISE EXCEPTION 'profile.test_mode_* is admin-only'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profile;
CREATE TRIGGER guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profile
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- Clean up anything that may already have been abused: non-admins should
-- never have test mode on. (Does not touch is_admin — audit that by hand,
-- see the query in the PR description.)
UPDATE public.profile
SET test_mode_enabled = false,
    test_mode_depths = '{}',
    test_mode_reading_levels = '{}',
    test_mode_aesthetics = '{}'
WHERE COALESCE(is_admin, false) = false
  AND (test_mode_enabled
       OR cardinality(test_mode_depths) > 0
       OR cardinality(test_mode_reading_levels) > 0
       OR cardinality(test_mode_aesthetics) > 0);
