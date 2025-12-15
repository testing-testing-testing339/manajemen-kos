-- Schema for QR-based check-in system
-- This table stores check-in requests from QR code scanning

CREATE TABLE IF NOT EXISTS check_in_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid REFERENCES branches(id) NOT NULL,
    -- Guest information
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    id_card_number text,
    id_card_photo_url text NOT NULL, -- KTP photo
    selfie_photo_url text NOT NULL, -- Selfie photo
    -- Room selection
    selected_room_type text, -- Room type preference (will be assigned by staff)
    -- Payment information
    total_amount numeric NOT NULL,
    payment_proof_url text NOT NULL, -- Bukti transfer
    payment_destination text NOT NULL, -- Tujuan transfer
    -- Status
    status text CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
    assigned_room_id uuid REFERENCES rooms(id), -- Assigned by staff
    assigned_by uuid REFERENCES profiles(id), -- Staff who approved
    assigned_at timestamp with time zone,
    -- Terms and conditions
    terms_accepted boolean DEFAULT false,
    terms_accepted_at timestamp with time zone,
    -- Metadata
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_check_in_requests_branch_id ON check_in_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_check_in_requests_status ON check_in_requests(status);
CREATE INDEX IF NOT EXISTS idx_check_in_requests_created_at ON check_in_requests(created_at);

-- Enable RLS
ALTER TABLE check_in_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can insert (for check-in form)
CREATE POLICY "Public can insert check-in requests"
    ON check_in_requests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Owner can view all check-in requests
CREATE POLICY "Owner can view all check-in requests"
    ON check_in_requests FOR SELECT
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    );

-- Staff can view check-in requests in their branch
CREATE POLICY "Staff can view their branch check-in requests"
    ON check_in_requests FOR SELECT
    TO authenticated
    USING (
        get_staff_branch(auth.uid()) = check_in_requests.branch_id
    );

-- Staff can update check-in requests in their branch (approve/reject/assign)
CREATE POLICY "Staff can update their branch check-in requests"
    ON check_in_requests FOR UPDATE
    TO authenticated
    USING (
        get_staff_branch(auth.uid()) = check_in_requests.branch_id
    )
    WITH CHECK (
        get_staff_branch(auth.uid()) = check_in_requests.branch_id
    );

-- Owner can update all check-in requests
CREATE POLICY "Owner can update all check-in requests"
    ON check_in_requests FOR UPDATE
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Add QR code column to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS qr_code_url text,
ADD COLUMN IF NOT EXISTS qr_code_data text; -- Store QR data for regeneration


