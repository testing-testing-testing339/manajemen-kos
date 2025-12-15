-- Complete fix for public access to rooms for check-in form
-- This ensures anonymous users can read available rooms

-- Step 1: Drop all existing policies on rooms table that might conflict
DROP POLICY IF EXISTS "Public can read available rooms for check-in" ON rooms;
DROP POLICY IF EXISTS "anon can read available rooms" ON rooms;
DROP POLICY IF EXISTS "authenticated can read available rooms" ON rooms;
DROP POLICY IF EXISTS "Public can read rooms" ON rooms;

-- Step 2: Check if there are any other policies that might block access
-- (Run this to see what policies exist)
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'rooms';

-- Step 3: Create the policy to allow anon and authenticated users to read available rooms
-- This policy allows reading rooms where is_occupied = false
CREATE POLICY "Public can read available rooms for check-in"
    ON rooms FOR SELECT
    TO anon, authenticated
    USING (is_occupied = false);

-- Step 4: Also ensure floors can be read (needed to get floor_id for rooms)
DROP POLICY IF EXISTS "Public can read floors for check-in" ON floors;
CREATE POLICY "Public can read floors for check-in"
    ON floors FOR SELECT
    TO anon, authenticated
    USING (true);

-- Step 5: Verify policies were created
SELECT 
    'rooms' as table_name,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'rooms'
UNION ALL
SELECT 
    'floors' as table_name,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'floors'
ORDER BY table_name, policyname;


