-- Test query to verify staff can be fetched by owner
-- Run this in Supabase SQL Editor as the owner user

-- First, check if you can see all profiles
SELECT 
    id,
    full_name,
    role,
    branch_id,
    email,
    is_active
FROM profiles
ORDER BY created_at DESC;

-- Check staff only
SELECT 
    id,
    full_name,
    role,
    branch_id,
    email,
    is_active
FROM profiles
WHERE role = 'staff'
ORDER BY created_at DESC;

-- Test with branches relation
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.branch_id,
    p.email,
    p.is_active,
    b.id as branch_id_from_relation,
    b.name as branch_name
FROM profiles p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE p.role = 'staff'
ORDER BY p.created_at DESC;

-- Check RLS policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- Test check_user_role function
SELECT 
    auth.uid() as current_user_id,
    check_user_role(auth.uid()) as current_user_role;




