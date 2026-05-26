import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, Bell, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth";
import { getCurrentStore, listStoreOperationalAlerts, planHasAlerts } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({ meta: [{ title: "Alertas - Caixa Local" }] }),
  component: AlertasPage,
});

function AlertasPage() {
  const { session } = useSession();
  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["store-operational-alerts", store?.id],
    queryFn: () => listStoreOperationalAlerts(store!.id),
    enabled: Boolean(store?.id && planHasAlerts(store.plan)),
  });

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;

  if (!planHasAlerts(store.plan)) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Alertas"
          description="Alertas operacionais ficam disponiveis nos planos Essencial e Gestao Local."
        />
        <Card className="shadow-none">
          <CardContent className="p-6 flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-muted grid place-items-center">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">Seu plano atual nao inclui alertas.</div>
              <div className="text-sm text-muted-foreground mt-1">
                Para acompanhar margem baixa, faturamento abaixo da meta e despesas perto do limite,
                sua loja precisa estar no Essencial ou Gestao Local.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertas"
        description="Margem, faturamento e limite de despesas monitorados a partir das metas configuradas."
      />
      <Card className="shadow-none">
        <CardContent className="p-0 divide-y divide-border">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando alertas...</div>
          ) : alerts.length === 0 ? (
            <div className="p-6 flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-muted grid place-items-center text-info">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Nenhum alerta ativo.</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Configure metas e mantenha os lancamentos atualizados para receber avisos uteis.
                </div>
              </div>
            </div>
          ) : (
            alerts.map((alert) => {
              const critical = alert.severity === "critico";
              const Icon = critical ? AlertCircle : AlertTriangle;
              return (
                <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
                  <div
                    className={cn(
                      "h-8 w-8 grid place-items-center rounded-md bg-muted shrink-0",
                      critical ? "text-destructive" : "text-warning",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{alert.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 font-normal text-[11px]",
                          critical
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-warning/10 text-warning border-warning/30",
                        )}
                      >
                        {critical ? "Critico" : "Atencao"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{alert.message}</div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
