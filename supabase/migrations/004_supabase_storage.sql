-- ============================================================
-- Migration 004: Supabase Storage bucket for generated media
-- ============================================================
-- Generated media URLs from Kie.ai, ElevenLabs, HeyGen expire after 24 hours.
-- This bucket stores persistent copies so media remains accessible forever.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/hyjaatefztlnuwozozig/sql/new
-- ============================================================

-- Create the storage bucket (public read, 500MB file limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('generated-media', 'generated-media', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files (public bucket for serving media)
CREATE POLICY "Public read access for generated media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-media');

-- Allow authenticated users to upload to their own user_id folder
CREATE POLICY "Authenticated users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'generated-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
