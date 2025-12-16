-- Test script to verify profile access
-- Run this in Supabase SQL Editor to check if RLS policies are working

-- First, let's check if the user can read their own profile
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- You can get it from: SELECT id, email FROM auth.users;

-- Check current user (if running as authenticated user)
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- Check if profile exists for current user
SELECT 
  id,
  full_name,
  role,
  branch_id
FROM profiles
WHERE id = auth.uid();

-- Check all profiles (should only work for owner)
SELECT 
  id,
  full_name,
  role,
  branch_id
FROM profiles;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;




