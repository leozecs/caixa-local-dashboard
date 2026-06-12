import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { DollarSign, Percent, Plus, Receipt, ShoppingBag, Target, TrendingUp } from "lucide-react";
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { useSession } from "@/lib/auth";
import {
  formatBRL,
  formatBRLPrecise,
  getCurrentStore,
  getGoals,
  listEntryMonths,
  getPlanCapabilities,
  listEntries,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Caixa Local" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useSession();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(today).toISOString());
  const [selectedWeek, setSelectedWeek] = useState(() => String(getMonthWeek(today)));
  const [selectedSalesperson, setSelectedSalesperson] = useState("todos");
  const monthStart = parseISO(selectedMonth);
  const previousMonth = startOfMonth(subMonths(monthStart, 1));

  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: entryMonths = [], isLoading: loadingMonths } = useQuery({
    queryKey: ["entry-months", store?.id],
    queryFn: () => listEntryMonths(store!.id),
    enabled: Boolean(store?.id),
  });

  const months = useMemo(() => {
    const values = entryMonths.length
      ? entryMonths
      : [startOfMonth(today).toISOString().slice(0, 10)];
    return values.map((value) => {
      const date = startOfMonth(parseISO(value));
      return { value: date.toISOString(), label: format(date, "MMMM/yyyy", { locale: ptBR }) };
    });
  }, [entryMonths, today]);

  useEffect(() => {
    if (!months.length) return;
    if (!months.some((month) => month.value === selectedMonth)) {
      const nextMonth = months[0].value;
      setSelectedMonth(nextMonth);
      setSelectedWeek(isSameMonth(parseISO(nextMonth), today) ? String(getMonthWeek(today)) : "1");
    }
  }, [months, selectedMonth, today]);

  const { data: goals = { revenue: 0, margin: 0, maxExpenses: 0 } } = useQuery({
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
        new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString().slice(0, 10),
      ),
    enabled: Boolean(store?.id),
  });

  if (loadingStore || loadingEntries || loadingMonths)
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
  const isPersonalProfile = store.profileType === "pessoal";
  const productCost = currentEntries
    .filter((entry) => entry.type === "receita")
    .reduce((sum, entry) => sum + (entry.productCostAmount || 0), 0);
  const productRevenue = currentEntries
    .filter((entry) => entry.type === "receita" && entry.productCostAmount)
    .reduce((sum, entry) => sum + (entry.saleTotalAmount ?? entry.amount), 0);
  const productMargin = productCost > 0 ? ((productRevenue - productCost) / productCost) * 100 : 0;
  const operationalMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const margin = productCost > 0 ? productMargin : operationalMargin;
  const capabilities = getPlanCapabilities(store.plan);
  const showEmployeeCommissions = !isPersonalProfile && store.employeeCommissionsEnabled !== false;
  const sales = currentEntries.filter((entry) => entry.type === "receita");
  const ticket = sales.length ? revenue / sales.length : 0;
  const prevRevenue = sumBy(previousEntries, "receita") || 1;
  const prevExpenses = sumBy(previousEntries, "despesa") || 1;
  const goalProgress = goals.revenue ? (revenue / goals.revenue) * 100 : 0;
  const isAttendant = store.memberRole === "atendente";

  const selectedWeekStart = addDays(startOfMonth(monthStart), (Number(selectedWeek) - 1) * 7);
  const selectedWeekEnd =
    Number(selectedWeek) === 4 ? endOfMonth(monthStart) : addDays(selectedWeekStart, 6);
  const weeklyRevenueData = Array.from({
    length: selectedWeekEnd.getDate() - selectedWeekStart.getDate() + 1,
  }).map((_, index) => {
    const day = addDays(selectedWeekStart, index);
    const dayEntries = currentEntries.filter((entry) => isSameDay(parseISO(entry.date), day));
    return {
      day: format(day, "EEE dd/MM", { locale: ptBR }),
      receita: sumBy(dayEntries, "receita"),
    };
  });
  const dailyRevenueValues = Array.from({ length: endOfMonth(monthStart).getDate() }).map(
    (_, index) => {
      const day = addDays(startOfMonth(monthStart), index);
      const dayEntries = currentEntries.filter((entry) => isSameDay(parseISO(entry.date), day));
      return sumBy(dayEntries, "receita");
    },
  );
  const weeklyRevenueTicks = buildChartTicks(dailyRevenueValues);

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
  const salespeople = Array.from(
    new Set(
      currentEntries
        .filter((entry) => entry.type === "receita")
        .map((entry) => entry.salespersonName?.trim() || "Sem responsavel"),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const revenueBySalesperson = currentEntries
    .filter((entry) => entry.type === "receita")
    .filter((entry) =>
      selectedSalesperson === "todos"
        ? true
        : (entry.salespersonName?.trim() || "Sem responsavel") === selectedSalesperson,
    )
    .reduce<Array<{ funcionario: string; valorVendido: number; comissao: number }>>(
      (items, entry) => {
        const name = entry.salespersonName?.trim() || "Sem responsavel";
        const item = items.find((row) => row.funcionario === name) || {
          funcionario: name,
          valorVendido: 0,
          comissao: 0,
        };
        if (!items.includes(item)) items.push(item);
        item.valorVendido += entry.saleTotalAmount ?? entry.amount;
        item.comissao += entry.commissionAmount || 0;
        return items;
      },
      [],
    )
    .sort((a, b) => b.valorVendido - a.valorVendido);
  const topSalesperson = revenueBySalesperson[0];

  const todayEntries = currentEntries.filter((entry) => isSameDay(parseISO(entry.date), today));
  const todayRevenue = sumBy(todayEntries, "receita");
  const todayExpenses = sumBy(todayEntries, "despesa");
  const todayProfit = todayRevenue - todayExpenses;
  const daysInMonth = endOfMonth(monthStart).getDate();
  const elapsedDay = isSameMonth(monthStart, today) ? today.getDate() : daysInMonth;
  const dailyRevenueGoal = goals.revenue > 0 ? goals.revenue / daysInMonth : 0;
  const expectedRevenue = goals.revenue > 0 ? dailyRevenueGoal * elapsedDay : 0;

  const expenseTicks = buildExpenseTicks(expensesByCat.map((item) => item.valor));

  if (isAttendant) {
    const weekDays = Array.from({ length: 7 }).map((_, index) => subDays(today, 6 - index));
    const weekRows = weekDays.map((day) => {
      const dayEntries = entries.filter((entry) => isSameDay(parseISO(entry.date), day));
      const dayRevenue = sumBy(dayEntries, "receita");
      const dayExpenses = sumBy(dayEntries, "despesa");
      return {
        label: format(day, "EEE dd/MM", { locale: ptBR }),
        revenue: dayRevenue,
        expenses: dayExpenses,
        balance: dayRevenue - dayExpenses,
      };
    });
    const weekRevenue = weekRows.reduce((sum, row) => sum + row.revenue, 0);
    const weekExpenses = weekRows.reduce((sum, row) => sum + row.expenses, 0);

    return (
      <div className="space-y-5">
        <PageHeader
          title={`Olá, ${session?.name.split(" ")[0] || "atendente"}.`}
          description={`Resumo operacional da semana — ${store.name}`}
          actions={
            <Button size="sm" className="gap-2" asChild>
              <Link to="/lancamentos">
                <Plus className="h-4 w-4" /> Novo lançamento
              </Link>
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard label="Entrou na semana" value={formatBRL(weekRevenue)} accent="success" />
          <MetricCard label="Saiu na semana" value={formatBRL(weekExpenses)} accent="expense" />
          <MetricCard
            label="Saldo da semana"
            value={formatBRL(weekRevenue - weekExpenses)}
            accent={weekRevenue - weekExpenses >= 0 ? "success" : "expense"}
          />
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                    <th>Dia</th>
                    <th className="text-right">Entrou</th>
                    <th className="text-right">Saiu</th>
                    <th className="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {weekRows.map((row) => (
                    <tr key={row.label} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 capitalize">{row.label}</td>
                      <td className="px-4 py-3 text-right font-medium text-success">
                        {formatBRLPrecise(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-destructive">
                        {formatBRLPrecise(row.expenses)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold",
                          row.balance >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {formatBRLPrecise(row.balance)}
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Olá, ${store.owner.split(" ")[0]}.`}
        description={`Visão geral de ${format(monthStart, "MMMM/yyyy", { locale: ptBR })} — ${store.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedMonth}
              onValueChange={(value) => {
                setSelectedMonth(value);
                setSelectedWeek(
                  isSameMonth(parseISO(value), today) ? String(getMonthWeek(today)) : "1",
                );
              }}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2" asChild>
              <Link to="/lancamentos">
                <Plus className="h-4 w-4" /> Novo lançamento
              </Link>
            </Button>
          </div>
        }
      />

      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 gap-3",
          isPersonalProfile ? "xl:grid-cols-3" : "xl:grid-cols-6",
        )}
      >
        <MetricCard
          label="Faturamento"
          value={formatBRL(revenue)}
          icon={DollarSign}
          accent="success"
          delta={
            capabilities.monthlyComparison
              ? ((revenue - prevRevenue) / prevRevenue) * 100
              : undefined
          }
          hint="vs mês anterior"
        />
        <MetricCard
          label="Despesas"
          value={formatBRL(expenses)}
          icon={Receipt}
          accent="expense"
          delta={
            capabilities.monthlyComparison
              ? ((expenses - prevExpenses) / prevExpenses) * 100
              : undefined
          }
          hint="vs mês anterior"
        />
        <MetricCard
          label="Lucro estimado"
          value={formatBRL(profit)}
          icon={TrendingUp}
          accent="info"
        />
        {!isPersonalProfile && (
          <MetricCard
            label={productCost > 0 ? "Margem produto" : "Margem"}
            value={`${margin.toFixed(1)}%`}
            icon={Percent}
            accent={goals.margin > 0 && margin < goals.margin ? "warning" : "success"}
            hint={goals.margin > 0 ? `meta ${goals.margin}%` : "sem meta"}
          />
        )}
        {!isPersonalProfile && (
          <MetricCard label="Ticket médio" value={formatBRL(ticket)} icon={ShoppingBag} />
        )}
        <MetricCard
          label="Meta mensal"
          value={`${goalProgress.toFixed(0)}%`}
          icon={Target}
          hint={goals.revenue > 0 ? formatBRL(goals.revenue) : "sem meta"}
          accent={goalProgress >= 100 ? "success" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RoutineCard
          title="Despesa que mais pesou"
          value={expensesByCat[0] ? expensesByCat[0].categoria : "Sem despesa"}
          detail={
            expensesByCat[0]
              ? `${formatBRL(expensesByCat[0].valor)} no mes atual.`
              : "Nenhuma despesa lancada neste mes."
          }
          tone={expensesByCat[0] ? "warning" : "neutral"}
        />
        <RoutineCard
          title="Ritmo da meta"
          value={goals.revenue > 0 ? `${goalProgress.toFixed(0)}%` : "Sem meta"}
          detail={
            goals.revenue > 0
              ? `Meta diaria media: ${formatBRL(dailyRevenueGoal)}.`
              : "Configure uma meta mensal para medir o ritmo."
          }
          tone={goals.revenue > 0 && revenue < expectedRevenue * 0.85 ? "warning" : "success"}
        />
        <RoutineCard
          title="Estimado até o dia atual"
          value={goals.revenue > 0 ? formatBRL(expectedRevenue) : "Sem meta"}
          detail={
            goals.revenue > 0
              ? `Dia ${elapsedDay} de ${daysInMonth}, calculado sobre a meta mensal.`
              : "Defina uma meta de faturamento para calcular o estimado."
          }
          tone={goals.revenue > 0 && revenue < expectedRevenue * 0.85 ? "warning" : "success"}
        />
      </div>

      {showEmployeeCommissions && (
        <Card className="shadow-none">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold">Receita por funcionario</CardTitle>
              <div className="text-xs text-muted-foreground">
                {topSalesperson
                  ? `Melhor resultado: ${topSalesperson.funcionario} com ${formatBRL(topSalesperson.valorVendido)}.`
                  : "Informe o responsavel nas receitas para ver o ranking."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
                <SelectTrigger className="h-8 w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos funcionarios</SelectItem>
                  {salespeople.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSalesperson("todos")}
                disabled={selectedSalesperson === "todos"}
              >
                Lista
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[260px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySalesperson} margin={{ left: 16, right: 16, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.91 0.008 247)"
                  vertical={false}
                />
                <XAxis
                  dataKey="funcionario"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="valorVendido"
                  name="Valor vendido"
                  fill="oklch(0.58 0.13 155)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="comissao"
                  name="Comissão"
                  fill="oklch(0.64 0.17 65)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="xl:col-span-2 shadow-none">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-sm font-semibold">Faturamento semanal</CardTitle>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((week) => (
                  <SelectItem key={week} value={String(week)}>
                    Semana {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-[280px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyRevenueData} margin={{ left: 8, right: 12, top: 8 }}>
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
                  ticks={weeklyRevenueTicks}
                  domain={[0, weeklyRevenueTicks[weeklyRevenueTicks.length - 1] || 0]}
                  tickFormatter={(value) => formatCurrencyTick(Number(value))}
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
                  ticks={expenseTicks}
                  tickFormatter={(value) => formatCompactNumber(Number(value))}
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
                    <th>Responsavel</th>
                    <th>Descrição</th>
                    <th>Pagamento</th>
                    <th className="text-right">Parcelas</th>
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
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {entry.type === "receita" ? entry.salespersonName || "-" : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[280px]">
                        {entry.description}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{entry.paymentMethod}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {entry.type === "receita" ? `${entry.installments || 1}x` : "-"}
                      </td>
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
    </div>
  );
}

function buildExpenseTicks(values: number[]) {
  const max = Math.max(...values, 0);
  if (max <= 1000) return [0, 100, 250, 500, 750, 1000];
  if (max <= 5000) return [0, 1000, 2000, 3000, 5000];
  if (max <= 20000) return [0, 5000, 10000, 15000, 20000];
  if (max <= 100000) return [0, 10000, 20000, 50000, 70000, 90000];
  return [0, 100000, 250000, 500000, 750000, 1000000];
}

function getMonthWeek(date: Date) {
  return Math.min(4, Math.max(1, Math.ceil(date.getDate() / 7)));
}

function buildChartTicks(values: number[]) {
  const max = Math.max(...values, 0);
  const ceiling = max > 0 ? getNiceCeiling(max) : 1000;
  return Array.from({ length: 5 }).map((_, index) => Math.round((ceiling / 4) * index));
}

function getNiceCeiling(value: number) {
  if (value <= 100) return Math.ceil(value / 10) * 10;
  if (value <= 1000) return Math.ceil(value / 100) * 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

function formatCurrencyTick(value: number) {
  if (value >= 1000) {
    return `R$${Number(value / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: value >= 10000 ? 0 : 1,
    })}k`;
  }
  return formatBRL(value);
}

function formatCompactNumber(value: number) {
  if (value >= 1000) return `${Number(value / 1000).toLocaleString("pt-BR")}k`;
  return String(value);
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

function RoutineCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    neutral: "text-foreground",
  }[tone];
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <div className={cn("mt-1.5 text-xl font-semibold tabular-nums", toneClass)}>{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
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
