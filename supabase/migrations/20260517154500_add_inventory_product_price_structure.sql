alter table public.inventory
  add column if not exists wholesale_cost_price numeric(12,2) not null default 0 check (wholesale_cost_price >= 0),
  add column if not exists single_cost_price numeric(12,2) not null default 0 check (single_cost_price >= 0),
  add column if not exists wholesale_selling_price numeric(12,2) not null default 0 check (wholesale_selling_price >= 0),
  add column if not exists half_selling_price numeric(12,2) not null default 0 check (half_selling_price >= 0),
  add column if not exists quarter_selling_price numeric(12,2) not null default 0 check (quarter_selling_price >= 0),
  add column if not exists single_selling_price numeric(12,2) not null default 0 check (single_selling_price >= 0),
  add column if not exists wholesale_quantity numeric(12,2) not null default 0 check (wholesale_quantity >= 0),
  add column if not exists single_quantity integer not null default 0 check (single_quantity >= 0),
  add column if not exists quantity_per_box integer not null default 0 check (quantity_per_box >= 0),
  add column if not exists stock_limit integer not null default 0 check (stock_limit >= 0),
  add column if not exists description text not null default '',
  add column if not exists price_levels jsonb not null default '[]'::jsonb;

update public.inventory
set
  single_cost_price = case when single_cost_price = 0 then cost_price else single_cost_price end,
  single_selling_price = case when single_selling_price = 0 then selling_price else single_selling_price end,
  wholesale_cost_price = case when wholesale_cost_price = 0 then cost_price else wholesale_cost_price end,
  wholesale_selling_price = case when wholesale_selling_price = 0 then selling_price else wholesale_selling_price end,
  single_quantity = case when single_quantity = 0 then current_stock else single_quantity end,
  stock_limit = case when stock_limit = 0 then reorder_level else stock_limit end;

notify pgrst, 'reload schema';
