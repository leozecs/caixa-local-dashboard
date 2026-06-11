import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  getCurrentStore,
  getGoals,
  getPlanCapabilities,
  listAiInsights,
  listEntries,
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

const GESTAO_LOCAL_IMPROVEMENTS = [
  "Comparar o dia atual com a media diaria necessaria para bater a meta.",
  "Avisar quando uma categoria de despesa cresce acima do padrao do mes.",
  "Separar margem de produto da margem operacional da loja.",
  "Sugerir revisao de preco quando custo do produto reduz a margem.",
  "Mostrar oportunidades por forma de pagamento, incluindo taxa e prazo.",
  "Detectar dias fracos da semana e sugerir acao comercial simples.",
  "Apontar categorias sem lancamento recente para evitar caixa incompleto.",
  "Alertar sobre recorrencias que vencem antes do fechamento mensal.",
  "Transformar importacoes em uma checklist de conciliacao antes de salvar.",
  "Gerar resumo semanal curto para owner e atendentes autorizados.",
  "Separar leitura para perfil pessoal, sem comissao, ticket medio ou equipe.",
  "Criar plano de acao mensal com tres prioridades e prazo claro.",
] as const;

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
        body: JSON.stringify({ storeId: store.id, metrics }),
      });

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel gerar o insight.");
      }

      return payload as InsightResponse;
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

  const capabilities = getPlanCapabilities(store.plan);
  if (!capabilities.aiConsultant) {
    return (
      <div className="space-y-5">
        <PageHeader title="Meu Consultor IA" description="Disponivel no plano Gestao Local." />
        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="text-sm font-medium">Seu plano atual nao inclui o Consultor IA.</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Esse recurso faz parte do Gestao Local, junto com relatorio interpretado, sugestao
              mensal personalizada e pontos de atencao.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = insights[0];
  const nextAllowedAt = latest
    ? new Date(parseISO(latest.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const weeklyLocked = Boolean(nextAllowedAt && Date.now() < nextAllowedAt.getTime());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meu Consultor IA"
        description="Analise dos numeros da loja com proximos passos praticos."
      />

      <Card className="shadow-none overflow-hidden">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">Conversa</CardTitle>
            <div className="flex flex-wrap gap-2">
              {latest && (
                <Badge variant="outline">
                  IA: {format(parseISO(latest.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                </Badge>
              )}
              {weeklyLocked && nextAllowedAt && (
                <Badge variant="secondary">
                  Proxima analise em {format(nextAllowedAt, "dd/MM", { locale: ptBR })}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 bg-muted/20 p-4">
          <ChatBubble
            align="left"
            icon={Bot}
            title="Caixa Local"
            text="Clique em gerar analise para receber uma leitura objetiva sobre vendas, despesas, margem e proximos passos."
          />

          {latest ? (
            <ChatBubble
              align="left"
              icon={Bot}
              title="Analise da IA"
              text={[
                latest.summary,
                `Maior oportunidade: ${latest.opportunity}`,
                `Maior risco: ${latest.risk}`,
                `Acoes: ${latest.actions.map((action, index) => `${index + 1}. ${action}`).join(" ")}`,
              ].join("\n\n")}
              meta={format(parseISO(latest.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            />
          ) : (
            <ChatBubble
              align="left"
              icon={Bot}
              title="Analise da IA"
              text="Ainda nao existe analise gerada para esta loja."
            />
          )}

          <div className="flex justify-end">
            <div className="flex max-w-xl items-center gap-2 rounded-md border border-border bg-background p-2">
              <div className="px-2 text-sm text-muted-foreground">
                {weeklyLocked && nextAllowedAt
                  ? `Nova analise disponivel em ${format(nextAllowedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}.`
                  : "Gerar analise da minha loja"}
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !goals || weeklyLocked}
              >
                {mutation.isPending ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Melhorias recomendadas para o Gestao Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {GESTAO_LOCAL_IMPROVEMENTS.map((item, index) => (
              <div key={item} className="rounded-md border border-border px-3 py-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-sm leading-snug">{item}</div>
              </div>
            ))}
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

function buildMetrics({
  store,
  goals,
  entries,
  monthStart,
  previousMonth,
}: {
  store: {
    name: string;
    segment: string;
    city: string;
    profileType?: "vendas" | "pessoal";
    personalFocus?: string | null;
  };
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
      profileType: store.profileType || "vendas",
      personalFocus: store.personalFocus || null,
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
  const productCost = revenueEntries.reduce(
    (sum, entry) => sum + (entry.productCostAmount || 0),
    0,
  );
  const productRevenue = revenueEntries
    .filter((entry) => entry.productCostAmount)
    .reduce((sum, entry) => sum + (entry.saleTotalAmount ?? entry.amount), 0);

  return {
    revenue,
    expenses,
    profit,
    margin:
      productCost > 0
        ? ((productRevenue - productCost) / productCost) * 100
        : revenue > 0
          ? (profit / revenue) * 100
          : 0,
    productCost,
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

function ChatBubble({
  icon: Icon,
  title,
  text,
  meta,
  align,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  meta?: string;
  align: "left" | "right";
}) {
  const isRight = align === "right";
  return (
    <div className={isRight ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isRight
            ? "max-w-3xl rounded-md bg-primary px-4 py-3 text-primary-foreground"
            : "max-w-3xl rounded-md border border-border bg-background px-4 py-3"
        }
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
          {meta && <span className="text-xs font-normal opacity-70">{meta}</span>}
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed opacity-90">{text}</p>
      </div>
    </div>
  );
}
