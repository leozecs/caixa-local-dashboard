alter table public.stores
  alter column plan drop default,
  alter column plan type text using plan::text,
  alter column plan set default 'Trial';

alter table public.subscriptions
  alter column plan type text using plan::text;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  amount integer not null default 0 check (amount >= 0),
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

create policy "subscription_plans_select"
on public.subscription_plans for select
to authenticated
using (active = true or app_private.is_owner());

create policy "subscription_plans_owner_insert"
on public.subscription_plans for insert
to authenticated
with check (app_private.is_owner());

create policy "subscription_plans_owner_update"
on public.subscription_plans for update
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

create policy "subscription_plans_owner_delete"
on public.subscription_plans for delete
to authenticated
using (app_private.is_owner());

grant select, insert, update, delete on public.subscription_plans to authenticated;

insert into public.subscription_plans (name, amount, description, active, sort_order)
values
  ('Trial', 0, 'Teste inicial sem cobranca recorrente.', true, 0),
  ('Basico', 3900, 'Controle essencial para comercio local.', true, 1),
  ('Pro', 7900, 'Recursos completos para operacao e acompanhamento.', true, 2)
on conflict (name) do update set
  amount = excluded.amount,
  description = excluded.description,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();
