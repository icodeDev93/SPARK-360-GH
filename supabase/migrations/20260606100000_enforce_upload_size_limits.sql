-- Enforce upload limits at Supabase Storage level.
-- UI mirrors these same limits in src/lib/uploadLimits.ts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-images', 'profile-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('store-logos', 'store-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('expense-proofs', 'expense-proofs', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Product images: 3 MB, JPG/PNG/WebP
drop policy if exists "product_images_authenticated_insert" on storage.objects;
drop policy if exists "product_images_authenticated_update" on storage.objects;
drop policy if exists "product_images_authenticated_delete" on storage.objects;
drop policy if exists product_images_authenticated_write on storage.objects;
drop policy if exists product_images_authenticated_insert on storage.objects;
drop policy if exists product_images_authenticated_update on storage.objects;
drop policy if exists product_images_authenticated_delete on storage.objects;

create policy product_images_authenticated_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy product_images_authenticated_update
on storage.objects for update to authenticated
using (bucket_id = 'product-images')
with check (
  bucket_id = 'product-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy product_images_authenticated_delete
on storage.objects for delete to authenticated
using (bucket_id = 'product-images');

-- Profile images: 2 MB, JPG/PNG/WebP, scoped to the current user folder.
drop policy if exists "profile_images_authenticated_insert_own" on storage.objects;
drop policy if exists "profile_images_authenticated_update_own" on storage.objects;
drop policy if exists "profile_images_authenticated_delete_own" on storage.objects;
drop policy if exists profile_images_authenticated_write_own on storage.objects;
drop policy if exists profile_images_authenticated_insert_own on storage.objects;
drop policy if exists profile_images_authenticated_update_own on storage.objects;
drop policy if exists profile_images_authenticated_delete_own on storage.objects;

create policy profile_images_authenticated_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy profile_images_authenticated_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy profile_images_authenticated_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Store logos: 2 MB, JPG/PNG/WebP
drop policy if exists store_logos_authenticated_write on storage.objects;
drop policy if exists store_logos_authenticated_insert on storage.objects;
drop policy if exists store_logos_authenticated_update on storage.objects;
drop policy if exists store_logos_authenticated_delete on storage.objects;

create policy store_logos_authenticated_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'store-logos'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy store_logos_authenticated_update
on storage.objects for update to authenticated
using (bucket_id = 'store-logos')
with check (
  bucket_id = 'store-logos'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy store_logos_authenticated_delete
on storage.objects for delete to authenticated
using (bucket_id = 'store-logos');

-- Expense proofs: 5 MB, JPG/PNG/WebP/PDF
drop policy if exists "expense_proofs_authenticated_insert" on storage.objects;
drop policy if exists "expense_proofs_authenticated_update" on storage.objects;
drop policy if exists "expense_proofs_authenticated_delete" on storage.objects;
drop policy if exists expense_proofs_authenticated_write on storage.objects;
drop policy if exists expense_proofs_authenticated_insert on storage.objects;
drop policy if exists expense_proofs_authenticated_update on storage.objects;
drop policy if exists expense_proofs_authenticated_delete on storage.objects;

create policy expense_proofs_authenticated_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'expense-proofs'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);

create policy expense_proofs_authenticated_update
on storage.objects for update to authenticated
using (bucket_id = 'expense-proofs')
with check (
  bucket_id = 'expense-proofs'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);

create policy expense_proofs_authenticated_delete
on storage.objects for delete to authenticated
using (bucket_id = 'expense-proofs');
