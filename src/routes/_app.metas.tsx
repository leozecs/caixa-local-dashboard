import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { isSameMonth, parseISO, startOfMonth } from "date-fns";
import { Target as TargetIcon, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MOCK_ENTRIES, STORE_GOALS, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas — Caixa Local" }] }),
  component: MetasPage,
});

function MetasPage() {
  const [goals, setGoals] = useState(STORE_GOALS);

  const now = startOfMonth(new Date());
  const stats = useMemo(() => {
    const curr = MOCK_ENTRIES.filter((e) => isSameMonth(parseISO(e.date), now));
    const rev = curr.filter((e) => e.type === "receita").reduce((a, b) => a + b.amount, 0);
    const exp = curr.filter((e) => e.type === "despesa").reduce((a, b) => a + b.amount, 0);
    const margin = rev > 0 ? ((rev - exp) / rev) * 100 : 0;
    return { rev, exp, margin };
  }, [now]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Metas atualizadas para o mês.");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Metas do mês"
        description="Defina objetivos claros e acompanhe o progresso em tempo real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <GoalCard
          label="Faturamento"
          current={stats.rev}
          target={goals.revenue}
          format={(v) => formatBRL(v)}
          better="higher"
          icon={TrendingUp}
        />
        <GoalCard
          label="Margem mínima"
          current={stats.margin}
          target={goals.margin}
          format={(v) => `${v.toFixed(1)}%`}
          better="higher"
          icon={TargetIcon}
        />
        <GoalCard
          label="Limite de despesas"
          current={stats.exp}
          target={goals.maxExpenses}
          format={(v) => formatBRL(v)}
          better="lower"
          icon={TrendingDown}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ajustar metas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Meta de faturamento (R$)</Label>
              <Input
                type="number" min="0" step="100"
                value={goals.revenue}
                onChange={(e) => setGoals((g) => ({ ...g, revenue: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Margem mínima (%)</Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={goals.margin}
                onChange={(e) => setGoals((g) => ({ ...g, margin: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Limite de despesas (R$)</Label>
              <Input
                type="number" min="0" step="100"
                value={goals.maxExpenses}
                onChange={(e) => setGoals((g) => ({ ...g, maxExpenses: Number(e.target.value) }))}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" size="sm" className="gap-2">
                <Save className="h-4 w-4" /> Salvar metas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalCard({
  label, current, target, format, better, icon: Icon,
}: {
  label: string;
  current: number;
  target: number;
  format: (v: number) => string;
  better: "higher" | "lower";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const progress = better === "higher" ? (current / target) * 100 : (current / target) * 100;
  const onTrack = better === "higher" ? current >= target * 0.85 : current <= target * 0.9;
  const exceeded = better === "higher" ? current >= target : current <= target;

  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums">{format(current)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Meta {better === "higher" ? "≥" : "≤"} {format(target)}
            </div>
          </div>
          <div className="h-8 w-8 rounded-md bg-muted grid place-items-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="mt-4">
          <Progress
            value={Math.min(100, progress)}
            className={cn("h-1.5", !onTrack && "[&>div]:bg-warning", exceeded && better === "higher" && "[&>div]:bg-success")}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{progress.toFixed(0)}% do alvo</span>
            <span className={cn(
              "inline-flex items-center gap-1 font-medium",
              onTrack ? "text-success" : "text-warning"
            )}>
              {onTrack ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {onTrack
                ? better === "higher" ? "No ritmo certo" : "Despesa controlada"
                : better === "higher" ? "Precisa acelerar" : "Atenção ao gasto"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
