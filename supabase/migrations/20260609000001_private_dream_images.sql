-- ============================================================
-- Make the dream-images bucket private (2026-06-09 release audit, H5)
-- ============================================================
--
-- Before: bucket was public-read (any image world-viewable by URL) and ANY
-- authenticated user could UPDATE/DELETE ANY object in the bucket.
--
-- After: bucket is private. All reads go through long-lived signed URLs
-- generated server-side in utils/imageGeneration.ts (the signed URL itself
-- is the share capability — texting/posting the link works, but the bucket
-- can't be browsed and objects can't be fetched without the token).
-- All writes go through the service-role client (bypasses RLS), so no
-- user-scoped write policies are needed; the permissive ones are dropped.
--
-- ⚠️ Existing rows: any dream_entries.image_url that still points at
-- /storage/v1/object/public/... stops working once this runs. Re-sign them
-- with: POST /api/backfill-images (admin-only) — it re-signs broken public
-- URLs in addition to generating missing images.

UPDATE storage.buckets SET public = false WHERE id = 'dream-images';

DROP POLICY IF EXISTS "Public can view dream images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dream images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update dream images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete dream images" ON storage.objects;
