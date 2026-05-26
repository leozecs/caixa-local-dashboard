import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, RefreshCcw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatBRL,
  getMonthlyOwnerNote,
  listAdminAiInsights,
  listStores,
  listStoreMonthlyResults,
  saveMonthlyOwnerNote,
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
  const today = new Date();
  const monthStart = startOfMonth(today);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [note, setNote] = useState("");

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

  const { data: ownerNote } = useQuery({
    queryKey: ["monthly-owner-note-admin", selectedStoreId, monthStart.toISOString()],
    queryFn: () => getMonthlyOwnerNote(selectedStoreId, monthStart),
    enabled: Boolean(selectedStoreId),
  });

  useEffect(() => {
    if (!selectedStoreId && stores[0]?.id) setSelectedStoreId(stores[0].id);
  }, [selectedStoreId, stores]);

  useEffect(() => {
    setNote(ownerNote?.note ?? "");
  }, [ownerNote?.note]);

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

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStoreId) throw new Error("Selecione uma loja.");
      if (!note.trim()) throw new Error("Escreva sua sugestao mensal.");
      return saveMonthlyOwnerNote({ storeId: selectedStoreId, month: monthStart, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["monthly-owner-note-admin", selectedStoreId, monthStart.toISOString()],
      });
      toast.success("Sugestao mensal salva.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar sugestao."),
  });

  const insight = adminInsights[0];
  const nextAllowedAt = insight
    ? new Date(parseISO(insight.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const weeklyLocked = Boolean(nextAllowedAt && Date.now() < nextAllowedAt.getTime());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meu Consultor IA"
        description="Chat semanal da carteira e campo para inserir sua sugestao mensal por loja."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric label="Entrada mensal" value={formatBRL(rows.reduce((s, r) => s + r.revenue, 0))} />
        <Metric label="Saida mensal" value={formatBRL(rows.reduce((s, r) => s + r.expenses, 0))} />
        <Metric label="Lucro mensal" value={formatBRL(rows.reduce((s, r) => s + r.profit, 0))} />
      </div>

      <Card className="shadow-none overflow-hidden">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">Conversa admin</CardTitle>
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
            text="Gere um insight grande por semana para enxergar quais lojas merecem atencao primeiro."
          />
          {insight ? (
            <ChatBubble
              icon={Bot}
              title="Insight semanal da carteira"
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
              title="Insight semanal da carteira"
              text="Nenhum insight ainda."
            />
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

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Sugestao mensal do Leo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-3">
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a loja" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Escreva a orientacao que o lojista vai ver no dia 1 deste mes."
              className="min-h-24"
            />
            <Button
              className="gap-2 self-start"
              onClick={() => noteMutation.mutate()}
              disabled={noteMutation.isPending || !selectedStoreId}
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Esta mensagem aparece no Meu Consultor IA do lojista no mes selecionado.
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
