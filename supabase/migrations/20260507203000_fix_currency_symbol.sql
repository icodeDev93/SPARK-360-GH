alter table public.store_settings
  alter column currency_symbol set default '₵';

update public.store_settings
set
  currency = 'GHS',
  currency_symbol = '₵'
where settings_key = 'default'
   or currency_symbol in ('GHS', 'â‚µ', 'Ã¢â€šÂµ', '');

notify pgrst, 'reload schema';
