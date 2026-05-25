import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, saveSubscriptionPlan, type SubscriptionPlan } from "@/lib/data";

export function PlansCard({ plans }: { plans: SubscriptionPlan[] }) {
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
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
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
        <PlanForm
          title="Novo plano"
          submitLabel="Criar"
          defaultSortOrder={plans.length + 1}
          pending={mutation.isPending}
          onSubmit={(payload) => mutation.mutate(payload)}
        />

        <div className="space-y-2">
          {plans.map((plan) => (
            <PlanForm
              key={plan.id}
              plan={plan}
              title="Editar plano"
              submitLabel="Salvar"
              pending={mutation.isPending}
              onSubmit={(payload) => mutation.mutate(payload)}
            />
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

function PlanForm({
  plan,
  title,
  submitLabel,
  defaultSortOrder,
  pending,
  onSubmit,
}: {
  plan?: SubscriptionPlan;
  title: string;
  submitLabel: string;
  defaultSortOrder?: number;
  pending: boolean;
  onSubmit: (payload: FormData) => void;
}) {
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-[1fr_130px_90px_auto] gap-3 items-end rounded-md border border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
        if (!plan) event.currentTarget.reset();
      }}
    >
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <Field label={title}>
        <Input name="name" defaultValue={plan?.name || ""} placeholder="Ex: Essencial" required />
      </Field>
      <Field label="Mensalidade">
        <Input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={plan?.amount ?? ""}
          placeholder="99.99"
          required
        />
      </Field>
      <Field label="Ordem">
        <Input
          name="sortOrder"
          type="number"
          min="0"
          step="1"
          defaultValue={plan?.sortOrder ?? defaultSortOrder ?? 0}
        />
      </Field>
      <Button type="submit" size="sm" className="gap-2" disabled={pending}>
        {!plan && <Plus className="h-4 w-4" />}
        {submitLabel}
      </Button>
      <div className="md:col-span-4">
        <Textarea
          name="description"
          defaultValue={plan?.description || ""}
          placeholder="Beneficios, limites, suporte e promessa comercial do plano"
          rows={4}
        />
      </div>
      <label className="md:col-span-4 flex items-center gap-2 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={plan?.active ?? true}
          className="h-4 w-4"
        />
        Ativo para novas lojas
      </label>
      {plan && (
        <div className="md:col-span-4 text-xs text-muted-foreground">
          Valor atual: {formatBRL(plan.amount)}
        </div>
      )}
    </form>
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
