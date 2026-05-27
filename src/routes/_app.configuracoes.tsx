import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PlansCard } from "@/components/admin/plans-card";
import { cacheProfile, useSession } from "@/lib/auth";
import {
  getCurrentStore,
  getPlanCapabilities,
  listSubscriptionPlans,
  updateProfileAppearance,
  updateStore,
} from "@/lib/data";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configuracoes - Caixa Local" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });
  const isOwner = session?.role === "owner";
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => listSubscriptionPlans(),
    enabled: Boolean(isOwner),
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
      toast.success(
        "Perfil atualizado. Entre novamente ou recarregue a pagina para refletir no topo.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil."),
  });
  const dailyClosingMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateStore(store!.id, { dailyClosingWhatsappEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-store"] });
      queryClient.invalidateQueries({ queryKey: ["daily-store-results"] });
      toast.success("Preferencia de WhatsApp atualizada.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar preferencia."),
  });

  const mutation = useMutation({
    mutationFn: (payload: FormData) =>
      updateStore(store!.id, {
        name: String(payload.get("name") || ""),
        owner: String(payload.get("owner") || ""),
        segment: String(payload.get("segment") || ""),
        city: String(payload.get("city") || ""),
        cnpj: String(payload.get("cnpj") || "") || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-store"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success("Dados da loja atualizados.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar loja."),
  });

  if (!store)
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;

  const capabilities = getPlanCapabilities(store.plan);

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Configuracoes"
        description="Dados da loja, equipe e preferencias de notificacao."
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Dados da loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(new FormData(event.currentTarget));
            }}
          >
            <Field label="Nome do estabelecimento">
              <Input name="name" defaultValue={store.name} />
            </Field>
            <Field label="Responsavel">
              <Input name="owner" defaultValue={store.owner} />
            </Field>
            <Field label="Segmento">
              <Input name="segment" defaultValue={store.segment} />
            </Field>
            <Field label="Cidade">
              <Input name="city" defaultValue={store.city} />
            </Field>
            <div className="space-y-1.5 md:col-span-2">
              <Label>CNPJ</Label>
              <Input name="cnpj" defaultValue={store.cnpj || ""} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" className="gap-2" disabled={mutation.isPending}>
                <Save className="h-4 w-4" /> {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isOwner && <PlansCard plans={plans} />}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-[120px_160px_auto] gap-4 items-end"
            onSubmit={(event) => {
              event.preventDefault();
              profileMutation.mutate(new FormData(event.currentTarget));
            }}
          >
            <Field label="Letra">
              <Input
                name="profileInitial"
                maxLength={1}
                defaultValue={session?.profile.profileInitial || store.owner.slice(0, 1)}
              />
            </Field>
            <Field label="Cor do fundo">
              <Input
                name="profileColor"
                type="color"
                defaultValue={session?.profile.profileColor || "#111827"}
              />
            </Field>
            <Button type="submit" size="sm" className="gap-2" disabled={profileMutation.isPending}>
              <Save className="h-4 w-4" />
              {profileMutation.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Notificacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Alerta diario de fechamento"
            hint={
              capabilities.dailyWhatsappSummary
                ? "Resumo do caixa por WhatsApp."
                : "Disponivel a partir do plano Essencial."
            }
            checked={Boolean(store.dailyClosingWhatsappEnabled)}
            onCheckedChange={(checked) => dailyClosingMutation.mutate(checked)}
            disabled={!capabilities.dailyWhatsappSummary}
          />
          <Separator />
          <ToggleRow
            label="Aviso de meta atrasada"
            hint={
              capabilities.alerts
                ? "Notifica quando a meta do mes nao esta no ritmo."
                : "Disponivel a partir do plano Essencial."
            }
            defaultChecked={capabilities.alerts}
            disabled={!capabilities.alerts}
          />
          <Separator />
          <ToggleRow
            label="Aviso de despesa alta"
            hint={
              capabilities.alerts
                ? "Alerta quando despesas superam 85% do limite."
                : "Disponivel a partir do plano Essencial."
            }
            disabled={!capabilities.alerts}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Caixa Local {store.plan}</div>
              <div className="text-xs text-muted-foreground">
                {capabilities.maxUsers} usuario(s) por loja. Status atual: {store.status}
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Gerenciado pelo admin
            </Button>
          </div>
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

function ToggleRow({
  label,
  hint,
  defaultChecked,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
