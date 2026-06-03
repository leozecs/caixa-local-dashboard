alter table public.stores
  add column if not exists default_commission_percent numeric(5,2) not null default 1
  check (default_commission_percent >= 0 and default_commission_percent <= 100);

alter table public.financial_entries
  add column if not exists salesperson_name text,
  add column if not exists commission_percent numeric(5,2),
  add column if not exists commission_amount integer not null default 0 check (commission_amount >= 0),
  add column if not exists is_recurring boolean not null default false;

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  type public.entry_type not null,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_categories_store_type_name_idx
  on public.store_categories (store_id, type, lower(name));

create index if not exists store_categories_store_type_sort_idx
  on public.store_categories (store_id, type, sort_order, name);

drop trigger if exists touch_store_categories_updated_at on public.store_categories;
create trigger touch_store_categories_updated_at
before update on public.store_categories
for each row execute function app_private.touch_updated_at();

alter table public.store_categories enable row level security;

drop policy if exists "store_categories_select_by_store" on public.store_categories;
create policy "store_categories_select_by_store"
on public.store_categories for select
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "store_categories_insert_by_store" on public.store_categories;
create policy "store_categories_insert_by_store"
on public.store_categories for insert
to authenticated
with check (app_private.can_manage_store(store_id));

drop policy if exists "store_categories_update_by_store" on public.store_categories;
create policy "store_categories_update_by_store"
on public.store_categories for update
to authenticated
using (app_private.can_manage_store(store_id))
with check (app_private.can_manage_store(store_id));

drop policy if exists "store_categories_delete_by_store" on public.store_categories;
create policy "store_categories_delete_by_store"
on public.store_categories for delete
to authenticated
using (app_private.can_manage_store(store_id));

insert into public.store_categories (store_id, type, name, sort_order)
select stores.id, defaults.type::public.entry_type, defaults.name, defaults.sort_order
from public.stores
cross join (
  values
    ('receita', 'Vendas', 10),
    ('receita', 'Pix', 20),
    ('receita', 'Cartao', 30),
    ('receita', 'Dinheiro', 40),
    ('receita', 'Delivery', 50),
    ('receita', 'Outros', 60),
    ('despesa', 'Aluguel', 10),
    ('despesa', 'Funcionarios', 20),
    ('despesa', 'Produtos', 30),
    ('despesa', 'Fornecedores', 40),
    ('despesa', 'Marketing', 50),
    ('despesa', 'Taxas', 60),
    ('despesa', 'Impostos', 70),
    ('despesa', 'Outros', 80)
) as defaults(type, name, sort_order)
on conflict (store_id, type, lower(name)) do nothing;

insert into public.store_categories (store_id, type, name, sort_order)
select distinct store_id, type, category, 100
from public.financial_entries
where category is not null and length(trim(category)) > 0
on conflict (store_id, type, lower(name)) do nothing;

grant select, insert, update, delete on public.store_categories to authenticated;
