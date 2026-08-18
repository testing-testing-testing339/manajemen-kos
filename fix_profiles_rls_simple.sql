-- Simple fix for RLS policies - avoid recursion completely
-- This approach uses only direct checks, no nested queries

-- Step 1: Drop ALL existing policies
do $$
declare
    r record;
begin
    for r in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
        execute 'drop policy if exists "' || r.policyname || '" on profiles';
    end loop;
end $$;

-- Step 2: Drop existing functions
drop function if exists is_owner(uuid);
drop function if exists get_user_branch_id(uuid);

-- Step 3: Create security definer function that reads WITHOUT RLS
-- This is critical - security definer + explicit schema bypasses RLS
create or replace function check_user_role(user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
    select role::text from public.profiles where id = user_id;
$$;

-- Step 4: Create simple policies

-- CRITICAL: Users MUST be able to read their own profile first
-- This policy must come first and be simple
create policy "Users can view own profile"
    on profiles for select
    to authenticated
    using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
    on profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Owner can view all profiles (using function that bypasses RLS)
create policy "Owner can view all profiles"
    on profiles for select
    to authenticated
    using (check_user_role(auth.uid()) = 'owner');

-- Owner can insert profiles
create policy "Owner can insert profiles"
    on profiles for insert
    to authenticated
    with check (check_user_role(auth.uid()) = 'owner');

-- Owner can update all profiles
create policy "Owner can update all profiles"
    on profiles for update
    to authenticated
    using (check_user_role(auth.uid()) = 'owner')
    with check (check_user_role(auth.uid()) = 'owner');

-- Owner can delete profiles
create policy "Owner can delete profiles"
    on profiles for delete
    to authenticated
    using (check_user_role(auth.uid()) = 'owner');

-- Staff can view profiles in their branch
-- Use function to get branch_id without recursion
create or replace function get_staff_branch(user_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select branch_id from public.profiles where id = user_id and role = 'staff';
$$;

create policy "Staff can view branch profiles"
    on profiles for select
    to authenticated
    using (
        get_staff_branch(auth.uid()) is not null
        and get_staff_branch(auth.uid()) = profiles.branch_id
    );

-- Grant execute permissions
grant execute on function check_user_role(uuid) to authenticated;
grant execute on function get_staff_branch(uuid) to authenticated;





