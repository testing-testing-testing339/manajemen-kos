-- Database Schema for Boarding House Management System (Manajemen Kost)
-- Enable Row Level Security (RLS) for all tables

-- Table: branches
create table branches (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text not null,
    created_at timestamp with time zone default now()
);
alter table branches enable row level security;

-- Table: profiles (extends auth.users)
create table profiles (
    id uuid primary key references auth.users(id),
    role text check (role in ('owner', 'staff')) not null,
    branch_id uuid references branches(id),
    full_name text not null
);
alter table profiles enable row level security;

-- Table: floors
create table floors (
    id uuid primary key default gen_random_uuid(),
    branch_id uuid references branches(id) not null,
    name text not null
);
alter table floors enable row level security;

-- Table: rooms
create table rooms (
    id uuid primary key default gen_random_uuid(),
    floor_id uuid references floors(id) not null,
    room_number text not null,
    price numeric not null,
    facilities jsonb,
    is_occupied boolean default false
);
alter table rooms enable row level security;

-- Table: tenants
create table tenants (
    id uuid primary key default gen_random_uuid(),
    room_id uuid references rooms(id) not null,
    full_name text not null,
    id_card_url text not null,
    check_in_date date not null,
    payment_due_date date not null,
    electricity_meter_start numeric not null
);
alter table tenants enable row level security;