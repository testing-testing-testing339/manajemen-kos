-- Verify that your profile exists and has the correct role
-- Run this in Supabase SQL Editor

-- First, get your user ID from auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Then check if profile exists for your user
-- Replace 'YOUR_USER_ID' with the ID from above query
SELECT 
    id,
    full_name,
    role,
    branch_id,
    email,
    is_active
FROM profiles
WHERE id = 'c92a5d5f-42b6-4f1e-ad63-f527c489b6bc'; -- Replace with your user ID

-- Test the check_user_role function
SELECT 
    check_user_role('c92a5d5f-42b6-4f1e-ad63-f527c489b6bc'::uuid) as current_user_role;

-- If profile doesn't exist, create it:
-- INSERT INTO profiles (id, full_name, role, email)
-- VALUES (
--     'c92a5d5f-42b6-4f1e-ad63-f527c489b6bc', -- Your user ID
--     'Anisa Ramadhani',
--     'owner',
--     'your-email@example.com' -- Your email
-- );





