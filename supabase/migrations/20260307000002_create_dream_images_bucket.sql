-- ============================================================
-- Create dream-images storage bucket for AI-generated dream art
-- ============================================================

-- Create the bucket (public so images are accessible via public URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dream-images',
  'dream-images',
  true,
  5242880, -- 5MB limit per image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (images are viewable without auth)
CREATE POLICY "Public can view dream images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dream-images');
