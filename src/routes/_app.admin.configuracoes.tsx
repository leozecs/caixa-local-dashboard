import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { PlansCard } from "@/components/admin/plans-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSubscriptionPlans } from "@/lib/data";

export const Route = createFileRoute("/_app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Config admin - Caixa Local" }] }),
  component: AdminConfigPage,
});

const SALES_SUMMARY = [
  {
    name: "Economico",
    price: "R$ 59,99/mes",
    pitch:
      "Entrada acessivel para a loja organizar receitas, despesas, metas e relatorios basicos sem depender de planilha.",
  },
  {
    name: "Essencial",
    price: "R$ 99,99/mes",
    pitch:
      "Plano principal: adiciona alertas e historico comparativo para o comerciante agir antes de perder margem.",
  },
  {
    name: "Gestao Local",
    price: "R$ 149,99/mes",
    pitch:
      "Plano consultivo: entrega leitura interpretada, pontos de atencao, sugestao mensal e Meu Consultor IA.",
  },
];

function AdminConfigPage() {
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => listSubscriptionPlans(),
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Config admin"
        description="Planos, precos e argumentos comerciais usados no cadastro de lojas."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SALES_SUMMARY.map((plan) => (
          <Card key={plan.name} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-lg font-semibold">{plan.price}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{plan.pitch}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlansCard plans={plans} />
    </div>
  );
}
