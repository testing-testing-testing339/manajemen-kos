-- Fix RLS policy for staff insert
-- The issue: Owner might not be able to insert staff due to RLS

-- Check current policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Make sure the insert policy is correct
-- Drop and recreate if needed
DROP POLICY IF EXISTS "Owner can insert profiles" ON profiles;

-- Recreate with proper check
CREATE POLICY "Owner can insert profiles"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Also ensure the function exists and works
-- Test the function
SELECT check_user_role(auth.uid()) as current_user_role;


