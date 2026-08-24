-- Add platform approval workflow for businesses.
-- New owner-created businesses start as pending and must be activated
-- from the platform admin console before operational data can be used.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin' check (role in ('super_admin', 'support')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.platform_admins pa
      where pa.user_id = auth.uid()
        and pa.is_active = true
    )
$$;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_admin() to service_role;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'businesses'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.businesses drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.businesses
  alter column status set default 'pending',
  add constraint businesses_status_check
    check (status in ('pending', 'active', 'inactive', 'archived'));

create index if not exists idx_businesses_status on public.businesses(status);

create or replace function public.guard_business_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() then
    if new.status = 'archived' and new.archived_at is null then
      new.archived_at := now();
    elsif new.status <> 'archived' then
      new.archived_at := null;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.status, 'pending') <> 'pending' then
      raise exception 'New businesses must be approved by the platform admin before activation';
    end if;
    new.status := 'pending';
    new.archived_at := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.owner_id = auth.uid() and new.status = 'archived' then
      new.archived_at := coalesce(new.archived_at, now());
      return new;
    end if;

    raise exception 'Only the platform admin can activate or deactivate businesses';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_business_status_change on public.businesses;
create trigger guard_business_status_change
before insert or update of status on public.businesses
for each row execute function public.guard_business_status_change();

create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.businesses b
      on b.owner_id = p.id
      and b.id = target_business_id
      and b.status = 'active'
    left join public.business_users bu
      on bu.user_id = p.id
      and bu.business_id = target_business_id
    left join public.businesses target_b
      on target_b.id = target_business_id
    where p.id = auth.uid()
      and coalesce(p.status, 'Active') = 'Active'
      and target_b.status = 'active'
      and (
        (p.role = 'owner' and b.id = target_business_id)
        or (p.role = 'manager' and p.business_access = 'all' and exists (
          select 1
          from public.businesses ob
          join public.business_users obu on obu.business_id = ob.id and obu.user_id = p.id
          where ob.status = 'active'
            and ob.owner_id = target_b.owner_id
        ))
        or bu.id is not null
      )
  )
$$;

create or replace function public.can_manage_business_records(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.status = 'active'
      and b.owner_id = auth.uid()
  )
$$;

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

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self
on public.platform_admins for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists businesses_insert_owner on public.businesses;
create policy businesses_insert_owner
on public.businesses for insert to authenticated
with check (
  owner_id = auth.uid()
  and public.current_app_role() = 'owner'
  and status = 'pending'
);

drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner
on public.businesses for update to authenticated
using (
  owner_id = auth.uid()
  and public.current_app_role() = 'owner'
  and status = 'active'
)
with check (
  owner_id = auth.uid()
  and public.current_app_role() = 'owner'
  and status in ('active', 'archived')
);

drop policy if exists businesses_select_platform_admin on public.businesses;
create policy businesses_select_platform_admin
on public.businesses for select to authenticated
using (public.is_platform_admin());

drop policy if exists businesses_update_platform_admin on public.businesses;
create policy businesses_update_platform_admin
on public.businesses for update to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

grant select on public.platform_admins to authenticated;
grant select, update on public.businesses to authenticated;
