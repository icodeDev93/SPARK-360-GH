update public.inventory
set cost_price = coalesce(wholesale_cost_price, cost_price, 0),
    updated_at = now();
