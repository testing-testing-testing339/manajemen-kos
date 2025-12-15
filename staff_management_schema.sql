-- Add photo_url column to profiles table for staff photos
-- This allows storing staff profile photos

alter table profiles 
add column if not exists photo_url text;

-- Add additional info columns for staff management
alter table profiles
add column if not exists phone text,
add column if not exists address text,
add column if not exists notes text,
add column if not exists is_active boolean default true;

-- Create index for active staff
create index if not exists idx_profiles_is_active on profiles(is_active);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_branch_id on profiles(branch_id);

-- Update RLS policies for profiles to allow owner to manage staff
-- Drop existing policies if they exist
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Owner can view all profiles" on profiles;
drop policy if exists "Owner can manage all profiles" on profiles;

-- Allow users to view their own profile
create policy "Users can view own profile"
    on profiles for select
    to authenticated
    using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile"
    on profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Owner can view all profiles
create policy "Owner can view all profiles"
    on profiles for select
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'owner'
        )
    );

-- Owner can insert profiles (create staff)
create policy "Owner can insert profiles"
    on profiles for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'owner'
        )
    );

-- Owner can update all profiles (manage staff)
create policy "Owner can update all profiles"
    on profiles for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'owner'
        )
    )
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'owner'
        )
    );

-- Owner can delete profiles (remove staff)
create policy "Owner can delete profiles"
    on profiles for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'owner'
        )
    );

-- Staff can view profiles in their branch
create policy "Staff can view branch profiles"
    on profiles for select
    to authenticated
    using (
        exists (
            select 1 from profiles p
            where p.id = auth.uid()
            and p.role = 'staff'
            and p.branch_id = profiles.branch_id
        )
    );


