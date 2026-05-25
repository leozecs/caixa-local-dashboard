import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO, subDays } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { ADMIN_STORES, formatBRL } from "@/lib/mock-data";
import { CreditCard, DollarSign, RefreshCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/assinaturas")({
  head: () => ({ meta: [{ title: "Assinaturas — Admin" }] }),
  component: Assinaturas,
});

const SUBS = ADMIN_STORES.map((s, i) => ({
  ...s,
  amount: s.plan === "Pro" ? 79 : s.plan === "Trial" ? 0 : 39,
  nextCharge: subDays(new Date(), -1 * (i + 3)).toISOString(),
  payStatus: s.status === "pendente" ? "em_atraso" : s.status === "trial" ? "trial" : "em_dia",
}));

function Assinaturas() {
  const mrr = SUBS.filter((s) => s.payStatus === "em_dia").reduce((a, b) => a + b.amount, 0);
  const atrasadas = SUBS.filter((s) => s.payStatus === "em_atraso").length;
  const churn = 1;

  return (
    <div className="space-y-5">
      <PageHeader title="Assinaturas" description="Cobranças, status e MRR da base." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="MRR" value={formatBRL(mrr)} icon={DollarSign} accent="success" />
        <MetricCard label="Assinaturas ativas" value={String(SUBS.filter(s => s.payStatus === "em_dia").length)} icon={CreditCard} />
        <MetricCard label="Em atraso" value={String(atrasadas)} icon={RefreshCcw} accent="warning" />
        <MetricCard label="Cancelamentos (30d)" value={String(churn)} icon={XCircle} accent="expense" />
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
                  <th>Próxima cobrança</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {SUBS.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5">{s.plan}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.amount > 0 ? formatBRL(s.amount) : "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{format(parseISO(s.nextCharge), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-2.5"><PayBadge status={s.payStatus as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PayBadge({ status }: { status: "em_dia" | "em_atraso" | "trial" }) {
  const map = {
    em_dia: { label: "Em dia", cls: "border-success/40 text-success bg-success/5" },
    em_atraso: { label: "Em atraso", cls: "border-destructive/40 text-destructive bg-destructive/5" },
    trial: { label: "Trial", cls: "border-info/40 text-info bg-info/5" },
  }[status];
  return <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.cls)}>{map.label}</Badge>;
}
