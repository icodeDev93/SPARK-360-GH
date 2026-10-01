-- Owners attached through business_users should be able to open that business.
-- businesses.owner_id remains the canonical owner used for ownership transfers.
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
    where b.status = 'active'
  )
  select
    b.id, b.owner_id, b.business_name, b.legal_name, b.phone, b.email,
    b.address, b.logo_url, b.status, b.archived_at, b.created_at
  from public.businesses b
  join actor a on true
  left join public.business_users bu
    on bu.business_id = b.id
    and bu.user_id = a.id
  where b.status in ('active', 'pending', 'inactive')
    and (
      (a.role = 'owner' and (b.owner_id = a.id or (b.status = 'active' and bu.role = 'owner')))
      or (
        a.role = 'manager'
        and b.status in ('active', 'inactive')
        and (
          (a.business_access = 'all' and b.owner_id in (select owner_id from actor_owner_scope))
          or bu.id is not null
        )
      )
      or (a.role = 'cashier' and b.status = 'active' and bu.id is not null)
    )
  order by
    case b.status when 'active' then 0 when 'pending' then 1 when 'inactive' then 2 else 3 end,
    b.business_name;
$$;

grant execute on function public.get_accessible_businesses() to authenticated;
