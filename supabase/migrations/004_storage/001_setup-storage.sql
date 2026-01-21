-- =============================================
-- Supabase Storage Setup Script
-- Run this in your Supabase SQL Editor
-- =============================================

-- Create avatars storage bucket if it doesn't exist
-- Note: You need to create the bucket in Supabase Dashboard > Storage
-- This SQL is for reference only - buckets must be created via the UI or API

-- Storage bucket policies are typically created via Supabase Dashboard
-- But here's the SQL to create the bucket policy manually if needed:

-- Enable storage for avatars bucket
-- This assumes you've already created the 'avatars' bucket via the Supabase Dashboard

-- Grant authenticated users permission to upload their own avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own avatars
CREATE POLICY IF NOT EXISTS "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create policy to allow users to update their own avatars
CREATE POLICY IF NOT EXISTS "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create policy to allow users to delete their own avatars
CREATE POLICY IF NOT EXISTS "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create policy to allow public read access to avatars
CREATE POLICY IF NOT EXISTS "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

