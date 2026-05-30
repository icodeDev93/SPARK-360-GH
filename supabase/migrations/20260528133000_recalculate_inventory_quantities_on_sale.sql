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
        wholesale_quantity = case
          when quantity_per_box > 0 then floor(greatest(0, current_stock - new.stock_units_deducted)::numeric / quantity_per_box)::integer
          else 0
        end,
        single_quantity = case
          when quantity_per_box > 0 then mod(greatest(0, current_stock - new.stock_units_deducted), quantity_per_box)
          else greatest(0, current_stock - new.stock_units_deducted)
        end,
        updated_at = now()
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
          wholesale_quantity = case
            when quantity_per_box > 0 then floor((current_stock + restored_units)::numeric / quantity_per_box)::integer
            else 0
          end,
          single_quantity = case
            when quantity_per_box > 0 then mod(current_stock + restored_units, quantity_per_box)
            else current_stock + restored_units
          end,
          updated_at = now()
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
        wholesale_quantity = case
          when quantity_per_box > 0 then floor((current_stock + restored_units)::numeric / quantity_per_box)::integer
          else 0
        end,
        single_quantity = case
          when quantity_per_box > 0 then mod(current_stock + restored_units, quantity_per_box)
          else current_stock + restored_units
        end,
        updated_at = now()
    where business_id = old.business_id
      and product_code = old.product_code;

    return old;
  end if;

  return null;
end;
$$;

update public.inventory
set wholesale_quantity = case
      when quantity_per_box > 0 then floor(greatest(0, current_stock)::numeric / quantity_per_box)::integer
      else 0
    end,
    single_quantity = case
      when quantity_per_box > 0 then mod(greatest(0, current_stock), quantity_per_box)
      else greatest(0, current_stock)
    end,
    updated_at = now();
