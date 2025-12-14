-- Create payments table for financial management
create table if not exists payments (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references tenants(id) not null,
    amount numeric not null,
    payment_date date not null,
    payment_method text check (payment_method in ('cash', 'transfer', 'e-wallet', 'other')) not null,
    notes text,
    created_at timestamp with time zone default now()
);

alter table payments enable row level security;

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

-- Create index for better query performance
create index if not exists idx_payments_tenant_id on payments(tenant_id);
create index if not exists idx_payments_payment_date on payments(payment_date);

-- Add comment
comment on table payments is 'Records of rental payments from tenants';

