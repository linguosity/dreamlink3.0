-- ============================================================
-- Public `blog-covers` storage bucket for generated article covers
-- ============================================================
--
-- Why a second bucket instead of reusing `dream-images`:
--
--   `dream-images` is private (20260609000001) and read through long-lived
--   signed URLs. That is correct for dreams — they are personal, and the
--   signed URL is a share-by-link capability.
--
--   Blog covers are the opposite. `cover_image_url` is rendered into the
--   OpenGraph and Twitter card tags in app/blog/[slug]/page.tsx and into the
--   JSON-LD `image` field, which means the fetchers that matter are Facebook,
--   LinkedIn, X and Google — none of which authenticate, and several of which
--   cache aggressively. A signed URL technically resolves, but it carries a
--   token into every share, cannot be cached cleanly by those scrapers, and
--   eventually expires on content meant to be permanent.
--
--   Keeping them in separate buckets also keeps the privacy posture legible:
--   one bucket is private because its contents are personal, one is public
--   because its contents are published. Nobody has to reason about which
--   objects inside a mixed bucket are which.
--
-- Writes go through the service-role admin client, same as dream images, so
-- the INSERT/UPDATE/DELETE policies below are defense in depth rather than
-- load-bearing — they matter the moment an authenticated upload path is added.

insert into storage.buckets (id, name, public)
values ('blog-covers', 'blog-covers', true)
on conflict (id) do update set public = true;

-- Idempotent drops so this is safe to re-run in local dev.
drop policy if exists "Blog covers are publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload blog covers" on storage.objects;
drop policy if exists "Authenticated users can update blog covers" on storage.objects;
drop policy if exists "Authenticated users can delete blog covers" on storage.objects;

create policy "Blog covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'blog-covers');

create policy "Authenticated users can upload blog covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-covers');

create policy "Authenticated users can update blog covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-covers');

create policy "Authenticated users can delete blog covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-covers');
