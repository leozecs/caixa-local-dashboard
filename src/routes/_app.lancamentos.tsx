import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ExternalLink,
  Filter,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MetricCard } from "@/components/metric-card";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DESPESA_CATEGORIAS,
  RECEITA_CATEGORIAS,
  deleteEntry,
  deleteEntryAttachment,
  formatBRL,
  formatBRLPrecise,
  getCurrentStore,
  listEntryAttachments,
  listEntries,
  listStoreAttendants,
  listStoreCategories,
  openEntryAttachment,
  saveEntry,
  uploadEntryAttachment,
  type Entry,
  type EntryAttachment,
  type EntryType,
  type PaymentMethod,
  type StoreAttendant,
} from "@/lib/data";

export const Route = createFileRoute("/_app/lancamentos")({
  head: () => ({ meta: [{ title: "Lancamentos - Caixa Local" }] }),
  component: LancamentosPage,
});

const PAYMENT_METHODS: PaymentMethod[] = ["Pix", "Cartão", "Dinheiro", "Boleto", "Transferência"];
function LancamentosPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingType, setCreatingType] = useState<EntryType>("receita");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [attachmentEntry, setAttachmentEntry] = useState<Entry | null>(null);

  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["entries", store?.id],
    queryFn: () => listEntries(store!.id, "2000-01-01", "2100-01-01"),
    enabled: Boolean(store?.id),
  });
  const { data: storeCategories = [] } = useQuery({
    queryKey: ["store-categories", store?.id],
    queryFn: () => listStoreCategories(store!.id),
    enabled: Boolean(store?.id),
  });
  const { data: attendants = [] } = useQuery({
    queryKey: ["store-attendants", store?.id],
    queryFn: () => listStoreAttendants(store!.id),
    enabled: Boolean(store?.id),
  });

  const saveMutation = useMutation({
    mutationFn: saveEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["store-operational-alerts"] });
      toast.success(editing ? "Lancamento atualizado." : "Lancamento adicionado.");
      setModalOpen(false);
      setEditing(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar lancamento."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["store-operational-alerts"] });
      toast.success("Lancamento removido.");
      setDeleting(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover lancamento."),
  });

  const filtered = useMemo(() => {
    return entries
      .filter((entry) => (filterCat === "todas" ? true : entry.category === filterCat))
      .filter((entry) =>
        search
          ? (entry.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
            entry.category.toLowerCase().includes(search.toLowerCase()) ||
            (entry.salespersonName ?? "").toLowerCase().includes(search.toLowerCase())
          : true,
      );
  }, [entries, filterCat, search]);

  const receitaCategories = useMemo(
    () => storeCategories.filter((category) => category.type === "receita").map((category) => category.name),
    [storeCategories],
  );
  const despesaCategories = useMemo(
    () => storeCategories.filter((category) => category.type === "despesa").map((category) => category.name),
    [storeCategories],
  );
  const allCategories = useMemo(
    () => Array.from(new Set([...receitaCategories, ...despesaCategories])),
    [despesaCategories, receitaCategories],
  );
  const modalReceitaCategories = useMemo(
    () => (receitaCategories.length ? receitaCategories : [...RECEITA_CATEGORIAS]),
    [receitaCategories],
  );
  const modalDespesaCategories = useMemo(
    () => (despesaCategories.length ? despesaCategories : [...DESPESA_CATEGORIAS]),
    [despesaCategories],
  );

  const receitas = filtered.filter((entry) => entry.type === "receita");
  const despesas = filtered.filter((entry) => entry.type === "despesa");
  const totalReceitas = receitas.reduce((sum, entry) => sum + entry.amount, 0);
  const totalDespesas = despesas.reduce((sum, entry) => sum + entry.amount, 0);
  const saldo = totalReceitas - totalDespesas;

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;
  const canManageEntries = store.memberRole !== "atendente";

  function openCreate(type: EntryType) {
    setEditing(null);
    setCreatingType(type);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lancamentos"
        description="Receitas e despesas na mesma tela para fechar o caixa sem trocar de aba."
        actions={
          <Button size="sm" className="gap-2" onClick={() => openCreate("receita")}>
            <Plus className="h-4 w-4" /> Novo lancamento
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Total de receitas" value={formatBRL(totalReceitas)} accent="success" />
        <MetricCard label="Total de despesas" value={formatBRL(totalDespesas)} accent="expense" />
        <MetricCard
          label="Saldo do periodo"
          value={formatBRL(saldo)}
          hint={saldo >= 0 ? "Caixa positivo" : "Caixa negativo"}
          accent={saldo >= 0 ? "success" : "expense"}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Use o filtro para conferir categorias especificas sem esconder receitas ou despesas.
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 w-[180px] md:w-[220px]"
              placeholder="Buscar descricao..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="h-8 w-[170px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {allCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <EntriesTable
          title="Receitas"
          type="receita"
          entries={receitas}
          isLoading={isLoading}
          onAdd={() => openCreate("receita")}
          canManage={canManageEntries}
          onEdit={(entry) => {
            setEditing(entry);
            setCreatingType(entry.type);
            setModalOpen(true);
          }}
          onDelete={setDeleting}
          onAttachments={setAttachmentEntry}
        />
        <EntriesTable
          title="Despesas"
          type="despesa"
          entries={despesas}
          isLoading={isLoading}
          onAdd={() => openCreate("despesa")}
          canManage={canManageEntries}
          onEdit={(entry) => {
            setEditing(entry);
            setCreatingType(entry.type);
            setModalOpen(true);
          }}
          onDelete={setDeleting}
          onAttachments={setAttachmentEntry}
        />
      </div>

      <EntryModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        entry={editing}
        storeId={store.id}
        defaultCommissionPercent={store.defaultCommissionPercent}
        attendants={attendants}
        receitaCategories={modalReceitaCategories}
        despesaCategories={modalDespesaCategories}
        defaultType={creatingType}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        pending={saveMutation.isPending}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lancamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove o lancamento do caixa e dos relatorios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttachmentsDialog
        entry={attachmentEntry}
        onOpenChange={(open) => !open && setAttachmentEntry(null)}
      />
    </div>
  );
}

function EntriesTable({
  title,
  type,
  entries,
  isLoading,
  onAdd,
  canManage,
  onEdit,
  onDelete,
  onAttachments,
}: {
  title: string;
  type: EntryType;
  entries: Entry[];
  isLoading: boolean;
  onAdd: () => void;
  canManage: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onAttachments: (entry: Entry) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <div className="text-xs text-muted-foreground">{entries.length} lancamentos</div>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando lancamentos...
          </div>
        ) : entries.length === 0 ? (
          <EmptyTable type={type} onAdd={onAdd} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Responsavel</th>
                  <th>Descricao</th>
                  <th className="text-right">Comissao</th>
                  <th className="text-right">Valor</th>
                  {canManage && <th className="text-right w-[88px]">Acoes</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {format(parseISO(entry.date), "dd/MM/yyyy")}
                    </td>
                    <td className="px-3 py-2.5">{entry.category}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {entry.type === "receita" ? entry.salespersonName || "-" : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[220px]">
                      {entry.isRecurring ? "Recorrente - " : ""}
                      {entry.description || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                      {entry.type === "receita" && entry.commissionAmount
                        ? formatBRLPrecise(entry.commissionAmount)
                        : "-"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right font-medium tabular-nums",
                        entry.type === "receita" ? "text-success" : "text-destructive",
                      )}
                    >
                      {entry.type === "receita" ? "+" : "-"} {formatBRLPrecise(entry.amount)}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onAttachments(entry)}
                            aria-label="Comprovantes"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onDelete(entry)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyTable({ type, onAdd }: { type: EntryType; onAdd: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center">
        <Plus className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-sm font-medium">
        Nenhum lancamento de {type === "receita" ? "receita" : "despesa"}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        Comece registrando o primeiro valor do periodo.
      </div>
      <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Adicionar
      </Button>
    </div>
  );
}

function EntryBadge({ type }: { type: EntryType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 text-[11px] font-normal",
        type === "receita"
          ? "bg-success/10 text-success border-success/30"
          : "bg-destructive/10 text-destructive border-destructive/30",
      )}
    >
      {type === "receita" ? "Receita" : "Despesa"}
    </Badge>
  );
}

function EntryModal({
  open,
  onOpenChange,
  entry,
  storeId,
  defaultCommissionPercent,
  attendants,
  receitaCategories,
  despesaCategories,
  defaultType,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
  storeId: string;
  defaultCommissionPercent: number;
  attendants: StoreAttendant[];
  receitaCategories: string[];
  despesaCategories: string[];
  defaultType: EntryType;
  onSubmit: (entry: Entry) => void;
  pending: boolean;
}) {
  const [type, setType] = useState<EntryType>(entry?.type || defaultType);
  const [category, setCategory] = useState(entry?.category || RECEITA_CATEGORIAS[0]);
  const [date, setDate] = useState(
    entry?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(entry?.description || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(entry?.paymentMethod || "Pix");
  const [amount, setAmount] = useState(entry?.amount ? String(entry.amount) : "");
  const [salespersonName, setSalespersonName] = useState(entry?.salespersonName || "");
  const [commissionPercent, setCommissionPercent] = useState(
    String(entry?.commissionPercent ?? defaultCommissionPercent),
  );
  const [isRecurring, setIsRecurring] = useState(Boolean(entry?.isRecurring));
  const findSalesperson = (value: string) =>
    attendants.find((attendant) => attendant.id === value || attendant.name === value);
  const updateSalesperson = (attendantId: string) => {
    const matched = findSalesperson(attendantId);
    setSalespersonName(matched?.name || "");
    if (matched) setCommissionPercent(String(matched.commissionPercent));
  };

  useEffect(() => {
    if (!open) return;
    const nextType = entry?.type || defaultType;
    setType(nextType);
    setCategory(entry?.category || (nextType === "receita" ? receitaCategories[0] : despesaCategories[0]));
    setDate(entry?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setDescription(entry?.description || "");
    setPaymentMethod(entry?.paymentMethod || "Pix");
    setAmount(entry?.amount ? String(entry.amount) : "");
    const matched = entry?.salespersonName ? findSalesperson(entry.salespersonName) : null;
    setSalespersonName(matched?.name || "");
    setCommissionPercent(
      String(entry?.commissionPercent ?? matched?.commissionPercent ?? defaultCommissionPercent),
    );
    setIsRecurring(Boolean(entry?.isRecurring));
  }, [entry, defaultType, defaultCommissionPercent, despesaCategories, receitaCategories, attendants, open]);

  const categories = type === "receita" ? receitaCategories : despesaCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar lancamento" : "Novo lancamento"}</DialogTitle>
          <DialogDescription>Registre uma entrada ou saida do caixa.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              id: entry?.id || "",
              storeId,
              type,
              category,
              date,
              description,
              paymentMethod,
              amount: Number(amount),
              salespersonName,
              commissionPercent: type === "receita" ? Number(commissionPercent) : null,
              isRecurring,
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select
                value={type}
                onValueChange={(value) => {
                  const nextType = value as EntryType;
                  setType(nextType);
                  setCategory(nextType === "receita" ? receitaCategories[0] : despesaCategories[0]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">
                    <EntryBadge type="receita" />
                  </SelectItem>
                  <SelectItem value="despesa">
                    <EntryBadge type="despesa" />
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {type === "receita" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Responsavel pela venda">
                <Select
                  value={findSalesperson(salespersonName)?.id || ""}
                  onValueChange={updateSalesperson}
                  disabled={!attendants.length}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        attendants.length
                          ? "Selecione o atendente"
                          : "Cadastre um atendente em Configuracoes"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {attendants.map((attendant) => (
                      <SelectItem key={attendant.id} value={attendant.id}>
                        {attendant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Comissao (%)">
                <Input
                  type="number"
                  value={commissionPercent}
                  readOnly
                  className="bg-muted"
                />
              </Field>
            </div>
          )}
          <Field label="Descricao">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex: cortes do dia, aluguel, fornecedor..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pagamento">
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            Lancamento recorrente
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending || Number(amount) <= 0 || (type === "receita" && !salespersonName)}
            >
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentsDialog({
  entry,
  onOpenChange,
}: {
  entry: Entry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["entry-attachments", entry?.id],
    queryFn: () => listEntryAttachments(entry!.id),
    enabled: Boolean(entry?.id),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadEntryAttachment({ storeId: entry!.storeId, entryId: entry!.id, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-attachments", entry?.id] });
      toast.success("Comprovante anexado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao anexar comprovante."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntryAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-attachments", entry?.id] });
      toast.success("Comprovante removido.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover comprovante."),
  });

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprovantes</DialogTitle>
          <DialogDescription>
            Anexe recibos, notas ou comprovantes relacionados a este lancamento.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? "Enviando..." : "Anexar comprovante"}
        </Button>
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando comprovantes...</div>
          ) : attachments.length ? (
            attachments.map((attachment) => (
              <AttachmentRow
                key={attachment.id}
                attachment={attachment}
                deleting={deleteMutation.isPending}
                onOpen={() => openEntryAttachment(attachment)}
                onDelete={() => deleteMutation.mutate(attachment)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum comprovante anexado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentRow({
  attachment,
  deleting,
  onOpen,
  onDelete,
}: {
  attachment: EntryAttachment;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
      <Paperclip className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{attachment.fileName}</div>
        <div className="text-xs text-muted-foreground">
          {(attachment.fileSize / 1024).toFixed(1)} KB
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onOpen} aria-label="Abrir comprovante">
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        disabled={deleting}
        onClick={onDelete}
        aria-label="Remover comprovante"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
