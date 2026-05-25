import { createFileRoute } from "@tanstack/react-router";
import { format, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/alertas")({
  head: () => ({ meta: [{ title: "Alertas — Admin" }] }),
  component: Alertas,
});

const ALERTS = [
  { id: 1, severity: "critico", store: "Mercado São João", message: "12 dias sem login — risco de cancelamento.", date: subHours(new Date(), 2) },
  { id: 2, severity: "atencao", store: "Atelier Luiza Moda", message: "Faturamento 38% abaixo do mês anterior.", date: subHours(new Date(), 5) },
  { id: 3, severity: "atencao", store: "Padaria Vinhas", message: "Despesas próximas do limite definido (92%).", date: subHours(new Date(), 9) },
  { id: 4, severity: "info", store: "Café da Praça", message: "Atingiu 100% da meta de faturamento.", date: subHours(new Date(), 14) },
  { id: 5, severity: "atencao", store: "Barbearia do Tonho", message: "Margem caiu para 11% (meta 18%).", date: subHours(new Date(), 22) },
  { id: 6, severity: "critico", store: "Hortifruti Bom Preço", message: "Cobrança recusada na maquininha.", date: subHours(new Date(), 30) },
] as const;

function Alertas() {
  return (
    <div className="space-y-5">
      <PageHeader title="Alertas operacionais" description="Eventos da base que merecem atenção da equipe Caixa Local." />

      <Card className="shadow-none">
        <CardContent className="p-0 divide-y divide-border">
          {ALERTS.map((a) => {
            const map = {
              critico: { Icon: AlertCircle, cls: "text-destructive", badge: "bg-destructive/10 text-destructive border-destructive/30", label: "Crítico" },
              atencao: { Icon: AlertTriangle, cls: "text-warning", badge: "bg-warning/10 text-warning border-warning/30", label: "Atenção" },
              info: { Icon: Info, cls: "text-info", badge: "bg-info/10 text-info border-info/30", label: "Info" },
            }[a.severity];
            const Icon = map.Icon;
            return (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
                <div className={cn("h-8 w-8 grid place-items-center rounded-md bg-muted shrink-0", map.cls)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{a.store}</span>
                    <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.badge)}>
                      {map.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{a.message}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {format(a.date, "dd/MM HH:mm", { locale: ptBR })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
