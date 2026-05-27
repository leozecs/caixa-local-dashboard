insert into storage.buckets (id, name, public)
values ('entry-attachments', 'entry-attachments', false)
on conflict (id) do nothing;

create table if not exists public.entry_attachments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  entry_id uuid not null references public.financial_entries(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  file_type text,
  file_size integer not null default 0 check (file_size >= 0),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists entry_attachments_entry_idx
  on public.entry_attachments (entry_id, created_at desc);

alter table public.entry_attachments enable row level security;

drop policy if exists "entry_attachments_select_by_store" on public.entry_attachments;
drop policy if exists "entry_attachments_insert_by_store" on public.entry_attachments;
drop policy if exists "entry_attachments_delete_by_store" on public.entry_attachments;

create policy "entry_attachments_select_by_store"
on public.entry_attachments for select
to authenticated
using (app_private.can_access_store(store_id));

create policy "entry_attachments_insert_by_store"
on public.entry_attachments for insert
to authenticated
with check (app_private.can_access_store(store_id));

create policy "entry_attachments_delete_by_store"
on public.entry_attachments for delete
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "entry_attachments_storage_select" on storage.objects;
drop policy if exists "entry_attachments_storage_insert" on storage.objects;
drop policy if exists "entry_attachments_storage_update" on storage.objects;
drop policy if exists "entry_attachments_storage_delete" on storage.objects;

create policy "entry_attachments_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'entry-attachments'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

create policy "entry_attachments_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'entry-attachments'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

create policy "entry_attachments_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'entry-attachments'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'entry-attachments'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

create policy "entry_attachments_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'entry-attachments'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

create or replace function app_private.plan_key(plan_name text)
returns text
language sql
immutable
as $$
  select case
    when lower(plan_name) like '%gestao local%' then 'gestao_local'
    when lower(plan_name) like '%essencial%' then 'essencial'
    when lower(plan_name) like '%economico%' then 'economico'
    else 'custom'
  end
$$;

create or replace function app_private.plan_max_users(plan_name text)
returns integer
language sql
immutable
as $$
  select case app_private.plan_key(plan_name)
    when 'gestao_local' then 5
    when 'essencial' then 3
    else 1
  end
$$;

create or replace function app_private.store_can_use_alerts(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select app_private.plan_key(plan) in ('essencial', 'gestao_local')
  from public.stores
  where id = target_store_id
$$;

create or replace function app_private.store_can_use_ai(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select app_private.plan_key(plan) = 'gestao_local'
  from public.stores
  where id = target_store_id
$$;

create or replace function app_private.store_member_count(target_store_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer from public.store_members where store_id = target_store_id
$$;

create or replace function app_private.can_add_store_member(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select app_private.store_member_count(target_store_id) < app_private.plan_max_users(plan)
  from public.stores
  where id = target_store_id
$$;

drop policy if exists "store_members_owner_manage" on public.store_members;
create policy "store_members_owner_manage"
on public.store_members for all
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner() and app_private.can_add_store_member(store_id));

drop policy if exists "ai_insights_select_by_store" on public.ai_insights;
drop policy if exists "ai_insights_insert_by_store" on public.ai_insights;
create policy "ai_insights_select_by_store"
on public.ai_insights for select
to authenticated
using (app_private.can_access_store(store_id) and app_private.store_can_use_ai(store_id));

create policy "ai_insights_insert_by_store"
on public.ai_insights for insert
to authenticated
with check (app_private.can_access_store(store_id) and app_private.store_can_use_ai(store_id));

grant select, insert, delete on public.entry_attachments to authenticated;
grant execute on function app_private.plan_key(text) to authenticated;
grant execute on function app_private.plan_max_users(text) to authenticated;
grant execute on function app_private.store_can_use_alerts(uuid) to authenticated;
grant execute on function app_private.store_can_use_ai(uuid) to authenticated;
grant execute on function app_private.store_member_count(uuid) to authenticated;
grant execute on function app_private.can_add_store_member(uuid) to authenticated;
