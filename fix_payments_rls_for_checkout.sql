-- ============================================
-- FIX RLS POLICY FOR PAYMENTS AFTER TENANT CHECKOUT
-- ============================================
-- Problem: Staff can't see payments after tenant checkout because
-- the RLS policy only checks for existing tenants
-- Solution: Update policy to also allow viewing payments with null tenant_id
-- (which happens after checkout due to ON DELETE SET NULL)
-- ============================================

-- Drop existing staff payment policies
DROP POLICY IF EXISTS "Staff can view their branch payments" ON payments;
DROP POLICY IF EXISTS "Staff can insert their branch payments" ON payments;
DROP POLICY IF EXISTS "Staff can update their branch payments" ON payments;

-- Staff can view payments for tenants in their branch OR payments with null tenant_id
-- (null tenant_id means tenant was checked out, but payment should still be visible)
CREATE POLICY "Staff can view their branch payments"
    ON payments FOR SELECT
    TO authenticated
    USING (
        -- Allow if payment has tenant_id and tenant is in staff's branch
        (
            payments.tenant_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM tenants
                JOIN rooms ON tenants.room_id = rooms.id
                JOIN floors ON rooms.floor_id = floors.id
                WHERE tenants.id = payments.tenant_id
                AND floors.branch_id = get_staff_branch(auth.uid())
            )
        )
        -- OR allow if tenant_id is null (tenant checked out) - staff can see all null tenant_id payments
        -- This ensures revenue tracking persists even after checkout
        OR (
            payments.tenant_id IS NULL
            AND check_user_role(auth.uid()) = 'staff'
        )
        -- OR if user is owner, allow all
        OR check_user_role(auth.uid()) = 'owner'
    );

-- Staff can insert payments for tenants in their branch
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
        OR check_user_role(auth.uid()) = 'owner'
    );

-- Staff can update payments for tenants in their branch
CREATE POLICY "Staff can update their branch payments"
    ON payments FOR UPDATE
    TO authenticated
    USING (
        (
            payments.tenant_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM tenants
                JOIN rooms ON tenants.room_id = rooms.id
                JOIN floors ON rooms.floor_id = floors.id
                WHERE tenants.id = payments.tenant_id
                AND floors.branch_id = get_staff_branch(auth.uid())
            )
        )
        OR (
            payments.tenant_id IS NULL
            AND check_user_role(auth.uid()) = 'staff'
        )
        OR check_user_role(auth.uid()) = 'owner'
    )
    WITH CHECK (
        (
            payments.tenant_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM tenants
                JOIN rooms ON tenants.room_id = rooms.id
                JOIN floors ON rooms.floor_id = floors.id
                WHERE tenants.id = payments.tenant_id
                AND floors.branch_id = get_staff_branch(auth.uid())
            )
        )
        OR (
            payments.tenant_id IS NULL
            AND check_user_role(auth.uid()) = 'staff'
        )
        OR check_user_role(auth.uid()) = 'owner'
    );

