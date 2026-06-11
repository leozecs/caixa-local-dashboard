alter table public.stores
  add column if not exists profile_type text not null default 'vendas'
    check (profile_type in ('vendas', 'pessoal')),
  add column if not exists personal_focus text;

alter table public.financial_entries
  add column if not exists product_cost_amount integer
    check (product_cost_amount is null or product_cost_amount >= 0);

grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.financial_entries to authenticated;
