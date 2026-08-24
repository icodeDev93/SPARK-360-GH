alter table public.store_settings
  add column if not exists invoice_due_days integer not null default 30;

alter table public.store_settings
  drop constraint if exists store_settings_invoice_due_days_range;

alter table public.store_settings
  add constraint store_settings_invoice_due_days_range
  check (invoice_due_days >= 0 and invoice_due_days <= 365);

notify pgrst, 'reload schema';
