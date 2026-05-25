create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  summary text not null,
  opportunity text not null,
  risk text not null,
  actions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.ai_insights enable row level security;

create policy "ai_insights_select_by_store"
on public.ai_insights for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "ai_insights_insert_by_store"
on public.ai_insights for insert
to authenticated
with check (app_private.can_access_store(store_id));

grant select, insert on public.ai_insights to authenticated;
