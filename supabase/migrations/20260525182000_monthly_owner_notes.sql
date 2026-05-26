create table if not exists public.admin_ai_insights (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'portfolio',
  summary text not null,
  opportunity text not null,
  risk text not null,
  actions text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_owner_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  month date not null,
  note text not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, month)
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_ai_insights enable row level security;
alter table public.monthly_owner_notes enable row level security;
alter table public.app_settings enable row level security;

create policy "admin_ai_insights_owner_select"
on public.admin_ai_insights for select
to authenticated
using (app_private.is_owner());

create policy "admin_ai_insights_owner_insert"
on public.admin_ai_insights for insert
to authenticated
with check (app_private.is_owner());

create policy "monthly_owner_notes_select_by_store"
on public.monthly_owner_notes for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "monthly_owner_notes_owner_insert"
on public.monthly_owner_notes for insert
to authenticated
with check (app_private.is_owner());

create policy "monthly_owner_notes_owner_update"
on public.monthly_owner_notes for update
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

create policy "monthly_owner_notes_owner_delete"
on public.monthly_owner_notes for delete
to authenticated
using (app_private.is_owner());

create policy "app_settings_owner_select"
on public.app_settings for select
to authenticated
using (app_private.is_owner());

create policy "app_settings_owner_insert"
on public.app_settings for insert
to authenticated
with check (app_private.is_owner());

create policy "app_settings_owner_update"
on public.app_settings for update
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

grant select, insert on public.admin_ai_insights to authenticated;
grant select, insert, update, delete on public.monthly_owner_notes to authenticated;
grant select, insert, update on public.app_settings to authenticated;
