alter table public.financial_entries
  add column if not exists installments integer not null default 1
    check (installments >= 1 and installments <= 120),
  add column if not exists recurring_parent_id uuid references public.financial_entries(id) on delete cascade,
  add column if not exists recurring_month date;

create unique index if not exists financial_entries_recurring_month_idx
  on public.financial_entries (store_id, recurring_parent_id, recurring_month)
  where recurring_parent_id is not null;

create index if not exists financial_entries_recurring_parent_idx
  on public.financial_entries (store_id, recurring_parent_id, entry_date);

alter function app_private.touch_updated_at() set search_path = public;
alter function app_private.plan_key(text) set search_path = public;
alter function app_private.plan_max_users(text) set search_path = public;
