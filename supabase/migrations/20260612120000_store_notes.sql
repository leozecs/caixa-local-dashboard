create table if not exists public.note_topics (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.note_blocks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  topic_id uuid not null references public.note_topics(id) on delete cascade,
  title text not null,
  content text not null default '',
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists note_topics_store_idx
  on public.note_topics (store_id, sort_order, created_at);

create index if not exists note_blocks_store_topic_idx
  on public.note_blocks (store_id, topic_id, sort_order, updated_at desc);

drop trigger if exists touch_note_topics_updated_at on public.note_topics;
create trigger touch_note_topics_updated_at
before update on public.note_topics
for each row execute function app_private.touch_updated_at();

drop trigger if exists touch_note_blocks_updated_at on public.note_blocks;
create trigger touch_note_blocks_updated_at
before update on public.note_blocks
for each row execute function app_private.touch_updated_at();

alter table public.note_topics enable row level security;
alter table public.note_blocks enable row level security;

drop policy if exists "note_topics_select_by_store" on public.note_topics;
create policy "note_topics_select_by_store"
on public.note_topics for select
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "note_topics_insert_by_store" on public.note_topics;
create policy "note_topics_insert_by_store"
on public.note_topics for insert
to authenticated
with check (app_private.can_access_store(store_id));

drop policy if exists "note_topics_update_by_store" on public.note_topics;
create policy "note_topics_update_by_store"
on public.note_topics for update
to authenticated
using (app_private.can_access_store(store_id))
with check (app_private.can_access_store(store_id));

drop policy if exists "note_topics_delete_by_store" on public.note_topics;
create policy "note_topics_delete_by_store"
on public.note_topics for delete
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "note_blocks_select_by_store" on public.note_blocks;
create policy "note_blocks_select_by_store"
on public.note_blocks for select
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "note_blocks_insert_by_store" on public.note_blocks;
create policy "note_blocks_insert_by_store"
on public.note_blocks for insert
to authenticated
with check (
  app_private.can_access_store(store_id)
  and exists (
    select 1
    from public.note_topics topic
    where topic.id = topic_id
      and topic.store_id = store_id
  )
);

drop policy if exists "note_blocks_update_by_store" on public.note_blocks;
create policy "note_blocks_update_by_store"
on public.note_blocks for update
to authenticated
using (app_private.can_access_store(store_id))
with check (
  app_private.can_access_store(store_id)
  and exists (
    select 1
    from public.note_topics topic
    where topic.id = topic_id
      and topic.store_id = store_id
  )
);

drop policy if exists "note_blocks_delete_by_store" on public.note_blocks;
create policy "note_blocks_delete_by_store"
on public.note_blocks for delete
to authenticated
using (app_private.can_access_store(store_id));

grant select, insert, update, delete on public.note_topics to authenticated;
grant select, insert, update, delete on public.note_blocks to authenticated;
