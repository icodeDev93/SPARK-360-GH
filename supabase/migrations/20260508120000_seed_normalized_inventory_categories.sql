with desired_categories(name) as (
  values
    ('Beverages'),
    ('Confectionery'),
    ('Cleaning Supplies'),
    ('Household Items'),
    ('Baby Products'),
    ('Personal Care'),
    ('Food Staples'),
    ('Canned Foods'),
    ('Bakery'),
    ('Packaging'),
    ('Miscellaneous')
)
insert into public.inventory_categories (name)
select desired_categories.name
from desired_categories
where not exists (
  select 1
  from public.inventory_categories existing
  where lower(existing.name) = lower(desired_categories.name)
);

notify pgrst, 'reload schema';
