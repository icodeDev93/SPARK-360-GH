-- Allow the platform admin console to read platform user and membership data.

drop policy if exists profiles_select_platform_admin on public.profiles;
create policy profiles_select_platform_admin
on public.profiles for select to authenticated
using (public.is_platform_admin());

drop policy if exists business_users_select_platform_admin on public.business_users;
create policy business_users_select_platform_admin
on public.business_users for select to authenticated
using (public.is_platform_admin());

grant select on public.profiles to authenticated;
grant select on public.business_users to authenticated;
