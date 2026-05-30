-- Make business loading resilient and keep owner membership links in sync.

insert into public.business_users (business_id, user_id, role)
select b.id, b.owner_id, 'owner'
from public.businesses b
where b.owner_id is not null
on conflict (business_id, user_id) do update set role = 'owner';

create or replace function public.ensure_owner_business_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.business_users (business_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (business_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_owner_business_user on public.businesses;
create trigger ensure_owner_business_user
after insert or update of owner_id on public.businesses
for each row execute function public.ensure_owner_business_user();

create or replace function public.get_accessible_businesses()
returns table (
  id uuid,
  owner_id uuid,
  business_name text,
  legal_name text,
  phone text,
  email text,
  address text,
  logo_url text,
  status text,
  archived_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select id, role, business_access
    from public.profiles
    where id = auth.uid()
      and coalesce(status, 'Active') = 'Active'
    limit 1
  ),
  actor_owner_scope as (
    select distinct b.owner_id
    from public.businesses b
    join public.business_users bu on bu.business_id = b.id
    join actor a on a.id = bu.user_id
  )
  select
    b.id,
    b.owner_id,
    b.business_name,
    b.legal_name,
    b.phone,
    b.email,
    b.address,
    b.logo_url,
    b.status,
    b.archived_at,
    b.created_at
  from public.businesses b
  join actor a on true
  left join public.business_users bu
    on bu.business_id = b.id
    and bu.user_id = a.id
  where b.status = 'active'
    and (
      (a.role = 'owner' and b.owner_id = a.id)
      or (a.role = 'manager' and a.business_access = 'all' and b.owner_id in (select owner_id from actor_owner_scope))
      or bu.id is not null
    )
  order by b.business_name;
$$;

grant execute on function public.get_accessible_businesses() to authenticated;
