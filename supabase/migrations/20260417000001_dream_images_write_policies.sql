-- ============================================================
-- Add missing write policies for the `dream-images` storage bucket
-- ============================================================
--
-- Background:
--   The bucket was created in 20260307000002 with only a public SELECT
--   policy, so any code path that tried to upload through a user-scoped
--   client (rather than the service-role admin client) would be rejected
--   by RLS with a confusing "new row violates row-level security policy"
--   error.
--
--   Today all image uploads route through `getAdminClient()` (service-role),
--   which bypasses RLS entirely, so uploads *happen* to work — but the
--   moment we add any client-side or user-scoped upload path (drag-and-drop,
--   profile pic, etc.) it will silently fail. Defense in depth.
--
-- What this migration does:
--   Grants authenticated users INSERT / UPDATE / DELETE on objects in the
--   `dream-images` bucket. Reads stay fully public (unchanged from the
--   previous migration).
--
-- What this migration does NOT do:
--   Tie objects to their owning user. For a consumer app that wants any
--   user to overwrite another's dream image, that would be wrong — but we
--   don't allow that today because all writes go through the admin client
--   and are keyed by dream_id. If you later allow user-scoped uploads,
--   tighten these policies to filter on `auth.uid() = owner`.

-- Idempotent policy drops (safe to re-run in local dev).
DROP POLICY IF EXISTS "Authenticated users can upload dream images"
  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update dream images"
  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete dream images"
  ON storage.objects;

CREATE POLICY "Authenticated users can upload dream images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dream-images');

CREATE POLICY "Authenticated users can update dream images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dream-images')
  WITH CHECK (bucket_id = 'dream-images');

CREATE POLICY "Authenticated users can delete dream images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dream-images');
