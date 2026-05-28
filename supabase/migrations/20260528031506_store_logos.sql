alter table public.stores
  add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', false)
on conflict (id) do nothing;

drop policy if exists "store_logos_storage_select" on storage.objects;
drop policy if exists "store_logos_storage_insert" on storage.objects;
drop policy if exists "store_logos_storage_update" on storage.objects;
drop policy if exists "store_logos_storage_delete" on storage.objects;

create policy "store_logos_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'store-logos'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

create policy "store_logos_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'store-logos'
  and app_private.can_manage_store((storage.foldername(name))[1]::uuid)
);

create policy "store_logos_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'store-logos'
  and app_private.can_manage_store((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'store-logos'
  and app_private.can_manage_store((storage.foldername(name))[1]::uuid)
);

create policy "store_logos_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'store-logos'
  and app_private.can_manage_store((storage.foldername(name))[1]::uuid)
);
