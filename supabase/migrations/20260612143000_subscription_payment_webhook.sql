alter table public.billing_records
  add column if not exists gateway_provider text,
  add column if not exists gateway_payment_id text;

create unique index if not exists billing_records_gateway_payment_uidx
  on public.billing_records (gateway_provider, gateway_payment_id)
  where gateway_provider is not null
    and gateway_payment_id is not null;
