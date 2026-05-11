create sequence if not exists public.purchase_number_seq;

select setval(
  'public.purchase_number_seq',
  greatest(
    coalesce((
      select max((regexp_match(purchase_number, '^PO-([0-9]+)$'))[1]::bigint)
      from public.purchases
      where purchase_number ~ '^PO-[0-9]+$'
    ), 0),
    1
  ),
  coalesce((
    select max((regexp_match(purchase_number, '^PO-([0-9]+)$'))[1]::bigint)
    from public.purchases
    where purchase_number ~ '^PO-[0-9]+$'
  ), 0) > 0
);

create or replace function public.set_purchase_number()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.purchase_number, '') = '' then
    new.purchase_number = 'PO-' || lpad(nextval('public.purchase_number_seq')::text, 4, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists set_purchase_number on public.purchases;
create trigger set_purchase_number
before insert on public.purchases
for each row
execute function public.set_purchase_number();

notify pgrst, 'reload schema';
