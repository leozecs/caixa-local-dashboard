import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PlansCard } from "@/components/admin/plans-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultBillingMessageTemplate,
  getAppSetting,
  listSubscriptionPlans,
  saveAppSetting,
} from "@/lib/data";

export const Route = createFileRoute("/_app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Config admin - Caixa Local" }] }),
  component: AdminConfigPage,
});

function AdminConfigPage() {
  const queryClient = useQueryClient();
  const [billingMessage, setBillingMessage] = useState(defaultBillingMessageTemplate());
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => listSubscriptionPlans({ activeOnly: true }),
  });
  const { data: savedBillingMessage } = useQuery({
    queryKey: ["app-setting", "billing_whatsapp_message"],
    queryFn: () => getAppSetting("billing_whatsapp_message", defaultBillingMessageTemplate()),
  });
  const settingMutation = useMutation({
    mutationFn: () => saveAppSetting("billing_whatsapp_message", billingMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", "billing_whatsapp_message"] });
      toast.success("Texto de cobranca salvo.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar texto."),
  });

  useEffect(() => {
    if (savedBillingMessage) setBillingMessage(savedBillingMessage);
  }, [savedBillingMessage]);

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title="Config admin"
        description="Planos comerciais e texto padrao usado na cobranca por WhatsApp."
      />

      <PlansCard plans={plans} />

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Texto da cobranca automatizada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={billingMessage}
            onChange={(event) => setBillingMessage(event.target.value)}
            rows={5}
            placeholder={defaultBillingMessageTemplate()}
          />
          <div className="text-xs text-muted-foreground">
            Variaveis disponiveis: {"{{loja}}"}, {"{{responsavel}}"}, {"{{plano}}"}, {"{{valor}}"} e{" "}
            {"{{vencimento}}"}.
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => settingMutation.mutate()}
              disabled={settingMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {settingMutation.isPending ? "Salvando..." : "Salvar texto"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
