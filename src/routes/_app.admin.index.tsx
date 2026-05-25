import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Building2, Clock, DollarSign, TrendingDown, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, listStores, listSubscriptions } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Admin — Caixa Local" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores"], queryFn: listStores });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: listSubscriptions,
  });

  const ativas = stores.filter((store) => store.status === "ativa").length;
  const trial = stores.filter((store) => store.status === "trial").length;
  const pendentes = stores.filter((store) => store.status === "pendente").length;
  const mrr = subscriptions
    .filter((subscription) => subscription.payStatus === "em_dia")
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const totalRev = stores.reduce((sum, store) => sum + store.monthRevenue, 0);
  const queda = stores.filter((store) => store.risk !== "saudavel").length;
  const watchlist = stores.filter((store) => store.risk !== "saudavel").slice(0, 5);
  const history = [{ month: "Base", faturamento: totalRev }];

  return (
    <div className="space-y-5">
      <PageHeader title="Painel administrativo" description="Saúde da base de lojas Caixa Local." />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard label="Lojas ativas" value={String(ativas)} icon={Building2} accent="success" />
        <MetricCard label="MRR" value={formatBRL(mrr)} icon={DollarSign} accent="info" />
        <MetricCard label="Em trial" value={String(trial)} icon={Clock} />
        <MetricCard
          label="Inadimplentes"
          value={String(pendentes)}
          icon={AlertCircle}
          accent="warning"
        />
        <MetricCard label="GMV reportado" value={formatBRL(totalRev)} icon={Users} />
        <MetricCard
          label="Lojas com queda"
          value={String(queda)}
          icon={TrendingDown}
          accent="expense"
        />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Faturamento agregado da base</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ left: 8, right: 12, top: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.91 0.008 247)"
                vertical={false}
              />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value: unknown) => formatBRL(Number(value))} />
              <Area
                type="monotone"
                dataKey="faturamento"
                name="Faturamento"
                stroke="oklch(0.45 0.1 230)"
                strokeWidth={2}
                fill="oklch(0.45 0.1 230 / 0.14)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Lojas em atenção</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/lojas">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Loja</th>
                  <th>Responsável</th>
                  <th>Plano</th>
                  <th className="text-right">Faturamento</th>
                  <th>Risco</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5 font-medium">{store.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{store.owner}</td>
                    <td className="px-4 py-2.5">{store.plan}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatBRL(store.monthRevenue)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RiskBadge risk={store.risk} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard">Ver loja</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!watchlist.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma loja em atenção.
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

export function RiskBadge({ risk }: { risk: "saudavel" | "atencao" | "critico" }) {
  const map = {
    saudavel: { label: "Saudável", cls: "border-success/40 text-success bg-success/5" },
    atencao: { label: "Atenção", cls: "border-warning/40 text-warning bg-warning/5" },
    critico: { label: "Crítico", cls: "border-destructive/40 text-destructive bg-destructive/5" },
  }[risk];
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.cls)}>
      {map.label}
    </Badge>
  );
}
