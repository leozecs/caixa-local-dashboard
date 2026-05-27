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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cacheProfile, useSession } from "@/lib/auth";
import {
  defaultBillingMessageTemplate,
  defaultDailyClosingMessageTemplate,
  getAppSetting,
  listSubscriptionPlans,
  saveAppSetting,
  updateProfileAppearance,
} from "@/lib/data";

export const Route = createFileRoute("/_app/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Config admin - Caixa Local" }] }),
  component: AdminConfigPage,
});

function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
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
  const profileMutation = useMutation({
    mutationFn: (payload: FormData) =>
      updateProfileAppearance({
        profileId: session!.profile.id,
        profileInitial: String(payload.get("profileInitial") || ""),
        profileColor: String(payload.get("profileColor") || "#111827"),
      }),
    onSuccess: (profile) => {
      cacheProfile(profile);
      toast.success("Perfil admin atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil."),
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
          <CardTitle className="text-sm font-semibold">Perfil admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-[120px_160px_auto] gap-4 items-end"
            onSubmit={(event) => {
              event.preventDefault();
              profileMutation.mutate(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-1.5">
              <Label>Letra</Label>
              <Input
                name="profileInitial"
                maxLength={1}
                defaultValue={session?.profile.profileInitial || session?.name.slice(0, 1) || "A"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor do fundo</Label>
              <Input
                name="profileColor"
                type="color"
                defaultValue={session?.profile.profileColor || "#111827"}
              />
            </div>
            <Button size="sm" className="gap-2" disabled={profileMutation.isPending}>
              <Save className="h-4 w-4" />
              {profileMutation.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
