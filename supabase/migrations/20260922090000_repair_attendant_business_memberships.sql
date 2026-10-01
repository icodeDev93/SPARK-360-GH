-- Restore memberships for attendants whose profile still points to an active business.
-- get_accessible_businesses requires this row even when primary_business_id is set.
insert into public.business_users (business_id, user_id, role)
select p.primary_business_id, p.id, 'cashier'
from public.profiles p
join public.businesses b on b.id = p.primary_business_id
where p.role = 'cashier'
  and p.status = 'Active'
  and b.status = 'active'
on conflict (business_id, user_id) do update set role = 'cashier';
