alter table public.customers
  add column if not exists address text,
  add column if not exists remarks text,
  add column if not exists debt_limit numeric(12,2) not null default 0,
  add column if not exists visiting_day text not null default 'Sunday';

update public.customers
set remarks = coalesce(remarks, notes)
where remarks is null
  and notes is not null;

alter table public.customers
  drop constraint if exists customers_debt_limit_nonnegative,
  drop constraint if exists customers_visiting_day_valid;

alter table public.customers
  add constraint customers_debt_limit_nonnegative check (debt_limit >= 0),
  add constraint customers_visiting_day_valid check (
    visiting_day in ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
  );

alter table public.customers
  drop column if exists email,
  drop column if exists customer_type,
  drop column if exists notes,
  drop column if exists avatar_url;

notify pgrst, 'reload schema';
