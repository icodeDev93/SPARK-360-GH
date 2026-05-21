alter table public.sales
  add column if not exists invoice_number text;

update public.sales
set invoice_number = receipt_number
where invoice_number is null;

alter table public.sales
  alter column invoice_number set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_invoice_number_key'
  ) then
    alter table public.sales
      add constraint sales_invoice_number_key unique (invoice_number);
  end if;
end $$;

alter table public.sales
  alter column receipt_number drop not null;

update public.sales s
set receipt_number = r.receipt_number
from public.receipts r
where r.sale_id = s.id
  and s.status <> 'credit';

delete from public.receipts r
using public.sales s
where r.sale_id = s.id
  and s.status = 'credit';

update public.sales
set receipt_number = null
where status = 'credit';

create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  sale_id text,
  amount numeric not null check (amount > 0),
  payment_method text not null,
  notes text default '',
  created_at timestamptz default now()
);

alter table public.credit_payments
  add column if not exists invoice_number text,
  add column if not exists receipt_id uuid references public.receipts(id) on delete set null;

update public.credit_payments
set invoice_number = sale_id
where invoice_number is null
  and sale_id like 'INV%';

create index if not exists idx_sales_invoice_number
on public.sales(invoice_number);

create index if not exists idx_credit_payments_invoice_number
on public.credit_payments(invoice_number);

create index if not exists idx_credit_payments_receipt_id
on public.credit_payments(receipt_id);

alter table public.credit_payments enable row level security;
alter table public.credit_payments force row level security;

drop policy if exists credit_payments_select_active_users on public.credit_payments;
create policy credit_payments_select_active_users
on public.credit_payments for select
to authenticated
using (public.is_active_app_user());

drop policy if exists credit_payments_insert_active_users on public.credit_payments;
create policy credit_payments_insert_active_users
on public.credit_payments for insert
to authenticated
with check (public.is_active_app_user());

drop policy if exists credit_payments_update_backoffice on public.credit_payments;
create policy credit_payments_update_backoffice
on public.credit_payments for update
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists credit_payments_delete_admin on public.credit_payments;
create policy credit_payments_delete_admin
on public.credit_payments for delete
to authenticated
using (public.is_admin_user());

notify pgrst, 'reload schema';
