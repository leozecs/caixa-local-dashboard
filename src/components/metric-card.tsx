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
  const accentCls = {
    default: "text-foreground",
    success: "text-success",
    expense: "text-destructive",
    info: "text-info",
    warning: "text-warning",
  }[accent];

  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", accentCls)}>
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                delta >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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
