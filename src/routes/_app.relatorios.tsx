import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth";
import { formatBRL, getCurrentStore, getMonthlyHistory, listEntries, type Entry } from "@/lib/data";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatorios - Caixa Local" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { session } = useSession();
  const months = useMemo(
    () =>
      Array.from({ length: 6 })
        .map((_, index) => {
          const date = startOfMonth(subMonths(new Date(), 5 - index));
          return { value: date.toISOString(), label: format(date, "MMMM/yyyy", { locale: ptBR }) };
        })
        .reverse(),
    [],
  );
  const [selected, setSelected] = useState(months[0].value);
  const selectedDate = parseISO(selected);

  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries", store?.id],
    queryFn: () => listEntries(store!.id, "2000-01-01", "2100-01-01"),
    enabled: Boolean(store?.id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["monthly-history", store?.id],
    queryFn: () => getMonthlyHistory(store!.id),
    enabled: Boolean(store?.id),
  });

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;

  const storeName = store.name;
  const monthEntries = entries.filter((entry) => isSameMonth(parseISO(entry.date), selectedDate));
  const rev = monthEntries
    .filter((entry) => entry.type === "receita")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const exp = monthEntries
    .filter((entry) => entry.type === "despesa")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const lucro = rev - exp;
  const margin = rev > 0 ? (lucro / rev) * 100 : 0;
  const byCat = monthEntries.reduce<Array<{ categoria: string; receita: number; despesa: number }>>(
    (items, entry) => {
      const item = items.find((row) => row.categoria === entry.category) || {
        categoria: entry.category,
        receita: 0,
        despesa: 0,
      };
      if (!items.includes(item)) items.push(item);
      if (entry.type === "receita") item.receita += entry.amount;
      else item.despesa += entry.amount;
      return items;
    },
    [],
  );

  function exportCsv() {
    const header = ["Data", "Tipo", "Categoria", "Descricao", "Pagamento", "Valor"];
    const csv = [header, ...buildReportRows(monthEntries)]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caixa-local-${storeName}-${format(selectedDate, "yyyy-MM")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exportado.");
  }

  function exportPdf() {
    const popup = window.open("", "_blank", "width=960,height=720");
    if (!popup) {
      toast.error("Permita pop-ups para gerar o PDF.");
      return;
    }
    const rows = buildReportRows(monthEntries);
    popup.document.write(`
      <html><head><title>Relatorio Caixa Local</title><style>
      body{font-family:Arial,sans-serif;color:#111827;padding:24px} h1{font-size:20px;margin:0 0 4px}
      .meta{color:#4b5563;margin-bottom:20px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
      .card{border:1px solid #d1d5db;padding:10px;border-radius:6px}.label{font-size:11px;color:#6b7280;text-transform:uppercase}
      .value{font-size:18px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f3f4f6;font-size:11px;text-transform:uppercase;color:#4b5563}
      td:last-child,th:last-child{text-align:right}</style></head><body>
      <h1>Relatorio Caixa Local - ${escapeHtml(storeName)}</h1>
      <div class="meta">${escapeHtml(format(selectedDate, "MMMM/yyyy", { locale: ptBR }))}</div>
      <div class="cards">
        <div class="card"><div class="label">Faturamento</div><div class="value">${formatBRL(rev)}</div></div>
        <div class="card"><div class="label">Despesas</div><div class="value">${formatBRL(exp)}</div></div>
        <div class="card"><div class="label">Lucro</div><div class="value">${formatBRL(lucro)}</div></div>
        <div class="card"><div class="label">Margem</div><div class="value">${margin.toFixed(1)}%</div></div>
      </div>
      <table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descricao</th><th>Pagamento</th><th>Valor</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <script>window.print();</script></body></html>
    `);
    popup.document.close();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatorios"
        description="Fechamento mensal, evolucao do negocio e exportacao padronizada."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={exportPdf}>
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Mes de referencia:</span>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-[200px]">
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Faturamento" value={formatBRL(rev)} accent="success" />
        <MetricCard label="Despesas" value={formatBRL(exp)} accent="expense" />
        <MetricCard label="Lucro" value={formatBRL(lucro)} accent="info" />
        <MetricCard label="Margem" value={`${margin.toFixed(1)}%`} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Evolucao dos ultimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ left: 8, right: 12, top: 8 }}>
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
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="faturamento"
                name="Faturamento"
                stroke="oklch(0.58 0.13 155)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="oklch(0.56 0.2 27)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="lucro"
                name="Lucro"
                stroke="oklch(0.45 0.1 230)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Por categoria - {format(selectedDate, "MMMM/yyyy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Categoria</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">Despesa</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {byCat.map((row) => (
                  <tr
                    key={row.categoria}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5 font-medium">{row.categoria}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-success">
                      {row.receita > 0 ? formatBRL(row.receita) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-destructive">
                      {row.despesa > 0 ? formatBRL(row.despesa) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {formatBRL(row.receita - row.despesa)}
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

function buildReportRows(entries: Entry[]) {
  return entries.map((entry) => [
    format(parseISO(entry.date), "dd/MM/yyyy"),
    entry.type === "receita" ? "Receita" : "Despesa",
    entry.category,
    entry.description || "-",
    entry.paymentMethod,
    `${entry.type === "receita" ? "" : "-"}${entry.amount.toFixed(2).replace(".", ",")}`,
  ]);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
