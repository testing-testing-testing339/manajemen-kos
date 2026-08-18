-- Fix foreign key constraint for payments.tenant_id
-- This allows deleting tenants while keeping payments for revenue tracking
-- by setting tenant_id to NULL when tenant is deleted

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;

-- Step 2: Make tenant_id nullable (so payments can exist without tenant)
ALTER TABLE payments 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 3: Recreate foreign key with ON DELETE SET NULL
-- This means when a tenant is deleted, the tenant_id in payments will be set to NULL
-- instead of preventing the deletion
ALTER TABLE payments 
ADD CONSTRAINT payments_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES tenants(id) 
ON DELETE SET NULL;

-- Step 4: Verify the constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'payments' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'tenant_id';





