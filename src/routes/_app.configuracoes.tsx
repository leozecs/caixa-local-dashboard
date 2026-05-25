import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CURRENT_STORE } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Caixa Local" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Configurações"
        description="Dados da loja, equipe e preferências de notificação."
      />

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-sm font-semibold">Dados da loja</CardTitle></CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => { e.preventDefault(); toast.success("Dados da loja atualizados."); }}
          >
            <div className="space-y-1.5">
              <Label>Nome do estabelecimento</Label>
              <Input defaultValue={CURRENT_STORE.name} />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input defaultValue={CURRENT_STORE.owner} />
            </div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Input defaultValue={CURRENT_STORE.segment} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input defaultValue={CURRENT_STORE.city} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>CNPJ</Label>
              <Input defaultValue="32.110.998/0001-44" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-sm font-semibold">Notificações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow label="Alerta diário de fechamento" hint="Resumo do caixa às 19h por WhatsApp." defaultChecked />
          <Separator />
          <ToggleRow label="Aviso de meta atrasada" hint="Notifica quando a meta do mês não está no ritmo." defaultChecked />
          <Separator />
          <ToggleRow label="Aviso de despesa alta" hint="Alerta quando despesas superam 85% do limite." />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-sm font-semibold">Plano</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Caixa Local Pro</div>
              <div className="text-xs text-muted-foreground">R$ 79/mês · próxima cobrança em 12/06</div>
            </div>
            <Button variant="outline" size="sm">Gerenciar plano</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, hint, defaultChecked }: { label: string; hint: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
