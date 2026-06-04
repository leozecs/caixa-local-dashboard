alter table public.financial_entries
  add column if not exists down_payment_amount integer check (down_payment_amount is null or down_payment_amount >= 0),
  add column if not exists import_source text;

create index if not exists financial_entries_store_import_source_idx
  on public.financial_entries (store_id, import_source)
  where import_source is not null;
