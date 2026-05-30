insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-logos', 'store-logos', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists store_logos_public_read on storage.objects;
create policy store_logos_public_read on storage.objects
for select to public using (bucket_id = 'store-logos');

drop policy if exists store_logos_authenticated_write on storage.objects;
create policy store_logos_authenticated_write on storage.objects
for all to authenticated
using (bucket_id = 'store-logos')
with check (
  bucket_id = 'store-logos'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png')
);
