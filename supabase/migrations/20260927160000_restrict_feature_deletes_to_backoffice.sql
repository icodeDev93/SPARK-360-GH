do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('customers', 'customers'), ('suppliers', 'purchases'),
      ('inventory_categories', 'inventory'), ('inventory', 'inventory'),
      ('sales', 'pos'), ('sale_items', 'pos'), ('receipts', 'pos'),
      ('credit_payments', 'credit'), ('purchases', 'purchases'),
      ('purchase_items', 'purchases'), ('expense_categories', 'expenses'),
      ('expenses', 'expenses'), ('banks', 'bank-deposit'),
      ('bank_deposits', 'bank-deposit'), ('store_settings', 'settings')
    ) as mapped(table_name, permission_key)
  loop
    if to_regclass(format('public.%I', item.table_name)) is not null then
      execute format('drop policy if exists %I on public.%I', item.table_name || '_permission_delete', item.table_name);
      execute format(
        'create policy %I on public.%I for delete to authenticated using (business_id is not null and public.current_app_role() in (''owner'', ''manager'') and public.has_business_permission(%L, business_id))',
        item.table_name || '_permission_delete', item.table_name, item.permission_key
      );
    end if;
  end loop;
end $$;
