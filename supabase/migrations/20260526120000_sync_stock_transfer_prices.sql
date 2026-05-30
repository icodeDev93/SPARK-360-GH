-- Keep product details and price structure aligned when stock is transferred
-- to a business that already has the same manual product_code.

create or replace function public.transfer_stock(
  source_business uuid,
  target_business uuid,
  source_product_code text,
  transfer_quantity integer,
  transfer_notes text default ''
)
returns public.stock_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  source_item public.inventory%rowtype;
  target_item public.inventory%rowtype;
  category_id_value uuid;
  new_transfer public.stock_transfers;
  normalized_code text := upper(btrim(source_product_code));
begin
  actor_role := public.current_app_role();
  if actor_role not in ('owner', 'manager') then
    raise exception 'Only owner or manager can transfer stock';
  end if;
  if source_business = target_business then
    raise exception 'Source and receiving businesses must be different';
  end if;
  if transfer_quantity <= 0 then
    raise exception 'Transfer quantity must be greater than zero';
  end if;
  if not public.can_access_business(source_business) or not public.can_access_business(target_business) then
    raise exception 'You do not have access to one or both businesses';
  end if;

  select * into source_item
  from public.inventory
  where business_id = source_business and product_code = normalized_code
  for update;

  if not found then
    raise exception 'Source product was not found';
  end if;
  if source_item.current_stock < transfer_quantity then
    raise exception 'Insufficient stock for transfer';
  end if;

  update public.inventory
  set current_stock = current_stock - transfer_quantity,
      single_quantity = greatest(0, single_quantity - transfer_quantity)
  where id = source_item.id;

  if source_item.category_name is not null and btrim(source_item.category_name) <> '' then
    insert into public.inventory_categories (business_id, name)
    values (target_business, source_item.category_name)
    on conflict do nothing;

    select id into category_id_value
    from public.inventory_categories
    where business_id = target_business and lower(name) = lower(source_item.category_name)
    limit 1;
  end if;

  select * into target_item
  from public.inventory
  where business_id = target_business and product_code = normalized_code
  for update;

  if found then
    update public.inventory
    set current_stock = current_stock + transfer_quantity,
        single_quantity = single_quantity + transfer_quantity,
        product_name = source_item.product_name,
        category_id = coalesce(category_id, category_id_value),
        category_name = coalesce(nullif(category_name, ''), source_item.category_name),
        supplier_name = source_item.supplier_name,
        cost_price = source_item.cost_price,
        selling_price = source_item.selling_price,
        wholesale_cost_price = source_item.wholesale_cost_price,
        single_cost_price = source_item.single_cost_price,
        wholesale_selling_price = source_item.wholesale_selling_price,
        half_selling_price = source_item.half_selling_price,
        quarter_selling_price = source_item.quarter_selling_price,
        single_selling_price = source_item.single_selling_price,
        reorder_level = source_item.reorder_level,
        quantity_per_box = source_item.quantity_per_box,
        stock_limit = source_item.stock_limit,
        expiry_date = source_item.expiry_date,
        description = source_item.description,
        price_levels = source_item.price_levels,
        image_url = source_item.image_url,
        is_active = source_item.is_active
    where id = target_item.id;
  else
    insert into public.inventory (
      business_id, product_code, product_name, category_id, category_name,
      supplier_id, supplier_name, cost_price, selling_price,
      wholesale_cost_price, single_cost_price, wholesale_selling_price,
      half_selling_price, quarter_selling_price, single_selling_price,
      current_stock, reorder_level, wholesale_quantity, single_quantity,
      quantity_per_box, stock_limit, expiry_date, description, price_levels,
      image_url, is_active
    )
    values (
      target_business, source_item.product_code, source_item.product_name, category_id_value, source_item.category_name,
      null, source_item.supplier_name, source_item.cost_price, source_item.selling_price,
      source_item.wholesale_cost_price, source_item.single_cost_price, source_item.wholesale_selling_price,
      source_item.half_selling_price, source_item.quarter_selling_price, source_item.single_selling_price,
      transfer_quantity, source_item.reorder_level, 0, transfer_quantity,
      source_item.quantity_per_box, source_item.stock_limit, source_item.expiry_date, source_item.description, source_item.price_levels,
      source_item.image_url, source_item.is_active
    );
  end if;

  insert into public.stock_transfers (
    source_business_id, target_business_id, product_code, product_name,
    category_name, quantity, notes, created_by
  )
  values (
    source_business, target_business, source_item.product_code, source_item.product_name,
    source_item.category_name, transfer_quantity, transfer_notes, auth.uid()
  )
  returning * into new_transfer;

  return new_transfer;
end;
$$;

grant execute on function public.transfer_stock(uuid, uuid, text, integer, text) to authenticated;
