import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MOCK_ENTRIES, formatBRL, getMonthlyHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Caixa Local" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const months = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { value: d.toISOString(), label: format(d, "MMMM/yyyy", { locale: ptBR }) };
    }).reverse();
  }, []);
  const [selected, setSelected] = useState(months[0].value);
  const selDate = parseISO(selected);

  const stats = useMemo(() => {
    const arr = MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), selDate));
    const rev = arr.filter((e) => e.type === "receita").reduce((a, b) => a + b.amount, 0);
    const exp = arr.filter((e) => e.type === "despesa").reduce((a, b) => a + b.amount, 0);
    const lucro = rev - exp;
    const margin = rev > 0 ? (lucro / rev) * 100 : 0;
    return { rev, exp, lucro, margin };
  }, [selDate]);

  const history = useMemo(() => getMonthlyHistory(), []);

  const byCat = useMemo(() => {
    const map = new Map<string, { categoria: string; receita: number; despesa: number }>();
    MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), selDate)).forEach((e) => {
      const k = e.category;
      const cur = map.get(k) ?? { categoria: k, receita: 0, despesa: 0 };
      if (e.type === "receita") cur.receita += e.amount;
      else cur.despesa += e.amount;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => (b.receita + b.despesa) - (a.receita + a.despesa));
  }, [selDate]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        description="Fechamento mensal, evolução do negócio e exportação contábil."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.success("PDF gerado e enviado por e-mail.")}>
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.success("Planilha Excel exportada.")}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Mês de referência:</span>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Faturamento" value={formatBRL(stats.rev)} accent="success" />
        <MetricCard label="Despesas" value={formatBRL(stats.exp)} accent="expense" />
        <MetricCard label="Lucro" value={formatBRL(stats.lucro)} accent="info" />
        <MetricCard label="Margem" value={`${stats.margin.toFixed(1)}%`} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Evolução dos últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ left: 8, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.008 247)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 256)" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid oklch(0.91 0.008 247)" }}
                formatter={(v: any) => formatBRL(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="oklch(0.58 0.13 155)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="despesas" name="Despesas" stroke="oklch(0.56 0.2 27)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="oklch(0.45 0.1 230)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Por categoria — {format(selDate, "MMMM/yyyy", { locale: ptBR })}</CardTitle>
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
                {byCat.map((r) => (
                  <tr key={r.categoria} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{r.categoria}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-success">{r.receita > 0 ? formatBRL(r.receita) : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-destructive">{r.despesa > 0 ? formatBRL(r.despesa) : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatBRL(r.receita - r.despesa)}</td>
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
