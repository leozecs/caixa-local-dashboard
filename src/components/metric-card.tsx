import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  label: string;
  value: string;
  hint?: string;
  delta?: number; // percent
  icon?: LucideIcon;
  accent?: "default" | "success" | "expense" | "info" | "warning";
}

export function MetricCard({ label, value, hint, delta, icon: Icon, accent = "default" }: Props) {
  const accentTextCls = {
    default: "text-foreground",
    success: "text-success",
    expense: "text-destructive",
    info: "text-info",
    warning: "text-warning",
  }[accent];
  const accentBarCls = {
    default: "bg-foreground/10",
    success: "bg-success/15",
    expense: "bg-destructive/15",
    info: "bg-info/15",
    warning: "bg-warning/20",
  }[accent];

  return (
    <Card className="group overflow-hidden border-border/80 shadow-none hover:border-ring/25">
      <CardContent className="relative p-4">
        <div className={cn("absolute inset-x-0 top-0 h-0.5", accentBarCls)} />
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
          {Icon && (
            <div className="rounded-md border border-border/70 bg-background p-1 text-muted-foreground transition-colors group-hover:text-foreground">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <div
          className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", accentTextCls)}
        >
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                delta >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {delta >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
