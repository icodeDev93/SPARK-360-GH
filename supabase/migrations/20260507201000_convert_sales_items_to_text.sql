do $$
declare
  items_type text;
begin
  select data_type into items_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sales'
    and column_name = 'items';

  if items_type is null then
    alter table public.sales add column items text not null default '';
  elsif items_type = 'jsonb' then
    alter table public.sales add column if not exists items_text text not null default '';

    update public.sales
    set items_text = coalesce((
      select string_agg(
        item->>'product_name' || ' [' || coalesce(item->>'net_quantity', item->>'quantity', '0') || ' pcs]',
        ', '
        order by ord
      )
      from jsonb_array_elements(items) with ordinality as entries(item, ord)
    ), '');

    alter table public.sales drop column items;
    alter table public.sales rename column items_text to items;
    alter table public.sales alter column items set default '';
    alter table public.sales alter column items set not null;
  end if;
end $$;

update public.sales s
set items = coalesce(item_rows.items, '')
from (
  select
    sale_id,
    string_agg(
      product_name || ' [' || net_quantity::text || ' pcs]',
      ', '
      order by created_at, id
    ) as items
  from public.sale_items
  group by sale_id
) item_rows
where s.id = item_rows.sale_id
  and coalesce(s.items, '') = '';

notify pgrst, 'reload schema';
