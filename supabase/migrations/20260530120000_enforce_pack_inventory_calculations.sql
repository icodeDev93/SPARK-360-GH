-- Enforce pack-based inventory calculations at the database layer.
-- UI users enter wholesale/single quantities and units per pack; current_stock is derived.
-- Half and quarter selling prices are derived from wholesale selling price.

create or replace function public.enforce_inventory_pack_calculations()
returns trigger
language plpgsql
as $$
begin
  new.wholesale_quantity = greatest(coalesce(new.wholesale_quantity, 0), 0);
  new.single_quantity = greatest(coalesce(new.single_quantity, 0), 0);
  new.quantity_per_box = greatest(coalesce(new.quantity_per_box, 0), 0);
  new.stock_limit = greatest(coalesce(new.stock_limit, 0), 0);
  new.wholesale_cost_price = greatest(coalesce(new.wholesale_cost_price, 0), 0);
  new.single_cost_price = greatest(coalesce(new.single_cost_price, 0), 0);
  new.wholesale_selling_price = greatest(coalesce(new.wholesale_selling_price, 0), 0);
  new.single_selling_price = greatest(coalesce(new.single_selling_price, 0), 0);

  new.half_selling_price = round(new.wholesale_selling_price / 2, 2);
  new.quarter_selling_price = round(new.wholesale_selling_price / 4, 2);

  new.current_stock = case
    when new.quantity_per_box > 0 then floor(new.wholesale_quantity * new.quantity_per_box + new.single_quantity)::integer
    else floor(new.single_quantity)::integer
  end;

  new.cost_price = new.wholesale_cost_price;
  new.selling_price = coalesce(nullif(new.single_selling_price, 0), new.wholesale_selling_price, 0);
  new.reorder_level = new.stock_limit;

  return new;
end;
$$;

drop trigger if exists enforce_inventory_pack_calculations_insert on public.inventory;
create trigger enforce_inventory_pack_calculations_insert
before insert on public.inventory
for each row execute function public.enforce_inventory_pack_calculations();

drop trigger if exists enforce_inventory_pack_calculations_update on public.inventory;
create trigger enforce_inventory_pack_calculations_update
before update of
  wholesale_quantity,
  single_quantity,
  quantity_per_box,
  stock_limit,
  wholesale_cost_price,
  single_cost_price,
  wholesale_selling_price,
  single_selling_price
on public.inventory
for each row execute function public.enforce_inventory_pack_calculations();

update public.inventory
set wholesale_quantity = wholesale_quantity;
