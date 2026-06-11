import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, FileCheck2, History, Link as LinkIcon, QrCode, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth";
import {
  formatBRLPrecise,
  getCurrentStore,
  getStoreSubscription,
  listBillingRecords,
  listSubscriptionPaymentProofs,
  uploadSubscriptionPaymentProof,
  type SubscriptionProofStatus,
  type SubscriptionStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/assinaturas")({
  head: () => ({ meta: [{ title: "Assinatura - Caixa Local" }] }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { session } = useSession();
  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });
  const { data: subscription } = useQuery({
    queryKey: ["store-subscription", store?.id],
    queryFn: () => getStoreSubscription(store!.id),
    enabled: Boolean(store?.id),
  });
  const { data: proofs = [] } = useQuery({
    queryKey: ["subscription-proofs", store?.id],
    queryFn: () => listSubscriptionPaymentProofs(store!.id),
    enabled: Boolean(store?.id),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["billing-history", store?.id],
    queryFn: () => listBillingRecords(store!.id),
    enabled: Boolean(store?.id),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      if (!store) throw new Error("Loja nao carregada.");
      return uploadSubscriptionPaymentProof({
        storeId: store.id,
        subscriptionId: subscription?.id || null,
        amount: subscription?.amount || 0,
        dueDate: subscription?.nextCharge || new Date().toISOString().slice(0, 10),
        file,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-proofs", store?.id] });
      toast.success("Comprovante enviado para analise.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao enviar comprovante."),
  });

  if (!store) {
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;
  }

  const status = normalizeSubscriptionStatus(subscription?.payStatus, store.status);
  const pixCode =
    subscription?.pixCopyPaste ||
    `CAIXA_LOCAL_PIX_MVP|loja=${store.id}|plano=${encodeURIComponent(
      subscription?.plan || store.plan,
    )}|valor=${subscription?.amount || 0}|vencimento=${subscription?.nextCharge || ""}`;
  const qrCodeUrl =
    subscription?.pixQrCodeUrl ||
    `https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(pixCode)}`;
  const paymentLink = subscription?.paymentLink || qrCodeUrl;
  const latestProof = proofs[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assinatura"
        description="Acompanhe pagamento, comprovante e liberacao do seu acesso."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Plano atual</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">{store.name}</div>
            </div>
            <StatusBadge status={status} />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <InfoTile label="Plano" value={subscription?.plan || store.plan} />
              <InfoTile
                label="Mensalidade"
                value={subscription ? formatBRLPrecise(subscription.amount) : "Pendente"}
              />
              <InfoTile
                label="Ultimo pagamento"
                value={subscription?.lastPayment ? formatDate(subscription.lastPayment) : "-"}
              />
              <InfoTile
                label="Proximo vencimento"
                value={subscription?.nextCharge ? formatDate(subscription.nextCharge) : "-"}
              />
            </div>

            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
              Pagamentos em atraso por mais de 48h podem resultar no bloqueio automatico do login. A
              reativacao so podera ser feita pelo administrador apos validacao do pagamento.
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <StepCard title="1. Pague via Pix" text="Use o QR Code ou o Pix copia e cola." />
              <StepCard title="2. Envie o comprovante" text="Imagem ou PDF ficam em analise." />
              <StepCard title="3. Aguarde validacao" text="O admin confirma e libera o acesso." />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <QrCode className="h-4 w-4" />
              Pagamento via Pix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
              <img
                src={qrCodeUrl}
                alt="QR Code Pix"
                className="h-40 w-40 rounded-md bg-white p-2"
              />
              <div className="max-w-full rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
                <div className="line-clamp-2 break-all">{pixCode}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                className="gap-2"
                onClick={() => copyToClipboard(pixCode, "Codigo Pix copiado.")}
              >
                <Copy className="h-4 w-4" />
                Copiar Pix
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => copyToClipboard(paymentLink, "Link de pagamento copiado.")}
              >
                <LinkIcon className="h-4 w-4" />
                Copiar link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Upload className="h-4 w-4" />
              Comprovante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <div className="rounded-md border border-dashed border-border p-4">
              <div className="text-sm font-medium">Envie imagem ou PDF</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Depois do envio, o comprovante fica em analise ate a validacao do administrador.
              </div>
              <Button
                className="mt-4 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? "Enviando..." : "Enviar comprovante"}
              </Button>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Status do comprovante</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{latestProof?.fileName || "Nenhum envio"}</div>
                <ProofBadge status={latestProof?.status || "pendente"} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <History className="h-4 w-4" />
              Historico de pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                    <th>Vencimento</th>
                    <th>Pagamento</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">{formatDate(item.dueDate)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {item.paidAt ? formatDate(item.paidAt) : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatBRLPrecise(item.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <ProofBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                  {!history.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhum pagamento confirmado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function StepCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{text}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const map = {
    ativa: "border-success/40 bg-success/10 text-success",
    em_dia: "border-success/40 bg-success/10 text-success",
    aguardando_pagamento: "border-warning/40 bg-warning/10 text-warning",
    em_atraso: "border-destructive/40 bg-destructive/10 text-destructive",
    bloqueada: "border-destructive/40 bg-destructive/10 text-destructive",
    trial: "border-info/40 bg-info/10 text-info",
    cancelada: "border-muted-foreground/40 bg-muted text-muted-foreground",
  }[status];
  const label = {
    ativa: "Ativa",
    em_dia: "Ativa",
    aguardando_pagamento: "Aguardando pagamento",
    em_atraso: "Em atraso",
    bloqueada: "Bloqueada",
    trial: "Trial",
    cancelada: "Cancelada",
  }[status];
  return (
    <Badge variant="outline" className={cn("h-6 px-2", map)}>
      {label}
    </Badge>
  );
}

function ProofBadge({ status }: { status: SubscriptionProofStatus }) {
  const map = {
    pago: { label: "Aprovado", cls: "border-success/40 bg-success/10 text-success" },
    em_analise: { label: "Em analise", cls: "border-warning/40 bg-warning/10 text-warning" },
    pendente: {
      label: "Pendente",
      cls: "border-muted-foreground/40 bg-muted text-muted-foreground",
    },
    atrasado: {
      label: "Em atraso",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    cancelado: {
      label: "Cancelado",
      cls: "border-muted-foreground/40 bg-muted text-muted-foreground",
    },
    recusado: {
      label: "Recusado",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
    },
  }[status];
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 text-[11px] font-normal", map.cls)}>
      {map.label}
    </Badge>
  );
}

function normalizeSubscriptionStatus(
  status: SubscriptionStatus | undefined,
  storeStatus: string,
): SubscriptionStatus {
  if (status) return status === "em_dia" ? "ativa" : status;
  if (storeStatus === "bloqueada") return "bloqueada";
  if (storeStatus === "pendente") return "aguardando_pagamento";
  if (storeStatus === "cancelada") return "cancelada";
  return "ativa";
}

function formatDate(value: string) {
  return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
}

async function copyToClipboard(value: string, message: string) {
  await navigator.clipboard.writeText(value);
  toast.success(message);
}
