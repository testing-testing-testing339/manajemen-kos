-- Fix RLS policies for profiles table WITHOUT infinite recursion
-- Using a better approach with security definer function that bypasses RLS

-- Step 1: Drop all existing policies
do $$
declare
    r record;
begin
    for r in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
        execute 'drop policy if exists "' || r.policyname || '" on profiles';
    end loop;
end $$;

-- Step 2: Drop existing function if exists
drop function if exists is_owner(uuid);

-- Step 3: Create a security definer function that bypasses RLS
-- This function can read profiles without triggering RLS policies
create or replace function is_owner(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    user_role text;
begin
    -- This query bypasses RLS because function is security definer
    select role into user_role
    from public.profiles
    where id = user_id;
    
    return coalesce(user_role = 'owner', false);
end;
$$;

-- Step 4: Create policies using the function

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
-- This one is tricky - we need to avoid recursion here too
-- Let's create a helper function for staff check
create or replace function get_user_branch_id(user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    branch_uuid uuid;
begin
    select branch_id into branch_uuid
    from public.profiles
    where id = user_id and role = 'staff';
    
    return branch_uuid;
end;
$$;

create policy "Staff can view branch profiles"
    on profiles for select
    to authenticated
    using (
        get_user_branch_id(auth.uid()) is not null
        and get_user_branch_id(auth.uid()) = profiles.branch_id
    );

-- Grant execute permission on functions
grant execute on function is_owner(uuid) to authenticated;
grant execute on function get_user_branch_id(uuid) to authenticated;


