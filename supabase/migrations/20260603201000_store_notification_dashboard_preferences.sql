alter table public.stores
  add column if not exists revenue_goal_alert_enabled boolean not null default true,
  add column if not exists expense_goal_alert_enabled boolean not null default true,
  add column if not exists employee_commissions_enabled boolean not null default true;
