-- Offline desktop sync metadata.
-- These columns let desktop devices identify their own writes, detect stale
-- records, and soft-delete rows during bidirectional sync.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers',
    'suppliers',
    'inventory_categories',
    'inventory',
    'sales',
    'sale_items',
    'receipts',
    'credit_payments',
    'purchases',
    'purchase_items',
    'expenses',
    'banks',
    'bank_deposits',
    'store_settings',
    'user_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I add column if not exists sync_device_id text', table_name);
      execute format('alter table public.%I add column if not exists sync_version bigint not null default 1', table_name);
      execute format('alter table public.%I add column if not exists sync_deleted_at timestamptz', table_name);
    end if;
  end loop;
end $$;

create or replace function public.bump_sync_version()
returns trigger
language plpgsql
as $$
begin
  new.sync_version = coalesce(old.sync_version, 0) + 1;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers',
    'suppliers',
    'inventory_categories',
    'inventory',
    'sales',
    'sale_items',
    'receipts',
    'credit_payments',
    'purchases',
    'purchase_items',
    'expenses',
    'banks',
    'bank_deposits',
    'store_settings',
    'user_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop trigger if exists bump_%I_sync_version on public.%I', table_name, table_name);
      execute format(
        'create trigger bump_%I_sync_version before update on public.%I for each row execute function public.bump_sync_version()',
        table_name,
        table_name
      );
    end if;
  end loop;
end $$;
