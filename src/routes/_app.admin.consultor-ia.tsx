import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Brain, Lightbulb, RefreshCcw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL, listStoreMonthlyResults } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/admin/consultor-ia")({
  head: () => ({ meta: [{ title: "Consultor IA admin - Caixa Local" }] }),
  component: AdminConsultorIa,
});

type InsightResponse = {
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
};

function AdminConsultorIa() {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-store-monthly-results"],
    queryFn: () => listStoreMonthlyResults(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const totals = rows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          expenses: acc.expenses + row.expenses,
          profit: acc.profit + row.profit,
        }),
        { revenue: 0, expenses: 0, profit: 0 },
      );
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          metrics: {
            scope: "admin_portfolio",
            period: new Date().toISOString().slice(0, 7),
            totals,
            stores: rows.map((row) => ({
              name: row.storeName,
              owner: row.owner,
              plan: row.plan,
              status: row.status,
              revenue: row.revenue,
              expenses: row.expenses,
              profit: row.profit,
            })),
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel gerar a analise.");
      }
      return payload as InsightResponse;
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao gerar analise."),
  });

  const insight = mutation.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meu Consultor IA"
        description="Analise da carteira de lojas para priorizar suporte, risco e oportunidades."
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !rows.length}
          >
            <RefreshCcw className={mutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {mutation.isPending ? "Analisando..." : "Analisar carteira"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric label="Entrada mensal" value={formatBRL(rows.reduce((s, r) => s + r.revenue, 0))} />
        <Metric label="Saida mensal" value={formatBRL(rows.reduce((s, r) => s + r.expenses, 0))} />
        <Metric label="Lucro mensal" value={formatBRL(rows.reduce((s, r) => s + r.profit, 0))} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Analise da IA</CardTitle>
        </CardHeader>
        <CardContent>
          {insight ? (
            <div className="space-y-4">
              <InsightBlock icon={Brain} title="Diagnostico da carteira" text={insight.summary} />
              <InsightBlock
                icon={TrendingUp}
                title="Maior oportunidade"
                text={insight.opportunity}
              />
              <InsightBlock icon={AlertTriangle} title="Maior risco" text={insight.risk} />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Acoes recomendadas
                </div>
                {insight.actions.map((action, index) => (
                  <div
                    key={`${action}-${index}`}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    {index + 1}. {action}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Gere uma analise para enxergar quais lojas precisam de acao primeiro.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function getAccessToken() {
  const { data, error } = await supabase!.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessao expirada. Entre novamente.");
  return token;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function InsightBlock({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
