alter table public.sale_items
  add column if not exists price_level text not null default 'Single',
  add column if not exists stock_units_deducted integer not null default 0;

do $$
begin
  alter table public.sale_items drop constraint if exists sale_items_price_level_check;
  alter table public.sale_items
    add constraint sale_items_price_level_check
    check (price_level in ('Single', 'Quarter', 'Half', 'Wholesale'));
exception
  when others then null;
end $$;

alter table public.sale_items
  drop constraint if exists sale_items_stock_units_deducted_check;

alter table public.sale_items
  add constraint sale_items_stock_units_deducted_check
  check (stock_units_deducted >= 0);

create or replace function public.apply_sale_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  units_per_qty numeric;
  restored_units integer;
begin
  if tg_op = 'INSERT' then
    if new.stock_units_deducted <= 0 then
      new.stock_units_deducted = new.quantity;
    end if;

    update public.inventory
    set current_stock = greatest(0, current_stock - new.stock_units_deducted),
        single_quantity = greatest(0, single_quantity - new.stock_units_deducted)
    where business_id = new.business_id
      and product_code = new.product_code;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.returned_quantity > old.returned_quantity then
      units_per_qty := case when old.quantity > 0 then old.stock_units_deducted::numeric / old.quantity else 1 end;
      restored_units := greatest(0, round((new.returned_quantity - old.returned_quantity) * units_per_qty)::integer);

      update public.inventory
      set current_stock = current_stock + restored_units,
          single_quantity = single_quantity + restored_units
      where business_id = new.business_id
        and product_code = new.product_code;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    units_per_qty := case when old.quantity > 0 then old.stock_units_deducted::numeric / old.quantity else 1 end;
    restored_units := greatest(0, round((old.quantity - old.returned_quantity) * units_per_qty)::integer);

    update public.inventory
    set current_stock = current_stock + restored_units,
        single_quantity = single_quantity + restored_units
    where business_id = old.business_id
      and product_code = old.product_code;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists sale_items_apply_stock_insert on public.sale_items;
create trigger sale_items_apply_stock_insert
before insert on public.sale_items
for each row execute function public.apply_sale_item_stock();

drop trigger if exists sale_items_apply_stock_update on public.sale_items;
create trigger sale_items_apply_stock_update
after update of returned_quantity on public.sale_items
for each row execute function public.apply_sale_item_stock();

drop trigger if exists sale_items_apply_stock_delete on public.sale_items;
create trigger sale_items_apply_stock_delete
after delete on public.sale_items
for each row execute function public.apply_sale_item_stock();
