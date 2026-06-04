drop policy if exists "financial_entries_update_by_store" on public.financial_entries;
create policy "financial_entries_update_by_store"
on public.financial_entries for update
to authenticated
using (app_private.can_access_store(store_id))
with check (app_private.can_access_store(store_id));

drop policy if exists "financial_entries_delete_by_store" on public.financial_entries;
create policy "financial_entries_delete_by_store"
on public.financial_entries for delete
to authenticated
using (app_private.can_access_store(store_id));
