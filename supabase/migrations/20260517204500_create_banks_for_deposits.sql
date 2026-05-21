create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null check (btrim(bank_name) <> ''),
  branch text not null check (btrim(branch) <> ''),
  address text not null check (btrim(address) <> ''),
  telephone text not null check (btrim(telephone) <> ''),
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_name, branch)
);

alter table public.bank_deposits
  add column if not exists bank_id uuid references public.banks(id) on delete set null;

create index if not exists idx_banks_bank_name on public.banks(bank_name);
create index if not exists idx_bank_deposits_bank_id on public.bank_deposits(bank_id);

drop trigger if exists set_banks_updated_at on public.banks;
create trigger set_banks_updated_at before update on public.banks
for each row execute function public.set_updated_at();

drop trigger if exists set_bank_created_by on public.banks;
create trigger set_bank_created_by before insert on public.banks
for each row execute function public.set_expense_created_by();

alter table public.banks enable row level security;
alter table public.banks force row level security;

drop policy if exists "banks_select_backoffice" on public.banks;
create policy "banks_select_backoffice"
on public.banks for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "banks_manage_backoffice" on public.banks;
create policy "banks_manage_backoffice"
on public.banks for all
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
      and tablename = 'banks'
  ) then
    alter publication supabase_realtime add table public.banks;
  end if;
end $$;

notify pgrst, 'reload schema';
