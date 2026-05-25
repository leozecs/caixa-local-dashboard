import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  createStore,
  formatBRL,
  listStores,
  listSubscriptionPlans,
  updateStorePlan,
  type Plan,
  type StoreStatus,
  type SubscriptionPlan,
} from "@/lib/data";
import { RiskBadge } from "./_app.admin.index";

export const Route = createFileRoute("/_app/admin/lojas")({
  head: () => ({ meta: [{ title: "Lojas — Admin Caixa Local" }] }),
  component: AdminLojas,
});

function AdminLojas() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [creating, setCreating] = useState(false);
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores"], queryFn: listStores });
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans", "active"],
    queryFn: () => listSubscriptionPlans({ activeOnly: true }),
  });
  const mutation = useMutation({
    mutationFn: createStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Loja cadastrada.");
      setCreating(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar loja."),
  });
  const planMutation = useMutation({
    mutationFn: updateStorePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["current-store"] });
      toast.success("Plano da loja atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar plano."),
  });

  const filtered = useMemo(() => {
    return stores
      .filter((store) => (status === "todos" ? true : store.status === status))
      .filter((store) =>
        q
          ? store.name.toLowerCase().includes(q.toLowerCase()) ||
            store.owner.toLowerCase().includes(q.toLowerCase())
          : true,
      );
  }, [q, status, stores]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lojas"
        description={`${stores.length} estabelecimentos no Caixa Local.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 w-[220px]"
                placeholder="Buscar loja ou dono..."
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nova loja
            </Button>
          </div>
        }
      />

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Loja</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Plano</th>
                  <th>Último acesso</th>
                  <th className="text-right">Faturamento</th>
                  <th>Risco</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {store.segment} · {store.city}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{store.owner}</td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={store.status}
                        disabled={planMutation.isPending}
                        onValueChange={(value) =>
                          planMutation.mutate({
                            storeId: store.id,
                            plan: store.plan,
                            status: value as StoreStatus,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[128px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="ativa">Ativa</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={store.plan}
                        disabled={planMutation.isPending}
                        onValueChange={(value) =>
                          planMutation.mutate({
                            storeId: store.id,
                            plan: value,
                            status: store.status,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.name}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {store.lastAccess
                        ? formatDistanceToNow(parseISO(store.lastAccess), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "Sem acesso"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {formatBRL(store.monthRevenue)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RiskBadge risk={store.risk} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link to="/dashboard">
                          <Eye className="h-3.5 w-3.5" /> Ver loja
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma loja encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateStoreDialog
        open={creating}
        plans={plans}
        saving={mutation.isPending}
        onOpenChange={setCreating}
        onSubmit={(data) => mutation.mutate(data)}
      />
    </div>
  );
}

function CreateStoreDialog({
  open,
  plans,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  plans: SubscriptionPlan[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    owner: string;
    email: string;
    password: string;
    segment: string;
    city: string;
    plan: Plan;
    status: StoreStatus;
    cnpj?: string | null;
  }) => void;
}) {
  const defaultPlan = plans[0]?.name || "Trial";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar loja</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onSubmit({
              name: String(form.get("name") || ""),
              owner: String(form.get("owner") || ""),
              email: String(form.get("email") || ""),
              password: String(form.get("password") || ""),
              segment: String(form.get("segment") || ""),
              city: String(form.get("city") || "Vinhedo/SP"),
              plan: String(form.get("plan") || defaultPlan) as Plan,
              status: String(form.get("status") || "trial") as StoreStatus,
              cnpj: String(form.get("cnpj") || "") || null,
            });
          }}
        >
          <Field label="Nome">
            <Input name="name" required />
          </Field>
          <Field label="Responsável">
            <Input name="owner" required />
          </Field>
          <Field label="E-mail de acesso">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Senha inicial">
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field label="Segmento">
            <Input name="segment" required />
          </Field>
          <Field label="Cidade">
            <Input name="city" defaultValue="Vinhedo/SP" required />
          </Field>
          <Field label="Plano">
            <Select name="plan" defaultValue={defaultPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.name}>
                    {plan.name} {plan.amount > 0 ? `- ${formatBRL(plan.amount)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="trial">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="CNPJ">
            <Input name="cnpj" />
          </Field>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
