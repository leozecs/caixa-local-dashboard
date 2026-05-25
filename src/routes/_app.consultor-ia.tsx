import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Brain, Lightbulb, RefreshCcw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  formatBRL,
  getCurrentStore,
  getGoals,
  listAiInsights,
  listEntries,
  saveAiInsight,
  type Entry,
} from "@/lib/data";

export const Route = createFileRoute("/_app/consultor-ia")({
  head: () => ({ meta: [{ title: "Meu Consultor IA - Caixa Local" }] }),
  component: ConsultorIaPage,
});

type InsightResponse = {
  summary: string;
  opportunity: string;
  risk: string;
  actions: string[];
};

function ConsultorIaPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const today = new Date();
  const monthStart = startOfMonth(today);
  const previousMonth = startOfMonth(subMonths(today, 1));

  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", store?.id, monthStart.toISOString()],
    queryFn: () => getGoals(store!.id, monthStart),
    enabled: Boolean(store?.id),
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["entries-ai", store?.id, monthStart.toISOString()],
    queryFn: () =>
      listEntries(
        store!.id,
        previousMonth.toISOString().slice(0, 10),
        new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10),
      ),
    enabled: Boolean(store?.id),
  });

  const { data: insights = [], isLoading: loadingInsights } = useQuery({
    queryKey: ["ai-insights", store?.id],
    queryFn: () => listAiInsights(store!.id),
    enabled: Boolean(store?.id),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!store || !goals) throw new Error("Dados da loja ainda nao carregados.");
      const token = await getAccessToken();
      const metrics = buildMetrics({ store, goals, entries, monthStart, previousMonth });
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ metrics }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel gerar o insight.");
      }

      const insight = payload as InsightResponse;
      return saveAiInsight({
        storeId: store.id,
        summary: insight.summary,
        opportunity: insight.opportunity,
        risk: insight.risk,
        actions: insight.actions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-insights", store?.id] });
      toast.success("Insight gerado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao gerar insight."),
  });

  if (loadingStore || loadingEntries || loadingInsights) {
    return <div className="text-sm text-muted-foreground">Carregando consultor IA...</div>;
  }

  if (!store) {
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;
  }

  const latest = insights[0];
  const metrics = goals ? buildMetrics({ store, goals, entries, monthStart, previousMonth }) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meu Consultor IA"
        description="Analise automatica dos numeros da loja com foco em venda, margem e risco."
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !goals}
          >
            <RefreshCcw className={mutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {mutation.isPending ? "Analisando..." : "Analisar minha loja"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="xl:col-span-2 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Insight mais recente</CardTitle>
          </CardHeader>
          <CardContent>
            {latest ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {format(parseISO(latest.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </Badge>
                </div>
                <InsightBlock icon={Brain} title="Diagnostico" text={latest.summary} />
                <InsightBlock
                  icon={TrendingUp}
                  title="Maior oportunidade"
                  text={latest.opportunity}
                />
                <InsightBlock icon={AlertTriangle} title="Maior risco" text={latest.risk} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Acoes recomendadas para 7 dias
                  </div>
                  <ul className="space-y-2">
                    {latest.actions.map((action, index) => (
                      <li
                        key={`${action}-${index}`}
                        className="rounded-md border border-border px-3 py-2 text-sm"
                      >
                        {index + 1}. {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
                <div className="text-sm font-medium">Nenhum insight gerado ainda.</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Clique em analisar para gerar o primeiro diagnostico com base nos lancamentos.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Base da analise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {metrics ? (
              <>
                <MetricRow label="Faturamento do mes" value={formatBRL(metrics.current.revenue)} />
                <MetricRow label="Despesas do mes" value={formatBRL(metrics.current.expenses)} />
                <MetricRow label="Lucro estimado" value={formatBRL(metrics.current.profit)} />
                <MetricRow label="Margem" value={`${metrics.current.margin.toFixed(1)}%`} />
                <MetricRow label="Ticket medio" value={formatBRL(metrics.current.averageTicket)} />
                <MetricRow label="Meta mensal" value={formatBRL(metrics.goals.revenue)} />
                <MetricRow
                  label="Lancamentos analisados"
                  value={String(metrics.current.entryCount + metrics.previous.entryCount)}
                />
              </>
            ) : (
              <div className="text-muted-foreground">Metas ainda nao carregadas.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Historico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.slice(1).map((insight) => (
            <div key={insight.id} className="rounded-md border border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {format(parseISO(insight.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
              <div className="mt-1 text-sm">{insight.summary}</div>
            </div>
          ))}
          {insights.length <= 1 && (
            <div className="text-sm text-muted-foreground">Sem historico anterior.</div>
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

function buildMetrics({
  store,
  goals,
  entries,
  monthStart,
  previousMonth,
}: {
  store: { name: string; segment: string; city: string };
  goals: { revenue: number; margin: number; maxExpenses: number };
  entries: Entry[];
  monthStart: Date;
  previousMonth: Date;
}) {
  const currentEntries = entries.filter((entry) => sameMonth(entry.date, monthStart));
  const previousEntries = entries.filter((entry) => sameMonth(entry.date, previousMonth));
  const current = summarizeEntries(currentEntries);
  const previous = summarizeEntries(previousEntries);

  return {
    store: {
      name: store.name,
      segment: store.segment,
      city: store.city,
    },
    period: format(monthStart, "yyyy-MM"),
    goals,
    current,
    previous,
    topExpenseCategories: groupByCategory(currentEntries, "despesa").slice(0, 5),
    topRevenueCategories: groupByCategory(currentEntries, "receita").slice(0, 5),
  };
}

function sameMonth(date: string, month: Date) {
  const parsed = parseISO(date);
  return parsed.getFullYear() === month.getFullYear() && parsed.getMonth() === month.getMonth();
}

function summarizeEntries(entries: Entry[]) {
  const revenueEntries = entries.filter((entry) => entry.type === "receita");
  const expenseEntries = entries.filter((entry) => entry.type === "despesa");
  const revenue = revenueEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const profit = revenue - expenses;

  return {
    revenue,
    expenses,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    averageTicket: revenueEntries.length ? revenue / revenueEntries.length : 0,
    entryCount: entries.length,
    revenueEntryCount: revenueEntries.length,
    expenseEntryCount: expenseEntries.length,
  };
}

function groupByCategory(entries: Entry[], type: "receita" | "despesa") {
  const totals = new Map<string, number>();
  entries
    .filter((entry) => entry.type === type)
    .forEach((entry) =>
      totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount),
    );

  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
