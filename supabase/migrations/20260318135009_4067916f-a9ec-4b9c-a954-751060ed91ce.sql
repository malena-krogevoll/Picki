
-- Drop the overly permissive storage policies
DROP POLICY IF EXISTS "Service role can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update recipe images" ON storage.objects;

-- Authenticated users can upload to the cookbook folder only
CREATE POLICY "Authenticated users can upload cookbook images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = 'cookbook'
);

-- Users can only update their own uploaded images
CREATE POLICY "Users can update own recipe images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recipe-images' AND owner = auth.uid());
