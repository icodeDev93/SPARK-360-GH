create sequence if not exists public.supplier_code_seq;

select setval(
  'public.supplier_code_seq',
  greatest(
    coalesce((
      select max((regexp_match(supplier_code, '^sup([0-9]+)$'))[1]::bigint)
      from public.suppliers
      where supplier_code ~ '^sup[0-9]+$'
    ), 0),
    1
  ),
  coalesce((
    select max((regexp_match(supplier_code, '^sup([0-9]+)$'))[1]::bigint)
    from public.suppliers
    where supplier_code ~ '^sup[0-9]+$'
  ), 0) > 0
);

alter table public.suppliers
  alter column supplier_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = any(con.conkey)
    where con.conrelid = 'public.suppliers'::regclass
      and con.contype in ('u', 'p')
      and att.attname = 'supplier_code'
  ) then
    alter table public.suppliers
      add constraint suppliers_supplier_code_key unique (supplier_code);
  end if;
end $$;

create or replace function public.set_supplier_code()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.supplier_code, '') = '' then
    new.supplier_code = 'sup' || lpad(nextval('public.supplier_code_seq')::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists set_supplier_code on public.suppliers;
create trigger set_supplier_code
before insert on public.suppliers
for each row
execute function public.set_supplier_code();

notify pgrst, 'reload schema';
