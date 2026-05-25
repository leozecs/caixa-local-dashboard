import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Building2, DollarSign, Clock, AlertCircle, TrendingDown, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADMIN_STORES, formatBRL, getMonthlyHistory } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — Caixa Local" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const stats = useMemo(() => {
    const ativas = ADMIN_STORES.filter((s) => s.status === "ativa").length;
    const trial = ADMIN_STORES.filter((s) => s.status === "trial").length;
    const pendentes = ADMIN_STORES.filter((s) => s.status === "pendente").length;
    const mrr = ADMIN_STORES.filter((s) => s.status === "ativa")
      .reduce((a, s) => a + (s.plan === "Pro" ? 79 : 39), 0);
    const totalRev = ADMIN_STORES.reduce((a, s) => a + s.monthRevenue, 0);
    const queda = ADMIN_STORES.filter((s) => s.risk !== "saudavel").length;
    return { ativas, trial, pendentes, mrr, totalRev, queda };
  }, []);

  const history = useMemo(() => getMonthlyHistory(), []);

  const watchlist = ADMIN_STORES.filter((s) => s.risk !== "saudavel").slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Painel administrativo"
        description="Saúde da base de lojas Caixa Local."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard label="Lojas ativas" value={String(stats.ativas)} icon={Building2} accent="success" />
        <MetricCard label="MRR" value={formatBRL(stats.mrr)} icon={DollarSign} accent="info" />
        <MetricCard label="Em trial" value={String(stats.trial)} icon={Clock} />
        <MetricCard label="Inadimplentes" value={String(stats.pendentes)} icon={AlertCircle} accent="warning" />
        <MetricCard label="GMV reportado" value={formatBRL(stats.totalRev)} icon={Users} />
        <MetricCard label="Lojas com queda" value={String(stats.queda)} icon={TrendingDown} accent="expense" />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Faturamento agregado da base</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ left: 8, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="gAdm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.45 0.1 230)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.45 0.1 230)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.008 247)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: any) => formatBRL(v)} />
              <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="oklch(0.45 0.1 230)" strokeWidth={2} fill="url(#gAdm)" />
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
                {watchlist.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.owner}</td>
                    <td className="px-4 py-2.5">{s.plan}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(s.monthRevenue)}</td>
                    <td className="px-4 py-2.5"><RiskBadge risk={s.risk} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard">Ver loja</Link>
                      </Button>
                    </td>
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
