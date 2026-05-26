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
  defaultDailyClosingMessageTemplate,
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
  const [dailyMessage, setDailyMessage] = useState(defaultDailyClosingMessageTemplate());
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => listSubscriptionPlans({ activeOnly: true }),
  });
  const { data: savedBillingMessage } = useQuery({
    queryKey: ["app-setting", "billing_whatsapp_message"],
    queryFn: () => getAppSetting("billing_whatsapp_message", defaultBillingMessageTemplate()),
  });
  const { data: savedDailyMessage } = useQuery({
    queryKey: ["app-setting", "daily_closing_whatsapp_message"],
    queryFn: () =>
      getAppSetting("daily_closing_whatsapp_message", defaultDailyClosingMessageTemplate()),
  });
  const billingMutation = useMutation({
    mutationFn: () => saveAppSetting("billing_whatsapp_message", billingMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", "billing_whatsapp_message"] });
      toast.success("Texto de cobranca salvo.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar texto."),
  });
  const dailyMutation = useMutation({
    mutationFn: () => saveAppSetting("daily_closing_whatsapp_message", dailyMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["app-setting", "daily_closing_whatsapp_message"],
      });
      toast.success("Texto do fechamento diario salvo.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar texto."),
  });

  useEffect(() => {
    if (savedBillingMessage) setBillingMessage(savedBillingMessage);
  }, [savedBillingMessage]);

  useEffect(() => {
    if (savedDailyMessage) setDailyMessage(savedDailyMessage);
  }, [savedDailyMessage]);

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
              onClick={() => billingMutation.mutate()}
              disabled={billingMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {billingMutation.isPending ? "Salvando..." : "Salvar texto"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Texto do fechamento diario no WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={dailyMessage}
            onChange={(event) => setDailyMessage(event.target.value)}
            rows={5}
            placeholder={defaultDailyClosingMessageTemplate()}
          />
          <div className="text-xs text-muted-foreground">
            Variaveis disponiveis: {"{{loja}}"}, {"{{responsavel}}"}, {"{{entrada}}"}, {"{{saida}}"}
            , {"{{lucro}}"} e {"{{data}}"}.
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => dailyMutation.mutate()}
              disabled={dailyMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {dailyMutation.isPending ? "Salvando..." : "Salvar texto"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
