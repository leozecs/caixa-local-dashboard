create schema if not exists app_private;

create type public.user_role as enum ('owner', 'lojista');
create type public.store_status as enum ('ativa', 'pendente', 'trial', 'cancelada');
create type public.store_plan as enum ('Básico', 'Pro', 'Trial');
create type public.entry_type as enum ('receita', 'despesa');
create type public.payment_method as enum ('Pix', 'Cartão', 'Dinheiro', 'Boleto', 'Transferência');
create type public.subscription_status as enum ('em_dia', 'em_atraso', 'trial', 'cancelada');
create type public.billing_status as enum ('pago', 'pendente', 'atrasado', 'cancelado');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role public.user_role not null default 'lojista',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  segment text not null,
  city text not null default 'Vinhedo/SP',
  cnpj text,
  status public.store_status not null default 'trial',
  plan public.store_plan not null default 'Trial',
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  entry_date date not null,
  type public.entry_type not null,
  category text not null,
  description text,
  payment_method public.payment_method not null default 'Pix',
  amount integer not null check (amount > 0),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_goals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  reference_month date not null,
  revenue integer not null default 0 check (revenue >= 0),
  margin numeric(5,2) not null default 20 check (margin >= 0 and margin <= 100),
  max_expenses integer not null default 0 check (max_expenses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, reference_month)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan public.store_plan not null,
  amount integer not null default 0 check (amount >= 0),
  next_charge_date date not null,
  status public.subscription_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id)
);

create table public.billing_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  reference_month date not null,
  amount integer not null check (amount >= 0),
  due_date date not null,
  paid_at date,
  status public.billing_status not null default 'pendente',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_entries_store_date_idx
  on public.financial_entries (store_id, entry_date desc, created_at desc);

create index store_goals_store_month_idx
  on public.store_goals (store_id, reference_month desc);

create index billing_records_store_due_idx
  on public.billing_records (store_id, due_date desc);

create or replace function app_private.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function app_private.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(app_private.current_user_role() = 'owner'::public.user_role, false)
$$;

create or replace function app_private.can_access_store(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select app_private.is_owner()
    or exists (
      select 1
      from public.store_members member
      where member.store_id = target_store_id
        and member.user_id = auth.uid()
    )
$$;

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  should_be_owner boolean;
begin
  select not exists (select 1 from public.profiles where role = 'owner')
    into should_be_owner;

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'lojista'), '@', 1)),
    case when should_be_owner then 'owner'::public.user_role else 'lojista'::public.user_role end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function app_private.touch_updated_at();

create trigger touch_stores_updated_at
before update on public.stores
for each row execute function app_private.touch_updated_at();

create trigger touch_financial_entries_updated_at
before update on public.financial_entries
for each row execute function app_private.touch_updated_at();

create trigger touch_store_goals_updated_at
before update on public.store_goals
for each row execute function app_private.touch_updated_at();

create trigger touch_subscriptions_updated_at
before update on public.subscriptions
for each row execute function app_private.touch_updated_at();

create trigger touch_billing_records_updated_at
before update on public.billing_records
for each row execute function app_private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.financial_entries enable row level security;
alter table public.store_goals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_records enable row level security;

create policy "profiles_select_own_or_owner"
on public.profiles for select
to authenticated
using (id = auth.uid() or app_private.is_owner());

create policy "profiles_owner_update"
on public.profiles for update
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

create policy "stores_select_by_membership"
on public.stores for select
to authenticated
using (app_private.can_access_store(id));

create policy "stores_owner_insert"
on public.stores for insert
to authenticated
with check (app_private.is_owner());

create policy "stores_owner_update"
on public.stores for update
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

create policy "stores_owner_delete"
on public.stores for delete
to authenticated
using (app_private.is_owner());

create policy "store_members_select"
on public.store_members for select
to authenticated
using (app_private.is_owner() or user_id = auth.uid());

create policy "store_members_owner_manage"
on public.store_members for all
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

create policy "financial_entries_select_by_store"
on public.financial_entries for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "financial_entries_insert_by_store"
on public.financial_entries for insert
to authenticated
with check (app_private.can_access_store(store_id));

create policy "financial_entries_update_by_store"
on public.financial_entries for update
to authenticated
using (app_private.can_access_store(store_id))
with check (app_private.can_access_store(store_id));

create policy "financial_entries_delete_by_store"
on public.financial_entries for delete
to authenticated
using (app_private.can_access_store(store_id));

create policy "store_goals_select_by_store"
on public.store_goals for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "store_goals_insert_by_store"
on public.store_goals for insert
to authenticated
with check (app_private.can_access_store(store_id));

create policy "store_goals_update_by_store"
on public.store_goals for update
to authenticated
using (app_private.can_access_store(store_id))
with check (app_private.can_access_store(store_id));

create policy "subscriptions_select_owner_or_store"
on public.subscriptions for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "subscriptions_owner_manage"
on public.subscriptions for all
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

create policy "billing_records_select_owner_or_store"
on public.billing_records for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "billing_records_owner_manage"
on public.billing_records for all
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.is_owner() to authenticated;
grant execute on function app_private.can_access_store(uuid) to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.store_members to authenticated;
grant select, insert, update, delete on public.financial_entries to authenticated;
grant select, insert, update, delete on public.store_goals to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.billing_records to authenticated;
