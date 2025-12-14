-- Fix check_user_role function to properly bypass RLS
-- The function must use SECURITY DEFINER and access profiles without RLS

-- Drop existing function
DROP FUNCTION IF EXISTS check_user_role(uuid);

-- Recreate function with proper security settings
-- SECURITY DEFINER means it runs with the privileges of the function creator (bypasses RLS)
CREATE OR REPLACE FUNCTION check_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_role text;
BEGIN
    -- This query bypasses RLS because function is SECURITY DEFINER
    -- We explicitly use public.profiles to ensure we're querying the right table
    SELECT role::text INTO user_role
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, NULL);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_role(uuid) TO authenticated;

-- Test the function (replace with your actual user ID)
-- SELECT check_user_role('c92a5d5f-42b6-4f1e-ad63-f527c489b6bc'::uuid);

-- Alternative: Test with current user
-- SELECT check_user_role(auth.uid());

