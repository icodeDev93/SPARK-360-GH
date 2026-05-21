create table if not exists public.bank_deposits (
  id uuid primary key default gen_random_uuid(),
  deposit_date date not null default current_date,
  bank_name text not null check (btrim(bank_name) <> ''),
  account_no text not null check (btrim(account_no) <> ''),
  amount numeric(12,2) not null default 0 check (amount > 0),
  remarks text,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bank_deposits_deposit_date on public.bank_deposits(deposit_date desc);
create index if not exists idx_bank_deposits_bank_name on public.bank_deposits(bank_name);

drop trigger if exists set_bank_deposits_updated_at on public.bank_deposits;
create trigger set_bank_deposits_updated_at before update on public.bank_deposits
for each row execute function public.set_updated_at();

drop trigger if exists set_bank_deposit_created_by on public.bank_deposits;
create trigger set_bank_deposit_created_by before insert on public.bank_deposits
for each row execute function public.set_expense_created_by();

alter table public.bank_deposits enable row level security;
alter table public.bank_deposits force row level security;

drop policy if exists "bank_deposits_select_backoffice" on public.bank_deposits;
create policy "bank_deposits_select_backoffice"
on public.bank_deposits for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "bank_deposits_manage_backoffice" on public.bank_deposits;
create policy "bank_deposits_manage_backoffice"
on public.bank_deposits for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bank_deposits'
  ) then
    alter publication supabase_realtime add table public.bank_deposits;
  end if;
end $$;

notify pgrst, 'reload schema';
