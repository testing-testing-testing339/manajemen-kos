-- Verify and fix RLS policies for rooms table to allow public access
-- This ensures anonymous users can read available rooms for check-in

-- Step 1: Check existing policies
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
WHERE tablename = 'rooms'
ORDER BY policyname;

-- Step 2: Drop existing public read policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Public can read available rooms for check-in" ON rooms;
DROP POLICY IF EXISTS "anon can read available rooms" ON rooms;
DROP POLICY IF EXISTS "authenticated can read available rooms" ON rooms;

-- Step 3: Create/Recreate the policy to allow anon and authenticated users to read available rooms
CREATE POLICY "Public can read available rooms for check-in"
    ON rooms FOR SELECT
    TO anon, authenticated
    USING (is_occupied = false);

-- Step 4: Verify the policy was created
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'rooms' 
    AND policyname = 'Public can read available rooms for check-in';

-- Step 5: Test query (this should work for anon users)
-- Note: Run this as anon user in Supabase SQL Editor to test
SELECT 
    r.id,
    r.room_number,
    r.price,
    r.is_occupied,
    f.name as floor_name,
    b.name as branch_name
FROM rooms r
JOIN floors f ON r.floor_id = f.id
JOIN branches b ON f.branch_id = b.id
WHERE r.is_occupied = false
LIMIT 10;


