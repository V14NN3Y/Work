-- Allowlist table for RLS admin checks. References auth.users (Supabase Auth) instead of
-- the old standalone `admins` table with its own bcrypt password_hash — Supabase Auth now
-- owns credentials entirely; this table only marks which auth.users are admins.
create table admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
