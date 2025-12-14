-- Create storage bucket for staff photos
-- Run this in Supabase SQL Editor

-- Create bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', true)
on conflict (id) do nothing;

-- Set up storage policies for staff photos
-- Allow authenticated users to upload photos
create policy "Authenticated users can upload staff photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'staff-photos');

-- Allow authenticated users to view photos
create policy "Authenticated users can view staff photos"
on storage.objects for select
to authenticated
using (bucket_id = 'staff-photos');

-- Allow authenticated users to update photos
create policy "Authenticated users can update staff photos"
on storage.objects for update
to authenticated
using (bucket_id = 'staff-photos');

-- Allow authenticated users to delete photos
create policy "Authenticated users can delete staff photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'staff-photos');

