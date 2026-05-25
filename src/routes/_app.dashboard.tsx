import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  ShoppingBag,
  Target as TargetIcon,
  AlertTriangle,
  AlertCircle,
  Info,
  Plus,
} from "lucide-react";
import { format, isSameDay, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import {
  MOCK_ENTRIES,
  STORE_GOALS,
  CURRENT_STORE,
  formatBRL,
  formatBRLPrecise,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Caixa Local" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const today = new Date();
  const now = startOfMonth(today);
  const prevMonthStart = startOfMonth(subMonths(today, 1));

  const stats = useMemo(() => {
    const curr = MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), now));
    const prev = MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), prevMonthStart));

    const sumBy = (arr: typeof MOCK_ENTRIES, t: "receita" | "despesa") =>
      arr.filter((e) => e.type === t).reduce((a, b) => a + b.amount, 0);

    const revenue = sumBy(curr, "receita");
    const expenses = sumBy(curr, "despesa");
    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const sales = curr.filter((e) => e.type === "receita");
    const ticket = sales.length > 0 ? revenue / sales.length : 0;

    const prevRevenue = sumBy(prev, "receita") || 1;
    const prevExpenses = sumBy(prev, "despesa") || 1;

    return {
      revenue,
      expenses,
      profit,
      margin,
      ticket,
      revenueDelta: ((revenue - prevRevenue) / prevRevenue) * 100,
      expensesDelta: ((expenses - prevExpenses) / prevExpenses) * 100,
      goalProgress: (revenue / STORE_GOALS.revenue) * 100,
    };
  }, [now, prevMonthStart]);

  // Daily revenue line chart
  const dailyData = useMemo(() => {
    const map = new Map<string, { day: string; receita: number; despesa: number }>();
    MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), now)).forEach((e) => {
      const day = format(parseISO(e.date), "dd/MM");
      const cur = map.get(day) ?? { day, receita: 0, despesa: 0 };
      if (e.type === "receita") cur.receita += e.amount;
      else cur.despesa += e.amount;
      map.set(day, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [now]);

  // Expenses by category
  const expensesByCat = useMemo(() => {
    const map = new Map<string, number>();
    MOCK_ENTRIES.filter(
      (e) => isSameMonth(parseISO(e.date), now) && e.type === "despesa"
    ).forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [now]);

  // Comparison curr vs prev
  const comparison = useMemo(() => {
    const months = [prevMonthStart, now];
    return months.map((m) => {
      const arr = MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), m));
      const rev = arr.filter((e) => e.type === "receita").reduce((a, b) => a + b.amount, 0);
      const exp = arr.filter((e) => e.type === "despesa").reduce((a, b) => a + b.amount, 0);
      return {
        mes: format(m, "MMM/yy", { locale: ptBR }),
        Receita: rev,
        Despesa: exp,
      };
    });
  }, [now, prevMonthStart]);

  // Today
  const todayData = useMemo(() => {
    const todayEntries = MOCK_ENTRIES.filter((e) => isSameDay(parseISO(e.date), today));
    const vendas = todayEntries.filter((e) => e.type === "receita").reduce((a, b) => a + b.amount, 0);
    const desp = todayEntries.filter((e) => e.type === "despesa").reduce((a, b) => a + b.amount, 0);
    return {
      vendasCount: todayEntries.filter((e) => e.type === "receita").length,
      despesasCount: todayEntries.filter((e) => e.type === "despesa").length,
      vendas,
      desp,
      saldo: vendas - desp,
    };
  }, [today]);

  const lastEntries = MOCK_ENTRIES.slice(0, 6);

  const alerts = useMemo(() => {
    const list: { type: "warning" | "danger" | "info"; text: string }[] = [];
    if (stats.margin < STORE_GOALS.margin) {
      list.push({
        type: "warning",
        text: `Margem em ${stats.margin.toFixed(1)}% — abaixo da meta (${STORE_GOALS.margin}%).`,
      });
    }
    if (stats.goalProgress < (today.getDate() / 30) * 100 - 10) {
      list.push({
        type: "warning",
        text: `Meta de faturamento atrasada — ${stats.goalProgress.toFixed(0)}% no dia ${today.getDate()}.`,
      });
    }
    if (stats.expenses > STORE_GOALS.maxExpenses * 0.85) {
      list.push({
        type: "danger",
        text: `Despesas do mês já em ${formatBRL(stats.expenses)}, próximas do limite (${formatBRL(STORE_GOALS.maxExpenses)}).`,
      });
    }
    if (list.length === 0) {
      list.push({ type: "info", text: "Tudo dentro do esperado para o período." });
    }
    return list;
  }, [stats, today]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Olá, ${CURRENT_STORE.owner.split(" ")[0]}.`}
        description={`Visão geral de ${format(now, "MMMM/yyyy", { locale: ptBR })} — ${CURRENT_STORE.name}`}
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          label="Faturamento"
          value={formatBRL(stats.revenue)}
          icon={DollarSign}
          accent="success"
          delta={stats.revenueDelta}
          hint="vs mês anterior"
        />
        <MetricCard
          label="Despesas"
          value={formatBRL(stats.expenses)}
          icon={Receipt}
          accent="expense"
          delta={stats.expensesDelta}
          hint="vs mês anterior"
        />
        <MetricCard
          label="Lucro estimado"
          value={formatBRL(stats.profit)}
          icon={TrendingUp}
          accent="info"
        />
        <MetricCard
          label="Margem"
          value={`${stats.margin.toFixed(1)}%`}
          icon={Percent}
          accent={stats.margin >= STORE_GOALS.margin ? "success" : "warning"}
          hint={`meta ${STORE_GOALS.margin}%`}
        />
        <MetricCard
          label="Ticket médio"
          value={formatBRL(stats.ticket)}
          icon={ShoppingBag}
        />
        <MetricCard
          label="Meta mensal"
          value={`${stats.goalProgress.toFixed(0)}%`}
          icon={TargetIcon}
          hint={formatBRL(STORE_GOALS.revenue)}
          accent={stats.goalProgress >= 100 ? "success" : "default"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="xl:col-span-2 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Faturamento diário</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.58 0.13 155)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="oklch(0.58 0.13 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.008 247)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.5 0.02 256)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="oklch(0.58 0.13 155)"
                  strokeWidth={2}
                  fill="url(#gRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByCat} layout="vertical" margin={{ left: 16, right: 12, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.008 247)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.5 0.02 256)"
                  tickLine={false}
                  axisLine={false}
                  width={84}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="valor" name="Despesa" radius={[0, 4, 4, 0]}>
                  {expensesByCat.map((_, i) => (
                    <Cell key={i} fill="oklch(0.56 0.2 27)" fillOpacity={0.85 - i * 0.06} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Mês atual vs mês anterior</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ left: 8, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.008 247)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Receita" fill="oklch(0.58 0.13 155)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesa" fill="oklch(0.56 0.2 27)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resumo de hoje */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Resumo de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <TodayRow label="Vendas lançadas" value={`${todayData.vendasCount}`} sub={formatBRL(todayData.vendas)} accent="success" />
            <TodayRow label="Despesas lançadas" value={`${todayData.despesasCount}`} sub={formatBRL(todayData.desp)} accent="expense" />
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground">Saldo do dia</span>
              <span className={cn("font-semibold tabular-nums", todayData.saldo >= 0 ? "text-success" : "text-destructive")}>
                {formatBRL(todayData.saldo)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <AlertRow key={i} {...a} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Últimos lançamentos */}
      <Card className="shadow-none">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Últimos lançamentos</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/lancamentos">Ver todos</a>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Pagamento</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lastEntries.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5 text-muted-foreground">{format(parseISO(e.date), "dd/MM")}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={cn(
                        "h-5 px-1.5 font-normal text-[11px]",
                        e.type === "receita" ? "border-success/40 text-success" : "border-destructive/30 text-destructive"
                      )}>
                        {e.type === "receita" ? "Receita" : "Despesa"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">{e.category}</td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[280px]">{e.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.paymentMethod}</td>
                    <td className={cn(
                      "px-4 py-2.5 text-right font-medium tabular-nums",
                      e.type === "receita" ? "text-success" : "text-destructive"
                    )}>
                      {e.type === "receita" ? "+" : "−"} {formatBRLPrecise(e.amount)}
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

function TodayRow({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: "success" | "expense" }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground/80">{value} hoje</div>
      </div>
      <div className={cn("font-semibold tabular-nums", accent === "success" ? "text-success" : "text-destructive")}>
        {sub}
      </div>
    </div>
  );
}

function AlertRow({ type, text }: { type: "warning" | "danger" | "info"; text: string }) {
  const map = {
    warning: { Icon: AlertTriangle, cls: "text-warning bg-warning/10 border-warning/30" },
    danger: { Icon: AlertCircle, cls: "text-destructive bg-destructive/10 border-destructive/30" },
    info: { Icon: Info, cls: "text-info bg-info/10 border-info/30" },
  }[type];
  const Icon = map.Icon;
  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", map.cls)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="text-foreground/90">{text}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
