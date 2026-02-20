-- ============================================
-- Bug Report Widget — Auth Migration
-- Run AFTER the initial migration.sql
-- ============================================

-- 1. Add user_id column to clients table
alter table clients add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2. Create unique index on user_id (one client per user)
create unique index if not exists idx_clients_user_id on clients (user_id);

-- 3. Trigger: auto-create a client when a new user registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  new_api_key text;
begin
  -- Generate a unique API key
  new_api_key := 'err_' || encode(gen_random_bytes(24), 'base64');
  -- Remove non-alphanumeric chars from base64
  new_api_key := replace(replace(replace(new_api_key, '+', ''), '/', ''), '=', '');

  insert into public.clients (user_id, api_key, name)
  values (new.id, new_api_key, coalesce(new.raw_user_meta_data->>'name', new.email));

  return new;
end;
$$;

-- Drop existing trigger if any
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. RLS Policies for clients table
-- Allow users to see only their own client record
drop policy if exists "Users can view own client" on clients;
create policy "Users can view own client"
  on clients for select
  using (auth.uid() = user_id);

-- Allow users to update their own integrations
drop policy if exists "Users can update own client" on clients;
create policy "Users can update own client"
  on clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. RLS Policies for reports table
-- Allow users to see reports for their clients
drop policy if exists "Users can view own reports" on reports;
create policy "Users can view own reports"
  on reports for select
  using (
    exists (
      select 1 from clients
      where clients.id = reports.client_id
        and clients.user_id = auth.uid()
    )
  );
