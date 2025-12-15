-- Create storage bucket for check-in photos
-- Run this in Supabase SQL Editor

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('check-in-photos', 'check-in-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for check-in-photos bucket
-- Allow public to upload (for check-in form)
CREATE POLICY "Public can upload check-in photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'check-in-photos');

-- Allow public to read check-in photos
CREATE POLICY "Public can read check-in photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'check-in-photos');

-- Allow authenticated users to read all check-in photos
CREATE POLICY "Authenticated can read check-in photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'check-in-photos');


