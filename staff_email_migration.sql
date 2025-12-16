-- Add email column to profiles table for easier access
-- This allows storing email directly in profiles (denormalized for convenience)

alter table profiles 
add column if not exists email text;

-- Update existing profiles with email from auth.users
-- Note: This requires a function or manual update
-- For now, email will be populated when creating new staff

-- Create function to sync email from auth.users to profiles
create or replace function sync_profile_email()
returns trigger as $$
begin
  update profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to auto-sync email (optional, can be done manually)
-- This is just for reference, you may need to update emails manually or via application




