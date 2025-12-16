-- Allow public (anon) users to read available rooms for check-in form
-- This is needed because the check-in page is accessed by anonymous users

-- Add policy for anon users to read rooms (only available/not occupied)
CREATE POLICY "Public can read available rooms for check-in"
    ON rooms FOR SELECT
    TO anon, authenticated
    USING (is_occupied = false);

-- Also need to allow reading floors for room information
CREATE POLICY "Public can read floors for check-in"
    ON floors FOR SELECT
    TO anon, authenticated
    USING (true);




