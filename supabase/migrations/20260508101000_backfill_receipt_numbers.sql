update public.receipts r
set
  receipt_number = 'RCP-' || lpad(coalesce((regexp_match(s.receipt_number, '[0-9]+$'))[1], '0'), 6, '0'),
  receipt_payload = jsonb_set(
    coalesce(r.receipt_payload, '{}'::jsonb),
    '{receiptNo}',
    to_jsonb('RCP-' || lpad(coalesce((regexp_match(s.receipt_number, '[0-9]+$'))[1], '0'), 6, '0')),
    true
  )
from public.sales s
where r.sale_id = s.id
  and r.receipt_number = s.receipt_number
  and r.receipt_number ~ '^INV[0-9]+$';

notify pgrst, 'reload schema';
