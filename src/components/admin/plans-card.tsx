import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSubscriptionPlan,
  formatBRLPrecise,
  saveSubscriptionPlan,
  type SubscriptionPlan,
} from "@/lib/data";

export function PlansCard({ plans }: { plans: SubscriptionPlan[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [creating, setCreating] = useState(false);
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
      setEditing(null);
      setCreating(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar plano."),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success("Plano excluido.");
      setEditing(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao excluir plano."),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Planos de assinatura</h2>
          <p className="text-sm text-muted-foreground">Edite preço, promessa e disponibilidade.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Criar novo plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.slice(0, 3).map((plan) => (
          <Card key={plan.id} className="shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm font-semibold">{plan.name}</CardTitle>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setEditing(plan)}
                  aria-label={`Editar ${plan.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xl font-semibold">{formatBRLPrecise(plan.amount)}/mes</div>
              <p className="min-h-20 text-sm text-muted-foreground leading-relaxed">
                {plan.description || "Sem descricao comercial."}
              </p>
              <div className="text-xs text-muted-foreground">
                {plan.active ? "Ativo para novas lojas" : "Inativo para novas lojas"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanDialog
        open={creating}
        title="Criar novo plano"
        defaultSortOrder={plans.length + 1}
        pending={mutation.isPending}
        onOpenChange={setCreating}
        onSubmit={(payload) => mutation.mutate(payload)}
      />
      <PlanDialog
        open={Boolean(editing)}
        title="Editar plano"
        plan={editing}
        pending={mutation.isPending || deleteMutation.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={(payload) => mutation.mutate(payload)}
        onDelete={() => {
          if (!editing) return;
          const confirmed = window.confirm(`Excluir o plano "${editing.name}"?`);
          if (confirmed) deleteMutation.mutate(editing.id);
        }}
      />
    </>
  );
}

function PlanDialog({
  open,
  title,
  plan,
  defaultSortOrder,
  pending,
  onOpenChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  title: string;
  plan?: SubscriptionPlan | null;
  defaultSortOrder?: number;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FormData) => void;
  onDelete?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(new FormData(event.currentTarget));
          }}
        >
          {plan && <input type="hidden" name="id" value={plan.id} />}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px] gap-3">
            <Field label="Nome">
              <Input name="name" defaultValue={plan?.name || ""} required />
            </Field>
            <Field label="Mensalidade">
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={plan?.amount ?? ""}
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
          </div>
          <Field label="Descricao comercial">
            <Textarea
              name="description"
              defaultValue={plan?.description || ""}
              rows={6}
              placeholder="Beneficios, limites, suporte e promessa comercial do plano"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={plan?.active ?? true}
              className="h-4 w-4"
            />
            Ativo para novas lojas
          </label>
          <DialogFooter className="gap-2">
            {plan && (
              <Button type="button" variant="outline" className="mr-auto gap-2" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
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
