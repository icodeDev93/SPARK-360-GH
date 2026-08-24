alter table public.store_settings
  add column if not exists store_sender_id text not null default '';

alter table public.store_settings
  drop constraint if exists store_settings_sender_id_format;

alter table public.store_settings
  add constraint store_settings_sender_id_format
  check (store_sender_id = '' or store_sender_id ~ '^[A-Za-z0-9 ]{3,11}$');
