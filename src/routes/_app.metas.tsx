import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { isSameMonth, parseISO, startOfMonth } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Save,
  Target as TargetIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/auth";
import {
  formatBRL,
  getCurrentStore,
  getGoals,
  listEntries,
  saveGoals,
  type Goals,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas - Caixa Local" }] }),
  component: MetasPage,
});

function MetasPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [formGoals, setFormGoals] = useState<Goals>({ revenue: 0, margin: 0, maxExpenses: 0 });
  const now = startOfMonth(new Date());

  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", store?.id, now.toISOString()],
    queryFn: () => getGoals(store!.id, now),
    enabled: Boolean(store?.id),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries", store?.id],
    queryFn: () => listEntries(store!.id, "2000-01-01", "2100-01-01"),
    enabled: Boolean(store?.id),
  });

  useEffect(() => {
    if (goals) setFormGoals(goals);
  }, [goals]);

  const mutation = useMutation({
    mutationFn: () => saveGoals(store!.id, formGoals, now),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["store-operational-alerts"] });
      toast.success("Metas atualizadas para o mes.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar metas."),
  });

  const stats = useMemo(() => {
    const curr = entries.filter((entry) => isSameMonth(parseISO(entry.date), now));
    const rev = curr
      .filter((entry) => entry.type === "receita")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const exp = curr
      .filter((entry) => entry.type === "despesa")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const margin = rev > 0 ? ((rev - exp) / rev) * 100 : 0;
    return { rev, exp, margin };
  }, [entries, now]);

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Metas do mes"
        description="Comece vazio: defina as metas que fazem sentido para a rotina da sua loja."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <GoalCard
          label="Faturamento"
          current={stats.rev}
          target={formGoals.revenue}
          format={formatBRL}
          better="higher"
          icon={TrendingUp}
        />
        <GoalCard
          label="Margem minima"
          current={stats.margin}
          target={formGoals.margin}
          format={(value) => `${value.toFixed(1)}%`}
          better="higher"
          icon={TargetIcon}
        />
        <GoalCard
          label="Limite de despesas"
          current={stats.exp}
          target={formGoals.maxExpenses}
          format={formatBRL}
          better="lower"
          icon={TrendingDown}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ajustar metas</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Field label="Meta de faturamento (R$)">
              <Input
                type="number"
                min="0"
                step="100"
                value={formGoals.revenue}
                onChange={(event) =>
                  setFormGoals((current) => ({ ...current, revenue: Number(event.target.value) }))
                }
              />
            </Field>
            <Field label="Margem minima (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formGoals.margin}
                onChange={(event) =>
                  setFormGoals((current) => ({ ...current, margin: Number(event.target.value) }))
                }
              />
            </Field>
            <Field label="Limite de despesas (R$)">
              <Input
                type="number"
                min="0"
                step="100"
                value={formGoals.maxExpenses}
                onChange={(event) =>
                  setFormGoals((current) => ({
                    ...current,
                    maxExpenses: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" size="sm" className="gap-2" disabled={mutation.isPending}>
                <Save className="h-4 w-4" /> {mutation.isPending ? "Salvando..." : "Salvar metas"}
              </Button>
            </div>
          </form>
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

function GoalCard({
  label,
  current,
  target,
  format,
  better,
  icon: Icon,
}: {
  label: string;
  current: number;
  target: number;
  format: (value: number) => string;
  better: "higher" | "lower";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const configured = target > 0;
  const progress = configured ? (current / target) * 100 : 0;
  const onTrack = better === "higher" ? current >= target * 0.85 : current <= target * 0.9;
  const exceeded = better === "higher" ? current >= target : current <= target;

  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums">{format(current)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {configured
                ? `Meta ${better === "higher" ? ">=" : "<="} ${format(target)}`
                : "Sem meta definida"}
            </div>
          </div>
          <div className="h-8 w-8 rounded-md bg-muted grid place-items-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-4">
          <Progress
            value={Math.min(100, progress)}
            className={cn(
              "h-1.5",
              configured && !onTrack && "[&>div]:bg-warning",
              configured && exceeded && better === "higher" && "[&>div]:bg-success",
            )}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {configured ? `${progress.toFixed(0)}% do alvo` : "Configure uma meta"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                configured && onTrack ? "text-success" : "text-warning",
              )}
            >
              {configured && onTrack ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {!configured
                ? "Aguardando meta"
                : onTrack
                  ? better === "higher"
                    ? "No ritmo certo"
                    : "Despesa controlada"
                  : better === "higher"
                    ? "Precisa acelerar"
                    : "Atencao ao gasto"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
