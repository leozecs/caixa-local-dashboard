import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, listAdminAiInsights, listStores, listStoreMonthlyResults } from "@/lib/data";
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
  const queryClient = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-store-monthly-results"],
    queryFn: () => listStoreMonthlyResults(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => listStores(),
  });

  const { data: adminInsights = [] } = useQuery({
    queryKey: ["admin-ai-insights", "portfolio"],
    queryFn: () => listAdminAiInsights("portfolio"),
  });

  const planCounts = useMemo(
    () =>
      stores.reduce<Record<string, number>>((acc, store) => {
        acc[store.plan] = (acc[store.plan] || 0) + 1;
        return acc;
      }, {}),
    [stores],
  );

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
          scope: "admin_portfolio",
          metrics: {
            scope: "commercial_growth",
            period: new Date().toISOString().slice(0, 7),
            totals,
            planCounts,
            goal: "Gerar mais leads, aumentar recorrencia, reduzir cancelamento e vender mais Caixa Local para comercios locais.",
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

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel gerar a analise.");
      }
      return payload as InsightResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-insights", "portfolio"] });
      toast.success("Insight da carteira gerado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao gerar analise."),
  });

  const insight = adminInsights[0];
  const nextAllowedAt = insight
    ? new Date(parseISO(insight.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const weeklyLocked = Boolean(nextAllowedAt && Date.now() < nextAllowedAt.getTime());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Consultor IA de vendas"
        description="Insight semanal para vender mais Caixa Local, gerar leads e aumentar recorrencia."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric label="Lojas na base" value={`${stores.length}`} />
        <Metric
          label="Receita das lojas"
          value={formatBRL(rows.reduce((s, r) => s + r.revenue, 0))}
        />
        <Metric label="Planos ativos" value={`${Object.keys(planCounts).length}`} />
      </div>

      <Card className="shadow-none overflow-hidden">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">Crescimento comercial</CardTitle>
            <div className="flex flex-wrap gap-2">
              {insight && (
                <Badge variant="outline">
                  IA: {format(parseISO(insight.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                </Badge>
              )}
              {weeklyLocked && nextAllowedAt && (
                <Badge variant="secondary">
                  Proximo em {format(nextAllowedAt, "dd/MM", { locale: ptBR })}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 bg-muted/20 p-4">
          <ChatBubble
            icon={Bot}
            title="Caixa Local"
            text="Gere um insight semanal com ideias praticas para atrair lojistas, transformar conversas em assinatura e manter clientes recorrentes."
          />
          {insight ? (
            <ChatBubble
              icon={Bot}
              title="Insight semanal de vendas"
              text={[
                insight.summary,
                `Maior oportunidade: ${insight.opportunity}`,
                `Maior risco: ${insight.risk}`,
                `Acoes: ${insight.actions.map((action, index) => `${index + 1}. ${action}`).join(" ")}`,
              ].join("\n\n")}
              meta={format(parseISO(insight.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            />
          ) : (
            <ChatBubble icon={Bot} title="Insight semanal de vendas" text="Nenhum insight ainda." />
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !rows.length || weeklyLocked}
            >
              {mutation.isPending ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Gerar insight semanal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "Servidor retornou uma resposta invalida. Tente novamente em alguns instantes.",
    );
  }
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

function ChatBubble({
  icon: Icon,
  title,
  text,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  meta?: string;
}) {
  return (
    <div className="max-w-3xl rounded-md border border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        <span>{title}</span>
        {meta && <span className="text-xs font-normal text-muted-foreground">{meta}</span>}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
        {text}
      </p>
    </div>
  );
}
