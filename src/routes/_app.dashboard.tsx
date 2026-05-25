import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Info,
  Percent,
  Plus,
  Receipt,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";
import { format, isSameDay, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { useSession } from "@/lib/auth";
import { formatBRL, formatBRLPrecise, getCurrentStore, getGoals, listEntries } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Caixa Local" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useSession();
  const today = new Date();
  const monthStart = startOfMonth(today);
  const previousMonth = startOfMonth(subMonths(today, 1));

  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: goals = { revenue: 45000, margin: 22, maxExpenses: 30000 } } = useQuery({
    queryKey: ["goals", store?.id, monthStart.toISOString()],
    queryFn: () => getGoals(store!.id, monthStart),
    enabled: Boolean(store?.id),
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["entries-dashboard", store?.id, monthStart.toISOString()],
    queryFn: () =>
      listEntries(
        store!.id,
        previousMonth.toISOString().slice(0, 10),
        new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10),
      ),
    enabled: Boolean(store?.id),
  });

  if (loadingStore || loadingEntries)
    return <div className="text-sm text-muted-foreground">Carregando dashboard...</div>;
  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada à sua conta.</div>;

  const currentEntries = entries.filter((entry) => isSameMonth(parseISO(entry.date), monthStart));
  const previousEntries = entries.filter((entry) =>
    isSameMonth(parseISO(entry.date), previousMonth),
  );
  const sumBy = (items: typeof entries, type: "receita" | "despesa") =>
    items.filter((entry) => entry.type === type).reduce((sum, entry) => sum + entry.amount, 0);

  const revenue = sumBy(currentEntries, "receita");
  const expenses = sumBy(currentEntries, "despesa");
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const sales = currentEntries.filter((entry) => entry.type === "receita");
  const ticket = sales.length ? revenue / sales.length : 0;
  const prevRevenue = sumBy(previousEntries, "receita") || 1;
  const prevExpenses = sumBy(previousEntries, "despesa") || 1;
  const goalProgress = goals.revenue ? (revenue / goals.revenue) * 100 : 0;

  const dailyData = currentEntries.reduce<Array<{ day: string; receita: number; despesa: number }>>(
    (items, entry) => {
      const day = format(parseISO(entry.date), "dd/MM");
      const item = items.find((row) => row.day === day) || { day, receita: 0, despesa: 0 };
      if (!items.includes(item)) items.push(item);
      if (entry.type === "receita") item.receita += entry.amount;
      else item.despesa += entry.amount;
      return items;
    },
    [],
  );

  const expensesByCat = currentEntries
    .filter((entry) => entry.type === "despesa")
    .reduce<Array<{ categoria: string; valor: number }>>((items, entry) => {
      const item = items.find((row) => row.categoria === entry.category) || {
        categoria: entry.category,
        valor: 0,
      };
      if (!items.includes(item)) items.push(item);
      item.valor += entry.amount;
      return items;
    }, [])
    .sort((a, b) => b.valor - a.valor);

  const todayEntries = currentEntries.filter((entry) => isSameDay(parseISO(entry.date), today));
  const todayRevenue = sumBy(todayEntries, "receita");
  const todayExpenses = sumBy(todayEntries, "despesa");
  const alerts = buildAlerts({ margin, goalProgress, expenses, goals, today });

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Olá, ${store.owner.split(" ")[0]}.`}
        description={`Visão geral de ${format(monthStart, "MMMM/yyyy", { locale: ptBR })} — ${store.name}`}
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link to="/lancamentos">
              <Plus className="h-4 w-4" /> Novo lançamento
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          label="Faturamento"
          value={formatBRL(revenue)}
          icon={DollarSign}
          accent="success"
          delta={((revenue - prevRevenue) / prevRevenue) * 100}
          hint="vs mês anterior"
        />
        <MetricCard
          label="Despesas"
          value={formatBRL(expenses)}
          icon={Receipt}
          accent="expense"
          delta={((expenses - prevExpenses) / prevExpenses) * 100}
          hint="vs mês anterior"
        />
        <MetricCard
          label="Lucro estimado"
          value={formatBRL(profit)}
          icon={TrendingUp}
          accent="info"
        />
        <MetricCard
          label="Margem"
          value={`${margin.toFixed(1)}%`}
          icon={Percent}
          accent={margin >= goals.margin ? "success" : "warning"}
          hint={`meta ${goals.margin}%`}
        />
        <MetricCard label="Ticket médio" value={formatBRL(ticket)} icon={ShoppingBag} />
        <MetricCard
          label="Meta mensal"
          value={`${goalProgress.toFixed(0)}%`}
          icon={Target}
          hint={formatBRL(goals.revenue)}
          accent={goalProgress >= 100 ? "success" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="xl:col-span-2 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Faturamento diário</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ left: 8, right: 12, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.91 0.008 247)"
                  vertical={false}
                />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="oklch(0.58 0.13 155)"
                  strokeWidth={2}
                  fill="oklch(0.58 0.13 155 / 0.12)"
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
              <BarChart
                data={expensesByCat}
                layout="vertical"
                margin={{ left: 16, right: 12, top: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.91 0.008 247)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={84}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="valor" name="Despesa" radius={[0, 4, 4, 0]}>
                  {expensesByCat.map((_, index) => (
                    <Cell key={index} fill="oklch(0.56 0.2 27)" fillOpacity={0.85 - index * 0.06} />
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
            <CardTitle className="text-sm font-semibold">Resumo de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <TodayRow
              label="Vendas lançadas"
              value={`${todayEntries.filter((entry) => entry.type === "receita").length}`}
              sub={formatBRL(todayRevenue)}
              accent="success"
            />
            <TodayRow
              label="Despesas lançadas"
              value={`${todayEntries.filter((entry) => entry.type === "despesa").length}`}
              sub={formatBRL(todayExpenses)}
              accent="expense"
            />
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground">Saldo do dia</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  todayRevenue - todayExpenses >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatBRL(todayRevenue - todayExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {alerts.map((alert, index) => (
              <AlertRow key={index} {...alert} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Últimos lançamentos</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/lancamentos">Ver todos</Link>
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
                {entries.slice(0, 6).map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {format(parseISO(entry.date), "dd/MM")}
                    </td>
                    <td className="px-4 py-2.5">
                      <EntryBadge type={entry.type} />
                    </td>
                    <td className="px-4 py-2.5">{entry.category}</td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[280px]">
                      {entry.description}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{entry.paymentMethod}</td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-medium tabular-nums",
                        entry.type === "receita" ? "text-success" : "text-destructive",
                      )}
                    >
                      {entry.type === "receita" ? "+" : "-"} {formatBRLPrecise(entry.amount)}
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

function buildAlerts({
  margin,
  goalProgress,
  expenses,
  goals,
  today,
}: {
  margin: number;
  goalProgress: number;
  expenses: number;
  goals: { margin: number; revenue: number; maxExpenses: number };
  today: Date;
}): { type: "warning" | "danger" | "info"; text: string }[] {
  const alerts: { type: "warning" | "danger" | "info"; text: string }[] = [];
  if (margin < goals.margin)
    alerts.push({
      type: "warning",
      text: `Margem em ${margin.toFixed(1)}% — abaixo da meta (${goals.margin}%).`,
    });
  if (goalProgress < (today.getDate() / 30) * 100 - 10)
    alerts.push({
      type: "warning",
      text: `Meta atrasada — ${goalProgress.toFixed(0)}% no dia ${today.getDate()}.`,
    });
  if (expenses > goals.maxExpenses * 0.85)
    alerts.push({
      type: "danger",
      text: `Despesas em ${formatBRL(expenses)}, próximas do limite (${formatBRL(goals.maxExpenses)}).`,
    });
  return alerts.length
    ? alerts
    : [{ type: "info", text: "Tudo dentro do esperado para o período." }];
}

function TodayRow({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "success" | "expense";
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground/80">{value} hoje</div>
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          accent === "success" ? "text-success" : "text-destructive",
        )}
      >
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

function EntryBadge({ type }: { type: "receita" | "despesa" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 font-normal text-[11px]",
        type === "receita"
          ? "border-success/40 text-success"
          : "border-destructive/30 text-destructive",
      )}
    >
      {type === "receita" ? "Receita" : "Despesa"}
    </Badge>
  );
}

type TooltipPayload = {
  dataKey: string;
  name: string;
  value: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2">
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium tabular-nums">{formatBRL(item.value)}</span>
        </div>
      ))}
    </div>
  );
}
