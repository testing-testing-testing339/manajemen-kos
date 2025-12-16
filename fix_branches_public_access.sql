-- Allow public (anon) users to read branches for check-in form
-- This is needed because the check-in page is accessed by anonymous users

-- Add policy for anon users to read branches
CREATE POLICY "Public can read branches for check-in"
    ON branches FOR SELECT
    TO anon, authenticated
    USING (true);

-- Note: This allows anyone to read branch information (id, name, address)
-- which is necessary for the public check-in form to work.
-- Only SELECT is allowed, INSERT/UPDATE/DELETE still require authentication.




