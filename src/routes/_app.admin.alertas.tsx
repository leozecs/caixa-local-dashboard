import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, AlertTriangle, Info, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  defaultDailyClosingMessageTemplate,
  formatBRL,
  getAppSetting,
  listAdminAlerts,
  listDailyStoreResults,
  renderDailyClosingMessage,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Admin" }] }),
  component: Alertas,
});

function Alertas() {
  const { data: alerts = [] } = useQuery({ queryKey: ["admin-alerts"], queryFn: listAdminAlerts });
  const { data: dailyResults = [] } = useQuery({
    queryKey: ["daily-store-results"],
    queryFn: () => listDailyStoreResults(),
  });
  const { data: dailyTemplate = defaultDailyClosingMessageTemplate() } = useQuery({
    queryKey: ["app-setting", "daily_closing_whatsapp_message"],
    queryFn: () =>
      getAppSetting("daily_closing_whatsapp_message", defaultDailyClosingMessageTemplate()),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertas de assinaturas"
        description="Vencimentos proximos, pagamentos atrasados e riscos de cobranca."
      />

      <Card className="shadow-none">
        <CardContent className="p-0 divide-y divide-border">
          {alerts.map((alert) => {
            const map = {
              critico: {
                Icon: AlertCircle,
                cls: "text-destructive",
                badge: "bg-destructive/10 text-destructive border-destructive/30",
                label: "Crítico",
              },
              atencao: {
                Icon: AlertTriangle,
                cls: "text-warning",
                badge: "bg-warning/10 text-warning border-warning/30",
                label: "Atenção",
              },
              info: {
                Icon: Info,
                cls: "text-info",
                badge: "bg-info/10 text-info border-info/30",
                label: "Info",
              },
            }[alert.severity];
            const Icon = map.Icon;
            return (
              <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
                <div
                  className={cn(
                    "h-8 w-8 grid place-items-center rounded-md bg-muted shrink-0",
                    map.cls,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{alert.store}</span>
                    <Badge
                      variant="outline"
                      className={cn("h-5 px-1.5 font-normal text-[11px]", map.badge)}
                    >
                      {map.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{alert.message}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {format(parseISO(alert.date), "dd/MM HH:mm", { locale: ptBR })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold">Fechamento diario por loja</div>
            <div className="text-xs text-muted-foreground">
              Entradas, saidas e lucro de hoje para envio manual no WhatsApp.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Loja</th>
                  <th className="text-right">Entrada</th>
                  <th className="text-right">Saida</th>
                  <th className="text-right">Lucro</th>
                  <th className="text-right">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {dailyResults.map((row) => {
                  const message = renderDailyClosingMessage(dailyTemplate, {
                    loja: row.storeName,
                    responsavel: row.owner,
                    entrada: formatBRL(row.revenue),
                    saida: formatBRL(row.expenses),
                    lucro: formatBRL(row.profit),
                    data: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
                  });
                  return (
                    <tr key={row.storeId} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{row.storeName}</div>
                        <div className="text-xs text-muted-foreground">{row.owner}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-success tabular-nums">
                        {formatBRL(row.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-destructive tabular-nums">
                        {formatBRL(row.expenses)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                        {formatBRL(row.profit)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="outline" className="gap-2" asChild>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Send className="h-4 w-4" /> Enviar
                          </a>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
