-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recipe-images', 'recipe-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Recipe images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Allow service role to upload
CREATE POLICY "Service role can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recipe-images');

-- Allow service role to update
CREATE POLICY "Service role can update recipe images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recipe-images');