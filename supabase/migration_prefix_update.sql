-- ============================================
-- Update API Key Generation to use 'err_' prefix
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_api_key text;
begin
  -- Generate a unique API key with 'err_' prefix
  new_api_key := 'err_' || encode(gen_random_bytes(24), 'base64');
  -- Remove non-alphanumeric chars from base64
  new_api_key := replace(replace(replace(new_api_key, '+', ''), '/', ''), '=', '');

  insert into public.clients (user_id, api_key, name)
  values (new.id, new_api_key, coalesce(new.raw_user_meta_data->>'name', new.email));

  return new;
end;
$$;
