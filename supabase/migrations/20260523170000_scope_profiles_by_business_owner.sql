create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select id, role
    from public.profiles
    where id = auth.uid()
      and coalesce(status, 'Active') = 'Active'
    limit 1
  ),
  actor_businesses as (
    select b.id, b.owner_id
    from public.businesses b
    left join public.business_users bu
      on bu.business_id = b.id
      and bu.user_id = (select id from actor)
    where b.status = 'active'
      and (
        (select role from actor) = 'owner' and b.owner_id = (select id from actor)
        or (select role from actor) = 'manager' and bu.id is not null
      )
  )
  select exists (
    select 1
    from actor
    where target_profile_id = actor.id
  )
  or exists (
    select 1
    from public.business_users target_bu
    join actor_businesses ab on ab.id = target_bu.business_id
    where target_bu.user_id = target_profile_id
  )
$$;

create or replace function public.can_manage_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles actor
    join public.profiles target on target.id = target_profile_id
    where actor.id = auth.uid()
      and coalesce(actor.status, 'Active') = 'Active'
      and actor.role in ('owner', 'manager')
      and target.id <> actor.id
      and public.can_access_profile(target.id)
      and (
        actor.role = 'owner'
        or (actor.role = 'manager' and target.role <> 'owner')
      )
  )
$$;

drop policy if exists profiles_select_self_or_owner_manager on public.profiles;
drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_update_owner_manager on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_owner_manager on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

create policy profiles_select_business_scoped
on public.profiles for select to authenticated
using (public.can_access_profile(id));

create policy profiles_update_business_scoped
on public.profiles for update to authenticated
using (public.can_manage_profile(id))
with check (public.can_manage_profile(id));

create policy profiles_delete_business_scoped
on public.profiles for delete to authenticated
using (public.can_manage_profile(id));
