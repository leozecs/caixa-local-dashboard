import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth";
import {
  formatBRL,
  getCurrentStore,
  listSubscriptionPlans,
  saveSubscriptionPlan,
  updateStore,
  type SubscriptionPlan,
} from "@/lib/data";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Caixa Local" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });
  const isOwner = session?.role === "owner";
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => listSubscriptionPlans(),
    enabled: Boolean(isOwner),
  });

  const mutation = useMutation({
    mutationFn: (payload: FormData) =>
      updateStore(store!.id, {
        name: String(payload.get("name") || ""),
        owner: String(payload.get("owner") || ""),
        segment: String(payload.get("segment") || ""),
        city: String(payload.get("city") || ""),
        cnpj: String(payload.get("cnpj") || "") || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-store"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success("Dados da loja atualizados.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar loja."),
  });

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada à sua conta.</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Configurações"
        description="Dados da loja, equipe e preferências de notificação."
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Dados da loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(new FormData(event.currentTarget));
            }}
          >
            <Field label="Nome do estabelecimento">
              <Input name="name" defaultValue={store.name} />
            </Field>
            <Field label="Responsável">
              <Input name="owner" defaultValue={store.owner} />
            </Field>
            <Field label="Segmento">
              <Input name="segment" defaultValue={store.segment} />
            </Field>
            <Field label="Cidade">
              <Input name="city" defaultValue={store.city} />
            </Field>
            <div className="space-y-1.5 md:col-span-2">
              <Label>CNPJ</Label>
              <Input name="cnpj" defaultValue={store.cnpj || ""} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" className="gap-2" disabled={mutation.isPending}>
                <Save className="h-4 w-4" /> {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isOwner && <PlansCard plans={plans} />}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Notificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Alerta diário de fechamento"
            hint="Resumo do caixa às 19h por WhatsApp."
            defaultChecked
          />
          <Separator />
          <ToggleRow
            label="Aviso de meta atrasada"
            hint="Notifica quando a meta do mês não está no ritmo."
            defaultChecked
          />
          <Separator />
          <ToggleRow
            label="Aviso de despesa alta"
            hint="Alerta quando despesas superam 85% do limite."
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Caixa Local {store.plan}</div>
              <div className="text-xs text-muted-foreground">Status atual: {store.status}</div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Gerenciado pelo admin
            </Button>
          </div>
        </CardContent>
      </Card>
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

function PlansCard({ plans }: { plans: SubscriptionPlan[] }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: FormData) =>
      saveSubscriptionPlan({
        id: String(payload.get("id") || "") || undefined,
        name: String(payload.get("name") || ""),
        amount: Number(payload.get("amount") || 0),
        description: String(payload.get("description") || "") || null,
        active: payload.has("active"),
        sortOrder: Number(payload.get("sortOrder") || 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Plano salvo.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar plano."),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Planos de assinatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-[1fr_120px_90px_auto] gap-3 items-end rounded-md border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <Field label="Novo plano">
            <Input name="name" placeholder="Ex: Essencial" required />
          </Field>
          <Field label="Mensalidade">
            <Input name="amount" type="number" min="0" step="0.01" placeholder="99.00" required />
          </Field>
          <Field label="Ordem">
            <Input name="sortOrder" type="number" min="0" step="1" defaultValue={plans.length} />
          </Field>
          <Button type="submit" size="sm" className="gap-2" disabled={mutation.isPending}>
            <Plus className="h-4 w-4" /> Criar
          </Button>
          <div className="md:col-span-4">
            <Input name="description" placeholder="Descricao curta do plano" />
          </div>
          <label className="md:col-span-4 flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked className="h-4 w-4" />
            Ativo para novas lojas
          </label>
        </form>

        <div className="space-y-2">
          {plans.map((plan) => (
            <form
              key={plan.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_120px_90px_auto] gap-3 items-end rounded-md border border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate(new FormData(event.currentTarget));
              }}
            >
              <input type="hidden" name="id" value={plan.id} />
              <Field label="Nome">
                <Input name="name" defaultValue={plan.name} required />
              </Field>
              <Field label="Mensalidade">
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={plan.amount}
                  required
                />
              </Field>
              <Field label="Ordem">
                <Input
                  name="sortOrder"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={plan.sortOrder}
                />
              </Field>
              <Button type="submit" size="sm" variant="outline" disabled={mutation.isPending}>
                Salvar
              </Button>
              <div className="md:col-span-3">
                <Input
                  name="description"
                  defaultValue={plan.description || ""}
                  placeholder="Descricao curta do plano"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={plan.active}
                  className="h-4 w-4"
                />
                Ativo
              </label>
              <div className="md:col-span-4 text-xs text-muted-foreground">
                Valor atual: {formatBRL(plan.amount)}
              </div>
            </form>
          ))}
          {!plans.length && (
            <div className="rounded-md border border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum plano cadastrado.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  defaultChecked,
}: {
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
