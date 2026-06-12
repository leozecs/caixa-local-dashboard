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
import {
  formatBRL,
  listAdminAiInsights,
  listSubscriptionPaymentProofs,
  listSubscriptions,
} from "@/lib/data";
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

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => listSubscriptions(),
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ["subscription-proofs-admin"],
    queryFn: () => listSubscriptionPaymentProofs(),
  });

  const { data: adminInsights = [] } = useQuery({
    queryKey: ["admin-ai-insights", "subscriptions"],
    queryFn: () => listAdminAiInsights("subscriptions"),
  });

  const planCounts = useMemo(
    () =>
      subscriptions.reduce<Record<string, number>>((acc, subscription) => {
        acc[subscription.plan] = (acc[subscription.plan] || 0) + 1;
        return acc;
      }, {}),
    [subscriptions],
  );
  const statusCounts = useMemo(
    () =>
      subscriptions.reduce<Record<string, number>>((acc, subscription) => {
        acc[subscription.payStatus] = (acc[subscription.payStatus] || 0) + 1;
        return acc;
      }, {}),
    [subscriptions],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      const mrr = subscriptions
        .filter(
          (subscription) =>
            subscription.payStatus === "ativa" || subscription.payStatus === "em_dia",
        )
        .reduce((sum, subscription) => sum + subscription.amount, 0);
      const pendingProofs = proofs.filter((proof) => proof.status === "em_analise");
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scope: "admin_subscriptions",
          metrics: {
            scope: "subscription_operations",
            period: new Date().toISOString().slice(0, 7),
            totals: {
              mrr,
              active: subscriptions.filter(
                (subscription) =>
                  subscription.payStatus === "ativa" || subscription.payStatus === "em_dia",
              ).length,
              overdue: subscriptions.filter(
                (subscription) => subscription.payStatus === "em_atraso",
              ).length,
              blocked: subscriptions.filter(
                (subscription) => subscription.payStatus === "bloqueada",
              ).length,
              pendingProofs: pendingProofs.length,
              exempt: subscriptions.filter((subscription) => subscription.amount === 0).length,
            },
            planCounts,
            statusCounts,
            goal: "Analisar a saude das assinaturas, reduzir atraso, priorizar comprovantes e manter MRR previsivel.",
            subscriptions: subscriptions.map((subscription) => ({
              store: subscription.storeName,
              plan: subscription.plan,
              amount: subscription.amount,
              status: subscription.payStatus,
              nextCharge: subscription.nextCharge,
              lastPayment: subscription.lastPayment,
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
      queryClient.invalidateQueries({ queryKey: ["admin-ai-insights", "subscriptions"] });
      toast.success("Insight de assinaturas gerado.");
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
        title="Consultor IA de assinaturas"
        description="Insight semanal sobre MRR, atrasos, bloqueios e comprovantes."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric label="Assinaturas" value={`${subscriptions.length}`} />
        <Metric
          label="MRR ativo"
          value={formatBRL(
            subscriptions
              .filter(
                (subscription) =>
                  subscription.payStatus === "ativa" || subscription.payStatus === "em_dia",
              )
              .reduce((sum, subscription) => sum + subscription.amount, 0),
          )}
        />
        <Metric label="Planos ativos" value={`${Object.keys(planCounts).length}`} />
      </div>

      <Card className="shadow-none overflow-hidden">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">Saúde das assinaturas</CardTitle>
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
            text="Gere um insight semanal para priorizar assinaturas em atraso, comprovantes pendentes, bloqueios e oportunidades de MRR."
          />
          {insight ? (
            <ChatBubble
              icon={Bot}
              title="Insight semanal de assinaturas"
              text={[
                insight.summary,
                `Maior oportunidade: ${insight.opportunity}`,
                `Maior risco: ${insight.risk}`,
                `Acoes: ${insight.actions.map((action, index) => `${index + 1}. ${action}`).join(" ")}`,
              ].join("\n\n")}
              meta={format(parseISO(insight.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            />
          ) : (
            <ChatBubble
              icon={Bot}
              title="Insight semanal de assinaturas"
              text="Nenhum insight ainda."
            />
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !subscriptions.length || weeklyLocked}
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
