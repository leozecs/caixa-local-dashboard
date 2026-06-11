import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  CreditCard,
  DollarSign,
  Eye,
  MessageCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  defaultBillingMessageTemplate,
  formatBRL,
  approveSubscriptionPaymentProof,
  getAppSetting,
  listSubscriptions,
  listSubscriptionPaymentProofs,
  openSubscriptionPaymentProof,
  rejectSubscriptionPaymentProof,
  renderBillingMessage,
  type SubscriptionPaymentProof,
  type SubscriptionStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/assinaturas")({
  head: () => ({ meta: [{ title: "Assinaturas — Admin" }] }),
  component: Assinaturas,
});

function Assinaturas() {
  const queryClient = useQueryClient();
  const { data: subs = [] } = useQuery({ queryKey: ["subscriptions"], queryFn: listSubscriptions });
  const { data: proofs = [] } = useQuery({
    queryKey: ["subscription-proofs-admin"],
    queryFn: () => listSubscriptionPaymentProofs(),
  });
  const { data: billingTemplate = defaultBillingMessageTemplate() } = useQuery({
    queryKey: ["app-setting", "billing_whatsapp_message"],
    queryFn: () => getAppSetting("billing_whatsapp_message", defaultBillingMessageTemplate()),
  });
  const approveMutation = useMutation({
    mutationFn: approveSubscriptionPaymentProof,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-proofs-admin"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success("Pagamento aprovado e acesso reativado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao aprovar comprovante."),
  });
  const rejectMutation = useMutation({
    mutationFn: (proofId: string) => rejectSubscriptionPaymentProof({ proofId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-proofs-admin"] });
      toast.success("Comprovante recusado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao recusar comprovante."),
  });

  const mrr = subs
    .filter((sub) => sub.payStatus === "ativa" || sub.payStatus === "em_dia")
    .reduce((sum, sub) => sum + sub.amount, 0);
  const atrasadas = subs.filter((sub) => sub.payStatus === "em_atraso").length;
  const bloqueadas = subs.filter((sub) => sub.payStatus === "bloqueada").length;
  const pendingProofs = proofs.filter((proof) => proof.status === "em_analise");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assinaturas"
        description="Cobranças por WhatsApp, vencimentos e MRR da base."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="MRR" value={formatBRL(mrr)} icon={DollarSign} accent="success" />
        <MetricCard
          label="Assinaturas ativas"
          value={String(
            subs.filter((sub) => sub.payStatus === "ativa" || sub.payStatus === "em_dia").length,
          )}
          icon={CreditCard}
        />
        <MetricCard
          label="Em atraso"
          value={String(atrasadas)}
          icon={RefreshCcw}
          accent="warning"
        />
        <MetricCard label="Bloqueadas" value={String(bloqueadas)} icon={XCircle} accent="expense" />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Comprovantes em analise</div>
              <div className="text-xs text-muted-foreground">
                {pendingProofs.length} envio(s) aguardando validacao manual.
              </div>
            </div>
          </div>
          <ProofsTable
            proofs={pendingProofs}
            storeNames={new Map(subs.map((sub) => [sub.storeId, sub.storeName]))}
            approving={approveMutation.isPending}
            rejecting={rejectMutation.isPending}
            onOpen={openSubscriptionPaymentProof}
            onApprove={(proof) => approveMutation.mutate(proof)}
            onReject={(proof) => rejectMutation.mutate(proof.id)}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border bg-muted/40">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th>Loja</th>
                  <th>Plano</th>
                  <th className="text-right">Valor</th>
                  <th>Último pagamento</th>
                  <th>Próximo pagamento</th>
                  <th>Status</th>
                  <th className="text-right">Cobrança</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5 font-medium">{sub.storeName}</td>
                    <td className="px-4 py-2.5">{sub.plan}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {sub.amount > 0 ? formatBRL(sub.amount) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {sub.lastPayment ? format(parseISO(sub.lastPayment), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {format(parseISO(sub.nextCharge), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-2.5">
                      <PayBadge status={sub.payStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            renderBillingMessage(billingTemplate, {
                              loja: sub.storeName,
                              plano: sub.plan,
                              valor: formatBRL(sub.amount),
                              vencimento: format(parseISO(sub.nextCharge), "dd/MM/yyyy"),
                            }),
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Cobrar
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!subs.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma assinatura cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProofsTable({
  proofs,
  storeNames,
  approving,
  rejecting,
  onOpen,
  onApprove,
  onReject,
}: {
  proofs: SubscriptionPaymentProof[];
  storeNames: Map<string, string>;
  approving: boolean;
  rejecting: boolean;
  onOpen: (proof: SubscriptionPaymentProof) => void;
  onApprove: (proof: SubscriptionPaymentProof) => void;
  onReject: (proof: SubscriptionPaymentProof) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
            <th>Loja</th>
            <th>Arquivo</th>
            <th>Vencimento</th>
            <th className="text-right">Valor</th>
            <th className="text-right">Acao</th>
          </tr>
        </thead>
        <tbody>
          {proofs.map((proof) => (
            <tr key={proof.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 font-medium">{storeNames.get(proof.storeId) || "Loja"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{proof.fileName}</td>
              <td className="px-4 py-2.5">{format(parseISO(proof.dueDate), "dd/MM/yyyy")}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(proof.amount)}</td>
              <td className="px-4 py-2.5">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="icon" onClick={() => onOpen(proof)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-success"
                    disabled={approving}
                    onClick={() => onApprove(proof)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={rejecting}
                    onClick={() => onReject(proof)}
                  >
                    Recusar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!proofs.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum comprovante em analise.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PayBadge({ status }: { status: SubscriptionStatus }) {
  const map = {
    ativa: { label: "Ativa", cls: "border-success/40 text-success bg-success/5" },
    em_dia: { label: "Ativa", cls: "border-success/40 text-success bg-success/5" },
    aguardando_pagamento: {
      label: "Aguardando",
      cls: "border-warning/40 text-warning bg-warning/5",
    },
    em_atraso: {
      label: "Em atraso",
      cls: "border-destructive/40 text-destructive bg-destructive/5",
    },
    bloqueada: {
      label: "Bloqueada",
      cls: "border-destructive/40 text-destructive bg-destructive/5",
    },
    trial: { label: "Trial", cls: "border-info/40 text-info bg-info/5" },
    cancelada: {
      label: "Cancelada",
      cls: "border-muted-foreground/40 text-muted-foreground bg-muted",
    },
  }[status];
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 font-normal text-[11px]", map.cls)}>
      {map.label}
    </Badge>
  );
}
