alter table public.sales
add column if not exists items jsonb not null default '[]'::jsonb;

update public.sales s
set items = coalesce(item_rows.items, '[]'::jsonb)
from (
  select
    sale_id,
    jsonb_agg(
      jsonb_build_object(
        'product_code', product_code,
        'product_name', product_name,
        'quantity', quantity,
        'returned_quantity', returned_quantity,
        'net_quantity', net_quantity,
        'unit_price', unit_price,
        'unit_cost', unit_cost,
        'line_total', line_total,
        'line_cost', line_cost,
        'line_margin', line_margin
      )
      order by created_at, id
    ) as items
  from public.sale_items
  group by sale_id
) item_rows
where s.id = item_rows.sale_id
  and s.items = '[]'::jsonb;
