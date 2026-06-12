import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  CheckCircle2,
  ChevronDown,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { addMonths, format, isSameMonth, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetricCard } from "@/components/metric-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/auth";
import {
  formatBRL,
  deleteEntriesByImportSource,
  downloadEntryAttachment,
  getCurrentStore,
  getGoals,
  getPlanCapabilities,
  listEntryMonths,
  listStoreAttachments,
  listEntries,
  saveEntry,
  type Entry,
} from "@/lib/data";
import {
  parseFinancialFile,
  reconcileImportedEntries,
  type ImportedEntry,
  type ReconciliationRow,
} from "@/lib/importers";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatorios - Caixa Local" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [selected, setSelected] = useState(startOfMonth(new Date()).toISOString());
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedSemester, setSelectedSemester] = useState("1");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importKind, setImportKind] = useState<"excel" | "pdf" | "conciliacao">("excel");
  const [importRows, setImportRows] = useState<ImportedEntry[]>([]);
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationRow[]>([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const selectedDate = parseISO(selected);

  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: entryMonths = [] } = useQuery({
    queryKey: ["entry-months", store?.id],
    queryFn: () => listEntryMonths(store!.id),
    enabled: Boolean(store?.id),
  });
  const entriesRange = useMemo(
    () => buildEntriesRange(entryMonths, parseISO(selected)),
    [entryMonths, selected],
  );
  const { data: entries = [] } = useQuery({
    queryKey: ["entries", store?.id, entriesRange.start, entriesRange.end],
    queryFn: () => listEntries(store!.id, entriesRange.start, entriesRange.end),
    enabled: Boolean(store?.id),
  });
  const months = useMemo(() => {
    const values = entryMonths.length
      ? entryMonths
      : [startOfMonth(new Date()).toISOString().slice(0, 10)];
    return values.map((value) => {
      const date = startOfMonth(parseISO(value));
      return { value: date.toISOString(), label: format(date, "MMMM/yyyy", { locale: ptBR }) };
    });
  }, [entryMonths]);

  useEffect(() => {
    if (months.length && !months.some((month) => month.value === selected)) {
      setSelected(months[0].value);
    }
  }, [months, selected]);

  const { data: goals = { revenue: 0, margin: 0, maxExpenses: 0 } } = useQuery({
    queryKey: ["goals", store?.id, selected],
    queryFn: () => getGoals(store!.id, selectedDate),
    enabled: Boolean(store?.id),
  });

  const importMutation = useMutation({
    mutationFn: async (rows: ImportedEntry[]) => {
      if (!store) throw new Error("Loja nao carregada.");
      await Promise.all(
        rows.map((row) =>
          saveEntry({
            storeId: store.id,
            date: row.date,
            type: row.type,
            category: row.category,
            description: row.description,
            paymentMethod: row.paymentMethod,
            amount: row.amount,
            importSource: row.source,
          }),
        ),
      );
    },
    onSuccess: (_data, rows) => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["entry-months"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-history"] });
      queryClient.invalidateQueries({ queryKey: ["store-operational-alerts"] });
      toast.success(`${rows.length} lancamento(s) importado(s).`);
      setImportPreviewOpen(false);
      setReconciliationOpen(false);
      setImportRows([]);
      setReconciliationRows([]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao importar lancamentos."),
  });
  const deleteImportMutation = useMutation({
    mutationFn: (source: string) => {
      if (!store) throw new Error("Loja nao carregada.");
      return deleteEntriesByImportSource(store.id, source);
    },
    onSuccess: (_data, source) => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["entry-months"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-history"] });
      queryClient.invalidateQueries({ queryKey: ["store-operational-alerts"] });
      toast.success(`Arquivo ${source} removido dos relatorios.`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover importacao."),
  });

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;

  const storeName = store.name;
  const capabilities = getPlanCapabilities(store.plan);
  const monthEntries = entries.filter((entry) => isSameMonth(parseISO(entry.date), selectedDate));
  const isPersonalProfile = store.profileType === "pessoal";
  const rev = monthEntries
    .filter((entry) => entry.type === "receita")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const exp = monthEntries
    .filter((entry) => entry.type === "despesa")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const lucro = rev - exp;
  const productCost = monthEntries
    .filter((entry) => entry.type === "receita")
    .reduce((sum, entry) => sum + (entry.productCostAmount || 0), 0);
  const productRevenue = monthEntries
    .filter((entry) => entry.type === "receita" && entry.productCostAmount)
    .reduce((sum, entry) => sum + (entry.saleTotalAmount ?? entry.amount), 0);
  const productMargin = productCost > 0 ? ((productRevenue - productCost) / productCost) * 100 : 0;
  const operationalMargin = rev > 0 ? (lucro / rev) * 100 : 0;
  const margin = productCost > 0 ? productMargin : operationalMargin;
  const marginLabel = productCost > 0 ? "Margem produto" : "Margem";
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
  const topExpense = byCat
    .filter((row) => row.despesa > 0)
    .sort((a, b) => b.despesa - a.despesa)[0];
  const importedSources = Array.from(
    entries.reduce((sources, entry) => {
      if (!entry.importSource) return sources;
      const current = sources.get(entry.importSource) || { count: 0, total: 0 };
      current.count += 1;
      current.total += entry.amount;
      sources.set(entry.importSource, current);
      return sources;
    }, new Map<string, { count: number; total: number }>()),
  ).sort(([a], [b]) => a.localeCompare(b));
  const semesterYears = Array.from(
    new Set([
      new Date().getFullYear(),
      ...entries.map((entry) => parseISO(entry.date).getFullYear()),
    ]),
  )
    .sort((a, b) => b - a)
    .map(String);
  const semesterHistory = buildSemesterHistory(
    entries,
    Number(selectedYear),
    selectedSemester === "1" ? 1 : 2,
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
        ${
          !isPersonalProfile
            ? `<div class="card"><div class="label">${escapeHtml(marginLabel)}</div><div class="value">${margin.toFixed(1)}%</div></div>`
            : ""
        }
      </div>
      <table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descricao</th><th>Pagamento</th><th>Valor</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <script>window.print();</script></body></html>
    `);
    popup.document.close();
  }

  function openImport(kind: "excel" | "pdf" | "conciliacao") {
    setImportKind(kind);
    importInputRef.current?.click();
  }

  async function handleImport(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const rows = await parseFinancialFile(file);
      if (!rows.length) {
        toast.error("Nao encontrei lancamentos reconheciveis no arquivo.");
        return;
      }

      if (importKind === "conciliacao") {
        setReconciliationRows(reconcileImportedEntries(rows, entries));
        setReconciliationOpen(true);
      } else {
        setImportRows(rows);
        setImportPreviewOpen(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao ler arquivo.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function exportCompleteZip() {
    if (!store) return;
    const zip = new JSZip();
    const attachments = await listStoreAttachments(store.id);
    zip.file(
      "loja.json",
      JSON.stringify(
        {
          store,
          goals,
          attachments,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    zip.file("lancamentos.csv", buildCsv(entries));
    zip.file("relatorio-mensal.csv", buildCsv(monthEntries));
    const attachmentsFolder = zip.folder("comprovantes");
    for (const attachment of attachments) {
      const blob = await downloadEntryAttachment(attachment);
      attachmentsFolder?.file(`${attachment.entryId}/${attachment.fileName}`, blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caixa-local-backup-${storeName}-${format(new Date(), "yyyy-MM-dd")}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export completo gerado.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatorios"
        description="Fechamento mensal, evolucao do negocio e exportacao padronizada."
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              className="hidden"
              accept={
                importKind === "excel"
                  ? ".xlsx,.xls,.csv,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                  : importKind === "conciliacao"
                    ? ".xlsx,.xls,.csv,.txt,.pdf,application/pdf,text/csv,text/plain"
                    : ".pdf,application/pdf"
              }
              onChange={(event) => handleImport(event.target.files)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Importar
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openImport("excel")}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openImport("pdf")}>
                  <FileText className="h-4 w-4" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openImport("conciliacao")}>
                  <CheckCircle2 className="h-4 w-4" /> Conciliar extrato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" /> Exportar
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCsv}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPdf}>
                  <FileText className="h-4 w-4" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCompleteZip}>
                  <FileArchive className="h-4 w-4" /> Dados completos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {semesterYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Semestre 1</SelectItem>
              <SelectItem value="2">Semestre 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faturamento" value={formatBRL(rev)} accent="success" />
        <MetricCard label="Despesas" value={formatBRL(exp)} accent="expense" />
        <MetricCard label="Lucro" value={formatBRL(lucro)} accent="info" />
        {!isPersonalProfile && <MetricCard label={marginLabel} value={`${margin.toFixed(1)}%`} />}
      </div>

      <Card className="overflow-hidden shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Evolucao do semestre {selectedSemester}/{selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={semesterHistory} margin={{ left: 8, right: 12, top: 8 }}>
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
                tickFormatter={(value) => `R${(Number(value) / 1000).toFixed(0)}k`}
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

      {importedSources.length ? (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Arquivos importados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {importedSources.map(([source, info]) => (
              <div
                key={source}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{source}</div>
                  <div className="text-xs text-muted-foreground">
                    {info.count} lancamento(s), total movimentado {formatBRL(info.total)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={deleteImportMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover todos os lancamentos importados de "${source}"?`)) {
                      deleteImportMutation.mutate(source);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {capabilities.interpretedReports ? (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Relatorio interpretado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <InterpretationCard
              title="Onde ganhou"
              text={
                rev > 0
                  ? `A loja gerou ${formatBRL(rev)} no mes, com margem de ${margin.toFixed(1)}%.`
                  : "Ainda nao ha receita suficiente para apontar ganho real."
              }
            />
            <InterpretationCard
              title="Onde perdeu"
              text={
                topExpense
                  ? `${topExpense.categoria} foi a maior saida: ${formatBRL(topExpense.despesa)}.`
                  : "Ainda nao ha despesa cadastrada no periodo."
              }
            />
            <InterpretationCard
              title="Ponto de atencao"
              text={
                lucro >= 0
                  ? "O lucro esta positivo; mantenha lancamentos diarios para validar tendencia."
                  : "O mes esta negativo; revise despesas fixas e precificacao antes de crescer volume."
              }
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden shadow-none">
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

      <ImportPreviewDialog
        open={importPreviewOpen}
        rows={importRows}
        saving={importMutation.isPending}
        onOpenChange={setImportPreviewOpen}
        onConfirm={() => importMutation.mutate(importRows)}
      />

      <ReconciliationDialog
        open={reconciliationOpen}
        rows={reconciliationRows}
        saving={importMutation.isPending}
        onOpenChange={setReconciliationOpen}
        onImportMissing={() =>
          importMutation.mutate(
            reconciliationRows.filter((row) => row.status === "missing").map(stripStatus),
          )
        }
      />
    </div>
  );
}

function buildSemesterHistory(entries: Entry[], year: number, semester: 1 | 2) {
  const firstMonth = semester === 1 ? 0 : 6;
  return Array.from({ length: 6 }).map((_, index) => {
    const monthDate = new Date(year, firstMonth + index, 1);
    const monthEntries = entries.filter((entry) => isSameMonth(parseISO(entry.date), monthDate));
    const faturamento = monthEntries
      .filter((entry) => entry.type === "receita")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const despesas = monthEntries
      .filter((entry) => entry.type === "despesa")
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      month: format(monthDate, "MMM/yy", { locale: ptBR }),
      faturamento,
      despesas,
      lucro: faturamento - despesas,
    };
  });
}

function buildEntriesRange(monthKeys: string[], selectedDate: Date) {
  const months = [
    startOfMonth(selectedDate),
    ...monthKeys.map((monthKey) => startOfMonth(parseISO(monthKey))),
  ].sort((left, right) => left.getTime() - right.getTime());
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];

  return {
    start: format(firstMonth, "yyyy-MM-dd"),
    end: format(addMonths(lastMonth, 1), "yyyy-MM-dd"),
  };
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

function buildCsv(entries: Entry[]) {
  const header = ["Data", "Tipo", "Categoria", "Descricao", "Pagamento", "Valor"];
  return [header, ...buildReportRows(entries)]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}

function stripStatus(row: ReconciliationRow): ImportedEntry {
  return {
    date: row.date,
    type: row.type,
    category: row.category,
    description: row.description,
    paymentMethod: row.paymentMethod,
    amount: row.amount,
    source: row.source,
  };
}

function ImportPreviewDialog({
  open,
  rows,
  saving,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  rows: ImportedEntry[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Conferir importacao</DialogTitle>
        </DialogHeader>
        <ImportedRowsTable rows={rows} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={saving || !rows.length}>
            {saving ? "Importando..." : `Importar ${rows.length} lancamento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReconciliationDialog({
  open,
  rows,
  saving,
  onOpenChange,
  onImportMissing,
}: {
  open: boolean;
  rows: ReconciliationRow[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onImportMissing: () => void;
}) {
  const missingCount = rows.filter((row) => row.status === "missing").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Conciliação do extrato</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <SummaryPill
            label="Conciliados"
            value={rows.filter((row) => row.status === "matched").length}
          />
          <SummaryPill
            label="Possiveis"
            value={rows.filter((row) => row.status === "possible").length}
          />
          <SummaryPill label="Nao lancados" value={missingCount} />
        </div>
        <ImportedRowsTable rows={rows} reconciled />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onImportMissing} disabled={saving || missingCount === 0}>
            {saving ? "Importando..." : `Criar ${missingCount} faltante(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function ImportedRowsTable({
  rows,
  reconciled = false,
}: {
  rows: Array<ImportedEntry | ReconciliationRow>;
  reconciled?: boolean;
}) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>Data</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th>Descricao</th>
            <th className="text-right">Valor</th>
            {reconciled && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.source}-${index}`} className="border-t border-border">
              <td className="px-3 py-2">{format(parseISO(row.date), "dd/MM/yyyy")}</td>
              <td className="px-3 py-2">{row.type === "receita" ? "Receita" : "Despesa"}</td>
              <td className="px-3 py-2">{row.category}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatBRL(row.amount)}</td>
              {reconciled && "status" in row && (
                <td className="px-3 py-2">
                  <ReconciliationBadge status={row.status} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReconciliationBadge({ status }: { status: ReconciliationRow["status"] }) {
  const map = {
    matched: { label: "Conciliado", cls: "border-success/40 text-success bg-success/5" },
    possible: { label: "Possivel", cls: "border-warning/40 text-warning bg-warning/5" },
    missing: {
      label: "Nao lancado",
      cls: "border-destructive/40 text-destructive bg-destructive/5",
    },
  }[status];

  return (
    <Badge variant="outline" className={map.cls}>
      {map.label}
    </Badge>
  );
}

function InterpretationCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{text}</div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
