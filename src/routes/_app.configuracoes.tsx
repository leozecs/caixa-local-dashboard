import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageUp, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlansCard } from "@/components/admin/plans-card";
import { cacheProfile, useSession } from "@/lib/auth";
import {
  createStoreAttendant,
  createStoreMember,
  createStoreCategory,
  deleteStoreAttendant,
  deleteStoreCategory,
  deleteStoreMember,
  getCurrentStore,
  getPlanCapabilities,
  listStoreAttendants,
  listStoreCategories,
  listStoreMembers,
  listSubscriptionPlans,
  updateStoreAttendant,
  updateStoreCategory,
  updateStoreMemberRole,
  updateProfileAppearance,
  updateStore,
  uploadStoreLogo,
  type StoreMemberRole,
} from "@/lib/data";
import type { EntryType, StoreCategory } from "@/lib/data";

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
  const canManageTeam = store?.memberRole === "owner" || isOwner;
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => listSubscriptionPlans(),
    enabled: Boolean(isOwner),
  });
  const { data: team } = useQuery({
    queryKey: ["store-members", store?.id],
    queryFn: () => listStoreMembers(store!.id),
    enabled: Boolean(store?.id && canManageTeam),
  });
  const { data: attendants = [] } = useQuery({
    queryKey: ["store-attendants", store?.id],
    queryFn: () => listStoreAttendants(store!.id),
    enabled: Boolean(store?.id && canManageTeam),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories", store?.id],
    queryFn: () => listStoreCategories(store!.id),
    enabled: Boolean(store?.id),
  });
  const createMemberMutation = useMutation({
    mutationFn: (payload: FormData) =>
      createStoreMember({
        storeId: store!.id,
        name: String(payload.get("name") || ""),
        email: String(payload.get("email") || ""),
        password: String(payload.get("password") || ""),
        role: String(payload.get("role") || "atendente") as StoreMemberRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-members", store?.id] });
      toast.success("Usuario cadastrado para esta loja.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar usuario."),
  });
  const updateMemberMutation = useMutation({
    mutationFn: (input: { memberId: string; role: StoreMemberRole }) =>
      updateStoreMemberRole({
        storeId: store!.id,
        memberId: input.memberId,
        role: input.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-members", store?.id] });
      toast.success("Permissao atualizada.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar permissao."),
  });
  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => deleteStoreMember({ storeId: store!.id, memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-members", store?.id] });
      toast.success("Atendente excluido.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao excluir atendente."),
  });
  const createAttendantMutation = useMutation({
    mutationFn: (payload: FormData) =>
      createStoreAttendant({
        storeId: store!.id,
        name: String(payload.get("name") || ""),
        commissionPercent: Number(payload.get("commissionPercent") || 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-attendants", store?.id] });
      toast.success("Atendente de venda cadastrado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar atendente."),
  });
  const updateAttendantMutation = useMutation({
    mutationFn: updateStoreAttendant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-attendants", store?.id] });
      toast.success("Atendente atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar atendente."),
  });
  const deleteAttendantMutation = useMutation({
    mutationFn: deleteStoreAttendant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-attendants", store?.id] });
      toast.success("Atendente removido.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover atendente."),
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
      toast.success("Perfil atualizado.");
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
  const logoMutation = useMutation({
    mutationFn: (payload: FormData) => {
      const file = payload.get("logo");
      if (!(file instanceof File) || file.size === 0) {
        throw new Error("Escolha uma imagem para enviar.");
      }
      return uploadStoreLogo({
        storeId: store!.id,
        currentLogoPath: store!.logoPath,
        file,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-store"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success("Logo da loja atualizada.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar logo."),
  });
  const categoryMutation = useMutation({
    mutationFn: (payload: FormData) =>
      createStoreCategory({
        storeId: store!.id,
        type: String(payload.get("type") || "receita") as EntryType,
        name: String(payload.get("name") || ""),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-categories", store?.id] });
      toast.success("Categoria adicionada.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar categoria."),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: deleteStoreCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-categories", store?.id] });
      toast.success("Categoria removida.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover categoria."),
  });
  const updateCategoryMutation = useMutation({
    mutationFn: updateStoreCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-categories", store?.id] });
      toast.success("Categoria atualizada.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar categoria."),
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

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] gap-3 items-end"
            onSubmit={(event) => {
              event.preventDefault();
              categoryMutation.mutate(new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <Field label="Tipo">
              <Select name="type" defaultValue="receita">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nova categoria">
              <Input name="name" placeholder="Ex: Comissoes, Manutencao, Marketplace" required />
            </Field>
            <Button type="submit" size="sm" className="gap-2" disabled={categoryMutation.isPending}>
              <Plus className="h-4 w-4" />
              {categoryMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CategoryList
              title="Receitas"
              items={categories.filter((category) => category.type === "receita")}
              onUpdate={(category) =>
                updateCategoryMutation.mutate({ ...category, storeId: store.id })
              }
              onDelete={(category) =>
                deleteCategoryMutation.mutate({ ...category, storeId: store.id })
              }
              pending={deleteCategoryMutation.isPending || updateCategoryMutation.isPending}
            />
            <CategoryList
              title="Despesas"
              items={categories.filter((category) => category.type === "despesa")}
              onUpdate={(category) =>
                updateCategoryMutation.mutate({ ...category, storeId: store.id })
              }
              onDelete={(category) =>
                deleteCategoryMutation.mutate({ ...category, storeId: store.id })
              }
              pending={deleteCategoryMutation.isPending || updateCategoryMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Logo da loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 md:flex-row md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              logoMutation.mutate(new FormData(event.currentTarget));
            }}
          >
            <div className="h-16 w-16 shrink-0 rounded-md border border-border bg-muted grid place-items-center overflow-hidden">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={`Logo ${store.name}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <Field label="Imagem da logo">
              <Input name="logo" type="file" accept="image/*" required />
            </Field>
            <Button type="submit" size="sm" className="gap-2" disabled={logoMutation.isPending}>
              <ImageUp className="h-4 w-4" />
              {logoMutation.isPending ? "Enviando..." : "Salvar logo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {canManageTeam && (
        <>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Atendentes de venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-3 items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  createAttendantMutation.mutate(new FormData(event.currentTarget));
                  event.currentTarget.reset();
                }}
              >
                <Field label="Nome do atendente">
                  <Input name="name" placeholder="Ex: Israel" required />
                </Field>
                <Field label="Comissao (%)">
                  <Input
                    name="commissionPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    defaultValue={store.defaultCommissionPercent || 1}
                    required
                  />
                </Field>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-2"
                  disabled={createAttendantMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {createAttendantMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </form>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                      <th>Atendente</th>
                      <th className="w-[150px]">Comissao</th>
                      <th className="w-[80px] text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendants.map((attendant) => (
                      <tr key={attendant.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5">
                          <Input
                            defaultValue={attendant.name}
                            className="h-8"
                            disabled={updateAttendantMutation.isPending}
                            onBlur={(event) => {
                              const name = event.currentTarget.value.trim();
                              if (name && name !== attendant.name) {
                                updateAttendantMutation.mutate({
                                  id: attendant.id,
                                  name,
                                  commissionPercent: attendant.commissionPercent,
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            defaultValue={attendant.commissionPercent}
                            className="h-8"
                            disabled={updateAttendantMutation.isPending}
                            onBlur={(event) => {
                              const commissionPercent = Number(event.currentTarget.value || 0);
                              if (commissionPercent !== attendant.commissionPercent) {
                                updateAttendantMutation.mutate({
                                  id: attendant.id,
                                  name: attendant.name,
                                  commissionPercent,
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={deleteAttendantMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Excluir o atendente "${attendant.name}"?`)) {
                                deleteAttendantMutation.mutate(attendant.id);
                              }
                            }}
                            aria-label="Excluir atendente de venda"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!attendants.length && (
                      <tr>
                        <td className="px-3 py-8 text-center text-muted-foreground" colSpan={3}>
                          Nenhum atendente cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Equipe da loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">
                    {team?.members.length || 0} de {team?.maxUsers || capabilities.maxUsers}{" "}
                    usuario(s)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    O owner gerencia a loja. O atendente acessa apenas dashboard semanal e
                    lancamentos.
                  </div>
                </div>
              </div>

              <form
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_130px_auto] gap-3 items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  createMemberMutation.mutate(new FormData(event.currentTarget));
                }}
              >
                <Field label="Nome">
                  <Input name="name" placeholder="Nome do usuario" required />
                </Field>
                <Field label="E-mail">
                  <Input name="email" type="email" placeholder="usuario@email.com" required />
                </Field>
                <Field label="Senha inicial">
                  <Input name="password" type="password" autoComplete="new-password" required />
                </Field>
                <Field label="Role">
                  <Select name="role" defaultValue="atendente">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atendente">Atendente</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-2"
                  disabled={
                    createMemberMutation.isPending ||
                    Boolean(team && team.members.length >= team.maxUsers)
                  }
                >
                  <UserPlus className="h-4 w-4" />
                  {createMemberMutation.isPending ? "Criando..." : "Cadastrar"}
                </Button>
              </form>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                      <th>Usuario</th>
                      <th>E-mail</th>
                      <th className="w-[170px]">Role</th>
                      <th className="w-[80px] text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(team?.members || []).map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 font-medium">{member.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{member.email}</td>
                        <td className="px-3 py-2.5">
                          <Select
                            value={member.role}
                            onValueChange={(role) =>
                              updateMemberMutation.mutate({
                                memberId: member.id,
                                role: role as StoreMemberRole,
                              })
                            }
                            disabled={updateMemberMutation.isPending}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="atendente">Atendente</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={member.role !== "atendente" || deleteMemberMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Excluir o atendente "${member.name}"?`)) {
                                deleteMemberMutation.mutate(member.id);
                              }
                            }}
                            aria-label="Excluir atendente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!team?.members.length && (
                      <tr>
                        <td className="px-3 py-8 text-center text-muted-foreground" colSpan={4}>
                          Nenhum usuario carregado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {isOwner && <PlansCard plans={plans} />}

      {!canManageTeam && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Equipe da loja</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Apenas o owner da loja pode cadastrar usuarios e alterar permissoes.
          </CardContent>
        </Card>
      )}

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

function CategoryList({
  title,
  items,
  onUpdate,
  onDelete,
  pending,
}: {
  title: string;
  items: StoreCategory[];
  onUpdate: (category: { id: string; type: EntryType; name: string; currentName: string }) => void;
  onDelete: (category: { id: string; type: EntryType; name: string }) => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <Input
              defaultValue={item.name}
              className="h-8"
              disabled={pending}
              aria-label={`Editar categoria ${item.name}`}
              onBlur={(event) => {
                const name = event.currentTarget.value.trim();
                if (name && name !== item.name) {
                  onUpdate({ id: item.id, type: item.type, name, currentName: item.name });
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Excluir a categoria "${item.name}"?`)) {
                  onDelete({ id: item.id, type: item.type, name: item.name });
                }
              }}
              aria-label={`Excluir categoria ${item.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {!items.length && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma categoria cadastrada.
          </div>
        )}
      </div>
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
