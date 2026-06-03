alter table public.store_members
  add column if not exists commission_percent numeric(5,2) not null default 1
  check (commission_percent >= 0 and commission_percent <= 100);
