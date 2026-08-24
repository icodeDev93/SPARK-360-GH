alter table public.store_settings
  add column if not exists invoice_sms_template text not null default '',
  add column if not exists payment_sms_template text not null default '';

alter table public.store_settings
  drop constraint if exists store_settings_invoice_sms_template_length,
  drop constraint if exists store_settings_payment_sms_template_length;

alter table public.store_settings
  add constraint store_settings_invoice_sms_template_length
  check (char_length(invoice_sms_template) <= 320),
  add constraint store_settings_payment_sms_template_length
  check (char_length(payment_sms_template) <= 320);
