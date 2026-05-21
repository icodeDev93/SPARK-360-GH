alter table public.receipts
  drop constraint if exists receipts_sale_id_key;

create index if not exists idx_receipts_sale_id
on public.receipts(sale_id);

notify pgrst, 'reload schema';
