update public.role_permissions
set permissions = array_append(permissions, 'credit')
where role in ('manager', 'cashier')
  and 'customers' = any(permissions)
  and not 'credit' = any(permissions);

update public.role_permissions
set permissions = array_append(permissions, 'bank-deposit')
where role in ('manager', 'cashier')
  and 'expenses' = any(permissions)
  and not 'bank-deposit' = any(permissions);

notify pgrst, 'reload schema';
