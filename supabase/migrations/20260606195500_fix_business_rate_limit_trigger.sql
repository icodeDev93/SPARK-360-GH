create or replace function public.rate_limit_business_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_business_id uuid;
  action text := tg_table_name || ':' || lower(tg_op);
  max_requests integer := 60;
  window_seconds integer := 60;
begin
  case tg_table_name
    when 'businesses' then
      row_business_id := case when tg_op = 'DELETE' then old.id else new.id end;
      max_requests := 20;
      window_seconds := 300;
    when 'business_users' then
      row_business_id := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
      max_requests := 60;
    when 'sales' then max_requests := case when tg_op = 'INSERT' then 40 else 80 end;
    when 'sale_items' then max_requests := 600;
    when 'receipts' then max_requests := 120;
    when 'credit_payments' then max_requests := 30;
    when 'stock_transfers' then max_requests := 30;
    when 'inventory' then max_requests := 120;
    when 'inventory_categories' then max_requests := 60;
    when 'expense_categories' then max_requests := 60;
    when 'expenses' then max_requests := 60;
    when 'bank_deposits' then max_requests := 60;
    when 'banks' then max_requests := 60;
    when 'customers' then max_requests := 80;
    when 'suppliers' then max_requests := 80;
    when 'purchases' then max_requests := 80;
    else max_requests := 60;
  end case;

  if row_business_id is null then
    row_business_id := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
  end if;

  perform public.check_rate_limit(action, max_requests, window_seconds, row_business_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
