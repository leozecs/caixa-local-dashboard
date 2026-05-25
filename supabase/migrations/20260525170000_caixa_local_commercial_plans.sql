insert into public.subscription_plans (name, amount, description, active, sort_order)
values
  (
    'Economico',
    5999,
    'Para lojas que precisam controlar o caixa sem complexidade. Inclui lancamentos de receita e despesa, dashboard mensal do mes atual, metas de faturamento e despesa, relatorios de lucro total, gastos totais e categorias configuraveis. Limite: 1 usuario por loja.',
    true,
    1
  ),
  (
    'Essencial',
    9999,
    'Melhor custo-beneficio para acompanhar a operacao com alertas. Inclui tudo do Economico, alerta de margem, alerta de despesa, alerta de meta atrasada, historico mensal comparativo, ate 3 usuarios por loja e suporte por WhatsApp em ate 1 dia util.',
    true,
    2
  ),
  (
    'Gestao Local',
    14999,
    'Plano consultivo para o cliente entender onde ganhou, perdeu e pode melhorar. Inclui tudo do Essencial, relatorio interpretado, pontos de atencao em abas filtraveis, sugestao mensal personalizada de economia, acesso ao Meu Consultor IA, ate 5 usuarios por loja e suporte por WhatsApp em ate 2h em dias uteis no horario comercial; fora do horario comercial e fins de semana, resposta em ate 1 dia.',
    true,
    3
  )
on conflict (name) do update set
  amount = excluded.amount,
  description = excluded.description,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.subscription_plans
set active = false, updated_at = now()
where name in ('Trial', 'Basico', 'Pro');
