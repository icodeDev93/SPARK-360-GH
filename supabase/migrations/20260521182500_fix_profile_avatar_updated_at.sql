alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.update_own_profile_avatar(next_avatar_url text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  update public.profiles
  set avatar_url = nullif(btrim(next_avatar_url), '')
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'No profile found for current user';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_own_profile_avatar(text) from public;
grant execute on function public.update_own_profile_avatar(text) to authenticated;
