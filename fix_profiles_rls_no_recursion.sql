-- Fix RLS policies for profiles table WITHOUT infinite recursion
-- The problem: policies that check profiles table cause infinite recursion
-- Solution: Use a security definer function or simpler approach

-- Drop all existing policies first
do $$
declare
    r record;
begin
    for r in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
        execute 'drop policy if exists "' || r.policyname || '" on profiles';
    end loop;
end $$;

-- Create a function to check if user is owner (avoids recursion)
create or replace function is_owner(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    user_role text;
begin
    select role into user_role
    from profiles
    where id = user_id;
    
    return user_role = 'owner';
end;
$$;

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

-- Owner can view all profiles (using function to avoid recursion)
create policy "Owner can view all profiles"
    on profiles for select
    to authenticated
    using (is_owner(auth.uid()));

-- Owner can insert profiles (create staff)
create policy "Owner can insert profiles"
    on profiles for insert
    to authenticated
    with check (is_owner(auth.uid()));

-- Owner can update all profiles (manage staff)
create policy "Owner can update all profiles"
    on profiles for update
    to authenticated
    using (is_owner(auth.uid()))
    with check (is_owner(auth.uid()));

-- Owner can delete profiles (remove staff)
create policy "Owner can delete profiles"
    on profiles for delete
    to authenticated
    using (is_owner(auth.uid()));

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


