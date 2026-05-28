import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  FileBarChart2,
  Settings,
  LogOut,
  Wallet,
  Sparkles,
  Store as StoreIcon,
  ChevronDown,
  Shield,
  Building2,
  CreditCard,
  Bell,
  Brain,
  Menu,
  X,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import {
  getCurrentStore,
  getPlanCapabilities,
  listStoreOperationalAlerts,
  planHasAlerts,
  type Store,
} from "@/lib/data";
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
  component: AppShell,
});

const STORE_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/consultor-ia", label: "Consultor IA", icon: Sparkles },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Visão geral", icon: Shield },
  { to: "/admin/lojas", label: "Lojas", icon: Building2 },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/admin/consultor-ia", label: "Consultor IA", icon: Brain },
  { to: "/admin/alertas", label: "Alertas", icon: Bell },
  { to: "/admin/configuracoes", label: "Config", icon: Settings },
] as const;

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DISMISSED_ALERTS_KEY = "caixa-local-dismissed-alerts";

function AppShell() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() =>
    readDismissedAlertIds(),
  );
  const isAdmin = session?.role === "owner";
  const inAdmin = pathname.startsWith("/admin");
  const { data: currentStore } = useQuery({
    queryKey: ["current-store", session?.profile.id, session?.profile.role],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session && session.role !== "owner"),
  });
  const isStoreAttendant = currentStore?.memberRole === "atendente";
  const { data: storeAlerts = [] } = useQuery({
    queryKey: ["store-operational-alerts", currentStore?.id],
    queryFn: () => listStoreOperationalAlerts(currentStore!.id),
    enabled: Boolean(currentStore?.id && planHasAlerts(currentStore.plan)),
  });
  const activeStoreAlerts = useMemo(
    () => storeAlerts.filter((alert) => !dismissedAlertIds.includes(alert.id)),
    [dismissedAlertIds, storeAlerts],
  );
  const navItems: NavItem[] = useMemo(() => {
    if (inAdmin && isAdmin) return [...ADMIN_NAV];
    const capabilities = currentStore ? getPlanCapabilities(currentStore.plan) : null;
    return STORE_NAV.filter(
      (item) =>
        (!isStoreAttendant || item.to === "/dashboard" || item.to === "/lancamentos") &&
        (item.to !== "/alertas" || Boolean(capabilities?.alerts)) &&
        (item.to !== "/consultor-ia" || Boolean(capabilities?.aiConsultant)),
    ).map((item) => (item.to === "/alertas" ? { ...item, badge: activeStoreAlerts.length } : item));
  }, [activeStoreAlerts.length, currentStore, inAdmin, isAdmin, isStoreAttendant]);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (loading || !session) return;
    if (session.role === "owner" && !inAdmin) navigate({ to: "/admin" });
    if (session.role === "lojista" && inAdmin) navigate({ to: "/dashboard" });
    if (
      session.role === "lojista" &&
      currentStore?.memberRole === "atendente" &&
      pathname !== "/dashboard" &&
      pathname !== "/lancamentos"
    ) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, session, inAdmin, currentStore?.memberRole, pathname, navigate]);

  useEffect(() => {
    if (pathname !== "/alertas" || !storeAlerts.length) return;
    const ids = storeAlerts.map((alert) => alert.id);
    writeDismissedAlertIds(ids);
    setDismissedAlertIds(ids);
  }, [pathname, storeAlerts]);

  if (loading || !session) return null;

  const shellName = inAdmin ? "Admin Caixa Local" : currentStore?.name || "Loja";
  const sidebarTheme = sidebarThemeStyle(session.profile.profileColor);

  return (
    <div className="min-h-screen flex bg-background text-foreground" style={sidebarTheme}>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <BrandBlock title={shellName} logoUrl={currentStore?.logoUrl} />
        <SidebarNav items={navItems} pathname={pathname} />
        <div className="mt-auto p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60">Logado como</div>
          <div className="text-sm font-medium truncate">{session.name}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{session.email}</div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <BrandBlock title={shellName} logoUrl={currentStore?.logoUrl} compact />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav
              items={navItems}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
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

          <StoreSwitcher inAdmin={inAdmin} store={isAdmin ? null : currentStore || null} />

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div
                    className="h-7 w-7 rounded-full grid place-items-center text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--sidebar)",
                      color: "var(--sidebar-foreground)",
                    }}
                  >
                    {profileInitial(session.profile.profileInitial, session.name)}
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
                <DropdownMenuItem
                  onClick={() =>
                    navigate({
                      to: session.role === "owner" ? "/admin/configuracoes" : "/configuracoes",
                    })
                  }
                >
                  <Settings className="h-4 w-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
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
          {navItems.slice(0, 6).map((item) => {
            const active =
              pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to + "/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center text-[10px] gap-0.5 px-2 py-1 rounded-md min-w-[56px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.badge ? (
                  <span className="absolute right-2 top-0 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
                    {item.badge}
                  </span>
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function BrandBlock({
  title,
  logoUrl,
  compact = false,
}: {
  title: string;
  logoUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4",
        compact ? "py-2" : "py-4 border-b border-sidebar-border",
      )}
    >
      <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt={`Logo ${title}`} className="h-full w-full object-contain" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
      </div>
      <div>
        <div className="text-sm font-semibold leading-tight truncate max-w-[168px]">{title}</div>
        <div className="text-[10px] text-sidebar-foreground/60 leading-tight">Caixa Local</div>
      </div>
    </div>
  );
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: readonly NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {items.map((item) => {
        const active =
          pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/"));
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
                : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-center text-[10px] leading-none text-destructive-foreground">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function StoreSwitcher({ inAdmin, store }: { inAdmin: boolean; store: Store | null }) {
  const status = store?.status || "pendente";
  const statusLabel = useMemo(() => {
    if (inAdmin) return { label: "Modo administrador", variant: "info" as const };
    return {
      ativa: { label: "Loja ativa", variant: "success" as const },
      pendente: { label: "Pendente", variant: "warning" as const },
      trial: { label: "Trial", variant: "info" as const },
      cancelada: { label: "Cancelada", variant: "danger" as const },
    }[status];
  }, [status, inAdmin]);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-8 w-8 rounded-md bg-muted grid place-items-center text-foreground">
        {!inAdmin && store?.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={`Logo ${store.name}`}
            className="h-full w-full rounded-md object-contain"
          />
        ) : inAdmin ? (
          <Shield className="h-4 w-4" />
        ) : (
          <StoreIcon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight truncate">
          {inAdmin ? "Admin" : store?.name || "Loja"}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusDot variant={statusLabel.variant} />
          <span className="text-[11px] text-muted-foreground leading-none">
            Caixa Local · {statusLabel.label}
          </span>
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

function profileInitial(savedInitial: string | null | undefined, name: string) {
  return (savedInitial || name.trim().slice(0, 1) || "C").slice(0, 1).toUpperCase();
}

function sidebarThemeStyle(color: string | null | undefined): CSSProperties {
  const sidebar = normalizeHexColor(color) || "#111827";
  const foreground = readableTextColor(sidebar);
  const accent = mixHex(sidebar, foreground === "#ffffff" ? "#ffffff" : "#000000", 0.12);
  const border = mixHex(sidebar, foreground === "#ffffff" ? "#ffffff" : "#000000", 0.18);

  return {
    "--sidebar": sidebar,
    "--sidebar-foreground": foreground,
    "--sidebar-primary": accent,
    "--sidebar-primary-foreground": foreground,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
    "--sidebar-ring": accent,
  } as CSSProperties;
}

function normalizeHexColor(color: string | null | undefined) {
  const value = color?.trim();
  if (!value) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return null;
}

function readableTextColor(background: string) {
  const { red, green, blue } = hexToRgb(background);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 180 ? "#111827" : "#ffffff";
}

function mixHex(base: string, overlay: string, amount: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(overlay);
  const mix = (left: number, right: number) => Math.round(left + (right - left) * amount);
  return rgbToHex(mix(a.red, b.red), mix(a.green, b.green), mix(a.blue, b.blue));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function readDismissedAlertIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_ALERTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeDismissedAlertIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(ids));
}

export { StatusDot };
