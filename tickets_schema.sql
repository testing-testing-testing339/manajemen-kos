-- Schema for complaint tickets system
-- This table stores complaints/tickets from tenants

CREATE TABLE IF NOT EXISTS tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
    -- Complaint details
    title text NOT NULL,
    description text NOT NULL,
    category text CHECK (category IN ('plumbing', 'electrical', 'cleaning', 'furniture', 'security', 'other')) DEFAULT 'other',
    priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    -- Status tracking
    status text CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    -- Assignment
    assigned_to uuid REFERENCES profiles(id), -- Staff or owner who handles the ticket
    assigned_at timestamp with time zone,
    -- Resolution
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES profiles(id),
    resolution_notes text,
    -- Metadata
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_room_id ON tickets(room_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Tenants can view their own tickets
CREATE POLICY "Tenants can view their own tickets"
    ON tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = tickets.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Tenants can create tickets for their room
CREATE POLICY "Tenants can create tickets"
    ON tickets FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.id = tickets.tenant_id
            AND tenants.user_id = auth.uid()
        )
    );

-- Staff can view tickets in their branch
CREATE POLICY "Staff can view tickets in their branch"
    ON tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'staff'
            AND (
                tickets.assigned_to = profiles.id
                OR EXISTS (
                    SELECT 1 FROM rooms
                    JOIN floors ON rooms.floor_id = floors.id
                    WHERE rooms.id = tickets.room_id
                    AND floors.branch_id = profiles.branch_id
                )
            )
        )
    );

-- Owner can view all tickets
CREATE POLICY "Owner can view all tickets"
    ON tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
        )
    );

-- Staff and owner can update tickets
CREATE POLICY "Staff and owner can update tickets"
    ON tickets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'owner'
                OR (
                    profiles.role = 'staff'
                    AND (
                        tickets.assigned_to = profiles.id
                        OR EXISTS (
                            SELECT 1 FROM rooms
                            JOIN floors ON rooms.floor_id = floors.id
                            WHERE rooms.id = tickets.room_id
                            AND floors.branch_id = profiles.branch_id
                        )
                    )
                )
            )
        )
    );

-- Enable Realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;




