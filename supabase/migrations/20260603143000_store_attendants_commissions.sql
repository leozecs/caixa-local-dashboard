create table if not exists public.store_attendants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  commission_percent numeric(5,2) not null default 1
    check (commission_percent >= 0 and commission_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_attendants_store_name_idx
  on public.store_attendants (store_id, lower(name));

create index if not exists store_attendants_store_name_sort_idx
  on public.store_attendants (store_id, name);

drop trigger if exists touch_store_attendants_updated_at on public.store_attendants;
create trigger touch_store_attendants_updated_at
before update on public.store_attendants
for each row execute function app_private.touch_updated_at();

alter table public.store_attendants enable row level security;

drop policy if exists "store_attendants_select_by_store" on public.store_attendants;
create policy "store_attendants_select_by_store"
on public.store_attendants for select
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "store_attendants_insert_by_store" on public.store_attendants;
create policy "store_attendants_insert_by_store"
on public.store_attendants for insert
to authenticated
with check (app_private.can_manage_store(store_id));

drop policy if exists "store_attendants_update_by_store" on public.store_attendants;
create policy "store_attendants_update_by_store"
on public.store_attendants for update
to authenticated
using (app_private.can_manage_store(store_id))
with check (app_private.can_manage_store(store_id));

drop policy if exists "store_attendants_delete_by_store" on public.store_attendants;
create policy "store_attendants_delete_by_store"
on public.store_attendants for delete
to authenticated
using (app_private.can_manage_store(store_id));

insert into public.store_attendants (store_id, name, commission_percent)
select sm.store_id, p.name, coalesce(sm.commission_percent, s.default_commission_percent, 1)
from public.store_members sm
join public.profiles p on p.id = sm.user_id
join public.stores s on s.id = sm.store_id
where sm.role = 'atendente'
  and not exists (
    select 1
    from public.store_attendants sa
    where sa.store_id = sm.store_id
      and lower(sa.name) = lower(p.name)
  );

alter table public.store_members
  drop column if exists commission_percent;

grant select, insert, update, delete on public.store_attendants to authenticated;
