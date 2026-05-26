import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CreditCard, DollarSign, MessageCircle, RefreshCcw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  defaultBillingMessageTemplate,
  formatBRL,
  getAppSetting,
  listSubscriptions,
  renderBillingMessage,
  type SubscriptionStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/assinaturas")({
  head: () => ({ meta: [{ title: "Assinaturas — Admin" }] }),
  component: Assinaturas,
});

function Assinaturas() {
  const { data: subs = [] } = useQuery({ queryKey: ["subscriptions"], queryFn: listSubscriptions });
  const { data: billingTemplate = defaultBillingMessageTemplate() } = useQuery({
    queryKey: ["app-setting", "billing_whatsapp_message"],
    queryFn: () => getAppSetting("billing_whatsapp_message", defaultBillingMessageTemplate()),
  });
  const mrr = subs
    .filter((sub) => sub.payStatus === "em_dia")
    .reduce((sum, sub) => sum + sub.amount, 0);
  const atrasadas = subs.filter((sub) => sub.payStatus === "em_atraso").length;
  const canceladas = subs.filter((sub) => sub.payStatus === "cancelada").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assinaturas"
        description="Cobranças por WhatsApp, vencimentos e MRR da base."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="MRR" value={formatBRL(mrr)} icon={DollarSign} accent="success" />
        <MetricCard
          label="Assinaturas ativas"
          value={String(subs.filter((sub) => sub.payStatus === "em_dia").length)}
          icon={CreditCard}
        />
        <MetricCard
          label="Em atraso"
          value={String(atrasadas)}
          icon={RefreshCcw}
          accent="warning"
        />
        <MetricCard label="Canceladas" value={String(canceladas)} icon={XCircle} accent="expense" />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Loja</th>
                  <th>Plano</th>
                  <th className="text-right">Valor</th>
                  <th>Último pagamento</th>
                  <th>Próximo pagamento</th>
                  <th>Status</th>
                  <th className="text-right">Cobrança</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5 font-medium">{sub.storeName}</td>
                    <td className="px-4 py-2.5">{sub.plan}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {sub.amount > 0 ? formatBRL(sub.amount) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {sub.lastPayment ? format(parseISO(sub.lastPayment), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {format(parseISO(sub.nextCharge), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-2.5">
                      <PayBadge status={sub.payStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            renderBillingMessage(billingTemplate, {
                              loja: sub.storeName,
                              plano: sub.plan,
                              valor: formatBRL(sub.amount),
                              vencimento: format(parseISO(sub.nextCharge), "dd/MM/yyyy"),
                            }),
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Cobrar
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!subs.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma assinatura cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PayBadge({ status }: { status: SubscriptionStatus }) {
  const map = {
    em_dia: { label: "Em dia", cls: "border-success/40 text-success bg-success/5" },
    em_atraso: {
      label: "Em atraso",
      cls: "border-destructive/40 text-destructive bg-destructive/5",
    },
    trial: { label: "Trial", cls: "border-info/40 text-info bg-info/5" },
    cancelada: {
      label: "Cancelada",
      cls: "border-muted-foreground/40 text-muted-foreground bg-muted",
    },
  }[status];
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.cls)}>
      {map.label}
    </Badge>
  );
}
