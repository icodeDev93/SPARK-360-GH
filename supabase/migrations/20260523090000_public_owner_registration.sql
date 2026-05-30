-- Public owner registration.
-- Auth signups automatically receive an Owner profile. Staff users created
-- by secure Edge Functions can still provide their intended role in metadata.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text;

create or replace function public.initials_from_name(next_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      upper(
        left(split_part(btrim(next_name), ' ', 1), 1) ||
        left(split_part(btrim(next_name), ' ', 2), 1)
      ),
      ''
    ),
    'OW'
  )
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_name text;
  next_role text;
  next_phone text;
  next_address text;
begin
  next_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1), 'Owner');
  next_role := coalesce(nullif(btrim(new.raw_user_meta_data->>'role'), ''), 'owner');
  next_phone := nullif(btrim(new.raw_user_meta_data->>'phone'), '');
  next_address := nullif(btrim(new.raw_user_meta_data->>'address'), '');

  if next_role not in ('owner', 'manager', 'cashier') then
    next_role := 'owner';
  end if;

  insert into public.profiles (
    id,
    name,
    email,
    role,
    initials,
    avatar_color,
    status,
    permission_overrides,
    phone,
    address,
    business_access
  )
  values (
    new.id,
    next_name,
    lower(new.email),
    next_role,
    public.initials_from_name(next_name),
    case
      when next_role = 'manager' then 'bg-emerald-600'
      when next_role = 'cashier' then 'bg-amber-600'
      else 'bg-indigo-600'
    end,
    'Active',
    '{"granted":[],"revoked":[]}'::jsonb,
    next_phone,
    next_address,
    case when next_role = 'cashier' then 'assigned' else 'all' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

notify pgrst, 'reload schema';
