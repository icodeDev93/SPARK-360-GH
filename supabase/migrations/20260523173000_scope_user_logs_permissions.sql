create or replace function public.has_app_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select role, permission_overrides
    from public.profiles
    where id = auth.uid()
      and coalesce(status, 'Active') = 'Active'
    limit 1
  )
  select case
    when not exists (select 1 from actor) then false
    when (select role from actor) = 'owner' then true
    when exists (
      select 1
      from jsonb_array_elements_text(coalesce((select permission_overrides from actor)->'revoked', '[]'::jsonb)) p(value)
      where p.value = permission_key
    ) then false
    when exists (
      select 1
      from jsonb_array_elements_text(coalesce((select permission_overrides from actor)->'granted', '[]'::jsonb)) p(value)
      where p.value = permission_key
    ) then true
    else exists (
      select 1
      from public.role_permissions rp
      where rp.role = (select role from actor)
        and permission_key = any(rp.permissions)
    )
  end
$$;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'user_logs'
  loop
    execute format('drop policy if exists %I on public.user_logs', policy_name);
  end loop;
end $$;

create policy user_logs_business_select
on public.user_logs for select to authenticated
using (
  business_id is not null
  and public.can_access_business(business_id)
  and (
    public.current_app_role() = 'owner'
    or public.has_app_permission('logs')
  )
);

create policy user_logs_business_insert
on public.user_logs for insert to authenticated
with check (
  business_id is not null
  and public.can_access_business(business_id)
);

create policy user_logs_owner_delete
on public.user_logs for delete to authenticated
using (
  business_id is not null
  and public.current_app_role() = 'owner'
  and public.can_manage_business_records(business_id)
);
