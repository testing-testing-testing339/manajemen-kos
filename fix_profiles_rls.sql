-- Fix RLS policies for profiles table
-- This ensures users can read their own profile and owner can manage all profiles

-- Drop all existing policies first (drop all possible policy names)
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Owner can view all profiles" on profiles;
drop policy if exists "Owner can manage all profiles" on profiles;
drop policy if exists "Owner can insert profiles" on profiles;
drop policy if exists "Owner can update all profiles" on profiles;
drop policy if exists "Owner can delete profiles" on profiles;
drop policy if exists "Staff can view branch profiles" on profiles;

-- Drop any other policies that might exist (catch-all)
do $$
declare
    r record;
begin
    for r in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
        execute 'drop policy if exists "' || r.policyname || '" on profiles';
    end loop;
end $$;

-- Allow users to view their own profile (this is critical!)
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

