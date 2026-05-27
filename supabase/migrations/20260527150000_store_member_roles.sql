alter table public.store_members
add column if not exists role text not null default 'atendente'
check (role in ('owner', 'atendente'));

update public.store_members
set role = 'owner'
where role = 'atendente';

create index if not exists store_members_store_role_idx
  on public.store_members (store_id, role);

create or replace function app_private.store_member_role(target_store_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select member.role
  from public.store_members member
  where member.store_id = target_store_id
    and member.user_id = auth.uid()
  limit 1
$$;

create or replace function app_private.can_manage_store(target_store_id uuid)
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
        and member.role = 'owner'
    )
$$;

drop policy if exists "profiles_select_own_or_owner" on public.profiles;
create policy "profiles_select_own_or_owner"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or app_private.is_owner()
  or exists (
    select 1
    from public.store_members current_member
    join public.store_members target_member on target_member.store_id = current_member.store_id
    where current_member.user_id = auth.uid()
      and current_member.role = 'owner'
      and target_member.user_id = profiles.id
  )
);

drop policy if exists "profiles_owner_update" on public.profiles;
drop policy if exists "profiles_update_own_appearance" on public.profiles;
create policy "profiles_update_own_appearance"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = app_private.current_user_role());

drop policy if exists "stores_owner_update" on public.stores;
create policy "stores_owner_update"
on public.stores for update
to authenticated
using (app_private.can_manage_store(id))
with check (app_private.can_manage_store(id));

drop policy if exists "store_members_select" on public.store_members;
create policy "store_members_select"
on public.store_members for select
to authenticated
using (app_private.can_manage_store(store_id) or user_id = auth.uid());

drop policy if exists "store_members_owner_manage" on public.store_members;
drop policy if exists "store_members_owner_insert" on public.store_members;
drop policy if exists "store_members_owner_update" on public.store_members;
drop policy if exists "store_members_owner_delete" on public.store_members;
create policy "store_members_owner_insert"
on public.store_members for insert
to authenticated
with check (app_private.can_manage_store(store_id) and app_private.can_add_store_member(store_id));

create policy "store_members_owner_update"
on public.store_members for update
to authenticated
using (app_private.can_manage_store(store_id))
with check (app_private.can_manage_store(store_id));

create policy "store_members_owner_delete"
on public.store_members for delete
to authenticated
using (app_private.can_manage_store(store_id));

drop policy if exists "financial_entries_update_by_store" on public.financial_entries;
create policy "financial_entries_update_by_store"
on public.financial_entries for update
to authenticated
using (app_private.can_manage_store(store_id))
with check (app_private.can_manage_store(store_id));

drop policy if exists "financial_entries_delete_by_store" on public.financial_entries;
create policy "financial_entries_delete_by_store"
on public.financial_entries for delete
to authenticated
using (app_private.can_manage_store(store_id));

drop policy if exists "store_goals_insert_by_store" on public.store_goals;
create policy "store_goals_insert_by_store"
on public.store_goals for insert
to authenticated
with check (app_private.can_manage_store(store_id));

drop policy if exists "store_goals_update_by_store" on public.store_goals;
create policy "store_goals_update_by_store"
on public.store_goals for update
to authenticated
using (app_private.can_manage_store(store_id))
with check (app_private.can_manage_store(store_id));

grant execute on function app_private.store_member_role(uuid) to authenticated;
grant execute on function app_private.can_manage_store(uuid) to authenticated;
