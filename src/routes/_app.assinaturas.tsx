import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth";
import { getCurrentStore, getStoreSubscription, type SubscriptionStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/assinaturas")({
  head: () => ({ meta: [{ title: "Assinatura - Caixa Local" }] }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const { session } = useSession();
  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });
  const { data: subscription } = useQuery({
    queryKey: ["store-subscription", store?.id],
    queryFn: () => getStoreSubscription(store!.id),
    enabled: Boolean(store?.id),
  });

  if (!store) {
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;
  }

  const status = normalizeSubscriptionStatus(subscription?.payStatus, store.status);
  const planName = subscription?.plan || store.plan;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assinatura"
        description="Acompanhe seu plano. Pagamentos online estao temporariamente desativados para lojistas."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Plano atual</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">{store.name}</div>
            </div>
            <StatusBadge status={status} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoTile label="Plano" value={planName} />
              <InfoTile label="Situacao" value={subscriptionStatusLabel(status)} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Gestao pelo administrador
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Pix, link de pagamento, envio de comprovantes e historico financeiro estao desativados
            para lojistas. Alteracoes de plano e liberacao de acesso devem ser feitas pela area
            administrativa.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const map = {
    ativa: "border-success/40 bg-success/10 text-success",
    em_dia: "border-success/40 bg-success/10 text-success",
    aguardando_pagamento: "border-warning/40 bg-warning/10 text-warning",
    em_atraso: "border-warning/40 bg-warning/10 text-warning",
    bloqueada: "border-destructive/40 bg-destructive/10 text-destructive",
    trial: "border-info/40 bg-info/10 text-info",
    cancelada: "border-muted-foreground/40 bg-muted text-muted-foreground",
  }[status];

  return (
    <Badge variant="outline" className={cn("h-6 px-2", map)}>
      {subscriptionStatusLabel(status)}
    </Badge>
  );
}

function subscriptionStatusLabel(status: SubscriptionStatus) {
  return {
    ativa: "Ativa",
    em_dia: "Ativa",
    aguardando_pagamento: "Pendente",
    em_atraso: "Pendente",
    bloqueada: "Bloqueada",
    trial: "Trial",
    cancelada: "Cancelada",
  }[status];
}

function normalizeSubscriptionStatus(
  status: SubscriptionStatus | undefined,
  storeStatus: string,
): SubscriptionStatus {
  if (status) return status === "em_dia" ? "ativa" : status;
  if (storeStatus === "bloqueada") return "bloqueada";
  if (storeStatus === "pendente") return "aguardando_pagamento";
  if (storeStatus === "cancelada") return "cancelada";
  return "ativa";
}
