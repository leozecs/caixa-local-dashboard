alter table public.profiles
  add column if not exists profile_initial text,
  add column if not exists profile_color text not null default '#111827';

alter table public.stores
  add column if not exists daily_closing_whatsapp_enabled boolean not null default false;

create or replace function app_private.store_plan(target_store_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select plan from public.stores where id = target_store_id
$$;

create or replace function app_private.store_status(target_store_id uuid)
returns public.store_status
language sql
security definer
set search_path = public
stable
as $$
  select status from public.stores where id = target_store_id
$$;

drop policy if exists "profiles_self_update_appearance" on public.profiles;
create policy "profiles_self_update_appearance"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = app_private.current_user_role());

drop policy if exists "stores_member_update_own_details" on public.stores;
create policy "stores_member_update_own_details"
on public.stores for update
to authenticated
using (app_private.can_access_store(id))
with check (
  app_private.can_access_store(id)
  and plan = app_private.store_plan(id)
  and status = app_private.store_status(id)
);

grant execute on function app_private.store_plan(uuid) to authenticated;
grant execute on function app_private.store_status(uuid) to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.stores to authenticated;

update public.subscription_plans
set description = case name
  when 'Economico' then 'Para lojas que precisam controlar o caixa sem complexidade. Inclui lancamentos de receita e despesa, dashboard do mes atual, metas mensais, relatorios basicos e exportacao manual. Nao inclui alertas, comparativo mensal, WhatsApp diario ou Consultor IA. Limite: 1 usuario por loja.'
  when 'Essencial' then 'Melhor custo-beneficio para acompanhar a operacao com alertas. Inclui tudo do Economico, alertas, comparativo mensal, fechamento diario por WhatsApp quando ativado, ate 3 usuarios por loja e suporte por WhatsApp em ate 1 dia util.'
  when 'Gestao Local' then 'Plano consultivo para o cliente entender onde ganhou, perdeu e pode melhorar. Inclui tudo do Essencial, relatorio interpretado, Consultor IA, ate 5 usuarios por loja e suporte por WhatsApp em ate 2h em dias uteis no horario comercial; fora do horario comercial e fins de semana, resposta em ate 1 dia.'
  else description
end,
updated_at = now()
where name in ('Economico', 'Essencial', 'Gestao Local');
