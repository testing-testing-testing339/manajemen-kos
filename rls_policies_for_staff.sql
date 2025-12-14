-- RLS Policies for Staff Access Control
-- Staff can only see data in their assigned branch
-- Owner can see all data

-- ============================================
-- BRANCHES TABLE
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select branches" ON branches;
DROP POLICY IF EXISTS "Allow authenticated users to insert branches" ON branches;
DROP POLICY IF EXISTS "Allow authenticated users to update branches" ON branches;
DROP POLICY IF EXISTS "Allow authenticated users to delete branches" ON branches;

-- Owner can do everything
CREATE POLICY "Owner can manage all branches"
    ON branches FOR ALL
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Staff can only view their own branch
CREATE POLICY "Staff can view their branch"
    ON branches FOR SELECT
    TO authenticated
    USING (
        get_staff_branch(auth.uid()) = branches.id
    );

-- ============================================
-- FLOORS TABLE
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select floors" ON floors;
DROP POLICY IF EXISTS "Allow authenticated users to insert floors" ON floors;
DROP POLICY IF EXISTS "Allow authenticated users to update floors" ON floors;
DROP POLICY IF EXISTS "Allow authenticated users to delete floors" ON floors;

-- Owner can do everything
CREATE POLICY "Owner can manage all floors"
    ON floors FOR ALL
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Staff can only view floors in their branch
CREATE POLICY "Staff can view their branch floors"
    ON floors FOR SELECT
    TO authenticated
    USING (
        get_staff_branch(auth.uid()) = floors.branch_id
    );

-- ============================================
-- ROOMS TABLE
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON rooms;

-- Owner can do everything
CREATE POLICY "Owner can manage all rooms"
    ON rooms FOR ALL
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Staff can only view rooms in their branch (through floors)
CREATE POLICY "Staff can view their branch rooms"
    ON rooms FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM floors
            WHERE floors.id = rooms.floor_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

-- Staff can update rooms in their branch (for check-in/check-out)
CREATE POLICY "Staff can update their branch rooms"
    ON rooms FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM floors
            WHERE floors.id = rooms.floor_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM floors
            WHERE floors.id = rooms.floor_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

-- ============================================
-- TENANTS TABLE
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to insert tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to update tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to delete tenants" ON tenants;

-- Owner can do everything
CREATE POLICY "Owner can manage all tenants"
    ON tenants FOR ALL
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Staff can view tenants in their branch (through rooms -> floors)
CREATE POLICY "Staff can view their branch tenants"
    ON tenants FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rooms
            JOIN floors ON rooms.floor_id = floors.id
            WHERE rooms.id = tenants.room_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

-- Staff can insert tenants in their branch (check-in)
CREATE POLICY "Staff can insert their branch tenants"
    ON tenants FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rooms
            JOIN floors ON rooms.floor_id = floors.id
            WHERE rooms.id = tenants.room_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

-- Staff can update tenants in their branch
CREATE POLICY "Staff can update their branch tenants"
    ON tenants FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rooms
            JOIN floors ON rooms.floor_id = floors.id
            WHERE rooms.id = tenants.room_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rooms
            JOIN floors ON rooms.floor_id = floors.id
            WHERE rooms.id = tenants.room_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

-- ============================================
-- PAYMENTS TABLE
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete payments" ON payments;

-- Owner can do everything
CREATE POLICY "Owner can manage all payments"
    ON payments FOR ALL
    TO authenticated
    USING (
        check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        check_user_role(auth.uid()) = 'owner'
    );

-- Staff can view and insert payments for tenants in their branch
CREATE POLICY "Staff can view their branch payments"
    ON payments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            JOIN rooms ON tenants.room_id = rooms.id
            JOIN floors ON rooms.floor_id = floors.id
            WHERE tenants.id = payments.tenant_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

CREATE POLICY "Staff can insert their branch payments"
    ON payments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenants
            JOIN rooms ON tenants.room_id = rooms.id
            JOIN floors ON rooms.floor_id = floors.id
            WHERE tenants.id = payments.tenant_id
            AND floors.branch_id = get_staff_branch(auth.uid())
        )
    );

