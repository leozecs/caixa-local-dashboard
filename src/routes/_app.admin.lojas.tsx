import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ADMIN_STORES, formatBRL } from "@/lib/mock-data";
import { RiskBadge } from "./_app.admin.index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/lojas")({
  head: () => ({ meta: [{ title: "Lojas — Admin Caixa Local" }] }),
  component: AdminLojas,
});

function AdminLojas() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const filtered = useMemo(() => {
    return ADMIN_STORES
      .filter((s) => (status === "todos" ? true : s.status === status))
      .filter((s) =>
        q ? s.name.toLowerCase().includes(q.toLowerCase()) || s.owner.toLowerCase().includes(q.toLowerCase()) : true
      );
  }, [q, status]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lojas"
        description={`${ADMIN_STORES.length} estabelecimentos no Caixa Local.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-8 pl-8 w-[220px]" placeholder="Buscar loja ou dono..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
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
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.segment} · {s.city}</div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.owner}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-2.5">{s.plan}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {formatDistanceToNow(parseISO(s.lastAccess), { addSuffix: true, locale: ptBR })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatBRL(s.monthRevenue)}</td>
                    <td className="px-4 py-2.5"><RiskBadge risk={s.risk} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link to="/dashboard">
                          <Eye className="h-3.5 w-3.5" /> Ver loja
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma loja encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: "ativa" | "pendente" | "trial" }) {
  const map = {
    ativa: { label: "Ativa", cls: "border-success/40 text-success bg-success/5" },
    pendente: { label: "Pendente", cls: "border-warning/40 text-warning bg-warning/5" },
    trial: { label: "Trial", cls: "border-info/40 text-info bg-info/5" },
  }[status];
  return <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.cls)}>{map.label}</Badge>;
}
