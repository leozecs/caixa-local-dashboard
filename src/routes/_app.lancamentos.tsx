import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Filter, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DESPESA_CATEGORIAS,
  RECEITA_CATEGORIAS,
  deleteEntry,
  formatBRLPrecise,
  getCurrentStore,
  listEntries,
  saveEntry,
  type Entry,
  type EntryType,
  type PaymentMethod,
} from "@/lib/data";

export const Route = createFileRoute("/_app/lancamentos")({
  head: () => ({ meta: [{ title: "Lançamentos — Caixa Local" }] }),
  component: LancamentosPage,
});

const PAYMENT_METHODS: PaymentMethod[] = ["Pix", "Cartão", "Dinheiro", "Boleto", "Transferência"];

function LancamentosPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [tab, setTab] = useState<EntryType>("receita");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: saveEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-dashboard"] });
      toast.success(editing ? "Lançamento atualizado." : "Lançamento adicionado.");
      setModalOpen(false);
      setEditing(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar lançamento."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entries-dashboard"] });
      toast.success("Lançamento removido.");
      setDeleting(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover lançamento."),
  });

  const filtered = useMemo(() => {
    return entries
      .filter((entry) => entry.type === tab)
      .filter((entry) => (filterCat === "todas" ? true : entry.category === filterCat))
      .filter((entry) =>
        search
          ? (entry.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
            entry.category.toLowerCase().includes(search.toLowerCase())
          : true,
      );
  }, [entries, tab, filterCat, search]);

  const total = filtered.reduce((sum, entry) => sum + entry.amount, 0);
  const categorias = tab === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada à sua conta.</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lançamentos"
        description="Cadastre vendas e despesas e mantenha o caixa atualizado."
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as EntryType);
          setFilterCat("todas");
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="receita">Receitas</TabsTrigger>
            <TabsTrigger value="despesa">Despesas</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 w-[180px] md:w-[220px]"
                placeholder="Buscar descrição..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="h-8 w-[160px]">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="shadow-none mt-4">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Carregando lançamentos...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyTable
                type={tab}
                onAdd={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Descrição</th>
                      <th>Pagamento</th>
                      <th className="text-right">Valor</th>
                      <th className="text-right w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {format(parseISO(entry.date), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-2.5">
                          <EntryBadge type={entry.type} />
                        </td>
                        <td className="px-4 py-2.5">{entry.category}</td>
                        <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[320px]">
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
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing(entry);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleting(entry)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-medium">
                      <td
                        colSpan={5}
                        className="px-4 py-2.5 text-right text-muted-foreground text-xs uppercase tracking-wide"
                      >
                        Total filtrado
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right tabular-nums",
                          tab === "receita" ? "text-success" : "text-destructive",
                        )}
                      >
                        {formatBRLPrecise(total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <EntryModal
        open={modalOpen}
        saving={saveMutation.isPending}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        defaultType={tab}
        storeId={store.id}
        entry={editing}
        onSave={(entry) => saveMutation.mutate(entry)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyTable({ type, onAdd }: { type: EntryType; onAdd: () => void }) {
  return (
    <div className="py-16 text-center px-6">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-3">
        <Plus className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">
        Nenhum lançamento de {type === "receita" ? "receita" : "despesa"}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Comece registrando o primeiro do período.
      </p>
      <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Adicionar
      </Button>
    </div>
  );
}

function EntryModal({
  open,
  saving,
  onOpenChange,
  defaultType,
  storeId,
  entry,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: EntryType;
  storeId: string;
  entry: Entry | null;
  onSave: (entry: Omit<Entry, "id"> & { id?: string }) => void;
}) {
  type EntryForm = Omit<Entry, "id"> & { id?: string };
  const [form, setForm] = useState<EntryForm>(() => makeInitialEntry(storeId, defaultType, entry));

  useMemo(() => {
    if (open) setForm(makeInitialEntry(storeId, defaultType, entry));
  }, [open, storeId, defaultType, entry]);

  const cats = form.type === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.amount || form.amount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>Registre uma receita ou despesa do caixa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: value as EntryType,
                    category: value === "receita" ? RECEITA_CATEGORIAS[0] : DESPESA_CATEGORIAS[0],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data">
              <Input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount || ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: Number(event.target.value) }))
                }
              />
            </Field>
            <Field label="Forma de pagamento">
              <Select
                value={form.paymentMethod}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, paymentMethod: value as PaymentMethod }))
                }
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
          </div>
          <Field label="Categoria">
            <Select
              value={form.category}
              onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cats.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição (opcional)">
            <Input
              value={form.description || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Ex: Vendas balcão, compra de grãos..."
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : entry ? "Salvar alterações" : "Adicionar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function makeInitialEntry(storeId: string, defaultType: EntryType, entry: Entry | null) {
  return entry
    ? { ...entry, date: entry.date.slice(0, 10) }
    : {
        storeId,
        date: new Date().toISOString().slice(0, 10),
        type: defaultType,
        category: defaultType === "receita" ? RECEITA_CATEGORIAS[0] : DESPESA_CATEGORIAS[0],
        paymentMethod: "Pix" as PaymentMethod,
        description: "",
        amount: 0,
      };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EntryBadge({ type }: { type: EntryType }) {
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
