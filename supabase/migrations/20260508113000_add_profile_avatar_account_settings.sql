alter table public.profiles
add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  2097152,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_images_public_read" on storage.objects;
create policy "profile_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'profile-images');

drop policy if exists "profile_images_authenticated_insert_own" on storage.objects;
create policy "profile_images_authenticated_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png')
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "profile_images_authenticated_update_own" on storage.objects;
create policy "profile_images_authenticated_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png')
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "profile_images_authenticated_delete_own" on storage.objects;
create policy "profile_images_authenticated_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

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
  set
    avatar_url = nullif(btrim(next_avatar_url), ''),
    updated_at = now()
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found for current user';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_own_profile_avatar(text) from public;
grant execute on function public.update_own_profile_avatar(text) to authenticated;

notify pgrst, 'reload schema';
