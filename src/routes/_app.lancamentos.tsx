import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Pencil, Trash2, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import {
  MOCK_ENTRIES,
  RECEITA_CATEGORIAS,
  DESPESA_CATEGORIAS,
  formatBRLPrecise,
  type Entry,
  type EntryType,
  type PaymentMethod,
} from "@/lib/mock-data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lancamentos")({
  head: () => ({ meta: [{ title: "Lançamentos — Caixa Local" }] }),
  component: LancamentosPage,
});

const PAYMENT_METHODS: PaymentMethod[] = ["Pix", "Cartão", "Dinheiro", "Boleto", "Transferência"];

function LancamentosPage() {
  const [entries, setEntries] = useState<Entry[]>(MOCK_ENTRIES);
  const [tab, setTab] = useState<EntryType>("receita");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => e.type === tab)
      .filter((e) => (filterCat === "todas" ? true : e.category === filterCat))
      .filter((e) =>
        search
          ? (e.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
            e.category.toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [entries, tab, filterCat, search]);

  const total = filtered.reduce((a, b) => a + b.amount, 0);

  function handleSave(entry: Entry) {
    setEntries((prev) => {
      const idx = prev.findIndex((p) => p.id === entry.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      return [entry, ...prev];
    });
    toast.success(editing ? "Lançamento atualizado." : "Lançamento adicionado.");
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Lançamento removido.");
    setDeleting(null);
  }

  const categorias = tab === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lançamentos"
        description="Cadastre vendas e despesas e mantenha o caixa atualizado."
        actions={
          <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as EntryType); setFilterCat("todas"); }}>
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
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="h-8 w-[160px]">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="shadow-none mt-4">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyTable type={tab} onAdd={() => { setEditing(null); setModalOpen(true); }} />
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
                    {filtered.map((e) => (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-muted-foreground">{format(parseISO(e.date), "dd/MM/yyyy")}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={cn(
                            "h-5 px-1.5 font-normal text-[11px]",
                            e.type === "receita" ? "border-success/40 text-success" : "border-destructive/30 text-destructive"
                          )}>
                            {e.type === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">{e.category}</td>
                        <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[320px]">{e.description}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{e.paymentMethod}</td>
                        <td className={cn(
                          "px-4 py-2.5 text-right font-medium tabular-nums",
                          e.type === "receita" ? "text-success" : "text-destructive"
                        )}>
                          {e.type === "receita" ? "+" : "−"} {formatBRLPrecise(e.amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(e); setModalOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(e)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-medium">
                      <td colSpan={5} className="px-4 py-2.5 text-right text-muted-foreground text-xs uppercase tracking-wide">Total filtrado</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums", tab === "receita" ? "text-success" : "text-destructive")}>
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
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        defaultType={tab}
        entry={editing}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento {deleting && (
                <span className="font-medium text-foreground">"{deleting.description || deleting.category}"</span>
              )} será excluído do caixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && handleDelete(deleting.id)}
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
      <div className="text-sm font-medium">Nenhum lançamento de {type === "receita" ? "receita" : "despesa"}</div>
      <p className="text-sm text-muted-foreground mt-1">Comece registrando o primeiro do período.</p>
      <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Adicionar
      </Button>
    </div>
  );
}

function EntryModal({
  open, onOpenChange, defaultType, entry, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType: EntryType;
  entry: Entry | null;
  onSave: (e: Entry) => void;
}) {
  const [form, setForm] = useState<Entry>(() =>
    entry ?? {
      id: `new-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: defaultType,
      category: defaultType === "receita" ? RECEITA_CATEGORIAS[0] : DESPESA_CATEGORIAS[0],
      paymentMethod: "Pix",
      description: "",
      amount: 0,
    }
  );

  // Reset when opening
  useMemo(() => {
    if (open) {
      setForm(
        entry ?? {
          id: `new-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: defaultType,
          category: defaultType === "receita" ? RECEITA_CATEGORIAS[0] : DESPESA_CATEGORIAS[0],
          paymentMethod: "Pix",
          description: "",
          amount: 0,
        }
      );
    }
  }, [open, entry, defaultType]);

  const cats = form.type === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    onSave({
      ...form,
      date: new Date(form.date).toISOString(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>
            Registre uma receita ou despesa do caixa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    type: v as EntryType,
                    category: v === "receita" ? RECEITA_CATEGORIAS[0] : DESPESA_CATEGORIAS[0],
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date.slice(0, 10)}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount || ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v as PaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Vendas balcão, compra de grãos..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{entry ? "Salvar alterações" : "Adicionar lançamento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
