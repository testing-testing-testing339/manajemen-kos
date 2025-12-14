-- RLS Policies for payments table
-- Run this if you already created the payments table but forgot to add policies

-- Drop existing policies if they exist (optional, will error if they don't exist)
drop policy if exists "Allow authenticated users to select payments" on payments;
drop policy if exists "Allow authenticated users to insert payments" on payments;
drop policy if exists "Allow authenticated users to update payments" on payments;
drop policy if exists "Allow authenticated users to delete payments" on payments;

-- Create RLS Policies for payments table
-- Allow authenticated users to select all payments
create policy "Allow authenticated users to select payments"
    on payments for select
    to authenticated
    using (true);

-- Allow authenticated users to insert payments
create policy "Allow authenticated users to insert payments"
    on payments for insert
    to authenticated
    with check (true);

-- Allow authenticated users to update payments
create policy "Allow authenticated users to update payments"
    on payments for update
    to authenticated
    using (true)
    with check (true);

-- Allow authenticated users to delete payments
create policy "Allow authenticated users to delete payments"
    on payments for delete
    to authenticated
    using (true);

