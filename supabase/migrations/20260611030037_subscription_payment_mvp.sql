alter type public.store_status add value if not exists 'bloqueada';
alter type public.subscription_status add value if not exists 'ativa';
alter type public.subscription_status add value if not exists 'aguardando_pagamento';
alter type public.subscription_status add value if not exists 'bloqueada';
alter type public.billing_status add value if not exists 'em_analise';
alter type public.billing_status add value if not exists 'recusado';

alter table public.subscriptions
  add column if not exists payment_link text,
  add column if not exists pix_copy_paste text,
  add column if not exists pix_qr_code_url text,
  add column if not exists gateway_provider text,
  add column if not exists gateway_subscription_id text,
  add column if not exists gateway_customer_id text;

create table if not exists public.subscription_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  billing_record_id uuid references public.billing_records(id) on delete set null,
  amount integer not null check (amount >= 0),
  due_date date not null,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size integer not null default 0 check (file_size >= 0),
  status public.billing_status not null default 'pendente',
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_payment_proofs_store_due_idx
  on public.subscription_payment_proofs (store_id, due_date desc, created_at desc);

create index if not exists subscription_payment_proofs_status_idx
  on public.subscription_payment_proofs (status, created_at desc);

create trigger touch_subscription_payment_proofs_updated_at
before update on public.subscription_payment_proofs
for each row execute function app_private.touch_updated_at();

alter table public.subscription_payment_proofs enable row level security;

drop policy if exists "subscription_payment_proofs_select" on public.subscription_payment_proofs;
create policy "subscription_payment_proofs_select"
on public.subscription_payment_proofs for select
to authenticated
using (app_private.can_access_store(store_id));

drop policy if exists "subscription_payment_proofs_store_insert" on public.subscription_payment_proofs;
create policy "subscription_payment_proofs_store_insert"
on public.subscription_payment_proofs for insert
to authenticated
with check (app_private.can_access_store(store_id));

drop policy if exists "subscription_payment_proofs_owner_update" on public.subscription_payment_proofs;
create policy "subscription_payment_proofs_owner_update"
on public.subscription_payment_proofs for update
to authenticated
using (app_private.is_owner())
with check (app_private.is_owner());

drop policy if exists "subscription_payment_proofs_owner_delete" on public.subscription_payment_proofs;
create policy "subscription_payment_proofs_owner_delete"
on public.subscription_payment_proofs for delete
to authenticated
using (app_private.is_owner());

grant select, insert, update, delete on public.subscription_payment_proofs to authenticated;

insert into storage.buckets (id, name, public)
values ('subscription-proofs', 'subscription-proofs', false)
on conflict (id) do nothing;

drop policy if exists "subscription_proofs_storage_select" on storage.objects;
create policy "subscription_proofs_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'subscription-proofs'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

drop policy if exists "subscription_proofs_storage_insert" on storage.objects;
create policy "subscription_proofs_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'subscription-proofs'
  and app_private.can_access_store((storage.foldername(name))[1]::uuid)
);

drop policy if exists "subscription_proofs_storage_update" on storage.objects;
create policy "subscription_proofs_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'subscription-proofs'
  and app_private.is_owner()
)
with check (
  bucket_id = 'subscription-proofs'
  and app_private.is_owner()
);

drop policy if exists "subscription_proofs_storage_delete" on storage.objects;
create policy "subscription_proofs_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'subscription-proofs'
  and app_private.is_owner()
);
