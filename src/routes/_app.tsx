import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  FileBarChart2,
  Settings,
  LogOut,
  Wallet,
  Store as StoreIcon,
  ChevronDown,
  Shield,
  Building2,
  CreditCard,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useSession, signOut, getSession } from "@/lib/auth";
import { CURRENT_STORE } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getSession()) {
      throw Object.assign(new Error("Unauthorized"), {
        // TanStack Router redirect equivalent: use thrown redirect
      });
    }
  },
  component: AppShell,
});

const STORE_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Visão geral", icon: Shield },
  { to: "/admin/lojas", label: "Lojas", icon: Building2 },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/admin/alertas", label: "Alertas", icon: Bell },
] as const;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function AppShell() {
  const navigate = useNavigate();
  const session = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (!session) navigate({ to: "/login" });
  }, [session, navigate]);

  if (!session) return null;

  const isAdmin = session.role === "admin";
  const inAdmin = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <BrandBlock />
        <SidebarNav
          items={inAdmin && isAdmin ? ADMIN_NAV : STORE_NAV}
          pathname={pathname}
        />
        {isAdmin && (
          <div className="px-3 pb-3">
            <Link
              to={inAdmin ? "/dashboard" : "/admin"}
              className="flex items-center justify-center gap-2 text-xs rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              {inAdmin ? <StoreIcon className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
              {inAdmin ? "Voltar para a loja" : "Acessar painel admin"}
            </Link>
          </div>
        )}
        <div className="mt-auto p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60">Logado como</div>
          <div className="text-sm font-medium truncate">{session.name}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{session.email}</div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <BrandBlock compact />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav
              items={inAdmin && isAdmin ? ADMIN_NAV : STORE_NAV}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            {isAdmin && (
              <div className="px-3 pb-3">
                <Link
                  to={inAdmin ? "/dashboard" : "/admin"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 text-xs rounded-md border border-sidebar-border px-3 py-2"
                >
                  {inAdmin ? "Voltar para a loja" : "Acessar painel admin"}
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <StoreSwitcher inAdmin={inAdmin} />

          <div className="ml-auto flex items-center gap-2">
            <MonthSelector month={month} setMonth={setMonth} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-medium">
                    {session.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <span className="hidden sm:inline text-sm">{session.name.split(" ")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{session.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{session.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes" })}>
                  <Settings className="h-4 w-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                    navigate({ to: "/login" });
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 min-w-0">
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex items-center justify-around h-16 z-30">
          {(inAdmin && isAdmin ? ADMIN_NAV.slice(0, 4) : STORE_NAV.slice(0, 5)).map((item) => {
            const active = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to + "/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center text-[10px] gap-0.5 px-2 py-1 rounded-md min-w-[56px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  function MonthSelector({ month, setMonth }: { month: number; setMonth: (m: number) => void }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <span className="text-sm">{MONTHS[month]} {new Date().getFullYear()}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          {MONTHS.map((m, i) => (
            <DropdownMenuItem key={m} onClick={() => setMonth(i)}>
              {m} {new Date().getFullYear()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 px-4", compact ? "py-2" : "py-4 border-b border-sidebar-border")}>
      <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
        <Wallet className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold leading-tight">Caixa Local</div>
        <div className="text-[10px] text-sidebar-foreground/60 leading-tight">Vinhedo/SP</div>
      </div>
    </div>
  );
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: readonly { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {items.map((item) => {
        const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StoreSwitcher({ inAdmin }: { inAdmin: boolean }) {
  const status = CURRENT_STORE.status;
  const statusLabel = useMemo(() => {
    if (inAdmin) return { label: "Modo administrador", variant: "info" as const };
    return {
      ativa: { label: "Loja ativa", variant: "success" as const },
      pendente: { label: "Pendente", variant: "warning" as const },
      trial: { label: "Trial", variant: "info" as const },
    }[status];
  }, [status, inAdmin]);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-8 w-8 rounded-md bg-muted grid place-items-center text-foreground">
        {inAdmin ? <Shield className="h-4 w-4" /> : <StoreIcon className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight truncate">
          {inAdmin ? "Caixa Local · Admin" : CURRENT_STORE.name}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusDot variant={statusLabel.variant} />
          <span className="text-[11px] text-muted-foreground leading-none">{statusLabel.label}</span>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ variant }: { variant: "success" | "warning" | "info" | "danger" }) {
  const cls = {
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
    danger: "bg-destructive",
  }[variant];
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", cls)} />;
}

export { StatusDot };
