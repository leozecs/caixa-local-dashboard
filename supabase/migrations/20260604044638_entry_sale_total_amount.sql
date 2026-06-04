alter table public.financial_entries
add column if not exists sale_total_amount integer;

alter table public.financial_entries
add constraint financial_entries_sale_total_amount_non_negative
check (sale_total_amount is null or sale_total_amount >= 0);
