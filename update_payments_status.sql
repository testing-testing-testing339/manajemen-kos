-- Add status column to payments table for confirmation workflow
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending', 'confirmed')) DEFAULT 'pending';

-- Add confirmed_by and confirmed_at columns
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

-- Update existing payments to be confirmed by default
UPDATE payments SET status = 'confirmed' WHERE status IS NULL;

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

