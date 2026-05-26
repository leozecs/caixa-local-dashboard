import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleDollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/metric-card";
import { formatBRL, listAdminAlerts, listStoreMonthlyResults } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Admin - Caixa Local" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-store-monthly-results"],
    queryFn: () => listStoreMonthlyResults(),
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: listAdminAlerts,
  });
  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      expenses: acc.expenses + row.expenses,
      profit: acc.profit + row.profit,
    }),
    { revenue: 0, expenses: 0, profit: 0 },
  );
  const activeStores = rows.filter((row) => row.status === "ativa").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Visao geral"
        description="Resumo operacional para decidir quais lojas e cobrancas atacar primeiro."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Entrada mensal" value={formatBRL(totals.revenue)} icon={ArrowUpRight} />
        <MetricCard
          label="Saida mensal"
          value={formatBRL(totals.expenses)}
          icon={ArrowDownRight}
          accent="expense"
        />
        <MetricCard
          label="Lucro da base"
          value={formatBRL(totals.profit)}
          icon={CircleDollarSign}
          accent={totals.profit >= 0 ? "success" : "expense"}
        />
        <MetricCard
          label="Lojas ativas"
          value={`${activeStores}/${rows.length}`}
          icon={AlertTriangle}
        />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">Prioridades de hoje</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded-md border border-border px-3 py-2">
                <div className="text-sm font-medium">{alert.store}</div>
                <div className="mt-1 text-xs text-muted-foreground">{alert.message}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Loja</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th className="text-right">Entrada mensal</th>
                  <th className="text-right">Saida mensal</th>
                  <th className="text-right">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.storeId}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{row.storeName}</div>
                      <div className="text-xs text-muted-foreground">{row.owner}</div>
                    </td>
                    <td className="px-4 py-2.5">{row.plan}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-success">
                      {formatBRL(row.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-expense">
                      {formatBRL(row.expenses)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums font-semibold",
                        row.profit >= 0 ? "text-success" : "text-expense",
                      )}
                    >
                      {formatBRL(row.profit)}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {isLoading ? "Carregando lojas..." : "Nenhuma loja cadastrada."}
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

function StatusBadge({ status }: { status: "ativa" | "pendente" | "trial" | "cancelada" }) {
  const map = {
    ativa: { label: "Ativa", cls: "border-success/40 text-success bg-success/5" },
    pendente: { label: "Pendente", cls: "border-warning/40 text-warning bg-warning/5" },
    trial: { label: "Trial", cls: "border-info/40 text-info bg-info/5" },
    cancelada: {
      label: "Cancelada",
      cls: "border-destructive/40 text-destructive bg-destructive/5",
    },
  }[status];
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.cls)}>
      {map.label}
    </Badge>
  );
}
